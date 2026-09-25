# U2-ADR-222: ein leeres Depot ist keine Sicherung

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** DATENSCHUTZ, WAHRHAFTIGKEIT, ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-211 (Sicherungsstand bekannt — `data.sicherungsStand.letzteDateiIso`, die
14-Tage-Erinnerung) · U2-ADR-212 (Sichern-Knopf folgt Speicher-Modus — der Fund entstand bei der
Nachmessung dieses ADRs) · U2-ADR-220 (Datei-Namens-Hinweis ehrlich — derselbe Nachmess-Strang,
anderer Befund).
**Anker:** Auftrag im Anschluss an die U2-ADR-212-Nachmessung. Gemessen (Playwright,
`playwright-core`, echter v501-Stand, Firefox UND Chromium/FSA-Attrappe, beide gehostet): direkt
nach `depotAnlegen()` zeigt die Kopfzeile in Chromium „Als Sicherungsdatei gesichert ✓",
`data.sicherungsStand.letzteDateiIso` ist bereits gestempelt — während `data.identitaet`
`undefined` ist. Der Anlege-Fluss (`_depotAusPasswortFinalisieren()`) schreibt bewusst und
unbedingt eine Datei, die außer Akteur/Namen nichts enthält (Code-Kommentar seit 08.08.2026:
„Leeres... aber echtes verschlüsseltes Depot sofort schreiben").
**Status heute:** gilt — Beleg `tests/persistenz-status.test.js`, `tests/sicherungsstand-bekannt.test.js`,
`tests/e2e/zug5-persistenz-rauchtest.spec.js`, `tests/e2e/s11-zielwechsel-sichtbar.spec.js`.

---

## Kontext

`depotHerunterladen()` markiert jeden erfolgreichen FSA-Schreibversuch (`weg === 'datei'`) über
`markiereAlsDateiGesichert()` — das setzt gleichzeitig das Kopfzeilen-Häkchen
(`_aktuelleDateiSicherung`) UND den persistierten Sicherungsstand
(`data.sicherungsStand.letzteDateiIso`, U2-ADR-211), auf dessen Zeitstempel die 14-Tage-
Export-Erinnerung ihre Fälligkeit berechnet.

Diese Funktion lief bisher ununterschieden an JEDEM erfolgreichen Schreibversuch — auch an dem
einen, unbedingten Schreibversuch, mit dem `_depotAusPasswortFinalisieren()` beim Anlegen sofort
eine Datei erzeugt, damit „die Datei existiert, bevor die Bürgerin auch nur einen Bereich zu
sehen bekommt" (Kommentar dort, unverändert seit 08.08.2026). Diese Datei ist zu diesem
Zeitpunkt strukturell leer — nur Akteur und Namensfelder, kein einziges Sektor-/Gesundheits-/
Vorsorgefeld.

Folge, gemessen: die Kopfzeile behauptete eine bestätigte Sicherung, und der Sicherungsstand
begann seine 14-Tage-Uhr — beides über eine Datei, die nichts von dem enthält, was die Bürgerin
eigentlich sichern will. Löscht in diesem Fenster jemand die Websitedaten (Speicher-Löschen,
Browser-Reset), öffnet sie ihre Datei mit dem aufgeschriebenen Passwort und findet ein leeres
Depot — ein stiller Totalverlust, dem eine grüne Bestätigung vorausging.

## Entscheidung

**Ein leeres Depot ist keine Sicherung. Der Anlege-Schreibversuch setzt `sicherungsStand` nicht.**

`depotHerunterladen(optionen)` nimmt ein neues `optionen.istAnlegen`-Flag. Ist es gesetzt, läuft
im Erfolgsfall `markiereGespeichert()` (Zähler 0, KEIN Datei-Signal) statt
`markiereAlsDateiGesichert()` (Zähler 0 UND Datei-Signal). `_depotAusPasswortFinalisieren()` ist
der einzige Aufrufer, der dieses Flag setzt. Die Datei wird weiterhin geschrieben — Ort und Name
bleiben ihr Zweck —, sie zählt nur nicht als bestätigter Sicherungsstand.

**Flag statt Inhalts-Heuristik.** Verworfen: eine Prüfung wie „ist `data.identitaet` leer".
Der Anlege-Fluss WEISS, dass er anlegt — kein Raten am Inhalt nötig, das ein Depot mit einem
einzigen bereits echten Feld fälschlich träfe (oder umgekehrt ein Depot mit vielen leeren, aber
technisch vorhandenen Sektor-Objekten fälschlich verschonte).

**Gemessen, nicht angenommen — beide Browser danach:**
- Chromium (FSA): Zustand wechselt von `'als-datei'` zu `'keine-datei'` („Ihre Datei ist nicht
  aktuell"). `data.sicherungsStand` bleibt `null`.
- Firefox (kein FSA): unverändert `'unbestaetigt'` — dieser Pfad setzte `sicherungsStand` schon
  vorher nicht (nur der bestätigte FSA-Zweig tat das), keine Code-Änderung nötig.

Beide Zustände sind nach dem Fix ehrlich, auch wenn sie unterschiedlich formuliert sind: Firefox
meldet eine offene Zustellfrage, Chromium meldet „nicht aktuell" — keiner behauptet eine
bestätigte, inhaltliche Sicherung, die nicht vorliegt.

## Konsequenzen

**Ins Register der Außenaussagen eingetragen** (`docs/aussenaussagen.md`, Zeile
`leeres-depot-haekchen`) — ein grünes Häkchen ist eine Zusage. Geltungsbereich geprüft, nicht
erweitert: das Register führt bereits einen historischen App-Text-Eintrag
(`7-auflage-empfehlung`), der Rahmen trägt.

**Nicht Teil dieses ADRs:** ob und wie die Kopfzeilen-Pille im Normalbetrieb künftig still bleibt
(Auto-Save-Auftrag) — wartet auf einen offenen Zuschnitt, unabhängig von diesem Fix.
Ebenfalls offen, in einem separaten, umgekehrten Strang: ob die Datei für den Ablauf „drei Monate
später, anderer Browser" überhaupt aktuell gehalten wird, wenn der Sichern-Knopf (U2-ADR-212) im
internen Modus keine Datei mehr schreibt — das ist keine Frage, die dieses ADR beantwortet.

## Konformität

```konformitaet
aussage:  Der Anlege-Schreibversuch (_depotAusPasswortFinalisieren → depotHerunterladen mit
          istAnlegen:true) setzt data.sicherungsStand NICHT — in Chromium (FSA) UND Firefox
          (kein FSA) bleibt es nach dem Anlegen null.
zustand:  geprüft
herkunft: invariante
pruefung: tests/persistenz-status.test.js#PS11-1: Anlege-Schreibversuch (istAnlegen) setzt sicherungsStand NICHT — Chromium/FSA
pruefung: tests/persistenz-status.test.js#PS11-2: Anlege-Schreibversuch setzt weiterhin KEINEN sicherungsStand — Firefox-Pfad unverändert
```

```konformitaet
aussage:  Ein regulärer, spätere Datei-Save (kein istAnlegen) setzt sicherungsStand weiterhin wie
          vor diesem ADR — keine Verschlechterung am bestehenden, bestätigten Weg.
zustand:  geprüft
herkunft: invariante
pruefung: tests/persistenz-status.test.js#PS11-3: ein regulärer Datei-Save (kein istAnlegen) setzt sicherungsStand unverändert
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
