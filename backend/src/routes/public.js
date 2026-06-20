// Ochiq (autentifikatsiyasiz) API: yangiliklar, arxiv, ticker, fayllar, murojaat yuborish.
import express from 'express';
import { store } from '../store/index.js';
import { newId } from '../ids.js';
import { getSettings } from '../seed.js';
import { sendMail, emailEnabled } from '../email.js';

export const publicRouter = express.Router();

// ── Yordamchi: dataURL'dan faylni saqlash ──
export async function saveFileFromDataUrl(dataUrl, name, isPublic) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const data = m[2];
  const id = newId();
  await store.insert('files', {
    id,
    mime,
    name: name || 'file',
    size: Math.floor(data.length * 0.75),
    public: !!isPublic,
    data,
    createdAt: Date.now(),
  });
  return id;
}

// Yangilikni mijoz uchun tayyorlash (rasmga URL qo'shamiz).
export function serializeNews(n) {
  if (!n) return n;
  const { ...rest } = n;
  return {
    ...rest,
    imageUrl: n.imageId ? `/api/files/${n.imageId}` : '',
  };
}

// ── Yangiliklar (faqat nashr etilganlari) ──
publicRouter.get('/news', async (req, res) => {
  const news = await store.list('news', { status: 'published' }, {
    sort: { createdAt: -1 },
  });
  res.json(news.map(serializeNews));
});

publicRouter.get('/news/:id', async (req, res) => {
  const n = await store.get('news', req.params.id);
  if (!n || n.status !== 'published') {
    return res.status(404).json({ error: 'Topilmadi' });
  }
  res.json(serializeNews(n));
});

// ── Arxiv (sonlar ro'yxati) ──
publicRouter.get('/arxiv', async (req, res) => {
  const items = await store.list('arxiv', null, { sort: { createdAt: -1 } });
  // Faylning o'zini yubormaymiz, faqat metadata + yuklab olish manzili.
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

// ── Ticker (e'lonlar satri) ──
publicRouter.get('/ticker', async (req, res) => {
  const s = await getSettings();
  res.json({ items: s.ticker || null });
});

// ── Fayl berish (rasm/PDF) ──
publicRouter.get('/files/:id', async (req, res) => {
  const f = await store.get('files', req.params.id);
  if (!f) return res.status(404).json({ error: 'Fayl topilmadi' });
  if (!f.public) return res.status(403).json({ error: 'Ruxsat yo\'q' });
  const buf = Buffer.from(f.data, 'base64');
  res.set('Content-Type', f.mime);
  const disp = req.query.download ? 'attachment' : 'inline';
  res.set(
    'Content-Disposition',
    `${disp}; filename="${encodeURIComponent(f.name)}"`
  );
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(buf);
});

// ── Murojaat yuborish (kontakt forma) ──
publicRouter.post('/submissions', async (req, res) => {
  const { name, email, phone, institute, type, message, file, fileName } =
    req.body || {};
  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ error: 'Ism, email va xabar to\'ldirilishi shart' });
  }

  let fileId = null;
  if (file) {
    fileId = await saveFileFromDataUrl(file, fileName, false);
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const mn = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
  const dateStr =
    now.getDate() + '-' + mn[now.getMonth()] + ' ' + now.getFullYear() +
    ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

  const sub = {
    id: newId(),
    name: String(name).slice(0, 200),
    email: String(email).slice(0, 200),
    phone: phone ? String(phone).slice(0, 100) : '',
    institute: institute ? String(institute).slice(0, 300) : '',
    type: type ? String(type).slice(0, 100) : 'Murojaat',
    message: String(message).slice(0, 5000),
    date: dateStr,
    read: false,
    fileId,
    fileName: fileName || null,
    createdAt: Date.now(),
  };
  await store.insert('submissions', sub);

  // Ixtiyoriy: adminni email orqali ogohlantirish.
  if (emailEnabled()) {
    const s = await getSettings();
    const adminEmail = s.adminEmail || process.env.ADMIN_EMAIL;
    if (adminEmail) {
      sendMail({
        to: adminEmail,
        subject: `Yangi murojaat: ${sub.type} — ${sub.name}`,
        replyTo: sub.email,
        text:
          `Ism: ${sub.name}\nEmail: ${sub.email}\nTelefon: ${sub.phone || '—'}\n` +
          `Muassasa: ${sub.institute || '—'}\nTuri: ${sub.type}\nSana: ${sub.date}\n\n` +
          `Xabar:\n${sub.message}` +
          (sub.fileName ? `\n\nFayl ilova qilingan: ${sub.fileName}` : ''),
      }).catch((e) => console.warn('Email yuborilmadi:', e.message));
    }
  }

  res.status(201).json({ ok: true });
});
