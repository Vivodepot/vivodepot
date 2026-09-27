'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   HERAUSGABE BEKOMMT AUCH EIN PDF — DER ZWILLINGS-WÄCHTER (U2-ADR-412, 14.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Grundregel (U2-ADR-412): alles, was herausgegeben wird, wird auch als PDF
   herausgegeben, damit es überprüfbar ist.

   ZWEI GRUPPEN, wie bei `tests/b16-113-klartext-ausgabepfade.test.js` (dieselbe
   Fehlerklasse „unregistrierter neuer Ausgabeweg", andere Achse: nicht Chiffrat-
   gegen-Klartext, sondern PDF-gegen-kein-PDF):

   1. MIT_PDF — Ausgabewege, die JSON UND PDF aus demselben Lauf liefern
      (Anlass-Export, Zusammenstellung/Teilmenge). Marker sind die beiden
      distinkten `anlassPdfAusgeben(...)`-Aufrufstellen (unterschiedliche
      Variablennamen je Aufrufer — `a.datensatz` bzw. `ds` — machen sie einzeln
      auffindbar, nicht nur als eine gemeinsame Funktionsdefinition).

      „Ganzes Depot" (PDF-only, U2-ADR-059) und „Bereich" (eigener PDF-Knopf im
      selben Chooser) sind NICHT hier gelistet — sie liefern PDF ohnehin als
      EINZIGES bzw. bereits registriertes Format, keine neue Zwillings-Frage.

   2. OHNE_PDF_AUSNAHME — Ausgabewege, die BEWUSST kein PDF bekommen, mit Grund.
      Bestätigt durch die Produktverantwortung am 14.09.2026 (Vermerk je Eintrag).
      Korrigiert gegenüber der ersten Fassung dieses Auftrags: EUDIW/SD-JWT
      gehört NICHT hierher — `tests/b16-113-klartext-ausgabepfade.test.js`
      führt es bereits unter „erlaubte Klartext-Pfade" (SD-JWT ist eine
      signierte, aber nicht AES-verschlüsselte Standard-Serialisierung, keine
      Chiffre) — und sein PDF-Zwilling existiert bereits: der `data-h-eudiw`-
      Knopf sitzt im selben Bereichs-Chooser wie `data-h-pdf`
      (`flowHerausgeben()`), genau wie bei FHIR-IPS/XÖV. Die tatsächlichen drei
      Chiffrat-Ausnahmen aus `tests/b16-113-…` (Blackbox-Export, Anfrage-
      Antwort, Empfängerkreise — nicht Depot-Sicherung selbst, die ist kein
      Herausgabe-Weg) stehen unten.

   GRENZE DER MESSUNG, offen gesagt (wie bei `tools/schema-wirkung-pruefen.js`):
   Dieser Wächter erkennt nicht jeden denkbaren NEUEN Herausgabe-Weg im ganzen
   Kern automatisch — das leistet `b16-113` bereits für JEDEN `dateiAusgeben`-
   Aufruf (Chiffrat-oder-Klartext, unregistriert = rot). Was HIER zusätzlich
   geprüft wird: dass die HEUTE bekannten Wege ihre Marker nicht verlieren
   (ein entfernter PDF-Zwilling oder eine entfernte Ausnahme-Begründung wird
   rot). Ein KÜNFTIGER neuer Klartext-Weg fällt zuerst unter `b16-113` auf
   (Zahl steigt dort) — wer ihn registriert, prüft in diesem Zug auch gegen
   DIESE Liste, ob er PDF bekommt oder eine begründete Ausnahme braucht.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const HTML = path.join(__dirname, '..', 'vivodepot.html');

const MIT_PDF = Object.freeze([
  {
    name: 'Anlass-Export',
    marker: 'anlassPdfAusgeben(a.datensatz, dateiBasis)',
    beleg: 'flowAnlassExport ruft anlassPdfAusgeben() zusätzlich zur JSON-Ausgabe auf.',
  },
  {
    name: 'Zusammenstellung/Teilmenge',
    marker: 'anlassPdfAusgeben(ds, dateiBasis)',
    beleg: 'flowZusammenstellungHerausgeben ruft anlassPdfAusgeben() zusätzlich zur JSON-Ausgabe auf.',
  },
]);

