# U2-ADR-034: Wiedereintritts-Akteur — beim Entsperren gilt der Inhaber als 'selbst'

**Status:** Akzeptiert
**Datum:** 22.06.2026
**Kategorie:** ARCHITEKTUR, PROVENIENZ, BUGFIX
**Grundlage:** Rückkehrer-Datenverlust-Befund (intern, `befund-rueckkehrer-akteur-speichern-tot-2026-06-22.md`) + Produktentscheidung „Option A". Folge-Entscheidung zu U2-ADR-005 (Urheberschaft/Provenienz).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `inhaberAkteurEtablieren` / `_inhaberPersonIdFinden` (Drei-Stufen-Wiederfindung), Hook in `betreteApp()` (`if (!sitzungsAkteur && !imVorschau()) …`), additives Feld `data.inhaberPersonId` (in `leeresDepot` + beim Anlegen in `_depotAusPasswortFinalisieren` gesetzt), Sicherheitsnetz im `ui.modal`-Catch (`console.error` + `STRINGS.aktionFehlgeschlagen`-Toast); Tests `tests/wiedereintritt-akteur.test.js` (WA-1..11).
- **Sprint-Commit:** `e78f6db` (lokal, kein Push).
- **ADR-Bezug:** dieser ADR (U2-ADR-034).
**Status heute:** gilt — Beleg `inhaberAkteurEtablieren`/`_inhaberPersonIdFinden` (`vivodepot.html:17705`/`:17670`), `darfBearbeiten()`-Gate (der Ausschluss des Angehörigen-Modus entfiel am 19.09.2026 mit dem Modus, U2-ADR-NNN), Test `tests/wiedereintritt-akteur.test.js`.

---

## Kontext

Beim **Entsperren/Booten** eines bestehenden Depots setzte **kein** Pfad den Sitzungs-Akteur — nur das **Anlegen** tat es (`_depotAusPasswortFinalisieren`). Ein Rückkehrer hatte also `sitzungsAkteur === null`. Jeder urheberschaft-stempelnde Schreibvorgang (`urheberschaftAnhaengen` → `provenancEintrag`) warf daraufhin `Kein Sitzungs-Akteur gesetzt …`; beim Listen-Eintrag-Modal (Kind, Unterhalt, …) wurde der Wurf vom `ui.modal`-Catch **verschluckt** (kein Log, kein Toast) → toter Speichern-Knopf, leere Konsole. Betroffen war jedes `typ:'liste'`-Modal in Rückkehrer-Sitzungen — stiller Datenverlust.

Die Kernfrage berührte die Vollmacht-Architektur: Beim Entsperren weiß die App nicht, wer am Gerät sitzt — Inhaber oder Bevollmächtigte. Ein stilles „Inhaber"-Stempeln dürfte die Provenienz nicht verfälschen.

## Entscheidung

1. **Beim Wiedereintritt (Entsperren/Booten) gilt der Inhaber als `'selbst'`-Akteur.** `betreteApp()` etabliert ihn — aber NUR, wenn noch keiner gesetzt ist (der Anlege-Pfad hat ihn schon) und **nicht** in der Vorschau (passwortloses Probier-Depot ohne Inhaber).
2. **Bevollmächtigte stempeln ausschließlich über Sub-Depots** (`eigenschaft:'unter-vollmacht'`, gesetzt im Sub-Depot-Vertrauen-Flow), **nie direkt am Anker.** Der Anker-Akteur ist immer `'selbst'`.
3. **`data.inhaberPersonId`** — additives Feld — ist die eindeutige Quelle für die **dublettenfreie** Wiederfindung. Drei-Stufen-Reihenfolge in `_inhaberPersonIdFinden()`:
   1. gespeicherte `data.inhaberPersonId` (beim Anlegen gesetzt),
   2. jüngster Urheberschafts-Stempel mit **strikt** `eigenschaft:'selbst'` (ein `unter-vollmacht`-Akteur wird NIE als Inhaber wiedergefunden),
   3. per Identitäts-Name gematchte Person.
   `inhaberAkteurEtablieren()` setzt daraus den `'selbst'`-Akteur und heilt `data.inhaberPersonId` — Alt-Depots ohne das Feld werden beim ersten Wiedereintritt nachgezogen. Nur als letzter Ausweg (leeres Alt-Depot ohne jede Spur) wird eine Inhaber-Person neu angelegt.

## Begründung — die zwei verifizierten Vorbedingungen

Dass „Anker-Entsperren = Inhaber" eine **korrekte Architektur-Aussage** ist (und keine riskante stille Annahme), ruht auf zwei am Code verifizierten Vorbedingungen:

- **Der `angehoerigen`-Modus ist read-only.** Die zweite Entsperr-Tür „Als Angehörige öffnen" rendert eine reine Anzeige-Sicht (`renderAkutSituation` → `akutZeileHTML` → `feldWertHTML`, keine `data-edit`-Eingaben, kein Save-Pfad). Dort entsteht kein gestempelter Schreibvorgang — ein dort gesetzter `'selbst'`-Akteur wird nie verwendet, ist also harmlos.
- **Am Anker existiert kein `unter-vollmacht`-Schreibpfad.** `eigenschaft:'unter-vollmacht'` wird ausschließlich im Sub-Depot-Vertrauen-Flow gesetzt (`subDepotVertrauenOeffnen`), nie im Anker-Eintritt. Eine Bevollmächtigte, die am Anker einträgt, gibt es im heutigen Modell nicht. Damit ist der Anker-Akteur eindeutig der Inhaber.

Würde künftig ein Bevollmächtigter den Anker direkt pflegen sollen, müsste diese Regel neu entschieden werden (damals verworfene Optionen: einmal fragen / an die Tür koppeln). Heute: nicht vorgesehen.

## Konsequenzen

- **Rückkehrer können wieder speichern.** Listen-Einträge und Feld-Edits stempeln und sichern — mit **stabiler** Inhaber-personId (keine Personen-Dublette pro Entsperren) und korrekter Provenienz (strikter `'selbst'`-Filter schützt die Vollmacht-Linie).
- **Eigene Konsequenz — ein Fehler-schluckender Catch ist kein Sicherheitsnetz.** Der `ui.modal`-Catch hat den Wurf bisher still verschluckt und so den eigentlichen Bug unsichtbar gemacht. Ab jetzt **loggt** er **immer** (`console.error`) und **meldet** per Fehler-Toast (`STRINGS.aktionFehlgeschlagen`). Die nächste stille Ausnahme in irgendeinem Dialog-`onPrimaer` versteckt sich nicht mehr.
- **`data.inhaberPersonId`** ist additiv & rückwärts-kompatibel; Alt-Depots heilen sich beim ersten Wiedereintritt.
- Kein Krypto-Eingriff; Block-Pin `8d31c678…` unberührt. Suite 980/979/0 (1 skip), browser-verifiziert.

## Cross-Referenz

U2-ADR-005 (Urheberschaft/Provenienz — der `selbst`/`unter-vollmacht`-Akteur), U2-ADR-003 (Sub-Depot-Passwort — der Ort, an dem `unter-vollmacht` gesetzt wird), U2-ADR-031 (Persistenz/Wiedereinstieg — derselbe Wiedereintritts-Kontext; das Modal-Catch-Sicherheitsnetz schließt eine dort offene Flanke). Befund (intern, s. Grundlage). Produktiv: —

## Nachtrag (29.06.2026) — zweite Verteidigungsschicht am Schreib-Gate

Die oben als „read-only" verifizierte Vorbedingung ruhte bis hierher **allein auf der Render-Schicht**: `darfBearbeiten()` gab im `angehoerigen`-Modus TRUE zurück (`bearbeitung:'kein-subdepot'` ≠ `'gesperrt'`), und der Schutz entstand nur dadurch, dass `renderContentInner` auf die reine Anzeige-Sicht (`renderAngehoerigen` → `renderAkutSituation`) kurzschließt, **bevor** eine Eingabe-Affordanz gerendert wird. Das ist Ein-Schicht-Verteidigung — ein künftiger Render-Pfad, der versehentlich ein editierbares Feld im Angehörigen-Modus zeigte, würde vom Gate **nicht** gefangen. (Befund „Versprechen-vs-Realität", 29.06.: ein dadurch ausgelöster Fehl-Flag, nach Vier-Schichten-Klärung zurückgezogen.)

**Produktentscheidung (29.06.):** zweite Verteidigungsschicht **am Gate** ergänzen. `darfBearbeiten()` schließt den `angehoerigen`-Modus jetzt explizit aus:
`MODUS_DEF[_aktiv].bearbeitung !== 'gesperrt' && _aktiv !== 'angehoerigen' && !!aktuellerSitzungsAkteur()`.

- Die Konstante `bearbeitung:'kein-subdepot'` bleibt **unberührt** — sie trägt zusätzlich die Sub-Depot-Anlage-Sperre (`darfAnlegen`); ein Kippen auf `'gesperrt'` wäre Umwidmung gewesen. Der Ausschluss läuft über den Modus-Identifikator `_aktiv`, nicht über die Konstante.
- **Kein Kollateralschaden:** `anker` und `vollmacht` bleiben TRUE; `notfall` war schon FALSE.
- **Test (Gate-Ebene, neu):** prüfte `Modus.darfBearbeiten() === false` im Angehörigen-Modus und `=== true` im Anker — zweite Test-Ebene neben den bestehenden Render-Tests. (Der Angehörigen-Modus samt dieser Probe ist seit 19.09.2026 entfernt, U2-ADR-NNN; das Gate selbst — kein Schreibrecht ohne Sitzungs-Akteur, im Notfall-Modus gesperrt — gilt unverändert.)
- Kein Krypto-Eingriff; Block-Pins `8d31c678…`/`d0541ea7…` unberührt. Suite 1090/1089/0 (1 skip).

Damit hängt das read-only-Versprechen des Angehörigen-Modus nicht mehr an einer einzigen Render-Annahme.
