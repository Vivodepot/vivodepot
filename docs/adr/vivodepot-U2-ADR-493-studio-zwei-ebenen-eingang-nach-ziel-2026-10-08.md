# U2-ADR-493: Studio in zwei Ebenen — Eingang nach dem Ziel, die Fachebene dahinter

**Status:** Angenommen (08.10.2026)
**Datum:** 08.10.2026
**Kategorie:** STUDIO, GESTALTUNG, ZUGÄNGLICHKEIT
**Linie:** U2
**Bezug:** U2-ADR-473 (Erscheinungsbild als Modul, „Salbei mit Glas“ W5a) · U2-ADR-483 (Vorprüfung im Studio, Einlass-Regeln) ·
U2-ADR-427 (Templates im Rezept) · Grundsatz „im fertigen Gerüst ist nichts fest verdrahtet“ (05.10.2026)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Das Studio ist die Selbstbedienung einer Einrichtung: Sie richtet Vivodepot für ihre Menschen ein, ohne zu programmieren. Bis
08.10.2026 begann es mit der Frage nach dem Werkzeug („Womit möchten Sie anfangen?“: leere Vorlage, Beispiele, CSV, Entwurf).
Eine Einrichtung ohne IT traf auf dem Weg bis zur Einreichung an sieben Stellen auf etwas, wofür sie Hilfe gebraucht hätte
(Beispielwahl; Kennung, Kürzel und Code-System; Rechtsform; Schlüsseldateien; Anhang per Hand; Warten ohne Status; Erinnerung
vor Ablauf). Vier von sieben Startbeispielen waren Gesundheit und Pflege. Das Studio trug außerdem eine eigene, abgeschriebene
Farbpalette, die der App davonlief. Wie soll das Studio aufgebaut sein, damit eine Einrichtung ohne Hilfe durchkommt, ohne dass
dem Fachpublikum (Integratoren) etwas verloren geht?

## Entscheidung

1. **Zwei Ebenen.** Der Eingang fragt nach dem Ziel: „Richten Sie Vivodepot für Ihre Einrichtung ein“ — „Was möchten Sie
   anbieten?“, sechs Kacheln ohne Fachbegriffe, sektorübergreifend. Das bisherige Studio steht unverändert als **Fachebene**
   dahinter, vom Eingang in einem Klick erreichbar (Kopf „Fachebene“, Kachel „Etwas anderes“) und ebenso zurück.
2. **Eine Kachel verspricht nur, was das Studio kann.** Führt keine Funktion des Studios zum Ziel, ist die Kachel ein Hinweis
   ohne Ziel (ⓘ statt Pfeil, aufklappbar), bis die Funktion gebaut ist. Kein Kacheltext verspricht eine Direktübertragung;
   die Person übergibt selbst.
3. **Der Assistent endet im Fachweg.** Der Assistent („Aufnahmebogen“: Einrichtung, Bogen) legt die Felder über denselben Weg an
   wie die Arbeitsfläche der Fachebene und öffnet dann den bestehenden Weg „Fertigstellen und einreichen“, vorbelegt. Beide
   erzeugen dieselbe Datei und bestehen dieselbe Vorprüfung (U2-ADR-483); es gibt keinen zweiten Einreichweg.
4. **Die Vorschau zeigt nur, was die App heute zeigt.** Die Karte „So sieht die Person es in ihrem Depot“ trägt Siegel und
   Wortlaut aus dem Textsatz der App, keine Aussage, die die App noch nicht trägt.
5. **Das Erscheinungsbild des Studios kommt aus dem Erscheinungsbild-Modul der App.** Ein Erzeuger bäckt Schrift, Grund-Tokens
   und das Glas der App-Flächen samt deckendem Rückfall (bei „Transparenz reduzieren“ und im Hochkontrast) in eine Region der
   Studio-Datei. Werte werden nicht abgeschrieben; weicht die Region vom Modul ab, ist die Prüfung rot. Die Farb-Wächter blenden
   diese Region nur aus, wenn sie genau einmal da ist und der frisch erzeugten gleicht.
6. **Zugänglichkeit gehört zum Eingang.** Die Fehlerliste der Angaben erreicht Bildschirmleser (role="alert", aria-invalid,
   Fokus aufs erste Feld); auf schmalen Bildschirmen öffnet der Feld-Editor als Blatt von unten.

## Abgrenzung

- Nicht Teil dieser Entscheidung: der Schritt „Aussehen“ (S3, mit dem Einlass des Design-Moduls), eine einzige Schlüsseldatei im
  Schritt „Einreichen“ (S4, braucht eine eigene Krypto-Entscheidung), weitere Assistenten (S5), eine freiwillige Rechtsform
  (ändert das Einreich-Schema). Sie folgen als eigene Wagen.
