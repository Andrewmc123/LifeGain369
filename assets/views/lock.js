/* ==========================================================================
   views/lock.js — the screen shown while records are encrypted and locked.
   Nothing about any record is visible here, not even how many there are.
   ========================================================================== */

(function () {
  'use strict';

  function viewLock() {
    return '<div class="lock-wrap"><div class="card lock-card">' +
      '<div class="empty-mark" aria-hidden="true">🔒</div>' +
      '<h1>Locked</h1>' +
      '<p class="muted">Records on this device are encrypted. Enter the passcode to open them.</p>' +
      '<form id="unlock-form" autocomplete="off">' +
      '<label class="sr-only" for="unlock-pass">Passcode</label>' +
      '<input type="password" id="unlock-pass" autocomplete="current-password" placeholder="Passcode" required>' +
      '<p class="lock-error small" id="unlock-error" role="alert" hidden></p>' +
      '<button class="btn primary block mt16" type="submit">Unlock</button>' +
      '</form>' +
      '<p class="small faint mt16 mb0">Forgotten passcodes cannot be recovered — that is what keeps ' +
      'these records safe if the device is lost. A backup file made with the same passcode can be ' +
      'restored once you have it.</p>' +
      '</div></div>';
  }

  Views.lock = viewLock;
})();
