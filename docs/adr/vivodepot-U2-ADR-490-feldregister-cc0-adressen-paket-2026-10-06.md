# U2-ADR-490: Feldregister — CC0, eine feste Adresse je Kennung, Fassungen, npm-Paket

**Status:** Angenommen (06.10.2026) — gebaut
**Datum:** 06.10.2026
**Kategorie:** SCHNITTSTELLEN, DATENMODELL, AUSLIEFERUNG
**Linie:** U2
**Bezug:** U2-ADR-409 (Feldregister; Punkt 1 „eine Kennung bedeutet für immer dasselbe“, Punkt 10 Status je Kennung) ·
U2-ADR-407 (Auslieferung, `v<stand>/` unveränderlich) · U2-ADR-488 (Schema-Adressen, jede Fassung bleibt abrufbar) · die
Entscheidung zur Änderbarkeit von Kennungen vor v1, deren ADR-Datei zum Zeitpunkt dieser ADR noch nicht im Kanon liegt.
**Grundlage:** Entscheidungen vom 03.10.2026 (CC0 für das Eigene, npm-Paket, Adresse
`register.vivodepot.de/feld/<kennung>`), bestätigt am 06.10.2026; die Prüfung der Fremdinhalte je Quelle vom 03.10.2026 und
der Abgleich der Beschriftungen gegen die BMJ-Formulare vom 06.10.2026 (beide intern, nicht veröffentlicht).
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Das Feldregister liegt seit v792 unter `https://register.vivodepot.de/feldregister.json`. Wer es übernehmen will, findet
darin keine Lizenz. Eine Kennung hat keine Adresse, auf die eine Vorlage, ein Formularschema oder eine Abbildungstabelle
verweisen könnte. Ein Paket, mit dem ein Werkzeug das Register als Abhängigkeit einbindet, gibt es nicht.

Das Muster dahinter: Die Bedeutung einer Angabe wird einmal festgelegt, mit Zuständigem und Fassung, und jeder Austausch
verweist darauf, statt sie mitzuführen. Tito Castillo beschreibt es am Beispiel von Strichcode und Katalog: „A barcode
identifies the product without carrying the catalogue“ (T. Castillo, „FHIR Is Not the Problem. But We May Be Asking It
to Solve the Wrong One.“, LinkedIn, 04.10.2026). Er nennt Metadaten und Referenzdaten Infrastruktur, mit eigenem
Zuständigen und Lebenszyklus. Das Feldregister ist dieser Katalog für persönliche Angaben. Damit ein Austausch darauf
verweisen kann, braucht jede Kennung eine feste Adresse, eine Lizenz, die die Übernahme erlaubt, und abrufbare Fassungen.

## Entscheidung

1. **CC0 1.0 für das Eigene, in der Datei selbst.** feldregister.json trägt `lizenz` (SPDX `CC0-1.0`, Adresse des
   Rechtstexts, wofür sie gilt und wofür nicht) und `herausgeber`. CC0 gilt für Kennungen, Beschriftungen, Status, Nachfolger
   und Adressen. Codelisten Dritter (SNOMED, LOINC, ATC, ICD-10-GM) stehen nicht in dieser Datei und fallen nicht darunter.
   In `herkunft.quellenhinweis` steht, dass die Beschriftungen im Bereich `advanceCare` den Gliederungen der BMJ-Formulare
   folgen. Das ist ein Quellenhinweis, keine Lizenzbedingung.
2. **Eine feste Adresse je Kennung: `https://register.vivodepot.de/feld/<kennung>`.** Die Kennung steht unverändert und
   unkodiert im Pfad, ein Unterfeld `a.b/c` als `feld/a.b/c`. Unter der Adresse liegt eine Seite für Menschen und
   `index.jsonld` für Maschinen (SKOS: `skos:Concept` im `skos:ConceptScheme` `…/feld/`, `skos:prefLabel` de/en,
   `skos:broader` vom Unterfeld zum Trägerfeld, `owl:deprecated` und `dct:isReplacedBy` für deaktivierte Kennungen). Die
   Aushandlung nach `Accept` steht in `feld/.htaccess` und greift nur, wenn `mod_rewrite` da ist; sonst liefert die Adresse
   HTML mit einem Verweis auf das JSON-LD. `feldregister.jsonld` trägt das ganze Schema. Jeder Eintrag in
   feldregister.json nennt seine Adresse in `uri`.
3. **Keine Kennung mit einem Pfadsegment aus einem Zeichen.** Der Webspace leitet jedes einbuchstabige Pfadsegment auf die
   Adresse ohne dieses Segment um (gemessen 06.10.2026, auf jeder Tiefe, auf register.vivodepot.de und vivodepot.de). Der
   Erzeuger bricht bei einer solchen Kennung ab; das Schema der Liste lässt sie nicht zu.
4. **Die Seiten je Kennung tragen keine Fassung und liegen nur in der Wurzel.** Sie bleiben byte-gleich, solange sich die
   Kennung nicht ändert. Die Fassungen hält `v<stand>/feldregister.json` fest (unveränderlich, U2-ADR-407).
   `fassungen.json` führt jede ausgelieferte Fassung mit Adresse und zurückgelesener Prüfsumme.
