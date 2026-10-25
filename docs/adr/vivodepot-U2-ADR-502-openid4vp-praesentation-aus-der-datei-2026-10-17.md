# U2-ADR-502: Die OpenID4VP-Präsentation aus der Datei — Anfrage prüfen, KB-JWT, Antwort an die Stelle

**Status:** Angenommen (17.10.2026) — im Kern gebaut: Anfrage prüfen (H1), Präsentation, KB-JWT und Antwort-JWE (H2); die Transport-Seite steht aus
**Datum:** 17.10.2026
**Kategorie:** KRYPTO, STANDARDS, EUDI, RÜCKWEG
**Linie:** U2
**Bezug:** U2-ADR-501 (Zertifikat der Stelle, Schlüssel je Stelle, X.509-Leser) · U2-ADR-457 (SD-JWT VC mit Selbst-Signatur der
Halterin; hier ein Nachtrag) · U2-ADR-449 (die Antwort als JWE; der ANTWORT-JWE-BLOCK bleibt) · U2-ADR-080 (kein Import fremder
Nachweise; bleibt) · U2-ADR-486 (Post-Quanten-Übergang) · U2-ADR-062 (externe Krypto-Prüfung vor Produktivschaltung) ·
U2-ADR-503 (geplant: das Gateway als prüfende Stelle)
**Entschieden:** Entscheidung 14.10.2026 (die Übergabe so nahtlos wie bei der Wallet, als Ergänzung, unter fünf
Bedingungen) · Entscheidung 14.10.2026 (Bauform, Spike-Weg, PID nie) · Prüfung 14.10.2026 (Auflagen aus dem Spike) ·
Entscheidung 17.10.2026 (Zuschnitt in Halter und prüfende Stelle, Nummer, Halter-Schlüssel je Stelle als Nachtrag zu U2-ADR-457,
Einzelwort Krypto)
**Status heute:** gilt. Gebaut am 23.10.2026 im Kern: `oid4vpAnfragePruefen` (Abschnitt B), `sdjwtHalterSchluessel` und das
KB-JWT (Abschnitt C), `oid4vpPraesentationBauen` und `oid4vpAntwortJwe` (Abschnitt D). Nicht gebaut: die Transport-Seite
(Abschnitt E) und der Lauf gegen den Referenz-Verifier (Abschnitt F). Die offenen Punkte stehen als offene Klauseln im
`konformitaet`-Block.

Zeilen- und Namensangaben gelten am Kanon 981311a5c (K = vivodepot.html). Maßgeblich sind die Namen.

## Ausgangslage

- Die Übergabe an eine Stelle über OpenID4VP ist seit dem 14.10.2026 entschieden, unter fünf Bedingungen:
  1. auf Klick der Person, auf einer eigenen Seite; der Kern bleibt `connect-src 'none'`;
  2. nur auf eine signierte Anfrage der Stelle, deren Zertifikat Vivodepot prüft wie die Wallet; ohne gültiges Zertifikat kein
     Versand;
  3. verschlüsselt an die in der Anfrage genannte Adresse (`direct_post.jwt`); keine Speicherung bei Vivodepot;
  4. die PID bleibt in der Wallet; Vivodepot reicht dafür an die Wallet weiter und ersetzt sie nicht;
  5. Außendarstellung „ergänzt die Wallet“, nie „Alternative zur Wallet“.
- U2-ADR-501 regelt das Zertifikat der Stelle, den Ankersatz „Zugang“ und den Schlüssel je Stelle. Den Algorithmus und den Ablauf
  der Präsentation nimmt es ausdrücklich aus (U2-ADR-501, Abgrenzung). Diese Lücke schließt dieses ADR für die Rolle der
  **Halterin**.
- **Gebaut:** der X.509-Leser im Produktteil (Spanne `X509-LESER` in K, Proben `tests/x509-leser.test.js`,
  `tests/x509-limbo.test.js`) · die Ableitung des Schlüssels je Stelle (Domäne „antwort“, `ANTWORT_SCHLUESSEL_DOMAENEN` in K;
  „sdjwt-halter“ steht dort als vorgemerkt im Kommentar) · die Prüfung der Anfrage-JWS mit ES256/384/512 nur im Spike
  (`_oid4vpJwsPruefen` in der Spanne `OID4VP-SPIKE`, nur Entwicklerfassung, `tests/oid4vp-spike.test.js` hält sie aus jedem
  Produkt).
