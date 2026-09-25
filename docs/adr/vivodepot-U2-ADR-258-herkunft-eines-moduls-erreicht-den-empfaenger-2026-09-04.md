# U2-ADR-258 · Die Herkunft eines Moduls erreicht den Empfänger — im Artefakt, nicht nur in der Anzeige

**Datum:** 04.09.2026
**Status:** Angenommen und umgesetzt.
**Status heute:** gilt — `modulHerkunftBerechnen`/`modulHerkunftGiltAlsGeprueft` im Kern und
als Spiegel in der Lese-App, Datensatz-Schlüssel `modulHerkunft`, Segment im PDF-Fuß,
sichtbarer Block in beiden Lese-App-Sichten, `unbekannt`-Stand in der Kern-Anzeige;
`tests/u2-adr-258-herkunft-sichtbar.test.js` grün.
**Entscheidung:** Nachtrag am 04.09.2026
(Stationen PDF/Datensatz von „optional" auf gleichrangig gehoben, Semantik der Abwesenheit,
Abgrenzung gegen Zwang).
**Bezug:** U2-ADR-181 (`pruefstufe`, drei Werte aus der geprüften Kette) · U2-ADR-186
(ausgefallene Module werden benannt statt verschwiegen) · A318 Zug 2 (der Vorlagen-Prüfstand in
der Lese-App — dasselbe Muster, eine Ebene tiefer) · Bericht „Fremdweg gemessen" vom 18.08.2026

---

## Kontext und Problem

Der Kern **weiß** seit U2-ADR-181, ob ein eingelassenes Modul geprüft ist. Der Empfänger erfuhr
es nie.

Vor dem Bau gemessen, gegen `origin/u2-kanon` (dfe31362):

| | `vivodepot.html` | `vivodepot-lesen.html` |
|---|---|---|
| `ungeprueft` | 30 | **0** |
| `pruefstufe` | 26 | **0** |

Und weiter gemessen, weil die bloße Trefferzahl das Wesentliche verdeckt: das **letzte**
Vorkommen beider Felder im Kern lag bei Zeile ~38024 — der Einstellungen-Anzeige. Der erste
PDF-Zeichenweg beginnt bei ~41220, der Datensatz-Bauer `_datensatzAusEintraegen` bei ~44928.
**Beide Felder erreichten also weder den PDF- noch den Export-Weg.** Die Kennzeichnung lebte
allein in der Anzeige und verließ das Gerät nie.

Ein Dokument, das aus einem selbstgebauten, ungeprüften Modul stammt, sah beim Empfänger
genauso aus wie eines aus einem signierten. Der Befund stammt vom 18.08.2026 und war seither
unbehoben.

Ein dritter Fund fiel beim Messen mit an: ein Modul aus einem Depot, das **vor** der
Marken-Erzwingung entstand, trägt weder `ungeprueft` noch `pruefstufe`. Es fiel durch den
`fremd`-Filter in `eingelasseneModule` hindurch und war in der Anzeige **gar nicht sichtbar** —
und unsichtbar sah aus wie „in Ordnung".

## Entscheidung

**Ein Register, kein Tor.** Die Herkunft wird gesagt, nicht gesperrt — und sie wandert bis zum
Empfänger mit, in jedes Artefakt.

### Drei Stände, und der dritte ist der wichtigste

| Stand | Bedeutung | Woran erkannt |
|---|---|---|
| `geprueft` | Eine Signaturkette wurde wirklich geprüft und endet bei jemandem, den Vivodepot anerkennt. | `ungeprueft === false` (an genau **einer** Stelle gesetzt: `modulEinlassen`, im Zweig mit geprüfter Anbieterkennung) und `pruefstufe !== 'extern-ungeprueft'` |
| `ungeprueft` | Niemand Anerkanntes steht dafür ein. | `ungeprueft === true`, **oder** `pruefstufe === 'extern-ungeprueft'` (signiert, aber die Kette endet bei niemandem Anerkanntem) |
| `unbekannt` | Das Modul trägt gar keine Marke. Ein Bestandsdepot **weiß es schlicht nicht.** | keines der beiden Felder gesetzt |

