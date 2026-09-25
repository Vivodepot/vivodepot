# U2-ADR-273: Der Abbruch beendet die Prozeßgruppe, nicht nur den Wartenden

**Status:** Akzeptiert
**Datum:** 04.09.2026
**Kategorie:** WERKZEUG, PRÜFSTAND
**Drei-Anker:**
- **Code-Stelle:** `tools/mit-zeitgrenze.pl` (neu); vier Aufrufstellen in `hooks/pre-commit`
  (Behavior-Suite, `codelisten:check`) und `hooks/pre-push` (Kampagne, Konformitäts-Gates).
- **ADR-Bezug:** U2-ADR-106 (ungemessen ist nicht bestanden — der rote Zweig bleibt rot),
  U2-ADR-225 (geteilte Temp-Namen: dieselbe Klasse, deshalb sind die Marker der Probe je Lauf
  UND je Prozeß eindeutig).
- **Status heute:** gilt — Beleg `tests/wecker-beendet-die-gruppe.test.js`, vier Proben,
  darunter ein Rot-Beweis, der die alte Bauart festhält.

---

## Der Befund

Die Hooks fuhren ihre Läufe unter einer Zeitgrenze:

```
perl -e 'alarm 450; exec @ARGV or exit 127' -- npm test
```

**`alarm()` überlebt `exec`.** POSIX räumt einen anstehenden Wecker bei `exec` nicht ab — nur
`fork` löscht ihn im Kind. Der Wecker feuerte also **im ausgeführten Befehl**, und dessen
Vorgabe-Verhalten bei SIGALRM ist „beenden".

**Damit starb der Elternprozeß — und nur er.** `npm test` startet rund vierzehn
`node --test`-Arbeiter; das Beenden des Elternprozesses nimmt die Prozeßgruppe nicht mit. Die
Arbeiter liefen verwaist weiter.

**Was daraus wurde, in der Nacht zum 04.09.2026:** Jeder gescheiterte Commit-Versuch hinterließ
einen vollständigen Testlauf. Zwölf parallele Sitzungen, **172 verwaiste Prozesse, Lastdurchschnitt
202, Swap zu 87 % belegt.** Jeder Versuch machte den nächsten unwahrscheinlicher. **Acht fertig
gebaute Zweige kamen die ganze Nacht nicht durch** — nicht wegen eines Fehlers im Code, sondern
weil die Maschine unter ihren eigenen Wächtern zusammenbrach.

> **Ein Wächter, der den Hänger meldet, aber nicht beendet, erzeugt genau den Zustand, gegen den
> er schützen soll.**

Der Wecker wurde am 28.08.2026 bei Lastdurchschnitt 3–6 kalibriert — in einer Welt, in der eine
Sitzung arbeitete.

## Die Entscheidung

**1 · Ein Werkzeug, nicht vier Zeilen.** `tools/mit-zeitgrenze.pl` löst alle vier Aufrufstellen
ab. Vier baugleiche Einzelreparaturen wären **vier Gelegenheiten, verschieden falsch zu liegen** —
und die vier Stellen sind nicht gleich riskant: `codelisten:check` beendet ein kleines Werkzeug,
`test:konformitaet` einen Browser-Lauf.

**2 · Der Wecker bleibt im Elternteil.** Das Kind bekommt über `setpgid` eine **eigene
Prozeßgruppe**; bei Ablauf wird die **Gruppe** beendet — erst `TERM`, zwei Sekunden Gnadenfrist,
dann `KILL`. `timeout` gäbe es dafür, aber **macOS bringt es nicht mit** (gemessen: Exit 127).

**3 · Der 142-Vertrag ist bindend.** `hooks/pre-commit` erkennt den Hänger an `_rc = 142`.
**Tötet man die Gruppe, stirbt der Elternprozeß womöglich an TERM oder KILL statt an ALRM** — der
echte Rückgabewert wäre dann nicht mehr 142. Das Werkzeug meldet **142, egal woran der Prozeß
tatsächlich gestorben ist.** Ohne das verlöre der rote Zweig seinen Auslöser, und der Hook meldete
grün — **nicht weil alles gut war, sondern weil sein Auslöser verschwunden ist.**

