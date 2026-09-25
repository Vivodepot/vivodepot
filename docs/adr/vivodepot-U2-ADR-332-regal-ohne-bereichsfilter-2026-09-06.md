# U2-ADR-332 · Das Regal hat keinen Bereichsfilter — und der Wächter, der das offenhält

**Datum:** 06.09.2026
**Status:** gebaut, vier Proben grün, Rot-Beweis am echten Kern geführt
**Status heute:** gilt. `logikModuleAlsKarten` nimmt kein Argument und filtert nicht.
**Bezug:** U2-ADR-326 (der Zug, der den Filter einzog — hier zurückgenommen) ·
U2-ADR-295 (Geschäftsführerinnen-Notfallmappe, das Modul, das verschwand) ·
U2-ADR-321 (die A==B-Abnahme, die das nicht sehen konnte — Nachtrag dort) ·
U2-ADR-288 (Erbschein ab Werk) · U2-ADR-287 (was ein Template ist)

---

## 1 · Was passiert ist

U2-ADR-326 zog in `logikModuleAlsKarten` einen Bereichsfilter ein:

```js
.filter((roh) => !sektorId || (roh && roh.sektor === sektorId))
```

Die Begründung im Kommentar daneben lautete: die Karte gehöre „in das Regal ihres eigenen
Bereichs". **Dieses Regal gibt es nicht.**

Gemessen im Bestand:

- `vorsorgeRegalHTML` hat **genau einen** Aufrufer, hinter `bereichKann(sektorId, 'vorsorgeRegal')`.
- Dieses Merkmal trägt nur `vorsorge`.
- Ein angedockter Fremd-Bereich kann es nie tragen: `merkmale` ist nicht Teil von
  `BEREICH_MODUL_SCHLUESSEL`.

Das Regal existiert also **einmal**. Der Filter hat die Karte darum nicht verschoben, sondern
gelöscht. Die Geschäftsführerinnen-Notfallmappe (`sektor: pro-vertretung-vollmachten`) war danach
nirgends mehr erreichbar: kein Regal in ihrem Heimatbereich, und auch keine `auszugSektion`-Rolle,
die ihr ein Kärtchen gegeben hätte. Eine E2E-Probe meldete nicht „unsichtbar", sondern
`element(s) not found`.

## 2 · Die Entscheidung: der Filter geht ganz zurück

Erwogen wurde ein Rückfall statt eines Rückbaus — die Karte erscheint im Regal, wenn ihr
Heimatbereich ihr keinen anderen Ort gibt. **Verworfen, aus vier Gründen; der letzte schließt die
Frage:**

1. **Der bindende Maßstab:** „Es darf absolut keinen klitzekleinen Unterschied geben zwischen dem
   jetzigen Bürgerdepot und dem morgigen." Der Rückbau stellt den ausgelieferten Zustand her; eine
   Rückfall-Regel führt eine Regel ein, die nie ausgeliefert war.
2. **Die zweite Karte ist nicht fehl am Platz.** Der Erbschein steht heute im selben Regal. Zwei
   Karten derselben Template-Familie nebeneinander sind die bestehende Ordnung, kein Schönheitsfehler.
   Das Gegenteil war ein Geschmacksurteil über einen Zustand, den die Bürgerin seit Wochen so sieht.
3. **Eine zweite Bedingung an derselben Stelle repariert keinen Fehler, sie verdoppelt die Fläche.**
   Genau eine Bedingung, die schweigend danebengriff, hat den Schaden angerichtet.
4. **Der Ort für Template-Karten wird gerade entworfen** („Weitere Bereiche" — ein Verzeichnis, in
   dem Templates mit ihrem Zustand hängen). Eine Platzierungsregel wäre in Tagen überholt.

**Die Rückfall-Regel ist damit nicht falsch, sondern verfrüht.** Wenn sie gebraucht wird, kommt sie
mit dem Verzeichnis, mit eigenem ADR und eigenem Rot-Beweis — nicht als Nebenreparatur in einem Zug,
der etwas anderes tut.

