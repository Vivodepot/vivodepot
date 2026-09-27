# U2-ADR-152: Die Anfrage von aussen — Beschreibung statt Formular, und ein eigener Schritt statt eines Warnhinweises

**Status:** Akzeptiert
**Datum:** 20.08.2026
**Kategorie:** ARCHITEKTUR, DATENSCHUTZ, SICHERHEIT, MIGRATION
**Grundlage:** Umsetzungs- und Testkonzept vom 20.08.2026, Schritt „Die Anfrage von aussen"; dazu
die Produktentscheidung vom 20.08.2026 zum mitreisenden Schlüssel (Variante A: eigener
Bestätigungsschritt statt Warnhinweis) und zu Ablauf und Widerruf (Variante C: beides gilt).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `anfragePruefen`, `anfrageAbgleich`, `anfrageAntwortDatensatz`,
  `anfrageSignaturPruefen`, `anfrageBestaetigungModell`, `anfrageAusText`, `anfrageMerken`,
  `anfrageZustand`, `anfrageEinstiegSchritte`, `flowAnfrageEinstieg`, `renderAnfrage`;
  die Stufe 67 → 68 in `depotNormalisieren`.
  `vivodepot-template-generator.html` — `baueAnfrage`, `pruefeAnfrage`, `baueAnfrageSigniert`,
  `anfrageAlsLink`, `FELDKATALOG`. `docs/template-generator/anfrage-schema.json`.
