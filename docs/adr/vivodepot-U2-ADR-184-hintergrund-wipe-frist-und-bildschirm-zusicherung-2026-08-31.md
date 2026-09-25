# U2-ADR-184: Hintergrund-Wipe — Gnadenfrist vor Politik A + Bildschirm-Zusicherung

**Status:** Angenommen
**Datum:** 31.08.2026
**Kategorie:** SICHERHEIT, ARCHITEKTUR
**Linie:** U2
**U2-Bezug:** U2-ADR-103 (Vorgänger — Teardown-Garantie für Schlüsselmaterial und Politik A,
26.07.2026). Diese Entscheidung iteriert NUR den Zeitpunkt von Politik A und ergänzt eine
Bildschirm-Zusicherung, die U2-ADR-103 nie hatte. Die Teardown-Reihenfolge und -Vollständigkeit
aus U2-ADR-103 (erst `data` lösen, dann `sessionSubKeys`/`_ankerData`/`_ankerAkteur`/
`aktiverSubKontext` leeren) gelten unverändert weiter — dafür siehe weiter U2-ADR-103.
**Anker:** Auftrag „Sub-Depot-Klick-Freeze", 31.08.2026 (Friends&Family-Test,
ein Sub-Depot ließ sich nicht öffnen) · live gemessen gegen `u2-kanon` HEAD (`data`/`ankerDaten()`
null bei sichtbar offenem Depot, Fußstempel).
**Status heute:** gilt — Beleg `tests/hintergrund-wipe-frist.test.js`,
`tests/e2e/hintergrund-wipe-bildschirm.spec.js`.

---

## Kontext

**Der Fund, der zur Iteration führte, war kein Sub-Depot-Bug.** Ein bestehendes Sub-Depot ließ
sich nicht öffnen; die Fehlersuche schloss neun Kombinationen aus Version/Engine/Bündel
aus, bevor sich zeigte: `data` und `ankerDaten()` waren null, während der Bildschirm unverändert
die Identitätsansicht mit Name und Foto zeigte. Gemessen: `#content.innerHTML` vor und nach
einem `_hintergrundWipeVielleicht()`-Aufruf war **byte-identisch** (17548 Zeichen). Politik A
(U2-ADR-103) tat genau das, was sie sollte — den Speicher leeren —, aber ihr eigener
Bildschirm-Anspruch (in U2-ADR-103 nie zugesichert, nur im Code-Kommentar behauptet) griff nicht:
`renderWelcome()`s eigener Wächter `if (data && !imVorschau())` (eingeführt 21.07.2026,
Commit `e7deb69`, für die DAMALS einzigen Verlassen-Wege) prüft `data` NACH dem Aufruf — und
`_hintergrundWipeVielleicht()` (erst am 26.07.2026 hinzugekommen, Commit `a2f2d10`, U2-ADR-103)
hatte `data` bereits selbst genullt, bevor es `renderWelcome()` rief. Der Wächter, der die
Aufräumung an genau einer Stelle bündeln sollte, fand sich für „nichts zu tun" zuständig.

**Berichtigung an U2-ADR-103:** dessen Kontext-Absatz sagt: „Die dokumentierte Lücke an
derselben Funktion betrifft den DOM-Teil und wurde am 20.07. geschlossen; das ist eine andere."
Das stimmte für die Verlassen-Wege, die es am 20.07.2026 gab (`geheZuZuhause()` u. a.) — der
Hintergrund-Wipe existierte zu diesem Zeitpunkt noch nicht (er kam erst sechs Tage später, mit
U2-ADR-103 selbst). Der Satz behauptete stillschweigend, die Schließung gelte für JEDEN
künftigen Weg zum Eingangsschirm — U2-ADR-103 hat einen neuen Weg eingeführt, ohne zu prüfen,
ob er dieselbe Garantie trägt. Sie tat es nicht, seit dem Tag ihrer eigenen Einführung.

