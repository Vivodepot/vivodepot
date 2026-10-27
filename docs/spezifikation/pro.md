# Vivodepot Pro — Spezifikation

Stand 23.10.2026. Diese Datei beschreibt das **Soll** von Vivodepot Pro: was das Produkt ist und was es enthält. Verkauft
wird Pro erst, wenn der ganze Umfang gebaut ist; Teilausgaben gibt es nicht. Der maschinenlesbare Block am Ende nennt je Rezept die Module, die das gebaute Produkt tragen
soll. Ein Wächter hält ihn gegen die Rezepte in `tools/lib/vier-produkte.js`: Weicht das Ist ab, wird der Commit rot.
Neues kommt nur über eine Zeile in dieser Datei in das Produkt.

## 1. Zweck

Pro ist das **berufliche Depot**. Es hält die Angaben, die ein Betrieb oder eine selbstständig tätige Person braucht,
damit jemand anderes handeln kann: eine Vertretung auf Zeit, eine Nachfolgerin, eine Prokuristin, eine neue Kraft in
der Einarbeitung. Gefragt wird nach dem, was diese Personen zum Handeln brauchen: wer vertreten darf, welche Verträge
laufen, wo Unterlagen liegen, welche Fristen gelten, wer anzusprechen ist.

Pro ist **branchenneutral**. Die allgemeine Fassung deckt jeden Betrieb ab; was nur ein Beruf braucht, kommt als
Berufsvorlage dazu (Abschnitt 5).

## 2. Zielgruppen

Inhaberinnen und Inhaber kleiner Betriebe, Geschäftsführungen, Freiberufler und Selbstständige, gleich in welcher
Rechtsform. Die Rechtsform wird als Angabe erfasst und blendet nichts aus: Wer ein Feld nicht braucht, lässt es leer.

## 3. Abgrenzung zu Privat

| | Privat | Pro |
|---|---|---|
| Inhalt | Person, Familie, Gesundheit, Vorsorge | Betrieb, Vertretung, Finanzen, Zugänge, Unterlagen, Kontakte |
| Anlässe | Lebenslagen, Notfall | Vertretung, Übergabe, Einarbeitung, Nachfolge, **ohne Notfall** (U2-ADR-243) |
| Gesundheitsdaten | ja | **nein** |
| Private Angaben | ja | nur was die Person für die Vertretung freiwillig teilt |
| Anwendung | dieselbe Kern-Anwendung | dieselbe Kern-Anwendung, eigenes signiertes Rezept |

Pro **ersetzt** die Bereiche von Privat, statt sie zu ergänzen (U2-ADR-421): Eine Pro-Datei zeigt die Firmen-Bereiche,
nicht die privaten. Einträge einer älteren Datei in Bereichen oder Situationen, die Pro nicht anbietet, bleiben lesbar
(ruhende Bereiche und Situationen, U2-ADR-243 §5).

## 4. Bereiche

Sechs Bereiche, je Sprache dieselben (Felder: U2-ADR-243):

| Kennung | Bereich | Worum es geht |
|---|---|---|
| `pro-vertretung-vollmachten` | Vollmachten | Wer handeln darf, welche Vollmachten bestehen, die Firma und ihre Rechtsform |
| `pro-gesellschaft-nachfolge` | Gesellschaft und Nachfolge | Grundlagen der Gesellschaft, Anteile, Nachfolge, Verkauf und Übergabe |
| `pro-finanzen-verbindlichkeiten` | Finanzen | Konten, Fristen, Abschluss und Steuern, Liquidität und Gläubiger, Wertpapierdepots |
| `pro-betrieb-zugaenge` | Betrieb | Zugänge, Geschäftsbeziehungen und Verträge, Zulassungen, Sachwerte, Beschäftigte, Datenschutz, Post |
| `pro-aufbewahrung-ordnung` | Unterlagen | Wo was liegt, Prüfungen, Angaben über dieses Depot |
| `pro-kontakte-vertretungsplan` | Kontakte und Vertretung | Kontakte, Vertretungsplan, benannte Personen, die ersten Tage |

Welche Bereichsdateien ein Rezept trägt, steht in `tools/lib/vier-produkte.js` (`modulDateienFuer`).

## 5. Vorlagen

