# U2-ADR-095 · Passwort-Lebenszyklus — Wechsel-Flow und Notfall-Blatt

**Datum:** 21.07.2026
**Status:** Angenommen · Umsetzung im v1.0-Scope · gebaut 21.07.2026 (Suite grün, Block-Hash unverändert)
**Bezug:** Krypto-Architektur v0.4 (Abschnitte 2/3/8/14) · U2-ADR-062 (Angehörigen-Cache) ·
U2-ADR-068 v2 / U2-ADR-002 (Depot-Schlüsselableitung) · U2-ADR-078 (Klartext-Geschwister entfernt) ·
die PDF-QR- und Bereich-QR-Sofortmaßnahmen (keine app-erzeugten Klartext-Artefakte) · U2-ADR-090 (Präfix- und Benennungsregel) ·
Stufe-1-Nachprüfung vom 21.07.2026 (1.1–1.4) · Verbatim-Block-Pin `8d31c678…`
**Status heute:** gilt — Beleg `tests/passwort-wechsel.test.js`.

Beide Beschlüsse dieser Linie sind angenommen: **A** (Passwort-Wechsel-Flow) und **B** (Notfall-Blatt).
Sie bleiben in einem ADR, weil sie zusammengehören — ein handschriftlich notiertes Passwort ohne
Wechsel-Möglichkeit wäre ein Einbahn-Risiko, ein Wechsel-Flow ohne Backup-Angebot verschärft das
Verlust-Risiko. Der Wechsel wird im **Einstellungen-Dialog** platziert. Formulierungen für
Stick-Hinweis und Blatt-Texte werden nach Beschluss entworfen und von der Geschäftsführung
abgenommen.

---

## 1 · Kontext

Die Stufe-1-Nachprüfung vom 21.07.2026 hat gezeigt: Es existierte **kein Passwort-Wechsel-Pfad**.
`flowPasswortSetzen` ist ausschließlich die Erst-Vergabe (zwei Felder `autocomplete="new-password"`,
kein Feld für das aktuelle Passwort); die drei `current-password`-Felder im Code sind sämtlich
Entsperr-Dialoge; der Einstellungen-Dialog enthielt keine Passwort-Aktion.

Das Bedrohungsmodell (Krypto-Architektur v0.4, Abschnitt 8) benennt die familien-interne Angreiferin
als statistisch relevantesten Fall. Für das Szenario „Passwort bekannt" (Ex-Partner, Vertrauensbruch)
ist der Passwort-Wechsel die *einzige* technische Gegenmaßnahme — in der Schutz-Spalte stand bis
dahin ehrlich: keine.

Zugleich ist Passwort-*Verlust* für die Zielgruppe (ältere Menschen, pflegende Angehörige) das
wahrscheinlichste Ausfallszenario überhaupt, und Vivodepot hat konstruktionsbedingt keinen
Recovery-Mechanismus: verlorenes Passwort = unwiderruflicher Datenverlust. Ein physisches
Backup-Angebot im Erstellungs-Flow adressiert das — muss aber die Leck-Klasse vermeiden, die mit
der PDF-QR- und der Bereich-QR-Sofortmaßnahme geschlossen wurde: app-generierte Klartext-Artefakte.

## 2 · Beschluss A — Passwort-Wechsel-Flow

### A.1 Ablauf

1. **Verifikation des aktuellen Passworts** durch vollständigen Entschlüsselungs-Roundtrip des
   geladenen Depots — kein Hash-Vergleich, keine Abkürzung. Bei Fehlschlag: Abbruch, keine Änderung.
2. **Neues Passwort** zweifach eingeben (`autocomplete="new-password"`), Mindestlänge 8 (bestehende
   Regel), NFC-Normalisierung wie bei der Erst-Vergabe.
