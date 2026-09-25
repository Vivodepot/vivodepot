# U2-ADR-431: Die unersetzbaren Angaben am Herkunftsort stehen in EINER Quelle — erzeugter Block, Platzhalter, Abweisen beim Erzeugen, Ergänzen beim Anzeigen

**Status:** entschieden, gelandet.
**Status heute:** gilt — Beleg `tests/herkunftsort-invariante.test.js` und `tests/herkunftsort-angaben-gleich.test.js`.
**Datum:** 21.09.2026
**Kategorie:** ARCHITEKTUR, HERKUNFT, WHITE-LABEL
**Linie:** U2
**Betrifft:** `vivodepot.html` (`HERKUNFTSORT_ANGABEN`, `_herkunftsortSchluessel`, `_markePlatzhalterAufloesen`, `_herkunftsortAngabeFehlt`, `_textsatzTexteUebernehmen`, `_herkunftsortAusgabe`), `vivodepot-lesen.html` (`HERKUNFTSORT_ANGABEN`, `URHEBER_LESEN`), `tools/herkunftsort-angaben.json`, `tools/herkunftsort-angaben-schreiben.js`, `tools/lib/herkunftsort-angaben.js`, `tools/lib/produkt-text-erzeugen.js`, `tools/herkunftsort-pruefen.js`, `tools/textsatz-de-modul.json`, `tools/textsatz-en-vollabdeckung-daten.js`
**Bezug:** Spezifikation 34.7 (Kennzeichen; Urheberschaft am Herkunftsort, Fassung md5 aa468bfa und folgende), 30.3, 36.1, 36.4, 25.8 · U2-ADR-400 (White Label bis ins PDF, Herkunftsort), U2-ADR-331 (Zusicherungen nicht überschreibbar), U2-ADR-384 (Marke als Ab-Werk-Saat, ohne Signatur), U2-ADR-249 und U2-ADR-230 (die eine PBKDF2-Stelle)

## Befund

Die Angabe der Urheberin am Herkunftsort — ihr Name und die Lizenzkennung — stand als Klartext in zwei Sätzen der Sprachmodule (`herkunftPoweredBy`, `herkunftLizenzhinweis`) und, in der Lese-App, als Literal `URHEBER_LESEN`. Gemessen am gebauten und geöffneten Produkt, nicht nur am Kern:

- Ein Produkt-Sprachmodul, das der Konfektionierer einbäckt, wird mit `{ vertrauenswuerdig: true }` geprüft; dort darf es die Zusicherungs-Schlüssel setzen, ohne dass die Angabe im Text steht. „Powered by Fremdfirma“ kam am Herkunftsort an. Auch `'signiert'` ließ den plumpen Ersatz durch (die Formprüfung kennt Platzhalter-Mengen und Länge, keinen Namen); den Platzhalter-Ersatz wies sie ab.
- `{marke}` löst beim Lesen aus dem Branding-Modul auf, und das Branding ist unsigniert (U2-ADR-384). Ein Text mit `{marke}` an der Stelle des Namens ließ den Markennamen als Urheberin am Herkunftsort stehen. Für jeden, der das Sprachmodul liest, ist das unsichtbar: der Wortlaut nennt „Vivodepot“ nie.
- Der Konfektionierer kannte weder die Zusicherungsliste noch ein Register und baute aus einem solchen Rezept ein Produkt.
- Dieselbe Angabe stand in Kern und Lese-App je einmal als eigene Festlegung, gebunden nur durch einen Kommentar. Das ist die Form, die die Spezifikation als „zwei Wahrheiten“ benennt.

Die ADRs zu den einzelnen Wegen sichern den WEG zu (U2-ADR-331: Zusicherungs-Schlüssel sind aus einem Depot-Modul nicht überschreibbar). Die Einzigkeit der ANGABE selbst, über alle Wege, hat nie jemand gesichert. Ein Vertrauensmerkmal an einem Modul erübrigt eine Herkunfts- oder Signaturprüfung; es erübrigt nicht die Prüfung, dass die unersetzbare Angabe da ist.

## Entscheidung

