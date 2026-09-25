#!/usr/bin/env node
'use strict';
/* WARUM ALLE MARKER-REGIONEN UND NICHT NUR DIE DES BAKERS: `AB_WERK_REGIONEN` in tools/lib/produkt-text-erzeugen.js kennt 14 Regionen; der Kern trägt 23
   Marker. `AB_WERK_RECHTSRAUM_KATALOG_QUELLE` und `AB_WERK_BASISTEMPLATE_DE` haben keine Konfektionierer-Variable und stehen
   deshalb in keiner Liste des Bakers. Ein Bestand aus dessen Liste hätte sie nie gesehen. Der Bestand hier ist der Kern selbst.

   REICHWEITE: grün heißt, die Zeile steht — nicht, dass der Grund stimmt. Der Grund ist Pflicht, aber nicht geprüft; setzt
   jemand eine Zeile auf "fuehrt-nicht", ohne ihn zu prüfen, fällt die Erzwingung weg. Das kann ein Wächter ohne Prosa-Verständnis
   nicht leisten und deckt es nicht mit einer Heuristik zu.

   Prüft: jede Marker-Region des Kerns steht in tools/mitschrift-regionen-grundlinie.json in genau einer Zeile
   (fuehrt / fuehrt-nicht / offen), eine OFFENE Region darf nicht wachsen (Byte-Deckel je Region, exakt wie tools/geruest-waechter-
   pruefen.js: größer = rot, kleiner = Deckel zu hoch), 'fuehrt' nennt ein Fach, das `_abWerkMitschriftErzeugen` wirklich zurückgibt, und die
   Zahl der offenen Zeilen entspricht `offenMax` (nur senken, nie anheben).
   Aufruf: node tools/mitschrift-regionen-pruefen.js [--kern <pfad>] [--grundlinie-schreiben]
   (ohne Argument: vivodepot.html im Repo; --grundlinie-schreiben setzt/senkt die Byte-Deckel der offenen Zeilen, hebt nie an) */
