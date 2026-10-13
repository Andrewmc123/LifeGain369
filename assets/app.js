/* ==========================================================================
   app.js — shared state, rendering, and field binding.

   Rendering is deliberately plain: each view (assets/views/) produces an
   HTML string, and a single delegated listener (actions.js) handles clicks
   and input. Field edits write straight into the record without a
   re-render, so a worker typing a long story never loses their cursor.

   Load order matters: this file defines App and Views, the view files
   register themselves on Views, then actions.js and main.js start it up.
   ========================================================================== */

var Views = {};

var App = (function () {
  'use strict';

  var state = {
    view: 'today',
    helpTab: 'app',
    personId: null,
    tab: 'overview',
    search: '',
    filter: '',
    showArchived: false,
    sort: 'updated',
    report: { period: 'last-month', from: '', to: '', includeSamples: false },
    doc: {
      preset: 'full',
      sections: Doc.PRESETS.full.on.slice(),
      email: ''
    }
  };

  var root;

  function person() { return state.personId ? Store.get(state.personId) : null; }

  function render() {
    if (!root) root = document.getElementById('view');
    var locked = Store.isLocked();
    document.body.classList.toggle('is-locked', locked);

    var html;
    if (locked) html = Views.lock();
    else if (state.view === 'dashboard') html = Views.dashboard();
    else if (state.view === 'today') html = Views.today();
    else if (state.view === 'people') html = Views.people();
    else if (state.view === 'person') html = Views.person();
    else if (state.view === 'report') html = Views.report();
    else if (state.view === 'settings') html = Views.settings();
    else if (state.view === 'help') html = Views.help();
    else html = Views.dashboard();

    root.innerHTML = html;
    document.querySelectorAll('.nav button').forEach(function (b) {
      b.classList.toggle('active', !locked && (b.dataset.view === state.view ||
        (state.view === 'person' && b.dataset.view === 'people') ||
        (state.view === 'report' && b.dataset.view === 'dashboard')));
    });
    var org = document.getElementById('brand-org');
    if (org) {
      org.textContent = (!locked && Store.settings().orgName) || 'Local records · nothing is uploaded';
    }
    var lockBtn = document.getElementById('lock-now');
    if (lockBtn) lockBtn.hidden = locked || !Store.hasPasscode();
    window.scrollTo(0, 0);

    if (locked) {
      var input = document.getElementById('unlock-pass');
      if (input) input.focus();
    }
  }

  function go(view, id) {
    state.view = view;
    if (id) state.personId = id;
    render();
  }

  /* ----- value binding -------------------------------------------------- */

  // Supports "firstName", "stay.city", "list:goals:ID:title", and "settings.orgName".
  function setBound(bind, value) {
    if (bind.indexOf('settings.') === 0) {
      Store.settings()[bind.slice(9)] = value;
      Store.save();
      return;
    }
    var p = person();
    if (!p) return;

    if (bind.indexOf('list:') === 0) {
      var parts = bind.split(':');            // list, name, id, field
      var rows = p[parts[1]] || [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].id === parts[2]) {
          rows[i][parts[3]] = value;
          rows[i].updatedAt = new Date().toISOString();
          break;
        }
      }
    } else {
      var path = bind.split('.');
      var target = p;
      for (var j = 0; j < path.length - 1; j++) {
        if (!target[path[j]]) target[path[j]] = {};
        target = target[path[j]];
      }
      target[path[path.length - 1]] = value;
      syncAnswers(p, bind, value);
    }
    Store.touch(p);
    refreshHeaderBits();
  }

  // Veteran status and disabling condition each have a quick checkbox and a
  // fuller intake answer (which can say "No"). Keep the two in step.
  function syncAnswers(p, bind, value) {
    if (bind === 'veteran') p.hmis.veteranAsked = value ? 'Yes' : (p.hmis.veteranAsked === 'Yes' ? '' : p.hmis.veteranAsked);
    if (bind === 'disability') p.hmis.disabilityAsked = value ? 'Yes' : (p.hmis.disabilityAsked === 'Yes' ? '' : p.hmis.disabilityAsked);
    if (bind === 'hmis.veteranAsked') p.veteran = value === 'Yes';
    if (bind === 'hmis.disabilityAsked') p.disability = value === 'Yes';
  }

  // Keeps the title bar and the live packet preview in step while typing,
  // without redrawing the form underneath the cursor.
  function refreshHeaderBits() {
    var p = person();
    if (!p) return;
    var t = document.getElementById('person-title');
    if (t) t.textContent = Doc.fullName(p);
    var prev = document.getElementById('doc-preview');
    if (prev) {
      prev.innerHTML = Doc.packetHTML(p, { sections: state.doc.sections, settings: Store.settings() });
    }
  }

  return {
    state: state,
    person: person,
    render: render,
    go: go,
    setBound: setBound,
    refreshHeaderBits: refreshHeaderBits
  };
})();
