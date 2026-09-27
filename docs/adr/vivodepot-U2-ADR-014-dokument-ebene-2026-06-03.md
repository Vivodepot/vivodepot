# U2-ADR-014: Was ist ein Dokument? — Die Dokument-Ebene über Feldern und Dateien

**Status:** Akzeptiert (Freigabe 03.06.2026) · Code gebaut (Nachtrag 04.08.2026: `data.dokumente[]`,
`dokFussHaftung` (`vivodepot.html:4063`) und `pdfFussText` (`:23406`) im Kern vorhanden, bei einer
eigenen Nachsuche selbst nachgemessen; reine Statuskorrektur, keine inhaltliche Überarbeitung)
**Datum:** 03.06.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX
**Grundlage:** Produktentscheidung
**Cross-Referenz:** U2-ADR-010 (Feld-Architektur — Felder bleiben alleiniger Werte-Speicher), U2-ADR-013 (Dokumenten-Mappe — `ref:mappe`, Muster `data.mappe[]`), U2-ADR-009 (Template/Wizard — Wizards registrieren Dokument-Datensatz), U2-ADR-012 (Situationsblatt — `sensibel`-Querschnitt), U2-ADR-008 (Propagation/Referenz-Modell `{ref, override}`), U2-ADR-005 (Urheberschaft pro Eintrag). Grundlage: vier eigene Inventuren + drei eigene Kohärenz-/Geltungsprüfungen (03.06.2026).
**Status heute:** gilt — vollständige Dokument-Ebenen-API im Kern nachweisbar (`dokumentAnlegen`/`dokumentSetzen`/`dokumentAmpelStatus` u. a. ab `vivodepot.html:20785`), Migration `data.erinnerungen` → `data.dokumente[]` vorhanden (`:21343`).

---

## Kurzfassung

Der Begriff „Dokument" wird in Vivodepot uneinheitlich verwendet — mal ein Feld, mal eine Datei, mal eine Sammlung von Feldern. Es gibt kein erstklassiges Dokument-Objekt. Dieser ADR definiert die Dokument-Ebene grundlegend: Ein Dokument ist ein *dünner, benannter Datensatz, der auf bestehende Felder (und optional eine Mappe-Datei) verweist* und eigene Eigenschaften trägt (Typ, gültig ab, Prüf-Rhythmus). Es ist *kein* zweiter Speicher-Ort für Werte — die Werte bleiben in den Feldern. Damit bleibt das eine Ordnungsprinzip der generischen Maschine (U2-ADR-010) erhalten, und die Prüftermine bekommen erstmals einen sauberen Platz.

## Kontext

Vier Inventuren (03.06.2026) zur Frage, wo Prüftermine hingehören, haben einen tieferliegenden Befund freigelegt: Die Prüftermine hatten keinen klaren Platz, weil es kein klares Verständnis davon gibt, was ein Dokument in Vivodepot überhaupt ist. Jede Inventur eröffnete eine neue Umsetzungs-Variante, weil die zugrunde liegende Frage nie entschieden wurde. Das ist die Ursache des drohenden Stückwerks — nicht die einzelne Variantenwahl.

Die Recherche zur ADR-Deckung (03.06.2026) hat außerdem ergeben: Das bestehende Erinnerungs-/Ampel-/Prüftermine-Modell (`data.erinnerungen`) ist durch **keine** ADR gedeckt — es existiert nur in Verifikations-Dokumenten. Dieser ADR ist daher auch die erste Gelegenheit, dieses Modell formal einzuordnen.

## Bestandsaufnahme — was heute existiert

Aus den vier Inventuren gesichert: Vivodepot kennt heute genau zwei Orte, an denen Information liegt, plus mehrere Querschnitt-Eigenschaften, die sich daran hängen. Eine Dokument-Ebene dazwischen gibt es nicht.

