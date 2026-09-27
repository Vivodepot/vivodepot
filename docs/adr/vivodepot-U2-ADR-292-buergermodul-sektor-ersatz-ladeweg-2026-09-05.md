# U2-ADR-292 · Der Ladeweg auf die Erste-Partei-Zone — Struktur ersetzbar, alle dreizehn Sektoren bewiesen

**Datum:** 05.09.2026
**Status:** gebaut, acht Proben grün, davon zwei Rot-Beweise und eine Sicherheitsprobe
**Status heute:** gilt, für die gesamte Struktur-Achse (alle dreizehn nativen Sektoren) bewiesen —
kein achsen-neutraler Ladeweg (Sprache/Recht/Branding bleiben eigene Bau-Stränge)
**Bezug:** U2-ADR-282 (die Erste-Partei-Zone, hier zum ersten Mal aufgerufen — vorher „absichtlich
unverdrahtet"), U2-ADR-285 ('de'-Ladeweg, dieselbe Grundform unabhängig gebaut), U2-ADR-253
(Schritt HERAUSNEHMEN)

---

## 1 · Der Befund, den dieser ADR schließt

`erstePartieFeldDefsPruefen` (U2-ADR-282) prüfte seit ihrem Bau gegen niemanden — kein Aufrufer
existierte. Der Grund, den ADR-282 selbst nennt: *„Es gibt noch keinen Ladeweg für ein eigenes
Inhaltsmodul."* Gleichzeitig gilt: `SEKTOREN` ist `const` + `Object.freeze`, und
`data.feldDefinitionen[]` — der einzige bestehende Feld-Weg — gehört der einzelnen Bürgerin, nicht
einem Modul (eigene Messung, `bereich-modul-feldstruktur-entwurf-2026-09-05.md`).

**Gemessen, nicht angenommen:** `Object.freeze(SEKTOREN)` sperrt nur die ÄUSSERE Array-Ebene.
Jedes Sektor-Objekt und sein `.sektionen` bleiben mutierbar — `Object.isFrozen(SEKTOREN[i])` und
`Object.isFrozen(SEKTOREN[i].sektionen)` liefern beide `false`. Der native Bestand lässt sich
darum in-place ersetzen, ohne die `const`/`Object.freeze`-Form selbst anzutasten.

---

## 2 · Die Entscheidung

**Zwei neue Funktionen, unmittelbar neben `erstePartieFeldDefsPruefen`:**

- **`_erstePartieErlaubteIdsFuerSektor(sektorId)`** — baut die Erlaubnisliste ausschließlich aus
  dem AKTUELLEN nativen Bestand des Sektors (`sektorId.feldId` für jedes Top-Level-Feld und jedes
  UnterFeld). **Nie aus dem einzulassenden Modul** — 03s Befund zu U2-ADR-282 wörtlich übernommen:
  „die Aufrufstelle ist die Grenze, kein Nachweis am Modul"; eine Erlaubnisliste aus der Datei
  selbst prüfte eine Behauptung gegen sich selbst.
- **`buergermodulSektorErsetzen(sektorId, moduleDefs)`** — ruft `erstePartieFeldDefsPruefen` mit
  dieser Erlaubnisliste auf, gruppiert die angenommenen Definitionen nach Sektion (`sektionId`,
  Form von 03s Erzeuger: `{sektorId, sektionId, feldId, unterVon, feld}`), hängt UnterFelder an
  ihr Trägerfeld (`unterVon`) statt sie als eigene Sektions-Einträge zu zählen, und **ersetzt**
  `SEKTOR_BY_ID[sektorId].sektionen` komplett — Sektions-Reihenfolge und -Kennung bleiben nativ,
  nur der FELD-Inhalt kommt aus dem Modul. Abschließend derselbe `_textsatzAufSektorenAnwenden`-
  Lauf wie beim ursprünglichen Bau: reasserted native Kennungen finden ihre Beschriftung über
  denselben `sektorId.feldId`-Schlüssel automatisch — kein zweiter Textsatz-Weg nötig.

**Außerhalb des Import-Weges, wie die Zone selbst.** Kein `importAnwenden`/`modulEinlassen`
erreicht diese Funktionen — dieselbe Ratsche (`tests/erste-partei-zone.test.js`) gilt unverändert.

---

## 3 · Der Beweis — E1 (`vermoegen`, ausführlich) und E2 (alle dreizehn, systematisch)

**Der Maßstab, wörtlich:** *„Am Ende möchte ich ‚mein' Bürgerdepot haben. Als
wäre nichts gewesen."* Geprüft wurde darum NICHT die Datenstruktur (`JSON.stringify`-Vergleich —
versucht, verworfen: `_TEXTSATZ_FUELLEN` fügt `label` an unterschiedlicher Schlüssel-Position ein,
je nachdem ob ein Feld neu gebaut oder original ist — inhaltlich gleich, `JSON.stringify`-ungleich,
ein Fehlschluss als Prüfstein), sondern das ECHTE gerenderte HTML (`renderSektor`, DOM-Inhalt).

