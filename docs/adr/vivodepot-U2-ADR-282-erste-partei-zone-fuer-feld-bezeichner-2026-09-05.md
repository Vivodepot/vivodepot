# U2-ADR-282: Die Erste-Partei-Zone — native Feld-Bezeichner ohne den `tpl_`-Zwang

**Status:** Akzeptiert
**Datum:** 05.09.2026
**Kategorie:** SICHERHEIT, GERÜST, WERKZEUG
**Drei-Anker:**
- **Code-Stelle:** `erstePartieFeldDefsPruefen()` in `vivodepot.html`, unmittelbar hinter
  `_tplFeldId` — sie ist dessen Ausnahme, kein Fremdkörper. Probe:
  `tests/erste-partei-zone.test.js`.
- **ADR-Bezug:** U2-ADR-037 (die Namensraum-Härtung, die hier geöffnet wird), U2-ADR-040
  (`STANDARD_VORLAGEN_CERTS` — der lebende Präzedenzfall derselben Eigenschaft), U2-ADR-253
  (Schritt HERAUSNEHMEN, für den diese Zone gebaut ist).
- **Status heute:** gilt — sechs Proben, darunter ein Rot-Beweis und eine **Ratsche**, die rot
  wird, sobald ein Aufruf im Kern auftaucht. **Die Funktion ist absichtlich unverdrahtet.**

---

## Der Befund

Der Schritt NEUTRALISIEREN der vorgegebenen Reihenfolge verlangt, den `tpl_`-Präfixzwang zu
lösen. **Der Grund steht am Erzeuger selbst und ist der wichtigste Satz zum Thema:**

> Ein Feld-Bezeichner ist der Ort, an dem der **WERT** der Bürgerin liegt. Ihn zu ändern hieße,
> den Wert zu **verwaisen** und daneben ein leeres Feld anzulegen — beim nächsten
> Vorlagen-Update jedes Bestandsdepots.

Wandert das Bürgerdepot in ein Modul, muss es `vorname` weiter `vorname` nennen dürfen.
**Gleichzeitig ist der Zwang eine Sicherheitsgrenze:** dürfte ein fremdes Modul sich `vorname`
nennen, könnte es sich Kernverhalten aneignen — der Kern fragt an vielen Stellen nach genau
diesem Namen.

**Gemessen:** drei Riegelstellen, alle in `importAnwenden`, je `grund: 'praefix'`. 57 Testdateien
erwähnen `tpl_`; **genau drei Zusicherungen in zwei Dateien haben den Riegel zum Gegenstand.**

---

## Die Entscheidung

**Die Bindung ist die AUFRUFSTELLE, kein Nachweis am Modul.**

`erstePartieFeldDefsPruefen(defs, erlaubteIds)` liegt außerhalb des Import-Weges. Kein
`importAnwenden`, kein `modulEinlassen` führt zu ihr. **Ein fremdes Modul erreicht sie nicht —
nicht weil es einen Nachweis nicht führen kann, sondern weil es keinen Weg gibt. Es gibt nichts zu
fälschen.**

**Sie entscheidet nichts.** Der Aufrufer gibt die erlaubten Bezeichner ausdrücklich mit; was nicht
darin steht, wird **abgelehnt — nicht stillschweigend auf den Präfix umgelenkt.** Eine Funktion,
die selbst entschiede, welcher Bezeichner nativ sein darf, wäre dieselbe Grenze noch einmal, nur an
einer schlechteren Stelle.

### Drei andere Formen, gemessen und verworfen

| Form | warum nicht |
|---|---|
| **Signatur** (`anbieterIdGeprueft`) | koppelt an die Signaturfrage — eigener offener Posten, Betriebsentscheidung und Schlüsselmaterial-Grenze |
| **Marke IM Modul** | die Marke stünde im Modul, **also könnte jedes Modul sie behaupten** — kein Nachweis, nur eine Behauptung |
| **Abdruck im Gerüst** | scheitert **zweifach**: er bindet an eine **Datei-Fassung** statt an Namen — ein Gerüst-Update entwertete das gespeicherte Modul; **und** `importAnwenden` ist synchron, `crypto.subtle.digest` ist es nicht |

**Die dritte war bereits freigegeben.** Sie fiel an einer Messung, nicht an einem Argument.

### Der lebende Präzedenzfall — und warum er hier nicht genommen wurde

**Diese Eigenschaft ist im Haus nicht neu.** `STANDARD_VORLAGEN_CERTS` (U2-ADR-040) trägt
TA-signierte Behörden-Zertifikate als eingefrorene Konstante **im Gerüst**; gemessen: **null
Lesezugriffe aus `data`.** Die Basis-Vorlagen laufen durch **dieselbe** Verify-Kette wie fremde —
**der Unterschied ist die Quelle, nicht die Prüfung.**

