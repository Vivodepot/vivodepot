'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Nachtrag „White Label bis ins PDF" — Hüllenschicht für die gespiegelten Kontrast-Primitive
   ────────────────────────────────────────────────────────────────────────────
   Fund (13.09.2026), A359-Klasse in Krypto-Nachbarschaft: die vier
   Funktionen, die `_markeFarbeAnwenden()` in vivodepot-lesen.html trägt
   (`_brandingSrgbKanalLinear`, `_brandingRelativeLeuchtdichteHex`,
   `_brandingKontrastVerhaeltnisHex`, `_brandingTopbarKontrastText`), sind
   WÖRTLICHE Kopien aus vivodepot.html — heute byte-identisch, aber ohne
   diesen Wächter still veraltend, sobald der Kern sie ändert (genau wie es
   in derselben Nacht mit `_brandingMarkentonTragfaehig` im Kern geschah).

   Vorbild: `tests/krypto-block-propagation.test.js`, Abschnitt „W-Hüllenschicht"
   (`pruefeHuelle`/`funktionsKoerper` aus tools/krypto-block-propagation-pruefen.js) —
   dieselbe Bauform, hier auf die zwei Dateien dieses einen Spiegel-Paars verengt,
   statt auf eine Repo-weite Trägersuche. Zwei Funktionen (die zwei Konstanten
   dazu), ein Vergleich, mit echter Rot-Probe: ohne sie wäre unklar, ob der
   Vergleich überhaupt etwas findet, oder nur zufällig nie etwas fand.

   AUSDRÜCKLICH NICHT verglichen — kein Spiegel-Paar, sondern verschiedene
   Funktionen mit Absicht: `_brandingProduktTopbarAnwenden` (Kern) und
   `_markeFarbeAnwenden` (Lese-App) tragen verschiedene Trägerquellen für die
   Kopfzeilenfarbe (s. Kommentar über `_markeFarbeAnwenden` in vivodepot-
   lesen.html — der Kern trennt Fall 1/Fall 2 über den Aufrufort, die Lese-App
   kennt diese Trennung strukturell nicht, weil sie keine Vor-Depot-
   Konfiguration hat und `data.brandingModule` ihre EINZIGE Quelle für JEDE
   Branding-Angabe ist, Name wie Farbe, s. Vorhaben „White Label bis ins PDF"/U2-ADR-362-Interceptor). Ein
   Byte-Vergleich dieser beiden Funktionen wäre daher kein Befund, sondern ein
   Kategorienfehler — sie dürfen und sollen verschieden aussehen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { funktionsKoerper, konstantenWert } = require('../tools/krypto-block-propagation-pruefen.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const LESEN_PFAD = path.join(__dirname, '..', 'vivodepot-lesen.html');

const GESPIEGELTE_FUNKTIONEN = [
  '_brandingSrgbKanalLinear',
  '_brandingRelativeLeuchtdichteHex',
  '_brandingKontrastVerhaeltnisHex',
  '_brandingTopbarKontrastText',
  // Nachtrag 13.09.2026 (Palette-Nachzug, Fund) — reine Farb-Mathematik, ohne
  // Bindungs-Annahme, darum wörtlich mitgespiegelt (s. Kopf-Kommentar über _hexZuRgb in
  // vivodepot-lesen.html, warum _brandingPaletteAbleiten SELBST bewusst NICHT dazugehört).
  '_hexZuRgb',
  '_brandingHexZuHsl',
  '_brandingHslZuHex',
  '_brandingMarkentonTragfaehig',
];
const GESPIEGELTE_KONSTANTEN = [
  '_BRANDING_HEX_MUSTER',
  '_VD_BRANDING_TOPBAR_TEXT_KANDIDATEN',
  '_VD_BRANDING_TOPBAR_MIN_KONTRAST',
];

test('[Hülle·tragend] die vier Kontrast-Funktionen sind in Kern und Lese-App byte-identisch', () => {
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  const lesen = fs.readFileSync(LESEN_PFAD, 'utf8');
  for (const name of GESPIEGELTE_FUNKTIONEN) {
    const a = funktionsKoerper(kern, name);
    const b = funktionsKoerper(lesen, name);
    assert.ok(a, name + ' muss im Kern gefunden werden — sonst prüft dieser Wächter nichts');
    assert.ok(b, name + ' muss in der Lese-App gefunden werden — sonst prüft dieser Wächter nichts');
    assert.equal(b, a, name + ' ist zwischen Kern und Lese-App auseinandergelaufen — die AA-Zusicherung der Lese-App-Topbar hält nicht mehr dieselbe Formel wie der Kern');
  }
});

test('[Hülle] die zwei begleitenden Konstanten (Hex-Muster, AA-Schwelle, Text-Kandidaten) sind gleich', () => {
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  const lesen = fs.readFileSync(LESEN_PFAD, 'utf8');
  for (const name of GESPIEGELTE_KONSTANTEN) {
    const a = konstantenWert(kern, name);
    const b = konstantenWert(lesen, name);
    assert.ok(a, name + ' muss im Kern gefunden werden');
    assert.ok(b, name + ' muss in der Lese-App gefunden werden');
    assert.equal(b, a, name + ' ist auseinandergelaufen');
  }
});

test('[Hülle·Rot-Beweis] eine auseinandergelaufene Kopie macht den Wächter tatsächlich rot', () => {
  // Ohne diese Probe wäre unklar, ob der obige grüne Vergleich etwas prüft
  // oder nur zufällig nie etwas findet (dieselbe Sorge wie bei jedem anderen
  // W-Hüllenschicht-Wächter — s. Vorbild-Kommentar oben).
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  const original = fs.readFileSync(LESEN_PFAD, 'utf8');
  const anker = funktionsKoerper(original, '_brandingKontrastVerhaeltnisHex');
  assert.ok(anker, 'Vorbedingung: die Funktion steht wie erwartet in der Lese-App');
  const mutiert = original.replace(anker, anker.replace('hell + 0.05', 'hell + 0.06'));
  assert.notEqual(mutiert, original, 'Vorbedingung: die Ersetzung hat tatsächlich gegriffen');
  const tmp = path.join(os.tmpdir(), 'branding-huelle-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, mutiert);
  try {
    const a = funktionsKoerper(kern, '_brandingKontrastVerhaeltnisHex');
    const b = funktionsKoerper(fs.readFileSync(tmp, 'utf8'), '_brandingKontrastVerhaeltnisHex');
    assert.notEqual(b, a, 'mutiert: der Vergleich muss die Abweichung fangen — der Zustand, den dieser Wächter verhindern soll');
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('[Hülle·Gegenprobe] `_brandingProduktTopbarAnwenden` (Kern) und `_markeFarbeAnwenden` (Lese-App) sind bewusst KEIN Spiegel-Paar', () => {
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  const lesen = fs.readFileSync(LESEN_PFAD, 'utf8');
  assert.ok(funktionsKoerper(kern, '_brandingProduktTopbarAnwenden'), 'Vorbedingung: die Kern-Funktion existiert unter ihrem eigenen Namen');
  assert.equal(funktionsKoerper(kern, '_markeFarbeAnwenden'), null, 'der Kern kennt diesen Namen nicht — verschiedene Trägerquellen, verschiedene Funktionen, absichtlich');
  assert.ok(funktionsKoerper(lesen, '_markeFarbeAnwenden'), 'Vorbedingung: die Lese-App-Funktion existiert unter ihrem eigenen Namen');
  assert.equal(funktionsKoerper(lesen, '_brandingProduktTopbarAnwenden'), null, 'die Lese-App kennt diesen Namen nicht — sie hat keine Vor-Depot-Konfiguration, also keinen Fall-2-Aufrufort dafür');
});

test('[Hülle·Gegenprobe] `_brandingPaletteAbleiten` (Kern) und `_lesenPaletteAbleiten` (Lese-App) sind bewusst KEIN Spiegel-Paar', () => {
  // Anders als die vier reinen Mathe-Funktionen oben: der Kern-Rumpf hardcoded
  // `palette['--salbei-dunkel']` für --auf-akzent — eine Rolle, die die Lese-App nicht hat
  // (--akzent trägt hier Modus-Bedeutung, s. Kopf-Kommentar über _hexZuRgb in
  // vivodepot-lesen.html). Ein Byte-Vergleich dieser beiden wäre darum kein Befund.
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  const lesen = fs.readFileSync(LESEN_PFAD, 'utf8');
  assert.ok(funktionsKoerper(kern, '_brandingPaletteAbleiten'), 'Vorbedingung: die Kern-Funktion existiert unter ihrem eigenen Namen');
  assert.equal(funktionsKoerper(kern, '_lesenPaletteAbleiten'), null, 'der Kern kennt diesen Namen nicht');
  assert.ok(funktionsKoerper(lesen, '_lesenPaletteAbleiten'), 'Vorbedingung: die Lese-App-Funktion existiert unter ihrem eigenen Namen');
  assert.equal(funktionsKoerper(lesen, '_brandingPaletteAbleiten'), null, 'die Lese-App kennt diesen Namen nicht — eigene, engere Rollen-Tabelle statt Kopie');
});