3. **Re-Encryption:** neuer 16-Byte-PBKDF2-Salt *und* neuer 32-Byte-`depotSalt` werden erzeugt;
   daraus neuer depot-spezifischer AES-Schlüssel; sämtliche Inhalte werden neu verschlüsselt.
   `kryptoVersion` bleibt 3, AAD-Konstanten bleiben unverändert — der Wechsel ist **keine**
   Krypto-Versions-Änderung. Die `depotUUID` bleibt stehen: sie ist die Identität des Depots
   (HKDF-Info-String, Bezugspunkt der Verwaltungs-Einträge), kein Geheimnis; der neue `depotSalt`
   trennt die Schlüssel bereits vollständig.
4. **Atomarität:** Erst wird der vollständige neue Container serialisiert, dann gespeichert. Es gibt
   keinen Zwischenzustand, in dem Teile mit altem und Teile mit neuem Schlüssel verschlüsselt sind.
   Im Fehlerfall bleibt die alte Datei unangetastet.
5. **Master-Bits-Zeroing** gilt im Wechsel-Pfad für beide Ableitungen (alt und neu), wie in
   `setupMasterSession` etabliert.

### A.2 Architektur-Einordnung

Der Flow verwendet ausschließlich bestehende Funktionen des Krypto-Kerns (Ableitung,
Ver-/Entschlüsselung). Er liegt vollständig **außerhalb des Verbatim-Blocks** — kein Re-Pin
erforderlich. Das im Anker-Depot gespeicherte Angehörigen-Material wandert unverändert mit
(Einzelheiten in §6, Auflage 1); die Angehörigen-Passwort-Änderung bleibt der bestehende separate
Weg (`flowVertrauenspersonEntfernen` + Neu-Einrichten).

### A.3 Die Stick-Kante (verpflichtender UX-Bestandteil)

**Alte Kopien bleiben mit dem alten Passwort lesbar.** Der Wechsel wirkt nur auf die Datei, die
überschrieben wird. Jede ältere Kopie — USB-Stick in der Schublade, Backup auf zweitem Rechner,
Datei-Anhang — bleibt mit dem *alten* Passwort vollständig lesbar. Für das Ex-Partner-Szenario heißt
das: Der Wechsel schützt nur, wenn die Bürgerin alte Kopien ersetzt oder vernichtet. Der
Abschluss-Bildschirm des Wechsel-Flows **muss** das in niedrigschwelliger Sprache sagen und zum
Ersetzen der Kopien anleiten. Ohne diesen Hinweis erzeugt der Flow eine falsche
Sicherheits-Erwartung — das wäre schlechter als kein Flow.

**Nachtrag aus der Stufe-1-Klärung (21.07.2026).** Der Hinweis trägt mehr Last, als bei
Beschlussfassung angenommen. Nur auf Chromium mit File System Access wird die Datei **in place**
überschrieben (`_depotBlobSpeichern`, FSA-Zweig). Auf iOS, Safari und Firefox entsteht eine *neue*
Datei über den Ausgabe-Pfad (`dateiAusgeben`); ob die alte ersetzt wird, entscheidet die Nutzerin im
Dateien-Dialog. Damit betrifft die Warnung dort nicht nur Zweitkopien, sondern **die Hauptdatei
selbst** — der Hinweis ist auf diesen Plattformen der einzige Schutz. Die Formulierung muss das
abdecken, ohne plattformspezifisch zu werden.

### A.4 Tests (Mindestumfang)

- Roundtrip: Wechsel, dann Öffnen mit neuem Passwort.
- Altes Passwort scheitert auf der neuen Datei.
- Beide Salts der neuen Datei unterscheiden sich von den alten.
- Falsches aktuelles Passwort → Abbruch, Datei byte-identisch unverändert.
- Zeroing-Assertion für beide Master-Bits-Ableitungen im Wechsel-Pfad.
- Vertrauens-Zugang überlebt den Wechsel; Sub-Depot überlebt den Wechsel.

