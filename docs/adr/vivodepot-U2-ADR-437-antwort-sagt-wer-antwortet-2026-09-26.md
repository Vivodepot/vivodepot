# U2-ADR-437: Die Antwort auf eine Anfrage sagt, wer antwortet — als Angabe der Person, im verschlüsselten Datensatz

**Status:** Angenommen (26.09.2026)
**Datum:** 26.09.2026
**Kategorie:** DATENFORMAT, LESE-APP
**Grundlage:** Das Durchklicken der Klinikaufnahme-Demo (U2-ADR-413, Nachtrag 26.09.2026 (2)). Die Klinik sah, WORAUF geantwortet
wurde, aber nicht, VON WEM: ob die Patientin selbst schrieb, die Tochter aus dem Teil, den sie von ihrer Mutter bekam, oder jemand
unter Vollmacht im Sub-Depot. Für einen Sozialdienst, der klären muss, wer vertreten darf, ist das die erste Frage.
- **Code-Stelle:** `vivodepot.html` — `anfrageAbsender`, `_absenderKreisPerson`, `anfrageAntwortDatensatz` (setzt `absender`),
  `empfaengerZuschnittModell` (`empfaengerAusschnitt.kreisName`); `vivodepot-lesen.html` — `antwortAnzeigeModell` (`absender`),
  `antwortAbsenderSatz`, `renderAntwort` (Überschrift `#antwort-absender`).
- **Geltungsbereich:** der Datensatz der Antwort auf eine Anfrage (Kette, Auftrag 8) und seine Anzeige in der Lese-App.
- **Status heute:** gilt — der Bau steht, die Proben unten laufen.

---

## Kontext

Der Datensatz der Antwort trägt `felder`, `fehlend`, `unbekannt`, `anfrage` (die Stelle, der Zweck, die Grundlage, der Vorgang),
`zurueckgehalten` und `vollstaendig`. Er wird als Ganzes verschlüsselt (`antwortVerschluesseln`); im Klartext des Umschlags stehen
nur Dateityp, Verfahren, Vorgang, Anbieter und Zeitpunkt, und die AAD bindet Verfahren, Vorgang und Anbieter.

Die Lese-App schrieb über die Antwort „Antwort auf Ihre Anfrage“ und darunter „Von: <Stelle>“. Das las sich, als hätte die
anfragende Stelle die Antwort geschickt. Wer tatsächlich antwortete, stand nirgends.

## Entscheidung

1. **Ein neues Feld `absender = { name, rolle, fuer }` im Datensatz**, gesetzt von `anfrageAntwortDatensatz`. Es steht IM
   verschlüsselten Datensatz, nicht im Klartext des Umschlags und nicht in der AAD: es ist Inhalt, kein Adressierungsmerkmal. Ein
   Name gehört nicht in den Klartext einer Datei, die per E-Mail reist.
2. **Drei Fälle, eine Regel für die Rolle: sie folgt der Rechtsgrundlage, nicht dem technischen Behälter.**
   - *Eigenes Depot:* die Inhaberin (`_inhaberPersonIdFinden`, sonst der Name aus der Identität), `rolle: 'selbst'`, kein `fuer`.
   - *Sub-Depot unter Vollmacht:* die handelnde Person des Ankers, `rolle: 'bevollmaechtigt'`, `fuer` = die Vertretene
     (`aktiverSubName`).
   - *Empfangener Teil:* die Person, der der Teil gehört — wenn der Kreisname GENAU EINE Person des Teils nennt (voller Name oder
     Vorname als Wort). `rolle: 'bevollmaechtigt'`, wenn eine Vorsorgevollmacht im Teil genau diese Person als bevollmächtigt
     nennt; sonst `'teil'`. Nennt der Kreisname keine oder mehrere Personen, steht der Kreisname selbst da, `rolle: 'kreis'`.
     `fuer` ist die Inhaberin des Depots, aus dem der Teil stammt. Dafür trägt der Teil ab jetzt `empfaengerAusschnitt.kreisName`.
3. **Eine Bankvollmacht macht niemanden zur Vertretung, eine Betreuungsverfügung auch nicht.** Die Bankvollmacht gilt gegenüber
   der Bank; die Betreuungsverfügung schlägt eine Person vor, vertreten darf die erst nach der Bestellung durch das Gericht. Wer
   im Teil nur als vorgeschlagene Betreuerin steht, antwortet darum als `'teil'`.
4. **Der Absender ist eine Angabe der Person, nicht geprüft.** Die Lese-App kennzeichnet ihn genauso wie jede andere Angabe der
   Antwort (Herkunftsanzeige: „von der Person angegeben“). „Geprüft“ steht nur bei `absender.herkunft.verifiziert === true` — den
   schreibt der Kern heute nicht; er ist der Platz für einen späteren geprüften Nachweis der Vertretung.
