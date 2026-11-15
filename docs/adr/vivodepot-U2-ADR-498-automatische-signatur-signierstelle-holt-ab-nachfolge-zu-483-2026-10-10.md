# U2-ADR-498: Automatische Signatur einer Einreichung — die Signierstelle holt ab, die Annahmestelle hält keinen Schlüssel

**Status:** Angenommen (10.10.2026), nicht gebaut (Nummer wird beim Landen vergeben)
**Datum:** 10.10.2026
**Kategorie:** EINREICHWEG, SICHERHEIT, ARCHITEKTUR
**Linie:** U2
**Bezug:** U2-ADR-483 (Vorprüfung im Studio; schließt die automatische Signatur ausdrücklich aus, diese ADR ist die Nachfolge für
genau diesen Punkt) · U2-ADR-172 (Zwischenstufe, Ausgabe-Schlüssel) · U2-ADR-441 (Zertifikatsweg) · U2-ADR-039 und -040 (die
Institution signiert ihre Vorlage selbst) · U2-ADR-038 und -173 (Ablauf, Widerruf, Notfall-Widerruf) · U2-ADR-009 (der Kern greift
nie auf eine Adresse zu)
**Status heute:** gilt. Die Signierstelle ist als Prozess gebaut (Nachtrag 11.11.2026); offen ist nur noch die Klausel zur Annahmestelle.

## Frage

Eine Einrichtung baut im Studio eine Vorlage, signiert sie mit ihrem eigenen Schlüssel und reicht sie ein. Damit die Bürger-App
zeigt, von wem die Vorlage stammt, braucht die Einrichtung ein Zertifikat von Vivodepot. Es entsteht heute von Hand, je Anfrage
neu. Eine Signatur von Vivodepot über die einzelne Fassung einer Vorlage gibt es heute nicht.

Das Zertifikat soll ohne diese Handarbeit entstehen, und jede eingereichte Fassung soll nach bestandener Prüfung eine Signatur
von Vivodepot erhalten. Dafür muss eine Stelle am Netz Einreichungen annehmen, und eine Stelle muss mit einem
Schlüssel von Vivodepot signieren. Die Frage ist, wie beide zusammenarbeiten, ohne dass der Schlüssel in die Nähe des Netzes kommt und
ohne dass etwas signiert wird, das die Bürger-App abweisen würde.

## Entscheidung

1. **Zwei Stellen, eine Richtung.** Die **Annahmestelle** steht am Netz. Sie nimmt Einreichungen entgegen und legt sie ab. Sie hält
   keinen Signierschlüssel und kann nichts signieren. Die **Signierstelle** hält ihren Signierschlüssel. Sie nimmt keine
   eingehenden Verbindungen an: Sie holt die abgelegten Einreichungen selbst ab und legt das Ergebnis zurück.
2. **Der Schlüssel bleibt in der abgeschotteten Stelle.** Der Schlüssel der Signierstelle steht nie in der Annahmestelle, in einer
   Datenbank oder in einem Repository. Er ist nicht exportierbar. Wo die Signierstelle läuft, ist eine eigene Entscheidung über die
   Verwahrung im Dauerbetrieb; das Abholen ist so gebaut, dass es jeden dieser Orte trägt.
   Der Schlüssel der Signierstelle ist ein eigener Schlüssel mit eigenem Zertifikat unter dem Anker. Er ist nicht der
   Ausgabe-Schlüssel, der Zertifikate für Einrichtungen ausstellt (U2-ADR-172), und er zeichnet nichts außer Prüfvermerken.
3. **Die Signierstelle urteilt selbst.** Sie fährt die Prüfung nach den veröffentlichten Prüfregeln an der abgeholten
   Einreichung. Ein Urteil, das die Annahmestelle, das Studio oder die Einreichung mitbringt, zählt nicht. Die Annahmestelle darf
   eine Einreichung vorab ablehnen; ein „bestanden“ kann sie nicht aussprechen.
