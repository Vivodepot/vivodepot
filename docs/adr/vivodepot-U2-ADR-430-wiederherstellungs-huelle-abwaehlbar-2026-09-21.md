# U2-ADR-430 — Wiederherstellungs-Hülle, abwählbar

**Status:** Angenommen (2026-09-21)
**Datum:** 21.09.2026
**Kategorie:** SICHERHEIT, KRYPTOGRAPHIE, PRODUKT
**Linie:** U2
**Vorgänger:** U2-ADR-095 (Passwort-Lebenszyklus, Notfall-Blatt), U2-ADR-003 (Sub-Depot-Passwort),
U2-ADR-062-Nachtrag (optionale Umschlag-Felder), U2-ADR-213 (Ableitung), U2-ADR-153 (kein zweiter
Ableitungsweg), U2-ADR-230 (Krypto-Stärkeparameter ändern sich nur über einen Sprung der
`kryptoVersion`)
**Voreinstellung:** abwählbar (entschieden am 21.09.2026, nach Abwägung der Wahrscheinlichkeit des
Ausfalls gegen den Preis an der Zusage)
**Stand der Umsetzung:** nicht gebaut. Dieses ADR legt die Entscheidung und ihre Prüfungen fest, bevor
der Bau beginnt; der Prüfstein zu Ziffer 5 ist gebaut und läuft.
**Status heute:** gilt — die Entscheidung; die Umsetzung steht aus. Beleg für Ziffer 5:
`tests/umschlag-unbekanntes-geschwisterfeld.test.js`.

---

## Kontext

U2-ADR-095 hält fest: Passwort-Verlust ist für die Zielgruppe — ältere Menschen, pflegende
Angehörige — das wahrscheinlichste Ausfallszenario überhaupt, und Vivodepot hat
konstruktionsbedingt keinen Weg zurück. Verlorenes Passwort heißt unwiderruflicher Datenverlust.

Die Vorsorge dagegen ist heute das Notfall-Blatt: ein Blatt mit Leerfeldern, von Hand ausgefüllt,
verpflichtend im Anlege-Weg. Es trägt das Passwort, das die Nutzerin selbst gewählt hat.

Die Frage ist, ob daneben ein zweiter Weg zum selben Schlüssel möglich ist — und ob er abwählbar
gebaut werden kann, so dass die heutige Zusage für jede gilt, die ihn nicht will.

## Was nicht geht, und warum das so bleibt

**Aus der Datei allein führt kein Weg zum Schlüssel.** Das ist nicht schwer, sondern
ausgeschlossen: jeder Mechanismus, der es könnte, stünde auch einer Angreiferin mit derselben
Datei offen. Daran ändert dieses ADR nichts.

Möglich ist allein eine **vorher eingerichtete zweite Hülle** um denselben Schlüssel, geöffnet
durch ein zweites Geheimnis.

## Entscheidung

**1 — Eine zweite Hülle, abwählbar.** Beim Anlegen eines Depots wird ein
Wiederherstellungs-Code erzeugt, der denselben Depot-Schlüssel ein zweites Mal einwickelt. Die
Nutzerin kann ihn ablehnen. Lehnt sie ab, entsteht das Feld nicht, und die Datei verhält sich in
jeder Hinsicht wie heute.

**2 — Voreinstellung ist: eingerichtet.** Die Ablehnung ist ein eigener, benannter Schritt mit
der Tragweite daneben, keine übersehbare Schaltfläche.

**3 — Der Code wird erzeugt, nicht gewählt, und trägt mindestens 128 Bit Entropie.** Das ist
keine Begründung, sondern eine Zusicherung, und eine Probe misst sie. Der Grund ist zwingend: eine
zweite Hülle um denselben Schlüssel ist ein zweiter Weg hinein, und eine Angreiferin nimmt den
schwächeren. Wäre der Code schwächer als das Passwort, wäre die Hülle kein Rückweg für die
Nutzerin, sondern eine Abkürzung für die Angreiferin — und zwar in jeder Datei, weil sie
voreingestellt ist. Ein erzeugtes Geheimnis ist stärker als eine gewählte Passphrase. Er wird
angezeigt und von Hand abgeschrieben, auf dasselbe Notfall-Blatt. Die Anwendung schreibt ihn zu
keinem Zeitpunkt in eine Datei, einen Druckauftrag oder eine speicherbare Darstellung.

