# U2-ADR-NNN · Korpus-Zuordnung: amtlicher Wortlaut ins Rechtsraum-Modul, eigene Formulierung ins Template

**Status:** Angenommen (Nummer wird beim Landen vergeben — Register-Kollisionsgefahr bei
parallelen Bäumen, s. `feedback_adr_nummer_erst_beim_landen_sichtbar`)
**Datum:** 17.09.2026
**Kategorie:** ARCHITEKTUR, RECHTSRAUM, DOKUMENTGENERATOR
**Linie:** U2
**Betrifft:** `vivodepot.html` (`PV_BMJ`, `VOLLMACHT_BMJ`, `KI_KORPUS`, `_rechtsraumKatalogAlsModul`,
`_rechtsraumModulUebersetzen`), `docs/rechtsraum-modul/rechtsraum-modul-schema.json` (neues
Schrittform-Feld neben `wortlaut`)
**Bezug:** U2-ADR-121 (Rechtsraum-Modul-Grundform), U2-ADR-343/344/345 (BMJ-Dokumente/
Dokumentmodule/Standardvorlagen hinter die Bündel-Anwendung), U2-ADR-382 (Rechtsraum DE wird
Modul), U2-ADR-396 (KI-Verfügung eigene Übersetzung/Forschungssynthese)

---

## 0 · Der Auftrag

Drei Dokument-Korpora liegen heute als native Konstanten im Kern: `PV_BMJ`, `VOLLMACHT_BMJ`,
`KI_KORPUS`. Alle drei speisen denselben geteilten Dokument-Generator (Wizard + Erzeuger), aber
ihr Wortlaut hat zwei verschiedene Herkünfte, und diese ADR zieht die Grenze zwischen ihnen
entlang der Herkunft, nicht entlang der Code-Form.

## 1 · Der Befund

- **`PV_BMJ` und `VOLLMACHT_BMJ` sind amtlicher Wortlaut.** `VOLLMACHT_BMJ`s Kopf-Kommentar
  (vivodepot.html:18943-18957) nennt die Quelle ausdrücklich: „Formular Vollmacht,
  Bundesministerium der Justiz, Stand Januar 2023" — jeder Baustein ist ein „wortgleicher
  Ausschnitt aus `STANDARD_VORLAGEN['vorsorgevollmacht'].wortlaut`". `PV_BMJ` folgt demselben
  Muster gegenüber `STANDARD_VORLAGEN['patientenverfuegung']`.
- **`KI_KORPUS` ist eigene Formulierung.** Sein Kopf-Kommentar (vivodepot.html:18962-18973) nennt
  die Bausteine ausdrücklich „FORSCHUNGSSYNTHESE (Edilife/Cambridge/Zürich), kein amtlicher
  Standard" — dieselbe Feststellung, die U2-ADR-396 bereits getroffen hat.
- **Die Formvorschrift ist in beiden Fällen amtlich, unabhängig vom Wortlaut.** `KI_KORPUS.
  formhinweis` liest `STRINGS.kiFormhinweis`, dessen Inhalt bei der Bündel-Materialisierung
  (`_rechtsraumKatalogAusBuendelMaterialisieren`, vivodepot.html:30461-30464) ausdrücklich aus
  der LIVE-Referenz `KI_KORPUS.herkunft`/`formhinweis` gezogen wird, „statt den amtlichen
  Paragrafen ein zweites Mal literal im Quelltext zu tragen" — der Rechtsraum-Katalog kennt
  `§ 2247 BGB` bereits als `formvorschriften.paragraf` bei `ki-verfuegung` UND `testament`.
- **Beide Korpora laufen strukturell bereits durch dieselbe Rechtsraum-Materialisierung**
  (`_rechtsraumKatalogAlsModul`), nur ohne bislang ein Feld für den mehrschrittigen Bauplan
  selbst — heute trägt der Rechtsraum-Katalog nur `wortlaut` (ein String) je Typ, keinen
  Schritt-Bauplan.

## 2 · Die Entscheidung

1. **`PV_BMJ`/`VOLLMACHT_BMJ` (amtlicher Wortlaut) wandern inhaltlich in den Rechtsraum-Katalog.**
   Ihre `steps[]` werden Teil des DE-Eintrags in `BUERGERMODUL_BUENDEL.rechtsraumKatalog.
   patientenverfuegung`/`.vorsorgevollmacht`, unter einem neuen strukturierten Feld neben
   `wortlaut` (s. §3). Ein zweiter Rechtsraum ersetzt diesen Bauplan vollständig durch seinen
   eigenen — das ist der Skalierungsweg, den ein reiner `wortlaut`-String nicht trägt.
2. **`KI_KORPUS` (eigene Formulierung) wird ein Template**, nicht Teil des Rechtsraum-Katalogs.
   Es ist kein amtlicher Inhalt, den ein zweiter Rechtsraum ersetzen müßte — es ist
   rechtsraumunabhängige, eigene Redaktion, die ein Modul ergänzt (Gerüst-Vokabular: ein
   Template ist Thema/Berufsstand-Zuschnitt, „ergänzt ein Modul, steht nie allein" — nicht mit
   dem gleichnamigen `AB_WERK_VORLAGEN_QUELLEN`/„Feld-Bausatz"-Mechanismus zu verwechseln, der
   Feld-Definitionen liefert, keine Dokumenttexte, s. §4).
