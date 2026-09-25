# U2-ADR-221: Barrierefreiheits-Sichten-Lücke geschlossen (Verwaltungs-Liste + Entsiegeln-Dialog) — und die Serif-Ausnahme dokumentiert

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** BARRIEREFREIHEIT, DOKUMENTATION
**Linie:** U2
**U2-Bezug:** U2-ADR-174 (Vorgänger-Fund derselben axe-Scan-Lücke, anderes Feature) · U2-ADR-211
(Sicherungsstand — unbeteiligt, im selben Bild nur mitgesehen und dort bestätigt
bereits sichtbar platziert)
**Anker:** Bauauftrag, 02.09.2026, aus einem Fund am laufenden v501: die
Verwaltungs-Ansicht für eingehängte Sub-Depots zeigte eine ältere wirkende Gestaltung als im
Rest der App. Vier Nachträge im Verlauf desselben Auftrags (Dialoge, Name in Serife/Grün,
Farbfrage, eigene Gegenprobe am eigenen Depot) haben den Auftrag von „ganze Ansichten-Familie" auf
zwei konkrete, unabhängig voneinander stehende Punkte verengt.
**Status heute:** gilt — Beleg `tests/konformitaet/wcag-axe.mjs` (zwei neue Sichten), Prosa-
Ergänzung in `vivodepot-style-guide.html` Abschnitt 3.1.

---

## Kontext

Eine vorgelagerte, rein lesende Erhebung (02.09.2026) hat den ursprünglichen Verdacht — eine
ganze, aus einer älteren Gestaltungs-Ära stammende Ansichten-Familie — nicht bestätigt. Drei
Teil-Ergebnisse:

1. **Die Karten-Ansicht selbst ist aktuell.** `renderVerwalteteDepots()` nutzt durchgängig
   heutige Klassen/Token, mit Kommentaren vom 27.08.2026 (Gesamtbild-UX-Konzept).
2. **Der Name in Serife/Grün auf dem Sektor-Deckblatt ist keine Abweichung zwischen Anker- und
   Sub-Depot**, sondern eine EINE, geteilte Render-Funktion (`deckblattHTML()`) — von der
   per Gegenprobe am eigenen Depot bestätigt: dieselbe Serife, dieselbe Farbe an
   beiden Stellen. Die Farbe (`--salbei-dunkel`) stimmt ohnehin mit den `h2`-Überschriften
   überein; nur die Schriftfamilie ist eine bewusste, getestete Ausnahme
   (`tests/schrift-serif-drei-rollen.test.js`, Auftrag 04.08.2026) — die der Gestaltungsleitfaden
   bislang nur mechanisch in einer Klassentabelle listete, ohne sie in Worten zu erklären.
3. **Ein zunächst vermuteter dritter Punkt — eine CSS-Selektor-Lücke, die alle In-App-Dialog-
   Eingabefelder auf rohen Browser-Standard zurückfallen ließe — hat sich unter echter Messung
   NICHT bestätigt.** Der ursprüngliche Befund beruhte auf einer Suche nach dem Selektor
   `#modal-inhalt input`, die eine bereits bestehende, funktionierende `.modal input`/
   `.modal label`-Regel (Klassenselektor statt ID-Selektor) übersah. Cross-Engine-Messung mit
   Playwright (Chromium, WebKit, Firefox — dieselbe isolierte `ui.modal()`-Aufrufform wie
   `flowSubDepotEntsiegeln`, echter Mausklick ins Feld statt nur `.focus()`) zeigt in allen drei
   Engines identisch korrekt gestaltete Rahmen, Innenabstände UND einen korrekt eingefärbten
   Fokusring (`2px solid rgb(28,42,30)`, `:focus-visible` matcht auch nach Mausklick). Git-Beleg:
   `.modal input`/`.modal label` standen bereits wortgleich im Commit `a2a802c`
   (`SCHALEN_STAND='v489'`, direkt aus der Datei gelesen) — der Fassung, die die Tester bis zum
   Nachmittag des 02.09.2026 sahen. **Diese Hypothese wird hier bewusst als geprüft und verworfen
   festgehalten, nicht stillschweigend fallengelassen** — Fehleinschätzungen gehören genauso
   dokumentiert wie Funde. **Firefox als dritte Engine bestätigt dasselbe Ergebnis** (identischer
   isolierter Aufbau, echter Mausklick: `2px solid rgb(28,42,30)`, `:focus-visible` matcht) — damit
   ist die App-Seite abgeräumt. Die Ursache für das beobachtete Bild liegt, wenn überhaupt, am
   jeweiligen Gerät — nicht an unserem Code.

