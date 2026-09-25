'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rechtsraum-Katalog, Posten 4 (U2-ADR-121) — Wächter rotmachbar
   ────────────────────────────────────────────────────────────────────────────
   `tools/typ-menge-offen-pruefen.js` scannt gegen zwei Verstoßmuster, die die
   Menge der Instrument-`typ`-Werte fälschlich als geschlossen behandeln würden:
   Schalter ohne Default-Fall, Array-Länge-Annahmen auf den drei bekannten
   Typ-Sammlungen. Geprüft hier: beide Scanner-Funktionen an synthetischen
   Positiv-/Negativbeispielen, und dass das echte Produkt (`vivodepot.html`)
   sauber bleibt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { switchBloeckeOhneDefault, laengeAnnahmenZeilen } = require('../tools/typ-menge-offen-pruefen.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const PRODUKT = path.join(REPO, 'vivodepot.html');

/* ── 1 · Schalter ohne Default-Fall ─────────────────────────────────────────── */

test('[Typ-Offen-Wächter] switch(typ) OHNE default wird erkannt', () => {
  const quelle = `
    function f(typ) {
      switch (typ) {
        case 'will': return 1;
        case 'enduring-power-of-attorney': return 2;
      }
    }`;
  const treffer = switchBloeckeOhneDefault(quelle);
  assert.equal(treffer.length, 1, 'genau ein Schalter ohne default muss auffallen');
  assert.equal(treffer[0].variable, 'typ');
});

test('[Typ-Offen-Wächter·Negativkontrolle] switch(typ) MIT default bleibt grün', () => {
  const quelle = `
    function f(typ) {
      switch (typ) {
        case 'will': return 1;
        default: return 0;
      }
    }`;
  assert.deepEqual(switchBloeckeOhneDefault(quelle), []);
});

test('[Typ-Offen-Wächter·Negativkontrolle] switch(instrumentTyp) MIT default bleibt grün', () => {
  const quelle = `
    switch (instrumentTyp) {
      case 'ki-verfuegung': return 'x';
      default: return 'y';
    }`;
  assert.deepEqual(switchBloeckeOhneDefault(quelle), []);
});

test('[Typ-Offen-Wächter·Negativkontrolle] switch(feld.typ) — anderer Namensraum, wird NICHT mitgefangen', () => {
  // feld.typ (text/zahl/datum/…) ist der FORMFELD-Typ, nicht der Instrument-typ — der Wächter
  // darf hier nicht fälschlich Alarm schlagen, auch wenn kein default vorhanden ist.
  const quelle = `
    switch (feld.typ) {
      case 'text': return 1;
    }`;
  assert.deepEqual(switchBloeckeOhneDefault(quelle), []);
});

test('[Typ-Offen-Wächter·Negativkontrolle] switch(grund) — unbeteiligte Variable bleibt unangetastet', () => {
  const quelle = `
    switch (grund) {
      case 'datum': return 1;
    }`;
  assert.deepEqual(switchBloeckeOhneDefault(quelle), []);
});

/* ── 2 · Array-Länge-Annahme ─────────────────────────────────────────────────── */

test('[Typ-Offen-Wächter] .length === N auf einer bekannten Typ-Sammlung wird erkannt', () => {
  const quelle = `if (Object.keys(AB_WERK_RECHTSRAUM_DE).length === 6) { /* ... */ }`;
  const treffer = laengeAnnahmenZeilen(quelle);
  assert.equal(treffer.length, 1);
});

test('[Typ-Offen-Wächter] .length === N auf VORSORGE_MODULE wird erkannt', () => {
  const quelle = `if (VORSORGE_MODULE.length === 6) { /* ... */ }`;
  assert.equal(laengeAnnahmenZeilen(quelle).length, 1);
});

test('[Typ-Offen-Wächter·Negativkontrolle] .length === N auf einer UNBETEILIGTEN Sammlung bleibt grün', () => {
  const quelle = `if (irgendeineAndereListe.length === 5) { /* ... */ }`;
  assert.deepEqual(laengeAnnahmenZeilen(quelle), []);
});

test('[Typ-Offen-Wächter·Negativkontrolle] eine Zeile, die eine Typ-Sammlung NUR erwähnt (kein .length===N), bleibt grün', () => {
  const quelle = `const n = vorsorge_instrumente.filter(r => r.typ === 'will').length;`;
  assert.deepEqual(laengeAnnahmenZeilen(quelle), []);
});

/* ── 3 · Gate-Nachweis am echten Bestand ─────────────────────────────────────── */

test('[Typ-Offen-Wächter] das echte Produkt trägt keinen Verstoß', () => {
  const quelle = fs.readFileSync(PRODUKT, 'utf8');
  assert.deepEqual(switchBloeckeOhneDefault(quelle), [],
    'kein switch(typ)/switch(instrumentTyp) ohne default-Zweig im Produkt');
  assert.deepEqual(laengeAnnahmenZeilen(quelle), [],
    'keine .length===N-Annahme auf AB_WERK_RECHTSRAUM_DE/VORSORGE_MODULE/vorsorge_instrumente im Produkt');
});

/* ── 4 · Funktionaler Nachweis: 0/1/mehrere-Kardinalität (Punkt 4) ───────────── */
// Baut auf Zug 1 (_rechtsraumKatalogLesen, bereits geprüft) auf und deckt die zwei ANDEREN
// typ-geschlüsselten Lookups ab, die dieselbe Offenheit brauchen: ein von außen mitgebrachter
// `typ` (hier fingiert: 'schottisches-testament') darf keine der drei Strukturen zum Werfen
// bringen — er wird durchgereicht/übersprungen, nicht abgelehnt.
const FREMDER_TYP = 'schottisches-testament';

test('[Typ-Offen-Wächter·Kardinalität] ein fremder typ bricht AB_WERK_RECHTSRAUM_DE-Zugriff nicht', () => {
  const { V } = ladeKern();
  assert.doesNotThrow(() => {
    assert.equal(V._rechtsraumKatalogLesen(FREMDER_TYP, 'DE', 'fristenVorrang', 'auswahlform'), undefined);
  });
});

test('[Typ-Offen-Wächter·Kardinalität] ein fremder typ bricht _instrumentEinzigartig nicht', () => {
  const { V } = ladeKern();
  assert.doesNotThrow(() => {
    assert.equal(V._instrumentEinzigartig(FREMDER_TYP), false);
  });
});

test('[Typ-Offen-Wächter·Kardinalität] ein fremder typ bricht _instrumentVorhanden nicht — auch mit einem echten Datensatz dieses Typs', () => {
  const { V } = ladeKern();
  V.setData({
    schemaVersion: 41,
    sektoren: { advanceCare: { provisionInstruments: [
      { id: 'x1', instrument: FREMDER_TYP, storageLocation: 'Edinburgh' },
    ] } },
    menschen: [],
  });
  assert.doesNotThrow(() => {
    assert.equal(V._instrumentVorhanden(FREMDER_TYP), true, 'ein Instrument mit fremdem typ ist auffindbar, nicht unsichtbar');
    assert.equal(V._instrumentVorhanden('will'), false, 'bleibt vom fremden typ unbeeinflusst');
  });
});
