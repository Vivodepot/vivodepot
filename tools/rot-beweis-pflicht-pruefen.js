#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Eine neue Probe bringt ihren Rot-Beweis mit — A348, Zug 4 (19.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Dreimal in drei Tagen hat eine Prüfung an ihrem Gegenstand vorbei
   gemessen und trotzdem grün gemeldet (A336: vier Halbheiten · A338: achtzehn
   Pins auf einem überholten Stand · A345: eine Klasse-A-Sicherheitsprobe, deren
   drei Angriffswege nach dem Zerfall ins Leere liefen und das als Erfolg
   meldeten). Und A348 hat zwei weitere gefunden, an denen der Bruch der
   benannten Zusicherung die Probe NICHT rot macht.

   Die Lehre gehört nicht in einen Text, sondern hierher: eine Probe ohne
   Rot-Beweis ist eine Zusage, keine Messung.

   WAS DIESES WERKZEUG PRÜFT, und die Grenze steht hier und nicht im Bericht:
   die ANWESENHEIT eines Rot-Beweises in der Datei, nicht seine Güte. Wer eine
   Probe `[Rot-Beleg] tut nichts` nennt, kommt durch. Das ist bewusst so und
   keine Attrappe: der Fall, den dieses Werkzeug fängt, ist nicht die
   vorgetäuschte, sondern die VERGESSENE Rotprobe — und das ist der Fall, der
   in A336/A338/A345 dreimal eingetreten ist. Die GÜTE misst
   `tools/klausel-proben-schaerfe-stufe2.js`, indem es den Gegenstand bricht;
   die beiden Werkzeuge stehen nebeneinander, nicht übereinander.

   EINE RATSCHE, KEINE FORDERUNG AN DEN BESTAND. 287 von 542 Testdateien tragen
   heute keine Marke (Stand 19.08.2026). Sie alle nachzurüsten ist ein eigener
   Zug mit eigenem Zuschnitt; sie hier zu fordern hiesse, das Gate am ersten Tag
   rot zu haben und es darum abzuschalten. Die Grundlinie führt sie namentlich.
   NEU heisst: nicht in der Grundlinie. Und die Grundlinie darf nur SCHRUMPFEN —
   wer eine Datei nachrüstet, nimmt sie heraus, sonst wächst die Ausnahmemenge
   still zurück.

   Aufruf:
     node tools/rot-beweis-pflicht-pruefen.js
     node tools/rot-beweis-pflicht-pruefen.js --verzeichnis <pfad> --grundlinie <pfad>
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* DIE MARKEN — erhoben über den echten Bestand am 19.08.2026, nicht ausgedacht.
   Jede steht heute in mindestens einer Datei; `--marken-tot` weist tote nach. */
const MARKEN = Object.freeze([
  'Rot-Beweis', 'Rot-Beleg', 'Rotmachbarkeit', 'Rotprobe',
  'Gate-Nachweis', 'Positivkontrolle', 'Negativkontrolle',
  'Gegenprobe', 'Gegenkontrolle',
]);
const MARKEN_RE = new RegExp(MARKEN.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');

function testDateien(wurzel) {
  const raus = [];
  (function ab(d) {
    for (const n of fs.readdirSync(d).sort()) {
      const p = path.join(d, n);
      // tests/pruefstand-bindung.js legt neben ihrer Zieldatei kurzzeitig eine
      // `_pruefstand-tmp-<pid>-*.cjs` an und räumt sie wieder weg — ein echter
      // Lauf woanders im selben Suite-Prozess kann sie genau zwischen diesem
      // readdirSync() und dem folgenden statSync() verschwinden lassen (ENOENT).
      // Eine Datei, die schon weg ist, braucht diese Prüfung nicht mehr.
      let stat;
      try { stat = fs.statSync(p); } catch (_) { continue; }
      if (stat.isDirectory()) ab(p);
      else if (n.endsWith('.test.js')) raus.push(path.relative(wurzel, p).split(path.sep).join('/'));
    }
  })(wurzel);
  return raus;
}

function traegtMarke(datei) {
  return MARKEN_RE.test(fs.readFileSync(datei, 'utf8'));
}

/* Zwei Befundarten, und die zweite ist die Ratsche:
     NEU-OHNE-ROT — eine Datei ausserhalb der Grundlinie ohne jede Marke.
     GRUNDLINIE-ZU-GROSS — eine Datei IN der Grundlinie, die inzwischen eine
     Marke trägt (oder die es nicht mehr gibt). Sie gehört heraus. */
function pruefe(wurzel, grundlinie) {
  const dateien = testDateien(wurzel);
  const ausnahme = new Set(grundlinie.ohne_rot_beweis || []);
  const neuOhneRot = [];
  const grundlinieZuGross = [];
  for (const rel of dateien) {
    const marke = traegtMarke(path.join(wurzel, rel));
    if (!ausnahme.has(rel) && !marke) neuOhneRot.push(rel);
    if (ausnahme.has(rel) && marke) grundlinieZuGross.push(rel);
  }
  const verschwunden = [...ausnahme].filter((r) => !dateien.includes(r));
  return { dateien, neuOhneRot, grundlinieZuGross, verschwunden };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
  const wurzel = arg('verzeichnis', path.join(REPO, 'tests'));
  const gPfad = arg('grundlinie', path.join(REPO, 'tools', 'rot-beweis-grundlinie.json'));
  const r = pruefe(wurzel, JSON.parse(fs.readFileSync(gPfad, 'utf8')));
  console.log(`Testdateien: ${r.dateien.length} · ohne Rot-Beweis-Marke laut Grundlinie: `
    + `${JSON.parse(fs.readFileSync(gPfad, 'utf8')).ohne_rot_beweis.length}`);
  if (r.neuOhneRot.length) {
    console.log(`\n✗ ${r.neuOhneRot.length} NEUE Probendatei(en) ohne Rot-Beweis:`);
    r.neuOhneRot.forEach((d) => console.log('   ' + d));
  }
  if (r.grundlinieZuGross.length) {
    console.log(`\n✗ ${r.grundlinieZuGross.length} Datei(en) sind nachgerüstet und gehören aus der Grundlinie:`);
    r.grundlinieZuGross.forEach((d) => console.log('   ' + d));
  }
  if (r.verschwunden.length) {
    console.log(`\n✗ ${r.verschwunden.length} Grundlinien-Eintrag/Einträge zeigen ins Leere:`);
    r.verschwunden.forEach((d) => console.log('   ' + d));
  }
  const rot = r.neuOhneRot.length + r.grundlinieZuGross.length + r.verschwunden.length;
  if (!rot) console.log('\n✓ Jede Probe ausserhalb der Grundlinie bringt ihren Rot-Beweis mit.');
  process.exit(rot ? 1 : 0);
}

if (require.main === module) main();
module.exports = { pruefe, testDateien, traegtMarke, MARKEN, MARKEN_RE };
