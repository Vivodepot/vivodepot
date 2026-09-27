# U2-ADR-334: Die Beschriftung eines angedockten Bereichs erreicht den Empfänger in seiner Sprache

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot-lesen.html` (`_istBereichLabelKennungLesen`, `_textsatzKennungBekannt`),
`tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js`

- **Status heute:** gilt — ein Sprachmodul kann die Beschriftung eines **angedockten** Bereichs
  setzen; die eines **eingebauten** nicht.

---

## Der Befund

Seit U2-ADR-323 erscheinen angedockte Bereiche beim Empfänger — mit der Beschriftung aus dem Modul.
**Der Textsatz der Lese-App erreichte sie nicht.** Ihr Kennungsraum ließ nur
`strings:<schlüssel>.text` für Schlüssel der eigenen Tabelle zu; eine Bereichs-Kennung wurde bei der
Anmeldung benannt verworfen.

**Warum das kein Randfall ist.** Die Sprachachse ist offen und war es immer: Englisch, Arabisch,
Georgisch, Chinesisch, afrikanische Sprachen. **Für keine davon ist ein deutscher Bereichsname „die
falsche Sprache" — er ist für die Empfängerin unlesbar.** Die Schreibrichtung wendet die Lese-App
längst an (`textsatzSchreibrichtungAnwenden`); nur der Name blieb deutsch.

## Was gebaut ist: ein Prädikat, wörtlich gespiegelt

Der Maßstab ist **nicht mehr und nicht weniger als der Kern**. Der Kern prüft jede Kennung gegen
drei benannte Prädikate; das dritte fehlte hier:

```js
function _istBereichLabelKennungLesen(kennung) {
  if (typeof kennung !== 'string') return false;
  if (!kennung.endsWith('.label')) return false;
  const id = kennung.slice(0, -'.label'.length);
  return _BEREICH_ID_FORM_LESEN.test(id) && BEREICH_IDS_EINGEBAUT_LESEN.indexOf(id) < 0;
}
```

**Der Riegel ist die letzte Zeile.** Ein Modul beschriftet den Bereich, den es selbst mitgebracht
hat — niemals `identitaet`, `gesundheit`, `vorsorge`.

**Und die Sperre ist abgeleitet, nicht danebengepflegt:** `BEREICH_IDS_EINGEBAUT_LESEN` entsteht aus
`SEKTOREN` (U2-ADR-323). Weicht der native Bestand — und er wandert gerade ins Bündel —, weicht die
Sperre mit, statt Module aus ihrem eigenen Bereich auszusperren. Eine Probe prüft **jede** eingebaute
Kennung, nicht eine Stichprobe.

**Gegen den Kern gemessen, nicht gegen eine abgeschriebene Erwartung:** eine Probe hält
`_istBereichLabelKennungLesen` und `_istBereichLabelKennung` über eine Reihe von Fällen
gegeneinander — gültige und ungültige Form, eingebaute und angedockte Kennung, falsche Endung.

## Die Reihenfolge war nicht beliebig

**Bis U2-ADR-331 konnte ein fremdes Modul in einer nicht eingebauten Sprache die Sätze
überschreiben, mit denen die Anwendung über ihren eigenen Zustand spricht.** Den Kennungsraum in
diesem Zustand zu öffnen, hätte die schärfere Lücke geweitet, statt die harmlosere zu schließen.

**Erst schließen, dann weiten.** Eine Probe hält fest, dass beide Prädikate an derselben Stelle
greifen und die Zusicherungs-Sperre unberührt bleibt: im selben Modul kommt die Beschriftung durch
und der Zusicherungs-Satz nicht.

## Konformität

```yaml
konformitaet:
  - aussage: >-
      Ein Sprachmodul kann die Beschriftung eines angedockten Bereichs setzen; sie erscheint beim
      Empfänger in der Navigation und in der Bereichs-Überschrift — auch in nicht-lateinischer
      Schrift.
    zustand: erfuellt
    herkunft: U2-ADR-334 (06.09.2026)
    pruefung:
      - tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js
        "[U2-ADR-334·Rot-Beweis] die Beschriftung kommt in JEDER Sprache an — auch in nicht-lateinischer Schrift"
      - tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js
        "[U2-ADR-334·Ausbeute] ohne Sprachmodul trägt der angedockte Bereich die Beschriftung aus dem Modul"

  - aussage: >-
      EINGEBRACHT DURCH U2-ADR-334-NACHTRAG (07.09.2026): ein Modul kann eine eingebaute
      Bereichs-ID nicht als NEUEN, eigenen Bereich anmelden — Erfinden bleibt gesperrt, die Sperre
      deckt jede eingebaute Kennung, weil sie aus der eingebauten Liste abgeleitet ist. Ein Modul
      KANN die Beschriftung eines bereits bestehenden eingebauten Bereichs übersetzen, wenn die
      Kennung im Kern selbst als bekannt geführt wird (U2-ADR-349) — das ist Übersetzen, kein
      Kapern. Die ursprüngliche Fassung dieser Aussage („kann ein Modul nicht setzen", ohne die
      Erfinden/Übersetzen-Unterscheidung) war zu weit gefasst, s. U2-ADR-334-Nachtrag.
    zustand: erfuellt
    herkunft: U2-ADR-334 (06.09.2026), präzisiert durch U2-ADR-334-Nachtrag (07.09.2026)
    pruefung:
      - tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js
        "[U2-ADR-334→349] eine EINGEBAUTE Bereichs-Kennung wird jetzt als Übersetzung akzeptiert, nicht mehr pauschal verworfen"
      - tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js
        "[U2-ADR-334·Rot-Beweis Sperre] die Sperre ist ABGELEITET, sie deckt jede eingebaute Kennung"

  - aussage: >-
      Die Lese-App entscheidet über eine Bereichs-Kennung genau wie der Kern — nicht mehr und nicht
      weniger.
    zustand: erfuellt
    herkunft: U2-ADR-334 (06.09.2026)
    pruefung:
      - tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js
        "[U2-ADR-334·Spiegel] das Prädikat entscheidet wie das des Kerns"

  - aussage: >-
      Die Weitung lässt die Zusicherungs-Sperre aus U2-ADR-331 unberührt; eine Kennung ausserhalb
      aller erlaubten Formen bleibt `unbekannt`.
    zustand: erfuellt
    herkunft: U2-ADR-334 (06.09.2026)
    pruefung:
      - tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js
        "[U2-ADR-334·Zusammenspiel] die Zusicherungs-Sperre bleibt unberührt"
      - tests/u2-adr-334-bereichslabel-textsatz-lese-app.test.js
        "[U2-ADR-334] eine Kennung ausserhalb aller erlaubten Formen bleibt `unbekannt`"
```

## Was dieser Zug NICHT tut

- **Er bringt keine Feld-Beschriftungen.** Der Kern kennt zusätzlich `<feldId>.<art>`
  (`_istModulfeldKennung`); die Lese-App nicht. Das ist ein eigener Gegenstand — die Feld-Definitionen
  angedockter Felder kommen dort aus `feldDefinitionen`, nicht aus dem Textsatz.
- **Er repariert die Namensraum-Überschneidung im Schreib-Gate des Kerns nicht** (U2-ADR-331,
  bewacht statt repariert).
