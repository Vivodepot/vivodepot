# U2-ADR-303: Der Aufrufer statt des Riegels — das mitgelieferte Bündel kommt über das Gerüst, nicht über den Einlass

**Status:** Akzeptiert
**Datum:** 05.09.2026
**Betrifft:** `vivodepot.html` (`buergermodulBuendelAnwenden`, `BUERGERMODUL_BUENDEL`),
`tests/buergermodul-aufrufer.test.js`

- **Status heute:** gilt — der Aufrufer läuft, der Rundweg ist byte-gleich bewiesen, und der
  Einlass-Riegel bleibt unangetastet. Der Slot `BUERGERMODUL_BUENDEL` ist bewusst `null`: das
  Bündel selbst entsteht in einem eigenen Zug (E4). U2-ADR-253 „Commit B" bleibt offen und wird
  durch diese Entscheidung **nicht** gebraucht.

---

## Der Auftrag war, einen Riegel einzureißen. Das Ergebnis ist, ihn stehen zu lassen

Gefragt war, ob `bereichsModulPruefen` für die Kern-Zone geöffnet wird — namentlich
`sektionen: Object.freeze([])` und die `reserviert`-Prüfung gegen `BEREICH_IDS_EINGEBAUT`.
Gemessen ergibt sich: **der Riegel ist nicht das fehlende Stück.**

## Die Zahlen, die es entscheiden

```
leeres Depot heute                    1 046 Bytes, 47 Schlüssel
enthält es die native Struktur?       NEIN — „vorname" kommt darin nicht vor
Struktur-Bündel (minifiziert)        43 160 Bytes
`bereichsModule` steht in VOLLEXPORT_STRUKTURELL_SCHLUESSEL
```

Ein Bündel durch `modulEinlassen` zu schicken hieße: die Depot-Datei jeder Bürgerin wächst von
**1 046 auf über 44 000 Bytes**, Faktor 42. Und der Zuwachs ist nicht ihr Inhalt, sondern eine
**Kopie des Gerüsts** — mitreisend in jedem Vollexport und jedem Umzug.

**Das ist der Maßstab, buchstäblich gemessen:** „Am Ende möchte ich ‚mein'
Bürgerdepot haben. Als wäre nichts gewesen." Ihre Datei trägt die Struktur heute nicht. Würde sie
es künftig tun, wäre das genau eine Sache, die sie bemerkt.

### Zwei weitere Gründe, beide aus dem Bestand selbst

**`bereichsModule` ist der Slot für ANGEDOCKTE Bereiche.** Sein eigener Kommentar sagt es: „ein
angedockter Bereich ist eine Beschreibung (Kennung, Beschriftung, Fähigkeiten)". Die nativen
dreizehn sind nicht angedockt — **sie sind das Gerüst.** Sie dort hineinzulegen hieße, das Gerüst
als Fremdinhalt zu führen.

**Fassungs-Drift.** `_einbettenMitFassung` ersetzt nur bei höherer `moduleVersion`, sonst
„NICHTS ändert sich". Trüge ein Depot Bündel v1 und der Kern lieferte eine verbesserte Struktur
ohne Bump, behielte die Bürgerin still die alte. Bei 13 Bereichen und 448 Feldern ist das keine
Randbedingung.

## Die Entscheidung

`buergermodulSektorErsetzen` (U2-ADR-292) tat bereits das Richtige und hatte **null Aufrufer**.
Das fehlende Stück war nie ein Riegel, sondern **der Weg hinein**:

```js
const BUERGERMODUL_BUENDEL = null;                       // Slot, leer bis E4
function _buendelBereichZuFeldDefs(sektorId, bereich)    // geschachtelt → flach
function buergermodulBuendelAnwenden(buendel)            // Bereich für Bereich
const _BUERGERMODUL_BUENDEL_BERICHT = buergermodulBuendelAnwenden(BUERGERMODUL_BUENDEL);
```

**Ein Bereich, den das Bündel nicht kennt, bleibt unangetastet.** Ein Teil-Bündel leert nichts —
Pro und Berufsverband bringen später nur wenige Bereiche mit.

## Die Boot-Reihenfolge löst sich auf, statt beantwortet zu werden

Die offene Frage war, ob der Aufruf vor oder nach `_bereichsModuleAusDepotAnmelden` gehört.
**Gemessen: `buergermodulSektorErsetzen` liest `data` an keiner Stelle — null Vorkommen.**

Der Weg ist depot-unabhängig. Er läuft einmal beim Laden des Kerns, wie der Bau von `SEKTOREN`
selbst, **lange bevor ein Depot existiert.** Damit gibt es kein Vorher/Nachher zu entscheiden:
die native Basis steht, wenn das erste Depot geöffnet wird, und die Fremdmodule der Bürgerin
docken danach additiv oben drauf, genau wie heute.

## Die rote Gegenprobe ist der unveränderte Bestand

Was fällt, ist die Sperre für das **mitgelieferte** Bündel — **nicht die Sperre gegen Fremde.**
Weil der Riegel gar nicht angefasst wird, ist die Gegenprobe nicht gebaut, sondern gemessen:

- Ein fremdes `bereich`-Modul, das einen nativen Bereich beansprucht, wird von
  `bereichsModulPruefen` mit `reserviert` abgewiesen — unverändert.
