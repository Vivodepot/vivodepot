# U2-ADR-423 (Nummer beim Landen zu bestätigen) · Signierte Sprachmodule übersetzen Zusicherungssätze

**Status:** Angenommen
**Datum:** 19.09.2026
**Bezug:** U2-ADR-331 (Zusicherungen sind kein Inhalt), U2-ADR-181 (Prüfstufen), U2-ADR-363 (Rückfall in derselben Sprache)
**Linie:** U2
**Status heute:** gilt
**Betrifft:** `vivodepot.html` und `vivodepot-lesen.html` (`textsatzModulPruefen`, `_textsatzTexteUebernehmen`, `_textsatzModuleBelegPruefen`, `_textsatzRueckfall`, Prüfkette mit Zwischenstufe in der Lese-App), `tools/lib/sprachbuendel-deckung.js`, `tools/sprachmodule-ausliefern.js`, `tools/modul-app-packen.js`, `tools/modul-text-lese-app-messen.js`

---

## Der Befund

U2-ADR-331 sperrt die Sätze, mit denen die Anwendung über den Zustand eines Dokuments spricht, gegen jedes Modul. Für jede Sprache, die die Anwendung nicht selbst trägt, blieb ein solcher Satz darum deutsch oder zeigte die rohe Kennung. Eine offene Sprachachse hatte damit keinen Weg, diese Sätze in der eigenen Sprache zu tragen, obwohl es Stellen gibt, die eine Übersetzung prüfen und dafür einstehen können.

Zwei Nebenbefunde beim Bau: Die Lese-App konnte keine Signaturkette über eine Zwischenstufe prüfen (auch Vivodepots eigene Treuhand läuft über eine). Und das im Depot gespeicherte Feld `ungeprueft: false` trägt nichts: es steht in einer Datei, die jeder ändern kann, der sie hat.

## Die Entscheidung

Ein Sprachmodul darf Zusicherungssätze setzen, wenn seine Signaturkette beim Öffnen erneut bis zum Anker geprüft ist, das gespeicherte Modul der geprüften Nutzlast entspricht und die Prüfstufe hoch genug ist. Deutsch und Englisch trägt die Anwendung selbst; dort ersetzt kein Modul einen Zusicherungssatz.

1. **Belegprüfung beim Öffnen.** Vertrauen entsteht nur aus dem am Modul mitgeführten `beleg` (Anbieterzertifikat, Modulsignatur, Ausgabestellen-Zertifikat), der bei jedem Öffnen offline gegen den Anker geprüft wird, unter Beachtung der Widerrufsliste. Kern und Lese-App tun das je selbst. Gemerkt wird nur im Arbeitsspeicher, und zwar der Fingerabdruck der geprüften Nutzlast (Sprache, Rechtsraum, Version, Zusicherungstexte).
2. **Bindung an den Inhalt.** Ein geändertes Wort im gespeicherten Modul ergibt einen anderen Fingerabdruck und nimmt ihm den Status für Zusicherungssätze.
3. **Prüfstufe.** Zugelassen sind `intern` und `extern-geprueft:pruefer`. Nicht zugelassen sind `extern-geprueft:herausgeber` und `extern-ungeprueft`: der Satz ist eine Aussage der Anwendung, keine Beschriftung des Herausgebers, und braucht eine Stelle, die die Übersetzung geprüft hat.
4. **Deutsch und Englisch sind app-eigen.** Kein Modul ersetzt ihren Wortlaut, auch kein signiertes.
5. **Form je Satz.** Ein übersetzter Zusicherungssatz trägt dieselben Platzhalter wie das deutsche Original, ist nicht leer und nicht unplausibel lang, sonst fällt dieser Schlüssel mit dem Grund `zusicherung-form` heraus, die übrigen bleiben.
6. **Rückfall, für alle Texte:** Modulsprache, dann Englisch, dann Deutsch. Das löst „nie eine andere Sprache" aus U2-ADR-363 ab. Ein Zusicherungssatz trägt seine Ersatzsprache sichtbar mit („[English]", „[Deutsch]"); für alle übrigen Lücken steht einmal je Ansicht der Hinweis „Diese Sprachfassung ist unvollständig".
7. **Herkunft sichtbar.** Ein Zusicherungssatz aus einem belegten Modul nennt, wer die Übersetzung geprüft hat (Prüfstufe und Anbieter, aus der Belegprüfung, nicht aus dem Marker).
8. **Die Lücke fällt beim Erstellen auf.** Die gemeinsame Deckungsprüfung für Sprachbündel verlangt für Sprachen ohne App-eigene Fassung die Zusicherungssätze von Kern und Lese-App: fehlt einer, sperrt das Vorbereiten, Signieren und Packen ohne Ausnahme; fehlen andere Texte, sperrt es, außer die Signierende bestätigt die Lücke ausdrücklich (`--unvollstaendig-bestaetigt`), dann steht sie als Warnung da.
9. **Was ein Modul mitbringt und die Lese-App zeigt, kommt aus dem Modul.** Ein Lauf der Lese-App (`tools/modul-text-lese-app-ausgabe-messen.js`) misst, welche Kennungen sie anfragt: jede angefragte Kennung muss sie annehmen und der Kern muss sie kennen; ein Text, den sie zeigt, muss über die Anfrage laufen (Auswahl-Optionen, Beschriftungen ja/nein-Unterfelder und Einführungstexte der Bereiche sind es seither); was sie nie zeigt (Hinweise und Beispiele der Eingabemaske, Assistenten, Dokumentgenerator, Vollmacht-Formular u. a.), steht mit Grund in einer nur sinkenden Grundlinie je Gruppe. Die Situationsblätter stehen als eigene Gruppe darin, bis sie über die Anfrage laufen.
10. **Ein Einstieg für jedes Depot der Lese-App.** Voll, Sub, Klartext, Klartext-roh und Empfänger-QR laufen durch `_depotUebernehmenGeprueft`, das die Belegprüfung vor dem Falten macht; ein Wächter verlangt, dass `_foldVollmachtenLesen` nur dort aufgerufen wird.

