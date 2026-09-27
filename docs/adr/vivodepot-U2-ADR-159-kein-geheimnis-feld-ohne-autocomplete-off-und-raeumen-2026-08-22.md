# U2-ADR-159: Kein Feld, das Geheimnisse aufnimmt, ohne `autocomplete="off"` UND explizites Räumen beim Laden

**Status:** Akzeptiert
**Datum:** 22.08.2026
**Kategorie:** SICHERHEIT, WERKZEUGE
**Grundlage:** Fund während der laufenden Schlüsselzeremonie, 22.08.2026
(interner Vermerk vom 22.08.2026, Nachtrag „Zweitens").
- **Code-Stelle:** `vivodepot-schluessel-teilen.html` — `felderRaeumen()`, aufgerufen aus
  `document.addEventListener('DOMContentLoaded', () => { felderRaeumen(); boot(); })`;
  alle Eingabefelder tragen zusätzlich `autocomplete="off"`.
- **Geltungsbereich:** jedes eigenständige Werkzeug, das Schlüsselmaterial, Passwörter oder
  andere Geheimnisse als Freitext oder Datei-Eingabe entgegennimmt — mindestens
  `vivodepot-schluessel-teilen.html`, `vivodepot-vc-issuer.html`, `vivodepot-template-generator.html`,
  `vivodepot.html`.
- **Status heute:** gilt in `vivodepot-schluessel-teilen.html`, belegt in
  `tests/schluessel-teilen-werkzeug.test.js` (42 Proben). Nachzug in den übrigen genannten
  Werkzeugen ist NICHT Teil dieser ADR — offener Posten, s. „Was NICHT in dieser ADR steht".

---

## Kontext

**Der Fund:** Nach einem Neuladen der Seite standen zuvor eingegebene Anteilswerte wieder in
den Formularfeldern — die Formularwiederherstellung des Browsers. Das Feld trug zu diesem
Zeitpunkt kein `autocomplete="off"`.

**Ein Anteilswert, der nach dem Schließen des Fensters noch abrufbar ist, hebt die Aufteilung
auf.** Der Sinn eines Schlüssel-Anteils ist, dass er allein wertlos ist und nach der Zeremonie
nirgends mehr im Klartext herumliegt — auch nicht im Wiederherstellungs-Speicher des eigenen
Browsers.

**`autocomplete="off"` allein reicht nicht.** Die Sitzungswiederherstellung mancher Browser
(Neuladen, Tab wiederherstellen nach Absturz) greift daran vorbei und stellt den zuletzt
eingegebenen Wert trotzdem wieder her.

## Entscheidung

**Jedes Feld, das ein Geheimnis entgegennimmt, braucht beides:**

1. `autocomplete="off"` am Feld selbst — verhindert die gewöhnliche Autofill-Vorschlagsliste.
2. **Ein explizites Räumen der Werte beim Laden der Seite**, bevor irgendein anderer
   Boot-Schritt läuft — verhindert, dass die Sitzungswiederherstellung des Browsers das
   Autocomplete-Attribut umgeht.

**Reihenfolge bindend:** das Räumen steht vor `boot()` (oder der jeweiligen Boot-Funktion), nicht
danach — ein Wert, der erst nach dem ersten Render sichtbar wird und dann gelöscht wird, war
für einen kurzen Moment trotzdem auf dem Bildschirm.

## Was als „Geheimnis" gilt

Schlüsselmaterial (privat oder Anteil), Passwörter, PINs, und jeder Freitext, der zusammen mit
anderen Anteilen oder Faktoren einen Schlüssel oder Zugang ergibt. **Nicht** gemeint sind
Felder, deren Inhalt ohnehin für die Kennzeichnung gedacht ist (z. B. die Rolle/Fassungs-Kennung
`feld-rolle` in `vivodepot-schluessel-teilen.html` — kein Geheimnis, kein Anteil).

## Was NICHT in dieser ADR steht

**Der Nachzug in den übrigen genannten Werkzeugen.** Diese ADR hält die Regel fest, an der
Stelle, wo der Fund gemacht wurde. Ob `vivodepot-vc-issuer.html`, `vivodepot-template-generator.html`
und `vivodepot.html` an ihren jeweiligen Geheimnis-Feldern schon beides tragen, ist hiermit
**nicht geprüft** — das ist ein eigener Messschritt, kein Bau dieser ADR.

**Eine automatisierte Prüfprobe über alle Werkzeuge hinweg.** Ein Wächter, der bei jedem neuen
`type="password"`-artigen Feld beides erzwingt, wäre die konsequente Fortsetzung — hier bewusst
nicht gebaut, um diese ADR auf den belegten Fund zu beschränken.

---

*Vivodepot GmbH · 22.08.2026*
