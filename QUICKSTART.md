# Schnellstart

*English: [`QUICKSTART_en.md`](QUICKSTART_en.md)*

## 1. Öffnen

[https://privat-de.vivodepot.org/](https://privat-de.vivodepot.org/) (englisch:
[https://privat-en.vivodepot.org/](https://privat-en.vivodepot.org/)) in einem aktuellen Browser öffnen —
keine Installation. Wer mag, legt die Seite auf den Startbildschirm bzw. installiert sie über das
Browser-Menü; dann läuft sie auch offline.

Auf iPhone und iPad ist die Web-Adresse der Weg: eine heruntergeladene HTML-Datei zeigt iOS nur als
Vorschau an.

## 2. Depot anlegen

Beim ersten Start ein Passwort setzen. Das Passwort verschlüsselt das Depot — ohne Passwort kein
Zugriff, auch nicht für Vivodepot selbst.

## 3. Sichern

Nach dem Eintragen der ersten Angaben die Depot-Datei speichern (herunterladen) und an einem
Ort ablegen, den man wiederfindet — einem USB-Stick, einem verschlüsselten Ordner, einer Cloud
nach eigener Wahl. Vivodepot selbst legt nichts irgendwo ab; das ist die eigene Aufgabe der
Nutzerin.

## Oder: eine eigene Datei aus dem Quelltext bauen

Die `vivodepot.html` im Repository ist das Gerüst ohne Sprach- und Bereichsmodule; allein geöffnet
zeigt sie nur den Schriftzug. Die fertige Einzeldatei entsteht mit einem Befehl (Node.js genügt,
kein `npm install`):

```
git clone https://github.com/vivodepot/vivodepot.git
cd vivodepot
node tools/vier-produkte-erzeugen.js
```

Danach liegt die fertige Anwendung unter `produkte/privat-de/vivodepot.html` (englisch:
`produkte/privat-en/vivodepot.html`). Diese Datei per Doppelklick im Browser öffnen — kein Server,
keine Internetverbindung nötig. Einzelheiten stehen in [`DEVELOPING.md`](DEVELOPING.md).

## Danach

- [`README.md`](README.md) — was Vivodepot ist und für wen
- [`SECURITY.md`](SECURITY.md) — wie man prüft, dass die Datei tatsächlich verschlüsselt ist
- [`DEVELOPING.md`](DEVELOPING.md) — bauen, prüfen, selbst betreiben
- [`docs/adr/`](docs/adr/) — warum es so gebaut ist, wie es gebaut ist
