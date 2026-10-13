'use strict';
/* Fixture für die Stellen-Achse (tools/wegwerf-verzeichnisse-pruefen.js): eine Spec räumt jede ihrer Temp-Stellen —
   direkt und über eine Liste, die eine Schleife abräumt. Das GUTE Beispiel; liegt außerhalb jedes testDir. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ANGELEGT = [];
function aufraeumen() { for (const d of ANGELEGT) fs.rmSync(d, { recursive: true, force: true }); }

function beispiel() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'wegwerf-fixtur-spec-gut-'));
  try { fs.writeFileSync(path.join(ordner, 'a.txt'), 'x'); } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
  const datei = path.join(os.tmpdir(), 'wegwerf-fixtur-spec-gut-' + process.pid + '.txt');
  fs.writeFileSync(datei, 'x');
  fs.unlinkSync(datei);
  const gesammelt = fs.mkdtempSync(path.join(os.tmpdir(), 'wegwerf-fixtur-spec-gut-'));
  ANGELEGT.push(gesammelt);
  aufraeumen();
}

module.exports = { beispiel };
