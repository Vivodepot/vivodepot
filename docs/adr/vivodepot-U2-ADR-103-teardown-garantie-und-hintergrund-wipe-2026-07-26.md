# U2-ADR-103: Teardown-Garantie für Schlüsselmaterial und der Hintergrund-Wipe (Politik A)

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** SICHERHEIT, ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-097 (produkttragende Zusicherungen) · U2-ADR-098 (Klausel-Format) ·
U2-ADR-099 (Prüfstand) · U2-ADR-064 (Sub-Depots als Liste-Record)
**Anker:** Vollerhebung 26.07.2026, Rang-1-Posten „RAM-Wipe Sub-Depot-Schlüssel" ·
Report `ram-wipe-politik-a-report-2026-07-26.md` (read-only gegen `12132f1`)
**Status heute:** teilweise überholt durch U2-ADR-184 — die Politik-A-Zeitfrage (Teil 2: sofort
vs. mit 30-Minuten-Gnadenfrist) ist dort iteriert, siehe Nachtrag am Ende dieser Datei. Teil 1
(Teardown-Reihenfolge/-Vollständigkeit: `data` zuerst lösen, dann `sessionSubKeys`/`_ankerData`/
`_ankerAkteur`/`aktiverSubKontext` leeren) gilt unverändert — Beleg
`tests/teardown-schluesselmaterial.test.js`.

---

## Kontext

`_depotSpeicherZuruecksetzen()` trug die Zusage: *„Nach diesem Reset bleibt NICHTS
Wiederherstellbares im Speicher."* Gemessen am 26.07. gegen `12132f1` traf das auf
vier RAM-Halter nicht zu:

| Halter | Inhalt | vom Reset geleert? |
|---|---|---|
| `data`, Salts, `sessionHkdfKey`, `sitzungsAkteur` | Depot + KDF-Material | ja |
| **`sessionSubKeys`** | `Map: uuid → { schluessel: CryptoKey, inhalt }` | **nein** — `.clear()` kam im Kern **0×** vor |
| **`_ankerData`** | **Anker-Depot im Klartext**, solange ein Sub-Kontext offen war | **nein** |
| **`_ankerAkteur`** | Anker-Akteur | **nein** |
| **`aktiverSubKontext`** | depotUUID | **nein** |

Zur Lücke gab es **keine Notiz** — sie war nicht bewusst offengelassen, sondern
übersehen. (Die dokumentierte Lücke an derselben Funktion betrifft den **DOM**-Teil
und wurde am 20.07. geschlossen; das ist eine andere.)

**Die Reihenfolge ist tragend.** `subKontextBetreten` setzt `data = sess.inhalt` —
**dasselbe Objekt**. Ein `sessionSubKeys.clear()` allein entfernt nur die
Map-Referenz; solange `data` oder `_ankerData` darauf zeigen, bleibt der Klartext
erreichbar. Erst `data` lösen, dann leeren.

Zweitens: **kein Verlassen-Pfad rief den Reset beim Hintergrundwechsel.**
`event.persisted` / bfcache-Erkennung: 0 Treffer — die App konnte Parken nicht von
Schließen unterscheiden. Ein Depot blieb mit Schlüsseln und Klartext im RAM, während
die Bürgerin in einer anderen App war.

## Entscheidung

**1 — Die Teardown-Garantie wird eingelöst.** `_depotSpeicherZuruecksetzen()` löst
zuerst `data`, leert dann `sessionSubKeys` und nullt `_ankerData`, `_ankerAkteur`,
`aktiverSubKontext`. Nicht über `subKontextVerlassen()`: das ist `async` und
versiegelt neu — auf einem Verlassen-Weg soll nichts mehr geschrieben werden.

**2 — Politik A für den Hintergrundwechsel.** Träger ist `visibilitychange → hidden`
(auf iOS der zuverlässigste Hintergrund-Melder), `pagehide` als redundanter zweiter
Auslöser.

