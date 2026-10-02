# U2-ADR-467 · Getrennte Namens- und Anschriftsfelder, ohne Raten

**Status:** Akzeptiert, gebaut (Schema 91, Vorlage identity, Personenregister, Ausgaben, Wächter).
**Datum:** 01.10.2026
**Kategorie:** DATENMODELL, STANDARDS
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`SCHEMA_VERSION_AKTUELL`, Stufe 90 → 91 in `depotNormalisieren`, `ANSCHRIFT_TEILE`, `_anschriftTeileNachRegel`, `anschriftFuerAusgabe`, `anschriftVorschlag*`, `personFormVorbereiten`, `anschriftVorschlagKarteHTML`, `MENSCHEN_REGISTER_FELD`, `personHinzufuegen`, `personAktualisieren`, `personLoeschen`, `sektorFeldSetzen`, FHIR `_fhirPatientAusIdentitaet`/`fhirIpsBundle`, `vcardIdentitaet`, `vcardMenschen`, `sdJwtVcIdentitaet`, die vCard-, SD-JWT- und XMeld-Rückwege, die Dokumentsätze, `flowKindSubDepotAnlegen`), `tools/bereich-templates/vivodepot-identity.json`, `tools/build-sektoren-lesen.js`, `vivodepot-lesen.html` (erzeugte Regionen), Textsatz DE/EN.
**Bezug:** U2-ADR-022 (ein Personenregister), U2-ADR-017 (Anker-Name aus der Identität), U2-ADR-439 (das Produkt zerlegt keinen Freitext), U2-ADR-440 (`nurMitWert`/`nurAnzeige`), U2-ADR-100 (Migrationen), U2-ADR-456 (FIM-Bezüge).

## Frage

Formulare und Standards (FIM, XJustiz, ISiK, FHIR, vCard, OpenID-Adresse) verlangen Familienname, Vornamen, Straße, Hausnummer, Postleitzahl und Ort getrennt. Das Personenregister führte einen Namen in einem Feld und die Anschrift als eine Zeile; die Identität die Anschrift in zwei Zeilen. Wie kommen die Teile ins Depot, ohne dass das Produkt sie aus dem vorhandenen Freitext errät?

## Entscheidung

1. **Neue Felder, alte bleiben.** Identität: `street`, `houseNumber`, `postalCode`, `city` (Name war schon getrennt). Personen: `familyName`, `givenName` und dieselben vier Anschriftsteile. `name` bleibt Anker und Anzeige. `streetAddress`, `postcodeCity` und `adresse` bleiben stehen. Sie sind nur mit Wert sichtbar und dort nur angezeigt (`nurMitWert`, `nurAnzeige`, wie U2-ADR-440). Es wird kein Wert gelöscht.
2. **Namen werden nie zerlegt.** Die Migration lässt `familyName`/`givenName` leer. Beim Bearbeiten einer Person ohne getrennten Namen bittet ein Hinweis darum; gesperrt wird nichts. Kein Export leitet Teile aus `name` ab. Die zwei Stellen, die es taten (FHIR-RelatedPerson: letztes Wort als `family`; Kind-Depot: erstes Wort als Vorname), nehmen die Teile jetzt aus den Feldern oder lassen sie leer.
3. **Anschriften nur als Vorschlag.** Eine feste Regel (`_anschriftTeileNachRegel`) erkennt nur Eindeutiges: fünf Ziffern vorn in „PLZ Ort“, ein letztes Wort mit Ziffer vorn in „Straße Nr“. Das Ergebnis steht in `data.anschriftVorschlaege`, **nicht in den Feldern**. Die Felder bleiben leer, bis die Person bestätigt. So nimmt kein Export, kein Empfänger-Ausschnitt und keine Weitergabe einen unbestätigten Teil.
4. **Bestätigen sichtbar.** Die Identität zeigt den Vorschlag über den Anschriftsfeldern mit „Vorschlag übernehmen“ und „Vorschlag verwerfen“. Die Bearbeiten-Maske einer Person ist mit dem Vorschlag vorbefüllt und trägt den Hinweis „Vorschlag aus der bisherigen Anschrift, bitte prüfen“: Speichern bestätigt, „Vorschlag verwerfen“ lehnt ab.
5. **Kein Altbestand.** Ein Vorschlag verschwindet beim Bestätigen und beim Ablehnen. Er verschwindet auch, wenn die Person einen Teil selbst schreibt (dann nur dieser Teil), wenn sie die alte Zeile ändert, aus der er stammt, und wenn die Person aus dem Register entfernt wird.
6. **Depot und Sicherung ja, Ausgaben an Dritte nein.** `anschriftVorschlaege` steht in `leeresDepot()`. Im Vollexport wird es zurückgehalten wie `menschen`; es reist nur beim Umzug mit (`{sensibel: true}`). Der Vollimport nimmt es mit.
7. **Eine Leseregel für Ausgaben.** `anschriftFuerAusgabe` liefert bestätigte Teile. Fehlen sie, liefert sie die bisherige Zeile, damit auf einem Blatt nichts verloren geht. Welche Teile eine bisherige Zeile ersetzen, steht am Feld (`ersetztDurch`): in der Identität je Zeile (`streetAddress` durch Straße und Hausnummer, `postcodeCity` durch Postleitzahl und Ort), bei einer Person `adresse` durch alle vier Teile. Die bisherige Zeile gilt, bis jeder ersetzende Teil eingetragen ist; nur der Ort lässt sie nie fallen. Dieselbe Angabe lesen das PDF und die Zusammenfassung einer Person, und die Personenverweise in Dokumenten laufen über die Leseregel. FHIR Patient bekommt `address` (mit Teilen `line`/`postalCode`/`city`, sonst nur `text`). vCard trägt `N` nur aus eingetragenen Teilen und `ADR` in Komponenten. SD-JWT VC trägt `postal_code`/`locality`. Die Dokumentsätze setzen die Zeile aus den Teilen zusammen.
8. **Was getrennt hereinkommt, bleibt getrennt.** XMeld führt Straße, Hausnummer, PLZ und Wohnort als eigene Elemente. Sie gehen in die vier Felder, statt zu zwei Zeilen zusammengefügt zu werden. vCard und SD-JWT mit getrennter PLZ schreiben PLZ und Ort getrennt. Die vCard-Straßenkomponente trägt Straße und Hausnummer und bleibt darum die Zeile. vCard-`N` füllt Familienname und Vornamen einer Person.

