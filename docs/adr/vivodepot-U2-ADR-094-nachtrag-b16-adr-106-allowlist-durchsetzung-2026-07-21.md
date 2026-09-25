# U2-ADR-094 · Nachtrag zu B16-ADR-106 — Allowlist wird durchsetzend, Versions-Gate in der Lese-App

**Datum:** 21.07.2026
**Status:** Angenommen · gebaut 21.07.2026 (Suite grün, Block-Hash unverändert)
**Bezug:** B16-ADR-106 (Authentifizierte Krypto-Versions-Achse) · B16-ADR-085-Nachtrag (AAD-Bindung) ·
Report Teil A vom 21.07.2026 (A1–A5) · U2-ADR-090 (Präfix- und Benennungsregel) ·
Verbatim-Block-Pin `8d31c678…`
**Status heute:** gilt — Beleg `tests/b2-schluesseltrennung.test.js`.

---

## 0 · Zur Nummer (Benennungs-Entscheidung, U2-ADR-090)

Dieser Nachtrag betrifft inhaltlich **B16-ADR-106**, trägt aber eine **U2-Nummer**. Grund: U2-ADR-090
formalisiert die Suffix-Konvention (`-Nachtrag` an der Nummer des bezogenen ADRs) und friert
gleichzeitig die B16-Linie ein („Es entstehen keine neuen B16-Nummern"). Ein
`B16-ADR-106-Nachtrag` würde die zweite Regel verletzen und zudem in einem anderen (internen)
Repository liegen. Die Suffix-Konvention wird daher als **linien-intern**
gelesen (ihr Anwendungsfall war U2-ADR-077-Nachtrag); linien-übergreifende Änderungen laufen wie
bisher als eigene U2-ADR, die den B16-Kanon amendiert — dasselbe Muster wie U2-ADR-015 §6
(Amendments zu B16-ADR-001/013/066 und Präzisierung zu B16-ADR-009).

## 1 · Der Fund (Report Teil A, 21.07.2026)

Ein read-only Sweep prüfte drei Aussagen einer externen Krypto-Analyse gegen den Code. Zwei
Befunde betreffen diese Entscheidung:

**`KRYPTO_VERSION_ALLOWLIST` war definiert, aber an keiner Prüfstelle beteiligt.** Die Konstante
(Verbatim-Block) wurde produktiv nirgends gelesen; die Durchsetzung lief über einen
Gleichheitsvergleich `umschlag.kryptoVersion !== CRYPTO_VERSION_AKTUELL` an vier Stellen
(vivodepot.html 6493, 6923, 11087, 11242). Funktional gleichwertig, solange die Allowlist genau
`[3]` ist — aber die als „harte Allowlist" dokumentierte Struktur war nicht die wirksame. Der
zugehörige Test prüfte den **Inhalt** der Konstante (`JSON.stringify(...) === '[3]'`), nicht ihre
Wirkung: ein Test, der eine Deklaration prüft, verifiziert nichts, er wiederholt sie.

**Die Lese-App hatte kein explizites Versions-Gate.** `leseDepotUmschlag` und `leseSubUmschlag`
gingen ohne Versionsprüfung in die Ableitung. Die AAD-Bindung (B16-ADR-085-Nachtrag) hielt
fail-closed — ein Nicht-v3-Container scheitert an der GCM-Authentifizierung —, aber erst **nach**
der vollen PBKDF2-Ableitung (~600k) und mit generischer Fehlermeldung. Da der `catch` im
Passwort-Formular jeden Fehler gleich behandelte, erschien einer Nutzerin mit korrektem Passwort
„Das Passwort passt nicht".

## 2 · Die Entscheidung

**Alle produktiven Versions-Gates lesen die Allowlist.** Die vier Prüfstellen der Bürger-App
stellen von `!== CRYPTO_VERSION_AKTUELL` auf `!KRYPTO_VERSION_ALLOWLIST.includes(...)` um.
Fehlerverhalten unverändert: Wurf **vor** jeder Schlüsselableitung, kein Fallback.
`CRYPTO_VERSION_AKTUELL` bleibt ausschließlich der **Schreib**-Wert („welche Version erzeugen
wir"); die Allowlist ist ausschließlich der **Lese**-Filter („welche akzeptieren wir"). Diese
Trennung ist der eigentliche Gewinn — bisher trug eine Konstante beide Rollen.

**Die Lese-App erhält dasselbe Gate**, über dieselbe Allowlist, vor der Ableitung, mit eigenem
bürgernahen Wortlaut statt der Passwort-Meldung. Der Versions-Fall wird über einen Marker am
Fehlerobjekt (`vivodepotGrund === 'version'`) unterscheidbar gemacht — nicht über
Fehlertext-Vergleiche, die bei jeder Umformulierung stillschweigend brechen würden.

**Der Test prüft Durchsetzung statt Deklaration.** Ein Nicht-v3-Umschlag wird abgelehnt, und ein
Zähler auf `crypto.subtle.deriveBits` belegt, dass dabei **keine einzige** Ableitung läuft; eine
Gegenprobe mit gültigem Umschlag beweist, dass der Zähler tatsächlich misst. Ergänzend eine
strukturelle Zusicherung, dass kein Gate mehr direkt gegen `CRYPTO_VERSION_AKTUELL` vergleicht.

**Ehrliche Grenze der Absicherung:** Der Verhaltenstest beweist die *Reihenfolge* (Ablehnung vor
Ableitung) — er würde auch mit dem alten Gleichheitsvergleich grün bleiben. Dass die *Allowlist*
das wirksame Mittel ist, sichert die strukturelle Zusicherung. Beide zusammen decken ab, was
vorher gar nicht abgedeckt war; keine der beiden allein genügt.

## 3 · Was ausdrücklich nicht Teil dieser Entscheidung ist

- **Der Verbatim-Block bleibt unberührt** (`8d31c678…`, nach dem Bau explizit nachgeprüft). Alle
  Änderungen liegen in Script 2 beider Dateien; die Allowlist-Konstante wird aus dem Block nur
  *gelesen*.
- **Klartext-Zeroing** (Befund A1): existiert im Code nicht und kann so nicht existieren — der
  Klartext in `encryptData` ist ein unbenanntes Argument ohne Referenz. Ein Test dafür wäre erst
  nach einem Code-Umbau möglich; bewusst nicht gebaut. Stattdessen wurde das *tatsächlich*
  implementierte **Master-Bits-Zeroing** (`setupMasterSession`) erstmals durch einen Test
  abgesichert, ohne Produktiv-Code anzufassen.
- **Salt-Rotation** (Befund A5): Die dokumentierte „Key-Rotation durch neuen Salt pro
  Speichervorgang" existiert nicht — der Salt ist depot-stabil, pro Speichervorgang wechselt der
  IV (für AES-GCM die korrekte Konstruktion). Kein Code-Eingriff; die Richtigstellung erfolgt in
  der Krypto-Architektur-Dokumentation (v0.4), nicht hier.

## 4 · Abnahme

Suite 1494 → **1497** Tests, alle grün (drei neue: Allowlist-Durchsetzung, Lese-App-Gate,
Master-Bits-Zeroing). Block-Integritäts-Test grün, Hash unverändert
`8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258`.

## 5 · Konformität

```konformitaet
aussage:   Ein Nicht-v3-Umschlag wird VOR jeder Ableitung abgelehnt (Allowlist durchsetzend, nicht
           nur deklarierend) — ein Zähler auf crypto.subtle.deriveBits belegt, dass beim
           Versions-Fehlschlag keine einzige Ableitung läuft.
zustand:   prüfbar
pruefung:  tests/b2-schluesseltrennung.test.js#[Klasse-A][B2] Versions-Gate lehnt VOR der PBKDF2-Ableitung ab (Allowlist durchsetzend)
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*

---

*Vivodepot GmbH · Berlin · 21.07.2026*