**`tests/buergermodul-sektor-ersetzen.test.js`, acht Proben:**

**E1 — `vermoegen`, ausführlich, mit Erzählung:**
1. Beide neuen Funktionen sind exportiert.
2. **Byte-identisches Rendering:** `vermoegen`s sieben Felder aus dem nativen Bestand selbst als
   Modul-Definitionen zurückgereicht, durch `buergermodulSektorErsetzen` ersetzt — `renderSektor`s
   DOM-Inhalt ist danach ZEICHENGLEICH mit dem unveränderten nativen Rendering. 0 Verwerfungen.
3. **Rot-Beweis:** ein Feld (`wohnsituation`) aus den Modul-Definitionen weggelassen — sein
   `data-feld="wohnsituation"` fehlt danach wirklich im gerenderten HTML, ein Nachbarfeld
   (`weitere_einkommensarten`) bleibt unberührt, das HTML wird messbar kürzer.
4. **Sicherheitsprobe:** ein Modul, das zusätzlich das FREMDE Feld `identitaet.vorname` behauptet
   (nicht Teil von `vermoegen`), bekommt es nicht — `grund: 'nicht-erlaubt'`, nicht im Rendering.
5. Ein unbekannter Sektor wird benannt (`unbekannter-sektor`), nicht stillschweigend übergangen.
6. Die Erlaubnisliste selbst deckt exakt Top-Level- und UnterFelder des nativen Bestands, nichts
   von einem fremden Sektor.

