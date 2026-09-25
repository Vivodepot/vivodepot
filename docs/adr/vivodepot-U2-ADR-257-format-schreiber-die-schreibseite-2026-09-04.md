# U2-ADR-257 · `FORMAT_SCHREIBER` — die Schreibseite der Format-Module

**Datum:** 04.09.2026
**Status:** Angenommen und umgesetzt — mit zwei ausdrücklich offen gelassenen Schreibern.
**Status heute:** gilt — `FORMAT_SCHREIBER` mit zwei Einträgen (`json@1`, `xml@1`),
`schreiber` als optionaler Schlüssel in `FORMAT_MODUL_SCHLUESSEL`/`formatModulPruefen`,
`mime`/`endung` am Schreiber statt am Kanal, `tests/u2-adr-257-format-schreiber.test.js` grün.
**Entscheidung:** Nummer vergeben.
**Bezug:** U2-ADR-146 (ein Kanal ist BESCHREIBUNG, niemals Code — dieselbe harte Grenze) ·
U2-ADR-151 (Kennungsform `<name>@<version>` und der Rückweg über `fruehereKennungen`) ·
U2-ADR-150 (ein unbekannter Fall wird BENANNT, nicht angeglichen — der Grund für die zwei
offen gelassenen Schreiber) · U2-ADR-255 (der vorige additive Zug an denselben vier Stellen)

---

## Kontext und Problem

`FORMAT_LESER` trägt seit dem 20.08.2026 (U2-ADR-151, F1/B1/B2) **vier** Leseformen:
`json@1`, `vcard-erste@1`, `xml@1`, `csv@1`. Ein Format-Modul nennt eine davon über `leser`,
aufgelöst durch `leserAufloesen()`.

Die Schreibseite war **eine Zeile**. `formatModulZuExportKanal()` endete fest auf:

```js
mime: 'application/json', endung: 'json',
baue: (opt) => { … JSON.stringify(…) }
```

**Vier Leser, ein Schreiber.** Ein angedocktes Format-Modul konnte jedes der vier Formate
LESEN und nur JSON SCHREIBEN. Das Gerüst wird vor v1 eingefroren; danach wäre die
Ausgabeseite für immer JSON, und die Zusage „Formate — Import UND Export — sind genauso
modular wie Sprachen, Rechtsräume und Branding" wäre nur für die halbe Strecke wahr.

## Entscheidung

**`FORMAT_SCHREIBER` neben `FORMAT_LESER`, mit denselben Regeln und denselben Grenzen.**

1. **Namentliche Wahl, kein Code aus dem Modul.** Das Modul nennt eine Kennung, der Kern hat
   die Funktion — wörtlich der Schnitt aus U2-ADR-146. Kein `eval`, kein Nachladen.
2. **Kennungsform und Auflösungsregel wie beim Leser:** `<name>@<version>`,
   `schreiberAufloesen()` löst **exakt** auf, `fruehereKennungen` ist der Rückweg, kein
   Fallback auf den Stamm (`json@9` fällt NICHT auf `json@1`).
3. **`schreiber` ist ein optionaler Modul-Schlüssel** in `FORMAT_MODUL_SCHLUESSEL`; eine
   unbekannte Kennung verwirft das ganze Bundle (Grund `schreiber`), wie bei `leser`.
4. **`mime` und `endung` stehen am Schreiber**, nicht mehr fest am Kanal.
5. **Zwei Schreiber, nicht vier** — s. „Was ausdrücklich NICHT gebaut wird".

### Rückwärtskompatibilität — die härteste Auflage, und wie sie belegt ist

**Fehlt `schreiber`, gilt `json@1`** (`FORMAT_SCHREIBER_STANDARD`). Jedes heute gültige
Ausgabe-Modul und jeder eingebaute Kanal verhält sich byte-identisch wie vorher.

Der Beleg ist **kein festgenagelter Erwartungswert**, sondern der Vergleich **zweier Kerne**:
`tests/u2-adr-257-format-schreiber.test.js`, Gruppe A, lädt den Kern von `4e3d7348` (dem
Stand vor diesem Zug) über `KERN_HTML_PATH`, baut in beiden Kernen dasselbe Depot und
dasselbe Bestandsmodul (ohne `schreiber`, mit verschachtelten Zielen und einem `alsListe`)
und vergleicht den erzeugten Text Byte für Byte — dazu `mime` und `endung`. Derselbe Weg wie
in `tests/docx-streichung-gegenprobe.test.js`. Eine zweite Probe hält fest, dass der alte
Kern den Schlüssel gar nicht kennt — sonst mäße der Vergleich nichts.

### Die eine bewusste Abweichung vom Spiegel: `schreiber` ist NIE Pflicht

`leser` ist bei `richtung: 'import'` Pflicht. `schreiber` ist bei `richtung: 'export'` **nicht**
Pflicht, und das ist keine Nachlässigkeit:

