# U2-ADR-246 · Situationen werden andockbar — das achte Einlass-Register

**Datum:** 04.09.2026
**Status:** gebaut, Suite grün (Kern-Register + Übersetzung + Render), E2E ausstehend
**Status heute:** gilt
**Bezug:** U2-ADR-243 §1/§2 (Fund während des Baus, der diesen ADR ausgelöst hat) ·
`tests/bereichs-module-einlass.test.js` (A389, das strukturelle Vorbild) ·
`tests/situations-modul-andockbar.test.js` (Rot-Beweis dieses ADRs)

---

## 1 · Kontext

`SITUATIONEN` — Vivodepots themenbezogene Blätter, die Felder aus mehreren Bereichen ziehen und
eigene, situationsspezifische Felder tragen können (z. B. „Geburt", „Hauskauf") — war bislang
vollständig hartcodiert. Kein angedocktes Modul konnte selbst eine Situation anlegen oder ihr ein
eigenes Feld geben; die Erlaubnisliste für angedockte Feld-Vorlagen
(`_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL`) kannte nur `bereich`, keinen `situation`-Schlüssel.

Der Fund entstand während des Baus von U2-ADR-243 (Pro-Modul): die vier Pro-Situationen
(Notfall/Vertretung/Übergabe/Nachfolge) ließen sich mit dem bestehenden Gerüst nicht bauen, ohne
Pro-Inhalt direkt ins Gerüst zu schreiben. Dazu wurde eine übergeordnete Frage
entschieden: **das Gerüst trägt keine Inhalte** — weder die der Bürgerin noch die eines Moduls.
Vier native Pro-Situationen anzulegen liefe dem zuwider — und die Folge reicht über Pro hinaus:
würde das Gerüst eingefroren, ohne dass Module Situationen mitbringen können, könnte KEIN
künftiges Modul je eine Situation haben. Diese Fähigkeit ist darum als **Gerüst-Fähigkeit**
entschieden, nicht als Pro-Feature — und muss VOR dem Einfrieren des Gerüsts stehen, weil sie
danach nicht nachrüstbar wäre. Sie ist außerdem eine Voraussetzung für einen parallelen Umbau
(Bürgerdepot-eigene Bereiche als Modul, Session `-a2`), der auf genau dieser Registry aufsetzt.

---

## 2 · Entscheidung

**Angedockt, nicht nativ** — derselbe Bauform-Beschluss wie bei den Bereichen (A389): Situationen
docken über ein achtes Einlass-Register, wörtlicher Spiegel der Bereichs-Schicht, nicht über eine
zweite, eigene Mechanik.

**Zwei Register-Ebenen, wie bei Bereichen:**

1. **Eine ganze Situation andocken** — ein Modul liefert `{modulTyp:'situation', moduleVersion,
   herkunft, situationen:{id: {icon, titel, bloecke}}}`. Geprüft (`situationsModulPruefen`),
   angemeldet (`_situationsModuleAusDepotAnmelden`), gemischt mit den zehn eingebauten
   (`situationenAlle()`), im Index nachschlagbar (`_situationIndexNeuBauen`/
   `_situationIndexHalter`). Modul-vs-Modul-Kollision: erstes gewinnt, zweites wird benannt als
   `doppelt` verworfen — exakt das Bereichs-Verhalten, nicht strenger erfunden.
2. **Ein situationseigenes FELD andocken** (der eigentlich neue Fall, ohne Bereichs-Vorbild) —
   über den bestehenden, signierten Vorlagen-Weg: `_templateFeldZuModell` bekommt einen zweiten
   Zielschlüssel `situation` (Alternative zu `bereich`, genau einer von beiden pro Feld;
   `bereich` gewinnt bei fehlerhaft beiden gesetzten). `_templateFelderUebersetzen` liefert
   `situationFeldDefinitionen` als eigene Liste neben `feldDefinitionen`. Ein `{feld:{…}}`-Eintrag
   IN `bloecke` wird bei der Modul-ANMELDUNG (nicht erst beim Rendern) verworfen — eigene Felder
   dürfen ausschließlich über den signierten Vorlagen-Weg entstehen, nie über die rohe
   Modul-Andockung selbst.

**Zwei neue Depot-Slots** (Schema 75 → 76, additiv & rückwärts-tolerant wie jede vorherige Stufe):
`data.situationsModule[]` (die angedockten Module selbst) und `data.situationFeldDefinitionen[]`
(die übersetzten eigenen Feld-Definitionen — Werte liegen unverändert in `data.situationen[…]`,
derselbe generische Weg wie für ein eingebautes eigenes Feld).

