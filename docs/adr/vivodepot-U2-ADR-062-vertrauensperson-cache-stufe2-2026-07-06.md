# U2-ADR-062 — Stufe-2-Vertrauens-Zugang: Owner-Setup + cache-only Angehörigen-Eintritt (ersetzt Option B)

**Datum:** 06.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 06.07.2026 (Suite/Block-Pins/Browser grün; Annahme = Produktentscheidung).
**Nummer:** U2-ADR-062 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-061).
**Typ:** Datenmodell (Schema 26→27) + Krypto (Stufe-2-Cache, **außerhalb** des VdCrypto-Blocks) + Eintritts-/UI-Struktur.
**Bezug:** **U2-ADR-015** (Zwei-Ebenen-Persistenz — Grund für die eigene ADR: der Cache lebt im `.vivodepot`-Umschlag) · U2-ADR-060 (fünf Situationsblätter) · ADR-061v3 (intern, Stufe-2-Krypto-Spec) · ADR-099 (`notfallCache` als Umschlag-Geschwister — das Muster) · U2-ADR-047 (SHL-JWE, Präzedenz Krypto außerhalb des Blocks) · Krypto-Architektur-v0.3-§5-Supersede (06.07., separater Cache gilt).
**Status heute:** teilweise überholt durch U2-ADR-156 (nur der Mechanismus). Die AUSSAGE gilt unverändert (eine fremde Person sieht nur die Fünf-Blatt-Allowlist); der Mechanismus ist am 21.08.2026 entfallen (F5 Zug 2): statt einer verschlüsselten Abschrift trägt sie heute das Fach eines Empfängerkreises. Beleg `tests/angehoerigen-blaetter-zuschnitt.test.js`.
*(Nachtrag 29.08.2026, ADR-Lücken-Prüfung: der Nachfolger-Verweis stand bereits im Text, nur nicht im ersten Satz — README-Erzeugung liest nur die erste Zeile dieses Felds. Umformuliert, kein neuer Inhalt.)*

---

## Nachtrag — Ort-Hinweis und Passwort-Schranke (21.07.2026)

Eigenes Dokument: `vivodepot-U2-ADR-062-nachtrag-ort-hinweis-passwort-schranke-2026-07-21.md`
(Commit `03805a3`, Suite 1521 grün, Block-Hash unverändert). Zwei Beschlüsse, wörtlich:

**Beschluss A — Ort-Hinweis als Projektion im Umschlag.** Der Ortstext wird als
`angehoerigenOrt` unverschlüsselt in den Umschlag projiziert und im Angehörigen-Anmeldeschirm
der Bürger-App **vor** der Passwort-Eingabe angezeigt. Führend bleibt der Wert im verschlüsselten
Depot; der Umschlag trägt eine Projektion, die bei jedem Speichern neu geschrieben wird. Der
Gerätecheck vom 21.07. hatte gezeigt, dass die Anzeige bis dahin **nie umgesetzt** war — der Wert
lag innerhalb des Anker-Chiffrats und war vor der Entschlüsselung technisch nicht erreichbar.

**Beschluss B — Stärke-Schranke angeglichen.** Die zusätzliche Blockade bei schwacher
Passwort-Stärke im Einrichtungs-Pfad entfällt. Es gilt dieselbe Regel wie beim Anker-Passwort:
Mindestlänge acht Zeichen, Stärke-Anzeige hinweisend, nicht blockierend. **Dies überholt
ausdrücklich den Absatz „VP-Passwort-Härtung (06.07., aus dem Qwen-Angreifer-Review)" im
Nachlauf-Abschnitt unten** — der dortige harte Blocker `passwortStaerke(pw).stufe === 'schwach'`
ist entfernt. Korrektur eines Irrtums, keine neue Abwägung: U2-ADR-062 begründete die Schranke mit
„analog zum Depot-Passwort" — diese Annahme traf nicht zu, der Anker kennt nur die Grundprüfung
(leer / unter acht Zeichen), seine Stärke-Anzeige blockiert nicht. Es gab also nie einen Beschluss
zur Asymmetrie, sondern eine falsche Annahme über den Ist-Zustand.

