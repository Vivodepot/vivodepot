# U2-ADR-147: Ableitungslinie — alles Architektonische in den Kern, Versionen werden abgeleitet

**Status:** Akzeptiert
**Datum:** 18.08.2026
**Kategorie:** ARCHITEKTUR, PRODUKT
**Status heute:** gilt — der Entwurf ist Produktentscheidung vom 18.08.2026,
Punkt 5; dieses Dokument führt ihn in die laufende U2-ADR-Zählung ein.
**Anschluss:** U2-ADR-141 (Anzeigetexte andockbar), U2-ADR-142 (Institutions-Arten andockbar),
U2-ADR-143 (Bereichsliste als Register), U2-ADR-144 (Gültigkeit an jedem Feldwert),
U2-ADR-145 (Einlassweg), U2-ADR-146 (Format-Kanal als Beschreibung).

---

## Kontext

Vivodepot ist ein **modulares, sektoragnostisches Instrument**. Es soll in verschiedenen
Einsatzgebieten, Sprachen, Kultur- und Rechtsräumen funktionieren. Das war von Anfang an so
gemeint und ist mit der Andock-Architektur der letzten Wochen erstmals technisch eingelöst:
Textsätze, Code-Listen, Felddefinitionen, Rechtsraum-Module, Institutions-Arten, Vorlagen und seit
U2-ADR-143 auch die Bereichsliste sind von außen erweiterbar.

**Bis heute gibt es keine einzige Ableitung.** Ein berufliches Depot wäre die erste; weitere sind
absehbar und heute nicht alle benennbar. Damit steht zum ersten Mal die Frage, nach welcher Regel
eine Ableitung entsteht — und sie wird jetzt beantwortet, solange es noch keinen Fall gibt, an dem
sich eine Gewohnheit gebildet hat.

**Zur Abgrenzung, weil sie wiederholt missverstanden wurde:** Die Produktphilosophie lehnt die
**Internetplattform** ab — Server, Konten, Datenhaltung beim Anbieter. Sie lehnt weder Modularität
noch Mehrfachverwendung ab. Die Depot-Datei liegt in jeder Ableitung ausschließlich beim Menschen,
dem sie gehört.

## Entscheidungs-Treiber

- **Mission-Continuity.** Eine zweite Codelinie je Produkt ist die zuverlässigste Art, ein
  Einpersonen-Vorhaben zum Stillstand zu bringen.
- **Der Fork ist real und erlaubt.** Der App-Kern steht unter EUPL-1.2; jede und jeder darf forken.
  Heute gibt es keinen Fork, weil v1 noch nicht öffentlich ist. **Nach v1 ist die Architektur
  öffentlich sichtbar und wird zum Maßstab, an dem ein Forker rechnet.**
- **Drift ist gemessen, nicht befürchtet.** Kopien derselben Sache sind in diesem Vorhaben
  mehrfach lautlos auseinandergelaufen — Werkzeuge hinter der Sektorenliste, Lese-App hinter der
  Bereichsreihenfolge, Generator hinter dem zwölften Bereich.
- **Sparsamkeit im Kern.** Ohne Aufnahmeregel wächst der Kern mit jeder Ableitung um deren
  Sonderfälle.

## Entscheidung

**1 · Alles Architektonische wird im Kern gebaut.** Eine Ableitung entsteht als **Konfiguration
über die andockbaren Register**, nicht als Kopie und nicht als Zweig. Was eine Ableitung an
Fähigkeit braucht, wird als Fähigkeit des Kerns gebaut, nicht als Ausnahme für sie.

**2 · Die Aufnahmeregel.** Eine Eigenschaft kommt in den Kern, wenn sie sich **im Bürgerdepot
allein** rechtfertigen lässt. Trägt sie nur eine abgeleitete Version, ist sie Sache des Moduls oder
sie wird nicht gebaut. Die Begründung ist Sparsamkeit, nicht Abwehr von Modularität.

**3 · Kein Fork innerhalb der eigenen Linie.** Eine Ableitung, die einen Fork nötig machen würde,
ist ein **Befund über den Kern**, kein Produktentwurf. Der Befund wird gemessen und gemeldet; ob er
gebaut wird, entscheidet Regel 2.

**4 · Module bringen kein Verhalten mit.** Wertelisten für Merkmale, Rollen und Regeln bleiben
geschlossen. Eine unbekannte Eigenschaft wird **namentlich verworfen** und verwirft nicht das
Modul. Das ist die bereits gebaute Linie aus A281 und A294 und gilt für jede künftige Erweiterung.

**5 · Ableitungen zahlen nicht auf Kosten des Bürgers.** Der Grundsatz bleibt unberührt: die
Bürgerausgabe ist vollständig und dauerhaft kostenlos. Eine Ableitung enthält keine besseren
Funktionen, sondern andere Inhalte und Zusicherungen.

