# U2-ADR-208: Eine Sprachkennung ohne eigene Modul-Regel fällt auf die aktive Sprache zurück, nicht auf Deutsch

**Status:** Angenommen
**Datum:** 02.09.2026
**Kategorie:** KORREKTHEIT, BARRIEREFREIHEIT
**Linie:** U2
**U2-Bezug:** Nachtrag „Alles modular und anpassbar" (17.08.2026, Commit `3c5fbfa`) führte
`textsatzSprachkennungAnwenden()`/`textsatzRegeln().sprachkennung` ein — dieser ADR korrigiert
deren Rückfallwert, führt keinen neuen Mechanismus ein. U2-ADR-207 (Vor-Depot-Sprachmodul
übersteht fremdes Depot, 02.09.2026) löste eine benachbarte, aber andere Lücke an derselben
Registry.
**Anker:** Zwischenauftrag vom 02.09.2026 (Frage: übersteht ein in der englischen
Modul-App angelegtes Depot das Öffnen in der deutschen Wurzel-App?). Live gemessen am
tatsächlich ausgelieferten Englisch-Modul (v495, echter HTTP-Server, dekodiertes Overlay) —
nicht nur gelesen.
**Status heute:** gilt — Beleg `tests/textsatz-mechanismus.test.js` (drei neue Proben, davon
eine Rot-Beweis gegen eine mutierte Kern-Kopie).

---

## Kontext

Eine Prüferin (IHE-Umfeld) sieht die englische Modul-App an. Gemessen wurde, was mit einem in
dieser App angelegten Depot beim Öffnen in der deutschen Wurzel-App geschieht — Anlass war ein
Zwischenauftrag, keine eigene Fragestellung.

**Zug 0 zu einem separat gemeldeten Befund** (paralleler Strang, derselbe Tag): `document.documentElement.lang`
blieb auf einer englischen Oberfläche bei `"de"` stehen — ein Screenreader kündigt englischen
Text mit deutscher Aussprache an (WCAG 3.1.1). Der erste Zug-0-Befund lautete „nirgends
angefasst" — das war UNVOLLSTÄNDIG: die Suche prüfte nur `documentElement.lang = …`, nicht
`setAttribute('lang', …)`. Ein Mechanismus existiert bereits, seit dem 17.08.2026:
`textsatzSprachkennungAnwenden()` (`vivodepot.html:9840`) schreibt `textsatzRegeln().sprachkennung`
in den `lang`-Attributwert, an allen drei legitimen Aufrufstellen (`depotLaden`,
`_alleModulRegisterAusDepotAnmelden`, `vorDepotKonfigurationAnwenden` — bewacht durch die
Paar-Prüfung in `tests/textsatz-mechanismus.test.js`, Zeile 684 ff.).

**Der eigentliche Fehler sitzt eine Ebene tiefer, in `textsatzRegeln()` (`vivodepot.html:9805`):**
`sprachkennung` kommt aus `modul._regeln`, dem Regel-Kopf des jeweils aktiven Sprachmoduls. Das
tatsächlich ausgelieferte englische Modul (`module-apps/englisch`, v495) trägt `_regeln: {}` —
ein leeres Objekt, kein `sprachkennung`-Eintrag. Ohne einen expliziten Modul-Wert fiel die
Funktion auf `TEXTSATZ_REGELN_EINGEBAUT.sprachkennung` zurück — fest verdrahtet `'de-DE'`,
unabhängig davon, welche Sprache tatsächlich aktiv ist. Live gemessen: `textsatzSpracheAktiv()`
korrekt `'en'`, `textsatzRegeln().sprachkennung` trotzdem `'de-DE'`.

**Reichweite:** betrifft nicht nur Englisch. Jedes Sprachmodul, dessen `_regeln` unvollständig
ist oder ganz fehlt (der bestehende Test „ein Modul ohne Kopf gilt weiter" belegt, dass ein
Modul ohne jede Regel gültig bleibt), erbte bislang stillschweigend den deutschen
Sprachkennungs-Rückfall — die sichtbare Übersetzung konnte korrekt sein, während die für
Vorleseprogramme und Suchmaschinen maßgebliche Angabe es nicht war.

