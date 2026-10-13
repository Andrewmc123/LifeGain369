/* ==========================================================================
   ui.js — building blocks every screen uses: form fields, avatars, small
   charts, toasts, file downloads.

   Every helper returns an HTML string and escapes whatever it is given, so
   a screen can be written as plain string concatenation without each one
   remembering to escape.
   ========================================================================== */

var UI = (function () {
  'use strict';

  var esc = Util.esc, has = Util.has;
  var toastTimer;

  function el(id) { return document.getElementById(id); }

  function toast(msg, ms) {
    var t = el('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.style.display = 'none'; }, ms || 2600);
  }

  /* ----- form fields ---------------------------------------------------- */

  function opts(list, current, placeholder) {
    var out = '<option value="">' + esc(placeholder || '— select —') + '</option>';
    list.forEach(function (o) {
      var v = typeof o === 'object' ? o.v : o;
      var t = typeof o === 'object' ? o.t : o;
      out += '<option value="' + esc(v) + '"' + (String(current) === String(v) ? ' selected' : '') + '>' + esc(t) + '</option>';
    });
    return out;
  }

  function field(label, inner, hint) {
    return '<div class="field"><label>' + esc(label) + '</label>' + inner +
      (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>';
  }

  function text(label, bind, value, o) {
    o = o || {};
    return field(label, '<input type="' + (o.type || 'text') + '" data-bind="' + esc(bind) + '" value="' +
      esc(value || '') + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '>', o.hint);
  }

  function area(label, bind, value, o) {
    o = o || {};
    return field(label, '<textarea data-bind="' + esc(bind) + '"' + (o.tall ? ' class="tall"' : '') +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') +
      (o.rows ? ' rows="' + o.rows + '"' : '') + '>' + esc(value || '') + '</textarea>', o.hint);
  }

  function select(label, bind, value, list, o) {
    o = o || {};
    return field(label, '<select data-bind="' + esc(bind) + '">' + opts(list, value, o.placeholder) + '</select>', o.hint);
  }

  function check(label, bind, value) {
    return '<label class="checkline"><input type="checkbox" data-bind="' + esc(bind) + '"' +
      (value ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
  }

  function chipGroup(label, listName, options, chosen, hint) {
    var body = options.map(function (o) {
      var on = (chosen || []).indexOf(o) !== -1;
      return '<button type="button" class="chip' + (on ? ' on' : '') +
        '" data-action="chip" data-list="' + esc(listName) + '" data-value="' + esc(o) + '" aria-pressed="' +
        on + '">' + (on ? '✓ ' : '') + esc(o) + '</button>';
    }).join('');
    return '<div class="field"><label>' + esc(label) + '</label><div class="chips">' + body + '</div>' +
      (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>';
  }

  /* ----- people --------------------------------------------------------- */

  function initials(p) {
    var n = Doc.shortName(p);
    if (n === 'Unnamed record') return '?';
    return n.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  function avatar(p, cls) {
    var src = Util.safeImage(p.photo);
    if (src) {
      return '<div class="avatar ' + esc(cls || '') + '"><img src="' + src + '" alt=""></div>';
    }
    return '<div class="avatar ' + esc(cls || '') + '">' + esc(initials(p)) + '</div>';
  }

  function stat(n, k) {
    return '<div class="stat"><div class="n">' + esc(n) + '</div><div class="k">' + esc(k) + '</div></div>';
  }

  /* ----- small charts ----------------------------------------------------
     Hand-drawn SVG rather than a charting library: the app loads nothing
     from the internet, and these are simple enough that a dependency
     would cost more than it saves. Every chart also states its numbers in
     text, so it still reads on a screen reader and in grayscale print.
     ------------------------------------------------------------------- */

  function barRow(label, n, max, note) {
    var pct = max > 0 ? Math.round((n / max) * 100) : 0;
    return '<div class="chart-row">' +
      '<span class="chart-label">' + esc(label) + '</span>' +
      '<span class="chart-track"><i style="width:' + pct + '%"></i></span>' +
      '<span class="chart-n">' + esc(n) + '</span>' +
      (note ? '<span class="chart-note">' + esc(note) + '</span>' : '') +
      '</div>';
  }

  // Contacts per week for the last 12 weeks.
  function sparkline(people) {
    var weeks = 12, buckets = [], i;
    for (i = 0; i < weeks; i++) buckets.push(0);
    people.forEach(function (p) {
      (p.log || []).forEach(function (l) {
        var wk = Flow.daysAgo(l.date);
        if (wk === null) return;
        wk = Math.floor(wk / 7);
        if (wk >= 0 && wk < weeks) buckets[weeks - 1 - wk]++;
      });
    });
    var max = Math.max.apply(null, buckets.concat([1]));
    var total = buckets.reduce(function (a, b) { return a + b; }, 0);
    var w = 100, hgt = 28, step = w / (weeks - 1);
    var pts = buckets.map(function (v, ix) {
      return (ix * step).toFixed(1) + ',' + (hgt - (v / max) * hgt).toFixed(1);
    }).join(' ');
    var fill = '0,' + hgt + ' ' + pts + ' ' + w + ',' + hgt;

    return '<div class="spark">' +
      '<svg viewBox="0 0 100 28" preserveAspectRatio="none" role="img" ' +
      'aria-label="Contacts per week over the last twelve weeks. Total ' + total + '.">' +
      '<polygon points="' + fill + '" class="spark-fill"></polygon>' +
      '<polyline points="' + pts + '" class="spark-line"></polyline>' +
      '</svg>' +
      '<div class="spark-foot"><span>12 weeks ago</span><span>' + total +
      ' contacts logged</span><span>this week</span></div>' +
      '</div>';
  }

  function meter(label, pct, hint) {
    return '<div class="meter">' +
      '<div class="meter-top"><span>' + esc(label) + '</span><span>' + pct + '%</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      (hint ? '<p class="small faint mb0 mt8">' + esc(hint) + '</p>' : '') +
      '</div>';
  }

  function countBy(people, get) {
    var map = {};
    people.forEach(function (p) {
      var vals = get(p);
      if (!Array.isArray(vals)) vals = has(vals) ? [vals] : [];
      vals.forEach(function (v) { if (has(v)) map[v] = (map[v] || 0) + 1; });
    });
    return Object.keys(map).map(function (k) { return { k: k, n: map[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  /* ----- files ---------------------------------------------------------- */

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  // A spreadsheet runs any cell that starts with = + - @ (or a tab or
  // carriage return) as a formula. A name or note typed in the field must
  // never become one, so such cells get a leading apostrophe.
  function csvCell(cell) {
    var v = String(cell === undefined || cell === null ? '' : cell);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function toCSV(rows) {
    // The BOM makes Excel open UTF-8 correctly on Windows.
    return '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }

  function copyText(str) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(str).then(
        function () { toast('Copied to the clipboard.'); },
        function () { legacyCopy(str); }
      );
    } else {
      legacyCopy(str);
    }
  }

  function legacyCopy(str) {
    var ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    toast(ok ? 'Copied to the clipboard.' : 'Could not copy — select the text and copy manually.');
  }

  function safeFile(name) {
    return String(name).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'record';
  }

  // Photos are downscaled before storage: a full phone capture is several
  // megabytes and would exhaust the browser's quota within a few records.
  function readPhoto(file, cb, maxSide, mime) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var MAX = maxSide || 900;
        var w = img.width, h = img.height;
        if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var out = '';
        try { out = canvas.toDataURL(mime || 'image/jpeg', 0.75); } catch (err) { out = ''; }
        out = Util.safeImage(out);
        if (!out) return toast('That image could not be used. Try a JPEG or PNG.');
        cb(out);
      };
      img.onerror = function () { toast('That file could not be read as an image.'); };
      img.src = e.target.result;
    };
    reader.onerror = function () { toast('Could not read that file.'); };
    reader.readAsDataURL(file);
  }

  return {
    el: el,
    toast: toast,
    opts: opts,
    field: field,
    text: text,
    area: area,
    select: select,
    check: check,
    chipGroup: chipGroup,
    initials: initials,
    avatar: avatar,
    stat: stat,
    barRow: barRow,
    sparkline: sparkline,
    meter: meter,
    countBy: countBy,
    download: download,
    toCSV: toCSV,
    csvCell: csvCell,
    copyText: copyText,
    safeFile: safeFile,
    readPhoto: readPhoto
  };
})();
