'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   POSTEN 1.0 — TRÄGT EINE MIGRATION ALLE GLIEDER DES SCHNITTS?
   ────────────────────────────────────────────────────────────────────────────
   Gegenstand: `tools/schnitt-migration-messen.js`. Laufzettel „Die
   Vierunddreißig" (22.08.2026), Strang 1 Posten 1.0.

   WARUM DIESE PROBEN NÖTIG SIND, obwohl das Werkzeug nur eine Messung ist: an
   seinem Ergebnis hängt eine Bau-Regel. Strang 2 sagt — trägt eine Stufe alles,
   *„wird zusammengelegt und weitergearbeitet"*; zerfällt sie, wird angehalten.
   Ein Werkzeug, das versehentlich „trägt" sagt, legt eine Migration zusammen,
   die nicht zusammengehört, und das merkt niemand vor der ersten Bestandsdatei.

   DER FEHLER, DEN DIESE PROBEN GEFANGEN HÄTTEN, ist beim Bau wirklich passiert:
   der erste Entwurf zählte nur Kanten von UMFORMENDEN Gliedern und meldete
   „keine Kanten", obwohl ein Glied die Angabe liest, die ein additives Glied
   erst anlegt. Das Modell war falsch, nicht die Zahl.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const M = require('../tools/schnitt-migration-messen.js');

const KERN = process.env.KERN_HTML_PATH || path.join(__dirname, '..', 'vivodepot.html');
const quelle = () => fs.readFileSync(KERN, 'utf8');

/* ── Die Antwort auf 1.0 ─────────────────────────────────────────────────── */

test('[1.0] eine Stufe trägt alle Glieder — der Graph ist zyklenfrei', () => {
  const r = M.messen(quelle());
  assert.deepEqual(r.zyklen, [], 'ein Zyklus zwingt zur zweiten Stufe: ' + JSON.stringify(r.zyklen));
  assert.ok(Array.isArray(r.reihenfolge) && r.reihenfolge.length === M.GLIEDER.length,
    'ohne vollständige Reihenfolge gibt es keinen Block, der alle abarbeitet');
  assert.equal(r.eineStufeTraegt, true);
});

test('[1.0] jede genannte Stelle gibt es im Kern wirklich', () => {
  /* Das ist die Selbstprüfung der Liste. Eine Stelle, die es nicht mehr gibt,
     macht die Messung wertlos — und zwar still, weil sie dann einfach keine
     Kante erzeugt. */
  const r = M.messen(quelle());
  assert.deepEqual(r.ankerFehlend, [],
    'diese Stellen stehen in der Glied-Liste, aber nicht im Kern — die Liste ist veraltet');
  assert.ok(r.ankerGefunden.length >= M.GLIEDER.length,
    'es wurde für weniger Glieder ein Anker gefunden als es Glieder gibt');
});

/* ── Das Messmodell selbst ───────────────────────────────────────────────── */

test('[1.0·Rot-Beleg] ein Zyklus wird gefunden', () => {
  /* Ohne diese Probe wäre „keine Zyklen" von „sucht keine Zyklen" nicht zu
     unterscheiden — die Fehlerklasse des stummen Prüfers. */
  const gepflanzt = [
    { nr: 1, kennung: 'X', name: 'X', art: M.UMFORMEND, schreibt: ['a'], liest: ['b'], pruefAnker: [] },
    { nr: 2, kennung: 'Y', name: 'Y', art: M.UMFORMEND, schreibt: ['b'], liest: ['a'], pruefAnker: [] },
  ];
  const kanten = M.kantenBauen(gepflanzt);
  const zyklen = M.zyklenSuchen(gepflanzt, kanten);
  assert.ok(zyklen.length >= 1, 'der gepflanzte Zyklus wird nicht gefunden');
  assert.equal(M.reihenfolge(gepflanzt, kanten), null,
    'für einen Zyklus darf es keine Reihenfolge geben');
});

test('[1.0·Rot-Beleg] auch ein ADDITIVES Glied erzeugt eine Kante', () => {
  /* GENAU DER FEHLER DES ERSTEN ENTWURFS. Er zählte nur Kanten von umformenden
     Gliedern; eine Stufe, die ein Label umformt, bevor die Herkunftssprache
     existiert, liest `undefined`. */
  const gepflanzt = [
    { nr: 1, kennung: 'neu', name: 'legt an', art: M.ADDITIV, schreibt: ['s'], liest: [], pruefAnker: [] },
    { nr: 2, kennung: 'nutzt', name: 'braucht es', art: M.UMFORMEND, schreibt: ['l'], liest: ['l', 's'], pruefAnker: [] },
  ];
  const kanten = M.kantenBauen(gepflanzt);
  assert.deepEqual(kanten.map((k) => k.von + '→' + k.nach), ['1→2'],
    'ein additives Glied, dessen neue Stelle gelesen wird, muss vorher laufen');
});

