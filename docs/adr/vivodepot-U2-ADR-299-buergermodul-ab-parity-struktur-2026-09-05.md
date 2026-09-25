# U2-ADR-299 · Der Produktabnahmebeweis, Kern-Seite — Struktur/Feld-Definitionen/Textsatz gegen das ECHTE Bündel

**Datum:** 05.09.2026
**Status:** gebaut, 19 Proben grün (davon 2 Rot-Beweise), 47/47 Regression grün
**Status heute:** gilt, für die Struktur/Textsatz-Achse aller 13 nativen Sektoren — nicht für
Recht/Branding/Situationen/Wizards (s. §4, Grenze benannt)
**Bezug:** das Produktabnahmekriterium (03.09.2026, wörtlich: „Am Ende möchte ich ‚mein'
Bürgerdepot haben. Als wäre nichts gewesen") · U2-ADR-292 (Ladeweg auf die Erste-Partei-Zone,
`buergermodulSektorErsetzen`) · U2-ADR-293 (Sprachmodul-Struktur-Invarianz) · U2-ADR-291
(Erzeuger/Schnitt-Kette, `tools/buergermodul-erzeugen.js`/`buergermodul-schnitt.js`) ·
Aufteilung mit einer weiteren Sitzung (E2E-Seite: PDF-Modelle, Exportkanäle, Datei-Rundlauf)

---

## 1 · Die Lücke, die dieser ADR schließt

Der Maßstab ist eine A/B-Probe: **A** (nativ an, kein Modul) muss **B** (nativ aus,
Bürgermodul geladen) gleichen, in allem, was die Bürgerin sieht.

U2-ADR-292 hat `buergermodulSektorErsetzen` bereits für alle 13 Sektoren bewiesen — aber **gegen
sich selbst**: der native Bestand wurde live aus der laufenden Kern-Instanz als Modul-Definitionen
zurückgereicht, nicht das echte, auf der Platte liegende Bündel (`tools/buergermodul/vd-privat.json`,
03s Erzeuger-/Schnitt-Kette). Das ist ein echter Unterschied — eine Datei kann veraltet sein,
anders sortiert, oder einen Fehler tragen, den eine Live-Rückgabe aus derselben Kern-Instanz nie
zeigen würde.

**Diese Datei fährt B gegen die Datei, nicht gegen sich selbst.**

---

## 2 · Die Form-Brücke

`buergermodulSektorErsetzen(sektorId, moduleDefs)` verlangt die flache Erzeuger-Form
(`{sektorId, sektionId, feldId, unterVon, feld}`, Top-Level und Unterfeld nebeneinander). Das
Bündel selbst liegt in der Schnitt-Ausgabeform (`{bereiche:{sektorId:{sektionen:[{id,
felder:[{id,…,unterFelder:[…]}]}]}}}`) — eine reine Hüllen-Umwandlung, keine
Feld-Eigenschaft verändert, ausschließlich für diese Probe gebraucht.

**Sanity vor jedem Vergleich, gemessen statt angenommen:** das Bündel deckt alle 13 nativen
Sektoren, exakt 448 Feld-Definitionen (266 Top-Level + 182 Unterfelder — dieselbe Zahl, die
`docs/faktenbasis.md` für den nativen Bestand nennt), und für JEDEN Sektor exakt dieselben
Kennungen wie `_erstePartieErlaubteIdsFuerSektor` — nicht mehr, nicht weniger.

---

## 3 · Der Beweis

**`tests/buergermodul-ab-parity-u2-adr-299.test.js`, 19 Proben:**

- **Bündel-Sanity** (2 Proben): 13 Sektoren, 448 Definitionen, Kennungsdeckung exakt gegen den
  nativen Bestand geprüft.
- **A == B, alle 13 Sektoren** (13 Proben, eine je Sektor): `renderSektor`-Ausgabe vor dem Ersatz
  (nativ) gegen danach (echtes Bündel geladen) — **byte-identisch, 0 Verwerfungen, in jedem
  einzelnen der 13 Sektoren**, `identitaet`/`meine-menschen` (Merkmale/Rollen) und `vorsorge`
  (72 Unterfelder) eingeschlossen.
- **Textsatz-Achse** (1 Probe): das Bündel trägt nachweislich KEIN `label` — die deutsche
  Beschriftung im gerenderten HTML kommt darum sichtbar aus `_textsatzAufSektorenAnwenden`, nicht
  aus dem Bündel. Beweist die Struktur/Text-Trennung wirkt, nicht nur behauptet wird.
