# U2-ADR-109: „Kinder und Schutzbefohlene" sind eine Liste (Schema 42)

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** DATENMODELL, UX, RECHT
**Linie:** U2
**U2-Bezug:** U2-ADR-036 (Kind-Beziehung, Sorgerecht entdoppelt, Roll-up) · U2-ADR-100 §8
(migrationsfreies Fenster) · U2-ADR-102 (negatives Gate) · U2-ADR-023 (abgeleitete Werte nie
gespeichert) · U2-ADR-108 (jeder Sprung bringt seine Probe mit)
**Anker:** Bilanz-Posten 6, Rang 1 · Report `kinder-und-schutzbefohlene-report-2026-07-26.md`
(intern, nicht Teil dieses Repos)
**Status heute:** gilt — Beleg `tests/kinder-und-schutzbefohlene.test.js`.

---

## Kontext

`kinder` (Liste) und `schutzbefohlene` (Freitext) standen in **zwei Sektionen nebeneinander** — und
der Freitext verwies auf die Liste darüber: *„Verweis auf die Kinder-Liste oben genügt."* Zwei
Erfassungsstellen für dieselben Menschen, dieselbe Form, die dieser Tag mehrfach als Fehlerquelle
gezeigt hat.

**Die Kategorie ist die rechtliche Verantwortung für einen Menschen, nicht das Alter.** In `kinder`
standen ohnehin schon Mündel und Pflegekinder; bei erwachsenen Betreuten ändert die Volljährigkeit
nur die **Art** der Vertretung, nicht die Kategorie.

## Entscheidung

**1 — Eine Liste, `art` als Diskriminante.** `kind_beziehung` → `art`, mit einem sechsten Wert
**„betreuter Erwachsener"**. Die anderen fünf standen bereits im Enum: die Zusammenführung nimmt
nichts weg. `kind` → `person` — ein Unterfeld namens `kind` für einen betreuten Elternteil wäre eine
falsche Aussage im Datenmodell. Der Sub-Depot-Schlüssel `kindRegisterId` heißt entsprechend
`vertreteneRegisterId`.

Sektions-Überschrift **„Kinder und Schutzbefohlene"** — „Kinder" vorn, weil die meisten danach
suchen; „Schutzbefohlene" trägt die Vollständigkeit.

**2 — Sichtbarkeit negativ gegatet** (`verborgenWenn`, neu auch in `feldSichtbar` des Kerns). Ein
positives Gate würde bei einer Zeile **ohne** `art` — die es nach der Migration ausdrücklich gibt —
alle art-abhängigen Felder verstecken: die Bürgerin sähe eine fast leere Zeile und keinen Weg
hinein. Genau dieser Fall war schon bei U2-ADR-102 der Grund für die negative Form.

**3 — Rechtsbegriffe am Gesetzestext belegt, nicht aus dem Gedächtnis.**

