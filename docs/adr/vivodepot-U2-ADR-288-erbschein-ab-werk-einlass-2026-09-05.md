# U2-ADR-288: Byte-Gleichheit war bewiesen, Erreichbarkeit nie — der Erbschein-Vorbereitungsauszug wird ab Werk eingelassen

**Datum:** 05.09.2026
**Status:** Angenommen und umgesetzt.
**Status heute:** gilt in der Wirkung, nicht mehr im Weg. Seit Schema 87 (21.09.2026) steht der Auszug nicht mehr im Kern, sondern
als Template im Rezept von privat-de und privat-en (U2-ADR-427, `templatePfade`); er kommt als Saat des Produkts, nicht als Kopie im
Depot. Die Konstante, `_abWerkAuszugPflicht` (der Boot-Wurf, der ein leeres Gerüst unstartbar machte), `_abWerkAuszuegeEinlassen` und die
Nachlieferung der Schema-Stufe 79 entfallen; Stufe 87 räumt eine alte Kopie aus dem Depot. Was der Entscheid wollte, die Bürgerin sieht den
Auszug ohne Einlass, hält `tests/erbschein-ab-werk-einlass.test.js` jetzt am gebauten Produkt. Der Text unten beschreibt den Weg
vor Schema 87. Betroffen waren `vivodepot.html` (`depotAnlegen()`, `depotNormalisieren()` Schema 78→79, `.modal`/`.modal-koerper`/`.modal-aktionen`),
`tools/erbschein-vorbereitung-modul-erzeugen.js` → `tools/erbschein-vorbereitung-modul.json`,
`tests/erbschein-ab-werk-einlass.test.js`, `tests/erbschein-modul-tools-byte-gleichheit.test.js`,
`tests/weg-hilfen.js` und sechs weitere Dateien mit demselben `closest()`-Nachtrag (s. §Nachtrag).
**Bezug:** Definition of Done, Posten „in Bürgerdepot eingelassenes Juratemplate (Erbschein)" ·
Siebtes-Register-Auftrag (27.08.2026, führte den Fremdmodul-Einlass für Erbschein ein) ·
U2-ADR-145/U2-ADR-186 (Einlass-/Trust-Weg, unsignierte Selbst-Aufnahme) · U2-ADR-172/181
(Zertifikatskette für fremdsignierte Module, hier bewusst NICHT genutzt) · U2-ADR-182
(Vor-Depot-Konfiguration „Kanal B", hier als untauglicher Weg gemessen) · U2-ADR-270 (`module/`
reserviert für das Bürgerdepot-Modul selbst — hier bewusst NICHT verwendet)

---

## Kontext und Befund: eine ausgelieferte Regression, nicht nur ein offener DoD-Posten

Eine Messung gegen den echten Code (nicht gegen den Test) ergab: **seit dem Siebtes-Register-
Umbau (27.08.2026) erreichte der Erbschein-Vorbereitungsauszug kein einziges reales
Bürgerinnen-Depot mehr.** Der Docking-Mechanismus selbst war lückenlos bewiesen — Byte-Gleichheit
zum vorher fest verdrahteten Stand (`tests/siebtes-register-erbschein-byte-gleichheit.test.js`),
echter Datei-Upload über die Einstellungen-UI (`tests/e2e/erbschein-vorbereitungsauszug-abnahme.
spec.js`) — aber es gab keinen Weg, auf dem eine echte Bürgerin je an die Bundle-Datei gekommen
wäre, um sie hochzuladen.

### Der Torwächter und die drei toten Zweige

Der Render-Torwächter (`vivodepot.html:44751`):
```
if (bereichRolle(sektorId, 'erbscheinAuszugSektion') === sek.id && _modulOderVorlage('erbschein-vorbereitung'))
  html += erbscheinAuszugSektionHTML();
```
Ohne `_modulOderVorlage('erbschein-vorbereitung')` erscheint die Karte nie. Diese Funktion
(`vivodepot.html:41712`) prüft drei Zweige, alle drei für ein gewöhnliches Depot leer:

