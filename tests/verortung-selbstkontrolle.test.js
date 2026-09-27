'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Selbstkontrolle für tools/lib/verortung.js
   ────────────────────────────────────────────────────────────────────────
   Das Werkzeug, das die Verortung anderer Werkzeuge prüft, ist selbst ein
   Messwerkzeug — und damit der unbelegteste Code im Kreislauf (§3.5b), wenn
   es keine eigenen Kontrollen trägt.

   Der Kernbeleg ist die UM EINS VERSCHOBENE Position: genau der Fehler, der
   am 27.07. durchkam, weil ein Kommentar-Ausblenden Zeilenumbrüche fraß.
   Wenn diese Kontrolle nicht rot wird, prüft das Werkzeug nichts.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { pruefeVerortung, verortungOderWirf } = require('../tools/lib/verortung.js');
const WURZEL = path.join(__dirname, '..');

// Ein Anker im Repo, der sich nicht bewegt, ohne dass es jemand merkt.
const ANKER_DATEI = 'scripts/build-datum-kern.js';
const ANKER_MUSTER = 'function heuteLokal';
const ANKER_ZEILE = fs.readFileSync(path.join(WURZEL, ANKER_DATEI), 'utf8')
  .split('\n').findIndex(z => z.includes(ANKER_MUSTER)) + 1;

test('[Verortung] der Anker ist überhaupt auffindbar (sonst prüft alles Weitere nichts)', () => {
  assert.ok(ANKER_ZEILE > 0, `"${ANKER_MUSTER}" in ${ANKER_DATEI} gefunden`);
});

/* ── NEGATIVKONTROLLE: eine richtige Verortung geht durch ──────────────── */
test('[Verortung·Negativkontrolle] eine zutreffende Angabe erzeugt keinen Werkzeug-Fehler', () => {
  assert.deepEqual(
    pruefeVerortung([{ datei: ANKER_DATEI, zeile: ANKER_ZEILE, muster: ANKER_MUSTER }], { wurzel: WURZEL }),
    []);
});

/* ── POSITIVKONTROLLE: DER Fall vom 27.07. ────────────────────────────── */
test('[Verortung·Positivkontrolle] eine um EINS verschobene Zeile wird gemeldet', () => {
  for (const versatz of [-1, +1]) {
    const fehler = pruefeVerortung(
      [{ datei: ANKER_DATEI, zeile: ANKER_ZEILE + versatz, muster: ANKER_MUSTER }],
      { wurzel: WURZEL });
    assert.equal(fehler.length, 1, `Versatz ${versatz} muss GENAU einen Werkzeug-Fehler geben`);
    assert.match(fehler[0], /Muster steht dort NICHT/,
      'und zwar mit der erwarteten Meldung, nicht irgendwie rot');
  }
});

test('[Verortung·Positivkontrolle] eine Zeile ausserhalb der Datei wird gemeldet', () => {
  // Der Klassiker beim Umrechnen: 0-basiert gegen 1-basiert. Ohne Grenzprüfung
  // liest man `zeilen[-1]` (undefined) und meldet stumm „Muster fehlt" statt
  // „die Angabe ist unmoeglich".
  for (const z of [0, 10 ** 7]) {
    const fehler = pruefeVerortung([{ datei: ANKER_DATEI, zeile: z, muster: ANKER_MUSTER }], { wurzel: WURZEL });
    assert.match(fehler[0] || '', /ausserhalb der Datei/);
  }
});

test('[Verortung·Positivkontrolle] eine nicht lesbare Datei wird gemeldet, nicht verschluckt', () => {
  const fehler = pruefeVerortung([{ datei: 'gibt-es-nicht.js', zeile: 1, muster: 'x' }], { wurzel: WURZEL });
  assert.match(fehler[0] || '', /nicht lesbar/);
});

/* ── Die anderen Verortungs-Arten: ungeprüft ist NICHT bestanden ───────── */
test('[Verortung] Selektor/Feld ohne Prüf-Funktion zählen NICHT als bestanden', () => {
  // Dieselbe Regel wie beim Validator (U2-ADR-106): was nicht geprüft werden
  // konnte, ist offen — nie stillschweigend gruen.
  const ohneHelfer = pruefeVerortung(
    [{ datei: ANKER_DATEI, selektor: '.gibt-es-nicht' }, { datei: ANKER_DATEI, feld: 'kein_feld' }],
    { wurzel: WURZEL });
  assert.equal(ohneHelfer.length, 2);
  ohneHelfer.forEach(f => assert.match(f, /ungeprueft ist nicht bestanden/));
});

