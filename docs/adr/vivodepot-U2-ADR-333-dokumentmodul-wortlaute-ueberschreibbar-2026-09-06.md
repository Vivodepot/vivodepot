# U2-ADR-333: Die Wortlaute der Vorsorge-Dokumente werden überschreibbar — und was dabei fehlt, wird gezählt

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot.html` (`TEXTSATZ_ARTEN_DOKUMENT`, `_textsatzAufDokumentModulAnwenden`,
`_textsatzAufSchrittsatzAnwenden`, `_textsatzListeFuellen`, `_textsatzOrteBegehen`,
`TEXTSATZ_EINGEBAUT` +121), `tools/dokumentmodul-folge-fingerabdruck.js` (neu),
`tools/textsatz-en-juristisch-offen.js` (neu),
`tests/textsatz-dokumentmodule-u2-adr-333.test.js` (neu), `tests/textsatz-mechanismus.test.js`,
`tests/textsatz-en-modul-erzeugen.test.js`

- **Status heute:** gilt — ein Sprachmodul ändert einen Wortlaut in einem
  Vorsorge-Dokument, ohne eine Zeile im Kern.

---

## Warum das gebraucht wird

121 Wortlaute in den vier Dokument-Modulen und den zwei Schritt-Katalogen standen **außerhalb
jedes Textsatz-Laufs**. Kein Sprachmodul erreichte sie — auch nicht in Dokumenten, die eine
Bürgerin einer Behörde vorlegt.

```
VOLLMACHT_MODUL   36     PV_MODUL        32     KI_MODUL   20
PV_BMJ            23     STANDARD_VORLAGEN 16   KI_KORPUS  12
BETREUUNG_MODUL    6     RECHTSGRUNDLAGEN_VERTRETUNG  2
```

**`PV_BMJ` und `KI_KORPUS` standen in keiner Liste**, die diesen Zug beauftragt hat — weder in der
des Auftrags noch in der einer früheren Erhebung. **Der Gang ohne Ortsliste (U2-ADR-322) hat sie
gefunden.** Beide Listen waren Ortslisten, und beide waren unvollständig.

## Die Grenze — damit sie nicht für mehr gehalten wird

```
BEREICHE (U2-ADR-320)      der Bestand ist aus der Datei — das Buendel ist die Quelle
DOKUMENT-MODULE (dieser)   der Wortlaut bleibt im Kern und ist ueberschreibbar
```

**Dieser Zug macht die Wortlaute überschreibbar. Er holt sie nicht aus dem Kern.** Wer das nicht
unterscheidet, hält den Kern für neutraler, als er ist. Ob die Dokument-Module je ins Bündel
wandern wie die Bereiche, ist ein eigener Posten.

## Das Messmodell — festgelegt, bevor die Zahl fiel

```
TRAEGER ist eine Zeichenkette, die
  (a) unter einer Eigenschaft aus dem ARTEN-Vokabular steht, ODER
      Element eines Arrays unter einer solchen Eigenschaft ist, UND
  (b) Anzeigetext-Form hat (tools/anzeigetexte-orten.js)

GEDECKT heisst: der WERT steht im Satz. Keine Kennung wird hergeleitet.
DOPPELTE zaehlen als Traeger einzeln, als Wortlaute einmal.
ARRAYS zaehlen elementweise; die Kennung traegt den Index.
```

**Eine Ratsche ohne Modell ist beim nächsten Streit wertlos.** Gemessen gegen `6cecde7d`: 1755
Träger, 1544 gedeckt, **211 ungedeckt / 158 Wortlaute, null Signaturen**.

## Was ausdrücklich nicht ins Vokabular kam — und warum das dazugehört

**Ein Filter über die FORM einer Zeichenkette fängt Signaturen: ein JWS trägt Punkte und sieht für
einen Satzzeichen-Filter wie ein Satz aus.** Weil dieses Vokabular **art-basiert** ist, fällt
`templateJws` strukturell heraus, statt ausgenommen werden zu müssen. **Ein struktureller Ausschluss
trägt weiter als eine Ausnahmeliste** — und die Probe belegt ihn mit „0 Treffer" statt mit „kann
nicht".

**`url`, `behoerde`, `lizenz`, `stand` sind Herkunftsangaben eines amtlichen Werks** — Aussagen
*über* den Gegenstand, nicht Text darin. Ein Modul, das sie überschreiben könnte, änderte die
angegebene Quelle eines amtlichen Formulars: eine Vollmacht, die sagt, sie stamme vom BMJ, Stand
Januar 2023, und beides ist gesetzt worden. Sie gehören in eine Sperrliste, nicht in den Satz;
gemeldet an die Sitzung, die sie führt.

**`bulletPrefix` („– ") ist eine Konvention, kein Satz.** Konventionen haben ihren Ort im Modulkopf
(`TEXTSATZ_REGELN_EINGEBAUT`), nicht in der Textliste — wer das Aufzählungszeichen je ändern will,
sucht dort.

## Die Kennung trägt einen Index, weil es nichts Besseres gibt

```
0 von 35 Abschnitten mit id       0 von 75 Bloecken mit id
```

Wo ein Block eine `feldId` hat, wird sie genommen — sie überlebt eine Einfügung davor, ein Index
nicht. **Gemischt ist unschön, aber ehrlicher als ein durchgängiger Index, der mehr Stabilität
vortäuscht, als da ist.**

**Die tragfähige Lösung wären `id`s an Abschnitten und Blöcken** — dann bräuchte keine Kennung einen
Index. Das ist ein eigener Zug am Bestand und ausdrücklich nicht Teil dieses; die Grenze steht hier,
damit sie benannt ist und nicht als Wunsch verlorengeht.

**Bewacht wird die FOLGE, nicht die Zahl** (`tools/dokumentmodul-folge-fingerabdruck.js`). Eine
Zählung fängt ein Einfügen — **ein Tausch aber lässt die Zahl unverändert**, und ein Tausch ist der
Fall, der still den falschen Text an die falsche Stelle liefert. Die Meldung unterscheidet beides:
Eingefügtes braucht nachgezogene Kennungen, Getauschtes bricht bestehende Übersetzungen.

## Der Text bleibt zusätzlich inline — gemessen, nicht bequem

```
von 121 Kennungen im Quelltext
  genau einmal auffindbar   64
  mehrfach                  56     "entscheiden." kommt 7x vor
  gar nicht                  1
