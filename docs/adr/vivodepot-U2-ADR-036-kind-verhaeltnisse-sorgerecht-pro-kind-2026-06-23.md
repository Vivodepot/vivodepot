# U2-ADR-036: Kind-Verhältnisse — Sorgerecht pro Kind (entdoppelt), Kind-Beziehung-Enum, Selbstauskunft-Invariante

**Status:** Akzeptiert
**Datum:** 23.06.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, PROVENIENZ
**Grundlage:** Mac-Test-Befund „Kind-Verhältnisse" (intern) + Pivot-Klärung (read-only, intern) + Produktentscheidung „nach oben entdoppeln". Fortführung der Personen-/Datums-Linie U2-ADR-021/022/023.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `kinder`-Liste (`kind_beziehung`-Enum + `kind_beziehung_zusatz`; `sorgerecht_kind` Freitext→Enum + `sorgerecht_kind_zusatz`; `kind`-ref trägt `mitGeburt`); globales `schutzbefohlene_vertretung`-Sektorfeld entfernt; srwiz-Schritt „gesetzliche Vertretung" entfernt; `schutzbefohleneRollupHTML` (read-only Roll-up, eingehängt in `renderSektor`); `_kindVerhaeltnisseMigrieren` im Lade-Hook `depotNormalisieren`; `_refSubPickerVerdrahten` erfasst Geburtsdatum/-jahr inline. `vivodepot-lesen.html` (Katalog-Spiegel) nachgezogen. Tests `tests/kind-verhaeltnisse.test.js` (A–F, 13 Tests) + angepasste `wizard-srwiz`/`personen-vereinheitlichung`.
- **Sprint-Commit:** `2480f54` (lokal, kein Push).
- **ADR-Bezug:** dieser ADR (U2-ADR-036).
**Status heute:** gilt — Sorgerecht-Enum pro Kind und Selbstauskunft-Guard aktiv (`sorgerecht_kind` `vivodepot.html:5512`, `_kindVerhaeltnisseMigrieren` `:21358`, `tests/kind-verhaeltnisse.test.js`); `kind_beziehung` seit U2-ADR-109 in `art` umbenannt (Enum-Werte erhalten, sechster Wert ergänzt), Grundentscheidung unverändert.

---

## Kontext

Der Mac-Test deckte auf, dass die Kind-Verhältnisse an zwei Stellen unsauber lagen. Die read-only-Pivot-Klärung bestätigte die Wurzel:

- **Doppeltes Sorgerecht.** Die gesetzliche Vertretung (§ 1626 BGB) existierte zweimal: als **globales** Enum-Sektorfeld `schutzbefohlene_vertretung` (ein Wert pro Depot — von srwiz-Schritt 2 und der „Schutzbefohlene"-Sektion geschrieben) **und** als **Freitext pro Kind** (`sorgerecht_kind`, z. B. „gemeinsam mit Vater") in der Kinder-Liste. Die **einzige Pro-Kind-Granularität** steckte ausschließlich im Freitext; das Enum konnte unterschiedliche Sorge-Lagen mehrerer Kinder gar nicht abbilden.
- **Kind-Beziehung nur Freitext.** Ob ein Kind leiblich, adoptiert, Pflege-, Stiefkind oder Mündel ist, war nirgends strukturiert.
- **Geburts-Lücke am Einstieg.** Die Inline-Anlage einer neuen Person aus einem ref-Feld erfasste nur den Namen — kein Geburtsdatum/-jahr; die abgeleitete Minderjährigkeit (U2-ADR-023) brach am Kind-Einstieg.

`schutzbefohlene_vertretung` hatte **null programmatische Consumer** (reiner Speicher-/Anzeigewert; die Sub-Depot-Anlage liest es nicht). Der Export-Wahrheits-Filter (`baueAusMapping`, U2-ADR-030) adressiert nur **flache Sektorfelder**, nie Listenzeilen; `meine-menschen` hat **kein SD-JWT-Mapping** (nur die vCard, ohne Sorgerecht). Damit war die richtige Richtung der Zusammenführung eindeutig: **nach oben** — das Enum pro Kind, das globale Feld entfällt; eine Zusammenführung „nach unten" hätte die einzige Pro-Kind-Granularität zerstört.

## Entscheidung