**Das ist die stärkere Form**, und sie ist erprobt. Sie wurde hier **nicht** genommen, weil es das
eigene Inhaltsmodul noch nicht gibt: **man kann nichts einbetten und signieren, was noch nicht
existiert.** Wer den Schritt HERAUSNEHMEN baut, sollte prüfen, ob diese Zone dann durch die
Präzedenz-Form ersetzt gehört.

---

## Wofür sie NICHT gilt — ausdrücklich

**Nur Feld-Bezeichner, nur beim Übernehmen. NICHT für Bereichs-IDs.**

```
tpl_-Riegel (Feld-IDs)                laeuft EINMAL, beim Import
bereichsModulPruefen (Bereichs-IDs)   laeuft bei JEDEM Laden der Datei
```

**Eine Zugehörigkeit, die bei jedem Laden neu entschieden würde, könnte ein Gerüst-Update das
gespeicherte Modul entwerten lassen** — und damit genau die Verwaisung auslösen, gegen die der
ganze Entwurf gebaut ist. Bereichs-IDs brauchen eine Bindung an eine Modul-**Familie** statt an
eine Fassung. **Eigener Gegenstand, Schritt HERAUSNEHMEN.**

### Das Hausmuster dahinter

**Zweimal an einem Tag entschied der Prüfzeitpunkt, ob eine Zusage hält oder die Bürgerin ihre
Werte verliert:**

```
Widerruf eines Anbieters   geprueft EINMAL, beim Einlass   -> erreicht Bestandsdepots nie
Struktur eines Moduls      geprueft bei JEDEM Oeffnen      -> trifft jedes Depot, jedes Mal
tpl_-Riegel                geprueft EINMAL, beim Import    -> Bindung an eine Fassung ist sicher
Bereichs-ID-Sperre         geprueft bei JEDEM Oeffnen      -> dieselbe Bindung waere gefaehrlich
```

> **Wer eine Zugehörigkeit entwirft, muss zuerst messen, WANN sie geprüft wird.** Der nächste, der
> eine Bindung baut, soll es nicht ein drittes Mal selbst finden.

---

## Heute unverdrahtet — und warum das hier steht

**Es gibt noch keinen Ladeweg für ein eigenes Inhaltsmodul.** Die Funktion wartet auf ihn.

**Sie ist in `tools/nur-vom-test-erreicht-grundlinie.json` eingetragen — MIT Begründung.** Deren
Kopfzeile lautet: *„Kandidaten für ‚gebaut, nie verdrahtet'. KEINE Löschliste — jeder Fall
einzeln."*

**Bei einer Messung am selben Tag stand dort ein Eintrag ohne Begründung**, und das war der
schärfste Teil jenes Befunds. **Ein Fall mit Grund ist ein Fall; einer ohne ist eine Frage, die
niemand mehr stellt.** Eine eigene Probe hält fest, dass die Begründung da ist.

### Die Ratsche ist die eigentliche Sicherheitsprobe

**Nicht, dass die Zone das Richtige erlaubt — sondern dass kein Pfad vom Import zu ihr führt.**

Heute ist das trivial wahr, weil sie niemand ruft. **Das ist kein Zustand, der von selbst hält:**
beim Bau von HERAUSNEHMEN wird jemand versucht sein, einen Aufruf aus dem Import-Weg hinzuzufügen —
dieselbe Bequemlichkeit, die den Präfix-Riegel umginge. **Dann wird die Probe rot, und niemand muss
sich erinnern.**

Mit Positivkontrolle: der Kommentar-Maskierer des Hauses wird an einem erfundenen Aufruf geprüft,
damit die Ratsche nicht schweigt, weil die Suche blind ist.

---

## Was offen bleibt

- **Die Allow-Liste selbst.** Welche nativen Bezeichner das eigene Modul reklamieren muss, ist
  nicht erhoben — sie folgt aus dem Erzeuger, den es noch nicht gibt. **Die Zone verlangt sie vom
  Aufrufer und erfindet keine.**
- **Die Whitelist-Asymmetrie, nebenbei gemessen:** `_TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL` nennt
  sich im Kommentar „wörtlicher Spiegel der Feld-Ebene" und ist keiner — `verborgenWenn` und
  `marken` fehlen dort, obwohl native Unterfelder sie tragen. **Eigener Posten, hier nicht
  behoben.**
- **Beschriftungen sind keine Feld-Eigenschaften.** `label`/`hint` nativer Felder stehen nicht am
  Objekt, sondern kommen zur Laufzeit aus dem Textsatz. Ein nativer Reassert liefert Struktur plus
  einen begleitenden Textsatz-Eintrag — **ungemessen, ob das für den allgemeinen Weg trägt.**
- **Die Textsatz-Sperre** (`sprache: 'de'` gilt als reserviert) bleibt unberührt. Sie wird erst
  beim Herausnehmen zwingend.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
