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

Abgerufen am 27.09.2026. Eine neue Datei gehört nur hierher, wenn die Pflicht, den Hinweis **in der Datei** zu
führen, mit Fundstelle belegt ist; sonst genügen `NOTICE.md` und `THIRD_PARTY_LICENSES`.

Der LOINC-Kurzhinweis trägt den Dateinamen, den § 10 für ein Speichermedium vorschreibt.
