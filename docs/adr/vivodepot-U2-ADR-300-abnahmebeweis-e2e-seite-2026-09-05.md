# U2-ADR-300 · Der Produktabnahmebeweis, E2E-Seite — PDF-Modelle/Exportkanäle/Datei-Rundlauf gegen das ECHTE Bündel, im echten Browser

**Datum:** 05.09.2026
**Status:** gebaut, drei Proben grün, echter Browser, echte WebCrypto, echte Datei
**Status heute:** gilt, für die Struktur-Achse aller dreizehn nativen Sektoren — nicht für
Sprache/Rechtsraum/Branding (s. §4, Grenze benannt)
**Bezug:** das Produktabnahmekriterium (03.09.2026, wörtlich: „Am Ende möchte ich ‚mein'
Bürgerdepot haben. Als wäre nichts gewesen") · U2-ADR-292 (Ladeweg auf die Erste-Partei-Zone,
`buergermodulSektorErsetzen`) · U2-ADR-291 (Vier-Module-Schnitt, `tools/buergermodul/vd-privat.json`)
· U2-ADR-276 (Golden Master Ausgabewege — Wege übernommen, nicht sein Urteil) · U2-ADR-298
(nie über Indizes vergleichen) · U2-ADR-299 (7as Kern-Seite, dieselbe Aufteilung, dieselbe
Korrektur „gegen das echte Bündel, nicht gegen sich selbst")

---

## 1 · Aufteilung mit 7a, angesagt

```
7a    Kern-Seite     A == B über den geladenen Kern (SEKTOREN/Feld-Definitionen/
                     Textsatz/renderSektor-Ausgabe) — U2-ADR-299
DU    E2E-Seite      A == B über die Wege der Bürgerin (PDF-Modelle, zehn
                     Exportkanäle, ein echter Datei-Rundlauf) — dieser ADR
```

7as Seite misst, ob **dasselbe entsteht** (der Kern-Zustand nach dem Ersatz). Diese Datei misst,
ob **dasselbe herauskommt** (was die Bürgerin am Ende tatsächlich bekommt: ein PDF, ein Export,
eine geöffnete Datei). Keine Seite kann die andere ersetzen.

**A** = nativ an, kein Modul — der heutige, ausgelieferte Zustand.
**B** = nativ aus, Modul geladen — `buergermodulSektorErsetzen` (U2-ADR-292) ersetzt jeden der
dreizehn nativen Sektoren durch das ECHTE, ausgelieferte Bündel
(`tools/buergermodul/vd-privat.json`, U2-ADR-291).

---

## 2 · Gegen das echte Bündel, nicht gegen sich selbst — 7as Korrektur übernommen

Ein erster Entwurf dieser Datei reichte den nativen Bestand LIVE aus `SEKTOR_BY_ID` als
Modul-Definitionen zurück (dieselbe Technik wie U2-ADR-292s eigener Beweis,
`bauModuleDefsAusNativ`). **7a fand denselben Schwachpunkt an ihrer eigenen Kern-Seite zuerst**
(U2-ADR-299 §1): eine Selbstreferenz beweist nur, dass der Kern sich selbst gleicht — nie, dass
die tatsächlich AUSGELIEFERTE Bündel-Datei veraltet, anders sortiert oder fehlerhaft sein könnte.

**Hier übernommen, nicht neu erfunden:** diese Datei lädt `tools/buergermodul/vd-privat.json`
real von der Platte, wandelt seine Schnitt-Ausgabeform (`{bereiche:{sektorId:{sektionen:[{id,
felder:[{id,…,unterFelder}]}]}}}`) über eine reine Hüllen-Umwandlung in die flache Erzeuger-Form
um, die `buergermodulSektorErsetzen` verlangt (`{sektorId, sektionId, feldId, unterVon, feld}`) —
keine Feld-Eigenschaft verändert — und ruft `buergermodulSektorErsetzen` für alle dreizehn
Sektoren mit den ECHTEN, konvertierten Bündel-Definitionen auf.

**Ergebnis, gemessen:** das echte Bündel liefert für PDF-Modelle, alle zehn Exportkanäle und den
Datei-Rundlauf dasselbe Ergebnis wie der native Zustand — dieselbe Aussage wie 7as Kern-Seite,
unabhängig gemessen, an einer anderen Beweis-Ebene.

---

## 3 · Was diese Datei prüft — und wie

**Drei Proben, `tests/e2e/geruest-umbau-e2e-abnahme.spec.js`:**

- **Vorprüfung**: das Referenzdepot (`tests/fixtures/referenzdepot.js`, dieselbe Fixture wie
  U2-ADR-276s Golden Master) trägt im echten Browser echten Inhalt — alle zehn erwarteten
  Exportkanäle liefern ein Ergebnis, `vollDepotModell` trägt mindestens zehn Bereiche,
  `notfallKernModell` mehr als drei Zeilen.
- **A == B**: zwei unabhängige Browser-Kontexte (echte Kern-Instanzen, kein geteilter Zustand).
  Kontext A: natives Depot, befüllt, PDF-Modelle + Exportkanäle erfasst, echter Datei-Rundlauf
  (Sichern über die echte FSA-Attrappe → Schließen → Öffnen mit echtem Passwort). Kontext B:
  identisch, aber VOR der Erfassung wird jeder der dreizehn Sektoren durch das echte Bündel
  ersetzt (`buergermodulSektorErsetzen`, 0 Verwerfungen in jedem Sektor, Vorbedingung geprüft).
  **Exportkanäle, PDF-Modelle und das aus der Datei zurückgewonnene Depot sind zwischen A und B
  identisch.**
- **Gegenprobe**: dasselbe Feld, das U2-ADR-292s eigener Rot-Beweis nimmt
  (`vermoegen.wohnsituation`), aus den konvertierten Bündel-Definitionen absichtlich entfernt,
  bevor der Ersatz läuft — das `vollDepotModell` weicht daraufhin nachweislich vom nativen Zustand
  ab. Beweist: die Hauptprobe ist scharf, nicht zufällig grün.

**Nie über Indizes verglichen** (U2-ADR-298): jeder Vergleich geht über benannte Schlüssel
(Kanal-id, Modell-Name, Sektor-id) — nie über eine Array-Position.

**Wege übernommen, Urteil nicht** (U2-ADR-276): dieselben Funktionsaufrufe wie der Node-Golden-
Master (`vollDepotModell`, `bereichVollModell`, `notfallKernModell`,
`uebergabeWiderrufNutzlast`, `EXPORT_FORMATE`) — hier aber A und B im selben Lauf gegeneinander
gehalten, kein Einfrieren, kein `_NEU=1`-Mechanismus, kein Vergleich gegen eine eingefrorene
Vergangenheit.

---

## 4 · Zwei echte Funde unterwegs — beide benannt, keiner „wegnormalisiert"

**Fund 1 (Testaufbau-Artefakt, korrigiert): U2-ADR-011s Auto-Save-aus-DOM.** Ein erster Versuch,
ALLE dreizehn Sektoren nach der Fixture-Injektion erneut zu rendern (um Render-seitige
Default-Nachfüllungen symmetrisch zu halten), brach echten `persoenliches`-Fixture-Inhalt: der
Sektor-Wechsel beim Rendern griff auf noch unbefülltes DOM zurück und schrieb dessen leeren
Zustand über den gerade injizierten Fixture-Inhalt zurück. Behoben durch Verzicht auf den
Sektor-Wechsel: nur `identitaet` (der Sektor, den der reale Anlege-Weg ohnehin schon rendert)
wird gezielt ein zweites Mal gerendert, kein Sektorwechsel, kein Risiko für die übrigen zwölf.

**Fund 2 (echt, außerhalb des Auftrags, benannt statt gelöst): Leerstring wird beim echten
Krypto-Rundlauf zu einem fehlenden Schlüssel.** Ein Feld mit Leerstring-Wert (z. B.
`identitaet.geburtsjahr: ""`, Teil des Referenzdepot-Fixtures selbst) kommt nach einem ECHTEN
Verschlüsselungs-Rundlauf im echten Browser als FEHLENDER Schlüssel zurück, nicht als Leerstring
— die feld-einheiten-basierte Verschlüsselung („Zerfall") schreibt für einen leeren Wert
offenbar keine eigene Einheit. Das trifft A und B GLEICHERMASSEN (dieselbe Fixture, derselbe
Mechanismus) und verfälscht darum den A==B-Vergleich nicht — aber es ist eine andere, eigene
Frage als die hier gestellte („ist der Rundlauf ALLGEMEIN verlustfrei", nicht nur „liefert er für
A und B dasselbe"), die der Node-Golden-Master (U2-ADR-276) mangels echter Browser-Krypto nie
zeigen konnte. **Hier ausdrücklich NICHT untersucht oder behoben** — benannt als offene Frage,
falls „Leerstring vs. fehlender Schlüssel" an anderer Stelle (Export, PDF, Fremdmodul-Vergleich)
je einen sichtbaren Unterschied machen sollte.

Zwei Schlüssel deshalb bewusst aus dem Datei-Rundlauf-Vergleich entfernt, benannt statt still
gefiltert: `sicherungsStand` (entsteht erst durch den Sichern-Klick selbst, trägt keinen
Depot-Inhalt) und `urheberschaft` (reine Provenienz-Buchhaltung, „getrennt von der
Sektor-Nutzlast" geführt, vivodepot.html:30390 — WANN ein Feld zuerst gelesen wurde, nicht WAS es
enthält, und abhängig vom genauen Rendering-Zeitpunkt dieses Testaufbaus).

---

## 5 · Wofür das NICHT reicht — ausdrücklich benannt, keine A-gegen-A-Attrappe

**Nur die Struktur-Achse.** Für Sprache-, Rechtsraum- und Branding-Achse existiert heute KEIN Weg,
denselben nativen Inhalt „nativ aus, Modul geladen" zu laden — nur `buergermodulSektorErsetzen`
für die Struktur-Achse existiert (U2-ADR-292 §4, U2-ADR-299 §4 bestätigen dieselbe Grenze an der
Kern-Seite). Ein A-gegen-A-Vergleich für diese Achsen wäre eine Probe, die nie rot werden könnte
— genau die Sorte Beleg, vor der diese Codebasis an anderer Stelle ausdrücklich warnt
(Positivkontrolle-Pflicht: jede Probe muss zeigen können, dass sie wirklich prüft). Hier darum
bewusst NICHT gebaut, statt als bestandene Probe vorgetäuscht — eine künftige Sitzung, die einen
Ladeweg für diese Achsen baut, braucht einen eigenen A/B-Beweis, keinen hier nachgezogenen.

**Kein echter, signierter Import-Pfad** (dieselbe Grenze wie U2-ADR-292/299): die Probe reicht die
konvertierten Bündel-Definitionen direkt durch `buergermodulSektorErsetzen`, nicht über
`modulEinlassen`/eine echte Fremdmodul-Ladeschleife.

**Leerstring-vs-fehlender-Schlüssel beim Krypto-Rundlauf** (§4, Fund 2) — real, reproduzierbar,
außerhalb dieses Auftrags.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
