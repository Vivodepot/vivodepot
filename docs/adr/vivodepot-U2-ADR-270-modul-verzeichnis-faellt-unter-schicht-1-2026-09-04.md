# U2-ADR-270: `module/` fällt bereits unter Schicht 1 (EUPL-1.2) — kein Lizenztext nötig

**Status:** überholt
**Datum:** 04.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** LICENSE (nicht geändert)
**Status heute:** überholt (19.09.2026) — die Entscheidung vom 18./19.09.2026
(abgestimmter Lizenzvorschlag vom 18.09.2026, §4/§6) läßt die BUSL-Schicht
ersatzlos entfallen: Vivodepot steht durchgehend unter EUPL-1.2, `LICENSE` kennt seither kein
„Schicht 2 (BUSL-1.1)" mehr. Die hier gehaltene Invariante („`module/` fällt unter keine der
beiden Schicht-2-Definitionen") ist damit nicht falsch geworden, sondern gegenstandslos — es gibt
keine Schicht 2 mehr, in die `module/` fallen könnte. Der eigens dafür gebaute Wächter in
`tests/zusagen-in-kommentaren.test.js` ist mit dieser ADR entfernt, s. Konformität unten.

---

## Wie der Befund entstand

Auftrag A2 (04.09.2026): bestätigt — „`module/` kommt unter EUPL-1.2".
Ursprünglich als Lizenztext-Änderung gedacht (`module/` explizit in `LICENSE`s Umfangsliste für
Schicht 1 aufnehmen). Bevor das gebaut wurde, warf ein verwandter Auftrag (C3, Umfangsliste
Schicht 2) eine Auslegungsfrage auf: `LICENSE` definiert Schicht 2 (Template-Mechanismus,
BUSL-1.1) an zwei Stellen unterschiedlich — im Fließtext weit, in der Umfangsliste eng (eigene,
gesonderte Analyse zu Auftrag C3). Welche Definition gilt, ist eine Produktentscheidung.

**Die Frage für A2, bevor irgendein Lizenztext geschrieben wird:** Fällt `module/` nicht ohnehin
schon unter Schicht 1, unabhängig davon, welche der beiden Schicht-2-Definitionen später gilt?

## Kontext

### Der Befund

Schicht 1 trägt eine Auffangklausel (`LICENSE:22-23`): „alle weiteren Dateien außerhalb der
Template-Library-Schicht (siehe Punkt 2)". Geprüft gegen BEIDE Kandidaten-Definitionen von
Schicht 2:

- **Enge Definition** (Umfangsliste, `LICENSE:51-56`): vier JSON-Dateien, `templates/`,
  „Companion-Schema-Templates". `module/` steht in keiner Zeile.
- **Weite Definition** (Fließtext, `LICENSE:44-46`): „anbieter-mitgebrachte Vorlagen,
  Companion-Schema-Dateien, der zugehörige Übergabe- und Trust-Authority-Mechanismus".

Das provisionierte Bürgerdepot-Modul (`module/`) ist keine anbieter-mitgebrachte Vorlage —
es ist die native Kern-Funktionalität des Gerüsts selbst, in Modulform gelöst (Gerüst-Umbau,
in der zugrundeliegenden Taxonomie: „Vivodepot ist das Gerüst. Das Bürgerdepot ist ein Modul,
vorkonfektioniert ausgeliefert."). Es ist keine Companion-Schema-Datei und kein Übergabe-/
Trust-Authority-Mechanismus — es hat keinen Anbieter, keine Signatur-Kette, keine
Zertifikats-Ausstellung.

**`module/` fällt damit unter KEINE der beiden Kandidaten-Definitionen von Schicht 2 — unter
beiden Lesarten bleibt es in der Auffangklausel von Schicht 1.** Die offene Auslegungsfrage aus
C3 (welche Definition für ANDERE Dateien wie den Übergabe-/Trust-Authority-Mechanismus gilt)
berührt diese Schlussfolgerung nicht: sie hängt nicht davon ab, welche der beiden Lesarten
gewinnt, weil `module/` unter beiden draußen bleibt.

## Entscheidung

**Kein Lizenztext geändert.** Die Produktentscheidung („module/ unter EUPL-1.2") ist bereits heute,
ohne jede Textänderung, durch die bestehende Auffangklausel erfüllt.

**Stattdessen — Repo-Arbeit ohne Rechtsfolge:**

1. **Ablage-Konvention**, hier festgehalten statt im Lizenztext: `module/` ist der reservierte
   Name für das provisionierte Bürgerdepot-Modul des Gerüst-Umbaus. Sobald das Verzeichnis
   entsteht, liegt es strukturell außerhalb der Template-Library-Schicht — genau wie jede andere
   Datei, die weder Vorlage noch Companion-Schema noch Übergabe-/Trust-Authority-Mechanismus ist.
2. **Wächter** (`tests/zusagen-in-kommentaren.test.js`, neuer Block): hält strukturell, dass
   `LICENSE`s Schicht-2-Umfangsliste („Umfang dieser Schicht" unter „2. Template-Mechanismus —
   BUSL-1.1") **niemals** einen Pfad nennt, der mit `module/` beginnt — unabhängig davon, wie
   C3s Auslegungsfrage später entschieden wird, und unabhängig davon, ob `module/` heute schon
   existiert. Ablage-Konvention vor Inhalt.

## Ausdrücklich nicht behandelt

- C3s Auslegungsfrage selbst (welche Schicht-2-Definition gilt) — eigene Vorlage, eigene
  Produktentscheidung.
- Ob `module/` inhaltlich bereits existiert oder was hineingehört — Sache des laufenden
  Gerüst-Umbaus (Paket 3), nicht dieser ADR.

## Konsequenzen

- Sollte später entschieden werden, dass Schicht 2 die weite (Fließtext-)Definition trägt, UND
  sollte diese weite Definition später erweitert werden, um Dinge wie `module/` einzuschließen
  (was diese ADR für falsch hält, s. Kontext) — dann würde diese ADR hinfällig. Bis dahin gilt
  die hier festgehaltene Analyse.
- Kein Zwang, `LICENSE` gleichzeitig mit C3s Entscheidung anzufassen — A2 ist bereits erledigt,
  unabhängig vom Zeitpunkt der C3-Entscheidung.

## Konformität

```konformitaet
aussage:   U2-270: `LICENSE`s Umfangsliste für Schicht 2 (BUSL-1.1) nennt niemals einen Pfad, der
           mit module/ beginnt — überholt, seit der Entscheidung vom 18./19.09.2026 Schicht 2
           ersatzlos entfallen läßt. Es gibt kein „2. Template-Mechanismus — BUSL-1.1" mehr, gegen
           das noch geprüft werden könnte; module/ liegt wie alles andere unter EUPL-1.2.
zustand:   abgeloest
quelle:    entscheidung
```

*Vivodepot GmbH · Berlin · 04.09.2026*
