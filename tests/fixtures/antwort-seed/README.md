# Sicherung mit Antwort-Seed (Fixture, Wagen V2a)

**Wofür:** Die Sicherbarkeits-Probe des Antwort-Seeds (`tests/antwort-seed-sicherbarkeit.test.js`). Eine Datei, die mit dem
Kern des Wagens geschrieben wurde und den Seed trägt. Jeder künftige Kern und jede künftige Lese-App muss sie öffnen und
denselben Seed lesen; sie wächst darum nicht mit.

**Erzeugt:** mit `node tests/fixtures/antwort-seed/erzeugen.js`, über `depotAnlegen`, `_antwortSeedHolen` und
`depotSerialisieren`. Kein von Hand gebautes JSON. Gespeichert ist der Umschlag als JSON ohne Dateikopf (`depotLaden`
nimmt ihn so; der Dateikopf trüge ein Steuerzeichen und gehört nicht zum Gegenstand der Probe).

**Kein Sitzungskürzel im Chiffrat:** Zufälliges Chiffrat kann eine Zeichenfolge tragen, die der Wächter für interne
Sitzungskürzel (`tools/interne-sitzungskuerzel-pruefen.js`, z. B. „DC" + Ziffern) als Fund meldet. Der Erzeuger verschlüsselt
darum neu, bis die geschriebene Datei Zeile für Zeile keine Fundstelle trägt. Er nimmt dafür die Achsen und die
Datenzeilen-Regel aus diesem Werkzeug selbst, nicht abgeschrieben. Inhalt und Seed bleiben dabei dieselben, nur Salze, IVs und Chiffrat
wechseln.

**Person:** Elisabeth Wredenhagen, dieselbe erfundene Fixture-Person wie in den übrigen Proben. Kein echter Name, keine
echte Anschrift.

**Passwort:** `antwort-seed-fixture-2026`

**Gepinnt:** Die Probe prüft die Prüfsumme der Datei, bevor sie sie benutzt (`MIT_SEED_SHA256`). Eine neu gezogene Datei
prüfte nur noch den Kern, der sie gerade geschrieben hat.
