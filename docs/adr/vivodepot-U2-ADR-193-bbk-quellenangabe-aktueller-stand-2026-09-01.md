# U2-ADR-193: BBK-Quellenangabe — aktueller Stand statt veralteter Auflage

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** PRODUKT, WAHRHAFTIGKEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-130 (§ dort: die ursprüngliche 2-Liter-Zahl wurde gegen eine Sekundärquelle
geprüft, weil die BBK-Primärseite hinter einem Cookie/JS-Tor lag). Berührt NICHT die dort
verwendete Zahl selbst — siehe Ausdrücklich nicht behandelt.
**Anker:** Bauauftrag, freigegeben, 01.09.2026. Auslöser: der Befund, dass BBK die
im Code zitierte 7. Auflage (2019) längst durch eine neue Veröffentlichung ersetzt hat.
**Status heute:** gilt — Beleg `tests/bbk-quelle-konsistenz.test.js`.

---

## Kontext

**Das war keine stale Fußnote, sondern eine falsche Zusicherung gegenüber der Bürgerin.**
`krisenvorsorgeBedarfQuelle` (`vivodepot.html:8610`) behauptete wörtlich, die Empfehlung sei
„unverändert seit der 7. Auflage (2019)" — und stützte das mit einem Prüfdatum (10.08.2026), das
Vertrauen einlädt gerade weil der Folgesatz sagt, Vivodepot füge „keine eigene Einschätzung
darüber hinaus" hinzu. Live geprüft (`bbk.bund.de/vorsorge`, 01.09.2026, Zug-0-Bericht
`bbk-quellenangabe-zug0-2026-09-01.md`) hat sich die Empfehlung seither STRUKTURELL geändert
(s. u.). **Die Behauptung „unverändert" war zum Zeitpunkt der Prüfnotiz bereits falsch.**

**Der Mechanismus dahinter:** die Prüfung vom 10.08.2026 sah sich die ZAHL an, fand sie
unverändert (2 Liter) und schrieb daraus „unverändert seit der 7. Auflage" — ohne die
Veröffentlichung selbst anzusehen, deren Auflagen-Zählung BBK zwischenzeitlich ohnehin
aufgegeben hat. Eine Sonde, die die Zahl maß, und ein Satz, der mehr über die QUELLE behauptete,
als die Sonde deckte. Die neue Zeile (s. Entscheidung) behauptet deshalb nur noch, was tatsächlich
geprüft wurde — ein Prüfdatum, kein Unveränderlichkeits-Anspruch ohne belegten Quellenvergleich.

**Was ein Wächter hier kann und was nicht:** ob sich eine Webseite geändert hat, kann kein Test
wissen — die App läuft offline, ein Prüfer, der ins Netz griffe, wäre keiner. Was ein Wächter
FANGEN kann, ist eine Aussage, die stärker ist als ihre eigene Prüfung: ein „unverändert seit X"
ohne belegten Vergleich. Der neue Wächter (s. u.) prüft deshalb nicht „ist die Quelle noch
aktuell", sondern nur, dass die Zeile keine Auflagen-/Jahres-Behauptung mehr trägt und mit dem
Nachbar-Zitat übereinstimmt — die Grenze dessen, was hier automatisiert nachprüfbar ist.

