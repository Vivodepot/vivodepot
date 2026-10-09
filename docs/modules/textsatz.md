# Language module (`textsatz`)

**What it carries:** the interface texts of one language, as identifier → text, plus optional
formatting rules (date format, decimal and thousands separator, currency, writing direction).

**Schema:** [`docs/textsatz-modul/textsatz-modul-schema.json`](../textsatz-modul/textsatz-modul-schema.json)
· **Example:** [`examples/textsatz.example.json`](examples/textsatz.example.json)

## Required fields

| Field | Meaning |
|---|---|
| `sprache` | Language code, for example `nl` or `pt-BR` (BCP 47 form recommended). |
| `moduleVersion` | Integer from 1. |
| `texte` | Identifier → text, as plain text. A text with markup, a character reference or a straight `"` is dropped and named (`kein-reiner-text`). |

Optional: `rechtsraum` (the legal system the texts are meant for) and `regeln`. Of the rules,
`schreibrichtung` (`ltr`/`rtl`) and `sprachkennung` set `dir` and `lang` of the page.
`datumsformat` (one of `TT.MM.JJJJ`, `JJJJ-MM-TT`, `MM/TT/JJJJ`, `TT/MM/JJJJ`), `dezimaltrenner`,
`tausendertrenner` and `waehrung` (three capital letters) are checked and stored; the interface
does not apply them yet.

## Where the identifiers come from

Start from a complete module and translate its texts:
[`tools/textsatz-en-modul.json`](../../tools/textsatz-en-modul.json) is the English module with
every identifier the app uses. It is built by `tools/textsatz-en-modul-erzeugen.js` from the data
files next to it. An identifier the app does not know is dropped and named (`unbekannt`).

## Rules the app enforces

- The language code `de` is reserved in every product. German comes with the German products and
  cannot be replaced through the general route.
- Texts that carry a **legal assurance** are not taken from an unsigned module. They stay in the
  product's own wording. For German and English, the wording comes only from the product. For other
  languages, translating them needs a module signed by an auditor whose certificate
  covers this language; the signature also covers a checksum of the original sentences that were
  reviewed (see [`../VERIFYING-SIGNATURES.md`](../VERIFYING-SIGNATURES.md)).
- **Protected statements** (for example liability notices) are never taken from a module from
  outside, signed or not. They come only from the product.
- A module that loses some texts on the way in is taken in, and the loss is named.

## Check and take in

`node tools/modul-ohne-signatur-erzeugen.js --pruefen <file>`, then see the README,
[“Take in”](README.md#3--take-in).
