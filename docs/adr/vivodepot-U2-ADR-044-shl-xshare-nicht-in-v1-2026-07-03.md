# U2-ADR-044 — SHL / xShare: nicht in v1 — Website-Aussage korrigiert

**Datum:** 03.07.2026
**Status:** Akzeptiert · 03.07.2026 (Produktentscheidung: SHL/xShare als eigener xButton-Auftrag mit ~6-Wochen-Fenster; **nicht RC-blockierend**; Website „geplant / Import"). Scope-Grenze für v1-RC.
**Nummer:** U2-ADR-044 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-043).
**Typ:** Scope-/Grundsatz-Entscheidung (Interoperabilitäts-Grenze v1).
**Bezug:** DoD v1-RC (Scope: „Gazelle / FHIR-Interchange — Labor, Discharge, **xShare** — NICHT im RC, separater Auftrag, eigenes Zeitfenster"). U2-ADR-029 (selbst-erfasster Freitext, xShare-Kontext). `connect-src 'none'` / Offline-Reinheit. Website `org.html` (v1-Aussage zu SHL) — internes Repo.
**Status heute:** überholt — SHL ist im Produkt, in beiden Richtungen (Nachtrag 26.09.2026 unten).
Was weiter gilt: kein server-vermittelter Austausch, der Kern bleibt bei `connect-src 'none'`.

---

## Kontext

„Smart Health Links" (SHL) sind ein Mechanismus, Gesundheitsdaten über einen Link zu teilen — Teil des größeren **xShare / xButton**-Themas (EU-/FHIR-Interchange-Strecke). Die öffentliche Website (`org.html`) stellte SHL als Fähigkeit von Vivodepot dar, mit der Aussage **„bidirektional"**.

Prüfung des Codes (2026-07-03, case-sensitiv über alle vier Komponenten + `docs/`): **SHL ist in v1 nicht implementiert** — kein `SHL`-/„Smart Health Link"-Bezug im Produkt; kein SHL-Import, erst recht kein „Senden". Zugleich weist die v1-RC-DoD **xShare ausdrücklich als separaten, post-RC-Auftrag** aus (dieselbe Kategorie wie Labor-Konformität und das Discharge-Modul).

## Entscheidung

**SHL / xShare ist ein eigenständiger xButton-Auftrag und NICHT RC-blockierend.** Er läuft mit eigenem Implementierungsfenster (~6 Wochen); ob er noch vor/mit v1 fertig wird, ist offen — **v1 setzt ihn nicht voraus.** Die heutige Website-Aussage zu SHL wird korrigiert:

- Die **„bidirektional"-Behauptung entfällt** — sie war doppelt unzutreffend: SHL ist derzeit gar nicht gebaut, und selbst wenn, wäre es **niemals bidirektional**.
- SHL wird als **geplant (xButton-Auftrag)** benannt und, der Richtung nach, **Import/Empfang** (die Bürgerin *liest* einen geteilten Link) — nie „Senden". Nicht als fertig behaupten.

## Begründung

- **Wahrheit über Reichweite.** Eine öffentliche Fähigkeits-Aussage muss dem Code entsprechen; „bidirektional" beschrieb Nicht-Vorhandenes.
- **Offline-Reinheit prägt die Richtung.** Der Kern ist ein einzelnes Offline-HTML ohne Server-Rückkanal (`connect-src 'none'`). Ein bidirektionaler, server-vermittelter SHL-Austausch widerspräche dem frontal. Käme SHL, dann als **Empfangs-/Import-Richtung**, konsistent mit der Produktphilosophie.
- **Scope-Disziplin.** xShare ist eine FHIR-Interchange-Strecke mit eigenem Zeitfenster (DoD). Sie in v1 zu behaupten täuschte RC-Reife vor, die nicht existiert.

## Konsequenzen

- **Kein SHL-Code in v1** (Status quo bestätigt; keine App-Änderung nötig).
- **Website (`org.html`, internes Repo):** die SHL-„bidirektional"-Aussage korrigieren (entfernen bzw. als geplant/Import-only kennzeichnen) — Umsetzung im intern-Repo.
- **xButton/xShare-Auftrag** bleibt als eigener, post-RC-Strang; ein eigenes ADR entsteht, sobald der Auftrag gebaut wird.

## Bestätigt (03.07.2026)

- SHL **bleibt** in der Kommunikation, aber als **„geplant (xButton-Auftrag)"** — nicht entfernt, nicht als fertig behauptet. Grund: eigenes ~6-Wochen-Implementierungsfenster; ein Landen noch vor/mit v1 ist möglich, aber **keine Voraussetzung**.
- Ziel-Richtung **Import/Empfang** bestätigt (nie „Senden").

## Nachtrag 29.08.2026 (ADR-Lücken-Prüfung, Recherche — KEINE Entscheidung getroffen)

Die oben in „Status heute" gestellte Frage ist geprüft, nicht beantwortet — sie bleibt eine Produktentscheidung. Befund gegen U2-ADR-047 gelesen:

- U2-ADR-047 (angenommen 02.08.2026) baut die Sende-/Teilen-Richtung (`shlProviderErzeugen`,
  `shlProviderPayload`, JWE-Verschlüsselung) — **explizit die Richtung, die diese ADR ausschließt**
  („nie Senden").
- U2-ADR-047 selbst grenzt ab: **„Nicht im Scope: Consumer/Empfangs-Seite (SHL auflösen)"** — die
  von U2-ADR-044 gewollte Richtung (Import/Empfang) ist damit auch nach U2-ADR-047 weiterhin NICHT
  gebaut.
- U2-ADR-047 hat bewusst **keine UI-Verdrahtung**: der Ablage-/Upload-Schritt war ein Stub
  („TODO: Host offen, xShare-Klärung"), „ohne Host kein durchlaufender Share". Eine Bürgerin
  erreicht die Sende-Funktion also bisher nirgends.
- **Aktuell (29.08.2026) laufend:** ein separater, heute erteilter Auftrag lässt den bisher
  fehlenden Host konkret werden (`share.vivodepot.de`, U2-ADR-183, heute deployt) und arbeitet am
  Wortlaut für genau diesen Ablage-/Upload-Schritt (`flowShlVorbereiten()`). Diese ADR-Prüfung und
  jener Auftrag berühren sich also gerade — die Richtungsfrage ist damit nicht mehr rein
  akademisch, sondern wird mit dem nächsten Wortlaut-Vorschlag praktisch relevant.

**Damit bleibt offen, was U2-ADR-044 selbst schon benannt hatte:** ob U2-ADR-047 die
Richtungs-Festlegung stillschweigend revidiert, ob beide Richtungen bewusst nebeneinander bestehen
sollen, oder ob die alte Festlegung („nie Senden") mit dem Host jetzt ausdrücklich aufgehoben wird.
Kein Nachziehen dieser ADR ohne diese Entscheidung.

## Nachtrag 26.09.2026 — die Richtungsfrage ist entschieden: beide Richtungen, im Produkt

Die oben offen gelassene Frage ist beantwortet, entschieden am 25.09.2026: was in
der xShare-Validierung gebaut und gegenüber dem Projekt demonstriert wurde, gehört ins Produkt.
Damit bestehen **beide Richtungen bewusst nebeneinander**, und die Festlegung „nie Senden" ist
aufgehoben:

- **Senden:** U2-ADR-047 (Erzeugung im Kern, zwei Freigabewege) und U2-ADR-183 (Ablage auf
  `share.vivodepot.de`, eigene Seite, der Kern lädt nie selbst hoch).
- **Empfangen:** die Abhol-Seite (`share/empfangen.html`, Nachtrag in U2-ADR-183) löst einen fremden
  `shlink:/` auf; die Einlese-Tür des Kerns verweist auf sie.

**Was von dieser ADR weiter gilt:** „bidirektional" im Sinn eines server-vermittelten Austauschs
bleibt falsch. Es gibt keinen Rückkanal und keinen Vivodepot-Server, der Inhalte kennt; beide
Richtungen laufen über eine Datei, die der Host nur verschlüsselt sieht, und der Kern bleibt bei
`connect-src 'none'`. Die Überschrift „nicht in v1" beschreibt den Stand vom 03.07.2026 und bleibt als
Titel stehen; der Stand heute ist dieser Nachtrag.
