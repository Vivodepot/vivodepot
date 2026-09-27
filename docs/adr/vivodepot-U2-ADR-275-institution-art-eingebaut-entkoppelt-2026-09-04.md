# U2-ADR-275: INSTITUTION_ART_EINGEBAUT wird fest verdrahtet statt abgeleitet

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** KORREKTHEIT, VORBEREITUNG
**Linie:** U2
**U2-Bezug:** U2-ADR-253 Commit A (dieselbe Korrektur für `BEREICH_IDS_EINGEBAUT`/
`SITUATION_IDS_EINGEBAUT`/`WIZARD_IDS_EINGEBAUT`/`EREIGNIS_ACHSE_TRIPEL_EINGEBAUT`,
04.09.2026), U2-ADR-142 (Institutions-Arten von außen erweiterbar). Vorbereitender Schritt
für den institutionsArt-Teilauszug aus Paket 5 (Bürgerdepot-als-Modul-Umbau).
**Anker:** Auftrag vom 04.09.2026, im Rahmen der Paket-5-Messung zur
Teilauszugs-Fähigkeit von institutionsArt.
**Status heute:** gilt — Beleg `tests/paket3-commitA-entkopplung.test.js`.

---

## Befund — beim Bauen gefunden, nicht bei der Messung

Die Messung zur Paket-5-Extrahierbarkeit hatte für `institutionsArt` festgestellt: eine
Reservierungsliste (`INSTITUTION_ART_EINGEBAUT`) existiert, verhindert also, dass ein
Drittmodul eine der zwölf eingebauten Kennungen beansprucht. **Nicht geprüft war, WIE diese
Liste entsteht.** Beim Bauen des Teilauszugs zeigte sich: anders als bei den vier Registern
aus U2-ADR-253 Commit A ist `INSTITUTION_ART_EINGEBAUT` **abgeleitet**, nicht eigenständig:

```js
const INSTITUTION_ART_EINGEBAUT = Object.freeze(Object.values(INSTITUTION_ART));
```

## Warum das ein Problem für die geplante Extraktion ist

Würden die zwölf Kennungen aus dem nativen `INSTITUTION_ART` entfernt (Ziel des eigentlichen
Teilauszugs), schrumpfte `INSTITUTION_ART_EINGEBAUT` automatisch mit — die Reservierung für
genau diese Kennungen verschwände still. Ein fremdes Modul könnte danach z. B. `krankenkasse`
unwidersprochen beanspruchen: kein Anzeigefehler, sondern ein Namensraum-Loch, das erst
auffiele, wenn es jemand ausnutzte. Dieselbe Konstellation, die U2-ADR-253 Commit A für die
anderen vier Register bereits behoben hat — dort, weil `SEKTOREN`/`SITUATIONEN`/`WIZARDS`/
`EREIGNIS_ACHSE_FELDER` sich in einem späteren Schritt leeren sollen, hier aus demselben
Grund für `INSTITUTION_ART`.

**Kein „nebenbei gefundener Fehler", sondern notwendiger Teil dieser Extraktion** — ohne
diese Korrektur erzeugt der Teilauszug selbst die Lücke. Fällt damit nicht unter die Regel
„Umbau und Behebung nie im selben Commit" (Produktregel, vermittelt 04.09.2026 nachts); trotzdem als eigener,
erster Commit geführt, weil er die Reservierungs-Garantie berührt, nicht nur die Anzeige.

## Entscheidung

`INSTITUTION_ART_EINGEBAUT` wird fest verdrahtet, mit den zwölf heutigen Werten in
Datei-Reihenfolge — dieselbe Bauart wie bei den vier Registern aus U2-ADR-253 Commit A:

```js
const INSTITUTION_ART_EINGEBAUT = Object.freeze([
  'krankenkasse', 'pflegekasse', 'pflegedienst', 'krankenhaus', 'arztpraxis', 'bestatter',
  'bank', 'versicherung', 'standesamt', 'meldebehoerde', 'behoerde', 'arbeitgeber',
]);
```

**Reiner Refactor, kein Verhaltens-Change:** `institutionsArtenAlle()` liefert ohne
angemeldetes Modul weiterhin exakt dieselben zwölf Einträge, in derselben Reihenfolge, mit
denselben Beschriftungen (die Beschriftungen kommen unverändert aus dem Textsatz, s.
U2-ADR-142 — von dieser Änderung nicht berührt). `INSTITUTION_ART` selbst bleibt unverändert
bestehen; nur `INSTITUTION_ART_EINGEBAUT` bezieht sich nicht mehr darauf.

**Bewusst nicht Teil dieses Commits:** die eigentliche Extraktion der zwölf Kennungen aus dem
Kern. Die läuft als eigener, zweiter Commit — s. U2-ADR-274.

## Beleg

Alle acht bestehenden Tests aus `tests/institutions-arten-andockbar.test.js` bleiben
unverändert grün (gezielter Lauf, nicht die volle Suite — Auflage der Nachtkoordination bei
laufender Landungs-Warteschlange). Ein neuer Test in
`tests/paket3-commitA-entkopplung.test.js` sichert die zwölf Werte samt Reihenfolge
namentlich zu und prüft gegen `Object.values(INSTITUTION_ART)`, dass sich an der Werte-Menge
nichts geändert hat.

## Konsequenzen

Keine sichtbare Änderung für eine Bürgerin. Voraussetzung geschaffen, damit ein späterer
Teilauszug der zwölf Institutions-Arten (U2-ADR-274) kein Namensraum-Loch hinterlässt.

## Konformität

```konformitaet
aussage:   INSTITUTION_ART_EINGEBAUT ist eine eigenständige, fest verdrahtete Konstante und
           nicht mehr von INSTITUTION_ART abgeleitet; institutionsArtenAlle() liefert ohne
           angemeldetes Modul weiterhin exakt die zwölf nativen Einträge in unveränderter
           Reihenfolge und Beschriftung.
zustand:   prüfbar
pruefung:  tests/paket3-commitA-entkopplung.test.js#[Entkopplung·U2-ADR-275] INSTITUTION_ART_EINGEBAUT trägt exakt die zwölf nativen Institutions-Kennungen, in Datei-Reihenfolge
quelle:    fund
```

---
*Vivodepot GmbH · Berlin · U2-ADR-275 · 04.09.2026*
