# U2-ADR-271: PBKDF2-Iterationszahl wird aufrüstbar — Allowlist gekoppelt an die Kryptoversion

**Status:** Angenommen — entschieden durch U2-ADR-230 und die Auflage vom 05.09.2026 zu dessen Bestätigung („muss aber ‚aufrüstbar‘ sein“); nachgetragen am 28.09.2026 (bis dahin nie gelandet), keine neue Entscheidung
**Datum:** 04.09.2026
**Kategorie:** KRYPTO, WÄCHTER
**Linie:** U2
**U2-Bezug:** U2-ADR-230 (03.09.2026) — entscheidet, DASS `PBKDF2_ITERATIONS` sich nie an Ort und
Stelle ändert, nur über einen Sprung der `kryptoVersion`. Dieser ADR baut den Mechanismus, den
U2-ADR-230 dafür ankündigt, aber bewusst nicht baute (dort: „diese ADR fügt keine
Parametrisierung innerhalb des Blocks hinzu").
**Status heute:** gilt — Beleg `tests/pbkdf2-iterationen-allowlist-kryptoversion-kopplung.test.js`,
`tests/pbkdf2-iterationen-deckung-ausgelieferter-bestand.test.js`.

---

## Kontext

`PBKDF2_ITERATIONS = 600000` (`vivodepot.html:3814`, innerhalb des über sechs Träger
byte-gepinnten Krypto-Blocks) ist entschieden, eingefroren und mehrfach gewächtert
(U2-ADR-230). Die Bestätigung des Werts (04.09.2026) trug zugleich eine Auflage: „ok - muss aber
‚aufrüstbar' sein in Zukunft" — eine künftige Erhöhung darf nicht an einer sicherheitsrelevanten
Stelle unter Zeitdruck entstehen. Der Mechanismus dafür entsteht darum jetzt — nicht der zweite
Wert selbst. Ein zweiter Wert wäre eine eigene, künftige Entscheidung.

**Diese Entscheidung ist zwölf Tage alt und war nie gelandet:** gefällt am 04.09.2026, als Patch
außerhalb des Kanons gerettet, aber nie eingespielt, bis eine ADR-Nummernlücken-Erhebung
(17.09.2026) die Lücke aufdeckte.

## Entscheidung

**`PBKDF2_ITERATIONEN_JE_KRYPTOVERSION`** (`vivodepot.html`, direkt hinter der schließenden
Script-Grenze des gepinnten Blocks, also außerhalb der byte-gepinnten Region) trägt einen
Eintrag je erlaubter Kryptoversion (`KRYPTO_VERSION_ALLOWLIST`), jeweils mit der Zahl, mit der sie
tatsächlich ableitet:

```js
const PBKDF2_ITERATIONEN_JE_KRYPTOVERSION = Object.freeze({
  [CRYPTO_VERSION_AKTUELL]: PBKDF2_ITERATIONS,
  [CRYPTO_VERSION_ZERFALL]: PBKDF2_ITERATIONS,
});
```

**Warum beide Versionen dieselbe Zahl tragen:**
gemessen, nicht angenommen (04.09.2026, am heutigen Kanon nachgemessen unverändert gültig) —
`deriveMasterBits(password, salt)` ist die EINE Ableitungsstelle im ganzen Haus, ohne Versions-
Parameter, aufgerufen von `deriveKey` (Übergabe-Pfad) UND von `setupMasterSession` (Anker-/
Sitzungs-Pfad) — beide unbedingt, unabhängig davon, ob der erzeugte Umschlag am Ende
`kryptoVersion: 3` oder `kryptoVersion: 4` trägt. Ein frisch angelegtes Depot
(`depotAnlegen` → `depotSerialisieren`) schreibt heute real `kryptoVersion: CRYPTO_VERSION_ZERFALL`
(per Regressionsprobe bestätigt, s. u.); `kryptoVersion: 3` bleibt als Rückweg lesbar. Beide
erlaubten Versionen leiten also mit derselben Zahl ab.

**Nachtrag 29.09.2026 (Prüfung vor der Landung):** der Stand vom 04.09. trug nur den Eintrag
für 4. Die Tabelle sagte damit über den erlaubten Rückweg v3 nichts — unvollständig über einen
Weg, auf dem Depots geöffnet werden. Seitdem steht je erlaubte Version ein Eintrag, und die
Kopplung prüft beide Richtungen.

**Heute genau eine Iterationszahl.** Kein zweiter Wert, nicht als Beispiel, nicht vorbereitend —
das wäre eine Entscheidung, die dieser ADR nicht trifft.

**Die Kopplung, die trägt:** ein Eintrag, dessen Schlüssel `KRYPTO_VERSION_ALLOWLIST` nicht führt,
ist ein Iterationswert ohne Kryptoversions-Sprung — genau der Fall, den U2-ADR-230 ausschließt.
Umgekehrt ist eine erlaubte Version ohne Eintrag eine Lücke in der Tabelle (Rot-Beweis: der Stand
ohne den Eintrag für 3 schlägt an).

**Abweisung fremder Zahlen (29.09.2026 belegt):** der Kern liest die Iterationszahl nie aus der
Datei; ein Depot, das mit einer nicht gelisteten Zahl abgeleitet wurde, besteht die AES-GCM-Prüfung
nicht und wird abgewiesen, nicht still angenommen. Probe mit Gegenprobe:
`tests/pbkdf2-iterationen-allowlist-kryptoversion-kopplung.test.js`, `[PBKDF2-Allowlist·Rot-Beweis]`.
`tests/pbkdf2-iterationen-allowlist-kryptoversion-kopplung.test.js` prüft das mit einem
erzwungenen Rot-Beweis: ein künstlich angehängter Schlüssel, den `KRYPTO_VERSION_ALLOWLIST` nicht
führt, lässt die Prüfung real durchfallen (auch gegen eine real im Quelltext entfernte Konstante
geprüft — nachgetragen 17.09.2026, s. u.). Eine Gegenprobe mit einer echten, anderen Version aus
der Allowlist (3, `CRYPTO_VERSION_AKTUELL`) bleibt grün — die Probe unterscheidet echte
Kryptoversion von erfundener, nicht nur „irgendein zweiter Schlüssel".

**Bestehende Wächter unverändert.** `tests/pbkdf2-iterationen-versionssprung.test.js`
(U2-ADR-230) bleibt die einzige Quelle für „600000 ist der eingefrorene Wert" — dieser ADR
dupliziert diese Zahl nicht als zweites Literal, sondern liest sie live aus `PBKDF2_ITERATIONS`.

**Regression, gemessen:** ein mit dem heutigen (einzigen) Wert angelegtes Depot öffnet danach
unverändert — `tests/pbkdf2-iterationen-allowlist-kryptoversion-kopplung.test.js`, dritte Probe:
echtes `depotAnlegen`/`depotSerialisieren`, frischer Kern, echtes `depotLaden`, Feldwert geprüft.

## Nachtrag — Deckung über den ganzen ausgelieferten Bestand

Fundstellen namentlich vermessen, nicht aus einer Übergabe übernommen (04.09.2026, am heutigen
Kanon 17.09.2026 erneut vollständig nachgemessen — alle acht Fundstellen unverändert vorhanden,
alle noch 600000, s. u.).

Gegengelesen (Zweitmeinung): die ursprüngliche Auflage prüfte nur VERSTÖSSE gegen
die Allowlist in `vivodepot.html` — das sieht die wahrscheinlichere Fehlerklasse nicht. Es gibt
nicht einen Ort mit `600000`, sondern acht, über fünf getrennt ausgelieferte Dateien verstreut
(`vivodepot.html` zweimal — `PBKDF2_ITERATIONS`, `ANG_PBKDF2_ITERATIONEN` —, je einmal in
`vivodepot-lesen.html` — zusätzlich `ANTWORT_PBKDF2_ITERATIONEN`, also zweimal —,
`vivodepot-schluessel-teilen.html`, der Vorlagen-Generator, und
`vivodepot-vc-issuer.html`, dort zusätzlich ein Literal in einer Kommentar-Formatbeschreibung).
**Nur zwei der acht Stellen tragen überhaupt einen Kommentar, der eine Kopplung an die
Hauptkonstante behauptet** (`vivodepot.html:27174` „= Haupt-KDF PBKDF2_ITERATIONS. FEST";
`vivodepot-lesen.html:7262` „= ANG_PBKDF2_ITERATIONEN im Kern, fest"). **Die anderen fünf — die
vier `PBKDF2_ITERATIONS`-Zwillinge in den übrigen Trägern plus der Literal in der
`.vdkey`-Formatbeschreibung — sind heute durch NICHTS aneinander gebunden:** nicht durch Code,
nicht durch Test, nicht einmal durch einen Kommentar, den jemand beim Ändern läse. Ihr einziger
Text erklärt, warum 600000 der richtige Wert ist (OWASP-2024) — keiner sagt, dass er mit den
anderen Stellen gleichbleiben muss. **Diese Deckungsprobe formalisiert darum keinen bestehenden
Gleichlauf — sie ist für fünf der acht Stellen die erste Bindung überhaupt.**

**Der gefährliche Fall ist nicht ein zweiter Wert, sondern eine stille Divergenz:** hebt jemand
`PBKDF2_ITERATIONS` im Kern und lässt eine der anderen sechs benannten Stellen stehen, entsteht
KEIN Allowlist-Verstoß (die Kopplung oben prüft nur `vivodepot.html`) — aber ein Kern, der anders
ableitet als die Lese-App, mit Dateien, die die eine öffnen kann und die andere nicht.

**`tests/pbkdf2-iterationen-deckung-ausgelieferter-bestand.test.js`** schließt diese Lücke:
scannt den Rohtext aller fünf Träger-Dateien nach jedem `const <NAME> = <ZAHL>;`, dessen Name
sowohl „PBKDF2" als auch „ITERATION" trägt, und prüft, dass jeder gefundene Wert der lebenden
`PBKDF2_ITERATIONS`-Konstante entspricht. Mit Gegenkontrolle (Pflicht, nicht optional): eine
abweichende Zahl wird real erkannt, in einer ANDEREN Datei als `vivodepot.html` geprüft, nicht
nur eine Prüfung, die nur den Kern ansieht.

**Der `.vdkey`-Literal — gemessen, nicht entschieden:** das Konstanten-Namen-Muster sieht den
Wert in `vivodepot-vc-issuer.html`s Formatbeschreibung NICHT — er steht als Zahl in einem
Kommentar (`iterationen: 600000` innerhalb der Formatbeschreibung des `.vdkey`-Aufbaus,
`vivodepot-vc-issuer.html:2594`), nicht als eigene, benannte Konstante. Eine eigene Probe hält das
ausdrücklich fest (dokumentiert, kein Fehlschlag) — die Datei trägt an anderer Stelle (Zeile 436)
zusätzlich eine ECHTE `PBKDF2_ITERATIONS`-Konstante, die die Probe sehr wohl sieht; nur der
Kommentar-Literal bleibt ein benannter, unerfasster Rest. Ob das ein Mangel ist, entscheidet
dieser ADR nicht — er hält nur fest, dass die Probe ihn nicht sieht, statt es zu verschweigen.

**Was ausdrücklich nicht dazugehört:** die acht Stellen auf eine zu reduzieren.
`vivodepot-lesen.html` ist eine eigenständig ausgelieferte Datei; ihre eigene Konstante zu
entfernen ist ein eigener Bau mit eigener Prüfung, nicht Aufräumarbeit dieses Auftrags.

## Was nicht gebaut wurde, und warum

- **Keine zweite Ableitungsfunktion, kein zweiter Wert.** Der Auftrag war ausdrücklich der
  Mechanismus, nicht der Vorgriff auf eine künftige Erhöhung — dieselbe Disziplin wie U2-ADR-230
  selbst.
- **Keine Änderung am gepinnten Krypto-Block.** Die neue Zuordnung liegt vollständig außerhalb
  (`vivodepot.html:4171`, nach der schließenden Script-Grenze des gepinnten Blocks) —
  `tools/krypto-block-propagation-pruefen.js` bleibt unberührt, keine Propagation über die sechs
  Träger nötig.
- **Keine Laufzeit-Prüfung beim Depot-Öffnen.** Die Zuordnung ist ein deklarativer, testgewächteter
  Bestand — kein neuer Gate im Lade-Pfad. `deriveMasterBits` selbst bleibt unverändert; die
  Regressionsprobe zeigt das, statt es anzunehmen.

## Konsequenzen

**Für eine künftige Erhöhung von `PBKDF2_ITERATIONS`:** sie geschieht, wie U2-ADR-230 festlegt,
als neuer Sprung der `kryptoVersion` mit eigener Ableitung und eigener AAD. Der Eintrag mit der neuen
Zahl in `PBKDF2_ITERATIONEN_JE_KRYPTOVERSION` entsteht dann ALS TEIL dieses Sprungs, unter dem neuen
Versions-Schlüssel — nicht davor, nicht als Vorbereitung.

**Bindend:** ein Eintrag ohne echten, in `KRYPTO_VERSION_ALLOWLIST` geführten Versions-Schlüssel
ist kein gültiger zweiter Wert, sondern die Vor-Ort-Änderung, gegen die U2-ADR-230 steht —
`tests/pbkdf2-iterationen-allowlist-kryptoversion-kopplung.test.js` macht das nicht zu einer
Frage der Erinnerung.

## Konformität

```konformitaet
aussage:  PBKDF2_ITERATIONEN_JE_KRYPTOVERSION trägt je Kryptoversion aus KRYPTO_VERSION_ALLOWLIST
          genau einen Eintrag, und jeder Wert entspricht der lebenden PBKDF2_ITERATIONS-Konstante.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pbkdf2-iterationen-allowlist-kryptoversion-kopplung.test.js#[PBKDF2-Allowlist·Wächter] je erlaubte Kryptoversion ein Eintrag, alle mit der lebenden Zahl
```

```konformitaet
aussage:  ein Eintrag ohne echten Kryptoversions-Sprung (ein Schlüssel, den KRYPTO_VERSION_ALLOWLIST
          nicht führt) schlägt real an, ebenso eine erlaubte Version ohne Eintrag — geprüft mit
          erzwungenem Rot-Beweis in beide Richtungen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pbkdf2-iterationen-allowlist-kryptoversion-kopplung.test.js#[PBKDF2-Allowlist·Wächter] Kopplung an KRYPTO_VERSION_ALLOWLIST hält — Rot-Beweis erzwungen
```

```konformitaet
aussage:  ein mit dem heutigen (einzigen) Wert verschlüsseltes Depot öffnet nach dieser Ergänzung
          unverändert — echtes depotAnlegen/depotSerialisieren/depotLaden, frischer Kern.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pbkdf2-iterationen-allowlist-kryptoversion-kopplung.test.js#[PBKDF2-Allowlist·Regression] ein mit dem heutigen (einzigen) Wert verschlüsseltes Depot öffnet unverändert
```

```konformitaet
aussage:  jede benannte PBKDF2-Iterationszahl-Konstante über alle fünf ausgelieferten Träger-
          Dateien hinweg trägt denselben Wert wie die lebende PBKDF2_ITERATIONS im Kern — mit
          Gegenkontrolle: eine abweichende Zahl in einer der VIER anderen Dateien (nicht
          vivodepot.html) wird real erkannt, nicht nur eine Prüfung, die nur den Kern ansieht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pbkdf2-iterationen-deckung-ausgelieferter-bestand.test.js#[PBKDF2-Deckung·Wächter] jede benannte Konstante im ausgelieferten Bestand trägt denselben Wert
```

---

*Vivodepot GmbH · Berlin · 04.09.2026 · nachgetragen 17.09.2026 (der Stand lag zwölf Tage
unerreichbar in einem inzwischen gelöschten Wegwerf-Arbeitsbaum, außerhalb des Kanons als Patch
gerettet — gegen den heutigen Kanon neu gemessen, alle acht Fundstellen unverändert bei 600000,
Entscheidung unverändert)*
