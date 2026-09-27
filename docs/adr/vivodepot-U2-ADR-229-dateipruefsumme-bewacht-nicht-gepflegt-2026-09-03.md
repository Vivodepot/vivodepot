# U2-ADR-229: Die Prüfsumme der ausgelieferten Datei wird bewacht, nicht gepflegt

**Status:** Angenommen
**Datum:** 03.09.2026
**Kategorie:** SICHERHEIT, WÄCHTER
**Linie:** U2
**U2-Bezug:** U2-ADR-215 (eine Quelle für den ausgelieferten Dateisatz — hier der Anlass-Geber
für den Hook, nicht die Prüfbedingung selbst) · U2-ADR-227 (derselbe Verwandlungsschritt an
benachbarter Stelle: aus einer Handdisziplin wird eine mechanische Garantie) · v1-Dokumente-Audit
(Auftrag, 03.09.2026, sechs Fragen zur Repo-Dokumenten-Lage vor v1).
**Anker:** Befund aus dem v1-Dokumente-Audit (Frage 3, README.md): der eingecheckte Wert in
`vivodepot.html.sha256` stimmt nicht mit dem tatsächlichen SHA-256 von `vivodepot.html` überein —
trotz einer über Dutzende ADRs (Mai bis August 2026) dokumentierten Disziplin, ihn nach jeder
Änderung „nachzuziehen". Nachgemessen (`git log`): der letzte echte Nachzug war Commit `78e37824`
(19.08.2026); danach haben 239 Commits `vivodepot.html` inhaltlich verändert, keiner die
Prüfsumme.
**Status heute:** gilt — Beleg `tests/build-dateipruefsumme.test.js`.

---

## Warum ein eigenes ADR, nicht nur eine Werkzeug-Änderung

Meine eigene Einschätzung, vor dem Schreiben gebildet: **ja, ein eigenes
ADR — nicht nur ein neues Werkzeug im Repo.** Zwei Gründe:

Erstens derselbe Grund, der U2-ADR-215 und U2-ADR-227 trägt: **eine Handdisziplin, die über
Monate hielt und dann lautlos brach, ist selbst die Entscheidung wert**, nicht nur ihre Reparatur.
15 Tage und 239 Gelegenheiten sind eine Aussage über den Mechanismus (kein Skript erzeugte die
Prüfsumme, kein Test las sie, kein Workflow kannte sie), nicht über einen einzelnen vergessenen
Handgriff.

Zweitens die Einbahnstraßen-Erwägung aus demselben Muster wie U2-ADR-227: `vivodepot.html.sha256`
ist laut README.md und `docs/pruefebene.md` der einzige Weg, mit dem jemand **ohne Netz und ohne
Zertifikat** prüft, ob die eigene Datei die echte ist. Ein Nachweisweg, der nach außen wirkt und
niemand mehr innen prüft, ist genau die Klasse Entscheidung, die eine Aufzeichnung verdient statt
nur einen Commit — und ohne diese ADR wäre der neue Wächter der 127. Eintrag im heutigen
ADR-Bestand ohne jede Konformitäts-Klausel (v1-Dokumente-Audit, Frage 1: 126 von 219 ohne
Klausel).

## Kontext

`vivodepot.html` trägt heute zwei unabhängige Integritätsmechanismen, mit unterschiedlichem
Zweck und unterschiedlichem Bewachungsgrad:

1. **Der VdCrypto-Block-Pin** (`tools/krypto-block-propagation-pruefen.js`) — sichert, dass der
   Krypto-Codeblock zwischen den vier HTML-Anwendungsschalen nicht auseinanderläuft. Wird bei
   jedem Lauf frisch aus `vivodepot-krypto-kern-PORT-VERBATIM.js` berechnet, nicht aus einem
   gespeicherten Wert gelesen — bereits ausgereift bewacht, nicht Gegenstand dieses ADR.
