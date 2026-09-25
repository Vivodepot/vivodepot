# U2-ADR-346 (A2) · Fünf WIZARDS sind real ins Bündel umgezogen — pvwiz/kiwiz kommen über U2-ADR-344, auf einem eigenen Weg

**Datum:** 06.09.2026
**Status:** gebaut, A==B-Abnahme gegen `37038011` grün — zweiter echter Umzug nach U2-ADR-341b
**Status heute:** gilt
**Bezug:** U2-ADR-341/341b (der Mechanismus und der erste Umzug, SITUATIONEN) · U2-ADR-320
(SEKTOREN, `ERLAUBTE_BEREICH_SCHLUESSEL`) · U2-ADR-344 (BMJ-Dokumente, paralleler Umzug
derselben Nacht, anderer Weg) · U2-ADR-304/312 (WIZARDS bindet auf Lesezeit, `_katalogOptionen`
graceful bei leerem Bereich)

---

## 1 · Der Auftrag, und warum er sich verengte

Der Auftrag lautete „WIZARDS, 317 Zeilen" — derselbe Umzug wie U2-ADR-341b, dieselbe Bauform,
angewandt auf den zweiten der ursprünglich vier großen Quelltextblöcke. Er verengte sich im Bau
auf **fünf der sieben Wizards** (`gebwiz`, `anamwiz`, `pflwiz`, `heirwiz`, `umzwiz` — 216 Zeilen),
nachdem gemessen wurde, dass `pvwiz`/`kiwiz` **bereits durch U2-ADR-344 (cb, dieselbe Nacht)
vollständig versorgt sind** — über einen eigenen Bündel-Schlüssel (`dokumente`) und einen eigenen
Mechanismus (`.splice()` in-place statt Schnappschuss), weil dort die Objekt-Identität zwischen
Wizard-Schritt und amtlichem Dokument-Baustein (`PV_BMJ.steps`/`KI_KORPUS.steps`) erhalten bleiben
muss. Zwei Wege, zwei Bündel-Schlüssel, keiner ein Versehen — s. §4.

## 2 · Das Werkzeug: derselbe Klon-Trick, generischer als bei SITUATIONEN

`tools/wizards-ins-buendel-schreiben.js` liest den nativen Bestand aus einem **temporären Klon**,
in dem `TEXTSATZ_EINGEBAUT = Object.freeze({})` gesetzt ist, bevor `_textsatzAufWizardsAnwenden`
läuft — dann injiziert der Mechanismus an KEINER Stelle deutschen Text, und `V.WIZARDS` ist die
pristine, native Struktur. Anders als bei SITUATIONEN (U2-ADR-341b, eine Erlaubnisliste von zwei
Top-Level-Schlüsseln) brauchte dieser Klon **keine manuelle Schlüssel-Allerliste**: die
Textsatz-Injektion trifft WIZARDS an drei verschachtelten Ebenen (Wizard: `titel`/`einleitung`,
Schritt: `frage`, Feld: `label`/`beispiel`/`hilfetext`), und der Klon nimmt sie alle auf einmal —
GEMESSEN: mit leerem Katalog verschwinden alle diese Eigenschaften, der Rest bootet fehlerfrei,
sieben Wizards, keine Ausnahme.

## 3 · Der Bootstrap-Fund: `frage` ist Pflicht, aber Textsatz-injiziert

`erstePartieWizardSchritteDefsPruefen` verlangt `def.frage` als nicht-leeren String, um einen
Schritt anzunehmen (Schutz gegen unvollständige Citizen-Module). Da der Bündel-Eintrag bewusst
KEIN `frage` trägt (Textsatz-injiziert, s. §2), verwarf `buergermodulWizardErsetzen` beim ersten
Bootstrap-Versuch JEDEN Schritt als „form" — `_wizardOptionenAusMaterialisieren`s Auflage-2-Wurf
schlug sofort zu, weil die gerade erst erzeugten Schritte mit einer leeren Liste überschrieben
wurden.

