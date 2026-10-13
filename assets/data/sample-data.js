/* ==========================================================================
   sample-data.js — a caseload to explore.

   A new install shows almost nothing, which makes the app hard to judge and
   harder to learn. This builds six invented records that between them
   trigger every rule in flow.js: someone who may qualify as chronically
   homeless, someone recently housed, a first contact with no consent yet, an
   overdue follow-up, a young adult who should never be sent to adult intake,
   and a duplicate.

   Every record is flagged `isSample: true`, badged on screen, and removable
   in one click. The names and details are invented. Nothing here describes a
   real person, and the dates are generated relative to today so the caseload
   always looks current.
   ========================================================================== */

var SAMPLE = (function () {
  'use strict';

  // Days ago -> YYYY-MM-DD, in local time.
  function d(n) { return Util.daysAgoStr(n); }

  function build(blankPerson, uid) {
    function log(days, type, worker, notes) {
      return { id: uid(), date: d(days), type: type, worker: worker, notes: notes };
    }
    function goal(title, category, status, extra) {
      var g = { id: uid(), title: title, category: category, status: status,
                why: '', steps: '', targetDate: '', support: '', notes: '',
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (extra) Object.keys(extra).forEach(function (k) { g[k] = extra[k]; });
      return g;
    }
    function docs(map) {
      return Store.DEFAULT_DOCUMENTS.map(function (name) {
        return { id: uid(), name: name, status: map[name] || 'unknown', notes: '', expires: '' };
      });
    }

    var people = [];

    function add(fn) {
      var p = blankPerson();
      p.isSample = true;
      fn(p);
      // Back-date the record to its earliest logged contact, so the timeline
      // does not claim a record with months of history was started today.
      var dates = (p.log || []).map(function (l) { return l.date; }).filter(Boolean).sort();
      if (dates.length) p.createdAt = dates[0] + 'T09:00:00.000Z';
      people.push(p);
      return p;
    }

    /* --- 1. Long-term unsheltered. Should trip the chronic-homelessness
           prompt and the stale-referral prompt. ------------------------- */
    add(function (p) {
      p.firstName = 'Marcus'; p.lastName = 'Bell'; p.preferredName = 'Marcus';
      p.pronouns = 'he/him'; p.dob = '1971-04-18';
      p.consent.dataConsent = true; p.consent.storyConsent = true;
      p.consent.signedName = 'Marcus Bell'; p.consent.signedDate = d(105);
      p.disability = true;
      p.stay.situation = 'Tent or encampment';
      p.stay.locationName = 'Underpass camp, east side';
      p.stay.crossStreets = 'Bruckner Blvd & Brook Ave';
      p.stay.city = 'Bronx'; p.stay.state = 'NY';
      p.stay.homelessSince = d(820);
      p.stay.sinceDate = d(140);
      p.stay.bestTimeToFind = 'Early morning, before he walks to the day centre';
      p.stay.withPets = true; p.stay.petDetails = 'Dog, Rocket — will not enter shelter without him';
      p.stay.safetyNotes = 'Sleeps with his back to the wall. Approach from the front and say his name first.';
      p.hmis.homelessMonths = '27'; p.hmis.homelessTimes = '4';
      p.hmis.coc = 'NY-600'; p.hmis.gender = 'Man';
      p.engagementDate = d(110);
      p.needs = ['Housing', 'Medical care', 'Identification'];
      p.barriers = ['No ID', 'Health condition', 'Pet with no shelter option'];
      p.benefits = ['SNAP'];
      p.healthNotes = 'Untreated leg ulcer. Has agreed to see the mobile clinic — has not gone yet.';
      p.story.quote = 'I had twenty-two years at the same job. People think you get here overnight.';
      p.story.text =
        'Worked maintenance for the same building company from his twenties until the company folded. ' +
        'Stayed with a cousin for a while, then a room, then the money ran out. Has been outside since ' +
        'his mother died. Says the dog is the only reason he gets up.';
      p.story.strengths = 'Fixes anything mechanical. Watches out for the younger people in the camp.';
      p.story.hopes = 'A place where the dog is allowed. Somewhere to work with his hands again.';
      p.story.recordedBy = 'A. Mitchell'; p.story.recordedAt = d(60);
      p.goals = [
        goal('Replace my state ID', 'Identification', 'Stuck — needs help',
          { why: 'Cannot apply for anything without it', targetDate: d(9),
            notes: 'DMV wants proof of address. Trying a shelter letter instead.' }),
        goal('See someone about my leg', 'Health', 'In progress',
          { targetDate: d(-6), support: 'Mobile clinic visits the camp on Thursdays' }),
        goal('Find housing that takes Rocket', 'Housing', 'In progress',
          { why: 'Will not go anywhere without the dog' })
      ];
      p.documents = docs({ 'Social Security Card': 'have', 'Birth Certificate': 'have',
                           'State ID or Driver’s License': 'lost' });
      p.referrals = [
        { id: uid(), org: 'County Housing — PSH', service: 'Permanent supportive housing',
          date: d(34), status: 'Referred', contact: '', notes: 'No word back yet.' }
      ];
      p.log = [
        log(6, 'Street outreach', 'A. Mitchell', 'Brought socks and dog food. Talked about the ID.'),
        log(19, 'Street outreach', 'A. Mitchell', 'Agreed to the housing referral.'),
        log(33, 'Street outreach', 'J. Ortega', 'First time he gave his full name.'),
        log(110, 'Street outreach', 'A. Mitchell', 'Engaged — agreed to start working together.')
      ];
      p.followUpDate = d(2);
      p.followUpNote = 'Bring the shelter letter for the DMV';
    });

    /* --- 2. Recently housed. Exercises the aftercare stage. ------------ */
    add(function (p) {
      p.firstName = 'Dana'; p.lastName = 'Whitfield'; p.preferredName = 'Dana';
      p.pronouns = 'she/her'; p.dob = '1988-11-02';
      p.consent.dataConsent = true; p.consent.photoConsent = true;
      p.stay.situation = 'Permanent housing';
      p.stay.city = 'Brooklyn'; p.stay.state = 'NY';
      p.stay.homelessSince = d(500);
      p.housedDate = d(38);
      p.engagementDate = d(300);
      p.assessmentDate = d(150);
      p.hmis.coc = 'NY-600'; p.hmis.gender = 'Woman';
      p.needs = ['Furniture', 'Employment'];
      p.benefits = ['SNAP', 'Medicaid'];
      p.story.quote = 'First night I slept with the door locked, I cried. Just because I could lock it.';
      p.story.strengths = 'Organised. Kept every document through two years of shelters.';
      p.goals = [
        goal('Keep the apartment', 'Housing', 'In progress',
          { why: 'Rent is due on the 1st and I do not want to fall behind' }),
        goal('Get back into work', 'Employment', 'Just started'),
        goal('Move in', 'Housing', 'Achieved', { notes: 'Keys collected.' })
      ];
      p.documents = docs({ 'State ID or Driver’s License': 'have', 'Social Security Card': 'have',
                           'Birth Certificate': 'have', 'Proof of Income / Benefit Letter': 'have',
                           'Medical Insurance Card': 'have' });
      p.referrals = [
        { id: uid(), org: 'CityFHEPS', service: 'Rental voucher', date: d(90),
          status: 'Enrolled', contact: '', notes: 'Voucher issued.' }
      ];
      p.log = [
        log(4, 'Follow-up', 'A. Mitchell', 'Doing well. Needs a table and chairs.'),
        log(25, 'Office visit', 'A. Mitchell', 'Went through the lease together.'),
        log(38, 'Appointment', 'A. Mitchell', 'Moved in.')
      ];
      p.followUpDate = d(-12);
      p.followUpNote = 'Monthly check-in';
    });

    /* --- 3. Brand new. No consent yet — should be flagged urgent. ------ */
    add(function (p) {
      p.firstName = 'Ray'; p.lastName = 'Okonkwo';
      p.stay.situation = 'Unsheltered — street/sidewalk';
      p.stay.crossStreets = 'W 34th St & 8th Ave';
      p.stay.city = 'Manhattan'; p.stay.state = 'NY';
      p.needs = ['Food'];
      p.log = [log(1, 'Street outreach', 'A. Mitchell', 'Would not give a name at first. Took a sandwich and a resource card.')];
      p.generalNotes = 'Very early. Do not push for details yet.';
    });

    /* --- 4. Family with children. Overdue follow-up. ------------------- */
    add(function (p) {
      p.firstName = 'Teresa'; p.lastName = 'Alvarez'; p.preferredName = 'Tere';
      p.pronouns = 'she/her'; p.dob = '1994-06-30';
      p.consent.dataConsent = true;
      p.stay.situation = 'Emergency shelter';
      p.stay.locationName = 'PATH placement';
      p.stay.city = 'Bronx'; p.stay.state = 'NY';
      p.stay.homelessSince = d(75);
      p.stay.withChildren = true; p.stay.childrenCount = '2';
      p.hmis.householdType = 'With children (2)'; p.hmis.coc = 'NY-600';
      p.engagementDate = d(60);
      p.needs = ['Housing', 'Childcare', 'School enrolment'];
      p.barriers = ['Waiting on paperwork'];
      p.benefits = ['SNAP', 'Medicaid'];
      p.story.quote = 'The kids think it is an adventure. I let them think that.';
      p.story.strengths = 'Got both children into school within a fortnight of arriving.';
      p.goals = [
        goal('Get the CityFHEPS voucher approved', 'Housing', 'Waiting on someone else',
          { targetDate: d(-20), support: 'Caseworker at PATH' }),
        goal('Keep the kids at the same school', 'Family', 'In progress')
      ];
      p.documents = docs({ 'State ID or Driver’s License': 'have', 'Social Security Card': 'have',
                           'Birth Certificate': 'need', 'Housing Application': 'have' });
      p.log = [
        log(21, 'Shelter visit', 'J. Ortega', 'Voucher paperwork submitted.'),
        log(46, 'Office visit', 'J. Ortega', 'Went through the housing application.'),
        log(60, 'Shelter visit', 'J. Ortega', 'Engaged.')
      ];
      p.followUpDate = d(6);
      p.followUpNote = 'Chase the voucher — three weeks with no answer';
    });

    /* --- 5. Young adult. Should route to youth services, not adult
           intake. Also going quiet. ---------------------------------- */
    add(function (p) {
      p.firstName = 'Jamal'; p.lastName = 'Reese'; p.preferredName = 'Jay';
      p.pronouns = 'they/them'; p.dob = '2004-02-14';
      p.consent.dataConsent = true;
      p.stay.situation = 'Staying with friends (couch surfing)';
      p.stay.area = 'Bushwick';
      p.stay.city = 'Brooklyn'; p.stay.state = 'NY';
      p.stay.homelessSince = d(150);
      p.stay.bestTimeToFind = 'Evenings at the drop-in';
      p.hmis.gender = 'Non-binary';
      p.needs = ['Housing', 'Employment', 'Mental health support'];
      p.barriers = ['Under 25 — different system', 'No stable address'];
      p.story.quote = 'I am not sleeping outside, so everyone acts like I am fine.';
      p.story.strengths = 'Sharp. Teaching themselves graphic design on a library computer.';
      p.story.hopes = 'A room of their own and a course to finish.';
      p.goals = [
        goal('Find a youth housing programme', 'Housing', 'In progress',
          { support: 'Ali Forney Center referral made' }),
        goal('Finish the design course', 'Education', 'In progress')
      ];
      p.documents = docs({ 'State ID or Driver’s License': 'have', 'Social Security Card': 'need' });
      p.referrals = [
        { id: uid(), org: 'Ali Forney Center', service: 'Youth drop-in & housing',
          date: d(28), status: 'Appointment set', contact: '212-206-0574', notes: '' }
      ];
      p.log = [
        log(24, 'Drop-in', 'A. Mitchell', 'Talked through the Ali Forney referral.'),
        log(52, 'Street outreach', 'A. Mitchell', 'Met at the drop-in.')
      ];
    });

    /* --- 6. A near-duplicate of Ray, as two workers would create. ------ */
    add(function (p) {
      p.firstName = 'Ray'; p.lastName = 'Okonkwo'; p.preferredName = 'Ray';
      p.consent.dataConsent = true;
      p.stay.situation = 'Unsheltered — street/sidewalk';
      p.stay.crossStreets = 'W 33rd St & 7th Ave';
      p.stay.city = 'Manhattan'; p.stay.state = 'NY';
      p.veteran = true;
      p.needs = ['Housing', 'Identification'];
      p.log = [log(3, 'Street outreach', 'J. Ortega', 'Says he served. Worth checking VA eligibility.')];
      p.generalNotes = 'Possibly the same person another worker logged. Check before merging.';
    });

    return people;
  }

  return { build: build, count: 6 };
})();
