# Fixture: Alphabetisches Verzeichnis zur ICD-10-GM (erfunden)

Alle Zeilen hier sind erfunden. Keine stammt aus dem Verzeichnis des BfArM, auch nicht auszugsweise. Die Codes X00.00
und X00.10 gibt es in der ICD-10-GM nicht, und die Nummern 90001 bis 90005 sind ausgedacht. Nur das Format ist das der
Klassifikationsdatei: acht Felder, getrennt durch `|`.

- `alphabet.txt`: Zeilen im Format der Klassifikationsdatei, mit einer Zeile mit Druckkennzeichen 0 und einem Verweis
  ohne Code.
- `liste.json`: eine Code-Liste mit Auszug, wie `code-listen/icd10.json` ihn trägt.

Werkzeug: `tools/icd-alphabet-begriffe.js`. Ohne Argument läuft es gegen diese Fixture, mit `--alphabet <datei>` gegen die
echte Datei. Probe: `tests/icd-anzeige-amtlich.test.js`.
