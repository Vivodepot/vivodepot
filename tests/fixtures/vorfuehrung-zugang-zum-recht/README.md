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
| `demo-de.vivodepot` | Deutsch — gebaut im Produkt privat-de, ab Werk |
| `demo-en.vivodepot` | Englisch — gebaut im Produkt privat-en, ab Werk (kein Modul im Einlass-Fach) |
| `altdatei-demo-de-2026-09-10.vivodepot` | Altdatei: die deutsche Fassung vom 10.09.2026, vor dem Kennungs-Umbau (für Altbestands- und Rückfall-Proben) |
| `altdatei-demo-en-2026-09-10.vivodepot` | Altdatei: die englische Fassung vom 10.09.2026, mit eingelassenem Sprachmodul eines Zwischenstands — öffnet seit der Sperre mit Hinweis |

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

**Seit 04.10.2026** entstehen die Vorführ-Depots im Produkt ihrer Sprache (Erzeuger oben); der unten beschriebene Weg über
`modulEinlassen` gilt nur noch für die Altdateien. Dass jede Fixture-Depotdatei ohne gesperrtes Modul öffnet oder hier als
Altdatei benannt ist, hält `tests/fixture-depots-ab-werk.test.js`.
