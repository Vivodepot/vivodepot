# U2-ADR-436: Die privaten Schlüssel des Template-Generators im Speicher — in Hüllen, nicht herausholbar, verworfen

**Status:** Angenommen (25.09.2026)
**Datum:** 19.09.2026
**Kategorie:** SICHERHEIT, WERKZEUGE
**Grundlage:** Der Umbau des Template-Generators zu einer Arbeitsfläche (drei Räume statt fünf Schritte) lässt den privaten
Signaturschlüssel bis zum Signieren im Speicher, statt ihn schon nach dem Herunterladen freizugeben und die eben gesicherte
Datei erneut hochladen zu lassen. Das ist eine Sicherheitsentscheidung und braucht diese Festlegung.
- **Code-Stelle:** `vivodepot-template-generator.html` — `SCHLUESSEL_TRESOR`, `signiereEinmal`, `_istSignierSchluessel`, `EMPFANGS_TRESOR`, `gen1Binden` (pagehide).
- **Geltungsbereich:** der Ed25519-Signaturschlüssel des Generators für **alle Signierwege der Oberfläche** (Vorlagen-Einreichung und
  jede Modul-Ausgabeart) und das Empfangs-Schlüsselpaar der Anfrage-Ausgabeart (ECDH P-256).
- **Status heute:** gilt — der Bau steht, die Proben unten laufen.

---

## Kontext

**Vorher:** Der Signaturschlüssel lag als JWK-Objekt in `STATE.privateJwk`, und `STATE` ist eine Konstante der obersten Ebene eines klassischen
Skripts. Jedes andere Skript derselben Seite, jede Erweiterung mit Seitenzugriff, jede Konsole konnte `STATE.privateJwk.d` lesen.
Die Freigabe geschah beim „Weiter“ nach dem Download; zum Signieren musste die Institution die eben heruntergeladene Datei suchen und
wieder hochladen.

**Jetzt:** Der Weg bis zum Paket ist eine Arbeitsfläche mit einem Fertigstellen-Dialog. Der Schlüssel soll dort bis zum Signieren
verfügbar bleiben, ohne dass er dadurch leichter zu greifen ist als vorher. Er soll sogar schwerer zu greifen sein.

**Das Empfangs-Schlüsselpaar der Anfrage — gemessen.** Sein öffentlicher Teil steht in der Anfrage; der private Teil öffnet später die
Antworten. Der Generator öffnet keine Antworten: der private Teil hat hier genau einen Zweck, die Datei zum Herunterladen und
Aufbewahren. Er lebt nur in der Sitzung — der Generator schreibt nichts in Browser-Speicher, nicht in den Entwurf, nicht in die
Anfrage. Er lag aber als Klartext-JWK in `STATE.anfrage`, für jedes Skript der Seite lesbar. Weil im Generator nichts mit ihm
arbeitet, gibt es keinen Schlüssel zu halten (kein `CryptoKey`), nur Material bis zum Download.

## Entscheidung

1. **Die Dauerform ist ein nicht herausholbarer Schlüssel.** Was nach dem Herunterladen im Speicher bleibt, ist ein `CryptoKey` mit
   `extractable: false` und der Nutzung `sign`. Das rohe Material (das JWK) liegt nur zwischen „erzeugt“ und „beide Dateien gesichert,
   weiter“ — die Datei ist der einzige Ort, an dem der Schlüssel bleibt, also muss er bis dahin herausholbar sein. Ein Schlüssel aus
   einer Datei wird sofort als nicht herausholbarer importiert; sein Material bleibt nirgends.
2. **Kein Griff von der obersten Ebene.** Weder `window` noch `STATE` noch ein anderer Name der obersten Ebene trägt den Schlüssel oder
   sein Material. Beides steht in der Hülle `SCHLUESSEL_TRESOR` (eine Funktionsschließung, eingefroren). Die Hülle gibt keinen Schlüssel
   heraus, nur Auskünfte über ihn (`zustand`: vorhanden, nicht herausholbar, Algorithmus, Nutzung). Ihre Fläche ist festgelegt:
   `erzeugen`, `ausDatei`, `privatHerunterladen`, `rohMaterialVerwerfen`, `vorhanden`, `zustand`, `verwerfen`, `beimVerwerfen`,
   `signiereEinmal`. Eine neue Methode ist eine Änderung dieser ADR.
