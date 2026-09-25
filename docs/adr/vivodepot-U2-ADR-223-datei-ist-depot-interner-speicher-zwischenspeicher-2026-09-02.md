# U2-ADR-223: Die Datei ist das Depot — der interne Speicher ist ein Zwischenspeicher

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKTPHILOSOPHIE, PERSISTENZ
**Linie:** U2
**U2-Bezug:** Beantwortet auf Prinzip-Ebene die Frage, die U2-ADR-212 (Sichern-Knopf folgt dem
Speicher-Modus) ausdrücklich offen ließ: „was bei Divergenz zwischen internem Stand und Datei
passieren soll — bleibt eine Produktentscheidung." Nutzt U2-ADR-015 (interner verschlüsselter
Arbeitsstand, Zwei-Ebenen-Persistenz) und U2-ADR-031 (Persistenz ehrlich, `saveStatusModell()`)
als bestehende Bausteine, ändert an beiden nichts. Hebt U2-ADR-212 NICHT auf — s. „Die Gegenkraft"
unten.
**Anker:** Produktfrage, 02.09.2026: „Was ist denn sonst mein Depot, wenn nicht die
Datei?" — eine Frage, die sich selbst beantwortet, aber bislang in keinem ADR, keinem Wächter,
keinem Test stand.
**Status heute:** gilt — teils geprüft, teils bewusst nicht-prüfbar (s. Konformität unten). Dieses
ADR ist überwiegend ein Prinzip, kein Code-Zustand; nur eine der vier Klauseln hat heute eine
tragende Probe.

---

## Kontext

Der interne, browser-eigene Speicher wurde schrittweise vom reinen Zwischenspeicher zu etwas, auf
das sich ein wachsender Teil des normalen Ablaufs verlässt — Sub-Depot-Wechsel, Passwortänderung,
und seit U2-ADR-212 auch der Sichern-Knopf im Regelfall. Jede einzelne dieser Änderungen war für
sich begründet. Keine einzige bestehende Probe widerspricht dem, weil jede von ihnen beschreibt,
was gebaut wurde — nicht, ob die Datei dabei das Depot bleibt. Ein Prinzip, das nirgends
aufgeschrieben steht, kann von lauter richtigen Einzelentscheidungen unbemerkt verlassen werden.

## Der Satz

**Die Datei ist das Depot. Der interne Speicher ist ein Zwischenspeicher.**

## Begründung

Die Begründung ist nicht technisch — sie ist Produktidentität.

Browser-eigener Speicher wird vom Browser verwaltet, nicht von der Bürgerin. Eine
Aufräum-Routine, „Websitedaten löschen", ein Systemwechsel — und der Bestand ist fort, ohne dass
irgendjemand die Inhaberin gefragt hätte. Das ist keine Verwahrung, sondern Lagerung bei einem
Dritten, der allein über den Bestand entscheidet.

Genau dagegen tritt Vivodepot an. Das Produkt gliedert sich in drei Stationen: **Import —
Custody — Export**, und die mittlere Station als Verwahrung **ohne Verwahrer**. Ein Speicher, den
die Bürgerin nicht selbst in der Hand hält, ist diese mittlere Station nicht — er ist wieder ein
Verwahrer, nur ein stiller. Und er reist nicht: er bleibt in einem Browser auf einem Gerät,
während die Datei überall aufgeht, wo eine Bürgerin sie hinträgt.

## Was dieses ADR entscheidbar macht

Vier Sätze, an denen sich eine spätere Frage prüfen lässt — nicht nur eine Haltung, die man liest:

1. Kein Zustand darf **nur** im internen Speicher existieren, ohne dass die Bürgerin es weiß.
2. Keine Anzeige darf einen internen Sicherungsvorgang als Datei-Sicherung ausgeben.
3. Weicht die Datei vom internen Stand ab, ist die **Datei** die Bezugsgröße, an der die
   Abweichung gemessen und benannt wird — nicht umgekehrt.
4. Der interne Speicher darf Klicks sparen. Er darf nie der einzige Ort sein, an dem die Arbeit
   eines Tages liegt.

## Was ausdrücklich offen bleibt

Dieses ADR entscheidet nicht, **wann** und **wie** die Datei aktuell gehalten wird. Das ist eine
eigene, technische Frage — ob und wann ein Browser beim Verlassen der Seite überhaupt noch
schreiben darf, wird gerade eigens gemessen — und bleibt eine eigene Entscheidung. Dieses ADR
sagt, **was gilt**, nicht **wie es umgesetzt wird**.

