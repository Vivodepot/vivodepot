# U2-ADR-197: Aussage-Prüfung-Abgleich — folgt die Aussage wirklich aus der Probe?

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** PRÜFARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-099 (Reihenfolge-Prüf-Architektur, `pruefstand-bindung.js` — prüft STRUKTUR:
löst `pruefung:` auf einen echten Testtitel auf, trägt PROBEN-Deklaration, Kollektor- vs.
Konstruktions-Form; prüft ausdrücklich NICHT, ob der Geltungsbereich des Wächters die Aussage
deckt — genau die Lücke, die diese Entscheidung schließt)
**Anker:** Auftrag „Vier Zusicherungen, die mehr behaupteten als ihre Prüfung deckt",
01.09.2026, freigegeben. Anlass: vier am selben Tag gemessene Fälle, in denen
die Messung stimmte, aber die danebenstehende Aussage nicht trug (BBK-Datum prüfte nur eine Zahl
statt der Veröffentlichung; eine Sprachabdeckungs-Prozentzahl zählte „übersetzt" statt „richtig";
ein Modul-Wächter prüfte Struktur statt Aktualität; eine Verweis-Probe fand nur zitierte, keine
umschriebenen Verweise).
**Status heute:** gilt — Beleg `tests/aussage-pruefung-abgleich-messen.test.js`.

---

## Kontext

`pruefstand-bindung.js` (U2-ADR-099) beantwortet seit dem 23.07.2026 zuverlässig: existiert die
genannte Probe, wird sie benutzt, ist sie robust gegen die Kollektor-Form-Falle (§7.5)? Es
beantwortet NICHT, ob das, was die Probe tatsächlich MISST, das deckt, was die `aussage:`
BEHAUPTET. Eine Probe kann strukturell einwandfrei — existent, benutzt, Konstruktions-Form — und
trotzdem etwas anderes messen als die daneben stehende Aussage.

Der Zug-0-Auftrag benannte vier gemessene Fälle dieser Klasse. Diese Entscheidung geht den ganzen
ADR-Bestand durch und prüft je Konformitätsblock, ob die Aussage aus der Probe folgt.

## Entscheidung

**Ein Werkzeug (`tools/aussage-pruefung-abgleich-messen.js`) sortiert mechanisch vor, ein Mensch
liest den Rest.** Read-only, wie beauftragt — es repariert nichts.

**Zwei Achsen:**

1. **Aussage-Probe-Abgleich.** Drei mechanische Signale je Block: löst jede `pruefung:`-Zeile
   überhaupt auf einen echten Testtitel auf (der schwerste, rein mechanisch erfassbare Fall);
   trägt die Aussage absolute Sprache („nur"/„genau"/„nie"/„ersatzlos" — brüchig gegen Code-Drift,
   kein Urteil für sich); fehlt ein in der Aussage benannter Begriff (Backtick-Code, Zahl,
   Klammer-Liste) komplett im gebundenen Testkörper. Jeder Treffer geht in den Bericht, wird von
   einem Menschen gelesen, nicht automatisch verurteilt.

