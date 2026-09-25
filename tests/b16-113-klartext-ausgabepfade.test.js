'use strict';
/* ════════════════════════════════════════════════════════════════════════
   B16-113 — Kein Klartext außerhalb der erlaubten Ausschnitte (U2-ADR-097 §5).
   ────────────────────────────────────────────────────────────────────────
   Die Leck-Grenze ist die eine Ausgabefunktion `dateiAusgeben`. Statisch prüfbar
   über eine ERLAUBNISLISTE der Ausgabepfade: jeder `dateiAusgeben`-Aufrufer ist
   klassifiziert — entweder ein A2-entschiedener Klartext-Pfad (Feld-Grenze bzw.
   Two-Step) oder ein Nur-Chiffrat-Pfad. Ein NEUER, nicht registrierter Aufrufer
   bricht die Zahl → er muss zuerst klassifiziert werden. Damit kann kein Klartext-
   Ausgabepfad still hinzukommen.

   A2-als-Code (25.07.), gebunden über das Fundament (U2-ADR-098 + Nachtrag).
   Datenstruktur = diese Registry; die statische Prüfung ist die Zähl-/Marker-Grenze,
   nicht der inhaltliche Beweis je Pfad (der Feld-für-Feld-Beweis liegt an den
   pfad-eigenen Prüfungen: NOTFALL_KERN_FELDER, EXPORT_FORMATE, f.sensibel/Two-Step).
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-097';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = ['b16-113-kein-unregistrierter-klartext-ausgeber'];

const HTML = path.join(__dirname, '..', 'vivodepot.html');

// ── Erlaubnisliste der Ausgabepfade (dateiAusgeben-Aufrufer), aus der A2-Entscheidung ──
// Nur-Chiffrat: was das Gerät verlässt, ist Chiffrat — nie lesbare Bürgerdaten (distinktive Marker).
const NUR_CHIFFRAT = [
  { marker: "'application/octet-stream'", pfad: '.vivodepot-Sicherung — nur Chiffrat (AES-GCM, depotHerunterladen)' },
  /* 10.09.2026 („White Label bis ins PDF"): der Marker war `'Vivodepot-Sub_'` — der
     Präfix ist seit Zug 2 über `_dateiNamePraefix()` markenabhängig (`_dateiNamePraefix() +
     '-Sub_' + ...`), das feste, verbleibende Suffix ist `'-Sub_'` allein. Drei Aufrufstellen,
     alle derselbe Sub-Depot-Blackbox — geprüft, kommt sonst nirgends im Kern vor. */
  { marker: "'-Sub_'",                    pfad: 'Sub-Depot-Blackbox — versiegelter Umschlag verbatim' },
  { marker: "'application/jose'",          pfad: 'SHL-JWE — verschlüsselt, kein Auto-Upload' },
  /* Kette, Auftrag 8 (20.08.2026): die Antwort auf eine Anfrage. Der Marker ist der
     Dateiname-Präfix des EINEN Ausgabewegs (`_anfrageAntwortSchreiben`) — er kommt genau
     dort vor und nirgends sonst, und er verschwindet, wenn der Weg entfällt oder ersetzt
     wird. Der Umschlag selbst trägt jeden Feldwert in `ct` (AES-256-GCM).
     (10.09.2026): der Präfix ist seit Zug 2 über `_dateiNamePraefix()` markenabhängig
     (`_dateiNamePraefix() + '_Antwort_' + ...`) — das feste, verbleibende Suffix ist
     `'_Antwort_'` allein, geprüft einmalig im Kern. */
  { marker: "'_Antwort_'",                pfad: 'Antwort auf eine Anfrage — AES-256-GCM, Feldwerte nur im ct' },
  /* Empfängerkreise (U2-ADR-156, 21.08.2026): der Ausschnitt für einen Empfänger. Der Marker ist
     der Dateiname-Präfix des EINEN Ausgabewegs (`empfaengerDateiname`). Die Datei ist eine
     REGULÄRE v4-Depot-Datei — jeder Feldwert liegt in einer eigenen AES-GCM-Einheit, im Klartext
     stehen nur Krypto-Parameter und die neutrale Fachkennung. Sie geht durch denselben
     Schreibweg (`_zerfallSchreiben`) wie das Depot selbst; ein Klartext-Feld gäbe es dort nur,
     wenn es das Depot selbst hätte. */
  { marker: "'vivodepot-fuer-'",          pfad: 'Empfänger-Ausschnitt — reguläre v4-Datei, Werte nur in den Einheiten' },
];
// Erlaubte Klartext-Pfade (A2 entschieden: Feld-Grenze bzw. Two-Step): FHIR-IPS, Registry-Export,
// Notfallkarte-PDF, DOCX, Bereichs-PDF, Voll-Depot-PDF, Situations-PDF, Mappe-Original-Durchreiche,
// EUDIW-SD-JWT + EUDIW-Abruf, Übergabe-Widerruf-PDF (U2-ADR-120 Zug 7 — trägt nur, was die Bürgerin
// selbst als Empfänger/Zweck eingetragen hat, plus Kennung/Datum; kein Geheimnis, kein Schlüssel),
// Mappe-EIGENE-Durchreiche (Zug 4b, Auftrag „Erfolg ohne Wirkung" 08.08.2026 — flowMappeEigenesHerunterladen:
// dieselbe Data-URL, die die Vorschau schon zeigt, geht unverändert als Datei heraus; kein Geheimnis,
// kein Schlüssel, dieselbe Klasse wie die bereits erlaubte Mappe-Original-Durchreiche).
// S9-Dokument-Datei-Sichern (Auftrag K8/S9, 09.08.2026, flowDokumentDateiSichern): PV/Vollmacht/
// Betreuungsverfügung/KI-Verfügung als PDF („Nur PDF", 10.08.2026: der frühere HTML-Weg
// ist entfallen, der dateiAusgeben-Aufrufer selbst blieb derselbe, s. dort) — trägt nur Bausteine,
// die die Bürgerin selbst im Wizard/Sektor angekreuzt/eingetragen hat, dieselbe Klasse wie
// Situations-PDF/Bereichs-PDF (ihr eigener, bereits im Overlay sichtbarer Text), kein Geheimnis,
// kein Schlüssel.
// Anlass-Ausgabe (Kette, Auftrag 3, 20.08.2026, flowAnlassExport): der Datensatz EINES Anlasses —
// genau die Felder, die die Bürgerin im Opt-out-Dialog vor sich gesehen und stehen gelassen hat,
// mit derselben Sensibel-Zurückhaltung wie jeder Bereichs-Export. Kein Geheimnis, kein Schlüssel;
// dieselbe Klasse wie Situations-PDF und Bereichs-PDF, nur bereichsübergreifend statt an EINEM
// Bereich. Die Feld-Grenze ist hier die Kennungs-Liste des Anlasses.
// Zahl gepinnt (die inhaltliche Grenze prüfen die pfad-eigenen Tests).
// Freie Zusammenstellung (Kette, Auftrag 4, flowZusammenstellungHerausgeben): dieselbe Klasse wie
// die Anlass-Ausgabe darüber — genau die Felder, die die Bürgerin selbst aufgenommen und im
// Opt-out-Dialog stehen gelassen hat. Die Feld-Grenze ist hier ihre eigene Auswahl.
// UMGESTELLT in Auftrag 8 (20.08.2026): die Antwort auf eine Anfrage ist KEIN Klartext-Pfad
// mehr. Sie geht als `vivodepot-antwort`-Umschlag hinaus, dessen Feldwerte sämtlich in `ct`
// liegen (AES-256-GCM); im Klartext stehen genau `verfahren`, `vorgang` und `anbieterId` —
// die drei Angaben, die der Empfänger VOR dem Entschlüsseln braucht, um Passwort oder
// Schlüssel zu wählen. Sie sind seine eigenen Angaben aus seiner eigenen Anfrage, und sie
// sind über die AAD gebunden: wer eine davon ändert, bekommt einen GCM-Fehlschlag.
// Der Eintrag steht darum unten in NUR_CHIFFRAT und die Zahl geht 16 → 15 zurück.
// DIE UMSTELLUNG GEHÖRT IN DENSELBEN ZUG wie der Bau (Nachtrag zu Auftrag 8, Punkt 2): ein
// Pfad, der als Klartext geführt wird und Chiffrat trägt, macht jede Prüfung darüber wertlos.
/* 15 → 14 am 21.08.2026: der Word-Export ist entfallen (Entscheidung 'Drei Zwecke, drei
   Ausgabewege'). Er war ein erlaubter Klartext-Pfad mit Two-Step-Auswahl; sein
   `dateiAusgeben`-Aufruf ist mit `flowDocxExport` fort. **Ein Pfad WENIGER ist hier nie
   ein Risiko** — die Probe wacht darüber, dass kein UNREGISTRIERTER dazukommt. Die Zahl
   wird darum nachgezogen und der Grund steht hier; wer sie erhöht, muss registrieren. */
