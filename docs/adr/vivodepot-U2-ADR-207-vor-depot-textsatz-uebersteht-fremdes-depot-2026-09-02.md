# U2-ADR-207: Ein Vor-Depot-Sprachmodul übersteht ein fremdes Depot

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** KORREKTHEIT, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-188 (Die Registry folgt data — bewusst GETRENNT gehalten: andere Ursache,
andere Registry, siehe unten). U2-ADR-189 (Ein vor dem Depot angedocktes Sprachmodul wird vererbt
— löst die Naht für Depots, die IN DERSELBEN App-Instanz mit dem Modul aktiv angelegt/gesichert
wurden; diese ADR schließt die Naht für Depots, die es NICHT wurden).
**Anker:** Bauauftrag, 02.09.2026, auf einen Nebenfund beim Bau des
Bildpaar-Auftrags „Dieselbe Datei". Live gemessen, vor dem Bau (echte englische Modul-App
v492, echtes über den UI-Weg angelegtes Altdepot, Playwright) — nicht nur gelesen. Reichweite
vor dem Bau gemessen (vier Fragen des Auftrags, alle mit Fundstelle beantwortet, s. Bericht).
**Status heute:** gilt — Beleg `tests/vor-depot-modul-ueberlebt-fremdes-depot.test.js`.

---

## Kontext

U2-ADR-189 löst: ein Sprachmodul, das VOR dem Depot angedockt wird (Weg B,
`vorDepotKonfigurationAnwenden()`), wird beim Anlegen UND beim Sichern in
`data.textsatzModule` eingebettet (`_vorDepotModulInsDepotUebernehmen()`) — eine Datei, die MIT
diesem Modul aktiv entstand, trägt es fortan selbst und übersteht jedes erneute Laden.

**Ungeprüft blieb die Naht, an der ein Depot ankommt, das NIE durch diese Einbettung lief** —
weil es in der gewöhnlichen deutschen App entstand (kein Vor-Depot-Modul aktiv, nichts
einzubetten), weil es vor der Modul-Einführung angelegt wurde, oder weil es eine Testerin
einfach zugeschickt bekommen hat. Live gemessen: ein über den normalen UI-Weg angelegtes Depot
(`file://`, kein `vorabkonfiguration.js` im Verzeichnis — strukturell garantiert kein Modul,
`data.textsatzModule.length === 0` gegengeprüft) zeigte, in der echten englischen Modul-App
geöffnet, deutsche Beschriftungen — trotz `textsatzSpracheAktiv()` durchgehend korrekt `en`,
ohne JS-Fehler, ohne Selbstheilung bei einem Sektor-Wechsel (Messbericht,
02.09.2026).

