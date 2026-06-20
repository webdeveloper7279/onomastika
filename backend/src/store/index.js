// DATABASE_URL bo'lsa — PostgreSQL, bo'lmasa — lokal JSON fayl.
import { jsonStore } from './jsonStore.js';
import { pgStore } from './pgStore.js';

const usePg = !!process.env.DATABASE_URL;
export const store = usePg ? pgStore : jsonStore;
export const storeKind = usePg ? 'postgres' : 'json-file';