- **Nicht gebaut:** KB-JWT, Prüfung der Anfrage im Produkt, Antwort-JWE für OpenID4VP, `direct_post`, `request_uri`, die
  Transport-Seite. Weg zum Nachsehen: `git show origin/u2-kanon:vivodepot.html | grep -c -i -E "kb\+jwt|oid4vpAnfragePruefen|oid4vpAntwortJwe|direct_post"`
  ergab am 17.10.2026 je 0. Der Kern sagt weiter „KEIN Live-Protokoll-Flow“ (`eudiwOid4vpWrapper`, `_hinweis`).
- Der Spike gegen den EU-Referenz-Verifier (Quelltext gelesen am 14.10.2026, nicht gestartet) ergab: Der Verifier verlangt ein
  KB-JWT, löst den Schlüssel des Ausstellers nur über `x5c` auf und erwartet standardmäßig ES256. EdDSA lässt sich dort
  einstellen (vermutet, nicht gestartet). Ein selbst signiertes SD-JWT VC nach U2-ADR-457 (Ed25519, `jwk` im Kopf, kein `x5c`)
  nimmt er so nicht an.

Dieses ADR gilt für die **Halterin**: Vivodepot präsentiert auf eine Anfrage. Die **prüfende Stelle** am Gateway ist nicht Teil
davon (U2-ADR-503).

## Entscheidung

### A · Was übergeben wird

1. **Auf eine signierte Anfrage einer Stelle übergibt Vivodepot Angaben aus der Datei als SD-JWT VC nach U2-ADR-457**, mit den
   Offenlegungen, die die Person für diese Anfrage wählt, und einem KB-JWT (Abschnitt C). Die Antwort geht per `direct_post.jwt`
   verschlüsselt an den Schlüssel der Stelle (Abschnitt D).
2. **Nur eigene `vct` im Vivodepot-Namensraum.** Angeboten werden Selbstauskünfte, die der Kern heute als SD-JWT VC schreibt
   (`sdJwtVcFinanzen`, `sdJwtVcSozialversicherung`). `sdJwtVcIdentitaet` wird nicht angeboten: Name und Geburtsdatum als
   Selbstauskunft sind neben der PID verwechselbar.
3. **Die PID bleibt in der Wallet.** Vivodepot bietet keinen PID-Typ an. Eine Anfrage nach PID-Typen wird ohne Versand mit dem
   Satz beantwortet „Ausweisdaten gibt Ihre Wallet heraus.“ Will die Stelle die Identität hier feststellen, gilt U2-ADR-501
   Punkt 4 (Weiterreichen an die Wallet, nur gleiche Sitzung, keine kryptographische Bindung).
4. **Die Bindung heißt Depot, nicht Gerät.** `cnf` bindet an einen Schlüssel aus dem Depot (Punkt 9), nicht an ein
   Sicherheitselement. Kein Text nennt die Präsentation „gerätegebunden“.
5. **Vertrauen null ohne Institutionssignatur** (U2-ADR-457 Punkt 1). Die Präsentation ist eine Angabe der Person. Kein Text nennt
   sie „geprüft“, „verifiziert“ oder „bestätigt“. Gegenüber der Stelle steht im Datenblatt: Der Nachweis ist selbst signiert und
   steht in keiner Vertrauensliste.

### B · Die Anfrage prüfen

6. **Ein Tor: `oid4vpAnfragePruefen(anfrage, anker, jetzt)` im Kern.** Sie gibt eine geprüfte Anfrage oder eine Abweisung mit Grund
   zurück. Geprüft wird nach U2-ADR-501 Abschnitt D:
   - Request Object (JAR) signiert, mit ES256/384/512, `alg` passend zur Kurve, `r‖s` passend lang; `none` und jede andere Angabe
     sind eine Abweisung;
   - Kette aus `x5c` mit dem X.509-Leser bis zum Ankersatz „Zugang“; ein mitgeschickter Anker wird nicht als Anker gewertet;
   - Bindung der `client_id` an das Blatt über ihr Präfix (U2-ADR-501 Punkt 10 und 18); die Präfixe und ihre Regeln sind vor H1 an
     OpenID4VP 1.0 selbst zu lesen;
   - `response_uri` passend zur `client_id`; die Regel und ihre Fundstelle in OpenID4VP 1.0 sind vor H1 an der Quelle zu lesen;
   - Gültigkeitszeit, Liste nicht abgelaufen (U2-ADR-501 Punkt 16), Registration Certificate ohne Mehrverlangen (Punkt 18).
