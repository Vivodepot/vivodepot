# U2-ADR-388 · UX/Erscheinung ist gemessen vollständig — kein Artefakt aus sachlichem Grund

**Status heute:** gilt
**Datum:** 08.09.2026
**Betrifft:** `vivodepot.html` (Kopf-Kommentar an `erscheinungAnwenden` von stale auf aktuell
korrigiert — keine Funktionsänderung), `tools/lib/vier-produkte-zusammensetzung.js` (Wortlaut für
die UX/Erscheinung-Zeile, an den zuständigen Strang übergeben)
**Bezug:** U2-ADR-351 (C3, der Erscheinungs-Kanal), U2-ADR-379 (Pro-Achse, „zwei Module statt
eins"), U2-ADR-382 (Rechtsraum, Besitz-Zug), U2-ADR-384 (Branding, Ab-Werk-Saat — dieselbe Frage,
paralleler Befund derselben Nacht)

---

## 0 · Der Auftrag

Vier der fünf Modulachsen aus der Definition of Done waren gemessen: Privat/Pro (zwei Module,
repariert, U2-ADR-379), Sprache (Ab-Werk-Saat, U2-ADR-367), Rechtsraum (Ab-Werk-Saat, U2-ADR-382),
Branding (Ab-Werk-Saat, U2-ADR-384). Die fünfte — „Branding und UX" ist EINE Zeile in der DoD,
zwei Achsen — war UX/Erscheinung. Dieselbe Frage wie bei den vier anderen: gibt es ein
ausgeliefertes Artefakt, das der Konfektionierer einem Produkt mitgeben kann? Und, wie bei
Branding vorgemacht: prüfen, ob Vivodepots eigene Erscheinung (Typografie, Farben, Abstände) als
Datenwert existiert oder nur als CSS im Kern.

## 1 · Der Befund

Fünf Messungen, alle gegen den echten Bestand:

1. **Der Einlassweg existiert und ist vollständig.** Zwölftes `EINLASS_REGISTER`-Register
   (`typ:'erscheinung'`, `vivodepot.html:23656-23661`), `erscheinungModulPruefen()`
   (`:11421-11445`, geschlossene Feld-Erlaubnisliste `_ERSCHEINUNG_MODUL_SCHLUESSEL`, Format-
   Prüfung jedes Werts gegen `_ERSCHEINUNG_FS_MUSTER = /^\d+(\.\d+)?(px|rem|em)$/`), bewusst OHNE
   `nurGeprueft` (anders als Branding — Konzept Abschnitt IX: „Erscheinung … keine Zurechnung …
   keine Signaturhürde").
2. **Die Anwendefunktion ist verdrahtet, nicht tot.** `erscheinungAnwenden()` (`:11352-11362`)
   wird real aufgerufen — aus `_moduleEinlassWirken()` nach jedem erfolgreichen Modul-Einlass
   (`:37509-37515`) und aus `_depotSpeicherZuruecksetzen()` beim Institutionswechsel
   (`:31079-31082`). **Fund:** der Kopf-Kommentar an `erscheinungAnwenden` behauptete noch
   „DIESER ZUG ÖFFNET DEN KANAL, ER BEWEIST IHN NICHT … ohne einen Aufrufer bleibt
   erscheinungAnwenden erreichbar, aber ungerufen" — ein Zug-1-Kommentar (07.09.2026, vor dem
   Einlassweg), der beim Anfügen von Zug 2 nicht nachgezogen wurde. Der Code war korrekt, die
   Selbstbeschreibung daneben falsch. Korrigiert (s. §3), keine Funktionsänderung.
3. **Die Wirkung ist gemessen, nicht nur die Struktur.**
   `tests/c3-zug2-erscheinung-einlassweg.test.js:171-195` docken real ein Modul via
   `modulEinlassen()` an und prüfen `root.style.getPropertyValue('--fs-role-label') === '17px'`
   nach dem Einlass, und den Reset danach — ein echter Wirkungsbeweis, nicht nur „Struktur wird
   angenommen". 28/28 Proben in den beiden Erscheinungs-Testdateien grün.
4. **Kein konfektioniertes Produkt trägt ein Erscheinungs-Modul.** `tools/lib/vier-produkte.js`s
   `PRODUKTE`-Liste kennt `sprachModulPfad`/`proModulPfad`, kein `erscheinungModulPfad`; kein
   Treffer für „erscheinung" in `vier-produkte-erzeugen.js`/`produkt-konfektionieren.js`. Bestätigt
   dieselbe Lücken-Form wie bei Pro/Rechtsraum/Branding vor deren jeweiliger Reparatur.
5. **Kein Artefakt für Vivodepots eigene Erscheinung existiert.** `find tools -iname
   "*erscheinung*"` → keine Treffer. Kein `AB_WERK_ERSCHEINUNG_*`-Pendant zu `AB_WERK_TEXTSATZ_DE`/
   `AB_WERK_RECHTSRAUM_DE`/`AB_WERK_BRANDING`. Die tatsächlichen Ab-Werk-Werte der fünf Rollen
   stehen als reine CSS-Fallbacks im `<style>`-Block: `--fs-role-label: var(--fs-sm)`,
   `--fs-role-wert: var(--fs-base)`, `--fs-role-gruppe: var(--fs-sm)`,
   `--fs-role-abschnitt: var(--fs-sm)`, `--fs-role-titel: var(--fs-base)` (`:221-225`).

