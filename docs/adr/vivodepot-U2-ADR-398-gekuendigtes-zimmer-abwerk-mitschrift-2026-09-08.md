# U2-ADR-398 — Das gekündigte Zimmer: eingebackene Struktur reist als Mitschrift mit der Datei

**Status heute:** gilt
**Datum:** 08.09.2026
**Auftrag:** die Produktentscheidung, wörtlich übergeben: „Wenn man das Zimmer gekündigt
hat, ist sie ganz verschlossen."
**Bezug:** U2-ADR-387 (Ab-Werk-Rangfolge, logikModul), U2-ADR-387-Nachtrag (das Einbacken
selbst, Marker-Regionen in produkt-konfektionieren.js), A389 (Bereichs-Rettungspfad,
`_bereicheVerwaisteRetten`), U2-ADR-379 (Pro-Bereichs-Modul)

## Der Fund

Die Messung eines parallelen Strangs (vor dem Einbacken, gegen den Kanon): eine Bürgerin, die ihr Pro-Depot im
PRIVATEN Produkt öffnet, verliert ihre Pro-Sektoren nicht — weil das Bereichs-Modul damals als
echte, unsignierte Begleitdatei in `data.bereichsModule` reiste. Nach dem Einbacken
(U2-ADR-387-Nachtrag) liegt die Struktur (Bereich/Logikmodul/Sprache) NUR NOCH im Programm
(Ab-Werk-Konstanten, script-global, nie Teil von `data`). Ein Depot, das im Pro-Produkt angelegt
wird und danach NUR NOCH im privaten Produkt geöffnet wird — sei es, weil die Bürgerin das
Pro-Abonnement kündigt, sei es, weil sie das Produkt wechselt — verliert damit die Fähigkeit,
ihre eigenen Pro-Sektoren zu benennen. Der bestehende Rettungspfad (A389,
`_bereicheVerwaisteRetten`) verwaist korrekt (Umzug, keine Löschung), aber sein Ziel ist ein
später wiederkehrendes Modul — er löst nicht, dass ein Depot, dessen heutiges Produkt die
Struktur nie mehr trägt, sie nie wieder zu sehen bekommt. Genau das schließt den Maßstab
„Akte im Schrank" aus: die Bürgerin muss an ihre eigenen Daten herankommen, auch wenn sie das
Zimmer gekündigt hat.

## Die zunächst erwogene, dann verworfene Unterscheidung

Ein erster Gedanke (im Gespräch mit e2): logikModul sei VERHALTEN (gehört zum Programm,
darf nie ins Depot — sonst trüge ein zwei Jahre altes Depot für immer das Verhalten von
damals), ein Bereichs-Modul dagegen STRUKTUR (beschreibt, was die Werte der Bürgerin BEDEUTEN —
ohne sie sind ihre Werte nicht mehr zuzuordnen). Dessen Rundlauf-Messung (Pro-Depot anlegen,
Pro-Sektor befüllen, in Privat öffnen+sichern, zurück in Pro öffnen, Werte vergleichen) zeigte:
der bestehende Rettungspfad hält — Werte verwaisen korrekt ins `bereicheVerwaist`, kommen beim
Öffnen im Pro-Produkt vollständig zurück, über zwei Runden ohne Verschleiß. Kein Datenverlust.
Die Verhalten-gegen-Struktur-Unterscheidung war damit für den BEREICH-Fall nicht die richtige
Achse — aber der eigentliche Befund (Bürgerin liest nichts, wenn sie gekündigt hat, weil die
App zum Rettungsfall SCHWEIGT: `bereicheVerwaisteAlle()` hat keinen einzigen Aufrufer) blieb.
Die Produktentscheidung fiel unabhängig davon, direkt auf den Kernfall: Struktur reist mit der
Datei — Bereich, Sprache UND Logikmodul.

## Entscheidung

Ein Depot, das in einem Produkt angelegt wird, bekommt die dort eingebackenen Ab-Werk-Module
(Bereich/Logikmodul/Sprache/Bereichsersatz) als **Mitschrift** in ein neues, eigenes Feld geschrieben:
`data.abWerkMitschrift = { bereich: [...], sprache: <objekt-oder-null>, logikModul: [...], bereichsErsatz: <objekt-oder-null> }`.

