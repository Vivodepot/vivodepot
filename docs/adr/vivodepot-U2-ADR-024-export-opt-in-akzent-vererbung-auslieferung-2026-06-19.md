# U2-ADR-024: Export-Auswahl als Opt-in (datensparsam) + Sub-Depot-Akzent-Vererbung an der Wurzel + Auslieferungs-Fix

**Status:** Akzeptiert
**Datum:** 19.06.2026
**Kategorie:** UX, DATENMODELL, DISTRIBUTION
**Cross-Referenz (Produktiv-Kanon):** `ADR-001` (Single-File), Amendments zu Datensparsamkeit/Export.
**U2-Bezug:** `U2-ADR-015` (D43-Auslieferung/Service-Worker — Cache-Bump), `U2-ADR-020` (Cache-Version-Disziplin), `U2-ADR-022/023` (der Schalen-Schnitt v3 liefert deren Stand erstmals an installierte PWAs aus). Schema-21-Export-Durchgang (Sensibel-Markierung) ist die Substrat-Schicht von §1.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `flowExportUebersicht`/`exportAuswahlEphemerAnwenden` (§1), `setzeSubDepotAkzent` + `Modus._setzeIntern` + `.toast`-CSS (§2), `groesseLesbar`/`renderMappe` (§4b); `sw.js` + `pages/sw.js` Cache `vivodepot-shell-v3` (§3).
- **Sprint-Commit:** dieser Bau (Sammel-Fix UX + Auslieferung).
- **ADR-Bezug:** dieser ADR (U2-ADR-024).
**Status heute:** gilt — Beleg `tests/sammelfix-ux.test.js`, Mechanismen im Kern nachweisbar (`exportAuswahlEphemerAnwenden`/`flowExportUebersicht`, `setzeSubDepotAkzent`, `groesseLesbar`); §1 laut U2-ADR-137 „unangetastet" tragend, §3 (Cache-Bump-Disziplin) inzwischen bei `vivodepot-shell-v231` fortgeführt.

---

## Kontext

Geräte-Abnahme (localhost) brachte fünf Funde. Vorab geklärt: die Abnahme lief über einen **veralteten Service-Worker-Cache** (cache-first, `vivodepot-shell-v2`, nie gebumpt) — er lieferte eine vor-U2-ADR-021-Schale aus. Mehrere „Bugs" waren damit Cache-Geister; jeder wurde gegen den **frischen Datei-Stand** geprüft, nur Reales gefixt.

## Entscheidungen

### §1 — Export-Auswahl: Opt-in statt Opt-out (datensparsam)

**Vorher:** „Haken Sie aus, was NICHT herausgegeben werden soll" — alles vorausgewählt, Ausgehaktes wurde **persistent** in `data.sensibelFelder` geschrieben. Invertierte Logik gegen die Intuition; jeder Export hinterließ Markierungs-Nebenwirkungen.

**Jetzt:** **Nichts ist vorausgewählt. Angekreuzt wird, was herausgegeben werden soll (Ankreuzen = mitgeben).** Ein **„Alles auswählen"**-Ein-Klick-Schnellweg. Wer den Dialog wegklickt (Abbrechen), gibt **nichts** heraus (`aufFortfahren` läuft nur bei Bestätigung). Klar-positiver Text: „Wählen Sie, was Sie weitergeben".

**Mechanik (ephemer, kein Persistenz-Drift):** `exportAuswahlEphemerAnwenden(kandidaten, gewaehlt, aufFortfahren)` schnappt `data.sensibelFelder`, setzt die **nicht** angekreuzten Kandidaten transient auf „zurückhalten", ruft den Export über den **bestehenden** Zurückhalten-Pfad (`optionen.sensibel:false`, von ALLEN Export-Wegen geehrt: PDF/maschinenlesbar/QR/EUDIW), und stellt die Markierung danach **exakt wieder her**. Die Auswahl persistiert NICHT — jeder Export beginnt bei null (Datensparsamkeit als Haltung). Die persistente Sensibel-Schloss-Markierung der Nutzerin bleibt über den Export unberührt. Schema-/system-sensible Felder (`feld.sensibel`) bleiben grundsätzlich außen vor (read-only Hinweis, nicht ankreuzbar). Anlass-bezogene Vorschläge („für diesen Zweck üblich") sind bewusst NICHT hier — eigener Folge-Auftrag.

### §2 — Sub-Depot-Akzent an der Wurzel vererben

**Befund:** Der laufzeitgesetzte Sub-Depot-Akzent griff in der Hauptsicht (Chrome über `--vm-chrome` + scoped CSS), aber NICHT in Einstellungen/Dialogen — die verbrauchen `var(--akzent)`, und der **Modus-Setter** (`Modus._setzeIntern`) setzt `--akzent` inline auf den Modus-Akzent und läuft in `subKontextBetreten` **nach** `setzeSubDepotAkzent` → er überschrieb den Sub-Akzent auf `--akzent`.

