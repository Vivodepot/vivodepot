# U2-ADR-194: Eine index.html je Ausliefer-Verzeichnis, die auf das eigene vivodepot.html weiterleitet

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** AUSLIEFERUNG, ZUVERLÄSSIGKEIT
**Linie:** U2
**U2-Bezug:** keiner direkt — die Precache-Mechanik (`SCHALE`, `sw.js`) ist in keinem bestehenden
ADR das Hauptthema.
**Anker:** Bauauftrag, 01.09.2026 (Cross-Session-Auftrag an diese Sitzung). Die
Produktfrage — was die gekürzte Wurzel-Adresse ausliefern soll — **wurde im Auftrag selbst entschieden,
nicht eskaliert** (so benannt, hier wörtlich übernommen, nicht abgeschwächt).
**Status heute:** gilt — Beleg `tests/index-weiterleitung-erzeugen.test.js`,
`tests/testfassung-legen.test.js`, `tests/modul-app-packen.test.js`,
`tests/e2e/precache-vollstaendigkeit.spec.js`.

---

## Kontext

Zwei getrennt gemeldete Funde, eine Ursache:

1. **Toter Kurzlink (Live-Messung + Nachmessung, 01.09.2026).**
   `die GitHub-Pages-Adresse des Test-Repos` (und jeder Modul-App-Pfad darunter,
   z. B. `.../module-apps/englisch/`) liefert einen echten GitHub-Pages-404. Live geprüft
   (Browser-Netzwerkliste, nicht nur der gerenderte Text): `GET .../vivodepot-ios-test/` → `404`.
   Die Fehlerseite nennt den Grund selbst: „For root URLs … you must provide an index.html file."
2. **Precache-Lücke (paralleler Strang, live gemessen und mechanisch bewiesen).** `sw.js`s `SCHALE` listet `'./'` als ersten Eintrag; der
   `install`-Handler cached jeden Eintrag EINZELN mit `.catch(() => undefined)` — das Fehlen einer
   Wurzel-Datei scheitert lautlos, `caches.open(CACHE).then(c => c.keys())` zeigte live nur zwei
   der drei Einträge. Der `fetch`-Handler fängt Navigationen praktisch ab (`caches.match('./vivodepot.html')`
   als Rückfall) — die Lücke war real, aber für den heutigen Navigationsweg abgeschwächt.

**Die gemeinsame Ursache, bestätigt (nicht nur vermutet):** `tools/testfassung-legen.js` kopierte
für den Ausliefer-Ordner genau vier kuratierte Dateien (`vivodepot.html`, `vivodepot-lesen.html`,
`sw.js`, `manifest.webmanifest`), `tools/modul-app-packen.js` für jede Modul-App genau drei
(`vivodepot.html`, `sw.js`, `manifest.webmanifest`) — **keines der beiden Werkzeuge legte je eine
`index.html` an.** Lokaler Klon von `vivodepot-ios-test` gegengeprüft: an keinem der geprüften
Pfade (Wurzel, `module-apps/englisch/`) liegt eine `index.html`, ein `README` oder ein
Auto-Deploy-Workflow — GitHub Pages hat an keiner dieser Adressen etwas zu servieren.

**Milderung, nicht Aufhebung, für den heute ausgegebenen Tester-Weg:** `docs/webseite/20082026/tester.html`
(der tatsächlich verteilte Fragebogen/Einstieg) verlinkt auf
den VOLLEN Pfad `vivodepot-ios-test/vivodepot.html`, nicht auf die nackte Wurzel — der dokumentierte
Testerweg trifft Fund 1 heute nicht. Betroffen sind nur gekürzte, abgetippte oder weitergegebene
Adressen.

## Entscheidung

**Eine minimale `index.html` je Ausliefer-Verzeichnis (Wurzel UND jede Modul-App), die sofort auf
das `vivodepot.html` DESSELBEN Verzeichnisses weiterleitet — kein eigener Text, keine eigene
Oberfläche.**

Begründung (wörtlich übernommen): „Heute steht dort ein 404, also ist jede Antwort besser.
Eine eigene Einstiegsseite wäre eine zweite Oberfläche mit eigenem Text, eigener Sprache und eigener
Pflege — für einen Weg, den ohnehin nur trifft, wer die Adresse kürzt oder abtippt. Die
Weiterleitung führt genau dorthin, wo die Person hinwollte."

**Die vier Auflagen aus dem Auftrag, umgesetzt:**

