/* Shows the results of tests.js on tests/index.html. */
(function () {
  'use strict';
  var list = document.getElementById('results');
  runTests(function (status, name, detail) {
    var li = document.createElement('li');
    li.className = status;
    li.textContent = (status === 'pass' ? '✓ ' : status === 'skip' ? '– ' : '✗ ') + name +
      (detail ? ' — ' + detail : '');
    list.appendChild(li);
  }).then(function (r) {
    var s = document.getElementById('summary');
    s.textContent = r.passed + ' passed, ' + r.failed + ' failed, ' + r.skipped + ' skipped';
    s.className = r.failed ? 'fail' : 'pass';
  });
})();
