# U2-ADR-501: Die signierte Antwort und das Zertifikat der Stelle — für die Datei-Antwort und die direkte Übergabe

**Status:** Angenommen (15.10.2026) — Datei-Antwort gebaut und ausgeliefert (v933), direkte Übergabe nicht gebaut
**Datum:** 15.10.2026
**Kategorie:** KRYPTO, STANDARDS, EUDI, RÜCKWEG
**Linie:** U2
**Bezug:** U2-ADR-152 (die Anfrage von außen; §5 geprüfte Anfrage, §6 Anfrage ohne Zertifikat) · U2-ADR-437 (die Antwort sagt,
wer antwortet, als Angabe der Person) · U2-ADR-449 (die Antwort als JWE) · U2-ADR-457 (Selbst-Signatur der Halterin, Ed25519) ·
U2-ADR-080 (kein Import fremder Nachweise; bleibt) · U2-ADR-486 (Post-Quanten-Übergang, `ANKER_SATZ`) · U2-ADR-062 (externe
Krypto-Prüfung vor Produktivschaltung)
**Status heute:** gilt. **Gebaut und ausgeliefert** ist die Datei-Antwort: Die Lese-App liest signierte Antworten (G), der Kern
signiert jede Antwort mit dem Schlüssel je Stelle (H); der Schalter `ANTWORT_SIGNIEREN` steht seit 1ba9ffb42 auf `true` und ist mit
v933 ausgeliefert (Nachsehen: `git show <kanon>:vivodepot.html | grep '^const ANTWORT_SIGNIEREN'`). Im Studio ist der Hauptweg mit
Schlüsselpaar nur mit geprüftem Zertifikat gebaut (I). **Nicht gebaut** ist die direkte Übergabe nach OpenID4VP: kein Versand ohne
Zertifikat, und der Ankersatz „Zugang“ schließt nur mit Test-Listen (unten, „Was nicht entschieden ist“). Jeder weitere Bau braucht
ein Einzelwort der Krypto-Gegenlesung. Die offenen Punkte stehen als Befunde in der Ratsche (Punkt 23) und als offene Klauseln im
`konformitaet`-Block.

Zeilen- und Namensangaben gelten am Kanon 4d9d3b9c3 (K = vivodepot.html, L = vivodepot-lesen.html). Maßgeblich sind die Namen.

## Ausgangslage

- Die Antwort an eine Stelle ist heute ein JWE ohne Signatur (U2-ADR-449; `antwortVerschluesseln`, `antwortJweSchluessel`,
  `antwortJwePasswort` in K). Das JWE schützt nur bis zum Entschlüsseln. Danach kann niemand mehr zeigen, dass die Angaben
  unverändert sind.
- Die Lese-App zeigt jede Angabe und den Absender als „von der Person angegeben“ (U2-ADR-437, `antwortAngabeHerkunft` in L).
  Daran ändert dieses ADR nichts.
- Eine Anfrage der Stelle wird heute nur gegen Vivodepots eigenen Anker geprüft (`ANKER_SATZ`, U2-ADR-152 §5, U2-ADR-486). Ein
  Zertifikat einer amtlichen Stelle aus dem EUDI-Rahmen (Access Certificate, Registration Certificate) prüft der Kern nicht.
  X.509 gibt es im Produktteil des Kerns nicht.
- Die direkte Übergabe an eine Stelle (OpenID4VP, `direct_post.jwt`) ist entschieden: auf Klick der Person, auf einer eigenen
  Seite, nur auf eine signierte Anfrage mit gültigem Zertifikat, verschlüsselt an die genannte Adresse, ohne Speicherung bei
  Vivodepot. Die PID bleibt in der Wallet. Vivodepot ergänzt die Wallet; es ist nie eine Alternative zu ihr.
- Rechtlich ist der vertrauende Beteiligte nicht auf zertifizierte Wallets beschränkt. Die PID wird nur an eine Wallet
  ausgestellt und ist an sie gebunden (DVO (EU) 2024/2977 Art. 3 Abs. 5). Das ist eine Auslegung aus dem Wortlaut von eIDAS,
  den Durchführungsverordnungen und dem EBDIG-Entwurf, keine Rechtsberatung.

Dieses ADR gilt für **beide Wege**: die Datei-Antwort auf eine Anfrage nach U2-ADR-152 und die direkte Übergabe nach OpenID4VP.

## Entscheidung

### A · Was die Signatur leistet und was nicht

1. **Die Signatur beweist zweierlei, nicht mehr:**
   - Die Angaben sind **seit dem Signieren unverändert**, auch nachdem die Stelle entschlüsselt und intern weitergegeben hat.
   - Eine weitere Antwort mit **demselben Schlüssel** stammt aus demselben Depot wie die frühere (Schlüsselkontinuität je Stelle).
2. **Die Signatur beweist nie, wer antwortet.** Wer den öffentlichen Schlüssel einer Anfrage kennt, kann eine Antwort bauen und
   mit seinem eigenen Schlüssel signieren. Die Signatur ist dann gültig. Kein Anzeigetext, keine Datei und kein Außentext nennt
   eine signierte Antwort „geprüft“, „verifiziert“ oder „echt“.
3. **Erster Kontakt.** Hat bei einer Stelle zuerst ein Fälscher geantwortet, erscheint die echte Person danach als neuer
   Schlüssel. Darum gilt:
   - Der zuerst gesehene Schlüssel wird nie als der richtige dargestellt.
   - „Neuer Schlüssel“ ist eine neutrale Sachangabe, keine Warnung und kein Fehler.
   - Die Lese-App zeigt: „unverändert seit dem Signieren · Schlüssel ‹Abdruck› · bei dieser Stelle zuerst am ‹Datum›“, bzw.
     „neuer Schlüssel · ‹Abdruck›“. Das Gedächtnis „zuerst am …“ liegt in der Lese-App der Stelle, nicht bei Vivodepot.
