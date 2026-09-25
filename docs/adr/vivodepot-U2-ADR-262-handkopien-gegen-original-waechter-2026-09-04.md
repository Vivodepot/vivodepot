# U2-ADR-262: Handkopien von Kern-Konstanten bekommen einen Wächter

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** WÄCHTER
**Linie:** U2
**U2-Bezug:** U2-ADR-255 (Rechtsraum-Feld an Format-Modulen), U2-ADR-257 (FORMAT_SCHREIBER) —
beide fügten `vivodepot.html` ein neues `FORMAT_MODUL_SCHLUESSEL`-Feld hinzu, ohne dass die
Handkopie in `vivodepot-template-generator.html` nachgezogen wurde. U2-ADR-096 §5/N2 Zug 3
(08.08.2026) — die fünf Notfallkarten-Felder, die dieselbe Lücke in `vivodepot-lesen.html` zeigte.
U2-ADR-218 (Hüllen-Wächter) und U2-ADR-249 (`.vdkey`-Allowlist) — dieselbe Bauart am selben Tag:
ein Stück existiert in mehreren Kopien, unbewacht, bis eine davon nachweisbar zurückfällt.
**Anker:** Auftrag vom 04.09.2026, „Handkopien von Kern-Konstanten bekommen einen Wächter").
**Status heute:** gilt — Beleg `tests/handkopien-gegen-original.test.js`.

---

## Kontext

`vivodepot-template-generator.html` und `vivodepot-lesen.html` sind eigenständige HTML-Dateien
mit eigenem, inline `<script>`-Block — sie können `vivodepot.html` nicht `require()`n oder
importieren. Wo eine Konstante aus dem Kern auch dort gebraucht wird, steht sie darum als
**Handkopie**: von Hand ein zweites Mal getippt, unter demselben Namen.

Gemessen wurde eine bereits eingetretene Drift: `FORMAT_MODUL_SCHLUESSEL` (Liste der erlaubten
Top-Level-Schlüssel eines Format-Moduls, benutzt um unbekannte Schlüssel zu verwerfen) führte im
Kern 18 Einträge, in der Generator-Kopie nur 16 — `rechtsraum` (U2-ADR-255, 04.09.2026) und
`schreiber` (U2-ADR-257, 04.09.2026) fehlten. Eine zweite, unabhängige Drift derselben Bauart:
`NOTFALL_KERN_FELDER` (die Felder der Notfallkarte) führte im Kern 16 Einträge, in der Lese-App-
Kopie nur 10 — die fünf Felder aus N2 Zug 3 (08.08.2026, implantierte Geräte, Körpergewicht,
Krankenkasse, Hausarzt) und ein sechstes (bevollmächtigte Person) fehlten seit ihrem Bau, fast
einen Monat unbemerkt. Die Lese-App rendert daraus ihr eigenes, „faithful, read-only"
Notfallkarten-Modell — die Lücke war keine kosmetische, sondern eine echte Auslassung an
sicherheitsrelevanten Feldern im Ernstfall.

**Keiner der beiden Fälle hatte einen Wächter, der die zwei Kopien gegeneinander hielt.** Beide
wurden nur durch gezieltes Nachmessen dieses Auftrags gefunden, nicht durch eine rot gewordene
Probe.

## Was NICHT unter diesen Wächter fällt — mit Grund

- **Der gepinnte Krypto-Block** (`tools/krypto-block-propagation-pruefen.js` hält ihn bereits
  byte-identisch über sechs Träger — eine zweite Prüfung wäre redundant).
- **`TRUST_AUTHORITY_PUBLIC_JWK`** (`tests/lese-app-zertifikate.test.js`, feldweiser Vergleich)
  und **`WIDERRUFS_LISTE`** (`tools/build-widerrufsliste.js`, generierte Region + eigenes Gate) —
  beide bereits eigens gehalten, keine unbewachte Handkopie.
- **`STRINGS`/`SEKTOREN`/`SITUATIONEN`** und die übrigen großen Registry-Inhalte — ihre Kongruenz
  ist (teilweise) Gegenstand der `paritaet-kern-lese`-Testfamilie bzw. als offene Lücke bereits
  dokumentiert (`tests/etappe2c-situationen-weglassen.test.js`); ein vollständiger struktureller
  Abgleich dieser Größenordnung ist ein eigener Zug.
- **`LISTEN_AUSWAHLFORM`** (Kern) — Werte hängen von `_rechtsraumKatalogLesen()` ab, keine
  in-sich-geschlossene literale Aufzählung.
- **`schreiber` innerhalb `FORMAT_MODUL_SCHLUESSEL`** — s. eigener Abschnitt unten. Eine benannte,
  keine stille Ausnahme.

## Entscheidung

