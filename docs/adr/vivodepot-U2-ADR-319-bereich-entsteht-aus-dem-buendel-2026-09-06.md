# U2-ADR-319: Ein Bereich entsteht aus dem Bündel — und die Erlaubnisliste stand auf dem, was weicht

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot.html` (`buergermodulBuendelAnwenden`, `buergermodulSektorErsetzen`,
`_bereichAusBuendelErzeugen`, `SEKTOREN`), `tests/buergermodul-bereich-erzeugen-u2-adr-319.test.js`

- **Status heute:** gilt — ein Bereich, den das **eingebettete** Bündel mitbringt und den es im
  Gerüst nicht gibt, entsteht. Ein fremdes Bündel kann das nicht. **Der native Bestand ist mit
  diesem Zug noch NICHT entfernt**; dies ist die Voraussetzung dafür, nicht der Schnitt selbst.

---

## Warum das gebraucht wird

Solange `SEKTOREN` den nativen Bestand trug, gab es für jeden Bereich schon ein Objekt, und
`buergermodulSektorErsetzen` konnte **an Ort und Stelle angleichen** (U2-ADR-292). Verlässt der
Bestand die Datei, ist beim ersten Anwenden **nichts da** — jeder Bereich muss aus dem Nichts
entstehen.

Gemessen am 06.09.2026, mit wirklich geleertem `SEKTOREN` statt aus einem ADR übernommen:

```
BOOT              durchgelaufen, kein Wurf
SEKTOREN.length   0
bereicheAlle()    0
Bündel-Bericht    angewandt: true — bei DREIZEHN übersprungenen Bereichen
```

**Der Boot trägt. Das Depot wäre leer — mit einer Erfolgsmeldung daneben.**

## Der Riegel ist die Identität, nicht ein Feld

```js
const ausEingebettetemBuendel = (typeof BUERGERMODUL_BUENDEL !== 'undefined'
  && BUERGERMODUL_BUENDEL !== null && buendel === BUERGERMODUL_BUENDEL);
```

Ein Flag (`{ausEingebettetemBuendel: true}`) könnte **jedes** Fremdmodul mitschicken. Die
Objekt-Identität der eingebetteten Konstante kann es nicht fälschen.

**Und warum die Konstante das darf, steht nicht in ihr selbst:** sie liegt **in**
`vivodepot.html`, fällt unter `vivodepot.html.sha256` und die Signaturkette. Wer sie ändert,
ändert die ausgelieferte Datei — **eine härtere Zusicherung als eine Erlaubnisliste im selben
Programm.**

## Der unangenehme Teil: die Wand stand auf dem Bestand, der weicht

`_erstePartieErlaubteIdsFuerSektor` baut die erlaubten Kennungen **aus dem nativen Sektor**. Das
war der Riegel aus U2-ADR-282 — *„die Aufrufstelle ist die Grenze, kein Nachweis am Modul"*. Eine
Erlaubnisliste aus der eingelassenen Datei selbst wäre *„eine Behauptung gegen sich selbst, kein
Riegel"*.

**Ist der native Bestand leer, ist die Liste leer — und jedes Feld fällt als `nicht-erlaubt`
durch.** Die Wand steht auf genau dem, was dieser Umbau entfernt.

**Die Entscheidung, ohne Beschönigung:** für den **einen** Weg aus der eingebetteten Konstante ist
die Erlaubnisliste die des Bündels selbst — **und das ist ausdrücklich eine Behauptung gegen sich
selbst.** Sie trägt dort nur, weil der Riegel dieses Weges ein anderer ist: die Signaturkette,
nicht die Liste. **Für jeden anderen Aufrufer bleibt U2-ADR-282 unverändert in Kraft**, und eine
Probe hält genau das fest.

Das gehört hier hin und nicht in eine Fußnote: wer später nur den Code liest, sähe eine
Selbstbehauptung und hielte sie für ein Versehen.

## Der Fund nebenbei — und er ist der ernstere

**Ein Modul, das nur Unerlaubtes liefert, LEERTE den Bereich.**

```
identitaet vorher : 29 Felder
Aufruf mit EINEM dem Gerüst unbekannten Feld — korrekt verworfen
identitaet nachher:  0 Felder        Bericht: angewandt: true
```

Der Aufrufer prüft `!defs.length`, aber **nicht** `!angenommen.length`; die Zuweisung darunter
belegt dann jede Sektion mit dem, was ankam — und das ist nichts.

**Der Kommentar über `buergermodulBuendelAnwenden` sagt es seit U2-ADR-308 selbst:** *„ein
Teil-Bündel darf nichts leeren, was es nicht ersetzt."* Der Fall „geliefert, aber **alles**
verworfen" fiel durch diesen Riegel.

**Der Folgeschaden ist nicht der leere Bereich allein:** der nächste Textsatz-Lauf wirft
`_katalogOptionen: kein Katalogfeld identitaet.familienstand mit optionen gefunden` — **genau der
Ausfall, wegen dem U2-ADR-317 entstand.** Erreichbar heute, ohne diesen Umbau.

**Behoben:** wurde nichts angenommen, wird nichts angefasst. Die Wand bleibt gleich scharf —
verworfen wird weiter alles Unbekannte, es nimmt nur den Bestand nicht mehr mit.

## `angewandt` sagt jetzt, was es heißt

Vorher war es ab dem ersten Bündel **immer** wahr: es sagte „ein Bündel lag vor", nicht „etwas ist
angekommen". Jetzt ist es wahr, wenn wenigstens ein Bereich oder eine Situation wirklich angewandt
wurde, sonst steht `grund: 'nichts-angewandt'` daneben. **Ein Bericht, der Erfolg meldet, während
nichts ankam, ist dieselbe Klasse Deckungs-Suggestion, gegen die sonst Wächter stehen — nur im
Bericht selbst.**

## Was der Erzeuger tut, und was er bewusst nicht tut

```
kopiert TIEF          das Erzeugte gehört dem Gerüst und wird später an Ort und Stelle
                      verändert; die Referenz zu behalten hiesse, das Bündel mitzuverändern
                      (dieselbe Eigentumsfrage wie U2-ADR-317-Nachtrag)