**Jede Datei öffnet in jedem Produkt, und alles ist drin.** Ein Pro-Produkt bringt seine Bereiche
als Bereichsersatz; die Mitschrift trägt ihn im vierten Fach. Gelesen wird davon nur `neu`, nie
`ersetzt` — eine Datei kann benennen, was ein anderes Produkt anlegte, aber nichts verdrängen —
und kein Bereich, den das laufende Produkt selbst kennt, und keine eingebaute ID.

Dateien von vor dem vierten Fach tragen ihre Pro-Werte ohne diese Definitionen. Darum backt der
Konfektionierer die Bereiche aller Vivodepot-Produkte (`neu` jedes Bereichsersatzes aus
`tools/lib/vier-produkte.js`, erzeugt nach `tools/vivodepot-bereiche-bekannt.json`) in **jedes**
Produkt, Region `AB_WERK_BEREICHE_BEKANNT`. Sie ist die dritte Quelle — nach dem laufenden Produkt
und nach der Mitschrift — und greift nur für einen Bereich, zu dem die Datei Werte trägt: leere
Pro-Bereiche bleiben in Privat unsichtbar, das Spiegelbild der ruhenden Bürger-Bereiche in Pro
(U2-ADR-348). Greift sie, schreibt sie die benutzten Definitionen ins vierte Fach, sodass die Datei
sie danach selbst trägt. Zuwachs je Produkt, gemessen am gebauten Produkt: rund 20 KB.

**Beschriftungen folgen der Sprache des Produkts.** Feld, Unterfeld und Option eines angedockten,
nicht eingebauten Bereichs lesen den Textsatz unter denselben Kennungen wie ein Pro-Produkt
(`<bereich>.<feld>.label`, `<bereich>.<feld>/<wert>.label`), mit der Beschriftung aus der Datei
als Rückfall — in Kern und Lese-App. Eine pro-en-Datei zeigt ihre Pro-Bereiche in privat-en darum
englisch wie in pro-en. Die Getter sitzen an Kopien, nie an den Objekten der Datei.

**Die Datei bringt das ganze Template mit, auch seine Namen.** Ein deutsches Produkt reist ohne
Sprachmodul (U2-ADR-361), seine Ab-Werk-Bereiche tragen im Quelltext keine Inline-Beschriftung —
der Name kommt aus dem Textsatz des Produkts. Ein anderes Programm, das die Datei liest, kennt
diesen Textsatz nicht: die Lese-App verwarf darum jeden Pro-Bereich einer pro-de-Datei als
`kein-label`, samt seiner Werte. Die Namen der Bereiche, Sektionen, Felder und Unterfelder sind
Inhalt des Bereichs-Templates, kein Sprachmodul. Beim Schreiben der Mitschrift
(`_abWerkMitschriftErzeugen`) löst der Kern sie darum über dieselben Kennungen auf, die die Leser
verwenden (`<bereich>.label`, `<bereich>#<sektion>.label|.hint`, `<bereich>.<feld>.label|.hint`,
`<bereich>.<feld>/<unterfeld|wert>.label`), und schreibt sie als Inline-Beschriftung in den
Schnappschuss. Eine vorhandene Inline-Beschriftung bleibt unangetastet, ein dem Textsatz
unbekannter Schlüssel bleibt leer. Ein lebender Textsatz beim Leser gewinnt weiter (ein
mitreisendes Sprachmodul), die Inline-Beschriftung ist der Rückfall. Der Lese-App-Prüfer verwirft
einen Bereich ohne Namen nach wie vor (`kein-label`), ebenso wie der Kern, nennt aber je Bereich
den Grund, auch wenn das ganze Modul verworfen wird.

