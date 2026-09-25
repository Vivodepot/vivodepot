# U2-ADR-165: Zwei Fassungen desselben Depots zusammenführen — Erkennen und Zusammenführen, beides v1

**Status:** Akzeptiert
**Datum:** 23.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Laufzettel „Nacht 22./23.08.2026", Posten 5 — löst A475 (dritter Nachtrag der
Entscheidung: „ja, zusammenführen — Erkennen UND Zusammenführen, beides v1"). Baut auf dem
gemessenen Befund von Stresstest 9 (21.08.2026, `tools/gbr-fassungen-modulumfang-messen.js`)
auf: die App merkt eine Gabelung heute nicht, obwohl `depotUUID` und
`urheberschaft[sektorId][feldId][].zeitpunkt` das Material dafür bereits tragen.
- **Code-Stelle:** `vivodepot.html` — `_urheberschaftGemeinsamerPraefix`,
  `_urheberschaftMergefaehig`, `_urheberschaftAlleFelder`, `fassungenVergleichen`,
  `fassungenZusammenfuehren`, `fassungenHabenAbweichung` (Kern); `flowFassungenDialog`,
  `_fassungenNachOeffnenPruefen` (UI/Verdrahtung, `cryptoOverlayOeffnen`).
- **ADR-Bezug:** U2-ADR-005 (Urheberschaft pro Eintrag), U2-ADR-015 (der bestehende, orthogonale
  Ganz-oder-gar-nicht-Konflikt zwischen internem Stand und Datei — `standKonfliktModell`).
- **Status heute:** gilt — gebaut und belegt in `tests/a475-fassungen-zusammenfuehren.test.js`
  (13 Proben).

---

## Kontext

Zwei Kopien desselben Depots (`depotUUID` identisch, z. B. „Stick" und „Platte") können sich
unabhängig weiterentwickeln — dasselbe Depot auf zwei Geräten, ohne dass eine der beiden Seiten
seither vom Stand der anderen wusste. Öffnet die Bürgerin danach die eine Kopie, während die
andere noch als laufende Sitzung offen ist, überschreibt `depotLaden()` `data` bisher
kommentarlos — Stresstest 9 hat das ausdrücklich als Lücke benannt, nicht nur als Nebenwirkung.

**Das Material für eine Erkennung lag bereits vor der Lücke im Depot:** `depotUUID` bezeugt den
gemeinsamen Ursprung, und jede Urheberschafts-Kette (`urheberschaft[sektorId][feldId]`,
U2-ADR-005) ist ein APPEND-ONLY-Protokoll. Zwei Ketten desselben Feldes, die aus demselben
gespeicherten Stand hervorgegangen sind, sind bis zur Gabelung BYTE-GLEICH — der gemeinsame
Anfangs-Abschnitt zweier Ketten IST der Vorfahre, ganz ohne ihn separat zu speichern.

## Entscheidung

**Vergleich über den gemeinsamen Ketten-Präfix, nicht über die bloße Anwesenheit eines
Schlüssels.** `_urheberschaftGemeinsamerPraefix` vergleicht zwei Ketten Eintrag für Eintrag
(`zeitpunkt`, kollisionsfrei je Schreibvorgang) und liefert die Länge des geteilten Anfangs. Was
eine Seite danach zusätzlich trägt, hat SIE seither geschrieben. Das ist bewusst genauer als die
in Stresstest 9 vorgerechnete Schlüssel-Anwesenheits-Probe: die griff nur, weil die dortigen
Beispielfelder VOR der Gabelung noch nie beschrieben worden waren. Ein Feld, das vor der
Gabelung schon einmal gesetzt wurde und danach nur auf einer Seite ein zweites Mal, hätte die
einfachere Probe nicht erkannt — der Präfix-Vergleich erkennt ihn (belegt im ersten Test der
Testdatei, „[A475·Fund]").

**Vier Fälle je Feld, `fassungenVergleichen(alt, neu)`:**
- **Keine Gabelung** oder `neu` bereits vorn → nichts zu tun.
- **Nur `alt` hat seit der Gabelung geschrieben** → ohne Rückfrage automatisch übernehmen.
- **Beide haben geschrieben, aber derselbe Text** → wie „gleich" behandelt (dieselbe Regel wie
  beim bestehenden wert-basierten Import-Konflikt, U2-ADR-Bezug s. `_importPlanZeile`).
