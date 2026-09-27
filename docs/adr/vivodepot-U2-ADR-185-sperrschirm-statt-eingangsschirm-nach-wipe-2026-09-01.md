# U2-ADR-185: Sperrschirm statt Eingangsschirm nach dem Hintergrund-Wipe

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** SICHERHEIT, UX
**Linie:** U2
**U2-Bezug:** U2-ADR-184 (Vorgänger — schließt DIE EINE dort ausdrücklich offen gelassene Frage:
„der Eingangsschirm nach dem Wipe erklärt sich nicht", Abschnitt Konsequenzen, Absatz 1). Berührt
NICHT die zweite, davon ausdrücklich getrennte offene Frage aus demselben Abschnitt (ob auch
`vorschauVerwerfenUndZuhause()`, Punkt 7 dort, eine Erklärung bräuchte) — die bleibt offen, siehe
„Ausdrücklich nicht behandelt" unten. Präzisiert außerdem eine Formulierung aus U2-ADR-103 (Teil
1, Teardown-Garantie) — siehe dort der neu gefasste Absatz an `_depotSpeicherZuruecksetzen()`.
**Anker:** Bauauftrag, 01.09.2026, freigegeben. Auslöser: der U2-ADR-184-Zustand
wurde selbst erlebt, mit dem wörtlichen Befund „alles ist weg", obwohl
gemessen nichts gelöscht war (der Wipe fasst keinen persistenten Speicher an). Die vorgegebene
Konvention, wörtlich: „zurückkommen und kurz Passwort eingeben und dann an der Stelle weitermachen
… wie das Fenster einer Bank."
**Status heute:** gilt — Beleg `tests/wiedereintritt-nach-wipe.test.js`,
`tests/e2e/hintergrund-wipe-sperrschirm.spec.js`.

---

## Kontext

U2-ADR-184 löste den DOM-Teil des Sub-Depot-Klick-Freeze: `_hintergrundWipeVielleicht()`
(`vivodepot.html:30551`) räumt Speicher UND Bildschirm zuverlässig. Was blieb, ist eine eigene,
in jener ADR selbst benannte Lücke (Abschnitt Konsequenzen): der danach gezeigte Bildschirm ist
`renderWelcome()` — derselbe Erstbesucher-Schirm wie beim allerersten App-Start. Er unterscheidet
nicht zwischen „Sie sind zum ersten Mal hier" und „Ihre Sitzung wurde nach 30 Minuten Hintergrund
automatisch geschlossen, Ihre Datei ist unverändert". Eine Bürgerin mitten in der Arbeit sieht
eine makellose Startseite ohne Erklärung, warum sie wieder am Anfang steht.

**Der Bildschirm existierte bereits.** `renderCryptoOverlay(vorbelegteDatei, internModus)`
(`vivodepot.html:29148`) ist der reguläre Wieder-Eintritt für ein bestehendes Depot: Passwortfeld,
Öffnen-Knopf, Rückweg „Doch neu anfangen" (`co-neu`), und im `internModus` (kein Datei-Picker)
bereits der Satz „Ihr Vivodepot ist auf diesem Gerät gespeichert." Der Wipe rief ihn nur nicht —
er rief `renderWelcome()`. Kein neuer Bildschirm war nötig, nur der richtige Aufruf.

**Zwei Folgefragen ergaben sich sofort aus dem Auftrag, nicht aus dem Code allein:**

1. `renderCryptoOverlay(null, internModus)` mit `internModus === true` setzt intern
   `_internEintritt = true` — der bisherige Weg dahinter (`cryptoOverlayOeffnen()`,
   `vivodepot.html:29316`) kannte nur EINE Quelle für „Depot ohne Datei öffnen": den internen
   IndexedDB-Stand (`depotAusIdbLaden`). Ein aus einer DATEI geöffnetes Depot hat aber KEINEN
   internen Stand — ohne eine zweite Quelle würde die Bürgerin nach dem Wipe zurück auf den
   Datei-Auswahl-Schirm geworfen und müsste ihre `.vivodepot`-Datei erneut suchen. Das wäre kein
   Bankfenster mehr, sondern wieder ein Neuanfang, nur mit einem höflicheren Wortlaut.