`extern-ungeprueft` zählt bewusst **nicht** als geprüft: dort wurde zwar eine Signatur geprüft,
aber die Frage, die die Bürgerin und der Empfänger stellen, ist nicht „liegt eine Signatur vor",
sondern „steht jemand dafür ein". Der rohe `pruefstufe`-Wert bleibt je Modul im Befund erhalten,
damit nichts verlorengeht.

### Die Semantik der Abwesenheit

**Ohne Kennzeichnung gilt ungeprüft.** `modulHerkunftGiltAlsGeprueft` gibt nur dann `true`, wenn
ausdrücklich „geprüft" dasteht und nichts daneben. Fehlend, leer, unbekannt, unlesbar,
fremdgeformt — nichts davon zählt.

Das löst den Fork-Fall auf, ohne einen Mechanismus dafür zu bauen: eine geforkte Fassung, die
die Angabe wegläßt, erzeugt damit Dokumente, **die als ungeprüft gelten.** Ihr Schweigen ist
selbst das Signal.

„Unbekannt" bleibt trotzdem die ehrliche **Anzeige** für ein Bestandsdepot. Beides gilt
gleichzeitig — ehrlich angezeigt, und zählt nicht als geprüft. Anzeige und Bewertung sind zwei
Fragen, kein Widerspruch.

### Vier Stationen

1. **Datensatz** (`_datensatzAusEintraegen`) — der Schlüssel `modulHerkunft` steht in **jedem**
   Datensatz: Anlass, freie Zusammenstellung und, darüber, jede Antwort auf eine Anfrage.
   `optionen` wird an dieser Stelle bewusst nicht gelesen.
2. **PDF** (`pdfFussText`) — ein Segment im Dokument-Fuß, der auf **jeder Seite jedes** PDFs
   steht (Situations-, Bereichs-, Voll-Depot-PDF laufen alle durch diese eine Funktion). Die
   Angabe kommt **nicht aus `meta`**: sonst könnten die drei Meta-Bauer sie je einzeln weglassen.
   Der Haftungshinweis nach U2-ADR-025 bleibt unberührt und verbatim im selben Fuß.
3. **Lese-App** — der sichtbare Block `herkunft-marke` in der Depot-Ansicht (aus dem geöffneten
   Depot gerechnet) und im Antwort-Blatt (aus dem **Datensatz** gelesen, denn dort hat der
   Empfänger kein Depot). Steht **vor** der Feldliste: wer die Werte liest, soll vorher wissen,
   woraus sie stammen.
4. **Anzeige im Kern** — der bestehende Modul-Abschnitt der Einstellungen bekommt den
   `unbekannt`-Stand, der vorher unsichtbar war, plus den Herkunfts-Satz, der auch im Fall „keine
   Erweiterung" dasteht.

### Nicht abschaltbar

Keine der Funktionen nimmt einen Schalter, eine Einstellung oder einen Parameter, der die Angabe
unterdrückt. Der Block in der Lese-App steht unbedingt — auch im Fall „keine Erweiterung", denn
eine Kennzeichnung, die verschwinden kann, lehrt den Leser, ihre Abwesenheit für Entwarnung zu
halten. Ein Rot-Teil der Probe fährt jeden Ausgabeweg mit Optionen und Meta-Objekten, die genau
das versuchen.

### Ton

Sachlich, keine Angstmache. „Ohne geprüfte Herkunft" ist eine **Herkunftsangabe**, keine Warnung —
viele Erweiterungen sind selbst gebaut und völlig in Ordnung. Bewusst kein Rot und kein Warn-Gelb
für den offenen Fall; die gedämpfte Fläche unterscheidet, ohne zu alarmieren. **Farbe trägt den
Unterschied nicht** (WCAG 1.4.1): die Aussage steht im Text, die Klasse färbt nur, was der Satz
ohnehin schon sagt. Eine Probe hält das fest, indem sie beide Fälle nach dem Entfernen aller
Auszeichnung vergleicht.

