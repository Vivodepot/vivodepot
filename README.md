# Vivodepot

Vivodepot ist ein verschlüsseltes Dokumentendepot für das eigene Leben — Identität, Gesundheit,
Finanzen, Vorsorge und mehr, unter der eigenen Kontrolle. Die Anwendung ist eine
einzelne HTML-Datei, die vollständig im Browser läuft.

## Für wen

Für Bürgerinnen und Bürger, die ihre eigenen Unterlagen und Erklärungen halten
wollen — ohne dass ein Anbieter mitliest. Für Institutionen und Entwicklerinnen, die eigene
Themenbereiche über eigene Vorlagen ergänzen wollen: der Kern kennt kein einzelnes Thema, Module tragen den Inhalt.

## Was es kostet

Für Bürgerinnen und Bürger ist Vivodepot kostenlos.

## Wie es funktioniert

- **Offline.** Die Depot-Datei liegt bei der Nutzerin, verschlüsselt. Kein Server hält sie, keine
  Cloud sichert sie im Hintergrund.
- **Ohne Konto.** Nichts steht zwischen der Nutzerin und ihrer Datei.
- **EUPL-1.2.** Offener Quelltext, europäisches Recht.
- **Fünf Jahre Sicherheitsaktualisierungen je Fassung**, ab dem Tag, an dem sie herauskommt; jede
  Aktualisierung bleibt danach mindestens zehn Jahre abrufbar (s. [`SECURITY.md`](SECURITY.md)).

## Wie man anfängt

[https://privat-de.vivodepot.org/](https://privat-de.vivodepot.org/) (englisch:
[https://privat-en.vivodepot.org/](https://privat-en.vivodepot.org/)) in einem aktuellen Browser öffnen —
keine Installation, keine Registrierung. Wer mag, legt die Seite auf den Startbildschirm oder
installiert sie; dann läuft sie auch offline. Die Anwendung legt beim ersten Start ein neues,
passwortgeschütztes Depot an und speichert es als eigene Datei. Schritt für Schritt:
[`QUICKSTART.md`](QUICKSTART.md).

Eine eigene Einzeldatei aus diesem Repository: `node tools/vier-produkte-erzeugen.js` ausführen und
`produkte/privat-de/vivodepot.html` öffnen — die `vivodepot.html` im Wurzelverzeichnis ist das Gerüst
ohne Sprach- und Bereichsmodule. Bauen, prüfen, selbst betreiben (englisch):
[`DEVELOPING.md`](DEVELOPING.md).

Die Prüfebene liegt zum größten Teil bei: Proben in `tests/`, Werkzeuge in `tools/`, Workflows
in `.github/`. Zurück bleiben Proben, die interne Abläufe oder zurückgehaltene Testdaten nennen;
[`docs/pruefebene.md`](docs/pruefebene.md) beschreibt, wie geprüft wird und nach welcher Regel
eine Datei veröffentlicht wird.

## Wie man prüft, dass es hält, was es sagt

Jede Zahl in [`STANDARDS.md`](STANDARDS.md) stammt aus [`docs/faktenbasis.md`](docs/faktenbasis.md)
— einer Datei, die `tools/faktenbasis-erzeugen.js` mechanisch aus dem geladenen Kern und dem
ADR-Bestand erzeugt, nicht von Hand pflegt. Die Prüfebene selbst — wie geprüft wird, in wie vielen
Node-Proben und Browser-Reisen, mit welchen Wächtern und welchen Grenzen — ist in
[`docs/pruefebene.md`](docs/pruefebene.md) offen beschrieben. `vivodepot.html` selbst ist eine
einzige Datei und lässt sich lesen; die
Prüfsumme ([`vivodepot.html.sha256`](vivodepot.html.sha256)) und die
[SBOM](vivodepot.sbom.cdx.json) liegen bei. Architekturentscheidungen stehen einzeln
nachvollziehbar unter [`docs/adr/`](docs/adr/).

## Entstehung mit KI-Assistenz

Code, Tests und Dokumentation von Vivodepot entstehen mit KI-Assistenten. Anforderungen, Architektur und Entscheidungen legt die Vivodepot GmbH fest; die Entscheidungen stehen als ADRs unter `docs/adr/`.

Verantwortung, Prüfung und Freigabe jeder Änderung liegen bei der Vivodepot GmbH.

## Lizenz

[EUPL-1.2](LICENSE). Was das heißt, was ausgenommen ist und was heute öffentlich liegt: [`LICENSING.md`](LICENSING.md).

## LOINC

This material contains content from LOINC (http://loinc.org). LOINC is copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee and is available at no cost under the license at http://loinc.org/license. LOINC® is a registered United States trademark of Regenstrief Institute, Inc.

## SNOMED CT

Contains content from the SNOMED CT Global Patient Set (GPS), © 2026 SNOMED International, licensed under the Creative Commons Attribution-NoDerivatives 4.0 International License (https://creativecommons.org/licenses/by-nd/4.0/), obtained from https://www.snomed.org/gps, International Edition 20260101. SNOMED® and SNOMED CT® are registered trademarks of the International Health Terminology Standards Development Organisation. SNOMED CT® was originally created by the College of American Pathologists.

## Wo es weitergeht

- [`PRINCIPLES.md`](PRINCIPLES.md) — die Grundsätze, an denen jeder Beitrag gemessen wird
- [`SECURITY.md`](SECURITY.md) — Sicherheitsmeldungen, Verifikation der kryptografischen Kette
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — wie man beiträgt
- [`docs/adr/`](docs/adr/) — die einzelnen Architekturentscheidungen
- [`docs/pruefebene.md`](docs/pruefebene.md) — wie geprüft wird, und was öffentlich nicht mitkommt
- [`docs/JURISDICTIONS.md`](docs/JURISDICTIONS.md) — Vivodepot für einen anderen Rechtsraum oder
  eine andere Sprache anpassen: eine Karte dessen, was es gibt, was es nicht gibt und wo die
  Grenzen liegen (englisch)

## Stand

Fassung v918.
