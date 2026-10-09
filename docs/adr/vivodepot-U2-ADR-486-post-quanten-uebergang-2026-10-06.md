# U2-ADR-486: Post-Quanten-Übergang — Anker-Agilität zuerst, dann hybride Verfahren

**Status:** Angenommen (06.10.2026) — nicht gebaut
**Datum:** 06.10.2026
**Kategorie:** KRYPTO, STANDARDS
**Linie:** U2
**Bezug:** U2-ADR-016 · U2-ADR-002 · U2-ADR-230 (kryptoVersion) · U2-ADR-038/040/172/441 (Anker, Ablauf, Zwischenstufe) · U2-ADR-153/449 (Antwort-JWE) · U2-ADR-457 (SD-JWT Ed25519) · U2-ADR-436 (Schlüssel im Speicher) · U2-ADR-062 (externe Prüfung)
**Status heute:** gilt — entschieden, nicht gebaut. Jeder Bau daraus braucht ein Einzelwort der Krypto-Gegenlesung. Die offenen Punkte stehen als Befunde in der Ratsche (Punkt 10) und als offene Klauseln im `konformitaet`-Block.

Alle Zeilenangaben gelten am Kanon c159013f0 (K = vivodepot.html, L = vivodepot-lesen.html, I = vivodepot-vc-issuer.html).

## Ausgangslage

Die Depot-Datei ist symmetrisch (PBKDF2 → HKDF → AES-256-GCM) und durch Quantenrechner nicht gebrochen. Gefährdet ist das Asymmetrische:
- der Antwort-Umschlag mit ECDH-ES auf P-256,
- der eine fest eingebaute Ed25519-Anker samt Zertifikatskette (K:2751, L:1116, I:4269; einzige Laufzeitstelle K:2882, L:1241),
- die Rezeptsignatur ES256 aus der Secure Enclave,
- die Selbstauskunft als SD-JWT mit Ed25519.

Fristen nach **BSI TR-02102-1, Version 2026-01**:
- Klassische Schlüsselvereinbarung allein nur bis Ende 2031, bei sehr hohem Schutzbedarf Umstieg bis Ende 2030 (Kap. 2.1, 2.3, Tab. 2.2).
- Klassische Signaturen allein nur bis Ende 2035 (Kap. 2.1, 5.3).
- Produkte mit Lebensdauer über 2030 sollen auf PQC aufrüstbar sein (Kap. 5.3).

Die **EU-PQC-Roadmap v1.1 (11.06.2025)** setzt die Meilensteine Ende 2026, Ende 2030 und Ende 2035.

kryptoVersion trägt einen Wechsel für das Depot. Für Signaturen und Anker trägt es nichts:
- Die Anker-Rotation vom 23.08.2026 (Commit 37aca1c44) war ein Austausch.
- Was der alte Anker signiert hatte, fiel ohne Übergang durch.

## Entscheidung

1. **Reihenfolge.** Zuerst die Agilität der Vertrauensarchitektur, dann die Algorithmen. Kein PQ-Verfahren wird eingebaut, bevor Kern und Lese-App mehrere Anker mit Laufzeit tragen.

2. **Anker-Satz mit Laufzeit (b).**
   - An die Stelle von `TRUST_AUTHORITY_PUBLIC_JWK` tritt in Kern, Lese-App und VC-Issuer ein eingebauter Anker-Satz: je Anker `kid`, Algorithmus, `gueltigAb`, `gueltigBis` und `nurPruefenBis`.
   - Eine Kette wird gegen den Anker geprüft, den ihr `kid` nennt. Zeitbezug ist die Laufzeit des Ankers, nicht nur „jetzt“.
   - Ein abgelöster Anker bleibt bis `nurPruefenBis` prüfend. Neue Signaturen entstehen nur unter aktiven Ankern.
   - Gilt ein Anker als kompromittiert, entfällt er sofort. Dafür wird die Widerrufsliste (K:2777) erweitert; heute enthält sie nur Anbieter-Schlüssel, keine Anker. Diese Erweiterung ist Teil des Vorschlags.
   - Damit lässt sich ein hybrider oder PQ-Anker neben Ed25519 einführen, ohne alte Signaturen zu entwerten. Alte Lese-App-Kopien prüfen weiter, was sie kennen.