3. **Die Nutzung ist enger als der Besitz.** `extractable: false` schützt die Bytes, nicht die Nutzung. Darum signiert die Hülle nur in
   `signiereEinmal`, und dort nur auf ein **echtes, frisches Klick-Ereignis am Knopf „Paket erzeugen“**: `isTrusted === true` (ein
   von einem Skript erzeugtes Ereignis ist nie vertrauenswürdig), Ziel einer der Knöpfe, die ein Paket oder Bündel erzeugen
   (`pr-submit`, `anf-erzeugen`, `vb-annehmen`, `vb-ablehnen`, `ia-erzeugen`, `bm-erzeugen`, `rr-erzeugen`, `fm-erzeugen`,
   `bd-erzeugen`), jünger als eine Sekunde. Ein unechter Klick fällt bei vorhandenem Schlüssel nie auf „unsigniert“ zurück. Ohne Schlüssel im Speicher
   ist der Knopf gesperrt, und die Seite nennt, was fehlt — ein Paket entsteht nicht mehr stillschweigend unsigniert.
   **Es gibt einen Weg, den Schlüssel zu laden, und einen, ihn zu benutzen.** Die Schlüsseldatei wird an einer Stelle gelesen und geht
   in den Tresor; jeder Signierweg der Oberfläche (`submissionErzeugen`, `anfrageErzeugen`, `vereinbarungBeantworten`,
   `institutionsArtErzeugen`, `bereichErzeugen`, `rechtsraumErzeugen`, `formatErzeugen`, `brandingErzeugen`) signiert über
   `signiereEinmal` (Paket) bzw. `signiereMitTresor` (Modul-Ausgabearten, die auch unsigniert gelten: ohne Schlüssel im Speicher
   entsteht das Bündel unsigniert, wie bisher). Kein Signierweg liest eine Datei am Tresor vorbei. Der Kennungs-Vorschlag
   signiert nicht. Die ungebundene Funktion `basistemplateTreuhandSignieren` (Treuhand-Neusignatur, kein Knopf) importiert ihren
   Schlüssel selbst und ist von der Oberfläche aus nicht erreichbar.
4. **Der Schlüssel wird verworfen:** nach dem Signieren (**einmal, gleich wie es ausgeht** — der Schlüssel ist verbraucht, bevor die
   Signierarbeit läuft, ein Fehlschlag gibt ihn nicht zurück), beim Verlassen der Seite (`pagehide`) und nach einem **absoluten**
   Zeitlimit von fünfzehn Minuten ab Erzeugen oder Laden. Die Seite zeigt eine Statuszeile („im Speicher, nicht herausholbar; wird
   verworfen …“), einen Knopf „jetzt verwerfen“ und nennt den Grund, wenn der Schlüssel fort ist. Wer weitermachen will, lädt die
   Schlüsseldatei.
5. **Das Empfangs-Schlüsselpaar folgt derselben Regel ohne Nutzung.** Sein privater Teil liegt nur in der Hülle `EMPFANGS_TRESOR`
   (feste Fläche: `erzeugen`, `privatHerunterladen`, `vorhanden`, `zustand`, `verwerfen`, `beimVerwerfen`), nie in `STATE`. Er wird
   verworfen, wenn die Institution bestätigt, dass sie beide Teile gesichert hat, beim Verlassen der Seite, nach dem Zeitlimit und
   wenn ein neues Paar entsteht. Nichts, was der Generator schreibt (Entwurf, Anfrage, öffentlicher Teil), trägt einen privaten
   Anteil.
