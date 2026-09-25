# U2-ADR-369 · Der umgedrehte Wächter 3 — eine benannte Erlaubnisliste für das Deutsch-Leck

**Datum:** 08.09.2026
**Status:** gebaut, 6/6 Proben grün
**Status heute:** gilt
**Offen:** zwei Einzelfragen (KI-Verfügung/Vollmacht-Labels)
**Auftrag:** nach dem Fund „alle vier Produkte sehen exakt gleich aus" — der
alte Wächter 3 (`tools/vier-produkte-erzeugen.js`) maß die Deutsch-Leck-Zahl nur, ERWARTETE sie
> 0 „solange Zug 2 fehlt". Diese Erwartung war nie geprüft, nur behauptet.
**Bezug:** U2-ADR-361 (die vier Produkte selbst) · U2-ADR-363 (textLesen ohne Rückfall,
`_textsatzAbWerkRegistrySeed`) · U2-ADR-343 (die 151/134 `OFFEN_JURISTISCH`-Kennungen, amtlicher
Wortlaut gegen die bilingualen BMJ-PDFs geprüft)

---

## 1 · Der Befund

Neumessung auf dem aktuellen Kanon (nach U2-ADR-363): **287 von 3499 Kennungen** zeigen im
englischen Produkt weiterhin Deutsch. Alle 287 sind im EN-Modul VORHANDEN — keine einzige fehlt.
Das Leck besteht ausschließlich aus Einträgen, deren Wert wörtlich deutsch geblieben ist.

Aufgeschlüsselt nach Kennungspräfix/Herkunft, vier Gruppen:

| Gruppe | Anzahl | Herkunft |
|---|---|---|
| Amtlicher Wortlaut (BMJ) | 106 | `pvBmj#`, `vollmachtBmj#`, `dok:patientenverfuegung#`, `dok:vorsorgevollmacht#` |
| KI-Verfügung (Vivodepot-eigenes Template) | 28 | `kiKorpus#`, `dok:ki-verfuegung#` |
| Vollmacht-Kurz-Labels (Navigations-Wegweiser) | 17 | `vollmacht:vm_*.label` |
| Code/Eigenname/Format/Cognate | 136 | verstreut (Führerscheinklassen, Währungscodes, Steuerklassen, Institutionsnamen, Formate, einzelne identische Wörter) |

## 2 · Die vier Entscheidungen (07./08.09.2026)

**Gruppe 1 — amtlicher Wortlaut (106):** KEINE eigene Übersetzung.
[[project_immer_amtliche_fassung_kein_eigener_content]] gilt — Vivodepot ist Träger, nicht Autor.
Cross-Check gegen `tools/textsatz-en-juristisch-offen.js#OFFEN_JURISTISCH`: alle 106 stehen dort
bereits einzeln — kein Oversight, derselbe Zaun wie zuvor gezogen (U2-ADR-343). 0 von 106 hätten
heute eine `AMTLICHE_UEBERSETZUNG_FESTSTELLUNG`, wenn man sie prüfte.

**Gruppe 2 — KI-Verfügung (28):** NICHT übersetzen, gleiche Behandlung wie Gruppe 1. Begründung
(wörtlich): „es geht nicht darum, ob Vivodepot Autor sein DARF — bei der KI-Verfügung ist
es das, ein amtliches Muster existiert nicht. Es geht darum, dass eine Verfügung ein wirksamer
Text ist, kein Oberflächentext. Eine englische Fassung wäre entweder ein zweiter wirksamer Text
(braucht fachliche Feststellung) oder eine Lesehilfe (darf den deutschen nicht ersetzen)." Dieselbe
Maschinerie wie U2-ADR-363 (`AMTLICHE_UEBERSETZUNG_FESTSTELLUNG`), kein neuer Mechanismus. Wandert
aus der Liste, sobald eine Feststellung vorliegt.

