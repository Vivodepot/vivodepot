# U2-ADR-183 — SHL-Ablage-Host: eigener, netzloser Zwei-Seiten-Weg (U2-ADR-047 Zone 2)

**Datum:** 28.08.2026
**Status:** **Angenommen und deployt** (28.08.–29.08.2026, wörtlich bestätigt: "ok — dann so
entscheiden und Entscheidung dokumentieren") — Architektur durch Konzil (3 unabhängige Entwürfe
+ Jury + Synthese) geprüft, alle fünf offenen Punkte mit der empfohlenen Synthese-Fassung
entschieden (s. Nachtrag unten). **29.08.2026: vollständig deployt und End-zu-Ende verifiziert**
(Upload → Abruf → zweiter Abruf 404, s. Verifikation unten) — `share.vivodepot.de` läuft live.
**Typ:** Infrastruktur/Betrieb — schließt die in U2-ADR-047 bewusst offen gelassene Zone 2.
**Bezug:** U2-ADR-047 (SHL-Provider, Zone 1 fertig, Zone 2 offen) · U2-ADR-045 (autoritative
Original-Ablage) · U2-ADR-182 (Vor-Depot-Konfiguration — `connect-src 'none'` dort aus demselben
Grund gegen `fetch()` durchgesetzt, hier wiederverwendet) · `pages/README.md:11` (Offline-Zusage,
Wortlaut wird hier präzisiert) · Service Agreement Vivodepot↔MedCom/xShare, 25.06.2026 (Vertragsprüfung
28.08., s. u.) · `docs/webseite`-Konvention im internen Repo (manueller Upload, kein CI/CD).
**Status heute:** ungeprüft — bleibt kategorisch "ungeprüft", nicht "gilt": der Code lebt
außerhalb dieses Repos (internes Repo, `docs/webseite/ablage-vorbereitung/`), kein Test IN
diesem Repo kann ihn belegen. Funktional ist er fertig und live verifiziert (29.08.2026, s.
Verifikation unten) — die Kategorie beschreibt die Beleglage dieses Repos, nicht den echten
Zustand.

---

## Kontext

U2-ADR-047 hat den SHL-Provider-Weg in zwei Zonen geteilt: Zone 1 (JWE-Erzeugung, rein lokal,
fertig) und Zone 2 (Ablage der verschlüsselten Datei auf einer HTTPS-URL). Zone 2 blieb bewusst
offen — Notlösung seit 12.07.2026: **manueller SFTP-Upload auf IONOS, persönlich
durchgeführt**, selbst als "Testaufbau, keine Architektur" benannt, mit eigener ADR-Schuld.

Das skaliert auf keinen einzigen echten Nutzer außer die Person, die ihn durchführt. Wörtlich (28.08.2026):
"Es geht nicht darum, die Offline-Eigenschaft zu brechen. Es geht darum, einen Platz anzubieten,
eine Art Austauschplattform, auf der eine verschlüsselte Datei abgelegt und abgerufen werden
kann." — akzeptiert wird ausdrücklich, dass Chiffretext das Gerät verlässt, solange (a) kein
Klartext je lesbar wird und (b) `vivodepot.html` selbst weiterhin keinen Netzaufruf macht
(`connect-src 'none'` bleibt unangetastet, exakt die Grenze, die U2-ADR-182 bereits für einen
harmloseren Fall gezogen hat).

**Vertragsprüfung (28.08.2026, dieser Auftrag):** Service Agreement Vivodepot GmbH ↔ MedCom
(koordiniert das xShare-Projekt), unterzeichnet 24./25.06.2026, vollständig gelesen (15 Seiten inkl. beider
Annexe). Ergebnis: **kein Hindernis.** Der Vertrag ist ein Förder-/Nachweis-Vertrag (MedCom vergütet
Vivodepot den Nachweis der Yellow-Button-Fähigkeit gegen Gazelle-Validierung),
**kein Infrastruktur- oder Hosting-Vertrag mit xShare.** Keine Exklusivitätsklausel, keine Vorgabe
zum Ablage-Betreiber. §7.c (Intellectual Property): Vivodepot behält alle Rechte an allem, was es
baut — ein eigener Host ist frei. Einzige Anschluss-Pflicht: **falls** Vivodepot für "Real
Solution" (statt nur "Technical Demonstration") antritt, gehört ein Security/Privacy-Assessment
(Penetrationstest-Zusammenfassung, Threat Model, DPIA nach Art. 35 DSGVO) zu den Pflicht-
Deliverables (Annex 2, A2.b, Punkt 8+9) — ein selbstgebauter Ablage-Host wird dann Teil dieses
Threat-Models, nicht davon ausgenommen.

