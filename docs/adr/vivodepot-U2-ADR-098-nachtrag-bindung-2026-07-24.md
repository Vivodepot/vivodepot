# U2-ADR-098-Nachtrag — Die Bindung zwischen ADR und Prüfung

**Status:** Angenommen
**Datum:** 24.07.2026
**Bezug:** U2-ADR-098 (Format der Konformitätsklausel), U2-ADR-096 (erste
gebaute Klausel), U2-ADR-090 §3 (Benennung von Nachträgen)
**Linie:** U2
**Grundlage:** Lesung von `tests/alt-label-register.test.js` und
`tests/migration-keine-neuen-waisen.test.js`, verbatim gegen Commit `5bcf5bb`;
Schritt-A-Prüfbericht vom 24.07.2026, ebenfalls gegen `5bcf5bb`

> **Zur Form dieses Nachtrags.** U2-ADR-090 §3 regelt allein die Benennung
> (`<Nummer>-Nachtrag`, eigene Datei, keine eigene Nummer). Zu Index-Führung
> und Status schweigt §3. Dieser Nachtrag folgt der etablierten Praxis —
> eigener Index-Eintrag, eigener Status — und füllt damit eine Lücke, statt
> von §3 abzuweichen. **Die Lücke selbst ist offen und gehört in den
> laufenden Vorgang zu U2-ADR-090 §8.**

**Status heute:** gilt — Beleg `tests/bindung-pruefen.test.js`.

---

## Anlass

U2-ADR-098 beschließt Felder, aber nicht, woran eine Bindung hält. Die
Lesung der beiden einzigen Testdateien, die die Bindung heute tragen, hat vier
Punkte gezeigt, an denen sie weniger misst, als sie behauptet.

Der Nachtrag ändert **nicht** das Klausel-Format aus 098. Er entscheidet die
Code-Seite der Bindung und verengt zwei Angaben.

---

## Punkt 1 — Der Prüfungsname ist der Testname, nicht ein zweiter daneben

**Befund.** In `alt-label-register.test.js` steht in `PRUEFUNGEN` der Name
`alt-label-register-eintraege-vollstaendig`. Der zugehörige Test heißt
`[AltLabel] jeder Eintrag traegt Sektor, Datum, ADR und ein vollstaendiges
Feld`. Das sind verschiedene Zeichenketten.

Schritt A hat den Befund für alle vier Namen bestätigt und zugleich
präzisiert: **Keiner der vier Namen ist ein `test()`-Titel.** Sie kommen im
Repository ausschließlich vor als Einträge der Konstante `PRUEFUNGEN`, als
Klausel-Einträge in U2-ADR-096 und einmal als Prosa-Verweis in U2-ADR-100. Die
tatsächlichen Testtitel tragen die Präfixe `[Klausel]`, `[AltLabel]` und
`[KeineWaisen]`.

Die Verhalten laufen also sehr wohl als Tests — nur unter anderen Titeln. Die
Bindung, die heute besteht, ist damit **„Name-in-Liste ↔ Name-in-Klausel", nicht
„Name ↔ Testlauf-Titel"**. Geprüft wird, dass zwei Dokumente dieselbe
Zeichenkette tragen. Beide Seiten könnten eine Prüfung nennen, die niemand
geschrieben hat, und es bliebe grün. Dieselbe Klasse wie der erfundene
„Abriss-Test" mit `zustand: prüfbar`, eine Ebene tiefer — und schwerer zu
sehen, weil der Mechanismus danach aussieht, als hielte er.

**Entscheidung.** Ein Prüfungsname existiert genau einmal. Die Einträge in
`PRUEFUNGEN` sind die Namen, unter denen die Tests aufgerufen werden, und
werden beim Aufruf aus derselben Konstante entnommen. Ein Name, der nicht
gleichzeitig ein ausgeführter Test ist, ist keine Prüfung.

Der Klausel-Test prüft daraufhin beide Richtungen wirklich: dass jeder Name im
ADR steht, und dass jeder Name eine ausgeführte Prüfung bezeichnet.

**Der Beschriftungsteil bleibt frei.** Ob ein Testname zusätzlich eine
sprechende Beschreibung trägt — etwa ein vorangestelltes Präfix wie
`[AltLabel]` —, ist nicht Gegenstand dieser Entscheidung. Verlangt ist nur,
dass der gebundene Name im Aufruf vorkommt und nicht danebensteht.

---

## Punkt 2 — `pruefung:` wird auf einen auflösbaren Pfad verengt

**Befund.** 098 nimmt „Datei **oder** Prüfungsname" entgegen. Diese
Lockerheit hat im Entwurf zu U2-ADR-100 einen nicht existierenden Test mit
`zustand: prüfbar` durchgehen lassen; gefunden wurde er erst bei einer
Gegenprüfung von Hand.

**Entscheidung.** `pruefung:` trägt einen auflösbaren Dateipfad, danach den
Prüfungsnamen hinter einem Trennzeichen:

```
pruefung:  tests/alt-label-register.test.js#alt-label-register-eintraege-vollstaendig
```

Der Pfad macht die Angabe überprüfbar, der Name erhält die Auflösung auf die
einzelne Prüfung. Ein Pfad, der auf keine Datei zeigt, ist ein Befund; ein
Name, der in der Datei nicht als Prüfung vorkommt, ebenso.

---

## Punkt 3 — Die Herkunft steht als Konstante, nicht als Feld `quelle:`