```

Eine Textsuche taugt nicht zum Heben. **Ein Eingriff an 56 mehrdeutigen Stellen wäre das größere
Risiko für denselben Effekt** — und die Bauform trägt ohne ihn, im Rundlauf in beide Richtungen
gemessen: `textsatzNeuAnwenden` nimmt inline stehende Werte zurück, sobald ihre Kennung im Satz
steht, und füllt aus dem Satz neu.

## Zwei Fehler, die erst der Rundlauf fand

**Wer eine Vorkehrung halb kopiert, baut die Lücke ein, gegen die sie gebaut war.**

**Erstens:** `_textsatzTunDokument` bildete nur den Rückweg ab, nicht den Füllweg. Der lief dann mit
der vollen Artenliste, die `satz` nicht kennt.

```
Rueckweg nimmt den inline stehenden satz weg   (seine Kennung steht im Satz)
Fuellweg setzt ihn nicht neu                   (die Art fehlt ihm)
-> satz === undefined, mitten im Dokument
```

**Ein Text, der verschwindet, weil zwei Wege verschiedene Vokabulare haben — und keiner der beiden
Wege ist für sich falsch.** Der Kern trug die Antwort bereits: `_textsatzTunAssistent` bildet beide
Richtungen ab, mit dem Kommentar *„damit kein Aufrufer die Grenze umgeht"*.

**Zweitens:** das Vokabular kannte nur die neun neuen Arten, nicht `titel`/`einleitung`/`label`. Der
Abschnitts-Titel wurde nicht übersetzt, obwohl seine Kennung im Satz stand. **Die Lücke sieht aus
wie ein fehlender Satz-Eintrag und ist ein fehlendes Vokabular — man sucht an der falschen Stelle.**

**Keiner der beiden wäre bei einem Blick auf den Code aufgefallen.**

## Was fehlt, wird gezählt — nicht gefüllt und nicht versteckt

Der EN-Wächter verlangt volle Abdeckung. **Die 121 Wortlaute sind Rechtstexte**; eine englische
Fassung, die kein Jurist gesehen hat, wäre schlimmer als keine — **sie sähe amtlich aus.**

`tools/textsatz-en-juristisch-offen.js` führt sie darum als **Rückstand mit einer Zahl daran**,
nach der Bauform des Registers aus U2-ADR-322: jede geführte Kennung muss existieren, die Menge darf
nie wachsen, und sie soll schrumpfen. Drei Proben halten das fest — die dritte belegt, dass die
Liste überhaupt etwas verdeckt; ohne sie bestünde sie auch dann, wenn der Erzeuger gar nichts mehr
lieferte.

## Was die Bürgerin sieht — entschieden, nicht offengelassen

**Produktentscheidung (06.09.2026): der deutsche Wortlaut steht da, und daneben steht, dass
er deutsch ist und warum. Keine leere Stelle in einer Vorsorgevollmacht.** Dieselbe Antwort, die
U2-ADR-263 für nicht darstellbare Zeichen im PDF gegeben hat: *„ein stiller Ersatz ist in keinem
Fall zulässig."*

**Ein Hinweis am Kopf, nicht einer je Passage** — die Form folgt der Messung, nicht dem Gefühl:

```
33  vorsorgevollmacht     16  ki-verfuegung
31  patientenverfuegung   12  kiKorpus
23  pvBmj                  6  betreuungsverfuegung
```

Kein Dokument liegt im „wenige"-Bereich; bei 33 Stellen wäre der Hinweis länger als der Text, den
er erklärt.

**Die Zahl wird gemessen, nicht geführt.** Sie kommt aus dem Vergleich zwischen dem, was der aktive
Satz liefert, und dem, was eingebaut steht — sind beide gleich, während eine fremde Sprache aktiv
ist, trägt das Sprachmodul diese Kennung nicht. **Wer eine Passage übersetzt, sieht die Zahl von
selbst sinken; eine geführte Zahl driftete an genau dieser Stelle.** Die Probe verlangt es
ausdrücklich: zwei übersetzte Passagen müssen die Zahl um genau zwei senken.

**Der Hinweis gehört in die Zusicherungs-Sperre.** Er sagt etwas *über* das Dokument, nicht darin —
ein Sprachmodul, das ihn entfernen oder umschreiben kann, gibt eine unübersetzte Passage als
übersetzt aus. Gemeldet an die Sitzung, die U2-ADR-331 baut, statt eine zweite Sperre daneben zu
bauen.

## Ein Drittel des Rückstands ist keine Übersetzungsarbeit

Für zwei der sechs Dokumente gibt es **amtliche englische Fassungen** desselben Herausgebers und
desselben Standes, den unser Kern an diesen Vorlagen führt (`stand: "Januar 2023"`):

```
39  vorsorgevollmacht (33) + betreuungsverfuegung (6)   amtlich uebernehmbar
82  patientenverfuegung · pvBmj · ki-verfuegung · kiKorpus   echter Rueckstand
```

**Für die 39 ist es keine Übersetzung, sondern eine Übernahme** — derselbe Vorgang wie beim
deutschen Wortlaut: amtliches Werk nach § 5 UrhG, unverändert. Die Auflage „keinen englischen
Wortlaut einsetzen, den kein Jurist gesehen hat" greift dort nicht: **das Justizministerium ist der
Jurist.**

**Das macht den Rückstand ehrlicher, nicht kleiner:** 82 Stellen brauchen wirklich einen
juristischen Blick, 39 brauchen jemanden, der ein PDF aufschlägt. **Die Übernahme ist ein eigener
Zug** — sie verlangt die Quelle als Fixture im Repo und eine Probe, die jeden übernommenen Wortlaut
wörtlich im extrahierten Text wiederfindet, damit „unveränderte Übernahme" nachmessbar bleibt statt
zugesagt.

## Zwei Proben stammen aus einer ausgefallenen Sitzung — und eine schließt eine Lücke in diesem Zug

Eine Sitzung, die am selben Tag ausfiel, hatte denselben Gegenstand angefangen. Ihr Stand war
gesichert; zwei ihrer Proben fehlten hier und sind **übernommen, nicht nachgebaut** — der Gedanke
gehört ihr, und der Kopfkommentar an der Stelle sagt das.

**Die wertvollere ist eine Gegenkontrolle zur Signatur-Probe.** Diese meldet „0 Treffer": keine
signaturtragende Kennung steht im Satz. **Sie wäre aber auch dann grün, wenn ihr Muster nie
zuträfe** — dann prüft sie nichts als ihre eigene Strenge. Erst die Gegenkontrolle, die eine echte
`templateJws` vorlegt und verlangt, dass das Muster sie erkennt, macht aus der Null einen Befund.

**Das ist an einem Tag die dritte unabhängige Erscheinung derselben Bauform** — nach dem Anker, der
ins Leere zeigte (U2-ADR-322), und der Wortlaut-Suche, die ihr eigenes Original nicht fand
(U2-ADR-324). **Drei Funde derselben Klasse in drei Sitzungen sind kein Zufall, sondern der Beleg,
dass die Regel aus U2-ADR-322 trägt:**

> Eine Probe, die nichts findet, ist nicht von einer zu unterscheiden, die nichts zu finden hat.

**Die Ausbeute zuerst zu prüfen ist danach kein Detail einer einzelnen Probe, sondern gehört in
jede, die über eine MENGE redet** — „0 Treffer", „keine Fehlstelle", „nichts Totes". Wo eine Zahl
das Ergebnis ist, muss die Probe belegen, dass sie überhaupt hätte zählen können.

**Die zweite übernommene Probe hält den Kontrakt der vier Dokument-Module fest.** Er war für diesen
Zug gemessen und gemeldet worden, aber nie festgeschrieben — **eine Messung gilt heute, eine Probe
morgen.** Sie prüft dabei nicht auf identische Schlüsselmengen (`PV_MODUL` trägt mit `bezugFuer`
eine Eigenschaft mehr, ohne den Vertrag zu brechen), sondern auf das, was der eine Anwender wirklich
braucht.

## Folgen

- Ein Sprachmodul erreicht die Wortlaute der Vorsorge-Dokumente — der Mechanismus ist fertig und in
  beide Richtungen bewiesen.
- Was fehlt, ist Übersetzungsarbeit mit juristischem Blick, und sie ist beziffert.
- `VOLLMACHT_BMJ` (51 weitere Wortlaute) bleibt ausdrücklich außen vor: derselbe Schlüssel-Weg, aber
  ein eigener Zug.
- **Kein Rückfall auf Deutsch ist eingebaut.** Ein stiller Rückfall machte die Lücke unsichtbar.
