/* ==========================================================================
   report.js — the funder report.

   Contracts and grants ask the same handful of questions every month or
   quarter: how many people did you reach, how often, how many engaged,
   were assessed, got housed. Counting that by hand from case notes takes a
   day and is usually wrong. This counts it from the records, for any date
   range, and never includes anything identifying — only totals.

   Pure functions over the records, like flow.js: no storage, no DOM.
   ========================================================================== */

var Report = (function () {
  'use strict';

  var has = Util.has;

  function inRange(date, from, to) {
    return has(date) && date >= from && date <= to;
  }

  function ageOn(dob, day) {
    if (!has(dob)) return null;
    var b = new Date(dob + 'T12:00:00'), d = new Date(day + 'T12:00:00');
    if (isNaN(b) || isNaN(d)) return null;
    var a = d.getFullYear() - b.getFullYear();
    if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--;
    return a;
  }

  function tally(map, key) { if (has(key)) map[key] = (map[key] || 0) + 1; }

  function ranked(map) {
    return Object.keys(map).map(function (k) { return { k: k, n: map[k] }; })
      .sort(function (a, b) { return b.n - a.n || a.k.localeCompare(b.k); });
  }

  function firstDate(p) {
    var dates = (p.log || []).map(function (l) { return l.date; }).filter(has).sort();
    var created = Util.dateOf(p.createdAt);
    if (dates.length && (!created || dates[0] < created)) return dates[0];
    return created;
  }

  // Preset periods for the picker. Each returns { from, to } as local dates.
  function period(kind, today) {
    today = today || Util.todayStr();
    var t = new Date(today + 'T12:00:00');
    var y = t.getFullYear(), m = t.getMonth();
    var L = Util.localDate;
    if (kind === 'this-month') return { from: L(new Date(y, m, 1)), to: today };
    if (kind === 'last-month') return { from: L(new Date(y, m - 1, 1)), to: L(new Date(y, m, 0)) };
    if (kind === 'this-quarter') {
      var q = Math.floor(m / 3) * 3;
      return { from: L(new Date(y, q, 1)), to: today };
    }
    if (kind === 'last-quarter') {
      var lq = Math.floor(m / 3) * 3 - 3;
      return { from: L(new Date(y, lq, 1)), to: L(new Date(y, lq + 3, 0)) };
    }
    if (kind === 'this-year') return { from: L(new Date(y, 0, 1)), to: today };
    // last 30 days
    var s = new Date(t); s.setDate(s.getDate() - 29);
    return { from: L(s), to: today };
  }

  /* opts: { from, to, includeSamples } */
  function build(all, opts) {
    var from = opts.from, to = opts.to;
    var people = (all || []).filter(function (p) { return opts.includeSamples || !p.isSample; });

    var r = {
      from: from, to: to,
      reached: 0, contacts: 0, newPeople: 0,
      engaged: 0, assessed: 0, housed: 0,
      referrals: 0, referralsCompleted: 0,
      goalsAchieved: 0,
      consentRecorded: 0,
      chronic: 0, veterans: 0, youth: 0, withChildren: 0, withPets: 0,
      contactTypes: [], situations: [], needs: [], barriers: [],
      excludedSamples: (all || []).length - people.length
    };

    var types = {}, sits = {}, needs = {}, barriers = {};

    people.forEach(function (p) {
      var inPeriod = (p.log || []).filter(function (l) { return inRange(l.date, from, to); });
      var reached = inPeriod.length > 0;

      r.contacts += inPeriod.length;
      inPeriod.forEach(function (l) { tally(types, l.type || 'Other'); });

      if (inRange(firstDate(p), from, to)) r.newPeople++;
      if (inRange(p.engagementDate, from, to)) r.engaged++;
      if (inRange(p.assessmentDate, from, to)) r.assessed++;
      if (inRange(p.housedDate, from, to)) r.housed++;

      (p.referrals || []).forEach(function (ref) {
        if (!inRange(ref.date, from, to)) return;
        r.referrals++;
        if (ref.status === 'Attended' || ref.status === 'Enrolled') r.referralsCompleted++;
      });

      (p.goals || []).forEach(function (g) {
        if (g.status !== 'Achieved') return;
        var when = Util.dateOf(g.updatedAt) || g.targetDate;
        if (inRange(when, from, to)) r.goalsAchieved++;
      });

      if (!reached) return;
      // Everything below describes the people reached in the period.
      r.reached++;
      if (p.consent && p.consent.dataConsent) r.consentRecorded++;
      if (Flow.chronicSignal(p).qualifies) r.chronic++;
      if (p.veteran) r.veterans++;
      var age = ageOn(p.dob, to);
      if (age !== null && age >= 16 && age < 25) r.youth++;
      if (p.stay.withChildren) r.withChildren++;
      if (p.stay.withPets) r.withPets++;
      tally(sits, p.stay.situation || 'Not recorded');
      (p.needs || []).forEach(function (n) { tally(needs, n); });
      (p.barriers || []).forEach(function (b) { tally(barriers, b); });
    });

    r.contactTypes = ranked(types);
    r.situations = ranked(sits);
    r.needs = ranked(needs).slice(0, 10);
    r.barriers = ranked(barriers).slice(0, 10);
    return r;
  }

  // The headline figures as label/value rows, shared by screen, print and CSV.
  function headline(r) {
    return [
      ['People reached (at least one contact)', r.reached],
      ['Contacts logged', r.contacts],
      ['New people met', r.newPeople],
      ['Engaged (date of engagement in period)', r.engaged],
      ['Assessed for housing', r.assessed],
      ['Moved into housing', r.housed],
      ['Referrals made', r.referrals],
      ['Referrals attended or enrolled', r.referralsCompleted],
      ['Goals achieved', r.goalsAchieved],
      ['Reached with consent on file', r.consentRecorded],
      ['Reached who may meet the chronic definition', r.chronic],
      ['Veterans reached', r.veterans],
      ['Young people (16–24) reached', r.youth],
      ['Reached who stay with children', r.withChildren],
      ['Reached who have pets', r.withPets]
    ];
  }

  function csv(r) {
    var rows = [['Outreach report', r.from + ' to ' + r.to], [], ['Measure', 'Count']];
    headline(r).forEach(function (h) { rows.push(h); });
    function block(title, list) {
      rows.push([]);
      rows.push([title, 'Count']);
      list.forEach(function (x) { rows.push([x.k, x.n]); });
    }
    block('Contacts by type', r.contactTypes);
    block('Living situation of people reached', r.situations);
    block('Most common needs', r.needs);
    block('Most common barriers', r.barriers);
    return rows;
  }

  return { build: build, headline: headline, csv: csv, period: period, ageOn: ageOn };
})();
