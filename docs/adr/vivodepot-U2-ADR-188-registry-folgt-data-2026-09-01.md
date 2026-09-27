# U2-ADR-188: Die Registry folgt data

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** KORREKTHEIT, SICHERHEIT, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-141 (Textsatz-Module aus dem Depot heben — dort für den Lade-Weg gebaut,
hier auf die übrigen Wechsel-Stellen ausgedehnt). U2-ADR-145 (fünftes Einlass-Register,
Bereichs-Module). U2-ADR-182 Task 4 (Branding-Reset beim Depot-Schliessen — das hier für die
Modul-Registries nachgezogene Vorbild, dieselbe Stelle, derselbe Grund). U2-ADR-126 (Sensibel-
Architektur, `feldIstSensibel`/`vollExportJSON` — hier nicht verändert, nur wieder erreichbar
gemacht).
**Anker:** Bauauftrag, 01.09.2026, Fund eines parallelen Strangs (Acht-Stellen-Messung aller `data`-
Wechselstellen). Erweiterung eines laufenden Auftrags zur Sprachmodul-Vererbung („gehört dazu,
nicht in einen eigenen Auftrag", wörtlich) — vor dem Bau live nachgestellt (echtes
Chromium, echte Ed25519-Signaturkette, der reguläre UI-Weg über `modulEinlassenGeprueft` +
`_moduleEinlassWirken`), nicht nur gelesen. Zweiter Fund eines parallelen Strangs (01.09.2026, live am ausgelieferten
v487 gemessen): dieselbe Lücke lässt ein sensibles Feld in einem angedockten Sub-Bereich den
Export „ohne sensible Daten" im Klartext passieren — s. Konsequenzen.
**Status heute:** gilt — Beleg `tests/registry-folgt-data.test.js`,
`tests/export-sensibel-subkontext-bereich.test.js`.

---

## Kontext

Fünf Laufzeit-Registries (Bereichs-Module, Code-Listen, Rechtsraum-Module, Textsatz-Module,
Institutions-Arten) werden aus `data.*` aufgebaut, nicht direkt aus `data` gelesen — ein
angedocktes Modul wirkt erst, nachdem eine `_XAusDepotAnmelden(data)`-Funktion es in die
jeweilige Registry gehoben hat. `depotLaden()` (`vivodepot.html:16650` ff.) tut das an allen
fünf Stellen (bei Textsatz zusätzlich Schreibrichtung und Sprachkennung) — der einzige der acht
im Kern gemessenen `data`-Wechselstellen, der es bereits vollständig tat.

**Die anderen sieben wechseln `data`, ohne die Registry nachzuziehen — nicht alle falsch:**

- `subKontextBetreten()` (`vivodepot.html:25673`) setzt `data = sess.inhalt` — ein Sub-Depot ist
  strukturell ein Depot wie der Anker, kann also sein EIGENES `bereichsModule`/`textsatzModule`/…
  tragen. Ohne Nachzug blieb ein ins Sub gedocktes Modul unsichtbar: `data` trug es korrekt, die
  Registry zeigte weiterhin auf den Anker.
- `subKontextVerlassen()` (`vivodepot.html:25756`) setzt `data = _ankerData` zurück — dieselbe
  Lücke in die andere Richtung, und die unauffälligere der beiden: solange niemand zwischen
  Betreten und Verlassen andockt, sieht die (nie aktualisierte) Registry beim Verlassen „zufällig"
  richtig aus. Ein Fix nur am Betreten hätte den Fehler verschoben, nicht behoben — der Anker
  trüge danach die Beschriftungen des Sub, und der Fix sähe wie eine neue Regression aus.
- `_depotSpeicherZuruecksetzen()` (`vivodepot.html:30554`) setzt `data = null` — hier ist NICHT
  erneutes Aufbauen die richtige Wirkung, sondern Leeren. Ohne das zeigt das NÄCHSTE Depot (auch
  ein frisch angelegtes) die Module des gerade geschlossenen — dieselbe Fehlerklasse, die
  U2-ADR-182 Task 4 für Branding-CSS bereits einmal gelöst hat (`brandingAnwenden(null)`, eine
  Zeile daneben).
