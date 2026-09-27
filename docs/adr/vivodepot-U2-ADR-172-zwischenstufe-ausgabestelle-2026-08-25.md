# U2-ADR-172: Die Zwischenstufe — ein Ausgabe-Schlüssel zwischen Anker und Kunde

**Status:** Akzeptiert
**Datum:** 25.08.2026 (Architektur gebaut und getestet am 23.08.2026 — dieses ADR schließt eine
seither offene Dokumentationslücke nach, es entscheidet nichts neu)
**Kategorie:** ARCHITEKTUR, SICHERHEIT
**Status heute:** gilt

**Grundlage:** `tests/zertifikatsbetrieb-durchstich.test.js`, `tests/zwischenstufe-ausgabestelle.test.js`,
`tests/vc-issuer-zwischenstufe.test.js`, `tools/behoerden-zertifikat-ausstellen.js`,
`tools/kundenzertifikat-ausstellen.js`. Konkreter Anlass für dieses Nachschreiben: beim
Vorbereiten einer Entscheidungsvorlage zur Schlüsselverwahrung (25.08.2026, im Zuge von
`tools/pro-modul-andock-demo-extern.js`, Commit `50479b1`) fiel auf, dass sämtliche Code-Kommentare
zu dieser Architektur **U2-ADR-146** zitieren — ein ADR, das tatsächlich etwas anderes entscheidet
(„Ein Format-Kanal ist eine Beschreibung, niemals Code", 18.08.2026, fünf Tage vor dem Bau dieser
Architektur, thematisch unverwandt). Nachgeprüft: kein ADR vom 23.08.2026 existierte, kein
ADR-Eintrag im Register erwähnte Zwischenstufe/Ausgabestelle/Zertifikatsbetrieb. Die Architektur
war gebaut, getestet und produktiv — nur nie tatsächlich per ADR autorisiert.

