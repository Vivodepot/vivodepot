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

   `nachfrage` (nur weitergabe, 25.10.2026, Pro: „Herausgegeben“ auf allen Wegen): wo die freiwillige Nachfrage nach einem
   Eintrag in „Herausgegeben“ steht — 'selbst' oder { in: [Einstiege] } wie bei `sperreIn`, oder { ohne: Grund } als
   Ausnahme mit Wort. Die Notfall-Wege fragen nie.

   `zweck` (nur weitergabe, B23-Z2): der STRINGS-Schlüssel der vorbelegten Zweck-Angabe; der Kern ordnet
   die Weg-Kennungen in HERAUSGABE_ZWECK_WEGE diesen Schlüsseln zu (herausgabeZweckVorschlag), ein Wächter in tests/ hält beide Seiten zusammen.

   `standard` und `pdf` (nur weitergabe, 10.11.2026): jede Ausgabe an eine Stelle geht maschinenlesbar im anwendbaren Standard
   und als PDF hinaus. `standard`: { register: '<id>' } (Zeile in tools/standards-register/), { formate: true } (je Format der
   Registry), { wie: '<Weg>' } (innerer Baustein), { keiner: '<Registerzeile>', eigenes: 'selbst' | { in: [Einstiege] } } (gesucht und nichts gefunden)
   oder { fehlt: '<Grund>' }. Dazu optional `je: { <Fall>: { register: '<id>' } }` (12.11.2026): die Fälle eines Wegs, die schon im
   Standard ausgeben, z. B. je Anlass (Katalog: anlass.ausgabe der Situation); die übrigen Fälle trägt die Angabe daneben. `pdf`: 'selbst', { in: [Einstiege] }, { wie: '<Weg>' }
   oder { fehlt: '<Grund>' }. Jedes `fehlt` steht einzeln in tools/ausgabe-grundsatz-grundlinie.json, die nur kürzer werden darf.

   Alle Zeilen bestätigt (16.09.2026). Der Wächter (tools/ausgabewege-pruefen.js) prüft beide Richtungen: ein Fund ohne
   Zeile ist rot, eine Zeile ohne Fund ist rot.
   ════════════════════════════════════════════════════════════════════════════ */
const KLASSEN = Object.freeze(['weitergabe', 'eigene-sicherung', 'notfall', 'vereinbarung', 'kein-ausgabeweg']);

