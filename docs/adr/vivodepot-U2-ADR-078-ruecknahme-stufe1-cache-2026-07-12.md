# U2-ADR-078 · Rücknahme des passwortlosen Stufe-1-Cache

**Status:** Akzeptiert · 12.07.2026 (Bau umgesetzt, Suite/Gates grün)
**Nummer:** U2-ADR-078 (verifiziert gegen `docs/adr/` — höchste belegte war U2-ADR-077).
**Typ:** Sicherheits-/Datenschutz-Entscheidung (Rücknahme einer Architektur-Schicht).
**Amendiert:** ADR-061, ADR-061v2, ADR-061v3, ADR-099, ADR-109 (interne dreistellige Reihe).
**Verwandt:** U2-ADR-077 (Notfall-QR → Kontakte-vCard), ADR-097 (Papier-Notfallkarte), ADR-098 (Lese-App).
**Status heute:** gilt — Beleg `tests/krypto-verbote.test.js`.

---

## Kontext

Jede gespeicherte `.vivodepot`-Datei trug bis heute einen unverschlüsselten Klartext-Bereich neben dem Chiffrat: den `notfallCache`. Er enthielt zehn Felder aus `NOTFALL_KERN_FELDER`, darunter vier Gesundheitsdaten nach Art. 9 DSGVO — Blutgruppe, Allergien, laufende Medikamente und chronische Diagnosen. Die drei letzten sind Freitext; die hinterlegten Code-Listen (SNOMED, ATC, ICD-10) sind Eingabe-Hilfen, keine Schranken. Das Feld `krankheiten` kann jede Diagnose tragen.

Der Cache wurde bedingungslos bei jedem Speichern gebaut. Es gab kein Opt-out. Er wurde gelesen von der passwortlosen Tür „Für Sanitäter — Akut-Daten ohne Passwort" in der Bürger-App und in der Lese-App.

### Die Entscheidungslinie

ADR-061 („Mit Einwilligung") → ADR-061v2 („Zweistufig") → ADR-061v3 → ADR-099 (Mengenbegrenzung und Aufklärung) → **ADR-109 (Final-Entscheidung, 24.05.2026, akzeptiert)**.

ADR-109 stellt den gesamten Cache auf **eine** benannte Voraussetzung, die **Stick-Greifbarkeits-Annahme**:

> „eine Notärztin oder ein Sanitäter findet den Stick, schließt ihn an, sieht in zwei Sekunden die lebenswichtigen Daten."

Die ADR benennt die Annahme selbst als unsicher: „Die Annahme ist nicht für jede Bürgerin gleich tragfähig."

ADR-109 entschied Option (a) — unverschlüsselter Cache — unter **zwei** Auflagen. Disziplin 1: Allowlist über eine erzwungene Schreibfunktion mit Audit. Disziplin 2: Aufklärungs-Text gegenüber der Bürgerin, mit vorformuliertem Wortlaut.

**Von Disziplin 1 ist nur die Lese-Allowlist gebaut, nicht die erzwungene Schreibfunktion. Von Disziplin 2 ist nichts gebaut.** Der heutige Zustand ist die Variante, die ADR-099 ausdrücklich als verworfen markiert: unbedingter Cache ohne Aufklärung.

### Der Feldsatz war unbefugt gewachsen

Der reale Cache trug zehn Felder. Autorisiert waren sieben. Hinzugekommen sind Vorname, Nachname, Geburtsdatum sowie der Ablageort der Patientenverfügung — ein Feld, das ADR-099 ausdrücklich aus Stufe 1 ausgeschlossen hatte. Der Feldsatz war unbefugt gewachsen.

### Die eingebaute Re-Prüfungs-Klausel

ADR-109 schrieb zwei Trigger für eine Neubewertung fest:

> „Wenn die Stick-Greifbarkeits-Annahme bricht … Re-Prüfung der Stufe-1-Logik."
> „Wenn ein neuer Krypto-Befund die Stufe 1 als kritischer einschätzt als heute — die ADR wird neu bewertet."

Diese ADR vollzieht die Klausel. Sie übergeht ADR-109 nicht, sie führt aus, was ADR-109 für diesen Fall vorgesehen hat.

---

## Was sich geändert hat

### Trigger 1 — die Stick-Greifbarkeits-Annahme trägt nicht

Der Stick ist real. Vivodepot wird als Stick ausgeliefert und über die Website zum Download angeboten; das White-Label-Konzept baut auf dem Stick auf. Insofern ist die Annahme aus ADR-109 nicht widerlegt: die Bürgerin kann ihn am Körper tragen.

**Sie bricht an einer anderen Stelle — der Stick ist greifbar, aber nicht einsteckbar.**