- Für das **Lesen** eines fremden Textes gibt es keinen naheliegenden Standardfall.
- Für das **Schreiben** gibt es einen, und er war bereits in Kraft: bis heute schrieb jeder
  Ausgabe-Kanal aus einem Modul JSON, ohne dass irgendwo ein Name dafür stand. Eine Pflicht
  hier nähme jedem heute gültigen Ausgabe-Modul beim nächsten Andocken die Gültigkeit — genau
  der Bruch an einer Datei, die allein bei der Bürgerin liegt, gegen den U2-ADR-151 gebaut ist.

Zwei Folgen davon stehen im Code: `kanal.schreiber` trägt **immer** eine Kennung (nie `null`,
anders als `kanal.leser`), damit die Ersetzungsregel an EINER Stelle wohnt; und ein
`schreiber` an einem Import-Modul bleibt zulässig und folgenlos — spiegelbildlich zu `leser`
am Ausgabe-Modul, die Prüfung wird weiter, nicht enger.

`fruehereKennungen` ist bei beiden Einträgen **leer**, und auch das ist eine Aussage: es gab
nie einen unversionierten `schreiber`-Namen, den ein Bürgerdepot mit sich trüge. `schreiber:
'json'` wird darum BENANNT abgewiesen, nicht stillschweigend als `json@1` gelesen.

### `xml@1` — die Konvention ist umgekehrt, nicht erfunden

Die Lesekonvention steht ausgeschrieben im Kommentar über `'xml@1'` in `FORMAT_LESER`. Der
Schreiber liest jede ihrer Regeln von hinten:

| Leser (`_xmlKnotenAlsObjekt`) | Schreiber (`_xmlElementSchreiben`) |
|---|---|
| Elementname ohne Präfix, adressiert über den Pfad | jeder Schlüssel wird ein Kindelement, jede Pfadstufe eine Verschachtelungsstufe |
| mehrere gleichnamige Kinder → Array | ein Array schreibt dasselbe Element mehrfach, in Eintragsreihenfolge |
| Attribute unter `@name` | ein Schlüssel mit `@` wird ein Attribut |
| gemischter Text unter `#text` | wird der Textinhalt |
| Wurzelname unter `#name` | die Wurzel kommt aus `quelle` (s. u.), `#name` wird ebenfalls akzeptiert |

**Namensräume — ausdrücklich gesagt, nicht stillschweigend getan.** Der Leser ist agnostisch
(zwei Elemente gleichen lokalen Namens aus verschiedenen Namensräumen sind dasselbe). **Der
Schreiber setzt weder ein Präfix noch ein `xmlns`.** Das ist zulässiges XML und die einzige
Wahl, die keine Information erfindet, die im Modul nicht steht: ein Modul, das `quelle:
'Document'` sagt, sagt nichts über einen Namensraum, und ein hier gesetztes `xmlns` wäre eine
Behauptung des Kerns über ein fremdes Schema. Wer eine namensraumtreue XÖV-/CAMT-Datei
braucht, braucht einen eigenen Parser-Weg — die Grenze zwischen Werkzeug und Plattform
(A298), kein Mangel dieser Zeile. Eine Probe misst das am erzeugten Text, nicht am Vorsatz.

**Die Wurzel, und die echte Asymmetrie dahinter.** XML hat genau ein Wurzelelement; der Leser
gibt dessen Namen nicht als Schlüssel zurück, sondern unter `#name` — er *betritt* die Wurzel
also von selbst. Auf der Schreibseite muss sie erst entstehen. Sie kommt aus `quelle`, dem
Umschlag, den `_formatUnterPfad` ohnehin baut: `quelle: 'Document'` ergibt `{ Document: {…} }`,
und dieses eine Top-Level-Objekt IST das Wurzelelement. Folge, und sie steht auch im Code:
**dieselbe Datei liest ein Import-Modul mit demselben `quelle` nur, wenn es zusätzlich
`quelleWurzelFallback: true` trägt.** Ein Modul mit beiden Feldern trägt in beide Richtungen
mit denselben `ziel`-Pfaden; ein Rundlauf-Test belegt es.

**Was zur PRÜFZEIT abgewiesen wird, nicht beim Klick** (`kanalGrund` am Schreiber-Eintrag,
gerufen von `formatModulPruefen`, nur für `richtung: 'export'`):

- ein Ausgabe-Modul mit `xml@1` **ohne `quelle`** → `schreiber-xml-ohne-wurzel`
- eine `quelle`, deren Pfadstufen keine gültigen XML-Namen sind → `schreiber-xml-wurzelname`
  (auch ein Doppelpunkt fällt: der Leser kennt nur lokale Namen)
- ein `ziel` mit demselben Mangel → `schreiber-xml-zielname`. `@attribut` und `#text` sind
  erlaubt, aber nur als LETZTE Stufe — genau wie der Leser den Baum aufbaut.

Zurückgewiesen wird jeweils **das ganze Modul**, nicht die einzelne Zuordnung: eine Datei, die
kein Parser liest, ist kein lokaler Verlust, und ein still fehlendes Element in einer sonst
gültigen Datei sähe für die Bürgerin wie ein gelungener Export aus.

