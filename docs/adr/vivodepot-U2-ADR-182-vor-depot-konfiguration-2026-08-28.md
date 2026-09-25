# U2-ADR-182: Vor-Depot-Konfiguration — jeder Modultyp als signiertes Modul, die App-Datei bleibt für alle gleich

**Status:** Akzeptiert
**Datum:** 28.08.2026
**Kategorie:** ARCHITEKTUR, PRODUKT
**Status heute:** gilt — gebaut, Test-Bezug s. u.

**Grundlage:** Brainstorming-Sitzung, 28.08.2026, ausgelöst durch zwei
Beobachtungen aus der Praxis: „ich komme nicht zu Einstellungen, wenn alles Deutsch ist" und der
Wunsch, dass eine ungarische Hebamme (Referenzfall aus dem Modul-Erstellungs-Test derselben
Nacht) von der ersten Sekunde an ihren eigenen Startbildschirm sieht — ohne Berührung mit dem
deutschen Bürgerdepot-Layout, „aus ihrer Sicht unterschiedliche Produkte". Design mehrfach
gegengeprüft und korrigiert während der Sitzung (erster Vorschlag — eigene generierte App-Datei
je Institution — verletzte eine bereits bestehende Sicherheitszusage, s. Verworfene Alternativen).

**Drei-Anker:**
- **Code-Stelle (gebaut):** `vorDepotKonfigurationLeer`/`vorDepotKonfigurationLaden`/
  `vorDepotKonfigurationAnwenden` (`vivodepot.html`, direkt nach `EINLASS_REGISTER`) — der neue
  Vor-Depot-Speicherort (Slot-Struktur wie im Depot) plus der script-Tag-Ladeweg. `modulEinlassen`
  (`vivodepot.html:23855`) trägt den `ziel`-Parameter unverändert, wie ursprünglich vermutet — kein
  Code-Fund dort (Task 2). `brandingAnwenden` (`vivodepot.html:13041`, neben
  `brandingModulPruefen`/`brandingModulEinbetten`, `vivodepot.html:12979`/`13020`) wendet
  `farbePrimaer`/`farbeSekundaer`/`schriftart` erstmals tatsächlich als CSS-Custom-Properties an —
  EIN Anwendungsort für Vor-Depot UND normal ins Depot eingelassenes Branding.
- **Betroffener Weg:** `booteEingang()` (fire-and-forget vor `renderWelcome()`), `textsatzSpracheAktiv()`
  (zusätzlicher Vor-Depot-Fall vor dem eingebauten Rückfall), `_depotSpeicherZuruecksetzen()`
  (Branding-Reset beim Depot-Wechsel). Das PWA-Manifest/der Odoo-Laden-Auslieferungsweg bleiben
  wie im Kontext beschrieben, unberührt von diesem Umsetzungsschritt.
- **Test-Bezug:** `tests/vor-depot-konfiguration-speicher.test.js`,
  `tests/vor-depot-konfiguration-einlassen.test.js`,
  `tests/vor-depot-konfiguration-anwenden.test.js`,
  `tests/vor-depot-konfiguration-branding-css.test.js`,
  `tests/vor-depot-konfiguration-alle-register.test.js`.

---

## Kontext

Zwei getrennt aussehende Beobachtungen sind dieselbe Lücke:

1. **Branding wird validiert, aber nie angewendet.** `brandingModulPruefen` prüft `farbePrimaer`
   u. a. sauber, aber keine Code-Stelle setzt diese Werte je als CSS — selbst ein erfolgreich
   eingelassenes Branding-Modul bliebe unsichtbar.
2. **Henne-Ei bei der Sprache.** Der echte Textsatz-Mechanismus (`textLesen`/
   `_TEXTSATZ_MODUL_REGISTRY`) kann jeden UI-Text übersetzen, auch „Einstellungen" selbst — aber
   der Weg dorthin (Einstellungen) ist auf Deutsch, bis ein Sprachmodul eingelassen wurde. Und
   `modulEinlassen` bricht ohne offenes Depot sofort mit `kein-depot` ab — der Weg ist also nicht
   nur schwer auffindbar, sondern architektonisch für den Vor-Depot-Fall gesperrt. Außerhalb eines
   Depots existiert nur ein hartcodiertes, nicht persistentes DE/EN-Wörterbuch für zwei
   Startbildschirme (`PRE_DEPOT_EN`) — kein echter Mechanismus, keine dritte Sprache möglich.

