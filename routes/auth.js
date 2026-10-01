const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDb } = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
    }

    if (password.length < 3) {
      return res.status(400).json({ success: false, message: 'Mật khẩu quá ngắn' });
    }

    const db = await getDb();

    const stmt = db.prepare("SELECT id FROM users WHERE email = ?");
    stmt.bind([email]);
    const exists = stmt.step();
    stmt.free();

    if (exists) {
      return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hashedPassword, 'member']
    );
    saveDb();

    const result = db.exec("SELECT last_insert_rowid()");
    const userId = result[0].values[0][0];

    const token = jwt.sign(
      { userId, email, role: 'member' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: userId, email, role: 'member' },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc' });
    }

    const db = await getDb();

    const stmt = db.prepare("SELECT id, email, password, role FROM users WHERE email = ?");
    stmt.bind([email]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 3) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới quá ngắn' });
    }

    const db = await getDb();

    const stmt = db.prepare("SELECT password FROM users WHERE id = ?");
    stmt.bind([req.user.userId]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const user = stmt.getAsObject();
    stmt.free();

    const isMatch = bcrypt.compareSync(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.user.userId]);
    saveDb();

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