1. `VORSORGE_MODUL_BY_ID[id]` — enthält Erbschein seit dem 27.08.-Umbau nicht mehr (das war die
   Änderung selbst).
2. `data.logikModule.find(...)` — leer, wenn nie eingelassen.
3. `data.importierteVorlagen` — ein anderer Mechanismus (Feld-Vorlagen von Institutionen), nie
   logikModul-Bündel.

### Kein automatischer Weg — gemessen, nicht vermutet

Zwei mögliche automatische Wege wurden geprüft, beide verneint:

- `_alleModulRegisterAusDepotAnmelden(data)` (läuft bei jedem `depotAnlegen`) registriert nur, was
  **schon** in `data.logikModule` steht — füllt bei leerem Depot nichts nach.
- `vorDepotKonfigurationAnwenden()` / „Kanal B" (U2-ADR-182) lädt Bündel aus einer externen Datei
  `./vorabkonfiguration.js` (`vivodepot.html:25540`ff). Diese Datei existiert an keiner Stelle im
  Quellbaum — sie ist ein **Erzeugnis** von `tools/modul-app-packen.js` (geschrieben beim Packen
  einer Institutions-Fassung), kein Bestandteil des Repos. Und selbst wenn sie existierte: der
  Ladeversuch wird unter `file://` — dem Weg, auf dem die Einzeldatei-App tatsächlich läuft, vor
  dem v1-Launch der einzige reale Distributionsweg — beim Laden ausdrücklich übersprungen
  (`_vorDepotSkriptLaden`, Kommentar Zeile 25554ff, selbst gemessen: garantierter
  Konsolenfehler sonst bei jedem `file://`-Boot). **Weg B trägt damit bestenfalls eine gehostete
  Auslieferung mit eigener Provisionierungs-Datei — die Einzeldatei-Bürgerin erreicht er nie, auch
  nicht mit einem Erbschein-Bündel darin.**

Das Bündel selbst lag ausschließlich unter `tests/fixtures/erbschein-vorbereitung-logikmodul.json`
— ein Repo-interner Testpfad, für keine Bürgerin je erreichbar (kein Download-Link, keine
In-App-Quelle).

### Alt- vs. Neu-Depot: kein Unterschied

Vor dem 27.08. lag Erbschein als **fest verdrahteter Code** (`VORSORGE_MODULE`-Eintrag), nicht als
Depot-Daten — ein Depot trug nie ein Flag dafür, weil es nie eins brauchte. Nach dem Entfernen des
Codes gibt es für kein alt angelegtes Depot etwas nachzuziehen (keine Migration, kein
`depotNormalisieren`-Schritt setzte rückwirkend ein `logikModule`-Bundle). **Jedes Depot — vor
oder nach dem 27.08. angelegt — verlor die Funktion identisch, sobald es mit einer App-Fassung
≥27.08. geöffnet wurde.**

### Der Satz, der über den Fall hinausgeht

**Byte-Gleichheit war bewiesen, Erreichbarkeit nie.** Der Umbau vom 27.08. hat den Erbschein
korrekt zum Modul gemacht und den Weg vergessen, auf dem er ankommt — und das trifft nicht nur den
Erbschein: **wenn ein Modul die Einzeldatei-Bürgerin nur über die Datei erreicht, erreicht sie ein
Modul, das nach der Auslieferung entsteht, nie automatisch — nur, wenn eine Bürgerin selbst eine
externe Bundle-Datei erhält und importiert (der by-design-Weg für ein ECHTES Fremdmodul, etwa von
einer Kanzlei) oder das Modul im ausgelieferten Code selbst mitreist.** Für ein von Vivodepot
selbst herausgegebenes Modul — kein externer Herausgeber, an den eine Bürgerin sich wenden könnte
— ist der zweite Weg der einzig tragende.

---

## Die drei geprüften Wege

