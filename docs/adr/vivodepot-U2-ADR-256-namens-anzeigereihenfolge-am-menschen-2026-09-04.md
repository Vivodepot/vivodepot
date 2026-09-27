# U2-ADR-256 · Namens-Anzeigereihenfolge kommt vom Menschen, nicht von Sprache oder Rechtsraum

**Datum:** 04.09.2026
**Status:** gebaut, Suite grün
**Status heute:** gilt
**Bezug:** `tests/namenskomposition-reihenfolge.test.js` (Rot-Beweis) · die tiefere, hier bewusst
NICHT gelöste Frage nach Mononymen/Patronymen bleibt offen (eigene, separat geführte Erhebung)

---

## 1 · Kontext

Kursänderung (04.09.2026): „wir betrachten alles als Blocker, was nicht wie gewünscht
läuft, und lösen es. Wir dürfen solche Dinge nicht drin lassen, wenn wir einfrieren." Eine
Belastungsprobe mit einem chinesischen Modul maß daraufhin den Namensmodell-Befund aus dem
Bauplan-Posten 23 am echten Fall: die strukturierten Felder (vCard `N:`, FHIR
`HumanName.family`/`given`) trennen Familien- und Vorname bereits korrekt. **Nur die
Anzeige-Komposition war falsch** — sie setzte in **21 unabhängigen Kopien** (nicht neun, wie die
erste Meldung annahm, und auch nicht 13, wie eine frühere eigene Messung schätzte; erschöpfend
gegen alle fünf Top-Level-HTML-Dateien nachgezählt) dieselbe feste Reihenfolge
`[vorname, nachname, nachname2]` zusammen — für Nachnamen-zuerst-Kulturen (Chinesisch,
Japanisch, Koreanisch, Ungarisch) falsch, auch wenn die zugrundeliegenden Felder selbst
stimmten.

Ausdrücklich NICHT Gegenstand dieses ADRs: ob `vorname`/`nachname`/`nachname2` als Feldform jedes
Namenssystem abbilden können (Mononyme, Patronyme, mehrgliedrige Familiennamen). Das bleibt die
offene, größere Frage aus Bauplan-Posten 23. Dieser ADR löst nur die Anzeige-Reihenfolge der
bereits vorhandenen Felder — additiv, ohne die Katalog-Struktur selbst zu ändern.

---

## 2 · Entscheidung

**Ein neues, optionales Feld `identitaet.familienname_zuerst` (`typ: 'checkbox'`)**, additiv nach
U2-ADR-037: unausgefüllt/`false` = heutiges Verhalten, bytegleich — kein bestehendes Depot bewegt
sich. Teil der Rolle `ankerNameFelder` (jetzt `['vorname', 'nachname', 'nachname2',
'familienname_zuerst']`), damit ein Umschalten `data.menschen[].name` genauso sofort nachzieht
wie eine Änderung an vorname/nachname selbst — sonst bliebe der Registereintrag nach dem
Umschalten in der alten Reihenfolge stehen.

**Die Reihenfolge kommt ausschließlich von diesem Feld — nie aus Textsatz/Sprache oder
Rechtsraum.** Zwei voneinander unabhängige Gründe:

1. **UX:** eine Bürgerin mit chinesischem Namen und deutscher Oberfläche will ihren Namen trotzdem
   richtig herum — UI-Sprache ist eine Sitzungs-/Geräte-Einstellung, keine Aussage über den Namen.
   Dasselbe gilt für Rechtsraum (Modul-Eigenschaft, `_RECHTSRAUM_MODUL_SCHLUESSEL`) und
   Staatsangehörigkeit (bereits vorhandenes Feld, aber ausdrücklich freier Mehrfacheintrag ohne
   Enum) — beide geprüft, beide verworfen, aus derselben Holzweg-Klasse.
