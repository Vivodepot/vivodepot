# PDF-Schrift: Inter, zugeschnittene TrueType-Instanzen

Die drei Dateien sind die PDF-Schrift von Vivodepot ab Werk. Seit v896 stehen sie nicht mehr als vendorter Block im Gerüst,
sondern als `schriften[]`-Einträge mit `pdf: true` im Erscheinungsbild-Modul (`tools/erscheinung/schriften.json` →
`tools/erscheinungsbild-modul.js` → Region `AB_WERK_ERSCHEINUNGSBILD_PRODUKT` jedes Produkts). Registriert werden sie im
Gerüst-Block `pdf-schriften-registrieren` (U2-ADR-097-Nachtrag).

- **Lizenz:** SIL Open Font License 1.1 (`OFL-1.1`), Autoren: The Inter Project Authors. Volltext: `OFL.txt` im Repo-Wurzelverzeichnis,
  byte-gleich mit `LICENSE.txt` der Quelle (Git-Blob `9b2ca37b3ffc77391d8b2ebef4a974ef32bf46ea`; nachsehen:
  `gh api repos/rsms/inter/contents/LICENSE.txt --jq .sha` gegen `git hash-object OFL.txt`).
- **Herkunft:** https://github.com/rsms/inter, Release v4.1 (`Inter-4.1.zip`, SHA-256
  `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`), `InterVariable.ttf` und `InterVariable-Italic.ttf`,
  nameID 5 „Version 4.001;git-9221beed3“.
- **Prüfsummen (SHA-256):**
  - `Inter-Regular-pdf-subset.ttf` `3ec64dedf4cc3fbbb996a6eca47c1afd317fd14ca67e4dc13931d9ad1fd79b49`
  - `Inter-Bold-pdf-subset.ttf` `93d436b13f081429158388735a3a3984b7f6e47ff8b372673dfee73ffbbf49f4`
  - `Inter-Italic-pdf-subset.ttf` `6b61c36b249d1ca07d659437c4bca4050e3dfd4a8c5f791b85d895fb9cc55957`

## Rezept zum Nachbauen

Bis v895 stand es im Kopf von `tools/build-pdf-inter-einbetten.js`; das Werkzeug entfällt mit v896 (es schrieb in den Gerüst-Block),
das Rezept bleibt hier wörtlich:

```
REZEPT (einmalig gefahren, 13.09.2026, Ergebnis committet — DREI Schnitte, nicht zwei:
`zeichneVollDepotPdf` nutzt auch 'italic', ohne eigene Einbettung würde jsPDF für diesen
Stil eine unregistrierte Schrift anfragen — gemessen, nicht angenommen, s. Rot-Beweis):
  python3 -c "
    from fontTools.varLib.instancer import instantiateVariableFont
    from fontTools.ttLib import TTFont
    quellen = {'regular': '<Inter Variable TTF>', 'bold': '<dieselbe Datei>',
               'italic': '<Inter Italic Variable TTF, eigene Datei, OFL-1.1>'}
    for name, wght in [('regular',400), ('bold',700), ('italic',400)]:
        f = TTFont(quellen[name])
        instantiateVariableFont(f, {'wght': wght, 'opsz': 14}, inplace=True)
        f.save(f'/tmp/Inter-{name}-instance.ttf')
  "
  # Unicode-Bereich: Basis-Latein+Latein-1 (0x20-0xFF), Latein-Erweiterung A+B
  # (0x100-0x24F), allgemeine Interpunktion (0x2000-0x2070), Währungssymbole
  # (0x20A0-0x20D0), fi/fl-Ligaturen, plus drei einzelne WinAnsi-Nachzügler
  # (ˆ˜™, U+02C6/U+02DC/U+2122 — sonst ein Rückschritt ggü. der alten
  # WinAnsi-Deckung, s. Rot-Beweis in tests/pdf-inter-einbetten.test.js).
  # KEIN --name-IDs='': ein erster Zuschnitt strich die `name`-Tabelle komplett leer —
  # jsPDFs eigener TTF-Parser (nicht fontTools) griff beim Registrieren lesend auf einen
  # Eintrag darin zu und brach mit "Cannot read properties of undefined (reading '0')"
  # ab, live im Browser gemessen (Playwright, notfallkartePdfSchritt lief in ein 30s-
  # Downloadtimeout, weil doc.text() den Fehler intern nur als PubSub-Error loggte, nie
  # warf). fontTools' eigener Default (nameIDs 0-6: Family/Subfamily/Unique/Full/Version/
  # PostScript) reicht jsPDF, darum bewusst WEGGELASSEN statt auf leer gesetzt.
  pyftsubset Inter-{regular,bold,italic}-instance.ttf \
    --unicodes="U+0020-024F,U+2000-2070,U+20A0-20D0,U+FB01,U+FB02,U+02C6,U+02DC,U+2122" \
    --layout-features='' --no-hinting --desubroutinize \
    --drop-tables+=DSIG,GPOS,GSUB,GDEF,STAT,fvar,avar,gvar,HVAR,MVAR,cvar \
    --output-file=Inter-{Regular,Bold,Italic}-pdf-subset.ttf

NEU GESCHNITTEN (23.09.2026, Befund PDF-MINUS-BLUTGRUPPE): dasselbe Rezept, --unicodes zusätzlich um
U+2192,U+2212,U+2713 (→ − ✓, von den Sprachmodulen getragen; tests/pdf-schrift-deckung-klasse.test.js). HERKUNFT:
https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip (Release v4.1, OFL-1.1),
SHA-256 9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e, daraus InterVariable.ttf und
InterVariable-Italic.ttf, nameID 5 „Version 4.001;git-9221beed3". Die vorigen Subsets stammten aus git-66647c0bb, das
in keinem Release-ZIP liegt. Gemessen gegen die vorigen Subsets (Instanz wght 400/700/400, opsz 14): Regular und Bold
alle Vorschubbreiten gleich, Italic alle bis auf „{" (U+007B, 875 → 874 Einheiten von 2048). Neu im Zuschnitt außer den
drei Zeichen: U+20C0 (im Bereich 0x20A0–0x20D0 des Rezepts; der Kern sagt es nicht zu, PDF_INTER_BEREICHE endet bei 0x20BF).
```
