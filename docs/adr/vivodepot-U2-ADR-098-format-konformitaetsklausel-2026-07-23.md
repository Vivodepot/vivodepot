# U2-ADR-098 — Format der Konformitätsklausel

**Status:** Angenommen (2026-07-23)
**Datum:** 23.07.2026
**Bezug:** internes Entwurfsdokument vom 23.07.2026,
U2-ADR-097 (Prüfmaterial), U2-ADR-090 (Präfix-Regel)
**Linie:** U2
**Status heute:** gilt — Format aktiv in Gebrauch (dieser Auftrag selbst folgt ihm); die eigene
Aussage „jede ADR ab diesem Beschluss trägt einen Block" bleibt laut eigenem Klausel-Feld offen.

---

## Kontext

Eine ADR beschreibt heute eine Entscheidung, aber nicht, woran man erkennt,
dass sie noch gilt. Der Durchgang über beide Linien hat gezeigt, wohin das
führt: Entscheidungen werden abgelöst, ohne dass es im abgelösten Dokument
steht; Implementierungs-Verweise zeigen auf Commits, die es nicht mehr gibt;
Verbote erodieren still, weil nichts anschlägt, wenn sie fallen.

Dieses ADR legt fest, wie eine ADR ihre eigene Überprüfbarkeit mitliefert.
Es beschließt **nur das Format**, keine einzelne Klausel und keine Prüfung.

---

## Entscheidung

### Der Abschnitt

Jede neue ADR trägt einen Abschnitt `## Konformität` mit einem
gekennzeichneten Block:

````
```konformitaet
aussage:   <kurz, was gelten soll>
zustand:   prüfbar | offen | nicht-prüfbar | ausgesetzt
pruefung:  <Datei oder Prüfungsname>       # nur bei zustand: prüfbar
grund:     <ein Satz>                      # bei nicht-prüfbar und ausgesetzt
frist:     <JJJJ-MM-TT>                    # Pflicht bei zustand: offen
bedingung: <woran es hängt>                # optional, ersetzt frist nicht
```
````

Mehrere Aussagen je ADR bekommen mehrere Blöcke.

**Warum ein Block und keine Tabelle:** Der spätere Linter muss sich auf die
Struktur verlassen können. Markdown-Tabellen brechen an Trennzeichen im Text
und an Umformatierung; ein gekennzeichneter Block bleibt eindeutig erkennbar
und ist mit wenigen Zeilen zu lesen. Der Preis ist etwas weniger Eleganz beim
Lesen — vertretbar, weil ADRs sequentiell gelesen und nicht nach Klauseln
durchsucht werden.

### Die vier Zustände

`prüfbar` — Eine benannte Prüfung sichert die Aussage ab. Sie existiert und
läuft.