**Das benannte Spannungsfeld** (wörtlich): „Oma Erna, die rumläuft und die Papiere
zusammensucht, und genervt ist, wenn sie aller 5 Minuten das PW eingeben muss" — gegen die
Rest-Exposition eines offenen Depots. Gemessen (Vier-Punkte-Bericht, 31.08.2026): der
Zähler `_ungespeicherteAenderungen`, an dem Politik A heute allein hängt, schützt nur ein kurzes
Fenster zwischen einer Eingabe und dem nächsten internen Auto-Save (`markiereGespeichert()`) —
über Tage verteiltes, unterbrochenes Arbeiten trifft diesen Schutz fast nie. Der heutige,
fehlerhafte Zustand traf zugleich BEIDE Nachteile ohne den Vorteil: Speicher weg (Rückkehr
verlangt in Wahrheit das Passwort), UND der Bildschirm zeigte die Daten trotzdem unverändert
weiter — kein Schutz, keine Bequemlichkeit.

## Entscheidung

**1 — Eine 30-Minuten-Gnadenfrist vor Politik A**, als benannte Konstante
(`HINTERGRUND_WIPE_FRIST_MS`, `vivodepot.html`), mit Begründungskommentar an der Stelle selbst —
änderbar, ohne den Mechanismus zu verstehen. Produktabwägung: kurz aus dem Zimmer oder in eine
andere App wechseln bleibt folgenlos; ein liegengelassenes/vergessenes Gerät wird binnen einer
halben Stunde kalt.

**2 — Die Uhr läuft NUR im Hintergrund**, nie im sichtbaren Zustand — auch nicht nach Stunden.
Kein Untätigkeits-Timer bei sichtbarem Fenster: Erna, die durchs Zimmer läuft, während das
Fenster vorne liegt, soll nichts merken. Rückkehr innerhalb der Frist bricht die Uhr ab, ohne
sichtbare Wirkung.

**3 — Träger bleibt `visibilitychange → hidden`**, unverändert der in U2-ADR-103 gemessene
zuverlässigste Hintergrund-Melder auf iOS. Die Frist schaltet sich davor, ersetzt ihn nicht.
`pagehide` bleibt ein redundanter, SOFORTIGER, unbedingter zweiter Auslöser — ohne Frist: anders
als ein bloßes Verbergen ist das ein Signal für „die Seite geht wirklich weg" (Tab schließen,
navigieren), eine Gnadenfrist wäre dort kein Schutz, nur eine verpasste Gelegenheit.
`event.persisted` (bfcache-Einfrieren statt echtes Verwerfen) wird weiterhin nirgends geprüft —
geprüft am 31.08.2026: der sofortige, unbedingte `pagehide`-Wipe deckt beide Fälle bereits ab,
ob die Seite danach endgültig verworfen oder eingefroren/zurückgeholt wird, ändert nichts an der
schon getroffenen Wipe-Entscheidung. Es gibt keinen `pageshow`/`persisted`-Handler und braucht
auch keinen dafür.

**4 — Überall gleich, kein Sonderweg fürs Handy.** Punkt 3 deckt das mobile Verhalten bereits ab
(derselbe zuverlässige Träger); zwei Verhaltensweisen wären schwerer zu erklären als eine.

**5 — Wall-Uhrzeit-Nachprüfung bei Rückkehr, zusätzlich zum Timer.** Mobile Betriebssysteme
pausieren JS-Timer in einem hintergründigen Tab oft vollständig (kein Hintergrund-CPU-Budget) —
ein `setTimeout` allein ist damit KEIN verlässlicher Träger für „30 Minuten sind wirklich
vergangen", nur ein Best-Effort im Vordergrund-/Desktop-Fall. `visibilitychange → visible` prüft
deshalb zusätzlich die tatsächlich verstrichene Zeit (`Date.now()` beim Verbergen vs. bei
Rückkehr) und holt ein verpasstes Wipe sofort nach — Erna sieht beim Hinschauen direkt den
Eingangsschirm, nicht erst, wenn ein aufgewachter Timer irgendwann feuert.

**6 — Der Bildschirm-Fix gehört zwingend dazu, nicht in einen späteren Zug.** Ohne ihn wäre die
Frist wirkungslos gegen genau das Symptom, das sie auslöste: nach Fristablauf stünde wieder ein
eingefrorenes Bild da statt eines Eingangsschirms. `_hintergrundWipeVielleicht()` ruft jetzt
selbst `_eingangsschirmDomAufraeumen()` (statt sich auf `renderWelcome()`s inzwischen
wirkungslosen internen Wächter zu verlassen) UND stellt den sichtbaren Zustand selbst her
(`#app`-Klasse `an` entfernen, Willkommens-Overlay öffnen) — denselben Weg, den
`zeigeSchlussSicht()` bereits geht, kein neuer erfunden.

