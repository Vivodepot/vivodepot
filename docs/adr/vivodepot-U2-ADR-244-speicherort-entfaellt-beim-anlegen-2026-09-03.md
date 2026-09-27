# U2-ADR-244: Das Anlegen selbst braucht keinen Speicherort mehr

**Status:** Angenommen
**Datum:** 03.09.2026 (Nacht)
**Kategorie:** ARCHITEKTUR, PERSISTENZ, PRODUKTPHILOSOPHIE
**Linie:** U2
**U2-Bezug:** Nimmt den Speicherort-Zwang zurück, den U2-ADR-031 Stück 12 („Anlegen" und „Datei
anlegen" sind ein Schritt, nicht zwei) für den Anlege-Moment eingeführt hatte — nicht das Ziel
dieses Stücks (kein Zustand, in dem eingetragen werden kann, ohne dass je ein gesicherter Stand
existiert), sondern die Senke, über die es erreicht wird. Baut auf U2-ADR-237 auf (die interne
Ablage ist seither ein verlässlicher, bestätigbarer erster Schreibversuch) und wäre ohne sie nicht
möglich gewesen. Lässt U2-ADR-222 (`istAnlegen`-Flag, ein leeres Depot ist keine Sicherung)
unverändert — gilt jetzt nur noch für den selteneren Datei-Fallback-Zweig. Lässt U2-ADR-035
(Setup-first, Passwort vor dem ersten Eintrag) unverändert: das Passwort bleibt Pflicht, nur der
Speicherort entfällt.
**Anker:** An der eigenen Testschleife nach U2-ADR-237 festgestellt: das Anlegen selbst verlangte
weiterhin einen Speicherort — „Bitte wählen Sie, wo Ihr Depot gespeichert wird, damit es angelegt
werden kann" — und auf dem iPhone ist damit die allererste Handlung im Produkt ein Download.
Zusätzlich, zum Hinweistext: „Ich möchte nicht tausend Warnungen" — und die ausdrückliche Frage, ob
der Browser dafür überhaupt ermittelt werden darf.
**Status heute:** gilt, gebaut.

---

## Kontext

U2-ADR-237 machte die interne Ablage zur stillen Senke für jede Feld-Änderung — das Anlegen selbst
blieb davon unberührt. `_depotAusPasswortFinalisieren()` holte weiterhin zuerst ein Dateiziel
(`_dateizielFuerAnlegenSichern()`, FSA-Picker oder Namens-Dialog), bevor überhaupt ein Depot
entstand: ohne gewähltes Ziel kein `depotAnlegen()`. Diese Reihenfolge stammt aus U2-ADR-031
Stück 12 (08.08.2026) und hatte einen echten Grund — verhindern, dass Eingaben entstehen, ohne dass
je ein gesicherter Stand existiert. Der Grund gilt weiter; die Datei war zum Zeitpunkt jenes
Stücks aber die einzig verfügbare Senke dafür. Seit U2-ADR-237 ist sie das nicht mehr.

Die Folge auf dem betroffenen Gerät (iPhone, WebKit, kein `showSaveFilePicker`): der erste Klick
im gesamten Produkt öffnet einen Namens-Dialog, dessen Bestätigung einen Download auslöst — bevor
die Bürgerin auch nur ein Feld gesehen hat. Genau der Zustand, den U2-ADR-237 für jede *spätere*
Änderung bereits beendet hatte, stand am Anfang unverändert.

Ein zweiter, eigenständiger Punkt aus demselben Gespräch: der bisherige Hinweistext vor dem
Datei-Dialog sprach unterschiedslos von „Ihrem Stick" — ein Wortlaut, der für jedes Gerät gleich
war, obwohl die tatsächliche Gefährdungslage es nicht ist (ein Tab ohne `persist()`-Zusage verliert
seinen internen Stand leichter als eine installierte App). Ausdrücklich gefragt wurde, ob
der Browser dafür ermittelt werden darf — die Antwort ist: nicht als Identität (das altert
schlecht und ist der falsche Maßstab), aber als **Fähigkeit** ja, über dieselbe Art Prüfung, die
`hatDateiSpeichernPicker()` längst macht.

## Die Entscheidung

**Das Anlegen selbst braucht keinen Speicherort mehr, wenn der interne Weg zur Verfügung steht
(`internerSpeicherModus()` — der Regelfall auf jedem echten Gerät: gehostet, IndexedDB vorhanden).
Name und Passwort, und los.** Das Passwort bleibt Pflicht — es ist der Schrankschlüssel, nicht eine
Registrierung; U2-ADR-035 (Setup-first) ändert sich nicht.

An die Stelle des Zwangs tritt ein einziger, informierender Hinweis im selben Dialog: das Depot
liegt zunächst nur in diesem Browser, eine Sicherungskopie macht es unabhängig davon. Einmal, im
Anlege-Moment — nicht wiederkehrend, nicht nach jedem Feld.

Bleibt der interne Weg ausnahmsweise nicht verfügbar (`file://`-Herkunft, ein bestätigt kaputtes
IndexedDB), bleibt „keine Datei, kein Depot" die einzig ehrliche Antwort — dort gibt es keine
andere Senke, U2-ADR-031 Stück 12 gilt für diesen Fall unverändert vollständig.

## Was gebaut wurde

1. **Der Datei-Dialog vor dem Anlegen entfällt im Regelfall.** `_depotAusPasswortFinalisieren()`
   ruft `_dateizielFuerAnlegenSichern()` nur noch, wenn `!internerSpeicherModus()` gilt.
   `depotAnlegen()` läuft direkt; der erste, sofortige Schreibversuch geht über
   `depotInternSichern({ still: true })` statt `depotHerunterladen({ istAnlegen: true })` — derselbe
   stille, bestätigbare Pfad, den jede spätere Änderung seit U2-ADR-237 schon nutzt. Der
   Datei-Fallback (inklusive `istAnlegen:true`, U2-ADR-222) bleibt für den Ausnahmefall
   byteidentisch bestehen — eine Zeile entscheidet den Zweig, kein zweiter Code-Pfad.
2. **Ein Hinweis statt eines Zwangs — fähigkeitsabhängig, nicht browserabhängig.** Neue Funktion
   `anlegenSpeicherHinweis()`: liefert eine von zwei Fassungen, gewählt über
   `erhoehtesVerlustRisiko()` — dieselbe Prüfung, die die bestehende Eviction-Härtung (U2-ADR-031
   Stück 4) bereits nutzt, eine Kombination aus drei Fähigkeiten (FSA-Speicherfähigkeit,
   Standalone-App, `persist()`-Zusage), keine Browser-Erkennung. Ohne internen Weg bleibt der alte
   Datei-Ziel-Hinweis gültig — dort trifft er weiterhin zu. Erscheint im Anlege-Dialog
   (`flowDepotAnlegen`, `flowEigenesDepotAusSubWunsch`) und im Passwort-Setzungs-Dialog
   (`flowPasswortSetzen`) — derselbe Text, dieselbe Stelle, einmal je Anlage, nicht wiederkehrend.
3. **Zwei neue Textfassungen, keine dritte.** „Risiko" (erhöhte Gefährdung: Tab ohne
   `persist()`-Zusage) nennt die Sicherungskopie als das, was das Depot der Bürgerin gehören lässt.
   „Ruhig" (installierte App oder `persist()` gewährt) informiert, ohne zu drängen. Beide nennen
   den seit U2-ADR-237 bestehenden Menüpunkt „Sicherungskopie erstellen" als den Weg dorthin, statt
   einen eigenen, dritten Mechanismus zu erfinden.

