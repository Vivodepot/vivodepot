# U2-ADR-364 · Nur lateinische Schrift im deutschen Sprachmodul — ein Beispiel getauscht, ein Wächter dauerhaft

**Datum:** 07.09.2026
**Status:** gebaut, lokal grün (6/6 neue Proben), Gate steht noch aus (Freigabe)
**Status heute:** gilt
**Bezug:** U2-ADR-285 (Reservierung 'de', hier unberührt — kein Einlassweg-Bezug) · das laufende „DE-Modul aus dem Kern"-Vorhaben (3f, U2-ADR-285-Nachtrag), das diesen Fund erst sichtbar erzeugt hat

---

## 1 · Der Anlass

Beim Öffnen des deutschen Produkts fand sich im ersten Block (Vor-/Nachname) dieser
Hinweistext:

> „Für Namen, die in dieser Reihenfolge geschrieben werden — z. B. 王芳 statt Fang Wang."

Ihr Urteil, wörtlich: **„Im deutschen Depot sind die Feldbezeichnungen und alle anderen Texte
deutsch."** Chinesische Schriftzeichen gehören nicht in ein deutsches Depot — unabhängig davon,
dass die BESCHRIEBENE Funktion (Anzeige-Reihenfolge für Namen, die den Familiennamen zuerst
tragen) selbst richtig und nötig bleibt.

## 2 · Wo der Text wirklich lag — gemessen, nicht angenommen

Der Auftrag sprach zunächst vom „Sprachmodul", nicht vom „Gerüst". Gemessen: **der deutsche Text
liegt heute im Kern.** Das DE-Sprachmodul (`tools/textsatz-de-modul.json`,
`tools/textsatz-de-modul-erzeugen.js`) ist eine **mechanisch aus `TEXTSATZ_EINGEBAUT` im Kern
abgeleitete** Kopie — sein eigener Kopf-Kommentar sagt es selbst: „das DE-Modul ERFINDET
NICHTS — es liest jede Kennung direkt aus TEXTSATZ_EINGEBAUT im Kern." Ein Handedit am Modul
allein wäre beim nächsten Erzeuger-Lauf verschwunden; der Text hätte in Wahrheit weiter am
Kern gehangen. Ebenso `tools/buergermodul/vd-de-sprache.json`
(`tools/buergermodul-schnitt.js`, `schneiden(V)` liest direkt aus dem gebooteten Kern).

**Fünf Fundorte insgesamt, drei Behandlungen:**

```
vivodepot.html:4049 (SCHALEN_STAND-Zeile ist Beleg, nicht Fundort)
vivodepot.html:7339 (TEXTSATZ_EINGEBAUT)      — VON HAND geändert (der Kern IST die Quelle)
vivodepot-lesen.html (nativer Spiegel)        — VON HAND geändert (derselbe zweite Ort, der
                                                  diese Nacht schon einmal getroffen hat)
tools/textsatz-de-modul.json                  — mit dem Erzeuger NEU GEBAUT, nicht angefasst
tools/buergermodul/vd-de-sprache.json         — ebenso, mit buergermodul-schnitt.js
tests/fixtures/sektoren-EINGEFROREN-…json     — eingefrorener Schnappschuss, UNANGETASTET
```

**Nebenbefund, gemeldet, hier nicht behandelt:** solange der Besitz des
deutschen Wortlauts beim Gerüst liegt, heißt „ein deutsches Wort ändern" praktisch „den Kern
editieren". Das ist das schärfste, konkreteste Argument für 3f's laufenden Besitz-Zug (deutschen
Text tatsächlich ins Modul heben, nicht nur mechanisch spiegeln) — schärfer als jede Zahl.

## 3 · Das neue Beispiel — DE und EN bekommen je ein eigenes

**DE** (`vivodepot.html`, `vivodepot-lesen.html`):
> „z. B. Nagy Peter statt Peter Nagy" (ungarisch — Familienname zuerst, lateinische Schrift,
> dieselbe Funktion belegt wie das alte Beispiel).

**EN** (`tools/textsatz-en-daten.js`, hand-gepflegte Quelle des EN-Moduls, danach mit
`tools/textsatz-en-modul-erzeugen.js` neu gebaut): trug bislang **dieselbe** chinesische
Zeichenkette — „nicht dieselbe Zeichenkette" war ausdrücklich verlangt. Neues Beispiel:
> „e.g. Tanaka Yuki instead of Yuki Tanaka" (japanisch, romanisiert — dieselbe Familienname-
> zuerst-Konvention, ohne ein einziges nicht-lateinisches Zeichen).

Die WERTENTSCHEIDUNG für das konkrete EN-Beispiel liegt bei mir (nicht ausdrücklich
vorgegeben) — leicht austauschbar, falls ein anderes bevorzugt wird; die einzige
harte Anforderung („nicht dieselbe Zeichenkette wie DE", „kein Zeichen außerhalb Latin/Common")
ist erfüllt.

## 4 · Der Wächter — der eigentliche Wert dieses Auftrags

`tools/textsatz-de-nur-lateinisch-pruefen.js` + `tests/textsatz-de-nur-lateinisch.test.js`.

**Zusicherung:** kein sichtbarer Wert im DE-Sprachmodul (`tools/textsatz-de-modul.json`, `texte`
UND `regeln`, rekursiv — die vier Metadaten-Schlüssel `modulTyp`/`sprache`/`moduleVersion`/
`anbieterId` sind keine bürgersichtbaren Texte und ausgenommen) trägt ein Zeichen außerhalb der
drei UNIVERSELLEN Unicode-Skript-Klassen `Latin`/`Common`/`Inherited`.

