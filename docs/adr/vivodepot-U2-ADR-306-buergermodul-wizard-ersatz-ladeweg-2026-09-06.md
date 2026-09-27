# U2-ADR-306: buergermodulWizardErsetzen — das dritte Gegenstück, für die Assistenten-Achse (WIZARDS)

**Status:** Angenommen
**Datum:** 06.09.2026
**Kategorie:** ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-282 (Erste-Partei-Zone), U2-ADR-292/303 (buergermodulSektorErsetzen —
das ursprüngliche Vorbild), U2-ADR-308 (buergermodulSituationErsetzen — das zweite
Gegenstück, dessen Angleichungs-Strategie hier wörtlich übernommen wird), U2-ADR-304
(WIZARDS bindet Katalog-Arrays bei der Skript-Auswertung — der Grund, warum Angleichen
statt Klonen zwingend ist), U2-ADR-292-Nachtrag (`_feldObjektAngleichen`/
`_optionenArrayAngleichen`, gebaut in einer eigenen Sitzung), U2-ADR-301/305
(`wizardsSchritteSammeln`, der Erzeuger-Sammler, dessen moduleDefs-Form hier konsumiert
wird).
**Anker:** Auftrag (05./06.09.2026): `buergermodulWizardErsetzen` bauen, als wörtlicher
Spiegel von `buergermodulSektorErsetzen`, aber nach der Angleichungs-Strategie, und sich vor Beginn
mit der parallelen Sitzung am Sektor-Ersetzer abstimmen.
**Status heute:** gilt — Ersetzer und Erste-Partei-Zone gebaut, gemessen; Verdrahtung
bewusst offen (s. Konsequenzen).

---

## Kontext

`buergermodulSektorErsetzen` (U2-ADR-292/303) und `buergermodulSituationErsetzen`
(U2-ADR-308) ersetzen native Sektor- bzw. Situations-Felder aus einem Erste-Partei-Bündel,
mit dem Ziel „als wäre nichts gewesen" — byte-identisches Rendering. Für Assistenten
(WIZARDS) gab es kein Gegenstück; der Erzeuger sammelt seit U2-ADR-301 bereits
`wizardsDefinitionen`, aber ohne einen Rückweg in den Kern. Dieser ADR schließt die Lücke.

**Drei Punkte wurden erst beim Nachlesen des tatsächlichen Kern-Codes bzw. beim
Abgleich mit den zwei bereits gebauten Geschwistern sichtbar:**

### 1. Kein Getter auf `schritte` — anders als `bloecke` bei Situationen

