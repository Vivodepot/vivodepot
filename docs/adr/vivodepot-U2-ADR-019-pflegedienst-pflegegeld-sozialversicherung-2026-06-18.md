# U2-ADR-019: Pflegedienst & Pflegegeld nach Sozialversicherung — Auflösung der Sektion pflegegrad-sek

**Status:** Akzeptiert
**Datum:** 18.06.2026
**Kategorie:** DATENMODELL, ARCHITEKTUR, UX
**Cross-Referenz (Produktiv-Kanon):** `ADR-075` (Cross-Sektor-Tabelle — von diesem Umzug nicht berührt, diese Felder werden nicht situations-gezogen), `ADR-063` (FHIR/IPS — beide Felder bewusst nicht im IPS-Bundle).
**U2-Bezug:** **U2-ADR-018** (Pflegegrad-Umzug — direkter Vorgänger; dieser ADR schließt die dort offen gelassene Label-/Sektions-Frage ab), `U2-ADR-010` (Feld-Architektur), `U2-ADR-008` (Wizard-Ziel-Mechanik `wizardSchrittZiel`), `U2-ADR-005` (Urheberschaft — gestempelter Schreibpfad unverändert). Migrations-Bezug: **D51** (B16→v3-Migrator).
**Drei-Anker:**
- **Code-Stelle:** Sektordefinitionen `SEKTOREN` — Auflösung der Sektion `pflegegrad-sek` (Bereich Gesundheit), Aufnahme von `pflegedienst_kontakt`/`pflegegeld` in `renten-pflege-soz` (Bereich Sozialversicherung) + pflwiz-Standardziel, in `vivodepot.html`, gespiegelt in `vivodepot-lesen.html`.
- **Sprint-Commit:** dieser Bau (Pflegedienst/Pflegegeld-Umzug + Auflösung pflegegrad-sek + pflwiz + zwei Test-Dateien).
- **ADR-Bezug:** dieser ADR (U2-ADR-019).
**Status heute:** gilt — Sektion `pflegegrad-sek` bleibt aufgelöst, Pflegedienst/Pflegegeld liegen in `sozialversicherung`/`renten-pflege-soz` (`vivodepot.html:6165`); der hier gemeldete Dubletten-Folgepunkt (`pflegedienst_kontakt`/`pflegedienst`) wurde am 29.07.2026 mit U2-ADR-116 §7 zusammengeführt.

---

## Kontext

U2-ADR-018 zog `pflegegrad`/`pflegegrad_seit` aus der Sektion `pflegegrad-sek` (Bereich Gesundheit) nach `sozialversicherung`/`renten-pflege-soz`. Zurück blieben in `pflegegrad-sek` die zwei pflwiz-B5-Felder `pflegedienst_kontakt` und `pflegegeld` (operative Pflege-Organisation). Damit trug die Sektion weiterhin das Label „Pflegegrad", obwohl der Pflegegrad sie verlassen hatte — ein **irreführendes Label**, das U2-ADR-018 ausdrücklich als offenen Folge-Punkt vermerkte.

`pflegedienst_kontakt` (ambulanter Pflegedienst) und `pflegegeld` (Pflegegeld/Pflegeleistungen) gehören sachlich zu Pflegekasse und Pflegegrad — alle vier sind die Pflege-Leistungs-Klammer (SGB XI), die seit U2-ADR-018 in `renten-pflege-soz` liegt. Der natürliche Schritt ist, die beiden letzten Felder nachzuziehen.

## Entscheidung

**`pflegedienst_kontakt` und `pflegegeld` ziehen aus `gesundheit`/`pflegegrad-sek` nach `sozialversicherung`/`renten-pflege-soz`, zu den bereits dort liegenden Pflegegrad-Feldern. Da damit das letzte Feld die Sektion verlässt, entfällt `pflegegrad-sek` in Gesundheit vollständig.**

