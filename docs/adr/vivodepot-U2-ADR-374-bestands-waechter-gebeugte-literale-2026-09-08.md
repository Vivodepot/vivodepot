# U2-ADR-374 · Bestands-Wächter statt Muster-Wächter — gebeugte Marke-Literale

**Datum:** 08.09.2026
**Status:** gebaut, 7/7 eigene Proben grün (2 Positivkontrolle, 1 Hauptprobe, 4 Rot-Beweise),
Vollsuite ausstehend (Konvoi-Gate)
**Status heute:** gilt
**Auftrag:** Nachtrag zu U2-ADR-371 — dort wurde ein Muster-Wächter gegen jedes gebeugte
„Vivodepot"-Literal geprüft und verworfen (Erlaubnisliste macht ihn blind), aber „manuelle Prüfung,
unter einer Minute" als bloßer Vorsatz ohne Mechanismus zurückgewiesen. Auftrag: ein dritter Weg,
weder Muster noch Vorsatz.
**Bezug:** U2-ADR-371 (der Fund, die verworfene Alternative) · U2-ADR-362 (der {marke}-Interceptor,
den dieser Wächter NICHT ersetzt — er bewacht die Fälle, die der Interceptor architektonisch nicht
erreicht) · `tests/e2e/nativ-auslieferung-a-b-abnahme.spec.js` (`ERWARTETE_ABWEICHUNGEN` — dasselbe
Bauprinzip: benannter Bestand mit Grund statt Schwelle)

---

## 1 · Der Unterschied zum verworfenen Muster-Wächter

Ein Muster-Wächter (`/Vivodepot[a-zäöü]+/` als stehende Prüfung) hätte eine Erlaubnisliste
gebraucht, um die neun harmlosen Treffer (Code-Kommentare, ein dreifach vorkommender
BMJ-Dokument-Wortlaut) stumm zu schalten — und genau diese Liste macht ihn blind: ein neues
gebeugtes Literal in echter Bürgerin-Prosa sieht für ein Muster identisch aus wie ein technischer
Bezeichner, mechanisch nicht unterscheidbar (U2-ADR-371 Abschnitt 6).

**Der Bestands-Wächter kehrt die Frage um.** Er behauptet nicht, WAS ein Treffer bedeutet — er
friert EIN, WAS heute da ist, als benannte Menge, und meldet jede Änderung dieser Menge als Fund
für einen Menschen. Er kann nicht blind werden, weil er nichts stumm durchlässt: ein neuer Treffer
UND ein verschwundener Treffer sind beide ein Ereignis, keiner ein automatisches Grün oder Rot.
Dasselbe Prinzip wie `ERWARTETE_ABWEICHUNGEN` in der A/B-Abnahme (U2-ADR-321) — ein benannter
Bestand mit Grund, keine Schwelle, keine Dauer-Erlaubnisliste, die niemand mehr liest.

## 2 · Der Bau

**`tools/gebeugte-marke-literale-erheben.js`** — erhebt jede Fundstelle von `Vivodepot[a-zäöü]+`
in `vivodepot.html`, `vivodepot-lesen.html`, `vivodepot-template-generator.html` (dieselbe
Dateimenge wie die manuelle Prüfung in U2-ADR-371 Abschnitt 5). **Identität einer Fundstelle: Datei
+ die getroffene Zeichenkette selbst** (z. B. `Vivodepots`, bisher die einzige auftretende Form) —
**nicht die Zeilennummer** (verschiebt sich bei jeder Zeileneinfügung) und **nicht ein
Kontextfenster um den Treffer** (Korrektur, s. Abschnitt 3b). Der 60-Zeichen-Kontext bleibt
erhalten, aber nur noch als BESCHREIBUNG in der Fehlermeldung, damit ein Mensch die Stelle findet —
er trägt keine Identität mehr.

**Multimengen-Vergleich, nicht Mengen-Vergleich.** `vivodepot.html` trägt dieselbe Zeichenkette
(`Vivodepots`) neunfach — der Erbschein-Wortlaut allein dreifach an drei physischen Orten
(Textsatz-Kennung, eingebettetes Bündel, Lese-App-Kopie, s. Abschnitt 3). Ein `Set` hätte diese
Zwillinge lautlos verschluckt: verschwände künftig genau einer davon, bliebe die Menge unverändert
und der Wächter bliebe grün, obwohl eine echte Fundstelle fort ist. `alsZaehlkarte()`/`vergleichen()`
zählen mit Vielfachheit — bewiesen durch einen eigenen Rot-Beweis (Abschnitt 4).

