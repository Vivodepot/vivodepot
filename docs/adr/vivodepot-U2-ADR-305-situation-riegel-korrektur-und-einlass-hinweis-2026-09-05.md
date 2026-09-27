# U2-ADR-305 · Situations-Hinweis in ADR-301 korrigiert, plus ein `hinweis`-Feld gegen dieselbe Verwechslung

**Datum:** 05.09.2026
**Status:** Gilt (bereinigt 25.09.2026)
**Status heute:** gilt
**Bezug:** U2-ADR-301 (der korrigierte ADR) · U2-ADR-243 §Kontext (die teilweise überholte
Ursprungsaussage) · U2-ADR-246 (Situationen werden andockbar)

---

## 1 · Die Korrektur

**U2-ADR-301 §3 behauptete: ein Modul könne strukturell KEINE eigene Situation anlegen.** Das
ist falsch. Es ist am echten Prüfer widerlegt, gegen fünf Fälle, alle mit derselben
unreservierten Sonden-ID gemessen:

```
freie ID, GAR KEIN bloecke         → ANGENOMMEN
freie ID, bloecke: []              → ANGENOMMEN
freie ID, nur {quelle,feld}        → ANGENOMMEN
freie ID, EIGENES Feld-Objekt      → ABGELEHNT, grund: 'bloecke'
RESERVIERTE ID (geburt)            → ABGELEHNT, grund: 'reserviert'
```

**Der korrigierte Satz: Ein Modul DARF eine eigene Situation anlegen. Es darf ihr keine eigenen
Felder geben** — die kommen ausschließlich über die signierte Vorlage. Reservierte IDs werden
wie überall mit `grund: 'reserviert'` abgewiesen, unabhängig davon.