- **Und zwar bei JEDEM Laden, nicht nur beim Import:** `_bereichsModuleAusDepotAnmelden` ruft
  `bereichsModulPruefen` je Modul. Ein handverändertes Alt-Depot kommt darum ebenfalls nicht
  durch.

Das ist die schärfere Zusage als „heute unmöglich" — und genau deshalb war „der Riegel fällt
nicht" auch für die Alt-Depot-Randbedingung das bessere Ergebnis. Beide Richtungen stehen als
Probe fest, damit die Zusage beim nächsten Umbau nicht still verlorengeht.

## Was bewiesen ist

```
Rundweg: der eigene Bestand als Bündel        13 Bereiche · 266 Felder · 182 UnterFelder
                                              0 verworfen, Ergebnis BYTE-GLEICH
ohne Bündel                                   angewandt: false, Bestand unangetastet
Teil-Bündel                                   fremder Bereich unverändert
UnterFelder                                   266 top / 182 unter — nicht 448 flach
```

Die Positivkontrolle nimmt ein einziges Feld aus dem Bündel und prüft, dass der
Rundweg-Vergleich das sieht — sonst misst er nichts.

## Was ausdrücklich NICHT dazugehört

**Das Bündel.** `BUERGERMODUL_BUENDEL` ist `null`. Der Inhalt entsteht in einem eigenen Zug;
dieser Aufrufer wartet nicht auf ihn, er ist ohne ihn ein sauberes Nichts — und genau das ist
gemessen, nicht geglaubt.

**Der Verhaltensbeweis der zusammengesetzten App.** Er wird an anderer Stelle gebaut. Bewiesen
ist hier die Datenebene: der Weg verliert nichts und benennt nichts um.

**U2-ADR-253 „Commit B".** Bleibt offen — und wird für das mitgelieferte Bündel **nicht
gebraucht.** Wer den nativen Bestand einmal wirklich suppressieren will, entscheidet das
gesondert.

## Drei Wächter halten den alten Zustand fest — sie sind nachgezogen, nicht aufgeweicht

`buergermodulSektorErsetzen` war absichtlich unverdrahtet, und **drei** Stellen hielten genau das
fest. Dass alle drei rot wurden, ist kein Mangel dieses Commits, sondern der Beleg, dass die
Unverdrahtetheit wirklich bewacht war:

| Wächter | vorher | jetzt |
|---|---|---|
| `[Zone·RATSCHE·Ladeweg]` | „hat NULL Aufrufer" | „hat **genau einen**, und zwar diesen" |
| `[Zone·Grundlinie·Ladeweg]` | „steht MIT Begründung in der Grundlinie" | „ist im **Abgang** dokumentiert" |
| `nur-vom-test-erreicht` | Eintrag in `namen` | Eintrag in `abgaenge`, mit vormaliger Begründung |

**Die erste Änderung ist eine Verschärfung, keine Lockerung.** „Niemand ruft ihn" ließ jeden
zweiten Aufrufer zu, sobald der erste da war. „Genau einer, und zwar dieser" fängt den zweiten —
und der zweite wäre genau das, wovor dieses ADR warnt: ein zweiter Ort, an dem nativer Bestand
entsteht, und einer davon wird vergessen.

**Die zweite und dritte folgen dem Hausbrauch:** eine verdrahtete Funktion **wandert** von `namen`
nach `abgaenge` und trägt ihre vormalige Begründung mit. Sie wird nicht gelöscht. Ein stilles
Verschwinden wäre dasselbe wie eine zuwachsende Grundlinie, nur in die andere Richtung.

## Der Aufrufer trägt NICHT für `WIZARDS` — Nachtrag, gemessen

U2-ADR-304 hat unabhängig gemessen, was geschieht, wenn `SEKTOREN` leer ist. Der Befund trifft
diesen Aufrufer, und er gehört hierher, **damit ihn niemand für einen allgemeinen Weg hält:**

```
const WIZARDS          vivodepot.html:16206 … 16516
                       darin 8 × _katalogOptionen(sektorId, feldId)
_katalogOptionen       liefert def.optionen SOFORT zurück
dieser Aufrufer        Zeile ~24662 — rund 8 000 Zeilen später
```

**Die Options-Arrays der Assistenten sind bei der Auswertung des Literals als Wert eingefangen**,
lange bevor der Aufrufer läuft. Ein Bündel, das die Optionen eines Katalogfeldes **ändert**,
erreicht die Assistenten daher nicht.

**Warum das im Rundweg nicht auffällt:** solange das Bündel den nativen Bestand nur reasserted —
genau der Fall, der hier byte-gleich bewiesen ist —, sind alte und neue Optionen identisch. Der
Unterschied entsteht erst, wenn jemand den Bestand wirklich austauscht. **Und dann still.**

**Die Lösung gehört an die acht Stellen, nicht hierher.** `_katalogOptionen` müsste zur
Aufrufzeit statt zur Auswertungszeit auflösen — dieselbe Form, die `bereichsModulPruefen` beim
`label` bereits als Getter benutzt. Eigener Gegenstand, eigene Entscheidung.

**Dieser Aufrufer ist für Sektoren richtig und für Assistenten nicht zuständig.** Das ist die
Zusage, die er gibt — nicht mehr.
