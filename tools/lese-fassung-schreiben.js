#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   lese-fassung-schreiben.js — die Fassung der Lese-App aus dem Kern (22.11.2026)
   ─────────────────────────────────────────────────────────────────
   Die Lese-App nannte ihre Fassung nirgends. Wer bei einer Rückfrage sagen sollte, welche er hat, konnte es nicht. Die Lese-App
   wird mit dem Kern ausgeliefert, also trägt sie dessen Fassung: der öffentliche Name ist BUILD_VERSION und die Nummer aus
   SCHALEN_STAND (wie die Tags des öffentlichen Stands, v1.0.1070), dazu BUILD_DATUM. Dieses Werkzeug liest die drei Konstanten
   aus vivodepot.html und schreibt die Region LESE-FASSUNG in vivodepot-lesen.html. landung-vorbereiten fährt es in Phase 1
   (REGENERIER_SCHRITTE), so zieht der Zugkopf die Region mit SCHALEN_STAND nach.
     node tools/lese-fassung-schreiben.js               schreibt
     node tools/lese-fassung-schreiben.js --check       prüft, schreibt nichts; Exit 1 bei Abweichung
     --depot <pfad>                                     Wurzel der beiden Dateien (Standard: das Repo)
   Probe: tests/lese-app-benutzbarkeit-launch.test.js (M-2)
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const BEGIN = '/* LESE-FASSUNG:BEGIN — generierter Bereich (tools/lese-fassung-schreiben.js); Quelle: vivodepot.html BUILD_VERSION, SCHALEN_STAND, BUILD_DATUM */';
const END = '/* LESE-FASSUNG:END */';
const ANKER = 'function herkunftsortHTML() {';

function konstante(kern, name) {
  const m = new RegExp("^const " + name + " = '([^']+)';", 'm').exec(kern);
  if (!m) throw new Error('[lese-fassung] ' + name + ' nicht gefunden in vivodepot.html');
  return m[1];
}

/* Aus dem Kerntext die Fassung, wie die Lese-App sie zeigt. */
function fassungAusKern(kern) {
  const version = konstante(kern, 'BUILD_VERSION');
  const stand = konstante(kern, 'SCHALEN_STAND');
  const datum = konstante(kern, 'BUILD_DATUM');
  const nummer = /^v(\d+)$/.exec(stand);
  if (!nummer) throw new Error('[lese-fassung] SCHALEN_STAND hat nicht die Form vNNNN: ' + stand);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error('[lese-fassung] BUILD_DATUM hat nicht die Form JJJJ-MM-TT: ' + datum);
  return { name: version + '.' + nummer[1], datum };
}

function blockErzeugen(f) {
  return BEGIN + '\nconst LESE_FASSUNG = Object.freeze({ name: ' + JSON.stringify(f.name) + ', datum: ' + JSON.stringify(f.datum) + ' });\n' + END;
}

function blockFinden(text) {
  const a = text.indexOf(BEGIN);
  if (a < 0) return null;
  const e = text.indexOf(END, a);
  if (e < 0) throw new Error('[lese-fassung] LESE-FASSUNG:BEGIN ohne END');
  return { start: a, ende: e + END.length, text: text.slice(a, e + END.length) };
}

function einsetzen(text, block) {
  const b = blockFinden(text);
  if (b) return text.slice(0, b.start) + block + text.slice(b.ende);
  const i = text.indexOf(ANKER);
  if (i < 0) throw new Error('[lese-fassung] Anker fehlt in vivodepot-lesen.html: ' + ANKER);
  return text.slice(0, i) + block + '\n' + text.slice(i);
}

function main(argv) {
  const pruefen = argv.includes('--check');
  const i = argv.indexOf('--depot');
  const depot = i >= 0 ? path.resolve(argv[i + 1]) : REPO;
  const kern = fs.readFileSync(path.join(depot, 'vivodepot.html'), 'utf8');
  const pfad = path.join(depot, 'vivodepot-lesen.html');
  const text = fs.readFileSync(pfad, 'utf8');
  const block = blockErzeugen(fassungAusKern(kern));
  const b = blockFinden(text);
  if (b && b.text === block) { process.stdout.write('[lese-fassung] vivodepot-lesen.html: gleich\n'); return 0; }
  if (pruefen) {
    process.stdout.write('[lese-fassung] vivodepot-lesen.html: ' + (b ? 'ABWEICHUNG vom Kern' : 'Region FEHLT') + ' — node tools/lese-fassung-schreiben.js\n');
    return 1;
  }
  fs.writeFileSync(pfad, einsetzen(text, block), 'utf8');
  process.stdout.write('[lese-fassung] vivodepot-lesen.html: ' + (b ? 'erneuert' : 'eingesetzt') + '\n');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { BEGIN, END, ANKER, fassungAusKern, blockErzeugen, blockFinden, einsetzen, main };