**Wo die Messung schiefging (meine eigene, in ADR-301):** meine Sonde trug in JEDEM Testfall ein
Feld-Objekt (`{feld:{id,...}}`) — ich habe damit ausschließlich die FELD-Sperre gemessen, sie
aber als Situations-Sperre gelesen. Der zitierte Kern-Kommentar über `situationsModulPruefen`
(„NUR {quelle, feld}-Züge sind hier erlaubt") beschreibt die erlaubten EINTRAGS-Formen
innerhalb von `bloecke` — nicht, ob eine Situation selbst anlegbar ist. Der Assistenten-Befund
(derselbe ADR, andere Sektion) war davon nie betroffen und bleibt unverändert richtig.

**Behoben:** U2-ADR-301 §3 umgeschrieben (Nachtrag-Hinweis am Kopf der Datei, korrigierter
Fließtext in der Sektion selbst), vier neue Gegenproben in
`tests/buergermodul-situationen-wizards-u2-adr-301.test.js` (freie ID ohne `bloecke`, mit
`bloecke:[]`, reservierte ID → `reserviert`, plus die bestehenden Riegel/Gegenprobe-Proben
bleiben unverändert richtig).

---

## 2 · Der Bau — `hinweis`, ein additives Klartext-Feld neben `grund`

**Der Befund, der zum Bau führt:** ein Prüfer, dessen Ablehnung zu einer falschen
Schlussfolgerung führt, hat einen Fehler, keinen Schönheitsmangel. `grund: 'bloecke'` sagte
nicht, was stattdessen erlaubt gewesen wäre — ich hatte den Quelltext vor mir und bin trotzdem
falsch abgebogen. Ein Fremdherausgeber, der nur die Ablehnung sieht, kommt gar nicht weiter.

**Auflage: kein bestehender `grund`-Wert ändert sich** — Tests und Aufrufer hängen daran, ein
Formatwechsel macht Prüfer blind. `hinweis` ist ein NEUES, additives Feld, nur bei einer
Ablehnung gesetzt.

**Gemessen, welche `grund`-Werte dieselbe Eigenschaft tragen wie `'bloecke'`** (ein Zustand statt
einer Bedingung, verdeckt den echten Grund): über alle zehn Prüfer gezählt tragen `bereich`,
`situation`, `wizard` und `ereignisAchse` denselben Sammelgrund `'leer'`, wenn KEIN eingereichter
Eintrag angenommen wurde — der Sammelgrund selbst sagt nichts, der echte Grund steht nur in
`verworfene[].grund`. Genau das war heute selbst mein zweiter Fehler in diesem Strang: mein
eigener Prüflauf meldete `grund: 'leer'` mit `verworfene: [{grund:'reserviert'}]`, und ich las
den sichtbaren, äußeren Grund statt des tatsächlichen.

**Umgesetzt, zwei Stellen:**

1. **`situationsModulPruefen`, beide `grund: 'bloecke'`-Stellen** (fehlendes `bloecke`,
   fehlerhafter Block-Eintrag): `hinweis: STRINGS.einlassHinweisSituationBloecke` — der exakte
   vorgegebene Text.
2. **Der Sammelgrund `'leer'`**, an allen vier Fundstellen (`bereichsModulPruefen`,
   `situationsModulPruefen`, `wizardsModulPruefen`, `ereignisAchseModulPruefen`): eine neue,
   geteilte Funktion `_einlassHinweisFuerLeer(verworfene)` sammelt die tatsächlichen
   `verworfene[].grund`-Werte ein und hängt sie an den Basistext
   (`STRINGS.einlassHinweisLeer`) an — z. B. „… (reserviert)". Der verdeckte Grund steht damit
   direkt im Hinweis, nicht nur irgendwo in einem Array, das der Aufrufer selbst durchsuchen
   müsste.

**Textsatz, nicht hartkodiert, über `STRINGS` — nicht über einen neuen `einlass:`-Namensraum**
(erster Entwurf, korrigiert am eigenen Wächter): `tests/textsatz-mechanismus.test.js` hält jede
`TEXTSATZ_EINGEBAUT`-Kennung gegen einen ECHTEN, gehbaren Pfad (Sektor-Feld, Situation, Wizard,
oder `STRINGS`-Schlüssel) — eine freierfundene `einlass:`-Kennung ist von dort aus nicht
erreichbar und fiel als „diese Kennung holt niemand ab" durch. Richtig eingeordnet: zwei neue
`_STRINGS_EINGEBAUT`-Einträge (`einlassHinweisSituationBloecke`, `einlassHinweisLeer`,
Registrierung wie jeder andere `STRINGS.xyz`-Systemtext), mit den zugehörigen
`TEXTSATZ_EINGEBAUT`-Kennungen `strings:einlassHinweisSituationBloecke.text`/
`strings:einlassHinweisLeer.text`, englische Übersetzung in
`tools/textsatz-en-vollabdeckung-daten.js` ergänzt, `tools/textsatz-en-modul.json` neu erzeugt
(3194 → 3196 Kennungen, gegen `baueModul()` nachgerechnet), beide Frische-Wächter
(`tests/textsatz-en-modul-erzeugen.test.js`, `tests/textsatz-mechanismus.test.js`) grün.

**Rote Gegenprobe** (Auflage, wörtlich erfüllt): ein Modul, das abgelehnt wird, trägt
`hinweis`; eines, das durchläuft, trägt keinen — geprüft für `bloecke`, für `leer`
(situation/bereich/wizard) und explizit für den Angenommen-Fall (`hinweis === undefined`).

---

## 3 · Was das NICHT ist

**Keine erschöpfende Hinweis-Abdeckung.** Gemessen wurden über neun Prüfer-Funktionen gut 60
verschiedene `grund`-Werte (s. Anhang unten) — die meisten sind bereits selbsterklärend
(`'moduleVersion'`, `'herkunft'`, `'kein-titel'`, `'reserviert'` — ausdrücklich als Beispiel genannt für
„gut, man weiß, was zu tun ist"). Diese ADR behebt gezielt die zwei GEMESSENEN Fälle, die die
Eigenschaft „Zustand statt Bedingung, verdeckt den echten Grund" tragen (`bloecke`, `leer`) —
kein Rundumschlag über alle ~60 Werte. Werden weitere irreführende Gründe gefunden, ist das ein
eigener, benannter Fund, kein stiller Nachtrag hier.

**Anhang — gemessene `grund`-Werte je Prüfer** (zur Einordnung, nicht alle behandelt):
`textsatz`: kein-objekt, kein-text, moduleVersion, reserviert, sprache, texte, unbekannt ·
`bereich`: bereiche, doppelt, herkunft, id, kein-label, kein-objekt, **leer**, merkmal,
moduleVersion, reserviert, rolle, unbekannt · `situation`: **bloecke**, doppelt, herkunft, id,
kein-objekt, kein-titel, **leer**, moduleVersion, reserviert, situationen, unbekannt · `wizard`:
doppelt, herkunft, id, kein-objekt, kein-titel, **leer**, moduleVersion, reserviert, schritte,
unbekannt, wizards, ziel · `institutionsArt`: arten, kein-label, kein-objekt, kennung,
moduleVersion, reserviert, unbekannt · `branding`: kein-objekt, moduleVersion,
nichts-gueltiges-gesetzt, unbekannt, ungueltige-schriftart, ungueltiger-name,
ungueltiges-format-oder-zu-gross, ungueltiges-hex · `logikModul`: abschnitte, datenSchema,
diskriminante, herkunft, id, kein-objekt, sektor, sektor-oder-feld, sensibel-ohne-erlaubnis,
teile, titel, typ, unbekannt · `format`: erkenner-gleich, erkenner-kein-objekt,
erkenner-ohne-vergleich, erkenner-pfad, erkenner-schluessel, feld-unbekannt, unbekannt,
zuordnung-feld, zuordnung-kein-objekt, zuordnung-schluessel, zuordnung-ziel · `ereignisAchse`:
ausgenommen, doppelt, doppelt-im-modul, eintraege, ereignisse, feldId, herkunft, kein-objekt,
**leer**, moduleVersion, reserviert, sektorId, unbekannt.

---

*Vivodepot GmbH · Berlin · 05.09.2026*
