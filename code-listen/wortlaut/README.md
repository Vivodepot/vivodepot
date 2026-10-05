# Pflicht-Wortlaute der Codelisten

Die Dateien hier sind **byte-genau** der Wortlaut, den der Lizenzgeber im weitergegebenen Exemplar verlangt. Der
Kern wird als einzelne Datei weitergegeben; darum stehen die Wortlaute in seiner Region `LIZENZ-WORTLAUT`, erzeugt
von `tools/build-code-listen.js` und gehalten von `tests/lizenz-wortlaut-im-kern.test.js`. Kopf und Herkunft stehen
hier und nicht in den Dateien, damit diese byte-gleich bleiben.

| Datei | Lizenzgeber | Fundstelle der Pflicht | Wortlaut von |
|---|---|---|---|
| `LOINC_short_license.txt` | Regenstrief Institute | https://loinc.org/license, § 10 („includes the following notice“), Fassung „Last updated on July 21, 2026“ | ebd., § 10 |
| `icd-10-gm-quellenangabe.txt` | BfArM | Downloadbedingungen für die ICD-10-GM, § 1 („Bei der Weitergabe sind die im Anhang … aufgeführten Quellenangaben (nach § 63 UrhG) aufzunehmen“) | https://www.bfarm.de/SharedDocs/Downloads/DE/Kodiersysteme/klassifikationen/icd-10-gm/_config/Downloadbedingungen_Anhang.html, „Quellenangaben für den Band 1 (Systematisches Verzeichnis)“, ohne die Zeilen „bei Druckwerken“ |
| `atc-gm-quellenangabe.txt` | BfArM (Urheber WIdO) | Downloadbedingungen ATC-GM mit DDD, § 1 („In jedes maschinenlesbare Weitergabeexemplar ist die folgende Quellenangabe … aufzunehmen“) | ebd., § 1 |
| `snomed-gps-hinweis.txt` | SNOMED International | CC BY-ND 4.0, Section 3(a)(1) (Namensnennung „in any reasonable manner“); Wortlaut von SNOMED in Ticket 61950, Punkt 6, am 26.09.2026 als „acceptable in substance“ angenommen | Ticket 61950, Punkt 6; letzter Satz wörtlich von https://www.snomed.org/gps, Abschnitt „Licensing“, abgerufen 04.10.2026. Vor jeder Auslieferung gegen die GPS-Seite prüfen (Auflage des Tickets). |

Abgerufen am 27.09.2026. Eine neue Datei gehört nur hierher, wenn die Pflicht, den Hinweis **in der Datei** zu
führen, mit Fundstelle belegt ist; sonst genügen `NOTICE.md` und `THIRD_PARTY_LICENSES`.

Der LOINC-Kurzhinweis trägt den Dateinamen, den § 10 für ein Speichermedium vorschreibt.

**Herkunft `snomed-gps-hinweis.txt`:** Wortlaut aus der Antwort von SNOMED International auf Ticket 61950 vom 26.09.2026,
Punkt 6 (dort „acceptable in substance“); der letzte Satz („SNOMED CT® was originally created by the College of American
Pathologists.“) wörtlich von https://www.snomed.org/gps, Abschnitt „Licensing“, abgerufen am 04.10.2026. SHA-256 der Datei:
`86a7035a0a2277d2ec48a48b98321156a7e87f433a234a1629ca4adc5624b0de` (`shasum -a 256 code-listen/wortlaut/snomed-gps-hinweis.txt`). Vor jeder Auslieferung gegen die GPS-Seite
prüfen und das Datum hier nachtragen.
