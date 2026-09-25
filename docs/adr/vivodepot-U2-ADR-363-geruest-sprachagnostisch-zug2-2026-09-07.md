# U2-ADR-363 · Der Rückfall auf Deutsch verlässt textLesen() — Zug 2

**Status heute:** gilt — die Regel „nie eine andere Sprache im Rückfall" ist durch U2-ADR-423 abgelöst (Rückfall: Modulsprache, dann Englisch, dann Deutsch, sichtbar gekennzeichnet); der Rest bleibt
**Datum:** 07.09.2026
**Betrifft:** `vivodepot.html` (`textLesen`, `STRINGS`-Proxy, `_STRINGS_EINGEBAUT` geleert,
`_textsatzKnotenFuellen`/`_textsatzKnotenFuellenOhnePflicht`/`_textsatzListeFuellen`,
`PRE_DEPOT_EN` entfernt, `vorDepotText`/`vorDepotSprachkennung`/`vorDepotSpracheUmschalten`
neu, `_abWerkTextsatzDeAbleiten`, `AB_WERK_TEXTSATZ_EN_VORDEPOT`,
`_textsatzAbWerkRegistrySeed`, `AMTLICHE_UEBERSETZUNG_FESTSTELLUNG`,
`amtlicheUebersetzungVermerkNoetig`, `_dokumentUnuebersetzteStellen`, `modulDokumentAbschnitte`,
21 `// ZUSTAND:`-Kommentare umgehängt), `tools/textsatz-de-modul-erzeugen.js` (Kennungsmenge
erweitert, `sprachkennung: 'de-DE'` ergänzt), `tools/textsatz-en-modul-erzeugen.js` (151
amtliche Wortlaute auf Deutsch ergänzt), `tools/textsatz-en-vollabdeckung-daten.js` (+1
Kennung), `tools/tote-strings-pruefen.js` (dritter Öffner + Streng-Modus für
`TEXTSATZ_EINGEBAUT`), `tools/w-aussagetext-pruefen.js` (erkennt die neue Kennungsform),
`tools/waechter-register.js` (ein Pflanz-Anker umgezielt), `tools/nur-vom-test-erreicht-
grundlinie.json` (ein Name verlässt die Grundlinie — jetzt verdrahtet), `tests/load-kern.js`
(neue Exporte), rund fünfzehn Testdateien mit angepassten Erwartungen (Einzelheiten §6),
`tests/strings-form-b.test.js` (entfernt — sein Gegenstand existiert nicht mehr, §7),
`tests/textsatz-offen-juristisch-paritaet.test.js` (neu),
`tests/textsatz-geruest-sprachagnostisch.test.js` (neu),
`tests/textsatz-amtliche-uebersetzung-vermerk.test.js` (neu)
**Bezug:** U2-ADR-359 (Zug 1: Deutsch wird ein Modul), U2-ADR-285 (Gerüst-eigener Prüfweg für
`sprache:'de'`), U2-ADR-322 (generischer Wächter statt Ortsliste), U2-ADR-333/338/353/357 (der
Rückstand `OFFEN_JURISTISCH`), U2-ADR-208/278/260 (frühere Sprachkennungs-Rückfälle)

---

## 0 · Was dieser Zug leistet — und was er ausdrücklich NICHT leistet

**Geleistet:** `textLesen()` fällt auf nichts mehr zurück, das nicht über ein Sprachmodul lief.
Ohne Sprachmodul liefert das Gerüst für keine Kennung mehr deutschen oder englischen Text — nur
die Kennung selbst. Deutsch UND Englisch sind ab Werk gesät, beide mit denselben 151 amtlichen
Kennungen (auf Deutsch). Ein sichtbarer Vermerk ist gebaut, mit einer expliziten, heute leeren
Beleg-Struktur. Der praktische Gewinn: **ein englisches Produkt zeigt ab diesem Zug kein
stilles Deutsch mehr** — außer den 151 amtlichen Wortlauten, die es zeigen SOLL, mit Vermerk.

