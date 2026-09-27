# U2-ADR-260 · Zwei Fehler, die in jeder ausgelieferten Kopie mitreisen — der Transparenz-Link ohne Ziel und die Sprachdeklaration, die dem Schalter statt der Sprache folgte

**Datum:** 04.09.2026
**Status:** Angenommen und umgesetzt.
**Status heute:** gilt — Fußzeile seit dem Nachtrag vom 24.09.2026 wieder mit Repository-Link (das Repository ist öffentlich), `vorDepotSprachkennung()`/
`vorDepotSprachkennungAnwenden()` im Kern, `tests/u2-adr-260-transparenz-link-ohne-ziel.test.js`
und `tests/u2-adr-260-sprachkennung-folgt-modul.test.js` grün.
**Entscheidung:** (Nummer vergeben).
**Bezug:** U2-ADR-097 (führt den Quellcode-Link als produkttragende Transparenz-Zusicherung) ·
U2-ADR-208 (Sprachkennung fällt auf die aktive Sprache zurück — dieselbe WCAG-Regel, andere
Stelle) · U2-ADR-182/U2-ADR-252 (Vor-Depot-Konfiguration, der Weg der Modul-Apps) ·
`vivodepot-style-guide.html` (Barrierefreiheit als Pflicht, WCAG-AA, bindend)

---

## Kontext und Problem

Beide Posten kommen aus derselben Erhebung vor dem Einfrieren. Beide sind klein. Beide stehen in
der Datei, die die Bürgerin bekommt — und reisen damit in jeder byte-identischen Kopie mit,
einschließlich jeder Modul-App, die ein Herausgeber an seine eigenen Kunden ausliefert, ohne es
zu wissen.

**Beide Befunde wurden vor dem Bau selbst nachgemessen, nicht übernommen.** Bei Posten 2 war das
entscheidend: der überlieferte Befund war gegen einen zwei Wochen alten Build gemessen und
inzwischen behoben — der echte, heute noch bestehende Fehler liegt an einer anderen Stelle
derselben Sache.

### Posten 1 — der Transparenz-Link zeigte auf ein privates, leeres Repository

`STRINGS.fussQuellcode` trug die Zeichenkette `github.com/vivodepot/vivodepot`, und die Fußzeile
rendert sie als dauerhaft sichtbaren, nicht wegklickbaren Link
(`<a href="https://…" target="_blank" rel="noopener noreferrer">`). U2-ADR-097 führt ihn als
EUPL-/Transparenz-**Zusage**.

**Eigene Messung (04.09.2026, live gegen GitHub):** das Ziel ist `PRIVATE` **und** `isEmpty:true`,
angelegt am 30.05.2026, `pushedAt` gleich dem Anlege-Zeitpunkt — es hat nie einen Push gesehen.
Wer dem Link folgt, sieht nichts: für eine nicht angemeldete Person eine 404-Seite. Der
bestehende Wächter `tools/repo-adresse-pruefen.js` kann das nicht sehen — er prüft
**Konsistenz** (überall dieselbe Adresse), nicht **Erreichbarkeit**.

Der Link stand nur an dieser einen Stelle im Produkt (gemessen: `vivodepot-lesen.html` und
`vivodepot-schluessel-teilen.html` tragen keinen Quellcode-Link).

### Posten 2 — die Sprachdeklaration folgte dem Schalter, nicht der Sprache

Der überlieferte Befund lautete: die englische Modul-App liefere im Wurzelelement `lang="de"`,
gemessen an der ausgelieferten Adresse, Build v1.0-rc.486. **Nachgemessen — und so stimmt es
heute nicht mehr:** U2-ADR-208 (02.09.2026, Schale v497) hat genau diesen Fall behoben, und die
tatsächlich ausgelieferte Modul-App steht inzwischen auf v501. In echtem Chromium über HTTP
gegen die ausgelieferte App gemessen: beim Laden `lang="en"`, `dir="ltr"`, Text durchgehend
englisch. Der Befund als solcher war also erledigt.

**Der Fehler, der geblieben ist**, liegt zwei Klicks weiter — und ist an derselben ausgelieferten
App gemessen, nicht am Quelltext gelesen:

| Zustand | `lang` | sichtbarer Text |
|---|---|---|
| Start | `en` | englisch |
| 1× Sprachschalter | `en` | englisch |
| **2× Sprachschalter** | **`de`** | **englisch** |