4. **Identität nur über die Wallet.** Will die Stelle die Identität der Person **hier** feststellen, reicht Vivodepot in
   derselben Sitzung an die Wallet weiter, und die Wallet präsentiert die PID.
   - Eine kryptographische Bindung „PID und Vivodepot-Angaben gehören zu derselben Person“ gibt es nicht. Dafür fehlt ein
     gemeinsames Sicherheitselement. Die Stelle sieht nur, dass beide in **derselben Sitzung** kamen (gleiche `nonce`/`state`).
   - Diese Grenze steht in der Lese-App und im Datenblatt für Stellen als Sachsatz.
5. **Regel: Die Antwort ohne Personenbindung bleibt ein gültiger Weg.**
   - Kennt die Stelle die Person schon auf anderem Weg (Anmeldung über BundID, Aktenzeichen, persönlich), bekommt sie die
     signierte Antwort ohne PID.
   - Die Wallet ist nur nötig, wenn die Stelle die Identität erst hier feststellen will.
   - Eine fehlende PID ist nie ein Mangel der Antwort und wird nie als Mangel gezeigt. Die Lese-App sagt, was die Signatur
     zeigt und was nicht, als Sachsatz, nie als Warnung.
6. **Außentexte** sagen: Vivodepot ergänzt die Wallet. Nie „Alternative zur Wallet“, nie „statt der Wallet“.

### B · Schlüssel je Stelle

7. **Ein Schlüssel je Stelle, nicht je Depot.** Über Stellen hinweg sind die Schlüssel nicht verkettbar; bei derselben Stelle
   ist der Schlüssel wiedererkennbar. Das gilt auch für die OpenID4VP-Präsentation (KB-JWT, `cnf`), sobald sie produktiv wird.
8. **Eingabe der Ableitung ist ein zufälliger Antwort-Seed**, nicht der passwortabgeleitete Halter-Seed aus U2-ADR-457.
   - 32 Byte aus `crypto.getRandomValues`, beim ersten Bedarf angelegt, im verschlüsselten Teil des Depots gespeichert und
     mitgesichert.
   - Er übersteht Passwortwechsel und Wiederherstellung. Mit dem Halter-Seed wechselte jeder Passwortwechsel den Schlüssel bei
     allen Stellen, und die Schlüsselkontinuität (Punkt 1) liefe ins Leere.
   - Folge: eine Schema-Änderung (neues Feld im verschlüsselten Teil). Ein altes Depot ohne Seed öffnet sich unverändert und legt
     den Seed beim ersten Bedarf an. Die Sicherung muss in 5 und in 50 Jahren aufgehen: eine Sicherung aus der Fassung vor der
     Änderung und eine mit Seed öffnen mit dem dann aktuellen Kern und mit der Lese-App.
9. **Ableitung:** HKDF-SHA-256 aus dem Antwort-Seed. Die 32 Byte Ausgabe sind der Ed25519-Seed. Import, Nicht-Extrahierbarkeit,
   Überschreiben der Puffer und Berechnung des öffentlichen Schlüssels folgen U2-ADR-457 Punkt 2 und 3.
   - `info` in der festgeschriebenen Form von Punkt 28: `vivodepot/antwort-schluessel/v1` ‖ 0x00 ‖ Verwendung ‖ 0x00 ‖ Länge der
     Kennung (2 Byte big-endian) ‖ Kennung. Die Kennung selbst trägt ihre Domäne und eine Länge fester Breite (Punkt 10, `stellenKennung`).
   - Zwei getrennte Domänen der Kennung: `signiert:` für eine Stelle, deren Kennung aus einem geprüften Zertifikat stammt, `unsigniert:` für
     eine Kennung, die nur die Anfrage über sich behauptet. Eine unsignierte Anfrage mit fremder Kennung erzeugt so nie den
     Schlüssel einer geprüften Stelle.
   - In der Domäne `signiert:` steht vor der Kennung ihre Art (Anbieter-Kennung aus `ANKER_SATZ` oder DNS-Name aus dem Rahmen
     „Zugang“), damit sich die beiden Namensräume nicht überschneiden.
10. **Die Kennung der Stelle ist stabil über Zertifikatserneuerungen.** Sie ist nie der Abdruck eines Zertifikats.
    - Direkte Übergabe mit `x509_san_dns`: der DNS-Name aus der `client_id`, der einem dNSName im SAN des Blatts gleichen muss
      (weitere SAN-Einträge sind erlaubt).
    - Direkte Übergabe mit `x509_hash`: das `organizationIdentifier` aus dem Subject des Blatts. Für Access Certificates an
      juristische Personen ist es Pflicht (ETSI TS 119 411-8 V1.1.1, GEN-6.6.1-05) und über Erneuerungen stabil. Fehlt es, entsteht
      keine signierte Antwort und kein Versand.
    - Datei-Antwort auf eine geprüfte Anfrage: die Anbieter-Kennung aus dem signierten Zertifikat (U2-ADR-152 §5).
    - Datei-Antwort auf eine Anfrage ohne Zertifikat: die Kennung, die die Anfrage nennt (`anbieterId`), in der Domäne
      `unsigniert:`.

### C · Die signierte Antwort

11. **Sign-then-encrypt, für beide Wege und beide JWE-Verfahren** (Schlüsselpaar und Einmalpasswort):
    - JWS Compact über die Nutzlast, signiert mit dem Schlüssel der Stelle.
    - Kopf: `alg` `Ed25519` (U2-ADR-457 Punkt 4; RFC 9864 führt `EdDSA` als „Deprecated“, gelesen wird es weiter), `typ`
      `vivodepot-antwort+jwt`, `kid` = JWK-Thumbprint nach RFC 7638, `jwk` = der öffentliche Schlüssel der Stelle.
    - Nutzlast: der heutige Antwort-Datensatz, dazu `iat`, `aud` = Kennung der Stelle (Punkt 10) und der Bezug auf die Anfrage
      (Vorgang und Abdruck der Anfrage). Eine Antwort passt damit nicht an eine andere Anfrage und nicht an eine andere Stelle.
      `aud` steht in der signierten Nutzlast, weil die Stelle nach dem Entschlüsseln weitergeben kann.
    - Danach das JWE wie heute (U2-ADR-449), mit `cty` `JWT`. Für die direkte Übergabe gilt der eigene Kopf der
      OpenID4VP-Antwort.