## Entscheidung (Entwurf — fünf Punkte unten noch offen)

**Ein zweites, eigenständiges Web-Dokument** (`ablage/index.html` + `ablage/upload.js`, eigene,
enge CSP mit `connect-src 'self'`) auf einer Subdomain des bestehenden IONOS-Webspace
(`share.vivodepot.de`), **getrennt von `vivodepot.html`**. Die Kern-App macht weiterhin zu keinem
Zeitpunkt einen Netzaufruf.

**Ablauf:**
1. Zone 1 (unverändert, U2-ADR-047): `vivodepot.html` baut JWE lokal (WebCrypto, `dir`/A256GCM).
2. App bietet die JWE als **Datei-Download** an (`Blob` + `<a download>`) — reines
   Dateisystem-I/O, kein Netzaufruf.
3. Nutzer klickt **selbst** einen echten `<a href="https://share.vivodepot.de/" target="_blank">`
   — Browser-Top-Level-Navigation ist kein `connect-src`-Vorgang; der eigentliche `fetch()` läuft
   ausschließlich im Skript-Kontext der zweiten Seite, nie in dem von `vivodepot.html`.
4. Auf der zweiten Seite: Datei-Auswahl, Upload gegen `hochladen.php`. Antwort = öffentliche
   Abruf-URL.
5. Nutzer trägt die URL **von Hand** zurück in `vivodepot.html` ein (Mechanismus existiert bereits
   seit 12.07.2026) — die App baut daraus lokal den fertigen `shlink:/`.

**Hosting:** PHP + SQLite (eine Datei, kein separater DB-Prozess) auf dem vorhandenen
IONOS-Webspace — kein neuer Vertragspartner, kein neues Deploy-Werkzeug, derselbe manuelle
Upload-Workflow wie bei der Website.

**Echtes One-Time statt "best-effort":** `holen.php` liefert die Datei aus **und** löscht sie im
selben Request (DB-Flag "bereits ausgeliefert" gegen Race-Conditions, kein Dateisystem-Löschen
als primärer Mechanismus) — zweiter Abruf = 404. TTL (7 Tage, wie im bestehenden `shlink:/`
verankert) als Rückfallebene über einen stündlichen Cron.

**Missbrauchsschutz:** Größenlimit 512 KB (doppelt durchgesetzt: `.htaccess`/`LimitRequestBody`
UND `hochladen.php` selbst), Rate-Limit pro IP (z. B. 10 Uploads/Stunde) UND ein globaler
Tages-Deckel über alle IPs, Format-Prüfung (fünf Punkt-getrennte Base64url-Segmente, Header
dekodiert zu `{alg,enc,cty}` wie erwartet) als reine Struktur-Prüfung — Zero-Knowledge bleibt
gewahrt, der Host prüft nie den Inhalt.

**Verhältnis zu xShare:** Ergänzen, nicht ersetzen (Empfehlung, keine Pflicht — s. offene Punkte).
Eine direkte API-Anbindung an xShare aus `vivodepot.html` selbst hätte dasselbe CSP-Problem wie
ein eigener Host — beide liefen über denselben Zwei-Seiten-Mechanismus, falls xShare technisch
dazu in der Lage ist.

## README-Zeile-11 — Präzisierungsvorschlag

Aktueller Wortlaut (`pages/README.md:11`): "vollständig offline; Inhalte verlassen das Gerät nie."
— absoluter, als das Vorhaben es zulässt, sobald Chiffretext-Versand existiert.

