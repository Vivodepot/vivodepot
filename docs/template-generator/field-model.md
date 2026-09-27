# Vivodepot Feld-Modell — gemeinsames selbst-beschreibendes Feld-Format (U2-ADR-037, Stufe 0)

**Status:** Format freigegeben (24.06.2026) · Stufe-0-Vertrag · Bezug U2-ADR-037 (akzeptiert)
**Schema:** [`field-model-schema.json`](field-model-schema.json)

Dies ist der **Vertrag, auf dem die Konsumenten-Stufen 1–4 sitzen**. Eine Feld-Definition reist als **Daten** (nicht als Code) durch die vier Komponenten und liegt im Depot — so bleibt ein eingewandertes Feld auch dann anzeigbar, wenn das Template widerrufen ist (Daten-Verbleib auf Render-Ebene).

```
Generator  ──submission──▶  VC-Issuer  ──Definition durchreichen──▶  Buerger-App + Lese-App
(Komp. 4)                   (Komp. 3)                                 (Komp. 1 + 2)
                                                                      rendern aus dem Depot
```

## Die vier Kellerwände (aus U2-ADR-037)

1. **Versions-Marke pro Feld** — `schemaVersion` = die Depot-Schema-Version, **gegen die die Definition gebaut wurde** (Bau-Zeitpunkt), nicht „aktuell“. Nicht nachrüstbar.
2. **Stabile IDs statt Labels** — `sektorId` (technisch, z. B. `wohnen`) + `feldId` (technisch, stabil). Niemals das Bereich-Label oder den freien `feldname`. Jede `feldId` **muss** den reservierten Präfix `tpl_` tragen (Namensraum-Schutz, s. u.).
3. **Offenes Typ-System** — bekannte flache Typen werden gerendert; **unbekannte Typen werden sauber übersprungen, nicht abgelehnt**. Das ist die Andockstelle, an der `ref`/`liste`/`mehrfachauswahl` später eintreten.
4. **Platzierung als Daten** — `sektorId` + `abschnitt` + `ebene` (s. u.), Intra-Position implizit ans Abschnitts-Ende.

## Platzierungs-Modell (24.06.)

Template-Felder rendern als **eigener, inhaltlich benannter, sichtbarer Abschnitt** im Ziel-Bereich:

- **Auffindbar, nicht versteckt** — `ebene: kern` (Default), **nicht** im eingeklappten „mehr“-Block.
- **Inhaltlich benannt** — `abschnitt` ist die Überschrift nach Thema (z. B. „Energie & Erzeugung“), nie nach Anbieter. **Keine** Herkunfts-Kennzeichnung am Feld.
- **Gleiches Look-and-Feel** — die Eingabezeilen sehen exakt aus wie Kern-Felder; Abgrenzung liegt allein in Gruppierung + Überschrift.
- **Mitgebrachte Gruppe = Abschnittsname** — ein `abschnitt`, den es im Ziel-Katalog nicht gibt (Normalfall), wird zur **neuen thematischen Zone**: nicht verworfen, nicht in eine fremde Sektion gezwungen.
- **Intra-Position** — ans Abschnitts-Ende anhängen. Präzedenz im Code: `menschenRegisterHTML`, `schutzbefohleneRollupHTML`, der Cross-Sektor-Block — alle hängen nach den Katalog-Feldern an, im normalen App-Look.

## Speicherform im Depot (Verzweigung C1, freigegeben)

- **Definitionen:** neue additive Liste `data.feldDefinitionen[]` — jedes Element ist ein Feld-Modell-Objekt (s. Schema), gekeyt auf `sektorId` + `feldId`.
- **Werte:** weiterhin `data.sektoren[sektorId][feldId]` — dadurch tragen **Krypto** (Voll-Objekt-Verschlüsselung, Block-Pin unberührt), **Provenienz** (`urheberschaft[sektorId][feldId]`) und der **U2-ADR-036-Selbstauskunft-Guard** feldId-agnostisch **unverändert**.
- **Schema-Sprung 22 → 23** — additiv, rückwärts-tolerant: eine App ohne Kenntnis eines Feldes **speichert den Wert (verlustfrei), überspringt ihn aber beim Rendern**. Das ist das bestehende additiv-tolerante Verhalten.

## Namensraum-Schutz (U2-ADR-037 Stufe 2, 24.06.)

Template-Felder und Kern-Katalog-Felder teilen sich denselben Wert-Slot `data.sektoren[sektorId][feldId]`. Damit eine Template-`feldId` niemals ein Kern-Feld beanspruchen, überschreiben oder beschatten kann, ist der Namensraum **strukturell** getrennt:

- **Reservierter Präfix `tpl_`** — jede Template-`feldId` **muss** mit `tpl_` beginnen (Schema-`pattern: ^tpl_[a-z0-9_]+$`). Kein Kern-Feld trägt diesen Präfix → eine Kern-Kollision ist strukturell unmöglich, nicht bloß geprüft. Der Übersetzer leitet die `feldId` aus dem `feldname` ab und setzt den Präfix zwingend (`tpl_` + Slug).
- **Empfänger-Guard, zwei Schichten** (im Import-Apply-Pfad): **Schicht 1** verwirft jede Template-`feldId` ohne `tpl_`-Präfix; **Schicht 2** verwirft zusätzlich (Gürtel-und-Hosenträger) jede, die doch ein Kern-Katalog-Feld trifft (`_feldDef(sektorId, feldId)`). Ein verworfenes Feld wird **namentlich in der Import-Vorschau** gemeldet und fasst **keinen** Wert-Slot an — der Import läuft im Übrigen durch.
- **Template-gegen-Template** — kollidiert eine `feldId` mit einer **bereits** im Depot liegenden Template-Definition, gewinnt konservativ die **erste**; die neue wird (namentlich) übersprungen, kein stilles Überschreiben.