**E2 — alle dreizehn nativen Sektoren, systematisch (nach `vermoegen`/`mobilitaet`/
`wohnen` einzeln geprüft: „das ist das Signal, dass die übrigen zehn Wiederholung sind, keine
neue Unbekannte. Bau sie durch."):**

7. **Sammelprobe:** jeder der dreizehn nativen Sektoren (`identitaet` … `persoenliches`, inklusive
   `identitaet`/`meine-menschen` mit Merkmalen/Rollen, `wohnen` mit acht `sichtbarWenn`,
   `vorsorge` mit zweiundsiebzig UnterFeldern) — aus dem eigenen nativen Bestand als Modul-Defs
   zurückgereicht, ersetzt, `renderSektor`-Ausgabe geprüft. **Ergebnis: alle dreizehn
   byte-identisch, null Verwerfungen, keine Ausnahme gefunden.** Kein Sektor brauchte einen
   Sonderfall in `buergermodulSektorErsetzen` selbst — dieselbe Funktion, ungeändert seit E1.
8. **Rot-Beweis der Sammelprobe:** ein Feld aus `krisenvorsorge` weggelassen — das gerenderte HTML
   weicht wirklich ab. Beweist, dass Probe 7 einen echten Unterschied gefunden hätte, wäre einer
   dagewesen — sie ist scharf, nicht zufällig grün.

---

## 4 · Wofür das NICHT reicht — ausdrücklich, gegen die spätere Ausbaustufe gemessen

**Ein Sektor, eine Achse.** Bewiesen ist die STRUKTUR-Achse (`vermoegen`), nicht die anderen
zwölf Sektoren, nicht die Sprache-, Recht- oder Branding-Achse. Während dieses Baus wurde
präzisiert: *„alles ist modular"* — kein Inhalt privilegiert, EIN Ladeweg für jede Achse,
keine Fallunterscheidung im Kern, welche Achse gerade lädt. **Das erfüllt dieser ADR nicht.**
`buergermodulSektorErsetzen` ist an die Sektor/Sektionen-Form gebunden (die Form der
Struktur-Achse) — ob dieselbe Funktionsform für Sprache (`TEXTSATZ_EINGEBAUT`), Recht
(`RECHTSRAUM_KATALOG`) oder Branding trägt, ist ungeprüft, vermutlich nein ohne eigene Anpassung.

**Nicht gelöst, benannt statt verschwiegen:**
- Der tatsächliche Ab-Werk-Seed (Abschnitt 6) — die Proben reichen native Felder direkt als JS-
  Objekte durch, nicht über einen echten Boot-Aufruf. Das ist jetzt ein eigener, in Arbeit
  befindlicher Bau, nicht mehr offen im Sinn von „ungeklärt": Abschnitt 6 hält fest, WARUM der
  Weg über `modulEinlassen` ausscheidet und welcher Weg stattdessen gilt.
- Sprach-Tausch ohne Datenverlust (zweite Anforderung: `laden(Struktur,Recht,de)` dann
  `de`→`en` tauschen, gleiche Werte) — nicht gebaut, nicht geprüft in diesem ADR.
- Die native Sicherheitsprüfung `_feldDef`/Kern-Kollision läuft für den Ersatz-Weg nicht separat —
  sie ist strukturell überflüssig, weil die Erlaubnisliste selbst aus dem nativen Bestand kommt
  (ein Feld kann sich nur selbst erlauben), aber das ist eine Folgerung, kein gemessener Beleg.
- Alle dreizehn Sektoren wurden GEGEN SICH SELBST geprüft (der native Bestand als eigenes Modul
  zurückgereicht) — nicht gegen ein Modul, das absichtlich WENIGER oder ANDERS strukturierten
  Inhalt bringt (außer dem einen Rot-Beweis-Feld je Sammelprobe). Ob ein Sektor mit z. B. nur
  DREI seiner heute zehn Felder — ein realistischer Berufsverbands-Fall — sauber rendert, ist
  plausibel (dieselbe Mechanik wie der Rot-Beweis), aber nicht einzeln durchgespielt.

---

## 6 · Der Ab-Werk-Weg — Gerüst statt Einlass, und warum (Nachtrag 05.09.2026)

**Der naheliegende Weg — das Bündel signiert über `modulEinlassen`/`bereichsModulPruefen`
einlassen, wie der Erbschein-Vorbereitungsauszug (U2-ADR-288) es für ein einzelnes Modul tut —
scheidet für die Struktur-Achse aus. Gemessen, nicht abgewogen (eigene Sitzung,
unabhängig gegengeprüft):**

```
'bereichsModule' steht in VOLLEXPORT_STRUKTURELL_SCHLUESSEL (vivodepot.html:19846)
                 -> reist mit JEDEM Vollexport und JEDEM Umzug mit
leeres Depot heute:      1.046 Byte, 47 Schlüssel
Struktur-Bündel:        77.000 Byte minifiziert
Faktor 42–74 — und der Zuwachs ist nicht Inhalt der Bürgerin, sondern eine Kopie des Gerüsts.
```

**Das verletzt den Maßstab wörtlich.** Die Bürgerin trägt die Struktur heute NICHT in ihrer
Depot-Datei — die liegt im Kern. Über den Einlassweg würde sie es an Dateigröße, Vollexport und
Umzug bemerken. „Als wäre nichts gewesen" verlangt, dass genau das nicht passiert.

**Der gewählte Weg: der GERÜST-Weg.** `SEKTOR_BY_ID[sektorId].sektionen` wird beim Booten direkt
aus dem eingebetteten Bündel befüllt (`buergermodulSektorErsetzen`, Abschnitt 2) — **im Speicher,
nie in `data`.** Keine Datei-Spur, kein `moduleVersion`-Eintrag, keine Sichtbarkeit „ein Modul
wurde geladen". Das ist keine Lücke, sondern die Konsequenz der Trennung nach HERKUNFT statt nach
Berechtigung:

```
Gerüst-Weg   das Mitgelieferte, aus dem Kern, im Speicher   -> keine Datei-Spur (richtig so)
Einlassweg   das Fremde, additiv, reserviert-geschützt      -> sichtbar, mit Herkunft (richtig so)
```

Sichtbarkeit ist für FREMDES da — jemand anderes hat beigesteuert, die Bürgerin soll das erkennen
können. Für mitgelieferten Inhalt gibt es nichts offenzulegen: es ist das Produkt, das sie
heruntergeladen hat. Ein „Vivodepot hat Ihnen dreizehn Bereiche eingelassen"-Eintrag wäre nicht
mehr Transparenz, sondern weniger — er stellte den Grundbestand neben eine fremde Akte.

**Ein struktureller Vorteil dieses Weges, kein Nebeneffekt:** keine Fassungs-Drift. Der Inhalt
kommt bei JEDEM Boot frisch aus dem Kern, nie aus einer beim Einlass eingefrorenen Kopie in
`data`. Eine Verbesserung am Bündel (Tippfehler, ein präziserer Hinweistext, ein neues Feld)
erreicht jede Bürgerin mit dem nächsten App-Update automatisch — kein `moduleVersion`-Bump, keine
stille Altfassung, die irgendwo hängen bleibt, wie es beim Einlassweg strukturell möglich wäre.

**Zwei Bedingungen waren offen, bevor der Seed-Aufruf stand — beide in einer eigenen
Sitzung geklärt, keine offen mehr:**
1. **Boot-Reihenfolge** gegenüber `_bereichsModuleAusDepotAnmelden()`. Erledigt sich von selbst:
   der Gerüst-Weg rührt `data` nie an, er läuft beim Booten des Kerns, lange bevor irgendein
   Depot existiert oder ein Fremdmodul andockt. Es gibt keine zwei Schreiber auf denselben
   Zustand, also keine Reihenfolge zu klären.
2. **Alt-Depots mit `bereichsModule` unter nativer ID.** Heute durch die Bereichs-ID-Reservierung
   ausgeschlossen — und das bleibt auch bei künftiger Lockerung tragfähig, weil der native
   Bestand bei JEDEM Öffnen neu aus dem Kern gezogen wird, nicht nur beim Import. Ein Alt-Depot
   bekäme den Konflikt bei jedem Boot neu vorgelegt, nicht einmalig beim Import unbemerkt
   durchgereicht.

**E4 gelandet:** das Bündel selbst trägt jetzt den echten Bestand (13 Bereiche, 266 Felder,
182 UnterFelder, Sprache entfernt, über Textsatz wiederhergestellt) statt eines leeren
Platzhalters — `_BUERGERMODUL_BUENDEL_BERICHT` bestätigt `angewandt: true`, `verworfen: []`.

---

## 7 · An Ort und Stelle, nicht ersetzt — die Objekt-Identität (Nachtrag 05.09.2026)

**Byte-identisches Rendering (Abschnitt 3) beweist NICHT dasselbe wie Objekt-Identität.** Als das
Bündel erstmals echten Inhalt trug (statt `null`), wurde die volle Suite an genau der Stelle rot,
an der Rendering blind ist: zwei Proben, die prüfen, dass ein WIZARDS-Schrittfeld und das
zugehörige Sektorfeld DASSELBE Objekt sind, nicht nur inhaltsgleiche Kopien
(`textsatz-vollstaendigkeit-optionslabel.test.js`, `pvwiz-inhalt-besprochen.test.js`).

**Ursache, gemessen:** `const WIZARDS = Object.freeze(_textsatzAufWizardsAnwenden([...]))`
(`vivodepot.html:16206`) ruft `_katalogOptionen(...)` INLINE im Array-Literal — das läuft bei der
SKRIPT-AUSWERTUNG, lange bevor `buergermodulSektorErsetzen` je aufgerufen wird, und nimmt dabei
eine Referenz auf das damals aktuelle native Feld-/Options-Objekt. Der ursprüngliche Ladeweg baute
bei jedem Aufruf NEUE, inhaltsgleiche Objekte und ersetzte `sektor.sektionen` damit wholesale —
unsichtbar fürs Rendering, aber WIZARDS' vorher gezogene Referenz zeigte danach ins Leere.

**Die Lösung ist kleiner als der erste Gedanke** (gemessen: `Object.freeze(SEKTOREN)` ist
flach, jedes Objekt darunter bleibt veränderlich — bis auf die äußere Liste ist NICHTS eingefroren).
`buergermodulSektorErsetzen` gleicht seither BESTEHENDE Objekte an Ort und Stelle an, statt sie
durch neue zu ersetzen — Sektor-, Feld- und Options-Objekte bleiben dieselbe Referenz, nur ihre
Eigenschaften ändern sich. Damit bricht die Identität gar nicht erst; kein Umbau an WIZARDS, kein
zweiter Aufrufer, `03`s Ratsche (genau ein Aufrufer) bleibt unberührt.

**Die gefährliche Hälfte ist das Entfernen, nicht das Überschreiben** (`03`s Befund): ein bloßes
`Object.assign(ziel, modul)` ließe Alt-Eigenschaften stehen, die das Modul-Feld nicht mehr trägt —
`sensibel`, `codeListe`, `verborgenWenn` sind genau die Sorte, die niemand bemerkt, bis sie in
einem Export fehlt oder fälschlich greift. `_feldObjektAngleichen` löscht darum jede Eigenschaft
des Ziels, die die Quelle nicht (mehr) hat, bevor es die Quelle überträgt — mit eigenen Roten
Proben (`tests/buergermodul-sektor-ersetzen.test.js`, „·Identität·ROT"): eine gestrichene
`sensibel`-Eigenschaft, ein von vier auf drei geschrumpftes `unterFelder`.

**Optionen bekommen dieselbe Behandlung, eine Ebene tiefer** — nötig, weil `_katalogOptionen`
(`vivodepot.html:16189`) sich uneinheitlich verhält, ausgezählt (unabhängig von mir und
`03` nachgemessen, 8/8 übereinstimmend):

```
ohne erlaubteWerte-Filter (6)   dieselbe Array-Referenz wie feld.optionen
mit erlaubteWerte-Filter  (2)   ein NEUES, gefiltertes Array — identitaet.familienstand,
                                 identitaet.steuerklasse
```

Ein neues Array bricht nichts, WENN seine Elemente (die einzelnen Options-Objekte) dieselben
Referenzen bleiben — `.filter()` klont keine Elemente. `_optionenArrayAngleichen` hält darum die
`optionen`-ARRAY-Instanz selbst fest (`length=0`+`push`, nie Neuzuweisung, für die sechs
unfilterten Fälle) UND jedes bestehende Options-Objekt einzeln (nach `wert` gefunden, an Ort und
Stelle angeglichen, für alle acht Fälle inklusive der zwei gefilterten).

**Benannt, seither behoben (U2-ADR-311) — die zwei gefilterten Fälle filtern jetzt beim Lesen
statt beim Binden (`get optionen()`), kein Schnappschuss mehr.** Ursprünglicher Befund, hier stehen
gelassen als Beleg der Herleitung: die zwei gefilterten
Fälle ziehen ihr Array EINMALIG, bei der Skript-Auswertung. Ein künftiges Modul, das für
`familienstand` oder `steuerklasse` einen wirklich NEUEN Optionswert einführt (nicht nur einen
bestehenden ändert), erreicht die schon gebundenen Assistenten damit nicht — das gefilterte Array
kennt nur die Werte, die beim Booten schon da waren. Für die Struktur-Achse (E4, native Werte
gegen sich selbst) ist das unschädlich; es ist die Grenze, an der ein künftiges FREMDES
Struktur-Modul mit neuen Optionswerten anstoßen würde.

**Zwei weitere Fehler fand erst die VOLLE Suite, nicht die gezielten Proben** — beide, weil
`buergermodulBuendelAnwenden` EAGER bei jedem `ladeKern()` läuft und darum JEDEN Test trifft, der
irgendeinen Sektor rendert, nicht nur die ADR-292-eigenen:

1. **Ein UnterFeld darf denselben Bezeichner tragen wie ein TOP-LEVEL-Feld eines ANDEREN Elternfelds**
   — real angetroffen: `vermieter` ist eigenes Sektorfeld in `wohnen`/`wohnen-haupt` UND UnterFeld
   von `weitere_wohnungen` in `wohnen`/`wohnen-zweit` (ein Zweitwohnsitz spiegelt dieselben
   Feldnamen). Eine einzige flache Landkarte über den ganzen Sektor (Kennung → Objekt, ohne
   Eltern-Bezug) verwechselte die zwei und glich das FALSCHE Objekt an: `sichtbarWenn` verschwand
   spurlos vom TOP-LEVEL-Feld, ein fremdes Feld erschien an seiner Rendering-Stelle
   (`render-charakterisierung.test.js`, „Zustand BEFÜLLT" ging rot). Behoben durch zwei GETRENNTE
   Landkarten — Top-Level nach Kennung, UnterFeld nach `Elternkennung + eigene Kennung` — plus eine
   Rote Probe, die exakt diesen Fall mit denselben zwei echten Feldern festhält.
2. **Ein Feld ohne jede Option bekam nach dem Angleichen ein fremdes `optionen: []`** —
   `_optionenArrayAngleichen` legte die Eigenschaft unbedingt an, auch wenn weder das native noch
   das Modul-Feld je eine `optionen`-Eigenschaft hatte. Behoben: die Funktion tut nichts, wenn
   BEIDE Seiten keine Optionen kennen.
3. **Der Erzeuger selbst maß gegen einen bereits veränderten Bestand** — `tools/vd-privat-struktur-
   bundle-erzeugen.js` lud `vivodepot.html` über den gewöhnlichen `ladeKern()`, der
   `buergermodulBuendelAnwenden` beim Laden EAGER mitlaufen lässt. Ein bereits eingebettetes (und im
   Zweifel fehlerhaftes) Bündel wurde damit als „nativ" für die NÄCHSTE Erzeugung genommen — ein
   Fehler hätte sich bei jedem erneuten Lauf fortgeschrieben statt behoben. Konkret betraf das einen
   LEEREN `beispiel`-Wert (`meine-menschen.kinder/anmerkung`, kein Textsatz-Schlüssel für leere
   Strings), der beim zweiten Erzeugen endgültig verschwunden wäre. Behoben: der Erzeuger lädt jetzt
   IMMER über eine Kopie mit auf `null` gesetztem Bündel-Slot (`ladeKernPristin`), nie über die reale
   Datei direkt — unabhängig davon, was dort gerade eingebettet ist.

Alle drei mit eigenen Roten Proben (`tests/buergermodul-sektor-ersetzen.test.js`,
`tools/vd-privat-struktur-bundle-erzeugen.test.js`); die volle Suite ist Zeuge Nummer eins, nicht
Zufall — sie prüft Sektoren, die mit ADR-292 nichts zu tun haben, und deckte trotzdem auf, was die
gezielten Proben (die je eigene Modul-Defs aus dem GERADE geladenen Bestand bauen, nie das
eingebettete Bündel selbst) nicht sehen konnten.

**Eine vierte Klasse, benannt statt einzeln gejagt: Mutations-gestützte Proben in einem der
dreizehn Bereiche werden vom eingebetteten Bündel unsichtbar gemacht.** Zwei bestehende
Werkzeuge pflanzen eine Ein-Zeilen-Änderung roh in `vivodepot.html`s Quelltext und prüfen, ob eine
ZWEITE Probe das über den GELADENEN Kern erkennt (`tools/inline-texte-messen.js`,
`tools/klausel-proben-schaerfe-stufe2.js`). Liegt die Pflanzung in einem der dreizehn Bereiche
(`mobilitaet`/`d_ticket`, `vorsorge`/`vorsorge_instrumente` real angetroffen), überschreibt der
eigene, VOR der Pflanzung gebaute Bündel-Stand die Pflanzung beim Laden wieder — die zweite Probe
sieht nie, was gepflanzt wurde, meldet fälschlich „unauffällig" statt „gefunden". Behoben an der
Wurzel des jeweiligen Werkzeugs: die Mutations-Kopie setzt `BUERGERMODUL_BUENDEL` zusätzlich auf
`null` (ein no-op für Pflanzungen außerhalb der dreizehn Bereiche, kein stiller Rückfall für die
anderen). **Wer künftig eine ähnliche Mutations-Probe gegen `vivodepot.html` baut, braucht
denselben Schritt, sobald die Pflanzung in einem der dreizehn Bereiche liegt** — dieselbe Grenze,
nicht mehr fallweise wiederzuentdecken.

---

## 8 · Zusammenarbeit

Gebaut in direkter Abstimmung mit einer eigenen Sitzung (Erzeuger, liefert die
`{sektorId, sektionId, feldId, unterVon, feld}`-Form, 448 Feld-Definitionen aus dem vollen
nativen Bestand bereits gemessen, später die Vollexport-Messung aus Abschnitt 6, und die
Entfernen-Hälfte des Angleichens in Abschnitt 7 präzise benannt), zwei weiteren Sitzungen
(Golden-Master-/E2E-Gegenprobe, misst unabhängig gegen dieselbe „als wäre nichts gewesen"-
Anforderung) und der parallelen Messung einer davon, welche Kern-Stellen umfallen, wenn
der native Bestand im Quelltext tatsächlich geleert wird — dieselbe WIZARDS-Bindungszeit, die
Abschnitt 7 trifft, unabhängig gefunden (U2-ADR-304). Abschnitt 7 selbst: Der flache
`Object.freeze` und die 6-zu-2-Aufteilung von `_katalogOptionen` wurden gemessen und die kleinere Lösung
(an Ort und Stelle statt verschieben) vorgeschlagen; von mir unabhängig nachgezählt, bevor sie in
diesen ADR ging.