2. Der Reset (`_depotSpeicherZuruecksetzen()`, `vivodepot.html:30499`) stellt `aktiveAnsicht`
   und `aktiverSektorId` auf den Standard zurück. Ohne eigenes Zutun landet die Bürgerin nach
   richtigem Passwort also IMMER am Anfang, nicht dort, wo sie war — genau das Gegenteil von
   „an der Stelle weitermachen".

Beide Fragen beantwortet dieselbe Konstruktion: siehe Entscheidung.

## Entscheidung

**1 — Der Wipe zeigt `renderCryptoOverlay(null, internModus)` statt `renderWelcome()`.**
`internModus` wird gemessen an `!!_gehaltenerUmschlag` (s. Stück 3) — SYNCHRON, ohne einen
zweiten, asynchronen IndexedDB-Blick, weil `_hintergrundWipeVielleicht()` selbst nicht async ist
und ein Umbau dazu ein größerer, hier nicht gewollter Eingriff in einen sicherheitskritischen
Pfad wäre (s. Verworfene Alternative). Über dem Passwortfeld steht — NUR hier, nie beim
regulären Öffnen über denselben Schirm — der abgenommene Satz:

> DE: „Ihr Depot wurde geschlossen, weil Vivodepot eine halbe Stunde lang nicht zu sehen war.
> Es ist nichts verlorengegangen."
> EN: „Your Vivodepot was closed because it had not been visible for half an hour. Nothing has
> been lost."

Wortlaut abgenommen, nicht umformulierbar: „nicht zu sehen" statt „im Hintergrund" ist Absicht;
„nicht benutzt" wäre sachlich falsch — der Auslöser ist Hintergrund, nicht Untätigkeit (U2-ADR-184
Punkt 2). Kein Name, kein Foto, kein Feldwert, kein Depot-Name auf dem Schirm — er existiert, WEIL
alles geräumt wurde. Über `vorDepotText()`, wie jeder Vor-Depot-Text: neuer Schlüssel
`wipeSperrschirmHinweis` in `STRINGS`/`_STRINGS_EINGEBAUT` (`vivodepot.html:4338`),
`TEXTSATZ_EINGEBAUT` (`vivodepot.html:7973`) UND `PRE_DEPOT_EN` (`vivodepot.html:10209`) — UND
in `tools/textsatz-en-vollabdeckung-daten.js` (dieselbe englische Fassung noch einmal). Eine
erste Fassung dieser Entscheidung ließ Letzteres bewusst weg, mit der Begründung, der Satz
erscheine ausschließlich auf dem Vor-Depot-Schirm, den das signierte Sprachmodul praktisch nie
erreicht. Das ist zwar richtig, aber KEIN anerkannter Ausnahmegrund:
`tests/textsatz-en-modul-erzeugen.test.js` verlangt ausdrücklich ALLE `TEXTSATZ_EINGEBAUT`-
Kennungen ohne Ausnahme, unabhängig von Erreichbarkeits-Überlegungen — genau diese Art von
Begründung ist die Klasse Lücke, die die Probe verhindern soll. Berichtigt, bevor sie in den
Bestand ging (s. Bericht). Der Rückweg „Doch neu anfangen" (`co-neu`) bleibt erreichbar und
VERWIRFT dabei bewusst alles unten Gehaltene (Stück 3).

**2 — Die Navigations-Stelle wird gemerkt und nach richtigem Passwort wieder angefahren.**
`_stelleLesen()` (`vivodepot.html:30462`) liest VOR dem Reset Ansicht/Sektor/Situation/
Wizard-Schritt in reine Kennungen (keine Objekte aus `data`). `_stelleNachWiedereintrittAnfahren()`
(`vivodepot.html:30481`) fährt sie NACH `betreteApp()` wieder an — und prüft dabei JEDE Angabe
GEGEN den gerade geladenen Bestand, statt sie zu glauben: ein Bereich kann seit dem Wipe fehlen
(anderes Depot, abgemeldetes Bereichs-Modul), ein Wizard-Schritt kann unsichtbar geworden sein.
Fehlt die Deckung, fällt die Funktion still auf den ohnehin schon gesetzten Standard zurück, statt
zu werfen — das ist der Fall, der in der Praxis zuerst auffällt (Positivkontrolle unten). Ansichten
ohne eigenen, nebenwirkungsfreien Einstieg (Mappe, Prüftermine, Übergabe-Protokoll, Anfrage …)
werden bewusst NICHT wiederhergestellt: ein halb angefahrener Weg wäre schlechter als der
Bereichs-Standard.

