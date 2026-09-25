# U2-ADR-066 — Patientenverfügung: BMJ-Textbaustein-Wizard + Dokument-Generator

**Datum:** 10.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 10.07.2026 (Suite 1224/0, VdCrypto-Block-Pin `8d31c678…` + JWS-Block `d0541ea7…` byte-identisch, Firefox-Vollverifikation grün; Annahme = Produktentscheidung).
**Status heute:** teilweise überholt durch U2-ADR-100 (nur Organspende). Punkt 3 (pvwiz schreibt ausschließlich flach in `data.sektoren.vorsorge`) ist dort seit Nachtrag 5/8 abgelöst: `pv_organspende` spiegelt zusätzlich in die Instrument-Zeile `vorsorge_instrumente` (code-bestätigt, `vivodepot.html` Zeile ~24502/24671). Die übrigen 27 `PV_BMJ`-Bausteine, der Dokument-Generator und `pvwiz.ziel` selbst bleiben unverändert flach (Code-Kommentar Zeile ~24492 bestätigt den in Nachtrag 8 festgehaltenen Wortlaut).
*(Nachtrag 29.08.2026, ADR-Lücken-Prüfung: derselbe Formatierungs-Grund wie bei U2-ADR-062 — der Nachfolger stand bereits da, nur nicht im ersten Satz. Umformuliert, kein neuer Inhalt.)*
**Nummer:** U2-ADR-066 (höchste belegte in `docs/adr/` war U2-ADR-065).
**Typ:** Feature (Bereich 8 / Vorsorge) — eine Wortlaut-Quelle `PV_BMJ`, pvwiz-Umbau, neuer PV-Dokument-Generator (Zusammensteller) + druckbares Dokument (Print-CSS/Overlay). **Additive `pv_*`-Felder, KEIN Schema-Bump.**
**Bezug:** U2-ADR-064/065 (refMehrfach / Personen im Vorsorge-Bereich) · U2-ADR-045 (Verwaisungs-Regel) · Wizard-Maschine (Teil 2) · interner Bauauftrag „PV-Wizard BMJ" vom 10.07.2026 (nicht Teil dieses Repos).

---

## Kontext

Die bisherige Patientenverfügung (pvwiz) beruhte auf einer schwachen 4-stufigen „Grundhaltung"
(`patientenverf_haltung`) plus zwei Freitext-Feldern (`patientenverf_wunsch`, `palliativ_wunsch`) und einer
einfachen Organspende-Auswahl. Das hält einen groben Willen fest, ist aber **keine ausformulierte, wirksame
Verfügung** und deckt die vom Bundesministerium der Justiz (BMJ) empfohlenen Situations-/Maßnahmen-Bausteine
nicht ab. Das BMJ stellt hierfür amtliche **Textbausteine** bereit und warnt ausdrücklich: falsch oder
widersprüchlich zusammengesetzte Bausteine können die Verfügung **unwirksam** machen.

Auftrag (Phase 2): den vollen BMJ-Wizard bauen — Erfassung **und** einen Dokument-Generator, der aus
den gewählten Bausteinen ein druckbares, unterschriftsreifes Dokument im **amtlichen Wortlaut 1:1**
zusammenstellt. Read-only-Checkpoint vorab ergab: Schema ist informativ (kein Lade-Gate), `sektorFeldSetzen`
hat keine Whitelist → neue optionale Felder sind additiv (kein Bump); der Dokument-Generator ist netto-neu
(die App erzeugte Dokumente bisher nur via jsPDF, es gab keine Print-CSS-Schicht).

## Entscheidung

1. **Eine Wortlaut-Quelle `PV_BMJ`** (frozen) hält die amtlichen BMJ-Bausteine: `steps` (Schritt-Metadaten +
   Feld-Definition mit `optionen[].label` = amtlicher Text, zugleich Wizard-Anzeige **und** Dokument-Baustein)
   plus die festen Klauseln (Eingangsformel, Verbindlichkeit, Reichweite/Widerruf, Schlussbemerkungen,
   Organspende-Vorrang-Übergang, ärztliche Bestätigung). Wizard **und** Generator schöpfen aus derselben
   Quelle → „Wizard = erzeugtes Dokument, Wortlaut 1:1" ist per Konstruktion erfüllt.

