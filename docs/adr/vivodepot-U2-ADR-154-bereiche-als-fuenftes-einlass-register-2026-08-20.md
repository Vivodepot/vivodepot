# U2-ADR-154: Bereiche sind das fünfte Einlass-Register — und ein angedockter Bereich kommt auf dasselbe Blatt

**Status:** Akzeptiert
**Datum:** 20.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL
**Grundlage:** Registerzeile A389 in `docs/ARBEITSLISTE-v1.md`; Produktentscheidung vom
20.08.2026: die Modularität wird vor v1 gebaut, die Pro-Version ist ihr Beispiel und Testfall.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `BEREICH_IDS_EINGEBAUT`, `bereichsModulPruefen`,
  `bereichsModulEinbetten`, `_bereichsModuleAusDepotAnmelden`, `bereicheAlle`,
  `_sektorIndexNeuBauen`, der fünfte Eintrag in `EINLASS_REGISTER`, Migrationsstufe 68 → 69,
  `_bereicheVerwaisteRetten` (Depot-Lesung), `_bereichSektionenModell` (der Weg aufs Blatt).
- **ADR-Bezug:** U2-ADR-145 (der EINE Einlassweg — hier das fünfte Register nach demselben
  Muster), U2-ADR-143 (die Bereichsliste hat eine Quelle, Schlüsselraum ID), U2-ADR-144 /
  U2-ADR-050 (Rettungsfeld-Muster: Umzug, keine Löschung — die Stufe dafür ist 63 → 64 und
  bleibt es), U2-ADR-146 (das vierte Register, dieselbe Begründung), U2-ADR-037 (angedockte
  Felddefinitionen), U2-ADR-142 / U2-ADR-141 (reservierte Kennungen, ein Modul ergänzt).
- **Status heute:** gilt — gebaut und belegt in `tests/bereichs-module-einlass.test.js`
  (13 Proben, vier davon Rot-Belege gegen mutierte Kern-Kopien).

---

## Der Befund

**Drei Vorrichtungen bewachten einen Fall, der nicht eintreten konnte.**

Seit dem 17./18.08. gilt: die Bereichsliste hat eine Quelle und den Schlüsselraum ID
(U2-ADR-143); unbekannte Bereichsschlüssel wandern samt ihren Definitionen in einen
Rettungsslot und zurück (U2-ADR-144); und was ein Bereich *kann*, steht als Eigenschaft an ihm
statt als Name im Code (`bereichKann`/`bereichRolle`), mit dem ausdrücklichen Kommentar „ein
angedockter Bereich läuft durch dieselbe Prüfung wie ein eingebauter".

**Nur: es gab keinen Weg hinein.** Der Einlassweg führte vier Register — Textsatz, Rechtsraum,
Institutions-Arten, Format-Kanäle. Ein Bündel konnte Beschriftungen, Rechtsräume, Arten und
Formate mitbringen, **nicht aber eigene Bereiche.**

**Der zweite Befund betrifft den Ausgang.** `_bereichSektionenModell` trägt im eigenen Kommentar,
sie sei die „EINE Lese-/Filter-Quelle für Gesamt-PDF, Pro-Bereich-PDF und QR-Datenschicht" — und
lief ausschließlich über `s.sektionen[].felder`, den Kern-Katalog. **Kein angedocktes Feld
erschien auf einem dieser Wege.** Am Bildschirm sichtbar, verschlüsselt in der eigenen Datei,
auf keinem Blatt, das man mitnimmt.

## Die Entscheidung

**1 · Bereiche werden das fünfte Einlass-Register.** Typ `bereich`, Slot
`data.bereichsModule[]`, dieselbe Prüfung-und-Slot-Unterscheidung wie die vier anderen und
**kein eigener Weg hinein** — die Zusage aus U2-ADR-145 Punkt 1.

**2 · Die Kennung ist die Herkunft des Bündels, nicht eine Bereichs-ID.** Ein Bündel bringt in
aller Regel mehrere Bereiche mit und muss beim Aktualisieren als EIN Gegenstand ersetzt werden;
sonst bliebe ein Bereich einer alten Fassung neben den neuen liegen.

