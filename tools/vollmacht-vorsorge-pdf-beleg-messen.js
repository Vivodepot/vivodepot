#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vollmacht-vorsorge-pdf-beleg-messen.js — „die Sprach-Spur",
   Punkt 1: „jeder übernommene Wortlaut steht wörtlich im extrahierten
   PDF-Text, sonst rot" (06.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   WAS ES TUT (Ausbeute zuerst): für jede der 39 Kennungen, die heute in
   OFFEN_JURISTISCH unter `dok:vorsorgevollmacht#` bzw. `dok:betreuungsverfuegung#`
   stehen, wird der DEUTSCHE Wortlaut (aus dem eingebauten Satz) gegen den mit
   `pdftotext -layout` (poppler 26.07.0) extrahierten Text der amtlichen
   zweisprachigen BMJ-Formulare geprüft — Beleg, dass unser Wortlaut wirklich
   aus DIESER Ausgabe stammt (Stand 15.01.2023), nicht behauptet.

   LAUFZEIT-WERTE, NIEMALS QUELLTEXT: das Werkzeug liest `deTexte()`
   aus dem GELADENEN Kern (`tests/load-kern.js`), nie `vivodepot.html` als Text.
   Gefunden beim Bau: eine lange Zeile steht im Quelltext auf zwei String-
   Literale verteilt (`'...nicht mehr' + ' ' + 'selbst besorgen...'`) — ein
   grep über die Datei hätte fälschlich „weicht ab" gemeldet, obwohl der
   RUNTIME-Wert exakt mit dem PDF übereinstimmt. Wer dieses Werkzeug erweitert:
   an dieser Stelle nie auf Quelltext-Suche umsteigen.

   NORMALISIERUNG, NICHT ABSCHWÄCHUNG: PDF-Extraktion bricht Zeilen um
   (Silbentrennung, Spaltenlayout) und die Vorlage selbst setzt an manchen
   Stellen andere Leerzeichen als unser Wortlaut (z. B. „Gesundheitssorge /
   Pflegebedürftigkeit" im PDF vs. „Gesundheitssorge/Pflegebedürftigkeit" bei
   uns — derselbe Wortlaut, andere Layout-Entscheidung). Der Vergleich entfernt
   darum JEDEN Whitespace vor dem Substring-Test — das bleibt wörtlich (jeder
   Buchstabe und jedes Satzzeichen muss in derselben Reihenfolge vorkommen),
   ist aber blind für Zeilenumbruch/Spaltenabstand, die keine Wortlaut-
   Abweichung sind, sondern eine Layout-Frage.

   AUFRUF
     node tools/vollmacht-vorsorge-pdf-beleg-messen.js
   ════════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures', 'bmj');

const QUELLEN = {
  'dok:vorsorgevollmacht#': path.join(FIXTURES, 'vorsorgevollmacht-deutsch-englisch.txt'),
  'dok:betreuungsverfuegung#': path.join(FIXTURES, 'betreuungsverfuegung-deutsch-englisch.txt'),
};

// Silbentrennung am Zeilenumbruch ist eine Layout-Entscheidung des PDF, kein Wortlaut-
// Unterschied: "Sozialleistung-\nsträgern" ist derselbe Wortlaut wie "Sozialleistungsträgern".
// Der Trennstrich faellt NUR weg, wenn er unmittelbar vor einem Zeilenumbruch steht — ein
// echter Bindestrich mitten im Wort (gibt es in diesen Formularen nicht) bliebe stehen.
//
// .normalize('NFC') ZUERST: pdftotext liefert Umlaute an manchen Stellen ZERLEGT
// (Basisbuchstabe + kombinierender Trema-Strich, NFD) statt vorkomponiert (NFC) — je
// nach ToUnicode-CMap der Schriftart IM SELBEN PDF unterschiedlich. "Für" tauchte so
// im Rohtext auf, dass ein reiner Codepoint-Vergleich es nicht fand, obwohl es sichtbar
// identisch ist. Gemessen (node -e mit `.normalize('NFC').indexOf(...)` gegen den rohen
// Index), nicht vermutet — ohne diese Zeile bricht der Vergleich an JEDEM Umlaut, den
// dieselbe Schriftart zerlegt einbettet.
function ohneWhitespace(s) {
  return String(s).normalize('NFC').replace(/-\s*\n\s*/g, '').replace(/\s+/g, '');
}

// Liefert den QUELLEN-Praefix (Schluessel), NICHT den Dateipfad — passend zu `_pdfTexte()`,
// die denselben Praefix als Schluessel traegt.
function pdfWurzelFuer(kennung) {
  for (const praefix of Object.keys(QUELLEN)) {
    if (kennung.startsWith(praefix)) return praefix;
  }
  return null;
}

/* Die 39 Kennungen sind kein fester Literal hier — sie kommen aus dem
   Rückstand selbst, damit diese Datei nicht als zweite, abweichende Liste
   veraltet. Filter identisch zur Zählung im ADR/Bericht. */
function amtlichUebernehmbareKennungen() {
  const { OFFEN_JURISTISCH } = require(path.join(REPO, 'tools', 'textsatz-en-juristisch-offen.js'));
  return OFFEN_JURISTISCH.filter((k) => pdfWurzelFuer(k) !== null);
}

function _pdfTexte() {
  const raus = {};
  for (const [praefix, pfad] of Object.entries(QUELLEN)) {
    raus[praefix] = ohneWhitespace(fs.readFileSync(pfad, 'utf8'));
  }
  return raus;
}

