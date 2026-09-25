# U2-ADR-287 · Was ein Template ist — und der erste Fall auf dem Pro-Modul

**Datum:** 05.09.2026 · Abschnitt 0 ergänzt 06.09.2026
**Status:** gebaut, elf Proben rot-bewiesen, Regression gegen Erbschein/Betriebssatz grün
**Status heute:** gilt
**Entscheidung:** Domänen-Wahl sowie A1
(Rollen-Vokabular, Vorstufe)
**Bezug:** U2-ADR-269 (Rollen-Vokabular, A1) · U2-ADR-243 (Pro-Modul, sechs Bereiche, angedockt)
· die Kandidaten-Rangfolge vom selben Tag (Bürgermodul- und Pro-Modul-Fassung verglichen) ·
Erbschein-Vorbereitungsauszug (`tests/fixtures/
erbschein-vorbereitung-logikmodul.json`, das erste Template, Muster für dieses)

---

## 0 · Was ein Template ist

**Klarstellung, 06.09.2026, ausdrücklich dessen, was immer galt — „nicht ‚ab
jetzt' — SCHON IMMER":**

> „Der Sinn und Zweck eines Templates ist es, das Modul um spezifische INHALTE und THEMEN zu
> ergänzen (Krisen-Notfall-Template, Notartemplate, Hebammentemplate, Justiztemplate)."

**Zwei Festlegungen, die daraus folgen und bis heute nirgends geschrieben standen:**

- **Ein Template steht nie allein.** Es setzt ein Modul voraus und ergänzt es. „Gerüst + Modul +
  Template = Produkt" — ein Template ohne Modul ist kein Produkt, sondern ein Fragment.
- **Braucht ein Template Felder, die es noch nicht gibt, gehören sie ins MODUL** — nicht in einen
  template-eigenen Speicher. Fehlende Felder sind darum kein Grund gegen ein Template: **sie sind
  sein Beitrag.** Was es kostet, ist eine Aufwandsfrage; was es beiträgt, ist sein Zweck.

**Was daraus NICHT folgt:** dass jedes Template gebaut werden muss, sobald jemand es nennt. Die
Reihenfolge, in der Templates entstehen, ist eine Produktentscheidung — dieser Abschnitt sagt, was
ein Template IST, nicht welches als nächstes kommt.

**Der Rest dieses ADR ist der erste Fall auf dem Pro-Modul.**

---

## 1 · Kontext

Die Definition of Done verlangt ein zweites, unabhängiges Template neben dem
Erbschein — Beweis, dass der Einlass für einen berufsbezogenen Fremdzweck trägt, nicht nur
einmal zufällig. Ursprünglich als „Hebammentemplate" geführt; aufgelöst:
das Beispiel war austauschbar, der Mechanismus war gemeint.

**Zwei Festlegungen bestimmten den Zuschnitt:**

1. **Vivodepot verfasst selbst** (U2-ADR-040) — kein Verbandsmaterial, eigene Prosa, eigene
   Feldauswahl, wie beim Erbschein.
2. **Das Grundprinzip, wörtlich:** „Gerüst + Modul + Template = Produkt."
   Ein erster Entwurf (Kandidaten-Erhebung, Teil A) setzte auf dem BÜRGERMODUL auf — eine
   Kundin bereitet ihren eigenen Notartermin vor. Korrigiert: gemeint
   war die BERUFSTÄTIGKEIT der Fachperson selbst, auf dem PRO-MODUL — „Pro Notar" als eigenes
   Produkt (Gerüst + Pro-Modul + Notar-Template + Rechtsraum + Sprache), analog zu „Pro Hebamme".

**Kandidatenwahl, gemessen statt geraten** (volles Dokument s. Bezug oben): das Pro-Modul
(U2-ADR-243) trägt sechs angedockte Bereiche, 54 Felder, ausschließlich Skalare oder
`listenfeld`-Container mit Text-/Datum-Unterfeldern — kein `ref`/`entitaet`-Feld. Drei
Berufsbilder verglichen (Notarin, Steuerberaterin, Hebamme) danach, wie viele der sechs
Pro-Bereiche sie ziehen. **Die Notarin-Kanzleivertretung zieht praktisch alle sechs Bereiche an
und deckt sich mit dem wörtlichen Beispiel** — Hebamme (Einzelpraxis, kein
Gesellschafter/Prokura-Rahmen) zog nur zwei.

---

## 2 · Entscheidung

