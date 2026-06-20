// PostgreSQL ombori — production (Render Postgres) uchun.
// Hamma hujjatlar bitta `documents` jadvalida JSONB ko'rinishida saqlanadi,
// shu sababli alohida sxema/migratsiya kerak emas.
import pg from 'pg';

const { Pool } = pg;

let pool = null;

function needSsl(url) {
  // Render ichki ulanishida SSL shart emas, tashqi ulanishda kerak.
  // Lokal/oddiy ulanishda o'chiramiz, aks holda sslmode=require qo'shilsa yoqamiz.
  if (/sslmode=disable/.test(url)) return false;
  if (/localhost|127\.0\.0\.1/.test(url)) return false;
  return { rejectUnauthorized: false };
}

export const pgStore = {
  async init() {
    const url = process.env.DATABASE_URL;
    pool = new Pool({ connectionString: url, ssl: needSsl(url) });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        collection text   NOT NULL,
        id         text   NOT NULL,
        data       jsonb  NOT NULL,
        created_at bigint NOT NULL,
        PRIMARY KEY (collection, id)
      );
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS documents_coll_created
         ON documents (collection, created_at);`
    );
  },

  async list(collection, filter, opts = {}) {
    const params = [collection];
    let sql = `SELECT data FROM documents WHERE collection = $1`;
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        params.push(String(v));
        sql += ` AND data->>'${k}' = $${params.length}`;
      }
    }
    if (opts.sort) {
      const [field, dir] = Object.entries(opts.sort)[0];
      const order = dir < 0 ? 'DESC' : 'ASC';
      // created_at — maxsus ustun; qolganlari JSON ichidan.
      if (field === 'createdAt') sql += ` ORDER BY created_at ${order}`;
      else sql += ` ORDER BY data->>'${field}' ${order}`;
    }
    if (opts.limit) sql += ` LIMIT ${parseInt(opts.limit, 10)}`;
    const res = await pool.query(sql, params);
    return res.rows.map((r) => r.data);
  },

  async get(collection, id) {
    const res = await pool.query(
      `SELECT data FROM documents WHERE collection = $1 AND id = $2`,
      [collection, id]
    );
    return res.rows[0] ? res.rows[0].data : null;
  },

  async findOne(collection, filter) {
    const rows = await this.list(collection, filter, { limit: 1 });
    return rows[0] || null;
  },

  async insert(collection, doc) {
    const createdAt = doc.createdAt || Date.now();
    await pool.query(
      `INSERT INTO documents (collection, id, data, created_at)
       VALUES ($1, $2, $3, $4)`,
      [collection, doc.id, JSON.stringify(doc), createdAt]
    );
    return doc;
  },

  async update(collection, id, patch) {
    const res = await pool.query(
      `UPDATE documents
          SET data = data || $3::jsonb
        WHERE collection = $1 AND id = $2
      RETURNING data`,
      [collection, id, JSON.stringify(patch)]
    );
    return res.rows[0] ? res.rows[0].data : null;
  },

  async remove(collection, id) {
    const res = await pool.query(
      `DELETE FROM documents WHERE collection = $1 AND id = $2`,
      [collection, id]
    );
    return res.rowCount > 0;
  },
};
