# U2-ADR-322: Jeder Text-Träger löst in den Textsatz auf — und der Wächter läuft den Bestand ab, nicht die Ortsliste

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `tools/textsatz-traeger-erheben.js` (neu),
`tests/u2-adr-322-jeder-traeger-loest-auf.test.js` (neu),
`tests/fixtures/u2-adr-322-rueckstand-ungedeckte-texte.json` (neu);
misst gegen `vivodepot.html` (`TEXTSATZ_EINGEBAUT`, `TEXTSATZ_ARTEN`, `TEXTSATZ_FEHLSTELLEN`,
`_textsatzOrteBegehen`)

- **Status heute:** gilt — die Deckung wird aus dem Bestand abgeleitet, nicht aus einer gepflegten
  Ortsliste. **Kein Produktcode geändert.** Der gemessene Rückstand von 134 Texten ohne
  Textsatz-Kennung ist eingefroren und darf nie wachsen.

---

## Warum das gebraucht wird

Die Texte für die Bürgerin liegen im Textsatz — 3 196 Kennungen, nach Bereichen geordnet.
Die Garantie lief bisher nur in **einer** Richtung vollständig:

```
Text ohne Feld    faengt tests/textsatz-mechanismus.test.js  — keine tote Kennung
Feld ohne Text    faengt TEXTSATZ_FEHLSTELLEN                — aber nur zum Teil
```

`TEXTSATZ_FEHLSTELLEN` meldet ein **fehlendes** `label`, und zwar nur an den Knoten, die
`_textsatzOrteBegehen` abläuft. **Ein Feld, dem seine Beschriftung fehlt, fällt heute erst der
Bürgerin auf** — als leeres Label oder als `undefined`.

Der Fall ist nicht theoretisch. Zweimal in zwei Tagen:

```
zehn exporte[].label   fielen beim Buendel-Schnitt weg
                       im Export-Fenster haette "undefined" gestanden
                       statt "Als Kontaktkarte (fuer Adressbuch/Handy)"
acht Kennungen         waeren in der englischen App deutsch geblieben
```

**Beide Male hat es nicht der Textsatz gemeldet, sondern ein Zufall.**

## Drei Klassen fallen durch — die mittlere ist die gefährlichste

```
Ort nicht besucht     exporte[].label · RECHTSGRUNDLAGEN_VERTRETUNG
Ort besucht, aber     das label steht INLINE da -> es FEHLT nichts,
                      es ist bloss nie ueberschreibbar
Traeger unklar        die Form entscheidet nicht (13 Faelle, ausgewiesen)
```

Die mittlere geht durch **jede** „fehlt was?"-Prüfung hindurch. Der Beleg steht in den Zahlen:
`VOLLMACHT_BMJ` **steht** in der Ortsliste und wird begangen — und trägt trotzdem 44 ungedeckte
Texte. Der Satz führt dort nur die Options-Labels (`vollmacht:vm_gesundheit_entscheiden/ja.label`);
die 22 `frage`- und 22 `feld.label`-Texte der Schritte stehen inline.

## Die tragende Entscheidung: keine Kennung herleiten

**Ein Wächter, der dieselbe Landkarte abläuft wie das Werkzeug, bewacht nichts** — er findet nie
einen Ort, den die Landkarte nicht kennt. Dieselbe Form hat an einem Tag dreimal zugeschlagen
(Rechtsraum-Schnitt nur über `SEKTOREN`; Wizard-Sammler nur `frage` + `feld`; `TEXTSATZ_FEHLSTELLEN`
über seine Ortsliste).

Darum kennt `tools/textsatz-traeger-erheben.js` **keine Orte**. Es begeht den Objektgraphen der
Kern-Ausfuhr generisch und entscheidet an jedem Knoten nach zwei bestandseigenen Regeln:

- **Was ein Träger ist,** sagt das Arten-Vokabular des Kerns (`TEXTSATZ_ARTEN` plus die vier
  Assistenten-Arten). Ein Knoten, der irgendwo im Graphen eine solche Eigenschaft trägt, ist ein
  Träger — `exporte[]` genauso wie ein Sektorfeld.
- **Ob er gedeckt ist,** wird **ohne Kennung** gefragt: steht sein WERT im Satz?
  `_textsatzKnotenFuellen` schreibt den Satz-Text in den Knoten; was inline im Bündel steht, steht
  nirgends im Satz. Ortskenntnisfrei unterscheidbar.

**Eine Kennung herzuleiten hieße, die Landkarte nachzubauen.** Es macht die Probe zugleich
unempfindlich gegen die zwei bekannten Fallen des Kennungsraums: die 17 katalogweit doppelten
UnterFeld-IDs und `feld.<feldId>.vorschlaege` ohne Trägerkette. **Über Namen wird hier nicht
gemessen.**