**Reichweite** (vier Fragen des Auftrags, gemessen statt geschätzt): JEDE in der gewöhnlichen
deutschen App entstandene Datei ist betroffen, sobald sie in einer Sprach-Modul-App geöffnet
wird — nicht nur alte Bestandsdepots, auch eine gerade erst verschickte. Der einzige NICHT
betroffene Weg: ein Depot, das in genau dieser Modul-App-Instanz selbst neu angelegt wurde
(Gegenfall bestätigt grün, `tests/vor-depot-modul-vererbung.test.js`, „die ganze Naht").

## Ursache, technisch von U2-ADR-188/189 unterschieden

`_textsatzModuleAusDepotAnmelden(d)` (vivodepot.html:10024 ff.) baute die Textsatz-Registry
bislang als reine ZUWEISUNG aus `d.textsatzModule`:
```js
_TEXTSATZ_MODUL_REGISTRY = registry;   // Zuweisung, keine Ergänzung
```
Ein Depot ohne eigenes Modul liefert `liste = []` — die Registry wird komplett geleert,
**einschließlich** des vorher (beim App-Start über die Vor-Depot-Konfiguration) korrekt
geladenen Wörterbuchs. Die Sprach-FLAGGE (`textsatzSpracheAktiv()`, gespeist aus
`_vorDepotSpracheAktiv`) bleibt dabei die ganze Zeit korrekt — nur gibt es dann kein
Wörterbuch mehr, aus dem `textsatzNeuAnwenden()` lesen könnte, und der Rückfall ist der
eingebaute deutsche Text.

**Die Unterscheidung zu U2-ADR-188, ausdrücklich benannt statt verschwiegen:** die vier
Geschwister-Register (Bereichs-/Code-/Rechtsraum-/Institutionsarten-Module) MÜSSEN als reine
Zuweisung aus `data` gebaut werden — das ist keine Bequemlichkeit, sondern die
Sicherheitszusage, die U2-ADR-188 selbst schließt (ein stehen gebliebenes Register gab ein
sensibles Feld im Klartext heraus, Fund eines parallelen Strangs). Für die TEXTSATZ-Registry gilt diese Sorge nicht:
Übersetzungstexte sind App-Beschriftung (Wörter, keine Bürgerinnen-Daten), kein Kanal, über den
personenbezogene Angaben einer Person mitliefe, die sie nicht sehen soll. Ein Vor-Depot-Modul,
das über einen Depot-Wechsel hinweg in der Registry stehen bleibt, kann darum kein Leck
derselben Art erzeugen wie ein stehen gebliebenes Bereichs-Modul.

## Entscheidung

**`_textsatzModuleAusDepotAnmelden` baut die Registry jetzt zweistufig:** zuerst, wie bisher,
eine volle Zuweisung aus `d.textsatzModule` (Depot-eigene Module — „folgt data" bleibt hier die
Regel, unverändert). Danach, NUR ergänzend, ein zweiter Durchlauf über
`_vorDepotTextsatzModule` (das App-eigene, vor dem Depot angedockte Modul aus U2-ADR-189) —
aber nur für [Sprache][Rechtsraum]-Fächer, die der erste Durchlauf noch nicht belegt hat. Ein
Depot-eigenes Modul gewinnt IMMER; das Vor-Depot-Modul füllt nur eine sonst leere Lücke.

Keine neue Laufzeit-Variable, kein neuer Aufrufer: dieselbe Funktion, derselbe einzige
Schreibort (`_TEXTSATZ_MODUL_REGISTRY = registry;`), aufgerufen von genau denselben vier
Stellen wie zuvor (`depotLaden()`, `vorDepotKonfigurationAnwenden()`,
`_alleModulRegisterAusDepotAnmelden()`, `_moduleEinlassWirken()`) — keine davon musste
angefasst werden.

**Ausdrücklich NICHT angefasst:** `_bereichsModuleAusDepotAnmelden`,
`_codeListenAusDepotAnmelden`, `_rechtsraumModuleAusDepotAnmelden`,
`_institutionsArtenAusDepotAnmelden` — alle vier bleiben reine Zuweisungen aus `data`, wie
U2-ADR-188 es verlangt.

## Gegenprobe gegen das U2-ADR-188-Leck (Auflage, vor der Landung geprüft)

Um zu belegen, dass die vorhandene Sicherheitszusage nicht durch diese Änderung geschwächt
wurde, wurde `_bereichsModuleAusDepotAnmelden(d)` in `_alleModulRegisterAusDepotAnmelden`
**probeweise auskommentiert** (denselben Vor-U2-ADR-188-Zustand simuliert) und die bestehende
Testsuite erneut gefahren:

- `tests/registry-folgt-data.test.js` — **zwei Tests fielen rot**: „Paar A, Rückrichtung — die
  wichtigere der beiden" (der Anker zeigt nach `subKontextVerlassen()` weiterhin den Sub-Sektor)
  und „Paar B" (ein neues, unbeteiligtes Depot zeigt die Bereiche des vorherigen). Beide
  Fehlermeldungen exakt an der erwarteten Stelle.
- `tests/export-sensibel-subkontext-bereich.test.js` blieb in diesem speziellen Szenario grün
  (die Registry hatte den betroffenen Bereich bereits aus einem früheren, ungestörten Aufruf
  — `_moduleEinlassWirken()`, eigener direkter `_bereichsModuleAusDepotAnmelden`-Aufruf,
  vivodepot.html:36749 — im Bestand; die Mutation traf hier keine tatsächlich stale-werdende
  Stelle in diesem Testpfad). Die beiden `registry-folgt-data.test.js`-Ausfälle beweisen die
  Sensitivität der Sicherheitszusage insgesamt hinreichend.

Danach die Mutation vollständig zurückgenommen, alle betroffenen Tests erneut grün geprüft
(12/12, s. Konformität unten).

## Verworfene Alternative

**Eine eigene, dritte Laufzeit-Variable für „die aktuell zusammengeführte Registry"**, gepflegt
parallel zu `_TEXTSATZ_MODUL_REGISTRY`. Verworfen aus demselben Grund, den der Kommentar an
`_textsatzModuleAusDepotAnmelden` selbst schon nennt: „Ein zweites Register daneben zu führen
wäre die Alternative gewesen — und genau die Sorte Kopie, die auseinanderläuft." Der
zweistufige Aufbau INNERHALB derselben Funktion, mit derselben Ziel-Variable, ist die
schmalere Änderung.

## Konsequenzen

Ein Depot, das keine eigene Sprache mitbringt — der Normalfall für jede in der gewöhnlichen
App entstandene, gespeicherte, weitergegebene oder mitgebrachte Datei — zeigt jetzt in einer
Sprach-Modul-App weiterhin deren Sprache, statt lautlos auf Deutsch zurückzufallen. Ein Depot,
das ein EIGENES Modul mitbringt (U2-ADR-189-Fall oder ein regulär im offenen Depot
angedocktes), gewinnt weiterhin gegenüber der App-eigenen Sprache — die bewusste
In-Depot-Sprachwahl bleibt unangetastet.

## Konformität

```konformitaet
aussage:  Ein FREMDES Depot (kein eigenes Textsatz-Modul, z. B. in der gewöhnlichen deutschen
          App entstanden) verliert beim Öffnen in einer Sprach-Modul-App das App-eigene
          Vor-Depot-Wörterbuch NICHT — weder in der Registry noch in den SEKTOREN-Beschriftungen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vor-depot-modul-ueberlebt-fremdes-depot.test.js#Rot-Beweis
```

```konformitaet
aussage:  Ein Depot-eigenes Textsatz-Modul gewinnt weiterhin gegenüber dem App-eigenen
          Vor-Depot-Modul für dasselbe [Sprache][Rechtsraum]-Fach — die Vererbungs-Zusicherung
          aus U2-ADR-189 bleibt unverändert scharf.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vor-depot-modul-vererbung.test.js#die ganze Naht
```

```konformitaet
aussage:  Die U2-ADR-188-Sicherheitszusage (Registry folgt data für Bereichs-Module) ist durch
          diese Änderung nicht geschwächt — die vier Geschwister-Register bleiben reine
          Zuweisungen, nur die Textsatz-Registry ist zweistufig.
zustand:  geprüft
herkunft: invariante
pruefung: tests/registry-folgt-data.test.js#Rückrichtung
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