4. **Signiert wird nur bei „bestanden“.** Bei „gemeldet“, „abgewiesen“, bei einer Art ohne Regelsatz (U2-ADR-483 Nr. 4) und bei
   jeder Prüfung, die wirft, fehlt oder etwas Unerwartetes liefert, entsteht keine Signatur. Diese Fälle gehen an einen Menschen
   oder zurück an die Einrichtung, mit Grund und Fundstelle.
5. **Gebunden an die Einreichung.** Die Signatur der Signierstelle steht über einem Prüfvermerk aus festen Zeilen. Er nennt die
   Signierstelle, die Herausgeberin, ihren Schlüssel, den Fingerabdruck des von ihr signierten Inhalts, die Fassung der
   Prüfregeln, die Fassung des Kerns und das Ausstelldatum. Der Fingerabdruck geht über genau die Bytes, die die Herausgeberin
   signiert hat. Ändert sich ein Zeichen des Inhalts, gilt der Vermerk nicht mehr. Ob und wie die Bürger-App den Vermerk beim
   Einlass nachrechnet und anzeigt, ist eine eigene Entscheidung und steht nicht in dieser ADR.
6. **Identität vor Signatur.** Die Signierstelle signiert nur für eine Herausgeberin, die freigeschaltet ist, deren Zertifikat
   gilt und nicht widerrufen ist und deren Einreichung mit dem Schlüssel aus diesem Zertifikat signiert ist. Die Freischaltung
   liegt bei der Signierstelle, nicht in der Ablage der Annahmestelle: Ein Eintrag dort macht niemanden zur Herausgeberin. Wie die
   Identität bestätigt wird, ist ein tauschbarer Schritt vor der Freischaltung und nicht Teil dieser Entscheidung.
7. **Widerruf und Sperrliste vom ersten Tag an.** Vor jeder Signatur liest die Signierstelle die Sperrliste. Ein widerrufenes
   Zertifikat erhält keine weitere Signatur. Die Sperrliste liegt an der Signierstelle oder ist signiert und trägt einen
   fortlaufenden Stand; die Ablage der Annahmestelle ist nicht ihre Quelle. Eine fehlende, unlesbare oder gegenüber dem zuletzt
   gesehenen Stand ältere Sperrliste führt zu keiner Signatur. Die Sperrliste trägt den Zeitpunkt ihrer Erzeugung; fehlt er
   oder liegt er in der Zukunft, entsteht keine Signatur. Ein Höchstalter der Liste ist vorgesehen; sein Wert ist offen, bis
   feststeht, wie oft die Liste erzeugt wird, und wird mit dem Bau der Signierstelle festgelegt. Wann ein Widerruf in der
   Bürger-App wirkt, regeln U2-ADR-038 und -173 unverändert.
8. **Begrenzung je Herausgeberin.** Die Signierstelle signiert je Herausgeberin und Zeitraum höchstens eine festgelegte Zahl von
   Einreichungen. Darüber hält sie an und meldet es; sie signiert nicht weiter, bis ein Mensch es freigibt. Die Werte stehen in der
   Konfiguration der Signierstelle. Gezählt wird, was die Herausgeberin einreicht. Prüft die Signierstelle eine schon gezeichnete
   Einreichung von sich aus erneut, weil sich die Prüfregeln oder der Kern geändert haben, zählt das nicht gegen die Zahl der
   Herausgeberin. Das Protokoll nennt bei jeder Zeile den Anlass: eingereicht oder von der Signierstelle nachgeprüft.
