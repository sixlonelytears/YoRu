const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb, saveDb, UPLOADS_DIR } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(adminOnly);

router.get('/users', async (req, res) => {
  try {
    const db = await getDb();

    const results = db.exec(`
      SELECT 
        u.id,
        u.email,
        u.role,
        u.created_at,
        COUNT(i.id) as image_count
      FROM users u
      LEFT JOIN images i ON u.id = i.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const users = [];
    if (results.length > 0) {
      for (const row of results[0].values) {
        users.push({
          id: row[0],
          email: row[1],
          role: row[2],
          createdAt: row[3],
          imageCount: row[4],
        });
      }
    }

    res.json({ success: true, data: { users } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();

    const userCount = db.exec("SELECT COUNT(*) FROM users");
    const imageCount = db.exec("SELECT COUNT(*) FROM images");
    const storageSize = db.exec("SELECT COALESCE(SUM(size), 0) FROM images");

    res.json({
      success: true,
      data: {
        totalUsers: userCount[0].values[0][0],
        totalImages: imageCount[0].values[0][0],
        totalStorageSize: storageSize[0].values[0][0],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/images/:id', async (req, res) => {
  try {
    const db = await getDb();
    const imageId = parseInt(req.params.id);

    const stmt = db.prepare("SELECT id, filename FROM images WHERE id = ?");
    stmt.bind([imageId]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    const image = stmt.getAsObject();
    stmt.free();

    const filepath = path.join(UPLOADS_DIR, image.filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    db.run("DELETE FROM images WHERE id = ?", [imageId]);
    saveDb();

    res.json({ success: true, message: 'Xóa ảnh thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