**4 — Kein dritter Ableitungsweg.** Der Code läuft durch dieselbe Ableitung wie ein Passwort, mit
denselben Parametern. Ein eigener Weg wäre eine weitere Gelegenheit, die Parameter falsch zu
wählen (U2-ADR-153).

**5 — Kein Sprung der Krypto-Version, wenn der Prüfstein hält.** Die Hülle soll ein optionales
Geschwisterfeld im Umschlag sein, wie der Ortshinweis des Vertrauens-Zugangs (U2-ADR-062-Nachtrag).
Sie ändert kein Verfahren, keinen Modus, keine Schlüssellänge und keine Iterationszahl, also greift
U2-ADR-230 nicht.

Das ist eine Annahme, und sie hat einen billigen Prüfstein: **eine Fassung, die das Feld nicht
kennt, MUSS eine Datei mit Hülle weiterhin öffnen können.** Ignoriert sie das unbekannte Feld,
trägt der Schluss. Stolpert sie darüber, ist es ein Versionssprung und ein anderer Aufwand. Der
Prüfstein MUSS vor dem Bau laufen — sonst zeigt sich der Fehler erst bei einer Bürgerin mit einer
älteren Kopie.

**Gemessen (22.09.2026) — der Prüfstein hält, für die Fassungen dieses Stands.** Der Kern und die
Lese-App öffnen eine Datei, deren Umschlag ein Feld trägt, das keine von beiden kennt, und der
Inhalt kommt unverändert an; ein falsches Passwort öffnet auch mit dem Feld nichts. Beleg:
`tests/umschlag-unbekanntes-geschwisterfeld.test.js`. Das ist NICHT der Lauf gegen eine ältere
Fassung; er ist mit dem Bau zu wiederholen, gegen eine wirklich ältere `vivodepot.html`.

**Gemessen (22.09.2026) — die Gegenseite, und sie ist eine Folge, kein Beleg für das Feld:** eine
Fassung, die das Feld nicht kennt, lässt es beim Speichern fallen. Der Umschlag, der nach Laden und
Speichern geschrieben wird, trägt es nicht mehr. Die Datei öffnet also weiter, aber eine ältere
Fassung, die sie speichert, nimmt ihr die Hülle, ohne es zu sagen (siehe Konsequenzen). Die Probe dazu stand
als `todo` in `tests/umschlag-unbekanntes-geschwisterfeld.test.js` ([Prüfstein·Speichern]). **Behoben (22.09.2026, eigener Zug im
Kern, kein Teil dieser ADR):** der Kern merkt beim Öffnen jedes Umschlag-Feld, das er nicht selbst schreibt
(`UMSCHLAG_FELDER_BEKANNT`), und schreibt es beim Speichern unverändert zurück; die Probe ist ein gewöhnlicher Test. Das gilt für
den Hauptweg (`depotSerialisieren`). Die Wege, die einen Umschlag aus einem geöffneten NEU aufbauen, sind gemessen
(tests/umschlag-unbekanntes-geschwisterfeld.test.js, [Sub-Depot-Wege·…]): Blackbox-Export und Einhängen einer Depot-Datei lassen ein
unbekanntes Feld still weg, das Einhängen einer Export-Datei mit dem Feld wirft laut, das Umschlüsseln ist nicht erreichbar. Keiner überschreibt
die einzige Kopie; ob die Hülle mit einer Kopie reisen soll, ist mit dem Bau der Hülle zu entscheiden (offene Klausel unten).

**6 — Entfernbar und nachträglich einrichtbar.** Wer abgelehnt hat, kann später einrichten. Wer
eingerichtet hat, kann später entfernen.

**7 — Der Zustand ist sichtbar.** Das Produkt zeigt, ob eine zweite Hülle besteht. Eine Nutzerin
muss ihrer Datei ansehen können, was sie hat.

## Begründung

Die Abwägung ist eine zwischen zwei Schäden, und sie ist nicht symmetrisch.

**Ohne zweite Hülle:** der wahrscheinlichste Ausfall ist zugleich der endgültige. Es gibt keine
Reparatur, keine Kulanz, keinen zweiten Versuch.

**Mit zweiter Hülle:** es liegt ein zweites vollwertiges Geheimnis in der Welt, typischerweise
auf Papier in einer Wohnung. Wer es findet, öffnet das Depot.

