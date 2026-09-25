# U2-ADR-237: Jede Änderung sichert still intern — die Datei wird eine eigene, seltene Sicherungskopie

**Status:** Angenommen
**Datum:** 03.09.2026 (spätabends)
**Kategorie:** ARCHITEKTUR, PERSISTENZ, PRODUKTPHILOSOPHIE
**Linie:** U2
**U2-Bezug:** Nimmt U2-ADR-015s Prinzip „vier bewusste Save-Punkte, kein stilles Auto-Save" für den
internen Arbeitsstand ausdrücklich zurück (Begründung unten). Lässt U2-ADR-031 (Persistenz
ehrlich) UNVERÄNDERT — verschiebt nur, worauf sich „gespeichert" bezieht. Lässt U2-ADR-223 („Die
Datei ist das Depot") UNVERÄNDERT — der interne Speicher bleibt Zwischenspeicher, wird nur
verlässlicher gefüllt. Löst die technische Frage, die U2-ADR-223 selbst offen ließ („wann und wie
die Datei aktuell gehalten wird … bleibt eine eigene Entscheidung") — indem es sie umdreht: nicht
die Datei wird häufiger aktuell gehalten, sondern der interne Stand, der die Datei ersetzt, bis sie
gebraucht wird. Baut auf dem bereits bestehenden `booteInternenStandVielleicht()` (U2-ADR-224, D43
Etappe 5) und dem Rückweg-Garant aus U2-ADR-185 auf, ohne beide zu ändern — sie waren bereits
richtig, ihnen fehlte nur ihre Voraussetzung: ein tatsächlich gefüllter interner Stand.
**Anker:** Wörtlich, zwei Zitate desselben Abends: „Wenn immer ich eine Sache
eintrage (Geschlecht, Geburtsdatum) → Jetzt sichern → Jetzt als Datei sichern. Ich sichere, trage
die Adresse ein → wieder" — und, als die eigentliche Abnahmebedingung: „Ich will: Datei öffnen,
anlegen, befüllen, speichern, schließen, wieder öffnen, daten da, weitermachen. Wie jede andere
beknackte App auch."
**Status heute:** gilt, gebaut.

---

## Kontext

### Zwei Beschwerden, eine Ursache, zwei falsche vorherige Antworten

Am 24.08.2026 wurde derselbe Ablauf bereits einmal beschrieben (Testrunde v1.0-rc.367):
ein Feld eintragen, „1 ungespeicherte Änderung", Klick auf Sichern erzeugt eine neue Datei und
fragt „ist sie angekommen?". Eine interne Entscheidungsvorlage entstand am selben Tag, mit drei
Optionen (A: erst beim Schließen, B: eigener Menüpunkt, C: Takt) — blockiert auf eine Messung
(Grant-Quote von `navigator.storage.persist()` in Firefox/Safari), die zehn Tage lang nie gemacht
wurde.

Bereits VOR dieser Vorlage, am 09.08.2026, lag die eigentliche Ursache schon einmal in einer
internen Notiz benannt vor: fünf Dateien in fünf Minuten und die Codezeile — `depotInDateiSichern()`
kehrte auf dem Download-Weg (`weg === 'download'`) vorzeitig zurück, OHNE `markiereGespeichert()`
aufzurufen. Wörtlich aus dem Fund: „Es gibt keine Handlung in der Anwendung, die ihn auf null
bringt." Auch dieser Fund führte zu keinem Bau.

Beide Vorlagen gingen von derselben, nie geprüften Annahme aus: dass die DATEI der Weg bleibt, der
öfter oder seltener bedient werden muss — nur die Frequenz stand zur Debatte. Die eigentliche
Messung zeigt etwas Schärferes: **der interne Speicher (D43 / U2-ADR-015), der genau für diesen
Fall gebaut wurde, wurde nie gefüllt.** `depotInIdbSichern()` hing an sechs Stellen im Kern (in
diesem Bau: `depotInternSichern()`, der zwei Aufrufe aus dem Sub-Kontext-Zweig und dem
Nicht-Sub-Zweig, sowie die Passwortwechsel- und Konfliktwahl-Pfade) — jede einzige an einer
EXPLIZITEN Datei-Aktion (Sichern, Laden, Konfliktwahl, Passwortwechsel). Keine hing an
`markiereUngespeichert()`, der Funktion, die bei JEDEM Feld-Eintrag läuft. Kein `setInterval` im
gesamten Kern. Weder bei der Depot-Anlage noch nach einem einzelnen Feld-Eintrag lag je etwas in
IndexedDB — zweifach empirisch im echten Browser gemessen (echtes Chromium, `http://`, kein
`file://`; FSA-Picker gezielt gestubbt, um denselben Legacy-Pfad wie Firefox/Safari zu erzwingen).

### Warum das speziell auf ihrem Testgerät zuschlägt

Das Testgerät in diesem Fall ist ein iPhone. DuckDuckGo, Edge und die installierte App sind dort —
wie jeder Browser auf iOS — WebKit, ohne `showSaveFilePicker`. Der Download-Weg ist der einzig
mögliche. Damit ist `_ungespeicherteAenderungen` auf diesem Gerät praktisch dauerhaft ungleich
null: der 09.08.-Fund (`markiereGespeichert()` fehlt auf dem Download-Weg) UND die hier behobene
Lücke (nichts schreibt zwischendurch intern) verstärken sich gegenseitig. Die Pille kann dort gar
nicht verschwinden.

### Eine Berichtigung, ausdrücklich hier festgehalten

Ein interner Übergabe-Stand desselben Tages behauptet: „das Genörgel ist weg". Die zugehörige,
ebenfalls interne Bauvorlage vom selben Tag trägt selbst den Kopf „Kein Code, keine
Repo-Änderung". Live beobachtet (vor dieser ADR, an einem früheren Kanon-Stand desselben Zweigs):
ein einzelnes Feld schaltet die Pille sofort auf „1 ungespeicherte Änderung · Jetzt als Datei
sichern" — unverändert gegenüber der Beschwerde vom 24.08. Die Behauptung „Genörgel ist weg" traf
auf den geprüften Kanon nicht zu.

## Die Entscheidung

**U2-ADR-015s Satz „vier bewusste Save-Punkte, kein stilles Auto-Save" wird für den internen
Arbeitsstand zurückgenommen.** Diese Entscheidung war für Geräte mit funktionierender
Datei-Schnittstelle gedacht — dort bedeutet ein bewusster Save-Punkt tatsächlich eine bewusste
Handlung. Auf WebKit — jedem Browser auf iPhone/iPad — bedeutet derselbe Satz in der Praxis „nach
jedem Feld eine neue Datei mit Zeitstempel". Das war nicht gemeint, und es ist an der Wirklichkeit
gescheitert: eine Regel, die auf einer Geräteklasse das Gegenteil dessen bewirkt, was sie
verspricht, ist auf dieser Geräteklasse keine geltende Regel mehr.

**Jede Änderung schreibt jetzt still in die interne Ablage — kein Klick, keine Pille, keine
Aufforderung.** Die Datei wird ein eigener, seltener Vorgang: „Sicherungskopie erstellen".

## Was gebaut wurde

1. **Stilles Schreiben nach jeder Änderung.** `markiereUngespeichert()` stößt jetzt
   `_internAutoSpeichern()` an — eine über `_internAutoSaveKette` serialisierte Kette, die
   `depotInternSichern({ still: true })` ruft, wenn `internerSpeicherModus()` gilt. Serialisiert,
   damit zwei schnell aufeinanderfolgende Änderungen nicht zwei überlappende
   `depotSerialisieren()`-Läufe gegeneinander laufen lassen.
2. **Öffnen macht weiter — bereits vorhanden, nicht neu gebaut.** `booteInternenStandVielleicht()`
   (U2-ADR-224, D43 Etappe 5) prüft beim Boot bereits, ob ein interner Stand vorliegt, und zeigt
   dann direkt den Passwort-Eintritt (`renderCryptoOverlay(null, true)`, kein Datei-Picker).
   Dieser Mechanismus fand vor diesem ADR nur nie etwas — weil nichts hineinschrieb. Er ist durch
   diese ADR nicht verändert, nur endlich mit Inhalt versorgt.
3. **Der Zähler bezieht sich auf die interne Ablage.** `saveStatusModell()` bekommt einen fünften,
   jetzt normalen Ruhezustand `intern-aktuell` (`knopfAktiv: false`) für „Zähler 0, kein aktueller
   Datei-Stand" — vorher fiel dieser Fall auf `keine-datei` mit alarmierendem Wortlaut und aktivem
   Knopf. `keine-datei` bleibt als Fallback für den einzigen Fall, in dem es noch ehrlich ist:
   kein `internerSpeicherModus()` (z. B. `file://`-Herkunft) — dort gibt es tatsächlich keinen
   stillen Weg, und der alte, dringlichere Wortlaut bleibt richtig.
4. **Die Datei wird ein eigener, seltener Vorgang.** Neuer Menüpunkt „Sicherungskopie erstellen"
   im „Mein Depot"-Menü, ruft `depotInDateiSichern()` direkt. `saveKnopfDateiWeg()` verliert die
   vor zwölf Stunden gebaute Konstante `true` (Speicher-Modell Stück 3, 03.09. vormittags) wieder
   — sie war für einen halben Tag richtig, unter der jetzt zurückgenommenen Prämisse „jedes Feld
   braucht ohnehin einen Klick". Die Pillen-Knopf-Aktion (fast nur noch im vierten,
   fehlgeschlagen-Zustand aktiv) geht wieder über den internen Weg, wenn er verfügbar ist — ein
   Fehlschlag-Retry soll die interne Sicherung erneut versuchen, nicht die Firefox/Safari-Dateiflut
   zurückholen, die Stück 3 ursprünglich beenden sollte (dieser Befund selbst bleibt unverändert
   gültig).

