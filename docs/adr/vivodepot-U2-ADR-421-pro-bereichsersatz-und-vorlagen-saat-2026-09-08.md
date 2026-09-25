# U2-ADR-421 (Nummer beim Landen zu bestätigen) · VD Pro ersetzt statt ergänzt

**Datum:** 08.09.2026
**Status heute:** gilt
**Auftrag:** „Pro-Produkt ersetzt statt ergänzt"
**Bezug:** U2-ADR-348 (bereichsErsatz, Riegel = Objekt-Identität), U2-ADR-387 (Ab-Werk-Rangfolge,
Marker-Regionen)

**Umnummeriert (19.09.2026):** stand ursprünglich (08.09.2026) unter U2-ADR-398 — dieselbe Nummer war
unabhängig auch an „Das gekündigte Zimmer: eingebackene Struktur reist als Mitschrift mit der Datei"
vergeben, echte Kollision, kein Nachtrag und keine Variante. Die Verweise im Code nannten diese ADR
darum teils „das zweite U2-ADR-398" oder „U2-ADR-398-Nachtrag"; sie ist eine eigene Entscheidung, und wo
ein Kommentar sie heute „U2-ADR-421-Nachtrag" nennt, meint er diese Datei. Entscheidung, welche der
beiden Dateien wandert: die mit dem vorläufigen Nummernvermerk und den weniger tragenden Verweisen
(83 Zeilen in 26 Dateien gegen 96 Zeilen in 38 Dateien, von Hand gelesen und zugeordnet, nicht per
Stichwort geraten). Der Inhalt dieser ADR ist unverändert, nur die Nummer, ihre `herkunft:`-Zeilen und
die Testtitel, die sie tragen, sind nachgezogen.

---

## 1 · Der Befund

Das Geschäftsführerin-Notfallmappe-Bereichsmodul für VD Pro lief bislang über den normalen
`bereiche`-Weg (`bereichsModulPruefen`/`_bereichsModuleAusDepotAnmelden`, gebacken über
`AB_WERK_BEREICH_QUELLEN`): die sechs `pro-*`-Sektoren kamen NEBEN die dreizehn nativen. Wer
VD Pro öffnet, sah erst alle privaten Bereiche und darunter die Pro-Bereiche.
Entschieden: Pro ERSETZT die privaten Bereiche, es ergänzt sie nicht. Ausgenommen ist der
eingebaute Bereich `identity`: Pro trägt Name, Geburtsdatum, Anschrift und Erreichbarkeit wie
Privat (§6).

Der Ersetz-Mechanismus existiert bereits (U2-ADR-348, `bereichsErsatz`), wird aber ausschließlich
von `buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL)` ausgelöst — Riegel: Objekt-Identität
(`buendel === BUERGERMODUL_BUENDEL`), keine Feld-Prüfung. `BUERGERMODUL_BUENDEL` selbst liegt
außerhalb der drei bestehenden Ab-Werk-Marker-Regionen (die Backen je Produkt befüllt) —
`produkt-konfektionieren.js` konnte `bereichsErsatz` bislang nicht produktspezifisch setzen.

## 2 · Die Entscheidung — vierte Region, andere Bauform

`AB_WERK_BEREICHS_ERSATZ` liegt **direkt nach** der `BUERGERMODUL_BUENDEL`-Konstante (nicht
innerhalb ihres JSON.parse-String-Literals — ein Marker-Kommentar kann darin nicht stehen, und
ein Splice in eine 200-KB-Zeile ist eine Bauform, die dieser Konvoi bewusst vermeidet) und setzt
bei Bedarf `BUERGERMODUL_BUENDEL.bereichsErsatz = {…}` als **Zuweisung**, nicht als
`const NAME = …`-Deklaration wie die drei bestehenden Regionen. Objekt-Identität bleibt dadurch
bauartbedingt erhalten — dasselbe Objekt, nur eine Eigenschaft mehr. Der Riegel aus U2-ADR-348 §2
wird nicht aufgeweicht, sondern gar nicht berührt: die Zuweisung läuft vor
`buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL)` (Boot-Zeile), am selben Objekt.

