# U2-ADR-126: Schema-Default „zurückhalten" für 97 besonders schützenswerte Felder

**Status:** Akzeptiert
**Datum:** 09.08.2026
**Kategorie:** DATENSCHUTZ, EXPORT
**Grundlage:** interner Auftrag „N4 – Sensibel Feldebene" (08.08.2026), gestützt auf eine eigene
Erhebung der Wächter-Grundlagen vom 08.08.2026, Liste 1.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html`, `SEKTOREN` (elf Sektoren, 97 Feldebene-Einträge mit
  `sensibel: true`), `feldIstSensibel` (Zeile ~15518, unverändert), `EXPORT_FORMATE`
  (zwei Registry-Einträge korrigiert, s. Konsequenzen).
- **Sprint-Commit:** elf Commits, `a24ece8`…`b061374` (ein Commit je Sektor, N4 Zug 1).
- **ADR-Bezug:** dieser ADR; U2-ADR-012 §4 (Beleg für den Sensibel-Knopf selbst, A64).
**Status heute:** gilt — Beleg `tests/w3-schema-sensibel-pruefen.test.js#echter Kern: 229 von 229 tragen sensibel:true — Liste 1 vollständig gesetzt (Sensibel-Architektur Zug 3) plus F5 Posten 1 plus M1 Zug 1 (Ausweisdokumente, Karten und Zahlungsmittel) plus Nachlese F8/M1 Zug 1 (Freiheitsentzug-Aufteilung) plus Aufenthaltstitel plus F4 Zug 1+3 plus Frühere Namen (K3-Muster: die ganze Liste, nicht feldweise) plus Betreuerbestellung (Aufgabenbereiche/Betreuungsgericht/Aktenzeichen, 12.08.2026) plus testament_bedachte (C15, 15.08.2026) plus 21 neue Ablageort-Grenzfälle (Krisenvorsorge-Auftrag, 24.08.2026, Zug 2 — physischer Aufenthaltsort, Einbruchsrisiko bei Weitergabe, gleiche Begründung wie Fluchtweg/Sammelplatz) plus 4 neue Zugang-zum-Recht-Felder (30.08.2026, Zug 1 — Gruppe B, finanzielle Totalverlust-Gefahr bei Offenlegung)`.

---

## Kontext

Bis zu diesem Auftrag trug **kein einziges** Feld im gesamten Schema `sensibel: true` —
gemessen, nicht angenommen (`tools/w3-schema-sensibel-pruefen.js`, N1). Der Mechanismus
existierte vollständig (`feldIstSensibel` ORt Schema-Flag und Nutzer-Markierung,
der Sensibel-Knopf an der Feldzeile seit A64, alle wesentlichen Export-Wege respektieren
`feldIstSensibel`), aber sein Schema-seitiger Teil blieb bei null Einträgen — der
Standard „zurückhalten" feuerte nirgends. Zwei STRINGS versprachen wörtlich das Gegenteil
dessen, was der Code tat (`exportSensibelEinschliessen`/`exportSensibelHinweis`, ohne
Aufrufer).

Damit hing der Schutz besonders schützenswerter Angaben — Master-Passwort-Ablageort,
Tresorcode, Gesundheitsdaten, Kontonummern — vollständig an der Einzelentscheidung der
Bürgerin: an jedem der potenziell hunderten Felder aktiv den Sensibel-Knopf antippen. Das
ist keine Grundeinstellung, sondern ein Verlangen nach Vollständigkeit, das niemand
erfüllt.

## Entscheidung

**97 Feldebene-Felder aus Liste 1 des Grundlagendokuments tragen `sensibel: true`.** Die
Zuordnung folgt drei Gruppen (Gruppe A = Artikel 9 DSGVO, Gruppe B = finanzieller
Totalverlust bei Kenntnisnahme, Gruppe C = Identitätsmissbrauch und wirtschaftlicher
Schaden), je Sektor:

| Sektor | Felder | Gruppen | Commit |
|---|---|---|---|
| Gesundheit | 27 | alle A | `a24ece8` |
| Verwaltung | 20 | 18 B, 1 C, 1 A | `90428c8` |
| Sozialversicherung | 16 | 15 A, 1 C | `e30fc11` |
| Vorsorge (Feldebene) | 5 | alle A | `6a4a25f` |
| Finanzen | 10 | 2 B, 8 C | `4c6a0f4` |
| Meine Menschen | 1 | A | `e58f212` |
| Persönliches | 5 | alle A | `3a0a705` |
| Mobilität | 4 | alle C | `742f867` |
| Bildung | 4 | alle C | `de810d9` |
| Wohnen | 2 | alle C | `5cf4849` |
| Identität | 3 | alle C | `b061374` |