**3 — Der verschlüsselte Umschlag wird gehalten**, ausdrücklich freigegeben, damit auch ein aus
einer DATEI geöffnetes Depot nach dem Wipe nur das Passwort braucht (Kontext, Frage 1). Drei
Halter, ALLE nur im Arbeitsspeicher, kein `localStorage`, kein `sessionStorage`, kein
IndexedDB-Schreiben — ein Neuladen der Seite löscht sie restlos:

- `_gehaltenerUmschlag` — der zuletzt GELADENE oder GESCHRIEBENE Umschlag (Chiffrat + die
  Parameter, die zum Aufschließen nötig sind). Warum das keine Aufweichung der Teardown-Garantie
  ist: Chiffrat ohne Schlüssel ist Rauschen, und der Schlüssel ist genau das, was der Wipe räumt.
  Dieselbe Datei liegt ohnehin auf der Platte — ein Angreifer bekäme dort dasselbe Chiffrat.
  Nachgezogen an drei Stellen, nicht nur beim ersten Mal: `depotLaden()` (`vivodepot.html:16590`,
  Zeile 16617 — der eine Trichter hinter allen drei Öffnen-Wegen), `depotHerunterladen()`
  (`vivodepot.html:16972`, Zeile 16975) und `depotInIdbSichern()` (`vivodepot.html:17374`, Zeile
  17377). Eigener Befund (aus einem verworfenen früheren Anlauf mitgenommen und hier
  geprüft): ein NUR beim ersten Speichern gehaltener Umschlag wäre nach dem zweiten Speichern
  ÜBERHOLT — der Wipe hielte dann den alten Stand, und „Es ist nichts verlorengegangen" wäre still
  falsch. Test dafür unten, eigens benannt.
- `_wipeStelle` — die reine Navigations-Stelle aus Stück 2. Keine Inhalte.
- `_wipeErklaerungZeigen` — ob der Satz aus Stück 1 steht. Wird von `betreteApp()`
  (`vivodepot.html:30852`) verbraucht, sobald jemand drin ist.

**Was bewusst NICHT zusätzlich gehalten wird: die Salts.** Der Umschlag trägt sie bereits selbst
(`pbkdf2.salt`, `depotSalt`, `depotUUID`); sie daneben noch einmal zu halten wäre ein zweites
Stück ohne Zugewinn. `depotLaden()` liest sie beim Öffnen aus dem Umschlag, wie bei jeder Datei
auch — das ist das Minimum.

**Was unverändert VOLLSTÄNDIG geräumt wird** (nichts vom Passwort Abgeleitetes bleibt liegen):
`data`, `_ankerData`, `sessionSubKeys` (Schlüssel UND entschlüsselter Sub-Inhalt),
`sessionHkdfKey`, `sitzungsAkteur`, `_ankerAkteur`, `aktiverSubKontext` — unverändert Teil des
Resets in `_depotSpeicherZuruecksetzen()`.

**Immer der ANKER, nie ein Sub-Inhalt.** `depotLaden()` wird für einen Sub-Kontext nie aufgerufen
(der betritt über `subKontextBetreten()`, das `data` direkt aus bereits entsiegelten
Session-Schlüsseln setzt, ohne Umschlag). Beide Schreib-Stellen (`depotInDateiSichern()`,
`depotInternSichern()`) swappen im Sub-Kontext `data` selbst kurz auf `_ankerData`, bevor sie
serialisieren (bestehende Choreografie, unverändert) — der Umschlag, der bei `_umschlagMerken()`
ankommt, ist also immer der Anker-Umschlag, geprüft gegen den aktuellen Code, nicht nur behauptet.