| Weg | Trägt für `file://`? | Kosten/Befund |
|---|---|---|
| **(a) Provisionierung über `./vorabkonfiguration.js`** (U2-ADR-182 Weg B, `tools/modul-app-packen.js`) | **Nein** — Ladeversuch unter `file://` ausdrücklich übersprungen (gemessen), Datei zudem nur ein Erzeugnis, kein Repo-Bestandteil | Trägt nur eine gehostete Auslieferung mit eigener Provisionierungs-Datei; die Einzeldatei-Bürgerin erreicht er nie |
| **(b) Import durch die Bürgerin** (Download-Link/In-App-Quelle) | Ja, aber existiert heute an keiner Stelle | Braucht eine neue Distributionsfläche (Website-Link, Katalog-Bildschirm) UND aktives Handeln der Bürgerin — behebt nichts für bereits real betroffene, passive Bürgerinnen |
| **(c) Rückbau auf feste Verdrahtung** | Ja | Widerspricht der Modulrichtung (U2-ADR-040, Erbschein als bewiesenes Fremdmodul-Beispiel), entwertet die bestehenden Docking-Proben |
| **(d) Ab-Werk-Einlass im ausgelieferten Code** (gewählt) | **Ja** — trägt unter `file://` UND gehostet gleich | Bundle reist als Konstante in `vivodepot.html` mit, Selbst-Einlass über den echten, unveränderten `modulEinlassen()`-Pfad — kein neuer Mechanismus, kein Schlüsselmaterial |

**Gewählt: (d).** Es ist strukturell dasselbe Prinzip wie (a) — das Bündel reist im
ausgelieferten Artefakt mit — nur ohne die externe Datei, die unter `file://` ohnehin nie geladen
wird. (a) bleibt für gehostete Institutions-Fassungen mit eigener Provisionierung weiterhin
sinnvoll und unverändert nutzbar; es war nur nie der Weg für die Einzeldatei-App.

---

## Entscheidung: Selbst-Einlass ab Werk, kein Rückbau, kein Schlüsselmaterial

