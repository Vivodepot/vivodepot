# U2-ADR-410: ZVR-Abschrift — das Register nimmt ab 01.10.2026 den Text selbst

**Status:** Angenommen
**Datum:** 13.09.2026
**Kategorie:** PRODUKT, DATENMODELL
**Linie:** U2
**U2-Bezug:** folgt demselben Muster wie `zvr_nummer` (U2-ADR-096/E4) und
`organspenderegister_id` (U2-ADR-199) — ein Feld für die Tatsache, kein erklärender Fließtext.
**Anker:** Entscheidung vom 12.09.2026, wörtlich: „Das Feld kommt vor dem Einfrieren,
zusammen mit dem ZVR-Blatt, mit Datum und der Angabe, wer hinterlegt hat."
**Status heute:** gilt — Beleg `tests/zvr-abschrift-felder.test.js`,
`tests/paritaet-kern-lese.test.js`.

---

## Kontext

Erste Verordnung zur Änderung der Vorsorgeregister-Verordnung, Zustimmung des Bundesrates
10.07.2026, Rechtsgrundlage § 78a Abs. 2 Satz 2 BNotO (Korrektur 03.10.2026, s. Nachtrag): ab 01.10.2026 kann das Zentrale Vorsorgeregister
nicht nur den Hinweis auf eine Vollmacht/Verfügung führen, sondern den TEXT selbst —
behandelnde Ärztinnen bekommen dann Zugriff darauf. Hinterlegen dürfen ausschließlich
institutionelle Nutzer (Betreuungsbehörden, Betreuungsvereine, Anwältinnen, Notare), nie die
Bürgerin selbst.

„Ich habe eingetragen" (`zvr_nummer`) ist damit nicht mehr dasselbe wie „dort liegt mein Text".

**Warum vor dem Einfrieren:** ein Modul erfindet kein Feld (Abweisung `grund: 'feld-unbekannt'`).
Ein Bereichsmodul kann Felder nur über `bereichsErsatz` bringen, und das tauscht den GANZEN
Bereich (U2-ADR-348). Drei Felder nach dem Einfrieren nachzutragen kostet also den kompletten
Vorsorge-Bereich als Ersatzmodul.

## Entscheidung

Drei neue `unterFelder` von `vorsorge.vorsorge_instrumente` (Kern: `vivodepot.html`, direkt
neben `zvr_nummer`; Lese-App: `vivodepot-lesen.html`, wörtliche Übernahme, dieselbe Stelle):

- `zvr_abschrift` — `typ: 'auswahl'`, Optionen `ja`/`nein`, `sensibel: true`.
  `sichtbarWenn: { feld: 'typ', wert: ['vorsorgevollmacht', 'betreuungsverfuegung',
  'patientenverfuegung'] }` — DREI Dokumenttypen, nicht einer: `zvr_nummer` hängt allein an der
  Vollmacht (eine Registrierung, eine Nummer), die Abschrift nimmt das Register für alle drei;
  wer nur eine Patientenverfügung hat, muss sie eintragen können.
- `zvr_abschrift_datum` — `typ: 'datum'`, `sensibel: true`,
  `sichtbarWenn: { feld: 'zvr_abschrift', wert: 'ja' }`.
- `zvr_abschrift_stelle` — `typ: 'ref'`, `entitaet: 'institution'`, `sensibel: true`,
  `sichtbarWenn: { feld: 'zvr_abschrift', wert: 'ja' }` — eine STELLE, keine Privatperson, weil
  nur institutionelle Nutzer hinterlegen dürfen.

Alle drei `sensibel: true`, dieselbe Regel wie `zvr_nummer`/`organspenderegister_id`: eine
Registrierungs-Angabe zu einem Vorsorge-Instrument ist selbst eine Verwundbarkeits-Aussage.

