# U2-ADR-091 · Persistenz-Trigger für refMehrfach-Widgets

**Datum:** 20.07.2026
**Status:** Angenommen · gebaut 20.07.2026 (Weg 1, Suite grün, Browser-Abnahme am Referenzdepot bestanden)
**Status heute:** gilt — `_autoSaveWennFeld` (`vivodepot.html:32835`) prüft weiterhin `data-refm`
in der Allowlist, der Kommentar an der Stelle verweist ausdrücklich auf diesen Fix (20.07.).
**Bezug:** eigene Erhebung „Persistenz-Lücke Autosave" (20.07.2026, drei Teile) ·
U2-ADR-065 (refMehrfach-Mechanik) · U2-ADR-011 (Auto-Save beim Bereichs-Wechsel — die hier
erweiterte Grundfunktion)

---

## 1 · Der Fund

`_autoSaveWennFeld` (vivodepot.html, damals Zeile 20841–20852) persistierte Feld-Änderungen
nur, wenn das auslösende DOM-Element eines von fünf Attributen trug: `data-edit`,
`data-edit-ref`, `data-edit-override`, `data-chip-eingabe`, `data-chip-liste`. Das
refMehrfach-Widget (U2-ADR-065) meldet seine Änderungen aber über `melden()`
(`box.dispatchEvent(new Event('change', {bubbles:true}))`) auf der `[data-refm]`-Box selbst
— die trägt keines der fünf geprüften Attribute.

**Folge, empirisch am Referenzdepot gemessen (ohne Navigation zwischen Aktion und Prüfung,
über den tatsächlichen Speicherpfad `depotSerialisieren()`):** Live-Änderungen an den
top-level-Sektorfeldern `erben` (Vorsorge) und `hauptpflegeperson` (Gesundheit) blieben bis
zu einem zufälligen fremden Auslöser (z. B. `oeffneSektor()` vor einem Sektorwechsel)
ungesichert. Beim direkten Speichern ohne Navigation dazwischen — dem realistischen
Bürger-Ablauf „eintragen, Haken setzen, sichern, schließen" — ging eine neu hinzugefügte
Person unwiederbringlich verloren; eine entfernte Zuordnung blieb umgekehrt im Depot
bestehen, obwohl Anzeige und Nutzerin sie als gestrichen bestätigt hatten.

`bearbeitungSpeichern()` selbst las `[data-refm]`-Boxen zu diesem Zeitpunkt bereits korrekt
(Abschnitt „e) refMehrfach") — der Fehler lag ausschließlich im fehlenden Auslöser, nicht in
fehlender Verarbeitung.

