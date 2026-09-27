# Developing Vivodepot

This guide is for someone who does not know the project yet and wants to build, test and run
Vivodepot from source. Users who only want to use the application start with
[`QUICKSTART_en.md`](QUICKSTART_en.md).

## Prerequisites

- **Node.js 24** (at least 22: `npm test` passes glob patterns to `node --test`, which Node 20 does not resolve). This
  is the version the CI workflows use (`.github/workflows/e2e.yml`, `node-version: '24'`); `package.json` declares
  `"engines": { "node": ">=22" }`.
- **git**, to clone the repository.
- For the browser tests only: the Playwright browser, installed with one command (see below).

Building the application needs nothing beyond Node.js — no `npm install`.

## The scaffold and the product

The file `vivodepot.html` in the repository root is the **scaffold** (Gerüst): the core logic, the
cryptography and the rendering, but no language texts and no subject areas. Those come as modules.
Opened on its own, the scaffold shows only the word mark.

The runnable application is the **product**: the scaffold with its modules baked in, as one
self-contained HTML file. Four products are built from the same scaffold:

| Product | Language | Path after building |
|---|---|---|
| privat-de | German | `produkte/privat-de/vivodepot.html` |
| privat-en | English | `produkte/privat-en/vivodepot.html` |
| pro-de | German | `produkte/pro-de/vivodepot.html` |
| pro-en | English | `produkte/pro-en/vivodepot.html` |

## Build

```
git clone https://github.com/vivodepot/vivodepot.git
cd vivodepot
node tools/vier-produkte-erzeugen.js
```

The four products are written to `produkte/` (ignored by git). `--ziel <folder>` writes them
elsewhere. Which modules go into which product is defined in `tools/lib/vier-produkte.js`.

## Open the application locally

Open `produkte/privat-en/vivodepot.html` in a current browser, e.g. by double-clicking it. It runs
entirely from the file — no server, no network connection. On first start it asks for a password and
creates an encrypted depot, which you save as your own file.

## Run your own copy on a web server

Put `produkte/privat-en/vivodepot.html` (or another product) on any static web server, preferably
over HTTPS, and open its address. The file needs nothing next to it: the manifest and the icons are
embedded.

A locally built product does not register a service worker (its file set is `vivodepot.html`
only, see `PRODUKT_DATEISATZ` in `tools/produkt-konfektionieren.js`). A self-hosted copy therefore works
while online; for offline use, open the downloaded file directly. The official addresses
[https://privat-en.vivodepot.org/](https://privat-en.vivodepot.org/) and
[https://privat-de.vivodepot.org/](https://privat-de.vivodepot.org/) ship a service worker (`sw.js`)
and also work offline once installed.

## Tests

Install the development dependencies once:

```
npm ci
```

| Command | What it runs |
|---|---|
| `npm test` | the Node tests (`node --test`) over `tests/**/*.test.js` and `tools/**/*.test.js` — offline, no browser |
| `npm run test:e2e:install` | once: downloads the Chromium browser for Playwright |
| `npm run test:e2e` | the browser journeys (Playwright, Chromium), including accessibility scans |
| `npm run test:konformitaet` | conformity checks: cryptographic test vectors (incl. Wycheproof for Ed25519), the offline guarantee, key handling, accessibility (axe) |

### Tests that run only in the private repository

This public repository is cut from a private one. Measured on 25.09.2026, by running `npm test` against the public cut
and looking at every red test file on its own:

- **112 test files** are not published. Each one reads a file that is not published either; the measurement records
  the missing file and the error line per test file (in the private repository).
- **40 test files** are published, but some of their tests are skipped here, with the reason in the test output. They
  read the git history of the private repository, or measure its complete file set against a baseline. The files, the
  skipped tests and the two reasons are listed in [`tests/helfer/nur-privat.js`](tests/helfer/nur-privat.js).

In the private repository all of them run; a test there fails if any of them would be skipped.

A single test file: `node --test tests/<file>.test.js`. More on the browser tests:
[`docs/e2e-anleitung.md`](docs/e2e-anleitung.md) (German). Some probes are not published because they
name internal processes or use withheld test data; [`docs/pruefebene.md`](docs/pruefebene.md) (German)
explains which and why.

## Repository layout

| Path | Contents |
|---|---|
| `vivodepot.html` | the scaffold (see above); its checksum is in `vivodepot.html.sha256`, its SBOM in `vivodepot.sbom.cdx.json` |
| `vivodepot-lesen.html` | the reader app: opens a depot read-only, for recipients |
| `vivodepot-vc-issuer.html` | the issuer for verifiable credentials and signed modules |
| `vivodepot-schluessel-teilen.html` | splits a key into shares |
| `vivodepot-krypto-kern-PORT-VERBATIM.js` | the cryptographic core, byte-identical in every app |
| `tools/` | build and check tools, including `vier-produkte-erzeugen.js` |
| `tests/` | the Node tests and the Playwright journeys (`tests/e2e/`) |
| `bereiche/`, `code-listen/` | the field catalogue and the code lists |
| `docs/adr/` | the architecture decisions, one file each |
| `docs/` | further documentation |
| `.github/` | CI workflows and issue templates |

## Where to read on

- [`DOCS.md`](DOCS.md) — the index of all documents
- [`docs/adr/`](docs/adr/) — why it is built the way it is
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to contribute
- [`SECURITY.md`](SECURITY.md) — reporting vulnerabilities, verifying the cryptographic chain
- [`PRINCIPLES.md`](PRINCIPLES.md) — the principles every contribution is measured against
