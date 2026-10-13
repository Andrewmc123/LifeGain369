/* ==========================================================================
   sw.js — makes the hosted app open with no signal.

   Network first, cache as the fallback: online, every visit gets the
   latest code (no stale-version problem after a redeploy); offline, the
   last copy that loaded is used. Only the app's own files are cached.
   Records are never touched here — they live in the browser's database.
   ========================================================================== */

var CACHE = 'outreach-companion-v2';

var SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/icon.svg',
  'assets/css/styles.css',
  'assets/css/refine.css',
  'assets/css/features.css',
  'assets/core/util.js',
  'assets/core/config.js',
  'assets/core/crypto.js',
  'assets/core/store.js',
  'assets/core/flow.js',
  'assets/core/doc.js',
  'assets/core/report.js',
  'assets/data/catalogs.js',
  'assets/data/resources-nyc.js',
  'assets/data/sample-data.js',
  'assets/ui/packet-style.js',
  'assets/ui/ui.js',
  'assets/app.js',
  'assets/views/lock.js',
  'assets/views/overview.js',
  'assets/views/today.js',
  'assets/views/people.js',
  'assets/views/person.js',
  'assets/views/plan.js',
  'assets/views/history.js',
  'assets/views/documentation.js',
  'assets/views/report.js',
  'assets/views/settings.js',
  'assets/views/help.js',
  'assets/actions.js',
  'assets/main.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
      });
    })
  );
});