const OHNE_PDF_AUSNAHME = Object.freeze([
  {
    name: 'Sub-Depot-Blackbox-Export',
    marker: "'-Sub_'",
    grund: 'Verschlüsselter Umschlag (AES-GCM, versiegelt) — kein lesbarer Inhalt zum Rendern. '
      + 'Dieselbe Fundstelle wie tests/b16-113-… NUR_CHIFFRAT.',
    bestaetigung: 'bestätigt 14.09.2026',
  },
  {
    name: 'Anfrage-Antwort',
    marker: "'_Antwort_'",
    grund: 'Nur Chiffrat (AES-256-GCM) — jeder Feldwert liegt in ct. Ein PDF-Begleiter wäre für '
      + 'den Empfänger vor dem Entschlüsseln entweder unmöglich oder würde die Verschlüsselung '
      + 'unterlaufen. Dieselbe Fundstelle wie tests/b16-113-… NUR_CHIFFRAT.',
    bestaetigung: 'bestätigt 14.09.2026',
  },
  {
    name: 'Empfängerkreise-Ausschnitt',
    marker: "'vivodepot-fuer-'",
    grund: 'Reguläre v4-Depot-Datei — jeder Feldwert liegt in einer eigenen AES-GCM-Einheit, im '
      + 'Klartext stehen nur Krypto-Parameter und die neutrale Fachkennung. Dieselbe Fundstelle '
      + 'wie tests/b16-113-… NUR_CHIFFRAT.',
    bestaetigung: 'bestätigt 14.09.2026',
  },
]);

function pruefe(src) {
  const fehlend = [];
  for (const e of MIT_PDF) {
    if (!src.includes(e.marker)) fehlend.push('MIT_PDF „' + e.name + '“ — Marker nicht gefunden: ' + e.marker);
  }
  for (const e of OHNE_PDF_AUSNAHME) {
    if (!src.includes(e.marker)) fehlend.push('OHNE_PDF_AUSNAHME „' + e.name + '“ — Marker nicht gefunden: ' + e.marker);
  }
  return fehlend;
}

test('[Herausgabe·PDF-Zwilling] jeder registrierte Weg trägt seinen Marker noch', () => {
  const src = fs.readFileSync(HTML, 'utf8');
  const fehlend = pruefe(src);
  assert.equal(fehlend.length, 0,
    'Ein registrierter Herausgabe-Weg hat seinen Marker verloren (PDF-Zwilling entfernt oder '
    + 'Ausnahme-Begründung entfernt) — vor dem Fortfahren klären, ob die Änderung gewollt ist:\n'
    + fehlend.join('\n'));
});

test('[Herausgabe·PDF-Zwilling] jede Ausnahme trägt einen Bestätigungs-Vermerk (nicht leer)', () => {
  for (const e of OHNE_PDF_AUSNAHME) {
    assert.ok(e.bestaetigung && e.bestaetigung.length > 0,
      '„' + e.name + '“ trägt keinen Bestätigungs-Vermerk — jede Ausnahme von der Herausgabe-'
      + 'PDF-Regel braucht eine benannte Grundlage, nicht nur die eigene Einschätzung dieser Datei.');
  }
});

test('[Negativprobe] der Wächter feuert wirklich, wenn ein Marker verschwindet', () => {
  const src = fs.readFileSync(HTML, 'utf8');
  assert.equal(pruefe(src).length, 0, 'Vorbedingung: der echte Bestand ist sauber');

  // Rot-Beweis: EINEN Marker aus einer Kopie des Quelltexts entfernen — derselbe Kunstgriff wie
  // in tests/b16-113-… (Mutation an einer echten Kopie, kein zweiter Parser).
  const mitLuecke = src.replace('anlassPdfAusgeben(a.datensatz, dateiBasis)', '/* entfernt für die Probe */');
  assert.notEqual(mitLuecke, src, 'Vorbedingung: die Ersetzung muss wirklich greifen');
  const fehlend = pruefe(mitLuecke);
  assert.equal(fehlend.length, 1, 'genau EIN Marker sollte fehlen, nicht mehr und nicht weniger');
  assert.match(fehlend[0], /Anlass-Export/, 'der Fehlschlag muss den richtigen Weg benennen');
});
