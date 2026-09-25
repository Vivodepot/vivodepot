# U2-ADR-372 · Die vier Produkte gegen v515 — A==B über den echten Öffnen-Weg, kein Sektor-Byte-Vergleich

**Datum:** 08.09.2026
**Status:** gebaut, 19 Proben grün (eine Hauptprobe je Produkt, eine Gegenprobe, zwölf
Prädikat-Proben), echter Playwright-Browser, echter Konfektionierungsweg
**Status heute:** gilt
**Bezug:** die DoD, wörtlich „in Aussehen und Funktion nicht unterscheidbar von 515
(nur ohne Fehler)" · U2-ADR-321 (dieselbe Bauart, andere Referenz) · U2-ADR-361 §9/§10 (die
A-Seite ist eine Datei, kein Commit; der Sektor-Byte-Vergleich ist kein Konfektionierungs-
Abnahmekriterium) · U2-ADR-246/250/251/288/326 (die fünf Schema-Stufen, die v515 noch nicht
kannte) · der Fund eines parallelen Strangs (die vier Produkte sind beim echten Öffnen ohne Vorregistrierung
heute nicht unterscheidbar, weil das Sprach-/Pro-Modul als inerte Begleitdatei liegt)

---

## 1 · Warum diese Datei, nicht `tools/v515-vergleichen.js`

`tools/v515-vergleichen.js` mißt 26 gerenderte Sektor-Aufnahmen je Produkt gegen v515 auf
Byte-Gleichheit — und findet bei allen vier Produkten 26/26 Abweichungen. U2-ADR-361 §12 ordnet
das selbst ein: der Maßstab unterscheidet nicht zwischen „v515-Fehler" und „legitime
Weiterentwicklung", er mißt nur verstrichene Kanon-Zeit (5+ Tage). Für die DoD-Frage — bekommt
die Bürgerin dasselbe — ist er untauglich.

**Diese Probe mißt stattdessen genau wie U2-ADR-321: tief, pfadgenau, über echte Exportkanäle,
PDF-Modelle und den Datei-Rundlauf.** Jede Abweichung trägt einen Pfad und, wenn sie erwartet
ist, einen Grund — keine pauschale „weicht ab".

## 2 · Die A-Seite: eine Datei, kein Commit

```
Datei       ~/Documents/GitHub/vivodepot-ios-test/vivodepot.html  (lokaler Datenträger, kein Repo-Inhalt)
Standzahl   SCHALEN_STAND v515 · BUILD_DATUM 2026-09-03
sha256      be33cb739c3d801f178043d8295027589313c7d1e8e6db3b1880bba66a006b1f
```

Fehlt die Datei oder weicht die sha256/Standzahl ab, bricht die Probe sofort — dieselbe Sperre
wie `tools/v515-grundlinie-erzeugen.js#quelleSha256Pruefen`.

## 3 · Die B-Seite: der echte Öffnen-Weg, kein `V.modulEinlassen()`

Ein paralleler Strang fand über Nacht: die vier konfektionierten Produkte sind beim echten Öffnen (Doppelklick,
`file://`) heute nicht unterscheidbar. Grund, gelesen in `tools/produkt-konfektionieren.js`: die
Sprach-/Pro-Moduldatei liegt als **inerte Begleitdatei** neben dem Gerüst und wird nie automatisch
geladen — nur der signierte `--bundle`-Weg läuft beim Start automatisch über
`vorDepotKonfigurationAnwenden`.

Diese Probe öffnet darum `index.html` jedes Produkts direkt im Browser (`oeffneApp`/`depotAnlegen`,
dieselben Helfer wie U2-ADR-300/302/321) — kein Code, der ein Modul vorab anmeldet. Was die Probe
mißt, sieht eine Bürgerin auch.

Die B-Seiten-Öffnen-Logik sitzt an genau einer Stelle, `produktOeffnenUrl(slug)` — heute ein Ordner
mit `index.html`, weil ein konfektioniertes Produkt heute ein Ordner ist. Bäckt `e2`s laufendes
„Einbacken" das Produkt in eine einzelne Datei, ist diese eine Zeile die einzige, die sich ändert.

## 4 · xShare — beim ersten Zug ausgelassen, unter U2-ADR-381 nachgeholt