**Kein viertes Einlass-Register.** Die Mitschrift reist NICHT über `modulEinlassen` — sie trägt
darum auch nie dessen Zwangsmarkierung `ungeprueft:true`. Die Bürgerin hat nichts angedockt;
das Vertrauen kommt aus der Datei selbst, genau wie bei `AB_WERK_TEXTSATZ_DE`
und `AB_WERK_BRANDING`. Ein echtes, selbst angedocktes Fremdmodul bleibt unverändert
`ungeprueft` — dieser Weg berührt den Einlassweg nicht.

**Rangfolge beim Lesen: das LAUFENDE Produkt gewinnt IMMER, wenn es selbst etwas ab Werk
trägt.** Nur wenn die lebendige Ab-Werk-Konstante leer ist, greift die Mitschrift aus der Datei.
Damit kommt eine spätere Korrektur am Produkt automatisch an (ein neu gebautes Produkt mit
korrigiertem Bereichs-/Logik-/Sprachmodul gewinnt immer gegen eine ältere Mitschrift im selben
Depot) — und eine gekündigte Bürgerin liest trotzdem, weil ihre eigene Mitschrift dann die
einzige verbliebene Quelle ist.

**Reihenfolge beim Schreiben** (`_abWerkStrukturInsDepot(d)`, einmal aus `depotAnlegen()`
gerufen): Bereich zuerst (alles Weitere referenziert Sektor-IDs), dann Logikmodul (referenziert
seinen eigenen Sektor — dieselbe Reihenfolge-Notwendigkeit wie bei der Ab-Werk-Saat selbst,
U2-ADR-387-Nachtrag), dann Sprache, zuletzt ein geriegelter Aufruf der Funktion des parallelen Strangs
`_abWerkVorlagenInsDepot(d)` (Feld-Definitionen aus `AB_WERK_VORLAGEN_QUELLEN`, eigener,
paralleler Zug — s. Abgrenzung unten). Der `typeof`-Riegel ist Pflicht: welcher der beiden Züge
zuerst landet, keiner bricht am anderen.

**Ausgabewege.** `data.abWerkMitschrift` trägt keinen Wert über die Bürgerin — reiner
Produkt-Spiegel. Sie ist in `VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL` klassifiziert, aber als
EINZIGE Ausnahme dieser Klasse UNBEDINGT zurückgehalten — auch bei `vollExportJSON({sensibel:
true})` (dem „Umzug"-Modus, in dem ihre Geschwister wie `mappe`/`bereicheVerwaist` vollständig
mitreisen). Begründung: bei einem echten Umzug bekäme die Bürgerin ihre Struktur ohnehin über
die Datei selbst (`depotSerialisierenV4` schreibt `data` als Ganzes) oder ab Werk vom
ZIEL-Produkt — ein zusätzlicher ~322 KB-Spiegel (allein das Sprachmodul) in einer Übergabe
nützt niemandem und würde nur Bandbreite verschwenden.

## Abgrenzung zum parallelen Strang ( U2-ADR-379-Fortsetzung)

