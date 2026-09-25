# U2-ADR-141: Anzeigetexte liegen in einem austauschbaren Satz, nicht in der Felddefinition

**Status:** Akzeptiert
**Datum:** 17.08.2026
**Kategorie:** ARCHITEKTUR
**Grundlage:** Auftragskette für die Nacht 16./17.08.2026 („Der Umbau beginnt"),
Glied 1. Vorgabe sinngemäß: es gehe um den modularen Aufbau, der einen Kern hat, an den
angedockt werden kann — Sprachen, Rechtsräume, Themenfelder, Institutionen, Standards. Deutsch
sei nicht das Ziel, sondern der Anfang.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `TEXTSATZ_EINGEBAUT` (der eingebaute deutsche Satz),
  `_TEXTSATZ_MODUL_REGISTRY` + `textsatzModulPruefen`/`textsatzModulEinbetten`/
  `_textsatzModuleAusDepotAnmelden` (der Andockweg), `textLesen`/`textsatzSpracheAktiv`
  (die Leseregel), `_textsatzAufSektorenAnwenden`/`textsatzNeuAnwenden` (das Auflösen im Baum),
  `TEXTSATZ_FEHLSTELLEN` (der eingebaute Rot-Beleg), Sektor `mobilitaet` (der Durchstich).
- **ADR-Bezug:** U2-ADR-112 §2/§4 (die Festlegung, die dieser ADR NICHT bricht, sondern deren
  ausdrücklich offene Frage er beantwortet), U2-ADR-121 (das Rechtsraum-Modul, dessen Form hier
  übernommen wird), U2-ADR-051 (Code-Listen-Registry, dasselbe Anmelde-Muster).
- **Status heute:** gilt — Beleg `tests/textsatz-mechanismus.test.js#[Textsatz] keine Fehlstelle:
  jeder Knoten hat seine Beschriftung`.

---

## Der Befund

Vivodepot soll ein Kern sein, an den angedockt wird. Für Rechtsinhalte ist das gebaut: ein
Rechtsraum-Modul trägt seinen `wortlaut` selbst, der Kern hält keinen fremden Rechtstext
stellvertretend (U2-ADR-121). Für **Anzeigetexte** war es das nicht — sie standen als deutsche
Zeichenketten in den Felddefinitionen selbst.

**Frisch gemessen am 17.08.2026** mit `tools/inline-texte-messen.js`, strukturell über den
geladenen `SEKTOREN`-Baum statt per Regex über den Quelltext:

| | |
|---|---|
| Sektoren | **12** (nicht 11 — `krisenvorsorge` kam am 10.08. dazu) |
| Felder | 261 |
| Inline-Anzeigetexte in den Felddefinitionen | **857** (449 `label`, 236 `beispiel`, 172 `hint`, 0 `titel`, 0 `platzhalter`) |
| dazu, getrennt geführt: `optionen[].label` | 270 |
| STRINGS-Schicht (Gegenzahl) | 930 Einträge |

Die Zahlen des Auftragstextes („rund 1.780 inline, 1.720 STRINGS") stammen aus einer
Regex-Zählung über die ganze Datei; sie treffen auch Kommentare, `STANDARD_VORLAGEN`,
Assistenten-Kataloge und den Template-Generator-Block. Der Gegenstand dieses ADR ist der
Sektoren-Baum, und der trägt 857.

## Warum das nicht U2-ADR-112 widerspricht

U2-ADR-112 §2 sagt: Feld-Beschriftungen gehören **nicht in die STRINGS-Schicht**, „ihr Ort ist
die Definition … sie von dort in eine zweite Schicht zu ziehen, verteilte einen Gegenstand auf
zwei Orte, ohne dass jemand etwas gewönne".

**Diese Festlegung bleibt unangetastet:** hier wandert kein `label` nach `STRINGS`.

§4 desselben ADR lässt ausdrücklich offen, „ob Feld-Beschriftungen jemals in eine eigene
Übersetzungsschicht sollen — etwa für eine zweite Sprache", und verlangt dafür: *„Käme sie, wäre
sie ein eigener Umbau mit eigenem ADR."* Dies ist dieser ADR.

Der Einwand aus §2 — „zwei Orte, die auseinanderlaufen" — wird nicht bestritten, sondern
konstruktiv beantwortet (s. „Die Kennung ist die Struktur" unten): es gibt keine zweite gepflegte
Kennung, die driften könnte, und beide Driftrichtungen sind bewacht.

## Entscheidung

**1 — Der eingebaute deutsche Satz ist da, er wird nicht geladen.** `TEXTSATZ_EINGEBAUT` verhält
sich zum Textsatz wie `RECHTSRAUM_KATALOG` zum Rechtsraum: Teil des Kerns, nicht Modul.

**2 — Die Kennung ist die Struktur, kein zweites Feld.** Ein Feld bekommt keine Eigenschaft
`textKennung`; sein Weg im Baum IST seine Kennung, mit der Art als Endung:

```
mobilitaet.label                          Sektor
mobilitaet.einfuehrungstext               Sektor
mobilitaet#fahrzeuge-fuehrerschein.label  Sektion
mobilitaet.reisepass_nr.label             Feld
mobilitaet.fahrzeuge/bezeichnung.beispiel Unterfeld
```

Eine gepflegte zweite Kennung wäre genau der zweite Ort, den U2-ADR-112 §2 fürchtet. Ein Weg
im Baum ist keiner: er ändert sich nur, wenn sich die Struktur ändert, und dann fällt es auf.

**3 — Die Migration ist feldweise und still.** Trägt ein Knoten seinen Text noch inline, bleibt
er unangetastet; nur wo der Text FEHLT, wird er aus dem Satz geholt. Ein Sektor kann nach dem
anderen umziehen, ohne dass ein Zwischenzustand halb kaputt ist. Der Zustand „umgestellt" ist
maschinell ablesbar: eine Kennung steht genau dann im Satz, wenn der Knoten umgezogen ist.

**4 — Die Modul-Regeln sind die des Rechtsraum-Moduls, nicht neue.**
- `sprache: 'de'` ist reserviert; ein Modul kann den eingebauten Satz **nie** überschreiben.
- `moduleVersion` muss ganzzahlig ≥ 1 sein und für eine Ablösung **höher** liegen
  (Aktualisieren-statt-Einfrieren, wie U2-ADR-121 Abweichung 1).
- Eine Kennung, die der eingebaute Satz nicht kennt, wird **verworfen** — ein verworfener
  Eintrag verwirft nicht das Modul.
- **Eine alte Kennung ist nicht unbekannt.** Ein Modul von vor dem Kennungs-Umbau trägt seine Texte
  unter den alten deutschen Kennungen (`identitaet.vorname.label` statt `identity.givenName.label`).
  Das Tor (`_textsatzTexteUebernehmen`, beide Prüfwege) übersetzt sie über `KENNUNG_MAPPING` in die
  heutige, bevor es fragt, ob es sie kennt — dieselbe Tabelle und Bauart wie der Datenumzug in
  `depotNormalisieren`. Nur Schlüssel werden umbenannt; der Text bleibt, wie er geschrieben oder
  signiert wurde. Die Signatur wird auf den unveränderten Bytes geprüft, im Depot liegt das rohe
  Modul, übersetzt wird bei jedem Durchgang durch das Tor. Trägt ein Modul beide Fassungen, gilt die
  neue; ein alter Name, der zugleich ein heutiger ist, wird nie übersetzt; was weder alt noch neu
  bekannt ist, bleibt verworfen. Übersetzt werden die Formen `bereich[#sektion].feld[/unterfeld[/wert]].endung`,
  `wizard:ID.feld…`, `vollmacht:feld…`, `feld.feld.vorschlaege` und `präfix:ID#bereich.titel`.
  Ohne diese Übersetzung galt die Signatur eines alten Bündels, und das Produkt zeigte rohe Kennungen
  (gemessen mit `tools/altbestand-vier-produkte-messen.js`).
- Gelesen wird ausschließlich aus der Laufzeit-Registry, nie direkt aus `data`; ein defektes
  Modul blockiert das Laden nie.

**5 — Der Rot-Beleg ist eingebaut, in beide Richtungen.** Ein Knoten ohne `label` und ohne
Eintrag landet in `TEXTSATZ_FEHLSTELLEN`; ein Eintrag, den kein Knoten abholt, ist eine tote
Kennung. Beides macht `tests/textsatz-mechanismus.test.js` rot. Zur Laufzeit wird nicht
geworfen — eine fehlende Beschriftung darf keine Sitzung zerstören.

**6 — Was ausdrücklich NICHT entschieden und NICHT gebaut ist.** Kein zweiter Sprachsatz, kein
Umschalter in der Oberfläche, kein Beispielmodul. `textsatzSpracheAktiv()` liest
`data.textsprache` und fällt auf `'de'` zurück — der Weg ist vollständig prüfbar, aber niemand
beschreitet ihn heute. Wie eine Sprache ohne Server, Konto und Anmeldung gewählt würde, ist
offene Frage 1 (s. u.) und in `docs/JURISDICTIONS.md` Schicht 2 geführt.

## Der Durchstich: `mobilitaet`

Der Auftrag verlangte den **am wenigsten verflochtenen** Sektor, nicht den kleinsten. Gemessen
mit `node tools/inline-texte-messen.js --verflechtung`: gezählt wird, wie viele der
Anzeigetexte eines Sektors ausserhalb seiner Definition **wörtlich zitiert** werden — genau
diese Zitate brechen, wenn ein Text seinen Ort wechselt.

| Sektor | Texte ≥8 Zeichen | zitiert in Proben/Werkzeugen | zitiert in der Lese-App |
|---|---|---|---|
| **mobilitaet** | 43 | **11** | 35 |
| persoenliches | 60 | 9 | 55 |
| wohnen | 42 | 26 | 39 |
| vorsorge | 112 | 39 | 102 |

`persoenliches` hat zwei Zitate weniger in Proben, aber 64 Aussenbezüge gegen 46 — und
zusätzlich je einen im Template-Generator und im VC-Issuer, die `mobilitaet` nicht hat.
`mobilitaet` trägt ausserdem die gemeinsam niedrigste Feldzahl (15) und die kleinste
Inline-Summe (44).

**Zwei Messbefunde, die die Zahl der Rohliste relativieren und für die übrigen elf gelten:**

- Die **24 Render-Aufnahmen** (`tests/fixtures/render-aufnahme/*.html`) zitieren jeden Text
  jedes Sektors — sie halten die komplette gerenderte Sicht. Sie sind trotzdem **keine
  Umstellungskosten**: der Umbau ändert kein Wort, nur den Ort, also rendert dieselbe Sicht
  dieselben Bytes. Belegt und nicht behauptet — nach der Umstellung von `mobilitaet` blieben
  beide Aufnahmen unverändert grün.
- Die **Lese-App hält eine zweite, vollständige Kopie** von `SEKTOREN` mit eigenen deutschen
  Beschriftungen (`vivodepot-lesen.html:666`). 35 der 43 Mobilitäts-Texte stehen dort ein
  zweites Mal. Das ist kein Ergebnis dieses Umbaus, sondern ein vorbestehender Zustand — aber
  es ist die Frage, die dieser Mechanismus eines Tages beantworten könnte, und sie gehört
  benannt statt umgangen.

## Konsequenzen

**Nachgelagerte Wächter, die der erste Sektor ausgelöst hat: fünf** (sechs Testfälle).
Bemerkenswert ist, welche NICHT dabei sind.

| Wächter | warum |
|---|---|
| `u2-106-kein-kommentar-behauptet-eine-datei-die-es-nicht-gibt` | ein Kommentar nannte die Probe, bevor es sie gab |
| `[A253] kein neuer unverdrahteter Name` | drei neue Funktionen ohne Aufrufer im Produkt |
| `faktenbasis --check` (2 Fälle) | erzeugte Faktenbasis |
| `[Schale·Ist]` | `SCHALEN_STAND`/`CACHE`-Lockstep |
| `[Lockstep·Ist]` | `BUILD_DATUM` |

**KEIN Wächter hat auf eine Beschriftung angeschlagen** — weder die zwei Render-Aufnahmen noch
`sektoren-spec.test.js` noch einer der elf Zitierer. Das ist der belastbare Teil der Schätzung
für die übrigen elf Sektoren: die auslösenden Wächter sind **je Umbau** zu erwarten, nicht **je
Sektor**; was je Sektor anfällt, ist die Textmenge, nicht die Wächterzahl.

`[A253]` verlangte eine Entscheidung: `_textsatzModuleAusDepotAnmelden` und
`textsatzNeuAnwenden` sind beim Depot-Laden verdrahtet — in derselben Reihe wie Code-Listen und
Rechtsraum-Module. `textsatzModulEinbetten` ist bewusst in die Grundlinie aufgenommen, mit
demselben Grund und demselben Präzedenzfall wie `_rechtsraumModulEinbetten`, das dort seit
jeher steht: die Funktion gehört zum Andockvertrag, und der Weg, auf dem ein Modul in ein Depot
gelangt, existiert noch nicht.

## Offene Fragen, nicht entschieden

1. **Wie eine Sprache gewählt wird** — ohne Server, ohne Konto, ohne Anmeldung. Nicht entworfen.
2. **Wer einen Textsatz signieren darf** und woran ein Depot ihn erkennt. Der Rechtsraum-Modul-
   Vertrag hat dieselbe offene Stelle („contributor trust path", `docs/JURISDICTIONS.md`).
3. **Ob die Lese-App aus demselben Satz lesen soll.** Heute trägt sie eine eigene Kopie. Die
   Frage ist eine Architekturfrage über zwei Anwendungen, keine Textfrage.
4. **Ob `optionen[].label` je dazugehören.** Bei `mobilitaet` sind es amtliche
   Führerscheinklassen — Datenwerte, keine Anzeigetexte. Bei anderen Sektoren stehen dort
   deutsche Sätze. Die Grenze ist je Sektor zu ziehen, nicht pauschal.

---

## Nachtrag vom 18.08.2026 — die Form für die Rumpf-Texte: EINE Form, nicht zwei

**Der Auftrag stellte die Frage als Wahl:** Kennungen im **Markup** (`data-tx="…"` am Element),
oder wandert der Text in eine **Definition** (Tabelle plus Schlüssel, wie `STRINGS`)? Beide Wege
prüfen, den gewählten begründen.

**Der Gegenstand ist ausdrücklich die VOLLSTÄNDIGE Zahl**, nicht die HTML-Textknoten allein —
und genau daran entscheidet sich die Frage.

### Die Messung (`tools/lokalisierbarkeit-erheben.js --reichweite`, 18.08.2026)

| Schicht | Zahl | Anteil |
|---|---:|---:|
| Definition (SEKTOREN, Situationen, Assistenten …) | 2104 | 40,1 % |
| `optionen[].label` | 571 | 10,9 % |
| Zeichenketten-Tabelle (`STRINGS`) | 982 | 18,7 % |
| **Rumpf** (HTML-Textknoten) | **298** | **5,7 %** |
| **Attribute** (`title`, `aria-label`, `placeholder` …) | **16** | **0,3 %** |
| JS-Ausgabe (im Ausgabe-Bauer zusammengesetzt) | 899 | 17,1 % |
| JS-Meldung | 375 | 7,1 % |
| **Gesamt** | **5245** | |

*(Die Zahl aus Glied 6 war 5241; sie ist am 18.08. auf 5245 gestiegen, weil die Bauten desselben
Tages eigene Anzeigetexte mitbrachten. Derselbe Zählgegenstand, anderer Stand.)*

### Die Entscheidung: der Text wandert in eine Definition

**Eine Markup-Kennung erreicht 314 von 5245 — 6,0 %.** Sie kann nur tragen, was im Markup steht.

**Und für 1274 Texte (24,3 %) ist sie nicht teurer, sondern UNMÖGLICH:** ein Text, den ein
Ausgabe-Bauer zur Laufzeit zusammensetzt, hat **kein Element, an dem eine Kennung hinge**. Das ist
genau der Fall, den der Auftrag als Kipp-Punkt benannt hat — er tritt ein.

**Die Definitions-Form erreicht alle 5245**, weil sie den Text vom Ort löst, an dem er erscheint.
**Und sie ist kein neuer Mechanismus:** 3657 Texte (69,7 %) laufen bereits über sie.

> **Zwei Formen nebeneinander wären zwei Kennungsräume über dieselbe Sache** — genau die Sorte
> Kopie, die in diesem Vorhaben mehrfach lautlos auseinandergelaufen ist. Für 6 % Reichweite ist
> das kein Handel.

### Was daraus für die drei Rumpf-Anwendungen folgt

**289 der 298 Rumpf-Texte liegen NICHT im Kern**, sondern im Template-Generator (171), im
VC-Issuer (75) und im Schlüssel-Teilen-Werkzeug (43). Der Kern trägt 8, die Lese-App 1.

**Diese drei Anwendungen haben heute keine Zeichenketten-Tabelle.** Die gewählte Form heisst für
sie: erst eine Tabelle, dann die Kennungen — dieselbe Bauart, die Kern und Lese-App schon haben.
**Das ist der Bau des nächsten Glieds, nicht dieses Nachtrags.**

### Was diese Entscheidung NICHT entscheidet

Sie sagt nichts darüber, **welche** Texte gehoben werden und in welcher Reihenfolge — das ist das
Heben in Tranchen. Und sie berührt die offene Frage 4 oben nicht: dass `optionen[].label` bei
`mobilitaet` amtliche Klassen sind, bleibt eine Grenzfrage je Bereich.

---

*Vivodepot GmbH · Berlin · 17.08.2026, Nachtrag 18.08.2026*