3. **Die Formvorschrift bleibt im Rechtsraum-Katalog und wird referenziert, nicht kopiert.** Das
   KI-Template trägt `§ 2247 BGB` nicht als eigenen literalen Wert — es verweist auf
   `rechtsraumKatalog['ki-verfuegung'].DE.formvorschriften`, genau wie die Materialisierung es
   heute schon für `formhinweis` tut. So reist die Formvorschrift unverändert in einen anderen
   Rechtsraum, ohne daß das Template sie mitträgt oder dupliziert.

## 3 · Das neue Schema-Feld (Schrittform)

`docs/rechtsraum-modul/rechtsraum-modul-schema.json` behält `typen.<typ>.wortlaut` für
Instrumente, die nur einen Textbaustein brauchen (heute: alle sechs bestehenden Einträge).
Daneben kommt ein zweites, optionales Feld für den vollen mehrschrittigen Bauplan. Struktur
gemessen aus den tatsächlichen Schritt-Schlüssel-Unionen von `pvBmj`/`vollmachtBmj`/`kiKorpus`/
den Bündel-Wizards:

- **Gemeinsame Wurzel je Schritt:** `{ feld, verborgenWenn? }`. `feld` selbst bleibt ein
  Unterobjekt (`{id, typ, optionen/katalogOptionenAus/beispiel}`), gemessen an
  `_pvBmjSchrittZuWizardSchritt` (vivodepot.html:19017-19022): `s.feld.id` wird dort gelesen,
  `feld` ist also kein bloßer Kennung-String.
- **Wizard-Erweiterung** (nicht Teil dieser ADR, zum Vergleich): `{...Wurzel, ziel?}`.
- **Korpus-Erweiterung (diese ADR):** `{...Wurzel, dokEinleitung?, bezug?, hilfetext?, frage?}`.

**Der Schlüsselname neben `wortlaut` ist `bauplan`:** „die
Anweisung, wie dieses Instrument in diesem Rechtsraum entsteht — Wortlaut, Reihenfolge und
Bedingungen zusammen", passend zur bestehenden deutschen Schlüsselreihe des Schemas
(`formvorschriften`, `fristenVorrang`, `zweck`). `schritte` wurde verworfen — zu eng für Inhalt,
der mehr als eine Schrittfolge ist (Eingangsformel, Verbindlichkeitsklauseln,
Schlußbemerkungen, ärztliche Bestätigung bei `PV_BMJ`).

**`wortlaut` und `bauplan` schließen einander nicht aus.** Ein Instrument kann nur einen
Textbaustein, nur einen Bauplan, oder beides tragen — keine Entweder-oder-Prüfung im Schema.

## 4 · Was diese ADR ausdrücklich abgrenzt

