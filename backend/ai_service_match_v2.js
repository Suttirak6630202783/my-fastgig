// ai_service_match_v2.js
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Database ----------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// ---------- Load Model ----------
console.log("⏳ Loading multilingual model...");
const embedder = await pipeline(
  "feature-extraction",
  "Xenova/distiluse-base-multilingual-cased-v2"
);
console.log("✅ Model loaded successfully!");

// ---------- Utilities ----------
function normalize(text = "") {
  return text.toString().trim().toLowerCase().replace(/\s+/g, " ");
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
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ---------- หมวดงานหลัก ----------
const CATS = [
  { tag: "อาหาร", kws: ["อาหาร","เชฟ","แม่ครัว","ครัว","ทำอาหาร","กุ๊ก","จัดเลี้ยง"] },
  { tag: "ก่อสร้าง/ช่าง", kws: ["ช่าง","ก่อสร้าง","ทาสี","ซ่อม","ไฟฟ้า","ประปา","เหล็ก","ไม้"] },
  { tag: "ขนย้ายของ", kws: ["ขนของ","ย้ายบ้าน","ยกของ","ขนย้าย","แบกของ","ขนของหนัก"] },
  { tag: "ทำความสะอาด", kws: ["แม่บ้าน","ทำความสะอาด","ล้างจาน","ซักผ้า","กวาดถู","เช็ด"] },
  { tag: "สอนหนังสือ", kws: ["สอน","ติวเตอร์","ครู","กวดวิชา","สอนพิเศษ","ติว"] },
  { tag: "ไอที/เขียนโปรแกรม", kws: ["เขียนโปรแกรม","โค้ด","นักพัฒนา","ทำเว็บ","เว็บไซต์","แอป","เทคโนโลยี"] },
  { tag: "ขาย/บริการลูกค้า", kws: ["ขาย","แคชเชียร์","บริการ","ลูกค้า","เซลล์","หน้าร้าน"] },
];

// ---------- วิเคราะห์ skill → หมวดงาน ----------
async function analyzeUserSkill(skillText) {
  if (!skillText) return { tag: "ไม่ระบุ", conf: 0 };

  const userVec = toArray((await embedder(normalize(skillText)))[0]);
  const catVecs = await Promise.all(CATS.map(c => embedder(c.kws.join(" "))));
  const sims = catVecs.map(v => cosine(userVec, toArray(v[0])));
  const idx = sims.indexOf(Math.max(...sims));
  const conf = Math.max(...sims);

  return { tag: CATS[idx].tag, conf };
}

// ---------- Filter งานตามหมวด ----------
function filterJobsByCat(jobs, tag) {
  const cat = CATS.find(c => c.tag === tag);
  if (!cat) return jobs;
  const kws = cat.kws.map(normalize);
  const result = jobs.filter(j => {
    const t = normalize(`${j.title} ${j.description}`);
    return kws.some(kw => t.includes(kw));
  });
  return result.length ? result : jobs;
}

// ---------- AI Matching ----------
app.post("/api/match", async (req, res) => {
  try {
    const { user_id } = req.body;
    const [[user]] = await pool.query("SELECT skills FROM users WHERE user_id=?", [user_id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const userSkill = user.skills;
    const [jobs] = await pool.query("SELECT job_id, title, description FROM jobs WHERE status_code='OPEN'");

    // วิเคราะห์ skill → หมวดงาน
    const { tag, conf } = await analyzeUserSkill(userSkill);
    console.log(`🧠 User skill: ${userSkill} → หมวด ${tag} (conf=${(conf*100).toFixed(1)}%)`);

    // ดึงเฉพาะงานหมวดนั้นก่อน
    const candidate = filterJobsByCat(jobs, tag);

    // Embedding user skill และงาน
    const uvec = toArray((await embedder(userSkill))[0]);
    const jvecs = await Promise.all(candidate.map(j => embedder(`${j.title} ${j.description}`)));
    const sims = jvecs.map(v => cosine(uvec, toArray(v[0])));

    // เรียงคะแนน
    const ranked = candidate
      .map((j, i) => ({ ...j, score: sims[i] }))
      .filter(j => j.score > 0.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({
      message: `AI วิเคราะห์ว่าคุณเหมาะกับงานแนว "${tag}" (ความมั่นใจ ${(conf * 100).toFixed(1)}%) 🔎`,
      jobs: ranked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Run ----------
app.listen(5001, () => console.log("🚀 AI Matching v2 running on http://localhost:5001"));
