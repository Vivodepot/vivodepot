# U2-ADR-111: Der Wechselmoment — ein Prädikat, zwei Aufrufer, ein Wächter

**Status:** Angenommen
**Datum:** 26.07.2026
**Kategorie:** DATENMODELL, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-102 (die zurückgezogene Kennzeichnungs-Frage; die Antwort ist dieser
Wechselmoment) · U2-ADR-108 (Governance-Wächter als Form) · U2-ADR-109 (elf der 41 Kandidaten)
**Anker:** Report `wechselmoment-und-import-grenze-report-2026-07-26.md` · Bilanz-Posten 4 und 5
**Status heute:** gilt — Beleg `tests/wechselmoment.test.js`, `tests/fhir-export-gate-identitaet.test.js`.

---

## Kontext

Eine Instrument-Zeile vom Typ `vorsorgevollmacht` mit gefülltem `zvr_nummer`, der Typ auf
`testament` gewechselt — **empirisch gemessen, mit Positivkontrolle:**

| | gespeichert | sichtbar |
|---|---|---|
| vorher | `"BUERGERWERT"` | **true** |
| nachher | `"BUERGERWERT"` | **false** |

Der Wert lebt, ist unsichtbar, **und niemand hat gefragt**. **41** Unterfelder können so verwaisen;
**elf davon kamen mit U2-ADR-109 an einem einzigen Nachmittag dazu.**

Zweitens trägt der Import Inkonsistenz herein (`{typ:'testament', art:'general'}` landet unverändert)
— über `listenEintragHinzufuegen`, also **nicht** über den Bearbeiten-Einhakpunkt. Getrennt gebaut
hätte der Handler eine Tür im Rücken; genau das war die gemessene Stopp-Bedingung, die diesen Strang
am Vormittag richtigerweise angehalten hat.

## Entscheidung

**1 — Generisch, nicht feldweise.** Das Prädikat `zeileVerwaisteFelder(feld, zeile)` hängt am
Ereignis „Leitfeld ändert sich" und liest die **Felddefinition**; es kennt keine Feldliste. Damit ist
die 41 eine Aussage über die **Fläche**, nicht über den Aufwand, und der **zweiundvierzigste Fall ist
automatisch gedeckt**. Wäre der Handler feldweise, wäre die Zahl ein Kostenfaktor — und der Zuschnitt
falsch.

**2 — Ein Prädikat, zwei Aufrufer.** Der Bearbeiten-Weg ruft es vor dem Schreiben, die
Import-Vorschau wendet es auf den **Plan** an. **Kein zweiter halber Handler.**

**3 — Es wird nichts gelöscht.** Das Datenmodell-Gesamtkonzept trägt die Regel bereits: Bürgerdaten
werden nie gelöscht, Werte entfallener Felder bleiben liegen, nur ihre Erfassungs-UI entfällt. Der
Wechselmoment ist darum eine **Sichtbarkeits-Ankündigung**, keine Verlust-Ankündigung — und der
Import landet in genau dem Zustand, den auch ein Wechsel hinterlässt. Beim Import wird deshalb
**nichts normalisiert und nichts abgewiesen**: die Zeile kommt vollständig herein.

Das hat eine angenehme Folge für die Bedienung: es gibt nur **einen** Weg weiter — bestätigen oder
abbrechen. Ein „verwerfen" gäbe es gar nicht zu verwerfen.

**4 — Der Text steht den Prüfstein durch.** Zwei Sätze, Bürgerinnen-Sprache, **Labels statt
Feld-Schlüssel**:

> „Dieser Eintrag ist jetzt als „Testament“ angelegt und trägt Angaben, die dort nicht erscheinen:
> „Art der Vollmacht“, „Zentrales Vorsorgeregister — Eintragungsnummer“. Sie bleiben gespeichert und
> gehen nicht verloren — sie werden hier nur nicht angezeigt."

Der erste Satz sagt, was der Eintrag **ist** und was dort nicht erscheint; der zweite, dass nichts
verlorengeht. Der Auftrag hatte das als Abbruchbedingung gesetzt — er hält.