3. **ES256 neben Ed25519, später hybrid mit ML-DSA (d).**
   - Rechtlich bindet die ACM heute Wallet-Anbieter (2024/2979 Art. 5a i. d. F. 2026/1731, ab 11.08.2026, für Wallet-Instanz ↔ WSCA) und Anbieter qualifizierter bzw. öffentlicher EAA (2026/1735).
   - Vivodepot ist derzeit weder das eine noch das andere.
   - Das ARF 3.0.0 OIA_03 nennt auch Attestation Provider und Relying Parties, als SHALL gefasst. Das ARF ist kein Rechtsakt und darum nicht rechtsverbindlich.
   - ACM v2.0 und TR-02102-1 führen Ed25519/EdDSA nicht; erst der ENISA-Entwurf „Version draft document, April 2026“ führt EdDSA.
   - 2026/1731 Anhang Ib: SA-1 lässt für Wallet-Instanz- und Key-Attestierungen der Wallet-Anbieter nur ES256/384/512 zu; nach SA-3 muss ein Credential Issuer alle drei prüfen können.
   - Dazu kommt HAIP 1.0 §7: Verifier müssen ES256 prüfen können; über 2024/2982 Anhang II i. d. F. 2026/1731 gilt das für Relying Parties.
   - **Vorsichtig angenommen:** Jeder Weg, der Vivodepot künftig in die EUDI-Rolle eines Attestation Providers oder einer Relying Party bringt, braucht einen ACM-konformen Algorithmus. Darum bekommt der Anker-Satz einen **ES256-Anker neben Ed25519**. Für den hybriden Schritt kommt später ML-DSA-65 dazu, verkettet mit ES256; JOSE-Bezeichner und Komposit-Entwurf siehe 6.

4. **Antwort-JWE: hybrider KEM (a).**
   - Für den Schlüsselpaar-Weg ist ML-KEM-768 + ECDH P-256 vorgesehen, sobald es einen festgelegten JOSE-Bezeichner gibt.
   - Stand 06.10.2026:
     - Das IANA-Register führt kein ML-KEM und keinen Hybrid.
     - Die Kandidaten stehen nur im WG-Entwurf draft-ietf-jose-hpke-pq-pqt-01 (HPKE-8…13, u. a. MLKEM768-P256).
     - Die Grundlage draft-ietf-jose-hpke-encrypt-22 ist noch kein RFC.
   - **Bis dahin wird nichts Eigenes erfunden.** Ein Format ohne Bezeichner wäre nicht interoperabel und nicht validierbar (Grundsatz „alle Standards sprechen“).
   - **Bereits herausgegebene Umschläge** schützt kein späterer Wechsel. Darum gelten zwei Regeln:
     - Die Frist richtet sich nach der Lebensdauer des Inhalts, nicht des Umschlags. **Eigene Einstufung, keine Normaussage:** Gesundheits- und Vorsorgedaten sind sehr hoher Schutzbedarf. Daraus folgt nach TR-02102-1 Kap. 2.1 Ende 2030.
     - Bis zum hybriden Weg bleibt der Einmalpasswort-Weg (PBES2-HS512+A256KW, symmetrisch) die empfohlene Form für langlebige Inhalte. Er ist nicht Shor-gefährdet.
   - Ein Hinweis in der Oberfläche ist zu prüfen (Report-before-Build).

5. **Basiszertifikate (c).**
   - BMJ und BZgA laufen bis 2036-08-23, also über das BSI-Ende 2035 für alleinige klassische Signaturen hinaus.
   - Neu ausgestellte Basiszertifikate laufen höchstens bis 2035-12-31 (Feld `expirationDate` der JWS-Nutzlast).
   - Die vorhandenen werden mit dem nächsten Anker-Satz neu ausgestellt, mit den Werkzeugen, die heute Behördenzertifikate ausstellen und Basistemplates neu signieren.
   - Eine Probe hält das reale Ablaufdatum fest; heute tut das keine.
   - Eine Nachsignatur nach TR-03125 (Evidence Records, Archivzeitstempel, Hash-Tree Renewal) passt nicht zu einer Offline-Datei ohne Zeitstempeldienst. Neu ausstellen ist der kleinere Weg.