## 2 · Die Entscheidung — kein Artefakt, und warum das kein Versäumnis ist

Der naheliegende nächste Schritt wäre, Punkt 4 mit Punkt 5 nach demselben Muster wie Rechtsraum/
Branding zu schließen: die Ab-Werk-Werte der fünf Rollen in ein `AB_WERK_ERSCHEINUNG_DE`-Modul
fassen und strukturgeprüft (ohne Signatur, wie bei Branding/Rechtsraum) ab Werk säen.

**Das wäre falsch, aus einem strukturellen Grund, nicht aus Aufwand:** `erscheinungModulPruefen`
verlangt für jede der fünf Rollen ein ABSOLUTES CSS-Längenmaß (`_ERSCHEINUNG_FS_MUSTER`,
px/rem/em, ein einzelner Zahlenwert). Der heutige Ab-Werk-Zustand ist aber KEIN absoluter Wert,
sondern eine CSS-KASKADEN-BEZIEHUNG: „Label/Gruppe/Abschnitt erben von `--fs-sm`, Wert/Titel von
`--fs-base`" (Kopf-Kommentar an `_VD_ERSCHEINUNG_FS_CSS_EIGENSCHAFTEN`, gemessen vor dem
ursprünglichen C3-Bau: „Label/Gruppe/Abschnitt teilten sich `--fs-sm`, Wert/Titel teilten sich
`--fs-base`"). Ein Modul, das stattdessen `label:'0.875rem'` (den heute aufgelösten Wert von
`--fs-sm`) EINFRIERT, wäre keine reine Formübersetzung wie bei Rechtsraum (§ „RECHTSRAUM_KATALOG
wird selbst das Modul", U2-ADR-382) — es würde die Beziehung selbst ZERSTÖREN: eine künftige
Änderung der Basis-Skala (`--fs-sm`) bliebe dann bei den fünf eingefrorenen Rollen aus,
unbemerkt, weil ein Pin die Kaskade ersetzt hätte. **Verlustbehaftete Transformation, keine
Reshape.**

**Der genau parallele Befund derselben Nacht, an der Branding-Achse (U2-ADR-384):** 56 prüfte für
Branding dieselbe Frage und schloss `tools/buergermodul/vd-branding.json` (nur `name`, keine
Farben/Schrift/Logo) ausdrücklich NICHT als Lücke ein — „Farben/Schrift/Logo liegen im Kern nur
als CSS-Variable, keine Datenwerte, die der freie Bürgerapp-Schnitt ziehen könnte." Der
Unterschied zu `AB_WERK_BRANDING` selbst: Branding-FARBEN (`--salbei-dunkel: #4F6539`) SIND
absolute Werte — ein Hex-Code ist kein Verhältnis zu etwas anderem, er lässt sich verlustfrei
einfrieren. Erscheinungs-ROLLEN sind das nicht — sie SIND das Verhältnis. Zwei strukturell
verschiedene Fälle, derselbe Abend, unterschiedliches Ergebnis: genau das war erwartet
(„für UX könnte er anders ausfallen").

**Ergebnis:** die Achse ist gemessen VOLLSTÄNDIG in dem Sinn, der zählt — Mechanismus fertig,
verdrahtet, gewirkungsgeprüft. Das fehlende Artefakt ist keine Lücke, sondern die korrekte
Abwesenheit eines Werts, der so nicht existieren kann, ohne die Sache selbst zu verfälschen.
**Keine Arbeit erfunden.**

## 3 · Der einzige Bau dieses Zugs — ein stale Kommentar

`vivodepot.html`, Kopf-Kommentar an `erscheinungAnwenden()`: die Zug-1-Selbstbeschreibung
„DIESER ZUG ÖFFNET DEN KANAL, ER BEWEIST IHN NICHT … ungerufen" ersetzt durch eine Beschreibung
des tatsächlichen, seit C3 Zug 2 verdrahteten Zustands, mit Verweis auf diesen ADR für die
Artefakt-Frage. Keine Funktionsänderung, keine Testerwartung geändert.

## 4 · Wortlaut für die Zusammensetzungs-Tabelle

„UX/Erscheinung: Mechanismus vollständig (Einlassweg, Anwendung, Wirkungsprobe, 28/28 grün),
kein Ab-Werk-Artefakt — Vivodepots eigener Zustand ist eine CSS-Kaskaden-Beziehung (Rolle erbt
von der Basis-Skala), kein absoluter Wert, der sich verlustfrei einfrieren ließe. Anders als
Branding-Farben (U2-ADR-384), die absolute Werte sind."

## 5 · Stand

Alle fünf Modulachsen der Definition of Done jetzt gemessen: vier gebaut (Pro, Sprache,
Rechtsraum, Branding), eine (UX/Erscheinung) als bereits vollständig befundet, mit einem
kleinen, unabhängig davon fälligen Kommentar-Fix. Der Rundgang, den dieser Zug
schließen sollte, ist geschlossen.
