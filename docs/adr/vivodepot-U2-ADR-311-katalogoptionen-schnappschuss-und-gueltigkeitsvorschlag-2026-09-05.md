# U2-ADR-311 · Zwei benannte Grenzen aus ADR-292 geschlossen — Options-Schnappschuss behoben, Gültigkeitsvorschlag in Arbeit

**Datum:** 05.09.2026
**Status heute:** gilt, Punkt 1 gebaut und grün — Punkt 2 entschieden, Bau wartet auf die Überlagerungs-Mechanik einer anderen Sitzung (v574)
**Bezug:** U2-ADR-292 (Abschnitt 7, „benannt, nicht behoben" — beide Punkte stammen von dort)

---

## 1 · Punkt 1 — die zwei `_katalogOptionen`-Schnappschüsse

**Der Befund (05.09.2026, unabhängig nachgezählt):** `_katalogOptionen(sektorId, feldId,
erlaubteWerte)` (`vivodepot.html:16189`) gibt mit `erlaubteWerte` ein NEUES, gefiltertes Array
zurück — sechs von acht Aufrufen im `WIZARDS`-Literal geben ohne Filter dieselbe Array-Referenz wie
das Sektorfeld, zwei (`identitaet.familienstand` mit `['verh','elp']`, `identitaet.steuerklasse` mit
`['III','IV','IV_faktor','V','VI']`) filtern und bekommen darum ein eigenes Array.

**Warum das ein Loch war:** `optionen: _katalogOptionen(...)` band dieses gefilterte Array EINMALIG,
bei der Skript-Auswertung von `WIZARDS` (lange vor jedem Aufruf von `buergermodulSektorErsetzen`).
Änderte sich der native Options-Bestand später — ein Modul entfernt einen Wert, oder (hypothetisch)
fügt einen hinzu, der in der Filterliste steht —, sah der Wizard-Schritt die Änderung nie. Für die
Struktur-Achse heute (natives Bündel gegen sich selbst) unschädlich, aber ein Loch, das vor dem
Einfrieren geschlossen gehört, nicht danach entdeckt.

**Die Lösung — filtern beim Lesen, nicht beim Binden:** die zwei betroffenen `feld`-Objekte im
`WIZARDS`-Literal bekommen `get optionen()` statt einer festen Eigenschaft:

```js
feld: { id: 'familienstand', typ: 'auswahl',
  get optionen() { return _katalogOptionen('identitaet', 'familienstand', ['verh', 'elp']); } }
```

Jeder Lesezugriff auf `schritt.feld.optionen` ruft `_katalogOptionen` frisch auf, gegen den
AKTUELLEN Stand von `identitaet.familienstand.optionen`. Da `Array.prototype.filter` keine
Elemente klont, bleibt die Options-OBJEKT-Identität automatisch erhalten — dieselbe Eigenschaft,
die die sechs unfilterten Aufrufe schon hatten, gilt jetzt für alle acht. Kein zweiter
Angleichungs-Schritt, keine Buchführung darüber, welche WIZARDS-Felder eine gefilterte Kopie
halten — das Problem verschwindet strukturell, statt an jeder Fundstelle einzeln nachgezogen zu
werden.

**Geprüft:** `tests/textsatz-vollstaendigkeit-optionslabel.test.js`
- `[Optionslabel·3]` (bestehend): Wizard-Options-Objekt und Sektorfeld-Options-Objekt sind
  dieselbe Referenz — weiterhin grün.
- `[Optionslabel·3b·ROT]` (neu): ein bestehender, gefilterter Wert (`verh`) wird NACH dem Laden aus
  dem nativen Sektorfeld entfernt — der Wizard-Schritt muss die Entfernung sehen. Mit der alten,
  einmalig gebundenen Fassung hätte diese Probe die verwaiste Referenz weiterhin als gültig
  gemeldet; das ist der Rot-Beweis, dass die Probe wirklich das prüft, was sie behauptet, nicht nur
  zufällig grün ist.
- Volle Optionslabel-Suite (10 Proben) und die angrenzenden ADR-292-Proben (45 Proben insgesamt,
  `buergermodul-sektor-ersetzen`/`buergermodul-aufrufer`/`pvwiz-inhalt-besprochen`/
  `erste-partei-zone`) bleiben unverändert grün — kein Rendering-, Identitäts- oder
  Sicherheits-Effekt außerhalb der zwei betroffenen Stellen.

**Warum keine echte NEUE Option vorgeführt wird:** für `familienstand`/`steuerklasse` ist die
Filterliste (`['verh','elp']` bzw. die fünf Steuerklassen) hart im `WIZARDS`-Literal verdrahtet,
nicht datengetrieben — ein wirklich neuer Wert würde diese Filterliste selbst nie durchlaufen,
unabhängig vom Binden-vs-Lesen-Unterschied. Die scharfe, tatsächlich vorführbare Kehrseite ist
darum das ENTFERNEN eines bestehenden, gefilterten Werts — sie beweist dieselbe Eigenschaft
(Frische statt Schnappschuss) an dem Fall, der sich real konstruieren lässt.

---

## 2 · Punkt 2 — `gueltigkeitVorschlag` läuft an der Rechtsraum-Überlagerung vorbei (in Arbeit)

**Der Befund (weitergereicht):** der ursprünglich vermutete
Fehlerort — ein hartkodierter `case 'reisepass_gueltig'` in `_fristHinweisFuerFeld` — existiert so
nicht; das war eine falsche Prämisse aus der ADR-292-Formulierung. Der tatsächliche Ort ist
`feldGueltigkeitVorschlag(sektorId, feldId)` (`vivodepot.html:30004`): sie liest
`f.gueltigkeitVorschlag` datengetrieben von der Felddefinition, prüft `v.regel` aber gegen eine
ABSICHTLICH GESCHLOSSENE Liste, `FELD_VORSCHLAG_REGELN = ['ausweisdauer']` — und die tatsächliche
Rechnung (zehn Jahre, unter 24 bei Ausstellung sechs, § 6 Abs. 1 PAuswG) steht fest im Kern
(`_ausweisGueltigkeitVorschlagWert`), nicht im Modul.

**Die Geschlossenheit ist kein Versehen** — der Kommentar an Ort und Stelle: „Ein Feld mit Marke,
für das es keine Regel gibt, bekommt KEINEN Vorschlag. Leer ist hier die richtige Antwort, nicht
eine geratene Frist." Eine geschlossene Liste mit einem einzigen Regelnamen ist für ein NEUES Land
aber wirkungslos, solange niemand die Liste erweitert — der Rechtsraum wäre dann kein Andockpunkt,
sondern ein Antragsformular an Vivodepot.

**Entschieden (05.09.2026): Form (b).** Das Modul trägt die konkrete Dauer, der Kern
rechnet nur — dasselbe Muster, das `fristRegel` (`{dauer, quelle}`) bereits vorführt, nicht ein
neues. Die zehn/sechs Jahre für den deutschen Ausweis sind deutsches Recht, kein Gerüst — sie
gehören in `tools/buergermodul/vd-de-rechtsraum.json`, mit Quelle, so wie die dreizehn Bereiche ins
Struktur-Modul gehören (dieselbe Bewegung wie ADR-292/303, nur auf der Rechtsraum-Achse).

**Auflagen, unverhandelbar:**
- Modul bringt eine Dauer OHNE `quelle` → ABGEWIESEN, wie bei `fristRegel`.
- Modul bringt zu diesem Feld gar nichts → weiterhin KEIN Vorschlag, leer wie heute.
- Kein Rechtsraum-Modul geladen → byte-identisches Verhalten wie heute (nicht verhandelbar).
- Keine erfundenen ausländischen Fristen. In einer anderen Sitzung wurde ausdrücklich festgehalten,
  kein aktuelles/zitierfähiges Recht für einen zweiten Rechtsraum zu haben — der zweite Rechtsraum
  bleibt eine benannte Fixture, bis echtes Recht freigegeben wird. Diese ADR baut keine
  UK-Zahlen und wird keine erfinden.

**Blockiert auf:** eine andere Sitzung ändert gerade `_fristHinweisFuerFeld`s Signatur
(fünfter Parameter `kennung`, `_rechtsraumFristRegel(kennung)` vor der Feldregel) für den zweiten
Rechtsraum und pusht das als v574. Diese ADR fasst `_fristHinweisFuerFeld` nicht an, solange dieser
Bau läuft, und übernimmt das dort entstehende generische Überlagerungs-Muster für
`gueltigkeitVorschlag`, statt eine zweite, abweichende Variante zu bauen — Abschnitt 2 wird nach der
Landung fortgeschrieben, nicht separat als eigener ADR.

---

## 3 · Zusammenarbeit

Eine Sitzung: Freeze-Tiefe von `SEKTOREN`/`WIZARDS` gemessen (Vorarbeit aus ADR-292), die 6-zu-2-Zählung
von `_katalogOptionen`-Aufrufen, und die Entscheidung zwischen Form (a)/(b) für Punkt 2.
Eine weitere Sitzung: den falschen Fehlerort aus ADR-292 korrigiert, den tatsächlichen Ort
(`feldGueltigkeitVorschlag`/`FELD_VORSCHLAG_REGELN`) benannt, und ausdrücklich vor einer erfundenen
UK-Rechtsannahme gewarnt.
