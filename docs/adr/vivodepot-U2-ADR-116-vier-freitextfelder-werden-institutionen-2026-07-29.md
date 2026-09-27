# U2-ADR-116: Vier Freitextfelder werden Institutions-Referenzen (Schema 43)

**Status:** Angenommen
**Datum:** 29.07.2026
**Kategorie:** DATENMODELL, MIGRATION
**Linie:** U2
**U2-Bezug:** U2-ADR-104 (der verwandte Fall, **anders** entschieden — die Abgrenzung steht unten
und ist der eigentliche Gegenstand dieses ADR) · U2-ADR-108 (jeder Sprung der Kette bringt seine
Probe mit) · U2-ADR-109 (der vorige Sprung, 41→42)
**Anker:** Fixlisten-Posten C10 · interner Bericht `c10-institutionen-referenzen-2026-07-29.md`
**Status heute:** gilt — Beleg `tests/migration-stufen.test.js`.

---

## Kontext

Vier Felder führten den Namen einer Institution als **Freitext**:

| Feld | Sektor | Beispiel | `verweisZweck` |
|---|---|---|---|
| `kv_art` | gesundheit | „AOK Bayern" | `aerztlich` |
| `konten[].bank` | finanzen | „Sparkasse München" | `geschaeftlich` |
| `kfz_versicherung` | mobilitaet | „HUK24, Vertrag 4711-0815" | `geschaeftlich` |
| `pflegekasse` | sozialversicherung | „AOK Bayern — Pflegekasse" | `pflege` |

Begründung (29.07.2026): **eine Kasse als getippter Name lässt sich nicht
wiederverwenden, nicht prüfen und nicht übersetzen.** White-Label braucht die Struktur ebenso
wie die Exporte. Dieselbe Kasse steht heute in zwei Feldern zweimal getippt da, mit zwei
Schreibweisen, und keine Übersicht kann sie zusammenführen.

**Vorabmessung, die grünes Licht gab ⟦M⟧** (gegen `u2-fix @ be51e9a`):

| Frage | Ergebnis |
|---|---|
| ref-Felder im Modell | 30 — 25 `person`, 3 `institution`, 2 andere (`mappe`, `bankvollmacht`) |
| Sind die vier Ziele heute typlos? | ja — `typ: 'text'`, kein `entitaet` |
| Existiert das Institutionen-Register? | ja, mit **10 Arten** |
| Deckt es die vier Ziele ab? | ja — `krankenkasse`, `bank`, `versicherung`, `pflegekasse`; **kein neues Vokabular nötig** |

## Entscheidung

**1 — Die vier Felder werden `typ: 'ref', entitaet: 'institution'`** mit dem `verweisZweck` aus
der Tabelle oben. Die Lese-App zieht identisch nach; die Paritäts-Prüfung hat die Lücke beim
Bau sofort gefangen.

**2 — Die Migration 42 → 43 legt aus dem Alt-Text einen NEUEN Register-Eintrag an, und die
Referenz zeigt darauf. Es wird NIE gegen bestehende Einträge gematcht.**

Das ist die Entscheidung, an der alles hängt, und sie ist kein Baudetail. Ein Match hätte eine
Zuordnung **behauptet**, die die Bürgerin nie getroffen hat. Der neue Eintrag behauptet nichts:
er trägt genau den Text, der schon dastand.

**3 — `art` bleibt LEER.** Aus „AOK Bayern" auf `krankenkasse` zu schließen wäre dieselbe Sorte
Raten, nur eine Ebene tiefer. Die Bürgerin ordnet zu. (Dieselbe Bauart wie U2-ADR-109, wo die
migrierte Alt-Freitext-Zeile ihre `art` ebenfalls bewusst leer lässt.)

