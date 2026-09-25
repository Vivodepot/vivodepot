# Vivodepot

Vivodepot is an encrypted document depot for one's own life — identity, health, finances,
provisions and more, in one place, under one's own control. The application is a single HTML
file that runs entirely in the browser.

## For whom

For citizens who want to keep their own documents and declarations in one place — without a
provider reading along. For institutions and developers who want to dock their own subject
areas: the core knows no single subject, modules carry the content.

## What it costs

For citizens, Vivodepot is free of charge.

## How it works

- **Offline.** The depot file stays with the user, encrypted. No server holds it, no cloud backs
  it up in the background.
- **No account, no app store, no login.** Nothing stands between the user and her file.
- **EUPL-1.2.** Open source, under European law.
- **Five years of security updates per version**, from the day it is released; every update stays
  retrievable for at least ten years after that (see [`SECURITY.md`](SECURITY.md)).

## How to get started

Open [https://privat-en.vivodepot.org/](https://privat-en.vivodepot.org/) (German:
[https://privat-de.vivodepot.org/](https://privat-de.vivodepot.org/)) in any current browser — no
installation, no registration. Optionally add it to your home screen or install it; then it also works
offline. On first start the application creates a new, password-protected depot and stores it as its
own file. Step by step: [`QUICKSTART_en.md`](QUICKSTART_en.md).

To build your own single file from this repository, run `node tools/vier-produkte-erzeugen.js` and
open `produkte/privat-en/vivodepot.html` — the `vivodepot.html` in the root is the scaffold without
language and area modules. Building, testing and running your own copy:
[`DEVELOPING.md`](DEVELOPING.md).

Most of the test layer is included: probes in `tests/`, tooling in `tools/`, workflows in
`.github/`. Probes that name internal processes or withheld test data stay out;
[`docs/pruefebene.md`](docs/pruefebene.md) (German) describes how testing works and by which rule
a file is published.

## How to check that it holds what it says

Every figure in [`STANDARDS.md`](STANDARDS.md) comes from
[`docs/faktenbasis.md`](docs/faktenbasis.md) — a file that `tools/faktenbasis-erzeugen.js`
generates mechanically from the loaded core and the ADR record, not maintained by hand. The test
layer itself — how testing works, how many Node probes and browser journeys, which guards and
which limits — is described openly in [`docs/pruefebene.md`](docs/pruefebene.md). `vivodepot.html` is a single file and can be read directly; the
checksum ([`vivodepot.html.sha256`](vivodepot.html.sha256)) and the
[SBOM](vivodepot.sbom.cdx.json) are included. Architecture decisions are individually traceable
under [`docs/adr/`](docs/adr/).

## License

[EUPL-1.2](LICENSE). Details on the licensing of the template layer in
[`LICENSING.md`](LICENSING.md).

## Where to go from here

- [`PRINCIPLES.md`](PRINCIPLES.md) — the principles every contribution is measured against
- [`SECURITY.md`](SECURITY.md) — security reports, verification of the cryptographic chain
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to contribute
- [`docs/adr/`](docs/adr/) — the individual architecture decisions
- [`docs/pruefebene.md`](docs/pruefebene.md) — how testing works, and what isn't shipped publicly (German)
- [`docs/JURISDICTIONS.md`](docs/JURISDICTIONS.md) — localizing Vivodepot for a jurisdiction or
  language other than Germany/German: a map of what exists, what doesn't, and where the
  boundaries are

---
*This is a translation. The German original ([`README.md`](README.md)) governs in case of doubt.*

## Version

Version v799.