**7 — Zweiter Aufrufer derselben Ursache (Fund eines parallelen Strangs, 01.09.2026, während der Verifikation dieses
ADRs): `vorschauVerwerfenUndZuhause()` trug denselben Defekt.** Punkt 6 (erste Fassung dieses
ADRs) nannte diese Funktion irrtümlich als Beispiel eines bereits korrekten Weges — sie ging in
Wahrheit denselben falschen Weg wie `_hintergrundWipeVielleicht()` vor dem heutigen Fix: sie rief
`_depotSpeicherZuruecksetzen()` VOR `renderWelcome()`, wodurch dessen Wächter
`if (data && !imVorschau())` `data` bereits genullt sah und nie feuerte. Betroffen ist der
„Vorschau verlassen"-Weg (passwortlose Eingabe verwerfen, Klick auf „Trotzdem verwerfen" im
D2-Warn-Modal bzw. `#w-anfangen` → Logo/Sidebar-Rückweg ohne gesetztes Passwort) — Tragweite
geringer als beim Hintergrund-Wipe (nur Vorschau-Daten vor der Passwort-Vergabe, kein
Sub-Kontext, `imVorschau()` und `imSubKontext()` schließen sich aus), aber dieselbe Ursache.
Gleicher Einzeiler: `_eingangsschirmDomAufraeumen()` wird jetzt direkt aus
`vorschauVerwerfenUndZuhause()` gerufen, statt sich auf den Wächter zu verlassen.

Ausdrücklich NICHT mitgeprüft/mitbehoben, als eigener, benannter Befund offen stehen
gelassen: `flowAppSchliessen()` → `flowTrotzdemSchliessen()` → `zeigeSchlussSicht()`
(`vivodepot.html:30497/30590`). `zeigeSchlussSicht()` rührt `#content` nie an und ruft
`_eingangsschirmDomAufraeumen()` nirgends — der Alltagsweg (normales Schließen bei sauberer,
gespeicherter Sitzung, ohne Warndialog) hinterlässt vollen Sektorinhalt im DOM, nur durch
`#app{display:none}` verdeckt. Größerer Befund als Punkt 7 (anderer Bildschirm-Weg, andere
Funktion, keine Testabdeckung) — gehört in einen eigenen, wachen Zug, nicht in diese
Nacht-Verifikation hineingezogen.

## Verworfene Alternative

**Wipe nur bei `pagehide`, `visibilitychange` als Träger ganz entfernen.** Träfe den Produktwunsch scheinbar am direktesten (Tab-Wechsel wäre grundsätzlich folgenlos, nicht nur binnen 30 Minuten).
Verworfen an einer gemessenen Eigenschaft von iOS: dort feuert beim bloßen App-Wechsel (Home-
Taste, zu einer anderen App wechseln) häufig NUR `visibilitychange`, NICHT `pagehide` — das ist
der historische, in U2-ADR-103 bereits gemessene Grund, warum `visibilitychange` überhaupt der
Hauptträger ist, nicht nur eine Bequemlichkeit. Ein liegengelassenes oder gestohlenes Telefon
bliebe unter dieser Alternative unbegrenzt eingeloggt, bis die Seite aktiv geschlossen wird —
keine Gnadenfrist, kein Schutz danach. Sollte diese Alternative künftig erneut erwogen werden:
dieser Grund gehört zuerst geprüft, nicht wiederholt neu gemessen.

## Konsequenzen

Ein Depot im Hintergrund ist weiterhin irgendwann kalt — nur nicht mehr sofort. Innerhalb von
30 Minuten Hintergrund bleibt alles im RAM (Rest-Exposition, wie schon in U2-ADR-103 für offene
Änderungen benannt, jetzt zusätzlich für die ersten 30 Minuten unabhängig vom Änderungs-Zähler).
Danach bleibt exakt der U2-ADR-103-Zustand: vollständiger Reset, Rückkehr verlangt das Passwort —
und JETZT auch tatsächlich einen Eingangsschirm, nicht ein eingefrorenes Bild.

Ungemessen (wie schon in U2-ADR-103): ob `visibilitychange → hidden` in der installierten PWA so
zuverlässig feuert wie im Safari-Tab.

