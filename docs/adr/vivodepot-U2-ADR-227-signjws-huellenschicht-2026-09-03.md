# U2-ADR-227: `_signJWS` kommt unter den Hüllenschicht-Wächter — die Signierfunktion selbst wird ein bewachter Verbatim-Träger

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** SICHERHEIT, WÄCHTER
**Linie:** U2
**U2-Bezug:** U2-ADR-218 (Hüllenschicht-Wächter, hier erweitert, nicht ersetzt) · U2-ADR-172
(Zwischenstufe Anker/Ausgabestelle) · Auftrag, Zug 0 der Signierungs-Automatisierung
(03.09.2026, die Produktentscheidung für ein automatisiertes Signieren der Ausgabestellen-Ebene).
**Anker:** Nebenfund bei der Zug-0-Messung zur Signierungs-Automatisierung (03.09.2026, im
Auftrag): `_signJWS` liegt in vier byte-identischen Kopien (`vivodepot-vc-issuer.html`,
`vivodepot-template-generator.html`, `vivodepot.html`, `vivodepot-lesen.html`) — ohne jede
automatisierte Gleichheits-Prüfung, anders als der benachbarte VdCrypto-Block und die
`.vdkey`-Hüllenschicht.
**Status heute:** gilt — Beleg `tests/krypto-block-propagation.test.js`.

---

## Warum ein eigenes ADR, nicht nur eine Werkzeug-Änderung

Meine eigene Einschätzung, vor dem Schreiben gebildet: **ja, ein eigenes
ADR — nicht nur ein Eintrag in `HUELLE_FUNKTIONEN`.** Zwei Gründe:

Erstens die Einbahnstraßen-Regel: eine Signierfunktion, die unbewacht auseinanderläuft, driftet
in eine ausgelieferte Anwendung, und danach ist sie nicht mehr einzufangen — genau die Sorte
Entscheidung, die eine Aufzeichnung verdient, nicht nur einen Commit.

Zweitens der Unterschied zur bestehenden Hüllenschicht selbst: `schuetzeSchluesselJwk` &c. sind
Werkzeuge UM den Schlüssel herum. `_signJWS` ist die Operation, die den Schlüssel tatsächlich
benutzt — der Punkt, an dem eine künftige HSM-Anbindung ansetzen wird (Zug 0, Punkt 3 der
Messung: „die Naht ist `entschluesseleSchluesselJwk` gegen `_jwsImportSignKey`", unmittelbar
gefolgt vom `_signJWS`-Aufruf, den dieses ADR jetzt bewacht). Eine Drift hier wäre nicht
kosmetisch, sondern sicherheitsrelevant genug, um es als eigenständige Entscheidung
festzuhalten, wie es U2-ADR-218 für die Hülle selbst tat.

## Kontext

Vier eigenständige, bundlerlose HTML-Anwendungen tragen je eine Inline-Kopie von
`_signJWS(payload, privateKey, opts)`. Vor diesem ADR: byte-identisch, aber unbewacht — bestätigt
per Diff (leer) UND durch den bestehenden Prüfer selbst, der die Funktion bislang nicht kannte.
Der VdCrypto-Block hat seit U2-ADR-066/-218 einen Hash-Pin-Wächter mit kanonischer Quelle
(`vivodepot-krypto-kern-PORT-VERBATIM.js`); für `_signJWS` existiert keine solche kanonische
Datei — die Funktion lebt nur in den vier Anwendungen selbst, genau die Form, für die U2-ADR-218
den `pruefeHuelle`-Mechanismus (Träger finden, unter den gefundenen byte-/wertgleich verlangen,
keine Pflicht-Quelle) bereits gebaut hat.

Der Teiler (`vivodepot-schluessel-teilen.html`) trägt `_signJWS` bewusst NICHT — eigene, ältere
Entscheidung („der JWS-Block bleibt draußen", 23.08.2026, Teiler-Isolation,
`vivodepot-schluessel-teilen.html:29`). Vier Träger, nicht fünf, ist darum der richtige Zielwert,
nicht ein Fehlen.

