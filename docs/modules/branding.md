# Branding module (`branding`)

**What it carries:** how an institution appears: name, two colours, a font, a logo, a display
domain, a contact address and an update address.

**Schema:** [`docs/branding-modul/branding-modul-schema.json`](../branding-modul/branding-modul-schema.json)
· **Example:** [`examples/branding.example.json`](examples/branding.example.json)

## Signed only

A branding module is the visible statement of who is speaking. If it were accepted unsigned, any
institution could claim to be another one, and the person would see nothing but the colours, logo
and name. The app therefore takes in a branding module **only with a valid signature**. An
unsigned one is refused (`nur-signiert-erlaubt`). Only one publisher's branding is active at a
time.

You can still build and check a branding module yourself. To add it to someone's app, it has to
be signed under a certificate from Vivodepot's issuing service. Whoever builds a product of their
own includes the branding when the product is built; it passes the same check there.

## Fields

`moduleVersion` is required, and at least one of the following must be set:

| Field | Rule |
|---|---|
| `farbePrimaer`, `farbeSekundaer` | six-digit hex, `#RRGGBB` |
| `schriftart` | a font name, 1 to 100 characters. The app does not load fonts; it takes effect only if the font is available on the device |
| `logo` | data URI, PNG or JPEG only (no SVG), at most 200 KB of image data |
| `name` | plain text, 1 to 200 characters |
| `domain` | display only, not a link target, at most 100 characters |
| `kontakt` | e-mail form, at most 200 characters |
| `aktualisierungen` | `https` only, at most 300 characters |

`herkunft` (your identifier, used when a newer version replaces an older one) can be given as
well, but does not count as one of these. An invalid field is dropped on its own and the rest
stays.

## Check

`node tools/modul-ohne-signatur-erzeugen.js --pruefen <file>` answers `nur-signiert-erlaubt` for any unsigned
branding module: the app refuses it before looking at its fields. The field rules above are checked
when a product is built with your branding.
