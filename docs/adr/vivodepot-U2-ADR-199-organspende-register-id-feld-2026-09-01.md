# U2-ADR-199: Organspende-Register — ein Feld für die Eintragungs-ID, kein Hinweistext

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** PRODUKT, DATENMODELL
**Linie:** U2
**U2-Bezug:** folgt demselben Muster wie `zvr_nummer` (Zentrales Vorsorgeregister,
U2-ADR-096/E4) — dieselbe Begründung, dieselbe Form, andere Behörde.
**Anker:** Bauauftrag, 01.09.2026, im Zuge der
Fremdquellen-Vollerhebung (`docs/fremdquellen.md#bzga-organspendeausweis`).
**Status heute:** gilt — Beleg `tests/paritaet-kern-lese.test.js`.

---

## Kontext

Das bundesweite Organspende-Register (BfArM, seit 18.03.2024) gibt jeder Erklärung eine eigene
„Erklärungs-ID" (sieben Zeichen, Großbuchstaben und Zahlen). Der Registereintrag ist eine
Ergänzung zur Patientenverfügung/zum Organspendeausweis, kein Ersatz — beide bleiben laut
Register-FAQ nebeneinander gültig. Vivodepot bildet für das Zentrale Vorsorgeregister bereits
`zvr_nummer` als eigenes Feld ab (nicht als erklärender Fließtext) — dieselbe Form gehört auch
hierher: **ein Ort für die Tatsache, kein Satz, der erklärt, dass es das Register gibt.**

## Entscheidung

Neues Feld `organspenderegister_id` als `unterFeld` von `vorsorge.vorsorge_instrumente`, direkt
neben `organspende`/`organspende_einschraenkung` (`vivodepot.html:12006-12009`,
`vivodepot-lesen.html` gespiegelt für die Paritäts-Prüfung):

- `typ: 'text'`, `sensibel: true` (eine Registrierungs-ID für eine gesundheitsbezogene
  Entscheidung ist selbst eine Verwundbarkeits-Aussage — dieselbe Regel wie bei `zvr_nummer`).
- `sichtbarWenn: { feld: 'typ', wert: 'patientenverfuegung' }` — wie `organspende` selbst,
  NICHT verschachtelt unter `organspende: 'teil'`: man kann jede Entscheidung (ja/teil/nein/
  Familie entscheidet) im Register hinterlegen, nicht nur eine eingeschränkte Zustimmung.
- Label: „Organspende-Register — Erklärungs-ID", Beispiel „A3K7B9X" (frei erfunden, im
  bestätigten Format: sieben Zeichen, Großbuchstaben/Zahlen — keine echte ID übernommen).

Kein neuer Hinweistext, der erklärt, dass es das Register gibt — das Feld selbst ist die
Aussage. Kein Ratschlag, sich dort einzutragen.

## Konsequenzen

`vorsorge.vorsorge_instrumente` trägt jetzt 74 statt 73 Unterfelder (Kern und Lese-App
gleichermaßen, geprüft über `tests/paritaet-kern-lese.test.js`). Keine Änderung an
`organspende`/`organspende_einschraenkung` selbst.

## Konformität

```konformitaet
aussage:  vorsorge.vorsorge_instrumente führt in Kern UND Lese-App dasselbe Unterfeld
          organspenderegister_id, sichtbar bei typ='patientenverfuegung'.
zustand:  geprüft
pruefung: tests/paritaet-kern-lese.test.js#gemeinsame Listen haben dieselben Unterfelder
```

---

*Vivodepot GmbH · Berlin · 01.09.2026*
