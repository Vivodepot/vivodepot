# Vivodepot

Vivodepot ist ein verschlüsseltes Dokumentendepot für das eigene Leben — Identität, Gesundheit,
Finanzen, Vorsorge und mehr, an einem Ort, unter der eigenen Kontrolle. Die Anwendung ist eine
einzelne HTML-Datei, die vollständig im Browser läuft.

## Für wen

Für Bürgerinnen und Bürger, die ihre eigenen Unterlagen und Erklärungen an einem Ort halten
wollen — ohne dass ein Anbieter mitliest. Für Institutionen und Entwicklerinnen, die eigene
Themenbereiche andocken wollen: der Kern kennt kein einzelnes Thema, Module tragen den Inhalt.

## Was es kostet

Für Bürgerinnen und Bürger ist Vivodepot kostenlos.

## Wie es funktioniert

- **Offline.** Die Depot-Datei liegt bei der Nutzerin, verschlüsselt. Kein Server hält sie, keine
  Cloud sichert sie im Hintergrund.
- **Kein Konto, kein App-Store, kein Login.** Nichts steht zwischen der Nutzerin und ihrer Datei.
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

## Lizenz

[EUPL-1.2](LICENSE). Details zur Lizenzierung der Vorlagen-Schicht in [`LICENSING.md`](LICENSING.md).

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

Fassung v799.
