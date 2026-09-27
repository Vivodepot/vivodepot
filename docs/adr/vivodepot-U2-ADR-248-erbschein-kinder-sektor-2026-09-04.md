# U2-ADR-248: Der Erbschein-Vorbereitungsauszug las `kinder` aus dem falschen Sektor — auf beiden Lesepfaden

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** KORREKTHEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-245 (Sensibel-Schranke in `logikModulPruefen`, dieselbe Nacht, dieselbe
Fixture-Datei — dieses ADR setzt auf dem dortigen `sensibelErlaubt`-Stand auf, ändert ihn nicht) ·
U2-ADR-172/U2-ADR-181 (Erbschein als echtes `logikModul`) · U2-ADR-243 (Betriebssatz-Feldsatz —
derselbe Referenzdepot-Bau, der diesen Befund auslöste, s. u.)
**Anker:** Auftrag, Nacht 03./04.09.2026 — Nebenfund beim Bau von
`Referenzdepot-Modul-Template-2026-09-04.vivodepot`.
**Status heute:** gilt — Beleg `tests/vorlagen-sprache-interpreter.test.js#[Daten]`,
`tests/erbschein-modul-mechanik.test.js`, `tests/siebtes-register-erbschein-byte-gleichheit.test.js`,
`tests/e2e/erbschein-vorbereitungsauszug-abnahme.spec.js`.

---

## Wie der Befund entstand — das ist Teil der Begründung, nicht nur die Historie

Kein Test hat diesen Fehler gefunden. Keine Liste führte ihn. Er fiel auf, weil zum ersten Mal
jemand ein zweites Referenzdepot baute — eines mit einem echten angedockten Modul (Pro,
U2-ADR-243) UND einem echten geladenen Template (Erbschein), breit befüllt, wie ein Depot aus
dem Feld. Das erste Referenzdepot (03.09.2026) hatte genau das bewusst ausgelassen: „kein
angedocktes Fremdmodul — bräuchte ein signiertes Template + UI-Weg, außerhalb des Umfangs eines
Node-Skripts". Beim Bau des zweiten wurde der Erbschein-Auszug zum ersten Mal gegen ein
Referenzdepot mit tatsächlich befüllten `meine-menschen.kinder`-Daten gerendert — und die Spalte
„Kinder/Abkömmlinge" blieb leer, obwohl das Depot ein Kind trug.

**Das ist die eigentliche Rechtfertigung dafür, dass es das zweite Referenzdepot überhaupt gab:**
ein Depot, das nur die dreizehn Bürger-Bereiche befüllt (wie das erste), prüft nie, ob ein
angedocktes Modul oder ein geladenes Template die eigenen, bereits vorhandenen Feld-Referenzen
korrekt auflöst — dafür muss eines existieren, das beides wirklich trägt.

## Kontext

### Der Befund

`kinder` ist ein Feld des Sektors `meine-menschen`, nicht `identitaet` — geprüft über
`feldDefFuer('meine-menschen','kinder')` UND, wichtiger, am echten Geburts-Wizard gemessen
(`tests/e2e/gebwiz-kind-abnahme.spec.js`, unverändert grün seit 11.08.2026: `data.sektoren
['meine-menschen'].kinder` nach einem echten Klickweg). Der Erbschein-Vorbereitungsauszug
(`tests/fixtures/erbschein-vorbereitung-logikmodul.json`) referenzierte `kinder_namen` bislang mit
`{ "sektor": "identitaet", "feld": "kinder" }` — der falsche Sektor.

**Zwei unabhängige Lesepfade, gleichermaßen falsch:** Erbschein hat SEIT dem 27.08.2026-Umbau
(feste `ERBSCHEIN_MODUL`-Verdrahtung → echtes eingelassenes Bundle) zwei getrennte
Implementierungen, die je einen Ausgabeweg bedienen:
- **PDF/HTML** über `_logikModulGenerator`/`datenSchemaLesen` — liest die `datenSchema`-Deklaration
  des Bundles selbst.
- **XML** über die separat verdrahtete Kern-Funktion `_erbscheinSektorDaten()`
  (`vivodepot.html`) — HARTCODIERT denselben falschen Sektor (`identitaet.kinder`), unabhängig
  vom Bundle.

Ein Code-Kommentar an beiden Stellen behauptete „dieselbe Datenquelle … kein zweiter Lesepfad" —
das stimmte nie strukturell (zwei getrennte Implementierungen), stimmte aber IM ERGEBNIS,
solange beide denselben falschen Sektor nannten. Das ist der eigentliche Grund, warum der Fehler
so lange unentdeckt blieb: **zwei falsche Antworten, die übereinstimmen, sehen aus wie eine
richtige.** Ein bereits bestehender Äquivalenztest
(`tests/vorlagen-sprache-interpreter.test.js#[Daten] das volle Erbschein-Schema …`, aus
U2-ADR-245-Vorarbeit) prüfte GENAU diese Übereinstimmung — mit `assert.deepEqual` zwischen den
beiden Lesewegen, aber ohne eine eigene Positivbehauptung über den tatsächlichen Wert. Zwei
gleich falsche leere Arrays sind einander auch gleich; die Probe konnte den Fehler strukturell
nicht fangen.