Sektionen als HÜLLEN  die Felder gehen danach durch `erstePartieFeldDefsPruefen`, denselben
                      Weg wie bei einem bestehenden Bereich — wer sie hier mitkopierte,
                      umginge die Prüfung ohne Grund
Textsatz-Lauf         gemessen: das Bündel trägt bei ALLEN dreizehn Bereichen kein `label`,
                      bei zwölf kein `einfuehrungstext`, die Sektionen tragen keins. Ohne
                      diesen Lauf stünde in der Seitenleiste „undefined"
Index fortschreiben   nicht über `bereicheAlle()` neu bauen — das liest `data.bereichssatz`,
                      und diese Zeile läuft, lange bevor ein Depot steht
```

## Was bewiesen ist

```
Konstante, alle Bereiche fehlen   13 erzeugt · 266 Felder · 182 UnterFelder
Deckungsgleich zum nativen        Bereich für Bereich, Sektion für Sektion, Feldzahl je Sektion
Beschriftung                      jeder Bereich und jede Sektion trägt eine, aus dem Textsatz
ROT  fremdes Bündel               ABGEWIESEN, `unbekannter-sektor`, SEKTOREN wächst nicht
ROT  angewandt ohne Anwendung     falsch, mit Grund
ROT  Erlaubnisliste ohne Erzeugen unverändert die des Gerüsts
ROT  nichts angenommen            der Bereich bleibt unangetastet
Positivkontrolle                  dieselbe Lage, aber die Konstante selbst — kommt durch
```

**Das fremde Bündel im Rot-Beweis ist ein JSON-Rundlauf der Konstante** — byte-gleicher Inhalt,
andere Identität. Wäre die Prüfung ein Flag oder ein Inhaltsvergleich, käme es durch.

**Die Positivkontrolle ist nicht Zierat:** ohne sie wäre der Rot-Beweis auch dann grün, wenn der
Erzeuger *gar nichts* erzeugte — dann prüfte er nichts als seine eigene Strenge.

**Und der Vergleich misst gegen den echten Kern, nicht gegen Zahlen im Testkopf.** Eine Zahl im
Test veraltet still; der geladene Kern nicht.

## Was ausdrücklich NICHT dazugehört

**Der Schnitt.** Der native Bestand steht noch in der Datei. Dieser Zug baut die Voraussetzung und
landet für sich grün — nach der Regel, so früh zu committen, wie die Suite noch grün ist.

**Die Wächter-Klasse, die native Inhalte als literalen Text in `vivodepot.html` sucht.** Sie hängt
am geleerten Bestand, nicht an der Erzeugung, und wird mit dem Schnitt fällig.

**`WIZARDS`.** U2-ADR-306 hat den Ladeweg gebaut; was ein Ladeweg zur Laufzeit einsetzt, sehen
diese Proben nicht — sie prüfen den erzeugten Bestand.
