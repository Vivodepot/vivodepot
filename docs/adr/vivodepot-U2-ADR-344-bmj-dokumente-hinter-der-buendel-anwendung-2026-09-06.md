# U2-ADR-344 · Die drei amtlichen BMJ-Dokumente verlassen den nativen Block

**Datum:** 06.09.2026
**Status:** gebaut, Rot-Beweis (c) — byte-gleiche Generator-Ausgabe — bestanden
**Status heute:** gilt. `PV_BMJ`/`KI_KORPUS`/`VOLLMACHT_BMJ` sind native Skelette, der
Wortlaut kommt aus `BUERGERMODUL_BUENDEL.dokumente`.
**Bezug:** U2-ADR-341 (dieselbe Kette, für Situations-Optionen statt Dokumente) ·
U2-ADR-319/320 (Bereichs-Umzug, die ursprüngliche Vorlage) · U2-ADR-333 (die vier
Dokument-Module bekommen einen gemeinsamen Kontrakt)

---

## 1 · Der Auftrag

„391 Zeilen amtlicher Rechtstext verlassen das Gerüst" — `PV_BMJ`, `VOLLMACHT_BMJ`,
`KI_KORPUS` (Patientenverfügung, Vorsorgevollmacht, KI-Verfügung) sollen aus dem nativen
Kern in `BUERGERMODUL_BUENDEL` wandern. Der Maßstab: *„exakt ganz genau so wie
die Version in ios-test, aber ohne Fehler und komplett getrennt. Getrennt heißt: der native
Block ist leer, das Bündel trägt alles."*

## 2 · Drei native Leser, nicht einer — gemessen, nicht vermutet

Vor dem Bau wurde jeder Lesezugriff auf die drei Konstanten geprüft. Ergebnis, real am
Kanon durchgespielt (Umbenennung + Leeren in einer isolierten Kopie, `KERN_HTML_PATH`,
nichts am Repo verändert):

```
1  Der WIZARDS-Spread (Parse-Zeit)
   ...PV_BMJ.steps.map(...) / ...KI_KORPUS.steps.map(...)
   innerhalb von `const WIZARDS = Object.freeze(_textsatzAufWizardsAnwenden([...]))`.
   Leert man PV_BMJ/KI_KORPUS, bleibt der Spread STRUKTURELL heil (leere Spread-Operation),
   aber der Wizard hat danach null Schritte — STILL falsch, kein Sturz. `VOLLMACHT_BMJ`
   kommt in der ganzen WIZARDS-Spanne kein einziges Mal vor (kein eigener Wizard, `vvwiz`
   entfallen, U2-ADR-096).

2  Vierzehn Inline-Lesungen in PV_MODUL/KI_MODUL (Parse-Zeit, `abschnitte`-Objektliterale)
   Fünf in PV_MODUL (`einleitung: PV_BMJ.steps.find(...).dokEinleitung`,
   `texte: PV_BMJ.verbindlichkeitKlauseln`, …), neun in KI_MODUL (`einleitung:
   KI_KORPUS.zweckEinleitung`, `texte: [KI_KORPUS.ausschluss]`, …). Eine davon
   (`.find(...).dokEinleitung`) STÜRZT beim Leeren — `.find()` liefert `undefined`,
   `.dokEinleitung` darauf wirft, WÄHREND `PV_MODUL` selbst gebaut wird. Die übrigen 13
   crashen nicht (direkter Property-Zugriff auf ein dann leeres Array/einen leeren String),
   zeigen aber nach dem Leeren dauerhaft nichts an.

3  Zwei weitere String-Felder außerhalb der 14+1 (lazy, kein Parse-Zeit-Risiko, aber
   dieselbe Freeze-Falle)
   `PV_BMJ.eingangsformel` (gelesen in `_pvEingangsformel()`) und
   `PV_BMJ.aerztlicheBestaetigung` (gelesen in zwei `dokAusgabe`-Funktionen). Beide werden
   lazy (bei Bedarf) gelesen, sind also keine Parse-Zeit-Gefahr — aber nach dem nativen
   Leer-Bau für immer leer, wenn sie weiterhin direkt aus `PV_BMJ` lesen (s. §3).
```

