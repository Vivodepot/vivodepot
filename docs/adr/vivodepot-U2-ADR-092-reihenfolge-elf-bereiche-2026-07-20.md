# U2-ADR-092 · Reihenfolge der elf Bereiche

**Datum:** 20.07.2026 · **Nachtrag 04.08.2026** (Reihenfolge auf den gebauten Stand gezogen, s. u.)
**Status:** Angenommen · Nachtrag 04.08.2026: Reihenfolge auf den gebauten Stand gezogen
**Status heute:** gilt — die Reihenfolge in §2 deckt sich mit `SEKTOREN` in
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

**Die Reihenfolge der elf Bereiche ist die des Produkts** (Produktentscheidung 04.08.2026):

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

„Persönliches" bleibt gemäß U2-ADR-041 das letzte Element — mit elf statt zehn Bereichen die
elfte Position. Der frühere Bezug auf „Vivo" im Namen entfällt ersatzlos; der Bereich heißt
schlicht „Persönliches".

## 3 · Wirkungsradius

Betrifft die Bereichs-Übersicht (App) und die Website-Darstellung gleichermaßen — beide
müssen dieselbe Reihenfolge zeigen, keine zwei Wahrheiten.

## 4 · Wie es zu dieser Fassung kam

Am 20.07.2026 wurde eine andere Reihenfolge nach dem Prinzip „von grundlegend zu spezifisch"
festgeschrieben. Sie ist nie gebaut worden; das Produkt lief mit seiner Anordnung weiter, und der
Widerspruch fiel erst am 04.08.2026 auf.

**Gemessen ⟦M⟧, gegen `SEKTOREN` in `vivodepot.html` (`:4498` ff.):** die App zeigte elf Bereiche
in der Reihenfolge aus § 2; die Fassung vom 20.07. wich an neun von elf Positionen davon ab (nur
Identität & Person, Meine Menschen und Persönliches standen gleich). Entschieden wurde am
04.08.2026, die gebaute Reihenfolge zu behalten und diese ADR auf sie zu ziehen.

Kein Wächter für diese Reihenfolge: eine Probe, die sie festnagelt, würde jede künftige
UX-Änderung rot machen — die Anordnung kann sich nach der Testerrunde noch ändern (Produktauflage, 04.08.2026).

**Vorkommen außerhalb des Repos — geprüft, nicht geändert.** Die Reihenfolge vom 20.07. wurde in
den bislang gesichteten Materialien außerhalb des Repos nicht wortgleich gefunden; eine ältere
Website-Fassung spricht durchgehend von „20 Bereichen" — einer älteren, nicht mit dem
Elf-Bereiche-Modell übereinstimmenden Zählung, unabhängig von Reihenfolge.

---

*Vivodepot GmbH · Berlin · 20.07.2026, Nachtrag 04.08.2026*
