# U2-ADR-241: Export-Übersicht — Topf-B-Lücken bei geteilten Mapping-Tabellen und bei eigenständigen Bedienwegen

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** KONFORMITÄT, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-024 (Export-Auswahl als Opt-in) · `EXPORT_TOPF_B_FELDER`-Recherche vom
12.08.2026 (XÖV/EDCI/SD-JWT-VC-Finanzen, Beleg `tools/w10-export-mapping-luecken-pruefen.js`) ·
U2-ADR-107 (Export-Gate Identität) · U2-ADR-079 (delegierter IPS-Export)
**Anker:** Verlustwege-Auftrag, Zug 0–2, 03.09.2026
**Status heute:** gilt — Beleg `tests/export-topf-b-fim-json-nachtrag.test.js`.

---

## Kontext

Die „Das wird herausgegeben"-Übersicht (`exportUebersichtModell`) markiert Felder, die ein
gewähltes Format strukturell nicht abbilden kann, als `formatOhneZiel` — die Bürgerin sieht dann
wörtlich: „Dieses Format kann diese Angabe nicht abbilden", und das Feld ist nicht ankreuzbar.
Die Menge dieser Felder je Format steht in `EXPORT_TOPF_B_FELDER`.

Der 12.08.-Bericht hat diese Menge für drei Formate (`xoev-verwaltung`, `edci-bildung`,
`sd-jwt-vc-finanzen`) recherchiert und eingetragen, jedes Feld einzeln gegen einen externen
Standard (FIM-Kernkatalog, ELM.ttl) belegt. Der Verlustwege-Auftrag (Zug 1) hat gemessen, dass
zwei weitere Formate dieselbe Klasse Lücke tragen, ohne dass die Übersicht davon weiß — Zahlen
frisch gemessen am Kanon-Stand `9a9926d1` (`tools/w10-export-mapping-luecken-pruefen.js`, für
`fhir-ips` von Hand gegen `fhirIpsBundle`):

| Format | gedeckt/gesamt | in `EXPORT_TOPF_B_FELDER`? | Ursache |
|---|---|---|---|
| `fim-json` | 5/24 | fehlte | teilt `XOEV_VERWALTUNG_MAPPING` mit `xoev-verwaltung` — reiner Nachtrag |
| `sd-jwt-vc-identitaet` | 10/24 | fehlt weiterhin | 12 von 14 Lücken unrecherchiert |
| `fhir-ips` (gesundheit) | 5/28 | fehlt weiterhin | eigener Bedienweg, nie an die Übersicht angeschlossen |

Für alle drei gilt: die Übersicht zeigte (bzw. zeigt für die letzten zwei weiterhin) die
betroffenen Felder als angekreuzt/enthalten, obwohl der jeweilige Builder sie nicht schreibt.
Das ist keine Ungenauigkeit, sondern in dem Moment falsch, in dem eine Bürgerin entscheidet, was
sie herausgibt — sie glaubt, etwas geteilt zu haben, das nie ankam, und merkt es nie.

## Entscheidung

**Angenommen: `fim-json` bekommt seinen Topf-B-Eintrag, als geteilte Referenz.**
`fimVerwaltung()` liest dieselbe `XOEV_VERWALTUNG_MAPPING` wie `xoevVerwaltung()`
(`baueAusMapping('verwaltung', XOEV_VERWALTUNG_MAPPING, …)`) — beide Format-Schlüssel in
`EXPORT_TOPF_B_FELDER` tragen jetzt **dieselbe `Set`-Referenz**, nicht zwei unabhängige Kopien.
Ändert sich die Lücke einmal (neues Feld, neue Recherche), können die beiden Formate nicht mehr
auseinanderdriften — eine Änderung an der einen Stelle gilt für beide.

**Der Export selbst bleibt unverändert.** `fimVerwaltung()` schrieb die 19 betroffenen Felder
vorher nicht und schreibt sie jetzt nicht — geprüft, nicht angenommen (`tests/export-topf-b-fim-
json-nachtrag.test.js`). Die Reparatur betrifft ausschließlich, was die Übersicht der Bürgerin
VOR dem Export zeigt.

**Nicht angenommen: `sd-jwt-vc-identitaet` bekommt hier keinen Topf-B-Eintrag.** Von den 14
ungedeckten Feldern (`nachname2`, `geburtsjahr`, `geschlecht`, `familienstand`, `gueterstand`,
`trennungsdatum`, `heirat_namenswahl`, `heirat_namenswahl_frueher`, `aufenthaltstitel_art`,
`profilfoto`, `notizen_start`, `steuerklasse`, `steuerklasse_frueher`, `umzug_ummeldung`) tragen
nur zwei (`nachname2`, `geburtsjahr`) eine Begründung im Mapping-Kommentar. Für die übrigen zwölf
ist unrecherchiert, ob das EUDI-ARF-PID-Rulebook tatsächlich keinen Claim dafür kennt oder ob
nur niemand die Mapping-Zeile geschrieben hat.