**`tests/fixtures/u2-adr-374-gebeugte-marke-literale-bestand.json`** — der eingefrorene Massstab:
zehn Einträge (nach dem Konvoi-8-Zuwachs, s. Abschnitt 3b), jeder mit `datei`, `treffer` (Identität)
und `kontext`+`grund` (Beschreibung). Neun sind Code-Kommentare ohne Bürgerin-Bezug; einer ist der
aus U2-ADR-371 Abschnitt 5 bereits bekannte, architektonisch ausgeschlossene BMJ-Dokument-Wortlaut
(`dok:erbschein-vorbereitung#1/0.texte[0]`) — der an DREI physischen Orten steht (Textsatz-Kennung,
eingebettetes Bündel, Lese-App-Kopie), darum dreifach in der Fixture.

**`tests/u2-adr-374-gebeugte-marke-literale-waechter.test.js`** — acht Proben:
- zwei Positivkontrollen (die Erhebung UND die Fixture sind nicht leer — ein Wächter, der nichts
  findet, weil sein Gang eingebrochen ist, sieht sonst aus wie einer, der nichts zu finden hat),
- die Hauptprobe (live gegen eingefroren, `zuwachs`/`verlust` beide leer),
- fünf Rot-Beweise: ein Zuwachs färbt rot, ein Verlust färbt rot, zwei identische Treffer
  verschmelzen NICHT in der Zählkarte (die Zwillings-Falle), eine innerhalb der Datei VERSCHOBENE
  Fundstelle (neuer Kontext, gleicher Treffer) bleibt GRÜN (der Konvoi-8-Fehlalarm, s. Abschnitt
  3b), und `schluessel()` unterscheidet nach Datei UND Treffer, ignoriert den Kontext.

## 3 · Ein Fund beim Bau: der Erbschein-Wortlaut steht DREIFACH — und stand es schon vorher

Beim Bau der Fixture fiel auf, dass derselbe, bereits aus U2-ADR-371 bekannte Wortlaut
(`dok:erbschein-vorbereitung#1/0.texte[0]`) an DREI physischen Orten steht: der Textsatz-Kennung
selbst (`vivodepot.html:10445` bei `0b77cdec`), einem vollständigen zweiten Abdruck im
eingebetteten `BUERGERMODUL_BUENDEL`-JSON (`vivodepot.html:23283` bei `0b77cdec`) und der
Lese-App-Zweitfassung (`vivodepot-lesen.html:1605`).

**Korrektur (Gegenprobe, 08.09.2026):** die erste Fassung dieses Abschnitts behauptete, der
Bündel-Abdruck sei erst beim Rebase auf `5f572011` neu hinzugekommen. Das war falsch und unbelegt
— gegen `git show 0b77cdec:vivodepot.html` nachgemessen, stand er dort bereits. Der tatsächliche
Fehler lag eine Ebene tiefer: U2-ADR-371 Abschnitt 5 hatte diesen dritten Ort schon in der
Ursprungsmessung erfasst (er steckte in den zwölf gezählten Treffern), ihn aber in der
Aufschlüsselung fälschlich unter „Code-Kommentare" statt als zweites Erbschein-Vorkommen geführt
— eine Zähl-Verwechslung, keine neue Tatsache. Beide ADRs sind inzwischen korrigiert (U2-ADR-371
Abschnitt 5, dieser Abschnitt). Kein neuer Fund am Bestand, ein korrigierter Fund an der eigenen
Dokumentation — in der Fixture ohnehin schon korrekt als eigener Eintrag geführt (Abschnitt 2),
damit ein künftiges Verschwinden an GENAU diesem Ort auffiele, auch wenn die anderen beiden
bleiben.

## 3b · Der Fehlalarm, den Konvoi 8 binnen Stunden aufgedeckt hat

Der Wächter hat sich sofort ausgezahlt UND sofort einen eigenen Konstruktionsfehler offengelegt.

