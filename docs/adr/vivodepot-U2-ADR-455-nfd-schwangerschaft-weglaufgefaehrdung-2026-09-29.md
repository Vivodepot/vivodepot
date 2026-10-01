# U2-ADR-455: Schwangerschaft und Weglaufgefährdung als Kennungen (Notfalldatensatz)

**Status:** Angenommen (29.09.2026)
**Datum:** 29.09.2026
**Kategorie:** STANDARDS, GESUNDHEIT, NOTFALL
**Linie:** U2
**Bezug:** U2-ADR-446 (SNOMED GPS, Nutzungsmuster) · U2-ADR-077 und U2-ADR-097 (Notfallkarte) · Standards-Register (`docs/standards-schnittstelle.md`)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Der Notfalldatensatz der gematik (gemSpec_InfoNFDM 1.7.1, Kap. 3.6.1, „Besondere Hinweise“) kennt fünf Angaben:
Schwangerschaft, Implantate, Kommunikationsstörungen, Weglaufgefährdung und sonstige Hinweise. Implantate, Verständigung
und der Hinweis für Rettungskräfte hatten schon Kennungen. **Schwangerschaft und Weglaufgefährdung fehlten.**

Beide kennen im Notfalldatensatz nur „ja“ oder keine Angabe. Zur Schwangerschaft heißt es dort: „Eine Schwangerschaft kann
nicht zwingend ausgeschlossen werden, wenn kein ‚ja‘ gegeben ist. Insofern ist nur die Auswahl ‚keine Angabe‘ zulässig.“
Dazu gehören der errechnete Entbindungstermin und, bei der Weglaufgefährdung, eine Erläuterung mit höchstens 175 Zeichen.

## Entscheidung

1. **Vier Kennungen** im Bereich Gesundheit, Gruppe `notfall-aerzte`, alle sensibel: `health.pregnancy`,
   `health.pregnancyEstimatedDueDate`, `health.wanderingRisk`, `health.wanderingRiskDetails`. Die zwei Auswahlfelder
   kennen nur den Wert „ja“. Leer heißt keine Angabe, ein „nein“ gibt es nicht. Termin und Umstände erscheinen nur zu
   ihrem „ja“.
2. **Keine Schema-Stufe.** Die Kennungen kommen dazu, kein gespeicherter Wert zieht um.
3. **IPS-Export:** Bei „ja“ ein Schwangerschaftsstatus (LOINC 82810-3, Wert SNOMED 77386006 und LOINC LA15173-0) mit dem
   Entbindungstermin (LOINC 11778-8, SNOMED 161714006) in der Sektion „History of Pregnancy“. Die Weglaufgefährdung wird
   ein Warnhinweis (`Flag`) in der Sektion „Alerts“. Bei keiner Angabe gibt es weder Eintrag noch Sektion, und „nicht
   schwanger“ wird nie behauptet. Die Angaben gehen nur mit Freigabe der sensiblen Felder hinaus, wie jede andere
   Gesundheitsangabe.
4. **Code der Weglaufgefährdung:** der Code `Weglaufgefaehrdung` des CodeSystems
   `https://fhir.kbv.de/CodeSystem/KBV_CS_MIO_NFD_Runaway_Risk`, Version 1.0.0 gepinnt, aus der KBV-MIO
   Patientenkurzakte. Die KBV gibt dieses CodeSystem unter Apache-2.0 heraus, die Namensnennung steht in
   THIRD_PARTY_LICENSES. Der nachkoordinierte SNOMED-Ausdruck des zugehörigen ValueSets bleibt draußen, weil das
   GPS-Nutzungsmuster keine Beziehungen erlaubt (U2-ADR-446). Die KBV rät von einer Umsetzung der Patientenkurzakte 1.0.0
   ab, weil sie überarbeitet wird. Bei der Nachfolgeversion werden URL und Version des CodeSystems neu geprüft.
5. **Notfallkarte und Notfall-Ansicht:** Beide Angaben stehen dort, aber nur, wenn sie eingetragen sind, nie als „nein“.
   Termin und Umstände stehen nur mit ihrem „ja“ da, die Umstände gekürzt auf 175 Zeichen. Die Karte folgt damit
   derselben Regel wie ihre übrigen Felder: Allowlist und eingetragen. Das Blatt für Angehörige trägt keine
   Gesundheitsdaten und bleibt so.
6. **Terminologie-Literale** (SNOMED-Begriffe, der KBV-Code und die Sektionstitel) stehen als Daten in der Region der
   Code-Listen (`code-listen/terminologie/ips-nfd.json`), nicht im Gerüst. Die SNOMED-Begriffe sind die freigegebenen
   GPS-Begriffe, unverändert.

Den Notfalldatensatz selbst schreibt Vivodepot nicht. Er ist ein ärztlich signierter Datensatz auf der Gesundheitskarte.
Vivodepot hält die Angaben als Selbstauskunft bereit.

```yaml
konformitaet:
  - aussage: >-
      Schwangerschaft und Weglaufgefährdung sind sensible Kennungen mit dem einzigen Wert „ja“; Termin und Umstände hängen
      an ihrem „ja“.
    zustand: erfuellt
    herkunft: gemSpec_InfoNFDM 1.7.1, Kap. 3.6.1
    pruefung:
      - tests/nfd-luecken.test.js
        "[NFD·Kennungen] vier Kennungen, sensibel, nur „ja“ als Wert; Termin und Umstände hängen an ihrem „ja“"
  - aussage: >-
      Im IPS-Export stehen Schwangerschaftsstatus und Warnhinweis nur bei „ja“; bei keiner Angabe gibt es weder Eintrag
      noch Sektion, und „nicht schwanger“ wird nie behauptet.
    zustand: erfuellt
    herkunft: hl7.fhir.uv.ips#2.0.0 (Observation-pregnancy-status-uv-ips, Flag-alert-uv-ips)
    pruefung:
      - tests/nfd-luecken.test.js
        "[NFD·IPS] bei „ja“: Schwangerschaftsstatus mit Termin und ein Warnhinweis mit dem KBV-Code"
      - tests/nfd-luecken.test.js
        "[NFD·IPS] keine Angabe: weder Eintrag noch Sektion, nie ein „nicht schwanger“; ohne Freigabe des Sensiblen nichts"
  - aussage: >-
      Auf der Notfallkarte und in der Notfall-Ansicht stehen beide Angaben nur, wenn sie eingetragen sind.
    zustand: erfuellt
    herkunft: dieses ADR, Entscheidung 5
    pruefung:
      - tests/nfd-luecken.test.js
        "[NFD·Karte·Rot-Beweis] der Kern vor diesem Bau trug nichts davon auf die Karte"
      - tests/nfd-luecken.test.js
        "[NFD·Ansicht·Rot-Beweis] der Kern vor diesem Bau zeigte nichts davon in der Ansicht"
```
