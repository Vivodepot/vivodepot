# U2-ADR-294 · Zehn-Register-Nachlese — der fehlende Wirkungsbeweis fürs Assistenten-Register nachgezogen

**Datum:** 05.09.2026
**Status:** Gilt (bereinigt 25.09.2026)
**Status heute:** gilt
**Bezug:** DoD-Posten „alle nur denkbaren Andockpunkte definiert und gebaut" · Übersicht der zehn
Einlass-Register vom selben Tag (acht von zehn mit vollständigem Wirkungsbeweis, zwei offen:
wizard, branding) · U2-ADR-250 (Assistenten werden andockbar, Paket 2a) · U2-ADR-236 (Rahmen
folgt Kontext, Gerüst-Regel Kopfzeile) · U2-ADR-046/-246/-253 (dasselbe Andock-Muster bei
bereich/situation/ereignisAchse)

---

## 1 · Kontext

Acht der zehn Einlass-Register haben einen vollständigen, wirkungsprüfenden Beweis. Zwei sagen
das in ihrem eigenen Kopfkommentar selbst: **wizard** (die Anmeldung ist bewiesen, kein
bestehender Aufrufer liest den Registry-Merge) und **branding** (das Register existiert, zeigt
sich aber an keiner Stelle der Oberfläche).

Auftrag: für beide messen, ob die Verschiebung einen echten Grund hat oder nur „später" hieß —
und bauen, wo kein echter Grund steht.

---

## 2 · wizard — gebaut

**Befund, gemessen:** `WIZARD_BY_ID` wird bereits korrekt aus `wizardsAlle()` gebaut
(`_wizardIndexNeuBauen()`, aufgerufen am Ende von `_wizardsModuleAusDepotAnmelden()`, die selbst
schon in den echten Depot-Lade-/Kontextwechsel-Pfaden hängt) — der Registry-Merge war NIE das
Problem. Der Bruch lag eine Ebene höher: `renderSektor()`s `wizListe` zog ausschließlich
`s.wizardId`/`s.wizards` — zwei Eigenschaften, die nur am NATIVEN Sektor-Objekt selbst stehen.
Ein angedockter Assistent mit `ziel.sektor` wurde nie danach GESUCHT, gleich wie vollständig er
in `WIZARD_BY_ID` aufgelöst worden wäre.

