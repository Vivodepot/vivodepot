# U2-ADR-381 · xShare in der v515-Vier-Produkte-Abnahme nachgeholt

**Datum:** 08.09.2026
**Status:** gebaut, alle vier Produkte grün (plus eigene Gegenprobe), echter Playwright-Browser
**Status heute:** gilt
**Bezug:** U2-ADR-372 (die v515-Vier-Produkte-Abnahme, ließ xShare beim ersten Zug bewusst aus) ·
U2-ADR-321 (der v501-Wächter, dessen xShare-Erfassung hier übernommen wird) · die
DoD, wörtlich „Die xShare-Komponenten müssen genau so funktionieren"

---

## 1 · Warum nachgeholt statt belassen

U2-ADR-372 (Abschnitt 4) ließ xShare aus, weil der ursprüngliche Auftrag nur Exportkanäle,
PDF-Modelle und Datei-Rundlauf nannte. Einwand: der v501-Wächter
(`tests/e2e/nativ-auslieferung-a-b-abnahme.spec.js`, U2-ADR-321) deckt xShare bereits ab — die
Maschinerie existiert also. Ein Ausgabeweg, den ausgerechnet die Probe nicht anfaßt, die DoD-Frage („nicht unterscheidbar von 515") beantworten soll, wäre eine Lücke in genau dieser
Probe, nicht eine legitime Grenze ihres Umfangs.

## 2 · Dieselbe Maschinerie, eigenständig geschrieben

`xshareErfassen` in `tests/e2e/v515-vier-produkte-a-b-abnahme.spec.js` ist inhaltlich identisch
zu U2-ADR-321s Fassung — bewusst dieselbe Technik, nicht neu erfunden:

- **Fester Prüfstoff:** ein autoritativer Mappe-Eintrag (Text + ID), auf A- und B-Seite identisch
  eingetragen — das Referenzdepot führt heute keinen eigenen.
- **Fest ersetzte Zufallsquelle und Uhr, nur für die Dauer des einen Aufrufs:**
  `shlProviderPayload` zieht sonst bei jedem Aufruf einen frischen 256-Bit-Schlüssel/IV aus
  `crypto.getRandomValues` und die Ablauffrist aus `Date.now()` — ohne Fixierung wäre A≠B allein
  durch Zufall garantiert, nicht durch einen echten Unterschied.
- **Volle Nutzlast verglichen**, nicht eine beschnittene Hülle: Schlüssel, flag, label, exp UND
  der echte JWE-Chiffretext. Eine Änderung am SHL-Weg schlägt damit voll durch.

Wie in U2-ADR-372 selbst begründet (Kopfkommentar zu `pfadUnterschiede`/`kurz`): eigenständig
geschrieben statt importiert, um keine Kopplung an eine Datei herzustellen, deren Aufgabe (die
v501-Abnahme) mit dieser Probe nichts zu tun hat.

## 3 · Einordnung, REIHENFOLGE, eigene Gegenprobe

`xshareErfassen` läuft nach der Kanal-/Modell-Erfassung und vor dem Datei-Rundlauf — der
Mappe-Eintrag soll die zehn Exportkanäle nicht verändern, im Rundlauf aber auf beiden Seiten
gleich mitreisen (dieselbe Reihenfolge-Begründung wie U2-ADR-321).

Eine eigene Gegenprobe (`[Gegenprobe · xshareInhalt]`) verfälscht ausschließlich den xShare-
Prüfstoff auf der A-Seite (der Text bekommt den Zusatz „ VERFAELSCHT", was den JWE-Chiffretext
ändert) und erwartet, dass allein das den Vergleich bricht — unabhängig von der bereits
bestehenden Gegenprobe, die am SEKTOREN-Bestand angreift.

## 4 · Ergebnis

Alle vier Produkte (privat-de, privat-en, pro-de, pro-en) bestehen die xShare-Achse ohne eine
einzige unerklärte Abweichung — keine neue `ERWARTETE_ABWEICHUNGEN`-Zeile war nötig. Die SHL-
Nutzlast (Schlüssel, flag, label, exp, JWE) ist zwischen v515 und jedem der vier konfektionierten
Produkte identisch. Beide Gegenproben (Feld-Verlust, xShare-Inhalt) brechen den Vergleich wie
gefordert.

Voller Lauf vor Commit: 321 e2e (Playwright, +1 gegenüber U2-ADR-372s 320 — die neue
xShare-Gegenprobe), Node-Suite unverändert grün.
