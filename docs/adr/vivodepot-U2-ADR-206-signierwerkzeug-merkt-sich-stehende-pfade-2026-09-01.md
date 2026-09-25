# U2-ADR-206: Das Signier-Werkzeug merkt sich die zwei stehenden Pfade — nie den Inhalt, nie die Passphrase

**Status:** Angenommen
**Datum:** 01.09.2026
**Kategorie:** WERKZEUGE, SICHERHEIT
**Linie:** U2
**U2-Bezug:** Ergänzt `tools/modul-app-signieren-und-packen.js` (31.08.2026, Vorgänger-ADR zu den
drei verketteten Schritten Bauen/Signieren/Packen) — ändert an dessen Kryptografie nichts, nur an
der Bedienung der zwei Argumente, die bei jedem Lauf gleich bleiben.
**Anker:** Auftrag, wörtlich sinngemäß wiederholt und bisher als Angebot statt als
Aufgabe behandelt: „ein Block zum Kopieren, in den ich nur noch die Passphrase eintippe."
**Status heute:** gilt — Beleg `tests/modul-app-signieren-und-packen.test.js`.

---

## Kontext

`tools/modul-app-signieren-und-packen.js` verlangt bei jedem Lauf sechs Argumente. Zwei davon —
`--ausgabe-vdkey` und `--ausstellerzertifikat` — sind Vivodepots eigene, stehende
Betriebs-Infrastruktur (der geschützte Ausgabe-Schlüssel und das Ausstellerzertifikat, beide
„FERTIGE Pfade", die das Werkzeug nie selbst erzeugt, s. `tools/modul-erzeugen.js`). Sie ändern
sich praktisch nie zwischen zwei Läufen — nur ihre Pfade sind lang und leicht zu verlieren. Genau
an der Stelle, an der niemand helfen kann (die Passphrase gibt nur sie selbst ein, in ihrem
eigenen Terminal), musste sie diese zwei Pfade jedes Mal von Hand zusammensuchen. Ohne sie in der
Shell-Historie kam sie nicht weiter.

## Entscheidung

**1 — Die zwei Pfade werden nach dem ersten Mal nicht mehr verlangt.** Nach einem *erfolgreichen*
Lauf (Signieren UND Packen beide durchgelaufen) schreibt das Werkzeug sie in eine lokale,
gitignorierte Merkdatei (`tools/.modul-app-signieren-merkdatei.json`). Ein Lauf, der irgendwo
scheitert, brennt nichts ein — kaputte Pfade werden nicht für den nächsten Versuch übernommen.

**2 — Fehlen sie, fragt das Werkzeug interaktiv danach**, über dieselbe `readline`-Technik, mit der
`modul-erzeugen.js` bereits die Passphrasen abfragt (eine Instanz für alle offenen Fragen — ein
bekannter Fund vom 30.08.2026: zwei sequenzielle `question()`-Aufrufe auf frischen Instanzen
funktionieren nur bei einem live tippenden Menschen, nicht bei gescriptetem stdin). **Kein
Usage-Fehler mit Exit 1 mehr für diese zwei Felder** — ein Werkzeug, das nur eine Person bedienen
darf, darf sie nicht wegschicken. Die vier kurzen Pflichtfelder (`--slug`,
`--herausgeber-id/-name/-typ`) bleiben unverändert hart, kein Gedächtnis, kein Interaktiv-Weg — sie
sind keine Pfade und waren nicht der gemeldete Schmerzpunkt.

**3 — Ein ausdrücklich übergebenes Argument schlägt den gemerkten Wert, immer, ohne Ausnahme.**
`pfadEntscheidung(explizit, gemerkt, …)` prüft `explizit` zuerst und unbedingt.

**4 — Ein gemerkter Pfad, der nicht mehr existiert, wird gemeldet und neu erfragt** — nicht
stillschweigend benutzt (wäre falsch), nicht geraten. `fs.existsSync` (injizierbar für Proben)
entscheidet je Pfad einzeln.

## Vier harte Grenzen

Die Größe des Risikos an dieser Stelle — Schlüsselmaterial, das ausschließlich eine einzige
Person bedient — verlangt eine enge Umsetzung, nicht eine bequeme:

1. **Gemerkt wird NUR der Pfad, nie der Inhalt.** Kein Schlüsselmaterial, kein Auszug, kein
   Fingerabdruck in der Merkdatei.
2. **Die Passphrase wird NIE gespeichert, NIE geloggt, NIE gemerkt** — auch nicht verschlüsselt,
   auch nicht „nur für diese Sitzung". Sie bleibt unverändert interaktiv über den bestehenden Weg;
   dieses Werkzeug bekommt sie nie zu Gesicht (reicht sie nur technisch an den Kindprozess durch,
   `stdio: 'inherit'`, unverändert seit dem Vorgänger-ADR). `merkeSchreiben` schreibt zusätzlich
   über eine FESTE Allowlist (`{ausgabeVdkey, ausstellerZertifikat}`) statt beliebige Felder
   durchzureichen — verteidigt auch gegen einen künftigen Aufrufer-Fehler, nicht nur den heutigen
   Aufruf.
3. **Die Merkdatei ist gitignored und bleibt es**, mit einer Probe, die das über `git
   check-ignore` gegen den echten Pfad bestätigt — nicht nur gegen den `.gitignore`-Text gelesen.
4. **Das Werkzeug sucht nicht nach Schlüsseln.** Kein Durchsuchen von Verzeichnissen, kein
   Erraten — es merkt sich ausschließlich, was ihm einmal ausdrücklich gesagt wurde.

## Konsequenzen

Der nächste Lauf mit denselben zwei Pfaden braucht nur noch die vier kurzen Felder plus die
Passphrase — genau der „Block zum Kopieren" aus dem Auftrag. Ändert sich einer der beiden Pfade
(seltener, bewusster Vorgang — etwa nach der jährlichen Zertifikats-Zeremonie), überschreibt ein
einziges explizites Argument den gemerkten Wert wieder, ohne dass die Merkdatei von Hand angefasst
werden müsste.

## Konformität

```konformitaet
aussage:  merkeSchreiben lässt eine mitgegebene Passphrase NIEMALS in die Merkdatei — feste
          Allowlist statt Durchreichen, auch bei einem künftigen Aufrufer-Fehler.
zustand:  geprüft
herkunft: Grenze 1+2, Auftrag 01.09.2026
pruefung: tests/modul-app-signieren-und-packen.test.js#merkeSchreiben lässt eine mitgegebene Passphrase NIEMALS in die Datei — feste Allowlist, kein Durchreichen
```

```konformitaet
aussage:  Die echte Merkdatei (tools/.modul-app-signieren-merkdatei.json) ist gitignored.
zustand:  geprüft
herkunft: Grenze 3, Auftrag 01.09.2026
pruefung: tests/modul-app-signieren-und-packen.test.js#die echte MERKDATEI ist gitignored
```

```konformitaet
aussage:  Ein explizit übergebener Pfad schlägt einen gemerkten Wert immer, ohne Ausnahme.
zustand:  geprüft
herkunft: Entscheidung 3
pruefung: tests/modul-app-signieren-und-packen.test.js#beide Pfade EXPLIZIT übergeben — KEINE Frage wird gestellt, unabhängig vom Gedächtnis
```

```konformitaet
aussage:  Ein gemerkter Pfad, der nicht mehr existiert, wird NICHT stillschweigend benutzt,
          sondern löst eine neue Frage aus.
zustand:  geprüft
herkunft: Entscheidung 4
pruefung: tests/modul-app-signieren-und-packen.test.js#ein gemerkter Pfad, der nicht mehr existiert, wird NICHT stillschweigend benutzt
```

---

*Vivodepot GmbH · Berlin · 01.09.2026*