2. **pvwiz** wird aus `PV_BMJ.steps` gespeist (`...PV_BMJ.steps.map(...)`), gerahmt von den Vivodepot-Meta-
   Schritten (Gate „vorhanden?", Ablageort, ärztliche Begleitung). Ein Feld pro Schritt (Engine-Vertrag); die
   „nur-wenn"-Sub-Felder werden — wie bei `organspende_einschraenkung` etabliert — sichtbar mit Hilfetext
   gezeigt, der Generator wertet die Bedingung aus. Die BMJ-Situationen sind `mehrfachauswahl`; Beistand und
   Schweigepflicht sind `refMehrfach` (Personen-Chip-Input).

3. **Verwaisung** der alten Felder (`patientenverf_haltung`, `patientenverf_wunsch`, `palliativ_wunsch`,
   `organspende`/`organspende_einschraenkung`): bleiben lesbar (Bestandsdaten), werden vom Wizard **nicht mehr
   geschrieben**. Keine Migration, kein Schema-Bump (U2-ADR-045-Regel). Die neuen `pv_*`-Felder schreiben in
   denselben Store `data.sektoren.vorsorge` wie die manuelle Eingabe — kein paralleles Modell.

4. **Dokument-Generator = reiner Zusammensteller.** `pvDokumentAbschnitte()` ordnet ausschließlich die
   **gewählten** Bausteine der amtlichen BMJ-Reihenfolge zu (Eingangsformel → Situationen → Maßnahmen mit
   vorangestelltem Bezugssatz „In den oben beschriebenen Situationen wünsche ich," → Ort/Beistand/
   Schweigepflicht → Verbindlichkeit/Reichweite/Widerruf → weitere Verfügungen (Verweis auf bestehende
   Vollmacht/Betreuungsverfügung, keine Duplikation) → Wertvorstellungen → Organspende → Schlussbemerkungen →
   Gültigkeit). **Kein freier Text, keine erfundenen Überleitungen**; Sentinel-Optionen (`(kein Zusatz)` …)
   tragen keinen Baustein. `refMehrfach`-Personen werden über `personName()` aufgelöst.

5. **Druckbares Dokument** (`pvDokumentOeffnen`/`pvDokumentHTML`): Vollbild-Overlay mit prominentem
   Wirksamkeits-Hinweis (**ausdrucken, Ort/Datum, eigenhändig unterschreiben**), Ort/Datum-/Unterschrift-Zeile
   und dem BMJ-Feld 2.13 (ärztliche Bestätigung) als **Papier-Feld** (im Wizard nicht erzwungen). `@media print`
   blendet die App aus und druckt nur das Blatt (`window.print()`). Der Abschluss des pvwiz öffnet das Dokument
   (`abschluss.dokument === 'pv'`).

## Konsequenzen

- Die BMJ-`pv_*`-Felder liegen bewusst **nur** in der Wizard-/Generator-Schicht, nicht im manuellen Sektor-
  Formular (`felder`) — die Verfügung ist ein eigenes Dokument, keine Zeile im generischen Vorsorge-Export.
  Review/Änderung läuft über den Wizard (Schritte lesen den gespeicherten Wert vor) und das Dokument.
- Erste **Print-CSS-Schicht** der App (bisher nur jsPDF). Bewusst hochkontrastig schwarz-auf-weiß.
- Generator-Vertrag ist testgesichert: eine Situations-/Maßnahmen-Zeile im Dokument stammt **wörtlich** aus
  `PV_BMJ` (Test 3c), Sentinel wird ausgeschlossen, Bezugssatz vorangestellt.
- **Post-RC-Nachlauf (offen):** Eingangsformel-Prefill aus Personendaten (aktuell amtlicher Klammer-Platzhalter,
  Bürger trägt Name/Geburt/Wohnort auf Papier ein); Wieder-Öffnen des Dokuments aus der Sektor-Sicht (aktuell
  nur über den Wizard-Abschluss); Stichproben-Diff des Volltexts gegen die BMJ-Vorlage.

## Verifikation

- Suite **1224/0** (`node --test`); pvwiz-Tests auf BMJ nachgezogen + Generator-1:1-Test (3c) + refMehrfach-
  Wizard-Guard (6b).
- Block-Pins byte-identisch: VdCrypto `8d31c678…`, JWS `d0541ea7…`.
- **Firefox** (Playwright/Gecko) Vollverifikation: mehrfachauswahl-Situationen + refMehrfach-Beistand-Chip-Input
  speichern über den DOM; 32-Schritt-Durchlauf ohne Hänger; Abschluss öffnet das Dokument; Wortlaut 1:1,
  Sentinel weggelassen, Bezugssatz + Unterschrift-Hinweis + Ort/Datum + ärztliche Bestätigung vorhanden; keine
  Seiten-/Konsolenfehler.
- sha256 nachgezogen; SW-Cache cleanslate `v27 → v28`.

## Nachtrag 1 (10.07.2026) — Wortlaut-Korrekturen aus dem Diff gegen das BMJ-PDF

Der Read-only-Volltext-Auszug ergab drei Abweichungen vom amtlichen Wortlaut (1:1-Regel → zurück auf
das Original, reine Quelltext-Korrekturen):
1. **Organspende (2.9):** der Zustimmungs-Baustein trägt jetzt den vollen amtlichen Text (endet auf
   „… ausgeschlossen habe, dann"); die selbst formulierte Vorrang-Einleitung `organspendeVorrangEinleitung`
   ist entfernt, die gewählte Vorrang-Option schließt unmittelbar an (eine Generator-Zeile:
   `org.push(vl)` statt Einleitung+Option). Vorrang erscheint weiterhin **nur bei Zustimmung**.
2. **Verbindlichkeit (2.6):** die „besondere Bedeutung"-Rollen amtlich — „… oder …" statt „/", Punkt am
   Ende, „anderer Person: …" statt „einer anderen Person (unten benennen)". In BEIDEN Quellen synchron
   (Wizard-Option-Labels + Generator-Helfer `_pvRolleLabel`); Guard-Test sichert Option-Label == Dokument-Text.
3. **Aktualisierung (2.14):** amtlicher Platzhalter „nach Ablauf von (Zeitangabe)" statt „einer bestimmten Zeit".

Verifikation: Suite **1225/0** (neuer Test 3d deckt alle drei Korrekturen + „Vorrang nur bei Zustimmung"),
Block-Pins byte-identisch, Firefox-Vollverifikation grün (Organspende-/Rollen-Wortlaute im Dokument geprüft).
sha256 `6e1a1094…`; SW-Cache `v28 → v29`. Offen: der korrigierte Auszug wird erneut geprüft.

## Nachtrag 2 (10.07.2026) — Aktualisierungs-Frist inline in den Platzhalter (2.14)

Der Diff bestätigt den amtlichen Wortlaut. Ein Generator-Verhalten nachgezogen: die eingegebene Frist wird jetzt
**inline** in den amtlichen Platzhalter „nach Ablauf von (Zeitangabe)" eingesetzt (`l.replace('(Zeitangabe)', frist)`),
statt als eigener Satz „Die bestimmte Zeit beträgt: …" angehängt zu werden — der amtliche Baustein ist EIN Satz,
ein Zusatzsatz wäre freie Überleitung. Ohne Eingabe bleibt „(Zeitangabe)" als Papier-Platzhalter stehen.
Verifikation: Suite **1226/0** (Test 3e: inline gesetzt, kein Zusatzsatz, Platzhalter ohne Eingabe erhalten),
Block-Pins byte-identisch, Firefox-Vollverifikation grün (20/0, befristete Variante). sha256 `107504c1…`; SW `v29 → v30`.

## Nachtrag 3 (10.07.2026) — Wizard-Feinschliff: Eingangsformel-Prefill + Dokument aus der Sektor-Sicht

Die zwei Post-RC-Punkte aus der Erst-Fassung sind jetzt gebaut (kein Schema-Bump, Wortlaut-Quelle unangetastet):
1. **Eingangsformel-Prefill** (`_pvEingangsformel`): der amtliche Platzhalter „(Name, Vorname, geboren am,
   wohnhaft in)" wird aus Bereich 1 (`data.sektoren.identitaet`: `vorname`/`nachname`/`geburtsdatum`/`strasse`/
   `plz_ort`) gefüllt, soweit vorhanden — Geburtsdatum lesbar (TT.MM.JJJJ via `_datumTeile`). Bei fehlenden
   Daten bleibt der Platzhalter (Fallback); Teildaten füllen nur das Vorhandene. Kein Zwang — Quelle sind die
   frei änderbaren Identitäts-Felder. Ergebnis: „Ich Vorname Nachname, geboren am …, wohnhaft in … bestimme hiermit …".
2. **Dokument aus der Vorsorge-Sektor-Sicht** (`_pvHatDaten` + Knopf `data-pv-dokument`): das erzeugte PV-Dokument
   ist nicht mehr nur über den Wizard-Abschluss erreichbar, sondern über einen „als Dokument ansehen/drucken"-Knopf
   im Vorsorge-Bereich, der erscheint, sobald mindestens ein `pv_*`-Feld gesetzt ist (dasselbe Druck-Overlay
   `pvDokumentOeffnen`, unabhängig vom Schreibrecht — Ansehen/Drucken ist keine Schreibaktion).

Verifikation: Suite **1228/0** (Tests 3f Prefill/Fallback/Teildaten, 3g Sektor-Knopf mit/ohne PV-Daten; load-kern
exportiert `_pvEingangsformel`/`_pvHatDaten`). Block-Pins byte-identisch. Firefox: beide Punkte end-to-end grün
(Knopf sichtbar → Klick öffnet Overlay ohne Wizard-Abschluss; Prefill vollständig, Fallback erhalten; keine
Seitenfehler) + voller Durchlauf weiter 20/0. sha256 `0f1c7b7f…`; SW `v30 → v31`.

Hinweis zur Namens-Reihenfolge: der Prefill schreibt „Vorname Nachname" (natürliche Anrede im Satz), nicht die
Formular-Listung „Name, Vorname" — bei Bedarf trivial umstellbar.

## Nachtrag 4 (22.07.2026) — Auslieferung im v1.0 ohne anwaltliche Freigabe

**Entscheidung der Geschäftsführung.** Das zusammengesetzte Patientenverfügungs-Dokument
wird im **v1.0 ausgeliefert, ohne** vorherige anwaltliche Freigabe. Die Absicherung erfolgt über die
**textlichen Vorkehrungen im Dokument selbst**, die genau zu diesem Zweck gebaut wurden: der Generator ist
ein reiner Zusammensteller amtlicher BMJ-Bausteine (kein freier Text, Herkunftsanzeige durchgängig), und
das Dokument trägt den unübersehbaren Wirksamkeits-Hinweis (ausdrucken, mit Ort und Datum versehen,
eigenhändig unterschreiben) sowie die optionale ärztliche Bestätigung — s. Entscheidung oben und
Nachträge 1–2 (amtlicher Wortlaut, drei sinnverändernde Abweichungen korrigiert).

**Warum das hier steht.** Diese Entscheidung existierte bis zum 22.07.2026 nur als Gesprächsergebnis. Der
Kassensturz führte die „anwaltliche Freigabe" bis dahin als offenen Posten auf dem kritischen Pfad zu v1.0.
Ohne Eintrag im ADR stellt später jemand dieselbe Frage erneut — genau das Muster „Entscheidung am falschen
Ort" (Forschungstagebuch 21.07.). Festgehalten, damit die Auslieferungs-Entscheidung und ihre Begründung
(Bau-seitige textliche Vorkehrungen statt externer Freigabe) an der Stelle steht, an der die rechtliche
Grundlage des PV-Dokuments dokumentiert ist.

**Konsequenz für den Restaufwand:** Die anwaltliche PV-Freigabe ist vom kritischen Pfad zu v1.0 genommen.
Block III (extern) schrumpft auf den NGI-Zero-Krypto-Review des Angehörigen-Caches, der v1.0 nicht blockiert
(Angehörigen-Modus geht bis dahin als Beta). Damit wird v1.0 von keinem externen Balken mit stehender Uhr
mehr gehalten.

**Nicht Gegenstand dieses Eintrags:** die inhaltliche juristische Bewertung der textlichen Vorkehrungen.
Der ADR hält die Entscheidung und ihre genannte Grundlage fest; die Verantwortung dafür liegt bei der
Geschäftsführung.

## Nachtrag 5 (09.08.2026) — Punkt 3 wird am Organspende-Punkt abgelöst (Widerspruch zu U2-ADR-100 §1)

**Der Befund.** Punkt 3 (oben) legt fest, dass pvwiz ausschließlich flache `pv_*`-Felder schreibt und
die alten Felder verwaist zurücklässt — nirgends ist eine Instrument-Zeile in `vorsorge_instrumente`
als Wizard-Schreibziel vorgesehen. U2-ADR-100 §1 (24.07.2026, zwei Wochen später) legt fest: „Alle
Vorsorge-Instrumente liegen als Zeilen in `vorsorge_instrumente`." §2 bestätigt ausdrücklich, dass
`pvwiz` bleibt — gerade WEIL er ein Dokument erzeugt, nicht nur Felder spiegelt. Damit widersprachen
sich beide Beschlüsse an genau diesem Punkt: der eine hält pvwiz auf reines Flachfeld-Schreiben fest,
der andere verlangt, dass jedes Vorsorge-Instrument — pvwiz eingeschlossen — eine Zeile am einen Ort
trägt. **Keiner der beiden ADRs nannte den anderen.** U2-ADR-100 zählt `pvwiz` unter „Bleibt", ohne zu
prüfen, ob sein bestehender Schreibweg §1 überhaupt erfüllt; U2-ADR-066 wurde beim Vorsorge-Umbau nicht
revidiert. Der Widerspruch blieb unbemerkt, bis der Wächter W-5 (Auftrag N1, 08.08.2026) ihn als
strukturellen Fund aufdeckte: `pvwiz` bildet laut `WIZARD_DOKUMENT_MAP` das Instrument
„Patientenverfügung" ab, legt aber nie eine Zeile an.

**Die Ablösung — nur an diesem einen Punkt.** Auftrag „W-8 Doppelerfassung" (09.08.2026, Zug 3),
auf Produktentscheidung vom selben Tag hin, gleicht pvwiz an U2-ADR-100 §1 an: der
Organspende-Schritt (`pv_organspende`) schreibt zusätzlich — nicht ersetzend — in die
`vorsorge_instrumente`-Zeile (`typ:'patientenverfuegung'`, Unterfeld `organspende`, Abbildung
zweiwertig auf vierwertig: zustimmung→ja, ablehnung→nein). `PV_ORGANSPENDE_BRUECKE` (der bisherige
Leseweg zwischen den beiden Werten) entfällt ersatzlos. Bestandsdaten werden nicht rückwirkend
migriert (kein Schema-Bump, Verwaisungs-Regel U2-ADR-050) — erneutes Durchlaufen des unveränderten
Schritts befüllt die Zeile nachträglich.

**Was Punkt 3 an den übrigen 27 `pv_*`-Feldern weiterhin trägt.** Nur die Organspende ist an ein
eigenständiges Vorsorge-Instrument mit eigener Zeile gekoppelt (§1 von U2-ADR-100 meint das
PV-Dokument als Ganzes, nicht seine 28 Bausteine einzeln). Behandlungssituationen, Maßnahmen,
Beistand, Schweigepflicht, Widerruf, Wertvorstellungen bleiben Bausteine des amtlichen Dokuments ohne
eigene Instrument-Zeile — Punkt 3 gilt für sie unverändert fort. Punkt 1, 2, 4, 5 dieses ADRs (eine
Wortlaut-Quelle `PV_BMJ`, Generator als reiner Zusammensteller, druckbares Dokument) sind von dieser
Ablösung nicht berührt: `pv_organspende` bleibt das flache Feld, aus dem der Generator unverändert
liest.

Verifikation: Node 2990/2990, Konformität 46/46, E2E 85/85; zusätzlich real per Playwright (Chromium)
gegen die globalen Wizard-Funktionen der laufenden Seite geprüft (Instrument-Zeile entsteht live, der
flache Wert bleibt für den Generator erhalten, `PV_ORGANSPENDE_BRUECKE` ist als globaler Name nicht
mehr vorhanden). Commit `f553307`. SCHALEN_STAND/CACHE `v121 → v122`.

## Nachtrag 6 (09.08.2026) — VdCrypto-Block-Pin geändert: `8d31c678…` → `1182dc89…`

**Auftrag „Die Base64-Grenzen"** (09.08.2026). Der Block-Pin, den dieser ADR als
byte-identisches Abnahmekriterium nennt (s. Kopf und Verifikationsabschnitte oben — dort
unverändert stehen gelassen, als historisch korrekter Stand zum jeweiligen Zeitpunkt), ist
nicht mehr aktuell. Der Nachtrag hält fest, was sich geändert hat und warum.

**Befund (Zug 0, gemessen, nicht übernommen):** `encryptData` (innerhalb des Blocks) kodierte
den Ciphertext über `Array.from(new Uint8Array(ciphertext), c => String.fromCharCode(c)).join('')`
— ein Ein-Zeichen-String-Objekt je Byte. Bei einem Depot ab ~90–100 MB (Hinweis aus der
Entwicklungsumgebung) war das ungemessen. Real gemessen: Chromium und Node scheitern ab
**~129 MB** mit `RangeError: Invalid array length`; Firefox erst ab **~270 MB**, dort als rohe
Zeichenkette `"out of memory"` geworfen — kein `Error`-Objekt. Zwanzig Fotos üblicher
Handygröße in der Mappe (40–160 MB) erreichen den Chromium-Kipppunkt direkt — **im Alltag der
Zielgruppe erreichbar**, die im Abwesenheits-Regelwerk für diesen Auftrag gesetzte Schwelle.

**Was bereits vor diesem Zug griff:** ein gescheiterter `encryptData`-Aufruf während eines
Speicherversuchs lief schon in `speichernOderFehlschlagMarkieren()`s generisches `catch` (aus
dem Auftrag „Der Speicherweg ohne Datei-Picker", 09.08.2026) — die Kopfzeile zeigte den
Zustand „fehlgeschlagen", kein stiller Absturz, kein Datenverlust. Die Behebung hier schließt
die Ursache, nicht nur ihre Sichtbarkeit.

**Die Behebung:** `Array.from(...).join('')` ersetzt durch eine neue Funktion
`_bytesAlsBinaerstring` — blockweise Umwandlung (`String.fromCharCode.apply` über feste
8192-Byte-Blöcke, aneinandergefügt). Byte-identisch zum alten Verfahren über den gesamten
gemessenen Größenbereich (0 bis 200 MB, inklusive der alten Bruchstelle bei 130 MB) —
`tests/vdcrypto-block-base64-chunking.test.js`. Nebenbefund: die neue Fassung ist bei 130 MB
auch deutlich schneller (~580 ms gegen die alte Bruchstelle, wo das alte Verfahren gar nicht
mehr zurückkehrte).

**Was NICHT angefasst wurde — mit Begründung, nicht stillschweigend:** `bytesToBase64`
(dieselbe Datei, `apply()` ohne Chunking) trägt dieselbe Klasse Schwäche, aber mit einer viel
niedrigeren Argumentzahl-Grenze (~123 KB Chromium/Node, ~500 KB Firefox statt ~129/270 MB) —
**S18** im selben Auftrag. Ihr einziger Ciphertext-Aufrufer ist der Stufe-2-Angehörigen-Cache
(U2-ADR-062); die Cache-Größe wuchs erst ab ~300 sehr ausführlichen „Menschen"-Einträgen über
diese Grenze (gemessen, `angehoerigenCacheModell()` synthetisch befüllt) — **nicht im Alltag
der Zielgruppe erreichbar**, anders als S17. Nach Auftragslage („ist die Bedingung nicht
erfüllt, wird nicht gebaut") bleibt `bytesToBase64` unverändert; die Grenze steht im Register
(S18) statt im Code behoben zu sein.

**Wichtige Korrektur am Auftragswortlaut, hier festgehalten, nicht stillschweigend
übernommen:** Der Auftrag „Die Base64-Grenzen" ging davon aus, `bytesToBase64`
(S18) liege **außerhalb** des gepinnten VdCrypto-Blocks („U2-ADR-062 sagt es ausdrücklich") und
sei darum billig zu beheben. Das stimmt für den Angehörigen-Cache-KRYPTO-PFAD (eigener
PBKDF2/AES-GCM-Weg, tatsächlich außerhalb, U2-ADR-062 §2) — nicht aber für die Funktion
`bytesToBase64` selbst: sie steht, gemessen, physisch **innerhalb** von Script 1
(`vivodepot-krypto-kern-PORT-VERBATIM.js` Zeile 226) und wäre bei einer Änderung genauso
pin-relevant wie `encryptData`. Der Grund, S18 hier dennoch nicht zu beheben, ist darum
ausschließlich die fehlende Alltags-Erreichbarkeit — nicht die (falsch angenommene)
Pin-Freiheit.

**Vier Komponenten, ein Pin (U2-ADR-098):** derselbe Block liegt byte-identisch in
`vivodepot.html`, `vivodepot-lesen.html`, `vivodepot-vc-issuer.html` und
`vivodepot-template-generator.html` sowie in der kanonischen Referenz
`vivodepot-krypto-kern-PORT-VERBATIM.js` — alle fünf wurden identisch geändert und erneut
gegeneinander sowie gegen den neuen Hash geprüft (`tests/e2e-cross/T-CROSS-07-krypto-block-gate.test.js`).

**Alter Pin:** `8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258`.
**Neuer Pin:** `1182dc894be5d7cc8487f68889b32df7171e3327f4c913129dc7f88f3e7c63d0`.

Verifikation: Node 3030/3030, Konformität 46/46, E2E 86/86 (bekannter, unabhängiger Flake in
`n5-scroll-erhalt.spec.js` Fall 3, isoliert grün), Cross-Component-Gates 8/8
(`npm run test:cross:gates`, inkl. T-CROSS-07 gegen den neuen Hash). SCHALEN_STAND/CACHE
`v125 → v126`.

## Nachtrag 7 (10.08.2026) — VdCrypto-Block-Pin geändert: `1182dc89…` → `612357e7…`

**Auftrag „S16 und S18"** (09./10.08.2026). Zweiter Pin-Wechsel desselben Tages (Auftrag
lief über den Tageswechsel), an derselben Stelle wie der erste (Nachtrag 6), damit die Kette
lesbar bleibt.

**Der in Nachtrag 6 als „nicht angefasst, mit Begründung" geführte Fund (S18) ist jetzt
gebaut.** `bytesToBase64` (dieselbe Datei, physisch innerhalb von Script 1, Zeile 226) trug
weiterhin `String.fromCharCode.apply(null, arr)` über das gesamte Array — dieselbe Schwäche
wie S17s `encryptData`, aber mit einer viel niedrigeren Bruchstelle: `Function.prototype.apply`
begrenzt selbst die Argumentliste, nicht erst die Array-Länge. Gemessen (Base64-Grenzen-
Bericht, 09.08.2026): Chromium/Node scheitern ab ~123–124 KB, Firefox ab ~500 KB.

**Warum jetzt gebaut, obwohl der Angehörigen-Cache im Alltag der Zielgruppe nicht erreichbar
ist (Nachtrag 6, unverändert gültig):** der Pin ist mit S17 bereits einmal gewandert, das
Verfahren ist dokumentiert und eingeübt. Eine bekannte Klippe, die v1 überlebt, bleibt danach
für immer — nach v1 bekommt die Datei ihre Prüfsumme am Release-Commit und wird nicht mehr
angefasst (Produktentscheidung, Entscheidungsvorlage „Nach zehn Aufträgen", 09.08.2026).

**Die Behebung:** `bytesToBase64` ruft jetzt dieselbe, bereits vorhandene und bereits geprüfte
`_bytesAlsBinaerstring` (S17) statt der eigenen `.apply`-Zeile — kein zweiter
Chunking-Algorithmus, dieselbe 8192-Byte-Blockgröße. Byte-identisch zum alten Verfahren belegt
(`tests/s18-bytes-to-base64-chunking.test.js`, 0 Byte bis 500 KB, inklusive der alten
Bruchstelle) und übersteht 200 KB bis 1 MB (der Firefox-Kipppunkt eingeschlossen).

**Fünf Träger, ein Pin (U2-ADR-098, wie Nachtrag 6):** `vivodepot.html`,
`vivodepot-lesen.html`, `vivodepot-vc-issuer.html`, `vivodepot-template-generator.html` und die
kanonische Referenz `vivodepot-krypto-kern-PORT-VERBATIM.js` — alle fünf über ein Skript
identisch geändert (Gleichbehandlung garantiert, nicht nur behauptet) und erneut
gegeneinander sowie gegen den neuen Hash geprüft
(`tests/e2e-cross/T-CROSS-07-krypto-block-gate.test.js`).

**Alter Pin:** `1182dc894be5d7cc8487f68889b32df7171e3327f4c913129dc7f88f3e7c63d0`.
**Neuer Pin:** `612357e7f7d14ac0de5af7ca559dc3fcc013fa664eb134f4783dbf3348d3d4a4`.

Verifikation: Node 3153/3153, Konformität 46/46 (inkl. `offline-garantie.mjs`, dreimal in
Folge stabil grün, s. u.), E2E 86/86 (bekannter, unabhängiger Flake in
`n5-scroll-erhalt.spec.js` Fall 3, isoliert grün), Cross-Component-Gates 8/8
(`npm run test:cross:gates`, inkl. T-CROSS-07 gegen den neuen Hash), `test:e2e:cross` 14/16
(zwei bekannte, unabhängige, vorbestehende Fehlschläge in
`T-CROSS-11-mobile-a2-lesbarkeit.spec.js`, Topbar-Overflow bei 320/375 px, mit Base64/Krypto
nicht verwandt). SCHALEN_STAND/CACHE `v141 → v142`.

## Nachtrag 8 (11.08.2026) — Punkt 3 ist an EINER Stelle überholt: U2-ADR-100 gewinnt

**ÜBERHOLT, nicht mehr gültig:** Punkt 3 oben („`pvwiz.ziel` bleibt flach, `pv_*`-Felder
schreiben ausschließlich in `data.sektoren.vorsorge`") kollidierte seit U2-ADR-100 (24.07.2026,
„die Instrument-Liste ist der EINE Ort für ein Vorsorge-Instrument") mit einem später
angenommenen ADR, ohne dass eines der beiden das andere nannte — der eigentliche Grund, warum
`pvwiz` bis heute keine Instrument-Zeile anlegte (W-5) und eine vollständig durchlaufene
Patientenverfügung im Depot „nicht hinterlegt" blieb.

Volle Herleitung, Optionen und die Produktentscheidung: interner Auftrag „pvwiz und die
ADR-Kollision" (10.08.2026) und die zugrundeliegende interne Entscheidungsvorlage vom 09.08.2026
(beide nicht Teil dieses Repos). Volle Umsetzung: **U2-ADR-132**.

**Was an Punkt 3 bleibt, was nicht:** Die 27 amtlichen BMJ-Bausteine schreiben weiterhin flach
in `data.sektoren.vorsorge` — dieser Teil von Punkt 3 gilt unverändert, der Dokument-Generator
bleibt unangetastet (golden-fixture-abgesichert). Überholt ist allein die Aussage, `pvwiz.ziel`
selbst trage kein Listen-Ziel — es trägt seit U2-ADR-132 `{sektor, liste, typ}` wie `kiwiz`
(U2-ADR-096 Block E), nur dass die einzelnen BMJ-Schritte ihr eigenes flaches Schritt-Ziel
behalten und damit unverändert in den Sektor schreiben.

---

## Nachtrag 9 (19.08.2026) — VdCrypto-Block-Pin geändert: `612357e7…` → `f0f88502…`

**Auftrag „der Krypto-Block-Wechsel"** (19.08.2026), Zug 1. Dritter Pin-Wechsel, an derselben
Stelle wie die zwei vorigen, damit die Kette lesbar bleibt.

**Was diesmal geändert wurde, und warum es eine andere Sorte Änderung ist als Nachtrag 6 und 7:**
S17 und S18 haben denselben Algorithmus anders geschrieben — byte-identische Ausgabe, nur ohne
Klippe. Dieser Wechsel fügt dem Block **neue Primitiven** hinzu: den Zerfall des Depot-Inhalts in
Feld-Einheiten (Krypto-Generation 4, Produktentscheidung vom 18.08.2026, s. A331–A334).

**Die drei Bausteine, jeder mit eigenem Grund:**

1. **Pseudonyme Adressen** (`deriveAdressKeyV4`, `feldAdresseV4`) — HMAC-SHA256 über den
   Feldnamen unter einem eigenen, aus demselben Master abgeleiteten Adress-Schlüssel, auf 16 Byte
   gekürzt. Ohne sie verriete die Datei OHNE JEDES PASSWORT, welche Felder ausgefüllt sind. Der
   Info-Pfad `vivodepot/v4/adressen/` ist domain-separiert und präfixfrei gegen
   `vivodepot/v3/depot/`.
2. **Der Name reist IN der Einheit mit** (`{name, wert}`) — nur so ist die Pseudonymisierung eine
   Eigenschaft der DATEI und nicht der Laufzeit; Migrationskette, Blackbox-Export und
   `depotNormalisieren` arbeiten weiter auf dem entschlüsselten `data`.
3. **Die AAD bindet die Einheit an ihren Platz** (`_aadEinheitV4`) — `_AAD_DEPOT_V2` identifiziert
   keine Einheit; ohne `depotUUID` und Adresse in der AAD liesse sich der Ciphertext einer Einheit
   an die Stelle einer anderen legen und entschlüsselte fehlerfrei (A331).

**`_AAD_DEPOT_V2` ist UNVERÄNDERT.** Die neue Konstante tritt daneben, sie ersetzt nichts — darum
sind Lese-App, VC-Issuer und Template-Generator über die Propagation hinaus **nicht** betroffen.

**`KRYPTO_VERSION_ALLOWLIST` `[3]` → `[3, 4]`.** v3 bleibt der RÜCKWEG, nicht nur ein
Migrationsweg (Auflage A2 zum Bauauftrag). `CRYPTO_VERSION_AKTUELL` bleibt 3; die neue Generation
trägt die eigene Konstante `CRYPTO_VERSION_ZERFALL = 4`.

**Zwei Klasse-A-Wächter haben beim Wechsel geklemmt, und sie hatten recht — geändert wurde der
CODE, nicht der Wächter:**

- `u2-062-geheime-schluessel-nie-extrahierbar`: der Entwurf importierte den entwickelten
  Inhaltsschlüssel mit `extractable: true` und den Nutzungen `['encrypt','decrypt']`. Auf dem
  Lese-Weg wird er nur zum Entschlüsseln gebraucht — jetzt `false` und `['decrypt']`.
- `G13-Kein-Export` (`tests/konformitaet/kein-master-key.mjs`): der Entwurf erzeugte den
  Inhaltsschlüssel mit `generateKey(…, true, …)` und holte die Bytes mit
  `crypto.subtle.exportKey` wieder heraus. Jetzt entsteht der Schlüssel als **rohe Zufallsbytes**,
  wird **nicht extrahierbar** importiert (`['encrypt']`), und **gewickelt werden die Bytes, nicht
  der Schlüssel** — sie werden unmittelbar nach dem Wickeln überschrieben. `exportKey` kommt im
  Kern damit weiterhin **nirgends** vor, und es existiert zu keinem Zeitpunkt ein extrahierbarer
  Schlüssel im Browser.

**Fünf Träger, ein Pin (U2-ADR-098, wie Nachtrag 6 und 7):** `vivodepot.html`,
`vivodepot-lesen.html`, `vivodepot-vc-issuer.html`, `vivodepot-template-generator.html` und die
kanonische Referenz `vivodepot-krypto-kern-PORT-VERBATIM.js` — über ein Skript identisch geändert
und danach gegeneinander sowie gegen den neuen Hash geprüft. **Neu und dauerhaft:**
`tools/krypto-block-propagation-pruefen.js` (W-krypto-propagation, A338) prüft die
VOLLSTÄNDIGKEIT der Propagation, ohne eine Liste zu kennen — er geht das Repo ab.

**Der unabhängige Harness kennt die neuen Primitiven** (`tools/independent-krypto-harness.js`,
24 → 59 Prüfungen): HMAC-SHA256 gegen die normativen Vektoren aus **RFC 4231** §4 (TC1–TC4, TC6,
TC7, über zwei Engines), Adress-Determinismus, die Trennung Adress- gegen Inhaltsschlüssel, die
erweiterte AAD samt Vertauschungsprobe, und die Nicht-Extrahierbarkeit auf beiden Wegen.

**Alter Pin:** `612357e7f7d14ac0de5af7ca559dc3fcc013fa664eb134f4783dbf3348d3d4a4`.
**Neuer Pin:** `f0f8850227d8bf1a9d7f42f0f19600974e550cb422fda1651322916ea25a4e3e`.

**Was ausdrücklich NICHT Gegenstand war:** keine Migrationsstufe (sie hängt an der Entscheidung zu
A337), kein Empfängerkreis, keine Rotation der Adressen, kein Entfernen des v3-Lesepfads.
