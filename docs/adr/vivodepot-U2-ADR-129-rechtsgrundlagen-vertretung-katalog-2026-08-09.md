# U2-ADR-129: Rechtsgrundlagen der Vertretung — ein Katalog statt zwei, gesetzliche Betreuung ergänzt

**Status:** Akzeptiert
**Datum:** 09.08.2026
**Kategorie:** DATENMODELL, ARCHITEKTUR
**Grundlage:** interner Auftrag „F3 – Vollmacht" (09.08.2026), Register **F3**
(Befund und Einwand zur Betreuungsvollmacht, 09.08.2026).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `RECHTSGRUNDLAGEN_VERTRETUNG` (ersetzt
  `VERTRETUNGS_GRUNDLAGEN`), `vertretungsGrundlageLabel`/`vertretungsGrundlageOptionenHTML`,
  `subDepotAnlegen`, `flowSubDepotAnlegen`/`flowKindSubDepotAnlegen`/
  `_depotIdentitaetUndPasswortAbfragen` (`grundlageDefault`), das `art`-Unterfeld an
  `vorsorge_instrumente` samt neuem `art_betreuung_hinweis`, Schema-48-Migration in
  `depotNormalisieren`. Gespiegelt in `vivodepot-lesen.html` (Parität).
- **Sprint-Commit:** `57dd75f`.
- **ADR-Bezug:** dieser ADR; U2-ADR-089 (Vollmacht-Record, `art`-Feld dort ursprünglich
  definiert); U2-ADR-050 (Verwaisungs-Regel, hier für den `betreuung`-Bestandswert angewandt).
**Status heute:** gilt — Beleg `tests/f3-rechtsgrundlagen-katalog.test.js#[F3] RECHTSGRUNDLAGEN_VERTRETUNG: die fünf alten Werte + die zwei neuen/bestehenden gesetzlichen Grundlagen, mit Kennzeichnung`.

---

## Kontext

Zwei Katalog-Stellen beschrieben denselben Fünfer-Wertebereich
(vorsorge/gesundheit/bank/betreuung/general) redundant:

1. `vorsorge_instrumente.art` — die Art einer besessenen Vorsorgevollmacht (U2-ADR-089).
2. `VERTRETUNGS_GRUNDLAGEN` — die rechtliche Grundlage, aus der sich beim Sub-Depot-Anlegen
   die Befugnis ableitet, ein fremdes Depot zu führen (D35 Commit 4).

Beide sind eine Kopie desselben Werte-Fünfers — ein W-8-Fall (Doppelerfassung), der dem
mechanischen W-8-Wächter (`tools/w8-doppelerfassung-pruefen.js`) strukturell entgeht: er
prüft Schema-Felder/Situationsfelder/Wizard-Ziele, keine freien JS-Objektkonstanten wie
`VERTRETUNGS_GRUNDLAGEN`. Der Fund ist damit ein Regel-23-Ergebnis (frisch gemessen), kein
Wächter-Fund — kein Eintrag in dessen Grundlinie nötig oder möglich.

**Der wichtigste Fall fehlte in BEIDEN Katalogen.** Wer durch Beschluss des
Betreuungsgerichts zur Betreuerin bestellt ist (§ 1814 BGB — **gesetzliche** Vertretung,
keine erteilte Vollmacht), fand in keinem der beiden Kataloge einen zutreffenden Eintrag.
Der einzige ähnlich klingende Wert, „Betreuungsvollmacht" (`betreuung`), ist kein
Rechtsbegriff — eine Betreuung wird bestellt, nicht bevollmächtigt. Eine Bürgerin in dieser
Lage musste also einen falschen Begriff wählen oder gar keinen — der Einwand, die Betreuung
dürfe nicht verschwinden, trifft zu, zeigt aber einen größeren Fehler, als er
benannt hat.

## Entscheidung

**Ein Katalog, zwei Verwendungsorte.** `RECHTSGRUNDLAGEN_VERTRETUNG` ersetzt
`VERTRETUNGS_GRUNDLAGEN` als einzige Quelle. Jeder Eintrag trägt zwei unabhängige
Kennzeichnungs-Flags statt einer impliziten Zugehörigkeit:

- `instrumentWaehlbar` — ist der Wert an `vorsorge_instrumente.art` wählbar (ein
  **besessenes Instrument**)?
- `grundlageWaehlbar` — ist der Wert als Sub-Depot-`vertretungsGrundlage` wählbar (**woraus
  sich die Befugnis ableitet**, ein fremdes Depot zu führen)?

