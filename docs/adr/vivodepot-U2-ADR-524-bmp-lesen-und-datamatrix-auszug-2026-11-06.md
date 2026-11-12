# U2-ADR-524 — Bundeseinheitlichen Medikationsplan einlesen, Data-Matrix-Auszug im Kern

**Status:** Angenommen (06.11.2026)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.
**Datum:** 2026-11-06
**Kategorie:** DATENMODELL, BEDIENUNG, LIEFERKETTE
**Linie:** U2
**Bezug:** U2-ADR-007 (Gesundheitsbereich) · U2-ADR-434 (Lieferketten-Sicherheit) · U2-ADR-470 (CSP ohne unsafe-inline)

---

## Anlass

Wer vom Arzt einen Medikationsplan bekommt, hat die Medikation schon auf Papier: als Tabelle und als Data-Matrix-Code
rechts oben. Der Code trägt den Plan als XML (BMP 2.8, Anlage 3 zur Vereinbarung nach § 31a Abs. 4 SGB V, Kap. 7: ISO-8859-1,
ohne Prolog, ohne Kompression). Bisher musste die Person jedes Mittel abtippen. Ein Lesen des Codes gab es im Kern nicht, und
die Browser bieten es nicht allgemein: Safari führt `BarcodeDetector` nur hinter einem Schalter.

Weg zum Nachsehen: `grep -n "BMP_EINLESEN:BEGIN\|BMP_OBERFLAECHE:BEGIN\|@vd-lib name=\"zxing-library\"" vivodepot.html`.

## Entscheidung

1. **Einlesen ohne Raten.** `bmpXmlLesen` nimmt nur, was die Spezifikation vorsieht: Elemente und Attribute, keine Texte
   zwischen Elementen, keine DOCTYPE, nur die fünf Standard-Entitäten und Zeichenreferenzen, höchstens 20 000 Zeichen.
   Alles andere weist er mit einer Kennung `bmp:*` ab. Gelesen werden Kopf, Patient, ausstellende Stelle und je Eintrag
   Handelsname, PZN (achtstellig), Wirkstoffe mit Stärke, Dosis (Viererschema oder Freitext), Hinweis, Grund und Zusatzzeile.
2. **Mehrseitige Pläne nur ganz.** Seiten kommen nur zusammen, wenn alle Seiten da sind und dieselbe Instanz-ID tragen;
   sonst nennt der Kern die fehlenden Seiten.
3. **Übernahme in die laufende Medikation.** Jeder Eintrag wird ein Chip in `health.medicationOngoing`, als lesbarer Text
   (Name · Dosis · Hinweis · Grund). Ein zweites Einlesen desselben Plans legt nichts doppelt an. In kein anderes Feld wird
   geschrieben. Dosis, PZN und Wirkstoff als eigene Unterfelder kommen später mit eigener Schemastufe; diese Entscheidung
   ändert das Schema nicht.
4. **Die Oberfläche.** An der laufenden Medikation steht, nur mit Schreibrecht, ein Knopf „Medikationsplan einlesen“. Er
   öffnet die Dateiwahl (XML-Datei oder Bild des Codes, mehrere Seiten auf einmal), eine Vorschau und „Übernehmen“.
5. **Data-Matrix-Auszug eingebettet.** Den Code im Bild liest ein Auszug aus `@zxing/library` 0.23.0 (Apache-2.0): nur der
   Lese-Teil für Data Matrix, als eigener Skriptblock im Kern wie qrcode-generator und noble-ed25519 — mit `@vd-lib`-Marke,
   CSP-sha256 über `tools/csp-bauen.js`, Eintrag im Fremdcode-Register, in der SBOM und in THIRD_PARTY_LICENSES. Den Block baut
   `tools/datamatrix-auszug-bauen.js` aus dem ESM-Baum des Pakets; die Abhängigkeit `ts-custom-error` ersetzt eine eigene Zeile.
   Kein Ladeweg, keine eigene Datei, kein Netz, kein WASM, keine Änderung der CSP.
6. **Herkunft mit Anker, Bindung fest.** Das Werkzeug baut nur aus dem Tarball des Pakets und nur, wenn dessen SHA-512 der
   Integrität aus dem Registry-Eintrag gleicht (Konstante `PAKET.integritaet`). `--pruefen --paket <tarball>` baut den Block nach
   und verlangt Byte-Gleichheit; wer Block und Marke zusammen ändert, fällt dort auf. Der Block bindet `vdDataMatrix` mit
   `Object.defineProperty`, nicht beschreibbar und nicht umkonfigurierbar, wie `vdNobleEd25519`. Das Paket trägt keine NOTICE-Datei.