**3 · Die zwölf eingebauten Kennungen sind reserviert.** Ein Modul ergänzt, es ersetzt nicht —
dieselbe Regel wie `'de'` beim Textsatz und `'DE'` beim Rechtsraum. Ein Bündel, das
`gesundheit` neu definieren dürfte, zöge einem Bestandsdepot die Bedeutung unter den Werten weg.

**4 · Die Schicht, nicht ihr erster Inhalt.** Ein angedockter Bereich bringt **keine** Sektionen
und keine Felder mit. Seine Felder kommen auf dem einen bestehenden Weg —
`data.feldDefinitionen[]` mit `sektorId`. Zwei Wege für Felder wären zwei Stellen, an denen die
Sensibel-Prüfung verschieden ausfallen kann.

**5 · Der Nachschlage-Index wächst mit — statt eines zweiten Index daneben.** `SEKTOR_BY_ID` ist
`let` und wird beim Anmelden neu gebaut. Ein zweiter Index wäre die 71. Lesestelle gewesen, an
der jemand die angedockten Bereiche vergisst. Jede einzelne Fassung bleibt eingefroren.

**6 · Die Rettung liest die Bereichsliste DES DEPOTS mit, nicht nur die Laufzeit-Registry.**
`depotNormalisieren` läuft auch dort, wo nichts angemeldet ist — beim Import, in Werkzeugen, in
Proben. Wer dort allein der Registry glaubte, räumte die Werte eines mitgereisten Bereichs in
den Rettungsslot und meldete das als Rettung.

**7 · Die Migrationsstufe 68 → 69 legt den Slot an und schreibt nichts um.** Und das ist eine
Aussage, keine Bequemlichkeit: der Fall, um den es bei einer austauschbaren Bereichsschicht geht
— Schlüssel, die die laufende Liste nicht kennt —, hat seine Stufe bereits (63 → 64), und die
Rettung selbst läuft seither bei jedem Öffnen. **Eine zweite Stufe für dieselbe Zusicherung wäre
die zweite Migration, die die Regel „eine Stufe, nicht zwei" verbietet.** Was diese Stufe ändert,
ist die Richtung: ein Bereich kann ab jetzt **zurückkommen**, weil ein Bündel ihn mitbringt.

**8 · Die angedockten Felder kommen auf dasselbe Blatt wie die Katalog-Felder — über dieselbe
eine Auflösung.** Die Zeilenregel in `_bereichSektionenModell` ist aus der Sektionsschleife
herausgezogen und wird von beiden Sorten benutzt; die Abschnitte kommen aus
`_templateAbschnitte` und `_templateDefAlsFeld`, also aus derselben Gruppierung wie am
Bildschirm. **Die Sensibel-Zurückhaltung gilt damit unverändert** — sie hängt an
`feldIstSensibel(feld, sektorId)`, an genau einer Stelle.

## Die Folgen, benannt

**Zwei der vier Verlustwege aus A350 bleiben offen, und derselbe Griff schließt sie nicht.**

- **Vollsicherungs-Rundlauf:** `_vollDepotFelder` baut den Wiederherstellungs-Plan aus
  `s.sektionen[].felder` **des übergebenen Depots** — nicht aus dessen `feldDefinitionen`.
  Gemessen am 20.08.: ein angedocktes Feld mit Wert taucht im Plan nicht auf, ein eingebautes
  schon. Der Griff wäre derselbe `_templateDefAlsFeld`, aber über eine andere Quelle (das
  übergebene Depot statt der laufenden `data`) — eine eigene Änderung, nicht diese.
- **Lese-App:** ihr `_TPL_RENDER_TYPEN` kennt vier Typen (`text`, `zahl`, `datum`, `auswahl`),
  der Kern neun. Ein angedocktes `textarea`-, `liste`- oder `ref`-Feld ist dort unsichtbar,
  unabhängig vom Blatt-Weg.

Beide sind gemessen und gemeldet, keiner ist mitgebaut — der Auftrag schließt sie ausdrücklich
aus.

---

*Vivodepot GmbH · 20.08.2026*