Beides zusammen verhindert genau das, was ein institutioneller Pro-Kunde braucht: ein Depot, das
von der ersten Sekunde an in der eigenen Sprache und im eigenen Erscheinungsbild läuft, ohne
Umweg über ein deutsches Bürgerdepot.

**Nachtrag zur Sitzung (28.08.2026): Umfang erweitert.** Ursprünglich nur an Sprache/Branding
durchdacht — der Umfang wurde ausdrücklich auf **alle sieben Registertypen**
erweitert: „nicht nur Sprache/Branding sondern auch Rechtsraum, Thema etc. — also alle möglichen
Modulformen." Die Lücke ist bei genauerem Hinsehen dieselbe für jeden Registertyp: `rechtsraum`,
`institutionsArt`, `format`, `bereich`, `logikModul` sitzen im selben `EINLASS_REGISTER` und
brechen am selben `kein-depot`-Abbruch. Kein Grund, die Vor-Depot-Fähigkeit auf zwei von sieben
Typen zu beschränken — derselbe Mechanismus trägt alle sieben gleich.

**Nachtrag: Abgrenzung gegen zwei bestehende Mechanismen geprüft, keine Überschneidung.** Auf die
Frage „werden Templates (z. B. ein Pflegeheim-Fragebogen, der ins Bürgerdepot einer Bürgerin
kommt) damit obsolet?" — Antwort: nein, zwei bereits bestehende, unveränderte Wege bleiben
zuständig:

1. **Der „Anbieter-Template"-Weg** (`provider-credential`-Import, `vivodepot.html:20967-20990`,
   Felder landen in `data.feldDefinitionen[]`) — der tatsächliche, heute voll funktionierende Weg
   für institutionelle Fragebögen INS Bürgerdepot einer Bürgerin. Läuft über den allgemeinen
   Datei-Import-Dialog, nicht über `EINLASS_REGISTER`/Einstellungen. Von diesem ADR unberührt.
2. **Einstellungen → Erweiterung einlassen (bestehender `EINLASS_REGISTER`-Weg) bleibt für die
   gesamte Zeit NACH der Ersteinrichtung zuständig** — Modul-Erneuerung (Ablauf nach 12/18
   Monaten, bereits entschieden), ein nachträglich hinzukommendes Modul bei einem bestehenden
   Pro-Depot, ein gewöhnliches Bürgerdepot, das freiwillig nachträglich eine zweite Sprache will,
   eine Institution, die ihr Branding später ändert. **182 wirkt genau einmal, vor dem ersten
   Depot — alles danach läuft weiterhin über Einstellungen.** Kein Ersatz, keine Streichung.

## Entscheidung

**1. Jeder der sieben Registertypen (textsatz, rechtsraum, institutionsArt, format, bereich,
branding, logikModul) kann als signiertes Modul auch VOR dem ersten Depot ausgeliefert werden —
derselbe Vertrauensweg, kein Parallelmechanismus.** Kein neuer Prüf- oder Signiermechanismus;
dieselbe Baukasten-Architektur (Zertifikatskette, `*ModulPruefen`, `EINLASS_REGISTER`), die für
den Post-Depot-Fall bereits gilt — nur der Zielort (`ziel`-Parameter, s. u.) und der
Anwendungszeitpunkt sind neu.

**2. `modulEinlassen` bekommt einen zweiten Ziel-Ort als `ziel` — angewendet, bevor der
Willkommensschirm rendert. Nachtrag (28.08.2026, KORRIGIERT, s. u.): dieser Ort ist KEIN
Browser-Speicher, sondern ein bei jedem Boot frisch abgerufener Ort.** Der Parameter existiert
bereits und unterstützt das mechanisch; neu ist der Aufrufzeitpunkt (App-Start, vor jeder
Depot-Interaktion) und die Quelle (s. u.). Branding-Daten werden im selben Zug erstmals
tatsächlich als CSS-Custom-Properties angewendet (Lücke aus Kontext-Punkt 1 geschlossen).

**3. Die App-Datei selbst bleibt für alle Nutzerinnen byte-identisch.** Keine Variante, kein
Institutions-Build. Damit bleibt die im Laden-Konzept festgehaltene Sicherheitszusage
unverletzt: „was eine Käuferin bekommt: … keine Anwendung — die kommt unverändert von der
Originalquelle" (internes Konzeptdokument vom 23.08.2026, Abschnitt 3).

