'use strict';
/* ════════════════════════════════════════════════════════════════════════
   stick-ausgabe-backen.js — die Probe zum Bäcker
   ────────────────────────────────────────────────────────────────────────
   Der Bäcker darf NICHTS über den Gegenstand annehmen: Er sucht die Region in der
   übergebenen Datei und bricht ab, wenn sie fehlt, doppelt steht oder etwas anderes als
   reine Nutzlast trägt. Und der Kern im Repo muss leer bleiben — eine ausgelieferte
   Download-Datei, die sich für Stick-Ware hält, würde die Browser-Kopie räumen, die auf dem
   eigenen Rechner bleiben soll.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ausgabeLesen, ausgabeBacken, dateiBacken, REGION } = require('./stick-ausgabe-backen.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const huelle = (innen) => 'davor\n' + REGION.begin + '\n' + innen + '\n' + REGION.ende + '\ndanach\n';

test('[Bäcker] der Kern im Repo trägt KEINE Auslieferungsform', () => {
  const stand = ausgabeLesen(fs.readFileSync(KERN, 'utf8'), KERN);
  assert.equal(stand.leer, true, 'der Kern im Repo ist als Stick-Ware gebacken — jede daraus gebaute Download-Datei räumte die Browser-Kopie');
  assert.equal(stand.istStick, false);
});

test('[Bäcker] backt das Merkmal und nimmt es wieder zurück', () => {
  const leer = huelle('const AB_WERK_AUSGABE = null;');
  const mitStick = ausgabeBacken(leer, 'stick');
  assert.equal(ausgabeLesen(mitStick).istStick, true);
  assert.equal(ausgabeLesen(ausgabeBacken(mitStick, 'keine')).leer, true, 'zurücknehmen führt nicht auf den leeren Stand');
  assert.ok(mitStick.startsWith('davor\n') && mitStick.endsWith('danach\n'), 'der Text außerhalb der Region bleibt unberührt');
});

test('[Bäcker] eine echte Produktdatei: gebacken und wieder gelesen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-baecker-'));
  const ziel = path.join(tmp, 'vivodepot.html');
  try {
    fs.copyFileSync(KERN, ziel);
    const stand = dateiBacken(ziel, 'stick');
    assert.equal(stand.istStick, true);
    // Und der Kern im Repo ist dabei unberührt geblieben.
    assert.equal(ausgabeLesen(fs.readFileSync(KERN, 'utf8'), KERN).leer, true);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Bäcker] fehlende Region: Abbruch, kein Schreiben', () => {
  assert.throws(() => ausgabeBacken('nichts hier drin', 'stick'), /fehlt|steht 0x/,
    'ohne Region wurde trotzdem etwas zurückgegeben');
});

test('[Bäcker] doppelte Region: Abbruch — welche wäre gemeint?', () => {
  const doppelt = huelle('const AB_WERK_AUSGABE = null;') + huelle('const AB_WERK_AUSGABE = null;');
  assert.throws(() => ausgabeBacken(doppelt, 'stick'), /steht 2x/);
});

test('[Bäcker] unbekannte Auslieferungsform: Abbruch statt stiller Nutzlast', () => {
  assert.throws(() => ausgabeBacken(huelle('const AB_WERK_AUSGABE = null;'), 'usb-stick'), /Unbekannte Auslieferungsform/);
});

test('[Bäcker] gebacken wird ein einzelnes Literal — Nutzlast, keine Logik', () => {
  // Der Schutz sitzt in _regionIstReineNutzlast (Konfektionierer-Bibliothek), und er gilt für den
  // Bäcker nur, wenn er wirklich über sie schreibt. Geprüft wird darum das Ergebnis: zwischen den
  // Markern steht genau eine Zuweisung mit einem Literal, kein Aufruf, kein Ausdruck.
  const gebacken = ausgabeBacken(huelle('const AB_WERK_AUSGABE = null;'), 'stick');
  const innen = gebacken.slice(gebacken.indexOf(REGION.begin) + REGION.begin.length, gebacken.indexOf(REGION.ende)).trim();
  assert.equal(innen, 'const AB_WERK_AUSGABE = {"art":"stick"};');
  assert.equal(/[(){}]\s*=>|function|\breturn\b/.test(innen), false, 'in der Region steht Logik statt Nutzlast');
});

test('[Bäcker · Rot-Beweis] eine Nutzlast, die kein Literal wäre, wird abgewiesen', () => {
  const lib = require('./lib/produkt-text-erzeugen.js');
  const innenMitLogik = '\nconst AB_WERK_AUSGABE = (function () { return { art: "stick" }; })();\n';
  assert.equal(lib._regionIstReineNutzlast(innenMitLogik, REGION), false,
    'die Bibliothek nimmt auch Logik an — dann schützt sie den Bäcker nicht');
  assert.equal(lib._regionIstReineNutzlast('\nconst AB_WERK_AUSGABE = {"art":"stick"};\n', REGION), true,
    'die Bibliothek weist die echte Nutzlast ab — dann ist die Probe darüber wertlos');
});
