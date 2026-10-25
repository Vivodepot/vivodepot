# U2-ADR-496: Anbindung an Vivodepot: offene Definition, Prüfbericht statt Zeichen, veröffentlichte Prüfregeln
**Status:** Angenommen (08.10.2026)
**Datum:** 08.10.2026 (Festlegung); Punkt 3 (Trennung von Selbsttest, bestätigter Prüfung und Studio-Vorprüfung) und der Logo-Ersatz in Punkt 6 sind am 10.10.2026 konkretisiert
**Kategorie:** KONFORMITÄT, HERKUNFT
**Linie:** U2
**Bezug:** U2-ADR-483 (Vorprüfung im Studio, Einlass-Regeln) · U2-ADR-400 (White Label: Reichweite und Herkunftsort), von dieser ADR in einem Punkt geändert
**Status heute:** gilt als Festlegung. Die Prüfregeln sind veröffentlicht, gelandet am 11.10.2026 mit 4832c16db und 99ea2e47c (Klausel zu den Prüfregeln erfüllt). Die Anzeigeregeln sind noch nicht veröffentlicht (Klausel offen).

## Frage

Hersteller und Einrichtungen wollen wissen und zeigen, dass ihr System mit Vivodepot zusammenarbeitet. Ein Zeichen „kompatibel“ wäre ein Versprechen, das Vivodepot selbst geben müsste, und eine geschlossene Definition könnte zum Hebel gegen offene Nachnutzung werden.

## Entscheidung

1. **Die Konformitätsdefinition ist offen:** für jeden lesbar und nutzbar.
2. **Vorerst ein Prüfbericht statt eines Zeichens.** Der Bericht nennt Fassung, Datum, Gültigkeit und eine Widerrufsliste. Ein Zeichen kann später über eine neutrale Trägerin folgen.
3. **Drei Dinge bleiben getrennt:** der Selbsttest, den ein Hersteller selbst gegen sein eigenes System fährt; die bestätigte Prüfung, deren Ergebnis Vivodepot als Prüfbericht ausstellt; und die Vorprüfung einer Vorlage im Studio (U2-ADR-483).
4. **Die Regeln für Prüfung und Anzeige von Vorlagen werden veröffentlicht:** gleiche Prüfung, gleiche Anzeige, Sortierung nach Anlass, offene Ablehnungsgründe.
5. **Nach außen** heißt das Programm bis zur Prüfung des Wortlauts „Anbindung an Vivodepot“, nicht „Vivodepot-kompatibel“.
6. **Herkunftshinweise.** Ein Partner kann das Vivodepot-Logo durch sein eigenes ersetzen; der Hinweis auf die Anbindung bleibt. In der App steht „powered by Vivodepot“, sichtbar auch bei öffentlichen Stellen. Auf allem, was die App verlässt, steht „Erstellt mit Vivodepot“. Wortlaut und Ort stehen unter Vorbehalt: „Erstellt mit Vivodepot“ darf keine Autorschaft am Rechtstext vortäuschen, und ein Eintrag im Klartext-Teil des Umschlags berührt die Klartext-Bindung und braucht eine eigene Prüfung.
7. **Diese Entscheidung ändert U2-ADR-400,** nach der der Markenname nur am Herkunftsort erscheint. Der Nachtrag steht in U2-ADR-400.

## Gründe

- Offene Definition: verhindert, dass die Anbindung zum Hebel wird.
- Prüfbericht statt Zeichen: belegt, was geprüft wurde, ohne mehr zu versprechen.
- Veröffentlichte Regeln: die Prüfung ist nachvollziehbar. Dass Vivodepot zugleich Prüferin und Anbieter eigener Vorlagen ist, ist als Prüffrage offen und hier nicht entschieden.

## Folgen

