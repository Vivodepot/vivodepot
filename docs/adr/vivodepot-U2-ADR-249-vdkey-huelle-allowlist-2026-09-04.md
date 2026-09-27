# U2-ADR-249: Die `.vdkey`-Hülle bekommt eine Versions-Allowlist — die Ableitung bleibt unangetastet

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** KRYPTO, WÄCHTER
**Linie:** U2
**U2-Bezug:** U2-ADR-230 (03.09.2026) — benennt diese Fundstelle wörtlich als „bewusst nicht
behoben" und beschreibt zwei Halbschritte einer Reparatur: erst die Allowlist, dann (davor
genannt, sachlich danach) die Ableitung. Dieser ADR baut den ersten Halbschritt und zeigt, warum
der zweite mit U2-ADR-230s eigenem Entscheidungsteil kollidiert. U2-ADR-235 (03.09.2026) —
Depot-Muster, hier gespiegelt: Versionsweiche vor jeder Feldprüfung, zwei vollständige statt einer
weicheren Vereinigungsmenge. U2-ADR-218 — der Hüllen-Wächter, den dieser ADR erstmals um die
Erkennungsfunktion selbst erweitert. U2-ADR-227 (03.09.2026, `_signJWS`) — derselbe Fehlertyp am
selben Tag: ein Stück der Hüllenschicht existierte in mehreren Kopien, unbewacht.
**Anker:** Auftrag vom 04.09.2026, auf Grundlage einer internen Zuschnitt-Ermittlung
(Posten 1 — Sperrposten 1 der Restliste bis v1). Kein Bau am gepinnten Krypto-Block, an
`PORT-VERBATIM.js` oder an Schlüsselmaterial.
**Status heute:** gilt — Beleg `tests/vc-issuer-schluessel-schutz.test.js`,
`tests/schluessel-teilen-werkzeug.test.js`, `tests/krypto-block-propagation.test.js`.

---

## Kontext

Die `.vdkey`-Hülle (`vivodepot-vc-issuer.html:2168–2222`, Schutz der Betriebs-/Trust-Authority-
Schlüssel, nicht der Bürgerdepots) trägt ein eigenes Kennfeld `vivodepotProtectedKey`, bisher mit
**strikter Gleichheit** gegen `PROTECTED_KEY_MARKER_VERSION = 1` geprüft
(`istGeschuetzteSchluesseldatei`, `:2178–2180`). Eine Hülle mit `vivodepotProtectedKey: 2` fiel
damit nicht in einen anderen Lesepfad — sie fiel ganz aus der Erkennung. Die Meldung, die eine
Herausgeberin sähe, wäre `„Das ist keine geschützte Vivodepot-Schlüsseldatei (.vdkey)."` —
derselbe verwirrende statt des klaren Fehlers, den U2-ADR-230 am Zerfall-Beispiel des Depot-Pfads
beschreibt.

U2-ADR-230 benennt diese Fundstelle als schwerer wiegend als die eigene: eine geänderte Konstante
träfe beim Depot die Datei einer einzelnen Person; hier träfe sie die Fähigkeit, überhaupt noch
Zertifikate auszustellen und zu prüfen — und daran hängt jeder Herausgeber.

## Warum „Ableitung parametrisieren" nicht gebaut wird