**Nicht geleistet, wörtlich benannt statt verschwiegen (Auflage):** Das Gerüst BESITZT die
deutsche Texttabelle weiterhin. `TEXTSATZ_EINGEBAUT` ist eine Gerüst-Tabelle, aus der das
Ab-Werk-Modul zur Laufzeit abgeleitet wird — sie ist nicht selbst das Modul. „Deutsch ist ein
Modul, keine Eigenschaft des Gerüsts" (wörtlich) ist damit NICHT erreicht, nur
vorbereitet. Das eigentliche Umhängen — `TEXTSATZ_EINGEBAUT` WIRD das Modul, alles andere liest
nur noch über den Modulweg — ist der benannte Folgezug (§9): **238 Vorkommen des Namens in 100
Dateien** (31 im Kern selbst, 34 Werkzeuge, 35 Testdateien, gemessen 07.09.2026).

## 1 · Der Auftrag

U2-ADR-359 (Zug 1) hob Deutsch als vollwertiges Sprachmodul — aber `textLesen()` fiel bei jeder
nicht gefundenen Kennung weiterhin auf `TEXTSATZ_EINGEBAUT` zurück. Der Auftrag zu Zug 2,
wörtlich zusammengefasst:

> Der Rückfall fällt komplett weg — nicht nur für `strings:`, für JEDE Kennung (Sektor, Situation,
> Wizard, Dokument). Fehlt eine Kennung, zeigt sich die Kennung selbst, nie Deutsch oder Englisch.
> Das DE-Modul muss AB WERK aktiv sein, bevor der allererste Bildschirm rendert, damit sich für
> eine deutsche Bürgerin nichts ändert. `PRE_DEPOT_EN` ist derselbe Verstoß, nur englisch — auch
> das geht weg.

**Wo die Kennung erscheint — und wo nicht.** Die Kennung zeigt sich, wo KEINE Quelle derselben Sprache
den Text trägt. Ist ein Modul der aktiven Sprache aktiv und fehlt ihm eine Kennung, zeigt die Anzeige
den Text derselben Sprache aus dem Vor-Depot-Modul, der Ab-Werk-Saat oder der Mitschrift der Datei
(U2-ADR-416). Der Rückfall wechselt nie die Sprache — das Ziel dieses Zugs, kein stilles Deutsch im
englischen Produkt, bleibt. Ohne jedes Modul der aktiven Sprache gilt der Satz oben wörtlich, und
`textLesen()` liefert in jedem Fall `null`.

Während des Baus kam eine zweite, ebenso verbindliche Erweiterung dazu — die 151 Kennungen aus
`OFFEN_JURISTISCH` (§4) und ein sichtbarer Vermerk, wenn diese auf Englisch das deutsche
Original zeigen:

> Die dt. Version muss dann mit einem Vermerk gekennzeichnet sein. Und natürlich ist es besser,
> wenn eine amtliche Übersetzung vorliegt. Deren Vorhandensein muss also ausgeschlossen sein.

**Ausgangslage, gemessen:** `_STRINGS_EINGEBAUT` (1176 Schlüssel) ist vollständig `null` —
bereits am 19.08.2026 komplett nach `TEXTSATZ_EINGEBAUT` migriert (A360). Der lebendige Rückfall
war `TEXTSATZ_EINGEBAUT` selbst (3498 Kennungen vor diesem Zug), nicht `_STRINGS_EINGEBAUT` — die
ursprüngliche Rahmung des Auftrags nannte die falsche Konstante; vor dem Bau gemessen und
richtiggestellt.

## 2 · Der Bau

**`textLesen()` verliert seinen Rückfall** (zwei Zeilen `const eingebaut = TEXTSATZ_EINGEBAUT[…]`)
— sie liefert `null`, wenn keine Registry-Sprache die Kennung trägt. Ihr `null`-Vertrag bleibt
unverändert (wichtig, s. §6).

**`_abWerkTextsatzDeAbleiten()`** baut das DE-Modul zur LAUFZEIT aus `TEXTSATZ_EINGEBAUT` —
**keine eingebettete Kopie.** Ein erster Bau bettete `tools/textsatz-de-modul.json` als
`JSON.parse('…')`-Konstante ein (Stil `BUERGERMODUL_BUENDEL`) und verdoppelte damit JEDEN
deutschen Wortlaut im Kern — gefunden über die volle Suite: vierzig bestehende Wächter, die
„dieser String kommt genau einmal vor" prüfen (ADR-Referenzen, BGB-Verweise, Pflanz-Anker u. a.),
brachen daran. Die Ableitung vermeidet die Verdopplung vollständig; `TEXTSATZ_EINGEBAUT` bleibt
die einzige Stelle, an der diese 3499 Wortlaute im Quelltext stehen.