12. **Die Lese-App prüft nach dem Entschlüsseln den JWS.**
    - Sie nimmt nur eine Ed25519-Signatur an (`alg` `Ed25519` oder `EdDSA`, Schlüssel Ed25519). ES*, HS*, `none` und jede andere
      Paarung werden abgewiesen.
    - Ungültige Signatur, fremdes `aud`, fremder Anfrage-Bezug: Abweisung mit Grund, kein Inhalt wird gezeigt.
    - Fehlt die Signatur, zeigt sie „Antwort ohne Signatur“ als Sachangabe (Antworten aus Fassungen vor dem Bau). Wie lange das
      gilt, ist offen (unten).
    - Sie zeigt nie „geprüft“ (Punkt 2) und nie einen Mangel wegen fehlender PID (Punkt 5).
13. **Reihenfolge: Lese-App zuerst.** Eine Lese-App vor dem Bau kennt `cty` `JWT` nicht und öffnet eine signierte Antwort nicht.
    - Der Kern signiert hinter dem Schalter `ANTWORT_SIGNIEREN`, **ab Werk aus**.
    - Umgelegt wird er erst in der Fassung **nach** der, die das Lesen signierter Antworten zum ersten Mal ausliefert. Das
      Umlegen ist ein eigener Schritt einer Folgefassung.
    - Eine Probe hält gegen das Fassungsregister: In der ersten Fassung mit dem Lese-Merkmal steht der
      Schalter aus. Eine zweite Probe hält ab der Fassung des Umlegens fest, dass jeder Weg zu `antwortJwe*` über das Signieren
      läuft.

### D · Das Zertifikat der Stelle

14. **Zwei Wege, verschiedene Regeln:**

| Weg | Ohne Zertifikat | Mit Zertifikat |
|---|---|---|
| **Datei-Antwort** (Anfrage nach U2-ADR-152) | angenommen, eigener Schritt nach U2-ADR-152 §6 (bleibt) | geprüft gegen den Ankersatz „Zugang“ **oder** wie heute gegen `ANKER_SATZ` |
| **Direkte Übergabe** (OpenID4VP) | **nie** ein Versand | Access Certificate (`x5c` im signierten Request-Objekt) gegen „Zugang“, dazu das Registration Certificate (Punkt 18) |

