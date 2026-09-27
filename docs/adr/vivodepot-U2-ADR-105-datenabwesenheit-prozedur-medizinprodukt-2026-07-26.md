# U2-ADR-105: `dataAbsentReason` für undatierte Prozeduren und Medizinprodukte

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** KONFORMITÄT, ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-104 (Skalar→Liste, erzeugte den Procedure-Defekt) · U2-ADR-076 (FHIR-Renderer) ·
U2-ADR-098/099 (Klausel-Format, Prüfstand)
**Anker:** Messung `dataabsentreason-validator-messung-2026-07-26.md` — offizieller HL7-Validator
**6.9.12**, lokal und offline, mit `hl7.fhir.uv.ips#2.0.0` + `hl7.fhir.eu.eps#1.0.0-ballot`
**Status heute:** gilt — Beleg `tests/fhir-daten-abwesend.test.js`, `tests/n2-zug1-ips-nilknown-waechter.test.js`.

---

## Kontext

Zwei Stellen erzeugten Aussagen, die nicht stimmten.

**1 — Undatierte Prozedur ergab ein ungültiges Bundle.** U2-ADR-104 machte `voroperationen` zur
Liste; hat ein Eintrag kein Jahr, ließ der Generator `performed[x]` **ganz weg**, mit der Begründung
„nicht raten". Am Validator gemessen:

> „`Procedure.performed[x]`: mindestens erforderlich = 1, aber nur gefunden 0"

`performed[x]` ist **min=1** — in `Procedure-uv-ips` **1.1.0 und 2.0.0** und in `procedure-eu-eps`
gleichermaßen. Die Gültigkeit hängt **nicht** am gesetzten Profil. Und es ist kein Randfall: der
Anamnese-Wizard fragt nur nach dem Eingriff, nicht nach dem Jahr — **jede** über den Wizard angelegte
Operation erzeugte diese Instanz.

**2 — Die Medizinprodukte-Sektion behauptete das Gegenteil des Depots.** `deviceRefs` war hart `[]`;
die Sektion sagte **immer** „Keine Medizinprodukte hinterlegt", auch bei gefülltem `implantate`. Das
war seit dem 14.07. als offene Frage markiert (`DeviceUseStatement.timing[x]` ist Pflicht — hier
nachgemessen und **bestätigt** —, `implantate` hat kein strukturiertes Datum). Als offene Frage war
das richtig; als Dauerzustand ist es eine **falsche Aussage in einem medizinischen Dokument**, kein
Weglassen.

## Entscheidung

Beide Stellen nutzen die FHIR-Standard-Extension
`http://hl7.org/fhir/StructureDefinition/data-absent-reason` mit `valueCode: 'unknown'`, gesetzt als
Primitiv-Erweiterung (`_performedDateTime`, `_timingDateTime`).

**Das Pflichtelement ist vorhanden, sein Wert ist ausdrücklich als unbekannt vermerkt.** Die alte
Absicht bleibt vollständig erhalten — **es wird nichts geraten**. Sie bekommt nur die Form, die das
Profil verlangt. Ein Datum aus „seit 2019" zu ziehen wäre dieselbe Klasse Fehler wie das verbotene
Semikolon-Parsen; ein Platzhalter-Datum wäre schlimmer.

Die Regel steht **einmal** (`_datenAbwesend()`) und wird von beiden Stellen gerufen — zwei Kopien
wären zwei Regeln.

**Medizinprodukte:** ist `implantate` gefüllt, entsteht ein `Device` (Freitext in `type.text`) und ein
`DeviceUseStatement` mit `timing[x]`/`dataAbsentReason`. **Ein** Eintrag aus dem ganzen Freitext,
**kein** Splitten — dieselbe Begründung wie früher bei `voroperationen`. Ist `implantate` leer, bleibt
es beim `emptyReason`; dann stimmt die Aussage. **`implantate` selbst bleibt unangetastet** — kein
Datenmodell-Eingriff, kein Schema-Bump.

## Konsequenzen

Belege aus dem Lauf: das Bundle **aus dem gebauten Generator** validiert mit **0 Fehlern und
0 Warnungen** — sowohl mit gefülltem als auch mit leerem `implantate`.

