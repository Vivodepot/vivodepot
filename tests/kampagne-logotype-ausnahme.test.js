'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Kampagne-Logotype-Ausnahme (WCAG 1.4.3), eng gefasst
   ────────────────────────────────────────────────────────────────────────
   Befund `wortmarke-kontrast-luecke-bericht-2026-08-25.md`: Ebene 4 meldete
   648 Funde an `span.lw-vivo`/`span.lw-depot` u. a. — der wörtliche
   Markenlogo-Text ("VIVO"+"DEPOT"), kein Fliesstext, keine Bedienoberfläche.
   WCAG 1.4.3 nimmt Logo-/Markennamen-Text ausdrücklich vom Mindestkontrast
   aus. `tools/kampagne.js` kannte diese Ausnahme nicht — jetzt eng gefasst
   nachgetragen: NUR die vier Wortmarke-Selektoren, kein Freifahrtschein.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { LOGOTYPE_AUSNAHME } = require('../tools/lib/logotype-ausnahme.js');

describe('[Kampagne·Logotype-Ausnahme] genau die vier Wortmarke-Selektoren', () => {
  test('Topbar- und Welcome-Wortmarke treffen', () => {
    for (const sel of ['span.lw-vivo', 'span.lw-depot', 'span.lw-vivo-d', 'span.lw-depot-d']) {
      assert.ok(LOGOTYPE_AUSNAHME.test(sel), `${sel} muss die Ausnahme treffen`);
    }
  });

  test('Rotmachbarkeit: kein Freifahrtschein für andere Elemente', () => {
    const NICHT_AUSGENOMMEN = [
      'button.lw-vivo',       // anderes Tag — kein Logo-Span
      'div.lw-vivo-details',  // andere Klasse, nur der Name-Stamm passt
      'span.lw-vivowatch',    // Zeichenketten-Nachbarschaft, kein echter Treffer
      'span.btn',             // irgendein anderer Span
      'span.lw-depot-extra',  // erfundene fünfte Variante
    ];
    for (const sel of NICHT_AUSGENOMMEN) {
      assert.ok(!LOGOTYPE_AUSNAHME.test(sel), `${sel} darf NICHT ausgenommen sein`);
    }
  });
});