**Die eine Stelle, an der dieser Schreiber etwas entfernt:** Steuerzeichen, die XML 1.0 in
keiner Form zulässt (auch nicht als Entität), fallen aus dem Text. Sie könnten nur über einen
Feldwert hereinkommen; bliebe eines stehen, wäre die ganze Datei unlesbar. Ein Zeichen zu
verlieren ist der kleinere Verlust — und er ist benannt statt still. Der Maskierungssatz
selbst (`&`, `<`, `>`, `"`) ist von `_erbscheinXmlEscape` übernommen, der einzigen anderen
XML-schreibenden Stelle im Kern.

## Was ausdrücklich NICHT gebaut wird

**`csv@1` und `vcard-erste@1` haben keinen Schreiber.** Nicht aus Zeitmangel: ihre
Schreibseite ließe sich nicht aus der Leseseite UMKEHREN, sondern nur ERFINDEN — und eine
erfundene Konvention im eingefrorenen Kern ist teurer als eine benannte Lücke.

**`csv@1`:**

- Der Leser **erkennt** sein Trennzeichen (`_csvTrennzeichen`, nach Häufigkeit in der
  Kopfzeile). Ein Schreiber müsste eines **wählen** — das ist keine Umkehrung.
- Das Zeilenende ist beim Lesen offen (`\n`, `\r\n`, `\r`) und beim Schreiben eine Entscheidung.
- **Der Ausschlag:** der Exportweg liefert regelmäßig **verschachtelte Objekte** (der
  `quelle`-Umschlag; Ziele mit Punkt, seit `_formatPfadSchreiben`) und **Arrays** (`alsListe`).
  Der Leser erzeugt beides nie, und eine CSV-Zelle hat für beides keine Darstellung. Wie ein
  Array oder ein Teilbaum zur Zelle wird, ist eine offene Produktfrage, keine Umkehrung.
- (Die Anführungszeichen-Regel selbst wäre umkehrbar: RFC 4180, verdoppeltes `""`, wörtlich
  die Umkehrung von `_csvZerlegen`. Sie allein trägt den Schreiber nicht.)

**`vcard-erste@1`:**

- Der Leser ist versionsagnostisch; ein Schreiber muss `VERSION:` setzen. Der Kern selbst
  schreibt an einer Stelle `3.0` und an zwei Stellen `4.0` — es gibt also keine EINE geerbte
  Konvention, die man übernehmen könnte.
- `FN` ist nach RFC 6350 Pflicht. Fehlt der Wert, müsste der Schreiber einen erfinden
  (`vcardIdentitaet()` tut genau das mit „Vivodepot-Kontakt" — für einen fest verdrahteten
  Identitäts-Export vertretbar, für einen generischen Schreiber eine Erfindung).
- Ein `ziel` außerhalb der sieben Namen, die `parseVCards` erzeugt
  (`fn/vorname/nachname/tel/email/adr/bday/note`), hätte gar keine vCard-Eigenschaft — es
  bliebe still liegen oder bekäme ein erfundenes `X-`-Feld.
- `adr` ist beim Lesen ein Array aus sieben Komponenten; ein Modul liefert Strings.
- Und derselbe Ausschlag wie bei CSV: vCard ist flach, der `quelle`-Umschlag ist es nicht.

**Die Lücke steht im Code, nicht nur hier:** `_FORMAT_SCHREIBER_LUECKEN` trägt je einen
Grund, und ein Wächter (`tests/u2-adr-257-format-schreiber.test.js`, Gruppe E) hält fest, dass
**jede** Leseform entweder einen Schreiber ODER eine begründete Lücke hat — nie beides, nie
keines. Kommt ein fünfter Leser dazu, meldet sich diese Probe.

## Bekannte Drift, nicht in diesem Zug behoben

`vivodepot-template-generator.html` führt eine **Kopie** von `FORMAT_MODUL_SCHLUESSEL` und
`FORMAT_LESER_BEKANNT`. Diese Kopie hinkt bereits vor diesem Zug hinterher (`rechtsraum` aus
U2-ADR-255 fehlt dort) und ist von keinem Wächter gedeckt. `schreiber` wurde dort **bewusst
nicht** ergänzt: ohne ein gespiegeltes `FORMAT_SCHREIBER_BEKANNT` würde der Generator eine
unbekannte Kennung stillschweigend durchlassen, die der Kern beim Andocken abweist — das wäre
schlechter als der heutige, laute `unbekannt`-Hinweis. Die Kopie als Ganzes gehört
nachgezogen oder aufgelöst; das ist ein eigener Posten, kein Nebenzug dieses ADRs.

## Konsequenzen

- Ein Format-Modul kann ab jetzt XML **schreiben**, nicht nur lesen — mit `mime`
  `application/xml` und der Endung `.xml`, ohne zweite Fallunterscheidung irgendwo.
- Das Gerüst kann eingefroren werden, ohne die Ausgabeseite auf JSON festzulegen: ein fünfter
  Schreiber ist ab jetzt ein Tabelleneintrag, keine Umbauarbeit.
- Zwei Formen bleiben ausdrücklich offen. Wer einen davon baut, beantwortet in seiner ADR die
  hier benannte Frage und streicht den Eintrag aus `_FORMAT_SCHREIBER_LUECKEN`.
