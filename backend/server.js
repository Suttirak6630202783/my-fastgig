import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sql from "mssql";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- Database (MSSQL + Adapter) ----------------
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST, // เช่น 'localhost' หรือ '192.168.1.10' หรือ 'localhost\\SQLEXPRESS'
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined, // ใส่ถ้ามี
  options: {
    encrypt: false, // ปรับเป็น true ถ้าต้องการ
    trustServerCertificate: true, // สะดวกตอน dev/localhost
  },
};

const mssqlPoolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log("✅ Connected to SQL Server");
    return pool;
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed!", err);
    process.exit(1);
  });

/**
 * Adapter: ให้ยังใช้รูปแบบ `pool.query(sql, params)` ได้เหมือน mysql2/promise
 * ทำสิ่งเหล่านี้อัตโนมัติ:
 *  - แทน NOW() -> GETDATE()
 *  - แทน IFNULL( -> ISNULL(
 *  - แปลง LIMIT n (ท้ายคำสั่ง) -> SELECT TOP n
 *  - แปลง ? เป็น @p1,@p2,... แล้ว bind ค่า
 * คืนค่าเป็น [recordset] เพื่อให้โค้ดเดิมใช้งานต่อได้
 */
const pool = {
  query: async (text, params = []) => {
    const conn = await mssqlPoolPromise;

    let sqlText = String(text)
      .replace(/\bNOW\(\)/gi, "GETDATE()")
      .replace(/\bIFNULL\s*\(/gi, "ISNULL(");

    // แปลง LIMIT n → TOP n (เฉพาะแบบ ... LIMIT n อยู่ท้ายสคริปต์)
    const limitMatch = sqlText.match(/\sLIMIT\s+(\d+)\s*;?\s*$/i);
    if (limitMatch) {
      const n = limitMatch[1];
      sqlText = sqlText.replace(/\sLIMIT\s+\d+\s*;?\s*$/i, ""); // ตัด LIMIT ออก
      sqlText = sqlText.replace(/^\s*SELECT\s/i, `SELECT TOP ${n} `); // เติม TOP n
    }

    // แปลง placeholder ? → @p1,@p2,...
    let idx = 0;
    const names = [];
    sqlText = sqlText.replace(/\?/g, () => {
      idx += 1;
      const nm = `p${idx}`;
      names.push(nm);
      return `@${nm}`;
    });

    const request = conn.request();
    params.forEach((val, i) => {
      let type = sql.NVarChar;
      if (val === null || val === undefined) {
        type = sql.NVarChar;
      } else if (typeof val === "number") {
        type = Number.isInteger(val) ? sql.Int : sql.Float;
      } else if (typeof val === "boolean") {
        type = sql.Bit;
      } else {
        type = sql.NVarChar;
      }
      request.input(names[i], type, val);
    });

    const result = await request.query(sqlText);
    return [result.recordset];
  },
};

const SECRET = process.env.JWT_SECRET || "my_secret_key";

// ---------------- Middleware ----------------
function auth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ---------------- File Upload ----------------
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------- Register ----------------
// ---------------- Register ----------------
app.post("/api/register", async (req, res) => {
  try {
    let { full_name, email, password, confirmPassword, phone, age, skills } =
      req.body;
    if (!full_name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "กรอกข้อมูลไม่ครบ" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "รหัสผ่านไม่ตรงกัน" });
    }

    // ทำความสะอาดสกิล แล้วเก็บเป็นสตริงคอมมาคั่น
    const skillsClean = String(skills ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");

    const [exist] = await pool.query(
      "SELECT user_id FROM users WHERE email=?",
      [email]
    );
    if (exist.length)
      return res.status(409).json({ error: "Email ถูกใช้งานแล้ว" });

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO dbo.Users
    (full_name, email, password_hash, phone, age, skills, profile_image, trust_points, created_at)
    VALUES
     (?, ?, ?, ?, ?, ?, NULL, 0, GETDATE())`,
      [
        full_name,
        email.trim().toLowerCase(),
        hash,
        phone || "",
        Number(age) || null,
        skillsClean,
      ]
    );

    res.json({ message: "Register success ✅" });
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

// ---------------- Login ----------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email/Password required" });

    const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [
      email,
    ]);
    if (!rows.length) return res.status(401).json({ error: "User not found" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user.user_id, email: user.email }, SECRET, {
      expiresIn: "6h",
    });
    res.json({ message: "Login success", token, user_id: user.user_id });
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

// ---------------- Profile ----------------
// ---------------- Profile ----------------
app.get("/api/me", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          u.user_id,
          u.full_name,
          u.email,
          u.phone,
          u.age,
          u.skills,
          u.profile_image,
          u.created_at,
          ISNULL(u.trust_points,0) AS trust_points,
          ISNULL(u.completed_jobs,0) AS completed_jobs,
          LTRIM(RTRIM(dbo.fn_GetTrustLevel(ISNULL(u.trust_points, 0)))) AS trust_level
       FROM dbo.users AS u
       WHERE u.user_id=?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

app.put("/api/me", auth, async (req, res) => {
  try {
    const { full_name, age, skills, phone } = req.body;
    await pool.query(
      `UPDATE users SET full_name=?, age=?, skills=?, phone=? WHERE user_id=?`,
      [full_name || "", age || null, skills || "", phone || "", req.user.id]
    );
    res.json({ message: "Profile updated ✅" });
  } catch (e) {
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

app.post(
  "/api/upload-profile",
  auth,
  upload.single("profile"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const filePath = `/uploads/${req.file.filename}`;
      await pool.query("UPDATE users SET profile_image=? WHERE user_id=?", [
        filePath,
        req.user.id,
      ]);
      res.json({ message: "อัปโหลดรูปโปรไฟล์สำเร็จ", profile_image: filePath });
    } catch (e) {
      res.status(500).json({ error: "Upload error", detail: e.message });
    }
  }
);

// ---------------- Jobs ----------------
app.get("/api/jobs", async (req, res) => {
  try {
    //  ดึงงานทั้งหมดจากฐานข้อมูล พร้อมคำนวณค่าเฉลี่ยจาก fn_AvgPay
    const [rows] = await pool.query(
      `
      SELECT 
        j.job_id,
        j.title,
        j.description,
        j.job_type,
        j.pay_min,
        j.pay_max,
        j.status_code,
        j.location_text,
        j.age_min,
        j.age_max,
        j.created_at,
        u.full_name,
        u.profile_image,
        --  เรียกฟังก์ชันคำนวณค่าเฉลี่ยจาก DB
        CAST(dbo.fn_AvgPay(j.job_id) AS DECIMAL(10,2)) AS avg_pay
      FROM dbo.jobs AS j
      JOIN dbo.users AS u ON j.user_id = u.user_id
      ORDER BY j.created_at DESC
      LIMIT 50
      `
    );

    res.json(rows);
  } catch (e) {
    console.error("GET /api/jobs error:", e);
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

app.post("/api/jobs", auth, async (req, res) => {
  try {
    const {
      title,
      description,
      job_type,
      pay_min, // อาจเป็น "500" หรือ "" ก็ได้
      pay_max, // ว่างให้ default = pay_min
      location_text,
      age_min,
      age_max,
    } = req.body;

    if (!title || !description || String(pay_min ?? "").trim() === "") {
      return res.status(400).json({ error: "Missing fields" });
    }

    await pool.query(
      `
      INSERT INTO dbo.Jobs
        (user_id, title, description, job_type,
         pay_min, pay_max, location_text,
         age_min, age_max, status_code, created_at)
      VALUES
        (
          ?, ?, ?, ?,
          TRY_CONVERT(INT, NULLIF(?, '')),
          ISNULL(
            TRY_CONVERT(INT, NULLIF(?, '')),
            TRY_CONVERT(INT, NULLIF(?, ''))  -- ถ้า pay_max ว่าง ใช้ pay_min
          ),
          LTRIM(RTRIM(ISNULL(?, ''))),
          TRY_CONVERT(INT, NULLIF(?, '')),
          TRY_CONVERT(INT, NULLIF(?, '')),
          'OPEN',
          GETDATE()
        )
      `,
      [
        req.user.id,
        title,
        description,
        job_type || "",
        String(pay_min),
        pay_max != null ? String(pay_max) : "",
        String(pay_min),
        location_text || "",
        age_min != null ? String(age_min) : "",
        age_max != null ? String(age_max) : "",
      ]
    );

    res.json({ message: "Job created ✅" });
  } catch (e) {
    console.error("Create Job Error:", e);
    const detail = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: "Server error", detail });
  }
});

app.get("/api/my-jobs", auth, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM jobs WHERE user_id=?", [
    req.user.id,
  ]);
  res.json(rows);
});

// ---------------- Applications ----------------
// ---------------- Applications ----------------
app.post("/api/applications", auth, async (req, res) => {
  try {
    const { job_id } = req.body; // ❌ ตัด note ออก
    if (!job_id) return res.status(400).json({ error: "job_id is required" });

    // ห้ามสมัครงานตัวเอง
    const [jobRows] = await pool.query(
      "SELECT user_id FROM dbo.Jobs WHERE job_id=?",
      [job_id]
    );
    if (!jobRows.length)
      return res.status(404).json({ error: "Job not found" });
    if (Number(jobRows[0].user_id) === Number(req.user.id)) {
      return res.status(400).json({ error: "ห้ามสมัครงานของตัวเอง" });
    }

    // กันสมัครซ้ำ
    const [exist] = await pool.query(
      "SELECT 1 FROM dbo.Applications WHERE job_id=? AND user_id=?",
      [job_id, req.user.id]
    );
    if (exist.length)
      return res.status(400).json({ error: "คุณสมัครงานนี้แล้ว" });

    //  Insert แบบไม่มีคอลัมน์ note
    await pool.query(
      `INSERT INTO dbo.Applications (job_id, user_id, status_code, applied_at)
       VALUES (?, ?, 'PENDING', GETDATE())`,
      [job_id, req.user.id]
    );

    res.json({ message: "สมัครงานสำเร็จ ✅" });
  } catch (e) {
    console.error("POST /api/applications error:", e);
    res
      .status(500)
      .json({ error: "Server error", detail: String(e?.message || e) });
  }
});

app.get("/api/my-applications", auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, j.title, j.description, j.pay_min, j.pay_max
     FROM applications a JOIN jobs j ON a.job_id=j.job_id
     WHERE a.user_id=?`, //  ควรจะกรองด้วย user_id
    [req.user.id]
  );
  res.json(rows);
});