`VOLLMACHT_BMJ` hat außer seinem eigenen `.steps`-Feld keinen weiteren nativen Leser
(gemessen, keine `einleitung:`/`texte:`-Inline-Stelle in `VOLLMACHT_MODUL`) — der einfachste
der drei Fälle.

## 3 · Warum `PV_BMJ`/`KI_KORPUS` selbst nicht als Quelle zurückgelesen werden

`Object.freeze` sperrt eine Eigenschaft dauerhaft gegen **Neuzuweisung** — ein Array-**Inhalt**
lässt sich trotzdem per `.splice()`/`.push()` in-place ändern (die Eigenschaft `steps` bleibt
an derselbe Array-Referenz gebunden, nur ihr Inhalt wechselt). Ein **String**-Feld
(`reichweiteEinleitung`, `eingangsformel`, …) hat diese Hintertür nicht: einmal gefroren,
für immer dieser Wert.

Die 14 Blockfelder in `PV_MODUL`/`KI_MODUL` kopieren beim Bau ihres Objekt-Literals **Werte**
(Strings, oder neue Arrays um einen zu diesem Zeitpunkt aktuellen String) — keine lebende
Referenz. Ein Materialisierungs-Durchlauf kann sie darum nicht durch Mutation von `PV_BMJ`
selbst reparieren; er muss direkt in die (nicht gefrorenen) Blockobjekte schreiben, und die
beiden lazy gelesenen Strings (`eingangsformel`, `aerztlicheBestaetigung`) müssen ihre lesenden
Funktionen auf das Bündel umleiten, nicht auf `PV_BMJ` selbst.

## 4 · Die Bauform: Verweis statt Wert, materialisiert hinter der Kette (U2-ADR-341-Prinzip)

Alle 14 native Werte wurden durch benannte Verweise ersetzt:

```js
einleitungAus: { dokument: 'pvBmj', feld: 'pv_situationen', teil: 'dokEinleitung' }
texteAus:      { dokument: 'pvBmj', teil: 'verbindlichkeitKlauseln' }
```

`_dokumenteAusBuendelMaterialisieren()` läuft — wie `_wizardOptionenAusMaterialisieren` —
unmittelbar hinter `buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL)`, muss aber wegen der
Reihenfolge im Kern **eine eigene, spätere Stelle** haben: sie liest `PV_MODUL`/`KI_MODUL`,
die als `const` erst ~17.000 Zeilen weiter unten vollständig initialisiert sind (gemessen:
`ReferenceError: Cannot access 'PV_MODUL' before initialization`, wenn der Aufruf an der
Stelle der übrigen Bündel-Materialisierungen steht). Der Aufruf steht darum direkt hinter
`BETREUUNG_MODUL`, der letzten der vier Dokument-Module.

Für jedes der drei Dokumente, sofern im (nur dem eingebetteten, vertrauenswürdigen Bündel
gestatteten) `BUERGERMODUL_BUENDEL.dokumente`-Zweig vorhanden:

```
1  PV_BMJ.steps / KI_KORPUS.steps / VOLLMACHT_BMJ.steps in-place gefüllt (`.splice`)
   — kommt den lazy Lesern (`_pvOptLabel`, `PV_MODUL.bezugFuer`, `_vmOptLabel`, …) automatisch
   zugute, weil sie beim nächsten Aufruf denselben Array-Inhalt lesen.
2  pvwiz.schritte / kiwiz.schritte komplett neu aufgebaut, aus dem jetzt echten
   PV_BMJ.steps/KI_KORPUS.steps, über DIESELBE Transform-Funktion, die vorher inline im
   WIZARDS-Literal stand (`_pvBmjSchrittZuWizardSchritt`/`_kiKorpusSchrittZuWizardSchritt`,
   extrahiert — ein Konsument, kein zweiter, driftender Nachbau).
3  Die 14 Blockfelder in PV_MODUL.abschnitte/KI_MODUL.abschnitte echt gesetzt.
4  eingangsformel()/aerztlicheBestaetigung() lesen bevorzugt aus dem materialisierten
   Bündel, fallen sonst auf PV_BMJ zurück (bleibt in der Übergangszeit harmlos: nach dem
   Leer-Bau ist der native Wert ohnehin '').
```

