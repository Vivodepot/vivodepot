# U2-ADR-063 — Feldtyp `mehrfachauswahl` (Checkboxen, Array-Wert) + erste Anwendung vollmachtsGrundlage

**Datum:** 06.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 06.07.2026 (Suite 1200/0, Block-Pins byte-identisch, Boot fehlerfrei; Annahme = Produktentscheidung).
**Status heute:** gilt — der Render-Typ `mehrfachauswahl` ist aktiv (`_TEMPLATE_RENDER_TYPEN`,
`vivodepot.html` Zeile ~14323, Code-Kommentar „mehrfachauswahl ist seit U2-ADR-063 ein echter
Render-Typ") und breit im Einsatz (u. a. `gdb_merkmale`, `ki_zweck`, `ki_datenarten`,
`einkommensart`, `fuehrerschein`). Die im ADR selbst genannte Erstanwendung
`vorsorge/vollmachtsGrundlage` (Punkt 3) ist laut U2-ADR-064 §7 supersediert — das Feld ist heute
kein `mehrfachauswahl`-Sektorfeld mehr; der generische Mechanismus bleibt davon unberührt.
**Nummer:** U2-ADR-063 (höchste belegte in `docs/adr/` war U2-ADR-062).
**Typ:** Datenmodell (Schema 27→28) + neuer Render-Typ.
**Bezug:** U2-ADR-051 (Schema-26, additive Muster) · U2-ADR-037 (Template-Render-Typen) · U2-ADR-045 (Verwaisungs-Regel: Migration löscht keine Bürgerdaten) · Feldmodell (`auswahl`/`ref`/`liste`).

---

## Kontext

