# U2-ADR-202: Die Live-Sichtbarkeits-Verdrahtung im Listen-Eintrag-Modal kennt `verborgenWenn`

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** DATENINTEGRITÄT, KORREKTUR
**Linie:** U2
**Anker:** Freigegeben, 01.09.2026. Gefunden beim Bau der
Betreuung-Datengestalt (U2-ADR-201, Zug 1) — kein Datengestalten-Thema, ein eigenständiger,
vorher unentdeckter Bug mit Datenrisiko. Eigener Commit, eigene Nummer, wie angewiesen.
**Status heute:** gilt — behoben, mit Rot-Beweis an der Zeile, die den Schaden trägt (nicht an
einer Vorbedingung).

---

## Kontext

`_listenEintragBedingungVerdrahten` (`vivodepot.html`) blendet Unterfelder eines
Listen-Eintrags LIVE ein/aus, während das Hinzufügen-/Bearbeiten-Modal offen ist — ohne diese
Verdrahtung bliebe der Sichtbarkeitsstand auf dem Stand des Modal-Öffnens eingefroren. Ihr
Wächter-Vorlauf prüfte bislang nur, ob irgendein Unterfeld `sichtbarWenn` trägt:

```js
if (!unterFelder.some(uf => uf.sichtbarWenn)) return;   // nichts Bedingtes → keine Verdrahtung
```