**Ein Widerspruch stand bereits unbemerkt im selben Bereich der Datei:** der Kommentar bei
`vivodepot.html:12550-12553` (Zusatz vom 24.08.2026, drei neue BBK-Felder) zitiert bereits
KORREKT dieselbe aktuelle Veröffentlichung samt PDF-Stand („Checklisten-zur-Vorsorge-Krisen-und-
Katastrophen.pdf", Stand laut PDF-Metadaten 04.12.2025) — vierzig Zeilen über der veralteten
Zeile, in derselben Datei, ohne dass etwas beide aneinander band. Genau dieser Zustand — zwei
Zitate derselben Quelle, eines gepflegt, eines nicht, ohne Wächter dazwischen — konnte ein
Vierteljahr unbemerkt bestehen.

**Die Zahl selbst ist NICHT betroffen.** Zug 0 hat geprüft, ob sich der zugrundeliegende
Bedarfswert geändert hat: BBK nennt heute „mindestens 1,5 Liter" Grundbedarf plus 0,5 Liter für
den Fall, dass gekocht wird — zusammen genau die 2 Liter, mit denen Vivodepot rechnet
(`krisenvorsorgeBedarfText`, `:8605`). Der heutige Wert ist das obere Ende dieser Spanne, kein
Fehler. Ob Vivodepot dabei bleibt oder eine eigene Kochen-Bedingung einführt, ist eine eigene,
kleinere Frage — nicht Gegenstand dieser ADR (siehe Ausdrücklich nicht behandelt).

## Entscheidung

**`krisenvorsorgeBedarfQuelle` zitiert die aktuelle Veröffentlichung, mit demselben Stand-Datum
wie der bereits vorhandene Kommentar bei den BBK-Ergänzungsfeldern — wortgleich, nicht nur
sinngemäß, damit ein Wächter beide aneinanderbinden kann.** Neuer Text (`vivodepot.html:8610`):

> „Quelle: BBK, „Vorsorgen für Krisen und Katastrophen" (bbk.bund.de/vorsorge), Checklisten-PDF,
> Stand laut PDF-Metadaten 04.12.2025. Empfehlung zuletzt geprüft am 01.09.2026. Vivodepot
> rechnet diese Empfehlung nur aus — keine eigene Einschätzung darüber hinaus."

Keine erfundene Auflagen-Zählung: BBK selbst führt auf der aktuellen Themenseite keine sichtbare
Auflagen-Nummer mehr — das PDF-Metadaten-Datum ist der genaueste verfügbare Beleg, und derselbe,
den der Code bereits an anderer Stelle für dieselbe Quelle verwendet.

**Englischer Spiegel mit korrigiert**, `tools/textsatz-en-vollabdeckung-daten.js:1134`, gleicher
Inhalt, gleiches Datum.

**Neuer Wächter, `tests/bbk-quelle-konsistenz.test.js`:** bindet die beiden „Stand laut
PDF-Metadaten"-Stellen aneinander (mindestens zwei Fundstellen, alle mit demselben Datum) und
verbietet den Rückfall auf eine Auflagen-/2019-Behauptung in `krisenvorsorgeBedarfQuelle`.
Rot-Probe geführt: beide Tests liefen VOR der Korrektur rot — der erste, weil `:8610` noch keine
„Stand laut PDF-Metadaten"-Zeile trug (nur eine Fundstelle statt zwei), der zweite, weil die alte
Auflagen-Behauptung noch stand.

## Ausdrücklich nicht behandelt

**Ob die Bedarfsrechnung von der pauschalen 2-Liter-Zahl auf die BBK-Struktur (1,5 Liter
Grundbedarf + 0,5 Liter bedingt aufs Kochen) umgestellt werden soll.** Das wäre eine neue
Eingabe (z. B. „wird gekocht?") und würde die Bedarfsrechnung selbst verändern — eine
Produktentscheidung, nicht Teil dieser rein zitatbezogenen Korrektur.
`krisenvorsorgeBedarfText` (`:8605`) bleibt unverändert.

## Konsequenzen

Die beiden BBK-Zitate in `vivodepot.html` können nicht mehr unbemerkt auseinanderlaufen — ein
künftiges Nachziehen der einen Stelle ohne die andere wird jetzt rot. Keine Verhaltensänderung
für Bürgerinnen außer dem sichtbaren Quellentext unter der Bedarfsrechnung.

## Konformität

```konformitaet
aussage:  Die beiden "Stand laut PDF-Metadaten"-Zitate derselben BBK-Quelle
          (krisenvorsorgeBedarfQuelle und der Kommentar bei den BBK-Ergänzungsfeldern) nennen
          dasselbe Datum.
zustand:  geprüft
pruefung: tests/bbk-quelle-konsistenz.test.js#Zitat und Kommentar nennen denselben Stand
```

```konformitaet
aussage:  krisenvorsorgeBedarfQuelle behauptet keine überholte Auflage (7. Auflage / 2019) mehr.
zustand:  geprüft
pruefung: tests/bbk-quelle-konsistenz.test.js#krisenvorsorgeBedarfQuelle nennt keine überholte Auflage
```

---

*Vivodepot GmbH · Berlin · 01.09.2026*
