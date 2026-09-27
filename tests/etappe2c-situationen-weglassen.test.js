'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Etappe 2c (Schnitt Glied 2, A286) — „Weglassen, nicht Umbelegen", Leseseite
   ────────────────────────────────────────────────────────────────────────
   Spiegel von Etappe 2b (`_b16ZielExistiert`, tests/etappe2b-b16-weglassen.test.js),
   diesmal für die Cross-Sektor-Verweise in `SITUATIONEN`/`_ANG_SITUATIONEN`
   (`{quelle, feld}`), Kern UND Lese-App in einer Etappe — der Paritäts-Nachtrag
   vom 23.07.2026 (`tests/paritaet-kern-lese.test.js`) hält Kern- und
   Lese-App-Felder gegeneinander; ein Ziel, das nur im Kern korrekt entfällt,
   erschiene der Vertrauensperson in der Lese-App weiter mit rohem feldId als
   Beschriftung. Anders als bei B16 (Schreibweg) gibt es hier vor diesem Bau
   KEINEN bekannten toten Zeiger — `tests/w9-feldverweise-pruefen.test.js`
   bestätigt eine leere Grundlinie (10 NOTFALL_KERN_FELDER + 144 Cross-Sektor-
   Verweise lösen real auf). Der Wächter hier ist vorbeugend: er ändert das
   heutige Verhalten nicht, verhindert aber, dass ein künftig verwaister
   Zeiger (wie die vier bei B16 gefundenen) als Beschriftung `feldId` ohne
   Wert auf einem Krisenblatt landet, statt sauber zu entfallen.

   Korrektur zum Laufzettel: `tests/paritaet-kern-lese.test.js` prüft NICHT
   SITUATIONEN/_ANG_SITUATIONEN (nur den Sektor-Feldkatalog, `SEKTOREN`) —
   diese Etappe bündelt Kern+Lese-App darum aus Themen-, nicht aus
   Wächter-Zwang. Beide Dateien führen SITUATIONEN unabhängig voneinander
   (72 Kern- vs. 58 Lese-App-Cross-Refs, gemessen 22.08.2026); Parität der
   beiden Arrays selbst ist ein separater, hier nicht beauftragter Befund.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

// Ein bekannter, echter Cross-Ref aus SITUATIONEN (Blatt „geburt", Block
// „aus-ihren-bereichen") — die Gegenprobe, dass der neue Wächter echte Ziele nicht mitreißt.
const ECHTES_ZIEL = { quelle: 'identity', feld: 'givenName' };

test('[2c] akutZeileHTML (Kern) lässt ein erfundenes Ziel weg statt rohen feldId zu zeigen', () => {
  const { V } = ladeKern();
  assert.equal(V.akutZeileHTML('erfundener-sektor-xyz', 'irgendwas'), '');
  assert.equal(V.akutZeileHTML('gesundheit', 'ein_erfundenes_feld_xyz'), '');
});
test('[2c · Gegenprobe] akutZeileHTML (Kern) rendert ein echtes Ziel weiterhin', () => {
  const { V } = ladeKern();
  const html = V.akutZeileHTML(ECHTES_ZIEL.quelle, ECHTES_ZIEL.feld);
  assert.ok(html.includes('feld-zeile'), 'ein echtes Ziel muss weiter eine Zeile rendern');
  assert.ok(!html.includes(ECHTES_ZIEL.feld + '<'), 'die Beschriftung ist das Label, nicht der rohe feldId');
});

test('[2c] situationSektorZeileHTML (Kern) lässt ein erfundenes Ziel weg', () => {
  const { V } = ladeKern();
  assert.equal(V.situationSektorZeileHTML('erfundener-sektor-xyz', 'irgendwas'), '');
  assert.equal(V.situationSektorZeileHTML('gesundheit', 'ein_erfundenes_feld_xyz'), '');
});
test('[2c · Gegenprobe] situationSektorZeileHTML (Kern) rendert ein echtes Ziel weiterhin', () => {
  const { V } = ladeKern();
  const html = V.situationSektorZeileHTML(ECHTES_ZIEL.quelle, ECHTES_ZIEL.feld);
  assert.ok(html.includes('feld-zeile'));
});

