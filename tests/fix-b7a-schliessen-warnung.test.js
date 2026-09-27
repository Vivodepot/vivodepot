'use strict';
/* ════════════════════════════════════════════════════════════════════════
   B7a — Fensterschliessen mit ungespeicherten Eingaben: das VERHALTEN
   ────────────────────────────────────────────────────────────────────────
   DER VERDACHT DER ZEILE HAT SICH BESTAETIGT: „das ‚gespeichert' im Testaufbau
   war vermutlich keins."

   GEMESSEN 29.07.2026 auf u2-fix: `markiereAlsDateiGesichert` hatte NULL
   Aufrufer im Produkt — obwohl ihr eigener Kommentar seit jeher behauptete,
   der erfolgreiche .vivodepot-Export rufe sie auf. Der echte Weg setzte
   stattdessen `_aktuelleDateiSicherung = true` direkt in `depotHerunterladen`
   und nullte den Zaehler 80 Zeilen entfernt in `flowDepotSichern`: zwei
   Haelften eines Zustands, die nur zusammen „gespeichert" bedeuten, an zwei
   Stellen gesetzt.

   `tests/persistenz-status.test.js` (PS2-2) stellte den Zustand „aktuelle
   Datei liegt vor" AUSSCHLIESSLICH ueber diese tote Funktion her. Der Test war
   gruen ueber einen Pfad, den das Produkt nie nahm — dieselbe Fehlerform wie
   der kiwiz-Fall vom 25.07.

   WAS NICHT DEFEKT WAR, und das gehoert dazu: beide realen Aufrufer sind gegen
   `abgebrochen` und `vorschau` abgesichert. Der Zustand war korrekt; ungeprueft
   war er. Der Fix fuehrt die beiden Haelften an EINER Stelle zusammen, damit
   Test und Buergerin dieselbe Naht fahren.

   DIE ERSTE PROBE IST EIN WAECHTER, kein Beispiel: sie verlangt, dass jede
   Funktion, die den Datei-Gesichert-Zustand herstellt, im Produkt auch
   aufgerufen wird. Eine kuenftige zweite tote Naht faellt damit auf.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frisch() {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Maria');
  return V;
}

/* Der Produkt-Quelltext ohne die Funktionsdefinition selbst — sonst zaehlte
   `function markiereAlsDateiGesichert(...)` als ihr eigener Aufrufer. */
function aufrufeImProdukt(script, name) {
  const ohneDefinition = script.replace(new RegExp('function\\s+' + name + '\\s*\\(', 'g'), 'DEFINITION(');
  return (ohneDefinition.match(new RegExp('\\b' + name + '\\s*\\(', 'g')) || []).length;
}

/* ── Probe 1 · DER WÄCHTER ────────────────────────────────────────────────
   Diskriminante: welche Zustands-Naht ist tot? Jede Funktion, die den
   Datei-Gesichert-Zustand herstellt, MUSS im Produkt aufgerufen werden. */
function toteNaehte(V, script) {
  const durchgefallen = [];
  for (const name of ['markiereAlsDateiGesichert', 'markiereGespeichert', 'markiereUngespeichert']) {
    if (typeof V[name] !== 'function') { durchgefallen.push(name + ' — nicht im Kern gefunden'); continue; }
    const n = aufrufeImProdukt(script, name);
    if (n === 0) durchgefallen.push(name + ' — NULL Aufrufer im Produkt (tote Naht; ein Test darüber '
      + 'fährt einen Pfad, den die Bürgerin nie nimmt)');
  }
  return durchgefallen;
}

