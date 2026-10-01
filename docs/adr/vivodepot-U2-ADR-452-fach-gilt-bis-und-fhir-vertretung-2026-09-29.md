# U2-ADR-452: „Gilt bis“ je Fach und die Vertretung als FHIR RelatedPerson

**Status:** Angenommen (29.09.2026)
**Datum:** 29.09.2026
**Kategorie:** VERTRETUNG, KRYPTO, STANDARDS, GESUNDHEIT
**Linie:** U2
**Bezug:** U2-ADR-156 (Fächer der Empfängerkreise in der Datei) · U2-ADR-079 (delegierter IPS-Export, RelatedPerson) · U2-ADR-109 (Ablauf der Notvertretung beim Vertretenden) · U2-ADR-433 (Notvertretung durch Ehegatten) · U2-ADR-432 (Sub-Depot ist ein Depot; ein über ein Fach geöffnetes Depot ist nur lesend)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Eine Vertretung öffnet das Depot der vertretenen Person über ein Fach: ein Empfängerkreis mit eigenem Passwort, dessen
Ausschnitt in der Datei der Inhaberin liegt (U2-ADR-156). Ein Fach galt bisher ohne Ende. Eine Vollmacht kann aber
befristet sein (`advanceCare.provisionInstruments/timeLimitedUntilIfAgreed`), und nach ihrem Ende soll die Vertretung das
Depot nicht mehr öffnen.

Beim delegierten IPS-Export erschien die exportierende Vertretung als `RelatedPerson` nur mit ihrer Verwandtschaft
(`BEZIEHUNGS_CODES`: SPS, CHILD, PRN …). Unter welchem Recht sie handelt und bis wann, stand nicht im Dokument.

## Entscheidung

Entscheidung vom 28.09.2026 (Frage 3 im Report-before-Build zur Vollmacht, „ja“), gebaut am 29.09.2026:

1. **Jedes Fach kann ein „gilt bis“ tragen** (`empfaengerkreis.giltBis`, JJJJ-MM-TT), freiwillig, beim Einrichten des
   Fachs gesetzt. Als Vorschlag zeigt der Dialog jede Vollmacht mit Befristung samt ihren Bevollmächtigten
   (`empfaengerkreisGiltBisVorschlaege`). Zugeordnet wird nichts; welcher Kreis zu welcher Vollmacht gehört, weiß nur die
   Inhaberin.
2. **Das Datum reist im Geheimteil des Fachs** (`_zerfallGeheimKlartext`), verschlüsselt mit dem Fach-Schlüssel und durch
   GCM gegen Änderung geschützt. Es steht nicht lesbar in der Datei. Die Polsterlänge rechnet es mit, sodass ein Fach mit
   Datum nicht länger ist als eines ohne.
3. **Nach dem Tag öffnet Vivodepot das Fach nicht mehr**, an beiden Öffnungswegen: die Datei direkt mit dem Fachpasswort
   (`depotLaden`) und das Depot als eingehängtes Sub-Depot (`subDepotVertrauenOeffnen`). Beide laufen durch dieselbe
   Schleife in `_zerfallLesen`; geprüft wird dort nach dem Entschlüsseln des Geheimteils und **vor der ersten Einheit**. Der
   Tag selbst gilt noch (Vergleich der lokalen Kalendertage). Die Meldung sagt „abgelaufen“, nicht „falsches Passwort“;
   der NFC/NFD-Zweitversuch läuft dann nicht.
4. **Das ist ein Bedienschutz, keine kryptographische Sperre.** Wer die Datei und das Fachpasswort hat, hat den Schlüssel;
   eine veränderte App könnte das Datum übergehen. So steht es in der Oberfläche: „Das ist ein Bedienschutz, keine
   Verschlüsselungssperre: Wer die Datei und das Passwort hat, hat auch den Schlüssel.“ Wer den Zugang sicher beenden will,
   entfernt das Fach; ältere Kopien der Datei behalten es.
5. **Die Vertretungsgrundlage am Fach.** Die Inhaberin kann beim Einrichten angeben, unter welchem Recht der Kreis für sie
   handelt (`empfaengerkreis.vertretung`, ein wählbarer Schlüssel aus `RECHTSGRUNDLAGEN_VERTRETUNG`). Sie reist wie das
   Datum im Geheimteil. Gemessen am 29.09.2026: ohne das kam die Grundlage in einem über ein Fach geöffneten Depot nicht an,
   sie steht sonst nur im versiegelten Inhalt eines von der Vertretung selbst angelegten Sub-Depots.
