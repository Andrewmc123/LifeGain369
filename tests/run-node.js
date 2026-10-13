/* Runs tests/tests.js in Node against the app's own files: node tests/run-node.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
var files = [
  'assets/core/util.js', 'assets/core/crypto.js', 'assets/core/store.js',
  'assets/core/flow.js', 'assets/core/doc.js', 'assets/core/report.js',
  'assets/ui/ui.js', 'tests/tests.js'
];

// Just enough of a browser for the pure modules.
var sandbox = {
  console: console,
  TextEncoder: TextEncoder,
  TextDecoder: TextDecoder,
  btoa: btoa,
  atob: atob,
  Promise: Promise,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
sandbox.window = sandbox;
sandbox.crypto = globalThis.crypto;
sandbox.isSecureContext = true;
vm.createContext(sandbox);

files.forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
});

sandbox.runTests(function (status, name, detail) {
  var mark = status === 'pass' ? 'ok  ' : status === 'skip' ? 'skip' : 'FAIL';
  console.log(mark + ' ' + name + (detail ? ' — ' + detail : ''));
}).then(function (r) {
  console.log('\n' + r.passed + ' passed, ' + r.failed + ' failed, ' + r.skipped + ' skipped');
  process.exitCode = r.failed ? 1 : 0;
});
