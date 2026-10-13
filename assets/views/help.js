/* ==========================================================================
   views/help.js — Help: how the app works, local resources, documents, plans.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

  /* ---------- help ---------- */

  var HELP_TABS = [
    { k: 'app',       t: 'Using the app' },
    { k: 'resources', t: 'NYC resources' },
    { k: 'docs',      t: 'Documents needed' },
    { k: 'plans',     t: 'Plans & support' }
  ];

  function viewHelp() {
    var h = '<div class="help-nav no-print">' + HELP_TABS.map(function (t) {
      return '<button data-action="help-tab" data-tab="' + t.k + '"' +
        (state.helpTab === t.k ? ' class="active"' : '') + '>' + esc(t.t) + '</button>';
    }).join('') + '</div>';

    if (state.helpTab === 'resources') return h + helpResources();
    if (state.helpTab === 'docs') return h + helpDocuments();
    if (state.helpTab === 'plans') return h + helpPlans();
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
      'Veterans Crisis Line. This pack lives in <code>assets/data/resources-nyc.js</code> — correct ' +
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
      '<p>The trade-off is that <strong>backups are your responsibility</strong>. Settings → Backup downloads a single file ' +
      'holding everything. Do it weekly, and before updating your browser.</p>' +
      '<p class="mb0">Turn on the <strong>passcode lock</strong> in Settings and everything saved on this device, and every backup, ' +
      'is encrypted. The app locks itself when it is left alone.</p></div>' +

      '<div class="card"><h2>Reporting to funders</h2>' +
      '<p class="mb0">Overview → <strong>Funder report</strong> counts people reached, contacts, engagements, assessments, ' +
      'move-ins and referrals for any period, straight from the records. It holds totals only — no names — so it can be ' +
      'printed or sent as a spreadsheet without breaching anyone’s privacy.</p></div>' +

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

  /* ---------- plans & support ----------
     The core app is free and stays free: a worker should never lose access
     to a record because a subscription lapsed. What is paid for is the work
     around it — hosting, branding, set-up, training, a city's resource pack. */

  function helpPlans() {
    var cfg = (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG : { plans: [] };
    var mail = has(cfg.contactEmail)
      ? 'mailto:' + encodeURIComponent(cfg.contactEmail) + '?subject=' + encodeURIComponent(cfg.productName + ' — plans')
      : '';

    var h = '<h1>Plans &amp; support</h1>' +
      '<p class="lede">Every feature in this app is free for outreach workers, for good. ' +
      'Teams and cities pay for hosting, set-up, training and support around it — and that is what ' +
      'keeps it maintained.</p>';

    h += '<div class="plans">' + (cfg.plans || []).map(function (pl) {
      return '<div class="card plan' + (pl.highlight ? ' plan-highlight' : '') + '">' +
        (pl.highlight ? '<span class="badge accent plan-flag">Most teams</span>' : '') +
        '<h2>' + esc(pl.name) + '</h2>' +
        '<div class="plan-price">' + esc(pl.price) +
        (has(pl.cadence) ? ' <span class="small faint">' + esc(pl.cadence) + '</span>' : '') + '</div>' +
        '<p class="muted">' + esc(pl.blurb) + '</p>' +
        '<ul class="plan-list">' + (pl.features || []).map(function (f) {
          return '<li>' + esc(f) + '</li>';
        }).join('') + '</ul>' +
        '</div>';
    }).join('') + '</div>';

    var links = '';
    if (mail) links += '<a class="btn primary" href="' + esc(mail) + '">Talk to us about a plan</a>';
    if (has(cfg.supportUrl) && /^https:\/\//.test(cfg.supportUrl)) {
      links += '<a class="btn" href="' + esc(cfg.supportUrl) + '" target="_blank" rel="noopener noreferrer">Support the project</a>';
    }
    h += '<div class="card"><h2>Get in touch</h2>' +
      (links
        ? '<div class="btn-row">' + links + '</div>'
        : '<p class="muted mb0">Contact details have not been set for this copy of the app. ' +
          '(Publishers: add them in <code>assets/core/config.js</code>.)</p>') +
      '<p class="small faint mt16 mb0">No record, name or count ever leaves this device to do any of this. ' +
      'Plans are arranged by email; the app itself has no account and no payment screen.</p></div>';
    return h;
  }

  Views.help = viewHelp;
})();
