/* ==========================================================================
   main.js — start-up: load the records, wire the listeners, keep the data
   safe while the app runs (save on hide, lock when idle), and make the app
   installable and usable offline.
   ========================================================================== */

(function () {
  'use strict';

  var lastActivity = Date.now();
  var installPrompt = null;

  /* ----- saving -------------------------------------------------------- */

  function watchSaves() {
    Store.onSave(function () {
      var d = document.getElementById('save-dot');
      if (!d) return;
      d.classList.remove('save-failed');
      d.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    });
    // A failed save must never be silent: the worker thinks their notes are kept.
    Store.onError(function (err) {
      var d = document.getElementById('save-dot');
      if (d) {
        d.classList.add('save-failed');
        d.textContent = 'NOT SAVED — back up now from Settings';
      }
      UI.toast((err && err.message) || 'Your last change could not be saved.', 8000);
    });

    // Closing the tab or switching apps straight after typing would drop the
    // last quarter-second of edits; write them out now instead.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && !Store.isLocked()) Store.flush();
    });
    window.addEventListener('pagehide', function () {
      if (!Store.isLocked()) Store.flush();
    });

    // Memory-only storage means a refresh loses everything: say so.
    window.addEventListener('beforeunload', function (e) {
      if (Store.backend() === 'memory' && !Store.isLocked() && Store.all().length) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /* ----- auto-lock ------------------------------------------------------ */

  function lockMinutes() {
    var m = parseInt(Store.settings().lockMinutes, 10);
    if (isNaN(m)) m = 10;
    return Math.min(120, Math.max(1, m));
  }

  // Checked on a slow interval rather than with one long timer, so a phone
  // that slept in a pocket for longer than the lock time comes out locked.
  function checkIdle() {
    if (Store.isLocked() || !Store.hasPasscode()) { lastActivity = Date.now(); return; }
    if (Date.now() - lastActivity > lockMinutes() * 60000) Actions.lockNow();
  }

  function watchIdle() {
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, function () { lastActivity = Date.now(); },
        { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') checkIdle();
    });
    setInterval(checkIdle, 15000);
  }

  /* ----- offline and install ------------------------------------------- */

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline is a bonus */ });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installPrompt = e;
  });

  Views.installReady = function () { return !!installPrompt; };
  Views.install = function () {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(function () {
      installPrompt = null;
      App.render();
    });
  };

  /* ----- boot ----------------------------------------------------------- */

  function boot() {
    // The packet styles live in JS so exports carry them; inject for the preview.
    var style = document.createElement('style');
    style.textContent = PACKET_CSS;
    document.head.appendChild(style);

    Store.init().then(function () {
      Actions.applyTheme();
      App.render();
      Actions.listen();
      watchSaves();
      watchIdle();
      registerServiceWorker();
    }).catch(function (err) {
      document.getElementById('view').innerHTML =
        '<div class="card"><h2>Something went wrong starting the app</h2><p>' +
        Util.esc(err && err.message ? err.message : String(err)) + '</p></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
