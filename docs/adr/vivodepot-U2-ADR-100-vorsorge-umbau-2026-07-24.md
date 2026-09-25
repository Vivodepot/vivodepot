# U2-ADR-100: Der Vorsorge-Umbau — ein Ort für Vorsorge-Instrumente

**Status:** Angenommen
**Datum:** 24.07.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-089 (Vorsorge-Instrument-Liste) · U2-ADR-096 (Unterfeld-Adressierung) ·
U2-ADR-089-Nachtrag §3 (abgelöst) · U2-ADR-067 (am KI-Punkt abgelöst) · U2-ADR-033
(Testament-Verzicht) · U2-ADR-050 (Verwaisungs-Regel) · U2-ADR-097 (produkttragende
Zusicherungen) · U2-ADR-098 (Klausel-Format)
**Anker:** internes Entscheidungsdokument vom 22.07.2026,
internes Abgrenzungsdokument vom 23.07.2026 (interne Entscheidungsdokumente, nicht Teil dieses Repos)
**Status heute:** gilt — fünf der sieben eigenen Konformitäts-Aussagen mechanisch geprüft (u. a.
`tests/testament-verzicht-klausel.test.js`, `tests/sektoren-spec.test.js`,
`tests/regal-sprungziele.test.js`, `tests/lese-zusammenfassung-vollstaendig.test.js`); zwei bleiben
laut eigenem Klausel-Feld offen, eine nicht-prüfbar — unverändert.

---

## Kontext

Vorsorge trug zwei Wege zum selben Ergebnis: Gates, die nach der
Existenz eines Instruments fragten, und Wizards, die dasselbe Instrument
noch einmal erfassten. Was ein Bürger eintrug, lag danach an zwei
Stellen, und keine der beiden war die maßgebliche.

Der Umbau schafft einen Ort — `vorsorge_instrumente` — und nimmt die
Doppelungen zurück.

---

## Entscheidung

### 1 — Ein Ort für Vorsorge-Instrumente

Alle Vorsorge-Instrumente liegen als Zeilen in `vorsorge_instrumente`.
Die Gates entfallen. Der Import-Alias bleibt bestehen, wandelt aber ein
Gate in einen Instrument-Record; die Deduplizierung wirkt nur im
Alias-Pfad über den Marker `_ausGate`.

### 2 — Wizard-Prinzip

Ein Wizard existiert nur, wenn er ein Dokument erzeugt. Wizards, die
lediglich Felder abfragen, die auch in der Instrument-Zeile stehen,
entfallen: `vvwiz`, `bwwiz`, `srwiz`, `erbwiz`. Es bleiben `pvwiz` und
`kiwiz`.

**Die drei Kategorien** (Ankerdokument vom 22.07., wörtlich): Ein Wizard
fügt etwas hinzu — Dokument oder geführte Entscheidungen —, dann bleibt
er. Er spiegelt nur Felder, dann fällt er weg. Oder er wäre wertvoll, ist
aber gesperrt — dann bleibt die Stelle leer, aber mit Begründung.

Zuordnung: **Bleibt** — `pvwiz`, `kiwiz`. **Fällt als Spiegel** —
`vvwiz`, `bwwiz`, `srwiz`, `erbwiz`. **Bewusst verweigert** — der
Testament-Wizard, der nie gebaut wurde.

Zur dritten Kategorie im Wortlaut: „Ein Testament-Wizard wäre wertvoll …
Aber er darf nicht gebaut werden — es gibt kein öffentliches Template,
und ein geführter Verfügungstext macht Vivodepot zum Verfasser und löst
Haftung aus (ADR-033)."

*`erbwiz` steht im Ankerdokument im Testament-Abschnitt, gehört aber in
die zweite Kategorie: „Der heutige erbwiz spiegelt ohnehin nur Felder und
fällt schon deshalb." Der Fundort ist nicht die Kategorie. Die dritte
Kategorie ist die leere Stelle, nicht ein entfallener Wizard.*

### 3 — Record-only

Kein Record heißt „nicht hinterlegt", nicht „nein". Ein angelegter
Eintrag heißt, dass das Instrument vorhanden ist; das Fehlen eines
Eintrags ist keine Verneinung. Vivodepot behauptet nichts über Dinge,
die es nicht weiß.

### 4 — Testament-Verzicht

Vivodepot erzeugt kein Testament und keinen Verfügungstext dazu
(Fortführung von ADR-033). Festhaltbar sind Vorhandensein und
Ablageort — mehr nicht.

**Der Verzicht ist nur haltbar, solange das Festhalten funktioniert.**
Der Abriss-Test prüft, dass Altes weg ist; er prüft nicht, dass Neues da
ist. Deshalb sichert eine eigene Prüfung positiv zu, dass die
Testament-Zeile mit `ort`-Unterfeld existiert, befüllbar ist, Speichern
und Öffnen überlebt und in der Lese-App ankommt.

