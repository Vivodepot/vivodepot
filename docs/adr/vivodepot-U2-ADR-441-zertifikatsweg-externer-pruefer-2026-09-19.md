# U2-ADR-441 · Zertifikatsweg für externe Prüfer

**Status:** Akzeptiert, gebaut (Kern, Ausstellwerkzeuge, Issuer); die Lese-App folgt mit dem Beleg-Laden der Sprachmodule.
**Datum:** 19.09.2026
**Kategorie:** SICHERHEIT, ARCHITEKTUR
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`verifiziereProviderCredential`, `_pruefstufeFuerModul`, `_geltungPasst`, `_originaleSummeKern`, `_istPrueferUnterTreuhand`, `tools/lib/originale-summe.js`, `modulEinlassenGeprueft`), `tools/kundenzertifikat-ausstellen.js`, `tools/behoerden-zertifikat-ausstellen.js`, `tools/lib/pruefer-angaben.js`, `vivodepot-vc-issuer.html`, `docs/pruefstelle-zulassung.md`.
**Bezug:** U2-ADR-172 (Zwischenstufe), U2-ADR-181 (Vertrauensstufen, Prüfstelle), U2-ADR-038 und -173 (Ablauf und Notfall-Widerruf), U2-ADR-331 (Zusicherungen sind kein Inhalt).

## Frage

Wie wird eine externe Stelle zum `pruefer`, dessen signierte Sprachmodule Zusicherungssätze übersetzen dürfen?

## Entscheidung

Auf der vorhandenen Kette (Anker → Zwischenstufe → Anbieter → Modul), kein neuer Mechanismus:

