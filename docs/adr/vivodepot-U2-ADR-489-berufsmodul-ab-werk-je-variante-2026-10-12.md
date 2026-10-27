# U2-ADR-489: Ein verkauftes Produkt mit Zuschnitt hat eine Kennung, ein Rezept und eine Adresse

**Status:** Angenommen (12.10.2026), teilweise gebaut
**Datum:** 12.10.2026
**Kategorie:** PRODUKT, AUSLIEFERUNG, KENNUNGEN
**Linie:** U2
**Bezug:** U2-ADR-414 (das Produkt entsteht aus einem signierten Rezept) · U2-ADR-411 (Bestellweg, das Produkt wird beim Abruf
gebaut) · U2-ADR-427 (Templates im Rezept; das Notariatsmodul ruht bis zur Wahl des Berufsmoduls) · U2-ADR-488 (eine Kennung
löst auf, jede Fassung bleibt)
**Status heute:** gilt — das Produktverzeichnis kennt die Zuschnitte, und die Auslieferung legt für jeden Zuschnitt mit
eigener, gegen den Shop abgeglichener Artikelnummer ein Rezept ab (heute: noch keiner abgeglichen); die feste Adresse je Kennung ist im Download-Dienst gebaut; der eigene Ursprung je Kennung
ist im Download-Dienst gebaut (Nachtrag 25.10.2026), die Namen der Hosts und die Auslieferung stehen aus. Die Zeilen im `konformitaet`-Block nennen den Stand je Aussage.

## Frage

Pro wird mit einem Berufsmodul ab Werk verkauft; die Käuferin wählt es beim Kauf. Bisher kennt das Produktverzeichnis vier
Kennungen ohne Zuschnitt, und es war offen, wie die Wahl vom Shop zur Auslieferung kommt. Zugleich soll ein gekauftes Produkt
im Browser öffnen wie ein freies, und jedes Produkt braucht dort seinen eigenen Speicher. Drei Fragen hingen aneinander: wie
ein Zuschnitt benannt wird, wer ihn zusammenstellt, und unter welcher Adresse er ausgeliefert wird.

## Entscheidung

1. **Eine Kennung je Liefergegenstand.** Was eine Käuferin kauft, ist genau ein Liefergegenstand aus Produkt, Sprache und
   Zuschnitt. Er trägt eine Kennung der Form `<produkt>-<sprache>-<zuschnitt>`, zum Beispiel `pro-de-steuerberatung`. Der
   Zuschnitt nennt den Beruf, nie ein Land; den Rechtsraum trägt das Modul selbst. Eine Kennung besteht aus Kleinbuchstaben,
   Ziffern und Bindestrich, hat höchstens 63 Zeichen und beginnt und endet nicht mit einem Bindestrich. Produkte ohne
   Zuschnitt behalten ihre Kennung.
2. **Dieselbe Kennung an jeder Stelle.** Sie ist der Name des Rezepts, der Name in der Adresse der Auslieferung, der Name in
   der Zählung und der Schlüssel im Produktverzeichnis. Zwischen Shop und Auslieferung wird nichts übersetzt.
3. **Der Zuschnitt entsteht beim Release, nicht beim Kauf.** Je Kennung gibt es ein signiertes Rezept mit dem Berufsmodul in
   der Modulliste. Die Auslieferung baut, was das Rezept nennt; sie wählt nichts aus und nimmt keine Angabe des Shops
   entgegen. Die Wahl der Käuferin ist die Wahl eines Artikels im Shop.
4. **Je Kennung eine feste Adresse für den Kauf.** Der Shop zeigt der Käuferin nach der Zahlung einen Link auf
   `/kauf/<kennung>/<zufallsteil>`. Dahinter wird bei jedem Abruf die geltende Fassung aus dem Rezept gebaut. Der Zufallsteil
   sind 256 Bit; Dienst und Repository kennen nur seinen Prüfwert. Wer die Adresse hat, lädt; eine falsche Adresse wird
   beantwortet wie ein Pfad, den es nicht gibt.
5. **Im Browser geöffnet: ein eigener Ursprung je Kennung.** Jede Kennung erhält einen eigenen Namen nach dem bestehenden
   Muster der freien Produkte, damit jedes Produkt seinen eigenen Speicher im Browser hat. Die Anwendung nimmt den Zufallsteil
   nach dem ersten Laden aus ihrer Adresse und hält ihn im eigenen Speicher für spätere Abrufe; er öffnet nur den Abruf
   neuer Fassungen, nie ein Depot. Bis das gebaut ist, lädt die Kauf-Adresse als Datei. (Wo der Zufallsteil liegt, regelt
   seit dem 25.10.2026 der Nachtrag unten.)