9. **Ein Protokoll je Signatur.** Jede Signatur und jede Ablehnung hinterlässt eine Zeile: Zeitpunkt, Herausgeberin,
   Inhalts-Fingerabdruck, Fassung der Prüfregeln, Fassung des Kerns, Urteil, Anlass. Das Protokoll wird nur fortgeschrieben; jede Zeile
   trägt den Fingerabdruck der vorigen. Den Fingerabdruck der jüngsten Zeile gibt die Signierstelle mit jedem zurückgelegten
   Ergebnis heraus. So fällt eine geänderte Zeile auf, eine mitten heraus entfernte und ein am Ende abgeschnittenes Protokoll.
10. **Was „geprüft“ heißt.** Die Signatur bestätigt die Herkunft und dass die Einreichung die veröffentlichten Prüfregeln
    bestanden hat. Sie sagt nichts über den Inhalt und seine Richtigkeit. Zertifikat und Prüfbericht verwenden das Wort nur in
    diesem Umfang.
11. **Die Annahmestelle meldet nur, was sie weiß.** Bis das Ergebnis der Signierstelle vorliegt, heißt der Stand „eingegangen“,
    nie „geprüft“ oder „signiert“.

## Verworfen

- **Der Schlüssel in der Annahmestelle.** Wer die Annahmestelle übernimmt, könnte dann im Namen von Vivodepot signieren, und kein
  Widerruf holte die bis dahin signierten Vorlagen aus den ausgelieferten Fassungen zurück.
- **Eine Signierstelle, die Aufträge entgegennimmt.** Ein offener Eingang an der Stelle mit dem Schlüssel wäre der Angriffspunkt,
  den das Abholen vermeidet.
- **Signieren auf das Urteil des Studios hin.** Das Studio läuft bei der Einrichtung. Sein Urteil ist eine Vorhersage
  (U2-ADR-483, Abgrenzung), kein Beleg.

## Abgrenzung

- U2-ADR-483 gilt weiter. Aufgehoben ist allein der Satz, die automatische Signatur sei nicht Teil der Entscheidung.
- Arten, für die es keinen Regelsatz gibt, werden nicht automatisch signiert.
- Vertrag, Entgelt und Bezahlweg stehen nicht in einer ADR.
- Der Weg, auf dem die signierte Vorlage zur Einrichtung und in die Bürger-App zurückkommt, ist eine eigene Entscheidung. Der
  Kern greift weiter auf keine Adresse zu (U2-ADR-009).
- Der Bau am Signaturweg beginnt erst, wenn der Befund MITSCHRIFT-AB-WERK-NACH-POSITION in der Befund-Ratsche geschlossen ist.
  Die Inbetriebnahme ist eine eigene Entscheidung und setzt die Entscheidung voraus, ob und wie die Bürger-App die Signatur der
  Signierstelle auswertet.

## Folgen

- Eine Einreichung wird nicht in dem Augenblick signiert, in dem sie eingeht, sondern beim nächsten Abholen. Läuft die
  Signierstelle nicht, sammelt die Annahmestelle; verloren geht nichts.
- Ändern sich die Prüfregeln oder die Einlass-Regeln des Kerns, urteilt die Signierstelle nach der neuen Fassung. Das Protokoll
  hält fest, nach welcher Fassung eine Signatur entstand.
- Der Signaturweg geht in die externe Prüfung der Kryptographie ein.

## Nachtrag 09.11.2026: Paket und Antragsdatei

Die Signierstelle liest zwei Stücke. Das Paket `vivodepot-herausgeber-antrag/2` legt die Annahmestelle ab; daraus nimmt die Signierstelle nur Kennung und Fingerabdruck der Nutzlast. Die Antragsdatei `vivodepot-herausgeber-antragsdatei/1` liegt unverändert daneben und trägt Art, Schlüssel und Angaben. Eine Einreichung zum Signieren hat dort `art: vorlage`.

Den Fingerabdruck der Angaben rechnet die Signierstelle nach derselben Regel wie der Besitznachweis. Die Anschrift gehört dazu; eine geänderte Anschrift braucht eine neue Freischaltung.