5. **Das Schema der Liste** liegt in `docs/feldregister/feldregister-schema.json` mit `$id`
   `https://vivodepot.de/schemas/feldregister-schema.json` und wird wie die übrigen Schemas mit Fassung verzeichnet und
   ausgeliefert (`docs/schema-fassungen.json`, Fassung 1, nach U2-ADR-488).
6. **npm-Paket `@vivodepot/feldregister`, öffentlich, nur Daten.** Es enthält die Liste, das JSON-LD, das Schema, den
   CC0-Rechtstext und ein README, aber keinen Code, kein Skript und keine Abhängigkeit. Die Version folgt den Daten: MINOR für
   eine neue Kennung oder einen geänderten Status, PATCH nur für Beschriftungen. Fehlt eine Kennung oder ändert sich ihr
   Bereich, wird kein Paket gebaut: nach v1 ändert sich eine Kennung nicht. Veröffentlicht wird nur von der Inhaberin des Kontos, mit
   Zwei-Faktor-Anmeldung. Kein Werkzeug im Repo ruft `npm publish` auf oder liest ein Token.

## Abgrenzung

- Ob eine Kennung neu entsteht oder deaktiviert wird, regelt weiter U2-ADR-409.
- Zenodo-DOI, XRepository, SchemaStore und der Abgleich mit SEMIC sind weitere Wege der Verbreitung und nicht Teil dieser
  Entscheidung.

## Konsequenzen

- U2-ADR-409 bekommt einen Nachtrag: Lizenz und Adresse je Kennung stehen in U2-ADR-490.
- Die Auslieferung des Registers lädt `feld/` nur in die Wurzel hoch und liest jede Datei einzeln gegen die Prüfsumme des
  Plans zurück. Zu jeder Kennung muss es Seite und JSON-LD geben, und keine Seite ohne Kennung.
- Eine Auslieferung lädt beim ersten Mal rund 1.350 Dateien mehr hoch, danach nur geänderte.

```yaml
konformitaet:
  - aussage: >-
      feldregister.json trägt CC0-1.0 mit Rechtstext-Adresse und Herausgeber; ohne Lizenz oder mit anderer Lizenz ist es rot.
    zustand: erfuellt
    herkunft: U2-ADR-490 (06.10.2026)
    pruefung:
      - tests/feldregister-adressen.test.js "[Feldregister·Lizenz] feldregister.json trägt CC0-1.0 mit Rechtstext-Adresse und Herausgeber"
      - tests/feldregister-adressen.test.js "[Feldregister·Lizenz·Rot-Beweis] ohne lizenz oder mit anderer Lizenz ist die Zusage verletzt"
      - tests/mit-modul/feldregister-schema-ajv.test.js "[Feldregister·Schema·Rot-Beweis] ohne Lizenz, mit fremder Lizenz oder mit einbuchstabigem Segment fällt sie durch"
  - aussage: >-
      Jede Kennung hat Seite und JSON-LD unter feld/<kennung>/, und nichts sonst.
    zustand: erfuellt
    herkunft: U2-ADR-490 (06.10.2026)
    pruefung:
      - tests/feldregister-adressen.test.js "[Feldregister·Adressen] jede Kennung hat Seite und JSON-LD unter feld/<kennung>/, und nichts sonst"
  - aussage: >-
      Eine Kennung mit einbuchstabigem Pfadsegment oder mit einem Zeichen, das kodiert werden müsste, wird nicht gebaut.
    zustand: erfuellt
    herkunft: U2-ADR-490 (06.10.2026)
    pruefung:
      - tests/feldregister-adressen.test.js "[Feldregister·Adressen·Rot-Beweis] ein einbuchstabiges Pfadsegment wirft — der Webspace leitet es um"
  - aussage: >-
      Eine neue Kern-Fassung lässt jede Kennungs-Datei byte-gleich.
    zustand: erfuellt
    herkunft: U2-ADR-490 (06.10.2026)
    pruefung:
      - tests/feldregister-adressen.test.js "[Feldregister·Adressen] eine neue Kern-Fassung lässt jede Kennungs-Datei byte-gleich"
  - aussage: >-
      Das Paket führt genau sechs Dateien, nur Daten, CC0, öffentlich; die Version folgt den Daten, eine entfernte Kennung baut
      kein Paket; das Werkzeug startet keinen Prozess und liest kein Token.
    zustand: erfuellt
    herkunft: U2-ADR-490 (06.10.2026)
    pruefung:
      - tests/feldregister-paket.test.js "[Feldregister·Paket] npm pack --dry-run führt genau die sechs Dateien; nur Daten, CC0, öffentlich"
      - tests/feldregister-paket.test.js "[Feldregister·Paket·Version] neu → MINOR, Beschriftung → PATCH, entfernt oder anderer Bereich → Abbruch, gleich → Abbruch"
      - tests/feldregister-paket.test.js "[Feldregister·Paket] das Werkzeug ruft keinen Prozess auf und liest kein Token"
  - aussage: >-
      Unter den Adressen einer Stichprobe (erste Kennung, ein Unterfeld, letzte) liefert der Webspace Seite und JSON-LD.
    zustand: offen
    herkunft: U2-ADR-490 (06.10.2026)
    frist: 2026-11-08
    bedingung: >-
      Das Register ist mit feld/ ausgeliefert (eigenes Wort der Gegenlesung vor dem ersten Ausliefern) und
      der Aufruf eines nicht öffentlichen Werkzeugs ist grün.
```