6. **Ein Zeitraum gehört an die Adresse, nie an die Kennung.** Soll eine Adresse nur für einen Zeitraum neue Fassungen
   liefern, bekommt die Kennung mehrere Adressen, jede mit ihrem Zeitraum. Die Kennung und damit der Ursprung im Browser
   bleiben dieselben; sonst sähe eine Käuferin nach einer Verlängerung ihre Daten nicht mehr. Wie der Zeitraum durchgesetzt
   wird, entscheidet diese ADR nicht.

## Abgrenzung

- Die Auslieferung prüft unter der Kauf-Adresse keine Zahlung und fragt keine Zustimmung ab. Beides liegt beim Shop.
- Eine weitere Vorlage zu einem schon gekauften Produkt (Nachkauf) ist nicht Teil dieser ADR. Sie würde eine Kennung je
  Kombination verlangen; darüber wird entschieden, wenn es die zweite käufliche Vorlage gibt.
- Erweiterungen fremder Herausgeber bleiben Sache des Einlasses; sie sind kein Zuschnitt ab Werk.

## Folgen

- Das Produktverzeichnis führt neben den vier Grundprodukten eine abgeleitete Liste der Zuschnitte: je Berufsmodul, das mit
  Bereich und Auszug in einer Sprache vorliegt, eine Kennung. Ein Zuschnitt ist sein Grundprodukt und diese zwei Dateien.
- Das Release legt je Zuschnitt ein Rezept ab, sobald der Zuschnitt seine eigene Artikelnummer im Shop trägt. Ohne sie gibt es
  kein Rezept: lieber keines als eines mit der Nummer eines anderen Artikels.
- Die Artikelnummer allein reicht nicht: ein Zuschnitt geht erst hinaus, wenn die Zuordnung Kennung → Artikel von einer
  zweiten Stelle gegen eine gemessene Liste aus dem Shop gehalten wurde und der Beleg im Repo das Datum trägt. Bis dahin
  liefert das Release die vier Grundprodukte.
- Die Abdrücke der Berufsmodule stehen nicht in der gemeinsamen Abdruck-Liste des Kerns. Diese Liste gilt für jedes Produkt;
  ein Berufsmodul darin gälte als Datei in jedem Produkt als ab Werk und wäre ohne Kauf nutzbar. Ein Zuschnitt erkennt sein
  Modul über die eigene Saat des Produkts; in einem Produkt ohne dieses Modul bleibt es gesperrt. Der Kern ändert sich durch
  einen neuen Zuschnitt nicht.
- Eine Datei aus einem Produkt mit Berufsmodul, in einem Produkt ohne dieses Modul geöffnet, zeigt den Bereich weiter, aus
  der Beschreibung, die die Datei mitführt; der Auszug des Berufsmoduls fehlt dort, weil er am Rezept hängt. Nichts ist
  gesperrt, die Angaben der Person bleiben in der Datei, und im Produkt mit dem Modul ist auch der Auszug wieder da.
- Ein neuer Zuschnitt verlangt keinen Eingriff in die Auslieferung: ein Rezept, ein Eintrag in der Liste der Kauf-Adressen,
  ein Artikel im Shop.
- Eine Adresse gilt für alle Käuferinnen einer Kennung. Eine Erstattung nimmt niemandem den Zugang; ein Tausch der Adresse
  trifft alle zugleich. Solange eine Adresse ohne Ende gilt, liefert sie jede künftige Fassung.
- Die Berechtigung hängt daran, dass der Shop die Adresse erst nach der Zahlung zeigt. Das wird bei jeder Auslieferung des
  Dienstes von außen geprüft.

## Nachtrag 25.10.2026: Der Zufallsteil liegt in einem Cookie des Ursprungs, nicht in der Anwendung

**Anlass.** Nr. 5 legt den Zufallsteil in den Speicher der Anwendung. Das verlangt einen Bau im Kern und im Service Worker,
der den Pfad mit dem Zufallsteil sonst als Schlüssel im Zwischenspeicher ablegt. Derselbe Zweck ist ohne Eingriff in den
Kern erreichbar.