**Der Ablageort ist der Grund, warum das Festhalten einen Zweck hat:
Jemand soll das Testament finden können.** Eine Änderung, die ihn in der
Lese-App unsichtbar macht, bricht diese Entscheidung — auch wenn sie
technisch sauber ist. Das ist am 23.07. eingetreten und von der Prüfung
aufgehalten worden, bevor es committet war.

### 5 — Vivodepot erklärt keine Rechtsbegriffe

Bürger-Texte sagen, was das Werkzeug tut und was es nicht tut. Sie
erklären keine Rechtsbegriffe und geben keine Handlungsempfehlung.

Belegfall: Das Feld `vermaechtnisse` trug den Hinweis „Ein Vermächtnis
ist ein einzelner Gegenstand oder Betrag für eine bestimmte Person
(§ 1939 BGB) — ohne dass sie Erbin wird." Das ist Rechtsbelehrung, nicht
Bedienhilfe. Er entfällt.

Zweiter Belegfall, weniger offensichtlich: Der Platzhalter desselben
Feldes lautete „Großmutters Ring an Tochter Anna; 5.000 EUR an den
Tierschutzverein". Ein Platzhalter, der testamentarische Sprache
vorführt, untergräbt den Testament-Verzicht stärker als ein fehlender
Hinweistext — er zeigt nicht nur, dass man hier schreiben kann, sondern
wie man ein Testament formuliert. Ersetzt.

Die Grenze der zulässigen Formulierung: Feststellung, wo Testamente
entstehen. Keine Aufforderung, eines zu machen. Sobald ein Text zum
Regeln auffordert statt festzustellen, ist es Rechtsberatung.

### 6 — Parität heißt gleiche Information, nicht gleiche Mechanik

Kern und Lese-App zeigen dieselben Angaben. Sie tun das nicht zwingend
mit demselben Verfahren.

Belegfall: Der Kern kürzt Listen-Zusammenfassungen über
`zusammenfassungFelder` und
`unterdrueckeInZusammenfassungWennGesetzt` — er kann das, weil daneben
eine Detailansicht steht. Die Lese-App hat keine Detailansicht; dort ist
die Zusammenfassung die einzige Sicht. Dieselben Flags dort auszuwerten
hätte vierundzwanzig von vierunddreißig wertetragenden Unterfeldern
unsichtbar gemacht, darunter Ablageort, ZVR-Eintragungsnummer — über die
ein Gericht eine Vollmacht überhaupt erst findet — und zehn der zwölf
`ki_*`-Felder.

Die Flags werden deshalb aus den Lese-App-Deklarationen **entfernt**,
mit Kommentar am Ort. Sie dort ungenutzt liegen zu lassen erzeugt beim
nächsten Durchgang denselben Scheinbefund.

**Regel:** Bevor ein Mechanismus vom Kern in die Lese-App gespiegelt
wird, ist zu prüfen, ob die Umgebung dort dieselbe ist. Gleiche Mechanik
in ungleicher Umgebung erzeugt ungleiche Information.

### 7 — Migrationsstufen tragen Literale

Eine Migrationsstufe nennt die Schema-Nummer als Literal, nicht über die
Aktuell-Konstante. Sonst verschiebt sich die Bedeutung einer
geschriebenen Stufe, sobald die Konstante steigt.

### 8 — Feld-Entfernung erfordert einen Registereintrag

Wird ein Feld entfernt, wird es im Alt-Label-Register erfasst: id,
Label, Typ, Optionslabels, verschachtelte Unterfelder, Entfernungsdatum,
ADR.

**RC-Grenze.** Bis zum RC darf ein Feld ersatzlos entfallen, sofern der
Registereintrag steht — es existieren keine Depots in fremder Hand. Ab
dem ersten ausgelieferten Depot gilt Zusicherung 9 (Bürgerdaten werden
nie durch Migration gelöscht) hart, und jede Feld-Entfernung braucht
eine Migration.

Diese Grenze fällt mit dem RC, ohne dass jemand einen Schalter umlegt.
Deshalb steht sie datiert hier und nicht nur im Kopf der Beteiligten.

### 8a — Die Ausnahmen des Abriss-Tests

Zwei Sektionen sind vom Abriss ausgenommen, jede mit Grund.

**`erben`** — Erbe-Inhalt gilt auch ohne Testament (gesetzliche Erbfolge,
§§ 1924 ff. BGB) und ist per U2-ADR-067 §3 bewusst nicht ans Testament
gekoppelt.

