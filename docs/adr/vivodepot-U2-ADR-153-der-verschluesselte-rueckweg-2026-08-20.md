# U2-ADR-153: Der verschlüsselte Rückweg — zwei Verfahren, eine Empfängerseite, und ein wiederaufgenommener Zusammensetzer

**Status:** Akzeptiert
**Datum:** 20.08.2026
**Kategorie:** ARCHITEKTUR, SICHERHEIT, DATENSCHUTZ
**Grundlage:** Umsetzungs- und Testkonzept vom 20.08.2026, Schritt „Der verschlüsselte Rückweg",
samt Nachtrag vom selben Tag; dazu die Produktentscheidung vom 20.08.2026 zur
Wiederaufnahme des QR-Zusammensetzers und des Kamera-Pfads.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `antwortVerschluesselnPasswort`,
  `antwortVerschluesselnSchluessel`, `antwortVerschluesseln`, `_antwortAad`, `istAntwortUmschlag`,
  `qrTeileZusammensetzen`, `anfrageAusTeilen`, `anfrageAusEingabe`, `_anfrageAntwortSchreiben`.
  `vivodepot-lesen.html` — `antwortEntschluesselnPasswort`, `antwortEntschluesselnSchluessel`,
  `antwortAnzeigeModell`, `renderAntwortOeffnen`, `renderAntwort`, `antwortWeitergeben`,
  `qrTeileZusammensetzen`, `renderKamera`.
  `vivodepot-template-generator.html` — `erzeugeEmpfangsSchluesselpaar`.
