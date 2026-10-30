const { getDb, saveDb, UPLOADS_DIR } = require('./db');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

(async () => {
  const db = await getDb();
  // Remove corrupted test images from previous test runs
  db.run("DELETE FROM images WHERE original_name = 'fake_corrupted.jpg'");
  
  const m1 = db.exec("SELECT id FROM users WHERE email = 'member1@test.com'");
  const member1Id = m1[0].values[0][0];

  const configs = [
    { userId: member1Id, w: 800, h: 600, r: 255, g: 0, b: 0, name: 'red-landscape.jpg' },
    { userId: member1Id, w: 640, h: 480, r: 0, g: 128, b: 0, name: 'green-small.jpg' },
    { userId: member1Id, w: 1024, h: 768, r: 0, g: 0, b: 255, name: 'blue-medium.jpg' },
    { userId: member1Id, w: 1920, h: 1080, r: 255, g: 165, b: 0, name: 'orange-fullhd.jpg' },
    { userId: member1Id, w: 3000, h: 600, r: 128, g: 0, b: 128, name: 'purple-panoramic.jpg' },
    { userId: member1Id, w: 500, h: 500, r: 255, g: 255, b: 0, name: 'yellow-square.jpg' },
    { userId: member1Id, w: 300, h: 400, r: 0, g: 255, b: 255, name: 'cyan-portrait.jpg' },
    { userId: member1Id, w: 1200, h: 900, r: 192, g: 192, b: 192, name: 'silver-large.jpg' }
  ];

  for (const cfg of configs) {
    const filename = uuidv4() + '.jpg';
    const filepath = path.join(UPLOADS_DIR, filename);
    const buf = await sharp({
      create: { width: cfg.w, height: cfg.h, channels: 3, background: { r: cfg.r, g: cfg.g, b: cfg.b } }
    }).jpeg({ quality: 80 }).toBuffer();
    fs.writeFileSync(filepath, buf);
    db.run(
      'INSERT INTO images (user_id, filename, original_name, mimetype, size, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cfg.userId, filename, cfg.name, 'image/jpeg', buf.length, cfg.w, cfg.h]
    );
  }
  saveDb();
  console.log('Successfully reseeded sample images for Member 1');
})();
