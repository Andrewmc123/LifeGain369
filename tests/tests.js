/* ==========================================================================
   tests.js — checks for the parts of the app that think and the parts that
   keep data safe. No framework: runs in a browser (tests/index.html) and in
   Node (node tests/run-node.js), against the same files the app loads.
   ========================================================================== */

var TESTS = [];
function test(name, fn) { TESTS.push({ name: name, fn: fn }); }

function eq(actual, expected, msg) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg ? msg + ': ' : '') + 'expected ' + e + ', got ' + a);
}
function ok(value, msg) { if (!value) throw new Error(msg || 'expected a truthy value'); }

function person(fill) {
  var p = Store.blankPerson();
  if (fill) fill(p);
  return p;
}

/* ----- dates ---------------------------------------------------------- */

test('today is the local date, not the UTC date', function () {
  var d = new Date();
  var local = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
  eq(Util.todayStr(), local);
  eq(Flow.todayStr(), local);
});

test('a late-evening timestamp keeps its local day', function () {
  var evening = new Date(2026, 9, 13, 23, 30); // 13 Oct, 11:30pm local
  eq(Util.localDate(evening), '2026-10-13');
  eq(Util.dateOf(evening.toISOString()), '2026-10-13');
});

test('daysAgoStr counts back in local days', function () {
  eq(Util.daysAgoStr(0), Util.todayStr());
  eq(Flow.daysAgo(Util.daysAgoStr(10)), 10);
});

/* ----- escaping and sanitising ------------------------------------------ */

test('esc neutralises HTML', function () {
  eq(Util.esc('<img src=x onerror="a()">'), '&lt;img src=x onerror=&quot;a()&quot;&gt;');
});

test('only embedded images are accepted as photos', function () {
  ok(Util.safeImage('data:image/jpeg;base64,/9j/4AAQ'));
  eq(Util.safeImage('data:image/jpeg;base64,abc" onerror="alert(1)'), '');
  eq(Util.safeImage('javascript:alert(1)'), '');
  eq(Util.safeImage('https://example.com/a.png'), '');
  eq(Util.safeImage(42), '');
});

test('normalize strips a hostile photo and id from an imported backup', function () {
  var db = Store.normalize({
    people: [{ id: 'x" onclick="evil()', photo: '" onerror="evil()', firstName: 'Ana' }]
  });
  eq(db.people.length, 1);
  eq(db.people[0].photo, '');
  ok(Util.safeId(db.people[0].id), 'id was replaced with a safe one');
  eq(db.people[0].firstName, 'Ana');
});

test('normalize coerces types and drops junk rows', function () {
  var db = Store.normalize({
    settings: { theme: 'neon', followUpDays: '7', orgLogo: 'http://x/y.png' },
    people: [{
      needs: ['Food', 3, null], veteran: 'true',
      log: ['nonsense', { date: '2026-01-02', notes: 'ok', id: 'bad id!' }],
      stay: 'not an object'
    }, null, 'string']
  });
  eq(db.settings.theme, 'auto');
  eq(db.settings.followUpDays, 7);
  eq(db.settings.orgLogo, '');
  eq(db.people.length, 1);
  var p = db.people[0];
  eq(p.needs, ['Food']);
  eq(p.veteran, true);
  eq(p.log.length, 1);
  ok(Util.safeId(p.log[0].id));
  eq(p.stay.situation, '');
});

test('normalize keeps the first of two records with the same id', function () {
  var db = Store.normalize({ people: [{ id: 'a1', firstName: 'One' }, { id: 'a1', firstName: 'Two' }] });
  eq(db.people.length, 1);
  eq(db.people[0].firstName, 'One');
});

test('CSV cells that look like formulas are defused', function () {
  eq(UI.csvCell('=HYPERLINK("http://x")'), '"\'=HYPERLINK(""http://x"")"');
  eq(UI.csvCell('+1 555'), "'+1 555");
  eq(UI.csvCell('-5'), "'-5");
  eq(UI.csvCell('@SUM(A1)'), "'@SUM(A1)");
  eq(UI.csvCell('Plain, with comma'), '"Plain, with comma"');
  eq(UI.csvCell(3), '3');
});

/* ----- stages and prompts ----------------------------------------------- */

test('stage moves with the record', function () {
  var p = person();
  eq(Flow.stageOf(p), 'met');
  p.log = [{ id: 'a', date: Util.daysAgoStr(9) }, { id: 'b', date: Util.daysAgoStr(2) }];
  eq(Flow.stageOf(p), 'trust');
  p.engagementDate = Util.daysAgoStr(1);
  eq(Flow.stageOf(p), 'engaged');
  p.housedDate = Util.daysAgoStr(3);
  eq(Flow.stageOf(p), 'housed');
  p.housedDate = Util.daysAgoStr(45);
  eq(Flow.stageOf(p), 'aftercare');
});

test('IDNYC counts as photo ID', function () {
  var p = person(function (x) { x.documents = [{ id: 'd', name: 'IDNYC card', status: 'have' }]; });
  ok(Flow.coreDocsHeld(p).hasId);
});

test('chronic homelessness needs a disabling condition and a year', function () {
  var p = person(function (x) { x.hmis.homelessMonths = '14'; });
  eq(Flow.chronicSignal(p).qualifies, false);
  p.disability = true;
  eq(Flow.chronicSignal(p).qualifies, true);
  p.hmis.homelessMonths = '10';
  eq(Flow.chronicSignal(p).qualifies, false);
  eq(Flow.chronicSignal(p).close, true);
});

test('a "No" veteran answer counts as known at intake', function () {
  var p = person();
  var row = function () {
    return Flow.hmisReadiness(p).rows.filter(function (r) { return r.t === 'Veteran Status'; })[0];
  };
  eq(row().have, false);
  p.hmis.veteranAsked = 'No';
  eq(row().have, true);
});