11. **Nicht übersetzte Bereiche und Situationen werden ausgeblendet, nie verloren.** In einer teilübersetzten Sprache verschwindet ein Bereich oder eine Situation aus der Anwahl (Navigation, Karten, Anlass-Kacheln, Suche; in der Lese-App die Seitenleiste), wenn seine Bezeichnungen nicht alle übersetzt sind und nichts darin steht; Hinweise und Beispiele zählen nicht. Steht etwas darin, bleibt er mit Rückfall und Hinweis. „Nicht übersetzte Bereiche zeigen" bringt ihn zurück. Export, Herausgabe und Notfall lesen weiter alle Bereiche. Deutsch und Englisch blenden nichts aus. Name und Unterzeile eines eingebauten Bereichs zählen nicht zur Forderung, weil sie nur ein geprüftes Modul setzen kann. Situationsblätter der Lese-App folgen, sobald sie ihre Texte über `textLesen` beziehen.

## Was diese Entscheidung nicht leistet

Eine inhaltlich falsche Übersetzung mit richtiger Form erkennt keine Regel. Es tragen Signatur, Prüfstufe und Widerruf. Wer ein Sprachmodul mit Zusicherungssätzen signiert oder prüft, übernimmt damit die Aussage über den Zustand des Dokuments in dieser Sprache. Außerdem: bereits eingelassene Module tragen den `beleg` noch ohne Ausgabestellen-Zertifikat und gelten für Zusicherungssätze erst nach erneutem Einlassen; Klartext-Dateien ohne Passwortschritt prüfen den Beleg in der Lese-App nicht.

## Offen

