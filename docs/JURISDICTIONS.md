# JURISDICTIONS.md — Adapting Vivodepot to another country or language

**Audience:** anyone who wants Vivodepot for a legal system or language other than the German and
English products that exist today. This page is the map. How to build each piece is in
[`docs/modules/`](modules/README.md).

**Principle:** enable, don't deliver ([`PRINCIPLES.md`](../PRINCIPLES.md)). The project does not
write content for every country. It makes it possible for others to do so, in their own
repository, without forking the core.

---

## The framework carries no country and no language

The core (`vivodepot.html`) is a framework without content. A product is the framework plus
modules, built in when the product is built:

| Product | Language | Legal system |
|---|---|---|
| `privat-de`, `pro-de` | German | Germany |
| `privat-en`, `pro-en` | English | Germany |

Check: `grep -n "slug: '" tools/lib/vier-produkte.js`. All four products use the German legal
system. The English products translate the interface. They do not adapt the law.

German itself is a language module (decision record U2-ADR-428), and Germany's legal system is a
legal system module ([`tools/rechtsraum-de-modul.json`](../tools/rechtsraum-de-modul.json)). The
codes `de` and `DE` are reserved for them, and a few German assumptions remain in the core (listed
below). Apart from that, what a German product has, another product can have through the same
mechanism.

## What a new country or language needs

| Piece | Module | State today |
|---|---|---|
| Legal substance of the documents (wording, form, deadlines) | `rechtsraum` — [modules/rechtsraum.md](modules/rechtsraum.md) | **Mechanism proven, no foreign law shipped.** Rules switch with a loaded module and the change is reversible byte for byte (U2-ADR-309). Real content for another country has to be researched and written. |
| Interface language, including field labels and help texts | `textsatz` — [modules/textsatz.md](modules/textsatz.md) | **Ready (built into a product).** One module carries all texts of the app. The English module ([`tools/textsatz-en-modul.json`](../tools/textsatz-en-modul.json)) is a complete model to translate from. |
| Responsible offices per field | `stellensatz` — [schema](stellensatz-modul/stellensatz-modul-schema.json) | Mechanism exists. |
| Areas of life and sectors | `bereich` — [modules/bereich.md](modules/bereich.md) | Ready. |
| Sheets for relatives | `angehoerigenVorlage` — [modules/vorlage.md](modules/vorlage.md) | Ready. |
| Import and export formats of that country | `format` — [schema](format-modul/format-modul-schema.json), [INTEGRATION.md](INTEGRATION.md) | Ready for formats that can be described as field mappings: reads JSON, XML, CSV, SD-JWT and vCard, writes JSON and XML. |
| Look and institution branding | [modules/erscheinungsbild.md](modules/erscheinungsbild.md), [modules/branding.md](modules/branding.md) | Ready; branding signed only. |

## Known German assumptions outside the modules

These are in the core and not yet carried by a module:

- **Country code in the identity credential.** The SD-JWT VC identity export writes
  `country_code: 'DE'` as a fixed value (`grep -n "country_code" vivodepot.html`). It does not
  follow the legal system.
- **Language fallback.** The page starts as `lang="de"`, and without a language module the built-in
  language tag is `de-DE` (`grep -n "TEXTSATZ_REGELN_EINGEBAUT" vivodepot.html`).
- **Date format.** Dates in the interface are always shown as `TT.MM.JJJJ`
  (`grep -n "function _datumDeutsch" vivodepot.html`).
- **Date, number and currency rules.** A language module can state `datumsformat`,
  `dezimaltrenner`, `tausendertrenner` and `waehrung` in its `regeln`; they are checked and stored,
  but the interface does not apply them yet.
- **Currency in the tax data import.** The ELSTER import adds `EUR` to an amount whose file states
  no currency (`grep -n "' EUR'" vivodepot.html`).

Translation is not adaptation. A translated help text can still describe German institutions
(for example the role of a notary). Pairing a legal system module with matching texts is the
author's work. The app selects texts by language and legal system, but it does not check their
content.

## Where to start

1. **Legal substance:** write a `rechtsraum` module for your country against its schema and check
   it with `node tools/modul-ohne-signatur-erzeugen.js --pruefen <file>`. `DE` is reserved; use your own code.
2. **Language:** translate `tools/textsatz-en-modul.json` into your language as a `textsatz`
   module. Texts carrying a legal assurance stay in the product's wording unless an auditor signs
   your translation ([modules/textsatz.md](modules/textsatz.md)).
3. **Using them:** a signed module is listed as verified, an unsigned one as unsigned. Adding
   modules through the interface is switched off at the moment; see
   [modules/README.md](modules/README.md#3--take-in).
4. **A product of your own:** `node tools/vier-produkte-erzeugen.js` builds the four products from
   the framework and the modules listed in `tools/lib/vier-produkte.js`. A product of your own
   means changing that list. See [`DEVELOPING.md`](../DEVELOPING.md).

## Open questions

Who receives a certificate to sign modules is a business decision. The code does not make it
(U2-ADR-181). Ask at the address in [`LICENSING.md`](../LICENSING.md) if you want to publish
signed modules.