## Vokabular-Übersetzer (Submission → Feld-Modell)

Der Übersetzer schließt die Lücken aus der Differenztabelle (24.06.). Er läuft an der Grenze, wo die Generator-Submission ins Feld-Modell überführt wird (Implementierung in den Konsumenten-Stufen; hier die **verbindlichen Regeln**).

| Achse | Generator-Submission | → Feld-Modell | Regel |
|---|---|---|---|
| feldId | abgeleitet aus `feldname` | `feldId` = `tpl_` + Slug(`feldname`) | **Präfix-Zwang** (Namensraum-Schutz, s. o.) |
| Typ | `text` | `typ:"text"` | direkt; mehrzeilig nur per Flag (s. u.) |
| | `zahl` / `datum` / `auswahl` | gleich | direkt |
| | `jaNein` | `typ:"auswahl"` + `optionen:[{ja},{nein}]` | Konvention |
| | `mehrfachauswahl` | — | reserviert, **übersprungen** |
| text mehrzeilig | (Flag im Format) | `typ:"text"` + `mehrzeilig:true` | App rendert textarea (Präzisierung 2) |
| Bereich | `bereich`-Label | `sektorId` | feste Tabelle (s. u.) |
| Platzierung | `gruppe` (freie Überschrift) | `abschnitt` | 1:1 als Abschnittsname |
| Code-System | `codeSystem`-Name | `codeSystemId` | **exakte** Registry-ID, kein Oberbegriff (Präzisierung 4) |
| Codes | inline `codeWerte:[{code,anzeige,synonym?}]` | `codeWerte:[{code,anzeigeName,synonyme?}]` | `anzeige`→`anzeigeName`, `synonym`→`synonyme[]`; als CODE_LISTEN angemeldet |

**Bereich-Label → `sektorId`:** Identität→`identitaet`, Menschen→`meine-menschen`, Mobilität→`mobilitaet`, Finanzen→`finanzen`, Gesundheit→`gesundheit`, Bildung→`bildung`, Sozialversicherung→`sozialversicherung`, Vorsorge→`vorsorge`, Verwaltung→`verwaltung`, Persönliches→`persoenliches`, Wohnen→`wohnen`.

**Code-System-Namen → Registry-ID:** ICD-10-GM→`icd10`, ATC→`atc`, LOINC→`loinc`, XÖV→`xoev-rollencode`, ESCO→`esco`. **SNOMED:** der Generator liefert die **präzise** ID (`snomedAllergen`) — der Oberbegriff „SNOMED“ wird **nicht** automatisch aufgelöst (Verzweigung C2, per Konvention geschlossen). Die früheren App-Stubs `snomedImpfstoff`/`snomedImplantat` sind **ausgetragen** (U2-ADR-051): Impf-/Implantat-Codes bringt ein Template als **eigene Code-Liste** mit (s. u.).

**Mitgebrachte Code-Listen (U2-ADR-051, Reise-als-Daten):** ein Template kann unter `codeListen:[{systemId, uri?, version?, kuerzel?, lizenz?, eintraege:[{code, anzeige, synonym?}]}]` eigene Listen mitliefern — dasselbe Reise-als-Daten-Prinzip wie die Feld-Definitionen. Die App legt sie in `data.codeListen[]` ab und registriert sie beim Laden (`_codeListenAusDepotAnmelden`). **Namensraum-Disziplin:** jede mitgebrachte Liste erhält die `tpl_`-systemId (Slug); eine App-Liste ist strukturell unbeschattbar; Template-gegen-Template gewinnt die erste (namentlich gemeldet), das eigene Template darf seine Liste ersetzen. Ein Feld referenziert die Liste über ihren `codeSystem`-Namen — die **eigene** Liste hat Vorrang vor der App-Registry. **Lizenzverantwortung** für mitgelieferte Codes liegt beim Template-Anbieter (die Liste reist im JWS-signierten Template).

## Erste Implementierungs-Stufe = flache Teilmenge

Implementiert/gerendert: `text` (+`mehrzeilig`), `zahl`, `datum`, `auswahl`, `jaNein`, codierte Felder.
Reserviert, vom Empfänger **sauber übersprungen** (nicht abgelehnt): `ref`, `liste`, `mehrfachauswahl`.

## Format-Invarianten (von den Konsumenten-Stufen zu testen)

- **Offenes Typ-System:** ein unbekannter `typ` wird übersprungen, nie abgelehnt.
- **Daten-Verbleib:** nach simuliertem Template-Widerruf bleibt das Feld rendierbar (Definition liegt im Depot).
- **Krypto/Provenienz feldId-agnostisch:** dynamische Felder fahren mit der Voll-Objekt-Verschlüsselung mit; Block-Pin unberührt; der U2-ADR-036-Guard hält auch für sie.

## Roadmap (gestuft, je eigener Commit, je read-only-Vorklärung)

- **Stufe 0** (hier) — Format + Übersetzer-Regeln + Speicherform. Freigegeben.
- **Stufe 1** — VC-Issuer: Definitionen ins `credentialSubject` durchreichen statt verwerfen (`submissionZuAnbieterDaten`/`baueProviderVC`).
- **Stufe 2** — Bürger-App: Definitionen empfangen (`felderAusClaims`) + rendern (`renderSektor`, Template-Abschnitt ans Sektions-Ende).
- **Stufe 3** — Lese-App: daten-getriebene Spiegelung aus dem Depot.
- **Stufe 4** — Energie als erster Pilot durch die fertige Pipeline.
