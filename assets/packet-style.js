/* ==========================================================================
   packet-style.js — the look of the printed page.

   Defined here rather than in styles.css because the same rules have to
   travel inside exported and printed files, which have no stylesheet to
   link to. app.js injects this into the page so the on-screen preview and
   the paper output cannot drift apart.
   ========================================================================== */

var PACKET_CSS = [
  '.packet{background:#fff;color:#1a1a1a;padding:34px 38px;font-size:14px;line-height:1.55;',
  'font-family:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;}',
  '.packet .p-head{display:flex;gap:18px;align-items:flex-start;border-bottom:3px solid #1f6f5c;padding-bottom:14px;margin-bottom:18px;}',
  '.packet .p-head .p-photo{width:108px;height:108px;object-fit:cover;border-radius:6px;border:1px solid #ccc;flex:none;}',
  '.packet .p-head .p-id{flex:1;}',
  '.packet .p-head h1{font-size:24px;margin:0 0 4px;color:#17544e;line-height:1.2;}',
  '.packet .p-head .p-meta{font-size:13px;color:#555;}',
  '.packet .p-org{text-align:right;font-size:11px;color:#666;flex:none;max-width:190px;line-height:1.45;}',
  '.packet h2.p-sec{font-size:13px;text-transform:uppercase;letter-spacing:.09em;color:#1f6f5c;',
  'border-bottom:1px solid #d8d2c8;padding-bottom:5px;margin:22px 0 10px;}',
  '.packet .p-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;}',
  '.packet .p-row{display:flex;gap:8px;padding:3px 0;border-bottom:1px dotted #e2ddd5;}',
  '.packet .p-row .k{font-weight:700;color:#444;min-width:132px;flex:none;font-size:12.5px;}',
  '.packet .p-row .v{flex:1;}',
  '.packet .p-story{white-space:pre-wrap;line-height:1.7;}',
  '.packet .p-quote{border-left:3px solid #1f6f5c;background:#f2f8f6;padding:10px 14px;font-style:italic;margin-bottom:12px;}',
  '.packet .p-goal{border:1px solid #ddd6cc;border-radius:6px;padding:10px 12px;margin-bottom:9px;background:#faf9f7;}',
  '.packet .p-goal .g-t{font-weight:700;}',
  '.packet .p-goal .g-s{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#1f6f5c;font-weight:700;}',
  '.packet table.p-tbl{width:100%;border-collapse:collapse;font-size:12.5px;}',
  '.packet table.p-tbl th{text-align:left;background:#f1eee9;border:1px solid #ddd6cc;padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;}',
  '.packet table.p-tbl td{border:1px solid #e5e0d8;padding:6px 8px;vertical-align:top;}',
  '.packet .p-taglist{display:flex;flex-wrap:wrap;gap:6px;}',
  '.packet .p-tag{border:1px solid #c9c1b6;border-radius:999px;padding:2px 10px;font-size:12px;background:#f7f5f2;}',
  '.packet .p-foot{margin-top:26px;border-top:1px solid #d8d2c8;padding-top:10px;font-size:10.5px;color:#777;}',
  '.packet .p-sign{margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:26px;}',
  '.packet .p-sign .line{border-top:1px solid #666;padding-top:5px;font-size:11px;color:#555;margin-top:34px;}',
  '.packet .p-none{color:#888;font-style:italic;}',
  // Must stay legible in grayscale: photocopiers and fax machines are still
  // how a lot of housing paperwork actually moves.
  '.packet .p-flag{margin-top:10px;padding:8px 11px;border:1px solid #999;border-left:4px solid #333;background:#f4f4f4;font-size:12.5px;}',
  '@media print{',
  '.packet{padding:0;font-size:11.5pt;}',
  '.packet h2.p-sec{break-after:avoid;page-break-after:avoid;}',
  '.packet .p-goal,.packet .p-row,.packet table.p-tbl tr{break-inside:avoid;page-break-inside:avoid;}',
  '.packet .p-head{break-inside:avoid;page-break-inside:avoid;}',
  '.packet .p-flag{break-inside:avoid;page-break-inside:avoid;}',
  '}'
].join('\n');