Zusätzlich Pflicht: Browser- und iOS-Verifikation **am Gerät** — das Überschreiben der Datei ist
plattformspezifisch (File-System-Access vs. Download-Pfad) und von der Node-Suite nicht abgedeckt
(Regel „Node-grün ≠ am-Gerät-bewiesen").

## 3 · Beschluss B — Notfall-Blatt

### B.1 Prinzip

Im Depot-Erstellungs-Flow und am Ende des Wechsel-Flows bietet die App ein druckbares
**Notfall-Blatt** an. Das Blatt enthält *vorbereitete Leerfelder* — das Passwort wird **von Hand
eingetragen** und von der App zu keinem Zeitpunkt in ein Export-Artefakt gerendert (nicht in den
Druck-Stream, nicht in ein PDF, nicht in die Zwischenablage). Damit sind Drucker-Spool,
Print-to-PDF, Clipboard-Manager und Cloud-Zwischenablagen als Leckpfade konstruktionsbedingt
ausgeschlossen.

### B.2 Feld-Struktur

| Feld | Ausfüllung |
| --- | --- |
| Mein Vivodepot-Passwort | handschriftlich |
| Erstellt / geändert am | handschriftlich |
| Wo liegt meine Depot-Datei | handschriftlich (z. B. „USB-Stick in der Schreibtisch-Schublade") |
| Hinweis für Angehörige | vorgedruckt: wie Lese-App und Datei zu finden sind |
| Aufbewahrungs-Hinweis | vorgedruckt: „Bewahren Sie dieses Blatt dort auf, wo Ihre wichtigen Dokumente liegen — nicht am Gerät." |

### B.3 Einordnung in bestehende Linien

Der Beschluss *präzisiert* die PDF-QR-/Bereich-QR-Linie, statt sie zu brechen: Kein app-generiertes
Klartext-Geheimnis — handschriftlicher Klartext in der Verantwortung der Bürgerin ist ausdrücklich
zulässig und wird durch Struktur unterstützt. Das entspricht dem etablierten Muster physischer
Notfall-Kits und passt zur Produktlinie „der Stick aus der Schublade muss reichen": das Blatt liegt
daneben. Der ehrliche Trade-off (das Blatt ist auffindbar, auch für die familien-interne
Angreiferin) wird durch den Aufbewahrungs-Hinweis adressiert und im Bedrohungsmodell-Verfahren für
Trennungs-Situationen mitgeführt — dort gehört dann auch: neues Passwort, neues Blatt, altes
vernichten.

## 4 · Abgelehnte Alternativen

| Alternative | Grund der Ablehnung |
| --- | --- |
| Passwort in die Zwischenablage exportieren | Clipboard ist von anderen Apps lesbar; Clipboard-Manager persistieren; Universal/Cloud-Clipboard synchronisiert über Server — Bruch des Offline-Modells. |
| PDF mit eingedrucktem Passwort | Dauerhaftes Klartext-Artefakt auf Platte, typischerweise in Downloads, oft cloud-synchronisiert — schwerwiegender als die mit der PDF-QR-/Bereich-QR-Sofortmaßnahme geschlossenen Lecks, weil es der Schlüssel zu allem ist. |
| App-generierter Druck des Passworts (ohne PDF) | Drucker-Spool und „Als PDF drucken" sind nicht kontrollierbar; das Passwort verlässt die App in Klartext-Form. |
| Server-gestützter Recovery-Mechanismus | Bricht das Kern-Prinzip (kein Server, kein Konto, Bürgerin als einzige entschlüsselnde Partei). Nicht verhandelbar. |

## 5 · Konsequenzen

- Krypto-Architektur v0.4, Abschnitt 8: Die Zelle „Passwort bekannt" und der Abschnitt-14-Punkt
  „Passwort-Wechsel-Flow" können auf die reale Mitigation gestellt werden — mit Fundstellen.
- UX-Spezifikation: eigener Abschnitt Passwort-Wechsel (Dialog, Abschluss-Bildschirm mit
  Stick-Hinweis) und Notfall-Blatt (Erstellungs- und Wechsel-Flow).
- Der Wechsel-Flow erhöht nicht die Krypto-Version und berührt den Verbatim-Block nicht; keine
  Auswirkungen auf Lese-App-Kompatibilität (neue Datei ist regulärer v3-Container).
- Trennungs-Situationen-Verfahren (Bedrohungsmodell-Mitigation) erhält die Handlungskette: Passwort
  wechseln → alte Kopien ersetzen/vernichten → neues Notfall-Blatt, altes vernichten.

## 6 · Stufe-1-Klärung (21.07.2026) und die drei Auflagen

**Sub-Depots (1.1) — Erwartung bestätigt.** Der Anker-Passwort-Wechsel ändert an bestehenden
Sub-Depots nichts. Sie tragen eigenen 16-Byte-PBKDF2-Salt, eigene `depotUUID`, eigenen
32-Byte-`depotSalt` und einen ausschließlich aus dem Sub-Passwort abgeleiteten Schlüssel
(`subDepotVersiegeln` / `subDepotEntsiegeln`, über `depotMasterHkdfKey`); beim Re-Encryption des
Ankers wandern sie als **opaker Inhalt** in `data.verwalteteDepots[]` mit. Kein Stopp-Grund.

Aus derselben Klärung folgen drei bindende Auflagen für die Umsetzung:

**Auflage 1 — Container über `depotSerialisieren()`.** Der neue Umschlag wird nicht von Hand gebaut.
Bei eingerichtetem Vertrauens-Zugang trägt der Umschlag ein **siebtes Feld** neben `ct`
(`angehoerigenCache`, U2-ADR-062) — selbst Chiffrat, verschlüsselt mit dem Vertrauens-Passwort. Ein
handgebauter Umschlag würde den Angehörigen-Zugang still löschen. Der Cache hängt am
Vertrauens-Passwort, nicht am Anker-Passwort, und bleibt beim Wechsel inhaltlich gültig.

**Auflage 2 — Anker-Kontext.** `depotSerialisieren()` nutzt stets die Anker-Session-Globals, während
`data` im Sub-Kontext auf den Sub-Inhalt zeigt. Gewählt wurde die konservative der beiden im Auftrag
genannten Varianten: **der Wechsel wird im Sub-Kontext gar nicht angeboten** — der Knopf erscheint
dort nicht, und die Datenschicht lehnt einen Aufruf zusätzlich ab. Begründung: Das Muster aus
`depotInDateiSichern` (Sub neu versiegeln, `data`-Swap, zurückswappen) ist nachweislich tragfähig,
aber es löst hier ein Problem, das gar nicht entstehen muss — das Passwort, das gewechselt wird,
gehört dem Anker, und der Sub-Kontext ist die Sicht auf ein *fremdes* Depot. Zwei Wege dorthin wären
für v1.0 eine Fehlerquelle ohne Gegenwert.

**Auflage 3 — NFC selbst anwenden.** Die Normalisierung geschieht im Wechsel-Flow explizit
(`normalizePassword`), für die Prüfung des alten wie für die Ableitung des neuen Passworts —
`flowPasswortSetzen` tut das nicht, dort geschieht es erst in `depotAnlegen`.

## 7 · Bewusst offen

- **Wortlaut.** Die Texte des Wechsel-Dialogs, des Abschluss-Bildschirms und des Notfall-Blatts sind
  als Arbeitstexte gebaut und im Code mit `[PLATZHALTER-WORTLAUT]` markiert (grepbar). Entwurf
  vorgelegt, Abnahme durch die Geschäftsführung — Begriffs-Glossar, kein Technik-Jargon.
- **Nicht-FSA-Plattformen.** Dass die Datei dort nicht in place ersetzt wird, ist eine bestehende
  Eigenschaft des Speicher-Pfads (verwandt mit dem offenen Punkt „iOS-Datei-Backup-Duplikation")
  und wird von diesem ADR **nicht** gelöst, sondern nur ehrlich adressiert.

## 8 · Konformität

```konformitaet
aussage:   Der Passwort-Wechsel-Flow: Re-Encryption mit neuem Salt/Schlüssel, die neue Datei öffnet
           mit dem neuen Passwort bei unverändertem Inhalt; das alte Passwort öffnet die neue Datei
           nicht mehr.
zustand:   prüfbar
pruefung:  tests/passwort-wechsel.test.js#[Klasse-A][ADR-095] Roundtrip: die neue Datei öffnet mit dem neuen Passwort, Inhalt unverändert
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