**4 · Nie die eigene Gruppe.** Vor **jedem** Signal wird geprüft: Zielgruppe existiert, sie ist die
des Kindes (`getpgrp($kind) == $kind`), sie ist **nicht** die eigene. Schlägt eine der drei
Prüfungen fehl, wird **nur der Elternprozeß** beendet.

> **Halbheit ist hier besser als ein Signal an die falsche Gruppe.** Das alte, unvollständige
> Verhalten ist harmlos. Ein Signal an die Gruppe, in der git auf den Hook wartet, ist es nicht.

**5 · Die Zeitwerte bleiben unverändert** (450/60/90/120). Das Nicht-Aufräumen ist ein **Defekt**,
die Werte sind eine **Kalibrierungsfrage**. Zusammen geändert wäre hinterher keine von beiden
gemessen. **Und die Kalibrierung ist ohnehin erst zu beurteilen, wenn das Aufräumen steht — weil
die Last dann eine andere ist.** Die Messung der echten Suite-Dauer folgt als eigener Posten, auf
ruhiger Maschine, mit der Last dabei.

**6 · Die Probe fährt den Pfad direkt, ohne `npm test`.** Die Frage lautet „lebt danach noch
etwas" — hinter 6900 Prüfungen wird sie nur verdeckt und verteuert, nicht schärfer beantwortet.
Ein `sleep` mit zwei Unterprozessen belegt dieselbe Eigenschaft in Sekunden.

**7 · Beide Richtungen, weil das Werkzeug selbst destruktiv ist.** Es muss belegen, dass es
**trifft** — und dass es **daneben nichts mitnimmt**. Die zweite Hälfte wird gern vergessen und ist
im Schadensfall die teure.

**8 · Der Rot-Beweis konserviert den Defekt.** `[Wecker·Rot-Beweis]` fährt die **alte** Bauart und
behauptet, dass zwei Kinder überleben. Er ist heute grün, **weil er den Fehler festhält.** Wird er
eines Tages rot, ist die alte Bauart irgendwo zurückgekehrt.

---

## Was beim Bauen schiefging — und warum es hier steht

Die Prüfung aus Punkt 4 rief in ihrer ersten Fassung `POSIX::getpgid($kind)`. **Das gibt es in
Perl nicht** — `POSIX` kennt nur `getpgrp`. Der Aufruf starb mit *„getpgid is not a valid POSIX
macro"*; das Werkzeug lieferte **Exit 4 statt 142 und ließ die Kinder am Leben.** Also genau den
Defekt, den es beheben sollte.

**Zwei Lehren, beide teurer als der Fehler:**

**Eine Probe, die aus dem falschen Grund rot wird, verdeckt den richtigen.** Die Probe schlug fehl
— aber wegen ihrer eigenen Zeitwerte, nicht wegen des Defekts. Sie sah aus wie Deckung und war
keine. **Gefunden wurde der echte Fehler durch eine direkte Handmessung**, gefahren, weil der
Fehlschlag nicht zur erwarteten Ursache paßte. Wäre die Probe an ihren Zeiten repariert worden,
hätte sie danach grün gemeldet — über einem kaputten Werkzeug.

**Und: die Sicherheitsprüfung hätte fast selbst den Defekt eingebaut, den sie verhindern soll.**
Punkt 4 ist die gefährlichste Stelle des Werkzeugs, deshalb wurde sie eigens verlangt — und genau
dort entstand der Fehler. **Eine Prüfung, die Schaden verhindern soll, gehört selbst geprüft**, und
zwar an der Wirkung, nicht am Vorhandensein.

---

## Was offen bleibt

