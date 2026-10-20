# U2-ADR-504 · Rechtsraum DE ist ein Modul wie jedes andere — Nachfolge zu U2-ADR-285

**Status:** Angenommen (20.09.2026), fortgeschrieben 17.10.2026 mit R1 „Rechtsraum als Modul im Kern“ (§3)
**Status heute:** teilweise überholt — §1 Punkt 1 und 2 sind durch §3 abgelöst; §1 Punkt 3–6 und §2 gelten weiter. Belege in den Konformitätsblöcken.
**Datum:** 20.09.2026 · Nachtrag 17.10.2026
**Kategorie:** ARCHITEKTUR, RECHTSRAUM
**Linie:** U2
**Betrifft:** `vivodepot.html` (`AB_WERK_RECHTSRAUM_KATALOG_QUELLE`, `AB_WERK_RECHTSRAUM_PRODUKT`,
`validateRechtsraumModul`, `_rechtsraumModulUebersetzen`, `_rechtsraumAbWerkRegistrySeed`),
`tools/rechtsraum-de-modul.json`, `tools/lib/produkt-text-erzeugen.js`, `tools/lib/vier-produkte.js`
**Bezug:** U2-ADR-121 (Rechtsraum-Modul), U2-ADR-285 (Reservierung von "DE", Gerüst-eigener Ladeweg),
U2-ADR-382 (Rechtsraum DE wird Modul), Korpus-Zuordnung Rechtsraum und Template (Nummer offen) · Nachtrag: U2-ADR-254, U2-ADR-255,
U2-ADR-466, U2-ADR-495, Befunde RECHTSRAUM-FEST-IM-KERN (HOCH) und RECHTSRAUM-SCHEMA-BESCHREIBT-DE-MODUL-NICHT (MITTEL)

---

## 0 · Ausgangslage

U2-ADR-285 hält `rechtsraum: "DE"` für jeden Aufrufer reserviert, weil das Gerüst einen eigenen, eingebackenen
deutschen Katalog trägt und kein Modul ihn kapern darf. Das Gerüst trägt keinen Inhalt mehr: der deutsche Katalog
zieht in eine Moduldatei, die das Produkt mitbringt. Damit entfällt der Grund der Reservierung.

## 1 · Was sich ändert

1. **`AB_WERK_RECHTSRAUM_KATALOG_QUELLE` ist im Gerüst `{}`.** *(Abgelöst durch §3: die Region entfällt ganz.)* Der deutsche Katalog steht in
   `tools/rechtsraum-de-modul.json` (`modulTyp: "rechtsraum"`) und wird in alle vier Produkte gebacken.
   `_rechtsraumKatalogAlsModul()` und der frühere Erzeuger `rechtsraum-de-modul-erzeugen` entfallen;
   die JSON-Datei ist die Quelle.
2. **`'DE'` ist nur reserviert, solange `AB_WERK_RECHTSRAUM_DE` belegt ist.** *(Abgelöst durch §3 Punkt 4: reserviert ist der Code jedes Ab-Werk-Moduls; `AB_WERK_RECHTSRAUM_DE` entfällt.)* `validateRechtsraumModul` lehnt `'DE'`
   ab, wenn das Gerüst einen eigenen deutschen Katalog trägt. Ist er leer, läuft `'DE'` durch die normale
   Modul-Prüfung. Die Prämisse der Sperre wird positiv geprüft; sie stellt sich beim Schnitt von selbst um.
3. **Die Sperre trägt zwei Zusicherungen, nur die erste hängt an DE.**
   (a) Das Gerüst-eigene Fach wird nicht gekapert. Sie entfällt mit dem Gerüst-Katalog.
   (b) Eine eingebackene Region genießt kein höheres Vertrauen als ein Modul von außen. Die Produkt-Region wird
   ohne `erlaubtGeruestEigenesDE` geprüft, mit derselben Funktion wie am `EINLASS_REGISTER`-Weg. Sie gilt
   unverändert weiter: ein fehlgeformtes DE-Modul in der Produkt-Region wird abgelehnt.
4. **`AB_WERK_RECHTSRAUM_PRODUKT` ist ein Listen-Typ, zum Erhalt.** Vor dem Schnitt hatte ein Produkt zwei Fächer
   in der Registry: `DE` aus dem eingebackenen Katalog und ein weiteres aus der Produkt-Region. Bliebe die Region
   einwertig, hätte es danach eines. Die Liste erhält den bisherigen Stand; eine Fähigkeit für mehr als zwei
   Rechtsräume ist damit weder benutzt noch zugesichert.
5. **`_RECHTSRAUM_TYP_SCHLUESSEL` ersetzt die Prüfung gegen den Gerüst-Katalog** im Namensraum-Schutz von
   `_rechtsraumModulUebersetzen`. Ein Typ steht dort, weil der Kern auf ihn verzweigt, nicht weil es ihn gibt. Die
   Liste ist Ablauf-Wissen, kein Katalog; der Inhalt je Typ kommt aus dem Rechtsraum-Modul.