**Abgrenzung zu U2-ADR-015:** Dieser Fund liegt an einer anderen Schicht-Grenze als U2-ADR-015
(„Zwei-Ebenen-Persistenz", `data`/IndexedDB ↔ `.vivodepot`-Datei). Hier geht es um die Grenze
DOM-Formular ↔ In-Memory-`data` — die Schicht, die U2-ADR-011 („Auto-Save beim
Bereichs-Wechsel") ursprünglich einführte und die dieser ADR erweitert. Verwechslungsgefahr
wegen ähnlicher Begriffe, keine inhaltliche Überschneidung (s. eigene Erhebung vom
20.07., Abschnitt zu U2-ADR-015).

## 2 · Wirkungsradius (per Vollerhebung ermittelt, nicht alle refMehrfach-Felder betroffen)

Betroffen waren ausschließlich die refMehrfach-Felder, die **direkt im Sektor-Content**
editiert werden, ohne eigenen Speichern-Button: `erben`, `hauptpflegeperson`, sowie das
Umsortieren (↑/↓) innerhalb dieser beiden Felder.

**Nicht betroffen**, weil sie einen eigenen, vom Event-Pfad unabhängigen Speicherweg nutzen:
- `bevollmaechtigter`, `bankvollmacht`, `ki_berechtigte_personen`, `ki_nachlassverwalter`
  (Unterfelder in Listen-Einträgen) — deren Modal liest per `liesEintragAusDOM()` beim Klick
  auf „Speichern" direkt und synchron aus dem DOM, unabhängig von `_autoSaveWennFeld`.
- `pv_beistand_personen`, `pv_schweigepflicht_personen` (pvwiz),
  `ki_berechtigte_personen`/`ki_nachlassverwalter` im Wizard-Kontext (kiwiz) — die
  Wizard-Engine liest bei jedem Schrittwechsel aktiv per DOM-Pull, ebenfalls unabhängig vom
  Event-Pfad für die Wizard-eigene Persistenz (s. aber U2-ADR-092-Folgefund: derselbe
  `#content`-Capture-Listener löst inzwischen zusätzlich `bearbeitungSpeichern()` auch während
  einer Wizard-Sitzung aus — eigener, separat verfolgter Punkt, nicht Teil dieser Entscheidung).
- Die Chip-Mechanik (Allergien/Krankheiten/Medikamente, U2-ADR-083/084) — ihr Feld-Container
  trägt bereits `data-chip-liste`, eines der fünf ursprünglich geprüften Attribute; sie war
  von Anfang an korrekt verdrahtet.
- `vivodepot-lesen.html` — reine Nur-Lese-Ansicht, kein Schreibpfad, damit gegenstandslos.

## 3 · Die Entscheidung: Weg 1 — Attribut ergänzen

`_autoSaveWennFeld` prüft jetzt zusätzlich `data-refm`. Da alle refMehrfach-Felder ihre Box
über dieselbe zentrale Verdrahtung (`_refMehrfachVerdrahten`) erhalten, deckt diese eine
Bedingung die gesamte heute betroffene Fläche auf einen Schlag ab — kein Feld-für-Feld-Fix
nötig.

Die Prüfung im Code ist ausdrücklich als **Allowlist** kommentiert: jeder künftige
Widget-Typ mit eigener Melde-Mechanik (eigenes `dispatchEvent` auf einem eigenen Attribut)
muss hier eingetragen werden, sonst wiederholt sich derselbe Fehler unter anderem Namen. Der
nächste Fall soll nicht wieder über einen Zufallsfund entdeckt werden.

## 4 · Verworfene Alternative: Weg 2 — `melden()` speichert selbst

Das refMehrfach-Widget hätte nach jeder bestätigten Änderung direkt `bearbeitungSpeichern()`
aufrufen können, ohne den Umweg über den `change`-Autosave. Technisch gleichwertig zu Weg 1
(`bearbeitungSpeichern()` selbst ist reine `data`-Objekt-Mutation ohne Krypto/IndexedDB-Kosten,
s. `kernAPI.schreibBereich`) — **verworfen**, weil er dieselbe Funktion (`melden()`) anfasst,
die auch Muster B (Scroll-/Fokus-/Vorschlagslisten-Erhalt nach Listen-CRUD) verändert, und
eine unnötige Kopplung zwischen zwei getrennten, unabhängig entstandenen Vorgängen erzeugt
hätte.

## 5 · Bewusst vertagte Alternative: Weg 3 — zentrale Schreibstelle

Persistenz an die Datenmutation selbst koppeln, statt an ein DOM-Event — ein zentraler
Punkt, den jeder Schreibzugriff durchläuft, unabhängig vom auslösenden Widget-Typ.
Strukturell der einzige Weg, der gegen **künftige** neue Widget-Typen immun wäre (Weg 1
muss bei jedem neuen Melde-Mechanismus manuell nachgezogen werden).

**Nicht verworfen, sondern vertagt:** Eine echte zentrale Schreibstelle existiert heute
nicht — `bearbeitungSpeichern()`/`kernAPI.schreibBereich` schreibt sektorweise, während
Wizards/direkte Ref-Anlagen granularer über `sektorFeldSetzen()`/`situationFeldSetzen()`
einzelne Felder schreiben. Diese Vereinheitlichung wäre ein struktureller Umbau, dessen
Umfang ohne tiefere Analyse nicht seriös bezifferbar ist — kein Vorgang, der vor v1.0
nebenbei mitläuft. Bleibt als bewusst gewählte Nicht-Wahl für einen späteren,
eigenständigen Auftrag stehen.

## 6 · Abnahme

Node-Suite strukturell keine Abnahme-Grundlage: `tests/load-kern.js` stubbt
`document.addEventListener` als No-Op — der Mechanismus, in dem der Fix wirkt, ist im
Harness nicht ausführbar (s. eigener Punkt „Event-Blindzone", eigene Erhebung 20.07.). Abnahme
lief am geladenen Referenzdepot, ohne Navigation zwischen Aktion und Prüfung, über
`depotSerialisieren()` + Entschlüsselung: `erben` und `hauptpflegeperson` je
Hinzufügen/Entfernen/Verschieben — sechs von sechs Fällen bestehen. Regression gegengeprüft:
Chip-Mechanik (Allergien) und Listen-Modal (Bevollmächtigte) unverändert korrekt.

Commit: `ea29c8a` (Branch `ci-probe-2026-07-02`, kein Push).

## 7 · Offen — bewusst nicht Teil dieser Entscheidung

- Die „Event-Blindzone" selbst (wie viel Funktionalität strukturell nicht Node-testbar ist,
  ob Browser-Testfähigkeit vor v1.0 Voraussetzung wird) — eigene, noch offene Erhebung.
- Zwei unverifizierte Verdachtsfälle aus derselben Erhebung: Karteileiche im Register bei
  Modal-Abbruch nach `.inline-neu`-Anlage; `bearbeitungSpeichern()` mit veraltetem
  `aktiverSektorId` im Wizard-Kontext — Letzterer erhält durch diese Entscheidung zusätzliches
  Gewicht, da der jetzt zuverlässige `change`-Trigger auch während Wizard-Sitzungen feuert
  (s. Abschnitt 2).
- **Muster B (Scroll-/Fokus-/Vorschlagslisten-Erhalt) wurde geprüft und war von dieser
  Entscheidung nicht betroffen** — beide Vorgänge berühren `melden()`, aber an
  unterschiedlichen, unabhängigen Stellen (Fokus-Tracker vs. Persistenz-Trigger); Muster B
  wurde separat, nach Weg 1 desselben Musters, entschieden und gebaut (Commit `90abdfd`).
- Ein neu entdeckter, separater Fund (unbestätigter, nur getippter Text in einem
  refMehrfach-Feld kann durch den jetzt zuverlässigen Trigger eine bereits bestätigte
  Referenz überschreiben) ist NICHT Teil dieser Entscheidung — eigener, noch offener Punkt
  (Override-Frage bei refMehrfach).

---

*Vivodepot GmbH · Berlin · 20.07.2026*