**Ausgezahlt:** der Rebase auf `0e08644f` (Konvoi 8) brachte einen echten, bis dahin unbekannten
Kommentar mit (`vivodepot.html:11699`, „Vivodepots eigene Module tragen dieselben zwei Felder" —
U2-ADR-370-Umfeld). Die Hauptprobe meldete ihn korrekt als Zuwachs; geprüft, ob Bürgerin-facing
(nein, reiner Code-Kommentar), dann mit Grund in die Fixture aufgenommen. Genau der Fall, den
„manuelle Prüfung, unter einer Minute" verschluckt hätte — nicht aus Nachlässigkeit, sondern weil
niemand gezielt nach etwas sucht, von dem er nicht weiß, dass es dazugekommen ist.

**Konstruktionsfehler:** derselbe Rebase verschob den Kontext-Ausschnitt der `SCHALEN_STAND`-Zeile
selbst (Fund) — der Kommentar an der Fundstelle „374: identitaet.…" war unverändert, aber
der 60-Zeichen-Rückblick vor dem Treffer zeigte nach dem Bump anderen Text (der Anhang für den
vorherigen Bump steht IMMER unmittelbar davor). Ein Kontext-basierter Schlüssel hätte das als
Verlust der alten Fundstelle UND Zuwachs einer „neuen" gemeldet — bei JEDEM künftigen
`SCHALEN_STAND`-Bump, unabhängig vom Markenbezug. Ein Wächter, der ohne Grund ruft, wird nach dem
dritten Mal weggeklickt, und dann fängt er auch den echten Fall (wie den obigen) nicht mehr — ein
falscher Alarm pro Konvoi ist teurer als gar kein Wächter, weil er das Vertrauen verbraucht, das
der echte Fund braucht.

