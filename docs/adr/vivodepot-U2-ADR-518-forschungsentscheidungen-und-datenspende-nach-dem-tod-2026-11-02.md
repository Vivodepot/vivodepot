# U2-ADR-518: Forschungsentscheidungen und Datenspende nach dem Tod

**Status:** Angenommen (02.11.2026)
**Datum:** 02.11.2026
**Kategorie:** BEREICHE
**Linie:** U2
**Status heute:** gilt — die Probe `tests/forschungsentscheidungen-und-datenspende-tod.test.js` hält es.
**Bezug:** U2-ADR-199 (Organspende-Register-ID, ein Feld ohne Hinweis) · U2-ADR-279 (die Vorsorge-Liste über ihre Rolle) ·
U2-ADR-440 (Festlegungen der Patientenverfügung als Kennungen) · U2-ADR-096 §5 (Notfall-Allowlist) · U2-ADR-466 (Vorsorge im IPS)

## Frage

Wer in eine Studie, in eine Biobank oder in die breite Einwilligung einer Universitätsklinik eingewilligt hat, oder wer der Nutzung
seiner ePA-Daten widersprochen hat, findet dafür im Depot keinen Platz. Ebenso fehlt eine Angabe, ob die eigenen Gesundheitsdaten nach
dem Tod der Forschung dienen sollen. Die Organspende hat diesen Platz an der Patientenverfügung schon. Am 01.11.2026 wurde beides
entschieden („Alles ja“).

## Entscheidung

1. **Gesundheit: eine Liste `health.researchDecisions`.** Acht Unterfelder: Art der Entscheidung (`kind`: breite Einwilligung,
   Studienteilnahme, Biobank, Widerspruch gegen die Nutzung der ePA-Daten zu Forschungszwecken, Widerspruch nach dem Europäischen
   Gesundheitsdatenraum (ab 2029), Datenspende-App, Sonstiges), Stelle, Datum der Erklärung (nicht in der Zukunft), Umfang, gilt bis, gespeichert bis, Widerrufsweg und Stand (gilt,
   teilweise widerrufen, widerrufen). Umfang und beide Fristen entfallen bei einem Widerspruch (`verborgenWenn`). Die Zeile fasst Art,
   Stelle und Stand zusammen. Die Liste steht auf der Ebene `modul` wie die Operationen. Der Hinweis der Liste erklärt gesetzlich
   Versicherten die Nutzung der ePA-Daten und den Widerspruch (§ 363 SGB V); der Hinweis am Widerrufsweg unterscheidet den Widerruf
   einer Einwilligung, der für die Zukunft gilt, von der Rücknahme eines Widerspruchs.
2. **Vorsorge: Datenspende nach dem Tod an der Patientenverfügung.** Fünf Unterfelder in `advanceCare.provisionInstruments`, direkt nach
   der Organspende: die Entscheidung (`ja`, `teil`, `nein`, `vertrauensperson`, dieselben Werte wie die Organspende, die Familie wird zur
   benannten Vertrauensperson), was gespendet wird (bei `teil`), Ausschlüsse (nicht für Unternehmen, nicht außerhalb der EU; bei `ja`
   und `teil`), die Vertrauensperson als Personen-Verweis (bei `vertrauensperson`) und wo die Daten liegen (bei `ja`, `teil`,
   `vertrauensperson`). Die Entscheidung steht nur in der Zeile „Patientenverfügung“ (`sichtbarWenn instrument = living-will`).
   Die vier Folgefelder tragen zusätzlich `verborgenWenn` mit allen anderen Instrumentarten der Vorlage: Wird das Instrument einer
   Zeile umgestellt, verschwinden sie mit der Entscheidung, auch wenn diese noch einen Wert trägt. Keines der fünf Felder steht im
   Kern der Zeile; sie tragen dieselbe Ebene wie die Organspende.
3. **Alles sensibel.** Jedes neue Feld und Unterfeld trägt `sensibel: true` (Gesundheitsdaten nach Art. 9 DSGVO; schon das Dasein
   einer Studienteilnahme sagt etwas über die Person). Sie stehen in `tools/w3-sensibel-grundlinie.json`, Gruppe A.
4. **Nicht im Notfall, nicht im IPS.** Keines der Felder kommt auf die Notfall-Allowlist (`NOTFALL_KERN_FELDER`) oder in den
   FHIR-IPS-Export. Im Notfall lebt die Person, und für ihre Versorgung braucht es keine Forschungsentscheidung. Eine Abbildung als
   FHIR `Consent` wäre eine eigene Entscheidung.
5. **Kein Assistent.** Die Datenspende kommt nicht in den Assistenten der Patientenverfügung. Sie ist keine Festlegung der
   Patientenverfügung, und U2-ADR-440 verlangte dafür eine neue Kennung im Dokumentmodul.
6. **Hinweistexte nach dreifacher unabhängiger Quellenprüfung.** Die Hinweise zur Datenspende und zu den Datenorten haben drei
   Prüfungen durchlaufen, deren Prüfer den Text nicht geschrieben hatten. Jede hat die Normen am Original gelesen. Eine weitere
   Prüfung hat die englische Fassung gegen die deutsche gelesen. Anders als U2-ADR-199 trägt dieses Feld einen Hinweis,
   denn ein „nein“ hier verhindert die gesetzliche Datennutzung nicht. Das sagt der Hinweis.
7. **Die Vertrauensperson hängt an der Ereignis-Achse.** Sie reagiert wie die Personen der Patientenverfügung auf `familienstand` und
   `tod` (`EREIGNIS_ACHSE_FELDER`, `ereignisse`): Heiratet oder trennt sich die Person, oder stirbt sie, ist die Benennung zu prüfen.
   `betreuung` und `geburt` lösen nichts aus.

