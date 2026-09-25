# U2-ADR-235: der Sub-Depot-Umschlag wird je Kryptoversion vollständig geprüft und versionsecht zurückgeschrieben

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** KORREKTUR, KRYPTO, SUB-DEPOT
**Linie:** U2
**U2-Bezug:** U2-ADR-124 (Zug 3 — eigenständiges Depot einhängen, `a30df60b`, 04.08.2026,
öffnete den betroffenen Weg) · A345 (Zerfall in Feld-Einheiten, `bd3cd84a`, 19.08.2026,
machte ihn falsch) · U2-ADR-016 (Kryptoversion-3-Schlüsseltrennung, führte
`KRYPTO_VERSION_ALLOWLIST` ein, um die V4 später erweitert wurde, ohne alle Abnehmer der
V3-Form nachzuziehen)
**Anker:** Messauftrag vom 03.09.2026, im Anschluss an eine Vorwärtskompatibilitäts-
Messung („überleben unbekannte Felder einen Rundlauf?") — die Frage nach dem Sub-Depot-
Umschlag war der letzte Vorbehalt dieser Messung und legte diesen Fund frei.
**Status heute:** gilt — Beleg `tests/adr-235-subdepot-umschlag-versionsfest.test.js`
(zwei Suiten, 7 Proben) und die migrierte `tests/adr-124-huelle-umpacken-zug3.test.js`.

---

## Kontext

Der allgemeine Speicherweg `depotSerialisieren()` (ohne Versions-Suffix — der Weg, den jeder
gewöhnliche Speichern-Vorgang nimmt) reicht seit A345 unbedingt an `depotSerialisierenV4()`
durch: „Zerfall in Feld-Einheiten", jedes Feld einzeln HMAC-adressiert und einzeln
verschlüsselt, statt eines Blocks. `depotSerialisierenV3()` bleibt bewusst erhalten — als
geprüfter Rückweg für Bestandsdepots, nicht mehr als das, was eine Bürgerin beim Speichern
tatsächlich bekommt.

**Sechs Stellen im Sub-Depot-Weg gingen unabhängig voneinander davon aus, dass ein Umschlag
immer die sechs V3-Felder trägt** (`kryptoVersion, depotUUID, pbkdf2.salt, depotSalt, iv,
ct`) — obwohl ein V4-Umschlag stattdessen `einheiten` und `umschlagTabelle` trägt, kein `iv`
und kein `ct`:

1. `umschlagAusDatei` — rekonstruierte beim Ziehen des Umschlags aus einer regulären
   Depot-Datei unbedingt die sechs V3-Felder.
2. `pruefeBlackboxUmschlag` — die harte Eingangsprüfung für untrusted input, prüfte unbedingt
   auf genau diese sechs Namen und ihre V3-Längen.
3. `blackboxDateiAusUmschlag` — der formale Export-Wrapper, dieselbe unbedingte V3-Wahl.
4. `subDepotEinhaengen` — baute den PERSISTIERTEN `eintrag.umschlag` selbst noch einmal aus
   denselben sechs V3-Feldern, unabhängig von den ersten drei Stellen.
5. `subDepotEntsiegeln` — las beim Öffnen unbedingt `umschlag.iv`/`umschlag.ct`; der
   NFD-Fallback-Rückverschlüsselungspfad (Unicode-Normalisierung, B1 L4) schrieb beim Erfolg
   unbedingt einen neuen V3-Umschlag zurück.
6. `subDepotEigenerPasswortWechsel` — derselbe Rückverschlüsselungs-Fehler wie Stelle 5, beim
   eigenständigen Sub-Depot-Passwortwechsel. Am irreführendsten von allen sechs: der
   Rückgabewert behauptete `kryptoVersion: umschlag.kryptoVersion` (bei einem V4-Sub-Depot
   also 4), baute aber unbedingt ein `{iv, ct}`-Objekt — **ein Umschlag, der über seine
   eigene Struktur lügt.**

**Die ersten vier Stellen SCHEITERN, wenn sie falsch sind — mit einer Meldung, die nach
Korruption klingt, nicht nach falscher Kryptoversion:** „Einhängen: iv muss 12 Byte sein."
Kein stiller Feldverlust, ein sauberer, aber irreführender Wurf, weil `umschlagAusDatei`
`datei.iv`/`datei.ct` (bei V4 beide `undefined`) unbedingt in ein Sechs-Felder-Objekt
kopiert, bevor irgendeine Längenprüfung greift.

**Die Stellen 5 und 6 SCHREIBEN — und das ist der eigentliche Befund.** Ein Fix, der nur die
ersten vier Stellen behebt, macht die Lage schlechter, nicht besser: ein V4-Sub-Depot ließe
sich dann einhängen, aber nie wieder öffnen (ein roher WebCrypto-Fehler ohne die
`_b64Bytes`-Schutzschichten, an einer Stelle, an der niemand die Ursache vermutet). Und ohne
den Fix an den Stellen 5/6 hätte der erste erfolgreiche Öffnen-Versuch (NFD-Fallback oder ein
Passwortwechsel) das V4-Sub-Depot **still auf V3 heruntergeschrieben** — kein Fehlschlag,
sondern Datenverlust: alles, was V4 an Inhalt trägt und V3 nicht abbilden kann, wäre beim
nächsten Speichern verschwunden gewesen.

### Das Nutzungsfenster ist die einzige Aussage über Menschen — das Code-Fenster ist Entstehungsgeschichte

**Eine frühere Fassung dieses Abschnitts stellte beide Fenster nebeneinander, als wären sie
zwei Grade derselben Sache. Das war falsch — Produktkorrektur, wörtlich:** „niemand hat
die Datei erhalten am 19.8. Die Tester haben frühestens 479 erhalten." Die beiden Zahlen
beantworten unterschiedliche Fragen und stehen darum getrennt, mit unterschiedlichem Gewicht.

**Das Nutzungsfenster ist die einzige Zahl, die etwas über real mögliche Betroffenheit sagt:
ab `SCHALEN_STAND` v479, ausgeliefert am 01.09.2026 — zwei Tage bis zu dieser Korrektur.** Vor
v479 hat niemand eine Datei erhalten. Die Zahl v479 ist eine Angabe, hier
nicht unabhängig nachgemessen.

**Das Code-Fenster (`bd3cd84a`, 19.08.2026, `SCHALEN_STAND` v280) beantwortet eine andere
Frage — wie der Fehler entstand, nicht wie lange oder für wen er wirkte:** A345 machte an
diesem Commit V4 zum Standard, und sechs unabhängig hartkodierte Kopien der Sechs-Felder-
Annahme wurden nicht mitgezogen (s. u.). Diese Zahl gehört in keinen Satz, der „betroffen",
„erreichbar" oder „ausgeliefert" nahelegt — sie ist Entstehungsgeschichte, keine
Schadensdauer.

**Was mit v280 < v479 gilt und die operative Aussage dieser ADR ist: die ERSTE ausgelieferte
Fassung trug den Fehler bereits, nicht erst eine spätere.** Zusätzlich, ohne dass es diesen
Beleg noch bräuchte: real beobachtete Testerinnen-Stände (A566-Strang, 03.09.2026, dieselbe
Person, zwei Browser) waren v487 und v480 — beide über v280, bestätigen also dasselbe Bild.

**Der Fehler war ab der ersten ausgelieferten Fassung erreichbar. Ob ihn jemand erreicht hat,
ist offen** — betroffen ist nur, wer in diesen zwei Tagen versucht hat, eine normal
gespeicherte Depot-Datei als Sub-Depot einzuhängen. Das ist eine offene Prüfung, nicht Teil dieser ADR.

**Wichtig, gegen einen naheliegenden, aber falschen Schluss:** Am 03.09.2026 landete derselbe
Tag ein vollständiger Vier-Rollen-Sub-Depot-Bogen (`4d7f9d3e`, grün). Das ist **neue Arbeit**,
nicht Arbeit, die an einem bereits ausgelieferten kaputten Weg vorbeigelaufen ist — der Bogen
nimmt für Sub-Depot-Erzeugung und -Export zwei Wege, die per Konstruktion V3 bleiben
(`subDepotAnlegen`/`subDepotVersiegeln`, `subDepotBlackboxExportieren`), und hätte den Fehler
darum auch dann nicht gefunden, wenn gezielt danach gesucht worden wäre.

## Warum kein bestehender Test es fand

**Es gibt drei unabhängige Wege zu einem Sub-Depot-Umschlag, und nur einer ist betroffen:**

1. **`subDepotVersiegeln`** (hinter `subDepotAnlegen` — ein neues Sub-Depot im eigenen Haus):
   fest auf `CRYPTO_VERSION_AKTUELL` (= 3) verdrahtet, eigener direkter
   `VdCrypto.encryptDepot`-Aufruf, komplett unabhängig von `depotSerialisieren()`. **Bewusst
   nicht angefasst** — ob im eigenen Haus angelegte Sub-Depots dem Anker-Standard folgen
   sollen, ist eine Produktfrage, keine Fehlerbehebung, und ist eine Produktentscheidung.
2. **`subDepotBlackboxExportieren`**: liest den bereits persistierten `eintrag.umschlag` — für
   ein über Weg 1 angelegtes Sub-Depot immer V3.
3. **`subDepotEinhaengen`** mit einer regulären, unabhängig gespeicherten Datei (der
   Komfortweg aus U2-ADR-124 Zug 3): der einzige der drei Wege, der `depotSerialisieren()` —
   und damit V4 — als Eingang bekommen kann.

Der einzige bestehende Test, der genau Weg 3 prüfte
(`tests/adr-124-huelle-umpacken-zug3.test.js`), baute seinen Prüfstoff über einen lokalen
Helfer (`regulaereDepotDatei`), der `depotSerialisierenV3()` **hartkodiert** aufrief — mit
einer Begründung im Kommentar vom 19.08.2026, die ein „eigenständiges Depot" (den
Testgegenstand) mit einem Sub-Depot-Umschlag (Weg 1/2, für immer V3) verwechselte. **Der Test
prüfte exakt den einzig betroffenen Weg — mit der einen Eingabe, die ihn nicht betrifft.**
Keine Testlücke im üblichen Sinn: der Test zielte richtig und lud falsch.

