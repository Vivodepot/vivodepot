# U2-ADR-238 · Depot-Pillen-Menü schließt nicht mehr über den Fokus als Stellvertreter

**Datum:** 03.09.2026
**Status:** Angenommen · gebaut 03.09.2026 (Suite grün) · Abnahme in echtem Safari steht aus
**Status heute:** gilt, mit offenem Punkt (s. §4)
**Bezug:** Zug 5 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026, `tests/e2e/zug5-depot-pille-menue.spec.js`) ·
U2-ADR-184 (Sub-Depot-Klick-Freeze, geprüft und NICHT derselbe Mechanismus, s. §1)

---

## 1 · Kontext

Meldung: in Safari auf dem Mac (Version 26.6.2) öffnete das Depot-Pillen-Menü
(„Mein Depot" ▾ in der Kopfzeile) mit beiden sichtbaren Einträgen — aber „Depots, die ich
aufbewahre" reagierte nicht auf einen Klick. „Mein Depot" (der erste Eintrag) ging. Die
verwaltete-Depots-Liste war zu diesem Zeitpunkt leer (sie wollte gerade das erste Sub-Depot
anlegen) — dieselbe leere Liste funktionierte in Firefox anstandslos, damit scheidet „der
Menüpunkt tut ohne Inhalt nichts" als Erklärung aus.

Vor dem Bau geprüft: **U2-ADR-184** („Sub-Depot-Klick-Freeze") beschreibt einen anderen
Mechanismus — ein Aufräum-Wächter in `renderWelcome()`, der nach dem Nullen von `data` nicht
feuerte, weil `data` zu diesem Zeitpunkt schon null war (ein Render-Bug beim Verlassen eines
Depots, nicht eine Klick-Verdrahtung). Keiner der drei dort offenen Folgeposten trifft diesen
Bug.

**Sechs Reproduktionsversuche vor dem eigentlichen Befund, alle erfolglos** (dokumentiert im
Bericht, nicht wiederholt hier): die bestehende Playwright-Probe gegen Chromium, gegen
echtes Desktop-WebKit, gegen WebKit mit iPhone-Touch-Profil, mit einem echten angelegten
Sub-Depot, und ein echter Finger-Tap im iOS-Simulator (Mobile Safari) — alle ließen den Klick
durchgehen. Das lag an einer falschen Prämisse: die erste Meldung wurde als iPhone gelesen, gemeint
war aber Safari **auf dem Mac**. Damit erklärt sich auch, warum nichts griff —
**Playwrights WebKit ist nicht Safari.app** (gleiche Rendering-Maschinerie, andere
Fokus-/Klick-Voreinstellungen), und der iOS-Simulator ist iOS, nicht macOS.

---

## 2 · Entscheidung

**Der Fund, nach Korrektur des Zielgeräts:** macOS Safari gibt einem `<button>` beim Klick
standardmäßig **keinen Fokus** (Systemvoreinstellung „Tastaturnavigation" — anders als Chrome
und Firefox, die das systemunabhängig immer tun). `depotMenueOeffnen()` fokussiert beim Öffnen
programmatisch den ERSTEN Eintrag. Klickt die Nutzerin auf den ZWEITEN:

- der erste Eintrag verliert seinen (programmatisch gesetzten) Fokus,
- der zweite bekommt dafür **keinen** (macOS-Safari-Voreinstellung),
- `document.activeElement` landet auf `document.body` (oder verschwindet aus dem Wrapper),
- der bisherige Schließ-Mechanismus (`focusout` auf `.depot-pille-wrap` +
  `requestAnimationFrame`, der prüfte, ob der NEUE Fokus noch im Wrapper liegt) sieht das als
  „Fokus hat den Wrapper verlassen" und schließt das Menü — **bevor** der eigentliche `click`
  (der erst nach `mouseup` kommt) den zweiten Eintrag überhaupt erreicht.

Der erste Eintrag ging nur, weil er den Fokus schon VOR dem Klick hatte — kein Fokuswechsel
nötig, kein Wettlauf gegen den Klick.

**Der Fehler lag darin, Fokus als Stellvertreter für „wurde geklickt" zu nehmen.** Das ist in
Chrome/Firefox meist richtig (sie fokussieren geklickte Buttons), in macOS Safari systematisch
falsch.

**Der Fix trennt zwei eigenständig richtige Wege statt eines Stellvertreters:**

- **Maus/Touch — „Klick außerhalb schließt":** ein `pointerdown`-Listener auf `document`, der
  prüft, ob das Ereignis-Ziel außerhalb `.depot-pille-wrap` liegt. Unabhängig vom
  Fokus-Verhalten des Browsers.
- **Tastatur — „Tab hinaus schließt":** ein `focusin`-Listener auf `document`, der prüft, ob das
  NEU fokussierte Element außerhalb liegt. Tab verschiebt den Fokus in JEDEM Browser echt — die
  macOS-Eigenart betrifft nur den Klick, nicht die Tastatur-Navigation.

Der programmatische Fokus auf den ersten Eintrag beim Öffnen **bleibt unverändert** — das ist
gute Tastatur-Bedienung (WAI-ARIA Menu-Button-Muster), nicht die Fehlerursache. Escape,
ArrowUp/ArrowDown (Wrap-around zwischen den Einträgen) bleiben ebenfalls unverändert.

---

## 3 · Umsetzung

`depotMenueVerdrahten()` (`vivodepot.html`, Funktion `function depotMenueVerdrahten()`): der
Block `wrap.addEventListener('focusout', …)` (samt seiner Idempotenz-Markierung
`wrap.__zug5FocusoutVerdrahtet`) ist ersetzt durch zwei `document`-Listener
(`pointerdown`, `focusin`), beide gegen `.depot-pille-wrap` geprüft, beide nur aktiv, wenn das
Menü gerade offen ist (`!m.hidden`). Eigene Idempotenz-Markierung
`document.__zug5DepotMenueAussenVerdrahtet` (dieselbe Mehrfachbindungs-Sorge wie zuvor —
`renderTopbar()` kann mehrfach laufen).

Kein anderer Aufrufer, kein anderes Verhalten geändert: `depotMenueOeffnen()`,
`depotMenueSchliessen()`, `depotMenueToggle()`, die Klick-Handler der beiden Einträge und die
Tastatur-Handler (Escape/ArrowUp/ArrowDown) sind unangetastet.

---

## 4 · Rot-Beweis — und was er NICHT beweist

**Reproduziert wurde der Mechanismus, nicht der Browser.** Kein Zugriff auf echtes Safari.app in
dieser Kette: `computer-use` sperrt Browser auf Stufe „read" (Screenshots, keine Klicks), die
`claude-in-chrome`-MCP ist echtes Chrome, der iOS-Simulator ist iOS statt macOS, und Playwrights
WebKit-Engine ist — wie dieser Auftrag selbst zeigte — nicht dasselbe Programm wie Safari.app.

Die drei neuen Proben in `tests/e2e/zug5-depot-pille-menue.spec.js` bilden die BEKANNTE
macOS-Eigenart nach (kein simulierter Klick — der Fokus-Verlust selbst wird nachgestellt:
`document.getElementById('tb-depot-menue-liste').blur()`, gefolgt von `document.body.focus()`,
damit `document.activeElement` genau dorthin landet, wo ein Button-Klick ohne Fokus-Übertragung
ihn hinterlässt) und prüfen den alten Mechanismus direkt:

1. **`[U2-ADR-238·Rot-Beweis]`** — vorher rot: das Menü schloss sich allein durch den
   nachgestellten Fokus-Verlust (`hidden` wurde `true`, bevor überhaupt ein Klick versucht
   wurde). Nachher grün: bleibt offen.
2. **`[U2-ADR-238]` „…öffnet die Verwaltete-Depots-Sicht auch NACHDEM der Fokus zuvor ins Leere
   ging"** — vorher rot: `page.click()` auf den (bereits unsichtbaren) Button lief in einen
   30-Sekunden-Timeout. Nachher grün.
3. **Zwei Regressions-Wächter**, damit der Fix nicht die falschen Wege repariert: Klick
   außerhalb schließt weiterhin (jetzt über `pointerdown`), Tab aus dem letzten Eintrag heraus
   schließt weiterhin (jetzt über `focusin`) — beide bereits VORHER grün (Chromium fokussiert
   Buttons normal), bleiben es.

Alle acht Bestandsproben in derselben Datei bleiben unverändert grün, ebenso die 16 Node-Proben
in `tests/zug5-depot-pille-menue.test.js` und `tests/depot-pille-trefferflaeche.test.js`.

**Was aussteht:** die Abnahme in echtem Safari 26.6.2 auf dem betroffenen Mac — dreißig
Sekunden, aber nicht Teil dieser Kette. Bis dahin gilt: der beschriebene Mechanismus ist
schlüssig aus dem Code hergeleitet und passt zur gemeldeten Asymmetrie (erster Eintrag geht,
zweiter nicht), ist aber ein Befund aus Lesung + nachgestellter Probe, kein Befund aus einem
beobachteten echten Safari-Lauf. **Solange diese Abnahme nicht stattgefunden hat, gilt der
Mechanismus als plausibel hergeleitet, nicht als am Browser bestätigt.**

---

## 5 · Geprüft und bewusst nicht angefasst

**35 ungewachte `:hover`-Regeln** im ganzen Haus (keine hinter `@media (hover: hover)`) wurden
bei der Suche nach der Ursache gefunden und als eigener, unabhängiger Posten notiert — nicht als
Teil dieses Fixes gebaut. Sie sind eine andere, ältere WebKit-Eigenart (Touch-Geräte, nicht
macOS-Fokus) und hätten die Asymmetrie zwischen erstem und zweitem Eintrag nicht erklärt.

---

*Vivodepot GmbH · Berlin · 03.09.2026*