1. **Sorgerecht entdoppelt — eine Quelle, pro Kind.** `sorgerecht_kind` wird vom Freitext zum **Enum** (`gemeinsam` / `allein` / `vormund` / `andere`) **an der Kinder-Zeile**. Daneben bleibt ein **Pflicht-Freitext** `sorgerecht_kind_zusatz`. Das globale `schutzbefohlene_vertretung`-Sektorfeld **entfällt** als pflegbares Feld.
2. **Teilsorge gehört in den Freitext, nicht ins Enum.** Übertragenes Aufenthaltsbestimmungsrecht, Gesundheitssorge, Ergänzungspflegschaft, ruhende Sorge u. Ä. trägt der Freitext. Kein Versuch, Teilsorge ins Enum zu schnitzen. Strukturiertes, trust-tragendes Sorgerecht käme — falls je gebraucht — **nur vom signierten Pfad** (familiengerichtlicher Beschluss über ein Template, Aussteller setzt den Code); nicht Gegenstand dieser Entscheidung.
3. **Kind-Beziehung als Enum + Freitext.** Neues `kind_beziehung` (`leiblich` / `adoptiert` / `Pflegekind` / `Stiefkind` / `Mündel/Vormundschaft`) plus `kind_beziehung_zusatz`. Begründung der Enum-Zulässigkeit: **faktische Kategorie, kein trust-tragender Rechts-Code, reine Anzeige** — bewusster Grenzfall zu U2-ADR-029 (selbst Erfasstes = Freitext), hier entschieden, weil die Kategorie selbst-erklärt und nicht aussteller-kodiert ist.
4. **srwiz + Schutzbefohlene-Sektion.** Der frühere srwiz-Schritt „Wie ist die gesetzliche Vertretung geregelt?" (schrieb das globale Feld) **entfällt** — er war die zweite Quelle und hat keinen Dokument-Consumer (srwiz registriert kein Dokument). Die „Schutzbefohlene"-Sektion zeigt die Vertretung künftig als **read-only Roll-up** aus den Kinder-Zeilen (`schutzbefohleneRollupHTML`, nur minderjährige Kinder), keine zweite Schreibquelle.
5. **Selbstauskunft-Invariante als konditionaler Guard — kein positiver Marker.** Im bestehenden Modell ist Selbstauskunft die **Abwesenheit** eines `verifiziert:true`-Stempels, kein gesetztes Flag; `verifiziert:true` entsteht ausschließlich am signierten Import. Daher **kein** positiver Selbstauskunft-Marker (das schüfe eine zweite, auseinanderlaufende Wahrheitsquelle) und **kein** neuer Filter-Zweig. Stattdessen ein **konditionaler Test-Guard**: Wenn das Sorgerecht-Enum je in einem signierten/SD-JWT-Export aufträte, dann **ohne** `verifiziert:true` — geprüft, indem der bestehende Wahrheits-Filter (`baueAusMapping`) mit einem **hypothetischen künftigen `meine-menschen`-Mapping** ausgeübt wird: ein verifiziert-stämmiger Sorge-Wert wird ausgeschlossen, ein selbst gesetzter reist als Selbstauskunft. Der Guard ist nicht tautologisch („heute trägt kein Export das Enum"), sondern bricht rot, sobald ein künftiger Personen-Export das Feld ohne korrekte Behandlung führt.
6. **Geburtsdatum/-jahr am Kind-Einstieg.** Die Inline-Kind-Anlage (`mitGeburt` am `kind`-ref-Feld) erfasst Geburtsdatum/-jahr gleich mit und schreibt ins **bestehende Datums-Substrat** (U2-ADR-023: `geburtsdatum` ISO + `geburtsjahr`-Rückfall); Minderjährigkeit bleibt **abgeleitet, nie gespeichert**. Kein paralleles Feld; Geburtsjahr allein genügt der Alters-Kette.
7. **Migration verlustfrei + idempotent.** `_kindVerhaeltnisseMigrieren` (im Lade-Hook `depotNormalisieren`): alter Freitext in `sorgerecht_kind` zieht verlustfrei nach `sorgerecht_kind_zusatz`; der frühere globale Enum-Wert **seedet** jedes **minderjährige** Kind als Default; das globale Feld entfällt danach.

## Begründung

- **Prominenz ≠ Bedeutung.** Die strukturierte Granularität lag am tiefsten (Freitext pro Kind), die schwächere global. Nach oben zu entdoppeln gewinnt Granularität, statt sie zu verlieren, und macht die eine Quelle zur sichtbaren.
- **Wahrheit baulich, nicht per Marker.** Die Selbstauskunft-Sicherheit folgt aus der bestehenden Mechanik (Verifiziert-Abwesenheit + Filter), nicht aus einem neuen Flag — „identisch zur Sozialvers-Mechanik" heißt hier: **keinen** Marker hinzufügen. Der konditionale Guard nagelt die Invariante für künftige Exporte fest.
- **Ein Substrat, kein Silo.** Die Geburts-Erfassung am Einstieg nutzt dasselbe rechenbare Datums-Substrat (U2-ADR-023) — die Minderjährigkeit bleibt abgeleitet, die Kette ist ab dem ersten Kind intakt.

## Konsequenzen

- Die gesetzliche Vertretung wird pro Kind erfasst; mehrere Kinder mit unterschiedlicher Sorge-Lage sind jetzt abbildbar. Keine doppelte Pflege mehr; die Schutzbefohlene-Sektion ist read-only abgeleitet.
- `schutzbefohlene_vertretung` ist als pflegbares Feld entfallen (Haupt-App und Lese-App). srwiz hat einen Schritt weniger (B2: nur noch „für welche Kinder").
- Der konditionale Export-Guard schützt eine künftige `meine-menschen`-Export-Erweiterung: ein verifiziert-stämmiger Sorge-Wert kann nicht als Selbstauskunft reisen.
- Kein Krypto-Eingriff; Block-Pin `8d31c678…` byte-identisch (Datenmodell-/Anzeige-Schicht + STRINGS), T-CROSS-07 3/3. Suite 997/996/0 (1 skip), browser-verifiziert (Roll-up read-only, Enum-Labels, 0 Konsolenfehler).
- **Offen / Folge-Stränge (nicht hier):** geführte Wege je Herkunft (Adoption/Pflege/Vormundschaft) als spätere Stränge; die tiefere Drift der Lese-App-Kinder-Liste (eigene `vorname`/`nachname`- und `erwachsene_kinder`-Form) bleibt ein eigener Strang — hier nur der Katalog-Spiegel der berührten Felder.

## Nachtrag (23.06.2026) — §1626-Erklärtext am Pro-Kind-Enum verortet

Der beim Umbau entfernte srwiz-Schritt 2 trug einen fundierten §1626-Erklärtext (Erklären-statt-Raten, U2-ADR-033). Statt den Schritt zurückzuholen, wird der Text **wörtlich** als `hint` an das Pro-Kind-Enum `sorgerecht_kind` (Kinder-Liste) verortet: „Die elterliche Sorge besteht kraft Gesetzes (§ 1626 BGB) — sie ist keine erteilte Vollmacht. Diese Angabe ist die Grundlage, falls Sie später ein eigenes Depot für Ihr Kind anlegen." Der zweite Satz stimmt am Listen-Ort, da die Sub-Depot-Anlage **pro Kind** hier ansetzt (bestätigt). Die Teilsorge-Führung bleibt am Nachbar-Feld `sorgerecht_kind_zusatz` (Label „Ergänzung (Teilsorge u. Ä.)" + Beispiel). **Selbe Entscheidung, andere Verortung** (kein neuer ADR). srwiz bleibt wie gebaut entfernt. Code: `vivodepot.html` — `sorgerecht_kind.hint`. Browser-verifiziert (Hint rendert im Kind-Eintrags-Modal nach SW-Cache-Bereinigung). Block-Pin `8d31c678…` unberührt. Folge-Commit `4c8f7f1` (lokal, kein Push).

## Cross-Referenz

U2-ADR-023 (rechenbares Alter / abgeleitete Minderjährigkeit — Geburts-Substrat, das Schritt F nutzt), U2-ADR-022 (Personen-Vereinheitlichung — Kind IST Register-Person per `ref`), U2-ADR-021 (rollenloses Register), U2-ADR-029 (selbst Erfasstes = Freitext — bewusster Grenzfall für das Beziehungs-/Sorgerecht-Enum), U2-ADR-030 (Wahrheits-Filter / Selbstauskunft-vs.-verifiziert — Mechanik des Guards), U2-ADR-005 (Urheberschaft/Provenienz). Befunde Kind-Verhältnisse (Bestandsaufnahme, Pivot-Klärung, Zielmodell — intern). Produktiv: —