test('[Verortung] Selektor und Feld werden über die gegebenen Prüf-Funktionen entschieden', () => {
  const opts = {
    wurzel: WURZEL,
    selektorTrifft: (_d, sel) => sel === '.gibt-es',
    feldExistiert: (feld) => feld === 'gibt_es',
  };
  assert.deepEqual(pruefeVerortung(
    [{ datei: ANKER_DATEI, selektor: '.gibt-es' }, { datei: ANKER_DATEI, feld: 'gibt_es' }], opts), []);

  const schlecht = pruefeVerortung(
    [{ datei: ANKER_DATEI, selektor: '.fehlt' }, { datei: ANKER_DATEI, feld: 'fehlt' }], opts);
  assert.equal(schlecht.length, 2);
  assert.match(schlecht[0], /trifft im gerenderten DOM nicht/);
  assert.match(schlecht[1], /gibt es im Modell nicht/);
});

/* ── Die Trennung, auf die es ankommt ─────────────────────────────────── */
test('[Verortung] verortungOderWirf trennt Werkzeug-Fehler vom Fund', () => {
  // Ein Fund kann inhaltlich richtig und trotzdem falsch verortet sein. Dann ist
  // die Meldung unbrauchbar — und das ist ein Fehler des WERKZEUGS, der nicht in
  // der Fund-Liste verschwinden darf.
  assert.throws(
    () => verortungOderWirf([{ datei: ANKER_DATEI, zeile: ANKER_ZEILE + 1, muster: ANKER_MUSTER }], { wurzel: WURZEL }),
    (e) => e.name === 'VerortungsFehler' && Array.isArray(e.verortungsFehler) && e.verortungsFehler.length === 1);

  // Und bei sauberer Verortung reicht es die Funde unveraendert durch.
  const funde = [{ datei: ANKER_DATEI, zeile: ANKER_ZEILE, muster: ANKER_MUSTER }];
  assert.equal(verortungOderWirf(funde, { wurzel: WURZEL }), funde);
});

/* ── entdoppeln: kein Feld ausserhalb des Schluessels ──────────────────── */
test('[Verortung·entdoppeln] Nicht-Schluessel-Felder kommen gar nicht erst mit', () => {
  const { entdoppeln } = require('../tools/lib/verortung.js');
  // Genau der Fall vom 27.07.: gleiche tag/klasse/kontrast, VERSCHIEDENE themes.
  const funde = [
    { tag: 'span', klasse: '', kontrast: 1, theme: 'hell' },
    { tag: 'span', klasse: '', kontrast: 1, theme: 'hochkontrast' },
  ];
  const r = entdoppeln(funde, ['tag', 'klasse', 'kontrast']);
  assert.equal(r.length, 1);
  assert.equal(r[0].anzahl, 2);
  assert.ok(!('theme' in r[0]),
    'theme stand nicht im Schluessel und darf nach dem Entdoppeln nicht ablesbar sein — ' +
    'genau daraus entstand die falsche These „der Modus macht es kaputt"');
});

test('[Verortung·entdoppeln] ausdruecklich gesammelte Felder kommen VOLLSTAENDIG', () => {
  const { entdoppeln } = require('../tools/lib/verortung.js');
  const r = entdoppeln([
    { tag: 'span', kontrast: 1, theme: 'hell' },
    { tag: 'span', kontrast: 1, theme: 'hochkontrast' },
    { tag: 'span', kontrast: 1, theme: 'hell' },
  ], ['tag', 'kontrast'], ['theme']);
  assert.deepEqual(r[0].theme, ['hell', 'hochkontrast'],
    'wer ein Nicht-Schluessel-Feld braucht, bekommt ALLE Werte der Gruppe — nie einen davon');
  assert.equal(r[0].anzahl, 3);
});

test('[Verortung·entdoppeln·Negativkontrolle] verschiedene Schluessel bleiben getrennt', () => {
  const { entdoppeln } = require('../tools/lib/verortung.js');
  const r = entdoppeln([{ tag: 'span', kontrast: 1 }, { tag: 'div', kontrast: 1 }], ['tag', 'kontrast']);
  assert.equal(r.length, 2, 'sonst faellt zusammen, was nicht zusammengehoert');
});
