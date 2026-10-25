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
   Probe:   die Kern-Probe des Wagens R1, Testtitel „[R1·Leser]“ und „[R1·Leser·Rot-Beweis]“; die Leser der Währung (WAEHRUNG_LESER, WAEHRUNG_DIREKT,
            U2-ADR-480): die Probe „Währung aus dem Template“
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

function leserFinden(quelltext, funktion = FUNKTION) {
  const text = ohneKommentare(quelltext);
  const bereiche = funktionsBereiche(text);
  const leser = new Map();
  const aufruf = new RegExp('\\b' + funktion + '\\s*\\(', 'g');
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

/* ── Die Leser der Währung (U2-ADR-480; Gegenlesung, 04.10.2026) ──────────────────────────────────────────────────────────────
   `textsatzWaehrung()` liefert einen ISO-4217-Code oder null. Heute liest sie niemand: kein Betrag zeigt eine Währung, kein
   Export schreibt ein Währungsfeld (`textsatzWaehrung` hat nur Proben als Aufrufer). Die Abnahme von WAEHRUNG-FEST-EUR
   („bei null sichtbar ‚Währung nicht festgelegt‘, kein Exportfeld“) wird darum zur Regel für jeden künftigen Leser:
     · jeder Aufruf von textsatzWaehrung() steht hier, je Funktion, mit `art` und seinem Verhalten bei null (`beiNull`);
     · art 'anzeige' (rendert einen Betrag): der Funktionskörper nennt STRINGS.waehrungNichtFestgelegt — die sichtbare
       Kennzeichnung bei null; ohne sie rot;
     · art 'export' (schreibt eine Ausgabe): `beiNull` erklärt, dass kein Währungsfeld geschrieben wird;
     · ein Eintrag ohne Aufruf ist rot (die Liste schrumpft mit).
   ERWEITERN: ein neuer Leser kommt als EIN Eintrag { funktion, art, beiNull, probe } hinzu. Probe: die Probe „Währung aus dem Template“ (U2-ADR-480).
   `probe` ist ein Testpfad oder, wo die Probe nicht hinausgeht, ihr Testtitel in eckigen Klammern. */
const WAEHRUNG_FUNKTION = 'textsatzWaehrung';
const WAEHRUNG_KENNZEICHNUNG = 'STRINGS.waehrungNichtFestgelegt';
const WAEHRUNG_LESER = Object.freeze([]);

/* Direkte Lesungen des Währungsfelds (Gegenlesung, 04.10.2026 — die Lücke: ein Leser kann `.waehrung` aus Datei, Format oder
   Template lesen, ohne textsatzWaehrung() aufzurufen). Gezählt wird jede Funktion, die `.waehrung`, `[…]['waehrung']` oder ein
   destrukturiertes `waehrung` liest; Kommentare zählen nicht. Jede steht hier mit `art` und `beiNull`:
     · 'lesestelle'  textsatzWaehrung selbst;
     · 'import'      übernimmt eine Währung aus einer Datei oder Format-Definition in den Text eines Feldes;
     · 'pruefung'    prüft, filtert oder sammelt Codes, gibt keinen Betrag aus;
     · 'anzeige'     rendert einen Betrag — muss STRINGS.waehrungNichtFestgelegt nennen (wie oben).
   Eine Funktion außerhalb der Liste ist rot; ein Eintrag ohne Lesung ebenso. WAEHRUNG_DIREKT gilt für den Kern,
   WAEHRUNG_DIREKT_LESEN für die Lese-App; Studio und Issuer lesen das Feld nicht (Probe: die Probe „Währung aus dem Template“, U2-ADR-480). */
const WAEHRUNG_DIREKT = Object.freeze([
  Object.freeze({ funktion: 'textsatzWaehrung', art: 'lesestelle',
    beiNull: 'gibt null zurück, nie einen eingebauten Wert (U2-ADR-480)', probe: '[U2-ADR-480·P5·Rot-Beweis]' }),
  Object.freeze({ funktion: '_elsterFelder', art: 'import',
    beiNull: 'ohne Währung in der Datei die der Format-Definition (IMPORT_FORMATE elster); fehlt auch sie, wird nichts angehängt — nie still EUR',
    probe: 'tests/waehrung-fest.test.js' }),
  Object.freeze({ funktion: 'parseCamt053', art: 'import',
    beiNull: 'die Währung kommt aus der Datei (Ccy); fehlt sie, bleibt sie leer — nie still EUR', probe: 'tests/waehrung-fest.test.js' }),
  Object.freeze({ funktion: '_rechtsraumRegelnGrund', art: 'pruefung',
    beiNull: 'prüft nur die Form eines gesetzten regeln.waehrung; ohne Wert kein Befund, keine Ausgabe', probe: '[U2-ADR-480·Stufe 1·Rot-Beweis]' }),
  Object.freeze({ funktion: 'iso4217CodesImGebrauch', art: 'pruefung',
    beiNull: 'sammelt nur gesetzte Codes für den Abgleich; ohne Wert kein Eintrag, keine Ausgabe', probe: 'tests/iso4217-selbst-laden.test.js' }),
  Object.freeze({ funktion: '_textsatzModuleAusDepotAnmelden', art: 'pruefung',
    beiNull: 'Schutz-Wagen S4: entfernt regeln.waehrung eines nicht zugelassenen Moduls; ohne Wert nichts zu tun, keine Ausgabe',
    probe: 'tests/waehrung-nur-aus-saat.test.js' }),
]);
const WAEHRUNG_DIREKT_LESEN = Object.freeze([
  Object.freeze({ funktion: '_waehrungNurAusSaatLesen', art: 'pruefung',
    beiNull: 'Schutz-Wagen S4 (Spiegel des Kerns): entfernt regeln.waehrung eines nicht zugelassenen Moduls; ohne Wert nichts zu tun',
    probe: 'tests/lese-app-waehrung-nur-aus-saat.test.js' }),
]);
const _DIREKT_ARTEN = Object.freeze(['lesestelle', 'import', 'pruefung', 'anzeige']);

/* Funktionen mit direkter Lesung des Währungsfelds → Anzahl. Ein Array-Literal ['waehrung'] ist keine Lesung. */
function direkteLeserFinden(quelltext) {
  const text = ohneKommentare(quelltext);
  const bereiche = funktionsBereiche(text);
  const leser = new Map();
  const re = /\.\s*waehrung\b|[\w$)\]]\s*\[\s*['"]waehrung['"]\s*\]|\{[^{}]*\bwaehrung\b[^{}]*\}\s*=(?!=)/g;
  let m;
  while ((m = re.exec(text))) {
    const umschliessend = bereiche.filter((b) => b.von < m.index && m.index < b.bis).sort((a, b) => (a.bis - a.von) - (b.bis - b.von))[0];
    const name = umschliessend ? umschliessend.name : '(oberste Ebene)';
    leser.set(name, (leser.get(name) || 0) + 1);
  }
  return leser;
}

function _funktionsKoerper(text, name) {
  return funktionsBereiche(text).filter((b) => b.name === name).map((b) => text.slice(b.von, b.bis)).join('\n');
}
function pruefenWaehrung(quelltext, liste = WAEHRUNG_LESER, direkt = WAEHRUNG_DIREKT) {
  const text = ohneKommentare(quelltext);
  const dGefunden = direkteLeserFinden(quelltext);
  const dErlaubt = new Set(direkt.map((l) => l.funktion));
  const direktUnbekannt = [...dGefunden.keys()].filter((n) => !dErlaubt.has(n));
  const direktVerwaist = direkt.map((l) => l.funktion).filter((n) => !dGefunden.has(n));
  const direktOhneBeiNull = direkt.filter((l) => !(typeof l.beiNull === 'string' && l.beiNull.trim()) || _DIREKT_ARTEN.indexOf(l.art) < 0)
    .map((l) => l.funktion);
  const direktAnzeigeOhneKennzeichnung = direkt.filter((l) => l.art === 'anzeige' && dGefunden.has(l.funktion)
    && _funktionsKoerper(text, l.funktion).indexOf(WAEHRUNG_KENNZEICHNUNG) < 0).map((l) => l.funktion);
  const gefunden = leserFinden(quelltext, WAEHRUNG_FUNKTION);
  const erlaubt = new Set(liste.map((l) => l.funktion));
  const unbekannt = [...gefunden.keys()].filter((n) => !erlaubt.has(n));
  const verwaist = liste.map((l) => l.funktion).filter((n) => !gefunden.has(n));
  const ohneBeiNull = liste.filter((l) => !(typeof l.beiNull === 'string' && l.beiNull.trim()) || ['anzeige', 'export'].indexOf(l.art) < 0)
    .map((l) => l.funktion);
  const anzeigeOhneKennzeichnung = liste.filter((l) => l.art === 'anzeige' && gefunden.has(l.funktion)
    && _funktionsKoerper(text, l.funktion).indexOf(WAEHRUNG_KENNZEICHNUNG) < 0).map((l) => l.funktion);
  return { gefunden: Object.fromEntries(gefunden), unbekannt, verwaist, ohneBeiNull, anzeigeOhneKennzeichnung,
    direkt: Object.fromEntries(dGefunden), direktUnbekannt, direktVerwaist, direktOhneBeiNull, direktAnzeigeOhneKennzeichnung,
    ok: !unbekannt.length && !verwaist.length && !ohneBeiNull.length && !anzeigeOhneKennzeichnung.length
      && !direktUnbekannt.length && !direktVerwaist.length && !direktOhneBeiNull.length && !direktAnzeigeOhneKennzeichnung.length };
}

function main(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--kern');
  const pfad = i >= 0 ? path.resolve(argv[i + 1]) : path.join(REPO, 'vivodepot.html');
  const quelle = fs.readFileSync(pfad, 'utf8');
  const w = pruefenWaehrung(quelle);
  if (w.unbekannt.length) process.stdout.write('ROT: Betrags-Leser von ' + WAEHRUNG_FUNKTION + '() außerhalb der Positivliste: ' + w.unbekannt.join(', ') + '\n');
  if (w.verwaist.length) process.stdout.write('ROT: Währungs-Eintrag ohne Aufruf: ' + w.verwaist.join(', ') + '\n');
  if (w.ohneBeiNull.length) process.stdout.write('ROT: Währungs-Eintrag ohne art oder Verhalten bei null: ' + w.ohneBeiNull.join(', ') + '\n');
  if (w.anzeigeOhneKennzeichnung.length) process.stdout.write('ROT: Anzeige ohne ' + WAEHRUNG_KENNZEICHNUNG + ': ' + w.anzeigeOhneKennzeichnung.join(', ') + '\n');
  if (w.direktUnbekannt.length) process.stdout.write('ROT: direkte Lesung von .waehrung außerhalb der Positivliste: ' + w.direktUnbekannt.join(', ') + '\n');
  if (w.direktVerwaist.length) process.stdout.write('ROT: Eintrag ohne direkte Lesung: ' + w.direktVerwaist.join(', ') + '\n');
  if (w.direktOhneBeiNull.length) process.stdout.write('ROT: direkte Lesung ohne art oder Verhalten bei null: ' + w.direktOhneBeiNull.join(', ') + '\n');
  if (w.direktAnzeigeOhneKennzeichnung.length) process.stdout.write('ROT: direkte Anzeige ohne ' + WAEHRUNG_KENNZEICHNUNG + ': ' + w.direktAnzeigeOhneKennzeichnung.join(', ') + '\n');
  if (w.ok) process.stdout.write('grün: jeder Leser von ' + WAEHRUNG_FUNKTION + '() steht mit seinem Verhalten bei null auf der Positivliste ('
    + WAEHRUNG_LESER.length + ').\n');
  const r = pruefen(quelle);
  for (const l of LESER) process.stdout.write('  ' + l.funktion + ': ' + l.beiLeer + '\n');
  if (r.unbekannt.length) process.stdout.write('ROT: Leser außerhalb der Positivliste: ' + r.unbekannt.join(', ') + '\n');
  if (r.verwaist.length) process.stdout.write('ROT: Eintrag ohne Aufruf: ' + r.verwaist.join(', ') + '\n');
  if (r.ohneBeiLeer.length) process.stdout.write('ROT: Eintrag ohne Verhalten bei \'\': ' + r.ohneBeiLeer.join(', ') + '\n');
  process.stdout.write(r.ok ? 'grün: jeder Leser von ' + FUNKTION + '() steht auf der Positivliste.\n' : '');
  return r.ok && w.ok ? 0 : 1;
}

if (require.main === module) process.exit(main());
module.exports = { LESER, FUNKTION, leserFinden, pruefen, WAEHRUNG_LESER, WAEHRUNG_DIREKT, WAEHRUNG_DIREKT_LESEN, WAEHRUNG_FUNKTION,
  WAEHRUNG_KENNZEICHNUNG, direkteLeserFinden, pruefenWaehrung, main };
