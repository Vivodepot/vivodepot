# Vorführ-Depot — Zugang zum Recht / Beratungshilfe-Auszug

Erzeugt mit
[`tools/vorfuehrung-zugang-zum-recht-demodepot-erzeugen.js`](../../../tools/vorfuehrung-zugang-zum-recht-demodepot-erzeugen.js).
Echte, passwortverschlüsselte `.vivodepot`-Dateien, öffenbar in der echten Anwendung über
„Schon ein Vivodepot? Datei öffnen".

**Testpersona:** Elisabeth Wredenhagen-Sonnenschein — dieselbe Fixture-Person wie
`tests/lese-app-zugang-zum-recht-auszug.test.js`. Kein echter Name, keine echte Adresse, keine
echte Bankverbindung; alle Werte frei erfunden.

**Passwort zum Öffnen (beide Dateien):** `zugang-zum-recht-vorfuehrung-2026`

| Datei | Sprache |
|---|---|
| `demo-de.vivodepot` | Deutsch (eingebaut) |
| `demo-en.vivodepot` | Englisch — mit angedocktem Sprachmodul `tools/textsatz-en-modul.json` |

Alle 19 Fragen des Beratungshilfe-Auszugs (Teil 0–C) tragen einen Wert — keine
„— nicht erfasst —"-Lücke. Eine Lücke bleibt bewusst bestehen (Kontostände, „Vivodepot führt sie
nicht" — Teil B) — das ist eine Zusicherung des Produkts, kein Fund.

**Befund zum EN-Weg** (nicht am Produkt behoben, s. Bericht): `data.textsprache = 'en'` allein
lässt den Kern auf die eingebauten deutschen Texte zurückfallen. Erst das ANGEDOCKTE Sprachmodul
(`modulEinlassen` mit dem Inhalt von `tools/textsatz-en-modul.json`, dann
`_textsatzModuleAusDepotAnmelden` + `textsatzNeuAnwenden`) schaltet den Auszug wirklich auf
Englisch — genau der Weg, den eine Bürgerin über Einstellungen → Module → Einlassen ginge. Die
umgebende App-Oberfläche (Toolbar-Knöpfe, Werkzeugleisten-Hinweis) bleibt auch dann Deutsch —
außerhalb des Geltungsbereichs dieses Sprachmoduls.