### Ein Konflikt darf nie interaktiv unterbrechen, wenn er still entstand

`depotInternSichern()` bekommt eine `still`-Option: erkennt sie einen Multi-Tab-Konflikt (ein
anderes Fenster hat inzwischen geschrieben), zeigt sie NICHT den interaktiven Konflikt-Dialog —
der würde sonst bei jedem Feld aufreißen, statt einmal beim bewussten Sichern. Ein stiller
Konflikt bleibt als vierter Zustand sichtbar (`fehlgeschlagen`), löst sich aber nicht automatisch
zugunsten einer Seite auf. Der explizite „Sicherungskopie erstellen"-Weg und ein bewusster
Knopf-Klick behalten den interaktiven Dialog unverändert.

### Die Auflage, unverändert aus U2-ADR-031: „gespeichert" nur nach bestätigtem Schreiben

Diese Umstellung rettet die Ehrlichkeitsregel vom 08.08.2026, statt sie zu brechen: Bisher behauptete
die Anwendung „gespeichert" implizit über einen Download, den sie nicht bestätigen kann — deshalb
zeigte sie im Zweifel lieber dauerhaft „nicht gespeichert". Die interne Ablage KANN ihr eigenes
Schreiben bestätigen (eine normale IndexedDB-Transaktion liefert Erfolg oder Fehler synchron
auswertbar) — deshalb, und nur deshalb, darf „gespeichert"/`intern-aktuell` jetzt automatisch
erscheinen. Für die Datei ändert sich nichts: ein Download bleibt unbestätigbar, der vierte Zustand
(`unbestaetigt`) und sein eigener Bestätigungs-Schritt bleiben unverändert bestehen, jetzt nur für
den selteneren, bewussten „Sicherungskopie erstellen"-Weg.

