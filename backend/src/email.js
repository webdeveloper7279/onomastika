// Ixtiyoriy email yuborish (nodemailer orqali SMTP).
// SMTP_* o'zgaruvchilari to'ldirilmasa — email o'chiq, sayt baribir ishlayveradi.
import nodemailer from 'nodemailer';

let transporter = null;
let enabled = false;

export function initEmail() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    enabled = false;
    return;
  }
  const port = parseInt(SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, aks holda STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  enabled = true;
}

export function emailEnabled() {
  return enabled;
}

export async function sendMail({ to, subject, text, html, replyTo }) {
  if (!enabled) return { sent: false, reason: 'email-disabled' };
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, text, html, replyTo });
  return { sent: true };
}
