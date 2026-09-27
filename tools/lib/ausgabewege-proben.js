'use strict';
/* ═══════════════════════════════════════════════════════
   Ausgabewege ↔ Proben am erzeugten Artefakt (AUS1, 19.09.2026)
   ───────────────────────────────────────────────────────
   Das INVENTAR der Wege steht in tools/lib/ausgabewege-einordnung.js (jede Stelle im Kern, an der etwas
   das Gerät verlassen kann; Wächter tools/ausgabewege-pruefen.js). Diese Datei bindet jeden Weg an seine
   PROBE AM ARTEFAKT: eine Probe, die die herausgegebene Datei/das Blatt liest — mit einem Fremdwerkzeug
   oder einer Struktur- und Inhaltsprüfung gegen das Depot —, nicht bloß „die Funktion läuft".

   Je Weg GENAU EINES von:
     proben: [{ datei, titel }]   Test und Titelanfang (der Wächter findet den Titel im Quelltext der Datei)
     luecke: 'Grund'              benannt, gezählt, darf nur sinken (Deckel im Wächter)
   und immer `fremd`: womit das Artefakt gelesen wird („poppler", „xmllint", „vcard-parser + ical.js",
   „eigener Umschlag-Rundlauf" …) — oder warum kein Fremdwerkzeug existiert.

   Für die Registry-Formate (EXPORT_FORMATE) steht die Bindung unten in FORMATE.
   ═══════════════════════════════════════════════════════ */
const PDF = 'tests/ausgabewege-artefakte-pdf.test.js';
const DATEI = 'tests/ausgabewege-artefakte-dateien.test.js';

const WEGE = Object.freeze({
  flowVollDepotPdf: { fremd: 'poppler (pdfinfo, pdftotext)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·flowVollDepotPdf]' }] },
  flowBereichPdf: { fremd: 'poppler (pdfinfo, pdftotext)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·flowBereichPdf]' }] },
  flowSituationPdf: { fremd: 'poppler (pdfinfo, pdftotext)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·flowSituationPdf]' }] },
  flowNotfallkartePdf: { fremd: 'poppler (pdfinfo, pdftotext)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·flowNotfallkartePdf]' }] },
  flowDokumentDateiSichern: { fremd: 'poppler (pdfinfo, pdftotext)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·flowDokumentDateiSichern]' }] },
  anlassPdfAusgeben: { fremd: 'poppler (pdfinfo, pdftotext)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·anlassPdfAusgeben]' }] },
  uebergabeWiderrufPdfErzeugen: { fremd: 'poppler (pdfinfo, pdftotext, pdfimages für den QR)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·uebergabeWiderrufPdfErzeugen]' }] },
  flowAnlassExport: { fremd: 'JSON-Parser (die Datei), poppler (das PDF daneben)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·anlassPdfAusgeben]' }] },
  _formatExportDownload: { fremd: 'siehe FORMATE je Format (JSON-Parser, xmllint/vcard-parser/ical.js je nach Art)', proben: [{ datei: DATEI, titel: '[Ausgabeweg·Datei·_formatExportDownload]' }] },
  flowGesundheitFhirExport: { fremd: 'JSON-Parser + Verweis-Auflösung; HL7-Validator in tests/konformitaet/externe-validatoren.mjs', proben: [{ datei: DATEI, titel: '[Ausgabeweg·Datei·flowGesundheitFhirExport]' }] },
  flowErbscheinXmlSichern: { fremd: 'xmllint (Wohlgeformtheit, Wurzel)', proben: [{ datei: DATEI, titel: '[Ausgabeweg·Datei·flowErbscheinXmlSichern]' }] },
  notfallblattOeffnen: { fremd: 'keiner (HTML-Druckblatt, Struktur- und Geheimnisprüfung)', proben: [{ datei: DATEI, titel: '[Ausgabeweg·Druck·notfallblattOeffnen]' }] },
  dokumentOeffnen: { fremd: 'keiner (HTML-Druckansicht; Byte-Gleichheit gegen das eingefrorene Dokument)', proben: [{ datei: 'tests/k8-byte-gleichheit.test.js', titel: "[K8·Byte-Gleichheit] PV" }] },
  flowShlVorbereiten: { fremd: 'eigener Rundlauf: JWE (dir/A256GCM) wird entschlüsselt und ist byte-gleich zum Original', proben: [{ datei: 'tests/shl-provider.test.js', titel: '[U2-ADR-047] JWE round-trip' }] },
  _eudiwAusgeben: { fremd: 'eigener Rundlauf: SD-JWT-VC-Disclosures dekodieren, Digests gegen Referenz-SHA-256', proben: [{ datei: 'tests/eudiw-uebergabe.test.js', titel: '4) Disclosures dekodieren' }] },
  _anfrageAntwortSchreiben: { fremd: 'die Lese-App entschlüsselt (Umschlag-Rundlauf, Einmalpasswort und Schlüsselpaar)', proben: [{ datei: 'tests/kette-08-der-rueckweg.test.js', titel: '[Kette 08 · Zug 1 · tragend] Einmalpasswort' }] },
  empfaengerDateiHerausgeben: { fremd: 'eigener Rundlauf: der Empfänger öffnet die Datei mit seinem Passwort', proben: [{ datei: 'tests/empfaengerkreise-fach-in-der-datei.test.js', titel: '[Fach·Datei] ein Empfänger öffnet DIE DATEI' }] },
  blackboxHerunterladen: { fremd: 'eigener Rundlauf: die Datei öffnet mit dem Passwort der Inhaberin, ohne Sub-Schlüssel', proben: [{ datei: 'tests/blackbox-export.test.js', titel: '[Klasse-A] Empfänger-Roundtrip' }] },
  _depotBlobSpeichern: { fremd: 'eigener Rundlauf: verschlüsseln, entschlüsseln, vollständiges Depot; Magic-Kopf und nur Chiffrat an der geschriebenen Datei', proben: [{ datei: 'tests/golden-master-ausgabewege.test.js', titel: '[Golden-Master · Vorpruefung] der Datei-Rundlauf' }, { datei: DATEI, titel: '[Ausgabeweg·Datei·_dateizielFuerAnlegenSichern]' }] },
  flowMappeOriginalHerunterladen: { fremd: 'Byte-Vergleich (SHA-256) gegen die Originaldatei', proben: [{ datei: 'tests/original-byte-treu-bom.test.js', titel: '[U2-ADR-233] BOM-behaftete eu-lab-Datei: Original-Download' }] },
  _vereinbarungAngebotSichern: { fremd: 'keiner (eigenes Text-Format; Inhaltsprüfung: nur Kennungen, Quellen, Prüfsummen)', proben: [{ datei: 'tests/vereinbarung-angebot-antwort.test.js', titel: '[Angebot] Text-Hin-und-Rückweg' }] },
  _vereinbarungBegleitdateiSichern: { fremd: 'keiner (eigenes Format; Prüfsumme gegen das Protokoll, kein Depot-Feld)', proben: [{ datei: 'tests/vereinbarung-bedingung-reist-mit.test.js', titel: '[Begleitdaten] dieselbe Prüfsumme' }] },
  _dateizielFuerAnlegenSichern: { fremd: 'eigener Rundlauf: die geschriebene Datei wird mit dem Passwort geöffnet (Magic-Kopf, nur Chiffrat, falsches Passwort scheitert)', proben: [{ datei: DATEI, titel: '[Ausgabeweg·Datei·_dateizielFuerAnlegenSichern]' }] },
  _subSelbstDateiSichern: { fremd: 'eigener Rundlauf: die Datei öffnet mit dem (neuen) Passwort; unverändert bzw. neu verschlüsselt; nur Chiffrat', proben: [{ datei: DATEI, titel: '[Ausgabeweg·Datei·_subSelbstDateiSichern]' }] },
  flowMappeEigenesHerunterladen: { fremd: 'Byte-Vergleich gegen die hochgeladene Datei', proben: [{ datei: DATEI, titel: '[Ausgabeweg·Datei·flowMappeEigenesHerunterladen]' }] },
  flowZusammenstellungHerausgeben: { fremd: 'JSON-Parser (die Datei) + poppler (das PDF daneben)', proben: [{ datei: PDF, titel: '[Ausgabeweg·PDF·flowZusammenstellungHerausgeben]' }] },
});

