# U2-ADR-112: Die STRINGS-Schicht — was durch sie laufen muss, und was nicht

**Status:** Angenommen
**Datum:** 28.07.2026
**Kategorie:** ARCHITEKTUR, UX, WAHRHAFTIGKEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-104 (fälschlich als Quelle dieser Regel geführt — siehe Kontext) ·
U2-ADR-025/031/034/062/093 (nennen einzelne STRINGS-Schlüssel, setzen aber keine Regel)
**Anker:** Erhebung `tools/eigenschaften-z7-erheben.js`, 28.07.2026 · Prüfarchitektur-Konzept
27.07., Zusicherung 7 · Bauauftrag Prüfarchitektur, Block 3
**Status heute:** ungeprüft — der einzige Konformitäts-Block trägt `zustand: offen`; laut Nachtrag
04.08.2026 ist die Bedingung inhaltlich erfüllt, aber EP7 lebt nur als Eigenschaftsprüfung in
`tools/eigenschaften.js` ohne die von `tests/pruefstand-bindung.test.js` (U2-ADR-099) verlangte
Bindung an einen benannten Testtitel.

---

## Kontext

Die Prüfarchitektur führt als siebte Zusicherung: *„Für jeden sichtbaren Text gilt: er
läuft über STRINGS."* Der Auftrag verlangte ausdrücklich, die Klasse vor dem Bau
einzugrenzen — 317 Fundstellen liegen außerhalb, und ob U2-ADR-104 sie meint, war offen.

**Gemessen am 28.07.: U2-ADR-104 meint sie nicht.** Der ADR trägt den Titel
„Datenmodell-Block — vier Skalarfelder werden Listen, ein Kontaktfeld wird zwei
(Schema 41)". Die Zeichenkette `STRINGS` kommt darin **null** mal vor; kein Satz betrifft
sichtbaren Text.

**Und keine andere trägt sie auch.** Eine vollständige Erhebung über alle 117 ADRs fand
`STRINGS` in 19 davon. Jede einzelne Fundstelle ist entweder das bloße Wort in einer
Code-Stellen-Zeile oder ein **konkreter Schlüssel** — `STRINGS.fussHaftung`,
`STRINGS.pwStaerke`, `STRINGS.aktionFehlgeschlagen`, `STRINGS.vpFehlerSchwach`,
`STRINGS.navDepotVerlassen`. Sie **benutzen** die Schicht als Ort. Keine setzt eine Regel.

Damit hing die Zusicherung an einer Regel, die niemand beschlossen hatte. **Das ist
dieselbe Form wie die Zwölf-Monats-Prüffrist** — eine Setzung, die Vivodepot niemandem
zuschreiben konnte, weil sie seine eigene war und nirgends stand. Der Wahrhaftigkeits-Block
der Prüfarchitektur ist aus genau diesem Fund entstanden; ihn hier zu wiederholen wäre der
teuerste denkbare Fehler.

### Die Erhebung, nach Klassen

`node tools/eigenschaften-z7-erheben.js` — 317 sichtbare Texte ohne STRINGS-Bezug in
`vivodepot.html`, klassifiziert nach dem Schlüssel unmittelbar davor:

| Anzahl | Klasse |
|---|---|
| **285** | Feld-Beschriftung oder Titel aus einer Definition (`label:`, `titel:`) |
| 21 | HTML-Vorlage, die Text mitführt |
| 8 | nicht eingeordnet |
| 3 | zugänglicher Name im Markup (`aria-label=`) |
| **0** | **Meldung an die Bürgerin (Toast, Warnung, Fehler)** |

Die Null ist der Befund, der die Entscheidung trägt: **jede Meldung an die Bürgerin läuft
bereits über STRINGS.** Der Kern dessen, wofür die Schicht gebaut wurde, ist vollständig
versorgt. Die 317 sind fast ausschließlich eine andere Sorte Text.

## Entscheidung

**1 — Die STRINGS-Schicht gilt für Texte des BEDIENFLUSSES.** Was der Bürgerin als
Rückmeldung, Warnung, Fehler, Bestätigung oder Hinweis begegnet, läuft über STRINGS.
Diese Klasse ist heute vollständig versorgt; die Zusicherung sichert einen guten Zustand
gegen Rückfall, sie eröffnet keine Schuld.

