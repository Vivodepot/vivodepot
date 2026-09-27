'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — die Palette folgt der Marke (Fall 2, White Label bis zum letzten
   Grünton). Produktentscheidung, wörtlich (13.09.2026): „White label ist,
   wenn kein VD Design übrig bleibt, sondern alles das Design des Kunden
   ist."

   WAS DIESE DATEI HÄLT, und in dieser Reihenfolge:
     1. die EIGENE Farbe des Hauses muss durch die eigene Ableitung wieder sie
        selbst werden — sonst wäre die Ableitung ein Umbau, keine Öffnung.
     2. Eine echte Fremdfarbe bleibt EXAKT erhalten, solange sie lesbar ist.
        Eine Marke wird nicht ohne Not verfälscht.
     3. Eine Farbe, die gegen BEIDE Textkandidaten unter dem AA-Maß bleibt,
        wird abgedunkelt, bis sie trägt — nicht durchgelassen.
     4. Was Bedeutung trägt (Fehlerrot, Ampel, Notfall), bleibt unberührt.
        Strukturell geprüft, nicht an einem Einzelfall.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

function kern() { return ladeKern().V; }
function fakeRoot() {
  return { style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } } };
}
const KERN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

const VIVODEPOT_SALBEI = '#4F6539';
const SPARKASSE_BLAU = '#2E5C8A';     // Achsen-Testfixture, KEIN Sparkassen-Rot (s. Fixture-Kopf)

test('[Palette] die eigene Farbe des Hauses wird durch die eigene Ableitung wieder sie selbst', () => {
  const V = kern();
  const pal = V._brandingPaletteAbleiten(VIVODEPOT_SALBEI, '#8a6d3a');
  assert.ok(pal, 'die eigene Farbe darf nie verworfen werden');
  assert.equal(pal['--salbei-dunkel'], VIVODEPOT_SALBEI.toLowerCase(),
    'der Markenton bleibt unverändert, wenn er lesbar ist');
});

test('[Palette] jedes geprüfte Paar hält das AA-Maß — für die eigene Farbe wie für eine fremde', () => {
  const V = kern();
  for (const [name, p, s] of [['Vivodepot', VIVODEPOT_SALBEI, '#8a6d3a'], ['Sparkasse-Fixture', SPARKASSE_BLAU, '#F2A900']]) {
    const pal = V._brandingPaletteAbleiten(p, s);
    assert.ok(pal, name + ': nicht verworfen erwartet');
    for (const [vorne, hinten] of V._VD_BRANDING_PALETTE_PAARE) {
      const v = V._brandingKontrastVerhaeltnisHex(pal[vorne], pal[hinten]);
      assert.ok(v >= 4.5, name + ': ' + vorne + ' auf ' + hinten + ' = ' + v.toFixed(2) + ', unter 4.5');
    }
  }
});

/* ROT-BEWEIS, an der Stelle geführt, an der der Bau beinahe falsch geworden wäre.
   Die erste Fassung baute jede Rolle allein aus Ton + fester Rollen-Helligkeit, ohne die
   zweite Stufe (Textfarbe nachdunkeln, bis das Paar hält). Gemessen am 13.09.2026 kam
   die EIGENE Farbe des Hauses damit auf 4.15 statt 4.50 und wurde von der eigenen Prüfung
   verworfen — der Grund ist physikalisch, nicht zufällig: die Rollen-Helligkeit allein
   bestimmt die Leuchtdichte nicht, der Farbton tut es mit (Grün ist bei gleicher
   Helligkeit leuchtender als Blau). Diese Probe hält die ungedunkelte Rechnung fest. */
test('[Palette·Rot-Beweis] ohne die Nachdunkel-Stufe reißt die eigene Farbe des Hauses an --ink3', () => {
  const V = kern();
  const [h, s] = V._brandingHexZuHsl(VIVODEPOT_SALBEI);
  const rolle = V._VD_BRANDING_PALETTE_ROLLEN.find((r) => r[0] === '--ink3');
  const grund = V._VD_BRANDING_PALETTE_ROLLEN.find((r) => r[0] === '--cream');
  const ungedunkelt = V._brandingHslZuHex(h, Math.min(s, rolle[2]), rolle[3]);
  const creamHex = V._brandingHslZuHex(h, Math.min(s, grund[2]), grund[3]);
  const roh = V._brandingKontrastVerhaeltnisHex(ungedunkelt, creamHex);
  assert.ok(roh < 4.5, 'ohne Nachdunkeln erwartet: unter dem AA-Maß, gemessen ' + roh.toFixed(2));
  const pal = V._brandingPaletteAbleiten(VIVODEPOT_SALBEI, '#8a6d3a');
  assert.ok(V._brandingKontrastVerhaeltnisHex(pal['--ink3'], pal['--cream']) >= 4.5,
    'mit Nachdunkeln muss dasselbe Paar halten — sonst trägt die zweite Stufe nichts');
});

test('[Palette] eine lesbare Fremdmarke bleibt EXAKT erhalten, sie wird nicht verfälscht', () => {
  const V = kern();
  assert.equal(V._brandingPaletteAbleiten(SPARKASSE_BLAU, '#F2A900')['--salbei-dunkel'], SPARKASSE_BLAU.toLowerCase());
  assert.equal(V._brandingPaletteAbleiten('#E30613', '#ffffff')['--salbei-dunkel'], '#e30613');
});

