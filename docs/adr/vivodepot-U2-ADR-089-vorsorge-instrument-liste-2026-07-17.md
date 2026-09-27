# U2-ADR-089 · Vorsorge-Instrument-Liste als gemeinsame Liste

**Datum:** 17.07.2026
**Status:** Angenommen · Block 1 gebaut und geräte-abgenommen 20.07.2026 · Block 2/3 offen
**Bezug:** U2-ADR-064 (Vollmacht als `liste`-Record, hier in Punkten 5/6 revidiert) ·
U2-ADR-070 (Instrument-Modul-Registry, hier erweitert) · U2-ADR-063 (mehrfachauswahl,
weiter supersediert) · UX-Spec 08.07.2026
**Status heute:** gilt (Block 1) — Beleg `tests/vorsorge-instrument-liste-einzigartigkeit.test.js`;
Block 2 fortgeführt in U2-ADR-089-Nachtrag, Block 3 weiterhin offen wie im Dokument vermerkt.

---

## 1 · Der Fund

U2-ADR-064 (07.07.) verwarf die Option „ganze Instrument-Ebene als eine morphende Liste" mit
fünf Gründen: bräche die Wizards, bräche Situations-Querverweise, bräche den Notfall-Pfad,
wäre kein kleiner Pilot, Kopplung nicht vermessen. Die UX-Spec vom 08.07. schlägt strukturell
genau diese Liste vor (ein Ort „Meine Vorsorge", Instrument-Typen als Einträge) — als
Fundament der geplanten Merkliste. Die Kollision war bei Erstellung der Spec nicht bewusst;
sie wurde am 17.07. aufgedeckt und über vier read-only Erhebungsrunden vermessen.

## 2 · Wirkungsradius

Eine Vollerhebung über **beide Dateien** (`vivodepot.html` und `vivodepot-lesen.html`) ergab
**neun Konsumenten-Gruppen**, die alle auf denselben vier flachen Gate-Feldern
(`vollmacht_vorhanden`, `testament_vorhanden`, `patientenverf_vorhanden`,
`betreuungsverfuegung`) aufsetzen und still versagen würden, wenn diese Gates wegfielen: (a)
Notfall-Lookup, (b) fünf Wizards inkl. Wiedereintritt, (c) ~24 Situations-Querverweise, (d)
`ERKENNUNG_LEITFELDER`, (e) PV-Dokument-Generator-`crossRef`, (f) `_MODUL_KARTE`, (g)
`standardDokumente[].felder`, (h) Import-Alias-Tabelle, (i) KI-Sektor-Doppelhaltung. Drei
getrennte Registries (`ERKENNUNG_LEITFELDER`, `_MODUL_KARTE`, `standardDokumente[].felder`)
zeigen unabhängig voneinander auf dieselben vier Felder — der Grund für die vielen
Erhebungsrunden, und ein Konsolidierungs-Kandidat für nach v1.0.

`_vorsorgevollmachtVorhanden()` ist keine Baustelle, sondern die bereits produktive,
OR-abgesicherte Existenz-Ableitungs-Vorlage, an der sich die Nacharbeiten ausrichten.

## 3 · Die Entscheidung: geteilte Liste, `typ` als reines Unterfeld

Die Instrument-Ebene wird als **eine gemeinsame Liste** `vorsorge_instrumente` gebaut, mit
`typ` als Diskriminante — kein neuer „erst Typ wählen, Formular wechselt"-Mechanismus, sondern
dieselbe bestehende `feldSichtbar`/`sichtbarWenn`-Mechanik, die Vollmacht bereits für ihr
`stelle`-Feld nutzt. `liesEintragAusDOM()` überspringt ausgeblendete Zeilen ohnehin — ein
Testament-Eintrag speichert automatisch nur Testament-Felder.

**Design-Entscheidungen (Session 17.07., bindend für Block 1):**

1. **PV-Bausteine bleiben wizard-intern.** Die 29 BMJ-Behandlungsbausteine der
   Patientenverfügung werden nicht zu Listen-Unterfeldern — sie sind Wizard-Inhalt, nicht
   Instrument-Metadaten. Hält Block 1 bei ~24h statt ~27–51h Nominal.
2. **Import-Alias fällt weg, mit sichtbarem Verwaisen.** Alte Gate-Werte aus Bestandsdepots
   werden beim Import nicht automatisch in Listen-Einträge übersetzt; sie verwaisen sichtbar,
   nicht still.
3. **Wizard-Abschluss per Wiedereintritt, nicht per Sperre.** Der Wizard kehrt in einen
   begonnenen Eintrag zurück, statt einen zweiten anzulegen oder zu sperren — Teil von Block 2.
4. **Einzigartigkeit ist ein Merkmal pro Instrument-Art, nicht pauschal.** Einzigartig auf
   Typ-Ebene: Testament, Patientenverfügung, Betreuungsverfügung, Sorgerechtsverfügung,
   KI-Verfügung. Vollmacht hat keine pauschale Typ-Einzigartigkeit — ihre Einzigartigkeit
   läuft über `art` (Entscheidung 5).
5. **Vollmachts-Art ist die Einzigartigkeits-Kategorie (Variante 1).** Das
   `einzigartig`-Flag hängt am `art`-Wert, nicht an einem eigenen Instrument-Typ pro Art;
   `art` wird damit Pflichtfeld (zuvor optional). Zuordnung: einzigartig — Vorsorge,
   Gesundheit, Betreuung, General (je genau eine); nicht einzigartig — Bank (mehrere Banken).
   Abnahme-Bedingung: ein Vollmacht-Eintrag muss nach der Umhängung weiterhin mehrere
   Bevollmächtigte aufnehmen (`refMehrfach` bleibt erhalten). Bei General/Gesundheit/Bank
   erscheint ein statischer Überlappungs-Hinweis (`feldSichtbar`-Mechanik, kein neuer
   Mechanismus) — Konsistenz zwischen Vollmachten bleibt Nutzer-Sache, Vivodepot weist hin,
   löst nicht.

## 4 · Verworfene Alternative: Variante 2 — jede Vollmachts-Art als eigener Instrument-Typ

Erwogen und verworfen: hätte eine Migration erzwungen, die Registry von 6 auf ~10 Einträge
wachsen lassen, einen Regal-Karten-Umbau nötig gemacht und neue Produktfragen für
Bank/General/Gesundheit/Betreuung aufgeworfen, die unter Variante 1 (Art als Feldwert, nicht
als Typ) gar nicht erst entstehen.

Ebenfalls verworfen bleibt die in U2-ADR-064 bereits abgelehnte **breite Alternative**
(„ganze Instrument-Ebene morpht ohne Zwei-Wege-Struktur") — deren technische
Verwerfungsgründe (Wizard/Querverweise/Notfall) durch die Zwei-Wege-Struktur dieser
Entscheidung konzeptionell entschärft sind, nicht durch Ignorieren der ursprünglichen Gründe.

## 5 · Bewusst vertagte Alternative: Block 2/3 in derselben Entscheidung mitbauen

Erwogen, verworfen zugunsten additiven Vorgehens: Block 1 (Struktur, Einzigartigkeits-Sperre,
Vollmacht-Umhängung) und die neun Gate-Konsumenten (Block 2) sowie die Merkliste (Block 3) in
einem Zug zu bauen, hätte Bau und Geräte-Abnahme über einen deutlich größeren, riskanteren
Schnitt gestreckt. **Additiv, keine Datenmigration:** die neue Liste bleibt für die fünf
nicht-Vollmacht-Instrumente vorerst leer; nur die bestehende Vollmacht-Liste wird
umgehängt. Die alten Flachfeld-Formulare bleiben unverändert sichtbar und funktionsfähig, bis
Block 2 die neun Konsumenten umstellt — ein bewusst in Kauf genommener Zwischenzustand
(Wizard-Durchläufe erscheinen bis dahin nicht in der neuen Liste), kein Versehen.

**Block 2** (neun Gate-Konsumenten, ~32h Nominal) und **Block 3** (Merkliste, ~16h Nominal)
bleiben eigene, spätere Bauaufträge — baureif, aber nicht Teil dieser Entscheidung.

## 6 · Abnahme

Schema-Bump 38→39 (Rename+Retag der bestehenden `vollmachten`-Records, additiv `typ:'vorsorgevollmacht'`,
verlustfrei, Verwaisungsregel). Migrationstest gegen eingefrorene Schema-38-Referenzdepot-Variante
bestanden. Einzigartigkeits-Durchsetzung + `art`-Pflicht per Test abgesichert
(`vorsorge-instrument-liste-einzigartigkeit.test.js`). Geräte-Abnahme unter `file://`
bestanden (20.07.2026): Personen-Widget nach Umhängung weiterhin mehrfachfähig,
Überlappungs-Hinweis erscheint korrekt, alte Formulare unverändert funktionsfähig.

Commits: `b89910a` + `27cba50` + `486f36b` (Branch `ci-probe-2026-07-02`, kein Push).

## 7 · Offen — bewusst nicht Teil dieser Entscheidung

- Block 2 (neun Gate-Konsumenten) und Block 3 (Merkliste) — eigene Bauaufträge.
- **Bekannte Grenze (bewusst nicht gelöst):** Das `einzigartig`-Flag verhindert zwei
  Vorsorgevollmachten, aber nicht eine Vorsorgevollmacht plus eine inhaltlich überlappende
  Gesundheitsvollmacht — Über-Art-Konsistenz bleibt Nutzer-Sache, der Überlappungs-Hinweis
  (Entscheidung 5) ist die bewusste Antwort darauf, keine technische Prüfung.
- „Grundhaltung" der Patientenverfügung wurde bewusst nicht als Unterfeld gebaut — kein
  lebendes Quellfeld, die BMJ-Wertvorstellungs-Bausteine bleiben wizard-intern
  (Design-Entscheidung 1).
- Vollständige Zuordnung des `einzigartig`-Flags über alle Vollmachts-Arten hinaus (Detail,
  bewusst nicht vor Block 1 entschieden) — inzwischen durch Entscheidung 5 vollständig geklärt.

---

*Vivodepot GmbH · Berlin · 17.07.2026*
