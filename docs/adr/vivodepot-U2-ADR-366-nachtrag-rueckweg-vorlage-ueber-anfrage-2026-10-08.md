# U2-ADR-366-Nachtrag — Der Rückweg einer Vorlage läuft über die Anfrage, und nur die geprüfte Stelle erreicht ihre eigenen Felder

**Status:** Angenommen (08.10.2026, Krypto-Wort der Gegenlesung vor dem Bau, Bau-Entscheidung der Geschäftsführung) · Nachschärfungen 09.10.2026 (be5b72d2c, 0d2fefcac)
**Datum:** 2026-10-08
**Bezug:** U2-ADR-366 (Teil 1: Antwort auf ein benanntes Template; Teil 2 Orchestrierung, bis heute nicht gebaut) · U2-ADR-449
(Antwort als JWE) · U2-ADR-152 §5 (Zertifikatskette der Anfrage) · U2-ADR-040 (Template-Signatur)
**Linie:** U2

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

---

## Anlass

Eine Einrichtung baut im Studio eine Vorlage (etwa einen Aufnahmebogen). Die Person importiert sie mit dem Anbieter-Zertifikat
und füllt die Felder `tpl_…` in ihrem Depot aus. Zurück ging bisher nur ein PDF über „Dokument erzeugen“. U2-ADR-366 Teil 1 hatte
die Bindung „Antwort auf genau diese Vorlage“ gebaut (`antwortAufTemplateErzeugen`), aber ohne Aufrufer. Teil 2 blieb offene
Richtung. Weg zum Nachsehen am Stand vor diesem Nachtrag: `grep -n "antwortAufTemplateErzeugen(" vivodepot.html`.

Beim Bau gefunden, Befund **ANFRAGE-VORLAGENFELD-ANBIETERUEBERGREIFEND** (MITTEL): `kennungPruefen` löste die interne Form
`bereich.tpl_…` für **jede** Anfrage auf, auch eine unsignierte. Stelle A bekam damit den Wert aus der Vorlage von Stelle B.
Schon das Fehlen in `unbekannt` verriet, dass die Person eine Vorlage von B hat.

## Entscheidung

1. **Der Rückweg ist die Antwort auf die Anfrage der Einrichtung.** Kein neues Protokoll und keine neue Krypto: Signatur der
   Anfrage (U2-ADR-152), JWE-Hülle, AAD und Schlüsselwege nach U2-ADR-449. Die Anfrage darf Felder ihrer Vorlage nennen, als
   `bereich.<anbieterId>:tpl_…` oder intern `bereich.tpl_…`. Kein Vermittler: Die Person gibt die Datei selbst weiter.
2. **Eine einzige Prüffunktion** (`anfrageVorlagenfeldPruefen`) entscheidet für jedes `tpl_`-Feld und jede Anbieter-Kennung
   einer Anfrage. Sie löst nur auf, wenn
   - die Stelle aus `anfrageSignaturPruefen` mit `geprueft === true` kommt; eine Anfrage ohne Zertifikat (Variante A) löst nie
     ein Vorlagenfeld auf,
   - eine Anbieter-Kennung genau diese Stelle nennt,
   - die Felddefinition dieser Stelle gehört (`feldDefinitionen[].anbieterId`),
   - und eine Vorlage dieser Stelle das Feld führt, nicht widerrufen ist und ihr Beleg sich im selben Aufruf nachrechnen lässt
     (`anfragePruefenMitVorlagen`: `verifiziereTemplateKette`). Der Anbieter kommt dabei aus dem signierten Zertifikat, die
     Feld-Kennung aus dem signierten Template. Es zählt nur eine gültige Kette (`gueltig === true`): Ein abgelaufenes oder widerrufenes
     Anbieter-Zertifikat löst nichts auf, auch nicht über die Schonfrist der Kette. Das Feld `beleg`, `anbieterId` oder `feldIds` des Eintrags entscheidet nichts.
