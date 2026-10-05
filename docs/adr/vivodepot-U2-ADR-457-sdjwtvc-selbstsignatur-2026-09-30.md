# U2-ADR-457: SD-JWT VC mit Selbst-Signatur der Halterin

**Status:** Angenommen (01.10.2026)
**Datum:** 30.09.2026
**Kategorie:** KRYPTO, STANDARDS, EUDI
**Linie:** U2
**Bezug:** U2-ADR-030 (Selbstauskunft, Variante A: unsigniert; hier für die kompakte Form abgelöst) · U2-ADR-080 (das Tor für
fremde Aussteller bleibt zu) · U2-ADR-097 und -216 (Vivodepot hält Nachweise, stellt keine aus) · B16-ADR-030
(Feature-Erkennung statt Versionsgrenze) · B16-ADR-065 (Ed25519 primär)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Die kompakte SD-JWT-Form, die der Dialog „An EUDI-Wallet übergeben“ erzeugt, trug `alg: none`. Die sichtbaren Exporte
`sd-jwt-vc-identitaet`, `-finanzen` und `-sozialversicherung` schrieben trotz ihres Namens JSON (`{ vct, iss, iat, claims }`). RFC 9901 §4.1 verlangt eine
Signatur des Ausstellers und schließt `none` aus; Holder und Verifier dürfen `none` nicht annehmen (§7.1 Schritt 2a, §7.3
Schritt 5b). Die Form war damit kein SD-JWT. Einen Signaturschlüssel der Halterin gab es im Kern nicht.

## Entscheidung

Entschieden am 30.09.2026 (Weg b1), vorher unabhängig gegengelesen; die Auflagen der Gegenlesung sind
eingearbeitet.

1. **Selbst signiert, formkonform, Vertrauen null ohne Institutionssignatur.** Die kompakte Form ist ein SD-JWT im Sinne von
   RFC 9901 §4.1. Ein SD-JWT-VC-Prüfer nach draft-ietf-oauth-sd-jwt-vc-19 lehnt den Aussteller trotzdem ab: Er muss den Schlüssel
   über ein https-`iss` mit Metadaten oder eine x5c-Kette einer Stelle zuordnen, und beides gibt es hier nicht. Das ist gewollt.
   Vertrauen entsteht nur über die Signatur einer Institution, und die bleibt das Geschäftsmodell; die Selbst-Signatur ersetzt
   sie nicht. Außentexte sagen „selbst signiert“, nie „verifizierbar“ ohne diesen Zusatz.
2. **Schlüssel aus dem Passwort, nirgends gespeichert.**
   - HKDF-SHA-256 aus dem Sitzungsschlüssel mit dem Depot-Salt und eigener Domäne `vivodepot/v4/halter-signatur/<depotUUID>`,
     getrennt von Depot- und Adressschlüssel.
   - Die 32 Byte sind der Ed25519-Seed. Er wird als PKCS#8 importiert (RFC 8410: festes Präfix + Seed).
   - Der private Schlüssel ist nicht extrahierbar. Seed und PKCS#8-Puffer werden überschrieben.
   - Die Ableitung liegt in der VdCrypto-Hülle (`VdCrypto.halterSignatur`); der Aufrufer hält den Sitzungsschlüssel nie.
3. **Der öffentliche Schlüssel, ohne extrahierbaren Import** (Krypto-Gegenlesung 01.10.2026, Fassung v865). U2-ADR-062 verbietet
   jeden extrahierbaren Import eines privaten Schlüssels (Wächter `u2-062-geheime-schluessel-nie-extrahierbar`). WebCrypto liefert
   den öffentlichen Schlüssel eines nicht extrahierbaren Ed25519-Schlüssels nicht. Darum:
   - Der private Schlüssel wird nur nicht extrahierbar importiert, allein für `sign`.
   - Den öffentlichen Schlüssel berechnet eine eingebettete Bibliothek aus einer Kopie des Seeds (`getPublicKey`), siehe
     „Bibliothek“ unten. Genau eine Stelle im Kern reicht sie hinein (`_halterSignaturHolen`), gezählt in
     `tools/krypto-aufrufer-grundlinie.json`. Aus der Bibliothek wird nur `getPublicKey` genutzt.
   - **Selbstprobe im gepinnten Block:** Eine feste, domänengetrennte Nachricht (`vivodepot-halter-selbstprobe-1/` plus
     depot-uuid) wird mit dem WebCrypto-Schlüssel signiert und mit WebCrypto `verify` gegen das berechnete `x` geprüft, nicht
     mit der Bibliothek. Scheitert sie, gibt es keinen Schlüssel und keinen Rückfall.
   - Seed, Kopie und PKCS#8-Puffer werden im `finally` überschrieben, auch im Fehlerfall: bestmöglich gelöscht (unsere Kopien).
     Byte-Kopien und BigInt-Zwischenwerte der Bibliothek (Seed-Kopie, SHA-512-Ergebnis mit Skalar und prefix) sind nicht löschbar
     und bleiben bis zur Speicherbereinigung; sie sind so geheim wie der Seed.
   - Die Bibliothek hängt als nicht überschreibbare, nicht löschbare globale Eigenschaft (`vdNobleEd25519`, writable und
     configurable false): ein anderes Skript desselben Ursprungs kann die Funktion, die den Seed sieht, nicht ersetzen.
   - Die Ableitung läuft bei jeder signierten Ausgabe neu, lokal im Browser, ohne Gegenüber, das ihre Zeit messen könnte.
     Signiert wird mit WebCrypto.