const fs = require('node:fs');
const path = require('node:path');
const { abdeckungPruefen } = require('./lib/entscheidungstabelle-pruefen.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'mitschrift-regionen-grundlinie.json');
const ARTEN = ['fuehrt', 'fuehrt-nicht', 'offen'];

function regionenImKern(kernText) {
  const namen = new Set();
  for (const m of kernText.matchAll(/\/\* ([A-Z][A-Z0-9_]*):BEGIN \*\//g)) namen.add(m[1]);
  for (const m of kernText.matchAll(/<!-- ([A-Z][A-Z0-9_]*):BEGIN -->/g)) namen.add(m[1]);
  return [...namen].sort();
}

function regionsBytes(kernText, name) {
  for (const [b, e] of [['/* ' + name + ':BEGIN */', '/* ' + name + ':END */'], ['<!-- ' + name + ':BEGIN -->', '<!-- ' + name + ':END -->']]) {
    const a = kernText.indexOf(b);
    if (a < 0) continue;
    const z = kernText.indexOf(e, a);
    if (z < 0) throw new Error('mitschrift-regionen-pruefen: Ende-Marker von ' + name + ' fehlt');
    return Buffer.byteLength(kernText.slice(a + b.length, z), 'utf8');
  }
  return null;
}

function mitschriftFaecher(kernText) {
  const a = kernText.indexOf('function _abWerkMitschriftErzeugen');
  const b = kernText.indexOf('function _abWerkStrukturInsDepot', a);
  if (a < 0 || b < 0) throw new Error('mitschrift-regionen-pruefen: _abWerkMitschriftErzeugen nicht gefunden — Kern umgebaut? Nicht raten, nachsehen.');
  return kernText.slice(a, b);
}

function pruefen({ kernText, grundlinie }) {
  const befund = abdeckungPruefen({
    bestand: regionenImKern(kernText), eintraege: grundlinie.regionen,
    erlaubteArten: ARTEN, grundPflichtFuer: ['fuehrt-nicht', 'offen'],
  });
  const funktion = mitschriftFaecher(kernText);
  befund.fachFehlt = Object.entries(grundlinie.regionen)
    .filter(([, e]) => e && e.art === 'fuehrt')
    .filter(([, e]) => !(typeof e.fach === 'string' && new RegExp('\\n\\s+' + e.fach + '\\s*[,:]').test(funktion)))
    .map(([k]) => k);
  const offen = Object.values(grundlinie.regionen).filter((e) => e && e.art === 'offen').length;
  befund.regionWaechst = [];
  befund.deckelZuHoch = [];
  for (const [k, e] of Object.entries(grundlinie.regionen)) {
    if (!e || e.art !== 'offen') continue;
    const ist = regionsBytes(kernText, k);
    if (ist === null || typeof e.bytes !== 'number') { befund.regionWaechst.push(k + ' (kein Byte-Deckel oder Region fehlt)'); continue; }
    if (ist > e.bytes) befund.regionWaechst.push(k + ' (' + ist + ' > ' + e.bytes + ')');
    else if (ist < e.bytes) befund.deckelZuHoch.push(k + ' (' + ist + ' < ' + e.bytes + ')');
  }
  // Riegel auf die Ausnahme: die Zahl der „führt nicht"-Zeilen ist gedeckelt (exakt), ein zweiter Eintrag ist rot, bis jemand
  // den Deckel ausdrücklich senkt oder hebt — sichtbar im Diff. Bis eine Probe-Spalte steht, die auf eine Probe zeigt.
  const fuehrtNicht = Object.values(grundlinie.regionen).filter((e) => e && e.art === 'fuehrt-nicht').length;
  befund.fuehrtNichtDeckel = fuehrtNicht === grundlinie.fuehrtNichtMax ? [] : ['"fuehrt-nicht": ' + fuehrtNicht + ' Zeilen, Deckel ' + grundlinie.fuehrtNichtMax];
  befund.offenZahl = { ist: offen, deckel: grundlinie.offenMax };
  befund.deckelAbweichung = offen === grundlinie.offenMax ? [] : [offen > grundlinie.offenMax ? 'mehr offene Zeilen als offenMax' : 'offenMax zu hoch — absenken'];
  return befund;
}

function ok(b) {
  return ['unentschieden', 'veraltet', 'ohneGrund', 'unbekannteArt', 'mehrdeutig', 'fachFehlt', 'deckelAbweichung', 'regionWaechst', 'deckelZuHoch', 'fuehrtNichtDeckel'].every((k) => b[k].length === 0);
}

function grundlinieSchreiben(kernText, grundlinie) {
  const angehoben = [];
  for (const [k, e] of Object.entries(grundlinie.regionen)) {
    if (!e || e.art !== 'offen') continue;
    const ist = regionsBytes(kernText, k);
    if (ist === null) continue;
    if (typeof e.bytes === 'number' && ist > e.bytes) { angehoben.push(k + ' (' + ist + ' > ' + e.bytes + ')'); continue; }
    e.bytes = ist;
  }
  return angehoben;
}

module.exports = { pruefen, ok, regionenImKern, regionsBytes, grundlinieSchreiben, GRUNDLINIE, ARTEN };

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const kernPfad = i >= 0 ? process.argv[i + 1] : path.join(REPO, 'vivodepot.html');
  const kernText = fs.readFileSync(kernPfad, 'utf8');
  const grundlinie = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  if (process.argv.includes('--grundlinie-schreiben')) {
    const angehoben = grundlinieSchreiben(kernText, grundlinie);
    if (angehoben.length) { console.error('verweigert, würde anheben: ' + angehoben.join('; ')); process.exit(1); }
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(grundlinie, null, 2) + '\n');
    console.log('Grundlinie geschrieben.');
  }
  const b = pruefen({ kernText, grundlinie });
  if (ok(b)) { console.log('mitschrift-regionen-pruefen: OK (offen ' + b.offenZahl.ist + ')'); }
  else { console.log(JSON.stringify(b, null, 2)); process.exitCode = 1; }
}
