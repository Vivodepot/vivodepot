# U2-ADR-125: Browser-Testfähigkeit ist Voraussetzung für Änderungen am Speicher- und Statusweg

**Status:** Akzeptiert
**Datum:** 08.08.2026
**Kategorie:** TESTINFRASTRUKTUR, PERSISTENZ
**Status heute:** gilt — `tests/e2e/zug5-persistenz-rauchtest.spec.js` existiert weiterhin,
`tests/load-kern.js` stubbt `document.addEventListener` weiterhin als No-Op (die im Kontext
beschriebene „Event-Blindzone" besteht unverändert).
**Grundlage:** Löst die seit U2-ADR-091 §7 (20.07.2026) offene Frage „ob Browser-Testfähigkeit vor
v1.0 Voraussetzung wird" — für den Speicher- und Statusweg — endgültig auf.
**Drei-Anker:**
- **Code-Stelle:** `tests/load-kern.js` (stubbt `document.addEventListener` als No-Op —
  die „Event-Blindzone"), `tests/e2e/zug5-persistenz-rauchtest.spec.js` (neu).
- **Sprint-Commit:** derselbe Commit wie U2-ADR-031 Stück 11.
- **ADR-Bezug:** dieser ADR; löst U2-ADR-091 §7 (Persistenz-Trigger) auf.

---

## Kontext

U2-ADR-091 (20.07.2026, §7 „Offen — bewusst nicht Teil dieser Entscheidung") ließ die Frage
ausdrücklich stehen: „Die 'Event-Blindzone' selbst (wie viel Funktionalität strukturell nicht
Node-testbar ist, ob Browser-Testfähigkeit vor v1.0 Voraussetzung wird) — eigene, noch offene
Erhebung." Die Erhebung blieb 19 Tage offen.

Am 08.08.2026 ging nach zwei Stunden Eingabe und einem bestätigten „Sichern und
schließen" der gesamte Depot-Stand verloren. Der Node-Test-Harness (`tests/load-kern.js`) stubbt
`document.addEventListener` als No-Op (U2-ADR-091 Abschnitt 6) — der reale Klickpfad
„Sichern und schließen" → Modal → Primärknopf → `depotPersistieren()` läuft dort nicht. 2838
grüne Node-Prüfungen (Stand vor diesem Auftrag) hatten diese Fehlerklasse strukturell nicht
gesehen. Zwei unabhängige Vorfälle an diesem Tag (der hier behandelte Datenverlust, plus die
in U2-ADR-031 Stück 6/7 dokumentierten Fehlschlags-Wege) wurden beide durch Zufall gefunden,
nie durch einen Test.

## Entscheidung

**Jede Änderung am Speicher- und Statusweg (Persistenz, `saveStatusModell`, Schließen-Warnung,
Wiedereinstieg) braucht ab sofort einen Browser-gestützten Test (Playwright), der den
End-zu-Ende-Weg prüft — anlegen, eintragen, sichern, schließen, öffnen, wiederfinden — nicht
nur die einzelne Funktion im Node-Harness.**

Begründung, aus dem Bau dieses Auftrags selbst gewonnen: der Node-Test
(`tests/fix-b7a-schliessen-warnung.test.js`) für `depotHerunterladen()` allein war grün, obwohl
der End-zu-Ende-Weg noch rot war — `depotInDateiSichern()` (der Weg, den „Sichern und
schließen" tatsächlich nimmt) überschrieb die gerade gebaute Unterscheidung mit einem eigenen,
unconditional `markiereGespeichert()`-Aufruf. Erst der Browser-Rauchtest
(`tests/e2e/zug5-persistenz-rauchtest.spec.js`) — der den Knopf klickt, nicht die Funktion
aufruft — fand die Lücke. Ein Node-Test allein hätte sie nicht gefangen: Der Aufrufer-Graph
zwischen Knopf-Klick und Funktion ist genau die Fläche, die `document.addEventListener`-Stubbing
unsichtbar macht.

**Konkret:**

1. `tests/e2e/zug5-persistenz-rauchtest.spec.js` ist der stehende Rauchtest für den Kernweg —
   läuft gegen `file://` UND einen lokalen `http://`-Server, weil sich die Speicherpfade
   unterscheiden (`internerSpeicherModus()` ist unter `file://` immer `false`).
2. Ein Fix am Speicher-/Statusweg gilt erst als abgenommen, wenn dieser oder ein neuer,
   spezifischer Browser-Test ihn rot gesehen hat, bevor der Fix gebaut wurde (Regel 18) —
   nicht nur eine grüne Node-Prüfung.
3. **Nicht auf `github.io` oder einer anderen geteilten Domain testen** — dort misst man das
   Aufräumverhalten fremder Nachbarn mit, nicht die eigene Anwendung.
4. FSA (`showSaveFilePicker`) wird über eine Attrappe geführt, die den echten Schreibweg nutzt
   (`createWritable`/`write`/`close`), aber ohne den nativen OS-Dialog, den Playwright nicht
   bedienen kann — kein Bypass der App-Logik, nur des Betriebssystem-Dialogs.

## Konsequenzen

- Der Speicher- und Statusweg hat jetzt eine Browser-Testfläche, die vorher komplett fehlte.
  Node-Tests bleiben die richtige Ebene für reine Funktionslogik (`saveStatusModell()`,
  `dataUrlZuBlob()` u. Ä.) — sie ersetzen den Browser-Test nicht, wo ein echter Klickpfad
  geprüft werden muss.
- Mehraufwand pro Persistenz-Änderung: ein Playwright-Lauf zusätzlich zur Node-Suite. Akzeptiert,
  weil die Alternative (stille Regression, gefunden durch Zufall statt durch Test) am 08.08.
  bereits einmal echten Schaden angerichtet hat.
- **Nicht Teil dieser Entscheidung:** die „Event-Blindzone" außerhalb des Speicher-/Statuswegs
  (Wizard-Delegation, Fokus-/Scroll-Erhalt u. a.) — dort gilt weiterhin Einzelfallprüfung, keine
  pauschale Browser-Pflicht. Diese Entscheidung ist bewusst eng auf den Weg geschnitten, an dem
  ein Fehler den größten Schaden anrichtet: den vollständigen Verlust eines Depots.

## Cross-Referenz

U2-ADR-091 §6/§7 (die „Event-Blindzone", dort erstmals benannt und offengelassen), U2-ADR-031
Stück 11 (der Fund, der diese Entscheidung ausgelöst hat), U2-ADR-097 §13 („Gespeichert" heißt:
tatsächlich geschrieben — dieselbe Zusicherung, jetzt mit einem Browser-Nachweis statt nur einer
Node-Prüfung dahinter).