- Der Erstellweg: ein Sprachmodul-Modus im Template-Generator (Schlüsselliste mit deutschem und englischem Original, Platzhalter- und Vollständigkeitsprüfung, unsigniertes Modul und Prüfpaket, Signieren beim Prüfer) ist ein eigener Auftrag.
- Die 1911 Kennungen, die die Lese-App aus einem Sprachmodul nicht annimmt (Optionsbeschriftungen, Beispiele, Hinweise, Situations- und Wizard-Texte).

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Ein signiertes Sprachmodul mit Prüfstufe `intern` oder `pruefer` setzt einen Zusicherungssatz in einer Sprache, die die Anwendung nicht selbst trägt, im Kern und in der Lese-App, und der Satz nennt, wer die Übersetzung geprüft hat.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Zusicherung] pruefer: der übersetzte Zusicherungssatz gilt und nennt, wer die Übersetzung geprüft hat"
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Zusicherung] intern gilt ebenfalls"
      - tests/sprachmodul-zusicherungen-lese-app.test.js
        "[Lese-App·Sprachmodul] pruefer und intern: der übersetzte Zusicherungssatz gilt und nennt, wer die Übersetzung geprüft hat"

  - aussage: >-
      Ein Herausgeber ohne Prüfstufe, ein von Hand in die Datei geschriebener Marker und ein geändertes Wort im gespeicherten Modul machen einen Zusicherungssatz nicht vertrauenswürdig.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Zusicherung·Rot-Beweis] herausgeber reicht NICHT — der Satz fällt auf Englisch zurück und sagt es"
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Zusicherung·Rot-Beweis] ein von Hand in die Datei geschriebener Marker macht kein Modul vertrauenswürdig"
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Zusicherung·Rot-Beweis] ein geändertes Wort im gespeicherten Modul nimmt ihm den Status"
      - tests/sprachmodul-zusicherungen-lese-app.test.js
        "[Lese-App·Sprachmodul·Rot-Beweis] herausgeber reicht nicht, ein Hand-Marker auch nicht, ein geändertes Wort nimmt den Status"

  - aussage: >-
      Deutsch und Englisch bleiben für jedes Modul gesperrt, auch für ein gültig signiertes.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Zusicherung·Rot-Beweis] Deutsch und Englisch bleiben app-eigen, auch mit gültiger Kette"
      - tests/sprachmodul-zusicherungen-lese-app.test.js
        "[Lese-App·Sprachmodul·Rot-Beweis] Deutsch und Englisch bleiben app-eigen, auch mit gültiger Kette"

  - aussage: >-
      Ein übersetzter Zusicherungssatz mit anderen Platzhaltern als das Original fällt einzeln heraus, die übrigen Sätze des Moduls bleiben.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Zusicherung·Form] ein Satz mit anderen Platzhaltern fällt einzeln heraus, die übrigen bleiben"

  - aussage: >-
      Fehlt ein Text, fällt er auf Englisch, dann Deutsch zurück; ein Zusicherungssatz trägt seine Ersatzsprache sichtbar, für andere Lücken steht der Hinweis „Sprachfassung unvollständig" einmal je Ansicht, in Kern und Lese-App.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Rückfall] ein fehlender gewöhnlicher Text fällt auf Englisch zurück, ohne Marke am Satz, und zählt als Lücke"
      - tests/sprachmodul-zusicherungen-signiert.test.js
        "[Sprachmodul·Rückfall] der Hinweis „Sprachfassung unvollständig" kommt bei einer Lücke — in der Ersatzsprache — und geht mit der Sprache"
      - tests/sprachmodul-zusicherungen-lese-app.test.js
        "[Lese-App·Rückfall] fehlt ein Zusicherungssatz: Englisch mit Kennzeichnung; fehlt ein gewöhnlicher Text: Englisch und der Hinweis"
      - tests/sprachmodul-zusicherungen-lese-app.test.js
        "[Lese-App·Rückfall] Deutsch und Englisch zeigen keinen Hinweis"

  - aussage: >-
      Ein Sprachbündel in einer Sprache ohne App-Fassung, dem ein Zusicherungssatz fehlt, wird beim Vorbereiten, Signieren und Packen hart abgewiesen; fehlen nur andere Texte, gilt die Sperre außer mit ausdrücklicher Bestätigung.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/modul-app-packen-sprachdeckung.test.js
        "[Sprachdeckung·Zusicherung] eine Sprache ohne App-Fassung ohne Zusicherungssätze: hart, keine Ausnahme — auch mit Bestätigung"
      - tests/modul-app-packen-sprachdeckung.test.js
        "[Sprachdeckung·Zusicherung] mit allen Zusicherungssätzen ist die Sprache gedeckt; fehlen nur andere Texte: Sperre ohne Bestätigung, Warnung mit"
      - tests/modul-app-packen-sprachdeckung.test.js
        "[Sprachdeckung·Zusicherung] Englisch braucht keine Zusicherungssätze im Modul — die trägt die Anwendung selbst"

  - aussage: >-
      Jeder Text, den die Lese-App zeigt und den der Kern aus einem Sprachmodul kennt, kommt in der Lese-App aus dem Modul: sie fragt jede Kennung an, nimmt jede angefragte an, fragt keine an, die der Kern nicht hat, und was sie nie zeigt, steht mit Grund in einer nur sinkenden Grundlinie je Gruppe.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/modul-text-in-lese-app.test.js
        "[Modul-Text→Lese-App] kein Verstoß: jeder angefragte Text wird angenommen, jeder gezeigte Text läuft über die Anfrage, keine Familie ohne Grund"
      - tests/modul-text-in-lese-app.test.js
        "[Modul-Text→Lese-App] jede Kennung, die die Lese-App anfragt, gibt es im Kern"
      - tests/modul-text-in-lese-app.test.js
        "[Modul-Text→Lese-App] die Grundlinie: je Gruppe höchstens so viele nie angezeigte Kennungen, und sie sinkt mit"
      - tests/modul-text-in-lese-app.test.js
        "[Modul-Text→Lese-App·Rot-Beweis] eine Option wieder fest verdrahtet: der Text wird gezeigt, aber nicht mehr angefragt"
      - tests/modul-text-in-lese-app.test.js
        "[Modul-Text→Lese-App·Rot-Beweis] eine Anfrage ohne Kern-Kennung wird gefunden"
      - tests/modul-text-in-lese-app.test.js
        "[Modul-Text→Lese-App·Rot-Beweis] eine neue Familie ohne Grund ist rot"

  - aussage: >-
      Jedes Depot, das die Lese-App öffnet (Voll, Sub, Klartext, Klartext-roh, Empfänger-QR), läuft durch einen Einstieg, der die Signaturketten der Sprachmodule zuerst prüft; eine Klartext-Datei mit gültig signiertem Sprachmodul zeigt den Zusicherungssatz in der Modulsprache.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/lese-app-depot-einstieg-geprueft.test.js
        "[Lese-App·Einstieg] `_foldVollmachtenLesen(` wird nur im geprüften Einstieg aufgerufen"
      - tests/lese-app-depot-einstieg-geprueft.test.js
        "[Lese-App·Einstieg·Rot-Beweis] eine Zuweisung am Einstieg vorbei wird gefunden"
      - tests/lese-app-depot-einstieg-geprueft.test.js
        "[Lese-App·Einstieg] eine Klartext-Datei mit gültig signiertem Sprachmodul zeigt den Zusicherungssatz in der Modulsprache; ohne Beleg im Rückfall"

  - aussage: >-
      Ein Bereich oder eine Situation, deren Bezeichnungen in der aktiven Sprache nicht übersetzt sind, verschwindet aus der Anwahl, solange nichts darin steht; mit Daten bleibt er sichtbar, der Umschalter zeigt ihn wieder, Export und Herausgabe lesen weiter alle Bereiche, Deutsch und Englisch blenden nichts aus.
    zustand: erfuellt
    herkunft: U2-ADR-423 (19.09.2026)
    pruefung:
      - tests/nicht-uebersetzte-bereiche-ausblenden.test.js
        "[Ausblenden·Kern] ohne Daten wird der nicht übersetzte Bereich ausgeblendet, der übersetzte bleibt; Export liest weiter alle"
      - tests/nicht-uebersetzte-bereiche-ausblenden.test.js
        "[Ausblenden·Kern] mit Daten bleibt der Bereich sichtbar"
      - tests/nicht-uebersetzte-bereiche-ausblenden.test.js
        "[Ausblenden·Kern] der Umschalter bringt ihn zurück, und wieder aus"
      - tests/nicht-uebersetzte-bereiche-ausblenden.test.js
        "[Ausblenden·Kern·Rot-Beweis] wird die Datenprüfung umgangen, verschwindet ein Bereich mit Daten"
      - tests/nicht-uebersetzte-bereiche-ausblenden.test.js
        "[Ausblenden·Lese-App·Rot-Beweis] wird die Datenprüfung umgangen, verschwindet ein Bereich mit Daten"
```
