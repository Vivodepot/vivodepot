# U2-ADR-330 · Teil 0 — der Beratungshilfe-Auszug führt die Personen-Angaben mit

**Datum:** 06.09.2026
**Status:** gebaut, fünf Lese-App-Proben grün, davon einer in beide Richtungen rot beweisend
**Status heute:** gilt. Die Demonstration des Vor-Sammelns ist damit an ihrer schwächsten Stelle
geschlossen.
**Bezug:** U2-ADR-326 (das generische Auszugs-Tor und der Beratungshilfe-Auszug; §13 dort nennt
diese Lücke selbst) · U2-ADR-288 (Ab-Werk-Einlass) · U2-ADR-037 (Definition und Wert wohnen
getrennt) · die interne Abschnitts-Erhebung vom 30.08.2026 (`persoenlicheDaten`: „1:1 identisch mit
`identitaet`-Feldern, die es schon gibt")

---

## 1 · Warum das der Posten war, nicht ein Rest

U2-ADR-326 §13 zählte die Abdeckung selbst: drei von sechs Abschnitten des Antrags berührt,
`persoenlicheDaten` **nicht im Auszug** — obwohl die Angaben im Depot liegen.

**Der Zweck des Templates ist die Demonstration des VOR-SAMMELNS.** Ein Auszug, der Einkommen und
Rechtsproblem führt, aber Name und Anschrift nicht, lässt die Stelle ausgerechnet das erfragen, was
jedes Depot ohnehin hat. **Das war die schwächste Stelle der Demonstration und die sichtbarste.**

## 2 · Was gebaut ist

**Teil 0 — die Person**, vor Teil A, sechs Einträge im `datenSchema` des Bündels:

```
person_vorname       feld       identitaet.vorname
person_nachname      verbinden  nachname + nachname2        Trenner " "
person_geburtsdatum  feld       identitaet.geburtsdatum
person_anschrift     verbinden  strasse + plz_ort           Trenner ", "
person_telefon       feld       identitaet.telefon
person_email         feld       identitaet.email
```

**Kein zweiter Mechanismus:** `verbinden` ist derselbe Typ, den der Erbschein-Auszug für den
Lebensmittelpunkt nimmt. Gemessen, nicht angenommen: leere Teile fallen sauber heraus
(„Wredenhagen" ohne Trailing-Space), ist alles leer, entsteht gar kein Wert — und die
bündeleigene Lücke greift.

**Vor- und Nachname stehen GETRENNT, wie das Antragsformular sie erfragt**, nicht als
zusammengesetzter Anzeigename. Der Auszug behauptet damit keine Namensreihenfolge:
`familienname_zuerst` (U2-ADR-256) ändert die Anzeige im Depot, nicht die Zuordnung im Antrag. Der
Satz steht im Auszug selbst, nicht nur hier.

## 3 · Die Sensibel-Frage — die Prämisse war falsch, die Auflage bleibt

**Erwartet war: „alles sensibel oder halbsensibel, jeder Eintrag braucht `sensibelErlaubt: true`".
Gemessen am Schema ist das nicht so:**

```
vorname · nachname · nachname2 · familienname_zuerst · geburtsdatum · geburtsjahr
strasse · plz_ort · telefon · email                    ->  sensibel: FALSE, alle zehn
geburtsname                                            ->  sensibel: true
                                                           (gehoert nicht zu den Antragsangaben)
```

**Die sechs Einträge tragen darum KEIN `sensibelErlaubt` — und das ist keine Auslassung, sondern
die richtige Aussage.** Die Erlaubnis ist eine Aussage des Moduls über sich selbst (U2-ADR-326 §8);
wo nichts Sensibles gelesen wird, wäre sie eine falsche. **Der Beleg ist der Einlass selbst:**
`logikModulPruefen` nimmt das Bündel mit **null** verworfenen Schlüsseln an.

**Die Rückhaltung hat trotzdem einen Gegenstand, nur einen anderen: die BÜRGERIN.** Sie kann jedes
Feld selbst als sensibel markieren (`data.sensibelFelder`).

**⚠ DIE FORM IST NICHT BELIEBIG, und der Unterschied ist still.** Gemessen:

```
{ identitaet: { nachname: true } }   verschachtelt   ->  WIRKT, der Wert wird zurueckgehalten
{ "identitaet.nachname": true }      punktiert       ->  wirkt NICHT, der Wert erscheint
```

**Beide Formen sehen richtig aus, keine wirft, keine meldet etwas.** Wer die punktierte schreibt,
hält sein Feld für geschützt — und es steht offen im Auszug. Das ist kein Randbefund dieses Zuges,
sondern eine Falle für jeden, der `sensibelFelder` künftig von Hand oder aus einem Import befüllt.

**Der Rot-Beweis läuft darum über die Übersteuerung — und in BEIDE Richtungen:**

```
markierte Angabe verschwindet                              ROT bewiesen
die uebrigen bleiben VOLLSTAENDIG stehen                   ROT bewiesen
  (Vorname, Geburtsdatum, Anschrift, Telefon einzeln nachgezaehlt)
```

**Eine Rückhaltung, die die Nachbarn mitnimmt, wäre so falsch wie keine.** Das ist die Probe, die
ohne die gekippte Prämisse nicht entstanden wäre.

## 4 · Der Verschub der eingefrorenen Aufnahme

**Eine Aufnahme verschiebt sich, nicht drei** — die Kostenschätzung vor dem Bau war zu hoch:

```
tests/fixtures/golden-master-ausgabewege-baseline.json   202+/0-, rein additiv
  keine einzige entfernte Zeile — nachgesehen, wie die Datei es verlangt

render-aufnahme/          UNVERAENDERT  (das Kaertchen aendert sich nicht, nur der Inhalt)
e4-depot-zustand-…        UNVERAENDERT
paket0-migrationsbeleg-…  UNVERAENDERT  (kein neues Feld, keine neue Zeile —
                                         die Zuwachsliste bleibt, wie sie ist)
```

Der Verschub steht als eigener Abschnitt in der Commit-Nachricht, nicht als eigener Commit — die
korrigierte Regel aus U2-ADR-326 §10 gilt hier für ihren eigenen Urheber.

## 5 · Was jetzt gedeckt ist — und was weiterhin nicht

```
persoenlicheDaten      GEDECKT       Name, Geburtsdatum, Anschrift, Telefon, E-Mail
finanzielleAngaben     teilweise     nicht: Kinder-Finanzen, Partner-Finanzen als eigene Posten
rechtsproblem          teilweise     nicht: Rechtsgebiet, Beschreibung, Ziel
anwaltlicheVertretung  teilweise     nicht: Kontaktdaten
grundvoraussetzung     bewusst nicht Eignungsfragen, keine dauerhafte Tatsache
weitereAngaben         bewusst nicht Freitext der Vorlage
```

**Vier von sechs Abschnitten berührt, einer davon jetzt vollständig.** Die zwei bewusst
ausgelassenen bleiben ausgelassen: sie sind Vorlagen-Logik, kein Depot-Bestand.

**Kein neues Feld, keine Änderung am Bürgermodul.** Dieser Zug liest nur, was seit jeher da ist —
und das ist der Punkt: **das Vor-Sammeln braucht keinen neuen Bestand, sondern einen Auszug, der
den vorhandenen mitführt.**
