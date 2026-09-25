# U2-ADR-255 · Ausgabeformat/Rechtsraum-Kopplung — additiv, zwei Formate, ein Gate

**Datum:** 04.09.2026
**Status:** Angenommen und umgesetzt.
**Status heute:** gilt — `rechtsraum`-Feld an vier Stellen (FORMAT_MODUL_SCHLUESSEL,
formatModulPruefen, EXPORT_FORMATE, flowHerausgeben), `tests/u2-adr-255-ausgabeformat-rechtsraum-kopplung.test.js`
grün.
**Entscheidung:** Zuschnitt bestätigt.
**Bezug:** U2-ADR-254 (derselbe Vorschlagswert, `_rechtsraumVorschlagswert()`, wiederverwendet
statt eine zweite Regel zu erfinden) · eine vorangegangene Messung mit Empfehlung zur
Ausgabeformat/Rechtsraum-Frage (04.09.2026, gegen frischen Kanon gegengeprüft, nicht neu gemessen)

---

## Kontext und Problem

Elf eingebaute Ausgabeformate. `xoev-verwaltung` (XÖV, deutsche Verwaltungsdaten-Norm) und
`fim-json` (FIM, derselbe deutsche Rahmen) sind inhaltlich eindeutig deutschlandspezifisch —
trotzdem filtert `flowHerausgeben` bisher ausschließlich nach `sektorId`. Ein Depot mit
angedocktem chinesischem Rechtsraum-Modul bietet XÖV unverändert an. Dieselbe Wurzel wie
U2-ADR-254: „ankommen ist nicht wirken".

Die vorangegangene Messung hat bereits geklärt: vier Stellen betroffen, additiv
einführbar, bricht keinen der 25 zitierenden Testdateien. Eigene Einschätzung dort: ein
rechtsraumfremdes Format ist „näher an gefährlich als an nutzlos" — der „fertig"-Toast erzeugt
Vertrauen, das beim Einreichen bei der falschen Behörde bricht.

## Entscheidung

**Additive Fassung, wie empfohlen — kein bestehendes Format ändert sein Verhalten, zwei bekommen
eine zusätzliche Einschränkung, die vorher fehlte:**

1. `FORMAT_MODUL_SCHLUESSEL`: `'rechtsraum'` ergänzt — sonst würde ein Format-Modul mit diesem
   Feld als `unbekannt` verworfen.
2. `formatModulPruefen`: optionale Prüfzeile (Muster wie `akzeptiert`/`quelle`), Wert wird in
   `kanal.rechtsraum` durchgereicht.
3. `EXPORT_FORMATE`: nur `xoev-verwaltung` und `fim-json` bekommen `rechtsraum: 'DE'`. Die
   übrigen neun bleiben ohne das Feld — unverändertes Verhalten, keine Regression.
4. `flowHerausgeben`: **die einzige Stelle, an der es wirkt.** Derselbe Vorschlagswert wie beim
   Instrument-Stempel (U2-ADR-254, `_rechtsraumVorschlagswert()`) — 'DE' ohne oder mit mehreren
   angedockten Rechtsräumen (kein Ratespiel, dieselbe Zurückhaltung wie dort), sonst der eine
   angedockte Rechtsraum. Ein `rechtsraum`-getaggtes Format erscheint nur, wenn es zum
   Vorschlagswert passt; rechtsraumneutrale Formate (kein Feld) bleiben immer sichtbar. Gilt
   sowohl für die eingebaute Liste (`s.exporte`) als auch für angedockte Format-Module
   (`alleExportFormate()`-Schleife) — symmetrisch, für den Fall, dass ein künftiges Format-Modul
   selbst einen Rechtsraum deklariert.

**Wiederverwendung statt zweiter Regel:** `_rechtsraumVorschlagswert()` stammt aus U2-ADR-254 und
wird hier unverändert übernommen — dieselbe Auflage „miss, was ohne gesetzten Rechtsraum
passiert" gilt automatisch mit, weil es dieselbe Funktion ist.

### Was ausdrücklich NICHT gebaut wird

- Keine Gate-Logik für `sd-jwt-vc-finanzen`/`sd-jwt-vc-sozialversicherung` (laut Messung
  „Hülle EU/international, Inhalt teils deutschlandspezifisch" — unsicherer Befund, eigene
  Abwägung nötig, nicht Teil dieses Auftrags).
- Kein Import-seitiges Gegenstück (`IMPORT_FORMATE`) — Import ist Einlesen, kein „fertig, an
  Behörde X"-Vertrauensmoment; die Messung/der Auftrag sprachen von „Ausgabeformaten".

## Verifikation

`tests/u2-adr-255-ausgabeformat-rechtsraum-kopplung.test.js`. Gruppe A: Datenstruktur
(`rechtsraum:'DE'` an genau den zwei Formaten, die übrigen neun unverändert,
`FORMAT_MODUL_SCHLUESSEL`, `formatModulPruefen`-Validierung). Gruppe B — der Rot-Beweis über den
ECHTEN Chooser-Weg (`flowHerausgeben` → `document#modal-inhalt`, Muster aus
`tests/export-formate.test.js` Test 6 / `tests/knopf-einlese-dichte.test.js` A2, nicht nur das
Objekt-Literal geprüft): ohne angedocktes Modul zeigt der Verwaltung-Chooser weiterhin beide
Formate; mit einem angedockten CN-Modul verschwinden beide; mit zwei angedockten Rechtsräumen
(Mehrfach-Fall) bleiben beide sichtbar wie im Grundzustand; ein rechtsraumneutrales Format bleibt
unter jedem angedockten Rechtsraum erreichbar.

## Konsequenzen

**Positiv.** Schließt exakt die zuvor gemessene Lücke, ohne die dort offen gelassenen,
unsicheren Fälle (Finanzen/Sozialversicherung) mitzuentscheiden.

**Negativ / bewusst klein gehalten.** Nur zwei von elf Formaten betroffen — die additive Fassung
lässt bewusst Spielraum für spätere, gezieltere Kopplungen, statt eine große Regel auf einmal zu
bauen.