- **ADR-Bezug:** U2-ADR-151 (die Kennungsform, die eine Anfrage nennt), U2-ADR-040 (die
  zweistufige Signaturkette, hier ohne zweiten Mechanismus wiederverwendet), U2-ADR-085 (der
  offene Einwand zum ausgetauschten QR — hier beantwortet, nicht ausgeräumt), U2-ADR-150
  (ein unbekannter Fall wird benannt), U2-ADR-037 (Definition und Wert wohnen getrennt),
  U2-ADR-149 (dieselbe Bauart „eine Stufe, nicht zwei").
- **Status heute:** gilt — gebaut und belegt in `tests/kette-07-die-anfrage.test.js` und
  `tests/e2e/kette07-anfrage.spec.js`; Wächter `W-feldkatalog-drift`
  (`tools/build-feldkatalog.js`), Stufeneintrag `nach: 68` in `tests/fixtures/migrations-stufen.js`.

---

## Entscheidung

**1 · Eine Anfrage ist BESCHREIBUNG, kein ausgefülltes Formular.**

Sie nennt **Kennungen** (U2-ADR-151), niemals Werte. Sie trägt darum **keine Personendaten**, und
das ist mechanisch statt behauptet: ein Schlüssel, der einen Wert trüge, lässt die ganze Anfrage
durchfallen (`grund: 'personendaten'`). Der Abgleich braucht ihn nicht — er läuft gegen das Depot,
das ohnehin auf dem Gerät liegt.

Sie ist **lesbar, nicht binär**: schlichtes JSON mit deutschen Schlüsseln. Ein Justiziar muss
hineinsehen können, ohne unser Werkzeug zu haben.

Ihre Angaben: **wer fragt · wozu, im Klartext · welche Angaben nötig und welche freigestellt, jede
mit ihrem eigenen Zweck · bis wann sie gilt · auf welcher Grundlage gefragt wird · die Kennung des
Vorgangs · der Schlüssel für die Antwort.**

**2 · Die Grundlage ist ein eigenes Feld, und Vivodepot prüft sie nicht.**

`grundlage` ist Pflicht und steht dem Menschen **vor** der Antwort vor Augen. Bei einem Pflegeheim
ist der Grund offensichtlich; bei einem Arbeitgeber, der nach Kindern fragt, nicht.

**Wir sind keine Aufsichtsbehörde.** Was das Produkt leistet: die Angabe steht da — sichtbar vorher,
nachweisbar hinterher. Wer falsch angibt, hat es schriftlich getan.

**3 · Der Zweck steht JE FELD, nicht nur einmal am Kopf.**

„Wozu brauchen Sie mein Geburtsdatum" ist eine andere Frage als „wozu brauchen Sie meine
Kontonummer", und ein Sammelzweck beantwortet keine von beiden. Ein Feld ohne eigenen Zweck wird
**verworfen und gemeldet**, nicht mit dem Sammelzweck aufgefüllt.

**4 · Eine unbekannte Kennung wird gesagt — und die Antwort gilt nicht als vollständig.**

Der Antwort-Datensatz trägt `unbekannt[]` **immer**, auch leer, und `vollstaendig: false`, sobald
eine Kennung unbekannt ist oder ein Pflichtfeld fehlt. Das ist U2-ADR-150 an der teuersten Stelle:
der Empfänger hielte sonst eine Teilantwort für eine ganze.

**5 · Jede Anfrage sagt, ob sie geprüft ist — über dieselbe Kette wie eine Vorlage.**

Anbieter-Zertifikat gegen den eingebauten Trust-Authority-Anker, dann die Anfrage-Signatur gegen den
Anbieter-Schlüssel **aus diesem Zertifikat** (U2-ADR-040). Kein zweiter Mechanismus. **Ohne Netz** —
alles läuft über `crypto.subtle` gegen eingebaute Schlüssel.

**Der letzte Schritt ist der wichtigste:** die **lesbare** Anfrage muss dieselbe sein wie die
**signierte** (`_kanonischJSON`-Vergleich). Ohne ihn liesse sich der Klartext austauschen und die
alte Signatur daneben stehen lassen — der Justiziar läse das eine, die Anwendung prüfte das andere.

Der Anbieter-Bezeichner kommt aus dem **signierten Zertifikat**, nicht aus dem, was die Anfrage über
sich selbst behauptet.

**6 · Eine Anfrage ohne Zertifikat wird angenommen — und bekommt einen eigenen Schritt, keinen
Warnhinweis.** (Produktentscheidung, Variante A.)

Der Schritt sagt, **wohin** die Antwort geht (Absender, Rückweg, Schlüssel-Abdruck) — nicht nur,
dass etwas ungeprüft ist. Er ist **nicht überspringbar** und **nicht vorbelegt**; ein
vorausgefülltes Häkchen wäre derselbe Warnhinweis in anderer Form. Eine **geprüfte** Anfrage bekommt
ihn **nicht** — sonst gewöhnt sich der Mensch daran und klickt ihn überall durch, und dann wirkt er
dort nicht mehr, wo er soll.

**Der zweite Einwand aus U2-ADR-085 ist damit beantwortet, nicht ausgeräumt:** das Risiko des
ausgetauschten QR bleibt bestehen und wird durch einen Bedienschritt **gemindert**, nicht durch
Technik beseitigt. Bei einem Menschen mit Demenz oder unter Druck trägt kein Bedienschritt. Die
Variante ist gewählt, weil die Gegenvariante genau die Nutzung abschneidet, die das Produkt
verbreitet — kleine Stellen ohne Zertifikat sind die ersten, die es ausprobieren.

**7 · Gültigkeit wirkt ohne jede Rückverbindung.** (Produktentscheidung, Variante C.)

`gueltigBis` ist ein Datum, kein Zeitpunkt: wer am letzten Tag antwortet, antwortet rechtzeitig. Was
abläuft, wird als abgelaufen **gezeigt** und nicht stillschweigend beantwortet. Der Zustand einer
Anfrage wird **berechnet**, nicht geglaubt — ein gespeicherter Zustand von gestern wäre morgen
falsch.

**8 · Eine Anfrage wird BEHALTEN (Schema 68) — und das ist eine Stufe für Auftrag 7 und 8.**

Auftrag 4 hat den Ort „Wer hat Sie gefragt" gebaut und ausdrücklich keinen Depot-Schlüssel angelegt;
die Frage lag hier. Sie ist entschieden: **ja.** „Offen · beantwortet · abgelaufen" sind Aussagen
über die Zeit, und was beim Schliessen der Anwendung verschwindet, kann nie beantwortet gewesen
sein.

**Der Rückweg (Auftrag 8) braucht keine zweite Stufe:** er schreibt in **Einträge** dieses Arrays,
nicht in einen weiteren Depot-Schlüssel.

`anfragen` ist im Klartext-Export **zurückgehalten** wie `zusammenstellungen` daneben: sie trägt
keine Feldwerte, aber **wer Sie wonach gefragt hat**, ist eine Aussage über eine Lebenslage. Beim
Umzug geht sie mit (`{sensibel: true}`).

**9 · Der Erzeuger baut Anfragen — derselbe, kein zweiter.**

Dieselben Stammdaten, dasselbe Schlüsselpaar, dieselbe Signatur. Wer für Anfragen ein eigenes
Programm baut, pflegt zwei: zwei Stammdaten-Masken, zwei Schlüsselschritte, zwei Gelegenheiten, die
Signatur verschieden falsch zu machen.

Die Feldauswahl läuft über die **Suche** — bei 261 Feldern ist eine Liste keine Auswahl. Der
Feldkatalog wird **aus dem Kern erzeugt** (`tools/build-feldkatalog.js`, Bauart wie
`build-bereiche.js`); eine von Hand gepflegte Liste liefe genau dann auseinander, wenn es weh tut.

**10 · Die Anfrage ist ein Einstieg.**

Jemand bekommt eine Anfrage und hat noch kein Depot: sie führt in ein leeres Depot und von dort durch
**genau die Felder, die sie verlangt** — nicht durch 178 andere. Über den **gewöhnlichen**
Anlege-Weg (`flowDepotAnlegen`), nicht über einen zweiten.

---

## Was daraus folgt

**Der Feld-Bezeichner ist der Ort, an dem der Wert der Bürgerin liegt.** Nichts, was eine Anfrage
mitbringt, darf ihn ändern. Eine Anfrage **liest** Kennungen; sie legt keine an, benennt keine um
und erfindet keine.

**Der Kästchen-Zweig bleibt umgangen.** Eine Anfrage ist eine Kennungs-Liste; sie fährt den
Opt-out-Zweig von `flowExportUebersicht`, wie Auftrag 3 ihn gebaut hat.

**Die Form steht auf zwei Seiten, und ein Wächter hält sie zusammen.** Kern
(`ANFRAGE_SCHLUESSEL`) und `docs/template-generator/anfrage-schema.json` beschreiben dieselbe
Anfrage; die Probe vergleicht beide. Stünde sie nur auf einer, hielte sie allein — genau der Zustand,
den Auftrag 5 an den vier Feldarten gemessen hat.

---

## Was NICHT entschieden ist

**Die Verschlüsselung des Rückwegs** steht in Auftrag 8. `antwort.art` benennt beide Verfahren
(`einmalpasswort`, `schluesselpaar`) und trägt den öffentlichen Schlüssel mit — gebaut werden sie
dort. Der heutige Ausgabepfad ist der unverschlüsselte Datei-Weg und in
`tests/b16-113-klartext-ausgabepfade.test.js` als solcher klassifiziert.

**Mehrteilige QR-Serien zusammensetzen** gehört ebenfalls zu Auftrag 8 (`qrTeileZusammensetzen`
wurde am 14.07.2026 durch Produktentscheidung entfernt). Heute liest der Anfrage-Weg einen
einteiligen QR-Text, eine Datei und einen Link.

## Warum nicht anders

**Warum kein Warnhinweis neben dem Knopf?** Ein Hinweis wird gelesen wie Kleingedrucktes. Ein
Schritt, der die Hand zum Anhalten zwingt, wird bemerkt. Das ist die Last, die diese Variante trägt —
sie muss sie tragen können, sonst ist die Entscheidung falsch.

**Warum bekommt eine geprüfte Anfrage den Schritt nicht?** Weil ein Schritt, der überall erscheint,
überall weggeklickt wird. Ein Warnsignal, das immer leuchtet, ist keins.

**Warum prüft Vivodepot die Grundlage nicht?** Weil wir sie nicht prüfen KÖNNEN — ohne den Vertrag,
den Vorgang und das Fachrecht der Institution ist jede Bewertung geraten. Eine geratene Bewertung
wäre schlimmer als keine: sie erzeugte Vertrauen, das nicht gedeckt ist.

**Warum fällt eine Anfrage mit einem Wert ganz durch, statt den Wert bloss zu verwerfen?** Weil sie
dann keine Anfrage ist. Ein verworfener Wert wäre eine stille Angleichung an genau der Stelle, an
der die Zusage „keine Personendaten" hängt.

**Warum keine zweite Migrationsstufe für Auftrag 8?** Weil eine Stufe je Auftrag am Ende eine Kette
von Stufen wäre, und jede ist eine Rückweg-Probe am Bestandsdepot. Die Depot-Datei liegt allein bei
der Bürgerin; ein Verlust dort ist endgültig.

---

*Vivodepot GmbH · 20.08.2026*
