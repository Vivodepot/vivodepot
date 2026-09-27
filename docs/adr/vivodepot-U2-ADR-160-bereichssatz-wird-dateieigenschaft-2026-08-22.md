# U2-ADR-160: Der Bereichssatz wird Dateieigenschaft — Weglassen, nicht Umbelegen

**Status:** Akzeptiert
**Datum:** 22.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Produktentscheidung vom 21.08.2026
(internes Entscheidungsdokument vom 21.08.2026), Laufzettel
„Der Schnitt", Glied 2 (A286), Etappe 2g — letzte Etappe des Glieds, nachdem 2b–2f jeden
Konsumenten auf Indirektion gestellt haben.
- **Code-Stelle:** `vivodepot.html` — `leeresDepot` (`bereichssatz: null`), `depotAnlegen`
  (`opts.bereichssatz`), `bereicheAlle` (der Filter), `BEREICH_IDS_EINGEBAUT` (die reservierte
  Zwölfer-Namensmenge, unverändert), `_vcardIdentitaetFelder`/`_fhirIpsFelder`/`_elsterFelder`/
  `_camt053Listen` (Weglassen-Guards für die vier direkt schreibenden Rückrichtungs-Parser),
  `_ausMappingZurueck` (U2-ADR-159/Etappe 2f, deckt die sechs Mapping-Tabellen-Parser bereits ab).
- **ADR-Bezug:** U2-ADR-143 (eine Quelle, `SEKTOREN`), U2-ADR-154 (Andock-Register für
  zusätzliche Bereiche, A389 — die Übermenge-Richtung), U2-ADR-159 (Weglassen bei toten
  Ziel-Feldern, die Vorstufe dieser ADR für einzelne Felder statt ganzer Sektoren).
- **Status heute:** gilt — gebaut und belegt in
  `tests/etappe2g-bereichssatz-dateieigenschaft.test.js` (8 Proben).

---

## Kontext

**Die Achse war einseitig.** U2-ADR-154 hatte den Andock-Mechanismus für zusätzliche Bereiche
gebaut (`bereichsModule[]`) — ein Modul kann Bereiche ERGÄNZEN. Es gab keinen symmetrischen Weg,
einen der zwölf eingebauten Bereiche für ein bestimmtes Depot WEGZULASSEN. `SEKTOREN` war eine
globale, unveränderliche Konstante des Kerns — jedes Depot trug notwendig alle zwölf.

**Der Sachgrund:** *„Der Bereichssatz ist damit eine Eigenschaft der Datei, keine
Konstante des Kerns. Ein Depot wird mit einem Bereichssatz angelegt."* Beispiel aus dem
Entscheidungsdokument: ein Kanzlei-Depot, das `gesundheit` gar nicht führt.

## Entscheidung

**Ein Depot trägt optional `data.bereichssatz` — ein Array der AKTIVEN eingebauten Bereichs-IDs.**
`null` (der Normalfall: jedes Bestandsdepot, jeder Aufruf von `depotAnlegen(password)` ohne
zweites Argument) heißt „alle zwölf", additiv & rückwärts-kompatibel wie jedes andere Feld in
`leeresDepot()`.

**`bereicheAlle()` bleibt der EINE Ort**, den Navigation, Voll-Export, Mappe-Bereichswahl,
Gesamt-PDF, Suche und Herausgeben lesen (A389) — er filtert jetzt zusätzlich nach unten. Ein
gesetzter Bereichssatz wirkt sofort auf `SEKTOR_BY_ID` (`_sektorIndexNeuBauen()`), damit
`feldDefFuer`/`_feldDef` ein weggelassenes Feld als nicht-existent behandeln — genau der
Mechanismus, den Etappe 2f (`_ausMappingZurueck`) und die vier hier ergänzten Parser bereits
voraussetzen.

**`identitaet` ist strukturell Pflicht**, unabhängig vom übergebenen Bereichssatz. Ankername,
Wiedereintritts-Akteur und die Notfallkarten-Kopfzeile lesen `data.sektoren.identitaet` direkt,
außerhalb jeder Bereichs-Indirektion — ein Depot ohne Identität wäre an diesen Stellen nicht
weniger befüllt, sondern strukturell kaputt. `depotAnlegen` ergänzt es still, wenn es fehlt.

**Unbekannte IDs werden weggelassen, nicht geraten** — ein Tippfehler in einer künftigen
Anlage-Oberfläche führt so zu „dieser eine Bereich fehlt einfach" statt zu einem Depot mit einer
nie erreichbaren Kennung.

## Die vier nachgezogenen Parser

Bei der eigenen Positivkontrolle fiel auf: `_vcardIdentitaetFelder`, `_fhirIpsFelder` (Patient-
Demografie UND die klinischen Chip-Ressourcen getrennt geprüft, weil ein Depot den einen Sektor
führen kann und den anderen nicht), `_elsterFelder` und `_camt053Listen` schreiben DIREKT mit
literalen `sektorId`-Werten, ohne über `_ausMappingZurueck` (und damit ohne dessen Etappe-2f-
Wächter) zu laufen. Ohne eigenen Guard hätte ein Import in ein Depot ohne `gesundheit` das
gesundheit-Feld trotzdem angelegt — genau das Umbelegen, das diese ADR ausschließt. Alle vier
tragen jetzt denselben `if (!SEKTOR_BY_ID.<sektor>) return;`-Guard. Belegt in
`tests/etappe2g-bereichssatz-dateieigenschaft.test.js` („Zusammenspiel mit 2f").

## Was NICHT in dieser ADR steht

**Keine Auswahl-Oberfläche.** Es gibt keinen Weg, mit dem eine Bürgerin oder eine Kanzlei heute
selbst einen Bereichssatz wählt — nur den Mechanismus (`depotAnlegen(password, {bereichssatz})`),
den ein künftiger Anlage-Weg aufruft. Welcher Anlage-Weg das ist (eigenes Onboarding? ein
Institutions-Modus?), ist eine Produktentscheidung, keine dieser ADR.

**Kein nachträgliches Ändern.** Der Bereichssatz wird beim Anlegen gesetzt, nicht später
umgestellt — „ein Depot WIRD MIT einem Bereichssatz angelegt", nicht „ein Depot bekommt seinen
Bereichssatz geändert". Ob und wie ein Bestandsdepot seinen Bereichssatz je erweitern oder
verengen können soll, ist offen und nicht Gegenstand dieser Etappe.

**Kein Schema-Bump.** Das Feld ist rein additiv (`null`-Default), keine Migration nötig. Der
gemeinsame Schema-Bump für die ganze Schnitt-Kampagne kommt laut Laufzettel erst am Ende von
Glied 6.

**Die sechs übrigen direkten `SEKTOREN`-Referenzen im Kern** (`SEKTOR_BY_ID`-Initialwert,
`BEREICH_IDS_EINGEBAUT`, die Sektor-Validierung bei Format-Modulen, `_ereignisAlleEntitaetPersonFelder`,
`alleStandardDokumente`, `depotNormalisieren`) bleiben unverändert — sie beschreiben den
reservierten Namensraum oder den Feldkatalog als solchen, nicht, was ein bestimmtes Depot gerade
führt, oder sind (bei `depotNormalisieren`) dauerhaft von dieser Kampagne ausgeschlossener
Prüfstoff (s. Etappe 2a).

---

*Vivodepot GmbH · 22.08.2026*