**Befund.** `quelle` ist im Code bereits Fachbegriff der
Situations-Querverweise (Quellsektor), zehn Fundstellen. Ein Werkzeug, das auf
den Namen greift, findet zehn Falschtreffer.

**Entscheidung.** Die Herkunftsangabe steht auf der Code-Seite als eigene
Konstante neben `ADR` und `PRUEFUNGEN`, in Großschreibung, damit keine
Verwechslung mit dem vorhandenen Fachbegriff möglich ist:

```js
const ADR = 'U2-ADR-096';
const HERKUNFT = 'entscheidung';
const PRUEFUNGEN = [ … ];
```

Die sechs zulässigen Werte bleiben unverändert: `entscheidung`, `invariante`,
`metamorph`, `generator`, `orakel`, `regression`. In der Klausel selbst bleibt
das Feld `quelle:`, weil es dort in Prosa steht und mit nichts kollidiert.

Der Zweck bleibt der aus 098: Prüfungen mit Herkunft `entscheidung`
zementieren Beschlossenes und entdecken nichts. Wächst diese Kategorie
schneller als die entdeckenden, hält die Suite nur noch fest, was gebaut
wurde.

---

## Punkt 4 — Der Klausel-Test steht an einer Stelle, nicht in jeder Datei

**Befund.** Der Klausel-Test steht wortgleich in beiden Testdateien, fünfzehn
Zeilen kopiert. Jede weitere gebundene Prüfung kopiert ihn mit.

Dazu ein zweiter Befund an derselben Stelle. Die Dateisuche im Klausel-Test
(`f.indexOf(ADR) === 0 || f.indexOf('vivodepot-' + ADR) === 0`) nimmt über
`.find()` den **ersten** Treffer. Schritt A hat gemessen: Das Muster ist heute
für genau drei ADR-Nummern mehrdeutig — **062, 077 und 089**, alle mit
Nachtrag. Verschärfend kommt hinzu, dass in allen drei Fällen die
`-nachtrag`-Datei alphabetisch **vor** der Haupt-Datei steht. Eine Bindung auf
die Haupt-Nummer läse dort also die Klausel des Nachtrags.

Für die beiden heutigen Tests ist das folgenlos: Beide binden auf 096, und zu
096 gibt es genau eine Datei. Der Fehler wartet auf die erste Bindung an eine
Nummer mit Nachtrag.

**Entscheidung.** Die Bindungsprüfung liegt an einer gemeinsamen Stelle und
wird von jeder gebundenen Testdatei mit ihren drei Konstanten aufgerufen. Die
Auflösung von der ADR-Nummer auf die Datei ist eindeutig: Ein Nachtrag wird
als solcher erkannt und nicht anstelle der Haupt-ADR geprüft.

---

## Was unverändert bleibt

Das Klausel-Format aus U2-ADR-098 — Abschnitt `## Konformität`, Block mit
`aussage/zustand/pruefung/grund/frist/bedingung/quelle`, vier Zustände — ist
nicht Gegenstand dieses Nachtrags.

Die vorhandene Bauform mit `const ADR` und `PRUEFUNGEN` wird **nicht**
ersetzt. Sie ist ausführbar und läuft heute; die Felder aus 098 sind Angaben
für einen Linter, den es noch nicht gibt. Nach dem Grundsatz, dass nur
Ausführbares trägt, ist die vorhandene Form die stärkere. Sie muss nur
halten, was sie behauptet — das ist der Gegenstand dieses Nachtrags.

---

## Nicht Teil dieser Entscheidung

- Der Bau des Linters und der gemeinsamen Bindungsprüfung.
- Die Angleichung von U2-ADR-096 und U2-ADR-090 §8 an das Format aus 098.
- Die Nachrüstung weiterer Tests mit einer Bindung.
- Die in U2-ADR-090 §3 offene Regelung von Index-Führung und Status eines
  Nachtrags.

---

## Konformität

```konformitaet
aussage:   Jeder Name in PRUEFUNGEN bezeichnet eine ausgeführte Prüfung, und
           jede gebundene Testdatei ruft die gemeinsame Bindungsprüfung mit
           ADR, HERKUNFT und PRUEFUNGEN auf.
zustand:   prüfbar
pruefung:  tests/bindung-pruefen.test.js#bindung-098-nachtrag-gemeinsame-pruefung
quelle:    invariante
```

**Eingelöst am 25.07.2026 (kiwiz-Sitzung, A2-als-Code Schritt B):** Die gemeinsame
Bindungsprüfung steht als `tests/bindung-pruefen.js` (`bindungPruefen`) und wird von
jeder neu gebundenen Testdatei aufgerufen; der Selbsttest oben belegt Punkt 1/2/4.
**Eine benannte Ausnahme:** die zwei Vor-Nachtrag-Bindungen `alt-label-register.test.js`
und `migration-keine-neuen-waisen.test.js` binden weiter im alten Format an U2-ADR-096;
ihre Umstellung erzwingt den U2-ADR-096/090-§8-Angleich und bleibt EIGENER Vorgang
(oben, „Nicht Teil dieser Entscheidung"). Der Universalitäts-Check führt sie als
`LEGACY_096`-Ausnahme, damit sie sichtbar und zählbar bleiben, statt still zu gelten.

*Dieser Nachtrag entsteht, weil eine Bindung geprüft wurde, die aussah, als
hielte sie. Die Klausel dazu ist selbst noch ungeprüft — das ist der
ehrliche Zustand, nicht ein Versäumnis.*

---

*Vivodepot GmbH · Berlin · 24.07.2026*