- Die Prüfregeln brauchen eine öffentliche Fundstelle (Seite oder Datei im Repository); bis dahin sagen Außentexte nicht, sie seien veröffentlicht.
- Die Fundstelle der Prüfregeln seit 11.10.2026: `docs/pruefregeln/pruefregeln.md` (lesbar) und `docs/pruefregeln/pruefregeln.json` (maschinenlesbar, Schema `docs/pruefregeln/pruefregeln-schema.json`). Selbst prüfen: `node tools/vorlage-pruefen.js --dokument <datei.json>`. Für die Anzeigeregeln gilt der Satz davor weiter.

```yaml
konformitaet:
  - aussage: >-
      Die Prüfregeln für Vorlagen sind öffentlich auffindbar.
    zustand: erfuellt
    herkunft: U2-ADR-496 (Festlegung 08.10.2026); gebaut mit 4832c16db und 99ea2e47c (11.10.2026) als docs/pruefregeln/pruefregeln.json mit Schema und erzeugter lesbarer Fassung, angewandt von tools/vorlage-pruefen.js; gemessen am 18.10.2026: die Regeldatei im öffentlichen Repository trägt dieselbe SHA-256-Summe wie hier, verlinkt aus docs/INTEGRATION.md, docs/integrieren.md und DOCS.md.
    pruefung:
      - tests/pruefregeln-gegen-kern.test.js "[Prüfregeln] jeder Ablehnungsgrund der App hat eine Regel, und jede Regel hat ihren Grund in der App"
      - tests/pruefregeln-gegen-kern.test.js "[Prüfregeln·Rot-Beweis] fehlt eine Regel, fällt der Grund auf; eine erfundene Regel fällt als verwaist auf"
      - tests/pruefregeln-gegen-kern.test.js "[Prüfregeln] die lesbare Fassung ist genau die heute erzeugte"
      - tests/pruefregeln-gegen-kern.test.js "[Prüfregeln·Rot-Beweis] eine geänderte Regel macht die lesbare Fassung ungleich"
      - tests/pruefregeln-im-zuschnitt.test.js "[Prüfregeln·Zuschnitt] Regeldatei, Schema und lesbare Fassung stehen unter oeffentlich und gehen hinaus"
      - tests/pruefregeln-im-zuschnitt.test.js "[Prüfregeln·Zuschnitt] jede Datei, die tools/vorlage-pruefen.js lädt, geht hinaus"
      - tests/pruefregeln-im-zuschnitt.test.js "[Prüfregeln·Zuschnitt·Rot-Beweis] eine Datei der Kette unter ZURUECK_INTERN hält sie und das Werkzeug zurück"
      - tests/pruefregeln-im-zuschnitt.test.js "[Prüfregeln·Zuschnitt·Rot-Beweis] fehlt die Regeldatei auf der Positivliste, geht sie nicht hinaus"
      - tests/pruefregeln-auffindbar.test.js "[Prüfregeln·Auffindbar] INTEGRATION.md, integrieren.md und DOCS.md verlinken Regeldatei und lesbare Fassung, und die Links lösen auf"
      - tests/pruefregeln-auffindbar.test.js "[Prüfregeln·Auffindbar·Rot-Beweis] ein fehlender oder ins Leere zeigender Link fällt auf"
  - aussage: >-
      Die Anzeigeregeln für Vorlagen sind öffentlich auffindbar.
    zustand: offen
    frist: 2026-11-30
    bedingung: Gemessen ist, welche Stelle der Bürger-App Reihenfolge und Darstellung von Vorlagen verschiedener Herausgeber bestimmt, und entschieden ist die neutrale Reihenfolge der Herausgeber; danach liegen die Anzeigeregeln als Datei neben den Prüfregeln, mit einer Probe gegen den Anzeigeweg der Bürger-App
    eigentuemer: Design
    herkunft: U2-ADR-496 (Festlegung 08.10.2026); gemessen am 10.10.2026: im Repository und im Studio keine öffentliche Seite mit Anzeigeregeln; Register und Website nicht geprüft. Stand 18.10.2026: docs/pruefregeln/ regelt Annahme und Ablehnung, keine Anzeige; das Schema der Prüfregeln kennt kein Anzeige-Feld.
```

---

*Vivodepot GmbH · Berlin · 08.10.2026*