**Der allgemeinere Satz, der über diesen Fix hinausträgt:** Sechs Stellen, alle unabhängig
hartkodiert, alle mit derselben Sechs-Felder-Annahme — das ist keine vergessene Stelle,
sondern eine Entscheidung, die sechsmal abgeschrieben wurde, und dann hat sich unter allen
sechs Kopien der Standard geändert. Wer die eine Definition (welche Felder ein Umschlag
trägt) ändert, findet die sechs Kopien nicht, weil keine von ihnen auf die Definition zeigt.
**Diese ADR benennt das, baut aber keinen Wächter dagegen** — ob daraus eine gemeinsame
Definition oder ein Wächter wird, ist eine offene Entscheidung.

## Entscheidung

**Sechs Stellen korrigiert, alle nach demselben Muster: die Versionsweiche steht VOR jeder
Feldprüfung, zwei vollständige und unabhängige Prüf-/Bau-Pfade statt einer gemeinsamen,
weicheren Vereinigungsmenge.**

**Prüfen (`pruefeBlackboxUmschlag`):** jetzt ein dünner Dispatcher, der zuerst
`kryptoVersion` gegen `KRYPTO_VERSION_ALLOWLIST` prüft, dann an `_pruefeBlackboxUmschlagV3`
oder `_pruefeBlackboxUmschlagV4` weitergibt. Jeder Pfad bleibt für sich genommen so hart wie
der bisherige V3-Pfad. **Der V4-Pfad ist zusätzlich härter, nicht weicher:** er prüft eine
Struktur-Invariante, die V3 gar nicht haben konnte — die Adressmenge in `einheiten` muss der
in `umschlagTabelle[0].umschlaege` entsprechen.