- **Die Kalibrierung** der vier Zeitwerte. Eigener Posten, eigene Begründung, nach der Landung auf
  ruhiger Maschine zu messen.
- **Playwright-Kindprozesse:** ob ein Chromium aus `test:konformitaet` wirklich an der Gruppe hängt
  oder daneben, ist **nicht** eigens gemessen — die Probe belegt die Eigenschaft am allgemeinen
  Fall. Ein Browser, der die Gruppe verließe, wäre dieselbe Halde in Grün.

- **WANN der Fix wirkt — und es gibt dafür längst einen Wächter.** Ein frisch per
  `git worktree add` angelegter Baum bringt einen **absoluten** `core.hooksPath` auf das
  `hooks/` des **Hauptbaums** mit, nicht auf sein eigenes. **Der Baum fährt dann fremde Hooks** —
  ein Commit kann die geänderte Hook-Datei tragen und trotzdem eine andere ausführen.

  **`tests/hooks-laufen-wirklich.test.js` prüft genau das**, benennt die Folge wörtlich und nennt
  die Reparatur mit: `git config --worktree core.hooksPath "$(pwd)/hooks"` — **worktree-eng, die
  geteilte Konfiguration bleibt unangetastet.** Beim Bau dieses ADRs wurde der Befund erst
  eigenständig „entdeckt" und dann im Haus wiedergefunden. **Eine Stunde für etwas, das als
  Wächter mit Lösung dastand.**

  **Und die eigentliche Gefahr lag daneben:** Der Fehlschlag galt in dieser Nacht als
  „Last-Flatterer, einmal wiederholen". **Er ist keiner.** Er schlägt an, weil die Bedingung
  wirklich verletzt ist — und er ist im Hauptbaum grün, weil der Pfad dort zufällig stimmt.
  **Ein echtes Signal wurde als Rauschen eingeordnet und zum Wiederholen freigegeben.** Wie oft
  er so weggeklickt wurde, ist nicht mehr feststellbar.

- **Der Selbst-Beleg: gestrichen, weil falsch — wieder aufgenommen, weil hergestellt.**
  Zuerst hieß es, der Commit dieses ADRs sei „der erste, der durch den neuen Weg läuft". **Das war
  falsch**, solange der Baum fremde Hooks fuhr; ein grünes Ergebnis hätte wie eine Bestätigung
  ausgesehen, die es nicht war. Nach dem worktree-engen Pfad **stimmt es** — nicht als Annahme,
  sondern weil der Wächter es erzwingt. **Der Beleg bleibt trotzdem die Probe, nicht der Commit;
  der Commit ist die Zugabe.**

- **Der Fix, angewandt auf den Bauenden selbst.** Während dieser Arbeit lief ein
  `faktenbasis-erzeugen.js` in die Zeitgrenze der **Werkzeugebene** und wurde mit SIGTERM
  abgeschossen — derselbe Mechanismus, eine Ebene höher. **Es wurde auf verwaiste Prozesse geprüft
  statt den Lauf zu wiederholen.** Genau die Reihenfolge, die in der Nacht zum 04.09.2026 gefehlt
  hat: erst nachsehen, was noch lebt, dann erst neu starten.

- **Playwright-Kindprozesse:** ob ein Chromium aus `test:konformitaet` wirklich an der Gruppe hängt
  oder daneben, ist **nicht** eigens gemessen — die Probe belegt die Eigenschaft am allgemeinen
  Fall. Ein Browser, der die Gruppe verließe, wäre dieselbe Halde in Grün.

- **Die Kalibrierung** der vier Zeitwerte. Eigener Posten, eigene Begründung, nach der Landung auf
  ruhiger Maschine zu messen.

---

---

## Nachtrag 05.09.2026: die Kalibrierung, gemessen

