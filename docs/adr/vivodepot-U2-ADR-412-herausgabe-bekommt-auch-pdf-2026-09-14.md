# U2-ADR-412: Jede Herausgabe bekommt auch ein PDF — drei Chiffrat-Ausnahmen

**Status:** Angenommen
**Datum:** 14.09.2026
**Kategorie:** EXPORT, PRODUKT, WÄCHTER
**Linie:** U2
**Anker:** Auftrag vom 14.09.2026, „PDF-Export überall/Sub-Depot" und Folgeauftrag
„Herausgabe-Vollständigkeit"). Produktentscheidung mündlich bestätigt, dieses ADR trägt sie nach.
**Status heute:** gilt — Beleg `tests/b16-114-herausgabe-pdf-zwilling.test.js`.

---

## Kontext

Befund der Produktverantwortung: beim Herausgeben einer Teilmenge („Selbst zusammenstellen")
kam nur eine JSON-Datei heraus, kein PDF. Nachmessen zeigte: `flowAnlassExport` (Anlass-Export)
und `flowZusammenstellungHerausgeben` (Teilmenge) hatten dasselbe Loch — beide berechneten
längst ein PDF-Modell (`anlassAusgaben()`, eigener Kommentar dort: „die drei Ausgaben entstehen
ZUSAMMEN, aus einem Lauf"), zeichneten und gaben es aber nie aus. Behoben (`4ccfdeeb`,
`anlassPdfAusgeben()`), mit Playwright gegen Chromium/Firefox/WebKit geprüft.

Die vollständige Inventur aller `dateiAusgeben`-Aufrufer (Bericht, Abschnitt „Vollständige
Inventur") zeigte: außer den jetzt vier PDF-tragenden Wegen (Ganzes Depot, Bereich, Anlass,
Zusammenstellung) gibt es drei Wege, die bewusst NIE ein PDF bekommen sollen, weil ihr Inhalt
verschlüsselt das Gerät verlässt.

## Entscheidung

1. **Grundregel:** Jede Herausgabe einer kuratierten, für einen Menschen lesbaren Datenmenge
   bekommt auch ein PDF — damit sie überprüfbar ist, ohne die Datei extra zu öffnen oder ein
   Fremdformat zu lesen.
2. **Drei Ausnahmen**, weil ein Klartext-PDF daneben die Verschlüsselung aushebeln würde
   (jemand könnte den Inhalt lesen, ohne den Schlüssel/das Passwort des Empfängers zu haben):
   - **Sub-Depot-Blackbox-Export** (`vivodepot.html`, Marker `'-Sub_'`) — ein versiegelter
     Umschlag verbatim, AES-GCM. Die verwaltende Person, die exportiert, soll den Inhalt selbst
     nicht sehen (Sub-Depot-Prinzip) — ein PDF wäre hier nicht nur eine Verschlüsselungslücke,
     sondern ein eigener Vertrauensbruch.
   - **Anfrage-Antwort** (Marker `'_Antwort_'`, `_anfrageAntwortSchreiben`) — jeder Feldwert
     liegt in `ct` (AES-256-GCM), nur der Empfänger mit Passwort/Schlüssel kann öffnen.
   - **Empfängerkreise-Ausschnitt** (U2-ADR-156, Marker `'vivodepot-fuer-'`) — reguläre
     v4-Depot-Datei, jeder Feldwert in einer eigenen AES-GCM-Einheit.

   **Ausdrücklich KEINE Ausnahme: EUDIW/SD-JWT.** Erste Fassung dieses Auftrags nannte es
   fälschlich als vierte Ausnahme — SD-JWT ist signiert, aber nicht AES-verschlüsselt (keine
   Chiffre, offene Standard-Serialisierung wie ein gewöhnlicher JWT). Sein PDF-Zwilling
   existiert bereits: der EUDIW-Knopf sitzt im selben Bereichs-Chooser wie der PDF-Knopf,
   genau wie bei FHIR-IPS/XÖV.
3. **Prüfung:** `tests/b16-114-herausgabe-pdf-zwilling.test.js` — zwei Gruppen (PDF-tragend /
   begründete Ausnahme), Markerexistenz je Eintrag, mit Rot-Beweis. Neuer, unregistrierter
   Klartext-Ausgabeweg fällt zuerst unter `tests/b16-113-klartext-ausgabepfade.test.js` auf
   (Zahl steigt dort); wer ihn registriert, entscheidet in demselben Zug, ob er hierher (mit
   PDF) oder in die Ausnahmeliste (mit Grund) gehört.

## Offener Punkt: Klartext-Vorschau vor dem Absenden

Geprüft, nicht durchgängig gebaut — Stand je Ausnahme:

- **Anfrage-Antwort:** hat eine Vorschau. `_anfrageHerausgeben()` läuft über dieselbe
  `flowExportUebersicht()`-Übersicht wie Anlass/Bereich/Zusammenstellung — die Bürgerin sieht
  und wählt Feld für Feld ab, bevor verschlüsselt wird.
- **Sub-Depot-Blackbox-Export:** bewusst KEINE Vorschau — nicht vergessen, sondern die
  Sicherheitsgrenze selbst: die verwaltende Person, die den Export auslöst, soll den Inhalt des
  fremden Sub-Depots nicht lesen können (Hinweistext im Dialog sagt das ausdrücklich). Eine
  Vorschau hier wäre der eigentliche Fehler, nicht ihr Fehlen.
  {{konformitaet:pruefung=vivodepot.html:52818 (flowSubDepotBlackboxExport, Hinweistext
  blackboxHinweis statt Feld-Übersicht)}}
- **Empfängerkreise-Ausschnitt:** **offener Punkt, nicht gebaut.** Anders als die beiden
  anderen ist das kein einmaliger, kuratierter Mengen-Export, sondern ein dauerhafter,
  passwortgeschützter Zugriffs-Slot („Fach") — beim Einrichten (`flowEmpfaengerkreisFach`)
  und beim Erzeugen der Datei (`flowEmpfaengerkreisDatei`) gibt es keine Feld-Auswahl-Vorschau,
  nur die Passwort-Eingabe. Ob eine Vorschau hier überhaupt sinnvoll anwendbar ist (der Zugriff
  ist nicht auf eine Momentaufnahme begrenzt, sondern auf den späteren Depot-Stand beim Lesen)
  oder ob sie fehlt, ist eine eigene Produktfrage — nicht Teil dieses ADR, hier nur benannt.

## Was NICHT geöffnet wird

Die Feld-Grenze der PDF-tragenden Wege (welche Kennungen ein Anlass/eine Zusammenstellung
überhaupt erreichen darf) bleibt unverändert — dieses ADR ändert nur, DASS ein zweites Format
entsteht, nicht WAS im Datensatz steht.
