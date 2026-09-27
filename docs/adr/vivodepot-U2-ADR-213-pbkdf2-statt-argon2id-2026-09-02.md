# U2-ADR-213: PBKDF2 statt Argon2id — gemessen, nicht nur vermutet

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** SICHERHEIT, KRYPTOGRAPHIE
**Linie:** U2
**U2-Bezug:** Keine Iteration eines bestehenden ADRs — schließt einen seit dem 23.05.2026 offenen
Punkt eines externen, internen Krypto-Gutachtens (23.05.2026, gegen Beta v2, kein
Repo-Dokument — das Gutachten selbst bleibt intern, dieses ADR ist die öffentliche, im Repo
geführte Begründung dazu). Berührt denselben Code wie U2-ADR-062 (PBKDF2-SHA256, 600.000 fest)
und die `kryptoVersion`-Architektur aus U2-ADR-085-Nachtrag.
**Anker:** Auftrag vom 02.09.2026. Erster Entwurf dieses ADR war eine Begründung ohne
Messung — zu Recht kam Widerspruch („aber die Frage ist doch, ob wir die anderen
Verfahren nicht wirklich prüfen und/oder ebenfalls implementieren sollten"), der
Auftrag wurde zurückgenommen: erst messen, dann entscheiden. Volle Messung, sechs Punkte, drei
Recherche-Agenten plus zwei eigene Live-Messungen (diese Maschine + ein echter
Android-Emulator, per CDP über eine geteilte Sitzung), intern festgehalten, nicht im Repo.
Dieses ADR hält das Ergebnis fest, nicht die ursprüngliche Vermutung.
**Status heute:** gilt — Beleg `tests/pbkdf2-statt-argon2id.test.js`.

---

## Kontext

Ein externes Krypto-Gutachten (23.05.2026, gegen Beta v2) hält unter Befund 1.3 fest: „PBKDF2
statt Argon2id (GPU/FPGA)" — eine strukturelle Schwäche gegenüber spezialisierter
Angriffs-Hardware, da PBKDF2 (anders als Argon2id) nicht memory-hard ist. Der Abgleich gegen den
cleanslate-Code am 19.06.2026 bestätigte: der VdCrypto-Block wurde byte-identisch überführt, der
Befund gilt unverändert — Status **🔴 BLOCK-OFFEN**. Ein offener roter Punkt in einem externen
Gutachten ist das Erste, was eine sicherheitsbewusste Prüferin findet.

Bedrohungsmodell, entscheidend für die Einordnung: Vivodepot hat keinen Server, keinen zweiten
Faktor, keine Sperre nach Fehlversuchen, keine Ratenbegrenzung. Die gesamte Sicherheit einer
Datei hängt an der einen Passwort-Ableitung. Wer die Datei besitzt, probiert offline und
unbegrenzt durch — genau der Angriff, gegen den Speicherhärte (Argon2ids Kerneigenschaft) gebaut
ist. Für Vivodepot wiegt das schwerer als für eine gewöhnliche Anwendung mit Server-Sperre.

## Entscheidung

**Vivodepot bleibt bei PBKDF2-HMAC-SHA256, 600.000 Iterationen — nicht weil Argon2id
schlechter wäre, sondern weil der Fall dafür nach vollständiger Messung noch nicht ausreicht,
und drei konkrete Lücken vor einem Wechsel zu schließen sind, nicht danach.**

**1 — Testvektoren tragen den Wechsel nicht, wie zunächst angenommen, aber auch nicht das
ursprüngliche Gegenargument.** RFC 9106 hat einen echten, offiziellen Argon2id-Testvektor (§5.3)
— vergleichbar in Form und Umfang mit RFC 5869/HKDF, das Vivodepot bereits nutzt. Gegen NIST CAVP
(Argon2 dort gar nicht gelistet) und Project Wycheproof (kein Argon2-Verzeichnis, keine
Negativ-/Grenzfälle wie bei den übrigen Primitiven) trägt die Gleichsetzung aber nicht. Das
Testvektor-Argument allein rechtfertigt weder Wechsel noch Verbleib.

**2 — Keine verfügbare Implementierung vereint Pflege, Selbsttest gegen echte Vektoren und
unabhängiges Audit.** Vier Kandidaten live geprüft (Größe, Lizenz, Pflegezustand,
Vektor-Abdeckung): `hash-wasm` (11,4 KB gzip, aktiv gepflegt, MIT, keine RFC-9106-Vektoren im
eigenen Test), `openpgpjs/argon2id` (8,6 KB, **einzige mit echten RFC-9106-Vektoren im eigenen
Test**, aber seit 03.08.2023 nicht mehr gepflegt), `argon2-browser` (20 KB, seit 2021 kaum
gepflegt), `libsodium-wrappers-sumo` (≈ 397 KB — 10 bis 40× größer als die übrigen, für den
Einzeldatei-Anspruch unpassend). Reines JavaScript ohne WASM existiert nicht ernsthaft — die
einzige Implementierung, die sich so nannte, gibt im eigenen README zu, die Performance ohne WASM
sei „unacceptable" gewesen. Keine der vier ist quelltext-lesbar wie Vivodepots eigener,
handgeschriebener WebCrypto-Code; keine hat ein auffindbares, implementierungsspezifisches
Sicherheitsaudit (libsodiums zugrundeliegende C-Bibliothek wurde geprüft, der Scope für die
JS/WASM-Portierung ist nicht verifizierbar).

**3 — Der Sicherheitsgewinn ist real, aber kleiner und stärker parameterabhängig als das
Gutachten nahelegte.** Echte hashcat-7.0.0-Benchmarks (RTX 4090, dieselbe GPU für beide Werte):
PBKDF2-600k ≈ 14.057 H/s gegen Argon2id bei RFC-9106-typischen Parametern (64 MiB/t=3/p=1) =
1.703 H/s — Faktor **≈ 8**, nicht mehrere Zehnerpotenzen. Für OWASPs tatsächliches Minimum
(19 MiB/t=2/p=1) existiert kein veröffentlichter Benchmark; eine ausdrücklich als unbelegt
gekennzeichnete Hochrechnung ergibt nur **≈ 1,6×** — kaum ein Gewinn. Der eigentliche, strukturelle
Vorteil zeigt sich im Skalierungsverhalten: ein 40.000-Dollar-Rig aus acht RTX-5090-GPUs erreichte
bei Argon2id NICHT mehr als ein 2.100-Dollar-CPU-Server (Specops-Studie, über zwei unabhängige
Pressequellen verifiziert) — bei PBKDF2 skaliert mehr Angreifer-Hardware praktisch linear. Dieser
Vorteil hängt aber sichtbar an großzügigen Speicherparametern, nicht an einem zumutbaren Minimum.

**4 — Die Gerätekosten sind real gemessen, aber nicht auf echter schwacher Hardware.** Eigene
Live-Messung (hash-wasm, drei Läufe, Median) auf zwei Plattformen — dieser Mac UND ein echter
Android-Emulator (Pixel 8, Chrome 149, per CDP): Argon2id am OWASP-Minimum war auf BEIDEN
Plattformen sogar schneller als PBKDF2-600k (≈ 0,6–0,7× der Zeit); eine großzügigere
Parametrisierung (64 MiB/t=3/p=4) kostete konsistent ≈ 3,1–3,4×. Die Verhältnisse waren über
beide Plattformen bemerkenswert stabil — aber beide liefen auf demselben Apple-Silicon-Chip, nur
durch eine Browser-/OS-Schicht getrennt, nicht auf wirklich verschiedener Hardware. Eine Messung
auf echter, schwacher Android-Hardware war in dieser Umgebung nicht möglich — die größte offen
benannte Lücke dieser Erhebung.

**5 — Ein Wechsel mit Alt-Depot-Unterstützung wäre eine neue Verpflichtung, kein Anhängsel.**
Vivodepots Kern-Kryptographie lebt in einem einzigen, SHA-256-gepinnten Block, byte-identisch in
einer externen Datei gespiegelt, als „Klasse-A, muss vor jedem Commit grün sein" geprüft
(`tests/vdcrypto-block-integritaet.test.js`) — ein KDF-Wechsel berührt diesen Block, seine
Verbatim-Kopie, den separaten „Übergabe-Pfad" für Empfängerkreis-Container (die einzige weitere
legitime Direkt-PBKDF2-Verwendung) und mindestens 17 Testdateien. `KRYPTO_VERSION_ALLOWLIST`
trägt bereits zwei aktive Generationen (`[3, 4]`) mit harter Freigabeliste statt stillem
Fallback — das Muster ist erprobt. Aber der eigene Präzedenzfall (200k→600k-Wechsel, 12.06.2026)
entfernte den alten Pfad ERSATZLOS, statt ihn dauerhaft mitzuführen. Ein Argon2id-Wechsel, der
bestehende PBKDF2-Depots weiter live öffnen soll, wäre damit kein Fortsetzen dieses Musters,
sondern ein neues, dauerhaftes Zwei-KDF-Regime.