- **Beide haben geschrieben, unterschiedlicher Text, genau eine Seite leer** → „Löschen verliert
  gegen Ändern": der nicht-leere Wert ist VORBELEGT, die Bürgerin sieht die Zeile trotzdem im
  selben Dialog wie einen echten Konflikt und kann die Vorbelegung umkehren.
- **Beide haben geschrieben, unterschiedlicher Text, beide nicht leer** → echter Konflikt, keine
  Vorbelegung — dieselbe Zurückhaltung wie beim bestehenden `flowStandKonfliktDialog`
  („KEIN voreingestellter Default").

**Anwenden läuft über den gestempelten Schreibweg** (`sektorFeldSetzen`, `eingabeArt:
'fassungs-merge'`) — derselbe Weg, den auch `importAnwenden` für seine Konfliktzeilen nutzt.
Braucht darum einen gesetzten Sitzungs-Akteur; `fassungenZusammenfuehren` läuft deshalb IMMER
erst nach `betreteApp()`, nie davor (`_fassungenNachOeffnenPruefen` wird genau dort in
`cryptoOverlayOeffnen` aufgerufen).

**Andere Achse als der bestehende Konflikt-Dialog:** `standKonfliktModell`/
`flowStandKonfliktDialog` (U2-ADR-015, D43 Etappe 5) vergleicht eine Klartext-Zeitmarke fürs
GANZE Depot — interner Stand gegen Datei, nur im internen Speicher-Modus, Entweder-Oder ohne
Zusammenführen. A475 vergleicht FELDWEISE, unabhängig vom Speicher-Modus, gegen die vorher
LEBENDE Sitzung (nicht gegen einen internen Stand) — zwei unabhängige Mechanismen, die dasselbe
Wort „Konflikt" für verschiedene Dinge verwenden.

## Grenze (v1, absichtlich)

**Nur flache Sektorfelder mit eigener Urheberschafts-Kette über `sektorFeldSetzen`**
(`_urheberschaftMergefaehig`: `feldDefFuer` liefert eine echte, nicht-`liste`-Definition).
Ausdrücklich NICHT zusammengeführt:
- **Situationsfelder** (Namensraum `sit:*`, `situationFeldSetzen`) — kein Sektor-Feld.
- **Gültigkeits-Marken** (Namensraum `gueltigkeit:*`, A445) — synthetischer Schlüssel, keine
  eigene Felddefinition.
- **Register-Listen** (Personen, Kontos, Instrumente, Ausweisdokumente, …) — sie tragen zwar
  teils eine Kette (`listenEintragHinzufuegen`/-`Aktualisieren`/-`Entfernen` stempeln), aber
  EINTRAGSWEISE, nicht feldweise; welcher Eintrag welchem auf der anderen Seite entspricht, ist
  eine andere, größere Frage (Beleg: „[A475·Grenze]" in der Testdatei — die Kette existiert,
  wird aber bewusst nicht zusammengeführt).
- **Verweisfelder** (`typ:'ref'`), deren Zielperson nur in einer der beiden Fassungen existiert
  — die Personen-Register selbst werden nicht zusammengeführt (s. o.), ein `{ref:<id>}` kann
  darum nach dem Merge ins Leere zeigen. Nicht behoben, nicht Teil dieses Postens.

**Verdrahtung nur am regulären Datei-öffnen-Weg** (`cryptoOverlayOeffnen`) — die beiden anderen
`depotLaden()`-Aufrufer (`depotAusIdbLaden`, interner Wiedereinstieg; `konfliktWaehleDatei`,
Auflösung des BESTEHENDEN Ganz-oder-gar-nicht-Konflikts) bleiben unverändert. Beide sind kein
Fall von „zwei unabhängig gewachsene Dateien treffen aufeinander" im Sinne von Stresstest 9.

## Was NICHT in dieser ADR steht

Keine automatische Zusammenführung der Register-Listen (Personen, Konten, Instrumente) — das
wäre eine Entry-Matching-Frage (welcher Eintrag auf Seite A entspricht welchem auf Seite B?) und
damit ein eigener, größerer Bau. Keine Änderung an `standKonfliktModell`/
`flowStandKonfliktDialog` — die bleiben, was sie waren, ein orthogonaler Mechanismus.

---

*Vivodepot GmbH · 23.08.2026*
