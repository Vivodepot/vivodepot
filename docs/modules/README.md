# Building a module for Vivodepot

**Audience:** anyone who wants to adapt Vivodepot without changing its code: a country, a language,
a sector, an institution's look, a template for relatives. You need a text editor and Node.js 22 or newer.
You do not need to read the core.

Vivodepot is a **framework without content**. Language, legal system, sectors, appearance and
templates arrive as **modules**: JSON files that the app checks against fixed rules and then uses.
A module contains no code. It is data, so it cannot run anything in the person's browser.

---

## The six axes

| Axis | Module type (`modulTyp`) | Page | Unsigned use? |
|---|---|---|---|
| Legal system | `rechtsraum` | [rechtsraum.md](rechtsraum.md) | yes, shown as unsigned |
| Sector / area of life | `bereich` | [bereich.md](bereich.md) | yes, shown as unsigned |
| Language | `textsatz` | [textsatz.md](textsatz.md) | yes, shown as unsigned |
| Branding (name, colours, logo) | `branding` | [branding.md](branding.md) | **no**, signed only |
| Appearance | `erscheinung` (font sizes) · `erscheinungsbild` (full design, built into a product) | [erscheinungsbild.md](erscheinungsbild.md) | `erscheinung`: yes · `erscheinungsbild`: only when a product is built |
| Templates | `angehoerigenVorlage` (sheets for relatives) · provider template (form with fields) | [vorlage.md](vorlage.md) | sheets: yes · provider templates: **no**, signed only |

More module types exist, each with a JSON schema next to it. They use the same mechanism:

| Type | Schema | What it does |
|---|---|---|
| `stellensatz` | [`docs/stellensatz-modul/`](../stellensatz-modul/stellensatz-modul-schema.json) | names the responsible office per field for a legal system |
| `institutionsArt` | [`docs/institutions-art-modul/`](../institutions-art-modul/institutions-art-modul-schema.json) | adds kinds of institutions to choose from |
| `blattformat` | [`docs/blattformat-modul/`](../blattformat-modul/blattformat-modul-schema.json) | sets the paper size of printed sheets |
| `bedingungskatalog` | [`docs/bedingungskatalog-modul/`](../bedingungskatalog-modul/bedingungskatalog-modul-schema.json) | the vocabulary of conditions for sharing |
| `format` | [`docs/format-modul/`](../format-modul/format-modul-schema.json) | an import or export channel to another file format |
| `situation` | [`docs/situation-modul/`](../situation-modul/situation-modul-schema.json) | occasions (situations) with pointers to existing fields |
| `wizard` | [`docs/wizard-modul/`](../wizard-modul/wizard-modul-schema.json) | step-by-step assistants |
| `ereignisAchse` | [`docs/ereignis-achse-modul/`](../ereignis-achse-modul/ereignis-achse-modul-schema.json) | which life events affect which fields |
| `logikModul` | [`docs/logik-modul/`](../logik-modul/logik-modul-schema.json) | a document extract described as data |

`docs/design-modul/design-modul-schema.json` describes design tokens. No admission path uses it
at the moment, so do not build against it.

## The way of a module: build, check, take in

### 1 · Build

Write the JSON by hand against the schema, start from an example in
[`examples/`](examples/), or use one of the builders:

- `node tools/modul-ohne-signatur-erzeugen.js --typ <type> --angaben <your-input.json> --ausgabedatei <module.json>`
  builds an unsigned module from the same input as the Studio's form for that type. Input examples
  for `bereich`, `rechtsraum`, `institutions-art`, `branding` and `angehoerigen-vorlage` are in
  [`angaben/`](angaben/); run the tool without arguments to build all of them as a self-test (nothing is written).
  Types: `bereich`, `rechtsraum`, `institutions-art`, `wizard`, `logikmodul`, `format`, `branding`,
  `angehoerigen-vorlage`. It never signs.
- The Studio (`vivodepot-studio.html`) builds modules of several types in the browser, with
  forms.
- Vivodepot's own modules are built by tools in this repository that you can read as working examples, such as
  `tools/textsatz-en-modul-erzeugen.js` (the English language module) and
  `tools/erscheinungsbild-modul.js` (appearance from a CSS file).

**Leave out the fields the app sets itself:** `ungeprueft`, `eingelassenAm`, `anbieterIdGeprueft`,
`pruefstufe`, `beleg`, `abWerk`. The schemas list some of them because a stored module carries
them. The app sets or ignores these fields itself. You may give `anbieterId` (who you are). It stays as your statement and is marked as
not verified unless a certificate confirms it.

### 2 · Check

```bash
node tools/modul-ohne-signatur-erzeugen.js --pruefen <module.json> [--produkt privat-de|privat-en|pro-de|pro-en]
```

It runs the app's own admission check on your file, as an unsigned module in an empty depot of the
named product (default `privat-de`), and says whether the module would be accepted or why not, and
which parts would be dropped. That includes the rules that depend on the product: reserved codes such
as `DE`, area identifiers the product already uses, and identifiers its language module does not
know. It only checks and never signs. The JSON schemas next to each type describe the same form and
are kept in step with the app's check by tests (`tests/mit-modul/modul-schema-*.test.js`).

### 3 · Take in

There are three ways into the app:

- **Signed.** A module signed under a certificate chain that ends at the Vivodepot trust anchor
  is listed as *verified (role)*, the role coming from the certificate. Vivodepot issues the
  certificates; that is the commercial service. How to verify such a signature yourself:
  [`../VERIFYING-SIGNATURES.md`](../VERIFYING-SIGNATURES.md).
- **Unsigned.** An unsigned module is listed as *unsigned*, and sheets from an unsigned template
  are marked as unverified. It cannot replace content that came with the product.
- **Built into a product.** Whoever builds a product of their own includes modules when the
  product is built; see [`../../DEVELOPING.md`](../../DEVELOPING.md).

**Current state:** in the published app, adding modules through the interface is switched off,
for signed and unsigned modules alike, while the protection work on loading is finished
(`SELBST_EINLASS_GESPERRT` in `vivodepot.html`). Until then, use step 2 to check your module.

## What a module cannot do

- run code or load anything from the network;
- use a reserved code or identifier: the legal system `DE`, the language `de`, or an area
  identifier the product already uses. This holds for signed modules too;
- replace what the product brought with it, unless it is signed;
- change texts that carry a legal assurance, unless an auditor whose certificate covers this
  language has signed it. Protected statements (liability, official wording) only ever come
  from the product;
- appear as verified when it is not.

## Licence

The schemas, examples and builders in this repository are under the EUPL-1.2
([`../../LICENSING.md`](../../LICENSING.md)). A module written from scratch is yours. A module derived
from a file in this repository (for example a translation of the English language module) is a
derivative work under the EUPL-1.2.
