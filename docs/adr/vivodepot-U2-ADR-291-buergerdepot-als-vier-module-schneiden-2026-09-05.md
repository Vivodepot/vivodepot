# U2-ADR-291: Das Bürgerdepot wird in vier Module geschnitten — Struktur, Sprache, Recht, Marke

**Status:** Akzeptiert
**Datum:** 05.09.2026
**Betrifft:** `tools/buergermodul-schnitt.js`, `tools/buergermodul-erzeugen.js`,
`tools/buergermodul/*.json`, `tests/buergermodul-schnitt.test.js`

- **Status heute:** gilt — der Schnitt läuft gegen v557, die Gegenprobe steht auf 0 (kein Text
  mehr in der Struktur), und die neun ungedeckten Texte sind als Ratsche in der Suite gebunden.
  Das LADEN dieser Module ist damit ausdrücklich nicht entschieden: U2-ADR-253 Commit B bleibt
  offen, und dieser Schnitt ist seine Vorarbeit, nicht sein Ersatz.

---

## Der Maßstab

Wörtlich, 05.09.2026:

> „Am Ende möchte ich ‚mein' Bürgerdepot haben. Als wäre nichts gewesen."

Und, als stehende Regel am selben Tag:

> „alles ist modular!"

Daraus folgt der Prüfstein dieses ADR: **nicht „das Modul lädt", sondern „sie öffnet die App
und merkt nichts".** Vollständigkeit ist damit keine Güteklasse, sondern die Bedingung — ein
Schnitt, der 95 % erfasst, erfüllt ihn nicht, denn die fehlenden 5 % sind genau das, was
auffällt.

## Die Entscheidung

Der eingebaute Bestand wird entlang **vier** Achsen geschnitten, nicht als ein Bündel:

| Modul | Inhalt | Prüfstein |
|---|---|---|
| **VD Privat** | welche Bereiche, Felder, Situationen, Wizards | ändert sich beim Sprachwechsel **nicht** |
| **VD dt. Sprache** | alles, was die Bürgerin liest | ändert sich beim **Sprach**wechsel |
| **VD dt. Rechtsraum** | Fristen, Normverweise, Gültigkeitsregeln | ändert sich beim **Rechtsraum**wechsel |
| **Branding** | was „Vivodepot" sagt oder zeigt | ändert sich, wenn eine andere Marke aufsetzt |

Daraus setzen sich die Produkte zusammen:

```
Gerüst + Privat + dt. Rechtsraum + dt. Sprache    = kostenlose dt. Bürgerapp
Gerüst + Privat + dt. Rechtsraum + engl. Sprache  = kostenlose engl. Bürgerapp
```

**Warum der Text aus der Struktur muss:** `SEKTOREN` entsteht im Kern als
`_textsatzAufSektorenAnwenden([…])` — der deutsche Text ist **eingebacken**. Bliebe er drin,
müsste die englische App ein zweites `VD Privat` sein, und die beiden liefen auseinander.

**Warum die Marke aus der Struktur muss:** Rechtsraum und Sprache werden später von Pro
mitbenutzt. Was dort hineingelegt wird, taucht in Pro wieder auf. Und solange „Vivodepot" in
der Struktur steht, kann keine Fremdmarke aufsetzen — der Baukasten trüge nur uns selbst.

## Was gemessen wurde, und was dabei herauskam

**448 Feld-Definitionen** (266 Felder + 182 UnterFelder) gehen durch den Schnitt. Ergebnis
gegen Kern v557:

```
vd-privat.json          43 160 Bytes
vd-de-sprache.json     104 560 Bytes
vd-de-rechtsraum.json      414 Bytes
vd-branding.json            83 Bytes

Gegenprobe: Text in der Struktur   0
Unentschieden                      0
```

**Die Gegenprobe ist der eigentliche Beleg**, nicht die Dateigrößen: die geschnittene Struktur
trägt **keinen** sichtbaren Text mehr. Und in die andere Richtung wird jeder herausgeschnittene
Text im nativen Textsatz **unter derselben Kennung wiedergefunden** — 1250 geprüft.