## 3 · Warum die Suite das durchließ — der eigentliche Fund

Die bestehende Deckung (`tests/logikmodul-regal-karte-generisch.test.js`, fünf Proben) prüft zwei
Logikmodule. **Beide tragen `sektor: 'vorsorge'`.** Ein Filter auf genau dieses Feld war für sie
strukturell unsichtbar. Rot wurde nur eine E2E-Probe — und die E2E-Suite lief an diesem Tag in
keinem Gate.

**Ein Maßstab, der nur den Fall kennt, für den gebaut wurde, deckt den zweiten nicht.** Das ist
dieselbe Lehre wie beim Positivkontroll-Anker aus U2-ADR-321, an einer anderen Stelle: dort war der
Anker in totem Code, hier ist die Stichprobe einfarbig.

## 4 · Der Wächter

`tests/regal-zeigt-jedes-logikmodul-u2-adr-332.test.js` prüft nicht Kennungen, sondern die
**Invariante**: was in `data.logikModule` steht, hat eine Karte im Regal — unabhängig von seinem
`sektor`. Damit fällt jeder künftige Filter auf, an welchem Feld auch immer er ansetzt.

Vier Proben:

1. **Ab-Werk-Fall**, mit ausdrücklicher Vorbedingung: mindestens ein Modul mit `sektor !== 'vorsorge'`
   muss vorhanden sein. Ohne diesen Satz wäre die Probe am 06.09.2026 grün gewesen und hätte nichts
   bewiesen — genau der Fehler aus §3, diesmal benannt statt wiederholt.
2. **Angedockter Fremd-Bereich:** die Notfallmappe nach Einlass der vier Pro-Bereiche. Der Fall, der
   rot war.
3. **Gegenprobe „der Prüfer ist nicht blind":** eine fehlende Karte muss er mit Namen melden.
4. **Gegenprobe „der Filter muss rot machen":** der zurückgenommene Filter, wortgleich nachgestellt,
   auf dieselben Daten angewandt — mindestens ein Modul fällt heraus, namentlich das, an dem der
   Fehler zuerst sichtbar wurde.

**Rot-Beweis am echten Kern geführt:** der Filter wurde probeweise wieder eingesetzt, Proben 1 und 2
wurden rot, danach wurde er wieder entfernt.

## 5 · Ein Kommentar hat die Antwort schon getragen

Im Kopf genau der Probe, die rot wurde, stand die Antwort bereits — unter der Überschrift
**„GEMESSEN, NICHT VERMUTET"**: dass eine `logikModul`-Karte immer auf `vorsorge` erscheint,
unabhängig vom eigenen `sektor`, weil ein angedockter Pro-Bereich kein Regal zeigt.

**Der Bau hat eine Messung überschrieben, die in der Datei stand, die er rot machte.**

Das ist am selben Tag die zweite Stelle dieser Art; die erste war ein Wächter, der seinen dritten
Nachzug vorausgesagt hatte. Daraus die Regel:

> **Eine Datei, die man rot macht, hat oft schon gesagt, warum. Erst ihren Kopf lesen, dann den
> Maßstab in Frage stellen.**

Der Kommentar an der Fundstelle in `vivodepot.html` trägt darum jetzt die Messung, nicht die
Absicht: *„HIER STAND EIN BEREICHSFILTER, UND ER MUSS HIER NIE WIEDER STEHEN."*

## 6 · Der Nachtrag in `ERWARTETE_ABWEICHUNGEN`

Die zweite rote Probe desselben Tages hatte eine andere Wurzel und war **kein** Verhaltensfehler:
die A==B-Abnahme meldete vier unerklärte Abweichungen im Voll-Depot-PDF. Alle vier gehen auf fünf
neue Bürgermodul-Felder aus U2-ADR-326/330 zurück (drei Einkommens-Felder in
`vermoegen·einkommen-wohnsituation`, zwei Unterfelder im Verbund `verwaltung_vorgaenge`). Sie
gehören der Bürgerin, nicht dem Template, und stehen darum auch in ihrem eigenen PDF. Beabsichtigt,
nur nicht benannt.