Das zweite Risiko ist verständlich und beherrschbar — ein Zettel, den man wegschließen kann. Das
erste ist es nicht. Für die benannte Zielgruppe wiegt der unumkehrbare Verlust schwerer.

Die Abwählbarkeit löst den Rest: wer die härtere Zusage will, bekommt sie unverändert, und zwar
beweisbar — das Feld existiert dann nicht.

## Verworfene Alternativen

| Alternative | Grund |
|---|---|
| Server-gestützte Wiederherstellung | bricht das Kern-Prinzip. Nicht verhandelbar (U2-ADR-095) |
| Code in ein PDF oder einen Druck | app-erzeugtes Klartext-Artefakt, dieselbe Leck-Klasse, die U2-ADR-095 geschlossen hat |
| Gerätegebundene Hülle | die Datei soll überall aufgehen. Ein gerätegebundener Weg verliert mit dem Gerät |
| Anteile auf mehrere Menschen verteilt | möglich, das Verfahren liegt im Haus — aber der Wiederherstellungsfall IST der Notfall: Krankheit, Tod, Umzug, Streit. Genau der Moment, in dem mehrere Menschen nicht gleichzeitig erreichbar sind. Ein Verfahren, das im Normalfall trägt und im Anwendungsfall nicht, ist kein Verfahren. Das ist Verfügbarkeit, nicht Bequemlichkeit |
| Zuwählbar statt abwählbar | beide Male entscheidet die Voreinstellung. Zuwählbar hieße: die meisten haben keinen Rückweg — genau das Szenario, das U2-ADR-095 als das wahrscheinlichste benennt |

## Konsequenzen

**Die Zusage ändert sich, und zwar sichtbar.** Der Satz „ein Wiederherstellungsweg besteht nicht"
wird falsch. Richtig wird: **kein Weg aus der Datei allein; ein zweiter Weg nur als vorher
eingerichtete Hülle, abwählbar.** Die Architekturspezifikation ist an Abschnitt 16.2 nachzuziehen.

**Die Anwesenheit der Hülle ist im Umschlag offen sichtbar**, wie der Ortshinweis des
Vertrauens-Zugangs. Wer die Datei findet, sieht, dass es einen zweiten Weg gibt — nicht, wohin er
führt. Das ist hinzunehmen und gehört benannt.

**Entfernen wirkt auf die Datei, die dabei geschrieben wird.** Jede ältere Kopie trägt die Hülle
weiter. Dasselbe gilt schon für den Passwortwechsel. **Das MUSS die Nutzerin beim Entfernen lesen,
nicht nur die Probe prüfen.** Wer abwählt und glaubt, es sei weg, hat eine falsche Vorstellung von
seiner eigenen Lage — und das ist schlimmer als die Hülle selbst.

**Das Gegenstück gilt beim Speichern durch eine ältere Fassung: die Hülle geht still verloren.**
Gemessen (siehe Ziffer 5): eine Fassung, die das Feld nicht kennt, öffnet die Datei und schreibt sie
ohne das Feld zurück. Für die Fassungen ab dem Bau der Hülle ist das zu schließen: eine Datei mit
Hülle bleibt eine Datei mit Hülle, wenn sie gespeichert wird (unbekannte Umschlag-Felder werden
erhalten, oder der Fall wird der Nutzerin vor dem Speichern gesagt). Für Fassungen, die vor dem Bau
liegen, ist es ein benanntes Risiko, kein gelöstes Problem: sie sind nicht zu ändern.

**Außentexte dürfen nicht mehr sagen, dass es keinen Weg zurück gibt** — ohne den Zusatz, dass die
Nutzerin ihn eingerichtet haben muss.

## Konformität

Jede Zusicherung steht mit ihrer Probe oder mit dem, was fehlt. Der Bau ist nicht begonnen; die
Proben der Hülle entstehen mit dem Bau und stehen vor dem Landen. Die Frist ist ein gesetztes
Datum, keine Zusage über den Bau: verstreicht sie, ist die Antwort nicht das stille Verlängern,
sondern Probe bauen, den Zustand ändern oder die Entscheidung zurücknehmen (U2-ADR-098).
Ein zweiter Weg zum selben Schlüssel ist eine Einbahnstraße: ist er schwach, liegen Daten offen,
und nach der Auslieferung ist nichts mehr zu korrigieren. Darum steht keine Zusicherung dieses ADR ohne
Probe da: entweder ist sie an eine bestehende Probe gebunden, oder sie steht als offen mit Frist da.

