# U2-ADR-099 — Reihenfolge des Aufbaus der Prüf-Architektur

**Status:** Angenommen (2026-07-23)
**Datum:** 23.07.2026
**Bezug:** internes Architekturdokument vom 23.07.2026,
internes Dokument zu Fehlerklassen vom 22.07.2026, U2-ADR-098 (Format)
**Linie:** U2
**Status heute:** gilt — Beleg `tests/pruefstand-bindung.test.js`.

---

## Kontext

Zwei Papiere aus zwei aufeinanderfolgenden Tagen nennen unterschiedliche
Startpunkte. Die Fehlerklassen setzen die Integritäts-Registry auf Platz eins
— „ohne diese vier trägt nichts anderes". Die Prüf-Architektur setzt den
Prüfstand mit Orakel und Determinismus auf Platz eins und schiebt die
Registry auf Schritt vier.

Beide Reihenfolgen sind begründet. Sie optimieren auf verschiedene
Fehlerklassen: der Prüfstand auf Datenverlust und Klartext-Lecks, die
Registry auf tote Verweise und stille Fehlschläge. Solange der Widerspruch
offen bleibt, wird er bei jeder Planung neu ausgetragen.

---

## Entscheidung

**Der Prüfstand kommt zuerst**, gefolgt von den Invarianten Verlust, Rundlauf
und Parität, dann den Generatoren. Die Integritäts-Registry und die
Werkzeuge, die auf ihr sitzen, folgen danach.

Begründung: Datenverlust und Klartext-Lecks sind die einzigen Klassen, die
das Produktversprechen unmittelbar brechen. Der Prüfstand entsperrt drei
Invarianten auf einmal — einzeln wären sie klein, ohne ihn ist keine davon
möglich. Die Verweis-Klasse hat im Juli mehrfach Zeit gekostet, aber keine
Bürgerdaten gefährdet.

---

## Verworfene Alternative

Registry zuerst. Das Argument dafür bleibt gültig und wird hier festgehalten,
damit es bei einer späteren Neubewertung nicht neu gefunden werden muss: Die
Registry ist statisch, damit kalkulierbar, und sie braucht weder Prüfstand
noch Browser. Der Prüfstand dagegen ist der größte Einzelposten des
Vorhabens und das Stück mit dem höchsten Entgleisungsrisiko.

**Risiko der gewählten Reihenfolge:** Dauert der Prüfstand länger als
veranschlagt, bleibt die Verweis-Klasse bis dahin ungeschlossen — und halb
gebaut ist er schlechter als gar nicht, weil er Sicherheit vortäuscht.

**Gegenmaßnahme:** Die harte Grenze aus der Prüf-Architektur gilt
unverändert. Steht der Prüfstand nicht als Ganzes, wird diese Entscheidung
neu bewertet statt weitergebaut.

---

## Nicht berührt

Der Zusicherungs-Scanner ist bereits gebaut und läuft eigenständig. Er hängt
an keiner der beiden Reihenfolgen und wird von dieser Entscheidung nicht
zurückgestellt.

---

## Konformität

```konformitaet
aussage:  Der Prüfstand wird vor der Integritäts-Registry gebaut.
zustand:  nicht-prüfbar
grund:    Reihenfolge-Entscheidungen über den eigenen Arbeitsplan sind kein
          Zustand des Codes; sie sind an der Aktenlage nachvollziehbar,
          nicht maschinell messbar.
```

*Erste Anwendung des mit U2-ADR-098 beschlossenen Formats — und
absichtlich ein Fall mit Zustand `nicht-prüfbar`, damit dieser Zustand von
Anfang an als vollwertig behandelt wird und nicht als Ausrede gilt.*

### Nachtrag 26.07.2026 — der Prüfstand ist gebaut, und was er erzwingt

Der Prüfstand aus Teil B-2 existiert (`tests/pruefstand-bindung.js` +
`…test.js`). Damit wird aus der Reihenfolge-Entscheidung an einer Stelle ein
messbarer Zustand — und zwar an **genau einer**, nicht an der ganzen Frage.