**Auflage 1** (abwesend statt leer) gilt für die 14 Verweise selbst — sie fehlen im nativen
Bau nie, tragen aber erst nach der Materialisierung einen echten Wert; das ist derselbe
Mechanismus wie bei `optionenAus`, nur auf `einleitung`/`texte` statt `optionen` angewandt.

**Auflage 2** (wirft bei `gefunden === 0`): `_dokumenteAusBuendelMaterialisieren` zählt jeden
`einleitungAus`/`texteAus`-Fund **unabhängig davon**, ob das Bündel das jeweilige Dokument
schon trägt — sonst würde der Durchlauf schon vor dem eigentlichen Umzug (als die 14 Verweise
gerade erst eingebaut, das Bündel aber noch leer war) fälschlich abbrechen. Diese
Unterscheidung ist dieselbe wie bei `SITUATION_BY_ID` in U2-ADR-341.

## 5 · Ein echter Fund während des Rot-Beweises — und die Klasse dahinter

Der erste Durchlauf des Rot-Beweises (c) — byte-gleiche Generatorausgabe — war ROT: jeder
Wizard-Schritt von `pvwiz`/`kiwiz` verlor `frage` und `hilfetext`.

**Die Klasse, nicht nur der Einzelfall (weitergegeben, gilt für alle vier
Migrations-Achsen A1–A4):**

> **Was NACH einem Textsatz-/Anreicherungs-Lauf neu gebaut wird, ist nie durch ihn gegangen.**
> Es fehlt nichts Sichtbares in der STRUKTUR — es fehlen die Felder, die dieser Lauf ERGÄNZT,
> nicht die, die das Literal selbst trägt. Ein Test, der nur die Struktur prüft (Schlüssel
> vorhanden, Typ stimmt), merkt es nicht — nur ein Vergleich der ECHTEN, gerenderten Ausgabe
> tut es.

Geprüft (lesend, kein Fund): `PV_MODUL`/`KI_MODUL`/`VOLLMACHT_MODUL`/`BETREUUNG_MODUL` selbst
sind — anders als `WIZARDS` — an ihrer eigenen Definition durch KEINEN vergleichbaren
`_textsatzAufXAnwenden(...)`-Wrapper gezogen; die 14 `abschnitte`-Blockfelder bekommen keine
nachträgliche Anreicherung außer der hier gebauten Materialisierung selbst. Der einzige
Nach-Parse-Anreicherungs-Lauf, der die drei Dokumente betrifft, ist der WIZARDS-Wrapper — und
der ist behoben (§5 unten). Damit ist Rot-Beweis (c) nicht nur ein Test, sondern der Beleg:
er prüft die ECHTE Ausgabe, nicht die Struktur, und hätte einen dritten, ungefundenen Fall
ebenfalls gezeigt.

**Ursache, gemessen:** diese beiden Felder stehen **nicht** in `PV_BMJ`/`KI_KORPUS` — sie
werden **einmalig beim Skript-Parse** von `_textsatzAufWizardsAnwenden` auf die WIZARD-
Schritt-Objekte geschrieben (Kennung `wizard:<wizardId>.<feldId>.frage`, nativer
Default-Textsatz, unabhängig von jedem Depot). Der native `WIZARDS`-Bau durchläuft diese
Funktion genau einmal; mein Materialisierungs-Durchlauf **ersetzt** `pvwiz.schritte`/
`kiwiz.schritte` komplett durch ein frisches Array — das läuft nie wieder durch
`_textsatzAufWizardsAnwenden`, also fehlten `frage`/`hilfetext` an jedem neuen Schritt.

