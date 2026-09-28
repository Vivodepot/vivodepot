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
**Stand der Umsetzung:** gebaut am 27.09.2026 (Nachträge unten); die Proben stehen in
`tests/wiederherstellungs-code.test.js` und `tests/e2e/wiederherstellungs-code.spec.js`.
**Status heute:** gilt — Entscheidung und Umsetzung. Die Fassung der sichtbaren Texte wartet auf die Abnahme;
signiert wird danach.

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

## Nachtrag 27.09.2026 — Ziffer 3: eigenes Blatt, getrennt vom Passwort

Der Code wird nicht auf das Notfall-Blatt geschrieben, das das Passwort trägt. Der Code hilft, wenn das
Passwort verloren ist — auf demselben Blatt ginge er mit ihm verloren, und ein einziger Fund gäbe beides
aus der Hand. Der Code bekommt ein **eigenes Blatt** zum getrennten Aufbewahren (etwa im verschlossenen
Umschlag bei einer Vertrauensperson, beim Original der Vorsorgevollmacht, im Schließfach). Das Code-Blatt
hat **kein Feld für das Passwort**, das Notfall-Blatt **kein Feld für den Code**. Beim Einrichten sagt die
App wörtlich: „Nicht zum Passwort legen.“ Das Code-Blatt wird **ohne Code gedruckt**, mit einem leeren
Feld; die Nutzerin trägt den Code von Hand ein. Unverändert gilt: die App druckt den Code nie und schreibt
ihn in keine Datei, keinen Druck, kein PDF und keinen Export.

Der Satz „auf dasselbe Notfall-Blatt“ in Ziffer 3 ist damit ersetzt; der Rest von Ziffer 3 gilt.

## Nachtrag 27.09.2026 — der Bau und die drei Entscheidungen dazu

Entschieden am 27.09.2026, gegengelesen, nach einem Report-before-Build.

**Was eingewickelt wird (Präzisierung zu Ziffer 1).** Der Depot-Schlüssel wird aus dem Passwort
abgeleitet, nicht umhüllt; einen Datenschlüssel, den das Passwort einwickelt, gibt es nicht. „Denselben
Depot-Schlüssel ein zweites Mal einwickeln“ heißt darum: die **Master-Bits** des Passworts (das
PBKDF2-Ergebnis, aus dem der Depot-Schlüssel abgeleitet wird) werden unter einem Schlüssel aus dem Code
verschlüsselt. Der Code läuft durch dieselbe Ableitung wie ein Passwort, mit eigenem Salz (32 Byte, frisch
je Wickeln) und ohne eigene Iterationszahl im Feld (Ziffer 4). Die AAD bindet die Hülle an `depotUUID` und
`kryptoVersion`; der IV ist je Wickeln frisch.

**A — der gepinnte Block bleibt unberührt.** Eine Sitzung entsteht wie bisher nur aus einem Passwort. Wer
mit dem Code öffnet, legt im selben Schritt ein neues Passwort fest; die Hülle wird dabei mit demselben Code
um die Bits des neuen Passworts neu gewickelt, der Code gilt weiter. Beim Öffnen liegen die Master-Bits nie
als Bytes vor: die Hülle wird mit `unwrapKey` direkt in einen nicht exportierbaren HKDF-Schlüssel
ausgepackt. Beim Einwickeln liegen Master- und Code-Bits kurz als Bytes vor und werden in einem `finally`
genullt, auch wenn das Einwickeln wirft. Die Krypto-Stellen außerhalb des Blocks stehen in einer Grundlinie,
erhoben vor dem Bau (`tools/krypto-aufrufer-grundlinie.json`); der Zuwachs ist dort je Operation benannt.

**B — Passwortwechsel.** Der Wechsel fragt nach dem Code. Mit Code wird die Hülle um das neue Passwort neu
gewickelt; ohne Code fällt sie weg, und der Abschluss sagt es in einem Satz. Nie bleibt eine Hülle um das
alte Passwort stehen, die still nichts mehr öffnet.

**C — Kopien.** Die Hülle reist mit keiner Kopie: der Blackbox-Export und das Einhängen als Sub-Depot
tragen sie nicht. Ein Wiederherstellungsweg gehört der Inhaberin. Der Export-Dialog sagt es in einem Satz.

**Der Code.** 27 Zeichen aus dem Crockford-Alphabet (ohne I, L, O, U) = 135 Bit, dazu ein Prüfzeichen
gegen Abschreibfehler; gezeigt in sieben Vierergruppen. Beim Einrichten tippt die Nutzerin den
abgeschriebenen Code zur Kontrolle ein — erst dann wird die Hülle gewickelt.

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
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#3] der Kern von vor dem Bau öffnet eine Datei mit Hülle mit dem Passwort; eine Datei mit kaputtem Pflichtfeld nicht
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
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#5] ohne Einrichten trägt die geschriebene Datei kein Feld — dieselben Schlüssel wie ohne die Hülle
```

```konformitaet
aussage:   Die Voreinstellung ist „eingerichtet", und die Ablehnung ist ein eigener, benannter Schritt mit der
           Tragweite daneben (Ziffer 2): das Produkt zeigt der Nutzerin den Satz, der die Tragweite nennt.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/e2e/wiederherstellungs-code.spec.js#[WHC·#6] nach dem Anlegen: „Code einrichten" ist der Primärknopf; Ablehnen ist ein eigener Schritt mit der Tragweite
```

```konformitaet
aussage:   Der Wiederherstellungs-Code wird erzeugt, nicht gewählt, und trägt mindestens 128 Bit Entropie
           (Ziffer 3) — gemessen an dem, was erzeugt wird, nicht an der Absicht.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#7] 10 000 erzeugte Codes: je Stelle alle 32 Zeichen, zusammen ≥ 128 Bit, keine Wiederholung, Verteilung im Band