**4 — `internModus` wird aus `!!_gehaltenerUmschlag` bestimmt, nicht aus einer eigenen
IndexedDB-Abfrage.** Begründung und verworfene Alternative dazu im nächsten Abschnitt.

## Verworfene Alternative

**`internModus` über einen eigenen `await internerStandVorhanden()`-Aufruf bestimmen**, statt über
den synchronen `_gehaltenerUmschlag`-Halter. Läse sich zunächst direkter — „liegt ein Depot auf
dem Gerät" ist wörtlich, was die Frage stellt. Verworfen aus zwei Gründen: erstens macht das
`_hintergrundWipeVielleicht()` selbst async, eine Funktion, die heute synchron aus einem
`visibilitychange`-Listener läuft — ein größerer, hier nicht beauftragter Eingriff in einen
Sicherheitspfad, dessen Zeilen seit U2-ADR-103 einzeln begründet sind. Zweitens ist die Prämisse
bei genauem Hinsehen nicht dieselbe Frage: relevant ist nicht „liegt irgendein Depot auf dem
Gerät", sondern „gibt es einen Stand, zu dem DIESE Sitzung zurückkehren kann" — und dafür ist
`_gehaltenerUmschlag` das genauere Maß, weil es nur dann leer ist, wenn in dieser Sitzung nie
geladen oder gespeichert wurde. Ein Depot, das noch nie gespeichert wurde, hat ohnehin
`_ungespeicherteAenderungen > 0` und lässt den Wipe gar nicht erst zu (Politik A, U2-ADR-103) —
der einzige Fall, in dem `_gehaltenerUmschlag` bei einem tatsächlich ausgelösten Wipe leer wäre,
ist der, in dem es auch nichts gäbe, wohin zurückzukehren wäre. Geprüft, nicht nur angenommen:
`tests/wiedereintritt-nach-wipe.test.js` lässt jeden Wipe-Test über einen echten
`depotInternSichern()`-Aufruf laufen, nicht den rohen `depotInIdbSichern()` — eine erste Fassung
dieser Datei nutzte Letzteres und maß dadurch unbeabsichtigt einen Zustand, in dem der Wipe
mangels zurückgesetztem Änderungszähler gar nicht auslöste (s. Bericht).

## Ausdrücklich nicht behandelt

Zwei Fundstellen aus U2-ADR-184 bleiben unverändert offen, absichtlich nicht in diesen Auftrag
gezogen:

- **Ob `vorschauVerwerfenUndZuhause()` (U2-ADR-184 Punkt 7) ebenfalls eine Erklärung bräuchte.**
  Andere Ausgangslage: eine bewusste Nutzer-Entscheidung nach ausdrücklicher Warnung, keine
  automatische Zeitsperre — die Bürgerin hat gerade selbst „Vorschau verlassen" bestätigt.
  U2-ADR-184 selbst nennt das ungeprüft, keine Antwort; dieser ADR beantwortet es weiterhin nicht.
- **`zeigeSchlussSicht()` (`vivodepot.html:30590`, U2-ADR-184-Fund) räumt `#content` beim
  gewöhnlichen App-Schließen nicht.** Von U2-ADR-184 selbst als „größerer Befund … eigener,
  wacher Zug" benannt und zurückgestellt. Diese ADR berührt weder die Funktion noch ihren
  Aufrufer.

## Konsequenzen