**Nicht nur behauptet, sondern beim Bau dieses ADR selbst gemessen:** Ein Versuch, lediglich
einen Kommentarzeilen-Verweis auf dieses ADR neben `PBKDF2_ITERATIONS` einzufügen — keine
Funktionsänderung, ein einzelner Kommentar — landete im hash-gepinnten VdCrypto-Block und löste
eine Kaskade über acht „Klasse-A"-Wächter aus, verteilt über vier Komponenten (u. a.
`tests/vdcrypto-block-integritaet.test.js`, `tests/krypto-block-propagation.test.js`,
`tests/kette-08-der-rueckweg.test.js`). Zurückgenommen, nicht durchgezogen. Das ist kein
Gedankenexperiment zur Kostenabschätzung dieses Grundes, sondern derselbe Mechanismus, live
ausgelöst durch die kleinstmögliche Änderung — ein einziger Kommentar, keine Zeile Logik.

**Ergänzend, aus dem Fund einer nachfolgenden Sitzung:** derselbe Zug 5 wird auch dadurch
gestützt, dass A348 (Rot-Beweis-Pflicht, `tests/rot-beweis-pflicht.test.js`) beim Bau der
zugehörigen Testdatei für dieses ADR tatsächlich anschlug — zwei anfänglich unbewiesene
Behauptungs-Proben ohne echten Rot-Beweis, nachgezogen erst durch den Wächter selbst entdeckt,
nicht durch eigene Vorsicht. Ein weiterer Beleg dafür, dass die in diesem ADR beschriebenen
Sicherungsmechanismen (ceremony-gated Kernblock, verpflichtender Rot-Beweis) im echten Bestand
wirken, nicht nur dokumentiert sind.

