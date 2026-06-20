// ─────────────────────────────────────────────────────────────
//  Onomastika frontend sozlamasi
//  Backend (Render) manzilini shu yerga yozing.
//  Netlify'ga deploy qilgandan keyin pastdagi URL'ni o'zingiznikiga almashtiring.
// ─────────────────────────────────────────────────────────────
(function () {
  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';

  // Lokal ishlab chiqishda backend shu manzilda turadi:
  var LOCAL_API = 'http://localhost:5000';

  // ⬇️ DEPLOY'DAN KEYIN SHU YERNI O'ZGARTIRING ⬇️
  // Render'dagi backend manzilingiz, masalan:
  //   'https://onomastika-api.onrender.com'
  var PRODUCTION_API = 'https://onomastika-api.onrender.com';

  window.ONOMASTIKA_API_BASE = isLocal ? LOCAL_API : PRODUCTION_API;
})();