**Offene Frage (01.09.2026), nicht beantwortet:** der Eingangsschirm,
den `renderWelcome()` (`vivodepot.html:28972`) nach einem Hintergrund-Wipe zeigt
(Aufrufer `_hintergrundWipeVielleicht()`, `vivodepot.html:30394`), ist derselbe wie beim
allerersten Aufruf der App — er unterscheidet nicht zwischen „Sie sind zum ersten Mal hier" und
„Sie wurden nach 30 Minuten Inaktivität automatisch abgemeldet, Ihre Datei ist unverändert".
Eine Bürgerin, die mitten in der Arbeit war und zurückkehrt, sieht eine makellose Startseite ohne
Erklärung, warum sie wieder am Anfang steht. Dieser ADR regelt, WAS geräumt wird, nicht ob die
Rückkehrende erfährt, warum — die Beschlusslage dazu, ob und mit welchem Wortlaut das gesagt
werden sollte, steht noch aus.

Am zweiten Aufrufer, `vorschauVerwerfenUndZuhause()` (`vivodepot.html:30474`, Punkt 7), liegt
dieselbe Beobachtung anders: das Verwerfen dort ist eine bewusste Nutzer-Entscheidung nach
ausdrücklicher Warnung (`flowSchliessenWarnung`), keine automatische Zeitsperre — die Bürgerin hat
gerade selbst „Vorschau verlassen" bestätigt und weiß bereits, was geschieht. Vermutlich nicht
dieselbe Dringlichkeit wie beim Hintergrund-Wipe, aber ungeprüft — auch das eine offene Frage,
keine Antwort.

## Konformität

```konformitaet
aussage:  Kehrt die Seite innerhalb der 30-Minuten-Frist aus dem Hintergrund zurück, wird NICHT
          gewipt — weder Speicher noch Bildschirm ändern sich.
zustand:  geprüft
herkunft: invariante
pruefung: tests/hintergrund-wipe-frist.test.js#innerhalb der Frist zurück → kein Wipe
```

```konformitaet
aussage:  Bleibt die Seite über die 30-Minuten-Frist hinaus im Hintergrund (Wall-Uhrzeit-
          Nachprüfung bei Rückkehr — der verlässlichere der beiden Träger, s. Entscheidung
          Punkt 5), wird vollständig gewipt — sofern nichts Ungespeichertes offen ist.
          Ersetzt/verschärft die dritte Klausel aus U2-ADR-103 („wird vollständig gewipt" ohne
          Frist). Die Grenze selbst (exakt 30:00) zählt bereits als abgelaufen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/hintergrund-wipe-frist.test.js#nach Ablauf der Frist im Hintergrund → vollständiger Wipe
pruefung: tests/hintergrund-wipe-frist.test.js#genau an der 30-Minuten-Grenze zählt bereits als abgelaufen
```

```konformitaet
aussage:  Nach einem ausgelösten Hintergrund-Wipe ist #content geleert und `getData()` liefert
          null — kein Klartext-Rest im Node-Kern-Harnisch messbar.
zustand:  geprüft
herkunft: invariante
pruefung: tests/hintergrund-wipe-frist.test.js#nach Ablauf der Frist im Hintergrund → vollständiger Wipe
```

**Zusätzlich, nicht über eine `konformitaet`-Klausel getrackt** (das Bindungswerkzeug
`tests/pruefstand-bindung.js` liest nur `.test.js`-Rümpfe, keine Playwright-`.spec.js`-Dateien —
kein Konventionsbruch, sondern eine Werkzeuggrenze): `tests/e2e/hintergrund-wipe-bildschirm.spec.js`
prüft im ECHTEN Browser die eigentlich verlangte, weitere Aussage — NIRGENDS im ganzen Dokument
(`document.documentElement.outerHTML`, jeder `input`/`textarea`-Wert, `document.title`) bleibt
nach dem Wipe ein personenbezogener Wert stehen, mit vier eingepflanzten, unverwechselbaren
Marken (Vorname, Nachname, Telefonnummer, ein Bild als `data:`-URL). Das ist das eigentliche
Produktabnahmekriterium; die Klausel oben ist die schwächere, aber maschinell an einen tatsächlichen
Funktionsaufruf gebundene Teilaussage. Ein dritter Test in derselben Datei prüft dieselbe Aussage
für Punkt 7 (`vorschauVerwerfenUndZuhause()`): eine markierte Vorschau-Angabe verschwindet
vollständig aus dem Dokument, der Eingangsschirm erscheint.

---

*Vivodepot GmbH · Berlin · 31.08.2026*
