# U2-ADR-513: Eigene Einlassgrenze für Sprachmodule

**Status:** Angenommen (entschieden 19.10.2026, gebaut 22.10.2026)
**Datum:** 22.10.2026
**Kategorie:** SICHERHEIT, MODULE
**Linie:** U2
**Bezug:** Folgt der Festlegung vom 23.08.2026 nach (512 KB und Tiefe 40 für jedes Einlass-Register, Commit
`25800913a`, Kommentar über `_MODUL_EINLASS_MAX_BYTES` in `vivodepot.html`) · U2-ADR-359 (das deutsche Sprachmodul)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Jedes Modul, das über `modulEinlassen` kommt, wird an einer gemeinsamen Grenze von 512 KB gemessen. Hergeleitet wurde die Zahl
am 23.08.2026 am größten damals gemessenen legitimen Modul, einem Textsatz mit rund 400 Texten; die Grenze lag etwa 18-mal
darüber. Ein vollständiges Sprachmodul war nicht gemessen. Es trägt jede Kennung des Produkts, und das deutsche Modul ist
seither auf über 480 KB gewachsen. Eine vollständige Übersetzung durch Dritte, deren Texte im Mittel nur wenige Zeichen länger
sind, ginge nicht mehr durch den Einlass (gemessen an `tests/textsatz-lauf-mit-angedocktem-modul.test.js`, das jedem Text
„ ‹fr›“ anhängt).

Die Grenze für alle Register zu öffnen, kommt nicht in Frage: sie schützt jedes andere Register mit, und dort sind die Module
um Größenordnungen kleiner.

## Entscheidung

1. **`textsatz` hat eine eigene Grenze von 1 MiB** (`_TEXTSATZ_MODUL_MAX_BYTES = 1024 * 1024`). **Jedes andere Register bleibt
   bei 512 KB** (`_MODUL_EINLASS_MAX_BYTES`). Die eigene Grenze steht am Eintrag des Registers (`maxBytes`);
   `_modulEinlassMaxBytes(modul)` liest sie dort. Ein Modul, dessen Typ kein Register hat, bekommt die engere Grenze.
2. **Die Reihenfolge bleibt:** zuerst die Tiefe (40, für alle gleich, iterativ gemessen), dann die Größe, dann erst die Prüfung
   des Registers. Ein zu großes Modul unbekannten Typs wird an der Größe abgewiesen, nicht am Typ.
3. **Die Zahl:** Das deutsche Modul liegt bei knapp der Hälfte von 1 MiB. Eine Übersetzung mit 15 bis 30 % längeren Texten bliebe
   unter zwei Dritteln, und für mehrere tausend weitere Texte bleibt Raum. Eine engere Zahl (etwa 768 KiB) läge mit einer solchen
   Übersetzung sofort über der Warnschwelle.
4. **Die Erzeuger der Sprachmodule warnen ab 80 % der Grenze** und brechen erst beim Überschreiten ab. So sieht der nächste
   Wagen die Nähe, bevor eine Probe reißt.
5. **Das Studio** prüft ein Sprachmodul vor dem Absenden an derselben Zahl (`_SPRACHMODUL_MAX_BYTES`, wortgleich gehalten).

## Folgen

- Ein Modul, das sich als `textsatz` ausgibt, kommt bis 1 MiB durch den Größen-Schritt. Danach lässt die Textsatz-Prüfung nur
  Zeichenketten zu bekannten Kennungen durch.
- Die Grenze wirkt nach `JSON.parse`. Gegen den Stapelabsturz schützt die Tiefe, nicht die Größe; den Speicher beim Parsen begrenzt
  sie nicht. Das ist eigener Befund und nicht Teil dieser Entscheidung.
- Die Lese-App kennt keine Einlassgrenze und ändert sich nicht.

## Abgelehnt

- **Die gemeinsame Grenze für alle Register anheben.** Sie schützt jedes Register mit.
- **Die Pro-Texte in ein zweites Sprachmodul auslagern.** Die Texte eines Produkts gehören in dessen Sprachmodul. Und weil ein
  Sprachmodul derselben Sprache das bisherige ersetzt, bräuchte das eine neue Einbett-Achse im Kern, in der Mitschrift und in der
  Lese-App.
- **Die Probe mit „ ‹fr›“ verkleinern.** Damit würde der Wächter schwächer, ohne dass sich an der Sache etwas ändert.

```konformitaet
aussage:  Ein Sprachmodul knapp unter 1 MiB geht durch den Einlass, eines knapp darüber wird mit zu-gross abgewiesen.
zustand:  geprüft
herkunft: U2-ADR-513 (22.10.2026)
pruefung: tests/einlassgrenze-sprachmodul.test.js#[Grenze·Sprachmodul] knapp unter 1 MiB geht durch, knapp darüber wird abgewiesen
```

```konformitaet
aussage:  Jedes andere Register bleibt bei 512 KB; ein zu großes Modul wird an der Größe abgewiesen, vor der Prüfung des Typs.
zustand:  geprüft
herkunft: U2-ADR-513 (22.10.2026)
pruefung: tests/einlassgrenze-sprachmodul.test.js#[Grenze·andere Typen] Bereich und unbekannter Typ bleiben bei 512 KB
```

```konformitaet
aussage:  Ohne die Weiche nach Typ fiele ein Sprachmodul knapp unter 1 MiB an der gemeinsamen Grenze durch.
zustand:  geprüft
herkunft: U2-ADR-513 (22.10.2026)
pruefung: tests/einlassgrenze-sprachmodul.test.js#[Grenze·Rot-Beweis] mit der gemeinsamen Grenze von 512 KB fiele das Sprachmodul knapp unter 1 MiB durch
```

```konformitaet
aussage:  Das Studio prüft ein Sprachmodul an derselben Zahl wie der Kern.
zustand:  geprüft
herkunft: U2-ADR-513 (22.10.2026)
pruefung: tests/generator-sprachmodul.test.js#[Sprachmodul·Parität·Konstanten] die gespiegelten Konstanten sind die des Kerns, gelesen aus dem Quelltext (Drift wird rot)
```
