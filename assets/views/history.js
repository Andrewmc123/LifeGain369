/* ==========================================================================
   views/history.js — History: one dated timeline, the contact log and referrals.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

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

    push(Util.dateOf(p.createdAt), 'milestone', 'Record started', '');
    push(p.engagementDate, 'milestone', 'Began working together', 'Date of engagement');
    push(p.assessmentDate, 'milestone', 'Assessment completed', '');
    push(p.housedDate, 'milestone', 'Moved in', 'Keys in hand');
    push(p.consent.signedDate, 'milestone', 'Consent recorded',
      has(p.consent.signedName) ? 'Signed ' + p.consent.signedName : '');
    push(p.story.recordedAt, 'story', 'Story recorded',
      has(p.story.recordedBy) ? 'Written down by ' + p.story.recordedBy : '');

    (p.goals || []).forEach(function (g) {
      if (g.status === 'Achieved') {
        push(g.targetDate || Util.dateOf(g.updatedAt), 'goal',
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
          '<div>' + select('Type of contact', b + 'type', l.type, C.LOG_TYPES) + '</div>' +
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
          '<div>' + select('Status', b + 'status', r.status, C.REFERRAL_STATUS) + '</div>' +
          '</div>' +
          text('Contact there', b + 'contact', r.contact, { placeholder: 'Name and phone' }) +
          area('Notes', b + 'notes', r.notes, { rows: 2 }) +
          '</div>';
      }).join('');
    }
    h += '</div>';

    return h;
  }

  Views.tabLog = tabLog;
})();
