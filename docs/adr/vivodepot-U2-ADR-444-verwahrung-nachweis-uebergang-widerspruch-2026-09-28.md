# U2-ADR-444: Verwahrung — Nachweis beim Weitergeben, Übergang an die Person, Widerspruch

**Status:** Angenommen
**Datum:** 28.09.2026
**Kategorie:** VERWAHRUNG, EXPORT, SUB-DEPOT, FHIR
**Linie:** U2
**Bezug:** U2-ADR-086 (Durchreiche, Nachtrag unten) · U2-ADR-123 (Sub-Depot-Selbstbestimmung, Nachtrag unten) ·
U2-ADR-079/081 (Provenance des IPS-Exports, Muster für die Verwahrerin) · U2-ADR-120 (Übergabe-Protokoll) ·
U2-ADR-062-Nachtrag (Ort-Hinweis im Klartext)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Verwahrung heißt: wer eine Akte hält. In einem Förderprojekt wurde gezeigt, wie das für ein weitergegebenes Dokument aussieht —
eine FHIR-Provenance mit `custodian` und `activity` = `transmit`. Das Produkt erzeugte das nicht. Die vertretene Person, etwa ein
volljährig gewordenes Kind, kam nur über eine Übergabe-Datei an ihr Depot, die allein die haltende Person erzeugt; ein
Erinnern daran gab es nicht, und keinen Weg, der Verwaltung zu widersprechen. Was demonstriert wurde, gehört ins Produkt.

## Entscheidung

Entscheidungen vom 27. und 28.09.2026, Wortlaute und Wächter-Grenzen mit Gegenlesung.

1. **Nachweis beim Weitergeben (Hülle).** Neben „Original herunterladen" (U2-ADR-086 §2, byte-gleich, unverändert) ein
   zweiter Weg „Mit Verwahrungsnachweis herunterladen": ein Bundle `type=collection` mit dem Original UNVERÄNDERT als `Binary`
   und einer `Provenance` — `target` das Binary, `activity` ISO-21089 `transmit`, `recorded` die Herausgabe.
   - Verwahrerin (`custodian`) ist die Person selbst (`Patient`); handelt jemand für sie (Sub-Kontext), die `RelatedPerson`
     mit `onBehalfOf` — **nie Vivodepot**.
   - Der Aussteller steht als `author`, aus dem Original gelesen (Name und Kennung seiner Organisation), nicht rekonstruiert.
   - `entity.what.identifier` ist die Kennung des Originals.
   - Keine klinische Aussage; U2-ADR-086 §3 bleibt der Maßstab.
   - Die Hand-Bauart der Demonstration trug die Provenance im Dokument selbst; das Dokument war danach nicht mehr das der
     Klinik. Die Hülle lässt es unverändert.