/* Platzhalter ({namen}, {text}) sind kein PDF-Wortlaut — sie werden aus dem Vergleich
   herausgeschnitten, der Rest muss trotzdem woertlich stehen. Ein Satz, der einen
   Platzhalter traegt, ist ein von UNS generierter Satz — der schliessende Punkt danach
   ist UNSERE Interpunktion, nicht die des Formulars (das Formular endet an der Stelle
   mit einem Doppelpunkt vor dem Eintragsfeld, nicht mit einem Punkt). Er wird darum nur
   bei Vorhandensein eines Platzhalters entfernt — ein Satz ohne Platzhalter behaelt
   seinen Punkt, der ist echter Wortlaut und muss weiterhin woertlich stehen. Gilt fuer
   Deutsch UND Englisch gleichermassen — dieselbe Bauform, derselbe Grund. */
function _belegt(pdfTexte, praefix, text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  const trugPlatzhalter = /\{[a-zA-ZäöüÄÖÜß]+\}/.test(text);
  let ohnePlatzhalter = text.replace(/\{[a-zA-ZäöüÄÖÜß]+\}/g, '');
  if (trugPlatzhalter) ohnePlatzhalter = ohnePlatzhalter.replace(/\.\s*$/, '');
  return pdfTexte[praefix].includes(ohneWhitespace(ohnePlatzhalter));
}

/* Fuer eine BELIEBIGE Kennungsliste (nicht nur den aktuellen Rueckstand) — gebraucht, um
   eine historische Menge nachzurechnen, nachdem ein Teil davon bereits aus OFFEN_JURISTISCH
   herausgetragen wurde (U2-ADR-343: 39 gemessen, 37 danach uebernommen/umgetragen — die
   Probe, die die vollen 39 haelt, kann sich nicht mehr auf den LIVE-Rueckstand stuetzen). */
function deutscheAusbeuteFuer(kennungen) {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const pdfTexte = _pdfTexte();
  return kennungen.map((kennung) => {
    const deutsch = deTexte()[kennung];
    const praefix = pdfWurzelFuer(kennung);
    if (typeof deutsch !== 'string' || !deutsch.trim()) {
      return { kennung, gefunden: false, grund: 'kein-string-im-eingebauten-satz' };
    }
    const gefunden = _belegt(pdfTexte, praefix, deutsch);
    return { kennung, gefunden, grund: gefunden ? null : 'nicht-im-pdf-text' };
  });
}

function messen() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const pdfTexte = _pdfTexte();

  const kennungen = amtlichUebernehmbareKennungen();
  const ergebnis = [];
  for (const kennung of kennungen) {
    const deutsch = deTexte()[kennung];
    const praefix = pdfWurzelFuer(kennung);
    if (typeof deutsch !== 'string' || !deutsch.trim()) {
      ergebnis.push({ kennung, gefunden: false, grund: 'kein-string-im-eingebauten-satz' });
      continue;
    }
    const gefunden = _belegt(pdfTexte, praefix, deutsch);
    ergebnis.push({ kennung, gefunden, grund: gefunden ? null : 'nicht-im-pdf-text' });
  }
  return ergebnis;
}

/* Auflage (a), englische Seite: „das PDF ist zweisprachig, heisst aber nicht, dass jeder
   deutsche Satz ein englisches Gegenstueck hat" — gemessen, nicht angenommen. Prueft die
   FESTGELEGTEN Uebersetzungen aus vollmacht-vorsorge-amtliche-uebersetzung.js gegen
   denselben PDF-Text, mit demselben Beleg-Weg wie die deutsche Seite. */
function englischeAusbeute() {
  const { VOLLMACHT_VORSORGE_AMTLICHE_UEBERSETZUNG } = require(path.join(__dirname, 'vollmacht-vorsorge-amtliche-uebersetzung.js'));
  const pdfTexte = _pdfTexte();
  const ergebnis = [];
  for (const [kennung, englisch] of Object.entries(VOLLMACHT_VORSORGE_AMTLICHE_UEBERSETZUNG)) {
    const praefix = pdfWurzelFuer(kennung);
    const gefunden = praefix ? _belegt(pdfTexte, praefix, englisch) : false;
    ergebnis.push({ kennung, gefunden, grund: gefunden ? null : (praefix ? 'nicht-im-pdf-text' : 'unbekannte-wurzel') });
  }
  return ergebnis;
}

function main() {
  const ergebnis = messen();
  const gefunden = ergebnis.filter((e) => e.gefunden);
  const fehlend = ergebnis.filter((e) => !e.gefunden);
  console.log('Deutsch — Ausbeute: ' + gefunden.length + ' von ' + ergebnis.length + ' Kennungen im PDF-Text gefunden.');
  if (fehlend.length) {
    console.log('NICHT gefunden:');
    for (const e of fehlend) console.log('  ' + e.kennung + ' (' + e.grund + ')');
  }

  const ergebnisEn = englischeAusbeute();
  const gefundenEn = ergebnisEn.filter((e) => e.gefunden);
  const fehlendEn = ergebnisEn.filter((e) => !e.gefunden);
  console.log('');
  console.log('Englisch — Ausbeute: ' + gefundenEn.length + ' von ' + ergebnisEn.length + ' festgelegten Übersetzungen im PDF-Text gefunden.');
  if (fehlendEn.length) {
    console.log('NICHT gefunden:');
    for (const e of fehlendEn) console.log('  ' + e.kennung + ' (' + e.grund + ')');
  }
}

if (require.main === module) main();
module.exports = { messen, deutscheAusbeuteFuer, englischeAusbeute, amtlichUebernehmbareKennungen, ohneWhitespace, pdfWurzelFuer, QUELLEN };
