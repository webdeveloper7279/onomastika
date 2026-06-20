// Oddiy JSON-fayl ombori — lokal ishlab chiqish/sinov uchun.
// Production'da DATABASE_URL berilsa pgStore ishlatiladi.
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

let cache = null;
let writing = Promise.resolve();

async function load() {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    cache = JSON.parse(raw);
  } catch {
    cache = {};
  }
  return cache;
}

async function persist() {
  // Yozishlarni ketma-ket qilish (race oldini olish).
  writing = writing.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(cache, null, 2), 'utf8');
  });
  return writing;
}

function matches(doc, filter) {
  if (!filter) return true;
  return Object.keys(filter).every((k) => doc[k] === filter[k]);
}

function sortDocs(docs, sort) {
  if (!sort) return docs;
  const [field, dir] = Object.entries(sort)[0];
  const m = dir < 0 ? -1 : 1;
  return docs.slice().sort((a, b) => {
    if (a[field] === b[field]) return 0;
    return (a[field] > b[field] ? 1 : -1) * m;
  });
}

export const jsonStore = {
  async init() {
    await load();
  },

  async list(collection, filter, opts = {}) {
    const db = await load();
    let docs = (db[collection] || []).filter((d) => matches(d, filter));
    docs = sortDocs(docs, opts.sort);
    if (opts.limit) docs = docs.slice(0, opts.limit);
    // Chuqur nusxa qaytaramiz (tashqarida o'zgartirib qo'ymaslik uchun).
    return docs.map((d) => ({ ...d }));
  },

  async get(collection, id) {
    const db = await load();
    const doc = (db[collection] || []).find((d) => d.id === id);
    return doc ? { ...doc } : null;
  },

  async findOne(collection, filter) {
    const db = await load();
    const doc = (db[collection] || []).find((d) => matches(d, filter));
    return doc ? { ...doc } : null;
  },

  async insert(collection, doc) {
    const db = await load();
    if (!db[collection]) db[collection] = [];
    db[collection].push(doc);
    await persist();
    return { ...doc };
  },

  async update(collection, id, patch) {
    const db = await load();
    const arr = db[collection] || [];
    const idx = arr.findIndex((d) => d.id === id);
    if (idx < 0) return null;
    arr[idx] = { ...arr[idx], ...patch };
    await persist();
    return { ...arr[idx] };
  },

  async remove(collection, id) {
    const db = await load();
    const arr = db[collection] || [];
    const before = arr.length;
    db[collection] = arr.filter((d) => d.id !== id);
    if (db[collection].length === before) return false;
    await persist();
    return true;
  },
};
