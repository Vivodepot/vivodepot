# Legal system module (`rechtsraum`)

**What it carries:** the legal substance of the documents a person can create (power of attorney,
living will, will and others) for one legal system: wording, form requirements, deadline and
precedence rules, and a purpose tag that matches instruments across legal systems.

**Schema:** [`docs/rechtsraum-modul/rechtsraum-modul-schema.json`](../rechtsraum-modul/rechtsraum-modul-schema.json)
· **Example:** [`examples/rechtsraum.example.json`](examples/rechtsraum.example.json) (an
invented legal system `XA`, no real law).

## Required fields

| Field | Meaning |
|---|---|
| `rechtsraum` | Your legal system code, for example `FR` or `EC`. Upper and lower case are treated as the same. |
| `moduleVersion` | Integer from 1. A higher version replaces the stored one; an equal or lower one changes nothing. |
| `typen` | One entry per instrument, each with at least `katalogVersion`. |
| `sprache` | Language of the wording (BCP 47, for example `fr`, `de-AT`). Required as soon as any entry carries a non-empty `wortlaut`. |

Per instrument you can give `wortlaut` (wording, or `null`), `formvorschriften`, `fristenVorrang`
and `zweck` (for example `gesundheitssorge`, `vermoegenssorge`, `nachlass`). The schema also
describes `bauplan`; the app does not use it yet.

## Rules the app enforces

- **Known instruments** use the keys the app knows: `enduring-power-of-attorney`,
  `custodianship-declaration`, `living-will`, `ki-verfuegung`, `will`,
  `spousal-emergency-representation`. Content for a known key is added under *your* code and
  conflicts with no other legal system.
- **New instruments** must start with `tpl_`. Any other unknown key is dropped and named, while
  the rest of the module stays.
- **`DE` is reserved.** No module taken in through the general route may call itself `DE`, in any
  spelling. A foreign module must not be able to pass itself off as the official German legal
  system. Germany's own module ships with the German products. It is a public file you can read as
  a model: [`tools/rechtsraum-de-modul.json`](../../tools/rechtsraum-de-modul.json).

## What a second country has to supply

The mechanism has been proven with test material: rules switch with a loaded module, and taking
it out restores the previous state byte for byte (decision record U2-ADR-309; structural check
with a `GB` test fixture in `tests/a481-rechtsraum-gb-beleg.test.js`). No real foreign law ships
with the project. A country module has to bring the substance itself, researched for that
country: which instruments exist, their form requirements, deadlines and wording. A legal system
module does not translate the interface. Language is a separate axis ([textsatz.md](textsatz.md)).

## Check and take in

`node tools/modul-ohne-signatur-erzeugen.js --pruefen <file>`, then see the README,
[“Take in”](README.md#3--take-in).
