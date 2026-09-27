# U2-ADR-209: Produkt-Trennung im geteilten internen Speicher (Record-Kennung, nicht Datenbankname)

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** ARCHITEKTUR, DATENINTEGRITÄT
**Linie:** U2
**U2-Bezug:** U2-ADR-015 (D43, Etappe 1 — IDB-Persistenz-Schicht, `VDSTORE_DB`/`depots`, hier
unverändert in ihrer Grundform, nur um eine Auswahlregel ergänzt)
**Anker:** Auftrag vom 02.09.2026, Vorrang vor allem anderen — ein Verdacht
(„getrennter Speicher je Produkt ist gebaut" — ist er nicht, gemessen statt vermutet), ausgelöst
durch eine reale, laufende Situation: eine IHE-Prüferin sah die englische Modul-App an, während
parallel in der deutschen Wurzel-App gearbeitet wurde.
**Status heute:** gilt — Beleg `tests/geteilter-speicher-produkttrennung.test.js` (10 Proben,
Rot-Beweis + Gegenprobe Altbestand, s. Konformität unten).

---

## Kontext

Ein Zug-0-Bericht (`geteilter-interner-speicher-module-2026-09-02.md`) maß empirisch (Firefox,
echter gehosteter Klon): Wurzel-App (Deutsch) und jede Modul-App (`module-apps/<slug>/`, z. B.
Englisch, Betriebssatz) laufen unter DERSELBEN Origin (`tools/modul-app-packen.js` kopiert
`vivodepot.html` byte-identisch in jeden Modul-Ordner desselben GitHub-Pages-Repos) — und damit
unter DERSELBEN `VDSTORE_DB = 'vivodepot'` (IndexedDB kennt nur Origin, kein Produkt).

**Gemessen, nicht vermutet:** ein in der Wurzel-App intern gesichertes Depot erschien nach dem
Öffnen der englischen Modul-App SOFORT als deren eigener interner Stand
(`internerStandVorhanden() === true`, `internerStandMeta()` zeigte exakt das fremde Depot). Legte
die englische App ein eigenes, anderes Depot an, blieb das erste zwar UNVERÄNDERT im Store liegen
(`depots` ist mit `id` = Depot-UUID geschlüsselt, kein fester Platz) — aber der nächste
Wiedereinstieg der Wurzel-App zeigte danach auf das ENGLISCHE Depot, nicht mehr auf das eigene.

**Die Kollision sitzt nicht im Schreiben, sondern in der Auswahl:** `internerStandMeta()`,
`depotAusIdbLaden()` und `_internerUmschlagRoh()` lasen bisher unabhängig voneinander dieselbe
Regel — die GESAMTE Liste aller Records im Store nach `gespeichert_am` sortieren, den neuesten
nehmen — ohne jede Kenntnis, welches Produkt ihn geschrieben hat. Ein Record trug bis hierher nur
`{ id, cipherBlob, gespeichert_am }`, keine Herkunftsangabe.

## Die Falle, die diese Entscheidung bestimmt

**Die Datenbank umzubenennen (z. B. `vivodepot-englisch` statt `vivodepot`) würde jeden Bestand
verwaisen, der heute schon darin liegt.** Eine Bürgerin, die ihr Depot vor diesem Fix intern
gesichert hat, fände es nach einem Namenswechsel nicht mehr — kein Fehler, kein Hinweis, es wäre
einfach fort. Das wäre schlimmer als der Fehler, den diese Entscheidung behebt. Jede Lösung
MUSSTE darum sicherstellen: ein bereits gespeicherter Record bleibt auffindbar.

## Entscheidung

**Die Trennung liegt am RECORD, nicht am Datenbanknamen.** Jeder neu geschriebene Record trägt ab
sofort ein `produkt`-Feld — die Kennung des Produkts, das ihn geschrieben hat. Die drei
Lesestellen filtern VOR dem Sortieren auf die eigene Kennung, statt blind die gesamte Liste zu
nehmen.

**Woher die Kennung kommt:** `vivodepot.html` wird byte-identisch in jeden Modul-Ordner kopiert
(`tools/modul-app-packen.js`, `DATEISATZ`) — eine Kennung, die IM Kern selbst stünde, wäre darum
in jeder Fassung dieselbe und könnte nichts unterscheiden. Die Kennung muss von außen kommen.
Gewählt: der Auslieferungspfad zur Laufzeit (`location.pathname`) — der einzige Unterschied
zwischen den sonst identischen Fassungen, ohne jede Änderung an `modul-app-packen.js` oder eine
neue Datei in der Auslieferung nötig zu machen.

```js
function _speicherProduktKennung(pfad) {
  const p = (typeof pfad === 'string') ? pfad
    : ((typeof location !== 'undefined' && location && location.pathname) || '');
  const m = /\/module-apps\/([a-z0-9-]+)\//.exec(p);
  return m ? m[1] : '';   // '' = Wurzel-App
}
```

**Altbestand (ein Record OHNE `produkt`-Feld, wie er heute in echten Browsern liegt) gehört dem
Produkt, das ihn findet** — er wird NICHT der Wurzel oder irgendeinem festen Produkt zugeschlagen,
sondern matcht jede Kennung. Das ist die zentrale Gegenprobe dieser Entscheidung: ein Record ohne
Kennung darf für KEIN Produkt verwaisen, weder für die Wurzel noch für ein Modul.

```js
function _speicherEigenerRecord(record, kennung) {
  return !!record && (record.produkt === undefined || record.produkt === kennung);
}
```

`internerStandMeta()`, `depotAusIdbLaden()` und `_internerUmschlagRoh()` (die Vorschau-Hinweise
vor der Passwort-Eingabe am internen Wiedereinstieg speisen) laufen jetzt alle über EINEN
gemeinsamen Ort statt drei unabhängig kopierten sort+pick-Stellen:

```js
async function _eigeneInterneListe() {
  const liste = await VdStore.liste();
  const kennung = _speicherProduktKennung();
  const eigene = (liste || []).filter((r) => _speicherEigenerRecord(r, kennung));
  eigene.sort((a, b) => String(b.gespeichert_am || '').localeCompare(String(a.gespeichert_am || '')));
  return eigene;
}
```

## Verworfene Alternative

**Eigene `VDSTORE_DB` je Produkt-Slug** (z. B. `vivodepot-englisch`). Sauberer auf den ersten
Blick — vollständige Trennung auf Datenbank-Ebene. Verworfen: verwaist jeden Bestand, der unter
dem alten, gemeinsamen Namen bereits liegt (s. „Die Falle" oben) — genau der Schaden, den diese
Entscheidung vermeiden soll, nur an anderer Stelle wieder eingeführt.

## Abgrenzung — was diese Entscheidung NICHT löst

**Keine Liste mehrerer Depots.** Die Bürgerin sieht weiterhin genau EINEN Wiedereinstieg-Vorschlag
pro Produkt (das ihres eigenen), nicht eine Auswahl unter mehreren gefundenen Records. Ob sie
künftig eine Liste sehen soll, ist eine offene Produktfrage — ausdrücklich
nicht Teil dieses Baus (02.09.2026).

**Betriebssatz einzeln geprüft, nicht nur strukturell angenommen** — drei-Wege-Isolation (Wurzel,
Englisch, Betriebssatz gleichzeitig gegeneinander) ist Teil der Testsuite.

**Löst NICHT das Sicherungsproblem der Nacht** (`speicherverhalten-messung-2026-09-02.md`) — dort
schreibt der Feld-Blur ohnehin nie automatisch, mit oder ohne Produkt-Trennung. Diese Entscheidung
ist aber VORAUSSETZUNG für einen künftigen internen Auto-Speicher-Automatismus: ohne sie würde ein
solcher Automatismus die hier behobene Kollision nicht nur bei einem expliziten Sichern, sondern
bei praktisch jeder Feldänderung auslösen können, sobald zwei Produkte im selben Browser offen
sind.

**Träfe OPFS ebenso, wäre es je genutzt — hier bewusst vorbereitet, nicht umgebaut.** Origin
Private File System ist wie IndexedDB ursprungsgebunden, nicht pfadgebunden — ein gemeinsamer
OPFS-Wurzelordner trüge dasselbe Kollisionsrisiko (Hinweis aus einer parallelen Messung,
02.09.2026). `_speicherProduktKennung()` liest ausschließlich `location.pathname` — kein Bezug zu
IndexedDB, VdStore oder einem anderen speicherspezifischen Detail. Sie wäre unverändert
wiederverwendbar, sollte Vivodepot je auf OPFS wechseln oder OPFS zusätzlich nutzen. Kein Umbau
heute — Vivodepot nutzt OPFS aktuell nicht, dies ist ausschließlich eine Vorbereitungsnotiz.

## Konsequenzen

Jeder ab jetzt neu geschriebene Record trägt seine Produkt-Kennung. Ein Record, der VOR diesem Fix
geschrieben wurde, bleibt für das Produkt auffindbar, das ihn zuerst findet — bei zwei Produkten,
die beide auf denselben Altbestand träfen (unwahrscheinlich, aber nicht ausgeschlossen), gewinnt
weiterhin das zuerst öffnende. Das ist keine vollständige Trennung des Altbestands, sondern die
bewusst gewählte, verlustfreie Übergangsregel — der Store trägt ab jetzt fortlaufend weniger
kennungslose Records, je mehr echte Sicherungen über diesen Fix laufen.

## Konformität

```konformitaet
aussage:  Ein intern gesichertes Depot eines Produkts erscheint NICHT als interner Stand eines
          anderen Produkts (Wurzel vs. Modul-App, verschiedene module-apps-Slugs untereinander).
zustand:  geprüft
herkunft: gemessen, 02.09.2026 (Firefox, echter gehosteter Klon) — s.
          geteilter-interner-speicher-module-2026-09-02.md
pruefung: tests/geteilter-speicher-produkttrennung.test.js#[Produkttrennung·Rot-Beweis] Wurzel-Depot erscheint NICHT mehr als interner Stand der englischen Modul-App
pruefung: tests/geteilter-speicher-produkttrennung.test.js#[Produkttrennung] volles Szenario: Depot A (Wurzel) bleibt beim nächsten Wiedereinstieg der Wurzel, trotz später erstelltem Depot B (Englisch)
pruefung: tests/geteilter-speicher-produkttrennung.test.js#[Produkttrennung] Betriebssatz-Modul-App ist ebenso von Wurzel UND Englisch isoliert
```

```konformitaet
aussage:  Ein Record ohne produkt-Feld (Altbestand von vor diesem Fix) bleibt für jedes Produkt
          auffindbar — er verwaist nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/geteilter-speicher-produkttrennung.test.js#[Produkttrennung] Gegenprobe Altbestand: ein Record OHNE produkt-Feld bleibt für JEDES Produkt auffindbar
```

```konformitaet
aussage:  Depots verschiedener Produkte liegen nebeneinander im selben Store — keins überschreibt
          das andere.
zustand:  geprüft
herkunft: gemessen, 02.09.2026 — s. geteilter-interner-speicher-module-2026-09-02.md
pruefung: tests/geteilter-speicher-produkttrennung.test.js#[Produkttrennung] volles Szenario: Depot A (Wurzel) bleibt beim nächsten Wiedereinstieg der Wurzel, trotz später erstelltem Depot B (Englisch)
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
