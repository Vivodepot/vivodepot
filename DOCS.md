# Wegweiser zur Dokumentation

**Diese Datei wird erzeugt** (`node tools/docs-md-erzeugen.js`) — nicht von Hand bearbeiten,
eine Handänderung geht beim nächsten Lauf verloren. Der Architektur-/Migrationsabschnitt unten
kommt unverändert aus einem Rahmentext, der mit dem Erzeuger gepflegt wird.

Erzeugt aus der veröffentlichten Fassung v952.

---

## Aufbau

Vivodepot besteht aus drei Schichten, die ein **Rezept** zu einem ausgelieferten Produkt
zusammensetzt:

**Gerüst.** Die Kern-Anwendung (`vivodepot.html`) — Layout, Verschlüsselung, Export-/
Import-Formate, die 14 Lebensbereiche einer Bürgerin. Läuft offline,
ohne Server, eine einzige Datei.

**Module.** Signierte, andockbare Bausteine, die der Kern zur Laufzeit oder beim
Konfektionieren einliest: Sprachmodule (z. B. Englisch), Rechtsraum-Module, Bereichs-Module,
Logikmodule (Berufs-/Branchenwissen, z. B. für Vivodepot Pro), Vorlagen. Jedes Modul prüft
sich selbst gegen dieselben Regeln wie ein eingebauter Bestandteil — ein Modul bekommt keine
Fähigkeit, die ein natives Feld nicht auch hätte.

**Templates.** Einzelne, fachlich abgegrenzte Themen-Bausteine (`modulTyp: bereich`), die ein
Produkt zusätzlich zu seinen nativen Bereichen mitbringen kann — z. B. die berufsspezifischen
Zusatzthemen von Vivodepot Pro. Ein Template ist strukturell ein Modul, nur mit fachlichem
statt technischem Zuschnitt. (Bewusst ohne Anzahl oder Liste: die Pro-Themen ändern sich
mit dem laufenden Umbau.)

**Rezept.** Was ein bestelltes Produkt tatsächlich bekommt, steht in einem signierten Rezept
(pro Produkt-Slug, z. B. `pro-de`) — Kern-Stand, Sprachmodul, Rechtsraum-Modul, die Liste der
Bereichs-/Logikmodule und Templates, jede mit eigener Prüfsumme. Ein Cloudflare-Worker
(`vivodepot-download-gateway`) prüft die Signaturkette (Anker → Ausgabestelle → Rezept) und
baut das Produkt daraus — kein Commit und kein Deploy für ein neues Produkt, nur ein neues
signiertes Rezept. **In Betrieb** (Stand 18.10.2026): der Worker liefert die Privat-Produkte
aus, und die Rezepte der Produkte sind signiert. Der Bestellweg für Pro (Zahlung → Bestellung →
Token) ist gebaut; seine Inbetriebnahme läuft.

**Wo das heute steht (Stand 18.09.2026):**

- Ein Bereich trägt diesen Weg bereits vollständig: er wurde am 09.09.2026 (damals unter der
  Kennung `wohnen`, seit einer Kennungs-Umstellung im Kern als `housing` geführt) aus dem
  festen Kern-Bündel gelöst und liegt seither als eingebaute Quelle im Gerüst selbst — außer-
  halb der Ab-Werk-Regionen, damit ein Produktbau ihn nicht unbemerkt verlieren kann.
- Die übrigen nativen Bereiche liegen weiterhin fest im Kern-Bündel (`BUERGERMODUL_BUENDEL`) —
  der Umbau, der sie ebenfalls auf den Modul-/Template-Weg überführt, ist in Arbeit und noch
  nicht abgeschlossen.
- Das Rezept-/Modul-System selbst arbeitet bereits produktiv: Vivodepot Pro (Deutsch und
  Englisch) bezieht sein Logikmodul, sein Bereichs-Ersatz-Modul und eine Vorlage über genau
  diesen Weg. Vivodepot Privat trägt heute noch kein eigenes Bereichs-/Template-Modul in
  seinem Rezept — auch das ist Teil des laufenden Umbaus, nicht abgeschlossen.

Wer den genauen Stand nachprüfen will: `BEREICH_IDS_EINGEBAUT`/`BEREICH_QUELLEN_EINGEBAUT`
in `vivodepot.html` (die eingebaute Quelle), `BUERGERMODUL_BUENDEL` (das verbleibende Bündel),
`tools/lib/vier-produkte.js`. Die signierten Rezepte selbst liegen nicht im Repository, sondern
auf einer externen Ablage (`rezepte/<slug>.json`/`.jws`); auch der Download-Dienst, der ihre
Prüfkette auswertet, liegt nicht in diesem Repository.