## Folgen

- Fixtures und Demo-Daten sind erfunden. Die Beispieldateien der KBV tragen keine eigene Nutzungserlaubnis; sie kommen nicht
  ins Repo und dürfen nur als Prüfgegenstand außerhalb gelesen werden.
- Der Kern wächst um den Auszug (rund 300 KB unminifiziert, rund 55 KB gzip). Eine neue Fassung von `@zxing/library` ist ein
  neuer Bau des Auszugs mit neuer Integrität im Werkzeug und neuem Hash an allen vier Stellen.
- Die Pflegelage des Pakets (Wartungsmodus laut README) beobachtet die Lieferkette (U2-ADR-434, Schwachstellen-Abgleich).

## Nachtrag 09.11.2026: die Dosis als eigenes Feld (Schema 96)

Nr. 3 hatte die Dosis als Unterfeld auf später gestellt. Sie kommt jetzt, nur die Dosis; PZN und Wirkstoff bleiben später.

1. Der Medikations-Chip kann das optionale Feld `dosis` tragen. `bmpPlanUebernehmen` setzt es aus dem Plan, `text` bleibt wie bisher,
   damit Mappe, PDF und Notfallblätter unverändert lesen.
2. Beim zweiten Einlesen desselben Plans bekommt ein Chip gleichen Texts ohne `dosis` den Wert nachgetragen. Eine vorhandene Dosis bleibt.
3. Der IPS-Export schreibt `MedicationStatement.dosage[0].text`, nur aus `dosis`. Die Rückrichtung liest genau dieses Feld.
4. Die Dosis wird nie aus einem Chip-Text geraten. Altbestand und getippte Chips bleiben ohne `dosage`.
5. `dosage.timing` bleibt draußen: Das Viererschema ließe sich abbilden, Freitextangaben nicht, und zwei Wege wären zwei Fehlerquellen.
6. Schema 95 → 96 ändert keinen Wert. Die Stufe gibt es, weil ein älterer Kern `dosis` nicht kennt und beim Speichern verlöre.

7. Eine Dosis, die nicht schon als Abschnitt im Chip-Text steht, zeigt der Chip als „Name · Dosis“, beim Bearbeiten, in der Ansicht und in der
   Import-Vorschau. Sie steht wörtlich wie in der Quelle. PDF, QR und Notfallkarte bleiben ohne sie, bis die Eingabe von Hand entschieden ist.

Eine Eingabe der Dosis von Hand ist eine Bedienfrage und folgt eigens.

## Erwogen und verworfen

- **Decoder als WebAssembly (zxing-cpp):** braucht `wasm-unsafe-eval` in der CSP; die reine JS-Fassung liest die Größen
  des Plans in der Messung bytegenau.
- **Decoder als Modul außerhalb des Kerns:** ein eigener Ladeweg für Code; unter `file://` lässt sich eine Nachbardatei nicht
  mit Integritätsprüfung laden. Eingebettet gilt derselbe Weg wie für jede andere Bibliothek im Kern.
- **Nur `BarcodeDetector`:** fehlt in Safari ohne Schalter.

