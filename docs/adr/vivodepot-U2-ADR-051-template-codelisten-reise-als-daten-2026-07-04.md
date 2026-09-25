# U2-ADR-051 — Code-Listen reisen im Template-Vertrag (Reise-als-Daten) + App-Stubs ausgetragen, Schema 26

**Datum:** 04.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 04.07.2026 (Suite/Gates grün; Annahme = Produktentscheidung).
**Status heute:** gilt — `data.codeListen[]` (Klasse 2, Reise-als-Daten) ist im heutigen Kern aktiv (`vivodepot.html`, u. a. `_codeListenAusDepotAnmelden` zur Boot-Registrierung).
**Nummer:** U2-ADR-051 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-050).
**Typ:** Format-Vertrag (Template) + Datenmodell (neuer Register-Topf) + Bereinigung (Stub-Austragung).
**Bezug:** **Datenmodell-Gesamtkonzept v1.2, §4 (Richtungs-Entscheidung „Code-Listen gehören in den Template-Vertrag", Produktentscheidung, 04.07.)** · U2-ADR-037 (feldDefinitionen reisen als Daten — dasselbe Prinzip) · U2-ADR-050 (E2: Feld-Marker gezogen; Stub-Schicksal an diesen Auftrag verwiesen) · Stufe-0-Regel C2 (Oberbegriff „SNOMED" wird nicht aufgelöst).

---

## Kontext

Template-Felder referenzierten bisher ausschließlich **App-registrierte** Code-Listen — die eine Stelle, an der ein Template Vorgebautes brauchte. Das widersprach der Agnostik (nicht-antizipierte Code-Systeme erzwängen App-Änderungen) und hielt zwei leere SNOMED-Stubs (`snomedImpfstoff`/`snomedImplantat`) im Quelltext und in der SBOM, die kein Generator und keine UI je füllte.

## Entscheidung

**1 — Templates bringen ihre Code-Listen als Daten mit.** Der Submission-Vertrag erhält `template.codeListen: [{systemId, uri?, version?, kuerzel?, lizenz?, eintraege:[{code, anzeige, synonym?}]}]` (optional, additiv; L3-Formprüfung in `validateTemplate`, unter dem bestehenden Größen-Cap). Übersetzung Generator- → Registry-Vokabular (`anzeige`→`anzeigeName`, `synonym`→`synonyme[]`) in `_templateCodeListenUebersetzen`. Das Schema ist an allen drei Vertragsorten identisch nachgezogen: `docs/template-generator/submission-schema.json` + eingebettet in Template-Generator und VC-Issuer (T-CROSS-08 pinnt die Byte-Gleichheit).

**2 — Namensraum-Disziplin (tpl_-Präfix-Muster wie feldIds).** Jede mitgebrachte Liste erhält die `tpl_<slug>`-systemId (`_tplCodeListeId`) — eine fest eingebaute App-Liste ist strukturell unbeschattbar. Kollisions-Regeln gespiegelt von den Feld-Definitionen: innerhalb eines Templates erste gewinnt (`id-kollision`), Template-gegen-Template erste gewinnt (`doppelt`, namentlich; Provenienz via `quelle`), dasselbe Template darf seine eigene Liste ersetzen (Update, idempotent), un-namespaced Listen scheitern am Präfix-Gate (`praefix`). Ein Feld referenziert die Liste über ihren `codeSystem`-Namen; die **eigene** Liste hat Vorrang vor der App-Registry (deklarierte Absicht).

**3 — Ablage + Boot-Registrierung.** Neuer Register-Topf `data.codeListen[]` (Klasse 2, Reise-als-Daten wie `feldDefinitionen`); `importAnwenden` legt ab und registriert sofort (datalist ohne Neu-Laden); beim Laden hebt `_codeListenAusDepotAnmelden` die Listen in die Laufzeit-Registry (nur `tpl_`-Ids, defensiv — darf das Laden nie brechen). **Schema 25 → 26** (additiv/idempotent, 23er-Muster).

