# U2-ADR-309: Der zweite Rechtsraum — die Mechanik ist bewiesen, das Recht bleibt offen

**Status:** Akzeptiert
**Datum:** 05.09.2026
**Betrifft:** `tests/rechtsraum-ab-beweis.test.js`,
`tests/fixtures/rechtsraum-PRUEFFIXTURE-keine-rechtsaussage.json`,
`tools/buergermodul/vd-uk-rechtsraum-LEER-RECHERCHE-NOETIG.json`

- **Status heute:** gilt — der A/B-Beweis aus U2-ADR-307 ist von „vorbereitet" auf **erbracht**
  gehoben: fünf der sechs Rechtsregeln wechseln nachweislich mit einem geladenen Modul, beide
  Kennungsformen tragen, und der Rückweg ist byte-gleich. **Echtes UK-Recht ist nicht enthalten
  und wird hier nicht behauptet.**

---

## Der Auftrag hatte zwei Hälften. Ich liefere eine, und benenne warum

Wörtlich: *„dann bau doch einen zweiten Rechtsraum"*. Der Auftrag teilte das in den
**Mechanismus-Beweis** und das **echte UK-Modul mit Belegstellen**.

**Hälfte 1 ist gebaut. Hälfte 2 nicht — und das ist keine Verzögerung, sondern die Regel.**

Für britisches Fristenrecht lag in dieser Sitzung keine belegbare Quelle vor: kein Netz, keine
Rechtsdatenbank, und Erinnerungswissen ist weder aktuell noch zitierfähig. Die Regel des Hauses
steht dreifach im Kern: *„ein erfundener Text wäre eine Empfehlung Vivodepots — ersatzlos
entfernt statt erfunden."*

**Eine erfundene Frist wäre schlimmer als ein erfundener Hinweis: die Bürgerin verlässt sich
darauf und versäumt sie.** Hätte ich fünf plausible britische Fristen hingeschrieben, wären sie
durch jede Prüfung dieses Hauses gegangen — der Kern kann eine `quelle` verlangen, aber nicht
lesen.

## Was bewiesen ist

```
A   kein Modul geladen        jedes Fristfeld liefert den eingebauten Stand
B   Prüf-Fixture geladen      JEDE überlagerte Frist ändert sich
    beide Kennungsformen      <sektorId>.<feldId> UND situation:<sitId>.<feldId>
    Rückweg                   nach dem Entladen byte-gleich zu A
    Vollständigkeit           die Fixture nennt keine Kennung, die es nicht gibt
```

**Die Felder werden generisch gesammelt**, nicht aus einer Liste: kommt im Bestand ein
Fristfeld dazu, ist es automatisch Teil des Beweises. Und die B-Seite deckt **fünf der fünf**
`fristRegel`-Felder ab; wächst der Bestand, schlägt die Probe an, statt still weniger zu prüfen.

**Jede Fixture-Frist trägt bewusst eine andere Dauer als der eingebaute Bestand** — sonst
könnte der Vergleich zufällig gleich ausfallen und grün bleiben, ohne etwas zu messen.

### Die Fixture nennt sich selbst als solche, im Dateinamen

`rechtsraum-PRUEFFIXTURE-keine-rechtsaussage.json`. Eine eigene Probe hält das fest: der
Dateiname muss `PRUEFFIXTURE` tragen, der Inhalt die Warnung, und **jede `quelle` muss als
Platzhalter erkennbar sein**. Ein Rechtsraum-Modul, das man für echt halten kann, ist genau das
Risiko, gegen das diese Datei gebaut ist — ein Kommentar allein hätte es nicht getragen.

## Die leere UK-Hülle ist ein Rechercheauftrag, kein Modul

`vd-uk-rechtsraum-LEER-RECHERCHE-NOETIG.json` trägt `felder: {}` und im Kopf, **nicht nur im
ADR**: leer, Entwurf, nicht ausliefern, Produktfreigabe nötig.

Darin steht zu jeder der fünf Regeln die **Frage**, nicht die Antwort — und zweimal die
Vorfrage, ob es überhaupt ein Gegenstück gibt:

- Die Sterbefall-Anzeige kann sich zwischen England/Wales, Schottland und Nordirland
  unterscheiden. Ein Modul `UK` müsste dann die strengste nennen **oder in mehrere Rechtsräume
  zerfallen** — das ist eine Entscheidung, keine Recherche.
- Die Ausschlagung der Erbschaft hat im englischen Recht kein einfaches Gegenstück. **Ob der
  Eintrag existiert, ist die erste Frage — nicht, welche Dauer er trägt.**

**Das ist der Unterschied zwischen einer Lücke und einem Fehler.** Eine benannte Lücke kann
jemand füllen; eine plausible falsche Frist findet niemand wieder.

## Was ausdrücklich NICHT bewiesen ist

**`gueltigkeitVorschlag`.** Die sechste Regel des Bestands läuft über einen eigenen, älteren Weg
(hartkodierter `case 'reisepass_gueltig'`); die Überlagerung greift dort nicht. Die Fixture deckt
sie darum **nicht** ab und sagt das im Kopf. Der Bau dafür läuft an anderer Stelle.

**Dass ein echter fremder Rechtsraum vollständig abbildbar ist.** Bewiesen ist, dass der
Mechanismus Fristen wechselt. Ob die fünf deutschen Regeln überhaupt britische Gegenstücke
haben, ist offen — und die Hülle sagt das je Eintrag.

**Dass ein UK-Rechtsraum die App englisch macht.** Sprache und Rechtsraum sind zwei Achsen.
Das tut das Sprach-Modul.
