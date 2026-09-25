# U2-ADR-065 — Personen-Mehrfachpick (`refMehrfach`) + Umsortier-Controls + Vertretungs-Modus

**Datum:** 08.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 08.07.2026 (Suite 1215/0, VdCrypto-Block-Pin `8d31c678…` byte-identisch, Engine-Smoke grün; Annahme = Produktentscheidung).
**Status heute:** gilt — `refMehrfach` ist breit im Einsatz (u. a. `bankvollmacht`, `hauptpflegeperson`,
`bevollmaechtigter`, `erben`, `ki_berechtigte_personen`, `pv_beistand_personen`; 96 Fundstellen in
`vivodepot.html`), `listenEintragVerschieben()` aktiv (Zeile ~18221, mit ausdrücklichem
U2-ADR-065-Verweis im Code-Kommentar). Die zahlreichen UI-Nachträge unten (Fokus, Scroll,
Chip-Input) sind Iterationen auf derselben Mechanik, keine Ablösung.
**Nummer:** U2-ADR-065 (höchste belegte in `docs/adr/` war U2-ADR-064).
**Typ:** Datenmodell (Schema 29→30) + neuer generischer Render-Typ `refMehrfach` + Listen-Umsortier-Mutation + `feldSichtbar`-Erweiterung (`minAnzahl`).
**Bezug:** U2-ADR-064 (Vollmacht-liste-Record — Erstanwendung) · U2-ADR-045 (Verwaisungs-Regel) · U2-ADR-008/010 (ref-Propagation/Render-Schicht) · [[datenmodell-mehrfachheit-inventur]] Mechanismus B (ref→Personen-Liste).

---

## Kontext

Read-only-Vorlauf (07.–08.07.): der `liste`-Typ konnte kein ref-Sub-Feld mit **Mehrfachauswahl** (mehrere
Register-Personen in einem Slot) und keine vom Nutzer bestimmbare **Reihenfolge** — beides Nachbau. Eine
erteilte Vollmacht kann aber an MEHRERE Personen gehen, **gemeinsam** (jede darf allein) oder **nacheinander**
(Ersatz-Kette, Reihenfolge = Wille). Umfangsrechnung: drei Mechaniken (ref-mehrfach · Umsortieren ·
Vertretungs-Feld), Ripple klein, weil `bevollmaechtigter` (aus U2-ADR-064) **keinen Logik-Konsumenten** hat
(nur Anzeige/Migration/lesen/Tests; Situationsblätter ziehen die Listen-Zusammenfassung). Produktentscheidung:
**A+B zusammen, beide Umsortier-Ebenen, Vertretungs-Feld nur bei >1 Person, `refMehrfach` generisch** (damit
Erben und Notfallkontakte danach darauf sitzen).

## Entscheidung