```konformitaet
aussage:   Ein optionales Geschwisterfeld im Umschlag, das eine Fassung nicht kennt, stört ihren Leseweg
           nicht: der Kern und die Lese-App dieses Stands öffnen die Datei, der Inhalt kommt unverändert
           an (Prüfstein zu Ziffer 5, für die Fassungen dieses Stands).
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/umschlag-unbekanntes-geschwisterfeld.test.js#[Prüfstein·Kern] der Kern öffnet eine Datei mit einem unbekannten Geschwisterfeld im Umschlag
```

```konformitaet
aussage:   Das fremde Geschwisterfeld ist kein Weg hinein: ein falsches Passwort öffnet auch mit dem Feld
           im Umschlag nichts.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/umschlag-unbekanntes-geschwisterfeld.test.js#[Prüfstein·Grenze] ein FALSCHES Passwort öffnet auch mit dem fremden Feld nicht
```

```konformitaet
aussage:   Der Prüfstein zu Ziffer 5 gilt gegen eine wirklich ÄLTERE Fassung, nicht nur gegen die Fassungen
           dieses Stands: eine ältere vivodepot.html (KERN_HTML_PATH) öffnet eine Datei mit Hülle.
zustand:   offen
frist:     2026-11-20
bedingung: vor dem Bau der Hülle; die Probe der Hülle selbst trägt den Lauf gegen die ältere Fassung
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Die Krypto-Version, der Modus, die Schlüssellänge und die Iterationszahl bleiben unverändert
           (Ziffer 5): die Hülle ändert kein Verfahren, also kein Sprung der kryptoVersion.
zustand:   prüfbar
herkunft:  invariante
pruefung:  tests/pbkdf2-iterationen-versionssprung.test.js#[PBKDF2·Wächter] PBKDF2_ITERATIONS bleibt der eingefrorene v3-Wert
```

```konformitaet
aussage:   Lehnt die Nutzerin ab, entsteht kein Feld: der Umschlag der geschriebenen Datei ist derselbe
           wie ohne Hülle — gemessen an der Datei, nicht am Zustand im Speicher (Ziffer 1).
zustand:   offen
frist:     2026-11-21
bedingung: mit dem Bau der Hülle; die Probe liest den Umschlag der geschriebenen Datei
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Die Voreinstellung ist „eingerichtet", und die Ablehnung ist ein eigener, benannter Schritt mit der
           Tragweite daneben (Ziffer 2): das Produkt zeigt der Nutzerin den Satz, der die Tragweite nennt.
zustand:   offen
frist:     2026-11-22
bedingung: mit dem Bau der Hülle; die Probe prüft den angezeigten Satz, nicht nur die Verdrahtung des Knopfs
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Der Wiederherstellungs-Code wird erzeugt, nicht gewählt, und trägt mindestens 128 Bit Entropie
           (Ziffer 3) — gemessen an dem, was erzeugt wird, nicht an der Absicht.
zustand:   offen
frist:     2026-11-23
bedingung: mit dem Bau der Hülle; die Probe misst die Bits des erzeugten Codes, ehe die Hülle voreingestellt wird
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Der Code steht in keiner erzeugten Datei, in keinem Druckauftrag und in keiner speicherbaren
           Darstellung (Ziffer 3); er wird angezeigt und von Hand abgeschrieben.
zustand:   offen
frist:     2026-11-24
bedingung: mit dem Bau der Hülle; die Probe liest jede Ausgabe, die der Bau erzeugt, auf den Code
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Kein dritter Ableitungsweg (Ziffer 4): der Code läuft durch dieselbe Ableitung wie ein Passwort, mit
           denselben Parametern; die Zahl der Ableitungswege bleibt gleich.
zustand:   offen
frist:     2026-11-25
bedingung: vor dem Bau wird die heutige Zahl der Ableitungswege erhoben und als Grundlinie festgeschrieben; die Probe hält sie
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Rundlauf: mit dem Code lässt sich öffnen, was mit dem Passwort verschlüsselt wurde.
zustand:   offen
frist:     2026-11-26
bedingung: mit dem Bau der Hülle
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Entfernen erzeugt eine Datei ohne das Feld, die vorherige Fassung der Datei öffnet weiter (Rot-Beweis),
           und nachträgliches Einrichten funktioniert an einem Depot, das ohne Hülle angelegt wurde (Ziffer 6).
zustand:   offen
frist:     2026-11-27
bedingung: mit dem Bau der Hülle
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Der Zustand ist sichtbar (Ziffer 7): das Produkt zeigt, ob eine zweite Hülle besteht — und beim
           Entfernen liest die Nutzerin, dass ältere Kopien die Hülle weiter tragen.
zustand:   offen
frist:     2026-11-28
bedingung: mit dem Bau der Hülle; die Probe prüft den angezeigten Satz, nicht nur, dass ein Zustand gesetzt ist
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern (Hauptweg
           `depotSerialisieren`) unverändert noch: der Kern verliert es nicht still.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/umschlag-unbekanntes-geschwisterfeld.test.js#[Prüfstein·Speichern] eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern noch
```

