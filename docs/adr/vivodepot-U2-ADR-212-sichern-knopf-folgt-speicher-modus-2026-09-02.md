# U2-ADR-212: der Sichern-Knopf folgt dem Speicher-Modus — intern, wenn intern möglich

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** ARCHITEKTUR, PERSISTENZ, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-015 (interner verschlüsselter Arbeitsstand, Zwei-Ebenen-Persistenz) ·
U2-ADR-031 (Persistenz ehrlich — `saveStatusModell()`, die vier Zustände) · U2-ADR-211
(`data.sicherungsStand.letzteDateiIso` — eine interne Sicherung darf diesen Wert nicht anfassen,
sonst behauptet die App eine Datei-Sicherung, die es nicht gab).
**Anker:** Auftrag vom 02.09.2026 — gemessen und mehrfach bestätigt: `depotPersistieren()`
(vivodepot.html) entscheidet bereits richtig zwischen intern und Datei; Sub-Depot-Wechsel und
Passwortänderung gehen längst darüber. Der Sichern-Knopf (`#tb-save-knopf`) ging daran vorbei,
unbedingt in `depotInDateiSichern()`. Folge: In Firefox/Safari (kein File-System-Access-Handle,
kein In-Place-Schreiben) entstand bei JEDEM Klick eine neue, zeitgestempelte Datei im
Download-Ordner. Wörtlich: „mit tausend Dateien in Downloads geht es absolut
nicht." Abnahmebedingung, ausdrücklich gesetzt: „Import und Export muss möglich
sein."
**Status heute:** gilt — Beleg `tests/persistenz-status.test.js` (PS10-1…7),
`tests/e2e/u2-adr-212-sichern-intern.spec.js`.

---

## Kontext

`depotPersistieren()` bündelt die Speicher-Modus-Entscheidung an einer Stelle:
`internerSpeicherModus() ? depotInternSichern() : depotInDateiSichern()`. Mehrere Aufrufer nutzen
das bereits korrekt — Sub-Depot-Wechsel, Passwortänderung, der primäre Weg im Schließen-Dialog
(`speichernOderFehlschlagMarkieren()`, das auf `kernAPI.speichern()` → `depotPersistieren()`
delegiert).

Der Sichern-Knopf selbst tat das nicht. `renderSaveStatus()`s `knopf.onclick` rief
`depotInDateiSichern()` unbedingt, unabhängig vom Modus — ein Kommentar an derselben Stelle
behauptete zwar „kernAPI.speichern() → depotInDateiSichern()", das traf aber auf den tatsächlichen
Klick-Handler nicht zu (gemessen: der Handler ruft `depotInDateiSichern()` direkt, nie
`kernAPI.speichern()`). Zwei Kommentare im Quelltext (an `depotInDateiSichern()` selbst und im
Verdrahtungs-Abschnitt) beschrieben damit eine Architektur, die der Klick-Handler nie hatte —
Drift zwischen Kommentar und Code, nicht nur ein fehlender Aufruf.

Im gehosteten (internen) Modus ist das nicht nur ein kosmetischer Umweg: jeder Klick schrieb eine
neue Datei, obwohl `depotInternSichern()` — derselbe Mechanismus, den andere Aufrufer längst
nutzen — bereitstand.

## Entscheidung

**1 — Die reine Entscheidung ist eine eigene, testbare Funktion.** `saveKnopfDateiWeg(m)`
(vivodepot.html, neben `saveStatusModell()`) beantwortet ohne DOM, ob ein Klick über die Datei
gehen soll:

```js
function saveKnopfDateiWeg(m) {
  return !internerSpeicherModus() || m.zustand === 'keine-datei' || !!m.wiederholt;
}
```

- **Datei-Modus** (`internerSpeicherModus()===false`): immer wahr — unverändertes Verhalten.
- **Interner Modus, etwas Offenes zu falten** (`'ungespeichert'`/`'fehlgeschlagen'`, erster
  Versuch): falsch — der Klick geht über `kernAPI.speichern()` → `depotPersistieren()` →
  `depotInternSichern()`. Das ist der eigentliche Fix.
