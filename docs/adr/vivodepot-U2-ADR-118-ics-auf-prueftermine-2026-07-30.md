# U2-ADR-118: Der ICS-Kalender hängt an den Prüfterminen — Instrument-Datum wird Dokument

**Status:** Angenommen
**Datum:** 30.07.2026
**Kategorie:** DATENFLUSS, EXPORT, WAHRHAFTIGKEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-096 (schaffte das Flachfeld `testament_datum` ab — der Anlass) ·
U2-ADR-014 (Dokument-Register + Prüftermine) · U2-ADR-113 (Testament ohne Prüfintervall, C15/C16) ·
U2-ADR-025 (Vivodepot berät nicht)
**Anker:** Fixlisten-Posten C7 (Weg 1 + Weg 3), C14/C15/C16, A22/A24 · bindende Guardrail
`memory/guardrail-xshare-deliverable-4-geschuetzt.md`
**Status heute:** gilt — `icsKalender`, `_dokumentTypRegistrieren` und `nurExport` (auf
`ics-vorsorge`) stehen unverändert in `vivodepot.html`, der ICS-Import (`importIcsLabel`) bleibt
entfernt, die Rotmachbarkeits-Tests `tests/fix-c7-instrument-dokument.test.js` und
`tests/weitere-formate.test.js` existieren weiter (gemessen 15.08.2026).

---

## Kontext

Der ICS-Kalender-Export war **wirkungslos** ⟦M⟧. `icsKalender` las ein einziges Flachfeld,
`vorsorge.testament_datum` — das U2-ADR-096 abgeschafft hatte (`feldDefFuer` liefert `undefined`).
Ein Depot, das ein Testament über den echten Weg erfasst (`vorsorge_instrumente`, `typ:testament`),
erzeugte **null VEVENT**. Grün war der Round-Trip nur, weil `tests/fixtures/referenzdepot.js` das
abgeschaffte Feld noch setzte — die Klasse „Test speist toten Datenweg".

Zwei Fragen waren zu klären: **woher** der Kalender seine Termine nimmt, und **ob** ein Instrument,
das man einträgt, überhaupt einen Prüftermin bekommt.

## Entscheidung

### Weg 3 — das Instrument erzeugt sein Dokument

Das Eintragen einer `vorsorge_instrumente`-Zeile **mit Datum** registriert einen Dokument-Datensatz
über **dieselbe** Registrierung wie der Wizard-Abschluss. `_dokumentTypRegistrieren(typ, sektorId,
gueltigAb, jetzt)` ist aus `wizardDokumentRegistrieren` herausgelöst (keyed by TYP); beide rufen
ihn — der Wizard über die Wizard-Map, der Instrument-Eintrag über `instrumentDokumentNachtragen`.
**Zweite Aufrufstelle, keine zweite Regel.** Idempotent, Dedup-by-typ; ohne Datum entsteht nichts;
ein Typ ohne Standard-Definition ergibt still nichts. Gehakt in `flowListenEintragHinzufuegen` UND
`-Bearbeiten` (auch ein nachgetragenes Datum registriert).

### Weg 1 — der ICS liest die Prüftermine, reiner Export

`icsKalender` liest jetzt `prueftermineDokumente` (`data.dokumente` → `faelligAm`), **nicht** mehr ein
Flachfeld. Jeder datierte Dokument-Datensatz **mit berechneter Fälligkeit** wird EIN VEVENT auf
seinen **nächsten Prüftermin** (`DTSTART = faelligAm`). Der ICS-**Import** (`ics-vorsorge`,
`parseICS`/`_icsFelder`, `STRINGS.importIcsLabel`) ist **entfernt** — ein Kalendereintrag ist ein
**Abkömmling** des Depots, keine Quelle. ICS ist reiner Export (`nurExport`).

### Die entschiedene Semantik (C14/C15/A24) — und was sie ÜBERHOLT