1. **Sektion aufgelöst.** `pflegegrad-sek` wird entfernt. Der Bereich Gesundheit hat danach **eine** Sektion (die Haupt-Sektion). Das irreführende „Pflegegrad"-Label ist damit erledigt (Abschluss des U2-ADR-018-Folge-Punkts).
2. **pflwiz: Standardziel umgewidmet, nicht entfernt.** Geprüft, ob das Default-Ziel `gesundheit` entfallen kann: **Nein** — die Schritte 3/4 (Hauptpflege, Pflegezeit) zielen auf `meine-menschen`, Schritt 5 (Vorsorge) auf `vorsorge`; das Default trägt weiterhin die Schritte 0–2. Da nach diesem Umzug **alle** Schreib-Felder der Schritte 0–2 (Pflegegrad, Pflegedienst, Pflegegeld) in `sozialversicherung` liegen, wird das **Standardziel von `gesundheit` auf `sozialversicherung` umgewidmet**. Der mit U2-ADR-018 gesetzte Schritt-eigene Override am Pflegegrad-Schritt wird dadurch redundant und entfällt. **Kein pflwiz-Schritt schreibt mehr nach `gesundheit`.**
3. **Lese-App gespiegelt.** Auflösung der Sektion + Aufnahme der zwei Felder in `renten-pflege-soz` parallel in `vivodepot-lesen.html`.

## Konsequenzen

- **Bereich Gesundheit: eine Sektion statt zwei** (`sektoren-spec.test.js` von `length === 2` auf `1` nachgezogen). Keine Funktions-Änderung an der verbleibenden Haupt-Sektion.
- **Keine In-App-Migration** (v3 vor-produktiv, wegwerfbar; Linie wie U2-ADR-017/018).
- **D51-Vormerkung ergänzt.** Wie beim Pflegegrad muss der B16→v3-Migrator (D51) den v3-internen Sektor-Wechsel berücksichtigen: `pflegedienst_kontakt`/`pflegegeld` aus einem frühen v3-Depot (wo pflwiz sie noch nach `gesundheit` schrieb) gehören nach dem Umzug unter `sozialversicherung`/`renten-pflege-soz`. Anders als der Pflegegrad sind diese beiden Felder **nicht** im B16-Import-Mapping (keine Alt-B16-Schlüssel) — der Import-Pfad ist also nicht betroffen, nur die v3-interne Umlagerung. Vormerkung extern abgelegt (außerhalb des Repos).
- **FHIR-IPS und Notfall-QR unberührt** (weder Pflegedienst noch Pflegegeld sind Teil von beiden).
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258` unverändert (nur Datenmodell-Region). Suite 884/0 (1 bewusster FHIR-Skip).

## Offener Folge-Punkt (gemeldet, nicht in diesem Bau gelöst)

Im Bereich Sozialversicherung liegt seit jeher ein Modul-Feld `pflegedienst` (Sektion `schwerbehinderung-pflege`, `ebene: 'modul'`, „Ambulanter Pflegedienst — Name & Kontakt"). Mit dem hierher gezogenen `pflegedienst_kontakt` (Sektion `renten-pflege-soz`) gibt es nun **zwei** ref:institution-Felder für den ambulanten Pflegedienst im selben Bereich — eine Beinahe-Dublette. Bewusst **nicht** in diesem Bau zusammengeführt (Feld-Zusammenlegung berührt das Datenmodell, das pflwiz-Wiring und ggf. das Mapping — eigene Entscheidung). Empfehlung: in einem Folge-Auftrag prüfen, ob `pflegedienst` (Modul) zugunsten von `pflegedienst_kontakt` entfällt oder umgekehrt.

## Implementations-Verweis

Umgesetzt 18.06.2026 (clean-rebuild):
- **Kern** `vivodepot.html`: Sektion `pflegegrad-sek` entfernt; `pflegedienst_kontakt`/`pflegegeld` in `renten-pflege-soz` aufgenommen; pflwiz-Standardziel `gesundheit` → `sozialversicherung`, redundanter Schritt-0-Override entfernt, Kommentar nachgezogen.
- **Lese-App** `vivodepot-lesen.html`: gespiegelt.
- **Tests:** `wizard-pflwiz.test.js` (Standardziel, Ziel-Reihenfolge `sozialversicherung,sozialversicherung,sozialversicherung,meine-menschen,meine-menschen,vorsorge`, pflegegeld-Ort), `sektoren-spec.test.js` (Gesundheit eine Sektion).