**Lesen (`umschlagAusDatei`, `subDepotEntsiegeln`):** die Rekonstruktion bzw. der Lesepfad
verzweigt jetzt auf `kryptoVersion === CRYPTO_VERSION_ZERFALL` und trägt bei V4
`einheiten`/`umschlagTabelle` statt `iv`/`ct`. `subDepotEntsiegeln` nimmt für V4 denselben
Weg wie `depotLaden` (`_zerfallLesen`) — kein neuer Mechanismus, derselbe.

**Bauen/Exportieren (`blackboxDateiAusUmschlag`, `subDepotEinhaengen`):** dieselbe
Versionsweiche beim Zusammenbau des Export- bzw. des persistierten Umschlags.

**Zurückschreiben (`subDepotEntsiegeln`-NFD-Fallback, `subDepotEigenerPasswortWechsel`):** die
gefährlichsten zwei Stellen, weil sie SCHREIBEN. Beide schreiben jetzt immer die Version
zurück, die sie GELESEN haben — nie eine feste. Für V4 läuft der Rückweg über
`_zerfallSchreiben` statt `VdCrypto.encryptDepot` direkt.

**Bewusste Grenze an beiden schreibenden Stellen:** keine Übernahme etwaiger
Empfängerkreis-Fächer beim Zurückschreiben. Sub-Depots trugen unter V3 nie eigene Fächer — es
gibt kein Bestandsverhalten, das zu erhalten wäre. Ein Fach an einem eingehängten
V4-Sub-Depot-Umschlag (falls die gebende Person eigene Empfängerkreise konfiguriert hatte)
geht beim NFD-Fallback-Reencrypt oder beim Sub-Passwortwechsel verloren — dokumentiert, nicht
gebaut. Derselbe Rahmen wie der übrige Fix: nur die V3-Annahme korrigiert, keine neue
Fähigkeit.