// 14 → 15 am 27.08.2026 (Auftrag Erbschein-Vorbereitungsmodul, Zug 1b, Freigabe
// für die maschinenlesbare Zusatzausgabe): `flowErbscheinXmlSichern` — dieselbe Klasse
// wie S9-Dokument-Datei-Sichern (oben, 09.08.2026): die XML-Datei trägt AUSSCHLIESSLICH,
// was `_erbscheinSektorDaten()` liest — dieselbe Datenquelle, dieselben Felder, die der
// PDF-Auszug desselben Moduls bereits im Klartext zeigt (Staatsangehörigkeit, Testament-Form,
// Familienstand, Namen aus Kinder/Erben/Bedachten-Listen). Kein Geheimnis, kein Schlüssel,
// keine Angabe, die die Bürgerin nicht ohnehin schon im Sektor selbst eingetragen und im
// Auszug-Overlay gesehen hat. Lokal erzeugt, geht nie automatisch hinaus (dateiAusgeben,
// kein Netzwerk-Aufruf) — dieselbe Feld-Grenze wie der bestehende PDF-Weg desselben Moduls.
// 15 → 16 am 14.09.2026 (Auftrag „Herausgabe-Vollständigkeit"): `anlassPdfAusgeben` — EIN
// neuer dateiAusgeben-Aufrufer, gemeinsam genutzt von flowAnlassExport UND
// flowZusammenstellungHerausgeben (beide oben bereits als erlaubt-Klartext registriert).
// Dieselbe Datenklasse, nur ein zweites Ausgabeformat (PDF statt JSON) DERSELBEN bereits
// geprüften Feld-Grenze (anlassPdfModell liest exakt datensatz.felder, keine zusätzlichen
// Felder) — kein neues Geheimnis, kein neuer Schlüssel, keine neue Feld-Grenze.
// 16 → 17 am 16.09.2026 (MyTerms v1-Schnitt, Teil D): `_vereinbarungAngebotSichern` — das Angebot an eine
// Stelle vor der Weitergabe. Es trägt AUSSCHLIESSLICH Kennungen, https-Quellen und Prüfsummen der von der
// Person festgelegten Bedingungen plus die Kennung des Übergabe-Eintrags — kein einziges Depot-Feld,
// kein Geheimnis, kein Schlüssel (belegt: tests/vereinbarung-angebot-antwort.test.js, „kein Depot-Inhalt").
// 17 → 18 am 16.09.2026 (MyTerms v1-Schnitt, Teil C): `_vereinbarungBegleitdateiSichern` — die Vereinbarung
// als Begleitdatei zum Auszug. Dieselbe Klasse wie das Angebot darüber: Kennungen, Quellen, Prüfsummen, Stand,
// Name der annehmenden Stelle — kein Depot-Feld (belegt: tests/vereinbarung-bedingung-reist-mit.test.js).
const ERLAUBTE_KLARTEXT_ANZAHL = 18;

