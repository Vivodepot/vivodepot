# U2-ADR-384 · Vivodepots eigene Marke wird Ab-Werk-Saat — konfektionieren ist nicht einlassen

**Datum:** 08.09.2026
**Status:** gebaut, 7/7 eigene Proben grün, 65/65 gegengeprüfte Bestandsproben ohne Regression,
Vollsuite ausstehend (Konvoi-Gate)
**Status heute:** gilt
**Auftrag:** „dieselbe Frage wie bei der Pro-Achse, jetzt für Branding" (08.09.2026) —
trägt ein konfektioniertes Produkt Vivodepots eigenes Branding als Modul, oder ist Vivodepot der
native Rückfall, während nur fremde Marken Module sind?
**Bezug:** U2-ADR-040 (Vivodepot ist ein Anbieter unter anderen) · U2-ADR-296 (`VIVODEPOT_BRANDING`
als expliziter Datenwert) · U2-ADR-362/371/374 (`_markeName`/`_markeDomain`/
`_markeAnzeigeAnwenden`) · U2-ADR-182 Task 4 / A523 (Branding-Register `nurGeprueft: true`) ·
U2-ADR-285 (`_textsatzModulPruefenGeruest`, dasselbe Muster für Sprache) · U2-ADR-367
(`AB_WERK_TEXTSATZ_DE` wird selbst das deutsche Sprachmodul) · U2-ADR-361 (`produkt-
konfektionieren.js`, die vier Produkte)

---

## 1 · Der Befund, gemessen vor dem Bau

Vier unabhängige Messungen, alle gegen den echten Bestand, nicht angenommen:

- **Kein konfektioniertes Produkt dockt ein Branding-Modul.** `grep` über
  `tools/produkt-konfektionieren.js`, `tools/vier-produkte-erzeugen.js`,
  `tools/lib/vier-produkte.js`: kein einziges Vorkommen von „branding"/„Branding" außer einem
  unbeteiligten Kommentar. Die vier `PRODUKTE`-Einträge (`sprachModulPfad`/`proModulPfad`) kennen
  kein `brandingModulPfad`. Der Erzeuger druckt für jedes Produkt selbst „(keins — nativer
  Rückfall)".
- **`VIVODEPOT_BRANDING` war reines Test-Artefakt.** Einzige Konsumenten (vor diesem Zug):
  `tests/vivodepot-branding-inhalt.test.js`, `tests/pruefstand-bindung.test.js`,
  `tests/e2e/marke-e2e-abnahme.spec.js`. Keine Produktionsdatei las sie — dasselbe Muster wie die
  Pro-Achse (eine Konstante, die nur existiert, damit Proben grün sind).
- **Der „zweite, kürzere Weg" existierte tatsächlich, im eigenen U2-ADR-362-Code:**
  `_markeName()`/`_markeAnzeigeAnwenden()` gaben bei leerem `data.brandingModule` hartcodiert
  `'Vivodepot'`/`'vivodepot.de'` zurück — OHNE je durch `brandingModulPruefen` zu laufen. Genau
  die Sonderbehandlung, die U2-ADR-040 ausschließt: eine fremde Marke bekäme diesen Rückfall nie.
- **Blockierender Befund, der den naiven Fix ausschließt:** das Branding-Register trägt
  `nurGeprueft: true` im `EINLASS_REGISTER` (U2-ADR-182 Task 4/A523) — „der unsignierte Weg ist
  für dieses Register versperrt", anders als beim `erscheinung`-Register (bewusste Ausnahme,
  Bauvorlage des Design-Strangs: „ungeprüft reicht"). Ein Branding-Modul MUSS signiert sein, um durch
  `modulEinlassen` zu kommen — auch In-Depot (Fall 1 aus U2-ADR-296), nicht nur Vor-Depot (Fall
  2, U2-ADR-297). `tests/e2e/marke-e2e-abnahme.spec.js` beweist zwar Byte-Gleichheit zwischen
  Fallback und geladenem `VIVODEPOT_BRANDING` über den echten signierten Weg — aber
  `signiertesBuendelBauen()` erzeugt dafür ein EPHEMERES Test-Schlüsselpaar, keinen echten Anker.

**Nicht Teil der Lücke, geprüft und ausgeschlossen:** `tools/buergermodul/vd-branding.json` (nur
`name`, keine Farben/Schrift/Logo) ist kein zweites, konkurrierendes Artefakt zu
`VIVODEPOT_BRANDING` — `tests/erzeuger-deckung-sprache-rechtsraum-marke.test.js` dokumentiert das
bereits ausdrücklich als Absicht: Farben/Schrift/Logo liegen im Kern nur als CSS-Variable, keine
Datenwerte, die der freie Bürgerapp-Schnitt ziehen könnte. Zwei verschiedene Zwecke (freies
Bürgerapp-Bündel vs. Vivodepots eigenes geprüftes Branding), kein Widerspruch.

