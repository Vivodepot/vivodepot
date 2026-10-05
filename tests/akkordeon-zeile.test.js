'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Akkordeon-Zeile — Befund B1 (02.10.2026, U2-ADR-473), Wächter gegen die Klasse.
   ────────────────────────────────────────────────────────────────────────────
   Dieselbe Ursache zweimal: U2-ADR-174 (25.08.2026) stellte die Karten von Flex mit
   `justify-content: space-between` auf Grid `1fr auto auto` um, weil das `::after`-
   Pfeil-Pseudo-Element als drittes Flex-Element den Status in die Mitte schob. Das
   Einstellungen-Akkordeon kam einen Tag später — wieder mit Flex und space-between,
   und der Status schwebte 57 bis 147 px vor dem Rand. Ein Einzelfix hielt nur die
   eine Stelle; diese Probe hält die Klasse: keine `> summary`-Regel des Kerns
   verbindet Flex mit space-between.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { kernMitHeute } = require('./helfer/kern-mit-erscheinungsbild.js');   // v894: Werte und Regeln kommen mit dem Erscheinungsbild
const { zerlegen, cssKommentareMaskieren } = require('../tools/design-treue.js');

function summaryRegeln(html) {
  const css = zerlegen(html).style.map((b) => cssKommentareMaskieren(b.inhalt)).join('\n');
  return [...css.matchAll(/([^{}]*>\s*summary[^{}]*)\{([^{}]*)\}/g)].map((m) => ({ selektor: m[1].trim(), koerper: m[2] }));
}

function schwebende(html) {
  return summaryRegeln(html).filter((r) => /display\s*:\s*flex/.test(r.koerper) && /justify-content\s*:\s*space-between/.test(r.koerper))
    .map((r) => r.selektor);
}

test('[Akkordeon-Zeile] keine summary-Regel im Kern verbindet Flex mit space-between', () => {
  const html = kernMitHeute(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
  assert.ok(summaryRegeln(html).length >= 10, 'die summary-Regeln werden gefunden');
  assert.deepEqual(schwebende(html), [], 'Titel, Status, Pfeil gehören in feste Spalten (Grid 1fr auto auto, U2-ADR-174)');
});

test('[Akkordeon-Zeile·Rot-Beweis] die Form vor dem Fix wird erkannt', () => {
  const vorher = '<style>.einst-abschnitt > summary { list-style: none; display: flex; align-items: center; justify-content: space-between; }</style>';
  assert.deepEqual(schwebende(vorher), ['.einst-abschnitt > summary']);
});

test('[Akkordeon-Zeile] Einstellungen und Karten: Pfeil fest in Spalte 3', () => {
  const html = kernMitHeute(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
  const r = summaryRegeln(html);
  for (const sel of ['.einst-abschnitt > summary::after', '.feldgruppen-karte > summary::after']) {
    const regel = r.find((x) => x.selektor.split(',').map((s) => s.trim()).includes(sel));
    assert.ok(regel, sel);
    assert.match(regel.koerper, /grid-column\s*:\s*3/, sel);
  }
  const einst = r.find((x) => x.selektor === '.einst-abschnitt > summary');
  assert.match(einst.koerper, /grid-template-columns\s*:\s*1fr auto auto/);
});
