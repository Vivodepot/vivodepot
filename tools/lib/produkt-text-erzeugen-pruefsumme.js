'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   produkt-text-erzeugen-pruefsumme.js — U2-ADR-406 (12.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   EINE KOPIERTE FUNKTION, DIE STILL VOM ORIGINAL ABWEICHT, IST GEFÄHRLICHER ALS EINE
   KOPIERTE DATENLISTE (wörtlich) — sie baut Produkte, die niemand geprüft hat.
   `tools/lib/produkt-text-erzeugen.js` wird byte-für-byte in den Schwesterrepo kopiert
   (vivodepot-download-gateway, `src/produkt-text-erzeugen.js`); diese Datei bewacht, dass die
   Kopie nicht driftet — dieselbe Prüfsumme-Lösung wie U2-ADR-405, nur über CODE statt DATEN.

   Extrahiert GENAU den Abschnitt zwischen den `PRODUKT_TEXT_ERZEUGEN:BEGIN/END`-Markern (nicht
   die ganze Datei — Kopf-Kommentar und `module.exports`/`export` unterscheiden sich zwischen den
   Repositorien absichtlich: der eine sagt "Original", der andere "Kopie, hier nicht ändern") und
   bildet sha256 darüber. Derselbe gepinnte Wert steht wortgleich im Schwesterrepo
   (`tools/lib/produkt-text-erzeugen-pruefsumme.js` dort). */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BEGIN = '/* ==PRODUKT_TEXT_ERZEUGEN:BEGIN== */';
const ENDE = '/* ==PRODUKT_TEXT_ERZEUGEN:END== */';

function kopierterAbschnitt(dateiPfad) {
  const quelle = fs.readFileSync(dateiPfad, 'utf8');
  const a = quelle.indexOf(BEGIN);
  const b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0 || b < a) {
    throw new Error('PRODUKT_TEXT_ERZEUGEN-Marker fehlen/beschädigt in ' + dateiPfad + ' — nicht raten, nachsehen.');
  }
  return quelle.slice(a + BEGIN.length, b);
}