- **Interner Modus, `'keine-datei'`** (nichts Offenes, aber noch keine/keine aktuelle Datei):
  wahr. Der Klick kann hier nur „jetzt eine Datei" meinen — das ist der bewusste Export
  (Ebene 2 der Zwei-Ebenen-Persistenz), am selben Knopf, keine neue Menü-Ebene.
- **Interner Modus, WIEDERHOLTER Fehlschlag** (`m.wiederholt`): wahr. Der Pillentext
  (`saveStatusFehlgeschlagenWiederholt`) verspricht bereits „bitte nutzen Sie ‚Als Datei
  sichern'" — der Klick muss das einlösen, sonst lügt das Label. Derselbe Eskalationsweg, den
  `depotInternSichern()`s eigener Konfliktdialog bei einem echten Konflikt bereits anbietet
  („Erst als Datei sichern").

**2 — Eigenes Label für den internen Regelfall.** `saveStatusJetztSichernIntern` = „Jetzt
sichern" (ohne „als Datei") — `STRINGS.saveStatusJetztSichern` = „Jetzt als Datei sichern" bliebe
sonst eine falsche Zusage, sobald der Klick intern schreibt. EN-Übersetzung parallel ergänzt
(`tools/textsatz-en-vollabdeckung-daten.js`): „Save now".

**3 — Export bleibt erreichbar, ohne neue UI.** Sobald ein interner Save die offenen Edits
gefaltet hat, steht die Pille auf `'keine-datei'` — der nächste Klick auf DENSELBEN Knopf geht
bewusst über `depotInDateiSichern()` und erzeugt eine echte `.vivodepot`-Datei. Kein zusätzlicher
Menüpunkt, keine tiefere Klick-Ebene: derselbe Ein-Knopf-Weg, den die Bürgerin bereits kennt.

