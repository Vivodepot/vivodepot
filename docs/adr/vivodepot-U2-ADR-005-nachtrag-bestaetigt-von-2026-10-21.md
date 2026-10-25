# U2-ADR-005-Nachtrag — Neben einer eingelesenen, geprüften Angabe steht die Stelle, die sie bestätigt hat

**Status:** Angenommen (21.10.2026, Krypto-Wort vor dem Bau, einzeln freigegeben)
**Datum:** 2026-10-21
**Bezug:** U2-ADR-005 (Urheberschaft pro Eintrag) · U2-ADR-030 (`verifiziert` nur am geprüften Weg) · U2-ADR-028 (Ebene 3a,
eigenes Anbieter-Zertifikat) · U2-ADR-152 (der Anbieter kommt aus dem signierten Zertifikat)
**Linie:** U2

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

---

## Anlass

Eine Angabe aus einem geprüften Anbieter-Zertifikat (Format `provider-credential`) zeigte daneben „eingelesen (Geprüftes
Anbieter-Zertifikat)“. Genannt war damit das Format, nicht die Stelle. Der Stempel (`provenancEintrag`) hatte kein Feld für sie.
Gezeigt wird die Stelle aber in einer Vorführung: Eine Beratung bestätigt Angaben, und eingelesen stehen sie mit ihrem Namen
daneben. Weg zum Nachsehen am Stand vor diesem Nachtrag: `grep -n "letzter.quelle ? ' ('" vivodepot.html`.

U2-ADR-005 nannte die kryptografisch gebundene Form der Urheberschaft „eine spätere Schicht“. Dieser Nachtrag ist ihr erster Teil:
Die Stelle, die eine Angabe bestätigt hat, steht im Stempel, und zwar nur, wenn ihr Zertifikat geprüft ist.

## Entscheidung

1. **Der Stempel trägt `bestaetigtVon: { anbieterId, anbieterName }`.** Name und Kennung kommen aus dem geprüften
   Anbieter-Zertifikat (`credentialSubject`), nie aus den Angaben selbst. Ein Anzeigename im Inhalt ist kein Beleg; das gilt
   ebenso für die Anfrage (U2-ADR-152).
2. **Nur ein Plan, den die Prüfung selbst gebaut hat, gibt den Namen weiter.** `importPlanGeprueft` merkt sich den Plan nach
   bestandener Prüfung; `importAnwenden` übernimmt `bestaetigtVon` nur von einem solchen Plan. Ein Plan, der den Namen selbst
   mitbringt, auch mit `signiert: true`, trägt ihn nicht in den Stempel.
3. **Die Zeile neben der Angabe nennt die Stelle:** „eingelesen · bestätigt von <Name> · Datum“. Ohne Namen im Zertifikat
   bleibt es beim Format-Etikett wie bisher.
4. **Kein Schema-Wechsel.** Der Stempel nimmt zusätzliche Schlüssel seit Welle 1 auf (`provenancEintrag(extra)`); ältere
   Fassungen lesen ihn weiter und zeigen den Namen nicht.

## Was dieser Nachtrag nicht tut

- Er lässt eine Stelle nichts **selbst** ausstellen. Die Angaben stehen weiter im Anbieter-Zertifikat, signiert vom Anker oder
  einer Zwischenstufe. Das Ausstellen durch die Stelle im Studio folgt in einem eigenen Wagen mit eigener ADR.
- Die Lese-App und der FHIR-Export zeigen `bestaetigtVon` noch nicht. Beides gehört zu diesem Folgewagen (Nachtrag zu
  U2-ADR-081).
- Ein späterer Widerruf des Zertifikats ändert einen Stempel nicht. Er hält den Stand beim Einlesen fest (U2-ADR-172: Die
  Verteilung eines Widerrufs an ausgelieferte Depots ist nicht gebaut).

- Golden-Master der Ausgabewege (tests/fixtures/golden-master-ausgabewege-baseline.json): Der neue Text
  strings:urheberBestaetigtVon kommt im Datei-Rundlauf zweimal als Zeile hinzu. Sonst bewegt sich nichts; die Baseline ist
  dafür neu aufgenommen (24.10.2026).

```yaml
konformitaet:
  - aussage: >-
      Eine Angabe aus einem geprüften Anbieter-Zertifikat trägt im Stempel bestaetigtVon aus dem Zertifikat, und die Zeile
      daneben nennt die Stelle statt des Format-Etiketts.
    zustand: erfuellt
    herkunft: U2-ADR-005-Nachtrag (21.10.2026)
    pruefung:
      - tests/bestaetigt-von-stempel.test.js "[Bestätigt] die Zeile neben der Angabe nennt die Stelle aus dem geprüften Zertifikat"
      - tests/bestaetigt-von-stempel.test.js "[Bestätigt·Rot-Beweis] ohne den Stempel-Schritt steht wieder nur das Format-Etikett da"
  - aussage: >-
      Der Name kommt nur aus dem geprüften Zertifikat: ein Name in den Angaben, ein Plan mit eigenem bestaetigtVon und ein nicht
      vom Anker signiertes Zertifikat geben keinen Namen in den Stempel.
    zustand: erfuellt
    herkunft: U2-ADR-005-Nachtrag (21.10.2026)
    pruefung:
      - tests/bestaetigt-von-stempel.test.js "[Bestätigt] ein Name in den Angaben selbst ändert den Stempel nicht"
      - tests/bestaetigt-von-stempel.test.js "[Bestätigt] ein Zertifikat ohne Namen der Stelle gibt keinen Namen, die Zeile bleibt beim Format-Etikett"
      - tests/bestaetigt-von-stempel.test.js "[Bestätigt] ein nicht vom Anker signiertes Zertifikat lässt weder Angabe noch Namen herein"
      - tests/bestaetigt-von-stempel.test.js "[Bestätigt] ein Plan, der bestaetigtVon selbst mitbringt (auch mit signiert: true), trägt es nie in den Stempel"
```