**Entscheidung:** Der generische `--akzent` wird bei aktivem Sub-Akzent an der **Wurzel** (`document.documentElement`) auf den Sub-Akzent gezogen — so erben ALLE `var(--akzent)`-Verbraucher (Einstellungen, Dialoge, Prompts) ihn ohne Stelle-für-Stelle-Nachfärbung. Reihenfolge-robust über ein Modul-Flag `_subAkzentBasis`: der Modus-Setter re-appliziert den Sub-Akzent nach jedem `--akzent`-Setzen; der Schiefer-Reset stellt den **Modus**-Akzent wieder her (entfernt `--akzent` NICHT — der gehört dem Modus). Erfolgs- und neutrale **Toasts** tragen den Sub-Akzent (CSS scoped auf `html.vm-akzent`, nur im Sub-Kontext). **Funktions-Signalfarben bleiben unangetastet:** Fehler-Toast `--error` (#c0392b), Warn-Toast `--warning` (#c4a558) werden nie überfärbt. Kein Marken-Token geändert — nur der bereits gewählte Akzent durchgereicht.

### §3 — Service-Worker-Cache-Bump (Auslieferungs-Fix)

`vivodepot-shell-v2` → **`-v3`** in `sw.js` (Repo-Wurzel = Auslieferungsquelle) **und** `pages/sw.js` (bewusst byte-logik-gleich gehalten). Ohne Bump erreicht eine schon installierte PWA cache-first **nie** eine neue Version — ein echter Update-Defekt. `activate` räumt die alte Schale beim nächsten Online-Laden; IndexedDB (Daten) bleibt unberührt.

### §4 — Kleinere Funde

- **§4b Depot-Größe menschenlesbar + besser platziert:** `groesseLesbar` sagt unter 1 KB „< 1 KB" statt Roh-Bytes (Bytes sind keine Bürger-Einheit). Die Gesamt-Größe wandert von oben (wo sie wie eine Eigenschaft der womöglich leeren Mappe wirkte) in eine **dezente Fuß-Notiz** unter der Liste.
- **§4a Drei-Toasts-pro-Eintrag — Cache-Geist (kein Code-Fix):** Im frischen Datei-Stand prüfbar emittiert der Feld-Auto-Save (`bearbeitungSpeichern`, RAM-Faltung) **keinen** Toast; ein Speichervorgang emittiert **einen** „ok"-Toast (`depotInternSichern`/`depotInDateiSichern`), plus eine **einmalige** (pro Sitzung) „info"-Sicherungskopie-Erinnerung beim ersten Save. Ein reproduzierbares Drei-Toasts-Verhalten existiert im aktuellen Code nicht — die Beobachtung stammt aus derselben veralteten SW-Schale wie die übrigen Geister. Kein erfundener Fix (Anti-Quick-Fix).

## Abgrenzung / Geprüfte Geister

- **Punkt 11 (Kind-/Mensch-Datensatz):** Geist. Die Kinder-Zeile trägt ein `kind`-Unterfeld `typ:'ref' entitaet:'person'`; aufgelöst über `personName` → `data.menschen`. **Eine** Quelle (U2-ADR-022/023), kein abweichender Zweit-Datensatz.
- **Punkt 4 (Inline-Person-Anlage mal-speichert-mal-nicht):** Geist im engeren Sinn — `flowRefNeueEntitaet` ist synchron (`personHinzufuegen` → `schliessen` → `onAnlegen` → `sektorFeldSetzen`); der frühere „Name immer leer → nie gespeichert"-Bug ist gefixt (dokumentiert am Code). Das verbleibende „erst beim nächsten Speicherpunkt persistent" ist die **strukturelle** Persistenz-Modell-Frage (Edits leben in RAM bis zum Save-Punkt; `geheZuZuhause` persistiert nicht) — sie gehört zum offenen Persistenz-Befund, NICHT in diesen Cluster.

## Konsequenzen

- **Datensparsam by default:** ein Export gibt nur preis, was aktiv gewählt wurde; ohne Wahl verlässt nichts das Gerät. Keine Markierungs-Nebenwirkungen mehr.
- **Ein Akzent, überall:** der Sub-Depot-Akzent erreicht Einstellungen/Dialoge/Toasts über die Wurzel; Sicherheits-Signalfarben bleiben funktional.
- **Updates kommen an:** der Schalen-Schnitt v3 liefert U2-ADR-021/022/023 erstmals an installierte PWAs.
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258` unverändert (nur UI-/Render-/Auslieferungs-Schichten). Block-Integrität 2/0. Suite **906/0/1** (1 bewusster FHIR-Skip). Neuer Voll-Datei-SHA in `vivodepot.html.sha256` nachgezogen.
- **Mac-Abnahme:** die Klickpfade (Export-Dialog, Sub-Akzent in Einstellungen/Dialogen/Toasts, Mappen-Fuß-Notiz) sowie die `vm-akzent`-Klasse auf `<html>` (Toast-Scoping; im node-Stub nicht prüfbar) gehen auf die Geräte-Abnahme.

## Nachtrag 12.08.2026 — §1 wird Opt-out bei gesetzter `sektorId`

**§1 wird nicht zurückgenommen, sondern fortgeschrieben.** Der Grund für Opt-in stand nie im
Kästchen selbst, sondern in der Persistenz: „Ausgehaktes wurde persistent in
`data.sensibelFelder` geschrieben … jeder Export hinterließ Markierungs-Nebenwirkungen." Diese
Persistenz ist seit `exportAuswahlEphemerAnwenden` (§1, derselbe ADR) gelöst — die Auswahl war
schon immer ephemer, unabhängig davon, welche Richtung sie startet.

**Was die Vorauswahl zurückbringt, ist eine ANDERE Messung, frisch am 12.08.2026 erhoben:** ein
Opt-in über hunderte Zeilen (ein Bereich trägt bis zu 31 Felder) wird in der Praxis über
„Alles auswählen" bedient — ein einziger Klick, der die Datensparsamkeit, die Opt-in herstellen
sollte, wieder aufhebt. Die Bürgerin liest die Liste nicht Zeile für Zeile; sie sieht eine lange
Auswahl und klickt den Schnellweg. Das Kästchen erzeugt damit die ILLUSION einer Entscheidung,
nicht die Entscheidung selbst.

**Die neue Fassung (Zug 1–3 des Auftrags, `flowExportUebersicht` bei gesetzter `sektorId`):**
Normalweg zeigt, was mitgeht (Aufzählung, kein Bedienelement je Zeile) und nennt beim Namen, was
nicht mitgeht. Ein zweiter Weg „Etwas zurückhalten" führt zu einer Zeile je Angabe mit dem
Zustand als SATZ statt als Symbol und einem Knopf, der die Handlung benennt („Zurückhalten"/
„Doch mitgeben") — kein Kästchen, das in beide Richtungen gelesen werden könnte. Schema-/
nutzer-sensible Felder starten weiterhin standardmäßig zurückgehalten; die Bürgerin entscheidet
sich aktiv FÜR das Mitgeben einer geschützten Angabe, nicht durch Untätigkeit dagegen.

**`sektorId:null` bleibt UNVERÄNDERT Opt-in** (Gesamt-PDF, volles JSON) — dort sind es
hunderte Felder über alle Bereiche, und die Auswahl ist eine echte, bewusste Entscheidung, kein
Fall von „fast immer alles". Zwei verschiedene Situationen, zwei verschiedene Vorauswahlen —
keine Regel wurde einfach umgedreht.

**Was UNVERÄNDERT bleibt (Zug 3 des Auftrags):** die Ephemer-Mechanik selbst. Keine Auswahl
persistiert über den Dialog hinaus; jeder Export beginnt wieder bei der Schema-/Bestands-Lage.
Der Feldzeilen-Sensibel-Knopf (A64, 30.07.2026) entfällt (Zug 5) — die einzige verbleibende
Bedienstelle für Sensibilität ist dieser Dialog; `feldIstSensibel`/`data.sensibelFelder` als
Datenmodell bleiben unangetastet (Legacy-Bestandsdepots mit älteren Markierungen bleiben lesbar).

## Implementations-Verweis

Umgesetzt 19.06.2026 (clean-rebuild):
- **Kern** `vivodepot.html`: `exportAuswahlEphemerAnwenden` + opt-in-`flowExportUebersicht` + Strings + CSS (§1); `_subAkzentBasis`/`setzeSubDepotAkzent`/`Modus._setzeIntern` + Toast-CSS `html.vm-akzent` (§2); `groesseLesbar`/`renderMappe`-Fußnote + CSS + String (§4b). `sw.js` + `pages/sw.js`: `vivodepot-shell-v3` (§3).
- **Tests:** neu `sammelfix-ux.test.js` (Opt-in: nur Angekreuztes raus / nichts→nichts / alles / ephemer-Markierung erhalten / Dialog-Render; Sub-Akzent an der Wurzel + Modus-Robustheit). Nachgezogen: `mappe-datenmodell.test.js` (groesseLesbar „< 1 KB"). `load-kern.js`: `exportAuswahlEphemerAnwenden` exportiert.
