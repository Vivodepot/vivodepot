# U2-ADR-466: Vollmacht und Patientenverfügung im IPS/EPS-Export

**Status:** Angenommen — Zielform `consent-eu-eps` entschieden und gegengelesen am 01.10.2026; Ablageort,
Umfänge und Form abgestimmt am 01.10.2026
**Datum:** 01.10.2026
**Kategorie:** INTEROPERABILITÄT, STANDARDS, GESUNDHEIT
**Linie:** U2
**Bezug:** U2-ADR-452 (Vertretung als RelatedPerson) · U2-ADR-458 (Sprache des IPS-Begleittexts) · U2-ADR-440 (Festlegungen
der Patientenverfügung) · U2-ADR-121 (Rechtsraum-Katalog) · ISiK-Ausgabe: nimmt `_ipsVorsorgeEintraege` (Consent und
RelatedPerson) wieder auf und ergänzt nur DocumentReferences (KDL AM160103/AM160104) mit Anhang — kein zweiter Consent
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

---

## Kontext

Der IPS-Export trug bisher Allergien, Medikation, Diagnosen, Eingriffe, Medizinprodukte, Warnhinweise und Schwangerschaft.
Ob es eine Vorsorgevollmacht oder eine Patientenverfügung gibt, wer bevollmächtigt ist und wo das Dokument liegt, stand
nicht darin. Gerade das braucht ein Krankenhaus, wenn die Person nicht selbst entscheiden kann.

Die Standards geben den Platz vor (Weg zum Nachsehen: `~/.fhir/packages/<paket>/package/`):

- **IPS 2.0.0** (StructureDefinition-Composition-uv-ips.json): Abschnitt `sectionAdvanceDirectives`, LOINC 42348-3, 0..1,
  Narrative Pflicht. Einträge: Consent oder DocumentReference. Ein Consent- oder RelatedPerson-Profil hat IPS nicht.
- **EU EPS 1.0.0-ballot** (StructureDefinition-consent-eu-eps.json): eigenes Profil `consent-eu-eps` — `scope` fest `adr`,
  `category` 1..*, `provision.actor.role` und `provision.actor.reference` je 1..1, `Consent.extension` offen. Der
  EPS-Abschnitt verweist auf dieses Profil. Ein Consent nach `consent-eu-eps` ist zugleich IPS-konform.

## Die Entscheidung

1. **Je Instrument ein Consent nach `consent-eu-eps`** im Abschnitt Advance Directives, in `fhirIpsBundle`. Dieselbe Funktion
   nimmt später ISiK auf; die KBV-Patientenkurzakte ist ein eigenes Erzeugnis, gegen ihr eigenes Profil.

   Profil, `scope`, `category` und die Rolle AGNT stehen als Terminologie-Daten in `IPS_BEGRIFFE.advanceDirectives`
   (`code-listen/terminologie/ips-nfd.json`), nicht im Gerüst.

   | Vivodepot | FHIR |
   |---|---|
   | Instrument | `Consent`, `scope` adr, `category` consentcategorycodes#acd mit der Art als Text, `status` active, `patient` |
   | Rechtsgrundlage | `policy.uri` aus dem Rechtsraum-Katalog (`rechtsgrundlage.uri`); ohne Eintrag `policyRule.text` |
   | `dateOfLastChange` | `Consent.dateTime` |
   | `authorizedPersons` | `provision.actor` mit `role` v3-RoleClass#AGNT und `reference` auf eine RelatedPerson |
   | Art der Vollmacht | `RelatedPerson.relationship`: der Code aus U2-ADR-452 (DPOWATT für die Vorsorgevollmacht), dazu HPOWATT, sobald eine Gesundheitsbefugnis erteilt ist |
   | Beziehung der Person | `RelatedPerson.relationship.text` — Freitext im Register, darum nicht codiert |
   | `timeLimitedUntilIfAgreed` | `provision.period.end` und `RelatedPerson.period.end` |
   | Gesundheitsbefugnisse „ja“ / „nein“ | `provision.provision` mit `type` permit bzw. deny und dem Satz als `code.text` |
   | `form` | Text in `category.text` und Narrative — ein Code für die Form ist nicht belegt |
   | `storageLocation` | Narrative (s. Punkt 4) |
   | Widerspruch gegen die Notvertretung durch den Ehegatten | eigenes Consent, `provision.type` deny, der Ehegatte (`people.spouseOrCivilPartner`) als actor mit AGNT; Familienstand verheiratet → SPS, eingetragene Lebenspartnerschaft → DOMPART |

