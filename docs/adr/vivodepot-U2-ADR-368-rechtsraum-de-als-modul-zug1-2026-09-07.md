# U2-ADR-368 · Rechtsraum DE wird ein Modul, wie Sprache — Zug 1: heben und verdrahten, nicht umschalten

**Status heute:** gilt
**Datum:** 07.09.2026
**Betrifft:** der frühere Erzeuger `rechtsraum-de-modul-erzeugen` (mit dem Gerüst-Schnitt S3 entfallen) (neu), `tools/rechtsraum-de-modul.json` (neu),
`tests/rechtsraum-de-modul.test.js` (neu), `vivodepot.html` (Boot-Verdrahtung von Weg A),
`tools/produkt-konfektionieren.js` (Dokumentation, keine Funktionsänderung)
**Bezug:** U2-ADR-285 (Weg A/`_rechtsraumGeruestModulLaden`, Test-Schlüssel-bewiesen, bis heute
unverdrahtet), U2-ADR-352/„E1 Teil 1" (`RECHTSRAUM_KATALOG` aus `BUERGERMODUL_BUENDEL`
materialisiert), U2-ADR-359 (dasselbe Muster für Sprache, wörtliches Vorbild),
U2-ADR-040/1E (`STANDARD_VORLAGEN_CERTS`/`basisVorlagenVerifizieren`, die Boot-Form, die dieser
Zug wiederverwendet)

---

## 1 · Der Auftrag

Die Definition of Done nennt fünf Modulachsen: *„Gerüst + Modul privat + Modul
Sprache deutsch + Modul Rechtsraum deutsch + Branding und UX."* Sprache Deutsch wurde in
U2-ADR-359 gehoben. Rechtsraum Deutschland war die letzte der fünf, die noch fehlte — Deutschland
lag als nativer `RECHTSRAUM_KATALOG` im Kern (seit U2-ADR-352 aus dem Bündel materialisiert),
nicht als eigenes, andockbares Modul.

**Ausdrückliche Auflage:** den nativen `RECHTSRAUM_KATALOG`-Rückfall NICHT entfernen. Er bleibt,
bis der Modulweg mit einem ECHTEN, tatsächlich ausgestellten Zertifikat trägt.

## 2 · Warum Weg A, nicht Weg B

Zwei Präzedenzfälle standen zur Wahl, mit entgegengesetztem Sicherheitsmodell:

- **Weg B** (`_textsatzModulPruefenGeruest`, U2-ADR-285/359 für Sprache): keine Signaturpflicht,
  Sicherheit ist „Abwesenheit eines Aufrufers", von einer Ratsche erzwungen. Passt zu Sprache,
  wo ein falscher Text kein Rechtsrisiko trägt.
- **Weg A** (`_rechtsraumGeruestModulLaden`, U2-ADR-285 für Rechtsraum): volle JWS-Signaturkette
  gegen einen TA-Anker, isolierte Registry, mit einem Test-Schlüssel bereits bewiesen
  (`tests/u2-adr-285-rechtsraum-geruest-modul.test.js`), aber bis heute nirgends aufgerufen außer
  aus Tests.

**Produktentscheidung:** Weg A. Rechtsraum trägt Fristen- und
Formvorschriften mit echter Rechtsfolge (§-Verweise, Sechs-Monats-Fristen) — ein falscher Inhalt
ist kein Stilfehler wie bei Sprache, sondern ein Rechtsrisiko. Die Signaturpflicht bleibt.

## 3 · Der Bau — drei Stellen, wörtlich benannt

### 3.1 Der Inhalt: der frühere Erzeuger `rechtsraum-de-modul-erzeugen` (mit dem Gerüst-Schnitt S3 entfallen)

Wörtlicher Spiegel von `tools/textsatz-de-modul-erzeugen.js` (U2-ADR-359): **erfindet nichts**,
liest jeden der sechs Typen (`vorsorgevollmacht`, `betreuungsverfuegung`,
`patientenverfuegung`, `ki-verfuegung`, `testament`, `ehegattennotvertretung`) direkt aus dem
bereits materialisierten `RECHTSRAUM_KATALOG` im Kern und führt die Form zusammen: `zweck` liegt
im Katalog eine Ebene ÜBER `.DE` (rechtsraumunabhängig), im Modul dagegen — wie
`_rechtsraumModulUebersetzen` es liest — flach neben `katalogVersion`/`wortlaut`/
`formvorschriften`/`fristenVorrang`. Zwei Formen für denselben Inhalt, keine zweite Wahrheit.

Anders als beim Sprachmodul musste keine neue, aufruferlose Prüffunktion gebaut werden — Weg A
(`validateRechtsraumModul(modul, {erlaubtGeruestEigenesDE:true})`) existierte bereits seit
U2-ADR-285, nur ungenutzt. Alle sechs Typen bestehen die Prüfung, kein Typ wird verworfen
(`_rechtsraumModulUebersetzen` prüft jeden Typ gegen den `tpl_`-Namensraumschutz — hier
unnötig, weil alle sechs bereits bekannte Katalog-Typen sind, kein neuer Typ).

### 3.2 Die Boot-Verdrahtung: `vivodepot.html`

