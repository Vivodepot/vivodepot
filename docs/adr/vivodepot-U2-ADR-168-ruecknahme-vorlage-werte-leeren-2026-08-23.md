# U2-ADR-168: Rücknahme einer Modul-Vorlage — sehen, wer sie brachte; Werte leeren, Struktur behalten

**Status:** Akzeptiert
**Datum:** 23.08.2026
**Kategorie:** ARCHITEKTUR, MODUL-EINLASS
**Grundlage:** Produktentscheidung vom 23.08.2026 — Stufe A (Sichtbarkeit) und Stufe B
(Werte leeren) werden beide gebaut; Stufe C (vollständiger Widerruf mit Entfernen der Definition)
wird gemessen, aber angehalten, bis eine eigene Entscheidung über den Umgang mit dann verwaisten
Werten vorliegt.
- **Code-Stelle:** `vivodepot.html` — `importierteVorlagenUebersicht` (Stufe A, Lesen),
  `vorlageWerteLeeren` (Stufe B, Schreiben über `sektorFeldSetzen`), `flowVorlageWerteLeeren`
  (Bestätigungs-Dialog), `einstellungenHTML` (neuer Abschnitt), acht neue STRINGS.
- **Status heute:** gilt — gebaut und belegt in `tests/ruecknahme-stufe-a-b.test.js`.

---

## Der gemessene Befund

`data.importierteVorlagen[]` und `widerrufen` (Grund + Datum) existierten bereits, seit eine
Institution ihre eigene eingereichte Vorlage zurückziehen kann (Kette, Auftrag 6). Der Zustand war
jedoch NUR an einer Stelle sichtbar: im erzeugten Dokument selbst, an der Stelle, an der die
Vorlage zitiert wird. Auf der Einstellungs-Seite — dem Ort, an dem eine Bürgerin nachsieht, "was
ist eigentlich in meinem Depot und woher kam es" — gab es keine Übersicht importierter Vorlagen
überhaupt, unabhängig vom Widerruf-Zustand. Eine Bürgerin, die eine Institution nicht mehr nutzt
(Kammer gewechselt, Praxis geschlossen), hatte keinen Ort, an dem sie das sah oder etwas dagegen
tat — außer, die einzelnen Felder von Hand zu leeren, ohne zu wissen, welche zusammengehören.

## Entscheidung

**Stufe A — sehen, reine Anzeige.** `importierteVorlagenUebersicht()` liest `data.importierteVorlagen`
und liefert je Eintrag Titel, Anbietername, Sektor, Anlage-Datum, Feldanzahl und — neu sichtbar,
nicht neu erzeugt — den bestehenden `widerrufen`-Zustand. Verändert nichts.

