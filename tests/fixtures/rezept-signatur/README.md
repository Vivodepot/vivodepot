# Prüfstoff für die Rezept-Signatur

Erfundene Produktrezepte (`*.json`) mit ihrer JWS (`*.jws`) und ein öffentlicher Prüfanker
(`anker/pruefstoff-anker.public.jwk.json`, nur `kty`, `crv`, `x`). Kein privater Schlüssel,
kein Depot, keine echten Produkte. `gueltig/` besteht die Prüfung, jede Datei in `ungueltig/` scheitert aus
dem Grund, den ihr Name sagt (anderer Slug, veränderte Bytes, falsche Rolle, fremder Anker).
Benutzt von `tools/lib/rezept-signatur-pruefen.js` (Selbsttest) und `tests/rezept-signatur-pruefen.test.js`.