**Der eigentliche Fund dieses Auftrags liegt darum nicht in dem, was gefunden wurde, sondern in
dem, was fehlt.** Der Kern enthält keine einzige `prefers-contrast`- oder `forced-colors`-
Media-Query — **nicht „nichts gefunden", sondern „keine Vorkehrung existiert".** Trägt das Gerät
einen erhöhten Systemkontrast, zeichnet Betriebssystem/Browser den Fokusrahmen
vollständig außerhalb der App-Kontrolle — eine naheliegende Erklärung für das beobachtete Bild.
Das wiegt schwerer, als es klingt: Unter `forced-colors` kann das Betriebssystem die eigenen
Farb-Token der App schlicht überschreiben — bei einer Anwendung, deren Bedienung an Farbe hängt
(Grün für vollständig, Warnton für Fehlzustände), ist ungeprüft, ob davon nach dem Überschreiben
noch etwas Bedienbares übrig bleibt. Das betrifft exakt die Nutzerinnen, die erhöhten Kontrast
einschalten, weil sie schlecht sehen — Barrierefreiheit, keine Geschmacksfrage. Festgehalten als
„ausdrücklich nicht behandelt" unten, mit einem Zuschnitt, der als eigener Auftrag taugt.

## Entscheidung

**Zwei unabhängige, kleine Ergänzungen — kein Gestaltungsumbau.**

### 1 · Zwei neue Sichten im axe-core-Lauf

`tests/konformitaet/wcag-axe.mjs` enthielt bereits `versuch('sub-depot-kontext', …)` — öffnet ein
Sub-Depot aber PROGRAMMATISCH über die JS-Funktionen, unter Umgehung sowohl der Verwaltungs-Liste
als auch des Entsiegeln-Dialogs. Gescannt wurde bislang nur, was NACH dem Betreten steht, nie der
Weg dorthin. Zwei neue `versuch()`-Einträge schließen das:

- `verwaltete-depots` — die Karten-Übersicht mit einem versiegelten Sub-Depot-Eintrag (dem
  Normalzustand eines noch nicht geöffneten Sub-Depots).
- `sub-depot-entsiegeln-dialog` — ruft `flowSubDepotEntsiegeln(depotUUID)` direkt, öffnet den
  Passwort-Dialog.

**Echter Lauf, Ergebnis ehrlich gemeldet:** 39 Sichten gescannt (vorher 37), **0 mit Violations**.
Kein neuer Befund — aber die Lücke bestand vorher trotzdem, unabhängig davon, ob dort etwas
gefunden worden wäre. Das ist der vierte Fund derselben Art in dieser Nacht (nach U2-ADR-174 und
zwei weiteren, hier nicht dokumentierten Fällen): **ein Wächter, der eine Fläche nicht erreicht
und darum grün bleibt, misst schmaler, als sein Name verspricht** — unabhängig vom Ergebnis, das
er liefert, wenn er sie erreicht.

### 2 · Die Serif-Ausnahme in Worten, nicht nur in einer Tabellenzeile