1. **Das Werkzeug legt sie an, nicht die Hand.** Neue gemeinsame Funktion
   `tools/index-weiterleitung-erzeugen.js#indexWeiterleitungInhalt(vivodepotHtmlPfad)` — liest
   `<html lang="…">` aus der GERADE KOPIERTEN Zieldatei und spiegelt genau diesen Wert; rät nichts,
   wenn das Attribut fehlt (wirft stattdessen, dieselbe Drei-plus-eins-Zustände-Disziplin wie in
   `tests/gitignoriert-pruefen.js`, U2-ADR aus demselben Auftragstag). BEWUSST kein
   Slug→Sprache-Register: das Werkzeug kennt die Slugs nicht und soll sie nicht kennen müssen.
   `tools/testfassung-legen.js#dateisatzUndIndexAblegen` und
   `tools/modul-app-packen.js#dateisatzUndIndexAblegen` rufen sie je nach dem Kopieren auf.
   `index.html` gehört NICHT zu `DATEISATZ` (weder der Vier- noch der Drei-Dateien-Satz) — eigener
   Schritt, damit `DATEISATZ` seine bestehende Bedeutung (u. a. im `sw.js`-Diff-Vergleich in
   `testfassung-legen.js`) unverändert behält.
2. **Jede Modul-App bekommt ihre EIGENE, auf ihr eigenes `vivodepot.html`.** Keine gemeinsame Datei
   an der Wurzel, die auf irgendein Verzeichnis zeigt — `modul-app-packen.js` ruft die Funktion für
   JEDEN `zielOrdner` einzeln auf, sowohl beim Packen eines einzelnen Bündels (`packeEinzeln`) als
   auch beim Re-Sync (`packeAlle`).
3. **Cache-INHALT geprüft, nicht nur die HTTP-Antwort.** `tests/e2e/precache-vollstaendigkeit.spec.js`
   (neu — die erste Probe in `tests/e2e/`, die einen echten lokalen HTTP-Server statt `file://`
   braucht, weil Service Worker sich unter `file://` grundsätzlich nicht registrieren): registriert
   den echten `sw.js` gegen ein Staging-Verzeichnis, wartet auf den `install`-Abschluss (per
   Spezifikation garantiert `waitUntil()` den `cache.add()`-Abschluss VOR `'installed'`), liest
   `caches.open(CACHE).then(c => c.keys())` und prüft alle drei `SCHALE`-Pfade einzeln. Rot-Beweis
   im selben Lauf gemessen, nicht nur behauptet: OHNE `index.html` fehlt `'/'` im Cache, die anderen
   zwei landen weiterhin — GENAU der Fund des parallelen Strangs, jetzt auf Cache-Ebene reproduziert.
4. **Der Fetch-Rückfall unangetastet.** `sw.js` selbst nicht geändert — die Lücke schließt sich
   dadurch, dass `cache.add('./')` jetzt einen echten Server-Treffer findet, nicht durch eine neue
   Fallback-Regel.

## Verworfene Alternative

**Eine eigene, gestaltete Einstiegsseite** (mit Begrüßungstext, ggf. zweisprachig, Link zum
Fragebogen). Verworfen aus demselben Grund wie oben: der einzige heute bekannte Treffer für diesen
Pfad ist eine gekürzte/abgetippte Adresse, deren Absicht bereits feststeht (die App öffnen) — eine
zweite Oberfläche mit eigenem Pflegeaufwand für einen Rand-, aber realen Fall stünde in keinem
Verhältnis zum Nutzen. Bleibt reversibel: sollte der Rand-Fall wachsen (z. B. wenn `vivodepot.de`
künftig direkt auf diese Wurzel verlinkt), ist `index-weiterleitung-erzeugen.js` die eine Stelle,
an der sich das ändern ließe, ohne die beiden Ausliefer-Werkzeuge erneut anzufassen.

**Ein hartkodiertes Slug→Sprache-Register statt Lesen aus der Zieldatei.** Verworfen: ein neues
Modul (neue Sprache, neue Institution) bräuchte sonst einen manuellen Nachtrag an einer zweiten
Stelle, die leicht vergessen wird — genau die Fehlerklasse, die dieser ganze Auftrag behebt.

## Ausdrücklich nicht behandelt

- **Die bekannte, separat verfolgte `lang="de"`-Falschangabe der englischen Modul-App selbst**
  (`module-apps/englisch/vivodepot.html:2`). `index-weiterleitung-erzeugen.js` SPIEGELT diesen Wert
  bewusst, statt ihn zu korrigieren — die Korrektur liegt an anderer Stelle (Sprachmodul-Vererbung,
  eigener Strang) im Zugriff.
