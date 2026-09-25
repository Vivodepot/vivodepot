# U2-ADR-057 — Zentrale „Daten herausgeben"-Tür wird bereich-neutral („Woraus herausgeben?")

**Datum:** 05.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 05.07.2026 (Suite/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — Beleg in `vivodepot.html`: `flowHerausgebenZentral()` und der neutrale Marker `data-weitergeben-zentral="1"` bestehen (u. a. Z. 23892, 29834); die Detailregel „ein Bereich mit Daten je Knopf" ist seither um die „Ganzes Depot"-Erstzeile ergänzt (U2-ADR-058) — s. dort.
**Nummer:** U2-ADR-057 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-056).
**Typ:** Wege-/Render-Struktur (kein Krypto, keine Datenmodell-Änderung).
**Bezug:** U2-ADR-056 (Einlese-Tür bereich-neutral — dieser ADR ist der symmetrische Zwilling der Raus-Seite) · U2-ADR-046 (Rein/Raus-Durchstich).

---

## Kontext

Nach U2-ADR-056 fragte die zentrale „Daten einlesen"-Tür „Wohin einlesen?", während die symmetrische „Daten herausgeben"-Tür noch fix aus `gesundheit` gab (`data-weitergeben-zentral="gesundheit"` → `flowHerausgeben('gesundheit')`). Genau an derselben Stelle standen zwei ungleiche Verhalten: Rein fragt, Raus springt. Das fiel dem Nutzer sofort als Inkonsistenz auf. Der Raus-seitige Umbau wurde als nächster Schritt gesetzt.

## Entscheidung

Die zentrale Tür ruft neu `flowHerausgebenZentral()` statt `flowHerausgeben('gesundheit')`. Der Klick öffnet einen **„Woraus herausgeben?"**-Dialog:

- **Ziel-Bereiche:** ein Knopf je Bereich, der DATEN trägt (`sektorHatDaten`), mit Bereichs-Icon und -Namen. Herausgeben ist datenlage-adaptiv — ein leerer Bereich hat nichts herzugeben, erscheint also nicht. Klick → `flowHerausgeben(<sektor>)` (der bekannte Bereichs-Chooser: PDF / maschinenlesbar / Word / QR).
- **Leerer Datenstand:** ist noch nirgends etwas hinterlegt, zeigt der Dialog einen freundlichen Hinweis statt eines leeren Pickers.

Das `data-weitergeben-zentral`-Attribut trägt keinen Bereich mehr (neutraler Marker `"1"`). Damit sind **beide** Rein/Raus-Türen bereich-neutral und symmetrisch.

## Begründung

- **Symmetrie an derselben Stelle.** Rein fragt „wohin?", Raus fragt „woraus?" — gleiche Grammatik, gleiche Mechanik. Die auffällige halbe Inkonsistenz ist weg.
- **Datenlage-adaptiv statt formatgetrieben.** Anders als beim Einlesen (Ziele = Bereiche mit eigenem Format) sind die Herausgeben-Ziele die Bereiche mit DATEN — denn PDF/QR gibt es für jeden Bereich, sobald er etwas trägt; es geht nicht um ein deklariertes Format, sondern um „gibt es hier etwas herzugeben?".
- **Kein Fähigkeitsverlust, kein neuer Pfad.** Die Ziele rufen den BESTEHENDEN `flowHerausgeben`; nur die Vorschalt-Frage ist neu.

## Umsetzung

- `vivodepot.html`: STRINGS `herausgebenWoherTitel`/`herausgebenWoherHinweis`/`herausgebenWoherLeer`; neue Funktion `flowHerausgebenZentral()`; Sidebar-Tür `data-weitergeben-zentral="1"` + Verdrahtung auf `flowHerausgebenZentral`; Rein/Raus-Kommentar auf „beide neutral" nachgezogen.
- `tests/load-kern.js`: `flowHerausgebenZentral` im Verify-Hook.
- Tests: `tests/herausgeben-zentral-neutral.test.js` (neu, 6 — Picker-Struktur, Ziel-Menge = Bereiche mit Daten, kein Gesundheits-Routing, Leer-Hinweis, Ziel-Flow, strukturelle Verdrahtung). `tests/rein-raus-durchstich.test.js` (Header + Test 1) + `tests/knopf-einlese-dichte.test.js` (C4) auf „beide Türen neutral" nachgezogen.
- Browser-Preview: zentrale Tür → „Woraus herausgeben?" (nur Bereiche mit Daten), Klick „Gesundheit" → „Herausgeben — Gesundheit" (PDF/QR/maschinenlesbar) — verifiziert.

## Konsequenzen

- **Positiv:** Rein/Raus ist vollständig symmetrisch und ehrlich; die vom Nutzer sofort bemerkte Inkonsistenz ist geschlossen.
- **Neutral:** Suite 1163/1163 (+6), Konformität 11/11, Block-Pin `8d31c678…` unverändert. Kein Push (eine Produktentscheidung).
