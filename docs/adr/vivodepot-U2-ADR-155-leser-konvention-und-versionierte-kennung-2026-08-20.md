# U2-ADR-155: Ein Leser trägt seine Version — und XML und CSV folgen der Konvention, die JSON schon hat

**Status:** Akzeptiert
**Datum:** 20.08.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, INTEROPERABILITÄT
**Grundlage:** Registerzeilen A394–A396 in `docs/ARBEITSLISTE-v1.md`; die Auflage aus U2-ADR-151
(„wird der dritte Leser gebaut, werden `json` und `vcard-erste` im selben Zug mit umbenannt");
die Erhebung zum Leser-Zuschnitt vom 20.08.2026.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `FORMAT_LESER` (fünf Einträge), `sdJwtKompaktLesen`, `leserAufloesen`,
  `leserKennungHeute`, `_xmlKnotenAlsObjekt`, `_csvAlsObjekt`, `_csvTrennzeichen`,
  `_csvZerlegen`, `formatModulPruefen`, Migrationsstufe 69 → 70.
- **ADR-Bezug:** U2-ADR-151 (Kennungsform `<id>@<version>` und die Auflage, die hier eingelöst
  wird), U2-ADR-146 (das Format-Modul als Beschreibung), U2-ADR-145 (der eine Einlassweg),
  U2-ADR-076 (Härtung von `parseXML`), U2-ADR-150 (ein unbekannter Fall wird benannt).
- **Status heute:** gilt — gebaut und belegt in `tests/leser-kennung-versioniert.test.js`
  (22 Proben, davon fünf Rot-Belege).

---

## Der Befund

**Ein Leser hatte keinen Namen, den ein Modul versionieren konnte.** Die Kennung war der blosse
Name (`json`, `vcard-erste`). Sie reist in Bürgerdateien mit — `formatModule` ist ein Schlüssel
des leeren Depots und steht in `VOLLEXPORT_STRUKTURELL_SCHLUESSEL`. Ändert sich später die Lesart,
gibt es keine Stelle, an der ein gespeichertes Modul sagen könnte, **welche** Fassung es meinte.

**Und es gab genau zwei Leser.** XML konnte niemand beschreiben, obwohl `parseXML` seit A272 ein
allgemeiner, namensraum-agnostischer Parser mit drei Nutzern ist; CSV konnte niemand beschreiben,
weil es im Kern keinen CSV-Weg gab (gemessen: null Fundstellen — die `split(',')`-Stellen gehören
zu vCard und zu Aufzählungsfeldern).

## Die Entscheidung

**1 · Die Leser-Kennung trägt ihre Version:** `json@1`, `vcard-erste@1`, `xml@1`, `csv@1`.
Dieselbe Form wie bei den Format-Kennungen (U2-ADR-151) — **kein zweiter Kennungsraum, keine
zweite Regel.**

**2 · Der Rückweg steht im Code, nicht in einer Notiz.** Jeder Eintrag führt
`fruehereKennungen`; `leserAufloesen` löst die alte, unversionierte Form weiter auf. Ein Depot,
das nie durch die Migrationsstufe lief, wird verstanden. **Aufgelöst wird EXAKT, nicht nach
Stamm:** `json@9` fällt nicht auf `json@1` — eine künftige zweite Fassung ist eine andere Lesart,
und ein Modul, das sie nennt, meint sie auch.

**3 · Die Migrationsstufe 69 → 70 läuft jetzt, weil sie heute leer ist.** Kein Modul ist
ausgeliefert. Nach dem ersten trägt dieselbe Stufe echte Bürgerdaten um. Eine unbekannte Kennung
bleibt unverändert stehen — sie ist ein Befund für den Einlassweg, kein Anlass zum Überschreiben.

**4 · XML folgt der Konvention, die JSON schon hat.** Der Schlüssel ist der Elementname ohne
Präfix, adressiert über den **Pfad** — genau die Form von `quelle` und `zuordnung.ziel`. Wer für
XML anders entschiede, führte zwei Konventionen nebeneinander.

**5 · Wiederholungen haben EINE Regel, für XML und CSV gemeinsam.** Mehrere gleichnamige Kinder
werden ein Array; ohne `alsListe` nimmt der Kanal den ersten Eintrag, mit `alsListe` die ganze
Liste. **Die Einschränkung von `vcard-erste` ist dabei kein Vorbild, sondern eine Eigenschaft von
vCard:** `parseVCards` liefert Daten, `parseXML` liefert Struktur.

**6 · Namensräume sind agnostisch — ab hier als Zusage, nicht nur als Verhalten.** Zwei Elemente
gleichen lokalen Namens aus verschiedenen Namensräumen sind für den Kern dasselbe. Das war schon
so; ausgesprochen war es nirgends.

**7 · Drei Zeichen, die ein XML-Name nicht tragen kann, tragen das Übrige:** Attribute unter
`@name`, gemischter Text unter `#text`, der Wurzelname unter `#name`. **Eine Kollision ist
ausgeschlossen, nicht unwahrscheinlich.** `#name` ist der Grund, warum ein Modul ein XML-Format am
Wurzelelement erkennen kann.

**8 · CSV: die erste Datenzeile liegt flach, alle Zeilen unter `#zeilen`.** Der flache Teil ist
derselbe Fall wie `vcard-erste` (die erste Karte); `#zeilen` macht die Wiederholung erreichbar,
statt sie zu verschenken.

**9 · Was der CSV-Leser NICHT kann, sagt er.** Ohne BOM ist UTF-8 gegen Windows-1252 nicht sicher
erkennbar, und eine Fehlannahme erzeugt Umlaut-Schrott **statt eines Fehlschlags** — der
unangenehmste der vier Punkte, weil er stumm ist. Der Leser entfernt eine BOM, erkennt die
typischen Mojibake-Folgen und meldet sie unter `#kodierungVerdacht`. **Er rät nicht und er
schweigt nicht.** Doppelte Spaltennamen überschreiben sich ebenfalls nicht: die zweite Spalte
bekommt einen Zusatz.

**10 · Ein Ausgabe-Modul braucht keinen Leser mehr.** Bis heute verlangte `formatModulPruefen`
die Kennung unbedingt, ohne Rücksicht auf `richtung` — ein reines Ausgabemodul musste einen Leser
nennen, den es nie benutzt. **In keiner ADR und keinem Beschluss stand, warum.** Der Leser wird
ausschliesslich im Import-Kanal aufgerufen; die Anforderung hatte keinen Gegenstand. **Die
Prüfung wird damit weiter, nicht enger** — ein Bestandsmodul mit `leser` bleibt gültig.

**11 · `sd-jwt@1` liest die kompakte SD-JWT-Form — unsigniert als Selbstauskunft, signiert gar nicht.** Was
Vivodepot ausgibt, muss wieder hereinkommen: die eigene kompakte Ausgabe (`alg: none`, Offenlegungen mit Tilde)
wird gelesen wie die JSON-Selbstauskunft, in dieselbe Form `{ vct, iss, iat, claims }`; die eingebauten
`sd-jwt-vc-*`-Importe nehmen beide Formen. Eine **signierte** Form wird benannt abgewiesen („signierter Nachweis,
Prüfung nicht verfügbar"): ihre Aussage hinge an einer Prüfung gegen die Vertrauenslisten des Ausstellers, und
dieses Tor bleibt nach U2-ADR-080 zu. Einen Schreiber gibt es nicht (Digest asynchron). Belegt in
`tests/sd-jwt-kompakt-rundlauf.test.js`.

## Die Folgen, benannt

- **Die zwei bestehenden XML-Wege bleiben unberührt.** Der neue Leser kam als vierter Nutzer von
  `parseXML` **daneben**, nicht hinein. `parseCamt053` und `parseXMeld` sind unverändert.
- **Der Pfad bindet ein Modul an die Baumform des Absenders.** Eine Schema-Nebenversion mit einer
  zusätzlichen Hülle macht ein Modul ungültig. Das ist der bekannte Preis der Pfad-Konvention und
  gilt für JSON heute schon; `quelleWurzelFallback` mildert ihn an der Wurzel.
- **Die Kodierungsfrage bleibt offen und ist es bewusst.** Echte Beispieldateien aus einem
  deutschen Excel-Export würden mehr belegen als erfundene; sie liegen nicht vor.

---

*Vivodepot GmbH · 20.08.2026*
