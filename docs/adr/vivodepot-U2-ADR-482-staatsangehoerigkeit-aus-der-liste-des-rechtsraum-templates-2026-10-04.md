# U2-ADR-482 · Staatsangehörigkeit aus der Liste des Rechtsraum-Templates

**Status:** Akzeptiert, gebaut (Schema 93, Template-Vertrag `codeListen`/`felder`, Feld, PID-Abbildung, Wächter). Fortgeschrieben 17.10.2026: die Bindung liest über den Rechtsraum der Zusammenstellung nach U2-ADR-504 §3.
**Datum:** 04.10.2026
**Kategorie:** DATENMODELL, STANDARDS, GERÜST/TEMPLATE
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`SCHEMA_VERSION_AKTUELL`, Stufe → 93, `_rechtsraumListenGrund`, `_rechtsraumListenUebersetzen`, `_rechtsraumAbWerkListenSeed`, `rechtsraumFeldBindung` (liest über `_rechtsraumModulDerZusammenstellung`), `RECHTSRAUM_CODEFELDER`, `rechtsraumCodefeldHTML`, `rechtsraumCodeEintragText`, `pidStaatsangehoerigkeiten`, `staatsangehoerigkeitFuerPid`/`-AusPid`, `PID_STAATSANGEHOERIGKEIT_SONDERWERTE`, `VC_IDENTITAET_MAPPING`, `baueAusMapping` (`ausRohwert`), `feldZeileHTML`, `feldWertText`, `feldWertHTML`, `feldValidieren`, `_faltContainer`, `parseXMeld`, `formatModulPruefen` (`codeliste`), `wizardsModulPruefen`, `_erbscheinSektorDaten`), `vivodepot-lesen.html` (`feldWertText`), `docs/rechtsraum-modul/rechtsraum-modul-schema.json`, `docs/format-modul/format-modul-schema.json`, `tools/rechtsraum-de-modul.json`, `tools/staatsangehoerigkeit-codeliste-erzeugen.js`, Textsatz DE/EN, `NOTICE.md`, `THIRD_PARTY_LICENSES`, `docs/fremdquellen.md`.
**Bezug:** U2-ADR-504 §3 (Rechtsraum als Modul im Kern: der Rechtsraum der Zusammenstellung), U2-ADR-456 (FIM-Bezüge), U2-ADR-363/-369 (deutsche Bezeichnung mit Lesehilfe), U2-ADR-439 (das Produkt zerlegt keinen Freitext).

## Frage

`identity.nationality` war Freitext und ging als `["deutsch"]` in die PID (Befund PID-NATIONALITIES-FREITEXT). Das PID-Rulebook v1.7 verlangt ISO-3166-1-alpha-2-Codes (§2.2 Z. 105, Kodierung §3.1.3 und §4.1), außerhalb von ISO nur `QS` (ohne Staatsangehörigkeit) und `QU` (unbekannt), beides nur in der Tabelle §2.2. Die amtliche Liste ist deutsch (DESTATIS) und darf nicht ins Gerüst. Wie kommt die Staatsangehörigkeit als Code ins Depot und in die PID, ohne zu raten?

## Entscheidung