**4 — App-Stubs ersatzlos ausgetragen.** `snomedImpfstoff`/`snomedImplantat` sind aus der generierten Code-Listen-Region, den `code-listen/*.json`-Quellen, `tools/build-code-listen.js` und der SBOM entfernt — die Lizenzverantwortung für mitgelieferte Codes wandert zum Template-Anbieter (Liste reist im JWS-signierten Template). **`snomedAllergen` bleibt** (SEED, Affiliate-Lizenz); **`esco`/`xoev-rollencode` bleiben** (von Export-Generatoren als `_codeStand` gelesen, nicht Feld-gebunden). Der E1/E2-Spiegel im Lese-Katalog (`vivodepot-lesen.html`: zwei tote Marker + zwei BMI-Hints) ist mitgezogen.

**5 — C2 strukturell gesichert (`teilliste`-Marker).** Die Unauflösbarkeit des Oberbegriffs „SNOMED" hing bisher an der *Mehrdeutigkeit* der drei SNOMED-Listen — mit einer verbleibenden hätte das Kürzel plötzlich aufgelöst. Neu: Listen, die ein **Ausschnitt** eines größeren Systems sind, tragen in ihrer Quelle `teilliste: true` (datengetragen, kein klinischer Name im Kern) und sind vom Kürzel/URI-Matching in `_codeSystemId` ausgenommen. `ICD-10-GM`→`icd10` u. a. bleiben unverändert auflösbar.

## Begründung

- **ADR-037 konsequent zu Ende:** Definitionen UND ihre Code-Systeme reisen als Daten — die Basis hält keine leeren Andockpunkte (kein Rudiment, Konzept v1.2 §4).
- **Kein Übergangs-Provisorium:** Stubs behalten „bis irgendwann" wäre das Provisorium gewesen; der Vertrag ist gebaut, die Stubs sind weg.
- **Widerrufs-Semantik trägt von selbst:** codierte Werte sind selbsttragend (`anzeigeName`+`code`+`system` inline) — die Anzeige dereferenziert die Liste nie; entfällt eine Liste, degradiert genau auf die §4-Regel „Anzeige bleibt, Neu-Anlage gesperrt".

## Konsequenzen

- Positiv: Templates sind code-system-agnostisch erweiterbar ohne App-Release; zwei SBOM-Einträge weniger; SNOMED-Restbestand in der App = nur noch `snomedAllergen` (lizenzgedeckt).
- Offen/Kosten: Erzeuger-Seite (Template-Generator-UI) bietet noch keine Eingabemaske für `codeListen` — der Vertrag + Empfangs-Pfad stehen; die Generator-UI folgt mit dem nächsten Generator-Auftrag.

## Verifikation

- **Neu** `tests/template-codelisten.test.js` (7 Tests): validateTemplate-Formprüfung; Übersetzer (Namensraum, Vokabular, interne Kollision); Feld-Auflösung inkl. Beschattungs-Versuch (`snomedAllergen` mitgebracht → `tpl_snomedallergen`, App-Liste unangetastet); `importAnwenden` (Ablage+Registry+Synonym-Andock, doppelt/praefix-Gates, eigenes Update); Boot-Registrierung (nur tpl_, defekte übersprungen); Vertrags-Eingang `felderAusClaims`; Stub-weg-Pins + Schema-26-Migration.
- Nachgezogen: `tests/feldmodell-uebersetzen`-C2-Pin grün via `teilliste` (statt Mehrdeutigkeits-Zufall); andock-code-Invariante (keine klinischen System-Namen im Kern — auch nicht in Kommentaren); T-CROSS-08 (Schema an drei Orten byte-gleich); Schema-Pins 25→26 in 8 Dateien; `codelisten:check` driftfrei.
- Node-Suite **1128/1128 (0 fail, 0 skipped)**, Konformitäts-Gates **11/11** (WCAG 33 Sichten/0 Violations). **Block-Pin `8d31c678…` unberührt** (Harness 24/0). `vivodepot.html.sha256` nachgezogen. Kein Push.