**Herausgeber: Vivodepot selbst — so, wie es im Produkttext bereits steht** (`herkunft:
"vivodepot"`, `dokAusgabe.herkunftText`: „Vivodepot-Zusammenstellung aus Ihren Depot-Angaben —
keine amtliche Vorlage"). U2-ADR-040 deckt das ausdrücklich: Vivodepot verhält sich wie jeder
andere Anbieter und darf selbst einer sein.

**Weg: Selbst-Einlass, `ungeprueft:true`, keine Zertifikatskette.** Das Bundle
(`ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT`, minifizierter JSON-Text, inhaltsgleich zur
einzigen Quelle `tests/fixtures/erbschein-vorbereitung-logikmodul.json`) läuft über denselben,
unveränderten `modulEinlassen()`-Pfad, den auch ein manueller Datei-Upload nähme — kein zweiter
Mechanismus. Aufgerufen aus zwei Stellen:

- **`depotAnlegen()`** — jede neu angelegte Bürgerin bekommt das Modul sofort.
- **`depotNormalisieren()`, Schema 78 → 79** — jedes bestehende Depot bekommt es beim nächsten
  Laden rückwirkend nachgezogen. **Anders als jede andere Migrationsstufe in dieser Funktion
  bewusst NUR EINMAL**, gebunden an den Versionssprung selbst, nicht bei jedem Laden: diese Stufe
  fügt keine strukturelle Grundform hinzu (wie ein leeres `[]`, das für immer sicher wiederholbar
  wäre), sondern konkreten Inhalt — eine Bürgerin, die das Modul nach dieser einen Nachlieferung
  selbst entfernt, muss das auch bleiben dürfen. Der Versionssprung selbst ist die
  Einmaligkeits-Schranke.

**Additiv & respektvoll:** `_erbscheinVorbereitungAbWerkEinlassen(d)` seedet nur, wenn
`erbschein-vorbereitung` noch nicht in `data.logikModule` steht. Eine Bürgerin, die das Modul
selbst entfernt oder ersetzt hat, bleibt unberührt — geprüft in
`tests/erbschein-ab-werk-einlass.test.js`.

**Schlüsselmaterial: keins, an keiner Stelle.** Kein Anker, keine `.vdkey`, keine Passphrase, keine
Zertifikatsausstellung. Der volle Fremdsignatur-Weg (`tools/modul-erzeugen.js`, U2-ADR-172/181)
bliebe für eine spätere, echte Fremdherausgabe verfügbar — ist hier aber unnötige Fläche für
denselben Beleg: Vivodepot signiert nicht gegenüber sich selbst.

**`module/` bewusst NICHT verwendet.** U2-ADR-270 reserviert dieses Verzeichnis für das
provisionierte **Bürgerdepot-Modul** selbst („keinen Anbieter, keine Signaturkette, keine
Zertifikats-Ausstellung") — das genaue Gegenteil eines über `EINLASS_REGISTER` andockenden
`logikModul`. Stattdessen, nach dem Präzedenzfall `tools/textsatz-en-modul-erzeugen.js` →
`tools/textsatz-en-modul.json` (dasselbe Muster: Vivodepots eigenes, unsigniertes Modul, real
ausgeliefert statt nur getestet): **`tools/erbschein-vorbereitung-modul-erzeugen.js`** liest die
eine Quelle, validiert sie über den echten `logikModulPruefen`-Pfad und schreibt
**`tools/erbschein-vorbereitung-modul.json`** — ein reales, herunterladbares Erzeugnis für den
Weg (b) (Institutions-/Website-Distribution), falls dieser später zusätzlich gebaut wird.

**Drei Kopien, ein Wächter.** Dieselbe Modul-Nutzlast liegt jetzt an drei Stellen — Quelle
(`tests/fixtures/…json`), Erzeugnis (`tools/…json`), eingebettete Konstante
(`vivodepot.html`). `tests/erbschein-modul-tools-byte-gleichheit.test.js` hält Quelle und
Tools-Erzeugnis byte-identisch (mit Rot-Beweis); `tests/erbschein-ab-werk-einlass.test.js` hält
die eingebettete Konstante inhaltsgleich zur Quelle (`assert.deepEqual` nach `JSON.parse` — die
Konstante ist minifiziert, kein Byte-Vergleich möglich, aber derselbe Anspruch).

---

## Rot-Beweise

- `tests/erbschein-ab-werk-einlass.test.js`: eine frisch angelegte Bürgerin sieht das Modul in
  `data.logikModule` UND die Karte im gerenderten Sektor, ganz ohne manuellen Einlass — genau die
  Probe, die seit dem 27.08. gefehlt hat. Dazu: Migration eines Bestandsdepots (Schema 78),
  Respekt vor einer Bürgerin, die das Modul selbst entfernt hat (Schema bereits 79), Idempotenz,
  `ungeprueft:true`-Nachweis.
- `tests/e2e/erbschein-vorbereitungsauszug-abnahme.spec.js`: derselbe Beweis im echten Browser,
  ohne jeden Datei-Upload.
- `tests/erbschein-modul-tools-byte-gleichheit.test.js`: Quelle und Tools-Erzeugnis bleiben
  byte-gleich, mit Rot-Beweis.

## Angepasste Bestandsproben — Testfix, kein Produktfix

Mehrere bestehende Tests prüften „ohne manuellen Einlass ist nichts da" — eine Aussage, die dieser
Auftrag absichtlich verändert. Jeweils angepasst, nicht das Produkt zurückgebaut:

- `tests/erbschein-modul-mechanik.test.js`, `tests/siebtes-register-erbschein-byte-gleichheit.
  test.js`, `tests/erbschein-en-mechanik-test.test.js`: die jeweiligen Einlass-Hilfsfunktionen
  leeren `data.logikModule` explizit vor einem manuellen Einlass (sonst „ältere-fassung", weil
  dieselbe `moduleVersion` bereits ab Werk steht) — der Beleg, den diese Tests führen (der
  Öffnen-Knopf hängt am Registry-Eintrag, nicht an fester Verdrahtung), bleibt unverändert gültig,
  nur die Ausgangslage muss jetzt explizit hergestellt werden.
- `tests/e2e/erbschein-vorbereitungsauszug-abnahme.spec.js`: der Test „Karte erscheint erst NACH
  Einlass" ist umbenannt und umgekehrt zu „Karte erscheint ab Werk, ganz ohne Einlass" — die
  wertvollere, jetzt zutreffende Aussage.
- `tests/fixtures/migrations-stufen.js`: neuer Eintrag für Schema-Sprung 78→79.
- `tests/paket0-migrationsbeleg-referenzdepot.test.js`: `data.logikModule` wird im Referenzdepot
  vor dem Vergleich auf `[]` zurückgesetzt (Kommentar erklärt warum: diese Fehlerbehebung ist kein
  Schritt des Gerüst-Umbaus, den die Baseline schützt) — die Baseline-Datei selbst bleibt
  unangetastet, wie ihr eigenes Werkzeug es ausdrücklich verlangt („nie nach Paket 1 neu
  einfrieren"). `logikModule` zusätzlich in `PAKET0_BEKANNTE_ADDITIVE_SCHLUESSEL` nachgetragen —
  das Register existierte bereits vor Paket0s Einfrieren (Siebtes-Register-Auftrag, 27.08.), war
  in der damaligen Baseline nur nie erfasst, weil stets leer.
- `tests/golden-master-ausgabewege.test.js`, `tests/render-charakterisierung.test.js`: Baselines
  bewusst neu eingefroren (`GOLDEN_MASTER_AUSGABEWEGE_NEU=1` / `RENDER_AUFNAHME_NEU=1`) — beide
  Mechanismen sind ausdrücklich für genau diesen Fall gebaut (eine benannte, begründete
  Verhaltensänderung, kein Umbau-Nebeneffekt), beide Regenerationen in diesem selben Commit, mit
  dieser Begründung.

---

## Nachtrag: ein vorbestehender, allgemeiner Fehler in der Modal-Fußleiste — aufgedeckt, nicht verursacht

Der Push gegen dieses Paket löste einen echten WCAG-Fund aus (`axe-core`, `target-size`, serious,
am Nachtmodus-Schalter `#einst-nacht` in den Einstellungen). **Die eine neue Listenzeile des
Ab-Werk-Einlasses war der Auslöser, nicht die Ursache:** sie machte die Einstellungen-Sicht in
genau diesem Testlauf (alle `<details>`-Abschnitte gleichzeitig aufgeklappt, wie
`tests/konformitaet/wcag-axe.mjs` es für einen vollständigen Scan tut) erstmals höher als der
sichtbare Modal-Ausschnitt.

**Der eigentliche Fehler lag in `.modal-aktionen`** (der Knopfleiste jedes Dialogs,
`ui.modal()`, vivodepot.html:30707): `position: sticky; bottom: 0` **innerhalb** desselben
scrollenden Bereichs wie der übrige Inhalt (`.modal` selbst trug `overflow-y: auto`). Sobald ein
Dialog-Inhalt höher als der sichtbare Ausschnitt wird, „klebt" die Fußleiste ab Scroll-Position 0
am unteren Rand des Sichtbereichs — und deckt dabei optisch UND für Klicks ab, was an dieser
Stelle an echtem Inhalt liegt. Das betraf jedes ausreichend lange `ui.modal()`-Fenster, nicht nur
Einstellungen und nicht erst durch dieses Paket — es hatte nur bislang niemand einen Dialog weit
genug gefüllt UND mit axe an genau dieser Stelle gescannt, um es zu bemerken.

**Zweifach empirisch bestätigt, nicht vermutet** (Playwright, `getBoundingClientRect`/
`elementFromPoint`, Debug-Skript sofort wieder entfernt): `.modal-aktionen` auf `position:static`
gesetzt beseitigte die Überlappung vollständig (bewies die Ursache, war aber keine Lösung — die
Knöpfe wären dann ohne Scrollen bis ganz nach unten nicht erreichbar).

**Behebung — das übliche Muster, nicht mehr geraten:** `.modal` ist jetzt ein Rahmen mit fester
Kopf-/Fußzeile (Flex-Spalte); ausschließlich der neue Wrapper `.modal-koerper` scrollt
(`flex: 1 1 auto; min-height: 0; overflow-y: auto`). `.modal-aktionen` liegt außerhalb des
Scrollbereichs, kein `position: sticky` mehr nötig — die Knöpfe können nie wieder über echtem
Inhalt liegen, weil sie nie Teil des scrollenden Bereichs sind. Verifiziert: derselbe axe-Lauf,
39 Sichten gescannt, 0 Funde.

**Folgekosten des neuen Wrappers, behoben:** sieben Dateien (`tests/weg-hilfen.js`,
`tests/mit-modul/weg-1-depot-anlegen.test.js`, `tests/mit-modul/weg-2-etwas-erfassen.test.js`,
`tests/mit-modul/weg-3-importieren.test.js`, `tests/mit-modul/axe-region-landmarks.test.js`,
`tests/mit-modul/depot-einrichten-schliesst-notfallblatt.test.js`, `tools/kampagne.js`,
`tools/zustand-erkunden.js`, `tools/gesamtdurchlauf.js`,
`tools/fliesstext-ausnahme-erheben.js`) nutzten `element.closest('form, .modal, #overlay-inhalt,
section, div')`, um vom Passwort-Feld aus zum umschließenden Dialog zu finden — das bloße `div`
in dieser Liste traf jetzt zuerst `.modal-koerper` (selbst ein div) und stoppte dort, bevor es
`.modal` erreichte. `div` aus der Liste entfernt (die echten Container `.modal`/`#overlay-inhalt`/
`section`/`form` stehen bereits explizit da) — betrifft nur die Suchheuristik dieser
Werkzeuge/Tests, keine Produktänderung. Zusätzlich eine Positivkontrolle
(`tests/mit-modul/axe-region-landmarks.test.js`) auf den neuen, jetzt korrekten Wortlaut
nachgezogen (meldet seither `.modal-koerper` statt des inneren `#nfb-angebot`, wenn `role="dialog"`
fehlt — dieselbe Aussage, andere Knoten-Adresse).

## Ausdrücklich nicht behandelt

- Weg (b) (Bürgerin-Import über Download-Link/Katalog) — nicht gebaut, `tools/erbschein-
  vorbereitung-modul.json` liegt bereit, falls dieser Weg zusätzlich gewünscht ist.
- Die generelle Frage, wie ein NACH der Auslieferung entstandenes, echtes Fremdmodul (z. B. ein
  künftiges Kanzlei-Template) eine Einzeldatei-Bürgerin erreichen soll — hier nur benannt, nicht
  gelöst. Der by-design-Weg (Institution reicht die Datei selbst weiter) trägt für ECHTE
  Fremdherausgeber; er trägt nicht für ein Vivodepot-eigenes Modul, das keinen solchen Herausgeber
  hat.
- Ob der Erbschein-Auszug künftig unter einer anderen Herausgeber-Kennung (z. B. eines externen
  Partners) firmieren soll — eine Marken-/Partnerfrage, keine Bau-Entscheidung dieses Auftrags.

## Konsequenzen

**Positiv.** Der DoD-Posten „in Bürgerdepot eingelassenes Juratemplate (Erbschein)" ist erfüllt —
und eine seit über einer Woche ausgelieferte, unbemerkte Regression ist geschlossen, rückwirkend
auch für bereits bestehende Depots. Der Fund selbst (Byte-Gleichheit ≠ Erreichbarkeit) ist
wiederverwendbar für jedes künftige `logikModul`/EINLASS_REGISTER-Modul, das Vivodepot selbst
herausgibt.

**Negativ/offen.** Ein echtes, extern signiertes Fremdmodul-Beispiel bleibt weiterhin ungebaut
(bestehende Lücke, nicht neu). Weg (b) bleibt ungebaut. Die größere Frage nach der allgemeinen
Distributionsfläche für Vivodepot-eigene Module (jenseits des einen Erbschein-Beispiels) bleibt
offen, als Produktentscheidung benannt.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
