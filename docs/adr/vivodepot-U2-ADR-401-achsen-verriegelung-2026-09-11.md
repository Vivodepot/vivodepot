# U2-ADR-401: Achsen-Verriegelung — exklusive Achsen schlagen an, statt still zu überschreiben (Nummer beim Landen zu bestätigen)

**Status:** Angenommen
**Datum:** 11.09.2026
**Kategorie:** ARCHITEKTUR, SICHERHEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-382 (Rechtsraum-Registry, Besitz-Zug), U2-ADR-387 (Ab-Werk-Rangfolge, nennt
„keine Ausschließlichkeit" für logikModul als Gegenbeispiel), U2-ADR-296/U2-ADR-400 (Branding-
Rückfall/-Reichweite).
**Anker:** Entscheidung vom 11.09.2026, wörtlich: „Welche Achsen der Zusammensetzung können
zwei Werte gleichzeitig tragen, und welche schließen sich aus?" — beantwortet durch eine Erhebung
gegen die Datenstruktur (Bericht `achsen-exklusiv-oder-additiv-2026-09-11.md`), dann gegen einen
Vorbau-Auftrag „report before build" (`achsen-schutz-luecken-vor-dem-bau-2026-09-11.md`).
**Status heute:** gilt — drei Fixes gebaut, Rot-Beweise grün.

---

## Kontext

Die Erhebung fand: Sprache, Branding und Bereichs-Ersatz sind exklusive Achsen (Datenstruktur:
ein Einzelwert-Slot). Bereichsquellen/Vorlagenquellen/Logik-Modul-Quellen sind additiv (Array,
im Kern-Kommentar selbst „keine Ausschließlichkeit" genannt). Rechtsraum ist ein Mischfall: ein
zusätzlicher Code neben Deutschland, nicht statt.

Bei den exklusiven Achsen bewachte nur die DATENSTRUKTUR wenig — die eigentliche Exklusivität lag
allein in der AUFRUFREIHENFOLGE:

- **Branding:** `data.brandingModule` ist ein Array; zwei verschiedene Herkünfte wurden von
  `_einbettenMitFassung` bewusst NICHT zu einer verschmolzen (nur gleiche Herkunft+Anbieter
  dedupliziert). `_letztesBrandingOderAbWerk` nahm still `liste[liste.length - 1]`.
- **Sprache:** `data.textsatzModule` ebenso ein Array; `_textsatzModuleAusDepotAnmelden` überschrieb
  zwei depot-eigene Module DESSELBEN Fachs (`[sprache,rechtsraum]`) — „letztes gewinnt", per
  Kommentar bereits als Absicht benannt, aber ohne dass ein Widerspruch je sichtbar wurde.
- **Rechtsraum:** `_rechtsraumModuleAusDepotAnmelden` ersetzte `registry[rechtsraum]` VOLLSTÄNDIG
  bei jedem verarbeiteten Modul — zwei Anbieter desselben Codes löschten sich gegenseitig
  Instrumente aus, AUCH OHNE inhaltlichen Widerspruch, allein weil sie denselben Code teilten.
  Schwerer als die ursprüngliche Frage: kein Widerspruch nötig, der geteilte Code genügte.

Bereichs-Ersatz hat keinen Docking-Weg (kein `typ` im `EINLASS_REGISTER`) — keine Lücke, nichts
gebaut.

## Entscheidung

> Eine exklusive Achse schlägt an, wenn ein zweiter Wert sie beanspruchen würde — der Ab-Werk-
> Rückfall zählt dabei nie als zweiter Wert, er gilt nur, solange kein echter Wert existiert.
> WAS anschlägt, richtet sich nach der Achse: Branding verweigert den zweiten Einlass ganz
> (die Achse ist als Ganzes einwertig). Sprache und Rechtsraum bleiben mehrwertig auf Registry-
> Ebene (mehrere Fächer/Codes nebeneinander ist der Normalfall) — dort wird der Widerspruch
> je Fach/Gegenstand FESTGEHALTEN, nicht die Registry gesperrt.

### 1. Branding — Einlass verweigert

`modulEinlassen` lehnt eine zweite, andere Herkunft am Einlass selbst ab (`raus.grund =
'zweite-herkunft'`), nimmt die eben eingefügte zurück. Ein Update derselben Herkunft bleibt
erlaubt (Länge unverändert, kein neuer Fall).

### 2. Rechtsraum — je Gegenstand mischen, nicht das Fach ersetzen

`_rechtsraumModuleAusDepotAnmelden` mischt jetzt `typ`-weise in `registry[rechtsraum]`, statt das
ganze Fach zu ersetzen. Ein echter Widerspruch (zwei Anbieter, derselbe Gegenstand) wird in
`_letzteRechtsraumKonflikte` festgehalten — das zuerst verarbeitete Modul behält den Gegenstand.

### 3. Sprache — Widerspruch festgehalten, Sieger unverändert

`_textsatzModuleAusDepotAnmelden` erkennt jetzt, wenn zwei depot-eigene Module DESSELBEN Fachs
von verschiedenen Anbietern stammen, und hält das in `_letzteTextsatzKonflikte` fest. WER am Ende
im Fach steht, bleibt bewusst unverändert („letztes gewinnt", wie zuvor) — ein Wechsel auf
„zuerst gewinnt" wäre eine eigene Entscheidung, keine Messung.

### 4. Nicht gebaut

Bereichs-Ersatz: kein Docking-Weg, kein Gegenstand für einen Wächter. Vorlagen (additive Achse,
nachgeschobene Frage nach Zuschnitt-Zugehörigkeit): Vorlagen tragen keine Zuschnitt-Kennung, ein
inhaltsbasierter Wächter ist unmöglich; die bestehende Build-Zuordnungsprüfung
(`tests/vier-produkte-zusammensetzung.test.js`, U2-ADR-383) ist geprüft unabhängig genug (das
Wiring steht zweimal von Hand, nicht aus `vier-produkte.js` abgeleitet) — nichts gebaut.

## Konformität

- `tests/rechtsraum-modul-vertrag.test.js` — drei neue Proben (Verlust-Rot-Beweis, Konflikt-Fund,
  Gegenprobe gleicher Anbieter).
- `tests/a523-branding-register.test.js` — drei neue Proben (Ablehnung zweite Herkunft, Update
  derselben Herkunft erlaubt, Ab-Werk-Rückfall bestätigt kein zweiter Wert).
- `tests/textsatz-mechanismus.test.js` — drei neue Proben (Konflikt-Fund, verschiedene Fächer
  kein Widerspruch, Ab-Werk-Saat kein Widerspruch).
- Alle neun grün, volle Suite grün, keine Regression in den bestehenden Docking-/Branding-/
  Rechtsraum-/Textsatz-Tests.
