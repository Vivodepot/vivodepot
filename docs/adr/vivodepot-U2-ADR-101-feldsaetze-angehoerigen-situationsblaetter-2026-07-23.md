# U2-ADR-101 — Feldsätze der Angehörigen-Situationsblätter werden festgelegt

**Status:** Angenommen (2026-07-23)
**Datum:** 23.07.2026
**Linie:** U2
**Bezug:** U2-ADR-012 (wird für diesen Bereich abgelöst), B16-ADR-061v3
(enumerierte Feldsätze, älter), U2-ADR-060 (Entwurf, deckt nur zwei Blätter),
ADR-061v3 / U2-ADR-062 (Angehörigen-Eintritt, fünf Kacheln), U2-ADR-098
(Format der Konformitätsklausel), U2-ADR-157 (21.08.2026, später — erlaubt ein
gehobenes Fremdfeld auf jedem der fünf Blätter; nachträglich verknüpft am
30.08.2026, s. Nachtrag im Konformitäts-Abschnitt — beide ADRs hatten einander
bis dahin nie referenziert), Felderhebung vom 23.07.2026 gegen Commit
`54c8c82`
**Status heute:** gilt — die erste Konformitätsklausel steht weiter auf `zustand: offen` (Frist 2026-09-30, Bedingung Vorsorge-Umbau noch nicht erfüllt). Die zweite ist seit dem 30.08.2026 `zustand: prüfbar` (Bedingung Prüfstand mit Orakel erfüllt, U2-ADR-099) — siehe Nachtrag im Konformitäts-Abschnitt.

---

## Kontext

Für die fünf Angehörigen-Situationsblätter gibt es heute keinen Ort, an dem
steht, welche Felder ein Blatt tragen darf.

Die Erhebung vom 23.07. hat die Lage gemessen: Die Feldsätze sind vollständig
nur in der älteren, teils überholten B16-ADR-061v3 enumeriert. Die aktuelle
U2-ADR-060 ist Entwurf und deckt Blatt 2 und, per Verweis, Blatt 4. Für die
Blätter 1, 3 und 5 nennt keine ADR eine Feldliste. U2-ADR-012 hält
ausdrücklich fest, dass der Zuschnitt bewusst dem Code überlassen bleibt.

**Die Folge ist nicht nur dokumentarisch.** Eine Prüfung, die feststellen
soll, ob ein Blatt trägt, was es tragen darf, hätte nichts, wogegen sie
vergleicht. Sie würde den Code gegen sich selbst halten und wäre immer grün —
eine der vier belegten Test-Pathologien.

---

## Was das Zugangsmodell für den Zuschnitt bedeutet

Es gibt **ein** Angehörigen-Passwort und **eine** Sicht. Verschiedene
Passwörter je Vertrauensperson sind nicht vorgesehen und sollen es nicht
werden.

Wer Zugang hat, ist damit bereits drin. Ein knapper Feldsatz schützt niemanden
vor jemandem, der ohnehin Zugang hat — er nimmt nur denen etwas weg, die die
Angaben in einer Ausnahmesituation brauchen. **Die Blätter zeigen deshalb, was
für die Situation gebraucht wird, nicht möglichst wenig.**

Daraus folgt der Zweck der späteren Prüfung, und er ist ein anderer als bei
den Ausgabewegen, auf denen Daten das Gerät verlassen: **Sie ist ein
Verdrahtungs-Wächter, kein Leck-Wächter.** Sie schlägt an, wenn ein Feld auf
einem Blatt landet, das dort nie vorgesehen war — der Fall vom 22.07., als ein
Wizard auf das Instrument eines anderen Moduls zeigte.

Diese Unterscheidung gilt nur hier. Für PDF, Export, Druck und QR bleibt die
Erlaubnisliste eine Leck-Grenze mit anderem Gewicht.

---

## Entscheidung 1 — Feldsätze werden festgelegt

Der Feldsatz eines Angehörigen-Situationsblattes ist eine Entscheidung und
wird als solche aufgeschrieben. Er bleibt nicht dem Code überlassen.

