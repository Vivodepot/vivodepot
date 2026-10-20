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
Pro-Bereich; die Region entspricht den Bereichsersätzen (eine nicht öffentliche Probe).
Alle Pro-Beschriftungen einer pro-en-Datei stimmen in privat-en mit pro-en überein, und die Lese-App
liest Feld und Option aus dem Sprachmodul (eine nicht öffentliche Probe).

Die Namen reisen mit, an allen vier Produkten: jede Datei aus privat-de, privat-en, pro-de und
pro-en wird in der Lese-App geöffnet, und jeder Bereich darin hat einen echten Namen, ebenso jede
Sektion, jedes Feld und jedes Unterfeld (`tests/lese-app-zeigt-jeden-bereich-beschriftet.test.js`;
rot für pro-de, sobald die Mitschrift nur den Bereichsnamen trägt). Die Werte erscheinen
(`tests/lese-app-golden-master-vier-produkte.test.js`), und die Mitschrift trägt keinen Bereich
ohne Namen (eine nicht öffentliche Probe).

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

## Nachtrag 11.10.2026 — Bereich und Bereichsersatz der Mitschrift gelten nur nach Inhalt

Befund MITSCHRIFT-AB-WERK-NACH-POSITION, Teil Bereich und Bereichsersatz. Die Mitschrift steht in der Datei; wer die Datei hat,
kann sie ändern. Kern und Lese-App säten aus den Fächern `bereich` und `bereichsErsatz` bisher jeden Bereich, allein weil er an
dieser Stelle stand. Die übrigen Fächer gelten seit 05.10.2026 nur nach Inhalt (Rezept-Abdruck des Moduls).

**Was gemessen wurde.** Für diese beiden Fächer trägt weder der Rezept-Abdruck noch ein Abdruck über die ganze Definition:

- Die Bereichs-Mitschrift ist nicht die Template-Datei. Das Produkt schreibt je Bereich die Definition mit seinen
  Beschriftungen; der Bereichsersatz ist kein Modul.
- Jedes bis v923 ausgelieferte Produkt, das eine Datei öffnete, schrieb seine eigenen Beschriftungen in die Definitionen der
  Datei: in seiner Sprache, in seinem Wortlaut, mit aufgelöstem Markennamen. Ab v922 hängte das Nachtragen dazu fehlende
  Sektionen und Felder an. Über jede ausgelieferte Fassung und jedes ihrer vier Produkte gemessen, änderte das Öffnen an einer
  Definition nur die Werte der Eigenschaften `label`, `hint` und `beispiel` und, beim Nachtragen, die Zahl der Sektionen und
  Felder. Volle Definitionen vervielfachen sich so über Fassungen und Sprachen und lassen sich nicht abschließend aufzählen.

**Entscheidung.**

1. Zwei eigene Mengen, getrennt von den Modul- und Rezept-Abdrücken, beide mit Art und Kennung in den Bytes:
   - **Struktur:** SHA-256 über die kanonische Form von `{ art: 'bereichsstruktur', id, definition }`. In der Definition ist
     jeder Zeichenketten-Wert der Eigenschaften `label`, `hint`, `beispiel` durch die leere Zeichenkette ersetzt; die
     Eigenschaft bleibt stehen.
   - **Text:** je Text SHA-256 über die kanonische Form von `{ art: 'bereichstext', id, ort, schluessel, text }`. `ort` ist die
     Kette der Kennungen der umschließenden Objekte (`id`, sonst `format`, sonst `wert`), ohne Listenplätze; `schluessel` ist
     die Eigenschaft.
     Je Definition ist das Paar aus Ort und Eigenschaft eindeutig: zwei Texte am selben Ort unter derselben Eigenschaft wären
     untereinander austauschbar. Der Erzeuger hält es für jede Definition, die in die Mengen eingeht, und schreibt sonst nichts.
