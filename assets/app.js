/* ==========================================================================
   app.js — screens, editing, and the documentation workflow.

   Rendering is deliberately plain: each view produces an HTML string, and a
   single delegated listener handles clicks and input. Field edits write
   straight into the record without a re-render, so a worker typing a long
   story never loses their cursor.
   ========================================================================== */

(function () {
  'use strict';

  /* ----- option catalogs ---------------------------------------------- */

  var SITUATIONS = [
    'Unsheltered — street/sidewalk', 'Tent or encampment', 'Vehicle (car, van, RV)',
    'Abandoned building', 'Emergency shelter', 'Transitional housing',
    'Motel or hotel', 'Couch surfing / staying with others', 'Institution (hospital, jail)',
    'Recently housed', 'Other'
  ];

  var NEEDS = [
    'Food', 'Water', 'Clothing', 'Blankets / sleeping bag', 'Tent', 'Hygiene supplies',
    'Shower', 'Laundry', 'Shelter bed', 'Housing', 'Medical care', 'Mental health support',
    'Substance use support', 'Dental care', 'Eyeglasses', 'Phone', 'Transportation',
    'ID documents', 'Job / income', 'Legal help', 'Mailing address', 'Storage',
    'Pet food / vet care', 'Warming or cooling center'
  ];

  var BARRIERS = [
    'No ID', 'No income', 'Eviction history', 'Criminal record', 'Poor credit',
    'No phone', 'No transportation', 'Physical health condition', 'Disability',
    'Mental health', 'Substance use', 'Language barrier', 'Reading / paperwork',
    'Fleeing domestic violence', 'Has a pet', 'Wants to stay with partner',
    'Feels unsafe in shelters', 'Lost documents', 'No support network', 'Long waitlists'
  ];

  var BENEFITS = [
    'SNAP / food stamps', 'Medicaid', 'Medicare', 'SSI', 'SSDI', 'VA benefits',
    'TANF', 'General assistance', 'Unemployment', 'Housing voucher', 'Veterans housing (HUD-VASH)'
  ];

  var GOAL_CATEGORIES = [
    'Housing', 'Income & work', 'Physical health', 'Mental health', 'Recovery',
    'Documents & ID', 'Benefits', 'Family & reunification', 'Education',
    'Transportation', 'Legal', 'Pet care', 'Personal'
  ];

  var GOAL_STATUS = ['Just started', 'In progress', 'Waiting on someone else', 'Stuck — needs help', 'Achieved', 'Paused'];
  var LOG_TYPES = ['Street outreach', 'Phone call', 'Office visit', 'Shelter visit', 'Appointment', 'Transportation', 'Follow-up', 'Wellness check', 'Other'];
  var REFERRAL_STATUS = ['Referred', 'Appointment set', 'Attended', 'Enrolled', 'Waitlisted', 'Declined', 'No longer needed'];
  var DOC_STATUS = [
    { v: 'unknown', t: 'Unknown' }, { v: 'have', t: 'Has it' }, { v: 'need', t: 'Needs it' },
    { v: 'applied', t: 'Applied for' }, { v: 'lost', t: 'Lost / stolen' }
  ];

  var TABS = [
    { k: 'overview', t: 'Overview' },
    { k: 'plan',     t: 'Plan & next steps' },
    { k: 'stay',     t: 'Where they stay' },
    { k: 'goals',    t: 'Goals' },
    { k: 'story',    t: 'My Story' },
    { k: 'needs',    t: 'Needs & documents' },
    { k: 'log',      t: 'History' },
    { k: 'doc',      t: 'Documentation' }
  ];

  /* ----- state --------------------------------------------------------- */

  var state = {
    view: 'today',
    helpTab: 'app',
    personId: null,
    tab: 'overview',
    search: '',
    filter: '',
    sort: 'updated',
    doc: {
      preset: 'full',
      sections: Doc.PRESETS.full.on.slice(),
      email: ''
    }
  };

  var esc = Doc.esc, has = Doc.has;
  var root, toastTimer;

  /* ----- tiny helpers -------------------------------------------------- */

  function el(id) { return document.getElementById(id); }

  function toast(msg, ms) {
    var t = el('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.style.display = 'none'; }, ms || 2600);
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  function person() { return Store.get(state.personId); }

  function initials(p) {
    var n = Doc.shortName(p);
    if (n === 'Unnamed record') return '?';
    return n.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  function avatar(p, cls) {
    if (has(p.photo)) {
      return '<div class="avatar ' + (cls || '') + '"><img src="' + p.photo + '" alt=""></div>';
    }
    return '<div class="avatar ' + (cls || '') + '">' + esc(initials(p)) + '</div>';
  }

  function lastContact(p) {
    var dates = (p.log || []).map(function (l) { return l.date; }).filter(has).sort();
    return dates.length ? dates[dates.length - 1] : '';
  }

  function activeGoals(p) {
    return (p.goals || []).filter(function (g) { return g.status !== 'Achieved' && g.status !== 'Paused'; });
  }

  function opts(list, current, placeholder) {
    var out = '<option value="">' + esc(placeholder || '— select —') + '</option>';
    list.forEach(function (o) {
      var v = typeof o === 'object' ? o.v : o;
      var t = typeof o === 'object' ? o.t : o;
      out += '<option value="' + esc(v) + '"' + (String(current) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>';
    });
    return out;
  }

  function field(label, inner, hint) {
    return '<div class="field"><label>' + esc(label) + '</label>' + inner +
      (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>';
  }

  function text(label, bind, value, o) {
    o = o || {};
    return field(label, '<input type="' + (o.type || 'text') + '" data-bind="' + bind + '" value="' +
      esc(value || '') + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '>', o.hint);
  }

  function area(label, bind, value, o) {
    o = o || {};
    return field(label, '<textarea data-bind="' + bind + '"' + (o.tall ? ' class="tall"' : '') +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') +
      (o.rows ? ' rows="' + o.rows + '"' : '') + '>' + esc(value || '') + '</textarea>', o.hint);
  }

  function select(label, bind, value, list, o) {
    o = o || {};
    return field(label, '<select data-bind="' + bind + '">' + opts(list, value, o.placeholder) + '</select>', o.hint);
  }

  function check(label, bind, value) {
    return '<label class="checkline"><input type="checkbox" data-bind="' + bind + '"' +
      (value ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
  }

  function chipGroup(label, listName, options, chosen, hint) {
    var body = options.map(function (o) {
      var on = (chosen || []).indexOf(o) !== -1;
      return '<button type="button" class="chip' + (on ? ' on' : '') +
        '" data-action="chip" data-list="' + esc(listName) + '" data-value="' + esc(o) + '" aria-pressed="' +
        on + '">' + (on ? '✓ ' : '') + esc(o) + '</button>';
    }).join('');
    return '<div class="field"><label>' + esc(label) + '</label><div class="chips">' + body + '</div>' +
      (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>';
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
        if (rows[i].id === parts[2]) { rows[i][parts[3]] = value; break; }
      }
    } else {
      var path = bind.split('.');
      var target = p;
      for (var j = 0; j < path.length - 1; j++) {
        if (!target[path[j]]) target[path[j]] = {};
        target = target[path[j]];
      }
      target[path[path.length - 1]] = value;
    }
    Store.touch(p);
    refreshHeaderBits();
  }

  // Keeps the title bar and the live packet preview in step while typing,
  // without redrawing the form underneath the cursor.
  function refreshHeaderBits() {
    var p = person();
    if (!p) return;
    var t = el('person-title');
    if (t) t.textContent = Doc.fullName(p);
    var prev = el('doc-preview');
    if (prev) {
      prev.innerHTML = Doc.packetHTML(p, { sections: state.doc.sections, settings: Store.settings() });
    }
  }

  /* ----- photo ---------------------------------------------------------- */

  // Photos are downscaled before storage: a full phone capture is several
  // megabytes and would exhaust the browser's quota within a few records.
  function readPhoto(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var MAX = 900;
        var w = img.width, h = img.height;
        if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        try {
          cb(canvas.toDataURL('image/jpeg', 0.75));
        } catch (err) {
          cb(e.target.result);
        }
      };
      img.onerror = function () { toast('That file could not be read as an image.'); };
      img.src = e.target.result;
    };
    reader.onerror = function () { toast('Could not read that file.'); };
    reader.readAsDataURL(file);
  }

  /* ----- files ---------------------------------------------------------- */

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function copyText(str) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(str).then(
        function () { toast('Copied to the clipboard.'); },
        function () { legacyCopy(str); }
      );
    } else {
      legacyCopy(str);
    }
  }

  function legacyCopy(str) {
    var ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    toast(ok ? 'Copied to the clipboard.' : 'Could not copy — select the text and copy manually.');
  }

  function safeFile(name) {
    return String(name).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'record';
  }

  /* ====================================================================
     VIEWS
     ==================================================================== */

  function render() {
    var html;
    if (state.view === 'dashboard') html = viewDashboard();
    else if (state.view === 'today') html = viewToday();
    else if (state.view === 'people') html = viewPeople();
    else if (state.view === 'person') html = viewPerson();
    else if (state.view === 'settings') html = viewSettings();
    else if (state.view === 'help') html = viewHelp();
    else html = viewDashboard();

    root.innerHTML = html;
    document.querySelectorAll('.nav button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === state.view ||
        (state.view === 'person' && b.dataset.view === 'people'));
    });
    var org = el('brand-org');
    if (org) org.textContent = Store.settings().orgName || 'Local records · nothing is uploaded';
    window.scrollTo(0, 0);
  }


  /* ==================================================================
     Small chart primitives.

     Hand-drawn SVG rather than a charting library: the app loads nothing
     from the internet, and these are simple enough that a dependency
     would cost more than it saves. Every chart also states its numbers in
     text, so it still reads on a screen reader and in grayscale print.
     ================================================================== */

  function barRow(label, n, max, note) {
    var pct = max > 0 ? Math.round((n / max) * 100) : 0;
    return '<div class="chart-row">' +
      '<span class="chart-label">' + esc(label) + '</span>' +
      '<span class="chart-track"><i style="width:' + pct + '%"></i></span>' +
      '<span class="chart-n">' + n + '</span>' +
      (note ? '<span class="chart-note">' + esc(note) + '</span>' : '') +
      '</div>';
  }

  // Contacts per week for the last 12 weeks.
  function sparkline(people) {
    var weeks = 12, buckets = [], i;
    for (i = 0; i < weeks; i++) buckets.push(0);
    var now = Date.now();
    people.forEach(function (p) {
      (p.log || []).forEach(function (l) {
        if (!has(l.date)) return;
        var t = new Date(l.date + 'T00:00:00').getTime();
        if (isNaN(t)) return;
        var wk = Math.floor((now - t) / (7 * 86400000));
        if (wk >= 0 && wk < weeks) buckets[weeks - 1 - wk]++;
      });
    });
    var max = Math.max.apply(null, buckets.concat([1]));
    var total = buckets.reduce(function (a, b) { return a + b; }, 0);
    var w = 100, hgt = 28, step = w / (weeks - 1);
    var pts = buckets.map(function (v, ix) {
      return (ix * step).toFixed(1) + ',' + (hgt - (v / max) * hgt).toFixed(1);
    }).join(' ');
    var area = '0,' + hgt + ' ' + pts + ' ' + w + ',' + hgt;

    return '<div class="spark">' +
      '<svg viewBox="0 0 100 28" preserveAspectRatio="none" role="img" ' +
      'aria-label="Contacts per week over the last twelve weeks. Total ' + total + '.">' +
      '<polygon points="' + area + '" class="spark-fill"></polygon>' +
      '<polyline points="' + pts + '" class="spark-line"></polyline>' +
      '</svg>' +
      '<div class="spark-foot"><span>12 weeks ago</span><span>' + total +
      ' contacts logged</span><span>this week</span></div>' +
      '</div>';
  }

  function countBy(people, get) {
    var map = {};
    people.forEach(function (p) {
      var vals = get(p);
      if (!Array.isArray(vals)) vals = has(vals) ? [vals] : [];
      vals.forEach(function (v) { if (has(v)) map[v] = (map[v] || 0) + 1; });
    });
    return Object.keys(map).map(function (k) { return { k: k, n: map[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  /* ---------- dashboard ---------- */

  function viewDashboard() {
    var all = Store.all();
    var people = all.filter(function (p) { return !p.archived; });
    var s = Store.settings();

    if (!people.length) return viewDashboardEmpty();

    var goals = people.reduce(function (n, p) { return n + activeGoals(p).length; }, 0);
    var achieved = people.reduce(function (n, p) {
      return n + (p.goals || []).filter(function (g) { return g.status === 'Achieved'; }).length;
    }, 0);
    var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    var contacts = people.reduce(function (n, p) {
      return n + (p.log || []).filter(function (l) { return l.date >= weekAgo; }).length;
    }, 0);
    var housed = people.filter(function (p) { return has(p.housedDate); }).length;
    var engaged = people.filter(function (p) { return has(p.engagementDate); }).length;
    var withId = people.filter(function (p) { return Flow.coreDocsHeld(p).hasId; }).length;
    var chronic = people.filter(function (p) { return Flow.chronicSignal(p).qualifies; }).length;

    var h = '';
    h += '<div class="page-head"><h1>Overview</h1>' +
      '<button class="btn primary" data-action="new-person">+ New person</button></div>';

    h += sampleBanner();

    /* --- headline numbers --- */
    h += '<div class="grid cols-4 mb16">' +
      stat(people.length, 'people') +
      stat(contacts, 'contacts this week') +
      stat(goals, 'active goals') +
      stat(achieved, 'goals achieved') +
      '</div>';

    /* --- where the caseload is --- */
    var byStage = {};
    people.forEach(function (p) {
      var k = Flow.stageOf(p);
      byStage[k] = (byStage[k] || 0) + 1;
    });
    var stageMax = Math.max.apply(null, Flow.STAGES.map(function (st) { return byStage[st.k] || 0; }).concat([1]));

    h += '<div class="card"><div class="card-head"><h2>Where the caseload is</h2></div>' +
      '<p class="section-hint">Worked out from each record, not entered by hand. A pile-up at one ' +
      'stage is usually a bottleneck worth naming — most caseloads stall at paperwork.</p>' +
      Flow.STAGES.map(function (st) {
        return barRow(st.t, byStage[st.k] || 0, stageMax);
      }).join('') +
      '</div>';

    /* --- contact rhythm --- */
    h += '<div class="card"><div class="card-head"><h2>Contact over time</h2></div>' +
      '<p class="section-hint">Showing up repeatedly is the intervention. This is the shape of that.</p>' +
      sparkline(people) +
      '</div>';

    /* --- outcomes worth reporting --- */
    h += '<div class="card"><div class="card-head"><h2>Progress worth reporting</h2></div>' +
      '<p class="section-hint">The numbers a funder or a board asks for, without anyone having to ' +
      'count them by hand.</p>' +
      '<div class="grid cols-2">' +
      '<div>' + barRow('Engaged', engaged, people.length, 'of ' + people.length) +
      barRow('Photo ID in hand', withId, people.length, 'of ' + people.length) + '</div>' +
      '<div>' + barRow('Housed', housed, people.length, 'of ' + people.length) +
      barRow('May qualify for PSH', chronic, people.length, 'chronic definition') + '</div>' +
      '</div>' +
      (chronic ? '<div class="notice mb0">' + Flow.plural(chronic, 'person', 'people') +
        ' may meet the chronic homelessness definition. That is the gate to permanent supportive ' +
        'housing — worth raising with your coordinated entry lead.</div>' : '') +
      '</div>';

    /* --- needs and living situations --- */
    var needs = countBy(people, function (p) { return p.needs; }).slice(0, 8);
    var situations = countBy(people, function (p) { return p.stay.situation; }).slice(0, 8);
    var needMax = needs.length ? needs[0].n : 1;
    var sitMax = situations.length ? situations[0].n : 1;

    h += '<div class="grid cols-2">';
    h += '<div class="card"><div class="card-head"><h2>What people need</h2></div>' +
      (needs.length
        ? needs.map(function (r) { return barRow(r.k, r.n, needMax); }).join('')
        : '<p class="muted mb0">No needs recorded yet.</p>') +
      '</div>';
    h += '<div class="card"><div class="card-head"><h2>Where people stay</h2></div>' +
      (situations.length
        ? situations.map(function (r) { return barRow(r.k, r.n, sitMax); }).join('')
        : '<p class="muted mb0">No living situations recorded yet.</p>') +
      '</div>';
    h += '</div>';

    /* --- recent --- */
    var recent = people.slice().sort(function (a, b) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }).slice(0, 6);

    h += '<div class="card"><div class="card-head"><h2>Recently updated</h2></div>' +
      recent.map(function (p) {
        return '<div class="today-row">' + avatar(p, 'sm') +
          '<div class="tr-body">' +
          '<button class="tr-name" data-action="goto" data-id="' + p.id + '" data-tab="overview">' +
          esc(Doc.shortName(p)) + '</button>' +
          '<div class="small faint">' + esc(Flow.stageMeta(Flow.stageOf(p)).t) +
          (lastContact(p) ? ' · last seen ' + esc(Flow.agoPhrase(Flow.daysAgo(lastContact(p)))) : '') +
          '</div></div>' +
          (p.isSample ? '<span class="badge">sample</span>' : '') +
          '</div>';
      }).join('') +
      '</div>';

    h += privacyNotice();
    return h;
  }

  // First run: the app cannot show a caseload it does not have, so offer one.
  function viewDashboardEmpty() {
    return '<div class="page-head"><h1>Overview</h1></div>' +
      '<div class="card empty"><div class="empty-mark" aria-hidden="true">🏠</div>' +
      '<h2>No records yet</h2>' +
      '<p class="muted">Start by adding the first person you meet. Fill in as little or as much ' +
      'as they are willing to share — nothing in this app is required.</p>' +
      '<div class="btn-row center-row">' +
      '<button class="btn primary" data-action="new-person">+ Add the first person</button>' +
      '<button class="btn" data-action="load-sample">Explore with sample data</button>' +
      '</div>' +
      '<p class="small faint mt16 mb0">The sample caseload is six invented people who between them ' +
      'show every part of the app working. They are badged as samples and can be removed in one click.</p>' +
      '</div>' +
      privacyNotice();
  }

  // Shown wherever sample records are present, so they are never mistaken
  // for real ones.
  function sampleBanner() {
    if (!Store.hasSamples()) return '';
    return '<div class="notice warn sample-banner">' +
      '<strong>Sample records are loaded.</strong> Six invented people, badged <span class="badge">sample</span>, ' +
      'so you can see the app working. They are not real. ' +
      '<button class="btn sm" data-action="clear-sample">Remove sample records</button></div>';
  }

  function stat(n, k) {
    return '<div class="stat"><div class="n">' + n + '</div><div class="k">' + esc(k) + '</div></div>';
  }

  function privacyNotice() {
    return '<div class="notice mt16">🔒 <strong>Everything here stays on this device.</strong> ' +
      'There is no account and no server — records live in this browser\'s local storage. ' +
      'Use <a href="#" data-action="go-settings">Settings → Backup</a> regularly, ' +
      'because clearing your browser data will erase these records.</div>';
  }

  function personRow(p) {
    var sub = [];
    if (has(p.stay && p.stay.situation)) sub.push(p.stay.situation);
    if (Doc.locationLine(p)) sub.push(Doc.locationLine(p));
    var lc = lastContact(p);
    var ag = activeGoals(p).length;
    return '<button class="person-card" data-action="open-person" data-id="' + p.id + '">' +
      avatar(p) +
      '<div class="who"><div class="nm">' + esc(Doc.shortName(p)) + '</div>' +
      '<div class="sub">' + esc(sub.join(' · ') || 'No location recorded') + '</div></div>' +
      '<div class="meta">' +
      (ag ? '<span class="badge accent">' + ag + ' goal' + (ag === 1 ? '' : 's') + '</span>' : '') +
      '<span class="badge' + (lc ? '' : ' warn') + '">' + (lc ? 'Seen ' + esc(Doc.fmtDate(lc)) : 'No contact logged') + '</span>' +
      '</div></button>';
  }

  /* ---------- people list ---------- */

  function viewPeople() {
    var people = Store.all().slice();
    var q = state.search.toLowerCase().trim();

    if (q) {
      people = people.filter(function (p) {
        var hay = [
          p.firstName, p.lastName, p.preferredName, p.caseNumber, p.phone,
          p.stay && p.stay.locationName, p.stay && p.stay.crossStreets, p.stay && p.stay.city,
          p.stay && p.stay.situation, p.story && p.story.text, p.generalNotes,
          (p.goals || []).map(function (g) { return g.title; }).join(' '),
          (p.needs || []).join(' '), (p.tags || []).join(' ')
        ].filter(has).join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
    if (state.filter) {
      people = people.filter(function (p) { return (p.stay && p.stay.situation) === state.filter; });
    }

    people.sort(function (a, b) {
      if (state.sort === 'name') return Doc.shortName(a).localeCompare(Doc.shortName(b));
      if (state.sort === 'contact') return String(lastContact(b)).localeCompare(String(lastContact(a)));
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });

    var h = '';
    h += '<div class="card-head"><h1 class="mb0">People</h1><div class="spacer"></div>' +
      '<button class="btn" data-action="export-csv">Export list (CSV)</button>' +
      '<button class="btn primary" data-action="new-person">+ New person</button></div>';

    h += '<div class="toolbar">' +
      '<div class="search"><input type="search" id="search" placeholder="Search name, place, goal, note…" value="' + esc(state.search) + '"></div>' +
      '<select id="filter">' + opts(SITUATIONS, state.filter, 'All living situations') + '</select>' +
      '<select id="sort">' +
      '<option value="updated"' + (state.sort === 'updated' ? ' selected' : '') + '>Recently updated</option>' +
      '<option value="contact"' + (state.sort === 'contact' ? ' selected' : '') + '>Recently contacted</option>' +
      '<option value="name"' + (state.sort === 'name' ? ' selected' : '') + '>Name (A–Z)</option>' +
      '</select></div>';

    if (!people.length) {
      h += '<div class="empty"><span class="big">🔍</span><h3>Nothing matches</h3>' +
        '<p class="muted mb0">' + (Store.all().length ? 'Try a different search or filter.' : 'No records yet — add the first person.') + '</p></div>';
      return h;
    }

    h += '<p class="section-hint">' + people.length + ' of ' + Store.all().length + ' record' + (Store.all().length === 1 ? '' : 's') + '</p>';
    h += '<div class="person-list">' + people.map(personRow).join('') + '</div>';
    return h;
  }

  /* ---------- person ---------- */

  function viewPerson() {
    var p = person();
    if (!p) { state.view = 'people'; return viewPeople(); }

    var h = '';
    h += '<button class="btn ghost sm mb16" data-action="go-people">← All people</button>';

    h += '<div class="person-head">' + avatar(p, 'lg') +
      '<div class="info"><h1 id="person-title">' + esc(Doc.fullName(p)) + '</h1>' +
      '<div class="sub">' + esc([
        p.pronouns,
        Doc.age(p.dob) ? 'age ' + Doc.age(p.dob) : '',
        p.stay && p.stay.situation,
        Doc.locationLine(p)
      ].filter(has).join(' · ') || 'No details recorded yet') + '</div>' +
      '<div class="badges">' +
      '<span class="badge stage">' + esc(Flow.stageMeta(Flow.stageOf(p)).t) + '</span>' +
      (activeGoals(p).length ? '<span class="badge accent">' + activeGoals(p).length + ' active goal' + (activeGoals(p).length === 1 ? '' : 's') + '</span>' : '') +
      (lastContact(p) ? '<span class="badge">Last seen ' + esc(Doc.fmtDate(lastContact(p))) + '</span>' : '<span class="badge warn">No contact logged</span>') +
      (p.consent && p.consent.dataConsent ? '<span class="badge ok">Consent recorded</span>' : '<span class="badge warn">No consent recorded</span>') +
      '</div></div>' +
      '<div class="btn-row"><button class="btn" data-action="quick-log">＋ Log contact</button>' +
      '<button class="btn primary" data-action="tab" data-tab="doc">🖨 Documentation</button></div>' +
      '</div>';

    h += '<div class="tabs">' + TABS.map(function (t) {
      return '<button data-action="tab" data-tab="' + t.k + '"' +
        (state.tab === t.k ? ' class="active"' : '') + '>' + esc(t.t) + '</button>';
    }).join('') + '</div>';

    if (state.tab === 'overview') h += tabOverview(p);
    else if (state.tab === 'plan') h += tabPlan(p);
    else if (state.tab === 'stay') h += tabStay(p);
    else if (state.tab === 'goals') h += tabGoals(p);
    else if (state.tab === 'story') h += tabStory(p);
    else if (state.tab === 'needs') h += tabNeeds(p);
    else if (state.tab === 'log') h += tabLog(p);
    else if (state.tab === 'doc') h += tabDoc(p);

    return h;
  }

  function tabOverview(p) {
    var h = '';

    h += '<div class="card"><div class="card-head"><h2>Photo</h2></div>' +
      '<p class="section-hint">Ask before taking a photo, and record their consent below. A photo helps a team recognise someone, and helps reunite people with services that have met them before.</p>' +
      '<div class="photo-block"><div class="photo-frame">' +
      (has(p.photo)
        ? '<img src="' + p.photo + '" alt="Photo of ' + esc(Doc.shortName(p)) + '">'
        : '<div class="placeholder"><span class="big">📷</span>No photo yet</div>') +
      '</div><div style="flex:1;min-width:220px">' +
      '<div class="btn-row mb16">' +
      '<button class="btn" data-action="photo-pick">Choose a photo</button>' +
      '<button class="btn" data-action="photo-camera">Use camera</button>' +
      (has(p.photo) ? '<button class="btn danger" data-action="photo-clear">Remove</button>' : '') +
      '</div>' +
      '<input type="file" id="photo-input" accept="image/*" style="display:none">' +
      '<input type="file" id="photo-camera-input" accept="image/*" capture="environment" style="display:none">' +
      (has(p.photoTakenAt) ? '<p class="small faint">Taken ' + esc(Doc.fmtDate(p.photoTakenAt)) + '</p>' : '') +
      '<p class="small faint mb0">Photos are shrunk before saving so the app stays fast, and they never leave this device.</p>' +
      '</div></div></div>';

    h += '<div class="card"><div class="card-head"><h2>Who they are</h2></div>' +
      '<div class="grid cols-2">' +
      '<div>' + text('First name', 'firstName', p.firstName) + '</div>' +
      '<div>' + text('Last name', 'lastName', p.lastName) + '</div>' +
      '<div>' + text('Goes by', 'preferredName', p.preferredName, { hint: 'The name they want to be called. This is what the app shows.' }) + '</div>' +
      '<div>' + text('Pronouns', 'pronouns', p.pronouns, { placeholder: 'he/him, she/her, they/them' }) + '</div>' +
      '<div>' + text('Date of birth', 'dob', p.dob, { type: 'date' }) + '</div>' +
      '<div>' + text('Languages spoken', 'languages', p.languages) + '</div>' +
      '<div>' + text('Phone', 'phone', p.phone, { type: 'tel', hint: 'Include whose phone it is if it is not their own.' }) + '</div>' +
      '<div>' + text('Email', 'email', p.email, { type: 'email' }) + '</div>' +
      '<div>' + text('Case / client number', 'caseNumber', p.caseNumber) + '</div>' +
      '<div>' + field('Also', check('Veteran', 'veteran', p.veteran) + check('Reports a disability', 'disability', p.disability)) + '</div>' +
      '</div>' +
      area('General notes', 'generalNotes', p.generalNotes, { placeholder: 'Anything a colleague meeting this person should know.' }) +
      '</div>';

    var c = p.consent || {};
    h += '<div class="card"><div class="card-head"><h2>Consent</h2></div>' +
      '<p class="section-hint">Recording consent protects the person. Ask plainly what they are comfortable with, and note it here.</p>' +
      check('They agreed to have this information written down', 'consent.dataConsent', c.dataConsent) +
      check('They agreed to a photo', 'consent.photoConsent', c.photoConsent) +
      check('They agreed for their story to be shared with services', 'consent.storyConsent', c.storyConsent) +
      '<div class="grid cols-2 mt16">' +
      '<div>' + text('Signed / agreed by', 'consent.signedName', c.signedName) + '</div>' +
      '<div>' + text('Date', 'consent.signedDate', c.signedDate, { type: 'date' }) + '</div>' +
      '</div></div>';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">Danger zone</h3></div>' +
      '<p class="section-hint">Deleting a record cannot be undone.</p>' +
      '<button class="btn danger" data-action="delete-person">Delete this record</button></div>';

    return h;
  }

  function tabStay(p) {
    var s = p.stay || {};
    var h = '';

    h += '<div class="card"><div class="card-head"><h2>Where they stay</h2></div>' +
      '<p class="section-hint">Describe the place well enough that a colleague could find them again — and note anything about safety before someone approaches.</p>' +
      select('Living situation', 'stay.situation', s.situation, SITUATIONS) +
      '<div class="grid cols-2">' +
      '<div>' + text('Place / landmark', 'stay.locationName', s.locationName, { placeholder: 'Behind the library, Riverside camp, blue van' }) + '</div>' +
      '<div>' + text('Cross streets', 'stay.crossStreets', s.crossStreets, { placeholder: '4th & Oak' }) + '</div>' +
      '<div>' + text('City', 'stay.city', s.city) + '</div>' +
      '<div>' + text('State', 'stay.state', s.state) + '</div>' +
      '<div>' + text('ZIP', 'stay.zip', s.zip) + '</div>' +
      '<div>' + text('Area / neighborhood', 'stay.area', s.area) + '</div>' +
      '</div>' +
      field('GPS coordinates',
        '<div class="btn-row"><button class="btn" data-action="gps">📍 Use my current location</button>' +
        '<span class="small muted">' + (has(s.gpsLat) ? esc(s.gpsLat + ', ' + s.gpsLng) + (has(s.gpsAt) ? ' · ' + esc(Doc.fmtDate(s.gpsAt)) : '') : 'Not captured') + '</span>' +
        (has(s.gpsLat) ? '<button class="btn sm ghost" data-action="gps-clear">Clear</button>' : '') + '</div>',
        'Only works when the app is served over http/https, and only records where you are standing now.') +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>How long, and when to find them</h2></div>' +
      '<div class="grid cols-2">' +
      '<div>' + text('At this spot since', 'stay.sinceDate', s.sinceDate, { type: 'date', hint: has(s.sinceDate) ? 'About ' + Doc.daysSince(s.sinceDate) : '' }) + '</div>' +
      '<div>' + text('Or describe how long', 'stay.timeAtLocation', s.timeAtLocation, { placeholder: 'A few weeks, since the summer' }) + '</div>' +
      '<div>' + text('Homeless since', 'stay.homelessSince', s.homelessSince, { type: 'date', hint: has(s.homelessSince) ? 'About ' + Doc.daysSince(s.homelessSince) : 'Approximate is fine.' }) + '</div>' +
      '<div>' + text('Best time / day to find them', 'stay.bestTimeToFind', s.bestTimeToFind, { placeholder: 'Mornings before 9, weekdays' }) + '</div>' +
      '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>Who is with them</h2></div>' +
      '<p class="section-hint">This decides which services can actually help — many shelters separate partners, turn away pets, or cannot take children.</p>' +
      check('Staying with a partner', 'stay.withPartner', s.withPartner) +
      check('Staying with children', 'stay.withChildren', s.withChildren) +
      (s.withChildren ? text('How many children', 'stay.childrenCount', s.childrenCount, { type: 'number' }) : '') +
      check('Has pets', 'stay.withPets', s.withPets) +
      (s.withPets ? text('Pet details', 'stay.petDetails', s.petDetails, { placeholder: 'One dog, medium size' }) : '') +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>Safety & other notes</h2></div>' +
      area('Safety notes', 'stay.safetyNotes', s.safetyNotes, { placeholder: 'Approach from the front, dog is protective, prefers not to be visited after dark…' }) +
      area('Anything else about where they stay', 'stay.stayNotes', s.stayNotes) +
      '</div>';

    return h;
  }

  function tabGoals(p) {
    var h = '';
    h += '<div class="card-head"><h2 class="mb0">What they are trying to accomplish</h2><div class="spacer"></div>' +
      '<button class="btn primary" data-action="add-goal">+ Add a goal</button></div>';
    h += '<p class="section-hint">Use their words, not the system\'s. "Get my daughter back" is a better goal than "family reunification services".</p>';

    if (!has(p.goals)) {
      return h + '<div class="empty"><span class="big">🎯</span><h3>No goals yet</h3>' +
        '<p class="muted">Ask what they are working toward, however small.</p>' +
        '<button class="btn primary" data-action="add-goal">+ Add the first goal</button></div>';
    }

    h += p.goals.map(function (g) {
      var b = 'list:goals:' + g.id + ':';
      var statusClass = g.status === 'Achieved' ? 'ok' : (g.status === 'Stuck — needs help' ? 'danger' : 'accent');
      return '<div class="item">' +
        '<div class="item-head">' +
        '<span class="badge ' + statusClass + '">' + esc(g.status || 'No status') + '</span>' +
        '<div class="spacer" style="flex:1"></div>' +
        '<button class="btn sm ghost" data-action="move-goal" data-id="' + g.id + '" data-dir="-1" title="Move up">↑</button>' +
        '<button class="btn sm ghost" data-action="move-goal" data-id="' + g.id + '" data-dir="1" title="Move down">↓</button>' +
        '<button class="btn sm danger" data-action="del-goal" data-id="' + g.id + '">Delete</button>' +
        '</div>' +
        text('Goal', b + 'title', g.title, { placeholder: 'What do they want to accomplish?' }) +
        '<div class="row">' +
        '<div>' + select('Area of life', b + 'category', g.category, GOAL_CATEGORIES) + '</div>' +
        '<div>' + select('How it is going', b + 'status', g.status, GOAL_STATUS) + '</div>' +
        '</div>' +
        area('Why it matters to them', b + 'why', g.why, { rows: 2, placeholder: 'In their own words.' }) +
        area('Next steps', b + 'steps', g.steps, { rows: 2, placeholder: 'The very next thing that has to happen.' }) +
        '<div class="row">' +
        '<div>' + text('Target date', b + 'targetDate', g.targetDate, { type: 'date' }) + '</div>' +
        '<div>' + text('Support needed', b + 'support', g.support, { placeholder: 'A ride, a copy of their ID, a caseworker' }) + '</div>' +
        '</div>' +
        area('Notes / progress', b + 'notes', g.notes, { rows: 2 }) +
        '</div>';
    }).join('');

    return h;
  }

  function tabStory(p) {
    var s = p.story || {};
    var h = '';

    h += '<div class="card">' +
      '<div class="card-head"><h2 class="mb0">My Story</h2></div>' +
      '<p class="section-hint">This section belongs to the person, not the file. Write what they say, the way they say it. ' +
      'It is the part of a record that reminds anyone reading it that they are meeting a person, not a case.</p>' +
      text('A line in their own words', 'story.quote', s.quote, {
        placeholder: 'Something they said that captures it',
        hint: 'Shown as a pull quote at the top of the story on printed documents.'
      }) +
      area('Their story', 'story.text', s.text, {
        tall: true,
        placeholder: 'How they came to be here, what happened along the way, what they want people to understand…'
      }) +
      '<div class="grid cols-2">' +
      '<div>' + area('Strengths & skills', 'story.strengths', s.strengths, { rows: 3, placeholder: 'Trades, experience, what they are good at, who they look after.' }) + '</div>' +
      '<div>' + area('Hopes', 'story.hopes', s.hopes, { rows: 3, placeholder: 'What a good year from now would look like.' }) + '</div>' +
      '</div>' +
      '</div>';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">How this was recorded</h3></div>' +
      check('Told in their own words (not summarised by a worker)', 'story.toldInOwnWords', s.toldInOwnWords) +
      check('They agreed this story can be shared with services', 'story.consentToShare', s.consentToShare) +
      '<div class="grid cols-2 mt16">' +
      '<div>' + text('Written down by', 'story.recordedBy', s.recordedBy || Store.settings().workerName) + '</div>' +
      '<div>' + text('Date recorded', 'story.recordedAt', s.recordedAt, { type: 'date' }) + '</div>' +
      '</div></div>';

    if (has(s.text) || has(s.quote)) {
      h += '<div class="card"><div class="card-head"><h3 class="mb0">How it will read</h3></div>' +
        (has(s.quote) ? '<div class="story-quote">“' + esc(s.quote) + '”</div>' : '') +
        '<div class="story-text">' + esc(s.text) + '</div></div>';
    }

    return h;
  }

  function tabNeeds(p) {
    var h = '';

    h += '<div class="card">' +
      chipGroup('What they need right now', 'needs', NEEDS, p.needs, 'Tap everything that applies.') +
      '</div>';

    h += '<div class="card">' +
      chipGroup('What is standing in the way', 'barriers', BARRIERS, p.barriers,
        'Naming barriers plainly is what makes a referral useful to the person receiving it.') +
      '</div>';

    h += '<div class="card">' +
      chipGroup('Benefits they already receive', 'benefits', BENEFITS, p.benefits) +
      '<div class="grid cols-2">' +
      '<div>' + text('Health insurance', 'insurance', p.insurance) + '</div>' +
      '<div>' + area('Health notes', 'healthNotes', p.healthNotes, { rows: 3, placeholder: 'Conditions, medications, allergies — only what they want recorded.' }) + '</div>' +
      '</div></div>';

    h += '<div class="card"><div class="card-head"><h2 class="mb0">Documents</h2><div class="spacer"></div>' +
      '<button class="btn" data-action="add-doc">+ Add document</button></div>' +
      '<p class="section-hint">Missing ID is the single most common thing that stalls a housing or benefits application. Tracking it makes the next step obvious.</p>';

    if (!has(p.documents)) {
      h += '<div class="empty"><span class="big">📄</span><p class="muted mb0">No documents tracked yet.</p></div>';
    } else {
      h += p.documents.map(function (d) {
        var b = 'list:documents:' + d.id + ':';
        var cls = d.status === 'have' ? 'ok' : (d.status === 'need' || d.status === 'lost' ? 'warn' : '');
        return '<div class="item"><div class="item-head">' +
          '<span class="badge ' + cls + '">' + esc(Doc.statusLabel(d.status)) + '</span>' +
          '<div class="spacer" style="flex:1"></div>' +
          '<button class="btn sm danger" data-action="del-doc" data-id="' + d.id + '">Remove</button></div>' +
          '<div class="row">' +
          '<div>' + text('Document', b + 'name', d.name) + '</div>' +
          '<div>' + select('Status', b + 'status', d.status, DOC_STATUS, { placeholder: 'Unknown' }) + '</div>' +
          '</div><div class="row">' +
          '<div>' + text('Notes', b + 'notes', d.notes, { placeholder: 'Where it is kept, what was applied for' }) + '</div>' +
          '<div>' + text('Expires', b + 'expires', d.expires, { type: 'date' }) + '</div>' +
          '</div></div>';
      }).join('');
    }
    h += '</div>';

    return h;
  }

  /* ==================================================================
     One chronological spine.

     Contacts, goals, milestones and referrals all carry dates but live in
     four different places, so nobody ever sees the shape of a person's
     arc. Merging them is the cheapest way to make a record feel like a
     story rather than a form — and it is often the first thing a worker
     covering someone else's caseload actually needs.
     ================================================================== */

  var EVENT_KINDS = {
    contact:   { icon: '•', cls: 'contact',   label: 'Contact' },
    milestone: { icon: '★', cls: 'milestone', label: 'Milestone' },
    goal:      { icon: '◆', cls: 'goal',      label: 'Goal' },
    referral:  { icon: '→', cls: 'referral',  label: 'Referral' },
    story:     { icon: '❝', cls: 'story',     label: 'Story' }
  };

  function timelineEvents(p) {
    var ev = [];
    function push(date, kind, title, detail) {
      if (!has(date)) return;
      ev.push({ date: date, kind: kind, title: title, detail: detail || '' });
    }

    (p.log || []).forEach(function (l) {
      push(l.date, 'contact', l.type || 'Contact',
        [l.notes, l.worker ? '— ' + l.worker : ''].filter(has).join(' '));
    });

    push(p.createdAt ? p.createdAt.slice(0, 10) : '', 'milestone', 'Record started', '');
    push(p.engagementDate, 'milestone', 'Began working together', 'Date of engagement');
    push(p.assessmentDate, 'milestone', 'Assessment completed', '');
    push(p.housedDate, 'milestone', 'Moved in', 'Keys in hand');
    push(p.consent.signedDate, 'milestone', 'Consent recorded',
      has(p.consent.signedName) ? 'Signed ' + p.consent.signedName : '');
    push(p.story.recordedAt, 'story', 'Story recorded',
      has(p.story.recordedBy) ? 'Written down by ' + p.story.recordedBy : '');

    (p.goals || []).forEach(function (g) {
      if (g.status === 'Achieved') {
        push(g.targetDate || (g.updatedAt || '').slice(0, 10), 'goal',
          'Achieved: ' + (g.title || 'goal'), g.notes);
      } else if (has(g.targetDate)) {
        push(g.targetDate, 'goal', 'Goal target: ' + (g.title || 'goal'), g.status);
      }
    });

    (p.referrals || []).forEach(function (r) {
      push(r.date, 'referral', (r.org || 'Referral') + (has(r.service) ? ' — ' + r.service : ''),
        r.status);
    });

    // Newest first: the recent past is what a worker needs before a visit.
    ev.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    return ev;
  }

  function timeline(p) {
    var ev = timelineEvents(p);
    if (!ev.length) {
      return '<div class="empty"><p class="muted mb0">Nothing dated yet. Log a contact and the ' +
        'timeline starts building itself.</p></div>';
    }

    var future = Flow.todayStr();
    return '<ol class="timeline">' + ev.map(function (e) {
      var k = EVENT_KINDS[e.kind] || EVENT_KINDS.contact;
      var ahead = e.date > future;
      return '<li class="tl ' + k.cls + (ahead ? ' ahead' : '') + '">' +
        '<span class="tl-dot" aria-hidden="true">' + k.icon + '</span>' +
        '<div class="tl-body">' +
        '<div class="tl-top">' +
        '<span class="tl-date">' + esc(Doc.fmtDate(e.date)) + '</span>' +
        '<span class="tl-ago">' + esc(ahead ? 'planned' : Flow.agoPhrase(Flow.daysAgo(e.date))) + '</span>' +
        '</div>' +
        '<div class="tl-title">' + esc(e.title) + '</div>' +
        (has(e.detail) ? '<p class="tl-detail">' + esc(e.detail) + '</p>' : '') +
        '</div></li>';
    }).join('') + '</ol>';
  }

  function tabLog(p) {
    var h = '';

    var evCount = timelineEvents(p).length;
    h += '<div class="card"><div class="card-head"><h2>Timeline</h2>' +
      '<span class="pill">' + evCount + '</span>' +
      '<div class="spacer"></div>' +
      '<button class="btn" data-action="quick-log">＋ Log contact</button></div>' +
      '<p class="section-hint">Everything dated on this record, newest first — contacts, ' +
      'milestones, goals and referrals on one spine.</p>' +
      timeline(p) +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2 class="mb0">Contact log</h2><div class="spacer"></div>' +
      '<button class="btn primary" data-action="add-log">+ Log a contact</button></div>' +
      '<p class="section-hint">A dated record of every time someone made contact — this is what proves continuity of care when an agency asks.</p>';

    if (!has(p.log)) {
      h += '<div class="empty"><span class="big">📝</span><p class="muted mb0">No contacts logged yet.</p></div>';
    } else {
      h += p.log.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      }).map(function (l) {
        var b = 'list:log:' + l.id + ':';
        return '<div class="item"><div class="item-head">' +
          '<span class="badge">' + esc(Doc.fmtDate(l.date) || 'No date') + '</span>' +
          '<span class="t">' + esc(l.type || '') + '</span>' +
          '<button class="btn sm danger" data-action="del-log" data-id="' + l.id + '">Delete</button></div>' +
          '<div class="row">' +
          '<div>' + text('Date', b + 'date', l.date, { type: 'date' }) + '</div>' +
          '<div>' + select('Type of contact', b + 'type', l.type, LOG_TYPES) + '</div>' +
          '</div>' +
          text('Worker', b + 'worker', l.worker) +
          area('What happened', b + 'notes', l.notes, { rows: 3 }) +
          '</div>';
      }).join('');
    }
    h += '</div>';

    h += '<div class="card"><div class="card-head"><h2 class="mb0">Referrals & services</h2><div class="spacer"></div>' +
      '<button class="btn" data-action="add-referral">+ Add referral</button></div>';

    if (!has(p.referrals)) {
      h += '<div class="empty"><span class="big">🤝</span><p class="muted mb0">No referrals recorded yet.</p></div>';
    } else {
      h += p.referrals.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      }).map(function (r) {
        var b = 'list:referrals:' + r.id + ':';
        var cls = r.status === 'Enrolled' || r.status === 'Attended' ? 'ok' :
          (r.status === 'Declined' ? '' : 'info');
        return '<div class="item"><div class="item-head">' +
          '<span class="badge ' + cls + '">' + esc(r.status || 'No status') + '</span>' +
          '<span class="t">' + esc(r.org || '') + '</span>' +
          '<button class="btn sm danger" data-action="del-referral" data-id="' + r.id + '">Delete</button></div>' +
          '<div class="row">' +
          '<div>' + text('Organization', b + 'org', r.org) + '</div>' +
          '<div>' + text('Service', b + 'service', r.service, { placeholder: 'Shelter bed, ID clinic, detox' }) + '</div>' +
          '</div><div class="row">' +
          '<div>' + text('Date', b + 'date', r.date, { type: 'date' }) + '</div>' +
          '<div>' + select('Status', b + 'status', r.status, REFERRAL_STATUS) + '</div>' +
          '</div>' +
          text('Contact there', b + 'contact', r.contact, { placeholder: 'Name and phone' }) +
          area('Notes', b + 'notes', r.notes, { rows: 2 }) +
          '</div>';
      }).join('');
    }
    h += '</div>';

    return h;
  }

  /* ---------- documentation ---------- */

  function tabDoc(p) {
    var h = '';
    h += '<div class="doc-layout">';

    /* controls */
    h += '<div class="doc-side"><div class="sticky">';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">What to include</h3></div>' +
      field('Start from', '<select id="doc-preset">' +
        Object.keys(Doc.PRESETS).map(function (k) {
          return '<option value="' + k + '"' + (state.doc.preset === k ? ' selected' : '') + '>' +
            esc(Doc.PRESETS[k].label) + '</option>';
        }).join('') + '</select>',
        'Pick a starting point, then tick sections on or off.') +
      Doc.SECTIONS.map(function (s) {
        var on = state.doc.sections.indexOf(s.key) !== -1;
        return '<label class="checkline"><input type="checkbox" data-action="doc-section" data-key="' +
          s.key + '"' + (on ? ' checked' : '') + '><span>' + esc(s.label) + '</span></label>';
      }).join('') +
      '</div>';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">Print</h3></div>' +
      '<div class="btn-row">' +
      '<button class="btn primary block" data-action="doc-print">🖨 Print this record</button></div>' +
      '<p class="small faint mt16 mb0">In the print dialog choose <strong>Save as PDF</strong> as the printer to get a file you can attach to an email.</p>' +
      '</div>';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">Email</h3></div>' +
      field('Send to (optional)',
        '<input type="email" id="doc-email" value="' + esc(state.doc.email) +
        '" placeholder="caseworker@agency.org">') +
      '<div class="btn-row">' +
      '<button class="btn primary block" data-action="doc-email">✉ Open in email app</button>' +
      '</div>' +
      '<p class="small faint mt16 mb0">This opens your normal email program with the record already written into the message. ' +
      'Long records get shortened to fit — for the whole thing, download the file below and attach it.</p>' +
      '</div>';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">Save a file</h3></div>' +
      '<div class="btn-row">' +
      '<button class="btn block" data-action="doc-html">Download as web page (.html)</button>' +
      '<button class="btn block" data-action="doc-txt">Download as plain text (.txt)</button>' +
      '<button class="btn block" data-action="doc-copy">Copy text to clipboard</button>' +
      '</div>' +
      '<p class="small faint mt16 mb0">The .html file keeps the photo and layout and opens on any computer. Attach it to an email, or open it and print from there.</p>' +
      '</div>';

    h += '</div></div>';

    /* preview */
    h += '<div><div class="card-head no-print"><h2 class="mb0">Preview</h2>' +
      '<div class="spacer"></div><span class="badge">' + state.doc.sections.length + ' sections</span></div>' +
      '<div class="doc-preview-wrap"><div id="doc-preview">' +
      Doc.packetHTML(p, { sections: state.doc.sections, settings: Store.settings() }) +
      '</div></div></div>';

    h += '</div>';
    return h;
  }

  /* ---------- settings ---------- */


  /* ==================================================================
     Plan & next steps — the workflow made visible.

     Every suggestion on these screens is generated by workflow.js from
     what is already in the record. Nothing here is a form to fill in for
     its own sake; if a prompt cannot be acted on, it should not appear.
     ================================================================== */

  var LEVELS = {
    urgent: { t: 'Needs attention', hint: 'Something is being lost right now.' },
    soon:   { t: 'This week',       hint: 'Worth planning into the next few days.' },
    ready:  { t: 'When the moment is right', hint: 'Only if the conversation gets there. Never a checklist to run at someone.' }
  };

  function meter(label, pct, hint) {
    return '<div class="meter">' +
      '<div class="meter-top"><span>' + esc(label) + '</span><span>' + pct + '%</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      (hint ? '<p class="small faint mb0 mt8">' + esc(hint) + '</p>' : '') +
      '</div>';
  }

  function stageTrack(p) {
    var ci = Flow.stageIndex(Flow.stageOf(p));
    return '<div class="stage-track">' + Flow.STAGES.map(function (st, i) {
      var cls = i < ci ? 'done' : (i === ci ? 'now' : 'todo');
      return '<div class="stage ' + cls + '"><span class="dot" aria-hidden="true"></span>' +
        '<span class="lbl">' + esc(st.t) + '</span></div>';
    }).join('') + '</div>';
  }

  function suggestionRow(who, x, showName) {
    return '<div class="sug ' + x.level + '">' +
      '<div class="sug-body">' +
      (showName ? '<div class="sug-who">' + esc(Doc.shortName(who)) + '</div>' : '') +
      '<div class="sug-title">' + esc(x.title) + '</div>' +
      '<p class="sug-why">' + esc(x.why) + '</p></div>' +
      '<button class="btn sm" data-action="goto" data-id="' + who.id + '" data-tab="' +
      esc(x.tab) + '">Open</button></div>';
  }

  function suggestionGroups(p, sug) {
    var h = '';
    ['urgent', 'soon', 'ready'].forEach(function (lvl) {
      var items = sug.filter(function (x) { return x.level === lvl; });
      if (!items.length) return;
      h += '<div class="sug-group">' +
        '<h3 class="sug-head ' + lvl + '">' + esc(LEVELS[lvl].t) +
        ' <span class="count">' + items.length + '</span></h3>' +
        '<p class="small faint mt0">' + esc(LEVELS[lvl].hint) + '</p>' +
        items.map(function (x) { return suggestionRow(p, x, false); }).join('') +
        '</div>';
    });
    return h;
  }

  function tabPlan(p) {
    var s = Store.settings();
    var cur = Flow.stageOf(p);
    var meta = Flow.stageMeta(cur);
    var sug = Flow.suggestions(p, s);
    var comp = Flow.completeness(p);
    var ch = Flow.chronicSignal(p);
    var hm = Flow.hmisReadiness(p);
    var dupes = Flow.duplicatesOf(p, Store.all());
    var h = '';

    if (dupes.length) {
      h += '<div class="notice warn"><strong>This may already be someone you know.</strong> ' +
        'A similar record exists: ' +
        dupes.map(function (d) {
          return '<a href="#" data-action="goto" data-id="' + d.id + '" data-tab="overview">' +
            esc(Doc.shortName(d)) + '</a>';
        }).join(', ') +
        '. Two workers meeting the same person on different nights is normal — worth checking ' +
        'before the histories drift apart.</div>';
    }

    h += '<div class="card"><div class="card-head"><h2>Where things stand</h2></div>' +
      stageTrack(p) +
      '<p class="stage-desc">' + esc(meta.d) + '</p>' +
      '<p class="section-hint">The stage moves on its own as milestones are recorded below, so it ' +
      'stays honest. Override it only when the record does not tell the whole story.</p>' +
      select('Stage (override)', 'stageOverride', p.stageOverride,
        Flow.STAGES.map(function (st) { return { v: st.k, t: st.t }; }),
        { placeholder: 'Work it out from the record (recommended)' }) +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>Next steps</h2>' +
      '<span class="pill">' + sug.length + '</span></div>';
    if (!sug.length) {
      h += '<p class="muted mb0">Nothing outstanding. The record is current and consent is on file.</p>';
    } else {
      h += '<p class="section-hint">Worked out from this record. These are prompts for you, not ' +
        'demands on them.</p>' + suggestionGroups(p, sug);
    }
    h += '</div>';

    h += '<div class="card"><div class="card-head"><h2>Plan the next visit</h2></div>' +
      '<p class="section-hint">Showing up when you said you would is most of the job. Anything ' +
      'planned here appears on the Today screen when it falls due.</p>' +
      '<div class="grid cols-2">' +
      '<div>' + text('Come back on', 'followUpDate', p.followUpDate, { type: 'date' }) + '</div>' +
      '<div>' + text('What for', 'followUpNote', p.followUpNote,
        { placeholder: 'Bring the ID paperwork' }) + '</div>' +
      '</div>' +
      '<div class="btn-row">' +
      '<button class="btn" data-action="mark-today" data-field="followUpDate">Plan for today</button>' +
      (has(p.followUpDate) ? '<button class="btn ghost" data-action="clear-field" data-field="followUpDate">Clear</button>' : '') +
      '<button class="btn primary" data-action="did-visit" data-id="' + p.id + '">Saw them today</button>' +
      '</div></div>';

    function milestone(label, fieldName, value, why) {
      return '<div class="milestone' + (has(value) ? ' set' : '') + '">' +
        '<div class="ms-top"><strong>' + esc(label) + '</strong>' +
        (has(value) ? '<span class="badge ok">' + esc(Doc.fmtDate(value)) + '</span>' : '<span class="badge">Not yet</span>') +
        '</div>' +
        '<p class="small faint">' + esc(why) + '</p>' +
        '<div class="btn-row">' +
        (has(value)
          ? '<button class="btn sm ghost" data-action="clear-field" data-field="' + fieldName + '">Clear</button>'
          : '<button class="btn sm" data-action="mark-today" data-field="' + fieldName + '">Mark today</button>') +
        '</div></div>';
    }

    h += '<div class="card"><div class="card-head"><h2>Milestones</h2></div>' +
      '<p class="section-hint">Dates that other services and funders ask for later, and that are ' +
      'almost impossible to reconstruct from memory.</p>' +
      '<div class="milestones">' +
      milestone('Date of engagement', 'engagementDate', p.engagementDate,
        'The day they began actively working with you, not the day you first said hello.') +
      milestone('Assessment date', 'assessmentDate', p.assessmentDate,
        'When your local coordinated entry assessment was completed.') +
      milestone('Moved in', 'housedDate', p.housedDate,
        'Keys in hand. The work changes to keeping the housing after this.') +
      '</div></div>';

    h += '<div class="card"><div class="card-head"><h2>Priority housing check</h2></div>' +
      '<p class="section-hint">Permanent supportive housing is usually gated on the ' +
      'chronically homeless definition: a disabling condition, plus a year of homelessness ' +
      'or four or more episodes in three years. Workers routinely miss that someone already qualifies.</p>';

    if (ch.unknown) {
      h += '<div class="notice">How long they have been homeless has not been recorded, so this ' +
        'cannot be worked out yet. Add it under <a href="#" data-action="goto" data-id="' + p.id +
        '" data-tab="stay">Where they stay</a>, or below.</div>';
    } else if (ch.qualifies) {
      h += '<div class="notice ok"><strong>May meet the definition.</strong> Recorded as ' +
        Math.round(ch.months) + ' months' + (ch.times ? ' across ' + ch.times + ' episodes' : '') +
        ', with a disabling condition. Worth raising with your coordinated entry lead — this is a ' +
        'prompt to check, not a determination.</div>';
    } else if (ch.close) {
      h += '<div class="notice warn">Close to the threshold (' + Math.round(ch.months) + ' months' +
        (ch.times ? ', ' + ch.times + ' episodes' : '') + ')' +
        (ch.disability ? '' : ', and no disabling condition is recorded') +
        '. Getting the history exact now saves re-interviewing them later.</div>';
    } else {
      h += '<div class="notice">Does not currently indicate chronic homelessness. Other housing ' +
        'routes still apply — this is one door, not the only one.</div>';
    }

    h += '<div class="grid cols-2">' +
      '<div>' + text('Months homeless (roughly)', 'hmis.homelessMonths', p.hmis.homelessMonths,
        { type: 'number', placeholder: '18' }) + '</div>' +
      '<div>' + text('Separate episodes in the last 3 years', 'hmis.homelessTimes', p.hmis.homelessTimes,
        { type: 'number', placeholder: '4' }) + '</div>' +
      '</div>' +
      check('A disabling condition is recorded', 'disability', p.disability) +
      '<p class="small faint mb0">Asked gently, and only once. "How long has this been going on?" ' +
      'gets there without making someone account for themselves.</p>' +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>What is recorded</h2></div>' +
      meter('Field basics', comp.basics.pct,
        comp.basics.missing.length
          ? 'Still to note: ' + comp.basics.missing.map(function (f) { return f.k; }).join(', ') + '.'
          : 'Everything the team needs to do the work is here.') +
      meter('Deeper details', comp.deeper.pct,
        comp.deeper.missing.length
          ? 'Blank is not failure. These come when trust does: ' +
            comp.deeper.missing.map(function (f) { return f.k; }).join(', ') + '.'
          : 'A full picture, in their words as well as yours.') +
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>If they are asked at intake</h2>' +
      '<span class="pill">' + hm.have + '/' + hm.total + '</span></div>' +
      '<p class="section-hint">This app is not an HMIS and does not report to anyone. But intake ' +
      'asks these same questions, and making someone recount the worst years of their life a second ' +
      'time because a form was blank is a harm worth avoiding. Fill them in as they come up naturally.</p>' +
      '<div class="hmis-grid">' +
      hm.rows.map(function (r) {
        return '<div class="hmis-row' + (r.have ? ' have' : '') + '">' +
          '<span class="tick" aria-hidden="true">' + (r.have ? '✓' : '·') + '</span>' +
          '<span class="hmis-t">' + esc(r.t) + (r.optional ? ' <span class="faint">(later)</span>' : '') + '</span>' +
          '<span class="hmis-id">' + esc(r.id) + '</span>' +
          (r.note ? '<p class="small faint mb0 hmis-note">' + esc(r.note) + '</p>' : '') +
          '</div>';
      }).join('') +
      '</div>' +
      '<div class="grid cols-2 mt16">' +
      '<div>' + text('Local HMIS or client ID', 'hmis.clientCode', p.hmis.clientCode,
        { placeholder: 'If they already have one' }) + '</div>' +
      '<div>' + text('Continuum of Care', 'hmis.coc', p.hmis.coc || s.coc,
        { placeholder: 'e.g. CA-600' }) + '</div>' +
      '<div>' + text('Gender (as they describe it)', 'hmis.gender', p.hmis.gender) + '</div>' +
      '<div>' + text('Race and ethnicity (as they describe it)', 'hmis.raceEthnicity', p.hmis.raceEthnicity) + '</div>' +
      '<div>' + select('Social Security number held elsewhere?', 'hmis.ssnOnFile', p.hmis.ssnOnFile,
        ['Yes - on file with an agency', 'No', 'They do not know', 'Prefer not to say'],
        { placeholder: '- not asked -' }) + '</div>' +
      '<div>' + text('Household', 'hmis.householdType', p.hmis.householdType,
        { placeholder: 'Alone, with partner, with children' }) + '</div>' +
      '</div>' +
      '<div class="notice"><strong>The Social Security number itself is deliberately not stored here.</strong> ' +
      'A phone in the field is the wrong place for it, and this record only needs to know whether it ' +
      'exists somewhere official.</div>' +
      area('Anything else intake will want', 'hmis.notes', p.hmis.notes, { rows: 2 }) +
      '</div>';

    return h;
  }

  /* ---------- Today: the shift screen ---------- */

  function greeting() {
    var hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function todayRow(entry, kind) {
    var p = entry.p;
    var note = '';
    if (kind === 'overdue') {
      note = 'Follow-up was due ' + Flow.agoPhrase(entry.days) +
        (has(p.followUpNote) ? ' - ' + p.followUpNote : '');
    } else if (kind === 'today') {
      note = has(p.followUpNote) ? p.followUpNote : 'Planned for today.';
    } else {
      note = 'Last contact ' + Flow.agoPhrase(entry.days) + '.';
    }

    return '<div class="today-row">' + avatar(p, 'sm') +
      '<div class="tr-body">' +
      '<button class="tr-name" data-action="goto" data-id="' + p.id + '" data-tab="plan">' +
      esc(Doc.shortName(p)) + '</button>' +
      '<div class="small faint">' + esc(note) + '</div>' +
      (has(Doc.locationLine(p)) ? '<div class="small">' + esc(Doc.locationLine(p)) + '</div>' : '') +
      '</div>' +
      '<div class="tr-actions">' +
      '<button class="btn sm primary" data-action="did-visit" data-id="' + p.id + '">Saw them</button>' +
      '</div></div>';
  }

  function viewToday() {
    var s = Store.settings();
    var sh = Flow.shift(Store.all(), s);
    var h = '';

    h += '<h1>' + esc(greeting()) + (has(s.workerName) ? ', ' + esc(s.workerName.split(' ')[0]) : '') + '</h1>';
    h += '<p class="lede">' + esc(new Date().toLocaleDateString(undefined,
      { weekday: 'long', day: 'numeric', month: 'long' })) + ' - ' +
      Flow.plural(sh.total, 'person', 'people') + ' on your list</p>';

    if (!sh.total) {
      h += '<div class="card empty"><h2>Nothing here yet</h2>' +
        '<p class="muted">Add the first person and this screen becomes your round: who is due, ' +
        'who has gone quiet, and what is slipping.</p>' +
        '<button class="btn primary" data-action="new-person">+ Add the first person</button></div>';
      return h;
    }

    if (sh.backupWarning) {
      h += '<div class="notice warn"><strong>Back these records up.</strong> ' + esc(sh.backupWarning) +
        ' <a href="#" data-action="go-settings">Back up now</a>.</div>';
    }

    var due = sh.overdue.concat(sh.dueToday);
    h += '<div class="card"><div class="card-head"><h2>Due now</h2>' +
      '<span class="pill' + (sh.overdue.length ? ' warn' : '') + '">' + due.length + '</span></div>';
    if (!due.length) {
      h += '<p class="muted mb0">Nothing planned is outstanding. Follow-ups you set on a ' +
        'person\'s Plan tab show up here on the day.</p>';
    } else {
      h += sh.overdue.map(function (e) { return todayRow(e, 'overdue'); }).join('') +
        sh.dueToday.map(function (e) { return todayRow(e, 'today'); }).join('');
    }
    h += '</div>';

    if (sh.urgent.length) {
      var count = sh.urgent.reduce(function (n, u) { return n + u.items.length; }, 0);
      h += '<div class="card"><div class="card-head"><h2>Needs attention</h2>' +
        '<span class="pill warn">' + count + '</span></div>' +
        '<p class="section-hint">Consent that was never recorded, goals marked stuck, records ' +
        'nobody has touched in a long time.</p>' +
        sh.urgent.map(function (u) {
          return u.items.map(function (x) { return suggestionRow(u.p, x, true); }).join('');
        }).join('') +
        '</div>';
    }

    h += '<div class="card"><div class="card-head"><h2>Going quiet</h2>' +
      '<span class="pill">' + sh.drifting.length + '</span></div>' +
      '<p class="section-hint">No contact in over ' + sh.staleDays + ' days and nothing planned. ' +
      'People move, get swept, get hospitalised or get housed - a quiet record is usually out of ' +
      'date rather than settled.</p>';
    if (!sh.drifting.length) {
      h += '<p class="muted mb0">Everyone has been seen recently. That is the whole job, done.</p>';
    } else {
      h += sh.drifting.slice(0, 12).map(function (e) { return todayRow(e, 'drift'); }).join('');
      if (sh.drifting.length > 12) {
        h += '<p class="small faint mb0">and ' + (sh.drifting.length - 12) + ' more.</p>';
      }
    }
    h += '</div>';

    return h;
  }

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
      '</div>';

    h += '<div class="card"><div class="card-head"><h2>Appearance</h2></div>' +
      field('Theme', '<select id="theme">' +
        ['auto', 'light', 'dark'].map(function (t) {
          return '<option value="' + t + '"' + (s.theme === t ? ' selected' : '') + '>' +
            (t === 'auto' ? 'Match my device' : t === 'light' ? 'Light' : 'Dark') + '</option>';
        }).join('') + '</select>') +
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
      '<strong>Replace</strong> wipes what is here first.</p>' +
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

  /* ---------- help ---------- */

  var HELP_TABS = [
    { k: 'app',       t: 'Using the app' },
    { k: 'resources', t: 'NYC resources' },
    { k: 'docs',      t: 'Documents needed' }
  ];

  function viewHelp() {
    var h = '<div class="help-nav no-print">' + HELP_TABS.map(function (t) {
      return '<button data-action="help-tab" data-tab="' + t.k + '"' +
        (state.helpTab === t.k ? ' class="active"' : '') + '>' + esc(t.t) + '</button>';
    }).join('') + '</div>';

    if (state.helpTab === 'resources') return h + helpResources();
    if (state.helpTab === 'docs') return h + helpDocuments();
    return h + helpAboutApp();
  }

  /* ---------- local resource pack ---------- */

  function packHead(R) {
    return '<div class="card pack-head">' +
      '<div class="card-head"><h2>' + esc(R.region) + '</h2>' +
      '<span class="badge">Checked ' + esc(Doc.fmtDate(R.checked)) + '</span></div>' +
      '<div class="notice warn mb0"><strong>Ring ahead before sending anyone.</strong> ' +
      esc(R.caution) + '</div>' +
      '<div class="btn-row mt16 no-print">' +
      '<input type="search" id="res-search" placeholder="Search — try &quot;shelter&quot;, &quot;food&quot;, &quot;veteran&quot;" ' +
      'aria-label="Search resources">' +
      '<button class="btn" data-action="print-help">Print this sheet</button>' +
      '</div>' +
      '<p class="small faint mb0 mt8 no-print">Printed, this becomes a street sheet you can hand to ' +
      'someone. Tap any number on a phone to dial it.</p>' +
      '</div>';
  }

  function resItem(it) {
    var hay = [it.name, it.what, it.address, it.phone, it.phoneNote, it.web].filter(has).join(' ').toLowerCase();
    var h = '<div class="res-item" data-hay="' + esc(hay) + '">';
    h += '<div class="res-name">' + esc(it.name) +
      (it.verify ? ' <span class="badge warn">check first</span>' : '') + '</div>';

    var lines = '';
    if (has(it.phone)) {
      lines += '<div class="res-line"><span class="res-k">Call</span>' +
        '<a class="res-tel" href="tel:' + esc(it.phone.replace(/[^0-9+]/g, '')) + '">' +
        esc(it.phone) + '</a>' +
        (has(it.phoneNote) ? '<span class="res-note">' + esc(it.phoneNote) + '</span>' : '') + '</div>';
    }
    if (has(it.address)) {
      lines += '<div class="res-line"><span class="res-k">Go to</span><span>' + esc(it.address) + '</span></div>';
    }
    if (has(it.web)) {
      lines += '<div class="res-line"><span class="res-k">Web</span>' +
        '<a href="' + esc(it.web) + '" target="_blank" rel="noopener noreferrer">' +
        esc(it.web.replace(/^https?:\/\//, '')) + '</a></div>';
    }
    if (lines) h += '<div class="res-lines">' + lines + '</div>';
    if (has(it.what)) h += '<p class="res-what">' + esc(it.what) + '</p>';
    return h + '</div>';
  }

  function helpResources() {
    if (typeof RESOURCE_PACK === 'undefined') {
      return '<div class="card"><p class="mb0">No local resource pack is loaded.</p></div>';
    }
    var R = RESOURCE_PACK;
    var h = packHead(R);

    R.groups.forEach(function (g) {
      h += '<div class="card res-group" data-group="' + esc(g.id) + '">' +
        '<div class="card-head"><h2>' + esc(g.title) + '</h2></div>' +
        (has(g.intro) ? '<p class="section-hint">' + esc(g.intro) + '</p>' : '') +
        g.items.map(resItem).join('') +
        '<p class="res-empty small faint mb0" hidden>Nothing here matches that search.</p>' +
        '</div>';
    });

    h += '<div class="card no-print"><p class="small faint mb0">' +
      'Sources: NYC.gov and DHS, Legal Aid NYC, Coalition for the Homeless, DYCD, and the ' +
      'Veterans Crisis Line. This pack lives in <code>assets/resources-nyc.js</code> — correct ' +
      'anything that has changed, and it updates everywhere it appears.</p></div>';
    return h;
  }

  /* ---------- what paperwork each step needs ---------- */

  function helpDocuments() {
    if (typeof RESOURCE_PACK === 'undefined') {
      return '<div class="card"><p class="mb0">No local resource pack is loaded.</p></div>';
    }
    var R = RESOURCE_PACK;
    var h = '<div class="card"><div class="card-head"><h2>What paperwork each step needs</h2></div>' +
      '<p class="section-hint">Ordered the way the work actually happens. Missing documents slow ' +
      'things down; they rarely stop them entirely, and never for shelter.</p>' +
      '<div class="btn-row no-print"><button class="btn" data-action="print-help">Print this sheet</button></div>' +
      '</div>';

    R.documents.forEach(function (d) {
      h += '<div class="card doc-need' + (d.good ? ' good' : '') + '">' +
        '<div class="card-head"><h2>' + esc(d.title) + '</h2></div>' +
        '<p class="doc-lede">' + esc(d.lede) + '</p>' +
        '<ul class="doc-list">' +
        d.need.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') +
        '</ul>' +
        (has(d.tip) ? '<div class="notice mb0">' + esc(d.tip) + '</div>' : '') +
        '</div>';
    });

    h += '<div class="card no-print"><p class="small faint mb0">Each person also has their own ' +
      'documents checklist on the <strong>Needs &amp; documents</strong> tab, for recording what ' +
      'they actually hold.</p></div>';
    return h;
  }

  function helpAboutApp() {
    return '<h1>How this app works</h1>' +

      '<div class="card"><h2>Nothing leaves this device</h2>' +
      '<p>There is no account, no server, no cloud. Every record is stored by the browser on this computer or phone. ' +
      'That is deliberate: the people in these records are among the most exposed to harm from a data leak, and the ' +
      'safest place for their information is not on the internet.</p>' +
      '<p class="mb0">The trade-off is that <strong>backups are your responsibility</strong>. Settings → Backup downloads a single file ' +
      'holding everything. Do it weekly, and before updating your browser.</p></div>' +

      '<div class="card"><h2>Working with someone in the field</h2>' +
      '<ol><li><strong>Ask first.</strong> Explain what you are writing down and why, and record their consent on the Overview tab.</li>' +
      '<li><strong>Start small.</strong> A name they go by and where they stay is enough for a first contact. Nothing is required.</li>' +
      '<li><strong>Use their words.</strong> Goals and My Story should read the way they said it.</li>' +
      '<li><strong>Log every contact.</strong> One line each time. This is what shows continuity when an agency asks.</li></ol>' +
      '<p class="mb0">Leave anything blank that they do not want to answer. A blank field is a record of their choice.</p></div>' +

      '<div class="card"><h2>Printing and emailing</h2>' +
      '<p>Open a person, then the <strong>Documentation</strong> tab. Choose which sections belong in this particular document — ' +
      'a shelter referral does not need someone\'s whole life story — then:</p>' +
      '<ul><li><strong>Print</strong> opens the normal print dialog. Choose "Save as PDF" as the printer to get a PDF file.</li>' +
      '<li><strong>Email</strong> opens your email program with the record already in the message body.</li>' +
      '<li><strong>Download as web page</strong> gives a single file, photo included, that you can attach to an email or open on any computer.</li></ul>' +
      '<p class="mb0">Only send someone\'s record onward when they have agreed to it.</p></div>' +

      '<div class="card"><h2>Sharing between workers</h2>' +
      '<p class="mb0">Each device holds its own records. To combine them, one worker downloads a backup and sends the file to the other, ' +
      'who uses <strong>Restore (merge)</strong>. Records edited more recently win, so nothing carefully written in the field gets overwritten by an older copy.</p></div>' +

      '<div class="card"><h2>If storage runs out</h2>' +
      '<p class="mb0">Photos take the most room. The app shrinks each one, but browsers still cap how much a page may store. ' +
      'If you see a warning, download a backup, then remove photos from older records.</p></div>' +

      '<div class="card"><h2>A note on dignity</h2>' +
      '<p class="mb0">This app collects information about people who rarely get to control their own story. ' +
      'Ask before you write. Show them what you wrote if they want to see it. Let them correct it. ' +
      'The "My Story" section exists because a person is more than a list of needs and barriers.</p></div>';
  }

  /* ====================================================================
     EVENTS
     ==================================================================== */

  function go(view, id) {
    state.view = view;
    if (id) state.personId = id;
    render();
  }

  function onClick(e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var a = t.dataset.action;
    var p = person();

    /* navigation */
    if (a === 'go-people') { state.view = 'people'; return render(); }
    if (a === 'go-settings') { e.preventDefault(); return go('settings'); }
    if (a === 'open-person') {
      state.personId = t.dataset.id;
      state.tab = 'overview';
      return go('person');
    }
    if (a === 'tab') { state.tab = t.dataset.tab; return render(); }
    if (a === 'help-tab') { state.helpTab = t.dataset.tab; return render(); }

    if (a === 'load-sample') {
      if (typeof SAMPLE === 'undefined') return toast('Sample data is not available.');
      Store.addMany(SAMPLE.build(Store.blankPerson, Store.uid)).then(function () {
        go('today');
        toast('Sample caseload loaded. Remove it any time from Overview or Settings.');
      });
      return;
    }
    if (a === 'clear-sample') {
      Store.removeSamples().then(function (n) {
        state.personId = null;
        render();
        toast(n + ' sample record' + (n === 1 ? '' : 's') + ' removed.');
      });
      return;
    }
    if (a === 'print-help') { window.print(); return; }

    // Jump straight from a suggestion to the field that answers it.
    if (a === 'goto') {
      if (t.dataset.id) state.personId = t.dataset.id;
      state.tab = t.dataset.tab || 'overview';
      return go('person');
    }
    // One tap to stamp a milestone with today's date.
    if (a === 'mark-today') {
      var mp = t.dataset.id ? Store.get(t.dataset.id) : p;
      if (!mp) return;
      mp[t.dataset.field] = Flow.todayStr();
      Store.touch(mp);
      render();
      return toast('Dated today.');
    }
    if (a === 'clear-field') {
      var cp = t.dataset.id ? Store.get(t.dataset.id) : p;
      if (!cp) return;
      cp[t.dataset.field] = '';
      Store.touch(cp);
      return render();
    }
    // Log a contact and clear the follow-up it satisfies, in one step.
    if (a === 'did-visit') {
      var vp = Store.get(t.dataset.id) || p;
      if (!vp) return;
      vp.log.unshift({ id: Store.uid(), date: Flow.todayStr(), type: 'Street outreach',
                       worker: Store.settings().workerName || '', notes: '' });
      vp.followUpDate = '';
      vp.followUpNote = '';
      Store.touch(vp);
      state.personId = vp.id;
      state.tab = 'log';
      go('person');
      return toast('Contact logged for today. Add what happened while it is fresh.');
    }
    if (a === 'nav') { state.view = t.dataset.view; return render(); }

    if (a === 'new-person') {
      var np = Store.create();
      state.personId = np.id;
      state.tab = 'overview';
      go('person');
      toast('New record started. Nothing is required — fill in what they share.');
      return;
    }

    /* photo */
    if (a === 'photo-pick') return el('photo-input').click();
    if (a === 'photo-camera') return el('photo-camera-input').click();
    if (a === 'photo-clear') {
      if (!confirm('Remove this photo?')) return;
      p.photo = ''; p.photoTakenAt = '';
      Store.touch(p);
      return render();
    }

    /* location */
    if (a === 'gps') {
      if (!navigator.geolocation) return toast('This browser cannot provide a location.');
      toast('Getting location…');
      navigator.geolocation.getCurrentPosition(function (pos) {
        p.stay.gpsLat = pos.coords.latitude.toFixed(6);
        p.stay.gpsLng = pos.coords.longitude.toFixed(6);
        p.stay.gpsAt = new Date().toISOString();
        Store.touch(p);
        render();
        toast('Location saved.');
      }, function () {
        toast('Could not get a location. Open the app over http (Start App) and allow location access.', 5000);
      }, { enableHighAccuracy: true, timeout: 12000 });
      return;
    }
    if (a === 'gps-clear') {
      p.stay.gpsLat = ''; p.stay.gpsLng = ''; p.stay.gpsAt = '';
      Store.touch(p);
      return render();
    }

    /* chips */
    if (a === 'chip') {
      var list = t.dataset.list, val = t.dataset.value;
      p[list] = p[list] || [];
      var i = p[list].indexOf(val);
      if (i === -1) p[list].push(val); else p[list].splice(i, 1);
      Store.touch(p);
      return render();
    }

    /* goals */
    if (a === 'add-goal') {
      p.goals.push({
        id: Store.uid(), title: '', category: '', why: '', steps: '',
        status: 'Just started', targetDate: '', support: '', notes: '',
        createdAt: new Date().toISOString()
      });
      Store.touch(p);
      return render();
    }
    if (a === 'del-goal') {
      if (!confirm('Delete this goal?')) return;
      p.goals = p.goals.filter(function (g) { return g.id !== t.dataset.id; });
      Store.touch(p);
      return render();
    }
    if (a === 'move-goal') {
      var dir = parseInt(t.dataset.dir, 10);
      var idx = p.goals.findIndex(function (g) { return g.id === t.dataset.id; });
      var to = idx + dir;
      if (idx < 0 || to < 0 || to >= p.goals.length) return;
      var moved = p.goals.splice(idx, 1)[0];
      p.goals.splice(to, 0, moved);
      Store.touch(p);
      return render();
    }

    /* documents */
    if (a === 'add-doc') {
      p.documents.push({ id: Store.uid(), name: '', status: 'unknown', notes: '', expires: '' });
      Store.touch(p);
      return render();
    }
    if (a === 'del-doc') {
      p.documents = p.documents.filter(function (d) { return d.id !== t.dataset.id; });
      Store.touch(p);
      return render();
    }

    /* log & referrals */
    if (a === 'add-log' || a === 'quick-log') {
      p.log.push({
        id: Store.uid(), date: today(), type: 'Street outreach',
        worker: Store.settings().workerName || '', notes: ''
      });
      Store.touch(p);
      state.tab = 'log';
      render();
      toast('Contact logged for today.');
      return;
    }
    if (a === 'del-log') {
      if (!confirm('Delete this log entry?')) return;
      p.log = p.log.filter(function (l) { return l.id !== t.dataset.id; });
      Store.touch(p);
      return render();
    }
    if (a === 'add-referral') {
      p.referrals.push({ id: Store.uid(), org: '', service: '', date: today(), status: 'Referred', contact: '', notes: '' });
      Store.touch(p);
      return render();
    }
    if (a === 'del-referral') {
      if (!confirm('Delete this referral?')) return;
      p.referrals = p.referrals.filter(function (r) { return r.id !== t.dataset.id; });
      Store.touch(p);
      return render();
    }

    /* delete person */
    if (a === 'delete-person') {
      if (!confirm('Delete the record for ' + Doc.shortName(p) + '? This cannot be undone.')) return;
      if (!confirm('Really delete? Consider downloading a backup first.')) return;
      Store.remove(p.id);
      state.personId = null;
      go('people');
      return toast('Record deleted.');
    }

    /* documentation */
    if (a === 'doc-section') return; // handled by change listener
    if (a === 'doc-print') {
      var ok = Doc.printPacket(p, docOpts(), PACKET_CSS);
      if (ok) toast('Opening the print dialog… choose "Save as PDF" for a file.', 4000);
      else toast('Printing was blocked. Use "Download as web page" below, then open that file and print it.', 6000);
      return;
    }
    if (a === 'doc-email') {
      var link = Doc.mailtoLink(p, docOpts(), state.doc.email);
      window.location.href = link.href;
      if (link.truncated) {
        toast('The record was shortened to fit an email. Download the file and attach it for the full version.', 6000);
      }
      return;
    }
    if (a === 'doc-html') {
      download(safeFile(Doc.shortName(p)) + '-record.html',
        Doc.standaloneHTML(p, docOpts(), PACKET_CSS), 'text/html');
      return toast('File downloaded — check your Downloads folder.');
    }
    if (a === 'doc-txt') {
      download(safeFile(Doc.shortName(p)) + '-record.txt', Doc.packetText(p, docOpts()), 'text/plain');
      return toast('File downloaded — check your Downloads folder.');
    }
    if (a === 'doc-copy') return copyText(Doc.packetText(p, docOpts()));

    /* settings */
    if (a === 'backup') {
      var stamp = new Date().toISOString().slice(0, 10);
      download('outreach-backup-' + stamp + '.json', JSON.stringify(Store.raw(), null, 2), 'application/json');
      // Stamped after the download so the reminder on Today is truthful.
      Store.settings().lastBackupAt = new Date().toISOString();
      Store.save();
      return toast('Backup downloaded. Keep it somewhere safe.');
    }
    if (a === 'restore-merge' || a === 'restore-replace') {
      var input = el('restore-input');
      input.dataset.mode = (a === 'restore-merge') ? 'merge' : 'replace';
      return input.click();
    }
    if (a === 'export-csv') return exportCSV();
    if (a === 'wipe') {
      if (!confirm('Erase ALL records from this device?')) return;
      if (prompt('Type ERASE to confirm.') !== 'ERASE') return toast('Cancelled — nothing was deleted.');
      Store.replaceAll(Store.blankDatabase()).then(function () {
        state.personId = null;
        go('dashboard');
        toast('All records erased.');
      });
      return;
    }
  }

  function docOpts() {
    return { sections: state.doc.sections, settings: Store.settings() };
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

  function onInput(e) {
    var t = e.target;

    if (t.id === 'search') { state.search = t.value; return renderListOnly(); }
    if (t.id === 'res-search') return filterResources(t.value);
    if (t.id === 'doc-email') { state.doc.email = t.value; return; }

    var bind = t.dataset.bind;
    if (!bind) return;
    var value = t.type === 'checkbox' ? t.checked : t.value;
    setBound(bind, value);

    // Fields that change what else is on screen need a redraw; the rest do not.
    if (t.type === 'checkbox' && /^(stay\.withChildren|stay\.withPets)$/.test(bind)) render();
  }

  function onChange(e) {
    var t = e.target;

    if (t.id === 'filter') { state.filter = t.value; return render(); }
    if (t.id === 'sort') { state.sort = t.value; return render(); }
    if (t.id === 'theme') {
      Store.settings().theme = t.value;
      Store.save();
      applyTheme();
      return;
    }
    if (t.id === 'doc-preset') {
      state.doc.preset = t.value;
      state.doc.sections = Doc.PRESETS[t.value].on.slice();
      return render();
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
      refreshHeaderBits();
      var badge = document.querySelector('.doc-layout .badge');
      if (badge) badge.textContent = state.doc.sections.length + ' sections';
      return;
    }

    if (t.id === 'photo-input' || t.id === 'photo-camera-input') {
      var file = t.files && t.files[0];
      if (!file) return;
      toast('Processing photo…');
      readPhoto(file, function (dataUrl) {
        var pp = person();
        pp.photo = dataUrl;
        pp.photoTakenAt = today();
        Store.touch(pp).then(function () {
          render();
          toast('Photo saved.');
        }, function (err) {
          render();
          alert(err.message || 'The photo could not be saved.');
        });
      });
      return;
    }

    if (t.id === 'restore-input') {
      var f = t.files && t.files[0];
      if (!f) return;
      var mode = t.dataset.mode;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var parsed;
        try {
          parsed = JSON.parse(ev.target.result);
        } catch (err) {
          return alert('That file could not be read as a backup. Make sure it is the .json file this app downloaded.');
        }
        if (!parsed || !Array.isArray(parsed.people)) {
          return alert('That file does not look like a backup from this app.');
        }
        if (mode === 'replace') {
          if (!confirm('Replace all ' + Store.all().length + ' record(s) on this device with the ' +
                       parsed.people.length + ' record(s) in the file?')) return;
          Store.replaceAll(parsed).then(function () {
            go('people');
            toast('Restored ' + Store.all().length + ' record(s).');
          });
        } else {
          Store.mergeIn(parsed).then(function (res) {
            go('people');
            toast('Merged: ' + res.added + ' added, ' + res.updated + ' updated.', 4000);
          });
        }
      };
      reader.readAsText(f);
      t.value = '';
      return;
    }

    // Selects and checkboxes bound to the record.
    if (t.dataset.bind) onInput(e);
  }

  // Typing in search should not rebuild the whole page and steal focus.
  function renderListOnly() {
    var list = document.querySelector('.person-list');
    var hint = document.querySelector('.section-hint');
    if (!list) { render(); var s = el('search'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } return; }
    var saved = state.view;
    state.view = 'people';
    var wrapper = document.createElement('div');
    wrapper.innerHTML = viewPeople();
    state.view = saved;
    var newList = wrapper.querySelector('.person-list');
    var newHint = wrapper.querySelector('.section-hint');
    if (newList) list.innerHTML = newList.innerHTML;
    else list.innerHTML = '<div class="empty"><span class="big">🔍</span><h3>Nothing matches</h3></div>';
    if (hint && newHint) hint.textContent = newHint.textContent;
  }

  function exportCSV() {
    var rows = [[
      'Name', 'Goes by', 'Pronouns', 'Date of birth', 'Phone', 'Living situation',
      'Location', 'Cross streets', 'City', 'State', 'ZIP', 'Homeless since',
      'Active goals', 'Top goal', 'Needs', 'Barriers', 'Last contact',
      'Has photo', 'Consent recorded', 'Record updated'
    ]];

    Store.all().forEach(function (p) {
      var s = p.stay || {};
      rows.push([
        [p.firstName, p.lastName].filter(has).join(' '),
        p.preferredName, p.pronouns, p.dob, p.phone, s.situation,
        s.locationName, s.crossStreets, s.city, s.state, s.zip, s.homelessSince,
        activeGoals(p).length,
        (p.goals && p.goals[0] && p.goals[0].title) || '',
        (p.needs || []).join('; '),
        (p.barriers || []).join('; '),
        lastContact(p),
        has(p.photo) ? 'yes' : 'no',
        (p.consent && p.consent.dataConsent) ? 'yes' : 'no',
        p.updatedAt
      ]);
    });

    var csv = rows.map(function (r) {
      return r.map(function (cell) {
        var v = String(cell === undefined || cell === null ? '' : cell);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(',');
    }).join('\r\n');

    // The BOM makes Excel open UTF-8 correctly on Windows.
    download('outreach-people-' + today() + '.csv', '﻿' + csv, 'text/csv');
    toast('CSV downloaded.');
  }

  function applyTheme() {
    var t = Store.settings().theme || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  /* ====================================================================
     BOOT
     ==================================================================== */

  function boot() {
    // The packet styles live in JS so exports carry them; inject for the preview.
    var style = document.createElement('style');
    style.textContent = PACKET_CSS;
    document.head.appendChild(style);

    root = el('view');

    Store.init().then(function () {
      applyTheme();
      render();

      document.addEventListener('click', onClick);
      document.addEventListener('input', onInput);
      document.addEventListener('change', onChange);

      Store.onSave(function () {
        var d = el('save-dot');
        if (!d) return;
        d.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      });

      // A backup is the only thing standing between a browser reset and losing
      // everything, so nudge on the way out once there is data worth keeping.
      window.addEventListener('beforeunload', function (e) {
        if (Store.backend() === 'memory' && Store.all().length) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
    }).catch(function (err) {
      root.innerHTML = '<div class="card"><h2>Something went wrong starting the app</h2><p>' +
        esc(err && err.message ? err.message : String(err)) + '</p></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