Der letzte offene Punkt oben — *„Die Kalibrierung der vier Zeitwerte … nach der Landung auf ruhiger
Maschine zu messen"* — ist für den größten der vier Werte eingelöst. Die Messung fiel anders aus
als erwartet, und zwar in eine Richtung, die eine Betriebsregel gekippt hat.

### Der Anlaß war eine Schätzung, keine Zahl

Um die Landungen dieser Nacht zu ordnen, galt: **zwei Suite-Läufe gleichzeitig brauchen sechs bis
acht Minuten und liegen damit an der Grenze.** Daraus wurde eine Warteschlange — Sitzungen warteten
aufeinander, statt zu committen, wenn sie fertig waren. **Die Zahl war nie gemessen.**

### Fünf Läufe

| # | Beginn | Dauer | Lastspitze | Arbeiter | Bedingung |
|---|---|---|---|---|---|
| 1 | 01:24:29 | 286 s | 6,74 | 19 | **rot**, fünf Fehlschläge; ruhige Maschine |
| 2 | ~01:31:50 | ~298 s | 7,04 | 19 | Ergebnis ungeprüft |
| 3 | ~01:37:10 | ~285 s | 6,59 | 19 | Ergebnis ungeprüft |
| 4 | eigener Lauf | 288 s | 8,35 | *siehe unten* | **grün**; überlappender Fremdlauf |
| 5 | 01:41:12 | ~290 s | 8,38 | 19 | ungeprüft; überlappend |

**Die Weckergrenze steht bei 450 Sekunden. Der längste Lauf nutzte zwei Drittel davon.**

Zum Vergleich der Läufe 1 und 4 gehört ein Vorbehalt, der nicht weggelassen wird: **sie
unterscheiden sich in zwei Merkmalen, nicht in einem.** Lauf 1 lief allein und endete rot, Lauf 4
lief unter Fremdlast und endete grün. Daß ein roter Lauf so lang ist wie ein grüner, ist
plausibel — `node --test` fährt ohnehin alle Dateien — **aber nicht gemessen.** Der Befund „286
gegen 288, also kostet ein Nachbar fast nichts" trägt trotzdem, nur eben als Vergleich mit zwei
offenen Variablen statt einer.

### Was ein Commit kostet — nicht dasselbe wie: was die Suite kostet

**Alle Zahlen oben messen die Suite.** Wer eine Warteschlange führt, braucht eine andere:

| | Dauer |
|---|---|
| Behavior-Suite allein | **285 – 298 s** (fünf Messungen) |
| Commit insgesamt | **rund 6 Minuten** |

Die Differenz sind die übrigen `pre-commit`-Gates, die **nach** der Suite laufen: Grundlinien-Abgleich,
SBOM gegen die `@vd-lib`-Marker, Ganzdatei-Prüfsumme, Worktree-Wächter, OSV-Scan.

**Diese Unterscheidung fehlte die ganze Nacht.** Freigaben wurden nach der
Suite-Dauer getaktet; ein Commit belegt seinen Platz aber gut eine Minute länger. Bei sechs bis acht
wartenden Commits summiert sich das auf sechs bis acht Minuten, die in keiner Planung standen.

**Für die Suite-Kalibrierung bleibt die erste Zahl die richtige** — die Weckergrenze von 450 s
umschließt den `npm test`-Aufruf, nicht die Gates danach. **Für jede Aussage über Belegung, Wartezeit
oder gleichzeitige Läufe ist es die zweite.**

### Der Überlapp trat von selbst ein

Ein bestellter Doppellauf war vorbereitet und wurde nicht gebraucht: zwei Sitzungen liefen
ineinander, ohne daß jemand ein Signal gab.

```
01:41:05  adr-262 im Abbau  19 -> 7            Last 5,42
01:41:20  zwei Bäume:        7 + 15 = 22       Last 5,34
01:41:50  zwei Bäume:        7 + 15 = 22       Last 4,73
01:43:36  zwei Bäume:        5 + 18 = 23       Last 8,38   <- Spitze
01:44:51  nur paket5:       19                 Last 6,58
```

