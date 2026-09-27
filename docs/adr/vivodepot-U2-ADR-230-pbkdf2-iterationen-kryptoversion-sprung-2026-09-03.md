# U2-ADR-230: Krypto-Stärkeparameter ändern sich nur über einen Sprung der `kryptoVersion` — nie an Ort und Stelle

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** KRYPTO, WÄCHTER
**Linie:** U2
**U2-Bezug:** U2-ADR-085 (14.07.2026) — der Code zitiert bei `vivodepot.html:3567–3575` einen
„ADR-085-Nachtrag" vom 18.08.2026 zum Zerfall in Feld-Einheiten; die ADR-085-Datei selbst führt
diese Erweiterung nicht, sie lebt nur als Kommentar im Code. U2-ADR-227 (03.09.2026,
`_signJWS`-Hüllenschicht) — derselbe Fehlertyp am selben Tag: eine geprüfte, verbatim-getragene
Schicht in mehreren Kopien, ohne Wächter.
**Anker:** Auftrag vom 03.09.2026, im Anschluss an eine Einbahnstraßen-Erhebung derselben
Sitzung und die Produktentscheidung „Bau es" zu einem ursprünglich als klein
eingeschätzten PBKDF2-Fix.
**Status heute:** gilt — Beleg `tests/pbkdf2-iterationen-versionssprung.test.js`,
`tests/empfaengerkreise-fach-in-der-datei.test.js`.

---

## Kontext

`PBKDF2_ITERATIONS = 600000` (`vivodepot.html:3555`) ist die Iterationszahl, mit der jedes
Passwort dieses Hauses in Schlüsselbits verwandelt wird — Haupt-Depot, Sub-Depot/Blackbox, und
über `_fachTuerSchluessel` auch die Türen der Empfängerkreise-Fächer. Ein ursprünglich als klein
eingeschätzter Auftrag sollte dafür sorgen, dass eine alte Datei mit einer niedrigeren
Iterationszahl auch nach einer künftigen Erhöhung der Konstante noch aufgeht — die gespeicherte
Zahl sollte pro Datei mitreisen und beim Ableiten statt der (dann höheren) Live-Konstante
verwendet werden.

Der Bau begann so: `deriveMasterBits`/`setupMasterSession` (beide innerhalb des gepinnten
Krypto-Blocks `vivodepot.html:3500–3907`) bekamen einen dritten Parameter, gefädelt durch
`depotLaden`, `subDepotEntsiegeln`, `depotSerialisierenV3`, `depotAnlegen`,
`passwortWechselDurchfuehren` und `_fachTuerSchluessel`/`depotMasterHkdfKey`. Zwei Funde stoppten
ihn, vor dem Commit:

**Fund 1 — die Ableitung ist nicht die einzige Stelle, die die Iterationszahl trägt.**
`_AAD_DEPOT_V2`/`_AAD_UEBERGABE_V2` (`:3582–3583`) und `_aadEinheitV4()` (`:3800–3808`) binden
`iterationen: PBKDF2_ITERATIONS` als GCM-`additionalData` — bei jedem `encryptData`/`decryptData`
(`:3664–3683`). Eine künftig höhere Konstante würde beim Öffnen einer alten Datei eine AAD
rekonstruieren, die nicht mehr zu der AAD passt, gegen die der GCM-Tag der alten Datei
authentifiziert wurde. Die Datei ginge nicht auf — unabhängig davon, ob der Schlüssel selbst
richtig abgeleitet wird. Eine Reparatur allein an der Ableitung wäre unvollständig gewesen.

**Fund 2 — der Block ist über sechs Träger byte-gepinnt, nicht nur in `vivodepot.html`
enthalten.** `tests/krypto-block-propagation.test.js` verlangt Byte-Identität des Blocks
`vivodepot.html:3500–3907` gegen `vivodepot-krypto-kern-PORT-VERBATIM.js` und vier weitere Träger
(`vivodepot-lesen.html`, `vivodepot-schluessel-teilen.html`, `vivodepot-template-generator.html`,
`vivodepot-vc-issuer.html`) — sechs Dateien insgesamt. `PORT-VERBATIM.js` trägt im Kopf
ausdrücklich: „Diese Funktionen NICHT umschreiben, umbenennen oder verbessern." Der ursprüngliche
Bau hatte diese Bindung bereits gebrochen — `tools/krypto-block-propagation-pruefen.js` meldete es
real, gemessen: „TRÄGER vivodepot.html: Block NICHT byte-identisch … (f5df2491… statt
f0f88502…)". Der wirkliche Umfang wäre also nicht zwei Dateien gewesen, sondern potenziell sechs
plus die Referenzdatei.