| Vorlage | Stand | Hinweis |
|---|---|---|
| Berufsvorlage Steuerberatung | im Umfang | als eigener Zuschnitt (U2-ADR-489) |
| Berufsvorlage Kanzlei | im Umfang | als eigener Zuschnitt (U2-ADR-489) |
| Erbschein-Vorbereitung | im Umfang | ab Werk in jedem Pro-Rezept |
| Zugang zum Recht (Beratungshilfe) | im Umfang | ab Werk in jedem Pro-Rezept |
| Einarbeitungsplan | im Umfang | als Liste im Bereich Kontakte und Vertretung (Abschnitt 9) |
| Vollmacht für den Betrieb, Übergabeprotokoll | im Umfang | E2; der Vollmachtstext wird unabhängig an den Quellen geprüft |
| Berufsvorlage Handwerk | nicht im Umfang | Entscheidung 23.10.2026 |
| Berufsvorlage Notariat | ruht | U2-ADR-427, Nachtrag 07.10.2026 |
| Private Vorlagen (Patientenverfügung, Betreuungsverfügung, Vorsorgevollmacht, Organspende, Verfügung zur digitalen Nachbildung, Angehörigen-Blätter) | — | **nicht in Pro**; sie verlassen das Rezept mit dem Rückschnitt |
| IPS-Begleittext (die festen Sätze des Gesundheitsexports) | im Rezept, bietet nichts an | Der IPS-Export steht nur, wenn eine Datei Gesundheit weckt, und braucht dann die Sätze (24.10.2026, Befund PRO-IPS-LEER) |

Ein Zuschnitt ist ein Pro-Grundrezept plus Bereich und Auszug genau eines Berufsmoduls (U2-ADR-489).

## 6. Auszüge und Anlässe

**Anlässe.** Vier, je Sprache dieselben: Vertretung, Übergabe, Einarbeitung, Nachfolge (U2-ADR-243 §5). „Notfall“ ist
in Pro weder Anlass noch Navigationspunkt.

**Auszüge.**

| Auszug | Stand | Einstieg |
|---|---|---|
| Geschäftsführerin — Vertretung und Nachfolge | im Umfang | Karte im Regal des Bereichs Vollmachten (U2-ADR-332) |
| je Berufsvorlage ein Auszug (Kanzlei, Steuerberatung) | im Umfang | im Zuschnitt |
| weitere allgemeine Auszüge | im Umfang | |

## 7. Umfang

Pro ist **ein** Produkt. Verkauft wird es erst, wenn alles Folgende gebaut, ausgeliefert und gegen diese Datei geprüft
ist. Jeder Punkt ist eine Sache und endet mit der Kennung aus Abschnitt 9 oder dem Abschnitt, der ihn trägt:

- das im Kanon Gelandete, die Module je Rezept (Abschnitt 10);
- die Felder für jede Rechtsform: Verträge, Verkauf und Übergabe, Beteiligungen, Mitgliedschaften, Wertpapierdepots
  (Abschnitt 4);
- der Rückschnitt aller privaten Vorlagen und Bereiche aus dem Pro-Rezept; identity liest dieselbe Vorlage wie Privat,
  private Felder bietet Pro nicht an, ruhende Felder nach U2-ADR-421 §8 (Abschnitt 5);
- die Marktlücken und die weiteren Posten (Abschnitt 9);
- weitere allgemeine Auszüge (E13);
- vorbefüllte Listen im Fahrplan der ersten Tage (E14);
- die Vertretung als eigener Ausschnitt (E15);
- ein Hilfe-Thema Pro (E16);
- die Lieferseite: Kauf, Auslieferung, Aktualisierungen (E17).

**Rechtsraum.** Jedes Pro-Rezept trägt den Rechtsraum DE; Erbschein-Vorbereitung und Zugang zum Recht beruhen auf
deutschem Recht.

**Offen:** Auch `pro-en` trägt den Rechtsraum DE. Ob eine englische Pro-Fassung einen eigenen
Rechtsraum braucht, ist nicht entschieden; der Wächter prüft den heutigen Stand.

## 8. Marktvergleich

Grundlage für Abschnitt 9 ist ein Vergleich mit 19 Angeboten aus Deutschland und Europa (Notfall- und
Nachfolgehandbücher von Kammern, Verbänden und Beratungen, Stand 23.10.2026). Die Zahl in Klammern nennt, wie viele der
19 Angebote ein Thema abfragen.

