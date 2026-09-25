# U2-ADR-220: der Sicherungsdatei-Namens-Hinweis verspricht nicht mehr, was er nicht halten kann

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** UX, WAHRHAFTIGKEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-212 (Sichern-Knopf folgt Speicher-Modus — der Fund entstand bei der
Firefox-Nachmessung dieses ADRs).
**Anker:** Im echten ausgelieferten v501 (Firefox, gehostet), gemeldet: „ich
kann zwar auf die bestehende sichern; aber es ist trotzdem eine neue Datei." Gemessen
(Playwright/Firefox, `playwright-core`, echter v501-Stand 767fe70, kein FSA-Mock — Firefox hat
`showSaveFilePicker` nachweislich nicht: `typeof window.showSaveFilePicker === 'undefined'`).
**Status heute:** gilt — Beleg `tests/persistenz-status.test.js` (PS12-1..3).

---

## Kontext

Der Nicht-FSA-Namens-Dialog (`_dateiNameErfragen()`, öffnet aus `_dateiNameSicherstellen()`)
trug den Satz: „Tipp: Sichern Sie künftig über dieselbe Datei und ersetzen Sie die vorige — so
behalten Sie immer eine aktuelle Sicherung." Der Code selbst dokumentiert im Kommentar direkt
darüber, seit dem 09.08.2026 unverändert: „Genau dieser Dialog ist der Weg, auf dem
Firefox/Safari/Touch JEDES Sichern eine neue Datei anlegen." Der Satz und der Kommentar stehen
sich seit Wochen wörtlich entgegen — niemand hatte das zusammengelesen, bis die eigene Nutzung
es sichtbar machte.

Die Ursache ist keine Vivodepot-Lücke: Firefox und Safari bieten keinen Web-Mechanismus, der eine
zuvor gewählte Datei erneut beschreibt. Ein `<a download>`-Anker — der einzige Downloadweg, den
beide Browser kennen — kann nicht in eine bestehende Datei zurückschreiben; beide Browser hängen
bei Namensgleichheit von sich aus „(1)" an, um ein stilles Überschreiben zu verhindern. Das ist
eine bewusste Browser-Sicherheitsgrenze, keine Lücke.

## Entscheidung

**1 — Neuer Wortlaut, kein Entwurf:** „Jede Sicherung legt eine neue Datei an.
Ältere dürfen Sie danach löschen." Sagt nur, was zutrifft, an genau der Stelle, an der es
erscheint.

**2 — Keine neue Verzweigung.** Geprüft: `_dateiNameErfragen()` hat genau einen Aufrufer
(`_dateiNameSicherstellen()`), und der erreicht sie ausschließlich hinter
`if (hatDateiSpeichernPicker() || _dateiName) return true;` — der Nicht-FSA-Fall ist an dieser
Stelle bereits erzwungen. Eine zusätzliche `hatDateiSpeichernPicker()`-Prüfung im Hinweistext
selbst wäre ein Zweig, der nie den anderen Wert annimmt — keine echte Bedingung, nur eine
Verschleierung. Der Satz gilt darum unbedingt, mit einem Kommentar, der die Reichweite festhält
(und einer Struktur-Probe, die sie hält, s. Konformität).

**3 — EN-Übersetzung parallel ergänzt** (`tools/textsatz-en-vollabdeckung-daten.js`).

**4 — Der Speichern→Sichern-Terminologie-Tracker (`tests/s4-begriffsliste-wortlaut.test.js`)
verliert diesen Eintrag.** Er verfolgte eine Wortwahl (Speichern vs. Sichern), keinen
Aussagewechsel — der neue Satz ist inhaltlich ein anderer, keine dritte Terminologie-Fassung des
alten. Eigene Probe hier statt eine fremde Spur zu verbiegen.

## Konsequenzen

**Geltungsbereich außerhalb dieses ADRs geprüft, nicht erweitert:** ob `docs/aussenaussagen.md`
App-Texte überhaupt erfasst (oder nur Website/Whitepaper), ist eine offene Frage —
dieses ADR trifft dazu keine Entscheidung, s. Bericht.

**Der größere Befund bleibt offen, bewusst getrennt:** dass EIN Klick auf „Jetzt sichern"
wie „geht nicht" wirkte, obwohl der interne Speicher (U2-ADR-212) den Stand bereits
sicher hatte, ist ein UX-/Auto-Save-Befund — eigener Auftrag, eigenes ADR, nicht Teil dieser
Korrektur.

## Konformität

```konformitaet
aussage:  dateiNameHinweis trägt den neuen Wortlaut und verspricht nicht mehr, dieselbe Datei zu
          ersetzen.
zustand:  geprüft
herkunft: entscheidung
pruefung: tests/persistenz-status.test.js#PS12-1: dateiNameHinweis trägt den neuen, ehrlichen Wortlaut
pruefung: tests/persistenz-status.test.js#PS12-2: dateiNameHinweis verspricht NICHT mehr, dieselbe Datei zu ersetzen
```

```konformitaet
aussage:  _dateiNameErfragen() (und damit der Hinweistext) bleibt ausschließlich über den
          Nicht-FSA-Zweig erreichbar — die Reichweiten-Begründung im Kommentar hält.
zustand:  geprüft
herkunft: invariante
pruefung: tests/persistenz-status.test.js#PS12-3: _dateiNameErfragen() ist weiterhin ausschließlich über den Nicht-FSA-Zweig erreichbar — keine verdeckte zweite Route
```

---

*Vivodepot GmbH · Berlin · 02.09.2026*
