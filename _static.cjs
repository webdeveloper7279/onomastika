// Lokal sinov uchun oddiy statik server (faqat ishlab chiqishda).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'frontend');
const PORT = 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // SPA fallback
        fs.readFile(path.join(ROOT, 'index.html'), (e2, idx) => {
          if (e2) {
            res.writeHead(404);
            return res.end('Not found');
          }
          res.writeHead(200, { 'Content-Type': MIME['.html'] });
          res.end(idx);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log('Static frontend: http://localhost:' + PORT));