`verborgenWenn` (das NEGATIVE Gegenstück, eingeführt mit U2-ADR-109 — „ein Feld wird versteckt,
NUR wenn die Diskriminante einen der genannten Werte trägt, fehlt sie, bleibt alles sichtbar")
kam später dazu und wurde in diesem einen Guard vergessen. `feldSichtbar()` selbst — die
Funktion, die `verborgenWenn` UND `sichtbarWenn` tatsächlich auswertet — kennt und behandelt
beide Formen korrekt und unverändert; nur der Wächter, der entscheidet, ob überhaupt live
neu bewertet wird, kannte nur die erste.

**Gemessen, nicht vermutet, welche Listen betroffen sind:** ein Durchlauf über den gesamten
`SEKTOREN`-Feldbaum (jede `typ:'liste'`-Definition mit `unterFelder`) findet genau **eine**
betroffene Liste — `meine-menschen.kinder` (U2-ADR-109). Ihre bedingten Unterfelder
(`sorgerecht_kind`, `sorgerecht_kind_zusatz`, `betreuungsmodell`, `in_ausbildung`,
`ausbildung_ende`, `geburtsurkunde_ort`, `vertretung_art`, `aufgabenbereiche`,
`betreuungsgericht`, `aktenzeichen`, `bestellt_seit`) tragen ausschließlich `verborgenWenn` —
kein einziges trägt `sichtbarWenn`. Der Guard kehrte für diese Liste darum bei jedem Öffnen
sofort zurück: kein `change`-/`input`-Listener, nicht einmal der initiale
`neuBewerten()`-Aufruf.

**Der Schaden ist nicht nur kosmetisch.** Bei einer NEUEN Zeile ist `art` beim Öffnen des
Modals noch nicht gesetzt — `verborgenWenn` greift gegen `undefined` nie, alle Unterfelder
starten sichtbar. Ohne die Live-Verdrahtung bleiben sie es, unabhängig davon, welche `art` man
danach wählt. `liesEintragAusDOM` (`vivodepot.html`) sammelt nur, was `zeile.hidden` NICHT ist
— und `hidden` wurde nie gesetzt. Ergebnis: bei `art='leiblich'` eingetragene
Betreuungsgericht-/Aktenzeichen-Werte (die nur für `betreuter_erwachsener` gelten sollen)
werden tatsächlich mitgespeichert, obwohl sie im Formular für diese Art gar nicht sichtbar
sein sollten. Aus `betreuerbestellung`/Vertretungsangaben erzeugt Vivodepot Dokumente, die
eine Bürgerin einer Behörde vorlegt — eine falsche Angabe dort ist kein Anzeigefehler.

## Entscheidung

**Der Guard prüft jetzt beide Gate-Formen:**

```js
if (!unterFelder.some(uf => uf.sichtbarWenn || uf.verborgenWenn)) return;
```

`feldSichtbar()` selbst bleibt unverändert — sie behandelte `verborgenWenn` bereits korrekt,
nur der Aufrufer erreichte sie nie. Kein zweiter Mechanismus, keine Sonderbehandlung für
`kinder` — derselbe Wächter, jetzt vollständig.

## Reichweite geprüft, nicht angenommen

Zwei unabhängige Messungen (ein Durchlauf über den geladenen `SEKTOREN`-Baum via
`tests/load-kern.js`, und ein zweiter, reiner Text-Scan über jeden `unterFelder:`-Block in
`vivodepot.html`) kommen auf dasselbe Ergebnis: **`meine-menschen.kinder` ist die einzige
betroffene Liste.** Jede andere Liste mit bedingten Unterfeldern trägt mindestens ein
`sichtbarWenn`-Feld (auch wenn sie zusätzlich `verborgenWenn`-Felder führt) — der alte Guard
ließ diese Listen darum korrekt passieren, `feldSichtbar()` wertete `verborgenWenn` dort schon
immer richtig aus.

## Bestandsdaten

**Nicht migriert — nur geprüft, ob erkennbar.** Ein bereits gespeicherter, durch diesen Bug
verwaister Wert (z. B. `betreuungsgericht` an einer `art='leiblich'`-Zeile) ist über den
BEREITS BESTEHENDEN, generischen Mechanismus erkennbar: `zeileVerwaisteFelder(feld, zeile)`
(`vivodepot.html`) läuft für jede Liste mit `unterFelder` — unabhängig von Gate-Form — und
wird an drei Stellen bereits aufgerufen (Wechselmoment-Hinweis beim Ändern einer Zeile,
Import-Bereinigungs-Angebot U2-ADR-102). Eine bestehende `kinder`-Zeile mit einem verwaisten
Betreuungsgericht-Wert zeigt darum den bekannten Wechselmoment-Hinweis, sobald sie das nächste
Mal geöffnet/geändert wird — kein neuer Code nötig, derselbe Satz, der auch bei jeder anderen
Liste erscheint. Keine rückwirkende Bereinigung gebaut (Auftrag: nur benennen).

## Konformität

```konformitaet
aussage:   Die Live-Sichtbarkeits-Verdrahtung im Listen-Eintrag-Modal blendet Unterfelder mit
           `verborgenWenn` korrekt ein/aus, während das Modal offen ist — nicht erst nach dem
           Neu-Öffnen. Ein Wert, der zum Zeitpunkt des Speicherns in einem durch `verborgenWenn`
           unsichtbaren Feld steht, wird NICHT mitgespeichert.
zustand:   geprüft
quelle:    invariante
pruefung:  tests/e2e/fix-kinder-verborgenwenn-live-verdrahtung.spec.js#[U2-ADR-202 · Rot-Beweis] ein Wert, der bei der Speicherung unsichtbar ist, landet NICHT im Depot
```

**Rot-Beweis gefahren, nicht nur behauptet:** der Guard probeweise auf die alte Form
(`uf.sichtbarWenn` allein) zurückgesetzt — beide Proben liefen rot, jeweils an ihrer eigenen
Assertion (Sichtbarkeits-Probe an der `toBeHidden()`-Zeile, Rot-Beweis-Probe am
`expect(gespeichert.betreuungsgericht).toBeUndefined()`, mit dem tatsächlich geleakten Wert
`"TEST-Sollte-nicht-gespeichert-werden"` in der Fehlermeldung). Danach exakt zurückgenommen,
beide wieder grün.

---

*Vivodepot GmbH · Berlin · 01.09.2026*