- Die Fachebene bleibt in Funktion und Text so, wie sie war; geändert sind nur Erscheinungsbild, Zugänglichkeit und Sätze, die
  eine Quellenprüfung als falsch oder überzogen fand.

## Nachtrag 14.10.2026 — Die Fachebene bedienen auch Stellen ohne Fachleute

**Status:** Angenommen (14.10.2026, Wort der Gegenlesung vor dem Bau). **Bezug:** A523 (ein Erscheinungsbild geht nur signiert ein) · U2-ADR-096 und U2-ADR-325 (Listen mit Unterfeldern). Der Nachtrag ändert die Abgrenzung oben: die Fachebene ändert sich in den unten genannten Punkten in Funktion und Text.

### Anlass

U2-ADR-493 ließ die Fachebene unverändert und änderte nur den Eingang davor. Eine Prüfung des Studios am iPad (14.10.2026) ging
den Weg, den eine Einrichtung ohne IT bei einer Vorführung geht: Anfrage stellen, Beispiel laden, ausprobieren, vorab prüfen.
Auf diesem Weg hakte die Fachebene an fünf Stellen:

- In der Anfrage stand der Vorschlag „Anfrage-<Datum>“ als Text im Feld „Ihr Zeichen“. Wer hineintippte, hängte an ihn an.
- Unter „Ausprobieren“ (heute „Vorschau“) hatte „+ Eintrag hinzufügen“ bei einer Liste keine Wirkung, auch wenn die Liste Unterfelder trug.
- Die Feldliste zeigte unter jedem Feld die Kennung (`identity.givenName`). Eine Einrichtung liest das als Technik.
- Vier der Beispiele und Kacheln der Fachebene sprachen von Gesundheit und Pflege; außer der Notariats-Erfassung gab es kein
  Beispiel aus einem anderen Bereich.
- Ein Erscheinungsbild ohne Signatur endete in einer roten Fehlermeldung, die die Folge nicht als nächsten Schritt nannte.

Die Fachebene wird also auch von Stellen bedient, die keine Fachleute haben. Das ist der Grund dieses Nachtrags.

### Entscheidung

1. **„Ihr Zeichen“ ist ein Vorschlag, kein Text.** Der Vorschlag steht als Platzhalter; Getipptes ersetzt ihn. Bleibt das Feld
   leer, gilt der Vorschlag. Die Anfrage selbst ändert sich nicht: sie trägt wie bisher ein Zeichen.
2. **Eine Liste mit Unterfeldern lässt sich unter „Vorschau“ ausfüllen.** „+ Eintrag hinzufügen“ legt eine Zeile mit den
   Eingaben der Unterfelder an, „Entfernen“ nimmt sie weg. Das ist Vorschau; die Vorlage ändert sich dadurch nicht. Eine Liste
   ohne Unterfelder sagt das, statt einen Knopf ohne Wirkung zu zeigen.
   Wer ein Listenfeld im Editor bearbeitet (etwa umbenennt), behält seine Unterfelder; bis hierher ersetzte jede Eingabe das
   Feld ohne sie.
3. **Kennungen sind eingeklappt, nicht gelöscht.** Ab Werk zeigt die Feldliste keine Kennung; jede Zeile trägt sie im `title`,
   ein Schalter „Kennungen zeigen“ blendet sie ein. Die Kennungen sind Vertrag und bleiben unverändert. Was eine Vorlage trägt,
   hängt am Schalter nicht: die Einreichung ist mit und ohne Schalter byte-gleich.
4. **Gesundheit ist höchstens ein Drittel der Beispiele, abgerundet.** Gezählt wird über alle Beispiele der Fachebene, nicht
   über eine Auswahl. Dazu kommen Beispiele aus Verein, Kommune, Stadtbibliothek und Arbeitgeber, mit erfundenen Inhalten. Jedes
   Beispiel hat seine Kachel, besteht die Vorprüfung und trägt keine Liste ohne Unterfelder.
5. **Ein Erscheinungsbild ohne Signatur bekommt einen Hinweis mit der Folge.** Er sagt, dass das Erscheinungsbild erst angewendet
   wird, wenn es signiert und von Vivodepot bestätigt ist, und führt zu „Angaben und Schlüssel“. Die Regel aus A523 bleibt
   unberührt: ein Erscheinungsbild geht nur signiert ein. Der Hinweis sagt nichts, was es nicht gibt.

### Abgrenzung