## Kontext

Der Angehörigen-Modus (fünf read-only Situationsblätter, U2-ADR-060) hatte bis hier **keinen echten Zugangsschutz**: der Eintritt lief über das **Depot-Passwort** (Option B) — die Vertrauensperson lud das volle Depot in den Speicher, read-only war nur eine Render-/Gate-Schicht. Wer das Depot-Passwort kannte, konnte auch als Eigentümerin öffnen und alles bearbeiten.

Die Spec (ADR-061v3, Option A) verlangt ein **separates, physisch hinterlegtes Vertrauens-Passwort**, das nur einen verschlüsselten Allowlist-Ausschnitt aufsperrt — nie das volle Depot.

## Entscheidung

**(1) Cache = geprunter `data`-Subset der Fünf-Blatt-Allowlist**, verschlüsselt als **Umschlag-Geschwister** neben `ct` (`umschlag.angehoerigenCache`) — exakt das `notfallCache`-Muster (ADR-099), nur Chiffrat statt Klartext. `angehoerigenCacheModell()` läuft über `_ANG_SITUATIONEN` und sammelt genau die (quelle/feld) der fünf Blätter + den Identitäts-Namen fürs Banner. Nichts sonst.

**(2) Krypto AUSSERHALB des gepinnten Blocks** (`8d31c678…` byte-identisch). PBKDF2 + AES-256-GCM, hand-gerollt über WebCrypto — Muster wie die SHL-JWE (U2-ADR-047). **Befund:** der 200k-Legacy-Pfad des Blocks wurde am 12.06. ersatzlos entfernt (v3-only); die Angehörigen-Krypto lebt deshalb außerhalb.
> **FINALISIERT 06.07. (Nachtrag, ersetzt die frühere Fallback-Fassung):** PBKDF2 **fest 600.000 Iterationen — der 200k-Browser-Fallback ist gestrichen.** Grundlage: Mess-Anker 600k ≈ **44 ms/Ableitung** (Mac, Node WebCrypto) bzw. **54 ms** (Chromium-Preview); skaliert auf das schwächste realistische Ziel-iPhone (A9–A11, ~3–30×) bleibt 600k mit Reserve **< 2 s** — der Fallback feuerte auf realer Hardware nie. Vorteile: konstanter KDF-Aufwand ohne Mess-/Timing-Wahl (schlanker für den externen Review), kein throwaway-Mess-Derive mehr im Setup, **kein `iterations`-Feld im Cache-Header** (Header-Form **v2**; Entschlüsselung nimmt die Konstante). Kein Alt-Cache betroffen (Feature ungepusht). Zusätzlich: **Ladehinweis für langsame Geräte** im Eintritt (Button „Zugang wird geöffnet …" + „auf älteren Geräten kann das einen Moment dauern").
⚠ **AUFLAGE 1 (scharf):** dieser hand-gerollte PBKDF2-Pfad geht **vor Produktivschaltung durch einen externen Review** (analog JWE beim SHL-Strang). Die Fallback-Streichung **vereinfacht** den Review (konstant, kein Timing-Parameter), hebt ihn aber **nicht** auf.

**(3) Cache-only Frisch-Eintritt — ERSETZT Option B (zwingend, Produktentscheidung).** `angehoerigenAusUmschlag(umschlag, vertrauensPasswort)`: entschlüsselt NUR `angehoerigenCache`, setzt `data = Subset`, nullt die Session-Globals, betritt den Angehörigen-Modus. **Nie `depotLaden`, nie der Master-Schlüssel, nie das volle Depot.** Der frühere Option-B-Zweig (`cryptoOverlayOeffnen(alsAngehoerige)`) ist **entfernt** — die schwache Depot-Passwort-Tür ist **zu**, nicht neben der starken offen gelassen. Ein Depot ohne Cache lässt sich als Angehörige gar nicht öffnen (`kein-zugang`).