2. **Übergang an die Person.** Die Verselbstständigung eines Sub-Depots ist das Abgeben (`subDepotAushaengen`, Absicht
   „abgeben"): erst die Übergabe-Datei, dann der bestätigte Akt. So entschieden am 20.09.2026; das Feld
   `verselbststaendigungMoeglich` wird als tot entfernt (eigener Commit).
   - **Erinnerung zum 18. Geburtstag:** der einzige Termin, der nicht übergriffig ist und genau berechnet werden kann — der
     erste Tag, an dem die Altersrechnung des Kerns 18 ergibt (am 29.02. Geborene in Nichtschaltjahren am 01.03.). Nur mit
     vollem Geburtsdatum; im Prüfblatt und im Kalender; weg nach dem Abgeben.
   - **Ehrliche Grenze:** Nach dem Abgeben ist das Depot nicht mehr in der Datei der haltenden Person; ältere
     Sicherungskopien enthalten es noch. Der Dialog sagt das, statt „keine Kopie" zu versprechen.
3. **Widerspruch der vertretenen Person.** Festgehalten, der haltenden Person unübersehbar angezeigt, mit Wiedervorlage —
   **er sperrt nichts**. Vivodepot dokumentiert, es entscheidet und berät nicht; eine Sperre griffe in die Pflichten einer
   Betreuerin ein und ließe Vivodepot entscheiden. Die Konvention in Registern und Akten ist Vermerken, nicht Blockieren.
   - **Sichtbar an der Handlung:** Export, Übergabe, Aushängen und Herausgeben im Sub-Kontext zeigen offene Widersprüche vor
     der Bestätigung, über eine gemeinsame Stelle.
   - **Nicht still löschbar:** Entfernen hinterlässt Person und Zeit am Eintrag und einen Eintrag in der Geschichte des
     Sub-Depots.
   - „Erklärt von" ist Pflicht (die Person selbst oder wer es weitergab). Der Weg, auf dem die Person selbst in ihrer eigenen
     Kopie widerspricht, und das versiegelte Mitreisen im Umschlag sind offen (Befund-Ratsche WIDERSPRUCH-SELBSTWEG).

## Nachtrag an U2-ADR-086

§2 gilt unverändert für „Original herunterladen". Die „Provenance im Sinne von ‚so angekommen, so herausgegeben‘" aus §3 ist
mit dieser ADR als Hülle gebaut — neben dem Original, nicht in ihm.

## Nachtrag an U2-ADR-123

Die in „Was offen bleibt" genannte Sperre ist entschieden: Verselbstständigung ist das Abgeben (Entscheidung vom 20.09.2026);
der Übergang „Sub-Depot wird in derselben Sitzung zum Anker" bleibt ungebaut, solange niemand ihn beschließt.

```yaml
konformitaet:
  - aussage: >-
      Die Hülle trägt das Original byte-gleich als Binary und genau eine Provenance mit transmit, deren target das Binary ist;
      Verwahrerin ist die Person selbst, im Sub-Kontext die RelatedPerson mit onBehalfOf, nie Vivodepot.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026
    pruefung:
      - tests/verwahrungsnachweis-huelle.test.js
        "[Verwahrung·Hülle] Laborbefund und Entlassbrief: Original byte-gleich als Binary, eine Provenance, Verwahrerin die Person"
      - tests/verwahrungsnachweis-huelle.test.js
        "[Verwahrung·Hülle] im Sub-Kontext ist die Verwahrerin die RelatedPerson mit onBehalfOf der Person"
      - tests/verwahrungsnachweis-huelle.test.js
        "[Verwahrung·Hülle·Rot-Beweis] verändertes Original, Vivodepot als Verwahrerin und die Provenance im Dokument fallen"
      - tests/verwahrungsnachweis-huelle.test.js
        "[Verwahrung·Hülle] der erste Weg bleibt: „Original herunterladen“ ist weiter byte-gleich, der Knopf der Hülle steht daneben"
      - tests/konformitaet/externe-validatoren.mjs
        "[Extern] jedes Erzeugnis des Generators traegt sein erwartetes Urteil"
  - aussage: >-
      Die Erinnerung zur Übergabe liegt genau auf dem 18. Geburtstag, am 29.02. Geborene am 01.03., nur mit vollem
      Geburtsdatum, und verschwindet nach dem Abgeben.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026
    pruefung:
      - tests/uebergabe-volljaehrigkeit-termin.test.js
        "[Übergabe·18] der Termin liegt genau auf dem 18. Geburtstag, im Prüfblatt und im Kalender"
      - tests/uebergabe-volljaehrigkeit-termin.test.js
        "[Übergabe·18] am 29.02. Geboren: Kalender am 01.03., nie ein ungültiger 29.02. (§ 187 Abs. 2, § 188 Abs. 2 BGB)"
      - tests/uebergabe-volljaehrigkeit-termin.test.js
        "[Übergabe·18] ohne volles Geburtsdatum kein Termin; nach dem Abgeben weg"
      - tests/uebergabe-volljaehrigkeit-termin.test.js
        "[Übergabe·18·Rot-Beweis] ein anderer Stichtag fällt"
  - aussage: >-
      Der Abgeben-Dialog sagt die Grenze: das Depot ist nicht mehr in der Datei, ältere Sicherungskopien enthalten es noch.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026
    pruefung:
      - tests/abgeben-grenze-ehrlich.test.js
        "[Abgeben·Grenze] DE und EN nennen die Datei und die älteren Sicherungskopien, nicht „keine Kopie“"
      - tests/abgeben-grenze-ehrlich.test.js
        "[Abgeben·Grenze·Rot-Beweis] der bis v814 ausgelieferte Wortlaut fällt, DE und EN"
  - aussage: >-
      Ein Widerspruch der vertretenen Person steht in jedem Dialog, der für sie exportiert, übergibt oder aushängt, sperrt
      nichts und verschwindet beim Entfernen nicht spurlos.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026, zwei Bedingungen der Gegenlesung
    pruefung:
      - tests/widerspruch-vertretene-person.test.js
        "[Widerspruch·Bedingung 1] Export-, Übergabe- und Aushäng-Dialog zeigen ihn vor der Bestätigung; er sperrt nichts"
      - tests/widerspruch-vertretene-person.test.js
        "[Widerspruch·Bedingung 2] Entfernen hinterlässt eine Spur; der Eintrag bleibt und ist nicht mehr offen"
      - tests/widerspruch-vertretene-person.test.js
        "[Widerspruch·Klasse] jede flow-Funktion, die für ein Sub-Depot exportiert oder aushängt, geht über die Engstelle"
```