- `_ungespeicherteAenderungen === 0` → **vollständiger Reset.** Rückkehr verlangt das Passwort.
- offene Änderungen → **kein Wipe.**

**Der zweite Fall ist die benannte Rest-Exposition, nicht ein Versehen.** `data` ist
die **einzige Kopie**: der Autosave schreibt nur RAM, auf Platte liegt erst etwas nach
ausdrücklichem Sichern. Ein Wipe bei offener Arbeit wäre schlimmer als das Leck, das
er schließt.

**3 — Der Zähler wird zur belastbaren Größe (A1).** Politik A hängt an
`_ungespeicherteAenderungen`; der Zähler übersah die zentralen Schreibwege.
`markiereUngespeichert(1)` wird gezogen in `sektorFeldSetzen`, `situationFeldSetzen`
**und in den drei Listen-Schreibern** `listenEintragHinzufuegen`,
`listenEintragAktualisieren`, `listenEintragEntfernen`.

Die drei Listen-Funktionen standen **nicht** im ursprünglichen Bau-Auftrag. Sie kamen
durch die vierte Probe hinzu: `wizardSchrittSetzen` schreibt je nach Wizard-Ziel über
`sektorFeldSetzen`, `situationFeldSetzen` **oder** durch die Listen-Schreiber — und
kiwiz ist ein Listen-Ziel. Mit nur den zwei Settern wäre die Zusage „Wizard-Eingaben
zählen" für Listen-Wizards **falsch geblieben**, und Politik A hätte dort weiter
Eingaben vernichtet.

Sicher gegen Über-Markieren: alle fünf Funktionen rufen `urheberschaftAnhaengen`
**vor** der Mutation und werfen ohne Akteur — reine Nutzer-Edit-Pfade, kein stiller
Lade- oder Migrationsweg. Doppelzählung mit `bearbeitungSpeichern` ist harmlos: der
Zähler wird nur gegen `> 0` geprüft.

A1 behebt zugleich einen Live-Fehler unabhängig vom Wipe: Sicherungs-Warnung und
Save-Status zeigten während einer Wizard-Eingabe „nichts zu sichern".

## Konsequenzen

Ein Depot im Hintergrund ist ohne offene Arbeit **kalt** — Schlüssel und Klartext
sind weg, die Rückkehr kostet das Passwort. Das ist ein bewusster UX-Preis.

Bei offener Arbeit bleibt alles im RAM. Das ist die eine Stelle, an der die Zusage
enger gilt als ihr Wortlaut — deshalb steht sie hier und im Kommentar an der Funktion.

Ungemessen: ob `visibilitychange → hidden` in der installierten PWA so zuverlässig
feuert wie im Safari-Tab. Das braucht das Gerät.

## Konformität

```konformitaet
aussage:  Nach `_depotSpeicherZuruecksetzen()` steht kein Schlüsselmaterial und kein
          Klartext mehr im Speicher — weder in `sessionSubKeys` noch in `_ankerData`
          noch im aktiven Sub-Kontext.
zustand:  geprüft
herkunft: invariante
pruefung: tests/teardown-schluesselmaterial.test.js#u2-103-reset-laesst-kein-schluesselmaterial-stehen
```

```konformitaet
aussage:  Wechselt die App in den Hintergrund und ist nichts Ungespeichertes offen,
          wird vollständig gewipt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/teardown-schluesselmaterial.test.js#u2-103-hintergrund-wipt-ohne-offene-aenderungen
```

```konformitaet
aussage:  Sind Änderungen offen, wird beim Hintergrundwechsel NICHT gewipt — `data`
          ist die einzige Kopie, Datenverlust wiegt schwerer als die Rest-Exposition.
zustand:  geprüft
herkunft: invariante
pruefung: tests/teardown-schluesselmaterial.test.js#u2-103-hintergrund-wipt-nicht-bei-offenen-aenderungen
```

