# U2-ADR-076 — FHIR-Narrativ-Renderer in der Mappen-Vorschau (autoritative eu-lab/eu-hdr/ips) + parseXML-Härtung

**Datum:** 12.07.2026 (Auftrag + Nachtrag 11./12.07.)
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · Renderer + parseXML-Härtung + Alles-oder-nichts gebaut. Suite **1339/0** (pre-commit; +19 parseXML-Robustheitstests +3 Alles-oder-nichts-Tests), parseXML-Konsumenten unverändert grün, OSV CLEAN, Block-Pin `8d31c678…` byte-identisch, PV-Golden 42/42 byte-identisch. **Kein Push.**
**Commit-Historie:** Renderer zuerst *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 12.07.2026)*/*(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 12.07.2026)* (schmaler Fix); Commit-Blocker-Auftrag → volle parseXML-Härtung, neu gebaut als `51831e2`/`6f56c3f` (Teil 4); danach Review-Befund „Renderer zeigt Bruchstücke" → Alles-oder-nichts (Teil 5), Folge-Commits. Alles unpushed.
**Nummer:** U2-ADR-076 (höchste belegte war U2-ADR-075).
**Typ:** **Feature (Mappen-Vorschau) + Robustheits-Härtung + Anzeige-Integrität** — kein Schema-Bump, kein Krypto-Byte geändert. SW-Cache v47→v49.
**Bezug:** xShare/Gazelle „Content Consumer — Imports and Renders Sample" · interner Bauauftrag FHIR-Renderer · Import-Konsument-Weg (Klasse-4-Mappe, `MED_DOK_TYPEN`) · PRINCIPLES: Offline / keine externen Ressourcen.
**Status heute:** gilt — Beleg `tests/allowlist-verbote.test.js`.

---

## Kontext

Der Import autoritativer FHIR-Dokumente (eu-lab / eu-hdr / ips) existierte bereits: sie landen
als **verbatim** gespeicherter Klasse-4-Eintrag in der Mappe (`MED_DOK_TYPEN`). Die
Mappen-Vorschau zeigte für sie jedoch nur **„keine Vorschau"** — der Bürger sah, *dass* ein
geprüftes Dokument da ist, aber nicht *was drinsteht*. Für den Gazelle-Testschritt „Imports
**and Renders**" ist Rendern der fehlende Halbschritt.

Zwei Eigenheiten echter EU-Dokumente prägen die Entscheidung:

1. **Das Narrativ steckt im `text.div`** jeder Composition und jeder Sektion — fremdes XHTML,
   das nie ungeprüft in den DOM darf (Skript, Event-Handler, externe Ressourcen, Links).
2. **Der eigentliche Messwert lebt oft NUR in `Observation.valueQuantity`**, in gar keinem
   `text.div` (Gazelle-Sample 59: der Wert **135 mg/dl** erscheint in keinem Narrativ). Ein
   reiner Narrativ-Renderer würde den Kern des Laborbefunds unterschlagen.

Die Prüfdokumente sind die Gazelle-**PASSED**-Samples von Ergobyte (Villa Marta): 58 ips,
59 lab-report, 60 hdr — als Fixtures abgelegt.

---

## Entscheidung

### Teil 1 — Narrativ-Renderer (`text.div` → sichere Vorschau)

`flowMappeVorschau` rendert für `application/fhir+json`-Einträge das Dokument-Narrativ:
Composition-Titel + `text.div`, dann jede Sektion (Titel + `text.div`, rekursiv über
`section.section`). Einstieg `_fhirDokumentAnsichtHTML(bundleText)`; die Div-Sanitisierung
liegt in `_fhirNarrativeSicher(divXhtml)`.

**Sanitizer durch Konstruktion (Allowlist-Rebuild, kein Pass-Through):** Das fremde XHTML
wird geparst und aus einer **abschließenden** Tag-Menge neu aufgebaut. Nur allowlistete Tags
werden re-emittiert; alles andere wird **samt Inhalt** (gesamter Teilbaum) verworfen. Text
läuft durch `escapeHTML`. Attribute: nur `colspan`/`rowspan`, jeweils zahl-validiert
(`/^[0-9]{1,3}$/`). Kein `innerHTML` von Fremd-XHTML, keine externen Ressourcen, keine
Event-Handler.

**Drei Präzisierungen (verbindlich umgesetzt):**
- **`<a>` raus** — kein Link-Tag in der Allowlist (auch keine „harmlosen" Links).
- **Allowlist abschließend** — die Tag-Menge ist final: `div p span br h1–h6 ul ol li table
  caption thead tbody tfoot tr td th b i em strong`. Kein „später erweitern".
- **Verworfene Tags samt Inhalt** — kein Ausdünnen (Tag weg, Kinder bleiben), sondern der
  ganze Teilbaum verschwindet.

**Mehrfach-Wurzel-Sektionen:** Die Ergobyte-Samples legen je Sektion **mehrere
Geschwister-`<div>`** in `text.div`. Der namensraum-agnostische `parseXML` liefert nur die
erste Wurzel; deshalb umschließt `_fhirNarrativeSicher` die Eingabe mit einem synthetischen
`<vdnarrwrap>…</vdnarrwrap>` (der Wrapper selbst wird nie emittiert), um alle Wurzeln zu
erfassen.

### Teil 2 — Strukturierte Observation-Werte werden IMMER gezeigt (Nachtrag)

Zusätzlich zum Narrativ rendert `_fhirObservationHTML(bundleText)` eine Messwert-Tabelle aus
den `Observation`-Ressourcen. Gezeigt wird **nur, was da ist — nichts Abgeleitetes/Erfundenes:**
Analyt (`code.text` / `code.coding[].display`), Wert (`valueQuantity` **+** `valueString` **+**
`valueCodeableConcept`), Datum (`effectiveDateTime`), Referenzbereich (`referenceRange`),
Interpretation (`interpretation`). Referenz- und Interpretations-Spalte erscheinen nur, wenn
mindestens ein Eintrag sie trägt. `_fhirDokumentAnsichtHTML` = Narrativ **+** Messwerte.

Damit erscheint der 135-mg/dl-Wert aus Sample 59, obwohl er in keinem `text.div` steht.
Sonderzeichen/Griechisch überleben unverstümmelt (Medikations-Narrative der Samples).

### Teil 3 — `parseXML` additiv um `inhalt[]` erweitert

Der Renderer braucht Text **und** Elemente in Dokument-Reihenfolge. `parseXML` bekam additiv
eine geordnete Kinderliste `node.inhalt[]` (`{t:'t',s}` Text | `{t:'e',el}` Element), neben
dem bestehenden `node.kinder[]`/`node.text`. Bestehende Konsumenten (CAMT/XMeld/Import) sind
unberührt — sie lesen `kinder`/`text` wie zuvor.

### Teil 4 — parseXML-Härtung gegen Endlosschleife (Denial-of-Service über ein importiertes Dokument)

**Befund (12.07., Commit-Blocker).** `parseXML` lief bei malformter Eingabe in eine
**Endlosschleife**: traf die Attribut-Schleife auf ein einzelnes `/`, das nicht von `>` gefolgt
wird, matcht der Attributnamen-Scan null Zeichen, es gibt kein `=`, und der Cursor `i` rückte
nicht vor. Reproduktion: `_fhirNarrativeSicher('kein <<< xml')` kehrt nie zurück.

Das ist **kein Test- und kein Umgebungsproblem, sondern ein Denial-of-Service über ein
importiertes Dokument**: ein Arztdokument mit malformtem `text.div` friert Vivodepot beim
Anzeigen ein. Der Bürger holt die Datei selbst herein — er ist der Angriffsvektor. Der Bug ist
**älter als der Renderer** (`parseXML` steht seit Langem im Code); der Renderer ist die erste
Funktion, die **fremdes** XML durch diesen Parser schickt, und hat ihn damit erreichbar gemacht.
Der Sanitizer schützt gegen **Inhalt** (Skript/Handler), nicht gegen **Struktur** (einen nicht
terminierenden Parser) — die Lücke wird deshalb **im Parser** geschlossen, nicht in der Allowlist.

**Fix — im Parser, mit drei Ebenen (damit der Bug nicht beim nächsten Aufrufer wiederkehrt):**

1. **Fortschritt in jedem Zweig.** Kein Pfad durch eine Schleife lässt `i` unverändert; wo kein
   sinnvoller Fortschritt möglich ist, wird ein Zeichen übersprungen (`const vorAttr = i; … if
   (i === vorAttr) i++;`), nicht stehengeblieben. Für wohlgeformtes XML beweisbar inert (feuert
   nur bei Null-Fortschritt, den wohlgeformte Tags nie erzeugen).
2. **Harte Iterations-Obergrenze.** Ein Zähler `grenze()` in jeder Schleife bricht bei
   `OPS_MAX = (len+1)*16 + 1024` ab — an die Eingabelänge gebunden, großzügig, aber **endlich**.
   Ein Parser, der bei fremder Eingabe nicht terminiert, ist unhaltbar; der Backstop terminiert
   auch dann, wenn eine spätere Änderung einen nicht-fortschreitenden Zweig wieder einführte.
3. **Verschachtelungs-Obergrenze** `TIEFE_MAX = 512` (Stack-Schutz gegen tiefe `<a><a>…`-Ketten).

**Abbruch ist ein sauberer Zustand, kein Absturz:** jede Grenzüberschreitung wirft und wird im
umschließenden `try/catch` zu **`null`** („nicht parsebar") — der Aufrufer zeigt den ehrlichen
Hinweis (kein Ersatztext, keine Rekonstruktion).

Folge für den Test-Vertrag: `_fhirNarrativeSicher('kein <<< xml')` liefert nach dem Fix den
geretteten sicheren Text (`"kein "`) statt zu hängen; die Robustheits-Assertion prüft den
belastbaren Vertrag — **Termination + kein Injektions-Vektor** — statt eines willkürlichen `''`.

**Fuzz-Tests** (`tests/parsexml-robustheit.test.js`, je mit hartem Per-Test-Timeout — ein
hängender Test ist ein *fehlgeschlagener*, kein langsamer): `<<<`, `<` am Eingabe-Ende, Tag
ohne `>`, unbalanciertes Anführungszeichen, Attribut ohne Wert, `/` mitten im Tag, `</` ohne
Namen, tiefe Verschachtelung (→ sauberes `null`), leere Eingabe, reiner Text, CDATA/Kommentar
ohne Ende — jeder Fall kehrt in <2 s zurück; plus Positiv-Kontrolle, dass wohlgeformtes XML
**unverändert** korrekt parst.

### Teil 5 — Alles-oder-nichts fürs Narrativ (kein Rendern von Bruchstücken)

**Review-Befund (12.07.).** Der lenient-Renderer zeigte bei einem malformten `text.div`
**Bruchstücke, die wie Vollständigkeit aussehen** — der schärfste Fall: `<div>Insulin <b>10 IE</b>
<xyz stray/ morgens und abends</div>` rendert als „Insulin 10 IE", die Dosierung „morgens und
abends" fällt still weg. Eine Dosierung, die zur halben Dosierung wird, ohne dass jemand es merkt.

**Unterscheidung (keine Abwägung).** Der **Fließtext ist eine Darstellung** — sie kann zerbrechen,
und dann entstehen Bruchstücke, die wie Vollständigkeit aussehen. Also **alles oder nichts**. Die
**strukturierten Messwerte sind keine Darstellung** — sie kommen byte-treu aus dem JSON (135, mg/dl,
Datum), haben mit dem defekten XHTML nichts zu tun und können nicht halb sein (ein `valueQuantity`
ist da oder nicht — es gibt kein Fragment eines Zahlenwerts).

**Entscheidung.**
- `_fhirNarrativeSicher` parst **streng** (`parseXML(…, true)`). Jedes Div, das nicht sauber-
  vollständig wohlgeformt ist → **`null`** (Defekt-Signal), nicht ein geretteter Teil-String.
- **Alles-oder-nichts auf Dokument-Ebene:** sobald IRGENDEIN `text.div` defekt ist, wird das
  GANZE Narrativ unterdrückt — auch die sauberen Sektionen, denn eine stillschweigend fehlende
  Sektion wäre selbst irreführend.
- **Messwerte bleiben** (byte-treu aus dem JSON, Option 1). Sie zu unterdrücken, weil an anderer
  Stelle ein Anführungszeichen fehlt, wäre Sippenhaft und hätte einen realen Preis: ein Bürger mit
  pathologischem Wert sähe ihn nicht.
- **Ehrlicher Hinweis, der die Grenze benennt** (`mappeNarrativDefekt`): „Die lesbare Fassung
  dieses Dokuments ist fehlerhaft und wird nicht angezeigt. Die unten stehenden Messwerte stammen
  unverändert aus den Daten. **Das Dokument kann weitere Angaben enthalten, die hier nicht
  erscheinen.**" Der letzte Satz sagt dem Bürger, dass er nicht alles sieht — genau das war das
  Problem. Ohne Observations greift die Variante ohne Messwert-Bezug (`mappeNarrativDefektOhneWerte`).

**Machbarkeit bestätigt:** alle **18** echten Villa-Marta-Divs (Gazelle-PASSED) sind streng sauber
— der Strikt-Modus unterdrückt KEINE konformen Dokumente (keine falschen Positiven).

---

## Konsequenzen

- Autoritative FHIR-Dokumente sind in der Mappe **lesbar** (Narrativ + Messwerte); der
  Gazelle-Schritt „Imports and Renders" ist inhaltlich erfüllt.
- Die verbatim gespeicherte Datei bleibt **unverändert** (reiner Leser); ohne darstellbaren
  Inhalt gibt es **keinen Ersatztext**, sondern einen ehrlichen Hinweis.
- `parseXML` terminiert nun bei **jeder** Eingabe — ein latenter DoS für alle XML-Konsumenten
  (auch CAMT/XMeld) ist geschlossen.
- **Kein Rendern von Bruchstücken:** ein defekter `text.div` kann nie mehr als scheinbar
  vollständiger, in Wahrheit gekürzter Fließtext erscheinen; die byte-treuen Messwerte bleiben.
- Keine externen Ressourcen, kein Schema-Bump, kein Krypto-Byte. SW-Cache v47→v49.

**Gates (alle gelesen):** volle Behavior-Suite **1339/0** (inkl. +19 parseXML-Robustheitstests
+3 Alles-oder-nichts-Tests; fhir-narrative-render normal grün) · parseXML-Konsumenten (CAMT/XMeld/
Import-Wellen/Konten/autoritativ/code-listen) unverändert grün (lenient-Pfad unberührt) · alle 18
echten Villa-Marta-Divs streng sauber (keine falschen Positiven) · Fuzz 16/16 malformed → `null`/
terminieren, tiefe Verschachtelung → `null` · OSV **CLEAN** · Block-Pin VdCrypto **`8d31c678…`
IDENTISCH** (byte==PORT-VERBATIM.js) · PV-Golden **42/42** byte-identisch.

## Offen

- Firefox/Browser-Screenshot eines gerenderten Samples als visueller Gazelle-„Renders"-Beleg
  (das Rendern ist durch 8/8 gegen die echten Samples bereits maschinell bewiesen).
- Auslieferung an den iPhone-Harness (separater Schritt, Geräte-Strecke) — der Harness steht auf v23.

## Nachtrag (2026-07-12) — Am Gerät bewiesen; die „keine Vorschau" war SW-Cache, nicht Code

Der Renderer ist **am Gerät bewiesen** (Firefox auf dem ausgelieferten Harness, 12.07.): alle **drei**
Gazelle-PASSED-Samples rendern in der Mappen-Vorschau — **58 ips** (beide Diagnosen via Multi-Wurzel +
zwei Messwert-Zeilen inkl. `valueString`), **59 lab** (Narrativ + Messwerte 135 mg/dl · 2026-06-19),
**60 hdr** (neun Sektionen Fließtext + Messwerte). Narrativ + strukturierte Werte + Multi-Wurzel — alle
drei Kategorien belegt; „Imports **and Renders**" erbracht.

- **Der Geräte-Bug war NICHT Code, sondern SW-Cache.** Firefox lud die alte Schale `v29` aus dem
  Service-Worker-Cache (fetch **cache-first per exakter URL**, kein `ignoreSearch` → `?v=<zufall>` oder
  **Strg+Umschalt+R** umgeht ihn; Hard-Reload revalidiert `sw.js` → `activate` löscht `vivodepot-shell-v29`).
  Die Marker „**Original — nur lesbar**" + „**keine Vorschau**" = laufender Code **ohne** FHIR-Zweig = v29.
  Lektion: *Gerät-zeigt-alt = Cache, nicht Code* — erst Hard-Reload, dann debuggen.
- **Lücke, die es durchließ:** Tests riefen `_fhirDokumentAnsichtHTML` **direkt**, nie die Bedingung davor.
  → **Ketten-Test committed `1cc2b96`** (gepusht): `tests/fhir-mappe-vorschau-kette.test.js` —
  `importAutoritativDokument` → `mappeEintrag` → die **exakte** `flowMappeVorschau`-Bedingung → Renderer,
  für lab/hdr/**ips** + Save→Reload. `MED_DOK_TYPEN` erkennt lab/hdr/ips; alle drei mit `mime='application/fhir+json'`.
- **Ausgeliefert + gepusht:** Renderer-Stack + Alles-oder-nichts sind auf `origin/ci-probe-2026-07-02`
  (Endstand `6014183`, gemeinsam mit U2-ADR-077). Harness live: `shell-v30/v31` (12.07.), inzwischen **v32**.
  Die „Offen"-Punkte oben (Screenshot / Harness v23) sind damit **erledigt**.

## Konformität

```konformitaet
aussage:   U2-076: kein `<a>` in der abschließenden Tag-Allowlist des FHIR-Narrativ-Sanitizers
           (_FHIR_NARR_TAGS) und kein Link-/Ressourcen-Attribut (href/src/xlink:href) in der
           Attribut-Allowlist (_FHIR_NARR_ATTRS) — „<a> raus", Allowlist abschließend.
zustand:   prüfbar
pruefung:  tests/allowlist-verbote.test.js#u2-076-kein-a-in-sanitizer-allowlist
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (Stufe 3b der 26-Verbote-Strecke), über `tests/bindung-pruefen.js`
(U2-ADR-098 + Nachtrag). Neu gebaute Prüfung (keine Scanner-Z-Regel deckte diesen Fall — die
[S]-Markierung der Sichtung war falsch, korrigiert 25.07.); läuft in jedem `npm test`. Negativprobe:
ein eingebautes `<a>` in der Allowlist wird erkannt.*