**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` ~Zeile 3836 (`verifiziereProviderCredential`, Zwischenstufen-
  Zweig), ~Zeile 22600 (`modulEinlassenGeprueft`, nutzt die Zwischenstufe optional).
- **Betroffener gemeinsamer Weg:** `tools/behoerden-zertifikat-ausstellen.js` (stellt das
  Ausgabestellen-Zertifikat vom Anker aus), `tools/kundenzertifikat-ausstellen.js` (stellt
  Kundenzertifikate vom Ausgabe-Schlüssel aus) — beide rufen dieselbe Zertifikator-Ausstellung
  auf, keine zweite Signier-Implementierung.
- **Test-Bezug:** `tests/zertifikatsbetrieb-durchstich.test.js` (die ganze Kette, ein Durchstich),
  `tests/zwischenstufe-ausgabestelle.test.js`, `tests/vc-issuer-zwischenstufe.test.js`.

**Löst U2-ADR-146 nicht ab — korrigiert nur seine fälschliche Zitierung an sieben Stellen.**
U2-ADR-146 entscheidet weiterhin „Format-Kanal als Beschreibung" und gilt dort unverändert. Die
sieben Stellen, die stattdessen auf **dieses** ADR zeigen sollten (jetzt korrigiert):
`vivodepot.html:3836`, `vivodepot.html:3885`, `vivodepot.html:22600`,
`tools/behoerden-zertifikat-ausstellen.js:65`, `tools/kundenzertifikat-ausstellen.js:10`,
`tests/vc-issuer-zwischenstufe.test.js:5`, `tests/zwischenstufe-ausgabestelle.test.js:3`.

---

## Kontext

Ein Anker signiert direkt jedes Anbieter-Zertifikat — das trug für zwei Behörden-Zertifikate im
Jahr. Für ein Geschäft mit vielen Kunden (Pro-Module, externe Herausgeberinnen) ist der direkte Weg
unmöglich: der Anker liegt geteilt in vier Papier-Anteilen, zwei müssen für JEDE einzelne
Zertifikatsausstellung von Hand zusammenkommen. Das ist für einen seltenen, hochwertigen Vorgang
richtig und für einen häufigen unbrauchbar.

## Entscheidung

**Eine Zwischenstufe entkoppelt Häufigkeit von Sicherheitsstufe:**

1. Der Anker zertifiziert — selten, einmal im Jahr, mit der vollen Anteile-Zeremonie — einen
   **Ausgabe-Schlüssel**. Das Ergebnis ist ein Ausgabestellen-Zertifikat, erkennbar an
   `anbieterTyp: 'vivodepot/ausgabestelle'`.
2. Der Ausgabe-Schlüssel zertifiziert danach **beliebig viele Kunden**, ohne dass der Anker je
   wieder gebraucht wird. Der Ausgabe-Schlüssel selbst liegt geschützt (verschlüsselte
   Schlüsseldatei + Passphrase), nicht in Anteile zerlegt — er wird oft gebraucht, und was oft
   gebraucht wird, kann nicht in vier Umschlägen liegen.
3. `verifiziereProviderCredential(kundenCertJws, { ankerJwk, ausstellerZertifikatJws })` prüft
   beide Stufen in einem Aufruf: zuerst das Ausstellerzertifikat gegen den Anker, dann das
   Kundenzertifikat gegen den im Ausstellerzertifikat genannten öffentlichen Schlüssel.
   `ausstellerZertifikatJws` reist mit jedem Kundenzertifikat mit (eigene Datei, kein Suchen nach
   einem zweiten Beleg beim Empfänger).

**Rechte-Erweiterung ausgeschlossen:** `anbieterTyp: 'vivodepot/ausgabestelle'` ist die einzige
Kennung, die `verifiziereProviderCredential` als Aussteller-Stufe akzeptiert — ein gewöhnliches
Institutions-/Behördenzertifikat kann sich nicht selbst zur Ausgabestelle erklären (gemessen,
`tests/zertifikatsbetrieb-durchstich.test.js`, Gegenprobe).

**Kaskadierender Widerruf durch Konstruktion, keine zweite Buchführung:** läuft der Ausgabe-
Schlüssel ab oder wird er widerrufen, scheitert die Aussteller-Prüfung bei JEDER künftigen
Verifikation eines darunter ausgestellten Kundenzertifikats — automatisch, ohne dass irgendwo eine
Liste "alle Kunden dieses Ausgabe-Schlüssels" geführt werden müsste.

**Der Widerruf selbst läuft über dieselbe Sperrliste wie bei jedem Anbieter** — der Thumbprint des
Ausgabe-Schlüssels ist kein eigener Mechanismus, nur ein weiterer Eintrag in derselben Liste.

## Verworfene Alternativen

- **Direkter Weg beibehalten, Anker signiert jedes Zertifikat selbst.** Verworfen: skaliert nicht
  über eine Handvoll Zertifikate im Jahr, macht den Anker zum Flaschenhals für jedes Tagesgeschäft.
- **Volle mehrstufige Zertifikatshierarchie (mehrere Zwischenebenen, Kreuzsignaturen).** Verworfen
  als Überbau für den heutigen Bedarf — eine Zwischenstufe löst das gemessene Problem (viele
  Kunden, ein Ausgabe-Schlüssel), zwei oder mehr wären eine Antwort auf eine Frage, die noch
  niemand gestellt hat.

## Was diese Architektur NICHT abdeckt — offen, nicht Gegenstand dieses ADR

**Die Verteilung eines Widerrufs an bereits ausgelieferte Depots ist nicht Teil dieser
Entscheidung und heute nicht gebaut.** Die eingebettete Sperrliste (`vivodepot.html:3834`) ist ein
fest eingebettetes, leeres, eingefrorenes Array — jeder Widerruf wirkt erst, wenn eine Bürgerin
eine neue Fassung von `vivodepot.html` lädt, die die Liste befüllt enthält. Kein Import-, Fetch-
oder Verteilmechanismus existiert. Dieses ADR beschreibt die Prüf-Architektur (WAS geprüft wird,
wenn eine Liste vorläge) — nicht, WIE eine Liste zeitnah zu bereits offenen Depots kommt. Gemeldet,
nicht hier gelöst.