**Gruppe 3 — Vollmacht-Kurz-Labels (17):** ÜBERSETZEN. Begründung: „sie sind Wegweiser, kein
wirksamer Text. Der wirksame Text steht in `vollmachtBmj#...frage`, bleibt deutsch und trägt den
Vermerk daneben. Ein englisches Label kann den Umfang einer Befugnis nicht verschieben, weil
daneben der deutsche Gesetzeswortlaut steht; ein deutsches Label in einem englischen Produkt macht
die Navigation dagegen unbrauchbar." Zwei Auflagen: wegweisend übersetzen, nicht auslegend; eine
Probe hält fest, dass der zugehörige `frage`-Wortlaut weiterhin deutsch danebensteht.

**Gruppen 1+2 (Code/Format/Cognate, 136):** in die Erlaubnisliste, mit einer Auflage, die
wichtiger ist als die Einordnung selbst (s. §3).

## 3 · Die Bauart-Auflage: Grund je Kategorie, Mitgliedschaft nie

Die Vorgabe, wörtlich: „Der GRUND darf je Kategorie stehen, die MITGLIEDSCHAFT nicht. Die Liste friert
die konkrete Kennungsmenge ein (alle 270 namentlich), nicht ein Präfixmuster. Sonst deckt
`pvBmj#*` jede künftige Kennung mit demselben Präfix still mit ab, und die Liste wird blind."

`tools/lib/deutsch-leck-erlaubnisliste.js` — vier `Object.freeze`-Gruppen, je mit `grund` (Text)
und `kennungen` (Array, jede Kennung wörtlich):

- `AMTLICHER_WORTLAUT_BMJ` (106)
- `KI_VERFUEGUNG_WIRKSAMER_TEXT` (28)
- `CODE_EIGENNAME_FORMAT` (112) — dauerhaft identisch (EU-weite Codes, Eigennamen, Formate)
- `COGNATE_ZUFAELLIG_IDENTISCH` (24) — nur zufällig identisch, getrennt geführt: „eine spätere
  Sprache mit anderem Vokabular träfe genau dort auf eine Lücke"

270 = 287 − 17 (übersetzt). `alleErlaubtenKennungen()` wirft, wenn eine Kennung in zwei Gruppen
zugleich stünde.

## 4 · Der Wächter: symmetrisch, nicht nur „unter der Schwelle"

`tools/deutsch-leck-pruefen.js` — vergleicht die REALE Deutsch-Leck-Menge (gemessen über
`deutscheZeilenImEnglischenProdukt`) gegen die Erlaubnisliste, in BEIDEN Richtungen:

- **UNERKLÄRT** — eine Kennung zeigt Deutsch, steht in keiner Gruppe. Neu, noch nicht eingeordnet.
- **VERALTET** — eine Kennung steht in der Liste, zeigt real kein Deutsch mehr. Die Liste
  behauptet einen Leck, der nicht mehr besteht.

Ohne die zweite Richtung wäre die Liste ein Friedhof: längst übersetzte Einträge blieben
unbemerkt stehen und deckten künftig etwas ab, das gar nicht mehr da ist.

**Suite:** `tests/u2-adr-369-deutsch-leck.test.js`, 6/6 — Positivkontrolle (Liste nicht leer, jede
Gruppe hat einen echten Grund), zwei Rot-Beweise (beide Richtungen, an synthetischen Mengen — der
Wächter selbst ist testbar ohne den echten Kern zu laden), eine Gegenprobe, die scharfe Abnahme
selbst (hart, kein Schwellenwert: `unerklaert === []` UND `veraltet === []` gegen die echten
DE/EN-Module) und die Gruppe-3-Kopplung (jedes übersetzte Label hat seinen `vollmachtBmj#...frage`
weiterhin deutsch daneben — fällt das auseinander, ist die Begründung für die Übersetzung weg).

## 5 · Die 17 Übersetzungen — chirurgisch, nicht durch das Modul selbst

