const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'data', 'app.db');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PROCESSED_DIR = path.join(__dirname, 'processed');
const TEMP_DIR = path.join(__dirname, 'temp');

let db = null;
let initPromise = null;

function ensureDirs() {
  const dirs = [
    path.join(__dirname, 'data'),
    UPLOADS_DIR,
    PROCESSED_DIR,
    TEMP_DIR,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    ensureDirs();
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    saveDb();
    return db;
  })();

  return initPromise;
}

async function getDb() {
  if (!db) {
    await initDb();
  }
  return db;
}

async function seedData() {
  const database = await getDb();

  const ensureUser = (email, pass, role) => {
    const res = database.exec(`SELECT id FROM users WHERE email = '${email}'`);
    if (!res.length || !res[0].values.length) {
      const hash = bcrypt.hashSync(pass, 10);
      database.run("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [email, hash, role]);
    }
  };

  ensureUser('admin@pictransform.com', 'admin123', 'admin');
  ensureUser('admin@yoru.com', 'admin123', 'admin');
  ensureUser('member1@test.com', 'member123', 'member');
  ensureUser('member2@test.com', 'member123', 'member');
  ensureUser('test@yoru.com', 'test123', 'member');

  const member1Result = database.exec("SELECT id FROM users WHERE email = 'member1@test.com'");
  const member2Result = database.exec("SELECT id FROM users WHERE email = 'member2@test.com'");
  const testYoruResult = database.exec("SELECT id FROM users WHERE email = 'test@yoru.com'");
  if (!member1Result.length || !member1Result[0].values.length) return;

  const member1Id = member1Result[0].values[0][0];
  const member2Id = member2Result[0].values[0][0];
  const testYoruId = testYoruResult.length && testYoruResult[0].values.length ? testYoruResult[0].values[0][0] : null;

  const imgCheck = database.exec(`SELECT COUNT(*) FROM images WHERE user_id = ${member1Id} AND original_name != 'fake_corrupted.jpg'`);
  const validImgCount = imgCheck.length && imgCheck[0].values.length ? imgCheck[0].values[0][0] : 0;
  if (validImgCount >= 3) {
    return;
  }

  const imageConfigs = [
    { userId: member1Id, w: 800, h: 600, r: 255, g: 0, b: 0, name: 'red-landscape.jpg' },
    { userId: member1Id, w: 640, h: 480, r: 0, g: 128, b: 0, name: 'green-small.jpg' },
    { userId: member1Id, w: 1024, h: 768, r: 0, g: 0, b: 255, name: 'blue-medium.jpg' },
    { userId: member1Id, w: 1920, h: 1080, r: 255, g: 165, b: 0, name: 'orange-fullhd.jpg' },
    { userId: member1Id, w: 3000, h: 600, r: 128, g: 0, b: 128, name: 'purple-panoramic.jpg' },
    { userId: member1Id, w: 500, h: 500, r: 255, g: 255, b: 0, name: 'yellow-square.jpg' },
    { userId: member1Id, w: 300, h: 400, r: 0, g: 255, b: 255, name: 'cyan-portrait.jpg' },
    { userId: member1Id, w: 1200, h: 900, r: 192, g: 192, b: 192, name: 'silver-large.jpg' },
    { userId: member2Id, w: 640, h: 480, r: 255, g: 0, b: 128, name: 'pink-photo.jpg' },
    { userId: member2Id, w: 800, h: 600, r: 64, g: 64, b: 64, name: 'dark-gray.jpg' },
    { userId: member2Id, w: 1024, h: 768, r: 0, g: 100, b: 0, name: 'forest-green.jpg' },
    { userId: member2Id, w: 960, h: 720, r: 139, g: 69, b: 19, name: 'brown-sample.jpg' },
  ];

  if (testYoruId) {
    imageConfigs.push(
      { userId: testYoruId, w: 800, h: 600, r: 230, g: 57, b: 70, name: 'yoru-crimson.jpg' },
      { userId: testYoruId, w: 1920, h: 1080, r: 241, g: 250, b: 238, name: 'yoru-fullhd.jpg' },
      { userId: testYoruId, w: 3000, h: 600, r: 168, g: 218, b: 220, name: 'yoru-panoramic.jpg' },
      { userId: testYoruId, w: 640, h: 480, r: 69, g: 123, b: 157, name: 'yoru-sea.jpg' },
      { userId: testYoruId, w: 1024, h: 768, r: 29, g: 53, b: 87, name: 'yoru-deep-blue.jpg' },
      { userId: testYoruId, w: 500, h: 500, r: 255, g: 209, b: 102, name: 'yoru-yellow.jpg' }
    );
  }

  for (const cfg of imageConfigs) {
    const filename = uuidv4() + '.jpg';
    const filepath = path.join(UPLOADS_DIR, filename);

    const imgBuffer = await sharp({
      create: {
        width: cfg.w,
        height: cfg.h,
        channels: 3,
        background: { r: cfg.r, g: cfg.g, b: cfg.b },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    fs.writeFileSync(filepath, imgBuffer);
    const stats = fs.statSync(filepath);

    database.run(
      "INSERT INTO images (user_id, filename, original_name, mimetype, size, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [cfg.userId, filename, cfg.name, 'image/jpeg', stats.size, cfg.w, cfg.h]
    );
  }

  saveDb();
  console.log('Seed data created successfully');
}

module.exports = {
  getDb,
  seedData,
  saveDb,
  UPLOADS_DIR,
  PROCESSED_DIR,
  TEMP_DIR,
};
