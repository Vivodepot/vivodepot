# U2-ADR-385 · Grundlinie: die vier Produkte gegen Lese-App und VC-Issuer

**Datum:** 08.09.2026
**Status:** gebaut, Grundlinie erzeugt, alle vier Produkte identisch, echter Playwright-Browser
**Status heute:** gilt
**Bezug:** wörtlich „andere Apps = lesen + vc-issuer" (Ökosystem weiter gefasst als
nur das Depot) · U2-ADR-372/381 (dieselbe Bauart, dieselbe Menschenweg-Auflage) · U2-ADR-361
(Grundlinien-Rolle: erst messen, dann vergleichen) · e2s laufendes „Einbacken" (Sprach-/Pro-Modul
wandert von inerter Begleitdatei in die Produktdatei selbst)

---

## 1 · Warum eine Grundlinie, keine Abnahme

Die Sprachfrage — sieht eine Bürgerin ihr englisches Depot in der Lese-App auf Deutsch? — ist HEUTE
gar nicht beantwortbar: es gibt kein englisches Depot, nur viermal dasselbe (U2-ADR-372 gemessen).
Würde erst NACH e2s Einbacken gemessen und ein Bruch gefunden, ließe sich nicht sagen, ob das
Einbacken ihn verursacht hat oder ob er immer schon da war. Diese Probe hält darum fest, was HEUTE
ist, in vergleichbarer, maschinenlesbarer Form (`tests/fixtures/u2-adr-385-lese-issuer-grundlinie.json`)
— der Unterschied zwischen diesem Lauf und einem zweiten, nach dem Einbacken, ist der eigentliche
Befund.

## 2 · Der Befund im Quelltext, vor dem Bau gelesen

`vivodepot-lesen.html#_textsatzModuleAusDepotAnmelden` meldet Sprachmodule ausschließlich aus
`data.textsatzModule` — einem Feld, das **im Depot selbst** mitreist, nicht aus einer separaten
Datei, die die Lese-App lädt. Der Kern befüllt dieses Feld nur, wenn ein Sprachmodul über
`V.modulEinlassen()` tatsächlich eingelassen wurde (`vivodepot.html:23864-23866`,
`textsatzModulEinbetten`). Da die vier Produkte ihr Sprach-/Pro-Modul heute als inerte Begleitdatei
tragen (nie automatisch eingelassen — derselbe Befund wie U2-ADR-372), bleibt `data.textsatzModule`
in allen vieren leer. Die Lese-App bekäme darum von KEINEM der vier Produkte ein fremdsprachiges
Modul mitgeliefert — unabhängig vom nominellen Namen des Produkts.

## 3 · Der echte Weg, nicht der Code-Pfad

Je Produkt: `oeffneApp`/`depotAnlegen` (Menschenweg, keine Vorregistrierung), Befüllung mit dem
v515-Testdepot-Inhalt (dieselbe Fixture wie `tests/v515-testdepot.test.js`, nur die Inhaltsfelder
— nicht `textsatzModule`/`schemaVersion`, die gehören dem heutigen Kern), echtes Sichern über
`depotPersistieren` (dieselbe FSA-Attrappe wie in der gesamten U2-ADR-321/372/381-Familie). Die
entstandene, echte `.vivodepot`-Datei wird der Lese-App über ihr **echtes Datei-Feld**
(`#datei-input`) gegeben — dieselbe Handlung wie eine Bürgerin, die ihre Datei öffnet. Kein
`page.evaluate`, das ein Depot-Objekt direkt hineinschiebt.

## 4 · Ergebnis

Alle vier Produkte (privat-de, privat-en, pro-de, pro-en) liefern heute ein **identisches**
Ergebnis: Depot öffnet, 104 Felder übernommen, `textsatzModuleImExport: 0` bei allen vieren,
gerenderter Inhalt in der Lese-App byte-identisch (deutsch), sogar `document.documentElement.lang`
der laufenden Produkt-App selbst zeigt bei allen vieren `de-DE` — auch beim nominell englischen
Produkt. Das ist die ERWARTETE, nicht die überraschende Aussage: die vier Produkte sind heute beim
echten Öffnen nicht unterscheidbar, und das gilt jetzt nachweislich auch für den Weg über die
Lese-App, nicht nur für das Depot selbst.

## 5 · VC-Issuer liest kein Bürger-Depot

Der komplette Workflow des Issuers (`tests/e2e/08-vc-issuer.spec.js`) dreht sich um Institutions-/
Anbieter-Zertifikate — Schlüssel, Anbieter-Angaben, Modul-Umschläge. Kein `<input type="file">`
in `vivodepot-vc-issuer.html` trägt `.vivodepot` in seinem `accept`-Attribut (geprüft als
Rot-Beweis, nicht nur behauptet). Die „Rückrichtung" aus dem Auftrag (erzeugt eine App etwas, das
zurück ins Depot geht und den Weg übersteht) entfällt für den Issuer strukturell — er ist ein
Institutions-Onboarding-Werkzeug, kein Konsument von Bürger-Depots.

## 6 · Nächster Schritt (nicht Teil dieses Zugs)

Sobald e2s Einbacken landet, denselben Lauf erneut fahren und gegen
`tests/fixtures/u2-adr-385-lese-issuer-grundlinie.json` halten. Weicht `textsatzModuleImExport`
beim englischen Produkt dann von 0 ab, aber die Lese-App zeigt trotzdem deutschen Inhalt (oder
gar keinen), ist GENAU DAS der Bruch, den diese Grundlinie vorbereitet hat, ihn benennbar zu
machen — Bauauftrag für jemand anderen, nicht diesen Zug.
