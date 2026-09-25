# U2-ADR-031: Persistenz-Ehrlichkeit — Status ≠ Aktion, „gesichert" nur für die Datei

**Status:** Akzeptiert
**Datum:** 21.06.2026
**Kategorie:** PERSISTENZ, UX, PRODUKT
**Grundlage:** Generationen-Persistenz-Befund (21.06., intern) + Stück-1-Stufe-1 (Status-Sprache) + Wortentscheidung. Folge-Strang zu U2-ADR-015 (D43 Zwei-Ebenen-Persistenz).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `_aktuelleDateiSicherung` + `markiereAlsDateiGesichert` + `saveStatusModell` (reines Modell); `markiereUngespeichert` (entwertet das Datei-Signal); `depotHerunterladen` (setzt es bei Erfolg); `depotInternSichern` (Toast `saveStatusInternToast`, setzt das Signal NICHT); `depotInDateiSichern` (hält im internen Modus den IDB-Cache mit aktuell + Toast `saveStatusDateiToast`); `renderSaveStatus` (drei Zustände, Knopf → `depotInDateiSichern`); STRINGS `saveStatus*`; CSS `.ist-keine-datei`.
- **Sprint-Commit:** noch nicht committet (Halt vor dem Bündeln).
- **ADR-Bezug:** dieser ADR (U2-ADR-031).
**Status heute:** gilt — Beleg `tests/persistenz-status.test.js` (PS1–PS9), Kernmechanik über alle zwölf Stücke nachweisbar (`saveStatusModell`, `_letzterSpeicherFehlgeschlagen`, `_einstiegsmarke`, `schliessenWarnungNoetig`); von U2-ADR-097/125 als bestehende, weiterentwickelte Zusicherung referenziert, nicht abgelöst.

---

## Kontext

Der Persistenz-Befund (21.06.) hat belegt: im internen/gehosteten Modus meinte „Gespeichert ✓" (Status-Pille) und „Depot gesichert." (Toast) nur den **evictbaren IndexedDB-Cache** — dieselbe „gesichert"-Sprache wie nach einem echten `.vivodepot`-Datei-Export. Eine Laiin konnte glauben, sie habe eine dauerhafte Datei, hielt aber nur den Cache. Zugleich gab es im internen Modus **keinen sichtbaren Knopf** für die Datei-Sicherung (nur einen wegklickbaren Erinnerungs-Toast) — `depotInDateiSichern` wird über `depotPersistieren` nur im Datei-Modus erreicht.

## Entscheidung

**Leitprinzip: Status ≠ Aktion. „gesichert" nie mehr für reinen internen Speicher. Die Sicherung ist durchführbar (ein Knopf), nicht nur eine Warnung.**

1. **Status (nur Anzeige), drei Zustände** aus dem reinen Modell `saveStatusModell()`:
   - `ungespeichert` — offene Edits → „N ungespeicherte Änderungen" (Knopf aktiv).
   - `keine-datei` — interner Stand gespeichert, **keine aktuelle Sicherungsdatei** → „Gespeichert — keine Sicherungsdatei" (Knopf aktiv).
   - `als-datei` — aktuelle `.vivodepot`-Datei liegt vor → „Als Sicherungsdatei gespeichert ✓" (Knopf ruhig). Häkchen **nur** hier.
