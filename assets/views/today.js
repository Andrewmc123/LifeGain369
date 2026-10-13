/* ==========================================================================
   views/today.js — Today: the shift screen the app opens on.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

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
          return u.items.map(function (x) { return Views.suggestionRow(u.p, x, true); }).join('');
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

  Views.today = viewToday;
})();
