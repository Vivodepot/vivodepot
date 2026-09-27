# U2-ADR-295 · Drittes Template, wieder auf dem Pro-Modul — Geschäftsführerin, Vertretung/Nachfolge/Notfall

**Datum:** 05.09.2026
**Status:** gebaut, Rot-Beweise über Node-Kern UND echten Browser-Klickweg
**Status heute:** gilt
**Bezug:** U2-ADR-287 (Notarin — Kanzleivertretungsfall, erstes Pro-Template, Vorbild für diese
Form) · U2-ADR-288 (Erbschein-Vorbereitungsauszug, Vorbild für „ab Werk eingelassen" — hier bewusst
NICHT übernommen, s. u.) · U2-ADR-243 (Pro-Modul, sechs Bereiche, 54 Felder je Sprache) · U2-ADR-270
(`module/` bleibt dem Bürgerdepot-Modul vorbehalten)

---

## 1 · Kontext

Die Definition of Done verlangt ein zweites, von der Notarin strukturell
unabhängiges Pro-Template — Beweis, dass der Einlass für einen berufsbezogenen Fremdzweck
allgemein trägt, nicht nur für den einen, verkammerten Fall. Wörtlich:

> „Das Hebammentemplate ist ein Beispiel, evtl. gibt es Unterlagen vom Hebammenverband. Wenn
> nicht, geht auch was anderes. Notartemplate, Steuerberater, Geschäftsführer — irgendwas, was den
> Test erbringen kann." … „individuelle Kunden, zb geschäftsführer kleiner gmbhs, die Nachfolge,
> Vertretung, Notfall klären wollen."

**Entschieden (mit Begründung): Geschäftsführerin einer kleinen GmbH, nicht
Steuerberater(in).** Die Notarin ist ein VERKAMMERTER Fall (Berufsrecht, Notarkammer als
Bezugsgröße). Ein zweiter verkammerter Fall (Steuerberater(in), ebenfalls Kammer-gebunden) hätte
denselben Weg zweimal bewiesen. Die Geschäftsführerin ist der strukturell andere Fall: **keine
Kammer, kein Berufsrecht, kein Herausgeber außer Vivodepot selbst** — dieselbe Form wie beim
Erbschein (U2-ADR-288), diesmal auf dem Pro-Modul statt dem Bürgerdepot.

Die drei Worte — **Vertretung · Nachfolge · Notfall** — sind zugleich der
Inhalt: drei Abschnitte, klein gehalten, keine neue Feldart, kein neues Datenlesen-Primitiv (anders
als die Notarin, die `listenfeldAlle` einführen musste — dieses Template braucht nur, was bereits
existiert).

---

## 2 · Entscheidung

**Template: „Geschäftsführerin — Vertretung, Nachfolge, Notfall"**
(`tools/templates/vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul.json`), `id:
pro-geschaeftsfuehrerin-notfallmappe`, `sektor: 'pro-vertretung-vollmachten'` (Heimat-Bereich,
gleiche Konvention wie die Notarin). Liest elf `datenSchema`-Einträge über VIER der sechs
Pro-Bereiche (`pro-vertretung-vollmachten`, `pro-gesellschaft-nachfolge`,
`pro-kontakte-vertretungsplan`, `pro-aufbewahrung-ordnung`) plus den Bürgersektor `identitaet`
(Kontaktfelder, wie bei der Notarin).

**Bewusste Überschneidung mit der Notarin an drei Feldern** (`tpl_prokura`,
`tpl_nachfolgeklausel_im_gesellschaftsvertrag_vorhanden`,
`tpl_wer_uebernimmt_welche_aufgabe`/Vertretungsplan): das sind dieselben realen Fakten einer
GmbH — wer Prokura hat, ob eine Nachfolgeklausel besteht, wer im Notfall welche Aufgabe
übernimmt —, die zwei unabhängige, unsignierte Templates legitim je aus ihrer eigenen Perspektive
lesen dürfen. Keine der beiden Quellen kennt die andere; beide sind eigenständige
`logikModule`-Bundles.