**Der Ausweg gilt NUR für den Bootstrap-Fall** (Wizard existierte noch nicht, wird hier ERST
erzeugt): erst `_wizardAusBuendelErzeugen` aufrufen (das injiziert `frage` live über
`_textsatzAufWizardsAnwenden`), DANN `moduleDefs` aus dem so entstandenen, LEBENDEN
`WIZARD_BY_ID[wizardId].schritte` bauen — der nachfolgende Ersetzen-Aufruf gleicht sich damit
selbst an (no-op im Regelbetrieb). Existiert der Wizard bereits nativ (der unveränderte,
bestehende Weg für ein zweites, z. B. citizen-uploadetes Modul), bleibt `moduleDefs` aus dem
gelieferten Bündel-Eintrag gebaut — dort ist `frage` echter, autorisierter Text, kein
Textsatz-Verweis.

## 4 · Der Scope-Konflikt mit U2-ADR-344 — gemessen, nicht angenommen

Der erste Bau-Versuch behandelte WIZARDS als EINEN homogenen Block und hätte `pvwiz`/`kiwiz` mit
einem reinen JSON-Schnappschuss überschrieben. Ein Testlauf gegen `tests/wizard-pvwiz.test.js`
deckte auf: `PV_BMJ.steps[i].feld` ist NATIV eine **direkte Objekt-Referenz** auf
`pvwiz.schritte[j].feld` (kein Klon) — `_textsatzAufWizardsAnwenden` füllt über diese geteilte
Identität als Nebeneffekt auch `PV_BMJ`s eigene Options-Labels. `JSON.parse(JSON.stringify(...))`
bricht jede solche Referenz; real getroffen: `PV_BMJ.steps[].feld.optionen[].label` verschwand
testweise, sobald `pvwiz` über den Bündel-Weg liefe.

cb hatte dieses Problem zur selben Zeit, unabhängig, für dieselben zwei Wizards bereits gelöst
(U2-ADR-344): `PV_BMJ.steps`/`KI_KORPUS.steps` bleiben `Object.freeze`-geschützte Arrays, deren
INHALT per `.splice()` in-place ersetzt wird (die Array-Referenz bleibt erhalten, `Object.freeze`
sperrt nur gegen Neuzuweisung der Eigenschaft, nicht gegen `.splice()` am Inhalt) —
`pvwiz.schritte`/`kiwiz.schritte` werden danach über zwei extrahierte, wiederverwendbare
Transform-Funktionen (`_pvBmjSchrittZuWizardSchritt`, `_kiKorpusSchrittZuWizardSchritt`,
`_pvwizEigeneSchritte`) neu gebaut, in `_dokumenteAusBuendelMaterialisieren()`, über den
`dokumente`-Bündel-Schlüssel.

**Entscheidung (nach cbs Bestätigung):** A2 verengt sich auf die fünf Wizards ohne
amtlichen Dokument-Bezug. `pvwiz`/`kiwiz` sind **NICHT offen** — ihre native „Leere" ist kein
Rest, sondern cbs fertiger, unabhängig getesteter Mechanismus. Ein `wizards`-Bündel-Eintrag für
diese zwei IDs ist kein Bestandsfall, sondern ein Fund: `WIZARD_BUENDEL_VERBOTENE_IDS` im Kern
WIRFT, wenn `buergermodulBuendelAnwenden` einen von beiden im `wizards`-Schlüssel findet — zwei
fertige Wege dürfen sich nicht still gegenseitig überschreiben.

## 5 · Der zweite Live-Bindungs-Fund: `_katalogOptionen`-Getter froren ein

Ein zweiter Testlauf (`tests/sektoren-leer-ueberlebt.test.js`, U2-ADR-304s eigener Beleg) deckte
auf: acht Wizard-Felder (in den fünf migrierten Wizards) lasen ihre `optionen` nativ über
`get optionen() { return _katalogOptionen(sektorId, feldId, erlaubteWerte); } }` — LIVE, bei
jedem Zugriff neu, damit ein zur Laufzeit angedockter Bereich (oder ein leeres SEKTOREN,
U2-ADR-312) den Assistenten erreicht, nicht nur den Bereich selbst. Der JSON-Schnappschuss fror
diesen Getter zu seinem Wert beim Erfassungszeitpunkt ein — GEMESSEN: `heirwiz.familienstand`
verlor genau diese Lebendigkeit, die Probe „liefert `[]` statt zu werfen, wenn der Bereich ganz
fehlt" schlug fehl, weil `familienstand` weiterhin die beim Erfassen echten Werte zeigte.

