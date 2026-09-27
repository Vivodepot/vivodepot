#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════
   ADR-Fristen-Ratsche — liest die FRIST offener Konformitäts-Klauseln, nicht ihre Existenz (22.09.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────
   Anlass: U2-ADR-430 trug an elf offenen Klauseln den Satz „Datum gesetzt, um den Wächter rot werden zu lassen und eine
   Nachschau zu erzwingen". Diesen Wächter gab es nicht: keine Stelle in tools/ oder tests/ wertete `frist:` aus, auch U2-ADR-098s
   „Pflicht bei zustand: offen" wurde nicht geprüft. Gemessen am selben Tag: 19 offene Klauseln, eine ohne Frist, zwei mit
   Frist 2026-09-20, seit dem Vortag abgelaufen und nirgends rot. Ein Test, der nur zählte, wie viele Klauseln ein `frist:`-Feld
   tragen, wäre derselbe Fehler eine Ebene höher — darum vergleicht diese Prüfung das DATUM mit dem Tag der Prüfung.

   DIE FORM (22.09.2026, „weder Tor noch Bericht"): eine Ratsche. Rot ist die Prüfung NUR, wenn eine offene Klausel
   abgelaufen ist oder keine gültige Frist trägt UND nicht von einer Zeile der Grundlinie gedeckt ist (tools/adr-fristen-grundlinie.json).
   Es gibt genau zwei Wege, das Rot loszuwerden, beide sind eine bewusste Handlung und stehen danach geschrieben:
     (1) die Klausel schließen (zustand ändern) oder ihre Frist im ADR selbst auf ein neues Datum setzen, oder
     (2) eine Zeile in die Grundlinie schreiben: adr, aussage (Anfang), art (abgelaufen | ohne-frist), grund (mind. 40 Zeichen),
         erstmals (die ERSTE Frist, bleibt für immer stehen), neueFrist (ein Datum in der Zukunft), verlaengert (Zahl der bisherigen
         Verlängerungen, steigt bei jeder neuen Zeile) — und `deckel` um eins heben. Die Zahl der Zeilen ist exakt festgehalten.
         Die Zeilenzahl allein misst das Falsche: dieselbe Klausel ließe sich ewig verlängern, ohne dass die Zahl stiege. Darum trägt
         die Zeile `erstmals` und `verlaengert`; `erstmals` wird gegen die Frist im ADR geprüft (bei art abgelaufen muss sie gleich
         sein), sie kann also nicht still nachgezogen werden. `verlaengert` selbst zu ratschen ist ein späterer Schritt.
   Eine Zeile deckt nur bis zu ihrer `neueFrist`; danach ist die Klausel wieder ungedeckt, und das Rot trifft den, der als Nächstes
   committet — nicht alle zugleich und nicht für immer. Eine Zeile, deren Klausel nicht mehr abgelaufen ist (geschlossen, Frist im ADR
   verschoben), ist zu streichen: die Grundlinie kann so nicht als stiller Sockel liegenbleiben.

   Der billigste Weg an dieser Prüfung vorbei wäre, KEINE Frist zu setzen. Darum ist auch `zustand: offen` OHNE gültiges `frist:` rot
   (art ohne-frist), gedeckt nur durch eine Zeile mit Grund und neueFrist. Die Pflicht stand bisher als Kommentar in der Vorlage
   (U2-ADR-098: „# Pflicht bei zustand: offen"); ein Kommentar ist keine Bindung.

   Die Verteilung der Fristen wird IMMER mit ausgegeben („11 Klauseln fällig am 2026-11-30"): wo viele Klauseln dasselbe Datum tragen,
   gehen sie am selben Morgen zugleich rot — das soll im Oktober auffallen und nicht am Morgen selbst.

   ACHTUNG BEIM SUCHEN: `frist:` kommt in tests/adr-konformitaet-pruefen.test.js vor (Zeilen 35, 36, 95, 102) — in FIXTURES, als Teil
   eines Beispieltexts. Das ist keine Deckung: tools/adr-konformitaet-pruefen.js liest zustand, aussage, herkunft und pruefung, nicht
   `frist`, und `offen` steht in OHNE_PRUEFUNG, ist also von der Probenpflicht ausdrücklich befreit.

   Die Prüfung läuft auch dort, wo ihr Gegenstand fehlt: findet sie in `--adr-ordner` KEINE Klausel, ist das ein Fehler
   (Positivkontrolle), kein leeres Grün.

   Aufruf:  node tools/adr-fristen-pruefen.js [--adr-ordner <pfad>] [--grundlinie <datei>] [--heute JJJJ-MM-TT] [--bericht]
     ohne Argumente: echter Bestand docs/adr, echte Grundlinie, heutiges Datum (UTC). Exit 0 grün, 1 rot.
     --bericht: druckt zusätzlich, welche Klauseln in den nächsten 30 Tagen ablaufen (kein Fehler, nur Vorschau).
   ═══════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const GRUNDLINIE_STANDARD = path.join(__dirname, 'adr-fristen-grundlinie.json');
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const GRUND_MINDESTLAENGE = 40;

function argWert(name, argv) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; }

/* `--adr-ordner` gilt für den Klausel-Leser des Konformitäts-Wächters; der liest den Ordner beim Laden. */
function konformitaet(argv) {
  const ordner = argWert('--adr-ordner', argv);
  if (ordner) process.env.ADR_ORDNER_PATH = ordner;
  return require('./adr-konformitaet-pruefen.js');
}

function gueltigesDatum(s) {
  if (typeof s !== 'string' || !DATUM.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Präfix MIT erfasst (U2-/B16- nummerieren unabhängig ab 1, ADR-Präfix-Ratsche) — eine frühere
// Fassung schnitt nur die Nummer heraus und baute die Anzeige mit einem bloßen 'ADR-' wieder
// zusammen; ADR-Präfix-Ratsche-pruefen.js hätte das an jeder ECHTEN Ausgabe erkannt, es traf hier
// nur zufällig keine (22.09.2026, Fund beim eigenen Push, s. adr-fristen-pruefen.test.js).
function adrNummer(datei) {
  const m = /((?:U2|B16)-ADR-[A-Za-z0-9]+)-/.exec(datei);
  return m ? m[1] : datei;
}
/* Der Anfang der Aussage, einzeilig — der Schlüssel der Klausel neben der ADR-Nummer (Zeilennummern verschieben sich). */
function aussageAnfang(blockText, lesen) {
  const zeilen = blockText.split('\n');
  const i = zeilen.findIndex((z) => /^\s*(?:-\s*)?aussage:/.test(z));
  if (i < 0) return '';
  let t = zeilen[i].replace(/^\s*(?:-\s*)?aussage:\s*/, '');
  for (let j = i + 1; j < zeilen.length && t.length < 80; j++) {
    if (/^\s*(?:-\s*)?[a-zäöü]+:/.test(zeilen[j]) || !zeilen[j].trim()) break;
    t += ' ' + zeilen[j].trim();
  }
  return t.replace(/\s+/g, ' ').trim().slice(0, 60);
}

/* Alle OFFENEN Klauseln mit Frist (oder ohne). Liefert { klauseln, klauselnGesamt }. */
function fristenErheben(K) {
  const klauseln = [];
  let gesamt = 0;
  for (const datei of K.alleAdrDateien()) {
    for (const b of K.bloeckeAusDatei(datei)) {
      if (K.istBeispielBlock && K.istBeispielBlock(b)) continue;
      gesamt += 1;
      if (K.zeilenwert(b.text, 'zustand') !== 'offen') continue;
      const frist = K.zeilenwert(b.text, 'frist');
      klauseln.push({ adr: adrNummer(datei), datei, zeile: b.zeile, aussage: aussageAnfang(b.text), frist: frist || null });
    }
  }
  return { klauseln, klauselnGesamt: gesamt };
}

/* REIN. `heute` als 'JJJJ-MM-TT'. Liefert { fehler, gedeckt, ablaufend }. */
function fristenPruefen(erhebung, grundlinie, heute) {
  const fehler = [];
  const gedeckt = [];
  const ablaufend = [];
  if (!gueltigesDatum(heute)) return { fehler: ['heute ist kein Datum: ' + heute], gedeckt, ablaufend };
  if (!erhebung.klauselnGesamt) fehler.push('keine einzige Konformitäts-Klausel gefunden — die Prüfung hätte nichts geprüft (Positivkontrolle)');
  const zeilen = (grundlinie && Array.isArray(grundlinie.zeilen)) ? grundlinie.zeilen : [];
  if (!grundlinie || !Number.isInteger(grundlinie.deckel)) fehler.push('Grundlinie ohne ganzzahligen `deckel`');
  else if (grundlinie.deckel !== zeilen.length) {
    fehler.push('deckel ' + grundlinie.deckel + ' passt nicht zu ' + zeilen.length + ' Zeilen — exakt, kein Puffer: '
      + (zeilen.length > grundlinie.deckel ? 'eine neue Zeile hebt `deckel` bewusst mit an' : '`deckel` senken, wenn eine Zeile gestrichen wurde'));
  }
  const schluessel = (adr, aussage) => adr + '#' + aussage;
  const istZeile = new Map();
  for (const z of zeilen) {
    if (!z || !z.adr || !z.aussage) { fehler.push('Zeile der Grundlinie ohne adr oder aussage'); continue; }
    if (z.art !== 'abgelaufen' && z.art !== 'ohne-frist') fehler.push(z.adr + ': `art` ist "' + z.art + '", erlaubt sind abgelaufen und ohne-frist');
    if (typeof z.grund !== 'string' || z.grund.trim().length < GRUND_MINDESTLAENGE) fehler.push(z.adr + ' "' + z.aussage + '": kein Grund (mindestens ' + GRUND_MINDESTLAENGE + ' Zeichen)');
    if (!gueltigesDatum(z.neueFrist)) fehler.push(z.adr + ' "' + z.aussage + '": `neueFrist` ist kein Datum (JJJJ-MM-TT)');
    if (!gueltigesDatum(z.erstmals)) fehler.push(z.adr + ' "' + z.aussage + '": `erstmals` ist kein Datum (JJJJ-MM-TT) — die erste Frist, sie bleibt für immer stehen');
    else if (gueltigesDatum(z.neueFrist) && z.erstmals > z.neueFrist) fehler.push(z.adr + ' "' + z.aussage + '": `erstmals` (' + z.erstmals + ') liegt nach `neueFrist` (' + z.neueFrist + ')');
    if (!Number.isInteger(z.verlaengert) || z.verlaengert < 0) fehler.push(z.adr + ' "' + z.aussage + '": `verlaengert` ist keine Zahl ≥ 0 (Zahl der bisherigen Verlängerungen)');
    istZeile.set(schluessel(z.adr, z.aussage), z);
  }
  const benutzt = new Set();
  for (const k of erhebung.klauseln) {
    const eigen = k.frist === null ? 'ohne-frist' : (!gueltigesDatum(k.frist) ? 'ohne-frist' : (k.frist < heute ? 'abgelaufen' : 'ok'));
    const bezeichnung = k.adr + ' (' + k.datei + ':' + k.zeile + ') "' + k.aussage + '"';
    if (eigen === 'ok') {
      const tage = (new Date(k.frist + 'T00:00:00Z') - new Date(heute + 'T00:00:00Z')) / 86400000;
      if (tage <= 30) ablaufend.push(bezeichnung + ' läuft am ' + k.frist + ' ab');
      continue;
    }
    const zeile = istZeile.get(schluessel(k.adr, k.aussage));
    const grundText = eigen === 'abgelaufen' ? 'Frist ' + k.frist + ' ist abgelaufen' : 'keine gültige Frist (U2-ADR-098: Pflicht bei zustand: offen; gefunden: ' + (k.frist === null ? 'keine' : '"' + k.frist + '"') + ')';
    const ausweg = ' — Weg: die Klausel schließen oder die Frist im ADR neu setzen, ODER eine Zeile in tools/adr-fristen-grundlinie.json'
      + ' (adr, aussage, art, grund, neueFrist) und `deckel` heben.';
    if (!zeile) { fehler.push(bezeichnung + ': ' + grundText + ', ungedeckt' + ausweg); continue; }
    benutzt.add(schluessel(k.adr, k.aussage));
    if (zeile.art !== eigen) { fehler.push(bezeichnung + ': die Grundlinie führt sie als "' + zeile.art + '", gemessen ist "' + eigen + '"'); continue; }
    if (eigen === 'abgelaufen' && zeile.erstmals !== k.frist) {
      fehler.push(bezeichnung + ': `erstmals` (' + zeile.erstmals + ') ist nicht die Frist im ADR (' + k.frist + ') — die erste Frist wird nicht nachgezogen; die Verlängerung steht in `neueFrist`, gezählt in `verlaengert`.');
      continue;
    }
    if (gueltigesDatum(zeile.neueFrist) && zeile.neueFrist < heute) {
      fehler.push(bezeichnung + ': ' + grundText + '; die Deckung in der Grundlinie lief am ' + zeile.neueFrist + ' ab — neue Nachschau: schließen, oder `neueFrist` mit neuem Grund setzen.');
      continue;
    }
    gedeckt.push(bezeichnung + ': ' + grundText + ', gedeckt bis ' + zeile.neueFrist + ' (erstmals ' + zeile.erstmals + ', ' + zeile.verlaengert + 'x verlängert)');
  }
  for (const [s, z] of istZeile) {
    if (!benutzt.has(s)) fehler.push('Zeile der Grundlinie ohne abgelaufene oder frist-lose offene Klausel: ' + z.adr + ' "' + z.aussage + '" — geschlossen oder Frist verschoben: Zeile streichen, `deckel` senken.');
  }
  return { fehler, gedeckt, ablaufend };
}

/* REIN. Wie viele offene Klauseln tragen welches Datum — sortiert; Häufungen (ab drei) sind gekennzeichnet. */
function fristVerteilung(klauseln) {
  const je = new Map();
  for (const k of klauseln) { const d = gueltigesDatum(k.frist) ? k.frist : '(ohne gültige Frist)'; je.set(d, (je.get(d) || 0) + 1); }
  return [...je.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([datum, n]) => ({ datum, n, haeufung: n >= 3 }));
}

function heuteUtc() { return new Date().toISOString().slice(0, 10); }

function main(argv) {
  const K = konformitaet(argv);
  const heute = argWert('--heute', argv) || heuteUtc();
  const gl = argWert('--grundlinie', argv) || GRUNDLINIE_STANDARD;
  let grundlinie = null;
  try { grundlinie = JSON.parse(fs.readFileSync(gl, 'utf8')); } catch (e) { process.stderr.write('adr-fristen: Grundlinie nicht lesbar (' + gl + '): ' + e.message + '\n'); return 1; }
  const erhebung = fristenErheben(K);
  const r = fristenPruefen(erhebung, grundlinie, heute);
  process.stdout.write('[adr-fristen] ' + erhebung.klauselnGesamt + ' Klauseln, davon ' + erhebung.klauseln.length + ' offen; heute ' + heute
    + '; Grundlinie ' + ((grundlinie.zeilen || []).length) + ' Zeile(n), gedeckt ' + r.gedeckt.length + '.\n');
  for (const g of r.gedeckt) process.stdout.write('  gedeckt: ' + g + '\n');
  for (const v of fristVerteilung(erhebung.klauseln)) {
    const wann = v.datum.startsWith('(') ? v.datum.slice(1, -1) : 'fällig am ' + v.datum;
    process.stdout.write('  ' + v.n + ' Klausel' + (v.n === 1 ? '' : 'n') + ' ' + wann + (v.haeufung ? '  ← HÄUFUNG: sie gehen am selben Morgen zugleich rot' : '') + '\n');
  }
  if (argv.includes('--bericht')) for (const a of r.ablaufend) process.stdout.write('  bald: ' + a + '\n');
  if (r.fehler.length) {
    process.stderr.write('[adr-fristen] ROT — ' + r.fehler.length + ' Befund(e):\n' + r.fehler.map((f) => '  - ' + f).join('\n') + '\n');
    return 1;
  }
  process.stdout.write('[adr-fristen] OK — keine offene Klausel ist ungedeckt abgelaufen.\n');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { fristenErheben, fristenPruefen, fristVerteilung, gueltigesDatum, aussageAnfang, adrNummer, GRUNDLINIE_STANDARD, GRUND_MINDESTLAENGE };
