# VERIFYING-SIGNATURES.md — How to check a Vivodepot signature yourself

**Audience:** anyone who receives a signed module, template or product recipe and wants to verify
it without trusting the app: auditors, institutions, packagers, curious users.

This page explains **checking**. It does not explain how to produce a signature that the app
accepts, because no such route exists outside Vivodepot's issuing service: every accepted chain
ends at the trust anchor, and only the anchor's holder, or an intermediate it has certified, can
extend it. An unsigned module is always shown as unsigned (see [`docs/modules/`](modules/README.md)).

---

## 1 · The trust anchor

All chains end at one public key, the **Vivodepot Trust Authority** anchor:

```
kty: OKP · crv: Ed25519 · alg: EdDSA
x:   YTLr-GfRPpyM8d_Ldal1_ankpgFyOwT9ly_G-QyJCZc
kid: vivodepot-trust-authority-v2-22082026
```

Do not take it from this page alone. Compare it in at least two places:
- the constant `TRUST_AUTHORITY_PUBLIC_JWK` in `vivodepot.html` and `vivodepot-lesen.html`
  (`grep -n -A6 "const TRUST_AUTHORITY_PUBLIC_JWK" vivodepot.html`);
- [`SECURITY.md`](../SECURITY.md), section 1. It gives the `kid` and the RFC 7638 thumbprint of the
  key: compute the thumbprint of the key above and compare. Section 2 lists further paths.

The anchor has no expiry date. The certificates it signs do. Rotation is described in
[`SECURITY.md`](../SECURITY.md), section 3.

## 2 · Building blocks

- **Signatures** are JWS in compact serialisation (RFC 7515) over Ed25519, with `alg` `Ed25519`
  (RFC 9864) or the older name `EdDSA` (RFC 8037). `ES256` with P-256 is accepted as a fallback.
  The `alg` in the header must match the key type, otherwise the check fails. Accept both Ed25519
  names, or you will reject valid signatures.
- **Certificates** are JWS whose payload is a W3C-style credential with a `credentialSubject`.
  It contains `anbieterId`, `anbieterTyp`, `publicKeyJwk` (the key being certified) and, for
  intermediate certificates, `rolle`. A certificate expires at `expirationDate`, `validUntil` or
  `exp`, whichever it carries, and is not yet valid before `validFrom` or `nbf`.
- **Revocation** is an embedded list of RFC 7638 thumbprints of revoked keys
  (`WIDERRUFS_LISTE` in `vivodepot.html`). There is no online revocation server. Today the list is
  empty: certificates are trusted for their validity period, and the list is for emergencies.

## 3 · A signed module bundle

A signed module arrives as a JSON file with three JWS:

```json
{ "providerCredentialJws": "…", "modulSignaturJws": "…", "ausstellerZertifikatJws": "…" }
```

Check it in this order. Stop at the first failure; any failure means **not trusted**.

1. **Intermediate certificate** (`ausstellerZertifikatJws`, if present). Verify the JWS with
   the anchor key. Check that it has not expired and that the thumbprint of its `publicKeyJwk` is
   not revoked. Its `anbieterTyp` must be one of the three intermediate types:
   `vivodepot/ausgabestelle` (issuing office), `vivodepot/pruefstelle` (auditor) or
   `vivodepot/institution`. No other certificate may act as an intermediate. If the bundle has no
   intermediate, the publisher certificate in step 2 must be signed by the anchor itself.
2. **Publisher certificate** (`providerCredentialJws`). Verify it with the intermediate's
   `publicKeyJwk` from step 1 (or with the anchor), and check expiry and revocation in the same way.
3. **Module signature** (`modulSignaturJws`). Verify it with the publisher's `publicKeyJwk` from
   step 2. Its payload is the module itself.

If any of these steps fails, the app **does not take the module in**.

4. **What the chain allows the module to claim.** The app derives the trust level from the
   certificates alone:
   - through an intermediate → *verified (role)*, the role coming from the certificates
     (publisher by default). Vivodepot's own content, issued through its own issuing office, is
     not marked at all;
   - an auditor's certificate (`rolle: "pruefer"`) also needs a scope (`geltung`) covering this
     module type and language. A language module must carry `originaleSumme`, the checksum of the
     original sentences the auditor reviewed. If the scope does not fit or the checksum differs,
     the result is *signed, not recognized*. If the checksum for the product's base language is
     missing, the module is rejected;
   - a publisher certificate signed directly by the anchor without an intermediate → *signed,
     not recognized*, except for Vivodepot's own content.

   Fields inside the module such as `pruefstufe`, `ungeprueft`, `abWerk`, `anbieterIdGeprueft`,
   `beleg`, `signiert` or `verifiziert` are **not** evidence. The app never reads trust from them.

In the app, this is `modulEinlassenGeprueft`, `verifiziereProviderCredential` and `_pruefstufeFuerModul` in
`vivodepot.html`.

## 4 · A product recipe

A product (core, language, modules) is delivered as a recipe `<slug>.json` with a signature
`<slug>.jws`. The chain has exactly two steps and fails closed:

1. The payload of `<slug>.jws` carries `ausstellerZertifikatJws`. Verify that certificate with
   the **anchor** key. Its `anbieterTyp` must be `vivodepot/ausgabestelle`, and its `rolle` must
   be `rezept`. Certificates without `rolle` are accepted only for the issuing-office key listed
   in `UEBERGANG_AUSGABESTELLEN` (in `tools/lib/rezept-signatur-pruefen.js`), and only until
   2027-08-23.
2. Verify `<slug>.jws` with the `publicKeyJwk` from that certificate. Its payload must have
   `typ: "vivodepot/rezept"`, the expected `slug`, and `rezeptPruefsumme` equal to the SHA-256 of
   the exact bytes of `<slug>.json`.

There is a ready-made checker that needs no key and writes nothing:

```bash
node tools/lib/rezept-signatur-pruefen.js --ordner <folder-with-slug.json-and-slug.jws>
```

It checks against the product anchor only. Run without arguments, it performs a self-test
against invented test material under `tests/fixtures/rezept-signatur/`, which has its own test
anchor (it says so in its output).

## 5 · What a valid signature does not tell you

A valid chain says **who** stands behind a module and that it has not been changed since. It does
not say that the content is legally correct for your situation. That depends on the publisher's
own review, which the chain only attributes.