**Bewusst NICHT gesetzt, mit Grund:**

- **32 Listen-Unterfelder** (Liste 1 markiert sie mit `↳`). `feldSensibelMarkiert`/
  `feldIstSensibel` arbeiten auf `sektorId × feldId` — eine Listenzeile hat keinen
  eigenen Schlüsselraum. Ein Flag dort wäre wirkungslos; die Erweiterung auf
  `sektorId × feldId × unterfeldId` ist eine eigene Architekturentscheidung, hier nicht
  getroffen (Regel-23-Abweichung vom Auftragstext benannt, der 34 nannte — die exakte
  Zahl, gegen das Schema selbstgeprüft über `tools/w3-schema-sensibel-pruefen.js`, ist
  32; s. Bericht N4).
- **35 Situationsfelder** (`sit:`-Namensraum). Der Sensibel-Knopf am `sit:`-Feld schriebe
  nach `data.sensibelFelder['sit:<id>']`, wo ihn kein Exportweg liest (Kommentar an
  25539) — dasselbe gilt für ein Schema-Flag, das die Situations-Renderer und den
  Angehörigen-Modus (`_ANG_SITUATIONEN`) nicht auswerten. Eigener, hier nicht getroffener
  Bau-Entscheid.
- **Acht Grenzfälle** (Grundlagendokument, eigener Abschnitt) — u. a. `nationalitaet`,
  `profilfoto`, die vier `brief_*`-Herausgabetexte, `konflikte_hinweise`, `ehrenamt`,
  `geburtsdatum`/`geburtsort`. Jeder hat einen benannten Grund, warum ein Default-Flag
  entweder die eigentliche Funktion des Feldes blockieren würde (die `brief_*`-Texte sind
  FÜR die Herausgabe geschrieben) oder die Einordnung selbst strittig ist. Offene Frage,
  nicht in diesem Auftrag entschieden.

## Konsequenzen

**Zwei reale Lücken wurden durch das erste Mal echte Schema-Flags sichtbar** (vorher
unsichtbar, weil `feldIstSensibel` nie `true` lieferte):

1. Die deklarativen `EXPORT_FORMATE`-Einträge `'json'` und `'xoev-verwaltung'` verwarfen
   ihr eigenes `optionen`-Argument (`baue: () => vollExportJSON()` statt
   `(opt) => vollExportJSON(opt)`) — das „auch Sensibles einschließen"-Opt-in erreichte
   die Builder nie. Behoben in `vivodepot.html` (Commit `a24ece8`).
2. `tests/round-trip-wirkung.test.js`s `exportText`-Helfer rief `def.baue(def.sektor)` —
   reichte eine Sektor-Kennung (String) an einen Erzeuger, der ein Optionen-Objekt
   erwartet. Kein `baue` liest je einen Sektor-Parameter; der Aufruf war seit je
   wirkungslos. Behoben in Commit `742f867`.

**Rund 20 bestehende Tests** riefen Export-Erzeuger (`fhirIpsBundle`, `vollExportJSON`,
`vollDepotModell`, `docxBereichModell`) auf jetzt-sensiblen Feldern ohne
`{sensibel:true}`-Opt-in auf. Ihr Zweck war durchgehend Inhalts-/Mechanik-Prüfung, nicht
Zurückhaltungs-Prüfung — Opt-in ergänzt, Zweck im Kommentar benannt (s. Commits
`a24ece8`, `e30fc11`, `742f867`).

**Die Notfallkarte bleibt unberührt** — `notfallKernModell`/`zeichneNotfallkarte`
referenzieren `sensibel`/`feldIstSensibel` an keiner Stelle; sie liest ausschließlich über
die eigene `NOTFALL_KERN_FELDER`-Allowlist. Strukturell bestätigt, nicht nur behauptet.