## Belege

`tests/adr-235-subdepot-umschlag-versionsfest.test.js` (neu, zwei `describe`-Blöcke):

- Mount-Weg: eine echte V4-Datei (über `depotSerialisieren()`, nicht `V4()` direkt) hängt
  sich ein, byte-identisch (`deepEqual` gegen `einheiten`/`umschlagTabelle`), öffnet danach
  über `subDepotEntsiegeln` mit korrektem Inhalt. V3-Kontrolle daneben (kein Rückschritt).
  Härte-Vergleich beider Prüfpfade (je drei kaputte Fälle). Die Adress-Konsistenz-Invariante.
  Eine unbekannte Kryptoversion fällt weiterhin durch.
- Rückverschlüsselungs-Weg (Site 5+6): `craftLegacyZerfallUmschlag` — die V4-Entsprechung zu
  `craftLegacyUmschlag` aus `tests/nfc-passwort.test.js`, kein eigenes Verfahren erfunden —
  baut einen V4-Umschlag mit einem aus ROHEN (nicht normalisierten) Bytes abgeleiteten
  Schlüssel. Der NFD-Fallback in `subDepotEntsiegeln` öffnet ihn und schreibt nachweislich
  wieder V4 zurück (`kryptoVersion` bleibt 4, `einheiten`/`umschlagTabelle` vorhanden,
  `iv`/`ct` bleiben `undefined`) — nicht nur, dass der Aufruf nicht wirft, sondern dass die
  Form stimmt. Dieselbe Probe für `subDepotEigenerPasswortWechsel`.

`tests/adr-124-huelle-umpacken-zug3.test.js` migriert: `regulaereDepotDatei` ruft jetzt
`depotSerialisieren()` statt `depotSerialisierenV3()` — der Bestandstest wurde dadurch vor
dieser Korrektur rot, das ist der Beleg, nicht ein Nebeneffekt. Die betroffenen Assertions auf
die V4-Feldnamen nachgezogen; eine Probe erweitert, um zusätzlich das erneute Öffnen über
`subDepotEntsiegeln` zu zeigen (vor der Korrektur an dieser Stelle nicht möglich).

`tests/sub-depot-bogen-durchstich.test.js`: eine Fixture-Korrektur (Zeile 176) — die
Versions-vor-Feld-Reihenfolge (oben, „Prüfen") ändert, WELCHER Fehler zuerst geworfen wird,
wenn ein Testobjekt `kryptoVersion` fehlt; die Probenabsicht (Sechs-Felder-Prüfung) bleibt
erhalten, indem die Fixture ein gültiges `kryptoVersion` bekommt.

Gezielter Regressionslauf über zwölf betroffene und benachbarte Testdateien: **grün.**

## Konformität

```konformitaet
aussage:   U2-235: pruefeBlackboxUmschlag/umschlagAusDatei/blackboxDateiAusUmschlag/
           subDepotEinhaengen/subDepotEntsiegeln/subDepotEigenerPasswortWechsel prüfen bzw.
           bauen den Sub-Depot-Umschlag je nach kryptoVersion vollständig und unabhängig
           (V3 und V4 getrennte, gleich harte Pfade); der V4-Pfad prüft zusätzlich eine
           Adress-Konsistenz-Invariante zwischen einheiten und umschlagTabelle[0].umschlaege.
           Die beiden schreibenden Stellen (NFD-Fallback, Sub-Passwortwechsel) schreiben
           immer die gelesene Kryptoversion zurück, nie eine feste.
zustand:   prüfbar
pruefung:  tests/adr-235-subdepot-umschlag-versionsfest.test.js#schreibt beim Re-Encrypt wieder V4 zurueck
pruefung:  tests/adr-124-huelle-umpacken-zug3.test.js#eigenständige Depot-Datei lässt sich einhängen
quelle:    fund
```

---
*Vivodepot GmbH · Berlin · U2-ADR-235 · 03.09.2026*
