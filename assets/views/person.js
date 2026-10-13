/* ==========================================================================
   views/person.js — One person: the header, the tab bar, and the simpler tabs.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

  /* ---------- person ---------- */

  function viewPerson() {
    var p = App.person();
    if (!p) { state.view = 'people'; return Views.people(); }

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
      (p.archived ? '<span class="badge">Archived</span>' : '') +
      (p.isSample ? '<span class="badge">sample</span>' : '') +
      '<span class="badge stage">' + esc(Flow.stageMeta(Flow.stageOf(p)).t) + '</span>' +
      (Flow.activeGoals(p).length ? '<span class="badge accent">' + Flow.activeGoals(p).length + ' active goal' + (Flow.activeGoals(p).length === 1 ? '' : 's') + '</span>' : '') +
      (Flow.lastContactDate(p) ? '<span class="badge">Last seen ' + esc(Doc.fmtDate(Flow.lastContactDate(p))) + '</span>' : '<span class="badge warn">No contact logged</span>') +
      (p.consent && p.consent.dataConsent ? '<span class="badge ok">Consent recorded</span>' : '<span class="badge warn">No consent recorded</span>') +
      '</div></div>' +
      '<div class="btn-row"><button class="btn" data-action="quick-log">＋ Log contact</button>' +
      '<button class="btn primary" data-action="tab" data-tab="doc">🖨 Documentation</button></div>' +
      '</div>';

    h += '<div class="tabs">' + C.PERSON_TABS.map(function (t) {
      return '<button data-action="tab" data-tab="' + t.k + '"' +
        (state.tab === t.k ? ' class="active"' : '') + '>' + esc(t.t) + '</button>';
    }).join('') + '</div>';

    if (state.tab === 'overview') h += tabOverview(p);
    else if (state.tab === 'plan') h += Views.tabPlan(p);
    else if (state.tab === 'stay') h += tabStay(p);
    else if (state.tab === 'goals') h += tabGoals(p);
    else if (state.tab === 'story') h += tabStory(p);
    else if (state.tab === 'needs') h += tabNeeds(p);
    else if (state.tab === 'log') h += Views.tabLog(p);
    else if (state.tab === 'doc') h += Views.tabDoc(p);
    else h += tabOverview(p);

    return h;
  }

  function tabOverview(p) {
    var h = '';

    var photo = Util.safeImage(p.photo);
    h += '<div class="card"><div class="card-head"><h2>Photo</h2></div>' +
      '<p class="section-hint">Ask before taking a photo, and record their consent below. A photo helps a team recognise someone, and helps reunite people with services that have met them before.</p>' +
      '<div class="photo-block"><div class="photo-frame">' +
      (photo
        ? '<img src="' + photo + '" alt="Photo of ' + esc(Doc.shortName(p)) + '">'
        : '<div class="placeholder"><span class="big">📷</span>No photo yet</div>') +
      '</div><div style="flex:1;min-width:220px">' +
      '<div class="btn-row mb16">' +
      '<button class="btn" data-action="photo-pick">Choose a photo</button>' +
      '<button class="btn" data-action="photo-camera">Use camera</button>' +
      (photo ? '<button class="btn danger" data-action="photo-clear">Remove</button>' : '') +
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

    h += '<div class="card"><div class="card-head"><h3 class="mb0">Archive or delete</h3></div>' +
      '<p class="section-hint">Archive someone who has moved on, been housed for good, or asked ' +
      'not to be contacted: the record leaves Today, Overview and the People list but is kept, ' +
      'and still counts in funder reports. Deleting cannot be undone.</p>' +
      '<div class="btn-row">' +
      (p.archived
        ? '<button class="btn" data-action="archive-person" data-on="0">Restore from archive</button>'
        : '<button class="btn" data-action="archive-person" data-on="1">Archive this record</button>') +
      '<button class="btn danger" data-action="delete-person">Delete this record</button></div></div>';

    return h;
  }

  function tabStay(p) {
    var s = p.stay || {};
    var h = '';

    h += '<div class="card"><div class="card-head"><h2>Where they stay</h2></div>' +
      '<p class="section-hint">Describe the place well enough that a colleague could find them again — and note anything about safety before someone approaches.</p>' +
      select('Living situation', 'stay.situation', s.situation, C.SITUATIONS) +
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
        '<div>' + select('Area of life', b + 'category', g.category, C.GOAL_CATEGORIES) + '</div>' +
        '<div>' + select('How it is going', b + 'status', g.status, C.GOAL_STATUS) + '</div>' +
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
      chipGroup('What they need right now', 'needs', C.NEEDS, p.needs, 'Tap everything that applies.') +
      '</div>';

    h += '<div class="card">' +
      chipGroup('What is standing in the way', 'barriers', C.BARRIERS, p.barriers,
        'Naming barriers plainly is what makes a referral useful to the person receiving it.') +
      '</div>';

    h += '<div class="card">' +
      chipGroup('Benefits they already receive', 'benefits', C.BENEFITS, p.benefits) +
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
          '<div>' + select('Status', b + 'status', d.status, C.DOC_STATUS, { placeholder: 'Unknown' }) + '</div>' +
          '</div><div class="row">' +
          '<div>' + text('Notes', b + 'notes', d.notes, { placeholder: 'Where it is kept, what was applied for' }) + '</div>' +
          '<div>' + text('Expires', b + 'expires', d.expires, { type: 'date' }) + '</div>' +
          '</div></div>';
      }).join('');
    }
    h += '</div>';

    return h;
  }

  Views.person = viewPerson;
})();
