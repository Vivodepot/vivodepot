# U2-ADR-310 · Der Produktabnahmebeweis, E4-Bündel-Seite

**Datum:** 05.09.2026
**Status:** gebaut, neun Proben grün (vier verlangte Proben + drei Gegenproben + Probe 2b +
ihre eigene Gegenprobe), Node-Ebene
**Status heute:** gilt — deckt den heutigen Kanon (`6d057fdc`, nach U2-ADR-312;
`BUERGERMODUL_BUENDEL` trägt echten Inhalt). **Nachtrag 06.09.2026 (§7): Probe 2b wurde
gedreht, nachdem U2-ADR-312 den von ihr gemessenen Zustand absichtlich beseitigt hat —
die in §4 (Probe 2b) ursprünglich festgehaltene offene Frage aus U2-ADR-304 ist damit
EINGELÖST, nicht mehr offen.**
**Bezug:** U2-ADR-292 (Struktur-Achse, `buergermodulSektorErsetzen`) + sein E4-Nachtrag
(„an Ort und Stelle, nicht ersetzt", `95e7fb01`) · U2-ADR-303 (der Aufrufer,
`buergermodulBuendelAnwenden`, depot-unabhängig) · U2-ADR-304 (die Landkarte — WIZARDS
bindet SEKTOR_BY_ID bei der Auswertung, zehn Stellen) · U2-ADR-311 (schließt den in §5
zunächst noch offenen Options-Schnappschuss, zwischen Bau und Landung dieser Datei) ·
U2-ADR-300/302 (dieselbe Abnahme-Haltung, Struktur-/Branding-Achse, dort E2E) ·
`golden-master-ausgabewege.test.js` (dieselbe Referenzdepot-Fixture, dieselbe Batterie-Form)

---

## 1 · Der Auftrag — vier Proben, plus eine Gegenprobe ohne die keine zählt

Der Auftrag, nach der Landung von `95e7fb01` (`BUERGERMODUL_BUENDEL` trägt jetzt echten Inhalt
statt eines Platzhalters):

```
1. Kern bootet mit dem Bündel als Quelle, nicht mit der nativen Konstante
2. Depot OHNE Bündel        — leere, aber funktionsfähige Anwendung — bricht NICHT
3. Depot MIT Bündel         — identisch zu heute
4. Bestandsbürgerin         — verliert keine Werte, wenn beides zusammentrifft
```

Plus die Gegenprobe: ein Feld weglassen, eines umbenennen, zwei Sektionen vertauschen —
alle drei müssen Probe 3 rot färben, sonst beweist sie nichts. Und ausdrücklich: „Deine
eigene Landkarte (U2-ADR-304) hat zehn Stellen in `const WIZARDS` gefunden, die bei leerem
SEKTOREN umfallen. Die Angleichung an Ort und Stelle sollte sie erledigt haben — miss, ob
sie es hat."

---

## 2 · Warum Node, nicht E2E — bewusste Abweichung von U2-ADR-300/302

