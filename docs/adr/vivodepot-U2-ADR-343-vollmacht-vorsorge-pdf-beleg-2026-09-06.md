# U2-ADR-343: Die 39 amtlich übernehmbaren Wortlaute — mechanisch gegen die BMJ-Formulare belegt

**Status:** Akzeptiert
**Nummer:** vorläufig — gegen `docs/adr/README.md` beim Landen zu prüfen
**Datum:** 06.09.2026
**Betrifft:** `tests/fixtures/bmj/*.pdf` + `*.txt` (neu), `tools/vollmacht-vorsorge-pdf-beleg-messen.js`
(neu), `tools/vollmacht-vorsorge-amtliche-uebersetzung.js` (neu), `tools/textsatz-en-vollabdeckung-daten.js`
(37 neue Einträge), `tools/textsatz-en-begriffe-pruefen.js` (Zitat-Ausnahmen für drei Glossar-Einträge),
`tools/textsatz-en-juristisch-offen.js` (196 → 159, Ist-Stand 151 s. u.), `tests/textsatz-en-modul-erzeugen.test.js`
(Ratsche, 3218 → 3263), `tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js` (neu),
`docs/adr/README.md` (Einträge 337/338/343 nachgetragen), `tests/fixture-felder-im-modell.test.js`
(Ausnahme für `tests/fixtures/bmj/`), `tools/bgb-verweise-grundlinie.json` (5 Zahlen chirurgisch
angehoben, s. u.)

- **Status heute:** gilt — 35 amtliche Übersetzungen sind eingesetzt, mechanisch gegen die
  offiziellen BMJ-Formulare geprüft; 2 Kennungen bleiben offen, aus VERSCHIEDENEN Gründen (s. u.).
  Die Schenkungen-Klausel ist NICHT korrigiert — Korrektur befristet auf eine Signatur-Zeremonie
  verschoben, s. Abschnitt „Die signierte Quelle".

---

## Der Auftrag