7. **Ohne gültiges Zertifikat kein Versand.** Es gibt keinen Rückfall „Adresse zeigen und bestätigen lassen“. Die Abweisungen
   tragen Gründe (`anfrage-unsigniert`, `zertifikat-unbekannt`, `signatur-ungueltig`, `zertifikat-zeit`,
   `client-id-passt-nicht`, `antwortadresse-fremd`) und je eine rote Probe, bevor die Funktion gebaut wird.
8. **Verlangte Angaben: eine Teilmenge von DCQL.** Angenommen werden `credentials[].format` = `dc+sd-jwt`, `meta.vct_values` und
   `claims[].path`. Alles andere ist eine Abweisung „Anfrage nicht unterstützt“, nie ein stilles Übergehen. Die Feldnamen sind vor
   H1 an OpenID4VP 1.0 zu lesen.

### C · Der Halter-Schlüssel je Stelle und das KB-JWT (Nachtrag zu U2-ADR-457)

9. **Für die Präsentation an eine Stelle gibt es den Halter-Schlüssel je Stelle.** Abgeleitet wie U2-ADR-501 Punkt 28, aus dem
   Antwort-Seed des Depots, mit der Domäne `sdjwt-halter` statt `antwort`, Kennung = `stellenKennung` in der Domäne `signiert:`
   (U2-ADR-501 Punkt 10). Eine unsignierte Kennung kommt hier nie vor, weil es ohne Zertifikat keinen Versand gibt.
   - Mit diesem Schlüssel wird das SD-JWT VC für diese Präsentation signiert; `cnf.jwk` und `jwk` im Kopf sind derselbe Schlüssel
     (U2-ADR-457 Punkt 5).
   - Über Stellen hinweg sind die Präsentationen nicht über den Schlüssel verkettbar; bei derselben Stelle ist er
     wiedererkennbar (U2-ADR-501 Punkt 7).
   - Der Schlüssel übersteht Passwortwechsel und Wiederherstellung, weil der Antwort-Seed Inhalt des Depots ist.
   - Domäne `sdjwt-halter` und `antwort` ergeben bei derselben Stelle zwei verschiedene Schlüssel.
   - **Nachtrag zu U2-ADR-457:** Punkt 2 (Schlüssel aus dem Passwort) gilt weiter für die Exporte und den Dialog „An EUDI-Wallet
     übergeben“. Für die Präsentation an eine Stelle gilt dieser Punkt. Punkt 5 („Ein Key-Binding-JWT gehört nicht zu dieser
     Stufe“) gilt für die Präsentation nicht mehr.
   - Ein Testvektor wie in U2-ADR-501 Punkt 28 wird mit dem Bau festgeschrieben.
10. **Algorithmus Ed25519**, wie U2-ADR-457 Punkt 4 und U2-ADR-501 Punkt 9. Kein `x5c` im SD-JWT VC, kein selbst ausgestelltes
    Zertifikat für die Halterin (Verworfen).
11. **KB-JWT** nach RFC 9901 §4.3 (gelesen am 14.10.2026):
    - Kopf: `typ` `kb+jwt`, `alg` passend zum `cnf`-Schlüssel, nie `none`;
    - Nutzlast: `iat`, `aud` = `client_id` der geprüften Anfrage, `nonce` = `nonce` aus der Anfrage, `sd_hash`;
    - `sd_hash` über die US-ASCII-Bytes von `<Issuer-signed JWT>~<Disclosure 1>~…~<Disclosure N>~`, einschließlich der
      abschließenden `~` (RFC 9901 §4.3.1), Verfahren nach `_sd_alg` des SD-JWT (`sha-256`);
    - signiert mit dem Halter-Schlüssel je Stelle (Punkt 9).
    Ob die Kopfangabe `Ed25519` (RFC 9864) oder `EdDSA` vom Verifier gelesen wird, misst H4.

### D · Die Antwort an die Stelle