**Nicht gebaut, als Vorlage vorgelegt:** die zwei toten STRINGS
(`exportSensibelEinschliessen`/`exportSensibelHinweis`) bleiben ohne Aufrufer.
`flowExportUebersicht` (der naheliegende Ort) arbeitet PER FELD, nicht über einen
globalen Schalter — schema-sensible Felder erscheinen dort heute als feste,
nicht-ankreuzbare Liste (`STRINGS.exportSchemaFestHinweis`), ohne jeden Weg für die
Bürgerin, ein einzelnes davon doch mitzugeben. Die zwei toten STRINGS deuten auf einen
einst geplanten GLOBALEN Schalter hin, der mit dem heutigen granularen Modell erst
konzeptionell zusammengeführt werden müsste (koexistiert ein globaler Schalter mit der
Pro-Feld-Liste? macht er schema-sensible Felder einzeln ankreuzbar, oder alles auf
einmal?) — eine Gestaltungsentscheidung, die dieser Auftrag nicht trifft (s. Bericht N4
für die ausformulierte Vorlage).

## Cross-Referenz

U2-ADR-012 §4 (Produktzusage für den Sensibel-Knopf, Grundlage für A64), U2-ADR-097 §1
(Datensparsamkeit als produkttragende Zusicherung, der dieser Default folgt).

```konformitaet
aussage:  Alle Felder aus Liste 1 (Grundlagendokument, plus die acht bereits
          entschiedenen Grenzfälle, plus additiv seither hinzugekommene, gleich
          klassifizierte Geschwisterfelder — s. Nachtrag-Kette unten) tragen
          `sensibel: true`; kein weiteres Feld außerhalb dieser Liste trägt es. War 173
          bei dieser Entscheidung (09.08.2026), zuletzt bezifferter Stand 229 (s. gebundene
          Probe für den jeweils aktuellen, laufend nachgezogenen Bestand — die Zahl ist hier
          bewusst nicht hart eingetragen, damit dieser Satz nicht bei jeder additiven
          Erweiterung erneut veraltet).
zustand:  geprüft
herkunft: invariante
pruefung: tests/w3-schema-sensibel-pruefen.test.js#echter Kern: 229 von 229 tragen sensibel:true — Liste 1 vollständig gesetzt (Sensibel-Architektur Zug 3) plus F5 Posten 1 plus M1 Zug 1 (Ausweisdokumente, Karten und Zahlungsmittel) plus Nachlese F8/M1 Zug 1 (Freiheitsentzug-Aufteilung) plus Aufenthaltstitel plus F4 Zug 1+3 plus Frühere Namen (K3-Muster: die ganze Liste, nicht feldweise) plus Betreuerbestellung (Aufgabenbereiche/Betreuungsgericht/Aktenzeichen, 12.08.2026) plus testament_bedachte (C15, 15.08.2026) plus 21 neue Ablageort-Grenzfälle (Krisenvorsorge-Auftrag, 24.08.2026, Zug 2 — physischer Aufenthaltsort, Einbruchsrisiko bei Weitergabe, gleiche Begründung wie Fluchtweg/Sammelplatz) plus 4 neue Zugang-zum-Recht-Felder (30.08.2026, Zug 1 — Gruppe B, finanzielle Totalverlust-Gefahr bei Offenlegung)
```

## Nachtrag (09.08.2026, „Die Sensibel-Architektur", Zug 3)

Liste 1 vollständig umgesetzt: die verbleibenden Feld-Ebene-Einträge (39 Sektorfelder plus
Unterfelder, elf Situationsfelder-Gruppen) sowie die acht bereits entschiedenen Grenzfälle
(`nationalitaet`, `konflikte_hinweise`, `persoenliche_briefe`, `sonstiges_persoenlich`,
`ehrenamt`, `ks_fluchtweg`, `ks_sammelplatz`, `wohnsituation_bem`) tragen jetzt `sensibel: true`.
Damit stehen 173 von 173 gelisteten Feldern — 0 offen, 0 nicht prüfbar (die frühere
strukturelle Grenze bei Unterfeldern/Situationsfeldern ist mit U2-ADR-128 gefallen, siehe
dort). `tools/w3-schema-sensibel-pruefen.js` liest Situationsfelder seither über die
Situations-Registry (`SITUATION_BY_ID`) statt sie kategorisch als nicht prüfbar zu zählen.

## Nachtrag (09.08.2026, „F4 und F5", F5 Posten 1)

