# U2-ADR-113: Das Testament trägt kein Prüfintervall

**Status:** Angenommen
**Datum:** 29.07.2026
**Kategorie:** DATENMODELL, WAHRHAFTIGKEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-025 (Vivodepot berät nicht) — am 29.07. als Grund benannt
**Anker:** `vivodepot.html:4826` (Katalogeintrag, Quelle der Begründung) · Messung A22
(Vorgabe je Instrumententyp, 29.07.) · Arbeitsliste A24, C7, C15
**Status heute:** gilt — die Katalogzeile steht unverändert im heutigen `vivodepot.html`
(`typ: 'testament', empfRhythmusMonate: null`, gemessen 15.08.2026, heute an anderer Zeile).

---

## Was hier entschieden wird

**Nur der Rang.** Die Entscheidung selbst existiert seit Langem und steht im
Katalog. Dieser ADR trifft sie nicht neu, er hebt sie aus einem Datenfeld in die
Entscheidungsreihe.

## Die Quelle, wörtlich

`vivodepot.html:4826`:

```js
{ typ: 'testament', name: 'Testament', empfRhythmusMonate: null,
  hinweis: 'Kein fester Rhythmus — bei Änderung der Lebensumstände (Heirat, Geburt, Trennung, Vermögen) prüfen.',
  felder: [{ sektorId: 'vorsorge', feldId: 'vorsorge_instrumente' }] },
```

Mehr sagt dieser ADR zur Sache nicht. Die Begründung steht dort und wird hier
nicht wiederholt und nicht erweitert — ein ADR, der mehr sagt als seine Quelle,
ist eine zweite Fassung derselben Entscheidung.

Von den sechs Instrumententypen ist das Testament der einzige mit
`empfRhythmusMonate: null` ⟦M⟧ (A22, 29.07.); vier tragen 12, einer trug am
Messtag gar keine Standard-Definition (Arbeitsliste B19).

## Warum das einen ADR braucht und ein `hinweis` nicht genügt

Ein Katalogeintrag ist Daten. Er überlebt keinen Umbau, der die Katalogform
ändert, und er wird beim Lesen nicht als Entscheidung erkannt — er sieht aus wie
ein fehlender Wert.

Genau das ist am 29.07. beinahe passiert: Die Messung A22 meldete das fehlende
Intervall als Befund neben einer echten Lücke (`sorgerechtsverfuegung` ohne
Standard-Definition), und die naheliegende Reparatur wäre gewesen, beide
gleich zu behandeln. Der Unterschied — hier eine Entscheidung, dort ein
Versäumnis — war nur sichtbar, weil jemand die Katalogzeile gelesen hat.

Ohne diesen Eintrag trägt in einem halben Jahr jemand ein Intervall nach, weil
die Lücke wie ein Versehen aussieht.

## Folgen

**Für die Prüftermine-Sicht:** Ein Testament erzeugt kein `faelligAm`
(`_prueftermineFaelligAm`, `vivodepot.html:15553`: ohne gesetztes Intervall keine
berechnete Fälligkeit) und damit keinen Prüftermin.

**Für den ICS-Export:** Ein Testament mit Datum erzeugt ein Dokument, aber keinen
Kalendereintrag. **Das ist der Sollzustand, nicht ein Defekt.** Die Abnahme von
C7 hält es ausdrücklich fest, damit es niemand repariert.

**Für den Prüfanlass selbst:** Er gehört auf die Ereignis-Achse der Anlasstests,
nicht in ein Zeitintervall — offen als Arbeitsliste C15.

## Verworfene Alternative

**Ein Jahresintervall wie bei den vier anderen Typen.** Verworfen am
29.07. mit Verweis auf U2-ADR-025: Vivodepot berät nicht. Ein erfundenes
Intervall wäre eine Empfehlung, und der Katalog nennt seit jeher den Anlass
statt einer Frist.

## Was dieser ADR NICHT entscheidet

Ob zwölf Monate für die übrigen Typen die richtige Vorgabe sind — und ob
Vivodepot überhaupt eine setzen darf. Das ist dieselbe Frage für alle und stand
als Arbeitsliste C16 offen. **Sie ist entschieden — s. Nachtrag.**

## Nachtrag (30.07.2026): C16 entschieden — der 12-Monats-Rhythmus bleibt

Entschieden, 30.07.2026: **Der 12-Monats-Prüfrhythmus bleibt Vorgabe für die
Instrumententypen, die ihn tragen** (die vier mit `empfRhythmusMonate: 12`).

**Kein Bau.** Der Default existiert bereits im Katalog und ist **je Dokument
änderbar** — genau das macht ihn berät-nicht-konform: es ist ein **Angebot, keine
Regel** (U2-ADR-025). Eine Vorgabe, die die Bürgerin ohne Weiteres ändern kann,
schreibt nichts vor; sie erspart nur das Nachschlagen im Regelfall. Damit ist die
zweite Hälfte der C16-Frage — „darf Vivodepot überhaupt eine setzen?" — beantwortet:
ja, solange sie änderbar bleibt und als Vorschlag auftritt, nicht als Frist.

**Das Testament bleibt ausgenommen** — Ereignis-Achse, kein Intervall (der
Beschluss dieses ADR; der Prüfanlass gehört auf die Ereignis-Achse, C15).

**B19 GEBAUT (30.07.2026):** `sorgerechtsverfuegung` hat jetzt eine Standard-Definition
mit `empfRhythmusMonate: 12` — dieselbe Vorgabe wie die vier Nachbartypen, kein Sonderfall.
Sie war von sechs Vorsorge-Instrumententypen der EINZIGE ohne Definition und bekam darum
weder Dokument noch Prüftermin; der Defekt war die Asymmetrie, nicht das Intervall. Additiv
angeglichen — über Weg 3 (C7/U2-ADR-118) registriert das Eintragen mit Datum jetzt ein
Dokument, die Prüftermine-Sicht zeigt „Nächste Prüfung" wie bei den Nachbarn. Kein Hinweis-
Text (keine belegbare Praxis-Aussage, wie Betreuungs-/KI-Verfügung), also keine neue Zahl in
Bürgertext. `fix-b19-sorgerechtsverfuegung.test.js` (rotmachbar: Definition entfernt → rot);
neun statt acht Standard-Dokumente. Suite 2181/0.

Damit ist C16 geschlossen; die Vorgabe ist bestätigt, nicht neu gebaut.
