# JURISDICTIONS.md — Localizing Vivodepot for a New Country or Language

**Status:** last revised 2026-08-27. **Audience:** anyone who clones Vivodepot from GitHub and
wants to adapt it for a jurisdiction or language other than Germany/German. A map of what
exists, what doesn't, and where the boundaries are, so you can plan real work instead of
discovering gaps one at a time.

**Principle:** Vivodepot follows an "enable, don't deliver" model (PRINCIPLES.md, root 2). The
project itself will not build and ship content for every jurisdiction — it aims to make that
possible for others to do, on their own repository, without forking the core mechanism. Think
Victorinox, not a platform: a tool with attachment points, not a service that does the work for you.

---

## The short version

Localizing Vivodepot is not one task, it's four independent layers with four different states of
readiness today:

| Layer | What it covers | Status |
|---|---|---|
| 1. Legal content per document type | Which paragraph applies, form requirements, deadlines — the substance of a generated Vollmacht/Testament/etc. | **Ready.** Built 2026-08-02 (U2-ADR-121). |
| 2. Application UI text | Buttons, navigation, warnings, confirmations | **Mechanism exists, unused.** Every `STRINGS` key can be overridden per language since 2026-08-20; no module does it yet, and there is still no in-app language switch. |
| 3. Field labels & titles | What a form field is called | **Mechanism built, one real module exists.** A signed `textsatz` module (2026-08-17, U2-ADR-141) overrides labels by tree-path key; a complete English module ships in the repo (1298 keys) — but nothing in the interface lets a citizen turn it on. |
| 4. Explanatory / help text | Text that explains a legal concept to the citizen while they fill in a field | **Same mechanism as Layer 3, partial coverage.** The built English module carries `hint`/`beispiel`/`einfuehrungstext` (416 keys) but no `hilfetext`; and translating the text doesn't change the legal system it assumes. |
| 5. Exports (identity/VC documents) | Country code, address structure, currency | **Partially not ready.** One hardcoded literal, otherwise mostly unaudited. |

If you only need layer 1 (a new jurisdiction's legal rules, in whatever language that jurisdiction
uses for its own legal text), you can start today. If you need the interface itself to speak a
different language, that is a separate, larger, not-yet-started project.

---

## Layer 1 — Legal content per instrument type (READY)

Every document-generating instrument (`vorsorgevollmacht`, `betreuungsverfuegung`,
`patientenverfuegung`, `testament`, `ki-verfuegung`) carries its own `rechtsraum` field. A single
depot can hold instruments under more than one jurisdiction at once — this was a deliberate
decision (U2-ADR-121, decision point 2), driven by the immigration/multi-jurisdiction case.

**Where the built-in (German) content lives:** the `RECHTSRAUM_KATALOG` constant in
`vivodepot.html`. Each entry carries `katalogVersion`, `wortlaut` (document text building blocks),
`formvorschriften` (form requirements), `fristenVorrang` (deadline/precedence rules), and `zweck`
(a jurisdiction-independent purpose tag — `vermoegenssorge`, `gesundheitssorge`, `nachlass`,
`postmortalespersoenlichkeitsrecht` — used to match content across jurisdictions by what it's
*for*, not by its German name).

**How to add a new jurisdiction without touching the core:** author a Rechtsraum-Module — a signed
JSON payload, schema at `docs/rechtsraum-modul/rechtsraum-modul-schema.json`. Key rules:

- `rechtsraum` is your jurisdiction code (e.g. `FR`, `EC`). `'DE'` is reserved for the built-in
  catalog and will be rejected.
- `moduleVersion` must increase for an update to take effect (update-not-freeze — this differs
  deliberately from the field-model's freeze-on-revocation behavior, because legal content needs
  to stay current, not stay as it was when first recorded).
- A module MAY contribute content to a type the built-in catalog already knows (e.g. French content
  under `typ: 'vorsorgevollmacht'`, `rechtsraum: 'FR'` — this doesn't conflict with the German entry
  because the storage is keyed by `{typ, rechtsraum}` together).