- Nicht Teil dieses Nachtrags: Unterfelder einer Liste im Feld-Editor anlegen und ändern. Eine Liste mit Unterfeldern entsteht
  heute über einen Entwurf, eine CSV-Datei oder ein Beispiel. Der Editor dafür braucht einen eigenen Wagen mit Durchstich bis in
  die App.
- Nicht Teil: die übrigen technischen und englischen Wörter der Fachebene und des Erscheinungsbild-Blocks; der Schritt
  „Aussehen“ (U2-ADR-493, Abgrenzung). Sie folgen als eigene Wagen.

## Nachtrag 15.10.2026 — Anordnung nach Bereichen

Eine Einrichtung baut ihre Vorlage nach Bereichen gegliedert. Ein Feld aus dem Register kommt darum in seinen Bereich, in der
Reihenfolge des Feldkatalogs; die Bereiche stehen in ihrer festen Folge (Identität & Person zuerst). Gezogen auf eine Karte landet
ein Feld weiter genau dort. „Nach Bereichen ordnen“ sortiert vorhandene Felder einmal so. Ein Registerfeld steht höchstens einmal
in der Vorlage. Der Knopf der Ansicht heißt „Vorschau“ statt „Ausprobieren“. Kein Schema, keine Signatur, kein Kern.

