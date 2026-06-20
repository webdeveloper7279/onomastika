// Birinchi ishga tushganda admin sozlamalarini (parol va h.k.) yaratadi.
import { store } from './store/index.js';
import { hashPassword } from './auth.js';

export const SETTINGS_ID = 'main';

export async function ensureSettings() {
  let settings = await store.get('settings', SETTINGS_ID);
  if (!settings) {
    const initialPassword = process.env.ADMIN_PASSWORD || 'onomastika2025';
    settings = {
      id: SETTINGS_ID,
      passwordHash: hashPassword(initialPassword),
      ticker: null, // null bo'lsa frontend o'z standart matnini ko'rsatadi
      adminEmail: process.env.ADMIN_EMAIL || 'xojamurod@list.ru',
      createdAt: Date.now(),
    };
    await store.insert('settings', settings);
    console.log('⚙️  Admin sozlamalari yaratildi (boshlang\'ich parol o\'rnatildi).');
  }
  return settings;
}

export async function getSettings() {
  return (await store.get('settings', SETTINGS_ID)) || (await ensureSettings());
}
