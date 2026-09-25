# U2-ADR-251 · Ereignis-Achse wird andockbar — das zehnte Einlass-Register

**Datum:** 04.09.2026
**Status:** gebaut, Suite grün (Kern-Register + Browser-Beweis), Paket 2b des Gerüst-Umbaus
**Status heute:** gilt
**Bezug:** U2-ADR-250 (Assistenten andockbar, das strukturelle Vorbild) ·
`tests/wizards-modul-andockbar.test.js` (wörtliches Vorbild) ·
`tests/ereignis-achse-modul-andockbar.test.js` (Rot-Beweis dieses ADRs) ·
`tests/e2e/ereignis-achse-geburt-browser-beweis.spec.js` (Browser-Beweis, Auflage 3)

---

## 1 · Kontext

Dritter Spiegel derselben Fähigkeit nach U2-ADR-246 (Situation) und U2-ADR-250 (Assistent).
`EREIGNIS_ACHSE_FELDER` — die Liste, die festlegt, welche Sektor-/Situationsfelder auf
familienstand/tod/betreuung/geburt reagieren — war vollständig hartcodiert, kein
Registry-Gegenstück existierte. Gemessen (Session `-a2`, 04.09.2026, direkt am Kern): vier
echte Aufrufstellen (`_ereignisArtenFuerUnterfeld`, `ereignisBetreuungsbeginnMarkieren`,
`ereignisGeburtMarkieren`, `_ereignisAchseEintragFuer`) laufen bei ECHTER Bürger-Nutzung, nicht
nur beim Laden — würde `EREIGNIS_ACHSE_FELDER` durch einen künftigen Umbau geleert, fänden alle
vier zur Laufzeit nichts mehr: ein stiller Ausfall, kein Ladefehler.

---

## 2 · Entscheidung

Wörtlicher Spiegel von U2-ADR-250: Registry (`_EREIGNIS_ACHSE_MODUL_REGISTRY`) → Prüfer
(`ereignisAchseModulPruefen`) → Anmeldung (`_ereignisAchseModuleAusDepotAnmelden`) → Merge
(`ereignisAchseFelderAlle()`) → zehntes `EINLASS_REGISTER`. Kollisionsverhalten wörtlich
übernommen: erstes Modul gewinnt, zweites wird namentlich als `doppelt` verworfen.

**Ein neuer Depot-Slot** (Schema 77 → 78, additiv): `data.ereignisAchseModule[]`. Kein zweiter
Slot — ein Eintrag trägt nie externen Vorlagen-Inhalt.

---

## 3 · Zwei Stücke ohne Vorbild bei Bereich/Situation/Assistent

**Kein natürliches Einzel-Schlüssel-Feld.** Ein Eintrag ist über das Tripel
`sektorId.feldId.unterFeldId` identifiziert, nie über eine einzelne ID — dieselbe Form, die
`EREIGNIS_ACHSE_FELDER` selbst nativ trägt (eine Liste, kein Objekt). Ein Modul liefert darum
`eintraege: [...]` als ARRAY, nicht `{<id>: {...}}` wie bei den anderen drei Registern. Weil ein
Array — anders als ein Objektliteral — doppelte Tripel nicht strukturell ausschließt (dieselbe
Lücke, die A484 für Bereiche mit dem Wechsel auf ein Objekt schloss), prüft
`ereignisAchseModulPruefen` Duplikate INNERHALB eines Moduls ausdrücklich selbst
(`grund:'doppelt-im-modul'`) — die Registry-Ebene bleibt zusätzlich zuständig für Duplikate
ZWISCHEN Modulen (`grund:'doppelt'`).