**Ein neues Werkzeug, `tools/handkopien-gegen-original-pruefen.js`, hält jede geführte Handkopie
gegen ihr Original — strukturell, nicht zählend:** jeder Fehlbestand wird NAMENTLICH gemeldet
(„`schreiber` fehlt in der Kopie in Datei X"), nicht als Längen- oder Zählervergleich. Fünf
Vergleichsarten: `wert` (Primitiv, strikte Gleichheit), `liste` (Array, Mengenvergleich),
`objekt` (Schlüssel-für-Schlüssel, RegExp über Textform), `liste-von-objekten` (Mengenvergleich
über stabile Objekt-Schlüssel), `werte-aus-objekt` (Original ist ein Objekt, die Kopie führt
dessen `Object.values()`).

**Nur `git ls-files`-geführte Dateien werden gelesen** — eine gitignorierte, nie committete
Fassung soll nicht nur auf einer Maschine rot werden.

**Die Registry führt 23 Einträge, 26 Original-Kopie-Paare, über fünf Träger**
(`vivodepot-template-generator.html`, `vivodepot-lesen.html`, `vivodepot-vc-issuer.html` für
`JWS_ALG_FALLBACK`/`AUSGABESTELLE_ANBIETERTYP`, und zwei `tools/`-Node-Skripte —
`tools/herausgeber-onboarding-dienst.js`, `tools/depot-umschlag-diagnose.js`), jeder
Deklarationstext per Regex extrahiert (dieselbe Form wie `konstantenWert()` in `tools/
krypto-block-propagation-pruefen.js`) und über `new Function()` isoliert ausgewertet — nur für
Deklarationen, die eine in-sich-geschlossene literale Aufzählung sind.

**Der Fokus lag zunächst auf den vier HTML-/JWS-Trägern** (Generator/Lesen/vc-issuer), auf denen
der Anlassfund selbst stand. Eine Nachfrage während einer Warte-Etappe dieses Baus („deckt
der Wächter alle Fälle ab, oder nur die, an denen er entstanden ist?") führte zu einem zweiten,
gezielten Durchlauf über `tools/*.js` und `scripts/*.js` — dort fanden sich zwei weitere, echte
Handkopien, beide jetzt mit aufgenommen (s. u.). Ein vollständiger Durchlauf über JEDE denkbare
Handkopie im Repo (auch die bereits an anderer Stelle gehaltenen, s. Abschnitt oben) blieb
außerhalb dieses Baus — die Registry wächst additiv, wenn der nächste Fund auftaucht.

### Die vier gefundenen Driften/Lücken — geschlossen bzw. gedeckt

1. **`FORMAT_MODUL_SCHLUESSEL`** (`vivodepot-template-generator.html`): `rechtsraum` nachgezogen,
   inklusive der passenden Typprüfung in `formatModulPruefen` (Mirror der Kern-Zeile — optional,
   nur `typeof`-Prüfung, keine Wertliste dahinter im Kern selbst).
2. **`NOTFALL_KERN_FELDER`** (`vivodepot-lesen.html`): die sechs fehlenden Einträge nachgezogen,
   wortgleich zum Kern.
3. **`AUSGABESTELLE_ANBIETERTYP`** (`vivodepot-vc-issuer.html`, `tools/
   herausgeber-onboarding-dienst.js`): heute keine Drift, aber bisher ungedeckt — drei Kopien
   (Kern + zwei weitere), keine geprüft. Das Werkzeug lädt bereits `ladeIssuer()`
   (`tests/load-issuer.js`) und könnte den Wert von dort beziehen, statt ihn erneut zu tippen —
   nicht in diesem Bau geändert, nur benannt.
4. **`KRYPTO_VERSION_ALLOWLIST`-Kopie in `tools/depot-umschlag-diagnose.js`**: die Kopie trägt
   den Kommentar „von Hand synchron gehalten, s. Test" — der zitierte Test existiert nicht
   (`tests/depot-umschlag-diagnose.test.js` referenziert `KRYPTO_VERSION_ALLOWLIST` an keiner
   Stelle, gemessen per grep). Der Kommentar versprach eine Deckung, die es nie gab — heute keine
   Drift, aber bis zu diesem Bau ungeprüft.

### Die eine benannte Ausnahme: `schreiber`

`schreiber` bleibt **bewusst** aus `FORMAT_MODUL_SCHLUESSEL` in der Generator-Kopie ausgenommen.
Geprüft, nicht nur behauptet: Der Kern validiert einen genannten Schreiber gegen
`schreiberAufloesen()`/`FORMAT_SCHREIBER` — ein Register mit echten Schreibfunktionen
(`schreib: (wert) => JSON.stringify(...)`, `schreib: (wert) => _objektAlsXmlDokument(wert)`), kein
bloßes Namens-Array. Der Generator hat kein gespiegeltes `FORMAT_SCHREIBER_BEKANNT` und keine
entsprechende Wertprüfung.

**Der Mechanismus, gegen den echten Code geprüft:** `formatModulPruefen` sammelt unbekannte
Top-Level-Schlüssel in `verworfene`, OHNE das Modul deswegen abzulehnen — die Funktion liefert am
Ende trotzdem `gueltig: true`. Heute wird `schreiber` als `{schluessel:'schreiber', grund:
'unbekannt'}` in `verworfene` sichtbar, der Wert selbst bleibt ungeprüft (aber die LÜCKE ist
sichtbar). Nähme die Liste `schreiber` ohne Weiteres auf, verschwände genau diese Meldung — jeder
Schreiber-Wert, gültig oder nicht, würde stillschweigend akzeptiert, weil kein Prüfzweig für ihn
existiert. Das wäre eine Verschlechterung, keine Reparatur.

**Der Wächter selbst kennt diese Ausnahme namentlich** (`ausnahmen: ['schreiber']` an der Registry-
Zeile) — er meldet sie als „gleich (benannte Ausnahme: `schreiber`)", nicht als Fehlschlag und
nicht schweigend. Wird `FORMAT_SCHREIBER_BEKANNT` samt Wertprüfung je gespiegelt, gehört
`schreiber` in die Liste und die Ausnahme fällt weg — bis dahin bleibt sie hier dokumentiert.

## Konsequenzen

Jede künftige neue Format-Modul- oder Notfallkarten-Feld-Erweiterung im Kern, die eine der
geführten Kopien betrifft, wird ab jetzt rot, bis die Kopie nachgezogen ist — dieselbe Klasse
Sicherheitsnetz wie der Hüllen-Wächter (U2-ADR-218) für die Kryptoschicht. Eine künftige
Erweiterung der Registry (neuer Handkopie-Fund) ist additiv; keine der fünf Vergleichsarten
verlangt eine Änderung an bestehenden Einträgen.

**Was dieser ADR ausdrücklich nicht entscheidet:** ob/wann `FORMAT_SCHREIBER_BEKANNT` samt
Wertprüfung im Generator gebaut wird — das bleibt ein eigener, künftiger Zug.

## Konformität

```konformitaet
aussage:  Jede in der Registry geführte Handkopie stimmt strukturell mit ihrem Original überein —
          Fehlbestände werden namentlich gemeldet, nicht nur gezählt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/handkopien-gegen-original.test.js#[U2-ADR-262] jede geführte Handkopie stimmt mit ihrem Original überein
```

```konformitaet
aussage:  `schreiber` ist in der FORMAT_MODUL_SCHLUESSEL-Registry-Zeile eine benannte Ausnahme —
          der Wächter kennt sie und meldet sie sichtbar, statt sie stillschweigend zu ignorieren.
zustand:  geprüft
herkunft: invariante
pruefung: tests/handkopien-gegen-original.test.js#[U2-ADR-262 · Gegenprobe] `schreiber` ist eine benannte, keine stille Ausnahme
```

```konformitaet
aussage:  Für jede der fünf Vergleichsarten (wert/liste/objekt/liste-von-objekten/
          werte-aus-objekt) wird ein Fehlbestand über eine Fixture nachweisbar rot, benennt Original-
          und Kopie-Datei und den genauen Unterschied.
zustand:  geprüft
herkunft: invariante
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: liste — ein fehlender Schlüssel in der Kopie wird benannt gefunden
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: liste — ein zusätzlicher Schlüssel NUR in der Kopie wird benannt gefunden
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: liste — eine benannte Ausnahme feuert nicht rot
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: wert — ein abweichender Primitivwert wird benannt gefunden
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: objekt — ein abweichender Schlüsselwert wird benannt gefunden
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: objekt — ein fehlender Schlüssel in der Kopie wird benannt gefunden
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: objekt — RegExp-Werte werden über ihre Textform verglichen
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: liste-von-objekten — fehlende Einträge werden benannt gefunden
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] art: werte-aus-objekt — ein fehlender Wert wird benannt gefunden
```

```konformitaet
aussage:  Nur von git verfolgte Dateien fließen in den Vergleich ein — eine lokale, nie committete
          Fassung wird benannt übersprungen, nicht stumm ignoriert und nicht als Fehlschlag der
          geprüften Kopie gedeutet.
zustand:  geprüft
herkunft: invariante
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] eine nicht von git geführte Datei wird benannt übersprungen, nicht stumm ignoriert
pruefung: tests/handkopien-gegen-original.test.js#[Negativprobe] ein fehlendes Original wird benannt gefunden, nicht als leere Kopie gedeutet
```

---

*Vivodepot GmbH · Berlin · 04.09.2026*
