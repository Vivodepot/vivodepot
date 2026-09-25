# Quickstart

*Deutsch: [`QUICKSTART.md`](QUICKSTART.md)*

## 1. Open

Open [https://privat-en.vivodepot.org/](https://privat-en.vivodepot.org/) (German:
[https://privat-de.vivodepot.org/](https://privat-de.vivodepot.org/)) in any current browser — no
installation. Optionally add it to your home screen or install it from the browser menu; then it also
works offline.

On iPhone and iPad, use the web address: iOS shows a downloaded HTML file only as a preview.

## 2. Create a depot

On first start, set a password. The password encrypts the depot — without it there is no access, not
even for Vivodepot itself.

## 3. Save

After entering the first details, save (download) the depot file and keep it somewhere you will find
it again — a USB stick, an encrypted folder, a cloud of your choice. Vivodepot itself stores nothing
anywhere; that is up to you.

## Or: build your own file from the source

The `vivodepot.html` in the repository is the scaffold without language and area modules; opened on
its own it shows only the word mark. The complete single file is built with one command (Node.js is
enough, no `npm install`):

```
git clone https://github.com/vivodepot/vivodepot.git
cd vivodepot
node tools/vier-produkte-erzeugen.js
```

The finished application is then at `produkte/privat-en/vivodepot.html` (German:
`produkte/privat-de/vivodepot.html`). Open this file in a browser by double-clicking it — no server,
no internet connection needed. Details are in [`DEVELOPING.md`](DEVELOPING.md).

## Next

- [`README_en.md`](README_en.md) — what Vivodepot is and who it is for
- [`SECURITY.md`](SECURITY.md) — how to verify that the file really is encrypted
- [`DEVELOPING.md`](DEVELOPING.md) — build, test, run your own copy
- [`docs/adr/`](docs/adr/) — why it is built the way it is
