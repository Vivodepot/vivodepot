# U2-ADR-011: Auto-Save beim Bereichs-Wechsel — die Pausen-Phrase trägt eine Mechanik

**Status:** Akzeptiert
**Datum:** 30.05.2026
**Kategorie:** UX, ARCHITEKTUR
**Cross-Referenz:** UX-Spec V/VII (Pausen-Erlaubnis, „Sie können jederzeit pausieren"), U2-ADR-005 (Urheberschaft pro Eintrag), U2-ADR-006 (Andock, Code-Slot pro Feld).
**Status heute:** gilt — `bearbeitungSpeichern()` im Kern vorhanden (`vivodepot.html:24024`), Beleg `tests/auto-save.test.js`.

---

## Kontext

Die Stimme verspricht **„Sie können jederzeit pausieren."** als Abschluss-Zeile pro Bereich (UX-Spec VII, verbindliche Phrase). Beim ersten Sektor-Bau wurde sichtbar: der Text trug heute keine Mechanik. Wer im Edit-Modus tippte und ohne „Fertig" auf einen anderen Sektor klickte, auf das Topbar-Speichern drückte oder den Modus wechselte, **verlor die offenen Eingaben.** Das Pausen-Versprechen war damit eine ehrliche Unwahrheit — der Bürger las eine Zusicherung, die der Code nicht einhielt.

Drei Auslöser, an denen das Versprechen heute brach:

- `oeffneSektor(sektorId)` und `oeffneVerwaltung()` — Sektor-/Ansichts-Wechsel.
- Modus-Wechsel über die Topbar-Affordance (`tb-modus-select`).
- Topbar-Speichern (`tb-speichern`) — verschlüsselte das Depot, ohne die offene Edit-Session zu übernehmen.

## Entscheidung

**Auto-Save beim Bereichs-Wechsel.** Vor jeder dieser Aktionen wird die offene Edit-Session abgeschlossen wie ein „Fertig"-Klick: gestempelt (U2-ADR-005), Code-Slot pro geändertem Feld angelegt (U2-ADR-006), persistent in `data`.

Die Logik ist in eine Top-Level-Funktion **`bearbeitungSpeichern()`** extrahiert und sektor-agnostisch:

- liest die `data-edit`- und `data-edit-ref`/`data-edit-override`-Inputs des aktiven Sektors aus dem aktuellen DOM-Stand,
- baut für `ref`-Felder `{ref, override}` zusammen,
- schreibt über `kernAPI.schreibBereich(sektorId, neu)`,
- stempelt geänderte Felder über `urheberschaftAnhaengen` und legt Code-Slots an,
- liefert `true`, wenn etwas gespeichert wurde, `false` sonst.

Aufrufer:

- `oeffneSektor()`, `oeffneVerwaltung()` rufen sie vor dem Wechsel.
- `tb-modus-select.onchange` ruft sie, bevor `Modus._setzeIntern(...)` umstellt.
- `tb-speichern.onclick` ruft sie, bevor `kernAPI.speichern()` das Depot verschlüsselt.
- Der `b-fertig`-Klick-Handler nutzt dieselbe Funktion (Code-Dedup).

Kein feldspezifischer Code, kein Sektor-Name im Auto-Save-Pfad. Auch listen-/foto-Felder, die heute schon mit eigenen Modal-Flows direkt persistieren (Listen-UI in U2-ADR-010), bleiben unberührt — sie speichern sowieso sofort. Auto-Save fängt nur die **skalaren** Edit-Inputs, die noch im DOM stehen.

## Konsequenzen

- **Eingaben überleben jede Navigation.** Wer „Maria" tippt und auf einen anderen Sektor klickt, findet bei der Rückkehr „Maria" — gestempelt, mit Urheberschaft.
- **Die Pausen-Phrase trägt eine Mechanik.** Aus Lippenbekenntnis wird ehrliche Zusicherung. UX-Spec VII ist baulich erfüllt, nicht nur textlich.
- **Künftige Feld-Typen erben das.** Das foto-Feld und alle weiteren generischen Typen, die über `data-edit*`-Attribute rendern, werden automatisch mitgespeichert.
- **Kein zusätzlicher Stempel-Traffic.** Auto-Save stempelt nur die tatsächlich geänderten Felder (vergleicht mit dem vorigen Wert). Unveränderte Sektoren erzeugen keine Stempel.
- **Konsistent mit der Übergabe-Disziplin.** Beim Topbar-Speichern wird die offene Edit-Session zuerst übernommen, dann das Depot verschlüsselt — keine verlorenen Eingaben am Datei-Save.

## Implementations-Verweis

- **Kern-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 30.05.2026)*** — `bearbeitungSpeichern()` extrahiert, an `oeffneSektor`/`oeffneVerwaltung`/`tb-modus-select`/`tb-speichern` verdrahtet; b-fertig delegiert.
- **Suite-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 30.05.2026)*** — `tests/auto-save.test.js`: Existenz der Funktion, Navigations-Anker, direkte sektorFeldSetzen-Pfad-Stabilität.
- **Browser-Verifikation:** „Maria" + „089-1234567" eingetippt im Identitäts-Edit-Modus, Wechsel zu Meine Menschen, Rückkehr — beide Werte sichtbar, je ein Stempel, Urheberschafts-Beleg „Eingetragen von Maria Beispiel (selbst), 2026-05-30".
- **Block-Hash unverändert:** `6eb590b939326eaf6e74aad172734a4c17a5e22fa1fccc325c867b3ad4f56d05`.