Die Entscheidung kann nicht prüfen, ob das geparste Objekt aus den Bytes stammt, deren Fingerabdruck sie vergleicht. Das schuldet der zeichnende Prozess: Er parst die Antragsdatei nur aus diesen Bytes. Abnahme beim Bau der Signierstelle als Prozess: eine Probe mit Rot-Beweis für ein getauschtes Objekt. Eigentümer: Krypto.

Weg zum Nachsehen: `git grep -l "vivodepot-herausgeber-antragsdatei/1" -- docs`, dort die beiden Schemata des Antrags.

## Nachtrag 10.11.2026: Höchstalter der Sperrliste

Das Höchstalter der Sperrliste beträgt 24 Stunden. Genau an der Grenze wird noch gezeichnet, eine Millisekunde darüber nicht. Für den Weg von der Sperrung zur Signierstelle gibt es noch keinen messbaren Takt, die 24 Stunden sind darum die obere Schranke: Legt der Bau des Prozesses einen Takt fest, wird das Höchstalter höchstens das Doppelte davon und bleibt höchstens 24 Stunden.

Jeder Lauf des Erzeugers erhöht den Stand um eins und erneuert den Zeitpunkt, auch ohne neuen Eintrag. Einträge kommen nur hinzu; ein Entsperren gibt es nicht. Wer nach einem Widerruf weitermachen will, bekommt einen neuen Schlüssel und ein neues Zertifikat. Jede Sperrung steht als eigene Zeile im Protokoll der Signierstelle.

Ohne den Takt läuft die Liste nach 24 Stunden ab, und es wird nicht gezeichnet. Das ist gewollt. Der Takt und das Festhalten des zuletzt gesehenen Stands gehören zum Bau der Signierstelle als Prozess; die Klausel zur Sperrliste bleibt bis dahin offen.

## Nachtrag 10.11.2026: Freischaltung

Vor einem Eintrag rechnet die Signierstelle den Besitznachweis der Antragsdatei nach; Schlüssel und Angaben kommen aus diesem Nachweis. Das Konto stammt aus der Identitätsbestätigung und nicht aus der Antragsdatei, denn dort ist es Selbstauskunft.

Ein Eintrag wird nicht ersetzt. Ändern sich die Angaben, gibt es eine neue Antragsdatei mit einem neuen Schlüsselpaar, und der alte Schlüssel kommt auf die Sperrliste.

Jeder Eintrag hat im Protokoll eine Zeile, die den ganzen Eintrag über einen Fingerabdruck bindet, auch Konto und Ablaufdatum. Ein Eintrag ohne passende Zeile fällt auf. Eine Zeile ohne Eintrag ist erlaubt, sie bleibt von einem abgebrochenen Lauf.

Die Klausel zur Freischaltung und Sperrliste bleibt offen, bis die Signierstelle als Prozess steht.

## Nachtrag 10.11.2026: Bytes des Prüfvermerks

Die Signierstelle zeichnet einen Prüfvermerk mit der Kennung `vivodepot-signierstelle-pruefvermerk/1`. Er besteht aus acht Zeilen in UTF-8, getrennt durch je ein LF, ohne LF nach der letzten Zeile und ohne BOM: Kennung des Formats, Kennung der Signierstelle, Kennung der Herausgeberin, Fingerabdruck ihres Schlüssels nach RFC 7638, Abdruck ihrer Vorlage, Fassung der Prüfregeln, Fassung des Kerns, Ausstelldatum in UTC.

Der Abdruck in Zeile 5 ist SHA-256 über die ASCII-Bytes `Kopf.Nutzlast` der kompakten JWS, ohne den dritten Teil. Eine ECDSA-Signatur lässt sich ohne Schlüssel in eine zweite gültige umformen; über die ganze JWS gerechnet fiele der Vermerk dann, obwohl sich der Inhalt nicht geändert hat. Die Entscheidung vergleicht darum zwei Dinge getrennt: die abgeholten Bytes mit dem Fingerabdruck des Antrags und den Abdruck der Vorlage mit dem, was der Prüfprozess als geprüft nennt.