## Entscheidung

**`textsatzRegeln()` setzt die aktive Sprachkennung als Grundwert, sobald ein Modul für die
aktive Sprache gefunden wurde — bevor die eigenen Regeln dieses Moduls (falls vorhanden) sie
präzisieren:**

```js
const modul = (rechtsraum && nachSprache[rechtsraum]) || nachSprache[''];
raus.sprachkennung = sprache;
if (modul && modul._regeln) Object.assign(raus, modul._regeln);
```

Zwei Fälle bleiben unverändert:
- **Kein Modul für die aktive Sprache** (`nachSprache` nicht gefunden): unverändert der volle
  eingebaute Rückfall (`TEXTSATZ_REGELN_EINGEBAUT`), keine Zeile dieser ADR wird erreicht.
- **Ein Modul MIT eigener `sprachkennung`**: die Modul-Regel gewinnt weiterhin — `Object.assign`
  läuft nach der neuen Zeile und überschreibt den bloßen Sprachcode mit der genaueren Angabe
  (z. B. `ar-EG` statt bloß `ar`), unverändert gegenüber dem bisherigen Verhalten.

**Wirkt sofort auf das bereits ausgelieferte englische Modul** — kein Signierlauf nötig, weil
die Änderung im KERN sitzt, nicht in signierten Modul-Daten (anders als eine Korrektur der
Modul-eigenen `_regeln` selbst, die den nächsten Signierlauf bräuchte und den aktuell verteilten
Link nicht erreichte).

## Verworfene Alternative

**Ein neuer, paralleler Sync-Mechanismus** (`document.documentElement.lang = textsatzSpracheAktiv()`,
aufgerufen aus `textsatzNeuAnwenden()`) — der erste Entwurf dieser ADR. Verworfen, nachdem die
Existenz von `textsatzSprachkennungAnwenden()` erst NACH dem ersten Entwurf gefunden wurde: zwei
Mechanismen, die dasselbe Attribut an überlappenden Aufrufstellen setzen, liefen gegeneinander
(wer zuletzt läuft, gewinnt) und hätten die bestehende, genauere Sprachkennung (Region, z. B.
`ar-EG`) durch den bloßen Sprachcode ersetzt. Die schmalere Änderung korrigiert den vorhandenen
Mechanismus an seiner einen echten Lücke.

## Zweiter, unabhängiger Fund — der Vor-Depot-Umschalter

Der Willkommensschirm trägt einen ZWEITEN, vom oben beschriebenen Mechanismus komplett
unabhängigen Sprachweg: `_vorDepotSprache`/`vorDepotText()`/`PRE_DEPOT_EN` (reiner
Laufzeit-Zustand, kein `data`, kein Modul). Der Umschalt-Knopf (`vorDepotSpracheUmschalten()`,
`vivodepot.html:10288`) rührte `document.documentElement.lang` nie an — dieser Pfad läuft nie
durch `textsatzRegeln()`/`textsatzSprachkennungAnwenden()`, darum korrigiert ihn diese ADR nicht
mit, sondern trägt einen eigenen, direkten Sync-Aufruf:

```js
function vorDepotSpracheUmschalten() {
  _vorDepotSprache = (_vorDepotSprache === 'en') ? 'de' : 'en';
  document.documentElement.lang = _vorDepotSprache;
}
```

## Konsequenzen

**Für die Bürgerin/Prüferin:** ein Vorleseprogramm kündigt englischen Text ab jetzt mit
englischer Aussprache an, unabhängig davon, ob das aktive Sprachmodul eine eigene
`sprachkennung`-Regel mitbringt — der Regelfall (kein Modul erklärt jede mögliche Regel) ist
jetzt korrekt statt zufällig richtig nur bei vollständigen Modulen.