**U2-ADR-012 wird hiermit für den Bereich der Angehörigen-Situationsblätter
abgelöst.** Alle übrigen Aussagen von U2-ADR-012 bleiben unberührt; die
Ablösung ist dort zu vermerken.

Ein Feldsatz gilt gleichermaßen für jede Form, in der das Blatt ausgegeben
wird. Entsteht später ein Druck- oder Dateiweg für diese Blätter — heute
existiert keiner —, trägt er denselben Satz und nicht mehr.

---

## Entscheidung 2 — Blatt 3, Beerdigung und Nachlass

Das Blatt „Beerdigung und Nachlass" trägt genau diese sieben Felder, in dieser
Reihenfolge:

| # | Feld | Beschriftung | Bereich |
|---|---|---|---|
| 1 | `persoenliches/bestattung_art` | Bestattungsart | Persönliches |
| 2 | `persoenliches/bestattung_unternehmen` | Bestattungsunternehmen | Persönliches |
| 3 | `persoenliches/bestattung_ort` | Gewünschter Ort / Grab / Urnenstätte / Friedhof | Persönliches |
| 4 | `persoenliches/bestattung_voraus` | Bestattung bereits vorausgeplant? | Persönliches |
| 5 | `persoenliches/bestattung_vorsorge_nachweis` | Vorsorgevertrag — Ablageort | Persönliches |
| 6 | `meine-menschen/menschen` | Menschen, die mir wichtig sind — **vollständiges Register** | Personen-Register |
| 7 | `persoenliches/brief_todesfall` | Brief beziehungsweise Briefe für den Todesfall — **vollständig lesbar** | Persönliches |

**Dies ist der heutige Ist-Zustand, unverändert bestätigt.** Kein Feld wird
gestrichen, keines ergänzt. Das ist eine Entscheidung, keine Feststellung: Sie
folgt aus dem Zugangsmodell oben.

**Ausdrücklich mit entschieden:**

- Feld 6 steht **vollständig** auf dem Blatt, nicht nach Rolle gefiltert und
  nicht auf Name und Erreichbarkeit verkürzt. Wer eine Bestattung organisiert,
  muss erreichen können, wer zu benachrichtigen ist — eine Filterung würde
  denen etwas nehmen, die es brauchen, ohne jemanden zu schützen.
- Feld 7 ist **ohne weitere Schranke lesbar**, sobald das Blatt geöffnet ist.
  Dasselbe Argument.
