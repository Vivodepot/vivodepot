# U2-ADR-NNN3 · Migrationsbeleg kennt benannte additive Schlüssel auch auf oberster Ebene

**Status:** Angenommen (Nummer wird beim Landen vergeben)
**Datum:** 17.09.2026
**Kategorie:** TESTINFRASTRUKTUR
**Linie:** U2
**Betrifft:** `tests/paket0-migrationsbeleg-referenzdepot.test.js`
(`PAKET0_BEKANNTE_ADDITIV_UMSCHLAG`, `vergleicheEbene`), `tests/fixtures/paket0-migrationsbeleg-baseline.json`
**Bezug:** U2-ADR-398 („das gekündigte Zimmer"), die begleitende ADR „Korpus-Zuordnung" und
„Ende des eigenen Vorlagen-Formats" (derselbe Umbau — Auslöser dieser Klärung)

---

## 0 · Der Auftrag

Der Migrationsbeleg (Paket 0 des Gerüst-Umbaus) hält den vollen Bürgerdepot-Export gegen eine
eingefrorene Baseline. Innerhalb von `depot` kennt er seit längerem eine benannte
Gegenzeichnungs-Liste für additives Wachstum (`PAKET0_BEKANNTE_ADDITIVE_SCHLUESSEL`) — auf der
obersten Umschlag-Ebene (außerhalb von `depot`) gab es diese Liste nicht, ein neuer Schlüssel dort
brach die Probe ausnahmslos. Als `vollExportJSON()` durch eine Erweiterung der Ab-Werk-Mitschrift
(drei zusätzliche, unbedingt zurückgehaltene Fächer) erstmals einen neuen Top-Level-Schlüssel
(`_zurueckgehalten`) mit echtem Inhalt lieferte, brach die Probe. Vor dem Bau zu klären: ist das
ein echter Fund oder fehlt der obersten Ebene schlicht dieselbe Fähigkeit, die `depot` bereits hat.

## 1 · Der Befund

Gemessen (nicht angenommen): am selben Referenzdepot-Export unterscheidet sich die oberste Ebene
gegenüber der eingefrorenen Baseline in genau einem Punkt — dem neuen Schlüssel
`_zurueckgehalten: {"abWerkMitschrift": 3}`. Alle vier bestehenden Umschlag-Felder (`_typ`,
`_hinweis`, `_version`, `_exportiertAm`) sind unverändert. Die Abwesenheit einer Gegenzeichnungs-
Liste auf dieser Ebene war damit keine Absicht gegen additives Wachstum, sondern schlicht nie
geprüft worden — bis heute trat dort nie etwas Additives auf.

Zwei Kandidaten-Lösungen wurden verworfen:

- **Baseline blind neu erzeugen.** Der eigene Baseline-Erzeuger verweigert sich dem ausdrücklich
  (Datei existiert bereits, muß von Hand gelöscht werden) — ein Migrationsbeleg, der bei
  Widerspruch einfach neu gezogen wird, belegt nichts mehr.
- **`_zurueckgehalten` als bekannt-volatil normalisieren** (wie `_exportiertAm`). `_exportiertAm`
  trägt keine Aussage über das Depot, nur den Zeitpunkt des Aufrufs — `_zurueckgehalten` trägt eine
  Aussage (wieviel zurückgehalten wurde). Es zu normalisieren hieße, den Beleg genau für die Sorte
  Änderung blind zu machen, für die er existiert.

## 2 · Die Entscheidung

Die oberste Umschlag-Ebene bekommt dieselbe Fähigkeit wie `depot`: eine benannte, namentliche
Gegenzeichnungs-Liste (`PAKET0_BEKANNTE_ADDITIV_UMSCHLAG`), gebaut nach demselben Muster wie
`PAKET0_BEKANNTE_ADDITIVE_SCHLUESSEL` — mit einer Abweichung, die aus der Ebene selbst folgt:

- **Ein Neuzugang ist keine Änderung.** Der Migrationsbeleg bewacht, daß nichts verschwindet und
  nichts sich still verändert. Ein neuer Schlüssel tut keins von beidem — er ist Wachstum, kein
  Verlust und keine Drift. Verlust und Drift an BESTEHENDEN Schlüsseln bleiben ausnahmslos ein
  Bruch, unverändert.
- **`leererWert` ist auf dieser Ebene optional**, anders als im `depot`. Im `depot` markiert ein
  registrierter Schlüssel meist ein noch nicht angedocktes Register (Situationen/Assistenten/…) —
  er bleibt leer, bis etwas ihn füllt, und das ist bei jedem Lauf erneut prüfbar. Auf der obersten
  Ebene gibt es diese Sorte Slot nicht: ein neuer Umschlag-Schlüssel trägt von Anfang an echten
  Inhalt. Ein Eintrag ohne `leererWert` läßt den Schlüssel EINMALIG als neu durch.
- **Danach läuft er normal weiter.** Sobald ein registrierter Schlüssel einmal akzeptiert ist, nimmt
  die eingefrorene Baseline-Datei seinen gemessenen Wert direkt mit auf (kein zweiter, separater
  Mechanismus) — von da an ist er ein bestehender Schlüssel wie jeder andere und wird bei jedem
  künftigen Lauf strikt gegen die Baseline verglichen. Wachstum ist damit kein Freibrief für
  spätere, unbeobachtete Drift an genau diesem Wert.
- **Ein Eintrag nennt den Schlüsselnamen und den Grund**, nicht ein Muster — genau wie im `depot`.
  Kein „alles Neue auf dieser Ebene ist erlaubt".

Konkret für den Anlaß: `_zurueckgehalten` ist in `PAKET0_BEKANNTE_ADDITIV_UMSCHLAG` eingetragen,
sein gemessener Wert (`{"abWerkMitschrift": 3}`) ist direkt in die eingefrorene Baseline-Datei
aufgenommen — geprüft ist damit ab sofort auch, daß sich dieser Wert nicht mehr unbeobachtet
ändert.

## 3 · Was ausdrücklich NICHT Teil dieser Entscheidung ist

- **Keine Änderung an der `depot`-Ebene.** `PAKET0_BEKANNTE_ADDITIVE_SCHLUESSEL` und ihre
  „bleibt-leer"-Regel bleiben unverändert bestehen; diese ADR ergänzt eine zweite, eigene Liste für
  die Ebene darüber, ersetzt nichts.
- **Kein Freibrief für zukünftiges Umschlag-Wachstum ohne Eintrag.** Ein neuer, nicht in
  `PAKET0_BEKANNTE_ADDITIV_UMSCHLAG` genannter Schlüssel bricht die Probe weiterhin ausnahmslos.
- **Keine Aussage über den Inhalt von `_zurueckgehalten` selbst** (welche Fächer künftig
  dazukommen) — das ist Gegenstand der jeweiligen Ab-Werk-Erweiterung, nicht dieser ADR.

## Konformität

```konformitaet
aussage:   Ein neuer, nicht in PAKET0_BEKANNTE_ADDITIV_UMSCHLAG registrierter Umschlag-Schlüssel
           bricht die Probe weiterhin ausnahmslos.
zustand:   prüfbar
pruefung:  tests/paket0-migrationsbeleg-referenzdepot.test.js#[Rot-Beweis] ein neuer, NICHT gegengezeichneter Schlüssel im UMSCHLAG (ausserhalb depot) bricht weiterhin
```

```konformitaet
aussage:   Ein registrierter Umschlag-Schlüssel ohne leererWert wird mit echtem Inhalt einmalig
           als neu akzeptiert.
zustand:   prüfbar
pruefung:  tests/paket0-migrationsbeleg-referenzdepot.test.js#[Rot-Beweis] ein registrierter Umschlag-Schlüssel OHNE leererWert wird einmalig als neu akzeptiert
```

```konformitaet
aussage:   Ein bereits eingefrorener additiver Umschlag-Schlüssel bricht bei einer echten
           Werteänderung genauso wie jeder andere bestehende Schlüssel — Wachstum ist keine
           Hintertür für spätere, unbeobachtete Drift.
zustand:   prüfbar
pruefung:  tests/paket0-migrationsbeleg-referenzdepot.test.js#[Rot-Beweis] ein bereits eingefrorener Umschlag-Schlüssel bricht bei Werteänderung weiterhin — Wachstum ist kein Freibrief für spätere Drift
```

```konformitaet
aussage:   Der reale Anlaß (_zurueckgehalten, U2-ADR-398-Erweiterung) ist rein additiv: am echten
           Referenzdepot-Export unterscheidet sich die oberste Ebene gegenüber der eingefrorenen
           Baseline in genau diesem einen neuen Schlüssel, kein bestehender Wert weicht ab.
zustand:   prüfbar
pruefung:  tests/paket0-migrationsbeleg-referenzdepot.test.js#[Paket 0 · Migrationsbeleg] das Referenzdepot exportiert heute genau das eingefrorene Ergebnis
```

---