**„Template" ist in diesem Umbau doppelt besetzt, mit Absicht getrennt benannt:** das
KI-Korpus-Template dieser ADR ist ein Thema/Berufsstand-Zuschnitt (Gerüst-Vokabular). Der
gleichnamige `AB_WERK_VORLAGEN_QUELLEN`-Mechanismus (Pro-Notfallmappe-„Feld-Bausatz") ist ein
ANDERER, bereits bestehender Mechanismus, der neue FELD-DEFINITIONEN liefert (`_templateFeldZu
Modell`), keine Dokumenttexte. Gemessen (17.09.2026): `AB_WERK_VORLAGEN_QUELLEN` kann die
Korpus-Form nicht aufnehmen — sein `felder[]` erwartet Feld-Definitionen (feldname/feldtyp),
während ein Dokument-Korpus `felder[]`-artige Einträge als VERWEISE auf bestehende Felder
benutzt (entgegengesetzte Bedeutung desselben Schlüsselnamens). Diese ADR baut darum keinen
Anschluß an `AB_WERK_VORLAGEN_QUELLEN` — das KI-Template bekommt seinen eigenen Weg, wie ein
gewöhnliches Institutions-Template.

**Zurückgezogen, nicht nur verschoben:** ein zunächst erwogener Vorschlag, `AB_WERK_VORLAGEN_
QUELLEN.felder` in `feldDefinitionen` umzubenennen, entfällt: `felder` ist im Trust-1b-Weg wörtlich Teil dessen, was ein Drittanbieter signiert
(`tests/trust-1b-template-signatur.test.js:28`) — eine Umbenennung wäre kein Rename, sondern
eine Formatumstellung mit Signatur-Bruch für jede bereits ausgestellte Signatur. `felder` trägt
im Kern darum DREI verschiedene Bedeutungen, keine zwei:

1. **`AB_WERK_VORLAGEN_QUELLEN`/Trust-1b-Templates** — neue Feld-DEFINITIONEN, signatur-gebunden
   (Bestandssignaturen). **Unantastbar**, solange Bestandssignaturen gelten — nicht dieser
   ADR-Gegenstand, nicht umzubenennen.
2. **`STANDARD_VORLAGEN.felder`** (dieser ADR-Gegenstand, s. §4 oben) — VERWEISE auf bestehende
   Felder, konsistent mit `BAUSTEINE.felder`.
3. **`SEKTOR_BY_ID[...].sektionen[].felder[]`** (~30 Stellen, Bereichs-Schema selbst) — weder
   Eingang noch Verweis, sondern die FELD-DEFINITIONEN eines Bereichs/einer Sektion (das, was
   `bereiche.identity.sektionen[0].felder` in `BUERGERMODUL_BUENDEL` trägt).

Diese ADR benennt die drei Bedeutungen, ohne eine von ihnen umzubenennen. Der wichtigste Satz
dabei: Bedeutung 1 bleibt unantastbar, solange Bestandssignaturen gelten — das verhindert, daß
ein künftiger Zug denselben Rename-Vorschlag erneut aufgreift, ohne die Signaturbindung zu
messen.

## Konformität

```konformitaet
aussage:   PV_BMJ und VOLLMACHT_BMJ sind wortgleiche Auszüge aus STANDARD_VORLAGEN (amtlicher
           BMJ-Wortlaut), keine eigene Formulierung.
zustand:   prüfbar
pruefung:  tests/pv-ziffer-27.test.js#[PV·2.7·Konsistenz] die festen Rahmensätze/Rollen-Labels sind — je Teilsatz, PDF-Zeilenumbruch-Artefakt getrennt geprüft — im signierten Wortlaut enthalten
pruefung:  tests/vollmacht-generator.test.js#[Vollmacht·Konsistenz] JEDER auswahlPaar/mehrfachauswahl/freitextSatz-Text ist eine exakte Teilzeichenkette des signierten Wortlauts
```

```konformitaet
aussage:   KI_KORPUS trägt eine im erzeugten Dokument sichtbare Herkunftsanzeige, die es
           ausdrücklich als Forschungssynthese von amtlichem Wortlaut abgrenzt.
zustand:   prüfbar
pruefung:  tests/ki-generator.test.js#Testament-Anlage: HTML trägt Kopf, Herkunftsanzeige und § 2247-Formhinweis
```

```konformitaet
aussage:   AB_WERK_VORLAGEN_QUELLEN kann die Korpus-Schrittform strukturell nicht aufnehmen (felder[]
           trägt in beiden Formen die entgegengesetzte Bedeutung).
zustand:   nicht-prüfbar
```
Begründung (kein automatisierter Test, per Definition eine Quelltext-Struktur-Beobachtung):
`_templateFelderUebersetzen`/`_templateFeldZuModell` (vivodepot.html:29694-29713) erwarten
Feld-DEFINITIONEN; `BUERGERMODUL_BUENDEL.standardVorlagen[*].felder` sind Feld-VERWEISE — von
Hand am Quelltext nachvollziehbar, kein Testlauf nötig oder sinnvoll für diese Tatsache.

```konformitaet
aussage:   Der neue Schrittform-Bauplan (PV/Vollmacht) liegt im Rechtsraum-Katalog, das
           KI-Template referenziert seine Formvorschrift statt sie zu kopieren, beide ohne
           Textverlust gegenüber dem heutigen Stand.
zustand:   offen
frist:     2026-09-20
bedingung: Schema-Erweiterung gebaut, Umzug von PV_BMJ/
           VOLLMACHT_BMJ.steps in rechtsraumKatalog vollzogen, KI_KORPUS als Template-Datei
           gebaut, volle Suite grün, neue Gegenprobe für Formvorschrift-Referenz statt -Kopie.
```

```konformitaet
aussage:   Der Schlüsselname des neuen Schema-Felds neben `wortlaut` ist `bauplan` — Feld
           additiv, unabhängig von `wortlaut`, mit der
           gemeinsamen Wurzel {feld,verborgenWenn?} plus Korpus-Erweiterung
           {dokEinleitung?,bezug?,hilfetext?,frage?}.
zustand:   prüfbar
pruefung:  tests/rechtsraum-modul-schema-bauplan.test.js#[U2-ADR-NNN·Bauplan] typen.<typ> traegt bauplan NEBEN wortlaut, beide optional und unabhaengig
pruefung:  tests/rechtsraum-modul-schema-bauplan.test.js#[U2-ADR-NNN·Bauplan] ein Bauplan-Schritt traegt die Wurzel {feld,verborgenWenn?} plus die Korpus-Erweiterung
```

## Was NICHT Teil dieser Entscheidung ist

Ein zweiter, echter Rechtsraum wird nicht gebaut — nur der Bauplan, der ihn later aufnehmen kann.
Die genaue Dateiform des KI-Templates (Signaturweg, tpl_-Namensraum) ist Gegenstand der
begleitenden ADR zum Ende des eigenen Vorlagen-Formats, nicht dieser.

---

*Vivodepot GmbH · Berlin · 17.09.2026*
