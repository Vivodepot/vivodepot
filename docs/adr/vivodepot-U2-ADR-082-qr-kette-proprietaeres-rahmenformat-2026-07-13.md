# U2-ADR-082 · Die QR-Kette — proprietäres Rahmenformat, Kamera-Bau (revidiert)

**Status:** Akzeptiert · 13.07.2026, **Entscheidung 3 revidiert per Nachtrag 13.07.2026**
**Status heute:** gilt teilweise — laut U2-ADR-085 §5 sind Entscheidung 2 (Nutzlastformen PDF-Selbstverifikation/
Bereich-Export) und Entscheidung 3 (Kamera-Erfassung) vollständig abgelöst; beide Erzeuger
(`zeichnePdfSelbstverifQr`/`flowBereichQr`) sind aus `vivodepot.html` entfernt, per Code-Prüfung bestätigt.
Entscheidung 1 (proprietärer Rahmen `VDQR|gid|i/n|nutzlast`) bleibt in Kraft, aber ihr einziger aktiver
Erzeuger ist der ausgeblendete EUDIW-Pfad (`qrTeilePacken`, hinter `EUDIW_SICHTBAR = false`). Die Lese-App-
Seite (`_qrRahmenParsen`/`qrTeilAufnehmen` in `vivodepot-lesen.html`) läuft weiter über den Text-Einfüge-Weg
(nicht Kamera, die ist entfernt), hat aber ohne EUDIW-Reaktivierung keine reale Nutzlast mehr, die sie
einlöst.
**Nummer:** U2-ADR-082 (bestätigt gegen `docs/adr/` — höchste belegte war U2-ADR-081).
**Typ:** Formatentscheidung + Bugfix (Bruch zwischen zwei für sich fertig gebauten, für sich grünen Hälften). Nachtrag: Bau-Revision nach Geräte-/Browser-Befund.
**Auslöser:** ADR-Abgleich 13.07. fand ADR-015 (interne Reihe) unbeantwortet — der ausgelieferte Rahmen `VDQR|gid|i/n|nutzlast` steht in keiner ADR. Vier-Brüche-Befund (read-only) zeigte: die Lese-App kann den Rahmen, den jedes generierte PDF verspricht, heute nicht einlösen.
**Verwandt:** U2-ADR-078 (Notfall-QR-Format-Entscheidung, dieselbe Klasse Problem — ein unentschiedener Default in einem Payload, den eine andere Anwendung liest).
**Nachtrag 04.08.2026:** Entscheidung 3 (Kamera-Erfassung in der Lese-App) wurde am 14.07.2026 durch U2-ADR-085 §5 gegenstandslos — beide QR-Erzeuger (PDF-Selbstverifikation, Bereichs-QR) sind gestrichen, der Bau wurde in `f4dd9bc` zurückgenommen. Entscheidung 1 (Rahmenformat) und Entscheidung 2 (Nutzlastformen) bleiben, soweit der ausgeblendete EUDIW-Pfad sie noch trägt.

---

## Kontext

Drei Erzeuger in `vivodepot.html` (`zeichnePdfSelbstverifQr`, `flowBereichQr`, `_eudiwAusgeben`) bauen mehrteilige QR-Codes über `qrTeilePacken()` — Rahmen `VDQR|gid|i/n|nutzlast`. Der Text neben jedem generierten PDF verspricht wörtlich: „Bei mehreren Teilen alle der Reihe nach scannen — die Lese-App setzt sie zusammen." Das ist keine beiläufige Formulierung — sie steht auf **jeder** generierten Vorsorgevollmacht, jeder Patientenverfügung, jedem Dokument aus `zeichnePdfSelbstverifQr`.

Die Lese-App (`vivodepot-lesen.html`) hatte einen eigenen, nie mit der Schreib-Seite abgeglichenen Parser: `qrTeilAufnehmen` erwartete den Trenner **Doppelpunkt** (`VDQR:id:i/n:payload`), nicht Pipe. Das Match schlug immer fehl. Vier gestapelte Brüche wurden im read-only-Befund vom 13.07. festgestellt:

1. **Kamera-Erfassung** — `jsQR` liegt inline im Dokument, aber kein `getUserMedia`-Erfassungsloop existiert; der Code zeigt unbedingt „steht noch nicht bereit", auch wenn die Bibliothek längst da ist.
2. **Trenner** — Pipe geschrieben, Doppelpunkt erwartet. Matcht nie, auch bei einteiligen Codes nicht (der rohe Rahmen-String landet unverarbeitet in `JSON.parse`).
3. **Zusammensetzer ohne Aufrufer** — `qrTeileZusammensetzen` passt zum Pipe-Format, hat aber in keiner der beiden Dateien einen Aufrufer.
4. **Keine Render-Pfade** — `erkenneFormat` in der Lese-App kennt vier Depot-Datei-Formen (voll/blackbox/klartext/klartext-roh). Keine der drei QR-Nutzlasten gehört dazu.

Beide Hälften waren für sich gebaut, für sich getestet, für sich grün. Niemand hatte die Kette einmal ganz durchlaufen lassen.

---

## Entscheidung 1 — Der Rahmen ist bewusst proprietär

**`VDQR|gid|i/n|nutzlast` (Pipe-Trenner) wird jetzt als Format fixiert — nicht geerbt, sondern getroffen.**

Das ist kein Notbehelf und kein vorläufiger Default. Es ist die richtige Wahl, aus einem klaren Grund: **Es gibt keinen offenen Standard, der ein mehrteiliges Depot-Fragment ohne Server transportiert.** SMART Health Links setzen einen erreichbaren HTTPS-Host voraus (den Vivodepot bewusst nicht betreibt — `connect-src 'none'`, keine Cloud). Eine URL mit Hash-Fragment (der ursprüngliche ADR-015-Gedanke) setzt ebenso einen Web-Kontext voraus, den es hier nicht gibt — Vivodepot ist offline, Punkt zu Punkt, PDF zu Auge zu Kamera zu Textfeld.

**Der entscheidende Punkt: der Empfänger ist in diesem Fall immer die Lese-App.** Es gibt keinen dritten Akteur, der den Rahmen verstehen müsste — keine fremde Praxis-Software, kein Fremd-Wallet, kein Interop-Partner. Eine Vivodepot-zu-Vivodepot-Verbindung darf ihr eigenes Format haben, weil beide Enden derselben Anwendung gehören. Das unterscheidet diesen Fall von U2-ADR-078 (Notfall-QR): dort las eine **fremde** Kamera (iOS-Systemkamera) mit und brauchte ein für sie verständliches Format (vCard). Hier ist der einzige vorgesehene Leser die eigene Lese-App — ein Standard, der Interoperabilität mit Dritten verspricht, würde ein Problem lösen, das nicht existiert.

**ADR-015 (URL + Hash-Fragment) fällt aus dem Grund durch, den der Befund selbst nennt:** der Weg setzt einen Server voraus, den es nicht gibt. Er wird hiermit nicht übernommen — der proprietäre Pipe-Rahmen tritt an seine Stelle.

### Die eigentliche Erweiterungsstelle: der `typ`-Diskriminator

Jede Nutzlast trägt bereits `typ:'vivodepot-pdf'` bzw. `typ:'vivodepot-bereich'` — dieselbe Namensfamilie wie die vier der Lese-App bekannten Depot-Formen (`_typ:'vivodepot-klartext-export'`, `dateiTyp:'vivodepot-blackbox-export'`). Das ist der Teil, der langfristig trägt: **eine künftige vierte, fünfte QR-Nutzlastform braucht nur einen neuen `typ`-Wert und einen neuen `erkenneFormat`-Zweig — der Rahmen selbst wird nie wieder angefasst.** Der Rahmen transportiert, der Diskriminator unterscheidet.

---

## Entscheidung 2 — Welche Nutzlastformen die Lese-App kennen muss

**PDF-Selbstverifikation** (`typ:'vivodepot-pdf'`) und **Bereich-Export** (`typ:'vivodepot-bereich'`) werden erkannt und angezeigt.

**Der EUDIW-QR bleibt außen vor.** Sein eigener Wortlaut verspricht keinen Einlöseweg in die Lese-App — „Vorläufig und experimentell … Ob eine bestimmte Wallet sie tatsächlich annimmt, ist noch nicht gesichert … Kein Versprechen garantierter Kompatibilität." Anders als beim PDF- und Bereich-Text steht hier keine gebrochene Zusage im Raum; SD-JWT-VC-Serialisierung ist ohnehin kein JSON und passt nicht in dasselbe Anzeige-Schema. Eigener Fall, keine Handlung hier.

---

## Entscheidung 3 — Kamera-Erfassung in der Lese-App (ursprünglich: nein — REVIDIERT)