```

```konformitaet
aussage:   Der Code steht in keiner erzeugten Datei, in keinem Druckauftrag und in keiner speicherbaren
           Darstellung (Ziffer 3); er wird angezeigt und von Hand abgeschrieben.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#23 #8] nach dem Einrichten steht der Code in keiner Ausgabe: Blätter, Datei, Voll-Export, Depot-Inhalt, Speicher
```

```konformitaet
aussage:   Kein dritter Ableitungsweg (Ziffer 4): der Code läuft durch dieselbe Ableitung wie ein Passwort, mit
           denselben Parametern; die Zahl der Ableitungswege bleibt gleich.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/krypto-aufrufer-grundlinie.test.js#[Krypto-Aufrufer] der Kern trägt außerhalb des gepinnten Blocks keinen unbenannten Zuwachs
```

```konformitaet
aussage:   Rundlauf: mit dem Code lässt sich öffnen, was mit dem Passwort verschlüsselt wurde.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#10] der Code öffnet, was mit dem Passwort verschlüsselt wurde — mit neuem Passwort, und der Code gilt weiter
```

```konformitaet
aussage:   Entfernen erzeugt eine Datei ohne das Feld, die vorherige Fassung der Datei öffnet weiter (Rot-Beweis),
           und nachträgliches Einrichten funktioniert an einem Depot, das ohne Hülle angelegt wurde (Ziffer 6).
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#11] Entfernen schreibt eine Datei ohne Feld; die vorherige Datei öffnet mit dem Code weiter; das Passwort öffnet beide
```

```konformitaet
aussage:   Der Zustand ist sichtbar (Ziffer 7): das Produkt zeigt, ob eine zweite Hülle besteht — und beim
           Entfernen liest die Nutzerin, dass ältere Kopien die Hülle weiter tragen.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#12] die Einstellungen sagen in einem Satz, ob ein Code besteht; Entfernen nennt die älteren Kopien
```

```konformitaet
aussage:   Eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern (Hauptweg
           `depotSerialisieren`) unverändert noch: der Kern verliert es nicht still.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/umschlag-unbekanntes-geschwisterfeld.test.js#[Prüfstein·Speichern] eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern noch
```

```konformitaet
aussage:   Die Hülle reist mit keiner KOPIE der Datei (Frage C, entschieden 27.09.2026): der Blackbox-Export trägt sie
           nicht, und der Export-Dialog sagt es in einem Satz.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#14] der Blackbox-Export einer Datei mit Hülle trägt die Hülle nicht (entschieden: reist nicht mit)
```

```konformitaet
aussage:   Beim Öffnen mit dem Code liegen die Master-Bits nie als Bytes vor: ausgepackt wird mit unwrapKey direkt in
           einen nicht exportierbaren HKDF-Schlüssel; der Öffnen-Weg hat kein decrypt der Hülle (Bedingung zu A).
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#17] ausgepackt wird ein HKDF-Schlüssel, nicht exportierbar; der Öffnen-Weg hat kein decrypt und kein importKey auf der Hülle
```

```konformitaet
aussage:   Nach dem Einwickeln stehen in den Puffern der Master- und der Code-Bits nur Nullen, auch wenn das Einwickeln
           wirft (Nullung im finally).
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#18] nach dem Einwickeln stehen in Master- und Code-Bits nur Nullen — auch wenn encrypt wirft
```

```konformitaet
aussage:   Je Wickeln ein frischer 12-Byte-IV und ein eigenes, frisches 32-Byte-Salz — nie das Passwort-Salz, keine
           eigene Iterationszahl im Feld.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#19 #21] zweimal mit demselben Code gewickelt: verschiedene IVs (12 Byte), Salze (32 Byte) und Chiffrate; das Salz ist nie das Passwort-Salz
```

```konformitaet
aussage:   Die AAD bindet die Hülle an ihr Depot und an die kryptoVersion: eine Hülle aus Depot A öffnet im Umschlag von
           Depot B nichts.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#20] die Hülle aus Depot A öffnet im Umschlag von Depot B nichts; eine andere kryptoVersion auch nicht
```

```konformitaet
aussage:   Code-Blatt und Notfall-Blatt sind getrennt: das Code-Blatt hat kein Passwortfeld und trägt das Codefeld leer,
           das Notfall-Blatt hat kein Codefeld (Nachtrag Ziffer 3).
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#22] das Code-Blatt hat kein Passwortfeld, das Notfall-Blatt kein Codefeld; das Code-Blatt trägt das Codefeld leer
```

```konformitaet
aussage:   Beim Passwortwechsel gilt der Code mit dem neuen Passwort weiter, wenn er eingegeben wird; sonst fällt die
           Hülle weg — nie bleibt eine Hülle um das alte Passwort stehen (Frage B).
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·B] Passwortwechsel mit Code: die neue Datei öffnet mit demselben Code; ohne Code fällt die Hülle weg
```

```konformitaet
aussage:   Die Texte der App (beide Sprachmodule) und das README sagen nicht mehr, dass es keinen Weg zurück
           gibt, ohne den Wiederherstellungs-Code zu nennen. Texte außerhalb dieses Repos (Website, Papiere)
           prüft diese Probe nicht; sie laufen durch den Abgleich der Außenaussagen.
zustand:   prüfbar
herkunft:  entscheidung
pruefung:  tests/wiederherstellungs-code.test.js#[WHC·#15] kein Text der beiden Sprachmodule sagt „kein Weg zurück", ohne den Wiederherstellungs-Code zu nennen
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