**Der Fix:** die Identität ist jetzt Datei + GETROFFENE ZEICHENKETTE (`treffer`, bisher immer
„Vivodepots"), nicht mehr Datei + Kontext. Der Kontext bleibt in jedem Eintrag erhalten, aber nur
noch als Beschreibung für die Fehlermeldung — ein Mensch soll die Stelle finden, aber eine
Verschiebung des umgebenden Texts darf die Probe nicht mehr färben. Bewusst in Kauf genommen:
verschiebt sich DIESELBE Fundstelle innerhalb derselben Datei (neue Zeile davor, Text drumherum
geändert), fällt das nicht mehr auf — richtig so, das ist kein Befund. Ein echtes neues oder
verschwundenes Vorkommen der Zeichenkette bleibt gefangen, jetzt bewiesen durch einen eigenen
Rot-Beweis (`eine innerhalb der Datei VERSCHOBENE Fundstelle … bleibt GRÜN`), der genau die
Konvoi-8-Situation nachstellt: gleicher Treffer, komplett anderer Kontext, Ergebnis muss `zuwachs:
[]`/`verlust: []` sein.

## 3a · Was dieser Wächter NICHT bewacht — geprüft, nicht offengelassen

Rückfrage: deckt der Wächter nur die drei ausgelieferten Oberflächen, oder verengt er den
Zugangsweg gegenüber der Ursprungsmessung? **Geprüft, nicht angenommen** — dieselbe Dateimenge
(`vivodepot.html`, `vivodepot-lesen.html`, `vivodepot-template-generator.html`) trug schon die
zwölf Treffer aus U2-ADR-371 Abschnitt 5; der Wächter verengt nichts gegenüber der Erstmessung.

**Die Absicht ist trotzdem ausdrücklich zu benennen, nicht stillschweigend zu lassen:** der
Wächter deckt NUR diese drei ausgelieferten Oberflächen — was die Bürgerin tatsächlich lädt. Ein
gebeugtes Literal an folgenden Orten fällt ihm NICHT auf:

- **Erzeugungswerkzeuge** (`tools/*.js`) — nie ausgeliefert, laufen nur beim Bauen.
- **Generierte JSON-Module** (`tools/textsatz-de-modul.json`, `tools/buergermodul/vd-de-sprache.json`,
  `tools/erbschein-vorbereitung-modul.json`, u. a.) — DERIVATE aus genau den drei überwachten
  Dateien. Ein gebeugtes Literal dort ist ein Symptom, keine eigene Quelle: der Fix gehört an die
  Quelle, die generierten Kopien ziehen beim nächsten Erzeuger-Lauf automatisch nach (wie in
  U2-ADR-371 Abschnitt 4 für `textsatz-de-modul.json`/`textsatz-en-modul.json` geschehen).
- **Test-Fixtures** (`tests/fixtures/*.json`, u. a. `golden-master-ausgabewege-baseline.json`) —
  eingefrorene Momentaufnahmen vergangener Zustände, die absichtlich NICHT mitwandern (dieselbe
  Begründung wie bei `sektoren-EINGEFROREN-nativer-bestand-debcb406.json`, U2-ADR-320).

**Stichprobe gezogen, nicht nur behauptet:** `grep -rlE 'Vivodepot[a-zäöüß]+' tools/ tests/fixtures/`
liefert zusätzliche Treffer außerhalb der drei Oberflächen. Geprüft, welche davon NICHT bloß
Kopien des bereits bekannten Erbschein-Wortlauts sind — zwei echte Einzelfälle gefunden, beide
geprüft internes Werkzeug, keine Bürgerin-facing Fläche:

- `tools/textsatz-en-begriffe-pruefen.js`: „Vivodepots eigene Wortwahl" — ein Code-Kommentar in
  einem EN-Terminologie-Prüfskript, läuft nie in der ausgelieferten App.
- `tools/wahrhaftigkeit-grundlinie.json`: „Vivodepots Aufzeichnung, wann diese Zeile zuletzt …" —
  ein `quelle`-Feld in der internen Wahrhaftigkeits-Prüfbasis (`tools/wahrhaftigkeit-fristen.js`),
  eine Herkunftsangabe für eine Audit-Ratsche, nie an eine Bürgerin gerendert.

Beide bewusst außerhalb dieses Zuges belassen — kein Bürgerin-Bezug, keine Handlung nötig. Fällt
künftig ein DRITTER, echter Fall außerhalb der drei Oberflächen auf, der tatsächlich an eine
Bürgerin gerät (etwa über einen neuen Export- oder Vorschau-Pfad, der eine Werkzeug-Datei direkt
einliest), ist DAS ein eigener Fund — der Wächter hier deckt ihn nicht, per Konstruktion, und diese
Aussage ist genau deshalb hier festgehalten.

## 4 · Proben

8/8 eigene Proben grün (Abschnitt 2). Zusätzlich die Erhebung von Hand gegen die Fixture
gegengelesen — zehn Fundstellen live, zehn in der Fixture, Multimenge deckungsgleich.

**Die Multimengen-Falle wäre sonst unbemerkt geblieben:** ein erster Entwurf mit einem `Set` (statt
Zählkarte) hätte die Zwillinge (Erbschein-Kennung + Bündel-Kopie + Lese-App-Kopie, identischer
Treffer) zu einem Eintrag verschmolzen — die Positivkontrolle und die Hauptprobe wären beide grün
geblieben, obwohl der Wächter blind für den Verlust EINES der Zwillinge gewesen wäre. Der eigens
dafür geschriebene Rot-Beweis hätte diesen Entwurf sofort rot gefärbt und hat es beim ersten Anlauf
auch getan — korrigiert, bevor der Wächter committed wurde.

**Die Kontext-als-Identität-Falle wurde NICHT beim ersten Anlauf gefangen, sondern binnen Stunden
vom echten Betrieb** — s. Abschnitt 3b. Anders als die Multimengen-Falle (durch einen Rot-Beweis
vor dem ersten Commit gefunden) zeigte sich dieser Konstruktionsfehler erst am ersten echten
Konvoi danach. Der jetzt nachgetragene Rot-Beweis (Datei verschoben, Treffer gleich, Kontext
komplett anders) stellt sicher, dass ein zweiter Anlauf denselben Fehler nicht wiederholen kann.

**Registrierung in `tools/waechter-register.js` bewusst unterlassen:** dieses Register führt eine
kuratierte Teilmenge (79 Einträge) für Wächter mit eigenem, komplexem Aufruf (CLI-Fixturen,
Kampagnen-Ebenen) — die meisten ADR-getriebenen Bestandsproben im Haus (etwa U2-ADR-322, die
Marke-Anzeige-Proben aus U2-ADR-362) stehen dort ebenfalls nicht, sondern tragen ihre
Positivkontrolle und ihren Rot-Beweis wie hier im eigenen Testfile. Dieselbe, bereits etablierte
Konvention — keine Abweichung.