`vorDepotSpracheUmschalten()` schrieb seinen eigenen Zustand (`_vorDepotSprache`, kennt genau
zwei Werte: `'de'` und `'en'`) roh nach `document.documentElement.lang` und nahm damit einem
angedockten Sprachmodul seine Kennung wieder weg. Der sichtbare Text bleibt dabei die
Modulsprache, weil `vorDepotText()` für alles außerhalb von `PRE_DEPOT_EN` auf `STRINGS`
zurückfällt — und `STRINGS` hat das Modul überschrieben. Das ist WCAG 2.2 SC 3.1.1 (Stufe A):
ein Vorleseprogramm spricht englischen Text mit deutschen Ausspracheregeln.

Die Stelle war seit U2-ADR-208 ausdrücklich als eigener, von `textsatzRegeln()` unabhängiger
Sprachweg dokumentiert — die Reparatur von damals hat den Schalter mit `lang` verbunden, aber
nicht gefragt, ob der Schalter überhaupt die richtige Quelle ist, wenn ein Modul angedockt ist.

## Entscheidung

### Posten 1 — der Link entfällt, die Zusage bleibt

Drei Wege standen zur Wahl. Die Wahl hängt daran, wann das Repository öffentlich wird — eine
offene Produktentscheidung ohne Datum. Gebaut ist deshalb die Variante, die in **jedem**
Ausgang wahr bleibt.