- A module that wants to introduce a genuinely NEW type (one the built-in catalog doesn't have)
  must namespace it with the `tpl_` prefix. Anything else is silently rejected — one bad type entry
  in a module doesn't invalidate the rest of it.
- The built-in catalog always wins if there's ever a conflict. A module can never override `'DE'`.
- The signature/verification chain is the same one used for the field-model layer (feldDefinitionen/
  codeListen, U2-ADR-051) — there is no separate, new crypto to write.

Once a module is loaded into a depot (`data.rechtsraumModule[]`), the app reads it via
`_rechtsraumKatalogLesen(typ, rechtsraum, ...pfad)` — the same lookup function the built-in catalog
uses, with unknown-key lookups returning `undefined` instead of throwing.

**A self-service builder exists for two of the six module types, not yet this one.**
`vivodepot-template-generator.html` lets an institution build and sign a module without
hand-writing JSON. As of 2026-08-27 it generates `institutionsArt` and `bereich` modules;
`rechtsraum` (along with `format` and `branding`) is not yet supported there. Authoring a
Rechtsraum-Module today still means writing the JSON by hand against the schema above.

**What this layer does NOT cover:** who is allowed to write and sign a module, and how a citizen's
copy of Vivodepot decides to trust it. The crypto side of that question is designed and built —
U2-ADR-172 (2026-08-25) and U2-ADR-181 (2026-08-27)
give every module type (all six `EINLASS_REGISTER` registers, not just Rechtsraum-Module) a
certificate chain from the Vivodepot Trust Authority through an intermediate — "Ausgabestelle" for
an issuer, "Prüfstelle" for a third party that only audits someone else's module — to the module's
own signature, with cascading revocation. What remains genuinely undecided is the governance half:
**who** is actually issued such a certificate is, per U2-ADR-181, a business decision the code
deliberately does not make. See "Open questions" below. Today, loading a module is still a
manual/developer act, not something a citizen does through the interface.

---

## Layer 2 — Application UI text (MECHANISM EXISTS, UNUSED)

`STRINGS` (`vivodepot.html`) is still a single, flat object holding the built-in German text —
about 1,000 keys, referenced roughly 930 times. It still centralizes only text that is part of the
operating flow: feedback, warnings, errors, confirmations, hints shown during interaction. That
scope is a deliberate, documented decision (see
`docs/adr/vivodepot-U2-ADR-112-strings-schicht-geltungsbereich-2026-07-28.md`), not an oversight —
and it is fully covered for that narrow scope.

Since 2026-08-20, `STRINGS` is a `Proxy` whose lookup falls through to
`textLesen('strings:' + key + '.text')` before returning the built-in German value — in effect a
`t(key)` lookup function. A `textsatz` module (see Layer 3) can in principle override any `STRINGS`
key by including a `strings:<key>.text` entry. In practice nothing does: the one real English
module built so far, `tools/textsatz-en-modul.json`, carries 1298 keys and none of them use that
prefix — it only overrides field labels and help text (Layer 3/4), not the application chrome.

There is still no `STRINGS.de`/`STRINGS.en` split as a named object, and — more to the point —
still no language-selection mechanism a citizen can reach through the interface
(`textsatzSpracheAktiv()` reads `data.textsprache`, but ADR-141 explicitly built no switcher for
it — point 6: *"Kein Umschalter in der Oberfläche"*). Building that switcher, and deciding how a
language gets chosen with no server, no account, no login, is still a project of its own.

---

## Layer 3 — Field labels & titles (MECHANISM BUILT, ONE REAL MODULE EXISTS)

Per ADR-112's own scope decision, field labels and section titles are explicitly NOT part of
`STRINGS` — they still live directly in the field definitions themselves (`label:`, `titel:`), as
literal German strings, scattered across `vivodepot.html`. A 2026-07-28 measurement counted
roughly 285 such label/title occurrences outside STRINGS.

**An extraction layer exists:** `textLesen(kennung)` (U2-ADR-141, 2026-08-17) reads a
tree-path key (e.g. `mobilitaet.reisepass_nr.label`) from an active `textsatz` module first, and
falls back to the inline German value only if the module has nothing for that key. `textsatz` is
one of six `EINLASS_REGISTER` module types (alongside `rechtsraum`, `institutionsArt`, `format`,
`bereich`, `branding`) — a signed JSON payload, docked without touching the core, the same shape
as the Rechtsraum-Module above.

A complete worked example exists: `tools/textsatz-en-modul.json`, a full English module with 1298
keys (882 labels, 159 hints, 245 examples, 12 intro texts). It proves the mechanism end to end —
but loading it is still a manual/developer act (set `data.textsprache` and register the module
directly), not something a citizen reaches through the interface. That's the same gap as Layer 2:
the content-side mechanism exists, the citizen-facing switch does not.

---

## Layer 4 — Explanatory / help text (TRANSLATABLE NOW — STILL NOT A TRANSLATION PROBLEM)

Beyond labels, there is a fourth category: `hint`, `hilfetext`, `einfuehrung`, and `beispiel`
strings attached to fields and sections, meant to guide the citizen while filling in a form. As of
2026-08-02: 126 `hint:`, 55 `hilfetext:`, 18 `einfuehrung:`, 310 `beispiel:` occurrences — a
population that was never measured by the ADR-112 count above (that measurement was scoped to
`label:`/`titel:` only).

This text is served by the separate `textsatz` register (Layer 3) — its own mechanism, not an
extension of the Rechtsraum-Module payload contract. `hint`/`beispiel`/`einfuehrungstext` keys are
wired to it the same way `label` is; `tools/textsatz-en-modul.json` carries 159 `hint`, 245
`beispiel`, and 12 `einfuehrungstext` overrides. The smaller `hilfetext` population (55 as of
2026-08-02) is not covered by that module — unaudited whether by omission or by design.

This still matters more than a plain translation gap, and the built module doesn't close that gap
— it was never meant to. Example, verbatim from `tools/textsatz-en-modul.json`
(`vorsorge.vorsorge_instrumente/testament_verzicht_hinweis.hint`): *"It is not drawn up within
Vivodepot, but with a notary or through legal counsel."* — a faithful translation of the German
original, which still assumes the German civil-law notary system, because this module translates
German content into English; it doesn't adapt it to a different jurisdiction. The distinction
stands: load a non-German Rechtsraum-Module today, and hint text
like this is unchanged and, for that jurisdiction, potentially just wrong — the `textsatz`
mechanism solves *language*, not *legal substance*. Pairing a specific Rechtsraum-Module with
matching `textsatz` content is not designed.

None of this text is ever persisted into a depot or an exported/generated document — it is
rendered live, from the current code, every time. That means there's no backfill problem waiting
for existing depots.

---

## Layer 5 — Exports (PARTIALLY NOT READY, mostly unaudited)

- `country_code: 'DE'` is a hardcoded literal in the SD-JWT-VC identity export function
  (`sdJwtVcIdentitaet` in `vivodepot.html`). It is not derived from any instrument's `rechtsraum`
  field and was explicitly kept out of scope of the U2-ADR-121 decision (different concern — a
  VC schema format field, not a legal-content selection). Fixing this is a small, well-localized
  change, not yet made.
- Address fields (`strasse`, `plz_ort`, etc.) are free-text, not structurally locked to a German
  format — but their example/placeholder text is German-styled ("Straße & Hausnummer"). Adapting
  those is Layer 3/4 work, not a data-model change.
- Currency: `EUR` appears as a literal in roughly a dozen places. Not audited beyond that count —
  treat as unverified, not as confirmed-safe or confirmed-broken.

---

## If you want to localize for a new country today

1. **You can do this now, alone, without touching the core app:** write a Rechtsraum-Module for
   your jurisdiction (Layer 1) — legal document text, form requirements, deadline rules, in
   whatever language your jurisdiction's legal documents are actually written in. Validate it
   against `docs/rechtsraum-modul/rechtsraum-modul-schema.json`.
2. **What you'll hit immediately if you also want the interface in your language:** the
   content-side mechanism now exists (Layers 2–3 — a `textsatz` module can override labels, hints,
   examples, and in principle any `STRINGS` key), and a full English example ships in the repo.
   What's still missing is a way for a citizen to actually turn it on: there is no in-app language
   switch, and no way to pair a specific Rechtsraum-Module with a specific `textsatz` language.
   Talk to the maintainer before building either, so effort isn't duplicated or built in a
   direction that conflicts with a decision still to come.
3. **What will look wrong even if your legal content is perfect:** explanatory hint text (Layer 4)
   can now be translated into another UI language via a `textsatz` module, but translating it
   doesn't change which legal system it assumes — hint text written for German law will still show
   German-law-specific guidance next to your jurisdiction's content, translated or not, until
   someone pairs Rechtsraum-Module content with matching `textsatz` overrides.
4. **Exports** will still claim `country_code: 'DE'` (Layer 5) until that literal is fixed.

---

## Open questions, not yet decided

- **Contributor trust path:** who is allowed to author and sign a Rechtsraum-Module (or any of the
  other five module types) that a citizen's copy of Vivodepot will actually trust and load. **The
  crypto half is now designed and built** (U2-ADR-172, 2026-08-25; U2-ADR-181, 2026-08-27): a
  certificate chain from the Vivodepot Trust Authority through an intermediate — "Ausgabestelle"
  for an issuer, "Prüfstelle" for a third party that only audits someone else's module — to the
  module's own signature, the same chain for every module type. **The governance half is
  explicitly not designed:** U2-ADR-181 states outright that whether, when, and under what
  conditions any given institution is actually issued such a certificate is a business decision
  the code deliberately does not make.
- **Distribution model:** one file that can load any module at runtime, vs. separate builds per
  locale/jurisdiction. Not decided. (A public marketplace for modules — free and paid — is one
  option under discussion; no such marketplace exists today, and nothing above depends on it
  existing.)
- **UI language switching mechanism:** how a language gets selected with no server, no account, no
  login. Not designed.
- **Governance beyond the core team:** fork vs. a shared brand/ecosystem model for jurisdiction-
  specific builds. Not decided.

If you're working on any of these, open the conversation with the maintainer before building —
see the project's ADR process (`docs/adr/`) for how architectural decisions are made and recorded
here. Relevant background: `docs/adr/vivodepot-U2-ADR-121-rechtsraum-katalog-instrument-typen-2026-08-01.md`
(the legal-content mechanism), `docs/adr/vivodepot-U2-ADR-112-strings-schicht-geltungsbereich-2026-07-28.md`
(why UI text is scoped the way it is today), `docs/adr/vivodepot-U2-ADR-141-textsatz-anzeigetexte-andockbar-2026-08-17.md`
(the `textsatz` module mechanism behind the Layer 2–4 updates above), and
`docs/adr/vivodepot-U2-ADR-172-zwischenstufe-ausgabestelle-2026-08-25.md` /
`docs/adr/vivodepot-U2-ADR-181-vertrauensstufen-kern-pruefstelle-2026-08-27.md` (the certificate
chain behind the contributor-trust-path update above).