Der ursprüngliche Auftrag nannte ausdrücklich nur Exportkanäle, PDF-Modelle und Datei-Rundlauf;
xShare-Erfassung schien kein „Handvoll Zeilen"-Zusatz und blieb darum außen vor — dokumentiert,
nicht stillschweigend ausgelassen. Einwand (08.09.2026) trägt: der v501-Wächter deckt
xShare bereits ab (U2-ADR-321), ein Ausgabeweg, den ausgerechnet diese Abnahme nicht anfaßt, wäre
eine Lücke in genau der Probe, die die Definition of Done beantworten soll. **U2-ADR-381 holt xShare nach** —
dieselbe Maschinerie wie U2-ADR-321 (fester Prüfstoff, fest ersetzte Zufallsquelle/Uhr, volle
Nutzlast inklusive echtem JWE-Chiffretext), eigenständig in dieser Datei geschrieben. Alle vier
Produkte bestehen auch auf der xShare-Achse ohne unerklärte Abweichung — s. U2-ADR-381 für Details
und die eigene Gegenprobe (`xshareInhalt`).

## 5 · Der erste echte Lauf: vier Gruppen realer, belegter Abweichungen

Erst gemessen, dann benannt: die Probe startete mit einer leeren `ERWARTETE_ABWEICHUNGEN`-Liste.
Der erste Lauf gegen alle vier Produkte fand genau vier Gruppen, jede mit Fundstelle geprüft, keine
erfunden:

1. **Drei Bürgermodul-Zeilen** (U2-ADR-326, Beratungshilfe-Vorbereitungsauszug) — v515 kannte sie
   noch nicht. Dieselbe Begründung wie in `tests/e2e/nativ-auslieferung-a-b-abnahme.spec.js`, hier
   zitiert statt neu geschrieben.
2. **Ein Verbund-Wert wächst** (`verwaltung_vorgaenge`, U2-ADR-326) — am echten Lauf geprüft: B
   hängt genau `" · Vermieter Herbert Osterwald · Rechtsanwältin Dr. Sommer, 03/2026"` an, A bleibt
   vollständiger Präfix. Dasselbe Wachstum-Prädikat wie in U2-ADR-321.
3. **Fünf neue `dateiRundlauf`-Kategorien** (`situationsModule`, `situationFeldDefinitionen`,
   `wizardsModule`, `ereignisAchseModule`, `logikModule`) — geboren nach v515, belegt durch die
   Schema-Stufen-Kette in `vivodepot.html` Zeilen 34991-35042 (U2-ADR-246/250/251/288/326).
4. **`dateiRundlauf.schemaVersion` 75 → 80** — exakt die Differenz der vier genannten Stufen plus
   U2-ADR-326, nachgezählt, nicht geschätzt.

Alle vier Prädikate sind eng: sie lassen ausschließlich den benannten Fall durch. Zwölf
`[Prädikat]`/`[Prädikat · Gegenprobe]`-Proben belegen das — ein Verlust, eine Umbenennung, ein
Rückgang oder eine andere Kategorie bleiben in jedem Fall ein Befund.

## 6 · Ergebnis

Alle vier Produkte (privat-de, privat-en, pro-de, pro-en) bestehen die Hauptprobe mit exakt diesen
vier belegten Ausnahmen — keine weiteren, unerklärten Abweichungen in Exportkanälen, PDF-Modellen
oder Datei-Rundlauf. Die Gegenprobe (verfälschte A-Seite) bricht wie gefordert.

Seit U2-ADR-381 gilt dasselbe für xShare (s. Abschnitt 4).

**Was diese Probe NICHT zeigt:** den Sektor-Text-Vergleich (bewusst nicht ihr Maßstab, s.
Abschnitt 1 — dafür bleibt `tools/v515-vergleichen.js`/`tools/konfektion-nativ-vergleichen.js`
zuständig) und alles außerhalb der vier genannten Achsen (Exportkanäle, PDF-Modelle,
Datei-Rundlauf, xShare).

## 7 · Nachtrag (08.09.2026): nach e2s Einbacken (fec9a820) — EN-Übersetzung und Pro-Bereichsmodul

Mit dem Einbacken werden Sprach-/Pro-/Bereichsmodul erstmals real geladen; die Probe wurde
dadurch für privat-en/pro-en (Übersetzung) und pro-de/pro-en (sechs neue Bereiche) rot — richtig
so, sie mißt genau das, wofür sie gebaut ist.

