const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const SECRET = "FASTGIG_SECRET"; // แนะนำให้ซ่อนใน .env

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    const [exist] = await db.query("SELECT * FROM Users WHERE email = ?", [email]);
    if (exist.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO Users (username, email, password_hash, phone) VALUES (?, ?, ?, ?)",
      [username, email, hashed, phone]
    );

    res.json({ message: "Register success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query("SELECT * FROM Users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ error: "Invalid email or password" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign({ user_id: user.user_id, email: user.email }, SECRET, { expiresIn: "1h" });

    res.json({ message: "Login success", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