Auf dieser Grundlage wurde die ursprüngliche Reparatur vollständig zurückgenommen.
`tools/krypto-block-propagation-pruefen.js` bestätigt seither wieder Byte-Identität, Hash
`f0f8850227d8bf1a9d7f42f0f19600974e550cb422fda1651322916ea25a4e3e`, über alle sechs Träger.

## Der Präzedenzfall

Diese Entscheidung wurde am 18.08.2026 bereits einmal getroffen, an genau dieser Baustelle — nur
noch nicht als allgemeine Regel ausgesprochen. `vivodepot.html:3569–3575`, wörtlich:

> „Warum die Version überhaupt steigt, und das ist keine Wahl, sondern eine Folge: eine
> zerfallene Datei mit `kryptoVersion: 3` käme durch das Gate und scheiterte danach — ein
> verwirrender Fehler statt eines klaren."

`CRYPTO_VERSION_ZERFALL = 4` entstand nicht, weil irgendeine neue Zahl gebraucht wurde, sondern
weil eine strukturell andere Ableitung und eine andere AAD (`_aadEinheitV4()`, eigenständig,
getrennt von `_AAD_DEPOT_V2`) unter derselben Version zu einem verwirrenden statt einem klaren
Fehler geführt hätten. Live im Code geprüft, nicht nur behauptet: `depotLaden()` (`:16739`)
verzweigt nach `umschlag.kryptoVersion` (`:16768`, `if (umschlag.kryptoVersion ===
CRYPTO_VERSION_ZERFALL) return _zerfallLesen(...)`) auf einen vollständig eigenen Lesepfad;
`_zerfallSchreiben` (`:16296`) und `_zerfallLesen` (`:16549`) sind beide produktiv verdrahtet —
kein toter Zweig, kein Fall wie beim Anker, wo eine „Liste" faktisch nur einen Wert führte.

## Eine zweite Fundstelle derselben Regel — die `.vdkey`-Schlüsselhülle

Dieselbe Lücke, unabhängig gefunden: Die `.vdkey`-Hülle (`vivodepot-vc-issuer.html:2168–2222`,
Schutz der Betriebs-/Trust-Authority-Schlüssel, nicht der Bürgerdepots) trägt in ihrem Format
ebenfalls ein `iterationen`-Feld (`{ vivodepotProtectedKey: 1, kdf: 'pbkdf2-sha256', iterationen:
600000, salt, iv, ct }`, Kommentar `:2168–2174`) — geschrieben von `schuetzeSchluesselJwk()`
(`:2193–2206`), aber von `entschluesseleSchluesselJwk()` (`:2212–2222`) beim Ableiten NIE gelesen:
`deriveKey(passphrase, salt)` (`:2216`) ruft ohne den dritten Parameter, obwohl `wrapper.iterationen`
zu diesem Zeitpunkt bereits vorliegt. Die AAD (`_aadFuerSchluesselhuelle(wrapper)`, `:2218`) liest
den gespeicherten Wert dagegen korrekt aus `wrapper` — hier bricht nur die Ableitung, nicht (auch)
die AAD-Konstruktion wie beim Depot-Pfad.

**Warum diese Fundstelle schwerer wiegt als die erste:** Eine geänderte Konstante träfe beim
Depot die Datei einer einzelnen Person. Hier träfe sie die Fähigkeit, überhaupt noch Zertifikate
auszustellen und zu prüfen — und daran hängt jeder Herausgeber, nicht nur eine Inhaberin.

**Der Depot-Weg hat einen Ausweg, dieser (heute) nicht.** Der Depot-Pfad kann bei einer künftigen
Erhöhung auf `kryptoVersion` ausweichen — ein eigener Lesepfad, am Zerfall-Beispiel oben bereits
erprobt. Die `.vdkey`-Hülle trägt zwar ein eigenes Kennfeld (`vivodepotProtectedKey`), aber
`istGeschuetzteSchluesseldatei()` (`:2178–2180`) prüft es mit strikter Gleichheit gegen die eine
Konstante `PROTECTED_KEY_MARKER_VERSION = 1` (`:2176`) — keine Allowlist wie
`KRYPTO_VERSION_ALLOWLIST` beim Depot. Eine echte zweite Fassung dieses Formats ist damit HEUTE
nicht lesbar; additive Erweiterung unter der bestehenden Fassung 1 bliebe möglich, ein
Versionssprung nach demselben Muster wie beim Depot ist an dieser Stelle (noch) kein offener Weg.