**(1) `refMehrfach` — neuer generischer Render-Typ.** Speicherform = **Array von `{ref, override}`** (wie ein
`ref`, aber N). Eingabe: Personen-Zeilen (Select mit `personenVorschlag`/`institutionenVorschlag` + „+ Neu"
Inline-Anlage + Freitext-Override) mit ↑/↓ und ×, plus „Person hinzufügen". Voll verdrahtet in **beiden**
Kontexten (Sektor-Feld **und** Listen-Unterfeld) via `_refMehrfachVerdrahten(container, feldeFinden)` +
`_refmSammeln` (DOM-Reihenfolge). Pfade: `feldInputHTML`-Case + `_refmZeileHTML` · Sammel-Block (e) im
Sektor-Save + `liesEintragAusDOM`-Branch · `feldValidieren`/`feldEingetragen` · `feldWertText`/`feldWertHTML`/
`listenEintragZusammenfassung` (Namen „, "-getrennt, nie roh).

**(2) Zwei Umsortier-Ebenen.** (a) **Personen** innerhalb eines refMehrfach-Felds: ↑/↓ verschiebt die DOM-Zeile,
die Reihenfolge wird beim Speichern aus dem DOM gelesen (kein Persistenz-Aufruf). (b) **Listen-Einträge** (die
Vollmachten selbst): neue Mutation `listenEintragVerschieben(sektorId, feldId, index, richtung)` (Swap, Ränder
ohne Wrap, kein Stempel — Werte unverändert) + ↑/↓ im `feld-liste-editor`, im Sektor-Wiring verdrahtet.

**(3) Vertretungs-Modus (`vertretungsModus`).** Reine `auswahl` {gleichwertig · nacheinander} als
Vollmacht-Unterfeld — **kein neuer Render-Typ**. Erscheint NUR bei mehr als einer Person: `feldSichtbar` bekommt
ein **`minAnzahl`**-Prädikat (`sichtbarWenn: { feld: 'bevollmaechtigter', minAnzahl: 2 }` → sichtbar, wenn das
referenzierte Feld ein Array mit ≥ minAnzahl Einträgen ist; rückwärtskompatibel zu `wert`). Die reaktive
Modal-Schicht (U2-ADR-064) zieht live nach — jede refMehrfach-Mutation dispatcht ein bubbelndes `change`, so
dass der Modus beim Überschreiten der >1-Schwelle sofort ein-/ausblendet.

**(4) Kein Downstream im Pilot.** Der Vertretungs-Modus ist ein erfasstes/angezeigtes Attribut; keine Logik
verzweigt darauf (der FHIR-`sitzungsAkteur.vollmachtsGrundlage` ist das andere, unberührte Datum).

## Migration (Schema 29 → 30, verlustfrei — Verwaisungs-Regel)

`depotNormalisieren` arrayt nach dem 28→29-Fold jedes `bevollmaechtigter` im Vollmacht-Record: Einzel-Ref
`{ref,override}` → `[{ref,override}]`; Alt-String → `[{ref:'', override:String}]`; leerer Einzel-Ref → `[]`.
`vertretungsModus` bleibt undefined (erscheint erst bei >1 Person). Idempotent (Array bleibt unberührt). Die
Lese-App spiegelt den Array-Fold read-only (`_foldBevollLesen`, läuft unabhängig von den Flachfeldern).

## Konsequenzen / Ripple (umgesetzt)

- **vivodepot-lesen.html:** Feld-Def (refMehrfach + vertretungsModus), `listenEintragZusammenfassung`- +
  `feldEingetragen`-Branch, 29→30-Array-Fold.
- **sw.js** Cache `v18→v19`. **Schema-Default** 29→30. **BUILD_DATUM** 2026-07-08. STRINGS `refm*`, CSS `.feld-refm`.
- **Generisch:** `refMehrfach` + `listenEintragVerschieben` sind feld-agnostisch — Erben (`erben`),
  Notfallkontakt (`hauptpflegeperson`), Ersatz-Bevollmächtigte können ohne neue Mechanik darauf umsteigen.

## Status der Gates

Suite **1215/0** (neu `tests/refmehrfach.test.js`, 8; `vollmachten-liste`/Schema-Pins nachgezogen). VdCrypto-Block-Pin
`8d31c678…` byte-identisch (Lese-App T-A-02 grün); `vivodepot.html.sha256` `7316ba56…` nachgezogen. Playwright-E2E
außerhalb `node --test` (Mac/CI). **Kein Push** — Push ist eine Produktentscheidung. **Am Gerät ungesehen:** das
refMehrfach-Widget (mehrere Personen, ↑/↓, „+ Neu") + der Vertretungs-Modus-Schwellenwert haben keinen E2E-Spec →
Geräte-Prüfpunkt.

## Nachlauf (08.07., Geräte-Feedback + Erben-Anwendung)

Aus einem Gerätetest (v22, funktioniert, aber umständlich) — drei UX-Fixes + eine generische Anwendung, **Schema 30→31**:
- **Namensfeld-Breite (Bug):** die „+ Neu"-Inline-Anlage kollabierte im engen Modal-Grid auf 1 Zeichen.
- **Scroll-Sprung (Bug):** der Eintrags-Dialog machte `window.scrollTo(0,0)` beim Öffnen → Seite sprang hoch.
  Jetzt wird die Scroll-Position gemerkt und beim Schließen wiederhergestellt.
- **Anlege-Flow gestrafft:** pro Person **ein primäres Namensfeld** (direkt tippen), der Register-Select ist die
  schlanke Zweit-Option; der „+ Neu"-Zweischritt (`_refmNeuInline`) entfällt ersatzlos, Fokus springt beim
  „+ Person" aufs Namensfeld.
- **Erben → refMehrfach (read-only bestätigt: ohne neue Mechanik):** `vorsorge/erben` ist jetzt ein
  refMehrfach-Sektorfeld (erste reale Sektor-Level-Nutzung der generischen Mechanik). erbwiz-Schritt „Wer soll
  erben?" gekappt (vvwiz-Präzedenz; Schritt-Engine kennt kein refMehrfach), Import-Alias entfernt, lesen.html-Fold
  (`_foldBevollLesen` deckt erben mit), Migration 30→31 Einzel→Array verlustfrei. Situationen zeigen erben unverändert.

Gates: Suite **1216/0** (`refmehrfach.test.js` +Erben-Test); Playwright **16+16**; VdCrypto-Block byte-identisch;
sha256 `b868ebc3…`; SW-Cache v19→v20; **kein Push**.

## Nachlauf 2 (08.07., zwei Geräte-Bugs — kein Schema-Bump)

Aus einem Gerätetest (v23): das refMehrfach-Feld nahm getippte Namen nur als Freitext-Override auf (sie landeten
NICHT im Personen-Register), und das Widget rendere in Sektor-Feld (Erben) und Listen-Unterfeld (Vollmacht)
unterschiedlich. Zwei Fixes, rein Anwendungs-/Render-Schicht — Speicherform `[{ref,override}]` unverändert, **keine
Migration, Schema bleibt 31**:

- **Bug 1 — getippte Namen → Register-Personen (Dedup).** Neuer Helfer `personFindenOderAnlegen(name)`:
  case-insensitiver, getrimmter Namensvergleich gegen `data.menschen` → bestehende id wiederverwenden, sonst
  `personHinzufuegen({name})`. Auflösungs-Stufe `_refmInsRegister(arr)` mappt jede Zeile: vorhandene `ref` bleibt;
  sonst getippter Name → `personFindenOderAnlegen` → `{ref:id, override:''}`. Eingehängt an die **zwei Schreib-
  Stellen** (Sektor-Save `bearbeitungSpeichern` Block e; Modal `liesEintragAusDOM`-Branch) — **nicht** im reaktiven
  `werteAusDOM`-Leser (der feuert bei jedem Tastendruck und darf keine Personen anlegen). `_refmSammeln` bleibt ein
  reiner DOM-Leser. Freitext-only entfällt: jede eingetragene Person landet im Register. Idempotent (nach dem Speichern
  trägt die Zeile eine ref → erneutes Speichern legt nichts Neues an). Bewusste Semantik: gleicher Name = gleiche
  Person; wer zwei verschiedene Menschen gleichen Namens trennen will, wählt die bestehende Person im Register-Select.
  Alt-Einträge mit reinem Override bleiben verlustfrei sichtbar und werden beim nächsten Speichern aufgelöst (keine
  rückwirkende Migration).
- **Bug 2 — Widget in beiden Kontexten identisch.** `feldInputHTML`/`_refmZeileHTML` liefern in Sektor-Feld und
  Listen-Unterfeld byte-identisches Markup; die Abweichung kam allein aus der Container-Breite (flex-wrap brach an
  unterschiedlicher Stelle um). `.refm-zeile` ist jetzt ein **breiten-unabhängiges Grid** (`1fr auto auto auto`,
  Name über `grid-column: 1 / -1` in Reihe 1, Register-Select + ↑/↓/× in Reihe 2). Die Anordnung hängt nicht mehr an
  der Spaltenbreite → deckungsgleich in beiden Kontexten; nebenbei behebt die volle Namens-Reihe den Rest des schmalen
  Namensfelds. Haarlinie (`.refm-zeile + .refm-zeile`) trennt mehrere Personen. Verifiziert an realen Breiten
  (Sektor 500px / Modal 300px / Mobil 320px — Register schrumpft nie unter ~135px; auf dem Handy stapeln beide
  Container das Label über den Wert).

Gates: Suite **1219/0** (drei Bug-1-Tests in `refmehrfach.test.js`: Dedup, `_refmInsRegister`-Auflösung, Nicht-Array-
Toleranz); `load-kern`-Export-Hook um `_refmInsRegister`/`personFindenOderAnlegen` ergänzt. VdCrypto-Block byte-
identisch; sha256 `e237236d…` nachgezogen; SW-Cache **v20→v21**; **kein Push**. Browser-Sicht-Beleg (Screenshot beider
Kontexte) erbracht; Lese-App unberührt (reiner Schreib-/Edit-Pfad).

## Nachlauf 3 (09.07., Personen-Widget nach UX-Spezifikation — Phase 1, reine UI, kein Schema-Bump)

Bau gegen die verbindliche interne UX-Spezifikation „Personen-Widget" vom 08.07.2026 (nicht Teil dieses Repos, Versions-Bindung über Hash `14781c1d…`). Das
Zwei-Felder-Widget (leeres Namensfeld ÜBER Register-Select) ist der eigentliche Auslöser des Modus-Wechsels
gewesen — es wird durch **EIN Combobox-Feld pro Person** ersetzt: Eingabe UND Suche zugleich. Nur die Eingabe-
Oberfläche; die Mechanik (`refMehrfach`/`{ref,override}`/`_refmSammeln`/`_refmInsRegister`/Register) bleibt.

- **`_refmZeileHTML`:** sichtbares Textfeld (`data-edit-refm-override`, Platzhalter „Name eingeben oder wählen") +
  **verborgenes** ref-Feld (`data-edit-refm`, trägt die gewählte Register-Person) + weiche Vorschlagsliste
  (`.refm-vorschlaege`). Kein `<select>` mehr → `_refmSammeln`/`_refmInsRegister` lesen unverändert `{ref, override}`.
- **`_refMehrfachVerdrahten`:** Live-Vorschläge aus `personenVorschlag`/`institutionenVorschlag`, gefiltert am
  getippten Text (getrimmt, case-insensitiv, max. 5); Auswahl (mousedown, hält den Fokus) setzt die verborgene
  ref; **stumme Neuanlage bei Blur** über `personFindenOderAnlegen` (Dedup); Tastatur ↑/↓/Enter/Escape.
- **Umsortieren = Pfeile ↑/↓** (iOS-Touch-Drag-Trigger der Spec Zeile 58 gefeuert + bestätigt → spec-konformer
  Fallback, KEIN ADR/Supersede). Bewusst **DOM-Swap** (Reihenfolge beim Speichern gelesen), NICHT
  `listenEintragVerschieben` — letzteres mutierte `data` + erzwänge ein `renderContent` (= der verbotene Sprung)
  und trüge im verschachtelten Modal-Kontext nicht. So gilt „überall identisch" **und** „kein Sprung".
- **Kein Sprung nach oben (harte Auflage):** alle Widget-Aktionen laufen rein im DOM (kein `renderContent`);
  „+ Person" fokussiert die neue Zeile mit `focus({ preventScroll: true })` → Scroll bleibt am Widget. Browser-
  verifiziert: Umsortieren/Entfernen/Tippen/„+ Person" halten `window.scrollY` exakt (nie 0).
- **Ästhetik:** weiche Vorschlagsliste (weiß, `radius-md`, dezenter Schatten, Marken-Grün beim Überfahren, ≥44px
  Items), Tap-Flächen ≥44px, Style-Guide v2. Marker `refmNamePlatzhalter` aktualisiert.

Gates: Suite **1219/0** (`refmehrfach.test.js` + `a1-rollenloses-register` + `personen-vereinheitlichung` auf die
dynamische Vorschlags-Quelle statt statischer `<option>` umgestellt). VdCrypto-Block byte-identisch; SW-Cache
**v21→v22**; BUILD_DATUM 2026-07-09; sha256 nachgezogen; **kein Push**. Browser-Beleg (Screenshot: ein Feld +
weiche Vorschlagsliste). Lese-App unberührt (kein Edit-Widget). Datenmodell/Schema unangetastet.

**Zusatz (09.07.):** Die **Phase-3-Personencluster** (Notfallkontakte `hauptpflegeperson`, Fachärzte
`facharzt_1/2/3`) fahren beim Umsortieren denselben **DOM-Swap-Reorder-Pfad** wie Erben/Vollmacht, **nicht**
`listenEintragVerschieben` — aus demselben Grund (die Personen-Reihung ist ein Feld-interner Wert; eine
`data`-Mutation erzwänge `renderContent` = der verbotene Sprung und trüge im verschachtelten Kontext nicht).

## Nachlauf 3 · Zusatz 2 (09.07., zwei Widget-Nachbesserungen — reine UI, kein Schema-Bump)

Gegen den UX-Spec-Zusatz 09.07. (im Auftrag; die Spec-HTML `14781c1d…` selbst blieb unverändert — Zusatz noch
nicht in die Doku gefaltet). SW-Cache **v22→v23**.

**§1 — Neuanlage EXPLIZIT statt stumm (Datenintegrität).** Die stumme Blur-Neuanlage (Nachlauf 2) wird abgelöst:
sie ließ vertippte/abgebrochene Fragmente still ins Register wandern. Neu: passt kein Vorschlag EXAKT (getrimmt,
case-insensitiv), zeigt die Vorschlagsliste eine letzte Zeile **„<Getipptes>" als neue Person anlegen** (`refm-anlegen`);
nur der **Tap** darauf legt an (`personFindenOderAnlegen`, Dedup bleibt) und setzt die ref. **Blur ohne Tap legt
NICHTS an** und verwirft neu getippten Freitext (`schmutzig`-Flag: nur in dieser Fokus-Runde Getipptes wird
verworfen, ein unveränderter Bestands-Override bleibt). Der Save-Pfad `_refmInsRegister` **legt nicht mehr an** —
ref-Zeilen bleiben, Freitext-Override bleibt Override (verschmutzt das Register nicht), Bestandsdaten unangetastet.
Keine exakt-vorhandene Person zeigt eine Anlege-Zeile; leerer/Whitespace-Text zeigt keine.

**§2 — Vorschlagsliste im verschachtelten Vollmacht-Modal (Baufehler).** Die Liste wurde im Modal beschnitten
(`#modal-inhalt`: `overflow:auto` + `max-height`) und die Namen brachen um. Fix: `.refm-vorschlaege` auf
**`position: fixed`** (JS richtet sie beim Anzeigen ans Feld aus — unter dem Feld, Breite = Feldbreite) → entkommt
dem overflow-Clip, liegt über allem (z-index 60); `white-space:nowrap`+Ellipsis → **kein Umbruch**. Am **Erben-Feld
(nicht verschachtelt) unverändert** (browser-verifiziert: Liste unterm Feld, Feldbreite, Anlege-Zeile).

Gates: Suite **1219/0** (`_refmInsRegister`-Test auf die neue „keine stille Anlage"-Invariante umgestellt);
VdCrypto/JWS-Block byte-identisch; sha256 nachgezogen; **kein Push**. Browser-Beleg beider Punkte (Screenshots).
Lese-App unberührt.

## Nachlauf 3 · Zusatz 3 (09.07., Vorschlagsliste im Modal lesbar — reiner Darstellungs-Fix)

Am Gerät war die Auswahl-Logik ok (Tap setzt die Person), aber die Liste im verschachtelten Vollmacht-Modal
wirkte nicht wie eine Auswahl: Namen abgeschnitten („Erika M…"), loser Text statt antippbarer Optionen. Der
`nowrap`+Ellipsis aus Zusatz 2 war der falsche Hebel (kürzt, statt Platz zu schaffen). Keine Logik, kein Schema.

- **Liste wächst mit dem Namen:** `.refm-vorschlaege { width: max-content }`; `_refMehrfachVerdrahten` setzt
  beim Anzeigen `min-width` = Feldbreite und `max-width` = Viewport-Rand. Gängige Namen stehen ganz; Ellipsis nur
  noch, wenn die Max-Breite anschlägt (Extremfall). Fixed-Positionierung/Clip-Schutz aus Zusatz 2 bleibt.
- **Als Auswahl erkennbar:** kräftigerer Rahmen (`--salbei-mid` 1,5px) + Schatten, Optionen mit Trennlinie
  (`li + li`), Tap-Höhe ≥44px, Anlege-Zeile deutlicher abgehoben (kursiv + `--salbei-mid`-Trennlinie).
- **Modal-scoped Feldbreite:** im Modal quetschten das eine Feld + drei Knöpfe in EINER Reihe das Feld auf ~68px
  (auch der gewählte Name wurde IM Feld gekürzt). `.liste-eintrag-form .refm-zeile` ist dort jetzt Flex, das Feld
  über die volle Breite (Reihe 1), ↑↓× darunter (Reihe 2). **Nur im Modal** — das **Erben-Sektorfeld bleibt
  einreihig** (Grid, Feld ~344px, Knopf daneben — browser-verifiziert, keine Regression).

Gates: Suite **1219/0** (CSS/JS-Positionierung, keine Test-Änderung); VdCrypto/JWS byte-identisch; sha256
nachgezogen; SW-Cache **v23→v24**; **kein Push**. Browser-Beleg beider Kontexte (Modal: Feld voll + „Erika
Mustermann" ganz in der Liste; Sektor: einreihig, unverändert).

## Nachlauf 3 · Zusatz 4 (09.07., Regression-Auftrag „Anlage-Zeile weg" → Positionierungs-Fix)

Gemeldet: die „…als neue Person anlegen"-Zeile sei im Erben-Feld verschwunden (Verdacht: der Modal-Fix aus
Zusatz 3 habe doch die Anlage-Logik berührt). **Read-only-Befund: die Anlage-LOGIK ist byte-gleich zu `1ba69e3`**
— `zeigen()` (Erzeugung der `refm-anlegen`-`<li>`) steht nicht im Diff `1ba69e3..efa78e1`. Geändert hatte Zusatz 3
nur CSS + die **Positionierung** (feste `width` → `min-/max-width` + `width:max-content`). Dreifach im Browser
belegt (isoliert breit/schmal + **echter Sektor-Edit-Pfad**): die Anlage-Zeile erscheint in allen Fällen korrekt.

**Der echte Defekt** steckt in der `position:fixed`-Liste (aus Zusatz 2, gegen den Modal-overflow-Clip): sie wird
beim Anzeigen **einmalig** am Feld ausgerichtet und **folgt dem Feld beim Scrollen nicht**. Sobald beim
Fokussieren/Tippen gescrollt wird — Desktop: das Feld wird ins Bild geholt; **iOS: die Tastatur schiebt die Seite
hoch** — löst sich die Liste vom Feld, erscheint über anderen Feldern oder aus dem Bild → wirkt „weg". Messung:
Scroll um 200px bei offener Liste → **203px Versatz** (Liste bleibt stehen).

- **Fix (nur Positionierung, Logik unberührt):** die Ausrichtung ist als `positionieren()` gekapselt; solange die
  Liste offen ist, hängt `zeigen()` einen Scroll- (capture) + Resize-Hörer an (`scrollFolgeAn`), `verbergen()`
  hängt sie wieder ab (`scrollFolgeAus`). `position:fixed` (Clip-Schutz) und `max-content` (Zusatz 3) bleiben.
  Verifiziert: Scroll um 200px bei offener Liste → Versatz **4px** (Liste folgt dem Feld).
- **Regression-Wächter** in `tests/refmehrfach.test.js` (Quell-Wächter, da der Test-Harness ein DOM-Stub ohne
  Layout/Events ist): `_refMehrfachVerdrahten` muss den Scroll-Hörer bei offener Liste an- und beim Verbergen
  abhängen.
- Nebenbefund (kein Fix nötig): Cross-Kontext ist per Konstruktion gedeckt — `personenVorschlag()` filtert **nicht**
  nach Rolle, liefert alle `data.menschen`; eine im Erben-Feld angelegte Person erscheint im Vollmacht-Modal.
- Wahrscheinliche Ursache der Desktop-Beobachtung „gar keine Anlage-Zeile": eine **veraltete Schale vor `1ba69e3`**
  (Phase-1-Build `d7adf87`/„v25" legte stumm beim Verlassen an, **ohne** Anlage-Zeile) — Cache, nicht Code.

Gates: Suite **1220/0** (neuer Wächter); VdCrypto/JWS byte-identisch; sha256 nachgezogen; SW-Cache **v24→v25**;
**kein Push**. Browser-Beleg: Anlage-Zeile 4px unter dem Feld; folgt beim Scrollen (4px statt 203px).

## Nachlauf 3 · Zusatz 5 (10.07., Chip-Input-Konvention — ersetzt die Anlage-Zeile ganz)

Der geometrische Klickfallen-Fix (Zusatz 4) wurde **nicht committet**; die Richtung wurde geändert. Die
Anlage-Zeile war strukturell falsch: Bestätigung als Nebeneffekt von Tippen/Verlassen legte bei jedem Vertipper
eine Person an (belegt: sechs Müll-Fragmente „E"/„Em"/…). Wechsel auf die etablierte **Tag-/Chip-Input-Konvention**
(Mail-Empfänger, GitHub-Labels): Bestätigung ist eine **bewusste Handlung**, nie ein Nebeneffekt. Form (a): das
Zeilen-Widget (eine Person = eine Zeile, ↑↓×, Umsortieren) bleibt — nur der Auslöser der Anlage wird bewusst.
UX-Spec Personen-Widget Zusatz 2 (md5 `fc07cafe`). Reine Interaktions-/UI-Schicht, **kein Schema-Bump**.

- **Tippen legt NIE an** — die Vorschlagsliste zeigt nur echte Register-Treffer; die `data-anlegen`-Zeile ist
  entfernt (`zeigen()` ohne `zeigeAnlegen`, `exaktVorhanden` gelöscht).
- **Blur legt NIE an** — unbestätigter, neu getippter Freitext ohne ref wird beim Verlassen verworfen (§1 bleibt).
- **Anlegen nur bewusst**, drei gleichwertige Wege: **Enter** (markierter Vorschlag → setzen; sonst Freitext →
  `personFindenOderAnlegen`, Dedup); **„Übernehmen"-Haken** pro Zeile (`data-refm-uebernehmen`, erscheint nur bei
  unbestätigtem Freitext, ≥44px, Salbei-Akzent) → gleiche Wirkung; **Vorschlag antippen** → setzt die bestehende ref.
- **Sichtbare Quittung**: bestätigter Name trägt `.refm-name--gesetzt` (Salbei-Akzent links) + Toast „…übernommen".
- Zwei „Add"-Begriffe getrennt: `+ Person` fügt eine leere Zeile an; der Haken bestätigt den Namen IN der Zeile.
- `refMehrfach`-Datenmodell (`{ref,override}`), Umsortieren, „kein Sprung", „überall identisch" (Erben + Vollmacht)
  unverändert. Bestehende Müll-Fragmente sind nicht Teil dieses Baus (entstehen nicht mehr neu; Umgang: offen).

Gates (Firefox am echten Feld, alle sechs bewiesen): Blur→Feld leer/Register unverändert · Enter→angelegt+quittiert ·
Haken→angelegt+quittiert · Vorschlag-Tap→gesetzt/kein Duplikat (Register 3→3) · ↑ sortiert, scrollTop 150→150
(kein Sprung) · Cross-Kontext: angelegte Person = Vollmacht-Vorschlag. Suite **1221/0** (Chip-Input-Wächter),
VdCrypto/JWS byte-identisch, sha256 nachgezogen, SW-Cache **v25→v26**, **kein Push**.

## Nachlauf 3 · Zusatz 6 (10.07., Personen-Zeile responsiv — iPhone-Fund, reiner CSS-Fix)

Am echten iPhone (~390px): Feld + ↑ + ↓ + × passen nicht in eine Reihe; das × (äußerstes) rutschte aus dem
tippbaren Bereich. Firefox bei 390px bestätigt: die Zeile ist auf Kante genäht (Feld auf ~178px gequetscht,
× rechts bei 362/390) — und sobald beim Tippen der „Übernehmen"-Haken mit in der Reihe steht (fünf Elemente),
läuft × über den Rand. Lösung = Richtung (b), dieselbe wie im Vollmacht-Modal: **bei ≤560px Feld über die volle
Breite (Reihe 1), Knopfgruppe ✓↑↓× darunter (Reihe 2).** Kein Verkleinern der Knöpfe (≥44px bleibt), das × bleibt.

- CSS-only: `@media (max-width: 560px) { .refm-zeile { display:flex; flex-wrap:wrap } .refm-combo { flex:1 1 100% } }`.
  Überall (Erben-Sektorfeld + Vollmacht-Modal), da generisch am `.refm-zeile`. Ab >560px unverändert einreihig.
- Firefox-Beleg (härtester Fall, ✓-Haken sichtbar): **390px** — Feld volle Breite (334px), ✓↑↓× auf Reihe 2, jeder
  44×44px, alle im Viewport (× rechts bei 228, 162px Luft); `alleImViewport`/`alleKnoepfeMin44`/`xUnterFeld` = true.
  **1280px** — Knöpfe auf Feld-Höhe (einreihig), keine Regression.

Gates: Suite **1221/0** (reiner CSS-Fix, keine Logik/Test-Änderung); VdCrypto/JWS byte-identisch; sha256
nachgezogen; SW-Cache **v26→v27**; **kein Push**. Geräte-Bestätigung am iPhone steht aus.
