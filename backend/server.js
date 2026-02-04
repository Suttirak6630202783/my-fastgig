import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- Database (MySQL) ----------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "FastGig",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .getConnection()
  .then((conn) => {
    console.log("✅ Connected to MySQL Database");
    conn.release();
  })
  .catch((err) => {
    console.error("❌ Database Connection Failed!", err);
    process.exit(1);
  });

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

    // ✅ แก้ไข: ลบ dbo. และเปลี่ยน GETDATE() เป็น NOW()
    await pool.query(
      `INSERT INTO users
    (full_name, email, password_hash, phone, age, skills, profile_image, trust_points, created_at)
    VALUES
     (?, ?, ?, ?, ?, ?, NULL, 0, NOW())`,
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
    console.error("Register Error:", e); // ปริ้นท์ error ลง terminal
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

// ---------------- Login ----------------
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email/Password required" });

    // ✅ แก้ไข: ลบ dbo.
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
    console.error("Login Error:", e);
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

// ---------------- Profile ----------------
app.get("/api/me", auth, async (req, res) => {
  try {
    // ✅ แก้ไข: ISNULL -> IFNULL, ลบ dbo.
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
          IFNULL(u.trust_points,0) AS trust_points,
          IFNULL(u.completed_jobs,0) AS completed_jobs,
          TRIM(fn_GetTrustLevel(IFNULL(u.trust_points, 0))) AS trust_level
       FROM users AS u
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
    // ✅ แก้ไข: ลบ dbo., ใช้ LIMIT แทน TOP
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
        CAST(fn_AvgPay(j.job_id) AS DECIMAL(10,2)) AS avg_pay
      FROM jobs AS j
      JOIN users AS u ON j.user_id = u.user_id
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
      pay_min,
      pay_max,
      location_text,
      age_min,
      age_max,
    } = req.body;

    if (!title || !description || String(pay_min ?? "").trim() === "") {
      return res.status(400).json({ error: "Missing fields" });
    }

    // ✅ แก้ไข: ตัด logic ซับซ้อนของ MSSQL ออก ใช้แบบเรียบง่ายของ MySQL
    await pool.query(
      `
      INSERT INTO jobs
        (user_id, title, description, job_type,
         pay_min, pay_max, location_text,
         age_min, age_max, status_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NOW())
      `,
      [
        req.user.id,
        title,
        description,
        job_type || "",
        parseInt(pay_min) || 0,
        parseInt(pay_max) || parseInt(pay_min) || 0,
        location_text || "",
        age_min ? parseInt(age_min) : null,
        age_max ? parseInt(age_max) : null,
      ]
    );

    res.json({ message: "Job created ✅" });
  } catch (e) {
    console.error("Create Job Error:", e);
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

app.get("/api/my-jobs", auth, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM jobs WHERE user_id=?", [
    req.user.id,
  ]);
  res.json(rows);
});

// ---------------- Applications ----------------
app.post("/api/applications", auth, async (req, res) => {
  try {
    const { job_id } = req.body;
    if (!job_id) return res.status(400).json({ error: "job_id is required" });

    // ✅ แก้ไข: ลบ dbo.
    const [jobRows] = await pool.query(
      "SELECT user_id FROM jobs WHERE job_id=?",
      [job_id]
    );
    if (!jobRows.length)
      return res.status(404).json({ error: "Job not found" });
    if (Number(jobRows[0].user_id) === Number(req.user.id)) {
      return res.status(400).json({ error: "ห้ามสมัครงานของตัวเอง" });
    }

    const [exist] = await pool.query(
      "SELECT 1 FROM applications WHERE job_id=? AND user_id=?",
      [job_id, req.user.id]
    );
    if (exist.length)
      return res.status(400).json({ error: "คุณสมัครงานนี้แล้ว" });

    // ✅ แก้ไข: ลบ dbo., ใช้ NOW()
    await pool.query(
      `INSERT INTO applications (job_id, user_id, status_code, applied_at)
       VALUES (?, ?, 'PENDING', NOW())`,
      [job_id, req.user.id]
    );

    res.json({ message: "สมัครงานสำเร็จ ✅" });
  } catch (e) {
    console.error("POST /api/applications error:", e);
    res.status(500).json({ error: "Server error", detail: e.message });
  }
});

