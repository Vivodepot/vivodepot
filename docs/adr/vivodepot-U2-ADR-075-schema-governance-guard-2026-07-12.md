# U2-ADR-075 — Schema-Governance: Lückenlosigkeits-Guard + dokumentierte Leerstellen 20/22

**Datum:** 12.07.2026 (Auftrag 11.07.)
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · Guard gebaut + Suite grün. Suite **1309/0**, PV byte-identisch (Golden), Block-Pins `8d31c678…`/`d0541ea7…` byte-identisch. **Kein Push.**
**Nummer:** U2-ADR-075 (höchste belegte war U2-ADR-074).
**Typ:** **Test-Infrastruktur / Governance** — kein Schema-Bump, kein Feature, kein Shell-Byte geändert. Läuft unabhängig von Phase 7/8.
**Bezug:** Auftrag „Schema-Guard + Versions-Sichtbarkeit" (11.07., interner Auftrag, nicht Teil dieses Repos) · Golden-Master + Block-Pins (dasselbe „bricht statt vertraut"-Muster) · PRINCIPLES Wurzel 1 (Offline, keine Telemetrie).
**Status heute:** gilt — Beleg `tests/schema-governance-guard.test.js`.

---

## Kontext

Die Depot-Schema-Kette ist über 37 Stufen gewachsen; die Migration lebt als lineare Kette von
`if (… schemaVersion < N) schemaVersion = N`-Klammern in `depotNormalisieren`. Bisher sicherte **kein Test**,
dass diese Kette lückenlos, strikt steigend und **als Ganzes verlustfrei** bleibt. Das ist kein akutes Problem
(kein Umbau geplant), aber nach v1 nicht auszuschließen (Sicherheitsbug, Rechtslage). Ein struktureller Guard —
im selben Geist wie der Golden-Master (PV byte-identisch) und die Block-Pins — **bricht**, statt auf einen
Merkzettel zu vertrauen.

**Historische Leerstellen:** Die Schema-Nummerierung beginnt bei **19** (die geprüfte Krypto-Kern-Schicht,
wörtlich aus VIVODEPOT.html extrahiert). Die Nummern **20 und 22** sind **bewusste Leerstellen** — reine
Beta-Zählfehler; kein Depot saß je auf einem dieser Zwischenschemata (nur beta16-Import war in Gebrauch).
Ohne dokumentierte Ausnahme bräche ein Lückenlosigkeits-Guard an genau dieser Vergangenheit.

---

## Entscheidung

### Teil 1 — Schema-Lückenlosigkeits-Guard (`tests/schema-governance-guard.test.js`)

Drei Prüfungen + Verankerung + Idempotenz:

1. **Lückenlosigkeit.** Über `[19 … leeresDepot().schemaVersion]` gilt für jede Nummer: **entweder belegt oder
   dokumentierte Leerstelle** (XOR), nie beides, nie keines. Belegt = die < 24 deklarierten Alt-Versionen
   {19, 21, 23} ∪ die maschinell aus dem Quelltext extrahierten Klammer-Ziele {24 … 37}. Eine undokumentierte
   Lücke (z. B. eine Klammer 39 ohne 38) bricht hier.
2. **Strikte Monotonie.** Die Klammer-Ziele — per Regex `\.schemaVersion\s*<\s*(\d+)\)` aus `vivodepot.html`
   gezogen, in **Quell-Reihenfolge** — steigen strikt um **+1**, keine Dublette, kein Rückschritt.