**Entscheidung.** Abweichend vom Wortlaut von Nr. 5 hält nicht die Anwendung den Zufallsteil, sondern der Browser in einem
Cookie des Ursprungs der Kennung:
1. Die Kauf-Adresse prüft den Prüfwert wie bisher und leitet bei gültigem Zufallsteil auf den Namen der Kennung um. Dieser
   prüft noch einmal, setzt das Cookie und leitet auf seine Wurzel um. Ab da steht der Zufallsteil nicht mehr in der
   Adresszeile, im Verlauf oder in einem Referer.
2. Das Cookie trägt das Präfix `__Host-`, ist `Secure`, `HttpOnly`, `SameSite=Lax` und hat kein Domain-Attribut. Nur dieser
   Ursprung bekommt es, nicht der Download-Dienst und kein anderer Pro-Ursprung. Kein Skript kann es lesen, auch eine
   eingeschleuste Zeile nicht.
3. Die Laufzeit ist höchstens 400 Tage und gleitet: jede gültige Antwort der Wurzel setzt das Cookie neu.
4. Ohne gültiges Cookie antwortet die Wurzel mit „nicht gefunden“ und einem Satz, wie der Link aus der Bestellung den Zugang
   zurückbringt.
5. Die Antworten dieses Ursprungs setzen keine Opener-Sperre (Cross-Origin-Opener-Policy), weil der Knopf „Im Pod ablegen“
   den Griff auf das geöffnete Fenster braucht.

Der Kern und der Service Worker ändern sich nicht. Das Cookie hält das Geheimnis aus Skripten, Adresszeile, Verlauf und
Referer heraus. Gegen die Wiederverwendung des Kauf-Links schützt es nicht und soll es nicht: wer die Adresse hat, kommt
hinein (Nr. 4). Löscht die Person die Website-Daten, ist mit dem Depot im Browser auch das Cookie weg; der Link aus der
Bestellung bringt den Zugang zurück. Abgestimmt mit der Kryptographie am 25.10.2026.