## Die Gegenkraft, ehrlich benannt

U2-ADR-212 hat den Sichern-Knopf im Regelfall nach innen gedreht, um einen echten Missstand zu
beenden: In Browsern ohne In-Place-Schreibzugriff auf eine bestehende Datei entstand bei jedem
Klick eine neue, zeitgestempelte Datei im Download-Ordner — nicht tragbar. Dieses ADR hebt
U2-ADR-212 **nicht** auf. Es sagt, in welche Richtung die dort ausdrücklich offen gelassene
fehlende Hälfte — die Datei aktuell zu halten, ohne zur alten Dateiflut zurückzukehren — gebaut
werden muss, wenn sie gebaut wird. Ein ADR, das diesen Zielkonflikt verschweigt, wird beim ersten
Widerspruch überstimmt, weil es dann als praxisfremd erscheint, statt als die Richtung, die eine
noch offene technische Frage einzuhalten hat.

## Konformität

```konformitaet
aussage:  Die Beschriftung des internen Sicherungsvorgangs behauptet nicht, eine Datei zu sein
          (kein „Datei"-Wort im Label) — anders als die Beschriftung des echten Datei-Wegs.
zustand:  geprüft
herkunft: invariante
pruefung: tests/persistenz-status.test.js#PS10-6: die neue interne Beschriftung behauptet KEINE Datei — anders als saveStatusJetztSichern
```

```konformitaet
aussage:  Kein Zustand existiert nur im internen Speicher, ohne dass die Bürgerin es weiß.
zustand:  nicht-prüfbar
grund:    Das verlangt, JEDEN zustandsverändernden Pfad im Kern gegen JEDES sichtbare Signal zu
          prüfen — kein heutiger Mechanismus tut das erschöpfend, und ein Test, der das
          vorspiegelt, wäre unehrlicher als gar keiner. Awareness-Bausteine bestehen bereits
          punktuell (exportErinnerungVielleichtZeigen(), der iOS-Install-Hinweis) — sie belegen
          die Haltung, nicht die Vollständigkeit. Prüfbar, sobald ein Mechanismus JEDEN
          zustandsverändernden Schreibpfad im Kern erfasst und gegen ein Register bekannter
          Awareness-Signale hält — heute fehlen beide: das Erfassen und das Register, nur
          Einzelfälle bestehen.
```

```konformitaet
aussage:  Weicht die Datei vom internen Stand ab, ist die Datei die Bezugsgröße, an der die
          Abweichung benannt wird.
zustand:  nicht-prüfbar
grund:    Das heutige Konflikt-Modell (speicherKonfliktModell()) ist bewusst symmetrisch — es
          erkennt eine fremde Marke am Ziel, gleich ob Datei oder interner Speicher, und legt die
          Wahl der Bürgerin vor, ohne selbst zu behaupten, welche Seite „richtig" ist. Das
          widerspricht diesem Satz nicht, trägt ihn aber auch noch nicht: es gibt heute keine
          Stelle, die Abweichung in der hier verlangten Richtung BENENNT. Dieses ADR setzt die
          Richtung für die Sprache, die eine künftige Divergenz-Anzeige tragen muss. Das ist
          keine Fußnote, sondern eine offene Bau-Lücke: **prüfbar, sobald `speicherKonfliktModell()`
          (oder die Anzeige darüber) die Datei als Bezugsgröße führt statt beide Seiten
          gleichrangig zu behandeln** — ein Test könnte dann prüfen, dass eine Konflikt-Meldung
          den internen Stand als „abweichend von der Datei" benennt, nie umgekehrt.
```

```konformitaet
aussage:  Der interne Speicher bleibt Mittel, nie alleiniger Ort der Arbeit.
zustand:  nicht-prüfbar
grund:    Dies ist die zusammenfassende These des ADR selbst, keine von ihr unabhängige
          Einzeltatsache — sie lässt sich nicht als eigener Test von den drei Klauseln oben
          trennen, ohne sie zu wiederholen. Prüfbar wird sie nicht eigenständig, sondern als
          Summe: sobald Klausel 1 und Klausel 3 oben jeweils geprüft sind (Klausel 2 ist es
          bereits), hält auch diese These — ein eigener vierter Test würde nur wiederholen, was
          die anderen drei zusammen bereits zeigen.
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
