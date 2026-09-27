# U2-ADR-136: `verborgenWenn` ist der eine Mechanismus für gegenstandslose Wizard-Schritte — nicht mehr auf kiwiz beschränkt

**Status:** Akzeptiert
**Datum:** 11.08.2026
**Kategorie:** ARCHITEKTUR
**Grundlage:** interner Auftrag „Assistenten-Sinnhaftigkeit" (11.08.2026),
Beobachtung am Heirats-Assistenten (Bildbeleg), U2-ADR-102 (Ursprung des Mechanismus,
bislang nur in `kiwiz` verdrahtet), U2-ADR-032 (§ „Navigation strikt linear … keine bedingten
oder überspringenden Schritte").
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `wizardSchrittVerborgen`/`wizardSichtbareIndizes`
  (unverändert, U2-ADR-102), `PV_VERBORGEN_WENN` (neue Lookup-Tabelle, angewandt in der
  `PV_BMJ.steps.map()` des `pvwiz`-Schritte-Arrays), `pflwiz`-Schritt `pflegegeld_betrag`
  (direktes `verborgenWenn`), `heirwiz`-Schritte `familienstand`/`steuerklasse` (eingeschränkte
  `optionen`, verwandter aber eigener Mechanismus — s. Abgrenzung unten), neuer Wächter
  `tools/w14-wizard-katalog-anlass-pruefen.js`.
- **Sprint-Commits:** `a2d534f` (Zug 1, Kataloge), `feeefca` (Zug 2, verborgenWenn), `0a3111c`
  (Zug 3, W-14).
- **ADR-Bezug:** U2-ADR-102 (Ursprung, hier in der Reichweite erweitert), U2-ADR-032 (§ „keine
  bedingten Schritte" — hiermit endgültig abgelöst, s. u.), W-6 (`tools/w6-wizard-ohne-
  verzweigung-pruefen.js`, interner Auftrag „Die vier übrigen Wächter", 09.08.2026 — hatte die vier
  jetzt gebauten Fälle bereits als „klare verborgenWenn-Kandidaten" dokumentiert, aber
  ausdrücklich nicht gebaut, „weil dieser Auftrag repariert nichts").
**Status heute:** gilt — Beleg `tests/assistenten-sinnhaftigkeit-zug2.test.js#[Assistenten·Zug2]
pflwiz.pflegegeld_betrag: versteckt bei Sachleistung, erscheint bei
Pflegegeld/Kombinationsleistung`.

---

## Kontext — ein Mechanismus, ein Anwendungsfall

U2-ADR-102 (26.07.2026) baute `verborgenWenn` für genau einen Fall: `kiwiz`, wo eine
„Untersagung" der digitalen Nachbildung alle Folgeschritte gegenstandslos macht. Der
Mechanismus selbst ist generisch (`{feld, wert}`, liest aus derselben Tasche, in die der Wizard
schreibt) — er wurde nur nirgends sonst verdrahtet. W-6 (09.08.2026) maß das systematisch nach:
fünf Schritte in `pvwiz` trugen Bedingungssprache im Hilfetext („Falls …", „Nur nötig, wenn …"),
ohne `verborgenWenn` zu setzen — vier davon als „klare Kandidaten" mit der genauen Ziel-Bedingung
dokumentiert, aber bewusst nicht gebaut (der Auftrag maß nur, reparierte nicht).

Die Beobachtung am 11.08. (Heirats-Assistent bietet nach einer Heirat sechs Familienstand-
Werte an, obwohl nur zwei gelten) führte zur systematischen Erhebung über alle 7 Wizards/76
Schritte (Zug 0 dieses Auftrags, Bericht) — und zur Entscheidung, den Mechanismus jetzt über
`kiwiz` hinaus zu tragen.

## Entscheidung — zwei getrennte, verwandte Mechanismen

**1. `verborgenWenn` (Schritt-Sichtbarkeit) gilt jetzt für `kiwiz`, `pvwiz` und `pflwiz`.**
Fünf Folgeschritte bekommen die Bedingung, die ihr eigener Hilfetext bereits benennt:
`pv_reichweite_person_andere`/`pv_widerruf_person_andere` (nur bei „andere Person"),
`pv_organspende_vorrang` (nur bei Organspende-Zustimmung), `pv_aktualisierung_frist` (nur bei
befristeter Geltung), `pflwiz.pflegegeld_betrag` (kein Betrag bei reiner Sachleistung — eigener
Fund, vom Auftrag nicht genannt). Derselbe Mechanismus, keine zweite Implementierung — dieselbe
Negativ-Form wie in U2-ADR-102: unterdrückt wird nur, was der Datensatz **aktiv** mit einem
ausschließenden Wert beantwortet hat, nie der unbeantwortete Fall (ein Folgeschritt ist initial
sichtbar, wie `kiwiz`s eigene Schritte auch).

**2. Eingeschränkte Wizard-Kataloge (Options-Auswahl) sind ein VERWANDTER, aber eigener
Mechanismus.** `heirwiz.familienstand`/`.steuerklasse` bekommen keine `verborgenWenn`-Bedingung
— der SCHRITT bleibt immer sichtbar, nur seine `optionen`-Liste ist auf die nach einer Heirat
gültigen Werte eingeschränkt. Das Sektorfeld (`identitaet.familienstand`/`.steuerklasse`) bleibt
mit allen sechs/sieben Werten vollständig — betroffen ist ausschließlich die literale
`optionen`-Kopie im Wizard-Schritt (jeder Schritt trägt seine eigene, unabhängige Kopie, kein
gemeinsames Objekt mit dem Sektorfeld). Neuer Wächter W-14 hält diese beiden bekannten
Einschränkungen als Regression-Schutz fest.

**U2-ADR-032s „keine bedingten oder überspringenden Schritte" ist damit endgültig abgelöst** —
U2-ADR-102 hatte das bereits für `kiwiz` durchbrochen, dieser ADR macht es zur allgemeinen Regel:
ein Wizard-Schritt DARF bedingt sein, wenn seine eigene Bedingung sich aus einer vorangehenden
Antwort DESSELBEN Wizards ableiten lässt.

## Grenze — was `verborgenWenn` nicht kann

`wizardTascheLesen` liest aus der Tasche, in die der Wizard SELBST schreibt (`ziel`-basiert) —
die Bedingung muss ein Feld sein, das ein VORANGEHENDER Schritt DESSELBEN Wizards setzt. Drei
Fälle aus der Zug-0-Erhebung fallen deshalb strukturell heraus, dokumentiert statt gebaut:

- **Offene ODER-Bedingungen** (`pv_situation_eigene`: „falls keine der obigen passt ODER Sie
  ergänzen möchten") — kein einzelner Vorwert, den `{feld, wert}` prüfen könnte.
- **Selbstreferenzielle Hinweise** (`gebwiz.geburt_hebamme`, `anamwiz.impfungen`: „falls noch
  keine feststeht/kein Impfbuch vorhanden, lassen Sie frei") — die Bedingung betrifft die
  FREIWILLIGKEIT derselben Frage, nicht die Sichtbarkeit eines ANDEREN, folgenden Schritts.
- **Cross-Sektor-Vorwissen** (`umzwiz`s Mietverhältnis-Fragen setzen implizit eine Miete voraus,
  ohne `wohnen.wohnung_typ` zu prüfen — ein bereits im Depot stehender, nicht vom Wizard selbst
  gesetzter Wert). `verborgenWenn` kann nur wizard-lokale Antworten lesen, keinen
  Depot-Gesamtzustand — eine Erweiterung dafür ist eine größere, hier nicht getroffene
  Entscheidung.

Kein neuer, allgemeiner Mechanismus wurde für diese drei Fälle gebaut — sie bleiben offene
Befunde im Bericht, keine erfundene Sinnprüfung, die es mechanisch nicht geben kann.

## Was NICHT Teil dieser Entscheidung ist

**Keine vollständige Sinnprüfung aller Wizard-Schritte** — Zug 0s Erhebung ist eine einmalige,
von Menschen geprüfte Momentaufnahme (Bericht), kein laufender Mechanismus, der neue Fälle
derselben Klasse automatisch findet (W-14 ist ausdrücklich nur Regressions-Schutz für die zwei
bekannten Katalog-Fälle, s. Kopfkommentar dort).

**Kein Bestandswert kippt.** Ein bereits gespeicherter, heute „unpassender" Wert (z. B.
`familienstand: 'geschieden'`, weil er im Heirats-Assistenten vor dieser Änderung gewählt wurde)
wird durch keinen dieser drei Züge korrigiert oder entfernt.

## Verifikation

Regel 18, drei Testdateien mit echten rot⇄grün-Proben:
`tests/assistenten-sinnhaftigkeit-zug1.test.js` (Katalog-Einschränkung + Sektorfeld-
Vollständigkeit + Bestandswert-Stabilität), `tests/assistenten-sinnhaftigkeit-zug2.test.js`
(alle fünf `verborgenWenn`-Fälle einzeln, initial-sichtbar-Verhalten, PV_BMJ-Wortlaut
unangetastet, U2-ADR-102-Grenze „kein Löschen durch Anzeige-Gating"),
`tests/w14-wizard-katalog-anlass-pruefen.test.js` (Positivkontrolle: alte Fehlerklasse kehrt
zurück → rot; zu enger Katalog → ebenfalls rot). W-6-Grundlinie und -Test nachgezogen (fünf auf
einen verbleibenden Fund in `pvwiz`, drei verbleibende Fälle auf „begründete Ausnahme" gesetzt).
Browser-Abnahme, echter Klickweg: Heirats-Assistent zeigt Schritt 1 mit genau zwei Optionen
(„verh"/„elp"); Pflege-Assistent mit „Sachleistung" beantwortet überspringt „Wie hoch ist der
Betrag?" und geht direkt zu „Wer übernimmt die Hauptpflege?" — Bildbeleg im Bericht. Volle Suite
plus Konformität gegen Zug 0 — Zahlen im Bericht.
