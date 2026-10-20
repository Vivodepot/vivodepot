#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rechtsraum-zusammenstellung-leser-pruefen.js — die Leser von `_rechtsraumDerZusammenstellung()` (U2-ADR-504 § 3, R1 09.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   `_rechtsraumDerZusammenstellung()` liefert die Kennung des Rechtsraums der Zusammenstellung oder '' — ohne Rückfall. Jeder
   Leser muss '' ausdrücklich behandeln. Bis zum Wagen „Rechtsraum-Wahl“ (Abbruch bzw. Frage am Instrument) sichert diese
   Positivliste das ab (Gegenlesung, 04.10.2026, befristet): jeder Leser steht hier mit dem, was er bei '' tut. Ein Aufruf
   in einer Funktion, die hier nicht steht, ist rot. Ein Eintrag, der keinen Aufruf mehr hat, ist ebenfalls rot (die Liste
   schrumpft mit, statt still zu veralten).

   ENTFALL: Mit dem Wagen Rechtsraum-Wahl wird diese Liste durch Abbruch bzw. Frage am Instrument ersetzt; die offene
   Abnahmezeile dazu steht im Ratschen-Eintrag RECHTSRAUM-NICHT-WAEHLBAR.

   ERWEITERN: ein neuer Leser kommt als EIN Eintrag in LESER hinzu ({ funktion, beiLeer }), mit der Probe, die sein Verhalten
   bei '' hält (Feld `probe`). Sonst nichts.

   Aufruf:  node tools/rechtsraum-zusammenstellung-leser-pruefen.js [--kern <pfad>]   (Vorgabe: vivodepot.html des Repos)
   Probe:   die Kern-Probe des Wagens R1, Testtitel „[R1·Leser]“ und „[R1·Leser·Rot-Beweis]“
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ohneKommentare } = require('./lib/html-senken.js');

const REPO = path.join(__dirname, '..');
const FUNKTION = '_rechtsraumDerZusammenstellung';

/* Die Probe, die das Verhalten bei '' hält, beim Testtitel genannt (die Probe-Datei bleibt im öffentlichen Zuschnitt drinnen). */
const PROBE = 'Kern-Probe R1: „[R1·Zusammenstellung]“, „[R1·Formate]“, „[R1·Fuß]“, „[R1·Leser]“';

const LESER = Object.freeze([
  Object.freeze({
    funktion: '_rechtsraumVorschlagswert',
    beiLeer: "liefert '': ein neues Instrument bleibt ungestempelt, ein rechtsraumgebundenes Format wird nicht angeboten.",
    probe: PROBE,
  }),
  Object.freeze({
    funktion: '_rechtsraumModulDerZusammenstellung',
    beiLeer: 'liefert null: kein Rechtsraum-Satz im Dokument-Fuß, XÖV/FIM nicht angeboten.',
    probe: PROBE,
  }),
  Object.freeze({
    funktion: '_rechtsraumKatalogDerZusammenstellung',
    beiLeer: 'liefert undefined (Unbekannt-Skip): PV/KI ohne Paragraf, Testament mit der Standard-Auswahlform.',
    probe: PROBE,
  }),
  Object.freeze({
    funktion: 'notvertretungAblaufText',
    beiLeer: "Zeile ohne eigenen Rechtsraum: kein Katalogwert, also kein Ablauf-Hinweis ('').",
    probe: PROBE,
  }),
  Object.freeze({
    funktion: 'depotNormalisieren',
    beiLeer: 'Altzeilen ohne Rechtsraum bleiben ungestempelt (kein angenommener Code).',
    probe: PROBE,
  }),
]);

/* Alle Funktionsdeklarationen mit ihrem Körperbereich; je Aufruf die INNERSTE umschließende. Kommentare zählen nicht. */
function funktionsBereiche(text) {
  const aus = [];
  const re = /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length, tiefe = 1;
    while (tiefe > 0 && i < text.length) { if (text[i] === '{') tiefe++; else if (text[i] === '}') tiefe--; i++; }
    aus.push({ name: m[1], von: m.index, bis: i });
  }
  return aus;
}

function leserFinden(quelltext) {
  const text = ohneKommentare(quelltext);
  const bereiche = funktionsBereiche(text);
  const leser = new Map();
  const aufruf = new RegExp('\\b' + FUNKTION + '\\s*\\(', 'g');
  let m;
  while ((m = aufruf.exec(text))) {
    const vorher = text.slice(Math.max(0, m.index - 9), m.index);
    if (/function\s*$/.test(vorher)) continue;   // die Deklaration selbst
    const umschliessend = bereiche.filter((b) => b.von < m.index && m.index < b.bis).sort((a, b) => (a.bis - a.von) - (b.bis - b.von))[0];
    const name = umschliessend ? umschliessend.name : '(oberste Ebene)';
    leser.set(name, (leser.get(name) || 0) + 1);
  }
  return leser;
}

function pruefen(quelltext, liste = LESER) {
  const gefunden = leserFinden(quelltext);
  const erlaubt = new Set(liste.map((l) => l.funktion));
  const unbekannt = [...gefunden.keys()].filter((n) => !erlaubt.has(n));
  const verwaist = liste.map((l) => l.funktion).filter((n) => !gefunden.has(n));
  const ohneBeiLeer = liste.filter((l) => !(typeof l.beiLeer === 'string' && l.beiLeer.trim())).map((l) => l.funktion);
  return { gefunden: Object.fromEntries(gefunden), unbekannt, verwaist, ohneBeiLeer, ok: !unbekannt.length && !verwaist.length && !ohneBeiLeer.length };
}

function main(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--kern');
  const pfad = i >= 0 ? path.resolve(argv[i + 1]) : path.join(REPO, 'vivodepot.html');
  const r = pruefen(fs.readFileSync(pfad, 'utf8'));
  for (const l of LESER) process.stdout.write('  ' + l.funktion + ': ' + l.beiLeer + '\n');
  if (r.unbekannt.length) process.stdout.write('ROT: Leser außerhalb der Positivliste: ' + r.unbekannt.join(', ') + '\n');
  if (r.verwaist.length) process.stdout.write('ROT: Eintrag ohne Aufruf: ' + r.verwaist.join(', ') + '\n');
  if (r.ohneBeiLeer.length) process.stdout.write('ROT: Eintrag ohne Verhalten bei \'\': ' + r.ohneBeiLeer.join(', ') + '\n');
  process.stdout.write(r.ok ? 'grün: jeder Leser von ' + FUNKTION + '() steht auf der Positivliste.\n' : '');
  return r.ok ? 0 : 1;
}

if (require.main === module) process.exit(main());
module.exports = { LESER, FUNKTION, leserFinden, pruefen, main };