test('[2c] situationModell (Kern) lässt einen toten Cross-Ref aus dem Blatt (PDF/JSON-Modell)', () => {
  const { V } = ladeKern();
  const syntheticSit = {
    id: '_test-tot', titel: 'Test', bloecke: [
      { id: 'block', eintraege: [
        { quelle: 'erfundener-sektor-xyz', feld: 'irgendwas' },
        { quelle: ECHTES_ZIEL.quelle, feld: ECHTES_ZIEL.feld },
      ] },
    ],
  };
  const modell = V.situationModell(syntheticSit);
  const zeilen = (modell.bloecke[0] || {}).zeilen || [];
  assert.equal(zeilen.length, 1, 'nur das echte Ziel bleibt, das erfundene entfällt');
  assert.ok(!zeilen.some((z) => z.label === 'irgendwas'), 'kein roher feldId als Beschriftung');
});

test('[2c] _datensatzAusEintraegen (Kern) lässt ein totes Ziel weg statt es als "fehlend" zu melden', () => {
  const { V } = ladeKern();
  const ds = V._datensatzAusEintraegen(
    [
      { quelle: 'erfundener-sektor-xyz', feld: 'irgendwas', kennung: null },
      { quelle: ECHTES_ZIEL.quelle, feld: ECHTES_ZIEL.feld, kennung: null },
    ],
    { id: 'test', titel: 'Test' },
  );
  assert.ok(!ds.fehlend.some((f) => f.feld === 'irgendwas'),
    'ein totes Ziel ist keine unbeantwortete Frage — es taucht nicht als "fehlend" auf');
  assert.ok(!ds.felder.some((f) => f.feld === 'irgendwas'), 'und erst recht nicht als Wert');
});

test('[2c] situationModell (Lese-App) lässt ein erfundenes Ziel weg — Spiegel des Kerns', () => {
  const { V } = ladeLesen();
  const syntheticSit = {
    id: '_test-tot', titel: 'Test', bloecke: [
      { id: 'block', eintraege: [
        { quelle: 'erfundener-sektor-xyz', feld: 'irgendwas' },
        { quelle: ECHTES_ZIEL.quelle, feld: ECHTES_ZIEL.feld },
      ] },
    ],
  };
  const modell = V.situationModell(syntheticSit);
  const zeilen = (modell.bloecke[0] || {}).zeilen || [];
  assert.equal(zeilen.length, 1, 'nur das echte Ziel bleibt');
  assert.ok(!zeilen.some((z) => z.label === 'irgendwas'), 'kein roher feldId als Beschriftung');
});

test('[2c] kein heutiges SITUATIONEN/_ANG_SITUATIONEN-Ziel ist tot (dieselbe Auflösung wie der neue Wächter)', () => {
  // Gegenprobe zur Vorbeugend-Aussage oben, mit demselben Resolver, den akutZeileHTML/
  // situationSektorZeileHTML/situationModell jetzt guarden — nicht neu nachgebaut, wie W-9 es
  // vormacht (tools/w9-feldverweise-pruefen.js, pruefeSituationsQuellen). W-9 selbst deckt
  // dasselbe bereits CI-seitig ab; diese Probe hält die Aussage lokal bei dieser Etappe.
  const { V } = ladeKern();
  const paare = [];
  for (const si of V.SITUATIONEN) for (const b of si.bloecke || []) for (const e of b.eintraege || [])
    if (e && e.quelle) paare.push({ quelle: e.quelle, feld: e.feld });
  for (const si of V.angehoerigenSituationenAlle()) for (const b of si.bloecke || []) for (const e of b.eintraege || [])
    if (e && e.quelle) paare.push({ quelle: e.quelle, feld: e.feld });
  const tote = paare.filter((p) => !V.crossRefFeldUndRoh(p.quelle, p.feld).feld);
  assert.deepEqual(tote, [], 'ein neuer toter Zeiger — benennen (mit Grund) oder korrigieren, wie bei B16');
});