2. **Abgebildet:** Vorsorgevollmacht, Patientenverfügung, Betreuungsverfügung. **Benannt ausgenommen**
   (`IPS_VORSORGE_AUSGENOMMEN`): Testament, Sorgerechtsverfügung, Verfügung zur digitalen Nachbildung, gerichtliche
   Betreuerbestellung; bei der Vollmacht die Bankvollmacht (`IPS_VORSORGE_ARTEN_AUSGENOMMEN`). Ein neues Instrument ohne
   Entscheidung macht den Klassenwächter rot.
3. **Rechtsgrundlage im Rechtsraum-Modul, nicht im Gerüst.** `tools/rechtsraum-de-modul.json` trägt je Typ
   `rechtsgrundlage: { paragraf, uri }`; `_rechtsraumModulUebersetzen` lässt das Feld durch. Gegen den Gesetzestext auf
   gesetze-im-internet.de geprüft am 01.10.2026 durch eine unabhängige Sitzung: Vorsorgevollmacht § 1820 (Rahmen, Abs. 2 für
   Gesundheitsbefugnisse), Patientenverfügung § 1827 (Legaldefinition Abs. 1), Betreuungsverfügung § 1816 Abs. 2 Satz 4
   (Legaldefinition), Widerspruch § 1358 Abs. 3 Nr. 2 Buchst. a. Der Rechtsraum ist der gestempelte des Instruments, ohne
   Stempel Deutschland (wie bei der Frist der Notvertretung).
4. **Ablageort nur im Narrativ.** Die KBV-Extension `KBV_EX_MIO_NFDxDPE_Consent_Description_File_Location` (Wert Address, an
   `sourceReference.display`) wurde wiederverwendet und am Validator gemessen: ohne das KBV-Paket „ist nicht bekannt, und hier
   nicht erlaubt“ — das Bundle wird ungültig. Wie vereinbart wird sie in IPS/EPS benannt weggelassen; eine eigene URL
   wird nicht erfunden. Der Ablageort steht im Narrativ der Consent.
5. **Sensible Felder wie im Bereich Gesundheit.** Ablageort und Gesundheitsbefugnisse gehen nur mit `opt.sensibel` hinaus.
   Ohne Freigabe steht das Instrument mit Art, Datum, Frist und Vertretung da. Eine als „Privat“ markierte Person
   (`nichtMitgeben`) erscheint ohne Name, Erreichbarkeit und Beziehung, nur mit ihrer Rolle — Zahl und Reihenfolge der
   Vertretung bleiben richtig.
6. **Narrative in jeder Exportsprache** über das Begleittext-Modul (U2-ADR-458): 26 neue Kennungen in
   `tools/ips-begleittext-modul.json`, in allen 24 Sprachen. Die Übersetzungen sind eigene, mit Rückübersetzung und
   Fachbegriffsabgleich durch eine zweite Instanz (keine Bedeutungsabweichung gefunden), muttersprachlich nicht geprüft —
   der Vermerk der ungeprüften Übersetzung gilt unverändert. Der Sektionstitel steht in `IPS_BEGRIFFE.sektionen.vorsorge`
   (`code-listen/terminologie/ips-nfd.json`).
7. **Nicht hinein:** die Festlegungen der Patientenverfügung (U2-ADR-440). IPS und EPS haben dafür keinen Platz; sie gehen
   in die ADI-Ausgabe.

## EPS ist eine Ballot-Fassung

