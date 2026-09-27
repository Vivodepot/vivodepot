'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sektor-Maschine, Phase-1-Erweiterungen (sektor-frei)
   ────────────────────────────────────────────────────────────────────────
   Vier Lücken der Maschine, die der Spec-Stack (30.05.) verlangt, generisch geschlossen:
     1) liste mit strukturierten unterFelder + Validierung pro Sub-Feld,
     2) einfuehrungstext pro Sektor (Stimme-Satz unter dem Bereichs-Kopf),
     3) Conditional fields via sichtbarWenn-Hook (z. B. KI-Verfügung Fragen 2–4 nur, wenn ja),
     4) CROSS_SEKTOR_FELDER befüllbar via crossSektorAnmelden(...) — Einträge unveränderlich, idempotent.

   Plus: PERSON_ROLLEN.PARTNER für ehepartner-Migration in menschen[].

   Sektor-frei: Tests definieren neutrale Stub-Sektoren und übergeben sie direkt an renderSektor.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-maschine-erweiterungen';

/* ── 1) liste mit unterFelder ────────────────────────────────────────── */

test('1a) feldEingetragen erkennt liste mit unterFelder: leer / ausgefüllt', () => {
  const { V } = ladeKern();
  const kinderFeld = {
    id: 'childrenAndDependants', typ: 'liste',
    unterFelder: [
      { id: 'givenName',  typ: 'text' },
      { id: 'familyName', typ: 'text' },
      { id: 'gebdatum', typ: 'datum' },
    ],
  };
  assert.equal(V.feldEingetragen(kinderFeld, []), false, 'leeres Array');
  assert.equal(V.feldEingetragen(kinderFeld, [{}]), false, 'Eintrag ohne Sub-Werte');
  assert.equal(V.feldEingetragen(kinderFeld, [{ givenName: '' }]), false, 'Eintrag mit leerem Sub-Wert');
  assert.equal(V.feldEingetragen(kinderFeld, [{ givenName: 'Anna' }]), true, 'Eintrag mit einem Sub-Wert');
  assert.equal(V.feldEingetragen(kinderFeld, [{ }, { familyName: 'X' }]), true, 'einer von zwei Einträgen gefüllt');
});

test('1b) feldValidieren prüft jeden Sub-Wert gegen seinen Sub-Typ', () => {
  const { V } = ladeKern();
  const kinderFeld = {
    id: 'childrenAndDependants', typ: 'liste',
    unterFelder: [
      { id: 'givenName',  typ: 'text', pflicht: true },
      { id: 'gebdatum', typ: 'datum' },
    ],
  };
  // alle Sub-Werte ok
  assert.equal(V.feldValidieren(kinderFeld, [{ givenName: 'Anna', gebdatum: '2020-05-30' }]).ok, true);
  // Sub-Pflichtfeld leer → liste-eintrag-Fehler mit Verweis auf Eintrag + Sub-Feld
  const r1 = V.feldValidieren(kinderFeld, [{ givenName: '' }]);
  assert.equal(r1.ok, false);
  assert.equal(r1.grund, 'liste-eintrag');
  assert.equal(r1.eintrag, 0);
  assert.equal(r1.feld, 'givenName');
  assert.equal(r1.sub, 'pflicht');
  // Sub-Datum ungültig → liste-eintrag-Fehler mit sub=datum
  const r2 = V.feldValidieren(kinderFeld, [{ givenName: 'A', gebdatum: 'morgen' }]);
  assert.equal(r2.ok, false);
  assert.equal(r2.sub, 'datum');
});

test('1c) liste ohne unterFelder bleibt rückwärtskompatibel (nur Array-Prüfung)', () => {
  const { V } = ladeKern();
  assert.equal(V.feldValidieren({ id: 'x', typ: 'liste' }, []).ok, true);
  assert.equal(V.feldValidieren({ id: 'x', typ: 'liste' }, [{ irgendwas: 1 }]).ok, true);
  assert.equal(V.feldValidieren({ id: 'x', typ: 'liste' }, 'kein-array').ok, false);
});

