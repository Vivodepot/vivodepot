#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-feldtyp-spiegel — der Torwächter des Kerns spiegelt den Erzeuger
   ────────────────────────────────────────────────────────────────────────────
   DER FALL, GEGEN DEN ER STEHT (A376, 20.08.2026): `_TEMPLATE_FELDTYPEN` im
   Kern nannte SECHS Feldarten, der Erzeuger und das Einreich-Schema führten
   ZEHN. Der Kommentar daneben sagte „Erzeuger-Enum (submission-schema)" — der
   Spiegel spiegelte nicht. `validateTemplate` verwarf jedes Template mit einer
   der vier neuen Feldarten ALS GANZES.

   Gemessen: der 56-Feld-Anwaltssatz kam mit NULL Definitionen im Depot an. Der
   Erzeuger baut ihn ohne eine einzige Angleichung, Zertifikat und Signatur
   tragen, der Übersetzer übersetzt alle 56 — und der Torwächter davor wirft sie
   weg. Eine Kammer liefert an zweitausend Mitglieder aus, und niemand merkt,
   dass nichts ankommt.

   STRUKTURELL GESUCHT STATT GEPFLEGT, Bauart wie `tools/build-feldkatalog.js`.
   Eine Handkopie-Liste IN DIESEM WÄCHTER wäre dieselbe Fehlerklasse in Grün:
   sie kennt nur, was schon einmal gefunden wurde. Beide Seiten werden aus ihrem
   eigenen Quelltext gelesen — der Erzeuger über `FELDTYPEN`, der Kern über
   `_TEMPLATE_FELDTYPEN`, das Schema über sein `enum`.

   DREI SEITEN, NICHT ZWEI. Das Einreich-Schema ist die dritte, und es ist die,
   die eine Institution liest, bevor sie baut. Läuft es auseinander, verspricht
   der Vertrag etwas, das der Torwächter nicht annimmt.

   WAS ER NICHT PRÜFT: ob eine Feldart im Kern auch WIRKT (rendern, ausgeben) —
   das ist die feinere Frage, die W-18 (`schema-wirkung-pruefen.js`) für die
   Schema-Schlüssel stellt und die hier Proben am Gegenstand beantworten, kein
   Zähler.

   Aufruf:
     node tools/feldtyp-spiegel-pruefen.js
     node tools/feldtyp-spiegel-pruefen.js --gate
     node tools/feldtyp-spiegel-pruefen.js --kern <pfad>        (Rot-Beleg)
     node tools/feldtyp-spiegel-pruefen.js --generator <pfad>   (Rot-Beleg)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : s; };
const KERN = arg('kern', path.join(REPO, 'vivodepot.html'));
const GENERATOR = arg('generator', path.join(REPO, 'vivodepot-template-generator.html'));
const SCHEMA = arg('schema', path.join(REPO, 'docs', 'template-generator', 'submission-schema.json'));

/* Aus einer `new Set([...])`-Zeile die Zeichenketten lesen — der Gegenstand, nicht sein Name. */
function mengeAusQuelle(text, name) {
  const i = text.indexOf('const ' + name + ' = new Set([');
  if (i < 0) throw new Error(name + ' nicht gefunden');
  const auf = text.indexOf('[', i);
  const zu = text.indexOf(']', auf);
  if (auf < 0 || zu < 0) throw new Error(name + ': Klammer nicht gefunden');
  return [...text.slice(auf, zu).matchAll(/'([^']+)'/g)].map((m) => m[1]);
}
/* Der Erzeuger führt die Feldarten als Objekt-Liste `FELDTYPEN` mit `id`. Gelesen wird sie
   dort, wo sie steht — nicht über eine zweite Aufzählung. */
function typenAusErzeuger(text) {
  const i = text.indexOf('const FELDTYPEN = ');
  if (i < 0) throw new Error('FELDTYPEN nicht gefunden');
  const auf = text.indexOf('[', i);
  let tiefe = 0, ende = -1;
  for (let k = auf; k < text.length; k++) {
    if (text[k] === '[') tiefe++;
    else if (text[k] === ']') { tiefe--; if (tiefe === 0) { ende = k; break; } }
  }
  if (ende < 0) throw new Error('FELDTYPEN: Klammer nicht geschlossen');
  return [...text.slice(auf, ende).matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
}
function typenAusSchema(schemaPfad) {
  const d = JSON.parse(fs.readFileSync(schemaPfad, 'utf8'));
  return d.properties.templates.items.properties.felder.items.properties.feldtyp.enum.slice();
}

function pruefen() {
  const kern = mengeAusQuelle(fs.readFileSync(KERN, 'utf8'), '_TEMPLATE_FELDTYPEN');
  const erzeuger = typenAusErzeuger(fs.readFileSync(GENERATOR, 'utf8'));
  const schema = typenAusSchema(SCHEMA);
  const funde = [];
  const s = (a) => a.slice().sort().join(' ');
  if (s(kern) !== s(erzeuger)) {
    funde.push({ seiten: 'Kern ↔ Erzeuger',
      nurKern: kern.filter((x) => !erzeuger.includes(x)),
      nurAndere: erzeuger.filter((x) => !kern.includes(x)) });
  }
  if (s(schema) !== s(erzeuger)) {
    funde.push({ seiten: 'Schema ↔ Erzeuger',
      nurKern: schema.filter((x) => !erzeuger.includes(x)),
      nurAndere: erzeuger.filter((x) => !schema.includes(x)) });
  }
  return { kern, erzeuger, schema, funde };
}

function main() {
  let r;
  try { r = pruefen(); }
  catch (e) { console.error('feldtyp-spiegel: ' + e.message); process.exit(1); }
  if (!r.funde.length) {
    console.log('feldtyp-spiegel: kein Drift — ' + r.kern.length + ' Feldarten in Kern, Erzeuger und Schema.');
    console.log('  Suchraum: vivodepot.html (_TEMPLATE_FELDTYPEN) · vivodepot-template-generator.html '
      + '(FELDTYPEN) · docs/template-generator/submission-schema.json (feldtyp.enum)');
    return;
  }
  for (const f of r.funde) {
    console.error('feldtyp-spiegel: DRIFT — ' + f.seiten);
    if (f.nurAndere.length) console.error('  fehlt auf der ersten Seite: ' + f.nurAndere.join(', '));
    if (f.nurKern.length) console.error('  nur auf der ersten Seite: ' + f.nurKern.join(', '));
  }
  console.error('  Eine Feldart, die eine Seite kennt und die andere nicht, heisst: die Institution '
    + 'baut sie, und der Torwächter wirft die ganze Vorlage weg.');
  if (argv.includes('--gate')) process.exit(1);
}

if (require.main === module) main();
module.exports = { pruefen, mengeAusQuelle, typenAusErzeuger, typenAusSchema };
