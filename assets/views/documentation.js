/* ==========================================================================
   views/documentation.js — Documentation: choose sections, then print, email or save.
   ========================================================================== */

(function () {
  'use strict';

  var esc = Util.esc, has = Util.has, state = App.state, C = CATALOG;
  var text = UI.text, area = UI.area, select = UI.select, check = UI.check, field = UI.field,
      chipGroup = UI.chipGroup, avatar = UI.avatar, stat = UI.stat, barRow = UI.barRow,
      opts = UI.opts, meter = UI.meter;

  /* ---------- documentation ---------- */

  function tabDoc(p) {
    var h = '';
    h += '<div class="doc-layout">';

    /* controls */
    h += '<div class="doc-side"><div class="sticky">';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">What to include</h3></div>' +
      field('Start from', '<select id="doc-preset">' +
        Object.keys(Doc.PRESETS).map(function (k) {
          return '<option value="' + k + '"' + (state.doc.preset === k ? ' selected' : '') + '>' +
            esc(Doc.PRESETS[k].label) + '</option>';
        }).join('') + '</select>',
        'Pick a starting point, then tick sections on or off.') +
      Doc.SECTIONS.map(function (s) {
        var on = state.doc.sections.indexOf(s.key) !== -1;
        return '<label class="checkline"><input type="checkbox" data-action="doc-section" data-key="' +
          s.key + '"' + (on ? ' checked' : '') + '><span>' + esc(s.label) + '</span></label>';
      }).join('') +
      '</div>';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">Print</h3></div>' +
      '<div class="btn-row">' +
      '<button class="btn primary block" data-action="doc-print">🖨 Print this record</button></div>' +
      '<p class="small faint mt16 mb0">In the print dialog choose <strong>Save as PDF</strong> as the printer to get a file you can attach to an email.</p>' +
      '</div>';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">Email</h3></div>' +
      field('Send to (optional)',
        '<input type="email" id="doc-email" value="' + esc(state.doc.email) +
        '" placeholder="caseworker@agency.org">') +
      '<div class="btn-row">' +
      '<button class="btn primary block" data-action="doc-email">✉ Open in email app</button>' +
      '</div>' +
      '<p class="small faint mt16 mb0">This opens your normal email program with the record already written into the message. ' +
      'Long records get shortened to fit — for the whole thing, download the file below and attach it.</p>' +
      '</div>';

    h += '<div class="card"><div class="card-head"><h3 class="mb0">Save a file</h3></div>' +
      '<div class="btn-row">' +
      '<button class="btn block" data-action="doc-html">Download as web page (.html)</button>' +
      '<button class="btn block" data-action="doc-txt">Download as plain text (.txt)</button>' +
      '<button class="btn block" data-action="doc-copy">Copy text to clipboard</button>' +
      '</div>' +
      '<p class="small faint mt16 mb0">The .html file keeps the photo and layout and opens on any computer. Attach it to an email, or open it and print from there.</p>' +
      '</div>';

    h += '</div></div>';

    /* preview */
    h += '<div><div class="card-head no-print"><h2 class="mb0">Preview</h2>' +
      '<div class="spacer"></div><span class="badge">' + state.doc.sections.length + ' sections</span></div>' +
      '<div class="doc-preview-wrap"><div id="doc-preview">' +
      Doc.packetHTML(p, { sections: state.doc.sections, settings: Store.settings() }) +
      '</div></div></div>';

    h += '</div>';
    return h;
  }

  Views.tabDoc = tabDoc;
})();