Vorschlag:

> "Im Betrieb läuft die App vollständig offline; Inhalte verlassen das Gerät nie — mit einer
> einzigen, bewusst gewählten Ausnahme: Wer eine SMART-Health-Link-Freigabe erzeugt, kann die
> dabei lokal verschlüsselte Datei anschließend über eine eigene, von der App getrennte Seite auf
> eine externe Ablage hochladen. Die App selbst stellt dafür zu keinem Zeitpunkt eine
> Netzverbindung her; der Ablage-Ort erhält ausschließlich Chiffretext und sieht weder den
> Klartext noch den Schlüssel."

## Größte offene Schwachpunkte (ehrlich benannt, nicht gelöst)

1. **Hosting-Annahmen unverifiziert:** ob das konkrete IONOS-Paket Cron-Jobs, die
   `pdo_sqlite`-PHP-Extension und eine eigene Subdomain unterstützt, ist NICHT geprüft — reine
   Annahme über Shared-Hosting im Allgemeinen. Erster Arbeitsschritt vor jedem Bau, nicht Teil
   dieser Architektur-Zusage.
2. **Upload-Endpunkt bleibt unauthentifiziert:** Zone 1 kann bauartbedingt (`connect-src 'none'`)
   kein Vorab-Token ausstellen. Die One-Time-Löschung schützt die *ausgelieferte* Datei nach
   Abruf, nicht den *Upload-Endpunkt* selbst — der bleibt für jeden im Internet erreichbar,
   begrenzt nur durch Rate-/Größenlimit und Format-Check.

## Entscheidung, 28.08.2026 (Nachtrag) — alle fünf Punkte

Wörtlich: "ok — dann so entscheiden und Entscheidung dokumentieren." Damit sind alle
fünf Punkte mit der empfohlenen Synthese-Fassung entschieden, jeder einzeln benannt (keine
stillschweigende Pauschal-Annahme):

1. **xShare-Verhältnis: Ergänzen, nicht ersetzen.** Vertraglich frei (Prüfung oben), Produkt-
   entscheidung getroffen — eigener Host läuft neben xShare, ersetzt es nicht.
2. **Echtes Single-Use: JA.** Sofort-Löschen-nach-erstem-Abruf gilt, mit dem benannten
   Tradeoff (Empfänger-Retry nach Verbindungsabbruch scheitert mit 404) — bewusst in Kauf
   genommen, kein TTL-only-Kompromiss.
3. **README-Zeile-11-Wortlaut: freigegeben und bereits umgesetzt** — `pages/README.md:11`
   trägt seit diesem Nachtrag den oben vorgeschlagenen Satz.
4. **Budget/Aufwand-Bereitschaft: zugesagt** — Subdomain, ggf. IONOS-Paket-Prüfung/-Upgrade,
   laufende Sicherheitsbetreuung eines zweiten öffentlichen Skripts werden getragen.
5. **Timing: jetzt vorbereiten**, nicht auf den offenen xShare-Kontakt (U2-ADR-047) warten.

**Damit weiterhin offen, aber nicht mehr eine offene Entscheidung, sondern Bau-Vorbereitung:**
IONOS-Paket-Fähigkeiten (Cron/`pdo_sqlite`/Subdomain) sind unverändert unverifiziert — erster
Arbeitsschritt vor dem eigentlichen Deploy, s. Schwachpunkte oben.

## Verifikation

Kein Test in DIESEM Repo (Code lebt in internes Repo, `docs/webseite/ablage-vorbereitung/`,
Website-/Infra-Code, nicht Kern-App) — daher bleibt der Status oben kategorisch "ungeprüft".

**Echte End-zu-Ende-Verifikation, 29.08.2026, per curl gegen den live deployten Host:**
1. Upload (`POST hochladen.php`, Multipart) → `200`, Antwort `{url, ablauf}` korrekt.
2. Erster Abruf der gelieferten URL (`GET holen.php?t=…`) → `200`,
   `Content-Type: application/jose`, Inhalt **byte-identisch** zur hochgeladenen Datei.