## Entscheidung

**1 — `_signJWS` in `HUELLE_FUNKTIONEN` aufgenommen** (`tools/krypto-block-propagation-
pruefen.js`), derselbe Mechanismus wie die vier bestehenden Stücke, keine zweite Implementierung.

**2 — Wächterhinweis-Kommentar an allen vier Fundstellen ergänzt** (identischer dritter Satz im
bestehenden Kommentarblock über der Funktion) — ein Wächter ohne Verweis an der bewachten Stelle
wäre eine Asymmetrie zu jeder anderen Stelle im Repo. Berührt `vivodepot.html` und
`vivodepot-lesen.html` inhaltlich (Kommentar, kein Verhalten) — SCHALEN_STAND/CACHE darum
gemeinsam gehoben (v507 → v508), anders als U2-ADR-218, das `vivodepot.html` nicht anfasste.

**3 — Rot-Beweis, zweifach:** eine neue, `_signJWS`-namentliche Probe
(`tests/krypto-block-propagation.test.js`, Fixture-basiert, wie die drei bestehenden
Hüllenschicht-Rotproben) UND ein einmaliger echter Eingriff — ein Zeichen in der `vivodepot.html`-
Kopie geändert, Wächter live gefahren, Befund erschien wörtlich(„HÜLLE _signJWS: vivodepot.html
weicht von vivodepot-lesen.html ab"), Zeichen zurückgesetzt, wieder grün. Nicht nur eine Probe
gegen ein Fixture — der Wächter wurde gegen den echten Bestand einmal wirklich scharf gemacht.

**4 — Der Positivkontroll-Test am echten Repo trägt jetzt eine fünfte Zeile:**
`h.funde._signJWS.length === 4`, mit Begründung im Kommentar, warum der Teiler fehlt (Punkt
„Kontext" oben).

## Ausdrücklich nicht behandelt

**Keine HSM-Anbindung.** Dieses ADR sichert nur die Voraussetzung dafür ab (vier Kopien dürfen
nicht mehr unbemerkt auseinanderlaufen) — die eigentliche Anbindung an der in der Zug-0-Messung
gefundenen Naht (`entschluesseleSchluesselJwk` → `_jwsImportSignKey`) ist ein eigener,
nachfolgender Bau, ausdrücklich erst nach diesem ADR und erst nach der Anbieter-Entscheidung.

**Keine Verschmelzung mit dem gehashten VdCrypto-Block.** Dieselbe Begründung wie in U2-ADR-218:
`_signJWS` hat keine kanonische Pflicht-Quelle, die Hüllenschicht-Form passt strukturell, eine
zweite Prüfform wäre unnötig.

## Konsequenzen

Die Signierfunktion der gesamten Zertifikatskette ist jetzt derselben mechanischen Garantie
unterworfen wie der Kryptokern und die Schlüsselhülle: nicht nur beschrieben als identisch,
sondern bei jedem Testlauf erzwungen. Eine künftige HSM-Anbindung ändert `_signJWS` an einer
Stelle mit der Gewissheit, dass keine der anderen drei Kopien vergessen wird, ohne dass ein Test
es sagt.

## Konformität

```konformitaet
aussage:  Unter den Trägern, die _signJWS führen, ist die Funktion byte-identisch — geprüft bei
          jedem Testlauf, nicht nur einmalig. Der Teiler trägt sie bewusst nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/krypto-block-propagation.test.js#[Klasse-A] W-Hüllenschicht: das echte Repo ist vollständig propagiert
```

```konformitaet
aussage:  Eine Drift zwischen zwei _signJWS-Kopien macht den Wächter rot — belegt sowohl an einem
          Fixture als auch einmalig live am echten Bestand (Zeichen geändert, Befund erschien,
          zurückgesetzt).
zustand:  geprüft
herkunft: invariante
pruefung: tests/krypto-block-propagation.test.js#[Negativprobe][Klasse-A] W-Hüllenschicht: _signJWS-Drift zwischen zwei Trägern wird erkannt
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