6. **FHIR.** Im delegierten IPS-Export trägt die `RelatedPerson` neben der Verwandtschaft die Rolle der Grundlage als
   zweites `relationship` (v3-RoleCode 4.0.0) und das Ende des Fachs als `period.end`. Beides beschreibt das Recht, nicht die
   Person, und steht darum auch im Weg „nur unter Vollmacht“ ohne Namen.

   | Grundlage | Code | Display |
   |---|---|---|
   | Vorsorgevollmacht | DPOWATT | durable power of attorney |
   | Gesundheitsvollmacht | HPOWATT | healthcare power of attorney |
   | Generalvollmacht | POWATT | power of attorney |
   | Bankvollmacht | SPOWATT | special power of attorney |
   | gesetzliche Betreuung | GUARD | guardian |
   | elterliche Sorge | RESPRSN | responsible party |

   Zuordnung mit Fundstelle (Definitionen aus dem Codesystem, Schlüssel aus `RECHTSGRUNDLAGEN_VERTRETUNG`, U2-ADR-129):
   - **Vorsorgevollmacht → DPOWATT.** Die Definition von DPOWATT: „unlike standard powers of attorney, durable powers can
     continue after incompetency“. Genau das unterscheidet die Vorsorgevollmacht von einer gewöhnlichen Vollmacht; sie
     soll gerade dann gelten, wenn die Person nicht mehr selbst entscheiden kann.
   - **Gesundheitsvollmacht → HPOWATT**, dieselbe Fortgeltung, beschränkt auf Gesundheitsangelegenheiten.
   - **Generalvollmacht → POWATT**, die allgemeine Vollmacht ohne Aussage zur Fortgeltung. Ist sie als Vorsorge erteilt,
     wählt die Inhaberin „Vorsorgevollmacht“.
   - **Bankvollmacht → SPOWATT.** Laut Definition ist das die Vollmacht, die „often limited in the kinds of powers“ ist.
     Die Bankvollmacht ist auf Bankgeschäfte beschränkt, darum nicht POWATT.
   - **gesetzliche Betreuung (§ 1814 BGB, Bestellung durch das Betreuungsgericht) → GUARD**, „legally empowered with
     responsibility for the care of a ward“.
   - **elterliche Sorge → RESPRSN** (rechtliche Verantwortung). GUARD ist Vormund oder bestellte Betreuung, und
     „Elternteil“ trägt schon die Verwandtschaft (PRN).
   - **`betreuung` („Betreuungsvollmacht“) → kein Code.** U2-ADR-129 hält fest: Das Wort ist kein Rechtsbegriff, eine
     Betreuung wird bestellt, nicht bevollmächtigt. Der Wert ist nicht mehr wählbar und bleibt nur für Bestandswerte
     lesbar, und es gibt „kein Ziel, auf das ein Bestandswert sicher migriert werden könnte“. Die gerichtliche Betreuung
     hat ihren eigenen Schlüssel (`gesetzliche_betreuung` → GUARD). Eine Betreuungsverfügung ist ein Wunsch und keine
     Vertretung. Ein Code, der nur ungefähr passt, wäre wieder „angelehnt“; lieber keine Rolle als eine geratene.

   Codes und Displays sind am Codesystem geprüft
   (`https://terminology.hl7.org/CodeSystem-v3-RoleCode.json`, Version 4.0.0); ob sie im ValueSet von
   `RelatedPerson.relationship` bestehen, prüft der HL7-Validator.

## Was nicht entschieden ist

- **Notvertretung durch Ehegatten (§ 1358 BGB).** Sie beruht auf dem Gesetz, nicht auf einem Fach, und beginnt mit der
  ärztlichen Feststellung, die beim Einrichten eines Fachs nicht bekannt ist. Ein „gilt bis“ lässt sich darum nicht
  vorbelegen. Das gesetzliche Ende (§ 1358 Abs. 3 Nr. 4, sechs Monate) rechnet weiterhin die Seite des Vertretenden
  (U2-ADR-109); die Ablehnung steht im Depot der vertretenen Person (U2-ADR-433).
- **Die FHIR-Abbildung der Anfrage-Antwort** (U2-ADR-450) übernimmt diese Rollen, sobald sie gebaut ist.

## Folgen

- Der Geheimteil jedes Fachs ist wenige Bytes länger (die Polsterlänge rechnet `giltBis` und `vertretung` mit). Alte
  Dateien bleiben lesbar: ohne die Schlüssel gilt ein Fach wie bisher unbefristet und ohne Grundlage.
- Die Sitzung hält Ende und Grundlage des geöffneten Fachs nur im RAM (`sessionSubKeys`).

```yaml
konformitaet:
  - aussage: >-
      Nach dem „gilt bis“ öffnet Vivodepot ein Fach an beiden Öffnungswegen nicht mehr; der Tag selbst gilt noch.
    zustand: erfuellt
    herkunft: Entscheidung vom 28.09.2026
    pruefung:
      - tests/fach-gilt-bis.test.js
        "[gilt bis] abgelaufen: die Datei öffnet sich mit dem Fachpasswort nicht mehr — die Meldung ist nicht „falsches Passwort“"
      - tests/fach-gilt-bis.test.js
        "[gilt bis] abgelaufen: als Sub-Depot eingehängt öffnet das Fach ebenso wenig"
      - tests/fach-gilt-bis.test.js
        "[gilt bis·Rot-Beweis] ohne die Prüfung beim Öffnen geht ein abgelaufenes Fach wieder auf"
  - aussage: >-
      Datum und Grundlage stehen nicht lesbar in der Datei, und ein Fach mit Datum ist nicht länger als eines ohne.
    zustand: erfuellt
    herkunft: U2-ADR-156 (keine Längen-Lecks je Fach)
    pruefung:
      - tests/fach-gilt-bis.test.js
        "[gilt bis] das Datum steht nicht lesbar in der Datei, und ein Fach mit Datum ist nicht länger als eines ohne"
  - aussage: >-
      Die RelatedPerson des delegierten Exports trägt die Vertretungsrolle aus v3-RoleCode und das Ende des Fachs als period.end.
    zustand: erfuellt
    herkunft: HL7 v3-RoleCode 4.0.0; FHIR R4 RelatedPerson
    pruefung:
      - tests/fach-gilt-bis.test.js
        "[gilt bis·FHIR] RelatedPerson trägt Verwandtschaft, Vertretungsrolle und period.end"
      - tests/fach-gilt-bis.test.js
        "[gilt bis·FHIR·Rot-Beweis] ohne die Rolle im Bau fehlt die Vertretung in der RelatedPerson"
      - tests/konformitaet/externe-validatoren.mjs
        "[Extern] jedes Erzeugnis des Generators traegt sein erwartetes Urteil"
```