`tools/textsatz-en-modul.json` ist eine generierte Datei (`tools/textsatz-en-modul-erzeugen.js`,
Vertrag: die committete Datei MUSS `baueModul()` byte-gleich entsprechen, geprüft in
`tests/textsatz-en-modul-erzeugen.test.js`). Ein erster Versuch, die 17 Werte direkt in die
3499-Zeilen-Datei zu schreiben, brach genau diesen Vertrag — die Datei ist ein Erzeugnis, keine
Quelle.

**Die echte Quelle:** die 17 Kennungen standen bereits in `OFFEN_JURISTISCH` (dort automatisch mit
dem deutschen Original befüllt, s. U2-ADR-363) — dieselbe Fehlklassifizierung wie ein bereits
bekannter, ähnlicher Fall (U2-ADR-344-Nachtrag: acht `vollmacht:*.label`-Kennungen, die ebenfalls
kein Rechtstext sind, wurden dort schon einmal aus `OFFEN_JURISTISCH` nach
`tools/textsatz-en-optionswerte-daten.js` verschoben). Genau dieses, bereits etablierte Muster
wiederholt:

1. 17 Zeilen aus `OFFEN_JURISTISCH` entfernt (151 → 134), mit Begründung im Kommentar, demselben
   Stil wie der Vorgänger-Nachtrag.
2. 17 Übersetzungen in `tools/textsatz-en-optionswerte-daten.js` ergänzt (413 → 430 Optionswerte).
3. Beide Generatoren (`textsatz-en-modul-erzeugen.js`, `textsatz-de-modul-erzeugen.js`) neu
   laufen lassen — Gesamtzahl bleibt 3499 (nur verschoben, nicht addiert/entfernt).

## 6 · Nebenfund: drei Glossar-Verstöße, gegen bestehende Konventionen korrigiert

Der Glossar-Wächter (`tests/textsatz-en-begriffe-pruefen.test.js`) hielt drei der 17 frischen
Übersetzungen für Rückfälle in bereits behobene Uneinheitlichkeiten:

- `vollmacht:vm_untervollmacht.label`: „Granting sub-authorization" → **„Granting a sub-power of
  attorney"** (kanonisch für „Vollmacht": power of attorney).
- `vollmacht:vm_betreuungsverfuegung_verweis.label`: „Proposing as guardian" → **„Proposing as
  court-appointed representative"** (kanonisch für „Betreuer", entschieden
  01.09.2026: weder „carer" noch „custodian" noch „guardian" trifft §1814 ff. BGB).
- `vollmacht:vm_vermoegen_konten.label`: „Accounts, securities, safe deposit boxes" →
  **„Accounts, custody accounts, safes"**, UND als fünfte Stelle in die bestehende
  `Depot`-Ausnahmeliste aufgenommen (`tools/textsatz-en-begriffe-pruefen.js`) — dieselbe
  Vollmachts-Befugnis wie die bereits ausgenommene längere Schwester-Kennung
  `vorsorge.vorsorge_instrumente/vm_vermoegen_konten.label`, dasselbe echte Bank-/
  Wertpapierdepot, nicht das Produkt.

Kein neuer Mechanismus — bestehende, bereits entschiedene Konventionen korrekt
angewendet, beim ersten Versuch übersehen.

## 7 · Was NICHT Teil dieses Zugs ist

- Die 106 amtlichen BMJ-Wortlaute und die 28 KI-Verfügung-Kennungen bleiben deutsch, bis eine
  fachliche Feststellung vorliegt (Entscheidung aussteht, KI-Verfügung).
- Das „Ab-Werk-Backen" (Sprachmodul/Pro-Modul in die ausgelieferte Produktdatei einbetten, damit
  ein konfektioniertes Produkt tatsächlich englisch STARTET) ist ein eigener, größerer Zug —
  dieses ADR schließt nur das Deutsch-LECK (falsch übersetzter/fehlender Text), nicht die Frage,
  ob die Sprache im ausgelieferten Produkt überhaupt aktiviert wird.