`produkt-konfektionieren.js`s `AB_WERK_REGIONEN` trägt jetzt ein `bauform`-Feld (`'const'`
Default, `'zuweisung'` für diese Region mit `ziel: 'BUERGERMODUL_BUENDEL.bereichsErsatz'`) —
`_regionNutzlastSetzen`/`_regionIstReineNutzlast`/`_ohneAbWerkNutzlast` verzweigen darüber,
derselbe Nutzlast-Riegel („nur ein Statement, keine Logik") gilt für beide Bauformen.

`gerüstByteGleich()` prüft die neue Region mit — sie ist Teil von `AB_WERK_REGIONEN`, derselbe
Lauf, keine Extra-Zeile nötig.

## 3 · Zweiter, unabhängiger Baustein — die achte Ab-Werk-Saat

Die 54 echten Feldinhalte für Pro (`tools/betriebssatz-inhalte.js`, IHK-Übergabedokumente/
Kammerveröffentlichungen) erreichen einen Sektor nur über `data.feldDefinitionen[]`, gefüllt vom
Vorlagen-Weg (`_templateFelderUebersetzen`). `AB_WERK_VORLAGEN_QUELLEN` (achte Ab-Werk-Region,
wörtlicher Spiegel von `AB_WERK_BEREICH_QUELLEN` in Marker-Form) backt sie als
`{modulTyp:'vorlage', felder:[…]}`-Einträge — erzeugt, nicht getippt
(`tools/pro-vorlage-ab-werk-erzeugen.js` liest `FELDER_DE`/`FELDER_EN` und schreibt
`tests/fixtures/pro-geschaeftsfuehrerin-notfallmappe-vorlage-{de,en}.json`).

**Die Pro-Produkte backen diese Vorlage nicht mehr** (`vorlagenPfad: null` in
`tools/lib/vier-produkte.js`, die Rezepte tragen keine `templates`). Die Felder stehen bereits im
Bereichsersatz; die zusätzliche Saat schrieb dieselben Felder ein zweites Mal als
`feldDefinitionen`, im englischen Produkt unter englischen Kennungen, und doppelte damit
Abschnitte. Der Mechanismus `_abWerkVorlagenInsDepot` bleibt für Produkte, die eine Vorlage
backen. Eine Datei, die noch mit der Vorlage angelegt ist, übernimmt beim Öffnen
(`_vorlagenFelderInBereichUebernehmen`) ihre Werte in die leeren Bereichsfelder, nichts wird gelöscht.
Die Zuordnung der Kennungen kommt aus einer eingefrorenen Tabelle, nicht aus der Position der Felder:
eine Paarung über die Position vertauschte still zwei gleichartige Felder, sobald ihre Reihenfolge
in der Datei eine andere war. Die Tabelle erzeugt `tools/pro-vorlage-en-kennungen-erzeugen.js` einmal
aus den ausgelieferten Fassungen der zwei Vorlagen, deren SHA-256 dort festgehalten ist; sie reist in
der eingebackenen Region `AB_WERK_BEREICHE_BEKANNT` in jedes Produkt, nie aus der Datei. Eine
Kennung, die die Tabelle nicht kennt, wird nicht geraten: Definition und Wert bleiben stehen. Fehlt
das Ziel, weicht der Typ oder ein Unterfeld-Typ ab, bleibt das Feld ebenso stehen. Der Grund steht
jeweils in `VORLAGEN_UEBERNAHME_BEFUND`. Die übernommenen Definitionen ziehen nach
`feldDefinitionenUebernommen`.

**Grenzziehung (08.09.2026 — e2 baut zeitgleich an derselben Funktion):** `depotAnlegen()`
gehört e2. Dieser Zweig definiert genau eine Funktion, `_abWerkVorlagenInsDepot(d)` — Name fest,
schreibt die übersetzten Felder additiv in `d.feldDefinitionen[]`/`d.situationFeldDefinitionen[]`
— und ruft sie **nirgends selbst auf**. Der Verteiler `_abWerkStrukturInsDepot(d)` und seine
Verdrahtung in `depotAnlegen()` (hinter einem `typeof`-Riegel) sind e2s Zug, in einem anderen
Zweig, zusammengeführt erst im Konvoi.

**Reihenfolge ist Bedingung:** ein Feld referenziert seinen Sektor (`_bereichZuSektorId` schlägt
in `SEKTOR_BY_ID` nach) — läuft die Vorlagen-Saat vor der Bereichs-Saat, verwirft
`_templateFeldZuModell` jedes Feld mit `grund:'bereich'`. Eigener Rot-Beweis dafür in den
Proben.

**Struktur gehört zur Datei, nicht zum Programm** (wörtlich, 08.09.2026 nacht: „wenn
man das Zimmer gekündigt hat, ist sie ganz verschlossen" — verworfen): anders als Bereich/
Sprache/Logikmodul (Script-Globals neben `data`) schreibt diese Saat direkt in
`data.feldDefinitionen[]`. Eine in Pro angelegte Datei behält ihre 54 Felder auch nach dem Öffnen
in Privat — das ist die Zusicherung, kein Mangel, eigener grüner Beweis dafür (nicht nur eine
Ausnahme in einer Liste).

Drei Auflagen, alle geprüft:
1. Nur beim Anlegen — nicht Teil dieses Zweigs (kein Aufrufer hier), aber die Funktion selbst
   trägt keinen Seiteneffekt, der ein *wiederholtes* Schreiben unsicher machte.
2. Keine `ungeprueft`-Marke — strukturell unmöglich, `_templateFeldZuModell` setzt sie nie.
3. Export-Ausschluss — `feldDefinitionen` steht in `VOLLEXPORT_STRUKTURELL_SCHLUESSEL` (nur der
   interne Vollexport führt Struktur), die Bürger-Herausgeben-Familie
   (`empfaengerDateiHerausgeben`/`flowHerausgeben*`) hat keinen einzigen Treffer für
   `feldDefinitionen` — gemessen (Quelltext-Probe), nicht angenommen.

## 4 · Der Fund aus dem echten Browser — Sektions-Label

**Gemessen, nicht im Node-Kern-Harnisch sichtbar:** eine über `bereichsErsatz.neu` erzeugte
Sektion trägt kein `label` — `_bereichAusBuendelErzeugen` baut die Sektions-HÜLLE als
`{id: sek.id, felder: []}`, ohne `roh.sektionen[].label` zu übernehmen, und
`_textsatzAufSektorenAnwenden`/`_textsatzKnotenFuellen` füllt `label` NUR, wenn
`AB_WERK_TEXTSATZ_DE` bereits einen Schlüssel für diese (dem nativen Bestand unbekannte)
Sektions-ID kennt — für eine neue Pro-Sektion existiert der nie. `renderSektor()` bricht darum
mit `escapeHTML(sek.label)` → `undefined.replace(...)` — im echten Playwright-Klickweg
reproduziert, nicht vermutet (Stack-Trace endete in `escapeHTML`, aufgerufen aus `renderSektor`,
aus `betreteApp`).

**Erster Reparaturversuch, falsch — und selbst gefangen, nicht durchgerutscht:** ein Rückfall
DIREKT in der Sektions-Hüllen-Erzeugung (vor `_textsatzAufSektorenAnwenden([neu])`) setzte
`sek.label` sofort auf die Sektions-ID, wenn `roh` keins mitbrachte. **`_bereichAusBuendelErzeugen`
ist aber NICHT bereichsErsatz-exklusiv** — dieselbe Funktion erzeugt JEDEN Sektor, dessen
`SEKTOR_BY_ID`-Eintrag beim Aufruf noch fehlt, also beim allerersten Boot AUCH alle dreizehn
nativen (der Aufrufer läuft ohne aktives `bereichsErsatz` über die nativen `bereiche`, s. Kern-
Kommentar an `buergermodulBuendelAnwenden`). Ein Label-Rückfall VOR dem Textsatz-Lauf setzte
`sek.label` darum für JEDE native Sektion vorab auf ihre rohe ID — `_textsatzKnotenFuellen`s
`labelSchonInline`-Prüfung las das als „schon da" und übersprang die echte Übersetzung. Ergebnis:
alle 27 nativen Sektions-Beschriftungen fielen von „Person"/„Fahrzeuge und Führerschein"/… auf
ihre rohen IDs („person"/„fahrzeuge-fuehrerschein"/…) zurück — vom vollen Suite-Lauf gefangen
(`tests/textsatz-eingebaut-lesen-generator.test.js`, `tests/textsatz-mechanismus.test.js`,
`tests/identitaet-sektor.test.js`), NICHT von den gezielten Einzelläufen dieses Zweigs zuvor
(die nie `vivodepot-lesen.html` neu erzeugten). **Behoben, an der richtigen Stelle:** der
Rückfall steht jetzt NACH `_textsatzAufSektorenAnwenden([neu])` — nur was der Textsatz-Lauf
NICHT gefüllt hat (echte Lücke, kein Übersetzungsschlüssel vorhanden), bekommt die Sektions-ID.
Native Sektionen (Textsatz-Schlüssel existiert immer) bleiben unberührt; `bereichsErsatz.neu`-
Sektionen (Schlüssel existiert nie) bekommen weiterhin ihren Rückfall. Gegengeprüft gegen
`tools/build-textsatz-eingebaut-lesen.js --check`-Äquivalent (kein Drift mehr).

Dieser Fund betrifft den bestehenden U2-ADR-348-Mechanismus selbst (nicht nur diesen Zweig) — vor
diesem Auftrag hatte niemand einen `bereichsErsatz`-erzeugten Sektor tatsächlich gerendert.

**Derselbe Fund, eine Ebene tiefer, ebenfalls im echten Browser:** ein Feld ohne `label` in
`bereichsErsatz.neu[…].sektionen[…].felder[…]` (das Platzhalterfeld `notiz`, s. Abschnitt 2) ließ
`feldZeileHTML` an derselben Stelle brechen — `escapeHTML(feld.label)`. Anders als beim Sektor/
Sektion-Label gibt es hier KEINEN Kern-Rückfall (ein Feld ist Bündel-Rohform, wörtlich wie ein
natives Sektor-Feld) — behoben am Fixture selbst (`"label": "Notiz"`), mit eigenem Rot-Beweis.

## 5 · Die Regal-Karte braucht ein Merkmal — und `konfektion-nativ-vergleichen.test.js` musste
umgeschrieben werden, nicht nur repariert

**Gemessen:** ohne `merkmale: ["vorsorgeRegal"]` an einem der sechs `neu`-Sektoren rendert
`vorsorgeRegalHTML()` (U2-ADR-332s Regal) auf KEINER Pro-Seite — `bereichKann(sektorId,
'vorsorgeRegal')` prüft ein Merkmal, das `bereichsErsatz.neu`-Einträge (anders als
`bereichsModulPruefen`-Module) nicht automatisch bekommen. Das Pro-Logikmodul selbst registriert
zwar (SEKTOR_BY_ID kennt seinen Sektor), aber ohne das Merkmal hätte niemand seine Karte je zu
sehen bekommen — dieselbe Kategorie Fund wie die beiden Label-Lücken oben: „gebaut ist nicht
erreichbar". Behoben: `pro-vertretung-vollmachten` (der vom Logikmodul selbst benannte Heimat-
Sektor) trägt das Merkmal im Fixture.

**Ein weiterer, unabhängiger Fund beim Nachziehen:** das bestehende Pro-Logikmodul-Fixture
(`tools/templates/vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul.json`, U2-ADR-295) referenzierte zwei Felder
(`kontakt_telefon`/`kontakt_email`) am Sektor `identitaet` — dem Bürgersektor, der für Pro jetzt
per `bereichsErsatz` ENTFÄLLT. `logikModulPruefen` weist das gesamte Bundle darum mit
`grund:'blockstruktur'` ab (`sektor-oder-feld`), sobald es gegen ein bereichsErsatz-Depot geprüft
wird — nicht nur die zwei Felder, das GANZE Modul. Die zwei `datenSchema`-Einträge und ihre zwei
`frageAntwortOderLuecke`-Blöcke in „Teil C — Notfall" sind entfernt (samt der Assertion, die sie
im Node-Test prüfte, `tests/pro-geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js`) — geprüft
gegen die drei Geschwister-Testdateien, die dasselbe Fixture außerhalb von bereichsErsatz docken:
keine erwartet diese zwei Felder.