```yaml
konformitaet:
  - aussage: >-
      Das Studio trägt das Erscheinungsbild der App als gebackene Region; sie gleicht Wert für Wert dem Modul, fällt bei
      „Transparenz reduzieren“ und im Hochkontrast deckend zurück, und eine Abweichung ist rot.
    zustand: erfuellt
    herkunft: U2-ADR-493 (08.10.2026)
    pruefung:
      - tests/studio-glas-wie-app.test.js "[Glas] die Studio-Datei trägt die Region STUDIO-ERSCHEINUNG, genau so, wie der Erzeuger sie aus dem Modul bäckt"
      - tests/studio-glas-wie-app.test.js "[Glas] bei „Transparenz reduzieren“ und im Hochkontrast fällt jede Glasfläche deckend und ohne backdrop-filter zurück"
      - tests/studio-glas-wie-app.test.js "[Glas · Rot-Beweis] eine von Hand veränderte Region macht --check rot"
  - aussage: >-
      Der Eingang fragt nach dem Ziel, ohne Fachbegriffe und ohne Direktübertragung; die Fachebene liegt einen Klick dahinter;
      eine Kachel ohne tragende Funktion ist ein Hinweis ohne Ziel.
    zustand: erfuellt
    herkunft: U2-ADR-493 (08.10.2026)
    pruefung:
      - tests/studio-eingang.test.js "[Eingang · 1] keine Fachbegriffe im Eingang, deutsch und englisch"
      - tests/studio-eingang.test.js "[Eingang · 2] kein Kacheltext verspricht eine Direktübertragung"
      - tests/studio-eingang.test.js "[Eingang · 6] der Eingang ist der Start; die Fachebene liegt einen Klick dahinter, zurück ebenso"
      - tests/studio-eingang.test.js "[Eingang · 6 · Rot-Beweis] ein Studio-Ziel an „Dokumente empfangen“ fiele auf"
  - aussage: >-
      Der Assistent legt Felder über denselben Weg an wie die Arbeitsfläche und übergibt an den bestehenden Einreichweg; eine
      Auswahl nur mit Antworttexten kommt vollständig im Paket an.
    zustand: erfuellt
    herkunft: U2-ADR-493 (08.10.2026)
    pruefung:
      - tests/studio-assistent.test.js "[Assistent · Gleichlauf] ein Register-Feld aus dem Assistenten ist dasselbe Feld wie aus der Palette"
      - tests/studio-assistent.test.js "[Assistent · B1] „Anliegen“ mit drei Antworttexten kommt mit allen drei im Paket an, jede mit Code"
      - tests/studio-assistent.test.js "[Assistent · Übergabe] „Weiter: Einreichen“ legt die Felder an, belegt den Namen vor und öffnet die Angaben; Rechtsform nur bei Behörde"
  - aussage: >-
      Die Vorschaukarte zeigt das Siegel der App aus deren Textsatz und keine Aussage, die die App nicht trägt.
    zustand: erfuellt
    herkunft: U2-ADR-493 (08.10.2026)
    pruefung:
      - tests/studio-assistent.test.js "[Assistent · Karte · Rot-Beweis] ein erfundenes Siegel und eine erfundene Fußzeile werden gefunden"
  - aussage: >-
      Die Fehlerliste der Angaben erreicht Bildschirmleser und setzt den Fokus ins erste fehlerhafte Feld.
    zustand: erfuellt
    herkunft: U2-ADR-493 (08.10.2026)
    pruefung:
      - tests/studio-glas-wie-app.test.js "[B6 · Klasse] jede Meldung von validiereStammdaten, die ein Feld der Maske meint, ist einem Feld zugeordnet, und das Feld existiert"
  - aussage: >-
      „Ihr Zeichen“ trägt den Vorschlag als Platzhalter; Getipptes ersetzt ihn, ein leeres Feld nimmt ihn.
    zustand: erfuellt
    herkunft: U2-ADR-493, Nachtrag 14.10.2026
    pruefung:
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Zeichen] der Vorschlag ist Platzhalter: Getipptes ersetzt ihn, ein leeres Feld nimmt ihn"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Zeichen · Rot-Beweis] mit dem Vorschlag als Text hängt Getipptes an"
  - aussage: >-
      Eine Liste mit Unterfeldern bekommt unter „Vorschau“ einen Knopf mit Wirkung, ohne Unterfelder einen Satz.
    zustand: erfuellt
    herkunft: U2-ADR-493, Nachtrag 14.10.2026
    pruefung:
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Liste] eine Liste mit Unterfeldern bekommt unter „Vorschau“ einen Knopf mit Wirkung, ohne Unterfelder einen Satz"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Liste · Rot-Beweis] der frühere Knopf ohne Wirkung fällt auf"
  - aussage: >-
      Ein Listenfeld, das im Editor bearbeitet wird, behält seine Unterfelder.
    zustand: erfuellt
    herkunft: U2-ADR-493, Nachtrag 14.10.2026
    pruefung:
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Editor] ein umbenanntes Listenfeld behält seine Unterfelder"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Editor · Rot-Beweis] ohne die Übernahme der Unterfelder verliert die Liste sie beim Umbenennen"
  - aussage: >-
      Kennungen sind ab Werk eingeklappt und über einen Schalter erreichbar; die Einreichung ist mit und ohne Schalter byte-gleich.
    zustand: erfuellt
    herkunft: U2-ADR-493, Nachtrag 14.10.2026
    pruefung:
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Kennungen] ab Werk eingeklappt, über den Schalter erreichbar; die Einreichung ist mit und ohne Schalter byte-gleich"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Kennungen · Rot-Beweis] eine ab Werk sichtbare Kennung fällt auf, und eine Vorlage, die vom Schalter abhängt, ist nicht byte-gleich"
  - aussage: >-
      Gesundheit ist höchstens ein Drittel aller Beispiele der Fachebene, abgerundet; jedes Beispiel hat seine Kachel und besteht
      die Vorprüfung ohne Liste ohne Unterfelder.
    zustand: erfuellt
    herkunft: U2-ADR-493, Nachtrag 14.10.2026
    pruefung:
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Beispiele] Gesundheit höchstens ein Drittel aller Beispiele (abgerundet); jedes Beispiel hat seine Kachel; Verein, Kommune, Bibliothek, Arbeitgeber sind da"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Beispiele] jedes Beispiel besteht die Vorprüfung, und keine Liste steht ohne Unterfelder da"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Beispiele · Rot-Beweis] ohne die vier neuen Beispiele ist Gesundheit mehr als ein Drittel, und eine Kachel ohne Beispiel fällt auf"
  - aussage: >-
      Ein Erscheinungsbild ohne Signatur bekommt einen Hinweis mit der Folge und dem Weg zu Angaben und Schlüssel, keine rote
      Fehlermeldung; der Einlass urteilt wie bisher.
    zustand: erfuellt
    herkunft: U2-ADR-493, Nachtrag 14.10.2026
    pruefung:
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Erscheinungsbild] ohne Signatur ein Hinweis mit der Folge und dem Weg, keine rote Fehlermeldung; die Regel bleibt"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Erscheinungsbild · Rot-Beweis] die frühere rote Meldung ohne Folge fällt auf"
  - aussage: >-
      Ein Registerfeld kommt in seinen Bereich, in Katalog-Reihenfolge, Identität & Person vorn; „Nach Bereichen ordnen“ sortiert
      vorhandene Felder so, und die Einreichung bleibt gültig; ein Registerfeld steht höchstens einmal in der Vorlage.
    zustand: erfuellt
    herkunft: U2-ADR-493, Nachtrag 15.10.2026 (Anordnung nach Bereichen)
    pruefung:
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Feldordnung] ein Feld per + kommt in seinen Bereich, in Katalog-Reihenfolge; Personendaten stehen vorn"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Feldordnung · Rot-Beweis] ohne das Einordnen stehen die Felder in der Folge des Antippens"
      - tests/studio-vorfuehrpfad.test.js "[Vorführpfad · Feldordnung] ein Registerfeld, das schon da ist, wird nicht noch einmal angelegt; das Studio sagt es"
```