**5 — Der Wächter ist der eigentliche Ertrag.** Er konstruiert für **jedes** gegatete Unterfeld einen
Zustand, in dem es gefüllt und unsichtbar ist, und verlangt, dass das Prädikat es meldet. Fällt eines
durch, wird er rot. Dieselbe Form wie der Schema-Governance-Wächter: **der nächste Datenmodell-Zug
kann diesen Posten nicht still vergrößern.**

## Konsequenzen

**Gerätepflicht gestrichen.** Der Bearbeiten-Dialog ist in Playwright vollständig fahrbar (47
Eingabe-Elemente inkl. Typ-Auswahl). Gerät braucht nur der Datei-Picker — anderer Posten. In der
Bilanz sinkt „gerätepflichtig" von **4 auf 3**.

**Eine wiederkehrende Falle ist an der Wurzel entschärft.** Jedes Array, das der Kern zurückgibt,
entsteht in **seinem** Realm; `deepStrictEqual(kernArray, [])` schlägt dann fehl, obwohl beide leer
sind. Das ist am 26.07. **viermal** passiert (U2-ADR-104, 105, 109, 111), jedes Mal mit einem eigenen
Kommentar an der Stelle. **Ein Kommentar hätte die fünfte Wiederholung nicht verhindert; eine
Funktion tut es** — `alsListe()` in `load-kern.js`.

**Nachzug erledigt:** eine Probe pinnt, dass kein Bürgerinnen-Weg den FHIR-Builder am Gate vorbei
erreicht. Der Registry-Eintrag selbst erreicht ihn ungegatet; heute geht dort kein Weg entlang, und
die Probe hält genau das fest.

Ungemessen: wie oft Leitfeld-Wechsel in der Praxis vorkommen — der Posten ist über die *Möglichkeit*
begründet, nicht über gemessene Häufigkeit. Und: ob es außerhalb von Listen-Unterfeldern weitere
Leitfeld-Abhängigkeiten gibt (Sektor-Ebene); gemessen wurden Listen.

## Konformität

```konformitaet
aussage:  Jedes leitfeld-getriebene Unterfeld wird vom Wechselmoment-Prädikat erfasst —
          für jedes wird ein Zustand konstruiert, in dem es gefüllt und unsichtbar ist,
          und das Prädikat muss es melden. Der nächste Datenmodell-Zug kann den Posten
          damit nicht still vergrößern.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wechselmoment.test.js#u2-111-jedes-leitfeld-getriebene-feld-ist-erfasst
```

```konformitaet
aussage:  Ein Leitfeld-Wechsel fragt nur, wenn wirklich etwas aus der Anzeige fällt, nimmt
          in keinem Fall einen Wert weg, und der Hinweis steht in zwei Sätzen ohne
          Datenmodell-Vokabular.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wechselmoment.test.js#u2-111-wechsel-nimmt-nichts-weg-und-fragt-nur-bei-betroffenen
```

```konformitaet
aussage:  Der Import meldet eine inkonsistente Zeile in der Vorschau und lässt sie
          VOLLSTÄNDIG herein — er normalisiert nichts und weist nichts ab; eine
          konsistente Zeile erzeugt keinen Hinweis.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wechselmoment.test.js#u2-111-import-meldet-und-normalisiert-nicht
```

```konformitaet
aussage:  Kein Bürgerinnen-Weg erreicht den FHIR-Builder am Identitäts-Gate vorbei: der
          Dispatcher nimmt `fhir-ips` ausdrücklich vom generischen Registry-Weg aus, und
          der Chooser-Griff ist an genau diesen Dispatcher verdrahtet.
zustand:  geprüft
herkunft: invariante
pruefung: tests/fhir-export-gate-identitaet.test.js#u2-111-kein-buergerinnen-weg-erreicht-den-builder-am-gate-vorbei
```

---

*Vivodepot GmbH · Berlin · 26.07.2026*