```yaml
konformitaet:
  - aussage: >-
      Jede Kennung eines Produkts hat dieselbe Form an jeder Stelle: Kleinbuchstaben, Ziffern, Bindestrich, höchstens 63
      Zeichen, kein Bindestrich am Rand; für ein Produkt mit Zuschnitt die Folge Produkt, Sprache, Zuschnitt.
    zustand: erfuellt
    herkunft: U2-ADR-489 (12.10.2026)
    pruefung:
      - tests/pro-zuschnitte.test.js "[Pro·Zuschnitt] die Kennung hat die Form <produkt>-<sprache>-<zuschnitt>, taugt als DNS-Name und fällt mit keinem Grundprodukt zusammen"
      - tests/pro-zuschnitte.test.js "[Pro·Zuschnitt·Rot-Beweis] ein Berufsmodul mit nur einem Teil ergibt keinen Zuschnitt; eine Kennung, die kein DNS-Name ist, bricht den Bau"
  - aussage: >-
      Für jedes Berufsmodul im Bestand gibt es je Sprache genau einen Zuschnitt; er ist sein Grundprodukt und genau die
      zwei Dateien dieses Berufsmoduls.
    zustand: erfuellt
    herkunft: U2-ADR-489 (12.10.2026)
    pruefung:
      - tests/pro-zuschnitte.test.js "[Pro·Zuschnitt] jedes Berufsmodul im Bestand ergibt je Sprache genau einen Zuschnitt, und jede Moduldatei gehört zu einem"
      - tests/pro-zuschnitte.test.js "[Pro·Zuschnitt] die Grundprodukte bleiben vier; ein Zuschnitt ist sein Grundprodukt plus genau die zwei Dateien des Berufsmoduls"
  - aussage: >-
      Ein Zuschnitt ohne eigene Artikelnummer hat keinen Rezeptkopf und geht nicht als verkäuflich hinaus; mit ihr trägt
      er Zugangsart und Namen seines Grundprodukts.
    zustand: erfuellt
    herkunft: U2-ADR-489 (12.10.2026)
    pruefung:
      - tests/pro-zuschnitte.test.js "[Pro·Zuschnitt·Rezeptkopf] ohne eigene Artikelnummer gibt es keinen Rezeptkopf; mit ihr trägt er Zugangsart und Namen des Grundprodukts"
  - aussage: >-
      Für jeden Zuschnitt liegt ein signiertes Rezept unter seiner Kennung auf der Ablage, und das daraus gebaute Produkt
      trägt genau sein Berufsmodul.
    zustand: offen
    herkunft: U2-ADR-489 (12.10.2026)
    frist: 2026-11-30
    bedingung: >-
      Die Artikelnummern der Zuschnitte sind eingetragen und ein Release hat die Rezepte abgelegt; Probe über die
      Auslieferung je Zuschnitt mit Rot-Beweis (fehlendes Rezept, falsches Modul).
  - aussage: >-
      Kein Abdruck eines Berufsmoduls steht in der gemeinsamen Abdruck-Liste des Kerns oder der Lese-App; ein Berufsmodul
      gilt nur in dem Produkt als ab Werk, das es im Rezept trägt.
    zustand: erfuellt
    herkunft: U2-ADR-489 (12.10.2026)
    pruefung:
      - tests/pro-zuschnitte.test.js "[Pro·Zuschnitt·Sperre] kein Abdruck eines Berufsmoduls steht in der gemeinsamen Abdruck-Liste des Kerns oder der Lese-App"
  - aussage: >-
      Die Angaben der Person in einem Berufs-Bereich bleiben erhalten, wenn die Datei in einem Produkt ohne dieses
      Berufsmodul geöffnet und gespeichert wird: der Bereich wird dort gezeigt, der Auszug fehlt, nichts ist gesperrt; im
      Produkt mit dem Modul ist auch der Auszug wieder da.
    zustand: erfuellt
    herkunft: U2-ADR-489 (12.10.2026)
    pruefung:
      - tests/pro-berufsmodul-ab-werk-sperre.test.js "[Pro·Berufsmodul·anderes Produkt] die Angaben bleiben erhalten: ohne das Modul geöffnet, gespeichert und im Pro mit dem Modul wieder da"
  - aussage: >-
      Die Auslieferung nimmt für den Lieferinhalt keine Angabe des Shops entgegen: unter der Kauf-Adresse bestimmt allein die
      Kennung in der Adresse, welches Rezept gebaut wird, und eine falsche Adresse wird beantwortet wie ein unbekannter Pfad.
    zustand: offen
    herkunft: U2-ADR-489 (12.10.2026)
    frist: 2026-11-30
    bedingung: >-
      Im Download-Dienst gebaut und dort geprüft (richtiger und falscher Zufallsteil, fremde Kennung, Rezept ohne Verkauf);
      aus diesem Repository ist die Probe nicht ausführbar. Erfüllt, sobald der Dienst mit der Kauf-Adresse ausgeliefert und
      die Prüfung von außen im Auslieferungs-Vermerk steht.
  - aussage: >-
      Im Browser geöffnet hat jede Kennung einen eigenen Ursprung, und der Zufallsteil steht nach dem ersten Laden nicht mehr
      in der Adresse; er liegt in einem Cookie mit Präfix __Host-, das nur dieser Ursprung bekommt und kein Skript lesen kann.
    zustand: offen
    frist: 2026-12-31
    bedingung: >-
      Im Download-Dienst gebaut und dort geprüft (Umleitung nur bei gültigem Prüfwert, Cookie-Attribute, gleitende Laufzeit
      mit Rot-Beweis, nur dieser Ursprung, Satz bei verlorenem Zugang, keine Opener-Sperre, der Zufallsteil in keiner Antwort
      außer der ersten Umleitung); aus diesem Repository ist die Probe nicht ausführbar. Erfüllt, sobald die Namen der Hosts
      eingetragen sind, der Dienst ausgeliefert ist und das Öffnen einmal am Telefon gemessen im Auslieferungs-Vermerk steht.
    herkunft: U2-ADR-489 (12.10.2026), Nachtrag 25.10.2026
  - aussage: >-
      Ein Zeitraum steht an der Adresse und nie in der Kennung: die Kennung eines gekauften Produkts ändert sich durch eine
      Verlängerung nicht.
    zustand: offen
    frist: 2026-12-31
    bedingung: Probe an der Liste der Kauf-Adressen und am Produktverzeichnis, sobald ein Zeitraum durchgesetzt wird
    herkunft: U2-ADR-489 (12.10.2026)
```

---

*Vivodepot GmbH · Berlin · 12.10.2026*