**Ursprüngliche Entscheidung (13.07., vormittags):** kein `getUserMedia`-Bau; der Weg bleibt native Kamera-App des Telefons + Einfügefeld. Begründung damals: der native Weg existiert bereits, ein eigener Erfassungsloop sei Mehraufwand ohne belegten Zugewinn.

**Diese Entscheidung ist überholt — durch zwei Gerätebefunde am selben Tag, in dieser Reihenfolge:**

### Befund 1 — der native Weg ist tot

Getestet: ein QR-Code mit dem Rahmen `VDQR|test|1/1|{"typ":"vivodepot-pdf"}` (offline erzeugt, kein Depot-Inhalt) mit der **nativen iOS-Kamera-App** gescannt. Ergebnis: iOS reicht den erkannten Klartext ohne Rückfrage an eine **Google-Websuche** weiter — kein Kopieren-Angebot, keine Handler-Auswahl. Dasselbe Muster wie beim alten Notfall-QR (U2-ADR-077/078): ein Rahmen ohne registriertes URI-Schema, ohne vCard-/WLAN-/Kalender-Struktur, wird von iOS als Freitext-Suchanfrage behandelt. Kein Datenleck hier (die Nutzlast ist ohnehin, was die Bürgerin bewusst freigegeben hat), aber eine **tote Funktion**: die Bürgerin scannt in der Praxis und landet bei Google, nicht in der Lese-App.

**Damit trägt der native Weg nicht.** Die in der ursprünglichen Entscheidung 3 unterstellte Prämisse — „der native Weg existiert bereits und funktioniert" — war falsch. Er existiert, funktioniert aber nicht für dieses Rahmenformat.

### Befund 2 — wo die Kamera tatsächlich gebraucht wird, trägt `getUserMedia`

Der QR-Transportweg ist kein Umweg, sondern der einzige, der ohne Netz und ohne Datenträgerannahme funktioniert. Der Ort, an dem der QR **aufgelöst** werden muss, ist nicht das Telefon der Bürgerin — es ist der **Rechner der Institution** (Arztpraxis, Behörde), auf dem die Lese-App als lokale Datei geöffnet wird. Dort ist die Frage nicht „was macht die iOS-System-Kamera-App", sondern „kann die Lese-App selbst, per `getUserMedia`, eine Kamera ansprechen, wenn sie als `file://` geöffnet ist".

Empirisch geprüft, mit einer eigens gebauten Testseite (`getUserMedia unter file://` — Origin, Secure-Context-Status und rohes Fehler-/Erfolgsergebnis als Text, kein Rätselraten):

- **Firefox, `file://`:** echter Berechtigungsdialog mit Live-Kamera-Vorschau, „Blockieren"/„Erlauben", Checkbox „Für alle Kameras merken" (Merken ist Opt-in, keine Zwangs-Neuabfrage). Nach Erlauben: **„ERGEBNIS: ERFOLG — Kamera-Stream erhalten (1 Video-Track/s)"**, `window.isSecureContext === true`.
- **Chrome, `file://`:** ebenfalls Berechtigungsdialog, mit drei Optionen (dauerhaft erlauben / einmalig / nie), Kamera-Stream erhalten, Secure Context `true`.

Zwei von drei relevanten Desktop-Browsern bestätigt (Edge teilt Chromes Engine, [Wahrscheinlich] identisches Verhalten — ungeprüft, kein Blocker). `file://` ist damit nicht nur formal ein „potentially trustworthy origin" (W3C Secure-Contexts-Spezifikation), sondern **praktisch nutzbar** — beide Browser bieten eine granulare, nutzerseitig steuerbare Merken-Option, keine Zwangs-Wiederholung, kein Totalausfall.

### Revidierte Entscheidung

**`getUserMedia`-Kamera-Erfassung wird in die Lese-App gebaut.** Sie ist unabhängig vom nativen iOS-Weg (der tot bleibt) und löst das eigentliche Problem: die Institution muss den QR auflösen können, auf ihrem eigenen Rechner, ohne Netz, mit der Lese-App als lokale Datei. Genau dort ist die Kamera nachweislich erreichbar.

**Scope-Klarstellung:** Dieser Bau ersetzt nicht den nativen iOS-Weg (der bleibt tot und ungelöst — eigener, hier nicht adressierter Fall, sollte eine Bürgerin selbst am Telefon lesen wollen). Er baut die Kamera **in die Lese-App selbst**, die auf jedem WebView/Browser mit `getUserMedia`-Unterstützung läuft (Desktop bestätigt; mobile Browser — nicht die native System-Kamera-App — bewusst ungeprüft, weil der institutionelle Rechner der Zielort ist).

