# U2-ADR-114: Eine Art, die es nicht gibt — sichtbar im Bereich, abwesend in jeder Übersicht

**Status:** Angenommen
**Datum:** 29.07.2026
**Kategorie:** DATENMODELL, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-111 (der Wechselmoment — der Nachbarfall, und warum er hier nicht trägt) ·
U2-ADR-109 (das negative Gate `verborgenWenn`, und warum ein FEHLENDER Wert kein Fund ist) ·
U2-ADR-096 (`listenZeilenWaehlen` — der Selektor, der die Zeile nie trifft)
**Anker:** Bilanz-Posten 5 (Rang 1) · interner Bericht `bilanz-05-import-unbekannte-art-2026-07-29.md`
**Status heute:** gilt — Beleg `tests/fix-bilanz5-import-unbekannte-art.test.js`.

---

## Kontext

Gemessen 29.07.2026 gegen `u2-kanon @ 2297286`, jede Zahl mit Positivkontrolle:

| Frage | Ergebnis ⟦M⟧ |
|---|---|
| Kommt eine Zeile mit `typ` ausserhalb der Optionsmenge durch den Import? | **ja**, vollständig — auf keinem Weg wird der Wert geprüft |
| Bricht danach etwas? | **nein** — 0 Würfe über Selektor, Prädikat und Editor-HTML |
| Trifft sie ein Selektor? | **0 von 6** gültigen Typwerten, bei beiden typisierten Listenfeldern |
| Wohin zeigen die realen Selektoren? | **alle 11** `liste:`-Vorkommen auf `vorsorge_instrumente`, **keiner** auf `kinder` |
| Positivkontrolle | eine gültige Zeile wird getroffen (1) — die Messung lebt |

**Der Defekt ist die stille Abwesenheit bei sichtbarer Anwesenheit.** Die Zeile steht im
Bereich, die Bürgerin sieht sie — und in Notfallkarte, Situationsblättern, ICS-Kalender und
Export ist sie nicht. Kein Absturz, keine Meldung, nichts. Wer sein Testament aus einer
fremden Datei einliest, hat allen Grund zu glauben, es sei hinterlegt.

**Warum U2-ADR-111 das nicht deckt — der tragende Punkt.** Jenes Prädikat fragt *„ist ein
gefülltes Feld UNSICHTBAR?"*. Das ist ein anderer Gegenstand: dort ist die Art **gültig** und
einzelne Angaben fallen aus der Anzeige; hier ist die Art **selbst unbekannt** und der ganze
Eintrag fällt aus jeder Übersicht. Die beiden Gate-Formen zeigen das deutlich:

- Bei `vorsorge_instrumente` (35 von 36 Unterfeldern `sichtbarWenn`-gegatet) schlug es
  **zufällig mit an** — sagte aber „bei der gewählten Art", die es gar nicht gibt.
- Bei `meine-menschen.kinder`, wo **alle elf** Gates `verborgenWenn` sind, meldet es
  **strukturell nichts**: ein unbekannter Wert versteckt dort nichts, er zeigt alles.

Zwei Gate-Formen, zwei Ergebnisse, derselbe Defekt. Deshalb ein eigenes Prädikat und keine
Verbreiterung des vorhandenen — eine Verbreiterung hätte die Aussage von U2-ADR-111
verwässert und den `verborgenWenn`-Fall trotzdem nicht gefangen.

## Entscheidung

**1 — Generisch, aus den Definitionen gelesen.** `zeileUnbekannterLeitwert(feld, zeile)`
bestimmt die Leitfelder als *„Unterfelder, auf die ein Gate zeigt"* und prüft den Wert gegen
deren Optionsmenge. Es kennt keine Feldliste; der nächste typisierte Datenmodell-Zug ist
gedeckt, ohne dass jemand daran denkt. Dieselbe Bauart wie U2-ADR-111 §1.

**2 — Nur GESETZTE, unbekannte Werte. Ein fehlender Wert ist kein Fund.** Das ist keine
Lücke, sondern U2-ADR-109: eine `kinder`-Zeile ohne `art` gibt es nach der Migration des
Alt-Freitextes ausdrücklich, und das negative Gate ist genau dafür gebaut. Ein fehlender
`typ` bei `vorsorge_instrumente` wird ohnehin schon vom Wechselmoment-Prädikat gemeldet
(gemessen). Meldete dieses Prädikat auch Fehlendes, fragte es bei **jedem migrierten Kind** —
das Über-Fragen, das U2-ADR-111 §b ausdrücklich verbietet.