**Stufe B — Werte leeren, Struktur behalten.** `vorlageWerteLeeren(vorlageId)` geht die
`feldIds` des benannten Eintrags durch und setzt jeden befüllten Wert über den EINEN bestehenden
Schreibweg (`sektorFeldSetzen`) auf leer — denselben Weg, den auch eine manuelle Löschung im
Feld selbst nimmt, kein zweiter. Die Feld-DEFINITION (`data.feldDefinitionen`) und der
`importierteVorlagen`-Eintrag selbst bleiben unverändert stehen: eine Bürgerin, die die Vorlage
später erneut nutzen will (oder eine aktualisierte Fassung erhält), verliert keine Struktur, nur
den eingetragenen Inhalt. Bereits leere Felder zählen nicht in der Rückmeldung ("N Felder
geleert") — die Zahl ist gemessen, nicht die Feldanzahl der Vorlage.

**Ein Bestätigungs-Dialog** (`flowVorlageWerteLeeren`, Muster `ui.modal` wie an anderer Stelle im
Kern, z. B. `flowEmpfaengerkreisEntfernen`) trennt das Leeren von einem versehentlichen Klick.

## Was NICHT in dieser ADR steht

**Kein Bau der Stufe C (vollständiger Widerruf).** Der founder-seitige Auftrag nennt sie
ausdrücklich als eigenen, angehaltenen Schritt: würde eine Vorlagen-Definition vollständig aus
`data.feldDefinitionen` entfernt, verwaisen ihre Werte (sie stehen weiter in `data.sektoren`,
aber ohne Renderer, der sie zeigt — dieselbe Klasse Lücke, die `_bereicheVerwaisteRetten` für
Sektoren bereits kennt, hier aber unbehandelt). Die Entscheidung, ob ein Feld ohne Definition
verworfen, in ein Verwaist-Register verschoben oder als katalogfremdes Feld weitergeführt wird,
ist eine eigene, noch offene Frage — kein Bau, bis sie beantwortet ist.

**Keine automatische Reaktion auf `widerrufen`.** Setzt eine Institution `widerrufen`, geschieht
im Depot der Bürgerin nichts von selbst — sie sieht es jetzt (Stufe A) und kann von Hand leeren
(Stufe B), aber es gibt keinen automatischen Leerungs- oder Warnlauf. Ein stiller, automatischer
Eingriff in bereits eingetragene Werte wäre ein eigener, an anderer Stelle zu entscheidender
Bau — hier ausdrücklich nicht.

---

## Nachtrag (27.08.2026) — Ablauf auf der Übersicht sichtbar

**Anlass.** Ein Entwurf für „Stufe C" (Zertifikat-Ungültigkeit) griff zunächst zur Löschung von
Werten und Feld-Definitionen — Korrektur: „Es ging nur darum, dass Module mit nicht
mehr gültigen Zertifikaten entfernt werden und Nutzer darüber informiert werden können… alles
andere widerspricht doch vollkommen der Produktphilosophie." Beleg gegen U2-ADR-009 §4 („Die
Daten gehören dem Bürger… Sie verschwinden NIE, weil ihre Quelle verschwindet") und gegen den
bestehenden Widerruf-Kommentar (Kette Auftrag 6 Zug 4, `vivodepot.html`): „Er LÖSCHT KEINE WERTE:
die Definition ist falsch, nicht das, was der Mensch eingetragen hat." Kein Bau der Löschung —
diese ADR bleibt dabei: kein Stufe-C-Löschmechanismus.

**Zwei getrennte Auslöser für denselben Zustand (`alt.widerrufen`), kein neuer Zustand:**

- **Widerruf** — unverändert der bestehende Zug-4-Pfad: nur bei einem tatsächlich ankommenden,
  signierten Anbieter-Update (`plan.widerruf.grund`). Die App ruft nie selbst über Netz ab
  (U2-ADR-009 §3, Offline-Garantie) — eine „automatische" Widerruf-Erkennung mitten im
  Lebenszyklus hätte nichts Frischeres zu prüfen als beim letzten Import. Kein neuer
  Prüfpfad, keine periodische Kryptoprüfung.
- **Ablauf** — reiner Datumsvergleich (`gueltigBis` gegen heute), keine Kryptographie, keine
  neue Information von außen nötig. Bestand bereits als `_vorlageAbgelaufen()` (Kette Auftrag 6
  Zug 4), aber nur am erzeugten Dokument sichtbar — auf der Stufe-A-Übersicht fehlte er. Jetzt
  ergänzt `importierteVorlagenUebersicht()` ein berechnetes `abgelaufen`-Feld über **dieselbe**
  Funktion, kein zweiter Prüfweg, kein geschriebener Zustand. Vorrang wie am Dokument: ist
  `widerrufen` gesetzt, verdrängt es den Ablauf-Hinweis (ein Zustand, ein Text, keine
  widersprüchliche Doppelanzeige).

**Code-Stelle:** `importierteVorlagenUebersicht()` (neues `abgelaufen`-Feld), `einstellungenHTML`
(Hinweis-Span `vorlagen-abgelaufen`, STRINGS `vorlagenAbgelaufenZusatz`).
**Beleg:** `tests/ruecknahme-stufe-a-b.test.js`, Abschnitt „Stufe A, Nachtrag".

---

*Vivodepot GmbH · 23.08.2026, Nachtrag 27.08.2026*