```yaml
konformitaet:
  - aussage: >-
      Die Dosis eines eingelesenen Plans steht im Chip-Feld dosis und im IPS als dosage[0].text; ohne dosis steht kein dosage,
      und sie wird nie aus dem Chip-Text geraten.
    zustand: erfuellt
    herkunft: U2-ADR-524 Nachtrag 09.11.2026 Nr. 1 bis 4
    pruefung:
      - tests/ips-medikation-dosierung.test.js "[DOSIS·a] ein Planeintrag mit Dosis ergibt dosage[0].text, der Chip-Text bleibt"
      - tests/ips-medikation-dosierung.test.js "[DOSIS·b] ohne Dosis und bei einem getippten Chip steht kein dosage"
      - tests/ips-medikation-dosierung.test.js "[DOSIS·c] zweites Einlesen trägt die Dosis nach und legt nichts doppelt an"
      - tests/ips-medikation-dosierung.test.js "[DOSIS·d] die Rückrichtung liest nur dosage[0].text"
      - tests/ips-medikation-dosierung.test.js "[DOSIS·Rot-Beweis] ohne die Ausgabe im Generator steht kein dosage"
  - aussage: >-
      Eine Dosis, die nicht schon im Chip-Text steht, steht sichtbar am Chip und in der Import-Vorschau, einmal und maskiert.
    zustand: erfuellt
    herkunft: U2-ADR-524 Nachtrag 09.11.2026 Nr. 7
    pruefung:
      - tests/ips-medikation-dosierung.test.js "[Anzeige·a] die Dosis aus einem fremden IPS steht am Chip beim Bearbeiten und in der Ansicht"
      - tests/ips-medikation-dosierung.test.js "[Anzeige·b] die Import-Vorschau zeigt die Dosis, eine geänderte Dosis ist ein Konflikt"
      - tests/ips-medikation-dosierung.test.js "[Anzeige·Rot-Beweis] ohne die Ausgabe am Chip fehlt die Dosis"
  - aussage: >-
      bmpXmlLesen liest Kopf, Patient und Einträge eines Plans und weist ab, was kein BMP ist, mit einer Kennung; mehrseitige
      Pläne kommen nur vollständig und mit gleicher Instanz-ID zusammen.
    zustand: erfuellt
    herkunft: U2-ADR-524 Nr. 1 und 2 (06.11.2026)
    pruefung:
      - tests/bmp-einlesen.test.js "[BMP·a] bmpXmlLesen liest Kopf, Patient und Einträge eines erfundenen Plans"
      - tests/bmp-einlesen.test.js "[BMP·c] bmpXmlLesen weist ab, was kein BMP ist — mit Kennung"
      - tests/bmp-einlesen.test.js "[BMP·d] mehrseitig: nur vollständig und mit gleicher Instanz-ID"
  - aussage: >-
      Jeder Eintrag wird ein Chip in der laufenden Medikation, ohne Doppel und in kein anderes Feld.
    zustand: erfuellt
    herkunft: U2-ADR-524 Nr. 3 (06.11.2026)
    pruefung:
      - tests/bmp-einlesen.test.js "[BMP·b] bmpEintragText setzt einen lesbaren Chip-Text zusammen"
      - tests/bmp-einlesen.test.js "[BMP·e] bmpPlanUebernehmen legt Chips in der laufenden Medikation an, ohne Doppel"
      - tests/bmp-einlesen.test.js "[BMP·f] Rot-Beweis: ein Plan schreibt in kein anderes Feld als die laufende Medikation"
  - aussage: >-
      Der Knopf steht nur an der laufenden Medikation und nur mit Schreibrecht; Dateien in ISO-8859-1 und UTF-8 werden gelesen.
    zustand: erfuellt
    herkunft: U2-ADR-524 Nr. 4 (06.11.2026)
    pruefung:
      - tests/bmp-einlesen.test.js "[BMP·Oberfläche] Knopf nur an der laufenden Medikation und nur mit Schreibrecht"
      - tests/bmp-einlesen.test.js "[BMP·Datei] bmpDateienLesen liest ISO-8859-1 und UTF-8, ein Bild ohne Bildleser wird abgewiesen"
  - aussage: >-
      Der eingebettete Data-Matrix-Auszug liest einen Code bytegenau; Marke, SBOM und Lizenzdatei tragen denselben Hash.
    zustand: erfuellt
    herkunft: U2-ADR-524 Nr. 5 (06.11.2026)
    pruefung:
      - tests/bmp-einlesen.test.js "[BMP·Data Matrix] der eingebettete Auszug liest einen erfundenen Code bytegenau, mit gedämpftem Kontrast und Rauschen"
      - tests/compliance.test.js "4) SBOM ist CycloneDX 1.6; jsPDF, noble-ed25519, qrcode-generator + Data-Matrix-Auszug als Libraries; Code-Listen als file-Komponenten"
  - aussage: >-
      Gebaut wird nur aus einem Tarball mit der Integrität des Registry-Eintrags; vdDataMatrix ist nicht beschreibbar gebunden.
    zustand: erfuellt
    herkunft: U2-ADR-524 Nr. 6 (06.11.2026)
    pruefung:
      - tests/bmp-einlesen.test.js "[BMP·Herkunft] gebaut wird nur aus einem Tarball mit der Integrität des Registry-Eintrags"
      - tests/bmp-einlesen.test.js "[BMP·Herkunft·Rot-Beweis] ein geändertes Byte im Tarball bricht vor dem Lesen ab"
      - tests/bmp-einlesen.test.js "[BMP·Global] der eingebettete Auszug bindet vdDataMatrix nicht beschreibbar und nicht umkonfigurierbar"
      - tests/bmp-einlesen.test.js "[BMP·Global·Rot-Beweis] als var gebunden wäre der Leser austauschbar"
```