**Render — zwei Stellen, ein Muster:** `renderSituation` (Bildschirm) und `situationModell`
(PDF/JSON-Export) injizieren einen neuen Block „Vom Anbieter" (`STRINGS.
situationEigeneFelderBlock`) — wörtlicher Spiegel der bestehenden Brief-Anbindung
(`SITUATION_FELD_EXPORT`) direkt daneben: auf einer LOKALEN Kopie von `bloecke`
(`(si.bloecke||[]).slice()`), niemals auf `si.bloecke` selbst.

---

## 3 · Die vier Auflagen (04.09.2026) — gemessen, nicht angenommen

Der ursprüngliche Zuschnitt war gebilligt, aber vier Fragen offengehalten, die direkt
am Code zu klären waren, nicht per Annahme:

**1 — Schreibt `situationFeldSetzen` wie `sektorFeldSetzen` unbedingt (A317)?**
Ja, gemessen: `situationFeldSetzen` prüft den Feldnamen nicht gegen einen Katalog — derselbe
„der Namensraum ist weiter als der Katalog"-Charakter wie bei `sektorFeldSetzen`. Das ist keine
neue Lücke, die dieser Bau öffnet: der Schreibweg selbst war bereits generisch und unverändert
(s. U2-ADR-243 §2, „der Wert-Weg … bräuchte keine Änderung"). Dokumentiert, nicht gesperrt —
genau wie beim Bereichs-Vorbild.

**2 — Trägt `_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL` einen Exakt-Wächter?**
Gemessen: nein, die bestehenden Proben (`tests/schema-wirkt-nicht-nachtrag.test.js`) prüften nur
einzelne Mitglieder (`has('einheit')`, `!has('kardinalitaet')`), nie den vollständigen Inhalt.
Ergänzt: zwei neue Proben dort, die den GANZEN, sortierten Inhalt beider Erlaubnislisten
festhalten (Feld- und Unterfeld-Ebene) — ein künftig unbedacht ergänzter Schlüssel fällt jetzt
auf, ohne dass eine bestehende Probe verändert werden musste.

**3 — Wie behandelt `bereicheAlle()`/die Anmeldung eine Modul-vs-Modul-ID-Kollision?**
Gemessen und identisch gespiegelt: erstes Modul gewinnt, das zweite wird namentlich als `doppelt`
verworfen (`SITUATIONEN_MODUL_VERWORFEN`) — nichts Strengeres erfunden, nichts Loseres
zugelassen. Beleg: `tests/situations-modul-andockbar.test.js`, Probe „Kollision".

**4 — Ist ein `bloecke`-Getter (wie ursprünglich vorgeschlagen) nötig oder riskant?**
Gemessen, nicht angenommen: alle Konsumenten von `.bloecke` im gesamten Skript wurden
durchsucht. Kein einziger spreadet, `JSON.stringify`t oder `Object.keys()`t ein ganzes
Situationsobjekt — jeder liest `si.bloecke` direkt. Die einzige dynamische Erweiterung
(Brief-Anbindung, `SITUATION_FELD_EXPORT`) arbeitet bereits auf einer `.slice()`-Kopie, nie auf
dem Original. Ergebnis: **ein Getter ist unnötig** — einfacher als der ursprüngliche Vorschlag,
nicht nur risikoärmer. Ein docked `bloecke` ist ein statisches, eingefrorenes Array; die
Titel-Sprachreaktivität (analog `todesfall-uebernahme`) bleibt am `titel`-Feld selbst als Getter
erhalten, weil DORT (anders als bei `bloecke`) ein echter Bedarf gemessen wurde
(Sprachumschaltung zur Laufzeit).

---

## 3a · Ein echter Fund beim Vollsuite-Lauf — `_modulTraegtBeschriftung` kannte `situationen` nicht

Der erste volle `npm test`-Lauf schlug an vier Stellen an — zwei reine Zahlen-Nachträge
(EN-Textsatz-Kennungszähler 3161→3162 für die neue `situationEigeneFelderBlock`-Kennung, die
„sieben"/„acht"-Beschriftung der Vor-Depot-Konfigurationsprobe), aber der dritte war ein echter
Fund, kein Zahlen-Nachtrag: `_modulTraegtBeschriftung` — die Funktion, die entscheidet, ob ein
Modul eine `sprache`-Angabe PFLICHT trägt (Produktentscheidung, 22.08.2026, „1.0a") —
kannte den `bereiche`/`arten`/`typen`/`titel`-Fall je Register, aber keinen `situationen`-Fall.
Ein `situation`-Modul mit `titel`-tragenden Einträgen hätte damit OHNE Sprachangabe durchgehen
können — genau die Lücke, gegen die „1.0a" ursprünglich gebaut wurde, jetzt am neuen achten
Register wiederholt. Ergänzt: ein `situationen`-Zweig, wörtlicher Spiegel des `bereiche`-Zweigs
(`titel` statt `label`). Rot-Beweis nachgezogen in `tests/modul-herkunftssprache.test.js`
(drei neue Proben: mit/ohne/unsinnige Sprachangabe, exakter Spiegel der `bereich`-Triple) und
in der Vollständigkeits-Probe der sechs Beschriftungs-Stellen dort.

---

## 4 · Bewusst nicht repliziert — Umfang dieses Baus

Rund 30 verstreute Konsumenten von `data.feldDefinitionen[]` existieren im Skript für
periphere Bereichs-Belange (Waisen-Rettung, Voll-Export/PDF, Suche in „Zusammenstellen",
diverse Schema-Migrations-Wächter). Dieser Bau repliziert sie NICHT alle für
`situationFeldDefinitionen` — er bleibt beim Kern-Rundweg: Registry → Index →
Vorlagen-Übersetzung → Wert-Speicherung → Render (Bildschirm UND PDF-Modell, weil
`situationModell` ausdrücklich denselben Datenpfad wie `renderSituation` spiegelt, s. Kommentar
dort: „Spiegelt den renderSituation-Datenpfad").

**Ausdrücklich NICHT gebaut** (bekannte, bewusste Lücken, kein Versehen):
- Ein angedocktes situationseigenes Feld erscheint NICHT in `vollDepotModell` (das Gesamt-PDF)
  oder in der Empfängerkreis-Ausschnittsbildung (`_angedockteBeschriftungenFuerExport` u. ä.) —
  diese Wege kennen weiterhin nur `feldDefinitionen`/`bereichsModule`.
- Es gibt keine Waisen-Rettung für ein situationseigenes Feld, dessen Modul entfernt wird (anders
  als `_bereicheVerwaisteRetten` für Bereiche) — der Wert bleibt in `data.situationen[…]` stehen,
  wird aber nicht in einen Rettungsslot verschoben, wenn `situationFeldDefinitionen` seinen
  Eintrag verliert.
- Suche in „Zusammenstellen" findet ein angedocktes situationseigenes Feld nicht.

**Zwei Stellen, an denen die Registrierung selbst trotzdem korrekt eingebunden ist**, weil sie
generisch über bestehende Listen laufen und keine Änderung brauchten: `VOLLEXPORT_STRUKTURELL_
SCHLUESSEL` (die zwei neuen Top-Level-Schlüssel `situationsModule`/`situationFeldDefinitionen`
sind dort klassifiziert — der Wächter `vollexport-schluessel-abdeckung.test.js` hätte sonst
angeschlagen) und die Schema-Migrationsstufe 75→76 (additiver Slot, wie jede vorherige Stufe).

Diese Lücken sind kein Rückschritt gegenüber dem Bereichs-Vorbild — Bereiche hatten diese
Reichweite schrittweise über mehrere Aufträge gewonnen (A389, dann A484, dann die
Waisen-Rettung als eigener Zug). Situationen bekommen hier den ersten, tragenden Kern-Rundweg;
die peripheren Wege folgen bei Bedarf als eigene, benannte Aufträge, nicht stillschweigend
mitgebaut.

---

## 5 · Rot-Beweis

Neue Testdatei `tests/situations-modul-andockbar.test.js` (16 Proben): Register-Eintrag,
Migrationsstufe (Slot-Anlage, keine Umschreibung), Prüfer (reservierte ID, leeres Modul, Titel
fehlt, eigenes Feld bei der Anmeldung verworfen), Anmeldung (Registrierung wirkt, Modul-vs-Modul-
Kollision, Gegenprobe Entfernen-und-Rückkehr), Vorlagen-Übersetzung (situation-Zweig,
beide Rot-Fälle, Trennung in zwei Listen), Render an beiden Stellen (Bildschirm-Block, PDF-
Modell, Abwesenheits-Fall ohne leeren Block).

`tests/schema-wirkt-nicht-nachtrag.test.js` erweitert um zwei Proben: der vollständige, sortierte
Inhalt beider Erlaubnislisten (Auflage 2).

`tests/vollexport-schluessel-abdeckung.test.js`: unverändert grün — die zwei neuen Top-Level-
Schlüssel sind klassifiziert, kein Wächter musste aufgeweicht werden.

Vollsuite `npm test`: grün (alle Bestandsproben unverändert, plus die 18 neuen). E2E-Vollauf
steht aus (Auflage: dieser Bau berührt `vivodepot.html` selbst, andere Risikoklasse als
U2-ADR-243 Teil 1 — voller Playwright-Lauf vor dem Landen, nicht nur eine Spec-Datei).

---

*Vivodepot GmbH · Berlin · 04.09.2026*