6. **Die Klasse ist bewacht, nicht nur der Einzelfall.** Kein Objekt mit `kty` und `d` und kein privater `CryptoKey` steht in `STATE`
   oder an einem Namen der obersten Ebene; und nur die beiden Erzeuger (`erzeugeSchluesselpaarRoh`,
   `erzeugeEmpfangsSchluesselpaar`) dürfen einen privaten Schlüssel als JWK herausholen — jeder dritte Ort ist ein Fund.
7. **Jede Zusicherung hat ihren Rot-Beweis.** Dieselbe Messung läuft gegen die echte Fassung (keine Verletzung) und gegen je eine
   absichtlich verschlechterte (jede muss ihre Kennung melden).

## Was das nicht leistet — und die Seite sagt es nicht anders

- **Nutzung durch ein Skript mit Seitenzugriff ist nicht ausgeschlossen.** Ein Skript, das ein echtes Klick-Ereignis in derselben
  Sekunde mitbenutzt (etwa durch einen eigenen Listener am selben Knopf), kann `signiereEinmal` mit einer eigenen Arbeitsfunktion
  aufrufen. Die Hülle macht das schwerer, nicht unmöglich. Die Grenze ist die Seite selbst: die Inhalts-Sicherheits-Richtlinie
  erlaubt `unsafe-inline`, sie ist keine Sperre gegen eingeschleusten Code.
- **Verworfen heißt Verweis gelöscht, nicht Bytes überschrieben.** JavaScript kann Speicher nicht nullen; wann der Speicher
  freigegeben wird, entscheidet der Browser.
- **Zwischen Erzeugen und „weiter“ (beim Empfangs-Schlüsselpaar: bis zur Bestätigung) liegt das Material** in der Hülle (nicht an einer globalen Fläche). Das ist unvermeidlich, solange
  die Datei der einzige dauerhafte Ort ist.
- Ein Browser mit einer Erweiterung, die Seiteninhalt und Speicher vollständig liest, oder ein kompromittierter Rechner ist nicht
  Gegenstand dieser ADR.

## Was ausdrücklich nicht in dieser ADR steht

- **Mehrere Bündel mit einem Schlüssel:** der Schlüssel signiert einmal; wer danach ein zweites Bündel signiert haben will, lädt die
  Schlüsseldatei erneut. Eine Mehrfach-Freigabe wäre eine Änderung dieser ADR.
- **Ein persistenter nicht herausholbarer Schlüssel** (IndexedDB) ist verworfen: der Generator speichert nichts im Browser.

## Verworfene Alternativen

- **Den Schlüssel weiter als JWK in `STATE` halten:** liest jedes Skript der Seite.
- **Sofort freigeben und die Datei erneut hochladen lassen (der Stand davor):** sicher, aber es ist der Bruch im Weg, den der Umbau
  beseitigen soll, und er verleitet dazu, die Signatur wegzulassen.
- **Ohne Klick-Bindung signieren lassen:** wäre `extractable: false` ohne Wirkung gegen Nutzung.

## Konformität