6. **Die Einspeisung von `KI_KORPUS.herkunft` und `.formhinweis` in den Katalog entfällt.** Gemessen: `herkunft`
   wurde nirgends gelesen, `formhinweis` liest der Kern direkt aus `KI_KORPUS`; aus dem Katalog liest er nur
   `formvorschriften.paragraf`. Das DE-Modul trägt für `ki-verfuegung` `hinweis: null`. Der frühere feste Text nannte
   einen Markennamen und wäre in jedes White-Label-Produkt gebacken worden.

## 2 · Was diese Entscheidung nicht ist

Kein zweiter deutscher Rechtsraum und keine Zusage für Produkte mit mehr als zwei Rechtsräumen. Die Aufteilung von
`PV_BMJ`/`VOLLMACHT_BMJ` in dieses Modul folgt der Korpus-Zuordnung und ist ein eigener Schritt.

## Konformität

```konformitaet
aussage:   Trägt das Produkt ein DE-Modul ab Werk, bleibt ein selbst eingelassenes DE-Modul wirkungslos (seit §3: statt des
           künstlich belegten Gerüst-Fachs, das es nicht mehr gibt).
zustand:   prüfbar
pruefung:  tests/achse-rechtsraum-produkt.test.js#[Sicherheits-Rot-Beweis·Ab-Werk] trägt das Produkt ein DE-Modul ab Werk, bleibt ein selbst eingelassenes DE-Modul wirkungslos
```

```konformitaet
aussage:   Ist das Gerüst-Fach DE leer, greift ein DE-Modul über die normale Prüfung; ein fehlgeformtes wird
           weiterhin abgelehnt (eine eingebackene Region ist kein Freibrief).
zustand:   prüfbar
pruefung:  tests/achse-rechtsraum-produkt.test.js#[Sicherheits-Rot-Beweis·leer] ist das Gerüst-Fach leer, greift ein DE-Modul über die normale Prüfung
pruefung:  tests/achse-rechtsraum-produkt.test.js#[Sicherheits-Rot-Beweis·leer] auch bei leerem Fach wird ein fehlgeformtes DE-Produkt-Modul abgelehnt — kein Freibrief für eingebackene Regionen
```

```konformitaet
aussage:   Das UK-Produkt trägt nach dem Schnitt weiterhin die zwei Fächer DE und GB.
zustand:   prüfbar
pruefung:  tests/achse-rechtsraum-produkt.test.js#[Rechtsraum-Achse·Erhalt] das UK-Produkt trägt nach dem Gerüst-Schnitt weiterhin DE und GB — der Schnitt hat kein Fach gekostet
```

## 3 · Nachtrag 17.10.2026 — R1 „Rechtsraum als Modul im Kern“

Gebaut am 09.10.2026, auf den Kanon gebracht am 17.10.2026. Fortschreibung dieser
Entscheidung, keine neue.

### Frage

Seit dem Gerüst-Schnitt S3 kommt der deutsche Rechtsraum-Katalog als Moduldatei in jedes Produkt. Der Kern trug trotzdem weiter einen
festen deutschen Rechtsraum: die Konstante `AB_WERK_RECHTSRAUM_DE` samt Region `AB_WERK_RECHTSRAUM_KATALOG_QUELLE`, den Rückfall
„DE“ im Vorschlagswert für neue Instrumente, `rechtsraum: 'DE'` an den Ausgabeformaten XÖV und FIM und die feste Reservierung von
„DE“ am Selbst-Einlass. Ein Produkt mit einem anderen Rechtsraum-Modul hätte damit deutsches Recht geerbt, und das nackte Gerüst
hätte deutsch gestempelt. Woher kommt der Rechtsraum der Zusammenstellung, und was ist am Einlass reserviert?

### Entscheidung

1. **Der Rechtsraum der Zusammenstellung ist der Code des einzigen Rechtsraum-Moduls der Ab-Werk-Saat.** Kein Modul oder mehrere
   ergeben „“ — nie „DE“. Gelesen wird nur die Saat (`_rechtsraumAbWerkRegistrySeed`), nie ein eingelassenes Modul und nie `data`.
   Mehrere Rechtsräume in einem Produkt entscheidet erst der Wagen „Rechtsraum-Wahl“ (Befund RECHTSRAUM-NICHT-WAEHLBAR).
2. **Daraus folgen die bisherigen festen Stellen.** Der Vorschlag für neue Instrumente, die Katalogwerte der Gerüst-Tabellen
   (`VORSORGE_MODULE`, `LISTEN_AUSWAHLFORM`) und der Rechtsraum-Satz im Dokument-Fuß kommen aus dem Rechtsraum der Zusammenstellung.
   Jeder Leser steht auf einer Positivliste mit seinem Verhalten bei „“.