## Konsequenzen

**Positiv.** Eine Codelinie, eine Testsuite, eine Migrationskette. Jede Fähigkeit, die eine
Ableitung erzwingt, kommt allen zugute — die drei Eigenschaften vom 18.08. sind der Beleg: keine
davon ist eine Eigenschaft des beruflichen Depots, alle drei schließen Lücken im Bürgerdepot. Und
der beste Schutz gegen einen fremden Fork ist ein Kern, der das kann, wofür man sonst forken
müsste.

**Negativ.** Eine Ableitung wartet auf den Kern, auch wenn sie es eilig hat. Die Aufnahmeregel
verlangt bei jeder Eigenschaft eine Begründung aus dem Bürgerdepot, und diese Begründung wird
nicht immer zu finden sein — dann fällt die Eigenschaft weg oder die Ableitung wird kleiner. Und
jede Fähigkeit im Kern ist dauerhaft zu pflegen, auch wenn die Ableitung, die sie auslöste, nie
zustande kommt.

## Verworfene Alternativen

**Eine Codelinie je Produkt.** Bricht Mission-Continuity und verdoppelt Testsuite und
Migrationskette. Der gemessene Drift zwischen bereits vorhandenen Kopien ist die Vorschau darauf.

**Ableitung als eigener Zweig mit Rückportierung.** Klingt beherrschbar und ist es bei einer Person
nicht. Rückportierung ist genau die Arbeit, die als erste liegen bleibt.

**Keine Regel, Einzelfallentscheidung.** Ohne Aufnahmeregel wandert jeder Sonderfall der jeweils
lautesten Ableitung in den Kern.

## Validierung und Prüf-Trigger

- **Validiert** durch die drei Eigenschaften vom 18.08.: jede besteht die Aufnahmeregel aus eigener
  Kraft. Fällt eine künftige Eigenschaft durch, ist die Regel wirksam — nicht falsch.
- **Neu zu bewerten**, wenn eine Ableitung eine Fähigkeit braucht, die sich im Bürgerdepot
  nachweislich nicht rechtfertigen lässt, und der Verzicht die Ableitung unmöglich macht.
- **Neu zu bewerten**, wenn ein fremder Fork entsteht, dessen Grund eine Fähigkeit ist, die dieser
  Kern hätte tragen können.
- **Neu zu bewerten**, wenn eine zweite Person dauerhaft mitarbeitet — die Kostenrechnung hinter
  „eine Codelinie" ändert sich dann.

---

## Prüfvermerk zur Anlage (18.08.2026) — der Entwurfstext oben ist UNVERÄNDERT

Der Auftrag zur Anlage verlangt, die genannten Anschlüsse auf Richtigkeit zu prüfen und
**Abweichungen zu melden, statt sie zu glätten.** Dieser Abschnitt steht deshalb **neben** dem
Entwurf und nicht in ihm. Inhaltliche Änderungen bleiben der Entscheiderin vorbehalten.

**Vier Anschlüsse stimmen.** U2-ADR-141, 142, 144 und 145 sind zutreffend benannt.

**Ein Anschluss weicht ab, und die Abweichung wiederholt sich im Kontext-Absatz.**

> Der Entwurf führt U2-ADR-143 als „Bereichsliste **als Register**" und schreibt, die
> Bereichsliste sei **seit U2-ADR-143 von außen erweiterbar.**

**Gemessen (Erhebung vom 18.08. zu den reduzierten Sichten, gegen denselben Stand):**
U2-ADR-143 entscheidet, dass der Kern die **eine Quelle** ist und ihr Schlüsselraum die **ID** —
alles Übrige wird daraus **erzeugt**. Es macht die Liste **nicht** von außen erweiterbar:
`EINLASS_REGISTER` führt vier Register (Textsatz, Rechtsraum, Institutions-Art, Format), **keines
für Bereiche**; `SEKTOREN` ist zur Definitionszeit `Object.freeze`d, und das Depot hat für
Bereiche **keinen Slot**.

**U2-ADR-143 ist die Vorbedingung des Andockens, nicht das Andocken.** Die Aussage des Entwurfs
ist damit für sechs der sieben aufgezählten Register richtig und für die Bereichsliste um einen
Schritt voraus.

**Ein sechster Anschluss ist ergänzt**, weil er nach dem Entwurf entstand: **U2-ADR-146**
(Format-Kanal als Beschreibung) ist der vierte Weg in denselben Einlassweg und gehört in dieselbe
Reihe. Das ist eine Ergänzung der Anschlussliste, keine Änderung einer Aussage.

**Die Entscheidung selbst ist von der Abweichung nicht berührt.** Regel 1 bis 5 stehen unabhängig
davon, ob die Bereichsliste heute oder morgen andockbar wird.
