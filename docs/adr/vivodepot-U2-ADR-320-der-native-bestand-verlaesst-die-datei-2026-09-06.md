# U2-ADR-320: Der native Bereichsbestand verlässt die Datei — das Bündel ist die einzige Quelle

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot.html` (`SEKTOREN`), `tools/vd-privat-struktur-bundle-erzeugen.js`,
`tools/inline-texte-messen.js`, `tools/textsatz-umstellen.js`, `tools/bereichs-ids-erheben.js`,
`tools/waechter-register.js`, `tools/schicht2-additiv-oder-stufe-messen.js`,
`tests/fixtures/sektoren-EINGEFROREN-nativer-bestand-debcb406.json`,
`tests/fixtures/e4-depot-zustand-EINGEFROREN-nativ-debcb406.json`

- **Status heute:** gilt — `SEKTOREN` ist im Quelltext leer, die dreizehn Bereiche entstehen beim
  Laden aus dem eingebetteten Bündel. **2 146 Zeilen weniger in der Datei.** Der erzeugte Bestand
  ist gegen den eingefrorenen nativen **Feld für Feld identisch**, auf Struktur- **und** Depot-Ebene.

---

## Was die Bürgerin merkt

**Nichts.** Das ist die ganze Abnahme.

```
Bereiche 13 · Felder 266 · UnterFelder 182 · Beschriftungen da
Weg 1 (durch die Oberfläche, von vorn bis hinten) grün
```

## Der Fund, der beinahe durchgegangen wäre

**Der Bürgerweg brach beim ERSTEN Schritt.** „Hier anfangen" öffnete die App nicht — kein Wurf,
keine Meldung, der Startbildschirm blieb stehen. Eine Zeile:

```
14489  let aktiverSektorId = (bereicheAlle()[0] && bereicheAlle()[0].id) || null;
23042  const _BUERGERMODUL_BUENDEL_BERICHT = buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL);
```

Der aktive Bereich wird **8 553 Zeilen bevor es einen Bereich gibt** festgelegt. `bereicheAlle()`
liefert dort `[]`, und die Zuweisung fängt `null` ein — dauerhaft, denn sie ist ein **Wert**, keine
Ableitung.

**Und jede Messung am geladenen Kern war grün.** Dreizehn Bereiche, 266 Felder, Beschriftungen,
Bündel-Bericht sauber. Gefunden hat es allein der Weg durch die Oberfläche
(`tests/mit-modul/weg-1-depot-anlegen.test.js`).

**Die Zeile bleibt stehen**, statt hierher zu wandern: für einen Bau **ohne** eingebettetes Bündel
ist sie weiterhin richtig. Nachgezogen wird nur, was dort mangels Bestand offenblieb.

## Der Maßstab musste eingefroren werden, bevor er verschwand

Nach dem Schnitt lässt sich „derselbe Bestand" nicht mehr belegen, sondern nur behaupten — das
Original ist fort und kommt nicht wieder (U2-ADR-317 sagte es schon). **Zwei Maßstäbe, beide gegen
`debcb406`, die letzte Fassung, die den nativen Bestand trug:**

```
Struktur   sektoren-EINGEFROREN-nativer-bestand-debcb406.json     13/266/182
Depot      e4-depot-zustand-EINGEFROREN-nativ-debcb406.json       PDF-Modelle + Exportkanäle
```

Beide sagen im **Dateinamen** und im Kopf, dass sie Maßstab sind und keine Quelle, und beide nennen
ihren Bezug — Commit, Standzahl, Datum. **Ohne Bezug ist „identisch" eine Behauptung.** Der
Depot-Maßstab wird nur hinter `E4_DEPOT_ZUSTAND_NEU=1` neu geschrieben: **ein Maßstab, der sich bei
jedem Lauf selbst nachzieht, misst nichts.**

## Was der Maßstab in der ersten Minute fand

**Zehn Export-Beschriftungen fehlten.** Nativ:

```js
{ format: 'vcard-identitaet', label: STRINGS.exportVcardLabel }
{ format: 'fhir-ips', get label() { return STRINGS.fhirExportKurz; } }
```

Der Vier-Achsen-Schnitt hat den Text korrekt ins Sprach-Modul verschoben — **und den Rückweg nie
gebaut.** Das Werkzeug hatte es selbst hingeschrieben (`buergermodul-schnitt.js:304`:
*„exporte[].label → strings:exportIdentitaetLabel.text NICHT ableitbar"*). Solange der native
Bestand die lebende Referenz trug, fiel es nicht auf.

**Der Bürgerin wäre `undefined` im Export-Fenster erschienen.**

**Das Bündel trägt jetzt den Schlüssel, nicht den Text:**
`{"format":"vcard-identitaet","labelSchluessel":"exportVcardLabel"}`. Der Kern hängt beim Erzeugen
einen **aufzählbaren Getter** an, der zur Lesezeit in `STRINGS` auflöst — wörtlich die native Form,
nur datengetrieben. `labelSchluessel` bleibt **nicht** am Objekt: der native Bestand trug
`{format, label}`, und ein Schlüssel mehr wäre eine stille Abweichung vom Maßstab.

**Die schnellere Lösung wäre falsch gewesen:** den deutschen Text ins Struktur-Bündel schreiben.
Dann trüge das Struktur-Modul Sprache, und die Achsen-Probe fiele hier durch — *ändere die Sprache,
und was sich ändert, ist Sprache.*

**Und der Schlüssel wird abgeleitet, nicht gepflegt:** der Erzeuger sucht, welcher
Textsatz-Schlüssel genau diesen Text trägt, und **wirft**, wenn er nicht eindeutig ist. Eine
gepflegte Tabelle wäre der Wächter, der den nächsten Fall nicht kennt.

## Die Wächter-Kaskade — 38 rot, aber vier Ursachen

Die lauteste Lehre steht nicht in der Zahl:

**`tools/inline-texte-messen.js` meldete GRÜN, ohne etwas geprüft zu haben.** Vierte Wiederholung
derselben `const`→`let`-Falle in derselben Datei (nach `SEKTOR_BY_ID`, `SITUATION_BY_ID`,
`WIZARD_BY_ID`). `indexOf` lieferte `-1`, `slice(-1, ende)` ergab einen **leeren** Bereich.
**Die drei Male davor gab es einen Fehlalarm. Ein Fehlalarm fällt auf; ein falsches Grün nicht.**
Gefunden hat es allein ein Rot-Beweis, der rot *verlangt*.

Dreimal wurde die einzelne Stelle regexfest gemacht, **die Klasse nie**. Jetzt wirft ein verfehlter
Anker, statt still leer zu messen.

**Dieselbe Blindheit eine Ebene tiefer:** `inGeschuetztemBlock` schützte `standardDokumente:` in der
JS-Schreibweise; im Bündel heißt es `"standardDokumente":`. Fünfundzwanzig ausdrücklich geschützte
Texte erschienen als frische Doppelzustände — **kein neuer Verstoß, sondern ein Schutz, der seinen
Gegenstand nicht mehr erkannte.** Gemessen gegen den Kanon: dort null, hier fünfundzwanzig, bei
unverändertem Inhalt.

**Fünf Wächter konnten ihre Rotprobe nicht mehr pflanzen** — ihre Anker (`{ id: 'ausweis', typ:
'liste',`) lagen im entfernten Block. Gefangen hat das der **Selbsttest**, nicht die Wächter
selbst: „113 von 118 Fabriken baubar". Ohne ihn wären fünf Rotproben still grün geblieben, weil
ihre Mutation gar nicht ankommt. Dies ist die **dritte** Nachziehung derselben Anker.

**Und der Doppelzustands-Prüfer hat einen besseren Gegenstand bekommen.** Er sucht jetzt im Bündel,
und das trägt gemessen **keinen deutschen Text**. „Doppelzustand" heißt hier nicht mehr „Text steht
zweimal", sondern **„im Struktur-Modul steht überhaupt Text"** — genau die Achsen-Verletzung, die
die Probe meint.

## Was sich verschlechtert hat, und das gehört benannt

**Der Tippfehler-Fall wird nicht mehr beim Laden gefangen, sondern beim ersten Lesen.** `WIZARDS`
wird rund 7 000 Zeilen vor dem Bündel-Aufruf ausgewertet; zu diesem Zeitpunkt ist der Bestand leer,
und `_katalogOptionen` nimmt den kulanten Zweig aus U2-ADR-312 („Bereich fehlt ganz → []").

Die Eigenschaft selbst ist unverändert scharf — gemessen:

```
befüllter Bereich, echtes Feld      → Optionen
befüllter Bereich, erfundenes Feld  → WIRFT
Bereich fehlt ganz                  → []
```

Wer den Wurf zurück ans Laden holen will, muss den Bündel-Aufruf **vor** `WIZARDS` ziehen. Eigener
Gegenstand, eigene Entscheidung.

**Und mit dem Bestand sind alle Kommentare zu den Feldern verschwunden.** JSON trägt keine.
Gemessen, damit es ein Posten ist und keine Redewendung:

```
entfernter Block            2 146 Zeilen
davon Kommentarzeilen         695  =  32,4 %   (63 888 Zeichen)

davon tragend               243 Zeilen
  datierter Nachtrag        189   (Datum, U2-ADR-…, A-Nummer)
  Herkunft                   41   (Quelle, „laut", §, bbk.bund.de, DSGVO/BGB/SGB/PAuswG)
  Begründung                 30   („warum", „darum", „weil", „kein erfundener Rat")
  Messung/Befund              9
```

**Ein Drittel des entfernten Blocks war Dokumentation.** Aufgefallen ist der Verlust an **genau
einer** Stelle — dem BBK-Herkunftsnachweis, weil `tests/bbk-quelle-konsistenz.test.js` die Bindung
zwischen dem angezeigten Satz und seiner Quelle bewacht. Dieser eine ist gerettet und steht jetzt
beim angezeigten Satz. **Die übrigen sind unbemerkt fortgefallen; sie stehen in der Git-Historie
bei `debcb406`, nirgends sonst.**

**Ob diese Notizen künftig im Bündel mitreisen sollen, ist eine Bau-Entscheidung und in diesem Zug
nicht getroffen.** Was mit dem Schnitt verlorenging, ist damit gemessen und benannt — mehr sagt
dieser ADR dazu nicht.

## Die Zuordnung Feld → Text ist nicht garantiert

**Entschieden (06.09.2026), für die Texte, die die Bürgerin liest:**

> **„alle texte mit und die zuordnung garantieren"**

**Die Texte selbst sind vollständig.** Selbst gemessen: **3 196 Kennungen** im Textsatz, davon
**589** in Feld-Form (`<bereich>.<feld>.<rolle>`). **Garantiert ist aber nur eine Richtung:**

```
Text ohne Feld    fängt der Erreichbarkeits-Wächter — keine tote Kennung
Feld ohne Text    prüft NIEMAND
```

**Ein Feld, dem seine Beschriftung fehlt, fällt heute erst der Bürgerin auf** — als leeres Label
oder als `undefined`. **Und genau dieser Fall ist in diesem Zug eingetreten:** die zehn
`exporte[].label` fielen beim Schnitt weg, und gemeldet hat es nicht der Textsatz, sondern der
Vergleich gegen den eingefrorenen Bestand. Ein Zufall, kein Wächter.

**Was aussteht — nach entschiedener Vorgabe, nicht als offene Frage:**

```
Rot-Beweis   ein Feld ohne seinen Text  ->  ROT     (fehlt)
Rot-Beweis   ein Text ohne sein Feld    ->  ROT     (existiert)
Ausbeute     die Probe prüft ZUERST, wie viele Felder sie gefunden hat —
             sonst ist sie grün, weil sie nichts sieht
```

Zu klären ist dabei, **welche Feld-Arten überhaupt eine Beschriftung brauchen** — nicht jedes
Attribut ist Text. Und die Achse gilt unverändert: **der Text bleibt im Sprach-Modul, die Struktur
trägt nur die Kennung.** Kein deutscher Text ins Struktur-Bündel, auch nicht als Rückfall.

**Nicht in diesem Zug**, und das ist eine Reihenfolge-Entscheidung, keine Auslassung: der Schnitt
gehört in den Kanon, bevor ein zweiter Umbau auf ihm aufsetzt.

## Der Erzeuger prüft sich wieder selbst — und warum das kein Zirkelschluss ist

`ladeKernPristin` neutralisierte das Bündel, um an den nativen Bestand zu kommen. Das liefert jetzt
nicht „unberührt", sondern **nichts** (gemessen: 0 Bereiche statt 13). Der Lader heißt darum
`ladeKernMitBestand` und liest den lebenden Bestand.

**Der Anker liegt außerhalb der Kette:** dass der lebende Bestand derselbe ist wie der native,
belegt das eingefrorene Fixture — Feld für Feld. **Ohne diesen Anker wäre es einer**, und dann
dürfte der Erzeuger sich nicht mehr selbst prüfen.

## Was ausdrücklich NICHT dazugehört

**Die Lese-App.** Sie trägt ihren Bestand weiter nativ — selbst gemessen:

```
vivodepot-lesen.html   Zeilen 1469–2955 = 1 487 Zeilen
                       138 337 von 385 185 Bytes = 35,9 % der Datei
                       433 eindeutige `id:`-Kennungen
```

**Das ist kein Restposten, sondern ein zweiter vollständiger Bestand in einer zweiten
ausgelieferten Datei.** Ob sie ebenfalls ein Bündel bekommt, ist eine Produktentscheidung und
gehört nicht in diesen Zug — ein zweiter Umzug an einer zweiten Datei, während der erste läuft,
wäre die Doppelbaustelle, die bei den Assistenten schon abgelehnt wurde.

**Die Erhebung der Bereichs-IDs** liest für den Kern jetzt das Bündel, für die Lese-App weiter den
Quelltext-Block. Beide Wege stehen nebeneinander, weil beide Dateien verschieden gebaut sind.

**`WIZARDS`.** Was ein Ladeweg zur Laufzeit einsetzt, sehen diese Proben nicht.