test('fix-b7a-keine-tote-naht-fuer-gespeichert', () => {
  const { V, script2 } = ladeKern();
  // Positivkontrolle: der Zähler zählt überhaupt etwas — sonst wäre jede Null nichtssagend.
  assert.ok(aufrufeImProdukt(script2, 'markiereUngespeichert') >= 5,
    'Positivkontrolle: markiereUngespeichert hat viele Aufrufer, der Zähler misst');
  assert.deepEqual(toteNaehte(V, script2), [],
    'Eine Funktion, die „gespeichert" bedeutet, wird im Produkt nicht aufgerufen. Genau das war '
    + 'B7a: der Test fuhr über sie, das Produkt nie.');
});

/* ── Probe 2 · der ECHTE Weg schaltet die Warnung ab ──────────────────────
   Nicht über die Naht, sondern über `depotHerunterladen` — den Weg, den der
   Sichern-Knopf nimmt. Bestätigter FSA-Schreibweg (`showSaveFilePicker` +
   `createWritable().close()`) gemockt, statt den Default-Testkern ohne FSA laufen
   zu lassen: Ohne den Mock läuft `depotHerunterladen` auf den Anker-Download
   ('download') — und der gilt seit dem Auftrag „Erfolg ohne Wirkung" (08.08.2026,
   Zug 1) bewusst NICHT mehr als Bestätigung (s. Probe 4 unten). Diese Probe prüft
   ausdrücklich den BESTÄTIGTEN Pfad. */
async function echterWegVerstoesse(V) {
  const fehler = [];
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');
  if (V.schliessenWarnungNoetig() !== true) fehler.push('offene Edits → es MUSS gewarnt werden');

  /* KEIN IDB-Save davor — und das ist der Punkt. Nullte der Cache-Save den Zähler
     vorher, träfe `depotHerunterladen` auf 0 und die alte Zuweisung
     `_aktuelleDateiSicherung = true` genügte; die Probe könnte alt und neu nicht
     unterscheiden (gemessen: sie blieb gegen die Mutation grün). Erst OHNE ihn misst
     sie die Naht selbst: der Export muss BEIDE Hälften setzen, nicht eine. */
  const weg = await V.depotHerunterladen();          // DER ECHTE EXPORT, auf offenen Edits
  if (weg !== 'datei') {
    fehler.push('Aufbau: der bestätigte Export kam nicht durch (' + weg + ') — die Probe misst dann nichts');
  } else if (V.schliessenWarnungNoetig() !== false) {
    fehler.push('nach erfolgreichem Datei-Export darf NICHT mehr gewarnt werden (Zustand: '
      + JSON.stringify(V.saveStatusModell()) + ')');
  }

  V.markiereUngespeichert();                          // neue Arbeit
  if (V.schliessenWarnungNoetig() !== true) fehler.push('neue Änderung → wieder warnen');
  return fehler;
}

