// ai_service_skill_intent_pro.js — MySQL EDITION ✅
import { pipeline } from "@xenova/transformers";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise"; // ✅ เปลี่ยนเป็น mysql2
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- Health Flags & Routes ---------- */
let DB_READY = false;
let EMBED_READY = false;

app.get("/_health", (_req, res) => {
  res.json({ ok: DB_READY && EMBED_READY, db: DB_READY, embed: EMBED_READY });
});
app.get("/", (_req, res) => res.send("AI service alive (MySQL Version)"));

/* ---------- Database (MySQL Connection) ---------- */
// ✅ ใช้ Config เดียวกับ server.js
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

// ✅ เช็คการเชื่อมต่อแบบ MySQL
pool
  .getConnection()
  .then((conn) => {
    DB_READY = true;
    console.log("✅ AI connected to MySQL Database");
    conn.release();
  })
  .catch((err) => {
    DB_READY = false;
    console.error("❌ AI DB Connection Failed!", err);
    process.exit(1);
  });

/* ---------- Load Model ---------- */
console.log("⏳ Loading AI model...");
// โหลด Model (อาจใช้เวลาหน่อยในครั้งแรก)
let embedder;
try {
  embedder = await pipeline(
    "feature-extraction",
    "Xenova/distiluse-base-multilingual-cased-v2",
  );
  EMBED_READY = true;
  console.log("✅ Model loaded successfully!");
} catch (err) {
  console.error("❌ Failed to load AI Model:", err);
}

