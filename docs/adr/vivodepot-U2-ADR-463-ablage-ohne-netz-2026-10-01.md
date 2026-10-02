# U2-ADR-463: Ablage ohne Netz — Passwort aus Wörtern, Zusammenführen, Doppelklick öffnet die Datei

**Status:** Angenommen — Auftrag vom 01.10.2026; Wortlaut des Hinweises und Wortliste freigegeben am 01.10.2026
**Datum:** 01.10.2026
**Kategorie:** SICHERHEIT, BARRIEREFREIHEIT, ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** Ergänzt U2-ADR-031 (Datei als Ablage). Nichts davon verlässt das Gerät.
**Status heute:** gilt — Belege `tests/passwort-vorschlag.test.js`, `tests/fassungen-eintraege-zusammenfuehren.test.js`,
`tests/datei-start-manifest.test.js`, `tests/textsatz-rueckfall-alle-stellen.test.js`.

---

## Kontext

Die Datei ist die Ablage: wer sie kopiert, nimmt das Depot mit, ohne Server und ohne Konto. Damit hängt der Schutz
einer kopierten Datei allein am Passwort. Der Schlüssel entsteht mit PBKDF2-SHA256 und 600 000 Iterationen; das bremst
das Raten, ersetzt aber kein gutes Passwort. Selbst gewählte Passwörter sind nach Bonneau (IEEE S&P 2012) im Mittel
schwach. Bis hierher gab es keinen Vorschlag, nur eine Stärke-Anzeige.

Zweitens: Liegt auf dem Gerät ein anderer Stand als in der geöffneten Datei, ließ der Kern nur die Wahl zwischen beiden
(`flowStandKonfliktDialog`). Wer dieselbe Datei auf zwei Geräten führt, verlor so die Änderungen einer Seite. Das
feldweise Zusammenführen von A475 kannte nur flache Felder; Listen und Register tragen keine Kette je Eintrag.

Drittens kannte der Kern seit langem einen Empfänger für Dateien, die das Betriebssystem an die installierte App
reicht (`window.launchQueue`). Kein Manifest meldete aber die Dateiart an, darum kam nie eine an.

## Die Entscheidung

1. **Vorschlag aus sechs zufälligen Wörtern.** Jedes Feld für ein neues Passwort (`autocomplete="new-password"`, außer
   der Bestätigung) bietet „Passwort vorschlagen“ an. Der Vorschlag steht groß da, kann ersetzt und vorgelesen werden
   und geht ins Feld. Die Bestätigung tippt man selbst.
2. **Gleichverteilter Zufall.** Nur `crypto.getRandomValues`, mit Verwerfen statt Modulo; jedes Wort ist gleich
   wahrscheinlich.
3. **Die Listen stehen im Sprachmodul**, nicht im Gerüst (`strings:passwortWortliste.text`). Jedes Produkt schlägt in
   seiner Sprache vor, ohne eigene Ab-Werk-Region.
   - Deutsch: dys2p `de-1296-v1` (CC0), 45 Wörter von Hand entfernt, 1251 Wörter, 61,7 Bit für sechs.
   - Englisch: EFF Short Wordlist 1 (Creative Commons BY 4.0), 101 Wörter von Hand entfernt, 1195 Wörter, 61,3 Bit für sechs.
     Die kurze Liste statt der Liste 2.0, weil ihre Wörter kürzer und alltäglicher sind und sich besser vorlesen.
   - Entfernt wurde, was beim Vorlesen erschreckt oder kränkt (Krankheit, Tod, Gewalt, Schimpfwort), dazu Marken.
4. **Hinweis bei eigenem Passwort, ohne Sperre.** Wer selbst tippt, sieht: „Ein selbst gewähltes Passwort ist oft in
   Minuten erraten, wenn jemand eine Kopie Ihrer Datei hat. Sechs zufällige Wörter zu erraten wäre selbst mit gemieteten
   Rechnern derzeit unbezahlbar.“ Der Wortlaut ist am 01.10.2026 entschieden. Eine unabhängige Quellenprüfung hat ihn gegen Bonneau 2012
   (Tab. III, G̃0,5 = 21,6 Bit), den hashcat-Benchmark einer RTX 4090 (Modus 10900) und OWASP (600 000 Iterationen)
   nachgerechnet: rund zwei Minuten auf einer GPU gegen Milliarden Dollar je Datei. Die Mindestlänge 8 bleibt die einzige harte Schranke.
