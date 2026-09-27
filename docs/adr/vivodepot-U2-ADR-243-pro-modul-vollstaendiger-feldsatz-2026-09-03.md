# U2-ADR-243 · Pro-Modul, vollständiger Feldsatz — sechs Bereiche, angedockt

**Datum:** 03.09.2026 · Nachtrag 04.09.2026 (Vorsorge-Frage entschieden)
**Status:** Gilt für Teil 1 · Teil 2 offen (wartet auf die Entscheidung zur Situationen-Bauform) (bereinigt 25.09.2026)
**Status heute:** gilt vollständig für Teil 1; Teil 2 wartet weiter auf eine Produktentscheidung (Situationen-Bauform)
**Bezug:** interne Feldsatz-Spezifikation vom 03.09.2026 (Auftrag vom 03.09.2026) ·
`vivodepot-pro-zusammensetzung-entwurf-2026-09-03.md` §3 (Feld→Bereich-Zuordnung, dieselbe Ablage) ·
`pro-modul-betriebsuebergabe-kammer-checklisten-abgleich-2026-09-02.md` (18 Fehlstellen, Quelle
der neuen Felder) · Auftrag „Betriebssatz — echtes Pro-App-Paar D/E" (30.08.2026, die
bisherigen 36 Felder)

---

## 1 · Kontext