**4 — Die Vertragsnummer bekommt ein eigenes Sektorfeld, nicht ein Feld in der Entität**
(Entscheidung 29.07.2026). Neu: `mobilitaet.kfz_versicherung_nr` („Versicherungsschein-Nummer"),
direkt hinter `kfz_versicherung`.

Der Grund liegt in der Kardinalität: **eine Bürgerin kann mehrere Verträge beim selben Anbieter
haben.** Eine Nummer *in* der Institutions-Entität existierte pro Anbieter nur einmal und wäre
beim zweiten Vertrag falsch. Sie gehört an das Sektorfeld, das die Referenz trägt. Das Muster
steht im Produkt bereits dreimal — `kv_art`+`kv_nummer`, `pflegekasse`+`pflegekasse_nr`,
`konten[].bank`+`iban`; `kfz_versicherung` war die einzige Lücke.

**Keine Migration, kein Split.** „HUK24, Vertrag 4711-0815" wird **nicht** am Komma getrennt —
genau das verbietet U2-ADR-104, und §2 oben legt den ganzen Alt-Text bewusst als `name` ab. Das
neue Feld startet leer; die Bürgerin trägt die Nummer selbst nach. Mitgezogen wurde das
`beispiel` von `kfz_versicherung`: es führte die Vertragsnummer im Anbieternamen mit („HUK24,
Vertrag 4711-0815") und lehrte damit genau die Vermischung, die das neue Feld auflöst — jetzt
nur noch „HUK24".

**Das Feld ist additiv und hebt das Schema nicht.** Ein neues, leeres Textfeld braucht keine
Stufe: es gibt nichts zu migrieren, und ein Sprung ohne Inhalt wäre eine Zahl ohne Aussage.

**5 — Drei Institutionsfelder bekommen Beispiel und Hinweis** (Entscheidung 29.07.2026):
`bildung.arbeitgeber` (beides fehlte), `sozialversicherung.pflegedienst` (beides fehlte),
`sozialversicherung.pflegedienst_kontakt` (nur `beispiel` fehlte — dieses Feld ist wenige Stunden
später mit §7 entfallen; die Arbeit ist nicht verloren, sie zog auf `pflegedienst` um). Kein
Verhaltenswechsel — aber ein `ref`-Feld ohne Beispiel lässt offen, ob dort ein Name, eine Adresse
oder eine Nummer erwartet wird, und genau diese Unschärfe hat oben in `kfz_versicherung` die
Vertragsnummer in den Anbieternamen wandern lassen.

## 6 — Die Person bekommt eine Institution (additiv)

`menschen[].institution = { ref: '<institutionen[].id>' }`, optional zusätzlich `override`.
**Anlass:** bei Patienten in einer großen Institution muss man sich sonst endlos
durchtelefonieren. Das Modell trug die Funktion bisher als `rolle` **am Verweisfeld** (arzt,
facharzt, zahnarzt, pflegeperson, partner) — die Institution dahinter fehlte an jeder dieser
Stellen. In der Maske ein Verweisfeld neben `aufgabe`: „Wo arbeitet diese Person?"

Dieselbe Bewegung wie §1, eine Ebene weiter: dort hörten vier **Sektorfelder** auf,
Institutionsnamen als Freitext zu führen; hier hört der **Register-Eintrag** auf, die Institution
gar nicht zu kennen. Drei Ärzte an einer Klinik sind EIN Eintrag — Adresse und Nummer stehen
einmal, und eine Korrektur wirkt an allen dreien.

**ADDITIV: kein Wert wird umgeformt, also kein Migrationsweg und keine Schemastufe.** Der Wert
bleibt `undefined`, bis jemand ihn setzt.

**Der Fehler, der hier nahelag.** `personHinzufuegen`/`personAktualisieren` pflegen ihre
optionalen Felder über eine Schlüsselliste, und die Schleife darin zwingt jeden Wert durch
`String(...)`. Das neue Feld dort einzutragen wäre das kürzeste Diff gewesen — und der Fehler:
aus `{ref:'…'}` wäre `"[object Object]"` geworden, genau die Klasse aus §1. Deshalb ein eigener
Zweig (`_personInstitution`), mit dem Kommentar an der Stelle, an der jemand den kurzen Weg nähme.
Ein roher String wirft, wie beim `ref`-Typwächter.

**Die drei Nebenwege sind geprüft, weil sie sonst still danebenlaufen** — ein additives Feld
bricht nichts, es *verschwindet* nur an Stellen mit Schlüsselliste ⟦M⟧:

| Weg | Ergebnis |
|---|---|
| Sicherung → Wiederherstellung | trägt den Verweis mit, und er zeigt danach auf einen existierenden Eintrag |
| B16-Import | lässt einen bestehenden Verweis unberührt (b16 kennt kein Institutions-Register; die Frage ist nicht „kommt es an", sondern „geht Vorhandenes verloren") |
| Verweis-Export (SD-JWT-VC & Co.) | geht **ausdrücklich nicht** mit |

**Zur letzten Zeile, denn sie ist eine Entscheidung und kein Nebeneffekt:**
`verweisExportFelder` filtert über die **Matrix-Schlüssel** — ein neues Register-Feld fiele
ohnehin still heraus. Ein `institution`-Wert ist `{ref:<uuid>}`, also **technisch**, wie `id`,
das aus demselben Grund nie mitgeht; roh mitgegeben wäre es eine UUID, die einem fremden System
nichts sagt. **Aufgelöst** mitgegeben wäre es eine zweite Entität durch eine Matrix für *flache*
Felder — die verschachtelte Form (FHIR: Practitioner → Organization) ist ein eigener Zug mit
eigener Datenschutz-Abwägung. Ein halb gebautes Verschachteln wäre schlechter als keines. Die
Prüfung nimmt **beide** Hälften ab: dass `institution` draußen ist **und** dass der Export
weiterhin den Namen trägt — ohne die zweite wäre sie auch dann grün, wenn er nichts mehr lieferte.

## 7 — `pflegedienst_kontakt` entfällt (Schema 43 → 44)

Ein Institutionsfeld bleibt: **`pflegedienst`**. Beide trugen `entitaet:'institution'` im selben
Sektor — also **zweimal dieselbe Institution**, kein Institution-und-Ansprechperson-Paar. Die
Ansprechperson liegt seit §6 in „Meine Menschen", mit `aufgabe` und `institution`.

`art:'pflegedienst'` und der Hint gehen auf `pflegedienst` über; das Feld verliert nichts. Der
Claim `care_service_contact` entfällt mit — folgenlos, es gibt keinen Empfänger.
`outpatient_care_service` bleibt und ist **der präzisere Name**: „contact" liest sich wie eine
Person und ist genau das nicht. Die Cross-Sektor-Anmeldung hing bereits an `pflegedienst`.

**Die Migration überschreibt nie still.** Steht in `pflegedienst` schon etwas, bleibt es stehen
**und der Alt-Wert wird nicht verworfen** — er behält seinen Schlüssel, und das
`ALT_LABEL_REGISTER` trägt die Frage dazu. Zwei verschiedene Dienste zu einem zusammenzuziehen
wäre dasselbe Raten, gegen das U2-ADR-104 entschieden hat, und eine Migration löscht keine
Bürgerdaten. Die Stufen-Probe prüft **beide** Richtungen in einem Depot: ohne den belegten Fall
wäre „zieht um" von „überschreibt" nicht zu unterscheiden.

**Zeitfenster, dieselbe Rechnung wie §1:** solange kein fremdes Depot existiert, kostet das eine
Schemastufe; ab dem ersten Tester-Depot einen Migrationsweg. Darum jetzt.

**Ein gemessener Nebeneffekt, der die Entscheidung nicht kippt, aber benannt gehört ⟦M⟧:** die
beiden Felder lagen in **verschiedenen Sektionen**. `pflegedienst_kontakt` stand in
„Renten-, Pflege-, Sozialversicherung" auf Kern-Ebene, `pflegedienst` steht in „Schwerbehinderung
und Pflege" mit `ebene:'modul'` — also in einem `mehr`-Block, der sich erst öffnet, wenn er
gefüllt ist. Für eine Bürgerin, die den Pflegedienst noch nicht eingetragen hat, rückt die Frage
damit hinter eine Klappe in einem Abschnitt über Schwerbehinderung. Geführt als A57.

## Die Abgrenzung zu U2-ADR-104 — warum der verwandte Fall anders entschieden wurde

U2-ADR-104 §1 sagt über `wohnungsschluessel_ort`, dessen Alt-Wert Namen enthält:

> Er geht trotzdem nach `anmerkung`, **nicht** nach `person` — Freitext gehört nie ungeprüft in
> ein `ref`-Feld. Die Bürgerin verknüpft die Person selbst.

Hier geht Freitext sehr wohl in ein `ref`-Feld. **Die beiden Sätze widersprechen sich nicht —
der Unterschied liegt im Wort „ungeprüft", und er ist der ganze Punkt.**

| | U2-ADR-104 (`wohnungsschluessel_ort` → `person`) | Hier (C10 → `institution`) |
|---|---|---|
| Zielregister | **existiert schon**, gefüllt mit den Menschen der Bürgerin | ein **neuer** Eintrag entsteht |
| Was die Referenz behauptet | „Diese Sarah ist **jene** Sarah aus dem Register" | „Dieser Text ist dieser Text" |
| Was schiefgehen kann | **falsche Verknüpfung** auf einen realen Menschen | nichts — der Wert bleibt wörtlich |
| Wer kann es richtigstellen | niemand, ohne es zu bemerken | entfällt |

Eine falsche Verknüpfung ist schlimmer als keine. Genau darum verbietet U2-ADR-104 das Matchen —
und genau darum ist hier **das Matchen** verboten, nicht das Referenzieren. Wer beide Stellen
liest, findet hier den Unterschied.

**Der dritte Weg, und warum er verworfen wurde.** Ein `ref`-Feld nimmt auch `{override: <Text>}`
— Freitext ohne Register-Eintrag. Der Import-Zweig für ref-Felder erzeugt genau das
(`vivodepot.html:9098`), und die Migrationen 29→30 und 30→31 haben Alt-Strings so überführt. Es
wäre der konsistentere Weg gewesen, und er wurde trotzdem nicht genommen:

**`{override}` ist strukturell dasselbe wie der Freitext davor.** Nicht wiederverwendbar, nicht
prüfbar, nicht übersetzbar. Eine Migration dorthin hätte das Schema gehoben und nichts von dem
geliefert, wofür C10 da ist. Wo Freitext bleiben soll, ist `{override}` richtig — beim Import
etwa, wo eine fremde Datei einen Namen liefert, den niemand geprüft hat. Bei der Migration
eigener, langjährig gepflegter Daten ist es zu wenig.

**Die Abgrenzung steht nicht nur hier, sondern zweimal im Code:** als Kommentar an der Migration
selbst und — wichtiger — als **Wächter**. Die Schema-Probe zu Stufe 43 legt ein Alt-Depot an, das
bereits eine Institution mit exakt dem Namen führt, den `kv_art` als Freitext trägt. Matchte die
Migration, bliebe die Zahl der Einträge bei vier statt fünf, und die Probe würde rot. Die
Rotmachbarkeit ist gefahren ⟦M⟧: ein eingepflanztes `find(i => i.name === t)` macht genau diese
Probe rot und keine andere.

## Folgen

- **Der Import schreibt jetzt `{override}` in diese vier Felder** statt Freitext — nicht neu
  gebaut, sondern der bestehende ref-Zweig, der sie nun trifft. Drei Testerwartungen sind darauf
  nachgezogen.
- **Der Typwächter für `ref` in `sektorFeldSetzen` (A43, zweite Hälfte) ist scharf.** Ein roher
  String in einem `ref`-Feld wirft; `''` bleibt erlaubt, weil das Leeren sonst unmöglich würde.
  Positivkontrolle in `tests/fix-c10-institutionen-referenzen.test.js`, beide Richtungen und an
  einem Bestandsfeld, das C10 nicht angefasst hat — ein Wächter, der nur die vier neuen Felder
  träfe, wäre zu eng geraten.

  **Die Messung dazu ist die eigentliche Lehre.** Der erste, werfende Lauf meldete GENAU EINE
  Fundstelle — ein werfender Wächter bricht beim ersten Fund ab und verdeckt alle folgenden.
  Umhüllt und *recordierend* gemessen waren es **sieben** ⟦M⟧, alle in `tests/fixtures/persona-p3.js`.
  Vier davon schrieben eine rohe **Register-id** in ein `ref`-Feld; da `refAnzeigeName` einen
  blanken String als `override` liest (`:12691`), zeigte die Persona dort ihre **UUID** statt
  „Jonas Bodenstein-Aluko". Ein stiller Anzeigefehler, den nur diese Messung sichtbar gemacht hat
  — nicht der Wächter, den man nach dem ersten Wurf für erledigt gehalten hätte.

- **Die Grenze des Wächters ist benannt und geprüft, nicht stillschweigend.** Listen-Unterfelder
  vom Typ `ref` laufen über `listenEintragHinzufuegen` und sind **nicht** gedeckt; fünf tragen
  dort noch eine rohe Register-id (A56). Eine eigene Prüfung hält das fest und wird rot, sobald
  die Lücke geschlossen wird.
- **Ebene 16 misst 161 statt 164 Felder.** Die drei umgestellten Felder tragen jetzt Objekte, und
  Ebene 16 vergleicht nur Skalare — dieselbe Behandlung, die die zwölf übrigen ref-Felder immer
  schon hatten. Kein neuer blinder Fleck, aber eine Zahl, die sich geändert hat.

## 8 — `pflegedienst` wird sichtbar (Nachtrag zu §7, A57)

`ebene: 'modul'` ist entfernt. **§7 hat das sichtbare Feld entfernt und das versteckte behalten —
das war ein Nebeneffekt, keine Entscheidung.** Die beiden zusammengelegten Felder lagen in
verschiedenen Sektionen *und* auf verschiedenen Ebenen; wer nur auf die Feld-ids sieht, bemerkt
das nicht.

Der Fehler ist von der Sorte, die sich selbst versteckt: Modul-Felder liegen in einem
`mehr`-Block, und der **öffnet sich erst, wenn er gefüllt ist**. Wer den Pflegedienst eintragen
will, müsste ihn also finden, bevor er ihn eingetragen hat. Ein bereits gefülltes Depot sieht
dagegen völlig unauffällig aus — deshalb fiel es beim Bau nur der Messung auf und nicht der
Ansicht.

Damit steht `pflegedienst` dort, wo `pflegedienst_kontakt` stand: sichtbar, im selben Zug wie
Pflegegrad und Pflegekasse.

```konformitaet
aussage:  Ein Alt-Depot (Schema 42) mit Freitext in den vier Feldern migriert zu
          Institutions-Referenzen; jeder Alt-Text ist verlustfrei über das Register
          auffindbar, und `art` bleibt leer.
zustand:  geprüft
herkunft: invariante
pruefung: tests/migration-stufen.test.js#u2-108-jede-stufe-loest-ihre-zusage-ein
```

```konformitaet
aussage:  Die Migration matcht NIE gegen bestehende Register-Einträge — auch dann nicht,
          wenn bereits eine Institution mit exakt demselben Namen existiert. Es entsteht
          ein neuer Eintrag daneben.
zustand:  geprüft
herkunft: invariante
pruefung: tests/migration-stufen.test.js#u2-108-jede-stufe-loest-ihre-zusage-ein
```

**Zur Idempotenz, ohne eigene Klausel:** ein bereits migriertes Depot bleibt bei erneuter
Normalisierung unverändert — `_c10Neu` gibt für alles, was kein String ist, `null` zurück, und ein
Ref-Objekt wird nicht erneut umgeschrieben. Das deckt die bestehende Prüfung *3b) Idempotenz* in
`tests/schema-governance-guard.test.js` generisch ab. **Bewusst KEINE eigene Klausel darauf:** jene
Prüfung trägt keine `PROBEN`-Deklaration, und sie hier zu binden hätte sie zum gekoppelten Wächter
gemacht, ohne ihr eine Probe zu geben — eine Bindung, die den Prüfstand formal befriedigt und
inhaltlich nichts hinzufügt.

---

*Vivodepot GmbH · Berlin · 29.07.2026*
