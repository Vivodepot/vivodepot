# @vivodepot/feldregister

Das Feldregister von Vivodepot: dauerhafte Kennungen für Angaben in persönlichen Datendepots, mit Beschriftungen auf
Deutsch und Englisch. Jede Kennung hat eine feste Adresse: `https://register.vivodepot.de/feld/<kennung>`.

The Vivodepot field register: permanent identifiers for items in personal data depots, labelled in German and English.
Every identifier has a permanent address: `https://register.vivodepot.de/feld/<identifier>`.

Die Bedeutung einer Angabe steht einmal hier; ein Austausch trägt nur den Wert und die Kennung. Wie ein Strichcode,
der das Produkt bezeichnet, ohne den Katalog mitzuführen: „A barcode identifies the product without carrying the
catalogue“ (Tito Castillo, „FHIR Is Not the Problem. But We May Be Asking It to Solve the Wrong One.“, LinkedIn, 04.10.2026).

The meaning of an item is defined once, here; an exchange carries only the value and the identifier, the way a barcode
points to a catalogue entry instead of carrying it (after Tito Castillo, LinkedIn, 4 October 2026).

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