**Pflegewünsche** — ergänzen die Patientenverfügung und helfen
Pflegepersonen, den Willen der Person zu kennen. Ergänzung, kein
Instrument. Die Begründung stand bisher nur als Sektions-`hint` im Code;
sie wird hier erstmals als Entscheidung festgehalten.

**`hilfsmittel` ist keine eigene Ausnahme.** Das Feld liegt innerhalb der
Pflegewünsche-Sektion und ist von deren Ausnahme gedeckt. Es getrennt
aufzuführen suggerierte eine eigene Entscheidung, die nie getroffen
wurde. Aus der Ausnahmeliste gestrichen; am Code ändert sich nichts.

### 8b — Berührte Zusicherungen aus U2-ADR-097

**Nr. 9** (Bürgerdaten werden nie durch Migration gelöscht) — gestützt.
`migration-keine-neuen-waisen.test.js` misst vorher gegen nachher;
`migration-40-ki-ort.test.js` prüft ausdrücklich, dass die Migration
nichts löscht. Dazu die RC-Grenze aus Punkt 8.

**Nr. 5** (kein Klartext außerhalb der erlaubten Ausschnitte) — gestützt.
`notfall-allowlist-instrument.test.js` ist in diesem Branch entstanden
(U2-ADR-096 §5). Der Umfang der Allowlist bleibt bei zehn Einträgen, aber
zwei davon sind jetzt Selektoren auf Instrument-Unterfelder statt
Flachfelder — der Zugriffsweg ist neu, die Menge nicht. §5a sichert zu,
dass genau eine Zeile je Typ ausgegeben wird, auch bei Auswahl „alle";
die Klartext-Menge wächst nicht mit der Zahl der Instrument-Zeilen.

**Nr. 2** (keine Cloud) — unberührt, belegt. Der Branch ändert 448 Zeilen
in der Lese-App, ohne einen Storage-Pfad zu erzeugen; die beiden
`localStorage`/`indexedDB`-Fundstellen dort sind Kommentare zur
Read-only-Disziplin und liegen außerhalb des Diffs. Der größte Eingriff
in die Lese-App seit Monaten hat die D43-Invariante „Lese-App null
Storage" nicht berührt.

Die übrigen sieben Zusicherungen sind unberührt.

### 9 — Ablösungen

**U2-ADR-089-Nachtrag §3** (22.07.2026, Zeile 28–30) wird abgelöst.
Abgelöst wird der Beschluss, die vier Gate-Felder zu behalten, weil ein
Instrument-Record nur „existiert / existiert nicht" kenne, während das
Gate zusätzlich den Zwischenzustand `plant` trage — „ich kümmere mich
gerade darum".

Grund der Ablösung: Der Zwischenzustand rechtfertigt keinen zweiten Ort
für dieselbe Angabe. Der Nachtrag ist als überholt zu vermerken, nicht
stillschweigend zu übergehen.