```konformitaet
aussage:  Der im Speicher gehaltene Signaturschlüssel ist ein CryptoKey mit extractable:false und der Nutzung sign; das rohe
          Material liegt nur bis „beide Dateien gesichert, weiter“, ein Schlüssel aus einer Datei bringt keines mit.
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·a] der gehaltene Schlüssel ist nicht herausholbar, das Material nur bis „weiter“
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·a] ein Schlüssel aus einer Datei wird sofort als nicht herausholbarer importiert
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·a·Rot-Beweis] ein herausholbarer Schlüssel und ein Material, das nach „weiter“ bleibt, werden gemeldet
```
```konformitaet
aussage:  Weder window noch STATE noch ein anderer Name der obersten Ebene trägt den Schlüssel oder sein Material; die Hülle hat
          eine feste, eingefrorene Fläche ohne Methode, die einen Schlüssel herausgibt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·b] nichts außerhalb der Hülle trägt den Schlüssel oder sein Material
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·b·Rot-Beweis] ein Griff in STATE, eine herausgegebene Fläche und ein unechter Klick werden gemeldet
pruefung: tests/e2e-cross/T-CROSS-31-generator-schluessel.spec.js#(b) nichts an window, STATE oder den Namen der obersten Ebene trägt den Schlüssel
```
```konformitaet
aussage:  Die Hülle signiert nur auf ein echtes, frisches Klick-Ereignis am Knopf „Paket erzeugen“; ein von einem Skript erzeugtes
          Ereignis, ein falsches Ziel und ein zu alter Klick werden abgewiesen, ohne den Schlüssel zu verbrauchen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·b] die Hülle signiert nur auf einen echten frischen Klick am Knopf „Paket erzeugen“
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·b·Rot-Beweis] ein Griff in STATE, eine herausgegebene Fläche und ein unechter Klick werden gemeldet
pruefung: tests/e2e-cross/T-CROSS-31-generator-schluessel.spec.js#(b) ein von einem Skript erzeugter Klick signiert nicht, der echte danach schon
```
```konformitaet
aussage:  Der Schlüssel wird verworfen: nach dem Signieren (einmal, auch nach einem Fehlschlag), beim Verlassen der Seite und nach
          dem Zeitlimit (höchstens dreißig Minuten, Standard fünfzehn, absolut).
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·c] der Schlüssel ist nach dem Signieren fort, gleich wie es ausgeht
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·c] beim Verlassen der Seite (pagehide) wird der Schlüssel verworfen
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·c] nach dem Zeitlimit wird der Schlüssel verworfen und gemeldet
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor·c·Rot-Beweis] ohne Verwerfen nach dem Signieren, ohne pagehide, ohne Zeitlimit wird es gemeldet
pruefung: tests/e2e-cross/T-CROSS-31-generator-schluessel.spec.js#(c) verworfen nach dem Signieren und beim Verlassen; danach verlangt die Seite die Schlüsseldatei
```
```konformitaet
aussage:  Die echte Fassung des Generators verletzt keine der Zusicherungen (a), (b), (c); jede verschlechterte Fassung meldet ihre
          eigene Kennung.
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor] die echte Fassung hält (a), (b) und (c)
pruefung: tests/generator-schluessel-tresor.test.js#[Schlüssel-Tresor] ein mit dem gehaltenen Schlüssel signiertes Paket verifiziert gegen den Public-Key (der Weg trägt)
```
```konformitaet
aussage:  Das Empfangs-Schlüsselpaar der Anfrage liegt nicht als Klartext-JWK in STATE oder an einem Namen der obersten Ebene; keine
          Datei, die der Generator schreibt, trägt einen privaten Anteil; nur die zwei Erzeuger holen einen privaten Schlüssel als JWK
          heraus; die Hülle verwirft bei Bestätigung, beim Verlassen, nach dem Zeitlimit und bei einem neuen Paar.
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-empfangs-schluessel.test.js#[Empfangs-Schlüssel] die echte Fassung hält: kein privates JWK in STATE, in keiner Datei, nur zwei Erzeuger, Hülle verwirft
pruefung: tests/generator-empfangs-schluessel.test.js#[Empfangs-Schlüssel·Klasse] der Bestand der Erzeuger: genau zwei Stellen holen einen privaten Schlüssel heraus
pruefung: tests/generator-empfangs-schluessel.test.js#[Empfangs-Schlüssel·Rot-Beweis] ein Klartext-JWK in STATE, eine Datei mit d und ein dritter Exporteur werden gemeldet
pruefung: tests/generator-empfangs-schluessel.test.js#[Empfangs-Schlüssel·Rot-Beweis] ohne Verwerfen bei Bestätigung, beim Verlassen, nach dem Zeitlimit und beim neuen Paar wird es gemeldet
pruefung: tests/e2e-cross/T-CROSS-31-generator-schluessel.spec.js#GEN2: das Empfangs-Schlüsselpaar der Anfrage liegt nicht als Klartext-JWK an STATE oder window und wird bei Bestätigung verworfen
```
```konformitaet
aussage:  Kein Signierweg der Oberfläche liest am Tresor vorbei: das Feld der Schlüsseldatei wird an einer Stelle gelesen, jeder
          Aufruf eines Bündel-Bauers aus der Oberfläche steht in signiereMitTresor/signiereEinmal, jeder Signier-Handler ruft den
          Tresor, und außer der Hülle und ihren Hilfen importiert nichts einen Schlüssel zum Signieren; jede Modul-Ausgabeart signiert
          mit dem Tresor-Schlüssel auf ihren Knopf und auf keinen anderen, und ein unechter Klick fällt nicht auf „unsigniert“ zurück.
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-signierwege.test.js#[Signierwege] kein Signierweg der Oberfläche liest am Tresor vorbei
pruefung: tests/generator-signierwege.test.js#[Signierwege·Rot-Beweis] ein gelesenes Schlüsselfeld, ein Signierer am Tresor vorbei, ein neuer Import und ein Handler ohne Tresor werden gemeldet
pruefung: tests/generator-signierwege.test.js#[Signierwege] jede Modul-Ausgabeart signiert mit dem Tresor-Schlüssel — auf ihren Knopf, auf keinen anderen
pruefung: tests/generator-signierwege.test.js#[Signierwege] ein unechter Klick fällt bei vorhandenem Schlüssel NICHT auf „unsigniert“ zurück; ohne Schlüssel gilt der unsignierte Weg
pruefung: tests/generator-signierwege.test.js#[Signierwege] die Bündel-Bauer signieren mit dem Tresor-Schlüssel, und die Signatur verifiziert
pruefung: tests/e2e-cross/T-CROSS-31-generator-schluessel.spec.js#GEN2b: eine Modul-Ausgabeart signiert mit dem Tresor-Schlüssel, nur auf einen echten Klick, einmal
```