## Was diese Entscheidung nicht leistet

- Sie liefert keinen Export, der fehlende Teile als „nicht einreichbar“ meldet. Keine Ausgabe dieser Fassung verlangt die Teile zwingend. FIM (U2-ADR-442/-456) wird die erste sein und fragt `anschriftFuerAusgabe(...).vollstaendig`.
- Die FIM-Bezüge der neuen Felder trägt sie nicht nach; die alten Zeilen stehen weiter als `naeherung` auf der Anschrift-Gruppe.
- Ausländische Postleitzahlen erkennt die Vorschlagsregel nicht; sie bleiben Altwert, bis die Person einträgt.
- Die Institutionen behalten ihre eine Anschriftzeile.

```yaml
konformitaet:
  - aussage: >-
      Die Migration zerlegt keinen Namen; Familienname und Vornamen der Personen bleiben leer, auch bei
      „Maria von der Heide“ und „Dr. Hans-Peter Müller-Lüdenscheidt“.
    zustand: erfuellt
    herkunft: U2-ADR-467 (01.10.2026)
    pruefung:
      - tests/schema-91-namen-anschrift-getrennt.test.js
        "[Stufe 91·a] Namen werden nie zerlegt: der Ein-Feld-Name bleibt, Familienname und Vornamen bleiben leer"
  - aussage: >-
      Die Anschrift kommt nur als Vorschlag in anschriftVorschlaege, die Felder bleiben leer; eine nicht eindeutige
      Anschrift bekommt keinen Vorschlag.
    zustand: erfuellt
    herkunft: U2-ADR-467 (01.10.2026)
    pruefung:
      - tests/schema-91-namen-anschrift-getrennt.test.js
        "[Stufe 91·b] die Anschrift kommt nur als Vorschlag: Teile im Vermerk, Felder leer, Altwert bleibt"
      - tests/schema-91-namen-anschrift-getrennt.test.js "[Stufe 91·c] eine nicht eindeutige Anschrift bekommt keinen Vorschlag"
      - tests/schema-91-namen-anschrift-getrennt.test.js
        "[Stufe 91·Rot-Beweis] ein Depot, das schon auf 91 steht, durchläuft die Stufe nicht — es entstünde kein Vorschlag"
  - aussage: >-
      Ein Vorschlag verschwindet beim Bestätigen, Ablehnen, selbst Schreiben, Ändern der alten Zeile und Entfernen der Person.
    zustand: erfuellt
    herkunft: U2-ADR-467 (01.10.2026)
    pruefung:
      - tests/anschrift-vorschlag-bestaetigen.test.js
        "[Vorschlag·Bestätigen] Übernehmen schreibt die Teile in die leeren Felder und entfernt den Vorschlag"
      - tests/anschrift-vorschlag-bestaetigen.test.js
        "[Vorschlag·Ablehnen] Verwerfen schreibt kein Feld und entfernt den Vorschlag; nach dem letzten ist der Behälter leer"
      - tests/anschrift-vorschlag-bestaetigen.test.js
        "[Vorschlag·Altzeile geändert] wer die alte Zeile ändert, verwirft den Vorschlag, der aus ihr stammt"
      - tests/anschrift-vorschlag-bestaetigen.test.js
        "[Vorschlag·Rot-Beweis] ohne den Anschluss in personAktualisieren bliebe der Vorschlag nach geänderter Zeile stehen"
  - aussage: >-
      Die Bestätigung ist sichtbar: Formular vorbefüllt mit Hinweis und Ablehnen, Identität mit Übernehmen und Verwerfen.
    zustand: erfuellt
    herkunft: U2-ADR-467 (01.10.2026)
    pruefung:
      - tests/anschrift-vorschlag-bestaetigen.test.js
        "[Vorschlag·Formular] die Bearbeiten-Maske ist mit dem Vorschlag vorbefüllt und sagt sichtbar, dass es einer ist"
      - tests/anschrift-vorschlag-bestaetigen.test.js
        "[Vorschlag·Ansicht] die Identität zeigt den Vorschlag mit Übernehmen und Verwerfen über den Anschriftsfeldern"
  - aussage: >-
      Vorschläge stehen in Depot und Sicherung, in keiner Ausgabe an Dritte.
    zustand: erfuellt
    herkunft: U2-ADR-467 (01.10.2026)
    pruefung:
      - tests/anschrift-vorschlag-bestaetigen.test.js "[Vorschlag·Ausgaben] in Depot und Sicherung ja, in keiner Ausgabe an Dritte"
  - aussage: >-
      Kein Export zerlegt einen Namen per Regel; im eigenen Code von Kern und Lese-App trennt nichts an Leerzeichen.
    zustand: erfuellt
    herkunft: U2-ADR-467 (01.10.2026)
    pruefung:
      - tests/namen-nie-zerlegt-waechter.test.js "[Wächter·Kernsuche] kein Trennen an Leerzeichen im eigenen Code — Grundlinie 0"
      - tests/namen-nie-zerlegt-waechter.test.js
        "[Wächter·Kernsuche·Rot-Beweis] eine gepflanzte Zerlegung wird gefunden, eine in der Fremdbibliothek nicht"
      - tests/namen-nie-zerlegt-waechter.test.js
        "[Wächter·Durchlauf] FHIR-RelatedPerson der vertretenden Person: nur `text`, kein family/given"
      - tests/namen-nie-zerlegt-waechter.test.js "[Wächter·Durchlauf] vCard der Personen: kein N aus einem Ein-Feld-Namen"
  - aussage: >-
      Ausgaben nehmen bestätigte Teile und fallen ohne sie auf die bisherige Zeile zurück; getrennt Hereinkommendes bleibt getrennt.
    zustand: erfuellt
    herkunft: U2-ADR-467 (01.10.2026)
    pruefung:
      - tests/anschrift-ausgaben-getrennt.test.js
  - aussage: >-
      Eine bisherige Anschriftszeile gilt in jeder Ausgabe, bis jeder Teil eingetragen ist, der sie ersetzt (`ersetztDurch`);
      nur der Ort lässt sie nie fallen.
    zustand: erfuellt
    herkunft: U2-ADR-467 (01.10.2026)
    pruefung:
      - tests/anschrift-ausgaben-spiegel.test.js "[Anschrift·Spiegel] nur der Ort eingetragen: keine Ausgabe verliert die bisherige Zeile"
      - tests/anschrift-blatt-alte-zeile.test.js "[Blatt·Identität·Rot-Beweis] nur der Ort gesetzt: beide alten Zeilen bleiben"
```
