# DATA-MODEL.md — Areas, field IDs and the field register

**Audience:** developers who name depot fields from outside, in a request, a format module or a template.
Start with [`INTEGRATION.md`](INTEGRATION.md); this page covers only the names. German version:
[`integrieren.md`](integrieren.md), section 9.

## 1 · Areas

A depot is divided into areas. The built-in areas have fixed ASCII identifiers, such as `identity`, `finance` or
`housing`. A module can add areas but cannot redefine an area that the running product already brings. The current list is in the core
(check: `grep -n "const BEREICH_IDS_EINGEBAUT" -A4 vivodepot.html`).

## 2 · Field IDs

A field is named `<area>.<field>`, for example `identity.givenName`. The ID is ASCII and is never translated. What the
field means is given in its labels, one per language (`label: { de, en }`).

**An ID always means the same thing.** It is never removed from the register. It can only be retired, with a successor where one exists. Each ID has one of three statuses:

| Status | Meaning |
|---|---|
| `permanent` | valid; the default |
| `deprecated` | still valid but no longer recommended; a successor may be named |
| `obsoleted` | replaced; a successor is required |

Basis: [`U2-ADR-409`](adr/vivodepot-U2-ADR-409-feldregister-vorschlaege-von-aussen-2026-09-13.md), points 1, 6 and 10.

**A request cannot invent a field.** Fields come from the core or from a module that is part of the depot. A request
that names an ID the depot does not know gets it reported back as unknown, and the reply is then marked incomplete. If you need a field that does not exist, propose it; the
ADR above describes how proposals are submitted. A template's own fields carry the reserved prefix `tpl_`, so they cannot
collide with the built-in field names.

## 3 · The field register

The register is public and can be read without an account:

| Address | Content |
|---|---|
| `https://register.vivodepot.de/feldregister.json` | all field IDs |
| `https://register.vivodepot.de/feldregister.json.sha256` | its checksum |
| `https://register.vivodepot.de/index.json` | index of all registers, with checksums and the version they were built from |

Each entry carries `kennung`, `bereich`, `status` and `label`. The field `fassung` names the core version the register
was built from, and `anzahl` gives the number of entries. Read the count from there instead of relying on a number in
a document.

In the repository, the source is [`bereiche/feldkatalog.json`](../bereiche/feldkatalog.json), and
`tools/feldregister-bauen.js` builds the published register from it. Both have the same `felder[].kennung` list, so
an offline check can use either.

## 4 · Where the schemas are

Requests, submissions and template field models have JSON schemas (Draft 2020-12) in
[`docs/template-generator/`](template-generator/). Every module type has its own schema in a folder `docs/…-modul/`.
To print the current list of module types with their checkers, run `node tools/modul-schemas-messen.js`. How modules
are built and checked is described in [`docs/modules/`](modules/README.md).
