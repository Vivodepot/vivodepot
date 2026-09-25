# U2-ADR-015 · Interner verschlüsselter Arbeitsstand (Zwei-Ebenen-Persistenz, IndexedDB-Senke) — D43

**Entscheidungsdatum:** 12.06.2026
**Verschriftlichung dieser Datei:** 20.07.2026 (fünf Wochen nach der Entscheidung — s. Abschnitt 0)
**Status:** Angenommen (Produktentscheidung, 12.06.2026) · Umsetzung an Bau-Reihenfolge gebunden (nach B2/U2-ADR-016) ·
laut den zugehörigen Testdateien (`tests/d43-etappe0-capability.test.js` bis
`tests/d43-etappe8-serviceworker.test.js`) umgesetzt
**Quelle dieser Nachdokumentation:** ausschließlich `docs/cc-d43-finalisierung-2026-06-12.md`,
`docs/cc-d43-portierungs-inventar-stufe1-2026-06-12.md` und
`docs/cc-produktiv-kanon-adr015-abgleich-2026-06-11.md` (alle drei interne Arbeitsdokumente, nie ins Repo überführt)
sowie die neun `tests/d43-etappe*`-Dateien. Nichts rekonstruiert, nichts ergänzt, nichts neu
entschieden — wo das Quellmaterial offenlässt, bleibt es hier offen.
**Bezug:** Produktiv-`ADR-114` (interner verschlüsselter Speicher, Bau 1) · Produktiv-`ADR-085`/`ADR-106`
(AAD/kryptoVersion) · Produktiv-`ADR-098` (Lese-App-Storage-Verbot) · Produktiv-`ADR-066`/`ADR-067`
(Offline/CSP) · Produktiv-`ADR-001`/`ADR-013`/`ADR-009` · U2-ADR-016 (kryptoVersion 3 — die
IDB-Senke ist v3-only) · U2-ADR-004 (Teststrategie) · **Supersedes:** A-i (Clean-Slate-Code-Kommentar
„keine lokale Persistenz", 06.06.2026, dokumentiert in Kern-Code-Kommentar und
`docs/cc-strang-2-vorschlag-06062026.md:66`)
**Status heute:** teilweise überholt durch U2-ADR-190 — Etappe 8 (Service Worker) sagte pauschal
„skipWaiting bleibt aus"; U2-ADR-190 (01.09.2026) wendet denselben Schutzgrund PRÄZISE statt
PAUSCHAL an (Ausnahme nur bei `_ungespeicherteAenderungen === 0`), siehe Nachtrag am Ende dieser
Datei. Alle übrigen Etappen (0–7) und die Kern-Aussagen zur Zwei-Ebenen-Persistenz selbst gelten
unverändert — mechanisch geprüft (`tests/krypto-verbote.test.js`
u2-015-zeitmarke-nie-in-der-aad, sowie der Lese-App-Storage-Verbot-Zweig), rot⇄grün belegt.

---

## 0 · Warum diese Datei erst am 20.07. entsteht

Diese Entscheidung wurde am 12.06.2026 vollständig getroffen und dokumentiert — nur nie als
kanonische Einzeldatei nach `docs/adr/` überführt. Aufgefallen ist die fehlende Datei nicht durch
gezielte Suche nach ihr, sondern beiläufig: eine Erhebung zur ADR-Nummernraum-Klärung
(20.07.2026, Anlass war eine unabhängige Präfix-/Nummerierungsfrage) fand sieben bereits
akzeptierte ADRs (U2-ADR-020, 024, 031, 061, 062, plus sechs Cross-Referenz-Stellen im
Meta-Index), die „U2-ADR-015 (D43 Zwei-Ebenen-Persistenz)" zitieren, als bestünde die Datei.
Dasselbe Entdeckungsmuster wie beim Autosave-Fund und beim irreführenden Testnamen desselben
Tages: der Befund fiel bei der Suche nach etwas anderem an. Diese Datei schließt die
Veröffentlichungslücke, ohne die Juni-Entscheidung selbst neu zu verhandeln.

## 1 · Kontext und Problem