### Der WebKit-7-Tage-Hinweis — eine bereits bestehende Warnung bekommt ihr zweites Argument

WebKit (Safari, und jeder Browser auf iOS/iPadOS) räumt script-schreibbaren Speicher nach sieben
Tagen ohne Seitenbesuch (Intelligent Tracking Prevention, seit ITP 2.3 — bestätigt gegen
webkit.org, nicht nur aus Kenntnis übernommen: die separate, 2020 zurückgenommene Regel betraf nur
JS-gesetzte Cookies, NICHT Local-/IndexedDB-Storage, die Sieben-Tage-Grenze dort gilt weiter). Eine
zum Home-Bildschirm hinzugefügte PWA ist ausgenommen. `navigator.storage.persist()` kann laut
WebKit-Blog ebenfalls ausnehmen, mit unklarer Verlässlichkeit in der Praxis (mehrfach berichtet,
nicht offiziell dokumentiert) — das bestehende `erhoehtesVerlustRisiko()` behandelt einen Grant
darum bereits vorsichtig (nur `true` zählt als sicher, nicht die bloße API-Verfügbarkeit), diese
ADR ändert daran nichts.

Der Kern hatte bereits einen einmaligen, wegklickbaren Hinweis für genau diesen Fall
(`iosInstallHinweis*`, über `navigator.standalone` erkannt, „einmal pro Sitzung, nach dem
Onboarding, bei erhöhtem Risiko") — nicht neu gebaut, nur im Wortlaut erweitert: er nennt jetzt
beide Auswege (Home-Bildschirm ODER eine Sicherungskopie als Datei), nicht mehr nur die
Installation. Das gibt der Sicherungskopie ihr eigentliches Argument: nicht als täglicher
Bedienschritt, sondern als die Kopie, die keine Browser-Regel wegräumen kann.

## Die Rot→Grün-Probe: die Schleife aus dem Anker-Zitat wörtlich

`tests/adr-237-speicherschleife-ohne-datei.test.js` — vier Proben, die Kernprobe fährt exakt den
Wortlaut aus dem Anker oben: Depot anlegen, ein Feld setzen (`markiereUngespeichert()`, NICHT
`depotInIdbSichern()` direkt — der reale Auslöser, nicht der umgangene Weg), OHNE Datei-Sicherung
einen frischen Kern auf demselben Mock-Speicher öffnen (= „schließen, wieder öffnen"), Daten da,
ein zweites Feld in der fortgesetzten Sitzung („weitermachen"). Vor dieser ADR rot (per Hand
verifiziert: die auslösende Zeile entfernt, drei von vier Proben schlagen fehl, darunter die
Kernprobe — `actual: 0, expected: 1`), danach grün.

### Nachzug (04.09.2026): eine Falle für Playwright-Proben, die IndexedDB gezielt sabotieren

`tests/e2e/10-speicher-fehlschlag-sichtbar.spec.js` (Fall B) registrierte die IndexedDB-Sabotage
bisher über ein `page.addInitScript(...)` vor `page.goto()` — vor dieser ADR traf sie nur den
ersten bewussten Save-Klick. Seit `markiereUngespeichert()` bereits während `depotAnlegen()`
selbst einen stillen internen Save auslöst (Punkt 1 oben), trifft eine vorab-registrierte Sabotage
jetzt auch diesen allerersten Schreibversuch — die Probe zeigte „erneut fehlgeschlagen" statt der
erwarteten ersten „fehlgeschlagen"-Meldung. Behoben durch Verschieben der Sabotage hinter
`depotAnlegen()` und die `internerSpeicherModus()`-Vorbedingung, unmittelbar vor den eigentlichen
Feld-Eintrag. Für jede künftige Probe, die IndexedDB gezielt brechen will: die Sabotage muss NACH
dem Anlegen stehen, nicht davor — sonst zählt sie einen Fehlschlag, der nicht der gemeinte ist.

## Verhältnis zu bestehenden ADRs — was bleibt, was ändert sich

| ADR | Betroffen? |
|---|---|
| U2-ADR-015 (D43, Zwei-Ebenen-Persistenz) | „Vier bewusste Save-Punkte" zurückgenommen (diese ADR). Die Zwei-Ebenen-Architektur selbst (intern + Datei) bleibt bestehen. |
| U2-ADR-031 (Persistenz ehrlich) | Unverändert — nur worauf sich „gespeichert" bezieht, verschiebt sich (s. Auflage oben). |
| U2-ADR-212 (Sichern-Knopf folgt Speicher-Modus) | Sein heutiger Nachtrag (03.09. vormittags, Stück 3, „Klick geht immer über Datei") wird durch diese ADR zurückgenommen — s. `saveKnopfDateiWeg()` oben. |
| U2-ADR-223 (Datei ist Depot) | Unverändert. Klausel 3 dort („Datei ist Bezugsgröße bei Divergenz") bleibt ausdrücklich `nicht-prüfbar` — `speicherKonfliktModell()` bleibt bewusst symmetrisch, von dieser ADR nicht angefasst. |
| U2-ADR-224 (Boot-Wettlauf) | Unverändert, nur endlich wirksam (s. Punkt 2 oben). |
| U2-ADR-185 (Sperrschirm statt Eingangsschirm) | Unverändert. Der Rückweg „Doch neu anfangen" (`co-neu`) bleibt die Garantie, dass ein falsches Passwort am internen Eintritt nie in eine Sackgasse führt — diese ADR verlässt sich darauf, ändert nichts daran. |

## Belege

```konformitaet
aussage:  Ein Feld-Eintrag ohne Datei-Sicherung übersteht Schließen+Öffnen (die Schleife aus dem Anker-Zitat).
zustand:  geprüft
herkunft: rot-bewiesen (Zeile entfernt, 3 von 4 Proben rot, danach zurückgesetzt)
pruefung: tests/adr-237-speicherschleife-ohne-datei.test.js#anlegen, befüllen (ohne Datei-Sicherung), schließen, öffnen — Daten da
```

```konformitaet
aussage:  Ein Multi-Tab-Konflikt beim stillen Save unterbricht nicht interaktiv, bleibt aber sichtbar.
zustand:  geprüft
pruefung: tests/adr-237-speicherschleife-ohne-datei.test.js#ein Hintergrund-Konflikt bei stillem Save unterbricht NICHT interaktiv, sondern markiert fehlgeschlagen
```

```konformitaet
aussage:  Der Pillen-Knopf geht bei verfügbarem internen Speicher wieder über den internen Weg,
          unabhängig vom Zustand — Datei nur, wo IndexedDB fehlt.
zustand:  geprüft
pruefung: tests/persistenz-status.test.js#PS10-1 (U2-ADR-237): der Klick geht über den internen Weg, wenn intern möglich — Datei nur, wo IndexedDB fehlt
```

---

*Vivodepot GmbH · Berlin · 03.09.2026*