**Keine Sprachpflicht.** Ein Eintrag trägt nie menschenlesbaren Text — `sektorId`/`feldId`/
`unterFeldId` sind interne Schlüssel, `ereignisse` kommt aus dem geschlossenen Katalog
`EREIGNIS_ARTEN`, `ausgenommen` ist eine interne Begründung, nie eine Bürgerin-Anzeige.
`_modulTraegtBeschriftung` braucht darum keinen neuen Zweig — geprüft, nicht angenommen (Probe
„[Sprache]" in der Testdatei).

`sektorId` referenziert nicht nur Sektoren, sondern auch zwei Situationen (`geburt`, `erbfall`)
— nativ schon so (gemessen: 33 Einträge, elf verschiedene `sektorId`-Werte, zwei davon
Situations-IDs). `_ereignisAchseZielAufloesbar` prüft darum gegen `SEKTOR_BY_ID` UND
`SITUATION_BY_ID`, wörtlicher Spiegel der `ziel`-Auflösung bei Assistenten.

**Bewusst nicht repliziert:** zwei native Zusatzfelder ohne allgemeinen Vertrag —
`instrumentTyp` (ein einzelner Eintrag) und `situationsfeld` (ein reiner Lese-Marker, von
keinem der vier Aufrufer ausgewertet, gemessen). Ein angedockter Eintrag trägt sie nicht.

---

## 4 · Auflage 3 — der Browser-Beweis, nicht nur die Funktion

**Wörtlich:** „Eine Probe, die nur die Funktion aufruft, würde genau den stillen Ausfall nicht
sehen, den Du gefunden hast. Beweise es im Browser, Ende zu Ende: eine Bürgerin trägt eine
Geburt ein, die Ereignis-Achse greift — vorher wie nachher."

**Umgesetzt in `tests/e2e/ereignis-achse-geburt-browser-beweis.spec.js`:** echter Klickweg
(Assistent `gebwiz`, wörtlich derselbe Weg wie `gebwiz-kind-abnahme.spec.js`, Zug 4,
11.08.2026) bis zum echten Abschluss. Vorbedingung (ein Testament-Vorsorge-Instrument mit
befülltem `testament_bedachte`) über denselben direkten Datenweg gesetzt, den auch andere
Specs in diesem Verzeichnis nutzen (`listenEintragHinzufuegen`, die echte Funktion, kein
Mock) — das Anlegen eines Listen-Eintrags selbst ist eine andere, andernorts geprüfte
Fähigkeit, nicht Gegenstand dieser Probe.

**Vorher/nachher explizit beide geprüft**, nicht nur der Endzustand: vor dem Assistenten trägt
kein Dokument der Testament-Zeile einen `geburt`-Ereignis-Anlass, danach genau eines.

**Rot-Beweis erbracht, nicht nur behauptet:** der echte Aufruf
(`if (ergebnis) ereignisGeburtMarkieren(new Date());`, `vivodepot.html`) wurde testweise
neutralisiert (`if (false && ergebnis) …`), die Probe lief ROT
(„Expected: 1, Received: 0"), danach sofort zurückgenommen und erneut GRÜN bestätigt — genau
die Bauart, die diese Nacht durchgängig verlangt wurde: Rot sehen, nicht nur Grün annehmen.

---

## 5 · Bewusst nicht Teil dieses Pakets

Kein bestehender Aufrufer liest bereits `ereignisAchseFelderAlle()` statt des rohen
`EREIGNIS_ACHSE_FELDER`-Arrays — dieselbe Zurückhaltung wie bei U2-ADR-246/U2-ADR-250: bewiesen
an einem künstlichen Test-Modul, die 33 eingebauten Einträge bleiben vollständig nativ. Das
Umstellen der vier echten Aufrufer auf den docking-fähigen Weg ist Teil des großen Umzugs
(Gerüst-Umbau Paket 3), nicht dieser Fähigkeits-Probe. Der Browser-Beweis oben prüft darum
bewusst NICHT die neue Docking-Fähigkeit, sondern dass die vier bestehenden Aufrufstellen die
native Kette unverändert überleben.

---

## 6 · Rot-Beweis (Kern)

Neue Testdatei `tests/ereignis-achse-modul-andockbar.test.js` (13 Proben): Register,
Migrationsstufe, Prüfer (unauflösbare sektorId, sektorId über Situation, kein moduleVersion/
Herkunft/eintraege, unbekannte Ereignis-Art, `ausgenommen`-Form, Duplikat IM Modul,
Sprachpflicht-Abwesenheit), Anmeldung (wirkt, Kollision, Entfernen-und-Rückkehr), Gegenprobe
(Sektoren/Situationen/Assistenten unberührt).

Eigener Wächter (Paket 0) nachgezogen: `PAKET0_BEKANNTE_ADDITIVE_SCHLUESSEL` trägt
`ereignisAchseModule` (Schema 78).

Vollsuite `npm test` plus `tests/e2e/ereignis-achse-geburt-browser-beweis.spec.js`: s.
Commit-Text für den gemessenen Stand.

---

*Vivodepot GmbH · Berlin · 04.09.2026*