Der Vermerk ist keine JWS. Eine JWS deckt `base64url(Kopf).base64url(Nutzlast)`, dieses Alphabet kennt weder LF noch Schrägstrich, und Zeile 1 enthält einen Schrägstrich. Ein Vermerk kann darum nie als Zertifikat oder Modul-Signatur gelten und umgekehrt. Ein eigener `typ` in einer JWS leistete das nicht, denn die Prüfung einer JWS liest `typ` nicht. Das Format ist darum eine eigene Zeilenform; seine Bausteine sind Standards: SHA-256, RFC 7638, Ed25519 nach RFC 8032 und ES256.

Eine Kennung hat in Vermerk, Protokoll und Freischaltliste dieselbe Form: `institution/name-de`, höchstens 1221 Zeichen aus Buchstaben ohne Umlaut, Ziffern, Punkt, Unterstrich, Bindestrich und Schrägstrich. Die Länge folgt aus der Ableitung aus dem Namen der Einrichtung, damit eine Einrichtung mit langem Namen dieselbe Prüfung bekommt wie jede andere. Jeder Abschnitt zwischen zwei Schrägstrichen beginnt mit einem Buchstaben oder einer Ziffer, damit aus einer Kennung nie eine Pfadangabe oder ein Schalter wird.

Regel „Ausgabe: anwendbarer Standard und PDF“: nicht berührt. Der Vermerk geht an den eigenen Kern, nicht an eine Stelle draußen, und er trägt keine Angaben einer Person.

Die Klausel, dass der Schlüssel der Signierstelle nichts außer Prüfvermerken zeichnet, bleibt offen, bis die Signierstelle als Prozess steht und nur über den Wächter an den Schlüssel kommt.

## Nachtrag 10.11.2026: Schlüssel und Zertifikat der Signierstelle

Die Signierstelle hat einen eigenen P-256-Schlüssel in der Secure Enclave des Signierrechners. Er ist nicht exportierbar, heißt immer `signierstelle-…` und trägt keine Biometrie. Die Enclave hält nur P-256, der Prüfvermerk ist darum ES256.

Der Helfer hat dafür zwei eigene Befehle. Sie nehmen keine andere Kennung, und die Befehle für Ausgabe-Schlüssel nehmen diese nicht. Der Helfer prüft die Form des Vermerks, bevor er den Schlüssel anfasst: acht Zeilen, die erste ist die Kennung des Formats, höchstens 4096 Byte. Vertraut wird diesem Schlüssel nur für Vermerke: Sein Zertifikat hat eine eigene Art, und diese Art wird nicht als Aussteller angenommen.

Das Zertifikat hat die Art `vivodepot/signierstelle` und die Kennung `vivodepot-signierstelle`, steht direkt unter dem Anker und läuft zwölf Monate. Der Ausgabe-Schlüssel stellt diese Art nicht aus, und als Aussteller-Stufe wird sie nicht angenommen.

Der Schlüssel gilt nur bei entsperrtem Rechner (`WhenUnlockedThisDeviceOnly`). Bei gesperrtem Bildschirm wird nicht gezeichnet.

Grenze: Ein Schlüssel ohne Anwesenheit zeichnet für jeden Prozess, der den Helfer unter diesem Benutzer aufrufen kann. Die Enclave schützt davor, dass der Schlüssel den Rechner verlässt, nicht davor, dass eine Schadsoftware auf dem Rechner mit ihm zeichnen lässt. Die Formprüfung gilt nur für Aufrufe über den Helfer. Ob ein anderes Programm den Verweis aus dem Schlüsselbund lesen und damit beliebige Bytes zeichnen kann, ist am Gerät nicht gemessen. Dagegen stehen die Art im Zertifikat, Obergrenze und Protokoll der Signierstelle und die Laufzeit von zwölf Monaten. Sofort widerrufen lässt sich ein Vermerk nach U2-ADR-038 nicht.