**Behoben:** nach dem Neubau von `wiz.schritte` wird `_textsatzAufWizardsAnwenden([wiz])`
erneut auf genau diesen Wizard angewendet — derselbe Lauf, nicht neu erfunden.

**Warum das nicht in `PV_BMJ` selbst auffiel:** `feld`-Objekte werden über `s.feld` als
Referenz (nicht Kopie) in die Wizard-Schritte übernommen — `_textsatzFeldFuellen` schreibt
Options-Labels also direkt auf dieselben Objekte, die auch `PV_BMJ.steps[i].feld` sind. Nur
`frage`/`hilfetext` sitzen am Wizard-SCHRITT selbst (einer eigenen, per `Object.assign`
erzeugten Kopie) — das ist der einzige Ort, an dem der Neubau eine eigene, vom Original
losgelöste Struktur erzeugt.

## 6 · Rot-Beweis (c) — die echte Generator-Ausgabe, nicht die interne Struktur

**Falsche Messung, zuerst verworfen:** ein roher Objekt-Dump von `PV_MODUL.abschnitte` zeigt
Unterschiede, die keine sind — die `einleitungAus`/`texteAus`-Verweisobjekte bleiben als
zusätzliche (vom Generator nie gelesene) Schlüssel am Blockobjekt stehen, neben dem echt
gesetzten `einleitung`/`texte`. Ein Diff auf dieser Ebene zeigt Rauschen, keinen Fehler.

**Der eigentliche Beweis:** die tatsächliche Generator-Ausgabe (`modulDokumentAbschnitte
(PV_MODUL)`/`(KI_MODUL)` — genau das, was `dokumentHTML`/PDF-Erzeugung konsumieren) zwischen
Kanon-Baseline (`0a42c058`) und vollständig geleertem nativen Zustand mit
Bündel-Materialisierung:

```
diff(render(Baseline), render(geleert+materialisiert))  ==  KEINE Differenz
```

Bestanden, nach der Korrektur aus §5.

## 7 · Der Inhalt selbst — skriptgesteuert übernommen, nie abgeschrieben

Die 391 Zeilen wurden nicht neu getippt: aus einem laufenden, unveränderten Kern
(`ladeKern()`) wurden `PV_BMJ`/`KI_KORPUS`/`VOLLMACHT_BMJ` per `JSON.parse(JSON.stringify(...))`
entnommen und per Skript in `BUERGERMODUL_BUENDEL.dokumente` eingefügt (`JSON.stringify` für
das äußere JS-String-Literal — vermeidet die doppelte Escaping-Falle, die an anderer Stelle
heute gefunden wurde, strukturell statt durch Sorgfalt). Kein Zeichen des amtlichen Wortlauts
wurde von Hand abgeschrieben oder verändert.

**Der erste Zug war falsch — der zweite Befund, den die Suite fing.** Die erste Entnahme lief
gegen den GEWÖHNLICH gebooteten Kern — also NACH dem nativen Textsatz-Lauf. Das Bündel trug
dadurch bereits ANGEWENDETEN Text (Options-Labels, `frage`/`hilfetext`), nicht den Zustand des
Literals selbst. Das ist derselbe Fehler wie in §5, nur umgekehrt: nicht zu wenig
mitgenommen, sondern zu viel — und mit derselben Folge in der Gegenrichtung:

> **Trägt das Bündel bereits angewendeten Text, kann ein Textsatz-Modul ihn nie wieder
> überschreiben — der Text ist eingefroren. Ein Textsatz-Modul, das nichts mehr ändern kann,
> ist kein Modul.**

**Gefangen von `tests/inline-texte-ratsche.test.js` (U2-ADR-141):** ~60 Texte standen nach dem
ersten Zug „im Satz UND inline" — GATE ROT, kein Sonderfall, das genau dafür gebaute
Wahrhaftigkeits-Gate. **Die Ratsche wurde nicht aufgeweicht; das Bündel wurde korrigiert.**