## Nachtrag (04.10.2026) — beide Schlüsseldateien verschlüsselt, der Empfangsschlüssel nicht mehr roh, die Klasse über alle Seiten

**Anlass:** Befund JWK-IN-STATE (HOCH). Die Notiz dazu sagte, der Empfangsschlüssel liege nicht herausholbar im Tresor. Das stimmte
nicht: db18a77f3 machte nur den Signierschlüssel nicht herausholbar, `EMPFANGS_TRESOR` hielt das Empfangs-JWK weiter roh. Und beide
Schlüsseldateien gingen als Klartext-JWK auf die Platte.

**Entscheidung, ergänzend zu Punkt 1–7:**

1. **Beide Schlüsseldateien entstehen nur noch passwortverschlüsselt** (`.private.vdkey`, `.empfang.vdkey`), mit derselben Hülle wie
   VC-Issuer und Schlüssel-Teiler (`schuetzeSchluesselJwk`, PBKDF2 aus dem VdCrypto-Block, AES-GCM mit AAD), wortgleich und bewacht
   (`tools/krypto-block-propagation-pruefen.js`, Soll-Liste je Stück). Das Passwort wird zweimal abgefragt, verlangt mindestens 8
   Zeichen, und beide Felder werden in jedem Pfad geleert. Ein falsches Passwort und eine beschädigte Datei bekommen dieselbe
   Meldung — AES-GCM unterscheidet sie nicht.
2. **Beide Tresore halten nur einen nicht herausholbaren CryptoKey und die verschlüsselte Datei.** Ein rohes JWK hält danach
   niemand, auch nicht nach einem Fehler beim Erzeugen. Der Empfangsschlüssel wird als `ECDH`/`deriveBits` mit `extractable:false`
   importiert.
3. **Die Lese-App öffnet Antworten mit der `.vdkey`-Datei** und ihrem Passwort; dafür trägt sie die Hülle ebenfalls.
4. **Bestand:** ältere Klartext-Dateien bleiben lesbar — im Studio nur über das Angebot, sie jetzt verschlüsselt neu zu speichern
   (geladen wird danach die neue Datei), in der Lese-App mit einem sachlichen Hinweis auf das Studio.