**(4) KEIN State-Wipe (Produktentscheidung).** Das reale Szenario ist die **abwesende Eigentümerin** (Krankenhaus/Pflegeheim/Tod): die Vertrauensperson öffnet **frisch vom Welcome** und lädt nur den Cache — das volle Depot ist nie im Speicher, es gibt nichts zu wipen. Option-As „State ersetzen" ist durch „nur den Cache laden" strukturell erfüllt. **Auflage 2 (heftige State-Wipe-Tests) damit vom Tisch.**

**(5) Owner-Setup** (Einstellungen → „Vertrauensperson einrichten"): Vertrauens-Passwort (min 8 + Wdh.) + Ort-Hinweis (Freitext + Beispiel-Platzhalter). Baut+verschlüsselt den Cache (Snapshot), legt ihn + den Ort-Hinweis in `data` ab, persistiert. Aktualisieren/Entfernen analog. **Aktivierung = Cache-Präsenz.** Das **Passwort selbst wird NIE gespeichert** — nur der Ort-Hinweis (kein Geheimnis).

**(6) Schema 26→27:** zwei additive Felder `angehoerigenCache` (Chiffrat|null) + `angehoerigen_passwort_ort` (Freitext). Migration defaultet beide. `angehoerigen_passwort_ort` aus `B16_IGNORE` genommen (Ort-Hinweis migriert regulär mit); `angehoerigen_passwort` bleibt ignoriert (das Passwort selbst nie).

## Status & Gates

- **Node-Suite 1190/0** (keine Regression). Neu: `tests/angehoerigen-cache-stufe2.test.js` (**7**): Krypto-Roundtrip + Header, Cache-Modell = nur Allowlist, Owner-Setup + Umschlag-Geschwister, **Master-Leak-Test** (finanzen NICHT im geladenen `data`), **Option B geschlossen** (ohne Cache `kein-zugang`), Entfernen, Migration 26→27. Umschlag-Form-Pins (`urheberschaft`/`umschlag-form`/`d43-etappe1`) + 12 Schema-Pins auf 27 nachgezogen.
- **Block-Pin `8d31c678…` (Krypto) + JWS-Pin `d0541ea7…` byte-identisch** — die Cache-Krypto liegt außerhalb.
- **SW-Cache v10→v11.** sha256-Pin `1a9d0e27…`.
- **Browser-Preview verifiziert:** echtes 600k in **78 ms** (Fallback-Messung wählte 600k), Cache-Header trägt `600000`; Owner-Setup-UI rendert; frischer Eintritt → 5 Karten, read-only, **kein Master-Leak**.
- **Kein Push** (eine Produktentscheidung).

## Betroffene Stellen

- `vivodepot.html`: `data`-Default (2 Felder) + Migration 26→27 + `B16_IGNORE`; Krypto/Cache-Bauer (`_angDeriveKey`, `_angWaehleIterationen`, `angehoerigenCacheVerschluesseln/Entschluesseln/AusUmschlag`, `angehoerigenCacheModell`); `depotSerialisieren` (+`angehoerigenCache`); `cryptoOverlayOeffnen` (Option-B-Zweig entfernt) + `angehoerigenEintritt`/`angehoerigenAusUmschlag`/`_internerUmschlagRoh`; Owner-Setup (`vertrauensperson*` + `flowVertrauensperson*`), Einstellungen-Abschnitt; STRINGS.
- `tests/load-kern.js` (Exporte); `sw.js` (v10→v11); `vivodepot.html.sha256`.

## Nachlauf

- **Krypto FINALISIERT (06.07., `feat(angehoerigen)`-Nachtrag):** PBKDF2 fest 600k, 200k-Browser-Fallback + `_angWaehleIterationen` gestrichen, `ANG_PBKDF2_ITERATIONEN` (600k) fest in `_angDeriveKey`, Cache-Header **v2** ohne `iterations`, Ladehinweis im Eintritt. Suite **1191/0** (die Stufe-2-Tests laufen jetzt echt mit 600k; `iterations`-Erwartungen → „kein iterations-Feld"). Block-Pin `8d31c678…` + JWS `d0541ea7…` byte-identisch. SW v12→v13, sha256 `453eefde…`. Browser: 600k = 54 ms, angModus-Overlay + Ladezustand verifiziert. **Damit steht die finale Angehörigen-Krypto.**
- **VP-Passwort-Härtung (06.07., aus dem Qwen-Angreifer-Review) — harter Blocker vollständig
  superseded, siehe Nachtrag 21.07.2026 (Beschluss B) oben:** der einzige reale Angriff auf den Cache ist Offline-Brute-Force gegen das Vertrauens-Passwort. Das Owner-Setup (`flowVertrauenspersonEinrichten`) erzwang nur `min 8`. Neu: **Live-Stärke-Balken** (`pwStaerkeAnzeigeVerdrahten('vp-pw','vp-pw-staerke')`) + **harter Blocker** — `passwortStaerke(pw).stufe === 'schwach'` verhindert das Einrichten (`STRINGS.vpFehlerSchwach`), analog zum Depot-Passwort. Beide Primitive sind in `sicherheit-block-b.test.js` gepinnt (schwach-Einstufung + Balken-DOM); die VP-Verdrahtung ist ihre Wiederverwendung. Suite **1191/0**, Boot fehlerfrei.
- **Auflage 1 (offen, scharf):** externer Krypto-Review des (jetzt fallback-freien, konstanten) PBKDF2-Pfads vor Produktivschaltung — läuft parallel, blockiert die Geräte-Abnahme nicht.
- **Startseiten-Eintritt — GELANDET (06.07., Nachtrag):** „Als Angehörige öffnen" steht jetzt sichtbar auf der **Welcome-Startseite** (`w-angehoerige`) — der starke Zugang wäre wertlos, wenn er versteckt ist; im Ernstfall muss die Vertrauensperson ihn ohne Anleitung finden. Führt in einen **Overlay-Angehörigen-Modus** (`renderCryptoOverlay(…, angModus)`): Primär-Aktion „Als Angehörige öffnen", Passwort-Label „Vertrauens-Passwort", **kein Eigentümer-Öffnen-Knopf** (keine Verwechslung). Reine Navigation, kein Krypto. Test im `angehoerigen-cache-stufe2.test.js`; SW v11→v12.
- Offen (klein): Entry-Door-Karte „zeig mir alles Wichtige"; stale Titel „Akut-Situationen".

## Konformität

```konformitaet
aussage:   Wer mit einem zweiten Passwort in eine fremde Datei kommt, bekommt NUR den Zuschnitt der
           Fünf-Blatt-Allowlist in `data` — nie das volle Depot, nie den Master-Schlüssel; kein
           Master-Feld (z. B. Finanzen/Steuer-ID) ist im geladenen Zustand erreichbar.
zustand:   prüfbar
pruefung:  tests/angehoerigen-blaetter-zuschnitt.test.js#[Z9·am Lauf] ein Fach-Empfänger sieht die Blutgruppe und NIE die Steuer-ID
quelle:    invariante
```

**NACHTRAG 21.08.2026 (F5 Zug 2) — der Mechanismus hat gewechselt, die Aussage nicht.** Der
Stufe-2-Cache selbst ist entfallen: er war ein Schnappschuss, der veraltete, während das Depot
weiterlebte. Die Empfängerkreise (U2-ADR-156) geben statt einer Kopie einen Schlüssel auf den
lebenden Bestand; ihre vier Bausteine ziehen aus denselben Angehörigen-Blättern. Die Zusage oben
gilt unverändert und wird über diesen Weg belegt — der Zuschnitt (`angehoerigenCacheModell`) trägt
weiterhin denselben Namen und dieselbe Grenze.

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
