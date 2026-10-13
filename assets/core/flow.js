/* ==========================================================================
   flow.js — the part of the app that thinks.

   Everything here is a pure read over a record: give it a person, get back
   what stage they are at, what is worth doing next, and what is missing.
   No storage, no DOM. That keeps it testable and lets both the person
   screen and the shift screen ask the same questions and get the same
   answers.

   Two principles shape the rules below, and both come from how housing-
   focused street outreach actually works:

   1. Relationship before paperwork. A suggestion is never phrased as a
      demand on the person; it is a prompt for the worker. Sensitive fields
      are marked "when it feels right", not "missing" or "incomplete",
      because a blank field is usually trust that has not been earned yet,
      not sloppy data entry.

   2. The things that actually stall housing get ranked highest — expired
      or absent ID, a lost referral, a person nobody has seen in weeks.
      ========================================================================== */

var Flow = (function () {
  'use strict';

  /* ----- the journey --------------------------------------------------
     Stages are inferred from the record rather than set by hand, so they
     stay honest: a stage moves when something real happened, not when
     somebody remembered to update a dropdown. A worker can still override
     it when the record does not tell the whole story.
     ------------------------------------------------------------------- */

  var STAGES = [
    { k: 'met',       t: 'First contact',   d: 'You have met. Nothing is owed yet — the work is showing up again.' },
    { k: 'trust',     t: 'Building trust',  d: 'Repeat contact. A name, a place to find them, a sense of what they need.' },
    { k: 'engaged',   t: 'Engaged',         d: 'They are working with you on something specific.' },
    { k: 'papers',    t: 'Papers in hand',  d: 'ID and records gathered — the step most housing applications stall on.' },
    { k: 'assessed',  t: 'Assessed',        d: 'Assessed and referred — on the local list for housing or services.' },
    { k: 'housed',    t: 'Housed',          d: 'Keys in hand.' },
    { k: 'aftercare', t: 'Staying housed',  d: 'Follow-up, so the housing holds.' }
  ];

  // Documents that most housing and benefit applications will not move
  // without. Used to decide whether someone has reached "Papers in hand".
  var CORE_DOCS = ['State ID', 'Driver', 'IDNYC', 'Social Security', 'Birth Certificate'];

  function stageIndex(k) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].k === k) return i;
    return 0;
  }

  function stageMeta(k) { return STAGES[stageIndex(k)]; }

  /* ----- small date helpers ------------------------------------------- */

  // Always the worker's local date — see util.js.
  function todayStr() { return Util.todayStr(); }

  function daysBetween(a, b) {
    if (!a || !b) return null;
    var d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
    if (isNaN(d1) || isNaN(d2)) return null;
    return Math.round((d2 - d1) / 86400000);
  }

  // Positive = in the past.
  function daysAgo(dateStr) { return daysBetween(dateStr, todayStr()); }

  function plural(n, one, many) { return n === 1 ? '1 ' + one : n + ' ' + (many || one + 's'); }

  function agoPhrase(n) {
    if (n === null) return '';
    if (n === 0) return 'today';
    if (n === 1) return 'yesterday';
    if (n < 30) return n + ' days ago';
    if (n < 60) return 'about a month ago';
    if (n < 365) return 'about ' + Math.round(n / 30) + ' months ago';
    return 'over a year ago';
  }

  function isFilled(v) {
    if (v === undefined || v === null) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }

  /* ----- reading a record --------------------------------------------- */

  function lastContactDate(p) {
    var dates = (p.log || []).map(function (l) { return l.date; }).filter(isFilled).sort();
    return dates.length ? dates[dates.length - 1] : '';
  }

  function daysSinceContact(p) {
    var d = lastContactDate(p);
    return d ? daysAgo(d) : null;
  }

  function coreDocsHeld(p) {
    var held = (p.documents || []).filter(function (d) {
      return d.status === 'have' && CORE_DOCS.some(function (c) {
        return (d.name || '').toLowerCase().indexOf(c.toLowerCase()) !== -1;
      });
    });
    // ID and Driver's Licence are the same requirement wearing two names.
    var names = held.map(function (d) { return (d.name || '').toLowerCase(); });
    var hasId = names.some(function (n) { return n.indexOf('id') !== -1 || n.indexOf('driver') !== -1; });
    var hasSsn = names.some(function (n) { return n.indexOf('social security') !== -1; });
    var hasBirth = names.some(function (n) { return n.indexOf('birth') !== -1; });
    return { hasId: hasId, hasSsn: hasSsn, hasBirth: hasBirth, count: held.length,
             ready: hasId && hasSsn && hasBirth };
  }

  function openReferrals(p) {
    return (p.referrals || []).filter(function (r) {
      return r.status === 'Referred' || r.status === 'Appointment set' || r.status === 'Waitlisted';
    });
  }

  function activeGoals(p) {
    return (p.goals || []).filter(function (g) {
      return g.status !== 'Achieved' && g.status !== 'Paused';
    });
  }

  /* ----- stage -------------------------------------------------------- */

  function stageOf(p) {
    if (p.stageOverride) return p.stageOverride;

    if (isFilled(p.housedDate)) {
      // Thirty days after move-in the work changes character: it stops
      // being a housing search and becomes keeping the housing.
      var since = daysAgo(p.housedDate);
      return (since !== null && since > 30) ? 'aftercare' : 'housed';
    }
    if (isFilled(p.assessmentDate) || openReferrals(p).length) return 'assessed';
    if (coreDocsHeld(p).ready) return 'papers';
    if (isFilled(p.engagementDate)) return 'engaged';
    if ((p.log || []).length >= 2) return 'trust';
    return 'met';
  }

  /* ----- chronic homelessness ------------------------------------------
     HUD's definition: a disabling condition, plus either 12 months of
     continuous homelessness or 4+ separate episodes in 3 years totalling
     12 months. It matters because it is the gate to permanent supportive
     housing, and workers routinely miss that someone already qualifies.

     This is a prompt to check, never a determination — the record here is
     a field note, not an assessment.
     ------------------------------------------------------------------- */

  function chronicSignal(p) {
    var months = parseFloat(p.hmis && p.hmis.homelessMonths) || 0;
    var times = parseInt(p.hmis && p.hmis.homelessTimes, 10) || 0;
    var disabled = !!p.disability;

    // Fall back to the "homeless since" date when months were never entered.
    if (!months && isFilled(p.stay && p.stay.homelessSince)) {
      var d = daysAgo(p.stay.homelessSince);
      if (d !== null && d > 0) months = Math.floor(d / 30.4);
    }

    var longEnough = months >= 12;
    var episodic = times >= 4 && months >= 12;
    var qualifies = disabled && (longEnough || episodic);
    var close = !qualifies && (months >= 9 || times >= 3);

    return {
      qualifies: qualifies,
      close: close,
      months: months,
      times: times,
      disability: disabled,
      // What is missing before the question can even be answered.
      unknown: !isFilled(p.stay && p.stay.homelessSince) && !months
    };
  }

  /* ----- record completeness -------------------------------------------
     Deliberately split in two. "Field basics" is what the team needs to do
     the work and is fair to chase. "Deeper details" is sensitive and is
     only ever shown as an invitation.
     ------------------------------------------------------------------- */

  var BASIC_FIELDS = [
    { k: 'a name to use',        get: function (p) { return p.preferredName || p.firstName || p.lastName; }, tab: 'overview' },
    { k: 'where they stay',      get: function (p) { return p.stay.situation; }, tab: 'stay' },
    { k: 'how to find them',     get: function (p) { return p.stay.locationName || p.stay.crossStreets || p.stay.gpsLat; }, tab: 'stay' },
    { k: 'a first contact date', get: function (p) { return (p.log || []).length ? 'y' : ''; }, tab: 'log' },
    { k: 'what they need',       get: function (p) { return p.needs; }, tab: 'needs' },
    { k: 'what they are working toward', get: function (p) { return p.goals; }, tab: 'goals' }
  ];

  var DEEPER_FIELDS = [
    { k: 'their story',            get: function (p) { return p.story.text || p.story.quote; }, tab: 'story' },
    { k: 'what they are good at',  get: function (p) { return p.story.strengths; }, tab: 'story' },
    { k: 'date of birth',          get: function (p) { return p.dob; }, tab: 'overview' },
    { k: 'a way to reach them',    get: function (p) { return p.phone || p.email; }, tab: 'overview' },
    { k: 'documents they hold',    get: function (p) {
        return (p.documents || []).some(function (d) { return d.status !== 'unknown'; }) ? 'y' : ''; }, tab: 'needs' },
    { k: 'barriers in the way',    get: function (p) { return p.barriers; }, tab: 'needs' }
  ];

  function scoreList(p, list) {
    var have = list.filter(function (f) { return isFilled(f.get(p)); });
    var missing = list.filter(function (f) { return !isFilled(f.get(p)); });
    return {
      have: have.length,
      total: list.length,
      pct: Math.round((have.length / list.length) * 100),
      missing: missing
    };
  }

  function completeness(p) {
    return { basics: scoreList(p, BASIC_FIELDS), deeper: scoreList(p, DEEPER_FIELDS) };
  }

  /* ----- suggestions ---------------------------------------------------
     Levels: 'urgent' (something is being lost right now), 'soon' (this
     week), 'ready' (only when the moment is right). Each carries the tab
     it belongs to so the screen can offer a one-tap jump.
     ------------------------------------------------------------------- */

  function suggestions(p, settings) {
    var out = [];
    var s = settings || {};
    var staleDays = parseInt(s.followUpDays, 10) || 14;

    function add(level, title, why, tab, id) {
      out.push({ id: id || title, level: level, title: title, why: why, tab: tab });
    }

    /* --- consent: the app should not hold what was never agreed to --- */
    if (!p.consent.dataConsent) {
      add('urgent', 'Ask permission to keep these notes',
        'Nothing else here is settled until they have agreed to being on file. ' +
        'Explain what is kept, who sees it, and that they can ask for it to be deleted.',
        'overview', 'consent-data');
    }
    if (p.photo && !p.consent.photoConsent) {
      add('urgent', 'Photo is on file without recorded consent',
        'Either record that they agreed to the photo, or remove it. A photo of someone ' +
        'sleeping rough is sensitive in a way a name is not.',
        'overview', 'consent-photo');
    }
    if ((p.story.text || p.story.quote) && !p.consent.storyConsent && p.story.consentToShare) {
      add('soon', 'Confirm how their story may be shared',
        'The story is marked shareable but consent for it has not been recorded.',
        'story', 'consent-story');
    }

    /* --- follow-up and drift --- */
    var fu = p.followUpDate ? daysAgo(p.followUpDate) : null;
    if (fu !== null && fu > 0) {
      add('urgent', 'Follow-up was due ' + agoPhrase(fu),
        p.followUpNote || 'A follow-up was planned for ' + p.followUpDate + '.',
        'plan', 'followup-late');
    } else if (fu !== null && fu === 0) {
      add('soon', 'Follow-up is due today', p.followUpNote || 'Planned for today.', 'plan', 'followup-today');
    }

    var since = daysSinceContact(p);
    if (since === null) {
      add('soon', 'No contact recorded yet',
        'Log the first contact so the team knows this person has been met and when.',
        'log', 'no-contact');
    } else if (since > staleDays * 2) {
      add('urgent', 'Nobody has logged contact in ' + plural(since, 'day'),
        'People move, get swept, get hospitalised or get housed. A record this quiet is ' +
        'usually out of date rather than settled.',
        'log', 'stale-bad');
    } else if (since > staleDays) {
      add('soon', 'Last contact was ' + agoPhrase(since),
        'Worth a check-in to keep the relationship and the details current.',
        'log', 'stale');
    }

    /* --- the paperwork that actually blocks housing --- */
    var docs = coreDocsHeld(p);
    var needed = (p.documents || []).filter(function (d) { return d.status === 'need' || d.status === 'lost'; });
    if (!docs.hasId) {
      add('soon', 'No photo ID on file',
        'ID is the single most common reason a housing or benefits application stops. ' +
        'Replacing it takes weeks, so starting early is the whole trick.',
        'needs', 'doc-id');
    }
    if (needed.length && docs.hasId) {
      add('soon', plural(needed.length, 'document') + ' still needed',
        needed.map(function (d) { return d.name; }).join(', ') + '.',
        'needs', 'doc-other');
    }
    (p.documents || []).forEach(function (d) {
      if (d.status === 'have' && isFilled(d.expires)) {
        var left = daysBetween(todayStr(), d.expires);
        if (left !== null && left < 0) {
          add('soon', d.name + ' has expired', 'Expired ' + agoPhrase(-left) + '.', 'needs', 'exp-' + d.id);
        } else if (left !== null && left <= 60) {
          add('ready', d.name + ' expires in ' + plural(left, 'day'),
            'Renew before it lapses — easier than replacing it afterwards.', 'needs', 'exp-' + d.id);
        }
      }
    });

    /* --- chronic homelessness / priority housing --- */
    var ch = chronicSignal(p);
    if (ch.qualifies) {
      add('soon', 'May meet the chronic homelessness definition',
        'Recorded as ' + Math.round(ch.months) + ' months' +
        (ch.times ? ' and ' + ch.times + ' separate episodes' : '') +
        ' with a disabling condition. That combination is the gate to permanent supportive ' +
        'housing in most areas — worth confirming with your coordinated entry lead.',
        'plan', 'chronic');
    } else if (ch.close && ch.disability) {
      add('ready', 'Close to the chronic homelessness threshold',
        'Getting the history exact now saves re-interviewing them later.',
        'plan', 'chronic-close');
    }

    /* --- goals that have gone quiet --- */
    activeGoals(p).forEach(function (g) {
      if (isFilled(g.targetDate)) {
        var late = daysAgo(g.targetDate);
        if (late !== null && late > 0) {
          add('soon', 'Goal date has passed: ' + (g.title || 'untitled goal'),
            'Target was ' + g.targetDate + '. Move the date or change the status — a stale ' +
            'goal is discouraging to read back.',
            'goals', 'goal-late-' + g.id);
        }
      }
      if (g.status === 'Stuck — needs help') {
        add('urgent', 'Goal is marked stuck: ' + (g.title || 'untitled goal'),
          g.notes || 'They flagged this as needing help.', 'goals', 'goal-stuck-' + g.id);
      }
    });
    if (!activeGoals(p).length && (p.log || []).length >= 2) {
      add('ready', 'No active goal recorded',
        'Once there is trust, one concrete thing they want is worth more than ten things ' +
        'you think they need.',
        'goals', 'no-goals');
    }

    /* --- referrals that were made and then vanished --- */
    openReferrals(p).forEach(function (r) {
      var age = r.date ? daysAgo(r.date) : null;
      if (age !== null && age > 21) {
        add('soon', 'Referral has had no outcome in ' + plural(age, 'day') + ': ' + (r.org || 'referral'),
          'Referrals fail quietly. Ring them, or mark what actually happened.',
          'log', 'ref-' + r.id);
      }
    });

    /* --- engagement milestone --- */
    if (!isFilled(p.engagementDate) && (p.log || []).length >= 3) {
      add('ready', 'Record the date they engaged',
        'Three or more contacts logged. Most funders count the day a person began working ' +
        'with you, and it is easier to set now than to reconstruct later.',
        'plan', 'engagement');
    }

    /* --- safety --- */
    if (isFilled(p.stay.safetyNotes)) {
      add('ready', 'Safety note on this record',
        p.stay.safetyNotes, 'stay', 'safety');
    }

    /* --- the gentle ones, only once there is a relationship --- */
    var c = completeness(p);
    if ((p.log || []).length >= 2) {
      c.basics.missing.forEach(function (f) {
        add('ready', 'Still to note: ' + f.k, 'Useful for the team, when the moment allows.', f.tab, 'basic-' + f.k);
      });
    }
    if ((p.log || []).length >= 3 && !isFilled(p.story.text) && !isFilled(p.story.quote)) {
      add('ready', 'Their story has not been written down',
        'Only if they want it recorded. In their words, not a summary of them.',
        'story', 'story');
    }

    var order = { urgent: 0, soon: 1, ready: 2 };
    out.sort(function (a, b) { return order[a.level] - order[b.level]; });
    return out;
  }

  /* ----- possible duplicates -------------------------------------------
     Two workers meeting the same person on different nights is the normal
     case, not the exception. Catching it at the point of entry is the only
     time it is cheap to fix.
     ------------------------------------------------------------------- */

  function normName(s) {
    return (s || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function duplicatesOf(person, all) {
    var mine = normName(person.firstName) + '|' + normName(person.lastName);
    var myFirst = normName(person.firstName);
    var myPref = normName(person.preferredName);
    if (!myFirst && !myPref && !normName(person.lastName)) return [];

    return (all || []).filter(function (o) {
      if (o.id === person.id || o.archived) return false;
      var theirs = normName(o.firstName) + '|' + normName(o.lastName);
      if (mine !== '|' && theirs === mine) return true;
      // Same date of birth is a strong signal even when names differ.
      if (isFilled(person.dob) && person.dob === o.dob) return true;
      // A nickname matching a first name catches "Mike" vs "Michael".
      if (myPref && (normName(o.firstName) === myPref || normName(o.preferredName) === myPref)) return true;
      return false;
    });
  }

  /* ----- caseload view -------------------------------------------------
     What a worker needs before a shift: who is overdue, who is drifting,
     and whether the data itself is at risk.
     ------------------------------------------------------------------- */

  function shift(all, settings) {
    var people = (all || []).filter(function (p) { return !p.archived; });
    var s = settings || {};
    var staleDays = parseInt(s.followUpDays, 10) || 14;

    var dueToday = [], overdue = [], drifting = [], urgent = [];

    people.forEach(function (p) {
      var fu = p.followUpDate ? daysAgo(p.followUpDate) : null;
      if (fu !== null && fu > 0) overdue.push({ p: p, days: fu });
      else if (fu !== null && fu === 0) dueToday.push({ p: p, days: 0 });

      var since = daysSinceContact(p);
      if (since !== null && since > staleDays && fu === null) drifting.push({ p: p, days: since });

      var top = suggestions(p, s).filter(function (x) { return x.level === 'urgent'; });
      if (top.length) urgent.push({ p: p, items: top });
    });

    overdue.sort(function (a, b) { return b.days - a.days; });
    drifting.sort(function (a, b) { return b.days - a.days; });

    // Data safety: local-only storage is private but it is also fragile.
    var backupWarning = null;
    var lastBackup = Util.dateOf(s.lastBackupAt);
    var bAge = lastBackup ? daysAgo(lastBackup) : null;
    if (people.length && (bAge === null || bAge > 7)) {
      backupWarning = bAge === null
        ? 'No backup has ever been made. These records exist in one browser on one device.'
        : 'Last backup was ' + agoPhrase(bAge) + '. ' + plural(people.length, 'record') + ' at risk.';
    }

    return {
      total: people.length,
      dueToday: dueToday,
      overdue: overdue,
      drifting: drifting,
      urgent: urgent,
      backupWarning: backupWarning,
      staleDays: staleDays
    };
  }

  /* ----- what a local HMIS will ask for --------------------------------
     This app is not an HMIS and does not pretend to be one. But the same
     facts get asked for again at intake, and re-interviewing someone about
     the worst period of their life because a form was not filled in is a
     real harm. So: track which of HUD's Universal Data Elements are
     already known, and flag the gaps before that conversation happens.
     ------------------------------------------------------------------- */

  var HMIS_ELEMENTS = [
    { id: '3.01', t: 'Name',                  get: function (p) { return p.firstName && p.lastName; } },
    { id: '3.02', t: 'Social Security Number', get: function (p) { return p.hmis.ssnOnFile; },
      note: 'This app records only whether the number is held elsewhere — never the number itself.' },
    { id: '3.03', t: 'Date of Birth',         get: function (p) { return p.dob; } },
    { id: '3.04', t: 'Race and Ethnicity',    get: function (p) { return p.hmis.raceEthnicity; } },
    { id: '3.06', t: 'Gender',                get: function (p) { return p.hmis.gender; } },
    { id: '3.07', t: 'Veteran Status',        get: function (p) { return p.veteran || p.hmis.veteranAsked; } },
    { id: '3.08', t: 'Disabling Condition',   get: function (p) { return p.disability || p.hmis.disabilityAsked; } },
    { id: '3.917', t: 'Prior Living Situation', get: function (p) { return p.stay.situation; } },
    { id: '3.917', t: 'Length of time homeless', get: function (p) { return p.hmis.homelessMonths || p.stay.homelessSince; } },
    { id: '3.16', t: 'Continuum of Care',     get: function (p) { return p.hmis.coc; } },
    { id: '4.13', t: 'Date of Engagement',    get: function (p) { return p.engagementDate; } },
    { id: '3.20', t: 'Housing Move-in Date',  get: function (p) { return p.housedDate; }, optional: true }
  ];

  function hmisReadiness(p) {
    var rows = HMIS_ELEMENTS.map(function (e) {
      return { id: e.id, t: e.t, note: e.note, optional: e.optional, have: isFilled(e.get(p)) };
    });
    var counted = rows.filter(function (r) { return !r.optional; });
    var have = counted.filter(function (r) { return r.have; }).length;
    return { rows: rows, have: have, total: counted.length,
             pct: Math.round((have / counted.length) * 100) };
  }

  return {
    STAGES: STAGES,
    stageOf: stageOf,
    stageMeta: stageMeta,
    stageIndex: stageIndex,
    suggestions: suggestions,
    completeness: completeness,
    chronicSignal: chronicSignal,
    duplicatesOf: duplicatesOf,
    shift: shift,
    hmisReadiness: hmisReadiness,
    activeGoals: activeGoals,
    openReferrals: openReferrals,
    isFilled: isFilled,
    daysBetween: daysBetween,
    lastContactDate: lastContactDate,
    daysSinceContact: daysSinceContact,
    coreDocsHeld: coreDocsHeld,
    agoPhrase: agoPhrase,
    daysAgo: daysAgo,
    todayStr: todayStr,
    plural: plural
  };
})();