5. **Zusammenführen als dritter Weg.** Der Konflikt-Dialog Gerät gegen Datei bietet „Beide zusammenführen“. Flache
   Felder laufen über A475 (`fassungenVergleichen`). Was nur eine Seite geändert hat, wird ohne Rückfrage übernommen;
   wo beide etwas geändert haben, fragt der Fassungs-Dialog, beide Fassungen nebeneinander. Das Ergebnis ist der
   Stand auf dem Gerät; die Datei bleibt, wie bei jeder Wahl dort, unberührt. Gehören Datei und Gerät zu verschiedenen
   Depots, gibt es diesen Weg nicht.
6. **Listen auf Eintragsebene.** Jeder Listen-Stempel nennt seither den Eintrag (`eintragId`) und die Art
   (`listenAenderung`: neu, geaendert, entfernt). Der Entfernt-Stempel trägt nur die Kennung, nie Inhalt. Gepaart wird
   über die `id`. Ein Schema-Schritt ist nicht nötig, die Felder kommen nur in neuen Stempeln hinzu.
   - Ein Eintrag, den nur eine Seite seit der Gabelung angelegt oder geändert hat, wird ohne Rückfrage übernommen.
   - Hat eine Seite ihn entfernt und die andere nicht angefasst, bleibt er weg. Ein gelöschter Eintrag kehrt nicht
     zurück.
   - Hat eine Seite ihn entfernt und die andere geändert, wird gefragt, vorbelegt „behalten“.
   - Haben beide ihn verschieden geändert, wird gefragt, beide Fassungen nebeneinander.
   - Ohne Nennung im Stempel (Altbestand) und bei den Registern Menschen und Institutionen, die keine Kette tragen:
     Ein Eintrag nur auf einer Seite wird gefragt, vorbelegt „behalten“; verschiedene Fassungen werden gefragt.
     Nichts verschwindet ohne Rückfrage.
   - Die Fälle sind am 01.10.2026 abgestimmt; „entfernt gegen geändert“ kam dabei hinzu.
7. **Doppelklick öffnet die Datei.** Beide Manifeste (inline und `manifest.webmanifest`) melden die Sicherungsdatei mit
   der Dateiart an, mit der der Kern sie schreibt (`file_handlers`), und `launch_handler` holt die laufende Sitzung nach
   vorn statt eine zweite zu öffnen. Das wirkt nur in der installierten Desktop-App von Chrome und Edge. Die so
   geöffnete Datei wird das Speicherziel.
   Ist schon ein Depot offen, geht der Weg erst über den gewöhnlichen Rückweg (mit Schließen-Warnung, falls etwas
   ungesichert ist) und zeigt dann den Öffnen-Schirm. Vorher lag er hinter der App (Befund aus der Gegenprobe,
   `tests/e2e/datei-start-launchqueue.spec.js`, mit Rot-Beweis).
   Gegen die Klasse steht `tools/overlay-schreiber-pruefen.js`: Jeder Aufruf eines Overlay-Schreibers holt das Overlay
   nach vorn oder steht mit Grund („nur bei sichtbarem Overlay“, „nur beim Start“) in dessen Positivliste.
8. **Den Speicherort merken**, nur mit Zustimmung: U2-ADR-031, Stück 13.
9. **Befund beim Bau (HOCH):** Der A475-Weg beim Öffnen einer zweiten Fassung suchte die Depot-Kennung in `data`.
   Dort steht sie nie; sie steht in `aktuelleDepotUUID`. Der Weg brach darum im Produkt immer ab. Er vergleicht jetzt
   über `aktuelleDepotUUID`. Ein Wächter verbietet, die Kennung aus `data` zu lesen.

10. **Befund beim Bau (HOCH): ALTMODUL-UEBERDECKT-PRODUKT.** Eine ältere Datei trägt ihr eigenes, älteres
    Sprachmodul. Im Produkt derselben Sprache zeigte jede Stelle, die `textLesen(k) || Literal` las, einen seither neuen
    Text deutsch, obwohl der Rückfall in derselben Sprache (U2-ADR-416) bestand. Betroffen waren 14 Stellen im Kern
    (Auszüge, Institutionsarten, Todesfall-Zwischenfrage, eine strings-Stelle) und 7 in der Lese-App.
    - Ein Helfer `_textLesenOderRueckfall` nimmt jetzt alle: erst das aktive Modul, dann der Rückfall derselben Sprache,
      dann der Literal.
    - Die Lese-App hat für diese Texte keine neuere Quelle derselben Sprache als die Datei. Sie versucht Englisch und
      markiert jeden Ersatz wie bei ihren übrigen Texten.
    - Ein Wächter verbietet die alte Form in beiden Apps.

## Was nicht entschieden ist