**Template: „Notarin — Kanzleivertretungsfall"** (`tests/fixtures/pro-notar-kanzleivertretung-
logikmodul.json`), `sektor: 'pro-vertretung-vollmachten'`. Liest neun `datenSchema`-Einträge
über FÜNF Sektoren: vier der sechs Pro-Bereiche (`pro-vertretung-vollmachten`,
`pro-gesellschaft-nachfolge`, `pro-betrieb-zugaenge`, `pro-kontakte-vertretungsplan`) plus den
Bürgersektor `identitaet` (Kontaktfelder `telefon`/`email` — Pro sitzt ergänzend AUF dem
Bürgerdepot, das bleibt darunter vollständig vorhanden).

**Neues Datenlesen-Primitiv `listenfeldAlle`** (vivodepot.html: `LOGIK_DATEN_TYPEN`,
`_datenPrimitivLesen`, Sensibel-Schranke in `logikModulPruefen`) — der offene Punkt aus der
Kandidaten-Erhebung, ausdrücklich zum Bauauftrag erklärt:

> Die bestehende `listenfeld`-Form verlangt eine Diskriminante, die GENAU EINE Zeile trifft.
> Pro-Listen wie „Vertretungsplan" haben kein solches Merkmal — jede Zeile zählt.

`listenfeldAlle` liest EIN Unterfeld aus JEDER Zeile einer Liste, in Zeilen-Reihenfolge, leere/
fehlende Werte übersprungen — dieselbe Form wie das bestehende `personenNamen` OHNE
Diskriminante, nur ohne dessen Namens-Auflösung (der gelesene Wert ist ein roher Feldwert, kein
Personen-Verweis). Die kleinste Erweiterung, die den Fall deckt, kein neuer Blocktyp, keine
neue Engine.

Im Template dreifach eingesetzt, an DREI verschiedenen Pro-Listen: `tpl_prokura` (wer trägt
Prokura), `tpl_genehmigung_oder_berufsrechtliche_zulassung` (welche Zulassungen, welche
Fristen — zwei Unterfelder derselben Liste, zwei Einsätze), `tpl_wer_uebernimmt_welche_aufgabe`
(Vertretungsplan — Aufgaben und Personen, je eine eigene Liste). Der Erbschein bewies das
verwandte `listenfeldPersonenNamen` nur an EINER Stelle; dieses Template bewegt sich an drei
verschiedenen Listen in drei verschiedenen Bereichen — ein breiterer Beweis derselben
Mechanik-Klasse.

**Sensibel-Schranke mitgezogen:** `listenfeldAlle` liest einen rohen Feldwert (anders als
`personenNamen`/`listenfeldPersonenNamen`, die NAMEN auflösen und darum von der Schranke
ausgenommen sind) — dieselbe Prüfstelle wie beim bestehenden `listenfeld`-Typ greift jetzt auch
hier: ein `listenfeldAlle`-Eintrag gegen ein `sensibel:true`-Unterfeld wird ohne
`sensibelErlaubt:true` verworfen, benannt, nicht still übernommen.

---

## 3 · Feldsatz (Auszug — voller Bundle-Inhalt in der Fixture-Datei)

| datenSchema-Schlüssel | typ | Sektor.Feld[.Unterfeld] |
|---|---|---|
| `vertretungsregelung` | feld | `pro-vertretung-vollmachten.tpl_vertretungsregelung` |
| `prokura_inhaber` | listenfeldAlle | `pro-vertretung-vollmachten.tpl_prokura[].tpl_wer` |
| `zulassung_bezeichnung` | listenfeldAlle | `pro-betrieb-zugaenge.tpl_genehmigung_…[].tpl_bezeichnung` |
| `zulassung_frist` | listenfeldAlle | dieselbe Liste, Unterfeld `tpl_frist_ablauf` |
| `vertretungsplan_aufgabe` | listenfeldAlle | `pro-kontakte-vertretungsplan.tpl_wer_uebernimmt…[].tpl_aufgabe` |
| `vertretungsplan_person` | listenfeldAlle | dieselbe Liste, Unterfeld `tpl_person` |
| `nachfolgeklausel` | feld | `pro-gesellschaft-nachfolge.tpl_nachfolgeklausel_…` |
| `kontakt_telefon` / `kontakt_email` | feld | `identitaet.telefon` / `identitaet.email` |

Feld-Ids sind die `tpl_`-Slugs, die `_tplFeldId()` aus den in `tools/betriebssatz-inhalte.js`
festgelegten deutschen Feldnamen ableitet (z. B. „Vertretungsregelung" → `tpl_vertretungsregelung`)
— stabil, solange Vivodepot in einem Depot der erste Anbieter ist, der diesen Slug belegt (der
Regelfall; ein Namensraum-Präfix entsteht erst bei einer echten Kollision, s. `_tplFeldId`-
Kommentar im Kern).

---

## 4 · Rot-Beweis

`tests/pro-notar-kanzleivertretung-u2-adr-287.test.js` — elf Proben:

- `listenfeldAlle` steht in der geschlossenen `LOGIK_DATEN_TYPEN`-Liste.
- Liest ein Unterfeld aus jeder Zeile, überspringt eine Zeile ohne den Wert, keine Diskriminante
  nötig — gegen den nativen Sektor `vorsorge` (kein Pro-Docking nötig, isolierter Beweis).
- Gegenprobe: leere Liste → leeres Array, kein Absturz.
- `logikModulPruefen` verlangt bei `listenfeldAlle` KEINE Diskriminante (anders als
  `listenfeld`/`listenfeldPersonenNamen`).
- Sensibel-Schranke: `listenfeldAlle` gegen `finanzen.konten[].iban` (echtes `sensibel:true`-Feld)
  wird ohne `sensibelErlaubt` verworfen; MIT `sensibelErlaubt:true` angenommen.
- Das volle Bundle wird angenommen, ohne einen verworfenen Schlüssel — ÜBER den echten
  Fremdmodul-Einlass (`modulEinlassen`), nicht über einen Testpfad.
- Gegenprobe: OHNE die sechs Pro-Bereiche vorher anzudocken wird das Bundle verworfen
  (`SEKTOR_BY_ID` kennt `pro-vertretung-vollmachten` noch nicht) — beweist, dass die
  Sektor-Prüfung wirklich greift, nicht zufällig durchrutscht.
- Leeres Depot: jede Frage bleibt sichtbare Lücke (`frageAntwortOderLuecke`), kein Verschwinden.
- Volles Depot: alle drei `listenfeldAlle`-Einsätze liefern die echten, gesetzten Werte, über
  `dokumentHTML()` — der volle Render-Pfad, nicht nur `datenSchemaLesen()` isoliert.
- Das Bundle landet unsigniert im `logikModule`-Slot, wie der Erbschein (Selbst-Einlass,
  U2-ADR-181: ein Bundle bringt Daten, keinen Code).

**Regression geprüft (dieselbe Suite-Nachbarschaft, einzeln gefahren):**
`erbschein-modul-mechanik.test.js`, `siebtes-register-erbschein-byte-gleichheit.test.js`,
`betriebssatz-inhalte.test.js` — 36 Proben, alle unverändert grün. Die Sensibel-Schranken-
Erweiterung und der neue `LOGIK_DATEN_TYPEN`-Eintrag berühren keinen bestehenden Zweig.

`ladeKern()` nach jeder Änderung einzeln geprüft — kein `SyntaxError`, `SCHALEN_STAND`
korrekt bei v554 (v553 → v554, ein disjunkter Bump).

---

## 5 · Ein Baufehler unterwegs, korrigiert vor dem ersten Testlauf

Die Fixture-Datei enthielt zunächst `„Betriebsübergabe"` und `„Aufgabe"`/`„Person"` mit einem
ASCII-`"` statt des typografischen schließenden Anführungszeichens als Abschluss der deutschen
Anführung — innerhalb eines JSON-Strings bricht das die Zeichenkette vorzeitig ab
(`JSON.parse`: „Expected ',' or ']' after array element"). Gefangen durch `JSON.parse()` vor dem
ersten `modulEinlassen()`-Aufruf, nicht durch eine Vermutung — dieselbe Fehlerklasse wie die in
U2-ADR-269 dokumentierte Stray-Newline-Falle, hier an einer JSON-Fixture statt an einem
JS-Kommentar. Kein Produktcode betroffen, keine Verhaltensänderung — reine Bau-Notiz.

---

## 6 · Bewusst nicht Teil dieses Pakets

- **Aufgabe/Person nicht paarweise zusammengeführt.** `vertretungsplan_aufgabe` und
  `vertretungsplan_person` sind zwei GETRENNTE Listen (gleiche Zeilen-Reihenfolge, keine
  automatische „Zeile i gehört zu Zeile i"-Verknüpfung im Rendering). Eine echte
  Zeilen-Zusammenführung (`listenfeldAlleVerbunden` o. ä., mehrere Unterfelder pro Zeile zu
  EINEM String kombiniert) wäre eine zweite, größere Erweiterung — die Erhebung hatte
  ausdrücklich nach der KLEINSTEN Erweiterung gefragt, die den Fall deckt. Im Fixture-Text selbst
  benannt, nicht verschwiegen.
- **Kein signierter Submission-Durchlauf für die Pro-Testdaten.** Die Tests setzen
  `data.sektoren['pro-…']` direkt (wie Erbscheins eigene „Daten"-Tests `data.sektoren.vorsorge`
  direkt setzen) statt über `baueSubmissionSigniert`/`stelleProviderCredentialAus` zu gehen — der
  volle signierte Pro-Docking-Weg ist bereits unabhängig durch `betriebssatz-inhalte.test.js`
  bewiesen (Ende-zu-Ende-Kette, alle 54 Felder), eine zweite Kopie hier hätte nichts Neues
  gezeigt.
- **`csv@1`/`vcard-erste@1`-Format-Schreiber** und die vier angehaltenen Pro-Situationen
  (U2-ADR-243 Teil 2) bleiben unberührt — außerhalb des Auftrags.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