**Das Kriterium, das trägt: das Bündel trägt den Zustand VOR dem Textsatz-Lauf, nicht
danach — mechanisch bestimmbar, keine Feldnamen-Liste nötig, altert nicht.** Umgesetzt über
einen temporären, isolierten Klon von `vivodepot.html` mit `TEXTSATZ_EINGEBAUT = Object.freeze({})`
(No-op statt echtem Sprachlauf — „Weg 1"): geladen über `KERN_HTML_PATH`, `PV_BMJ`/`KI_KORPUS`/
`VOLLMACHT_BMJ` daraus entnommen, Original-Repo dabei nie berührt. Die Materialisierung selbst
führt danach — wie in §5 — den passenden Textsatz-Lauf erneut aus (`_textsatzAufWizardsAnwenden`
für PV/KI-Wizard-Schritte, **zusätzlich `_textsatzAufVollmachtBmjAnwenden` für VOLLMACHT_BMJ**,
im ersten Versuch übersehen — derselbe Fehler ein zweites Mal, an der dritten Stelle).

**Die Regel, nicht nur die Beobachtung — `df` ist am selben Tag, an einer vierten Achse
(`SITUATIONEN`), unabhängig auf denselben Fehler gestoßen (Titel/Einführung nach dem Boot
gezogen, als aufgelöster deutscher Text für alle zehn Situationen eingefroren):**

> **Ein Bündel wird nie aus dem laufenden Kern gezogen.** Was der Kern beim Laden ergänzt
> (Textsatz, Anreicherung, jede Form von „wird beim Booten aufgelöst"), gehört nicht ins
> Bündel — sonst trägt es bereits angewendeten Text und friert ihn ein. Die Entnahme läuft
> gegen einen Zustand VOR der Anreicherung, nie gegen den laufenden, gebooteten Kern.

**Ein zweiter, unabhängiger Duplikat-Fund, VOR jeder Textsatz-Frage:** zwei Felder pro Schritt
lagen NIE hinter einem Materialisierungs-Lauf, sondern waren schon in der ursprünglichen,
un­angetasteten Datei doppelt vorhanden — nur unsichtbar, weil außerhalb der von der Ratsche
geprüften Bereiche:

```
`sektion` an JEDEM Schritt        kein einziger Lese-Zugriff im ganzen Kern (`grep` bestätigt,
                                  0 Treffer auf `.sektion` als Feldzugriff) — reines Textsatz-
                                  Artefakt ohne Struktur-Konsumenten, ersatzlos aus dem Bündel
                                  entfernt.
`feld.label` an 8 VOLLMACHT_BMJ-  liegt zusätzlich unter dem SEKTORFELD-Namensraum
Feldern (vm_aufenthalt_bestimmen  (`vorsorge.vorsorge_instrumente/<id>.label`), getrennt vom
u. a.)                            `vollmacht:`-Namensraum, den _textsatzAufVollmachtBmjAnwenden
                                  bedient.
```

**Der zweite Fall war kein reines Entfernen — `tests/u2-adr-322-jeder-traeger-loest-auf.test.js`
(jede registrierte Textsatz-Kennung muss auflösen) schlug danach fehl: der `vollmacht:`-Namensraum
hatte für diese acht Felder KEINE eigene `TEXTSATZ_EINGEBAUT`-Quelle — das native `feld.label`
war ihre EINZIGE Auflösung. Der eigentliche Befund lag also nicht im Bündel, sondern im Katalog:
diese acht Feld-Labels waren nie übersetzbar, nur weil niemand `feld.label` je entfernt hatte.
Behoben durch Nachtrag, nicht durch Entfernen: acht `vollmacht:<id>.label`-Einträge kamen neu in
`TEXTSATZ_EINGEBAUT`, mit demselben Wortlaut, den die Felder bis dahin nur nativ trugen. Danach
lösten beide Namensräume unabhängig auf, `feld.label` konnte aus dem Bündel entfernt werden, und
— geprüft, nicht behauptet — ein Textsatz-Modul kann diese acht Beschriftungen jetzt tatsächlich
überschreiben, was vorher nicht ging.

Beide Entfernungen sind nicht angenommen, sondern gegen den byte-gleichen Rot-Beweis (c)
geprüft — er blieb grün, nachdem beide Felder aus dem Bündel-Inhalt gestrichen wurden.

**Ein dritter Fund, vom BGB-Wächter (`tests/bgb-verweise-pruefen.test.js`) gefangen, nicht
selbst gesucht:** die Referenzzahl zu § 2247 BGB stieg nach der ersten Voll-Entnahme von 10
auf 12. Ursache: `anlageTitel`, `herkunft`, `eingangsformel`, `formhinweis` bleiben bei
`KI_KORPUS` bewusst NATIV (sie werden über eigene, weiterhin lesende Getter bedient, anders
als die übrigen Felder — kein Versehen, siehe §3) — aber die Voll-Objekt-Entnahme (§7, Absatz 1)
nahm sie ZUSÄTZLICH ins Bündel mit auf, wodurch `herkunft`/`formhinweis` (beide zitieren
§ 2247 BGB) doppelt vorlagen: einmal nativ, einmal im Bündel. Behoben durch Streichen dieser
vier Felder aus `BUERGERMODUL_BUENDEL.dokumente.kiKorpus` — die nativen Versionen sind davon
unberührt, da sie nie zum Entfernen vorgesehen waren.

**Eine selbstgemachte Wiederholung desselben Musters, beim Beheben des BGB-Fundes:** die
Korrektur für `kiKorpus` wurde aus einer Zwischenfassung des Bündel-Inhalts abgeleitet, die
NOCH VOR dem Nachtrag der acht `vollmacht:<id>.label`-Kennungen entstanden war und `feld.label`
deshalb wieder enthielt. Ergebnis: `tests/inline-texte-ratsche.test.js` meldete danach
DIESELBEN acht Felder erneut — diesmal unter BEIDEN Namensräumen zugleich
(`vorsorge.vorsorge_instrumente/*.label` UND `vollmacht:*.label`), weil der neue Katalog-Eintrag
UND das wiederhergestellte `feld.label` gleichzeitig standen. Kein neuer Fehler, derselbe:
eine Zwischenfassung eines Datenstands, statt der aktuellen, wurde als Quelle weiterverwendet.
Behoben durch erneutes Streichen von `feld.label` bei denselben acht Feldern — jetzt aus der
Fassung NACH dem Katalog-Nachtrag. 65/65 Tests grün, Waechter-Selbsttest 23/23 grün.

## 8 · Was hier nicht gebaut ist

- **`tools/buergermodul-erzeugen.js`** schreibt den `dokumente`-Zweig heute nicht selbst — die
  Einfügung in `BUERGERMODUL_BUENDEL` geschah durch ein Einmal-Skript, nicht durch den
  Erzeuger. Der Erzeuger um einen `dokumente`-Pfad zu erweitern ist ein eigener Schritt
  (dieselbe Lücke, die U2-ADR-341 §6 für `situationen` bereits benennt).
- **Die acht `_katalogOptionen`-Stellen** (SEKTOR-Katalogfelder in WIZARDS) sind eine
  verwandte, aber andere, bereits dokumentierte Lücke (U2-ADR-341 §1/§6) — hier nicht
  angefasst.

## 9 · Nachtrag (06.09.2026) — Golden Master gegen den echten Vor-Zustand

**Der Fund, der den Nachtrag auslöste:** §6/§7 oben belegen die Materialisierung gegen sich
selbst (Rot-Beweis c: zwei Läufe desselben aktuellen Standes, deterministisch gleich — das
steht auch im Kommentar des Tests so). Das beweist NICHT, dass der ausgelieferte Text mit dem
VOR dem Umzug identisch ist — nur, dass er stabil bleibt. Beim Nachmessen für eine Rückfrage wurde das laut ausgesprochen und sofort geschlossen, statt als Lücke stehen zu
bleiben.

**Der Beleg:** Commit `37038011` — SHA-256-geprüft identisch mit dem bereitgestellten
`ios-test-nativ-beleg-2026-09-06/vivodepot.html` (644819f9…, kein Zufall,
git trägt den exakten Vor-Zustand). Zwei sich ergänzende Methoden, weil jede dort blind ist,
wo die andere sieht:

```
„immer"  — bootzeit-materialisierte Felder (`.einleitung`/`.texte` auf PV_MODUL/KI_MODUL.
           abschnitte, `frage`/`hilfetext`/`feld.label` auf pvwiz/kiwiz.schritte und
           VOLLMACHT_BMJ.steps). Depot-unabhängig — deckt den VOLLEN amtlichen Wortlaut ab,
           NICHT die instrumentgetriebene Auswahl-Logik.
„depot"  — die echte Generator-Funktion `modulDokumentAbschnitte` mit echten (erfundenen)
           Depot-Daten. Deckt die Auswahl-Logik UND die Namens-/Datums-/Adress-Interpolation
           ab (`_pvEingangsformel` etc. lesen `data.sektoren.identitaet`) — aber nur so viele
           Zweige, wie das jeweilige Depot füllt.
```

**Zwei Depot-Fixturen, weil eine allein die Lücke nur verschiebt:**
`tests/fixtures/vor-umzug-depot-marlene-hoffmann.json` (Kopie einer bereitgestellten
Depot-Fixture — nur skalare Felder, `vorsorge_instrumente` LEER: PV/KI/VM/BV rendern nur 3/2/1/1
Abschnitte, reine Kopf-/Klardaten-Prüfung) und `tests/fixtures/vor-umzug-depot-instrumente-
breit-anton-reindl.json` (eigens gebaut, `vorsorge_instrumente` mit vier Zeilen —
vorsorgevollmacht/patientenverfuegung/ki-verfuegung/betreuungsverfuegung — gefüllt: PV/KI/VM/BV
rendern 11/7/11/4 Abschnitte). **Gemessener, nicht vermuteter Mechanismus:** PV_MODUL liest
seine `pv_*`-Felder FLACH aus `data.sektoren.vorsorge`; KI_MODUL/VOLLMACHT_MODUL/BETREUUNG_MODUL
lesen ihre `ki_*`/`vm_*`/`betreuung_*`-Felder dagegen aus der PASSENDEN `vorsorge_instrumente`-
Zeile (`_kiSektorDaten`/`_vmZeile`/`_bvZeile` suchen per `typ`, `VOLLMACHT_MODUL` zusätzlich
über `zeilenId === r.id`) — zwei verschiedene Lesewege für vier Module, nicht einer.

**Nicht abgedeckt, ausdrücklich benannt (der Bericht, der seine Reichweite nennt, statt sie
zu behaupten):** `pv_organspende_vorrang`, der "andere"-Zweig von `pv_reichweite_person`/
`pv_widerruf_person`, `testament`/`sorgerechtsverfuegung`/`betreuerbestellung`-Zeilen, und die
negativen (nein-)Sentinel-Zweige durchgängig — die Fixture wählt überwiegend „ja", um den
positiven Wortlaut zu zeigen. Wer diese Zweige braucht, ergänzt die Fixture (per
`tools/dokument-vor-umzug-fixture-ziehen.js`, nie von Hand am JSON).

**Werkzeug, generisch für alle Vor-Umzug-Achsen (Vorgabe: "ein Werkzeug mit der Achse als
Argument, nicht vier Kopien"):** `tools/dokument-vor-umzug-fixture-ziehen.js --achse <name>
--commit <hash>` zieht den Beleg aus dem genannten Commit und schreibt
`tests/fixtures/vor-umzug-<achse>.json` — Extraktions-Logik selbst lebt in
`tools/lib/vor-umzug-textwerte.js`/`tools/lib/vor-umzug-achsen.js`, EIN Konsument für Erzeuger
und Prüfung (`tests/vor-umzug-a3-dokumentmodule.test.js`), kein zweiter, driftender Nachbau.
Die Achse `a3-dokumentmodule` ist hier gefüllt; `df`/`ce`/`0b` hängen ihre eigenen Achsen in
dasselbe Register.

**Rot-Beweis, doppelt:** ein verfälschter Textwert wird von der Vergleichsfunktion selbst
gefunden (Unit-Ebene) UND eine echte Verfälschung im Kern (String-Ersatz von
`verbindlichkeitKlauseln` vor dem Boot, Muster wie in §6) bricht die Prüfung Ende-zu-Ende.
Ergebnis am 06.09.2026: **0 Abweichungen** gegenüber `37038011` — die vier Dokumentmodule
tragen heute genau den amtlichen Wortlaut, den ios-test schon auslieferte. Für
`BETREUUNG_MODUL` ist dieser Vergleich der Umzugs-Vergleich, nicht der amtliche — das Modul
trägt keinen migrierten BMJ-Wortlaut (reiner Vivodepot-Generator-Text, s. §2).

## 10 · Nachtrag (07.09.2026) — das native Skelett ist eine Zusicherung, keine Restarbeit

`0a` hat gemessen (gegen den echten Ladeweg, Kanon `55735151`): 36 Zeilen bleiben nativ —
`PV_BMJ` 14, `VOLLMACHT_BMJ` 3, `KI_KORPUS` 19. Bis hierher stand das nur als **Absicht** in §3
(„Object.freeze sperrt String-Felder gegen Neuzuweisung, ein Array-Inhalt bleibt per `.splice()`
erreichbar — deshalb bleibt `steps: []` als Platzhalter stehen") — keine Probe hielt es fest.
Für `pvwiz`/`kiwiz` existiert immerhin ein Code-Riegel (`WIZARD_BUENDEL_VERBOTENE_IDS`), der aber
selbst ungeprüft ist; für `PV_BMJ`/`VOLLMACHT_BMJ`/`KI_KORPUS` fehlte sogar das. Nichts hätte eine
künftige Sitzung gehindert, die drei Konstanten zu einzeiligen Hüllen zu kollabieren — richtig bei
`SITUATIONEN` und den vier Dokumentmodulen (U2-ADR-341/345), hier falsch: die Referenzen
(`einleitungAus`/`texteAus`) zeigen auf diese Konstanten zurück, und die vier bewusst nativen
`KI_KORPUS`-Felder (`anlageTitel`/`herkunft`/`eingangsformel`/`formhinweis`, s. §3 — lazy Getter
lesen sie weiter) sind architektonisch zurückgehalten, nicht liegengebliebene Migration.

**Die Probe prüft STRUKTUR, nicht Zeilen** („eine Zahl altert, eine Struktur nicht") —
die Schlüsselmenge jeder Konstante gegen ein benanntes Skelett, nicht die Zeilenzahl 36 selbst
(die mit jedem Kommentar oder Zeilenumbruch verrutscht, ohne dass sich am Zustand etwas ändert).
Zwei Rot-Beweise, getrennt: ein entfernter Schlüssel (Kollaps zur Hülle) UND ein geleerter,
bewusst-nativer Wert (heimliche Migration) sind zwei verschiedene Fehlerarten, keine steht
stellvertretend für die andere.

```konformitaet
aussage:  PV_BMJ/VOLLMACHT_BMJ/KI_KORPUS behalten ihre volle Schlüsselmenge und bleiben bei
          leeren Werten, solange BUERGERMODUL_BUENDEL.dokumente fehlt — Struktur nativ, Werte
          migriert. Die vier KI_KORPUS-Felder anlageTitel/herkunft/eingangsformel/formhinweis
          bleiben dabei NICHT leer — sie sind bewusst nativ, nicht liegengebliebene Migration.
zustand:  geprüft
herkunft: invariante
pruefung: tests/u2-adr-344-bmj-dokumente-materialisieren.test.js#Natives-Skelett] ohne Buendel-Zweig
pruefung: tests/u2-adr-344-bmj-dokumente-materialisieren.test.js#Natives-Skelett·Rot-Beweis Struktur
pruefung: tests/u2-adr-344-bmj-dokumente-materialisieren.test.js#Natives-Skelett·Rot-Beweis Wert
```