Das Pro-Modul führte bislang 36 Felder in EINEM Bereichs-Container („Betriebsübergabe"). Eine
vollständige Spezifikation (s. o.) legt sechs fachliche Bereiche fest (Vertretung und
Vollmachten · Gesellschaft und Nachfolgeregelung · Finanzen und Verbindlichkeiten · Betrieb und
Zugänge · Aufbewahrung und Ordnung · Kontakte und Vertretungsplan), vier Situationen (Notfall ·
Vertretung · Übergabe · Nachfolge) und 18 aus zehn Kammer-Quellen gemessene Fehlstellen, von
denen nach Mehrfachbau-Prüfung 15 echte neue Felder werden (s. §3) — drei davon standen bis zum
04.09.2026 vorläufig, s. §3a.

**Bauform bewusst geprüft, nicht angenommen:** vor dem Bau stand offen, ob die sechs Bereiche
nativ (ein eigenes, eingefrorenes `PRO_SEKTOREN`-Analog) oder angedockt (`_BEREICHS_MODUL_
REGISTRY`, wie das Modul heute schon andockt) werden. Entschieden: **angedockt** —
Pro ist ein Modul, und Module docken an.

**Ein Fund während des Baus, der über diesen Auftrag hinausgeht:** die native `SITUATIONEN`-
Struktur (situationseigene Felder, z. B. bei „Geburt" oder „Hauskauf") ist heute vollständig
hartcodiert — kein angedocktes Modul kann selbst eine Situation anlegen oder ihr ein eigenes Feld
geben (die Erlaubnisliste für angedockte Feld-Vorlagen, `_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL`,
kennt nur `bereich`, keinen `situation`-Schlüssel). Während der Klärung wurde eine übergeordnete
Frage entschieden: **das Gerüst trägt keine Inhalte** — weder die der Bürgerin noch die
eines Moduls. Vier native Situationen-Einträge für Pro anzulegen wäre Pro-Inhalt im Gerüst und
liefe dieser Entscheidung zuwider — und die Folge reicht über Pro hinaus: würde das Gerüst
eingefroren, ohne dass Module Situationen mitbringen können, könnte KEIN künftiges Modul je eine
Situation haben.

---

## 2 · Entscheidung — zweigeteilt

**Teil 1 — gebaut:** die sechs Bereiche, vollständig angedockt, mit allen Feld-Definitionen
(Bestand + neu). Kein offener Punkt, keine Voraussetzung.

**Teil 2 — angehalten, nur gemessen:** die vier Situationen (inkl. der zehn eigenen Nachfolge-
Felder aus Spezifikation Teil B3) und `fachlicherRueckhalt` (Teil B4, derselbe Erlaubnislisten-
Eingriff). Beide brauchen einen Weg für ein angedocktes Modul, eine Situation zu tragen oder ein
neues optionales Feld-Metadatum zu setzen — heute nicht vorhanden. **Wartet auf die Produktentscheidung**, wie „das Gerüst trägt keine Inhalte" mit dem bestehenden Bauform-Baustein
„Situation" (einer der sechs erlaubten: Bereich, Sektion, Feld, Situation, Block, Anlass)
zusammengeht.

**Gemessen für Teil 2** (Auftrag, nicht gebaut): die Registry-/Lookup-Seite (eine neue
Situation aus reinen `{quelle, feld}`-Zügen ohne eigene Felder) ist eine kleine, zweifach
vorbestätigte Spiegelung des bestehenden Bereich-Andock-Musters (`bereicheAlle()` und,
unabhängig davon, `_dynamischeAnlaesse`/`registriereAnlass()`). Die eigentliche, größere Lücke
liegt bei situationseigenen FELDERN (nicht gezogenen) — dafür existiert heute kein
`feldDefinitionen[]`-Äquivalent; der Wert-Weg selbst (`situationFeldSetzen`/`liesSituation`) ist
dagegen bereits generisch und bräuchte keine Änderung. Geschätzter Umfang: begrenzte,
gut vorgebildete Erweiterungsarbeit (~6–8 Funktionen + ein neues Datenarray, ein Aufrufer
stromaufwärts zu ändern) — weder „eine Handvoll Zeilen" noch „echter Umbau mit offenen
Design-Fragen".

---

## 3 · Umsetzung (Teil 1)

**Sechs Bereichs-Container in EINER Registrierung** (`tools/pruefstoff-betriebsuebergabe-
bereichsmodul-bauen.js`) — `bereiche` nimmt seit A484 ein Objekt mit mehreren Schlüsseln,
kein sechsfaches Andocken nötig. IDs (`pro-vertretung-vollmachten` … `pro-kontakte-
vertretungsplan`) folgen dem Bereichs-ID-Format (`/^[a-z][a-z0-9-]{1,39}$/` — Bindestrich, kein
Unterstrich).

**36 Bestandsfelder, 1:1 nach ihrem heutigen `gruppe`-Wert verteilt** (Block 1→Bereich 1 …
Block 5→Bereich 5, aus `vivodepot-pro-zusammensetzung-entwurf-2026-09-03.md` §3 hergeleitet und
dort tabelliert) — keine Umsortierung, nur ein Formwechsel. Bereich 6 hatte kein Altfeld.

**18 neue Felder** (Spezifikation Teil B1), nach Mehrfachbau-Prüfung gegen den Kern (Teil A5 der
Spezifikation — u. a. `pro_ehevertrag_gueterstand` entfiel als bereits gebaut,
`pro_kontakt_intern`/`_extern`/`pro_kunden_lieferanten` wurden zur Institutionen-Erweiterung
statt neuer Kennungen — s. §4): 15 echte neue Kennungen (Patientenverfügung-/Betreuungsverfügung-/
Testament-Ablageort standen bis zum 04.09.2026 vorläufig, s. §3a).

**Prokura-Erweiterung:** zwei zusätzliche Unterfelder (Beschränkung, Befristet bis) am
bestehenden Feld — keine neue Kennung, wie in der Spezifikation vorgesehen.

---

## 3a · Nachtrag 04.09.2026 — Vorsorge-Frage entschieden, Landes-Prüfung nachgezogen

**Pro führt `vorsorge` NICHT.** Wörtlich: „Vorsorge ist u. U. was anderes in Pro als in
privat." Keine Frage der Eigenständigkeit (Pro als Gerüst-plus-Modul für sich), sondern eine
Namenskollision — die sechs Pro-Bereiche decken betriebliche Vorsorge bereits ab (unter
„Vertretung und Vollmachten" und „Gesellschaft und Nachfolgeregelung"); ein Bereich `vorsorge`
in Pro wäre ein zweiter, betrieblicher Gegenstand unter dem Wort des privaten, ein Querverweis
darauf verbände zwei verschiedene Sachen unter einem Namen. **Die drei vorläufigen Kennungen
(`Patientenverfügung — Ablageort`, `Betreuungsverfügung — Ablageort`, `Testament oder Erbvertrag
— Ablageort`) sind damit endgültig** — keine `CROSS_SEKTOR_FELDER`-Kandidaten mehr, kein
Handlungsbedarf.

**Landes-Prüfung, im selben Zug angefragt:** von allen 54 Feldern trägt genau EIN
Label eine Landes-Auflösungsgrenze, die der Textsatz-Mechanismus nicht sauber lösen kann —
`Testament oder Erbvertrag — Ablageort` nennt zwei Instrumente in einem Label über einem
(einzigen, skalaren) Feld; „Testament" ist universell, „Erbvertrag" deutsch/österreichisch-
spezifisch. Ein Land, das kein eigenständiges „Erbvertrag"-Instrument kennt, bekäme ein Label,
das mehr verspricht, als das Zielrecht hält. **Kein Handlungsbedarf jetzt** (der Textsatz löst
Kennung-für-Kennung, nicht Wort-für-Wort innerhalb eines Labels) — beim ersten nationalen Zusatz
als Erstes anzusehen.

**Der einzige echte Kategorie-3-Kandidat unter allen 54 Feldern bleibt Prokura** — nicht wegen
des Namens, sondern weil der Unterfelder-Zuschnitt am HGB hängt (Italiens `institore` hat einen
anderen Umfang). Die beiden neuen Unterfelder dieses Baus (Beschränkung, Befristet bis) sitzen
genau dort — kein Grund, sie jetzt zu ändern, aber der erste Ort, den ein nationaler Zusatz
prüfen sollte.

**EN-Textsatz-Fund unterwegs:** der additive Übersetzungsweg (`betriebssatz-aufbereiten.js`)
überschrieb bislang genau EIN Bereichs-Label. Mit sechs Bereichen blieben fünf davon in der
englischen Fassung deutsch — jetzt überschreibt er alle sechs.

**Nicht gebaut, wie aufgetragen:** Erbschein. Die Quelle sagt es selbst — ein Verfahrensschritt,
kein Datenfeld. Kein `jaNein`-Behelfsfeld, kein Fortschritt gegenüber der Lücke.

---

## 4 · Rot-Beweis (Teil 1)

Bestehende Testdatei erweitert, nicht verdoppelt (`tests/betriebssatz-inhalte.test.js`): der
Drift-Wächter gegen den historischen Prüfstoff bleibt exakt auf die 36 Bestandsfelder skaliert
(die 18 neuen standen nie in dieser Quelle — eine Prüfung gegen eine Datei, die sie nie kannte,
wäre keine echte Probe). Neue, zentrale Probe: eine echte Ende-zu-Ende-Kette (Erzeuger signiert,
Zertifikat ausgestellt, Depot lässt ein, rendert) bestätigt für alle 54 Felder, dass jedes im
RICHTIGEN von sechs Bereichen erscheint — UND dass kein Feld aus einem fremden Bereich
fälschlich mit auftaucht (echte Trennung, nicht nur ein umbenannter, einzelner Container).

`tests/betriebssatz-aufbereiten.test.js` erweitert für die sechs EN-Label-Schlüssel statt einem.

Vollsuite `npm test`: grün (Ende-zu-Ende-Kette inklusive). E2E-Bestandsprobe
(`tests/e2e/pro-modul-einlass-durchgang.spec.js`, eigenes, unabhängiges Fixture) unverändert
grün.

---

*Vivodepot GmbH · Berlin · 03.09.2026*