5. **Die Lese-App macht daraus die Überschrift:** „Antwort von {name} ({Rolle}) auf die Anfrage von {Stelle}“. „für {fuer}“ steht
   nur, wenn die Zeile darunter („Angaben zu …“) die Vertretene nicht ohnehin nennt. Im Fall `'kreis'`: „Antwort aus dem Teil
   „{name}“ des Depots von {fuer} …“. Eine unbekannte Rolle wird weggelassen, nicht übersetzt. „Von: <Stelle>“ entfällt; der
   Vorgang steht darunter.
6. **Ohne das Feld bleibt jede Antwort lesbar.** Eine Antwort von vor v807 (oder aus einer Fassung, die das Feld wegläßt) zeigt
   „Antwort auf die Anfrage von {Stelle}“ und „Absender nicht angegeben“; alles andere steht wie zuvor. Das Feld ist additiv, der
   Umschlag, seine Version und die AAD bleiben unverändert — eine ältere Lese-App liest die neue Datei und übergeht das Feld.

## FHIR und U2-ADR-079

Die Antwort auf eine Anfrage wird nicht als FHIR ausgegeben; sie ist eine verschlüsselte Datei für die Lese-App und für den
Datensatz-Export der Stelle. Der delegierte IPS-Export (U2-ADR-079: `RelatedPerson` und `Provenance` für die handelnde Person)
ist davon nicht berührt: an `Provenance` ändert sich nichts. Soll die Antwort später als FHIR gehen, ist `absender` die Quelle für
`Provenance.agent` — mit `rolle` als Grundlage des `agent.type`, und ungeprüft, solange `verifiziert` fehlt.

## Folgen

- Die Klinik-Demo zeigt am Ende „Antwort von Anna Mustermann (bevollmächtigt) auf die Anfrage von Klinik, Notaufnahme“:
  Anna antwortet aus dem Teil, den ihre Mutter ihr gab, und die Vollmacht im Teil nennt sie.
- Der Kreisname geht mit dem Teil zum Empfänger. Er ist die Bezeichnung, die die Inhaberin für genau diesen Empfänger gewählt hat;
  der Empfänger hält den Teil ohnehin.
- Die Zuordnung Kreis → Person ist eine Namensprobe, keine Verknüpfung. Ein Kreis mit einer eigenen Personen-Referenz wäre
  genauer; bis dahin sagt die Rückfall-Stufe (`'kreis'`) ehrlich, dass keine Person feststeht.

```konformitaet
aussage:  Die Antwort trägt den Absender im verschlüsselten Datensatz — eigenes Depot selbst, Sub-Depot und Teil mit Vollmacht
          bevollmächtigt für die Vertretene —, nicht im Klartext des Umschlags, und er kommt beim Empfänger an.
zustand:  geprüft
herkunft: invariante
pruefung: tests/anfrage-antwort-absender.test.js#[Absender] eigenes Depot: die Inhaberin, rolle selbst
pruefung: tests/anfrage-antwort-absender.test.js#[Absender] empfangener Teil mit Vollmacht für die Person des Kreises: bevollmächtigt für die Inhaberin
pruefung: tests/anfrage-antwort-absender.test.js#[Absender] Sub-Depot unter Vollmacht: die handelnde Person des Ankers, für die Vertretene
pruefung: tests/anfrage-antwort-absender.test.js#[Absender] steht im verschlüsselten Datensatz, nicht im Klartext des Umschlags, und kommt beim Empfänger an
```

```konformitaet
aussage:  Die Rolle im Teil folgt der Rechtsgrundlage: bevollmächtigt nur, wenn eine Vorsorgevollmacht im Teil genau die Person des
          Kreises nennt; eine Bankvollmacht zählt nicht; ohne eindeutige Person steht der Kreisname.
zustand:  geprüft
herkunft: invariante
pruefung: tests/anfrage-antwort-absender.test.js#[Absender · Rot-Beweis] die Vollmacht nennt Anna, der Teil gehört Paul: Paul ist NICHT bevollmächtigt
pruefung: tests/anfrage-antwort-absender.test.js#[Absender · Rot-Beweis] eine Bankvollmacht macht im Teil niemanden zur Vertretung
pruefung: tests/anfrage-antwort-absender.test.js#[Absender] nennt der Kreisname keine oder mehrere Personen, steht der Kreisname da, rolle kreis
```

```konformitaet
aussage:  Die Lese-App sagt in der Überschrift, wer antwortet, in welcher Rolle und auf wessen Anfrage, gekennzeichnet als Angabe
          der Person; eine Antwort ohne das Feld bleibt lesbar und sagt, dass der Absender nicht angegeben ist; beide Sprachen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/anfrage-antwort-absender.test.js#[Lese-App · Absender] „Antwort von Anna Mustermann (bevollmächtigt) auf die Anfrage von …", als Angabe der Person
pruefung: tests/anfrage-antwort-absender.test.js#[Lese-App · Absender · Verträglichkeit] eine Antwort ohne das Feld (vor v807) bleibt lesbar und sagt, dass der Absender fehlt
pruefung: tests/anfrage-antwort-absender.test.js#[Lese-App · Absender · Rot-Beweis] unbekannte Rolle wird weggelassen, nicht übersetzt; geprüft nur mit verifiziert: true
pruefung: tests/anfrage-antwort-absender.test.js#[Lese-App · Absender] Deutsch und Englisch tragen jeden Schlüssel
```