173 → 176. Drei neue Währungs-/Frequenz-Begleitfelder (`meine-menschen.unterhalt.
unterhalt_waehrung`, `meine-menschen.unterhalt.unterhalt_frequenz`, `wohnen.miete_waehrung`)
entstehen additiv neben ihren bereits `sensibel: true` tragenden Betrag-Geschwistern
(`unterhalt.betrag`, `wohnen.miete`, beide Gruppe C — finanzieller Totalverlust). Dieselbe
Einordnung, keine neue Entscheidung: ein Betrag ohne seine Währung ist nicht weniger
schützenswert als der Betrag selbst. `tools/w3-sensibel-grundlinie.json` und die pinned
Zahl in `tests/w3-schema-sensibel-pruefen.test.js` sind nachgezogen (176/176, 0 offen).

## Nachtrag (10.08.2026, „M1", Zug 1)

176 → 181 → 183. M1 Zug 1 fügt „gültig bis"-Datumsfelder für Liste-3a-Dokumente hinzu, je
Gruppe additiv. **Gruppe „Ausweisdokumente"** (176→181): `identitaet.ausweis_ausgestellt`,
`identitaet.ausweis_gueltig`, `mobilitaet.fuehrerschein_gueltig`, `mobilitaet.
reisepass_ausgestellt`, `mobilitaet.reisepass_gueltig` — alle Gruppe C (Identitätsmissbrauch),
dieselbe Einordnung wie ihre `_nr`-Geschwister. **Gruppe „Karten und Zahlungsmittel"**
(181→183): `gesundheit.krankenkassenkarte_gueltig` (Gruppe A, wie `krankenkassenkarte_ort`),
`mobilitaet.elefand_gueltig` (Gruppe C, wie `elefand_nr`). Das neue Listen-Unterfeld
`finanzen.kreditkarten.karte_gueltig` trägt bewusst KEIN Flag — Listen-Unterfelder liegen
außerhalb des Schlüsselraums von `feldIstSensibel` (s. oben, „32 Listen-Unterfelder").
`tools/w3-sensibel-grundlinie.json` und die pinned Zahl in
`tests/w3-schema-sensibel-pruefen.test.js` sind nachgezogen (183/183, 0 offen).

## Nachtrag (11.08.2026, „F4 — die siebzehn verbliebenen Katalogfelder", Zug 1)

183 → 192 (Aufenthaltstitel, sechs additive `identitaet`-Felder, Gruppe C) → 193. F4 Zug 1
stellt sechs Freitextfelder auf Kataloge um; fünf davon brauchten kein neues Flag (das
Katalogfeld selbst trägt sein Flag unverändert weiter). Nur `bildung.einkommensart_frueher`
ist NEU sensibel — das Rettungsfeld der Migration kann denselben Inhalt tragen wie das
Katalogfeld selbst (§ 152 SGB IX-nahe Erwerbsstatus-Angaben, Gruppe C), also dieselbe
Einordnung wie sein Geschwisterfeld. Die übrigen fünf Rettungsfelder
(`steuerklasse_frueher`, `bundid_status_frueher`, `erb_erbschein_frueher`,
`vj_krankenversicherung_frueher`, `geburt_kind_kv_frueher`) tragen KEIN Flag — ihre
Ursprungsfelder waren nie schema-sensibel. `tools/w3-sensibel-grundlinie.json` und die
pinned Zahl in `tests/w3-schema-sensibel-pruefen.test.js` sind nachgezogen (193/193, 0 offen).

## Nachtrag (11.08.2026, „F4", Zug 3)

193 → 197. Fünf gemischte Freitextfelder trennen sich in je zwei bis vier neue Felder.
NEU sensibel (Gruppe wie das jeweilige Ursprungsfeld): `mobilitaet.fuehrerschein_ort` und
`mobilitaet.fuehrerschein_frueher` (Gruppe C, `fuehrerschein` selbst war schon sensibel),
`sozialversicherung.pflegegeld_betrag` und `sozialversicherung.pflegegeld_frueher`
(Gruppe A, wie `pflegegeld`). KEIN Flag: die Bildungs-Rettungsfelder
(`schulabschluss_frueher`, `studium_frueher`) und `heirat_ehevertrag_*` — ihre
Ursprungsfelder waren nie schema-sensibel; `bav_durchfuehrungsweg` ist rein additiv, kein
Rettungsfeld. `tools/w3-sensibel-grundlinie.json` und die pinned Zahl sind nachgezogen
(197/197, 0 offen).