**23 gleichzeitige Arbeiter, Lastspitze 8,38, Abbruchschwelle 25.** Beide Vorhersagen lagen zu
hoch, und beide in dieselbe Richtung: die koordinierende Sitzung hatte sechs bis acht Minuten
erwartet, die messende Sitzung eine Last von 11 bis 13.

**Bei drei Läufen kippt das Bild.** Um 01:53:24 liefen drei Bäume gleichzeitig:

```
01:49:38  modul-einlass-warnung startet             Last  2,61
01:50:38  adr259-landing-v2 dazu       30 Arbeiter  Last  4,48
01:51:08  vd-a553-en-buergersatz dazu  47 Arbeiter  Last  8,58
01:53:24  Spitze                       56 Arbeiter  Last 22,94   <- Vorwarnung 20 gerissen
```

**56 Arbeiter, Lastspitze 22,94, Abbruchschwelle 25.** Es hielt, aber knapp.

Die drei Meßpunkte zusammen:

| gleichzeitige Läufe | Arbeiter | Lastspitze |
|---|---|---|
| 1 | 19 | 6,7 – 7,0 |
| 2 | 23 | 8,4 |
| 3 | 56 | 22,9 |

**Der Sprung liegt zwischen zwei und drei.** Von einem auf zwei kostet fast nichts, von zwei auf
drei verdreifacht sich die Last. **Eine lineare Fortschreibung ist in diesem Bereich wertlos** —
die Vorhersage „11 bis 13 für zwei Läufe" war zu hoch, der daraus abgeleitete Schluß „dann passen
auch sechs" zu niedrig. **Dieselbe Extrapolation, in beide Richtungen falsch.** Der Satz „die
Maschine wird nicht gesättigt" gilt für zwei Läufe und war als allgemeine Aussage zu weit
gegriffen; er hat in dieser Nacht beinahe zu einer Freigabe an sechs gleichzeitige Sitzungen
geführt.

**Als Betriebsregel vorgeschlagen, nicht abgeleitet:** zwei gleichzeitige Läufe sind frei, ab drei
ist es eine Entscheidung. Was zwischen zwei und drei genau geschieht, ist nicht gemessen.

### Die Abbaukurve — der eigentliche Wirkungsnachweis

Wichtiger als jede Spitzenzahl ist, **wie ein Lauf endet.** Dreimal unabhängig gemessen:

```
Lauf 1    19 -> 7 -> 4 -> 0        ~60 s
Lauf 2    19 -> 7 -> 6 -> 7 -> 0   ~60 s
Lauf 3    19 -> 7 -> 0             ~60 s
```

Konstant ist der Sprung von **19 auf 7** und danach eine knappe Minute Auslauf.

**Damit ist die Halde der Vornacht erklärt.** Wer in dieser Phase die Zeitgrenze reißt, verwaist
unter der alten Bauart **sieben** Prozesse — nicht neunzehn, und nicht einmalig, sondern **bei
jedem Anlauf erneut.** Eine Halde von 172 braucht keinen katastrophalen Lauf; sie braucht
Wiederholung. Das ist der Umfang, den `tools/mit-zeitgrenze.pl` ab jetzt trägt.

**Bei drei gleichzeitigen Läufen wurde die verwundbare Phase gemessen statt gerechnet.** Die
Erwartung war dreimal sieben gleich 21. Gemessen:

```
01:53:40  einlass 19 -> 7        (a553 18, adr259 19 laufen weiter)
01:54:25  adr259  19 -> 5        (einlass 4, a553 19)
01:54:40  a553    19 -> 7        (adr259 7, einlass weg)   <- groesster Ueberlapp: 14
```