12. **`oid4vpAntwortJwe` im Kern, außerhalb des ANTWORT-JWE-BLOCKS.** Der Block bleibt zeichengleich in allen Trägern (U2-ADR-449
    Punkt 5); die neue Funktion nutzt seine Bausteine (`_jweConcatKdf`, `_jweB64u`).
    - `alg` ECDH-ES auf P-256 an den Schlüssel aus `jwks` der geprüften Anfrage; nur ein Schlüssel mit `use: enc` und
      `alg: ECDH-ES`, sonst Abbruch; `kid` übernommen.
    - `enc`: A256GCM, wenn die Anfrage es anbietet, sonst A128GCM, sonst Abbruch. Fehlt `encrypted_response_enc_values_supported`,
      gilt A128GCM (OpenID4VP 1.0 §8.3, gelesen am 14.10.2026).
    - Kein `pad`, kein `vorgang`, kein `typ` des Vivodepot-Umschlags; `apu` und `apv` werden nicht gesetzt (OpenID4VP 1.0 §8.3
      nennt sie ohne Pflicht, gelesen am 14.10.2026).
    - Das flüchtige Paar ist nicht extrahierbar; Z und, soweit als Bytes vorhanden, der CEK werden im `finally` überschrieben. Ein
      CryptoKey lässt sich nicht überschreiben.
13. **Nur ein geprüfter Weg zum Versand.** Die Transport-Seite sendet nur ein JWE, das der Kern zusammen mit dem Prüfvermerk von
    `oid4vpAnfragePruefen` zurückgegeben hat. Eine Klassenprobe hält, dass kein anderer Weg zu `oid4vpAntwortJwe` führt.

### E · Die Transport-Seite

14. **`uebergabe/` ist die einzige Stelle mit Netz**, in der Bauform von `share/empfangen.html`. Der Kern bleibt
    `connect-src 'none'`.
    - Die Seite holt das Request Object von der `request_uri` aus dem Link der Stelle. Dabei geht keine Angabe aus dem Depot
      hinaus. Ob und wie `wallet_nonce` mitgeht, ist vor H3 an OpenID4VP 1.0 zu lesen.
    - Gesendet wird nur an die `response_uri` der **geprüften** Anfrage, als POST mit dem fertigen JWE.
    - Die CSP der Seite kann die Adresse nicht im Voraus kennen; die Beschränkung auf die Adresse aus der Anfrage hält der Code der
      Seite, und eine Probe hält ihn.
15. **Die Seite transportiert nur.** Sie prüft nicht, signiert nicht und sieht keinen Klartext des Depots, nur das fertige JWE.
    Seite und Kern sprechen über `postMessage` zwischen zwei Fenstern derselben Origin; beide prüfen `event.origin` gegen die
    eigene.
16. **Es wird nichts gespeichert.** Die Seite schreibt weder in `localStorage`, `sessionStorage`, IndexedDB noch Cookies. Im Depot
    bleibt kein Eintrag über die Übergabe, außer die Person legt ihn selbst an.
17. **Nur in der gehosteten Fassung.** In der Datei-Fassung (`file://`, Origin `null`) meldet die Seite „Die Übergabe an eine Stelle
    geht nur in der gehosteten Fassung.“ und sendet nichts.

### F · Wortlaut, Prüfung, Lauf

18. **Wortlaut:** Vivodepot ergänzt die Wallet. Nie „Alternative zur Wallet“, nie „statt der Wallet“ (U2-ADR-501 Punkt 6). Kein
    Außentext sagt „vom Referenz-Verifier angenommen“ ohne den Zusatz, dass der Verifier dafür auf EdDSA umgestellt war und HAIP
    ES256 verlangt.
19. **Lauf gegen den Referenz-Verifier (H4)**, lokal, Verifier und Vivodepot auf `localhost`, kein Live-Produkt im Browser. Die
    Probe liegt im Repo und endet ohne JDK als „ungemessen“, nie als grün. Gemessen wird auch, was der Verifier mit einer
    Selbstauskunft ohne `x5c` tut.
20. **Externe Krypto-Prüfung** vor der Produktivschaltung (U2-ADR-062, U2-ADR-501 Punkt 22). Ihr Umfang wächst um die Prüfung der
    Anfrage (Punkt 6), den Halter-Schlüssel je Stelle (Punkt 9), das KB-JWT (Punkt 11), das JWE an einen fremden Schlüssel
    (Punkt 12) und eine Seite mit Netz (Punkt 14). Der Umfang wird vor Beginn der Prüfung schriftlich ergänzt.
