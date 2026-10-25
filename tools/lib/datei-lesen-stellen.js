'use strict';
/* datei-lesen-stellen.js — findet in den HTML-Anwendungen jede Stelle, die eine vom Nutzer gewählte Datei ganz einliest
   (datei.text(), .arrayBuffer(), FileReader.readAs…), und sagt, ob davor die Größe geprüft wird.
   Grund: eine Datei von außen (E-Mail, Upload, Stick) ist fremde Eingabe; wer sie ohne Größengrenze einliest, lässt sich mit
   einer Riesendatei lahmlegen (Befund ANTWORT-DATEI-OHNE-GROESSENGRENZE, 20.10.2026). Die Prüfung ist bewusst einfach: eine
   Größenprüfung zählt, wenn in den 25 Zeilen davor ein Vergleich mit `.size` oder eine Grenz-Konstante (_MAX…) steht.
   Genutzt von tests/datei-lesen-mit-groessengrenze.test.js; die Stellen ohne Grenze stehen in
   tools/datei-lesen-ohne-grenze-grundlinie.json und dürfen nur weniger werden. */
const fs = require('node:fs');
const path = require('node:path');

const ANWENDUNGEN = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html'];
const LESEN = /\b(\w+(?:\.files\[0\])?)\.(?:text|arrayBuffer)\(\)|\breadAs(?:Text|ArrayBuffer|DataURL|BinaryString)\(/;
const KEINE_DATEI = new Set(['doc', 'res', 'r', 'resp', 'response', 'antwort', 'this']);
const GRENZE = /\.size\s*[>]|_MAX_|MAX_BYTES|MAX_ZEICHEN/;
const FENSTER = 25;

function stellenIn(text) {
  const zeilen = text.split('\n');
  const aus = [];
  zeilen.forEach((z, i) => {
    const s = z.trim();
    if (!s || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*') || s.length > 400) return;
    const m = LESEN.exec(z);
    if (!m) return;
    if (m[1] && KEINE_DATEI.has(m[1])) return;
    const davor = zeilen.slice(Math.max(0, i - FENSTER), i + 1).join('\n');
    aus.push({ zeile: i + 1, text: s, mitGrenze: GRENZE.test(davor) });
  });
  return aus;
}

function alleStellen(wurzel) {
  return ANWENDUNGEN.flatMap((datei) => stellenIn(fs.readFileSync(path.join(wurzel, datei), 'utf8')).map((x) => Object.assign({ datei }, x)));
}

module.exports = { stellenIn, alleStellen, ANWENDUNGEN };

if (require.main === module) {
  for (const s of alleStellen(path.join(__dirname, '..', '..'))) console.log((s.mitGrenze ? 'mit  ' : 'ohne ') + s.datei + ':' + s.zeile + '  ' + s.text.slice(0, 100));
}
