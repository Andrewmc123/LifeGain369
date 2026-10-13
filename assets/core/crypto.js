/* ==========================================================================
   crypto.js — passcode encryption for records at rest and for backups.

   A phone left on a bus is the most likely way these records leak. With a
   passcode set, the saved database and every backup file are encrypted
   with AES-GCM under a key derived from the passcode (PBKDF2, SHA-256).
   The passcode itself is never stored; a wrong one simply fails to decrypt.

   Uses only the browser's built-in WebCrypto. No library, nothing fetched.
   ========================================================================== */

var Crypt = (function () {
  'use strict';

  var ITERATIONS = 310000;
  var enc = new TextEncoder();
  var dec = new TextDecoder();

  function available() {
    return !!(window.crypto && window.crypto.subtle && window.isSecureContext !== false);
  }

  function toB64(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }

  function fromB64(str) {
    var s = atob(str), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function random(n) { return window.crypto.getRandomValues(new Uint8Array(n)); }

  function deriveKey(passcode, salt, iterations) {
    return window.crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return window.crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations || ITERATIONS, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  // A key bundle remembers its salt, so every save does not pay for PBKDF2.
  function newKey(passcode) {
    var salt = random(16);
    return deriveKey(passcode, salt).then(function (key) {
      return { key: key, salt: salt, iterations: ITERATIONS };
    });
  }

  function isEnvelope(o) {
    return !!(o && typeof o === 'object' && o.encrypted === 'outreach-companion/aes-gcm' &&
      typeof o.ct === 'string' && typeof o.iv === 'string' && typeof o.salt === 'string');
  }

  function seal(bundle, obj) {
    var iv = random(12);
    return window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, bundle.key,
      enc.encode(JSON.stringify(obj)))
      .then(function (ct) {
        return {
          encrypted: 'outreach-companion/aes-gcm',
          v: 1,
          iterations: bundle.iterations,
          salt: toB64(bundle.salt),
          iv: toB64(iv),
          ct: toB64(ct)
        };
      });
  }

  // Resolves with { data, bundle } — the bundle can be reused for saving.
  // Rejects with a plain-language error on a wrong passcode.
  function open(envelope, passcode) {
    var salt = fromB64(envelope.salt);
    var iterations = envelope.iterations || ITERATIONS;
    return deriveKey(passcode, salt, iterations).then(function (key) {
      return window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(envelope.iv) }, key,
        fromB64(envelope.ct))
        .then(function (plain) {
          return {
            data: JSON.parse(dec.decode(plain)),
            bundle: { key: key, salt: salt, iterations: iterations }
          };
        }, function () {
          throw new Error('That passcode is not right.');
        });
    });
  }

  return {
    available: available,
    newKey: newKey,
    seal: seal,
    open: open,
    isEnvelope: isEnvelope
  };
})();
