# Templates

There are two kinds of templates, with different trust rules.

## Sheets for relatives (`angehoerigenVorlage`), can be unsigned

**What it carries:** sheets that a person prepares for those who may one day have to act for them,
in one language and optionally for one legal system, profession or area. Each sheet has a title,
an introduction and blocks that **point to existing fields** in the depot. It carries no data of
its own.

**Schema:** [`docs/angehoerigen-vorlage-modul/angehoerigen-vorlage-modul-schema.json`](../angehoerigen-vorlage-modul/angehoerigen-vorlage-modul-schema.json)
· **Example:** [`examples/angehoerigen-vorlage.example.json`](examples/angehoerigen-vorlage.example.json)

Required: `moduleVersion`, `herkunft`, `sprache`, `situationen` (sheet identifier → sheet; each
sheet needs `titel`). All text is plain text.

**Rules the app enforces:**
- An unsigned template is marked as unchecked on every sheet it brings.
- It cannot replace a sheet that came with the product.
- It cannot widen access: a building block that would also release fields marked as sensitive
  (`baustein.weit`) is switched off for an unsigned template.

Working examples: [`tools/angehoerigen-vorlagen/`](../../tools/angehoerigen-vorlagen/) (German and
English sheets of the products).

## Provider templates (forms with fields), signed only

**What it carries:** a form defined by an institution: fields, code lists, the official wording
and the document it produces. It reaches the person inside a signed credential from the
institution.

**Schema of the submission:** [`docs/template-generator/submission-schema.json`](../template-generator/submission-schema.json)
· **Example:** [`docs/template-generator/beispiel-submission.json`](../template-generator/beispiel-submission.json)

**Trust rules:**
1. The institution signs each template with **its own key** (`templatesJws`).
2. Vivodepot's issuing service certifies that this key belongs to that institution (a provider
   certificate under the trust anchor). That certificate is the commercial service.
3. The app renders a provider template only if both hold. A template that comes without its own
   signature is dropped and the app says so; the other, independently certified values of the
   credential are still taken over. A template whose signature is present but invalid makes the
   app reject the whole import.

Building and self-signing a submission is open: the Studio (`vivodepot-studio.html`) does it in the
browser. Without the certificate from step 2, nothing is rendered. A self-signed template never
appears as checked.
