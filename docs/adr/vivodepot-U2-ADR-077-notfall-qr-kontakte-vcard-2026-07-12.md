# U2-ADR-077 — Notfall-QR-Kodierung: Klartext → Kontakte-vCard (Option C)

**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 12.07.2026 · Suite **1345/0** · Block-Pin `8d31c678…` byte-identisch · PV-Golden 42/42 · **kein Push**
**Typ:** Sicherheits-/Datenschutz-Korrektur (Anzeige-Kodierung) + Anti-Leck — **KEIN Schema-Bump, KEIN Krypto-Byte.** SW-Cache-Bump.
**Bezug:** U2-ADR-059 (Notfall-QR / `NOTFALL_KERN_FELDER` / Bürger-Tür), U2-ADR-072 (Notfallkontakte refMehrfach) · internes Forschungstagebuch vom 12.07.2026 (nicht Teil dieses Repos) · Gedächtnis `backlog-sanitaeter-cache-feld-scope`.
**Status heute:** gilt — Beleg `tests/export-qr.test.js#u2-077a-vcard-kein-note-kein-gesundheit`.

## Kontext — ein Leck an der Plattformgrenze, aus einem nie entschiedenen Default

Der Notfall-QR (Papier-Notfallkarte + „[QR anzeigen]") trug bis hierher einen **Klartext** —
`notfallKernText()`: `"VIVODEPOT NOTFALL\n" + label: wert`-Zeilen aus **allen** gefüllten
`NOTFALL_KERN_FELDER`. Beim Scannen mit der **iPhone-Kamera** hat der Klartext **kein Handler-Ziel**;
die Kamera reicht ihn an die **Google-Websuche** weiter. Ein Ersthelfer, der scannt, schickt damit
genau die Daten an Google, die Vivodepot verspricht **niemals** abfließen zu lassen. Das ist kein
Usability-Fehler und **kein Codefehler** — der Code war korrekt; die Grenze liegt in der
Handler-Auflösung der Plattform, die keine Testsuite sieht (`node`-grün, Shell-grün, sogar
Software-BarcodeDetector-grün in ADR-072).

**Read-only-Auszählung von `NOTFALL_KERN_FELDER`:** der QR trug bei ausgefülltem Depot **vier
eindeutige Art.-9-Gesundheitsfelder im Klartext** — nicht nur Blutgruppe und Allergien, sondern
**laufende Medikamente** (codeListe `atc`) und **kodierte Diagnosen** (`krankheiten`, codeListe
`icd10`). Konkret: ein Ersthelfer, der scannt, hätte die **Diagnoseliste einer Tumorpatientin an
Google** geschickt. Kein Feld war je vom QR ausgenommen (`notfallKernText` → `notfallKernModell`,
einziger Filter „leer raus", **kein `sensibel`-Ausschluss**).

**Der Klartext war nie eine Entscheidung.** U2-ADR-059 legte die QR-*Funktion*, die *Felder* und die
*Platzierung* fest — die **Kodierung** nicht (Grep durch ADR-059 nach `klartext|vcard|url|scan|
kamera|offline`: null Treffer). U2-ADR-072 zog den QR „**unverändert**" mit. Klartext-vs-vCard-vs-URL
wurde **nie** gegeneinander abgewogen, schon gar nicht gegen „was tut eine Handy-Kamera damit". Der
Klartext ist ein **ungeprüfter Default aus dem Druck-Anwendungsfall** (menschenlesbare Zeile für die
Brieftasche), der beim Andocken eines zweiten Anwendungsfalls (Handy-Scan) lasttragend für eine
Kernzusage wurde. Drift-Klasse: „der ungeprüfte Default als stiller Vertragsbruch".

## Optionen

- **A — Ein-Block-vCard mit Medizin im `NOTE`.** Offline-sicher, aber behält die volle Fallhöhe: der
  QR trägt weiter die vier Art.-9-Felder, nur in einem anderen Träger. Verworfen — der Bequemlichkeits-
  gewinn rechtfertigt das Gesundheitsdaten-Risiko nicht.
- **B — QR ersatzlos streichen.** Die gedruckte Karte trägt Name, Blutgruppe, Allergien, Medikamente,
  Diagnosen, Kontakte ohnehin als lesbaren Text; ein Ersthelfer liest sie ohne Gerät. Gültig, aber
  wirft den einzigen echten Mehrwert weg (Ein-Tipp-Anruf der Kontakte).
- **C — QR trägt NUR die Kontakte, kein Gesundheitsdatum (GEWÄHLT).** Die Trennung: die Karte
  trägt zwei Sorten — **Anruf-Ziele** (Kontakte, gewinnen durch einen QR) und **Gesundheitsangaben**
  (wollen nur gelesen werden, gewinnen nichts, tragen nur Risiko). Nur die erste gehört in den QR.

## Entscheidung — Option C

`notfallKontakteVcard()` ersetzt `notfallKernText()` als QR-Payload. Der QR ist **eine vCard**
(`VERSION:3.0`, **ein** `BEGIN:VCARD`-Block — iOS nimmt bei Mehrfach-Blöcken nur den ersten, am Gerät
belegt), `FN` = „Notfallkontakte · «Patientenname»" (Bezug, nicht medizinisch), je Notfallkontakt
**mit** Telefonnummer eine `item{n}.TEL;TYPE=CELL` (tappbar) + `item{n}.X-ABLabel:«Name»`. **Kein
`NOTE`, kein Gesundheitsfeld.** Name/Nummer aus dem Register (`data.menschen[].tel`) über die
refMehrfach-Kontakte (`gesundheit.hauptpflegeperson`); Kontakte **ohne** Nummer erscheinen nicht im QR
(stehen weiter als Name auf der Karte). Leer → kein QR (graziös, Toast).

**Warum C:** Es entkoppelt den einzigen echten Mehrwert (Ein-Tipp-Anruf) vom Risiko. Wenn ein
Handler-Ziel je wieder danebengreift, fließt **ein Name + eine Nummer** statt einer Diagnose ab —
Schadensfall **klein statt katastrophal**. Und es ist die einzige ehrlich erzählbare Fassung: „Der QR
trägt Kontaktdaten. Gesundheitsdaten trägt er nicht — die stehen auf Papier."

**Trennung gewahrt:** Der **gedruckte Kartentext** (`zeichneNotfallkarte` über `notfallKernModell()`)
und der **passwortlose Sanitäter-Cache** (`notfallCacheBauen()`) bleiben **unverändert** — beide tragen
die Gesundheitsangaben weiter. Nur der **QR-Payload** wechselt. (Verifiziert, nicht angenommen:
`notfallKernText` hatte genau zwei Konsumenten, beide QR-Generatoren; der Cache liest `notfallKernModell`
direkt, ist ein anderer Konsument.)

## Geräte-Beleg (iPhone, 12.07.2026)

Dummy-vCard-QR (erfundene Daten, lokal gerendert) am echten iPhone gescannt:
- **Mehrfach-Block scheitert:** drei `BEGIN:VCARD` → iOS zeigt nur den **ersten**; Beweis: Anruf-Knopf
  ausgegraut, weil nur der erste Block (ohne `TEL`) eingelesen wurde. → **Ein-Block-Zwang.**
- **Option-C-Form belegt:** eine vCard, zwei `item{n}.TEL` + `X-ABLabel`, leeres `NOTE` → **native
  Kontakt-Vorschau, offline, kein Google**; beide Nummern mit **aktivem Anruf-Symbol** (tappbar); Namen
  „Anna Beispiel" / „Bernd Muster" als **X-ABLabel** sichtbar; **kein Gesundheitsdatum**.

## Android-Verifikation (2026-07-12) — geprüft: degradiert, aber sicher

`X-ABLabel` ist ein **Apple-Herstellerfeld** — am iPhone belegt (Namen sichtbar), am **iPhone auch
über den echten Code-Pfad bestätigt** (zwei Register-Kontakte mit Nummer, native Karte, beide
tappbar, kein Medizin). Am **Android**-Gerät gescannt (12.07.):

- **Kernzusage hält:** Android erkennt die vCard als **Kontakt** („Add to contacts"), reicht sie
  **NICHT an die Websuche**, und trägt **kein Gesundheitsdatum** (nur Namensfelder + Nummern).
- **Degradiert:** die `X-ABLabel`-Namen (Anna/Bernd) werden **nicht** angezeigt; die `FN`
  („Notfallkontakte · «Name»") landet im **Vornamen-Feld** (N split → Middle/Last) — das Namensfeld
  ist verunstaltet.
- **Ungeprüft (bewusst nicht weiter verfolgt):** ob die zwei Nummern in der Detailansicht tappbar
  sind — das entscheidet über **Bequemlichkeit, nicht über die Kernzusage.**
- Androids „Add to contacts" bietet Google-Sync des Kontakts an (Scanner-**eigenes** Konto, kein
  App-Leck, kein Medizin).

**Entscheidung (Option A, 12.07.):** akzeptiert. Android ist für diese Funktion zweitklassig
(keine Namens-Label, verunstalteter Name), aber die Kernzusage trägt plattformübergreifend, und die
**gedruckte Notfallkarte** deckt den Fall (Namen + Nummern + Medizin lesbar). Kein Blocker. Feinschliff
der vCard-Struktur für Android bliebe ein eigener Schritt mit Neu-Test auf BEIDEN Plattformen.

## Lese-App-Empfänger — überholt, stehen gelassen

`vivodepot-lesen.html: parseNotfallQrText()` las den **Klartext**-Notfall-QR ein (Helfer scannt QR →
Lese-App zeigt Medizin). Unter C trägt der QR kein Gesundheitsdatum mehr und geht nativ in die
Kontakte, nicht in die Lese-App — der Empfänger ist **zwecklos** (erkennt neue QRs nicht, hätte auch
nichts zu zeigen). **Entscheidung:** als **Legacy-Parser stehen gelassen**, hier als **überholt**
ausgewiesen; Entfernen ist ein eigener, reversibler Folge-Schnitt (nichts veröffentlicht → keine
Alt-Karten im Umlauf). E2E `T-CROSS-03` von der Klartext-Kette auf den **Anti-Leck-Vertrag** umgestellt.

## Zweiter Track (NICHT dieser Bau, VOR v1) — Feld-Scope des passwortlosen Caches

Der Befund öffnet eine zweite, hier **nicht** behandelte Frage: `notfallCacheBauen()` liest aus
**derselben** `notfallKernModell()`-Zeile — der passwortlose Cache trägt **dieselben vier Art.-9-Felder**
(Diagnosen + Medikation) im Klartext, ohne Passwort lesbar, neben dem Chiffrat im Depot-Umschlag. Das
ist **kein Leck, sondern eine Entscheidung** (jeder mit der Datei liest die Diagnoseliste), die nie
eigenständig fiel. Nicht *ob* Klartext (der Sanitäter-Fall IST der Zweck), sondern **welche Felder**
hinein gehören, gehört **vor v1** bewusst entschieden. Festgehalten: `backlog-sanitaeter-cache-feld-scope`.

## Exposition — wo der Klartext-QR öffentlich lag („und die alte Version, die draußen lag?")

Faktisch geklärt (git-Historie + lokale Repos):
- **Im Code seit `382585f` (2026-06-06)** — der Klartext-QR (`notfallKernText` / „VIVODEPOT NOTFALL")
  liegt seit über einem Monat im **Dev-Repo** (cleanslate, privat).
- **Öffentliche Front (privater GitHub-Namensraum, `.../vivodepot`) = docs-only** — kein App-HTML, **kein Klartext-QR dort
  ausgeliefert.**
- **Deployte Test-Harness (derselbe private Namensraum, `.../vivodepot-ios-test`)** (öffentlich per URL erreichbar,
  kein Auth): seit **2026-07-03** live (Commit „iOS-Abnahme … temporaer, loeschbar"). **Trägt den
  Klartext-QR bis JETZT** (Stand v31 *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)*; Option C dort NICHT ausgeliefert). Ein iPhone-Kamera-Scan
  dieses QR **leckt weiterhin** an die Google-Websuche.
- **Erreichbarkeit:** kein Flag/Gate — der Notfall-QR ist eine reguläre Funktion.

**Feststellung (2026-07-12):** Die Harness-URL wurde **nicht geteilt** — nicht an Beta-Tester,
nicht an Dritte; die Notfall-QR-Funktion wurde am **deployten** Stand **nicht ausgeführt**. **Keine
Betroffenen.** Damit entfällt eine Betroffenen-Information — es gibt keinen Adressaten. (Die Feststellung
konnte nur die Eigentümerin treffen; aus dem Code ist sie nicht ableitbar.)

**Sofort-Remediation (dringlich):** die deployte Harness leckt WEITER, bis Option C dort ausgeliefert ist
(Schale kopieren + `sw.js` bumpen + Pages-Build) **oder** der QR/die Seite bis dahin heruntergenommen wird.
Der cleanslate-Fix (*(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 2026)*) allein schließt das Leck **am deployten Stand nicht**.

## Änderungen (`vivodepot.html`)

- Neu `notfallKontakteVcard()`; `notfallKernText()` **entfernt** (einziger Zweck war der Klartext-QR).
- Zwei QR-Konsumenten umgestellt: `flowNotfallQR` (Schirm) + `flowNotfallkartePdf` (Karten-QR).
- STRINGS: `exportQrLabel`/`exportQrHinweis`/`exportQrTitel`/`exportQrLeer` auf „Kontakte, kein
  Gesundheitsdatum" umformuliert; `notfallQrKopf` **entfernt**, `notfallKontakteVcardTitel` neu.
- Unberührt: `notfallKernModell` (Karte + Cache), `zeichneNotfallkarte`, `notfallCacheBauen`,
  `NOTFALL_KERN_FELDER`.
- `tests/load-kern.js`: EXPORT_HOOK `notfallKernText` → `notfallKontakteVcard`.

## Tests

- **`tests/export-qr.test.js`** (neu gefasst): der zentrale **Anti-Leck-Test** — die QR-vCard trägt den
  Kontakt (Name + Nummer) und **KEINES** der vier Art.-9-Felder, auch wenn alle gefüllt sind;
  Gegenprobe: das Kartenmodell trägt sie SEHR WOHL weiter. Plus vCard-Struktur (ein Block, `FN`,
  `TEL`+`X-ABLabel`), Kontakt-ohne-Nummer fällt raus, read-only.
- `tests/notfallkontakte-liste.test.js`, `tests/strings-zentral.test.js`, `tests/export-durchgang.test.js`:
  QR-Teil auf die vCard umgestellt; Kartenmodell-Teile unverändert.
- `tests/lese-app.test.js` (T-A-06): auf den **Legacy-Parser in Isolation** umgestellt (Literal-Alt-QR,
  ohne den entfernten Generator); vCard wird NICHT als Legacy-Notfall-QR erkannt.
- `tests/e2e-cross/T-CROSS-03-notfall-qr.spec.js`: **Anti-Leck im echten Browser** — der Klartext-Generator
  `notfallKernText` ist entfernt (window-Sonde) und Blutgruppe allein erzeugt keinen QR-Payload. (Positiv-
  Seite unit-belegt; `getData/setData` sind nicht window-global — real im Browser geprüft, nicht angenommen.)

## Gates

Suite **1345/0** (pre-commit) · Block-Pin `8d31c678…` **byte-identisch** (Umbau außerhalb des
Krypto-Blocks) · PV-Golden **42/42** byte-identisch · SW-Cache-Bump · **kein Push** (erster Push =
eine Produktentscheidung).

## Cross-Referenz

Supersediert den **impliziten Klartext** aus U2-ADR-059/072 (die Kodierung, die nie entschieden wurde,
wird hier nachgeholt und begründet). Drift-Befund + Methodik im internen Forschungstagebuch
(nicht Teil dieses Repos). Zweiter Track:
`backlog-sanitaeter-cache-feld-scope`.

## Konformität

```konformitaet
aussage:   Die Notfall-QR-vCard trägt nur Name + Kontakt-Telefone — kein NOTE-Feld und kein
           Gesundheitsdatum, auch wenn Art.-9-Felder gefüllt sind.
zustand:   prüfbar
pruefung:  tests/export-qr.test.js#u2-077a-vcard-kein-note-kein-gesundheit
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (A2-als-Code), über `tests/bindung-pruefen.js` (U2-ADR-098 + Nachtrag).*

## Nachtrag (13.08.2026) — die Adresse der Sicherheitszusage ändert sich; ob die Zusage selbst noch gilt, ist offen

Die Zusage oben (§ „Exposition") ist an eine konkrete Adresse gebunden: den privaten GitHub-Namensraum
(`.../vivodepot`). Diese Adresse entfällt mit der Repo-Umstellung (internes Entscheidungsdokument vom 31.07.2026,
ADR-097-Nachtrag 01.08.2026) — ab Veröffentlichung von v1 trägt `github.com/vivodepot/vivodepot`
diese Rolle.

**Das ist keine reine Adress-Ersetzung.** Die Zusage lautete „docs-only — kein App-HTML, kein
Klartext-QR dort ausgeliefert". Das setzte voraus, dass die öffentliche Front NUR Dokumentation
zeigt, kein lauffähiges `vivodepot.html`. Wenn `github.com/vivodepot/vivodepot` — wie die
Umstellung vorsieht — den **vollständigen Code** trägt (nicht nur Docs), ist es keine
Docs-only-Front mehr, und die Zusage in ihrer heutigen Form träfe auf die neue Adresse gar nicht
zu.

**Offene Frage, nicht hier entschieden:** Gilt die Docs-only-Zusage ab v1 überhaupt noch — oder
war sie an eine Übergangsarchitektur gebunden, die mit v1 selbst endet (weil der App-Code dann
ohnehin öffentlich und geprüft ausgeliefert wird, nicht mehr „exponiert")? Offene Frage, notiert
im Bericht zur Repo-Umstellung auf v1 (13.08.2026).