**U2-ADR-067** (10.07.2026, Zeile 26–27) wird am KI-Punkt abgelöst.
Abgelöst wird der Klammersatz: „(Die KI-Verfügung liegt in Sektor 9
‚Verwaltung', nicht hier — außerhalb dieses Umbaus.)" Die KI-Verfügung
liegt seit Block E am gemeinsamen Ort (Migration 39→40).

### 10 — Nachreichung zu U2-ADR-096: bereits erfolgt

Die in der Übergabe als offen geführte Nachreichung ist erledigt.
U2-ADR-096 trägt seit `22e72f9` eine Konformitätsklausel (Zeile 172–185)
mit vier Prüfungen — `alt-label-register-*` und
`migration-erzeugt-keine-neuen-waisen` — samt Bedeutungszeile.

Offen bleibt dort nur der Linter, der die Bindung ADR ↔ Prüfung in beide
Richtungen erzwingt. Er ist in U2-ADR-096 selbst als offen benannt und
gehört zu Strang B, nicht hierher.

**Aus der Restliste des Umbaus streichen.**

---

## Folgen

- Vorsorge hat einen maßgeblichen Ort. Wer wissen will, was ein Bürger
  hinterlegt hat, sieht an einer Stelle nach.
- Vier Wizards entfallen; der Pflegeaufwand sinkt entsprechend.
- Die Regel aus Punkt 6 ist der Preis dafür, dass Kern und Lese-App
  getrennte Renderer haben. Sie wird bei jeder künftigen Spiegelung
  fällig.

## Nicht Teil dieser Entscheidung

Die Prüf-Architektur (U2-ADR-099), der Zusicherungs-Scanner, die
Darstellungsfrage der Lese-App bei vielen Feldern (Sammelliste), die
Ansicht „Frühere Angaben".

---

## Konformität

```konformitaet
aussage:   Die Testament-Zeile trägt weder Wizard noch Generator; sie
           existiert mit ort-Unterfeld, ist befüllbar, überlebt Speichern
           und Öffnen und erscheint in der Lese-App.
zustand:   prüfbar
herkunft:  invariante
pruefung:  tests/testament-verzicht-klausel.test.js#[Verzicht] die Testament-Zeile ist deklariert und traegt ein befuellbares ort-Unterfeld
pruefung:  tests/testament-verzicht-klausel.test.js#[Verzicht] eine Testament-Zeile laesst sich anlegen und traegt den Ablageort
pruefung:  tests/testament-verzicht-klausel.test.js#[Verzicht] Ablageort ueberlebt Speichern und Oeffnen — echter Pfad, kein setData
pruefung:  tests/testament-verzicht-klausel.test.js#[Verzicht] die befuellte Zeile erscheint in der Lese-App
pruefung:  tests/testament-verzicht-klausel.test.js#[Verzicht] und der Verzicht selbst gilt weiter: kein Wizard, kein Generator
```

```konformitaet
aussage:   Kein Vorsorge-Gate und kein abgelöstes Flachfeld im
           Vorsorge-Sektor; 14 abgerissene Feld-ids bleiben abgerissen.
           Ausgenommen: erben, Pflegewünsche.
zustand:   prüfbar
herkunft:  invariante
pruefung:  tests/sektoren-spec.test.js#Sektor 8 Vorsorge: vier Sektionen — Instrumente leben in der Liste (U2-ADR-096)
pruefung:  tests/sektoren-spec.test.js#Sektor 8 Vorsorge: Detailfelder haengen am `typ` der Instrument-Zeile (U2-ADR-096)
```

```konformitaet
aussage:   Die Zielsektion der Regal-Karten wird aus dem Modell abgeleitet
           und existiert; verschwindet die Liste aus ihrer Sektion,
           schlägt die Prüfung namentlich an.
zustand:   prüfbar
herkunft:  invariante
pruefung:  tests/regal-sprungziele.test.js#[Sprung] jede Regal-Karte springt auf einen Anker, den es gibt
pruefung:  tests/regal-sprungziele.test.js#[Sprung] keine Sektion ohne Inhalt — eine leere Ueberschrift ist ein Sprungziel ohne Ziel
```

*Bewusst schmal formuliert. Weil `modulKarteZiel` das Ziel ableitet statt
es hinzuschreiben, kann die Klasse „Ziel zeigt auf die falsche Sektion"
nicht mehr entstehen — die Prüfung fängt sie nicht, weil es sie nicht
gibt. Die weitere Fassung „kein Sprungziel ohne Ziel" behauptete mehr,
als hier gemessen wird.*

```konformitaet
aussage:   Die Lese-App trägt keine Kürzungs-Flags und zeigt jedes
           gefüllte Unterfeld außer den Verweis-Typen ref und refMehrfach,
           die ein Personen-Register brauchen; der Kern kürzt weiterhin.
zustand:   prüfbar
herkunft:  invariante
pruefung:  tests/lese-zusammenfassung-vollstaendig.test.js#[ZusVoll] die Lese-App traegt KEINE Kuerzungs-Flags in ihren Deklarationen
pruefung:  tests/lese-zusammenfassung-vollstaendig.test.js#[ZusVoll] JEDES deklarierte Unterfeld erscheint, wenn es gefuellt ist
pruefung:  tests/lese-zusammenfassung-vollstaendig.test.js#[ZusVoll] der KERN kuerzt weiterhin — dort ist es richtig
```

```konformitaet
aussage:   Ein entferntes Feld steht im Alt-Label-Register — allgemein,
           über alle künftigen Entfernungen. Für diesen Branch ist es
           bereits durch tests/alt-label-register.test.js gedeckt.
zustand:   offen
frist:     2026-10-31
bedingung: Integritäts-Registry steht (Prüf-Architektur, Strang B)
```

```konformitaet
aussage:   Ab RC entfernt keine Migration ein vom Bürger erfasstes Feld
           ohne Übernahme des Werts.
zustand:   offen
frist:     2026-10-31
bedingung: erstes ausgeliefertes Depot in fremder Hand. Am 31.10.2026 wird
           entschieden, ob ein RC-Datum absehbar ist; wenn ja, wird die
           Frist darauf gezogen, wenn nein, die Klausel neu gefasst.
```

```konformitaet
aussage:   Bürger-Texte erklären keine Rechtsbegriffe.
zustand:   nicht-prüfbar
grund:     Ob ein Satz einen Rechtsbegriff erklärt, ist eine
           Bedeutungsfrage; keine Prüfung unterscheidet Bedienhilfe von
           Belehrung. Der Maßstab ist die Textinventur, nicht die Suite.
```

---

*Vivodepot GmbH · Berlin · 24.07.2026*
