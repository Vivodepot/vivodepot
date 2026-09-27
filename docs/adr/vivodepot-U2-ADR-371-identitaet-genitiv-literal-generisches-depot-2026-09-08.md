# U2-ADR-371 · Zwei gebeugte Literale — generisches „Depot" statt Marke, nicht `{marke}`

**Datum:** 08.09.2026
**Status:** gebaut, 145/145 gegengeprüfte Bestandsproben grün, eigener Rot-Beweis nicht nötig
(Begründung unten), Vollsuite ausstehend (Konvoi-Gate)
**Status heute:** gilt
**Auftrag:** Nachtrag zum Branding-Zug (U2-ADR-362): Fund aus der E2E-Abnahme
`marke-e2e-abnahme.spec.js` (Konvoi 7, `f4484225`) — zwei Literale in `identitaet.einfuehrungstext`
und `identitaet.profilfoto.hint` tragen die Marke gebeugt („Ihres Vivodepots", Genitiv-s) und
blieben unter fremdem Branding stehen.
**Bezug:** U2-ADR-362 (Branding anschließen, `{marke}`-Interceptor) · U2-ADR-322 (jeder Träger
löst auf — der Wächter, der die architektonische Grenze dieses Zuges beweist) · U2-ADR-320/291
(eingebettetes Bündel, Struktur/Sprache/Recht/Marke-Schnitt)

---

## 1 · Der Fund

Zwei Textsatz-Kennungen nennen die Marke wörtlich, gebeugt, in Bürgerin-facing Prosa:

```
'identitaet.einfuehrungstext': 'Name, Foto, Kontakt — das Deckblatt Ihres Vivodepots.'
'identitaet.profilfoto.hint':  'Ein Foto als Deckblatt Ihres Vivodepots — aus Ihren
                                 Dokumenten wählen oder direkt hochladen.'
```

Unter einem fremden Branding-Modul bliebe „Vivodepots" stehen — derselbe Fehlerklasse wie der
in Konvoi 7 behobene `exportBereichPdfUntertitel` (dort: `{marke}` selbst wurde gebeugt). Hier ist
es kein gebeugter *Platzhalter* — der neue Wächter `[Marke] kein {marke}-Platzhalter wird gebeugt`
(`tests/marke-anzeige-anwenden.test.js`, Konvoi 7) fängt genau das —, sondern ein gebeugtes
*Literal*: die zwei Sätze wurden in der 238-Nennungen-Messung (U2-ADR-362) nie auf `{marke}`
umgestellt. Der Wächter kann sie nicht sehen, weil sie nie einen Platzhalter trugen.

## 2 · Warum `{marke}s` NICHT die richtige Antwort ist

Der naheliegende Fix — umformulieren, dann `{marke}` einsetzen — greift hier nicht, aus zwei
unabhängigen Gründen, nicht nur dem grammatischen:

**Grund A, grammatisch:** `{marke}` darf nie selbst gebeugt werden (die Lektion aus Fund 1 von
Konvoi 7) — ein fremder Name wie „Test-Institut Fremdmarke" verträgt kein angehängtes Genitiv-s.
Jede Formulierung, die den Platzhalter selbst beugt, ist ein Rückfall in genau den Fehler, den
Konvoi 7 gerade behoben hat.

**Grund B, architektonisch, unabhängig von A:** `identitaet.*` gehört zu den 22 beim Boot
gebackenen Kennungen aus U2-ADR-362 Abschnitt 5a. `_textsatzAufSektorenAnwenden` bäckt den Text
über `textLesen()` EINMALIG in ein statisches Objektfeld (`SEKTOREN`), nicht bei jedem Zugriff neu
wie der `STRINGS`-Proxy. `tests/u2-adr-322-jeder-traeger-loest-auf.test.js` (Ratsche gegen einen
eingefrorenen Rückstand) vergleicht den LIVE-gebackenen Wert gegen die Werte-Menge des ROHEN
`TEXTSATZ_EINGEBAUT` — träge dort ein `{marke}` als roher Wert, während der gebackene Wert bereits
aufgelöst ist, weicht er von jedem Eintrag der rohen Werte-Menge ab und fällt der Ratsche als
„neuer ungedeckter Text" auf. Ein `{marke}` in diesen zwei Kennungen hätte also selbst OHNE
Grammatik-Fehler die Ratsche gerissen — geprüft, nicht behauptet: ein Testlauf mit testweise
eingesetztem `{marke}` (ohne Genitiv-Suffix) an beiden Stellen brach exakt dort.

**Die Konsequenz:** diese zwei Kennungen gehören nicht zu den lösbaren 52 aus U2-ADR-362 — sie
gehören zur selben 22er-Ausschlussklasse, nur dass Grund B allein schon reicht, unabhängig vom
Genitiv.

## 3 · Der tatsächliche Fix — die Marke ganz aus dem Satz nehmen

Beide Sätze nennen „Vivodepot" nicht als Eigenname, sondern als Synonym für „das eigene Depot" —
Wechsle die Marke, was bleibt, ist immer noch ein Depot (derselbe Prüfstein wie in
`tools/buergermodul-schnitt.js`: „Wechsle die Sprache/den Rechtsraum, was sich ändert/bleibt").
Das native Vokabular kennt „Depot" bereits als markenunabhängiges Substantiv — 879 Vorkommen im
Kern, davon zwei bereits in genau derselben Genitiv-Form (`strings:pwWechselKopienTitel.text`,
`strings:mappeDepotGroesse.text`: „Ihres Depots"). Beide Sätze werden auf diese bestehende Form
umgestellt, ohne jeden Bezug auf die Marke:

```
'Name, Foto, Kontakt — das Deckblatt Ihres Depots.'
'Ein Foto als Deckblatt Ihres Depots — aus Ihren Dokumenten wählen oder direkt hochladen.'
```

Damit entfällt die Marken-Abhängigkeit vollständig — kein `{marke}`, kein Interceptor, keine
Backing-Reihenfolge zu beachten. Dieselbe Behandlung erhält die EN-Quelle
(`tools/textsatz-en-daten.js`, „your Vivodepot" → „your Depot", generisches „Depot" bereits zehnmal
in `textsatz-en-vollabdeckung-daten.js` belegt) und die Lese-App-Zweitfassung
(`vivodepot-lesen.html:2103/2167`, identischer Wortlaut, zweiter Ort — regelmäßig vergessen,
diesmal nicht).

## 4 · Nachgezogene Träger

Ein Wortlaut, vier Träger, alle vier angepasst:

- `vivodepot.html` (DE, Kern-Quelle, zwei Kennungen)
- `tools/textsatz-en-daten.js` (EN-Quelle) → `tools/textsatz-de-modul.json`/
  `tools/textsatz-en-modul.json` neu erzeugt (offizielle Generatoren, nicht von Hand)
- `vivodepot-lesen.html` (zweiter Ort, eigene Objektliteral-Kopie)
- Fünf Proben, die den alten Wortlaut wörtlich prüften, auf den neuen umgestellt:
  `tests/identitaet-sektor.test.js` (zwei Stellen), `tests/sektor-maschine-erweiterungen.test.js`
  (zwei Stellen, synthetisches Testfeld — kein echter Träger, aber derselbe Wortlaut geliehen),
  `tests/fixtures/sektoren-EINGEFROREN-nativer-bestand-debcb406.json` (der eingefrorene
  Golden-Master aus U2-ADR-320 — geändert, weil er den WERT einer bestehenden Feldstelle hält,
  nicht weil der Massstab selbst in Frage steht; die Struktur-Identität, die er eigentlich bewacht,
  bleibt unberührt)
- Zwei Aufnahme-Fixturen neu geschrieben (`RENDER_AUFNAHME_NEU=1`, kein Handedit):
  `tests/fixtures/render-aufnahme/{leer,befuellt}__identitaet.html`

**Bewusst NICHT angefasst:** `tools/buergermodul/vd-de-sprache.json` (Ausgabe von
`tools/buergermodul-schnitt.js`, aus dem laufenden Kern erzeugt). Ein Regenerieren hätte
zusätzlich unabhängige, bereits vorher bestehende Drift nachgezogen (zehn neue `vermoegen.*`/
`verwaltung.*`-Kennungen, die eine andere Sitzung seit dem letzten Schnitt ergänzt hat) — außerhalb
dieses Zuges. Geprüft, dass das folgenlos ist: `tests/buergermodul-ab-parity-u2-adr-299.test.js`
Zeile 105 belegt ausdrücklich, dass das Bündel selbst KEIN `label`/keinen Text trägt — die
Beschriftung kommt beim Andocken erneut aus dem Textsatz-Lauf (`_bereichAusBuendelErzeugen` →
`_textsatzAufSektorenAnwenden`), nie aus der Bündel-Datei. Die Datei bleibt darum ohne
Funktionsfolge veraltet, bis ein eigener Zug den gesamten Rückstand regeneriert.

## 5 · Die Rückfrage: weitere gebeugte Literale in der 141er-Klassifikation?

Geprüft, nicht angenommen: `grep -no "Vivodepot[a-zäöü]\+"` über `vivodepot.html`,
`vivodepot-lesen.html`, `vivodepot-template-generator.html` — jede gebeugte Form von „Vivodepot"
im gesamten Bestand, nicht nur die gemeldeten zwei. Zwölf Treffer insgesamt, alle „Vivodepots"
(Genitiv). **Korrektur (08.09.2026, Gegenprobe im Zug von U2-ADR-374):** die
Erstfassung dieses Abschnitts zählte physische Fundstellen und Kennungen durcheinander („Zwei" /
„Eine" / „Neun" — Summe zufällig ebenfalls 12, aber jede Einzelzahl falsch). Die richtige
Aufschlüsselung, gegen `git show 0b77cdec` nachgemessen:

- **Vier** physische Vorkommen der hier behandelten zwei Kennungen (`identitaet.einfuehrungstext`
  + `.profilfoto.hint`, je einmal in `vivodepot.html` UND `vivodepot-lesen.html` — zwei Kennungen,
  zwei Dateien, vier Zeilen: `vivodepot.html:7332/7393`, `vivodepot-lesen.html:2103/2167`).
- **Drei** physische Vorkommen EINER weiteren echten Bürgerin-Kennung,
  `dok:erbschein-vorbereitung#1/0.texte[0]` („Vivodepots Zusammenstellung der zugrundeliegenden
  Depot-Angaben") — dieselbe Kennung stand schon bei `0b77cdec` an drei Orten: der Textsatz-Kennung
  selbst (`vivodepot.html:10445`), einem zweiten, vollständigen Abdruck im eingebetteten
  `BUERGERMODUL_BUENDEL`-JSON (`vivodepot.html:23283`) und der Lese-App-Zweitfassung
  (`vivodepot-lesen.html:1605`). Bereits Teil der 22 Boot-Bake-Ausschlüsse aus U2-ADR-362
  Abschnitt 5a (die vier `dok:…texte[0]`-Nachtragskennungen). Grund B (Architektur) greift hier
  unabhängig vom Genitiv bereits; eine Wortlaut-Korrektur wie in Abschnitt 3 wäre möglich, gehört
  aber zu den amtsnahen Dokument-Wortlauten (BMJ-Vorbereitung) und damit in einen eigenen, separat
  freizugebenden Zug — hier nicht mitgezogen.
- **Fünf** reine Code-Kommentare (`vivodepot.html:707/12393/25751/25762/41249`), keine
  Bürgerin-facing Textsatz-Kennung — keine Handlung nötig.

(4 + 3 + 5 = 12.)

**Korrektur der Zahl aus U2-ADR-362:** die dort genannten „22 baked-at-boot-Ausschlüsse, für die
ein Branding-Modul den Text nie erreicht" reduzieren sich um zwei — `identitaet.einfuehrungstext`
und `identitaet.profilfoto.hint` sind ab diesem Zug gelöst (nicht über den Interceptor, sondern
durch Wegnahme der Markenabhängigkeit). **20 bleiben echt ausgeschlossen**, nicht 22. Die „52 echte
{marke}-Kennungen" aus U2-ADR-362 ändern sich NICHT — diese zwei gehörten nie zu den 52, sie lösen
das Problem auf einem dritten, in U2-ADR-362 noch nicht benannten Weg (Wegnahme statt Auflösung).

## 6 · Die Rückfrage: ein zweiter Wächter gegen gebeugte Literale?

**Empfehlung: nein, nicht bauen — mit Begründung, nicht nur Behauptung.**

Ein Wächter, der `Vivodepot[a-zäöü]+` (jede gebeugte/zusammengesetzte Form) im Bestand aufspürt,
träfe in der Probe oben NEUN weitere, legitime Treffer, die kein Bug sind: Code-Kommentare,
technische Bezeichner (`VivodepotProviderCredential`, `.vivodepot`-Dateiendung,
`parseVivodepotBeta`), Datei-Basisnamen (`Vivodepot_Gesundheit_IPS.json`) — jeder davon aus
U2-ADR-362 Abschnitt 5/5a bereits bewusst als Folgeposten oder Architektur-Grenze ausgewiesen,
keiner ein neuer Fund. Ein Wächter bräuchte eine Erlaubnisliste, um diese Treffer stumm zu
schalten — und genau diese Erlaubnisliste ist der Punkt, an dem der Wächter nichts mehr bewacht:
ein NEUES gebeugtes Literal in echter Bürgerin-Prosa sieht für den Wächter identisch aus wie ein
technischer Bezeichner, und nur ein Mensch unterscheidet „das ist deutsche Grammatik in einem
Satz" von „das ist ein zusammengesetzter Code-Bezeichner" — mechanisch nicht trennbar, ohne bei
jedem neuen Treffer erneut nachzusehen. Ein Wächter mit wachsender, ungeprüfter Erlaubnisliste
verspricht Deckung, die er nicht hält (dieselbe Falle wie in den bereits bekannten
Wächter-Fallen des Hauses).

**Was stattdessen trägt:** die manuelle Prüfung oben (`grep -no`, drei Dateien, unter einer
Minute) fand ALLE zwölf Treffer erschöpfend, inklusive der neun harmlosen. Das ist kein
Argument gegen jede Automatisierung, sondern dafür, diesen Griff an der richtigen Stelle zu
wiederholen: bei jedem künftigen Branding-Zug (wie hier, wie bei Konvoi 7) denselben Befehl gegen
den dann aktuellen Bestand laufen zu lassen, statt einen ständig mitlaufenden, aber blinden
zweiten Wächter zu unterhalten.

## 7 · Proben

145 gegengeprüfte Bestandsproben grün, geführt gegen den vollständigen Betroffenheitskreis:
`tests/identitaet-sektor.test.js`, `tests/sektor-maschine-erweiterungen.test.js`,
`tests/buergermodul-bereich-erzeugen-u2-adr-319.test.js`, `tests/fixture-felder-im-modell.test.js`,
`tests/marke-anzeige-anwenden.test.js`, `tests/u2-adr-322-jeder-traeger-loest-auf.test.js`,
`tests/pre-depot-en-sync.test.js`, `tests/textsatz-mechanismus.test.js`,
`tests/erzeuger-deckung-sprache-rechtsraum-marke.test.js`,
`tests/buergermodul-ab-parity-u2-adr-299.test.js`. Zusätzlich `tools/textsatz-en-platzhalter-pruefen.js`
(Exit 0) und `tests/render-charakterisierung.test.js` (9/9, `RENDER_AUFNAHME_NEU=1` zum
Neuschreiben der zwei betroffenen Aufnahmen). SCHALEN_STAND v623 → v624.

**Kein eigener Rot-Beweis:** die zwei Sätze tragen nach diesem Zug keinerlei Markenbezug mehr —
es gibt nichts, das unter fremdem Branding divergieren könnte, also keinen Rot-Zustand, den eine
neue Probe herstellen müsste. Die fünf angepassten Bestandsproben (Abschnitt 4) sind selbst der
Beweis: sie hielten den ALTEN Wortlaut fest und wären ohne den Fix weiterhin grün gewesen — genau
die Lücke, die dieser Zug schließt, nicht durch einen neuen Wächter, sondern durch die Wortwahl
selbst.
