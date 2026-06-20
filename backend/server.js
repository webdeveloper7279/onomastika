import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { store, storeKind } from './src/store/index.js';
import { ensureSettings } from './src/seed.js';
import { initEmail, emailEnabled } from './src/email.js';
import { publicRouter } from './src/routes/public.js';
import { adminRouter } from './src/routes/admin.js';

const app = express();

// ── CORS ──
const origins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: origins.length ? origins : true, // bo'sh bo'lsa — hammaga ruxsat
  })
);

// Base64 fayllar uchun katta limit.
app.use(express.json({ limit: '15mb' }));

// ── Sog'liq tekshiruvi ──
app.get('/', (req, res) => {
  res.json({
    name: 'Onomastika API',
    status: 'ok',
    storage: storeKind,
    email: emailEnabled() ? 'enabled' : 'disabled',
  });
});
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Yo'llar ──
app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'Topilmadi' }));

// Xatolar
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Noto\'g\'ri JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Fayl juda katta (maks 15MB)' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server xatosi' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await store.init();
  await ensureSettings();
  initEmail();
  app.listen(PORT, () => {
    console.log(`✅ Onomastika API ishga tushdi: http://localhost:${PORT}`);
    console.log(`   Ombor: ${storeKind} | Email: ${emailEnabled() ? 'yoqilgan' : 'o\'chiq'}`);
  });
}

start().catch((e) => {
  console.error('❌ Ishga tushirishda xato:', e);
  process.exit(1);
});
