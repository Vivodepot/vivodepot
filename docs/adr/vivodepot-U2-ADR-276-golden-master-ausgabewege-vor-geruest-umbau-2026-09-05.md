# U2-ADR-276 · Ein Golden-Master für die Ausgabewege des Bürgerdepots — das Netz vor dem Gerüst-Umbau

**Datum:** 05.09.2026
**Status:** Angenommen und umgesetzt.
**Status heute:** gilt — `tests/golden-master-ausgabewege.test.js`, Baseline
`tests/fixtures/golden-master-ausgabewege-baseline.json`.
**Entscheidung:** Wörtlich: „Es darf absolut keinen
klitzekleinen Unterschied geben zwischen dem jetzigen Bürgerdepot und dem morgigen Bürgerdepot."
**Bezug:** U2-ADR-253 (Bürgerdepot-Modul-Umbau, Commit A) und die Fortsetzungen U2-ADR-246/250/251
(die vier andockbaren Register, die aus dem Gerüst gezogen werden) · `tests/paket0-migrationsbeleg-
referenzdepot.test.js` (derselbe Beleg für das Datenmodell/`vollExportJSON`) ·
`tests/render-charakterisierung.test.js` (derselbe Beleg für die gerenderte Ansicht) ·
`tests/shl-provider.test.js` (deckt SHL bereits ab, s. u.) · U2-ADR-257 (Bauform „zwei Kernfassungen
byte-genau vergleichen", hier als Vorbild, nicht als Mechanismus übernommen) · U2-ADR-044/047
(SHL-Sendeweg, Status-Spannung, unverändert offen)

---

## Kontext und Problem

Das Bürgerdepot wird aus dem Gerüst in ein eigenes Modul herausgelöst („Paket 5" des
Gerüst-Umbaus, s. U2-ADR-253). Für die Bürgerin muss der Umbau unsichtbar sein — nicht „im
Wesentlichen gleich", sondern identisch: dieselbe Ansicht, dasselbe PDF, derselbe Export, dieselbe
gespeicherte Datei.

**Vor diesem Auftrag gab es kein Netz, das das Ganze hält.** Zwei Teile existierten bereits:

- `tests/paket0-migrationsbeleg-referenzdepot.test.js` hält das Datenmodell (`vollExportJSON`)
  gegen eine eingefrorene Baseline.
- `tests/render-charakterisierung.test.js` hält die gerenderte Ansicht jedes Sektors (leer und
  befüllt) gegen eingefrorene HTML-Dateien.

**Drei Ausgabewege standen ungemessen daneben:** die PDF-Modelle (Gesamt-Depot, Einzelbereich,
Notfallkarte, Widerruf), zehn der elf Exportkanäle, und die gespeicherte `.vivodepot`-Datei selbst
(genauer: ob ihr Inhalt einen echten Verschlüsselungs-/Entschlüsselungs-Rundlauf verlustfrei
übersteht). Ein Umbau, der einen dieser Wege verschiebt, hätte keine der beiden bestehenden Proben
zum Kippen gebracht.

## Entscheidung

**Eine vierte Datei, `tests/golden-master-ausgabewege.test.js`, erweitert dieselbe Bauform wie
Paket 0** (additive Gegenzeichnungs-Liste je Ebene, kein zweiter Mechanismus) — auf die drei bisher
ungemessenen Ausgabewege:

1. **PDF-Modelle** (`vollDepotModell`, `bereichVollModell` für zwei Bereiche, `notfallKernModell`,
   `uebergabeWiderrufNutzlast`) — verglichen wird das reine, jsPDF-freie Datenmodell, nicht das
   Zeichnen. Dieselbe Trennung, die der Kern selbst schon zieht (Modell + Meta sind rein/testbar,
   das Zeichnen läuft im Browser) und die `docx-streichung-gegenprobe.test.js` bereits für einen
   anderen Ausgabeweg nutzt.
2. **Zehn der elf Exportkanäle** (`EXPORT_FORMATE` ohne `json` — das deckt Paket 0 bereits ab).
   Bekannte Zeitstempel-Felder werden einzeln benannt normalisiert (`erstelltAm`, `iat`,
   ICS-`DTSTAMP`/`DTSTART`) — nie ein Blanket-Filter.
3. **Ein echter Datei-Rundlauf**: `depotSerialisieren()` in einem Kern, `depotLaden()` in einem
   ZWEITEN, frischen Kern, Vergleich des zurückgewonnenen Depots gegen die eingefrorene Grundlinie.

### Byte-Identität ist Beweislast für den Umbau, kein Verbot gegen Behebung

Die erste Fassung dieser Regel lautete „jede Abweichung ist rot, ohne Ermessen". **Das hätte
bekannte Fehler einbetoniert** — mehrere waren beim Bau dieser Probe bereits bekannt (s.
Begleitbericht). Korrigiert (04.09.2026):

> Der Umbau darf nichts verändern — dort gilt die Härte ohne Toleranz. Eine Behebung ist ein
> eigener Schritt: einzeln benannt, begründet, mit eigener Probe — und sie verschiebt die
> Vergleichsgrundlage absichtlich und sichtbar, nie als Nebenwirkung, nie im selben Commit wie
> ein Umbau.

Praktisch: eine Baseline-Verschiebung läuft ausschließlich über
`GOLDEN_MASTER_AUSGABEWEGE_NEU=1 node --test tests/golden-master-ausgabewege.test.js`, in einem
eigenen Commit, mit der Begründung in der Commit-Nachricht — dieselbe Konvention wie
`RENDER_AUFNAHME_NEU=1` bei der Render-Charakterisierung.

### Zwei benannte Grenzen, eine Begründung, zweimal angewandt

**Ciphertext ist verschlüsselt, absichtlich und bei jedem Lauf anders** — Salt, IV und (bei
Zerfall) der Inhaltsschlüssel jeder Feld-Einheit sind frisch zufällig
(`_zerfallSchreiben`/`VdCrypto.einheitSchluessel`, `crypto.getRandomValues`). Ein Byte-Vergleich
auf der `.vivodepot`-Datei selbst wäre bei jedem Lauf rot und würde nichts messen. Verglichen wird
darum eine Schicht tiefer: der entschlüsselte Inhalt nach einem echten Rundlauf durch zwei
unabhängige Kern-Instanzen.

**Dieselbe Grenze, dieselbe Begründung, gilt für SHL** (`shlProviderPayload`, JWE mit
`crypto.getRandomValues`-Schlüssel je Aufruf) — und **`tests/shl-provider.test.js` erfüllt sie
bereits**: JWE-Struktur, Header-Felder, Rundlauf-Entschlüsselung byte-genau gegen das importierte
Original. Diese Datei dupliziert das nicht — SHL ist bewusst ausgelassen, mit Verweis auf die
bestehende Probe.

### Was ausdrücklich nicht gebaut wird — benannt, nicht behoben

- **Vier andockbare Register ohne Modul-Übung**: die geteilte Fixture (`tests/fixtures/
  referenzdepot.js`) dockt kein `bereichsModule`/`situationsModule`/`ereignisAchseModule`/
  `institutionsArten`-Modul an. Diese Datei prüft darum nur den KERN-Zustand dieser vier
  Register (leer), nicht ihr Verhalten mit echtem Inhalt. Bewusst NICHT durch Erweitern der
  geteilten Fixture behoben (04.09.2026): Neu-Einfrieren einer geteilten, von
  mehreren Proben genutzten Baseline ist die eine Operation, die einen echten Unterschied still
  mitfrieren kann. Wer eines dieser Register anfasst, baut einen eigenen, engen Vorher/Nachher-
  Beweis außerhalb dieser Fixture (s. Begleitbericht).
- **`renderNotfall()`/`renderZusammenstellen()`** — eigene Bildschirme, kein Sektor, darum weder
  von `render-charakterisierung.test.js` noch von dieser Datei erfasst.
- **`_institutionFelder`** (Institutions-Anlege-Dialog) — kein Teil von `renderSektor`.
- **Erbschein-Ausgabe** (`_logikModulGenerator`/`erbscheinAuszugXML`) — eigener,
  Template-getriebener Mechanismus.
- **`vivodepot-schluessel-teilen.html`** — eigenständige Datei, kein `load-kern`-Äquivalent,
  eigener Bauaufwand.
- **SHL-Sendeweg jenseits von `shlProviderPayload`** (`shlDateiHochladen`/`shlProviderErzeugen`) —
  kein bestehendes Verhalten zum Einfrieren: `shlDateiHochladen` wirft unbedingt („TODO: Host
  offen, xShare-Klärung", U2-ADR-047). Eine Empfangs-/Import-Richtung existiert nicht.

Hier nur benannt, damit die nächste Änderung an einer dieser Stellen nicht blind ist.

### NACHTRAG (06.09.2026): eine dritte Nicht-Determinismus-Quelle — Kalenderdatum, nicht Zufall

Die beiden oben (§Verifikation) genannten `uuidV4()`-Quellen waren nicht die einzigen. Am
06.09.2026, dem ersten Kalendertag nach dem Einfrieren, wurde die Datei rot: `data.logikModule[0]`
(der ab-Werk eingelassene Erbschein-Baustein, U2-ADR-288) trägt `eingelassenAm:
heuteLokal(new Date())` — ohne ein injizierbares „jetzt" (anders als die Exportkanäle, die
`FESTER_ZEITPUNKT` entgegennehmen). Die Baseline fror das ECHTE Kalenderdatum des Freeze-Tages
ein (`"2026-09-05"`); ein Lauf am Folgetag lieferte zwangsläufig `"2026-09-06"` — eine Baseline,
die ein Live-Datum einfriert, ist konstruktionsbedingt genau einen Tag haltbar.

**Entschieden (06.09.2026): normalisieren, nicht neu
einfrieren.** Ein Neufreeze verschiebt denselben Fund nur um 24 Stunden und erzieht dazu, den
Wächter zu übergehen. `maskiereEingelassenAmTief` (derselbe Aufbau wie `maskiereUuidsTief`) ersetzt
NUR den Schlüssel `eingelassenAm`, namentlich — keine pauschale Datums-Maske: ein inhaltliches
Datum (Fristen, Gültigkeiten, Geburtsdaten) bleibt scharf vergleichbar, das ist ausdrücklich
geprüft (`[Rot-Beweis] maskiereEingelassenAmTief maskiert NUR eingelassenAm, sonst nichts`), ebenso
die Gegenprobe, dass eine geänderte `eingelassenAm` allein NICHT mehr rot färbt
(`[Gegenprobe] eine geänderte eingelassenAm ALLEIN färbt den Golden-Master nicht mehr rot`). Die
beiden bereits gefrorenen Stellen in der Baseline-Datei selbst wurden retroaktiv auf denselben
Platzhalter (`<normalisiert>`) korrigiert — kein Neufreeze, nur Konsistenz mit der neuen Maskierung.

Gesucht und NICHT gefunden (Auflage „such nach Geschwistern"): kein weiteres Live-Datum,
keine weitere Nicht-UUID-Zufallskennung in der gesamten Baseline außerhalb der bereits bekannten
zwei UUID-Quellen und dieser einen `eingelassenAm`-Stelle.

## Verifikation

Vorprüfungen (dieselbe Regel wie Render-Charakterisierung: die Aufnahme muss überhaupt etwas
belegen, nicht nur „zwei leere Objekte sind gleich"): zehn Exportkanäle liefern ein Ergebnis, die
PDF-Modelle tragen echten Inhalt (>50 Zeilen im Gesamt-Modell), der Datei-Rundlauf liefert ein
vollständiges Depot. Rot-Beweise: eine echte Feldänderung, ein neuer unbekannter Schlüssel, ein
verschwundener Schlüssel, eine Datenänderung nach dem Rundlauf, und dass die ICS-Normalisierung
NUR `DTSTAMP`/`DTSTART` maskiert (UID/SUMMARY bleiben roh, positiv geprüft).

**Real gefahren, zweimal, gegen Kanon `e097a5da` (v545).** Der erste Lauf (`node --check` war
nicht die Feuerprobe — der erste echte Lauf war es) deckte zwei eigene Test-Fehler auf, BEIDE
behoben, BEIDE im Begleitbericht benannt: (1) `notfallKernModell()` liefert die Zeilen als
Array direkt zurück, kein `{zeilen:[...]}`-Umschlag — eigene Fehlannahme, korrigiert; (2)
`export-ics-vorsorge` war plausibel, aber leer (derselbe, extern schon einmal diagnostizierte
Befund) — der Fixture-Aufbau ruft jetzt `instrumentDokumentNachtragen()` nach, wie der reale
UI-Weg es tut. Der zweite Lauf (gegen die eigene, frisch eingefrorene Baseline) deckte zwei
weitere, echte Nicht-Determinismus-Quellen auf, die der erste Lauf allein nicht zeigen konnte:
zwei unabhängige `uuidV4()`-Quellen (FHIR-IPS-Bundle-Identifier, `dokumentAusStandard()`-Ids in
der ICS-`UID`-Zeile) — maskiert, dieselbe eng gefasste Technik wie in `render-charakterisierung.
test.js`; und dass `depotLaden()` nicht nur entschlüsselt, sondern auch `depotNormalisieren()`
fährt — der Datei-Rundlauf normalisiert seither `vorher` auf denselben Stand, den `nachher`
ohnehin durchläuft, sonst hätte die Probe Schema-Migration mit Krypto-Datenverlust verwechselt.
**Danach zwei aufeinanderfolgende, saubere 10/10-Läufe** — Baseline steht, reproduzierbar.

## Konsequenzen

**Positiv.** Drei bisher ungemessene Ausgabewege sind jetzt gegen eine eingefrorene Grundlinie
gehalten, bevor Paket 5 beginnt. Zwei wiederkehrende Muster sind benannt und wiederverwendbar:
additive Gegenzeichnung statt Toleranzregel, und „wo Zufall im Spiel ist, eine Schicht tiefer
vergleichen" (zweimal angewandt: Datei-Rundlauf und — durch Verweis — SHL).

**Negativ/offen.** Die vier andockbaren Register bleiben modul-seitig ungemessen; wer sie anfasst,
braucht einen eigenen Beweis. Mehrere Ausgabewege (Notfall-/Zusammenstellen-Bildschirm,
Institutions-Dialog, Erbschein, `vivodepot-schluessel-teilen.html`) bleiben ganz außerhalb dieser
Probe. Der SHL-Sendeweg ist nicht funktionsfähig (offener TODO, eigene ADR-Spannung
U2-ADR-044/047) — das ist keine Folge dieses ADRs, sondern ein vorgefundener, unveränderter
Zustand.