21. **Krypto-Wächter:** Die neuen Aufrufe (`verify` für die Anfrage, `importKey` für den JWK der Stelle, `deriveBits` für ECDH-ES)
    werden in `tools/krypto-aufrufer-grundlinie.json` je Wagen benannt um den gemessenen Wert angehoben. `krypto-verbote`,
    `krypto-aufrufer-grundlinie` und `krypto-block-propagation` laufen vor jedem Commit.
22. **Wagen, je ein Commit:** H1 Anfrage prüfen (rote Probe zuerst) · H2 Präsentation und KB-JWT · H3 Transport-Seite · H4 Lauf
    gegen den Referenz-Verifier · H5 Doku und Wortlaut (die Kern-Zeile „KEIN Live-Protokoll-Flow“, sobald H3 steht;
    INTEROPERABILITY.md; ein Nachtrag zu U2-ADR-501, dessen Ausgangslage „X.509 gibt es im Produktteil des Kerns nicht“ seit dem
    X.509-Leser überholt ist).

## Abgrenzung

- **U2-ADR-080 bleibt.** Vivodepot importiert und prüft keine Nachweise fremder Aussteller. Dieses ADR präsentiert eigene
  Selbstauskünfte der Person; es prüft nur die Anfrage der Stelle.
- **Die prüfende Stelle am Gateway** (Anfrage an eine Wallet, Prüfung von SD-JWT VC und KB-JWT, Statusliste, Test-Endpunkt und
  Doku-Seite) ist nicht Teil dieses ADR. Dafür kommt U2-ADR-503.
- **Kein ES256-Ausstellerzertifikat für die Halterin.** Es wäre eine neue Vertrauensaussage.
- **U2-ADR-501** bleibt Grundlage für Zertifikat, Ankersatz „Zugang“ und Kennung der Stelle. Dieses ADR beantwortet dessen offene
  Frage nach dem Algorithmus der Präsentation für die Halterin mit Ed25519 (Punkt 10); ES256 je Stelle für HAIP bleibt offen.
- **U2-ADR-449** bleibt; der ANTWORT-JWE-BLOCK wird nicht geändert.
- **Der Spike** bleibt in der Entwicklerfassung; `tests/oid4vp-spike.test.js` hält ihn aus jedem Produkt. Sein selbst signiertes
  `x5c` und die EdDSA-Einstellung des Verifiers gehen nicht ins Produkt.
- **Vermittler und Relay** über das Gateway sind nicht Teil dieses ADR. Die Entscheidung vom 14.10.2026 gilt nur für den Weg zur
  Adresse aus der Anfrage.

## Verworfen

- **Übergabe ohne Netz (Stufe a, nur Datei):** erfüllt nicht „so nahtlos wie bei der Wallet“; die Datei-Antwort nach
  U2-ADR-152 und U2-ADR-501 bleibt daneben bestehen.
- **Alles auf der Transport-Seite:** Die Seite bräuchte den Halter-Schlüssel oder den fertigen Nachweis, und Krypto läge außerhalb
  des Kerns in einem weiteren Träger, ohne die Wächter des Kerns.
- **Netz im Kern:** bricht `connect-src 'none'`.
- **Direkte Übergabe ohne Zertifikat, mit Bestätigung der Person:** widerspricht Bedingung 2.
- **Ein Halter-Schlüssel für alle Stellen (der Schlüssel aus U2-ADR-457 Punkt 2):** macht die Person über Stellen hinweg
  wiedererkennbar, und jeder Passwortwechsel wechselte ihn.
- **Ein selbst ausgestelltes ES256-Zertifikat (`x5c`) für die Halterin**, damit HAIP-treue Verifier annehmen: eine
  Vertrauensaussage ohne Grundlage; ein Zertifikat ohne Vertrauensliste ist eine Selbstauskunft.
- **PID oder `sdJwtVcIdentitaet` anbieten:** Bedingung 4; Verwechslungsgefahr neben der PID.
- **Den ANTWORT-JWE-BLOCK oder den gepinnten JWS-Block erweitern:** beide stehen zeichengleich in mehreren Trägern; eine Änderung
  zöge Propagation nach sich.
- **Nur gegen den Referenz-Verifier laufen und damit fertig sein:** belegt das Protokoll, nicht die Annahme bei einer Stelle; ohne
  Pilot ist keine Aussage über eine Stelle möglich.