/* ---------- Utilities ---------- */
function normalize(text = "") {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/gi, "");
}
function toArray(out) {
  if (!out) return [];
  if (Array.isArray(out)) {
    if (out[0]?.data) return Array.from(out[0].data);
    if (Array.isArray(out[0])) return out[0];
  }
  if (out.data) return Array.from(out.data);
  if (out.tensor?.data) return Array.from(out.tensor.data);
  return [];
}
function cosine(a, b) {
  if (!a.length || !b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

/* ---------- หมวดงานหลัก (เหมือนเดิม) ---------- */
const CATS = [
  {
    tag: "อาหาร",
    kws: [
      "อาหาร",
      "เชฟ",
      "แม่ครัว",
      "กุ๊ก",
      "ครัว",
      "จัดเลี้ยง",
      "ทำอาหาร",
      "ขนม",
      "เครื่องดื่ม",
      "เบเกอรี่",
      "หางานทำกับข้าว",
      "เซฟ",
      "ทำกับข้าว",
    ],
  },
  {
    tag: "ก่อสร้าง",
    kws: [
      "ช่างก่อสร้าง",
      "ก่อสร้าง",
      "ทาสี",
      "ซ่อม",
      "ไฟฟ้า",
      "ประปา",
      "เหล็ก",
      "ไม้",
      "ปูน",
      "ต่อเติม",
      "หลังคา",
    ],
  },
  {
    tag: "ขนย้ายของ",
    kws: [
      "ขนของ",
      "ย้ายบ้าน",
      "ยกของ",
      "ขนย้าย",
      "แบกของ",
      "รถขนของ",
      "บรรทุกของ",
      "ย้ายออฟฟิศ",
      "คนยกของ",
    ],
  },
  {
    tag: "ทำความสะอาด",
    kws: [
      "แม่บ้าน",
      "ทำความสะอาด",
      "ล้างจาน",
      "ซักผ้า",
      "กวาดถู",
      "เช็ด",
      "ขัดพื้น",
      "ดูดฝุ่น",
      "ทำห้องน้ำ",
    ],
  },
  {
    tag: "สอนหนังสือ",
    kws: [
      "สอน",
      "ติวเตอร์",
      "ครู",
      "กวดวิชา",
      "ติว",
      "สอนพิเศษ",
      "ภาษาอังกฤษ",
      "คณิต",
      "วิทยาศาสตร์",
      "เขียนโปรแกรม",
    ],
  },
  {
    tag: "ไอที/เขียนโปรแกรม",
    kws: [
      "เขียนโปรแกรม",
      "โค้ด",
      "นักพัฒนา",
      "ทำเว็บ",
      "เว็บไซต์",
      "แอป",
      "เทคโนโลยี",
      "โปรแกรมเมอร์",
      "AI",
      "Data",
      "Software",
    ],
  },
  {
    tag: "ขาย/บริการลูกค้า",
    kws: [
      "ขาย",
      "เซลล์",
      "บริการลูกค้า",
      "แคชเชียร์",
      "หน้าร้าน",
      "พนักงานขาย",
      "Call Center",
      "ฝ่ายขาย",
      "PR",
    ],
  },
  {
    tag: "ตัดต่อ/วิดีโอ",
    kws: [
      "ตัดต่อ",
      "ทำคลิป",
      "ตัดต่อคลิป",
      "วิดีโอ",
      "editor",
      "premiere",
      "capcut",
      "รีวิว",
      "ทำ content",
    ],
  },
  {
    tag: "ถ่ายภาพ/วิดีโอ",
    kws: [
      "ช่างภาพ",
      "ถ่ายภาพ",
      "ถ่ายวิดีโอ",
      "กล้อง",
      "ถ่ายงาน",
      "งานแต่ง",
      "ถ่ายสินค้า",
      "ตากล้อง",
      "videographer",
    ],
  },
  {
    tag: "ออกแบบกราฟิก",
    kws: [
      "กราฟิก",
      "ออกแบบ",
      "Photoshop",
      "Illustrator",
      "logo",
      "banner",
      "poster",
      "ui",
      "ux",
      "Canva",
      "designer",
    ],
  },
  {
    tag: "บัญชี/การเงิน",
    kws: [
      "บัญชี",
      "การเงิน",
      "บัญชีรายรับรายจ่าย",
      "ภาษี",
      "งบการเงิน",
      "ตรวจบัญชี",
      "Excel",
      "พนักงานบัญชี",
    ],
  },
  {
    tag: "ขับรถ/ส่งของ",
    kws: [
      "ขับรถ",
      "ขับส่งของ",
      "เดลิเวอรี่",
      "ไรเดอร์",
      "รถยนต์",
      "รถกระบะ",
      "ขนส่ง",
      "ส่งเอกสาร",
      "ส่งอาหาร",
      "แมสเซนเจอร์",
    ],
  },
  {
    tag: "ดูแลผู้สูงอายุ",
    kws: [
      "พยาบาล",
      "ผู้สูงอายุ",
      "ดูแลคนแก่",
      "ผู้ป่วย",
      "เฝ้าไข้",
      "Caregiver",
      "ดูแลบ้าน",
      "ช่วยเหลือ",
    ],
  },
  {
    tag: "ดูแลเด็ก",
    kws: [
      "พี่เลี้ยง",
      "ดูแลเด็ก",
      "เนอร์สเซอรี่",
      "เด็กเล็ก",
      "ครูอนุบาล",
      "แม่บ้านเด็ก",
      "รับเลี้ยงเด็ก",
    ],
  },
  {
    tag: "เกษตร/สวน",
    kws: [
      "เกษตร",
      "สวน",
      "ปลูกผัก",
      "เลี้ยงสัตว์",
      "ทำไร่",
      "ทำสวน",
      "เก็บผลไม้",
      "เกษตรกร",
      "แปรรูป",
    ],
  },
  {
    tag: "เครื่องจักร/ช่างกล",
    kws: [
      "เครื่องจักร",
      "กลึง",
      "เชื่อม",
      "CNC",
      "ช่างกล",
      "โรงงาน",
      "อุตสาหกรรม",
      "เครื่องกล",
    ],
  },
  {
    tag: "ความงาม/เสริมสวย",
    kws: [
      "เสริมสวย",
      "แต่งหน้า",
      "ทำผม",
      "ช่างผม",
      "ตัดผม",
      "สปา",
      "นวดหน้า",
      "นวดตัว",
      "ทำเล็บ",
      "บิวตี้",
    ],
  },
  {
    tag: "ฟิตเนส/เทรนเนอร์",
    kws: [
      "ฟิตเนส",
      "เทรนเนอร์",
      "ออกกำลังกาย",
      "โยคะ",
      "สอนฟิตเนส",
      "สอนโยคะ",
      "โภชนาการ",
      "สุขภาพ",
    ],
  },
  {
    tag: "ล่าม/แปลภาษา",
    kws: [
      "แปลภาษา",
      "ล่าม",
      "translator",
      "translate",
      "ภาษาอังกฤษ",
      "ภาษาญี่ปุ่น",
      "ภาษาจีน",
      "ล่ามแปล",
    ],
  },
  {
    tag: "การตลาด",
    kws: [
      "การตลาด",
      "มาร์เก็ตติ้ง",
      "โฆษณา",
      "โปรโมท",
      "PR",
      "SEO",
      "Facebook Ads",
      "Tiktok",
      "คอนเทนต์",
    ],
  },
  {
    tag: "บริหาร/จัดการ",
    kws: [
      "ผู้จัดการ",
      "หัวหน้า",
      "บริหาร",
      "supervisor",
      "management",
      "lead",
      "operation",
      "project manager",
    ],
  },
  {
    tag: "นักบัญชี",
    kws: [
      "นักบัญชี",
      "บัญชี",
      "บัญชีการเงิน",
      "ภาษี",
      "ตรวจสอบบัญชี",
      "รายงานการเงิน",
    ],
  },
  {
    tag: "ทรัพยากรบุคคล",
    kws: ["HR", "บุคคล", "สรรหา", "ฝึกอบรม", "Human Resource", "จัดตารางงาน"],
  },
  {
    tag: "ออกแบบตกแต่งภายใน",
    kws: [
      "ออกแบบภายใน",
      "ตกแต่ง",
      "interior",
      "3D",
      "สถาปัตย์",
      "บ้าน",
      "ตกแต่งบ้าน",
    ],
  },
  {
    tag: "ศิลปะ/งานฝีมือ",
    kws: [
      "ศิลปะ",
      "วาดรูป",
      "ประดิษฐ์",
      "เย็บผ้า",
      "งานฝีมือ",
      "ปั้น",
      "งานศิลป์",
    ],
  },
  {
    tag: "งานอีเวนต์",
    kws: [
      "event",
      "อีเวนต์",
      "จัดงาน",
      "staff",
      "MC",
      "พิธีกร",
      "จัดบูธ",
      "event staff",
    ],
  },
  {
    tag: "รักษาความปลอดภัย",
    kws: [
      "รปภ",
      "ยาม",
      "security",
      "ดูแลความปลอดภัย",
      "ตรวจตรา",
      "รักษาความสงบ",
    ],
  },
  {
    tag: "แม่บ้าน/แม่ครัว",
    kws: [
      "แม่บ้าน",
      "แม่ครัว",
      "ล้างจาน",
      "ทำอาหาร",
      "ทำความสะอาด",
      "ทำกับข้าว",
    ],
  },
  {
    tag: "พนักงานโรงแรม",
    kws: [
      "โรงแรม",
      "รีสอร์ต",
      "บริการ",
      "ต้อนรับ",
      "แม่บ้านโรงแรม",
      "bellboy",
      "receptionist",
    ],
  },
  {
    tag: "พนักงานร้านอาหาร",
    kws: [
      "ร้านอาหาร",
      "เสิร์ฟ",
      "พนักงานเสิร์ฟ",
      "บาร์เทนเดอร์",
      "พ่อครัว",
      "ผู้ช่วยครัว",
    ],
  },
  {
    tag: "พนักงานคลังสินค้า",
    kws: [
      "คลังสินค้า",
      "สต็อก",
      "จัดของ",
      "แพ็คของ",
      "ตรวจนับสินค้า",
      "warehouse",
    ],
  },
  {
    tag: "แอดมิน/พนักงานออฟฟิศ",
    kws: [
      "แอดมิน",
      "พนักงานออฟฟิศ",
      "เอกสาร",
      "data entry",
      "พิมพ์งาน",
      "รับโทรศัพท์",
      "ประสานงาน",
    ],
  },
  {
    tag: "เกษตรแปรรูป",
    kws: [
      "แปรรูปอาหาร",
      "อบแห้ง",
      "บรรจุภัณฑ์",
      "ผลิตผลเกษตร",
      "ผลิตสินค้าเกษตร",
    ],
  },
  {
    tag: "ขับรถรับส่งนักเรียน",
    kws: [
      "ขับรถ",
      "รับส่งนักเรียน",
      "รถตู้",
      "คนขับรถโรงเรียน",
      "ขับรถบัส",
      "ขับรถตู้",
    ],
  },
  {
    tag: "บริการลูกค้าออนไลน์",
    kws: [
      "chat",
      "ตอบแชท",
      "บริการลูกค้า",
      "แอดมินเพจ",
      "ตอบลูกค้า",
      "รับออเดอร์",
      "Call Center",
    ],
  },
  {
    tag: "ทำสวน/ปลูกต้นไม้",
    kws: [
      "สวน",
      "ปลูกต้นไม้",
      "ดูแลต้นไม้",
      "ตกแต่งสวน",
      "จัดสวน",
      "สนามหญ้า",
      "สวนหย่อม",
    ],
  },
  {
    tag: "ซ่อมคอม/มือถือ",
    kws: [
      "ซ่อมคอม",
      "คอมพิวเตอร์",
      "มือถือ",
      "เปลี่ยนจอ",
      "ลงโปรแกรม",
      "IT Support",
      "Technician",
      "ช่างคอม",
    ],
  },
  {
    tag: "นักวิจัย/ข้อมูล",
    kws: [
      "วิจัย",
      "ข้อมูล",
      "data",
      "analysis",
      "สถิติ",
      "รายงาน",
      "machine learning",
      "AI",
    ],
  },
  {
    tag: "ช่างภาพสินค้า",
    kws: ["ถ่ายสินค้า", "ถ่ายรูปสินค้า", "ถ่ายรีวิว", "ภาพโฆษณา", "packshot"],
  },
  {
    tag: "ช่างซ่อมรถ",
    kws: [
      "ช่างซ่อมรถ",
      "อู่",
      "เครื่องยนต์",
      "รถยนต์",
      "เปลี่ยนยาง",
      "เปลี่ยนน้ำมันเครื่อง",
    ],
  },
  {
    tag: "คอลเซ็นเตอร์",
    kws: [
      "call center",
      "รับสาย",
      "โทร",
      "บริการลูกค้า",
      "contact",
      "customer service",
    ],
  },
  {
    tag: "พนักงานขนส่ง",
    kws: ["ขนส่ง", "ขับรถส่งของ", "โลจิสติกส์", "delivery", "รถกระบะ", "truck"],
  },
  {
    tag: "แพทย์/พยาบาล",
    kws: [
      "แพทย์",
      "พยาบาล",
      "ดูแลผู้ป่วย",
      "โรงพยาบาล",
      "คลินิก",
      "เจ้าหน้าที่สาธารณสุข",
    ],
  },
  {
    tag: "เภสัชกร",
    kws: ["เภสัชกร", "ยา", "จัดยา", "ขายยา", "ร้านขายยา", "คลังยา"],
  },
  {
    tag: "สัตวแพทย์/สัตว์เลี้ยง",
    kws: ["สัตว์", "สัตวแพทย์", "หมา", "แมว", "คลินิกสัตว์", "อาบน้ำตัดขน"],
  },
  {
    tag: "ครีเอทีฟ",
    kws: [
      "ครีเอทีฟ",
      "creative",
      "คิดคอนเทนต์",
      "ออกไอเดีย",
      "สคริปต์",
      "โฆษณา",
    ],
  },
  {
    tag: "โปรดิวเซอร์/ผู้กำกับ",
    kws: [
      "โปรดิวเซอร์",
      "ผู้กำกับ",
      "ผลิตสื่อ",
      "ถ่ายทำ",
      "จัดทีมงาน",
      "production",
    ],
  },
  {
    tag: "พนักงานต้อนรับ",
    kws: ["ต้อนรับ", "receptionist", "front desk", "ลูกค้า", "บริการ"],
  },
  {
    tag: "ทนาย/ที่ปรึกษากฎหมาย",
    kws: ["ทนาย", "กฎหมาย", "ฟ้อง", "ร้องเรียน", "ที่ปรึกษากฎหมาย", "lawyer"],
  },
  {
    tag: "อาจารย์มหาวิทยาลัย",
    kws: ["อาจารย์", "สอน", "วิจัย", "ที่ปรึกษา", "วิทยานิพนธ์", "บรรยาย"],
  },
  {
    tag: "พนักงานร้านกาแฟ",
    kws: [
      "บาริสต้า",
      "ร้านกาแฟ",
      "กาแฟ",
      "เครื่องดื่ม",
      "ชงกาแฟ",
      "บริการลูกค้า",
    ],
  },
  {
    tag: "จัดซื้อ/จัดหา",
    kws: ["จัดซื้อ", "procurement", "จัดหา", "supplier", "จัดสรรสินค้า"],
  },
  {
    tag: "คลังข้อมูล/Database",
    kws: ["ฐานข้อมูล", "SQL", "database", "data engineer", "จัดการข้อมูล"],
  },
];

/* ---------- Intent Detection ---------- */
function detectRuleIntent(message) {
  const msg = normalize(message);
  let bestTag = null;
  let maxHits = 0;
  for (const cat of CATS) {
    const hits = cat.kws.filter((kw) => msg.includes(normalize(kw))).length;
    if (hits > maxHits) {
      bestTag = cat.tag;
      maxHits = hits;
    }
  }
  return bestTag;
}

async function detectEmbeddingIntent(message) {
  const msg = normalize(message || "");
  if (!msg) return { tag: "ไม่ระบุ", conf: 0 };
  const msgVec = toArray((await embedder(msg))[0]);
  const catVecs = await Promise.all(CATS.map((c) => embedder(c.kws.join(" "))));
  const sims = catVecs.map((v) => cosine(msgVec, toArray(v[0])));
  const idx = sims.indexOf(Math.max(...sims));
  const conf = Math.max(...sims);
  return { tag: CATS[idx].tag, conf: conf || 0 };
}

function filterJobsByCategory(jobs, tag) {
  const cat = CATS.find((c) => c.tag === tag);
  if (!cat) return jobs;
  const kws = cat.kws.map(normalize);
  const filtered = jobs.filter((j) => {
    const t = normalize(`${j.title} ${j.description || ""}`);
    return kws.some((kw) => t.includes(kw));
  });
  return filtered.length ? filtered : jobs;
}

/* ---------- /api/match ---------- */
const DEBUG_JSON = process.env.DEBUG_JSON === "1";

app.post("/api/match", async (req, res) => {
  try {
    // 0) ตรวจ user_id
    const { user_id } = req.body || {};
    const uid = Number(user_id);
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ error: "user_id ต้องเป็นตัวเลข" });
    }

    // 1) อ่านทักษะผู้ใช้ (MySQL ใช้ [rows])
    let user;
    try {
      const [rows] = await pool.query(
        "SELECT skills FROM users WHERE user_id = ?",
        [uid],
      );
      user = rows[0];
    } catch (e) {
      console.error("DB error (read user):", e);
      return res.status(500).json({
        error: "DB error (read user)",
        detail: DEBUG_JSON ? e.message : undefined,
      });
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    const userSkill = (user.skills || "").toString().trim();
    if (!userSkill) {
      return res.json({ message: "ยังไม่ได้ระบุทักษะในโปรไฟล์", jobs: [] });
    }
    console.log("🧠 User Skill:", userSkill);

    // 2) ระบุหมวดงาน
    let tag = detectRuleIntent(userSkill);
    let confidence = 1.0;
    if (!tag) {
      try {
        const emb = await detectEmbeddingIntent(userSkill);
        tag = emb.tag;
        confidence = emb.conf || 0;
      } catch (e) {
        console.error("Embed error (userSkill):", e);
        return res.status(500).json({
          error: "Embed error (userSkill)",
          detail: DEBUG_JSON ? e.message : undefined,
        });
      }
    }
    console.log(`🎯 Tag: ${tag} | Conf: ${(confidence * 100).toFixed(1)}%`);

    // 3) ดึงงานที่เปิดรับ
    let jobs = [];
    try {
      const [rows] = await pool.query(`
        SELECT
            j.job_id,
            j.title,
            j.description,
            j.pay_min,
            j.pay_max,
            j.age_min,
            j.age_max,
            j.location_text,
            j.status_code,
            u.full_name,
            u.profile_image
        FROM jobs j
        LEFT JOIN users u ON u.user_id = j.user_id
        WHERE j.status_code = 'OPEN'
      `);
      jobs = rows || [];
    } catch (e) {
      console.error("DB error (read jobs):", e);
      return res.status(500).json({
        error: "DB error (read jobs)",
        detail: DEBUG_JSON ? e.message : undefined,
      });
    }

    if (!jobs.length) {
      return res.json({ message: "ยังไม่มีงานเปิดรับ", jobs: [] });
    }

    // 4) คัดกรองตามหมวด
    const candidate = filterJobsByCategory(jobs, tag);
    if (!candidate.length) {
      return res.json({ message: "ยังไม่มีงานที่ตรงหมวด", jobs: [] });
    }

    // 5) จัดอันดับด้วย embedding
    let ranked = [];
    try {
      const uvec = toArray((await embedder(userSkill))[0]);
      const jvecs = await Promise.all(
        candidate.map((j) => embedder(`${j.title} ${j.description || ""}`)),
      );
      const sims = jvecs.map((v) => cosine(uvec, toArray(v[0])));
      ranked = candidate
        .map((j, i) => ({ ...j, similarity: sims[i] || 0 }))
        .filter((j) => j.similarity > 0.25)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
    } catch (e) {
      console.error("Embed error (jobs):", e);
      return res.status(500).json({
        error: "Embed error (jobs)",
        detail: DEBUG_JSON ? e.message : undefined,
      });
    }

    console.table(
      ranked.map((j) => ({
        job_id: j.job_id,
        title: j.title,
        similarity: (j.similarity || 0).toFixed(3),
      })),
    );

    return res.json({
      message: `AI วิเคราะห์ว่าคุณเหมาะกับงานแนว “${tag}”`,
      jobs: ranked,
    });
  } catch (err) {
    console.error("❌ Error in /api/match:", err);
    return res.status(500).json({
      error: "Internal error",
      detail: DEBUG_JSON ? err.message : undefined,
    });
  }
});