Proben starten nur einen eigenen Bau des Helfers (`-D VD_PROBE`). Er enthält keinen Code für Schlüsselbund, Secure Enclave oder Biometrie, und vor dem Start werden seine offenen Symbole geprüft. Der Auslieferungsbau wird in Proben höchstens gemessen, nie gestartet.

## Nachtrag 11.11.2026: Die Signierstelle als Prozess

Ein Lauf der Signierstelle ist eine reine Abfolge ohne Dateizugriff; eine Hülle liest und schreibt die Dateien, ein Durchlauf
je Aufruf, ohne Port. Prüfer und Signierer setzt nur die Kommandozeile ein. Je Einreichung: erst Paket, dann Datei lesen; den
Fingerabdruck über genau diese Bytes rechnen und die Antragsdatei nur aus ihnen parsen; das Urteil allein mit den Regeln aus
`docs/pruefregeln/pruefregeln.json` und den Prüfern des Kerns fällen; Freischalt- und Sperrliste lesen und den höchsten Stand der
Sperrliste festhalten, bevor entschieden wird; `entscheiden`; erst die Protokollzeile, dann zeichnen, dann das Ergebnis mit dem
Kopf des Protokolls zurücklegen. Wirft ein Schritt, wird nicht gezeichnet.

**Anlass.** Signatur- und Ablehnungszeilen nennen, ob sie auf eine Einreichung (`eingereicht`) oder eine Nachprüfung
(`nachgeprueft`) folgen. Dieselbe Einreichung erzeugt keine zweite Zeile derselben Art; fehlt nach einem Abbruch das Ergebnis,
wird ohne zweite Zeile neu gezeichnet. Eine Nachprüfung bekommt immer eine eigene Zeile.

**Obergrenze.** Die Zahlen stehen einmal, in einer Datei neben dem Lauf: höchstens fünf Signaturen je Herausgeberin
und zwanzig insgesamt je UTC-Tag. Gezählt wird aus dem Protokoll, nur Signaturen mit Anlass `eingereicht`; einen zweiten Zähler
gibt es nicht. Über fünf hält nur diese Herausgeberin an, über zwanzig der ganze Lauf. Anhalten ist kein Ablehnen: Es entsteht
weder Zeile noch Ergebnis. Weiter geht es erst nach einer Zeile `freigabe`, geschrieben mit einem eigenen Befehl; sie setzt die
Zählung des Tages ab ihrer Zeile neu an.

**Takt.** Die Sperrliste wird alle zwölf Stunden erzeugt, das Höchstalter bleibt 24 Stunden, abgeholt wird stündlich. Eingerichtet
wird der Takt auf dem Signierrechner, nicht im Repo.

**Signatur der Herausgeberin.** Ein Vorlagen-Antrag trägt keinen öffentlichen Schlüssel. Die Freischaltliste führt darum je
Eintrag den öffentlichen Schlüssel (`jwk`, nur `kty`, `crv`, `x`, sein RFC-7638-Fingerabdruck ist der des Eintrags), übernommen
aus dem Zertifikats-Antrag. Mit ihm, und nur mit ihm, prüft die Signierstelle den Besitznachweis der Vorlage (siebte Zeile: SHA-256
über die Zeichen der `vorlageJws`) und die `vorlageJws` selbst. Ein Kopf mit `jwk`, `jku`, `x5c` oder `x5u` oder mit einer
`kid`, die nicht der Fingerabdruck ist, wird abgewiesen.