**`formatOhneZiel` behauptet „Dieses Format kann diese Angabe nicht abbilden" — eine strukturelle
Aussage, kein Hinweis auf einen fehlenden Bau-Schritt.** Alle 14 Felder blind als Topf B
einzutragen hätte denselben Fehler in die andere Richtung gebaut: **eine unrecherchierte
„kann nicht"-Behauptung ist keine bessere Aussage als eine fehlende Markierung** — beide
verspielen dasselbe Vertrauen, nur in verschiedene Richtungen. Die Fachfrage (Topf A: Slot
vorhanden, nur nicht verdrahtet / Topf B: Standard kennt das Feld nicht) bleibt offen, als
eigener Auftrag, analog zum 12.08.-Bericht.

**Nicht angenommen: `fhir-ips` bekommt hier keinen Topf-B-Eintrag — strukturell, nicht nur
inhaltlich zurückgestellt.** `flowGesundheitFhirExport` ruft `flowExportUebersicht` ohne
`formatId` — der Topf-B-Mechanismus kann diesen Weg architektonisch nicht erreichen, unabhängig
davon, ob `EXPORT_TOPF_B_FELDER['fhir-ips']` existiert. `flowSektorExport` schließt `fhir-ips`
ausdrücklich vom generischen, Topf-B-fähigen Weg aus (`format !== 'fhir-ips'`). **Diese Ausnahme
selbst trägt keinen Kommentar.** Zwei bestehende ADRs begründen, warum FHIR-IPS einen eigenen
Bedienweg braucht — U2-ADR-107 (Pflichtfeld-Gate Name/Geburtsdatum) und U2-ADR-079 (Delegations-
Einwilligung bei Sub-Depot-Export) — aber keins begründet, warum dieser Weg nie an die
Herausgeben-Übersicht angeschlossen wurde. **Das ist nicht falsch entschieden, sondern nie
entschieden.**

## Konsequenzen

Für `fim-json` sind beide Formate jetzt konsistent geführt; ein Wächter (Abschnitt Konformität)
hält das fest.

Für `sd-jwt-vc-identitaet` und `fhir-ips` bleibt die Übersicht bis auf Weiteres irreführend für
zusammen 37 Felder (14 + 23). Das ist ein bewusst offen gelassener Zustand, kein übersehener —
dieses ADR benennt ihn, damit er nicht als erledigt gilt, nur weil `fim-json` es ist. Ein
Folgeauftrag müsste in dieser Reihenfolge laufen: zuerst die externe Standard-Recherche (HL7-IPS
für `fhir-ips`, EUDI-ARF-PID-Rulebook für `sd-jwt-vc-identitaet`), danach die zwei mechanischen
Nachträge (`EXPORT_TOPF_B_FELDER` füllen, bei `fhir-ips` zusätzlich `formatId` am Bedienweg
ergänzen). Die Reihenfolge ist nicht austauschbar: Mechanik ohne Fachfrage bringt entweder nichts
(fehlende Daten bei `fhir-ips`) oder behauptet zu viel (erfundene Klassifikation bei der
Identität).

## Konformität

```konformitaet
aussage:  fim-json und xoev-verwaltung tragen dieselbe Topf-B-Feldmenge über eine
          gemeinsame Set-Referenz — sie können nicht mehr auseinanderdriften.
zustand:  geprüft
herkunft: invariante
pruefung: tests/export-topf-b-fim-json-nachtrag.test.js#[Verlustwege·Zug2] fim-json und xoev-verwaltung tragen dieselbe Topf-B-Menge (eine Mapping-Tabelle, eine Lücke)
```

```konformitaet
aussage:  Die Herausgeben-Übersicht markiert ein Topf-B-Feld für fim-json jetzt als
          nicht abbildbar — vorher stand es unmarkiert und wirkte enthalten.
zustand:  geprüft
herkunft: invariante
pruefung: tests/export-topf-b-fim-json-nachtrag.test.js#[Verlustwege·Zug2·Rot-Beweis] fim-json: „Das wird herausgegeben" zeigt ein Topf-B-Feld jetzt als nicht abbildbar
```

```konformitaet
aussage:  Die Reparatur ändert den fim-json-Export selbst nicht — ein Topf-B-Feld war
          vor UND nach der Änderung nicht im Builder-Ergebnis.
zustand:  geprüft
herkunft: invariante
pruefung: tests/export-topf-b-fim-json-nachtrag.test.js#[Verlustwege·Zug2] der Export selbst ist unverändert — krypto war vorher schon nicht dabei, ist es weiterhin nicht
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