4. **Kurve Ed25519, alg `Ed25519`.**
   - RFC 9864 (Oktober 2025) registriert `Ed25519` in §4.1.1 und setzt `EdDSA` in §4.1.2 auf „Deprecated“. Neue Signaturen
     tragen darum `Ed25519`; `EdDSA` wird weiter gelesen.
   - Gemessen am 30.09.2026: ein P-256-Schlüssel aus einem abgeleiteten Skalar ohne öffentlichen Punkt ließ sich nur in
     Chromium importieren, nicht in Firefox 153 (`OperationError`) und WebKit 26.5 (`DataError`). Ed25519 aus dem Seed ging in
     allen drei. ES256 wäre mit b1 nur über selbst geschriebene Kurvenarithmetik baubar und scheidet aus.
   - Browser-Unterstützung Ed25519 in WebCrypto: Chrome 137, Firefox 129, Safari 17 (MDN browser-compat-data 8.1.3).
5. **Kopf und Nutzlast.**
   - Kopf: `alg` `Ed25519`, `typ` `dc+sd-jwt`, `kid` = JWK-Thumbprint nach RFC 7638, `jwk` = der öffentliche Schlüssel.
   - Nutzlast: `cnf.jwk` = derselbe Schlüssel (RFC 9901 §4.1.2), denn Halterin und Ausstellerin sind dieselbe. `iss` bleibt
     `urn:vivodepot:selbstauskunft`, also kein https-URI.
   - Kein `x5c`, `x5u`, `jku` und kein anderes Feld, das eine dritte Stelle nennt. Ein Key-Binding-JWT gehört nicht zu dieser
     Stufe.
6. **Der JWS-Block** prüft jetzt, dass `alg` zum Schlüssel passt: `Ed25519`/`EdDSA` nur mit einem Ed25519-Schlüssel, `ES256`
   nur mit ECDSA P-256. Jede andere Paarung ist abgelehnt, ebenso `none` und HS*. Der Kopf kann einen `jwk` tragen.
7. **Passwortwechsel.** Er ändert den Schlüssel. Früher ausgegebene Nachweise bleiben gegen ihren eingebetteten `jwk` prüfbar,
   sind aber nicht mehr als dieselbe Halterin erkennbar. Einen Widerruf oder eine Schlüsselkette gibt es nicht.
8. **Beide Wege signieren.** Der EUDI-Wallet-Dialog und die sichtbaren `sd-jwt-vc-*`-Exporte schreiben dieselbe selbst
   signierte kompakte Form (`application/dc+sd-jwt`, Endung `.sd-jwt`; Registry-Kennzeichen `kompakt`). Kein Format trägt
   „SD-JWT“ im Namen und schreibt JSON; ein Klassenwächter hält das (entschieden am 27.09.2026: kein eigenes
   JSON unter einem Standardnamen).
9. **Rückfall ohne Ed25519.** Der Browser kann dann nicht signieren. Es entsteht die unsignierte Selbstauskunft unter eigenem
   `typ` `vivodepot-selbstauskunft+jwt` (`application/jwt`, Endung `.jwt`), ohne jede SD-JWT-Behauptung, und der Dialog sagt
   es in einem Satz. Ein Klassenwächter verbietet `alg: none` neben dem SD-JWT-`typ`.
10. **Einlesen.** Der Kern liest seine eigene Selbst-Signatur wieder ein: `jwk` im Kopf = `cnf.jwk`, `iss` = Selbstauskunft.
   Vor jeder Übernahme prüft er die Signatur gegen diesen `jwk`. Jede andere signierte Form bleibt nach U2-ADR-080 abgewiesen.
11. **Externe Krypto-Review** vor der Produktivschaltung, wie bei U2-ADR-047 und -153. Benannte Fragen: die HKDF-Domäne, das
    PKCS#8-Präfix, die `d`-String-Kopie (3), der Schlüsselwechsel beim Passwortwechsel (7), `cnf` = Ausstellerschlüssel (5).

