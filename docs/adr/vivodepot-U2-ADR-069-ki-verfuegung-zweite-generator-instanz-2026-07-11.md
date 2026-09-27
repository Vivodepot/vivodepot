# U2-ADR-069 — KI-Verfügung „Mein digitales Weiterleben" als zweite Generator-Instanz

**Datum:** 11.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 11.07.2026 (Node-Suite **1239/0**, VdCrypto-Block-Pin `8d31c678…` + JWS `d0541ea7…` byte-identisch, PV-Ausgabe weiterhin byte-identisch, Firefox-Verifikation grün; Annahme = Produktentscheidung).
**Status heute:** gilt — `KI_KORPUS`, `KI_MODUL` und der `kiwiz`-Wizard sind im heutigen `vivodepot.html` aktiv
(Zeilen 8623 ff.); der Instrument-Standort von `kiwiz` wurde seither in Folge-ADRs weiterentwickelt
(U2-ADR-096, U2-ADR-132, U2-ADR-136), die hier entschiedene Generator-Struktur besteht unverändert fort.
**Nummer:** U2-ADR-069 (höchste belegte in `docs/adr/` war U2-ADR-068).
**Typ:** Neue Instanz des geteilten Dokument-Generators + Datenmodell-Ersatz der KI-Sektion. **KEIN Schema-Bump (additive `ki_*`-Felder), Gate-Konsumenten + Block-Pins unverändert.**
**Bezug:** U2-ADR-068 (geteilter Generator, hier zweite Instanz) · `PRINCIPLES.md` (Wurzel 2, Andock-Infrastruktur) · Feldstruktur v0-1 (KI-Verfügung) · Forschungsgrundlage: Edilife-Bericht (IZEW/Fraunhofer 2024), Cambridge-Framework, Zürcher Neun-Dimensionen-Taxonomie.

---

## Kontext