Ein **Testament** mit Datum erzeugt ein **Dokument** (Weg 3), aber **keinen Prüftermin** und
**keinen VEVENT**: es liegt auf der Ereignis-Achse (C15), trägt kein Intervall (U2-ADR-113) → in
`prueftermineDokumente` als „ohne Rhythmus" ohne `faelligAm` → vom `faelligAm != null`-Filter (C14)
ausgeschlossen. **Das ist grün, nicht rot** (A24) — die Prüfungen halten es ausdrücklich fest.

Damit ist die **frühere Weg-1-Abnahme vom 28.07.** („Testament → 1 VEVENT auf `DTSTART:20210912`")
**überholt**. Sie stammte vor C14/C15; der Kalender trägt nicht das Ausstellungsdatum, sondern die
nächste Fälligkeit, und ein Instrument ohne Fälligkeit trägt keinen Termin.

## Die drei Auflagen (C7)

1. **Deklarierte Fähigkeit verschwindet — dieser ADR.** `STRINGS.importIcsLabel` („Termine aus dem
   Kalender einlesen") und das Import-Format fallen aus dem Einlese-Wähler; `vorsorge` hat danach
   **kein** eigenes Einlese-Format mehr (im Test festgehalten). **Guardrail-Auflage, belegt:** der
   entfernte ICS-Kalender-Import (`ics-vorsorge`) ist **NICHT** der FHIR-Import (xShare Deliverable 4)
   — ein anderer Pfad, an keiner der `ics-vorsorge`-Stellen berührt (gegengeprüft: kein
   FHIR/SHL/IPS/custodian-Bezug). **Oberfläche gegengeprüft:** keine App-Zeichenkette behauptet den
   ICS-Import noch. **Website:** liegt auf der Website-Strecke (aus dem Repo nicht prüfbar) — dort ist zu
   sehen, ob die ICS-Einlese-Fähigkeit sonst noch behauptet wird.
2. **`nurExport` eingeführt, Ebene 5 respektiert ihn.** Ohne das würfe der Round-Trip-Wächter
   (`ebene5`, über jedes `EXPORT_FORMATE`) aus dem fehlenden Reimport einen Fund und das Push-Gate
   würde rot. `nurExport` (symmetrisch zu `nurImport` bei CAMT/XMeld) überspringt reine Export-
   Formate — nicht still, sondern als `uebersprungenNurExport` gemeldet.
3. **„Erledigt" heißt nicht „nützt jemandem".** Ein Testament mit Datum bekommt ein Dokument, aber
   keinen Kalendereintrag — s. o.

## Rotmachbarkeit (Regel 18)

`tests/fix-c7-instrument-dokument.test.js` (Weg 3 + A24) und `tests/weitere-formate.test.js` (Test 9
„ein Dokument mit Rhythmus → ein VEVENT auf `faelligAm`", 9b „ein Testament → kein VEVENT"). Für 9b
gepflanzt (auf einer Kopie, `KERN_HTML_PATH`): läse der ICS `data.dokumente` mit `gueltigAb` statt der
Prüftermine mit `faelligAm` (der alte Weg-1-Fehler), erschiene das Testament als VEVENT → 9b wird ROT;
Original grün. Der `testament_datum`-Fixture-Beleg ist mit-entfernt (`fixture-felder-im-modell` hatte
ihn als „Erst C7, dann darf es hier weg" vorgemerkt).

## Konsequenzen

- **Der Kalender ist ehrlich:** er zeigt echte, aus dem Depot abgeleitete Fälligkeiten, nicht ein
  totes Feld. Ein Instrument einzutragen genügt — der Termin folgt.
- **Kein Reimport für ICS.** Wer eine `.ics` einlesen will, findet dafür kein Angebot mehr; das ist
  gewollt (ein Kalender ist keine Quelle für ein Depot).
- **Deliverable 4 unberührt** — der FHIR-Import/SHL/IPS-Export/Provenance-custodian sind andere Pfade;
  C7 hat keine Deckung davon entfernt.
