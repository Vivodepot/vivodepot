# U2-ADR-079 · Delegierter FHIR-IPS-Export — RelatedPerson + Provenance (Wiedereinbau eines Clean-Slate-Verlusts)

**Status:** Akzeptiert · 12.07.2026 (Bau umgesetzt, Suite/Gates grün)
**Nummer:** U2-ADR-079 (verifiziert gegen `docs/adr/` — höchste belegte war U2-ADR-078).
**Typ:** Funktions-Wiedereinbau (im Clean-Slate-Neubau fallengelassene Fähigkeit) + Datenschutz-Entscheidung.
**Nimmt wieder auf:** ADR-063 (FHIR-Provenance im IPS-Bundle), ADR-064 (HL7-V3-RoleCode / Delegations-Beziehungs-Codierung) — beide interne dreistellige Reihe.
**Verwandt:** U2-ADR-050 (Lab-Producer entfernt), U2-ADR-044 (IPS-Ausschnitt), U2-ADR-059/060 (Sub-Depot/Angehörigen-Sicht), U2-ADR-005 (Provenienz pro Datensatz).
**Status heute:** gilt — Beleg `tests/fhir-ips-delegiert.test.js`.

---

## Kontext

### Der Clean-Slate hat eine gebaute Fähigkeit fallengelassen

Der Zusagen-Audit vom 12.07.2026 fand eine Kategorie von Lücken, die kein Rücknahme-ADR trägt: **Funktionen, die im alten Produktiv-Stand (beta16) gebaut waren, im Clean-Slate-Neubau aber ersatzlos fehlen — ohne dass eine Entscheidung sie zurückgenommen hätte.** Sie sind nicht verworfen worden; sie sind beim Port vergessen worden.

Zwei dieser Lücken betreffen den delegierten Gesundheits-Export:

- **HL7-V3-RoleCode / Beziehungs-Codierung (ADR-064).** beta16 trug `BEZIEHUNGS_CODES` (16 Codes), ein `beziehungZu`-Feld und eine `RelatedPerson`-Ressource. Der Clean-Slate: 0/0/0 — die Beziehung zwischen verwaltender und verwalteter Person war Freitext, nirgends codiert.
- **FHIR-Provenance im IPS-Bundle (ADR-063).** beta16 baute Provenance-Ressourcen in den Export. Der Clean-Slate: `fhirIpsBundle` ohne jede Provenance.

Der Nachweis lief über `git log -S` (null Commits, die die Symbole je in den Clean-Slate brachten) und einen Symbol-Vergleich beta16 ↔ `vivodepot.html`. Beide ADRs sind intern „superseded" notiert, aber **kein Nachfolge-ADR nimmt die Fähigkeit begründet zurück** — und das öffentlich veröffentlichte VC-Paper (Finding 3) behauptet weiterhin, Vivodepot „uses HL7 V3 RoleCode".

Diese ADR baut beide Fähigkeiten wieder ein und benennt ausdrücklich, dass sie im Clean-Slate verlorengingen.

### Der eigentliche Bau-Anlass: der delegierte Export baute nur aus dem eigenen Depot

`fhirIpsBundle()` baut das IPS-Bundle aus `data` — dem gerade geöffneten Depot. Das ist im Selbst-Fall richtig: die Bürgerin stellt ihre eigene Patientenkurzakte zusammen und ist deren Autorin (`Composition.author = Patient`, gedeckt vom verifizierten IPS-Ausschnitt: `Composition-uv-ips.author` erlaubt Patient und RelatedPerson).

