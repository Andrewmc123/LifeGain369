/* ==========================================================================
   util.js — the small helpers every other file leans on.

   Dates live here so there is exactly one idea of "today". It is the
   worker's LOCAL date, never UTC: an evening shift in New York runs past
   8pm, and a UTC date would stamp tonight's contact with tomorrow.
   ========================================================================== */

var Util = (function () {
  'use strict';

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // YYYY-MM-DD in local time.
  function localDate(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayStr() { return localDate(new Date()); }

  // A local date n days before today.
  function daysAgoStr(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return localDate(d);
  }

  // Local date of a full ISO timestamp ("2026-10-13T23:30:00Z" -> the day it
  // was on the worker's clock). Plain YYYY-MM-DD values pass straight through.
  function dateOf(iso) {
    if (!iso) return '';
    iso = String(iso);
    if (iso.length <= 10) return iso;
    var d = new Date(iso);
    return isNaN(d) ? iso.slice(0, 10) : localDate(d);
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function has(v) {
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim() !== '';
  }

  // Only an embedded raster image may ever reach an <img src>. Anything else
  // — a URL, a javascript: link, a string with quotes in it — came from a
  // damaged or hostile backup file and is dropped.
  var IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+\/=]+$/;
  function safeImage(src) {
    return typeof src === 'string' && IMAGE_RE.test(src) ? src : '';
  }

  // Ids end up in data-id attributes and selectors.
  var ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  function safeId(id) { return typeof id === 'string' && ID_RE.test(id); }

  return {
    localDate: localDate,
    todayStr: todayStr,
    daysAgoStr: daysAgoStr,
    dateOf: dateOf,
    esc: esc,
    has: has,
    safeImage: safeImage,
    safeId: safeId
  };
})();
