# U2-ADR-278 · Die Sprachkennung folgt jetzt auch dem Rechtsraum-Fach, nicht nur dem Modul

**Datum:** 05.09.2026
**Status:** Angenommen und umgesetzt.
**Status heute:** gilt — `textsatzRegeln()` setzt `sprachkennung` nur noch, wenn ein passendes
Registry-Fach wirklich gefunden wurde; `tests/u2-adr-260-sprachkennung-folgt-modul.test.js`
(vier neue Proben) grün; der Anker von U2-ADR-208s eigenem Rot-Beweis in
`tests/textsatz-mechanismus.test.js` auf die neue Codeform nachgezogen (§4), Eigenschaft
unverändert geprüft.
**Bezug:** U2-ADR-208 (Sprachkennung fällt auf die aktive Sprache zurück — **dieser Bau schränkt
seine unbedingte Zuweisung ein, s. §2**) · U2-ADR-260 (derselbe Fehler am Vor-Depot-Schalter) · U2-ADR-162
((Sprache, Rechtsraum)-Fächerung der Textsatz-Registry, „Schnitt Glied 4", A469) · U2-ADR-267
(Messauftrag, aus dem heraus die vier B4/Bruch-1-Nachbarfragen dieser Nacht entstanden)

---

## 1 · Der Befund, gemessen

U2-ADR-208 hat einen Fall geschlossen: ein Sprachmodul ohne eigene `sprachkennung`-Regel behielt
den eingebauten Rückfall (`'de-DE'`), statt fälschlich die aktive Sprache zu behaupten. Ein
**zweiter, unabhängiger Auslöser** blieb offen und wurde in dieser Nacht gemessen (Auftrag
U2-ADR-278 Schritt 1): ein Sprachmodul für die aktive Sprache **existiert**, ist aber nur unter
einem **anderen** Rechtsraum registriert (`_TEXTSATZ_MODUL_REGISTRY[sprache][rechtsraum]`, kein
`''`-Fach). In diesem Fall fiel `textLesen()` für jede Kennung bereits vorher korrekt auf
`TEXTSATZ_EINGEBAUT` zurück — aber `textsatzRegeln().sprachkennung` (vivodepot.html:9976, vor
diesem Bau) setzte unbedingt die neue Sprache, unabhängig davon, ob ein Registry-Fach dafür
gefunden wurde.

**Wirkung:** `document.documentElement.lang` und die Vorlese-Stimme (`vorleseStarten`,
vivodepot.html:33130) behaupteten die neue Sprache, während jedes sichtbare Wort deutsch blieb —
WCAG 2.2 SC 3.1.1 (Stufe A), dieselbe Verstoßform wie U2-ADR-208/U2-ADR-260, durch eine Tür, die
keiner der beiden Wächter bewacht (gegengeprüft: 0 Treffer für „rechtsraum" in
`tests/u2-adr-260-sprachkennung-folgt-modul.test.js`).

**Eine geschärfte Frage, vor dem Bau beantwortet:** ist der Rückfalltext wirklich IMMER Deutsch,
oder könnte ein anderes Modul-Fach eine andere Sprache einschleusen — dann wäre `'de-DE'` derselbe
Fehler in unauffälligerer Form? **Gemessen, nicht angenommen:** `TEXTSATZ_EINGEBAUT`
(vivodepot.html:6413, Kommentar „Der eingebaute deutsche Satz") ist `const` + `Object.freeze` und
wird von keinem Modul-Mechanismus je ersetzt — Module schreiben ausschließlich in
`_TEXTSATZ_MODUL_REGISTRY`, nie in diese Konstante. `textLesen()` hat genau einen Rückfallzweig
darunter, und `nachSprache['']` bezieht sich immer auf die BEREITS aktive Sprache, nie auf eine
fremde. Es gibt strukturell nur zwei mögliche Ausgänge: Text aus dem passenden Modul-Fach, oder
der eingebaute deutsche Text — kein dritter Fall. Der Rückfall auf `'de-DE'` ist damit eine
**Eigenschaft des Systems**, kein Zufall, der bei einem künftigen Umbau unbemerkt wegfallen könnte
— und genau deshalb hier festgehalten.

## 2 · Eine Einschränkung von U2-ADR-208, benannt statt verschwiegen

**Dieser Bau nimmt einen Teil der Zusage von U2-ADR-208 zurück — kein Nachtrag, eine
Einschränkung.** Wer U2-ADR-208 liest, muss das erfahren, nicht nur den Anker in
`tests/textsatz-mechanismus.test.js` unverändert wiederfinden.

**Was U2-ADR-208 wörtlich zusagt** (dessen eigener Entscheidungstext): „`textsatzRegeln()` setzt
die aktive Sprachkennung als Grundwert, sobald ein Modul für die aktive Sprache gefunden wurde."
Sein eigener Code-Auszug zeigt bereits die Zeile `const modul = (rechtsraum && nachSprache[rechtsraum])
|| nachSprache[''];` — die (Sprache, Rechtsraum)-Fächerung war zu diesem Zeitpunkt (Schnitt Glied 4/
A469, U2-ADR-162, 23.08.2026) bereits gebaut. **Trotzdem band ADR-208 die Zuweisung nur an
`nachSprache`** (irgendein Modul für die Sprache existiert), **nicht an `modul`** (das konkrete
Rechtsraum-Fach). Seine Entscheidung benennt exakt zwei unveränderte Fälle — „kein Modul für die
aktive Sprache" und „Modul mit eigener `sprachkennung`" — einen dritten, „Modul für die Sprache
existiert, aber nicht für den aktiven Rechtsraum", nennt sie nirgends, und keiner seiner drei Tests
konstruiert ihn (keiner setzt `rechtsraum` unpassend). **Dieser dritte Fall war nie eine geprüfte
Zusage — er war ein Nebeneffekt der unbedingten Zeile, den niemand angesehen hatte.**

**Warum die Einschränkung unschädlich ist — strukturell, nicht wahrscheinlich:** `modul` in
`textsatzRegeln()` und `satz` in `textLesen()` sind nicht nur formelgleich, sondern **dasselbe
Objekt**. `_textsatzModuleAusDepotAnmelden` (vivodepot.html:10214–10221) hängt `_regeln` per
`Object.defineProperty` (nicht aufzählbar) direkt an `geprueft.texte` und schreibt genau dieses
Objekt nach `registry[sprache][rechtsraum]`; beide Funktionen lesen `(rechtsraum &&
nachSprache[rechtsraum]) || nachSprache['']` aus derselben Registry-Referenz. Ist `modul` falsy,
ist `satz` in JEDEM `textLesen()`-Aufruf für JEDE Kennung dieser Sprache ebenfalls falsy — Rückfall
auf `TEXTSATZ_EINGEBAUT` (Deutsch, s. §1), erzwungen, nicht zufällig. Und die Füllroutinen
(`_textsatzKnotenFuellen`/`_textsatzKnotenFuellenOhnePflicht`, vivodepot.html:10536/10549) rufen
selbst `textLesen()` je Kennung — es gibt keinen zweiten Render-Pfad, der Modul-Text ohne dieses
Fach anzeigen könnte. **Es gibt darum keinen Fall, in dem `modul` falsy ist UND nicht-deutscher
Text angezeigt wird** — die Einschränkung trifft ausschließlich den Fall, in dem der sichtbare
Text ohnehin schon deutsch ist. U2-ADR-208s tatsächlicher, gemessener und getesteter Fall (ein
Modul MIT gefundenem Fach, aber ohne eigene `sprachkennung`-Regel — das ausgelieferte
Englisch-Modul, `_regeln: {}`) bleibt vollständig unverändert: `modul` ist dort truthy, die
Zuweisung läuft unverändert.

## 3 · Reichweite, vor dem Bau geprüft

**Eine Quelle, vier Verbraucher.** Nur `textsatzRegeln()` (vivodepot.html:9976) ERZEUGT den Wert;
vier Stellen LESEN ausschließlich `textsatzRegeln().sprachkennung`, keine mit eigener Herleitung:
`textsatzSprachkennungAnwenden()` (In-Depot-DOM), `vorDepotSprachkennung()` (Vor-Depot-Pfad — erbt
denselben Fehler über denselben Aufruf, nicht neu erzeugt), `waehleVorleseStimme()`
(Stimmen-Fallback) und `vorleseStarten()` (die tatsächlich gesprochene Kennung). Eine Korrektur an
der einen Quelle zieht alle vier Verbraucher mit — keine vier Einzelpatches.

**Der funktionierende Fall bleibt unberührt, geprüft statt behauptet:** im Normalfall — ein Modul
trägt entweder genau den aktiven Rechtsraum oder steht im rechtsraumlosen `''`-Fach (der
dokumentierte Regelfall) — ist `modul` (vivodepot.html:9965) bereits vor diesem Bau truthy. Die
neue Bedingung ändert an diesem Zweig nichts; er ist derselbe Pfad, den
`tests/u2-adr-260-sprachkennung-folgt-modul.test.js` bereits grün hielt.

**Drei denkbare Fehlerzustände geprüft, nur einer trägt ohne neuen Umbau:**
- *Sprachkennung gar nicht setzen* — trägt: `raus` beginnt ohnehin bei
  `TEXTSATZ_REGELN_EINGEBAUT` (`'de-DE'`), demselben Wert, auf den auch der sichtbare Text
  zurückfällt. Kein neuer Zustand, keine neue Fallunterscheidung.
- *Auf der bisherigen Sprache lassen* — kein Speicherplatz vorhanden: `textsatzRegeln()` ist
  zustandslos, jeder Aufruf beginnt neu; es gibt kein Feld für „zuletzt aktive Kennung".
- *Einlass ablehnen* — trifft den Auslöser nicht: das Modul ist für SEINEN erklärten Rechtsraum
  gültig, der Widerspruch entsteht erst, wenn `data.rechtsraum` später abweicht.

## 4 · Umsetzung

**Eine Zeile wird zu einer bedingten Zuweisung** (vivodepot.html, `textsatzRegeln()`):

```js
// vorher: raus.sprachkennung = sprache; if (modul && modul._regeln) Object.assign(raus, modul._regeln);
if (modul) {
  raus.sprachkennung = sprache;
  if (modul._regeln) Object.assign(raus, modul._regeln);
}
```

Kein neuer Wächter — der bestehende `tests/u2-adr-260-sprachkennung-folgt-modul.test.js` bekommt
vier zusätzliche Proben (0 Treffer für „rechtsraum" vor diesem Bau, gegengeprüft): den Fehlerfall
(Rechtsraum passt nicht, kein `''`-Fach → `sprachkennung` bleibt `'de-DE'`), zwei Gegenproben für
den unveränderten Normalfall (Rechtsraum passt / kein Rechtsraum am Modul erklärt) und eine
Positivkontrolle, die die alte, unbedingte Fassung nachbaut und zeigt, dass sie im Fehlerfall
einen anderen Wert liefert — dieselbe Bauform wie die bereits bestehende Positivkontrolle in
derselben Datei.

**Die vier neuen Proben docken über `modulEinlassen()` + `_moduleEinlassWirken()`, nicht über den
Vor-Depot-Kanal der bestehenden Proben in derselben Datei — bewusst, nicht der einfachere Weg
übersehen:** der Fehler braucht einen Rechtsraum-MISMATCH, und `textsatzRechtsraumAktiv()` liest
`data.rechtsraum` — vor einem angelegten Depot existiert `data` nicht, der Rechtsraum ist dann
immer leer, der Fehler kann dort strukturell nie auftreten. `modulEinlassen()` allein schreibt nur
in `d.textsatzModule`; erst `_moduleEinlassWirken(r)` — der eine echte Aufrufer im Bürgerweg,
`modDatei.onchange`, vivodepot.html:38800 — setzt `data.textsprache` UND baut die Registry neu
(`_textsatzModuleAusDepotAnmelden`). Beide Proben rufen darum explizit beide Funktionen, statt nur
`modulEinlassen()` — sonst prüften sie einen Registry-Zustand, den kein Bürgerweg je herstellt.

**Nebenwirkung, gefunden über den ersten Gate-Lauf, nicht vorab gesucht:** U2-ADR-208s eigener
Rot-Beweis (`tests/textsatz-mechanismus.test.js#[Textsatz·U2-ADR-208·Rot]`) spleißt den alten,
unbedingten Zweizeiler wörtlich aus der Quelle heraus, um zu zeigen, dass ohne ihn der
ursprüngliche Bug zurückkehrt — dieser Anker existierte nach der Umstellung auf den
`if (modul) {...}`-Block nicht mehr wörtlich, die Probe meldete sich selbst korrekt („Anker nicht
gefunden — Quelle seither umgebaut?") statt still zu bestehen. Nachgezogen auf die kürzeste
eindeutige Form: nur noch die eine Zeile `    raus.sprachkennung = sprache;` (mit ihrer echten
Einrückung — ohne sie träfe der bloße Wortlaut auch den Kommentar zwei Zeilen darüber, der ihn in
Backticks zitiert, s. §2). Die geprüfte Eigenschaft selbst ist unverändert: „ohne diese Zuweisung
kommt der alte Bug zurück." Die Probe prüft jetzt zusätzlich sich selbst auf Eindeutigkeit
(`original.split(anker).length - 1 === 1`), nicht nur einmalig per Handgriff.

## 5 · Nicht Teil dieses Baus

- **Die `regeln`-Lücke** (Datumsformat, Dezimal-/Tausendertrenner, Währung — deklariert, geprüft,
  nirgends gelesen, s. B4-Messung 05.09.2026) bleibt ein eigener, separat zu entscheidender Posten.
- **Der Sprachwechsel als Produktfrage** (soll es einen deliberaten, umkehrbaren
  Sprachwechsel-Umschalter für ein bestehendes Depot geben?) bleibt eine Produktentscheidung — dieser Bau
  behebt ausschließlich, dass die Anwendung eine Sprache BEHAUPTET, die sie nicht ANZEIGT.

*Vivodepot GmbH · Berlin · 05.09.2026*
