# U2-ADR-164: Modul-Beschriftungen je Sprache — `beschriftungen` additiv neben `label`

**Status:** Akzeptiert
**Datum:** 23.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Laufzettel „Der Schnitt"/„Nacht 22./23.08.2026", Glied 6 (1.4b) — löst die
Produktentscheidung (22.08.2026, Ergebnisblatt „Fünfundzwanzig v1-Einstufungen", Bündel 3):
„Ein Modul bringt seine Beschriftungen je Sprache mit — Textsätze stapeln NICHT."
- **Code-Stelle:** `vivodepot.html` — `_istSprachvariantenObjekt`, `_sprachvarianteRepraesentativ`,
  `_templateLabelAktiv` (neu), `_templateFeldZuModell`, `validateTemplate`,
  `_templateDefAlsFeld`, `_angedockteBeschriftungenFuerExport`.
- **ADR-Bezug:** U2-ADR-141 (Textsatz-Module — dort wurde das Stapeln mehrerer Sätze für
  dieselbe Kennung erwogen und hier ausdrücklich verworfen), U2-ADR-162/163 (dieselbe
  Kampagne — „es gewinnt die Form, die den wenigsten Bestand umzieht").
- **Status heute:** gilt — gebaut und belegt in `tests/schnitt-glied6-modul-beschriftungen.test.js`
  (13 Proben).

---

## Kontext

**Der gemessene Befund (A492):** `feldDefinitionen[].label` (die Beschriftung eines von einem
Modul mitgebrachten Feldes) ist ein einfacher String ohne Sprachangabe — `field-model-schema.json`
und `submission-schema.json` kennen das Wort „sprache" an dieser Stelle nicht. Eine Kammer, die
ein Feld für ungarische UND deutsche Bürgerinnen anbieten will, hatte dafür keinen Weg.

**Die Produktentscheidung, wörtlich:** „die sätze müssen separat sein (und stapelbar?)" —
beantwortet mit: **nicht stapelbar.** Stattdessen lebt die fachliche Achse („Fach" — z. B.
„ungarische Hebammen-Begriffe") IM MODUL SELBST, nicht in einem zweiten, gestapelten
Textsatz-Modul. Begründung: „Stapelbare Sätze bräuchten eine Rangfolge für den
Fall, dass zwei Sätze dieselbe Beschriftung setzen. Eine Rangfolge ist eine Regel, die nie jemand
nachliest."

## Entscheidung

**`label` bleibt IMMER ein String — kein Umbau auf „String oder Objekt" quer durchs Feld.** Über
zwanzig Stellen im Kern lesen `def.label` direkt (Export-Titel, VC-Claims, DOCX-Titel,
EUDIW-Offenlegung, Kollisions-Meldungen, `blattVorschlaege` …). Sie alle auf Sprachvarianten
vorzubereiten wäre genau der Umbau, der für den Textsatz ausdrücklich abgelehnt wurde
(„stapeln nicht") — dieselbe Zurückhaltung gilt für eine zweite Form an derselben Stelle im
Feld-Modell.

**Sprachvarianten liegen an einer eigenen, additiven Eigenschaft: `def.beschriftungen`**, Form
`{ <BCP-47-Sprachcode>: <Text>, ... }` (mindestens ein Eintrag, freie Sprachcodes wie bei
`sprachkennung` — keine geschlossene Liste, nur die Form wird geprüft). `label` wird bei einem
Sprachvarianten-`feldname` zur REPRÄSENTATIVEN (ersten) Variante — ein stabiler String, den jede
bestehende Lesestelle unverändert bekommt.

**Anzeige-Reihenfolge, dieselbe wie überall im Kern:** ein angedockter TEXTSATZ der Bürgerin
selbst hat weiterhin Vorrang (`_templateFeldText`/A478, unverändert); fehlt der, gilt die zur
aktiven Sprache passende Variante aus `def.beschriftungen` (`_templateLabelAktiv`, neu); fehlt
auch die, gilt der stabile `label`-String. Nie wird in eine dritte Sprache geraten.

**Der Torwächter (`validateTemplate`) und der Übersetzer (`_templateFeldZuModell`) akzeptieren
`feldname` jetzt als String ODER Sprachvarianten-Objekt.** Beide Schema-Dateien
(`field-model-schema.json`, `submission-schema.json`) sowie die wörtlich eingebetteten Kopien in
`vivodepot-template-generator.html` und `vivodepot-vc-issuer.html` sind synchron nachgezogen.

**Der Voll-Export (`_angedockteBeschriftungenFuerExport`, A496) berücksichtigt `beschriftungen`
zusätzlich** — fehlt ein externer Textsatz-Treffer, berichtet der Export die Modul-eigene
Variante statt unbedingt den rohen Standardwert, damit „was gezeigt wurde" auch dort stimmt.

## Warum keine Migrationsstufe nötig war

Kein bestehender Bestandswert ändert seine Form: ein Depot mit ausschließlich String-`label`n
verhält sich unverändert (kein `beschriftungen`-Schlüssel entsteht von selbst). Nur ein NEU
eingereichtes Modul kann optional die Objektform wählen. Damit war Glied 6 — wie zuvor bereits
das strukturell nächstverwandte Glied „Angedockter Bereich schaltet mit" (1.1b, A495) — additiv
statt umformend, obwohl A492s ursprüngliche Messung beide als „umformend" einstufte. Der
gemeinsame Schema-Bump (73→74) kam trotzdem am Ende dieses Glieds — er markiert den Abschluss der
ganzen Schnitt-Kampagne, nicht eine Reformierung durch dieses einzelne Glied.

## Was NICHT in dieser ADR steht

**Keine Eingabe-Oberfläche im Template-Generator**, mit der eine Kammer mehrere Sprachvarianten
komfortabel eintippt. Wie beim analogen 1.1b (`bereichsModule[].label`) wurde auch hier nur die
KERN-seitige Fähigkeit gebaut — ein Anbieter, der sie heute nutzen will, schreibt das JSON von
Hand oder per eigenem Werkzeug. Eine Eingabe-Oberfläche ist eine eigene, spätere Frage.

**Kein Sprachvarianten-Feld für `hint`/`hilfetext`.** A492s Messung nannte ausdrücklich nur
`label`; `hint` bleibt unverändert ein einfacher String, um die Fläche nicht ungefragt zu
vergrößern.

**Keine Änderung an `unterFelder[].feldname`** (Listen-Unterfelder) — nicht Gegenstand der
gemessenen Lücke, bleibt ein einfacher String in beiden Schema-Dateien.

---

*Vivodepot GmbH · 23.08.2026*