Der Hinweistext zu `zvr_abschrift` nennt die Grenze ausdrücklich („Sie selbst können es nicht")
und das Datum 01.10.2026, damit er nicht zeitlos falsch wird, sobald die Verordnung längst gilt.

## Konsequenzen

`tools/buergermodul/vd-privat.json` (der geschnittene VD-Privat-Bestand, U2-ADR-291/299) wurde
neu erzeugt (`node tools/buergermodul-schnitt.js`) — trägt jetzt 457 statt 454
Feld-Definitionen (270 Top-Level + 187 statt 184 Unterfelder). `tools/bestand-zuwachs-seit-
einfrieren.js` (U2-ADR-326) führt die drei Stellen als benannten Zuwachs, sonst risse der
Ratschen-Beweis in `tests/buergermodul-bereich-erzeugen-u2-adr-319.test.js`.

Kein neuer Hinweistext, der erklärt, dass es das Register gibt — dieselbe Zurückhaltung wie bei
`organspenderegister_id`.

## Nachtrag 03.10.2026: Rechtsgrundlage

Die erste Fassung nannte als Trägernorm „§ 78a Abs. 3 BNotO“. Die Befugnis, die Abschrift
aufzunehmen, steht aber im letzten Satz von § 78a Abs. 2 BNotO in der Fassung von Art. 3 des
Gesetzes vom 16.07.2026 (BGBl. 2026 I Nr. 212, in Kraft am 01.10.2026): „Ergänzend zu der
Registrierung einer in Absatz 1 Satz 1 Nummer 1 bis 3 genannten Vorsorgeverfügung darf auch eine
elektronische Abschrift der Vorsorgeverfügung aufgenommen werden.“ § 78a Abs. 3 ist die
Verordnungsermächtigung. Format und Antragsweg regeln § 1 Abs. 5 und § 3 Abs. 2 VRegV in der Fassung
der Ersten Änderungsverordnung vom 17.08.2026 (BGBl. 2026 I Nr. 238): PDF/A oder TIFF, Antrag nur
durch institutionelle Nutzer. Nachsehen: https://www.recht.bund.de/bgbl/1/2026/212/VO.html und
https://www.recht.bund.de/bgbl/1/2026/238/VO.html.

Die Entscheidung bleibt unverändert.

## Nachtrag 03.10.2026: Hinweis nennt die Rechtslage

Der Hinweis am Feld `copyDepositedInTheRegister` (DE und EN) nennt seitdem die Rechtslage, statt
nur zu fragen, ob hinterlegt wurde: Abschrift zur Registrierung (§ 78a Abs. 2 Satz 2 BNotO, BGBl.
2026 I Nr. 212; § 1 Abs. 5 VRegV, BGBl. 2026 I Nr. 238), einreichen
nur ein Notariat oder eine beim Register zugelassene Stelle, nicht die Person selbst (§ 2 Abs. 1,
§ 3 Abs. 2 VRegV), einsehen vor allem die Person, die einreichende Stelle, Betreuungsgerichte und
Ärzte für eine dringende Behandlung (§ 5 Abs. 3 VRegV, § 78b Abs. 1 BNotO), und das Register zeigt
nicht, ob die Verfügung noch gilt (§ 3 Abs. 4 Satz 3 VRegV). Die Aussagen im Kontext oben über
„behandelnde Ärztinnen“ sind damit auf die dringende Behandlung eingeschränkt. Der Wächter in
`tests/zvr-abschrift-felder.test.js` verlangt diese Angaben und verbietet Zeitbindung, Ärzte ohne
dringende Behandlung und eine positive Gültigkeitsaussage.

## Konformität

```konformitaet
aussage:  vorsorge.vorsorge_instrumente führt in Kern UND Lese-App dieselben drei
          zvr_abschrift*-Unterfelder, sichtbar bei den drei genannten Dokumenttypen.
zustand:  geprüft
pruefung: tests/zvr-abschrift-felder.test.js#[ZVR-Abschrift] die drei Felder stehen im Bürgermodul, mit ihren Typen
pruefung: tests/paritaet-kern-lese.test.js#gemeinsame Listen haben dieselben Unterfelder
```

---

*Vivodepot GmbH · Berlin · 13.09.2026*