2. **`vivodepot.html.sha256`** — eine statische, von Hand geschriebene Datei, die den SHA-256 der
   GANZEN `vivodepot.html` festhält. Anders als der Block-Pin: kein Skript erzeugte sie (`grep`
   über `tools/`, `scripts/`, `tests/`, `.github/`: null Treffer außer der neuen Werkzeuge dieses
   ADR), kein Test las sie zurück, keine CI-Stufe kannte sie. Nur ADR-Prosa („nachgezogen")
   dokumentierte den Vorgang — ohne dass etwas ihn erzwang.

**Enger Zuschnitt, entschieden:** Dieses ADR bewacht ausschließlich `vivodepot.html`.
Maßgeblich ist, was ein Mensch **von Hand** ohne Netz und Zertifikat prüfen will — die Datei, die
die Bürgerin tatsächlich in der Hand hat. `sw.js` und `manifest.webmanifest` sind Infrastruktur,
die niemand von Hand nachrechnet, und tragen heute ohnehin keine eigene Ganzdatei-Prüfsumme.
`vivodepot-lesen.html` ist der Grenzfall — ausgeliefert, prüfbar, aber eine zweite veröffentlichte
Prüfsumme wäre eine neue Zusage, die dauerhaft gepflegt werden muss. Diese Frage liegt
ausdrücklich als offen vor; dieses ADR baut ohne eine Antwort darauf.

## Entscheidung

**1 — `tools/build-dateipruefsumme.js`, ein Paar wie überall sonst im Repo** (vgl.
`sbom-pflegen.js`, `build-standzahlen.js`): kein Flag schreibt die Prüfsumme, `--check` prüft sie
und schreibt nie. `--html <pfad>` lenkt nur die gehashte Seite um — `vivodepot.html.sha256` bleibt
in jedem Lauf die echte, unveränderte Datei (dieselbe Fixturen-Konvention wie `sbom-pflegen.js
--html`).

**2 — Direkter Vergleich, nicht über `schalen-lockstep-kern.js`s Änderungserkennung.** Der
Wächter berechnet den SHA-256 von `vivodepot.html` bei JEDEM Lauf frisch aus den rohen Bytes und
vergleicht ihn direkt gegen den eingecheckten Wert — unabhängig davon, ob `istSchaleInhaltlich()`
eine inhaltliche Änderung meldet. `schalen-lockstep-kern.js` bleibt der richtige **Anlass** (läuft
bei jedem Commit/Push, `hooks/pre-commit`), ist aber bewusst nicht die **Bedingung**: seine
Änderungserkennung nimmt die `SCHALEN_STAND`-Stempelzeile ausdrücklich aus dem Vergleich aus — für
eine Ganzdatei-Prüfsumme zählt aber jedes Byte, auch diese Zeile. Ein Wächter, der über die
Änderungserkennung liefe, erbte diesen blinden Fleck.

**3 — Kein stilles Nachziehen.** `--check` schreibt unter keinen Umständen — belegt durch einen
eigenen Test (`tests/build-dateipruefsumme.test.js`). Der Hook meldet nur; wer die Prüfsumme
ändert, ruft den Erzeuger bewusst auf. Eine Prüfsumme, die sich bei jedem Commit selbst korrigiert,
ist immer richtig und darum keine Aussage mehr.

**4 — `hooks/pre-commit`**, neuer Block direkt nach dem SBOM-Gate, identische Form
(`npm run --silent dateipruefsumme:check`, Abbruch + Abhilfe-Hinweis `npm run
dateipruefsumme:build`).

**5 — Registrierung in `tools/waechter-register.js`** (`W-dateipruefsumme-drift`), mit Positiv-
und Negativbeispiel — dieselbe Bauart wie `W-sbom-drift`: die echte `vivodepot.html` mit einem
angehängten Leerzeichen erzeugt DRIFT, die echte Datei unverändert bleibt grün.

**6 — Rot-Beweis:** ein einziges gekipptes Byte in einer Dateikopie lässt `--check` mit Exit 1
abbrechen (`tests/build-dateipruefsumme.test.js`), zusätzlich über die Register-Fixtur bestätigt
(`node tools/waechter-selbsttest.js`).

**7 — Die Prüfsumme neu erzeugt:** `8133c9ee5041da7959a96db99ffbfd377141ddacd3f0c285e03a086b10f79821`
(vorher eingecheckt: `e63d21690a07953f11f6f38450a6db6407a5f89b399f84a4cbd435e870383d7d`).

## Ausdrücklich nicht behandelt

**Keine zweite Prüfsumme für `vivodepot-lesen.html`.** Grenzfall, Entscheidung, s. o.

**Keine Änderung am VdCrypto-Block-Pin.** Anderer Gegenstand, anderer Zweck, bereits eigenständig
und gründlich bewacht (`tools/krypto-block-propagation-pruefen.js`) — dieses ADR berührt ihn
nicht.

**Kein neuer Mechanismus für `sw.js`/`manifest.webmanifest`.** Sie tragen heute keine eigene
Ganzdatei-Prüfsumme und keine ADR verlangt eine; eine Erweiterung wäre ein eigener, künftiger
Auftrag.

## Konsequenzen

Der einzige Weg, mit dem jemand ohne Netz und ohne Zertifikat die Echtheit der ausgelieferten
`vivodepot.html` prüft, steht jetzt unter derselben mechanischen Garantie wie der VdCrypto-Block
und die Signierfunktion (U2-ADR-227): nicht nur beschrieben als aktuell, sondern bei jedem Commit
erzwungen. Ein künftiger Bruch — sei es durch eine vergessene Zeile oder einen stillen
Merge-Konflikt — fällt beim nächsten Commit auf, nicht erst nach Wochen und einer gezielten Suche.

## Konformität

```konformitaet
aussage:  vivodepot.html.sha256 stimmt mit dem tatsächlichen SHA-256 von vivodepot.html überein —
          geprüft bei jedem Commit, nicht nur einmalig, und direkt aus den rohen Bytes berechnet,
          nicht über eine abgeleitete Änderungserkennung.
zustand:  geprüft
herkunft: invariante
pruefung: tests/build-dateipruefsumme.test.js#[Dateiprüfsumme] echte vivodepot.html + echte vivodepot.html.sha256: keine Drift (Positivkontrolle des Ist-Zustands)
```

```konformitaet
aussage:  Ein einziges verändertes Byte in vivodepot.html lässt den Wächter mit Exit 1 abbrechen —
          Rotmachbarkeit belegt, nicht nur behauptet. Der Wächter schreibt dabei nie von sich aus,
          auch nicht im Fehlerfall.
zustand:  geprüft
herkunft: invariante
pruefung: tests/build-dateipruefsumme.test.js#[Dateiprüfsumme] Rotmachbarkeit — ein geändertes Byte in der Kopie lässt --check mit Exit 1 abbrechen
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