Drei Negativkontrollen zeigen, dass dieses Grün ein Urteil ist und kein Durchwinken: ein Bundle ohne
`Patient.name` fällt (15 Fehler); ein erfundener Extension-URL fällt („ist nicht bekannt, and hier
nicht erlaubt"); ein `data-absent-reason` mit einem Code außerhalb des ValueSets fällt ebenfalls. Der
Validator prüft die Extension **inhaltlich**, URL und Code.

**Zwei Tests hielten die falschen Formen fest** und sind umgeschrieben: `tests/fhir-ips.test.js`
pinnte „ohne Jahr KEIN performed*" und „Medizinprodukte-Sektion bleibt IMMER leer". Beide tragen jetzt
die Messung als Begründung.

**Offen, nicht hier gebaut:** die Konformitäts-Suite stand auf 22/0 grün, während das Produkt ungültige
Bundles erzeugte — sie prüft Krypto, Offline-Garantie und WCAG, aber nicht gegen die echten
FHIR-Profile. Dass der offizielle Validator lokal und offline läuft, ist mit diesem Lauf belegt; eine
Profil-Validierung in der Suite ist damit baubar. Eigener Posten, Produktentscheidung.

**Ungemessen:** ob xShare diesen Weg **inhaltlich** will — technisch trägt er, ob ein Empfänger ein
Bundle mit `dataAbsentReason` als brauchbar ansieht, ist eine andere Frage. Gemessen ist der offizielle
HL7-Validator, nicht die Gazelle-Instanz. `hl7.fhir.eu.eps` ist ein **Ballot**-Stand — die
Kardinalitäten können sich mit dem finalen Release ändern.

## Konformität

```konformitaet
aussage:  Ein Prozedur-Eintrag ohne Jahr trägt `performed[x]` mit dataAbsentReason
          `unknown` — das Pflichtelement ist vorhanden, sein Wert ausdrücklich unbekannt.
          Ohne die Extension wäre das gesamte Bundle ungültig (min=1 in beiden Profilen).
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-daten-abwesend.test.js#u2-105-procedure-ohne-jahr-traegt-datenabwesenheit
```

```konformitaet
aussage:  Ein Prozedur-Eintrag mit sauberem Vierstellen-Jahr trägt `performedDateTime`
          und KEINE Abwesenheits-Extension — beides zugleich wäre widersprüchlich.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-daten-abwesend.test.js#u2-105-procedure-mit-jahr-traegt-das-datum
```

```konformitaet
aussage:  Ist `implantate` gefüllt, erscheint es in der Medizinprodukte-Sektion; ist es
          leer, trägt die Sektion `emptyReason` und es entsteht kein leeres Device.
          Das Dokument behauptet nie das Gegenteil des Depots.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-daten-abwesend.test.js#u2-105-medizinprodukte-sektion-zeigt-vorhandene
```

```konformitaet
aussage:  Aus Freitext wird kein Datum geraten — „seit 2019" erzeugt keinen
          `timing`-Wert und kein `performedDateTime`.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-daten-abwesend.test.js#u2-105-kein-geratenes-datum-aus-freitext
```

## Stück 2 (Auftrag „Drei Verdrahtungen", 08.08.2026) — `emptyReason` einer leeren Sektion

**Ein drittes, verwandtes, aber eigenständiges Problem in derselben Fehlerklasse.** Stück 1
handelte von einem PFLICHTELEMENT, dessen Wert unbekannt ist (`performed[x]`/`timing[x]`, gelöst
über die `data-absent-reason`-EXTENSION). Dieses Stück handelt von etwas anderem: dem
`emptyReason`-CodeableConcept einer LEEREN IPS-Pflichtsektion (`List.emptyReason`, eigenes
CodeSystem `list-empty-reason`) — ein anderes FHIR-Konstrukt, dieselbe Wahrhaftigkeitsfrage.

**Der Fund:** `sektion()` in `fhirIpsBundle` setzte für jede leere Sektion unbedingt
`code: 'nilknown', display: 'Nil Known'`. Im Sinn des CodeSystems bedeutet „Nil Known" **nicht**
„nichts erfasst", sondern „die Prüfung fand statt, und es gibt nachweislich keine" — dieselbe
Übersteigerung wie ein erfundenes Datum, nur an der Sektions- statt der Feld-Grenze. Eine
Bürgerin, die das Allergienfeld nie ausgefüllt hat, erklärte damit gegenüber medizinischem
Personal ausdrücklich, dass keine Allergien bestehen.

**Drei Zustände, nicht zwei:** nichts erfasst · erfasst und leer · geprüft und nachweislich keine.
Nur der dritte darf `nilknown` tragen — und dafür braucht es ein Feld, mit dem die Bürgerin das
AUSDRÜCKLICH bestätigt („Ich habe keine Allergien" als eigene, positive Aussage, nicht nur ein
leeres Textfeld). **Ein solches Feld existiert heute in keinem der fünf betroffenen Bereiche**
(Allergien, Medikation, Diagnosen, Operationen, Medizinprodukte) — jede heute leere Sektion ist
darum im Zustand „nichts erfasst", nie „nachweislich keine".

**Entscheidung:** `code: 'notasked', display: 'Not Asked'` — „die Erhebung fand nicht statt,
keine bestätigte Aussage". Trifft den heutigen Zustand exakt, ohne etwas zu behaupten, das nicht
gilt. Kein Validator-Lauf für dieses Stück (keine JRE in dieser Sitzung verfügbar, s.
`tests/konformitaet/externe-validatoren.mjs`) — `notasked` ist wie `nilknown` ein regulärer,
gültiger Code desselben, vom offiziellen Validator bereits als struktur-korrekt bestätigten
CodeSystems (Stück 1 belegt die Extension-Mechanik inhaltlich, nicht diese einzelne Codewahl);
die Prüfung hier ist auf Code-Ebene, nicht am externen Validator.

**Offen, nicht hier gebaut:** ein Feld „ausdrücklich keine [X]" je Sektion wäre der Weg zu einem
ECHTEN `nilknown`-Zustand — eigener Bau-Zug, eigene UX-Entscheidung (fünf neue Ja/Nein-Fragen im
Formular), nicht Gegenstand dieser Verdrahtungs-Reparatur.

**Wächter:** `tests/n2-zug1-ips-nilknown-waechter.test.js` — für alle fünf Sektionen geprüft,
dass eine leere Sektion nie `nilknown` trägt; Regel-18-Beleg über einen Kindprozess-Mutanten
(`tools/_n2-zug1-nilknown-probe.js`, rot gegen den alten Zustand, grün gegen den echten Kern).

```konformitaet
aussage:  Eine leere IPS-Pflichtsektion trägt `emptyReason` mit dem Code `notasked`
          („Not Asked"), nie `nilknown` — die Bürgerin hat nie ausdrücklich „keine [X]"
          bestätigt, nur nichts eingetragen. Gilt für alle fünf betroffenen Sektionen
          (Allergien, Medikation, Diagnosen, Operationen, Medizinprodukte).
zustand:  geprüft
herkunft: invariante
pruefung: tests/n2-zug1-ips-nilknown-waechter.test.js#alle fünf leeren IPS-Sektionen tragen
```

---

*Vivodepot GmbH · Berlin · 26.07.2026 (Stück 2: 09.08.2026)*