## Was diese Kennzeichnung ausdrücklich NICHT ist

**Sie ist keine Sicherheitsgrenze.** Der Kern steht unter EUPL-1.2; eine geforkte Fassung kann
sie entfernen. Sie schützt die Nutzerin der **echten** Anwendung davor, dass ihr unbemerkt ein
fremdes Modul untergeschoben wird — nicht gegen jemanden, der eine eigene Fassung ausliefert.
Niemand soll sie später für mehr halten, als sie ist. Der Hinweis steht als Kommentar an beiden
Stellen im Code, nicht nur hier.

**Sie deckt Täuschung ab, nicht Zwang.** Das unbemerkte Unterschieben eines Moduls ist der Fall,
den sie trifft. Wer danebensteht und verlangt, dass ein Modul geladen wird, hält bei einem Hinweis
nicht inne. **Dieser Fall bleibt im Bedrohungsmodell offen** und darf durch diese Änderung nicht
als gelöst erscheinen.

## Der Spiegel und seine eine Bruchstelle

> **BERICHTIGT am 06.09.2026 durch U2-ADR-335.** Der Absatz verlangte, dass beide Fassungen von
> `modulHerkunftStand` **gleich** urteilen. Das war richtig, solange beide dasselbe taten — und
> wurde falsch, sobald gemessen war, dass der Kern **prüft** und die Lese-App nur **liest**:
> `ungeprueft` ist ein Depot-Feld, und die Lese-App öffnet eine Datei, die der Absender in der
> Hand hat. **Die Zusicherung ist enger gefasst, nicht gestrichen: die Lese-App urteilt nie
> MILDER als der Kern.** Grund und Messung stehen in U2-ADR-335.

Die Lese-App führt ihre eigene Kopie der drei reinen Funktionen — sie muss offline und für sich
allein laufen, und eine geteilte Datei gibt es nicht. Die einzige Stelle, an der der Spiegel
auseinanderlaufen **könnte**, ist die Slot-Liste: der Kern leitet sie aus `EINLASS_REGISTER` ab,
die Lese-App hat dieses Register nicht und führt `MODUL_SLOTS`. Eine Probe hält beide Listen
gegeneinander, und eine weitere hält die **Ordnung** der Urteile beider Fassungen über dieselben
Modul-Formen — die Aussage folgt aus einer Messung, nicht aus der Absicht.

Die Lese-App zählt **ausdrücklich auch Register mit, die sie selbst gar nicht auswertet**
(Bereiche, Situationen, Assistenten, Formate …). Ein Modul, das den Inhalt des Depots geformt
hat, gehört in die Herkunftsangabe, auch wenn der Empfänger seine Wirkung hier nicht sieht.

## Folgen

- Ein Bestandsdepot zeigt beim Empfänger und in den Einstellungen „Herkunft unbekannt" statt gar
  nichts. Das ist eine **neue** Aussage über alte Daten — sie ist ehrlich und war vorher nur
  deshalb nicht da, weil Unsichtbarkeit billiger aussah.
- Der Satz „Diese Erweiterungen haben Sie selbst hineingelassen" erscheint nicht mehr für
  Bestandsmodule. Über ein Modul, dessen Herkunft dieses Depot nicht kennt, wäre das eine
  Behauptung.
- Acht neue Textkennungen, deutsch und englisch (3166 → 3174, gegen `baueModul()` nachgerechnet).
- Der Datensatz wächst um einen Schlüssel. `ANLASS_FORMAT_VERSION` bleibt bei 1: der Zusatz ist
  rein additiv, ein Leser, der ihn nicht kennt, verliert nichts — und ein Leser, der ihn kennt,
  behandelt sein Fehlen richtig (als „nicht geprüft").
