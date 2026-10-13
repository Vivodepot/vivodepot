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
```
