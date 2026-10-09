# INTEGRATION.md — Connecting another application to Vivodepot

**Audience:** developers of other software (practice systems, case management, wallets, portals)
who want to exchange data with a person's Vivodepot.

**Further chapters:** field IDs and the public field register in [`DATA-MODEL.md`](DATA-MODEL.md); requests and
encrypted replies in detail in [`REQUESTS-AND-RESPONSES.md`](REQUESTS-AND-RESPONSES.md); a working example without
any Vivodepot server in [`examples/anfrage-antwort/`](../examples/anfrage-antwort/README.md). German version of all
three: [`integrieren.md`](integrieren.md).

**The one rule that shapes everything below:** Vivodepot runs in the person's browser. Its Content Security Policy sets `connect-src 'none'`
(check: `grep -n "connect-src" vivodepot.html`): the app cannot send or fetch data over the network.
Its own files may be loaded from where it is hosted, but no server holds depots or reads their contents, there is no API to
call, and there is no account. When the person shares by link, the server stores the file only in encrypted form; the key
travels in the link. Every integration is a **file or a link that the person moves themselves**.

---

## 1 · Files the person exports to you

Vivodepot writes standard formats: FHIR R4 / IPS, SD-JWT VC, vCard 4.0, iCalendar 2.0 and others.
Each export names its standard, version and profile in [`STANDARDS.md`](../STANDARDS.md). Which
formats are also read back, and what has been checked against external validators, is in
[`INTEROPERABILITY.md`](../INTEROPERABILITY.md). Both documents are maintained from the code; this
page does not repeat their lists so that it cannot fall out of step with them.

To receive data, accept the file the person gives you and validate it with the validator of its
own standard. One exception: the SD-JWT VC exports are signed by the person's own app, not by an
institution, so a verifier will not recognise their issuer (see “Selbstauskunft-Nachweise” in
[`STANDARDS.md`](../STANDARDS.md)).

## 2 · Files you give to the person

The person imports the file in the app and sees a preview before anything is taken over. The
import formats are the read side in [`INTEROPERABILITY.md`](../INTEROPERABILITY.md), section 1. A
provider credential is checked against the Vivodepot trust anchor before anything is taken over.
That requires a provider certificate, which Vivodepot issues.

## 3 · Your own format without writing code: format modules

If your system needs a format Vivodepot does not have, describe it as a **format module**: a JSON
description that maps depot fields to paths in your format, for import or export. This way the app
reads JSON, XML, CSV, SD-JWT and vCard, and writes JSON and XML; other kinds of files cannot be
described yet. The schema is
[`docs/format-modul/format-modul-schema.json`](format-modul/format-modul-schema.json). A format
module contains no code. It is data that the app interprets, so it cannot run anything in the
person's browser. How modules are built, checked and taken in is described in
[`docs/modules/`](modules/README.md).

## 4 · Asking a person for data: the request

An institution can send a person a **request** (which fields, for what purpose). A request signed
together with a provider certificate is checked against it and shown as checked. An unsigned request is accepted
too: before answering, the person goes through an extra step that cannot be skipped and shows where
the answer will go. Either way, the person decides what to answer.
The answer goes back encrypted to the institution. The request travels in the link fragment
(`…#anfrage=…`), as pasted text or as a QR code, as base64url of the request or, for a signed request,
in a compact form starting with `z1.`. Details and limits are in
[`INTEROPERABILITY.md`](../INTEROPERABILITY.md) (“Die Anfrage einer Stelle kommt in zwei Formen”).
Check: `grep -n "ANFRAGE_LINK_MARKE" vivodepot.html`.
Fields, transport and the reply format: [`REQUESTS-AND-RESPONSES.md`](REQUESTS-AND-RESPONSES.md).

A request is built with the Studio (`vivodepot-studio.html`). It is shown as checked only when it is
signed together with a provider certificate. Vivodepot issues these certificates; that is the
commercial service.

## 5 · Sharing a record by link: SMART Health Links

A person can share a health record as a SMART Health Link (`shlink:/`). The file is encrypted in
the browser, and the key travels only inside the link. See [`STANDARDS.md`](../STANDARDS.md),
“Weitergabe — SMART Health Links”.

## 6 · Reading a depot without installing anything: the read-only view

[`vivodepot-lesen.html`](../vivodepot-lesen.html) opens a depot file read-only, for example for an
authorised representative. It needs the file's password if the file is encrypted, and it changes nothing. See
[`docs/lese-app/README.md`](lese-app/README.md).

## 7 · What is not provided

- **No programming interface.** There is no HTTP API, no SDK and no MCP server. The app does not
  listen for messages from other pages: its only `postMessage` call goes to its own service worker
  (check: `grep -n "postMessage" vivodepot.html`).
- **No embedding contract.** Embedding the app in another page (iframe, web view) is not a
  supported way to integrate, and there is no message protocol for it.
- **No silent access.** Nothing leaves the depot unless the person exports or answers it.

If your integration needs one of these, open an issue that describes the use case. Each of them
would be a design decision with its own security review, not a missing switch.

## 8 · Checking signatures you receive

How to verify a signed module, template or product recipe, including the trust anchor and the
certificate chain, is in [`VERIFYING-SIGNATURES.md`](VERIFYING-SIGNATURES.md).
