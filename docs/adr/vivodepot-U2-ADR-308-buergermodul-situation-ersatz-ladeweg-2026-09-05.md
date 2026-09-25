# U2-ADR-308: buergermodulSituationErsetzen — das Gegenstück zu buergermodulSektorErsetzen für die Situations-Achse

**Status:** Angenommen
**Datum:** 05.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-282 (Erste-Partei-Zone), U2-ADR-292/303 (buergermodulSektorErsetzen —
das gespiegelte Vorbild), U2-ADR-299 (Bündel-A/B-Parität, benennt die hier geschlossene
Lücke ausdrücklich), U2-ADR-301/U2-ADR-305 (situationsModulPruefen, der Einlassweg, den
dieser ADR nicht öffnet).
**Anker:** Auftrag vom 05.09.2026: „eine andere Sitzung hat sie extrahiert — 84 Felder,
0 Rückweg-Abweichungen. Was fehlt, ist der Weg zurück in den Kern."
**Status heute:** gilt — vollständig gebaut, s. Konformität.

---

## Kontext

`buergermodulSektorErsetzen` (U2-ADR-292/303) ersetzt native Sektor-Felder aus einem
Erste-Partei-Bündel, mit dem Ziel „als wäre nichts gewesen" — byte-identisches Rendering.
Für Situationen gab es kein Gegenstück; U2-ADR-299 und U2-ADR-301 benennen die Lücke
ausdrücklich als offen. Dieser ADR schließt sie.

**Zwei echte strukturelle Abweichungen vom Sektor-Vorbild wurden erst beim Nachlesen des
tatsächlichen Kern-Codes sichtbar — nicht aus der Auftragsbeschreibung übernommen:**

### 1. `bloecke` ist bei ALLEN zehn Situationen eine Getter-Eigenschaft ohne Setter