1. **Auswahl aus der amtlichen Liste** (04.10.2026, nach „amtliche Inhalte vor eigenen“). Gespeichert wird je Eintrag `{liste, code}`: der Schlüssel der Liste, nicht ihr Anzeigetext. Mehrfachstaatlichkeit ist erlaubt.
2. **Die Liste gehört ins Template.** Das Rechtsraum-Modul bekommt `codeListen` (dieselben Feldnamen wie `code-listen/*.json`) und `felder` (Bindung `{codeListe, mehrfach}`, geschlossen). Eine Bindung auf eine Liste eines anderen Moduls, eine doppelte `systemId` oder ein Eintrag ohne `code`/`anzeigeName` weist das ganze Modul ab. Das DE-Template trägt die DESTATIS-Liste, Fassung 2026-08-05, 211 Einträge, erzeugt aus der gepinnten Genericode-Datei. Das Gerüst kennt nur, dass `identity.nationality` ein Code aus der Liste des Templates ist (`RECHTSRAUM_CODEFELDER`).
3. **Wirksam nur ab Werk.** Listen und Bindungen kommen allein aus der Ab-Werk-Saat, und die Bindung gilt für den Rechtsraum der Zusammenstellung (U2-ADR-504 §3: der Code des einzigen Rechtsraum-Moduls der Ab-Werk-Saat, sonst keiner). Gelesen wird sie über `_rechtsraumModulDerZusammenstellung`, ohne Rückfall auf „DE“. `data.rechtsraumModule` wird dafür nie gelesen; ein eingelassenes Modul mit eigener Liste ändert weder Auswahl noch PID (Bedingung der Gegenlesung).
4. **PID: geltende ISO-Codes oder die Sonderwerte, alle oder keine.** Ein Eintrag geht als `iso3166Alpha2` in `nationalities`, wenn er kein `gueltigBis` trägt und der Code nicht im benutzerdefinierten Bereich liegt (AA, QM–QZ, XA–XZ, ZZ). Welcher Listeneintrag einem PID-Sonderwert entspricht, steht im Template (`pidSonderwert`, nur `QS`/`QU`; DE: 997 staatenlos, 998 ungeklärt). Der Kern kennt keinen DESTATIS-Schlüssel. Ist ein gewählter Eintrag nicht abbildbar (Kosovo `XK`, ehemalige Staaten, 999 „ohne Angabe“), entfällt `nationalities` ganz (Bedingung der Gegenlesung B(1)). Die Oberfläche nennt beim Export „Staatsangehörigkeit nicht übernommen: <Bezeichnung> (kein ISO-Code)“. Im Depot bleibt der Eintrag vollständig.
5. **Kein Raten.** Die Abbildung liest weder Oberflächensprache noch Rechtsraum noch Depot. Ein bisheriger Freitext wird nie abgebildet: Er bleibt sichtbar als „Bisherige Angabe: nicht übernommen“ und geht bis zur Neuwahl nicht in die PID (Bedingung der Gegenlesung B(2)). Ohne Rechtsraum der Zusammenstellung bleibt das Feld leer, mit Hinweis.
6. **Auswahl.** Einträge mit `gueltigBis` stehen nicht zur Wahl; gespeicherte werden weiter angezeigt. Es gibt keinen Freitext-Eingang.
7. **Lesehilfe in jedem Nicht-de-Produkt.** Es gilt die amtliche deutsche Bezeichnung (U2-ADR-363/369); jeder Eintrag mit Buchstaben trägt daneben eine Lesehilfe in Klammern. Die Reihenfolge: (a) `lesehilfeSchluessel` am Listeneintrag (Template), Text im Sprachmodul; (b) sonst der Ländername aus `Intl.DisplayNames` des Browsers, nur für einen geltenden ISO-Code ohne `gueltigBis` (keine Länderdaten im Gerüst; liefert der Browser nur den Code, gibt es keine Hilfe); (c) ein Eintrag ohne Buchstaben (reine Zeichen) braucht keine. Ein Schlüssel ohne Text wird nie roh gezeigt, es gilt die nächste Stufe. Ehemalige Staaten tragen nie den CLDR-Namen (CLDR führt YU als „Serbia“). Im DE-Template tragen 13 Einträge einen Schlüssel.
8. **Schema 93.** Die Stufe ändert keinen Wert. Es gibt sie, damit ein älterer Kern die neue Datenform nur lesend öffnet.
9. **Lizenz.** XRepository-Feld leer, Bezugsort ohne eigene Angabe; es gilt die Grundregel des DESTATIS-Impressums („Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis gestattet“). Der Quellennachweis reist mit der Liste (`lizenz`, `hinweis`) und steht in `NOTICE.md`, `THIRD_PARTY_LICENSES` und `docs/fremdquellen.md`. Ob die Spaltenauswahl eine Bearbeitung ist, klärt die ND-Analyse.

## Was diese Entscheidung nicht leistet

- **FIM:** F60000236 ist selbst eine Auswahl aus derselben DESTATIS-Liste (gleiche URN), pinnt aber die Fassung 2023-02-24. Der Bezug bleibt `naeherung`, bis die Fassungen abgeglichen sind. Der FIM-Export trägt weiter die Bezeichnung, noch nicht den Schlüssel. Nachsehen: FIM-Datenfeld F60000236 Version 1.4 (xdf), Element `codelisteReferenz`.
- Andere Ausgaben (XMeld-Rückweg, vCard) schreiben einen eingehenden Text weiter als Altwert; sie bilden ihn nicht auf einen Code ab.
- Es gibt keine Rechtsraum-Wahl im Depot; trägt ein Produkt mehrere Rechtsraum-Module, hat es keinen Rechtsraum der Zusammenstellung und damit keine Bindung (U2-ADR-504 §3, bis zum Wagen „Rechtsraum-Wahl“).
- **Validator:** Es gibt keinen offiziellen maschinenlesbaren Prüfer für die PID-Werte. Die Type Metadata `urn:eudi:pid:1` (fremdes Repo eu-digital-identity-wallet/eudi-srv-pid-issuer, Datei pid_v1.4.json im Ordner der vct-Ressourcen) führt `nationalities` ohne `schema` und ohne Wertebeschränkung. Die Beschränkung auf ISO 3166-1 bzw. QS/QU steht nur als Prosa in Tabelle §2.2. Die Proben prüfen die Regel darum selbst.

