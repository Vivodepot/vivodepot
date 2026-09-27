# U2-ADR-218: Die `.vdkey`-Hüllenschicht kommt unter denselben Wächter wie der Kryptokern

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** SICHERHEIT, WÄCHTER
**Linie:** U2
**U2-Bezug:** U2-ADR-217 (Erhebung über alle Nebenanwendungen, fand diese Lücke) · die
Entscheidung vom 23.08.2026, den VdCrypto-Block als Verbatim-Träger in den
Schlüsselteiler aufzunehmen, benannte nur den Block selbst, nicht die Hüllenschicht.
`tools/krypto-block-propagation-pruefen.js` (Bestand) wird hier erweitert, nicht ersetzt.
**Anker:** Erhebung 02.09.2026 (Auftrag, Verallgemeinerung des ISO-18013-Fundes): die
Kryptographie selbst ist bereits mechanisch erzwungen identisch über alle fünf Anwendungen —
sechs Träger (Kern, Lese-App, Teiler, Generator, Zertifikator, kanonische Quelle), byte-identisch,
bei jedem Testlauf geprüft. Eine zweite, kleinere Schicht — das Format der geschützten
Schlüsseldatei (`.vdkey`) — lag AUSSERHALB dieses Schutzes: zwischen Teiler und Zertifikator
dupliziert, heute byte-identisch, aber nur durch einen Verhaltens-Rundlauf abgesichert, nicht
durch einen Byte-Vergleich.
**Status heute:** gilt — Beleg `tests/krypto-block-propagation.test.js`.

---

## Kontext

`tests/teiler-geschuetzt-sichern.test.js` beweist, dass eine vom Teiler geschützte `.vdkey`-Datei
sich im Zertifikator öffnen und mit dem entsperrten Schlüssel tatsächlich signieren lässt — ein
echter Rundlauf, keine Behauptung. Was dieser Test NICHT beweist: dass die beiden
Implementierungen der Hüllenschicht (`schuetzeSchluesselJwk`, `entschluesseleSchluesselJwk`,
`_aadFuerSchluesselhuelle`, `PROTECTED_KEY_MARKER_VERSION`) auch morgen noch übereinstimmen,
wenn nur EINE der beiden Dateien geändert wird. Ein Rundlauf-Test sieht nur, ob der aktuelle
Rundlauf funktioniert — er sieht nicht, ob zwei Implementierungen im Detail auseinanderlaufen,
solange keine der beiden Änderungen den Rundlauf selbst bricht.

Geprüft (Erhebung 02.09.2026, hier erneut frisch gemessen, nicht aus dem Bericht übernommen):
keine bestehende Entscheidung erklärt, warum die Hüllenschicht bewusst außerhalb des
gehashten VdCrypto-Blocks liegt (`docs/adr/` durchsucht, die Teiler-Isolations-Entscheidung vom
23.08.2026 benennt nur den Block selbst). Sie ist von Hand wortgleich übernommen worden
(Kommentar in `vivodepot-schluessel-teilen.html`, „Der Teiler sichert geschützt"), nicht als
architektonische Entscheidung, sondern als Arbeitsweise.

Der Kern (`vivodepot.html`) kennt `.vdkey` nicht — kein Treffer für „vdkey"/„ProtectedKey" im
gesamten Kern. Der Teiler kann nur schützen, nicht öffnen (`entschluesseleSchluesselJwk` fehlt
ihm bewusst). Die einzige real existierende grenzüberschreitende Richtung ist Teiler → Zertifikator.

## Entscheidung

**1 — `tools/krypto-block-propagation-pruefen.js` um einen eigenen Abschnitt erweitert**
(`pruefeHuelle`), NICHT verschmolzen mit der bestehenden Block-Prüfung: die Hüllenschicht ist
kein einzelnes Objekt wie `VdCrypto`, sondern vier benannte Stücke, von denen nicht jedes bei
jedem Träger vorkommt. Der neue Abschnitt geht wie der bestehende das Repo ab (dieselbe
`dateienListen()`-Funktion, wiederverwendet, nicht kopiert) und findet Träger je Stück selbst.

**2 — Prüfregel:** unter den Trägern, die ein Stück FÜHREN, muss es byte- (Funktionen) bzw.
wertgleich (Konstante) sein. Ein Stück mit nur einem gefundenen Träger ist per Definition
identisch mit sich selbst — kein Fehlalarm, keine „muss überall vorkommen"-Pflicht (anders als
beim Kernblock gibt es keine kanonische Pflicht-Quelle für die Hüllenschicht).

**3 — In die CLI-Ausgabe und den Exit-Code eingehängt:** ein Hüllenschicht-Befund macht den
Aufruf genauso rot wie ein Block-Befund — derselbe Wächter, eine Fehlerliste.

**4 — Rot-Beweis** (`tests/krypto-block-propagation.test.js`, fünf neue Proben): Positivkontrolle
an einem erfundenen Fixture, eine echte Rotprobe (eine Kopie weicht ab — heute live gefahren,
Befund erscheint), eine Gegenkontrolle für den Ein-Träger-Fall (kein Fehlalarm), eine
Gegenkontrolle für die Konstante, und die Positivkontrolle am echten Repo (Teiler + Zertifikator
tragen alle vier Stücke byte-/wertgleich, `entschluesseleSchluesselJwk` genau einmal).

## Ausdrücklich nicht behandelt

Keine Verschmelzung der Hüllenschicht in den gehashten VdCrypto-Block — dafür fand sich keine
Entscheidung, die das rechtfertigt, und der kleinere Eingriff ist vorzuziehen, solange
nicht ausdrücklich anders entschieden wird. Kein neuer, zweiter Wächter — derselbe erweitert.
Kein SCHALEN_STAND-Bump: diese Änderung berührt `vivodepot.html` nicht.

## Konsequenzen

Damit gilt der Satz aus der Erhebung uneingeschränkt, nicht nur für den Kernblock: **dass alle
fünf Säulen (Kern, Lese-App, Teiler, Generator, Zertifikator) denselben Kryptokern verwenden, ist
bei Vivodepot nicht nur beschrieben, sondern mechanisch erzwungen** — sechs Träger, byte-identisch,
bei jedem Testlauf geprüft. Die Hüllenschicht war die eine Ausnahme davon; ab diesem ADR ist sie
es nicht mehr.

## Konformität

```konformitaet
aussage:  Unter den Trägern, die ein Hüllenschicht-Stück (schuetzeSchluesselJwk/
          entschluesseleSchluesselJwk/_aadFuerSchluesselhuelle/PROTECTED_KEY_MARKER_VERSION)
          führen, ist es byte- bzw. wertgleich — geprüft bei jedem Testlauf, nicht nur einmalig.
zustand:  geprüft
herkunft: invariante
pruefung: tests/krypto-block-propagation.test.js#W-Hüllenschicht: das echte Repo ist vollständig propagiert
```

```konformitaet
aussage:  Der neue Prüfabschnitt macht eine echte Abweichung rot (Rot-Beweis) und erzeugt bei
          einem Stück mit nur einem Träger keinen Fehlalarm (Gegenkontrolle).
zustand:  geprüft
herkunft: invariante
pruefung: tests/krypto-block-propagation.test.js#W-Hüllenschicht: eine Kopie weicht vom anderen Träger ab
pruefung: tests/krypto-block-propagation.test.js#W-Hüllenschicht Gegenkontrolle: ein Stück mit nur einem Träger ist kein Fehlalarm
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