Der parallele Strang — heute die eigene ADR U2-ADR-421 („VD Pro ersetzt statt ergänzt"), die bis zum
19.09.2026 dieselbe Nummer trug — baut zwei Dinge in derselben Ecke, nicht Gegenstand dieses ADR:

1. `AB_WERK_BEREICHS_ERSATZ`, eine vierte Marker-Region, die `BUERGERMODUL_BUENDEL.bereichsErsatz`
   setzt, damit ein Pro-Produkt die privaten Bereiche ERSETZT statt sie zu ergänzen — läuft über
   `buergermodulBuendelAnwenden`, nicht über `depotAnlegen()`.
2. `AB_WERK_VORLAGEN_QUELLEN`, eine achte Ab-Werk-Saat, die 54 Pro-Felddefinitionen in
   `data.feldDefinitionen[]` speist, über den bestehenden Vorlagen-Weg. Das ist bereits diese
   ADR-398-Regel, dort selbst angewendet: Felddefinitionen sind Struktur, sie gehen in die
   Datei. Der Aufruf-Ort ist der `_abWerkVorlagenInsDepot(d)`-Riegel in `_abWerkStrukturInsDepot`
   (Schritt 4) — der parallele Strang definiert die Funktion, ruft sie nirgends selbst auf.

## Vier rote Beweise (tests/u2-adr-398-gekuendigtes-zimmer.test.js)

1. **Gekündigtes Zimmer** — ein Depot, dessen Struktur nur die Mitschrift trägt (kein
   lebendiges Ab-Werk, z. B. weil es im privaten Produkt geöffnet wird), bleibt lesbar: der
   Pro-Sektor wird bekannt (`SEKTOR_BY_ID`), das Pro-Logikmodul erscheint (`_logikModuleAlle`).
   Gegenprobe: ohne Mitschrift bleibt der Sektor unbekannt.
2. **Korrektur kommt an** — ein lebendiges Ab-Werk gewinnt immer gegen eine (ältere/andere)
   Mitschrift im selben Depot; real gegen ein konfektioniertes Pro-Produkt gemessen (nicht nur
   am Quelltext behauptet), zusätzlich als Code-Beleg für Bereich/Sprache (die native
   Ab-Werk-Konstante ist dort immer leer, ein voller Laufzeitbeweis bräuchte für diese beiden
   ein zweites konfektioniertes Produkt).
3. **Fremdmodul bleibt ungeprüft** — die Mitschrift trägt nie `ungeprueft` (kein Einlassweg);
   ein echtes, selbst angedocktes Fremdmodul bleibt es weiterhin — keine Lockerung der
   bestehenden Zusicherung.
4. **Export trägt die Mitschrift nicht** — `vollExportJSON()` hält sie unbedingt zurück, auch
   bei `{sensibel:true}` — anders als ihre Geschwister in `VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL`.

Dazu, an echt konfektionierten Produkten, deutsch und englisch: eine Pro-Datei ohne viertes Fach
zeigt in Privat ihre Werte, nichts verwaist, rot ohne die Region; ohne Pro-Werte erscheint kein
Pro-Bereich; die Region entspricht den Bereichsersätzen (`tests/pro-bereiche-in-privat.test.js`).
Alle Pro-Beschriftungen einer pro-en-Datei stimmen in privat-en mit pro-en überein, und die Lese-App
liest Feld und Option aus dem Sprachmodul (`tests/angedockte-feldtexte-folgen-der-sprache.test.js`).

Die Namen reisen mit, an allen vier Produkten: jede Datei aus privat-de, privat-en, pro-de und
pro-en wird in der Lese-App geöffnet, und jeder Bereich darin hat einen echten Namen, ebenso jede
Sektion, jedes Feld und jedes Unterfeld (`tests/lese-app-zeigt-jeden-bereich-beschriftet.test.js`;
rot für pro-de, sobald die Mitschrift nur den Bereichsnamen trägt). Die Werte erscheinen
(`tests/lese-app-golden-master-vier-produkte.test.js`), und die Mitschrift trägt keinen Bereich
ohne Namen (`tests/abwerk-mitschrift-bereichsnamen.test.js`).

Und: der Verteiler selbst (`_abWerkStrukturInsDepot`) schreibt die volle Form auch im nativen
Gerüst (leer, nicht fehlend), bricht nicht, wenn dessen Funktion (noch) nicht existiert, und
`depotAnlegen()` ruft ihn genau einmal auf.

## Was NICHT gebaut wurde

`textsatzSpracheAktiv()` konsultiert die Mitschrift NICHT für die AKTIVE Sprachwahl (nur die
SEED-Funktion tut es, für die Verfügbarkeit der Übersetzung) — eine Bürgerin, die im Pro-en-
Produkt Englisch sah, sieht nach dem Wechsel ins private Produkt wieder die deutsche
UI-Beschriftung (der eingebaute Rückfall), auch wenn ihre eigenen Werte unverändert und lesbar
bleiben. Das war nicht Teil des Auftrags (die vier roten Beweise nennen „Bereiche lesbar", nicht
„Sprache bleibt aktiv") und wurde bewusst nicht mitgebaut, um den Auftrag nicht stillschweigend
zu erweitern — offene Frage, falls gewünscht ein eigener, kleiner Folgezug.
