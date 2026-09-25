# U2-ADR-150: Ein unbekannter Fall wird benannt, nicht angeglichen

**Status:** Akzeptiert
**Datum:** 19.08.2026
**Kategorie:** ARCHITEKTUR, DATENSCHUTZ, BEDIENUNG
**Grundlage:** Zwei Produktentscheidungen vom selben Tag —
internes Entscheidungsdokument vom 19.08.2026 (der Kern) und
internes Entscheidungsdokument vom 19.08.2026 (der Erzeuger).
Die zweite hält ausdrücklich fest, dass die gemeinsame Regel als ADR zu führen ist, „damit sie
nicht ein drittes Mal einzeln entschieden werden muss".
Vormessungen: A346 (B8 — das Modul-Feld lässt sich nicht zurückhalten), A350 (die Katalog-Bindung
in beide Richtungen), internes Befunddokument vom 19.08.2026 — eine unabhängige
Vollprobe mit einem ausgeschriebenen Berufsträger-Feldsatz: 26 von 56 Feldern kommen anders an,
als sie losgeschickt wurden.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot-template-generator.html` — `normFeldtypBefund`,
  `normalisiereFeldBefund`, `felderAngleichungen`, `angleichSatz`, `zeigeAngleichung`,
  `NICHT_ABBILDBARE_EIGENSCHAFTEN`; `vivodepot.html` — der Zurückhalte-Pfad in `vollExportJSON`
  (die Kern-Seite ist entschieden und noch nicht gebaut, s. „Was offen bleibt").
- **ADR-Bezug:** U2-ADR-037 (`feldDefinitionen` — der additive Namensraum, aus dem der
  unbekannte Fall überhaupt entsteht), U2-ADR-145 (der Einlassweg), U2-ADR-126
  (`vollDepotModell`, schema-sensible Katalogfelder), U2-ADR-149 (der Zerfall — dieselbe
  Bauart „was die Datei mitbringt, behält sein Urbild").
- **Status heute:** gilt für den Erzeuger — Beleg `tests/generator-meldepflicht.test.js` (10).
  Für den Kern **teilweise gebaut** (A358, 19.08.2026): der **Meldeweg** steht
  (`katalogFremdeFelder`, `katalogFremdSatz` in `vivodepot.html`), und die erste der vier
  Fundstellen aus A350 ist geschlossen — `sektorHatDaten` zählt angedockte Felder mit.
  Beleg `tests/katalog-meldeweg.test.js` (12), drei Rot-Beweise am mutierten Kern gefahren.
  **Die drei übrigen Bauwege** (Gesamt-PDF, Vollsicherungs-Rundlauf, Lese-App) sind einzeln
  zuzuschneiden — so entschieden am 19.08.

---

## Der Befund

Zweimal am 19.08.2026 ist dieselbe Fehlerklasse an zwei verschiedenen Grenzen gemessen worden,
und beide Male sah sie aus wie ein Erfolg.

**An der Kern-Grenze (A346, B8).** Der Zurückhalte-Pfad des Klartext-Exports läuft
`for (const s of SEKTOREN)`. Ein Modul-Feld (`tpl_…`) steht in diesem Katalog nicht und wird
darum nie gefragt. Ergebnis: die Bürgerin markiert es als sensibel, gibt „ohne sensible Daten"
heraus — und das Feld geht mit. Das Kern-Feld daneben wird korrekt zurückgehalten.

**An der Erzeuger-Grenze (Vollprobe vom 19.08.).** `normalisiereFeld` im Vorlagen-Erzeuger setzte
jeden Feldtyp, den es nicht kennt, still auf `text`. Am ausgeschriebenen Anwalts-Feldsatz
gemessen: 14 Listen, 8 Freitexte und 4 Verweise wurden einzeilige Textfelder, sechs
Fristen-Marken und acht Sensibel-Markierungen fielen weg. Der Import meldete danach 56 gültige
Definitionen und **null** verworfene. Aus Sicht der Kammer, die die Vorlage gebaut hat, hatte es
funktioniert.

**Die Gemeinsamkeit ist nicht die Domäne, sondern die Form:** ein unbekannter Fall wird
stillschweigend als bekannter behandelt. Der Kern behandelt ein unklassifizierbares Feld wie ein
unbedenkliches. Der Erzeuger behandelt einen nicht abbildbaren Typ wie einen abbildbaren.

**Und beide Male ist das Schweigen der Schaden, nicht die Ersetzung.** Eine Ablehnung wäre
sichtbar. Eine stille Angleichung ist es nicht — sie erzeugt eine Datei, die aussieht wie das,
was jemand wollte.

## Die Entscheidung

**Ein unbekannter Fall wird benannt, nicht angeglichen.**

In den zwei heute entschiedenen Ausprägungen:

- **Der Kern gibt nicht frei, was er nicht klassifizieren kann.** Was der Katalog nicht kennt,
  wird beim Zurückhalten zurückgehalten.
- **Der Erzeuger ersetzt nicht, was er nicht abbilden kann.** Trifft er einen Feldtyp ausserhalb
  seiner sechs, eine Marke oder eine Sensibel-Markierung, dann sagt er es — auf allen drei
  Einlasswegen (Formular, CSV, Bündel).

**Die Meldung ist ein Hinweis, keine Sperre.** Ein bestehendes Bündel muss weiter laden; ein
angelegtes Feld bleibt angelegt. Das war eine ausdrückliche Abbruchklausel des Bauauftrags und
ist so gebaut.

**Die Meldung nennt den Namen.** „4 Felder wurden angeglichen" sagt niemandem, welche vier. Der
Feldname steht in jeder Zeile; bei vielen Meldungen werden die ersten fünf genannt und der Rest
gezählt, weil eine Meldung, die den Bildschirm füllt, weggeklickt statt gelesen wird.

## Warum die Regel eine ADR ist und nicht zwei Entscheidungen

Weil sie ein drittes Mal auftreten wird. Der Namensraum ist seit U2-ADR-037 offen: eine Datei
kann Schlüssel mitbringen, die der heutige Katalog nicht kennt. Jede Stelle, die den Katalog als
vollständige Liste der Wirklichkeit liest, ist ein Kandidat — A350 hat **44 Bindungsstellen**
gezählt, an denen der Katalog so gelesen wird.

Ohne eine geschriebene Regel wird jede dieser Stellen einzeln entschieden, und jede Entscheidung
kostet eine Erhebung, eine Vorlage und eine Rückfrage.

## Was daraus folgt, und was ausdrücklich nicht

**Es folgt nicht, dass jede Stelle sofort umgebaut wird.** A350 hat vier weitere Fundstellen
gemessen, an denen die Bindung den *umgekehrten* Fehler macht — ein Modul-Feld verschwindet auf
dem Weg nach draussen (Gesamt-PDF, Vollsicherungs-Rundlauf, Herausgabe-Auswahl, Lese-App). Für
sie gilt die Regel dem Sinn nach: das Verschwinden gehört benannt.

**Nachtrag 19.08.2026 (A358):** Entschieden: Möglichkeit A — Meldeweg zuerst,
danach die vier Bauwege einzeln. Gebaut sind der Meldeweg und die Herausgabe-Auswahl (Fund 3).
**Eine Vermutung der Entscheidung hat sich dabei nicht bestätigt:** die *Einlesen*-Auswahl hängt
nicht an der Datenlage, sondern an den deklarierten Import-Formaten (`flowEinlesenZentral` →
`alleImportFormate()`); ein Bereich ohne Daten war dort immer schon ein gültiges Ziel. Der
Unterschied ist als eigene Probe festgehalten, damit er nicht ein zweites Mal vermutet wird.

**Es folgt nicht, dass die fehlenden Feldtypen kommen.** `liste`, `textarea` und `ref` im
Erzeuger sind neue Bedienformen und ausdrücklich Pro-Arbeit nach v1. Die Meldepflicht kommt in
v1, weil der Erzeuger **ausgeliefert** ist: eine Kammer, die heute einen Vorlagensatz baut,
bekommt den Fehler und reicht ihn bis zum Berufsträger durch.

## Was offen bleibt

**Die Kern-Seite ist entschieden und nicht gebaut.** Die Erhebung dazu ist A350; sie sagt, an wie
vielen Stellen die Regel greifen muss, und hält fest, dass ihre eigene Zählung wegen einer
Abbruchklausel keine Vollerhebung ist.

**Ob die Meldung im Erzeuger ablehnt oder nur warnt, ist nicht entschieden.** Das Ergebnisblatt
sagt es ausdrücklich: „Das ist eine Frage der Bedienung und gehört in den Bau." Gebaut ist die
warnende Form, weil die Abbruchklausel des Auftrags eine Sperre verbot.

## Der Preis, benannt

Eine Kammer, die eine Vorlage mit Listen und Verweisen baut, sieht ab heute, dass sie sie nicht
bekommt. Das ist unangenehmer als vorher und richtig so: vorher sah sie es nicht, und der
Berufsträger fand später ein Textfeld, wo eine Liste stehen sollte.