| Weg | Warum nicht / warum |
|---|---|
| **(a) Link entfernen, Zusage ersatzlos streichen** | Verworfen. U2-ADR-097 führt die Zusage als produkttragend; sie still verschwinden zu lassen wäre ein zweiter Fehler, nur leiser. Die EUPL-1.2-Nennung in derselben Zeile stünde dann ohne jeden Hinweis darauf, wie man an den Quelltext kommt. |
| **(b) Link auf ein heute existierendes Ziel richten** | Verworfen, **weil gemessen wurde, dass es kein taugliches gibt.** Von den vier in Frage kommenden Repositories ist eines öffentlich, aber seit dem 13.07.2026 nicht mehr aktualisiert — ein zwei Monate alter Spiegel wäre eine andere Art Unwahrheit, denn der Quelltext der heute ausgelieferten App steht dort nicht; `tools/repo-adresse-pruefen.js` führt seine Adresse zudem ausdrücklich als verbotene Fremdadresse. Das Repository des tatsächlichen Arbeitsbaums ist privat, das im Produkt genannte privat und leer. |
| **(c) Link stehen lassen, Text ehrlich machen („wird mit Version 1 öffentlich")** | Verworfen — doppelt. Der Auftrag schließt ein Datumsversprechen aus, und ein Link, der ins Leere zeigt, bleibt ein Link, der ins Leere zeigt, egal was danebensteht. |

**Gebaut: die Zusage bleibt als Aussage, der Link entfällt.**
`'strings:fussQuellcode.text'` lautet `"Quellcode auf Anfrage"` (englisch: `"Source code on
request"`), gerendert als `<span class="ff-quellcode">` statt als `<a href>`. Der Weg zur Anfrage
steht in derselben Fußzeile: die Kontaktadresse zwei Einträge weiter links. Kein Datum, kein
Termin — die Aussage bleibt wahr, ob das Repository nie, bald oder spät öffentlich wird. Wird es
öffentlich, ist der Rückbau eine Zeile.

**Nebenwirkung, ausdrücklich gewollt:** `vivodepot.html` hat damit eine externe Link-Ausnahme
weniger. `tests/allowlist-verbote.test.js` führte den Quellcode-Link als eine von zwei benannten
Ausnahmen vom Verbot externer Abruf-/Link-Ziele. Diese Ausnahme ist **ersatzlos entfernt**, nicht
umgeschrieben — genau der Weg, den die dortige Fehlermeldung für diesen Fall vorsah („Ausnahme
entfernen"). Die Assertion ist danach strenger als vorher; kommt der Link je zurück, bricht sie,
und dann gehört die Ausnahme mit dem dann erreichbaren Ziel neu belegt.

### Posten 2 — eine Auflösung statt zweier fester Werte

Neu im Kern: `vorDepotSprachkennung()` (die Auflösung, ohne DOM prüfbar) und
`vorDepotSprachkennungAnwenden()` (der eine Nebeneffekt) — dieselbe Zweiteilung wie bei
`textsatzSchreibrichtungAnwenden`/`textsatzSprachkennungAnwenden`. `vorDepotSpracheUmschalten()`
ruft das Paar, statt selbst zu schreiben.

Die Auflösung, in dieser Reihenfolge:

1. **Schalter auf `'en'` → `'en'`.** Der Schirm zeigt dann den eingebauten englischen
   Vor-Depot-Satz: `PRE_DEPOT_EN` gewinnt in `vorDepotText()` über `STRINGS`, also auch über die
   Texte eines angedockten Moduls. Der Schirm **ist** englisch, unabhängig vom Modul.
2. **Sonst, wenn ein Sprachmodul angedockt ist → dessen Kennung**, aus derselben Auflösung wie
   überall sonst (`textsatzRegeln().sprachkennung`, seit U2-ADR-208 mit Rückfall auf die bloße
   Sprache). Hier ist der Punkt, an dem ein **drittes, viertes** Sprachmodul ohne weiteren
   Eingriff richtig deklariert wird.
3. **Kein Modul → der Schalterwert selbst** (unverändert `'de'`).

**Warum Stufe 1 kein „hartes `en`" ist** — der Einwand, den der Auftrag ausdrücklich erhebt: der
Wert kommt aus `_vorDepotSprache`, dem Zustand des Schalters, nicht aus einem in die
Dokumentsprache geschriebenen Literal. Er wird nur erreicht, wenn die Bürgerin selbst auf den
eingebauten englischen Textsatz geschaltet hat — genau dann ist der Schirm englisch. Ein
angedocktes drittes Sprachmodul landet nie in diesem Zweig, sondern in Stufe 2.

**Warum Stufe 3 den bloßen Schalterwert nimmt** und nicht `textsatzRegeln().sprachkennung`
(`'de-DE'`): das wäre eine Verhaltensänderung ohne Anlass an einer Stelle, die heute richtig ist,
und hätte den bestehenden U2-ADR-208-Wächter zum Nachziehen gezwungen. Der Wächter bleibt
unangetastet und wacht weiter.

### Was ausdrücklich NICHT geändert wird

- **Das statische `<html lang="de">` im Markup.** Es ist der Wert vor dem ersten Skript, kein
  Widerspruch, sondern der Ausgangswert — so bereits im Kern begründet. Eine Modul-App kann ihn
  nicht statisch anders setzen, weil der Dateisatz byte-identisch ist; genau dafür gibt es den
  Laufzeitweg.
- **Die drei bestehenden `textsatzSprachkennungAnwenden()`-Aufrufstellen** (depotLaden,
  `_alleModulRegisterAusDepotAnmelden`, `vorDepotKonfigurationAnwenden`). Sie sind an ihrer
  Stelle richtig und von einem eigenen Paar-Wächter gehalten; ihn für diesen Fix umzubauen hieße,
  einen wachenden Wächter für eine Sache anzufassen, die er nicht betrifft.
- **`tools/textsatz-en-modul.json`** wird als generiertes Artefakt neu erzeugt; die Quelldaten in
  `tools/textsatz-en-vollabdeckung-daten.js` sind mitgezogen. Ein bereits signiertes, im Umlauf
  befindliches Modul trägt den alten Text weiter — das ist die normale Eigenschaft signierter
  Module und kein Sonderfall dieses ADRs.

## Verifikation

**Posten 1** — `tests/u2-adr-260-transparenz-link-ohne-ziel.test.js`, gemessen am **gerenderten**
Fuß, nicht an der Quelle: die Zusage steht weiterhin im Fuß (sie ist nicht still verschwunden);
kein `href` im Fuß zeigt auf einen Code-Hoster (Muster breiter als die eine gefundene Adresse —
ein Umzug auf gitlab/codeberg/bitbucket wäre derselbe Fehler); der Zusage-Text hat keine
Adressform. Positivkontrolle: dieselben zwei Diskriminanten, angesetzt auf den wörtlich
nachgebauten alten Fuß, werden rot — und der neue Text fällt nicht schon an der Adressform durch
(sonst wäre die Probe grün aus dem falschen Grund).

**Posten 2** — `tests/u2-adr-260-sprachkennung-folgt-modul.test.js`, jeweils über den **echten**
Vor-Depot-Weg mit voller Signaturprüfung (`vorDepotKonfigurationAnwenden` +
`modulEinlassenGeprueft`), nicht über eine Nachbildung: der gemessene Fund selbst (englisches
Modul, zweimal schalten → Kennung bleibt englisch, im selben Lauf belegt, dass der sichtbare Text
englisch geblieben ist); ein **drittes** Sprachmodul (Ungarisch) wird richtig deklariert, in
beiden Schalterstellungen; ohne Modul bleibt der Schalter die Quelle (U2-ADR-208 unverändert in
Kraft); die Auflösung liefert ohne DOM dieselbe Kennung. Positivkontrolle: die alte Fassung,
nachgebaut als reine Funktion über denselben Zustand, liefert an genau dieser Probe einen anderen
Wert — sonst hätte die Probe den Unterschied nie gemessen.

**Grenze des Messmodells, benannt statt umgangen:** den Aufruf beim *Ankommen* des Moduls macht
`textsatzSprachkennungAnwenden()` per `setAttribute`, das der DOM-Stub der Testumgebung als noop
führt; im Stub ist dieser eine Schritt unsichtbar. Er ist stattdessen im echten Browser gemessen
(Chromium über HTTP, gegen die ausgelieferte Modul-App: Start `lang="en"`).

**Gegenprobe im echten Browser, nach dem Bau:** derselbe Lauf gegen einen Ordner aus der
geänderten `vivodepot.html` und der unveränderten, signierten Vor-Depot-Konfiguration der
ausgelieferten englischen Modul-App — Start `en`, 1× geschaltet `en`, **2× geschaltet `en`**
(vorher `de`), Text durchgehend englisch.

## Konsequenzen

**Positiv.** Zwei Fehler weniger in jeder byte-identischen Kopie. Der Link kann nicht mehr ins
Leere zeigen, weil er kein Link mehr ist. Die Sprachdeklaration hängt an der aktiven Sprache und
skaliert auf jedes weitere Sprachmodul, ohne dass jemand diese Stelle erneut anfassen muss. Eine
externe Link-Ausnahme weniger in `vivodepot.html`.

**Negativ / offen.** Die Frage, wann und wie der Quelltext öffentlich wird, bleibt unbeantwortet —
dieses ADR entscheidet sie ausdrücklich nicht, es sorgt nur dafür, dass das Produkt in der
Zwischenzeit nichts Falsches behauptet. Wird das Repository öffentlich, gehört der Link zurück,
und mit ihm die benannte Ausnahme im Allowlist-Wächter.

**Weiterhin offen, außerhalb dieses Zuschnitts:** die Adresse `github.com/vivodepot/vivodepot`
steht unverändert in `SECURITY.md`, `pages/README.md` und im Text von U2-ADR-097. Sie ist dort
keine Zusage an die Bürgerin im laufenden Produkt, sondern Projektdokumentation — sie mit zu
ändern hieße, die Veröffentlichungsentscheidung vorwegzunehmen.

## Nachtrag 24.09.2026 — das Ziel ist neu belegt

Das Repository ist seit der Veröffentlichung öffentlich erreichbar (`github.com/vivodepot/vivodepot`, gemessen am 24.09.2026:
anonym HTTP 200; nachsehen: `curl -sI https://github.com/vivodepot/vivodepot`). Der Grund dieser Entscheidung — ein Link, der
ins Nichts zeigt — ist damit entfallen, und die Fußzeile sagte „Quellcode auf Anfrage", obwohl der Quellcode öffentlich liegt.

Umgesetzt, wie der Test dieser ADR es für diesen Fall vorsah („wird der Link je zurückgebaut, … gehört das Ziel neu belegt"):
- Die Fußzeile verlinkt wieder, und zwar genau das eine Ziel aus der Konstanten `QUELLCODE_LINK` — als `<a target="_blank">`, eine
  Navigation, die die Person selbst auslöst, kein Abruf der Anwendung. Der Text nennt den Ort statt einer Adresse: „Quellcode auf
  GitHub" / „Source code on GitHub" (der Text bleibt keine Adressform).
- `tests/u2-adr-260-transparenz-link-ohne-ziel.test.js` prüft jetzt: der Fuß verlinkt genau `QUELLCODE_LINK` und kein anderes
  Hoster-Ziel; die Zusage steht weiter im Fuß; der Text ist keine Adresse.
- Klassenwächter `tests/quellcode-aussage-oeffentlich.test.js`: kein Text in Kern, Lese-App und Produkt-Sprachmodulen sagt, der
  Quellcode sei nur auf Anfrage, privat oder nicht öffentlich, solange das öffentliche Repository verlinkt ist.
- Die Adresse steht in der Allowlist externer URIs (`tests/allowlist-verbote.test.js`, Klasse f) und in
  `tools/https-adressen-positivliste.json`.
