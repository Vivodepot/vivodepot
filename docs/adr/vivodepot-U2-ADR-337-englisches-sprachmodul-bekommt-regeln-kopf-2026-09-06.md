# U2-ADR-337: Das englische Sprachmodul bekommt einen `regeln`-Kopf — Währung bleibt am Rechtsraum, nicht an der Sprache

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `tools/textsatz-en-modul-erzeugen.js` (`baueModul`), `tools/textsatz-en-modul.json`,
`tests/u2-adr-337-en-modul-regeln.test.js`

- **Status heute:** gilt — `baueModul()` liefert `regeln: {datumsformat, dezimaltrenner,
  tausendertrenner}`; `waehrung` und `rechtsraum` sind bewusst nicht gesetzt.

---

## Der Befund

Das ausgelieferte englische Sprachmodul (`tools/textsatz-en-modul-erzeugen.js`) trug bislang
**keinen `regeln`-Kopf**. Der Kern lässt das zu — ein Modul ohne ihn erbt `TEXTSATZ_REGELN_EINGEBAUT`
vollständig, und dieser Satz ist deutsch: `datumsformat: 'TT.MM.JJJJ'`, `dezimaltrenner: ','`,
`tausendertrenner: '.'`, `waehrung: 'EUR'`, `sprachkennung: 'de-DE'`.

**Zwei der fünf Regeln laufen bereits richtig, auch ohne diesen Kopf** — `sprachkennung` wird von
`textsatzRegeln()` unbedingt auf die aktive Sprache gesetzt, sobald ein passendes Modul gefunden
wird (Zeile vor dem `modul._regeln`-Merge), und `schreibrichtung` bleibt beim eingebauten `ltr`,
was für Englisch ohnehin richtig ist. **Die drei übrigen — Datumsformat, Dezimal- und
Tausendertrenner — blieben deutsch.**

## Britisch, nicht US-amerikanisch — belegt, nicht erfunden

Die drei Quelldateien des Moduls (`textsatz-en-daten.js`, `-optionswerte-daten.js`,
`-vollabdeckung-daten.js`) tragen bereits eine Festlegung, die niemand für dieses ADR neu treffen
musste: `licence` (nicht `license`), `colour`, `favourite`, `Naturalisation` — britisches
Englisch. `datumsformat: 'TT/MM/JJJJ'` (Tag vor Monat, wie im Deutschen) folgt derselben Wahl und
steht in `TEXTSATZ_REGELN_ERLAUBT`. `dezimaltrenner: '.'`, `tausendertrenner: ','` sind die
englische Konvention, unabhängig von britisch/amerikanisch.

## Die offene Frage der Vorgängersitzung: Währung hängt am Rechtsraum, nicht an der Sprache

Der Auftrag benannte diese Frage ausdrücklich als ungeklärt und delegierte die Entscheidung hierher.

**Der Kern hat die dafür nötige Achse bereits, und sie ist bewiesen:** die Textsatz-Modul-Registry
ist seit Schnitt Glied 4 (A469) nach `[sprache][rechtsraum]` verschlüsselt, nicht nur nach Sprache.
`tests/persona-p19-p20.test.js` zeigt es an einem echten Fall — dieselbe Sprache (`es`), zwei
Rechtsräume (Ecuador, Spanien), zwei verschiedene Währungen (USD, EUR), über zwei getrennte Module.
Ein Modul **ohne** erklärten Rechtsraum landet im rechtsraumlosen `''`-Fach — der Normalfall für
einen Anbieter, der genau einen Rechtsraum bedient (Kommentar an `textsatzRechtsraumAktiv`,
vivodepot.html:10854 f.).

**Entscheidung:** Vivodepots eigenes englisches Modul bekommt **weder `rechtsraum` noch
`regeln.waehrung`**. Es bleibt beim eingebauten `EUR`. Begründung:

1. Das Modul bedient englischsprachige **Bewohnerinnen Deutschlands** — dieselbe Rechtsordnung
   wie der deutsche Satz, nur eine andere Sprache. Ihre Verträge, Vollmachten und Beträge stehen
   weiterhin in Euro.
2. Ein `rechtsraum: 'DE'` am Modul wäre nicht nur unnötig, sondern **schädlich**: eine Bürgerin,
   die keinen `rechtsraum` in ihrem Depot gesetzt hat (der Normalfall, `textsatzRechtsraumAktiv()`
   liefert `''`), fände das Modul dann NICHT mehr — `nachSprache[rechtsraum] || nachSprache['']`
   griffe nur noch auf ein `''`-Fach zu, das dann leer wäre. Das würde die heute funktionierende
   Sprachumschaltung brechen, um eine Eigenschaft zu benennen, die für den Normalfall ohnehin gilt.
3. Ein zukünftiges Modul für einen ANDEREN Rechtsraum (z. B. eine US-amerikanische Fassung) bekäme
   eine eigene, zusätzliche Registrierung mit eigenem `rechtsraum` und eigener `regeln.waehrung` —
   über dieselbe Registry, nicht über eine Änderung an diesem Modul.

## Was dieser Zug NICHT behauptet