2. **Rotmachbarkeits-Näherung.** Grobe, dateiweite Näherung (kein Aufruf-Nachweis je Zeile, das
   leistet nur `pruefstand-bindung.js`s teure Kindprozess-Instrumentierung): trägt die gebundene
   Testdatei irgendeine erkennbare Rot-Beweis-Spur (`[Negativprobe]`, „Positivkontrolle" o. ä.)?

**Die wichtigste Fundklasse ist NICHT mechanisch erfassbar** und wurde erst beim vollständigen
Lesen sichtbar: *die Probe prüft das Einzelteil, nicht das, wovon die Aussage handelt.* Eine
Aussage behauptet etwas über ein VERDRAHTETES, mehrteiliges Ding — eine Funktion, die eine andere
aufruft; eine Architektur mit EINER Quelle statt vieler; ein Muster, das für ALLE Instanzen einer
Klasse gelten soll (eine Allaussage). Die Probe prüft nur einen isolierten Teil davon — die
genannten Begriffe stehen im Testkörper (nur in einer isolierten Hilfsfunktion, oder als bloße,
unverbundene Existenzprüfung), kein mechanisches Signal zeigt es an. Abgrenzung: eine einfache
Eingabe→Ausgabe-Behauptung über EINE Funktion hat dieses Gefälle nicht — ein direkter Aufruf mit
Ergebnisprüfung IST dort schon die Integration. Die Kategorie greift nur bei mehrteiligen,
verdrahteten oder quantifizierten Aussagen.

## Verworfene Alternative

**Eine vollautomatische Klassifikation (grün/rot je Block).** Verworfen: die entscheidende
Fundklasse (Einzelteil statt Verdrahtung) erfordert zu verstehen, WOVON die Aussage handelt — das
ist Semantik, kein Textmuster. Ein Werkzeug, das hier ein Urteil vortäuschte, wäre selbst eine
Zusicherung, die mehr behauptet als ihre Prüfung deckt — genau der Fehler, den dieser Auftrag
sucht.

## Konsequenzen

**Fünf echte Funde**, einer davon (U2-ADR-097 §12d, „jeder Drop-Handler hat einen Nicht-D&D-Pfad")
der schwerste des Auftrags — eine Barrierefreiheits-Garantie, geprüft nur als Existenzaussage statt
als Allaussage über tatsächlich zugeordnete Ersatzpfade. Zwei Funde (U2-ADR-002/016, U2-ADR-126)
waren reine Zahlen-Drift (Probe nachgezogen, Aussage nicht) und sind in diesem Zug korrigiert. Drei
Funde (U2-ADR-097 §12d, U2-ADR-061, U2-ADR-131) brauchen echte Verstärkung der Prüfung selbst —
eigener, künftiger Auftrag, nicht Teil dieser Entscheidung.

**Prüfung des Prüfers, gemessen:** 44 von 75 (59 %) der von `pruefstand-bindung.js` klassifizierten
Wächter rufen eine dateieigene Hilfsfunktion auf — dieselbe strukturelle Angriffsfläche, die einen
der fünf Funde hier verursachte. Präzise nachgemessen: 0 von 44 wechseln heute tatsächlich die
Kollektor/Konstruktions-Einstufung, wenn der Hilfsfunktions-Körper mitgelesen wird. Kein Schaden
heute, kein Freibrief für morgen — als eigener Folgeposten notiert (Klassifikator soll aufgerufene
Hilfsfunktionskörper mitlesen), nicht Teil dieser Entscheidung.

**Neun Falsch-Alarm-Klassen** wurden am eigenen Werkzeug gemessen und in dessen Kopf-Kommentar
sowie im Bericht festgehalten — von 22 mechanisch signalisierten Blöcken waren nach vollem Lesen
nur 2 echt.

## Konformität

```konformitaet
aussage:  Jede `pruefung:`-Zeile eines Konformitätsblocks löst mechanisch entweder auf einen
          echten Testtitel auf oder wird als Fund gemeldet — kein stiller Fehlschlag.
zustand:  geprüft
herkunft: invariante
pruefung: tests/aussage-pruefung-abgleich-messen.test.js#[erhebe] die U2-ADR-099-Selbstbeschreibung „`pruefung:`-Zeile" löst NICHT als eigene, kaputte Pruefung-Zeile auf
```

```konformitaet
aussage:  Ein Begriff, der in der Aussage genannt, aber im gebundenen Testkörper nicht zu finden
          ist, wird als Fund gemeldet; ein tatsächlich vorhandener Begriff wird es nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/aussage-pruefung-abgleich-messen.test.js#[fehlendeBegriffe] ein Begriff, der im Testkörper fehlt, wird gemeldet — der reale U2-ADR-002-Fund nachgebaut
pruefung: tests/aussage-pruefung-abgleich-messen.test.js#[fehlendeBegriffe·Gegenprobe] ein tatsächlich genannter Begriff wird NICHT gemeldet
```

```konformitaet
aussage:  Die eigene ADR-Nummer einer Aussage („U2-002:", Querverweise wie „U2-ADR-016") zählt
          NICHT als benannter Begriff — sonst meldet das Werkzeug seine eigene Beschriftung
          gegen sich selbst (BEFUND aus dem ersten Lauf: 9 von 26 ersten Funden waren dieser Fall).
zustand:  geprüft
herkunft: invariante
pruefung: tests/aussage-pruefung-abgleich-messen.test.js#[benannteBegriffe·BEFUND, jetzt gefiltert] die eigene ADR-Nummer der Aussage zählt NICHT als Begriff
```

```konformitaet
aussage:  Eine Testdatei mit einem `[Negativprobe]`-Titel oder einem „Positivkontrolle"-Kommentar
          gilt als Rot-Beweis-belegt; eine Datei ganz ohne solche Spur gilt es nicht.
zustand:  geprüft
herkunft: invariante
pruefung: tests/aussage-pruefung-abgleich-messen.test.js#[hatRotBelegProxy] eine Datei mit „[Negativprobe]"-Titel gilt als belegt
pruefung: tests/aussage-pruefung-abgleich-messen.test.js#[hatRotBelegProxy·Gegenprobe] eine Datei ganz ohne Rot-Beweis-Spur gilt als NICHT belegt
```

---

*Vivodepot GmbH · Berlin · 01.09.2026*
