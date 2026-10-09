# Example: ask a Vivodepot user for data and open the reply

This example shows the whole round trip from the receiving side: you build a data request, the person answers it in their
own app, and you open the encrypted reply. It needs **Node 22 or later and nothing else**: no package, no account, and no
Vivodepot server. The only Vivodepot file it reads is the public field register (`bereiche/feldkatalog.json`), and you
can pass your own copy with `--register`.

| File | What it does |
|---|---|
| `beispiel-angaben.json` | Your request details: who asks, why, on what basis, the case number, and the fields with a purpose for each. |
| `anfrage-bauen.js` | Checks the fields against the register and writes the request as a file and as a link. It also creates the return channel. |
| `antwort-oeffnen.js` | Opens the reply (`.jwe`) with your key file or the one-time password and prints the data set. |

## Five steps

1. **Describe the request.** Copy `beispiel-angaben.json` and edit it. A request names field IDs, never values. Every
   field carries its own purpose, because the person sees it before deciding.
2. **Build it.**
   ```
   node anfrage-bauen.js --angaben my-request.json --aus out --app https://<address of the app>/
   ```
   With the default `--art schluesselpaar` you get `out/anfrage.json`, `out/anfrage-link.txt` and
   `out/antwort-schluessel.privat.jwk`. The last file is your private key. Keep it and do not send it.
   With `--art einmalpasswort` there is no key file. The tool prints a one-time password instead, and you hand it to the
   person by another channel.
3. **Hand it over.** Send the link or the file. A link with many fields is usually too long for a QR code
   that a phone camera can read; for a notice, put it behind a short address that redirects to it
   (`docs/adr/vivodepot-U2-ADR-460-anfrage-qr-kurzlink-2026-10-01.md`). The request is **unsigned**. The app
   accepts it and shows the person an extra step that names who is asking and where the reply goes
   (`docs/adr/vivodepot-U2-ADR-152-die-anfrage-von-aussen-2026-08-20.md`, point 6). A signed request needs a provider
   certificate, and this example does not imitate one.
4. **Receive the reply.** The person chooses which fields to share. The app writes a JWE (RFC 7516, Compact
   Serialization) as a `.jwe` file. Its protected header names the case and never a value.
5. **Open it.**
   ```
   node antwort-oeffnen.js reply.jwe --schluessel out/antwort-schluessel.privat.jwk --vorgang EXAMPLE-2026-0001
   node antwort-oeffnen.js reply.jwe --passwort <one-time password> --vorgang EXAMPLE-2026-0001
   ```
   A reply can be partial. In that case `vollstaendig` is `false`; `fehlend` and `unbekannt` name what is missing, and
   `zurueckgehalten` counts the required fields the person held back. Show that to whoever works with the data.

## The reply format

`enc` is always `A256GCM`, and `alg` is one of two values:

- `ECDH-ES` on P-256, opened with the key file. The case number goes into the key derivation (`apv`).
- `PBES2-HS512+A256KW` with `p2c` exactly 600000, opened with the one-time password.

A standard JOSE library opens the reply; it was cross-checked against `jose`. With `jose`, set `maxPBES2Count` to at least 600000. `antwort-oeffnen.js` does the same
by hand with WebCrypto, so every step is visible. It refuses `zip`, any other `alg` and any other `p2c`.
Background: `docs/adr/vivodepot-U2-ADR-449-antwort-als-jwe-2026-09-29.md`. To measure replies of your own, run
`tools/antwort-jwe-messen.js`.

## Exports instead of requests

The person can also hand over a file exported in a standard format. Check those exports against the official validator
of each standard. The standards register in `tools/standards-register/` names the official validator for each format
(contract: `docs/standards-schnittstelle.md`), and this example does not add a validator of its own.

## Kurz auf Deutsch

Dieses Beispiel zeigt den Weg aus Sicht der empfangenden Stelle. `anfrage-bauen.js` baut aus Feldkennungen eine
unsignierte Anfrage und prüft dabei jede Kennung gegen das öffentliche Feldregister. Außerdem legt es den Rückweg an:
ein Schlüsselpaar oder ein Einmalpasswort. `antwort-oeffnen.js` öffnet die Antwort-JWE der Person. Beides läuft mit
Node 22, ohne Pakete und ohne Server von Vivodepot. Eine Anfrage ohne Zertifikat nimmt die App an und zeigt dafür einen
eigenen Schritt. Die Probe `tests/beispiel-anfrage-antwort.test.js` hält das Beispiel gegen den Kern: Der Kern nimmt die
Anfrage an, und das Beispiel öffnet die Antwort, die der Kern verschlüsselt.