- `depotAnlegen()`, `vorschauDepotErzeugen()` und die beiden reinen Anker-Zwischenspeicher-
  Umschaltungen in `depotInternSichern()`/`depotInDateiSichern()` brauchen NICHTS: die ersten
  beiden erben eine bereits korrekte Registry (aus dem Vor-Depot-Weg oder aus dem oben
  behobenen Reset), und die beiden Zwischenspeicher-Stellen wechseln `data` nur kurz und OHNE
  Rendering dazwischen, um den Anker-Umschlag zu schreiben, während die Sicht im Sub bleibt — ein
  Rebuild dort wäre nicht wirkungslos, sondern SCHÄDLICH (kurzes Umspringen der aktiven Sprache
  während eines Hintergrund-Schreibvorgangs, gegen die dortige „Sicht bleibt im Sub"-Zusage).

Live nachgestellt vor dem Bau: ein signiertes Bereichs-Modul, über die echte Kette
(`modulEinlassenGeprueft` → `_moduleEinlassWirken`) in ein Sub-Depot gedockt, erschien sofort in
der Sidebar; nach `subKontextVerlassen()` blieb es dort sichtbar, obwohl der Anker es nie hatte;
nach Schliessen des Anker-Depots und Anlegen eines völlig unbeteiligten, neuen Depots B erschien
derselbe Sektor erneut — Screenshot im Bericht.

## Entscheidung

**Eine Zusage, eine Funktion:** `_alleModulRegisterAusDepotAnmelden(d)` (`vivodepot.html`, direkt
vor `subKontextBetreten`) baut dieselben fünf Register wie `depotLaden()` aus einem beliebigen
`d` neu auf — bewusst OHNE `depotNormalisieren()` (das läuft nur beim echten Laden, Migrationen/
Rettungs-Slot betreffen keinen reinen Kontextwechsel) und bewusst KEIN Umbau von `depotLaden()`
selbst (dessen bereichsModule-vor-normalisieren-Reihenfolge, A389, bleibt unangetastet). Drei
Aufrufer:

1. `subKontextBetreten()` — direkt nach `data = sess.inhalt`, vor dem Render-Trigger
   (`Modus._setzeIntern('vollmacht')`).
2. `subKontextVerlassen()` — direkt nach `data = _ankerData`, vor dessen Render-Trigger.
3. `_depotSpeicherZuruecksetzen()` — mit explizitem `null` (nicht `data`, das dort bereits `null`
   ist, aber die Absicht soll aus dem Aufruf selbst lesbar sein), direkt neben
   `brandingAnwenden(null)`.

**Eine Ausnahme, benannt statt verschwiegen:** Code-Listen (`CODE_LISTEN`, `vivodepot.html:17883`)
sind KEIN reines Depot-Register — `codeListeAnmelden()` schreibt additiv per `systemId` und
löscht nie, und dieselbe Liste trägt zusätzlich die EINGEBAUTEN `@vd-codeliste`-Blöcke, die nur
einmal beim Boot laufen. Ein Voll-Löschen bei `d=null` würde diese eingebauten Terminologien
mitreissen, ohne dass irgendetwas sie erneut registriert — eine neue, schwerere Lücke als die,
die diese ADR schliesst. `_alleModulRegisterAusDepotAnmelden` ruft `_codeListenAusDepotAnmelden`
darum weiterhin auf (additiv, wie im bestehenden `depotLaden()`-Weg — keine Verschlechterung),
verspricht für Code-Listen aber NICHT „folgt data" beim Leeren. Siehe Nebenfund.

## Verworfene Alternative

**`depotLaden()` selbst umbauen, damit `subKontextBetreten`/`-Verlassen` dieselbe Funktion
aufrufen** statt einer neuen. Verworfen: `depotLaden()`s Reihenfolge (`_bereichsModuleAusDepotAnmelden`
VOR `depotNormalisieren`, A389) ist an die Migrations-/Rettungs-Slot-Logik jenes einen Weges
gekoppelt und für einen reinen Kontextwechsel weder nötig noch gewollt — ein gemeinsamer Aufruf
hätte entweder `depotNormalisieren()` bei jedem Sub-Kontext-Wechsel unnötig mitlaufen lassen oder
`depotLaden()` selbst verzweigen müssen. Eine neue, kleinere Funktion mit fünf statt sechs
Schritten (kein `depotNormalisieren`) ist die schmalere, risikoärmere Änderung an einer Datei, an
der mehrere Zweige gleichzeitig arbeiten.

## Nebenfund — nicht behoben, hier festgehalten

`_moduleEinlassWirken()` (`vivodepot.html:36468`, die Sofort-Wirkung nach In-Session-Andocken)
ruft `_codeListenAusDepotAnmelden` NICHT mit — `depotLaden()` tut es. Möglicherweise eine sechste
Lücke derselben Familie: eine im laufenden Depot angedockte Code-Liste wirkte dann erst nach dem
nächsten `depotLaden()`, nicht sofort. Nicht Teil dieses Auftrags (01.09.2026,
ausdrücklich zurückgestellt) — vorgemerkt, damit der Fund nicht verlorengeht, weil er in keinem
Auftrag stand.

## Konsequenzen

Alle acht `data`-Wechselstellen sind jetzt einzeln klassifiziert (nicht pauschal behandelt):
zwei bauen aus dem neuen `data` auf (Sub-Betreten, Depot-Laden — Letzteres unverändert), eine
leert (Reset), zwei brauchen nichts (Anlegen, Vorschau — erben eine bereits korrekte Registry),
zwei dürfen NICHT angefasst werden (die beiden Anker-Zwischenspeicher-Umschaltungen). Die
Code-Listen-Ausnahme ist eine bestehende, nicht neu geschaffene Grenze — durch diese ADR nicht
verschlimmert, aber auch nicht geschlossen.

**Zweiter Fund (01.09.2026, live am ausgelieferten v487 gemessen): dieselbe Lücke war kein reiner
Anzeigefehler.** `vollExportJSON({sensibel:false})` hält sensible Felder zurück, EINGEBAUTE wie
ANGEDOCKTE gleichermaßen (`vivodepot.html:18729` ff., „DIE ANGEDOCKTEN FELDER DESSELBEN
BEREICHS", A359 Fund 1) — beide Prüfungen laufen innerhalb derselben äußeren
`for (const s of bereicheAlle())`. Fehlte ein Bereich in `bereicheAlle()` (wie ein ins Sub
gedockter, nach Verlassen+Wiedereintritt — Fund oben), lief die gesamte innere Prüfung für ihn
NIE, und ein von der Bürgerin ausdrücklich als sensibel markiertes Feld ging im Export „ohne
sensible Daten" im Klartext heraus. Derselbe Registry-Fix schließt diese Folge strukturell mit —
`subKontextBetreten()` baut `bereicheAlle()` jetzt bei JEDEM Eintritt neu auf, nicht nur beim
ersten. Geprüft, nicht nur angenommen: eigener Regressionstest unten, mit Positivkontrolle (ein
eingebautes sensibles Feld bleibt im selben Lauf abwesend — sonst bewiese ein grüner Test nur
einen toten Export) und von Hand geführtem Rot-Beweis gegen den unbehobenen Stand.

## Konformität

```konformitaet
aussage:  Ein signiertes Bereichs-Modul, ins Sub-Depot gedockt, wirkt sofort — bereicheAlle()
          zeigt den neuen Sektor, während der Sub-Kontext aktiv ist.
zustand:  geprüft
herkunft: invariante
pruefung: tests/registry-folgt-data.test.js#Hinrichtung
```

```konformitaet
aussage:  Nach subKontextVerlassen() zeigt der ANKER die Module des verlassenen Sub NICHT mehr —
          die Registry folgt data auch auf dem Rückweg, nicht nur beim Betreten.
zustand:  geprüft
herkunft: invariante
pruefung: tests/registry-folgt-data.test.js#Rückrichtung
```

```konformitaet
aussage:  Dieselbe Zusage gilt für die Textsatz-Registry (nicht nur für Bereichs-Module) — nach
          dem Verlassen liest der Anker nicht mehr die Sub-eigene Übersetzung.
zustand:  geprüft
herkunft: invariante
pruefung: tests/registry-folgt-data.test.js#Textsatz
```

```konformitaet
aussage:  Ein neu angelegtes, unbeteiligtes Depot zeigt nicht die Bereichs-Module eines vorher
          geschlossenen Depots — der Reset leert die Registry, wie brandingAnwenden(null) es für
          CSS bereits tut.
zustand:  geprüft
herkunft: invariante
pruefung: tests/registry-folgt-data.test.js#Paar B
```

```konformitaet
aussage:  Der Export „ohne sensible Daten" hält ein im Sub-Kontext angedocktes, ausdrücklich als
          sensibel markiertes Feld auch nach Verlassen und Wiedereintritt zurück — dieselbe
          Rückhaltung wie für eingebaute sensible Felder, geprüft im selben Lauf.
zustand:  geprüft
herkunft: invariante
pruefung: tests/export-sensibel-subkontext-bereich.test.js#Sicherheit
```

## Nachtrag 23.09.2026 — S5: das Betreten eines Subs normalisiert

Die Annahme oben, ein Sub-Kontextwechsel sei ein „reiner Kontextwechsel", trägt nicht. Der Inhalt eines Subs kommt aus
einem versiegelten Umschlag, den ein älterer Kern geschrieben haben kann. Er ist nie durch `depotNormalisieren()`
gegangen und blieb darum auf seinem Schema. Jede umbenannte Kennung war im Sub für den heutigen Kern unsichtbar,
gemessen an Stufe 81 (`identitaet.vorname`) und an Stufe 88 (`geburtsdatum`).

Nach U2-ADR-002 ist ein Sub ein Depot wie jedes andere; sein Betreten ist sein Laden. `subKontextBetreten()` ruft darum
direkt nach `_alleModulRegisterAusDepotAnmelden()` die Folge von `depotLaden()` auf: `_vorlagenFelderInBereichUebernehmen()`,
dann `depotNormalisieren()`. Steigt die Schemanummer, meldet es die Register erneut an, setzt den Migrationshinweis und
markiert den Stand als ungespeichert, damit das Versiegeln beim Verlassen den migrierten Inhalt schreibt.

Die A389-Reihenfolge, die diese ADR schützen wollte, bleibt erhalten: Die Register des Subs stehen vor dem Normalisieren.

Weiter händisch bleibt der Umzug der Vertretungsgrundlage aus Stufe 67 in `subDepotVertrauenOeffnen()`. Er braucht den
Eintrag im Anker (`verwalteteDepots`) und das Sub-Passwort zugleich, und `depotNormalisieren()` des Sub-Inhalts sieht den
Anker nicht.

Probe: `tests/sub-depot-migrationen.test.js`. Dazu gehört ein Klassenwächter über jede Stufe der Stufenliste mit gebautem
Alt-Depot.

---

*Vivodepot GmbH · Berlin · 01.09.2026*
