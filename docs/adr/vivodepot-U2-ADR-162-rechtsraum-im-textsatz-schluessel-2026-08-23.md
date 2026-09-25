# U2-ADR-162: Der Rechtsraum kommt in den Textsatz-Schlüssel — Sprache und Rechtsraum zusammen

**Status:** Akzeptiert
**Datum:** 23.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Laufzettel „Der Schnitt", Glied 4 (A469) — löst Prüfstein 5 der Entscheidung
internes Entscheidungsdokument vom 21.08.2026.
- **Code-Stelle:** `vivodepot.html` — `textsatzRechtsraumAktiv` (neu), `textLesen`,
  `textsatzRegeln`, `textsatzModulEinbetten`/`_einbettenMitFassung`, `textsatzModulPruefen`,
  `_textsatzModuleAusDepotAnmelden`.
- **ADR-Bezug:** U2-ADR-141 (Textsatz-Module, `data.textsprache` ohne UI-Umschalter — dieselbe
  Linie hier für `data.rechtsraum`), U2-ADR-161 (Glied 3 — „keine Länderliste im Kern", hier für
  `rechtsraum` fortgeführt).
- **Status heute:** gilt — gebaut und belegt in `tests/schnitt-glied3-fuenf-pruefsteine.test.js`
  (Prüfstein 5, jetzt gelöst) und `tests/persona-p19-p20.test.js`.

---

## Kontext

**Der Befund (P19/P20, 21.08.2026):** `_TEXTSATZ_MODUL_REGISTRY` war allein nach `sprache`
verschlüsselt. Ecuador und Spanien teilen sich `es` — zwei angedockte Sätze derselben Sprache,
verschiedenen Rechtsraums, überschrieben einander beim Andocken. Der ZULETZT angemeldete gewann,
samt seiner Währungsregel: je nach Reihenfolge bekam die eine oder die andere Bürgerin die falsche
Währung angezeigt. Ein `rechtsraum`-Feld am Modul wurde weder geprüft noch gelesen — es änderte
strukturell nichts.

## Entscheidung

**Die Registry wird zweistufig: `sprache` → `rechtsraum` → Satz.** Ein Textsatz-Modul trägt
optional `rechtsraum` (freier String, getrimmt) — fehlt er, steht das Modul im Fach `''` und
trägt wie bisher JEDE Bürgerin dieser Sprache, unabhängig von ihrem Rechtsraum. Das ist der
Normalfall (eine Kammer, ein Land) und bleibt unverändert billig.

**`data.rechtsraum`** ist das neue, zu `data.textsprache` symmetrische Depot-Feld — die eigene
Angabe der Bürgerin, welchem Rechtsraum sie zugeordnet ist. Default: leerer String (kein
Rechtsraum erklärt), gelesen über `textsatzRechtsraumAktiv()`. **Kein Umschalter in der
Oberfläche** — dieselbe Zurückhaltung wie bei `textsprache` (U2-ADR-141): nur der Lesepfad
entsteht hier, eine Eingabe-Oberfläche ist eine eigene, spätere Frage.

**`textLesen`/`textsatzRegeln` lösen jetzt (Sprache, Rechtsraum) auf:** zuerst ein Modul, dessen
`rechtsraum` exakt zum erklärten Rechtsraum der Bürgerin passt; sonst ein Modul ohne erklärten
Rechtsraum (das Fach `''`); sonst der eingebaute Text. Erklärt die Bürgerin einen Rechtsraum, für
den KEIN passendes Modul angedockt ist, gewinnt — sofern vorhanden — das rechtsraumlose Modul,
sonst der eingebaute Text. Nie ein Modul eines FALSCHEN, expliziten Rechtsraums.

**`textsatzModulEinbetten` dedupliziert jetzt nach (Sprache, Rechtsraum), nicht mehr nach Sprache
allein.** Zwei Module derselben Sprache, verschiedenen Rechtsraums, kollidieren nicht mehr — sie
stehen nebeneinander. Zwei Module derselben Sprache OHNE Rechtsraum kollidieren weiterhin wie
zuvor (unverändertes Verhalten für den Normalfall).

**Keine Länderliste im Kern** (dieselbe Linie wie bei Korb 1, Glied 3/U2-ADR-161): `rechtsraum`
ist ein freier String, keine geschlossene Auswahl. Ein ungültiger Wert (kein String, leer nach
Trim) verwirft nur sich selbst — das Modul bleibt gültig, wie bei einer einzelnen `regeln`-Zeile.

## Was NICHT in dieser ADR steht

**Kein Rechtsraum-Umschalter in der Oberfläche.** Wie bei der Sprache: nur der Lesepfad.

**Keine Änderung an `_rechtsraumKatalogLesen`/`_RECHTSRAUM_MODUL_REGISTRY`.** Diese ältere,
separate Registry (Rechtsraum-Modul-Vertrag, A448 Zug 3) bedient RECHTSINHALTE (Formvorschriften,
Fristen) und wird an jeder Aufrufstelle weiterhin mit dem literalen Code `'DE'` aufgerufen. Das
ist ein eigener, deutlich größerer Befund (dutzende Aufrufstellen im ganzen Kern) und nicht
Gegenstand dieses Glieds — der Laufzettel spricht ausdrücklich nur vom TEXTSATZ-Schlüssel.

**Kein Schema-Bump.** Additiv (`data.rechtsraum` fehlt in jedem Bestandsdepot und wird als leerer
String gelesen — zeichengleiches Verhalten wie vorher, da kein Modul je einen Rechtsraum
verlangte). Der gemeinsame Schema-Bump kommt laut Laufzettel erst am Ende von Glied 6.

---

*Vivodepot GmbH · 23.08.2026*