2. **Aktion (Knopf):** „Jetzt als Datei sichern" führt direkt zum `.vivodepot`-Export (`depotInDateiSichern`); im internen Modus hält dieser Pfad zuerst den IDB-Cache aktuell (`depotInIdbSichern`), damit ein Datei-Save den Komfort-Cache nicht veralten lässt. Knopf sichtbar in `ungespeichert`+`keine-datei`, ruhig in `als-datei`.
3. **Mechanik (das Häkchen lügt nicht):** EIN Signal `_aktuelleDateiSicherung`. Ein erfolgreicher Datei-Save **setzt** es (`depotHerunterladen`); **jede** Änderung **entwertet** es (`markiereUngespeichert`); der interne IDB-Save **setzt es nicht** (`markiereGespeichert` lässt es unberührt). So steht „Als Sicherungsdatei gespeichert" nur, solange die Datei wirklich zum Stand passt.
4. **Toasts getrennt:** interner Save → „Gespeichert. Für eine Sicherung gelegentlich als Datei speichern."; Datei-Save → **reine Erfolgsmeldung** „Ihre Sicherung wurde als Datei gespeichert." **Kein Öffnen-/Doppelklick-Hinweis im Speicher-Moment** (Produktentscheidung, 21.06.): die Nutzerin IST in Vivodepot, der Hinweis setzt eine Programm↔Datei-Trennung voraus, die eine Laiin nicht hat. Der Öffnen-/Wiedereinstiegs-Hinweis gehört an den Wiedereinstieg (Welcome „Schon ein Vivodepot? Datei öffnen") — eigener Strang; der alte Hinweis-String `STRINGS.gespeichert` ist seither ungenutzt (geparkt).

## Konsequenzen

- Die frühere einheitliche „Gespeichert ✓"/„Depot gesichert."-Sprache für reinen Cache entfällt. `saveStatusGespeichert`/`gespeichertGeteilt` bleiben als STRINGS erhalten, aber der Cache-Pfad nutzt sie nicht mehr.
- Der Pillen-Knopf ist nicht mehr auf `kernAPI.speichern` (= IDB im internen Modus), sondern auf die **ehrliche Datei-Aktion** verdrahtet. Der zugehörige Standtest (`topbar-sichern-einzeln-d46`) wurde auf die neue Verdrahtung nachgezogen.
- Browser-verifiziert (echte Sitzung, interner IDB-Modus): alle drei Zustände rendern korrekt, keine Konsolenfehler; Datei-Save → Häkchen, Edit → Rücksprung. Test: `tests/persistenz-status.test.js` (PS1-1..3).
- **Bewusst nicht hier:** die Plattform-Mechanik des Datei-Speicherns (Chromium in-place-Überschreiben vs. iOS geführt) — das ist Stück 3. Block-Pin `8d31c678…` unberührt.

## Stück 2 — Verlust laut machen (Schließen-Warnung, Variante B)

Grundlage: Generationen-Persistenz-Befund F3/F4 + Produktentscheidung, 21.06. **Drei-Anker:** `schliessenWarnungNoetig()` (reines Modell), `_dateiVerlustQuittiert`-Flag, `flowSchliessenWarnungEchteSitzung` (zwei Fälle), `flowAppSchliessen`, `beforeunload` — alle auf dieselbe Bedingung; STRINGS `d40VorDemSchliessenTitel`/`d40KeineDateiText`.

- **Trigger (Variante B):** Schließen warnt bei **ungespeicherten Edits** (wie bisher) **oder** wenn Inhalt da ist, **keine aktuelle Sicherungsdatei** vorliegt (`_aktuelleDateiSicherung` aus Stück 1) **und** die Nutzerin den Verlust **noch nicht quittiert** hat. Leeres Depot warnt nie (Inhalt-Gate über `vorschauHatDaten`). „Trotzdem schließen" setzt `_dateiVerlustQuittiert` → kein erneutes Nerven, bis eine neue Änderung kommt (`markiereUngespeichert` setzt es zurück).
- **Zwei Modal-Fälle:** (a) Edits → „Nicht gespeichert" + „Sichern und schließen" (IDB). (b) kein File → **„Vor dem Schließen"** + „Sie haben noch keine aktuelle Sicherungsdatei. Ohne Datei kann Ihr Depot verloren gehen, wenn dieses Gerät einmal Speicher freiräumt." + „Jetzt als Datei sichern" (→ `.vivodepot`). Geschlossen wird nur bei echter Sicherung (abgebrochener Datei-Dialog → zurück in die App).
- **`beforeunload`** nutzt dieselbe Bedingung als generischen Backstop (Browser zeigt nur den generischen Dialog; das App-Modal trägt den Wortlaut — auf iOS feuert `beforeunload` oft nicht, dort ist das Modal der Schutz).
- **Start-Erkennung bewusst NICHT gebaut (Variante ii):** ein „du hattest Daten, jetzt weg"-Detektor bräuchte einen Marker, der die IDB-Eviction überlebt — unter Speicherdruck evictet der Browser i. d. R. den ganzen Origin (IDB+localStorage+Cache) zusammen, der Marker wäre also mit-weg. Zudem hält die App `localStorage` bewusst leer. Statt eines unzuverlässigen Detektors liegt die Lautstärke in der Schließen-Warnung + dem Stück-1-Datei-Nudge. Tests: `tests/persistenz-status.test.js` (PS2-1/2). Suite 944/0/1.

## Stück 3 — Datei-Speichern ohne Müll (Plattform-Mechanik)

Grundlage: Generationen-Persistenz-Befund F2 + Produktentscheidung, 21.06. (1=A, 2=a, + Namens-Korrektur). **Drei-Anker:** `_dateiHandle`/`_dateiName` (RAM-Sitzung), `dateiBindungZuruecksetzen`, `_depotBlobSpeichern` + `_dateiNameErfragen`, `depotHerunterladen` (nutzt `_depotBlobSpeichern`), `depotDateiname` (neutral), STRINGS `dateiName*`.

- **Chromium (File System Access):** erstes Datei-Sichern → `showSaveFilePicker()` (aus der Nutzer-Geste des „Jetzt als Datei sichern"-Knopfs) → `FileSystemFileHandle`; jedes weitere Sichern → `handle.createWritable()` in **dieselbe Datei** (in-place, kein Müll). **Handle nur im RAM/Sitzung** (Entscheidung 1=A): **keine** Handle-Persistenz in IndexedDB; nach Reload erneut Picker. `dateiBindungZuruecksetzen()` löst die Bindung bei neuem/geladenem Depot und beim Schließen (`_depotSpeicherZuruecksetzen`).
- **iOS/Safari/Firefox (kein in-place möglich):** Web-Share/Download. Beim ersten Mal **Name erfragen** (`_dateiNameErfragen`) mit **ehrlichem „selbe Datei ersetzen"-Hinweis**; gewählter Name wird für die Sitzung gemerkt → stabiler Name, damit die Dateien-App „Ersetzen?" anbietet. **Ehrliche Grenze:** wählt die Nutzerin „beide behalten", entsteht doch eine zweite Datei — das kann die Plattform nicht verhindern, wird nicht übertüncht.
- **Privacy (Produktkorrektur):** Default-Dateiname ist **neutral** `Mein-Vivodepot_<JJJJ-MM-TT>.vivodepot` — **kein** automatischer Vorname/Nachname (gleiche Linie wie der UUID-Ausschluss aus U2-ADR-030); der Name der Bürgerin landet nur im Titel, wenn **sie** ihn selbst hineinschreibt. **Kein Dateisystem-Verweis (Handle/Pfad) in IndexedDB.**
- **Nur Depot-Pfad:** die in-place-/Handle-Logik liegt in `_depotBlobSpeichern` (depot-spezifisch) — generischer `dateiAusgeben` (PDF/JSON-Export) bleibt der normale Download/Share. Tests: `tests/persistenz-status.test.js` PS3-1..3; `speicherformat`-Dateinamen-Tests auf neutral nachgezogen.

## Stück 4 — persist() ehrlich auswerten + iOS-Install-Ermutigung

Grundlage: Generationen-Persistenz-Befund F1/F4 + Produktentscheidung, 21.06. (**1=a**: still an die Datei gekoppelt, kein neuer Alarm; **2=b**: konkrete Anleitung statt bloßer Ermutigung). **Anker:** `persistAnfragen` (jetzt mit ehrlicher Auswertung), `hatPersistApi`, `erhoehtesVerlustRisiko`, `iosNichtInstalliert`, `iosInstallHinweisNoetig`/`iosInstallHinweisVielleichtZeigen`, `sitzungEtablieren` (Hook in `renderContent`), STRINGS `exportErinnerungRisiko` + `iosInstallHinweis`.

- **Teil A — persist() ehrlich:** `navigator.storage.persist()` wird einmal pro Sitzung best-effort angefragt (nie blockierend) und das Ergebnis in `_persistGewaehrt` (`null`=noch nicht gefragt · `true`=gewährt · `false`=abgelehnt **oder** API nicht vorhanden) gemerkt. Daraus die Einstufung `erhoehtesVerlustRisiko()` = interner Cache-Modus **und** nicht als App installiert **und** persist **nicht** gewährt. Bei erhöhtem Risiko schärft sich derselbe Datei-Nudge (`exportErinnerungRisiko` statt `exportErinnerung`) — **kein** neuer Alarm-Kanal (1=a).
- **Teil B — iOS-Install-Hinweis (2=b):** auf iOS-Safari **nicht installiert** (`'standalone' in navigator && navigator.standalone === false` — Feature-Detektion, kein UA-Sniffing) **und** erhöhtem Risiko: **einmal pro Sitzung**, **nach** dem Onboarding (Auslöser „nicht installiert", **nicht** „erster Save"), ein wegklickbarer Toast **mit konkretem Handgriff** („unten auf das Teilen-Symbol, dann ‚Zum Home-Bildschirm'"). Die installierte Home-Bildschirm-PWA ist auf iOS von der 7-Tage-Räumung ausgenommen → dort der einzige echte Persistenz-Hebel.
- **Mess-Befund (messen statt annehmen):** in der Bau-Verifikation (Chromium-Preview, localhost) gab `navigator.storage.persist()` **`false`** zurück (kein Site-Engagement/keine Installation) → `_persistGewaehrt=false`, `erhoehtesVerlustRisiko=true`. Die ehrliche Auswertung greift also auch auf dem Desktop. **iOS-Safari konnte hier nicht real gemessen werden** (nur Chromium-Preview verfügbar): nach dokumentierter WebKit-Lage ist `navigator.storage.persist()`/`persisted()` dort zwar als Funktion vorhanden, gewährt aber i. d. R. **nicht** (kein Ausnehmen von der 7-Tage-Räumung) — Teil A ist dort praktisch ein **No-Op**, und **Teil B trägt allein**. Der Code behandelt **beide** Fälle (API-vorhanden-aber-`false` **und** API-fehlt) gleich robust (Tests PS4-2/PS4-3). **Offen:** eine Messung auf echtem iOS-Gerät.
- Tests: `tests/persistenz-status.test.js` PS4-1..10 (persist-Auswertung, Risiko-Einstufung, iOS-Trigger-Modell, Memoisierung, Strings, Sitzungs-Gate). Suite **956/0/1**. Browser-verifiziert: Skript parst sauber, `sitzungEtablieren` feuert aus `renderContent`, der iOS-Toast rendert genau einmal mit dem Handgriff-Wortlaut. Block-Pin `8d31c678…` unberührt.

## Stück 5 (Nachtrag 08.08.2026) — der vierte Zustand: „Speichern darf nicht mehr still misslingen"

Grundlage: eine eigene Diagnose vom selben Tag (Datenverlust).
**Drei-Anker:** `_letzterSpeicherFehlgeschlagen` (Signal) + `markiereSpeichernFehlgeschlagen()` +
`saveStatusModell()` (vierter Zustand, Vorrang) + `speichernOderFehlschlagMarkieren()` (EIN
Prüfpunkt für jeden `kernAPI.speichern()`-Aufrufer); STRINGS `saveStatusFehlgeschlagen`; CSS
`.ist-fehlgeschlagen`.

**Der Befund:** Sieben Aufrufstellen von `kernAPI.speichern()`/`depotInDateiSichern()` sowie zwei
weitere, ungeschützte `depotInIdbSichern()`-Aufrufe (Konflikt-Dialog „Aus der Datei") trugen ein
bare `catch (_) {}` — ein Schreibfehler erreichte die Bürgerin nie. Der Topbar-„Jetzt sichern"-Knopf
(die von U2-ADR-031 selbst benannte ehrliche Datei-Aktion) rief im internen Modus
`depotInIdbSichern()` VOR dem Datei-Download auf, ungeschützt: schlug der interne Schreibversuch
fehl, warf die ganze Funktion, BEVOR der Download versucht wurde — sichtbar geschah nichts.
Zusätzlich zeigte `flowPasswortSetzen` einen unbedingten Erfolgs-Toast („…verschlüsselt
gespeichert"), unabhängig vom tatsächlichen Ausgang des vorangegangenen Speicherversuchs.


1. **Vierter Zustand, mit Vorrang:** `saveStatusModell()` prüft `_letzterSpeicherFehlgeschlagen`
   VOR den drei bestehenden Zuständen. Ein Fehlschlag ist die einzige Information, die in diesem
   Moment zählt. Wortlaut (Produktentscheidung, 08.08.2026): **„Speichern fehlgeschlagen — bitte
   speichern Sie noch einmal."** Rührt `_ungespeicherteAenderungen` nicht an — die offenen Edits
   bleiben genau das: offen. Gelöscht nur von einem tatsächlich erfolgreichen
   `markiereGespeichert()`/`markiereAlsDateiGesichert()`, nicht von einer bloß neuen Änderung.
2. **EIN Prüfpunkt statt Einzelfall-Reparatur:** `speichernOderFehlschlagMarkieren()` kapselt
   `kernAPI.speichern()` + Erfolgs-/Fehlschlag-Zweig; jeder der sechs verbliebenen
   `kernAPI.speichern()`-Aufrufer nutzt ihn statt eines eigenen `try/catch`. `depotInternSichern()`
   ist im internen Modus der EINZIGE Schreibversuch (keine Datei als Rückfall) — ein Fehlschlag dort
   markiert sich selbst und beendet die Funktion mit dem Rückgabewert `'fehlgeschlagen'` statt einer
   geworfenen Exception; kein Aufrufer braucht mehr eine eigene Fallunterscheidung.
3. **Der Topbar-Knopf (Zug 3, der wichtigste Weg):** `depotInDateiSichern()` schützt den internen
   Vorab-Schreibversuch jetzt mit einem eigenen `try/catch`. Scheitert er, markiert er sich als
   Fehlschlag, blockiert aber NICHT den nachfolgenden Datei-Download — die Datei bleibt der
   Verlass (U2-ADR-031 Grundsatz), der interne Cache nur ein Komfort-Mirror. Gelingt die Datei
   danach, überschreibt der echte Erfolg den kurzzeitig gesetzten Fehlschlag zu Recht.
4. **Kein unbedingter Erfolgs-Toast mehr:** `flowPasswortSetzen` zeigt „Passwort gesetzt — Ihr
   Depot ist jetzt verschlüsselt gespeichert." nur noch, wenn der vorangehende Speicherversuch
   tatsächlich gelang.
5. **Nur die Statuszeile, kein Dialog:** der vierte Zustand lebt ausschließlich in der Topbar-Pille.
   Ein Modal bei jedem misslungenen Feld-Speichern machte die Anwendung unbenutzbar (Produktvorgabe, 08.08.2026); die Schließen-Warnung aus Stück 2 bleibt der laute Kanal.

**Nachtrag zum Nachtrag (08.08.2026, nach `9568f88`):** Stück 2 selbst ("Verlust laut machen")
kannte `_letzterSpeicherFehlgeschlagen` zunächst nicht — `schliessenWarnungNoetig()` prüfte nur
Zähler, Datei-Signal und Quittierung. Grenzfall: ein Fehlschlag bei Zähler 0 und bereits quittiertem
Verlust (z. B. ein reiner IDB-Mirror-Fehlschlag ohne eigene offene Edits) hätte die Anwendung
schweigend schließen lassen. Behoben: `schliessenWarnungNoetig()` prüft den Fehlschlag VOR den
bestehenden Bedingungen; `markiereSpeichernFehlgeschlagen()` entwertet zusätzlich eine bestehende
Quittierung — sie galt einem bekannten, beurteilten Zustand, nicht dem neuen Fehlschlag. Tests:
PS2-3/PS2-4. Browser-Nachweis für den internen Weg selbst (Fall B, `indexedDB` vorhanden, `open()`
scheitert) ergänzt in `tests/e2e/10-speicher-fehlschlag-sichtbar.spec.js` — der ursprüngliche E2E-Fall
deckte ausschließlich den Datei-/Download-Rückfall ab (Fall A), nicht den Weg, der am
08.08. tatsächlich getroffen wurde.

**Bewusst nicht hier (Zug 4 desselben Auftrags, vertagt):** ob `hatIndexedDB()` von einem reinen
Existenz-Check auf eine echte Funktionsprobe (öffnen, schreiben, zurücklesen, löschen) umgestellt
wird — Kosten-/Nutzen-Einschätzung liegt vor, Entscheidung ist eine Produktentscheidung, nicht Teil dieses Baus.

**Cross-Referenz:** U2-ADR-097 §13 („Gespeichert" heißt: tatsächlich geschrieben) — dieselbe Lücke,
als produkttragende Zusicherung geführt. Tests: `tests/persistenz-status.test.js` (PS1-6 ff.).

## Stück 6 (Gesamtumbau-Nachtrag 08.08.2026) — Ausweg, Funktionsprobe, spezifische Fehlermeldung, Politik A

Grundlage: eine eigene Einschätzung zum Ausweg aus dem Fehlschlag und zur Machbarkeit einer echten
Funktionsprobe, aufbauend auf Stück 5 (dieses ADR).

**Zug 1 — der Ausweg aus dem Fehlschlag:** `_speicherFehlschlagAnzahlInFolge` zählt aufeinanderfolgende
Fehlschläge ohne dazwischenliegenden Erfolg; ab dem ZWEITEN (`SPEICHER_FEHLSCHLAG_SCHWELLE_WIEDERHOLT
= 2`, eigener Vorschlag — ein einzelner Fehlschlag kann ein selbstheilender Aussetzer sein) zeigt die
Pille `STRINGS.saveStatusFehlgeschlagenWiederholt` statt der schlichten Erstmeldung. Wortlaut
(Produktentscheidung, 08.08.2026): **„Speichern erneut fehlgeschlagen — bitte nutzen Sie ‚Als Datei
sichern'."** Der Ausweg selbst war bereits vorher erreichbar (derselbe Knopf, `depotInDateiSichern`
hängt nicht an IndexedDB) — neu ist nur, dass die Pille ab der Schwelle explizit darauf verweist,
statt zur Wiederholung desselben Wegs aufzufordern. Bestätigt: ein erfolgreicher Datei-Save räumt
`_letzterSpeicherFehlgeschlagen` (und die Fehlschlags-Folge) ab, damit erlischt auch die dauerhafte
Schließen-Warnung — geprüft in PS5-2/PS5-9.

**Regressionsfund während des Baus, nicht Teil des Auftragstextes:** `speichernOderFehlschlagMarkieren()`
zählte einen `depotInternSichern()`-Fehlschlag zunächst DOPPELT — die Funktion markiert sich seit
Stück 5 bereits selbst (Rückgabewert `'fehlgeschlagen'`), der Wrapper markierte zusätzlich ein
zweites Mal. Ein einzelner Fehlschlag hätte sofort als „wiederholt" gegolten, die Schwelle wäre
wirkungslos gewesen. Nur die Browser-Abnahme (Fall B, `tests/e2e/10-speicher-fehlschlag-sichtbar.spec.js`)
hat das gefunden — kein Node-Test der Stücke 1–5 prüfte `speichernOderFehlschlagMarkieren()` gegen
einen `depotInternSichern()`-Fehlschlag. Behoben, Regressionsschutz PS5-11.

**Zug 2 — die Funktionsprobe:** `internSpeicherFunktionsprobe()` öffnet, schreibt, liest zurück,
löscht — einmal pro Sitzung, nebenher (`internSpeicherProbeStarten()` aus `booteEingang()`, kein
Blockieren des ersten Renders). Der synchron↔asynchron-Knoten aus der Vorgänger-Einschätzung
entfällt: `internerSpeicherModus()` bleibt synchron, liest nur `_internSpeicherProbeErgebnis`
(`null` bis zur Rückmeldung → heutiges Verhalten unverändert; `false` → Vorrang, kippt in den
Datei-Modus). Bestätigt sie einen funktionsunfähigen Speicher, BEVOR ein Depot existiert, zeigt ein
einmaliger Hinweis den Ausweg — Wortlaut (Produktentscheidung, 08.08.2026): **„Automatisches Speichern
ist auf diesem Gerät nicht verfügbar — sichern Sie Ihr Depot stattdessen selbst als Datei."**

**Isolations-Fund während des Baus:** die Probe läuft NICHT über `VdStore`/`VDSTORE_DB` (die echte
Depot-Datenbank), sondern über eine eigene, komplett getrennte Datenbank (`vivodepot-funktionsprobe`).
Grund real, nicht nur test-technisch: `internerStandMeta()`/`VdStore.liste()` lesen denselben Object
Store 'depots' und sortieren nach `gespeichert_am` — liefe die Probe (schreiben → lesen → löschen)
gegen dieselbe Datenbank NEBENHER, während ein Boot-Vorgang genau diese Liste abfragt, könnte er auf
den Probe-Datensatz (`cipherBlob` kein gültiger v3-Umschlag) treffen, bevor er wieder gelöscht ist —
„Interner Stand beschädigt". Beim Bau zuerst als Testsuiten-Kollision aufgefallen (mehrere
bestehende D43-Etappe-Tests schlugen fehl, sobald die Probe unbedingt bei jedem `ladeKern()` mitlief),
dann als reale, wenn auch seltene Race erkannt und durch die Trennung behoben — nicht nur
weggetestet.

**Zug 3 — spezifische Fehlermeldung statt Ratlosigkeit:** `fehlermeldungFuer(e)` erkennt die
wortgleiche `new Error('Kein offenes Depot.')`-Wächterklasse (26 Vorkommen im Kern) und liefert
`STRINGS.keinOffenesDepotFehler` („Ihr Depot ist gerade nicht geöffnet. Bitte laden Sie die Seite
neu und versuchen Sie es dann noch einmal.") statt der ratlosen Generalmeldung. Beide am 08.08.
gemeldeten sporadischen Fehler (Sensibel-Knopf reagierte nicht; „Das hat nicht geklappt" beim
Tierarzt-Kontakt) laufen auf dieselbe Wächterklasse zurück — derselbe Fehler, zwei Erscheinungsformen,
nicht zwei Bugs. Der Sensibel-Knopf-Klick war zuvor GAR NICHT abgesichert (kein Toast, keine Spur,
nur ein Konsolenfehler) — jetzt über denselben `fehlermeldungFuer`-Pfad sichtbar. Ebenso nachgezogen:
`listenEintragVerschieben()` (↑/↓-Knöpfe), dieselbe bis dahin ungemeldete Lücke.

**Zug 4 — Politik A kennt den Fehlschlag:** `_hintergrundWipeVielleicht()` prüfte bislang nur
`_ungespeicherteAenderungen > 0`. Ein Zähler von 0 heißt „keine offene Änderung", nicht „nichts
riskiert" — ein Mirror-Fehlschlag (z. B. beim Passwort-Wechsel, Stück 5) rührt den Zähler bewusst
nicht an. Ergänzt: `if (_letzterSpeicherFehlgeschlagen) return;` — dieselbe Bedingung wie
`schliessenWarnungNoetig()`, kein neuer Mechanismus. Tests: PS5-9/PS5-10.

**Vollerhebung der Verlustwege (Zug 4 des Auftrags, kein weiterer Bau nötig):** Reload,
Browser-Zurück-Taste und Tab-/Fenster-Schließen laufen bereits alle über denselben `beforeunload`-
Listener (`schliessenWarnungNoetig()`); der in-App-Logo-/Sidebar-Ausgang läuft über dieselbe Funktion
(`geheZuZuhause`/`flowAppSchliessen`). Der Wechsel Anlass-Auswahl ↔ Depot rührt `data` nachweislich
nicht an (gemessen im Diagnose-Auftrag vom selben Tag). Einzige gefundene, jetzt geschlossene Lücke:
Politik A oben. Bewusst außerhalb jeder Reparatur, weil technisch nicht erreichbar: OS-seitiges
Tab-Verwerfen unter Speicherdruck feuert kein JS-Ereignis, das die Anwendung abfangen könnte; auf
iOS bleibt `beforeunload` laut Stück 2 unzuverlässig — dort trägt weiterhin ausschließlich das
App-interne Schließen-Modal.

**Cross-Referenz:** U2-ADR-097 (Zusicherungsregister) — keine neue Zusicherung nötig, §13 deckt
diesen Zug bereits mit ab. Tests: `tests/persistenz-status.test.js` PS5-1/2/9/10/11,
`tests/e2e/10-speicher-fehlschlag-sichtbar.spec.js` (Fall A + Fall B).

## Stück 7 (Nachtrag 08.08.2026, nach `e81e306`) — der Wächter-Wortlaut empfahl den Verlustweg

Grundlage: eine Lesung des Stands `e81e306`.

**Der Fund:** `keinOffenesDepotFehler` (Stück 6) empfahl „Bitte laden Sie die Seite neu…" als
ersten und einzigen Handgriff, ohne die Sicherungsdatei zu nennen. Ein Reload ohne vorheriges
Sichern ist der im Zug-0-Nachtrag gemessene Totalverlust-Weg — der Wortlaut empfahl also selbst
genau das, was einen noch vorhandenen, ungesicherten Stand vernichtet.

**Gemessen, nicht angenommen:** die Datei-Empfehlung trifft NICHT an allen 26 Vorkommen der
Wächterklasse gleichermaßen zu. Eine reine Vorschau-Sitzung (kein Passwort gesetzt) hatte NIE
eine `.vivodepot`-Datei — „öffnen Sie Ihre Datei erneut" wäre dort eine falsche Hoffnung.

**Korrektur (PS6-Blindstelle-Auftrag 08.08.2026, nach erneuter Lesung):** hier stand, eine echte
Sitzung habe „immer eine Datei, auf die sich zurückgreifen lässt — ob per `depotAnlegen()` neu
angelegt oder per `depotLaden()` geöffnet". Das stimmt für `depotAnlegen()` NICHT: ein frisch
angelegtes Depot hat noch keine gesicherte Datei. Der Wortlaut selbst trug trotzdem, weil er
konditional formuliert ist („Falls Sie eine Sicherungsdatei haben") — korrigiert wird hier nur
die Begründung, nicht der bereits freigegebene Text.

**Das technische Problem dabei:** `imVorschau()` selbst taugt zur Unterscheidung NICHT — sie
liest `data._vorschau`, und im Fehlerfall ist `data` bereits null. Neu: `_hatteEchteSitzung`, ein
Flag, das `depotAnlegen()`/`depotLaden()` setzen und das `_depotSpeicherZuruecksetzen()` bewusst
NICHT löscht — es soll genau den Moment überleben, in dem `data` verschwindet, weil nur dann die
Unterscheidung noch gebraucht wird.

**Zwei Wortlaute (Produktentscheidung, 08.08.2026):**
- Mit echter Sitzung (`keinOffenesDepotFehlerMitDatei`): „Ihr Depot ist gerade nicht geöffnet.
  Falls Sie eine Sicherungsdatei haben, öffnen Sie diese erneut. Laden Sie die Seite nur neu, wenn
  Sie bereits gesichert haben — sonst gehen Eingaben verloren."
- Ohne echte Sitzung (`keinOffenesDepotFehlerVorschau`): „Ihr Depot ist gerade nicht geöffnet. Da
  Sie noch kein Passwort gesetzt hatten, waren Ihre Eingaben nur vorübergehend — bitte beginnen
  Sie neu und legen Sie diesmal ein Passwort fest."

**Benannter, nicht behobener Rest:** der Vertrauensperson-Eintritt (U2-ADR-062) läuft cache-only
über `angehoerigenEintritt()`, NICHT über `depotLaden()` — `_hatteEchteSitzung` bliebe dort `false`,
obwohl konzeptuell eine Datei existiert. Eingeschätzt als geringes Risiko: die Notfall-/Angehörigen-
Sicht ist reine Lese-Ansicht, keiner der 26 Schreibschutz-Wächter sollte von dort aus überhaupt
erreichbar sein. Nicht verifiziert (kein Bau in diesem Zug) — benannt, damit es nicht als
übersehen gilt.

**Zug 2 des Nachtrags — `aktionFehlgeschlagen` geprüft, nicht geändert:** der Schlüssel ist
weiterhin lebendig (Fallback-Zweig in `fehlermeldungFuer()` für jeden Fehler außerhalb der
„Kein offenes Depot."-Klasse). Anders als der Reload-Fund empfiehlt „Bitte versuchen Sie es noch
einmal" keine destruktive Handlung — bloßes Wiederholen derselben Aktion trägt kein Verlustrisiko
wie ein Seiten-Reload. Bleibt als ehrlicher letzter Auffangzweig für echte unklassifizierte Fehler,
kein weiterer Bau.

**Wächter:** `tests/persistenz-status.test.js` PS6-1..3 — scannt JEDEN STRINGS-Wert auf „neu" und
„laden" in beliebiger Reihenfolge (getrenntes Verb im Deutschen) ohne vorangehende Erwähnung von
„Datei"; Gate-Nachweis mit einer erfundenen Verstoß-Zeile (PS6-2), Positivkontrolle gegen die
beiden echten Wortlaute (PS6-3).

## Stück 8 (Nachtrag 08.08.2026) — Einstiegsmarken statt Rückfall: `_hatteEchteSitzung` entfällt

Grundlage: dieser Umbau ersetzt einen zuvor verworfenen früheren Auftrag — dessen Aufgabenstellung
selbst falsch war: „eine Meldung für einen unbekannten Zustand kann nur falsch sein, weil sie etwas
unterstellt, oder leer, weil sie nichts unterstellt." Richtig ist nicht eine dritte Fassung,
sondern der unbekannte Fall selbst muss verschwinden.

**Der benannte Rest aus Stück 7 bekommt jetzt eine eigene, korrekte Meldung** — der Vertrauens-
personen-Eintritt fällt nicht mehr in den falschen Vorschau-Fall. Die zweite Hälfte von Stück 7s
Einschätzung („die Notfall-/Angehörigen-Sicht ist reine Lese-Ansicht, keiner der 26 Schreibschutz-
Wächter sollte von dort aus erreichbar sein") stand dort ausdrücklich als „nicht verifiziert" —
nachträglich (Rückfrage nach dem ersten Bau dieses Stücks) geprüft, nicht nur übernommen:
`renderAngehoerigen()` (→ `renderAngehoerigenAuswahl()`/`renderAkutSituation()`) enthält keinen
`ui.modal(`-Aufruf und keines der beiden Knopf-mit-Fehlerpfad-Muster (`sensibelFeldUmschalten`,
`listenEintragVerschieben`) — dieselbe Route, über die alle vier `zeigeKernFehler()`-Aufrufstellen
laufen. `darfBearbeiten()` schließt den Modus zusätzlich explizit aus (`_aktiv !== 'angehoerigen'`).
Damit ist `keinOffenesDepotFehlerVertrauensperson` nach heutigem Stand der Oberfläche vermutlich
unerreichter Code — richtig als Absicherung, sollte die Angehörigen-Sicht künftig ein Bedienelement
bekommen, das einen der 26 Wächter erreicht, ohne dass das hier vorausgesetzt oder geprüft wäre.
Keine automatisierte Bindung an diese Struktur gebaut (kein Wächter, der eine künftige
Angehörigen-Schreibfunktion melden würde) — benannt, damit es nicht als abschließend geprüft gilt.

**Umbau:** `_hatteEchteSitzung`/`_hatteVorschauSitzung` (zwei Booleans, ein unbenannter Rest)
ersetzt durch EINE String-Marke `_einstiegsmarke`, gesetzt an jeder der fünf gemessenen Stellen,
an denen `data` einen echten Wert bekommt (Grep auf `data = `, keine Beispielliste übernommen):

| Marke | gesetzt in | Meldungs-Schlüssel |
|---|---|---|
| `anker-angelegt` | `depotAnlegen()` | `keinOffenesDepotFehlerMitDatei` |
| `anker-datei-geoeffnet` | `depotLaden()` über eine Datei (`cryptoOverlayOeffnen`, `konfliktWaehleDatei`) | `keinOffenesDepotFehlerMitDatei` |
| `interner-wiedereinstieg` | `depotAusIdbLaden()` (interner Stand, keine Datei) | `keinOffenesDepotFehlerInternerWiedereinstieg` |
| `vertrauensperson` | `angehoerigenAusUmschlag()` | `keinOffenesDepotFehlerVertrauensperson` |
| `vorschau` | `vorschauDepotErzeugen()` | `keinOffenesDepotFehlerVorschau` |
| `null` | nie explizit gesetzt | `keinOffenesDepotFehlerUnbekannt` (Zug 3, reine Absicherung) |

`depotLaden()` selbst setzt bewusst KEINE Marke — sie ist die GETEILTE Funktion hinter drei
verschiedenen Aufrufern, jeder trägt seine eigene. Sub-Depot-Eintritt (`subKontextBetreten`,
`data = sess.inhalt`) setzt ebenfalls keine eigene Marke: er läuft nur innerhalb einer bereits
laufenden Anker-Sitzung, deren Marke bleibt richtig. `_depotSpeicherZuruecksetzen()` löscht die
Marke NICHT — sie wird erst gebraucht, nachdem `data` schon weg ist.

**Zug 3, geprüft statt geschätzt:** Zug 1 deckt alle fünf Eintrittsstellen ab; die reine
Absicherung `keinOffenesDepotFehlerUnbekannt` sollte im Betrieb nie erscheinen. Nicht durch
Instrumentierung im Feld verifiziert (außerhalb des Bau-Rahmens), aber durch vollständige
Enumeration der Schreibstellen zu `data` begründet.

**Wortlaute, entschieden nach der internen Arbeitsregel zu Wortlauten vom 08.08.2026**
(löst „Wortlaut als Vorschlag zur Freigabe" ab — die Entscheidung erfolgt gegen feste Kriterien, siehe dort):
- `keinOffenesDepotFehlerInternerWiedereinstieg`: „Ihr Depot ist gerade nicht geöffnet. Bitte
  geben Sie Ihr Passwort erneut ein, um es zu öffnen." — begleitet von einem Toast-Knopf (s.
  unten), weil das Passwortfeld an der Fehlerstelle nicht sichtbar ist.
- `keinOffenesDepotFehlerVertrauensperson`: „Der Vertrauens-Zugang ist gerade nicht geöffnet.
  Öffnen Sie die Depot-Datei erneut und geben Sie das Vertrauens-Passwort ein, das die
  Eigentümerin für Sie hinterlegt hat." — nennt das Vertrauens-Passwort ausdrücklich als EIGENEN,
  von der Eigentümerin hinterlegten Wert, nicht als „das Passwort, das Ihnen jemand mitgeteilt
  hat" (verwischt sonst genau die Unterscheidung, für die der separate Vertrauens-Passwort-
  Mechanismus existiert). Geprüft: die QR-Leseansicht (`vivodepot-lesen.html`) ist ein komplett
  getrennter Mechanismus (eigene Datei, eigenes `data`, kein Passwort-Gate, kein
  `_einstiegsmarke`/`fehlermeldungFuer` überhaupt) — keine Kollision mit dieser Marke.
- `keinOffenesDepotFehlerUnbekannt` (Zug 3): „Das Depot ist gerade nicht geöffnet. Wenn es Ihr
  eigenes ist, öffnen Sie Ihre Sicherungsdatei und geben Sie Ihr Passwort ein. Wenn Sie einen
  Vertrauens-Zugang haben, öffnen Sie die Depot-Datei und geben Sie das Vertrauens-Passwort ein."
  Vorläufig: endgültig erst, wenn ein Rest ohne Marke tatsächlich gemeldet wird — bislang reine
  Absicherung.

**Erreichbarkeits-Lücke gefunden und geschlossen:** die Meldung feuert aus dem generischen
Modal-Sicherheitsnetz (`ui.modal()`s `m-ok`-Catch) oder aus einzelnen Knopf-Handlern
(`sensibelFeldUmschalten`, `listenEintragVerschieben`) — die Nutzerin steht dort in einem
beliebigen Content-Dialog, NICHT auf dem crypto-overlay. Ein Passwortfeld ist von dort nicht
sichtbar und `ui.toast()` konnte bislang nur Text (Arbeitsregel Wortlaute: „wer zum Passwort
auffordert, sorgt dafür, dass ein Passwortfeld sichtbar oder einen Klick entfernt ist — ist es das
nicht, wird der Weg gebaut, nicht der Text weichgespült"). `ui.toast(text, art, aktion)` additiv
um einen optionalen Knopf erweitert (wiederverwendet die vorhandenen `.toast-tipp`/
`.toast-tipp-btn`-Klassen, bislang nur vom Erst-Eintrag-Toast genutzt); neue Funktion
`zeigeInternenWiedereintritt()` zeigt das interne-Eintritt-Passwortfeld (`renderCryptoOverlay(null,
true)`), bewusst NICHT über `geheZuZuhause()` (das prüft auf eine noch laufende Sitzung, die es
hier per Definition nicht mehr gibt). Vier vormals gleichlautende
`ui.toast(fehlermeldungFuer(e), 'fehler')`-Aufrufe zu einer Stelle zusammengezogen
(`zeigeKernFehler()`), die den Knopf nur für `interner-wiedereinstieg` anhängt.

**Wächter:** `tests/persistenz-status.test.js` PS8-1..9 — je Marke eine Prüfung, welche Meldung
greift (PS8-1..7), der Toast-Knopf-Weg Ende-zu-Ende inklusive DOM-Zielprüfung (PS8-8), Gegenprobe
dass andere Marken keinen Knopf bekommen (PS8-9). PS5-8/8b/8c (Zwei-Flag-Fassung) entfernt —
Abdeckung jetzt in PS8. `tests/wiedereintritt-akteur.test.js` WA-10 auf die neue Aufrufkette
(`zeigeKernFehler`) umgestellt.

## Stück 9 (Nachtrag 08.08.2026, Zug 4 desselben Auftrags) — Wächter auf U2-ADR-097 §-Zusage

**Anlass:** der verworfene Vorgänger-Auftrag (s. Stück 8) hätte um ein Haar selbst „melden Sie
sich erneut an" in eine Meldung geschrieben — genau die Zusage aus U2-ADR-097 gebrochen, die
dieser Umbau gerade schützen soll. Abgefangen durch Messung, nicht durch einen Wächter.

**Gebaut:** `bietetAnmeldungAn(text)` scannt auf „anmelden"/„Anmeldung"/„Konto"/„Login", mit
Wortgrenzen-Vorsicht in zwei Richtungen — „Konto" strikt an Wortgrenze (`\bkonto\b`, kein
`\w*`), sonst Falsch-Treffer in Komposita wie „Kontoauszug"/„Kontostand"/„Kontovollmacht"; und
„anmelden" als trennbares Verb geprüft in BEIDEN Formen (zusammengesetzt „Anmeldung" UND getrennt
„melden Sie sich … an" — das gemessene Muster des verworfenen Vorschlags nutzte genau die
getrennte Form). Ausnahmeliste mit zwei begründeten, einzeln verifizierten Treffern
(`angOrtSichtbarkeit`, `nfbAngehoerigeText` — Letzterer eine explizite VERNEINUNG der Zusage
selbst).

**Wächter:** `tests/persistenz-status.test.js` PS9-1..4 — Haupttest gegen alle STRINGS-Werte
außerhalb der Ausnahmeliste, Ausnahmen-Lebendigkeits-Test (eine stumpf gewordene Ausnahme würde
einen echten Fund verdecken), Gate-Nachweis mit dem exakten abgelehnten Vorschlag, Positivkontrolle
gegen reine Bankbegriffe.

## Stück 10 (Nachtrag 08.08.2026, PS6-Blindstelle) — Kompositum rutschte durch die Reload-Probe

Grundlage: eine Gegenlesung von Stück 7/8 und der fünf Einstiegsmarken-Wortlaute.

**Der Fund:** `fussStaleCacheWarnung` empfahl „Ein Neuladen der Seite bringt Sie auf den
aktuellen Stand." — Reload ohne Datei-/Sicherungs-Hinweis, genau die Klasse, die Stück 7
eigentlich geschlossen hat. Die PS6-Probe (`reloadOhneDateiZuerst`) suchte „neu" und „laden" als
GETRENNTE Wörter — „Neuladen" ist ein Kompositum ohne Wortgrenze zwischen den Teilen und rutschte
durch. Der eigene Gate-Nachweis (PS6-2) prüfte ebenfalls nur mit getrennten Wörtern („Bitte laden
Sie die Seite neu.") — die Blindstelle war von Anfang an im Nachweis mit angelegt, nicht nur im
Muster.

**Geschlossen:** `reloadOhneDateiZuerst` erkennt jetzt zusätzlich `neuladen`/`neugeladen`
(Kompositum) und `Seitenneustart` (Kompositum) — bewusst NICHT bloßes `\bneustart\b`, das hätte
PS6-2s eigene Negativkontrolle („…Hinweis auf Neustart.") selbst zum Verstoß gemacht. `aktualisieren`
bewusst NICHT blank aufgenommen (sieben andere Bedeutungen in den echten STRINGS gemessen, s.
Testkommentar) — nur die riskante Form „Seite aktualisieren" zählt.

Die Sicherheits-Bedingung selbst verallgemeinert: „Datei" ODER „sicher(n/t)" vor der Reload-Stelle
akzeptiert (vorher nur „Datei") — `fussStaleCacheWarnung` hat keine Datei im Spiel, nur ein „erst
sichern".

**Neuer Wortlaut** (`fussStaleCacheWarnung`): „Bei der letzten Verbindung wurde eine neuere
Version gefunden. Sichern Sie zuerst Ihre Eingaben und laden Sie die Seite erst danach neu —
sonst gehen sie verloren." Dieselbe Reihenfolge wie `keinOffenesDepotFehlerMitDatei`: erst
sichern, dann laden. **Historischer Stand — mit U2-ADR-190 (01.09.2026) erneut geändert:** die
Reload-Aufforderung selbst ist entfallen (automatische, stille Aktivierung), der aktuelle
Wortlaut steht in `vivodepot.html`/`STRINGS.fussStaleCacheWarnung`, nicht hier.

**Zug 3 (Vollerhebung):** nach dem Schließen der Probe lief PS6-1 erneut gegen alle echten
STRINGS — kein weiterer Treffer außer dem bereits behandelten. Kein Folgeposten.

**Nebenbefund, in Stück 7 korrigiert:** die dortige Begründung, eine echte Sitzung habe „immer
eine Datei — ob per `depotAnlegen()` neu angelegt oder per `depotLaden()` geöffnet", stimmte für
`depotAnlegen()` nicht (frisch angelegtes Depot hat noch keine Datei). Der bereits freigegebene
Wortlaut selbst trug trotzdem (konditional formuliert) — nur die Begründung war zu korrigieren,
nicht der Text.

**Wächter:** `tests/persistenz-status.test.js` PS6-2 (Gate-Nachweis um vier Kompositum-Zeilen und
zwei Negativkontrollen erweitert), PS6-3b (Positivkontrolle neuer Wortlaut + Gegenprobe: der ALTE
Wortlaut schlägt unter der erweiterten Probe jetzt nachweislich an).

## Stück 11 (Auftrag „Erfolg ohne Wirkung", 08.08.2026) — drei Stellen, die Erfolg melden konnten, ohne dass etwas geschrieben wurde

Grundlage: ein eigener Abgleich, bei dem 18 von 80 geprüften Positionen der Prüfung nicht
standhielten — dieser Auftrag geht auf die ersten drei Zeilen jenes Abgleichs zurück. Anlass: am
08.08. ging nach zwei Stunden Eingabe und einem bestätigten „Sichern und schließen"
der gesamte Stand verloren.

**Zug 0 — die Tatsachenfrage, ohne Bau:** Chromium (dieses Repo, Electron-Testumgebung, empirisch
geprüft) hat FSA (`showSaveFilePicker`) sowohl auf `file://` als auch auf `https://`, weil `file:`
nach der Secure-Contexts-Spezifikation als „potentially trustworthy" gilt — `window.isSecureContext`
ist auf beiden Ursprüngen `true`. Safari implementiert die File System Access API bis heute gar
nicht (stabile, öffentlich dokumentierte Plattformtatsache, nicht gesondert gemessen). Vier-Zeilen-
Tabelle:

| Browser | Ursprung | Pfad | Datei auf der Platte? |
|---|---|---|---|
| Chrome/Chromium | `file://` | FSA (`createWritable`/`close()`) | Ja, bestätigt |
| Chrome/Chromium | `https://` | FSA (`createWritable`/`close()`) | Ja, bestätigt |
| Safari | `file://` | kein FSA → Anker-Download (`<a download>`) | Unbekannt — WebKits `download`-Verhalten auf `file://`-Ursprung ist nicht durch dieses Repo messbar (kein Safari-Automatisierungswerkzeug in dieser Umgebung) |
| Safari | `https://` | kein FSA → Anker-Download (Desktop) bzw. Web-Share (Touch/Standalone) | Unbekannt bei Anker; Web-Share löst nur bei echtem Erfolg auf, ist damit näher an einer Bestätigung |

Die unteren zwei Zeilen bleiben eine offene, echte Messfrage — mit der Ehrlichkeit dieses ADR:
diese Sitzung hatte kein Safari-Testgerät. Genau diese Unsicherheit ist der Grund, warum Zug 1 unten
die Unterscheidung baut, statt sie zu erraten.

**Zug 1 — `dateiAusgeben`/`depotHerunterladen`/`depotInDateiSichern`: Versuchsende ist kein
Schreibnachweis.** Ein per `<a download>` ausgelöster Download gibt dem Skript nie eine Rückmeldung,
ob die Datei wirklich ankam — es gibt keine Browser-API dafür. Vor diesem Zug behandelte
`depotHerunterladen()` jeden abgeschlossenen Versuch (`'datei'`, `'geteilt'`, `'download'`) gleich:
Zähler auf 0, Erfolgs-Signal gesetzt. Jetzt gilt nur `'datei'` (FSA `close()`, echte Bestätigung)
und `'geteilt'` (`navigator.share()` löst laut Spezifikation nur bei echtem Erfolg auf) als Erfolg.
`'download'` löst einen dritten, neuen Zustand aus (`markiereDateiSicherungUnbestaetigt()`,
Flag `_letzteDateiSicherungUnbestaetigt`): weder Erfolg noch Fehlschlag, der Zähler bleibt
unverändert stehen — die sicherste Annahme, kein automatisches „gespeichert".

**Der Fund, den erst der Browser-Rauchtest (Zug 5, s. u.) sichtbar machte:** die
`depotHerunterladen()`-Korrektur allein reichte nicht. `depotInDateiSichern()` — der Weg, den
„Sichern und schließen" und der Topbar-Knopf tatsächlich nehmen — rief direkt danach
unconditional `markiereGespeichert()`, unabhängig vom `weg`-Rückgabewert. Das deckte die gerade
gesetzte Unterscheidung sofort wieder zu: die App schloss trotz unbestätigtem Download. Erst mit
einer eigenen Weiche für `weg === 'download'` (kein `markiereGespeichert()`, kein Erfolgs-Toast,
Wiedereinstiegs-Marker zurückgerollt) hält die Unterscheidung bis zur Bürgerin durch.

**Bewusst nicht gebaut, offen zur Abnahme (Abnahme-Vorlage):** wie der dritte Zustand aufgelöst
wird — Rückfrage an die Nutzerin, Wiedereinlesen der Datei, oder der Zähler bleibt schlicht stehen
(heute gebaut: die dritte Option, ohne sichtbaren Wortlaut) — und der Wortlaut selbst, falls eine
sichtbare Meldung gewünscht ist. Der Wortlaut darf nicht mit dem Wort beginnen, das die Nutzerin
beruhigt.

**Zug 2 — `depotInIdbSichern`: der stille No-Op.** `if (imVorschau() || !sessionHkdfKey ||
!aktuelleDepotUUID) return null;` — kein Wurf, keine Meldung. `depotInternSichern()` wertete diesen
Rückgabewert vorher nicht aus und rief unconditional `markiereGespeichert()` + den Erfolgs-Toast.
Jetzt wird der Rückgabewert geprüft: `null` läuft auf denselben Fehlschlag-Weg wie eine Exception
(`markiereSpeichernFehlgeschlagen()`, Rückgabewert `'fehlgeschlagen'`), in beiden Zweigen (Anker
und Sub-Kontext).

**Ursachenfrage, gemessen statt angenommen:** unter welchen Umständen ist `aktuelleDepotUUID` leer,
während `sessionHkdfKey` gesetzt ist? Beide Zuweisungsstellen (`depotAnlegen()`, `depotLaden()`)
setzen `sessionHkdfKey` vor `aktuelleDepotUUID`, mit `await`-Lücken dazwischen (v. a. `depotLaden()`
wegen der absichtlich langsamen PBKDF2-Ableitung). Diese Lücke liegt vollständig VOR
`betreteApp()` — der Content-Host, an dem die Autosave-Listener (`blur`/`change`) hängen, existiert
vor `betreteApp()` noch nicht, und keiner der drei Aufrufer von `depotInternSichern()`
(Speichern-Knopf, „Sichern und schließen", Autosave) ist vor `betreteApp()` erreichbar. **Der
Zustand ist nach heutigem Code-Stand nicht über einen UI-Weg auslösbar** — eine defensive
Absicherung ohne aktiven Auslöser, kein gemessenes aktives Leck. Die Vorbedingung bleibt an ihrer
Stelle; die Korrektur ist trotzdem richtig, weil ein unausgewerteter `null`-Rückgabewert derselbe
Fehlerform ist, unabhängig davon, ob der heutige Aufrufer-Graph ihn erreicht.

**Zug 3 — der Knopf „Sichern und schließen": geprüft, nicht verändert.** `flowSchliessenWarnungEchteSitzung`
geht im Dirty-Fall über `depotPersistieren()` (mode-abhängig: `depotInternSichern()` im gehosteten
Modus). Das ist **gewollt**, keine Verwechslung — die eigene Historie dieses ADR trägt den Beleg:
Stück 2 oben beschreibt den Dirty-Fall ausdrücklich als „„Nicht gespeichert" + „Sichern und
schließen" (IDB)". Die Zwei-Ebenen-Persistenz (U2-ADR-015) ist eine bewusste Architektur, keine
Verwechslung zweier Wege. **Nicht gebaut, offen zur Freigabe:** der Knopfname selbst offenbart
nicht, welche Ebene ein „Sichern und schließen" im Dirty-Fall tatsächlich nutzt — das ist der
korrigierbare Rest, nicht der Code-Pfad.

**Zug 4a — Mappe: Byte-Obergrenze vor dem Ablegen.** `bildVerkleinern()` verkleinert nur Bilder;
PDFs gehen roh durch — der plausibelste Grund für S3 „Persistenz funktioniert nur gelegentlich"
(mehrere ungeschrumpfte PDFs treiben ein Depot in die IndexedDB-Quota). Neu: `MAPPE_MAX_BYTES`
(5 MB, **Vorschlag, nicht gemessene Grenze** — klassifiziert `eigene-setzung` in
`tools/wahrhaftigkeit-grundlinie.json`), geprüft VOR dem Ablegen in `mappeDateiAufnehmen()`
(wirft mit `.vdMappeZuGross`, eigene Meldung `STRINGS.mappeDateiZuGross`). Eigener Quota-Zweig in
`_idbIndexedDbBackend().setzen()`: ein `QuotaExceededError` trägt jetzt `.vdGrund = 'quota'`,
läuft über `markiereSpeichernFehlgeschlagen(fehler)` bis in `saveStatusModell()`/`renderSaveStatus()`
und zeigt `STRINGS.saveStatusQuotaFehlgeschlagen` statt der bisherigen generischen
Fehlschlags-Meldung.

**Zug 4b — Mappe: PDF-Vorschau + Herunterladen für jeden Eintrag.** `flowMappeVorschau()` rendert
PDFs jetzt über eine `blob:`-Objekt-URL (`dataUrlZuBlob()`, ohne `fetch()` — im eigenen Kern
verboten, U2-ADR-009/G11-Netzcode-Wächter) statt der von Chrome/Edge/Firefox im `<iframe>`
blockierten `data:`-URL. Der Herunterladen-Knopf (vorher nur für `autoritativ`-Einträge/FHIR-Importe
gebaut) erscheint jetzt für jeden Eintrag mit Inhalt; neue Funktion `flowMappeEigenesHerunterladen()`
für eigene Uploads, registriert im B16-113-Klartext-Register (`tests/b16-113-klartext-ausgabepfade.test.js`,
`ERLAUBTE_KLARTEXT_ANZAHL` 11→12 — dieselbe Klasse wie die bereits erlaubte
Mappe-Original-Durchreiche, kein Geheimnis, kein Schlüssel).

**Wächter:** `tests/fix-b7a-schliessen-warnung.test.js` (Probe 4 + 4b: unbestätigter Download hält
über `depotHerunterladen()` UND `depotInDateiSichern()`), `tests/zug2-idb-stiller-noop.test.js`
(vier Proben, Anker- und Sub-Zweig), `tests/zug4-mappe-dataurl-blob.test.js` (`dataUrlZuBlob()`
rein), `tests/e2e/zug4-mappe-groesse-vorschau.spec.js` (Größengrenze + Blob-Vorschau + Download,
echter Browser), `tests/e2e/zug5-persistenz-rauchtest.spec.js` (s. U2-ADR-125 — der End-zu-Ende-Beleg,
dass alle drei Züge zusammen den Weg tragen, den die Bürgerin geht).

**Regel 18 belegt:** der dritte Test in `zug5-persistenz-rauchtest.spec.js` („file:// OHNE FSA")
wurde gegen den Stand vor diesem Zug rot gesehen (App schloss trotz unbestätigtem Download,
Beleg: `#app`-Klasse leer statt `an`), dann grün nach dem vollständigen Zug-1-Fix (beide Hälften,
`depotHerunterladen()` UND `depotInDateiSichern()`).

## Stück 12 (Auftrag „Depot ist Datei", 08.08.2026) — die Datei steht am Anfang, nicht am Ende

Grundlage: eine eigene Beobachtung vom 08.08. Wörtliche Rückmeldung:
„Ich habe eigentlich gedacht, dass sie das sowieso tut, und habe mich immer gewundert, warum es
dazu einen zweiten Schritt geben muss. Das ist total widersinnig." Solange ein Depot ohne Datei
existieren kann, entscheidet der Browser über die Daten der Bürgerin — auf geteilter Domain in
Safari heißt das Räumung nach sieben Tagen ohne Interaktion. Am 08.08. hat genau das
zugeschlagen (derselbe Anlass wie Stück 11).

**Die Entscheidung selbst, ausdrücklich: Stück 4 (Zwei-Ebenen-Persistenz, D43, U2-ADR-015) bleibt
UNVERÄNDERT bestehen.** Der interne Speicher bleibt Arbeitspuffer zwischen zwei Dateiständen —
das ist keine Konkurrenz zur Datei, sondern ihr Komfort-Cache. Was sich ändert, ist allein die
REIHENFOLGE: die Datei steht jetzt am Anfang der Sitzung, nicht erst an ihrem Ende.

**Zug 0 — die Nutzergeste-Frage, gemessen statt geraten.** Der Picker (`showSaveFilePicker`)
verlangt eine unverbrauchte Nutzeraktivierung; läge die Schlüsselableitung (600k-PBKDF2) zwischen
Knopfdruck und Pickeraufruf, könnte die Aktivierung verfallen sein. Gemessen in dieser Umgebung
(Chromium): PBKDF2 ≈ 109,1 ms, die Aktivierung überlebt, der Picker öffnet real, kein
`SecurityError`. Reihenfolge im Anlegeweg bleibt darum unverändert — Picker VOR der Ableitung war
nicht nötig.

**Zug 1 — `_dateizielFuerAnlegenSichern()`: das Dateiziel wird VOR `depotAnlegen()` geholt.**
Chromium: `showSaveFilePicker` aus der echten Anlege-Geste, Handle für die Sitzung gemerkt, das
leere verschlüsselte Depot sofort hineingeschrieben — ab da überschreibt jeder weitere Save
dasselbe Handle (der bestehende Mechanismus, nur früher angestoßen). Nicht-FSA (Safari, Firefox,
iOS): derselbe `_dateiNameSicherstellen()`-Namensdialog wie beim laufenden Speichern, jetzt im
Anlegeweg statt später. **Abbruch ist Abbruch:** bricht die Nutzerin den Datei-Dialog ab, entsteht
KEIN Depot — kein halber Zustand, in dem Daten eingegeben werden könnten, die nirgends
hingehören (`_anlegenAbgebrochenFehler()`, eigener Wortlaut `anlegenAbgebrochenHinweis`, Vorlage
zur Freigabe, s. u.). `depotAnlegen()` selbst ruft weiterhin `dateiBindungZuruecksetzen()` — das
Ziel wird darum als Wert zurückgegeben und vom Aufrufer NACH `depotAnlegen()` erneut gesetzt, nie
verloren. Vorschau (`imVorschau()`) bleibt unberührt: wer nur umsieht, wird nicht nach einer
Datei gefragt.

**Zug 2 (Befund S10, neu, in diesem Auftrag benannt) — der Schließen-Dialog bot den robusten Weg
nicht an.** `flowSchliessenWarnungEchteSitzung` hatte im Dirty-Fall — dem gefährlichsten — nur
zwei Wege: „Sichern und schließen" (mode-abhängig, ging im gehosteten Modus über den internen
Speicher, NIE über eine Datei) und „Trotzdem schließen". Dazu die Sackgasse: schlug der interne
Save fehl, saß die Nutzerin fest — zurück in die App oder Verlust, kein dritter Weg. Der Bericht
vom 08.08.: „Ich konnte sie nur zwischendurch speichern, nicht als ich die App zugemacht
habe und die Warnung bekam." Jetzt drei bewusste Wege, in aufsteigender Empfehlung: **Trotzdem
schließen** (`drittAktion`, am weitesten von Primär, quittiert den Verlust) → **Nur auf diesem
Gerät merken** (`zweitAktion`, NUR im gehosteten Modus angeboten — unter `file://` ist IDB gar
nicht die Senke) → **Als Datei sichern und schließen** (Primär, IMMER verfügbar, der Verlass —
nach Zug 1 in der Regel ein Überschreiben ohne Rückfrage). Schlägt ein Weg fehl, bleibt der
Dialog nicht offen, aber die App auch nicht geschlossen — dieselbe schliessen()-zuerst-Regel wie
die anderen beiden Wege; die nächste Öffnung des Dialogs bietet wieder alle drei Wege (kein toter
Zustand, geprüft in `tests/zug2-schliessen-drei-wege.test.js`, eigene Probe „kein Sackgasse").
Der `drittAktion`-Slot ist NEU an `ui.modal` (vierter Button neben Primär/Zweit/Abbrechen) und
gilt unbedingt, in BEIDEN Zweigen des Dialogs — „Trotzdem schließen" lag vorher ausnahmslos im
`zweitAktion`-Slot (`#m-zweit`); mehrere ältere Browser-Proben, die diesen Griff blind mitnahmen
(`tests/rueckweg.test.js`, `tests/konformitaet/offline-garantie.mjs`, `tests/e2e/
10-speicher-fehlschlag-sichtbar.spec.js` Fall B), zeigten das erst beim vollen Suite-Lauf real rot
und wurden auf den neuen `#m-dritt`-Griff nachgezogen — kein Bug im neuen Weg, sondern die
erwartbare Folge einer verschobenen DOM-Zusage, genau die Klasse Fehler, die dieser Auftrag mit
Regel 18 fangen soll.

**Zug 3 (reine Erhebung, nicht gebaut) — welcher Wortlaut nach Zug 1 nicht mehr stimmt.**
`saveStatusGespeichert`/`gespeichert` sind tote Schlüssel (null Aufrufer im Produkt, geprüft wie
in Stück 11 Zug 0's „keine tote Naht"-Muster) — Vorschlag: entfernen. `pausenErlaubnis` verweist
generisch auf „den Speichern-Knopf", der reale Text ist „Jetzt als Datei sichern"
(`saveStatusJetztSichern`) — Namensabweichung, unabhängig von Zug 1 entstanden, jetzt sichtbarer.
`saveStatusInternToast` bleibt für den normalen Zwischen-Save korrekt, wirkt aber unpassend im
NEUEN Zug-2-Weg „Nur auf diesem Gerät merken" (die App schließt direkt danach — „gelegentlich als
Datei speichern" klingt nach einer späteren Gelegenheit, die es in diesem Moment nicht mehr
gibt). `d40KeineDateiText` bleibt sachlich korrekt, ihr „noch keine"-Rahmen suggeriert aber einen
Zwischenzustand, der nach Zug 1 kein Anfangszustand mehr ist, sondern eine bewusste Wahl (über
Zug 2). `wizPauseHinweis` behauptet unqualifiziert „bleibt gespeichert" — nach demselben ehrlichen
Maßstab wie `pausenErlaubnis` (RAM ≠ Datei, U2-ADR-011) zu stark, unabhängig von Zug 1 vorbestehend.
S1c (Knopfname „Sichern und schließen" hielt im Dirty-Fall nicht, was er versprach) gilt durch
Zug 2 als AUFGELÖST — der Knopf tut jetzt, was er sagt; offen bleibt nur der Name des neuen
Zug-2-Knopfs `d40NurGeraetMerken`. Alle Wortlaute als Vorlage im Abnahme-Bericht, nicht hier
entschieden.

**Zug 4 (Befund S5) — die Datei wird sichtbar.** Vorher wurden weder `_dateiName` noch
`_letzteSicherungskopieISO` irgendwo angezeigt; nach Zug 1 hat jede Sitzung eine Datei, die
Nutzerin muss wissen, welche. Bleibende Anzeige (kein Toast) in der ohnehin vorhandenen
Depot-Liste (Pillen-Klick, `flowDepotListe`, immer erreichbar — kein neues Element im engen
Topbar-Raum): Dateiname + Zeitpunkt des letzten Schreibens, lesbar formatiert über die
bestehende `_konfliktZeitLesbar()`. Ort wird NICHT behauptet — FSA-Handles tragen keinen Pfad
(Sicherheitsmodell der API), nur den Namen. Ohne bekannten Dateinamen erscheint die Zeile
schlicht nicht — nichts Erfundenes. Für Nicht-FSA-Browser (Safari, Firefox: können eine
bestehende Datei nicht überschreiben, jedes erneute Sichern legt einen weiteren Download an, die
vorige bleibt bestehen) ein zusätzlicher, ehrlicher Hinweis — Wortlaut Vorlage
(`depotListeNichtUeberschreibenHinweis`).

**Die Grenze, die vor dem Bau geprüft wurde:** nur Chromium kann eine bestehende Datei
überschreiben (FSA `createWritable`). Safari und Firefox können das nicht — dort erzeugt jedes
Sichern über den Anker-Download-Fallback eine NEUE Datei, der Browser hängt beim zweiten Mal eine
Ziffer an. **Gewählter Umgang:** kein Versuch, das technisch zu verhindern (die Plattform bietet
keinen Weg dazu) — stattdessen der ehrliche Zusatz-Hinweis aus Zug 4, damit die Nutzerin die
Konsequenz kennt, statt sie beim Aufräumen ihres Downloads-Ordners zu entdecken.

**Wächter:** `tests/zug2-schliessen-drei-wege.test.js` (acht Proben: drei/zwei Wege je Modus,
Primär immer Datei, „Nur merken" IDB-only, kein-Sackgasse bei Fehlschlag, zwei
Rotmachbarkeits-Proben über einen eigenen Kindprozess-Mutanten, `tools/_zug2-mutant-probe.js`),
`tests/zug4-datei-sichtbar.test.js` (fünf Proben, dieselbe Mutant-Kindprozess-Bauart über
`tools/_zug4-mutant-probe.js`), `tests/e2e/zug5-persistenz-rauchtest.spec.js` (um vier Browser-Fälle
erweitert: Datei existiert vor jedem Feld, Abbruch erzeugt kein Depot, Schließen-Dialog unter
`file://` UND `http://` mit echtem Datei-Schreiben).

**Regel 18 belegt:** `tests/zug2-schliessen-drei-wege.test.js`s Rotmachbarkeits-Probe lief gegen
einen im Kindprozess geladenen Mutanten (alter Zwei-Wege-Zustand, kein `drittAktion`-Slot) real
mit Exit-Code 1 (rot) und gegen den echten Kern mit Exit-Code 0 (grün), ebenso
`tests/zug4-datei-sichtbar.test.js`. Zusätzlicher, ungeplanter Beleg: der volle Suite-Lauf nach
Zug 2 fand real drei Browser-Proben rot (`rueckweg.test.js`, `offline-garantie.mjs`,
`10-speicher-fehlschlag-sichtbar.spec.js` Fall B, dazu zwei bislang FSA-lose `e2e-cross`-Specs,
die am neuen Datei-Ziel-Dialog hingen) — genau die Klasse Fehler, die eine Browser-Abnahme fangen
soll und die eine Node-only-Suite (Event-Blindzone, U2-ADR-091 §6) nicht gesehen hätte.

Volle Suite nach diesem Zug: Node 2862/0 (2 erwartete Lockstep-Wächter vor dem Bump dieses
Commits nicht mitgezählt), E2E 65/65, E2E-Cross 16/16 (4 unverändert übersprungen), Cross-Gates
8/8, Konformität 46/46.

## Cross-Referenz
U2-ADR-015 (D43 Zwei-Ebenen-Persistenz: IDB-Cache ↔ `.vivodepot`-Datei, durch Stück 12 UNVERÄNDERT
bestätigt), U2-ADR-011 (Auto-Save / Speicher-Status), U2-ADR-097 (produkttragende Zusicherungen,
§-Zusage „kein Konto, keine Anmeldung", Stück 9), U2-ADR-125 (Browser-Testfähigkeit als
Voraussetzung für Änderungen am Speicher-/Statusweg — Stück 12 ist ihr erster Nachweisfall nach
Stück 11). Befund: `befund-generationen-persistenz-2026-06-21.md` (intern).