**Die Lücke ist geschlossen (§6):** Pro ersetzt `identity` nicht, die zwei Felder lesen wieder
`identity.telephone` und `identity.email`, und ihre zwei Blöcke in „Teil C — Notfall" stehen
wieder im Modul.

**Die eigentliche Konsequenz für den Wächter selbst** (Auflage 08.09.2026, „präzisieren,
nicht senken"): `tools/konfektion-nativ-vergleichen.js`s Pro-Vergleich ging bislang von „nativ +
eine Karte im vorsorge-Regal" aus (`VORSORGE_STELLEN`/`nativVergleichenMitProKarte`, ein
Fragment-Ausschnitt aus einer sonst byte-gleichen Seite) — exakt das Modell, das dieser Auftrag
auflöst. Mit bereichsErsatz gibt es keine „sonst byte-gleiche" Pro-Seite mehr, gegen die man
ausschneiden könnte (keine native Entsprechung). Ersetzt durch `nativVergleichenMitBereichsErsatz`
— eine MENGEN-Aussage: jede ersetzte native Seite (13 × 2) ist weg, jede neue pro-*-Seite (6 × 2)
ist da, alles andere bleibt byte-gleich zum nativen Kanon. Drei Fehlerarten, einzeln benannt
(`ersetzte-seite-noch-da`, `neue-seite-fehlt`, `unbetroffene-seite-weicht-ab`) statt einer
pauschalen „Abweichung". Die Pro-Karten-Positivkontrolle bleibt eigenständig (unverändert scharf
— `proModulKarteEntfernen` muss weiter werfen, wenn die Karte fehlt), nur ihr Prüfort wanderte
vom Sektor `vorsorge` zu `pro-vertretung-vollmachten`.