**Höchstens 14 Arbeiter standen gleichzeitig im Abbau, nicht 21.** Der Grund liegt nicht an der
Maschine, sondern am Start: die drei Läufe begannen 90 Sekunden versetzt und endeten deshalb
versetzt. **Die 21 bleibt die richtige Obergrenze** — sie gilt, wenn drei Läufe gleichzeitig
starten, und das wäre bei einer Freigabe an mehrere Sitzungen auf ein Signal hin der Normalfall,
nicht die Ausnahme. **Die gemessenen 14 sind ein Geschenk des versetzten Starts, keine Eigenschaft
des Systems.**

### Was verworfen wurde, und warum es hier steht

Eine Meßreihe, aus der die verworfenen Werte entfernt wurden, sieht sauberer aus und ist weniger
wert. Diese Zahlen sind während der Messung entstanden und **nicht** in die Tabelle oben
eingegangen:

- **Der wandernde Selbsttreffer.** `pgrep -f 'node --test'` findet die eigene Shell mit, wenn die
  Probe als `bash -c '<Skripttext>'` läuft — das Muster steht dann im eigenen `argv`. **Zwei
  Kontrollen fanden ihn nicht**, weil jede Befehlsersetzung eine neue Shell forkt und die PID
  wandert; genau so sieht ein Fehler aus, den man für erledigt hält. Der Abtaster selbst ist nicht
  betroffen — sein `argv` ist der Skriptpfad. Betroffen sind Handproben: bei ruhiger Maschine null
  bis eins, **bei drei parallelen Läufen drei auf einmal** (roh 55, gefiltert 52). Deshalb trägt
  Lauf 4 oben keine Arbeiterzahl — seine 22 stammen aus einer Handprobe von vor dem Filter.
- **Die falsch zusammengesetzte Last.** macOS trennt die drei Lastwerte mit Leerzeichen, nicht mit
  Komma; eine frühe Fassung des Abtasters las sie als eine Zahl. Deshalb wurde die Parse-Zeile des
  Warn-Wächters vor dem Scharfstellen einzeln geprüft. **Ein Wächter mit falschem Parser ist
  schlimmer als keiner**, weil er Ruhe meldet.
- **Der Zähler, der sich selbst zählte.** Frühere Prozeßzahlen dieser Nacht lagen zwei bis drei zu
  hoch. `uptime`-Werte waren nicht betroffen.
- **Zwei Fehlzuordnungen richtiger Zahlen.** „19 Prozesse, Last 6,88" wurde einmal dem
  Faktenbasis-Erzeuger zugeschrieben und einmal einer Sitzung, die längst fertig war. Beide Male
  war die Zahl korrekt abgelesen und der Träger falsch. **`pgrep` trennt das nicht, `lsof -d cwd`
  trennt es** — darum führt der Abtaster eine Baumspalte.

**Das Muster hinter allen ist dasselbe wie im Befund oben:** ein Meßwert belegt etwas anderes, als
sein Etikett verspricht, und bleibt dabei grün.

**Eine gehört nicht dazu und ist die unangenehmste.** Der Melder, der diese Messung begleitete,
meldete zuverlässig, korrekt und pünktlich — nur das falsche Ereignis. Er meldete „ein Lauf baut
ab"; gebraucht wurde „ein Platz ist frei". Bei versetzten Läufen ist das Erste im Minutentakt wahr;
er feuerte fünfmal und änderte viermal keine Entscheidung.

**Die anderen sind falsche Messungen. Diese ist eine richtige Messung der falschen Sache.** Dagegen
hilft keine Positivkontrolle: prüfbar ist, ob ein Melder feuert, wenn seine Bedingung eintritt —
nicht, ob seine Bedingung die gebrauchte ist. **Das beantwortet nur, wer fragt, wofür die Meldung
gebraucht wird.**

### Was die Messung ausdrücklich nicht sagt