**Zwei Wege standen zur Wahl:** den Verlust als bekannten, dokumentierten Tradeoff stehen lassen
(der Maßstab dagegen: „alles ist modular" — ein zur Laufzeit angedocktes Bereichs-Modul muss in
JEDEM Assistenten ankommen, der auf dieses Feld verweist, nicht nur im Bereich selbst — friert die
Option ein, sieht die Bürgerin die Bereiche, die beim BAUEN galten, nicht die ihres Depots), oder
die Lebendigkeit wiederherstellen. Entschieden: **Weg A**, mit derselben Bauform wie `optionenAus`.

### Die Erhebung — generisch, nicht aus einer Liste

`_katalogOptionenGetterErheben(html)` scannt den NATIVEN Quelltext der fünf Wizards per Regex nach
`_katalogOptionen\('sektorId', 'feldId'(, erlaubteWerte)?\)` und hält die Trefferzahl gegen zwei
UNABHÄNGIGE Kontrollen: die am LEBENDEN Objekt gefundenen Getter (`Object.getOwnPropertyDescriptor`)
und die tatsächlich zugeordneten Referenzen. Laufen die drei Zahlen auseinander — oder ist eine
davon null — wirft der Schreiber. Eine neunte Stelle, die eines der beiden Verfahren nicht kennt,
fällt damit auf einer der drei Zahlen auf, nicht weil jemand sie im Voraus kannte.

### Die Referenz: `katalogOptionenAus` — wörtlicher Spiegel von `optionenAus`, EIN Unterschied

```json
"katalogOptionenAus": { "sektorId": "identitaet", "feldId": "familienstand", "erlaubteWerte": ["verh", "elp"] }
```

Der Unterschied zu `optionenAus`: der Kern setzt **keinen Wert**, sondern installiert einen
**LIVE Getter** (`Object.defineProperty(feld, 'optionen', { get() { return
_katalogOptionen(...); } })`) — U2-ADR-304 verlangt laufendes Neu-Lesen, kein Schnappschuss.
`_katalogOptionen` selbst ist bereits graceful (liefert `[]` bei fehlendem Bereich, U2-ADR-312) —
anders als bei `optionenAus`/`SITUATION_BY_ID` braucht es hier keinen Vorab-Check.

### Zwei getrennte Zähler, nicht einer — der Fund, der beinahe die eigene Zusicherung entwertet hätte

`_wizardOptionenAusMaterialisieren` verarbeitet beide Referenz-Arten im selben Durchlauf, derselben
Funktion — „ein Mechanismus, eine Stelle". Aber: **ein gemeinsamer `gefunden`-Zähler über beide
Arten hätte Auflage 2 geschwächt statt vereinheitlicht.** Verschwindet der EINE
`optionenAus`-Verweis (gebwiz), aber die acht `katalogOptionenAus`-Verweise bleiben, hielte ein
Summenzähler die Gesamtzahl über null — und genau die Referenz, die verschwand, bliebe unbemerkt.
Real getroffen: die bestehende Auflage-2-Gegenprobe (`tests/wizard-optionen-aus-materialisieren-
u2-adr-341.test.js`, entfernt den einzigen `optionenAus`-Verweis) hörte auf zu werfen, sobald ein
gemeinsamer Zähler kam. Ein Wächter, der zwei Gegenstände in einer Zahl zusammenfasst, bewacht
keinen von beiden vollständig.

**Behoben:** `gefundenSituation`/`materialisiertSituation` und `gefundenKatalog`/
`materialisiertKatalog` getrennt, je mit eigener `wizardsAngewandt`-gegateter Zusicherung. Eine
neue Gegenprobe (alle acht `katalogOptionenAus` entfernt, `optionenAus` bleibt) beweist die
Unabhängigkeit: der Katalog-Zweig wirft, obwohl der Situations-Zweig weiterhin genau einen Treffer
zählt.

### Das Ergebnis, ohne die Probe anzufassen

