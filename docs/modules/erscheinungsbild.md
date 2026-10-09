# Appearance (`erscheinung` and `erscheinungsbild`)

Two different things carry “appearance” in their name.

## `erscheinung`: font sizes, can be taken in

**What it carries:** the font size of up to five roles of the interface: `label` (field label),
`wert` (field value), `gruppe` (group heading), `abschnitt` (section heading), `titel` (page
title). Values are lengths in `px`, `rem` or `em`.

**Schema:** [`docs/erscheinung-modul/erscheinung-modul-schema.json`](../erscheinung-modul/erscheinung-modul-schema.json)
· **Example:** [`examples/erscheinung.example.json`](examples/erscheinung.example.json)

`moduleVersion` is required, and at least one role must be set. An invalid length is dropped and
the rest stays. Unsigned modules are possible (see README, [“Take in”](README.md#3--take-in)).

## `erscheinungsbild`: the full design of a product, built in

**What it carries:** the design values of the interface (colours, spacing, type) for the normal,
high-contrast and dark views, and optionally the product's stylesheet. The framework itself
carries no design values. Each product gets its appearance from this module **when the product
is built**. The app does not take it in while running.

**Schema:** [`docs/design-modul/erscheinungsbild-modul-schema.json`](../design-modul/erscheinungsbild-modul-schema.json)

**Build it from CSS:**

```bash
node tools/erscheinungsbild-modul.js --quelle <your.css> --ziel <module.json> --id <id>
```

The tool reads exactly three blocks (`:root`, `html.high-contrast`, `html.dark-mode`). Anything
else is an error, not something it silently skips. Vivodepot's own design is
[`tools/erscheinung/heute.css`](../../tools/erscheinung/heute.css) and is a working model.

**Rules checked when the product is built:** only known design tokens; protected tokens (the
accent and the institution's branding colours, the font-size roles) cannot be set; no `url(`,
`expression(` or similar in values; a contrast of at least 4.5:1 for each listed pair of text and background tokens, in every view; minimum sizes for
text (10 px, body 14 px), fields and touch targets (24 px) and the focus outline (2 px). A design
that breaks a rule does not produce a product. Nothing is applied in part.

## Not in use: `design-modul-schema.json`

`docs/design-modul/design-modul-schema.json` (design tokens as name → value) has no admission path
in the app at the moment. Do not build against it.