/* Die Registry-Formate (EXPORT_FORMATE): die Probe am Inhalt jedes Formats, plus wie es gelesen wird. */
const FORMAT_DATEI = 'tests/ausgabewege-artefakte.test.js';
const FORMATE = Object.freeze({
  'fhir-ips': { fremd: 'JSON-Parser + Verweis-Auflösung; HL7-Validator (tests/konformitaet/externe-validatoren.mjs)', titel: '[Ausgabeweg·Format·fhir-ips]' },
  'sd-jwt-vc-identitaet': { fremd: 'JSON-Parser; Struktur (vct/iss/iat/claims)', titel: '[Ausgabeweg·Format·sd-jwt-vc-identitaet]' },
  'sd-jwt-vc-finanzen': { fremd: 'JSON-Parser; _sd_felder gegen claims', titel: '[Ausgabeweg·Format·sd-jwt-vc-finanzen]' },
  'sd-jwt-vc-sozialversicherung': { fremd: 'JSON-Parser; mit/ohne Freigabe', titel: '[Ausgabeweg·Format·sd-jwt-vc-sozialversicherung]' },
  'xoev-verwaltung': { fremd: 'JSON-Parser (das Format ist JSON, kein XML)', titel: '[Ausgabeweg·Format·xoev-verwaltung]' },
  'fim-json': { fremd: 'JSON-Parser', titel: '[Ausgabeweg·Format·fim-json]' },
  'edci-bildung': { fremd: 'JSON-Parser', titel: '[Ausgabeweg·Format·edci-bildung]' },
  'vcard-identitaet': { fremd: 'vcard-parser (tests/mit-modul/ausgaenge-fremdparser-pruefen.test.js) + RFC-6350-Struktur', titel: '[Ausgabeweg·Format·vcard-identitaet]' },
  'vcard-menschen': { fremd: 'vcard-parser (tests/mit-modul/ausgaenge-fremdparser-pruefen.test.js) + Karten je Person', titel: '[Ausgabeweg·Format·vcard-menschen]' },
  'ics-vorsorge': { fremd: 'ical.js (tests/mit-modul/ausgaenge-fremdparser-pruefen.test.js) + RFC-5545-Struktur', titel: '[Ausgabeweg·Format·ics-vorsorge]' },
});

module.exports = { WEGE, FORMATE, FORMAT_DATEI };
