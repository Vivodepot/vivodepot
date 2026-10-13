# U2-ADR-498: Automatische Signatur einer Einreichung — die Signierstelle holt ab, die Annahmestelle hält keinen Schlüssel

**Status:** Angenommen (10.10.2026), nicht gebaut (Nummer wird beim Landen vergeben)
**Datum:** 10.10.2026
**Kategorie:** EINREICHWEG, SICHERHEIT, ARCHITEKTUR
**Linie:** U2
**Bezug:** U2-ADR-483 (Vorprüfung im Studio; schließt die automatische Signatur ausdrücklich aus, diese ADR ist die Nachfolge für
genau diesen Punkt) · U2-ADR-172 (Zwischenstufe, Ausgabe-Schlüssel) · U2-ADR-441 (Zertifikatsweg) · U2-ADR-039 und -040 (die
Institution signiert ihre Vorlage selbst) · U2-ADR-038 und -173 (Ablauf, Widerruf, Notfall-Widerruf) · U2-ADR-009 (der Kern greift
nie auf eine Adresse zu)
**Status heute:** gilt — entschieden, nicht gebaut. Alle Zeilen im `konformitaet`-Block stehen auf `offen`.

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

```yaml
konformitaet:
  - aussage: >-
      Die Annahmestelle hält keinen Signierschlüssel und kann keine Signatur erzeugen; die Signierstelle nimmt keine eingehenden
      Verbindungen an.
    zustand: offen
    frist: 2026-11-30
    bedingung: Bau der Annahmestelle und der Signierstelle, mit einer Probe, die in der Annahmestelle keinen Signierweg findet
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Signiert wird nur bei dem Urteil „bestanden“, das die Signierstelle selbst gefällt hat; jedes andere Urteil, eine Art ohne
      Regelsatz und eine werfende oder fehlende Prüfung führen zu keiner Signatur.
    zustand: offen
    frist: 2026-11-30
    bedingung: Bau der Signierstelle, mit Rot-Beweis je Urteil und für ein mitgebrachtes „bestanden“
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Die Signatur der Signierstelle steht über einem Prüfvermerk, der den Fingerabdruck der von der Herausgeberin signierten
      Bytes trägt. Für eine Einreichung mit einem geänderten Zeichen und für andere Bytes gilt sie nicht. Der Schlüssel der
      Signierstelle zeichnet nichts außer Prüfvermerken.
    zustand: offen
    frist: 2026-11-30
    bedingung: Bau der Signierstelle, mit Rot-Beweis für ein geändertes Zeichen, für eine Signatur über andere Bytes und für Bytes, die kein Prüfvermerk sind
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Ohne Freischaltung an der Signierstelle, mit abgelaufenem oder widerrufenem Zertifikat oder mit einer Einreichung, die nicht
      mit dem Schlüssel aus dem Zertifikat signiert ist, entsteht keine Signatur; ebenso wenig mit einer fehlenden, unlesbaren
      oder zurückgedrehten Sperrliste, mit einer Sperrliste ohne Erzeugungszeitpunkt oder mit einem Erzeugungszeitpunkt in der
      Zukunft. Ein Eintrag in der Ablage der Annahmestelle ersetzt weder die Freischaltung noch die Sperrliste.
    zustand: offen
    frist: 2026-11-30
    bedingung: Bau der Signierstelle samt Sperrliste, mit Rot-Beweis je Fall; das Höchstalter der Sperrliste ist festgelegt, mit Herleitung, und geprüft
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Über der festgelegten Zahl je Herausgeberin und Zeitraum hält die Signierstelle an und signiert nicht weiter.
    zustand: offen
    frist: 2026-11-30
    bedingung: Bau der Signierstelle
    herkunft: U2-ADR-498 (10.10.2026)
  - aussage: >-
      Jede Signatur und jede Ablehnung steht im Protokoll; eine geänderte Zeile, eine entfernte Zeile und ein am Ende
      abgeschnittenes Protokoll fallen auf, das abgeschnittene am Fingerabdruck der jüngsten Zeile, den die Signierstelle mit
      jedem Ergebnis herausgibt.
    zustand: offen
    frist: 2026-11-30
    bedingung: Bau der Signierstelle, mit Rot-Beweis für drei Fälle (geändert, entfernt, am Ende abgeschnitten)
    herkunft: U2-ADR-498 (10.10.2026)
```

---

*Vivodepot GmbH · Berlin · 10.10.2026*
