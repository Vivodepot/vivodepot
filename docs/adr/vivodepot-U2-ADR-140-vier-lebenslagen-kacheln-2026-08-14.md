# U2-ADR-140: Vier neue Anlass-Kacheln — Trennung/Scheidung, Verwitwung, Arbeitslosigkeit, Rechtliche Betreuung

**Status:** Angenommen
**Datum:** 14.08.2026
**Kategorie:** UX, PRODUKT, DATENMODELL
**Linie:** U2
**U2-Bezug:** U2-ADR-115 (macht die Kachel-Zahl erklärungspflichtig — dieser ADR erfüllt die
Auflage für vier neue) · U2-ADR-117 (Lebenslage-Ausführer, `oeffneLebenslage`/`BAUSTEIN_BY_ID`)
· U2-ADR-025 (Werkzeug, kein Berater) · A194 (Ereignis-Achse, Vorbedingung dieses ADRs)

**Status heute:** gilt — Beleg `tests/fix-a58-lebenslagen-im-produkt.test.js#[A58] die
Ereignis-Lagen sind genau die, die eine Anlass-Kachel tragen sollen (A61)`: die Probe hält die
Ereignis-Lagen auf genau `arbeitslosigkeit`, `eigene-vorsorge`, `erbfall-abwickeln`,
`rechtliche-betreuung`, `trennung-scheidung`, `umzug`, `verwitwung` — die vier hier entschiedenen
Kacheln sind darin namentlich enthalten. Nachgetragen am 15.08.2026 (A245); die Zeile fehlte, weil
dieser ADR am 14.08. zwischen ADR-Tranche 3 und 4 entstand und durch beide Raster fiel.

---

## Kontext

`identitaet.familienstand` kennt die Werte `getrennt`, `geschiedene` und `verwitwet` seit Längerem
— aber kein Wert löste bislang etwas aus, und es führte kein Weg zu einer passenden Lebenslage.
Ebenso fehlte ein Einstieg für Arbeitslosigkeit (der Bereich Sozialversicherung kannte weder
Arbeitslosenversicherung noch Agentur für Arbeit) und für rechtliche Betreuung (obwohl die
zugrundeliegenden Datenfelder bereits existieren).

Die Ereignis-Achse (A194) macht `familienstand` zu einem der Felder, die ein Ereignis tragen —
ohne eine Kachel, die zur passenden Lage führt, bliebe das Wirkung ohne Weg dorthin.

## Entscheidung

**Vier neue Ereignis-Lagen (`BAUSTEINE`, `sorte:'ereignis'`) mit je einer Anlass-Kachel — die
Kachel-Zahl steigt von dreizehn auf siebzehn:**

**1 — `trennung-scheidung` (Klasse 1).** Eine Kachel für beides — Trennung und Scheidung sind
eine Lebensstrecke, kein zweiter Weg zum selben Ziel. Neues Feld `identitaet.trennungsdatum`
(Stichtag für Steuer und Vermögensauskunft, § 1379 Abs. 2 BGB; die Beweislast liegt bei der
Person, die sich darauf beruft). Fünf recherchierte Rechtslage-Auskünfte im Lage-Blatt (Trennungs-
unterhalt, Anzeigepflicht, Versorgungsausgleich, Mietvertrags-Eintrittsrecht, Fortbestand der
Vorsorgevollmacht) — bewusst ohne die Aussage, dass eine Vollmacht zu widerrufen sei: dass sie
nicht automatisch endet, ist Rechtslage, was daraus folgt, entscheidet die Bürgerin (U2-ADR-025).

**2 — `verwitwung` (Klasse 3), die zeitkritischste.** Fünf parallele Fristen, mit der
Sechs-Wochen-Erbausschlagungsfrist (§ 1944 BGB) an erster Stelle — ihre Versäumnis kann
unwiderruflich zur persönlichen Haftung für fremde Schulden führen. Kein neues Feld. **Abgrenzung
zu `todesfall-uebernahme`:** jenes Situationsblatt handelt von der Übernahme eines FREMDEN Depots
(Sterbeurkunde, Sub-Depots, Zugang); `verwitwung` handelt davon, was im EIGENEN Depot zu erledigen
ist (Nachlass, eigene Vorsorge-Instrumente, die den Verstorbenen benennen und damit gegenstandslos
sind). Ergänzt, nicht dupliziert — und verbunden, nicht nur getrennt beschrieben: das Lage-Blatt
trägt einen Link zu „Nach einem Todesfall" (`verwandteSituation`, neue optionale Eigenschaft an
einer BAUSTEINE-Definition, additiv wie `hinweise`; `renderSituation` rendert ihn als Knopf,
`oeffneSituation` führt hin, im Druck nicht sichtbar).