Neu: `_RECHTSRAUM_GERUEST_MODUL_VIVODEPOT_DE_JWS` (Platzhalter-Konstante, `null` — derselbe Begriff
wie `templateJws: null` bei `STANDARD_VORLAGEN`) und `_rechtsraumGeruestModulBooten()`, am
Boot-Ende hinter `basisVorlagenVerifizieren()` angehängt, wörtlich derselben feuer-und-vergiss-
Form:

```js
try { _rechtsraumGeruestModulBooten().catch(() => {}); } catch (_) {}
```

Weg A ist damit **verdrahtet, aber tot**: der Aufruf läuft bei jedem Boot, bricht aber sicher ab,
weil ZWEI unabhängige Leerstellen bestehen — die eingebettete JWS-Konstante ist `null`, UND die
Cert-Tabelle `_RECHTSRAUM_GERUEST_MODUL_CERTS` ist weiterhin `Object.freeze({})`. Jede der beiden
allein reicht, den Boot-Aufruf folgenlos zu machen.

### 3.3 „Der dritte Ort" — geprüft, keine Funktionsänderung nötig

Der Auftrag benannte `tools/produkt-konfektionieren.js` als dritte zu bauende Stelle. **Geprüft statt
angenommen:** eine Funktionsänderung dort wäre falsch. `produkt-konfektionieren.js` kopiert
`vivodepot.html` byte-identisch über alle vier Produkte (Privat/Pro × DE/EN,
U2-ADR-361) — Weg A lebt als Gerüst-Konstante INNERHALB dieser byte-identischen Datei, nicht als
per-Produkt-Argument. Rechtsraum=Deutschland gilt für alle vier Produkte GLEICH (nur Sprache
variiert zwischen ihnen) — ein `--bundle`-Eintrag für Rechtsraum wäre sogar der falsche Weg: er
liefe über `modulEinlassenGeprueft`, das denselben `EINLASS_REGISTER`-Prüfer bindet, der
`rechtsraum:'DE'` ausnahmslos ablehnt (geprüft in
`tests/u2-adr-285-rechtsraum-geruest-modul.test.js`).

Statt einer Funktionsänderung: ein Dokumentationsabschnitt im Kopf-Kommentar von
`produkt-konfektionieren.js`, der das benennt — damit ein künftiger Leser nicht annimmt, hier
fehle etwas.

## 4 · Der Wächter, der diesen Zug trägt

`tests/rechtsraum-de-modul.test.js`, acht Proben:

- **Erzeuger erfindet nichts:** jeder der sechs Typen inhaltsgleich mit `RECHTSRAUM_KATALOG`,
  die committete `.json` = Live-Stand von `baueModul()` (Frische-Probe).
- **Weg A end-to-end, mit dem Test-Zertifikat:** das erzeugte Modul wird angenommen, ist über die
  Registry lesbar.
- **Roter Beweis:** ein VERFÄLSCHTES Zertifikat (Payload nach der Signatur verändert) wird
  abgelehnt — `r.grund` benennt den Grund, kein stiller Fallback.
- **Der native Katalog gewinnt trotzdem:** mit einem erfolgreich geladenen Gerüst-Modul bleibt
  `_rechtsraumKatalogLesen` beim nativen Katalog — das ausgelieferte Produkt ändert sich um
  nichts, die Produktauflage bleibt beweisbar wahr, nicht nur behauptet.
- **Boot-Leerlauf:** `_rechtsraumGeruestModulBooten()` ist aufrufbar, bricht ohne echte Nutzlast
  sicher ab, die Cert-Tabelle bleibt leer.

Alle acht grün, plus die komplette bestehende U2-ADR-285-Suite (7/7) und die betroffenen
Register-/VDK-Suiten (70/70 insgesamt) unverändert grün — keine Regression.

## 5 · Der Umschalt-Zug, ausdrücklich NICHT Teil dieser Landung

Zwei Dinge fehlen noch, benannt statt verschwiegen, bis Weg A im Betrieb wirkt:

1. **Das echte TA-Zertifikat.** Ein eigener, manueller Akt (TA-Anker-Schlüssel) — kein
   Tool-Skript kann oder darf es herstellen. Füllt `_RECHTSRAUM_GERUEST_MODUL_CERTS`.
2. **Die echte, signierte Nutzlast.** Derselbe Akt, derselbe Schlüssel — ersetzt die `null`-
   Platzhalter-Konstante `_RECHTSRAUM_GERUEST_MODUL_VIVODEPOT_DE_JWS` durch den echten JWS.

Erst wenn BEIDE gefüllt sind, lädt Weg A beim Boot wirklich — und selbst dann ändert sich am
ausgelieferten Produkt nichts, weil der native Katalog weiterhin zuerst gefragt wird
(`_rechtsraumKatalogLesen`, unverändert). Der eigentliche Umschalt-Zug — den nativen
`RECHTSRAUM_KATALOG`-Rückfall entfernen, sodass das Produkt seinen Rechtsraum tatsächlich AUS DEM
MODUL bezieht statt nur daneben zu tragen — ist eine eigene, spätere Produktentscheidung,
NICHT Teil dieses Zugs. Er berührt genau drei Stellen, hier vorab benannt: den Boot-Aufruf (3.2,
bleibt gleich), `_rechtsraumKatalogLesen` (Lesereihenfolge umkehren oder nativen Zweig entfernen)
und den nativen `RECHTSRAUM_KATALOG` selbst (Rückfall streichen).