function codePruefsumme(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// GEPINNT — wortgleich in tools/lib/produkt-text-erzeugen-pruefsumme.js im Schwesterrepo. Bei
// jeder bewussten Änderung an tools/lib/produkt-text-erzeugen.js HÄNDISCH hier UND dort
// nachzuziehen (inklusive der byte-für-byte-Kopie selbst), nie automatisch.
// 16.09.2026: neu gepinnt für die Region AB_WERK_BEREICHE_BEKANNT (modulTyp bereicheBekannt, U2-ADR-398).
// 17.09.2026 (Sammelzweig-Zusammenführung): zwei Zweige haben istListenTyp unabhängig um je zwei
// modulTyp-Werte erweitert (situation/wizard hier, dokumentModul/standardVorlage dort) — beide
// Erweiterungen zusammengeführt, Prüfsumme frisch über den ZUSAMMENGEFÜHRTEN Abschnitt gemessen
// (node -e mit kopierterAbschnitt/codePruefsumme dieser Datei), nicht aus einer der beiden
// Zwischenfassungen übernommen. Muss von Hand im Schwesterrepo nachgezogen werden (s. o.).
// 19.09.2026 (U2-ADR-NNN, „Angehörigen-Blätter sind Template, kein Gerüst") — neue Region
// AB_WERK_ANGEHOERIGEN_QUELLEN (modulTyp angehoerigenVorlage), istListenTyp erweitert. NOCH
// NICHT im Schwesterrepo nachgezogen (kein Zugriff aus dieser Sitzung) — offen ist,
// wer den Copy+Prüfsumme-Zug im Gateway-Repo übernimmt.
// 19.09.2026 (Kürzel-Bereinigung Achse K/A/B): ein Kommentar im Abschnitt wurde neutral umformuliert, dadurch neu gepinnt;
// der Schwesterrepo trägt Kopie und Pin auf dem Gateway-Zweig gateway-rezepte-l1-7c06559a-2026-09-19 (noch nicht auf main).
// 20.09.2026 (Gerüst-Schnitt S2/S6/S3): neue Region AB_WERK_DOKUMENTE_DE (modulTyp dokumente, Leerform null) und AB_WERK_RECHTSRAUM_PRODUKT
// als Listen-Typ (nativerWert [], 'rechtsraum' in istListenTyp). Frisch gemessen; die Kopie samt Pin im Schwesterrepo zieht die Sitzung mit dem Gateway-Auftrag nach.
// 21.09.2026 (Gerüst-Schnitt S7): neue Region BEREICHE_NATIV_KATALOG (modulTyp bereicheNativ, Leerform null, Einzel-Typ). Frisch gemessen; die Kopie samt Pin im Schwesterrepo
// zieht die Sitzung mit dem Gateway-Auftrag nach (Stand des Pins im Schwesterrepo bis dahin: der Pin vor diesem Schnitt, `git log -p -1 -- tools/lib/produkt-text-erzeugen-pruefsumme.js`).
// 21.09.2026 (Vor-Depot-Sprachangebot, U2-ADR-428): neue Region AB_WERK_SPRACHANGEBOT_QUELLEN (modulTyp sprachangebot, Listen-Typ). Frisch gemessen; das Gateway muss die Kopie samt Pin
// nachziehen; ob dessen Erzeuger die Region schon kennt, zeigt `grep -c sprachangebot src/produkt-text-erzeugen.js` im Schwesterrepo (Stand dort: der Pin vor diesem Schnitt, `git log -p -1 -- tools/lib/produkt-text-erzeugen-pruefsumme.js`).
// 21.09.2026 (Angaben am Herkunftsort, Spezifikation 34.7, U2-ADR-431): der Abschnitt weist ein Rezept, dessen Sprachmodul die Angabe der Urheberin nicht trägt, BEIM ERZEUGEN ab. Die Prüfung ist
// selbstenthalten (kein require, keine zweite Datei): der Worker bekommt sie mit der Kopie. Bewusst angehoben, weil der produktive Konfektionierer diese Kopie ist; ein Aufrufer-Riegel (B) ließe den Worker-Weg offen.
// Frisch gemessen; das Gateway muss die Kopie samt Pin nachziehen, gebündelt mit dem sprachangebot-Nachzug: ein Auftrag, zwei Stücke, keine neue Datei.
// 22.09.2026 (Gerüst-Schnitt S9): neue Region LEBENSLAGEN_KATALOG (modulTyp lebenslagen, kein Listen-Typ, dieselbe Bauart wie
// BEREICHE_NATIV_KATALOG direkt darüber) für den ausgelagerten Lebenslagen-Katalog. Frisch gemessen; das Gateway muss die Kopie
// samt Pin nachziehen (Stand dort: der Pin vor diesem Schnitt, `git log -p -1 -- tools/lib/produkt-text-erzeugen-pruefsumme.js`).
// 23.09.2026 (Entwicklerleiste raus aus dem Produkt): der Abschnitt schneidet die ENTWICKLERLEISTE-Spannen heraus, außer bei mitEntwicklerleiste:true. Frisch gemessen; das Gateway zieht Kopie und Pin nach.
// 23.09.2026 (statisches <html lang> je Produkt, WCAG 3.1.1): der Abschnitt schreibt die Sprachkennung des Sprachmoduls (regeln.sprachkennung, sonst sprache) ins <html lang>, nur ein gültiges Sprach-Tag. Frisch gemessen; das Gateway zieht Kopie und Pin nach.
// 25.09.2026: nur Kommentare im Abschnitt neutral formuliert (keine Personen- und Rollenwörter), Verhalten unverändert —
// die vier Produkte aus tools/vier-produkte-erzeugen.js sind vorher und nachher byte-gleich; Pin neu gehasht (vorher c08ed34b…).
// Das Schwesterrepo trägt HEUTE einen anderen Pin, weil seine Kopie ein älterer Stand des Abschnitts ist (eigener Befund,
// Probe folgt); „wortgleich“ oben gilt erst wieder nach dem Abgleich.
const PRODUKT_TEXT_ERZEUGEN_PRUEFSUMME = 'a5d76c9e9a67cb6c614f8cf9b2ab8449cd5d805a9d79fc70dd8376576a50a8ab';

const PRODUKT_TEXT_ERZEUGEN_PFAD = path.join(__dirname, 'produkt-text-erzeugen.js');

module.exports = {
  BEGIN, ENDE, kopierterAbschnitt, codePruefsumme,
  PRODUKT_TEXT_ERZEUGEN_PRUEFSUMME, PRODUKT_TEXT_ERZEUGEN_PFAD,
};