Vor dem Bau kam über einen Peer-Fund (ADR-308-Kontext) die Sorge
auf, `w.schritte` könnte wie `situation.bloecke` in einen Getter mit `_textsatzRoh`-
Mechanismus verwandelt sein, der eine direkte Zuweisung zum Werfen bringt. **Gemessen statt
übernommen** (`_textsatzAufWizardsAnwenden`, vivodepot.html:10918, ganzer Funktionskörper
gelesen): der Wizard-Weg läuft komplett anders. `_textsatzKnotenFuellenOhnePflicht`/
`_textsatzTunAssistent`/`_textsatzFeldFuellen` schreiben nur `knoten[art] = text`, FALLS das
Feld noch leer ist („Füller setzt nur, was fehlt", Kommentar dort Zeile ~10760) — kein
`Object.defineProperty`, kein `_textsatzRoh`-Analogon, kein „schon verarbeitet"-Zweig
irgendwo in der Funktion. Auch `titel` am Wizard-Knoten ist laut eigenem Kommentar
(Zeile ~10915) bewusst NICHT gehoben — kein lebender Getter, anders als bei Situationen/
Sektoren vermutet.

```js
wizard.schritte = schritte;              // gewöhnliche Zuweisung, kein delete nötig
_textsatzAufWizardsAnwenden([wizard]);   // idempotent, füllt nur, was fehlt
```

Die Peer-Warnung war für Situationen (ihre eigene Baustelle) richtig, für Wizards falsch —
korrigiert vor dem Bau, nicht danach.

### 2. Keine Cross-Verweis-Form wie bei Situationen

`{quelle, feld:<string>}` (Verweis auf ein bestehendes Feld anderswo) existiert bei Wizards
nicht — jeder Schritt trägt immer ein eigenes Feld-Objekt (`wizardsSchritteSammeln` sammelt
ohnehin nur solche Schritte). Die Erlaubnisliste greift darum bei jedem Eintrag, ohne
Fallunterscheidung.

### 3. Der Sammler musste zuerst korrigiert werden — eine echte, gemessene Lücke

Beim Bau fiel auf: `wizardsSchritteSammeln` (U2-ADR-301) sammelte bisher nur `feld`+`frage`
je Schritt — eine Namensliste, die benennt, was auffiel, nicht was ein Schritt trägt.
Dagegen stand (Präzedenz: derselbe Fehler beim Rechtsraum-Schnitt, nur 3 von 6
Regeln je besucht, und bei neun textsatzlosen Texten). **Gemessen** (`node -e` gegen
`V.WIZARDS`, alle Schritte aller sieben Wizards): sechs Schlüssel kommen tatsächlich vor —
`feld`, `frage`, `hilfetext`, `ziel`, `verborgenWenn`, `verborgenWennKeinVerweis` —, keiner
ein Getter oder Funktionswert (JSON-sicher, `JSON.stringify` auf jeden Schritt lief ohne
Fehler). Der Sammler wurde vor dem Ersetzer korrigiert: Rest-Spread
(`const {feld, ...rest} = schritt`) statt Namensliste, damit auch eine künftige siebte
Eigenschaft automatisch mitreist. Eine neue Probe
(`tests/buergermodul-situationen-wizards-u2-adr-301.test.js#[U2-ADR-306]`) prüft jeden
gesammelten Schritt per `deepStrictEqual` gegen den echten nativen Schritt.

## Entscheidung

### Wörtlicher Spiegel, mit der Angleichungs-Strategie aus U2-ADR-308/292-Nachtrag

```js
function _erstePartieErlaubteIdsFuerWizard(wizardId) { /* wie _erstePartieErlaubteIdsFuerSituation,
  wandert über wizard.schritte[], jeder Schritt mit feld.id beansprucht eine Kennung */ }
function erstePartieWizardSchritteDefsPruefen(wizardId, defs, erlaubteIds, nativFeldNachId) { /* wie
  erstePartieBloeckeEintraegePruefen, ohne die Cross-Verweis-Form, mit frage-Formprüfung */ }
function buergermodulWizardErsetzen(wizardId, moduleDefs) { /* wie buergermodulSituationErsetzen,
  ohne delete (kein Getter, s. Kontext §1) */ }
```

Jedes Schritt-Feld wird über `_feldObjektAngleichen`/`_optionenArrayAngleichen` an sein
bestehendes natives Gegenstück angeglichen — nie durch ein neues Objekt ersetzt. Die
Landkarte der bestehenden nativen Feld-Objekte (`nativFeldNachId`) wird VOR jeder Änderung
aus dem bestehenden `schritte`-Array gebaut, wörtlich wie beim Situations-Vorbild. Der
rekonstruierte Schritt trägt den ganzen Rest des moduleDefs per Rest-Spread (Buchhaltungs-
Schlüssel `wizardId`/`schrittIndex`/`feldId` und `feld` selbst abgezogen) — dieselbe
Disziplin wie im korrigierten Sammler, aus demselben Grund: eine Namensliste hätte
`hilfetext`/`ziel`/`verborgenWenn`/`verborgenWennKeinVerweis` still fallen lassen können.

### „Ersetzen" heißt vollständiger Ersatz, nicht Zusammenführen

Bestätigt vor dem Bau (Rückfrage vorab): `wizard.schritte` wird komplett
aus den akzeptierten moduleDefs neu aufgebaut — ein nativer Schritt ohne Modul-Eintrag
fällt aus dem Wizard heraus, genau wie ein natives Sektor-Feld ohne Modul-Eintrag aus
seiner Sektion herausfällt (ADR-292 §2). Das gilt für ein FREMDES Modul, das bewusst etwas
weglässt — für das mitgelieferte, mit dem nativen Bestand deckungsgleiche Bündel bedeutet
es in der Praxis: alle Schritte bleiben, sofern der Sammler (s. Kontext §3) vollständig ist.

### `sensibel`/`codeListe` verschwinden, wenn das Modul sie nicht mehr trägt

Gemessen an zwei echten Feldern (nicht erfunden): `gebwiz.geburt_urkunde` trägt nativ
`sensibel:true`, `anamwiz.krankheiten` trägt nativ `codeListe:'icd10'`. Beide Proben
bauen das jeweilige Feld ohne die Eigenschaft und prüfen, dass sie nach dem Ersetzen
tatsächlich verschwindet — reines Überschreiben (`Object.assign`) ließe eine Alt-
Eigenschaft ohne Modul-Entsprechung stehen, `_feldObjektAngleichen`s Lösch-Hälfte
(`for (k of Object.keys(ziel)) if (!(k in quelle)) delete ziel[k]`) verhindert das.

### Zwei rote Gegenproben

Ein Modul, das `gebwiz` ersetzt und sich dabei einen Schritt von `heirwiz`
(`familienstand`) aneignet, wird mit `grund:'nicht-erlaubt'` abgewiesen — die
Erlaubnisliste kommt aus dem Gerüst, nie aus dem Modul, und das abgelehnte Feld taucht in
keinem gerenderten Schritt auf. Ein Schritt ohne `frage` wird strukturell abgewiesen
(`grund:'form'`) — ein Schritt ohne Frage ist für den Assistenten kein Schritt, unabhängig
vom Erste-Partei-Weg (spiegelt `wizardsModulPruefen`s eigene Schrittprüfung,
vivodepot.html:~13944).

### Bewusst UNVERDRAHTET — keine Verdrahtung in `buergermodulBuendelAnwenden`

Anders als bei Situationen (ADR-308: sofort verdrahtet, weil der Sektor-Mechanismus zum
Zeitpunkt des Baus bereits verdrahtet war) bleibt `buergermodulWizardErsetzen` OHNE
Aufrufer. Der Grund steht bereits im Kern-Kommentar über `buergermodulBuendelAnwenden`
(⚠, U2-ADR-304): `WIZARDS` bindet die Options-Arrays einiger Felder (6 von 8 gemessenen
`_katalogOptionen`-Aufrufen im WIZARDS-Literal, unabhängig ausgezählt in
einer eigenen Sitzung) bei der Skript-AUSWERTUNG — lange bevor der automatische
Bündel-Aufrufer (`_BUERGERMODUL_BUENDEL_BERICHT = buergermodulBuendelAnwenden(...)`,
Zeile ~25055) je liefe.

**NACHTRAG (06.09.2026): der ADR-304-Grund ist entkräftet — zweifach, beide gemessen,
keine Vermutung:**

```
ADR-304-Grund     WIZARDS bindet bei der Skript-AUSWERTUNG, der Aufruf kaeme zu spaet
entkraeftet 1     _optionenArrayAngleichen mutiert bestehende Options-Arrays an Ort und
                  Stelle (length=0 + push, nie Neuzuweisung) — kein Objekt wird ersetzt,
                  eine bereits gebundene Referenz zeigt darum nicht ins Leere
entkraeftet 2     U2-ADR-311 macht WIZARDS-Optionen zu `get optionen()` — sie lösen erst
                  beim LESEN auf, nicht mehr bei der Skript-Auswertung selbst
```

**Trotzdem NICHT verdrahtet, aus einem frischen, unabhängigen Grund** (gestützt auf
einen Fund aus einer parallelen Sitzung, 06.09.2026): ein Tippfehler in einem der acht
nativen `_katalogOptionen`-Aufrufe im WIZARDS-Literal reißt beim Skript-Laden das GESAMTE
Skript um — unbedingt, für jede Bürgerin, bevor irgendein Boot-Schritt läuft. Die
Assistenten sind damit der empfindlichste Ort im Kern. Sie zusätzlich über das Bündel zu
führen, während `87`s Schnitt an genau dieser Stelle (die acht `_katalogOptionen`-Aufrufe)
noch nicht gelandet ist, hieße zwei Umzüge an derselben fragilen Stelle gleichzeitig.

**Bleibt darum ein benannter Posten, kein grundsätzlicher Verzicht**: die zwei gefilterten
Katalog-Aufrufe (`familienstand`/`steuerklasse`, die bei fehlendem Filterwert still weniger
Optionen zeigen statt zu werfen — 03s unabhängiger Fund) und die 101 weiteren
Feld-Kennungs-Verweise (s. Konsequenzen) sind unabhängig davon zu prüfen, sobald die
Verdrahtung selbst ansteht. Der Auftrag lieferte den Ersetzer und seine Erste-Partei-Zone,
wie Sektor (ADR-292) und Situation (ADR-308 zeigt: eine Verdrahtung KANN im selben Zug
kommen, muss aber nicht) es vor ihrer jeweiligen Verdrahtungs-Entscheidung auch taten.

`buergermodulWizardErsetzen` steht darum bewusst in
`tools/nur-vom-test-erreicht-grundlinie.json` (`zugaenge`, 06.09.2026) — analog zum
historischen Zwischenstand von `buergermodulSektorErsetzen` vor U2-ADR-303.

## Konsequenzen

- Ein drittes, wörtlich gespiegeltes Erste-Partei-Zone-Paar steht (`_erstePartieErlaubteIdsFuerWizard`/
  `erstePartieWizardSchritteDefsPruefen`/`buergermodulWizardErsetzen`), alle drei Achsen
  (Sektor/Situation/Wizard) folgen jetzt derselben Angleichungs-Strategie.
- Die Verdrahtungsfrage (`buergermodulBuendelAnwenden` um einen `wizards`-Schlüssel
  erweitern) bleibt offen — benannt hier, nicht stillschweigend übersprungen. Wer sie
  löst, muss zusätzlich die zwei gefilterten `_katalogOptionen`-Aufrufe
  (`familienstand`/`steuerklasse`) und die 101 weiteren Feld-Kennungs-Verweise
  (`sichtbarWenn.feld`/`zusammenfassungFelder`/`verweisKontextFeld`, 03s Auszählung)
  gegen ein wirklich ausgetauschtes Bündel prüfen, nicht nur gegen den reasserted
  nativen Bestand.
- `tests/erste-partei-zone.test.js`s „genau ein Aufrufer"-Ratsche gilt für Sektor/
  Situation bereits — für Wizard erst, sobald eine Verdrahtung entschieden ist; bis dahin
  ist „genau null Aufrufer" der korrekte, gemessene Zustand.

## Konformität

```konformitaet
aussage:  Nach dem Ersetzen eines Wizards mit dessen eigenem, aus dem nativen Bestand
          gebauten Inhalt ist jeder sichtbare Schritt byte-identisch gerendert (renderWizard)
          — für alle sieben nativen Wizards, mit null Verwerfungen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306] "als waere nichts gewesen" — gebwiz: jeder sichtbare Schritt ist byte-identisch, nachdem der native Bestand durch denselben Bestand via Ladeweg ersetzt wurde
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·E2] alle sieben nativen Wizards: byte-identischer erster Schritt, null Verwerfungen
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·E2·ROT-BEWEIS] die Sonde selbst findet einen echten Unterschied — sonst prueft die Sammelprobe nichts
```

```konformitaet
aussage:  Eine Alt-Eigenschaft ohne Modul-Entsprechung (sensibel, codeListe) verschwindet
          nach dem Ersetzen — reines Überschreiben allein reicht nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·Identität·ROT] sensibel:true verschwindet, wenn das Modul es nicht mehr trägt — Überschreiben allein reicht nicht
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·Identität·ROT] codeListe verschwindet, wenn das Modul es nicht mehr trägt (anamwiz.krankheiten, echtes Beispiel)
```

```konformitaet
aussage:  Das Feld-Objekt selbst und ein Options-Objekt bleiben nach dem Ersetzen dieselbe
          Referenz — an Ort und Stelle angeglichen, nie durch ein neues Objekt ersetzt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·Identität] das Feld-Objekt selbst bleibt dieselbe Referenz — kein Neubau
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·Identität] ein Options-Objekt bleibt dieselbe Referenz — auch über eine gefilterte Kopie des Arrays hinweg
```

```konformitaet
aussage:  Die Erlaubnisliste kommt aus dem Gerüst, nie aus dem Modul — ein fremder Schritt
          eines anderen Wizards wird abgelehnt, ein Schritt ohne frage strukturell verworfen,
          der signierte Einlassweg bleibt unabhängig davon für reservierte IDs verriegelt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·Sicherheit] ein Modul, das ein FREMDES natives Feld (aus einem ANDEREN Wizard) behauptet, bekommt es nicht — die Erlaubnis kommt aus dem Geruest, nie aus dem Modul
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·Sicherheit] ein Schritt ohne frage wird strukturell abgelehnt — ein Schritt ohne Frage ist fuer den Assistenten kein Schritt
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306·Sicherheit·Gegenkontrolle] eine reservierte Wizard-ID wird ueber den SIGNIERTEN Weg weiterhin mit reserviert abgewiesen — die Erste-Partei-Zone oeffnet den Einlassweg nicht
pruefung: tests/buergermodul-wizard-ersetzen.test.js#[U2-ADR-306] _erstePartieErlaubteIdsFuerWizard deckt exakt den nativen Bestand dieses EINEN Wizards
```

```konformitaet
aussage:  wizardsSchritteSammeln verliert keine Schritt-Eigenschaft mehr — gemessen gegen
          den echten Schritt, nicht gegen eine Namensliste.
zustand:  geprüft
herkunft: invariante
pruefung: tests/buergermodul-situationen-wizards-u2-adr-301.test.js#[U2-ADR-306] wizardsSchritteSammeln verliert KEINE Schritt-Eigenschaft — geprüft gegen den ECHTEN Schritt, nicht gegen eine Namensliste
```

```konformitaet
aussage:  buergermodulWizardErsetzen ist gebaut und geprüft, aber bewusst nicht verdrahtet
          — die Verdrahtungsfrage ist benannt, nicht offen gelassen ohne Begründung (Grund
          und Stand in tools/nur-vom-test-erreicht-grundlinie.json#buergermodulWizardErsetzen).
zustand:  abgeloest
herkunft: benannte Grenze
```

Grund (22.09.2026, gemessen): die Aussage „bewusst nicht verdrahtet" stimmt seit dem 07.09.2026 nicht mehr. `buergermodulWizardErsetzen` wird aufgerufen
(`vivodepot.html`, Aufrufe in `buergermodulBuendelAnwenden`; Weg zum Nachsehen: `grep -n "buergermodulWizardErsetzen(" vivodepot.html`), und ihr Eintrag ist aus
`tools/nur-vom-test-erreicht-grundlinie.json` entfernt (`grep -c buergermodulWizardErsetzen tools/nur-vom-test-erreicht-grundlinie.json` gibt 0). U2-ADR-346 hält
das fest: die Funktion „verließ die Grundlinie der Unverdrahteten", ihr Eintrag endete mit „GEHOERT HERAUS, sobald ein Aufrufer sie tatsaechlich nutzt". Die
Klausel ist damit von der Grundlinie selbst überholt, nicht offen; eine Probe „nicht verdrahtet" gäbe es nicht mehr zu bestehen.

---

*Vivodepot GmbH · Berlin · 06.09.2026*
