# U2-ADR-030: Sozialversicherungs-Sektor — unsignierter SD-JWT-VC-Selbstauskunft-Export (Variante A)

**Status:** Akzeptiert
**Datum:** 21.06.2026
**Kategorie:** EXPORT, ARCHITEKTUR, PRODUKT
**Grundlage:** Befund-Inventur Sektor 7 (21.06.2026, read-only) + Produktentscheidung „Variante A, Format SD-JWT-VC".
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `VC_SOZIALVERSICHERUNG_MAPPING` + `sdJwtVcSozialversicherung` (nach `sdJwtVcFinanzen`); `EXPORT_FORMATE`-Eintrag `sd-jwt-vc-sozialversicherung` (`eudiw:true`); Sektor `sozialversicherung` (`exporte` + `format`); Import-Spiegelbild `_sdJwtSozialversicherungFelder` + `IMPORT_FORMATE`-Eintrag.
- **Sprint-Commit:** dieser Bau (Sammel-Queue, gebündelt zum v1.0-Umbau — noch nicht committet, Sichtung vor Bündelung).
- **ADR-Bezug:** dieser ADR (U2-ADR-030).
**Status heute:** gilt — Beleg `tests/sozialversicherung-export.test.js`, Mechanismen im Kern nachweisbar (`VC_SOZIALVERSICHERUNG_MAPPING`, `sdJwtVcSozialversicherung`, `_letzterStempel`/`_feldVerifiziertStaemmig`), von späteren ADRs (U2-ADR-036/038/080) als bestehender Wahrheits-Filter referenziert, nicht abgelöst.

---

## Kontext

Der Sektor `sozialversicherung` (Bereich 7) hatte keinen Export (kein `exporte`-Schlüssel) — „geklärt-nicht-gebaut". Der Pflegegrad-Anker liegt seit U2-ADR-018/019 hier (sozialrechtlich, SGB XI), nicht mehr in Gesundheit. Entschieden wurde **Variante A**: selbst-erklärter, **unsignierter** Export, ohne produktiven Root / ohne Tor 3.

## Entscheidung

Der Sektor erhält einen **SD-JWT-VC-Selbstauskunft-Export**, gebaut wie Identität/Finanzen:
- Builder `sdJwtVcSozialversicherung` mit `VC_SOZIALVERSICHERUNG_MAPPING` über alle **real existierenden** Sektor-Felder; `vct: 'urn:vivodepot:sozialversicherung'` (Konvention `urn:vivodepot:<bereich>`), `iss: 'urn:vivodepot:selbstauskunft'`, **unsigniert** (kein `_signJWS`, kein Issuer, kein Root).
- Serialisierung als JSON (Download) und — via `eudiw:true` in der Registry — automatisch über `eudiwSdJwtVcSerialisieren` für die „An EUDI-Wallet übergeben"-Übergabe.
- Selective Disclosure pro Claim (`sd:true`); die SV-Nummer zusätzlich `sensibel:true` (nur mit aktivem Opt-in im Credential), analog zu IBAN/Steuer-ID bei Finanzen. Nutzer-markierte Sensibilität (`sensibelFelder`) wird wie auf allen Export-Wegen respektiert.
- **Etikett-Korrektur:** das Sektor-Feld `format` stand auf `SEKTOR_FORMATE.W3C_VC` — ein **funktional totes Etikett** (der Export liest `exporte`, nicht `format`; gemessen). Es ist auf den real gebauten Pfad `SD_JWT_VC` korrigiert. Das `format`-Feld bleibt rein deklarativ; es steuert keinen Export.
- **Import-Spiegelbild:** Der Repo-Invariant „jede Export-ID hat eine Import-ID" (`tests/import-formate.test.js`) verlangt ein Import-Gegenstück. Hinzugefügt: `_sdJwtSozialversicherungFelder` + `IMPORT_FORMATE`-Eintrag — das **unsignierte** Zurücklesen der eigenen Selbstauskunft. Das ist **nicht** der verifizierte Bescheid-Import (Variante B, `importPlanGeprueft`/Tor 3).

## Abgelehnte Alternativen