**`AB_WERK_TEXTSATZ_EN_VORDEPOT`** trägt die 24 Kennungen, die der Vor-Depot-Schirm vor jedem
Depot braucht (wortgleich zum entfernten `PRE_DEPOT_EN`). Das volle englische Modul trägt jeder Kern
zusätzlich als `AB_WERK_TEXTSATZ_EN` (U2-ADR-416, rund 7 % des Kerns); es überschreibt die
Vor-Depot-Teilmenge im selben Fach.

**`_textsatzAbWerkRegistrySeed()`** baut daraus eine frische Registry (`{de:{'':…}, en:{'':…}}`),
geprüft über `_textsatzModulPruefenGeruest` (DE, U2-ADR-285-Weg — die einzige bewusste, geplante
Verdrahtung dieser bis heute aufruferlosen Funktion, s. §6) bzw. `textsatzModulPruefen` (EN, nicht
reserviert). Zwei Aufrufstellen: als Anfangswert von `_TEXTSATZ_MODUL_REGISTRY` und als erster
Schritt in `_textsatzModuleAusDepotAnmelden` (die vorher mit einer leeren Registry begann und die
Saat beim ersten echten Depot-Laden sonst gelöscht hätte).

**`PRE_DEPOT_EN` ist entfernt**, aber NICHT einfach durch `STRINGS[schluessel]` ersetzt — ein
erster Versuch dessen zerstörte einen echten, bereits geprüften Fall (U2-ADR-260, „drittes
Sprachmodul"): er vereinigte den manuellen DE/EN-Schalter (`_vorDepotSprache`) mit der Sprache
eines echten, vor dem Depot geladenen Moduls (`_vorDepotSpracheAktiv`) zu EINER Variable. Ein
Depot mit einem echten ungarischen Vor-Depot-Modul landete nach „einmal auf Englisch, wieder
zurück" nicht mehr bei Ungarisch, sondern beim eingebauten Deutsch — der Schalter hatte den
echten Modulzustand überschrieben statt ihn nur zu ÜBERLAGERN. Die zwei Variablen bleiben darum
GETRENNT, exakt wie vor diesem Zug — nur dass die `'en'`-Stellung des Schalters jetzt
`_TEXTSATZ_MODUL_REGISTRY['en']` liest (`_vorDepotTextEnErzwingen`, das Ab-Werk-Vordepot-Modul
oder ein bereits geladenes echtes EN-Modul), statt das native `PRE_DEPOT_EN`.

**Der STRINGS-Proxy** zeigt ohne Treffer die rekonstruierte Kennung — aber NUR, wenn
`TEXTSATZ_EINGEBAUT` sie tatsächlich führt (s. §6, Fund 3). `_STRINGS_EINGEBAUT` ist auf
`Object.create(null)` geleert (sie war ohnehin vollständig inert, s. §1).

**`_textsatzKnotenFuellen`/`_textsatzKnotenFuellenOhnePflicht`/`_textsatzListeFuellen`**
(Sektor-/Situations-/Wizard-/Dokument-Text, Optionswerte, Dokument-Array-Texte) zeigen denselben
Kennung-statt-Text-Rückfall — mit demselben Existenz-Wächter gegen `TEXTSATZ_EINGEBAUT` (s. §6,
Funde 2 und 4). `TEXTSATZ_FEHLSTELLEN` misst weiterhin gegen `TEXTSATZ_EINGEBAUT` direkt, nicht
gegen das, was am Knoten landet — sonst würde sie nie mehr auslösen, weil der Knoten jetzt immer
etwas trägt.

**`_dokumentUnuebersetzteStellen()`** zählte „unübersetzt" über `textLesen(k) === eingebaut` — ein
Signal, das nur funktionierte, weil der jetzt entfernte Rückfall bei fehlender Übersetzung GENAU
den deutschen Wert lieferte. Ohne ihn liefert eine echte Lücke `null`, die alte Bedingung trifft
nie mehr zu, die Funktion hätte unbedingt 0 gemeldet — ein fremdsprachiges Rechtsdokument hätte
„keine unübersetzten Passagen" behauptet, während sichtbare Kennungen darin standen. Behoben:
`null` zählt jetzt ausdrücklich mit. Eigener Rot-Beweis
(`tests/textsatz-amtliche-uebersetzung-vermerk.test.js`): ein Modul, das GARANTIERT nichts
übersetzt, muss den Zähler über 0 heben.

## 3 · Die 151 amtlichen Wortlaute

`OFFEN_JURISTISCH` listet 151 Kennungen mit Rechtsfolge (Patientenverfügung/Vorsorgevollmacht/
Betreuungsverfügung/KI-Verfügung), für die keine verifizierte amtliche englische Fassung
vorliegt. Vor diesem Zug fehlten sie BEIDEN Modulen vollständig — mit dem Rückfall unsichtbar
(Deutsch sprang ein), ohne ihn hätte ein englisches Depot an diesen 151 Stellen nur noch
Kennungen gezeigt, mitten in einem rechtlich bedeutsamen Dokument.

**Die Produktentscheidung, wörtlich:** *„IMMER amtliche Fassungen. Wir liefern keinen
Content."* Beide Module tragen jetzt alle 151 — mit dem UNVERÄNDERTEN deutschen Original, nie
einer selbst erstellten Übersetzung. `tests/textsatz-offen-juristisch-paritaet.test.js` hält
Byte-Gleichheit zwischen DE-Modul, EN-Modul und `TEXTSATZ_EINGEBAUT` für alle 151 fest, mit
Rot-Beweis.

## 4 · Der Vermerk und seine Feststellung

Eine deutsche Passage im sonst englischen Dokument, ohne Erklärung, sähe amtlich aus, wäre es
aber nicht. `AMTLICHE_UEBERSETZUNG_FESTSTELLUNG` modelliert für die vier Dokumente je ein
`{quelle, datum, ergebnis}` — **alle vier heute ausdrücklich `null`/offen**. Die Recherche, ob
wirklich keine amtliche Übersetzung existiert (BMJ/BZgA), ist **nicht Gegenstand dieses Baus** —
eine eigene, später zu beauftragende Erhebung. `amtlicheUebersetzungVermerkNoetig(dokumentTyp)`
liefert nur `true`, wenn quelle UND datum UND `ergebnis === 'keine-amtliche-uebersetzung'`
gesetzt sind UND eine fremde Sprache aktiv ist. `tests/textsatz-amtliche-uebersetzung-vermerk
.test.js` hält beide Richtungen mit Rot-Beweis fest.

**Festgehalten:** alle vier Dokumente (`patientenverfuegung`, `vorsorgevollmacht`,
`betreuungsverfuegung`, `ki-verfuegung`) stehen heute ohne Beleg.

**Auflage (07.09.2026, nach Fund im Geschäftsstrang):** das BMJ gibt Vorsorgevollmacht
UND Patientenverfügung SELBST zweisprachig heraus (neun Sprachpaare, kostenlos). Ein Vermerk
„keine amtliche Übersetzung vorhanden" wäre für mindestens zwei der vier Dokumente **falsch**
gewesen, hätte man ihn ohne Beleg vorbelegt — an einer Stelle, an der eine Bürgerin ihm glaubt.
Darum gilt ausdrücklich: **ohne Feststellung kein Vermerk. Kein Vorbelegen mit „nicht
vorhanden", kein Vorgabewert, kein „vermutlich keine". Fehlt der Beleg, erscheint gar nichts.**
Der Code erfüllt das bereits (alle vier Einträge `null`, `amtlicheUebersetzungVermerkNoetig`
kennt keinen `else`-Zweig, der bei fehlendem Beleg irgendetwas behauptet) — jetzt auch im
Kopf-Kommentar an der Konstante selbst festgehalten, damit niemand später einen Default
einträgt, um die Lücke zu füllen. Die Recherche selbst bleibt eine eigene, separat beauftragte
Erhebung — nicht Gegenstand dieses Zuges.

`AMTLICHE_UEBERSETZUNG_FESTSTELLUNG` ist im Kern ein `let`, nicht `const` — eine spätere Landung
ersetzt den gesamten, weiterhin eingefrorenen Bestand, kein Feld wird an Ort und Stelle verändert.

## 5 · Der generische Wächter

`tests/textsatz-geruest-sprachagnostisch.test.js` läuft den GESAMTEN Kennungsraum ab
(`Object.keys(TEXTSATZ_EINGEBAUT)`, nicht eine Ortsliste — dieselbe Lehre wie U2-ADR-322): ohne
Sprachmodul liefert `textLesen()` für keine einzige der über 3499 Kennungen mehr Text, der
STRINGS-Proxy zeigt für jeden `strings:`-Schlüssel seine eigene Kennung, und eine generische
Prüfung über `SEKTOR_BY_ID` bestätigt, dass kein Feld-Label ein deutsches Wort ohne Kennungspunkt
zeigt. Rot-Beweis: die Ab-Werk-Saat erneut anwenden macht dieselbe Probe wieder grün.

## 6 · Fünf Funde derselben Klasse — gemeldet, nicht verschwiegen

**Fund 1 — Sprachkennung `'de'` statt `'de-DE'`.** `textsatzRegeln()` setzt
`raus.sprachkennung = sprache` unbedingt, sobald ein Modul für die aktive Sprache in der Registry
steht (dieselbe Fehlerklasse wie U2-ADR-208/278, hier zum ersten Mal am eingebauten Fall selbst
ausgelöst, weil erstmals ein `'de'`-Modul überhaupt registriert ist). Behoben:
`tools/textsatz-de-modul-erzeugen.js`s `regeln` trägt jetzt `sprachkennung: 'de-DE'`.

**Fund 2 — Kennung-Rückfall hätte Optionsknoten verunreinigt.** Ein Optionswert trägt nur
`label`, nie `beispiel`/`hint`/`titel`/… — ein erster, ungeschützter Rückfall hätte sechs neue,
nie vorher vorhandene Eigenschaften an jeden Optionsknoten geschrieben. Behoben: der Rückfall
greift nur für Art-Slots, die `TEXTSATZ_EINGEBAUT` an dieser Kennung tatsächlich führt.

**Fund 3 — derselbe Fehler am STRINGS-Proxy, mit echtem Produktschaden.** Ohne denselben
Existenz-Wächter hätte der Proxy für JEDEN, auch einen nie existierenden Schlüssel
(`STRINGS[undefined]`, ein gelöschter/umbenannter Schlüssel) eine erfundene, aber TRUTHY
Kennung-Zeichenkette geliefert — und damit jedes `STRINGS[x] || ersatzwert`-Muster im Kern
stillgelegt. Gemessen an einer echten Stelle: `STRINGS[art] || STRINGS.keinOffenesDepotFehler
Unbekannt` zeigte `strings:undefined.text` statt der echten Fehlermeldung. Behoben mit demselben
Wächter wie Fund 2.

**Fund 4 — vierte Fundstelle: `_textsatzListeFuellen` (Dokument-Array-Texte).** Der
`_TEXTSATZ_ZURUECK`-Zweig setzt ein Listenelement auf `null`, in der Annahme, der Füll-Zweig
besetze es gleich danach neu — eine Annahme, die nur galt, solange `textLesen()` bei fehlender
Übersetzung zurückfiel. Ohne ihn blieb ein vom aktiven Modul nicht getragenes Element bei `null`
hängen (gefunden über `tests/textsatz-dokumentmodule-u2-adr-333.test.js`). Behoben mit demselben
Existenz-Wächter und Kennung-Rückfall.

**Fund 5 — 21 dokumentierte Invarianten wären beim Leeren von `_STRINGS_EINGEBAUT` verlorengegangen.**
`// ZUSTAND: <Ausdruck>`-Kommentare (`tools/w-aussagetext-pruefen.js`, Aussagetext-Wächter)
banden 21 STRINGS-Werte an eine im Kern existierende Funktion/Konstante — sie
standen als bare-Key-Zeilen INNERHALB von `_STRINGS_EINGEBAUT`. Beim Leeren dieser Konstante
wären sie ersatzlos verschwunden, nicht nur ihr (bereits totes) `null`-Trägerfeld. Behoben: alle
21 an ihre neue Stelle in `TEXTSATZ_EINGEBAUT` (`'strings:<key>.text':`-Zeilen) umgehängt,
`w-aussagetext-pruefen.js`s Erkennung erweitert.

**Nebenfund — `tools/tote-strings-pruefen.js` und drei abhängige Testdateien waren erblindet,
nicht falsch-positiv.** Sein `stringsBlockStart` suchte ausschließlich nach der jetzt leeren
`_STRINGS_EINGEBAUT`-Literalform — mit ihr verschwand der Suchraum für „Kein STRINGS-Wert enthält
Sub-Depot" und die tote-Schlüssel-Prüfung selbst, GRÜN statt ROT (ein blinder Wächter meldet
grün, das ist schlimmer als rot). Behoben: dritter Öffner (`TEXTSATZ_EINGEBAUT`), ein
selbst-erkannter Streng-Modus in `topLevelSchluessel()` (nur `strings:<key>.text`-Zeilen zählen
als STRINGS-Schlüssel — eine Sektor-/Situations-Kennung ist keiner, sonst meldete die Probe
tausende Fehlalarme). Der Sub-Depot-/„noch offen"-Wortarbeits-Wächter hält seinen historischen
Prüfradius (nur die flache `strings:`-Schicht) bewusst bei — ungefiltert auf den ganzen
`TEXTSATZ_EINGEBAUT`-Block losgelassen, träfe er auf echte, bestehende Sektor-Wortlaute außerhalb
seines bisherigen Radius (eine echte Wortarbeitsfrage, kein technisches Retarget).

