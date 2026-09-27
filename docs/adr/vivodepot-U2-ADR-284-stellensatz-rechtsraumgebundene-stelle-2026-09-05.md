# ADR — Stellensatz: eine Bezugsstelle, die mit dem Rechtsraum reist

**Status:** Angenommen und umgesetzt.
**Status heute:** gilt — `STELLENSATZ_EINGEBAUT`/`stellensatzModulPruefen`/`stelleLesen`/
`_stellensatzModuleAusDepotAnmelden`/`_stelleFuerFeld` im Kern vorhanden, `stellensatz` in
`EINLASS_REGISTER`, `tests/u2-adr-284-stellensatz.test.js` 26/26 grün.
**Datum:** 5. September 2026
**Bezug:** Anforderungspapier „Neutrales Gerüst und Baukasten" (04.09.2026, §5, §7 Punkt 2) ·
U2-ADR-121 (Rechtsraum-Katalog über die Instrument-Typen) · U2-ADR-254 (Rechtsraum-Vorschlagswert)
· U2-ADR-141 (Textsatz-Andockbarkeit, Muster für dieses ADR)

---

## Kontext und Problem

Das Anforderungspapier §5 zitiert drei Beispiele für Erklärtext, der „den
besonderen Charme des Bürgerdepots" ausmacht — u. a. „wenn Sie getrennt leben, müssen Sie
innerhalb von X die Behörde Y informieren". Das Papier stellt zwei Fragen (§7): sind diese Texte
überhaupt auslagerbar (beantwortet in anderem Bericht, nicht dieses ADR), und **setzen sich ihre
Bauteile — Bedingung, Erklärtext, Frist, Bezugsstelle, Rechtsraum — zu EINEM andockbaren Eintrag
zusammen?**

