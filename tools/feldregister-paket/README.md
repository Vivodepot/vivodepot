# @vivodepot/feldregister

Das Feldregister von Vivodepot: dauerhafte Kennungen für Angaben in persönlichen Datendepots, mit Beschriftungen auf
Deutsch und Englisch. Jede Kennung hat eine feste Adresse: `https://register.vivodepot.de/feld/<kennung>`.

The Vivodepot field register: permanent identifiers for items in personal data depots, labelled in German and English.
Every identifier has a permanent address: `https://register.vivodepot.de/feld/<identifier>`.

## Inhalt · Contents

| Datei · File | |
|---|---|
| `feldregister.json` | Liste aller Kennungen · all identifiers ({{anzahl}}, Kern {{kern}}) |
| `feldregister.jsonld` | dasselbe als SKOS-Begriffsschema (JSON-LD) · the same as a SKOS concept scheme |
| `feldregister.schema.json` | JSON Schema der Liste · JSON Schema of the list |

```js
const register = require('@vivodepot/feldregister');
register.felder.find((f) => f.kennung === 'identity.familyName').label.en;
```

## Status

`permanent` gilt unverändert · applies unchanged; `deprecated` gilt, nicht mehr empfohlen · still applies, discouraged;
`obsoleted` abgelöst, Nachfolger in `nachfolger` · superseded, see `nachfolger`. Eine Kennung wird nie gelöscht · an
identifier is never removed.

## Versionen · Versions

MINOR: neue Kennung oder geänderter Status · new identifier or changed status. PATCH: nur Beschriftungen · labels only.
Jede Fassung bleibt auch unter `https://register.vivodepot.de/v<kern>/feldregister.json` abrufbar.

## Lizenz · License

CC0 1.0 Universal (`LICENSE`). {{quellenhinweis}}

---

{{herausgeber}} · {{version}}