**Die Grenze zuerst, damit die Klausel nicht mehr behauptet als der Lauf:**

> **Erzwungen ist:** Zu jedem Wächter, den eine Konformitätsklausel nennt,
> gibt es eine gekoppelte Negativprobe — und der Wächter **benutzt** die
> deklarierte Diskriminante wirklich (Aufruf-Nachweis, nicht nur Deklaration).
>
> **NICHT erzwungen ist:** dass die Einspeisepunkte einer Probe den
> **Geltungsbereich** des Wächters decken. Ob eine Probe *alle* Formen einer
> Verletzung einspeist, bleibt ein **gemessener Zustand** — nachlesbar in den
> Berichten, nicht maschinell erzwungen. Ein Wächter kann diesen Prüfstand
> also bestehen und trotzdem eine Verletzungsform übersehen.

Der Unterschied ist gewollt: Deckung des Geltungsbereichs hat keine mechanisch
entscheidbare Definition. Eine Klausel, die sie behauptete, wäre selbst ein
Fall der Klasse, die diese Prüf-Strecke jagt.

```konformitaet
aussage:  Jede nicht lesbare `pruefung:`-Zeile einer Konformitätsklausel ist ein
          eigener Fehlschlag — kein stilles Überspringen. Ausnahmen nur benannt
          und gezählt.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pruefstand-bindung.test.js#pruefstand-jede-klausel-zeile-ist-lesbar
```

```konformitaet
aussage:  Jeder von einer Konformitätsklausel genannte Wächter trägt eine
          gekoppelte Negativprobe; der noch nicht nachgerüstete Rest ist eine
          benannte, gezählte Liste, die nur bewusst wachsen oder schrumpfen kann.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pruefstand-bindung.test.js#pruefstand-jeder-waechter-hat-eine-probe
```

```konformitaet
aussage:  Der Wächter BENUTZT die von seiner Probe deklarierte Diskriminante —
          belegt durch Instrumentierung (Zähler meldet sich) und dadurch, dass
          eine erzwungene Verletzung ihn rot macht. Deklaration allein genügt nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pruefstand-bindung.test.js#pruefstand-jede-probe-wird-vom-waechter-benutzt
```

### Nachtrag 26.07.2026, zweiter Teil — die Klassifikation wird gerechnet

Die Trennung der Wächter in **Kollektor-** und **Konstruktions-Form** entscheidet,
für wen operating-manual §7.5 überhaupt gilt. Sie lief zuerst als Skript außerhalb
des Repos, und ihr Ergebnis stand als Prosa in einem Kommentar: **weder berechnet
noch gepinnt.** Ein Wächter, der später zur Kollektor-Form wechselt, wäre damit
still freigestellt geblieben — dieselbe Klasse wie „gedeckt war nicht ausgeführt",
nur eine Ebene höher, beim Klassifikator selbst.

Der trennende Unterschied ist ausdrücklich **nicht** „Verbot gegen Zusicherung" —
das wäre Namensdisziplin (`b16-009b-wortmarke-im-footer` klingt positiv und ist
ein Kollektor). Er lautet: **kann dieser Test über einem leeren Suchraum grün
sein?** Nur die Kollektor-Form kann es.

```konformitaet
aussage:  Die Klassifikation der Wächter (Kollektor- gegen Konstruktions-Form) wird
          bei jedem Lauf neu gerechnet und ihre Zahlen sind gepinnt; ein Wächter
          ohne lesbaren Testrumpf ist ein eigener Fehlschlag und wird nicht
          eingeordnet.
zustand:  geprüft
herkunft: invariante
pruefung: tests/pruefstand-bindung.test.js#pruefstand-klassen-werden-bei-jedem-lauf-gerechnet
```

---

*Vivodepot GmbH · Berlin · 23.07.2026 · Nachtrag 26.07.2026*