`offen` — Die Aussage ist maschinell prüfbar, die Prüfung ist noch nicht
gebaut. **Erfordert `frist` als Datum.** Eine zusätzliche `bedingung` ist
erlaubt und meist die eigentliche Aussage („sobald der Prüfstand steht"), aber
sie ersetzt das Datum nicht: Eine Bedingung, deren Eintreten niemand prüft,
ist Prosa mit Zeitgefühl.

Der Linter prüft beides — `offen` ohne Frist, und **Frist überschritten**. Ein
abgelaufenes `offen` schlägt an wie ein roter Test. Ohne diesen Wächter wird
`offen` doch zum Mülleimer, nur mit Datum daran.

Verstreicht eine Frist, ist die Antwort nicht das stille Verlängern, sondern
eine der drei: Prüfung bauen, Zustand auf `nicht-prüfbar` ändern, oder die
Entscheidung selbst zurücknehmen. Jede davon ist eine Änderung am ADR und
damit sichtbar.

`nicht-prüfbar` — Die Aussage lässt sich grundsätzlich nicht maschinell
prüfen. **Erfordert `grund`.** Dieser Zustand ist kein Makel; er ist ehrlicher
als eine Prüfung, die weniger misst, als sie behauptet. Beispiel: die Zusage,
dass Bürgerinnen und Bürger nie zahlen, ist im Quelltext nur als Abwesenheit
eines Zahlungspfads sichtbar — die Zusage für die Zukunft misst kein Test.

`ausgesetzt` — Die Prüfung wäre möglich, ist aber wegen einer offenen
Entscheidung stillgelegt. **Erfordert `grund` mit Verweis auf die offene
Entscheidung.** Unterscheidet sich von `offen` dadurch, dass nicht die
Prüfung fehlt, sondern die Klarheit darüber, was gelten soll.

*Diese vier sind nicht ausgedacht: Der Zusicherungs-Scanner hat sie beim Bau
faktisch entwickelt, weil er ohne sie zwei der zehn Zusicherungen nicht
darstellen konnte.*

### Die Rückrichtung

Jede Prüfung nennt ihre ADR — als Feld im Code, nicht als Kommentar:

```
adr: 'U2-ADR-097'
```

Die Bindung gilt in beide Richtungen. Eine ADR ohne auffindbare Prüfung und
eine Prüfung ohne auffindbare ADR sind beides Befunde.

### Die Herkunft

Jede Prüfung trägt zusätzlich ein Herkunfts-Feld:

```
quelle: 'entscheidung' | 'invariante' | 'metamorph' | 'generator' | 'orakel' | 'regression'
```

Prüfungen mit `quelle: 'entscheidung'` zementieren Beschlossenes und
entdecken nichts. Sie sind nötig, aber ihre Zahl gehört beobachtet: Wächst
diese Kategorie schneller als die entdeckenden, hält die Suite nur noch fest,
was gebaut wurde.

### Geltung

**Verpflichtend für jede ADR ab diesem Beschluss.** Eine neue ADR ohne
`## Konformität`-Abschnitt ist unvollständig.

**Nicht rückwirkend für den Bestand.** Die rund 96 vorhandenen U2-ADRs und
die B16-Linie werden nicht nachgerüstet. Rückwirkend erfassen werden nur:

1. die Verbote — sie tragen das Produktversprechen und stehen im
   Verbots-Register bereits gesammelt;
2. Struktur-Entscheidungen, für die bereits Tests existieren — dort ist die
   Klausel ein Verweis, keine neue Arbeit.

Alles Übrige bleibt ohne Klausel. Das ist kein Rückstand, sondern eine
Entscheidung: nachrüsten, was trägt, nicht was zählt.

### Bei Ablösung

Wird eine ADR abgelöst, bleibt ihr Konformitäts-Block stehen und bekommt
einen Verweis auf die ablösende ADR. Die zugehörige Prüfung wird nicht
gelöscht, sondern auf die neue ADR umgehängt oder ausdrücklich als
gegenstandslos vermerkt. **Eine verschwindende Prüfung ohne ablösende ADR ist
ein Befund** — genau der Fall, den der Durchgang mehrfach gefunden hat.

---

## Folgen

- Neue ADRs kosten etwas mehr Zeit im Schreiben und liefern dafür ihre eigene
  Überprüfbarkeit mit.
- Die drei Zahlen — wie viele Aussagen, wie viele geprüft, wie viele mit
  Begründung ungeprüft — werden zählbar und gehören in den Selbstbericht.
- `nicht-prüfbar` und `ausgesetzt` sind vollwertige Zustände. Wer sie
  vermeidet, um eine bessere Zahl zu bekommen, baut Prüfungen, die weniger
  messen, als sie behaupten.

## Selbstanwendung

Dieses Format ist eine dokumentierte Regel. Nach dem Befund vom 22.07. und
den drei Regelbrüchen vom 23.07. trägt eine solche Regel nicht, solange sie
nicht maschinell erzwungen wird.

**Deshalb gehört zu diesem Beschluss eine Frist für den Linter.** Er prüft
nur die Bindung: Klausel ohne Prüfung, Prüfung ohne ADR, verschwundene
Klausel ohne Ablösung, `offen` ohne Frist, **`offen` mit abgelaufener
Frist**, `nicht-prüfbar` ohne Grund. Das ist Dateien lesen, Namen vergleichen
und ein Datum — klein, sobald die Integritäts-Registry steht.

```konformitaet
aussage:   Jede ADR ab diesem Beschluss trägt einen Konformitäts-Block, und
           jede Prüfung nennt ihre ADR.
zustand:   offen
frist:     2026-10-31
bedingung: Integritäts-Registry steht (Prüf-Architektur, Spur B)
```

*Ohne diesen Block wäre dieses ADR das erste, das seine eigene Regel bricht.
Das Datum ist bewusst gesetzt und nicht großzügig: Verstreicht es, ohne dass
der Linter steht, schlägt dieses ADR gegen sich selbst an — und genau das ist
der Zweck.*

## Nicht Teil dieser Entscheidung

Einzelne Klauseln, einzelne Prüfungen, der Bau des Linters. Und die Frage,
welche Aussage welchen Zustand bekommt — das entscheidet jede ADR für sich.

---

*Vivodepot GmbH · Berlin · 23.07.2026*
