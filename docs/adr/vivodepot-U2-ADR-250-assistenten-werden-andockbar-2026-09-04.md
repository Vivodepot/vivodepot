# U2-ADR-250 · Assistenten werden andockbar — das neunte Einlass-Register

**Datum:** 04.09.2026
**Status:** gebaut, Suite grün (Kern-Register), E2E nicht Teil dieses Pakets
**Status heute:** gilt
**Bezug:** U2-ADR-246 (Situationen andockbar, das strukturelle Vorbild) ·
`tests/situations-modul-andockbar.test.js` (wörtliches Vorbild) ·
`tests/wizards-modul-andockbar.test.js` (Rot-Beweis dieses ADRs)

---

## 1 · Kontext

Nach der Landung von U2-ADR-246 (Situationen andockbar) maß Session `-a2` gezielt, ob
`WIZARDS`/`EREIGNIS_ACHSE_FELDER` dieselbe Fähigkeit bereits ungeprüft mitbekommen hatten — der
Gerüst-Umbau-Konzept-Text hatte diese Prüfung selbst als „erster Schritt des Pakets" verlangt,
nicht als Annahme. Ergebnis, gemessen am gelandeten Kern: **nein.** `WIZARD_BY_ID`
(`vivodepot.html`) war ein `const`, einmalig aus dem rohen `WIZARDS`-Array gebaut — keine Registry,
keine Neuzuweisung analog `SEKTOR_BY_ID`/`SITUATION_BY_ID`. Die Formulierung „Paket 3 ist frei" traf damit nur auf die Sektoren-/Situationen-Hälfte zu, nicht auf Assistenten/
Ereignis-Achse — die Korrektur wurde bestätigt, Paket 2a (dieser ADR) und Paket 2b
(Ereignis-Achse, eigener Bau) getrennt freigegeben, Paket 3 selbst weiterhin nicht.

Dieser ADR trägt allein **Paket 2a — Assistenten.**

---

## 2 · Entscheidung