```konformitaet
aussage:   Es ist entschieden, ob die Hülle mit einer KOPIE der Datei reist — Blackbox-Export, Einhängen —, und der Weg
           tut das Entschiedene. Heute gemessen (tests/umschlag-unbekanntes-geschwisterfeld.test.js, [Sub-Depot-Wege·…]): der
           Export und das Einhängen einer Depot-Datei lassen ein unbekanntes Umschlag-Feld still weg, das Einhängen einer
           Export-Datei mit dem Feld wirft laut; das Umschlüsseln eines eingehängten Sub-Depots ist nicht erreichbar.
zustand:   offen
frist:     2026-11-29
bedingung: mit dem Bau der Hülle; ein Wiederherstellungsweg gehört der Inhaberin, vielleicht nicht der Empfängerin einer Kopie — die Entscheidung steht aus, die Probe hält bis dahin den gemessenen Ist-Zustand fest
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Außentexte sagen nicht mehr, dass es keinen Weg zurück gibt, ohne den Zusatz, dass die Nutzerin ihn
           eingerichtet haben muss.
zustand:   offen
frist:     2026-11-30
bedingung: mit dem Bau der Hülle; die Außenaussagen laufen durch den Abgleich der Außen-Dokumente gegen den Stand
           Frist: Datum der Nachschau, keine Zusage eines Bautermins; gestaffelt (ein Tag je Klausel, 2026-11-20 bis 2026-11-30, keine später als die ursprüngliche 2026-11-30), damit nicht alle am selben Morgen fällig werden.
```

```konformitaet
aussage:   Aus der Datei allein führt kein Weg zum Schlüssel.
zustand:   nicht-prüfbar
grund:     Die Aussage ist die Abwesenheit eines Mechanismus; kein Test beweist, dass es keinen gibt. Sie wird
           gehalten von dem, was die Proben oben messen — nur mit Passwort oder Code öffnet die Datei —, und sie bleibt Sache der Durchsicht, nicht einer Probe.
```

## Prüfungen, die dazugehören

Die Liste steht als Blöcke oben, je Zusicherung einer. Zusammengefasst — gebaut sind der erste, der zweite und
der vierte Block, alles Übrige entsteht mit dem Bau und steht vor dem Landen:

- Der Prüfstein zu Ziffer 5: eine Fassung, die das Feld nicht kennt, öffnet eine Datei mit Hülle (gebaut für
  die Fassungen dieses Stands; der Lauf gegen eine ältere Fassung folgt)
- Ablehnen erzeugt **kein** Feld — gemessen an der geschriebenen Datei, nicht am Zustand im Speicher
- Entfernen erzeugt eine Datei ohne das Feld; die vorherige Fassung öffnet weiter (Rot-Beweis)
- Nachträgliches Einrichten funktioniert an einem Depot, das ohne Hülle angelegt wurde
- Der Code steht in keiner erzeugten Datei und in keinem Druckauftrag
- Die Krypto-Version bleibt unverändert
- Kein dritter Ableitungsweg: die Zahl der Ableitungswege bleibt gleich
- Der Code trägt mindestens 128 Bit Entropie — gemessen an dem, was erzeugt wird, nicht an der Absicht
- Rundlauf: mit dem Code öffnen, was mit dem Passwort verschlüsselt wurde
- Eine Datei mit Hülle behält sie beim Speichern
