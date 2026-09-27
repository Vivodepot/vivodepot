# U2-ADR-104: Datenmodell-Block — vier Skalarfelder werden Listen, ein Kontaktfeld wird zwei (Schema 41)

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** DATENMODELL, ARCHITEKTUR, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-100 §8 (migrationsfreies Fenster) · U2-ADR-072/073 (Vorbild: Skalar-Alias →
Listen-Aggregation im b16-Import) · U2-ADR-096 (erbwiz entfernt) · U2-ADR-098/099 (Klausel-Format,
Prüfstand) · U2-ADR-023 (abgeleitete Werte nie gespeichert)
**Anker:** Vollerhebung 26.07.2026 (Rang-1-Datenmodell-Posten) ·
Report `datenmodell-block-migrations-delta-report-2026-07-26.md` (intern, nicht Teil dieses Repos)
**Status heute:** gilt — Beleg `tests/datenmodell-block-41.test.js`.

---

## Kontext

Vier Felder trugen mehrere Sachverhalte in **einem** Freitext:

| Feld | Bereich | was drinstand |
|---|---|---|
| `voroperationen` | gesundheit | „Blinddarm 2008; Hüft-TEP rechts 2019" |
| `familienanamnese` | gesundheit | „Vater Herzinfarkt mit 60; Mutter Diabetes Typ 2" |
| `nachlass_vermoegen` | finanzen | „Eigentumswohnung München; Depot ING; Lebensversicherung Allianz" |
| `wohnungsschluessel_ort` | verwaltung | „Nachbarin Sarah; Tochter Anna" |

Ein Freitext, den nachgelagert jemand aufteilen muss, ist ein Datenmodell-Fehler. Am deutlichsten
beim FHIR-Generator: er erzeugte aus `voroperationen` **einen** `Procedure`-Eintrag, für beliebig
viele Eingriffe — mit der ausdrücklichen (und für den damaligen Stand richtigen) Begründung, ein
Split an „;" würde Struktur erfinden, die die Bürgerin nie angelegt hat.