| Ebene / Eigenschaft | Wo | Gedeckt durch |
|---|---|---|
| Felder in Bereichen (die Werte) | `data.sektoren[sektorId]` | U2-ADR-010 Feld-Architektur |
| Dateien in der Mappe | `data.mappe[]` (nur „hinzugefügt am", kein Typ/Status) | U2-ADR-013 Dokumenten-Mappe |
| Urheberschaft pro Eintrag | Querschnitt | U2-ADR-005 |
| Sensibilität (`sensibel`) | Querschnitt | U2-ADR-012 Situationsblatt |
| Propagation (einmal eintragen) | Querschnitt | U2-ADR-008 |
| Erinnerung / Prüftermin | `data.erinnerungen` (zielId `sektor:` / `mappe:`) | **keine ADR** |
| Dokument-Erzeugung durch Wizards | schreibt nur Bereichs-Felder | U2-ADR-009 Template-Architektur |

Ein „Dokument" im Sinne des Bürgers — eine Vorsorgevollmacht, ein Testament, ein Schwerbehindertenausweis — ist heute **nicht modelliert**. Es entsteht nur emergent: als Bündel zusammengehöriger Felder, manchmal von einem Wizard erzeugt, manchmal mit einer zugehörigen Datei in der Mappe. Es gibt nichts im Datenmodell, das sagt „dies ist eine Vorsorgevollmacht, sie gilt ab dem X, sie sollte jährlich geprüft werden".

## Problem

Weil das Dokument als Begriff nicht definiert ist, bedeutet „Dokument" an jeder Stelle etwas leicht anderes — ein Feld, eine Datei, eine Feld-Sammlung. Drei konkrete Folgen:

- Die Prüftermine haben keinen Ort: Ein „gültig ab" gehört zu einem Dokument, aber es gibt kein Dokument, an das es sich hängen ließe. Es gibt im ganzen System nur vier Datumsfelder, davon ein einziges echtes Dokument-Datum (`testament_datum`).
- Es droht ein zweites Ordnungsprinzip: Würde man ein Dokument als eigenständigen Werte-Speicher neben den Feldern einführen, gäbe es zwei konkurrierende Modelle dafür, wo Information liegt — genau die Vermischung, die langfristig Stückwerk erzeugt.
- Das halb angelegte `mappe:`-Schema im Erinnerungs-Modell ist selbst ein nie zu Ende gedachtes Fragment — ein Symptom desselben fehlenden Begriffs.

## Entscheidung

> Ein Dokument ist ein dünner, benannter Datensatz, der auf bestehende Felder (und optional eine Mappe-Datei) verweist und eigene Metadaten trägt — kein zweiter Speicher-Ort für Werte.

Konkret:

- **Die Werte bleiben in den Feldern.** Ein Dokument speichert keine Feld-Werte. Es verweist auf sie. Das Ordnungsprinzip der generischen Maschine (U2-ADR-010) bleibt das einzige — Dokumente treten nicht in Konkurrenz dazu, sie liegen als dünne Schicht darüber.
- **Ein Dokument-Datensatz trägt nur Metadaten:** Typ (z. B. „Vorsorgevollmacht"), Name, Bereichszugehörigkeit, `gueltigAb`, Prüf-Rhythmus, sowie Referenzen auf die zugehörigen Felder und optional eine Mappe-Datei (über das bestehende `ref:mappe` aus U2-ADR-013).
- **Eigener Speicher-Ort:** `data.dokumente[]` als dünnes Register im Depot-Daten-Teil, nach dem erprobten Muster von `data.mappe[]`. Bewusst *nicht* in `data.sektoren` (dort würde es den feld-strikten Export-Filter umgehen — Datenleck-Risiko, in der Inventur belegt) und bewusst *nicht* als Überladung von `data.erinnerungen`.
- **Standard plus eigene:** Pro Bereich kennt Vivodepot eine Standard-Liste typischer Dokumente (Vorsorgevollmacht und Patientenverfügung in „Vorsorge & Recht" usw.), die der Bürger nutzen oder um eigene ergänzen kann. Die Standard-Liste ist Teil der eingefrorenen Bereichs-Registry; eigene Dokumente liegen im Depot-Daten-Teil.
- **Dezentrale Pflege, zentrale Übersicht:** Ein Dokument lebt im Bereich, in dem der Bürger es einträgt. Das Prüfblatt liest alle Dokument-Datensätze über alle Bereiche und zeigt sie an einem Ort, mit Sprung zurück in den Bereich.

## Konsequenzen

**1 — Die Prüftermine-Frage wird trivial.** Das `gueltigAb` plus Rhythmus liegt im Dokument-Datensatz. Das Prüfblatt sammelt alle Dokumente mit `gueltigAb` ein und wendet die bestehende Ampel-Logik (`erinnerungAmpelStatus`) über eine kleine Feld-Brücke an. Die vierfache Varianten-Diskussion (ein Termin pro Bereich / mehrere / Mappe-gebunden / Register) entfällt — die Antwort folgt aus der Definition.

**2 — Das Erinnerungs-Modell wird abgelöst und erstmals formal verortet.** `data.erinnerungen` war nie ADR-gedeckt. Seine Aufgabe (Termin + Rhythmus) geht im Dokument-Datensatz auf. Dieser ADR ist die erste formale Heimat dieser Logik. Migration bestehender `data.erinnerungen`-Einträge in Dokument-Datensätze ist Teil des Umsetzungs-Auftrags.

**3 — Verhältnis zu den bestehenden U2-ADRs (geprüft).** Dieser ADR sitzt als Definitions-Schicht über mehreren bestehenden ADRs. Die Bezüge sind gegen die echten ADR-Texte geprüft (siehe „Prüf-Status"): U2-ADR-010 (Felder bleiben alleiniger Werte-Speicher — Dokument verweist nur), U2-ADR-013 (ein Dokument darf eine Mappe-Datei über `ref:mappe` referenzieren), U2-ADR-009 (Wizards registrieren/füllen einen Dokument-Datensatz und setzen sein `gueltigAb`), U2-ADR-012 (Situationsblätter dürfen Dokumente referenzieren; `sensibel` bleibt Querschnitt), U2-ADR-008 (Propagation unberührt), U2-ADR-005 (Urheberschaft pro Feld unberührt).

**4 — Wizards setzen künftig ein gültig-ab.** Heute setzt nur der Erbschafts-Wizard ein Datum (`testament_datum`). Künftig registriert jeder dokument-erzeugende Wizard einen Dokument-Datensatz und setzt dessen `gueltigAb`. Das ist additiv zum bestehenden Schreibpfad.

**5 — Bestehende Datumsfelder bleiben vorerst.** `testament_datum` (gelesen von Erbschafts-Wizard, ICS-Export, Import) und `schwerbehindertenausweis_gueltig` (nur Import) bleiben zunächst unangetastet, um den ICS-Export nicht zu brechen. Perspektivisch wandern sie in den jeweiligen Dokument-Datensatz; das ist eine eigene, spätere Aufräum-Entscheidung, nicht Teil dieses ADR.

**6 — Sprung zum Dokument.** Das bestehende Muster `oeffneSektorFeld` + `scrollIntoView` wird um einen `data-dokument-id`-Anker erweitert, damit das Prüfblatt nicht nur in den Bereich, sondern zum konkreten Dokument springt.

**7 — Feld-Adressierung über `sektorId + feldId` (Auflage aus der Kohärenzprüfung).** Das bestehende `{ref, override}`-Muster (U2-ADR-008/010) referenziert Entitäten in Zentral-Speichern (`data.menschen[]`, `ref:mappe`), nicht einzelne Sektor-Felder. Damit ein Dokument-Datensatz auf seine Felder verweisen kann, muss eine Feld-Adressierung über `sektorId + feldId` ausformuliert werden. Das ist additiv — U2-ADR-010 verbietet weder neue Referenz-Ziele noch friert es die Liste der Referenz-Arten ein. Das Muster „Sektor öffnen + zum Feld scrollen" existiert bereits (U2-ADR-012, `oeffneSektorFeld`) und liefert die Adressierungs-Grundlage.

**8 — Verwaiste Verweise: Fallback-Disziplin (Auflage aus der Kohärenzprüfung).** U2-ADR-009 verlangt „Fallback-Render für verwaiste Daten", U2-ADR-010 dokumentiert Referenz-Persistenz (die referenzierte Entität überlebt den Verweis). Die Dokument-Ebene muss dieselbe Disziplin erfüllen: Wird ein referenziertes Feld oder dessen Wert entfernt, darf der Dokument-Datensatz nicht brechen — sein `gueltigAb` und seine Metadaten bleiben gültig, der Verweis wird leer dargestellt statt einen Fehler zu erzeugen. Diese Regel ist im Umsetzungs-Auftrag verbindlich.

**9 — Keine zweite Tür (Auflage aus U2-ADR-013).** Das Dokument-Register `data.dokumente[]` darf sich in der Oberfläche *nicht* als zwölfter Bereich oder als zweite, eigenständige Tür neben der Mappe manifestieren. Es ist eine Datenmodell-Schicht und eine Lese-Sicht (das Prüfblatt), kein neuer Navigations-Bereich. Die „eine Mappe / kein zwölfter Bereich"-Regel aus U2-ADR-013 gilt sinngemäß auch hier.

**10 — Krypto-Agnostik wahren (Auflage aus U2-ADR-013).** Das Dokument-Register hält *keine* Datei-Bytes. Verweist ein Dokument auf eine Datei, geschieht das ausschließlich über `ref:mappe` — die Bytes bleiben in `data.mappe[…]`. Das Register trägt nur Metadaten und Referenzen und wird wie das ganze Depot über die bestehende Krypto-Surface verschlüsselt, ohne selbst Krypto zu berühren.

**11 — Verhältnis `sensibel` / Export ausformulieren (Auflage aus U2-ADR-012).** Die `sensibel`-Property ist ein allgemeiner Querschnitt (U2-ADR-012) und gilt auch für Dokumente. Der Umsetzungs-Auftrag muss festlegen, wie sich `sensibel` auf einem Dokument zum Export verhält (analog `SITUATION_FELD_EXPORT`) — was bei Druck und Akut-Export eines Dokuments erscheint und was zurückgehalten wird.

**12 — Tests.** Betroffen sind die Erinnerungs-/Ampel-/Prüftermine-Tests (`erinnerungen.test.js`, `ampel.test.js`, `prueftermine.test.js`) und die Wizard-Tests. Sie werden auf das Dokument-Modell umgestellt. Dokument-Ebene, `gueltigAb`, Feld-Adressierung, verwaiste Verweise und Sprung sind heute ungetestet und bekommen eigene Tests.

## Bewusst nicht entschieden

Die innere Struktur eines Dokument-Datensatzes (genaue Feld-Namen, wie Referenzen auf Felder technisch abgelegt werden) ist eine Umsetzungsfrage für die Umsetzung nach Abnahme dieses ADR. Ebenso die genaue Gestalt der Standard-Listen pro Bereich (Inhalt, nicht Struktur) — das ist Produkt-Arbeit, die auf diesem ADR aufsetzt.

Das spätere Ablösen der zwei verbliebenen Bereichs-Datumsfelder (Konsequenz 5) ist als Folge-Aufräumung benannt, aber nicht hier entschieden.

## Prüf-Status vor „Akzeptiert"

Die ADR-Bezüge sind vollständig geprüft und bestätigt:

- **ADR-Deckung:** Die Recherche (03.06.2026), unabhängig gegengeprüft, hat belegt: Kein Vorgänger-ADR deckt das Erinnerungs-/Prüftermine-Modell — es gibt nichts abzulösen. (`docs/cc-adr-deckung-erinnerung-antwort-2026-06-03.md`, Gegenprüfung `docs/cc-adr-deckung-erinnerung-PRUEFUNG-2026-06-03.md`.)
- **Alter ADR-Kanon:** Die Geltungsklärung (03.06.2026) hat belegt: Der nackte `ADR-NNN`-Kanon bindet den Rebuild nicht direkt (U2-ADR-001: „Kandidatin, nicht beschlossene Ablösung"); alte ADRs wirken nur dort hinein, wo eine U2-ADR sie übernimmt. Keine alte ADR berührt die Dokument-Ebene. Gegen den alten Kanon ist nichts zu prüfen. (`docs/cc-verhaeltnis-adr-kanon-antwort-2026-06-03.md`.)
- **Kohärenz U2-ADR-009 / 010:** Kein Widerspruch (Feld-Architektur, Template/Wizard). (`docs/cc-kohaerenz-dokument-ebene-antwort-2026-06-03.md`.)
- **Kohärenz U2-ADR-008 / 012 / 013:** Kein Widerspruch (Referenz-Modell, Situationsblatt, Mappe). Die Dokument-Ebene klinkt sich additiv in die Kette 008 → 013 → 012 ein. (`docs/cc-kohaerenz-dokument-ebene-nachbarn-antwort-2026-06-03.md`.)

Alle aus den Prüfungen herausgearbeiteten additiven Auflagen sind als Konsequenzen 7 bis 11 in diesen ADR eingearbeitet. Damit war der ADR ohne Vorbehalt abnahmebereit. Die finale Nummer ist vergeben: **U2-ADR-014** (Nummer 007 bleibt für den Gesundheits-Sektor reserviert). **Status am 03.06.2026 auf „Akzeptiert" freigegeben** (Produktentscheidung); die Umsetzung (Datenmodell `data.dokumente[]`, Migration aus `data.erinnerungen`, Auflagen 7–11) folgt im Anschluss.