Auftrag „die Sprach-Spur", Punkt 1: es gibt amtliche zweisprachige BMJ-Formulare (Deutsch/
Englisch, Stand 15.01.2023) für Vorsorgevollmacht („Lasting Power of Attorney") und
Betreuungsverfügung („Guardianship Directive") — dieselbe Ausgabe wie unsere deutsche Fassung. Die
Auflage: **„Die Belegpflicht muss MECHANISCH sein: jeder übernommene Wortlaut steht wörtlich im
extrahierten PDF-Text, sonst rot."**

## Die Fixtures

Zwei PDFs, mit expliziter Produktfreigabe geladen (per Nachfrage in der Sitzung, nicht auf
Zuruf einer Peer-Sitzung übernommen):

```
tests/fixtures/bmj/vorsorgevollmacht-deutsch-englisch.pdf     378.749 Bytes (Erwartung ~370 KB)
  sha256 6827ba8551ea58c6f41a6d3c23c0e3db076713e9f922941191f7017f09d6ce85
tests/fixtures/bmj/betreuungsverfuegung-deutsch-englisch.pdf  155.918 Bytes (Erwartung ~152 KB)
  sha256 d3297334cb4f626c0750bb7354e3194e2298d3f42db4b0742a92f1838a5dd43f
Quelle: bmjv.de (BMJ), Stand 15.01.2023 — beide Angaben (Größe, Datum) passgenau bestätigt.
```

**Kein PDF-Parser zur Laufzeit, keine neue npm-Abhängigkeit.** Vivodepot hat mit der
Offline-Garantie (`tests/konformitaet/offline-garantie.mjs`) ein Kernversprechen, gegen das ein
laufzeitparsendes oder system-binary-abhängiges Prüfwerkzeug arbeiten würde, selbst wenn es formal
keine bestehende Probe verletzt. Stattdessen: **einmal extrahiert, der Text eingecheckt.**

```
tests/fixtures/bmj/vorsorgevollmacht-deutsch-englisch.txt      (pdftotext -layout, Poppler 26.07.0)
tests/fixtures/bmj/betreuungsverfuegung-deutsch-englisch.txt   (dieselbe Extraktion)
```

Das Prüfwerkzeug (`tools/vollmacht-vorsorge-pdf-beleg-messen.js`) liest NUR diese `.txt`-Dateien —
kein Systemwerkzeug, keine Abhängigkeit, deterministisch, offline. Das PDF selbst bleibt trotzdem im
Repo (der Beleg, nicht nur seine Ableitung), mit sha256, damit die Extraktion jederzeit nachvollzogen
werden kann.

## Die 39 Kennungen

Identisch mit dem, was am 06.09.2026 in `OFFEN_JURISTISCH` unter `dok:vorsorgevollmacht#`
(33) und `dok:betreuungsverfuegung#` (6) stand — 33 + 6 = 39, keine gesondert erstellte Liste.

## Ausbeute zuerst — vier Funde, keine Nachgiebigkeit

**Deutsch, erster Lauf: 23 von 39.** Drei Werkzeugkorrekturen, jede gemessen und im
Werkzeugkopf dokumentiert, keine davon eine Aufweichung der Belegpflicht:

```
23 → 31   Silbentrennung am Zeilenumbruch ("Sozialleistung-\nsträgern")
          ist eine Layout-Entscheidung des PDF, kein Wortlaut-Unterschied.
31 → 35   Platzhalter-Sätze ({namen}.): der schließende Punkt danach ist
          UNSERE Interpunktion — das Formular endet an der Stelle mit
          einem Doppelpunkt vor dem Eintragsfeld, nicht mit einem Punkt.
          Nur bei tatsächlich vorhandenem Platzhalter entfernt.
35 → 36   NFD/NFC: pdftotext liefert manche Umlaute ZERLEGT (Basisbuchstabe
          + kombinierender Trema-Strich) statt vorkomponiert, je nach
          ToUnicode-CMap der Schriftart — "Für" tauchte so im Rohtext auf,
          dass ein reiner Codepoint-Vergleich es nicht fand, obwohl
          sichtbar identisch. `.normalize('NFC')` auf beiden Seiten.
```

**Deutsch, Zwischenstand: 36 von 39.** Drei echte Befunde, keine Tool-Fehler:

```
dok:vorsorgevollmacht#1/3.abschluss ("entscheiden.")
  Deutsch IST belegt — steht wörtlich im PDF. Die Lücke ist rein englischseitig (s. u.).
dok:vorsorgevollmacht#4/vm_vermoegen_schenkungen.text
  ECHTE Wortlaut-Abweichung. PDF: "…der einem Betreuer rechtlich gestattet ist."
  Unser Text: "…der einem Betreuer OHNE betreuungsgerichtliche Genehmigung gestattet
  ist (also Gelegenheitsgeschenke oder nach meinen Lebensverhältnissen angemessene
  Zuwendungen)." — länger, erläuternd, nicht die amtliche Kurzfassung.
  Zur Entscheidung vorgelegt.
dok:betreuungsverfuegung#1.titel, #4.titel
  Eigene Gliederungs-Überschriften — das Formular hat an der Stelle keine
  Abschnittstitel. Nie als amtlicher Wortlaut behauptet.
```

**Deutsch, Endstand: 36 von 39.** Die drei Befunde oben bleiben stehen — keiner wurde durch eine
weitere Werkzeugkorrektur aufgelöst, alle drei sind echt.

**Englisch — Auflage (a), eine eigene Messung:** ein zweisprachiges PDF heißt nicht, dass jeder
deutsche Satz ein isoliertes englisches Gegenstück hat. Gemessen: **35 von 36** belegten deutschen
Kennungen haben eines. `#1/3.abschluss` ("entscheiden.") nicht — die vier Unterpunkte der Vollmacht
enden im Deutschen alle vor diesem Wort, die englische Fassung zieht die Bedeutung stattdessen VORNE
in die Einleitung ("Where necessary, he / she can make decisions"). Eine erfundene
Wortlaut-Ergänzung wäre schlimmer als eine belegte Lücke.

## Zitat, nicht Übersetzung — und wo das Hausglossar trotzdem gilt

**Auflage (Produktentscheidung, nachdem der Terminologie-Wächter anschlug):** die 35 Übersetzungen
sind kein eigener Sprachgebrauch, sondern **Zitat aus der amtlichen englischen BMJ-Veröffentlichung**
— dieselbe bilinguale PDF-Ausgabe, aus der auch der deutsche Beleg stammt (Quelle bestätigt, s.
Abschnitt „Die Fixtures": beide Sprachen kommen aus DERSELBEN Datei, nicht aus einer eigenen
Rückübersetzung des deutschen Texts). Damit greift die Terminologie-Kampagne vom 01.09.2026
(`tools/textsatz-en-begriffe-pruefen.js`, GLOSSAR: Vollmacht→„power of attorney", Betreuer→
„court-appointed representative", Patientenverfügung→„advance directive") an dieser Stelle NICHT —
sie gilt für **Vivodepots eigene Beschriftungen**, nicht für zitierten fremden Wortlaut. Zehn
Kennungen, die das amtliche „LPA"/„guardian"/„advance healthcare directive" statt der Vivodepot-
eigenen Begriffe tragen, sind darum als Zitat-Ausnahme in den drei betroffenen GLOSSAR-Einträgen
eingetragen, mit dieser Begründung im Kommentar — **die Grenze steht jetzt im Code, nicht nur hier**,
damit die beiden Regeln beim nächsten Fund nicht wieder kollidieren.

## Was aus dem Rückstand herauskommt, und warum unterschiedlich

**35 Kennungen — übernommen, mit Beleg.** Wörtlich aus dem PDF abgeschrieben
(`tools/vollmacht-vorsorge-amtliche-uebersetzung.js`), in
`tools/textsatz-en-vollabdeckung-daten.js` eingemischt (`Object.assign`, EINE Quelle, nicht
zweimal abgetippt), aus `OFFEN_JURISTISCH` entfernt.

**Keine erfundene Interpunktion:** wo das PDF keinen Schlusspunkt setzt
(`vm_untervollmacht.text`: „…to another person", ohne Punkt), steht hier auch keiner — ein
hinzugefügter Punkt stünde nicht mehr wörtlich im Beleg und würde die eigene Probe brechen.

**2 Kennungen — umgetragen, nicht übernommen.** `dok:betreuungsverfuegung#1.titel`/`#4.titel`
kommen aus `OFFEN_JURISTISCH` heraus, **weil sie nie hineingehörten**, nicht weil sie amtlich
belegt wären: eigener Text, normale Übersetzung, keine Belegpflicht. Der Unterschied zählt — sonst
sähe es später aus, als gäbe es einen amtlichen Beleg, den es nie gab.

**2 Kennungen bleiben im Rückstand, aus VERSCHIEDENEN Gründen:**

```
#1/3.abschluss                   Deutsch belegt, Englisch strukturell nicht isolierbar.
vm_vermoegen_schenkungen.text    ECHTE Wortlaut-Abweichung — Korrektur befristet auf eine
                                  Signatur-Zeremonie verschoben, s. u.
```

## Die signierte Quelle — warum der Schenkungen-Fix zurückgenommen wurde

Die erste Produktentscheidung, wörtlich: „Der Text des Formulars muss 1:1 im Wizard sein." Daraufhin
wurde `VOLLMACHT_MODUL`s Block-Text UND der `TEXTSATZ_EINGEBAUT`-Spiegel für
`vm_vermoegen_schenkungen.text` auf den amtlichen Kurztext gesetzt (ersatzlos, keine
danebenstehende Erläuterung).

**Dabei zeigte sich, mechanisch geprüft (`tests/vollmacht-generator.test.js`), ein tieferer
Zusammenhang:** `VOLLMACHT_MODUL`/`VOLLMACHT_BMJ` sind laut Architektur (U2-ADR-040) EXTRAKTE einer
einzigen SIGNIERTEN Quelle — `STANDARD_VORLAGEN['vorsorgevollmacht'].wortlaut`, mit eigenem
Zertifikat (`STANDARD_VORLAGEN_CERTS.bmj`, JWS). Diese signierte Quelle trägt selbst noch die
längere, erläuternde Fassung — die Abweichung vom amtlichen Formular steht dort schon, nicht erst
in einer späteren Kopie. Ein Fix nur am Extrakt hätte Extrakt und Signatur auseinanderlaufen lassen:
`VOLLMACHT_MODUL` hätte den Kurztext gezeigt, während die signierte Quelle — die eigentliche
Zusicherung „unveränderte Übernahme, § 5 UrhG" — weiter den langen Text trüge.

**Entscheidung (ausdrücklich als eigene, nicht rückgefragte Zug-Entscheidung benannt):** der
Wortlaut-Fix wird aus DIESEM Zug herausgenommen. 337, 338 und der PDF-Beleg selbst hängen nicht an
der Signatur und sollen nicht auf eine Zeremonie warten, die erst nach den vier Bündel-Achsen läuft.
Die Korrektur der signierten Quelle läuft als **eigener, kleiner Zug NACH der Zeremonie** (Signatur
mit dem Treuhandschlüssel — zusammen mit der Patientenverfügungs-Korrektur und dem Nachtrag eines parallelen Strangs,
dieselbe Sitzung).

**BEFRISTETER ZUSTAND, kein endgültiger Befund:** bis zur Zeremonie gilt die längere, signierte
Fassung als der geltende Text — `VOLLMACHT_MODUL`/`TEXTSATZ_EINGEBAUT` wurden auf sie
zurückgesetzt, `vm_vermoegen_schenkungen.text` steht wieder im Rückstand. Das benannte Ende: die
Signatur-Zeremonie. Kommentar dazu an der Stelle selbst in `vivodepot.html` (`VOLLMACHT_MODUL`-Block).

## Kein Wachsen des Rückstands — sein Schrumpfen um 37, mit Begründung

```
OFFEN_JURISTISCH (dieser Zug):    196 → 159   (-37: 35 übernommen + 2 umgetragen)
OFFEN_JURISTISCH (Ist-Stand):     159 → 151   (-8, fremd — s. u.)
EN-Modul Kennungen: 3218 → 3263   (+37, gegen baueModul() nachgerechnet, nicht addiert)
```

Der Ist-Stand (151) trägt zusätzlich acht `vollmacht:*.label`-Kennungen weniger, als dieser Zug
allein erklärt — die kamen durch U2-ADR-344s Bündel-Umzug hinzu (ein ANDERER Zug, während eines
Rebase-Merges gefunden und nachgezogen, s. Kommentar in `tools/textsatz-en-juristisch-offen.js`,
Zeile 133 ff.). Nicht diesem Zug zuzurechnen, hier nur für den Abgleich genannt, damit 159 (was
dieser Zug bewegt) und 151 (was im Baum steht) nicht als Widerspruch missverstanden werden.

U2-ADR-322 legt fest: „Die Menge darf nie wachsen und soll schrumpfen." Dieser Zug ist die erste
Bewegung in diese Richtung seit dem VOLLMACHT_BMJ-Zuwachs (U2-ADR-338, 121 → 196) — und zeigt
denselben Mechanismus von der anderen Seite: eine Kennung verlässt den Rückstand nur mit Beleg
(35) oder mit dokumentiertem Grund für die Umtragung (2), nie kommentarlos. Die Schenkungen-Kennung
verlässt ihn NICHT — sie stand kurzzeitig draußen, kehrte mit Begründung zurück, bis zur Zeremonie.

## Nebenbefund beim Gate-Lauf: fünf Kennungen dupliziert in der BGB-Grundlinie

Der Pre-Commit-Lauf fand, dass U2-ADR-338s Migration (VOLLMACHT_BMJ-Kennungen in
`TEXTSATZ_EINGEBAUT` gespiegelt) fünf bereits klassifizierte §-BGB-Zitate (§1829, §1831 Absatz 1/4,
§1832 Absatz 1/4 — alle aus `VOLLMACHT_BMJ.frage`) ein zweites Mal in den Kern brachte.
`tools/bgb-verweise-grundlinie.json` ist an genau diesen fünf Zahlen chirurgisch angehoben (4→5
bzw. 2→3), der Rest der Datei unangetastet. **Ein separater, vom Gate selbst nicht als Fehlschlag
gewerteter Befund** (das Gate meldet nur Zuwachs rot, kein Weniger): gegen den PRISTINEN Kanon-Stand
(945ffecf) hinkt dieselbe Datei bereits bei sieben ANDEREN Zitaten hinterher — nicht von diesem Zug
verursacht, dieser Posten wird separat geführt.

## Vorschlag, nicht gebaut: ein Wächter gegen die Fixture

Die Schenkungen-Abweichung wurde nur gefunden, **weil** die Fixture jetzt im Repo liegt und der
mechanische Abgleich lief. Ohne ihn hätte niemand bemerkt, dass ein Wortlaut vom amtlichen Formular
abweicht — die Abweichung steht seit U2-ADR-040 in der signierten Quelle selbst. **Vorschlag für
einen eigenen, späteren Auftrag** (hier nur benannt, nicht gebaut): ein Wächter, der bei jeder
Änderung an einem der vier `STANDARD_VORLAGEN`-Wortlaute automatisch gegen die jeweilige Fixture
prüft, sofern eine existiert (heute: Vorsorgevollmacht, Betreuungsverfügung — Patientenverfügung und
Organspendeausweis haben noch keine, s. u.). Die Begründung ist die gefundene Abweichung selbst,
nicht eine Vermutung.

## Welche amtlichen Dokumente Vivodepot abbildet — gemessen, nicht gebaut

`STANDARD_VORLAGEN` trägt genau vier Einträge mit `wortlautQuelle` (amtliche Herkunft):

```
Vorsorgevollmacht      BMJ, "Formular Vollmacht", Stand 01/2023      FIXTURE vorhanden
Betreuungsverfügung    BMJ, "Formular Betreuungsverfügung", 01/2023  FIXTURE vorhanden
Patientenverfügung     BMJ, "Textbausteine Patientenverfügung"       KEINE Fixture
Organspendeausweis     BZgA, "Organspendeausweis nach § 2 TPG"       KEINE Fixture
```

**Ein Namens-/Editionshinweis, keine Abweichung:** die in `vivodepot.html` zitierten
`wortlautQuelle.url`-Felder zeigen auf die einsprachigen `bmj.de`-Editionen; die hier geladenen
Fixtures sind die bilingualen `bmjv.de`-Editionen (deutsch/englisch, Stand 15.01.2023 — derselbe
Stand). Der deutsche Teil ist byte-geprüft identisch mit dem in `vivodepot.html` zitierten
Original (s. z. B. die Betreuungsverfügungs-Eingangsformel, `_bvEingangsformel()`) — zitierte URL
und geprüfte Datei sind zwei verschiedene Veröffentlichungen desselben Amts, kein Widerspruch.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      35 englische Übersetzungen der amtlichen BMJ-Formulare (Vorsorgevollmacht/Betreuungs-
      verfügung) stehen wörtlich im extrahierten PDF-Text — mechanisch geprüft, nicht behauptet.
    zustand: erfuellt
    herkunft: U2-ADR-343 (06.09.2026)
    pruefung:
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js
        "[U2-ADR-343] Ausbeute Englisch: 35 von 35 festgelegten Übersetzungen stehen wörtlich im PDF-Text"
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js
        "[U2-ADR-343] die 35 Übersetzungen stehen im gebauten EN-Modul, wortgleich mit der festgelegten Quelle"

  - aussage: >-
      Die Belegpflicht ist eine Prüfung, keine Sperre — ein wörtlich unverändertes Zitat geht
      durch, ein verfälschter Wortlaut bricht die Probe.
    zustand: erfuellt
    herkunft: U2-ADR-343 (06.09.2026)
    pruefung:
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js "[U2-ADR-343·Rot-Beweis] ein verfälschter Wortlaut bricht die Probe"
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js "[U2-ADR-343·Gegenprobe] ein echter, unveränderter Wortlaut geht durch"

  - aussage: >-
      Die gefundene Wortlaut-Abweichung (Schenkungen-Klausel) ist seit der A558-Zeremonie
      (12.09.2026) korrigiert — die Signatur-Zeremonie, auf die die Umsetzung verschoben war, hat
      stattgefunden, und die deutsche Seite von `customaryGiftsWithinWhatCare.text` ist seither
      belegt (Ausbeute Deutsch damit 37 statt 36 von 39). Zwei Kennungen bleiben weiterhin im
      Rückstand, aber aus EINEM gemeinsamen Grund, nicht mehr aus verschiedenen: beide sind auf
      Deutsch belegt, beiden fehlt die juristisch geprüfte ENGLISCHE Übersetzung — der Rückstand ist
      seit der Zeremonie rein englischseitig.
    zustand: teilweise-erfuellt
    herkunft: U2-ADR-343 (06.09.2026), Rücknahme und Zeremonie-Bindung;
      A558-Zeremonie (12.09.2026) hat die deutsche Seite nachgezogen, Block hier eingearbeitet statt
      angehängt (Fund, 17.09.2026)
    pruefung:
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js
        "[U2-ADR-343] Ausbeute Deutsch: 37 von 39 Kennungen stehen wörtlich im PDF-Text (nach der A558-Zeremonie)"
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js
        "[U2-ADR-343] der aktuelle Rückstand (2 Kennungen) — beide inzwischen deutschseitig belegt, Lücke ist rein englischseitig"

  - aussage: >-
      Der Rückstand wächst durch diesen Zug nicht — er schrumpft um 37 (35 übernommen, 2
      umgetragen), mit Begründung im Kommentar, keine der beiden Bewegungen kommentarlos.
    zustand: erfuellt
    herkunft: U2-ADR-343 (06.09.2026), Grenze aus U2-ADR-322 unverändert übernommen
    pruefung:
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js
        "[U2-ADR-343] die 37 übernommenen/umgetragenen Kennungen sind NICHT mehr im Rückstand"
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js
        "[U2-ADR-343] die zwei bewusst zurückgestellten Kennungen bleiben im Rückstand, mit Begründung im Werkzeugkommentar"
      - tests/textsatz-en-modul-erzeugen.test.js "[EN-Modul·Rueckstand] der Rueckstand waechst nicht"

  - aussage: >-
      Eine angedockte amtliche Übersetzung erreicht das Dokument-Modul und die Rücknahme (Sprache
      zurück auf Deutsch) stellt den amtlichen Originalwortlaut zeichengenau wieder her.
    zustand: erfuellt
    herkunft: U2-ADR-343 (06.09.2026)
    pruefung:
      - tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js
        "[U2-ADR-343·Rot] ein angedocktes Test-Modul mit der amtlichen Übersetzung erreicht VOLLMACHT_MODUL — Rundlauf zurück auf Deutsch bleibt unversehrt"

  - aussage: >-
      Die 35 Übersetzungen sind Zitat aus der amtlichen englischen BMJ-Veröffentlichung, keine
      eigene Übersetzung — das Hausglossar (textsatz-en-begriffe-pruefen.js) gilt darum an diesen
      Stellen nicht; die Grenze ist als Zitat-Ausnahme in drei GLOSSAR-Einträgen eingetragen.
    zustand: erfuellt
    herkunft: U2-ADR-343 (06.09.2026), Entscheidung
    pruefung:
      - tests/textsatz-en-begriffe-pruefen.test.js
```

## Was dieser Zug NICHT tut

- **Er übersetzt `#1/3.abschluss` nicht mit einer erfundenen Ergänzung.** Die belegte Lücke ist
  ehrlicher als eine Übersetzung, die niemand im Formular so gesagt hat.
- **Er korrigiert die Schenkungen-Klausel nicht.** Das ist eine eigene, spätere Landung, gebunden
  an eine Signatur-Zeremonie (Treuhandschlüssel) — s. Abschnitt „Die signierte Quelle".
- **Er entscheidet keine neue Übersetzungsregel.** Er zieht nur die bereits vor dieser Landung
  geltende Grenze zwischen Zitat und eigener Beschriftung im Code nach — sonst kollidieren die
  Belegpflicht ("1:1") und das Hausglossar (feste eigene Begriffe) beim nächsten Fund wieder.
- **Er baut den vorgeschlagenen Fixture-Wächter nicht.** Nur benannt (s. oben), mit der
  Schenkungen-Abweichung als Begründung — der Bau ist ein eigener, späterer Auftrag.
- **Er baut keinen Laufzeit-PDF-Parser und keine neue npm-Abhängigkeit** — bewusste
  Weg-Entscheidung, begründet mit der Offline-Garantie des Kerns.
- **Er berührt `VOLLMACHT_BMJ` (U2-ADR-338) nicht** — eigener, getrennter Kennungsraum,
  eigener, getrennter Rückstand, eigene, getrennte Entscheidung (dort: gar keine Übersetzung).