---

## 6 · Identität: Pro trägt den eingebauten Bereich identity

**Entscheidung:** Pro ersetzt `identity` nicht. Der eingebaute Bereich steht in Pro wie in
Privat, in der Seitenleiste im Cluster „Zur Person“, mit Name, Geburtsdatum, Anschrift, Telefon
und E-Mail. Die Pro-Bereiche bringen eigene Cluster mit (`cluster`, `clusterTitel`, Überschrift aus
dem Textsatz unter `cluster:<id>.label`) und sprechende Icons. Die Logikmodule
(Geschäftsführerin-Notfallmappe, Notar-Kanzleivertretung) lesen `kontakt_telefon` aus
`identity.telephone` und `kontakt_email` aus `identity.email`.

**Warum kein eigener Pro-Identitätsbereich:** Ein Pro-Depot ohne Namen und Geburtsdatum hat keine
Person. Ein eigener Bereich mit nur Telefon, E-Mail und Notiz ließ genau das fehlen; Name und
Geburtsdatum zusätzlich darin nachzubauen, hätte den eingebauten Bereich doppelt geführt.

**Bestehende Dateien:** Dateien, die noch mit dem früheren Bereich `pro-identitaet` angelegt
wurden, übernehmen beim Öffnen (`_proIdentitaetUebernehmen`, vor der Rettung verwaister Bereiche)
`tpl_telefon` nach `telephone`, `tpl_e_mail` nach `email` und `notiz` nach `furtherDetails`. Ein
Wert geht nur in ein leeres Feld; ein abweichender Wert bleibt, wo er war, und nichts wird
verworfen. Die Mitschrift der Datei wird angeglichen.