U2-ADR-230 nennt als vollständige Reparatur „Ableitung parametrisieren UND, davor, die
Versions-Prüfung von strikter Gleichheit auf eine Allowlist erweitern". Konkret hieße
Parametrisieren: `PBKDF2_ITERATIONS` würde an zwei Funktionen zum Parameter —
`deriveMasterBits(password, salt, iterationen = PBKDF2_ITERATIONS)`,
`deriveKey(password, salt, iterationen = PBKDF2_ITERATIONS)`. Beide Funktionen stehen im gepinnten
Krypto-Block (sechs Träger, zehn Voll-Pins, einundzwanzig Kurz-Pins, Prüfsumme, Schalen-Lockstep)
— **derselbe Weg, den U2-ADR-230 selbst begonnen und wieder zurückgenommen hat** (dort „Fund 2").

Und der Entscheidungsteil desselben ADR spricht zweimal ausdrücklich dagegen: „Keine
Parametrisierung von `deriveMasterBits`/`setupMasterSession` […] er hätte den gepinnten Block über
sechs Träger verändert, für einen Fall […], den es unter v3 nach dieser Entscheidung nie geben
kann." und „Die eine PBKDF2-Stelle (`deriveMasterBits`, im gepinnten Block) bleibt die einzige."

Das Argument trägt hier genauso: Solange die `.vdkey` Fassung 1 trägt, kann `wrapper.iterationen`
gar nicht von `PBKDF2_ITERATIONS` abweichen — dafür sorgt bereits
`tests/pbkdf2-iterationen-versionssprung.test.js`, der die Konstante hart auf 600000 pinnt. Eine
parametrisierte Ableitung bediente also einen Fall, den es unter Fassung 1 nicht geben kann; und
eine zweite, blockfremde PBKDF2-Stelle nur für die Hülle ist vom selben ADR ausdrücklich verworfen.

**Vorbehalt, ausdrücklich als solcher benannt:** Dies ist eine Auslegung zweier Sätze desselben
ADR gegeneinander. Wird die Parametrisierung dennoch gewollt, ist das ein Widerruf von
U2-ADR-230s Entscheidungsteil und gehört als solcher geschrieben, nicht nebenbei gebaut.

## Eine gemessene Erleichterung: kein Rückschreibe-Pfad

Anders als beim Depot (U2-ADR-235, dort zwei Stellen, die eine V4-Datei beim Öffnen still auf V3
zurückschrieben) gibt es für eine `.vdkey` keinen Rückschreibe-Pfad. `tools/vorlage-erzeugen.js`
und `tools/modul-erzeugen.js` schreiben ausschließlich im Zweig für einen frisch erzeugten
Schlüssel; `onBestandsschluesselSchuetzen` (`vivodepot-vc-issuer.html`) nimmt einen rohen JWK
entgegen, keine `.vdkey`. Kein Weg im Haus entsperrt eine `.vdkey` und schreibt sie wieder. Das
Depot-Muster (Zeile „schreibende Stellen schreiben die gelesene Version zurück, nie eine feste")
hat hier darum kein Gegenstück — es wird keins gebraucht.

## Ein Vorlauf vor dem eigentlichen Bau: die zwei Kopien der Erkennungsfunktion

`istGeschuetzteSchluesseldatei` — genau die Funktion, deren Versionsprüfung zur Allowlist wird —
stand als einziges Hüllen-Stück NICHT unter dem Hüllen-Wächter aus U2-ADR-218
(`tools/krypto-block-propagation-pruefen.js:236–237`). Die zwei Kopien wichen dabei bereits
voneinander ab — nicht im Verhalten, aber im Text: der Zertifikator nannte den Parameter `parsed`,
der Teiler `geparst`. Auf `geparst` vereinheitlicht (Mehrheitsform in beiden Dateien: 17-mal gegen
2-mal im Zertifikator, 7-mal gegen 0-mal im Teiler), dann erst in den Wächter aufgenommen — sonst
wäre er mit der Aufnahme sofort rot gegangen, ohne dass sich am Verhalten etwas geändert hätte.

## Entscheidung

**Die Versionsprüfung der `.vdkey`-Hülle wird von strikter Gleichheit auf eine Allowlist
erweitert — dasselbe Muster wie `KRYPTO_VERSION_ALLOWLIST` im Kern. Die Ableitung bleibt
unverändert, für Fassung 1 die einzige, die es geben kann.**

1. **`PROTECTED_KEY_VERSION_ALLOWLIST = [1]`** neu, neben `PROTECTED_KEY_MARKER_VERSION` (die
   *Schreib*-Fassung, bleibt stehen — Umbenennen träfe den Hüllen-Wächter namentlich). Fassung 1
   wird nie entfernt, auch wenn eine Fassung 2 hinzukommt; wer sie entfernen will, braucht dafür
   eine eigene Entscheidung — dieselbe Regel wie beim Depot.
2. **`istGeschuetzteSchluesseldatei`**: strikte Gleichheit → `.includes(...)`. Wortgleich in
   `vivodepot-vc-issuer.html` und `vivodepot-schluessel-teilen.html`.
3. **`entschluesseleSchluesselJwk`**: Versionsweiche VOR dem ersten Feldzugriff (Salt/IV/CT
   werden erst danach gelesen) — dasselbe Muster wie U2-ADR-235s Dispatcher. Zwei getrennte
   Gründe bekommen zwei getrennte Meldungen: kein Kennfeld heißt „das ist gar keine Hülle"; eine
   Fassung außerhalb der Allowlist heißt „das ist eine Hülle, aber eine, die diese Anwendung nicht
   kennt" — und nennt die Fassung wörtlich in der Meldung.
4. **Der Hüllen-Wächter** (`tools/krypto-block-propagation-pruefen.js`) führt ab jetzt
   `istGeschuetzteSchluesseldatei` in `HUELLE_FUNKTIONEN` und `PROTECTED_KEY_VERSION_ALLOWLIST` in
   `HUELLE_KONSTANTEN`.

**Nicht angefasst:** der gepinnte Krypto-Block, `PORT-VERBATIM.js`, `vivodepot.html`,
`vivodepot.html.sha256`, `sw.js`/`SCHALEN_STAND`. Kein Schlüsselmaterial gelesen oder gesucht.

## Konsequenzen

Eine künftige Fassung 2 der `.vdkey`-Hülle (andere Ableitung, andere AAD, falls je gebraucht)
bekäme ihren eigenen Zweig in der Versionsweiche, nach demselben Muster wie
`_zerfallLesen`/`_aadEinheitV4()` beim Depot — Fassung 1 bliebe für immer lesbar, ohne
Migrationsschritt. Additive Erweiterung UNTER Fassung 1 (ein neues, optionales Feld) war schon
vorher unproblematisch und bleibt es.

**Was dieser ADR ausdrücklich nicht entscheidet:** ob und wann eine Fassung 2 gebraucht wird, und
ob „Ableitung parametrisieren" als Widerruf von U2-ADR-230 gewünscht ist. Beides bleibt offen.

## Konformität

```konformitaet
aussage:  Eine .vdkey-Hülle mit vivodepotProtectedKey außerhalb der Allowlist [1] wird von
          istGeschuetzteSchluesseldatei nicht als geschützte Datei erkannt — unbekannt heißt
          abweisen, nicht durchwinken.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vc-issuer-schluessel-schutz.test.js#[U2-ADR-249] eine unbekannte Fassung ist keine erkannte geschützte Datei — unbekannt heißt abweisen, nicht durchwinken
pruefung: tests/schluessel-teilen-werkzeug.test.js#[Eingang] jede Ablehnung sagt, WAS falsch ist — und die geschützte Datei bekommt einen Weg
```

```konformitaet
aussage:  entschluesseleSchluesselJwk weist eine Hülle mit unbekannter Fassung mit einer Meldung
          ab, die die Fassung nennt — nicht mit der generischen „keine geschützte Datei"-Meldung.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vc-issuer-schluessel-schutz.test.js#[U2-ADR-249 · Rot-Beweis] eine Hülle mit unbekannter Fassung wird mit einer Meldung abgewiesen, die die Fassung nennt
```

```konformitaet
aussage:  Fassung 1 bleibt unverändert entsperrbar — die Allowlist verengt nichts, was heute gilt,
          und die Ableitung ist von diesem Bau unberührt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vc-issuer-schluessel-schutz.test.js#[U2-ADR-249 · Gegenprobe] Fassung 1 bleibt unverändert entsperrbar (die Allowlist verengt nichts, was heute gilt)
```

```konformitaet
aussage:  istGeschuetzteSchluesseldatei und PROTECTED_KEY_VERSION_ALLOWLIST sind zwischen
          Zertifikator und Teiler byte-/wertgleich, unter demselben Wächter wie die übrige
          Hüllenschicht — Drift zwischen den zwei Kopien wird erkannt, nicht erst beim Rundlauf.
zustand:  geprüft
herkunft: invariante
pruefung: tests/krypto-block-propagation.test.js#[Klasse-A] W-Hüllenschicht: das echte Repo ist vollständig propagiert
pruefung: tests/krypto-block-propagation.test.js#[Negativprobe][Klasse-A] W-Hüllenschicht: istGeschuetzteSchluesseldatei-Drift zwischen zwei Trägern wird erkannt
```

---

*Vivodepot GmbH · Berlin · 04.09.2026*