test('[Klausel] Bindung an ' + ADR + ' über das Fundament', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Die Diskriminante (eine Stelle, von Wächter UND Negativprobe genutzt) ──
   Nur echte Aufrufe: `dateiAusgeben(` OHNE Leerzeichen vor der Klammer (der Prosa-Kommentar
   „dateiAusgeben (Share/Download)" trägt ein Leerzeichen und zählt nicht); minus die Definition.
   Feuerbarkeit bewiesen (25.07., Sweep-Nachtrag) — paarweise: Aufrufer rein → Zahl steigt,
   raus → wieder Ausgangszahl. */
function aufruferZahl(src) {
  return (src.match(/dateiAusgeben\(/g) || []).length
       - (src.match(/function\s+dateiAusgeben\(/g) || []).length;
}

test('b16-113-kein-unregistrierter-klartext-ausgeber: jeder dateiAusgeben-Aufrufer ist registriert (erlaubt-Klartext oder nur-Chiffrat)', () => {
  const src = fs.readFileSync(HTML, 'utf8');
  const aufrufe = aufruferZahl(src);
  // Die drei Nur-Chiffrat-Pfade müssen (per distinktivem Marker) vorhanden sein — sonst wurde ein
  // Chiffrat-Pfad entfernt/ersetzt, während die Zahl gleich bleibt.
  for (const c of NUR_CHIFFRAT) {
    assert.ok(src.includes(c.marker), 'Nur-Chiffrat-Pfad nicht mehr auffindbar: ' + c.pfad + ' (Marker ' + c.marker + ')');
  }
  const erwartet = NUR_CHIFFRAT.length + ERLAUBTE_KLARTEXT_ANZAHL;
  assert.equal(aufrufe, erwartet,
    'Anzahl dateiAusgeben-Aufrufer (' + aufrufe + ') ≠ Registry (' + erwartet + '): ein NEUER Ausgabepfad ist '
    + 'nicht klassifiziert. Vor der Freigabe als erlaubt-Klartext (mit Feld-Grenze/Two-Step) ODER nur-Chiffrat '
    + 'registrieren — B16-113 / U2-ADR-097 §5.');
});

test('[Negativprobe] b16-113 feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const src = fs.readFileSync(HTML, 'utf8');
  const ist = aufruferZahl(src);
  const erwartet = NUR_CHIFFRAT.length + ERLAUBTE_KLARTEXT_ANZAHL;
  assert.equal(ist, erwartet, 'Ausgangslage weicht ab — die Probe misst gegen den falschen Stand');

  // (1) Einen NEUEN, unregistrierten Ausgabepfad einspeisen → die Zahl muss steigen (Wächter rot).
  const mutiert = src + '\n  async function neuerExport(b) { return dateiAusgeben(b, "x.txt", "text/plain"); }\n';
  assert.equal(aufruferZahl(mutiert), ist + 1,
    'Wächter blind: ein neuer dateiAusgeben-Aufrufer wurde NICHT mitgezählt');

  // (2) Mutation RAUS → wieder die Ausgangszahl (isoliert die Diskriminante).
  assert.equal(aufruferZahl(src), ist, 'nach Rücknahme der Mutation nicht wieder die Ausgangszahl');

  // Gegenrichtung: der Prosa-Kommentar mit Leerzeichen darf NICHT mitzählen.
  assert.equal(aufruferZahl(src + '\n// dateiAusgeben (Share/Download) erklärt nur\n'), ist,
    'Kommentar-Form „dateiAusgeben (" wird fälschlich als Aufruf gezählt');
});