1. **Eine Quelle.** `tools/herkunftsort-angaben.json` führt Name, Marke, Ort der Urheberin, die Lizenzkennung und je Textsatz-Schlüssel des Herkunftsorts die Platzhalter, die sein Text tragen MUSS. `tools/herkunftsort-angaben-schreiben.js` erzeugt daraus in jedem Träger (Kern, Lese-App) denselben Block `HERKUNFTSORT_ANGABEN`, byte-gleich, mit `--check` und Exit-Code. Dasselbe Muster wie der Krypto-Kern in allen Trägern (34.9): je Anwendung eine ERZEUGTE Fundstelle aus gemeinsamer Quelle, mit einer Prüfung gegen Abweichung. `URHEBER_LESEN` ist daraus abgeleitet.
2. **Der Block ist eine DAUERHAFTE Marker-Region.** Text, den wir führen müssen, weil das Weglassen falsch wäre — dieselbe Sorte wie die Lizenzhinweise der Codelisten (`regionen.dauerhaft` der Gerüst-Wächter-Grundlinie, Probe: die Vergleichsdatei). Ein Schnitt nimmt die Urheberin nicht mit; `tools/herkunftsort-pruefen.js` und die Probe der Lese-App schneiden dauerhafte Regionen nicht heraus. Das ist eine Ausnahme im Gerüst-Wächter (34.1: 20 Byte Satz), keine Lücke: die Obergrenze für dauerhafte Regionen steht bei zwei, namentlich.
3. **Platzhalter statt Klartext.** `herkunftPoweredBy` und `herkunftLizenzhinweis` tragen `{urheberin}` und `{lizenz}`. Die Ausgabe bleibt zeichengleich; die Übersetzbarkeit bleibt voll (der Platzhalter darf im Satz wandern). Eine harte Zerlegung in Beschriftung und Angabe war nicht nötig und ist nicht entschieden.
4. **Auflösung schlüsselgenau.** In den Herkunftsort-Schlüsseln lösen NUR `{urheberin}` und `{lizenz}` auf, aus dem Block, nie aus dem Branding; `{marke}` und `{marke_domain}` bleiben dort sichtbar stehen. Kein pauschaler Schutz in Zusicherungs-Sätzen: fünf andere Zusicherungs-Sätze nutzen `{marke}` zu Recht als Namen der Anbieterin. Kein Bypass-Leser: dieselbe Lesekette (Proxy → `textLesen` → Auflösung → Herkunfts-Suffix), ein zusätzlicher Parameter.
5. **Anwesenheit auf jeder Vertrauensstufe.** `_textsatzTexteUebernehmen` weist einen Text eines Herkunftsort-Schlüssels ab, dem ein Platzhalter fehlt oder der `{marke}` führt — auf `true` wie auf `'signiert'`, NACH der Zusicherungs-Sperre (ein unvertrautes Modul heißt weiter `zusicherung`).
6. **Beim Erzeugen abweisen.** `tools/lib/produkt-text-erzeugen.js` liest dieselbe Schlüsselmenge aus dem Kern-Text (`rezeptPruefen`, ohne fs, der Worker bleibt lauffähig) und verweigert ein Rezept, dessen Sprachmodul die Platzhalter nicht trägt. Der Mangel ist dort sichtbar, wo er behoben werden kann. Ein Rezept ohne Sprachmodul (das nackte Gerüst, 36.4) hat nichts zu prüfen; mit Sprachmodul und ohne Block im Kern ist es ein Fehler, kein Grün.
7. **Beim Anzeigen ergänzen — nie als einzige Prüfung.** `_herkunftsortAusgabe` fügt eine fehlende Angabe hinzu und meldet es in `_HERKUNFTSORT_ERGAENZT`. Ein ausgeliefertes Produkt verweigert die Anzeige nicht; die Bürgerin trüge den Schaden für einen Fehler, den sie nicht gemacht hat. Allein stehend wäre die Ergänzung eine stille Reparatur; darum gibt es 5 und 6.
8. **Die Proben messen die Wirkung, nicht den Mechanismus.** Sie bauen und öffnen Produkte (auch mit Branding-Modul) und lesen den Herkunftsort. Eine Probe auf den Ausgang bleibt richtig, wenn der Mechanismus sich ändert; eine Probe auf den Eingang wird dann fälschlich rot.