- **ADR-Bezug:** U2-ADR-152 (die Anfrage, die den Schlüssel mitbringt), U2-ADR-085 (der
  Zusammensetzer und der Kamera-Pfad — hier der zweite Ast „begründen statt streichen"),
  U2-ADR-062 (der Weg mit fremdem Passwort, hier wiederverwendet), U2-ADR-150 (ein unbekannter
  Fall wird benannt).
- **Status heute:** gilt — gebaut und belegt in `tests/kette-08-der-rueckweg.test.js` und
  `tests/e2e-cross/T-CROSS-18-rueckweg.spec.js`; Wächter `W-antwort-reichweite`
  (`tools/lese-antwort-reichweite-pruefen.js`).

---

## Entscheidung

**1 · Zwei Verfahren, weil es zwei Lagen gibt.**

**Einmalpasswort für einen Vorgang** — die Heimaufnahme: ein Mensch, ein Vorgang. Der
**bestehende** Weg mit fremdem Passwort wird verwendet, nicht neu gebaut: PBKDF2-SHA256 mit
600.000 Iterationen (U2-ADR-062), ausserhalb des gepinnten Krypto-Blocks. Ein zweiter
Ableitungsweg wäre eine zweite Gelegenheit, die Iterationszahl falsch zu wählen.

**Schlüsselpaar für viele Antwortende** — der Arbeitgeber, der zweihundert Menschen fragt: ein
Einmalpasswort je Mensch wäre unbedienbar. Der öffentliche Teil reist in der Anfrage; die
Bürgerin erzeugt je Antwort ein **flüchtiges** Paar, rechnet ECDH dagegen und legt nur ihren
öffentlichen Teil in den Umschlag. Wer zweihundert Antworten abfängt, hat zweihundert
verschiedene Schlüssel vor sich.

**2 · ECDH über P-256, nicht X25519 — und das ist gemessen, nicht gewählt.**

X25519 gibt es in WebCrypto erst seit Firefox 132 (11/2024) und Chrome 133 (02/2025); ECDH über
P-256 seit der ersten WebCrypto-Fassung. Der Massstab dieses Auftrags ist der **Tresen einer
Behörde**: „was am Rechner grün ist und am Tresen nicht funktioniert, ist nicht fertig." Ein
Rechner mit Chrome 120 liest die Antwort mit P-256 und gar nicht mit X25519. Gemessen am
20.08.2026 in Chromium 151 und in Firefox: **beide** Kurven laufen dort — die Entscheidung fällt
für die Rechner, die *nicht* im Labor stehen.

Das gemeinsame Geheimnis wird **nie** direkt als Schlüssel benutzt: HKDF-SHA256 mit eigenem Salt
und einer zweckbindenden `info` (`vivodepot/antwort/v1`), dann AES-256-GCM.

**3 · Das Empfangs-Schlüsselpaar ist ein ZWEITES Paar.**

Das Ed25519-Paar des Erzeugers **signiert** — es kann nichts entschlüsseln. Signier- und
Verschlüsselungsschlüssel zu vermischen wäre auch dann falsch, wenn eine Kurve beides könnte.
Eine Anfrage, die das Schlüsselpaar-Verfahren nennt und keinen Empfangsschlüssel mitbringt, wird
**beim Erzeuger** blockiert — nicht erst bei der Bürgerin.

**4 · Der Umschlag trägt drei Angaben im Klartext, und sie sind gebunden.**

`verfahren`, `vorgang` und `anbieterId` stehen lesbar da: der Empfänger **muss** sie lesen können,
bevor er entschlüsselt — sonst weiss er nicht, welches Passwort oder welcher Schlüssel gilt. Es
sind seine eigenen Angaben aus seiner eigenen Anfrage; jeder Feldwert liegt im Chiffrat.

**Sie gehen in die AAD von AES-GCM.** Wer eines davon ändert, bekommt keinen anderen Empfänger,
sondern einen Fehlschlag. Ohne die Bindung liesse sich eine Antwort auf einen Vorgang in einen
anderen umetikettieren, und der Empfänger legte sie in die falsche Akte.

**5 · `qrTeileZusammensetzen` und der Kamera-Pfad kommen zurück — als zweiter Ast, nicht als
Umkehrung.**

U2-ADR-085 §4 Punkt 3 hat den Zusammensetzer nicht fachlich gestrichen, sondern als **toten
Code**: „null Aufrufer im Produktivcode … **streichen oder begründen**." Die Bedingung ist
entfallen. Zug 2 dieses Auftrags **ist** der Aufrufer, und die mehrteilige Ausgabe „Teil i von n"
ist seit dem Produktkonzept vom 19./20.08. **Regelfall, nicht Notlösung** — eine mehrteilige
Ausgabe ohne Gegenstück wäre eine Ausgabe, die niemand lesen kann. Für den Kamera-Pfad
(Entscheidung 3 derselben ADR) gilt dasselbe, und die Geräte-Probe dieses Auftrags verlangt ihn
ausdrücklich.

**Er steht dort, wo sein Aufrufer steht:** in der **Lese-App**, als reine Funktion, auf der der
bestehende zustandsbehaftete Sammler `qrTeilAufnehmen` aufsetzt — ein Mechanismus, nicht zwei
nebeneinander. Und im **Kern**, weil auch eine ankommende *Anfrage* mehrteilig sein kann
(U2-ADR-152 las bisher nur einen Teil).

**U2-ADR-085 bleibt im Übrigen in Kraft.** Entscheidung 1 (Pipe-Rahmenformat) und der dort
festgehaltene offene EUDIW-Punkt sind **nicht** berührt: der EUDIW-Pfad bleibt ausgeblendet, und
der Empfänger dieses Wegs ist die Lese-App — genau die Prämisse, auf der Entscheidung 1 steht.

**6 · Drei Grenzen für den Kamera-Pfad, damit die Geräte-Berechtigung nicht mehr kostet, als sie
trägt.**

Die Kamera geht **nur auf ausdrücklichen Klick** auf, nie beim Laden. Sie schliesst beim ersten
vollständigen Fund und bei jedem Verlassen **sofort**. Fehlt der Browser-Leser (`BarcodeDetector`)
oder verweigert der Mensch den Zugriff, wird das **gesagt** und der Einfüge-Weg bleibt — **kein
Nachladen aus dem Netz, nie.**

**7 · Ein fehlender Teil wird benannt, nicht als Teilergebnis ausgegeben.**

Der Zusammensetzer ist rein und zustandslos, die Reihenfolge gleichgültig. Fehlt ein Teil, nennt
er ihn; Teile aus zwei Serien ergeben einen Befund, keinen halben Text. Eine stumme Teilausgabe
sieht aus wie ein Ergebnis.

**8 · Die Lese-App zeigt genau, was der Datensatz hergibt — und ein Wächter hält sie daran.**

**Mehr** wäre eine Erfindung: hinter der Lese-App liegt kein Depot. **Weniger** ist die teurere
Hälfte: `fehlend`, `unbekannt` und `vollstaendig` sind die Aussagen, mit denen der Datensatz sich
selbst als Teilantwort zu erkennen gibt.

**9 · Weitergeben als Datensatz — der einzige Schreibweg der Lese-App.**

Die Fachanwendung einer Behörde liest JSON, keinen Bildschirm; ohne diesen Weg endete die Antwort
im Abtippen. Er trägt **ausschliesslich** den Antwort-Datensatz, nie ein geöffnetes Depot.

---

## Was daraus folgt

**Die Read-only-Disziplin der Lese-App ist abgeschwächt, und das ist eine Produktentscheidung.**
Bis heute galt: kein Download-Pfad, keiner. Jetzt gibt es genau einen, und die Zusicherung ist
**geschärft statt aufgeweicht**: genau ein `.download =`, in `antwortWeitergeben`, und ein
geöffnetes Depot wird nirgends serialisiert. Wer die Abschwächung zurücknehmen will, nimmt damit
Zug 2 zurück.

**Die exportKey-Zusicherung ist ebenso geschärft.** Bis heute durfte `exportKey` im Kern gar nicht
vorkommen; die Zusicherung dahinter ist „ein **abgeleiteter** Schlüssel darf den Browser nicht
verlassen". Jetzt gilt strukturell: `exportKey` nur auf einen Ausdruck, der auf `.publicKey` endet.
Ein privater oder abgeleiteter Schlüssel trägt diesen Namen nie.

**Der Ausgabepfad der Antwort ist umklassifiziert.** Er stand in
`tests/b16-113-klartext-ausgabepfade.test.js` als erlaubter Klartext-Pfad und steht jetzt unter
`NUR_CHIFFRAT`. Ein Pfad, der als Klartext geführt wird und Chiffrat trägt, macht jede Prüfung
darüber wertlos.

**Eine zurückgehaltene Pflichtangabe macht die Antwort unvollständig.** Beim Bau gemessen: ein
Feld, das die Sensibel-Prüfung zurückhält, stand weder in `felder` noch in `fehlend` — es wurde
nur gezählt. War es ein Pflichtfeld der Anfrage, sah die Antwort **vollständig** aus. `vollstaendig`
berücksichtigt das jetzt. **Benannt wird die Angabe nicht:** dass sie fehlt, sagt der Zähler, und
welche es war, wäre eine Aussage über die Bürgerin, die sie mit dem Zurückhalten gerade nicht
machen wollte.

---

## Was NICHT entschieden ist

**Die Geräte-Probe mit einer gewöhnlichen Handykamera bleibt offen.** Belegt ist: eine **echte**
QR-Grafik, gelesen vom **echten** QR-Leser des Browsers, mehrteilig und in falscher Reihenfolge,
bis zum entschlüsselten Datensatz. Nicht belegt und in keiner Maschine belegbar: Optik —
Kameraschärfe, Papier, Tageslicht, eine zitternde Hand.

**Die Webseiten-Zusagen zum QR-Scan.** U2-ADR-085 §4 Punkt 2 verlangte, sie auf `institutionen.html`
und `org.html` zu streichen. Nach diesem Auftrag sind sie wieder zutreffend — ihre
Wiederherstellung gehört in die Webseiten-Arbeit und ist im Bericht namentlich gemeldet, damit sie
eine Entscheidung wird und keine Nebenwirkung.

**⚠ Externe Krypto-Review.** Wie beim Angehörigen-Cache und beim SHL-JWE gilt: neue
sicherheitskritische Krypto geht vor Produktivschaltung durch eine eigene Review-Runde.

## Warum nicht anders

**Warum nicht ein Verfahren für beide Lagen?** Ein Einmalpasswort skaliert nicht auf zweihundert
Antwortende; ein Schlüsselpaar verlangt von der kleinen Praxis eine Schlüsselverwaltung, die sie
nicht hat. Beide Lagen sind echt, und keine ist die Ausnahme.

**Warum der ephemere Schlüssel bei der Bürgerin und nicht ein fester?** Ein fester Schlüssel der
Bürgerin wäre über alle ihre Antworten hinweg dasselbe Merkmal — verkettbar über Institutionen
hinweg. Der flüchtige ist bei jeder Antwort ein anderer.

**Warum stehen `vorgang` und `anbieterId` überhaupt im Klartext?** Weil der Empfänger vor dem
Entschlüsseln wissen muss, welchen Schlüssel er nimmt. Sie zu verstecken hiesse, ihn alle seine
Schlüssel durchprobieren zu lassen — und das über eine 600.000-Iterationen-Ableitung.

**Warum baut die Lese-App den Zusammensetzer und nicht der Kern allein?** Weil der Empfänger dort
sitzt. Ein Zusammensetzer im Kern ohne Aufrufer wäre wieder genau der tote Code, den U2-ADR-085
gestrichen hat.

---

*Vivodepot GmbH · 20.08.2026*