3. Zweiter Abruf derselben URL → `404`, leerer Body. **Echtes One-Time bestätigt** — genau der
   Punkt, den die alte Notlösung (statisches Hosting, kein Auto-Löschen) nicht konnte.

Subdomain `share.vivodepot.de` angelegt, Webspace → `/share` verbunden (SSL automatisch
zugewiesen), PHP-Version 8.3 (von `vivodepot.de` geerbt, kein Handlungsbedarf), Cronjob
"ablage-aufraeumen" angelegt (HTTP GET, täglich nachts — IONOS bietet auf diesem Vertrag kein
stündliches Intervall, bei 7-Tage-TTL unproblematisch).

## Nachtrag (26.09.2026) — die dritte Seite: Abhol-Seite, versioniert in diesem Repo

Der Zwei-Seiten-Weg oben beschreibt das **Senden**: `vivodepot.html` baut die JWE, die Ablage-Seite
lädt sie hoch. Seit dem 23.09.2026 gibt es auf demselben Host eine **dritte Seite** für die andere
Richtung, die **Abhol-Seite** (`empfangen.html`, `empfangen.js`, `empfangen.css`): wer einen fremden
`shlink:/` bekommen hat, fügt ihn dort ein, holt die Freigabe ab, entschlüsselt sie im Browser und
speichert die Datei. Danach liest die Bürgerin sie über „Daten einlesen" in Vivodepot ein; die
Einlese-Tür des Kerns verweist dafür auf die Abhol-Seite (`flowEinlesenZentral`).

**Was sich an der Grenze oben NICHT ändert:** der Kern bleibt bei `connect-src 'none'`. Der Weg zur
Abhol-Seite ist ein echter Link (Top-Level-Navigation), wie „Ablage öffnen" beim Senden; abgerufen
wird ausschließlich im Skript-Kontext der Abhol-Seite, nie in dem von `vivodepot.html`.

**Was sich an der Beleglage ändert:** die Abhol-Seite liegt seit dem 26.09.2026 **in diesem Repo**,
unter `share/`, byte-gleich mit der ausgelieferten Fassung (gemessen am 25.09.2026 gegen
`share.vivodepot.de`). Für sie gilt das „ungeprüft" oben nicht mehr: `tests/shl-abholseite.test.js`
hält sie strukturell fest (eigene CSP ohne `unsafe-inline`, keine fremden Quellen, beide Freigabewege,
Passcode nur bei `P`-Flag, AAD beim Entschlüsseln, der Schlüssel in keinem Abruf). Dieselbe Datei
enthält die Probe, die den **Kern** festhält: `connect-src 'none'` in `vivodepot.html` und
`vivodepot-lesen.html`, kein `connect-src https:`, keine Erwähnung der Abhol-Seite im Skript des
Kerns. Die Zusage „die Anwendung macht zu keinem Zeitpunkt einen Netzaufruf" ist damit nicht nur
ein Satz, sondern eine Probe, die bei jedem Lauf mitzählt.

Ob die Entschlüsselung im echten Browser trägt, prüft keine Suite-Probe, sondern ein bewusster Lauf:
`node tools/shl-empfangen-probe.js` (erzeugt eine Wegwerf-Freigabe auf dem Host und verbraucht sie).
Die Host-Dateien selbst (PHP) liegen weiterhin nicht in diesem Repo; für sie bleibt das „ungeprüft"
oben stehen, prüfbar mit `node tools/shl-manifest-probe.js --host <ordner>` gegen eine Wegwerf-Kopie.

## Konformität

```konformitaet
aussage:   Der Kern bleibt bei connect-src 'none'; die Abhol-Seite lockert ihn nicht und wird aus
           dem Kern nur verlinkt, nie abgerufen.
zustand:   prüfbar
pruefung:  tests/shl-abholseite.test.js#[U2-ADR-183] der KERN bleibt bei connect-src none — diese Seite lockert ihn nicht
quelle:    invariante
```

*Bindung nachgetragen 26.09.2026 (Nachtrag oben).*