2. Eine Definition gilt als ausgeliefert, wenn ihr Struktur-Abdruck in der einen und jeder ihrer Texte in der anderen Menge
   steht. Ein Text gilt nur für diesen Bereich, diese Stelle und diese Eigenschaft. Eine Datei kann damit an einer Stelle
   höchstens den Wortlaut einer anderen ausgelieferten Fassung oder Sprache zeigen. Eigenen Text, eigene Felder, eine eigene
   Struktur, einen Text an anderer Stelle, eine zusätzliche Text-Eigenschaft oder einen Wert, der keine Zeichenkette ist,
   bringt sie nicht ein.
3. Beide Mengen entstehen allein aus den ausgelieferten Ständen, nie von Hand, und der Lauf ist wiederholbar (zwei Läufe
   schreiben dieselben Bytes). Hinein geht: was die vier Produkte jeder ausgelieferten Fassung beim Anlegen mitschreiben; die
   Definitionen der Region „Bereiche aller Vivodepot-Produkte“ jeder Fassung; jeder dieser Texte mit aufgelöstem
   Markenplatzhalter, aufgelöst vom Kern der Fassung selbst; und die Strukturen, die das Nachtragen der Fassungen, die es beim
   Laden aufrufen, aus diesen Definitionen macht (so oft angewandt, bis nichts Neues entsteht). Der Stand, der gerade gebaut
   wird, zählt als Quelle mit. Die Einträge stehen ungekürzt als `sha256:…` in Kern und Lese-App.
4. Sichtbarkeit und Rechte sind zwei Dinge. Gesät und gezeigt wird aus beiden Fächern JEDE strukturell gültige Definition, mit
   allen Angaben: jede Datei öffnet in jedem Produkt (U2-ADR-160; „Jede Datei öffnet in jedem Produkt, und alles muss drin
   sein“). Das Urteil aus Punkt 2 entscheidet nur, als was sie gilt. Eine als ausgeliefert erkannte Definition behält, was sie
   trägt. Jede andere gilt als „aus der Datei“: Sie erscheint als gewöhnliche Abschnitte und Felder, im Kern mit dem Rand
   „fremd“, und Herkunftssatz und PDF-Fuß zählen sie als Erweiterung ohne geprüfte Herkunft. Von den Eigenschaften, die über das
   Anzeigen hinaus wirken, behält sie nur die Darstellung der zwei Register, deren Zeilen im Depot liegen und nicht im Bereich:
   die Merkmale `personenRegister` und `stellenRegister`, die Rollen `personenSektion`, `schutzbefohleneSektion` und
   `stellenSektion` (nur für eine Sektion desselben Bereichs) und `stellenListe` mit dem festen Speicher `institutionen`. Ohne sie
   stünden die Zeilen des Stellen-Registers in keiner Ansicht. Alles Übrige fällt in der Kopie für die Anzeige weg: jedes andere
   Merkmal, jede andere Rolle (Ankername, Familienstand, Kontaktkanäle, Auszüge, Listen-Rollen), `wizardId`, `wizards`,
   `exporte`, `standardDokumente`, `deckblatt`, `format`. Die behaltene Menge steht als geschlossene Listen im Kern; eine Probe
   schlägt an, wenn sie wächst. Dasselbe gilt eine Ebene tiefer (berichtigt am 11.10.2026, Befund
   DATEI-BEREICH-FELD-EIGENSCHAFTEN; mit v926 gingen die Felder eines solchen Bereichs noch mit allen Eigenschaften durch, und ein
   Feld mit der Marke `frist` setzte einen Termin in die Prüftermine des Depots): an Abschnitt, Feld, Unterfeld und Option bleibt
   nur, was in einer geschlossenen Liste steht, nämlich was zeigt und Eingabe annimmt (Kennung, Typ aus einer festen Typenliste,
   Beschriftungen, Optionen, Unterfelder, Eingabehilfen) und was nur einschränkt (`sensibel`, `pflicht`, `keineZukunft`,
   `datumJahrMin`). Marken, Fristen, Prüf-Intervalle, Gültigkeitsvorschläge, Zweck und Rolle eines Verweises, Quellen,
   Code-Listen, Ersetzungen und Sichtbarkeitsbedingungen fallen, ebenso jede künftige Eigenschaft; ein unbekannter Typ wird als
   Text gezeigt. Ein Verweis auf eine Person oder Stelle wird in einem solchen Bereich nur gelesen: der Name steht da, Auswahl und
   Anlegen gibt es nicht; die Art des Verweises bleibt nur für Stellen stehen, weil der Name sonst nicht lesbar wäre. Die Anzeige
   „wird verwendet in“ nennt den Bereich bei der Stelle; sie zeigt, was in der Datei steht. Eine Probe ordnet jede
   Feld-Eigenschaft des Repos ein und schlägt an, wenn eine neue ohne Einordnung auftaucht. In der Datei bleibt die Definition unverändert; öffnet später eine Anwendung, die sie erkennt,
   zeigt diese sie wieder ganz. Einen Hinweis „Bereich nicht angezeigt“ gibt es nicht, weil kein Bereich der Datei ausgeblendet
   wird. Die Lese-App übernimmt aus einem Datei-Bereich nur Kennung, Beschriftung und Abschnitte.
