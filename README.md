# Onomastika — Xalqaro elektron ilmiy jurnal sayti

Qarshi davlat universiteti "Onomastika" jurnali uchun to'liq ishlaydigan veb-sayt:
**backend** (markazlashgan ma'lumotlar) + **frontend** (statik sayt).

Avval sayt faqat bitta brauzerda (`localStorage`) ishlardi — admin qo'shgan
yangilikni boshqalar ko'rmasdi. Endi barcha ma'lumot **markaziy backendda**
saqlanadi, shuning uchun sayt **hamma uchun bir xil** ishlaydi.

```
onomastika/
├── backend/      → Node.js + Express API (Render'ga deploy qilinadi)
├── frontend/     → Statik sayt: index.html + config.js (Netlify'ga deploy qilinadi)
├── render.yaml   → Render Blueprint (backend + bepul Postgres)
└── _static.cjs   → Lokal sinov uchun kichik statik server
```

**Imkoniyatlar:** yangiliklar (rasm bilan), jurnal arxivi (PDF yuklab olish),
maqola murojaatlari (fayl bilan), admin panel (parol bilan), ticker xabarlari,
3 til (UZ/EN/RU), ixtiyoriy email bildirishnomalar.

---

## 1. Lokal ishga tushirish (sinov uchun)

**Talab:** Node.js 18+.

```bash
# 1) Backend
cd backend
npm install
npm start          # http://localhost:5000 da ishlaydi (DATABASE_URL bo'lmasa JSON faylga yozadi)

# 2) Frontend (yangi terminalda, loyiha ildizida)
node _static.cjs   # http://localhost:8080
```

Brauzerda `http://localhost:8080` ni oching. Admin panel: saytni oching va
**footerdagi "© 2025 Onomastika" yozuviga 5 marta bosing** (yoki URL'ga `#admin`
qo'shing). Standart parol: **`onomastika2025`**.

---

## 2. GitHub'ga yuklash

```bash
git add .
git commit -m "Onomastika: backend + frontend"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI/onomastika.git
git push -u origin main
```

---

## 3. Backend'ni Render'ga deploy qilish

Eng oson yo'l — **Blueprint** (`render.yaml` avtomatik o'qiladi, Postgres ham yaratiladi):

1. [render.com](https://render.com) ga kiring → **New → Blueprint**.
2. GitHub reponi tanlang. Render `render.yaml` ni topadi va ko'rsatadi:
   - `onomastika-db` — bepul PostgreSQL
   - `onomastika-api` — backend
3. So'ralganda quyidagilarni kiriting (yoki bo'sh qoldiring):
   - **ADMIN_PASSWORD** — admin paroli (bo'sh qolsa: `onomastika2025`)
   - **CORS_ORIGIN** — hozircha bo'sh qoldiring (Netlify URL'ini keyin qo'shamiz)
4. **Apply** → bir necha daqiqada tayyor bo'ladi.
5. Backend manzilini nusxalang, masalan: `https://onomastika-api.onrender.com`.

> Tekshirish: `https://onomastika-api.onrender.com/` ochilsa `{"status":"ok", ...}` chiqadi.

> ⚠️ **Eslatma:** Render bepul tarifida server bir muddat ishlatilmasa "uyquga"
> ketadi — birinchi so'rov 30–50 soniya sekin bo'lishi mumkin. Bepul Postgres
> ham muddat bilan cheklangan; jiddiy foydalanish uchun pulli tarifga o'tish tavsiya etiladi.

### Muhit o'zgaruvchilari (Render → Environment)

| O'zgaruvchi | Majburiy | Izoh |
|---|---|---|
| `DATABASE_URL` | ✅ (Blueprint avtomatik) | PostgreSQL ulanish satri |
| `JWT_SECRET` | ✅ (Blueprint avtomatik) | Tokenlar uchun maxfiy kalit |
| `ADMIN_PASSWORD` | — | Boshlang'ich admin paroli |
| `CORS_ORIGIN` | tavsiya | Frontend manzili (Netlify URL). Bo'sh = hammaga ruxsat |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | — | Email yuborish uchun (ixtiyoriy) |
| `MAIL_FROM`, `ADMIN_EMAIL` | — | Email jo'natuvchi va admin manzili |

---

## 4. Frontend'ni Netlify'ga deploy qilish

1. **Backend manzilini yozing:** `frontend/config.js` faylini oching va
   `PRODUCTION_API` ni Render manzilingizga almashtiring:
   ```js
   var PRODUCTION_API = 'https://onomastika-api.onrender.com';
   ```
   O'zgarishni commit qilib push qiling.

2. [netlify.com](https://netlify.com) ga kiring → **Add new site → Import an existing project**.
3. GitHub reponi tanlang. Sozlamalar:
   - **Base directory:** `frontend`
   - **Publish directory:** `frontend`
   - **Build command:** bo'sh qoldiring
4. **Deploy** → sayt manzilini oling, masalan `https://onomastika.netlify.app`.

5. **CORS'ni yangilang:** Render → `onomastika-api` → Environment →
   `CORS_ORIGIN` ga Netlify manzilingizni qo'ying (masalan
   `https://onomastika.netlify.app`) va saqlang.

Tayyor! 🎉

---

## 5. Admin paneldan foydalanish

- **Kirish:** footerga 5 marta bosing yoki `…/#admin`. Parol bilan kiring.
- **Yangiliklar:** qo'shish/tahrirlash/o'chirish, rasm yuklash, qoralama/nashr.
- **Arxiv:** har bir son uchun PDF yuklash (foydalanuvchilar yuklab oladi).
- **Murojaatlar:** kelgan maqola/savollar, fayllar, javob yozish.
- **Sozlamalar:** ticker xabarlari, tahririyat email, parolni o'zgartirish.

**Parolni albatta o'zgartiring:** Sozlamalar → Parolni o'zgartirish.

---

## 6. Email (ixtiyoriy)

Email **sozlanmasa ham sayt ishlaydi** — murojaatlar admin panelda ko'rinadi.
Email yoqsangiz: yangi murojaatda adminga xabar boradi va admin javoblari
foydalanuvchiga yuboriladi. Render → Environment ga SMTP ma'lumotlarini qo'shing
(masalan Gmail App Password): `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`,
`SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_EMAIL`.
