'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ausgabewege-einordnung.js — jeder Ausgabeweg des Kerns mit seiner Klasse
   (MyTerms v1-Schnitt, Teil D, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   „Erst vereinbaren, dann der Auszug" gilt nur für die Weitergabe an Dritte. Welche Ausgabe
   das ist, steht HIER, als benannte Tabelle mit Grund — nicht verstreut an den Aufrufstellen.

   KLASSEN
     weitergabe        ein Auszug geht an eine Stelle            → gesperrt, wenn eine Bedingung festgelegt ist
     eigene-sicherung  die Person sichert ihr eigenes Depot       → nie gesperrt
     notfall           schützt im Notfall Leben oder Vertretung   → nie gesperrt, ausdrücklich
     vereinbarung      das Angebot selbst: nur Kennungen, Quellen, Prüfsummen  → nie gesperrt, es ist der Weg zur Vereinbarung
     kein-ausgabeweg   der Fund ist die Senke selbst oder eine Vorschau, nichts verlässt das Gerät

   `sperreIn` (nur weitergabe): die Funktion(en), die die Sperre tragen, wenn der Fund selbst ein innerer
   Baustein ist, der von gesperrten Wegen gerufen wird. Ohne Angabe trägt die Funktion sie selbst.

   Alle Zeilen bestätigt (16.09.2026). Der Wächter (tools/ausgabewege-pruefen.js) prüft beide Richtungen: ein Fund ohne
   Zeile ist rot, eine Zeile ohne Fund ist rot.
   ════════════════════════════════════════════════════════════════════════════ */
const KLASSEN = Object.freeze(['weitergabe', 'eigene-sicherung', 'notfall', 'vereinbarung', 'kein-ausgabeweg']);

const AUSGABEWEGE_EINORDNUNG = Object.freeze({
  dateiAusgeben: { klasse: 'kein-ausgabeweg', grund: 'die gemeinsame Senke (Teilen oder Download); eingeordnet werden ihre Aufrufer' },
  _vereinbarungAngebotSichern: { klasse: 'vereinbarung', grund: 'das Angebot an die Stelle; trägt keine Depot-Daten und ist der Weg zur Vereinbarung selbst' },
  _vereinbarungBegleitdateiSichern: { klasse: 'vereinbarung', grund: 'die Vereinbarung als Begleitdatei zum Auszug; trägt nur Kennungen, Prüfsummen und den Stand, kein Depot-Feld' },
  flowMappeVorschau: { klasse: 'kein-ausgabeweg', grund: 'Objekt-URL für die PDF-Vorschau im eigenen Fenster, keine Datei' },

  _depotBlobSpeichern: { klasse: 'eigene-sicherung', grund: 'die verschlüsselte Depot-Datei der Person' },
  _dateizielFuerAnlegenSichern: { klasse: 'eigene-sicherung', grund: 'Speicherort der eigenen Depot-Datei beim Anlegen' },
  _subSelbstDateiSichern: { klasse: 'eigene-sicherung', grund: 'die eigene, verschlüsselte Sub-Depot-Datei' },
  flowMappeOriginalHerunterladen: { klasse: 'eigene-sicherung', grund: 'das Recht der Person auf ihre Daten: das Original unverändert heraus (Yellow Button Herunterladen)' },
  flowMappeEigenesHerunterladen: { klasse: 'eigene-sicherung', grund: 'das Recht der Person auf ihre Daten: der eigene Upload unverändert zurück (Yellow Button Herunterladen)' },
  dokumentOeffnen: { klasse: 'eigene-sicherung', grund: 'ein Vorsorgedokument muss gedruckt und unterschrieben werden können; eine Sperre behinderte seine Wirksamkeit' },
  flowDokumentDateiSichern: { klasse: 'eigene-sicherung', grund: 'dasselbe Vorsorgedokument als PDF; eine Sperre behinderte seine Wirksamkeit' },
  flowVollDepotPdf: { klasse: 'eigene-sicherung', grund: 'das ganze Depot als lesbare Sicherung der Person' },
  uebergabeWiderrufPdfErzeugen: { klasse: 'eigene-sicherung', grund: 'Widerruf gegenüber einer Stelle; gesperrt würde das Zurücknehmen selbst, und er trägt keine Depot-Felder' },

  flowNotfallkartePdf: { klasse: 'notfall', grund: 'Notfallkarte' },
  notfallblattOeffnen: { klasse: 'notfall', grund: 'Notfallblatt zum Drucken' },
  hilfeOeffnen: { klasse: 'kein-ausgabeweg', grund: 'Bedienungsanleitung zum Ansehen und Drucken (U2-ADR-425): reiner Anleitungstext, kein Depot-Feld, kein Auszug an eine Stelle' },
  blackboxHerunterladen: { klasse: 'notfall', grund: 'versiegeltes Sub-Depot an die Vertretung, ohne es zu öffnen; Vertretung im Ernstfall' },

  flowGesundheitFhirExport: { klasse: 'weitergabe', grund: 'FHIR-IPS-Auszug an eine Stelle' },
  _formatExportDownload: { klasse: 'weitergabe', grund: 'Auszug in einem Registry-Format (vCard, ICS, JSON …)' },
  flowAnlassExport: { klasse: 'weitergabe', grund: 'Anlass-Auszug' },
  anlassPdfAusgeben: { klasse: 'weitergabe', sperreIn: ['flowAnlassExport', 'flowZusammenstellungHerausgeben'], grund: 'Anlass-Auszug als PDF, innerer Baustein beider Herausgabe-Wege' },
  flowZusammenstellungHerausgeben: { klasse: 'weitergabe', grund: 'eigene Zusammenstellung herausgeben' },
  flowBereichPdf: { klasse: 'weitergabe', grund: 'Bereichs-Auszug als PDF' },
  flowSituationPdf: { klasse: 'weitergabe', grund: 'Situationsblatt als PDF für Beteiligte' },
  flowShlVorbereiten: { klasse: 'weitergabe', grund: 'SMART Health Link' },
  _eudiwAusgeben: { klasse: 'weitergabe', grund: 'SD-JWT VC für eine Wallet oder Stelle' },
  _anfrageAntwortSchreiben: { klasse: 'weitergabe', grund: 'Antwort auf die Anfrage einer Stelle' },
  empfaengerDateiHerausgeben: { klasse: 'weitergabe', grund: 'Ausschnitt-Datei für einen Empfängerkreis' },
  flowErbscheinXmlSichern: { klasse: 'weitergabe', grund: 'Erbschein-Vorbereitung für das Nachlassgericht' },
});

module.exports = { KLASSEN, AUSGABEWEGE_EINORDNUNG };