/* ── 2) einfuehrungstext pro Sektor ──────────────────────────────────── */

test('2a) einfuehrungstext rendert unter dem Bereichs-Kopf (vor Sektionen)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const sektor = {
    id: 'test_intro', label: 'Test-Intro', format: 'TEST', icon: 'star',
    einfuehrungstext: 'Name, Foto, Kontakt — das Deckblatt Ihres Depots.',
    sektionen: [{ id: 's', label: 'A', felder: [{ id: 'x', label: 'X', typ: 'text' }] }],
  };
  V.renderSektor(sektor);
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /<p class="sektor-intro">Name, Foto, Kontakt — das Deckblatt Ihres Depots\.<\/p>/,
    'Einführungstext in .sektor-intro');
});

test('2b) ohne einfuehrungstext: kein Crash, keine .sektor-intro im Markup', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor({
    id: 'kein_intro', label: 'X', format: 'T', icon: 'star',
    sektionen: [{ id: 's', label: 'A', felder: [{ id: 'x', label: 'X', typ: 'text' }] }],
  });
  const html = document.getElementById('content').innerHTML;
  assert.equal(/class="sektor-intro"/.test(html), false, 'kein .sektor-intro ohne einfuehrungstext');
});

/* ── 3) Conditional fields — sichtbarWenn ────────────────────────────── */

test('3a) feldSichtbar: ohne Bedingung immer sichtbar', () => {
  const { V } = ladeKern();
  assert.equal(V.feldSichtbar({ id: 'x', typ: 'text' }, {}), true);
  assert.equal(V.feldSichtbar({ id: 'x', typ: 'text' }, { irgendwas: 'X' }), true);
});

test('3b) feldSichtbar: mit Bedingung — erfüllt vs nicht erfüllt', () => {
  const { V } = ladeKern();
  const feld = { id: 'q2', typ: 'text', sichtbarWenn: { feld: 'q1', wert: 'ja' } };
  assert.equal(V.feldSichtbar(feld, { q1: 'ja' }), true, 'Bedingung erfüllt');
  assert.equal(V.feldSichtbar(feld, { q1: 'nein' }), false, 'falscher Wert');
  assert.equal(V.feldSichtbar(feld, { q1: '' }), false, 'leer ist nicht „ja"');
  assert.equal(V.feldSichtbar(feld, {}), false, 'Feld nicht gesetzt');
});

test('3c) renderSektor blendet conditional Felder aus / ein, je nach Daten', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  const sektor = {
    id: 'test_cond', label: 'C', format: 'T', icon: 'star',
    sektionen: [{ id: 's', label: 'A', felder: [
      { id: 'grundsatz', label: 'Grundsatz', typ: 'auswahl',
        optionen: [{ wert: 'ja', label: 'Ja' }, { wert: 'nein', label: 'Nein' }] },
      { id: 'folgefrage', label: 'Folgefrage', typ: 'text',
        sichtbarWenn: { feld: 'grundsatz', wert: 'ja' } },
    ] }],
  };

  // a) Grundsatz nicht gesetzt → Folgefrage NICHT sichtbar
  V.renderSektor(sektor);
  let html = document.getElementById('content').innerHTML;
  assert.equal(html.includes('Folgefrage'), false, 'unerfüllt: kein Label');

  // b) Grundsatz = ja → Folgefrage sichtbar
  V.sektorFeldSetzen('test_cond', 'grundsatz', 'ja');
  V.renderSektor(sektor);
  html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('Folgefrage'), 'erfüllt: Label sichtbar');

  // c) Grundsatz = nein → Folgefrage wieder weg
  V.sektorFeldSetzen('test_cond', 'grundsatz', 'nein');
  V.renderSektor(sektor);
  html = document.getElementById('content').innerHTML;
  assert.equal(html.includes('Folgefrage'), false, 'falsch erfüllt: wieder weg');
});

/* ── 4) CROSS_SEKTOR_FELDER befüllbar via crossSektorAnmelden ────────── */