//  รายชื่อผู้สมัครของงาน (ACCEPTED > PENDING > REJECTED)
app.get("/api/jobs/:id/applicants", auth, async (req, res) => {
  try {
    const jobId = Number(req.params.id);

    const [rows] = await pool.query(
      `
      SELECT 
        a.application_id,
        a.job_id,
        a.user_id,
        a.status_code,
        a.applied_at,
        u.full_name,
        u.skills,
        u.trust_points,
        u.profile_image,
        ISNULL(u.completed_jobs, 0) AS completed_jobs,
        LTRIM(RTRIM(dbo.fn_GetTrustLevel(ISNULL(u.trust_points, 0)))) AS trust_level
      FROM dbo.applications AS a
      JOIN dbo.users AS u ON u.user_id = a.user_id
      WHERE a.job_id = ?
      ORDER BY
        CASE a.status_code
          WHEN 'ACCEPTED' THEN 0
          WHEN 'PENDING'  THEN 1
          ELSE 2
        END,
        a.applied_at ASC
      `,
      [jobId]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/jobs/:id/applicants error:", err);
    res.status(500).json({ error: "failed_to_fetch_applicants" });
  }
});

// ---------------- Applicants Actions ----------------
// helper: ตรวจว่าเป็นเจ้าของงานจาก application id
async function assertJobOwnerFromApplicationOr403(req, res, applicationId) {
  const [rows] = await pool.query(
    "SELECT job_id, user_id FROM applications WHERE application_id=?",
    [applicationId]
  );
  if (!rows.length) {
    res.status(404).json({ error: "Application not found" });
    return null;
  }
  const appData = rows[0];
  const [jobOwner] = await pool.query(
    "SELECT user_id FROM jobs WHERE job_id=?",
    [appData.job_id]
  );
  if (!jobOwner.length) {
    res.status(404).json({ error: "Job not found" });
    return null;
  }
  if (Number(jobOwner[0].user_id) !== Number(req.user.id)) {
    res.status(403).json({ error: "คุณไม่มีสิทธิ์ในงานนี้" });
    return null;
  }
  return appData;
}

// Accept
app.post("/api/applications/:id/accept", auth, async (req, res) => {
  const applicationId = req.params.id;
  const appData = await assertJobOwnerFromApplicationOr403(
    req,
    res,
    applicationId
  );
  if (!appData) return;

  try {
    await pool.query(
      "UPDATE dbo.applications SET status_code='ACCEPTED' WHERE application_id=?",
      [applicationId]
    );
  } catch (err) {
    const msg = String(err?.message || "");
    // ถ้างานนี้มี ACCEPTED อยู่แล้ว → Unique Index จะดีด error
    if (
      err?.number === 2601 ||
      err?.number === 2627 ||
      /UX_OneAcceptedPerJob/i.test(msg)
    ) {
      return res.status(409).json({
        error: "job_already_has_accepted_applicant",
        message: "งานนี้มีผู้ถูกเลือกแล้ว",
      });
    }
    console.error("accept error:", err);
    return res.status(500).json({ error: "internal_error", detail: msg });
  }

  // แจ้งเตือนผู้ที่ถูกเลือก
  await pool.query(
    "INSERT INTO dbo.notifications (user_id, notif_type, content, created_at) VALUES (?, ?, ?, GETDATE())",
    [
      appData.user_id,
      "APPLICATION_ACCEPTED",
      `คุณได้รับการตอบรับในงาน #${appData.job_id}`,
    ]
  );

  res.json({ message: "Applicant accepted ✅" });
});

// Reject
app.post("/api/applications/:id/reject", auth, async (req, res) => {
  const applicationId = req.params.id;
  const appData = await assertJobOwnerFromApplicationOr403(
    req,
    res,
    applicationId
  );
  if (!appData) return;

  await pool.query(
    "UPDATE applications SET status_code='REJECTED' WHERE application_id=?",
    [applicationId]
  );
  await pool.query(
    "INSERT INTO notifications (user_id, notif_type, content, created_at) VALUES (?, ?, ?, GETDATE())",
    [
      appData.user_id,
      "APPLICATION_REJECTED",
      `คุณถูกปฏิเสธจากงาน #${appData.job_id}`,
    ]
  );

  res.json({ message: "Applicant rejected ❌" });
});

//  Complete (เวอร์ชันกันพัง + ล็อกละเอียด + ใช้ 'DONE' ให้ตรงกับ Trigger)
app.post("/api/applications/:id/complete", auth, async (req, res) => {
  const applicationId = Number(req.params.id);
  const { result } = req.body;

  try {
    // 0) validate input
    const valid = ["pass", "ok", "fail"];
    if (!valid.includes(result)) {
      return res
        .status(400)
        .json({ error: "result ต้องเป็น pass | ok | fail เท่านั้น" });
    }
    const points = result === "pass" ? 10 : result === "ok" ? 5 : -5;

    console.log("[/complete] start", { applicationId, result, points });

    // 1) ตรวจสิทธิ์เจ้าของงาน
    const appData = await assertJobOwnerFromApplicationOr403(
      req,
      res,
      applicationId
    );
    if (!appData) {
      console.warn("[/complete] assert owner -> 403 / not found");
      return; // ฟังก์ชันนี้จะตอบ 403 เองแล้ว
    }

    // 2) อัปเดตสถานะใบสมัคร -> ใช้ 'DONE' ให้ตรงกับ Trigger
    try {
      const [up1] = await pool.query(
        "UPDATE dbo.Applications SET status_code = 'DONE' WHERE application_id = ?",
        [applicationId]
      );
      // ถ้า lib คืน rowsAffected เป็น array ให้ลองพิมพ์ดู
      console.log(
        "[/complete] update Applications status DONE -> rowsAffected:",
        up1?.rowsAffected ?? up1
      );
    } catch (e) {
      console.error("[/complete] UPDATE Applications error:", e);
      return res
        .status(500)
        .json({ error: "UPDATE Applications ล้มเหลว", detail: e.message });
    }

    // 3) อัปเดตแต้มความน่าเชื่อถือ (กัน NULL)
    try {
      const [up2] = await pool.query(
        "UPDATE dbo.Users SET trust_points = ISNULL(trust_points, 0) + ? WHERE user_id = ?",
        [points, appData.user_id]
      );
      console.log(
        "[/complete] update Users trust_points -> rowsAffected:",
        up2?.rowsAffected ?? up2
      );
    } catch (e) {
      console.error("[/complete] UPDATE Users(trust_points) error:", e);
      return res
        .status(500)
        .json({ error: "UPDATE Users ล้มเหลว", detail: e.message });
    }

    // 4) PointsLedger (กันล่มถ้ายังไม่มีตาราง/คอลัมน์)
    try {
      const [ins1] = await pool.query(
        "INSERT INTO dbo.PointsLedger (user_id, points, reason, created_at) VALUES (?, ?, ?, GETDATE())",
        [appData.user_id, points, `งาน #${appData.job_id} เสร็จสิ้น`]
      );
      console.log(
        "[/complete] insert PointsLedger ->",
        ins1?.rowsAffected ?? ins1
      );
    } catch (e) {
      console.warn(
        "⚠️ ข้าม PointsLedger (น่าจะยังไม่มีตาราง/คอลัมน์):",
        e.message
      );
    }

    // 5) Notifications (กันล่มถ้ายังไม่มี)
    try {
      const [ins2] = await pool.query(
        "INSERT INTO dbo.Notifications (user_id, notif_type, content, created_at) VALUES (?, ?, ?, GETDATE())",
        [
          appData.user_id,
          "TRUST_POINTS",
          `งาน #${appData.job_id} เสร็จสิ้น คุณได้รับ ${points} คะแนน`,
        ]
      );
      console.log(
        "[/complete] insert Notifications ->",
        ins2?.rowsAffected ?? ins2
      );
    } catch (e) {
      console.warn(
        "⚠️ ข้าม Notifications (น่าจะยังไม่มีตาราง/คอลัมน์):",
        e.message
      );
    }

    // 6) ดึง completed_jobs หลัง Trigger ทำงาน
    //    (Trigger trg_CompletedJobs ใช้ AFTER UPDATE -> ต้องอัปเดตเสร็จก่อนถึงจะอ่านได้)
    let completedJobs = 0;
    try {
      const [rows] = await pool.query(
        "SELECT completed_jobs FROM dbo.Users WHERE user_id = ?",
        [appData.user_id]
      );
      completedJobs = rows?.[0]?.completed_jobs ?? 0;
      console.log("[/complete] read completed_jobs ->", completedJobs);
    } catch (e) {
      console.error("[/complete] SELECT completed_jobs error:", e);
      // ยังตอบ 200 ได้ แต่แนบ detail เพื่อดีบัก
      return res
        .status(500)
        .json({ error: "อ่าน completed_jobs ไม่ได้", detail: e.message });
    }

    return res.json({
      message: "✅ Job completed successfully",
      points,
      completed_jobs: completedJobs,
    });
  } catch (err) {
    console.error("❌ Complete Error (uncaught):", err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// ---------------- Notifications ----------------
app.get("/api/notifications", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(rows);
});

// dastboard
app.get("/api/admin/job-summary", async (_req, res) => {
  try {
    const [rows] = await pool.query(`EXEC dbo.sp_GetJobSummary;`);
    res.json(rows);
  } catch (e) {
    console.error("GET /api/admin/job-summary", e);
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// ส่งแจ้งเตือน
app.post("/api/notifications", auth, async (req, res) => {
  const { user_id, notif_type, content } = req.body;
  try {
    await pool.query(
      "INSERT INTO notifications (user_id, notif_type, content, created_at) VALUES (?, ?, ?, GETDATE())",
      [user_id, notif_type, content]
    );
    res.json({ message: "Notification sent ✅" });
  } catch (e) {
    res.status(500).json({ error: "Notify error", detail: e.message });
  }
});

// แก้ไขงาน
app.put("/api/jobs/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      job_type,
      pay_min,
      pay_max,
      location_text,
      age_min,
      age_max,
    } = req.body;

    const [owner] = await pool.query(
      "SELECT user_id FROM jobs WHERE job_id=?",
      [id]
    );
    if (!owner.length) return res.status(404).json({ error: "Job not found" });
    if (owner[0].user_id !== req.user.id)
      return res.status(403).json({ error: "Unauthorized to edit this job" });

    await pool.query(
      `UPDATE jobs 
   SET title=?, description=?, job_type=?, 
       pay_min=?, pay_max=?, location_text=?, 
       age_min=?, age_max=?
   WHERE job_id=?`,
      [
        title,
        description,
        job_type || "",
        pay_min,
        pay_max,
        location_text,
        age_min,
        age_max,
        id,
      ]
    );

    res.json({ message: "✅ Job updated successfully" });
  } catch (e) {
    res.status(500).json({ error: "Update error", detail: e.message });
  }
});

// ลบงาน
app.delete("/api/jobs/:id", auth, async (req, res) => {
  try {
    const jobId = Number(req.params.id);

    // เช็คว่าเป็นเจ้าของงาน
    const [rows] = await pool.query(
      "SELECT user_id FROM dbo.jobs WHERE job_id=?",
      [jobId]
    );
    if (!rows.length) return res.status(404).json({ error: "Job not found" });
    if (Number(rows[0].user_id) !== Number(req.user.id)) {
      return res
        .status(403)
        .json({ error: "You are not the owner of this job" });
    }

    // ลบลูกที่อ้างอิงก่อน (ถ้ามีตารางอื่นก็เพิ่มได้)
    await pool.query("DELETE FROM dbo.applications WHERE job_id=?", [jobId]);
    await pool.query("DELETE FROM dbo.notifications WHERE content LIKE ?", [
      `%งาน #${jobId}%`,
    ]); // optional

    // ลบตัวงาน
    await pool.query("DELETE FROM dbo.jobs WHERE job_id=?", [jobId]);

    res.json({ message: "✅ Job deleted successfully" });
  } catch (e) {
    console.error("Delete error:", e);
    res
      .status(500)
      .json({ error: "Delete error", detail: String(e?.message || e) });
  }
});

// =============================
//  FUNCTION USERS WITH TRUST LEVEL
app.get("/api/users/with-trust", async (_req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const rs = await pool.request().query(`
      SELECT 
        user_id,
        full_name,
        trust_points,
        dbo.fn_GetTrustLevel(ISNULL(trust_points, 0)) AS trust_level
      FROM dbo.users
      ORDER BY user_id ASC
    `);
    res.json(rs.recordset);
  } catch (err) {
    console.error("GET /api/users/with-trust error:", err);
    res.status(500).json({ error: "failed_to_fetch_users" });
  }
});

//  Function ค่าแรงเฉลี่ย งานเดียว + ราคาเฉลี่ยจาก fn_AvgPay
app.get("/api/jobs/:id", async (req, res) => {
  try {
    const jobId = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT 
        j.job_id,
        j.title,
        j.description,
        j.pay_min,
        j.pay_max,
        j.status_code,
        j.location_text,
        --  เรียกฟังก์ชันคำนวณค่าเฉลี่ย
        CAST(dbo.fn_AvgPay(j.job_id) AS DECIMAL(10,2)) AS avg_pay
      FROM dbo.jobs AS j
      WHERE j.job_id = ?
      `,
      [jobId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "job_not_found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/jobs/:id error:", err);
    res.status(500).json({ error: "failed_to_fetch_job" });
  }
});

// (optional) สำหรับหน้ารีเฟรชบ่อย
app.get("/api/jobs/:jobId/applications", async (req, res) => {
  const jobId = Number(req.params.jobId);
  if (!jobId) return res.status(400).json({ error: "invalid_job_id" });

  try {
    const [rows] = await pool.query(
      `
      SELECT a.application_id, a.job_id, a.user_id, a.status_code, a.applied_at,
             u.full_name, u.trust_points, ISNULL(u.completed_jobs,0) AS completed_jobs
      FROM dbo.applications a
      JOIN dbo.users u ON u.user_id = a.user_id
      WHERE a.job_id = ?
      ORDER BY
        CASE a.status_code WHEN 'ACCEPTED' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
        a.applied_at ASC
      `,
      [jobId]
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /api/jobs/:jobId/applications", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// Procedure สรุปผลงานของผู้ใช้รายคน
app.get("/api/users/:id/performance", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ error: "invalid_user_id" });

    const [rows] = await pool.query(
      `EXEC dbo.sp_GetUserPerformance @user_id=?`,
      [userId]
    );

    // ให้ค่าดีฟอลต์ถ้าไม่มีข้อมูล
    res.json(
      rows?.[0] ?? {
        user_id: userId,
        full_name: null,
        total_applied: 0,
        accepted_jobs: 0,
        completed_jobs: 0,
        trust_points: 0,
        trust_level: "N/A",
      }
    );
  } catch (e) {
    console.error("GET /api/users/:id/performance", e);
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// ---------------- View: v_UserApplications ----------------
// GET /api/view/user-applications?status=DONE&top=100
app.get("/api/view/user-applications", async (req, res) => {
  try {
    const { status, top } = req.query;
    const topN = top ? Math.max(1, Math.min(500, Number(top))) : 100;

    // ดึงจาก VIEW โดยตรง
    let sqlText = `
      SELECT TOP ${topN}
        application_id,
        full_name,
        job_title,
        status_code,
        applied_at
      FROM dbo.v_UserApplications
    `;

    const params = [];
    if (status) {
      sqlText += ` WHERE status_code = ?`;
      params.push(String(status).toUpperCase());
    }
    sqlText += ` ORDER BY applied_at DESC`;

    const [rows] = await pool.query(sqlText, params);
    res.json(rows);
  } catch (e) {
    console.error("GET /api/view/user-applications error:", e);
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// ---------------- View: v_UserPoints ----------------
// GET /api/view/user-points?top=100&query=tanus
app.get("/api/view/user-points", async (req, res) => {
  try {
    const { top, query } = req.query;
    const topN = top ? Math.max(1, Math.min(500, Number(top))) : 100;

    let sqlText = `
      SELECT TOP ${topN}
        user_id,
        full_name,
        email,
        ISNULL(total_points, 0) AS total_points
      FROM dbo.v_UserPoints
    `;

    const params = [];
    if (query) {
      // ค้นหาจากชื่อหรืออีเมลแบบ contains
      sqlText += ` WHERE full_name LIKE ? OR email LIKE ?`;
      const q = `%${String(query).trim()}%`;
      params.push(q, q);
    }
    sqlText += ` ORDER BY total_points DESC, full_name ASC`;

    const [rows] = await pool.query(sqlText, params);
    res.json(rows);
  } catch (e) {
    console.error("GET /api/view/user-points error:", e);
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// (ทางเลือก) ดูแต้มเฉพาะของผู้ใช้ที่ล็อกอิน
app.get("/api/view/my-points", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT user_id, full_name, email, ISNULL(total_points,0) AS total_points
      FROM dbo.v_UserPoints
      WHERE user_id = ?
      `,
      [req.user.id]
    );
    res.json(
      rows?.[0] ?? {
        user_id: req.user.id,
        full_name: null,
        email: null,
        total_points: 0,
      }
    );
  } catch (e) {
    console.error("GET /api/view/my-points error:", e);
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// ---------------- Start ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 API running on http://localhost:${PORT}`)
);
