# U2-ADR-190: Bedingtes skipWaiting — präzise statt pauschale Anwendung von U2-ADR-015 Etappe 8

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** ARCHITEKTUR, SICHERHEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-015 (Etappe 8 — Service Worker, skipWaiting bewusst aus; diese Entscheidung
iteriert NUR den Aktivierungs-Teil, siehe „Verhältnis zu U2-ADR-015" unten) · U2-ADR-103
(Politik A / `_ungespeicherteAenderungen` als derselbe, hier wiederverwendete Zähler)
**Anker:** Auftrag „Service-Worker-Aktivierung — bedingtes skipWaiting", 01.09.2026,
auf Grundlage eines vorangegangenen, reinen Lese-Zugs (Zug 0, 31.08.2026) zur Update-Sackgasse.
Der darin genannte v68/16.07.2026-Schwellenwert wurde für diesen Bau gegen die Commit-Historie
selbst gegengeprüft (`git show a3e3fd5`), nicht übernommen — Beleg unten. Der Warte-Zustand wurde
während des Baus zweimal nachgeschärft, beide Male, am selben
Tag: zuerst „kein Bürgertext, der von einem Mechanismus erzählt, den sie nicht kennen soll",
danach knapp entschieden „also automatisch updaten" — die Fassung unten ist die entschiedene,
nicht die erste.
**Status heute:** gilt — Beleg `tests/sw-aktivierung-bedingtes-skipwaiting.test.js`,
`tests/sw-update-zustellung.test.js`, `tests/e2e/sw-uebernahme-keine-same-origin-anfrage.spec.js`
(Nachtrag 01.09.2026, `clients.claim()`).

---

## Kontext

Der Zug-0-Bericht (31.08.2026) zeigt zwei unabhängige Sperren zwischen einer neuen `sw.js` und
einer Bürgerin, die sie tatsächlich bekommt:

1. **Erkennung** — vor Commit `a3e3fd5` (16.07.2026, `SCHALEN_STAND` v68) prüfte keine
   aktive, fokusgetriebene `registration.update()`. **Selbst gegengeprüft** (nicht aus dem
   Bericht übernommen): `git show a3e3fd5:vivodepot.html` trägt `SCHALEN_STAND='v68'` und genau
   1 Treffer für `visibilitychange`-SW-Kopplung; der Eltern-Commit (`v66`) hat 0. Die Schwelle
   stimmt.
2. **Aktivierung** — unverändert seit jeher: `skipWaiting()` wird nirgends gerufen
   (`sw.js`, install-Handler, Kommentar dort: „KEIN automatisches skipWaiting — der
   Schalen-Wechsel ist ein bewusster Schnitt"). `activate` (und damit `clients.claim()`)
   feuert erst, wenn der neue Worker „aktivierbar" ist — und das erfordert spezifikationsgemäß
   NULL vom alten Worker kontrollierte Clients. Ein Tab/Fenster/eine PWA-Instanz reicht, um
   das dauerhaft zu verhindern.

**Sperre 2 trifft JEDE Installation**, alt wie neu — auch eine, die Sperre 1 längst nicht mehr
hat. Der Grund für Sperre 2 ist real und bleibt bestehen: kein Umschalten der Schale mitten in
einer offenen Sitzung mit ungesicherten Daten (dieselbe Sorge, die Politik A/U2-ADR-103 trägt).

**Was diese Entscheidung NICHT ist:** keine Aufhebung dieser Sorge. Bis heute war die einzige
verfügbare Bedingung für „sicher umschalten" grob: „niemand hat die App mehr offen". Diese
Entscheidung ersetzt die grobe Bedingung durch eine genaue, bereits an anderer Stelle im Haus
gemessene: `_ungespeicherteAenderungen === 0` — derselbe Zähler, der Politik A trägt, empirisch
belegt (Feld-Autosave faltet nur ins RAM, `depotInternSichern()` schreibt nur nach ausdrücklicher
Handlung — der Zähler bleibt bei blosser Eingabe verlässlich über null).

**Ein Nebenfund, unabhängig geprüft, gehört zur Vollständigkeit hierher:** `sw.js` selbst steht
zu keinem Zeitpunkt der Historie in `SCHALE` (geprüft: `git log --all -p -- sw.js` zeigt SCHALE
nur mit `'./'`, der HTML-Datei und `manifest.webmanifest`, nie mit sich selbst). Die eigene
Auslieferung des Skripts ist damit strukturell NIE durch den cache-first-`fetch`-Handler
der eigenen, alten Version abgefangen — ein Worker kann sein eigenes Nachfolge-Skript nicht
über seinen eigenen `fetch`-Handler blockieren (das ist außerhalb der Interception-Fläche der
Service-Worker-Spezifikation, nicht code-spezifisch für diese App). Erkennung war also, sobald
Sperre 1 fiel, nie das strukturelle Problem — Aktivierung war es immer.

---

## Entscheidung

**Ein wartender Worker (`registration.waiting`) wird aktiviert, wenn und nur wenn
`_ungespeicherteAenderungen === 0`** — geprüft bei jeder ohnehin schon bestehenden Gelegenheit
(Fokus-/Sichtbarkeits-Wechsel, Sofort-Check-Knopf, direkt nach der Registrierung, direkt nach
jedem `updatefound`→`installed`-Übergang) UND zusätzlich unmittelbar nach jedem erfolgreichen
Sichern (`markiereGespeichert()`), damit das Versprechen „sichern Sie, dann wird sie übernommen"
nicht erst beim nächsten zufälligen Fokuswechsel einlöst, sondern sofort.

**Bauform:** Der Worker kennt `_ungespeicherteAenderungen` nicht (und soll es nicht) — die Seite
entscheidet, der Worker gehorcht nur.
- `vivodepot.html`: `_swAktivierenWennMoeglich(reg)` prüft den Zähler und sendet bei 0
  `reg.waiting.postMessage({type:'SKIP_WAITING'})`.
- `sw.js`: ein neuer `message`-Handler ruft `self.skipWaiting()` **ausschließlich** auf diese
  benannte Anweisung hin — kein automatischer, kein bedingungsloser Aufruf, nirgends sonst.

**Wenn NICHT aktiviert werden kann** (Zähler > 0): kein Umschalten, keine Anzeige — nichts.
Kein Toast, kein Banner, kein „Neu laden". Stattdessen wartet die Seite still und stößt denselben
Check unmittelbar nach dem nächsten erfolgreichen Sichern erneut an (`markiereGespeichert()`,
s. Bauform oben) — dem Zeitpunkt, an dem der Zähler ohnehin wieder auf 0 fällt, weil die Bürgerin
das Sichern bereits selbst und aus eigenem Antrieb tut.

**Wenn aktiviert wird** (Zähler bereits 0, oder gerade erst gesichert): ebenfalls kein Toast, kein
Banner, kein „Neu laden" — weder sofort noch später. Das schließt den bisherigen Stufe-2-Hinweis
bei `controllerchange` ausdrücklich ein: er ist mit dieser Entscheidung ZURÜCKGEBAUT, nicht nur
für den neuen Fall ungenutzt gelassen (Beleg: `tests/sw-update-zustellung.test.js`).

**Entschieden, wörtlich:** „Das sind ja alles Dinge, die der Nutzer nicht
mitbekommt und nicht anstossen kann/sollte. Sie sieht einfach nur ihr Depot in der richtigen
Umgebung, und sie bekommt die aktuelle Version der App at all times." Ein ERSTER Entwurf dieser
Entscheidung sah noch einen eigenen Bürgertext für den Warte-Zustand vor („Eine neuere Fassung
von Vivodepot liegt bereit. Sie wird übernommen, sobald Sie Ihre Änderungen gesichert haben.") —
verworfen, auf denselben Einwand hin: JEDER Text über diesen Mechanismus erzählt von etwas, das
die Bürgerin nicht wissen soll. Die Aktivierung ist damit vollständig unsichtbar in BEIDEN
Zuständen, nicht nur im wartenden.

**Ausnahme, ausdrücklich bestätigt statt weiter ausgebaut:** der „Sofort prüfen"-Knopf in den
Einstellungen (`_swSofortPruefen`, aus einem früheren Auftrag zur Update-Sackgasse, 31.08.2026)
bleibt samt seiner Toast-Rückmeldungen unverändert bestehen. Er stand zur Prüfung, ob er der
Offline-Zusage widerspricht — entschieden: automatisch wird aktualisiert, dieser ausdrücklich
ausgelöste Knopf bleibt davon unberührt: eine Handlung, die jemand bewusst
antippt, darf antworten. Nicht ausbauen, nicht einschränken.

**`file://` / USB-Stick: kein Update, KONSTRUKTION statt Lücke.** Ohne Netz gibt es kein `fetch`
auf `sw.js`, keine Registrierung, keinen wartenden Worker — `_swRegistrierenErlaubt()` schließt
den Datei-Ursprung ohnehin schon aus (U2-ADR-015 Etappe 8, unverändert). Eine Installation von
einem USB-Stick oder als lokale Datei bleibt auf ihrem mitgelieferten Stand stehen, bis sie erneut
von einer gehosteten Quelle geöffnet wird — das ist der Datei-Modus selbst, kein Fehlen dieser
Entscheidung. Ausdrücklich hier vermerkt, damit es niemand später als übersehenen Fall meldet.

## Verhältnis zu U2-ADR-015 (Etappe 8)

**Der Schutzgrund aus U2-ADR-015 Etappe 8 bleibt vollständig erhalten.** „skipWaiting bleibt
aus" ist weiterhin der DEFAULT — was sich ändert, ist einzig, DASS jetzt eine benannte, geprüfte
Ausnahme existiert, statt einer pauschalen Sperre ohne jede Bedingung. U2-ADR-015 selbst hatte
recht: ein Umschalten mitten in offener Arbeit wäre falsch. Es hatte nur noch kein Signal, um
„offene Arbeit" von „nichts offen" zu unterscheiden — dieses Signal existiert jetzt (seit
U2-ADR-103/A1), belegt, und wird hier zum ersten Mal für diesen Zweck herangezogen.
U2-ADR-015 wird als **teilweise überholt durch U2-ADR-190** markiert (Nachtrag dort).

## Verworfene Alternative

**Automatisches, bedingungsloses `skipWaiting()`** (die naheliegende, einfachste Lösung).
Verworfen: träfe exakt die Sorge, die U2-ADR-015 Etappe 8 ursprünglich benannte — ein Umschalten
mitten in einer offenen, ungespeicherten Depot-Sitzung. Nicht erwogen, weil sie unnötig ist: das
präzise Signal existiert bereits im Haus, es musste nur herangezogen werden.

## Abgrenzung — was diese Entscheidung NICHT löst

**Kein Anleitungsdokument als Ersatz.** Ein früherer Entwurf dieses Auftrags sah eine
Anleitung zum manuellen Löschen der Website-Daten für nicht erreichbare Alt-Installationen vor.
Verworfen, auf ausdrücklichen Einwand: „Es geht nicht ums Löschen — es geht ums
Abgrenzen und darum, dass Updates wirksam erkannt werden, auch für Oma Erna." Eine Anleitung, die
verlangt, dass eine technisch unbedarfte Nutzerin in Browser-Einstellungen Websitedaten löscht,
ist kein Ersatz für eine funktionierende Erkennung+Aktivierung — sie ist das Eingeständnis, keine
zu haben.

**Die tatsächliche Abgrenzung, gemessen:**
- **Erkennung** (Sperre 1) greift ab `SCHALEN_STAND` v68 (16.07.2026), git-bestätigt (s. o.).
  Installationen davor verlassen sich ausschließlich auf den Browser-eigenen, passiven
  Update-Check.
- **Ob dieser passive Check alte Installationen tatsächlich erreicht, ist NICHT vollständig
  geklärt und wird als eigener, noch offener Strang weiterverfolgt** (01.09.2026,
  live an einem realen Gerät — Installation `v1.0-rc.479`, unterhalb der Schwelle). Ein erster
  Verdacht dort — ein einzelner fehlschlagender Precache-Eintrag breche `install` komplett ab,
  analog zu `cache.addAll()` — ist am aktuellen Code WIDERLEGT: `sw.js` cacht jeden
  `SCHALE`-Eintrag EINZELN mit eigenem `.catch(() => undefined)`
  (`Promise.all(SCHALE.map(url => cache.add(url).catch(() => undefined)))`); ein einzelner
  404 bricht die Installation nicht ab. Offen bleibt ein engerer Verdacht (`caches.open()`
  selbst könnte ablehnen, z. B. bei Speicherplatz-Beschränkung) — dafür fehlt eine
  Geräte-Messung; nicht Teil dieser Entscheidung.
- **Ein weiterer, unabhängig gemessener Befund** (01.09.2026, Firefox): ein privates
  Fenster ist in Firefox KEIN verlässlicher Weg zu „ganz frisch" — private Fenster teilen sich
  Sitzung, Cache und Worker-Zustand, solange eines offen bleibt; erst ein vollständiges
  Schließen ALLER (auch privater) Fenster wirkt. Für die Bürgerin ist das nicht unterscheidbar
  von „es funktioniert nicht" — gehört in jede künftige Anleitung, nicht als Sonderfall, sondern
  als Regel: die Wege, die ein Mensch für „ganz frisch" hält, sind es oft nicht.

**Kurz:** diese Entscheidung behebt die Aktivierungs-Sperre für JEDE Installation, die die neue
Fassung bereits erkannt hat. Sie behebt nicht rückwirkend, ob und wie zuverlässig eine sehr alte
Installation die neue Fassung überhaupt entdeckt — das bleibt gemessen, nicht geschätzt, und
bleibt ein offener, benannter Strang statt eines stillschweigend angenommenen Rests.

## Konsequenzen

Eine Installation ohne offene, ungespeicherte Änderungen aktiviert eine neue Schale jetzt beim
nächsten Fokus-/Sichtbarkeits-Wechsel (oder unmittelbar bei der Registrierung, falls schon ein
Worker wartet), ohne dass alle Tabs geschlossen werden müssen — und ohne jedes sichtbare Zeichen.
Eine Installation MIT offenen Änderungen bleibt unverändert sicher und wartet ebenso lautlos bis
zum nächsten Sichern.

**Automatisch heißt auch: eine schlechte Fassung kommt automatisch an.** Bis zu dieser Entscheidung
schützte die Aktivierungs-Sackgasse selbst unfreiwillig vor einer fehlerhaften Auslieferung — eine
Bürgerin, die die App offen ließ, bekam einen fehlerhaften neuen Stand schlicht nie zu Gesicht. Das
war ein Fehler, aber es war zugleich ein Puffer. Dieser Puffer fällt mit dieser Entscheidung weg,
und zwar für ALLE erreichten Installationen zugleich, nicht gestaffelt. Das ist keine Warnung
nebenbei, sondern die Begründung, warum die Auslieferung selbst beweisen muss, dass sie grün ist,
BEVOR sie gelegt wird — nicht erst hinterher, wenn sie schon bei jeder offenen Installation
ankommt. `tools/testfassung-legen.js` baut genau diesen Beweis: es legt eine neue Testfassung nur,
wenn der lokale HEAD mit dem gepushten `origin/u2-kanon`-HEAD übereinstimmt — und jeder Push hat
bereits das pre-commit-Suite-Gate durchlaufen, mit derselben Bürgschaft, die jeder Commit in diesem
Repo trägt. Diese Entscheidung und jene sind ein Paar: die eine macht Fehler schneller sichtbar
für die Bürgerin, die andere sorgt dafür, dass es weniger Fehler zu sehen gibt.

Ungemessen (wie beim Zug-0-Bericht selbst benannt): ob `updatefound`/`statechange` in jeder
relevanten Browser-Engine identisch feuert; ob die App tatsächlich installiert/als PWA läuft,
wenn `registration.waiting` erstmals geprüft wird, spielt für die Logik keine Rolle (sie prüft
nur, ob ein Waiting-Worker existiert).

## Konformität

```konformitaet
aussage:  Ein wartender Worker wird aktiviert (SKIP_WAITING gesendet), wenn
          _ungespeicherteAenderungen bei der Prüfung 0 ist.
zustand:  geprüft
herkunft: invariante
pruefung: tests/sw-aktivierung-bedingtes-skipwaiting.test.js#U2-ADR-190: bei Zähler 0 wird die Aktivierung angestossen (SKIP_WAITING gesendet)
```

```konformitaet
aussage:  Ein wartender Worker wird NICHT aktiviert, solange _ungespeicherteAenderungen > 0 ist —
          keine SKIP_WAITING-Nachricht wird gesendet.
zustand:  geprüft
herkunft: invariante
pruefung: tests/sw-aktivierung-bedingtes-skipwaiting.test.js#U2-ADR-190: bei Zähler > 0 wird NICHT umgeschaltet (die Probe, die den Schutz trägt)
```

```konformitaet
aussage:  sw.js ruft self.skipWaiting() ausschließlich innerhalb des message-Handlers auf eine
          SKIP_WAITING-Anweisung hin — nie automatisch im install-Handler oder sonst wo.
zustand:  geprüft
herkunft: invariante
pruefung: tests/sw-update-zustellung.test.js#Stufe 3: skipWaiting bleibt AUS außer auf ausdrückliche Anweisung — nie automatisch (U2-ADR-190)
pruefung: tests/sw-aktivierung-bedingtes-skipwaiting.test.js#U2-ADR-190: message SKIP_WAITING ruft self.skipWaiting() auf
pruefung: tests/sw-aktivierung-bedingtes-skipwaiting.test.js#U2-ADR-190: eine andere/fehlende Nachricht ruft KEIN skipWaiting() auf
```

```konformitaet
aussage:  Die Aktivierung bleibt für die Bürgerin in beiden Zuständen (wartend, aktiviert) ohne
          jedes sichtbare Zeichen — kein controllerchange-Hinweis-Banner, kein toter String dafür.
zustand:  geprüft
herkunft: produktentscheidung, 01.09.2026
pruefung: tests/sw-update-zustellung.test.js#[Negativprobe] U2-ADR-190: Stufe 2 (ungefragter Versions-/Neuladen-Hinweis) bleibt zurückgebaut
```

## Nachtrag (01.09.2026) — `clients.claim()`: gemessen statt vermutet

**Offener Posten aus dem Bau selbst, über Nacht geparkt, hier geschlossen.** `sw.js` trägt seit
dem Gründungs-Commit (`56192e2`, 12.06.2026) ein unbedingtes `await self.clients.claim();`
im `activate`-Handler — zweieinhalb Monate folgenlos, weil `activate` bei offenen Tabs nie feuerte.
Diese Entscheidung macht die Zeile durch `skipWaiting()` erstmals ERREICHBAR, nicht die Zeile
selbst hat sich geändert. `clients.claim()` lädt den Code eines übernommenen Tabs NICHT neu — es
ändert nur, welcher Worker künftige `fetch`-Ereignisse dieses Tabs bedient. Die Gefahr, vor der
U2-ADR-015 Etappe 8 ursprünglich schützen sollte: alter, laufender Code stellt nach der Übernahme
eine Anfrage, die vom NEUEN Worker (neuer Cache-Inhalt) bedient wird.

**Gemessen: eine breite, reale Sitzung (`tests/e2e/sw-uebernahme-keine-same-origin-anfrage.spec.js`,
lokaler HTTP-Server statt `file://` — der Worker registriert nur auf einem echten Origin) stellt
nach dem Laden KEINE same-origin-Anfrage mehr.** Depot anlegen, vier Sektoren navigieren, ein Feld
setzen, PDF erzeugen, JSON-Export, Sub-Depot anlegen/entsiegeln/betreten/verlassen — 0 Anfragen
nach der Ladegrenze, gegen eine Positivkontrolle mit 6 Anfragen davor (Gegenprobe: der Zähler ist
nicht blind, eine spätere Null beweist damit etwas).

**Automatisierte `[Negativprobe]` in derselben Datei — mit einer eigenen Lehre.** Der erste Versuch
injizierte `fetch('./vivodepot.html')` nach der Ladegrenze und erwartete, dass der Zähler sie
findet — die Probe blieb fälschlich grün aus dem falschen Grund: die CSP der Seite
(`connect-src 'none'`, bereits unabhängig als ausnahmslos dokumentiert in
U2-ADR-182s Nachtrag „Kein `fetch()`") blockt jeden `fetch()`/XHR aus der Seite heraus VOLLSTÄNDIG,
bevor überhaupt eine Netzwerkanfrage entsteht. Ein `fetch()`-Mutant scheitert an der CSP der Seite,
nicht am Zähler — er hätte fälschlich „Zähler blind" gemeldet. Korrigiert auf eine `<img>`-Ladung
(`img-src 'self'` erlaubt same-origin, das Bild muss nicht existieren, der Request-Event zählt):
damit schlägt die Probe jetzt aus dem richtigen Grund an.

**Zusätzliche, unabhängige Stütze desselben Befunds, kein Ersatz für die Messung:** weil
`connect-src 'none'` ausnahmslos gilt, kann die Seite selbst nach der Übernahme strukturell KEIN
`fetch()`/XHR mehr auslösen, same-origin oder nicht — unabhängig vom Sitzungsinhalt. Das deckt
nicht jeden Anfrage-Kanal (ein `<img>`/`<script>`-Element bliebe erlaubt, s. Negativprobe oben),
aber genau den Kanal, über den die App selbst ihre Daten normalerweise nachladen würde. Die
Messung oben bleibt der eigentliche Beleg — sie zählt JEDEN Anfrage-Typ, nicht nur `fetch()`.

```konformitaet
aussage:  Ein bereits geladener Tab stellt nach dem Laden keine same-origin-Anfrage mehr — ein Tab,
          den ein neuer Worker übernimmt, hat nichts mehr nachzuladen, es kann kein alter Code
          gegen neue Dateien laufen.
zustand:  geprüft
herkunft: gemessen, 01.09.2026 (breite Sitzung: anlegen, 4 Sektoren, PDF, Export, Sub-Depot rein/raus)
pruefung: tests/e2e/sw-uebernahme-keine-same-origin-anfrage.spec.js#ein bereits geladener Tab stellt nach dem Laden keine same-origin-Anfrage mehr — über eine breite Sitzung (PDF, Export, Sub-Depot)
```

---

*Vivodepot GmbH · Berlin · 01.09.2026*