- **`module-apps/betriebssatz/`** wurde NICHT einzeln live nachgemessen (identischer Dateibestand
  wie `englisch/`, byte-identisch zur Wurzel laut Vorbericht) — mit hoher Sicherheit derselbe Fund
  und derselbe Fix, aber nicht selbst am Live-System bestätigt.
- **Der tatsächliche Ausliefer-Lauf gegen `vivodepot-ios-test`** (die echten Werkzeuge mit `--push`
  gegen das reale Zielrepo) ist NICHT Teil dieser ADR-Umsetzung — dieser ADR deckt den Code- und
  Test-Stand in `vivodepot-cleanslate`. Das tatsächliche Legen/Packen folgt als eigener,
  eingereihter Schritt (Landereihenfolge).
- **Ob `vivodepot.de` (die künftige v1-Seite) je auf diese Wurzel verlinken wird** — ausserhalb
  dieses Auftrags, GitHub Pages für den Hauptauftritt ist bewusst noch nicht angeschaltet
  (bestehende Entscheidung, hier unverändert).

## Konsequenzen

Ein gekürzter/abgetippter Link zu `vivodepot-ios-test` oder einer Modul-App landet ab dem nächsten
Auslieferungslauf auf der App statt auf einem 404. `sw.js`s Precache ist ab demselben Lauf
vollständig — nicht nur die Adresse antwortet, der Eintrag liegt nachweislich im Cache. Kein
Verhalten des Kerns selbst geändert; die Änderung liegt vollständig in den zwei Ausliefer-Werkzeugen
und einer neuen, generierten Datei je Ziel-Verzeichnis.

## Konformität

```konformitaet
aussage:  Die generierte Weiterleitungsseite leitet sofort auf ./vivodepot.html DESSELBEN
          Verzeichnisses weiter und übernimmt dessen <html lang> unverändert.
zustand:  geprüft
herkunft: invariante
pruefung: tests/index-weiterleitung-erzeugen.test.js#leitet sofort auf ./vivodepot.html weiter
pruefung: tests/index-weiterleitung-erzeugen.test.js#übernimmt die Sprache aus der Zieldatei — Deutsch
pruefung: tests/index-weiterleitung-erzeugen.test.js#übernimmt die Sprache aus der Zieldatei — Englisch
```

```konformitaet
aussage:  Fehlt <html lang> in der Zieldatei, wirft die Erzeugung statt eine Sprache zu raten.
zustand:  geprüft
herkunft: invariante
pruefung: tests/index-weiterleitung-erzeugen.test.js#fehlt <html lang>, wird geworfen statt geraten
```

```konformitaet
aussage:  testfassung-legen.js legt neben dem Vier-Dateien-Satz eine index.html ab; index.html
          gehört NICHT zu DATEISATZ.
zustand:  geprüft
herkunft: invariante
pruefung: tests/testfassung-legen.test.js#dateisatzUndIndexAblegen legt DATEISATZ plus eine index.html mit Weiterleitung ab
pruefung: tests/testfassung-legen.test.js#index.html gehört NICHT zu DATEISATZ — dessen Vier-Dateien-Vertrag bleibt unverändert
```

```konformitaet
aussage:  modul-app-packen.js legt für JEDE Modul-App (packeEinzeln UND packeAlle) eine eigene
          index.html ab, die auf ihr eigenes vivodepot.html zeigt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/modul-app-packen.test.js#dateisatzUndIndexAblegen legt DATEISATZ plus eine EIGENE index.html je Ordner ab
pruefung: tests/modul-app-packen.test.js#packeEinzeln UND packeAlle nutzen beide dateisatzUndIndexAblegen, keine eigene Kopier-Schleife mehr
```

**Zusätzlich, nicht über eine `konformitaet`-Klausel getrackt** (dieselbe Werkzeuggrenze wie bei
U2-ADR-185: `.spec.js` statt `.test.js`): `tests/e2e/precache-vollstaendigkeit.spec.js` prüft im
ECHTEN Browser gegen einen echten lokalen HTTP-Server, dass alle drei `SCHALE`-Einträge nach einem
echten Service-Worker-Install im Cache landen (grün-Fall) — und dass ohne `index.html` genau der
`'/'`-Eintrag fehlt, die anderen zwei aber weiterhin landen (Rot-Beweis, reproduziert den Fund des parallelen Strangs
auf Cache-Ebene).

---
*Vivodepot GmbH · Berlin · 01.09.2026*