test('a follow-up due today is "soon", an overdue one is "urgent"', function () {
  var p = person(function (x) { x.consent.dataConsent = true; x.followUpDate = Util.todayStr(); });
  var lv = function (id) { return Flow.suggestions(p, {}).filter(function (s) { return s.id === id; })[0]; };
  eq(lv('followup-today').level, 'soon');
  p.followUpDate = Util.daysAgoStr(2);
  eq(lv('followup-late').level, 'urgent');
});

test('duplicates are found by name, date of birth or nickname', function () {
  var a = person(function (x) { x.firstName = 'Michael'; x.lastName = 'Reyes'; });
  var b = person(function (x) { x.firstName = 'michael'; x.lastName = 'REYES'; });
  var c = person(function (x) { x.preferredName = 'Michael'; });
  var d = person(function (x) { x.firstName = 'Dana'; });
  var found = Flow.duplicatesOf(a, [a, b, c, d]).map(function (x) { return x.id; });
  eq(found, [b.id]);
  eq(Flow.duplicatesOf(c, [a, b, c, d]).length, 2);
});

test('the backup reminder appears after a week', function () {
  var people = [person()];
  ok(Flow.shift(people, { lastBackupAt: '' }).backupWarning);
  eq(Flow.shift(people, { lastBackupAt: new Date().toISOString() }).backupWarning, null);
});

/* ----- funder report ------------------------------------------------------ */

test('report periods resolve to real date ranges', function () {
  eq(Report.period('last-month', '2026-03-15'), { from: '2026-02-01', to: '2026-02-28' });
  eq(Report.period('this-quarter', '2026-05-09'), { from: '2026-04-01', to: '2026-05-09' });
  eq(Report.period('last-quarter', '2026-02-10'), { from: '2025-10-01', to: '2025-12-31' });
  eq(Report.period('this-year', '2026-07-04'), { from: '2026-01-01', to: '2026-07-04' });
});

test('report counts people reached, outcomes and leaves samples out', function () {
  var a = person(function (x) {
    x.createdAt = '2026-02-03T10:00:00.000Z';
    x.log = [{ id: 'l1', date: '2026-02-03', type: 'Street outreach' },
             { id: 'l2', date: '2026-02-20', type: 'Phone call' },
             { id: 'l3', date: '2026-03-02', type: 'Street outreach' }];
    x.engagementDate = '2026-02-20';
    x.housedDate = '2026-02-27';
    x.veteran = true;
    x.dob = '2004-06-01';
    x.referrals = [{ id: 'r', date: '2026-02-10', status: 'Enrolled' }];
    x.stay.situation = 'Tent or encampment';
    x.needs = ['Food', 'Housing'];
  });
  var b = person(function (x) {
    x.createdAt = '2025-11-01T10:00:00.000Z';
    x.log = [{ id: 'l4', date: '2026-01-15' }];
  });
  var sample = person(function (x) {
    x.isSample = true;
    x.log = [{ id: 'l5', date: '2026-02-05' }];
  });
  var r = Report.build([a, b, sample], { from: '2026-02-01', to: '2026-02-28' });
  eq(r.reached, 1);
  eq(r.contacts, 2);
  eq(r.newPeople, 1);
  eq(r.engaged, 1);
  eq(r.housed, 1);
  eq(r.referrals, 1);
  eq(r.referralsCompleted, 1);
  eq(r.veterans, 1);
  eq(r.youth, 1);
  eq(r.excludedSamples, 1);
  eq(r.situations, [{ k: 'Tent or encampment', n: 1 }]);
  var withSamples = Report.build([a, b, sample], { from: '2026-02-01', to: '2026-02-28', includeSamples: true });
  eq(withSamples.reached, 2);
});

test('report CSV has no names in it', function () {
  var a = person(function (x) { x.firstName = 'Zelda'; x.log = [{ id: 'l', date: '2026-02-03' }]; });
  var csv = UI.toCSV(Report.csv(Report.build([a], { from: '2026-02-01', to: '2026-02-28' })));
  ok(csv.indexOf('Zelda') === -1);
  ok(csv.indexOf('People reached') !== -1);
});

/* ----- encryption ---------------------------------------------------------- */

test('encryption round-trips and rejects a wrong passcode', function () {
  if (!Crypt.available()) return 'skipped: WebCrypto not available here';
  var secret = { people: [{ firstName: 'Ana' }] };
  return Crypt.newKey('correct horse').then(function (bundle) {
    return Crypt.seal(bundle, secret);
  }).then(function (env) {
    ok(Crypt.isEnvelope(env));
    ok(JSON.stringify(env).indexOf('Ana') === -1, 'plaintext leaked into the envelope');
    return Crypt.open(env, 'correct horse').then(function (res) {
      eq(res.data, secret);
      return Crypt.open(env, 'wrong').then(function () {
        throw new Error('a wrong passcode decrypted');
      }, function (err) {
        eq(err.message, 'That passcode is not right.');
      });
    });
  });
});

/* ----- runner --------------------------------------------------------------- */

function runTests(report) {
  var passed = 0, failed = 0, skipped = 0;
  return TESTS.reduce(function (chain, t) {
    return chain.then(function () {
      return Promise.resolve().then(t.fn).then(function (res) {
        if (typeof res === 'string' && res.indexOf('skipped') === 0) { skipped++; report('skip', t.name, res); }
        else { passed++; report('pass', t.name); }
      }, function (err) {
        failed++;
        report('fail', t.name, err && err.message);
      });
    });
  }, Promise.resolve()).then(function () {
    return { passed: passed, failed: failed, skipped: skipped };
  });
}

if (typeof module !== 'undefined') module.exports = { runTests: runTests };