**Der signierte Sechs-Bereiche-Betriebssatz-Weg** (`tools/betriebssatz-aufbereiten.js`,
`tests/betriebssatz-inhalte.test.js`) bleibt unverändert bei sechs Bereichen und 54 Feldern.

---

## 7 · Nachtrag (08.09.2026) — der Ersatz-Weg drehte „Pro-Achse englisch" still zurück

**Der Befund, fremd gemessen und an diese Sitzung weitergegeben:** gefahren, nicht
gelesen, mit Positivkontrolle, die wirft — in einer eigenständigen Schwestersitzung, unabhängig
von dieser hier.

```
Weg A  Bereichs-Modul angedockt (Stand VOR §2 dieses ADR)   6 englisch, 0 deutsch
Weg B  bereichsErsatz           (Stand NACH §2 dieses ADR)  0 englisch, 6 deutsch
```

Beide Zusicherungen blieben einzeln grün — keine bestehende Probe schlug an, weil keine
bestehende Probe beide Wege im selben Lauf gegeneinander hielt. Diese Sitzung hat den Befund
selbst reproduziert (s. u.), nicht nur übernommen.

**Ursache, in beiden Berichten übereinstimmend lokalisiert:** `_bereichLabelText`
(`vivodepot.html:10510`) ist ein Getter, der `textLesen(id + '.label')` bei jedem Zugriff
befragt — der Andock-Weg (`bereichsModulPruefen`) hängt ihn an jeden Bereich (`get label() {
return _bereichLabelText(id, label); }`). `_bereichAusBuendelErzeugen` (§2 dieses ADR) macht
stattdessen einen `JSON.parse(JSON.stringify(roh))`-Schnappschuss — kein Getter überlebt das —
und füllt `label` per `_textsatzAufSektorenAnwenden` genau EINMAL, beim Boot. Das deutsche
Inline-Label aus der Fixture steht danach als reine Zeichenkette da; ein EN-Modul, das später
angemeldet wird, hat keine Chance, sie zu erreichen.

**Die Entscheidung, wörtlich (Auftrag, Zug 2):** „Der Bericht schlägt
vor, die sechs `pro-*.label`-Kennungen in den deutschen Ab-Werk-Satz zu legen[…]. Das nicht.
`AB_WERK_TEXTSATZ_DE` ist der Sprachsatz des Gerüsts. Die sechs Sektoren gehören einem Modul.
Wer Modulwissen in den Kern legt, damit das Modul funktioniert, hat die Grenze verschoben, die
Vivodepot ausmacht[…]. Zu bauen ist stattdessen: der Ersatz-Weg bekommt denselben
Beschriftungs-Weg wie der Andock-Weg." Damit verworfen: die im Befund-Bericht selbst
vorgeschlagene Alternative (die Kennungen ins Kern-eigene `AB_WERK_TEXTSATZ_DE` schreiben) —
das hätte genau die Prüffrage der Produktanlage verletzt: *braucht ein neues Modul eine Zeile
im Kern?* Ja, hätte hier gegolten, und das Wissen läge falsch.