Im **delegierten** Fall stimmt das nicht mehr. Eine verwaltende Person (der „Anker") öffnet ein Sub-Depot, das sie in Vertretung führt — als Bevollmächtigte oder gesetzliche Vertreterin — und exportiert dessen Gesundheitsdaten. `subKontextBetreten` schwenkt `data` auf den Sub-Inhalt; der Export baut also korrekt die Daten der verwalteten Person. Aber:

- **Die Eigentümerin hat das Dokument nicht zusammengestellt — die vertretende Person hat es.** `Composition.author = Patient` wäre eine Fehlangabe der Urheberschaft.
- **Es gibt keine Spur, dass jemand in Vertretung gehandelt hat.** Keine RelatedPerson, keine Provenance.

Der Export war damit im delegierten Fall unehrlich über seine eigene Urheberschaft. Das ist eine Bauaufgabe, keine Architekturentscheidung: die Sub-Depot-Architektur (Zugriff, Blackbox-Export, Vertretungs-Grundlage) steht; was fehlte, war die Urheberschafts-Wahrheit im generierten Dokument.

---

## Entscheidung

**`fhirIpsBundle` erhält einen delegierten Bau-Zweig.** Übergibt der Export-Flow einen Anker-Entscheid (`opt.anker`), baut das Bundle zusätzlich:

1. eine **RelatedPerson** — die vertretende Person, mit HL7-V3-RoleCode-codierter Beziehung zur Patientin;
2. eine **Provenance** — die Zusammenstellungs-Spur (Pflichtfelder `target` → Composition, `recorded`, `agent.who` → RelatedPerson, `agent.onBehalfOf` → Patient);
3. und setzt **`Composition.author` auf die RelatedPerson** statt auf die Patientin.

Der Selbst-Fall (kein `opt.anker`) bleibt byte-für-byte unverändert: keine RelatedPerson, keine Provenance, `author = Patient`.

### Warum author = RelatedPerson (und nicht zusätzlich Patient)

Zwei Gründe, die zusammenfallen:

- **Ehrlichkeit.** Im delegierten Fall hat die abwesende Eigentümerin nicht mitgeschrieben. Die vertretende Person ist die Autorin. `author = [Patient, RelatedPerson]` würde behaupten, beide hätten zusammengestellt — die Eigentümerin war gerade nicht da. Also allein die RelatedPerson.
- **FHIR-Dokument-Integrität.** In einem Dokument-Bundle muss jede Ressource außer Provenance von der Composition erreichbar sein. Eine nur über die Provenance erreichbare RelatedPerson würde die Validierung reißen. Als `Composition.author` referenziert, ist die RelatedPerson von der Composition erreichbar — Ehrlichkeit und Integrität ziehen an derselben Stelle.

Die Patientin bleibt `Composition.subject` — das Dokument handelt weiterhin von ihr.

### Datensparsamkeit — welche Daten der Anker-Person mitgehen

Es gehen Daten einer **dritten** Person (der vertretenden) in ein Dokument über **jemand anderen** (die Patientin). Deshalb die Minimal-Entscheidung (12.07.):

- **Name plus Beziehung — mehr nicht.**
- **Kein Geburtsdatum der Anker-Person.** `RelatedPerson.birthDate` ist FHIR-optional; es trägt zum Zweck (Wer hat in Vertretung zusammengestellt?) nichts bei und bleibt weg.
- **Der Name geht nur mit ausdrücklicher Einwilligung mit.** Ohne Einwilligung: RelatedPerson ohne `name`, Beziehung = `OTH` (NullFlavor) — die Spur „in Vertretung erstellt" bleibt, ohne die vertretende Person zu benennen.

ADR-064 sagt zur Frage, welche Daten der Anker-Person mitgehen, nichts — es regelt die Beziehungs-**Codierung**, nicht den Feldsatz der RelatedPerson. Diese Entscheidung wird hier getroffen.

### Die Steuerung sitzt bei der exportierenden Anker-Person — nicht bei der Eigentümerin

Der naheliegende Reflex — „die Eigentümerin entscheidet über ihr Dokument" — trägt hier nicht: **im delegierten Fall ist die Eigentümerin gerade nicht da.** Und es sind die Daten der Anker-Person, die mitgehen. Wessen Daten mitgehen, der entscheidet. Also entscheidet die exportierende Anker-Person, am Export.

### Zwei gleichwertige Wege, kein stiller Default

Der Nudge gehört an den **Export**, nicht an die Anlage des Sub-Depots (dort ist die Frage noch nicht gestellt). Beim delegierten IPS-Export erscheint eine Gabel mit **zwei gleichwertigen Knöpfen**:

- „Mit meinem Namen und meiner Beziehung" → RelatedPerson trägt Name + codierte Beziehung.
- „Nur ‚unter Vollmacht erstellt'" → RelatedPerson ohne Namen, Beziehung `OTH`.

**Kein Default zieht still etwas mit.** Der dominante Knopf des Dialogs bricht ab (nichts wird exportiert); beide inhaltlichen Wege verlangen eine bewusste Wahl. Ein voreingestellter „mit Namen"-Weg würde den Namen der Anker-Person stillschweigend in ein fremdes Dokument tragen — genau das schließt die Gabel aus.

Das `beziehungZu`-Feld am `verwalteteDepots`-Eintrag speichert die zuletzt gewählte Beziehung als Vorbelegung des Selects; es wird nie ohne die Gabel wirksam.

---

## Was gebaut wurde

- **`BEZIEHUNGS_CODES`** (16 Einträge): 15 im System `http://terminology.hl7.org/CodeSystem/v3-RoleCode` (SPS, DOMPART, CHILD, STPCHLD, CHLDADOPT, PRN, STPPRN, SIB, GRPRN, GRNDCHILD, NIENEPH, AUNT, UNCLE, INLAW, FRND) + `OTH` im System `…/v3-NullFlavor`. Jeder Eintrag trägt `system`, `displayEn` (FHIR-`display`/`text`) und `displayDe` (Bürger-Wort im Select). Codes gegen die HL7-V3-RoleCode-CodeSystem-Strings geprüft (ADOPT→CHLDADOPT, NIENE→NIENEPH gegenüber beta16 korrigiert).
- **`fhirIpsBundle(jetzt, opt)`**: delegierter Zweig hinter `opt.anker`; unbekannter `beziehungCode` fällt auf `OTH`; Name nur bei `opt.anker.name` (family = letztes Token, given = Rest); Narrative über `_ipsNarrative`.
- **`flowGesundheitFhirExport`**: reicht `delegationsOpt` durch die Feld-Auswahl-Übersicht bis `kernAPI.exportiere('fhir-ips', …)`; `imSubKontext()` löst die Einwilligungs-Gabel aus (`flowDelegationsExportEntscheid`).
- **`beziehungZu: null`** am `verwalteteDepots`-Eintrag in `subDepotAnlegen` (Vorbelegung; kein Schema-Bump — additives Klartext-Metadatum wie `akzent`/`vertretungsGrundlage`).
- **STRINGS** `delExportTitel/Info/BeziehungLabel/Mit/Ohne` (Ton „Sie", verwaltende Person) + CSS `.del-wahl` (zwei gleich breite, gestapelte Sekundär-Knöpfe — optische Gleichwertigkeit).

---

## Verworfene Alternativen

**Geburtsdatum der Anker-Person mitschicken** (wie beta16 es optional konnte). Verworfen: trägt zum Zweck nichts bei, ist aber ein zusätzliches personenbezogenes Datum einer Dritten in einem fremden Dokument. FHIR-optional → weg.

**Steuerung bei der Eigentümerin.** Verworfen: im delegierten Fall ist sie abwesend; die Entscheidung würde nie getroffen. Und es sind nicht ihre Daten, die mitgehen.

**Stille Übernahme des Namens** (Default „mit Namen", weil komfortabler). Verworfen: würde den Namen einer Dritten ohne bewusste Wahl in ein fremdes klinisches Dokument tragen. Zwei gleichwertige Knöpfe ohne Default.

**Nudge an der Sub-Depot-Anlage.** Verworfen: dort ist der Export noch nicht im Blick; die Frage „wie erscheine ich im Dokument" gehört an den Moment, in dem das Dokument entsteht.

---

## Konsequenzen

**Positiv.** Der delegierte IPS-Export ist über seine Urheberschaft ehrlich: die vertretende Person ist die Autorin, die Vertretung ist als Provenance nachvollziehbar, die Beziehung ist maschinenlesbar codiert. Zwei im Clean-Slate verlorene Fähigkeiten (RoleCode, Provenance) sind wieder da — mit einem ADR, der den Verlust benennt. Die öffentliche „uses HL7 V3 RoleCode"-Aussage wird wieder wahr.

**Negativ / begrenzt.** Der Bau deckt den **IPS**-Export. Der Provenance-Wiedereinbau ist hier auf die delegierte Bundle-Provenance beschränkt (target/recorded/agent) — die schwereren Teile aus ADR-063 (Provenance pro Einzel-Ressource, inline-CodeSystem, URN-Policy-Codes) sind **nicht** Gegenstand dieser ADR und bleiben Folge-Arbeit.

**Nachzuziehen.**
- Konformität ist strukturell + gegen den verifizierten IPS-Ausschnitt geprüft, **nicht** gegen Gazelle. Der Gazelle-Lauf des delegierten Bundles ist die Geräte-/Upload-Strecke.
- VC-Paper Finding 3 („uses HL7 V3 RoleCode") stimmt wieder für den Kern; die Formulierung ist beim Paper-Durchgang trotzdem gegen den heutigen, engeren Umfang zu prüfen.
- Die verbleibenden zwei Clean-Slate-Verluste des Audits (EUDIW-Trust-Schicht/ADR-096; volle ADR-063-Provenance) sind eigene Bauten.

---

## Verifikation

- **Builder:** `fhirIpsBundle(jetzt, {anker})` node-verifiziert — RelatedPerson mit v3-RoleCode-Beziehung + Name (family/given) + **kein** `birthDate`; `Composition.author` → RelatedPerson; Provenance mit `target`→Composition, `recorded`, `agent.who`→RelatedPerson, `agent.onBehalfOf`→Patient; `OTH`-Zweig ohne Namen, Beziehung im NullFlavor-System; unbekannter Code → `OTH`-Fallback; Selbst-Fall (kein `opt`) unverändert (author=Patient, keine RelatedPerson/Provenance).
- **Tests:** `tests/fhir-ips-delegiert.test.js` (8 Fälle: Selbst-unverändert · Codierung+Name+kein-Geburtsdatum · author=RelatedPerson · Provenance-Pflichtfelder · OTH-ohne-Name · OTH-Fallback+Name-bleibt · 16-Code-Tabelle · Dokument-Struktur). `BEZIEHUNGS_CODES` in `load-kern` exportiert. Node-Suite **1354/0**.
- **Gates:** Block-Pin `8d31c678…` byte-identisch (Krypto-Block unberührt), PV-Golden **42/42**, `vivodepot.html.sha256` nachgezogen, SW-Cache **v53 → v54**, OSV CLEAN.
- Kein Push (eine Produktentscheidung).

## Konformität

```konformitaet
aussage:   U2-079: im delegierten IPS-Export ist die vertretende Person NIE Composition.author —
           statt der Eigentümerin trägt eine RelatedPerson mit codierter Beziehung die
           Urheberschaft, eine Provenance-Ressource dokumentiert die Vertretung.
zustand:   prüfbar
pruefung:  tests/fhir-ips-delegiert.test.js#[T079-3] Delegiert: Composition.author = RelatedPerson (Ehrlichkeit + Dokument-Integrität)
pruefung:  tests/fhir-ips-delegiert.test.js#[T079-4] Delegiert: konforme Provenance (target/recorded/agent.who/onBehalfOf)
quelle:    entscheidung
```