Die Auftrags-Annahme („Aufgabenbereiche **statt** Aufgabenkreise") trifft nicht. § 1815 Abs. 1
Satz 1 BGB wörtlich:

> „Der Aufgabenkreis eines Betreuers besteht aus einem oder mehreren Aufgabenbereichen."

Beide Begriffe gelten, in einem **Verhältnis** — der Aufgabenkreis ist die Summe, die
Aufgabenbereiche sind seine Teile. Welche Bereiche es im Einzelnen gibt, ist **nicht abschließend
aufgezählt** (Abs. 2 nennt nur die anordnungspflichtigen). **Darum Freitext mit Herkunftshinweis,
kein erfundenes Enum:** die vier „üblichen" Bezeichnungen stehen nirgends im Gesetz, und ein Enum
daraus wäre eine erfundene Norm.

Belegt und im Feld verwendet: § 1814 (das Betreuungsgericht bestellt; die Bestellung entfällt, wenn
eine Vorsorgevollmacht dasselbe regeln kann) und § 1358 (Ehegattennotvertretung).

**4 — Ehegattennotvertretung mit berechnetem Ablauf.** § 1358 Abs. 3 Nr. 4 BGB: sie erlischt nach
**sechs Monaten** ab dem ärztlich festgestellten Zeitpunkt und deckt nur Gesundheitsangelegenheiten.
Der Ablauf wird **berechnet und angezeigt**, nie gespeichert — U2-ADR-023 bleibt unberührt, und ein
abgelegtes Ablaufdatum veraltete in dem Moment, in dem es abgelegt wird. **Ohne diesen Hinweis wäre
das Feld nicht zu bauen:** ein stiller abgelaufener Eintrag in einem Notfall-Dokument ist schlimmer
als kein Eintrag.

**5 — Roll-up ohne Filter (Weg A).** Der Minderjährigkeits-Filter fällt weg. Eine Übersicht mit der
Überschrift „Gesetzliche Vertretung", die einen betreuten Elternteil verschweigt, wäre eine Lücke
ohne Hinweis — dieselbe Klasse wie die Medizinprodukte-Sektion, die „nichts hinterlegt" behauptete.
Je Zeile erscheint die Angabe, die zur Art passt.

**6 — Sub-Depot für alle Arten (Weg C).** **Keine** Minderjährigkeits-Bedingung — es gab auch vorher
keine, ein erwachsenes Kind bekam das Angebot längst. An der Zeile eines betreuten Erwachsenen steht
ein Hinweis mit zwei Punkten, die beide bleiben müssen: die Betreuung reicht **nur so weit, wie das
Gericht sie gesetzt hat** (§ 1815) — ein Datenraum über alles kann weiter reichen; und führt die
betreute Person ein eigenes Vivodepot, liegen die Daten danach **zweimal vor, ohne Abgleich**.

**7 — Migration 41 → 42**, eine Stufe. `kind`→`person`, `kind_beziehung`→`art` (1:1),
`kindRegisterId`→`vertreteneRegisterId`. Der Alt-Freitext wird **eine eigene Zeile mit leerer `art`**
und dem Text in `anmerkung`: ihn zu zerlegen wäre erfundene Struktur, und ihm die Art „betreuter
Erwachsener" zu geben wäre eine Behauptung — der Beispielwert nennt gemessen **Kinder**.

## Konsequenzen

Die Lese-App trägt dieselben Deklarationen (Paritäts-Wächter). Die Sektion `schutzbefohlene-sek` ist
in beiden Apps entfallen; der Roll-up hängt jetzt an der Sektion, in der seine Quelle steht.

**Der erste Sprung, der von Anfang an mit seiner Probe zur Welt kam** — der Governance-Wächter aus
U2-ADR-108 hätte ihn sonst rot gemacht. Genau dafür war jener Zug da.

**Eine Realm-Falle im Produktivcode, von einer Negativkontrolle gezeigt — mit gemessener
Reichweite:** die Ablauf-Rechnung prüfte `heute instanceof Date`. Über VM-Kontexte hinweg ist das
immer falsch, die Funktion fiel still auf „heute" zurück.

**Das trifft KEINE Bürgerin.** Gemessen: der einzige App-seitige Aufruf (`renderSektor`) übergibt
**gar kein** Datum — der Rückfall auf „heute" ist dort das gewollte Verhalten, und im Browser gibt
es ohnehin nur einen Realm. Der Fehlgriff wirkt ausschließlich, wenn ein Datum von außen kommt,
also im Test-Harness. Die Entenprobe (`typeof heute.getTime === 'function'`) ist trotzdem richtig —
`fhirIpsBundle` macht es schon so —, aber sie behebt eine **Test-Falle**, keinen Bürgerinnen-Fehler.
Die schwerere Fassung desselben Musters steckte in `_heuteTeile` (Altersrechnung) und ist mit
U2-ADR-110 behoben.

**Ungemessen:** ob die üblichen Aufgabenbereich-Bezeichnungen (Gesundheitssorge, Vermögenssorge,
Aufenthaltsbestimmung, Behördenangelegenheiten) eine kanonische Quelle außerhalb des BGB haben. Bis
dahin Freitext.

## Konformität

```konformitaet
aussage:  Ein Alt-Depot (Schema 41) wird verlustfrei zu EINER Liste — `kind`→`person`,
          `kind_beziehung`→`art`, Sub-Depot-Schlüssel umbenannt —, und der Alt-Freitext
          wird eine Zeile mit LEERER Art: seine Kategorie wird nicht geraten.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kinder-und-schutzbefohlene.test.js#u2-109-alt-depot-wird-eine-liste-ohne-geratene-art
```

```konformitaet
aussage:  Trägt eine Zeile keine Art, ist KEIN Feld versteckt — das Gate ist negativ,
          damit die nach der Migration entstehende Zeile bedienbar bleibt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kinder-und-schutzbefohlene.test.js#u2-109-ohne-art-ist-nichts-versteckt
```

```konformitaet
aussage:  Die Art bestimmt die Feldgruppe: bei einem Kind erscheinen die Sorgerechts-Felder
          und keine Betreuungs-Felder, bei einem betreuten Erwachsenen umgekehrt; Person,
          Art und Anmerkung erscheinen immer.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kinder-und-schutzbefohlene.test.js#u2-109-die-art-bestimmt-die-feldgruppe
```

```konformitaet
aussage:  Eine Ehegettennotvertretung zeigt ihren nach § 1358 Abs. 3 Nr. 4 BGB berechneten
          Ablauf (sechs Monate) — berechnet, nie gespeichert; eine gesetzliche Betreuung
          trägt keinen solchen Hinweis.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kinder-und-schutzbefohlene.test.js#u2-109-notvertretung-zeigt-ihren-ablauf
```

---

*Vivodepot GmbH · Berlin · 26.07.2026*