app.get("/api/my-applications", auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, j.title, j.description, j.pay_min, j.pay_max
     FROM applications a JOIN jobs j ON a.job_id=j.job_id
     WHERE a.user_id=?`,
    [req.user.id]
  );
  res.json(rows);
});

app.get("/api/jobs/:id/applicants", auth, async (req, res) => {
  try {
    const jobId = Number(req.params.id);

    // ✅ แก้ไข: ลบ dbo., ISNULL -> IFNULL
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
        IFNULL(u.completed_jobs, 0) AS completed_jobs,
        TRIM(fn_GetTrustLevel(IFNULL(u.trust_points, 0))) AS trust_level
      FROM applications AS a
      JOIN users AS u ON u.user_id = a.user_id
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

// Helper
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

// Accept/Reject/Complete (ลบ dbo., เปลี่ยน GETDATE -> NOW, ISNULL -> IFNULL)
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
      "UPDATE applications SET status_code='ACCEPTED' WHERE application_id=?",
      [applicationId]
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
      return res.status(409).json({
        error: "job_already_has_accepted_applicant",
        message: "งานนี้มีผู้ถูกเลือกแล้ว",
      });
    }
    return res
      .status(500)
      .json({ error: "internal_error", detail: err.message });
  }

  await pool.query(
    "INSERT INTO notifications (user_id, notif_type, content, created_at) VALUES (?, ?, ?, NOW())",
    [
      appData.user_id,
      "APPLICATION_ACCEPTED",
      `คุณได้รับการตอบรับในงาน #${appData.job_id}`,
    ]
  );

  res.json({ message: "Applicant accepted ✅" });
});

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
    "INSERT INTO notifications (user_id, notif_type, content, created_at) VALUES (?, ?, ?, NOW())",
    [
      appData.user_id,
      "APPLICATION_REJECTED",
      `คุณถูกปฏิเสธจากงาน #${appData.job_id}`,
    ]
  );
  res.json({ message: "Applicant rejected ❌" });
});

app.post("/api/applications/:id/complete", auth, async (req, res) => {
  const applicationId = Number(req.params.id);
  const { result } = req.body;
  const valid = ["pass", "ok", "fail"];
  if (!valid.includes(result))
    return res.status(400).json({ error: "Invalid result" });
  const points = result === "pass" ? 10 : result === "ok" ? 5 : -5;

  const appData = await assertJobOwnerFromApplicationOr403(
    req,
    res,
    applicationId
  );
  if (!appData) return;

  try {
    await pool.query(
      "UPDATE applications SET status_code = 'DONE' WHERE application_id = ?",
      [applicationId]
    );
    await pool.query(
      "UPDATE users SET trust_points = IFNULL(trust_points, 0) + ?, completed_jobs = IFNULL(completed_jobs, 0) + 1 WHERE user_id = ?",
      [points, appData.user_id]
    );
    await pool.query(
      "INSERT INTO pointsledger (user_id, points, reason, created_at) VALUES (?, ?, ?, NOW())",
      [appData.user_id, points, `งาน #${appData.job_id} เสร็จสิ้น`]
    );
    await pool.query(
      "INSERT INTO notifications (user_id, notif_type, content, created_at) VALUES (?, ?, ?, NOW())",
      [
        appData.user_id,
        "TRUST_POINTS",
        `งาน #${appData.job_id} เสร็จสิ้น คุณได้รับ ${points} คะแนน`,
      ]
    );

    const [uRows] = await pool.query(
      "SELECT completed_jobs FROM users WHERE user_id=?",
      [appData.user_id]
    );
    res.json({
      message: "✅ Job completed successfully",
      points,
      completed_jobs: uRows[0]?.completed_jobs || 0,
    });
  } catch (err) {
    console.error("Complete Error:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// Notifications
app.get("/api/notifications", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(rows);
});

// Dashboard: Job Summary
app.get("/api/admin/job-summary", async (_req, res) => {
  try {
    // ✅ แก้ไข: EXEC -> CALL
    const [rows] = await pool.query("CALL sp_GetJobSummary()");
    res.json(rows[0]);
  } catch (e) {
    console.error("GET job-summary error:", e);
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// User Performance
app.get("/api/users/:id/performance", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    // ✅ แก้ไข: EXEC -> CALL
    const [rows] = await pool.query("CALL sp_GetUserPerformance(?)", [userId]);
    res.json(rows[0]?.[0] || {});
  } catch (e) {
    console.error("Performance Error:", e);
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// Views
app.get("/api/view/user-applications", async (req, res) => {
  try {
    const { status, top } = req.query;
    const topN = Number(top) || 100;
    let sql = "SELECT * FROM v_UserApplications";
    const params = [];
    if (status) {
      sql += " WHERE status_code = ?";
      params.push(status);
    }
    // ✅ แก้ไข: LIMIT
    sql += " ORDER BY applied_at DESC LIMIT ?";
    params.push(topN);
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

app.get("/api/view/user-points", async (req, res) => {
  try {
    const { top, query } = req.query;
    const topN = Number(top) || 100;
    let sql = "SELECT * FROM v_UserPoints";
    const params = [];
    if (query) {
      sql += " WHERE full_name LIKE ? OR email LIKE ?";
      params.push(`%${query}%`, `%${query}%`);
    }
    // ✅ แก้ไข: LIMIT
    sql += " ORDER BY total_points DESC LIMIT ?";
    params.push(topN);
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "internal_error", detail: e.message });
  }
});

// Delete Job
app.delete("/api/jobs/:id", auth, async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const [rows] = await pool.query("SELECT user_id FROM jobs WHERE job_id=?", [
      jobId,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Job not found" });
    if (Number(rows[0].user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: "ไม่ใช่เจ้าของงาน" });
    }
    await pool.query("DELETE FROM applications WHERE job_id=?", [jobId]);
    await pool.query("DELETE FROM notifications WHERE content LIKE ?", [
      `%งาน #${jobId}%`,
    ]);
    await pool.query("DELETE FROM jobs WHERE job_id=?", [jobId]);
    res.json({ message: "✅ Job deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: "Delete error", detail: e.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 API running on http://localhost:${PORT}`)
);
