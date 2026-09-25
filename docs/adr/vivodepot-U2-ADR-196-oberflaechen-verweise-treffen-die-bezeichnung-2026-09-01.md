# U2-ADR-196: Ein Verweis auf eine Bedienstelle nennt sie, wie sie dasteht

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** DATENINTEGRITÄT, TEXT
**Linie:** U2
**U2-Bezug:** Entstand als Nebenfund einer Erhebung zur englischen Übersetzung (Grundlage für
U2-ADR-195, noch nicht angenommen). Bewusst davon getrennt: die hier behobene Fehlerklasse
betrifft BEIDE Sprachen gleichermaßen und ist kein Übersetzungsthema — ein Wächter dafür braucht
keine Entscheidung über Zielbegriffe und keine Freigabe der Sprachkampagne.
**Anker:** Gefunden bei der gezielten Nachprüfung einer offenen Null aus einer Zufallsstichprobe
(120 Kennungen, s. Bericht „Englischer Bürgersatz — Richtigkeit statt Abdeckung", 01.09.2026),
freigegeben.
**Status heute:** gilt — Beleg `tests/textsatz-verweise-pruefen.test.js`.

---

## Kontext

Ein Text, der eine Bürgerin an eine andere Stelle der Oberfläche verweist, nennt diese Stelle oft
beim Namen — in Anführungszeichen, wie ein Wegweiser: „…dann wählen Sie dort ‚Depot einhängen'."
Ändert sich die tatsächliche Beschriftung (ein Knopf wird umbenannt, ein Bereichs-Label
überarbeitet), zieht der verweisende Text nicht automatisch mit. Es gibt keinen Mechanismus, der
das verhindert oder auch nur bemerkt.

Gemessen (gezielte Prüfung, kein Zufallsfund): zwei Fälle im Bestand, BEIDE bereits im deutschen
Original falsch, nicht erst in der Übersetzung entstanden —

- `strings:exportNichtsGehtMitHinweis.text` verwies auf „Etwas zurückhalten"/„Withhold
  something". Der tatsächliche Knopf (`strings:exportZurueckhaltenKnopf.text`) heißt nur
  „Zurückhalten"/„Withhold".
- `strings:identitaetKernFehltHinweis.text` verwies auf „Meine Identität"/„My Identity". Der
  tatsächliche Bereichs-Label (`identitaet.label`) heißt „Identität & Person"/„Identity & person".

Der zweite Fall trägt Gewicht über den Wortlaut hinaus: der Satz endet mit „…dann können Sie das
Dokument erzeugen" — eine Bürgerin, die dem Verweis folgt, findet die genannte Stelle nicht,
kann das Dokument nicht erzeugen, und hält sich für ungeschickt statt das Produkt für ungenau.

Ein dritter, ähnlich aussehender Fall (`vorsorge.vorsorge_instrumente/art_betreuung_hinweis.hint`,
verweist englisch auf „power of attorney for care" statt der tatsächlichen Beschriftung „Power of
attorney (advance care)") ist **kein** Fall dieser Klasse: das deutsche Original nennt an
derselben Stelle „Vorsorgevollmacht" — wortgleich zum deutschen Label. Nur die Übersetzung weicht
ab. Das ist ein Übersetzungsfehler und gehört zur Sprachkampagne (U2-ADR-195), nicht hierher.

## Entscheidung

**Die zwei gefundenen Texte sind korrigiert — deutsch und englisch —, indem der Verweis der
tatsächlichen Bezeichnung angepasst wurde, nicht umgekehrt.** Die Bezeichnungen selbst
(„Zurückhalten"/„Identität & Person") sind in Ordnung; sie wurden nicht angetastet.

**Ein Wächter entsteht dafür** (`tools/textsatz-verweise-pruefen.js`, mit
`tests/textsatz-verweise-pruefen.test.js`): er zieht aus jedem Text außerhalb einer
`.label`-Kennung jede in Anführungszeichen (ASCII `"…"` oder deutsch `„…"`) genannte Passage und
hält sie gegen alle tatsächlichen `.label`-Werte derselben Sprache. Läuft für Deutsch UND
Englisch, unabhängig — die Klasse ist keine Sprachfrage.

**Die Zusicherung, die das trägt — für die Bürgerin, nicht technisch formuliert:** ein Text, der
sie irgendwohin verweist, nennt den Ort so, wie er dort tatsächlich steht. Nicht: „Verweise
stimmen mit Labels überein" — das beschreibt den Mechanismus, nicht was er der Bürgerin zusagt.

## Ausdrücklich nicht behandelt

**Die Probe findet NUR ausdrücklich in Anführungszeichen zitierte Verweise.** Ein umschriebener
Verweis („…dann öffnen Sie den Speichern-Bereich…", ohne wörtliches Zitat) entgeht ihr
vollständig — das ist eine methodische Grenze, keine Lücke, die sich mechanisch schließen ließe:
ohne Zitatzeichen gibt es kein Signal, das „das ist ein Verweis auf eine Bezeichnung" von
gewöhnlichem Fließtext unterscheidet. **Der Wächter belegt keine Vollständigkeit — er findet
einen Fehlertyp, keinen erschöpfenden Katalog.**

Einfache Anführungszeichen (`'…'`) sind bewusst ausgeschlossen — sie kollidieren im Englischen mit
Apostrophen/Kontraktionen (*don't*, *it's*) und würden das Signal in Rauschen ertränken.

Nicht behandelt: die übrigen ~55 (Deutsch) bzw. ~55 (Englisch) vom Wächter gemeldeten Kandidaten,
die überwiegend Beispieltext in `.beispiel`-Feldern sind (Platzhalter-Werte wie „Housing"/„Car",
keine echten Oberflächen-Verweise) oder Vorlagen-Variablen (`{name}`, `{titel}`) — Rauschen der
Methode, kein weiterer Fund dieser Klasse. Wer den Wächter künftig verschärft, um dieses Rauschen
zu senken (z. B. `.beispiel`-Kennungen grundsätzlich ausnehmen), macht das als eigene Entscheidung.

## Konsequenzen

**Für die Bürgerin:** die zwei gefundenen Sackgassen sind geschlossen. Ein Dokument, das an
fehlenden Identitätsangaben hing, lässt sich jetzt über den Weg finden, den der Hinweistext
tatsächlich nennt.

**Für den nächsten Bau:** jede künftige Umbenennung eines Labels, das anderswo zitiert wird,
fällt jetzt auf — der Wächter läuft in der Suite. Er ersetzt keine Lesart durch eine
Muttersprachlerin (das bleibt Teil der Sprachkampagne, falls sie kommt) und keine Prüfung
umschriebener Verweise.

## Konformität

```konformitaet
aussage:  Ein Text, der eine Bürgerin an eine andere Bedienstelle verweist, nennt diese Stelle so,
          wie sie tatsächlich beschriftet ist — geprüft für Deutsch und Englisch unabhängig,
          nicht nur als Übersetzungsfrage.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/textsatz-verweise-pruefen.test.js#[Anlassfall·behoben] "Withhold"/"Zurückhalten": kein kaputter Verweis mehr, in BEIDEN Sprachen
pruefung: tests/textsatz-verweise-pruefen.test.js#[Anlassfall·behoben] "Identity & person"/"Identität & Person": kein kaputter Verweis mehr, in BEIDEN Sprachen
```

```konformitaet
aussage:  Ein reiner Übersetzungsfehler (der deutsche Verweis stimmt, nur die englische Fassung
          weicht vom englischen Label ab) fällt NICHT in diese Klasse — er gehört zur
          Sprachkampagne, nicht zu diesem Wächter.
zustand:  geprüft
herkunft: invariante
pruefung: tests/textsatz-verweise-pruefen.test.js#[Anlassfall·bewusst NICHT hier behoben] "power of attorney for care" bleibt ein bekannter Übersetzungsfehler (gehört zu U2-ADR-195, nicht 196)
```

---

*Vivodepot GmbH · Berlin · 01.09.2026*
