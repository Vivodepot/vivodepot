# U2-ADR-224: Boot-Wettlauf behoben — der vorDepot-Zweig überschreibt den bereits gezeigten Passwort-Eintritt nicht mehr

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** FEHLERBEHEBUNG, BOOT-KETTE
**Linie:** U2
**U2-Bezug:** U2-ADR-182 (Vor-Depot-Konfiguration, der Mechanismus, dessen Fehlschlag-Zeitpunkt den Wettlauf auslöst — bleibt selbst unangetastet) · U2-ADR-190 (Service-Worker-Update-Verhalten, geprüft und als Ursache ausgeschlossen) · U2-ADR-015 (Zwei-Ebenen-Persistenz, IndexedDB-Senke, deren Boot-Erkennung betroffen war)
**Anker:** eine Peer-Sitzung, weitergereicht von einer Produktfrage: übersteht ein neu angelegtes Depot einen echten Browser-Neustart, und findet die App es dann von selbst?
**Status heute:** gilt — gebaut, Beleg `tests/e2e/u2-adr-224-boot-read-absicherung.spec.js`.

---

## Kontext

Automatisierte Messung (echte Firefox/WebKit-Engines über `playwright`, echter Prozess-Neustart — `launchPersistentContext` + `close` + neuer Prozess, gleiches Profil) zeigte: nach einem echten Browser-Neustart erschien der Passwort-Eintritt für ein bestehendes, intern gespeichertes Depot nicht zuverlässig. Die Bürgerin hätte in diesem Fall denselben leeren Welcome-Screen gesehen wie beim allerersten Besuch — ihre Daten lagen unverändert und unverändert vorhanden auf dem Gerät, nur unsichtbar.

**Die Ursache:** `booteEingang()` startet zwei unabhängige, fire-and-forget laufende Zweige:

1. `booteInternenStandVielleicht()` — findet einen internen Stand, zeigt den Passwort-Eintritt (`renderCryptoOverlay(null, true)`, rendert u. a. `#co-pw`).
2. `vorDepotKonfigurationAnwenden().then(...)` — lädt `vorabkonfiguration.js` per `<script src>` (institutioneller Provisionierungs-Hook, U2-ADR-182). Diese Datei existiert auf einer Auslieferung ohne Institution nie — der Ladeversuch bricht bei jedem Boot regulär mit 404 ab. Vor diesem Fix rief der Zweig danach bedingungslos `renderWelcome()`, sobald `data` noch leer war — und `data` ist auch dann leer, wenn Zweig 1 gerade erst den Passwort-Eintritt gezeigt hat (noch nicht entschlüsselt).

**Löst Zweig 2 schneller auf als Zweig 1** (abhängig davon, wie schnell der 404 auf `vorabkonfiguration.js` zurückkommt — eine Frage der Zeitachse, nicht des Orts), **überschreibt er den gerade gezeigten Passwort-Eintritt lautlos mit dem leeren Welcome-Screen.**

**Acht geprüfte Ursachen-Hypothesen vor dem Fund, sechs davon widerlegt, eine (Service-Worker-Anwesenheit) empirisch bestätigt aber lange mechanistisch ungeklärt**, bevor die tatsächliche Ursache (dieser Wettlauf) feststand — u. a. Render-Race (ursprünglich vermutet, zu früh verworfen), App-seitige Speicher-Konkurrenz, Produkt-Kennung/Pfad-Divergenz, Durchschreib-Timing, veraltete Service-Worker-Fassung, Selbst-Reload bei Worker-Übernahme, Labor-Artefakt der Test-Automatisierung — inklusive einer selbst gefundenen Fehlzuordnung in der eigenen Messmethode (`page.route()`-Netzwerk-Injektion greift in einer zweiten Sitzung nicht zuverlässig, sobald ein Service Worker aktiv ist). Voller Verlauf in einem gesonderten, internen Messbericht dieses Tages festgehalten, außerhalb des Repos.

**Verworfen: ein Retry-Safeguard** (kein Schluss aus einem einzelnen leeren `internerStandVorhanden()`-Read, mehrfache Wiederholung mit sichtbarem `localStorage`-Merker bei Abweichung). Wurde probeweise gebaut, dann vollständig zurückgebaut, nachdem die echte Ursache (der Wettlauf) feststand und ein Fix an der eigentlichen Stelle allein 15/15 über drei Zeitfenster hielt — ein Sicherheitsnetz gegen ein Problem, das es (an dieser Stelle) nicht gibt, wäre nie wieder entfernt worden.

## Entscheidung

`vivodepot.html`, `booteEingang()`, vorDepot-Zweig — eine zusätzliche Bedingung, keine erzwungene Reihenfolge, kein `await`:

```js
if (!data) {
  if (!document.getElementById('co-pw') && typeof renderWelcome === 'function') renderWelcome();
  return;
}
```

Zweig 2 überschreibt nur noch, wenn der Passwort-Eintritt (`#co-pw`) nicht bereits sichtbar ist. Kostet im Normalfall (kein Wettlauf) nichts zusätzlich — die Bedingung wird nur in dem Zweig ausgewertet, der ohnehin schon lief.

**Kopplung, absichtlich, im Code kommentiert:** die Bedingung hängt an der DOM-ID `co-pw`. Der Rot-Beweis prüft dieselbe ID. Eine künftige Umbenennung muss beide Stellen gemeinsam nachziehen, sonst hört die Absicherung lautlos auf zu wirken, ohne dass ein Test das meldet.