**Bewusst nicht behoben.** Dieser ADR baut nichts an der `.vdkey`-Hülle um — die zweite
Fundstelle wird hier benannt, damit dieselbe Regel beide Orte trägt, nicht nur den zuerst
gefundenen. Eine Reparatur (Ableitung parametrisieren UND, davor, die Versions-Prüfung von
strikter Gleichheit auf eine Allowlist erweitern) ist ein eigener, künftiger Zug.

## Entscheidung

**Krypto-Stärkeparameter (Verfahren, Modus, Schlüssellänge, Iterationszahl) ändern sich nie an
Ort und Stelle. Eine Änderung ist ausschließlich ein Sprung der `kryptoVersion` mit eigener
Ableitung und eigener AAD, nach dem Zerfall-Vorbild.** `KRYPTO_VERSION_ALLOWLIST` trägt dafür
bereits die Mechanik — erweitert um den neuen Wert, nicht ersetzt (wie beim v3→v4-Übergang; v3
blieb erhalten und bleibt es für immer).

**Warum gerade die Iterationszahl einen eigenen Wächter braucht, die anderen drei Konstanten
(Verfahren, Modus, Schlüssellänge) aber nicht:** Ein Wechsel von Verfahren, Modus oder
Schlüssellänge ist bereits strukturell an eine neue Version gebunden — jede der drei ist über
`kdfTyp`, den AAD-Aufbau oder die Funktionsform mit ihrer `kryptoVersion` verwoben; sie ließen
sich gar nicht ändern, ohne neue Funktionen samt eigenem Lesepfad zu schreiben — der
Versionssprung entstünde dabei von selbst. `PBKDF2_ITERATIONS` dagegen ist ein einzelner,
isolierter numerischer Literal (`:3555`) — änderbar mit einer einzigen Zeilen-Bearbeitung, ohne
dass irgendeine Struktur das verhindert oder auch nur bemerkt. Sie ist die eine Stelle im ganzen
Vier-Konstanten-Satz, die sich unbemerkt an Ort und Stelle ändern ließe — deshalb, und nur
deshalb, braucht sie einen eigenen, expliziten Wächter.

**Zwei Wächter, keine Verhaltensänderung:**

1. `tests/pbkdf2-iterationen-versionssprung.test.js` pinnt `PBKDF2_ITERATIONS` hart auf `600000`
   — schlägt bei jeder Vor-Ort-Änderung sofort an, unabhängig von allem anderen im Haus.
