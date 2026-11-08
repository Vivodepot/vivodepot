#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   xmeld-echt-pruefen.js — liest eine XMeld-Meldebescheinigung (Nachricht 1701, Fassung 26.11) durch den Leser des Kerns
   und vergleicht je Feld mit dem, was in der Datei steht (Befund XMELD-2611-NICHT-GELESEN, 06.11.2026).
   ────────────────────────────────────────────────────────────────────────────
   Was in der Datei steht, liest das Werkzeug unabhängig vom Kern: aus dem Block `personendaten` (nie `partner`) mit
   einfachen Mustern, je Feld genau ein Pfad der Fassung 26.11. Je Feld eine Zeile:
     gelesen        Kern und Datei sagen dasselbe
     nicht-gelesen  die Datei trägt einen Wert, der Kern liefert keinen oder einen anderen
     fehlt          die Datei trägt das Feld nicht (dann zählt es nicht gegen den Kern)
   Die Anschrift ist die der Hauptwohnung (DSMeld-Blatt 1213: 0 alleinige Wohnung, 1 Hauptwohnung).

   Aufruf:  node tools/xmeld-echt-pruefen.js [--dokument <1701.xml>] [--aus <datei.tsv>]
   Ohne --dokument läuft es gegen das erfundene Fixture tests/fixtures/xmeld-2611-meldebescheinigung.example.xml.
   Eine echte Referenznachricht der Testsuite bleibt außerhalb des Repos und kommt nur als Argument.
   Exit 0, wenn kein Feld „nicht-gelesen“ ist; 1 sonst; 2 bei Aufruffehler. Probe: tests/xmeld-2611.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'xmeld-2611-meldebescheinigung.example.xml');
const FELDER = Object.freeze(['vorname', 'nachname', 'geburtsname', 'geburtsdatum', 'staatsangehoerigkeit', 'familienstand', 'anschrift']);
const FAMILIENSTAND = Object.freeze({ LD: 'ledig', VH: 'verheiratet', VW: 'verwitwet', GS: 'geschieden', LP: 'eingetragene Lebenspartnerschaft' });

// Der Text eines Elements ohne Präfix-Rücksicht: <x:name>…</x:name> oder <name>…</name>.
function block(text, name) {
  const m = new RegExp('<(?:\\w+:)?' + name.replace(/\./g, '\\.') + '(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?' + name.replace(/\./g, '\\.') + '>').exec(text || '');
  return m ? m[1] : '';
}
function bloecke(text, name) {
  const re = new RegExp('<(?:\\w+:)?' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?' + name + '>', 'g');
  return [...String(text || '').matchAll(re)].map((m) => m[1]);
}
const blatt = (text) => String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Was die Datei sagt — unabhängig vom Leser des Kerns.
function ausDatei(xml) {
  const p = block(xml, 'personendaten');
  if (!p) return null;
  // Gleichnamige Verschachtelung (`vornamen` › `vornamen`, `familienstand` › `familienstand`): das Muster endet am inneren
  // Schluss, der Inhalt trägt dann das innere Element samt Wert — darum je Feld nur der Text bzw. der `code` darin.
  const wohnungen = bloecke(p, 'wohnung');
  const haupt = wohnungen.find((w) => /^[01]$/.test(blatt(block(block(w, 'statusderwohnung'), 'code'))));
  const ai = haupt ? block(haupt, 'anschrift.inland') : '';
  const anschrift = ai ? [block(ai, 'strasse'), block(ai, 'hausnummer'), block(ai, 'postleitzahl'), block(ai, 'wohnort')].map(blatt).join('|') : '';
  const fs_ = blatt(block(block(p, 'familienstand'), 'code'));
  return {
    vorname: blatt(block(p, 'vornamen')),
    nachname: blatt(block(block(p, 'familienname.unstrukturiert'), 'nachname')),
    geburtsname: blatt(block(p, 'geburtsname.unstrukturiert')),
    geburtsdatum: blatt(block(block(p, 'geburtsdatum'), 'jahrMonatTag')),
    staatsangehoerigkeit: blatt(block(block(p, 'staatsangehoerigkeit'), 'code')),
    familienstand: fs_ ? (FAMILIENSTAND[fs_] || fs_) : '',
    anschrift: anschrift.replace(/^\|+$/, ''),
  };
}

// Was der Kern liest.
function ausKern(V, xml) {
  const k = V.parseXMeld(xml);
  if (!k) return null;
  return {
    vorname: k.vorname || '', nachname: k.nachname || '', geburtsname: k.geburtsname || '', geburtsdatum: k.geburtsdatum || '',
    staatsangehoerigkeit: (k.nationalitaet || []).join(', '), familienstand: k.familienstand || '',
    anschrift: [k.strasse, k.hausnummer, k.plz, k.ort].map((x) => String(x || '').trim()).join('|').replace(/^\|+$/, ''),
  };
}

function vergleichen(datei, kern) {
  return FELDER.map((f) => {
    const soll = datei ? datei[f] : '';
    const ist = kern ? kern[f] : '';
    const stand = !soll ? 'fehlt' : (soll === ist ? 'gelesen' : 'nicht-gelesen');
    return { feld: f, stand, datei: soll, kern: ist };
  });
}

function pruefen(xml, V) {
  const datei = ausDatei(xml);
  const kern = ausKern(V, xml);
  return { erkannt: V.importFormatErkennen(xml, 'identitaet') === 'xmeld', personendaten: !!datei, zeilen: vergleichen(datei, kern) };
}

function alsTsv(e) {
  return ['feld\tstand\tdatei\tkern', ...e.zeilen.map((z) => [z.feld, z.stand, z.datei, z.kern].join('\t'))].join('\n') + '\n';
}

function argsLesen(argv) {
  const a = { dokument: null, aus: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dokument' && argv[i + 1]) a.dokument = argv[++i];
    else if (argv[i] === '--aus' && argv[i + 1]) a.aus = argv[++i];
    else return null;
  }
  return a;
}

function main(argv) {
  const a = argsLesen(argv);
  if (!a) { process.stderr.write('Aufruf: node tools/xmeld-echt-pruefen.js [--dokument <1701.xml>] [--aus <datei.tsv>]\n'); return 2; }
  const pfad = a.dokument || FIXTURE;
  if (!fs.existsSync(pfad)) { process.stderr.write('xmeld-echt-pruefen: Datei fehlt: ' + pfad + '\n'); return 2; }
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const e = pruefen(fs.readFileSync(pfad, 'utf8'), V);
  const tsv = alsTsv(e);
  if (a.aus) fs.writeFileSync(a.aus, tsv); else process.stdout.write(tsv);
  const nicht = e.zeilen.filter((z) => z.stand === 'nicht-gelesen').length;
  const gelesen = e.zeilen.filter((z) => z.stand === 'gelesen').length;
  process.stderr.write('xmeld-echt-pruefen: erkannt ' + (e.erkannt ? 'ja' : 'nein') + ', gelesen ' + gelesen + ', nicht gelesen ' + nicht
    + ', fehlt ' + e.zeilen.filter((z) => z.stand === 'fehlt').length + (a.dokument ? '' : ' (Fixture)') + '\n');
  return (nicht || !e.erkannt || !e.personendaten) ? 1 : 0;
}

module.exports = { ausDatei, ausKern, vergleichen, pruefen, alsTsv, FELDER };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