`vivodepot-style-guide.html`, Abschnitt 3.1 (Schrift-Familien), trug bisher nur eine veraltete
Kurzbeschreibung („narrativer Fließtext, Wizard-Fragen, Logo-Wort") — zwei der ursprünglich fünf
Rollen (`.welcome-wort`, `.wizard-frage`) sind seit dem 25.08.2026 längst auf Inter umgestellt
(UX-Konzept §9/§12), die Beschreibung war das nicht nachgezogen. Ersetzt durch die drei tatsächlich
verbliebenen Klassen (`.logo`, `.frage`, `.deckblatt-name`) und einen eigenen Absatz, der die
Herkunft (Auftrag 04.08.2026), die mechanische Regel (Serif nie zusammen mit Kursiv UND der
hellsten Textfarbe `--ink3`, gepinnt in `tests/schrift-serif-drei-rollen.test.js`) und die
Konsequenz ausdrücklich benennt: „Wer die Serif an einer dieser drei Stellen auf Inter umstellt,
korrigiert keinen Fehler." Reine Dokumentation, keine Code-Änderung, keine `konformitaet`-Klausel
(Prosa, keine automatisierbare Invariante).

## Verworfene Alternative

**Die `#overlay-inhalt`-Selektor-Regel um `#modal-inhalt` erweitern.** Das war der ursprüngliche
Plan für einen dritten Teil dieses Auftrags. Verworfen, weil die zugrundeliegende Prämisse unter
echter Cross-Engine-Messung nicht standhielt (s. Kontext) — eine Erweiterung hätte zwei bereits
funktionierende, sich überlappende Regeln auf drei reduziert, aber kein beobachtbares
Fehlerbild behoben, weil keines gefunden wurde.

## Ausdrücklich nicht behandelt

- **`prefers-contrast`/`forced-colors`** — null Treffer im gesamten Kern, hier nur benannt, nicht
  gebaut. Zuschnitt für einen eigenen Folgeauftrag, damit er als Messauftrag taugt statt als bloße
  Lücken-Meldung: (a) Verhält sich die App unter `forced-colors: active` überhaupt noch bedienbar
  — bleiben Knopf-Grenzen, Fokus, deaktivierte Zustände sichtbar, wenn das Betriebssystem die
  Farb-Token überschreibt? (b) Trägt eine der funktionstragenden Farben (Grün „vollständig",
  Warnton „Fehlzustand", Status-Ampel) Bedeutung, die OHNE Farbe verloren geht — gibt es ein
  Text-/Symbol-Äquivalent, oder hängt die Aussage an der Farbe allein? (c) Existiert überhaupt ein
  Prüfpfad dafür (axe-core prüft `forced-colors` nicht automatisch mit) — müsste eigens gebaut
  werden. Produkt-/Barrierefreiheits-Entscheidung, keine, die dieser Auftrag beantwortet.
- **Das tatsächliche Gerät/der tatsächliche Kontrast-Zustand beim gemeldeten Fund** — nicht von hier
  prüfbar, ausdrücklich nicht vermutet.
- **Ein Gestaltungsdurchgang durch die Verwaltungs-Ansicht** — nicht nötig, die Ansicht ist
  bereits aktuell (s. Kontext, Punkt 1).

## Konsequenzen

Zwei zusätzliche Sichten laufen ab sofort bei jedem `wcag-axe.mjs`-Lauf mit — ein künftiger
Verstoß in der Verwaltungs-Liste oder im Entsiegeln-Dialog wird ab jetzt gefunden, vorher wäre er
lautlos durchgelaufen. Der Gestaltungsleitfaden kann die Serif-Ausnahme nicht mehr aus Versehen
als „drei vergessene Zeilen" lesen. Am eigentlichen Code hat sich nichts geändert — nur was
geprüft und was dokumentiert wird.

## Konformität

```konformitaet
aussage:  Die axe-core-WCAG-Prüfung scannt zusätzlich die Verwaltungs-Karten-Übersicht
          (mit einem versiegelten Sub-Depot-Eintrag) und den "Depot entsiegeln"-Dialog —
          beide vorher nicht erreicht, weil der bestehende sub-depot-kontext-Versuch
          programmatisch an ihnen vorbei öffnet.
zustand:  geprüft
herkunft: invariante
pruefung: tests/konformitaet/wcag-axe.mjs#[Konformität] axe-core WCAG 2.2 AA über alle V1-Sichten
```

---
*Vivodepot GmbH · Berlin · 02.09.2026*