## Was gemessen wurde

Gegen Kanon `debcb406`, `SCHALEN_STAND` `v582` — und **unverändert nachgemessen gegen `f1a2ab5b`
/ `v583`**, also über U2-ADR-320 hinweg, der den nativen Bereichsbestand aus der Datei nahm.
Dieselben Zahlen, dieselben 134 Wortlaute: **die Erhebung hängt nicht daran, ob der Bestand in der
Datei steht oder beim Laden aus dem Bündel entsteht** — das ist die Probe aufs Exempel für „läuft
den Bestand ab, nicht die Ortsliste".

```
Knoten besucht        4380
Traeger               2125
  gedeckt             1975
  ungedeckt            136   (134 verschiedene Wortlaute)
  Form unklar           13   ausgewiesen, nicht behauptet
  Datenwert (C1E)        1   gehoert nicht in den Satz
```

Die 136 nach Wurzel:

```
45  ALT_LABEL_REGISTER          entfernte Felder, historischer Beleg
44  VOLLMACHT_BMJ               Wortlaute mit Rechtsfolge
14  PV_MODUL
11  VOLLMACHT_MODUL
10  KI_MODUL
 8  STANDARD_VORLAGEN
 2  RECHTSGRUNDLAGEN_VERTRETUNG  ein Ort, den keine Liste kennt
 2  BETREUUNG_MODUL
```

**Ob die Vorlagen-Wortlaute überhaupt in den Satz gehören, ist eine Produktfrage und wird hier
nicht entschieden.** Dieses ADR schreibt die Zahl hin, nicht ihre Auflösung.

## Die Form der Probe

**Die Ausbeute zuerst, und nicht optional.** Die Probe prüft, wieviele Knoten und Träger sie
überhaupt gefunden hat, bevor sie irgendetwas behauptet. **Eine Probe, die nichts findet, ist sonst
nicht von einer zu unterscheiden, die nichts zu finden hat** — an einem Tag haben zwei Prüfer GRÜN
gemeldet, ohne etwas geprüft zu haben, beide mit einem Anker, der ins Leere zeigte. Die
Untergrenzen (4000 / 2000 / 1800) fangen den Ausfall des Gangs, nicht das Wachsen des Bestandes.

**Die Positivkontrolle beweist, dass die Landkarte ersetzt und nicht verlängert ist:** ein Träger
wird an einem Ort eingesetzt, den `_textsatzOrteBegehen` **nicht** kennt (`exporte[]`, der Ort des
echten Vorfalls). Die Probe belegt beide Hälften — dass die bestehende Prüfung ihn nicht sieht, und
dass die Erhebung ihn findet.

**Die Ratsche läuft über die Identität, nicht über eine Zahl.** Ein Zähler liesse sich ausgleichen,
indem ein gedeckter Träger hinzukommt und ein ungedeckter wegfällt. Geprüft wird der **Wortlaut**;
Pfade tragen Array-Indizes und verschieben sich, der Text nicht.

**Die 134 sind ein Rückstand, kein Zustand.** Die Menge darf nie wachsen und **soll schrumpfen**;
wer einen dieser Texte in den Satz hebt, streicht ihn aus der Datei. Eine Ratsche, die nur „nicht
wachsen" sagt, wird zur Duldung. Der eingefrorene Satz nennt darum seinen Bezug (`debcb406` / `v582`)
— ohne ihn wäre „134" in vier Wochen eine Zahl ohne Herkunft.

## Was ausdrücklich NICHT gebaut wurde

**Die Gegenrichtung „Text ohne Feld" wird nicht verdoppelt.** Wertbasiert nachgebaut ergäbe sie
1 146 „Satzwerte ohne Träger" — fast alle aus dem flachen `strings:`-Raum (1 187 Kennungen), der
keine Baumknoten hat: **eine Zahl ohne Gegenstand.** Die kennungsbasierte Probe in
`tests/textsatz-mechanismus.test.js` ist dafür die richtige Stelle. Was hier steht, ist kein zweiter
Prüfer, sondern ein Riegel gegen das stille Verschwinden des ersten.

## Folgen

- Ein neuer Text ohne Kennung fällt auf, **gleich an welchem Ort er steht** — auch an einem, den
  keine Liste kennt.
- Ein inline dastehendes `label` an einem **bekannten** Ort fällt ebenfalls auf; das ist die Klasse,
  die `TEXTSATZ_FEHLSTELLEN` bauartbedingt nicht sehen kann.
- Die Achse bleibt: der Text liegt im Sprach-Modul, die Struktur trägt die Kennung. Die Probe
  verlangt nichts anderes und lässt keinen deutschen Text als Rückfall ins Struktur-Bündel.
- **Kein Produktcode ist geändert.** Dieses ADR fügt Deckung hinzu, keine Verhaltensänderung.
