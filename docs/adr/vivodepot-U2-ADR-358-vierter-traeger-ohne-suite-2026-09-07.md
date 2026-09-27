# U2-ADR-358: Der vierte Träger — `faktenbasis-erzeugen --ohne-suite` + `ableitungen:build`

**Status:** gilt. Vier Trägerdateien hängen mechanisch am Kern; drei sind billig, der
vierte fuhr in seiner Voreinstellung einen echten `node --test`-Lauf (~50 s) für eine
einzige Zahl — an einem Vormittag dreimal vergessen, aus keinem Aufmerksamkeitsgrund,
sondern weil niemand einen 50-Sekunden-Befehl „mal eben" mitlaufen lässt.
**Status heute:** gilt. `--ohne-suite` und `ableitungen:build` sind gebaut, getestet
und gegen den echten Bestand verifiziert.
**Betrifft:** `tools/faktenbasis-erzeugen.js`, `tools/ableitungen-build.js` (neu),
`package.json` (`ableitungen:build`), `tests/faktenbasis-ohne-suite.test.js`,
`tests/ableitungen-build.test.js`.

---

## Der Befund

`faktenbasis-erzeugen.js` maß bislang bei jedem Schreib-Lauf ohne `--check` die
Suite-Größe über einen echten, freistehenden `node --test`-Lauf — der einzige teure
Teil einer sonst sekundenschnellen Datei. Drei andere Trägerdateien
(`STANDARDS.md`/`docs/konformitaet-quellen.md` über `build-standzahlen.js`,
`docs/adr/README.md` über `adr-readme-erzeugen.js`, das SBOM über `sbom-pflegen.js`)
sind alle billig. Der vierte Träger blieb darum verlässlich der vergessene.

## Die Reparatur — zweiteilig

**1 · `faktenbasis-erzeugen.js` bekommt `--ohne-suite`.** Schreibt wie ohne Flag,
überspringt aber den ~50s-Lauf. Die Suite-Zahl wird dabei NICHT geraten und NICHT auf
Null gesetzt: die bestehende Zeile aus der aktuellen Ausgabedatei wird wörtlich
übernommen. Existiert die Datei noch nicht, oder trägt sie keine Suite-Zeile, bricht
der Lauf ab statt eine erfundene Zahl zu schreiben — ein erster Lauf braucht einmal
den echten, teuren Weg, jede Fortschreibung danach trägt die zuletzt gemessene Zahl
weiter.

**2 · `tools/ableitungen-build.js` (`npm run ableitungen:build`) — EIN Befehl für alle
vier.** Baut jeden der vier Träger, prüft DANACH ALLE VIER erneut — nicht nur die,
deren eigener Bau-Aufruf einen Fehler warf. Ein Träger, der von einem anderen abhängt,
darf nicht durchrutschen, nur weil sein eigener Bau-Schritt fehlerfrei zurückkam; der
Bau-Aufruf beweist, dass er lief, nicht, dass danach nichts mehr driftet.

**Was dieses Werkzeug ausdrücklich nicht ist:** kein Hook, der eine Drift selbst
repariert. `pre-commit`/`pre-push` rufen weiterhin nur die vier `--check`-Varianten
auf und melden rot — ein Gate, das den Mangel behebt statt ihn zu melden, verliert
seinen Zweck. `ableitungen:build` ist das Werkzeug, das ein Mensch vor dem Commit von
Hand ruft.

**Kleinigkeit mit größter Wirkung:** die `--check`-Drift-Meldung von
`faktenbasis-erzeugen.js` nannte bislang den teuren vollen Lauf als Behebungsweg —
obwohl `--check` die Suite-Zeile beim Vergleich ohnehin ausnimmt, der teure Lauf dort
also nichts behob, was `--ohne-suite` nicht auch behebt. Die Meldung nennt jetzt
`--ohne-suite`.

```yaml
konformitaet:
  - aussage: >-
      --ohne-suite übernimmt eine bestehende Suite-Zahl unverändert und mißt nicht neu
      (Laufzeit deutlich unter der eines echten Suite-Laufs).
    zustand: erfuellt
    herkunft: U2-ADR-358 (07.09.2026)
    pruefung:
      - tests/faktenbasis-ohne-suite.test.js
        "[Rot-Beweis] --ohne-suite übernimmt eine bestehende Suite-Zahl unverändert, misst nicht neu"

  - aussage: >-
      --ohne-suite bricht ab statt eine geratene Zahl zu schreiben, wenn die Ausgabedatei
      fehlt oder keine Suite-Zeile trägt.
    zustand: erfuellt
    herkunft: U2-ADR-358 (07.09.2026)
    pruefung:
      - tests/faktenbasis-ohne-suite.test.js
        "[Rot-Beweis Schwelle] --ohne-suite bricht ab, wenn die Ausgabedatei noch nicht existiert — keine geratene Zahl"
      - tests/faktenbasis-ohne-suite.test.js
        "[Rot-Beweis Schwelle] --ohne-suite bricht ab, wenn die Datei keine Suite-Zeile trägt — keine geratene Zahl"

  - aussage: >-
      Die --check-Drift-Meldung nennt den billigen Behebungsweg (--ohne-suite), nicht nur
      den teuren vollen Lauf.
    zustand: erfuellt
    herkunft: U2-ADR-358 (07.09.2026)
    pruefung:
      - tests/faktenbasis-ohne-suite.test.js
        "[Meldung] --check nennt den billigen Behebungsweg (--ohne-suite), nicht nur den teuren"

  - aussage: >-
      ableitungen:build wird rot, wenn ein Träger nach seinem eigenen Bau-Schritt weiterhin
      driftet — nicht nur, wenn der Bau-Aufruf selbst scheitert.
    zustand: erfuellt
    herkunft: U2-ADR-358 (07.09.2026)
    pruefung:
      - tests/ableitungen-build.test.js
        "[Rot-Beweis, der wichtigste] Bau lief fehlerfrei, aber der Träger driftet DANACH weiter — trotzdem rot"

  - aussage: >-
      ableitungen:build prüft nach dem Bau JEDEN der vier Träger erneut, nicht nur die mit
      Bau-Fehler.
    zustand: erfuellt
    herkunft: U2-ADR-358 (07.09.2026)
    pruefung:
      - tests/ableitungen-build.test.js
        "[Ausbeute] JEDER Schritt wird nach dem Bau erneut geprüft, nicht nur die gescheiterten"
```

## Verifikation gegen den echten Bestand

`npm run ableitungen:build` gegen den realen Bestand: ~10 s statt der ~50 s+, die
`faktenbasis-erzeugen.js` allein bislang brauchte — alle vier Träger aktuell gemeldet,
die geschriebene Suite-Zahl unverändert die zuletzt echt gemessene.