- **Ob ein roter Lauf so lang ist wie ein grüner.** Plausibel, ungemessen.
- **Wie fünf gleichzeitige Läufe abbauen.** Bei drei wurden 14 statt der gerechneten 21 gemessen,
  weil die Starts versetzt lagen; bei gleichzeitigem Start wäre die Multiplikation die richtige
  Erwartung. Für fünf ist beides ungemessen.
- **Die drei kleineren Zeitwerte** (60 s `codelisten:check`, 90 s Kampagne, 120 s
  Konformitäts-Gates). Nur die 450 ist gemessen.
- **Wie lange der Faktenbasis-Erzeuger wirklich braucht.** Daß er eine volle Suite fährt, ist
  belegt (s. u.); **wie lange**, ist offen. Der Kommentar an der Aufrufstelle sagt „~50 s", eine
  Sitzung maß über zwei Minuten bis zum Werkzeug-Abbruch, eine dritte rund vier Minuten Laufzeit.
  **Die Schätzung im Code stammt vom 13.08.2026 und ist vermutlich veraltet — „vermutlich" ist
  keine Messung.**

### Nachgereicht: der Faktenbasis-Erzeuger fährt die Suite

**Die erste Fassung dieses Nachtrags stellte hier eine falsche Behauptung auf**, und sie wird nicht
stillschweigend ersetzt — ein Abschnitt über verworfene Meßwerte, aus dem der eigene Ausschuß
verschwindet, wäre wertlos.

**Behauptet war:** der Abtaster zähle ausschließlich `node --test` und sei für
`tools/faktenbasis-erzeugen.js` **konstruktionsbedingt blind**; was das Werkzeug kostet, sei
ungemessen.

**Gemessen ist:** das Werkzeug fährt selbst eine volle Suite.

```
tools/faktenbasis-erzeugen.js:140   // hier der ECHTE `node --test`-Lauf, dessen
                                    // TAP-Summenzeile geparst wird.
tools/faktenbasis-erzeugen.js:163   execFileSync('node', ['--test', ...dateien], …)
```

Das Werkzeug schreibt seine Suite-Zahl nicht ab, sondern erhebt sie — indem es die Suite laufen
läßt. Das steht seit dem 13.08.2026 als Kommentar im Quelltext und war die ganze Zeit nachlesbar.

**Der Fehler war eine Ebenenverwechslung.** Richtig ist, daß `pgrep -f 'node --test'` den
*Elternprozeß* nicht sieht. Falsch ist der Schluß daraus: **seine Kinder sind `node --test` und
wurden die ganze Nacht mitgezählt** — nur unter dem Etikett „Suite-Lauf". Aus „mein Muster trifft
den Namen nicht" wurde „ich sehe die Sache nicht".

**Die Meßkritik war richtig und hat trotzdem eine richtige Aussage zu Fall gebracht.** Die
koordinierende Sitzung hatte „suite-äquivalent" behauptet, es auf die Kritik hin zurückgezogen —
und keine der beiden Sitzungen hat die Quelle geöffnet.

> **Eine widerlegte Messung widerlegt nicht die gemessene Sache.**

**Folge:** `tools/faktenbasis-erzeugen.js` fällt unter dieselbe Gate-Disziplin wie `npm test`, weil
es dasselbe tut. Wer es aufruft, startet einen Suite-Lauf — auch wenn im Prozeßbaum ein Werkzeugname
steht und der Elternprozeß bei 0 % CPU schläft, während sein Kind rechnet.

### Folge

- **Die Warteschlange für Suite-Läufe entfällt.** Sitzungen committen, wann sie fertig sind. Sie
  war teurer als das, wovor sie schützte — solange nicht mehr als zwei Läufe zusammenfallen.
- **Die 450 Sekunden bleiben unverändert.** Der längste gemessene Lauf nutzt zwei Drittel; die
  Reserve trägt einen langsameren Lauf, ohne einen hängenden zu decken. Kein Anlaß zu heben, keiner
  zu senken. **Damit ist dieser Wert kalibriert, die anderen drei bleiben offen.**