Dass die Klinik-Demo den Absender zeigt, bindet U2-ADR-413 Nachtrag (4): Die Demo und ihre Proben gehören zum Demo-Werkzeug,
das bis zur Einrichtungsseite nicht veröffentlicht wird.

## Nachtrag 26.09.2026 — Klartext beim Empfänger und beim Freigeben (aus drei Kalt-Lesetests)

Die Klinikaufnahme-Demo wurde dreimal von einem Leser ohne Vorkontext gelesen. Was ihn stolpern ließ, lag nicht nur in der Demo,
sondern im Produkt. Geändert:

1. **Lese-App, Antwort und Anlass.**
   - Die Angaben stehen vor „wozu und auf welcher Grundlage“; beides steht danach, eingeklappt, mit dem Zweck je Angabe.
   - Vor den Angaben bleibt allein die Herkunft (U2-ADR-258).
   - Statt eines Vermerks an jeder Zeile steht EINE Zeile über der Liste („Alle Angaben hat die Person selbst gemacht. Geprüft
     ist keine.“). Einen Vermerk trägt nur die Angabe, die von der Mehrheit abweicht.
   - Die Aussage bleibt dieselbe: geprüft nur mit `verifiziert: true`, U2-ADR-030.
   - „Ihr Aktenzeichen:“ statt „Vorgang:“.
   - „Notvertretung durch den Ehegatten: abgelehnt“ statt der doppelten Verneinung „… abgelehnt: ja“ (`ANTWORT_WERT`).
2. **Kern, Freigabe-Dialog einer Anfrage.**
   - Die Zeilen tragen dieselben Beschriftungen wie beim Empfänger (`ANFRAGE_BESCHRIFTUNG`, Texte im Sprachmodul). Wer
     freigibt, liest dieselben Worte wie wer empfängt; die zwei „Ablageort“ sind unterscheidbar.
   - „Einzeln entscheiden, was mitgeht“ ist ein Knopf, kein dezenter Link — es ist die wichtigste Wahl im Dialog.
3. **Kern, Kopf der Anfrage.** „Anfrage vom … · gilt bis … · Aktenzeichen der Stelle: …“, Daten als Tag.Monat.Jahr. Der
   Zustand steht nur, wenn er etwas sagt (beantwortet, abgelaufen).

**Nicht geändert, zur Entscheidung vorgelegt:**
- Der Block „Herkunft der Inhalte“ im Fall ohne Erweiterung. Er steht unbedingt (U2-ADR-258), und sein Wortlaut ist eine
  Kern-Zusicherung (U2-ADR-331).
- Der Freigabe-Dialog auf dem Handy („Herausgeben“ vor dem Ende der Liste) und Werte je Zeile.

```konformitaet
aussage:  Die Lese-App sagt die Herkunft der Angaben in einer Zeile über der Liste und vermerkt nur Abweichungen; nur verifiziert:true gilt als geprüft; die Angaben stehen vor Zweck und Grundlage der Anfrage.
zustand:  geprüft
herkunft: Nachtrag 26.09.2026
pruefung: tests/lese-app-antwort-herkunft.test.js#[Herkunft·Antwort] eine Zeile über der Liste sagt, woher die Angaben stammen; einen Vermerk trägt nur die abweichende Angabe
pruefung: tests/lese-app-antwort-herkunft.test.js#[Herkunft·Rot-Beweis] eine Anzeige, die alles als geprüft ausgibt, fällt an der Probe „keine geprüft“ durch
pruefung: tests/lese-app-antwort-kopf.test.js#[Lese-App·Reihenfolge] die Angaben vor Zweck und Grundlage der Anfrage; davor steht nur die Herkunft (U2-ADR-258)
pruefung: tests/lese-app-antwort-kopf.test.js#[Lese-App·Wert] „Notvertretung durch den Ehegatten: abgelehnt" statt „… abgelehnt: ja"; ein anderer Rohwert bleibt, wie er ist
```

```konformitaet
aussage:  Der Freigabe-Dialog einer Anfrage beschriftet wie die Lese-App, in beiden Sprachen; der Kopf der Anfrage ist Klartext; „Einzeln entscheiden, was mitgeht" ist ein Knopf.
zustand:  geprüft
herkunft: Nachtrag 26.09.2026
pruefung: tests/anfrage-klartext.test.js#[Anfrage·Beschriftung] der Freigabe-Dialog beschriftet wie die Lese-App; die zwei Ablageorte heißen verschieden
pruefung: tests/anfrage-klartext.test.js#[Anfrage·Kopf] „Anfrage vom … · gilt bis …" mit deutschem Datum; „offen" steht nicht als Wort da
pruefung: tests/anfrage-klartext.test.js#[Anfrage·Einzeln] „Einzeln entscheiden, was mitgeht" ist ein Knopf, kein dezenter Link
```