const AUSGABEWEGE_EINORDNUNG = Object.freeze({
  dateiAusgeben: { klasse: 'kein-ausgabeweg', grund: 'die gemeinsame Senke (Teilen oder Download); eingeordnet werden ihre Aufrufer' },
  podAblegen: { klasse: 'kein-ausgabeweg', grund: 'die gemeinsame Senke „Im Pod ablegen“ (Nachtrag zu U2-ADR-512): dieselben Bytes wie der Datei-Weg an die feste Herkunft der Pod-Brücke; eingeordnet werden ihre Aufrufer (_shlDialogZeigen, empfaengerDateiHerausgeben) wie bei dateiAusgeben' },
  shlHolen: { klasse: 'kein-ausgabeweg', grund: 'Empfang eines Freigabe-Links (Nachtrag zu U2-ADR-183): an die feste Herkunft der Abhol-Seite gehen nur Adresse und Flag des eingefügten Links, kein Depot-Inhalt und kein Schlüssel; zurück kommt nur das Chiffrat' },
  _vereinbarungAngebotZeigen: { klasse: 'vereinbarung', grund: 'das Angebot an die Stelle als QR-Code; trägt nur Kennungen, Quellen und Prüfsummen, kein Depot-Feld' },
  _vereinbarungAngebotSichern: { klasse: 'vereinbarung', grund: 'das Angebot an die Stelle; trägt keine Depot-Daten und ist der Weg zur Vereinbarung selbst' },
  _vereinbarungBegleitdateiSichern: { klasse: 'vereinbarung', grund: 'die Vereinbarung als Begleitdatei zum Auszug; trägt nur Kennungen, Prüfsummen und den Stand, kein Depot-Feld' },
  _swAktivierenWennMoeglich: { klasse: 'kein-ausgabeweg', grund: 'Nachricht an den eigenen Service Worker; die Nutzlast ist die Konstante { type: \'SKIP_WAITING\' }, kein Depot-Feld (Probe: einer nicht öffentlichen Probe, G2)' },

  _depotBlobSpeichern: { klasse: 'eigene-sicherung', grund: 'die verschlüsselte Depot-Datei der Person' },
  _dateizielFuerAnlegenSichern: { klasse: 'eigene-sicherung', grund: 'Speicherort der eigenen Depot-Datei beim Anlegen' },
  migrationFehlerBeschreibungSpeichern: { klasse: 'eigene-sicherung', grund: 'die Fehlerbeschreibung nach einem Migrationswurf: ohne Depot-Inhalte, die Person speichert sie selbst; im Moment der Panne darf nichts sperren' },
  _subSelbstDateiSichern: { klasse: 'eigene-sicherung', grund: 'die eigene, verschlüsselte Sub-Depot-Datei' },
  _kindDateiOrtWaehlen: { klasse: 'eigene-sicherung', grund: 'Speicherort der Kind-Datei wählen; dorthin schreibt danach jedes Sichern der Sitzung das versiegelte Depot der vertretenen Person (U2-ADR-454)' },
  flowMappeOriginalHerunterladen: { klasse: 'eigene-sicherung', grund: 'das Recht der Person auf ihre Daten: das Original unverändert heraus (Yellow Button Herunterladen)' },
  flowMappeEigenesHerunterladen: { klasse: 'eigene-sicherung', grund: 'das Recht der Person auf ihre Daten: der eigene Upload unverändert zurück (Yellow Button Herunterladen)' },
  dokumentOeffnen: { klasse: 'eigene-sicherung', grund: 'ein Vorsorgedokument muss gedruckt und unterschrieben werden können; eine Sperre behinderte seine Wirksamkeit' },
  flowDokumentDateiSichern: { klasse: 'eigene-sicherung', grund: 'dasselbe Vorsorgedokument als PDF; eine Sperre behinderte seine Wirksamkeit' },
  flowVollDepotPdf: { klasse: 'eigene-sicherung', grund: 'das ganze Depot als lesbare Sicherung der Person' },
  uebergabeWiderrufPdfErzeugen: { klasse: 'eigene-sicherung', grund: 'Widerruf gegenüber einer Stelle; gesperrt würde das Zurücknehmen selbst, und er trägt keine Depot-Felder' },

  flowNotfallkartePdf: { klasse: 'notfall', grund: 'Notfallkarte' },
  flowNotfallQR: { klasse: 'notfall', grund: 'die Notfall-Kontakte als QR-Code (vCard) zum Ausdrucken' },
  notfallblattOeffnen: { klasse: 'notfall', grund: 'Notfallblatt zum Drucken' },
  _codeblattOeffnen: { klasse: 'notfall', grund: 'Code-Blatt zum Drucken, OHNE den Code (U2-ADR-430, Nachtrag Ziffer 3)' },
  hilfeOeffnen: { klasse: 'kein-ausgabeweg', grund: 'Bedienungsanleitung zum Ansehen und Drucken (U2-ADR-425): reiner Anleitungstext, kein Depot-Feld, kein Auszug an eine Stelle' },
  blackboxHerunterladen: { klasse: 'notfall', grund: 'versiegeltes Sub-Depot an die Vertretung, ohne es zu öffnen; Vertretung im Ernstfall' },

  flowGesundheitFhirExport: { klasse: 'weitergabe', standard: { register: 'ips' }, pdf: { in: ['herausgabeFormStarten'] }, zweck: 'herausgabeZweckVorschlagFhirIps', nachfrage: 'selbst', grund: 'FHIR-IPS-Auszug an eine Stelle' },
  flowGespraechsblatt: { klasse: 'weitergabe', standard: { fehlt: 'kein Standard benannt, das Blatt geht nur zum Drucken hinaus' }, pdf: { fehlt: 'Blatt zum Drucken, keine eigene PDF-Datei' }, zweck: 'herausgabeZweckVorschlagGespraech', nachfrage: 'selbst', grund: 'Blatt mit offenen Fragen an genau einen Adressaten, zum Mitnehmen ins Gespräch (U2-ADR-523)' },
  flowIsikExport: { klasse: 'weitergabe', standard: { register: 'isik-dokumente' }, pdf: { in: ['herausgabeFormStarten'] }, zweck: 'herausgabeZweckVorschlagIsik', nachfrage: 'selbst', grund: 'Vollmacht (Urschrift) und IPS als ISiK-DocumentReferences an ein Krankenhaus; hinter dem Tor der Anzeigetexte (U2-ADR-468)' },
  flowKbvPkaExport: { klasse: 'weitergabe', standard: { register: 'kbv-mio-pka' }, pdf: { in: ['herausgabeFormStarten'] }, zweck: 'herausgabeZweckVorschlagKbvPka', nachfrage: 'selbst', grund: 'Vorsorgevollmacht als DPE-Bundle der KBV-Patientenkurzakte an eine Arztpraxis; Freigabe der sensiblen Felder und MyTerms vor der Datei (U2-ADR-471)' },
  flowMappeVerwahrungHerunterladen: { klasse: 'weitergabe', standard: { register: 'verwahrungsnachweis' }, pdf: { fehlt: 'in der Vorschau der Mappe steht kein PDF daneben' }, zweck: 'herausgabeZweckVorschlagVerwahrung', nachfrage: 'selbst', grund: 'das Original mit Verwahrungsnachweis an eine Stelle; die Hülle trägt Name und Kennung der Person (U2-ADR-444)' },
  flowMappeEuLabDerPersonHerunterladen: { klasse: 'weitergabe', standard: { register: 'eu-lab' }, pdf: { fehlt: 'in der Vorschau der Mappe steht kein PDF daneben' }, zweck: 'herausgabeZweckVorschlagEuLab', nachfrage: 'selbst', grund: 'ein eingelesener EU-Laborbefund als eigenes EU-Labordokument der Person an eine Stelle; trägt den Befund (K18, Nachtrag U2-ADR-444)' },
  _formatExportDownload: { klasse: 'weitergabe', standard: { formate: true }, pdf: { in: ['herausgabeFormStarten'] }, zweck: 'herausgabeZweckVorschlagFormat', nachfrage: 'selbst', grund: 'Auszug in einem Registry-Format (vCard, ICS, JSON …)' },
  flowAnlassExport: { klasse: 'weitergabe', standard: { keiner: 'vivodepot-anlass', eigenes: 'selbst', je: { arzt: { register: 'ips' } } }, pdf: 'selbst', zweck: 'herausgabeZweckVorschlagAnlass', nachfrage: 'selbst', grund: 'Anlass-Auszug' },
  anlassPdfAusgeben: { klasse: 'weitergabe', standard: { wie: 'flowAnlassExport' }, pdf: 'selbst', zweck: 'herausgabeZweckVorschlagAnlass', nachfrage: { in: ['flowAnlassExport', 'flowZusammenstellungHerausgeben'] }, sperreIn: ['flowAnlassExport', 'flowZusammenstellungHerausgeben'], grund: 'Anlass-Auszug als PDF, innerer Baustein beider Herausgabe-Wege' },
  flowZusammenstellungHerausgeben: { klasse: 'weitergabe', standard: { keiner: 'vivodepot-anlass', eigenes: 'selbst' }, pdf: 'selbst', zweck: 'herausgabeZweckVorschlagZusammenstellung', nachfrage: 'selbst', grund: 'eigene Zusammenstellung herausgeben' },
  flowBereichPdf: { klasse: 'weitergabe', standard: { formate: true }, pdf: 'selbst', zweck: 'herausgabeZweckVorschlagBereichPdf', nachfrage: 'selbst', grund: 'Bereichs-Auszug als PDF' },
  flowSituationPdf: { klasse: 'weitergabe', standard: { fehlt: 'nur PDF, Standard je Situation offen' }, pdf: 'selbst', zweck: 'herausgabeZweckVorschlagSituationPdf', nachfrage: 'selbst', grund: 'Situationsblatt als PDF für Beteiligte' },
  _shlDialogZeigen: { klasse: 'weitergabe', standard: { register: 'smart-health-links' }, pdf: { fehlt: 'aus der Mappe ohne PDF daneben; die anderen Einstiege haben es' }, zweck: 'herausgabeZweckVorschlagLink', nachfrage: { in: ['flowShlVorbereiten', 'flowLinkSenden'] }, sperreIn: ['flowShlVorbereiten', 'flowLinkSenden'], grund: 'SMART Health Link und „Link senden“ (L1b): die JWE-Datei oder der Link, ein Dialog für beide Aufrufer' },
  _shlLinkKopierenUndQr: { klasse: 'weitergabe', standard: { wie: '_shlDialogZeigen' }, pdf: { wie: '_shlDialogZeigen' }, zweck: 'herausgabeZweckVorschlagLink', nachfrage: { in: ['flowShlVorbereiten', 'flowLinkSenden'] }, sperreIn: ['flowShlVorbereiten', 'flowLinkSenden'], grund: '„Link kopieren“ (Zwischenablage, nur auf Klick) und der QR desselben Links, innerer Baustein des Dialogs' },
  _eudiwAusgeben: { klasse: 'weitergabe', standard: { register: 'sd-jwt-vc' }, pdf: { in: ['herausgabeFormStarten'] }, zweck: 'herausgabeZweckVorschlagWallet', nachfrage: 'selbst', grund: 'SD-JWT VC für eine Wallet oder Stelle' },
  _anfrageAntwortSchreiben: { klasse: 'weitergabe', standard: { fehlt: 'eigene verschlüsselte Antwort; eine Standarddatei nur, wenn die Anfrage ein Format nennt' }, pdf: { fehlt: 'die Antwort trägt kein PDF' }, zweck: 'herausgabeZweckVorschlagAnfrageAntwort', nachfrage: 'selbst', grund: 'Antwort auf die Anfrage einer Stelle' },
  empfaengerDateiHerausgeben: { klasse: 'weitergabe', standard: { fehlt: 'eigener verschlüsselter Container' }, pdf: { fehlt: 'der Container trägt kein PDF' }, zweck: 'herausgabeZweckVorschlagEmpfaengerkreis', nachfrage: { in: ['flowEmpfaengerkreisDatei'] }, grund: 'Ausschnitt-Datei für einen Empfängerkreis' },
  // G2 (TOR-IN-DER-DEFINITION, 26.09.2026): QR-Code, Zwischenablage und postMessage sind Senken; diese vier Funde kamen dazu.
  _empfaengerQrErgebnisModal: { klasse: 'weitergabe', standard: { wie: 'empfaengerDateiHerausgeben' }, pdf: { wie: 'empfaengerDateiHerausgeben' }, zweck: 'herausgabeZweckVorschlagEmpfaengerkreis', nachfrage: { in: ['flowEmpfaengerkreisQr'] }, grund: 'derselbe Empfängerkreis-Ausschnitt wie die Datei, als QR-Code mit Lese-URL', sperreIn: ['empfaengerQrHerausgeben'] },
  flowErbscheinXmlSichern: { klasse: 'weitergabe', standard: { fehlt: 'eigenes XML, anwendbar ist XJustiz (Registerzeile xjustiz-erbschein)' }, pdf: { in: ['flowDokumentDateiSichern'] }, zweck: 'herausgabeZweckVorschlagErbschein', nachfrage: 'selbst', grund: 'Erbschein-Vorbereitung für das Nachlassgericht' },
});

module.exports = { KLASSEN, AUSGABEWEGE_EINORDNUNG };