## Was nicht entschieden ist

- **ES256 je Stelle für HAIP.** HAIP verlangt nach dem Spike-Befund ES256 (Fundstelle vor H4 an HAIP 1.0 zu lesen). P-256 lässt
  sich in WebCrypto nicht aus einem Seed ableiten (U2-ADR-457 Punkt 4); ES256 hieße je Stelle ein erzeugtes, im Depot
  verschlüsseltes Paar, also Schema-Änderung, Sicherbarkeitsprobe und Krypto-Wort. Entschieden wird vor dem Pilot.
- **Pilot mit einer Stelle.** Welche Stelle eine selbst signierte Präsentation annimmt, klärt erst der Pilot; bis dahin gibt es
  nur den Lauf gegen den Referenz-Verifier.
- **Präfixe der `client_id`** (`x509_san_dns`, `x509_hash` und weitere) und die Regel für `response_uri`: vor H1 an OpenID4VP 1.0
  selbst zu lesen. Ein Präfix, das dort steht und hier nicht geregelt ist, ist eine Abweisung, bis es geregelt ist.
- **`request_uri` und `wallet_nonce`:** Methode (GET oder POST) und Felder vor H3 an OpenID4VP 1.0 zu lesen.
- **QR auf der Transport-Seite:** im ersten Bau reicht der Link der Stelle.
- **Ob die Exporte und der Wallet-Dialog** ebenfalls auf einen Schlüssel je Empfänger wechseln. Dieses ADR ändert nur die
  Präsentation an eine Stelle.
- **Ob `sdJwtVcIdentitaet` später als ergänzende Angabe kommt.** Entschieden mit dem Pilot.
- **Produktive Anker** der deutschen Access-CA-Listen (U2-ADR-501, Was nicht entschieden ist). Ohne sie bleibt die Übergabe im
  Produkt ohne Anker und sendet nichts.
