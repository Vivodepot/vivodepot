# U2-ADR-092 · Reihenfolge der elf Bereiche

**Datum:** 20.07.2026 · **Nachtrag 04.08.2026** (Reihenfolge auf den gebauten Stand gezogen, s. u.)
**Status:** Angenommen · **Reihenfolge in § 2 ist Historie, § 5 trägt die geltende Fassung**
**Status heute:** gilt — die in §5 nachgetragene Reihenfolge deckt sich mit `SEKTOREN` in
`vivodepot.html` (gemessen 15.08.2026); ein zwölfter Bereich „Krisenvorsorge" kam danach hinzu
und ist von dieser Entscheidung nicht erfasst.
**Bezug:** U2-ADR-041 („Persönliches" steht immer zuletzt in `SEKTOREN`) · Kassensturz-Posten
„Bereichs-Übersicht von zehn auf elf Kacheln" (nachgetragen 20.07.2026) · U2-ADR-085
(gleiches Muster: eine bereits getroffene Entscheidung, die nur als Gesprächsergebnis
existierte und hier erst festgeschrieben wird)

---

## 1 · Der Fund

Ein neuer Bereich „Wohnen & Eigentum" kommt zur Bereichs-Übersicht hinzu (bisherige
Slot-Cluster Fahrzeuge/Wohnungen lagen verstreut, s. U2-ADR-073). Die App zeigt heute zehn
Bereichs-Kacheln; mit dem neuen Bereich werden es elf. Die Reihenfolge der elf Bereiche war
seit 24.05.2026 unentschieden (Code-Stand widersprach dem Website-Stand) — dasselbe Muster
wie bei U2-ADR-085: eine Entscheidung, die nur als Gesprächsergebnis existierte, nie
festgeschrieben.

## 2 · Die Entscheidung

**Ordnungsprinzip: von grundlegend zu spezifisch.** Die elf Bereiche, in dieser Reihenfolge:

1. Identität & Person
2. Meine Menschen
3. Gesundheit
4. Vorsorge & Recht
5. Finanzen & Zahlungen
6. Wohnen & Eigentum
7. Mobilität & Reise
8. Sozialversicherung
9. Bildung & Beruf
10. Verwaltung & Behörden
11. Persönliches

„Persönliches" bleibt gemäß U2-ADR-041 das letzte Element — hier, mit elf statt zehn
Bereichen, die elfte Position statt der zehnten. Der frühere Bezug auf „Vivo" im Namen
entfällt ersatzlos; der Bereich heißt schlicht „Persönliches".

## 3 · Wirkungsradius

Betrifft die Bereichs-Übersicht (App) und die Website-Darstellung gleichermaßen — beide
müssen dieselbe Reihenfolge zeigen, keine zwei Wahrheiten.

## 4 · Abnahme / Nachzug

**Historisch — siehe § 5 für den geltenden Stand.** Diese ADR schrieb am 20.07. eine
Entscheidung fest, ist aber nie in der hier festgelegten Reihenfolge gebaut worden; das Produkt
lief seither mit einer anderen Anordnung weiter. Der Widerspruch fiel erst am 04.08.2026 auf.

## 5 · Nachtrag 04.08.2026 — die geltende Reihenfolge ist die des Produkts

**Gemessen ⟦M⟧, gegen `SEKTOREN` in `vivodepot.html` (`:4498` ff.):** die App zeigt seit Langem elf
Bereiche in einer Reihenfolge, die von § 2 an neun von elf Positionen abweicht — nur Position 1
(Identität & Person), 2 (Meine Menschen) und 11 (Persönliches) stimmen überein.

**Die Produktentscheidung (04.08.2026): das Produkt behält seine Reihenfolge, diese ADR
wird auf den gebauten Stand gezogen.** Die Liste in § 2 bleibt als Historie stehen — sie war die Entscheidung
vom 20.07., nur nie umgesetzt. Ab diesem Nachtrag ist die **geltende** Reihenfolge der elf Bereiche:

1. Identität & Person
2. Meine Menschen
3. Mobilität & Reise
4. Finanzen & Zahlungen
5. Gesundheit
6. Bildung & Beruf
7. Sozialversicherung
8. Vorsorge & Recht
9. Verwaltung & Behörden
10. Wohnen & Eigentum
11. Persönliches

Kein Wächter für diese Reihenfolge: eine Probe, die sie festnagelt, würde jede künftige
UX-Änderung rot machen — die Anordnung kann sich nach der Testerrunde noch ändern (Produktauflage, 04.08.2026).

**Vorkommen außerhalb des Repos — geprüft, nicht geändert.** Die exakte §2-Reihenfolge wurde in
den bislang gesichteten Materialien außerhalb des Repos nicht wortgleich gefunden; eine ältere
Website-Fassung spricht durchgehend von „20 Bereichen" — einer älteren, nicht mit dem
Elf-Bereiche-Modell übereinstimmenden Zählung, unabhängig von Reihenfolge.

---

*Vivodepot GmbH · Berlin · 20.07.2026, Nachtrag 04.08.2026*