Der Bruch zwischen „Speicher weg" und „Bildschirm zeigt trotzdem alles" (U2-ADR-184s eigentlicher
Anlass) ist jetzt an beiden benannten Stellen — Bildschirm UND Erklärung — geschlossen, für den
Hintergrund-Wipe. Rest-Exposition bleibt exakt, was U2-ADR-184 schon benannte: ein verschlüsselter
Umschlag ohne Schlüssel, für sich genommen wertlos, liegt jetzt bewusst länger im RAM als bisher
(vorher: bis zum nächsten Laden/Speichern; jetzt: zusätzlich über einen Wipe hinweg, bis „Doch neu
anfangen" oder ein neues Laden ihn ablöst). Kein neues Geheimnis, keine neue Angriffsfläche für
jemanden ohne Passwort.

Ungeprüft: ob ein Gerätewechsel (dieselbe `.vivodepot`-Datei, anderes Gerät, kein interner Stand
UND kein `_gehaltenerUmschlag`, weil diese Sitzung nie geladen hat) sich für die Bürgerin richtig
anfühlt — dort zeigt der Wipe (wenn er dort überhaupt greifen könnte, s. Politik-A-Vorbedingung)
korrekt `internModus = false`, den Datei-Auswahl-Schirm. Das ist der bereits vor diesem ADR
bestehende, unveränderte Datei-Öffnen-Weg, kein neuer Zustand.

## Konformität

```konformitaet
aussage:  Nach einem Hintergrund-Wipe zeigt der Sperrschirm (renderCryptoOverlay) das Passwortfeld
          und NICHT den Erstbesucher-Schirm (renderWelcome).
zustand:  geprüft
herkunft: invariante
pruefung: tests/wiedereintritt-nach-wipe.test.js#nach dem Wipe zeigt der Schirm das Passwortfeld
```

```konformitaet
aussage:  Der abgenommene Erklärungssatz steht NUR nach einem Wipe auf dem Sperrschirm, nie beim
          regulären Öffnen über denselben Schirm.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wiedereintritt-nach-wipe.test.js#der erklärende Satz steht NUR nach dem Wipe
pruefung: tests/wiedereintritt-nach-wipe.test.js#derselbe Sperrschirm beim REGULÄREN Öffnen
```

```konformitaet
aussage:  Der gehaltene Umschlag ist nach JEDEM Speicherweg nachgezogen, nicht nur nach dem
          ersten — ein überholter Umschlag würde „nichts ist verlorengegangen" still verletzen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wiedereintritt-nach-wipe.test.js#NACH JEDEM Speichern nachgezogen
```

```konformitaet
aussage:  Die Navigations-Stelle wird vor dem Reset gemerkt und nach richtigem Passwort wieder
          angefahren; eine seither verschwundene Stelle fällt still auf den Standard zurück,
          statt den Wiedereintritt zum Absturz zu bringen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wiedereintritt-nach-wipe.test.js#die Navigations-Stelle wird gemerkt
pruefung: tests/wiedereintritt-nach-wipe.test.js#verschwundene Stelle
```

```konformitaet
aussage:  Der Rückweg "Doch neu anfangen" verwirft den gehaltenen Umschlag, die Stelle und den
          Erklärungs-Merker vollständig.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wiedereintritt-nach-wipe.test.js#Rückweg "Doch neu anfangen"
```

```konformitaet
aussage:  Nach dem Wipe überlebt nichts vom Passwort Abgeleitetes — ein falsches Passwort gegen
          den gehaltenen Umschlag scheitert weiterhin, ein richtiges öffnet wieder dasselbe Depot.
zustand:  geprüft
herkunft: invariante
pruefung: tests/wiedereintritt-nach-wipe.test.js#falsches Passwort scheitert weiterhin
pruefung: tests/wiedereintritt-nach-wipe.test.js#der gehaltene Umschlag ist entschlüsselbar
```

**Zusätzlich, nicht über eine `konformitaet`-Klausel getrackt** (dieselbe Werkzeuggrenze wie bei
U2-ADR-184: `.spec.js` statt `.test.js`): `tests/e2e/hintergrund-wipe-sperrschirm.spec.js` prüft
im ECHTEN Browser über ein ECHTES `visibilitychange`-Ereignis (nicht per Direktaufruf von
`_hintergrundWipeVielleicht()` — genau dieser Direktaufruf-statt-Ereignis-Unterschied ist es, der
den ursprünglichen U2-ADR-184-Fehler lange unentdeckt ließ) plus virtueller Uhr
(`page.clock`, Playwright ≥1.45): Hintergrund über die Frist hinaus löst den Sperrschirm mit dem
Erklärungssatz aus, richtiges Passwort führt zurück an dieselbe Stelle, und ein voller
Dokument-Scan (wie in `hintergrund-wipe-bildschirm.spec.js`) bestätigt weiterhin keinen
personenbezogenen Wert im Dokument.

---

*Vivodepot GmbH · Berlin · 01.09.2026*