**Warum diese drei Klassen, nicht eine Positivliste bekannter Zeichen:** eine Liste bekannter
Zeichen (€, ·, „", …) hätte den NÄCHSTEN Fall nicht gefangen — genau das Muster, das der Auftrag
ausdrücklich vermeiden wollte („generisch über den Bestand, nicht gegen eine Liste bekannter
Stellen"). `Latin` deckt jeden lateinischen Buchstaben INKLUSIVE Diakritika (é/ü/ñ/ő/ð sind
Teil des Latin-Skripts, keine Sonderbehandlung nötig — Eigennamen wie „García" oder „Björk"
bleiben unangetastet). `Common` deckt Ziffern, Satzzeichen, Währungszeichen und die meisten
Symbole (·, —, „" '' € $ ☐ sind alle `Common`). `Inherited` deckt kombinierende diakritische
Zeichen. Alles außerhalb (Han/CJK, Kyrillisch, Arabisch, Hebräisch, Griechisch, Devanagari, …)
ist ein Fund.

**Grenzfälle vorher geprüft, wie im Auftrag verlangt — keiner davon macht fälschlich rot** (s.
`[U2-ADR-364·Grenzfälle-Gegenprobe]` im Testfall):
- Währungszeichen (EUR, €, $)
- Mittelpunkt (·) und Gedankenstrich (—)
- deutsche „Anführungszeichen" und englische 'einfache'/'typografische' Anführungszeichen
- Ballot-Box-Symbole (☐/☑)
- Diakritika in Eigennamen (García, Björk Guðmundsdóttir, Nagy Péter)

Keiner dieser Grenzfälle musste die Regel aufweichen — sie bestätigen sie.

## 5 · Beleg

`node --test tests/textsatz-de-nur-lateinisch.test.js`: 6/6 grün —
Positivkontrolle (echtes Modul, 3350 Werte, 0 Funde), das ausgetauschte Beispiel selbst geprüft
(alt verschwunden, neu vorhanden, keine fremde Schrift), zwei Rot-Beweise (ein gepflanztes
chinesisches Zeichen wird gefunden; Kyrillisch UND Arabisch werden gefunden, reiner deutscher
Text bleibt unberührt), die Grenzfälle-Gegenprobe, und eine Probe, dass die vier
Metadaten-Schlüssel nicht mitgezählt werden.

Regression (gezielt): das Gate fand einen echten Konflikt mit `tests/buergermodul-bereich-erzeugen-
u2-adr-319.test.js:104` — dieser Wächter vergleicht jeden gemeinsamen Feld-Pfad des heutigen
Bestands `deepStrictEqual` gegen den bei `debcb406` **eingefrorenen** Bestand
(`tests/fixtures/sektoren-EINGEFROREN-nativer-bestand-debcb406.json`), unverändert seit ihrer
einzigen Commit (`f1a2ab5b`). Das Feld `identitaet#person.familienname_zuerst` trug dort noch
den alten Hinweistext. **Dies ist die erste inhaltliche Textänderung an einem gebündelten Feld
seit dem Freeze** — ausgelöst dadurch, dass ein chinesisches Beispiel in einem
deutschen Depot-Text auffiel. Der Freeze bewacht VERLUST, nicht WORTLAUT; bis heute war das nie ein
Unterschied. Entscheidung: die Fixture selbst bleibt
unangetastet — „ein Beweismittel, das man pflegt, ist keines" — stattdessen trägt der Test jetzt
`AUSNAHMEN_WORTLAUT` (Pfad + Begründung, gleiches Muster wie `AUSNAHMEN` in
`tests/fixture-felder-im-modell.test.js`), plus eine eigene Probe, dass jeder Eintrag einen
bekannten Weg und eine lesbare Begründung trägt. Der Kommentar über der Liste benennt ihren
Preis: sie hebelt an dieser Stelle die Freeze-Schärfe aus; wird sie lang, ist das das Signal,
den Freeze bewusst zu beenden statt ihn Zeile für Zeile auszuhöhlen — nicht, weiter Ausnahmen
anzuhäufen. `node --test tests/buergermodul-bereich-erzeugen-u2-adr-319.test.js`: 11/11 grün.

## 6 · Was dieser Auftrag NICHT ist

Keine Reparatur des „DE-Modul wird mechanisch aus dem Kern abgeleitet"-Zustands — das ist 3f's
eigener, laufender Zug. Keine Hand-Override-Tabelle für DE (ausdrücklich abgelehnt: „Sie
wäre eine zweite Quelle für denselben Text — und genau das, was 3f's Folgezug auflösen soll").
Keine Änderung an `tools/buergermodul/vd-privat.json` — der Erzeuger-Lauf brachte dort eine
Abweichung vom eingecheckten Stand zutage, außerhalb des Auftrags, bewusst NICHT mitgenommen
(`git checkout` auf den eingecheckten Stand), um die Kollisionsfläche mit `3f`/`56`s zeitgleicher
Arbeit klein zu halten. Genau gemessen (Auflage): DEEP-EQUAL zwischen eingecheckter und
frisch erzeugter Datei bestätigt **kein** Inhaltsunterschied, nur Schlüssel-Reihenfolge.

**Nebenbefund:** `buergermodul-schnitt.js` serialisiert die Schlüssel nicht deterministisch
(`identitaet.sozialversicherung`: `wizards`/`exporte`; ein `vorsorge`-Eintrag: `wizardId`/
`exporte`). Gleicher Inhalt, andere Anordnung. Heute folgenlos — kein Wächter vergleicht die
Ausgabe. Wird zur Flatterquelle, sobald einer es tut. Fix: Schlüssel beim Serialisieren
sortieren. Eigener Zug.