3. **Kette läuft durch (KERN).** Ein Alt-Depot auf Schema **19** mit unverwechselbaren Bürger-Sentinels über
   mehrere Sektoren — inkl. Alt-Form-Feldern, die spätere Stufen umformen (`konto_haupt_*` → `konten`-Liste 36→37;
   `abhaengige_personen`-Text → Liste 35→36) — migriert in **einem** `depotNormalisieren`-Durchlauf bis zur
   aktuellen Version, **ohne Fehler**, **verlustfrei** (jeder Sentinel überlebt irgendwo — Verwaisungs-Regel) und
   **wirklich umgeformt** (Skalar-Felder entfernt, Werte in den neuen Listen). Das ist der Kern: nicht Nummern
   zählen, sondern beweisen, dass die Migrationen **zusammen** tragen (fängt „Stufe N→N+1 verliert ein Feld").

Zusätzlich: **(0) Verankerung** (Extraktion trifft die erwartete Kette: min=24, max=leeresDepot-Version, ≥10
Glieder) und **(3b) Idempotenz** (ein aktuelles Depot bleibt bei erneuter Normalisierung unverändert).

**Dokumentierte Ausnahme:** `BEKANNTE_LEERSTELLEN = [20, 22]` steht als kommentierte Konstante im Guard —
dieselbe „benannte Ausnahme"-Logik wie single-source-of-truth + Notfall-Cache: die Regel gilt, die eine bekannte
Ausnahme steht dokumentiert daneben. Der Guard prüft zusätzlich, dass die Leerstellen wirklich **unbelegt** sind
und **unterhalb** der ersten Migrations-Klammer (24) liegen.

**Drift-Sicherheit:** Die Kette 24→37 wird **maschinell aus dem Quelltext** gezogen, nicht abgetippt — ein neuer
`< N`-Sprung ohne Zwischenstufe bricht Prüfung 1 **und** 2; ein Feldverlust bricht Prüfung 3.

### Teil 2a — Versions-Sichtbarkeit: read-only Befund (nicht gebaut)

Ziel war: im Supportfall soll **offline-konform** feststellbar sein, welche Version ein Bürger nutzt (der Bürger
liest ab und nennt es — **keine** Telemetrie). Befund:

- **`schemaVersion` liegt im Depot** (`data.schemaVersion`, aktuell 37) — treibt die Migration.
- **App-Version + Build-Datum + Build-Hash sind bereits sichtbar** — an **zwei** Stellen: der **Fußzeile**
  (`renderFooter`: `BUILD_VERSION` + Kurz-Hash) und in **Einstellungen → „Über"** (Version, Build-Datum,
  Hash, Lizenz, Alters-Hinweis + „Nach Aktualisierung suchen"). Der **Hash-Wert** (`BUILD_SHA256`) ist bis
  zum Release ein Platzhalter („wird beim Release gesetzt") — by design: eine Single-File-App kann sich zur
  Laufzeit nicht selbst hashen; der Hash wird beim Release als Konstante gesetzt (Website-Fingerprint-Kopplung).
- **Zwei kleine Lücken:** (a) die **`schemaVersion` selbst wird in der UI nicht angezeigt** (nur intern genutzt);
  (b) das **verschlüsselte Depot persistiert keine App-Version/Hash** des zuletzt speichernden Builds
  (`BUILD_VERSION` ist eine Shell-Konstante; nur der **Klartext**-Export stempelt `_version`).
- **2b nicht gebaut:** Die Auftrags-Baubedingung („App-Hash fehlt oder nicht sichtbar") ist **nicht erfüllt** —
  der App-Hash ist vorhanden und sichtbar. Offen zur Entscheidung (gemeldet): eine **Ein-Zeilen-Anzeige der
  `schemaVersion`** im „Über"-Block (reine Anzeige aus `data.schemaVersion`, **kein** Netz, **keine** neue
  Speicherung, **keine** Depot-Berührung). Eine App-Version-**im-Depot** wäre eine Schema-Frage → separat.

---

## Konsequenzen

- **Tests:** `tests/schema-governance-guard.test.js` — 5 Prüfungen (Verankerung, Lückenlosigkeit, Monotonie,
  Durchmigration, Idempotenz). Suite **1304 → 1309**.
- **Kein Shell-Byte geändert** → PV byte-identisch, Block-Pins byte-identisch, kein SW-Bump.
- **Offen:** ob die `schemaVersion`-Zeile im „Über"-Block ergänzt wird (Teil 2b, reine Anzeige).
- **„Declared ≠ Verified"-Notiz:** Der Auftrag nennt 20/22 als „nie belegt". Im Code stehen dazu Kommentare
  („Schema 20 (Teil 5.1): eingabeDurchName …"; „Schema 22 → 23 …"), die diese Nummern als **Design-Schritte**
  referenzieren. Das widerspricht „nie belegt" nicht zwingend (ein Design-Increment kann in den nächsten
  persistierten Bump gefallen sein), ist aber aus dem Code allein **nicht abschließend verifizierbar** — die
  persistierte Versions-Historie < 24 liegt nicht im Code. Der Guard folgt der Auftrags-Angabe (die Historie
  liegt außerhalb des Repos); die Leerstellen-Liste ist eine Ein-Zeilen-Konstante, falls die Historie anders ausfällt.

## Konformität

```konformitaet
aussage:   U2-075: die Schema-Migrationskette [19..aktuell] ist lückenlos (nur die dokumentierten
           Leerstellen 20/22 sind unbelegt), steigt strikt um +1 ohne Dublette/Rückschritt, und ein
           Alt-Depot auf Schema 19 migriert in einem Durchlauf verlustfrei bis zur aktuellen Version.
zustand:   prüfbar
pruefung:  tests/schema-governance-guard.test.js#1) Lückenlosigkeit — [19..aktuell] ist lückenlos; die EINZIGEN Löcher sind die dokumentierten Leerstellen 20/22
pruefung:  tests/schema-governance-guard.test.js#3) Kette läuft durch (KERN) — Alt-Depot (Schema 19) migriert Stufe für Stufe VERLUSTFREI bis zur aktuellen
quelle:    invariante
```

---
*Vivodepot · Vivodepot GmbH · Berlin · U2-ADR-075 · 12.07.2026 · Code ungepusht.*