**Wörtlicher Spiegel von U2-ADR-246**, wie ausdrücklich verlangt („spiegle Paket 1,
erfinde nichts"): Registry (`_WIZARDS_MODUL_REGISTRY`, `let`) → Prüfer (`wizardsModulPruefen`) →
Anmeldung (`_wizardsModuleAusDepotAnmelden`) → Merge (`wizardsAlle()`, native.concat(Registry)) →
Index-Neubau (`_wizardIndexNeuBauen`, `WIZARD_BY_ID` von `const` auf `let` umgestellt) →
Einlass-Register-Eintrag (`typ:'wizard', slot:'wizardsModule'`, das neunte Register). Ein Modul
liefert `{modulTyp:'wizard', moduleVersion, herkunft, sprache, wizards:{id: {icon, titel,
einleitung, ziel, schritte, abschluss}}}`. Kollisionsverhalten wörtlich übernommen: erstes Modul
gewinnt, das zweite wird namentlich als `doppelt` verworfen (`WIZARDS_MODUL_VERWORFEN`) — keine
strengere Regel als bei Bereichen/Situationen erfunden (Auflage 1 der Freigabe).

**Ein neuer Depot-Slot** (Schema 76 → 77, additiv & rückwärts-tolerant wie jede vorherige Stufe):
`data.wizardsModule[]`. **Kein zweiter Slot** — anders als bei Situationen
(`situationFeldDefinitionen`) gibt es keine externe Vorlagen-Übersetzung eigener Felder, s. u.

**Erlaubnisliste bleibt geschlossen** (Auflage 2 der Freigabe): `WIZARD_MODUL_SCHLUESSEL` prüft
„genau diese", nicht „mindestens diese" — jeder unbekannte Top-Level-Schlüssel eines eingereichten
Moduls wird benannt verworfen, exakt wie bei `BEREICH_MODUL_SCHLUESSEL`/`SITUATION_MODUL_SCHLUESSEL`.

---

## 3 · Ein Stück ohne Situations-Vorbild — `ziel` wird aufgelöst

Ein Assistent schreibt seinen gesammelten Wert unter `ziel.sektor`/`ziel.situation`. Ein Modul,
dessen `ziel` nirgends existiert (weder nativ noch angedockt), wird benannt verworfen
(`grund:'ziel'`) — `_wizardZielAufloesbar()` prüft gegen `SEKTOR_BY_ID`/`SITUATION_BY_ID`, die
beide bereits heute identisch auflösen, ob nativ oder angedockt (Gegenbefund `-67`, 03.09.2026,
Konzept-Bericht Abschnitt GEMESSEN Punkt 2) — keine neue Auflösungs-Logik, nur genutzt.

---

## 4 · Ein Stück bewusst anders als bei Situationen — Grund daneben, nicht stillschweigend

Ein Assistenten-Schritt trägt sein Feld **immer inline** (`schritte[].feld = {id,typ,label,…}`) —
nativ wie angedockt dieselbe Form (gemessen: alle sieben eingebauten Assistenten tragen
ausschließlich inline Felder, keine `{quelle,feld}`-Referenz-Schritte). Situationen verbieten ein
inline `{feld:{…}}` in angedockten `bloecke` — eigene Felder müssen dort über den signierten
Vorlagen-Weg entstehen (U2-ADR-246 §2, Punkt 2), weil ein Situations-Block ein **geteilter
Katalog** ist: jede Betrachterin einer Situation sieht dieselben Blöcke, ein unsigniertes Modul
dürfte diesen Katalog nicht unbeaufsichtigt erweitern.

Ein Assistenten-Schritt ist das nicht. Er ist ausschließlich die Frage-Vorschau **dieses einen
Assistenten** — er speist keinen geteilten Katalog, den eine andere Ansicht später unbeaufsichtigt
mitliest. Der geschriebene Wert landet unbedingt unter `ziel.sektor`/`ziel.situation` (A317, „der
Namensraum ist weiter als der Katalog" — dieselbe, bereits dokumentierte Charakteristik wie bei
Situationen, dort dokumentiert statt gesperrt, hier identisch). Die Situationen-Beschränkung
schützt vor unsignierter Katalog-Erweiterung; dieser Schutzgegenstand existiert bei einem
Assistenten-Schritt nicht — darum gilt die Beschränkung hier nicht, und ein inline `feld` ist in
einem angedockten Assistenten-Schritt erlaubt.

**Diese Einordnung ist eine eigenständige Erwägung dieses Baus, keine reine Wiederholung** — im
Zweifel zu prüfen, falls sich die Prämisse (kein geteilter Katalog) je ändert.

---

## 5 · Bewusst nicht Teil dieses Pakets

**Kein bestehender Aufrufer liest bereits `wizardsAlle()`/den neu zuweisbaren `WIZARD_BY_ID`.**
`wizardStartHTML`/`wizardStartListeHTML` u. a. lesen weiterhin das rohe `WIZARDS`-Array — dieselbe
Zurückhaltung wie bei U2-ADR-246: bewiesen an einem künstlichen Test-Modul
(`tests/wizards-modul-andockbar.test.js`), die sieben eingebauten Assistenten bleiben zu diesem
Zeitpunkt vollständig nativ und unangetastet. Das Umstellen der echten Aufrufer auf den
docking-fähigen Weg ist Teil des großen Umzugs (Gerüst-Umbau Paket 3), nicht dieser
Fähigkeits-Probe — exakt der Zuschnitt, den Paket 1 selbst vorgegeben hat.

**Kein Rot-Beweis im Browser.** Kein bestehender Aufrufer wurde umgestellt, also gibt es (anders
als bei Paket 2b, Ereignis-Achse) keine Stelle, an der ein stiller Laufzeit-Ausfall überhaupt
entstehen könnte — die Registry-Mechanik selbst ist mit Einheiten-Proben vollständig bewiesen.

---

## 6 · Rot-Beweis

Neue Testdatei `tests/wizards-modul-andockbar.test.js` (13 Proben): Register-Eintrag,
Migrationsstufe (Slot-Anlage, keine Umschreibung), Prüfer (reservierte ID, leeres Modul, Titel
fehlt, unauflösbares Ziel, Ziel über `sektor` UND über `situation`, Schritt ohne Feld/Frage,
Sprachpflicht), Anmeldung (Registrierung wirkt, Modul-vs-Modul-Kollision, Gegenprobe
Entfernen-und-Rückkehr), Gegenprobe (Sektoren/Situationen bleiben unberührt).

**Ein echter Fund beim Bauen, gefangen vor dem Commit:** `_modulTraegtBeschriftung` (entscheidet,
ob ein Modul eine `sprache`-Pflicht trägt) kannte den `situationen`-Fall aus U2-ADR-246, aber
keinen `wizards`-Fall. Ohne Ergänzung hätte ein `wizard`-Modul mit `titel`-tragenden Einträgen
OHNE Sprachangabe durchgehen können — dieselbe Lücke, die U2-ADR-246 selbst am `situationen`-Fall
fand und schloss, hier am neunten Register wiederholt. Ergänzt: ein `wizards`-Zweig, wörtlicher
Spiegel des `situationen`-Zweigs. Eigene Probe „[Sprache]" beweist es.

**Zwei bestehende Wächter außerhalb der neuen Testdatei ergänzt, nicht umgangen:**
`PAKET0_BEKANNTE_ADDITIVE_SCHLUESSEL` (`tests/paket0-migrationsbeleg-referenzdepot.test.js`,
U2-ADR-250-Nachtrag, eigener Wächter dieser Session) und `VOLLEXPORT_STRUKTURELL_SCHLUESSEL`
(`vivodepot.html`, derselbe Wächter, der U2-ADR-246 bereits einmal richtig anschlug) — beide
kannten `wizardsModule` nicht, beide jetzt ergänzt, keiner aufgeweicht.

Vollsuite `npm test`: s. Commit-Text für den gemessenen Stand.

---

## Nachtrag 07.09.2026 — Lücke 2: ein Wizard-eigenes Feld auf `ziel.situation` war ungeprüft

**Der Befund (Messung vor Bau, Auftrag „C2"):** diese Prüffunktion
(`wizardsModulPruefen`) und `situationsModulPruefen` (U2-ADR-246) prüften
unabhängig voneinander korrekt — aber nie gegeneinander. `situationsModulPruefen` lässt einen
Dritt-Modul-Situations-Upload nur mit `{quelle,feld}`-Zeigern durch (kein eigenes Feld, s.
Kommentar dort). `wizardsModulPruefen` prüfte bei `ziel.situation` nur, DASS das Ziel existiert
— nie, ob das Wizard-eigene Feld zu den Feldern gehört, die die Zielsituation selbst führt. Ein
Dritt-Modul-Wizard konnte darum über die Hintertür genau das erreichen, was der Situations-Riegel
direkt verwehrt: ein beliebiges eigenes Feld in JEDE Situation schreiben, nativ oder angedockt.

**Gemessen, nicht hypothetisch:** die bestehende Testfixtur `NOTFALL_ASSISTENT` in
`tests/wizards-modul-andockbar.test.js` trug genau diesen Fall (`ziel:{situation:'geburt'}`,
eigenes Feld `x_notfall_kontakt`, fremde Herkunft) — und ERWARTETE Annahme. Der Test hatte die
Lücke nicht übersehen, er hatte sie festgeschrieben.

**Der Riegel:** `_wizardZielSituationFeldErlaubt(situationId, feldId, modulHerkunft)` — erlaubt
ein Wizard-eigenes Feld auf eine Situation nur, wenn die Situation dieses Feld bereits selbst
führt (`_erstePartieErlaubteIdsFuerSituation`, derselbe Maßstab wie bei einem Situations-Modul-
Update), ODER Situation und Wizard von derselben Herkunft stammen. Ein Modul erfindet keine
Felder in einer Situation, die ihm nicht gehört — darf aber seine eigene weiterhin so ausstatten,
wie das eingebettete Bündel es für native Situationen längst tut (`ziel:{situation:'geburt'}`
bei `gebwiz`). Jener eingebettete Weg läuft nie durch `wizardsModulPruefen`, bleibt unberührt —
gemessen an `tests/gebwiz-krisenvorsorge-verweis.test.js`,
`tests/e4-buergermodul-buendel-abnahmebeweis-u2-adr-310.test.js` (unverändert grün).

**Zwei Ränder vorab gemessen, keiner davon Teil des Fixes:**
- `sektorFeldSetzen` hat dieselbe Offenheit (kein Feld-Erlaubnislisten-Check) — dort aber
  ABSICHT, kein Fund: ein Wizard darf einem Sektor Fehlendes hinzufügen (Baukasten-Konzept
  Abschnitt III, „ergänzt Fehlendes dort, wo es hingehört"). Die Asymmetrie
  Situation-restriktiv/Sektor-offen ist gewollt — bewusst NICHT angefasst, hier nur festgehalten,
  damit sie nicht als vermeintlich vergessene Lücke erneut auftaucht.
- Kein wizardfreier Weg zur selben Lücke: `situationFeldSetzen` hat im ganzen Kern genau zwei
  Aufrufer, den Wizard-Pfad und einen UI-Ref-Picker, dessen `feldId` aus der Situation eigenen
  `bloecke` gezogen wird (kann kein neues, unbekanntes Feld einschleusen).

**Fixture angepasst, nicht stillschweigend:** `NOTFALL_ASSISTENT` zielt seither auf
`ziel:{sektor:'identitaet'}` (dort weiterhin sanktioniert), zwei kleinere Situations-Ziel-
Fixtures in dieser Datei ebenso umgestellt, wo sie nur die generische Andock-Mechanik prüften.
Der alte Fall steht als eigener Rot-Beweis samt drei Gegenproben (`[…·Lücke2]`-Tests): fremdes
Feld auf nativer Situation abgewiesen, bereits geführtes Feld angenommen, eigenes Feld in
selbst angedockter, eigener Situation angenommen, fremde Herkunft in fremder angedockter
Situation abgewiesen.

---

*Vivodepot GmbH · Berlin · 04.09.2026, Nachtrag 07.09.2026*