**4. Für die PWA-Homescreen-Identität (Icon, App-Name) bekommt jede Institution zusätzlich einen
eigenen URL-Pfad — dahinter liegt exakt dieselbe, unveränderte App-Datei, nur das Manifest an
diesem Pfad unterscheidet sich.** Grund: das Web-App-Manifest wird vom Browser beim „Zum
Startbildschirm hinzufügen" gelesen, bevor irgendein Modul angewendet werden kann — technisch
nicht per Laufzeit-Modul änderbar. Ein eigener Pfad pro Mandant für die Manifest-Identität ist die
etablierte Konvention bei White-Label-PWAs, kein Sonderweg. Betrifft nur den Zugangspfad/das
Manifest, nicht den Anwendungscode — Punkt 3 bleibt davon unberührt.

## Nachtrag: Speicherort korrigiert — kein Browser-Speicher, Subdomain liefert frisch

**28.08.2026, während der Umsetzung gefunden (VD Fix), sofort entschieden.**
Der ursprüngliche Entscheidungspunkt 2 sah `localStorage` als Speicherort vor. Das kollidiert mit
einem Klasse-A-Wächter (`tests/nicht-persistenz.test.js`, letzte Probe: kein
`localStorage`/`sessionStorage`-Zugriff im gesamten Kern-Quelltext, ausnahmslos) — und, wichtiger,
mit einem erst einen Tag zuvor bekräftigten Grundsatz: der Vor-Depot-Sprachschalter (27.08.2026,
`vivodepot.html` ~Zeile 9984) verzichtet BEWUSST auf `localStorage`, mit der Begründung, das wäre
„der erste dauerhaft außerhalb der Depot-Datei gespeicherte Zustand im ganzen Kern" — dieselbe
Zurückhaltung gilt auch beim harmlosen Kontrast-/Nachtmodus-Schalter. Dieser Präzedenzfall wurde
beim ursprünglichen Entwurf dieses ADR übersehen.

**Korrigierte Entscheidung: keine Persistenz im Browser.** Die Vor-Depot-Konfiguration wird bei
JEDEM App-Start per `fetch()` von einem relativen, wohlbekannten Pfad neu abgerufen (Quelle der
Wahrheit ist die Institutions-Subdomain/der Server, nicht der Browser) — dieselbe Prüfkette wie
jedes andere Modul (`*ModulPruefen`, Zertifikatskette), nur bei jedem Laden neu ausgeführt statt
einmalig gecacht. Existiert am erwarteten Pfad nichts (Standard-`vivodepot.app` ohne
Institutions-Subdomain), bleibt das Verhalten exakt wie heute.