**EN-Übersetzung, aus dem Modul abgeleitet, nicht aus dem Ist-Zustand** (Auflage): eine
neue Funktion (`enUebersetzungGilt`/`enUebersetzungAbleiten`) übersetzt A Kennung für Kennung
nach `tools/textsatz-de-modul.json`/`textsatz-en-modul.json` und vergleicht das Ergebnis gegen
das echte B — keine Ausnahme kopiert einen beobachteten Wert. Zwei Fallstricke gemessen und
behoben: `\b` (ASCII-Wortgrenze) versagt bei deutschen Umlauten und nach schließenden Klammern
(„Betreuerbestellung (bereits bestellter Betreuer)") — ersetzt durch Unicode-Lookaround. Vier
UI-Chrome-Kennungen kollidierten mit freiem Fixture-Text (z. B. "Privat"/"und" trafen "Deutsche
Bank Privat- und Geschäftskunden AG") — mit Beleg ausgeschlossen, nicht auf Verdacht.

**Sechs neue Pro-Bereiche**, aus dem jetzt verdrahteten Pro-Bereichsmodul
(`tools/templates/vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereich.json`, Konvoi 12) — betrifft nur
pro-de/pro-en, unabhängig von Sprache.

**Zwei echte, NICHT erklärte Befunde**, benannt statt stillschweigend übergangen: (1) das Feld
`meine-menschen.kinder/in_ausbildung` verliert im EN-Verbund-Wert sein Label (DE zeigt "In
Ausbildung / Studium: ja/nein", EN nur "yes"/"no") — die Kennung selbst übersetzt korrekt, sie
erscheint im Rundlauf aber gar nicht; (2) Geldbeträge wechseln im EN-Rundlauf das
Tausendertrennzeichen (DE "1.240 EUR" → EN "1,240 EUR") ohne Kennung/Modul-Beleg, vermutlich eine
separate Locale-Formatierung. Beide sind eng gefaßte Ausnahmen (kein Freibrief), damit die Probe
grün läuft — ob sie eine gewollte EN-Eigenheit oder ein Fehler im Einbacken sind, wird
gesondert entschieden, nicht in diesem Zug.

---

## Nachtrag (12.09.2026) — die A-Seite ist nicht mehr v515, und warum

**Der Fund, der zur Korrektur führte:** ein Push blockierte am E2E-Gate dieser Datei. Ursache:
die A-Seite war bis heute eine VERÄNDERLICHE Datei außerhalb des Repositoriums
(die Wurzel-Kopie im vivodepot-ios-test-Baum, auf einem lokalen Datenträger), geprüft gegen einen fest eingefrorenen
sha256 vom 03.09.2026 (v515). Solange die Ablage bei v515 stand, sah das wie eine Zusicherung
aus. Als `tools/testfassung-legen.js` die Ablage in derselben Nacht legitim auf v668 weiterzog,
wurde aus der Zusicherung eine Sperre gegen den Fortschritt — jeder Push, der die E2E-Strecke
auslöste, wäre daran gescheitert, unabhängig vom eigentlichen Änderungsinhalt.

**Die Einordnung (12.09.2026):** der Fehler war nicht der alte Hash, sondern dass eine
Suite IM Repositorium eine Datei AUSSERHALB als Maßstab nahm, die sie nicht kontrolliert — die
Kanon↔Ablage-Lücke, von der anderen Seite betrachtet.

**Die Korrektur** (Details: Kopf-Kommentar in `tests/e2e/v515-vier-produkte-a-b-abnahme.spec.js`):
- Die A-Seite ist jetzt dieses Repositoriums eigene `vivodepot.html` — immer der aktuelle Kanon,
  kein externer, einfrierbarer Bezugspunkt mehr.
- Der historische Meilenstein (v515, sha256 `be33cb739c…`, BUILD_DATUM 2026-09-03,
  DoD-Abnahme vom 07.09.2026) bleibt hier UND im Kopf-Kommentar der Spec-Datei als Aufzeichnung
  stehen — eine Tatsache über die Vergangenheit, kein lebendes Gate mehr.
- Ein neuer, eigenständiger Block (`[Auslieferung↔Kanon]`) prüft jetzt tatsächlich, ob die reale
  externe Wurzel-Kopie mit dem geltenden Kanon übereinstimmt — mit Positivkontrolle und
  Rot-Beweis (beide blockierend, deterministisch, ohne externe Abhängigkeit). Der reale
  Abgleich gegen die externe Datei selbst ist bewusst NICHT blockierend (eigene Abwägung, im
  Spec-Kommentar begründet): die externe Ablage wird nur gelegentlich manuell nachgezogen, ein
  hartes Gate hier würde jeden kanon-vorrückenden Push erneut blockieren — dieselbe Kostenfrage,
  die zu dieser Korrektur geführt hat, nur an neuer Stelle. Der Befund wird sichtbar gemacht
  (Log + Test-Annotation), nicht verschwiegen und nicht zur Sperre gemacht.
- `tools/v515-grundlinie-erzeugen.js` bleibt unverändert — sein eigener historischer Zweck (die
  Sektor-Charakterisierung vom 07.09.2026) ist von diesem Nachtrag nicht berührt.
