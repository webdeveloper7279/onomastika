// Himoyalangan admin API: login, yangiliklar/arxiv/murojaatlar CRUD, sozlamalar.
import express from 'express';
import { store } from '../store/index.js';
import { newId } from '../ids.js';
import {
  verifyPassword,
  hashPassword,
  createToken,
  requireAuth,
} from '../auth.js';
import { getSettings, SETTINGS_ID } from '../seed.js';
import { sendMail, emailEnabled } from '../email.js';
import { saveFileFromDataUrl, serializeNews } from './public.js';

export const adminRouter = express.Router();

async function deleteFile(fileId) {
  if (fileId) await store.remove('files', fileId);
}

// ── Login ──
adminRouter.post('/login', async (req, res) => {
  const { password } = req.body || {};
  const s = await getSettings();
  if (!password || !verifyPassword(password, s.passwordHash)) {
    return res.status(401).json({ error: 'Parol noto\'g\'ri' });
  }
  res.json({ token: createToken({ role: 'admin' }) });
});

// Token tekshirish (panel ochilganda sessiyani tasdiqlash uchun).
adminRouter.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, emailEnabled: emailEnabled() });
});

// Bundan keyingi hamma yo'llar avtorizatsiya talab qiladi.
adminRouter.use(requireAuth);

// ── Yangiliklar ──
adminRouter.get('/news', async (req, res) => {
  const news = await store.list('news', null, { sort: { createdAt: -1 } });
  res.json(news.map(serializeNews));
});

adminRouter.post('/news', async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.title.trim()) {
    return res.status(400).json({ error: 'Sarlavha shart' });
  }
  let imageId = null;
  if (b.image) imageId = await saveFileFromDataUrl(b.image, b.title, true);

  const now = new Date();
  const mn = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  const item = {
    id: newId(),
    title: b.title.trim(),
    field: b.field || 'Onomastika',
    icon: b.icon || '📰',
    imageId,
    excerpt: (b.excerpt || '').trim(),
    body: (b.body || '').trim(),
    issue: (b.issue || '').trim(),
    author: (b.author || '').trim(),
    status: b.status === 'draft' ? 'draft' : 'published',
    date: now.getDate() + '-' + mn[now.getMonth()] + ' ' + now.getFullYear(),
    createdAt: Date.now(),
  };
  await store.insert('news', item);
  res.status(201).json(serializeNews(item));
});

adminRouter.put('/news/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await store.get('news', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topilmadi' });

  let imageId = existing.imageId || null;
  if (b.image) {
    // Yangi rasm yuklandi — eskisini o'chiramiz.
    await deleteFile(existing.imageId);
    imageId = await saveFileFromDataUrl(b.image, b.title || existing.title, true);
  } else if (b.keepImage === false) {
    // Rasm olib tashlandi.
    await deleteFile(existing.imageId);
    imageId = null;
  }

  const patch = {
    title: (b.title || existing.title).trim(),
    field: b.field || existing.field,
    icon: b.icon || existing.icon,
    imageId,
    excerpt: (b.excerpt ?? existing.excerpt ?? '').trim(),
    body: (b.body ?? existing.body ?? '').trim(),
    issue: (b.issue ?? existing.issue ?? '').trim(),
    author: (b.author ?? existing.author ?? '').trim(),
    status: b.status === 'draft' ? 'draft' : 'published',
  };
  const updated = await store.update('news', req.params.id, patch);
  res.json(serializeNews(updated));
});

adminRouter.delete('/news/:id', async (req, res) => {
  const existing = await store.get('news', req.params.id);
  if (existing) {
    await deleteFile(existing.imageId);
    await store.remove('news', req.params.id);
  }
  res.json({ ok: true });
});

// ── Arxiv ──
adminRouter.get('/arxiv', async (req, res) => {
  const items = await store.list('arxiv', null, { sort: { createdAt: -1 } });
  res.json(
    items.map((p) => ({
      id: p.id,
      year: p.year,
      num: p.num,
      filename: p.filename,
      fileUrl: p.fileId ? `/api/files/${p.fileId}?download=1` : '',
    }))
  );
});