`tests/sektoren-leer-ueberlebt.test.js` — U2-ADR-304s eigener, unveränderter Beleg — ist wieder
5/5 grün: `heirwiz.familienstand` liefert bei leerem SEKTOREN `[]` (kein Wurf) UND bei befülltem
SEKTOREN die echten, AKTUELLEN Werte. Eine Zusicherung, für die man die Probe hätte anpassen
müssen, wäre keine wiederhergestellte Zusicherung gewesen.

## 6 · Die Klasse: drei Live-Bindungen an einem Abend, ein aufgeschobener Vereinigungs-Zug

Drei Fälle derselben Art traten in dieser Nacht auf, alle mit derselben Ursache: **das Bündel
trägt Werte, keine Beziehungen** — Code, geteilte Objekt-Identität und live neu ausgewertete
Bindungen sind drei Formen von Beziehung, die ein `JSON.parse(JSON.stringify(...))`-Schnappschuss
strukturell nicht mitnehmen kann, unsichtbar, weil das Ergebnis gleich aussieht und nur der
Nebeneffekt fehlt:

```
1  get frage()/hilfetext()/feld()   liest live aus dem Sektorfeld       U2-ADR-344 (cb),
   (_pvwizEigeneSchritte)                                               `_dokumenteAusBuendelMaterialisieren`
2  optionenAus                      Situations-Bündel-Anteil,           U2-ADR-341/346 (hier),
                                     kann fehlen, Wert einmalig gesetzt  `_wizardOptionenAusMaterialisieren`
3  katalogOptionenAus               _katalogOptionen liest              U2-ADR-346 (hier),
                                     SEKTOR_BY_ID, LIVE Getter           `_wizardOptionenAusMaterialisieren`
```

Fall 1 lebt in cbs Materializer (`_dokumenteAusBuendelMaterialisieren`), Fälle 2/3 in diesem ADRs
Materializer (`_wizardOptionenAusMaterialisieren`) — **bewusst nicht heute Abend zusammengeführt**:
Fall 1 anzufassen, während cb an der eigenen A==B-Abnahme baut und dieser Zug an A2, wäre ein
dritter Koch in zwei fremden Küchen gewesen. Der Vereinheitlichungs-Zug ist eingereiht, für nach
den laufenden Achsen, mit dem Ziel: EINE Stelle, an der nach der Bündel-Anwendung jede benannte
Live-Bindung wiederhergestellt wird, statt drei (oder vier, oder fünf) unabhängig gebauter
Tabellen, die auseinanderlaufen können. Ein bewusst aufgeschobener Zug ist etwas anderes als ein
übersehener — deshalb steht er hier, nicht nur im Kopf.

## 7 · Die Anker-Reparaturen — dieselbe Klasse wie U2-ADR-341b §9/§10, an neuen Stellen

Zwei geteilte Test-Fixtures nullten das GANZE `BUERGERMODUL_BUENDEL` für „kein Bündel, native
Wahrheit" — seit A1/A1b/A2 trifft das mehr als SEKTOREN allein:

- `tests/e4-buergermodul-buendel-abnahmebeweis-u2-adr-310.test.js`s `sektorenLeeren` und
  `tests/sektoren-leer-ueberlebt.test.js`s `_ohneEingebettetesBuendel` — auf gezieltes
  `bereiche: {}` im Bündel-JSON umgestellt statt das ganze Bündel zu nullen.