- Register mit eigener Kette: Solange Menschen und Institutionen keine tragen, fragt das Zusammenführen dort jeden
  Unterschied, auch einen, den nur eine Seite gemacht hat (etwa einen Namen, der aus der Identität mitgezogen wird).
- Weitere Sprachen: ein angedocktes Sprachmodul bringt seine eigene Liste mit; ohne Liste erscheint kein Vorschlag.

## Belege

```konformitaet
aussage:  Jedes Feld für ein neues Passwort bietet den Vorschlag an und ist verdrahtet.
zustand:  geprüft
herkunft: invariante
pruefung: tests/passwort-vorschlag.test.js#[PW-Vorschlag·Wächter] jedes Feld für ein neues Passwort bietet den Vorschlag an und ist verdrahtet
```

```konformitaet
aussage:  Der Zufall verwirft statt Modulo; jedes Wort ist gleich wahrscheinlich.
zustand:  geprüft
herkunft: invariante
pruefung: tests/passwort-vorschlag.test.js#[PW-Vorschlag·Zufall] Verwerfen statt Modulo: der Rest oberhalb des größten Vielfachen wird nie benutzt
```

```konformitaet
aussage:  Beide Wortlisten tragen nur a–z, kein Wort doppelt, und sechs Wörter mindestens 60 Bit.
zustand:  geprüft
herkunft: invariante
pruefung: tests/passwort-vorschlag.test.js#[PW-Vorschlag·Liste] beide Listen: nur a–z, ohne Doppel, sechs Wörter tragen mindestens 60 Bit
```

```konformitaet
aussage:  Auf einer Seite entfernt und auf der anderen unberührt, bleibt ein Listen-Eintrag weg; ein gelöschter Eintrag kehrt nicht zurück.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fassungen-eintraege-zusammenfuehren.test.js#[Eintrag·kein Geist] auf einer Seite entfernt, auf der anderen unberührt → er bleibt weg, ohne Rückfrage
```

```konformitaet
aussage:  Auf einer Seite entfernt und auf der anderen geändert, wird gefragt, vorbelegt „behalten“; die Änderung geht nicht still verloren.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fassungen-eintraege-zusammenfuehren.test.js#[Eintrag·entfernt gegen geändert] eine Seite entfernt, die andere ändert → Frage, vorbelegt „behalten"
```

```konformitaet
aussage:  Der Entfernt-Stempel einer Liste trägt nur die Kennung des Eintrags, keinen Inhalt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fassungen-eintraege-zusammenfuehren.test.js#[Eintrag·Stempel] jeder Listen-Stempel nennt den Eintrag; der Entfernt-Stempel trägt keinen Inhalt
```

```konformitaet
aussage:  Wer eine zweite Fassung desselben Depots öffnet, bekommt die Änderungen der zuerst offenen zusammengeführt; die Kennung wird nie aus `data` gelesen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fassungen-eintraege-zusammenfuehren.test.js#[A475·Öffnen] wer eine zweite Fassung desselben Depots öffnet, bekommt die Änderungen der ersten zusammengeführt
```

```konformitaet
aussage:  Keine Anzeigestelle in Kern oder Lese-App liest `textLesen(…) || Literal`; jede nimmt den Rückfall derselben Sprache.
zustand:  geprüft
herkunft: invariante
pruefung: tests/textsatz-rueckfall-alle-stellen.test.js#[Rückfall·Wächter] kein `textLesen(…) ||` in Kern und Lese-App — jede Stelle mit Literal nimmt _textLesenOderRueckfall
```

```konformitaet
aussage:  Eine ältere englische Datei zeigt im englischen Produkt jeden Auszugstext englisch, auch die, die ihr eigenes Modul nicht kennt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/textsatz-rueckfall-alle-stellen.test.js#[Rückfall·Altdatei] eine ältere englische Datei zeigt im englischen Produkt jeden Auszugstext englisch
```

```konformitaet
aussage:  Kein Overlay geht bei offenem Depot verdeckt auf: jeder Aufruf eines Overlay-Schreibers holt das Overlay nach vorn oder steht mit Grund in der Positivliste.
zustand:  geprüft
herkunft: invariante
pruefung: tests/overlay-schreiber-pruefen.test.js#[Overlay·Wächter] jeder Aufruf eines Overlay-Schreibers holt das Overlay nach vorn oder steht mit Grund in der Positivliste
```

```konformitaet
aussage:  Beide Manifeste melden die Sicherungsdatei mit der Dateiart an, mit der der Kern sie schreibt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/datei-start-manifest.test.js#[Datei-Start] beide Manifeste melden die Sicherungsdatei an, mit der Dateiart, mit der der Kern sie schreibt
```

---

*Vivodepot GmbH · Berlin · 01.10.2026*