**Er ändert nicht, was eine englischsprachige Bürgerin heute auf dem Bildschirm sieht.** Gemessen,
nicht angenommen (`tests/a479-lese-app-textsatz-regeln.test.js`, weiterhin grün, hier als eigene
Vorbedingung mitgeführt): der Kern liest `datumsformat`/`dezimaltrenner`/`tausendertrenner`
**nirgends** — jede Datumsanzeige läuft über das hart auf `TT.MM.JJJJ` verdrahtete `_datumDeutsch`
(vivodepot.html:45122), unabhängig vom aktiven Sprachmodul. Dieser Kopf schließt die **strukturelle**
Lücke des Moduls und macht es bereit für den Tag, an dem der Kern diese drei Regeln tatsächlich
konsumiert — er ist selbst kein Bau dieses Konsumenten. Das ursprünglich benannte Symptom
(„die englischsprachige Bürgerin bekommt heute englische Texte mit deutschen Datums- und
Zahlformaten") bleibt darum **bestehen** und ist ein eigener, größerer, hier nicht angefasster
Auftrag: `_datumDeutsch` (und die entsprechende Zahlformatierung, falls vorhanden) müssten auf
`textsatzRegeln()` umgestellt werden — das wäre eine bewusste Aufhebung der A479-Grenze, nicht ihr
Nebenprodukt.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Das ausgelieferte englische Sprachmodul trägt einen regeln-Kopf mit datumsformat (TT/MM/JJJJ,
      britisch), dezimaltrenner (.) und tausendertrenner (,) — belegt am Wortschatz der drei
      Quelldateien, nicht erfunden.
    zustand: erfuellt
    herkunft: U2-ADR-337 (06.09.2026)
    pruefung:
      - tests/u2-adr-337-en-modul-regeln.test.js
        "[U2-ADR-337] das Modul traegt genau drei Regeln — keine Waehrung, keinen Rechtsraum"
      - tests/u2-adr-337-en-modul-regeln.test.js
        "[U2-ADR-337] belegt, nicht erfunden: britisches statt US-amerikanisches Englisch im Wortschatz"

  - aussage: >-
      Waehrung und Rechtsraum sind am englischen Modul bewusst nicht gesetzt: die Waehrung haengt
      am Rechtsraum, nicht an der Sprache, und dieses Modul bedient einen einzigen, unbenannten
      Rechtsraum (Deutschland) — es bleibt beim eingebauten EUR.
    zustand: erfuellt
    herkunft: U2-ADR-337 (06.09.2026), Achse bewiesen an Schnitt Glied 4 / A469
    pruefung:
      - tests/u2-adr-337-en-modul-regeln.test.js
        "[U2-ADR-337·Rot-Beweis] das aktive englische Modul liefert die drei Regeln über textsatzRegeln()"
      - tests/persona-p19-p20.test.js
        "[P19+P20] zwei Rechtsräume, EINE Sprache: der zuletzt angemeldete Satz gewinnt"

  - aussage: >-
      Der regeln-Kopf ändert tatsächlich etwas an textsatzRegeln() — ohne ihn bliebe der deutsche
      Satz stehen (Gegenprobe).
    zustand: erfuellt
    herkunft: U2-ADR-337 (06.09.2026)
    pruefung:
      - tests/u2-adr-337-en-modul-regeln.test.js
        "[U2-ADR-337·Gegenprobe] ohne den regeln-Kopf bliebe dezimaltrenner/tausendertrenner/datumsformat deutsch"

  - aussage: >-
      Der Kopf schließt nur die strukturelle Lücke des Moduls. Er ändert NICHT, was eine
      englischsprachige Bürgerin heute an Datums-/Zahlformaten sieht — der Kern konsumiert
      datumsformat/dezimaltrenner/tausendertrenner an keiner Stelle (A479, unverändert).
    zustand: teilweise-erfuellt
    herkunft: U2-ADR-337 (06.09.2026), Grenze aus A479 unverändert übernommen
    pruefung:
      - tests/u2-adr-337-en-modul-regeln.test.js
        "[U2-ADR-337·Vorbedingung] A479 gilt weiterhin: der Kern liest die drei Regeln nirgends — diese Probe behauptet also keinen sichtbaren Effekt"
      - tests/a479-lese-app-textsatz-regeln.test.js
        "[A479·Vorbedingung] Gegenprobe: der Kern selbst liest datumsformat/dezimaltrenner/tausendertrenner NIRGENDS"
```

## Was dieser Zug NICHT tut

- **Er verdrahtet `_datumDeutsch` nicht auf `textsatzRegeln().datumsformat`.** Das wäre eine
  bewusste Aufhebung der A479-Grenze und ein eigener, größerer Auftrag — hier nicht beauftragt und
  nicht angefasst.
- **Er baut kein rechtsraum-eigenes englisches Modul** (z. B. für die USA). Die Registry trägt das
  bereits (Schnitt Glied 4); ein solches Modul bräuchte nur seine eigene `rechtsraum`+
  `regeln.waehrung`-Kombination, unabhängig von diesem.
- **Er übersetzt nichts an den 121 Wortlauten mit Rechtsfolge** (U2-ADR-333, `VOLLMACHT_BMJ`/
  `PV_BMJ`) — separater Teil desselben Auftrags.