**2 — Feld-Beschriftungen und Titel aus dem Datenmodell fallen NICHT darunter.** Sie
gehören zur Felddefinition, nicht zum Bedienfluss. Ihr Ort ist die Definition, in der auch
Typ, Sichtbarkeit und Hilfetext des Feldes stehen; sie von dort in eine zweite Schicht zu
ziehen, verteilte einen Gegenstand auf zwei Orte, ohne dass jemand etwas gewönne.

**3 — Der enge Schnitt ist bewusst und begründet, nicht bequem.** Der weite Schnitt hätte
285 Posten eröffnet und wäre auf Jahre rot. Zwischen einem Wächter, der vom ersten Tag an
trägt, und einem, der als Schuld beginnt, ist das kein knapper Abstand: **ein Gate, das
dauerhaft rot steht, ist ein abgeschaltetes Gate.**

**4 — Was hier NICHT entschieden ist.** Ob Feld-Beschriftungen jemals in eine eigene
Übersetzungsschicht sollen — etwa für eine zweite Sprache — bleibt offen. Diese
Entscheidung regelt den Geltungsbereich der STRINGS-Schicht, nicht die Frage der
Mehrsprachigkeit. Käme sie, wäre sie ein eigener Umbau mit eigenem ADR.

**5 — Die drei Grenzfälle.** Die 21 HTML-Vorlagen mit eingebettetem Text und die 8 nicht
eingeordneten Stellen sind **ungemessen, nicht entschieden**. Sie bleiben ein benannter
Punkt; die Zusicherung misst sie nicht, und sie behauptet auch nicht, sie seien in Ordnung.
Die 3 zugänglichen Namen im Markup (`aria-label=`) sind Bedienfluss im Sinne von §1 — für
eine blinde Bürgerin IST der zugängliche Name die Beschriftung — und fallen damit unter
die Regel.

## Konsequenzen

Zusicherung 7 der Prüfarchitektur wird gegen diesen Geltungsbereich gebaut und ist damit
prüfbar statt beschlossen. Sie ist vom ersten Lauf an grün; ihr Wert liegt nicht im Fund,
sondern darin, dass ein neuer Bedienfluss-Text ohne STRINGS-Bezug ab sofort auffällt.

Die Fixliste vom 27.07. nennt bei den 317 Texten weiterhin ADR-104 als offene Frage. Der
Verweis ist überholt und durch diesen ADR ersetzt.

**Ungemessen geblieben:** ob `vivodepot-lesen.html`, der VC-Issuer und der
Template-Generator dieselbe Verteilung tragen. Die Erhebung lief gegen `vivodepot.html`;
das Werkzeug nimmt `--datei` und kann die übrigen drei jederzeit messen.

## Konformität

```konformitaet
aussage:   Jeder Text des Bedienflusses — Meldung, Warnung, Fehler, Bestätigung,
           Hinweis — läuft über die STRINGS-Schicht. Feld-Beschriftungen und Titel
           aus Felddefinitionen fallen ausdrücklich nicht darunter.
zustand:   offen
frist:     2026-10-31
bedingung: Zusicherung 7 der Prüfarchitektur ist gebaut (Bauauftrag Block 3).
           Die Messung liegt vor — `tools/eigenschaften-z7-erheben.js` zählt null
           Bedienfluss-Texte ausserhalb der Schicht —, die Zusicherung selbst noch
           nicht. Bis dahin ist dieser Satz beschlossen und nicht bewacht.
```

**Nachtrag 04.08.2026 — die Bedingung ist inhaltlich erfüllt, `zustand` bleibt trotzdem bewusst auf
`offen`.** Fund einer Erhebung vom 04.08.2026, gegen den Bestand selbst nachgeprüft: `tools/eigenschaften.js` führt EP7 (`:478` ff., U2-ADR-112) seit
30.07.2026 als aktive, gepflanzte Probe mit Positiv-/Negativkontrolle
(`ARBEITSLISTE-v1.md` Posten A2, „ERLEDIGT 30.07.2026" — drei gefundene Verstöße behoben, Nachweis
0/0). **Warum `zustand` trotzdem nicht auf `geprüft` gehoben wird:** das ADR-098-Format bindet
`geprüft` an eine `herkunft:`/`pruefung:`-Zeile, die `tests/pruefstand-bindung.test.js`
(U2-ADR-099) maschinell gegen einen echten, benannten Test-Titel auflöst — EP7 lebt als
Eigenschaftsprüfung im `tools/eigenschaften.js`-Härtungsrahmen, ohne einen solchen Titel; eine
Bindung zu erfinden wäre selbst der Fehler, den diese Statuskorrektur beheben soll, ein neuer Test
wäre Bau, kein Text. Bleibt als offene Frage: `zustand: offen` mit erfüllter, aber
unmechanisierter Bedingung, oder ein eigener kleiner Folgeauftrag für die fehlende Testbindung.