## 2 · Die Entscheidung — und warum die naheliegende Alternative NICHT gewählt wurde

**Zwei Wege standen zur Wahl:**

**(a) Eine echte Signier-Zeremonie**, die ein wirklich signiertes Vivodepot-Branding-Bündel mit
dem echten Produktions-Anker baut und den vier Produkten mitgibt. **Ausgeschlossen — nicht wegen
Aufwand, sondern weil ausdrücklich anders entschieden wurde**, nachdem eine
Hand-Zeremonie einen halben Nachmittag kostete: „Wir brauchen eine automatische Zertifizierung.
Und die kommt, wenn etwas fertig ist. Und nicht nach 30 % oder wo wir sind." Der Schlüsselstrang
ist damit nicht gestrichen, sondern **einsortiert — ans Ende**: wenn die vier Produkte fertig
sind, zertifiziert die automatische Zeremonie das Fertige, und signiert die ausgelieferten
Artefakte dann sehr wohl. (b) jetzt und (a) später sind kein Entweder-oder, sondern eine
Reihenfolge — **(b) ist keine Absenkung der späteren Zeremonie, sie ist ihr Vorlauf.**

**(b) Ab-Werk-Saat, strukturell geprüft, ohne Signatur — die gewählte Antwort.** Konfektionieren
ist nicht Einlassen: Vivodepot backt seine eigenen Module beim BAUEN ein, ohne Signatur; der
signierte Einlassweg ist für FREMDE Module, die eine Bürgerin hinzufügt. Genau so ist in derselben
Nacht die Sprache gelandet (U2-ADR-367: `AB_WERK_TEXTSATZ_DE` ist ab Werk gesät, nicht signiert),
und genau so entscheidet 3f es für den Rechtsraum. **Drei unabhängige Messungen, an drei
verschiedenen Achsen, landen an derselben Regel — die Regel ist der eigentliche Fund dieser
Nacht, nicht die einzelne Branding-Lücke.**

## 3 · Der Bau

