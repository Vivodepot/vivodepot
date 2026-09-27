#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vollmacht-bmj-schluessel-heben.js — U2-ADR-337-Nachtrag / „die Sprach-Spur", Punkt 3 (06.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   WAS ES TUT: hebt `sektion`/`frage`/`feld.label` der 25 VOLLMACHT_BMJ.steps in
   AB_WERK_TEXTSATZ_DE.texte — dieselbe Bewegung, die PV_BMJ/KI_KORPUS für `sektion`
   bereits hinter sich haben (U2-ADR-333). NICHT dieselbe wie
   `tools/textsatz-umstellen.js`: jenes Werkzeug entfernt den Inline-Text aus der
   Felddefinition — hier bleibt er stehen (wie bei PV_BMJ/KI_KORPUS auch). Die
   Kennung im eingebauten Satz ist das Kriterium, ob ein Knoten „umgestellt" ist
   (s. Kommentar an `_textsatzOrteBegehen`), nicht das Fehlen des Inline-Texts —
   `_TEXTSATZ_ZURUECK` nimmt den aktuellen Wert vor jedem `_TEXTSATZ_FUELLEN`
   ohnehin zurück, unabhängig davon, ob er inline oder von einem Modul stammt.
   Empirisch geprüft, nicht nur aus dem Quelltext gefolgert — s.
   `tests/u2-adr-337-vollmacht-bmj-schluessel.test.js`.

   WARUM KEIN ENGLISCHER WORTLAUT: Auflage aus dem Auftrag. `VOLLMACHT_BMJ` ist
   ein wörtlicher Ausschnitt aus `STANDARD_VORLAGEN['vorsorgevollmacht'].wortlaut`
   (amtliches Formular, BMJ, Stand Januar 2023) — eine Übersetzung, die kein
   Jurist gesehen hat, wäre schlimmer als keine. Die gehobenen Kennungen kommen
   darum NICHT in `tools/textsatz-en-daten.js` & Geschwister, sondern in
   `tools/textsatz-en-juristisch-offen.js` (derselbe Rückstand wie die 121
   Wortlaute der Dokument-Module).

   DREI KENNUNGSRÄUME, NICHT EINER — wörtlich aus dem Kern übernommen
   (vivodepot.html:11373-11380, `_textsatzAufVollmachtBmjAnwenden`/
   `_textsatzAufSchrittsatzAnwenden`):
     `vollmachtBmj#<feldId>.sektion`   Schritt-Ebene, ueber _textsatzAufSchrittsatzAnwenden
     `vollmachtBmj#<feldId>.frage`     Schritt-Ebene, dieselbe Funktion
     `vollmacht:<feldId>.label`        Feld-Ebene, ueber _textsatzAufVollmachtBmjAnwenden
                                       (eigener Namensraum, weil `advanceCare.provisionInstruments/
                                       <feldId>/<wert>.label` denselben (feldId,wert) mit einem
                                       ANDEREN Text belegt)

   AUFRUF
     node tools/vollmacht-bmj-schluessel-heben.js            (schreibt beide Dateien)
     node tools/vollmacht-bmj-schluessel-heben.js --probe    (nur anzeigen, nichts schreiben)
   ════════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const OFFEN_PFAD = path.join(REPO, 'tools', 'textsatz-en-juristisch-offen.js');

function kandidaten() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const raus = [];
  for (const st of V.VOLLMACHT_BMJ.steps) {
    const id = st.feld && st.feld.id;
    if (!id) throw new Error('Schritt ohne feld.id — Kennungsschema trägt nicht: ' + JSON.stringify(st));
    if (typeof st.sektion === 'string' && st.sektion.trim()) raus.push({ kennung: 'vollmachtBmj#' + id + '.sektion', text: st.sektion });
    if (typeof st.frage === 'string' && st.frage.trim()) raus.push({ kennung: 'vollmachtBmj#' + id + '.frage', text: st.frage });
    if (typeof st.feld.label === 'string' && st.feld.label.trim()) raus.push({ kennung: 'vollmacht:' + id + '.label', text: st.feld.label });
  }
  return raus;
}

function main() {
  const probe = process.argv.includes('--probe');
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();

  const liste = kandidaten();

  // Gegen bereits vorhandene Kennungen prüfen — ein zweiter Lauf darf nichts doppelt eintragen.
  const schonDa = liste.filter((e) => e.kennung in deTexte());
  if (schonDa.length) {
    console.error('ABBRUCH: ' + schonDa.length + ' Kennung(en) stehen bereits im eingebauten Satz:');
    for (const e of schonDa.slice(0, 10)) console.error('  ' + e.kennung);
    process.exit(1);
  }

  const kernQuelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const anker = "  'kiKorpus#digitalEstateAdministration2.sektion': \"Widerruf, Abschaltung und Verwaltung\",\n";
  if (kernQuelle.indexOf(anker) < 0) {
    console.error('ABBRUCH: Einfüge-Anker (letzte kiKorpus-Zeile) nicht gefunden — Datei hat sich verschoben.');
    process.exit(1);
  }
  const zeilen = ['  /* vollmachtBmj + vollmacht (U2-ADR-337-Nachtrag) — Wortlaute mit Rechtsfolge,',
    '     der Ort ist da, kein englischer Wortlaut eingesetzt, s. tools/textsatz-en-juristisch-offen.js */'];
  for (const e of liste) zeilen.push('  ' + JSON.stringify(e.kennung) + ': ' + JSON.stringify(e.text) + ',');
  const einfuegung = zeilen.join('\n') + '\n';
  const neueKernQuelle = kernQuelle.replace(anker, anker + einfuegung);

  const offenQuelle = fs.readFileSync(OFFEN_PFAD, 'utf8');
  const offenAnker = /(\n\]\);\s*\n\s*module\.exports)/;
  if (!offenAnker.test(offenQuelle)) {
    console.error('ABBRUCH: Einfüge-Anker in ' + OFFEN_PFAD + ' nicht gefunden.');
    process.exit(1);
  }
  const offenZeilen = ["\n  // U2-ADR-337-Nachtrag (06.09.2026): VOLLMACHT_BMJ — Wortlaute mit Rechtsfolge,",
    '  // der Schlüssel-Weg ist gebaut, kein Jurist hat eine englische Fassung gesehen.'];
  for (const e of liste) offenZeilen.push('  ' + JSON.stringify(e.kennung) + ',');
  const offenEinfuegung = offenZeilen.join('\n');
  const neueOffenQuelle = offenQuelle.replace(offenAnker, offenEinfuegung + '$1');

  console.log(liste.length + ' Kennungen gehoben (' + new Set(liste.map((e) => e.text)).size + ' verschiedene Wortlaute).');
  if (probe) {
    console.log('--probe: nichts geschrieben. Vorschau der ersten fünf Zeilen:');
    console.log(zeilen.slice(0, 7).join('\n'));
    return;
  }

  fs.writeFileSync(KERN_PFAD, neueKernQuelle, 'utf8');
  fs.writeFileSync(OFFEN_PFAD, neueOffenQuelle, 'utf8');
  console.log('Geschrieben: ' + KERN_PFAD + ' und ' + OFFEN_PFAD);
}

if (require.main === module) main();
module.exports = { kandidaten };