test('[1.0·Gegenprobe] ein Glied hängt nicht von sich selbst ab', () => {
  /* `liest` und `schreibt` derselben Stelle im selben Glied sind EINE Umformung.
     Zählte das als Kante, hätte jede umformende Zeile einen Selbstzyklus und die
     Antwort wäre immer „zerfällt". */
  const eins = [{ nr: 1, kennung: 'Z', name: 'Z', art: M.UMFORMEND, schreibt: ['a'], liest: ['a'], pruefAnker: [] }];
  assert.deepEqual(M.kantenBauen(eins), []);
  assert.deepEqual(M.zyklenSuchen(eins, []), []);
});

test('[1.0·Rot-Beleg] eine erfundene Stelle fällt als fehlender Anker auf', () => {
  const erfunden = [{ nr: 1, kennung: 'Q', name: 'Q', art: M.ADDITIV, schreibt: [], liest: [],
    pruefAnker: ['diesenBezeichnerGibtEsImKernNicht'] }];
  const r = M.messen(quelle(), erfunden);
  assert.deepEqual(r.ankerFehlend.map((f) => f.anker), ['diesenBezeichnerGibtEsImKernNicht']);
  assert.equal(r.eineStufeTraegt, false,
    'solange eine genannte Stelle fehlt, trägt die Antwort nicht — auch ohne Zyklus');
});

/* ── Der Befund, an dem die zwei Kanten hängen ───────────────────────────── */

test('[1.0·Befund] eine Felddefinition trägt heute KEINE Herkunftssprache', () => {
  /* Das ist der gemessene Grund dafür, dass 1.4 zweiteilig ist. Ändert sich der
     Befund — weil jemand die Angabe einführt —, wird diese Probe rot, und die
     Aufspaltung gehört überprüft. */
  const schemata = ['docs/template-generator/field-model-schema.json',
    'docs/template-generator/submission-schema.json'];
  for (const rel of schemata) {
    const p = path.join(__dirname, '..', rel);
    const txt = fs.readFileSync(p, 'utf8');
    assert.equal(/"sprache"/.test(txt), false,
      rel + ' kennt jetzt eine `sprache` — dann braucht 1.4a keinen eigenen Zug mehr, '
      + 'und die Kante 5→6 in `tools/schnitt-migration-messen.js` gehört überprüft');
  }
});

test('[1.0·Befund] BEHOBEN — jedes Bündel mit Beschriftung trägt jetzt eine Sprache', () => {
  /* UMGEDREHT AM 22.08.2026 mit Posten 1.0a. Bis dahin stand hier `['TEXTSATZ']`:
     allein der Textsatz trug eine Sprache, und genau dieser Befund war der Grund
     dafür, dass 1.4 zweiteilig gemessen wurde.

     Die Produktentscheidung hat die Angabe zur Pflicht gemacht („1a"). Die Probe bleibt
     stehen und misst jetzt das andere Ende — dass keines der Bündel zurückfällt.
     Sie zu löschen hiesse, den Anlass der Zweiteilung zu löschen. */
  const B = require('./fixtures/beispielbuendel/index.js');
  const V = require('../tests/load-kern.js').ladeKern().V;
  const ohneSprache = Object.keys(B).filter((n) => {
    const m = B[n];
    if (!m || Array.isArray(m)) return false;                 // BUENDEL ist eine Liste
    if (!V._modulTraegtBeschriftung(m)) return false;          // ohne Beschriftung keine Pflicht
    return typeof m.sprache !== 'string' || !m.sprache.trim();
  });
  assert.deepEqual(ohneSprache, [],
    'diese Bündel tragen eine Beschriftung ohne Sprachangabe und würden heute abgewiesen');
});

/* ── Die Arten sind getrennt und begründet ───────────────────────────────── */

test('[1.0] jedes Glied trägt eine der zwei Arten und einen Grund', () => {
  for (const g of M.GLIEDER) {
    assert.ok(g.art === M.ADDITIV || g.art === M.UMFORMEND, 'Glied ' + g.nr + ': unbekannte Art');
    assert.ok(g.grund && g.grund.length > 40,
      'Glied ' + g.nr + ' nennt keinen Grund — eine Einordnung ohne Grund ist eine Behauptung');
    assert.ok(g.pruefAnker.length >= 1, 'Glied ' + g.nr + ' ist im Kern nicht nachweisbar');
  }
});

test('[1.0] ein additives Glied formt nichts um — sonst wäre die Einordnung falsch', () => {
  /* Die Probe hält die Bedeutung der Arten fest: „additiv" heisst, dass kein
     Bestandswert seine Form ändert. Ein additives Glied, das dieselbe Stelle
     liest und schreibt, wäre in Wahrheit umformend. */
  for (const g of M.GLIEDER.filter((x) => x.art === M.ADDITIV)) {
    const beides = g.schreibt.filter((s) => g.liest.includes(s));
    assert.deepEqual(beides, [],
      'Glied ' + g.nr + ' gilt als additiv, liest und schreibt aber dieselbe Stelle: ' + beides.join(', '));
  }
});
