# U2-ADR-201: Datengestalten — die E2E-Suite lebt die Vertretungswege, nicht nur die Standardgestalt

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** TEST-ABDECKUNG, VERTRETUNG
**Linie:** U2
**Anker:** Auftrag, 01.09.2026: „Über zwanzig aufgabenbasierte
Durchläufe in `tests/e2e/` fahren die Bürgerwege — aber alle mit derselben Sorte Mensch."
Zug 0 (Erhebung) freigegeben, Zug 1 nach Befund freigegeben in der Reihenfolge Betreuung, dann
Kinder.
**Status heute:** gilt — beide Commits stehen. Betreuung, Beleg
`tests/e2e/persona-betreuung-echte-vertretungswege.spec.js`. Kinder/Sorgerecht, Beleg
`tests/e2e/persona-kinder-sorgerecht-subdepot.spec.js`.

---

## Kontext

Die Standardgestalt jedes E2E-Tests (`tests/e2e/helpers.js`, `depotAnlegen()`) ist „Maria
Mustermann" — ein erwachsener Einzel-Akteur, keine Kinder, keine Betreuung, keine
Beeinträchtigung, mit funktionierendem FSA-Gerät. Zug 0 (Erhebung) maß statt zu vermuten, welche
Kern-Wege dadurch strukturell nie mit einem echten Wert gelebt werden — nicht
Zeilenabdeckung, sondern „hat irgendein Lauf diesem Feld je einen echten Wert gegeben, über
einen echten Klickweg".