## Bekannte Grenze

Die Anwesenheitsregel und der Formcheck auf `'signiert'` sichern die ANWESENHEIT der Platzhalter, nicht die Unversehrtheit des Satzes: „Bereitgestellt mit {urheberin} im Auftrag der Fremdfirma“ trägt dieselben Platzhalter und kommt durch. 34.7 verlangt Vorhandensein und Unersetzbarkeit, nicht Alleinstellung. Die Grenze steht als Test. Nicht aus dem Repo messbar, aber folgenlos: signierte Fremdmodule, die die Schlüssel setzen — ohne Platzhalter werden sie beim Erzeugen abgewiesen, und wo eines schon draußen ist, ergänzt die Anzeige.

## Was diese Entscheidung nicht leistet

- Sie trägt den Herkunftsort nicht in den Vorlagen-Erzeuger und den VC-Issuer (30.3): `tools/herkunftsort-offen.json` führt sie mit Eigentümer und Frage; die Zahl kann nur sinken.
- Sie deckt nur den Sprachmodul-Weg (`true`, `'signiert'`) und die Marken-Achse ab. Ein anderer Modultyp, der eine Herkunftsort-Kennung erreichen könnte, wäre eine weitere Wirkungsprobe, kein Zähler auf das Wort `vertrauenswuerdig` (19 Stellen im Kern, zwei Mechanismen, einer davon berührt eine Invariante).
- Sie entscheidet die Krypto-Stärkegrößen (PBKDF2-Iterationen) nicht; dieselbe Bauform ist dort der nächste Fall.

## Der Worker-Weg und der offene Nachzug

Der produktive Konfektionierer ist die Kopie von `produktTextErzeugen` im Schwesterrepo (Worker). Die Abweisung beim Erzeugen (Ziffer 6) steht darum IM kopierten Abschnitt von `tools/lib/produkt-text-erzeugen.js`, nicht an einem der zwei Aufrufer: ein Aufrufer-Riegel ließe den Worker-Weg offen und müsste an beiden Aufrufern stehen. Sie ist selbstenthalten (kein `require`, kein `fs`), damit die Kopie ohne zweite Datei läuft; `tools/lib/herkunftsort-angaben.js` führt dieselben Funktionen unter ihren Namen für Erzeuger, Prüfung und Tests weiter, eine Umsetzung, nicht zwei.

Die Prüfsumme des Abschnitts ist bewusst angehoben. Die Kopie im Schwesterrepo trägt den neuen Abschnitt noch nicht (sie trägt auch die Region `sprachangebot` noch nicht); der Nachzug ist ein Auftrag mit zwei Stücken (Abschnitt byte-gleich samt Pin, Rezept-Fixtures), keine neue Datei. Bis dahin ist der Abgleich `tests/produkt-text-erzeugen-cross-repo-abgleich.test.js` nicht still, sondern deckt genau den bekannten Vorstand des Schwesterrepos, befristet bis 2026-09-26; ein anderer Stand dort ist wieder ein Fund, und die Frist selbst wird unabhängig vom Schwesterrepo geprüft. Abnahme: der Abgleich ist grün ohne die Ausnahme, und die Suite des Schwesterrepos ist grün mit dem neuen Pin.

## Folgen für Bindungen

Eine `pruefung:`-Zeile bindet an einen TESTTITEL — an einen Namen, den jeder frei ändern darf. Sie bricht bei jeder Umbenennung, aber sie bricht LAUT (`pruefstand-bindung`), im Unterschied zu einer Prüfung, die grün bleibt, weil ihr Gegenstand fehlt. Wer einen Titel ändert (wie „genau vier“ → „genau fünf“ in `tests/herkunftsort.test.js`), zieht die Bindung in derselben Änderung nach.