3. **Rechtsraumgebundene Formate nennt das Modul.** XÖV und FIM tragen statt `rechtsraum: 'DE'` die Marke `rechtsraumGebunden`;
   angeboten werden sie nur, wenn das Modul der Zusammenstellung sie in `formate` nennt.
4. **Reserviert ist der Code jedes Ab-Werk-Moduls.** Am Selbst-Einlass und im Stellensatz ist nicht mehr fest „DE“ reserviert,
   sondern jeder Rechtsraum-Code, dessen Modul ab Werk im Produkt steckt — im DE-Produkt „DE“, in einem GB-Produkt „GB“, im nackten
   Gerüst keiner. Die Reservierung wird damit nicht gelockert: alle vier ausgelieferten Produkte tragen das DE-Modul ab Werk
   (Entscheidung 20.09.2026, Posten 6), „DE“ bleibt dort reserviert. Ein selbst eingelassenes Modul kann sich im nackten Gerüst weder
   als ab Werk noch als geprüft ausgeben; seine Selbstauskunft (`abWerk`, `ungeprueft`, `anbieterIdGeprueft`, `beleg`) wird erzwungen.
5. **Das veröffentlichte Schema beschreibt, was das Modul trägt.** `rechtsraum-modul-schema.json` kennt `hinweise`, `formate`,
   `name`, `rechtsformen` und `typen.*.rechtsgrundlage`; die Reservierung „DE“ bleibt im Schema, weil es der Vertrag für FREMDE Module
   ist. Neue Schema-Fassung im Verzeichnis `docs/schema-fassungen.json`.
6. **Der Länderannahme-Wächter (U2-ADR-495) führt auch den Kern und jedes Pro-Modul.** Die Grundlinie ist dort 0.

### Abgrenzung

- Nicht Teil dieser Entscheidung: die sichtbare Rechtsraum-Wahl je Instrument (RECHTSRAUM-NICHT-WAEHLBAR), der sichtbare Hinweis
  „nach deutschem Recht“ an Anlege-Hinweis und Fuß in allen Sprachen (DEUTSCHES-RECHT-UNSICHTBAR; der englische Fußsatz steht im
  Modul als Vorschlag und erscheint bis zur Freigabe nicht), `country_code` der SD-JWT-Identität (SDJWT-COUNTRY-CODE-DE), Währung
  (WAEHRUNG-FEST-EUR), Normzitate in Texten (NORMEN-IM-TEXT) und die BGB-Beschriftungen im Feldkatalog.
- Ein englisches Produkt mit DE-Modul stempelt weiterhin „DE“: das ist die Entscheidung vom 20.09.2026 („das EN-Produkt trägt einen
  DE-Rechtsraum und zeigt ihn“), keine Annahme des Gerüsts.
- Bestehende Depots bleiben gültig: gestempelte Instrumente behalten ihren Rechtsraum; das Fach `rechtsraumKatalogQuelle` bleibt im
  Depot-Schema und ist stets null.