**3 — `arbeitslosigkeit` (Klasse 1), die einzige mit neuem Feldsatz.** Vier neue Felder in einer
neuen Sozialversicherung-Sektion „Arbeitslosigkeit": `kuendigungsdatum`,
`meldung_arbeitsuchend_am`, `arbeitslosmeldung_am`, `bescheid_agentur` — klein gehalten, was fehlt,
kommt, wenn jemand es vermisst. Drei Fristen mit echtem Rechtsnachteil (Meldung arbeitsuchend,
keine Rückwirkung der Arbeitslosmeldung, Drei-Wochen-Frist der Kündigungsschutzklage — deren
Versäumnis der größte Einzelverlust aller vier Lagen ist).

**4 — `rechtliche-betreuung` (Klasse 2), die billigste.** Beide zugrundeliegenden Sichten
(`betreuerbestellung` in `vorsorge_instrumente`, `meine-menschen.kinder` mit
`art:'betreuter_erwachsener'`) sind seit dem 12.08.2026 gebaut — kein neues Feld, kein Assistent,
nur der fehlende Einstieg. Zwei Auskünfte im Lage-Blatt gegen die häufigsten Irrtümer: eine
Betreuung macht nicht geschäftsunfähig (§ 1825 BGB), eine Vorsorgevollmacht verhindert eine
Betreuung nicht (§ 1820 Abs. 1 BGB).

**Kein toter Einstieg.** Alle vier `ziel.lage`-Werte lösen über `BAUSTEIN_BY_ID` auf einen
existierenden Katalog-Eintrag auf — `tests/anlass-routing-ziel.test.js` prüft das aus dem Modell,
nicht gegen eine gepflegte Liste.

**Neuer Render-Baustein: `hinweise`.** Die vier Lagen sind die ersten, die reine
Rechtslage-Auskünfte (Fristen, Gesetzestext-Kern) neben den editierbaren Feldern zeigen müssen —
bislang trug eine Lebenslage nur `einfuehrung` (die Unterlagen-Liste). `lebenslageAlsBlatt`/
`renderSituation` bekommen ein optionales `hinweise`-Array, je Eintrag eine eigene `.hinweis-box`
— additiv, die 13 bestehenden Lagen tragen die Eigenschaft nicht und ändern ihr Rendering nicht.

## Konsequenzen

**Downstream-Rattenschwanz (wie A178 vorhergesagt):** Sensibel-Liste (keine der neuen Felder ist
sensibel — Familienstand-Folgefragen und Arbeitsuchend-Meldungen sind heute schon offen
behandelt), Lese-App-Parität (`trennungsdatum` + vier `arbeitslosigkeit`-Felder nachgezogen),
Referenzdepot-Fixture (bewusst leer — Elisabeth ist verheiratet und im Ruhestand, kein Rest),
Render-Charakterisierung (`identitaet`/`sozialversicherung` neu aufgenommen), W-10-Export-Mapping
(vier neue SD-JWT-VC-Claims `termination_date`/`job_seeking_registration_date`/
`unemployment_registration_date`/`employment_agency_decision`), BGB-Verweis-Grundlinie (dreizehn
neue/vermehrte `BGB`-Zitate — die Auskünfte zu EStG/VersAusglG/PStG/ErbStG/SGB III/KSchG liegen
außerhalb des Wächter-Umfangs, der ausdrücklich nur `... BGB` zählt).

**Kein Zielsuchpfad für § 1944 BGB (Erbausschlagung) bei `todesfall-uebernahme` gebaut** — die
Fristen-Auskunft lebt jetzt am `verwitwung`-Blatt, nicht am Situationsblatt der Fremd-Depot-
Übernahme. Wer beide Lagen gleichzeitig durchläuft (übernimmt ein fremdes Depot UND ist selbst
verwitwet), sieht die Frist nur an einer Stelle — gemessen als hinnehmbar, weil die Fristen-
Auskunft an der Stelle steht, die die Bürgerin nach einem Todesfall zuerst öffnet (die eigene
Lage, nicht die Übernahme).

**Ungemessen:** ob siebzehn Kacheln auf kleinen Geräten noch ohne Scrollen erfassbar sind —
dieselbe offene Frage wie in U2-ADR-115, nicht neu entstanden durch diesen ADR.

## Konformität

`tests/fix-a58-lebenslagen-im-produkt.test.js` (Ausführer kennt alle vier neuen Lagen, jedes
Katalogfeld darstellbar), `tests/anlass-routing-ziel.test.js` (kein `ziel.lage` ins Leere),
`tests/lebenslage-hinweise.test.js` (neuer Render-Baustein, additiv geprüft), Zug-5-Rot-Beleg
(Familienstand-Änderung löst die passende Lage über die Ereignis-Achse aus).
