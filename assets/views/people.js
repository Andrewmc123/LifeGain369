/* ==========================================================================
   views/people.js — People: the searchable list of every record.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

  function personRow(p) {
    var sub = [];
    if (has(p.stay && p.stay.situation)) sub.push(p.stay.situation);
    if (Doc.locationLine(p)) sub.push(Doc.locationLine(p));
    var lc = Flow.lastContactDate(p);
    var ag = Flow.activeGoals(p).length;
    return '<button class="person-card" data-action="open-person" data-id="' + p.id + '">' +
      avatar(p) +
      '<div class="who"><div class="nm">' + esc(Doc.shortName(p)) + '</div>' +
      '<div class="sub">' + esc(sub.join(' · ') || 'No location recorded') + '</div></div>' +
      '<div class="meta">' +
      (p.archived ? '<span class="badge">archived</span>' : '') +
      (p.isSample ? '<span class="badge">sample</span>' : '') +
      (ag ? '<span class="badge accent">' + ag + ' goal' + (ag === 1 ? '' : 's') + '</span>' : '') +
      '<span class="badge' + (lc ? '' : ' warn') + '">' + (lc ? 'Seen ' + esc(Doc.fmtDate(lc)) : 'No contact logged') + '</span>' +
      '</div></button>';
  }

  /* ---------- people list ---------- */

  function viewPeople() {
    var everyone = Store.all();
    var archivedCount = everyone.filter(function (p) { return p.archived; }).length;
    var people = everyone.filter(function (p) { return state.showArchived ? p.archived : !p.archived; });
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
      if (state.sort === 'contact') return String(Flow.lastContactDate(b)).localeCompare(String(Flow.lastContactDate(a)));
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });

    var h = '';
    h += '<div class="card-head"><h1 class="mb0">People</h1><div class="spacer"></div>' +
      '<button class="btn" data-action="export-csv">Export list (CSV)</button>' +
      '<button class="btn primary" data-action="new-person">+ New person</button></div>';

    h += '<div class="toolbar">' +
      '<div class="search"><input type="search" id="search" placeholder="Search name, place, goal, note…" value="' + esc(state.search) + '"></div>' +
      '<select id="filter">' + opts(C.SITUATIONS, state.filter, 'All living situations') + '</select>' +
      '<select id="sort">' +
      '<option value="updated"' + (state.sort === 'updated' ? ' selected' : '') + '>Recently updated</option>' +
      '<option value="contact"' + (state.sort === 'contact' ? ' selected' : '') + '>Recently contacted</option>' +
      '<option value="name"' + (state.sort === 'name' ? ' selected' : '') + '>Name (A–Z)</option>' +
      '</select>' +
      (archivedCount || state.showArchived
        ? '<label class="checkline toolbar-check"><input type="checkbox" id="show-archived"' +
          (state.showArchived ? ' checked' : '') + '><span>Show archived (' + archivedCount + ')</span></label>'
        : '') +
      '</div>';

    h += '<div id="people-results">' + results(people, everyone.length, archivedCount) + '</div>';
    return h;
  }

  // The part under the search box. Typing in search swaps only this, so the
  // input keeps its focus and cursor.
  function results(people, total, archivedCount) {
    if (!people.length) {
      return '<div class="empty"><span class="big">🔍</span><h3>Nothing matches</h3>' +
        '<p class="muted mb0">' + (total ? 'Try a different search or filter.' : 'No records yet — add the first person.') + '</p></div>';
    }
    var pool = state.showArchived ? archivedCount : total - archivedCount;
    return '<p class="section-hint">' + people.length + ' of ' + pool + (state.showArchived ? ' archived' : '') +
      ' record' + (pool === 1 ? '' : 's') + '</p>' +
      '<div class="person-list">' + people.map(personRow).join('') + '</div>';
  }

  // Re-runs the list for the current search without touching the toolbar.
  function refreshResults() {
    var box = document.getElementById('people-results');
    if (!box) return App.render();
    var wrapper = document.createElement('div');
    wrapper.innerHTML = viewPeople();
    var fresh = wrapper.querySelector('#people-results');
    box.innerHTML = fresh ? fresh.innerHTML : '';
  }

  Views.people = viewPeople;
  Views.refreshPeopleResults = refreshResults;
})();