## Bibliothek: noble-ed25519 am geprüften Commit

- **Fassung:** Commit `fa14496908cf286da53d17b739accd8f7c3790be` (Tag 1.6.0-pre-audit), genau der Stand, den Cure53 geprüft hat:
  pentest-report_ed25519.pdf, 02/2022, S. 4, „keine Schwachstelle, 8 Low/Info“. **Nicht 1.6.0:** Sein Diff zu fa14496 enthält
  neben den Audit-Fixen die Ristretto-Implementierung (549d895) und eine Änderung der Kernarithmetik (3768bfd, „adjust
  equals/add/double for 10% speedup“).
- **Nicht @noble/curves 2.x:** Für den in der README genannten Prüfbericht von 2026 ist kein Bericht auffindbar (gesucht
  01.10.2026: trailofbits/publications, audit/-Ordner, Releases, Blog); eine Standalone-Datei gibt es nicht.
- **Build:** `tsc -p tsconfig.esm.json --types node` mit typescript 4.5.4 und @types/node 16.11.21 ergibt lib/esm/index.js,
  SHA-256 `579c9fe6…2517`.
- **Eingebettet** als ES-Modul-Block `noble_ed25519_VivodepotInline` mit genau einer geänderten Zeile: `import nodeCrypto from
  'crypto';` → `const nodeCrypto = undefined;`. SHA-256 `15974ff9…201b`. Fremdcode-Register, SBOM, THIRD_PARTY_LICENSES.
- **Advisories:** keine. GitHub Security Advisories `[]`; `npm audit` für 1.6.0 ohne Fund (01.10.2026).
- **SHA-512** kommt aus `crypto.subtle`, gezählt per Spy. Ohne WebCrypto scheitert der Aufruf.
- **ensureBytes kopiert** jedes Byte-Feld (Z. 575). Ein Teilfeld mit Versatz ergibt denselben Schlüssel (gemessen). Die frische
  Kopie im Kern bleibt, weil nur sie überschrieben werden kann.

**Die acht Befunde von 2022, je für den Pfad von getPublicKey** (SHA-512 → Clamping → mod l → Basispunkt-Multiplikation →
Affinform):
- NBL-03-001, verify nicht RFC-konform: nicht auf dem Pfad.
- NBL-03-002, Punktaddition ohne Kurvenprüfung: auf dem Pfad, aber nur mit dem Basispunkt und seinen Vielfachen, also gültigen
  Punkten. Das Ergebnis belegt die Selbstprobe bei jedem Aufruf.
- NBL-03-003, Malleability in verify: nicht auf dem Pfad.
- NBL-03-004, Ristretto: nicht auf dem Pfad.
- NBL-03-005, toAffine prüft ein übergebenes invZ nicht: auf dem Pfad (Z. 154 und 122). Das invZ berechnet die Bibliothek selbst
  per Batch-Inversion; falsch würde es nur bei z = 0. Basispunkt-Vielfache haben in erweiterten Koordinaten z ≠ 0, der neutrale
  Punkt Z = 1. Der Fix e51f79b fehlt in fa14496; ein falsches Ergebnis fängt die Selbstprobe mit hartem Abbruch. Der Kern ruft
  aus der Bibliothek nur `getPublicKey` (statische Probe).
- NBL-03-006, Benennung hashToPrivateKey: nicht auf dem Pfad.
- NBL-03-007, Gleichheit erweiterter Punkte: auf dem Pfad nicht gerufen (gemessen: 0 Aufrufe).
- NBL-03-008, Hash-Bibliothek unter Deno: nicht auf dem Pfad.

**Grenzen:**
- „Nicht einschlägig“ gilt für die Korrektheit, nicht für das Timing. Die Multiplikation ist nicht als seitenkanalfrei belegt.
  Der Bericht (S. 7) nennt beim wNAF-Precompute eine mögliche Timing-Lücke, ohne Proof-of-Concept.
- Tragend ist, dass die Ableitung lokal ohne messendes Gegenüber läuft und mit WebCrypto signiert wird.
- Byte-Kopien und BigInt-Zwischenwerte der Bibliothek (Seed-Kopie, SHA-512-Ergebnis mit Skalar und prefix) sind nicht löschbar.
- Ein Wechsel der Fassung braucht eine neue Krypto-Gegenlesung.

## Was nicht entschieden ist

- **Registrierte `vct`** statt `urn:vivodepot:*`: Es gibt dafür heute weder ein Rulebook noch einen Katalogeintrag (Teil 2 von
  SDJWTVC-OHNE-PRUEFER).