15. **Ankersatz „Zugang“, beim Bau gezogen, im Kern nur gelesen.**
    - Quelle: amtliche Listen der Access-CAs je Mitgliedstaat (List of Trusted Entities nach ARF/ETSI). Für Behörden-Siegel die
      EU-Vertrauensliste (LOTL, dann die nationale Liste).
    - Ein Werkzeug im Repo (das Bauwerkzeug des Ankersatzes „Zugang“) holt die Liste beim Bau, prüft ihre Signatur gegen den gepinnten
      Listen-Anker und schreibt die CA-Zertifikate mit Abdruck (`sha256:`), Herkunft, Abrufdatum und `nextUpdate` in einen Block im
      Kern. Der Kern bleibt `connect-src 'none'`.
    - Getrennt von `ANKER_SATZ`. Ein Zugangs-Anker gilt nie als Modul- oder Anbieter-Anker und umgekehrt (Trennprobe).
    - **Herkunft des gepinnten Listen-Ankers:** der Signaturschlüssel, den der Herausgeber der Liste amtlich bekanntmacht. Für die
      LOTL sind das die im Amtsblatt der EU bekanntgemachten Zertifikate (Weg zum Nachsehen: Erläuterung der Kommission zur Pivot-LOTL, https://ec.europa.eu/tools/lotl/pivot-lotl-explanation.html, Abschnitt 4: „the Commission publishes in the OJEU, the LOTL-signing certificates“); für die deutschen Access-CA-Listen ist ein produktiver
      Herausgeber-Schlüssel nicht belegt (heute nur Test-Listen). **Weg zum Nachsehen:** Der Block im Kern nennt je Listen-Anker
      Quelle (URL der Bekanntmachung), Abdruck und Abrufdatum; das Werkzeug gibt dieselben Angaben mit `--zeigen` aus.
16. **Zeit der Liste.** Nach dem `nextUpdate` der Liste wird nie still weiter angenommen:
    - **Direkte Übergabe:** abgewiesen, kein Versand. Die Person sieht „Die Liste der zugelassenen Stellen in dieser Fassung ist
      abgelaufen; eine neuere Fassung von Vivodepot bringt sie mit.“
    - **Datei-Antwort:** Eine Anfrage, deren Kette nur zu „Zugang“ führt, wird wie eine Anfrage ohne Zertifikat behandelt und
      bekommt den eigenen Schritt nach U2-ADR-152 §6. Eine Anfrage, die gegen `ANKER_SATZ` geprüft ist, ist davon nicht berührt.
    - **Anzeige:** Wo eine Stelle aus „Zugang“ genannt wird, steht der Stand der Anker dabei (Liste, Abrufdatum, gültig bis).
17. **Keine Sperrprüfung offline.** Sperrlisten und OCSP gibt es ohne Netz nicht. Geprüft werden nur Kette, Gültigkeitszeit und
    Liste. Ein neuer oder entzogener Anker kommt erst mit der nächsten Fassung. Diese Grenze steht im Datenblatt für Stellen.
18. **Was zur Laufzeit geprüft wird:**
    - Kette bis „Zugang“, Gültigkeitszeit jedes Zertifikats, keyUsage am Blatt vorhanden mit `digitalSignature` **oder** `nonRepudiation` (Typen nach EN 319 412-2/-3; ein Siegel trägt oft nur `nonRepudiation`), Anker mit `keyCertSign`.
    - `client_id`-Präfix: `x509_san_dns` gegen den SAN, `x509_hash` gegen den SHA-256 des Blatts; `response_uri` passend.
      Jede Abweichung ist eine Abweisung mit roter Probe.
    - Namensverkettung byte-gleich. Ein Name, der nur nach RFC 5280 gleich wäre, wird abgewiesen (benannt, mit Probe).
    - **Registration Certificate** (`verifier_info`): Name der Stelle, Zweck, erlaubte Angaben. Der Abgleich ist strikt: Jede
      verlangte Angabe, die dort nicht steht, zählt als Mehrverlangen, auch eine unbekannte. Platzhalter gibt es nicht. Bei
      Mehrverlangen sendet Vivodepot nichts und zeigt der Person, was mehr verlangt wird.
19. **Was außerhalb des Umfangs liegt, wird abgewiesen, nie übergangen.** Ein Zertifikat ist „nicht prüfbar“ und wird nicht
    angenommen, wenn es trägt:
    - nameConstraints,
    - Richtlinienbeschränkungen (policyConstraints, inhibitAnyPolicy, Policy-Mappings),
    - eine unbekannte kritische Erweiterung,
    - ein extendedKeyUsage **ohne** erlaubten Zweck (erlaubt: serverAuth, clientAuth, ISO/IEC 18013-5 Reader Authentication
      1.0.18013.5.1.6, anyExtendedKeyUsage),
    - ein fehlendes keyUsage oder eines ohne `digitalSignature` und ohne `nonRepudiation`.
    - ein als kritisch markiertes extendedKeyUsage (EN 319 412-2 §4.3.10), eine Seriennummer über 20 Byte (RFC 5280 §4.1.2.2),
      ein leerer Inhaber-Name an einer CA, ein Blatt ohne certificatePolicies (ETSI TS 119 411-8 GEN-6.6.1-03; eine ETSI-OID ist
      nicht verlangt, sie wird angezeigt),
    - **ein Anker mit extendedKeyUsage, gleich welchem** (strenger als an Zwischen-CAs, wo „vorhanden ohne erlaubten Zweck“ abweist).
      Grund: Eine Aussage, ob Access-CAs ein EKU tragen dürfen, ist nicht gemessen; abweisen ist fail-closed und umkehrbar. Schon
      der Bau nimmt einen solchen Anker nicht in den Ankersatz „Zugang“ auf und meldet ihn mit Abdruck und Grund
      (das Bauwerkzeug des Ankersatzes „Zugang“), damit es nicht erst zur Laufzeit bei jeder Stelle unter diesem Anker auffällt.
      **Befristet:** bis zur Gegenmessung an den deutschen Test-Trust-Listen (s. „Was nicht entschieden ist“).
    Je Art gibt es eine rote Probe. **Ein fehlendes extendedKeyUsage wird angenommen:** Das Profil der Access Certificates verlangt
    keines (ETSI TS 119 411-8 V1.1.1 §6.6.1 verweist auf EN 319 411-1 ohne die Teile zur Web-Authentisierung; EN 319 412-2 §4.3.10
    verlangt nur, dass es nicht kritisch ist), und das Test-Zertifikat des EU-Referenz-Verifiers trägt keines. Weg zum Nachsehen:
    ETSI-Dokumente unter `etsi.org/deliver/etsi_ts/119400_119499/11941108/01.01.01_60/`, Abschnitt 6.6.1.

### E · Der X.509-Leser

20. **Eigener Leser im Produktteil des Kerns, keine Bibliothek.**
    - **Kriterien:** eine Datei, offline, `connect-src 'none'` (beide erfüllbar) · Größe: eigener Leser rund 15 KB, pkijs mit
      asn1js rund 890 KB unminifiziert, beim Kern von 5,31 MB rund +17 % auf jeder Kopie · Lizenz: beide verträglich ·
      Angriffsfläche: pkijs deckt CMS, OCSP, CRL und RSA ab, gebraucht würden rund 5 % · Lesbarkeit in 50 Jahren: ein kleiner,
      kommentierter Leser ist eher zu prüfen als ein gebündelter Fremdbaum. Die Depot-Datei hängt nicht an X.509; gespeicherte
      Antworten tragen Ed25519-JWS ohne X.509.
    - **Umfang:** nur striktes DER mit festen Längen- und Tiefengrenzen; nur EC P-256/P-384/P-521 mit ECDSA SHA-256/384/512, `alg`
      passend zur Kurve, `r‖s` passend lang; Kettentiefe höchstens drei Zwischenstufen; alles Unbekannte fail-closed. P-384 und
      P-521 werden erst angeboten, wenn sie in WebKit gemessen sind, sonst dort sichtbar abgewiesen.
    - **Eigene Spanne** im Kern, nicht in der Entwicklerleiste. Spike-Teile bleiben in der Entwicklerleiste; die Schnitt-Probe
      hält beide auseinander.
    - **Fremdvektoren als Probe:** Wycheproof ECDSA (gepinnter Commit), die DER-Grenzfälle (unbestimmte Länge, Länge über das
      Ende, nicht minimale Länge, fremde Tags, Restbytes), gekürzte und verschachtelte Eingaben mit Zeit- und Tiefengrenze, und
      x509-limbo (C2SP/x509-limbo, Commit `554528a9b0c0d95e071f55de018326f0b65a8364`, limbo.json sha256
      `611e337b9fb477b927bae65434650692cb9d2070ff5b05f975d0403510acd4de`, Apache-2.0). Gepinnt wird die Auswahl im Repo mit
      Abrufweg und sha256, nicht die ganze Datei. Dazu eine Gegenprobe gegen pkijs bzw. openssl außerhalb des Kerns, als
      Werkzeug im Repo.
    - **Umfang der x509-limbo-Probe**, festgelegt vor jedem Lauf. Ein Fall gehört dazu, wenn alle Bedingungen gelten:
      Gruppe rfc5280, webpki, pathlen, pathological, cve oder invalid · `validation_kind` SERVER · jedes Zertifikat EC
      P-256/384/521, signiert mit ecdsa-with-SHA256/384/512 · kein Merkmal has-crl, has-mldsa, name-constraint-dn,
      has-policy-constraints, rfc5280-incompatible-with-webpki, keine Gruppe crl/online/rfc9881 · höchstens drei Zwischenstufen ·
      verlangter Name ein DNS-Name ohne Platzhalter. Die Liste der Fälle im Umfang erzeugt ein Werkzeug aus den Metadaten (DER
      gelesen mit openssl, nicht mit dem zu prüfenden Leser) und pinnt sie mit Zahl und sha256, bevor der Leser gegen sie läuft.
      Jeder FAILURE-Fall aus allen Gruppen wird zusätzlich gefahren; eine Annahme außerhalb des Umfangs wird mit Grund gelistet.
      SUCCESS-Fälle außerhalb des Umfangs werden abgewiesen und namentlich mit Grund gelistet, nie still übersprungen.
    - **Umkehrschwelle, vor dem Lauf festgelegt:** Ein angenommener FAILURE-Fall im Umfang ist sofort ein Befund. Mehr als drei
      abgewiesene SUCCESS-Fälle im Umfang kehren die Entscheidung zu pkijs um. Das Ergebnis wird berichtet, nicht still
      nachgebessert.

### F · Post-Quanten, Prüfung, Befunde

21. **Post-Quanten:** unverändert nach U2-ADR-486. Ed25519 für die Antwort-Signatur und ECDSA für die Zertifikate der Stelle sind
    klassische Verfahren; ihr Übergang folgt dem Plan dort. Für langlebige Inhalte bleibt der Einmalpasswort-Weg des JWE die
    empfohlene Form (U2-ADR-486 Punkt 4).
22. **Externe Krypto-Prüfung** vor der Produktivschaltung, wie bei U2-ADR-047, -153 und -457. Ihr Umfang umfasst den X.509-Leser
    (Abschnitt E), die Ableitung je Stelle (Punkte 8–9) und das Signieren der Antwort (Punkt 11).
23. **Befunde (Ratsche, offen):** ANTWORT-AN-STELLE-UNSIGNIERT, STELLE-NUR-EIGENER-ANKER, ANTWORT-OHNE-PERSONENBINDUNG. Die
    Abnahme von ANTWORT-OHNE-PERSONENBINDUNG folgt Punkt 5: Die Grenze steht als Sachsatz in ADR, Lese-App und Datenblatt; der Weg
    „Identität über die Wallet“ ist gebaut, mit der Grenze „gleiche Sitzung, keine kryptographische Bindung“; eine Probe hält,
    dass eine Antwort ohne PID gültig angenommen und nicht als mangelhaft gezeigt wird.

### G · Die Schlüsseldatei trägt ihre Anfrage (Nachtrag 15.10.2026, Wagen V3b)

24. **Ein Empfangspaar je Anfrage.** Das Studio erzeugt das Paar beim Erzeugen der Anfrage, für genau diese Anfrage; ein früheres
    Paar wird nicht wiederverwendet. Erst wird die Anfrage mit dem öffentlichen Teil signiert, dann die Schlüsseldatei geschrieben.
25. **Eine Datei, kein Dateipaar.** Die `.vdkey` trägt die Anfrage als ungeschütztes Feld (sie ist nicht geheim), lesbar dazu
    Vorgang und Datum; ihr Abdruck (SHA-256, base64url) steht im verschlüsselten JWK. Der Hüllen-Block bleibt unverändert: eine
    ältere Lese-App überliest die zusätzlichen Felder. Der Dateiname nennt Vorgang und Datum, und die Lese-App sagt beim Öffnen,
    welche Schlüsseldatei eine Antwort braucht.
26. **Die Bindung in der Lese-App.** Abdruck → öffentlicher Teil des Schlüssels = Empfangsschlüssel der Anfrage → Zertifikat und
    Anfrage-Signatur geprüft wie im Kern → `anbieterId` aus dem signierten Zertifikat. Erst damit wird `aud` abgeglichen (Punkt 12).
    Der Vorgang kommt aus der getragenen Anfrage, nicht aus dem JWE-Kopf. Ohne Zertifikat ist die Stelle nicht gebunden: kein
    Abgleich, nur die Sachangabe. Jeder Bruch der Kette ist eine Abweisung mit Satz.
27. **Zeitpunkt: kein `iat` in der Anfrage.** Geprüft wird zum signierten Tag `gestelltAm` (UTC). Das Zertifikat trägt, wenn es zu
    irgendeinem Zeitpunkt dieses Tages gültig war: notBefore ≤ Tagesende und notAfter ≥ Tagesanfang. Ein `iat` in der Nutzlast
    ließe jede ältere Fassung einen unbekannten Schlüssel melden; eines im JWS-Kopf hieße den gepinnten JWS-Block ändern.
    **Grenze:** Den Tag setzt die Stelle selbst. Mit einem abgelaufenen oder zurückgezogenen Schlüssel kann sie zurückdatieren;
    offline gibt es keinen vertrauenswürdigen Zeitstempel. Das gälte für ein `iat` genauso. Ein Widerruf (Sperrliste, Anker)
    schlägt jedes Datum.

### H · Der Kern signiert (Nachtrag 16.10.2026, Wagen V4)

28. **Ableitung des Schlüssels je Stelle, festgeschrieben.** HKDF-SHA-256 aus dem Antwort-Seed des Depots (32 Byte), Salt leer,
    info = UTF-8 „vivodepot/antwort-schluessel/v1“ ‖ 0x00 ‖ UTF-8 Domäne ‖ 0x00 ‖ Länge der Kennung in Byte (2 Byte big-endian) ‖
    UTF-8 Kennung (stellenKennung, Punkt 9). Die 32 Byte sind der Ed25519-Seed (RFC 8032), privat nur nicht extrahierbar importiert.
    Domäne heute nur „antwort“; „sdjwt-halter“ ist vorgemerkt, über den Wechsel des Halter-Schlüssels nach U2-ADR-457 wird eigens
    entschieden. **Testvektor:** Seed = Bytes 0x00 bis 0x1f, Kennung „signiert:anbieter:0014:heim/sonnenhof“ → öffentlicher
    Schlüssel (x, base64url) „tIlI1AwNs41st1Lx3e5k1e3w3-lppuYUz6P4_UFWTRk“. Jede spätere Umsetzung muss ihn treffen, sonst findet sie
    für alte Antworten nicht denselben Schlüssel.
29. **Nutzlast und `aud`.** Wie Punkt 11; `aud` trägt die Domäne „signiert:“ nur, wenn die Anfrage beim Herausgeben frisch gegen ihr
    Zertifikat geprüft ist, sonst „unsigniert:“ mit der Kennung, die die Anfrage nennt. Damit die frische Prüfung gelingt, trägt ein
    gespeicherter Eintrag die rohe signierte Anfrage (Befund ANFRAGE-GESPEICHERT-NIE-GEPRUEFT, im selben Wagen geschlossen).
30. **Ohne Ed25519 im Browser** bleibt die Antwort unsigniert; die Person kann antworten. Still bleibt das nicht, und beides ist
    Bedingung des Wagens, der den Schalter umlegt: (a) Der Kern sagt es vor dem Senden in einem Satz („Diese Antwort wird nicht
    signiert, weil Ihr Browser die nötige Signatur nicht kann.“). (b) Die Antwort trägt im verschlüsselten Teil die Angabe
    „unsigniert: browser“, und die Lese-App zeigt sie als „unsigniert (Browser ohne Ed25519)“, nicht als Antwort einer älteren Fassung.
31. **Schalter.** `ANTWORT_SIGNIEREN` steht mit diesem Wagen aus; umgelegt wird er in einem eigenen Wagen (Punkt 13).

### I · Hauptweg im Assistenten: Schlüsselpaar nur mit Zertifikat geprüft (Nachtrag 18.10.2026)

Entscheidung vom 18.10.2026 („Hauptweg ja“): Im Assistenten „Anfrage“ ist das Schlüsselpaar der Stelle der Weg ohne getrenntes
Passwort; das Einmalpasswort bleibt der zweite Weg.

32. **Nur mit Zertifikat geprüft.** Eine Signatur mit dem eigenen Schlüssel allein schützt die Person nicht: ohne Zertifikat ist die
    Anfrage im Kern ungeprüft (`anfrageSignaturPruefen`: `ohne-zertifikat`), und ein vertauschter Link signiert ebenso mit einem
    eigenen Schlüssel. Das Schlüsselpaar wird deshalb nur vorausgewählt, wenn das Zertifikat der Stelle geprüft ist. Ohne Zertifikat
    bleibt das Einmalpasswort die Vorauswahl; dort reist das Passwort getrennt von der Anfrage.
33. **Drei Bedingungen.** (a) Das Zertifikat wird gegen den Anker geprüft, mit derselben Funktion wie im Kern; das Studio führt
    `verifiziereProviderCredential` und die Anker wortgleich (Soll-Liste der Krypto-Hülle). (b) Der Schlüssel im Zertifikat ist der
    eigene Tresor-Schlüssel (RFC-7638-Abdruck gleich); ein fremdes, gültiges Zertifikat wird abgewiesen. (c) Der Weg entscheidet sich
    beim Erstellen der Anfrage; abgelaufen oder widerrufen heißt Einmalpasswort.
34. **Empfangspaar je Anfrage** bleibt (Punkt 24). Die Stelle sichert die Schlüsseldatei der Anfrage mit eigenem Passwort; die Person
    braucht keines. Ein dauerhaftes Empfangspaar für alle Anfragen ist verworfen.
35. **Öffnen im Studio.** Antworten öffnen mit der Schlüsseldatei der Anfrage; die Bindung (Punkt 26) läuft wortgleich wie in der
    Lese-App. `aud` wird gegen die Kennung aus dem signierten Zertifikat gehalten, der Vorgang gegen die getragene Anfrage. Ohne
    Schlüsseldatei öffnet das Einmalpasswort wie bisher, ohne Abgleich von `aud`.

## Abgrenzung

- U2-ADR-080 bleibt: Vivodepot importiert und prüft keine Nachweise fremder Aussteller. Dieses ADR prüft das Zertifikat der
  **Stelle**, die fragt, nicht Nachweise, die die Person hält.
- U2-ADR-437 bleibt: Absender und Angaben sind Angaben der Person. Die Signatur ändert ihre Herkunftsanzeige nicht.
- U2-ADR-152 §6 bleibt für die Datei-Antwort: Eine Anfrage ohne Zertifikat wird angenommen und bekommt den eigenen Schritt.
- Die Wahl des Algorithmus der OpenID4VP-Präsentation (Ed25519 oder ES256 je Stelle für HAIP) ist nicht Teil dieses ADR. Für ES256
  lässt sich P-256 in WebCrypto nicht aus einem Seed ableiten (U2-ADR-457 Punkt 4); dann je Stelle ein erzeugtes, im Depot
  verschlüsseltes Paar. Das wird vor dem Pilot entschieden.
- Der Spike gegen den Referenz-Verifier bleibt bei einem Halter-Schlüssel; eine Probe hält den Spike-Weg aus jedem ausgelieferten
  Produkt.

## Verworfen

- **Ein Schlüssel je Depot für alle Stellen:** macht die Person über Stellen hinweg wiedererkennbar.
- **Ableitung aus dem passwortabgeleiteten Halter-Seed:** jeder Passwortwechsel wechselte den Schlüssel bei allen Stellen.
- **Zertifikats-Abdruck als Kennung der Stelle:** jede Erneuerung des Zertifikats ergäbe einen neuen Schlüssel.
- **Encrypt-then-sign oder nur JWE:** Nach dem Entschlüsseln bliebe nichts, das Unverändertheit zeigt; eine Signatur außen
  verriete den Schlüssel jedem, der die Datei sieht.
- **Anker zur Laufzeit aus dem Netz:** bricht `connect-src 'none'` des Kerns.
- **Direkte Übergabe ohne Zertifikat, mit Bestätigung der Person:** widerspricht der Bedingung „ohne gültiges Zertifikat kein
  Versand“.
- **pkijs im Kern:** Abschnitt E.

## Was nicht entschieden ist

- **Gegenmessung an den deutschen Test-Trust-Listen** (Eigentümer: Krypto-Strang, Frist 2027-01-31): keyUsage und extendedKeyUsage
  an Blättern, **extendedKeyUsage an Ankern** (die strengere Regel aus Punkt 19 fällt oder bleibt danach ausdrücklich) und
  **nameConstraints an Zwischen-CAs** (nutzt eine echte Kette sie, ist das ein Befund vor der direkten Übergabe im Produkt). Damit die
  vorläufige Schärfe nicht aus Versehen dauerhaft wird.
- Ein produktiver Herausgeber-Schlüssel der deutschen Access-CA-Listen (Punkt 15). Ohne ihn schließt der Ankersatz „Zugang“ nur
  mit Test-Listen, und die direkte Übergabe bleibt im Produkt ohne Anker.
- Wie lange die Lese-App Antworten ohne Signatur als Sachangabe zeigt (Punkt 12).
- Ob Stellen eine Signatur der Person in ihren Fachverfahren auswerten können: nicht erhoben.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Kein Anzeigetext in Kern und Lese-App nennt eine signierte Antwort „geprüft“, „verifiziert“ oder „echt“; die Lese-App zeigt
      Unverändertheit, Schlüssel-Abdruck und „zuerst am“ bzw. „neuer Schlüssel“ als Sachangabe, und eine Antwort ohne PID gilt und
      wird nicht als mangelhaft gezeigt.
    zustand: offen
    frist: 2026-12-31
    bedingung: Erweiterung von tests/vertrauen-nie-aus-selbstauskunft.test.js und Probe zur Antwort-Signatur (geplant), je mit Rot-Beweis
    herkunft: U2-ADR-501 (15.10.2026)
  - aussage: >-
      Der Antwort-Seed liegt im verschlüsselten Teil des Depots, wird beim ersten Bedarf angelegt, übersteht Passwortwechsel und
      Wiederherstellung, und Sicherungen aus der Fassung davor und mit Seed öffnen mit Kern und Lese-App.
    zustand: offen
    frist: 2026-12-31
    bedingung: Sicherbarkeits-Probe in tests/antwort-seed-sicherbarkeit.test.js (geplant)
    herkunft: U2-ADR-501 (15.10.2026)
  - aussage: >-
      Zwei Stellen ergeben zwei verschiedene Schlüssel, dieselbe Stelle denselben; eine unsignierte Anfrage mit der Kennung einer
      geprüften Stelle ergibt nie deren Schlüssel; nach Sicherung, frischem Öffnen und Wiederherstellung mit neuem Passwort bleibt der
      Schlüssel je Stelle derselbe, und der Testvektor aus Punkt 28 stimmt.
    zustand: erfuellt
    herkunft: U2-ADR-501-Nachtrag (16.10.2026)
    pruefung:
      - tests/kern-antwort-signieren.test.js "[Antwort-Signatur·Vektor] info in fester Form und der öffentliche Schlüssel aus dem Vektor, unabhängig nachgerechnet"
      - tests/kern-antwort-signieren.test.js "[Antwort-Signatur·je Stelle] zwei Stellen, zwei Schlüssel; dieselbe Stelle, derselbe; signiert und unsigniert getrennt"
      - tests/kern-antwort-signieren.test.js "[Antwort-Signatur·je Stelle·Rot-Beweis] eine Ableitung ohne die Kennung in info machte zwei Stellen gleich"
      - tests/kern-antwort-signieren.test.js "[Antwort-Signatur·Sicherbarkeit] Sicherung, frischer Kern, Wiederherstellung mit Code und neuem Passwort: derselbe Schlüssel je Stelle"
  - aussage: >-
      Die Lese-App nimmt nur eine Ed25519-Signatur an und weist ein geändertes Byte, ein fremdes aud und den JWS einer anderen
      Anfrage ab.
    zustand: offen
    frist: 2026-12-31
    bedingung: Proben zur Antwort-Signatur (geplant)
    herkunft: U2-ADR-501 (15.10.2026)
  - aussage: >-
      ANTWORT_SIGNIEREN steht in der ersten Fassung, die das Lesen signierter Antworten ausliefert, aus; ab der Fassung des
      Umlegens läuft jeder Weg zu antwortJwe* über das Signieren.
    zustand: offen
    frist: 2027-01-31
    bedingung: die Probe zum Schalter ANTWORT_SIGNIEREN gegen das Fassungsregister (geplant)
    herkunft: U2-ADR-501 (15.10.2026)
  - aussage: >-
      Der Ankersatz „Zugang“ ist von ANKER_SATZ getrennt; nach nextUpdate sendet die direkte Übergabe nicht, und die Datei-Antwort
      behandelt eine nur über „Zugang“ geprüfte Anfrage als Anfrage ohne Zertifikat.
    zustand: offen
    frist: 2027-03-31
    bedingung: Proben zum Ankersatz „Zugang“ (geplant)
    herkunft: U2-ADR-501 (15.10.2026)
  - aussage: >-
      Die direkte Übergabe sendet nie ohne gültiges Access Certificate und nie, wenn die Anfrage mehr verlangt als das
      Registration Certificate erlaubt, auch nicht bei einer unbekannten Angabe.
    zustand: offen
    frist: 2027-03-31
    bedingung: Proben zur Prüfung der Anfrage und die Probe zum Registrierungszertifikat (geplant), je mit Rot-Beweis
    herkunft: U2-ADR-501 (15.10.2026)
  - aussage: >-
      Ein Zertifikat mit nameConstraints, Richtlinienbeschränkungen, einer unbekannten kritischen Erweiterung, einem
      extendedKeyUsage ohne erlaubten Zweck oder einem keyUsage ohne digitalSignature und ohne nonRepudiation wird nicht angenommen.
    zustand: offen
    frist: 2027-03-31
    bedingung: je Art eine rote Probe in tests/x509-leser.test.js (geplant), dazu die Gegenprobe ohne extendedKeyUsage
    herkunft: U2-ADR-501 (15.10.2026)
  - aussage: >-
      Der X.509-Leser nimmt keinen FAILURE-Fall der gepinnten x509-limbo-Auswahl im Umfang an und weist höchstens drei
      SUCCESS-Fälle im Umfang ab; die DER-Grenzfälle und gekürzte oder verschachtelte Eingaben enden in Zeit- und Tiefengrenze.
    zustand: offen
    frist: 2027-03-31
    bedingung: Proben in tests/x509-leser.test.js (geplant), Auswahl mit Zahl und sha256 vor dem ersten Lauf gepinnt
    herkunft: U2-ADR-501 (15.10.2026)
  - aussage: >-
      Eine Empfangs-Schlüsseldatei aus dem Studio trägt die Anfrage, für die ihr Paar entstand, mit dem Abdruck im verschlüsselten
      Teil; die Lese-App gleicht aud nur gegen die Kennung aus dem signierten Zertifikat dieser Anfrage ab, nimmt den Vorgang aus der
      Anfrage, weist jeden Bruch der Kette ab und prüft das Zertifikat nach der Tagesregel; eine neue Schlüsseldatei öffnet in der
      ausgelieferten Lese-App v929 wie bisher.
    zustand: erfuellt
    herkunft: U2-ADR-501-Nachtrag (15.10.2026)
    pruefung:
      - tests/lese-app-schluessel-anfrage-bindung.test.js "[Schlüssel·Anfrage·gebunden·rot] eine an eine andere Stelle signierte Antwort wird abgewiesen"
      - tests/lese-app-schluessel-anfrage-bindung.test.js "[Schlüssel·Anfrage·Vorgang] der Vorgang kommt aus der Anfrage: ein umetikettierter JWE-Kopf hilft nicht"
      - tests/lese-app-schluessel-anfrage-bindung.test.js "[Schlüssel·Anfrage·Bruch] eine ausgetauschte Anfrage fällt am Abdruck auf"
      - tests/lese-app-schluessel-anfrage-bindung.test.js "[Schlüssel·Anfrage·Tag] Ausstellungstag, Ablauftag und ein ganz innerhalb des Tages gültiges Zertifikat tragen; der Vortag nicht"
      - tests/lese-app-schluessel-anfrage-bindung.test.js "[Schlüssel·Anfrage·Sicherbarkeit] die ausgelieferte Lese-App v929 öffnet mit einer neuen Schlüsseldatei eine Antwort wie bisher"
      - tests/lese-app-schluessel-anfrage-bindung.test.js "[Schlüssel·Anfrage·Rot-Beweis] ohne Weiterreichen der gebundenen Kennung ginge die fremde Antwort durch"
  - aussage: >-
      Im Assistenten gilt das Schlüsselpaar nur mit einem gegen den Anker geprüften Zertifikat zum eigenen Tresor-Schlüssel, und das
      entscheidet sich beim Erstellen; ohne ein solches Zertifikat bleibt das Einmalpasswort. Eine nur mit dem Tresor signierte
      Anfrage ohne Zertifikat ist im Kern ungeprüft. Antworten öffnen mit der Schlüsseldatei halten aud gegen die Stelle des Zertifikats.
    zustand: erfuellt
    herkunft: U2-ADR-501-Nachtrag (18.10.2026)
    pruefung:
      - tests/studio-anfrage-hauptweg-zertifikat.test.js "[Hauptweg·1·2] ein gültiges Zertifikat zum eigenen Schlüssel gilt; die Stelle kommt aus dem signierten Zertifikat"
      - tests/studio-anfrage-hauptweg-zertifikat.test.js "[Hauptweg·2] ein gültiges Zertifikat zu einem fremden Schlüssel wird abgewiesen (Rot-Beweis: ohne Abdruckvergleich nähme es)"
      - tests/studio-anfrage-hauptweg-zertifikat.test.js "[Hauptweg·3] ohne Zertifikat und mit abgelaufenem Zertifikat kein Schlüsselpaar; entschieden beim Erstellen (Rot-Beweis)"
      - tests/studio-anfrage-hauptweg-zertifikat.test.js "[Hauptweg·Kern] eine nur mit dem Tresor signierte Anfrage ohne Zertifikat ist im Kern ungeprüft"
      - tests/studio-anfrage-hauptweg-zertifikat.test.js "[Hauptweg·Öffnen] mit der Schlüsseldatei: Bindung an die Anfrage, aud gegen die Stelle des Zertifikats (Rot-Beweis: ohne Kennung)"
```

---

*Vivodepot GmbH · Berlin · 15.10.2026*