## 9. Lücken und Empfehlungen

**Marktlücken (im Umfang; Bau P6; neue Felder mit Hinweis in DE und EN, Kennungen im Namensraum `pro-`).** Jede Zeile steht
mit ihrer Kennung in der Liste `offen` oder `gebaut` im Soll (Abschnitt 10):

| Kennung | Thema | Ort |
|---|---|---|
| P6-1 | Informationsplan: wer wird bei Übergabe oder Vertretung wann, wie und durch wen informiert (7/19) | Kontakte und Vertretung |
| P6-2 | Beraterinnen, Berater, Behörden und Stellen mit Rolle und Erreichbarkeit (6/19) | Kontakte und Vertretung |
| P6-3 | Einarbeitung der Nachfolge: Thema, wer zeigt es, bis wann; zugleich der Einarbeitungsplan (6/19) | Kontakte und Vertretung |
| P6-4 | Form der Übergabe als Auswahl (Anteils- oder Vermögenskauf, Schenkung, Pacht, Fremdgeschäftsführung) (6/19) | Gesellschaft und Nachfolge |
| E11 | Anderkonten und Fremdgeld (alle 4 Kanzlei-Angebote im Vergleich) | Berufsmodul Kanzlei |

**Weitere Posten im Umfang (geschlossen, 23.10.2026).** Aus den Empfehlungen früherer Prüfungen und dem Marktvergleich
gehören diese Posten zum Produkt. Sie stehen mit ihrer Kennung in der Liste `offen` im Soll (Abschnitt 10):

| Kennung | Posten | Quelle |
|---|---|---|
| E1 | Anlässe mit Leitfragen; Felder, die dieselben Personen zu verschiedenem Zweck erfassen, zeigen im Hinweis aufeinander; Felder einzelner Branchen bleiben im Grund-Pro und nennen ihre Bedingung im Hinweis (Abschnitt 2; Entscheidung 23.10.2026: kein Handwerksmodul, eine generische berufliche Fassung) | Prüfung des Pro-Inhalts, 21.10.2026 |
| E2 | Vorlagen „Vollmacht für den Betrieb“ und „Übergabeprotokoll“ | Prüfung des Pro-Inhalts, 21.10.2026 |
| E3 | Behebung sichtbarer Fehler im Auszug | Prüfung des Pro-Inhalts, 21.10.2026 |
| E4 | Die Vorschrift hinter einem Feld in der Oberfläche zeigen; jede angezeigte Quelle unabhängig geprüft | Vorbilder-Abgleich, 17.10.2026 |
| E5 | Unternehmenskauf: Kaufpreis, Stichtag, Zahlungsweise (die Bewertung gibt es schon) | Vorbilder-Abgleich, 17.10.2026; Abgleich 02.09.2026 |
| E6 | Unterrichtung der Beschäftigten beim Betriebsübergang (§ 613a BGB) | Vorbilder-Abgleich, 17.10.2026 |
| E7 | Meldungen bei Vertretung, Übergabe oder Aufgabe als eine Feldgruppe: Kammer, KV/KZV, Versorgungswerk, BG, Gewerbeamt, Finanzamt (5/19) | Marktvergleich 23.10.2026; Recherche Deutschland, Teil 1 |
| E8 | Benannte Vertretung mit Qualifikation und Zeitraum | Recherche Teil 1 |
| E9 | Kennungen für Business-Wallet und EU-Vollmacht als Felder | Recherche 01.10.2026 |
| E10 | Rechnungsarchiv und E-Rechnungsformate im Übergabe-Auszug | Recherche 01.10.2026 |
| E11 | Anderkonten und Fremdgeld im Berufsmodul Kanzlei | Quellensichtung 18.08.2026 |
| E12 | Pflichten der Geschäftsführung bei der Einarbeitung (§§ 41, 43 GmbHG) als Hinweis am Feld „Einarbeitung“ | Vorbilder-Abgleich, 17.10.2026 |
| E13 | Fünf weitere Auszüge, DE und EN: Steuerberatung, Bank, Nachfolge, Kunden informieren, Belegschaft informieren | Abschnitt 6, weitere allgemeine Auszüge |
| E14 | Vorbefüllte Listen im Fahrplan der ersten Tage, DE und EN (heute leer ausgeliefert) | Abschnitt 7, Umfang |
| E15 | Die Vertretung als eigener Ausschnitt: eigenes Fach, eigene Datei, mit den Bereichsdefinitionen | Abschnitt 7, Umfang |
| E16 | Ein Hilfe-Thema Pro | Abschnitt 7, Umfang |
| E17 | Die Lieferseite: Kauf, Auslieferung, Aktualisierungen | Abschnitt 7, Umfang |