```konformitaet
aussage:  Eine Wizard-Eingabe erhöht den Zähler der ungespeicherten Änderungen — auch
          bei Wizards mit Listen-Ziel. Ohne diese Klausel wäre die vorige vakuum-grün,
          weil der Zustand „offene Änderungen" im Wizard nie einträte.
zustand:  geprüft
herkunft: invariante
pruefung: tests/teardown-schluesselmaterial.test.js#u2-103-wizard-eingabe-zaehlt-als-ungespeichert
```

---

## Nachtrag (31.08.2026) — Berichtigung + teilweise überholt durch U2-ADR-184

**Berichtigung.** Der Kontext-Absatz oben behauptet: „Die dokumentierte Lücke an derselben
Funktion betrifft den DOM-Teil und wurde am 20.07. geschlossen; das ist eine andere." Das stimmte
für die Verlassen-Wege, die am 20.07.2026 (Commit `e7deb69`) bereits existierten
(`geheZuZuhause()` u. a.) — der Hintergrund-Wipe selbst existierte zu diesem Zeitpunkt noch
NICHT, er kam erst sechs Tage später mit diesem ADR. Die Schließung vom 20.07. lag in
`renderWelcome()`s eigenem Wächter (`if (data && !imVorschau())`), der NUR dann aufräumt, wenn
`data` beim Aufruf noch gesetzt ist. `_hintergrundWipeVielleicht()` (Teil 2 dieses ADRs) null
`data` jedoch SELBST, bevor es `renderWelcome()` ruft — der Wächter fand sich seit dem Tag seiner
eigenen Einführung für „nichts zu tun" zuständig, unbemerkt. Gemessen am 31.08.2026:
`#content.innerHTML` vor und nach einem Hintergrund-Wipe war byte-identisch (17548 Zeichen). Der
Satz oben war also nie falsch für das, was er meinte — er hat nur nie erfasst, dass Politik A
einen neuen Weg zum Eingangsschirm einführte, der dieselbe Garantie stillschweigend voraussetzte,
ohne sie zu tragen.

**Teilweise überholt.** U2-ADR-184 iteriert Teil 2 dieses ADRs: statt eines sofortigen Wipes bei
`visibilitychange → hidden` gilt jetzt eine 30-Minuten-Gnadenfrist (Produktabwägung: „Oma Erna,
die rumläuft ... genervt, wenn sie aller 5 Minuten das PW eingeben muss" gegen die
Rest-Exposition). `pagehide` bleibt unverändert sofortiger, unbedingter Auslöser ohne Frist.
U2-ADR-184 trägt zusätzlich eine Bildschirm-Zusicherung, die dieses ADR nie hatte. Teil 1 dieses
ADRs (Teardown-Reihenfolge und -Vollständigkeit) bleibt unverändert in Kraft — dafür ist dieses
ADR weiterhin die geltende Quelle.

**Namentlich betroffen ist die zweite Konformitäts-Klausel oben** („Wechselt die App in den
Hintergrund und ist nichts Ungespeichertes offen, wird vollständig gewipt.",
`u2-103-hintergrund-wipt-ohne-offene-aenderungen`) — sie beschreibt weiterhin korrekt, WAS beim
Wipe passiert, aber nicht mehr WANN: „wird vollständig gewipt" gilt seit U2-ADR-184 erst nach der
30-Minuten-Frist, nicht mehr sofort bei `hidden`. Die zugehörige Probe
(`tests/teardown-schluesselmaterial.test.js#u2-103-hintergrund-wipt-ohne-offene-aenderungen`) ruft
weiterhin direkt `_hintergrundWipeVielleicht()` auf (den tatsächlichen Wipe-Vollzug, unverändert)
und bleibt darum wahr — sie prüft nicht (und behauptete nie), WANN dieser Aufruf im Produkt
erfolgt. Die WANN-Frage trägt jetzt U2-ADR-184, dritte Konformitäts-Klausel dort.

*Entschieden: 31.08.2026.*

---

*Vivodepot GmbH · Berlin · 26.07.2026*