Am Unfallort fehlt jede Voraussetzung: kein Rechner, kein Browser, keine geöffnete App, keine Zeit. Ein Ersthelfer greift in die Brieftasche, nicht an den Schlüsselbund.

In der Notaufnahme scheitert es an der IT: Kliniken lassen fremde USB-Datenträger an ihren Systemen nicht zu. Der Weg, den ADR-109 vor Augen hatte — Stick in den Klinikrechner, Akutdaten in zwei Sekunden — findet in der Praxis nicht statt.

Damit bleibt kein Leser übrig, der den passwortlosen Cache **braucht**. Es bleiben nur die Leser, vor denen er schützen sollte: wer die Datei sonst in die Hand bekommt — der Finder des Sticks, die Angehörige am Rechner, der Empfänger einer weitergegebenen Datei.

**Der Cache erreicht den Sanitäter nicht. Er erreicht nur die anderen.**

Dieser Befund kam nicht aus dem Code. Er kam aus der Kenntnis des Feldes.

### Trigger 2 — der Klartext-Notfallkanal ist gefährlicher als angenommen

Am 12.07.2026 (U2-ADR-077) zeigte sich, dass derselbe Feldsatz über den Notfall-QR an die Google-Websuche abfließen konnte: die iOS-Kamera reicht Klartext ohne Handler-Ziel an die Suche weiter. Die vier Art.-9-Felder — einschließlich Diagnosen und Medikation — waren betroffen.

Der QR ist seither auf eine Kontakte-vCard ohne Gesundheitsdaten umgestellt. Der Cache trug dieselben Felder weiter, im Klartext, in jeder Datei.

### Der Widerspruch zur öffentlichen Zusage

Die Website sagt wörtlich:

> „Ohne Passwort kann niemand die Daten auf dem Stick lesen — für einen Finder ist er ein leeres Stück Metall."

Das ist heute falsch. Der Cache **ist** der Finder, der doch liest.

---

## Entscheidung

**Der passwortlose Stufe-1-Cache entfällt ersatzlos.**

`notfallCache` wird nicht mehr in den Umschlag geschrieben. Die passwortlose Tür „Für Sanitäter — Akut-Daten ohne Passwort" entfällt in der Bürger-App und in der Lese-App.

Der Anwendungsfall bleibt gültig und ist weiterhin gedeckt: **durch die Papier-Notfallkarte (ADR-097).** Sie trägt dieselben Felder als lesbaren Text, liegt in der Brieftasche, funktioniert ohne Gerät, ohne Akku, ohne IT-Freigabe — und wird an dem Ort gefunden, an dem Ersthelfer suchen.

ADR-109 hatte die Karte selbst als Backup für den Bruch der Stick-Annahme vorgesehen. Der Fall ist eingetreten.

Papier-Notfallkarte und Bürger-Live-Sicht bleiben unberührt. Beide lesen `notfallKernModell()` direkt aus `data`, nicht aus dem Cache. Die Bürger-Live-Notfallsicht (`renderNotfall`, Sidebar-Einstieg `geheZuNotfall`) bleibt als der eine, hinter dem Passwort liegende Weg bestehen.

---

## Migration bestehender Dateien

Garantiert ist ein sauberer Umschlag ab dem nächsten Speichervorgang. Eine rückwirkende Tilgung gibt es nicht. Dateien, die bereits im Umlauf sind — Kopien, Backups, iOS-Exportduplikate — behalten den Klartext. Die App kann sie nicht erreichen.

**Mechanik:** Weil IndexedDB-Persistenz und `.vivodepot`-Datei denselben `depotSerialisieren()`-Umschlag nutzen (byte-identisch), ist mit dem Entfernen von `notfallCache` aus `depotSerialisieren` **jeder** künftige Speichervorgang cachefrei — Datei wie interner Stand. Zusätzlich markiert `depotLaden` ein Depot, dessen geladener Umschlag noch den Alt-Cache trägt, **als ungespeichert** (Migrations-Nudge), damit der nächste Speichervorgang einen sauberen Umschlag schreibt. Das ist ein Best-Effort-Anstoß für aktiv genutzte Depots, keine Garantie: was die App nicht neu schreibt, kann sie nicht säubern.

---

## Verworfene Alternativen

**Reduzieren auf Mindest-Felder** (Blutgruppe, Allergien, Kontakte; Diagnosen und Medikation streichen). ADR-109 nennt diese Option selbst. Sie wäre richtig, wenn ein realer Leser übrig bliebe, für den drei Felder besser sind als fünf. Der bleibt nicht übrig. Eine kleinere Exposition ohne Leser ist immer noch eine Exposition ohne Gegenleistung.