**Sie stehen jetzt in der Liste — aber nicht als Pfad-Präfix.** Ein Präfix auf `…zeilen` hätte die
ganze Sektion freigestellt; dann fiele auch ein Verlust nicht mehr auf, und die Indizes (`zeilen.6/7/8`)
verschieben sich, sobald jemand eine Zeile davor einfügt. Die zwei Einträge tragen darum ein
Prädikat: **es lässt ausschließlich Zuwachs durch und nur den benannten** — eine fehlende Zeile, ein
umbenanntes Label, ein geschrumpfter oder abweichender Verbundwert bleiben Befunde. Vier Gegenproben
halten `unerklaerte` gegen handgemachte Unterschiede und beweisen genau das.

## 7 · Der zweite Fehler, den derselbe Filter verdeckt hat

Mit der zurückkehrenden Karte kam ein Loch: ihre Herkunft-Zeile war **leer**, während der Erbschein
daneben „Vivodepot-Auszug" zeigte.

U2-ADR-326 hatte für genau diesen Fall einen Rückfall gebaut — und las dabei
`reg.generator.herkunft`. **Diesen Pfad gibt es an keinem Modul.** Gemessen: `generator` führt
`datenLesen`, `optLabel`, `istSentinel`, `refmNamen`, `rolleLabel`, `eingangsformel`, `abschnitte`.
Kein `herkunft`. Der Rückfall war von Anfang an tot.

**Er ist nie aufgefallen, weil derselbe Zug die einzige Karte, die ihn gebraucht hätte, unsichtbar
machte.** Zwei Fehler, die sich gegenseitig verdeckten; der eine wurde erst mit dem anderen sichtbar.

Die Quelle ist `data.logikModule[].herkunft` — die Angabe des Moduls über sich selbst. Sie trägt die
sprachneutrale Marke `vivodepot`, aufgelöst **erst beim Aufruf** gegen `STRINGS.vivodepotAuszugBadge`
(de: „Vivodepot-Auszug", en: „Vivodepot extract").

Dabei fiel eine zweite Zeile: `_MODUL_KARTE` trug

```js
'erbschein-vorbereitung': { herkunft: 'Vivodepot-Auszug' },
```

**Der Kommentar direkt darüber verbietet genau das.** Er hält seit dem 28.08.2026 fest, dass
`herkunft` eine stabile, sprachneutrale Marke tragen muss, weil ein Literal beim Skript-Parse
eingefroren wird und bei aktivem Englisch deutsch bleibt — und beschreibt den Live-Beleg dafür.
Die Zeile darunter war ein deutsches Literal. Sie war zugleich eine Template-Kennung im Kern, also
das, was U2-ADR-326 abgeschafft hat. **Sie ist fort**; beide Auszüge lösen jetzt dieselbe Marke auf,
und der Erbschein rendert byte-gleich wie vorher.

Zum dritten Mal an diesem Tag stand die Antwort schon im Kommentar an der Fundstelle.

Der Wächter dazu prüft nicht „Modul X zeigt Y", sondern: **keine Karte im Regal zeigt eine leere
Herkunft.** Ein Loch ist kein Zustand.

## 8 · Die Klasse, die dieser Zug freigelegt hat — ein Fehler, der die Prüfstelle des nächsten entfernt

Der Rückbau hat den alten Zustand **nicht** wiederhergestellt. Er hat einen zweiten Mangel
freigelegt, der aussah, als hätte der Rückbau ihn verursacht.