- **FHIR-IPS-Erweiterung um Pflegegrad:** würde den per U2-ADR-018/019 bewusst **entmedikalisierten** Pflegegrad re-medikalisieren (klinisches IPS-Bundle). Abgelehnt. `fhirIpsBundle` bleibt unangetastet; dass der Pflegegrad seit dem Sektor-Umzug nicht mehr im IPS-Bundle ist, ist die **gewollte** Folge, kein Bug.
- **Signierte Varianten (echtes Provider-Credential):** Tor-3-/Issuer-gated → das ist Variante B, hängt an produktivem Root + ausstellender Stelle. Nicht jetzt.
- **Generisches JSON:** kein Standard-Anker, keine EUDI-Anschlussfähigkeit, keine Selective Disclosure. Abgelehnt.

## Konsequenzen

- Bereich 7 hat einen Export-Knopf (Bürger-Label, nie „SD-JWT") + die EUDIW-Übergabe; der Pflegegrad ist nicht mehr export-verwaist.
- **Kein Gating-Umbau:** die Felder liegen ohnehin voll-verschlüsselt im Haupt-Depot (U2-ADR-016); Export ist opt-in über die Transparenz-Übersicht. Kein Sub-Passwort nötig (das isoliert nur verwaltende ↔ vertretene Person, U2-ADR-003).
- **Unsigniert/ehrlich:** der `_hinweis` benennt „noch nicht signiert" + „Pflegegrad ist eine sozialrechtliche Angabe (SGB XI), kein klinischer Befund".
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678…` unverändert (nur Export-/Import-Schicht + STRINGS). Suite 934/0/1.

## Nachtrag 21.06.2026 — zwei optionale Ablauf-Felder (Feldzahl 15 → 17)

Grundlage: `datenmodell-nachtrag-entscheid-sozialversicherung-2026-06-21.md` (alle vier Entscheide freigegeben). Additiv zur Variante-A-Arbeit, dieselbe uncommittete Sammlung. **Drei-Anker:**
- **Code-Stelle:** Sektor `sozialversicherung` — neue Felder `pflegegrad_befristet_bis` (`typ:'datum'`, nach `pflegegrad_seit`) und `gdb_nachpruefung` (`typ:'datum'`, nach `gdb_merkmale`); beide reine Datumsfelder (Bürger-Freitext, **kein Code**), optional, leer = gültig. `VC_SOZIALVERSICHERUNG_MAPPING` ergänzt um `pflegegrad_befristet_bis → care_level_valid_until` und `gdb_nachpruefung → disability_review_due`, beide `sd:true`, **kein `sensibel`**. Import-Spiegelbild zieht automatisch nach (`_sdJwtSozialversicherungFelder` über `_ausMappingZurueck` auf demselben Mapping). Zieltest `tests/sozialversicherung-export.test.js` Soz-6 ergänzt.
- **Sprint-Commit:** diese (noch uncommittete) Sammlung.
- **ADR-Bezug:** dieser ADR (U2-ADR-030), Nachtrag.

Begründung der Trennung: `gdb_nachpruefung` (Nachprüfung/Heilungsbewährung des **GdB** selbst) ist bewusst getrennt von `schwerbehindertenausweis_gueltig` (Gültigkeit des **Ausweises**) — zwei verschiedene Fristen. `pflegegrad_befristet_bis` bildet einen befristet zuerkannten Pflegegrad ab (leer = unbefristet). Beide `sd:true` (Selective Disclosure), nicht sensibel-gegated (anders als die SV-Nummer). Krypto-Block unberührt.

## Nachtrag 21.06.2026 (II) — Wahrheits-Marker, Selbstauskunft-Filter, Vollmacht-Provenienz (Achse 2)

Grundlage: Provenienz-Befund + Distinguishability-Befund (21.06., intern). Produktentscheidung: Schnitt A geschärft. **Drei-Anker:**
- **Code-Stelle:** `_planAusRoh` (`signiert:!!def.signiert` in den Plan), `importAnwenden` (`extra.verifiziert=true` nur bei `plan.signiert`), `_letzterStempel`/`_feldVerifiziertStaemmig` (neue Lese-Helfer), `baueAusMapping` (Wahrheits-Filter + `_zurueck`-Sammler), `sdJwtVcSozialversicherung` (Vollmacht-Block `_eingabe` + UI-Meta `__zurueckgehalten`), `formatSerialisieren`/`_formatExportDownload` (`__`-Strip + Hinweis-Toast), STRINGS `exportZurueckgehaltenVerifiziert`.
- **Sprint-Commit:** diese (noch uncommittete) Sammlung.
- **ADR-Bezug:** dieser ADR (U2-ADR-030), Nachtrag II.

**Struktureller Verifiziert-Marker (statt Label-Heuristik):** „signiert-verifiziert-stämmig" war im Modell bisher nur am Freitext-Label `quelle` erkennbar — nicht tragfähig. Daher trägt der **geprüfte** Import-Pfad (`importPlanGeprueft`, einziges `signiert:true`-Format `provider-credential`) jetzt einen **strukturellen** `verifiziert:true`-Stempel. Unsignierte Importe (Selbst-Round-Trip, Weg 1) tragen ihn **nicht** — `eingabeArt:'import'` allein ist kein Verifiziert-Beleg.

**Filter-Leitregel — „selbstauskunft = sichere Default-Wahrheit":** `baueAusMapping` schließt jedes Feld aus, dessen jüngster Stempel `verifiziert:true` trägt (gilt für **alle** `iss:'selbstauskunft'`-Exporte, nicht nur Sozialversicherung — zukunftsfest gegen künftige signierte Formate, ohne Sperrliste). Weg-1-Daten bleiben drin (wahr selbst). Zurückgehaltene Felder werden der Nutzerin als Toast gezeigt (nicht still weggelassen); die Werte bleiben im Depot. Der EUDIW-Pfad trägt ohnehin nur `claims` → derselbe Ausschluss greift dort automatisch.

**Achse 2 — Vollmacht-Provenienz (wahrheitstreu, kein neues Datenmodell):** aus den vorhandenen Per-Field-Stempeln (`eigenschaft`, `eingabeDurchName`, `vollmachtsGrundlage`). Form: ein `_eingabe`-Block **nur im Vollmacht-Fall** (datensparsam), der die unter Vollmacht eingetragenen *enthaltenen* Claims einzeln benennt (`{feld, durch, grundlage}`); selbst eingetragene bleiben unmarkiert (Default-Wahrheit). Gemischt → nur die Vollmacht-Felder erscheinen, weder über- noch unterdeklariert. `iss` bleibt `selbstauskunft` (selbst zusammengestelltes Credential des Subjekts); die Eigenschaft der Eintragung trägt der `_eingabe`-Block. **Nicht** vorgezogen: volle Achse-1-Per-Field-Quell-Semantik (Variante B / Tor 3) — hier nur der Ausschluss.

**Entscheidung 21.06.: `vollmachtsGrundlage` wird NICHT ins Credential getragen.** Code-Prüfung ergab: der Provenance-Stempel führt als `vollmachtsGrundlage` ausschließlich die **Sub-Depot-UUID** (`setzeSitzungsAkteur` ← `depotUUID`), keinen menschenlesbaren Vollmacht-Typ. Ein roher interner Krypto-/Schlüssel-Bezeichner gehört nicht an einen fremden Empfänger (Datensparsamkeit). Der `_eingabe`-Block trägt daher nur `{feld, durch}` (Name-Snapshot der vertretenden Person) — „unter Vollmacht durch [Name]" ist wahr und vollständig genug; ein Typ wird **nicht erfunden**. Gegenprüfung am Code: kein weiterer Builder serialisiert einen internen Bezeichner in ein Credential-Feld; ein Zieltest verankert, dass die UUID in der serialisierten Datei nirgends erscheint.

## Cross-Referenz
U2-ADR-016 (Schlüsseltrennung v3 / Voll-Verschlüsselung), U2-ADR-018 (Pflegegrad → Sozialversicherung), U2-ADR-019 (Pflegedienst/Pflegegeld → Sozialversicherung), U2-ADR-005 (Provenienz). Befund-Doku: `befund-sozialversicherung-sektor-7-2026-06-21.md` (intern).
