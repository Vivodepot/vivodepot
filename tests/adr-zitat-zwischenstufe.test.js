'use strict';
/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Die Zwischenstufe zitiert ihr eigenes ADR (08.11.2026)
   ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   U2-ADR-172 entscheidet die Zwischenstufe und hält fest, dass Code-Kommentare sie fälschlich dem ADR „Format-Kanal als
   Beschreibung“ zuschrieben. Im Ausgabe-Werkzeug standen danach noch vier solche Stellen, eine weitere in einer Grundlinie;
   sie zeigen jetzt auf U2-ADR-172.
   WÄCHTER GEGEN DIE KLASSE: keine Zeile in Code oder Werkzeug-Daten nennt jenes ADR zusammen mit der Zwischenstufe.
   Die ADR-Texte selbst sind ausgenommen: U2-ADR-172 beschreibt die alte Zitierung.
   Rot-Beweis: eine solche Zeile wird gemeldet; eine Zeile, die jenes ADR für Ausgabe-Kanäle nennt, nicht.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const FALSCH = 'U2-ADR-' + '146';
const THEMA = /Zwischenstufe|Ausgabestelle|Ausgabe-Schlüssel|Zertifikatsbetrieb|intermediate level|issuing.office/i;
const ENDUNGEN = /\.(html|js|json)$/;
const AUSGENOMMEN = new Set(['node_modules', '.git', 'docs', 'test-results', 'playwright-report']);

function dateien(ordner, rel = '') {
  const aus = [];
  for (const e of fs.readdirSync(path.join(ordner, rel), { withFileTypes: true })) {
    if (e.name.startsWith('_') || AUSGENOMMEN.has(e.name)) continue;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) aus.push(...dateien(ordner, r));
    else if (ENDUNGEN.test(e.name)) aus.push(r);
  }
  return aus;
}
function funde(text) {
  return text.split('\n').map((z, i) => (z.includes(FALSCH) && THEMA.test(z) ? i + 1 : 0)).filter(Boolean);
}

test('[ADR·Zwischenstufe] keine Zeile in Code oder Werkzeug-Daten schreibt die Zwischenstufe dem Format-Kanal-ADR zu', () => {
  const alle = dateien(WURZEL);
  assert.ok(alle.includes('vivodepot-vc-issuer.html') && alle.includes('vivodepot.html'), 'Vorbedingung: Kern und Ausgabe-Werkzeug werden gelesen');
  const treffer = [];
  for (const d of alle) for (const n of funde(fs.readFileSync(path.join(WURZEL, d), 'utf8'))) treffer.push(d + ':' + n);
  assert.deepEqual(treffer, [], 'diese Stellen zitieren für die Zwischenstufe das falsche ADR (richtig: U2-ADR-172)');
});

test('[ADR·Zwischenstufe·Rot-Beweis] die alte Zitierung wird gemeldet, ein Ausgabe-Kanal mit dem Format-Kanal-ADR nicht', () => {
  assert.deepEqual(funde('x\n// Zwischenstufe (' + FALSCH + '), Posten 2: Vorprüfung'), [2]);
  assert.deepEqual(funde('mit einem Ausgabe-Schlüssel (' + FALSCH + ', F-2 lädt …)'), [1]);
  assert.deepEqual(funde('/* Glied 7 (' + FALSCH + '): eingelassene Ausgabe-Kanäle */'), []);
  assert.deepEqual(funde('// Zwischenstufe (U2-ADR-172)'), []);
});
