const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDb, UPLOADS_DIR } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const THUMB_SIZE = 200;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp)'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không có file được tải lên' });
    }

    const db = await getDb();
    const { filename, originalname, mimetype, size } = req.file;

    db.run(
      "INSERT INTO images (user_id, filename, original_name, mimetype, size) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, filename, originalname, mimetype, size]
    );
    saveDb();

    const result = db.exec("SELECT last_insert_rowid()");
    const imageId = result[0].values[0][0];

    const filepath = path.join(UPLOADS_DIR, filename);
    const metadata = await sharp(filepath).metadata();

    db.run(
      "UPDATE images SET width = ?, height = ? WHERE id = ?",
      [metadata.width, metadata.height, imageId]
    );
    saveDb();

    res.status(201).json({
      success: true,
      data: {
        id: imageId,
        originalName: originalname,
        width: metadata.width,
        height: metadata.height,
        size,
        mimetype,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi xử lý ảnh: ' + err.message });
  }
});

router.get('/gallery', auth, async (req, res) => {
  try {
    const db = await getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const countStmt = db.prepare("SELECT COUNT(*) as total FROM images WHERE user_id = ?");
    countStmt.bind([req.user.userId]);
    countStmt.step();
    const countRow = countStmt.getAsObject();
    const total = countRow.total;
    countStmt.free();

    const stmt = db.prepare(
      "SELECT id, original_name, width, height, size, mimetype, created_at FROM images WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    );
    stmt.bind([req.user.userId, limit, offset]);

    const images = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      images.push({
        id: row.id,
        originalName: row.original_name,
        width: row.width,
        height: row.height,
        size: row.size,
        mimetype: row.mimetype,
        createdAt: row.created_at,
        thumbnailUrl: `/api/images/${row.id}/thumbnail`,
      });
    }
    stmt.free();

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        images,
        total,
        page,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const imageId = parseInt(req.params.id);

    const stmt = db.prepare("SELECT * FROM images WHERE id = ?");
    stmt.bind([imageId]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    const image = stmt.getAsObject();
    stmt.free();

    if (image.user_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập ảnh này' });
    }

    res.json({
      success: true,
      data: {
        id: image.id,
        userId: image.user_id,
        filename: image.filename,
        originalName: image.original_name,
        mimetype: image.mimetype,
        size: image.size,
        width: image.width,
        height: image.height,
        createdAt: image.created_at,
        fileUrl: `/api/images/${image.id}/file`,
        thumbnailUrl: `/api/images/${image.id}/thumbnail`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/file', async (req, res) => {
  try {
    const db = await getDb();
    const imageId = parseInt(req.params.id);

    const stmt = db.prepare("SELECT filename, mimetype FROM images WHERE id = ?");
    stmt.bind([imageId]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    const image = stmt.getAsObject();
    stmt.free();

    const filepath = path.join(UPLOADS_DIR, image.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: 'File không tồn tại' });
    }

    res.setHeader('Content-Type', image.mimetype);
    res.sendFile(filepath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/thumbnail', async (req, res) => {
  try {
    const db = await getDb();
    const imageId = parseInt(req.params.id);

    const stmt = db.prepare("SELECT filename, mimetype FROM images WHERE id = ?");
    stmt.bind([imageId]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    const image = stmt.getAsObject();
    stmt.free();

    const originalPath = path.join(UPLOADS_DIR, image.filename);
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ success: false, message: 'File không tồn tại' });
    }

    res.setHeader('Content-Type', image.mimetype);
    res.sendFile(originalPath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
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