**Nicht im Umfang:** eine Berufsvorlage Handwerk und ein Modul Pflege (Pro ist zuerst die allgemeine berufliche Fassung;
Meldungen deckt E7); eine zweite Übergabestruktur nach einem ausländischen Vorbild und eine eigene Mandanteninformation
(der Informationsplan aus Abschnitt 9 deckt beides); Ehevertrag und Güterstand (private Angabe, in Pro ruhend).

## 10. Soll je Rezept

Der Block nennt je Rezept die Menge der Module als `{modulTyp, kennung}`. Die Kennung ist bei einem Bereich der
Schlüssel unter `bereiche`, sonst `id`, sonst `kennung`, sonst `anbieterId`; trägt eine Datei keines davon, zählt nur
ihr `modulTyp`, und der kommt je Rezept einmal vor. Sprachmodul, Erscheinungsbild und die Liste der bekannten Bereiche
sind nicht Teil des Abgleichs.

Was heute noch im Rezept steht und mit dem Rückschnitt herausgeht, steht nicht im Soll, sondern in einer befristeten
Liste der Prüfung. Diese Liste kann nur schrumpfen; ein Eintrag ohne Gegenstück im Ist ist ein Fehler.

<!-- pro-soll:anfang -->
```json
{
  "fassung": 1,
  "rezepte": {
    "pro-de": [
      {"modulTyp":"bereich","kennung":"pro-aufbewahrung-ordnung"},
      {"modulTyp":"bereich","kennung":"pro-betrieb-zugaenge"},
      {"modulTyp":"bereich","kennung":"pro-finanzen-verbindlichkeiten"},
      {"modulTyp":"bereich","kennung":"pro-gesellschaft-nachfolge"},
      {"modulTyp":"bereich","kennung":"pro-kontakte-vertretungsplan"},
      {"modulTyp":"bereich","kennung":"pro-vertretung-vollmachten"},
      {"modulTyp":"rechtsraum","kennung":"vivodepot"},
      {"modulTyp":"bereicheNativ","kennung":"vivodepot/bereiche-nativ"},
      {"modulTyp":"situation"},
      {"modulTyp":"ips-begleittext","kennung":"vivodepot"},
      {"modulTyp":"sprachangebot","kennung":"vivodepot"},
      {"modulTyp":"logikModul","kennung":"pro-geschaeftsfuehrerin-notfallmappe"},
      {"modulTyp":"logikModul","kennung":"zugang-zum-recht-beratungshilfe"},
      {"modulTyp":"logikModul","kennung":"erbschein-vorbereitung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-steuerberatung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-bank"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-nachfolge"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-kunden-informieren"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-belegschaft-informieren"}
    ],
    "pro-en": [
      {"modulTyp":"bereich","kennung":"pro-aufbewahrung-ordnung"},
      {"modulTyp":"bereich","kennung":"pro-betrieb-zugaenge"},
      {"modulTyp":"bereich","kennung":"pro-finanzen-verbindlichkeiten"},
      {"modulTyp":"bereich","kennung":"pro-gesellschaft-nachfolge"},
      {"modulTyp":"bereich","kennung":"pro-kontakte-vertretungsplan"},
      {"modulTyp":"bereich","kennung":"pro-vertretung-vollmachten"},
      {"modulTyp":"rechtsraum","kennung":"vivodepot"},
      {"modulTyp":"bereicheNativ","kennung":"vivodepot/bereiche-nativ"},
      {"modulTyp":"situation"},
      {"modulTyp":"ips-begleittext","kennung":"vivodepot"},
      {"modulTyp":"logikModul","kennung":"pro-geschaeftsfuehrerin-notfallmappe"},
      {"modulTyp":"logikModul","kennung":"zugang-zum-recht-beratungshilfe"},
      {"modulTyp":"logikModul","kennung":"erbschein-vorbereitung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-steuerberatung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-bank"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-nachfolge"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-kunden-informieren"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-belegschaft-informieren"}
    ],
    "pro-de-kanzlei": [
      {"modulTyp":"bereich","kennung":"pro-aufbewahrung-ordnung"},
      {"modulTyp":"bereich","kennung":"pro-betrieb-zugaenge"},
      {"modulTyp":"bereich","kennung":"pro-finanzen-verbindlichkeiten"},
      {"modulTyp":"bereich","kennung":"pro-gesellschaft-nachfolge"},
      {"modulTyp":"bereich","kennung":"pro-kontakte-vertretungsplan"},
      {"modulTyp":"bereich","kennung":"pro-vertretung-vollmachten"},
      {"modulTyp":"rechtsraum","kennung":"vivodepot"},
      {"modulTyp":"bereicheNativ","kennung":"vivodepot/bereiche-nativ"},
      {"modulTyp":"situation"},
      {"modulTyp":"ips-begleittext","kennung":"vivodepot"},
      {"modulTyp":"sprachangebot","kennung":"vivodepot"},
      {"modulTyp":"bereich","kennung":"pro-kanzlei"},
      {"modulTyp":"logikModul","kennung":"pro-kanzlei-vertretung"},
      {"modulTyp":"logikModul","kennung":"pro-geschaeftsfuehrerin-notfallmappe"},
      {"modulTyp":"logikModul","kennung":"zugang-zum-recht-beratungshilfe"},
      {"modulTyp":"logikModul","kennung":"erbschein-vorbereitung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-steuerberatung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-bank"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-nachfolge"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-kunden-informieren"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-belegschaft-informieren"}
    ],
    "pro-en-kanzlei": [
      {"modulTyp":"bereich","kennung":"pro-aufbewahrung-ordnung"},
      {"modulTyp":"bereich","kennung":"pro-betrieb-zugaenge"},
      {"modulTyp":"bereich","kennung":"pro-finanzen-verbindlichkeiten"},
      {"modulTyp":"bereich","kennung":"pro-gesellschaft-nachfolge"},
      {"modulTyp":"bereich","kennung":"pro-kontakte-vertretungsplan"},
      {"modulTyp":"bereich","kennung":"pro-vertretung-vollmachten"},
      {"modulTyp":"rechtsraum","kennung":"vivodepot"},
      {"modulTyp":"bereicheNativ","kennung":"vivodepot/bereiche-nativ"},
      {"modulTyp":"situation"},
      {"modulTyp":"ips-begleittext","kennung":"vivodepot"},
      {"modulTyp":"bereich","kennung":"pro-kanzlei"},
      {"modulTyp":"logikModul","kennung":"pro-kanzlei-vertretung"},
      {"modulTyp":"logikModul","kennung":"pro-geschaeftsfuehrerin-notfallmappe"},
      {"modulTyp":"logikModul","kennung":"zugang-zum-recht-beratungshilfe"},
      {"modulTyp":"logikModul","kennung":"erbschein-vorbereitung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-steuerberatung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-bank"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-nachfolge"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-kunden-informieren"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-belegschaft-informieren"}
    ],
    "pro-de-steuerberatung": [
      {"modulTyp":"bereich","kennung":"pro-aufbewahrung-ordnung"},
      {"modulTyp":"bereich","kennung":"pro-betrieb-zugaenge"},
      {"modulTyp":"bereich","kennung":"pro-finanzen-verbindlichkeiten"},
      {"modulTyp":"bereich","kennung":"pro-gesellschaft-nachfolge"},
      {"modulTyp":"bereich","kennung":"pro-kontakte-vertretungsplan"},
      {"modulTyp":"bereich","kennung":"pro-vertretung-vollmachten"},
      {"modulTyp":"rechtsraum","kennung":"vivodepot"},
      {"modulTyp":"bereicheNativ","kennung":"vivodepot/bereiche-nativ"},
      {"modulTyp":"situation"},
      {"modulTyp":"ips-begleittext","kennung":"vivodepot"},
      {"modulTyp":"sprachangebot","kennung":"vivodepot"},
      {"modulTyp":"bereich","kennung":"pro-steuerberatung"},
      {"modulTyp":"logikModul","kennung":"pro-steuerberatung-vertretung"},
      {"modulTyp":"logikModul","kennung":"pro-geschaeftsfuehrerin-notfallmappe"},
      {"modulTyp":"logikModul","kennung":"zugang-zum-recht-beratungshilfe"},
      {"modulTyp":"logikModul","kennung":"erbschein-vorbereitung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-steuerberatung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-bank"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-nachfolge"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-kunden-informieren"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-belegschaft-informieren"}
    ],
    "pro-en-steuerberatung": [
      {"modulTyp":"bereich","kennung":"pro-aufbewahrung-ordnung"},
      {"modulTyp":"bereich","kennung":"pro-betrieb-zugaenge"},
      {"modulTyp":"bereich","kennung":"pro-finanzen-verbindlichkeiten"},
      {"modulTyp":"bereich","kennung":"pro-gesellschaft-nachfolge"},
      {"modulTyp":"bereich","kennung":"pro-kontakte-vertretungsplan"},
      {"modulTyp":"bereich","kennung":"pro-vertretung-vollmachten"},
      {"modulTyp":"rechtsraum","kennung":"vivodepot"},
      {"modulTyp":"bereicheNativ","kennung":"vivodepot/bereiche-nativ"},
      {"modulTyp":"situation"},
      {"modulTyp":"ips-begleittext","kennung":"vivodepot"},
      {"modulTyp":"bereich","kennung":"pro-steuerberatung"},
      {"modulTyp":"logikModul","kennung":"pro-steuerberatung-vertretung"},
      {"modulTyp":"logikModul","kennung":"pro-geschaeftsfuehrerin-notfallmappe"},
      {"modulTyp":"logikModul","kennung":"zugang-zum-recht-beratungshilfe"},
      {"modulTyp":"logikModul","kennung":"erbschein-vorbereitung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-steuerberatung"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-bank"},
      {"modulTyp":"logikModul","kennung":"pro-auszug-nachfolge"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-kunden-informieren"},
      {"modulTyp":"logikModul","kennung":"pro-vorlage-belegschaft-informieren"}
    ]
  },
  "offen": [
    {"kennung":"E2","posten":"Vorlagen Vollmacht für den Betrieb und Übergabeprotokoll"},
    {"kennung":"E4","posten":"Vorschrift am Feld anzeigen"},
    {"kennung":"E6","posten":"Unterrichtung der Beschäftigten, § 613a BGB"},
    {"kennung":"E7","posten":"Meldungen als Feldgruppe"},
    {"kennung":"E14","posten":"vorbefüllte Listen im Fahrplan der ersten Tage"},
    {"kennung":"E17","posten":"Lieferseite: Kauf, Auslieferung, Aktualisierungen"}
  ],
  "gebaut": [
    {"kennung":"E10","posten":"Rechnungsarchiv und E-Rechnung im Übergabe-Auszug"},
    {"kennung":"E8","posten":"Vertretung mit Qualifikation und Zeitraum"},
    {"kennung":"E3","posten":"sichtbare Fehler im Auszug"},
    {"kennung":"E13","posten":"fünf weitere Auszüge (Steuerberatung, Bank, Nachfolge, Kunden informieren, Belegschaft informieren), DE und EN"},
    {"kennung":"E9","posten":"Kennungen Business-Wallet und EU-Vollmacht"},
    {"kennung":"E11","posten":"Anderkonten und Fremdgeld, Berufsmodul Kanzlei"},
    {"kennung":"E12","posten":"§§ 41, 43 GmbHG als Hinweis an der Einarbeitung"},
    {"kennung":"P6-1","posten":"Informationsplan"},
    {"kennung":"P6-2","posten":"Beraterinnen, Berater und Stellen"},
    {"kennung":"P6-3","posten":"Einarbeitung der Nachfolge"},
    {"kennung":"P6-4","posten":"Form der Übergabe"},
    {"kennung":"E15","posten":"die Vertretung als eigener Ausschnitt"},
    {"kennung":"E16","posten":"Hilfe-Thema Pro"},
    {"kennung":"E1","posten":"Anlässe mit Leitfragen, Felder getrennt mit Hinweisen, Branchenfelder mit Bedingung"},
    {"kennung":"E5","posten":"Kaufpreis, Stichtag der Übergabe und Zahlungsweise unter Gesellschaft und Nachfolge"}
  ]
}
```
<!-- pro-soll:ende -->