1. **Der Regelweg braucht keine neue Anker-Zeremonie.** Die Treuhand (die eigene Ausgabestelle, vom Anker signiert und in `EIGENE_AUSGABESTELLEN` geführt) stellt der Prüfstelle ein **Blatt-Zertifikat** mit `rolle: pruefer` und `geltung` aus, mit `tools/kundenzertifikat-ausstellen.js --rolle pruefer --sprachen … --modultypen …`. Die Rolle im Blatt zählt **nur unter der eigenen Treuhand**: unter jeder anderen Zwischenstufe wäre sie eine Selbstauskunft und wird ignoriert; ein `vivodepot/*`-Blatt wird dadurch kein Prüfer. Der zweite Weg, die Prüfstelle als eigene Zwischenstufe (`vivodepot/pruefstelle`, `rolle` und `geltung` im Zwischenzertifikat, ausgestellt mit `tools/behoerden-zertifikat-ausstellen.js` in einer Anker-Zeremonie), bleibt gültig und wird nicht gebraucht. Beide Werkzeuge prüfen mit derselben Funktion (`tools/lib/pruefer-angaben.js`).
2. **Getrennte Zertifikate je Rolle.** Eine Stelle, die Module herausgibt und prüft, führt zwei Zertifikate mit zwei Schlüsseln. Die Rolle steht im Zertifikat der Stelle und gilt für alle ihre Module. (U2-ADR-181 sprach von der Rolle „bei einem Modul"; der Code las sie immer aus dem Zertifikat der Aussteller-Stufe. Die Formulierung dort ist im Text angepasst.)
3. **Geltungsbereich im Zertifikat der Stelle** (Blatt unter der Treuhand, oder Zwischenzertifikat einer Prüfstelle): `geltung: { modulTypen: [...], sprachen: [...] }`. Die Stelle bürgt nur, wo sie zugelassen ist. **Fehlt der Geltungsbereich, ist er unbrauchbar oder passt er nicht zu Modultyp und Sprache des Moduls, gilt die Stelle nicht als Prüferin:** das Modul ist `extern-ungeprueft`. Im Zweifel zu, nicht auf. Deutsch und Englisch sind app-eigen und werden nicht zugelassen (das Werkzeug lehnt sie ab).
4. **Bindung an die Originalsätze, je Basissprache** (Fassung 28.09.2026, nach U2-ADR-428; abgestimmt mit der Gegenlesung). Seit U2-ADR-428 trägt ein Produkt nur seine Basissprache (privat-de Deutsch, privat-en Englisch). Die Modulnutzlast trägt darum `originaleSumme: { kern: { de, en } }`: je Basissprache die Prüfsumme (SHA-256, hex, kanonisches JSON `{ sprache, saetze: [{ k, text }] }`, nach Schlüssel sortiert) der Zusicherungssätze, die die Prüfstelle vor sich hatte. Der Kern prüft gegen die Summe **seiner** Basissprache (`_originaleSummeKern`, `_sprachBasisSprache`). **Fehlt sie, wird das Modul abgelehnt**, nicht ungeprüft eingelassen; weicht sie ab (ein Originalsatz wurde geändert), ist es `extern-ungeprueft`. Beide Summen liegen in der signierten Nutzlast: eine nachträglich ergänzte oder geänderte Summe bricht die Signatur. Die Prüfstelle rechnet mit `tools/lib/originale-summe.js` aus genau den zwei Sprachmoduldateien eines genannten Stands (`git show <stand>:tools/textsatz-{de,en}-modul.json`); eine Probe hält die Summe des Werkzeugs je Sprache gleich der des Kerns. Die ursprüngliche Fassung vom 19.09. (`{ kern, lesen }` über Deutsch und Englisch aus zwei Kern-Konstanten) ist mit U2-ADR-428 gegenstandslos geworden; die Lese-App prüft die Bindung noch nicht.
5. **Laufzeit zwölf Monate** (wie die Ausgabestelle, U2-ADR-172), das Werkzeug nimmt sie als Vorgabe und lehnt mehr ab, der Issuer schlägt sie für eine Zwischenstufen-Prüfstelle vor. Die Erneuerung ist ein neues Zertifikat und eine neue Zulassung. Kein neues Sperrverfahren: Ablauf (U2-ADR-038) und der Notfall-Weg über eine neue Fassung (U2-ADR-173), mit deren ehrlicher Grenze für reine Offline-Kopien. Ein abgelaufenes oder widerrufenes Zertifikat der Kette macht sie ungültig: das Modul wird nicht eingelassen und beim erneuten Prüfen als ungeprüft behandelt.
6. **Keine Akkreditierungspflicht, keine Schwelle.** Die Zulassung folgt Kriterien als Text (`docs/pruefstelle-zulassung.md`); eine Akkreditierung nach ISO/IEC 17065 ist ein anerkannter Nachweis, keine Bedingung. Zwei Prüfstellen je Sprache sind nicht verlangt.
7. **Der Issuer reserviert alle `vivodepot/*`-Typen** (Ausgabestelle, Prüfstelle, Institution, Kern) für den Anker; ein Einreichungspaket darf keinen davon behaupten.

Die Entscheidung „gilt dieses Modul für Zusicherungssätze?" ist eine reine Funktion, `_pruefstufeFuerModul(certRes, modul, summen)`, die Stufe und Grund liefert (`kette-ungueltig`, `geltung-fehlt`, `geltung-ungueltig`, `geltung-modultyp`, `geltung-sprache`, `originale-fehlt`, `originale-geaendert`). Wer ein Modul erneut prüft (Einlass, Laden), ruft sie mit derselben Kette auf.

## Was diese Entscheidung nicht leistet

Eine inhaltlich falsche Übersetzung mit richtiger Form erkennt keine Regel. Es tragen Signatur, Geltungsbereich, Laufzeit und die Zulassung der Stelle. Ein Widerruf erreicht rein offline genutzte Kopien nicht vor dem Ablauf. Das Verzeichnis der zugelassenen Stellen ist Auskunft, keine Vertrauensquelle; die Kette prüft die App selbst.

## Nicht Teil dieser Entscheidung

Verträge, Vergütung und Haftung zwischen der Prüfstelle und dem Betreiber. Der Code trifft keine Zulassungsentscheidung, er kennt nur das Zertifikat.

```yaml
konformitaet:
  - aussage: >-
      Ein Modul unter einer Prüfstelle mit passendem Geltungsbereich und passender Prüfsumme der Originale
      gilt als extern-geprueft:pruefer.
    zustand: erfuellt
    herkunft: U2-ADR-441 (19.09.2026)
    pruefung:
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Prüfstelle·Regelfall] Geltungsbereich passt, Originale passen → extern-geprueft:pruefer"
  - aussage: >-
      Ein Prüfer-Blatt unter der eigenen Treuhand gilt als Prüfer; dieselbe Rolle im Blatt unter einer fremden
      Ausgabestelle ist Selbstauskunft und zählt nicht.
    zustand: erfuellt
    herkunft: U2-ADR-441 (19.09.2026)
    pruefung:
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Treuhand·Regelweg] ein Prüfer-Blatt unter der eigenen Treuhand mit passendem Geltungsbereich gilt als extern-geprueft:pruefer"
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Treuhand·Rot] dieselbe Rolle im Blatt unter einer FREMDEN Ausgabestelle ist Selbstauskunft und zählt nicht"
  - aussage: >-
      Ohne Geltungsbereich, mit falscher Sprache oder falschem Modultyp gilt die Stelle nicht als Prüferin.
    zustand: erfuellt
    herkunft: U2-ADR-441 (19.09.2026)
    pruefung:
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Prüfstelle·Rot] OHNE Geltungsbereich gilt die Stelle nicht als Prüferin"
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Prüfstelle·Rot] falsche Sprache: die Stelle ist für fr zugelassen, das Modul ist ungarisch"
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Prüfstelle·Rot] falscher Modultyp"
  - aussage: >-
      Ein geänderter Originalsatz ändert die Prüfsumme seiner Sprache; eine Übersetzung mit alter Prüfsumme gilt
      als ungeprüft, eine ohne die Summe der Basissprache des Produkts wird abgelehnt; eine nachträglich
      geänderte Summe bricht die Signatur; das Werkzeug der Prüfstelle rechnet je Sprache dieselbe Summe wie der Kern.
    zustand: erfuellt
    herkunft: U2-ADR-441 (19.09.2026, Fassung 28.09.2026)
    pruefung:
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Originale·Rot] ändert sich ein Originalsatz der App, ändert sich die Prüfsumme — je Basissprache"
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Originale·je Sprache·Rot] fehlt die Summe der Basissprache des Produkts, wird das Modul ABGELEHNT"
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Originale·Signatur·Rot] eine nachträglich ergänzte Summe bricht die Signatur"
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Originale·Werkzeug] die Summe des Prüfstellen-Werkzeugs ist je Sprache die des Kerns — aus den Sprachmoduldateien eines Stands"
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Prüfstelle·Rot] geänderte Originale: falsche Prüfsumme im Modul ergibt ungeprüft"
  - aussage: >-
      Ein abgelaufenes Zwischenzertifikat macht die Kette ungültig.
    zustand: erfuellt
    herkunft: U2-ADR-441 (19.09.2026)
    pruefung:
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Prüfstelle·Rot] abgelaufenes Zwischenzertifikat: die Kette gilt nicht, das Modul wird nicht angenommen"
  - aussage: >-
      Das Ausstellwerkzeug stellt keine Prüfstelle ohne Geltungsbereich, für Deutsch oder Englisch oder für
      mehr als ein Jahr aus.
    zustand: erfuellt
    herkunft: U2-ADR-441 (19.09.2026)
    pruefung:
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Werkzeug·Rot] eine Prüfstelle ohne Geltungsbereich wird nicht ausgestellt"
      - tests/pruefstelle-geltung-und-originale.test.js
        "[Werkzeug·Rot] Deutsch und Englisch sind app-eigen: dafür wird keine Prüfstelle zugelassen"
```