- `tests/fixtures/buergermodul-buendel-varianten.js`s `ohneBuendel()` — bewusst UNVERÄNDERT
  gelassen (geteilte Fixture, „kein Bündel" ist dort die korrekte, generische Bedeutung); der
  eigentliche Fix saß im KERN (§5, `wizardsAngewandt`-Gate), nicht in der Fixture.

`tools/wizards-ins-buendel-schreiben.js`s eigener Bündel-Lese-Anker (`html.indexOf("');")`) wurde
zusätzlich escape-bewusst gemacht (`jsSingleQuoteStringEnde`, wirft bei Unklarheit) — derselbe
Anker-Fehler, den `ce` in `tools/situationen-ins-buendel-schreiben.js` fand. Gemessen: der
migrierte Wizard-Inhalt trägt null Apostrophe/Backslashes (dieselbe „Glück der Daten"-Lage wie
das Situationen-Werkzeug), die Reparatur schadet nicht und schützt gegen künftigen Inhalt.

## 8 · Der Fixture-Wächter selbst brach — und derselbe Anker zweimal an einem Tag

`tests/mit-modul/waechter-selbsttest.test.js` (baut JEDE Fixtur-Fabrik aus `tools/waechter-
register.js` gegen die echte `vivodepot.html`, vor jeder teuren Suite gefahren) fand drei
weitere kaputte Anker, ALLE von A2 verursacht, ALLE nachgezogen statt neu gebaut:

```
W-8-doppelerfassung        alt: 'const WIZARDS = Object.freeze('   → 'let WIZARDS = Object.freeze('
W-ascii-umlaut-in-label    alt: 'const WIZARDS = Object.freeze('   → 'let WIZARDS = Object.freeze('
W-6-wizard-ohne-verzweigung  alt: natives anamwiz-Feld              → kompakte JSON-Form (Bündel)
```

Bei den ersten beiden musste NICHT nur `alt`, sondern auch der `neu`-Text (der die Original-Zeile
nach dem Einfügen wiederherstellt) nachgezogen werden — ein halb nachgezogener Anker wäre grün
gelaufen und hätte NACH der Mutation eine `const WIZARDS`-Zeile hinterlassen, die es nicht mehr
gibt: kein Absturz, aber ein falsch hergestellter Zustand, unsichtbar hinter einem grünen Haken.

**`W-6-wizard-ohne-verzweigung` brach an DEMSELBEN Tag ZWEIMAL, aus ZWEI verschiedenen Ursachen:**
`cb` hatte den Anker vormittags von `PV_BMJ.steps` weg auf ein natives `anamwiz`-Feld gezogen
(U2-ADR-344, weil PV_BMJ selbst wanderte) — und dieser NEUE Anker brach hier ein zweites Mal,
weil `anamwiz` selbst zu den fünf A2-Umzügen gehört. Zwei Reparaturen an derselben Stelle,
beide zum Zeitpunkt ihres Baus korrekt, beide vom jeweils NÄCHSTEN Umzug wieder gebrochen.

**Die Klasse, benannt:** ein Anker, der auf INHALT zeigt — eine Quelltextzeile, ein
natives Feld, ein `const`/`let` vor einem Bezeichner — bricht EINMAL JE UMZUG, der diese Zeile
bewegt. Es bleiben vier weitere Achsen und der deutsche Rechtsraum; derselbe Anker wird darum
voraussichtlich noch mehrfach brechen, nicht weil das Suchmuster falsch ist, sondern weil der
GEGENSTAND, an dem es hängt, sich bewegen kann. Ein Anker gehört an etwas, das ein Umzug nicht
verschiebt — eine Kennung, einen Registereintrag, eine Zusicherung —, nicht an eine Zeile
Quelltext. Nicht heute Abend gebaut („Wächter-Anker an Struktur statt an Inhalt" ist
als eigener Zug nach den Achsen eingereiht) — hier nur benannt, damit der nächste Umzug die Klasse
erkennt, statt sie ein viertes Mal als Einzelfall zu reparieren.

## 9 · Der Commit-Versuch selbst fand drei weitere Funde — einer davon im echten Produkt-Wächter

Der erste vollständige Gate-Lauf (nach zwei Rebases, Kanon zuletzt `00552f05`) fand drei weitere
Fälle. Der erste ist ein positiver Gegenpol, die anderen zwei sind die SECHSTE Erscheinung der
§8-Klasse an einem einzigen Abend — und die erste davon nicht in einer Probe, sondern im echten
Produkt-Wächter selbst:

**`buergermodulWizardErsetzen` verließ die Grundlinie der Unverdrahteten (A253,
`tools/nur-vom-test-erreicht-grundlinie.json`).** Ihr eigener, am 06.09. geschriebener Eintrag
endete mit „GEHOERT HERAUS, sobald ein Aufrufer sie tatsaechlich nutzt" — dieses A2 IST dieser
Aufrufer (`buergermodulBuendelAnwenden`s Wizard-Zweig). Aus beiden Stellen der Grundlinie
entfernt. Eine Grundlinie, die ihr eigenes Ende benennt und es dann auch erlebt, ist genau der
Sinn, für den sie geschrieben wurde.

**`tools/w15-eine-quelle-statt-kopien-pruefen.js` — die sechste Erscheinung, erstmals in einem
Produkt-Wächter statt in einer Probe.** Der Wächter hing an `const WIZARDS = Object.freeze(`, um
den WIZARDS-Quelltextbereich abzugrenzen und ihn nach literalen Katalog-Duplikaten zu
durchsuchen. Nach dem `let`-Wechsel (§2) fand der Anker nichts mehr — der Suchbereich wurde
lautlos LEER, und die Positivkontrolle blieb GRÜN, ohne ein einziges Zeichen geprüft zu haben.
**Ein Wächter, der nichts findet, weil er nichts mehr sieht, meldet dasselbe wie einer, der
nichts zu beanstanden hat** — der Unterschied zwischen einem stillen Loch und einem echten Fund
verschwindet genau an dieser Stelle, und die Positivkontrolle, die ihn hätte fangen sollen, lief
selbst im leeren Bereich. Gefangen hat es allein der eigene Rot-Beweis der Datei
(`tests/w15-eine-quelle-statt-kopien.test.js`), der GENAU DAFÜR gebaut war.

Behoben: Start- UND Endanker regex-basiert (`const|let`), UND eine Wurf-Zusicherung ergänzt —
fehlt einer der beiden Anker, wirft `pruefeAssistentenDuplikate` jetzt statt einen leeren Bereich
stumm zu akzeptieren. Nicht der Regex war das eigentliche Problem, sondern dass Abwesenheit wie
Unauffälligkeit aussah. Rot-bewiesen: eine Kopie ohne jeden `WIZARDS`-Bezeichner wirft.

Der dritte Fund (`tests/textsatz-vollstaendigkeit-optionslabel.test.js`, pretty-printed
`id: 'familienstand'`-Anker) ist eine gewöhnliche, siebte Wiederholung derselben §8-Klasse, ohne
neue Eigenschaft — auf die kompakte JSON-Form nachgezogen.

Volle betroffene Testrunde nach allen drei Reparaturen: 177/177 grün.

### Nachtrag zum Commit-Versuch: zwei weitere Funde, eine neue Unterklasse

Ein zweiter Commit-Versuch (voller `npm test`-Lauf, nicht nur der Gate-Ausschnitt) fand zwei
weitere Brüche — die achte und neunte Erscheinung des Abends, aber die neunte gehört zu einer
Unterklasse, die §7/§8 noch nicht kannten.

**`tests/erzeuger-deckung-wizards-katalog.test.js` (achte Erscheinung, gewöhnlich).**
`katalogVerweiseAusQuelle()` scannte den ROHEN `WIZARDS`-Quelltext per Regex nach
`_katalogOptionen(...)`-Aufrufen — genau die acht Aufrufe, die §5 in `katalogOptionenAus`-JSON-
Referenzen verwandelt hat. Der Anker (`const WIZARDS`) fand nichts mehr, UND selbst mit `let`
nachgezogen hätte der Regex null Treffer geliefert, weil der literale Aufruf nirgends mehr im
Quelltext STEHT. Behoben durch einen Quellwechsel, nicht nur einen Anker-Patch: die Funktion
liest die acht Referenzen jetzt aus dem GELADENEN `V.WIZARDS` (`feld.katalogOptionenAus`) statt
aus dem rohen Text — „aus der Quelle gezogen, nicht gepflegt" bleibt derselbe Grundsatz, nur an
der Stelle, an der die Quelle heute tatsächlich liegt.

**`tests/inline-texte-ratsche.test.js` [Ratsche·Rot·Zug 3] (neunte Erscheinung, NEUE
Unterklasse — ein Anker, der ETWAS FINDET, das die Messung nicht ÜBERLEBT).** Die bisherigen acht
Funde waren alle vom selben Muster: ein Anker sucht Text, der Text ist umgezogen, der Anker
findet NICHTS und der Suchbereich wird lautlos leer. Dieser neunte Fund ist ein anderer, bisher
nicht benannter Fehler derselben Familie: die Pflanzung LANDET im Quelltext, sogar im geladenen
Baum — und wird trotzdem nie gemessen, weil sie eine von ZWEI unabhängigen, erst beim
Nachvollzug entdeckten Verarbeitungsstufen nicht übersteht:

1. Der ursprüngliche Anker (`schritte: [`) traf danach — nach dem Umzug der fünf Wizards — nur
   noch `pvwiz`/`kiwiz`. Deren `schritte`-Array wird bei JEDEM Boot durch
   `_dokumenteAusBuendelMaterialisieren()` (U2-ADR-344, §4) komplett NEU GEBAUT
   (`pvwiz.schritte = [...PV_BMJ.steps.map(...), ..._pvwizEigeneSchritte()]`) — eine native
   Pflanzung dort überlebt bis zum Parse, aber keine Millisekunde länger.
2. Der naheliegende Ausweichort — ein komplett NEUES Feld ins Bündel eines der fünf migrierten
   Wizards pflanzen — überlebt ebenfalls nicht: `erstePartieWizardSchritteDefsPruefen` verwirft
   jede Feld-Kennung, die nicht in der `erlaubteIds`-Erlaubnisliste steht, STILL, ohne zu
   werfen (`bericht.verworfen`, nie geprüft). Ein `label` auf ein BESTEHENDES Feld zu setzen
   überlebt zwar beide Stufen, wird aber von `messen()`s `imSatz`-Prüfung maskiert, sobald das
   Feld sein `label` schon aus `TEXTSATZ_EINGEBAUT` bezieht — der Zähler hält jeden Text mit
   Kennung im Satz für „nicht mehr inline", unabhängig davon, ob eine inline-Kopie danebenliegt
   (das ist der eigentliche Gegenstand der separaten `[Ratsche·Doppelt]`-Probe, nicht dieser).

   Behoben durch eine Art (`platzhalter`), die für das Zielfeld weder nativ noch im Satz
   existiert — die einzige Pflanzung, die alle drei Stufen unbeschadet übersteht und tatsächlich
   gezählt wird.

**Die Lehre, die über §7/§8 hinausgeht:** ein Anker kann durch eine Migration nicht nur
BLIND werden (nichts mehr finden), sondern auch WIRKUNGSLOS — er findet noch etwas, trifft
sogar eine syntaktisch gültige Stelle, aber ein NACHGELAGERTER Verarbeitungsschritt (Neubau,
stille Verwerfung, Satz-Maskierung) räumt die Pflanzung wieder ab, bevor die Probe sie sieht.
„Findet der Anker noch etwas?" ist darum die falsche alleinige Frage; die richtige ist „übersteht
die Pflanzung JEDEN Schritt bis zur Messung?" — geprüft wird das nur durch tatsächliches
Booten und Nachsehen am geladenen Baum, nicht durch Lesen des Anker-Treffers allein.

Beide Dateien für sich grün (9/9 `erzeuger-deckung-wizards-katalog`, 8/8 `inline-texte-ratsche`);
der volle `npm test`-Lauf nach allen fünf Reparaturen: 7584/7584 grün, 51 Suiten, 0 Fehlschläge.

## 10 · A==B, das Maß

```
[A-Seite] byte-genau zu Commit 37038011                                   passed
[A==B] PDF-Modelle, zehn Exportkanäle, Datei-Rundlauf                     passed
[Gegenprobe · feldWeglassen/feldUmbenennen/sektionenTauschen/xshareInhalt] passed (4×)
```

Alle zehn Proben grün, NACH dem Leeren der fünf nativen Wizard-Einträge — dieselbe Reihenfolge
wie U2-ADR-341b verlangt (der Maßstab ist der ausgelieferte Endzustand, nicht der Zwischenschritt).

## 11 · Rebase auf U2-ADR-345 (v609→v611) — ein Merge-eigener Fund, keiner der Klasse

Der Kanon wanderte während dieser Arbeit auf `1eb30955` (U2-ADR-345, vier Dokumentmodule +
STANDARD_VORLAGEN verlassen ebenfalls den nativen Block). Der einzige echte Konflikt lag in der
EINEN Zeile `const BUERGERMODUL_BUENDEL = JSON.parse('...')` — beide Seiten fügten disjunkte
Bündel-Schlüssel hinzu (345: `dokumentModule`/`standardVorlagen`; 346: `wizards`), `dokumente`/
`bereiche`/`situationen` blieben auf beiden Seiten deckungsgleich (geprüft, nicht angenommen).
Aufgelöst durch Parsen beider Seiten und Zusammenführen der Schlüssel, nicht durch Text-Merge.

Der Merge selbst führte einen NEUEN, eigenen Fund ein, keine Wiederholung der Anker-Klasse:
`JSON.stringify()` beim Zusammenführen re-serialisiert C1-Steuerzeichen (U+007F–U+009F, hier
vier Vorkommen aus dem 345-Anteil) als ROHES Byte, nicht als `\uXXXX` — anders als C0-Zeichen,
die `JSON.stringify` selbst escaped. `tests/keine-rohen-steuerzeichen.test.js` fing es sofort
(4 Funde, Zeile 22811). Behoben durch eine eigene Nachbehandlung, die jedes C1-Zeichen nach dem
Zusammenführen wieder auf `\uXXXX` zieht, bevor die Zeile zurück in `vivodepot.html` geschrieben
wird. `SCHALEN_STAND`/`CACHE` v610→v611 (Lockstep-Wächter verlangt einen weiteren Bump, weil sich
die Bytes ohne diesen Fix erneut geändert hätten).

## 12 · Konformität — der Riegel als Zusicherung, nicht nur als Code

Gemessen (0a, über den echten Ladeweg, 07.09.2026): `WIZARD_BUENDEL_VERBOTENE_IDS` steht im Kern
und wird von `buergermodulBuendelAnwenden` geprüft — aber bis heute übte KEINE Probe den Wurf
selbst, nur seine WIRKUNG (dass pvwiz/kiwiz nach der Materialisierung echte Schritte tragen). Ein
Riegel, den niemand anspricht, sieht in jeder grünen Suite genauso aus wie einer, der wirklich
hält — dieselbe Lehre wie §8/§9 dieses ADR, nur umgekehrt: dort ein Anker, der nichts mehr FAND,
hier ein Riegel, der nie GEPRÜFT wurde.

```konformitaet
aussage:  pvwiz/kiwiz bleiben für immer nativ — ein `wizards`-Bündeleintrag für eine der beiden
          IDs wird von `buergermodulBuendelAnwenden` abgewiesen (WIZARD_BUENDEL_VERBOTENE_IDS,
          §4). Grund: ihre Schritte entstehen aus `PV_BMJ.steps.map(_pvBmjSchrittZuWizardSchritt)`
          / `KI_KORPUS.steps.map(_kiKorpusSchrittZuWizardSchritt)` — demselben Aufruf, der auch
          PV_MODUL/KI_MODULs Dokument-Generator speist (U2-ADR-344 §5). Ein
          `JSON.parse(JSON.stringify(...))`-Schnappschuss (der Weg der fünf migrierten Wizards,
          §2) bricht diese GETEILTE Objekt-Identität real — gemessen 06.09.2026:
          `PV_BMJ.steps[].feld.optionen[].label` verschwand testweise, sobald pvwiz über diesen
          Weg liefe. Der Riegel ist darum keine Vorsichtsmaßnahme, sondern die einzige Weise, die
          Identität zu erhalten, die U2-ADR-344 §3/§4.1 verlangt — zwei Wege für denselben Wizard
          würden sich sonst still überschreiben.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wizard-optionen-aus-materialisieren-u2-adr-341.test.js#`wizards.pvwiz` im Bündel wirft wirklich, statt nur eine Zusicherung zu behaupten
pruefung: tests/wizard-optionen-aus-materialisieren-u2-adr-341.test.js#`wizards.kiwiz` im Bündel wirft wirklich, statt nur eine Zusicherung zu behaupten
pruefung: tests/wizard-optionen-aus-materialisieren-u2-adr-341.test.js#eine ERLAUBTE Wizard-Id im selben Bündel-Zweig wirft NICHT — der Riegel trifft gezielt, nicht pauschal
```