## Durchspielbare Beispiele

Zwei Rezept-/Modul-Kombinationen aus diesem System, als Szenen-Vorführung durchspielbar statt nur
beschrieben — jede zeigt dasselbe Feld-Modell an einem anderen Rezept:

- [Betreuungsverein-Demo (Gerda Mustermann)](https://vivodepot.de/demo/betreuungsverein/de/vivodepot.html?von=github) ([English](https://vivodepot.de/demo/betreuungsverein/en/vivodepot.html?von=github)) — ein Depot unter fremdem Namen ausgegeben (Institution als Rezept-
  Aussteller, s. „Module" oben), mit Vollmacht, Form und Ablageort als eigenen Feldern.
- [Kleingarten-Demo (Bernd Mustermann)](https://vivodepot.de/demo/kleingarten/de/vivodepot.html?von=github) ([English](https://vivodepot.de/demo/kleingarten/en/vivodepot.html?von=github)) — derselbe Bereichs-/Feld-Bestand an einem Depot, das nicht von einer
  Person, sondern von einer Sache handelt (kein natives Rechtssubjekt vorausgesetzt).

Beide mit erfundenen Personen- und Institutionsnamen (Musternamen-Schema, kein echtes
Branding). Adressen und ihr zuletzt gemessener Status: `docs/demo-verweis-ziele.json`.

## Vorabprüfung von Vorlagen und Modulen

Nach welchen Regeln die Bürger-App ein Modul, eine Vorlage oder eine Anfrage annimmt oder abweist, und die Regeln für ein
Einreichungs-Paket stehen lesbar in [`docs/pruefregeln/pruefregeln.md`](docs/pruefregeln/pruefregeln.md) und maschinenlesbar in
[`docs/pruefregeln/pruefregeln.json`](docs/pruefregeln/pruefregeln.json). Eine eigene Datei prüft der Befehl
`node tools/vorlage-pruefen.js --dokument <datei.json>` (nach `npm ci`); für Modul, Vorlage und Anfrage fällen das Urteil
dieselben Prüfer wie beim Einlassen in der App, ein Einreichungs-Paket wird gegen sein veröffentlichtes Schema geprüft und jede
Vorlage darin wie in der App.

---

## Zahlen

- E2E: 874 (gezählt, nicht ausgeführt) · Wächter-Register: 152
- Schema-Version: 94 · SCHALEN_STAND: v952 · Build-Version: v1.0
- ADR-Register: 445 Einträge

Quelle: `docs/faktenbasis.md`, erzeugt 2026-10-25, Commit `(Arbeitsstand, ohne Hash)`. Diese Zahlen veralten mit jedem Commit — vor jeder externen Verwendung gegen den dann aktuellen `docs/faktenbasis.md` gegenlesen, nicht aus diesem Dokument abschreiben.

---

## Dokumente im Wurzelverzeichnis

- [`CHANGELOG.md`](CHANGELOG.md) — Changelog
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — Verhaltenskodex für Mitwirkende
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Mitwirken bei Vivodepot
- [`DEVELOPING.md`](DEVELOPING.md) — Developing Vivodepot
- [`FAQ.md`](FAQ.md) — Vivodepot — häufige Fragen
- [`INTEROPERABILITY.md`](INTEROPERABILITY.md) — Vivodepot — Interoperabilität: was zurückkommt, was nachgewiesen ist, was fehlt
- [`LICENSE`](LICENSE)
- [`LICENSING.md`](LICENSING.md) — Vivodepot — Lizenzpolitik
- [`NOTICE.md`](NOTICE.md) — NOTICE — Vivodepot v1.0
- [`PRINCIPLES.md`](PRINCIPLES.md) — Principles
- [`QUICKSTART_en.md`](QUICKSTART_en.md) — Quickstart
- [`QUICKSTART.md`](QUICKSTART.md) — Schnellstart
- [`README_en.md`](README_en.md) — Vivodepot
- [`README.md`](README.md) — Vivodepot
- [`SECURITY.md`](SECURITY.md) — Vivodepot · Sicherheit
- [`SOVEREIGNTY.md`](SOVEREIGNTY.md) — Vivodepot — Souveränität: woran sie im Code hängt
- [`STANDARDS.md`](STANDARDS.md) — Vivodepot · Standards im Code: Erzeugen und Einlesen
- [`THIRD_PARTY_LICENSES`](THIRD_PARTY_LICENSES)
- [`TRADEMARK.md`](TRADEMARK.md) — Vivodepot — Markenrichtlinie

## Dateien in `docs/`

- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — DATA-MODEL.md — Areas, field IDs and the field register
- [`docs/e2e-anleitung.md`](docs/e2e-anleitung.md) — E2E-Reise-Ebene — Anleitung
- [`docs/faktenbasis.md`](docs/faktenbasis.md) — Faktenbasis — maschinell erzeugt, nicht von Hand gepflegt
- [`docs/fremdquellen.md`](docs/fremdquellen.md) — Fremdquellen-Register
- [`docs/INTEGRATION.md`](docs/INTEGRATION.md) — INTEGRATION.md — Connecting another application to Vivodepot
- [`docs/integrieren.md`](docs/integrieren.md) — integrieren.md — eine andere Anwendung an Vivodepot anbinden
- [`docs/JURISDICTIONS.md`](docs/JURISDICTIONS.md) — JURISDICTIONS.md — Adapting Vivodepot to another country or language
- [`docs/konformitaet-quellen.md`](docs/konformitaet-quellen.md) — Konformitäts-Quellen
- [`docs/pruefebene.md`](docs/pruefebene.md) — Die Prüfebene
- [`docs/pruefstelle-zulassung.md`](docs/pruefstelle-zulassung.md) — Zulassung einer Prüfstelle für Sprachmodule
- [`docs/release-planung.md`](docs/release-planung.md) — Release-Planung
- [`docs/REQUESTS-AND-RESPONSES.md`](docs/REQUESTS-AND-RESPONSES.md) — REQUESTS-AND-RESPONSES.md — Asking a person for data and opening the reply
- [`docs/standards-schnittstelle.md`](docs/standards-schnittstelle.md) — Standards-Register und Prüf-Rahmen
- [`docs/VERIFYING-SIGNATURES.md`](docs/VERIFYING-SIGNATURES.md) — VERIFYING-SIGNATURES.md — How to check a Vivodepot signature yourself

## Unterordner von `docs/`

- `docs/adr/` — 482 Datei(en), siehe [`docs/adr/README.md`](docs/adr/README.md)
- `docs/angehoerigen-vorlage-modul/` — 1 Datei(en)
- `docs/bedingungskatalog-modul/` — 1 Datei(en)
- `docs/bereich-modul/` — 1 Datei(en)
- `docs/blattformat-modul/` — 1 Datei(en)
- `docs/branding-modul/` — 1 Datei(en)
- `docs/cra/` — 3 Datei(en), siehe [`docs/cra/README.md`](docs/cra/README.md)
- `docs/design-modul/` — 2 Datei(en)
- `docs/e2e-cross/` — 1 Datei(en), siehe [`docs/e2e-cross/README.md`](docs/e2e-cross/README.md)
- `docs/ereignis-achse-modul/` — 1 Datei(en)
- `docs/erscheinung-modul/` — 1 Datei(en)
- `docs/feldregister/` — 1 Datei(en)
- `docs/format/` — 42 Datei(en), auch in Unterordnern
- `docs/format-modul/` — 1 Datei(en)
- `docs/grundschutz/` — 1 Datei(en)
- `docs/institutions-art-modul/` — 1 Datei(en)
- `docs/lese-app/` — 1 Datei(en), siehe [`docs/lese-app/README.md`](docs/lese-app/README.md)
- `docs/logik-modul/` — 1 Datei(en)
- `docs/modules/` — 18 Datei(en), auch in Unterordnern, siehe [`docs/modules/README.md`](docs/modules/README.md)
- `docs/pruefregeln/` — 3 Datei(en)
- `docs/rechtsraum-modul/` — 1 Datei(en)
- `docs/screenshots/` — 3 Datei(en)
- `docs/security/` — 1 Datei(en)
- `docs/situation-modul/` — 1 Datei(en)
- `docs/spezifikation/` — 1 Datei(en)
- `docs/stellensatz-modul/` — 1 Datei(en)
- `docs/template-generator/` — 8 Datei(en), siehe [`docs/template-generator/README.md`](docs/template-generator/README.md)
- `docs/textsatz-modul/` — 1 Datei(en)
- `docs/vc-issuer/` — 4 Datei(en), siehe [`docs/vc-issuer/README.md`](docs/vc-issuer/README.md)
- `docs/wizard-modul/` — 1 Datei(en)