3. **Das Prüfergebnis entsteht im selben Aufruf aus demselben Umschlag wie der Datensatz** (`anfrageAntwortDatensatzGeprueft`).
   Der gemerkte Eintrag hebt den signierten Umschlag auf (`eintrag.umschlag`), und beim Herausgeben wird frisch geprüft. Das Flag
   `eintrag.geprueft` öffnet nichts. Der Weg ohne Umschlag (`anfrageAntwortDatensatz`) löst nie ein Vorlagenfeld auf.
4. **Kein Orakel.** Alles, was nicht auflöst, wird eine Zeile `{ kennung, grund: 'unbekannt' }`, byte-gleich mit einer Kennung,
   die es nicht gibt.
5. **Die Bindung reist mit.** Je beantworteter Vorlage steht im verschlüsselten Datensatz ein Block `antwortAuf` aus
   `antwortAufTemplateErzeugen`, mit den vier Zuständen Wert, leer, unbekannt und zurückgehalten. Freigegeben ist, was die
   Auswahl der Person durchgelassen hat. Der Block besteht `antwortPasstZuTemplate` („genau diese Schlüssel“), sonst geht er
   nicht mit.
6. **Die Einrichtung liest ihre Kennung zurück**, nicht die interne. Ein Feld, das sie in zwei Formen fragt, bekommt zwei Zeilen.
7. **Gesperrt wird nur, was einer Stelle gehört.** Ein Feld im Namensraum `tpl_…` ist nicht immer das Feld einer Stelle: eine eigene Felddefinition (U2-ADR-037) in einem angedockten Bereich trägt denselben Namensraum, aber keine `anbieterId`. Eine Anfrage fragt sie wie jedes andere Feld ab, auch unsigniert (Fünferprobe Baukasten-Kombination). Als Feld einer Stelle gilt dagegen:
   - eine Felddefinition mit `anbieterId` (gesetzt beim Import einer Vorlage, `_templateFeldZuModell`),
   - eine Kennung mit Anbieter-Präfix,
   - ein Feld, das irgendeine importierte Vorlage in `feldIds` führt, mit oder ohne `anbieterId` (fail-closed). `anbieterId` an der Felddefinition gibt es erst seit dem 20.08.2026, `importierteVorlagen` seit dem 11.08.2026; ein Vorlagenfeld aus der Zeit dazwischen trüge keine `anbieterId` und wäre sonst ohne Prüfung abfragbar. `feldIds` trägt keinen Bereich, der Abgleich läuft über die Feld-Kennung und kann deshalb zu viel sperren: ein gleichnamiges Feld in einem anderen Bereich wird dann ebenfalls zu `unbekannt`.

   Alles, was keines der drei erfüllt, geht den normalen Weg: es löst auf oder bleibt `unbekannt`. Was gesperrt ist, ist byte-gleich mit `unbekannt` (Punkt 4), die Antwort verrät also nichts. Das Verhalten für Felder einer Stelle (Punkte 2 bis 4) bleibt unverändert. Ausgeliefert wurde erst ab v1.0 (24.09.2026), also nach Einführung von `anbieterId`; ein ausgelieferter Bestand ohne `anbieterId` ist nicht bekannt. Die dritte Bedingung ist deshalb vorbeugend.

Fundstelle: `vivodepot.html:55056-55069` (`anfrageVorlagenfeldPruefen`, Konstante `einerStelle`).

## Was dieser Nachtrag nicht tut

- Die Antwort ohne vorherige Anfrage (die Vorlage selbst als Anfrage) gehört nicht dazu.
- Der Rückweg bestätigt keine Identität. Der Absender ist eine Angabe der Person (U2-ADR-437). Wer sich gegenüber der
  Einrichtung ausweisen muss, tut das auf deren Weg (vor Ort, per Post, über ein bestehendes Konto). Eine Wallet oder eID
  kommt höchstens optional dazu, nie als einziger Weg (Grundsatz „niemand zurückgelassen“, 08.10.2026).
