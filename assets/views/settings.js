/* ==========================================================================
   views/settings.js — Settings: organisation, appearance, security, backup.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

  function viewSettings() {
    var s = Store.settings();
    var backendLabel = {
      idb: 'Browser database (IndexedDB)',
      localstorage: 'Browser local storage',
      memory: 'Memory only — NOT SAVED'
    }[Store.backend()] || Store.backend();

    var people = Store.all();
    var photos = people.filter(function (p) { return has(p.photo); }).length;
    var approxKB = Math.round(JSON.stringify(Store.raw()).length / 1024);

    var h = '';
    h += '<h1>Settings</h1>';

    h += '<div class="card"><div class="card-head"><h2>Your organization</h2></div>' +
      '<p class="section-hint">This appears in the corner of every printed or emailed document.</p>' +
      '<div class="grid cols-2">' +
      '<div>' + text('Organization name', 'settings.orgName', s.orgName, { placeholder: 'Riverside Street Outreach' }) + '</div>' +
      '<div>' + text('Your name', 'settings.workerName', s.workerName) + '</div>' +
      '</div>' +
      '<div class="grid cols-2">' +
      '<div>' + text('Continuum of Care (optional)', 'settings.coc', s.coc, { placeholder: 'e.g. CA-600' }) + '</div>' +
      '<div>' + text('Flag a record as going quiet after (days)', 'settings.followUpDays', s.followUpDays, { type: 'number', hint: 'Drives the Today screen. 14 days suits most street outreach; a shelter-based team may want 7.' }) + '</div>' +
      '</div>' +
      area('Contact details for documents', 'settings.orgContact', s.orgContact, { rows: 2, placeholder: 'Phone · email · address' }) +
      area('Confidentiality note printed at the bottom', 'settings.confidentialityNote', s.confidentialityNote, { rows: 3 }) +
      field('Logo on documents',
        '<div class="btn-row">' +
        (s.orgLogo ? '<img class="logo-preview" src="' + Util.safeImage(s.orgLogo) + '" alt="Current logo">' : '') +
        '<button class="btn" data-action="logo-pick">' + (s.orgLogo ? 'Change logo' : 'Add a logo') + '</button>' +
        (s.orgLogo ? '<button class="btn ghost" data-action="logo-clear">Remove</button>' : '') +
        '</div><input type="file" id="logo-input" accept="image/*" hidden>',
        'Printed in the top corner of every document. Shrunk automatically.') +
      '</div>';

    h += securityCard(s);

    h += '<div class="card"><div class="card-head"><h2>Appearance</h2></div>' +
      field('Theme', '<select id="theme">' +
        ['auto', 'light', 'dark'].map(function (t) {
          return '<option value="' + t + '"' + (s.theme === t ? ' selected' : '') + '>' +
            (t === 'auto' ? 'Match my device' : t === 'light' ? 'Light' : 'Dark') + '</option>';
        }).join('') + '</select>') +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>Install on this device</h2></div>' +
      '<p class="section-hint">Installed, the app opens from the home screen like any other app and ' +
      'works with no signal at all. Records still stay only on this device.</p>' +
      (Views.installReady()
        ? '<button class="btn primary" data-action="install-app">Install the app</button>'
        : '<p class="small muted mb0">' + esc(installHint()) + '</p>') +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>Backup & restore</h2></div>' +
      '<div class="notice warn">These records exist in one place only: this browser, on this device. ' +
      'Clearing browsing data, or using a different browser, means they are gone. Back up regularly and keep the file somewhere safe.</div>' +
      '<div class="btn-row">' +
      '<button class="btn primary" data-action="backup">⬇ Download backup file</button>' +
      '<button class="btn" data-action="restore-merge">⬆ Restore (merge)</button>' +
      '<button class="btn" data-action="restore-replace">⬆ Restore (replace everything)</button>' +
      '<button class="btn" data-action="export-csv">Export list as CSV</button>' +
      '</div>' +
      '<input type="file" id="restore-input" accept="application/json,.json" style="display:none">' +
      '<p class="small faint mt16 mb0"><strong>Merge</strong> adds records from the file and updates ones edited more recently there — use it to combine two workers\' devices. ' +
      '<strong>Replace</strong> wipes what is here first.' +
      (Store.hasPasscode() ? ' Backups are <strong>encrypted with your passcode</strong>; you will need it to restore one.' : '') +
      '</p>' +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>Storage</h2></div>' +
      '<div class="grid cols-3">' +
      stat(people.length, 'Records') + stat(photos, 'Photos') + stat(approxKB + ' KB', 'Data size') +
      '</div>' +
      '<p class="small muted mt16 mb0">Saving to: <strong>' + esc(backendLabel) + '</strong>' +
      (Store.backend() === 'memory'
        ? ' — this browser is blocking storage, so nothing will survive a refresh. Download a backup before you close this tab.'
        : '') + '</p>' +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>Delete everything</h2></div>' +
      '<p class="section-hint">Removes every record from this device. Back up first — this cannot be undone.</p>' +
      '<button class="btn danger" data-action="wipe">Erase all records</button></div>';

    h += '<div class="card"><div class="card-head"><h2>Sample caseload</h2></div>' +
      '<p class="section-hint">Six invented people who between them exercise every part of the ' +
      'app — useful for training a new worker, or for seeing what a screen looks like with ' +
      'something in it. They are badged as samples and never mix with real records.</p>' +
      '<div class="btn-row">' +
      (Store.hasSamples()
        ? '<button class="btn" data-action="clear-sample">Remove sample records</button>'
        : '<button class="btn" data-action="load-sample">Load sample caseload</button>') +
      '</div></div>';

    return h;
  }

  function securityCard(s) {
    var h = '<div class="card"><div class="card-head"><h2>Passcode lock</h2>' +
      (Store.hasPasscode() ? '<span class="badge ok">On</span>' : '<span class="badge warn">Off</span>') +
      '</div>';

    if (!Crypt.available()) {
      return h + '<p class="muted mb0">This browser cannot encrypt here. Open the app with ' +
        'Start App.bat or from its web address to turn the lock on.</p></div>';
    }

    if (!Store.hasPasscode()) {
      return h + '<p class="section-hint">A lost or shared phone is the most likely way these records ' +
        'leak. With a passcode, everything saved on this device — and every backup file — is ' +
        'encrypted, and the app locks itself when it is left alone.</p>' +
        '<div class="grid cols-2">' +
        '<div>' + field('New passcode', '<input type="password" id="pass-new" autocomplete="new-password" minlength="6">',
          'At least 6 characters. A short phrase is easier to remember than random letters.') + '</div>' +
        '<div>' + field('Type it again', '<input type="password" id="pass-confirm" autocomplete="new-password">') + '</div>' +
        '</div>' +
        '<div class="notice warn">There is no way to recover a forgotten passcode — that is what ' +
        'makes it safe. Download a backup first and keep the passcode somewhere your team can find it.</div>' +
        '<button class="btn primary" data-action="pass-set">Turn on the lock</button></div>';
    }

    return h + '<p class="section-hint">Records on this device and new backups are encrypted. ' +
      'The app locks after the time below with no taps or typing.</p>' +
      '<div class="grid cols-2">' +
      '<div>' + text('Lock after (minutes idle)', 'settings.lockMinutes', s.lockMinutes,
        { type: 'number', hint: 'Between 1 and 120. 5–10 suits a phone in a pocket.' }) + '</div>' +
      '<div>' + field('Change passcode', '<input type="password" id="pass-new" autocomplete="new-password" placeholder="New passcode">' +
        '<input type="password" id="pass-confirm" autocomplete="new-password" placeholder="Type it again" class="mt8">') + '</div>' +
      '</div>' +
      '<div class="btn-row">' +
      '<button class="btn" data-action="lock-now">Lock now</button>' +
      '<button class="btn" data-action="pass-set">Change passcode</button>' +
      '<button class="btn danger" data-action="pass-remove">Turn off the lock</button>' +
      '</div></div>';
  }

  function installHint() {
    if (location.protocol === 'file:') {
      return 'Opened straight from a file, the app cannot be installed. Use Start App.bat, or the ' +
        'web address your organisation hosts it on.';
    }
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return 'Already installed — you are using the installed app now.';
    }
    return 'On iPhone or iPad: tap Share, then "Add to Home Screen". In Chrome or Edge, use the ' +
      'install icon in the address bar.';
  }

  Views.settings = viewSettings;
})();