**3 — Es wird nichts abgewiesen und nichts normalisiert.** Unverändert die Verwaisungsregel:
Bürgerdaten werden nie gelöscht. Abweisen wäre Datenverlust am Rand, normalisieren wäre
stiller Datenverlust. Die Zeile kommt vollständig herein; der Satz sagt nur, was mit ihr
geschieht.

**4 — Der neue Satz ERSETZT den Wechselmoment-Satz für dieselbe Zeile.** Beides zu zeigen
ergäbe zwei Sätze, die einander widersprechen — „bei der gewählten Art" neben „eine Art, die
Vivodepot nicht kennt". Der genauere gewinnt, und er ist auch der folgenreichere.

**5 — Zwei Sätze, und der fremde Wert steht im Klartext darin.** Der Prüfstein aus
U2-ADR-111 §4 gilt weiter, mit einer benannten Abweichung: der unbekannte Wert **hat** kein
Label — genau das ist der Befund —, und die Bürgerin erkennt ihren Eintrag nur an ihm wieder.
Die *Bezeichnung des Feldes* kommt wie überall aus dem Label, nie aus der id. Mehrere
unbekannte Werte in einer Zeile ergeben **einen** Satz: die Folge gilt dem Eintrag als
Ganzem und darf nicht doppelt behauptet werden.

## Konsequenzen

**Der Wächter ist wieder der eigentliche Ertrag.** Er konstruiert für **jedes** typisierte
Listenfeld des Modells den Fall und verlangt eine Meldung, die den fremden Wert benennt.
Rotmachbarkeit nachgewiesen ⟦M⟧ gegen eine gekippte Kopie über `KERN_HTML_PATH`: drei der
vier Proben fallen, wenn das Prädikat leer zurückgibt. Die vierte — „kein Über-Fragen" —
bleibt dabei richtigerweise grün, weil sie Abwesenheit prüft.

**Was diese ADR NICHT entscheidet, und was deshalb offen bleibt:** die Meldung steht heute
**nur in der Import-Vorschau**. Eine Zeile, die die Bürgerin dort bestätigt hat, bleibt
danach dauerhaft aus allen Übersichten verschwunden, ohne dass irgendwo noch etwas steht.
Ob der Eintrag auch **im Bereich** dauerhaft als „erscheint in keiner Übersicht" markiert
wird, ist eine Gestaltungsentscheidung und ist eine Produktentscheidung (Zeile in der Bilanz).

Ungemessen: wie häufig fremde Dateien unbekannte Arten tragen — der Posten ist über die
*Möglichkeit* begründet und über den gemessenen Weg, nicht über Häufigkeit. Und: ob
Leitfeld-Werte ausserhalb von Listen-Unterfeldern vorkommen (Sektor-Ebene); gemessen wurden
Listen, wie schon bei U2-ADR-111.

## Konformität

```konformitaet
aussage:  Jedes typisierte Listenfeld meldet einen gesetzten, im Modell unbekannten
          Leitfeld-Wert — für jedes wird der Fall konstruiert, und der Hinweis muss
          den fremden Wert benennen. Der nächste Datenmodell-Zug kann den Posten
          damit nicht still vergrössern.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fix-bilanz5-import-unbekannte-art.test.js#fix-bilanz5-jede-typisierte-liste-meldet-eine-unbekannte-art
```

```konformitaet
aussage:  Ein FEHLENDER oder gültiger Leitfeld-Wert erzeugt keinen Hinweis — der
          migrierte Alt-Freitext ohne `art` (U2-ADR-109) wird nicht angefragt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fix-bilanz5-import-unbekannte-art.test.js#fix-bilanz5-fehlende-und-gueltige-art-erzeugen-keinen-hinweis
```

```konformitaet
aussage:  Der Import lässt die Zeile VOLLSTÄNDIG herein — er normalisiert nichts und
          weist nichts ab —, und für eine Zeile steht GENAU EIN Hinweis: der Satz über
          die unbekannte Art ersetzt den Wechselmoment-Satz, statt neben ihm zu stehen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fix-bilanz5-import-unbekannte-art.test.js#fix-bilanz5-import-meldet-ersetzt-und-normalisiert-nicht
```

---

*Vivodepot GmbH · Berlin · 29.07.2026*