- **Die Bindung an die Person**, also welche Identitätsangaben in eine Selbstauskunft gehören (Nachtrag zu U2-ADR-030).

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Die kompakte Ausgabe ist mit Ed25519 selbst signiert und prüft gegen den jwk im eigenen Kopf, unabhängig vom Kern;
      cnf.jwk ist derselbe Schlüssel, iss bleibt die Selbstauskunft, kein Feld nennt eine dritte Stelle.
    zustand: erfuellt
    herkunft: RFC 9901 §4.1, RFC 9864, RFC 7638
    pruefung:
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Selbstsignatur] die Ausgabe ist signiert, prüft unabhängig vom Kern und zeigt die Selbstausstellung offen"
  - aussage: >-
      Thumbprint, Ed25519-Signatur und Offenlegungs-Digest ergeben die Werte der Normvektoren.
    zustand: erfuellt
    herkunft: RFC 8037 Anhang A.3/A.4, RFC 9901 §5.1
    pruefung:
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Selbstsignatur·Norm] Vektoren aus RFC 8037 (Thumbprint, Signatur) und RFC 9901 (Offenlegungs-Digest)"
  - aussage: >-
      Der Schlüssel ist je Passwort und Depot verschieden, aus einer eigenen HKDF-Domäne und nicht extrahierbar.
    zustand: erfuellt
    herkunft: eigene Festlegung
    pruefung:
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Selbstsignatur·Schlüssel] dieselbe Sitzung → derselbe Schlüssel; anderes Passwort oder Depot → ein anderer; nicht extrahierbar"
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Selbstsignatur·Domäne] die Ableitung ist von Depot- und Adressschlüssel getrennt"
  - aussage: >-
      alg gehört zum Schlüssel; none und HS* sind abgelehnt.
    zustand: erfuellt
    herkunft: RFC 8725 §3.1
    pruefung:
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Selbstsignatur·alg] alg gehört zum Schlüssel; none und HS* sind abgelehnt"
  - aussage: >-
      Ohne Ed25519 entsteht kein SD-JWT, sondern die unsignierte Selbstauskunft unter eigenem typ; alg none steht im Kern nie
      neben dem SD-JWT-typ.
    zustand: erfuellt
    herkunft: RFC 9901 §4.1
    pruefung:
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Selbstsignatur·Rückfall] ohne Ed25519 entsteht die unsignierte Selbstauskunft unter eigenem typ, kein SD-JWT"
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Selbstsignatur·Klasse] alg none steht im Kern nur neben dem eigenen Selbstauskunft-typ"
  - aussage: >-
      Die eigene Selbst-Signatur kommt geprüft wieder herein; eine gebrochene Signatur wird nicht übernommen.
    zustand: erfuellt
    herkunft: eigene Festlegung
    pruefung:
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Selbstsignatur·Import] die eigene Selbst-Signatur kommt geprüft herein; eine gebrochene Signatur nicht"
  - aussage: >-
      Jedes Exportformat mit SD-JWT im Namen schreibt die signierte kompakte Form, nie JSON.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026
    pruefung:
      - tests/sdjwt-selbstsignatur.test.js
        "[SD-JWT·Name·Klasse] jedes Exportformat mit SD-JWT im Namen schreibt die signierte kompakte Form"
  - aussage: >-
      Der Halter-Schlüssel wird nie extrahierbar importiert; den öffentlichen Schlüssel liefert die eingebettete noble-ed25519
      (fa14496, genau eine geänderte Zeile), geprüft mit einer Selbstprobe mit WebCrypto im Block; Seed und Kopien sind danach
      überschrieben; genau eine Stelle reicht die Bibliothek hinein.
    zustand: erfuellt
    herkunft: U2-ADR-062, RFC 8032 §7.1, Cure53 pentest-report_ed25519.pdf (02/2022)
    pruefung:
      - tests/halter-schluessel-noble.test.js
        "[Halter·noble·Herkunft] eingebettet ist der Build von fa14496 mit genau einer geänderten Zeile"
      - tests/halter-schluessel-noble.test.js
        "[Halter·noble·RFC 8032] TEST 1–3: Seed → öffentlicher Schlüssel"
      - tests/halter-schluessel-noble.test.js
        "[Halter·noble·SHA-512] läuft über crypto.subtle; ohne WebCrypto scheitert der Aufruf hart"
      - tests/halter-schluessel-noble.test.js
        "[Halter·Selbstprobe] richtiges x wird angenommen; falsches x, falsche Länge, fehlende Ableitung → kein Schlüssel; Kopie überschrieben"
      - tests/halter-schluessel-noble.test.js
        "[Halter·noble·Pfad] der Kern ruft aus der Bibliothek nur getPublicKey; equals bleibt auf dem Pfad ungerufen (NBL-03-007)"
      - tests/halter-schluessel-noble.test.js
        "[Halter·Aufrufer] genau eine Stelle im Kern reicht die Bibliothek in die Ableitung"
```