`buergermodulBuendelAnwenden`/`buergermodulSektorErsetzen` sind reine, DOM-freie
Kern-Funktionen — `data` wird an KEINER Stelle gelesen (Kommentar an der Definition des
Aufrufers, nachgemessen: „dieser Weg liest `data` an keiner Stelle"). Die Frage „bootet der
Kern mit dem Bündel als Quelle" ist außerdem nur über verschiedene QUELLTEXT-Varianten von
`BUERGERMODUL_BUENDEL` zu beantworten — ein top-level `const`, kein Laufzeit-Wert, dieselbe
Lage wie bei `SEKTOREN` in U2-ADR-304: Ersatz VOR dem Laden, kein Post-Load-Patch.

„Deine Apparatur trägt es ohne Umbau" wird hier wörtlich, aber auf der Node-Ebene erfüllt:
dieselbe Batterie wie `tests/e2e/geruest-umbau-helpers.js` (PDF-Modelle, zehn Exportkanäle,
echter Datei-Rundlauf) — hier über `ladeKern()` statt über `page.evaluate`, weil der
Gegenstand selbst nie einen Browser braucht. „Anderes B, gleicher Vergleich."

---

## 3 · Die Apparatur

`tests/fixtures/buergermodul-buendel-varianten.js` (neu): liest das echte, im Repo
eingebettete Bündel als Objekt (`echtesBuendelLesen`), baut Quelltext-Varianten
(`ohneBuendel`, `mitBuendel`) und die drei Gegenprobe-Mutationen
(`buendelOhneFeld`/`buendelFeldUmbenannt`/`buendelSektionenVertauscht`) — reines JSON.stringify
zurück in den Quelltext, kein Escaping nötig (gültiges JSON ist eine syntaktische Teilmenge
von JS).

`tests/e4-buergermodul-buendel-abnahmebeweis-u2-adr-310.test.js` (neu): dieselbe
Referenzdepot-Fixture (`tests/fixtures/referenzdepot.js`) und Batterie-Form wie
`golden-master-ausgabewege.test.js` — PDF-Modelle (Voll-Depot, Bereich Identität,
Notfallkern), alle elf Exportkanäle, echter Datei-Rundlauf durch eine zweite, frische
Kern-Instanz. `ladeKernAusVariante(html)` schreibt jede Variante in eine Temp-Datei und
lädt `tests/load-kern.js` mit geleertem Require-Cache neu — `HTML_PATH` wird dort einmalig
beim Modul-Load aus `KERN_HTML_PATH` gelesen, ein bloßer Env-Wechsel ohne Cache-Bust hätte
keine Wirkung.

---

## 4 · Die acht Proben

**Probe 3 (Grundlage) — Depot MIT Bündel ist identisch zu Depot OHNE Bündel.** Volle
Batterie, `deepStrictEqual` — grün. Das IST „identisch zu heute": das Bündel reasserted den
nativen Bestand nur (Generator-Beleg, 0 Verwerfungen), „heute" ist der native
Vor-Bündel-Zustand.

**Probe 2a — Depot OHNE Bündel bootet, bricht nicht.** Volle Batterie inkl. echtem
Datei-Rundlauf durch eine zweite `ohneBuendel`-Instanz — grün. `BUERGERMODUL_BUENDEL = null`
ist der code-eigene, dokumentierte Normalfall („kein Sonderfall, kein Schalter") — hier
gemessen, nicht geglaubt.

**Probe 1 — Kern bootet mit dem Bündel als Quelle.** Ein aus dem Bündel weggelassenes Feld
(`identitaet.person.telefon`) verschwindet aus der laufenden Anwendung — mit
Positivkontrolle zuerst (die UNVERÄNDERTE Fixture liefert eine „Telefon"-Zeile mit dem
Fixture-Wert, sonst prüfte die Rot-Probe nichts). Bliebe die Telefon-Zeile trotz
Wegfalls im Bündel stehen, bootete der Kern aus der nativen Konstante, nicht aus dem Bündel.

**Probe 4 — Bestandsbürgerin.** Ein Depot angelegt und gespeichert unter einem Kern OHNE
Bündel-Maschinerie (die älteste denkbare Bestandslage), dieselbe Datei gelesen von einem
frischen Kern mit dem ECHTEN, heutigen Bündel — jeder Wert (15 Menschen, 13 Sektoren,
Telefon-Wert stichprobenhaft geprüft) unverändert da. Strukturell erwartbar (der Aufrufer
liest `data` nie), hier trotzdem gemessen statt angenommen.

**Gegenprobe (3×) — ohne die zählt Probe 3 nichts.** Feld weglassen, Feld umbenennen (trifft
`_erstePartieErlaubteIdsFuerSektor` nicht mehr, wird verworfen — derselbe Effekt wie
Weglassen, andere Ursache), zwei Sektionen inhaltlich vertauschen (Positionstausch allein
wäre unsichtbar — Zuordnung läuft über `sektionId`, nie über Array-Position, s. Kommentar an
`buergermodulSektorErsetzen`). Alle drei färben Probe 3 rot — stichprobenhaft nachgeprüft:
`vcard-identitaet`/`sd-jwt-vc-identitaet` unterscheiden sich zwischen „echt" und „Feld
weggelassen" tatsächlich (nicht nur die Prüfsumme des Gesamtobjekts).

**Probe 2b — die explizit gestellte Nachfrage.** SEKTOREN selbst quelltextlich leer
(dieselbe Technik wie U2-ADR-304), gegen den HEUTIGEN Kanon: **derselbe Wurf wie damals**,
wortgleich (`_katalogOptionen: kein Katalogfeld …`). **„An Ort und Stelle, nicht ersetzt"
hat den U2-ADR-304-Befund NICHT erledigt — und konnte es strukturell auch nicht:** dieser
Umbau löst die OBJEKT-IDENTITÄTS-Frage (87s Fund: eine Neuerzeugung hinterließe eine
verwaiste Referenz), nicht die Frage „was, wenn gar kein natives Objekt mehr da ist, an das
sich angleichen ließe". `buergermodulSektorErsetzen` selbst guardet das bereits sauber
(`if (!sektor) return {angewandt:false, grund:'unbekannter-sektor'}` — kein Absturz DORT),
aber `WIZARDS`s acht `_katalogOptionen`-Aufrufe liegen ~8000 Zeilen VOR diesem Aufrufer und
werfen unverändert. **Dieser Befund bleibt vollständig offen** — er betrifft nicht den
heutigen Schritt (natives Gerüst bleibt vollständig bestehen), sondern jeden KÜNFTIGEN
Schritt, der `SEKTOREN` selbst leert.

> **NACHGETRAGEN 06.09.2026 — s. §7:** U2-ADR-312 hat diesen Befund geschlossen. Die Probe
> wurde gedreht (nicht gestrichen); der Absatz oben bleibt als Aufnahme des damaligen
> Zustands stehen.

---

## 5 · Ein zweiter Fund, zwischen dem Bau dieser ADR und ihrer Landung UNABHÄNGIG bereits
geschlossen (U2-ADR-311)

Beim Bau dieser ADR stand hier noch ein offener Befund: der Kommentar an
`_BUERGERMODUL_BUENDEL_BERICHT` benannte, dass zwei der acht `WIZARDS`-Katalogfelder
(`identitaet.familienstand`, `identitaet.steuerklasse` — die einzigen zwei mit
`erlaubteWerte`-Filter) ihre `optionen` bei der Skript-AUSWERTUNG als gefiltertes, EIGENES
Array einfingen, statt dieselbe Referenz wie das Sektorfeld zu teilen (wie die anderen sechs
es bereits taten) — ein Bündel, das einen dieser Options-Werte entfernt, hätte den Wizard-
Schritt darum nie erreicht.

**Zwischen dem Bau dieser Datei und ihrer Landung hat U2-ADR-311 (`bab7a721`,
gemessen, 6-zu-2-Zählung bestätigt) genau das behoben** — `get optionen()` statt einer
festen Eigenschaft, `_katalogOptionen` filtert jetzt bei JEDEM Lesezugriff frisch, kein
Schnappschuss mehr. Eigener Rot-Beweis dort (`[Optionslabel·3b·ROT]`, ein Wert wird nach
dem Laden entfernt) — nicht hier wiederholt. **Der Befund aus §5 (frühere Fassung) ist damit
für ALLE acht Katalogfelder geschlossen**, nicht nur für die sechs unfilterten — bestätigt
gegen den heutigen Kanon (Probe 2b oben lief nach dieser Landung erneut, unverändert grün:
U2-ADR-311 betrifft die Options-FRISCHE eines BESTEHENDEN Feldes, nicht die Frage, ob das
Feld-Objekt bei leerem `SEKTOREN` überhaupt existiert — orthogonal zu U2-ADR-304, beide
Befunde bleiben unabhängig).

---

## 6 · Was das NICHT zeigt

- **Kein Renderpfad** (`renderSektor`) — dieselbe Grenze wie golden-master-ausgabewege.test.js,
  aus demselben Grund (`render-charakterisierung.test.js` deckt das bereits ab, kein Browser
  hier gebraucht).
- **Kein Wizard-DURCHLAUF** (`wizardLauf`) — nur die in §5 benannte, bereits bekannte
  Options-Lücke, kein neuer Bau dagegen.
- **Probe 2b war ursprünglich eine Landkarte-Bestätigung ohne Behebung — inzwischen durch
  U2-ADR-312 eingelöst, s. §7.**

---

## 7 · Nachtrag 06.09.2026 — Probe 2b gedreht, U2-ADR-304-Befund eingelöst

Die volle Suite, gemessen gegen `6d057fdc`, zeigte genau eine rote Probe im Kanon: die
ursprüngliche Fassung von Probe 2b (§4), die einen Wurf erwartete, wo U2-ADR-312
(87s Bau, `6d057fdc`, „WIZARDS bindet Katalog-Auflösung auf Lesezeit — SEKTOREN darf leer
sein") absichtlich keinen mehr vorsieht. Die Probe war richtig, als sie geschrieben wurde
— sie beschrieb danach einen Zustand, der bewusst beseitigt wurde.

**Gedreht, nicht gestrichen** (sie bleibt die einzige Probe, die den leeren Bestand am
echten Kern mißt):

```
vorher   SEKTOREN leer  →  WURF erwartet (bis U2-ADR-312)
jetzt    SEKTOREN leer  →  [] erwartet, Kern bootet, WIZARDS.length === 7
         voller Bestand + erfundene Katalog-Kennung  →  WURF, unverändert (87s Grenze)
```

Die zweite Zeile ist eine NEUE Gegenprobe (`Probe 2b·Gegenprobe`) — sie hält 87s eigene
Auskunft fest (unabhängig in U2-ADR-313 bestätigt): `_katalogOptionen` liefert bei einem
GANZ FEHLENDEN Bereich `[]`, wirft aber weiterhin, wenn ein BEFÜLLTER Bereich ein
EINZELNES Feld nicht kennt — nur die erste Grenze wurde kulant, nicht die zweite.

**Damit ist die in §4 ursprünglich als „vollständig offen" festgehaltene Frage aus
U2-ADR-304 EINGELÖST** — nicht durch diese ADR, sondern durch U2-ADR-312, hier nur
nachvollzogen und in der Probe selbst nachgezogen.

**Der eigentliche, wichtigere Befund aus diesem Vorfall (eigener Auftrag, nicht Teil
dieser ADR selbst):** der Gate-Blindfleck, der eine rote Probe unbemerkt in den Kanon ließ
— `git rebase --continue` löst in diesem Repo keinen Hook aus, nur `git commit`/
`git commit --amend` fahren die volle Suite; `pre-push` prüft nur eine schmale Teilmenge
nach. Wer per Rebase auf einen Stand zieht, der eine neue Probe gegen die eigene Änderung
mitbringt, und danach ohne `--amend` pusht, schifft einen Stand, den nie ein Gate gegen
die eigene Änderung gehalten hat. Eigener Gegenstand, nicht hier vertieft.

---

*Vivodepot GmbH · Berlin · 06.09.2026*