Die Inventur (06.07.2026) zeigte: der Feldtyp
`mehrfachauswahl` war NUR ein reservierter Wert im Template-Submission-Enum, **nicht implementiert**
(`_TEMPLATE_RENDER_TYPEN` schloss ihn aus, „übersprungen"). Mehrere Single-Select-Felder sind fachlich
mehrwertig, verteilt auf **drei** Mechanismen: (A) `auswahl→mehrfachauswahl` (fixe Optionen, mehrere
gelten), (B) `ref`→Personen-Liste (Erben, Bevollmächtigte, Notfallkontakte), (C) Einzel-/Nummer-Text →
`liste` (Konten). Entschieden: **Mechanismus A zuerst**, mit `vorsorge/vollmachtsGrundlage`
(„Art der erteilten Vollmacht") — der einzige saubere A-Kandidat; der Hint erzwang bisher „nur EINE",
real hält man mehrere Arten (Vorsorge-, Gesundheits-, Bank-, Betreuungs-, Generalvollmacht).

## Entscheidung

**(1) `mehrfachauswahl` wird ein echter Render-Typ.** Speicherform = **Array** gewählter `wert`.
- Eingabe: Checkboxen (`feldInputHTML` `case 'mehrfachauswahl'`, `data-edit-multi="fid"`), Sammlung
  gruppiert nach fid → Array (Sektor-Save Block (d); Wizard-Reader `_wizardAktuellerWert`).
- Validierung: `feldValidieren` — jedes Array-Element muss eine Option sein (sonst `grund:'auswahl'`).
  `feldEingetragen` behandelt leeres Array als leer. `wizardSchrittSetzen` coerct Skalar→Array.
- Aufgenommen in `_TEMPLATE_RENDER_TYPEN` (Template-Felder dieses Typs rendern jetzt auch).

**(2) Anzeige — Auflage 1 (scharf): nie das rohe Array.** `feldWertText` **und** `feldWertHTML`
bekamen einen `mehrfachauswahl`-Zweig: Array → Labels, „, "-getrennt („Vorsorgevollmacht,
Generalvollmacht"). Damit zeigen **alle** Ausgaben sauber — PDF-/QR-/verbatim-/Situations-/Angehörigen-
Pfade laufen durch diese zwei Funktionen (`akutZeileHTML → feldWertHTML`; PDF/QR → `feldWertText`).

**(3) `vorsorge/vollmachtsGrundlage`** umgestellt `auswahl → mehrfachauswahl` (Sektor-Def + vvwiz-Def).
Optionen unverändert (Teilmenge der `VERTRETUNGS_GRUNDLAGEN` bleibt gewahrt). Der session-`akteur`-
`vollmachtsGrundlage` (Sub-Depot-Vertretungsbasis → FHIR) ist ein **anderes** Datum und bleibt unberührt.

**(4) Migration 27→28 — Auflage 2 (scharf): kein Bürgerdaten-Verlust.** `depotNormalisieren`
hebt einen gespeicherten Skalar-String auf ein 1-Element-Array (`'vorsorge' → ['vorsorge']`).
**Verwaisungs-Regel (U2-ADR-045):** ein Alt-Wert, der keiner aktuellen Option entspricht, **bleibt
erhalten** im Array (keine Löschung). Leerer String → Feld entfällt (kein `['']`). Bereits-Array
bleibt unberührt (idempotent — ein Array matcht `typeof string` nie). Import (`_wertAusText`) spaltet
einen „Label, Label"-String verlustfrei in ein Array.

## Status & Gates

- **Node-Suite 1200/0** (+9 `tests/mehrfachauswahl.test.js`: Feld-Def, Auflage-1-Anzeige text+HTML,
  feldInputHTML-Checkboxen, feldValidieren, wizardSchrittSetzen-Array, **Auflage-2-Migration** inkl.
  Verwaisungs-Regel + Idempotenz). Schema-27-Pins in ~10 Test-Dateien auf 28 gezogen; der Template-
  Render-Test nutzt jetzt `ref` als „übersprungenen Typ" (mehrfachauswahl rendert nun); vvwiz-
  Assertions auf Array (`.join(',')`, cross-realm-sicher).
- **Block-Pin `8d31c678…` + JWS `d0541ea7…` byte-identisch** (Änderungen außerhalb der Blöcke).
- **Boot browser-verifiziert** (keine Konsolen-Fehler). Der DOM-Checkbox-Einsammel-Pfad ist logisch
  über die Unit-Tests + das bewährte ref/code-Sammel-Muster abgesichert; kein voller Klick-Durchlauf.
- SW v16→v17, sha256 nachgezogen. **Kein Push.**

## Nachlauf
- Mechanismus **B** (Multi-Ref: Erben/Bevollmächtigte/Notfall) + **C** (Konten-`liste`) bleiben eigene,
  größere Datenmodell-Vorhaben — getrennt zu entscheiden.
- Grenzfall-Kandidaten für weitere `mehrfachauswahl`: `ki_verhalten_fuer_wen/rahmen` (KI-Verfügung).

## Nachtrag (10.08.2026) — Auftrag „F4 und F5", Zug 2/4

**`gdb_merkmale`** (sozialversicherung, § 3 SchwbAwV, acht Merkzeichen) ist das erste
`mehrfachauswahl`-Feld als GEWÖHNLICHES Sektorfeld — alle bisherigen Fälle (`vollmachtsGrundlage`,
`ki_zweck`, `ki_datenarten`, `vm_gesundheit_freiheitsentzug`) stehen entweder direkt in `vorsorge`
oder hinter einem Instrument-Detail-Modal. Zwei Dinge, die dieser erste Fall außerhalb eines Modals
sichtbar gemacht hat und die künftige `mehrfachauswahl`-Felder wieder treffen können:

**(a) Trefferflächen-Spannung.** Fixliste Nr. 6 (WCAG 2.5.8, `tools/lib/trefferflaechen.js`) misst
jedes `input:not([type=hidden])` EINZELN, nicht nur die Label-Zeile — und maß dadurch erstmals ein
mehrfachauswahl-Kästchen im offenen Sektor-Erhebungsraum. Das native 13×13px-Kästchen fiel unter die
24px-Pflichtgröße, obwohl A104 (05.08.2026) bewusst entschieden hatte: Kästchen bleibt 13×13
sichtbar, das umschließende `<label class="feld-mehrfach-opt">` trägt die Trefferfläche (WCAG
2.5.8s „Equivalent Target"-Ausnahme — ein gleichwertiges, ausreichend großes Bedienelement macht ein
kleineres gleichbedeutendes Ziel zulässig). Diese Ausnahme kennt `erheben()` heute nicht; sie war
bislang folgenlos, weil kein `mehrfachauswahl`-Feld je in Nr. 6s Zehn-Sektoren-Erhebungsraum
gerendert wurde. Behoben feld-spezifisch für `gdb_merkmale` (`vivodepot.html`, CSS-Selektor über
`data-edit-multi="gdb_merkmale"`) — der allgemeine Fix (Equivalent-Target-Ausnahme in
`tools/lib/trefferflaechen.js`, analog zur bestehenden Fließtext-Ausnahme) ist eine Änderung an
einem eng gehaltenen, mehrfach rotmachbar geprüften Dauerwächter und zurückgestellt, keine
Entscheidung dieses Zugs.

**(b) Migration bei komma-formatiertem Alt-Text.** Auflage 2 oben (Skalar → 1-Element-Array) reicht
NICHT, wenn das Alt-Feld selbst schon ein komma-getrennter Mehrfachwert als EIN String war —
`gdb_merkmale` trug bis zu diesem Zug `typ:'text'` mit `beispiel: 'G, RF'`, also genau dieses
Format. Ein reiner 1-Element-Wrap hätte „G, RF" als EIN nicht-passendes Element abgelegt, keine
Checkbox hätte es gezeigt, ein nachfolgendes Speichern hätte es verloren. Migration Schema 48→49
nutzt darum `_wertAusText` (dieselbe Komma-Split-/Options-Aufloesungs-Logik wie der Import-Zweig)
statt eines reinen 1-Element-Wraps — unzugeordneter Rest bleibt verlustfrei als eigener
Freitext-Eintrag stehen. Wer ein Textfeld mit historisch komma-getrenntem Beispielformat auf
`mehrfachauswahl` umstellt, sollte dieselbe Prüfung machen, nicht automatisch Auflage 2 annehmen.

## Nachtrag (27.08.2026) — Screenshot-Review Befund C: Checkbox-Zeilen → Pillen-Knöpfe

Die Entscheidung oben („Eingabe: Checkboxen") betraf das SICHTBARE Bedienelement, nicht das
Datenmodell — und nur das Bedienelement ändert sich hier. Produktwunsch aus einem Screenshot-
Review: native `<input type="checkbox">`-Zeilen wirken klein/veraltet; ersetzt durch antippbare
Pillen-Knöpfe (`<button type="button" class="feld-mehrfach-pill">`, `aria-pressed`
true/false statt `.checked`). Betroffen: `feldInputHTML` case `'mehrfachauswahl'`, die DOM-
Sammel-Logik in `bearbeitungSpeichern` Abschnitt „d" und `_wizardAktuellerWert` (lesen jetzt
`aria-pressed` statt `.checked`), ein neuer Klick-Verdrahter (`_pillMehrfachKlick`, feuert ein
synthetisches `change` fürs bestehende Autosave-Gate).

**Unverändert:** Speicherform bleibt ein Array gewählter `wert` (Punkt 1 oben), Validierung/
Anzeige (Punkte 1–2) sind vom Bedienelement unabhängig und bleiben exakt wie beschrieben. `data-
edit-multi="fid"` bleibt der Sammel-Anker.

**Damit veraltet:** Der `.feld-mehrfach-opt`-Verweis im Nachtrag 10.08.2026 (a) oben beschreibt
ein Bedienelement, das es nicht mehr gibt — das native 13×13px-Kästchen samt umschließendem
`<label>` ist entfallen, die Trefferfläche IST jetzt der Knopf selbst (`min-height:32px`, kein
Equivalent-Target-Sonderfall mehr nötig). A104s Kästchen-spezifische Probe (`tests/e2e/a104-
kaestchen-trefferflaeche.spec.js`) misst seither die Pillen-Knopf-Fläche direkt.

Bei einer künftigen Widerherstellung von Checkboxen (z. B. für einen Radio-artigen Anwendungsfall):
Diesen Nachtrag lesen, nicht Punkt 1 der ursprünglichen Entscheidung als aktuellen Stand
missverstehen.
