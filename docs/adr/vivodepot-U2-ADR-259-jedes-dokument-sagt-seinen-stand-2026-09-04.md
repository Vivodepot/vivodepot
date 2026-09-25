# U2-ADR-259: Jedes erzeugte Dokument sagt, aus welchem Stand es stammt

**Datum:** 04.09.2026
**Status:** Angenommen und umgesetzt (Teil 1 — moduleVersion; katalogStand bewusst nicht Teil dieses Baus, s. u.).
**Status heute:** gilt — `moduleStandBerechnen`/`moduleStandAnzahl`/`moduleStandSatz`/`moduleStandFussText`
im Kern und als Spiegel in der Lese-App (`moduleStandBerechnen`/`moduleStandAnzahl`/`moduleStandSatz`/
`standBlockHTML`), Datensatz-Schlüssel `moduleStand`, Segment im PDF-Fuß, sichtbarer Block in allen
vier Lese-App-Sichten (Depot-Ansicht, Situationsblatt, Notfall-Sicht, Antwort-Blatt), Satz in der
Kern-Anzeige (Einstellungen); `tests/u2-adr-259-stand-sichtbar.test.js` grün, 21 Proben.
**Entscheidung:** Auftrag vom 04.09.2026.
**Bezug:** U2-ADR-258 (Herkunft eines Moduls — dieselbe Leitung, erste Angabe) · U2-ADR-121
(Rechtsraum-Katalog, `katalogStand`) · U2-ADR-224 (WebKit-7-Tage-Hinweis, derselbe Grundgedanke
„die Datei läuft für immer, ohne dass jemand es merkt")

---

## Kontext und Problem

Ein Depot läuft für immer — Datei plus Passwort genügen, es gibt keinen Server, der etwas
abschaltet. **Das ist das Versprechen, kein Mangel.**

Die Folge: **ein Depot altert still.** Ein angedocktes Modul, ein Jahr nach dem Einlass noch
einmal zur Dokumenterzeugung herangezogen, trägt dieselben Paragraphen und Fristen wie am Tag
des Einlasses — ohne dass die Bürgerin oder das Amt es bemerken. Dieselbe Fehlerklasse wie der
PDF-Zeichenfehler (Papierlänge, 21./22.08.2026): falsche Ausgabe ohne Warnung, im Dokument, das
der Gegenstelle vorgelegt wird. Die stehende Fehlerart dieses Produkts.

Die Antwort ist keine Sperre — ein Depot, das nicht mehr liest, wäre schlimmer als eines mit
altem Stand —, sondern eine Angabe: **jedes erzeugte Dokument trägt den Stand, aus dem es
stammt.** Dann sieht die Bürgerin, dass ihr Stand alt ist, und ein Empfangspunkt kann bei Bedarf
einen aktuellen verlangen.

### Was schon da war, und wo es endete

Zwei Felder trugen die nötige Information bereits, erreichten aber kein Dokument:

|                  | `vivodepot.html` | `vivodepot-lesen.html` |
|---|---|---|
| `katalogStand`   | 9 | **0** |
| `moduleVersion`  | 45 (fast ausschließlich Fixtures/Vergleichsstellen) | 3 |

Gemessen gegen `origin/u2-kanon` (8292b457): `pdfFussText` (~Zeile 44963) und
`_datensatzAusEintraegen` (~Zeile 45363) lasen keins von beiden. Genau dieselbe Lücke wie bei
U2-ADR-258 einen Tag zuvor — der Mechanismus war da, die Leitung fehlte.

### Zwei verschiedene Dinge namens „Stand" — bewusst getrennt, nicht zu einem gezwungen

`moduleVersion` sitzt auf angedockten Modulen (`EINLASS_REGISTER`-Ebene, dieselbe Registerliste
wie die Herkunft aus U2-ADR-258). `katalogStand` sitzt auf einzelnen `vorsorge_instrumente`-
Einträgen (Feld-Ebene, U2-ADR-121) — welche Rechtsraum-Katalog-Version beim Erstellzeitpunkt
galt. Beide in eine einzige Zahl zu zwingen wäre die **Zahl ohne Deckung**, die dieser Auftrag
ausdrücklich ausschließt (Auflage 4): ein Depot mit zwei Modulen unterschiedlicher Version und
einem Vorsorge-Eintrag mit eigenem Katalogstand hat schlicht **drei** Stände, nicht einen.

**Diese ADR baut nur die Modul-Seite (`moduleVersion`).** Das ist eine benannte Lücke, keine
vergessene: `katalogStand` braucht eine eigene Leitung auf Feld-Ebene, nicht auf Register-Ebene,
und gehört in einen eigenen, getrennten Bau (Auflage 6 — „bauen was geht, die Lücke benennen").

## Entscheidung

**Dieselbe Leitung wie U2-ADR-258, zweite Angabe statt eines zweiten Mechanismus.** Kein
zweites Register, keine zweite Render-Stelle: `moduleStandBerechnen` läuft über dieselbe
`EINLASS_REGISTER`-Liste (Kern) bzw. `MODUL_SLOTS`-Liste (Lese-App) wie `modulHerkunftBerechnen`,
und die neue Angabe reist an genau denselben vier Stellen mit, an denen die Herkunft bereits
reist.

### Vier Stationen, dieselbe Reihenfolge wie U2-ADR-258

1. **Datensatz** (`_datensatzAusEintraegen`) — der Schlüssel `moduleStand` steht direkt neben
   `modulHerkunft`, ohne `optionen`-Vorbehalt.
2. **PDF** (`pdfFussText`) — ein zweites Fuß-Segment, direkt neben dem Herkunft-Segment, aus
   demselben Grund NICHT aus `meta` gelesen (sonst könnte ein Meta-Bauer es weglassen).
3. **Lese-App** — ein zweiter sichtbarer Block (`stand-marke`) direkt nach dem Herkunft-Block,
   in allen VIER Sichten: Depot-Ansicht, Situationsblatt, Notfall-Sicht (alle drei aus dem
   geöffneten Depot) und — eigene Verdrahtung, weil dort ein anderer Lesepfad gilt — dem
   Antwort-Blatt (`antwortAnzeigeModell`/`renderAntwort`, aus dem DATENSATZ, denn dort hat der
   Empfänger kein Depot).
4. **Anzeige im Kern** — ein zweiter Satz in den Einstellungen, direkt neben dem Herkunfts-Satz.

### Der Stand eines einzelnen Moduls — roh, nicht gedeutet

Anders als Herkunft (drei kategoriale Zustände: geprüft/ungeprüft/unbekannt) ist eine
Versionsnummer keine Kategorie, sondern ein Wert. `moduleStandBerechnen` gibt darum je Modul die
**rohe** `moduleVersion` zurück (`Number.isInteger(m.moduleVersion) ? m.moduleVersion : null`) —
keine Bewertung, kein Vergleich, keine Alt/Neu-Einstufung. Aggregiert wird nur, was sich ehrlich
aggregieren lässt: die Zahl der Module mit bekanntem vs. unbekanntem Stand — genau wie bei
Herkunft, wo ebenfalls nur gezählt, nie eine „Gesamt-Vertrauenswürdigkeit" errechnet wird.

### Ehrlich bei Unwissen

Ein Bestandsmodul (vor diesem ADR eingelassen) trägt kein `moduleVersion`-Feld. Das zählt als
**`unbekannt`** — nicht als `0` (das wäre eine erfundene Zahl ohne Deckung) und nicht als
weggelassen. Derselbe vierte Fall wie bei Herkunft: ein Dokument ohne jede Stand-Angabe (auch aus
einer geforkten Fassung, die sie wegläßt) bekommt in der Lese-App einen eigenen Wortlaut
(`standSatzOhneAngabe`), statt stumm „keine Erweiterung" zu behaupten.

### Ton — keine Angstmache

Wie bei U2-ADR-258: sachlich, keine Bewertung. Ein alter Stand ist alt, nicht falsch — der Satz
sagt nur, **ob** der Stand bekannt ist, nie **ob** er aktuell ist (dafür fehlt jede Referenz, was
„aktuell" für ein bestimmtes Modul überhaupt bedeutet — das wäre wieder eine Zahl ohne Deckung).
Keine eigene Farbklasse in der Lese-App: anders als Herkunft (geprüft/offen, zwei echte
Zustände mit unterschiedlicher Bedeutung) trägt Stand keine binäre Unterscheidung — eine
Farbvariante würde eine Wertung erfinden, die der Satz nicht macht.

### Nicht abschaltbar

Keine der vier Stationen nimmt einen Schalter oder Parameter, der die Angabe unterdrückt. Ein
Rot-Teil der Probe fährt Datensatz- und PDF-Weg mit Optionen und Meta-Objekten, die genau das
versuchen (`{ moduleStand: null }`, `{ moduleStand: false }`, ein Meta-Objekt mit gefälschtem
`moduleStand`).

## Die Rot→Grün-Probe

`tests/u2-adr-259-stand-sichtbar.test.js` — 21 Proben in sieben Abschnitten (Berechnung,
Datensatz, PDF, Lese-App, Kern-Anzeige, Parität Kern↔Lese, Gegenprobe), demselben Aufbau wie
`tests/u2-adr-258-herkunft-sichtbar.test.js`. Die Gegenprobe-Sektion bestätigt, dass die
Datensatz- und PDF-Proben einen fehlenden Schlüssel bzw. ein weggelassenes Segment tatsächlich
bemerkt hätten.

## Verhältnis zu bestehenden ADRs — was bleibt, was ändert sich

| ADR | Betroffen? |
|---|---|
| U2-ADR-258 (Herkunft) | Unverändert — dieselbe Leitung, zweite Angabe daneben. Kein Feld, keine Funktion von U2-ADR-258 geändert. |
| U2-ADR-121 (Rechtsraum-Katalog, `katalogStand`) | Unverändert — `katalogStand` ist explizit NICHT Teil dieses Baus (s. Kontext oben). |
| U2-ADR-025 (Haftungshinweis im PDF-Fuß) | Unverändert, verbatim im selben Fuß, durch eine Probe gehalten. |

## Folgen

- Ein Bestandsmodul zeigt beim Empfänger und in den Einstellungen „Stand unbekannt" statt gar
  nichts — dieselbe Art neuer, ehrlicher Aussage über alte Daten wie bei U2-ADR-258.
- Der Datensatz wächst um einen Schlüssel (`moduleStand`). `ANLASS_FORMAT_VERSION` bleibt bei 1:
  rein additiv, ein Leser, der ihn nicht kennt, verliert nichts.
- Sechs neue Textkennungen, deutsch und englisch (`standSatzKeine`/`standSatzBekannt`/
  `standSatzTeilweise`/`dokStandFussKeine`/`dokStandFussBekannt`/`dokStandFussTeilweise`), plus
  vier weitere in der Lese-App (`standTitel`/`standSatzKeine`/`standSatzBekannt`/
  `standSatzTeilweise`/`standSatzOhneAngabe` — fünf, eigene Zählung dort).
- **Offene Lücke, ausdrücklich benannt:** `katalogStand` (Vorsorge-Instrumente-Feldebene) trägt
  noch keine der vier Stationen. Ein eigener, getrennter Bau folgt — nicht Teil dieser ADR, nicht
  vergessen.