- **Leere Felder bleiben sichtbar** („nicht hinterlegt"). Das Blatt zeigt
  immer seinen vollen Rahmen. So ist erkennbar, dass eine Angabe fehlt, statt
  dass sie unbemerkt fehlt.

---

## Nicht Teil dieser Entscheidung

- **Blätter 1, 2 und 4.** Der Vorsorge-Umbau bewegt dort gerade Felder. Sie
  werden nach dessen Abschluss auf demselben Weg festgelegt.
- **Blatt 5 „Meine Menschen".** Sein Zweck ist nicht auffindbar beschlossen.
  Ein Feldsatz ohne begründeten Zweck wäre eine Festschreibung ohne Grundlage.
- **Die Doppelung der Vorsorge-Instrumente** auf drei Blättern.
- **Ob ein Feld für eine über den Tod hinaus geltende Vollmacht existieren
  soll.** Offene Produktfrage beim Bau-Strang.
- **Die Aufteilung zwischen Blatt 3 und Blatt 4.** Der volle Nachlass-Umfang
  liegt heute bei Behörden.
- **Erlaubnislisten für Ausgabewege, die das Gerät verlassen.** Andere Sorte,
  eigener Vorgang.

**Vorbehalt:** Ergibt die offene Frage zur Vollmacht ein zusätzliches Feld,
ändert sich der Satz von Blatt 3 nachträglich. Das wäre eine Änderung an
diesem ADR, kein stiller Nachtrag im Code.

---

## Konformität

```konformitaet
aussage:   Die Deklaration des Blattes "Beerdigung und Nachlass" führt genau
           die sieben in diesem ADR benannten Felder, in dieser Reihenfolge.
zustand:   offen
frist:     2026-09-30
bedingung: Vorsorge-Umbau geschlossen
quelle:    entscheidung
```

*Diese Prüfung liest die Deklaration im Quelltext und vergleicht sie mit
dieser Liste. Sie braucht weder Prüfstand noch Browser und ist deshalb früh
zu haben.*

```konformitaet
aussage:   Die ausgegebene Sicht des Blattes "Beerdigung und Nachlass" enthält
           im eingebauten Teil kein Feld außerhalb der sieben benannten.
zustand:   prüfbar
pruefung:  tests/adr-101-blatt3-eingebaute-sicht.test.js#[ADR-101·Sicht] Blatt "Beerdigung und Nachlass"
pruefung:  tests/adr-101-blatt3-eingebaute-sicht.test.js#[ADR-101·Sicht·Heben-Trennung]
quelle:    entscheidung
```

*Die zweite Prüfung ist die eigentliche. Die erste sichert die Deklaration,
die zweite das, was tatsächlich herauskommt — dazwischen liegt der Weg vom
Modell zur Anzeige, auf dem der Fehler vom 22.07. entstand.*

### Nachtrag 30.08.2026 — die Bedingung ist erfüllt, und ein Fund vor dem Bau

Der Prüfstand mit Orakel (U2-ADR-099) steht seit dem 26.07.2026. Die Bedingung
der zweiten Klausel ist damit erfüllt; sie wurde verdrahtet.

**Der Fund, der dem Bau vorausging, nicht nur die Verdrahtung selbst:** U2-ADR-157
(21.08.2026 — später als dieses ADR) erlaubt der Bürgerin ausdrücklich, ein von
einem Modul vorgeschlagenes Fremdfeld auf JEDES der fünf Angehörigen-Blätter zu
heben, Blatt 3 eingeschlossen — keine Ausnahme in ADR-157s geschlossener
Werteliste. **ADR-101 und ADR-157 hatten einander nie referenziert** — keins
der beiden ADRs nennt das andere, und die Spannung zwischen „genau diese sieben
Felder" und „die Bürgerin darf ein achtes heben" wurde vor der Verdrahtung
dieser Klausel nie gegeneinander gehalten. Wörtlich genommen ist die
Klausel-Aussage seit dem 21.08. falsch, sobald irgendwer einmal hebt — nicht
durch einen Bug, sondern durch eine spätere, bewusste, weiterhin geltende
Entscheidung.

**Die Präzisierung:** Die Aussage ist auf den EINGEBAUTEN Teil der Sicht
gescopt (die `bloecke` aus `_ANG_SITUATIONEN`, vor einem etwaigen
Gehoben-Abschnitt) — keine stille Einschränkung, sondern dieselbe Trennung, die
ADR-157 selbst schon strukturell eingeführt hat: das Gehobene steht in einem
eigenen Abschnitt am Ende („Von Ihnen dazugenommen"), ausdrücklich nicht
zwischen die eingebauten Blöcke gemischt. Die Klausel-Aussage oben trägt „im
eingebauten Teil" seit diesem Nachtrag deshalb wörtlich im Text, nicht nur in
der Prüfung. Der zweite `pruefung:`-Eintrag belegt die Trennung selbst: ein
gehobenes Fremdfeld erscheint, aber nachweisbar NACH der Sieben-Felder-Grenze.

---

## Folgen

- Blatt 3 hat als erstes einen aufgeschriebenen Feldsatz. Die vier übrigen
  folgen nach demselben Muster.
- U2-ADR-060 (Entwurf) und B16-ADR-061v3 verlieren für Blatt 3 ihre Rolle als
  Feldsatz-Quelle. Bei der Festlegung der übrigen Blätter ist zu klären, was
  mit dem Rest beider Dokumente geschieht.
- Die Zahl der Blätter mit und ohne aufgeschriebenen Feldsatz wird zählbar
  und gehört in den Selbstbericht.

---

*Vivodepot GmbH · Berlin · 23.07.2026*
