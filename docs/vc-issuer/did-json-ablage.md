# did.json — Issuer-Identität `did:web:vivodepot.de`

`did.json` veröffentlicht den **öffentlichen** Schlüssel der Vivodepot-Trust-Authority. Damit kann jeder Prüfer ein
ausgestelltes Provider-Zertifikat gegen den richtigen Schlüssel verifizieren. Der private Schlüssel ist nicht Teil
dieses Repositorys.

## Wo die Datei liegt

Für `did:web:vivodepot.de` ist der Auflösungspfad nach der did:web-Methode `https://vivodepot.de/.well-known/did.json`.
Der VC-Issuer (`vivodepot-vc-issuer.html`) trägt `did:web:vivodepot.de` als Aussteller; die Kennung in jedem
ausgestellten Zertifikat verweist damit auf diesen Schlüssel.

## Prüfen

    curl -s https://vivodepot.de/.well-known/did.json | python3 -m json.tool

Das Ergebnis ist ein DID-Dokument mit einem `publicKeyJwk` (Ed25519: `kty` `OKP`, `crv` `Ed25519`).

## Inhalt

`docs/vc-issuer/did.json` ist das ausgelieferte Dokument, wortgleich mit der Datei unter `/.well-known/did.json`. Es trägt den
öffentlichen Schlüssel `TRUST_AUTHORITY_PUBLIC_JWK` aus `vivodepot.html`, mit dem `kid` als Methodenkennung. Sein
RFC-7638-Fingerabdruck ist derselbe wie in SECURITY.md Abschnitt 1. Die Probe `tests/did-json-anker.test.js` hält fest, dass
did.json und Kern denselben Schlüssel tragen und dass das Dokument nur öffentliche Teile enthält.