Die beiden Fragen sind nicht dieselbe: eine Vollmacht kann beides sein (`vorsorge`, `bank`),
eine Betreuerbestellung nur das zweite. `art`s Options-Liste an `vorsorge_instrumente`
leitet sich aus `instrumentWaehlbar` ab; `vertretungsGrundlageOptionenHTML` aus
`grundlageWaehlbar`.

**Gesetzliche Betreuung ergänzt.** Neuer Wert `gesetzliche_betreuung` — „gesetzliche
Betreuung (Bestellung durch das Betreuungsgericht, § 1814 BGB)" —, `grundlageWaehlbar:true`,
`instrumentWaehlbar:false` (kein Dokument der Inhaberin, sondern eines über sie, durch
Gerichtsbeschluss). Wählbar am Sub-Depot-Anlegen-Dialog; vorbefüllt, wenn der Aufruf von
einer verlinkten Schutzbefohlene-Zeile mit `vertretung_art:'betreuung'` kommt
(`flowKindSubDepotAnlegen`). Die Detailangaben einer Bestellung (Betreuungsgericht,
Aktenzeichen, bestellt seit, Aufgabenkreise) werden **nicht** als zweite Kopie in die
Klartext-Sub-Depot-Metadaten aufgenommen — sie leben bereits verschlüsselt am
Schutzbefohlene-Datensatz (`vertretung_art`/`betreuungsgericht`/`aktenzeichen`/
`bestellt_seit`/`aufgabenbereiche`, „Kinder und Schutzbefohlene"), verlinkbar über
`vertreteneRegisterId`. Eine zweite, plaintext-sichtbare Kopie derselben Gerichts-/
Aktenzeichen-Angaben in den Sub-Depot-Metadaten (die vor dem Sub-Passwort lesbar sind, wie
`vertretungsGrundlage`/Vorname/Nachname es bewusst sind) wäre eine neue, unnötige
Sensibeldaten-Exposition gewesen.

**`art` auf die Instrument-Ebene zurückgeführt.** `gesundheit` und `general` waren nie
eigene Instrumente, sondern **Umfang** — bereits als 22 `vm_*`-Kästchen gebaut (U2-ADR-089).
Beide entfallen als `art`-Wert; `instrumentWaehlbar` an `RECHTSGRUNDLAGEN_VERTRETUNG` bleibt
nur bei `vorsorge` und `bank` gesetzt. Migration (Schema 47→48, additiv/idempotent, nur
Lücken werden gefüllt): `gesundheit` → `art:'vorsorge'` + die drei Gesundheitssorge-
Kästchen + alle vier Freiheitsentzug-Optionen; `general` → `art:'vorsorge'` + alle 19
ja/nein-Kästchen + Freiheitsentzug. Die zwei Freitext-Kästchen
(`vm_vermoegen_ausschluss`, `vm_weitere_regelungen`) sind keine Vollmachtsgewährung, bleiben
unangetastet. Eine Herkunfts-Spur (`artMigriertAus`, additiv, nach dem Muster von
`rechtsraumAngenommen`) hält fest, woraus migriert wurde.

**`betreuung` (Verwaisungs-Regel, U2-ADR-050-Geist, hier verschärft).** „Betreuungsvollmacht"
ist rechtlich leer — es gibt kein Ziel, auf das ein Bestandswert sicher migriert werden
könnte (anders als bei `gesundheit`/`general`, wo der Umfang eindeutig ist). Ein geratener
Vollmachtsumfang wäre schlimmer als eine offene Frage. `betreuung` bleibt darum in `art`s
Options-Liste stehen (Label unverändert „Betreuungsvollmacht") — nicht, weil er weiter
gewählt werden soll (`grundlageWaehlbar`/faktische Nicht-Empfehlung), sondern weil ein
`<select>` ohne passende Option den Bestandswert blank rendern würde: ein bereits
gespeicherter Wert, der plötzlich unsichtbar aussieht, wäre schlimmer als eine unveränderte,
weiterhin sichtbare Falschangabe. Ein neues, bedingtes Hinweisfeld
(`art_betreuung_hinweis`, `typ:'hinweis'`, `sichtbarWenn: art='betreuung'`, dasselbe Muster
wie `ueberlappung_hinweis` in derselben Liste) macht die Prüfbedürftigkeit sichtbar, ohne
den Wert zu verändern.

## Begründung

- **Ein Katalog statt zwei** beseitigt die strukturelle Möglichkeit künftiger Drift
  zwischen den beiden Stellen — dieselbe Lehre wie K3/Sensibel (U2-ADR-128): zwei Orte für
  einen Sachverhalt sind der Fehlermodus, nicht die Ausnahme.
- **Kennzeichnung statt Vererbung/Kopie:** `instrumentWaehlbar`/`grundlageWaehlbar` an
  einer einzigen Werte-Tabelle ist die kleinste Struktur, die beide bestehenden
  Verwendungsorte weiter bedient, ohne eine Hierarchie zu erfinden, die es fachlich nicht
  gibt (die zwei Fragen sind orthogonal, nicht Unterfall-übergeordnet).
- **Keine Detail-Doppelung in Klartext-Metadaten:** Sub-Depot-Metadaten sind bewusst vor
  dem Sub-Passwort lesbar (D35/D36) — das rechtfertigt eine grobe Kategorie
  (`vertretungsGrundlage`), nicht Gerichtsname und Aktenzeichen. Die bereits bestehende,
  verschlüsselte Ablage am Schutzbefohlene-Datensatz ist der richtige, nicht neu zu
  erfindende Ort.
- **Migrieren statt raten, aber nicht um jeden Preis:** `gesundheit`/`general` haben ein
  eindeutiges Ziel und werden migriert; `betreuung` hat keines und bleibt offen — dieselbe
  Unterscheidung, die U2-ADR-050s Verwaisungs-Regel bereits trifft (Werte bleiben, nur die
  Erfassungs-UI ändert sich), hier für einen Fall verschärft, in dem sogar das Ziel unklar
  ist.

## Konsequenzen

- Positiv: eine Bürgerin mit gerichtlich bestellter Betreuung findet jetzt einen
  zutreffenden Eintrag; keine zweite Katalog-Kopie mehr zum Nachziehen bei künftigen
  Änderungen; Bestandsdaten (`gesundheit`/`general`) migrieren verlustfrei in die bereits
  bestehende, feinere Umfangs-Darstellung.
- Offen: ob eine Betreuerbestellung zusätzlich ein eigener `vorsorge_instrumente.typ`
  werden soll (Ablageort/Datum festhalten), bleibt eine Produktfrage — vorgelegt, nicht
  entschieden (Bericht, Abschnitt „Offene Punkte"). `betreuung`-Bestandswerte bleiben bis zu
  einer manuellen Prüfung stehen; keine automatische Nachfrist vorgesehen.

## Verifikation

- Neu: `tests/f3-rechtsgrundlagen-katalog.test.js` (Katalog + abgeleitete Optionen-Listen),
  `tests/f3-art-migration.test.js` (Schema-48-Migration, alle Fälle inkl. Idempotenz und
  „überschreibt keinen abweichenden Bestandswert"), `tests/f3-art-feld-optionen.test.js`
  (reduzierte `art`-Optionen + neuer Hinweis), `tests/f3-vertretung-bestand-messen.test.js` +
  `tools/f3-vertretung-bestand-messen.js` (Zug-0-Messwerkzeug), zwei neue Fälle in
  `tests/kind-subdepot-link.test.js` (Grundlage-Vorbefüllung).
- Nachgezogen (Regel-23-Kaskade, Katalogwert-Änderung wirkt in bestehende Tests hinein):
  `tests/vollmachten-liste.test.js`, `tests/block1-nachtrag-sprechende-zeile.test.js`,
  `tests/anlass-ereignis-eigene-vorsorge.test.js`, `tests/adr-102-import-bereinigen.test.js`,
  `tests/wechselmoment.test.js`, `tests/fix-bilanz5-import-unbekannte-art.test.js`,
  `tests/fix-a58-lebenslagen-im-produkt.test.js`, `tests/paritaet-kern-lese.test.js`
  (Parität `vivodepot.html` ↔ `vivodepot-lesen.html` nachgezogen),
  `tests/fixtures/referenzdepot.js` + Render-Snapshot (realistische Bestandsdarstellung auf
  den heute erreichbaren Zustand aktualisiert), `tools/w8-doppelerfassung-grundlinie.json`
  + `tools/bgb-verweise-grundlinie.json` (neue, begründete Grundlinie-Einträge).
- Browser-Abnahme (echter Chromium, Playwright): Sub-Depot-Anlegen-Dialog zeigt die neue
  Grundlage-Option, „Betreuungsvollmacht" nicht mehr; Verwaltete-Depots-Sicht zeigt die
  gewählte Grundlage korrekt als Metazeile.
- Volle Suite grün.
