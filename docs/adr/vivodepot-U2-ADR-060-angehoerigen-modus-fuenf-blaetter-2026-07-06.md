# U2-ADR-060 — Angehörigen-Modus: fünf Situationsblätter (Spec-Struktur nach ADR-061v3)

**Datum:** 06.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 06.07.2026 (Suite/Block-Pins/Browser grün; Annahme = Produktentscheidung).
**Status heute:** gilt — als TEMPLATE, nicht mehr als Gerüst (U2-ADR-NNN, 19.09.2026): der Fünf-Blätter-Grundsatz
und die Feldsätze (Krankenhaus, Pflegeheim-Aufnahme, Beerdigung und Nachlass, Behörden und Nachlass,
Meine Menschen) stehen unverändert in `tools/angehoerigen-vorlagen/`; die `sit:`-Quellen-Konvention ist
aktiv im Resolver. ENTFERNT sind der Angehörigen-Modus, die Konstante `_ANG_SITUATIONEN` und die
Akut-Renderer dieser Entscheidung — die Blätter erscheinen als gewöhnliche Ansicht (`angehoerigen-blatt`)
und in der Lese-App. Einzelne Cross-Refs zeigen seit U2-ADR-089 auf abgeleitete Instrument-Zeilen
statt Flachfelder.
**Nummer:** U2-ADR-060 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-059).
**Typ:** Read-only-Sicht-/Render-Struktur (kein Krypto, keine Datenmodell-Änderung — `data.situationen[]` existiert seit U2-ADR-012).
**Bezug:** ADR-061v3 (intern, „Fünf Situationsblätter", akzeptiert 23.05.) · U2-ADR-012 (Situationen/Anlass-Blätter, `data.situationen[]`) · ADR-095 (`data.menschen[]`-Register) · ADR-099 (Notfall-Kern) · U2-ADR-034 (Angehörigen-Modus read-only am Gate) · `docs/spec/Offene-Punkte-Angehoerigen-Felder.md` (30.05., ausgelassene Felder).

---

## Kontext

Der Angehörigen-Modus (read-only Vollbild, Gold-soft: eine Vertrauensperson liest, was die
Eigentümerin hinterlegt hat) trug seit dem Bau vom 30.05. **vier** Akut-Situationen
(`notarzt`, `krankenhausakut`, `pflegeheimakut`, `tod`) — bereits schema-26-rein
(Feld-IDs gegen das clean-rebuild-Feldmodell abgeglichen, „nicht still angelegt"). Die
Produktiv-Spec ADR-061v3 verlangt jedoch **fünf** Situationsblätter mit anderem Zuschnitt.

Am 05.07. wurde die Angleichung an die Spec freigegeben, mit vier expliziten
Entscheidungen: (1) fünf Blätter statt der vier behalten, (2) „Meine Menschen" als eigenes
Blatt, (3) Blatt 4 voll (alle 23 `erb_*` read-only), (4) alle sieben Pflege-Delta-Felder
rein. Dazu zwei Auflagen: **b16-Felder sind Referenz, keine 1:1-Portierung** (jedes Feld
gegen Schema 26 prüfen — E1–E3 haben Felder entfernt) und die (noch nicht gebaute)
PBKDF2-Fallback-Logik gehört vor Produktivschaltung durch externen Review.

## Entscheidung

**(1) `_ANG_SITUATIONEN` von vier auf fünf Blätter (ADR-061v3-Zuschnitt):**

| # | Blatt | Herkunft | Delta |
|---|---|---|---|
| 1 | **Krankenhaus** | bleibt | unverändert (`voroperationen` bleibt Template-Andock) |
| 2 | **Pflegeheim-Aufnahme** | bleibt | **+7 Pflege-Delta:** `pflegegrad_seit`, `pflegegrad_befristet_bis`, `pflegekasse`, `pflegekasse_nr`, `pflegekasse_tel`, `pflegedienst` (Sozialversicherung) + `patientenverf_ort` (Vorsorge) |
| 3 | **Beerdigung und Nachlass** | Death-Split A aus `tod` | Bestattungswünsche + Brief; Feier-Detailschicht bleibt Template-Stoff (Bereich 10) |
| 4 | **Behörden und Nachlass** | Death-Split B aus `tod` | **voller 23er `erb_*`-Satz** read-only + Vorsorge-Stand (Testament/Erben/Vollmacht/ZVR) |
| 5 | **Meine Menschen** | neu | eigenes Blatt, zieht das Register `data.menschen[]` |

**(2) Notarzt entfällt** aus dem Angehörigen-Modus — die Akut-Sicht für Rettungskräfte liegt
im **Notfall-Modus** (rot, ADR-099). Der Angehörigen-Modus ist die planbare Vertrauens-Sicht.

**(3) Neue Quelle-Konvention `'sit:<id>'` im read-only Resolver.** `crossRefFeldUndRoh`
löst neben Sektor-Feldern (`data.sektoren[quelle][feld]`) und dem Register (`meine-menschen`/
`menschen`) jetzt auch **inline-Anlass-Felder** auf: `quelle: 'sit:erbfall'` zieht ein Feld
read-only aus `data.situationen['erbfall']`, mit der Feld-Definition aus
`SITUATION_BY_ID['erbfall']`. So nutzt Blatt 4 den **echten** 23er `erb_*`-Satz, der als
bürgerseitiges Anlass-Blatt „Im Erbfall" (U2-ADR-010/012) längst existiert — kein zweiter
Feld-Satz, keine Datenmodell-Änderung.

## Begründung

- **Keine b16-Waisen (Auflage 1, als stehender Test).** Jedes gezogene Feld ist gegen Schema 26
  geprüft. Der b16-`erb_*`-Satz (`erb_orig_ausweis`, `erb_bank_haupt`, `erb_immo_grundbuch` …),
  `eu_nachlass`, `rentenversicherungen[]`, `testamentsvollstrecker`, `testament_typ`, `notar_tel`
  existieren in Schema 26 **nicht** — eine 1:1-Portierung aus ADR-061v3 hätte auf Blatt 4 allein
  ~20 Waisen eingeschleppt. Blatt 4 nutzt stattdessen den realen Schema-26-`erb_*`-Satz
  (`erb_erbschein`, `erb_konten`, `erb_immobilien`, `erb_lebensversicherung`, `erb_digitales` …).
  Der Test `tests/angehoerigen-blaetter-felder.test.js` prüft (a) jedes Feld existiert im genannten Sektor
  bzw. als `sit:erbfall`-Inline, (b) die vier b16-Waisen tauchen NICHT auf.
- **Meine Menschen als eigenes Blatt (Entscheidung 2, ADR-061v3):** zieht `data.menschen[]`
  (nicht die tote `data.meine_menschen.kontakte`-Altlast); Selbst-Eintrag ausgenommen.
- **read-only bleibt zweifach abgesichert:** `Modus.darfBearbeiten()` ist `false` im
  Angehörigen-Modus (U2-ADR-034-Gate) UND der Render-Kurzschluss (`renderAngehoerigen`) zeigt
  nur Lese-Zeilen — kein Click-Through, kein Schreibfeld (im Browser verifiziert).

## Abgrenzung / Nachlauf (NICHT in diesem ADR)

- **Stufe-2-Krypto ist bewusst ausgeklammert.** Der heutige Eintritt in den Angehörigen-Modus
  läuft über das Krypto-Overlay mit dem **Depot-Passwort** (volles Depot im Speicher, read-only
  per Gate/Render) — das ist die von ADR (Modus-Wechsel-State-Stufe2, 26.05.) **verworfene
  Option B**. Die Spec-Option A (separates **Vertrauens-Passwort**, Allowlist-Cache, State-Wipe
  der Anker-Daten beim Eintritt, Welcome-Startseiten-Eintritt) ist ein gekoppeltes
  **Sicherheits-Subsystem** und die **nächste Stufe** — nicht Teil dieses Render-ADR.
- **Auflage 2 (festgehalten):** die PBKDF2-Fallback-Logik (600.000 → 200.000 mit
  Performance-Messung) = neue sicherheitskritische Krypto → **externer Review vor
  Produktivschaltung** (analog JWE beim SHL-Strang). Kein RC-Blocker für den Bau.
- **Offen (UX, klumpen-2a):** Entry-Door-Karte „Wenn Sie unsicher sind — zeig mir alles
  Wichtige", Welcome-Startseiten-Eintritt „Als Angehörige öffnen", und der jetzt leicht stale
  Titel-String „Akut-Situationen" (die fünf Blätter sind nicht mehr alle akut) — folgen mit dem
  Sicherheits-Subsystem.

## Status & Gates

- Gebaut 06.07.2026. **Node-Suite 1178/0** (keine Regression); `tests/angehoerigen-blaetter-felder.test.js`
  auf fünf Blätter neu, **11/11** inkl. Anti-Waisen-Test.
- **Block-Pin `8d31c678…` (Krypto) + JWS-Pin `d0541ea7…` unverändert** (byte-identisch verifiziert).
- **SW-Cache v8→v9.** sha256-Pin `vivodepot.html.sha256` nachgezogen → `bc30adf…`.
- **Browser-Preview verifiziert:** fünf Karten (Krankenhaus, Pflegeheim-Aufnahme, Beerdigung und
  Nachlass, Behörden und Nachlass, Meine Menschen), Banner mit Owner-Name, Blatt 4 zieht
  `erb_konten` read-only aus `data.situationen['erbfall']` mit „(Im Erbfall)"-Quelle-Tag, Blatt 2
  zeigt die Pflege-Delta-Felder — **keine Schreibfelder, kein Click-Through**.
- **Kein Push** (eine Produktentscheidung).

## Betroffene Stellen

- `vivodepot.html`: `_ANG_SITUATIONEN` (Registry 4→5 Blätter), `crossRefFeldUndRoh` +
  `akutZeileHTML` (`sit:<id>`-Zweig), Header-Kommentar.
- `tests/angehoerigen-blaetter-felder.test.js` (auf fünf Blätter + Anti-Waisen umgeschrieben).
- `sw.js` (v8→v9), `vivodepot.html.sha256` (nachgezogen).
