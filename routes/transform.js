const express = require('express');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDb, UPLOADS_DIR, PROCESSED_DIR } = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/processed/:processedId', async (req, res) => {
  try {
    const { processedId } = req.params;

    const files = fs.readdirSync(PROCESSED_DIR);
    const found = files.find(f => f.startsWith(processedId));

    if (!found) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh đã xử lý' });
    }

    const filepath = path.join(PROCESSED_DIR, found);
    res.sendFile(filepath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use(auth);

async function getImagePath(imageId, userId, processedId) {
  if (processedId) {
    if (fs.existsSync(PROCESSED_DIR)) {
      const files = fs.readdirSync(PROCESSED_DIR);
      const found = files.find(f => f.startsWith(processedId));
      if (found) {
        return path.join(PROCESSED_DIR, found);
      }
    }
  }
  const db = await getDb();
  const stmt = db.prepare("SELECT filename, user_id FROM images WHERE id = ?");
  stmt.bind([imageId]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const image = stmt.getAsObject();
  stmt.free();

  if (image.user_id !== userId) {
    return null;
  }

  return path.join(UPLOADS_DIR, image.filename);
}

async function saveProcessedImage(buffer, format) {
  const processedId = uuidv4();
  const ext = format || 'jpg';
  const filename = processedId + '.' + ext;
  const filepath = path.join(PROCESSED_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  const stats = fs.statSync(filepath);
  return { processedId, filename, filepath, size: stats.size };
}

router.post('/resize', async (req, res) => {
  try {
    const { imageId, processedId: currentProcessedId, width, height, keepAspectRatio } = req.body;

    const imagePath = await getImagePath(imageId, req.user.userId, currentProcessedId);
    if (!imagePath) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    let result;
    if (keepAspectRatio) {
      result = await sharp(imagePath)
        .resize(parseInt(width), parseInt(height), { fit: 'inside' })
        .toBuffer({ resolveWithObject: true });
    } else {
      result = await sharp(imagePath)
        .resize(parseInt(height), parseInt(width), { fit: 'fill' })
        .toBuffer({ resolveWithObject: true });
    }

    const { processedId, size } = await saveProcessedImage(result.data, result.info.format);

    res.json({
      success: true,
      data: {
        processedId,
        width: result.info.width,
        height: result.info.height,
        size,
        format: result.info.format,
        previewUrl: `/api/transform/processed/${processedId}`,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.post('/crop', async (req, res) => {
  try {
    const { imageId, processedId: currentProcessedId, x, y, width, height } = req.body;

    const imagePath = await getImagePath(imageId, req.user.userId, currentProcessedId);
    if (!imagePath) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    const result = await sharp(imagePath)
      .extract({ left: parseInt(x), top: parseInt(y), width: parseInt(width), height: parseInt(height) })
      .toBuffer({ resolveWithObject: true });

    const { processedId, size } = await saveProcessedImage(result.data, result.info.format);

    res.json({
      success: true,
      data: {
        processedId,
        width: result.info.width,
        height: result.info.height,
        size,
        format: result.info.format,
        previewUrl: `/api/transform/processed/${processedId}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rotate', async (req, res) => {
  try {
    const { imageId, processedId: currentProcessedId, angle } = req.body;

    const validAngles = [90, 180, 270];
    if (!validAngles.includes(parseInt(angle))) {
      return res.status(400).json({ success: false, message: 'Góc xoay phải là 90, 180 hoặc 270' });
    }

    const imagePath = await getImagePath(imageId, req.user.userId, currentProcessedId);
    if (!imagePath) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    const rotateAngle = 360 - parseInt(angle);

    const result = await sharp(imagePath)
      .rotate(rotateAngle)
      .toBuffer({ resolveWithObject: true });

    const { processedId, size } = await saveProcessedImage(result.data, result.info.format);

    res.json({
      success: true,
      data: {
        processedId,
        width: result.info.width,
        height: result.info.height,
        size,
        format: result.info.format,
        previewUrl: `/api/transform/processed/${processedId}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/flip', async (req, res) => {
  try {
    const { imageId, processedId: currentProcessedId, direction } = req.body;

    if (!['horizontal', 'vertical'].includes(direction)) {
      return res.status(400).json({ success: false, message: 'Hướng lật phải là horizontal hoặc vertical' });
    }

    const imagePath = await getImagePath(imageId, req.user.userId, currentProcessedId);
    if (!imagePath) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    let pipeline = sharp(imagePath);
    if (direction === 'vertical') {
      pipeline = pipeline.flip();
    } else {
      pipeline = pipeline.flop();
    }

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    const { processedId, size } = await saveProcessedImage(result.data, result.info.format);

    res.json({
      success: true,
      data: {
        processedId,
        width: result.info.width,
        height: result.info.height,
        size,
        format: result.info.format,
        previewUrl: `/api/transform/processed/${processedId}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/filter', async (req, res) => {
  try {
    const { imageId, processedId: currentProcessedId, filter } = req.body;

    const validFilters = ['grayscale', 'sepia', 'blur'];
    if (!validFilters.includes(filter)) {
      return res.status(400).json({ success: false, message: 'Bộ lọc không hợp lệ (grayscale, sepia, blur)' });
    }

    const imagePath = await getImagePath(imageId, req.user.userId, currentProcessedId);
    if (!imagePath) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    let result;

    if (filter === 'grayscale') {
      // chuyển đổi thủ công để kiểm soát chất lượng tốt hơn
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { data: rawBuffer, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixelCount = info.width * info.height;
      const outputBuffer = Buffer.alloc(pixelCount * 3);

      for (let i = 0; i < pixelCount; i++) {
        const offset = i * info.channels;
        const r = rawBuffer[offset];
        const g = rawBuffer[offset + 1];
        const b = rawBuffer[offset + 2];
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        outputBuffer[i * 3] = gray;
        outputBuffer[i * 3 + 1] = gray;
        outputBuffer[i * 3 + 2] = gray;
      }

      result = await sharp(outputBuffer, {
        raw: { width: info.width, height: info.height, channels: 3 },
      })
        .jpeg({ quality: 90 })
        .toBuffer({ resolveWithObject: true });
    } else if (filter === 'sepia') {
      result = await sharp(imagePath)
        .tint({ r: 112, g: 66, b: 20 })
        .toBuffer({ resolveWithObject: true });
    } else if (filter === 'blur') {
      result = await sharp(imagePath)
        .blur(5)
        .toBuffer({ resolveWithObject: true });
    }

    const { processedId, size } = await saveProcessedImage(result.data, result.info.format);

    res.json({
      success: true,
      data: {
        processedId,
        width: result.info.width,
        height: result.info.height,
        size,
        format: result.info.format,
        previewUrl: `/api/transform/processed/${processedId}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/watermark', async (req, res) => {
  try {
    const { imageId, processedId: currentProcessedId, text, color, position } = req.body;

    const imagePath = await getImagePath(imageId, req.user.userId, currentProcessedId);
    if (!imagePath) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
    }

    const watermarkColor = color || '#ffffff';
    const watermarkPosition = position || 'bottom-right';

    const metadata = await sharp(imagePath).metadata();
    const fontSize = Math.max(18, Math.floor(metadata.width / 25));
    const marginX = Math.max(24, Math.floor(metadata.width * 0.04));
    const marginY = Math.max(24, Math.floor(metadata.height * 0.04));

    let textX = '50%';
    let textY = '50%';
    let textAnchor = 'middle';
    let dominantBaseline = 'middle';

    if (watermarkPosition === 'top-left') {
      textX = `${marginX}`;
      textY = `${marginY + fontSize}`;
      textAnchor = 'start';
      dominantBaseline = 'auto';
    } else if (watermarkPosition === 'top-right') {
      textX = `${metadata.width - marginX}`;
      textY = `${marginY + fontSize}`;
      textAnchor = 'end';
      dominantBaseline = 'auto';
    } else if (watermarkPosition === 'bottom-left') {
      textX = `${marginX}`;
      textY = `${metadata.height - marginY}`;
      textAnchor = 'start';
      dominantBaseline = 'auto';
    } else if (watermarkPosition === 'bottom-right') {
      textX = `${metadata.width - marginX}`;
      textY = `${metadata.height - marginY}`;
      textAnchor = 'end';
      dominantBaseline = 'auto';
    } else { // center
      textX = '50%';
      textY = '50%';
      textAnchor = 'middle';
      dominantBaseline = 'middle';
    }

    const safeText = String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const svgText = `
      <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
        <text
          x="${textX}" y="${textY}"
          font-size="${fontSize}"
          fill="${watermarkColor}"
          text-anchor="${textAnchor}"
          dominant-baseline="${dominantBaseline}"
          font-family="Arial, sans-serif"
          font-weight="bold"
          opacity="0.85"
        >${safeText}</text>
      </svg>
    `;

    const result = await sharp(imagePath)
      .composite([{
        input: Buffer.from(svgText),
        top: 0,
        left: 0,
      }])
      .toBuffer({ resolveWithObject: true });

    const { processedId, size } = await saveProcessedImage(result.data, result.info.format);

    res.json({
      success: true,
      data: {
        processedId,
        width: result.info.width,
        height: result.info.height,
        size,
        format: result.info.format,
        previewUrl: `/api/transform/processed/${processedId}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { imageId, processedId, format, quality } = req.body;

    let sourcePath;

    if (processedId) {
      const files = fs.readdirSync(PROCESSED_DIR);
      const found = files.find(f => f.startsWith(processedId));
      if (!found) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh đã xử lý' });
      }
      sourcePath = path.join(PROCESSED_DIR, found);
    } else {
      sourcePath = await getImagePath(imageId, req.user.userId);
      if (!sourcePath) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
      }
    }

    const outputFormat = format || 'jpg';
    const outputQuality = parseInt(quality) || 80;

    let pipeline = sharp(sourcePath);

    if (outputFormat === 'jpg' || outputFormat === 'jpeg') {
      pipeline = pipeline.jpeg({ quality: outputQuality });
    } else if (outputFormat === 'png') {
      pipeline = pipeline.png({ quality: outputQuality });
    } else if (outputFormat === 'webp') {
      pipeline = pipeline.webp({ quality: outputQuality });
    }

    const buffer = await pipeline.toBuffer();

    const mimeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };

    res.setHeader('Content-Type', mimeMap[outputFormat] || 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="export.${outputFormat}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

module.exports = router;