6. **ML-DSA und ML-KEM im Browser (e). Eine Bau-Voraussetzung, kein Bau.**
   - Web Crypto:
     - Der WICG-Entwurf „Modern Algorithms in the Web Cryptography API“ vom 14.09.2026 steht nicht auf dem Standards-Track.
     - Chrome: `WebCryptoPQC` ist in 154 nur Origin Trial und ab 155 `stable` (Chromium-Quelltext); Chrome 155 wird laut chromiumdash am 06.10.2026 Stable.
     - Firefox: ML-KEM seit 157 eingebaut, aber nur in Nightly.
     - WebKit unterstützt die Hybrid-KEMs (standards-positions#704). Mozilla steht auf „neutral“, implementiert aber.
     - Folge: Bis alle Browser, die Vivodepot unterstützt, es stabil ausliefern, bleibt eine eingebettete Bibliothek nötig.
   - Eingebettet: **@noble/post-quantum 0.7.1** (27.08.2026), MIT-Lizenz, nur selbst auditiert, kein unabhängiges Audit gefunden.
   - Signatur-Bezeichner: **RFC 9964** (Mai 2026) legt ML-DSA-44/65/87 für JOSE fest, im IANA-Register eingetragen. Komposit-Signaturen (z. B. ML-DSA-65-ES256) stehen nur im WG-Entwurf draft-ietf-jose-pq-composite-sigs-04.
   - **Bau-Wort erst mit:**
     - Bibliothek mit gepinnter Fassung und Lizenz,
     - Prüfstand gegen FIPS 203/204 mit externen Testvektoren (NIST ACVP und Wycheproof, falls vorhanden; vorher messen),
     - Weg durch die Krypto-Wächter nach dem Muster der eingebetteten noble-ed25519 (K:60206 ff.): Pin in `third-party-hashes`, `geruest-waechter-grundlinie`, `krypto-aufrufer-grundlinie`, `krypto-block-propagation-pruefen`, `krypto-schluessel-export-pruefen`.

7. **Hash-Kennung (f).**
   - Fingerabdrücke sind heute reines Hex ohne Kennung: REZEPT_FINGERABDRUECKE (K:4210, L:1996), ABWERK_FRUEHERE (K:4261, L:2047), `_modulRezeptFingerabdruck` (K:26405).
   - Bevor ein zweites Hash-Verfahren kommt, bekommen neue Einträge eine Kennung (`sha256:` bzw. später `sha384:`). Bestehende ohne Kennung gelten als SHA-256.
   - TR-02102-1 Kap. 4 rät zu ≥ 384 Bit Ausgabe bei hohem oder langfristigem Schutzbedarf oder langlebigen Systemen, wenn Kollisionsresistenz gefordert ist.
   - Die Fingerabdrücke brauchen Kollisionsresistenz. Ein Wechsel auf SHA-384 ist darum vorgesehen, aber nicht vor der Hash-Kennung; sonst wären alte und neue Einträge nicht zu unterscheiden. Termin: mit dem Anker-Satz, siehe 8.

8. **Fristen und Reihenfolge (g):**

| Schritt | spätestens | Grund |
|---|---|---|
| Anker-Satz mit Laufzeit (2) und ES256-Anker (3) | Ende 2027 (**eigene Setzung, keine Normfrist**) | Voraussetzung für jeden weiteren Schritt. Die Roadmap empfiehlt den Mitgliedstaaten Inventar und Plan bis Ende 2026; für Unternehmen verlangt sie nichts. Das Inventar liegt mit der Bestandsaufnahme vor. |
| Hash-Kennung, danach SHA-384 (7) | mit dem Anker-Satz | gleiche Datei, gleiche Wächter |
| Basiszertifikate ≤ 2035 (5) | mit dem Anker-Satz | Neuausstellung unter dem neuen Satz |
| Hybrider KEM im Antwort-JWE (4) | Ende 2030 | TR-02102-1 Kap. 2.1, sehr hoher Schutzbedarf; Bezeichner abwarten |
| Hybride Signatur ES256 + ML-DSA (3) | vor Ende 2035 | TR-02102-1 Kap. 2.1, 5.3; Rezeptsignatur über `SecureEnclave.MLDSA65` (CryptoKit ab 26.0) |

9. **Ordnungsposten, ohne Ratsche (06.10.2026).**
   - Der VC-Issuer trägt am Anker `alg: 'Ed25519'`, Kern und Lese-App tragen `EdDSA`. Beim Import wird normalisiert (K:2621).
   - Mit dem Anker-Satz wird das einheitlich.
   - Dabei werden auch die veralteten Zeilenverweise im Issuer-Kommentar und die Nennung des alten Ankers in der Prosa von U2-ADR-040 nachgezogen.

10. **Befunde zu diesem ADR (Ratsche, offen, Eigentümer Krypto-Bau):** ANKER-OHNE-LAUFZEIT-UND-SATZ, BASISZERTIFIKATE-UEBER-2035, ANTWORT-JWE-ECDH-OHNE-PQ, SIGNATUR-OHNE-LANGZEITPRUEFUNG, FINGERABDRUCK-OHNE-HASH-KENNUNG.
   - **Erster Bauposten ist der Anker-Satz mit Hash-Kennung** (Punkte 2 und 7), mit eigenem Report-before-Build.
   - Der hybride KEM im Antwort-JWE (Punkt 4) folgt erst mit einem festgelegten JOSE-Bezeichner. Bis dahin gilt nur der Hinweis auf den Einmalpasswort-Weg. Er wird nie „quantensicher“ genannt und bekommt einen eigenen Report-before-Build mit Quellenprüfung.

## Abgrenzung

- Das Depot selbst wechselt nicht. kryptoVersion und U2-ADR-230 bleiben der Weg für symmetrische Parameter.
- Die vier passwortbasierten Stellen der externen Prüfung (U2-ADR-062) bleiben unberührt. Eine Zusatzfrage zum Wechselweg geht gebündelt mit den übrigen Fragen an die Prüfstelle.
- Merkle Tree Certificates (draft-ietf-plants-merkle-tree-certs-06) betreffen WebPKI/X.509. Vivodepot prüft keine solche Kette; nur Beobachtung.

## Verworfen

- **Sofort PQ-Algorithmen ohne Anker-Agilität:** Jede Rotation entwertete alle Signaturen erneut. Das ist die Lage vom 23.08.2026, nur größer.
- **Eigenes Hybrid-Format für JWE oder JWS ohne IETF-Bezeichner:** nicht interoperabel und nicht validierbar.
- **PQ-Verfahren allein, nicht hybrid:** BSI TR-02102-1 und ECCG ACM v2.0 wollen gitterbasierte Verfahren hybrid. Hashbasierte Signaturen (SLH-DSA, XMSS, LMS) dürfen allein stehen (TR-02102-1 5.3.4).

```yaml
konformitaet:
  - aussage: >-
      Kern und Lese-App prüfen eine Kette gegen den Anker ihres kid aus einem eingebauten Anker-Satz mit Laufzeit; ein
      abgelöster Anker prüft bis nurPruefenBis weiter, ein abgelaufener wird abgelehnt.
    zustand: offen
    frist: 2027-12-31
    bedingung: Bau des Anker-Satzes (Befund ANKER-OHNE-LAUFZEIT-UND-SATZ)
    herkunft: U2-ADR-486 (06.10.2026)
  - aussage: >-
      Neue Fingerabdrücke tragen eine Kennung des Hash-Verfahrens (sha256:); Einträge ohne Kennung gelten als SHA-256.
    zustand: offen
    frist: 2027-12-31
    bedingung: mit dem Anker-Satz (Befund FINGERABDRUCK-OHNE-HASH-KENNUNG)
    herkunft: U2-ADR-486 (06.10.2026)
  - aussage: >-
      Kein eingebautes Basiszertifikat läuft über 2035-12-31 hinaus.
    zustand: offen
    frist: 2027-12-31
    bedingung: Neuausstellung unter dem Anker-Satz (Befund BASISZERTIFIKATE-UEBER-2035)
    herkunft: U2-ADR-486 (06.10.2026)
  - aussage: >-
      Der Schlüsselpaar-Weg des Antwort-JWE ist hybrid (ML-KEM-768 mit ECDH P-256) unter einem festgelegten JOSE-Bezeichner.
    zustand: offen
    frist: 2030-12-31
    bedingung: festgelegter JOSE-Bezeichner (Befund ANTWORT-JWE-ECDH-OHNE-PQ)
    herkunft: U2-ADR-486 (06.10.2026)
```

---

*Vivodepot GmbH · Berlin · 06.10.2026*
