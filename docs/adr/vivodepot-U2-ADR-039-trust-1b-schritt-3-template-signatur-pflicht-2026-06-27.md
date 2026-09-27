# U2-ADR-039 — Trust-1B Schritt 3: Anbieter-Template-Signatur Pflicht (Ende der additiven Toleranz)

**Datum:** 27.06.2026
**Status:** Akzeptiert · 27.06.2026 (Produktentscheidung) · Umgesetzt 27.06.2026 (Commit „Schritt 3"). Schaltet die letzte Stufe der Trust-Strecke 1B scharf.
**Nummer:** U2-ADR-039 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-038).
**Typ:** Grundsatz-Entscheidung (Trust-Strategie) — bewusster Politik-Bruch der additiven Toleranz.
**Bezug:** Trust-1B Schritt 1/2 (`71812c1`/`93f2943`/`e49df80` — zweistufige Signatur-Kette, additiv-tolerant); U2-ADR-037 (Stufe 1: Template-Definitionen im Cert durchgereicht); `importPlanGeprueft` (vivodepot.html); `baueProviderVC` (vivodepot-vc-issuer.html); `_verifyJWS` (JWS-Block, byte-identisch über vier Komponenten); AAD-Audit 27.06.2026.

**Status heute:** gilt — Beleg `tests/trust-1b-schritt3-pflicht-signatur.test.js`.

---

## Kontext

Trust-1B baut eine zweistufige Kette: die Trust-Authority zertifiziert die Anbieter-Identität + den Anbieter-Public-Key (Provider-Credential, TA-signiert), und der Anbieter signiert sein **Template** separat mit dem eigenen Schlüssel (`templateJws`). Schritt 1/2 haben die Empfänger-Prüfung dieser Template-Signatur **additiv-tolerant** eingeführt: liegt `opts.templateJws` vor, wird es gegen `credentialSubject.publicKeyJwk` geprüft; **fehlt es, lief das im Cert eingebettete Plain-`template` ungeprüft ins Rendern**. Stufe 1 (U2-ADR-037) hatte den Cert zusätzlich die Template-Definitionen tragen lassen (durchreichen statt verwerfen).

Die Lücke: ein Anbieter-Template, das **nicht** separat anbieter-signiert ist, konnte trotzdem Feld-Definitionen und Render-Struktur bestimmen — allein gestützt auf die TA-Zertifizierung der *Identität*, nicht auf eine Anbieter-Signatur des *Templates*. Das untergräbt die zweistufige Trennung (TA bürgt für Identität; Anbieter bürgt für Template).

## Entscheidung

**Die Anbieter-Template-Signatur (`templateJws`) wird Pflicht.** Ein Anbieter-Template ohne gültige `templateJws` wird nicht mehr gerendert. Zwei Komponenten-Berührungen, plus die geteilte Schema-Beschreibung:

1. **Empfänger** (`importPlanGeprueft`, vivodepot.html): Liegt **keine** `templateJws` vor, aber ein `cs.template`, wird das ungeprüfte Plain-Template **verworfen** (`template` → `null`, namentlich in `verworfeneFelder`). Die unabhängig TA-cert-attestierten Werte (`cs.felder`) laufen **unverändert weiter**.
2. **Issuer** (`baueProviderVC`, vivodepot-vc-issuer.html): bettet **kein** Plain-Template mehr in den Cert ein. Das Template reist ausschließlich als anbieter-signiertes `templateJws`-Bundle.
3. **Submission-Schema** (drei Kopien, Lockstep): die `templateJws`-Beschreibung „Optional/additiv — fehlt es, gilt das Plain-`template`" → „PFLICHT … ohne gültige templateJws wird ein mitgeliefertes Plain-`template` verworfen".

**Variante A (strippen, nicht ablehnen):** Verworfen wird nur das *Template*, nicht der ganze Import — die `cs.felder` sind durch das TA-zertifizierte Cert unabhängig signiert und bleiben vertrauenswürdig. Das spiegelt das bestehende Verhalten bei *strukturell* ungültigem Template (`validateTemplate` → `template: null`, Claims durch).

**Wichtige Unterscheidung — unsigniert ≠ falsch-signiert:** Eine **vorhandene, aber kryptografisch ungültige** `templateJws` bleibt ein **harter Abbruch** (ganzer Import `ungueltig`). Eine falsche Signatur ist ein Manipulations-Signal (Klasse T-CROSS-05), kein bloßes „unsigniert" — sie wird nicht zu „strippen" abgeschwächt.

## Begründung

- **Die zweistufige Kette wird erst hier echt:** ohne Pflicht-Signatur bürgt niemand für das Template selbst. Schritt 3 schließt das.
- **Variante A statt Voll-Ablehnung:** die attestierten Werte sind unabhängig vom Template cert-signiert; sie mit dem Template zu verwerfen wäre Datenverlust ohne Sicherheitsgewinn.
- **Strippen ≠ Abbruch bei falscher Signatur:** Datensparsamkeit/Nützlichkeit beim *Fehlen*, Härte beim *Angriff*.
- **In-App-Vorlagen unberührt:** die eingebauten `STANDARD_VORLAGEN` (1E) werden direkt gerendert, **nicht** über `importPlanGeprueft` importiert — das Scharfschalten bricht das 1E-Rendering nicht und ist unabhängig von der Produktiv-Signierung der vier amtlichen Vorlagen.
- **Kein Krypto-Touch:** Schritt 3 fasst nur Gate-Logik + Issuer-Embedding + Schema-Text an — VdCrypto-Block und JWS-Block bleiben byte-identisch.

## Konsequenzen

- **Empfänger:** `importPlanGeprueft` — neuer `else`-Zweig strippt unsigniertes Template; Grund in `verworfeneFelder` (`template-ungueltig`, Detail „ohne Signatur").
- **Issuer:** kein Plain-Template-Embedding mehr; `opts.template` bleibt für die Symmetrie durchgereicht, wird aber nicht eingebettet.
- **Schema ×3** (vc-issuer.html, template-generator.html, kanonische submission-schema.json): Beschreibung nachgezogen, byte-gleich (T-CROSS-08).
- **Tests:** neuer Test „signierter Import mit Plain-Template ohne `templateJws` → Template verworfen, Claims durch"; `vc-issuer.test.js` Embedding-Erwartung umgekehrt (Cert trägt kein Template mehr). Unberührt: `sicherheit-block-c` (template-frei), `feldmodell-validate-template`/`trust-1b-*`/`energie-pilot` (tragen `templateJws`).
- **Distribution:** echte Anbieter-Bundles brauchen jetzt zwingend `templateJws`. Die Produktiv-Signierung der vier 1E-Vorlagen (Anbieter-Key, KEY tabu) ist Voraussetzung für deren Verteilung als **Import**-Bundle — nicht für das In-App-Rendering.
- **Gates:** VdCrypto-Block-Hash + JWS-Block unverändert; `vivodepot.html.sha256` nachgezogen; Suite grün.

## Konformität

```konformitaet
aussage:   Ein Anbieter-Template ohne gültige `templateJws` wird verworfen (`template` → null),
           während die unabhängig TA-cert-attestierten `cs.felder`-Werte unverändert weiterlaufen
           (Strippen, nicht Voll-Ablehnung).
zustand:   prüfbar
pruefung:  tests/trust-1b-schritt3-pflicht-signatur.test.js#Schritt 3: Cert mit eingebettetem Plain-Template OHNE templateJws → Template verworfen, Werte laufen weiter
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