**Behalten und Disziplin 2 nachbauen** (Aufklärungsdialog, Opt-out, Editor-Warnung). Das wäre der Zustand, den ADR-109 eigentlich beschlossen hat, und er wurde ernsthaft erwogen. Er scheitert daran, dass die Aufklärung die Exposition sichtbar macht, aber nicht kleiner. Ein Dialog, der informiert, ist kein Ersatz für einen Nutzen, den es nicht gibt. Die Bürgerin würde einwilligen, ihre Diagnoseliste offenzulegen — für einen Leser, der nie kommt.

---

## Konsequenzen

**Positiv.** Die Kernzusage wird wahr: ohne Passwort ist die Datei nicht lesbar. Die vier Art.-9-Felder liegen nur noch verschlüsselt vor. Die Website-Aussage über das leere Stück Metall stimmt wieder. Der Widerspruch zwischen öffentlichem Modell und tatsächlicher Datei ist aufgelöst.

**Negativ.** Die Bürgerin ohne Papier-Notfallkarte hat im Notfall keinen digitalen Auffangweg mehr. Das ist der Preis, und er ist bewusst: Der Auffangweg hätte den Notfall ohnehin nicht erreicht.

**Nachzuziehen.**
Die Website beschreibt den Notfall-QR weiterhin als Klartext mit Gesundheitsdaten („mit jeder Kamera lesbar"). Das ist seit U2-ADR-077 falsch — unabhängig von dieser ADR und dringend.
Der Lese-App-Notfallpfad (passwortloser File-Cache) entfällt; ADR-098 ist entsprechend zu amendieren. Der davon getrennte QR-Notfall-Lesepfad der Lese-App (`parseNotfallQrText`) ist seit U2-ADR-077 toter Code (der Bürger-QR ist eine Kontakte-vCard) und bleibt für eine separate U2-ADR-077-Nachziehung stehen — er berührt den hier geschlossenen Klartext-Datei-Cache nicht.

---

## Offene Punkte

Ob die Papier-Notfallkarte den vollen Feldsatz tragen soll, ist nicht Gegenstand dieser ADR. Die Karte hält die Bürgerin selbst in der Hand; ihr Threat-Model ist ein anderes als das der Datei.

Ob die Papierkarte in der Praxis erreicht wird — ob Bürgerinnen sie drucken und mitführen — ist ungeprüft und war es auch, als ADR-109 sie zum Backup erklärte.

---

## Verifikation

- **Bürger-App:** `notfallCache` aus `depotSerialisieren` entfernt; `notfallCacheBauen`/`notfallCacheAusUmschlag`/`flowNotfallAusDatei`/`notfallStufe1` entfernt; passwortlose Türen (Welcome `w-notfall` + crypto-overlay `co-notfall`) entfernt; `renderNotfall` auf reine Live-Sicht (immer Karte + QR); Migrations-Nudge in `depotLaden`.
- **Lese-App:** `notfallCacheAusUmschlag` + passwortloser Cache-Knopf in `renderPasswort` entfernt (ein Voll-Depot wird nur mit Übergabe-Passwort geöffnet).
- **Tests:** `notfall-cache.test.js` invertiert (kein Cache-Sibling, kein Art-9-Klartext, Funktionen entfernt, Migrations-Nudge, Live-Sicht); Umschlag-Form-Pins (`umschlag-form`, `urheberschaft`) auf sieben Felder ohne `notfallCache`; `sicherheit-block-a` (kein Klartext-Feld), `datei-magic` (kein passwortloser Magic-Pfad, beide Apps), `eingang-fix`/`notfall-stelle`/`speicherformat` (Türen weg). Node-Suite **1346/0**.
- **Gates:** Block-Pin `8d31c678…` byte-identisch (Krypto-Block unberührt), PV-Golden **42/42**, `vivodepot.html.sha256` nachgezogen, SW-Cache **v52 → v53**.
- Kein Push (eine Produktentscheidung).

## Konformität

```konformitaet
aussage:   U2-078: der passwortlose Stufe-1-Cache ist ersatzlos entfernt — kein notfallCacheBauen,
           kein notfallCacheAusUmschlag, kein flowNotfallAusDatei, und kein Schreiben eines
           notfallCache in Umschlag/Speicherpfad.
zustand:   prüfbar
pruefung:  tests/krypto-verbote.test.js#u2-078-kein-passwortloser-stufe1-cache
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (Stufe 6). In Stufe 3a war U2-078 aus der Z2-Bindung ausgekoppelt
worden, weil Z2 `caches.*` erlaubt und die **Absenz**-Spezifik nicht deckt — dieser Test schließt genau
diese Lücke (Abwesenheit der drei entfernten Pfade + kein Schreiber). Die verbliebenen
`notfallCache*`-Strings sind UI-Texte der **Live**-Sicht hinter dem Passwort (kein Klartext-Cache).*
