# U2-ADR-NNN · Rechtsraum DE ist ein Modul wie jedes andere — Nachfolge zu U2-ADR-285

**Status:** Angenommen (Nummer wird beim Landen vergeben)
**Datum:** 20.09.2026
**Kategorie:** ARCHITEKTUR, RECHTSRAUM
**Linie:** U2
**Betrifft:** `vivodepot.html` (`AB_WERK_RECHTSRAUM_KATALOG_QUELLE`, `AB_WERK_RECHTSRAUM_PRODUKT`,
`validateRechtsraumModul`, `_rechtsraumModulUebersetzen`, `_rechtsraumAbWerkRegistrySeed`),
`tools/rechtsraum-de-modul.json`, `tools/lib/produkt-text-erzeugen.js`, `tools/lib/vier-produkte.js`
**Bezug:** U2-ADR-121 (Rechtsraum-Modul), U2-ADR-285 (Reservierung von "DE", Gerüst-eigener Ladeweg),
U2-ADR-382 (Rechtsraum DE wird Modul), Korpus-Zuordnung Rechtsraum und Template (Nummer offen)

---

## 0 · Ausgangslage

U2-ADR-285 hält `rechtsraum: "DE"` für jeden Aufrufer reserviert, weil das Gerüst einen eigenen, eingebackenen
deutschen Katalog trägt und kein Modul ihn kapern darf. Das Gerüst trägt keinen Inhalt mehr: der deutsche Katalog
zieht in eine Moduldatei, die das Produkt mitbringt. Damit entfällt der Grund der Reservierung.

## 1 · Was sich ändert

1. **`AB_WERK_RECHTSRAUM_KATALOG_QUELLE` ist im Gerüst `{}`.** Der deutsche Katalog steht in
   `tools/rechtsraum-de-modul.json` (`modulTyp: "rechtsraum"`) und wird in alle vier Produkte gebacken.
   `_rechtsraumKatalogAlsModul()` und der frühere Erzeuger `rechtsraum-de-modul-erzeugen` entfallen;
   die JSON-Datei ist die Quelle.
2. **`'DE'` ist nur reserviert, solange `AB_WERK_RECHTSRAUM_DE` belegt ist.** `validateRechtsraumModul` lehnt `'DE'`
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
aussage:   Ist das Gerüst-Fach DE belegt, bleibt ein DE-Modul aus der Produkt-Region wirkungslos.
zustand:   prüfbar
pruefung:  tests/achse-rechtsraum-produkt.test.js#[Sicherheits-Rot-Beweis·belegt] ist das Gerüst-Fach DE belegt, bleibt ein DE-Modul aus der Produkt-Region wirkungslos
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

---

*Vivodepot GmbH · Berlin · 20.09.2026*