`_textsatzAufSituationenAnwenden` (vivodepot.html:10892) ersetzt `bloecke` bei jeder der
zehn nativen Situationen — nicht nur bei `todesfall-uebernahme` — durch einen Getter, der
bei Zugriff den Textsatz füllt, und hinterlegt die rohe Quelle als (konfigurierbares, aber
nicht aufzählbares) `_textsatzRoh`. `situation.bloecke = [...]` wirft darum bei jeder der
zehn. Ein zweiter Aufruf derselben Funktion verdrahtet auch nicht neu — sie erkennt
`_textsatzRoh` und füllt nur die alten Blöcke erneut (ihr eigener Kommentar: „Ein zweiter
Aufruf... würde sonst den vorigen Getter einwickeln").

Die Lösung nutzt genau diese Prüfung, statt sie zu umgehen: `bloecke`/`_textsatzRoh` sind
beide `configurable: true` angelegt.

```js
delete situation.bloecke;
delete situation._textsatzRoh;
situation.bloecke = bloecke;          // gewöhnlicher Wert, kein Zugriffs-Descriptor mehr im Weg
_textsatzAufSituationenAnwenden([situation]);   // dieselbe, bereits vorhandene Funktion
```

Kein zweiter Mechanismus — `_textsatzAufSituationenAnwenden` nimmt jetzt den „frisch"-Zweig
und verdrahtet den Getter neu über den ersetzten Bestand (gegen den echten Kern-Code
gegengeprüft, 05.09.2026 — nicht aus einer Vorlage übernommen, die von einem
delete-basierten Mechanismus ausging, den es so nicht gibt).

### 2. Ein Block-Eintrag ist eine von zwei Formen

`{quelle, feld:<string>}` (Verweis auf ein bestehendes Feld anderswo — beansprucht keine
eigene Kennung) oder `{feld:<object>}` (situationseigenes Feld — beansprucht
`situationId.feldId`). Sektoren kennen nur die zweite Form. Die Erlaubnisliste
(`_erstePartieErlaubteIdsFuerSituation`) greift darum nur bei der zweiten: ein Verweis
erzeugt keine neue Identität, es gibt nichts zu schützen.

## Entscheidung

### Wörtlicher Spiegel, mit den beiden oben genannten Anpassungen

```js
function _erstePartieErlaubteIdsFuerSituation(situationId) { /* wie _erstePartieErlaubteIdsFuerSektor,
  wandert über bloecke[].eintraege[], nur {feld:object}-Einträge beanspruchen eine Kennung */ }
function erstePartieBloeckeEintraegePruefen(situationId, bloecke, erlaubteIds, nativFeldNachId) { /* wie
  erstePartieFeldDefsPruefen, mit den zwei Eintragsformen */ }
function buergermodulSituationErsetzen(situationId, moduleBloecke) { /* wie
  buergermodulSektorErsetzen, mit dem delete-Reset statt Zuweisung */ }
```

Anders als bei Sektoren keine Flach-Transformation (`_buendelBereichZuFeldDefs`-Äquivalent)
nötig: Situationen kennen keine UnterFelder-Schachtelung, Blöcke sind bereits flach genug.

### An Ort und Stelle, nicht ersetzt — dieselbe Strategie, nicht neu erfunden

**Zwischen dem Bau und dem Landen dieses ADR landete `buergermodulSektorErsetzen` selbst
einen Nachtrag** (05.09.2026): Feld-Objekte werden seither über
`_feldObjektAngleichen`/`_optionenArrayAngleichen` an ihr BESTEHENDES natives Gegenstück
angeglichen (Alt-Eigenschaften ohne Modul-Entsprechung gelöscht, `optionen` nach `wert`
identitätswahrend zusammengeführt), nie durch ein neues Objekt ersetzt — Grund: `WIZARDS`
bindet Options-Kataloge einiger Sektor-Felder bei der Skript-Auswertung, lange bevor
`buergermodulSektorErsetzen` je läuft; ein Klon hinterließe dort eine verwaiste Referenz.

Für Situationen ist kein analoger eager-Aufrufer bekannt (gemessen: keine Konstante liest
`SITUATIONEN`/`SITUATION_BY_ID` außerhalb einer Funktion). Die Strategie wird trotzdem
übernommen, nicht neu erfunden — der ursprüngliche Entwurf dieses ADR (Klon via
`Object.assign({}, e.feld)`) wurde vor dem Landen durch einen Aufruf derselben, jetzt
bereits vorhandenen `_feldObjektAngleichen`-Funktion ersetzt: eine Landkarte der
bestehenden nativen Feld-Objekte (`nativFeldNachId`, aus dem `bloecke`-Bestand VOR jeder
Änderung gebaut) ersetzt den Klon. Ein Depot-Situations-Feld trägt zwar keine
`unterFelder` (anders als Sektoren), aber sehr wohl `optionen` (z. B. `geburt_kind_kv`) —
`_optionenArrayAngleichen` greift darum identisch.

### Sofort verdrahtet, kein unverdrahteter Zwischenstand

Anders als U2-ADR-292 (das den Ladeweg absichtlich unverdrahtet ließ, bis U2-ADR-303 den
einen Aufrufer brachte) ist `buergermodulSituationErsetzen` von Anfang an verdrahtet:
`buergermodulBuendelAnwenden` liest jetzt zusätzlich einen eigenständigen `situationen`-
Schlüssel im Bündel (gleichrangig zu `bereiche`, keine Unterordnung), unabhängig davon, ob
`bereiche` gesetzt ist. Grund: der Sektor-Mechanismus ist heute bereits verdrahtet — ein
wörtlicher Spiegel des IST-Zustands schließt die Verdrahtung mit ein, nicht nur die
ADR-292-Zwischenstufe von vor zwei Landungen. Die „genau ein Aufrufer"-Ratsche
(`tests/erste-partei-zone.test.js`) gilt darum von Anfang an, gespiegelt für
`erstePartieBloeckeEintraegePruefen`/`buergermodulSituationErsetzen`.

### `todesfall-uebernahme` bleibt ausdrücklich außer Betracht

Sein `bloecke`-Getter baut einen Block bedingt (`_kiHatDaten()`, vivodepot.html:15050) — ein
Ersatz durch eine statische Liste würde diese Bedingtheit unwiderruflich einfrieren.
Dieselbe Kategorie Grenze wie WIZARDS/U2-ADR-304: eine Funktion, die für die anderen neun
richtig ist, ist für diese eine nicht zuständig. Ein Rot-Beweis belegt: der Aufruf wirft
nicht, verliert aber den bedingten Block — benannt, nicht stillschweigend mitgebaut, nicht
gelöst.

### Der Fund, den die eigene A/B-Probe selbst gefangen hat

Ein erster Entwurf von `erstePartieBloeckeEintraegePruefen` baute den akzeptierten Block
als `{ id: blk.id, eintraege }` — genau die Sammler-Falle, vor der am 05.09.2026 (aus
einem Fund einer anderen Sitzung) gewarnt wurde: ein Block kann weitere, hier nicht aufgezählte
Eigenschaften tragen (`klappbar: true` bei fünf Blöcken der Situation `erbfall`). Die
byte-identische E2-Probe (s. Konformität) fing das selbst, beim ersten Lauf: das Rendering
wich bei `erbfall` ab — ein `<details class="situation-block">` wurde zu einem
`<div class="sektion">`. Behoben über Rest-Spread statt Namensliste
(`const { titel, hint, eintraege, ...rest } = blk`), `titel`/`hint` ausdrücklich
ausgenommen — beide sind Textsatz-Eigentum (derselbe „nur füllen, was fehlt"-Mechanismus,
der einen mitgenommenen Wert eingefroren hätte, s. oben).

## Was dieser ADR nicht ändert

Der signierte Einlassweg (`situationsModulPruefen`) bleibt unverändert verriegelt: eine
reservierte Situations-ID wird dort weiterhin mit `grund: 'reserviert'` abgewiesen,
unabhängig von der Erste-Partei-Zone — die Aufrufstelle ist die Grenze, kein Nachweis am
Modul (U2-ADR-282). `buergermodulWizardErsetzen` bleibt offen, eigener Auftrag an anderer
Stelle — dessen Textsatz-Mechanismus (`_textsatzAufWizardsAnwenden`)
läuft strukturell anders (kein Getter, kein `_textsatzRoh`-Analogon, „füllt nur, was
fehlt" direkt auf einer gewöhnlichen Eigenschaft) und übernimmt darum nicht den
delete-Reset-Schritt dieses ADRs.

## Konsequenzen

Eine Situation ohne Bündel-Eintrag sieht in jeder hier gebauten Hinsicht aus wie vor diesem
ADR. `buergermodulBuendelAnwenden` verarbeitet `bereiche` und `situationen` unabhängig
voneinander — ein reines Situationen-Bündel darf keine Bereiche anfassen, und umgekehrt.

## Konformität

```konformitaet
aussage:  buergermodulSituationErsetzen ist exportiert und für einen unbekannten
          Situations-Bezeichner benannt abgewiesen, nicht stillschweigend übergangen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308] buergermodulSituationErsetzen ist exportiert
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308] unbekannte Situation wird benannt, nicht stillschweigend uebergangen
```

```konformitaet
aussage:  "Als wäre nichts gewesen" — renderSituation('geburt') ist byte-identisch,
          nachdem der native Bestand durch denselben Bestand via Ladeweg ersetzt wurde.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308] "als waere nichts gewesen" — renderSituation(„geburt") ist byte-identisch, nachdem der native Bestand durch denselben Bestand via Ladeweg ersetzt wurde
```

```konformitaet
aussage:  Alle neun regulären nativen Situationen (todesfall-uebernahme ausgenommen, s.
          Grenze) sind byte-identisch nach dem Ersatz durch sich selbst, null Verwerfungen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·E2] alle neun regulaeren nativen Situationen: byte-identisches Rendering, null Verwerfungen
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·E2·ROT-BEWEIS] die Sonde selbst findet einen echten Unterschied — sonst prueft die Sammelprobe nichts
```

```konformitaet
aussage:  Ein vom Modul weggelassenes eigenes Feld fehlt wirklich im gerenderten HTML, ein
          natives sensibel:true ohne Entsprechung im Modul-Feld verschwindet wirklich.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·ROT-BEWEIS] ein vom Modul weggelassenes eigenes Feld fehlt wirklich im gerenderten HTML — und nur dieses
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·Identität·ROT] eine Alt-Eigenschaft ohne Modul-Entsprechung verschwindet — Überschreiben allein reicht nicht
```

```konformitaet
aussage:  Das Feld-Objekt selbst und ein Options-Objekt bleiben nach dem Ersetzen dieselbe
          Referenz — an Ort und Stelle angeglichen, nie durch ein neues Objekt ersetzt
          (dieselbe Strategie wie beim Sektor-Vorbild, s. Entscheidung).
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·Identität] das Feld-Objekt selbst bleibt dieselbe Referenz — kein Neubau
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·Identität] ein Options-Objekt bleibt dieselbe Referenz — auch über eine gefilterte Kopie des Arrays hinweg
```

```konformitaet
aussage:  Die Erlaubnisliste kommt aus dem Gerüst, nie aus dem Modul — ein fremdes Feld
          einer anderen Situation wird abgelehnt, der signierte Einlassweg bleibt
          unabhängig davon für reservierte IDs verriegelt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·Sicherheit] ein Modul, das ein FREMDES natives Feld behauptet, bekommt es nicht — die Erlaubnis kommt aus dem Geruest, nie aus dem Modul
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·Sicherheit·Gegenkontrolle] eine reservierte Situations-ID wird ueber den SIGNIERTEN Weg weiterhin mit reserviert abgewiesen — die Erste-Partei-Zone oeffnet den Einlassweg nicht
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308] _erstePartieErlaubteIdsFuerSituation deckt nur eigene Felder, nicht Verweis-Eintraege — exakt den nativen Bestand
```

```konformitaet
aussage:  todesfall-uebernahme: der Ladeweg wirft nicht, auch wenn sein bloecke-Getter
          bedingten Inhalt baut — die Grenze ist benannt, nicht stillschweigend gebrochen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·Grenze·ROT-BEWEIS] todesfall-uebernahme: der Ladeweg wirft nicht, verliert aber den bedingten KI-Block — benannt, nicht geloest
```

```konformitaet
aussage:  buergermodulBuendelAnwenden verarbeitet einen eigenständigen situationen-Schlüssel
          unabhängig von bereiche — ein reines Situationen-Bündel lässt bereiche unberührt,
          eine unbekannte Situations-ID wird übersprungen, nicht als Fehler behandelt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·Verdrahtung] buergermodulBuendelAnwenden wendet ein Buendel mit situationen-Schluessel an, unabhaengig von bereiche
pruefung: tests/buergermodul-situation-ersetzen.test.js#[ADR-308·Verdrahtung·Rot-Beweis] eine unbekannte Situation im Buendel wird uebersprungen, nicht als Fehler behandelt
```

```konformitaet
aussage:  buergermodulSituationErsetzen hat genau zwei benannte Aufrufer im Kern
          (buergermodulBuendelAnwenden und die Ab-Werk-Saat _situationModulAbWerkSeed), beide
          erst NACH der Zonen-Prüfung — dieselbe Ratsche wie beim Sektor-Vorbild, von Anfang
          an scharf; sie nennt die erlaubten Rufer, ein dritter Ort oder ein Tausch fällt auf.
zustand:  geprüft
herkunft: invariante
pruefung: tests/erste-partei-zone.test.js#[Zone·RATSCHE·Situation] erstePartieBloeckeEintraegePruefen wird ausschliesslich von buergermodulSituationErsetzen gerufen
pruefung: tests/erste-partei-zone.test.js#[Zone·RATSCHE·Situation·Ladeweg] buergermodulSituationErsetzen hat GENAU ZWEI Aufrufer im Kern — beide benannt
```

---

*Vivodepot GmbH · Berlin · 05.09.2026*