Gemessen (Bericht „erklaertext-als-ein-andockbarer-eintrag", 05.09.2026, nicht im Repo): drei von
vier Bauteilen docken bereits an — `sichtbarWenn` (Bedingung), `fristRegel` (Frist, ausdrücklich
„gleich ob eingebaut oder angedockt" laut eigenem Kommentar an `_fristHinweisFuerFeld`), Feld-
Kennung (übersetzbarer Text). **Eine Bezugsstelle als strukturierter Wert, der MIT einer Regel
reist, fehlte strukturell.** Eine Behörde stand im Bestand nur in drei Formen: von der Bürgerin
selbst eingetragenes Freitextfeld, `institutionsArt`-Katalogwert (klassifiziert einen Kontakt,
nicht eine Regel), oder Wort in einem Hinweistext.

**Der Prüfstein aus dem Anforderungspapier (§3/§4, „Braucht Pro das auch?") entscheidet, wohin die
Lücke gehört:** eine Notarin hat Fristen gegenüber ihrer Kammer, eine Hebamme gegenüber ihrem
Berufsverband, jeder Freiberufler gegenüber dem Finanzamt — eine Frist ohne Stelle ist in jedem
Berufsbild unvollständig. **Beide Türen brauchen es — ein Bohrloch, kein Fach**, in der Sprache
des Papiers.

## Warum keine neue Registry, und warum nicht `institutionsArt`

`institutionsArt` wurde geprüft und verworfen — nicht vermutet, am eigenen Kommentar der Konstante
belegt: „sie ist deutsch, nicht allgemein — Standesamt, Meldebehörde, Pflegekasse sind deutsche
Institutionen". Es klassifiziert zudem die ART einer von der Bürgerin selbst angelegten
Kontakt-Institution — eine andere Achse als „welche Stelle gehört zu dieser Regel".

`RECHTSRAUM_KATALOG` wurde ebenfalls geprüft: er ist nach Instrument-`typ` geschlüsselt
(vorsorgevollmacht, testament, …). Ein gewöhnliches Sektor-Feld wie `trennungsdatum` ist kein
Instrument und trägt keinen eigenen gestempelten Rechtsraum (U2-ADR-121 Punkt 2 bindet Rechtsraum
an INSTRUMENTE). Der Katalog lässt sich darum nicht ohne Schema-Erweiterung für beliebige Felder
wiederverwenden.

**Die Auflösung ist eine zweite Achse, kein neues Fach:** Stellensatz spiegelt Textsatz
(Modul-Registrierung, Kennungs-Form, Unbekannt-Skip, Aktualisieren-statt-Einfrieren) und schaltet
nach RECHTSRAUM statt SPRACHE. Genau die bestehende Trennung: „Sprache und
Rechtsraum sind zwei Achsen, nicht eine." Eine Stellen-Bezeichnung ist wie ein Eigenname zu
behandeln (z. B. „Familienkasse") — sie wechselt mit dem Rechtsraum, nicht mit der UI-Sprache,
darum KEINE Sprache-Ebene in der Registry, anders als bei Textsatz (das dort eine
`sprache→rechtsraum`-Verschachtelung trägt).

## Entscheidung

### 1 — Neue Achse: `STELLENSATZ_EINGEBAUT` (Kennung → Stelle), geschaltet nach Rechtsraum

`STELLENSATZ_RECHTSRAUM_EINGEBAUT = 'DE'` — reserviert wie `TEXTSATZ_SPRACHE_EINGEBAUT`/`'DE'`
beim Rechtsraum-Modul. `stelleLesen(kennung)` liest den angedockten Satz des AKTIVEN Rechtsraums
(`textsatzRechtsraumAktiv()` — derselbe Leser, den Textsatz für seine eigene Verschachtelung
bereits benutzt, hier als alleinige Achse statt als zweite Ebene unter Sprache), sonst den
eingebauten Satz.

### 2 — `stelle` reist IN `fristRegel`, nicht daneben — EIN Eintrag, nicht zwei

`fristRegel: { dauer, quelle, stelle }`. Damit ist die Frage des Anforderungspapiers direkt
beantwortet: Bedingung (`sichtbarWenn` am selben Feld) + Frist-und-Stelle (`fristRegel`, jetzt ein
Objekt mit drei statt zwei Schlüsseln) + Text (Feld-Kennung) bilden zusammen EINEN Eintrag an
EINEM Feld — kein zufälliges Nebeneinander. Geprüft (Test „Frist und Stelle sind EIN Eintrag"):
dieselbe `fristRegel`-Instanz speist sowohl den Fristtext als auch die Stelle.

### 3 — Kennung geteilt mit dem Label, kein eigener Namensraum

`fristRegel.stelle` trägt dieselbe Kennungsform wie ein Feld-Label (`<sektorId>.<feldId>` bzw. die
gedockte `tpl_`-Form). Ein Modul, das eine Stelle für ein natives Feld nachreicht, braucht keine
neue Namensraum-Konvention zu lernen.

### 4 — Whitelist-Durchreichung für gedockte Felder ergänzt

`_templateFeldZuModell` reichte `fristRegel.dauer`/`.quelle` bereits durch (U2-ADR-253 Teil 3),
`stelle` fehlte dort UND an der Unterfeld-Spiegelstelle — beide ergänzt. Ohne diese Ergänzung
hätte ein gedocktes Feld seine Bezugsstelle beim Andocken stillschweigend verloren, obwohl
`stellensatzModulPruefen` sie als Kennung längst akzeptiert hätte (Ergebnis wäre inkonsistent
gewesen: nativ vollständig, angedockt kastriert — genau die Asymmetrie, die A466 an anderer
Stelle bereits einmal gefunden hat).

## Wie es beim Bauen selbst rot wurde — und was das über die Prüfung sagt

Die erste Fassung von `stellensatzModulEinbetten` baute die Laufzeit-Registry direkt beim
Einbetten, statt — wie bei Textsatz/Rechtsraum — nur die ROHE Modul-LISTE zu verwalten und die
Registry separat beim Öffnen zu bauen. Ein eigener Integrationstest
(„modulEinlassen nimmt ein gültiges Stellensatz-Modul über den echten Weg an") fing das sofort:
`data.stellensatzModule` wurde ein Objekt statt der von `modulEinlassen` erwarteten Liste,
`data.stellensatzModule.length` war `undefined` statt `1`. Behoben, indem `stellensatzModulEinbetten`
denselben `_einbettenMitFassung`-Helfer benutzt wie `_rechtsraumModulEinbetten` — die Registry
entsteht ausschließlich in `_stellensatzModuleAusDepotAnmelden`, wörtlich wie bei den Geschwistern.
**Der Fund selbst ist der Beleg für den Auftrag „Rot-Beweis-Pflicht": ohne den End-zu-Ende-Test
über den echten `modulEinlassen`-Weg (nicht nur die isolierten Bausteine) wäre diese Asymmetrie
erst bei einem echten Depot mit echtem Modul aufgefallen.**

## Was Stellensatz nicht kann — die Grenze, nicht nur benannt, sondern gemessen

- **Struktur, kein Inhalt.** `STELLENSATZ_EINGEBAUT` ist bewusst LEER. Welche reale Frist/Stelle
  für `trennungsdatum` oder ein Kindergeld-Feld inhaltlich zutrifft, ist eine Rechtsinhalt-
  Entscheidung, die dieser Bau nicht trifft (dieselbe Zurückhaltung wie bei U2-ADR-121: Struktur
  zuerst, Inhalt fließt separat). Beide Beispiele wurden am echten Bestand
  nachverfolgt (anderer Bericht): keins trägt heute die volle Regel (Frist/Stelle/Rechtsfolge) —
  das native Feld `trennungsdatum` hat einen Hinweistext ohne Frist/Stelle, das Kindergeld-Beispiel
  existiert nur als Feldname. Dieser Bau liefert den Mechanismus, der beide tragen KÖNNTE, füllt
  sie aber nicht.
- **Die Fristdauer selbst bleibt rechtsraum-blind.** `_fristHinweisFuerFeld` (die generische
  Frist-Anzeige) las vor diesem Bau an KEINER Stelle aus `RECHTSRAUM_KATALOG` — nur die von Hand
  geschriebene `notvertretungAblaufText` (Ehegattennotvertretungsfrist) tat das, bespoke. Mit `stelleLesen()` wird
  der generische Weg zum ERSTEN MAL selbst rechtsraum-verzweigend — für die STELLE. Die DAUER
  (`fristRegel.dauer`, ein fester ISO-Duration-Schlüssel wie `'P1M'`) bleibt für jede Bürgerin
  gleich, unabhängig vom Rechtsraum. Eine rechtsraumfeste Dauer wäre ein eigenes, größeres
  Vorhaben (Erweiterung von `RECHTSRAUM_KATALOG` um beliebige Felder, nicht nur Instrument-Typen)
  — hier bewusst nicht gebaut, benannt statt verschwiegen.
- **Kein bürgersichtbares Rechtsraum-Auswahlfeld.** Wie bei U2-ADR-121/-254 bleibt offen, WIE der
  aktive Rechtsraum gesetzt wird — Stellensatz liest denselben `textsatzRechtsraumAktiv()`-Wert,
  den Textsatz bereits liest, fügt keinen neuen Setz-Weg hinzu.
- **Kein Contributor-Vertrauensweg.** Wie bei jedem der zehn (jetzt elf) Einlass-Register bleibt
  ungeklärt, wer ein Stellensatz-Modul signieren/verteilen darf (U2-ADR-121, „Ausdrücklich offen").

## Verifikation

`tests/u2-adr-284-stellensatz.test.js`, 26/26 grün. Deckt: Struktur-Prüfung (Objekt/Rechtsraum/
moduleVersion/stellen), Kennungs-Whitelist (bekannt/unbekannt, nativ UND gedockt, mit
[Negativprobe]/[Gegenprobe] markiert), Aktualisieren-statt-Einfrieren über die rohe Modul-Liste,
Lese-Verzweigung nach aktivem Rechtsraum (inkl. Gegenprobe „anderer Rechtsraum bleibt stumm"),
die „EIN Eintrag"-Behauptung direkt (dieselbe `fristRegel` speist Frist- und Stellen-Anzeige),
Whitelist-Durchreichung für gedockte Felder (mit Gegenprobe: kein `stelle`-Schlüssel ohne echten
Wert), `EINLASS_REGISTER`-Eintrag, und ein Ende-zu-Ende-Lauf über den echten `modulEinlassen`-Weg
(Positiv- und Negativ-Fall).

Isoliert vor dem Commit: `tests/adr-namen-waechter.test.js`, `tests/adr-readme-uebereinstimmung.test.js`.

## Konsequenzen

**Positiv.** Die Bauteile für den vom Anforderungspapier verlangten Erklärtext-Eintrag sind jetzt
vollständig vorhanden und docken alle vier gemeinsam an — beantwortet §7 Punkt 2 mit „ja, wenn ein
Autor die Stellen-Kennung mitbringt". Der generische Frist-Mechanismus wird nebenbei ein Stück
rechtsraumfähiger, als er vor diesem Bau war.

**Negativ.** Kein Rechtsinhalt geliefert — die Beispiele bleiben ungebaut, bis
jemand die tatsächliche Frist/Stelle recherchiert und einträgt. Die Fristdauer selbst bleibt
rechtsraum-blind; ein Autor, der eine rechtsraumabhängige DAUER braucht (nicht nur eine
rechtsraumabhängige Stelle), findet dafür heute noch keinen Weg.
