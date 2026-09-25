# U2-ADR-052 — Wortlaut-Findings aus dem iOS/Desktop-Test (04.07.): Speicher-Zusage, Provider-Import, Bereich-Tür, Wizard-Zielbereiche

**Datum:** 04.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 04.07.2026 (Suite/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — `einlesenBereichKnopf` und `wizardZielBereichNamen` sind im heutigen Kern aktiv (`vivodepot.html`).
**Nummer:** U2-ADR-052 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-051).
**Typ:** Wortlaut/UX-Transparenz (kein Krypto, keine Datenmodell-Änderung).
**Bezug:** iOS/Desktop-Test 04.07. (Findings 1/8/3/13, darunter Finding 15 = Zielbereich-Transparenz, hier als Finding 13 umgesetzt) · U2-ADR-011 (RAM ≠ Datei, Pausen-Zusage) · U2-ADR-046 (Rein/Raus-Türen).

---

## Kontext

Der Geräte-Test zeigte vier Stellen, an denen der Wortlaut in die Irre führte oder zu technisch war — keine Logik-Fehler, aber Verständlichkeits- bzw. Ehrlichkeits-Lücken.

## Entscheidung

**Finding 1 — Speicher-Zusage ehrlicher.** `pausenErlaubnis`: „Sie können jederzeit pausieren. Ihre Eingaben bleiben in dieser Sitzung erhalten — zum dauerhaften Sichern den Speichern-Knopf nutzen." → **„Solange dieses Fenster offen ist, bleiben Ihre Eingaben erhalten. Zum echten Speichern auf Ihr Gerät den Speichern-Knopf drücken."** Konkreter (Fenster statt „Sitzung"), und „echtes Speichern auf Ihr Gerät" benennt die Datei-Wahrheit ohne Fachwort. Bleibt Sie-Form.

**Finding 8 — Provider-Import bürgernah.** `importProviderLabel`: „Signiertes Anbieter-Zertifikat einlesen (geprüft)" → **„Geprüftes Dokument einer Einrichtung einlesen"**. „Zertifikat"/„signiert" sind Krypto-Fachworte; „geprüftes Dokument einer Einrichtung" trägt dieselbe Zusicherung in Bürger-Sprache. Nur das Label; die fail-closed-Signaturprüfung dahinter (Ebene 3a) ist unberührt.

**Finding 3 — zwei Türen, zwei Wortlaute.** Die **zentrale** Sidebar-Tür bleibt „Daten einlesen" (`einlesenKnopf`). Die **bereichslokale** Tür in „Weitere Möglichkeiten" heißt jetzt **„In diesen Bereich einlesen"** (neuer String `einlesenBereichKnopf`) — sie sagt, WOHIN eingelesen wird, und ist damit von der zentralen Tür unterscheidbar (beide teilten vorher denselben String).

**Finding 13 — Wizard-Zielbereiche vor Schritt 1.** Ein bereichsübergreifender Wizard trägt an **feste** Ziele ein (Finding 15 des Geräte-Tests vom 04.07.). Vor dem ersten Schritt steht jetzt: **„Diese Angaben werden eingetragen in: [Bereich A, B und C]."** Neu: `wizardZielBereichNamen(def)` leitet die **distinkten** Zielbereich-Labels in Schritt-Reihenfolge aus den Schritt-Zielen ab (read-only); `_wizZieleSatz` formatiert die deutsche Aufzählung („A, B und C"). Die Transparenz kommt damit VOR die Eingabe, nicht erst in den Abschluss-Toast.

## Begründung

- **Ehrlichkeit vor Beruhigung:** Finding 1 sagt klar, dass die Eingaben an das offene Fenster gebunden sind — kein falsches „gespeichert".
- **Bürger-Sprache:** Finding 8 nimmt das einzige verbliebene Krypto-Fachwort aus der Import-Auswahl.
- **Ort statt Wiederholung:** Finding 3 gibt der zweiten Tür eine eigene Aussage statt einer Dublette.
- **Transparenz am Anfang:** Finding 13 setzt die Zielbereich-Nennung an den Punkt, an dem der Bürger sie braucht (vor dem Eintragen), rein aus den bestehenden festen Schritt-Zielen abgeleitet.

## Konsequenzen

- Positiv: vier Verständlichkeits-/Ehrlichkeits-Lücken geschlossen; die Wizard-Ziel-Transparenz (offener Punkt aus Finding 15) ist umgesetzt.
- Kosten: minimal — vier Strings/ein Helfer; keine Verhaltens-, Schema- oder Krypto-Änderung.

## Verifikation

- **Neu** `tests/wortlaut-findings.test.js` (5 Tests): Finding-1-Wortlaut (Fenster/Speichern-Knopf, kein „pausieren" mehr); Finding-8-Label (kein „Zertifikat"); Finding-3 (zwei unterscheidbare Tür-Strings); Finding-13 (`wizardZielBereichNamen` für umzwiz=Identität/Verwaltung/Wohnen, heirwiz, anamwiz=nur Gesundheit; `_wizZieleSatz`-Aufzählung A / A und B / A, B und C).
- `tests/sektor-maschine.test.js` nachgezogen: die Sie-Form-Stichprobe prüft jetzt die String-Konstante statt des alten Wortlauts (übersteht Umformulierungen).
- Node-Suite **1133/1133 (0 fail, 0 skipped)**, Konformitäts-Gates **11/11** (WCAG 33 Sichten/0 Violations — neue `.wizard-ziele`-Zeile kontrast-konform). **Block-Pin `8d31c678…` unberührt** (Harness 24/0). `vivodepot.html.sha256` nachgezogen. Kein Push.