test('4a) crossSektorAnmelden hängt einen frozen Eintrag an die Liste', async () => {
  const { V } = ladeKern();
  // Bei frischem ladeKern enthält CROSS_SEKTOR_FELDER bereits die Spec-Cross-Refs.
  const initial = V.CROSS_SEKTOR_FELDER.length;
  // Neuer (test-spezifischer) Eintrag — nicht aus Spec, garantiert kein Duplikat.
  const e = V.crossSektorAnmelden({ quelle: 'test_q', feld: 'test_f', ziel: 'test_z' });
  assert.equal(V.CROSS_SEKTOR_FELDER.length, initial + 1, 'ein Eintrag mehr');
  assert.equal(V.CROSS_SEKTOR_FELDER[V.CROSS_SEKTOR_FELDER.length - 1], e, 'angehängt am Ende');
  assert.equal(Object.isFrozen(e), true, 'Eintrag ist eingefroren (unveränderlich)');
  assert.throws(() => { e.quelle = 'X'; }, TypeError, 'eingefrorener Eintrag lässt sich nicht überschreiben');
});

test('4b) crossSektorAnmelden ist idempotent (gleicher Eintrag → kein Duplikat)', () => {
  const { V } = ladeKern();
  const initial = V.CROSS_SEKTOR_FELDER.length;
  V.crossSektorAnmelden({ quelle: 'test_a', feld: 'f1', ziel: 'test_b' });
  V.crossSektorAnmelden({ quelle: 'test_a', feld: 'f1', ziel: 'test_b' });    // Duplikat
  V.crossSektorAnmelden({ quelle: 'test_a', feld: 'f2', ziel: 'test_b' });    // anderer feld → eigen
  assert.equal(V.CROSS_SEKTOR_FELDER.length, initial + 2, 'kein Duplikat für (test_a, f1, test_b)');
});

test('4c) crossSektorAnmelden wirft bei fehlenden/falschen Feldern', () => {
  const { V } = ladeKern();
  assert.throws(() => V.crossSektorAnmelden(null), /Eintrag fehlt|quelle/);
  assert.throws(() => V.crossSektorAnmelden({}), /quelle fehlt/);
  assert.throws(() => V.crossSektorAnmelden({ quelle: 'a' }), /feld fehlt/);
  assert.throws(() => V.crossSektorAnmelden({ quelle: 'a', feld: 'x' }), /ziel fehlt/);
  assert.throws(() => V.crossSektorAnmelden({ quelle: 1, feld: 'x', ziel: 'b' }), /quelle/);
});

test('4d) angemeldete Cross-Refs erscheinen im Render des ziel-Sektors', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');

  // Quelle = ECHTER Sektor/Feld (Etappe 2e: die Cross-Sektor-Ansicht lässt ein Ziel ohne
  // Felddefinition inzwischen aus — „bildung-fake" wäre seit diesem Bau kein Render-Fall mehr,
  // sondern genau der Weglassen-Fall, den ein eigener Test unten (etappe2e-…) belegt).
  V.sektorFeldSetzen('education', 'grossMonthlyIncome', '3500 €');
  // ziel = ein generisches Stub-Sektor mit einer eigenen Sektion (damit Render-Pfad gefahren wird).
  const ziel = {
    id: 'finanz-fake', label: 'Finanzen', format: 'TEST', icon: 'star',
    sektionen: [{ id: 's', label: 'Eigen', felder: [{ id: 'iban', label: 'IBAN', typ: 'text' }] }],
  };
  V.crossSektorAnmelden({ quelle: 'education', feld: 'grossMonthlyIncome', ziel: 'finanz-fake' });

  V.renderSektor(ziel);
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.crossSektorTitel), 'Cross-Sektor-Titel sichtbar');
  assert.ok(html.includes('3500 €'), 'Cross-Sektor-Wert vom Original-Ort gerendert');
});

/* ── 5) PERSON_ROLLEN.PARTNER ────────────────────────────────────────── */

test('5) PERSON_ROLLEN.PARTNER = „partner" (für ehepartner-Migration in menschen[])', () => {
  const { V } = ladeKern();
  assert.equal(V.PERSON_ROLLEN.PARTNER, 'partner');
});
