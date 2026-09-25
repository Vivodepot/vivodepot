# U2-ADR-115: Die elfte Anlass-Kachel — Umzug

**Status:** Angenommen
**Datum:** 29.07.2026
**Kategorie:** UX, PRODUKT
**Linie:** U2
**U2-Bezug:** U2-ADR-096 (der entfernte `erbwiz` — warum eine Kachel ohne Ziel schlimmer ist als
keine Kachel) · A37 in `docs/ARBEITSLISTE-v1.md`
**Status heute:** gilt — die Kachel `id: 'umzug', klasse: 1, icon: 'home', ziel: { wizard:
'umzwiz' }` steht unverändert in `ANLAESSE`, `umzwiz` existiert weiter (gemessen 15.08.2026).

---

## Kontext

**Gemessen 29.07.2026 ⟦M⟧:** `ANLAESSE` führte zehn Kacheln, und `umzwiz` war der einzige
Ereignis-Wizard **ohne eigenen Einstieg**. Erreichbar war er allein über den Startknopf in den
Bereichen 1, 9 und 11 — also nur für jemanden, der bereits weiß, dass es ihn gibt und wo.

**Eine Prämissenkorrektur gehört an den Anfang, weil sie diesen ADR erst begründet.** Der
Auftrag nannte U2-ADR-022 als den ADR, der „zehn Kacheln festgeschrieben" habe, und verlangte
dort einen Nachtrag. Gemessen: **U2-ADR-022 behandelt die Personen-Vereinheitlichung und nennt
die Kacheln nicht**, und **kein anderer ADR schreibt ihre Zahl fest** — weder „zehn" noch
`ANLAESSE` kommt in `docs/adr/` vor. Die Zehn war eine Tatsache des Quelltextes, keine
festgeschriebene Entscheidung. Ein Nachtrag an U2-ADR-022 hätte die Begründung an einem
thematisch fremden Ort abgelegt; deshalb ein eigener ADR. Der Zweck der Anweisung — **keine
stille elfte Kachel** — ist damit erfüllt, der genannte Ort war es nicht.

## Entscheidung

**1 — `umzug` bekommt eine eigene Anlass-Kachel** (Entscheidung 29.07.):

```js
{ id: 'umzug', klasse: 1, label: 'Umzug oder Haushaltsauflösung', icon: 'home',
  ziel: { wizard: 'umzwiz' } }
```

**2 — Die Begründung ist die Zielgruppe, nicht die Vollständigkeit.** Für die Menschen, für die
Vivodepot gebaut ist, ist der Umzug meist der **Einzug ins Heim** oder die **Auflösung des
Elternhaushalts** — einer der dichtesten Dokumentenmomente überhaupt. Ein Assistent, den nur
findet, wer sich in der App schon auskennt, ist für diese Gruppe **nicht vorhanden**. Das ist
der Unterschied zwischen „existiert" und „erreichbar", und er entscheidet hier alles.

**3 — Kein toter Einstieg.** `umzwiz` existiert als vollständige Wizard-Definition
(`vivodepot.html`, `titel: 'Umzug'`). Das ist die Lehre aus U2-ADR-096: der entfernte `erbwiz`
hätte als `ziel.wizard` eine Kachel erzeugt, die ins Leere führt — dieselbe Klasse wie die
kiwiz-Sackgasse. Eine Kachel wird nur gesetzt, wenn ihr Ziel gemessen vorhanden ist.

**4 — `klasse: 1`, Icon `home`.** Klasse 1 sind die Lebensereignisse (Geburt, Volljährigkeit,
Hauskauf, Notartermin); der Umzug gehört dorthin und nicht zu den Gesundheitsanlässen. Das Icon
führt der Wizard selbst; ein eigenes Umzugs-Symbol gibt es im Satz nicht und wäre ein eigener
Posten, kein Teil dieser Entscheidung.

## Konsequenzen

**Die Zahl der Kacheln ist ab jetzt eine Entscheidung, nicht ein Zustand.** Bis heute stand sie
nur im Quelltext; wer sie ändern wollte, änderte sie. Dieser ADR macht sie erklärungspflichtig
— eine zwölfte Kachel braucht ihre eigene Begründung, so wie diese elfte.

Ungemessen: ob die elf Kacheln auf kleinen Geräten noch ohne Scrollen erfassbar sind. Die
Trefferflächen-Ebene deckt die Größe ab, nicht die Menge; das ist eine Frage für die
Testerrunde (E1), nicht für Node.

## Konformität

**Bewusst ohne `konformitaet`-Block, und das ist gemessen, nicht vergessen.** Die Aussage
„jede Anlass-Kachel zeigt auf ein Ziel, das es gibt" ist bereits geprüft — von
`tests/anlass-routing-ziel.test.js`, vier Prüfungen, darunter die für `ziel.wizard`. Sie hier
als Klausel zu binden hätte sie zu einem **Wächter ohne gekoppelte Probe** gemacht (§7.5) und
den Prüfstand-Zähler `fundstellen` erhöht, dessen Richtung „sinkt" ist. Die Datei liegt nach
Regel 7 in Testsuite-CCs Gegenstand; die Kopplung ist dort als Zeile gebucht statt hier
erzwungen.

Ungemessen: ob die elf Kacheln auf kleinen Geräten noch ohne Scrollen erfassbar sind. Die
Trefferflächen-Ebene deckt die Größe ab, nicht die Menge; das ist eine Frage für die
Testerrunde (E1), nicht für Node.

---

*Vivodepot GmbH · Berlin · 29.07.2026*