Der geteilte Generator (U2-ADR-068) sollte an einer **zweiten** Instanz zeigen, dass ein weiteres Instrument
durch **Hinzufügen einer Wortlaut-Quelle** aufgeht, nicht durch einen Sonderbau (Weg 1 — der
Mechanismus trägt auf Instanz-Ebene). Die KI-Verfügung („darf nach meinem Tod eine KI-gestützte Nachbildung
meiner Person erstellt/betrieben werden — und unter welchen Bedingungen") ist die erste solche Instanz.

Ausgangslage: die KI-Verfügung war eine leichte 5-Fragen-Sektion (`ki_verhalten_*`) in Verwaltung — andere
Struktur als die verbindliche Feldstruktur v0-1, kein Generator, kein Personen-Bezug, keine Testament-Anlage.

Anders als die PV: die Bausteine sind **Forschungssynthese**, kein amtlicher Standard. Die Bindungswirkung
entsteht nicht aus dem Feldtext, sondern erst aus der **Form** (§ 2247 BGB, Einbettung ins Testament) und einem
benannten Nachlassverwalter. Diese Abgrenzung ist strukturell (Herkunftsanzeige), kein Etikett.

## Entscheidung

1. **KI_KORPUS** — Wortlaut-Quelle analog zu `PV_BMJ`: eine Quelle speist Wizard **und** Generator. Fünf Felder
   verbatim aus v0-1 (Grundentscheidung/Zweck · Personenkreis/Zugang · Datenumfang/Quellen/Befristung ·
   Kennzeichnung/Verhaltensgrenzen · Widerruf/Verwaltung), plus die „immer"-Bausteine, Eingangsformel, Schluss-
   formel, Herkunftsanzeige, § 2247-Formhinweis.
2. **kiwiz** — Wizard-Instanz (Schritte aus `KI_KORPUS.steps`, wie `pvwiz` aus `PV_BMJ.steps`). Ziel: Sektor
   `verwaltung` (heutige Heimat). Abschluss stellt die Testament-Anlage zusammen (`dokument: 'ki'`). Die
   verbatim-Bausteine werden im Wizard lesbar gezeigt (nicht als Dropdown) — deshalb Wizard, nicht Formular.
3. **KI_MODUL** — zweite Generator-Instanz. Ausgabe = **Testament-Anlage**, kopfseitig „Anlage zu meinem
   Testament — Verfügung über die KI-gestützte Nachbildung meiner Person", Herkunftsanzeige durchgängig,
   Schluss verweist auf § 2247 BGB. **Feld 1 (Grundentscheidung) ist der Eingang:** die Bedingungs-Bausteine
   der Felder 2–5 (inkl. Zweck/Ausschluss) sind auf `grundentscheidung = 'erlaubnis'` gated; bei „Untersagung"
   bleibt nur Eingangsformel + Grundentscheidung + Schlussformel.
4. **Nachlassverwalter** über den Personen-Mechanismus (`refMehrfach`, entitaet `person`) — „wie die Erben/
   Bevollmächtigten", kein Freitext. Ebenso die namentlich Berechtigten (Feld 2).
5. **Engine generalisiert** (additiv, PV-neutral): `sichtbarWenn` zentral in der Engine-Schleife → gilt für
   **alle** Blocktypen (auch `immer` — nötig, damit Feld 1 die Felder 2–5 unterdrückt); per-Option-Füllung
   `fuellByWert` (Freitext/Frist) + `refByWert` (Personen-Namen). PV wurde von `inlinePlatzhalter` auf
   `fuellByWert` migriert — die Golden-Fixture beweist Byte-Identität.
6. **Datenmodell:** die alten `ki_verhalten_*`-Felder sind aus dem Formular entfernt (Sektion `ki-verfuegung`
   trägt keine manuellen Felder mehr — wizard-getrieben). Sie **verwaisen** (weiter lesbar, keine Migration
   jetzt); der Umzug an den finalen Zielort reitet mit der **Gesamt-Migration** (Bild C). Additive `ki_*`-Felder,
   kein Schema-Bump.

## Wortlaut-Auflösungen ggü. v0-1 (transparent, keine Sinn-Änderung — für die spätere Rechtsprüfung markiert)

- **Befristung-Optionen 2/3** tragen in v0-1 ein „…" als Kürzel des Satz-Stamms; hier zum vollen Satz
  ausgeschrieben, damit jede Option **allein** (im Wizard/Dokument) lesbar ist.
  **Befristungs-Wortlaut (Option 2/3) festgelegt (11.07.), da v0-1 den Stamm mit „…" abkürzt;
  Stamm verbatim aus Option 1 desselben Feldes („Die Nachbildung und alle zugehörigen Trainingsdaten", Weg A) —
  bewusste Festlegung, keine stille Auflösung. Für die anwaltliche Runde markiert.**
- **Datenarten-Aufzählung** hat in v0-1 keine Einleitung — als reine Aufzählung gerendert (kein erfundener
  Einleitungssatz).
- **Ausfüll-Platzhalter** „___"/„(Name(n))" als runde Platzhalter `(Jahre)`/`(Zeitpunkt)`/`(Namen)`/`(Name)`,
  analog zu PV `(Zeitangabe)`.

## Konsequenzen

- Der geteilte Generator ist an **zwei** realen Instanzen validiert (PV amtlich, KI Forschungssynthese) — der
  Vertrag trägt auf Instanz-Ebene (Weg 1 bestätigt).
- Bürger-sichtbarer Kartenname **„Mein digitales Weiterleben"** (Produktentscheidung); Anlagen-Dokumenttitel
  wie festgelegt. Der Werkzeug-Charakter (kein Gate, kein Ablageort) und die Anlage-zum-Testament-Natur bleiben
  getrennt: Ersteres in der App, Letzteres auf dem erzeugten Dokument.
- **Offen (nächste Teil-2-Schritte):** vier leere Module strukturell einhängen · Bild C mit den zwei Karten-
  Schicht-Änderungen (per-`art`, Cross-Sektor) — dort wird `sichtbarkeit[]` zum ersten Mal real, nächster
  gemeinsamer Blick · Gesamt-Migration (u. a. `verwaltung.ki_*` → Zielort, Import-Aliase). Zweiter kleiner Stopp
  (Vollmacht-Record-Form) erst beim Vollmacht-Einhängen.
- **Offen:** anwaltliche Freigabe des KI-Verfügungs-Dokuments (Anlage-Konstruktion + § 2247-
  Verankerung) — bündelt sich mit dem PV-Blocker (Kassensturz Phase 8); blockiert den Bau **nicht**, nur die
  Veröffentlichung. Die drei Wortlaut-Auflösungen oben sind abgenommen (11.07.): Auflösung 2 + 3 als saubere
  Rendering-Entscheidungen ohne Sinnänderung, Auflösung 1 als bewusste **Festlegung** (Weg A). Die
  anwaltliche Runde prüft sie im Kontext der § 2247-Verankerung.

## Verifikation

- Node-Suite **1239/0** (+7 `tests/ki-generator.test.js`: Registrierung, Untersagung-Eingang, Erlaubnis-voll +
  Platzhalter-Füllung, Befristung-Varianten, Angehörigen-Pfad, Testament-Anlage-HTML, `_kiHatDaten`; die vier
  Alt-Tests der `ki_verhalten_*`-Struktur auf die neue Instanz umgestellt).
- **PV-Gate weiterhin byte-identisch** nach der Engine-Generalisierung (Golden-Fixture 42 Fälle, grün).
- Block-Pins byte-identisch (VdCrypto `8d31c678…` [Block-Hash == erwartet, byte-identisch zu PORT-VERBATIM.js],
  JWS `d0541ea7…`).
- **Firefox/Preview:** Verwaltung öffnet, KI-Sektion sichtbar, kiwiz „geführt ausfüllen" da, Dokument-Knopf da,
  Overlay zeigt Testament-Anlage-Kopf + Herkunftsanzeige + § 2247 + ersetzte Personen-Namen; keine Konsolenfehler.
- sha256 der Datei geändert (`6a494968…`); `BUILD_SHA256` bleibt leer (erst beim Release). SW-Cache **v34 → v35**.
  **Kein Push.**