- **Anmeldung in Sandbox oder Playground** einer Stelle: nicht erteilt; sie betrifft U2-ADR-503.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Ohne signiertes Request Object mit gültiger Kette bis zum Ankersatz „Zugang“, passender client_id und passender
      response_uri entsteht keine Antwort; jede Abweisung trägt ihren Grund (anfrage-unsigniert, zertifikat-unbekannt,
      signatur-ungueltig, zertifikat-zeit, client-id-passt-nicht, antwortadresse-fremd), und eine gültige Anfrage wird angenommen.
    zustand: erfuellt
    herkunft: U2-ADR-502 (17.10.2026)
    pruefung:
      - tests/oid4vp-anfrage-pruefen.test.js "[OID4VP·Anfrage·gültig] x509_san_dns: angenommen, mit Stelle, client_id, nonce, response_uri und DCQL"
      - tests/oid4vp-anfrage-pruefen.test.js "[OID4VP·Anfrage·Gründe] je Grund mindestens ein Fall; jede Abweisung trägt genau einen Grund aus der Liste"
      - tests/oid4vp-anfrage-pruefen.test.js "[OID4VP·Anfrage·Rot-Beweis] ohne die client_id-Bindung nähme der Kern eine fremde client_id an"
  - aussage: >-
      Jeder Weg zum Versand läuft über oid4vpAnfragePruefen; die Transport-Seite sendet nur ein JWE, das der Kern mit dem
      Prüfvermerk zurückgegeben hat.
    zustand: offen
    frist: 2027-01-31
    bedingung: Klassenprobe zum einen Tor (geplant), mit Rot-Beweis an einem gepflanzten zweiten Weg
    herkunft: U2-ADR-502 (17.10.2026)
  - aussage: >-
      Der Halter-Schlüssel der Präsentation stammt aus dem Antwort-Seed mit der Domäne sdjwt-halter und der stellenKennung;
      zwei Stellen ergeben zwei Schlüssel, dieselbe Stelle denselben, die Domänen sdjwt-halter und antwort zwei verschiedene;
      nach Passwortwechsel und Wiederherstellung bleibt er derselbe, und der Testvektor stimmt.
    zustand: erfuellt
    herkunft: U2-ADR-502 (17.10.2026), Nachtrag zu U2-ADR-457
    pruefung:
      - tests/oid4vp-praesentation.test.js "[OID4VP·Präsentation·je Stelle] zwei Stellen, zwei Halter-Schlüssel; dieselbe Stelle, derselbe; getrennt von antwort und vom Passwort-Schlüssel"
      - tests/oid4vp-praesentation.test.js "[OID4VP·Präsentation·Vektor] Halter-Schlüssel je Stelle: info, öffentlicher Schlüssel, unabhängig nachgerechnet; nur für signiert:"
      - tests/oid4vp-praesentation.test.js "[OID4VP·Präsentation·Rot-Beweis] ein Kern mit dem Schlüssel aus dem Passwort machte zwei Stellen gleich"
      - tests/kern-antwort-signieren.test.js "[Antwort-Signatur·Sicherbarkeit·sdjwt-halter] Sicherung, frischer Kern, Wiederherstellung mit Code und neuem Passwort: derselbe Halter-Schlüssel je Stelle"
  - aussage: >-
      Das KB-JWT trägt typ kb+jwt, alg passend zum cnf-Schlüssel, aud gleich der client_id, nonce aus der Anfrage, iat und
      sd_hash über die Präsentation einschließlich der abschließenden Tilde; ein anderes aud, eine andere nonce oder ein sd_hash
      ohne die Tilde fallen in der Probe.
    zustand: offen
    frist: 2027-01-31
    bedingung: Proben zum KB-JWT gegen RFC 9901 §4.3 und §4.3.1 (geplant), dazu Gegenprobe mit einer Fremdbibliothek als Werkzeug im Repo
    herkunft: RFC 9901 §4.3, U2-ADR-502 (17.10.2026)
  - aussage: >-
      Die Antwort ist ein JWE mit ECDH-ES auf P-256 an den Schlüssel der Anfrage mit use enc, enc A256GCM vor A128GCM und
      A128GCM ohne Angabe, sonst Abbruch; kein pad; der ANTWORT-JWE-BLOCK bleibt zeichengleich.
    zustand: offen
    frist: 2027-01-31
    bedingung: Proben zu oid4vpAntwortJwe (geplant), Gegenprobe mit einer Fremdbibliothek, und die bestehende Gleichheitsprobe des Blocks
    herkunft: OpenID4VP 1.0 §8.3, U2-ADR-449, U2-ADR-502 (17.10.2026)
  - aussage: >-
      Der Kern bleibt connect-src 'none'; Netz hat allein die Seite uebergabe/, sie sendet nur an die response_uri der geprüften
      Anfrage, speichert nichts und sendet in der Datei-Fassung nichts.
    zustand: offen
    frist: 2027-01-31
    bedingung: Probe über CSP des Kerns und Quelltext der Seite uebergabe/ (geplant), mit Rot-Beweis an einer fremden Adresse und an einem gepflanzten Speicherzugriff
    herkunft: Entscheidung 14.10.2026 (Bedingungen 1 und 3), U2-ADR-502 (17.10.2026)
  - aussage: >-
      Vivodepot bietet keinen PID-Typ und nicht sdJwtVcIdentitaet an; eine Anfrage nach PID-Typen endet ohne Versand mit dem
      Hinweis auf die Wallet.
    zustand: offen
    frist: 2027-01-31
    bedingung: Probe zur PID-Grenze (geplant), mit Rot-Beweis
    herkunft: Entscheidung 14.10.2026 (Bedingung 4), U2-ADR-502 (17.10.2026)
  - aussage: >-
      Kein Anzeige- oder Außentext nennt Vivodepot eine Alternative zur Wallet oder die Präsentation geprüft, verifiziert oder
      gerätegebunden; „vom Referenz-Verifier angenommen“ steht nur mit dem Zusatz zur EdDSA-Umstellung.
    zustand: offen
    frist: 2027-01-31
    bedingung: Erweiterung von tests/vertrauen-nie-aus-selbstauskunft.test.js um diese Wendungen (geplant)
    herkunft: Entscheidung 14.10.2026 (Bedingung 5), U2-ADR-502 (17.10.2026)
  - aussage: >-
      Der Lauf gegen den Referenz-Verifier ist eine Probe im Repo; ohne JDK endet sie als ungemessen, nie als grün.
    zustand: offen
    frist: 2027-01-31
    bedingung: Lauf-Probe gegen den lokalen Referenz-Verifier (geplant)
    herkunft: U2-ADR-502 (17.10.2026)
```

---

*Vivodepot GmbH · Berlin · 17.10.2026*
