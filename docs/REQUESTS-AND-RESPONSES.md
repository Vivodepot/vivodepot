# REQUESTS-AND-RESPONSES.md — Asking a person for data and opening the reply

**Audience:** developers at an institution or of specialist software who want to request data from a person's depot
and process the reply. Start with [`INTEGRATION.md`](INTEGRATION.md), section 4; this page has the details. A working
example that needs no Vivodepot server is in [`examples/anfrage-antwort/`](../examples/anfrage-antwort/README.md).
German version: [`integrieren.md`](integrieren.md), section 10.

## 1 · The request names fields, never values

A request is readable JSON with German keys. Its schema is
[`docs/template-generator/anfrage-schema.json`](template-generator/anfrage-schema.json). These properties are
required: `modulTyp` (always `anfrage`), `anfrageVersion`, `von`, `zweck`, `grundlage`, `vorgang`, `gueltigBis`,
`felder` and `antwort`.

- **No values.** A request has no place for values. Keys meant for values, such as `wert`, `value` or `daten`, make
  the core refuse the whole request. The matching against the depot happens on the
  person's device.
- **A purpose for every field.** Each entry in `felder` has its own `zweck`. A field without one is dropped and
  reported, never filled in with the general purpose.
- **`grundlage`** names the legal basis or occasion. The person sees it before answering. Vivodepot shows it but does
  not check it.
- **`gueltigBis`** is a date. An expired request is shown as expired and is not answered silently.
- **Unknown field IDs** are reported, and the reply then says it is incomplete. Field IDs are described in
  [`DATA-MODEL.md`](DATA-MODEL.md).

## 2 · Signed or unsigned

- **Unsigned.** A request without a certificate is accepted. The person then gets a separate step that names who is
  asking and where the reply goes. Small organisations without a certificate start here. Basis:
  [`U2-ADR-152`](adr/vivodepot-U2-ADR-152-die-anfrage-von-aussen-2026-08-20.md), point 6.
- **Signed.** A signed request is checked through the same chain as a signed module, against the trust anchor built
  into the app. Signing requires a provider certificate, which Vivodepot issues. How the chain is checked is described
  in [`VERIFYING-SIGNATURES.md`](VERIFYING-SIGNATURES.md).

## 3 · Transport

A request reaches the person as a file, as pasted text, or in the fragment of a link (`…#anfrage=…`). The fragment
holds either the base64url of the request JSON or a compact form that starts with `z1.`. The compact form carries the signed request (a JWS), with the provider
certificate appended after `~`, packed with deflate-raw and then base64url-encoded. An unsigned request travels in the
first form. The app unpacks at most 64 KiB.

A QR code on a notice usually cannot hold the full link. In that case it carries a short address that redirects to the
app with the request in the fragment. Opening the short address needs a network, and whoever runs that address sees
the phone's IP address and the time. Basis:
[`U2-ADR-460`](adr/vivodepot-U2-ADR-460-anfrage-qr-kurzlink-2026-10-01.md).

## 4 · The reply

The reply is a JWE in Compact Serialization (RFC 7516), saved as a file ending in `.jwe` with the media type
`application/jose`. `enc` is always `A256GCM`. `antwort.art` in the request chooses the method:

| `antwort.art` | `alg` | Suited for |
|---|---|---|
| `schluesselpaar` | `ECDH-ES` on P-256; the request carries your public key in `antwort.publicKeyJwk` | many replies to one recipient |
| `einmalpasswort` | `PBES2-HS512+A256KW`, `p2c` exactly 600000 | a single case; the password reaches the person by another channel |

- The protected header carries `typ` `vivodepot-antwort+jwe`, `vorgang` and, if the request named one, `anbieter`.
  The header is readable and names no value. For `ECDH-ES` the case number also goes into the key derivation (`apv`).
- The reply is padded to fixed size steps and is not compressed. A receiver should refuse `zip`.
- Accept only `p2c` = 600000. A forged header with a very large count would otherwise stall the receiving side.
- A standard JOSE library can open the reply; it was cross-checked against `jose`. With `jose`, set `maxPBES2Count` to at least 600000. For a cross-check against
  `jose`, run `node tools/antwort-jwe-messen.js --jose <path to jose>`.
- A reply can be partial. In that case `vollstaendig` is `false`, and `fehlend` and `unbekannt` name what is missing, and
  `zurueckgehalten` counts the required fields the person held back without naming them.

Basis: [`U2-ADR-153`](adr/vivodepot-U2-ADR-153-der-verschluesselte-rueckweg-2026-08-20.md) and
[`U2-ADR-449`](adr/vivodepot-U2-ADR-449-antwort-als-jwe-2026-09-29.md). As stated there, the reply encryption is still
to go through an external cryptographic review.