### Die Kennungsformen sind gemessen, nicht geraten

```
Feld            <sektorId>.<feldId>.<rolle>
Feld-Option     <sektorId>.<feldId>/<wert>.label
UnterFeld       <sektorId>.<traegerFeldId>/<unterFeldId>.<rolle>
UnterFeld-Opt   <sektorId>.<traegerFeldId>/<unterFeldId>/<wert>.label
```

**Drei Annahmen waren nacheinander falsch**, bis sie an den Daten geprüft waren. Der teuerste
Fehler: das **Trägerfeld** im Schlüssel wegzulassen. Er erzeugte **134 gemeldete Deckungs­lücken,
wo keine einzige war** — eine Zahl, die als Produktbefund weitergereicht beinahe eine erfundene
Krise ausgelöst hätte. Eine vierte falsche Annahme betraf eine „Lücke", die sich als
`beispiel: ""` entpuppte: ein leeres Feld, keine fehlende Übersetzung.

### Neun Lücken gefunden, acht geschlossen, eine begründet offen

Der Schnitt fand neun Texte des eingebauten Bestands, die unter **keiner** Textsatz-Kennung
standen. Ein Sprachmodul konnte sie nicht ersetzen; in der englischen App wären sie deutsch
geblieben. **Acht sind in diesem Commit nachgetragen** — sieben Datalist-Vorschlagslisten und
ein Dokumentname:

```
feld.aufenthaltstitel_art.vorschlaege     feld.kv_zusatz.vorschlaege
feld.betreuungsmodell.vorschlaege         feld.impfungen.vorschlaege
feld.laender.vorschlaege                  feld.vorgangstyp.vorschlaege
feld.fach.vorschlaege                     dokument.bankvollmacht.name
```

**Die neunte, `feld.art.vorschlaege`, bleibt offen — und der Grund ist der eigentliche Fund.**

Die Kennungsform `feld.<feldId>.vorschlaege` trägt bewusst **keine** `sektorId`. Der Kommentar
an `_vorschlaegeTextsatz` begründet das so: „Feld-IDs sind im ganzen 258-Felder-Katalog bereits
eindeutig." **Gemessen stimmt das für die Ebene, für die es geschrieben wurde, und nur für die:**

```
Top-Level-Felder   266   doppelte IDs:  0
UnterFelder        182   doppelte IDs: 17     system · nr · ausgestellt · gueltig · name
                                              aktenzeichen · person · art · anmerkung · ort
                                              behoerde · datum · gueltig_bis · betrag · …
```

**`_vorschlaegeTextsatz` bedient aber beide Ebenen.** `art` ist eine der siebzehn:

```
meine-menschen/unterhalt/art   Kindesunterhalt · Trennungsunterhalt · …
finanzen/konten/art            Girokonto · Sparkonto · Tagesgeld · …
```

Eine Kennung für beide gäbe einer der Listen die Vorschläge der anderen. **Eine Kontoart im
Unterhaltsfeld ist schlimmer als ein deutscher Text im englischen Feld** — darum bleibt die
Lücke offen, statt sie falsch zu schließen. Die Form müsste die Trägerkette aufnehmen; das ist
eine Kern-Änderung mit eigener Entscheidung, kein Nachtrag.

Der Rest steht als **Ratsche** in `tests/buergermodul-schnitt.test.js`: die Liste darf
schrumpfen, nie wachsen. Wächst sie, ist ein neuer Text eingebaut worden, den keine Sprache
erreicht — **und genau das würde die Bürgerin bemerken.** Eine zweite Probe hält die
Gegenrichtung: nichts Erledigtes darf in der Liste stehen bleiben.

### Der Rechtsraum-Anteil ist klein und eindeutig

Drei Felder tragen Recht, und man sieht ihnen an, warum:

