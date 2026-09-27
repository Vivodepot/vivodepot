# U2-ADR-163: Fünf Register, eine Form — `bereiche` wird Objekt wie `arten`/`typen`

**Status:** Akzeptiert
**Datum:** 23.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Laufzettel „Der Schnitt", Glied 5 (A484) — Befund aus den fünf Beispielbündeln
(`tests/fixtures/beispielbuendel/index.js`), die die fünf Einlass-Register (Textsatz, Rechtsraum,
Institutionsart, Format, Bereich) erstmals nebeneinander bauten.
- **Code-Stelle:** `vivodepot.html` — `bereichsModulPruefen`, `_modulTraegtBeschriftung`,
  `_angedockteBeschriftungenFuerExport`.
- **ADR-Bezug:** U2-ADR-145 (die fünf Einlass-Register), U2-ADR-161/162 (dieselbe Kampagne, „es
  gewinnt die Form, die den wenigsten Bestand umzieht" — hier zum ersten Mal wörtlich am
  Laufzettel benannt und angewandt).
- **Status heute:** gilt — gebaut und belegt in `tests/beispielbuendel.test.js`,
  `tests/bereichs-module-einlass.test.js`, `tests/bereich-label-schaltet-mit.test.js`.

---

## Kontext

**Der Befund:** vier der fünf Einlass-Register erwarten eine „benannte Menge von Unter-Dingen",
die ein Modul mitbringt — Textsatz (`texte`), Rechtsraum (`typen`), Institutionsart (`arten`) und
Bereich (`bereiche`). Drei davon (`texte`, `typen`, `arten`) sind ein OBJEKT, Schlüssel = Kennung.
Nur `bereiche` war eine LISTE von Objekten mit eigenem `id`-Feld. **Dieselbe Sache, zwei Formen** —
wer beide Formen schreiben muss, schreibt eine davon zwangsläufig gelegentlich falsch (der erste
eigene Bau-Versuch tat genau das).

## Entscheidung

**Es gewinnt die Form, die den wenigsten Bestand umzieht** (Regel aus dem Laufzettel, hier zum
ersten Mal angewandt, nicht nur zitiert). Gemessen, nicht geraten: 32 Bestandsstellen bauen
`bereiche` als Liste, 128 bauen `arten`/`typen`/`texte` als Objekt. **Das Objekt gewinnt.**

**`bereichsModul.bereiche` ist jetzt ein Objekt, Schlüssel = Bereichs-ID.** Der Wert je Schlüssel
trägt `label`, optional `icon`/`merkmale`/`rollen` — dieselben Felder wie zuvor, nur ohne das
redundante `id` (das jetzt der Schlüssel selbst ist). Ein doppelter Schlüssel innerhalb EINES
Moduls ist damit strukturell unmöglich (ein Objektliteral kann ihn nicht tragen) — die frühere
`gesehen`-Prüfung in `bereichsModulPruefen` entfällt ersatzlos. Der CROSS-Modul-Fall (zwei
verschiedene Module, dieselbe ID) bleibt unverändert in `_bereichsModuleAusDepotAnmelden`.

**Die validierte, interne Zwischenform (`bereichsModulPruefen`'s Rückgabewert `bereiche`) bleibt
ein Array** von fertigen, eingefrorenen Bereichs-Objekten (jedes weiterhin mit `.id`) — das ist der
minimalinvasive Teil der Entscheidung: nur die AUTOREN-Form (wie ein Anbieter ein Modul schreibt)
ändert sich; die interne Weiterverarbeitung (`_bereichsModuleAusDepotAnmelden`, `bereicheAlle()`)
bleibt unverändert, weil sie Reihenfolge braucht und schon vor dieser ADR ein Array war.

## Was NICHT in dieser ADR steht

**Keine Vereinheitlichung der übrigen drei gemessenen Unterschiede** — sie sind keine „dieselbe
Sache, zwei Formen", sondern echte Unterschiede zwischen den Registern: `anbieterId` (vier
Register tragen es, `format` verwirft es als unbekannt), `katalogVersion`/`moduleVersion` (zwei
Versionszahlen auf zwei Ebenen bei Rechtsraum, weil ein Rechtsraum-Typ selbst eine Katalog-Version
führt, ein Modul aber auch), und die zusätzlichen Pflichtfelder von `format` (`leser`, `sektor`,
`label` — ein Format-Kanal ist strukturell komplexer als eine benannte Liste). Diese bleiben
bewusst verschieden, wie im Laufzettel-Befund selbst nicht als „zwei Formen für dieselbe Sache"
eingeordnet.

**Keine Änderung an `_BEREICHS_MODUL_REGISTRY`** (der Laufzeit-Registry nach dem Andocken) — sie
war schon vor dieser ADR ein Array und bleibt es, weil `bereicheAlle()` und die Navigation eine
Reihenfolge brauchen.

**Kein Schema-Bump.** Additiv am Modul-Format, nicht am Depot-Format selbst — der gemeinsame
Schema-Bump kommt laut Laufzettel erst am Ende von Glied 6.

---

*Vivodepot GmbH · 23.08.2026*