## 7 · `tests/strings-form-b.test.js` entfernt

„Form B" (internes Entscheidungsdokument vom 19.08.2026) prüfte die
Synchronität zwischen `_STRINGS_EINGEBAUT`s `null`-Platzhalterzeilen und dem Wortlaut im Satz —
ZWEI Orte, die auseinanderlaufen konnten. Seit `_STRINGS_EINGEBAUT` dauerhaft leer ist, gibt es
nur noch EINEN Ort; eine Probe gegen einen nicht mehr existierenden zweiten Ort wäre entweder
tautologisch grün oder (mit ihrer eigenen Vorbedingung „mindestens 900 `null`-Zeilen") ehrlich,
aber gegenstandslos rot. Entfernt statt umgebaut — ihr Gegenstand existiert nicht mehr.

## 8 · Testerwartungen angepasst — keine geschwächt

Rund fünfzehn Testdateien prüften wörtlich den jetzt absichtlich entfernten Rückfall („was ein
fremdes/nicht vorhandenes Modul nicht trägt, bleibt Deutsch"): `tests/textsatz-mechanismus`,
`tests/heben-stand` (A361, `importKlartextFuer` erfüllt seither seinen eigenen, von Anfang an
dokumentierten `null`-Vertrag), `tests/en-audit-laufzeit`, `tests/u2-adr-260-sprachkennung-folgt-
modul` (U2-ADR-260 UND 278), `tests/u2-adr-338-vollmacht-bmj-schluessel`, `tests/persona-p19-
p20`, `tests/vor-depot-sprachschalter`, `tests/pre-depot-en-sync` (PRE_DEPOT_EN → AB_WERK_
TEXTSATZ_EN_VORDEPOT, dieselbe Sync-Sorge bleibt real), `tests/textsatz-dokumentmodule-u2-adr-
333`. Jede neue Erwartung prüft den neuen, beauftragten Vertrag (die Kennung erscheint) mit
Kommentar auf diesen ADR. `tests/textsatz-en-modul-erzeugen.test.js`s Kennungszahl (3347→3499)
und seine Rückstands-Positivkontrolle sind gegen `baueModul()` nachgerechnet, nicht angenommen.
`tests/u2-adr-285-textsatz-geruest-modul.test.js` und `tools/nur-vom-test-erreicht-
grundlinie.json` sind die BEWUSSTE Entsperrung, die U2-ADR-285 selbst verlangt (§2).

## 9 · Was ausdrücklich NICHT gebaut wurde

- **Das Umhängen von `TEXTSATZ_EINGEBAUT` selbst zum Modul** — s. §0. Geschätzter Umfang: 238
  Vorkommen über 100 Dateien, eigener Zug.
- **Keine Recherche zu amtlichen Übersetzungen.** Alle vier Feststellungen bleiben offen — §4.
- **Kein volles Fremdsprach-Modul ab Werk.** Nur die Vor-Depot-Teilmenge (24 Kennungen) für
  Englisch.
- **`TEXTSATZ_FEHLSTELLEN` wurde nicht neu entworfen.** Ihre Auslöse-Bedingung ist bewusst
  byte-gleich zur alten geblieben.