**`AB_WERK_BRANDING`** (`vivodepot.html`, direkt nach `brandingModulEinbetten`, vor
`_markeAnzeigeAnwenden`) — ein eingefrorener, echter Branding-Datensatz mit denselben Werten wie
bisher `tools/vivodepot-branding-inhalt.js` (`--salbei-dunkel: #4F6539`, `--gold: #8a6d3a`,
„Inter", `vivodepot.de`, `logo: null`).

**`_abWerkBrandingErmitteln(modul)`** — ruft `brandingModulPruefen(modul)` auf, dieselbe Funktion
wie für ein fremdes Modul (**kein Geruest-Zwilling nötig**: anders als bei Sprache/`'de'` kennt
`brandingModulPruefen` keine reservierte `herkunft`, die Vivodepots eigenen Wert ausschlösse —
geprüft, nicht angenommen). Liefert `geprueft.branding` bei Erfolg, sonst `null` — **ein
strukturell kaputtes Ab-Werk-Branding wird abgelehnt, nicht angewandt.**

**`_markeName()`/`_markeDomain()`/`_markeAnzeigeAnwenden()`** lesen jetzt `_AB_WERK_BRANDING`
(das Ergebnis der Boot-Prüfung) statt eines hartcodierten Literals. Der Literal-String
`'Vivodepot'`/`'vivodepot.de'` bleibt nur noch als LETZTES Sicherheitsnetz, falls selbst die
eigene Ab-Werk-Saat je invalide würde (`_AB_WERK_BRANDING == null`).

**Rückfrage (08.09.2026): ist dieses Netz erreichbar oder totes Beiwerk?** Wäre es
erreichbar, hätte diese ADR die Sonderbehandlung nur verschoben, nicht beseitigt — ein kaputtes
Ab-Werk-Branding fiele still auf ein ungeprüftes Literal zurück und sähe dabei völlig normal aus.
**Es ist tot, und zwar nachweislich, nicht nur unwahrscheinlich:**
`tests/u2-adr-384-branding-ab-werk-saat.test.js`, Probe
„`[ADR-384·Positivkontrolle] AB_WERK_BRANDING besteht brandingModulPruefen ohne einen einzigen
Verwurf`", schickt `AB_WERK_BRANDING` durch genau dieselbe `brandingModulPruefen`-Prüfung und
verlangt `gueltig === true` UND `verworfene === []` — sie läuft im selben `pre-commit`-Gate wie
jede andere Probe. **Was passiert, wenn die Saat kaputt ist: das fällt beim Bauen auf, nicht bei
der Bürgerin** — ein Commit, der `AB_WERK_BRANDING` bricht, kommt gar nicht erst durch, das
Sicherheitsnetz im Kern wird darum in der Praxis nie betreten. Es bleibt trotzdem stehen (nicht
entfernt), weil `_markeName`/`_markeDomain` niemals `null`/`undefined` zurückgeben dürfen, egal
was ein zukünftiger Test-Ausfall oder ein `--no-verify`-Commit durchließe — ein dokumentiertes,
geprüft unerreichbares Sicherheitsnetz, kein aktiver zweiter Pfad.

**Auflage 1 eingehalten — `nurGeprueft: true` unangetastet.** `AB_WERK_BRANDING` hat keinen
Aufrufer im `modulEinlassen`-Bereich des Kerns (gemessen, nicht behauptet — s. Proben). Die Saat
läuft nie durch den signierten Einlassweg; ihre Sicherheit ist wörtlich dieselbe Bauart wie
`_textsatzModulPruefenGeruest` (U2-ADR-285): die Abwesenheit eines Wegs dorthin, nicht ein
Nachweis im Modul selbst.

**Auflage 2 eingehalten — geprüft, nicht signiert ≠ ungeprüft.** `brandingModulPruefen` läuft
unverändert; ein Rot-Beweis zeigt, dass ein vollständig kaputtes Ab-Werk-Branding `null` liefert
(nichts wird angewandt) und dass ein teilweise kaputtes Feld (z. B. eine ungültige Hex-Farbe) vom
bestehenden, feldweisen Verwurf gefangen wird — dieselbe Nachsicht/Schärfe wie bei jedem fremden
Modul, keine Sonderregel für den eigenen Fall.

**`tools/vivodepot-branding-inhalt.js` gemessen, nicht mehr zweimal gesetzt.** Bis zu diesem Zug
stand dort eine von Hand getippte zweite Fassung derselben Werte — derselbe Fehler, den
`tools/buergermodul-schnitt.js` für den Markennamen bereits ausschließt („DER MARKENNAME WIRD
GEMESSEN, NICHT GESETZT"). Das Werkzeug liest `V.AB_WERK_BRANDING` jetzt über `ladeKern()` — eine
Abweichung zwischen Kern und Werkzeug ist damit strukturell ausgeschlossen, nicht nur durch eine
Probe verboten.

## 4 · Verzahnung mit Sprache und Rechtsraum — Branding ist die dritte Zeile

e2 baut eine tabellengetriebene Rangfolge für Ab-Werk-Module (Saat < signiertes
Vor-Depot-Bündel < Bürgerin), 3f hängt den Rechtsraum als Zeile ein. **Branding ist die dritte
Zeile, kein vierter eigener Mechanismus** — dieser Zug fasst `produkt-konfektionieren.js` darum
bewusst nicht an (e2 sitzt daran). Der Eintrag, den `AB_WERK_BRANDING` für diese Tabelle braucht:
ein Ab-Werk-Modul vom `modulTyp: 'branding'`, geprüft über `brandingModulPruefen`, angewandt über
`_markeAnzeigeAnwenden`/`_markeName`/`_markeDomain` — kein `modulauswahl`-Eintrag, kein
`unsignierteModulDateien`-Pfad (das Branding-Register bleibt signiert-only für den Fremdfall).

**Wortlaut für die Zusammensetzungs-Tabelle (U2-ADR-383):** „Branding: Vivodepot, ab Werk
gesät, strukturell geprüft, ohne Signatur — dieselbe Form wie Sprache DE und Rechtsraum DE."

## 5 · Proben

7/7 eigene Proben grün (`tests/u2-adr-384-branding-ab-werk-saat.test.js`): der Kern-Wert selbst
(eingefroren, richtige Form), Positivkontrolle (kein einziger Verwurf, `_AB_WERK_BRANDING` ist
gesetzt), zwei Rot-Beweise (teilweise kaputt → Feld verworfen, nicht durchgerutscht; vollständig
kaputt → `null`, nichts angewandt; ein Nicht-Objekt wirft nicht), die Anschluss-Probe (`_markeName`
liest tatsächlich über die geprüfte Saat, nicht über ein bloßes Literal) und die
Isolations-Probe (kein Aufrufer im `modulEinlassen`-Bereich).

65 gegengeprüfte Bestandsproben ohne Regression: `tests/marke-anzeige-anwenden.test.js` (10),
`tests/pruefstand-bindung.test.js` (11, inkl. der eigenen `[U2-ADR-296]`-Proben gegen
`VIVODEPOT_BRANDING`), `tests/vivodepot-branding-inhalt.test.js` (4, jetzt gegen den aus dem Kern
gemessenen Wert), `tests/konfektion-nativ-vergleichen.test.js`/`manifest-konfektionieren.test.js`/
`produkt-konfektionieren.test.js`/`vier-produkte.test.js` (40 — unangetastet, `produkt-
konfektionieren.js` selbst nicht verändert). SCHALEN_STAND v631 → v632.