```yaml
konformitaet:
  - aussage: >-
      Die Angaben der Urheberin am Herkunftsort stehen in einer Quelle und in jedem Träger als derselbe erzeugte Block; ein Träger, der abweicht oder ihn verliert, macht die Prüfung rot.
    zustand: erfuellt
    herkunft: U2-ADR-431 (21.09.2026)
    pruefung:
      - tests/herkunftsort-angaben-gleich.test.js
        "[Herkunftsort-Angaben] jeder Träger trägt den erzeugten Block, byte-gleich mit dem aus der Quelle (Exit 0)"
      - tests/herkunftsort-angaben-gleich.test.js
        "[Herkunftsort-Angaben·Rot-Beweis] eine Abweichung in einem Träger und ein fehlender Block sind rot (Exit 1)"
      - tests/herkunftsort-angaben-gleich.test.js
        "[Herkunftsort-Angaben] die Angabe steht NUR im Block: kein zweites Literal des Namens in einem Träger"

  - aussage: >-
      Ein Text eines Herkunftsort-Schlüssels ohne die Platzhalter oder mit `{marke}` wird auf JEDER Vertrauensstufe abgewiesen; `{marke}` löst dort nicht aus dem Branding auf, sonst überall weiter.
    zustand: erfuellt
    herkunft: U2-ADR-431 (21.09.2026)
    pruefung:
      - tests/herkunftsort-invariante.test.js
        "[34.7·Anwesenheit] beide Vertrauensstufen weisen einen Text ohne die Platzhalter ab, `{marke}` in den Herkunftsort-Schlüsseln auch; die Grenze steht als Test"
      - tests/herkunftsort-invariante.test.js
        "[34.7·Auflösung] `{urheberin}`/`{lizenz}` lösen aus der Konstante auf, `{marke}` bleibt im Herkunftsort-Schlüssel stehen und löst anderswo weiter auf"

  - aussage: >-
      Der Konfektionierer liest dieselbe Schlüsselmenge wie Kern und Prüfung und bringt aus einem Rezept ohne die Angabe kein Produkt hervor.
    zustand: erfuellt
    herkunft: U2-ADR-431 (21.09.2026)
    pruefung:
      - tests/herkunftsort-invariante.test.js
        "[34.7·Erzeugen] der Konfektionierer weist ein Rezept ohne die Angabe ab und baut das mit Platzhaltern"
      - tests/herkunftsort-angaben-gleich.test.js
        "[Herkunftsort-Angaben] der Konfektionierer liest DIESELBE Schlüsselmenge aus dem Kern-Text (rezeptPruefen)"

  - aussage: >-
      Am gebauten und geöffneten Produkt steht die Angabe der Urheberin am Herkunftsort, auch mit Branding-Modul; fehlt sie im aufgelösten Text, ergänzt die Anzeige sie und meldet es.
    zustand: erfuellt
    herkunft: U2-ADR-431 (21.09.2026)
    pruefung:
      - tests/herkunftsort-invariante.test.js
        "[34.7·Erzeugnis] am gebauten und geöffneten Produkt: eine legitime Übersetzung zeigt die Angabe; ein Branding-Modul ändert sie nicht und erreicht den Herkunftsort nicht"
      - tests/herkunftsort-invariante.test.js
        "[34.7·Anzeige] fehlt die Angabe im aufgelösten Text (nacktes Gerüst ohne Sprache, ein Text ohne sie), ERGÄNZT der Herkunftsort sie — und meldet es, keine stille Reparatur"

  - aussage: >-
      Die Anwesenheitsregel sichert das Vorhandensein der Platzhalter, nicht die Unversehrtheit des Satzes: ein fremder Zusatz neben den Platzhaltern kommt durch.
    zustand: bekannte-grenze
    herkunft: U2-ADR-431 (21.09.2026); Grenze benannt statt verschwiegen (34.7: Vorhandensein und Unersetzbarkeit, nicht Alleinstellung)
    pruefung:
      - tests/herkunftsort-invariante.test.js
        "[34.7·Anwesenheit] beide Vertrauensstufen weisen einen Text ohne die Platzhalter ab, `{marke}` in den Herkunftsort-Schlüsseln auch; die Grenze steht als Test"
```