5. Ein Treffer macht nichts „ab Werk“. Die Saat läuft weiter ohne die Ab-Werk-Ausnahme, eingebaute Kennungen bleiben dem
   Produkt vorbehalten, und die Liste `ersetzt` des Bereichsersatzes wirkt aus einer Datei nie.
6. Ab v926 verändert das Öffnen die Mitschrift einer Datei nur noch auf einem Weg: Das Nachtragen ersetzt eine als
   ausgeliefert erkannte Definition durch die Form des Produkts (Nachtrag an U2-ADR-243). Die Saat arbeitet auf Kopien; die
   Beschriftungen des öffnenden Produkts gelangen nicht mehr in die Datei.
7. Mit jeder Auslieferung wachsen die Mengen um die Strukturen und Texte der neuen Fassung. Eine Probe verlangt, dass jede
   ausgelieferte Fassung im Beleg steht.

**Benannte Grenze.** Der Markenplatzhalter ist mit dem Markennamen aufgelöst, den die ausgelieferten Produkte tragen. Hat eine
Anwendung mit der Vor-Depot-Marke einer Institution eine fremde Datei geöffnet und gespeichert, steht in deren Mitschrift ein
Text mit diesem Namen, den die Text-Menge nicht führt. Dasselbe gilt für die Datei einer neueren Fassung in einer älteren
Anwendung und für den Bereich eines Partners. Folge: In einem Produkt, das den Bereich nicht selbst führt, erscheint er nach
Punkt 4 als „aus der Datei“, schlicht und mit allen Angaben; im eigenen Produkt ändert sich nichts.

**Korrektur vor der Landung (11.10.2026).** Die erste Fassung dieses Nachtrags säte nur erkannte Definitionen und nannte die
übrigen in einem Hinweis. Das hätte Bereiche ausgeblendet, die jede Fassung davor gezeigt hat, und stand gegen U2-ADR-160 und
gegen die Zusicherung dieses ADR. Der Befund MITSCHRIFT-AB-WERK-NACH-POSITION schließt darum über die Herkunft, nicht über das
Ausblenden. Proben: eine nicht öffentliche Probe, Abschnitt 5.

**Zwei Fächer ohne Leser.** Die Fächer Rechtsraum-Katalog und Dokumente der Mitschrift werden geschrieben und im Vollexport
zurückgehalten, aber von keinem Code gelesen. Für sie gibt es keine Inhaltsprüfung; eine Probe wird rot, sobald ein Leser
dazukommt.

**Proben:** eine nicht öffentliche Probe (Rundreise Pro → Privat → Pro → Privat ohne Verlust und ohne Verwurf;
untergeschobene und um ein Zeichen geänderte Definition in beiden Fächern; dieselbe Definition unter anderer Kennung; je Angriff
aus Punkt 2 eine Probe; das Öffnen einer fremden Datei lässt ihre Mitschrift byte-gleich; Hinweis mit einem Namen, der Markup
enthält; Lese-App; je mit Rot-Beweis), `tests/vertrauen-nie-aus-selbstauskunft.test.js` (keine Lesestelle der Mitschrift ist
mehr als offen geführt; die zwei Fächer ohne Leser).
