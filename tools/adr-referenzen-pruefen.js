#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ADR-Referenzen-Wächter — Posten 2, Auftrag ADR_Referenzen_und_Auflagen_Rubrik
   (03.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Anlass: vier Code-Kommentare beriefen sich auf ADR-Nummern für Entscheidungen,
   die dort nie getroffen wurden — teils ein Nachtrag, den es nicht gibt, teils
   eine schlicht falsche Nummer. Alle vier blieben über Wochen unbemerkt.

   WAS DER WÄCHTER TUT: sammelt jede Referenz der Form `U2-ADR-<Zahl>` oder
   `ADR-<Zahl>` in `vivodepot.html` und in `tools/` und prüft, ob eine ADR-Datei
   mit dieser Nummer unter `docs/adr/` existiert. Eine erfundene oder vertippte
   Nummer wird damit sofort rot.

   WAS ER AUSDRÜCKLICH NICHT KANN: prüfen, ob ein zitierter „Nachtrag" oder
   Abschnitt in der ADR tatsächlich vorkommt — das ist keine Nummernfrage,
   sondern eine Textfrage, und dafür bräuchte es Verständnis des ADR-Inhalts.
   Drei der vier ursprünglichen Funde waren genau dieser Art (eine gültige
   Nummer, ein erfundener Nachtrag) und wären hier NICHT gefangen worden — nur
   der vierte (ADR-096 statt ADR-100) war ein Nummernfehler. Diese Grenze ist
   bewusst gezogen, nicht vergessen: die Nachtrag-Frage bleibt menschliche
   Sorgfalt (siehe Auftrag, Posten 2).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ADR_ORDNER = path.join(REPO, 'docs', 'adr');
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH)
  : path.join(REPO, 'vivodepot.html');
const TOOLS_ORDNER = process.env.ADR_TOOLS_PATH
  ? path.resolve(process.env.ADR_TOOLS_PATH)
  : path.join(REPO, 'tools');

// Ein Match deckt „U2-ADR-100" und „ADR-100" gleichermaßen ab — das optionale
// `U2-`-Präfix im selben Ausdruck verhindert, dass „U2-ADR-100" zweimal zählt
// (einmal als U2-ADR-Treffer, einmal als der darin enthaltene ADR-Treffer).
const MUSTER = /\b(?:U2-)?ADR-(\d+)\b/g;

function adrNummernAusDateinamen() {
  const nummern = new Set();
  for (const name of fs.readdirSync(ADR_ORDNER)) {
    const m = /^vivodepot-U2-ADR-(\d+)-/.exec(name);
    if (m) nummern.add(Number(m[1]));
  }
  return nummern;
}

function dateienRekursiv(ordner) {
  const raus = [];
  for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
    const voll = path.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) raus.push(...dateienRekursiv(voll));
    else if (/\.(js|mjs|json|md|py)$/.test(eintrag.name)) raus.push(voll);
  }
  return raus;
}

// { referenzen: [{datei, zeile, text, nummer}], unbekannt: [...gleiche Form...] }
function pruefeQuellen(dateien, bekannteNummern) {
  const referenzen = [];
  const unbekannt = [];
  for (const datei of dateien) {
    const inhalt = fs.readFileSync(datei, 'utf8');
    const zeilen = inhalt.split('\n');
    for (let i = 0; i < zeilen.length; i++) {
      MUSTER.lastIndex = 0;
      let m;
      while ((m = MUSTER.exec(zeilen[i]))) {
        const eintrag = { datei: path.relative(REPO, datei), zeile: i + 1, text: m[0], nummer: Number(m[1]) };
        referenzen.push(eintrag);
        if (!bekannteNummern.has(eintrag.nummer)) unbekannt.push(eintrag);
      }
    }
  }
  return { referenzen, unbekannt };
}

function quelldateien() {
  return [HTML_PFAD, ...dateienRekursiv(TOOLS_ORDNER)];
}

function main() {
  const argv = process.argv.slice(2);
  const bekannteNummern = adrNummernAusDateinamen();
  const { referenzen, unbekannt } = pruefeQuellen(quelldateien(), bekannteNummern);

  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ geprueft: referenzen.length, unbekannt }, null, 1) + '\n');
    return;
  }

  if (argv.includes('--gate')) {
    if (unbekannt.length === 0) {
      console.log('GATE grün — ' + referenzen.length + ' ADR-Referenzen geprüft, jede nennt eine '
        + 'existierende ADR-Nummer unter docs/adr/.');
      return;
    }
    console.error('GATE ROT — ADR-Referenz ohne passende Datei unter docs/adr/:');
    for (const u of unbekannt) console.error('    ' + u.datei + ':' + u.zeile + ' „' + u.text + '"');
    console.error('Erfundene/vertippte Nummer richtigstellen, oder — falls die ADR fehlt — zuerst anlegen.');
    process.exit(1);
  }

  console.log(referenzen.length + ' ADR-Referenzen geprüft gegen ' + bekannteNummern.size
    + ' existierende ADR-Nummern.');
  if (unbekannt.length) {
    console.log(unbekannt.length + ' ohne passende Datei:');
    for (const u of unbekannt) console.log('  ' + u.datei + ':' + u.zeile + ' „' + u.text + '"');
  } else {
    console.log('Keine unbekannte Referenz.');
  }
}

if (require.main === module) main();
module.exports = { adrNummernAusDateinamen, pruefeQuellen, quelldateien, MUSTER, ADR_ORDNER };