`SCHALEN_STAND`/`sw.js` `CACHE`: v501 → v502, im Lockstep, wie bei jedem Schalen-Wechsel.

## Nebenbefund — `vorabkonfiguration.js` liefert 404, das ist Absicht

Vor jeder Änderung geprüft: **kein Defekt.** U2-ADR-182 dokumentiert den Mechanismus ausdrücklich als CSP-konformen Provisionierungs-Hook für institutionelle Auslieferungen; `tools/modul-app-packen.js` erzeugt die Datei je Modul-App-Slug — die Wurzel-Auslieferung bekommt bewusst keine, 404 ist dort der korrekte Regelfall. **Blockiert nicht:** U2-ADR-182 selbst, wörtlich, unter „Betroffener Weg": *„booteEingang() (fire-and-forget vor renderWelcome())"* — keine Bürgerin wartet auf diesen Fehlschlag, er lief (vor diesem Fix) dem Boot-Ergebnis nur manchmal den Rang ab.

## Verifikation

`tests/e2e/u2-adr-224-boot-read-absicherung.spec.js` — eigener lokaler Server, künstlich einstellbare Verzögerung auf der `vorabkonfiguration.js`-404-Antwort, **keine Netzwerk-Injektion** (die reale, gefixte Datei wird ausgeliefert, Service Worker registriert sich normal gegen `localhost`).

| Verzögerung (Navigation/Konfig) | Ungefixt | Mit Fix |
|---|---|---|
| 0ms / 0ms | 5/5 rot | 5/5 grün |
| 50ms / 100ms | — | 5/5 grün |
| 150ms / 400ms | — | 5/5 grün |

Volle Suite: `playwright test` 242/243 grün (ein pre-existing, unabhängiger Fehlschlag in `stresstest-04-papierlaenge.spec.js` — eigener Zuschnittsfehler der Probe selbst, ganzzahlige Seitenzahl gegen echtes Größer-als verglichen, kein Bau daraus, s. Bericht). `node --test` grün nach Nachzug von `STANDARDS.md` (SCHALEN_STAND-Zahl) und dieser ADR-Datei.

**Nachtrag (03.09.2026):** der Satz „kein Bau daraus" stand zu Recht, solange die Probe selbst am
falschen Vergleich hing — 500 gegen 3.000 Zeichen bleiben im vollen `vollDepotModell()` auf
derselben Seite, weil die anderen zwölf Bereiche Seite 1 und 2 schon füllen; die Behebung vom
22.08. (`e4ad82f5`) trägt trotzdem, gemessen bis 200.000 Zeichen (56 Seiten). Seit heute ist
`stresstest-04-papierlaenge.spec.js` grün: eine grobe Zusicherung (500 gegen 200.000, volles
Modell) und eine feine (500 gegen 3.000, schlankes Modell ohne die anderen Bereiche) ersetzen den
einen zu engen Vergleich. Der obige Satz bleibt stehen, weil er erklärt, warum die Probe so lange
rot stand — nicht weil er noch gilt.

## Ausdrücklich nicht behandelt

- Der genaue Mechanismus, WARUM die Service-Worker-Anwesenheit die Zeitachse verschiebt (Cache-API-Auslieferung vs. direkter Netzwerk-Fetch) — Korrelation empirisch belegt (0/5 mit aktivem Worker gegen 4/5 mit `serviceWorkers:'block'`, vor diesem Fix), Mechanismus nicht bis auf Browser-Interna zurückverfolgt. Ändert nichts an der Richtigkeit des Fixes.
- Der jetzt zum ersten Mal nach einem gelungenen Neustart regulär erreichbare Wahl-Dialog (`standKonfliktModell()`/`flowStandKonfliktDialog()`, Datei-vs-interner-Stand-Konflikt) — vorher durch das Boot-Problem faktisch nie erreicht, jetzt erreichbar, noch nicht eigens end-to-end geprüft.
- Chrome als Drittvergleich; reale Firefox/Safari-Installation der Nutzerin (Zugriff verweigert).
- Die Diskrepanz zwischen 100 % Labor-Reproduktion und der berichteten Erinnerung, den leeren Startbildschirm nie erlebt zu haben (erinnert wird der Wahl-Dialog, der gelungenen Boot voraussetzt) — plausibel durch den jetzt gefundenen Wettlauf erklärbar (die Bedingungen, unter denen der 404 schneller auflöst als der Boot, sind nicht bei jeder Maschine/jedem Netzwerk gleich wahrscheinlich), nicht abschließend verifiziert.

## Konsequenzen

Ein neu angelegtes oder bestehendes Depot im internen Speicher-Modus (gehostet) ist nach einem echten Browser-Neustart zuverlässig auffindbar, unabhängig davon, wie schnell die optionale Vor-Depot-Konfiguration auflöst. Der Datei-vs-interner-Stand-Wahl-Dialog wird dadurch zum ersten Mal regulär nach einem Neustart erreichbar.

## Konformität

```konformitaet
aussage:  Nach einem echten Browser-Neustart zeigt ein Depot im internen Speicher-Modus
          den Passwort-Eintritt zuverlässig, unabhängig von der Auflösungsgeschwindigkeit
          der optionalen Vor-Depot-Konfiguration.
zustand:  geprüft
herkunft: fund
pruefung: tests/e2e/u2-adr-224-boot-read-absicherung.spec.js#U2-ADR-224: Depot nach echtem Prozess-Neustart auffindbar (Boot-Wettlauf gegen vorDepot-Konfig-404)
```

---
*Vivodepot GmbH · Berlin · 02.09.2026*