## Die Rot→Grün-Probe

`tests/adr-244-anlegen-ohne-speicherort.test.js` — der Haupt-Test ruft
`_depotAusPasswortFinalisieren()` mit einem Spion auf `ui.modal` (wirft, sobald aufgerufen), legt
ein Depot an, befüllt ein Feld, öffnet einen frischen Kern auf demselben internen Speicher
(„schließen, öffnen") — Daten da, ohne dass der Spion je auslöste. Rot-Beweis von Hand: den Guard
`if (!internerSpeicherModus())` vor `_dateizielFuerAnlegenSichern()` testweise durch `if (true)`
ersetzt — der Haupt-Test schlug sofort fehl (`ui.modal` wurde über den alten Namens-Dialog-Pfad
ausgelöst), die vier übrigen (Fallback-Gegenprobe, Textfassungen) blieben unberührt, wie es sein
muss. Danach die Änderung exakt zurückgesetzt (per Diff bestätigt: keine Reste), wieder grün.

Die Gegenprobe (`internerSpeicherModus()` false, `file://`-Herkunft simuliert) bestätigt, dass der
Datei-Dialog im Ausnahmefall weiterhin gerufen wird — kein ersatzloses Streichen.

## Verhältnis zu bestehenden ADRs

| ADR | Betroffen? |
|---|---|
| U2-ADR-031 Stück 12 (Datei vor Anlegen) | Die Senke ändert sich (intern statt Datei, im Regelfall); die Absicht (kein Eintrag ohne gesicherten Stand) bleibt vollständig gewahrt. |
| U2-ADR-035 (Setup-first) | Unverändert — das Passwort bleibt vor dem ersten Eintrag Pflicht. |
| U2-ADR-222 (`istAnlegen`, leeres Depot ist keine Sicherung) | Unverändert, gilt jetzt nur noch für den Datei-Fallback-Zweig. |
| U2-ADR-237 (stille interne Sicherung) | Voraussetzung dieser ADR — ohne den bestätigbaren internen Weg gäbe es keine Senke, die den Zwang ersetzen könnte. |
| U2-ADR-031 Stück 4 (Eviction-Härtung, `erhoehtesVerlustRisiko()`) | Unverändert, wird hier zum zweiten Mal genutzt — für den Hinweistext statt nur für die Eviction-Warnung. |

## Belege

```konformitaet
aussage:  Ein Depot anlegen OHNE Speicherort, befüllen, schließen, öffnen — Daten da, ohne dass ein
          Datei-Dialog je aufgerufen wurde.
zustand:  geprüft
herkunft: rot-bewiesen (Guard testweise auf `if (true)` gesetzt, Haupt-Probe rot, danach zurückgesetzt)
pruefung: tests/adr-244-anlegen-ohne-speicherort.test.js#anlegen OHNE Speicherort, befüllen, schließen, öffnen — Daten da
```

```konformitaet
aussage:  Ohne funktionierenden internen Speicher (eine ECHT gescheiterte Funktionsprobe, z. B.
          gesperrter/kaputter Speicher) bleibt der Datei-Dialog beim Anlegen Pflicht.
zustand:  geprüft
herkunft: KORRIGIERT (Fund, 12.09.2026): stand vorher auf "file://-Herkunft" als Ursache —
          der Testaufbau dahinter injizierte damals gar kein IndexedDB-Mock, bewies also nie diese
          Behauptung, nur das Fehlen eines Mocks. file:// allein erzwingt seit dem Wegfall der
          pauschalen Ursprungs-Flagge (`internerSpeicherModus()`, „die pauschale
          file://-Flagge weicht der Probe") KEINEN Datei-Modus mehr — live gemessen, IndexedDB
          funktioniert unter file:// (Bericht sichern-je-browser-je-lauf-2026-09-12.md). Die
          echte Ursache ist jetzt korrekt geprüft: eine tatsächlich gescheiterte Funktionsprobe.
pruefung: tests/adr-244-anlegen-ohne-speicherort.test.js#[U2-ADR-244·Gegenprobe] Fallback-Fall (kein interner Speicher möglich, ECHT geprüft) fragt weiterhin ein Dateiziel
```

```konformitaet
aussage:  file:// MIT einer bestandenen Funktionsprobe liefert internerSpeicherModus()===true —
          file:// allein ist keine Datei-Modus-Bedingung mehr.
zustand:  geprüft
herkunft: NEU (Fund, 12.09.2026) — „die Zeile, die es nie gab": ohne diese Probe hätte
          niemand gesehen, dass die alte, jetzt entfernte `!_istDateiHerkunft()`-Bedingung eine
          Lage abwies, die real funktioniert.
pruefung: tests/adr-244-anlegen-ohne-speicherort.test.js#[U2-ADR-244·Rot-Beweis, neu] file:// MIT bestandener Funktionsprobe liefert internerSpeicherModus()===true — die Zeile, die es vor diesem Auftrag nie gab
```

```konformitaet
aussage:  Der Anlege-Hinweis ist fähigkeitsabhängig (erhoehtesVerlustRisiko()), nicht browserabhängig.
zustand:  geprüft
pruefung: tests/adr-244-anlegen-ohne-speicherort.test.js#anlegenSpeicherHinweis(): Risiko-Fassung, wenn erhoehtesVerlustRisiko() true ist
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