**Befund für Betreuung, der dringlichste der vier gemessenen Gestalten:** zwei Kern-Wege
bestehen — `vorsorge_instrumente[typ='betreuerbestellung']` („ich stehe selbst unter
Betreuung") und `meine-menschen.kinder[art='betreuter_erwachsener']` („ich betreue jemand
anderen") — und **keiner der beiden wurde von den 241 bestehenden Tests je mit einem echten
Wert über den echten Klickweg belegt.** Zwei namentlich naheliegende Tests
(`04-vollmacht-submodus.spec.js`, `05-angehoerigen.spec.js`) sind reine UI-Modus-Umschalter-
Proben ohne ein einziges Betreuungsfeld. Ein dritter Test mit dem Titel
`persona-berufsbetreuerin-mehrfach-depot.spec.js` füllt **trotz seines Titels** kein einziges
Betreuungsfeld — nur Identität und einen Pflegewunsch-Freitext. Der Name behauptet eine
Abdeckung, die es nicht gibt.

**Befund für Kinder/Sorgerecht:** in allen 90 damaligen Kinder-nahen Specs wurde
`sorgerecht_kind` (Enum `gemeinsam/allein/vormund/andere`) **kein einziges Mal** gesetzt; `art`
trug **nur je `'leiblich'`** (zweimal, über Vorgabe/Injektion, nie eine der übrigen fünf Werte);
`flowKindSubDepotAnlegen` wurde **nie bis zum Abschluss durchlaufen** —
`gebwiz-subdepot-vorschlag-abnahme.spec.js` prüft nur, dass der echte Passwort-Dialog öffnet,
bricht aber davor ab, kein Sub-Depot für ein Kind wurde je real angelegt. Der einzige je
gesetzte Geburtsdatums-Wert lag zudem in der **Zukunft** (`2027-03-15`) — `minderjaehrigkeit()`
lief nie mit einem tatsächlich vergangenen Datum.

## Entscheidung

**Zwei neue, echte Klickweg-Proben in `tests/e2e/persona-betreuung-echte-vertretungswege.spec.js`:**

1. `[Betreuung·A]` — die Inhaberin legt über den echten Modal-Weg (Vorsorge-Instrument
   `typ='betreuerbestellung'`) einen bestellten Betreuer, Aufgabenbereiche, Betreuungsgericht,
   Aktenzeichen und Bestellungsdatum an, mit klar erkennbar erfundenen Daten (`TEST-`-Präfix).
2. `[Betreuung·B]` — die Inhaberin trägt über die `kinder`-Liste (`art='betreuter_erwachsener'`)
   die Vertretung eines betreuten Erwachsenen ein — Person, Vertretungs-Grundlage,
   Aufgabenbereiche, Betreuungsgericht, Aktenzeichen, Beginn.
3. `[Betreuung·Gegenprobe]` — dieselbe Liste mit `art='leiblich'` zeigt den Sorgerecht-Zweig,
   nicht den Vertretungs-Zweig. Ohne sie wäre „vertretung_art sichtbar" kein Beleg — es könnte
   für jede Art zutreffen.

**Nebenfund, eigenständig behoben (nicht Teil dieses ADR):** beim Bau von Fall B legte die
Gegenprobe einen echten Produktbug offen — die Live-Sichtbarkeits-Verdrahtung im
Listen-Eintrag-Modal kannte `verborgenWenn` nicht, wodurch bei einer neuen `kinder`-Zeile
Betreuungsgericht-/Aktenzeichen-Werte auch für ein leibliches Kind mitgespeichert worden
wären. Eigener Commit, eigene Nummer: **U2-ADR-202.**

**Zwei neue, echte Klickweg-Proben in `tests/e2e/persona-kinder-sorgerecht-subdepot.spec.js`:**

4. `[Kinder·A]` — ein Pflegekind (`art='pflege'`) mit einer echten, neu angelegten
   Registerperson (Ref, kein Freitext-Override) und einem echten vergangenen Geburtsdatum;
   `sorgerecht_kind` wird über den echten Modal-Weg auf `'allein'` gesetzt. Belegt drei
   Zug-0-Lücken auf einmal: `art≠leiblich`, ein echter `sorgerecht_kind`-Enum-Wert, ein
   vergangenes Geburtsdatum.
5. `[Kinder·B]` — dieselbe echte-Ref-Konstruktion, dann der Listen-Knopf „Sub-Depot für dieses
   Kind anlegen" (`[data-kind-subdepot]`, `flowKindSubDepotAnlegen`) bis zum ECHTEN Abschluss:
   Passwort gesetzt, bestätigt, ein Sub-Depot mit echtem verschlüsseltem Umschlag und
   korrekter `vertreteneRegisterId`-Verknüpfung entsteht in `data.verwalteteDepots`. Genau die
   Stelle, an der `gebwiz-subdepot-vorschlag-abnahme.spec.js` bewusst abbricht.

Der Personen-Ref läuft über den `__neu__`-Inline-Weg, nicht den Freitext-Override: bei reinem
Override liefert `liesEintragAusWerten` `{ ref: '', override: ... }` —
`flowKindSubDepotAnlegen` verlangt aber `eintrag.person.ref` (`vivodepot.html:48738`) und bräche
sonst am `kindSubDepotOhnePerson`-Toast ab, bevor Fall B den eigentlichen Fund überhaupt
erreicht.

## Konformität

```konformitaet
aussage:   Die Betreuerbestellung — eine bereits gerichtlich angeordnete Betreuung der
           Depot-Inhaberin selbst — lässt sich über den echten Klickweg mit einem echten Wert
           anlegen: Person, Aufgabenbereiche, Betreuungsgericht, Aktenzeichen und Bestellungs-
           datum landen sichtbar im Bereich.
zustand:   geprüft
quelle:    invariante
pruefung:  tests/e2e/persona-betreuung-echte-vertretungswege.spec.js#[Betreuung·A] Betreuerbestellung — die Inhaberin steht selbst unter Betreuung, mit echtem Wert
```

```konformitaet
aussage:   Die Vertretung eines betreuten Erwachsenen (`kinder`-Liste, art='betreuter_
           erwachsener') lässt sich über den echten Klickweg mit einem echten Wert anlegen, und
           die Liste zeigt für diese Art den Vertretungs-Zweig statt des Sorgerecht-Zweigs —
           belegt gegen eine Gegenprobe mit `art='leiblich'`, die das Gegenteil zeigt.
zustand:   geprüft
quelle:    invariante
pruefung:  tests/e2e/persona-betreuung-echte-vertretungswege.spec.js#[Betreuung·B] betreuter Erwachsener — die Inhaberin betreut jemand anderen, mit echtem Wert
```

```konformitaet
aussage:   Eine Kind-Zeile mit `art≠'leiblich'` (z. B. `'pflege'`) lässt sich über den echten
           Klickweg mit einer echten Registerperson, einem echten vergangenen Geburtsdatum und
           einem echten `sorgerecht_kind`-Enum-Wert anlegen.
zustand:   geprüft
quelle:    invariante
pruefung:  tests/e2e/persona-kinder-sorgerecht-subdepot.spec.js#[Kinder·A] Pflegekind mit echtem, vergangenem Geburtsdatum — sorgerecht_kind wirklich gesetzt, nicht nur gerendert
```

```konformitaet
aussage:   Der Listen-Knopf „Sub-Depot für dieses Kind anlegen" (`flowKindSubDepotAnlegen`)
           führt über den echten Klickweg bis zum ECHTEN Abschluss: ein Sub-Depot mit
           verschlüsseltem Umschlag und korrekter `vertreteneRegisterId`-Verknüpfung zur
           Kind-Person entsteht in `data.verwalteteDepots`.
zustand:   geprüft
quelle:    invariante
pruefung:  tests/e2e/persona-kinder-sorgerecht-subdepot.spec.js#[Kinder·B] Sub-Depot für ein Kind wirklich bis zum Abschluss angelegt — echtes Passwort, echter Umschlag
```

## Ausdrücklich nicht Teil dieses Auftrags

Zug 0, eigene Posten: `vivodepot-lesen.html` ohne Browser-Navigation in `tests/e2e/`
(ausgelieferte Produktoberfläche ohne Browser-Prüfung, getrennt vergeben) und die fehlende
Beeinträchtigungs-Abbildung in `krisenvorsorge` (offene Produktfrage).

---

*Vivodepot GmbH · Berlin · 01.09.2026*