---

**Nachtrag 27.08.2026 — Punkt 4 ist inzwischen beantwortet, ohne dass je ein eigener ADR folgte.**
Anlass: die Vorbereitung eines englischsprachigen Bürgermoduls (27.08.2026) stellte die Frage, ob
Feld-Beschriftungen jemals eine eigene Übersetzungsschicht bekommen, erneut als weiterhin offen.
Nachgeprüft, gegen den Code:

**Sie ist längst gebaut — nur nie in einem ADR festgehalten, derselbe Fehler wie bei U2-ADR-172
(Architektur gebaut, nie autorisiert dokumentiert).** Der docked-Sprachmodul-Mechanismus
(`_TEXTSATZ_MODUL_REGISTRY`, `textLesen`, `textsatzModulPruefen`) entstand am 17.08.2026 (Commit
`aefc3c0`, „A260: der Durchstich — Anzeigetexte liegen im Satz, nicht in der Definition") — **drei
Wochen nach diesem ADR, ein eigenständiger, später gebauter Mechanismus, den ADR-112 nicht kennen
konnte und dessen Geltungsbereich dieses ADR nie einschränkt.** `textLesen(kennung)`
(`vivodepot.html:9358`) ist die EINE generische Lesestelle für jede Kennung — ob
`strings:X.text` oder ein Feld-Label wie `mobilitaet.fahrzeuge.label`, macht dort strukturell
keinen Unterschied: erst der angedockte Satz der aktiven Sprache, dann `TEXTSATZ_EINGEBAUT`.
`_textsatzFeldFuellen`/`_TEXTSATZ_FUELLEN_FELD` (die Feld-Beschriftungen tatsächlich befüllen)
rufen exakt diese Stelle auf, keinen zweiten, feld-eigenen Lesepfad. Und `textsatzModulPruefen`
(`vivodepot.html:9199-9206`) nimmt Feld-Label-Kennungen ausdrücklich an: jede der (Stand heute)
1.264 bereits eingebauten Feld-Beschriftungs-Kennungen ist bereits ein gültiger Override-Schlüssel
für ein angedocktes Sprachmodul — seit dem ersten Commit dieses Mechanismus (`TEXTSATZ_EINGEBAUT`
enthielt die `.label`-Schlüssel schon vorher), nicht erst durch eine spätere Erweiterung.

**Was Punkt 2 dieses ADR entscheidet, bleibt unverändert gültig:** die STRINGS-Schicht selbst
(Zusicherung 7, Bedienfluss-Vollständigkeitsgarantie) deckt Feld-Beschriftungen weiterhin
ausdrücklich NICHT ab — das ist eine Aussage über den WÄCHTER, nicht über die
ÜBERSETZBARKEIT. Beide können gleichzeitig gelten: Feld-Beschriftungen brauchen keine
STRINGS-Vollständigkeitsprüfung (Punkt 2/3, unverändert) UND sind trotzdem, über einen anderen,
später gebauten Mechanismus, vollständig sprachvariant (Punkt 4, jetzt beantwortet).

**Bekannte, benannte Lücke — kein Widerspruch zu diesem Fund:** rund 280–345 Options-/
Vorschlagswerte (`optionen[].label`, `feld.vorschlaege`) tragen ihr Label weiterhin INLINE in der
Felddefinition statt in `TEXTSATZ_EINGEBAUT` — der Füll-Lauf überspringt jeden Knoten, dessen
`label` bereits ein nicht-leerer String ist (`_textsatzKnotenFuellenOhnePflicht`,
`vivodepot.html:9463-9469`). Diese Werte sind heute NICHT über ein Sprachmodul überschreibbar —
nicht, weil der Mechanismus sie ausschlösse, sondern weil sie ihn strukturell nie erreichen. Der
Kern selbst führt diese Zahl bereits (Kommentar `vivodepot.html:9533-9536`: „die Erhebung aus Zug
1 zaehlt 281 Optionswerte im Kern und 290 in der Lese-App") als bekannten, verfolgten Rückstand —
kein neuer Fund, aber ein neu bewerteter: er blockiert ein englisches Bürgermodul für JEDES Feld
mit Auswahloptionen (Geschlecht, Familienstand, Güterstand, u. v. a.), bis die betroffenen Werte
einzeln aus der Definition in `TEXTSATZ_EINGEBAUT` gehoben werden — derselbe Handgriff, den
`identitaet.familienstand/ledig.label` bereits vollzogen hat (Referenzfall, ein Optionswert von
281/290).

**Nachtrag 27.08.2026 (Fortsetzung) — die benannte Lücke ist geschlossen: 405 Optionswerte
gehoben, alle drei Vorlagen-Kataloge sind Teil des Textsatz-Baums.** `tools/textsatz-
optionslabel-heben.js` (neu, dieser Tag) hebt inline `optionen[].label`-Werte in
`TEXTSATZ_EINGEBAUT`, in zwei Zügen:

- **Zug 1 (359 Werte, Commit `7a26869`):** alle SEKTOREN-/SITUATIONEN-/WIZARDS-erreichbaren
  Optionswerte. Darunter, ohne eigenen weiteren Handgriff, PV_BMJ und KI_KORPUS — `pvwiz`/
  `kiwiz` spreizen `PV_BMJ.steps`/`KI_KORPUS.steps` per Objekt-Referenz (keine Kopie) in ihre
  `schritte[]`; `_textsatzAufWizardsAnwenden` erreicht diese Feld-Objekte darum bereits über den
  bestehenden Wizard-Weg, und dieselbe Hebung wirkt automatisch auch im Dokument-Generator
  (`_pvOptLabel`/`_kiOptLabel` lesen dasselbe, jetzt textsatz-befüllte Objekt).
- **Zug 2 (46 Werte, eigene Verdrahtung, Commit `3f6b3e1`):** `VOLLMACHT_BMJ.steps`
  war der einzige der drei Kataloge OHNE Wizard (vvwiz ist ersatzlos entfallen, U2-ADR-096) —
  seine Feld-Objekte waren für `_textsatzFeldFuellen` strukturell unerreichbar. Neue Funktion
  `_textsatzAufVollmachtBmjAnwenden`, aus `_textsatzOrteBegehen` aufgerufen, eigener
  Kennungsraum `vollmacht:<feldId>/<wert>.label` — bewusst NICHT dieselbe Kennung wie das
  gleichnamige Sektorfeld (`vorsorge.vorsorge_instrumente/<feldId>/<wert>.label`), weil beide
  einen unterschiedlichen Text tragen (generisches UI-Label „nein" vs. amtliche
  Dokument-Klausel „(nicht erteilt)").

`identitaet.familienstand/ledig.label` (Referenzfall oben) ist damit kein Einzelfall mehr,
sondern die Form aller 405 Werte. `tests/render-charakterisierung.test.js` und
`tests/k8-byte-gleichheit.test.js` bestätigen bytegleiches Rendering vor/nach beiden Zügen —
reine Quelle-wechseln-ohne-Wirkungsänderung, wie bei jeder Hebung dieser Art.

**Verbleibender, bewusst NICHT gehobener Rest:** drei vollständig eigenständige Kataloge
außerhalb dieses Baums — `ALT_LABEL_REGISTER` (archivarisches Register entfernter Felder,
U2-ADR-096-Konformitätsklausel, wird nie gerendert) und die generischen Vorschlagswerte
(`feld.vorschlaege`, nicht `optionen[].label`) — sind kein Teil dieser Hebung, weil sie
entweder nie sichtbar sind oder eine andere Form haben als der hier behandelte
Optionswert-Mechanismus. Kein bekannter Rest bei den drei Vorlagen-Katalogen (PV_BMJ/
KI_KORPUS/VOLLMACHT_BMJ) mehr.

*Vivodepot GmbH · Berlin · 28.07.2026*