```yaml
konformitaet:
  - aussage: >-
      Die Annahmestelle hält keinen Signierschlüssel und kann keine Signatur erzeugen.
    zustand: offen
    frist: 2026-11-30
    bedingung: Adapter der Ablage in der Annahmestelle, mit einer Probe, die in der Annahmestelle keinen Signierweg findet
    herkunft: U2-ADR-498 (10.10.2026), geteilt 11.11.2026
  - aussage: >-
      Die Signierstelle nimmt keine eingehenden Verbindungen an.
    zustand: prüfbar
    pruefung:
      - tests/signierstelle-prozess.test.js "kein Port, kein Netz, kein Schlüsselmaterial"
    herkunft: U2-ADR-498 (10.10.2026), geteilt 11.11.2026
  - aussage: >-
      Signiert wird nur bei dem Urteil „bestanden“, das die Signierstelle selbst gefällt hat; jedes andere Urteil, eine Art ohne
      Regelsatz und eine werfende oder fehlende Prüfung führen zu keiner Signatur.
    zustand: prüfbar
    pruefung:
      - tests/signierstelle-prozess.test.js "Abgleich: gezeichnet wird nur auf das eigene"
      - tests/signierstelle-entscheidung.test.js "ein mitgebrachtes „bestanden“ oder „freigeschaltet“"
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Die Signatur der Signierstelle steht über einem Prüfvermerk, der den Fingerabdruck der von der Herausgeberin signierten
      Bytes trägt. Für eine Einreichung mit einem geänderten Zeichen und für andere Bytes gilt sie nicht. Der Schlüssel der
      Signierstelle zeichnet nichts außer Prüfvermerken.
    zustand: prüfbar
    pruefung:
      - tests/signierstelle-prozess.test.js "die Bytes binden"
      - tests/signierstelle-prozess.test.js "der Signierer wird nur über"
      - tests/pruefvermerk.test.js "andere Bytes, falsche Länge und fremder Schlüssel"
      - tests/pruefvermerk.test.js "der Signierer sieht nur Vermerke"
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Ohne Freischaltung an der Signierstelle, mit abgelaufenem oder widerrufenem Zertifikat oder mit einer Einreichung, die nicht
      mit dem Schlüssel aus dem Zertifikat signiert ist, entsteht keine Signatur; ebenso wenig mit einer fehlenden, unlesbaren
      oder zurückgedrehten Sperrliste, mit einer Sperrliste ohne Erzeugungszeitpunkt oder mit einem Erzeugungszeitpunkt in der
      Zukunft. Ein Eintrag in der Ablage der Annahmestelle ersetzt weder die Freischaltung noch die Sperrliste.
    zustand: prüfbar
    pruefung:
      - tests/signierstelle-prozess.test.js "Freischaltung und Sperrliste: nur aus der Liste"
      - tests/signierstelle-entscheidung.test.js "jede einzelne Abweichung vom guten Fall"
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Über der festgelegten Zahl je Herausgeberin und Zeitraum hält die Signierstelle an und signiert nicht weiter.
    zustand: prüfbar
    pruefung:
      - tests/signierstelle-prozess.test.js "Obergrenze je Herausgeberin"
      - tests/signierstelle-prozess.test.js "Obergrenze gesamt"
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Jede Signatur und jede Ablehnung steht im Protokoll; eine geänderte Zeile, eine entfernte Zeile und ein am Ende
      abgeschnittenes Protokoll fallen auf, das abgeschnittene am Fingerabdruck der jüngsten Zeile, den die Signierstelle mit
      jedem Ergebnis herausgibt.
    zustand: prüfbar
    pruefung:
      - tests/signaturprotokoll.test.js "eine geänderte Zeile fällt auf"
      - tests/signaturprotokoll.test.js "eine mitten heraus entfernte Zeile"
      - tests/signaturprotokoll.test.js "ein am Ende abgeschnittenes Protokoll"
      - tests/signierstelle-prozess.test.js "der gute Fall: Zeile, Vermerk"
    herkunft: U2-ADR-498 (10.10.2026)
```

---

*Vivodepot GmbH · Berlin · 10.10.2026*
