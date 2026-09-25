# U2-ADR-NNN — Der offene JSON-Vollexport wird entfernt, nicht gefiltert

**Datum:** 17.09.2026
**Status:** Angenommen (17.09.2026, wörtlich: „Ich habe jedenfalls nicht entschieden, dass es
ein Scheunentor in der Anwendung gibt.")
**Nummer:** U2-ADR-NNN (Nummer erst beim Landen zu vergeben — höchste zum Zeitpunkt des Schreibens
unklar, mehrere Zweige laufen parallel).
**Typ:** Datenschutz-Architektur-Entscheidung, keine Krypto-Änderung.
**Bezug:** U2-ADR-102 (Untersagungs-Gate — der Fund, der zu dieser ADR führte) · U2-ADR-058 („Ganzes
Depot" in beide Türen — hält den JSON-Export bewusst in den Einstellungen, materiell überholt für
diesen einen Weg, s. u.).

---

## Kontext

Beim Messen der U2-ADR-102-Ausgänge (17.09.2026, echter Weg: Kern → Export, keine synthetische
Abkürzung) zeigte sich: eine Bürgerin, die ihre KI-Verfügung erst mit „erlaubnis" samt Bedingungen
beantwortet und danach auf „untersagung" umschaltet — der Assistent fragt die Bedingungen bei
„untersagung" nicht mehr ab, löscht aber auch die alten Antworten nicht — kann diese Bedingungen
über **„Alle Daten als Datei (JSON)"** (Einstellungen → Sichern & Wiederherstellen) unverschlüsselt
herausgeben. Der Text an diesem Knopf lud dazu ausdrücklich ein: „zum Umziehen, Sichern oder
Weitergeben." Anzeige, PDF-Export, QR-Datenschicht und der amtliche KI-Verfügungs-Dokumentgenerator
halten das Untersagungs-Gate bereits durch — dieser eine, offene Weg nicht: `vollExportJSON()`
filtert nur nach der Sensibel-Klassifikation (`feldIstSensibel`), nie nach der bedingten Sichtbarkeit
(`feldSichtbar`/`verborgenWenn`), die die anderen Wege tragen.

Ein erster Entwurf sah vor, `vollExportJSON()` um genau diesen Filter zu ergänzen (Default filtert,
ein Opt-in für den Sicherungsfall nicht) — mit Rot-Beweis, Gegenprobe und Rundlauf bereits gebaut und
gemessen. Bei der Prüfung der Aufrufstellen zeigte sich: der Hinweistext an diesem Knopf beschreibt
IHN als Weg für „Umziehen, Sichern ODER Weitergeben" — drei Absichten über einen einzigen,
undifferenzierten Klick, ohne dass die Oberfläche zwischen ihnen unterscheidet.

## Entscheidung

**Der offene JSON-Export wird entfernt, nicht gefiltert oder umformuliert.** Begründung,
wörtlich sinngemäß: ein Produkt, das Datenschutz architektonisch behauptet, kann nicht daneben einen
Knopf haben, der eine unverschlüsselte Volldatei ablegt — eine Nutzerin unterscheidet die beiden
Knöpfe nicht, und ein Prüfer fragt nicht nach dem Hinweistext, sondern nach der Datei.

Die beiden Alternativen, die den Export erhalten hätten, sind damit hinfällig:
- **Lesen** der eigenen Daten geht über die Lese-App, die die Bürgerin selbst besitzt.
- **In ein anderes Programm bringen** (Umzug/Sicherung) geht über den bestehenden, verschlüsselten
  Weg (`depotHerunterladen()` / „Sicherungskopie erstellen" im Depot-Menü) — vollständig, verlustfrei,
  unberührt von dieser Entscheidung.

Der beste Wächter für ein Leck ist der, den man nicht braucht, weil der Ausgang selbst verschwindet.

**Der Import bleibt.** Er erzeugt keine unverschlüsselte Datei, er liest eine — Menschen, die bereits
eine solche Datei besitzen, behalten den Weg zurück in ihr Depot. Diese Entscheidung galt dem
Scheunentor, nicht dem Weg zurück; das ist eine eigene, hier nicht getroffene Entscheidung.

**`vollExportJSON()` selbst bleibt.** Sie ist seit dieser ADR ausdrücklich kein Bürgerweg mehr, nur
noch ein internes Meßinstrument — 29 Testdateien und 12 Werkzeuge nutzen sie, um die Vollständigkeit
eines Depot-Zustands zu prüfen (Rundläufe, Feld-Abdeckung), nie über eine Oberfläche erreichbar.

## Verhältnis zu U2-ADR-058

U2-ADR-058 (05.07.2026) hat diesen Knopf ausdrücklich in den Einstellungen belassen und die Sektion
zu „Sichern & Wiederherstellen" (Wartung) umbenannt, mit der Begründung „Sichern ist kein
Weitergeben — anderes mentales Modell, anderer Ort." Diese Begründung ist für den JSON-Weg **materiell
überholt, nicht falsch**: der Unterschied zwischen „Wartung" und „Weitergabe" existierte nur in der
Kategorisierung des Bauteams, nie in der tatsächlichen Datei oder im Verhalten der Nutzerin — dieselbe
unverschlüsselte Volldatei, derselbe Klick, dieselbe Möglichkeit, sie weiterzugeben. Die übrige
Struktur von U2-ADR-058 (Gesamt-Export unter „Daten herausgeben", Sichern & Wiederherstellen als
reine Wartungssektion) bleibt unverändert gültig — nur der eine Knopf darin entfällt.

## Umsetzung

- `vivodepot.html`: `EXPORT_FORMATE`-Eintrag `'json'` entfernt; `STRINGS.exportJsonLabel` /
  `.exportJsonHinweis` / `.exportJsonFertig` (DE+EN) entfernt; Knopf + Klick-Verdrahtung in der
  Einstellungen-Sektion „Sichern & Wiederherstellen" entfernt (Sektion zeigt danach nur noch
  Wiederherstellen — eine mögliche Umbenennung der Sektion ist eine eigene, hier nicht getroffene
  Entscheidung). `vollExportJSON()` trägt einen neuen Kopf-Satz: kein Bürgerweg mehr, nur Meßinstrument.
- Tests: `tests/u2-adr-102-vollexport-weitergabe-filtert.test.js` umgebaut zu einem
  Abwesenheits-Wächter (prüft, dass das Format nicht mehr existiert, statt dass es filtert) —
  die ursprüngliche Messung bleibt darin als Beleg erhalten. `tests/export-json.test.js`,
  `tests/einstellungen.test.js`, `tests/kette-02-migrationsstufe-67.test.js` entsprechend
  angepasst (Format-Abwesenheit statt Format-Anwesenheit). `tests/e2e/02-anlass-blatt-export.spec.js`
  entfernt (testete ausschließlich den entfernten Weg; die davon unabhängige
  Anlass-Export-Funktion ist bereits durch `tests/kette-03-anlass-ausgang.test.js` u. a. gedeckt).
  `tests/e2e/herausgabe-ohne-auswahl-abnahme.spec.js`: der json-spezifische Test entfernt (dieselbe
  Zusicherung — Sensibel-Opt-in für menschen/institutionen/bevollmaechtigte — ist bereits durch
  `tests/vollexport-ueber-sektoren-hinaus.test.js` auf Funktionsebene gedeckt).
  `tests/e2e/sw-uebernahme-keine-same-origin-anfrage.spec.js`: Testvehikel von `'json'` auf
  `'fhir-ips'` umgestellt (dieselbe Zusicherung — kein Same-Origin-Netzaufruf bei der Erzeugung).
  `tools/lesedurchgang-aufnahme.js`: der Screenshot-Schritt am entfernten Knopf entfernt.
- `docs/faktenbasis.md`: neu erzeugt (`node tools/faktenbasis-erzeugen.js`) — Export-Format-Zahl
  ändert sich von 11 auf 10.

## Konsequenzen

- **Positiv:** kein Weg mehr, auf dem eine zurückgenommene Willensäußerung (nicht nur die
  KI-Verfügung — jedes über `verborgenWenn` bedingt verborgene Feld) unverschlüsselt und
  unbemerkt das Depot verlassen kann. Das Gerüst wird kleiner, nicht komplizierter.
- **Kein Fähigkeitsverlust:** Lesen (Lese-App) und Umzug/Sicherung (verschlüsselter Depot-Download)
  bleiben vollständig erhalten, über ihre jeweils eigenen, bereits bestehenden Wege.
- **Offen, nicht Teil dieser Entscheidung:** ob die Einstellungen-Sektion „Sichern & Wiederherstellen"
  umbenannt werden soll, jetzt wo nur noch „Wiederherstellen" darin steht — eine eigene, noch offene
  Entscheidung.