Fünftens mischte `vermieter_tel` Telefon **und** E-Mail („089 12345-678 · vermieter@example.de") und
konnte darum kein `eingabeTyp` tragen: weder `tel` noch `email` wäre für beide richtig gewesen.

**Der gefährliche Teil war nicht die Konvertierung.** Gemessen am 26.07.: `sektorFeldSetzen` auf ein
Listenfeld **warf nicht**. Der String überschrieb die Liste, und `_listeOder` ersetzte ihn beim
nächsten Listen-Zugriff **wortlos durch `[]`** — der Wert war weg, ohne Fehler, ohne Hinweis. Nach der
Konvertierung wäre jeder verbliebene Skalar-Schreiber ein stiller Datenverlust gewesen. Es gab zwei:
den **anamwiz** (Ziel `{sektor:'gesundheit'}` ohne `liste`, eigene Schritt-Felddefinitionen mit
`typ:'text'`) und den **B16-Import-Alias** (vier der fünf Felder).

## Entscheidung

**1 — Vier Felder werden Listen.** Eine reine String-Liste gibt es im Modell nicht (gemessen: 13 von
13 Listen-Feldern tragen `unterFelder`), also bekommt jede Konvertierung eine entschiedene Struktur:

| Feld | `unterFelder` | Alt-Skalar landet in |
|---|---|---|
| `voroperationen` | `eingriff`, `jahr` | `eingriff` |
| `familienanamnese` | `person`, `erkrankung`, `alter_bei_erkrankung` | `erkrankung` |
| `nachlass_vermoegen` | `wert`, `ort` | `wert` |
| `wohnungsschluessel_ort` | `person` (ref), `anmerkung` | **`anmerkung`** |

`wohnungsschluessel_ort` ist der Sonderfall: der Alt-Wert enthält **Namen**. Er geht trotzdem nach
`anmerkung`, **nicht** nach `person` — Freitext gehört nie ungeprüft in ein `ref`-Feld. Die Bürgerin
verknüpft die Person selbst.

Das Unterfeld heißt `alter_bei_erkrankung`, nicht `alter`: der U2-ADR-023-Wächter verbietet ein Feld
namens `alter`. Semantisch wäre es hier zulässig gewesen (das Alter des Vaters bei seinem Herzinfarkt
veraltet nie), aber **einen Verbots-Wächter aufzuweichen, um ein Feld unterzubringen, ist die falsche
Richtung** — der präzisere Name ist ohnehin besser.

**2 — `vermieter_tel` wird zwei Felder**, `vermieter_tel` (`eingabeTyp:'tel'`) und `vermieter_email`
(`eingabeTyp:'email'`), **an beiden Stellen**: als Sektor-Feld in `wohnen-haupt` und als Unterfeld der
Liste `weitere_wohnungen`. Es gab **keine doppelte `id` aufzulösen** — die zweite Stelle liegt in einem
anderen Namensraum, und sieben Felder sind zwischen den beiden Sektionen absichtlich gespiegelt
(Muster „Hauptwohnung als Singleton, weitere Wohnungen als Liste").

**3 — Typ-Wächter in `sektorFeldSetzen`.** Er wirft, wenn die Felddefinition `typ:'liste'` trägt.
Er schützt die **Klasse**, nicht die fünf Felder dieses Umbaus: jedes künftige Skalar→Liste hätte
sonst dieselbe Grube.

**4 — Vierte Wizard-Zielform `{sektor, liste, unterfeld}`.** Die dritte Form adressiert „die Zeile des
Typs" (Instrumente); Listen ohne Typ-Diskriminante brauchten eine eigene. Der anamwiz-Schritt schreibt
damit in die **erste** Zeile und legt sie an.

**Benannte Grenze:** der Wizard stellt EINE Frage und bekommt EINE Antwort — er füllt die erste Zeile,
nicht N Zeilen. Wer mehrere Eingriffe hat, trägt die weiteren im Listen-Editor nach; die Hilfetexte
sagen das. Das ist kein Datenverlust und keine Verschlechterung gegenüber vorher (da stand alles in
einem Freitextfeld), aber es ist **nicht die Endform**. Ein wiederholbarer Wizard-Schritt („noch
einer?") wäre sie; den gibt es im Rahmen heute nicht.

**5 — FHIR: ein `Procedure` je Eintrag.** `code.text` aus `eingriff`; ein sauberes vierstelliges Jahr
wird `performedDateTime`, alles andere `performedString`, nichts wird geraten. Die alte Begründung
(„kein Splitten") ist damit erledigt — nicht widerlegt: die Trennung wird nicht mehr geraten, sondern
von der Bürgerin gesetzt.

**6 — B16-Import.** Die vier Skalar-Aliase sind entfernt; die Aggregation liegt in `_b16Felder`, nach
dem Muster von U2-ADR-072 (`fachaerzte`) und U2-ADR-073 (`abhaengige_personen`): **ein** Listen-Eintrag
je importiertem Freitext. Der gemischte Vermieter-Kontakt wird über **dieselbe** Regelfunktion getrennt
wie in der Migration (`_kontaktTelEmailTrennen`) — zwei Kopien wären zwei Regeln, die auseinanderlaufen.

**7 — N1: Rückfrage vor dem Entfernen.** `data-eintrag-entfernen` löschte in einem Klick, ohne Dialog
und ohne Undo, während `data-person-entfernen` im selben Bereich fragte. Vier neue Listen hätten die
Fläche vervierfacht. Beide Wege fragen jetzt, in der Form des bestehenden Personen-Dialogs. Bei
`data-refm-weg` **nur für befüllte Zeilen**: eine leere Zeile wegzufragen wäre Über-Fragung, kein Schutz.

**8 — Schema 40 → 41**, ein Bump für den ganzen Block, 18. Glied der Kette. **Leer → `[]`**, nicht
`[""]` und nicht `[{}]`: beide erzeugten im Listen-Editor eine Geisterzeile.

## Konsequenzen

Die Lese-App trägt dieselben Deklarationen — der Paritäts-Wächter hat die Kopplung gemeldet, die
weder Report noch Auftrag genannt hatten: ein Feld, das im Kern Liste ist und dort `text`, erschiene
der Vertrauensperson als „nichts hinterlegt", obwohl Daten da sind.

Ungemessen: ob b16 je einen eigenen Alt-Schlüssel für die Vermieter-**E-Mail** trug (Alt-Datenlage lag
nicht vor). Ebenso ungemessen: ob DOCX-/PDF-Bereichsmodelle die vier Felder als Skalar rendern.

## Konformität

```konformitaet
aussage:  Ein Skalar-Schreibweg auf ein Listenfeld wirft, statt die Liste mit einem
          String zu überschreiben — der beim nächsten Listen-Zugriff wortlos verfiele.
zustand:  geprüft
herkunft: invariante
pruefung: tests/datenmodell-block-41.test.js#u2-104-skalar-schreibweg-auf-liste-wirft
```

```konformitaet
aussage:  Ein Alt-Depot (Schema 40) mit gefülltem Skalar migriert zu einer Liste mit
          genau einem Element, und der Wert steht im richtigen Unterfeld — bei
          `wohnungsschluessel_ort` in `anmerkung`, nie im ref-Feld `person`.
zustand:  geprüft
herkunft: invariante
pruefung: tests/datenmodell-block-41.test.js#u2-104-alt-depot-wird-ein-listen-eintrag
```

```konformitaet
aussage:  Ein leerer Skalar migriert zu einer leeren Liste, nicht zu `[""]` oder `[{}]` —
          beide erzeugten eine Geisterzeile im Listen-Editor.
zustand:  geprüft
herkunft: invariante
pruefung: tests/datenmodell-block-41.test.js#u2-104-leerer-skalar-wird-leere-liste
```

```konformitaet
aussage:  Der gemischte Vermieter-Kontakt wird an BEIDEN Stellen in Telefon und E-Mail
          getrennt; ohne `@` bleibt das E-Mail-Feld leer und der Wert unverändert stehen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/datenmodell-block-41.test.js#u2-104-vermieter-kontakt-wird-getrennt
```

---

*Vivodepot GmbH · Berlin · 26.07.2026*