**Für den nächsten Bau:** ein neues Sprachmodul MUSS keine `sprachkennung` mehr deklarieren, um
`lang` korrekt zu setzen — der bloße Sprachcode ist ein sicherer Grundwert. Eine Region-genauere
Angabe (z. B. `en-GB` für ein britisches Rechtsraum-Modul) bleibt möglich und gewinnt weiterhin.

## Konformität

```konformitaet
aussage:  Ein aktives Sprachmodul ohne eigene `sprachkennung`-Regel setzt `document.
          documentElement.lang` auf die aktive Sprache, nicht auf den eingebauten deutschen
          Rückfall — gemessen an der Form des tatsächlich ausgelieferten Englisch-Moduls
          (leeres `_regeln`).
zustand:  geprüft
herkunft: invariante
pruefung: tests/textsatz-mechanismus.test.js#[Textsatz·U2-ADR-208] ein Modul OHNE eigene Sprachkennung bekommt die AKTIVE Sprache, nicht den deutschen Rückfall
```

```konformitaet
aussage:  Eine vom Modul selbst genannte, genauere Sprachkennung (z. B. eine Region wie
          `ar-EG`) gewinnt weiterhin gegenüber dem bloßen Sprachcode-Rückfall.
zustand:  geprüft
herkunft: invariante
pruefung: tests/textsatz-mechanismus.test.js#[Textsatz·U2-ADR-208] eine eigene Modul-Sprachkennung überschreibt weiterhin den neuen Rückfall
```

```konformitaet
aussage:  Ohne den Fallback (Rot-Beweis gegen eine mutierte Kern-Kopie) bleibt die
          Sprachkennung nachweislich am eingebauten deutschen Wert hängen, obwohl eine andere
          Sprache aktiv ist — der Rot-Beweis belegt, dass die Probe den Gegenstand wirklich misst.
zustand:  geprüft
herkunft: invariante
pruefung: tests/textsatz-mechanismus.test.js#[Textsatz·U2-ADR-208·Rot] ohne den Fallback bleibt die Sprachkennung am deutschen Wert hängen
```

```konformitaet
aussage:  Der Vor-Depot-Sprachumschalter (unabhängig vom Textsatz-Modul-Mechanismus) setzt
          `document.documentElement.lang` synchron zum sichtbaren Text.
zustand:  geprüft
herkunft: invariante
pruefung: tests/vor-depot-sprachschalter.test.js#[Vor-Depot-Schalter·U2-ADR-208] document.documentElement.lang folgt dem Umschalter
```

## Nachtrag (Reichweite eingeschränkt durch U2-ADR-278, 2026-09-05)

**Die unbedingte Zeile `raus.sprachkennung = sprache;` aus diesem ADR läuft seit U2-ADR-278 nur
noch, wenn `modul` — dasselbe `(rechtsraum && nachSprache[rechtsraum]) || nachSprache['']`, das
dieser ADR-Text bereits im eigenen Code-Auszug zeigt — tatsächlich ein Fach gefunden hat.** Dieser
ADR hatte die Zuweisung nur an `nachSprache` gebunden (irgendein Modul für die Sprache existiert),
nicht an das konkretere `modul` (das Fach für den aktiven Rechtsraum) — der Fall „Modul für die
Sprache existiert, aber nicht für den aktiven Rechtsraum" wurde hier nie benannt und in keinem der
drei Tests dieses ADR konstruiert. U2-ADR-278 misst nach: in genau diesem Fall zeigt die Anwendung
ohnehin bereits den eingebauten deutschen Text (derselbe Fach-Treffer entscheidet `textLesen()` wie
`textsatzRegeln()`) — die hier zugesagte Eigenschaft für den tatsächlich gemessenen und getesteten
Fall (ein Modul MIT gefundenem Fach, ohne eigene `sprachkennung`-Regel — das ausgelieferte
Englisch-Modul) bleibt unverändert gültig. Details:
`docs/adr/vivodepot-U2-ADR-278-sprachkennung-folgt-rechtsraum-fach-2026-09-05.md`, §2.

---
*Vivodepot GmbH · Berlin · 02.09.2026*