```yaml
konformitaet:
  - aussage: >-
      Der Rechtsraum der Zusammenstellung kommt allein aus der Ab-Werk-Saat: ein Modul ergibt dessen Code, keins oder zwei ergeben „“,
      nie „DE“; ein eingelassenes Modul ändert ihn nicht.
    zustand: erfuellt
    herkunft: U2-ADR-504, Nachtrag R1 (17.10.2026)
    pruefung:
      - tests/rechtsraum-modul-kern.test.js "[R1·Zusammenstellung] kein Modul ergibt „“, genau ein Modul dessen Code, zwei Module „“"
      - tests/rechtsraum-modul-kern.test.js "[R1·Zusammenstellung·Rot-Beweis] ein Kern mit „DE“ als Rückfall fällt im nackten Gerüst auf"
      - tests/rechtsraum-modul-kern.test.js "[R1·Zusammenstellung] ein eingelassenes Modul ändert das Ergebnis nicht"
  - aussage: >-
      In allen vier Produkten ist jeder Ab-Werk-Rechtsraum-Code am Selbst-Einlass reserviert; ohne die Reservierung käme das DE-Modul durch.
    zustand: erfuellt
    herkunft: U2-ADR-504, Nachtrag R1 (17.10.2026)
    pruefung:
      - tests/rechtsraum-reservierung-vier-produkte.test.js "[R1·Reservierung·a] in allen vier Produkten ist jeder Ab-Werk-Rechtsraum-Code am Selbst-Einlass reserviert"
      - tests/rechtsraum-reservierung-vier-produkte.test.js "[R1·Reservierung·b·Rot-Beweis] ohne die Reservierung am Einlass kommt das DE-Modul im DE-Produkt durch"
      - tests/rechtsraum-modul-kern.test.js "[R1·Selbst-Einlass] der Code des eingebauten Moduls ist reserviert: DE im DE-Produkt, GB im GB-Produkt"
      - tests/rechtsraum-modul-kern.test.js "[R1·Selbst-Einlass·Rot-Beweis] kein Code ist fest reserviert: DE im GB-Produkt und im nackten Gerüst nicht"
  - aussage: >-
      Im nackten Gerüst gibt sich ein selbst eingelassenes Modul weder als ab Werk noch als geprüft aus.
    zustand: erfuellt
    herkunft: U2-ADR-504, Nachtrag R1 (17.10.2026)
    pruefung:
      - tests/rechtsraum-reservierung-vier-produkte.test.js "[R1·Reservierung·c] im nackten Gerüst gibt sich ein selbst eingelassenes Modul weder als ab Werk noch als geprüft aus"
      - tests/rechtsraum-reservierung-vier-produkte.test.js "[R1·Reservierung·c·Rot-Beweis] ein Kern, der die mitgebrachte abWerk-Marke stehen lässt, fällt auf"
  - aussage: >-
      XÖV und FIM stehen nur zur Wahl, wenn das Modul der Zusammenstellung sie nennt; kein `rechtsraum: 'DE'` im Kern.
    zustand: erfuellt
    herkunft: U2-ADR-504, Nachtrag R1 (17.10.2026)
    pruefung:
      - tests/rechtsraum-modul-kern.test.js "[R1·Formate] XÖV/FIM stehen nur zur Wahl, wenn das Modul der Zusammenstellung sie nennt"
  - aussage: >-
      Der Rechtsraum-Satz im Dokument-Fuß kommt aus dem Modul, je Dokumenttyp, nur in freigegebener Sprache.
    zustand: erfuellt
    herkunft: U2-ADR-504, Nachtrag R1 (17.10.2026)
    pruefung:
      - tests/rechtsraum-modul-kern.test.js "[R1·Fuß] der Rechtsraum-Satz kommt aus dem Modul, je Dokumenttyp, nur in freigegebener Sprache"
  - aussage: >-
      Jeder Leser des Rechtsraums der Zusammenstellung steht auf der Positivliste, mit Verhalten bei „“.
    zustand: erfuellt
    herkunft: U2-ADR-504, Nachtrag R1 (17.10.2026)
    pruefung:
      - tests/rechtsraum-modul-kern.test.js "[R1·Leser] jeder Leser von _rechtsraumDerZusammenstellung steht auf der Positivliste, mit Verhalten bei „“"
      - tests/rechtsraum-modul-kern.test.js "[R1·Leser·Rot-Beweis] ein neuer Leser außerhalb der Liste ist rot; ein Aufruf im Kommentar zählt nicht"
  - aussage: >-
      Jedes Ab-Werk-Rechtsraum-Modul ist gültig gegen das veröffentlichte Schema ohne die Reservierungsregel; ein Fremdmodul mit „DE“ bleibt ungültig.
    zustand: erfuellt
    herkunft: U2-ADR-504, Nachtrag R1 (17.10.2026)
    pruefung:
      - tests/mit-modul/rechtsraum-ab-werk-modul-gegen-schema.test.js "[Rechtsraum-Schema] jedes Ab-Werk-Rechtsraum-Modul ist gültig gegen das Schema ohne die Reservierungsregel"
      - tests/mit-modul/rechtsraum-ab-werk-modul-gegen-schema.test.js "[Rechtsraum-Schema] die Reservierung bleibt im Vertrag: ein Fremdmodul mit „DE“ ist ungültig, in jeder Schreibung"
      - tests/mit-modul/rechtsraum-ab-werk-modul-gegen-schema.test.js "[Rechtsraum-Schema·Rot-Beweis] ein unbekannter Schlüssel und ein Schema ohne `rechtsformen` machen das DE-Modul ungültig"
  - aussage: >-
      Der Länderannahme-Wächter führt den Kern und jedes Pro-Modul der vier Produkte; ein fester Rechtsraum im Kern ist rot.
    zustand: erfuellt
    herkunft: U2-ADR-504, Nachtrag R1 (17.10.2026)
    pruefung:
      - tests/laenderannahme-pruefen.test.js "[Länderannahme · R1] geführt sind auch der Kern und jedes Pro-Modul der vier Produkte, jede Datei mit Grundlinie"
      - tests/laenderannahme-pruefen.test.js "[Länderannahme · R1 · Rot-Beweis] ein fester Rechtsraum im Kern ist rot (der Stand vor R1: ein fest eingetragenes DE)"
```

---

*Vivodepot GmbH · Berlin · 20.09.2026 · Nachtrag 17.10.2026*