```yaml
konformitaet:
  - aussage: >-
      Liste und Bindung sind Template-Inhalt; ein Verstoß gegen den Vertrag weist das ganze Modul ab.
    zustand: erfuellt
    herkunft: U2-ADR-482 (04.10.2026), Schema-Bedingungen 1 und 2
    pruefung:
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Vertrag] das DE-Template und ein sauberes Modul mit Liste und Bindung sind gültig"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Vertrag·Rot-Beweis] jeder Verstoß gegen den Vertrag weist das ganze Modul ab, an allen drei Prüfstellen"
      - tests/staatsangehoerigkeit-codeliste.test.js "[Staatsangehörigkeit·Erzeuger] die Liste liegt im Template, nicht unter code-listen/ (Gerüst)"
  - aussage: >-
      In die PID gehen nur geltende ISO-3166-1-Codes oder QS/QU, alle oder keine; nie die Bezeichnung.
    zustand: erfuellt
    herkunft: U2-ADR-482 (04.10.2026), PID-Rulebook v1.7 §2.2 (Z. 105), §3.1.3, §4.1, Bedingung der Gegenlesung B(1)
    pruefung:
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·PID] in allen vier Produkten trägt nationalities ISO-Codes aus der Liste, nie die Bezeichnung"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·PID·Rot-Beweis] mit der alten Abbildung `(v) => [v]` stünde wieder `[\"deutsch\"]` in der PID"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·PID] Sonderwerte und Ausschlüsse nach dem PID-Rulebook v1.7 §2.2"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·PID] alle oder keine: ein Eintrag ohne geltenden Code nimmt die ganze Angabe heraus"
  - aussage: >-
      Die Abbildung liest weder Oberflächensprache noch Rechtsraum noch Depot.
    zustand: erfuellt
    herkunft: U2-ADR-482 (04.10.2026)
    pruefung:
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Wächter] die Abbildung liest weder Oberflächensprache noch Rechtsraum noch Depot"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Wächter·Rot-Beweis] eine gepflanzte Ableitung aus der Sprache wird erkannt"
  - aussage: >-
      Ein eingelassenes Modul mit eigener Liste ändert weder Auswahl noch PID; dasselbe Modul ab Werk ändert beides.
    zustand: erfuellt
    herkunft: U2-ADR-482 (04.10.2026), Bedingung der Gegenlesung
    pruefung:
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Selbst-Einlass] ein eingelassenes Modul mit eigener Liste ändert weder Auswahl noch PID"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Selbst-Einlass·Gegenprobe] dasselbe Modul AB WERK als einziges Rechtsraum-Modul ändert beides — die Probe sieht den Weg"
  - aussage: >-
      Ein bisheriger Freitext bleibt sichtbar, wird nie abgebildet und geht nicht in die PID; Schema 93 ändert keinen Wert.
    zustand: erfuellt
    herkunft: U2-ADR-482 (04.10.2026), Bedingung der Gegenlesung B(2)
    pruefung:
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Bestand] ein alter Freitext bleibt sichtbar, wird nicht abgebildet und geht nicht in die PID"
      - tests/schema-93-staatsangehoerigkeit.test.js "[Schema 93] ein Bestandsdepot steigt auf 93; der Freitext bleibt wörtlich, nichts wird abgebildet"
  - aussage: >-
      Jeder Eintrag jeder Codeliste des DE-Moduls trägt in jedem englischen Produkt eine Lesehilfe; ehemalige Staaten nie den
      CLDR-Namen; ein Schlüssel ohne Text wird nie roh gezeigt.
    zustand: erfuellt
    herkunft: U2-ADR-482 (04.10.2026), Gegenlesung, Schema-Bedingungen
    pruefung:
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Lesehilfe] jeder Eintrag jeder Codeliste des DE-Moduls trägt in jedem englischen Produkt eine Lesehilfe"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Lesehilfe·Rot-Beweis] ein Eintrag ohne Schlüssel und ohne geltenden ISO-Code ist rot; reine Zeichen nur ohne Buchstaben"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Lesehilfe] ehemalige Staaten tragen nie den CLDR-Namen ihres Codes (YU ist nicht „Serbia“)"
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·Lesehilfe·Rot-Beweis] ein Schlüssel ohne Text wird nie roh gezeigt — es gilt die nächste Stufe"
      - tests/staatsangehoerigkeit-codeliste.test.js "[Staatsangehörigkeit·Erzeuger] jeder Lesehilfe-Schlüssel des Templates hat seinen Text im DE-Modul und im EN-Modul"
  - aussage: >-
      Ohne Rechtsraum der Zusammenstellung bleibt das Feld leer, mit Hinweis; nichts geht in die PID.
    zustand: erfuellt
    herkunft: U2-ADR-482 (04.10.2026), U2-ADR-504 §3
    pruefung:
      - tests/staatsangehoerigkeit-rechtsraum.test.js "[Staatsangehörigkeit·ohne Vorgabe] keine Bindung: Feld leer mit Hinweis, keine Auswahl, nichts in der PID"
```