Validiert wird gegen `hl7.fhir.uv.ips#2.0.0` **und** `hl7.fhir.eu.eps#1.0.0-ballot`, dieselbe Pinnung wie in
`tests/konformitaet/externe-validatoren.mjs`. Wird EPS final, wird die Pinnung dort und in `tools/ips-vorsorge-validieren.js`
gemeinsam angehoben, der Validator läuft über alle Sprachen, und `consent-eu-eps` wird gegen die finale Fassung neu gelesen
(`scope`, `actor.role`, Extensions). Eine Abweichung ist dann ein Befund mit Probe, kein stilles Nachziehen.

## Was nicht entschieden ist

- **Die gerichtliche Betreuerbestellung** ist ausgenommen, weil sie keine Verfügung der Person ist und `scope` adr nicht
  trägt. Ob die bestellte Betreuung als RelatedPerson (GUARD) an anderer Stelle des IPS erscheinen soll, ist offen.
- **Ein Code für die Form** (privat, beglaubigt, beurkundet): nicht belegt, bis jemand im ZVR-Modul (XJustiz) nachgesehen hat.
- **ISiK- und KBV-Ausgabe:** eigene Erzeugnisse. ISiK nimmt Consent und RelatedPerson aus `_ipsVorsorgeEintraege` und ergänzt
  DocumentReferences; die KBV-Patientenkurzakte ist ein eigenes Erzeugnis ohne `provision`, dort ist die Ablageort-Extension
  Pflicht. Ein eigener Code für den Widerspruch nach § 1358 existiert nicht (ZVR-Modul geprüft).

## Belege

Validator (offline, IPS 2.0.0 + EPS 1.0.0-ballot, 01.10.2026): das Beispiel-Depot in allen 24 Exportsprachen gültig, 0
Fehler; der Rot-Beweis ohne `actor.role` fällt mit „Consent.provision.actor.role: mindestens erforderlich = 1“. Weg zum
Nachsehen: `node tools/ips-vorsorge-validieren.js --jar <validator_cli.jar>` (mit Suite-Platz).

```konformitaet
aussage:  Jede Vorsorgevollmacht erscheint als Consent nach consent-eu-eps; die Bevollmächtigten als RelatedPerson mit Rolle AGNT.
zustand:  geprüft
herkunft: hl7.fhir.eu.eps#1.0.0-ballot consent-eu-eps
pruefung: tests/fhir-ips-vorsorge.test.js#[Vorsorge·Vollmacht] Bevollmächtigte als RelatedPerson mit Rolle AGNT, Rollen und Verwandtschaft, Frist; „Privat“ nur mit Rolle
```

```konformitaet
aussage:  Ablageort und Gesundheitsbefugnisse gehen nur mit Freigabe der sensiblen Felder hinaus.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-ips-vorsorge.test.js#[Vorsorge·Sensibel] Ablageort und Gesundheitsbefugnisse nur mit Freigabe der sensiblen Felder
```

```konformitaet
aussage:  Der Widerspruch gegen die Notvertretung durch den Ehegatten erscheint als Consent mit provision deny.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-ips-vorsorge.test.js#[Vorsorge·1358] der Widerspruch gegen die Notvertretung durch den Ehegatten ist ein Consent deny mit dem Ehegatten
```

```konformitaet
aussage:  Jede Wahl des Feldes instrument hat eine Abbildung oder steht benannt ausgenommen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-ips-vorsorge.test.js#[Vorsorge·Klasse] jede Wahl des Feldes instrument hat eine Abbildung oder steht benannt ausgenommen
```

```konformitaet
aussage:  Das Beispiel-Depot mit allen Instrumenten ist gegen IPS 2.0.0 und EPS gültig; ein Consent ohne actor.role fällt.
zustand:  geprüft
herkunft: hl7.fhir.uv.ips#2.0.0, hl7.fhir.eu.eps#1.0.0-ballot
pruefung: tests/konformitaet/externe-validatoren.mjs#[Extern] jedes Erzeugnis des Generators traegt sein erwartetes Urteil
```

---

*Vivodepot GmbH · Berlin · 01.10.2026*