Der Hergang, in einem Satz: **der Filter hat die einzige Karte unsichtbar gemacht, an der ein
danebenliegender Fehler hätte auffallen können.** Der tote Rückfall
(`reg.generator.herkunft`) war nicht schwer zu finden — er war unerreichbar. Solange die Karte
fehlte, gab es keine Stelle, an der er sich hätte zeigen können.

**Daraus die Regel, die beim nächsten Rückbau gilt:**

> **Ein Rückbau, der zwei Befunde erzeugt statt keinen, ist damit nicht widerlegt.** Ein Fehler kann
> die Prüfstelle eines zweiten mit entfernen; dann kommen beide gemeinsam zurück ans Licht, und der
> zweite sieht jünger aus, als er ist. **Wer den Rückbau daraufhin zurücknimmt, verbirgt beide
> wieder.**

Für den Bau heißt das: nach einem Rückbau nicht nur prüfen, ob der behobene Fall wieder geht,
sondern **was am selben Ort sonst noch sichtbar wird**. Hier war es eine leere Zeile in einer Karte,
die einen Tag lang niemand sehen konnte.

## 9 · Dreimal derselbe Riss, an einem Tag

Drei Stellen, drei verschiedene Vorkehrungen, dieselbe Bewegung:

1. **Die Stichprobe** deckte den Fall nicht ab, für den sie zuständig war — beide Fixtures trugen
   denselben `sektor` (§3).
2. **Der Rückfall** war halb gebaut: die Absicht stimmte, der gelesene Pfad existierte nicht (§7).
3. **Das Literal** stand unter einem Kommentar, der genau dieses Literal verbietet, mit
   Live-Beleg (§7).

> **Wer eine Vorkehrung halb kopiert oder einen Kommentar überliest, baut die Lücke ein, gegen die
> sie gebaut war.**

**Nachtrag am selben Tag, zwei weitere Stellen derselben Form — außerhalb des Produktcodes, was den
Satz eher bestätigt als schwächt:**

4. **Eine Warteschleife, die auf sich selbst wartete.** `until ! pgrep -f "faktenbasis-erzeugen";
   do sleep 10; done` — `pgrep -f` durchsucht die ganze Kommandozeile, und die Kommandozeile der
   Schleife enthält den Suchbegriff. Sechs Stück liefen über sechs Stunden und konnten nie enden.
5. **Eine Suche nach Verweisen auf nicht-öffentliche Dokumente**, die nach Verzeichnis-Fragmenten
   fragte und **null** fand — weil die Dokumente den Dateinamen ohne Verzeichnis nennen. Die
   breitere Suche, die jeden genannten Dateinamen gegen den Repo-Bestand hielt, fand 87 Namen in
   56 Dateien.

**Und eine sechste, beim Schreiben genau dieses Abschnitts:** die erste Fassung von Punkt 5 nannte
die zwei gesuchten Verzeichnis-Fragmente als Beispiel — **und schrieb damit in dieses ADR genau die
Sorte Verweis, die es gerade erhebt.** Der ADR-Namen-Wächter hat es im Gate gefangen, zwei Zeilen,
Datei und Zeilennummer. **Das ist kein weiterer Beleg für die Regel oben, sondern für die
Gegenmaßnahme: ein Wächter, der den Bestand generisch abläuft, fängt auch den, der ihn schreibt.**

**Die Form ist in allen fünf Fällen dieselbe: der Filter fragt nach dem Merkmal, das der gesuchte
Fall gerade nicht trägt.** Beim Bereichsfilter war es `sektor`, bei der Stichprobe die Einfarbigkeit,
beim Rückfall ein Pfad, den es nicht gibt, bei der Warteschleife das eigene Spiegelbild, bei der
Verweis-Suche der fehlende Pfad.

## 10 · Was hier nicht entschieden ist

Wo Template-Karten künftig wohnen. Das entscheidet „Weitere Bereiche". Dieses ADR sagt nur: **bis
dahin ist das Regal der eine Ort, und ein Filter darin ist ein Rückschritt, kein Aufräumen.**
