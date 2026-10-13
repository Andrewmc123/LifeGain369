/* ==========================================================================
   actions.js — everything a tap, a keystroke or a file pick does.

   Buttons carry data-action="name"; ACTIONS maps each name to a small
   function. Adding a button means adding one entry here, not threading a
   new branch through a long if-chain.
   ========================================================================== */

var Actions = (function () {
  'use strict';

  var state = App.state, toast = UI.toast, el = UI.el, render = App.render, go = App.go;

  function person() { return App.person(); }

  function docOpts() {
    return { sections: state.doc.sections, settings: Store.settings() };
  }

  // Re-draw without jumping back to the top of the page.
  function redraw() {
    var y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  function touchAndRedraw(p) {
    Store.touch(p);
    redraw();
  }

  /* ----- the table ------------------------------------------------------ */

  var ACTIONS = {

    /* navigation */
    'nav': function (t) { state.view = t.dataset.view; render(); },
    'go-people': function () { state.view = 'people'; render(); },
    'go-settings': function (t, e) { e.preventDefault(); go('settings'); },
    'open-person': function (t) {
      state.personId = t.dataset.id;
      state.tab = 'overview';
      go('person');
    },
    'tab': function (t) { state.tab = t.dataset.tab; render(); },
    'help-tab': function (t) { state.helpTab = t.dataset.tab; render(); },
    // Jump straight from a suggestion to the field that answers it.
    'goto': function (t, e) {
      if (e) e.preventDefault();
      if (t.dataset.id) state.personId = t.dataset.id;
      state.tab = t.dataset.tab || 'overview';
      go('person');
    },
    'print-help': function () { window.print(); },

    /* sample caseload */
    'load-sample': function () {
      if (typeof SAMPLE === 'undefined') return toast('Sample data is not available.');
      Store.addMany(SAMPLE.build(Store.blankPerson, Store.uid)).then(function () {
        go('today');
        toast('Sample caseload loaded. Remove it any time from Overview or Settings.');
      });
    },
    'clear-sample': function () {
      Store.removeSamples().then(function (n) {
        state.personId = null;
        render();
        toast(n + ' sample record' + (n === 1 ? '' : 's') + ' removed.');
      });
    },

    /* dates and visits */
    // One tap to stamp a milestone with today's date.
    'mark-today': function (t) {
      var p = t.dataset.id ? Store.get(t.dataset.id) : person();
      if (!p) return;
      p[t.dataset.field] = Util.todayStr();
      touchAndRedraw(p);
      toast('Dated today.');
    },
    'clear-field': function (t) {
      var p = t.dataset.id ? Store.get(t.dataset.id) : person();
      if (!p) return;
      p[t.dataset.field] = '';
      touchAndRedraw(p);
    },
    // Log a contact and clear the follow-up it satisfies, in one step.
    'did-visit': function (t) {
      var p = Store.get(t.dataset.id) || person();
      if (!p) return;
      p.log.unshift({ id: Store.uid(), date: Util.todayStr(), type: 'Street outreach',
                      worker: Store.settings().workerName || '', notes: '' });
      p.followUpDate = '';
      p.followUpNote = '';
      Store.touch(p);
      state.personId = p.id;
      state.tab = 'log';
      go('person');
      toast('Contact logged for today. Add what happened while it is fresh.');
    },

    /* records */
    'new-person': function () {
      var p = Store.create();
      state.personId = p.id;
      state.tab = 'overview';
      go('person');
      toast('New record started. Nothing is required — fill in what they share.');
    },
    'archive-person': function (t) {
      var p = person();
      if (!p) return;
      p.archived = t.dataset.on === '1';
      Store.touch(p);
      if (p.archived) {
        state.personId = null;
        go('people');
        toast('Archived. Find it again with "Show archived" on the People list.', 4000);
      } else {
        redraw();
        toast('Back on the active list.');
      }
    },
    'delete-person': function () {
      var p = person();
      if (!p) return;
      if (!confirm('Delete the record for ' + Doc.shortName(p) + '? This cannot be undone.')) return;
      if (!confirm('Really delete? Archiving keeps the record but hides it. Consider downloading a backup first.')) return;
      Store.remove(p.id);
      state.personId = null;
      go('people');
      toast('Record deleted.');
    },

    /* photo */
    'photo-pick': function () { el('photo-input').click(); },
    'photo-camera': function () { el('photo-camera-input').click(); },
    'photo-clear': function () {
      var p = person();
      if (!confirm('Remove this photo?')) return;
      p.photo = ''; p.photoTakenAt = '';
      touchAndRedraw(p);
    },

    /* location */
    'gps': function () {
      var p = person();
      if (!navigator.geolocation) return toast('This browser cannot provide a location.');
      toast('Getting location…');
      navigator.geolocation.getCurrentPosition(function (pos) {
        p.stay.gpsLat = pos.coords.latitude.toFixed(6);
        p.stay.gpsLng = pos.coords.longitude.toFixed(6);
        p.stay.gpsAt = new Date().toISOString();
        touchAndRedraw(p);
        toast('Location saved.');
      }, function () {
        toast('Could not get a location. Open the app over http (Start App) and allow location access.', 5000);
      }, { enableHighAccuracy: true, timeout: 12000 });
    },
    'gps-clear': function () {
      var p = person();
      p.stay.gpsLat = ''; p.stay.gpsLng = ''; p.stay.gpsAt = '';
      touchAndRedraw(p);
    },

    /* chips */
    'chip': function (t) {
      var p = person(), list = t.dataset.list, val = t.dataset.value;
      p[list] = p[list] || [];
      var i = p[list].indexOf(val);
      if (i === -1) p[list].push(val); else p[list].splice(i, 1);
      touchAndRedraw(p);
    },

    /* goals */
    'add-goal': function () {
      var p = person(), now = new Date().toISOString();
      p.goals.push({
        id: Store.uid(), title: '', category: '', why: '', steps: '',
        status: 'Just started', targetDate: '', support: '', notes: '',
        createdAt: now, updatedAt: now
      });
      touchAndRedraw(p);
    },
    'del-goal': function (t) { removeRow('goals', t.dataset.id, 'Delete this goal?'); },
    'move-goal': function (t) {
      var p = person();
      var dir = parseInt(t.dataset.dir, 10);
      var idx = p.goals.findIndex(function (g) { return g.id === t.dataset.id; });
      var to = idx + dir;
      if (idx < 0 || to < 0 || to >= p.goals.length) return;
      var moved = p.goals.splice(idx, 1)[0];
      p.goals.splice(to, 0, moved);
      touchAndRedraw(p);
    },

    /* documents */
    'add-doc': function () {
      var p = person();
      p.documents.push({ id: Store.uid(), name: '', status: 'unknown', notes: '', expires: '' });
      touchAndRedraw(p);
    },
    'del-doc': function (t) { removeRow('documents', t.dataset.id, 'Remove this document from the checklist?'); },

    /* log and referrals */
    'add-log': function () { addLog(); },
    'quick-log': function () { addLog(); },
    'del-log': function (t) { removeRow('log', t.dataset.id, 'Delete this log entry?'); },
    'add-referral': function () {
      var p = person();
      p.referrals.push({ id: Store.uid(), org: '', service: '', date: Util.todayStr(),
                         status: 'Referred', contact: '', notes: '' });
      touchAndRedraw(p);
    },
    'del-referral': function (t) { removeRow('referrals', t.dataset.id, 'Delete this referral?'); },

    /* documentation */
    'doc-section': function () { /* handled by the change listener */ },
    'doc-print': function () {
      var ok = Doc.printPacket(person(), docOpts(), PACKET_CSS);
      if (ok) toast('Opening the print dialog… choose "Save as PDF" for a file.', 4000);
      else toast('Printing was blocked. Use "Download as web page" below, then open that file and print it.', 6000);
    },
    'doc-email': function () {
      var link = Doc.mailtoLink(person(), docOpts(), state.doc.email);
      window.location.href = link.href;
      if (link.truncated) {
        toast('The record was shortened to fit an email. Download the file and attach it for the full version.', 6000);
      }
    },
    'doc-html': function () {
      var p = person();
      UI.download(UI.safeFile(Doc.shortName(p)) + '-record.html',
        Doc.standaloneHTML(p, docOpts(), PACKET_CSS), 'text/html');
      toast('File downloaded — check your Downloads folder.');
    },
    'doc-txt': function () {
      var p = person();
      UI.download(UI.safeFile(Doc.shortName(p)) + '-record.txt', Doc.packetText(p, docOpts()), 'text/plain');
      toast('File downloaded — check your Downloads folder.');
    },
    'doc-copy': function () { UI.copyText(Doc.packetText(person(), docOpts())); },

    /* reports */
    'report-print': function () { window.print(); },
    'report-csv': function () { Views.reportCSV(); },
    'export-csv': function () { exportCSV(); },

    /* backup */
    'backup': function () { backup(); },
    'restore-merge': function () { pickRestore('merge'); },
    'restore-replace': function () { pickRestore('replace'); },
    'wipe': function () {
      if (!confirm('Erase ALL records from this device?')) return;
      if (prompt('Type ERASE to confirm.') !== 'ERASE') return toast('Cancelled — nothing was deleted.');
      Store.replaceAll(Store.blankDatabase()).then(function () {
        state.personId = null;
        go('dashboard');
        toast('All records erased.');
      });
    },

    /* organisation logo */
    'logo-pick': function () { el('logo-input').click(); },
    'logo-clear': function () {
      Store.settings().orgLogo = '';
      Store.save();
      redraw();
    },

    /* passcode */
    'pass-set': function () { setPasscode(); },
    'pass-remove': function () {
      if (!confirm('Turn off the lock? Records on this device and new backups will no longer be encrypted.')) return;
      Store.removePasscode().then(function () {
        redraw();
        toast('Lock turned off.');
      }, saveFailed);
    },
    'lock-now': function () { lockNow(); },

    /* install */
    'install-app': function () { Views.install(); }
  };

  /* ----- helpers behind the table ---------------------------------------- */

  function removeRow(list, id, question) {
    var p = person();
    if (!confirm(question)) return;
    p[list] = p[list].filter(function (r) { return r.id !== id; });
    touchAndRedraw(p);
  }

  function addLog() {
    var p = person();
    p.log.push({
      id: Store.uid(), date: Util.todayStr(), type: 'Street outreach',
      worker: Store.settings().workerName || '', notes: ''
    });
    Store.touch(p);
    state.tab = 'log';
    render();
    toast('Contact logged for today.');
  }

  function saveFailed(err) {
    alert((err && err.message) || 'That could not be saved.');
  }

  function lockNow() {
    if (!Store.hasPasscode()) return;
    Store.lock().then(function () {
      state.personId = null;
      state.view = 'today';
      render();
    });
  }

  function setPasscode() {
    var a = el('pass-new'), b = el('pass-confirm');
    var pass = a ? a.value : '';
    if (pass.length < 6) return toast('Use at least 6 characters.');
    if (!b || b.value !== pass) return toast('The two passcodes do not match.');
    var changing = Store.hasPasscode();
    Store.setPasscode(pass).then(function () {
      redraw();
      toast(changing ? 'Passcode changed.' : 'Lock is on. Records here are now encrypted.', 4000);
    }, saveFailed);
  }

  function backup() {
    Store.backupPayload().then(function (body) {
      var stamp = Util.todayStr();
      UI.download('lifegain369-backup-' + stamp + '.json', JSON.stringify(body, null, 2), 'application/json');
      // Stamped after the download so the reminder on Today is truthful.
      Store.settings().lastBackupAt = new Date().toISOString();
      Store.save();
      toast(Store.hasPasscode()
        ? 'Encrypted backup downloaded. You will need the passcode to restore it.'
        : 'Backup downloaded. Keep it somewhere safe.', 4000);
    });
  }

  function pickRestore(mode) {
    var input = el('restore-input');
    input.dataset.mode = mode;
    input.click();
  }

  // Reads a backup file, asking for its passcode when it is encrypted.
  function readBackup(text) {
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      return Promise.reject(new Error('That file could not be read as a backup. Make sure it is the .json file this app downloaded.'));
    }
    if (Crypt.isEnvelope(parsed)) {
      if (!Crypt.available()) return Promise.reject(new Error('This backup is encrypted, and this browser cannot decrypt here. Open the app with Start App.bat or its web address.'));
      var pass = prompt('This backup is encrypted. Enter the passcode it was made with:');
      if (!pass) return Promise.reject(new Error('Restore cancelled.'));
      return Crypt.open(parsed, pass).then(function (res) { return res.data; });
    }
    return Promise.resolve(parsed);
  }

  function restore(file, mode) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      readBackup(ev.target.result).then(function (parsed) {
        if (!parsed || !Array.isArray(parsed.people)) {
          throw new Error('That file does not look like a backup from this app.');
        }
        if (mode === 'replace') {
          if (!confirm('Replace all ' + Store.all().length + ' record(s) on this device with the ' +
                       parsed.people.length + ' record(s) in the file?')) return;
          return Store.replaceAll(parsed).then(function () {
            go('people');
            toast('Restored ' + Store.all().length + ' record(s).');
          });
        }
        return Store.mergeIn(parsed).then(function (res) {
          go('people');
          toast('Merged: ' + res.added + ' added, ' + res.updated + ' updated.', 4000);
        });
      }).catch(function (err) {
        alert(err.message || 'That backup could not be restored.');
      });
    };
    reader.readAsText(file);
  }

  function exportCSV() {
    var rows = [[
      'Name', 'Goes by', 'Pronouns', 'Date of birth', 'Phone', 'Living situation',
      'Location', 'Cross streets', 'City', 'State', 'ZIP', 'Homeless since',
      'Stage', 'Active goals', 'Top goal', 'Needs', 'Barriers', 'Last contact',
      'Has photo', 'Consent recorded', 'Archived', 'Record updated'
    ]];

    Store.all().forEach(function (p) {
      var s = p.stay || {};
      rows.push([
        [p.firstName, p.lastName].filter(Util.has).join(' '),
        p.preferredName, p.pronouns, p.dob, p.phone, s.situation,
        s.locationName, s.crossStreets, s.city, s.state, s.zip, s.homelessSince,
        Flow.stageMeta(Flow.stageOf(p)).t,
        Flow.activeGoals(p).length,
        (p.goals && p.goals[0] && p.goals[0].title) || '',
        (p.needs || []).join('; '),
        (p.barriers || []).join('; '),
        Flow.lastContactDate(p),
        Util.has(p.photo) ? 'yes' : 'no',
        (p.consent && p.consent.dataConsent) ? 'yes' : 'no',
        p.archived ? 'yes' : 'no',
        p.updatedAt
      ]);
    });

    UI.download('lifegain369-people-' + Util.todayStr() + '.csv', UI.toCSV(rows), 'text/csv');
    toast('CSV downloaded.');
  }

  function applyTheme() {
    var t = Store.isLocked() ? 'auto' : (Store.settings().theme || 'auto');
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  function filterResources(q) {
    var term = (q || '').trim().toLowerCase();
    document.querySelectorAll('.res-group').forEach(function (g) {
      var shown = 0;
      g.querySelectorAll('.res-item').forEach(function (it) {
        var match = !term || (it.dataset.hay || '').indexOf(term) !== -1;
        it.hidden = !match;
        if (match) shown++;
      });
      var empty = g.querySelector('.res-empty');
      if (empty) empty.hidden = shown !== 0;
      // Hide a whole group only while searching, so the page keeps its shape.
      g.hidden = !!term && shown === 0;
    });
  }

  /* ----- listeners ------------------------------------------------------- */

  function onClick(e) {
    var t = e.target.closest('[data-action]');
    if (!t || Store.isLocked()) return;
    var fn = ACTIONS[t.dataset.action];
    if (fn) fn(t, e);
  }

  // Answers whose change alters something else on screen.
  var REDRAW_BINDS = /^(stay\.withChildren|stay\.withPets|veteran|disability|hmis\.veteranAsked|hmis\.disabilityAsked)$/;

  function onInput(e) {
    var t = e.target;
    if (Store.isLocked()) return;

    if (t.id === 'search') { state.search = t.value; return Views.refreshPeopleResults(); }
    if (t.id === 'res-search') return filterResources(t.value);
    if (t.id === 'doc-email') { state.doc.email = t.value; return; }

    var bind = t.dataset.bind;
    if (!bind) return;
    // Selects and checkboxes are handled once, on change.
    if (e.type === 'input' && (t.tagName === 'SELECT' || t.type === 'checkbox')) return;
    App.setBound(bind, t.type === 'checkbox' ? t.checked : t.value);
    if (REDRAW_BINDS.test(bind)) redraw();
  }

  function onChange(e) {
    var t = e.target;
    if (Store.isLocked()) return;

    if (t.id === 'filter') { state.filter = t.value; return render(); }
    if (t.id === 'sort') { state.sort = t.value; return render(); }
    if (t.id === 'show-archived') { state.showArchived = t.checked; return render(); }
    if (t.id === 'theme') {
      Store.settings().theme = t.value;
      Store.save();
      return applyTheme();
    }
    if (t.id === 'report-period') { state.report.period = t.value; return redraw(); }
    if (t.id === 'report-from') { state.report.from = t.value; return redraw(); }
    if (t.id === 'report-to') { state.report.to = t.value; return redraw(); }
    if (t.id === 'report-samples') { state.report.includeSamples = t.checked; return redraw(); }
    if (t.id === 'doc-preset') {
      state.doc.preset = t.value;
      state.doc.sections = Doc.PRESETS[t.value].on.slice();
      return redraw();
    }
    if (t.dataset.action === 'doc-section') {
      var k = t.dataset.key;
      var i = state.doc.sections.indexOf(k);
      if (t.checked && i === -1) state.doc.sections.push(k);
      if (!t.checked && i !== -1) state.doc.sections.splice(i, 1);
      // Keep the printed order stable regardless of tick order.
      state.doc.sections.sort(function (a, b) {
        return Doc.SECTIONS.findIndex(function (s) { return s.key === a; }) -
               Doc.SECTIONS.findIndex(function (s) { return s.key === b; });
      });
      App.refreshHeaderBits();
      var badge = document.querySelector('.doc-layout .badge');
      if (badge) badge.textContent = state.doc.sections.length + ' sections';
      return;
    }

    if (t.id === 'photo-input' || t.id === 'photo-camera-input') {
      var file = t.files && t.files[0];
      if (!file) return;
      toast('Processing photo…');
      UI.readPhoto(file, function (dataUrl) {
        var p = person();
        p.photo = dataUrl;
        p.photoTakenAt = Util.todayStr();
        Store.touch(p).then(function () {
          redraw();
          toast('Photo saved.');
        }, function () { redraw(); });
      });
      t.value = '';
      return;
    }

    if (t.id === 'logo-input') {
      var logo = t.files && t.files[0];
      if (!logo) return;
      UI.readPhoto(logo, function (dataUrl) {
        Store.settings().orgLogo = dataUrl;
        Store.save();
        redraw();
        toast('Logo saved. It will appear on printed documents.');
      }, 320, 'image/png');
      t.value = '';
      return;
    }

    if (t.id === 'restore-input') {
      var f = t.files && t.files[0];
      if (f) restore(f, t.dataset.mode);
      t.value = '';
      return;
    }

    // Selects and checkboxes bound to the record.
    if (t.dataset.bind) onInput(e);
  }

  function onSubmit(e) {
    if (e.target.id !== 'unlock-form') return;
    e.preventDefault();
    var input = el('unlock-pass'), err = el('unlock-error');
    var btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Unlocking…'; }
    Store.unlock(input.value).then(function () {
      applyTheme();
      render();
    }, function (ex) {
      if (btn) { btn.disabled = false; btn.textContent = 'Unlock'; }
      if (err) { err.textContent = ex.message || 'That passcode is not right.'; err.hidden = false; }
      input.value = '';
      input.focus();
    });
  }

  function listen() {
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
  }

  return {
    listen: listen,
    applyTheme: applyTheme,
    lockNow: lockNow,
    ACTIONS: ACTIONS
  };
})();