Bau 1 (produktiv `VIVODEPOT.html`) hatte den internen verschlüsselten Speicher vollständig:
`STORE_KEY='vivodepot_v1_enc'` in localStorage, `saveData`/`loadData`, atomare
Schreib-Disziplin, Threat-Model (Produktiv-ADR-114). Die clean-rebuild-Neuimplementierung
übernahm diese Fundament-Eigenschaft **nicht**; A-i (06.06.2026) erklärte die Lücke nachträglich
zur Entscheidung („keine lokale Persistenz") — unter der inzwischen **empirisch widerlegten**
Annahme, der Datei-Workflow sei auf iOS tragbar (die Datei öffnet dort nur als tote
Quick-Look-Vorschau, belegt in `cc-d43-indexeddb-file-origin-2026-06-11.md`).

## 2 · Die Entscheidung: Rück-Angleichung, nicht Umkehr

Diese ADR ist eine **Rück-Angleichung an Produktiv-ADR-114**, nicht eine Umkehr von A-i: **A-i
war die Abweichung** vom Fundament. Die lokale verschlüsselte Persistenz wird wiederhergestellt.
**Einzige Architektur-Differenz zu Bau 1: die Senke ist IndexedDB statt localStorage**, begründet
durch Größe (10 MB Depot + Fotos sprengen die ~5-MB-localStorage-Origin-Kappe; IndexedDB trägt
bis 60 % Geräte-Quote auf iOS-Home-Screen-Web-App).

**Zwei Ebenen:**
1. **Laufender Arbeitsstand intern, verschlüsselt (IndexedDB).** Die vier bewussten Save-Punkte
   schreiben hierhin — kein stilles Auto-Save, keine Datei pro Vorgang.
2. **Datei-Export als bewusster Akt** („Sicherungskopie erstellen") für Backup/Übergabe/Gerätewechsel.
   `dateiAusgeben` bleibt; der Desktop-Datei-Modus bleibt voll arbeitsfähiger Erstklass-Pfad.

IDB-Record-Form: `{ id, cipherBlob: <v3-Umschlag-JSON, byte-identisch zum bisherigen dateiInhalt-JSON>, gespeichert_am: <ISO-8601> }`,
ein Object Store, ein Blob pro Depot. `gespeichert_am` ist neue Klartext-Metadatum außerhalb des
Krypto-Blocks (s. harte Auflage in Abschnitt 4).

## 3 · LEGACY-Beschluss (explizite Produktentscheidung, 12.06.2026)

Die IndexedDB-Schicht startet mit **genau einem** Format: **kryptoVersion 3**. **Keine**
Alt-Format-Pfade (kein Legacy-`iv/ct`, kein `STORE_META`-Salt-Pfad, keine Plain-Migrations-Brücke)
in der IDB-Schicht. Begründung: vor v1.0 existieren keine fremden Depots; B2/U2-ADR-016 setzt die
Annahme-Allowlist ohnehin auf nur v3; eigene Test-Stände wandern manuell um. Der
Drei-Format-Erkennungs-Block aus Bau-1 `loadData` wird auf einen Pfad (v3) + Korrupt-Pfad
reduziert. Offen laut Quellmaterial: ob der U2-Frischbau die Bestand-Format-Pfade überhaupt
je gebraucht hätte, war zum Zeitpunkt der Entscheidung „aus dem Repo nicht belegbar" — Default
war, nur v3 + Korrupt-Pfad zu portieren.

## 4 · Harte Auflagen

1. **Zeitmarke nie in die AAD.** Die AAD bleibt der feste Drei-Felder-Block
   `{kryptoVersion, iterationen, kdfTyp}`, symmetrisch Bürger-/Lese-App. `gespeichert_am` lebt
   nur im Klartext-Header/IDB-Record-Metadatum, außerhalb des authentifizierten Depot-Blocks —
   sonst Byte-Identitäts- und Symmetrie-Bruch.
2. **Vorschau-Invariante.** Ohne existierendes Passwort/`sessionKey` wird nichts in IndexedDB
   geschrieben (Bau-1-No-Op-Verhalten bleibt).
3. **Lese-App-Storage-Verbot** (Produktiv-ADR-098). `vivodepot-lesen.html`: null Storage-Aufrufe,
   maschinell prüfbar. IndexedDB ausschließlich in der Bürger-App.
4. **VdCrypto byte-identisch.** Der Krypto-Block bleibt unangetastet; nur die Hülle leitet das
   Chiffrat in die neue Senke.
5. **Desktop-Datei-Modus bleibt Erstklass-Pfad** — voll arbeitsfähig ohne internen Speicher und
   ohne Service Worker, capability-detektiert, nie UA-Sniffing.

## 5 · Konsequenzen

- **Plus:** kein Datei-Dialog pro Save, Stand überlebt Schließen+Öffnen, nahtloses Öffnen vom
  Home-Screen, voll offline nach Install.
- **Minus:** Eviction-Restrisiko → gemildert durch `navigator.storage.persist()` nach dem ersten
  Save plus eine nicht-blockierende Export-Erinnerung.
- Die Mission-Linie „nichts lokal außer dem Stick" wird sachlich falsch und musste
  neu formuliert werden (wörtliches Zitat, 12.06.2026, extern — Website/Whitepaper zieht nach):
  > „Vivodepot speichert ausschließlich auf Ihrem Gerät, verschlüsselt — kein Server, kein Konto.
  > Ihre Daten verlassen Ihr Gerät nie. Die Datei ist Ihre Sicherung und Ihr Transportweg."

**Offline-Abgrenzung (wörtliches Zitat, 12.06.2026 — gilt wörtlich auch für die Amendments in
Abschnitt 6):**
> „Vivodepot lädt einmalig die Programm-Hülle von der Auslieferungs-Adresse und bei verfügbaren
> Updates eine neue Hülle. Im Betrieb läuft die App vollständig offline. Depot-Inhalte,
> Schlüssel und Metadaten werden zu keinem Zeitpunkt über das Netz übertragen — weder gesendet
> noch geholt. Kein Server-Betrieb, keine Telemetrie, kein Konto."

## 6 · Amendments zum Produktiv-Kanon (datiert 12.06.2026)

Präfix `B16-` hier ergänzt, da diese Nachdokumentation nach der Präfix-Regel (U2-ADR-090,
20.07.2026) entsteht — im Quellmaterial selbst standen diese Referenzen noch unpräfigiert
(„ADR-001" etc.), was nach der Auslegungsregel ohnehin eindeutig B16 meint.

- **B16-ADR-001 (Single-File-HTML):** lehnte PWA ab. Eng umrissene Ausnahme: die App bleibt eine
  HTML-Datei; für die gehostete Mobil-Auslieferung treten zwei statische Auslieferungs-Helfer
  hinzu (`sw.js`, ggf. `manifest.webmanifest`). Keine App-Aufspaltung, keine Build-Pipeline. Der
  Desktop-Datei-Modus läuft unverändert ohne diese Helfer.
- **B16-ADR-013 (Lokaler Fallback / SW abgelehnt):** Ausnahme — Service Worker erlaubt für die
  App-Schale, nie für Daten/Depots/Templates.
- **B16-ADR-066 (Offline-Erzwingung):** PWA-Install ist eine bewusste Bürger-Beauftragung
  („Zum Home-Bildschirm" = aktiver Knopf) — dasselbe Muster wie „Online-Aufruf nur nach
  Bürger-Beauftragung". Ausnahme nur für SW-Registrierung + Schalen-Cache, kein Laufzeit-Netzpfad
  für Inhalte.
- **Präzisierung B16-ADR-009 (Template-Architektur):** die Formulierung „Vivodepot greift nie
  selbst aufs Netz zu" wird durch die SW-Schalen-Auslieferung wörtlich berührt; der Geist bleibt
  wahr (SW cached nur die Hülle, nie Inhalte/Templates).
- **ADR-004-Test-Nachzug:** „Keine Klartext-Persistenz" bleibt Klasse-A-Invariante, gilt jetzt
  auch gegen IndexedDB-Inhalt. „Keine Storage-Nutzung" entfällt — IndexedDB wird bewusst genutzt.

Laut `cc-produktiv-kanon-adr015-abgleich-2026-06-11.md` supersedet U2-ADR-015 **keinen einzigen**
Produktiv-ADR — die beiden dort als „KONFLIKT" eingestuften Fälle (B16-ADR-066 gegen den
SW-Install-Fetch; B16-ADR-114 gegen den Senken-Wechsel localStorage→IndexedDB) werden durch die
Amendments in diesem Abschnitt aufgelöst, nicht durch Ablösung der jeweiligen ADR.

## 7 · Abgrenzung — Verwechslungsgefahr mit U2-ADR-011

**Diese ADR regelt die Grenze zwischen `data`/IndexedDB und der `.vivodepot`-Datei** — wann der
laufende Arbeitsstand von der App-internen Senke in eine exportierte Datei übergeht. **Die
Grenze zwischen dem DOM-Formular und `data` regelt U2-ADR-011** („Auto-Save beim
Bereichs-Wechsel", 30.05.2026) — wann eine Eingabe im Formular überhaupt zu `data` wird, bevor
sie diese ADR je erreicht. Beide Ebenen tragen ähnliche Begriffe („Persistenz", „zwei Ebenen"),
liegen aber an verschiedenen Stellen der Pipeline: DOM → `data` (U2-ADR-011, erweitert durch
U2-ADR-091) → IndexedDB (diese ADR) → `.vivodepot`-Datei (Export, Ebene 2 dieser ADR). Diese
Verwechslung führte am 20.07.2026 zu einer falschen Einordnung in einem Entwurf von U2-ADR-090,
seither korrigiert.

## 8 · Etappen (laut Quellmaterial, 0–8)

Capability-Gerüst (0) · IDB-Schicht Lesen/Schreiben/Zeitmarke, v3-only (1) · Atomares Schreiben
per native Transaktions-Atomarität statt tmp-Key-Choreographie (2) · Architektur-4-Gate +
Vorschau-Invariante (3) · `persist()` + Eviction-Härtung (4) · Konflikt-Auflösung über
`gespeichert_am`-Zeitmarkenvergleich, kein stilles Überschreiben in keine Richtung (5) · CSP als
eigene, frühe Etappe vor dem Service Worker (6) · Manifest finalisieren (7) · Service Worker,
cached ausschließlich die App-Schale, nie Daten (8). Details, Testkriterien und
Pflicht-Stops je Etappe: `docs/cc-d43-finalisierung-2026-06-12.md`, Teil 2.

## 9 · Offen (laut Quellmaterial nicht beantwortet — hier nicht nachgeholt)

- Ob die Bestand-Format-Pfade (Legacy-`iv/ct`, `STORE_META`, Plain-Migrations-Brücke) je
  gebraucht wurden, blieb zum Entscheidungszeitpunkt unbelegt.
- Die HKDF-Cross-Use-Regressionstest-Frage wurde dem B2-Strang zugeordnet, nicht hier geklärt.
- Ob nach den neun Etappen eine gesonderte Produktfreigabe für das fertige ADR-Paket (Etappe 7 im
  Portierungs-Inventar: „ADR-Paket-Freigabe … vor Bau-Abschluss") tatsächlich stattfand, ist aus
  den drei Quelldokumenten allein nicht ersichtlich — nicht rekonstruiert, bleibt offen.

---

*Vivodepot GmbH · Berlin · Entscheidung 12.06.2026 · nachdokumentiert 20.07.2026*

## Konformität

```konformitaet
aussage:   U2-015 (Lese-App-Teil): die Lese-App legt keinerlei Storage an — durchgesetzt über Z2, dessen
           Allowlist NUR für vivodepot.html gilt; jeder localStorage/sessionStorage/indexedDB/caches-
           Zugriff in vivodepot-lesen.html → Z2 rot.
zustand:   prüfbar
pruefung:  tests/zusicherungen-scanner.test.js#Z2-Storage-Grenze ausgefuehrt und gruen (Verweisziel Stufe 3a)
quelle:    invariante
```

```konformitaet
aussage:   U2-015 (AAD-Teil): die Zeitmarke kommt nie in die AAD — _AAD_DEPOT_V2 und _AAD_UEBERGABE_V2
           bleiben der feste Drei-Felder-Block (kryptoVersion, iterationen, kdfTyp); kein Zeit-,
           Datums- oder gespeichert_am-Feld darin.
zustand:   prüfbar
pruefung:  tests/krypto-verbote.test.js#u2-015-zeitmarke-nie-in-der-aad
quelle:    invariante
```

*AAD-Bindung nachgetragen 25.07.2026 (Stufe 6) — der in der 3a-Klausel als offen benannte AAD-Teil ist
damit gebunden.*

*Verweis-Bindung nachgetragen 25.07.2026 (Stufe 3a), über `tests/bindung-pruefen.js`. Z2 läuft seit
1b-2 in jedem `npm test`; Gate-Nachweis existiert. **Nur** der Lese-App-Storage-Teil ist hier gebunden —
der AAD-Teil („Zeitmarke nie in AAD") ist [N] und gehört in die Krypto-Stufe (6).*

---

## Nachtrag (01.09.2026) — U2-ADR-190 iteriert Etappe 8 (Service Worker)

Etappe 8 (§8 oben) legte fest: „Service Worker, cached ausschließlich die App-Schale, nie
Daten." Die spätere Umsetzung (Commit `a3e3fd5`, 16.07.2026, und seither) fügte dem eine eigene,
im Quellmaterial dieser Datei nicht vorweggenommene Regel hinzu: `skipWaiting()` wird nie
aufgerufen, Aktivierung eines neuen Workers wartet auf null offene Clients — ein bewusster,
aber PAUSCHALER Schnitt, keine im Quellmaterial dokumentierte Etappe-8-Vorgabe im engeren Sinn.

U2-ADR-190 (01.09.2026) ersetzt diese pauschale Regel durch eine präzise: die Aktivierung wird
zugelassen, wenn `_ungespeicherteAenderungen === 0` — derselbe Zähler, der Politik A/U2-ADR-103
trägt. Der Schutzgrund (kein Umschalten mitten in ungesicherter Arbeit) bleibt vollständig
erhalten; nur die Bedingung, unter der er greift, wurde von „niemand hat die App offen" auf
„nichts ist ungesichert" präzisiert. Etappe 8 im engeren Sinn (Schale-only, nie Daten) ist von
U2-ADR-190 nicht berührt und gilt unverändert. Details: `docs/adr/vivodepot-U2-ADR-190-bedingtes-skipwaiting-2026-09-01.md`.