2. **Technisch, stärker:** ein Akteur-Matching-Pfad (`_inhaberPersonIdFinden()`, „per
   Identitäts-Name") vergleicht den komponierten Namen gegen den in `data.menschen[]`
   gespeicherten String, um dieselbe Person wiederzufinden. Würde die Reihenfolge aus einer
   kontextabhängigen Quelle berechnet statt aus einem gespeicherten Wert gelesen, könnte
   derselbe Mensch je nach Sitzung/Gerät zwei verschiedene komponierte Namen erzeugen — der
   Abgleich schlüge still fehl, eine Karteileiche entstünde. Nur ein an der Person selbst
   gespeicherter, stabiler Wert vermeidet das (Rot-Beweis: `tests/namenskomposition-
   reihenfolge.test.js`, NK-8).

**Eine gemeinsame Funktion, `identitaetAnzeigename(quelle)`, ersetzt alle 21 Kopien** — nach dem
im Kern bereits vorhandenen Vorbild `deckblattHTML()` (Reihenfolge als Daten, nicht als Code).
Eigene Kopie in `vivodepot-lesen.html` (kein Laufzeit-Modul geteilt, derselbe Grund wie bei
`magicStrippen`/`_jwkThumbprint`). Die zwei bereits korrekten vCard-`N:`-Felder
(`vcardIdentitaet()`, `notfallKontakteVcard()`) bleiben strukturell unangetastet — sie folgen
RFC 6350 (Familienname;Vorname), das ist keine Anzeige-Reihenfolge.

**Zwei mitgenommene nachname2-Funde** (Auflage, damit dieselbe Lücke nicht wiederkehrt, die vor
zwei Wochen bei A460 entstand): `vcardIdentitaet()`s FN-Feld ließ `nachname2` bislang ganz aus
(„María García López" exportierte als „María García") — jetzt behoben, in FN UND N:.
`subDepotAnlegen()` nahm `nachname2`/die Reihenfolge bislang gar nicht als Parameter an — jetzt
additiv ergänzt (kein UI-Weg erfasst sie heute beim Anlegen; die Funktion verwirft sie nur nicht
mehr, sobald ein künftiger Aufrufer sie mitgibt).

---

## 2a · Zwei vorher latente Bugs, gefunden beim echten Browser-Test — keiner in der neuen Komposition

Beide erst sichtbar geworden, weil die reale Browser-Interaktion nachvollzogen wurde
(Playwright + direkte DOM-Manipulation), nicht nur `sektorFeldSetzen()` programmatisch
aufgerufen. Der Node-Unit-Pfad hätte keinen der beiden gesehen — beide lagen in bestehendem
Code, den dieser ADR nur zum ersten Mal an dieser Feldart belastete.

**1 — `bearbeitungSpeichern()` las bei jedem `data-edit`-Feld `inp.value`.** Bei einer Checkbox
ist das laut HTML-Standard IMMER der String „on", unabhängig vom Häkchen — `familienname_zuerst`
war das erste checkbox-Feld, das je durch diesen generischen Auto-Save-Pfad lief, und deckte den
Fehler damit zum ersten Mal auf. Der Fehler lag also seit jeher da und wartete auf die erste
Checkbox. Behoben: `inp.checked` ist jetzt die gelesene Eigenschaft; der Vorher-Wert bleibt aus
demselben Grund boolean statt string-verglichen (sonst hätte jede Speicherung eines
Nachbarfeldes das unveränderte Häkchen als „geändert" markiert und einen unbegründeten
Provenienz-Stempel erzeugt).

**2 — native Checkboxen unterschreiten mit 13×13 px die WCAG-2.5.8-AA-Pflichtgröße von 24 px**
(`tests/e2e/fix-6-trefferflaechen.spec.js`, dieselbe Prüfung, die schon `<select>` einmal
gefangen hat). Behoben nach demselben Muster: `input[type="checkbox"], input[type="radio"] {
width: 24px; height: 24px; }`. Betrifft nicht nur `familienname_zuerst` — auch die zwei älteren
Checkboxen im Personenregister (`nichtMitgeben`/`verstorben`) hatten denselben Mangel, unbemerkt.

**Die eigentlich interessante Frage dahinter — auf Nachfrage nachgemessen, nicht
angenommen: warum hat der axe-core-WCAG-Scan (55 Sichten, 0 Violations) das nie gefangen?**
Nicht, weil die betroffenen Sichten außerhalb des Scans lägen — `sektor:identitaet` und
`sektor:meine-menschen` sind beide Teil der 39 gescannten Kern-Sichten
(`tests/konformitaet/wcag-axe.mjs`), die „Kernidentität"-Karte, die `familienname_zuerst` trägt,
ist beim Sektor-Öffnen bereits sichtbar (kein zusätzlicher Aufklapp-Schritt nötig — dieselbe
Sicht, die `fix-6-trefferflaechen.spec.js` ohne Sonderbehandlung maß). **Der wirkliche Grund:
axe-core (Version 4.12.1, hier verwendet) bringt eine `target-size`-Regel — trägt sogar das
Tag `wcag22aa`, das dieser Scan explizit anfordert — aber sie ist im Werkzeug selbst per Default
`enabled: false`** (gemessen: `axe.getRules().find(r => r.ruleId === 'target-size')`). Ein Tag
anzufordern aktiviert eine deaktivierte Regel nicht automatisch. **Das heißt: der axe-Scan hätte
diese Fehlerklasse an KEINER Sicht gefunden, auch bei voller Abdeckung aller Sichten der App —
nicht ein Abdeckungs-, sondern ein Konfigurations-Blindstellen. Die einzige Prüfung, die diese
Fehlerklasse überhaupt fängt, ist die eigens dafür gebaute `tools/lib/trefferflaechen.js`
(Fixliste Nr. 6) — und die deckt nach eigener, dokumentierter Definition nur die zehn
Top-Level-Bereiche ab, nicht Einstellungen, Sub-Depot-Flüsse oder Dialoge.** Ob axe-cores
`target-size`-Regel bewusst aktiviert werden soll (mit dem Risiko eigener Falsch-Positive, das
laut deque den Default-Deaktivierungs-Grund bildet) oder ob Fixliste Nr. 6 ihren Erhebungsraum
über die zehn Bereiche hinaus ausweiten soll, ist hier NICHT entschieden — das wäre ein eigener
Auftrag, kein Nebenbefund dieses ADRs. Wie viele Sichten es INSGESAMT in der App gibt (über die
55 axe-gescannten hinaus), ist nicht seriös gemessen — beide Scan-Dateien selbst lehnen eine
runde Zahl ab (`wcag-axe.mjs` verwirft ausdrücklich eine geerbte „31 Sichten"-Überzeichnung
zugunsten einer echten, aufgezählten Liste) und führen eigene `uebersprungen`-Listen für Sichten,
die sich programmatisch nicht sauber öffnen ließen. Eine belastbare Gesamtzahl wäre eine eigene
Erhebung, keine Ableitung aus dem hier Gemessenen.

---

## 3 · Bewusst nicht Teil dieses ADRs

**Die Katalog-Struktur von Bauplan-Posten 23** (Mononyme, Patronyme, mehrgliedrige
Familiennamen) — unverändert offen, durch diesen ADR weder vergrößert noch gelöst. Ein
Reihenfolge-Flag auf den bestehenden drei Feldern bleibt additiv, unabhängig davon, wie Posten 23
später entschieden wird.

**Kein UI-Weg, der `familienname_zuerst` beim Sub-Depot-Anlegen abfragt** — die Funktion nimmt
den Wert jetzt entgegen und verwirft ihn nicht mehr, aber kein Formular setzt ihn heute. Reine
Datenmodell-Vorbereitung, kein UI-Auftrag.

**Kein hübscher Ja/Nein-Text für das Feld in der Lese-App**, falls es je über den generischen
`feldWertText()`-Fallback als roher `String(roh)` angezeigt würde (zeigte „true" statt „Ja"
für den seltenen Fall, dass jemand das Feld aktiv gesetzt hat UND die Begleit-App öffnet). Ein
vorbestehender, allgemeiner Grenzfall des generischen Renderers (jedes ungestylte
Boolean-Feld hätte dasselbe Verhalten), keine neue Lücke — nicht behoben, um keine neue
Zwei-Sprachen-Strings-Infrastruktur für einen einzelnen Aufrufer zu bauen.

---

## 4 · Rot-Beweis

Neue Testdatei `tests/namenskomposition-reihenfolge.test.js` (13 Proben, NK-1…NK-13):
`identitaetAnzeigename()` Grundverhalten + Trimmen (NK-1/2), Reihenfolge dreht sich mit Flag
(NK-3), reale Aufrufstellen (`vcardIdentitaet()`, `fhirIpsBundle()`) bytegleich OHNE Flag
(NK-4/5/7) und gedreht MIT Flag (NK-6/7) — **die wichtigere Richtung ist die bytegleiche**,
bestehende Depots dürfen sich nicht bewegen. `ankerNameAusIdentitaetSpeisen()`/
`_inhaberPersonIdFinden()` bleiben konsistent, auch mit gesetztem Flag, inkl. Gegenprobe gegen
die alte West-Formel (NK-8), sofortiges Nachziehen bei Umschalten (NK-9). `subDepotAnlegen()`
nimmt `nachname2`/Flag jetzt an (NK-10), bleibt ohne sie bytegleich (NK-11). Feldkatalog- und
Begleit-App-Parität (NK-12/13).

`tests/provenienz-name-bruecke.test.js` nachgezogen (die Rolle `ankerNameFelder` trägt jetzt vier
statt drei Felder — bestehende Aussage korrigiert, nicht die Prüfung aufgeweicht).

Vollsuite `npm test`: s. Commit-Text für den gemessenen Stand.

---

## 5 · Was dieser ADR NICHT verspricht

Kein bestehendes Depot ändert sein Verhalten, solange `familienname_zuerst` nicht aktiv gesetzt
wird — jede der 21 umgestellten Stellen ist für den Default-Fall eine Identitäts-Operation. Die
Frage, ob `vorname`/`nachname`/`nachname2` als Feldform selbst ausreicht, bleibt offen (Bauplan
Posten 23) — dieser ADR macht sie weder dringlicher noch beantwortet er sie.

---

*Vivodepot GmbH · Berlin · 04.09.2026*
