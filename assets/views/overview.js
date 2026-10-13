/* ==========================================================================
   views/overview.js — Overview: the caseload at a glance, and the first-run screen.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

  /* ---------- dashboard ---------- */

  function viewDashboard() {
    var all = Store.all();
    var people = all.filter(function (p) { return !p.archived; });
    var s = Store.settings();

    if (!people.length) return viewDashboardEmpty();

    var goals = people.reduce(function (n, p) { return n + Flow.activeGoals(p).length; }, 0);
    var achieved = people.reduce(function (n, p) {
      return n + (p.goals || []).filter(function (g) { return g.status === 'Achieved'; }).length;
    }, 0);
    // The last seven days including today, in local dates.
    var weekAgo = Util.daysAgoStr(6), todayStr = Util.todayStr();
    var contacts = people.reduce(function (n, p) {
      return n + (p.log || []).filter(function (l) { return l.date >= weekAgo && l.date <= todayStr; }).length;
    }, 0);
    var housed = people.filter(function (p) { return has(p.housedDate); }).length;
    var engaged = people.filter(function (p) { return has(p.engagementDate); }).length;
    var withId = people.filter(function (p) { return Flow.coreDocsHeld(p).hasId; }).length;
    var chronic = people.filter(function (p) { return Flow.chronicSignal(p).qualifies; }).length;

    var h = '';
    h += '<div class="page-head"><h1>Overview</h1>' +
      '<div class="btn-row">' +
      '<button class="btn" data-action="nav" data-view="report">Funder report</button>' +
      '<button class="btn primary" data-action="new-person">+ New person</button></div></div>';

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
      UI.sparkline(people) +
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
    var needs = UI.countBy(people, function (p) { return p.needs; }).slice(0, 8);
    var situations = UI.countBy(people, function (p) { return p.stay.situation; }).slice(0, 8);
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
          (Flow.lastContactDate(p) ? ' · last seen ' + esc(Flow.agoPhrase(Flow.daysAgo(Flow.lastContactDate(p)))) : '') +
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

  function privacyNotice() {
    return '<div class="notice mt16">🔒 <strong>Everything here stays on this device.</strong> ' +
      'There is no account and no server — records live in this browser\'s local storage. ' +
      'Use <a href="#" data-action="go-settings">Settings → Backup</a> regularly, ' +
      'because clearing your browser data will erase these records.</div>';
  }

  Views.dashboard = viewDashboard;
  Views.sampleBanner = sampleBanner;
})();