/* ---------- /api/chatbot ---------- */
app.post("/api/chatbot", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) {
      return res.json({
        reply: "พิมพ์บอกผมหน่อยว่ากำลังหางานแนวไหนครับ",
        jobs: [],
      });
    }

    let tag = detectRuleIntent(message);
    let confidence = 1.0;
    if (!tag) {
      const emb = await detectEmbeddingIntent(message);
      tag = emb.tag;
      confidence = emb.conf;
      if (confidence < 0.35) tag = "ไม่ระบุ";
    }

    // ✅ ใช้ MySQL Query
    const [jobs] = await pool.query(
      "SELECT job_id, title, description FROM jobs WHERE status_code='OPEN'",
    );
    const jobList = tag === "ไม่ระบุ" ? jobs : filterJobsByCategory(jobs, tag);

    const qvec = toArray((await embedder(message))[0]);
    const jvecs = await Promise.all(
      jobList.map((j) => embedder(`${j.title} ${j.description || ""}`)),
    );
    const sims = jvecs.map((v) => cosine(qvec, toArray(v[0])));

    const matched = jobList
      .map((j, i) => ({ ...j, score: sims[i] || 0 }))
      .filter((j) => j.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({
      reply:
        tag === "ไม่ระบุ"
          ? `ผมยังไม่แน่ใจหมวดงานจากข้อความนี้ ลองพิมพ์ใหม่เช่น “อยากทำอาหารไทย” หรือ “อยากเขียนเว็บ”`
          : `จากสิ่งที่คุณพิมพ์มา ผมคิดว่าคุณสนใจงานแนว “${tag}” (ความมั่นใจ ${(
              confidence * 100
            ).toFixed(1)}%) 🔎`,
      jobs: matched,
    });
  } catch (err) {
    console.error("❌ Error in /api/chatbot:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Run ---------- */
const PORT = process.env.AI_PORT ? Number(process.env.AI_PORT) : 5001;
console.log(
  "FASTGIG AI v2.3 (MySQL Edition) — Debug Mode Enabled:",
  new Date().toLocaleString(),
);
app.listen(PORT, () =>
  console.log(`FastGig AI Service running at http://localhost:${PORT}`),
);
