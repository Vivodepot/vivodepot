# Area module (`bereich`)

**What it carries:** one or more areas of life or sectors (for example *allotment garden* or
*pension*): a heading, an icon, sections with fields, and the export routes of the area.

**Schema:** [`docs/bereich-modul/bereich-modul-schema.json`](../bereich-modul/bereich-modul-schema.json)
· **Example:** [`examples/bereich.example.json`](examples/bereich.example.json)

## Required fields

| Field | Meaning |
|---|---|
| `moduleVersion` | Integer from 1. |
| `herkunft` | Who publishes the module (your identifier). It also identifies the module when a newer version replaces it. |
| `bereiche` | Area identifier → area. Identifiers start with a lower-case letter, 2 to 40 characters (`a–z`, `A–Z`, `0–9`, `-`). |
| `sprache` | Required as soon as an area carries its own heading (`label`). Without it, headings come from the language module. |

Optional per area: `label`, `icon` (a built-in icon name; unknown names become `folder`),
`sektionen` (each with `id`, `label`, `hint`, `felder`), `exporte`, `wizards`, `einfuehrungstext`,
`merkmale`, `rollen` and others listed in the schema. Every text is plain text.

## Rules the app enforces

- An area whose identifier the product already uses is dropped (`reserviert`). A module cannot
  redefine an area the product brought with it.
- An area without a heading (neither inline nor in the language module) is dropped (`kein-label`).
- Unknown features (`merkmal`) or roles (`rolle`) are dropped one by one. The rest stays.
- Two modules from the same publisher need their own `kennung` each; otherwise the newer version
  replaces the older one.

## Working examples in the repository

- [`tools/behandlungsweg-bereich-modul.json`](../../tools/behandlungsweg-bereich-modul.json), built
  by `tools/behandlungsweg-modul-erzeugen.js`;
- [`tools/buergermodul/vd-privat.json`](../../tools/buergermodul/vd-privat.json), the thirteen
  areas of the private product, built by `tools/buergermodul-erzeugen.js`.

## Check and take in

`node tools/modul-ohne-signatur-erzeugen.js --pruefen <file>`, then see the README,
[“Take in”](README.md#3--take-in).