---

## Der Fix im Einzelnen

- **Trenner:** `_qrRahmenParsen` (Pipe-kompatibel, identisch zur Schreib-Seiten-Logik) wird in `vivodepot-lesen.html` nachgebaut. `qrTeilAufnehmen` nutzt ihn statt der Doppelpunkt-Regex.
- **Reihenfolge:** Teile werden index-verschlüsselt gesammelt (`Map<index, nutzlast>`) — beliebige Scan-Reihenfolge, wie gefordert.
- **Fehlende Teile:** die Rückgabe trägt jetzt `fehlend` (Array der noch fehlenden Indizes) und `empfangen` (Anzahl bisher da) — die Anzeige sagt explizit, wie viele und welche Teile noch fehlen, nicht nur „Teil i von n".
- **Render-Pfade:** `erkenneFormat` erkennt `vivodepot-pdf` → `'qr-pdf'` und `vivodepot-bereich` → `'qr-bereich'`; `verarbeiteDatei` routet auf zwei neue, schlichte Read-only-Sichten (`renderQrPdf`, `renderQrBereich`) im Stil der bestehenden Notfall-Sicht — kein Passwort-Gate, da beide Nutzlasten bereits unverschlüsselte, von der Bürgerin bewusst freigegebene Selbstauskunft sind (kein Depot-Umschlag).
- **PDF-Text:** bleibt unverändert — er stimmt jetzt wieder. Keine Fixture-Änderung an der PV-Golden-Byte-Identität nötig, weil der Wortlaut nicht angefasst wird.
- **Kamera (Nachtrag):** `onQrScan()` baut jetzt einen echten Erfassungsbildschirm — `<video>` + verdecktes `<canvas>`, `requestAnimationFrame`-Schleife zieht Frames, `jsQR` dekodiert. Ein erkannter Rahmen läuft durch **dieselbe** `verarbeiteQrText`-Pipeline wie der Einfügeweg (kein Zweitpfad, keine Logik-Verdopplung); dafür trägt `verarbeiteQrText` jetzt einen optionalen vierten Parameter `onFund` — feuert genau dann, wenn die Sicht gleich wechselt (Notfall-Klartext erkannt oder JSON erfolgreich geparst), **bevor** der Render-Aufruf läuft. Die Kamera nutzt dieses explizite Signal, um den Stream zu stoppen — bewusst **kein** Rückschluss aus DOM-Abwesenheit („ist `#qr-video` noch da?"), das wäre indirekt und in einem headless-Testkontext ohne echten Live-DOM nicht verlässlich nachstellbar (im Zuge des Baus real als Hänger aufgefallen, s. Verifikation unten — genau der Fall, den Papier-/Browser-Verifikation vor node-grün stellt). Mehrteilige Codes: die Schleife läuft weiter, bis `qrTeilAufnehmen` `fertig` meldet; Fortschritt (inkl. fehlender Teile) wird währenddessen angezeigt. Stream wird bei Fund, Abbruch oder Verlassen des Bildschirms sauber gestoppt (`track.stop()`). Fehlerfälle (`NotAllowedError`, `NotFoundError`, kein `mediaDevices`) zeigen eine ehrliche, unterscheidbare Meldung mit Rückweg zum Einfügefeld — kein stiller Absturz.

---

## Verworfene Alternativen

**URL + Hash-Fragment (ADR-015-Weg).** Verworfen: setzt einen Server voraus, den es nicht gibt; höherer Aufwand ohne Interop-Gewinn, weil der einzige Leser die eigene Lese-App ist.

**Kamera-Erfassung jetzt mitbauen (Stand vormittags).** Ursprünglich verworfen, dann durch die beiden Gerätebefunde (s. Entscheidung 3) widerlegt — der native Weg ist tot, `getUserMedia` unter `file://` trägt nachweislich. Siehe Nachtrag.

**Auf einen dritten Standard warten (z. B. SMART Health Links).** Verworfen: löst ein Interop-Problem, das hier nicht besteht — beide Enden gehören derselben Anwendung.

**Nativen iOS-Weg reparieren (z. B. URL-Schema erzwingen, damit iOS eine App-Aktion statt Websuche anbietet).** Nicht verfolgt: würde einen registrierten Custom-URL-Handler oder eine installierte App voraussetzen — Vivodepot hat keine native App, nur die Web-Lese-App. Außerhalb des Scopes dieses ADRs.

---

## Konsequenzen

**Positiv.** Der Weg, den der PDF-Text seit jeher verspricht, hält jetzt: Bürgerin druckt, nimmt es mit, die Institution liest mit der Lese-App und deren eigener Kamera ein. Der `typ`-Diskriminator macht die Lese-App erweiterbar, ohne den Rahmen je wieder anzufassen. Die Kamera-Erfassung ist an den Ort gebaut, an dem sie nachweislich funktioniert (institutioneller Rechner, `file://`, Desktop-Browser), nicht an den Ort, an dem sie widerlegt ist (iOS-Systemkamera).

**Begrenzt.** Der native iOS-Weg (Bürgerin scannt selbst mit der System-Kamera-App) bleibt tot — nicht Teil dieses Baus, kein Ersatz dafür gebaut. Mobile-Browser-`getUserMedia` (nicht die System-Kamera-App, sondern `getUserMedia` innerhalb eines mobilen Browsers) ist ungeprüft; Edge auf Desktop ist ungeprüft, aber [Wahrscheinlich] wie Chrome (gleiche Engine). Der Rahmen ist und bleibt ein Vivodepot-internes Format, kein externer Standard; das ist ausdrücklich gewollt, nicht Verlegenheit.

**Lehre (allgemein, über diesen Fall hinaus):** Eine Funktion, die aus der App herausgeht und wieder hineinkommt, ist nicht fertig gebaut, bevor sie einmal ganz herum gelaufen ist. Und: eine Architekturentscheidung, die auf einer Annahme beruht („der native Weg funktioniert bereits"), muss revidiert werden, sobald die Annahme widerlegt ist — auch am selben Tag, auch nach dem ersten Commit.

---

## Verifikation

- **Node-Suite:** Tests für `qrTeilAufnehmen` (Pipe-Format, beliebige Reihenfolge, fehlende Teile explizit, unbekannter Rahmen weiterhin `null`), `erkenneFormat` (`qr-pdf`/`qr-bereich`), Render-Pfade, Kamera-Bildschirm-Wiring (DOM-Struktur, Fehlerpfade, Wiederverwendung von `verarbeiteQrText` — echte Kamera-Pixel sind headless nicht simulierbar, daher wird die Dekodier-Ausgabe direkt in die geteilte Pipeline eingespeist getestet). `tests/qr-kamera.test.js`, 8 Fälle.
- **Bauzeit-Fund (Selbstkorrektur):** die erste Fassung von `_qrKameraVerarbeiten` erkannte „Sicht gewechselt, Stream stoppen" über DOM-Abfrage (`!el('qr-video')`). Im echten Browser korrekt, aber der schlanke Test-DOM-Stub (`load-lesen.js`) cached Elemente pro id dauerhaft, unabhängig vom aktuellen `innerHTML` — die Abfrage lieferte im Test immer „noch da", der Stream stoppte nie, die `requestAnimationFrame`-Schleife lief in eine echte Endlosschleife (messbarer CPU-Verbrauch, Prozess ließ sich nicht beenden). Behoben durch ein **explizites** Signal: `verarbeiteQrText` bekam einen optionalen `onFund`-Callback, der genau beim Sichtwechsel feuert — robuster als DOM-Archäologie, unabhängig vom Testkontext korrekt.
- **Ende-zu-Ende (node, Kern→Lese):** Schreibseite (`qrTeilePacken`) → Lese-Seite (`qrTeilAufnehmen`/`erkenneFormat`/Render) in einem Testlauf, nicht nur je Seite isoliert.
- **Browser-Beweis (13.07.):** `getUserMedia` unter `file://` in Firefox UND Chrome — beide mit Berechtigungsdialog, beide mit Merken-Option, beide „ERFOLG — Kamera-Stream erhalten". Nativer iOS-Weg widerlegt (Google-Websuche statt Kopieren).
- **Gates:** Suite, Block-Pin, PV-Golden, OSV, SW-Bump, `SCHALEN_STAND`-Lockstep mit `sw.js`.
- **Papier-grün / Geräte-grün, ausstehend (Geräte-Strecke, die sich nicht automatisiert nachbilden lässt):** die neue Kamera-Erfassung am institutionellen Rechner mit einem echten gedruckten QR durchspielen (Einzel- und Mehrteil-Fall), inkl. Berechtigungsdialog-Umgang in der echten Lese-App-UI (nicht nur der isolierten Testseite).