**Vor dem Bau gemessen, nicht angenommen** (Auftrags-Auflage): bricht `renderSektor()` ohne
Inline-Label noch (Fund v639, 07.09.2026, s. §4 dieses ADR), oder trägt der Kennung-Rückfall
das inzwischen? Antwort, aus dem Quelltext gelesen (`_bereichLabelText`, Zeile 10510):
`return (typeof t === 'string' && t.trim()) ? t : rueckfall;` — der Getter kann **nie** leer
zurückkommen, solange sein `rueckfall`-Argument nicht leer ist. Die Fixture bleibt darum
unverändert (ihr deutsches Inline-Label wird zum `rueckfall`-Argument des neuen Getters,
genau wie beim Andock-Weg das Modul-eigene Label der `rueckfall` ist) — kein v639-Risiko, per
Konstruktion, nicht nur vermutet.

**Der Fix:** `_bereichAusBuendelErzeugen` bekommt einen dritten Parameter,
`istBereichsErsatzSektor` — **nur** dann wird `neu.label` per `Object.defineProperty` NACH dem
JSON-Klon und dem Textsatz-Lauf in einen `get label() { return _bereichLabelText(sektorId,
labelRueckfall); }` verwandelt, mit dem bereits gefüllten String als Rückfall. Native Sektoren
bleiben unangetastet — dieselbe Funktion erzeugt sie beim ersten Boot ebenfalls (s. Kopf-
Kommentar an der Funktion), aber sie tragen ihren eigenen, funktionierenden Sprachwechsel-Weg
(`textsatzNeuAnwenden` schreibt sie bei jedem Sprachwechsel neu — ein Getter-Umbau dort wäre
unnötiges Risiko an einem Mechanismus, der nicht kaputt ist). Die Unterscheidung entsteht am
Aufrufer (`buergermodulBuendelAnwenden`), der ohnehin schon weiß, welche Sektor-IDs aus
`bereichsErsatz.neu` stammen.