5. **Die Klasse gilt für alle Wurzel-Seiten, nicht nur den Generator.** Kein `generateKey`/`importKey` mit privater oder geheimer
   Verwendung ist herausholbar, und kein privater Schlüssel wird exportiert — außer an einer Stelle der Positivliste
   `tools/krypto-export-positivliste.json` (Datei, Funktion, Grund). Punkt 6 oben („nur die beiden Erzeuger“) ist damit die
   Studio-Zeile dieser Liste.

**Grenze, wörtlich:** JavaScript kann Zeichenketten und Objekte nicht nullen. „Verworfen“ heißt für das JWK und für das Passwort:
kein Verweis bleibt — keine Modulvariable, kein Closure-Halter, kein Feldwert, keine Meldung, kein Eintrag in `STATE`, im Browser-
Speicher oder in der Konsole. Wann der Speicher freigegeben wird, entscheidet der Browser. Die Proben prüfen die Verweise, nicht die
Bytes.

```konformitaet
aussage:  Beide Studio-Schlüsseldateien entstehen nur passwortverschlüsselt; das Passwort wird zweimal abgefragt (Mindestlänge 8),
          danach steht es in keinem Feld, keiner Meldung, keiner Datei, nicht in STATE und nicht in der Konsole; scheitert die Hülle,
          bleibt nichts im Tresor.
zustand:  geprüft
herkunft: invariante
pruefung: tests/generator-schluesseldatei-passwort.test.js#[Studio · Passwort] Signierschlüssel erzeugen: zwei gleiche Felder → Schlüssel da, Felder leer, keine Spur
pruefung: tests/generator-schluesseldatei-passwort.test.js#[Studio · Passwort] zu kurz und ungleich: kein Schlüssel, eine Meldung ohne das Passwort, beide Felder leer
pruefung: tests/generator-schluesseldatei-passwort.test.js#[Studio · Passwort] scheitert die Hülle beim Erzeugen, bleibt nichts im Tresor
pruefung: tests/generator-schluesseldatei-passwort.test.js#[Studio · Passwort · Rot-Beweis] eine Fassung, die die Felder nicht leert oder das Passwort in STATE legt, wird gemeldet
```
```konformitaet
aussage:  Die Lese-App öffnet eine Antwort mit der verschlüsselten Schlüsseldatei und ihrem Passwort; ein falsches Passwort öffnet
          nichts und verrät nichts; das Passwort bleibt in keinem Feld, keiner Meldung, keinem Markup und keiner Konsolenausgabe.
zustand:  geprüft
herkunft: invariante
pruefung: tests/lese-app-antwort-schluesseldatei.test.js#[Lese-App · Schlüsseldatei] die verschlüsselte Datei mit dem richtigen Passwort öffnet die Antwort; kein Klartext-Hinweis
pruefung: tests/lese-app-antwort-schluesseldatei.test.js#[Lese-App · Schlüsseldatei] ein falsches Passwort öffnet nichts und sagt nur, dass Passwort oder Datei nicht passen
pruefung: tests/lese-app-antwort-schluesseldatei.test.js#[Lese-App · Schlüsseldatei · Rot-Beweis] eine Fassung, die das Feld nicht leert oder das Passwort in die Meldung schreibt, wird gemeldet
```
```konformitaet
aussage:  In keiner Wurzel-Seite entsteht ein privater oder geheimer Schlüssel herausholbar oder wird exportiert, außer an einer
          Stelle der Positivliste mit Grund; ein Eintrag ohne Gegenstand ist selbst ein Befund.
zustand:  geprüft
herkunft: invariante
pruefung: tests/krypto-verbote.test.js#[Krypto a–d · Positivkontrolle] das echte Repo ist grün, jede Wurzel-Seite und die Auslieferungsliste werden gelesen
pruefung: tests/krypto-verbote.test.js#[Krypto b · Rot-Beweis] generateKey/importKey mit privater Verwendung und extractable=true; false und verify bleiben grün
pruefung: tests/krypto-verbote.test.js#[Krypto c · Rot-Beweis] exportKey eines privaten Schlüssels ohne Eintrag; ein öffentlicher bleibt grün
```
