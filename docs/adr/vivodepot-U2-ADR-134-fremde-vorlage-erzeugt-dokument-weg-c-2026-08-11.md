# U2-ADR-134: Eine fremde Vorlage darf ein Dokument erzeugen — Weg C, Signatur beweist Herkunft, nicht Richtigkeit

**Status:** Akzeptiert
**Datum:** 11.08.2026
**Kategorie:** ARCHITEKTUR
**Grundlage:** interner Auftrag „K9 – Fremde Vorlagen, Weg C" (10.08.2026), gestützt auf eine
Entscheidungsvorlage vom 09.08.2026, Register-Befund **K9** (`offen`, letzter der beiden bei
A153 noch offenen Befunde neben S6).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `felderAusClaims` (provider-credential-Format),
  `_planAusRoh`, `importAnwenden` (neuer `data.importierteVorlagen`-Schreibpfad),
  `_vorlageDokAusgabe`, `_modulOderVorlage`, `dokumentHTML`/`dokumentOeffnen`/
  `zeichneDokumentPdf`/`_dokumentWirksamkeitPlain`/`_dokumentDateiname`/
  `flowDokumentInMappeAblegen` (alle auf `_modulOderVorlage` umgestellt), `renderSektor`
  (neuer „Dokument erzeugen"-Knopf), `verdrahteSektorAktionen`. `vivodepot-template-
  generator.html` — Wortlaut-Eingabefeld im regulären Anbieter-Wizard (`STATE.wortlaut` +
  drei Herkunftsfelder + optionale Broschüre-Zweitquelle), `?intern=basistemplate`-Sonderweg
  entfernt.
- **Sprint-Commit:** `02b93b6`.
- **ADR-Bezug:** U2-ADR-131 (Modul-Vertrag/dokAusgabe-Datenvertrag, K8 — hier wiederverwendet,
  nicht dupliziert), U2-ADR-040 (Basistemplate-Treuhand-Signatur, Ursprung von `wortlaut`/
  `wortlautQuelle` im Template-Schema), U2-ADR-037/-039/-051 (Trust-1B, zweistufige
  Signaturkette, Pflicht-Signatur, mitgereiste Code-Listen — hier unverändert, nur ein neuer
  Konsument der bereits geprüften Nutzlast).
**Status heute:** gilt — Beleg `tests/k9-fremde-vorlage-dokument.test.js#[K9·Regel18] Vorlage MIT gültiger Signatur → dokumentHTML erzeugt ein Blatt`.

---

## Kontext — zwei Korpus-Formen, die nicht verbunden waren

Die eingebauten Korpora (PV/Vollmacht/Betreuung/KI) haben ein `steps[]`-Generator-Modul und
erzeugen Dokumente. Die externen Vorlagen (`STANDARD_VORLAGEN`, provider-credential-Import)
hatten ein Schema (`validateTemplate`), eine zweistufige Signaturprüfung
(`verifiziereTemplateKette`/`_verifiziereTemplateSignatur`) und einen echten Importweg von
außen — aber aus ihnen entstand **kein** Dokument. Eine extern geladene Vorlage wurde zu
generischen Formularfeldern (`tpl_`-Präfix); ein mitgeführter `wortlaut` wurde zwar von
`validateTemplate` bereits strukturell akzeptiert (inkl. Pflicht-Herkunftsangabe
`wortlautQuelle.{behoerde,titel,lizenz}`), aber beim Übernehmen ins Depot (`felderAusClaims`)
stillschweigend verworfen — nichts in `data` trug ihn weiter. Der öffentliche
Template-Generator-Wizard hatte gar kein Wortlaut-Eingabefeld; der wortlautfähige Pfad war nur
über den internen `?intern=basistemplate`-Sonderweg erreichbar (Vivodepot-eigene
Treuhand-Signatur der vier eingebauten Korpora).

## Entscheidung — Weg C aus der Entscheidungsvorlage vom 09.08.2026

**Eine externe, zweistufig signierte Vorlage mit `wortlaut` erfüllt den `dokAusgabe`-
Datenvertrag (U2-ADR-131) und läuft durch DIESELBE Ausgabeschicht wie PV/Vollmacht/Betreuung/
KI.** Kein zweiter Ausgabepfad — `dokumentHTML`/`dokumentOeffnen`/`zeichneDokumentPdf` sind
dieselben Funktionen, erweitert um einen Lookup (`_modulOderVorlage`), der ENTWEDER ein
eingebautes `VORSORGE_MODUL` ODER einen `data.importierteVorlagen`-Eintrag auflöst und
denselben `{ generator, dokAusgabe }`-Vertrag zurückgibt. Fehlt `generator` (eine importierte
Vorlage hat keine `steps[]`-Bausteinsystematik), lesen die drei Ausgabefunktionen
`dokAusgabe.abschnitte` direkt statt über `modulDokumentAbschnitte` — dieselbe Form
(`{titel, zeilen}[]`), damit HTML- UND PDF-Pfad sie identisch behandeln (ein zunächst
gewähltes separates `extraHTML` hätte den PDF-Pfad leer gelassen — geprüft, korrigiert, bevor
es geschrieben wurde).

**Das Gate ist die Signaturkette, und es ist bindend.** Ein `data.importierteVorlagen`-Eintrag
entsteht in `importAnwenden` NUR, wenn `plan.wortlaut` gesetzt ist — und `plan.wortlaut`
erreicht `importAnwenden` NUR, wenn `felderAusClaims` es liefert, was NUR geschieht, wenn
`cs.template` beide vorgeschalteten Prüfungen bestanden hat (`_verifiziereTemplateSignatur`
gegen den TA-zertifizierten Anbieter-Key UND `validateTemplate`, s. `importPlanGeprueft`).
Ohne bestandene Prüfung bleibt der heutige Zustand: Formularfelder, kein Dokument. Kein
Notausgang, kein Entwicklerschalter, keine Ausnahme für lokale Dateien — dieselbe Härte, die
Trust-1B (U2-ADR-039) für jede Anbieter-Vorlage bereits durchsetzt.

**Das erzeugte Blatt nennt die Quelle.** `herkunftText` (rendert direkt unter der Überschrift,
wie bei den eingebauten Korpora — nicht im Fuß) sagt explizit: „Der folgende Wortlaut stammt
von {anbieter} — nicht von Vivodepot verfasst oder geprüft." `{anbieter}` kommt aus
`credentialSubject.anbieterName` — demselben bereits signierten Cert, aus dem auch
`publicKeyJwk` stammt (keine zweite, ungeprüfte Quelle für den Namen). Die Signatur beweist die
Herkunft, nicht die Richtigkeit — der Satz behauptet an keiner Stelle Wirksamkeit, er sagt nur,
wer den Text geschickt hat. Dieselbe Linie wie die eingebauten Korpora (die ihre BMJ-Herkunft
ebenfalls nennen) — ein Blatt aus einer fremden Vorlage ohne Quellenangabe wäre die einzige
Stelle im Haus, an der Vivodepot eine Herkunft verschweigt.

**Der Generator bekommt sein Wortlaut-Eingabefeld — der `?intern=basistemplate`-Sonderweg
entfällt.** Bewiesen, nicht angenommen: ein Test (`tests/template-generator.test.js`, „[K9]
Zug 3 Parität") baut denselben eingebauten Basistemplate-Inhalt (patientenverfuegung) über den
REGULÄREN Wizard-Weg nach und vergleicht den kanonischen Inhalts-Hash gegen
`basistemplate-inhalte.json` — identisch. Die interaktive UI (verstecktes Panel,
Datei-Upload-Zeremonie) ist entfernt; die zugrundeliegende Funktion
`basistemplateTreuhandSignieren` bleibt als reine, direkt aufrufbare/getestete Funktion
bestehen — der lebende Pfad für eine künftige Batch-Neusignierung (z. B. bei
Treuhand-Schlüssel-Rotation), nur ohne eigenen UI-Knopf.

## Was NICHT Teil dieser Entscheidung ist

**Ob und wie eine fremde Vorlage geprüft wird, bevor sie ankommt** (die Governance/Vetting-
Frage) — die Entscheidungsvorlage nimmt sie ausdrücklich heraus, das ist eine eigene, größere
Frage.

**Keine Anbieter-Verwaltung, keine Vertrauensliste** — die zweistufige Signaturkette
(Trust-1B) bleibt der einzige Vertrauensmechanismus, unverändert.

**Kein zweiter Ausgabepfad und keine Änderung der eingebauten Korpora** — PV/Vollmacht/
Betreuung/KI sind byte-unverändert (`tests/k8-byte-gleichheit.test.js` bleibt grün).

## Verifikation

Regel 18, drei Proben real rot⇄grün: Vorlage ohne gültige Signatur → kein
`importierteVorlagen`-Eintrag, kein Dokument · Vorlage mit gültiger Signatur → ein Dokument ·
Herkunftszeile Pflicht, ihr Fehlen macht die Probe rot. Browser-Abnahme, echter Klickweg
(`tests/e2e/k9-fremde-vorlage-abnahme.spec.js`): Vorlage importiert (Signaturprüfung läuft
ECHT, nur der Vertrauensanker ist im e2e-Kontext der App-eigene Test-Sentinel statt des
produktiven TA-Schlüssels, den niemand außerhalb der Treuhand-Zeremonie besitzt) →
„Dokument erzeugen" geklickt → Herkunftszeile + Wortlaut im echten Overlay sichtbar.
Volle Suite plus Konformität gegen Zug 0 grün.
`tools/adr-konformitaet-pruefen.js` 0 rot.