**Kein technischer Blocker gefunden** — reine Sequenzierung („Paket 3"), kein Design- oder
Architektur-Grund, der einen Aufschub rechtfertigt. Gebaut, wörtlich derselben Haltung wie
`listenfeldAlle` am selben Tag: wo etwas fehlt, bauen statt vermerken.

**Umsetzung:** `renderSektor()` durchläuft zusätzlich `wizardsAlle()` und zieht jeden angedockten
Assistenten mit `w.angedockt && w.ziel.sektor === sektorId` in dieselbe `wizListe`, die auch die
nativen Einträge trägt — läuft danach durch dieselbe Entdoppelungs-/Bündelungs-Logik
(Vorsorge-Sonderfall, „Geführt ausfüllen"-Sammelzeile ab zwei Einträgen), keine zweite
Render-Form nötig.

**Bewusst nicht Teil:** ein Assistent mit `ziel.situation` startet heute ausschließlich über die
native, hartkodierte Anlass-Auswahl (`a.ziel.wizard` in der Anlass-Auflösung) — ein eigener,
in sich geschlossener Katalog. Ihn für angedockte Assistenten zu öffnen bräuchte ein neues
Andock-Register für Anlass-Einträge selbst — ein eigenständiges, größeres Gerüst-Stück, kein
kleiner Nachtrag zu diesem Fund. Benannt, nicht verschwiegen; die Datei
`tests/wizards-modul-andockbar.test.js` trägt den Verweis jetzt in ihrem eigenen Kopfkommentar.

**Rot-Beweis** (`tests/wizard-sektor-aufrufer-u2-adr-294.test.js`, 5 Proben):

- ein angedockter, sektor-zielender Assistent zeigt einen echten `data-wizard-start`-Knopf in
  `renderSektor()`, mit seinem eigenen Titel
- Gegenprobe: derselbe Assistent taucht NICHT in einem fremden Sektor auf (echte Filterung,
  nicht bloßes Durchreichen)
- Gegenprobe: ohne Einlass erscheint die ID nirgends
- zwei angedockte Assistenten für denselben Sektor erscheinen beide, über die bestehende
  Bündelungs-Logik
- Bestandsschutz: ein Sektor ohne jeden Wizard bleibt ohne Assistenten-Container

**Regression:** die neun bestehenden Wizard-Proben (`tests/wizards-modul-andockbar.test.js`)
unverändert grün. Zusätzlich alle 20 Testdateien, die `renderSektor()` sonst berühren, einzeln
gefahren (189 Proben) — 0 Fehlschläge. Diese Reichweite-Probe war nötig, weil `renderSektor()`
eine der am breitesten genutzten Funktionen im Kern ist; eine kleine additive Änderung dort
verdient eine größere Regressionsprobe als eine isolierte Funktion.

---

## 3 · branding — bewusst weiterhin ohne Render-Verdrahtung, Grund korrigiert

**Der ursprünglich genannte Blocker ist inzwischen entschieden, nicht mehr real:** der
Kopfkommentar bei `brandingModulPruefen` nannte als Grund für die Pause die offene
„Kopfzeilen-Frage" (Palettentausch Zug 2, 04.08.2026). U2-ADR-236 (03.09.2026) hat sie seither
beantwortet — ausdrücklich als Gerüst-Regel, wörtlich „Achtung, das ist Gerüst!":
**der äußere Rahmen (Kopfzeile) bleibt für immer Salbei, für jedes künftige Modul.** Branding
wird die Kopfzeile also nie einfärben können — diese Teilfrage ist beantwortet.

**Das hebt die Pause aber nicht auf.** Die Entscheidung sagt nur, WO Farbe/Logo/Name NICHT
erscheinen — nicht, wo sie STATTDESSEN erscheinen sollen (eigene Sidebar-Fläche?
Institutions-Info-Karte? ein neuer Block?). Das ist eine offene, eigenständige
Platzierungsfrage, die eine Design-Entscheidung braucht — keine, die aus dieser Nachlese folgt
oder die ich unilateral treffen sollte. Render-Verdrahtung bleibt darum aus, aber aus einem
neuen, engeren, ehrlich benannten Grund statt aus dem alten, inzwischen falschen.

**Umsetzung:** nur die beiden Kopfkommentare korrigiert (Kern bei `brandingModulPruefen`, Test
bei `tests/a523-branding-register.test.js`) — kein Verhalten geändert, keine neue Probe nötig
(die bestehenden zwölf Proben prüfen weiterhin genau das, was existiert).

**NACHTRAG U2-ADR-297 (05.09.2026):** der obige Satz „der äußere Rahmen (Kopfzeile) bleibt für
immer Salbei, für jedes künftige Modul" übertrug U2-ADR-236 zu weit — jener ADR entscheidet den
Sub-Depot-Akzent (`--vm-*`, Anker-Datei vs. eingehängtes Depot), nicht die Frage, ob ein
Institutions-Branding-Modul die Kopfzeile je füllen darf. Diese engere Frage wurde
seither gesondert entschieden — „die sparkasse zb färbt rot" —, für
GENAU einen Fall: ein Produkt, dessen Branding über die Vor-Depot-Konfiguration ankommt, bevor
irgendein Bürgerdepot existiert (Fall 2 nach U2-ADR-296s Zählung). Für den in diesem ADR
gebauten Fall (Bereich-Modul, In-Depot angedockt, „Fall 1") bleibt der Satz oben unverändert
wahr. Umgesetzt: `.topbar`, `_brandingProduktTopbarAnwenden`, s. U2-ADR-297.

---

## 4 · Zusammenfassung

| Register | Vorher | Jetzt |
|---|---|---|
| wizard | Registry-Merge bewiesen, Aufrufer offen | Aufrufer gebaut und rot-bewiesen — begründet vollständig |
| branding | Render-Pause, Grund: offene Kopfzeilen-Frage | Render-Pause bleibt, Grund: offene Platzierungsfrage (Kopfzeilen-Teil inzwischen entschieden) — begründet unvollständig, nicht offen |

Neun der zehn Register haben jetzt einen vollständigen Wirkungsbeweis. Das zehnte (branding) hat
einen ehrlich benannten, tatsächlich noch bestehenden Grund — keinen stillen Aufschub.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