```
sozialversicherung.pflegegrad_bescheid_vom   {"dauer":"P1M","quelle":"§ 84 Abs. 1 SGG"}
sozialversicherung.kuendigungsdatum          {"dauer":"P3W","quelle":"§ 4 Satz 1 KSchG"}
mobilitaet.reisepass_gueltig                 {"regel":"ausweisdauer"}
```

Die Seltenheit ist **kein** Grund, sie in der Struktur zu lassen: in einem anderen Rechtsraum
stimmen sie nicht.

## Native Kennungen, ohne Präfix

`vorname` bleibt `vorname`. Eine Feld-Kennung **ist** der Speicherplatz
(`data.sektoren[sektorId][feldId]`, U2-ADR-037 Entscheidung 1) — ein Präfix `tpl_vorname`
verwaiste den Eintrag jeder Bestandsbürgerin. Das ist der Zweck der Erste-Partei-Zone
(U2-ADR-282), und dieser Schnitt ist **ihr erster echter Aufrufer**: 448 angenommen, 0 verworfen.

Eine eigene Probe hält fest, dass keine Kennung ein Präfix trägt.

## Was ausdrücklich NICHT dazugehört

**Das Laden.** Diese Werkzeuge erzeugen Inhalt; sie laden ihn nicht. Ob der Kern ihn heute
annähme, ist eine andere Frage — und `tools/buergermodul-erzeugen.js` beantwortet sie ehrlich,
statt sie zu umgehen. Jede Nutzlast läuft durch ihren **echten** Prüfer aus `EINLASS_REGISTER`,
und das Urteil steht im Ergebnis, auch wenn es „abgelehnt" lautet:

```
textsatz mit sprache 'de'    -> reserviert   (TEXTSATZ_SPRACHE_EINGEBAUT)
bereich mit eingebauter ID   -> reserviert   (BEREICH_IDS_EINGEBAUT, 13 Kennungen)
situation / wizard           -> reserviert   (dieselbe Form, 10 bzw. 7)
```

Das sind **keine Fehler dieser Werkzeuge**, sondern der offene Stand von U2-ADR-253
(„Commit B": Suppression des nativen Bestands). `bereichsModulPruefen` setzt zudem
`sektionen: Object.freeze([])` **hart** — ein Bereichs-Modul kann Felder strukturell nie
tragen; sie laufen über `data.feldDefinitionen[]`, den Template-Weg.

**Farben, Logo, Schriftart.** `brandingModulPruefen` nähme sie, aber im Kern liegen sie als
CSS-Variablen im Stylesheet, nicht als auslesbarer Datenwert. Ein Schnitt daraus wäre ein
CSS-Parser und ein eigener Gegenstand. Sie stehen benannt in der Auslassungsliste, nicht im
Modul — **„bleibt im Gerüst, weil es der Normalfall ist" wäre ab jetzt keine Begründung mehr.**

**Der Beweis, dass die zusammengesetzte App sich gleich verhält.** Er wird an anderer Stelle
gebaut (Vergleich zweier Konfigurationen desselben Kerns). Was hier bewiesen ist, ist die
Datenebene: der Schnitt verliert nichts und benennt nichts um. Ein grüner Vergleichslauf
allein wäre ein Beleg für den falschen Gegenstand.

## Folgen

- Die **Auslassungsliste ist das wichtigste Artefakt**, nicht der Code. Sie steht als Ratsche
  in der Suite, nicht als Prosa in einem Bericht — eine Zahl im Fließtext hätte keinen Wächter.
- Der Schnitt läuft **vollständig in `schneiden()`**, nicht halb im Aufrufer. Eine erste Fassung
  ließ den Nachzieh-Durchgang in `main()`; jeder andere Aufrufer hätte eine Struktur bekommen,
  die noch Text trägt. Die Proben fielen darüber, bevor es jemand benutzte.
- `tools/buergermodul-erzeugen.js` schreibt **keine** Datei mehr ohne ausdrücklichen Pfad: seine
  1,6-MB-Ausgabe verbrauchte niemand. Sein Ergebnis ist das Urteil, nicht das Erzeugnis.