- „Anfrage zu Ihrer Vorlage“ im Studio folgt als eigener Schritt.
- Register-Felder einer Vorlage an die vorhandenen Depot-Felder zu binden ist Baustein 1b des Übergabe-Plans.
- Zwei Vorlagen verschiedener Stellen mit gleich benanntem Feld teilen sich heute denselben Platz im Depot (`tpl_<slug>`). Die
  Prüfung oben verhindert, dass eine Stelle über die Vorlage einer anderen fragt. Den gemeinsamen Platz selbst löst sie nicht
  auf. Das ist ein Folgeposten.

```yaml
konformitaet:
  - aussage: >-
      Eine geprüfte Anfrage der Eigentümerin bekommt die Werte ihrer Vorlagenfelder in beiden Kennungsformen und einen Block
      antwortAuf mit den vier Zuständen.
    zustand: erfuellt
    herkunft: U2-ADR-366-Nachtrag (08.10.2026)
    pruefung:
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P1] die eigene Vorlage wird beantwortet, in beiden Formen, mit antwortAuf"
  - aussage: >-
      Die Vorlage einer anderen Stelle, eine unsignierte Anfrage, ein Flag ohne Umschlag und eine Vorlage ohne Beleg lösen nichts auf;
      fremde und fehlende Vorlage ergeben byte-gleiche Zeilen.
    zustand: erfuellt
    herkunft: U2-ADR-366-Nachtrag (08.10.2026), Befund ANFRAGE-VORLAGENFELD-ANBIETERUEBERGREIFEND
    pruefung:
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P2] die Vorlage einer anderen Stelle bleibt unbekannt, in beiden Formen"
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P8] eine unsignierte Anfrage, die sich als Eigentümerin ausgibt, löst nichts auf"
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P9] ein Flag am Eintrag zählt nicht, nur die Prüfung am Umschlag"
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P10] eine Vorlage ohne Beleg löst nichts auf"
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P13] der Beleg wird nachgerechnet: gefälschter Beleg und nachgetragenes Feld lösen nichts auf"
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P14] ein abgelaufenes Anbieter-Zertifikat der Vorlage löst nichts auf"
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P15] ein widerrufenes Anbieter-Zertifikat der Vorlage löst nichts auf"
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P11] kein Orakel: fremde Vorlage und keine Vorlage ergeben byte-gleiche Zeilen"
  - aussage: >-
      Die Antwort geht als JWE nach U2-ADR-449 hinaus, und die Lese-App öffnet sie unverändert; der Block antwortAuf besteht den
      Wächter „genau diese Schlüssel“.
    zustand: erfuellt
    herkunft: U2-ADR-366-Nachtrag (08.10.2026)
    pruefung:
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P5] die Antwort geht als JWE hinaus, die Lese-App öffnet sie unverändert"
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P4] der Block besteht „genau diese Schlüssel“, ein eingeschmuggelter nicht"
  - aussage: >-
      Ein eigenes tpl_-Feld ohne Stelle (keine anbieterId, in keiner importierten Vorlage geführt) wird wie jedes andere Feld
      beantwortet, auch bei unsignierter Anfrage; dieselbe Definition mit anbieterId bleibt ohne geprüfte Anfrage unbekannt.
    zustand: erfuellt
    herkunft: U2-ADR-366-Nachtrag (09.10.2026), Punkt 7, erste und zweite Bedingung
    pruefung:
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P16] ein eigenes tpl_-Feld ohne Stelle wird beantwortet; mit Stelle bleibt es ohne Prüfung unbekannt"
  - aussage: >-
      Ein Vorlagenfeld ohne anbieterId an der Definition bleibt ohne geprüfte Anfrage gesperrt (byte-gleich mit unbekannt),
      sobald eine importierte Vorlage es führt; ohne Vorlagen-Eintrag wird dasselbe Feld beantwortet.
    zustand: erfuellt
    herkunft: U2-ADR-366-Nachtrag (09.10.2026), Punkt 7, dritte Bedingung
    pruefung:
      - tests/vorlagen-rueckweg.test.js "[Vorlagen-Rückweg·P17] ein Vorlagenfeld ohne anbieterId an der Definition bleibt gesperrt, wenn eine Vorlage es führt"
```