**Genuin neue Bereiche gegenüber der Notarin:** `pro-aufbewahrung-ordnung` (Bereich 5, „Wer von
diesem Depot weiß") und drei zusätzliche Bereich-1/2-Felder, die die Notarin nicht liest
(Patientenverfügung-Ablageort, Gesellschafterliste-Fassung, Testament/Erbvertrag-Ablageort) — die
elf Felder sind darum kein Nachbau, sondern eine andere, auf die drei genannten Worte
zugeschnittene Auswahl aus demselben 54-Felder-Bestand (`tools/betriebssatz-inhalte.js`).

## 3 · Feldsatz (Auszug — voller Bundle-Inhalt in der Fixture-Datei)

| datenSchema-Schlüssel | typ | Sektor.Feld[.Unterfeld] | Abschnitt |
|---|---|---|---|
| `vertretungsregelung` | feld | `pro-vertretung-vollmachten.tpl_vertretungsregelung` | A — Vertretung |
| `prokura_inhaber` | listenfeldAlle | `pro-vertretung-vollmachten.tpl_prokura[].tpl_wer` | A — Vertretung |
| `nachfolgeklausel` | feld | `pro-gesellschaft-nachfolge.tpl_nachfolgeklausel_…` | B — Nachfolge |
| `gesellschafterliste_stand` | listenfeldAlle | `pro-gesellschaft-nachfolge.tpl_gesellschafterliste[].tpl_fassung_vom` | B — Nachfolge |
| `testament_erbvertrag_ablageort` | feld | `pro-gesellschaft-nachfolge.tpl_testament_oder_erbvertrag_ablageort` | B — Nachfolge |
| `vertretungsplan_aufgabe` / `_person` | listenfeldAlle | `pro-kontakte-vertretungsplan.tpl_wer_uebernimmt…[]` | C — Notfall |
| `wer_weiss_vom_depot` | listenfeldAlle | `pro-aufbewahrung-ordnung.tpl_wer_von_diesem_depot_weiss[].tpl_name` | C — Notfall |
| `patientenverfuegung_ablageort` | feld | `pro-vertretung-vollmachten.tpl_patientenverfuegung_ablageort` | C — Notfall |
| `kontakt_telefon` / `kontakt_email` | feld | `identitaet.telefon` / `identitaet.email` | C — Notfall |

Feld-Ids sind, wie bei der Notarin, die `tpl_`-Slugs aus `_tplFeldId()` — **jeder hier verwendete
Slug wurde vor dem Schreiben der Fixture gegen den echten Kern berechnet**
(`V._tplFeldId('Wer von diesem Depot weiß')` u. a.), nicht von Hand geraten (s. Feedback-Regel
„Beispielfelder aus Aufträgen existieren oft nicht" — gilt sinngemäß auch für selbst hergeleitete
Slugs).

---

## 4 · Ein Baufehler unterwegs, korrigiert vor dem ersten Testlauf

Genau derselbe Fehler wie bei U2-ADR-287: die Fixture enthielt zunächst `„Gesellschaft und
Nachfolgeregelung"` und `„Aufgabe"`/`„Person"` mit einem ASCII-`"` statt des typografischen
schließenden Anführungszeichens `"` als Abschluss der deutschen Anführung — innerhalb eines
JSON-Strings bricht das die Zeichenkette vorzeitig ab. Gefangen durch `JSON.parse()` vor dem
ersten `modulEinlassen()`-Aufruf. **Zweiter Fund derselben Fehlerklasse innerhalb von zwei
Templates am selben Tag** — ein Hinweis, dass diese Falle beim Verfassen von Bundle-Fließtext mit
deutschen Anführungszeichen strukturell wiederkehrt, nicht nur ein Zufall war.

---

## 5 · Erreichbarkeit gemessen — und sie bestätigt die DoD wörtlich, kein Kompromiss

ausdrückliche Auflage: „Erreichbarkeit beweisen, nicht nur Gültigkeit" — nach drei an
diesem Tag aufgetretenen Fällen, in denen etwas korrekt gebaut war und nie ankam (der
Erbschein-Vorbereitungsauszug, U2-ADR-288, war einer davon). Vor dem Schreiben des E2E-Belegs
wurde darum **gemessen, wo die Regal-Karte eines Pro-`logikModul`s tatsächlich erscheint** — ein
Befund, der auch für die bereits gelandete Notarin (U2-ADR-287) gilt, dort aber nie geprüft wurde:

**Eine `logikModul`-Karte erscheint ausschließlich auf der `vorsorge`-Seite, unabhängig vom
eigenen `sektor`-Feld des Bundles.** `vorsorgeRegalHTML(sektorId)` ist die EINZIGE Stelle im ganzen
Kern, die `logikModuleAlsKarten()` rendert, und sie wird nur aufgerufen, wenn
`bereichKann(sektorId, 'vorsorgeRegal')` gilt (`vivodepot.html:45088`). Ein über `bereich`-Typ
angedockter Pro-Bereich trägt nie ein `merkmale`-Feld — es ist nicht Teil von
`BEREICH_MODUL_SCHLUESSEL` (`vivodepot.html:13544`, gemessen: kein Weg, es beim Andocken zu
setzen) — und zeigt darum selbst kein Regal, ganz gleich, welchen `sektor` ein logikModul-Bundle
für sich beansprucht. Empirisch bestätigt (Node-Kern, `renderSektor` + `document.getElementById
('content').innerHTML`): die Karte erscheint in `vorsorge`, nicht in
`pro-vertretung-vollmachten`, obwohl das Bundle genau dorthin `sektor` setzt.

**Das ist der Weg, den die DoD wörtlich verlangt — kein Kompromiss, den dieser Bau hinnimmt.**
Wörtlich: „in Bürgerdepot eingelassenes Juratemplate (Erbschein), in Bürgerdepot
eingelassenes Hebammentemplate." Beide genannten Templates sind PRO-Inhalte — trotzdem verlangt
die DoD ausdrücklich, dass sie IM BÜRGERDEPOT landen: der Schrank (das eine Depot, seine eine
`vorsorge`-Seite) gehört der Bürgerin; die Akte darin (ein Pro-Template wie dieses) gehört
fachlich jemand anderem. Es gibt strukturell KEIN separates
„Pro-Depot" — ein Pro-`logikModul` landet im selben `data.logikModule`-Array wie jedes andere,
und `vorsorge` ist dessen eine, gemeinsame Vitrine, unabhängig vom fachlichen Ursprung des
Inhalts. Der vorsorge-Weg ist darum der RICHTIGE Weg, nicht nur ein möglicher — er setzt exakt
um, was mit „im Bürgerdepot eingelassen" gemeint ist, auch wenn der Inhalt fachlich einer
Geschäftsführerin und nicht der Bürgerin gehört.

**Konsequenz für diesen Bau:** der E2E-Beleg (`tests/e2e/pro-geschaeftsfuehrerin-notfallmappe-
abnahme.spec.js`) geht darum bewusst über `vorsorge`. Das `sektor`-Feld bleibt trotzdem nötig:
`logikModulPruefen` verlangt es als bekannten Sektor-Bezeichner (Gegenprobe unten) — als
Herkunfts-/Docking-Nachweis (die sechs Pro-Bereiche müssen angedockt sein, bevor das Bundle
angenommen wird), nicht als Anzeige-Ort.

**Ausdrücklich nicht Gegenstand einer Korrektur:** dass ein docked Pro-Bereich kein eigenes Regal
zeigen kann (`merkmale` fehlt in `BEREICH_MODUL_SCHLUESSEL`), ist damit kein offener Mangel,
sondern die Struktur, die die „Schrank gehört der Bürgerin, Akte gehört jemand anderem"-Lesart
trägt — sollte eine künftige Sitzung diesen
Absatz als Fehler lesen und „reparieren" wollen, säße sie einer falschen Prämisse auf.

---

## 6 · Rot-Beweis

`tests/pro-geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js` (Node-Kern, sechs Proben):

- Das volle Bundle wird angenommen, ohne einen verworfenen Schlüssel — über den echten
  Fremdmodul-Einlass.
- Gegenprobe: OHNE die Pro-Bereiche vorher anzudocken wird das Bundle verworfen (`SEKTOR_BY_ID`
  kennt `pro-vertretung-vollmachten` noch nicht).
- Leeres Depot: jede Frage bleibt sichtbare Lücke, kein Verschwinden.
- Volles Depot: alle drei Abschnitte (Vertretung/Nachfolge/Notfall) liefern die echten, gesetzten
  Werte, über `dokumentHTML()` — inklusive der Filterregel, dass eine leere Listenzeile nicht als
  `undefined` im gerenderten Array auftaucht.
- Das Bundle landet unsigniert im `logikModule`-Slot (Selbst-Einlass, wie Erbschein und Notarin).
- Rot-Beweis auf den Zuschnitt selbst: die drei Abschnittstitel sind wortgleich „Teil A —
  Vertretung", „Teil B — Nachfolge", „Teil C — Notfall" — bricht rot, sollte dieser Zuschnitt
  künftig verwässert werden.

`tests/e2e/pro-geschaeftsfuehrerin-notfallmappe-abnahme.spec.js` (Playwright, zwei Proben, echter
Browser, echter Datei-Upload für BEIDE Dateien — die vier Pro-Bereiche und das Bundle):

- Karte erscheint NICHT vor dem Einlass, ERST danach, öffnet den Auszug per Klick — leeres Depot
  zeigt nur Lücken.
- Volles Depot: Prokura, Gesellschafterliste-Fassung und Vertretungsplan erscheinen im Auszug in
  Klartext.

`ladeKern()` nach jeder Änderung einzeln geprüft — kein `SyntaxError`.

---

## 7 · Bewusst nicht Teil dieses Pakets

- **Kein Ab-Werk-Einlass ins Bürgerdepot** (anders als U2-ADR-288/Erbschein). Ein Pro-Template
  gehört ins Pro-Modul — die Bürgerin bekommt es nicht, per ausdrücklicher Weisung (05.09.2026).
- **Kein Ab-Werk-Einlass ins Pro-Modul selbst.** Es existiert heute keine reale, eigenständig
  gepackte „Pro-Modul-Produktdatei" (Gerüst + VD Pro + Rechtsraum + Sprache), in der ein solcher
  Einlass ansetzen könnte — `tools/pro-modul-andock-demo.js` und Geschwister sind Demos mit
  Wegwerf-Zertifikaten, keine Auslieferungspipeline. Der Docking-Weg (Bereichs-Datei + Bundle-Datei
  über die Einstellungen-UI) ist darum, wie bei der Notarin, der tragende Weg — nicht ab Werk.
- **Kein neues Datenlesen-Primitiv.** Der Zuschnitt braucht ausschließlich `feld` und
  `listenfeldAlle` (U2-ADR-287) — bewusst klein gehalten, wie beauftragt.
- **`merkmale` für docked Pro-Bereiche bleibt unverändert** (s. §5) — das ist die Struktur, die
  den vorsorge-Weg trägt, kein Mangel, den ein künftiger Bau schließen sollte.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