### Auswirkung

Für jede Bürgerin mit Kindern, die den Erbschein-Vorbereitungsauszug öffnet: die Frage
„Kinder/Abkömmlinge (erste Generation)?" zeigt „— nicht erfasst —", obwohl das Depot die Angabe
längst trägt. Dieselbe Auslassung im XML-Export (`<kinder/>`, leer statt gefüllt). Kein
Rand­fall — jedes Depot mit mindestens einem eingetragenen Kind ist betroffen.

## Die verallgemeinerbare Lehre — eine Probe, die zwei Seiten gegeneinander hält, prüft Übereinstimmung, nicht Richtigkeit

**Das ist der eigentlich schwere Teil dieses Befunds, schwerer als der Sektor-Fehler selbst.**
Sieben Fundstellen trugen dieselbe eingebettete Annahme (`identitaet` statt `meine-menschen`):
beide Fixtures (DE/EN), der Kern (`_erbscheinSektorDaten()`), drei Unit-Test-Dateien — und ein
**echter End-to-End-Klickweg**, `tests/e2e/erbschein-vorbereitungsauszug-abnahme.spec.js`, der
über die reale UI ein Kind anlegt, den Auszug öffnet und den Namen im gerenderten Blatt sucht.
Diese Probe lief GRÜN. Nicht weil sie nichts prüfte — sie prüfte tatsächlich, dass der Name
erscheint —, sondern weil ihr EIGENER Testaufbau die Kind-Daten an derselben falschen Stelle
(`data.sektoren.identitaet.kinder`) ablegte wie der Fehler sie erwartete. **Der Fehler hatte
sich seine eigene Bestätigung mitgebracht.**

Dieselbe Figur, unabhängig davon, ein zweites Mal: `tests/vorlagen-sprache-interpreter.test.js`s
Äquivalenzprobe (aus der U2-ADR-245-Vorarbeit) hielt den PDF-Lesepfad (`datenSchemaLesen`) gegen
den XML-Lesepfad (`_erbscheinSektorDaten()`) und verlangte `assert.deepEqual`. Sie bestand — weil
BEIDE Seiten denselben falschen Sektor nannten und darum beide dasselbe (leere) Ergebnis
lieferten. **Zwei gleich falsche Antworten sind einander gleich.** Ein Vergleich zweier Seiten
kann diese Klasse Fehler grundsätzlich nicht fangen, gleich wie oft er läuft.

