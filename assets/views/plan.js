/* ==========================================================================
   views/plan.js — Plan & next steps: the workflow made visible.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

  var LEVELS = {
    urgent: { t: 'Needs attention', hint: 'Something is being lost right now.' },
    soon:   { t: 'This week',       hint: 'Worth planning into the next few days.' },
    ready:  { t: 'When the moment is right', hint: 'Only if the conversation gets there. Never a checklist to run at someone.' }
  };

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
        C.SSN_ON_FILE, { placeholder: '- not asked -' }) + '</div>' +
      '<div>' + select('Veteran status', 'hmis.veteranAsked', p.hmis.veteranAsked, C.ASKED,
        { placeholder: '- not asked -', hint: '"No" is an answer too — it counts as known.' }) + '</div>' +
      '<div>' + select('Disabling condition', 'hmis.disabilityAsked', p.hmis.disabilityAsked, C.ASKED,
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

  Views.tabPlan = tabPlan;
  Views.suggestionRow = suggestionRow;
})();