**4 — `letzteDateiIso` bleibt unberührt.** Geprüft, nicht angenommen: `depotInternSichern()` ruft
bereits `markiereGespeichert()` (Kommentar dort: „Datei-Signal UNBERÜHRT"), nicht
`markiereAlsDateiGesichert()` — U2-ADR-211s Feld war also schon vor diesem ADR korrekt von
internen Saves getrennt. Dieses ADR ändert daran nichts, verlässt sich aber jetzt öfter darauf
(jeder interne Regelfall-Klick geht über genau diesen Pfad) — der Browser-Beleg unten prüft es
darum explizit am echten Klick, nicht nur an der bestehenden Trennung selbst.

## Verworfene Alternative

**Ein separates „Sicherungskopie erstellen"-UI-Element** (eigener Menüpunkt oder eigener Knopf),
unabhängig vom Sichern-Knopf. Verworfen: der Auftrag verlangt ausdrücklich nur die Verdrahtung
(„Bau nur die Verdrahtung"), und der bestehende `'keine-datei'`-Zustand liefert bereits einen
eindeutigen, erreichbaren Ein-Klick-Export, sobald nichts mehr offen ist — ein zweites UI-Element
für denselben Zweck wäre unbegründete zusätzliche Fläche.

## Konsequenzen

**Firefox/Safari (kein FSA):** ein Klick im internen Modus erzeugt keine Datei mehr — der
gemeldete Fehler ist behoben. Ein Klick im Datei-Modus (Erstklass/Desktop) bleibt unverändert.

**Zwei bestehende, stale Kommentare korrigiert** (an `depotInDateiSichern()` und im
Verdrahtungs-Abschnitt) — sie behaupteten eine Architektur, die der Klick-Handler vor diesem ADR
nie hatte.

**Nicht Teil dieses Baus** (Auftragsgrenze): der Umzug auf OPFS, und die Frage, was bei
Divergenz zwischen internem Stand und Datei passieren soll — bleibt eine Produktentscheidung.

## Konformität

**Nachtrag (Speicher-Modell, 03.09.2026, Stück 3, Entscheidung „ein Speichersymbol, das
speichert, wenn ich drauf klicke"):** die Falt-Entscheidung, die dieses ADR einführte, ist
zurückgebaut — der Sichern-Klick geht seither wieder immer über die Datei, in jedem Modus, jedem
Zustand. Der BEFUND, aus dem dieses ADR entstand (Firefox/Safari: jeder Klick ohne FSA-Handle legt
eine neue, zeitgestempelte Datei an), bleibt unverändert gültig — nur WANN der Datei-Weg genommen
wird, hat sich geändert, nicht das Browser-Verhalten selbst. Klausel 2 und 4 unten sind darum
`abgeloest`. Klausel 1 gilt unverändert (Datei-Modus war nie von der Falt-Entscheidung betroffen).
Klausel 3s Aussage bleibt wörtlich wahr, ist aber seither kein Sonderfall mehr, sondern die
Regel für JEDEN Zustand. Klausel 5s Rundlauf gilt weiterhin, nur genügt seit Stück 3 EIN Klick
statt zwei (der erste Klick IST jetzt bereits der Export) — der verlinkte Test ist entsprechend
umgebaut, sein Titel unverändert.

**Zweiter Nachtrag (U2-ADR-237, 03.09.2026, spätabends, Produktentscheidung):** der erste
Nachtrag (Stück 3, oben) ist selbst zurückgenommen — der Sichern-Klick geht wieder über den
internen Weg, wenn intern verfügbar (dieselbe Verzweigung wie vor Stück 3, jetzt aus einem
anderen Grund: nicht weil sie Klicks spart, sondern weil sie kaum noch gebraucht wird — Feld-
Änderungen speichern seit U2-ADR-237 bereits still, ohne Klick). **Klausel 3 unten ist damit
selbst `abgeloest`** — ihre Aussage („im internen Modus bewusst der Datei-Weg") ist die exakte
Prämisse, die U2-ADR-237 zurücknimmt. **Klausel 1 bleibt `geprüft` und unverändert wahr** — sie
beschreibt ausschließlich den Datei-Modus (`internerSpeicherModus()===false`), den U2-ADR-237
nicht anfasst; nur der verlinkte Test wurde umbenannt (deckt seither beide Modi in einem Lauf ab,
Titel entsprechend erweitert). Klausel 2, 4, 5 bleiben unverändert, wie vom ersten Nachtrag
beschrieben — Klausel 2 und 4 waren bereits `abgeloest`, Klausel 5s Rundlauf (E2E) ist von dieser
zweiten Rücknahme nicht geprüft und bleibt als offener Punkt für eine künftige Sitzung stehen.

```konformitaet
aussage:  Im Datei-Modus (internerSpeicherModus()===false) bleibt der Datei-Weg für jeden
          Save-Status-Zustand wahr — unverändertes Verhalten, keine Verzweigung.
zustand:  geprüft
herkunft: invariante
pruefung: tests/persistenz-status.test.js#PS10-1 (U2-ADR-237): der Klick geht über den internen Weg, wenn intern möglich — Datei nur, wo IndexedDB fehlt
```

```konformitaet
aussage:  Die Fallunterscheidung, die den Regelfall-Klick im internen Modus zuerst intern falten
          liess (statt über die Datei), wurde durch das Speicher-Modell (03.09.2026, Stück 3)
          zurückgebaut — der Klick geht seither wieder immer über die Datei.
zustand:  abgeloest
herkunft: entscheidung
```

```konformitaet
aussage:  'keine-datei' und ein wiederholter Fehlschlag bleiben im internen Modus bewusst der
          Datei-Weg — Export bleibt erreichbar, und das Fehlschlags-Label lügt nicht.
zustand:  abgeloest
herkunft: entscheidung
```

```konformitaet
aussage:  Die Browser-Probe, dass ein echter Klick im internen Modus KEIN download-Event auslöst
          und data.sicherungsStand nicht anrührt, ist mit dem Speicher-Modell (03.09.2026, Stück 3)
          zurückgebaut — seither schreibt genau dieser Klick sofort eine echte Datei und setzt den
          Sicherungsstand.
zustand:  abgeloest
herkunft: entscheidung
```

```konformitaet
aussage:  Rundlauf im Browser: exportieren (zweiter Klick, Zustand 'keine-datei') → frisches
          Profil ohne jeden internen Stand (eigener Browser-Context) → importieren → derselbe
          Feldinhalt. Export bleibt erreichbar, ohne neues UI-Element.
zustand:  geprüft
herkunft: invariante
pruefung: tests/e2e/u2-adr-212-sichern-intern.spec.js#U2-ADR-212 Rundlauf: exportieren → frisches Profil ohne internen Stand → importieren → derselbe Inhalt
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