- **Seriell bleibt allein der Push** — wegen des globalen `SCHALEN_STAND`, nicht wegen der Last.
  Anderer Gegenstand, andere Begründung.


### Nachgereicht: zwei Zahlen aus dem Befund oben, eingeordnet

**Der Befund am Anfang dieses ADR nennt für die Nacht zum 04.09.2026: „172 verwaiste Prozesse,
Lastdurchschnitt 202, Swap zu 87 % belegt."**

**Die 172 und die 202 sind belegt. Die 87 % nicht.** Sie stammen aus einem Briefing und wurden
ungemessen weitergegeben.

**In der Nacht zum 05.09. wurde nachgemessen, was belegter Swap auf dieser Maschine überhaupt
anzeigt:**

```
55 Messpunkte ueber 45 Minuten
Lastbereich       2,73  bis  33,66     — Faktor 12
Arbeiterzahl      0     bis  69
Speicher frei     89 - 90 %            — durchgehend, kein Druck

verschiedene Swap-Werte in 55 Punkten:  EINER
                                        2870,38 MB
```

**Bei einer zwölffachen Laständerung bewegt sich der belegte Swap um keine einzige Stelle.** macOS
gibt ihn nicht zurück; die Zahl ist Geschichte, kein Zustand — **sie misst, wieviel seit dem letzten
Neustart einmal ausgelagert wurde, nicht wieviel Druck gerade herrscht.**

**Folge für die 87 %:** sie war **vermutlich auch in der Vornacht kein Druckmaß**, sondern derselbe
nicht zurückgegebene Swap nach langem Maschinenlauf. **Klären läßt es sich nicht mehr** — von damals
existiert nur der eine Wert, kein Verlauf.

**Die Zahl bleibt darum stehen und wird eingeordnet, nicht gestrichen.** Streichen ließe den Fehler
verschwinden; Einordnen macht ihn nachvollziehbar. **Dieselbe Begründung wie beim Faktenbasis-
Abschnitt oben.**

### Und die dort offene Zahl ist geschlossen

Der Abschnitt „Was die Messung ausdrücklich nicht sagt" führte: *wie lange der Faktenbasis-Erzeuger
braucht, ist offen; der Kommentar sagt ~50 s, drei Sitzungen maßen zwei bis vier Minuten.*

```
gemessen 05.09.   4m53s real  =  293 s     (15m16s user, Faktor ~3)
volle Suite                      285 - 298 s
Kommentar im Code                "~50 s", vom 13.08.2026 — ueberholt
```

**293 s liegen mitten im Suite-Bereich. Das Werkzeug braucht so lange wie ein Suite-Lauf, weil es
einer ist.** Die Zahl wurde von einer anderen Sitzung gemessen und hier übernommen; **sie ist durch
zwei Hände gegangen und trägt diesen Status.**

### Die Lehre, die beide Abschnitte verbindet

**Über zwei Stunden stand „wie teuer ist der Faktenbasis-Erzeuger" als offener Punkt im Protokoll.
Die Antwort stand in Zeile 163 seiner eigenen Quelldatei — seit dem 13.08.2026.**

Eine Sitzung hatte „suite-äquivalent" behauptet. Eine andere widerlegte den **Meßweg** — zu Recht,
das Suchmuster kann den Elternprozeß nicht sehen. **Daraufhin wurde die Sache fallengelassen, obwohl
nur die Messung widerlegt war.**

> **Eine widerlegte Messung widerlegt nicht die gemessene Sache.**
> **Und die Quelle hätte beides in einer Minute entschieden.**

**Keine der beiden Sitzungen hat die Datei geöffnet.** Statt dessen wurde zwei Stunden über
Meßmethoden geredet. **Der teuerste Fehler dieser Nacht war nicht eine falsche Zahl, sondern eine
ungelesene Zeile.**

*Vivodepot GmbH · Berlin · 04.09.2026*