2. `tests/empfaengerkreise-fach-in-der-datei.test.js` („[Fach·Wächter]") pinnt, dass
   `eintrag.kdf.iterationen` (geschrieben seit dem Zerfall-Zug, 18.08.2026) in jedem Eintrag der
   lebenden Konstante entspricht. Der Rot-Beweis wurde erzwungen, nicht nur behauptet: derselbe
   Vergleich wirft, mit `eintrag.kdf.iterationen` künstlich auf `600001` gesetzt, tatsächlich eine
   `AssertionError` mit „600001 !== 600000" (strict) — real gelaufen, nicht angenommen.

Zwei kleine, dazugehörige Kommentare (`vivodepot.html:16342` Schreibseite, `:16275` Leseseite —
beide bei `_fachTuerSchluessel`/der Fächer-Tabelle, weit hinter der Blockgrenze `:3907`, also
außerhalb des gepinnten Bereichs) erklären, warum `eintrag.kdf.iterationen` absichtlich
geschrieben, aber nie zurückgelesen wird. Kein Kommentar steht neben der Konstanten-Definition
selbst (`:3555`) — das würde den Block verändern und dieselbe Byte-Identität brechen, die dieser
Zug selbst einmal ausgelöst und zurückgenommen hat.

**Was nicht gebaut wurde, und warum — damit es in einem Jahr nicht für ein Versehen gehalten
wird:**

- **Keine Parametrisierung von `deriveMasterBits`/`setupMasterSession`.** Der ursprünglich
  begonnene, dann zurückgenommene Weg (s. Kontext, Fund 2) — er hätte den gepinnten Block über
  sechs Träger verändert, für einen Fall (eine andere Iterationszahl unter v3), den es unter v3
  nach dieser Entscheidung nie geben kann.
- **Keine zweite, blockfremde PBKDF2-Ableitungsstelle nur für die Empfängerkreise-Fächer.**
  Naheliegend, weil `_fachTuerSchluessel` (außerhalb des Blocks) über `depotMasterHkdfKey`
  dieselbe `deriveMasterBits` ruft wie der Hauptpfad — eine eigene, block-fremde Stelle hätte das
  Zurücklesen von `eintrag.kdf.iterationen` tatsächlich ermöglicht. Verworfen, weil sie eine
  zweite Krypto-Ableitung außerhalb der bewachten, verbatim-geprüften Schicht eingeführt hätte —
  in einem Haus, dessen Disziplin an diesem Tag zweimal an derselben Stelle ansetzte: eine
  geprüfte Stelle, nicht mehrere unbewachte Kopien (U2-ADR-227 bei `_signJWS`, dieser ADR bei
  PBKDF2). Und sie hätte einem Fall gedient, der unter v3 nicht entstehen kann — eine künftige
  Version brächte ohnehin ihre eigene, neue Ableitung mit. **Die eine PBKDF2-Stelle
  (`deriveMasterBits`, im gepinnten Block) bleibt die einzige.**
- **Kein funktionaler Fix der Empfängerkreise-Leseseite.** `eintrag.kdf.iterationen`
  zurückzulesen hätte, wie oben, die zweite Ableitungsstelle gebraucht. Unter v3 kann der
  gespeicherte Wert nie von der Konstante abweichen (Wächter 1 stellt das sicher) — ein
  Rücklesen hätte also, solange beide Wächter grün bleiben, nie einen anderen Schlüssel
  abgeleitet als heute schon.

## Konsequenzen

**Für eine künftige Erhöhung von `PBKDF2_ITERATIONS`:** sie geschieht als neue `kryptoVersion`
(nächster freier Wert nach 4) mit eigener Ableitungsfunktion und eigener AAD-Konstante, analog zu
`_zerfallLesen`/`_aadEinheitV4()`. Alte Dateien (`kryptoVersion` 3 oder 4) bleiben unter ihrer
jeweils eigenen, eingefrorenen Ableitung lesbar — für immer, ohne Migrationsschritt.

**Bindend:** niemand ändert `PBKDF2_ITERATIONS` — oder eine der drei anderen
Krypto-Stärkekonstanten — an Ort und Stelle. `tests/pbkdf2-iterationen-versionssprung.test.js`
macht das nicht zu einer Frage der Erinnerung.

**Nicht Teil dieses ADR:** ob und wann eine höhere Iterationszahl tatsächlich gebraucht wird. Das
ist eine eigene, künftige Entscheidung — dieser ADR legt nur fest, wie sie umgesetzt würde, falls
sie fällt.

## Konformität

```konformitaet
aussage:  PBKDF2_ITERATIONS bleibt der eingefrorene Wert 600000 — eine Änderung an Ort und Stelle
          schlägt sofort an, unabhängig von jedem anderen Zustand im Haus.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pbkdf2-iterationen-versionssprung.test.js#[PBKDF2·Wächter] PBKDF2_ITERATIONS bleibt der eingefrorene v3-Wert
```

```konformitaet
aussage:  eintrag.kdf.iterationen entspricht in jedem Eintrag (Anker wie Empfängerkreise-Fächer)
          der lebenden PBKDF2_ITERATIONS-Konstante — geprüft gegen echte, über den Produktweg
          erzeugte Einträge, mit erzwungenem Rot-Beweis (künstlich abweichender Wert löst dieselbe
          Prüfung real aus).
zustand:  geprüft
herkunft: invariante
pruefung: tests/empfaengerkreise-fach-in-der-datei.test.js#[Fach·Wächter] kdf.iterationen ist unter v3 in jedem Eintrag die eingefrorene Konstante
```

```konformitaet
aussage:  der Krypto-Block (vivodepot.html:3500–3907) bleibt über alle sechs Träger byte-identisch
          zu vivodepot-krypto-kern-PORT-VERBATIM.js — dieser ADR fügt keine Parametrisierung
          innerhalb des Blocks hinzu.
zustand:  geprüft
herkunft: invariante
pruefung: tests/krypto-block-propagation.test.js#[Klasse-A] W-krypto-propagation: das echte Repo ist vollständig propagiert
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