**Das ist die gefährlichste Klasse von Testfehler, die es gibt — gefährlicher als eine fehlende
Probe.** Eine fehlende Probe fällt irgendwann auf (niemand prüft, jemand fragt „ist das
getestet?"). Eine Probe, die auf beiden Seiten dieselbe falsche Annahme trägt, sieht aus wie
Deckung, ist aber Blindheit — und sie hätte diesen Fehler auf unabsehbare Zeit geschützt, jeden
künftigen Refactor abgesegnet, jede Regression-Suite grün gehalten. Sie meldet sich nie von
selbst, weil aus ihrer eigenen Sicht nichts fehlt.

**Die Lehre, verallgemeinert:** Wo eine Probe ausschließlich zwei (oder mehr) Implementierungen,
Lesepfade oder Darstellungen GEGENEINANDER hält (`assert.deepEqual(a, b)`, ein Klickweg, dessen
eigener Testaufbau und dessen Erwartung aus derselben — möglicherweise falschen — Quelle
stammen), beweist ein Grün nur WIDERSPRUCHSFREIHEIT, nie RICHTIGKEIT. Es braucht mindestens
EINE Stelle in der Probenkette, die einen echten, unabhängig hergeleiteten Wert behauptet —
`assert.deepEqual(kinder_namen, ['Tochter Beispiel'])`, nicht nur `assert.deepEqual(a, b)`. Der
Unterschied: eine Positivbehauptung kann nicht mit dem Fehler mitwandern, weil sie ihn nicht
kennt; ein Seitenvergleich wandert immer mit, wenn beide Seiten aus derselben (falschen) Annahme
gebaut sind. Dieser ADR hat der Äquivalenzprobe genau diese fehlende Positivbehauptung
nachgerüstet (s. Entscheidung 3) — nicht als Zusatz, sondern als das, was sie eigentlich hätte
tragen müssen, seit sie existiert.

**Dazu gehört auch, dass ein Code-Kommentar eine falsche Zusicherung nicht folgenlos tragen
darf.** Die beiden „dieselbe Datenquelle … kein zweiter Lesepfad"-Kommentare (s. u.) hielten den
Widerspruch für unmöglich erklärt, statt ihn messbar zu halten — eine falsche Zusicherung im
Code ist schlimmer als keine, weil sie den nächsten Leser aktiv davon abhält, nachzusehen. Beide
sind in diesem Commit korrigiert.

## Entscheidung

**1 — Der Sektor wird an BEIDEN Stellen korrigiert**, in einem Commit, nicht getrennt (die
Äquivalenzprobe hätte sonst zwischenzeitlich echt divergierende, nicht nur zufällig
übereinstimmende Werte verglichen und wäre zu Recht rot geworden):
- `tests/fixtures/erbschein-vorbereitung-logikmodul.json` UND die EN-Fassung
  (`…-mechanik-en.json`): `datenSchema.kinder_namen.sektor` von `identitaet` auf
  `meine-menschen`.
- `vivodepot.html`, `_erbscheinSektorDaten()`: liest `data.sektoren['meine-menschen'].kinder`
  statt `data.sektoren.identitaet.kinder`.

**2 — Der stale Kommentar wird an beiden Fundstellen korrigiert** (`vivodepot.html`,
`tests/erbschein-modul-mechanik.test.js`) — er behauptet jetzt korrekt: zwei getrennte
Lesepfade, durch einen expliziten Test gleichgehalten, nicht durch gemeinsamen Code. Eine falsche
Zusicherung im Kommentar ist schlimmer als keine.

**3 — Die Äquivalenzprobe bekommt eine echte Positivbehauptung dazu**, nicht nur die
gegenseitige `deepEqual`: `assert.deepEqual(ausSchema.kinder_namen, ['Tochter Beispiel'])` und
dasselbe für `_erbscheinSektorDaten()` — der Rot-Beweis-Gegenstoß, den die reine
Übereinstimmungsprobe nicht leisten konnte.

**4 — Alle Bestandstests, die `kinder` unter `identitaet` in ihrer eigenen Testdaten-Aufbau
setzten** (`tests/erbschein-modul-mechanik.test.js`, drei Stellen;
`tests/siebtes-register-erbschein-byte-gleichheit.test.js`;
`tests/e2e/erbschein-vorbereitungsauszug-abnahme.spec.js`, echter Klickweg), wandern auf
`meine-menschen` — sie testeten sonst weiterhin den (jetzt behobenen) Fehlerzustand, nicht den
Kern.

## Ausdrücklich nicht behandelt

**Keine Migration bestehender Depot-Daten** — `kinder` selbst hat seinen Sektor nie gewechselt,
nur die Erbschein-`datenSchema`-Referenz DARAUF war falsch adressiert. Kein Depot-Feld ändert
sich, keine Schema-Version-Migration nötig.

**Keine Prüfung, ob weitere `logikModul`-Bundles (künftige, fremde) denselben Sektor-Fehler
tragen könnten** — außerhalb des Umfangs: die Sensibel-Schranke (U2-ADR-245) prüft Struktur/
Berechtigung, nicht inhaltliche Sektor-Korrektheit einer fremden `datenSchema`-Deklaration, und
das bleibt so. Ein fremder Herausgeber, der `sektor`/`feld` falsch benennt, bekommt weiterhin nur
eine leere Angabe, keinen Absturz — dieselbe Behandlung wie ein Depot ohne die Angabe.

## Konsequenzen

Der Erbschein-Vorbereitungsauszug zeigt Kinder/Abkömmlinge jetzt korrekt, auf beiden
Ausgabewegen (PDF/HTML und XML), geprüft am echten Geburts-Wizard-Weg UND an einer Probe mit
echtem Wert statt nur gegenseitiger Übereinstimmung. Der Befund selbst ist der Beleg für den
Wert eines Referenzdepots, das ein echtes Modul UND ein echtes Template trägt — ein Depot, das
nur die Bürger-Bereiche befüllt, hätte ihn nie gezeigt.

## Konformität

```konformitaet
aussage:  _erbscheinSektorDaten() liest `kinder` aus dem Sektor 'meine-menschen', nicht
          'identitaet'.
zustand:  geprüft
herkunft: invariante
pruefung: tests/erbschein-modul-mechanik.test.js#[Erbschein-Daten] volles Depot: jedes Feld liest den echten Depot-Wert
```

```konformitaet
aussage:  Die Erbschein-Fixture (datenSchema.kinder_namen) referenziert 'meine-menschen', nicht
          'identitaet' — beide Lesepfade (datenSchemaLesen für PDF/HTML, _erbscheinSektorDaten
          für XML) liefern denselben, korrekten Namen, nicht nur untereinander gleiche leere
          Arrays.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vorlagen-sprache-interpreter.test.js#[Daten] das volle Erbschein-Schema, gegen dasselbe Depot wie der bestehende Bestandstest, liefert dieselben Werte wie _erbscheinSektorDaten()
```

```konformitaet
aussage:  Über den echten Klickweg (Fremdmodul-Einlass, Depot mit einem Kind) zeigt der
          Erbschein-Vorbereitungsauszug den Kindesnamen im Klartext.
zustand:  geprüft
herkunft: invariante
pruefung: tests/e2e/erbschein-vorbereitungsauszug-abnahme.spec.js#volles Depot: Testament, Familienstand und Kind erscheinen im Auszug in Klartext
```

---

*Vivodepot GmbH · Berlin · 04.09.2026*