- **Rot-Beweis 1** (1 Probe): ein aus dem ECHTEN Bündel weggelassenes Feld (`wohnsituation`) fehlt
  wirklich im gerenderten HTML, ein Nachbarfeld bleibt unberührt.
- **Rot-Beweis 2, Reihenfolge** (1 Probe): zwei Sektionen im Bündel vertauscht (dasselbe Feld-Set,
  andere Sektions-Zuordnung) — das gerenderte HTML weicht messbar ab. Beweist: „ein Feld, das da
  ist, aber woanders steht, ist ein Unterschied, den die Probe sieht" (Auflage) — nicht nur
  Vollständigkeit, auch Platzierung ist geprüft.
- **Grenze, benannt** (1 Probe): das Bündel trägt heute ausschließlich `bereiche` — kein
  `situationen`/`wizards`-Schlüssel. Als Wächter geschrieben, nicht nur als Prosa: schlägt diese
  Probe künftig an, weil das Bündel gewachsen ist, ist das die gute Nachricht, dass die Lücke
  geschlossen wurde — UND das Signal, diese Datei zu erweitern.

**Regression:** die bestehenden `buergermodul-sektor-ersetzen`/`-schnitt`/`u2-adr-293`-Proben
(28 Stück) unverändert grün, kein Widerspruch zwischen der Selbst-Referenz-Probe (U2-ADR-292) und
der Bündel-Probe hier — beide grün, beide messen etwas anderes.

---

## 4 · Wofür das NICHT reicht — bewusst benannte Grenze

**Nur die Struktur-Achse, nur `bereiche`.** Nicht Teil dieses ADRs:

- **Recht** (`tools/buergermodul/vd-de-rechtsraum.json`) und **Branding**
  (`tools/buergermodul/vd-branding.json`) — andere Bausteine derselben Vier-Teilung, eigene
  Ladewege, nicht `buergermodulSektorErsetzen`-Form, nicht geprüft hier.
- **Situationen/Wizards** — das Struktur-Bündel selbst trägt sie heute nicht (§3, Grenz-Wächter).
  `buergermodulSektorErsetzen` ist an die Sektor/Sektionen-Form gebunden; ob dieselbe Mechanik
  für Situationen/Wizards trägt, ist ungeprüft (bereits in U2-ADR-292 §4 benannt, hier nicht
  erneut gebaut).
  **NACHTRAG U2-ADR-308 (05.09.2026):** die Ladeweg-Hälfte für Situationen ist gebaut —
  `buergermodulSituationErsetzen`, mit echtem `renderSituation`-A/B (byte-identisch für
  neun der zehn nativen Situationen, `todesfall-uebernahme` benannt ausgenommen). Der
  Bündel-Schlüssel selbst (`vd-privat.json` trägt `situationen`) bleibt weiterhin offen —
  diese Zeile bleibt insofern wahr, nur die Mechanik-Frage ist beantwortet.
- **Kein echter, signierter Import-Pfad.** Wie in U2-ADR-292: die Proben reichen die konvertierten
  Bündel-Definitionen direkt als JS-Objekte durch `buergermodulSektorErsetzen`, nicht über
  `modulEinlassen`/eine echte `.json`-Datei-Ladeschleife. Ein zusätzlicher, gemessener Fund dabei:
  ginge dasselbe Bündel stattdessen über den REGULÄREN Einlassweg (`bereichsModulPruefen`), würde
  es als `reserviert` abgelehnt — `identitaet` u. a. sind eingebaute IDs (`BEREICH_IDS_EINGEBAUT`).
  Das ist kein neuer Fund (`tools/buergermodul-erzeugen.js`s eigener Kopfkommentar nennt genau
  diesen Riegel, ebenso den Textsatz-Zwilling `textsatz 'de' → reserviert'`) — hier bestätigt,
  nicht umgangen: `buergermodulSektorErsetzen` existiert als Erste-Partei-Zone GENAU WEIL der
  reguläre Weg für native Kennungen gesperrt ist, kein Ersatzbeweis für einen offenen Riegel.
- **PDF-Modelle, Exportkanäle, Datei-Rundlauf** — E2E-Seite, Zuständigkeit der anderen Sitzung
  (angesagte Aufteilung, s. Bezug oben). Diese Datei sagt: dasselbe ENTSTEHT im Kern. Ihre sagt: aus
  dem Kern kommt dasselbe HERAUS. Keine Seite kann die andere ersetzen.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