## Rechtslage, auf der die Hinweise stehen

- Für eine Datenspende nach dem Tod gibt es bisher keine Regelung wie den Organspendeausweis und kein Register (§§ 2, 2a TPG zum
  Vergleich; § 363 Abs. 8 SGB V kennt nur die informierte Einwilligung der versicherten Person für ein bestimmtes Vorhaben oder bestimmte
  Forschungsbereiche). Eine allgemeine Stelle, die Daten Verstorbener
  auf eine private Erklärung hin annimmt, ist nicht bekannt; das Forschungsdatenzentrum Gesundheit erhält Daten nur über die
  gesetzlichen Lieferwege (§§ 303b, 303d, 363 Abs. 2 SGB V).
- Seit August 2026 können Universitätskliniken eine Einwilligung zur Obduktion mit Forschungsdatennutzung anbieten (Meldung der
  Medizininformatik-Initiative vom 12.08.2026).
- Abrechnungsdaten gesetzlich Versicherter gehen ohne Widerspruchsrecht an das Forschungsdatenzentrum (§ 303b Abs. 1 SGB V);
  ePA-Daten bei Nichtwiderspruch (§ 363 Abs. 1, 2, 5 SGB V), nur in der gesetzlichen Krankenversicherung (§ 362 Abs. 1 SGB V).
- Erben und nächste Angehörige haben ein Einsichtsrecht in die Behandlungsakte, wenn der Wille der verstorbenen Person nicht
  entgegensteht (§ 630g Abs. 3 BGB). Die Krankenkasse löscht die ePA in der Regel zwölf Monate nach Kenntnis des Todes, außer bei nachgewiesenen
  berechtigten Interessen Dritter (§ 344 Abs. 6 SGB V).

## Wiedervorlage

- Der Satz zum Beginn der ePA-Übermittlung („voraussichtlich zwischen Mitte Dezember 2026 und Anfang 2027“) ist eine Planangabe.
  Er und der Stand des Gesetzentwurfs GeDIG kommen am **31.03.2027** wieder vor: Die Probe trägt die Rechtslage-Marke
  `datenspende-nach-dem-tod-hinweis`, und das Register der Rechtslage-Stände führt sie mit dieser Wiedervorlage.
- Tritt § 4 Abs. 2 GDNG-E (GeDIG, BR-Drs. 448/26) in Kraft, der Erben einen Widerspruch ausdrücklich verwehren würde, ist der Hinweis
  zur Datenspende vor dieser Frist neu zu prüfen.

## Folgen

- Neue Unterfelder und die Liste stehen in `tools/bestand-zuwachs-seit-einfrieren.js` mit dieser Nummer.
- Texte DE und EN in allen vier Produkten; Pro bekommt dieselben Texte, keine eigenen Felder.
- Die Gliederung im Bereichsgerüst (Fachgruppe „Forschung“ in Gesundheit, Dokument-Karte „Einwilligungen zur Forschung“) kommt mit der
  Deklaration des jeweiligen Bereichs, nicht mit dieser Entscheidung.

## Abgelehnt

- **Eine Marke `laeuftAb` an „gilt bis“.** Das Prüfblatt kennt keinen Filter für sensible Felder. Ob eine sensible Liste dort erscheinen
  darf, wird eigens entschieden.
- **Ein Dokument-Beleg je Forschungsentscheidung.** Dafür müsste die Ereignis-Achse über die Vorsorge-Liste hinaus Zeilen adressieren.
- **„Familie entscheidet“ als Option.** Die Entscheidung nennt die benannte Vertrauensperson.

```konformitaet
aussage:  Die Liste health.researchDecisions trägt genau acht sensible Unterfelder mit den festgelegten Optionen.
zustand:  geprüft
herkunft: U2-ADR-518 (02.11.2026)
pruefung: tests/forschungsentscheidungen-und-datenspende-tod.test.js#[U2-ADR-518·Liste] health.researchDecisions: acht Unterfelder, Typen, Optionen, alle sensibel, Ebene wie operationsProcedures
```

```konformitaet
aussage:  Die fünf Felder der Datenspende nach dem Tod stehen nach der Organspende, sind sensibel, nur bei der Patientenverfügung sichtbar (die vier Folgefelder auch nach einem Wechsel des Instruments nicht) und keines im Kern.
zustand:  geprüft
herkunft: U2-ADR-518 (02.11.2026)
pruefung: tests/forschungsentscheidungen-und-datenspende-tod.test.js#[U2-ADR-518·Vorsorge] fünf Felder direkt nach organDonationRegister, sensibel, nur bei living-will, keines mit Ebene kern
```

```konformitaet
aussage:  Keines der neuen Felder steht auf der Notfall-Allowlist oder im FHIR-IPS-Export.
zustand:  geprüft
herkunft: U2-ADR-518 (02.11.2026)
pruefung: tests/forschungsentscheidungen-und-datenspende-tod.test.js#[U2-ADR-518·IPS] mit Freigabe der sensiblen Felder: weder Forschungsentscheidung noch Datenspende im FHIR-IPS-Export
```

```konformitaet
aussage:  Der Hinweis zur Datenspende nennt in DE und EN die Datennutzung für gesetzlich Versicherte und dass die Angabe den Widerspruch nicht ersetzt.
zustand:  geprüft
herkunft: U2-ADR-518 (02.11.2026)
pruefung: tests/forschungsentscheidungen-und-datenspende-tod.test.js#[U2-ADR-518·Hinweis] Datenspende und Datenorte: der geprüfte Wortlaut, DE und EN, mit dem Satz zur gesetzlichen Krankenversicherung
```