**Verifiziert, nicht nur behauptet:** die neue Testgruppe in
`tests/pro-bereichsersatz-und-vorlagen-saat.test.js`
(„[U2-ADR-421-Nachtrag „Pro-EN-Rubriken-Ruecknahme"] die Sektor-Labels schalten mit der
Sprache") wurde vor dem Commit gegen den ALTEN Code gehalten (`git stash` auf `vivodepot.html`/
`sw.js`, Probe erneut gefahren) — sie schlägt dort tatsächlich fehl, nicht nur im Prinzip. Ein
zweiter, umfassenderer Wächter (Weg A als Positivkontrolle, Weg B als Behauptung, wie im
Bericht beschrieben) entsteht separat in der Suite, gebaut von der Sitzung, die den
Befund maß — diese Probe hier ist der Beleg dieses Commits, kein Ersatz dafür.

SCHALEN_STAND v642 (mit `sw.js` `CACHE` im Lockstep).

---

## Konformität

```yaml
konformitaet:

  - aussage: >-
      Alle ersetzten nativen Sektoren verschwinden, identity bleibt, alle sechs pro-*-Sektoren
      erscheinen —
      SEKTOR_BY_ID ist bereinigt, nicht nur bereicheAlle() (wörtlich wie ADR-348).
      Seit 19.09.2026 ohne Gegenstand: bereichsErsatz beschreibt das Produkt nicht mehr (Entscheidung vom 18.09.2026: Gerüst + Templates = Produkt); die Probe ist mit ihrem Gegenstand entfernt, Nachfolger für die Zusammensetzung: tests/vier-produkte.test.js.
    zustand: entfallen
    herkunft: U2-ADR-421 (08.09.2026), entfallen 19.09.2026

  - aussage: >-
      Jeder Pro-Sektor und seine Sektion tragen ein echtes Label — der Rot-Beweis, der den
      Browser-Fund (escapeHTML bricht an undefined) hätte fangen müssen.
      Seit 19.09.2026 ohne Gegenstand: bereichsErsatz beschreibt das Produkt nicht mehr (Entscheidung vom 18.09.2026: Gerüst + Templates = Produkt); die Probe ist mit ihrem Gegenstand entfernt, Nachfolger für die Zusammensetzung: tests/vier-produkte.test.js.
    zustand: entfallen
    herkunft: U2-ADR-421 (08.09.2026), gemessen im echten Playwright-Klickweg, entfallen 19.09.2026

  - aussage: >-
      Reihenfolge ist Bedingung — ohne Bereichs-Saat zuerst fallen alle 54 Vorlagen-Felder durch
      grund:'bereich'; mit ihr kommen alle 54 an, am richtigen Sektor, ohne ungeprueft-Marke.
      Seit 19.09.2026 ohne Gegenstand: bereichsErsatz beschreibt das Produkt nicht mehr (Entscheidung vom 18.09.2026: Gerüst + Templates = Produkt); die Probe ist mit ihrem Gegenstand entfernt, Nachfolger für die Zusammensetzung: tests/vier-produkte.test.js.
    zustand: entfallen
    herkunft: U2-ADR-421 (08.09.2026); die drei Titel unten sind Template-Literale mit
      ${FELDER_ANZAHL}-Interpolation im Quelltext — hier auf ihren statisch auffindbaren Teil vor
      der Zahl gekürzt, damit ein Text-Abgleich ohne Testausführung auflöst (Nachtrag, 17.09.2026);
      entfallen 19.09.2026

  - aussage: >-
      _abWerkVorlagenInsDepot(d) schreibt die 54 Felder direkt in ein frisches leeresDepot()
      (Durchstich, unabhängig von depotAnlegen()) — und tut im heutigen Kanon (nichts gebacken)
      nichts.
    zustand: erfuellt
    herkunft: U2-ADR-421 (08.09.2026); die zwei Titel unten sind Template-Literale mit
      ${FELDER_ANZAHL}-Interpolation — hier auf ihren statisch auffindbaren Teil gekürzt (Nachtrag,
      17.09.2026, s. auch die Klausel „Reihenfolge ist Bedingung" oben)
    pruefung:
      - tests/pro-bereichsersatz-und-vorlagen-saat.test.js
        "Felder direkt in d.feldDefinitionen[], mit den richtigen Sektor-IDs"
      - tests/pro-bereichsersatz-und-vorlagen-saat.test.js
        "ein frisches Privat-Depot zeigt NIE eines der"

  - aussage: >-
      Eine in Pro angelegte Datei behält ihre 54 Felder, geöffnet in Privat — Struktur gehört zur
      Datei, nicht zum Programm (die Zusicherung, kein Mangel).
    zustand: erfuellt
    herkunft: U2-ADR-421 (08.09.2026), entschieden 08.09.2026 nacht
    pruefung:
      - tests/pro-bereichsersatz-und-vorlagen-saat.test.js
        "eine in Pro angelegte Datei behält ihre Felder, geöffnet in Privat (kein Mangel — die Zusicherung)"

  - aussage: >-
      feldDefinitionen (Struktur) erreicht die Bürger-Herausgeben/xShare-Nutzlast nicht — nur
      Werte gehen hinaus, Definitionen nicht.
    zustand: erfuellt
    herkunft: U2-ADR-421 (08.09.2026), Auflage 3
    pruefung:
      - tests/pro-bereichsersatz-und-vorlagen-saat.test.js
        "kein Treffer für "feldDefinitionen" in der Herausgeben/xShare-Funktionsfamilie (Auflage 3 — gemessen, nicht angenommen)"

  - aussage: >-
      Jeder Pro-Sektor UND sein Platzhalterfeld tragen ein echtes Label — der Rot-Beweis für den
      zweiten Browser-Fund (feldZeileHTML bricht sonst genauso wie renderSektor).
      Seit 19.09.2026 ohne Gegenstand: bereichsErsatz beschreibt das Produkt nicht mehr (Entscheidung vom 18.09.2026: Gerüst + Templates = Produkt); die Probe ist mit ihrem Gegenstand entfernt, Nachfolger für die Zusammensetzung: tests/vier-produkte.test.js.
    zustand: entfallen
    herkunft: U2-ADR-421 (08.09.2026), gemessen im echten Playwright-Klickweg, entfallen 19.09.2026

  - aussage: >-
      Der native Kanon gegen ein bereichsErsatz-Produkt ist eine MENGEN-Aussage, nicht mehr ein
      Fragment-Ausschnitt: jede ersetzte native Seite ist weg, jede neue pro-*-Seite ist da, alles
      andere bleibt byte-gleich. Drei Fehlerarten einzeln geprüft, dazu der echte pro-de-Bau mit 0
      Abweichungen.
    zustand: erfuellt
    herkunft: U2-ADR-421 (08.09.2026), Auflage „präzisieren, nicht senken"
    pruefung:
      - tests/konfektion-nativ-vergleichen.test.js
        "eine Abweichung AUSSERHALB der ersetzten/neuen Mengen wird gemeldet, nicht durchgewinkt"
      - tests/konfektion-nativ-vergleichen.test.js
        "eine ersetzte native Seite, die trotzdem auftaucht, wird gemeldet"
      - tests/konfektion-nativ-vergleichen.test.js
        "eine erwartete neue pro-*-Seite, die fehlt, wird gemeldet"
      - tests/konfektion-nativ-vergleichen.test.js
        "eine erwartete Seite, die DA ist, wird nicht gemeldet — nur die fehlende zweite"
      - tests/konfektion-nativ-vergleichen.test.js
        "pro-de konfektioniert gegen nativ: 0 Abweichungen (zwölf ersetzt, identity bleibt, alle neuen pro-*-Sektoren da — DER geschärfte Wächter, U2-ADR-421)"

  - aussage: >-
      Die Pro-Regal-Karte (U2-ADR-332) ist im echten pro-en-Bau auffindbar — jetzt im Sektor
      pro-vertretung-vollmachten (vorsorgeRegal-Merkmal im Fixture), nicht mehr in vorsorge.
      proModulKarteEntfernen wirft weiterhin, wenn sie fehlt (Auflage unverändert).
    zustand: erfuellt
    herkunft: U2-ADR-421 (08.09.2026)
    pruefung:
      - tests/konfektion-nativ-vergleichen.test.js
        "pro-en trägt die Pro-Modul-Karte im Sektor "pro-vertretung-vollmachten" (Positivkontrolle, wirft sonst)"

  - aussage: >-
      Pro trägt den eingebauten Bereich identity mit Name und Geburtsdatum, in Themen-Clustern
      ohne Ordner-Icons; die Logikmodule lesen Telefon und E-Mail aus identity. Eine Datei mit dem
      früheren pro-identitaet übernimmt dessen Werte beim Öffnen, nur in leere Felder. Der ältere
      signierte Sechs-Bereiche-Betriebssatz-Weg bleibt bei sechs Bereichen/54 Feldern.
    zustand: erfuellt
    herkunft: U2-ADR-421 §6
    pruefung:
      - tests/pro-struktur-wie-privat.test.js
        "[Pro-Struktur·pro-de] Themen-Cluster, sprechende Icons, identity mit Name und Geburtsdatum"
      - tests/pro-struktur-wie-privat.test.js
        "[Pro-Struktur·pro-en] Themen-Cluster, sprechende Icons, identity mit Name und Geburtsdatum"
      - tests/pro-struktur-wie-privat.test.js
        "[Pro-Identität·Übernahme] Telefon, E-Mail und Notiz gehen in leere identity-Felder, ein abweichender Wert bleibt, die Mitschrift wird angeglichen"
      - tests/pro-struktur-wie-privat.test.js
        "[Pro-Identität·Notfallmappe] die Pro-Logikmodule lesen Telefon und E-Mail aus identity"
      - tests/betriebssatz-inhalte.test.js
        "[Betriebssatz-Inhalte·U2-ADR-243] FELDER_DE hat 36 Bestand + 18 neue = 54 Einträge, auf sechs Bereiche verteilt"
      - tests/betriebssatz-aufbereiten.test.js
        "[Betriebssatz-Aufbereiten] TEXTSATZ_MODUL_EN überschreibt genau die sechs Bereichs-Label-Schlüssel"
      - tests/pro-geschaeftsfuehrerin-notfallmappe-bereich-artefakt.test.js
        "[U2-ADR-379] das Bereichs-Modul-Artefakt ist gültiges JSON und trägt alle sechs Pro-Sektoren"
      - tests/pro-geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js
        "[Pro-Geschäftsführerin] volles Depot: alle drei Abschnitte (Vertretung/Nachfolge/Notfall) liefern die echten, gesetzten Werte"
      - tests/konfektion-nativ-vergleichen.test.js
        "pro-de konfektioniert gegen nativ: 0 Abweichungen (zwölf ersetzt, identity bleibt, alle neuen pro-*-Sektoren da — DER geschärfte Wächter, U2-ADR-421)"

  - aussage: >-
      bereichsErsatz-Sektoren tragen denselben lebendigen Beschriftungs-Getter wie der
      Andock-Weg — ein aktives EN-Sprachmodul zeigt die englische Rubrik, nicht die deutsche
      Fixture-Zeichenkette. Kein Modulwissen (die pro-*.label-Kennungen) im Kern-eigenen
      AB_WERK_TEXTSATZ_DE; native Sektoren unangetastet.
      Seit 19.09.2026 ohne Gegenstand: bereichsErsatz beschreibt das Produkt nicht mehr (Entscheidung vom 18.09.2026: Gerüst + Templates = Produkt); die Probe ist mit ihrem Gegenstand entfernt, Nachfolger für die Zusammensetzung: tests/vier-produkte.test.js.
    zustand: entfallen
    herkunft: U2-ADR-421-Nachtrag (08.09.2026), Auftrag „Pro-EN-Rubriken-Ruecknahme" — s. §7; entfallen 19.09.2026
```

---

*Gebaut in einem parallelen Strang (eigene Sitzung, Arbeitsbaum
`pro-produkt-bereichsersatz-ersetzt-privat`, eigener Zweig auf `fec9a820`). Kein Commit ohne
Freigabe. `depotAnlegen()`-Integration (`_abWerkStrukturInsDepot`) und der volle
Browser-Durchstich über den Anlege-Dialog liegen bei e2s Zweig/dem Konvoi.*