**Warum das zusätzlich besser passt, nicht nur der Wächter-Konflikt-Ausweg ist:** trifft sich
sauber mit der noch offenen Subdomain-Frage (jede Institution bekommt einen eigenen URL-Pfad, s.
„Offen, nicht Gegenstand dieses ADR" unten) — die Subdomain selbst trägt die Zuordnung, kein
zweiter Mechanismus (Browser-Speicher) nötig, um sich „zu merken", welche Institution das ist.

## Nachtrag: Kein `fetch()` — CSP `connect-src 'none'` ist ausnahmslos, script-Tag statt Netzruf

**28.08.2026, während der Umsetzung (VD Fix, Task 3, E2E-Lauf), sofort
entschieden.** Der vorige Nachtrag korrigierte den Speicherort auf „bei jedem Boot per `fetch()`
neu abrufen" — das kollidiert seinerseits mit der bestehenden CSP: `vivodepot.html` fährt
`connect-src 'none'`, ausnahmslos, kommentiert als „KEIN Netz-Pfad für Inhalte/Depots/Schlüssel/
Metadaten". Das verbietet jeden `fetch()`, auch same-origin relative Pfade. Ein weiterer, beim
ADR-Entwurf übersehener Präzedenzfall — diesmal keine Wächter-Umgehung nötig, weil sich ein
schwächerer, bereits erlaubter Kanal fand.

**Korrigierte Entscheidung: kein `fetch()`, stattdessen ein dynamisch eingefügtes
`<script src="./vorabkonfiguration.js">`-Tag (JSONP-Muster).** Die Provisionierungs-Datei
liefert kein reines JSON, sondern eine einzige, simple Zuweisung
(`window.__vorDepotKonfiguration = {...};`) — `script-src 'self'` ist in der CSP bereits
erlaubt, `connect-src` bleibt vollständig unangetastet. `onerror`/Timeout als Fallback (Datei
fehlt → Standardverhalten wie heute).

**Sicherheitsbedingung, nicht verhandelbar:** ein `<script>`-Tag kann technisch Code ausführen —
das macht den Kanal selbst nicht vertrauenswürdiger als ein `fetch()`-Ergebnis. Die gelieferten
Daten durchlaufen weiterhin VOLLSTÄNDIG die bestehende Signaturprüfung (`*ModulPruefen`,
Zertifikatskette) — kein Vertrauensvorschuss, nur weil der Kanal jetzt `script-src` statt
`connect-src` ist. Die Datei selbst darf ausschließlich die eine Zuweisung enthalten, keinen
Funktionsaufruf, keinen dynamischen Code.

## Nachtrag — gebaut (28.08.2026)

Umgesetzt in sechs Tasks (interner Umsetzungsplan, nicht Teil dieses Repos), über beide oben
dokumentierten Kanal-Korrekturen hinweg (localStorage → fetch → script-Tag).
Test-Bezug: `tests/vor-depot-konfiguration-speicher.test.js`,
`tests/vor-depot-konfiguration-einlassen.test.js`,
`tests/vor-depot-konfiguration-anwenden.test.js`,
`tests/vor-depot-konfiguration-branding-css.test.js`,
`tests/vor-depot-konfiguration-alle-register.test.js`. Volle Suite, E2E (dreimal in Folge stabil)
und Wächter-Selbsttest grün — Commits `7c4991b`, `7c43911`, `4397ccb`, `99af89f`, `b73803e` auf
`u2-kanon` (die jeweils aktuelle Anzahl steht in `docs/faktenbasis.md`, nicht hier — sie veraltet
sonst lautlos).

Ein dritter, beim E2E-Lauf gemessener Kanal-Feinschliff (nicht in den obigen zwei Nachträgen
erfasst): ein `<script>`-Tag für eine fehlende Ressource loggt „Failed to load resource"
browsereigen, nicht per JS unterdrückbar. Unter `file://` (die gesamte E2E-Suite UND jede direkt
verteilte, nicht gehostete Datei) kann eine Institutions-Subdomain-Datei strukturell nie
existieren — der Ladeversuch entfällt darum unter `file://` ganz, statt erst sein Fehlschlag
geschluckt zu werden.

**Was in den sechs Tasks bewusst NICHT gebaut wurde:** der tatsächliche Provisionierungs-/
Schreibweg, der eine Vor-Depot-Datei bei einer Institution erstmals anlegt — gehört zum noch
offenen Laden-/Odoo-Vertriebsweg (s. „Offen, nicht Gegenstand dieses ADR" oben), nicht zu diesem
Umsetzungsschritt. `vorDepotKonfigurationLaden`/`-Anwenden` lesen eine fertige Datei; nichts im
Kern schreibt sie.

## Verworfene Alternativen

- **Eigene, generierte/modifizierte App-Datei je Institution.** Erster Entwurf dieser Sitzung.
  Verworfen: verletzt die „keine Anwendung"-Sicherheitszusage des Laden-Konzepts direkt — genau
  das dort benannte Manipulationsrisiko (`SECURITY.md`).
- **Dynamisches Umschreiben des Manifests per JavaScript zur Laufzeit.** Verworfen: in der
  Web-Entwicklung als unzuverlässig dokumentiert, funktioniert plattformabhängig unterschiedlich
  (insbesondere iOS Safari), keine anerkannte Konvention.
- **Branding bleibt ausschließlich im Depot, wirkt nie vor dem ersten Depot.** Verworfen: löst die
  eigentliche Anforderung nicht — der Wunsch war ausdrücklich „vor dem Start".

## Offen, nicht Gegenstand dieses ADR

- Ob ein Vor-Depot-Bündel mehrere Registertypen gleichzeitig tragen darf (ein Modul, mehrere
  Typen) oder jeder Typ ein eigenes Bündel bleibt (sieben Module, einzeln signiert) — technische
  Umsetzungsfrage, gehört in den Plan, nicht in diese Architekturentscheidung.
- Wie die Provisionierung technisch bei der Institution ankommt (Download über den Laden,
  Auslieferungsmechanik) — gehört zur Umsetzung des Laden-/Odoo-Vertriebswegs, nicht in diese
  Architekturfrage.
- Der Umsetzungsplan selbst (Reihenfolge, Testfälle, Dateien) — eigener Schritt nach diesem ADR.

---

*Vivodepot GmbH · 28.08.2026*
