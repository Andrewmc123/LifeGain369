/* ==========================================================================
   doc.js — the documentation packet.

   One record becomes: a printable page, a plain-text version for an email
   body, and a standalone HTML file that can be attached or opened anywhere.
   Every section is optional, because who you are sending it to decides how
   much of someone's private life should travel with it.
   ========================================================================== */

var Doc = (function () {
  'use strict';

  var SECTIONS = [
    { key: 'photo',    label: 'Photo' },
    { key: 'identity', label: 'Name & contact' },
    { key: 'stay',     label: 'Where they stay' },
    { key: 'timeline', label: 'Housing history & key dates' },
    { key: 'goals',    label: 'Goals — what they’re working toward' },
    { key: 'story',    label: 'My Story (in their words)' },
    { key: 'needs',    label: 'Needs, barriers & health' },
    { key: 'docs',     label: 'Documents checklist' },
    { key: 'log',      label: 'Contact log' },
    { key: 'referrals',label: 'Referrals & services' },
    { key: 'consent',  label: 'Consent record' },
    { key: 'signature',label: 'Signature lines' }
  ];

  var PRESETS = {
    full:     { label: 'Full record', on: ['photo','identity','stay','timeline','goals','story','needs','docs','log','referrals','consent','signature'] },
    referral: { label: 'Referral packet', on: ['photo','identity','stay','timeline','goals','needs','docs','consent','signature'] },
    story:    { label: 'Story sheet', on: ['photo','identity','story','goals','consent'] },
    housing:  { label: 'Housing application support', on: ['identity','stay','timeline','goals','docs','needs','consent','signature'] },
    contact:  { label: 'Contact card', on: ['photo','identity','stay'] }
  };

  /* ----- small helpers ------------------------------------------------ */

  var esc = Util.esc, has = Util.has;

  function fullName(p) {
    var name = [p.firstName, p.lastName].filter(has).join(' ').trim();
    if (has(p.preferredName)) {
      return name ? p.preferredName + ' (' + name + ')' : p.preferredName;
    }
    return name || 'Unnamed record';
  }

  function shortName(p) {
    return (has(p.preferredName) ? p.preferredName
      : [p.firstName, p.lastName].filter(has).join(' ')) || 'Unnamed record';
  }

  function fmtDate(iso) {
    if (!has(iso)) return '';
    var d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtDateTime(iso) {
    if (!has(iso)) return '';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function age(dob) {
    if (!has(dob)) return '';
    var d = new Date(dob + 'T12:00:00');
    if (isNaN(d)) return '';
    var t = new Date();
    var a = t.getFullYear() - d.getFullYear();
    var m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? String(a) : '';
  }

  function daysSince(iso) {
    if (!has(iso)) return '';
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return '';
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days < 0) return '';
    if (days < 31) return days + ' days';
    if (days < 365) return Math.round(days / 30.4) + ' months';
    return (days / 365).toFixed(1) + ' years';
  }

  function row(k, v) {
    if (!has(v)) return '';
    return '<div class="p-row"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>';
  }

  function none(text) { return '<div class="p-none">' + esc(text) + '</div>'; }

  function locationLine(p) {
    var s = p.stay || {};
    return [s.locationName, s.crossStreets, [s.city, s.state].filter(has).join(', '), s.zip]
      .filter(has).join(' · ');
  }

  /* ----- packet HTML -------------------------------------------------- */

  function packetHTML(p, opts) {
    opts = opts || {};
    var on = opts.sections || PRESETS.full.on;
    var settings = opts.settings || {};
    var want = function (k) { return on.indexOf(k) !== -1; };
    var out = [];
    var s = p.stay || {};
    var story = p.story || {};

    /* header */
    out.push('<div class="p-head">');
    var photo = Util.safeImage(p.photo);
    if (want('photo') && photo) {
      out.push('<img class="p-photo" src="' + photo + '" alt="Photo of ' + esc(shortName(p)) + '">');
    }
    out.push('<div class="p-id">');
    out.push('<h1>' + esc(fullName(p)) + '</h1>');
    var metaBits = [];
    if (has(p.pronouns)) metaBits.push(esc(p.pronouns));
    if (age(p.dob)) metaBits.push('Age ' + age(p.dob));
    if (has(p.caseNumber)) metaBits.push('Case #' + esc(p.caseNumber));
    if (locationLine(p)) metaBits.push(esc(locationLine(p)));
    out.push('<div class="p-meta">' + metaBits.join(' &nbsp;•&nbsp; ') + '</div>');
    out.push('</div>');
    out.push('<div class="p-org">');
    var logo = Util.safeImage(settings.orgLogo);
    if (logo) out.push('<img class="p-logo" src="' + logo + '" alt=""><br>');
    if (has(settings.orgName)) out.push('<strong>' + esc(settings.orgName) + '</strong><br>');
    if (has(settings.orgContact)) out.push(esc(settings.orgContact) + '<br>');
    out.push('Prepared ' + esc(fmtDate(new Date().toISOString())));
    if (has(settings.workerName)) out.push('<br>by ' + esc(settings.workerName));
    out.push('</div>');
    out.push('</div>');

    /* identity */
    if (want('identity')) {
      out.push('<h2 class="p-sec">Contact &amp; identity</h2>');
      var idRows = [
        row('Legal name', [p.firstName, p.lastName].filter(has).join(' ')),
        row('Goes by', p.preferredName),
        row('Pronouns', p.pronouns),
        row('Date of birth', fmtDate(p.dob) + (age(p.dob) ? ' (age ' + age(p.dob) + ')' : '')),
        row('Phone', p.phone),
        row('Email', p.email),
        row('Case number', p.caseNumber),
        row('Languages', p.languages),
        row('Veteran', p.veteran ? 'Yes' : ''),
        row('Disability reported', p.disability ? 'Yes' : '')
      ].filter(has).join('');
      out.push(idRows ? '<div class="p-grid">' + idRows + '</div>' : none('No contact details recorded.'));
    }

    /* where they stay */
    if (want('stay')) {
      out.push('<h2 class="p-sec">Where they stay</h2>');
      var withWho = [];
      if (s.withPartner) withWho.push('partner');
      if (s.withChildren) withWho.push('children' + (has(s.childrenCount) ? ' (' + s.childrenCount + ')' : ''));
      if (s.withPets) withWho.push('pets' + (has(s.petDetails) ? ' — ' + s.petDetails : ''));

      var stayRows = [
        row('Living situation', s.situation),
        row('Location', s.locationName),
        row('Cross streets', s.crossStreets),
        row('City / State / ZIP', [[s.city, s.state].filter(has).join(', '), s.zip].filter(has).join(' ')),
        row('Area / neighborhood', s.area),
        row('At this spot since', fmtDate(s.sinceDate) + (daysSince(s.sinceDate) ? ' (' + daysSince(s.sinceDate) + ')' : '')),
        row('Time at location', s.timeAtLocation),
        row('Homeless since', fmtDate(s.homelessSince) + (daysSince(s.homelessSince) ? ' (' + daysSince(s.homelessSince) + ')' : '')),
        row('Best time to find', s.bestTimeToFind),
        row('Staying with', withWho.join(', ')),
        row('GPS', has(s.gpsLat) ? s.gpsLat + ', ' + s.gpsLng : '')
      ].filter(has).join('');
      out.push(stayRows ? '<div class="p-grid">' + stayRows + '</div>' : none('No location recorded.'));
      if (has(s.safetyNotes)) out.push('<div style="margin-top:8px"><strong>Safety notes:</strong> ' + esc(s.safetyNotes) + '</div>');
      if (has(s.stayNotes)) out.push('<div style="margin-top:6px">' + esc(s.stayNotes) + '</div>');
    }

    /* The dates a receiving agency asks for first, and that are hardest to
       reconstruct from memory. Deliberately does NOT carry the worker-facing
       next steps: those are internal prompts, not something to hand over. */
    if (want('timeline')) {
      out.push('<h2 class="p-sec">Housing history &amp; key dates</h2>');
      var hm = p.hmis || {};
      var tRows = [
        row('Homeless since', fmtDate(s.homelessSince) + (daysSince(s.homelessSince) ? ' (' + daysSince(s.homelessSince) + ')' : '')),
        row('Months homeless (approx.)', hm.homelessMonths),
        row('Separate episodes in last 3 years', hm.homelessTimes),
        row('Disabling condition recorded', p.disability ? 'Yes' : ''),
        row('Veteran', p.veteran ? 'Yes' : ''),
        row('Date of engagement', fmtDate(p.engagementDate)),
        row('Assessment completed', fmtDate(p.assessmentDate)),
        row('Moved in', fmtDate(p.housedDate)),
        row('Continuum of Care', hm.coc),
        row('Local client ID', hm.clientCode),
        row('Household', hm.householdType)
      ].filter(has).join('');
      out.push(tRows ? '<div class="p-grid">' + tRows + '</div>' : none('No dates recorded yet.'));

      var ch = (typeof Flow !== 'undefined') ? Flow.chronicSignal(p) : null;
      if (ch && ch.qualifies) {
        out.push('<div class="p-flag"><strong>May meet the HUD definition of chronic homelessness</strong> — ' +
          'recorded as ' + Math.round(ch.months) + ' months' +
          (ch.times ? ' across ' + ch.times + ' episodes' : '') +
          ' with a disabling condition. To be confirmed by an assessor; this is a prompt to check, ' +
          'not a determination.</div>');
      }
    }

    /* goals */
    if (want('goals')) {
      out.push('<h2 class="p-sec">What they are working toward</h2>');
      if (!has(p.goals)) {
        out.push(none('No goals recorded yet.'));
      } else {
        p.goals.forEach(function (g) {
          out.push('<div class="p-goal">');
          out.push('<div class="g-t">' + esc(g.title || 'Untitled goal') + '</div>');
          var sub = [];
          if (has(g.category)) sub.push(esc(g.category));
          if (has(g.status)) sub.push(esc(g.status));
          if (has(g.targetDate)) sub.push('target ' + esc(fmtDate(g.targetDate)));
          if (sub.length) out.push('<div class="g-s">' + sub.join(' • ') + '</div>');
          if (has(g.why)) out.push('<div style="margin-top:5px"><em>Why this matters:</em> ' + esc(g.why) + '</div>');
          if (has(g.steps)) out.push('<div style="margin-top:5px"><em>Next steps:</em> ' + esc(g.steps) + '</div>');
          if (has(g.support)) out.push('<div style="margin-top:5px"><em>Support needed:</em> ' + esc(g.support) + '</div>');
          if (has(g.notes)) out.push('<div style="margin-top:5px">' + esc(g.notes) + '</div>');
          out.push('</div>');
        });
      }
    }

    /* my story */
    if (want('story')) {
      out.push('<h2 class="p-sec">My Story</h2>');
      if (has(story.quote)) out.push('<div class="p-quote">“' + esc(story.quote) + '”</div>');
      if (has(story.text)) {
        out.push('<div class="p-story">' + esc(story.text) + '</div>');
      } else if (!has(story.quote)) {
        out.push(none('No story recorded yet.'));
      }
      if (has(story.strengths)) out.push('<div style="margin-top:10px"><strong>Strengths &amp; skills:</strong> ' + esc(story.strengths) + '</div>');
      if (has(story.hopes)) out.push('<div style="margin-top:6px"><strong>Hopes:</strong> ' + esc(story.hopes) + '</div>');
      var credit = [];
      if (story.toldInOwnWords) credit.push('Recorded in their own words');
      if (has(story.recordedBy)) credit.push('written down by ' + story.recordedBy);
      if (has(story.recordedAt)) credit.push('on ' + fmtDate(story.recordedAt));
      if (credit.length) out.push('<div style="margin-top:10px;font-size:11px;color:#777">' + esc(credit.join(', ')) + '.</div>');
    }

    /* needs */
    if (want('needs')) {
      out.push('<h2 class="p-sec">Needs, barriers &amp; supports</h2>');
      var any = false;
      if (has(p.needs)) { any = true; out.push('<div style="margin-bottom:8px"><strong style="font-size:12.5px">Immediate needs</strong><div class="p-taglist" style="margin-top:4px">' + p.needs.map(function (n) { return '<span class="p-tag">' + esc(n) + '</span>'; }).join('') + '</div></div>'); }
      if (has(p.barriers)) { any = true; out.push('<div style="margin-bottom:8px"><strong style="font-size:12.5px">Barriers</strong><div class="p-taglist" style="margin-top:4px">' + p.barriers.map(function (n) { return '<span class="p-tag">' + esc(n) + '</span>'; }).join('') + '</div></div>'); }
      if (has(p.benefits)) { any = true; out.push('<div style="margin-bottom:8px"><strong style="font-size:12.5px">Benefits already receiving</strong><div class="p-taglist" style="margin-top:4px">' + p.benefits.map(function (n) { return '<span class="p-tag">' + esc(n) + '</span>'; }).join('') + '</div></div>'); }
      var hRows = [row('Insurance', p.insurance), row('Health notes', p.healthNotes)].filter(has).join('');
      if (hRows) { any = true; out.push('<div class="p-grid">' + hRows + '</div>'); }
      if (!any) out.push(none('No needs recorded.'));
    }

    /* documents */
    if (want('docs')) {
      out.push('<h2 class="p-sec">Documents checklist</h2>');
      if (!has(p.documents)) {
        out.push(none('No documents tracked.'));
      } else {
        out.push('<table class="p-tbl"><thead><tr><th style="width:42%">Document</th><th style="width:16%">Status</th><th>Notes</th></tr></thead><tbody>');
        p.documents.forEach(function (d) {
          out.push('<tr><td>' + esc(d.name) + '</td><td>' + esc(statusLabel(d.status)) + '</td><td>' +
            esc([d.notes, has(d.expires) ? 'expires ' + fmtDate(d.expires) : ''].filter(has).join(' — ')) + '</td></tr>');
        });
        out.push('</tbody></table>');
      }
    }

    /* contact log */
    if (want('log')) {
      out.push('<h2 class="p-sec">Contact log</h2>');
      if (!has(p.log)) {
        out.push(none('No contacts logged.'));
      } else {
        out.push('<table class="p-tbl"><thead><tr><th style="width:16%">Date</th><th style="width:18%">Type</th><th style="width:18%">Worker</th><th>Notes</th></tr></thead><tbody>');
        sortByDate(p.log).forEach(function (l) {
          out.push('<tr><td>' + esc(fmtDate(l.date)) + '</td><td>' + esc(l.type) + '</td><td>' + esc(l.worker) + '</td><td>' + esc(l.notes) + '</td></tr>');
        });
        out.push('</tbody></table>');
      }
    }

    /* referrals */
    if (want('referrals')) {
      out.push('<h2 class="p-sec">Referrals &amp; services</h2>');
      if (!has(p.referrals)) {
        out.push(none('No referrals recorded.'));
      } else {
        out.push('<table class="p-tbl"><thead><tr><th style="width:16%">Date</th><th style="width:24%">Organization</th><th style="width:22%">Service</th><th style="width:14%">Status</th><th>Notes</th></tr></thead><tbody>');
        sortByDate(p.referrals).forEach(function (r) {
          out.push('<tr><td>' + esc(fmtDate(r.date)) + '</td><td>' + esc(r.org) + '</td><td>' + esc(r.service) + '</td><td>' + esc(r.status) + '</td><td>' + esc([r.contact, r.notes].filter(has).join(' — ')) + '</td></tr>');
        });
        out.push('</tbody></table>');
      }
    }

    /* consent */
    if (want('consent')) {
      var c = p.consent || {};
      out.push('<h2 class="p-sec">Consent</h2>');
      out.push('<div class="p-grid">' +
        row('Agreed to record information', c.dataConsent ? 'Yes' : 'Not recorded') +
        row('Agreed to photo', c.photoConsent ? 'Yes' : 'Not recorded') +
        row('Agreed to share story', c.storyConsent ? 'Yes' : 'Not recorded') +
        row('Signed by', c.signedName) +
        row('Date', fmtDate(c.signedDate)) +
        '</div>');
    }

    /* signature */
    if (want('signature')) {
      out.push('<div class="p-sign">' +
        '<div><div class="line">Signature of person named above &nbsp;·&nbsp; Date</div></div>' +
        '<div><div class="line">Outreach worker signature &nbsp;·&nbsp; Date</div></div>' +
        '</div>');
    }

    /* footer */
    out.push('<div class="p-foot">' + esc(settings.confidentialityNote || '') +
      '<br>Record last updated ' + esc(fmtDateTime(p.updatedAt)) +
      ' · Generated ' + esc(fmtDateTime(new Date().toISOString())) + '</div>');

    return '<div class="packet">' + out.join('\n') + '</div>';
  }

  function statusLabel(s) {
    return { have: 'Has it', need: 'Needs it', applied: 'Applied for', lost: 'Lost / stolen', unknown: 'Unknown' }[s] || s || '';
  }

  function sortByDate(list) {
    return list.slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  /* ----- plain text (for an email body) -------------------------------- */

  function packetText(p, opts) {
    opts = opts || {};
    var on = opts.sections || PRESETS.full.on;
    var settings = opts.settings || {};
    var want = function (k) { return on.indexOf(k) !== -1; };
    var s = p.stay || {};
    var story = p.story || {};
    var L = [];
    var line = function (k, v) { if (has(v)) L.push('  ' + k + ': ' + v); };
    var head = function (t) { L.push(''); L.push(t.toUpperCase()); L.push('-'.repeat(Math.min(t.length, 60))); };

    L.push(fullName(p));
    if (has(settings.orgName)) L.push(settings.orgName);
    L.push('Prepared ' + fmtDate(new Date().toISOString()) + (has(settings.workerName) ? ' by ' + settings.workerName : ''));

    if (want('identity')) {
      head('Contact & identity');
      line('Goes by', p.preferredName);
      line('Pronouns', p.pronouns);
      line('Date of birth', fmtDate(p.dob) + (age(p.dob) ? ' (age ' + age(p.dob) + ')' : ''));
      line('Phone', p.phone);
      line('Email', p.email);
      line('Case number', p.caseNumber);
      line('Languages', p.languages);
      if (p.veteran) line('Veteran', 'Yes');
    }

    if (want('stay')) {
      head('Where they stay');
      line('Living situation', s.situation);
      line('Location', s.locationName);
      line('Cross streets', s.crossStreets);
      line('City/State/ZIP', [[s.city, s.state].filter(has).join(', '), s.zip].filter(has).join(' '));
      line('At this spot since', fmtDate(s.sinceDate));
      line('Homeless since', fmtDate(s.homelessSince));
      line('Best time to find', s.bestTimeToFind);
      line('Safety notes', s.safetyNotes);
    }

    if (want('timeline')) {
      head('Housing history & key dates');
      var hmt = p.hmis || {};
      line('Homeless since', fmtDate(s.homelessSince));
      line('Months homeless (approx.)', hmt.homelessMonths);
      line('Separate episodes in last 3 years', hmt.homelessTimes);
      line('Disabling condition recorded', p.disability ? 'Yes' : '');
      line('Veteran', p.veteran ? 'Yes' : '');
      line('Date of engagement', fmtDate(p.engagementDate));
      line('Assessment completed', fmtDate(p.assessmentDate));
      line('Moved in', fmtDate(p.housedDate));
      line('Continuum of Care', hmt.coc);
      line('Local client ID', hmt.clientCode);
      var cht = (typeof Flow !== 'undefined') ? Flow.chronicSignal(p) : null;
      if (cht && cht.qualifies) {
        L.push('  ** May meet the HUD chronic homelessness definition — to be');
        L.push('     confirmed by an assessor, not a determination made here. **');
      }
    }

    if (want('goals')) {
      head('What they are working toward');
      if (!has(p.goals)) L.push('  (none recorded)');
      p.goals.forEach(function (g, i) {
        L.push('  ' + (i + 1) + '. ' + (g.title || 'Untitled goal') +
          (has(g.status) ? '  [' + g.status + ']' : ''));
        if (has(g.why)) L.push('     Why: ' + g.why);
        if (has(g.steps)) L.push('     Next steps: ' + g.steps);
        if (has(g.support)) L.push('     Support needed: ' + g.support);
      });
    }

    if (want('story')) {
      head('My Story');
      if (has(story.quote)) L.push('  "' + story.quote + '"');
      if (has(story.text)) { L.push(''); L.push(wrap(story.text, 76, '  ')); }
      if (has(story.strengths)) { L.push(''); L.push('  Strengths: ' + story.strengths); }
      if (has(story.hopes)) L.push('  Hopes: ' + story.hopes);
      if (!has(story.quote) && !has(story.text)) L.push('  (none recorded)');
    }

    if (want('needs')) {
      head('Needs, barriers & supports');
      line('Immediate needs', (p.needs || []).join(', '));
      line('Barriers', (p.barriers || []).join(', '));
      line('Benefits', (p.benefits || []).join(', '));
      line('Insurance', p.insurance);
      line('Health notes', p.healthNotes);
    }

    if (want('docs') && has(p.documents)) {
      head('Documents checklist');
      p.documents.forEach(function (d) {
        L.push('  [' + (d.status === 'have' ? 'x' : ' ') + '] ' + d.name + ' — ' + statusLabel(d.status) +
          (has(d.notes) ? ' (' + d.notes + ')' : ''));
      });
    }

    if (want('log') && has(p.log)) {
      head('Contact log');
      sortByDate(p.log).forEach(function (l) {
        L.push('  ' + fmtDate(l.date) + ' — ' + [l.type, l.worker].filter(has).join(', '));
        if (has(l.notes)) L.push('     ' + l.notes);
      });
    }

    if (want('referrals') && has(p.referrals)) {
      head('Referrals & services');
      sortByDate(p.referrals).forEach(function (r) {
        L.push('  ' + fmtDate(r.date) + ' — ' + [r.org, r.service, r.status].filter(has).join(' / '));
        if (has(r.notes)) L.push('     ' + r.notes);
      });
    }

    if (want('consent')) {
      var c = p.consent || {};
      head('Consent');
      line('Information', c.dataConsent ? 'Yes' : 'Not recorded');
      line('Photo', c.photoConsent ? 'Yes' : 'Not recorded');
      line('Story', c.storyConsent ? 'Yes' : 'Not recorded');
      line('Signed by', c.signedName);
      line('Date', fmtDate(c.signedDate));
    }

    L.push('');
    L.push('-'.repeat(60));
    L.push(settings.confidentialityNote || '');

    return L.join('\n');
  }

  function wrap(text, width, indent) {
    return String(text).split(/\n/).map(function (para) {
      if (!para.trim()) return '';
      var words = para.split(/\s+/), lines = [], cur = indent;
      words.forEach(function (w) {
        if ((cur + w).length > width && cur.trim()) { lines.push(cur); cur = indent + w + ' '; }
        else cur += w + ' ';
      });
      if (cur.trim()) lines.push(cur);
      return lines.join('\n');
    }).join('\n');
  }

  /* ----- outputs ------------------------------------------------------- */

  // A complete, self-contained file: styles inlined, photo embedded.
  function standaloneHTML(p, opts, css) {
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(fullName(p)) + ' — record</title>\n' +
      '<style>\nbody{margin:0;background:#eceae6;font-family:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;}\n' +
      '.sheet{max-width:8.5in;margin:18px auto;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.16);}\n' +
      '@media print{body{background:#fff;}.sheet{margin:0;box-shadow:none;max-width:none;}@page{margin:14mm;}}\n' +
      css + '\n</style>\n</head>\n<body>\n<div class="sheet">' +
      packetHTML(p, opts) + '</div>\n</body>\n</html>';
  }

  // Printing happens from a hidden iframe rather than a new window: pop-up
  // blockers stop window.open often enough that a worker standing in the rain
  // would just find that the print button does nothing.
  function printPacket(p, opts, css) {
    try {
      var old = document.getElementById('print-frame');
      if (old) old.parentNode.removeChild(old);

      var frame = document.createElement('iframe');
      frame.id = 'print-frame';
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
      document.body.appendChild(frame);

      var fdoc = frame.contentWindow.document;
      fdoc.open();
      fdoc.write(standaloneHTML(p, opts, css));
      fdoc.close();

      // The photo must be decoded before the dialog opens or it prints blank.
      var tries = 0;
      var ready = function () {
        var imgs = fdoc.images || [];
        for (var i = 0; i < imgs.length; i++) {
          if (!imgs[i].complete) return false;
        }
        return true;
      };
      var go = function () {
        if (!ready() && tries++ < 40) return setTimeout(go, 50);
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } catch (e) {
          return fallbackWindow(p, opts, css);
        }
      };
      setTimeout(go, 60);
      return true;
    } catch (e) {
      return fallbackWindow(p, opts, css);
    }
  }

  function fallbackWindow(p, opts, css) {
    var w = window.open('', '_blank');
    if (!w) return false;
    w.document.open();
    w.document.write(standaloneHTML(p, opts, css));
    w.document.close();
    w.onload = function () { setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 350); };
    return true;
  }

  function mailtoLink(p, opts, to) {
    var subject = 'Record: ' + shortName(p) +
      (has(opts.settings && opts.settings.orgName) ? ' — ' + opts.settings.orgName : '');
    var body = packetText(p, opts);
    var MAX = 1800; // mail clients truncate long mailto bodies
    var truncated = false;
    if (body.length > MAX) {
      body = body.slice(0, MAX) +
        '\n\n[...] This summary was shortened to fit an email link.\n' +
        'The full record is in the attached file — use "Download file" in the app and attach it.';
      truncated = true;
    }
    return {
      href: 'mailto:' + encodeURIComponent(to || '') +
            '?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(body),
      truncated: truncated
    };
  }

  return {
    SECTIONS: SECTIONS,
    PRESETS: PRESETS,
    packetHTML: packetHTML,
    packetText: packetText,
    standaloneHTML: standaloneHTML,
    printPacket: printPacket,
    mailtoLink: mailtoLink,
    fullName: fullName,
    shortName: shortName,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    age: age,
    daysSince: daysSince,
    esc: esc,
    has: has,
    statusLabel: statusLabel,
    locationLine: locationLine
  };
})();
