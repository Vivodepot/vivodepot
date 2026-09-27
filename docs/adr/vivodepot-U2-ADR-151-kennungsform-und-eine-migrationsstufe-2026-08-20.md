# U2-ADR-151: Eine Kennungsform, versionierte Format-Kennungen — und eine Migrationsstufe statt vier

**Status:** Akzeptiert
**Datum:** 20.08.2026
**Kategorie:** ARCHITEKTUR, DATENSCHUTZ, MIGRATION
**Grundlage:** Umsetzungs- und Testkonzept vom 20.08.2026, Abschnitt „Eine Stufe, nicht drei".
Die Entscheidung nimmt drei liegende Posten auf: die Sub-Depot-Metadaten, die versionierten
Format-Kennungen und den Anbieter-Bezeichner am Modul-Feld.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `kennungBauen`/`kennungZerlegen`/`kennungAusSelektor`/
  `kennungZuSelektor`/`kennungFeldDef`/`kennungPruefen`; `formatKennung`/`formatKennungAufloesen`/
  `formatHerkunftKennung`; `subDepotAnlegen`, `subDepotVertrauenOeffnen`,
  `vertretungsGrundlageLabel`; die Stufe 66 → 67 in `depotNormalisieren`.
- **ADR-Bezug:** U2-ADR-096 (der interne Listen-Selektor, der die interne Form bleibt),
  U2-ADR-145/146 (der eine Einlassweg und das vierte Register), U2-ADR-120 (Übergabe-Protokoll),
  U2-ADR-149 (Zerfall in Feld-Einheiten — dieselbe Bauart „eine Stufe, nicht zwei").
- **Status heute:** gilt — gebaut und belegt in `tests/kette-02-migrationsstufe-67.test.js` (16),
  `tests/fixtures/migrations-stufen.js` (Eintrag `nach: 67`),
  `tests/rueckweg-bestandsdepot-stufe.test.js`.

---

## Entscheidung

**1 · Es gibt EINE Kennungsform für Felder.**

```
identitaet.vorname                              Kern-Feld
finanzen.konten[girokonto].iban                 Listen-Unterfeld
gesundheit.kammer/aek-berlin:mrt_kontra         Modul-Feld, Anbieter im Namensraum
```

Der interne Listen-Selektor `liste:<liste>:<typ>:<unterfeld>` (U2-ADR-096) bleibt die **interne**
Form; die Kennung ist die Form, die **nach aussen** geht und in Depots gespeichert wird.
`kennungAusSelektor` und `kennungZuSelektor` sind die zwei Brücken — es gibt keine dritte Form.

**Der Namensraum ist der Anbieter-Bezeichner aus dem Zertifikat (`anbieterId`), nicht sein
Anzeigename.** Zwei Kammern, die beide ein Feld `patientennummer` liefern, kollidieren damit nicht.

**2 · Format-Kennungen tragen eine Version:** `<id>@<version>`, gespeichert ab Stufe 67.
Die alte, unversionierte Form bleibt **lesbar** — ein Depot, das nie durch die Stufe lief, wird
weiter verstanden.

**DIE AUFLAGE AUS DER F1-ENTSCHEIDUNG, hier und nicht in einem Kommentar am Rand:** Wird der
dritte Leser gebaut, werden `json` und `vcard-erste` **im selben Zug** mit umbenannt. Danach ist es
teuer. **Eine Umbenennung ist nur zulässig, wenn der alte Name in `fruehereKennungen` des neuen
Eintrags stehen bleibt** — das ist der einzige Weg, auf dem sie ohne Bruch möglich ist. Ein Eintrag
im Übergabe-Protokoll einer Bürgerdatei zeigt sonst ins Leere, und die Datei liegt allein beim
Bürger.

**3 · Die Vertretungsgrundlage liegt hinter dem Sub-Passwort. Immer, ohne Schwelle.**
Sie stand bis zum 20.08.2026 als Klartext-Metadatum neben dem versiegelten Inhalt und war damit
für jeden lesbar, der den Anker öffnet. **D36 bleibt erfüllt:** Anzeigename, Akzent und
Verwaltungstyp bleiben im Klartext, die Auswahlliste ist weiter ohne Sub-Passwort lesbar und
sortierbar.

**Wo der Anker nichts weiss, sagt er das:** ein versiegeltes Sub-Depot zeigt „hinter dem Passwort
dieses Depots" statt „nicht hinterlegt" — der Leerwert wäre eine Behauptung über etwas, das der
Anker nicht sehen kann.

**4 · Behaltene Zusammenstellungen bekommen ihren Schlüssel jetzt**, obwohl Auftrag 4 ihn füllt.
Form: `{ id, name, kennungen: [<Kennung>], erstelltAm }`. Nicht mehr.

**5 · Alles vier fährt in EINER Stufe (66 → 67).** Vier Stufen wären vier Rückweg-Proben am
Bestandsdepot — die teuerste Auflage, die es gibt.

## Was die Stufe ausdrücklich NICHT tut

**Sie schreibt keinen Feld-Bezeichner um.** Gemessen vor dem Bau: `ebene: 'modul'` tragen
ausschliesslich eingebaute Felder; ein eingelassenes Modul kann heute kein Feld erfinden
(`formatModulPruefen`: „Ein Modul ERFINDET KEIN FELD"). Es gibt also nichts zu migrieren — die
Form entsteht, **bevor** das erste fremde Feld existiert. Das steht hier, damit später niemand
die fehlende Umschreibung für ein Versehen hält.

**Sie zieht die Vertretungsgrundlage nicht selbst um, und sie löscht sie nicht.** Sie läuft mit
dem Anker-Passwort, der versiegelte Inhalt hängt am Sub-Passwort — beide liegen erst dann
gleichzeitig vor, wenn das Sub-Depot geöffnet wird. Die Stufe **merkt den Umzug vor**
(`vertretungsGrundlageUmzugOffen`), `subDepotVertrauenOeffnen` vollzieht ihn. **Löschen wäre ein
Datenverlust und hätte die Abbruchklausel des Auftrags ausgelöst.**

**Die Folge, offen gesagt:** Bei einem Bestandsdepot bleibt die Grundlage im Klartext, bis das
Sub-Depot das nächste Mal geöffnet wird. Für neu angelegte Sub-Depots gilt die Regel sofort.
Die Alternative — beim Öffnen des Ankers einmal nach jedem Sub-Passwort fragen — ist eine
Bedienfrage und ist eine Produktentscheidung, nicht diesem ADR.

## Warum nicht anders

**Warum nicht die Paar-Form `{sektor, feld}` behalten?** Sie trägt keinen Anbieter und lässt sich
nicht in eine Liste schreiben, ohne dass jede lesende Stelle zwei Fälle kennt. Die Aufträge 3 bis 6
schreiben Zusammenstellungen aus Kern- **und** Modul-Feldern; mit zwei Sorten Kennung wäre jede
dieser Stellen zweimal zu bauen.

**Warum der Anbieter im Feldteil und nicht als eigene Ebene?** Weil eine Kennung ein String bleiben
muss: sie wird gespeichert, in Anfragen verschickt und von einem Menschen gelesen. Eine
Objekt-Form wäre in jedem der drei Fälle unhandlicher.

**Warum die Version am Format und nicht am Depot?** Die Depot-Version sagt, wie die Datei gebaut
ist; die Format-Version sagt, was eine Kennung bedeutet. Zwei verschiedene Fragen — eine gemeinsame
Zahl beantwortete beide falsch.

---

*Vivodepot GmbH · 20.08.2026*
