# v515-Depot ohne Ab-Werk-Auszüge (Fixture, 16.09.2026)

**Wofür:** Der Rest R1 aus dem Code-Review vom 16.09.2026. Eine Datei, die die beiden Ab-Werk-Auszüge
(Erbschein-Vorbereitung, Beratungshilfe) NOCH NICHT trägt, weil sie älter ist als die Schema-Stufen 79
und 80. Erst an ihr zeigt sich, ob ein Produkt die Auszüge nachliefert — die ältere Fixture
`vorfuehrung-zugang-zum-recht` trägt beide schon und kann das nicht prüfen.

**Erzeugt:** mit dem echten v515-Kern aus der Versionsgeschichte (`git show 12b50b07:vivodepot.html`),
über `depotAnlegen` und `depotSerialisieren` — kein von Hand gebautes JSON. Schema 75, kryptoVersion 4,
Werte in vier Bereichen (Identität, Vermögen, Finanzen, Verwaltung), `logikModule` leer.

**Person:** Elisabeth Wredenhagen, dieselbe erfundene Fixture-Person wie in den übrigen Proben. Kein
echter Name, keine echte Anschrift, keine echte Bankverbindung.

**Passwort:** `v515-fixture-ohne-auszuege-2026`

**Gepinnt:** Die Probe prüft die Prüfsumme der Datei, bevor sie sie benutzt. Ein Tausch gegen eine
neuere Datei würde die Proben still grün machen, weil der geprüfte Weg (Migration 79/80/81) dann nie
läuft. Prüfsumme siehe `tests/pro-datei-oeffnen-verliert-nichts.test.js`.