test('[Palette] eine HELLE Marke wird nicht abgedunkelt — sie bekommt dunkle Schrift', () => {
  const V = kern();
  const pal = V._brandingPaletteAbleiten('#F2E205', '#333333');
  assert.ok(pal, 'ein helles Gelb ist lesbar mit dunkler Schrift und darf nicht verworfen werden');
  assert.equal(pal['--salbei-dunkel'], '#f2e205', 'der Ton bleibt');
  assert.equal(pal['--auf-akzent'], '#1c2a1e', 'die Schrift AUF der Markenfläche folgt mit');
});

test('[Palette·Gegenprobe] eine Farbe, die gegen BEIDE Kandidaten reißt, wird abgewiesen — die Palette bleibt beim Haus', () => {
  const V = kern();
  assert.equal(V._brandingTopbarKontrastText('#FF0000'), null, 'Testaufbau: reines Rot reißt wirklich beide Kandidaten');
  assert.equal(V._brandingMarkentonTragfaehig('#FF0000'), null, 'abgewiesen, nicht abgedunkelt');
  assert.equal(V._brandingPaletteAbleiten('#FF0000', '#ffffff'), null, 'und damit fällt die ganze Ableitung aus');
  /* DIE STELLE, AN DER DIESER BAU EINMAL FALSCH WAR. Die erste Fassung dunkelte eine
     abgewiesene Farbe ab, bis ein Kandidat trug, und schrieb sie in `--salbei-dunkel` — auf das
     die Kopfzeile zurückfällt. Die Abweisung lief damit ins Leere: die Farbe erschien doch
     oben, nur über einen anderen Weg. Gefangen hat es der bestehende E2E-Wächter
     (marke-e2e-abnahme, „Kontrast-Gegenprobe"), nicht diese Datei. Darum steht die Zusicherung
     jetzt auch HIER: eine Stelle, ein Urteil. */
  assert.equal(V._brandingMarkentonTragfaehig('#808080'), null,
    'ein Mittelgrau reißt beide Kandidaten und darf die Palette nie erreichen — sonst hebelt sie die Kopfzeilen-Abweisung aus');
});

test('[Palette] eine helle Marke wird trotzdem nicht abgedunkelt — Abweisung trifft nur die mittleren Töne', () => {
  const V = kern();
  assert.equal(V._brandingMarkentonTragfaehig('#F2E205'), '#F2E205',
    'ein helles Gelb trägt mit dunkler Schrift und bleibt unverändert');
});

test('[Palette] --success löst sich vom Markenton — „geschafft" wird sonst rot', () => {
  const V = kern();
  const root = fakeRoot();
  V._brandingPaletteAnwenden({ farbePrimaer: '#E30613', farbeSekundaer: '#ffffff' }, root);
  assert.equal(root.style._werte['--success'], V._VD_BRANDING_SEMANTISCHES_GRUEN);
  assert.notEqual(root.style._werte['--success'], root.style._werte['--salbei-dunkel'],
    'ohne diese Entkopplung trüge die Erfolgsmeldung die Fehlerfarbe');
});

test('[Palette·Wächter] der semantische Grünton steht wortgleich als --ampel-gruen im CSS', () => {
  const V = kern();
  const m = KERN_QUELLE.match(/--ampel-gruen:\s*(#[0-9a-fA-F]{6})/);
  assert.ok(m, '--ampel-gruen muss im CSS deklariert sein');
  assert.equal(m[1].toLowerCase(), V._VD_BRANDING_SEMANTISCHES_GRUEN.toLowerCase(),
    'Konstante und CSS-Deklaration dürfen nicht auseinanderlaufen');
});

test('[Palette·Wächter] kein Token, das BEDEUTUNG trägt, steht in der Rollen-Tabelle', () => {
  const V = kern();
  const gefaerbt = new Set(V._VD_BRANDING_PALETTE_ROLLEN.map((r) => r[0]));
  const bedeutung = ['--error', '--warning', '--info', '--teal', '--modus-notfall', '--modus-vollmacht',
    '--modus-angehoerigen', '--ampel-gruen', '--ampel-gelb', '--ampel-rot-hc', '--fehler-flaeche',
    '--notfall-flaeche', '--feld-fehler-schrift', '--hafer', '--schilf', '--white'];
  for (const t of bedeutung) {
    assert.ok(!gefaerbt.has(t), t + ' trägt Bedeutung oder eine eigene Achse und darf nie mit der Marke mitgefärbt werden');
  }
});

test('[Palette] der Reset räumt JEDES Token, das die Anwendung gesetzt hat', () => {
  const V = kern();
  const root = fakeRoot();
  V._brandingPaletteAnwenden({ farbePrimaer: SPARKASSE_BLAU, farbeSekundaer: '#F2A900' }, root);
  assert.ok(Object.keys(root.style._werte).length > 0, 'Testaufbau: es muss etwas gesetzt worden sein');
  V._brandingPaletteAnwenden(null, root);
  assert.deepEqual(root.style._werte, {}, 'nach dem Reset darf kein Token übrig sein');
});

/* Strukturell, nicht am Einzelfall — wie der U2-ADR-297-Rot-Beweis: ein zweiter Aufrufort
   im In-Depot-Pfad (Fall 1) würde die Palette einer angedockten Fremdmarke über das ganze
   Depot ziehen, und niemandem auffallen. */
test('[Palette·Rot-Beweis] _brandingPaletteAnwenden hat GENAU EINEN Aufrufort im Kern', () => {
  const treffer = KERN_QUELLE.split('\n')
    .filter((z) => /(?<!function )_brandingPaletteAnwenden\(/.test(z) && !/^function /.test(z.trim()));
  assert.equal(treffer.length, 1,
    'genau ein Aufruf erwartet (die Vor-Depot-Konfiguration) — jeder weitere hieße, dass Fall 1 die Palette mitfärbt');
});
