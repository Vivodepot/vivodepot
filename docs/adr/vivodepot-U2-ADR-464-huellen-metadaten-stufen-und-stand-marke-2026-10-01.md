# U2-ADR-464 · Was eine Depotdatei über ihre Versionen verrät: Einheiten auf 1-KiB-Stufen, Stand-Marke statt Zeitpunkt

**Status:** Akzeptiert, gebaut (v860).
**Datum:** 01.10.2026
**Kategorie:** KRYPTOGRAPHIE, DATENSCHUTZ
**Status heute:** gilt
**Betrifft:** `vivodepot.html` (`_einheitAufgefuellt`, `_zerfallSchreiben`, `standMarkeFuer`, `standKonfliktModell`, `speicherKonfliktModell`, `depotHerunterladen`)
**Bezug:** U2-ADR-062 (Ort-Hinweis im Klartext, Nachtrag §2 Beschluss A), U2-ADR-078 (kein Klartext-Cache), die Zerlegung des Depots in Einheiten (Kryptoversion 4).

## Frage

Eine Depotdatei liegt oft bei einem fremden Anbieter, etwa in einer Cloud, und der hebt oft mehrere Fassungen auf.
Was kann er daraus über die Arbeit der Bürgerin ablesen, ohne das Passwort zu kennen?

## Befund (gemessen am Kern v843)

- Jede Speicherung verschlüsselt alle Einheiten mit frischen Schlüsseln neu. Der Inhalt bleibt verborgen, auch der
  einer unveränderten Einheit.
- **Sichtbar waren:**
  - die Länge jeder Einheit; eine Änderung zeigte also, ungefähr wie viel sich in welchem Teil geändert hat;
  - der Zeitpunkt jeder Speicherung (`gespeichert_am` im Klartext);
  - die festen Adressen der Einheiten;
  - ihre Zahl (48 bis 78, je nach Inhalt);
  - die Kennung des Depots;
  - die Zahl der Fächer.

## Entscheidung

1. **Auffüllen auf 1-KiB-Stufen.**
   - Jede Einheit wird vor dem Verschlüsseln auf das nächste Vielfache von 1 KiB aufgefüllt (Feld `_pad`).
   - Eine Änderung unter 1 KiB ändert keine Länge mehr.
   - Gemessen an einem leeren Depot und den Personas P1–P20: +47 … +74 KB je Datei, das sind 6–10 %.
   - Zweierpotenzen hätten ~50 % gekostet: Eine Einheit ist allein ~710 KB groß und wäre auf 1 MB gewachsen.
   - 4-KiB-Stufen hätten 27–43 % gekostet.
2. **Stand-Marke statt Zeitpunkt.**
   - Die Datei trägt statt `gespeichert_am` das Feld `stand_marke`: einen HMAC des Zeitpunkts mit dem Adress-Schlüssel
     dieses Depots (`VdCrypto.feldAdresse`).
   - Bei gleichem Stand ist die Marke gleich, sonst verschieden. Ohne den Schlüssel lässt sie sich nicht auf eine Zeit
     zurückrechnen.
   - Die Konflikterkennung (Gerät ↔ Datei, Speichern über einen fremden Stand) vergleicht damit, ohne zu entschlüsseln.
   - Den Zeitpunkt selbst kennt nur der Gerätespeicher. Nach dem Öffnen einer Datei gilt ihre Marke als erwarteter Stand.
   - Eine Datei einer älteren Fassung (mit `gespeichert_am`) wird gelesen wie bisher.
3. **Kein Versionssprung.**
   - Ein Leser wertet je Einheit nur `name` und `wert` aus; das Füllfeld liest keiner.
   - v818 und v843 öffnen eine neue Datei fehlerfrei; die Probe hält das fest.
4. **Übergangsfolge, benannt.**
   - Eine ältere Fassung kennt die Marke nicht. Hält sie im **selben Browser-Speicher** denselben Stand, den eine neue
     Fassung geschrieben hat, meldet ihr Abgleich „Gerät oder Datei?“ einmal, obwohl beide gleich sind. Das passiert:
     - bei einem Downgrade am selben Gerät;
     - wenn eine alte und eine neue HTML-Datei von der Festplatte unter `file://` denselben Speicher teilen.
   - Die Bürgerin wählt, es geht nichts verloren.
   - Zwei Geräte (etwa altes Handy und neuer Laptop) haben getrennte Speicher. Sie sind nicht betroffen.
   - Ein grober Zeitpunkt (nur das Datum) hätte daran nichts geändert, gemessen: Die älteren Fassungen vergleichen den Wert
     exakt.
   - Die Folge entfällt, wenn v859 und älter aus dem Unterstützungszeitraum sind.

## Was diese Entscheidung nicht leistet

Weiter sichtbar bleiben:
- welcher verschlüsselte Teil sich wann änderte, über die festen Adressen; die Größe einer Änderung nur noch in
  1-KiB-Schritten;
- die grobe Zahl der Teile;
- die Kennung des Depots;
- die Zahl der Fächer;
- der Ort-Hinweis (U2-ADR-062, bewusst);
- was jeder Anbieter ohnehin sieht: Konto, Adresse, Zeitpunkte des Hochladens.

Wechselnde Adressen, gebündelte Teile und eine Depot-Kennung außerhalb des Klartexts bräuchten einen
Krypto-Versionssprung mit Migration aller Depots. Vorgeschlagen ist, sie mit dem geplanten Sprung auf Argon2id
zusammenzulegen; entschieden wird das dort.

```yaml
konformitaet:
  - aussage: >-
      Jede Einheit einer gespeicherten Datei ist auf eine volle 1-KiB-Stufe aufgefüllt; eine Änderung unter 1 KiB ändert
      keine Länge.
    zustand: erfuellt
    herkunft: U2-ADR-464 (01.10.2026)
    pruefung:
      - tests/huelle-auffuellen-stand-marke.test.js
        "[Auffüllen] jede Einheit endet auf einer vollen 1-KiB-Stufe"
      - tests/huelle-auffuellen-stand-marke.test.js
        "[Auffüllen] eine kleine Änderung ändert keine Länge — Rot-Beweis am Stand davor"
  - aussage: >-
      Die Datei trägt keinen Speicherzeitpunkt im Klartext, sondern eine Stand-Marke; die Konflikterkennung arbeitet
      mit ihr.
    zustand: erfuellt
    herkunft: U2-ADR-464 (01.10.2026)
    pruefung:
      - tests/huelle-auffuellen-stand-marke.test.js
        "[Stand-Marke] die Datei trägt die Marke, keinen Zeitpunkt; gleich und fremd werden erkannt"
      - tests/d43-etappe5-konflikt.test.js
        "[D43-E5] Datei-Format: Stand-Marke als Klartext-Geschwister (v860, vorher gespeichert_am); gleich-Erkennung end-to-end"
  - aussage: >-
      Ältere ausgelieferte Fassungen (v818, v843) öffnen eine neu geschriebene Datei fehlerfrei — kein Versionssprung.
    zustand: erfuellt
    herkunft: U2-ADR-464 (01.10.2026)
    pruefung:
      - tests/huelle-auffuellen-stand-marke.test.js
        "[Ältere Fassung·v818] öffnet die neue Datei (aufgefüllt, ohne Zeitpunkt) fehlerfrei — und was ihr Konfliktvergleich tut"
      - tests/huelle-auffuellen-stand-marke.test.js
        "[Ältere Fassung·v843] öffnet die neue Datei (aufgefüllt, ohne Zeitpunkt) fehlerfrei — und was ihr Konfliktvergleich tut"
```