## Verworfene Alternative

**Eine mitgelieferte Argon2id-Implementierung schon heute einbauen**, um dem Gutachten-Befund
zuvorzukommen. Verworfen — nicht aus dem ursprünglich angeführten (und inzwischen widerlegten)
Grund fehlender Testvektoren, sondern weil keine der real verfügbaren Implementierungen
zugleich gepflegt, selbst gegen echte Vektoren getestet und unabhängig auditiert ist (Grund 2),
und weil der reale Nutzen bei zumutbaren, geräteschonenden Parametern ungeklärt ist (Grund 3/4).

## Konsequenzen

Der externe Gutachten-Befund 1.3 gilt ab diesem ADR als **gemessen beantwortet, nicht behoben**.
Eine Prüferin, die den Gutachten-Abgleich künftig liest, findet einen Verweis auf dieses ADR und
den zugrundeliegenden Messbericht statt eines unkommentiert offenen roten Punkts.

**Wiedervorlage-Bedingung, präziser als ursprünglich vorgesehen:** nicht mehr allein „Argon2id
nativ in Zielbrowsern verfügbar" (nach wie vor: kein Browser trägt es nativ, einziger Ansatz ein
WICG-Entwurf vom 11.08.2026, ausdrücklich „not on the W3C Standards Track", live gegen die
Primärquelle geprüft), sondern zusätzlich UND unabhängig davon: eine Implementierung, die Pflege,
echte Vektor-Selbsttests und ein unabhängiges Audit vereint, UND eine echte Messung auf
tatsächlich schwacher Hardware, nicht nur Emulation auf starkem Host-Silicon.

**Offen, ausdrücklich keine Antwort dieses ADR:** Verhalten unter echtem Speicherdruck (Tab-Kill
bei WASM-Speicheranforderungen auf Low-End-Geräten), ein GPU-Benchmark exakt bei OWASPs
Minimalparametern, der genaue Umfang einer Migration (welche der Aufrufstellen im Detail
betroffen wären) — zurückgestellt, bis die obigen Bedingungen erfüllt sind.

## Konformität

```konformitaet
aussage:  Der ausgelieferte Kern (vivodepot.html) enthält keine mitgelieferte
          Argon2/Argon2id-Fremdimplementierung — die einzig verwendete passwortbasierte
          Schlüsselableitung ist PBKDF2-HMAC-SHA256 über die native Web-Crypto-API.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pbkdf2-statt-argon2id.test.js#keine mitgelieferte Argon2/Argon2id-Fremdimplementierung im Kern
```

```konformitaet
aussage:  Die kryptoVersion-Architektur trägt bereits mehr als eine aktive Krypto-Generation
          gleichzeitig (harte Freigabeliste, kein stiller Fallback) — der Beleg, dass die
          Allowlist-Mechanik einen künftigen Wechsel strukturell tragen könnte, unabhängig
          davon, ob ein Wechsel mit Alt-Depot-Unterstützung geboten ist (s. Grund 5).
zustand:  geprüft
herkunft: invariante
pruefung: tests/pbkdf2-statt-argon2id.test.js#KRYPTO_VERSION_ALLOWLIST trägt schon heute mehr als eine Generation
```

Keine Probe für die Kernaussagen aus Grund 1/2/3/4 selbst (Testvektor-Umfang, Implementierungs-
Pflegezustand, GPU-Benchmarks, Gerätekosten): das sind Tatsachen über die Außenwelt zum
Messzeitpunkt (02.09.2026), keine Eigenschaften des eigenen Codes — dafür gibt es hier bewusst
keine automatisierte Probe, keine erfunden. Der volle Messweg steht im internen Messbericht
zu diesem ADR, damit er bei Bedarf wiederholt werden kann.

---

*Vivodepot GmbH · Berlin · 02.09.2026*
