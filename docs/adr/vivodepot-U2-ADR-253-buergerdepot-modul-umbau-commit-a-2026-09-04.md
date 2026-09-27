# U2-ADR-253 · Bürgerdepot wird Modul — Commit A: die Konsumenten werden entkoppelt

**Datum:** 04.09.2026
**Status:** Gilt für Commit A · Commit B ist offene Bauarbeit (bereinigt 25.09.2026)
**Status heute:** gilt für Commit A · Teil 1 eines mehrteiligen ADRs, wie U2-ADR-252
**Bezug:** U2-ADR-246/U2-ADR-250/U2-ADR-251 (die vier Einlass-Register, deren rohe
Konsumenten hier entkoppelt werden) · U2-ADR-252 (Vor-Depot-Provisionierung,
Voraussetzung für Kanal B) · `tests/paket3-commitA-entkopplung.test.js` (Rot-Beweis)

---

## 1 · Kontext

Der Umbau, den U2-ADR-246/250/251 vorbereitet haben, aber ausdrücklich nicht selbst leisten
wollten (jedes der drei ADRs trägt einen eigenen „Bewusst nicht Teil dieses Pakets"-Abschnitt):
die dreizehn nativen Sektoren, ihre Situationen, Assistenten und Ereignis-Achse-Einträge ziehen
in ein signiertes Modul `buergerdepot` (`pruefstufe:'intern'`), Kanal B (Vor-Depot-
Provisionierung, Entscheidung: „ein Modul wird provisioniert, ein Template wird
geladen").

**Commit A ist die Vorbereitung, nicht der Umzug selbst.** Solange kein `buergerdepot`-Modul
angemeldet ist, bleiben `SEKTOREN`/`SITUATIONEN`/`WIZARDS`/`EREIGNIS_ACHSE_FELDER` unverändert
voll — Commit A ändert am LAUFENDEN Verhalten der App nichts. Sein einziger Zweck: jede Stelle,
die heute noch das rohe native Array liest, auf die entsprechende `*Alle()`-Unions-Funktion
umzustellen, BEVOR Commit B die nativen Arrays tatsächlich leert. Der Beleg dafür ist führbar,
kein „sollte passen": `bereicheAlle()`/`situationenAlle()`/`wizardsAlle()`/
`ereignisAchseFelderAlle()` geben ohne angemeldetes Modul exakt das native Array zurück (s.
`tests/paket3-commitA-entkopplung.test.js`, Test „Refactor-Beleg").

Gemessen (Session `-a2`, 04.09.2026, vollständiger Bezeichner-Zensus über alle vier Arrays,
Kommentare und Registry-interne Referenzen herausgefiltert): **14 echte Konsumenten** jenseits
der bereits bekannten 153 sektorId-Referenzen in Situationen-/Assistenten-/Ereignis-Achse-Inhalt
(die 153 selbst sind Inhalt, nicht Code-Konsumenten, und ziehen mit dem Inhalt in Commit B mit).

---

## 2 · Entscheidung — vier Gruppen

**Vier reservierte Namensräume entkoppelt.** `BEREICH_IDS_EINGEBAUT`/`SITUATION_IDS_EINGEBAUT`/
`WIZARD_IDS_EINGEBAUT` waren `<Array>.map(x => x.id)` — abgeleitet aus genau dem Array, das
Commit B leert. Jetzt fest verdrahtete Literale, Wert unverändert, geprüft gegen den früheren
abgeleiteten Stand. **`EREIGNIS_ACHSE_TRIPEL_EINGEBAUT` ist NEU** — dort fehlte die reservierte-
Namensraum-Prüfung bislang ganz (U2-ADR-251 §5, bewusste Lücke). `ereignisAchseModulPruefen`
prüft jetzt jedes Modul-Tripel dagegen, `grund:'reserviert'`, wörtlicher Spiegel der anderen
drei Register, Reihenfolge VOR der Modul-internen Duplikat-Prüfung.

**Acht echte Aufrufstellen auf `bereicheAlle()`/`situationenAlle()` umgestellt:**
`BEREICH_IDS_EINGEBAUT`-Wert (s.o.), vier `aktiverSektorId = (SEKTOREN[0]...) || null`-
Vorbelegungen, `textsatzNeuAnwenden()`s Rückgabe-Zähler, `modul.sektor`-Gültigkeitsprüfung
(Formatmodul-Validierung), der Such-Katalog (`_sucheKatalogAufbauen`), der Flach-Feld-Scanner
(`scanFlacheSituationen`/das SEKTOREN-Gegenstück), `prueftermineZeilen` (Fristen-Lauf),
`alleStandardDokumente`, der Feld-Gültigkeits-Rettungslauf (M1-Umzug), sowie die
„alle Sektoren"-Ausweichzweige in den beiden Export-Feld-Analysen (vorher inkonsistent: der
EINZEL-Sektor-Zweig ging schon über `SEKTOR_BY_ID`, das seit A389 `bereicheAlle()`-gespeist ist
— nur der „alle"-Zweig hing noch an `SEKTOREN`).

**`_textsatzOrteBegehen` umgestellt — der wichtigste Einzelfund.** Der Laufzeit-
Anwendungslauf für Sprachmodule besuchte SEKTOREN/SITUATIONEN/WIZARDS roh. Kein neuer
Mechanismus-Fehler — `tools/mitschalt-beleg-messen.js` dokumentiert die Lücke für angedockte
Modulfelder bereits heute, gemessen, als akzeptierten Zug-1-Kosten. Aber Commit B hätte sie von
„ein paar Modulfeldern" auf „fast alle nativen Bürgertexte" ausgeweitet — ein Sprachmodul hätte
nach dem Umzug keinen einzigen nativen Bürgerdepot-Text mehr umgeschaltet. Die Umstellung
schließt beide Lücken zugleich, die alte (Modulfelder) und die neue (natives, künftig
module-basiertes Bürgerdepot).

**Sechs, nicht vier Ereignis-Achse-Aufrufer.** U2-ADR-251 §1/§5 nannte „vier echte
Aufrufstellen". Der vollständige Zensus fand sechs: `_ereignisArtenFuerUnterfeld`,
`_ereignisBetroffeneFlacheFelder`, `ereignisBetreuungsbeginnMarkieren`,
`ereignisGeburtMarkieren`, `_ereignisAchseEintragFuer`, und der `nimm()`-Sammler in der
Pro-Liste. Korrigiert an Ort und Stelle (Kern-Kommentar UND Testkopf) — ändert nichts an der
Korrektheit von U2-ADR-251, nur an der genannten Zahl.

**Nebenbefund, an derselben Stelle korrigiert:** der Kommentar über `BEREICH_IDS_EINGEBAUT`
sprach von „den zwölf Eingebauten" — tatsächlich sind es seit Längerem dreizehn (`persoenliches`
kam nach der Kommentierung dazu). Dieselbe veraltete Zahl steht noch in zwei Testkommentaren
(`tests/bereichssatz-auswahl-anlage.test.js`, `tests/etappe2g-bereichssatz-dateieigenschaft.test.js`)
— dort NICHT korrigiert (außerhalb dessen, was dieser Commit ohnehin anfasst).

**W-16-Register nachgezogen:** `tools/bereichslisten-pruefen.js` erkannte
`BEREICH_IDS_EINGEBAUT`s neues Literal korrekt als potenzielle zweite Bereichsliste. Eintrag mit
Begründung ergänzt: kein Duplikat der lebenden Liste, sondern ein bewusst eingefrorener
reservierter Namensraum, der aus genau dem Grund nicht mehr von `SEKTOREN` abgeleitet werden
darf, aus dem er entkoppelt wurde.

---

## 3 · Bewusst nicht Teil von Commit A

**Die Bereichssatz-Auswahl-UI** (`_bereichssatzAuswahlHTML`/`_bereichssatzAuswahlLesen`,
`SEKTOREN` unverändert gelassen). `bereicheAlle()` filtert native Sektoren nach
`data.bereichssatz`, lässt angedockte (Drittanbieter-)Sektoren aber IMMER unberührt — etabliertes
Verhalten seit Etappe 2g/U2-ADR-160, lange vor jeder Andock-Fähigkeit. Träte `buergerdepot`
strukturell wie jedes andere angedockte Bereichs-Modul auf, würde ein bestehender, die
dreizehn nativen Sektoren einschränkender Bereichssatz wirkungslos — ein echter
Verhaltens-Rückschritt für gespeicherte Depots, keine interne Kleinigkeit. Das ist eine
Entscheidung, keine Refactor-Frage: entweder verliert Bereichssatz-Kuratierung mit Commit B
ihre Wirkung auf die ehemals nativen Sektoren (akzeptiert, dokumentiert), oder `bereicheAlle()`
braucht eine Sonderbehandlung für Module mit `herkunft` = dem first-party `buergerdepot`-
Anbieter. Ungeklärt zum Zeitpunkt dieses Commits.

**Der Formtragfähigkeits-Vertrag von `bereichModulPruefen`.** Vier Struktur-Scanner
(Fristen-Lauf, Standard-Dokumente, Ref-Feld-Scanner, Feld-Gültigkeits-Rettung) lesen `sektionen`/
`standardDokumente` direkt vom Sektor-Objekt — für heutige, THIN angedockte Drittanbieter-Module
folgenlos (die tragen typischerweise `sektionen: []`, echte Felder kommen über den signierten
Template-Weg, `_templateDefAlsFeld`). Ob `bereichModulPruefen` einen VOLLEN, nativ-geformten
`sektionen`-Baum überhaupt validiert/akzeptiert, wie ihn `buergerdepot` tragen müsste, ist nicht
geprüft. Die vier Scanner wurden trotzdem auf `bereicheAlle()` umgestellt (s. §2) — sicher für
Commit A (die Registry ist heute leer, keine Verhaltensänderung), aber Commit B braucht eine
eigene Antwort auf diese Formfrage, nicht nur die Konsumenten-Umstellung.

**Commit B selbst** — der eigentliche Umzug der 13 Sektoren ins Modul, Provisionierung über
Kanal B, Signierung. Eigener Teil dieses ADRs, wenn er landet.

---

## 3a · Nachtrag 04.09.2026 — Bereichssatz entschieden und gebaut (Teil 1 von 5)

Die Bereichssatz-Frage aus §3 ist entschieden: **die Einstellung muss weiter wirken.** Ein
Bereichssatz, der nach dem Umzug still aufhört zu wirken, wäre genau die Fehlerklasse der
ganzen Nacht — eine Bürgerin setzt ihn, sieht keine Meldung, und er greift nicht mehr.

**Umgesetzt in `bereicheAlle()`:** `BEREICH_IDS_EINGEBAUT` (§2) dient als Unterscheidung.
Nur ein Registry-Eintrag, dessen ID dort steht, wird bereichssatz-gefiltert — ein echtes
Dritt-Modul bleibt wie bisher immer sichtbar, weil seine ID nie in `data.bereichssatz` stehen
kann (die Auswahl-Checkboxen kamen nie aus etwas anderem als den nativen dreizehn). Eine
naive „Registry auch filtern"-Lösung hätte hier JEDES Dritt-Modul unsichtbar gemacht, sobald
irgendein Bereichssatz gesetzt ist — ein neuer, schlimmerer Fehler statt der behobenen Lücke.

**Dringlichkeit gering, gemessen:** U2-ADR-169 (24.08.2026) hat den einzigen Aufrufer der
Bereichssatz-Auswahl-UI bereits entfernt (`tests/bereichssatz-auswahl-anlage.test.js`, Kopf).
Kein lebender Weg im Produkt kann `data.bereichssatz` heute setzen — nur eine von Hand gebaute
oder importierte Depot-Datei am UI vorbei. Der Fix verhindert eine Falle für den künftigen
Kanzlei-/Institutions-Weg, trifft heute niemanden.

**Rot-Beweis:** `tests/etappe2g-bereichssatz-dateieigenschaft.test.js` erweitert — die
bestehende Probe „angedockte Bereiche bleiben unabhängig vom Bereichssatz sichtbar" bleibt
unverändert die Regressionswache für Dritt-Module. Der reservierte Zweig selbst (ein
Registry-Eintrag MIT einer `BEREICH_IDS_EINGEBAUT`-ID) ist heute strukturell unerreichbar —
`bereichsModulPruefen` weist genau diese IDs als `'reserviert'` zurück, und das bleibt so, bis
Commit B klärt, wie `buergerdepot` diese Sperre passiert. Kein Test-Bypass um die reservierte
Prüfung gebaut, um diesen Zweig isoliert vorzuführen — das wäre selbst der Sonderweg, den
am 04.09.2026 ausdrücklich abgelehnt wurde („dann wäre Vivodepot GmbH ebenso extern
wie die ungarischen Hebammen"). Der Zweig ist stattdessen durch Code-Lesen geprüft: dieselbe
`bereichssatz.includes(s.id)`-Prüfung wie beim nativen Filter eine Zeile darüber, keine eigene
Logik — wird mit Commit B selbst mitbewiesen.

---

## 3b · Nachtrag 04.09.2026 — der NGO-Fund (Teil 4 von 5), gemessen und gebaut

**Der Befund:** `vorDepotKonfigurationAnwenden()` prüft jedes rohe Kanal-B-Bündel EINZELN, in
Datei-Reihenfolge, gegen die LIVE-Indizes (`SEKTOR_BY_ID`/`SITUATION_BY_ID`). Nichts in dieser
Schleife registriert ein geprüftes Bündel in diese Indizes — das passiert erst NACH der
Depot-Anlage. Kein Bündel im Stapel sieht darum je ein Geschwister-Bündel, unabhängig von der
Reihenfolge — die Prüfung läuft vollständig isoliert. Ein abgelehntes Bündel wird nicht einmal
aufgenommen; es erreicht die spätere, korrekt geordnete Registrierung nie.

**Für `buergerdepot` sicher, nicht nur möglich:** sieben Assistenten und 33 Ereignis-Achse-
Einträge zielen auf die eigenen dreizehn (künftig modul-eigenen) Sektoren. Verteilt sich
`buergerdepot` über mehrere Kanal-B-Bündel, würden alle vierzig ausnahmslos verworfen.

**Reparaturweg (gewählt 04.09.2026):** Weg C — die Prüfschleife nach Register-Typ
gruppieren, in der Abhängigkeitsreihenfolge, die `_alleModulRegisterAusDepotAnmelden` bereits
bewährt hat (bereich vor situation vor wizard vor ereignisAchse), mit Zwischenregistrierung je
Gruppe. Begründung: eine erprobte Ordnung wiederverwenden statt eine zweite zu erfinden, und der
am wenigsten invasive Eingriff in sicherheitsrelevanten Prüfcode.

**Bedingung, gemessen, nicht angenommen:** Weg C trägt nur, wenn KEIN Register ein Feld kennt,
das auf ein Geschwister DESSELBEN Typs zeigt (nur zwischen Gruppen, nie innerhalb). Geprüft für
alle vier heutigen Register — keins kennt eine solche Möglichkeit:
- Bereich: `bereiche`-Form hat kein Feld, das auf einen anderen Bereich verweist.
- Situation: `bloecke[].eintraege[].quelle` wird bei der Modul-Prüfung nur auf String-Form
  geprüft, nie auf Auflösbarkeit — keine Ziel-Prüfung, an der eine Reihenfolge etwas ändern könnte.
- Assistent: `ziel` kennt nur `situation`/`sektor`, nie `wizard`. `abschluss` trägt nur
  `{toast, dokument?}` (gemessen an allen sieben nativen Assistenten) — `dokument` zeigt auf ein
  Logik-Modul, nie auf einen anderen Assistenten.
- Ereignis-Achse: `_ereignisAchseZielAufloesbar` prüft ausschließlich `SEKTOR_BY_ID`/
  `SITUATION_BY_ID`, nie die eigene Registry.

**Diese Aussage ist an die HEUTIGE Form der vier Register gebunden, keine dauerhafte
Eigenschaft des Mechanismus.** Bekommt eines der vier künftig ein Feld, das auf ein Geschwister
desselben Typs zeigt, fällt Weg C an dieser Stelle still auseinander — die Gruppierung nach Typ
löst dann nicht mehr jede Abhängigkeit, weil innerhalb der Gruppe weiterhin unsortiert bleibt.
**Wer ein solches Feld hinzufügt, muss diesen Absatz lesen, bevor er es baut.**

**Zwei Rot-Beweise verlangt, nicht einer:** ein gepflanztes Cross-Bündel-Szenario (zwischen
Gruppen) UND eines innerhalb einer Gruppe. Der zweite ist heute grün, WEIL der Fall nicht
existiert — nicht weil er geprüft und bestanden wurde.

**Umsetzung — Weg C wurde beim Bauen selbst verworfen und ersetzt, eigener Rot-Beweis gefangen:**
die ursprünglich geplante Gruppierung nach `modulTyp` VOR der Prüfung scheiterte am eigenen
Test — `modulTyp` steht erst NACH erfolgreicher Signaturprüfung fest, er steckt in der
signierten Nutzlast, nicht am rohen Umschlag (`b.modulTyp` ist dort immer `undefined`). Die
erste Fassung der Probe unten belegte das: sie blieb für die Reihenfolge „Assistent zuerst"
ROT, exakt wie vor dem vermeintlichen Fix — die Gruppierung war ein stiller No-op.

**Tatsächlich umgesetzt:** alle Bündel laufen unverändert, in unveränderter Datei-Reihenfolge,
durch denselben `modulEinlassenGeprueft`-Weg wie vorher — aber ZWEIMAL, mit einer Registrierung
dazwischen (`_alleModulRegisterAusDepotAnmelden`, baut auch die Live-Indizes neu). Für ein im
ersten Durchlauf bereits angenommenes Bündel ist der zweite Durchlauf ein
Aktualisieren-statt-Einfrieren-No-op (`_einbettenMitFassung`, dieselbe Fassungs-Logik wie
überall sonst) — belegt durch die bestehende Probe „zwei Speicherungen hintereinander
duplizieren das Modul nicht", die unverändert grün blieb. Für ein im ersten Durchlauf
abgelehntes Ziel-abhängiges Bündel ist es der zweite, erfolgreiche Versuch. Kein Bündel wird
dabei unsicherer geprüft als vorher — derselbe volle Zertifikatsketten-Weg, zweimal statt
einmal, kein Kurzschluss. Einfacher als Weg C in seiner ursprünglichen Form, weil kein
Peek-in-die-Nutzlast und keine zweite, für die Reihenfolge zuständige Lesart derselben Daten
nötig ist.

**Die HEUTIGE-Form-Bindung gilt für diese Fassung genauso, nur die Formulierung ändert sich
leicht:** ein einzelner zweiter Durchlauf löst eine Kette von höchstens zwei Ebenen
(Quell-Register → Ziel-abhängiges Register). Eine dreistufige Kette (z. B. ein künftiges
Register, dessen Ziel wiederum ein Assistent ist) bräuchte einen dritten Durchlauf. Gemessen:
heute gibt es keine solche Kette (s. o.) — wer eine baut, muss diesen Absatz vorher lesen.

**Rot-Beweis** (`tests/vor-depot-konfiguration-cross-buendel.test.js`, 3 Proben): (1) die
ALTE, ungruppierte Ein-Durchlauf-Schleife verwirft einen Assistenten, dessen Ziel nur im
selben Stapel existiert — echt nachgestellt, nicht nur behauptet. (2) Weg C: derselbe
Assistent landet jetzt, in BEIDEN Datei-Reihenfolgen geprüft (Assistent zuerst UND Bereich
zuerst) — genau die Probe, die die erste, verworfene Fassung als No-op entlarvte. (3)
gruppenintern, dokumentiert statt behauptet: ein Assistent, dessen Ziel die ID eines ANDEREN
Assistenten ist, wird verworfen — Wizard→Wizard ist heute strukturell nicht auflösbar, mit der
ausdrücklichen Anweisung im Testtext, was zu tun ist, wenn das je nicht mehr stimmt.

Alle 124 bestehenden Proben, die `vorDepotKonfigurationAnwenden` (direkt oder über
`depotAnlegen`/`booteEingang`) berühren, unverändert grün — kein Rückschritt.

---

## 3c · Nachtrag 04.09.2026 — Personen-/Institutions-Verweis als Gerüst-Fähigkeit (Teil 2 von 5)

**Produktentscheidung:** „Verweise die modulare, anpassbare Variante." Kein fester
Katalog von Verweis-Zwecken/-Rollen im Gerüst — das wäre Inhalt im Gerüst, genau das, was der
ganze Umbau herausnimmt, und nach dem Einfrieren könnte kein Modul je einen neuen Zweck
mitbringen. Stattdessen: der MECHANISMUS im Gerüst, das VOKABULAR aus dem Modul.

**Die Auflösbar-Linie, wörtlich wie abgestimmt:** Struktur wird geprüft, Vokabular
nicht. `entitaet` ist ein GESCHLOSSENES Set — die vier Arten, die die Render-Schicht heute
tatsächlich trägt, je ein eigener Picker-Zweig (`person`/`institution`/`mappe`/`bankvollmacht`,
Zeile ~47860 ff.). `rolle`/`verweisZweck` sind OFFENE, vom Modul mitgebrachte Strings, gegen
keine Liste geprüft — derselbe Kontrakt, den `ereignisAchseModulPruefen` bei `sektorId`/`feldId`
schon trägt (Struktur + Ziel-Existenz, kein geschlossenes Feld-Vokabular), hier auf eine neue
Stelle übertragen, kein neues Prinzip.

**Keine Existenz-Prüfung gegen echte Personendaten bei der Modul-Prüfung** — das Feld ist zu
diesem Zeitpunkt noch leer, es gibt nichts, wogegen aufzulösen wäre. Die eigentliche Auflösung
(`data.menschen`/`data.institutionen`, über `_verweisExportZeile`/`verweisExportFelder`)
geschieht bereits heute generisch zur Laufzeit, unabhängig davon, ob die Feld-Definition nativ
oder angedockt ist — keine neue Prüf-Fläche nötig. Ein unbekannter `verweisZweck` degradiert
dort schon heute sicher auf „nichts exportieren" (Zeile ~28590), statt zu brechen.

**Warum alle vier `entitaet`-Werte, nicht nur die zwei häufigeren** (Einwand, 04.09.2026,
nach eigenem Vorschlag zunächst auf `person`/`institution` beschränkt): gemessen, nicht
angenommen — `person` (29 Vorkommen) und `institution` (7) tragen den Bestand, aber `mappe` und
`bankvollmacht` kommen ebenfalls vor (je ein Vorkommen: `identitaet.profilfoto`, eine
Bankvollmacht-Unterfeld) und sind im Render-Code GENAUSO entitaet-generisch behandelt (nicht an
das eine native Feld gebunden, Zeile ~47862/47873). Eine Beschränkung auf zwei hätte diese
beiden Felder beim künftigen Bürgerdepot-Umzug ENDGÜLTIG verworfen — ein abgewiesenes Feld
erreicht die spätere Registrierung nie, derselbe Mechanismus wie beim NGO-Fund (§3b), nur eine
Ebene tiefer. Ein Einzelvorkommen ist kein Grund zum Weglassen, wenn es im Bestand steht.

**Umgesetzt:** `entitaet`/`rolle`/`verweisZweck` in `_TEMPLATE_FELD_BEKANNTE_SCHLUESSEL` UND
`_TEMPLATE_UNTERFELD_BEKANNTE_SCHLUESSEL` (neue Konstante `_TEMPLATE_ENTITAET_BEKANNT` für die
vier zulässigen Werte). `_templateFeldZuModell` weist ein Feld mit unbekanntem `entitaet` GANZ
ab, namentlich benannt (`grund: 'entitaet'`) — dieselbe Regel wie bei einer unbekannten
Eigenschaft, nur eine Ebene tiefer (Wert statt Schlüssel). `rolle`/`verweisZweck` werden
unverändert durchgereicht, wenn gesetzt, wie `sensibel`/`marken`/... .

**Rot-Beweis:** `tests/feldmodell-uebersetzer.test.js` erweitert (6 Proben) — alle vier
`entitaet`-Werte werden übernommen, ein erfundener Wert weist das ganze Feld ab (Feld- UND
Unterfeld-Ebene), `rolle`/`verweisZweck` werden mit modul-eigenen, nie zuvor gesehenen Werten
unverändert durchgereicht (Beleg für das offene Vokabular). Die beiden bestehenden
„vollständiger Inhalt, nicht nur Stichproben"-Wächter (U2-ADR-246,
`tests/schema-wirkt-nicht-nachtrag.test.js`) bewusst erweitert, nicht umgangen.

---

## 3d · Nachtrag 04.09.2026 — der gebündelte Rest (Teil 3 von 5), mechanisch

Die verbleibenden 16 Schlüssel aus der ursprünglichen Lücken-Messung: `beispiel`, `ebene`,
`eingabeTyp`, `inputmode`, `vorschlaege`, `keineZukunft`, `datumJahrMin`, `gueltigkeitVorschlag`,
`fristRegel`, `codeListe`, `art`, `verweisKontextFeld`, `zusammenfassungFelder`, `mitGeburt`,
`unterdrueckeInZusammenfassungWennGesetzt`, `sichtbarWenn`. Keine eigene Design-Frage, wie bei
Pro Teil 2 (U2-ADR-243 §2) — Formen gemessen am nativen Bestand (String/Zahl/Boolean/kleines
Objekt/String-Array), in die Andock-Erlaubnisliste aufgenommen (Feld- UND Unterfeld-Ebene),
durchgereicht, wenn gesetzt, sonst weggelassen — wörtlich wie `sensibel`/`marken`/... .

**`sichtbarWenn` gesondert behandelt**, wie abgestimmt: geprüft, ob sich jeder Fall
verlustfrei in das bestehende `verborgenWenn` umkehren lässt — nein. 87 native Vorkommen, 15
distinkte Formen, davon 14 als `{feld, wert}` (Gleichheits-Vergleich, im Prinzip umkehrbar durch
Bildung des Komplements der Werte-Menge, aber brüchig — bricht bei einem künftigen neuen
Options-Wert) und eine als `{feld, minAnzahl}` (`vorsorge.vorsorge_instrumente/vertretungsModus`
— ein Listen-Zähl-Vergleich, den `verborgenWenn` strukturell nicht kennt, keine Negation rettet
das). `sichtbarWenn` bekommt darum einen eigenen Schlüssel, beide gemessenen Formen
(`wert`/`minAnzahl`) durchgereicht.

**Rot-Beweis:** `tests/feldmodell-uebersetzer.test.js` erweitert (5 Proben) — die einfachen
String-/Zahl-/Boolean-Schlüssel, die beiden Array-Schlüssel, die beiden Objekt-Schlüssel,
`sichtbarWenn` in beiden Formen, und die Unterfeld-Ebene als wörtlicher Spiegel. Die beiden
„vollständiger Inhalt"-Wächter (U2-ADR-246) erneut bewusst erweitert.

---

## 4 · Rot-Beweis

Neue Testdatei `tests/paket3-commitA-entkopplung.test.js` (8 Proben): die vier reservierten
Listen gegen den früheren abgeleiteten Stand geprüft, `*Alle()` ohne Modul == natives Array
(der Refactor-Beleg), die neue `reserviert`-Sperre bei `ereignisAchseModulPruefen` (positiv,
negativ, Rangfolge vor `doppelt-im-modul`).

`tools/bereichslisten-pruefen.js` (W-16) und `tests/ereignis-achse-modul-andockbar.test.js`
(Testkopf) nachgezogen, s. §2.

Vollsuite `npm test` plus E2E (`npm run test:e2e`) plus Konformitäts-Gate: s. Commit-Text für
den gemessenen Stand.

---

## 5 · Was dieser Commit NICHT verspricht

Kein Bit des laufenden Depot-Verhaltens ändert sich — jede Umstellung ist eine Identitäts-
Operation, solange kein Modul angemeldet ist. Commit A macht Commit B möglich, ersetzt ihn
nicht. Die drei in §3 genannten offenen Punkte sind Entscheidungen, keine vergessenen Zeilen.

---

## 6 · Commit B — noch offen

*(wird ergänzt, wenn Commit B landet)*

---

*Vivodepot GmbH · Berlin · 04.09.2026*
