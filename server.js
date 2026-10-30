const express = require('express');
const path = require('path');
const { getDb, seedData, saveDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');
const transformRoutes = require('./routes/transform');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/transform', transformRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err.message);
  res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
});

// Render Free Tier 24/7 Keep-Alive Worker
// Automatically pings /api/health every 10 minutes to prevent Render from sleeping
function initKeepAliveWorker() {
  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  if (!externalUrl) return;

  const pingInterval = 10 * 60 * 1000; // 10 minutes
  console.log(`[Keep-Alive] Initialized self-ping service for: ${externalUrl}`);

  setInterval(async () => {
    try {
      const pingUrl = `${externalUrl}/api/health`;
      const res = await fetch(pingUrl);
      if (res.ok) {
        console.log(`[Keep-Alive] Successfully pinged ${pingUrl} at ${new Date().toISOString()}`);
      }
    } catch (err) {
      console.warn(`[Keep-Alive] Ping warning: ${err.message}`);
    }
  }, pingInterval);
}

async function start() {
  try {
    await getDb();
    console.log('Database initialized');

    await seedData();
    console.log('Seed data ready');

    app.listen(PORT, () => {
      console.log(`PicTransform Studio server running on port ${PORT}`);
      initKeepAliveWorker();
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('Shutting down...');
  saveDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  saveDb();
  process.exit(0);
});

start();