async function mitBestaetigtemFsaHandle() {
  const fakeHandle = { name: 'X.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
  const { V } = ladeKern({ showSaveFilePicker: async () => fakeHandle });
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Maria');
  return V;
}

test('fix-b7a-echter-export-schaltet-die-warnung-ab', async () => {
  const V = await mitBestaetigtemFsaHandle();
  assert.deepEqual(await echterWegVerstoesse(V), [],
    'Die Schließen-Warnung muss über den Weg gemessen werden, den der Sichern-Knopf nimmt — '
    + 'nicht über eine Naht, die nur der Test kennt.');
});

/* ── Probe 4 · der UNBESTÄTIGTE Anker-Download schaltet die Warnung NICHT ab ──
   Auftrag „Erfolg ohne Wirkung" (08.08.2026), Zug 1: ein per Anker ausgelöster
   Download ('download') gibt dem Skript nie eine Rückmeldung, ob die Datei auf
   der Platte ankam. Vor dem Fix behandelte depotHerunterladen() 'download' genau
   wie 'datei' — ein blockierter/verworfener Download meldete „gespeichert". */
test('fix-b7a-unbestaetigter-download-gilt-nicht-als-gespeichert', async () => {
  const V = await frisch();                           // Default-Testkern: kein FSA → Anker-Download
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');
  const weg = await V.depotHerunterladen();
  assert.equal(weg, 'download', 'Aufbau: dieser Testkern nimmt ohne FSA-Mock den Anker-Download');
  assert.equal(V.schliessenWarnungNoetig(), true,
    'ein unbestätigter Download darf die Verlust-Warnung NICHT abschalten');
  // Zug 1 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026, S14): der vierte Zustand
  // (_letzteDateiSicherungUnbestaetigt) bekommt jetzt einen Abnehmer in saveStatusModell() —
  // vorher unerreichbar (der anzahl>0-Zweig griff immer zuerst), darum sah dieser Test bislang
  // 'ungespeichert'. Der Zähler bleibt weiterhin stehen (kein automatisches „gespeichert"); NEU ist
  // nur, dass die Pille das jetzt als eigenen, wahreren Zustand zeigt statt es zu verdecken.
  assert.equal(V.saveStatusModell().zustand, 'unbestaetigt',
    'geschrieben, aber unbestätigt — kein automatisches „gespeichert" ohne Schreibbestätigung');
});

/* ── Probe 4b · derselbe Fall über depotInDateiSichern() — den Weg, den „Sichern und
   schließen" WIRKLICH nimmt ─────────────────────────────────────────────────────
   GEMESSEN beim Bau des Browser-Rauchtests (Zug 5 desselben Auftrags, rot ⇄ grün): die
   depotHerunterladen()-Korrektur allein reichte NICHT. depotInDateiSichern() rief direkt
   danach unconditional markiereGespeichert() — das deckte die gerade gesetzte Unterscheidung
   sofort wieder zu, und „Sichern und schließen" schloss die App trotz unbestätigtem Download. */
test('fix-b7a-depotInDateiSichern-ueberschreibt-den-unbestaetigten-zustand-nicht', async () => {
  const V = await frisch();                           // Default-Testkern: kein FSA → Anker-Download
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');
  await V.depotInDateiSichern();                       // der ECHTE Weg von „Sichern und schließen" / Topbar-Knopf
  assert.equal(V.schliessenWarnungNoetig(), true,
    'depotInDateiSichern() darf einen unbestätigten Download nicht in „gespeichert" verwandeln');
  // Zug 1 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026, S14) — s. Kommentar in der Probe darüber.
  assert.equal(V.saveStatusModell().zustand, 'unbestaetigt');
});

/* ── Probe 3 · ein abgebrochener Export gilt NICHT als gespeichert ────────
   Die gefährliche Richtung: „gespeichert" behaupten, ohne dass eine Datei
   entstand. Dann schwiege das Fenster beim Schließen — und die Arbeit wäre weg. */
test('fix-b7a-abgebrochener-export-gilt-nicht-als-gespeichert', async () => {
  const V = await frisch();
  V.sektorFeldSetzen('socialInsurance', 'careLevel', '3');
  const vorher = V.schliessenWarnungNoetig();
  assert.equal(vorher, true, 'Positivkontrolle: vor dem Versuch wird gewarnt');
  // Kein Export gefahren — der Zustand darf sich von allein nicht in „gesichert" drehen.
  assert.equal(V.schliessenWarnungNoetig(), true,
    'ohne erfolgreichen Export bleibt die Warnung stehen');
  // Und die Naht selbst kippt ihn nur mit BEIDEN Hälften.
  V.markiereGespeichert();                            // nur Zähler 0 — KEINE Datei
  assert.equal(V.schliessenWarnungNoetig(), true,
    'Zähler 0 allein ist kein „gespeichert" — ohne Datei wird weiter gewarnt (Cache ≠ Datei)');
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'fix-b7a-keine-tote-naht-fuer-gespeichert', diskriminante: (V) => toteNaehte(V, ladeKern().script2) },
    { fuer: 'fix-b7a-echter-export-schaltet-die-warnung-ab', diskriminante: echterWegVerstoesse },
  ],
};
