# Test-Schriften für `tests/pdf-schrift-pruefen.test.js`

Zuschnitte aus dem PDF-Inter-Block des Kerns (Inter, SIL Open Font License 1.1, Volltext: `OFL.txt` im Repo-Wurzel,
Autoren: The Inter Project Authors). Gebaut mit `python3 tools/pdf-schrift-fixturen-bauen.py`, reproduzierbar.
Einzelne fsType-Werte sind für die Rot-Beweise absichtlich verändert; die Dateien dienen nur der Prüfung.

`kyrillisch-griechisch.ttf` und `kyrillisch-griechisch-bold.ttf` stammen nicht aus dem Kern-Block, sondern aus Inter 4.1
(`Inter-4.1.zip`, `extras/ttf/Inter-Regular.ttf` und `Inter-Bold.ttf`, SHA-256 des Archivs im `NOTICE.md`): zugeschnitten mit fontTools
auf die Codepunkte der Ab-Werk-Inter plus U+0370–U+04FF (Griechisch, Kyrillisch). Gleiche Lizenz. Sie dienen nur
`tests/pdf-namen-nicht-latein.test.js`.