adminRouter.post('/arxiv', async (req, res) => {
  const { year, num, pdf, filename } = req.body || {};
  if (!year || !num) {
    return res.status(400).json({ error: 'Yil va son shart' });
  }
  if (!pdf) return res.status(400).json({ error: 'PDF fayl shart' });
  const name = filename || `onomastika_${year}_${num}.pdf`;
  const fileId = await saveFileFromDataUrl(pdf, name, true);
  if (!fileId) return res.status(400).json({ error: 'PDF noto\'g\'ri formatda' });
  const item = {
    id: newId(),
    year: parseInt(year, 10),
    num: String(num),
    fileId,
    filename: name,
    createdAt: Date.now(),
  };
  await store.insert('arxiv', item);
  res.status(201).json({ id: item.id, year: item.year, num: item.num, filename: item.filename });
});

adminRouter.delete('/arxiv/:id', async (req, res) => {
  const existing = await store.get('arxiv', req.params.id);
  if (existing) {
    await deleteFile(existing.fileId);
    await store.remove('arxiv', req.params.id);
  }
  res.json({ ok: true });
});

// ── Murojaatlar ──
adminRouter.get('/submissions', async (req, res) => {
  const subs = await store.list('submissions', null, { sort: { createdAt: -1 } });
  // Fayl base64'ni ro'yxatda yubormaymiz — faqat bor-yo'qligini.
  res.json(
    subs.map((s) => ({
      ...s,
      hasFile: !!s.fileId,
      fileUrl: s.fileId ? `/api/admin/submissions/${s.id}/file` : '',
    }))
  );
});

adminRouter.patch('/submissions/:id', async (req, res) => {
  const patch = {};
  if (typeof req.body?.read === 'boolean') patch.read = req.body.read;
  const updated = await store.update('submissions', req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ ok: true });
});

adminRouter.delete('/submissions/:id', async (req, res) => {
  const existing = await store.get('submissions', req.params.id);
  if (existing) {
    await deleteFile(existing.fileId);
    await store.remove('submissions', req.params.id);
  }
  res.json({ ok: true });
});

adminRouter.get('/submissions/:id/file', async (req, res) => {
  const s = await store.get('submissions', req.params.id);
  if (!s || !s.fileId) return res.status(404).json({ error: 'Fayl yo\'q' });
  const f = await store.get('files', s.fileId);
  if (!f) return res.status(404).json({ error: 'Fayl topilmadi' });
  res.set('Content-Type', f.mime);
  res.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(f.name)}"`
  );
  res.send(Buffer.from(f.data, 'base64'));
});

// ── Sozlamalar ──
adminRouter.get('/settings', async (req, res) => {
  const s = await getSettings();
  res.json({
    ticker: s.ticker || null,
    adminEmail: s.adminEmail || '',
    emailEnabled: emailEnabled(),
  });
});

adminRouter.put('/settings', async (req, res) => {
  const patch = {};
  if (Array.isArray(req.body?.ticker)) {
    const items = req.body.ticker.map((t) => String(t).trim()).filter(Boolean);
    patch.ticker = items.length ? items : null;
  } else if (req.body?.ticker === null) {
    patch.ticker = null;
  }
  if (typeof req.body?.adminEmail === 'string') {
    patch.adminEmail = req.body.adminEmail.trim();
  }
  await store.update('settings', SETTINGS_ID, patch);
  res.json({ ok: true });
});

// ── Parol o'zgartirish ──
adminRouter.post('/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  const s = await getSettings();
  if (!verifyPassword(oldPassword || '', s.passwordHash)) {
    return res.status(400).json({ error: 'Joriy parol noto\'g\'ri' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgi' });
  }
  await store.update('settings', SETTINGS_ID, {
    passwordHash: hashPassword(newPassword),
  });
  res.json({ ok: true });
});

// ── Javob yuborish (email) ──
adminRouter.post('/reply', async (req, res) => {
  const { to, subject, body } = req.body || {};
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'To\'liq ma\'lumot kiriting' });
  }
  if (!emailEnabled()) {
    return res.json({ sent: false, reason: 'email-disabled' });
  }
  try {
    await sendMail({ to, subject, text: body });
    res.json({ sent: true });
  } catch (e) {
    res.status(502).json({ sent: false, error: e.message });
  }
});
