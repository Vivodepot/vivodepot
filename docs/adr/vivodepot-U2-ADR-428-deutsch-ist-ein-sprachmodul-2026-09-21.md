# U2-ADR-428: Deutsch ist ein Sprachmodul — das Gerüst trägt keinen Sprachsatz

**Status:** entschieden, gelandet.
**Status heute:** gilt
**Datum:** 21.09.2026
**Bezug:** U2-ADR-426 (Gerüst trägt keinen vollen Sprachsatz; sein Abschnitt „Anforderung an den Schnitt Deutsch als Modul“), U2-ADR-367 (Deutsch als Sprachmodul im Kern), U2-ADR-363 (Gerüst sprachagnostisch)
**Betrifft:** `vivodepot.html` (`_sprachBasis`, `_sprachBasisSprache`, `_textsatzAbWerkRegistrySeed`), `tools/lib/vier-produkte.js`, `tools/textsatz-de-modul.json`, `tools/lib/textsatz-de-quelle.js`, `tests/load-kern.js`

## Befund

Nach U2-ADR-426 trug das Gerüst noch den deutschen Satz als Konstante (`AB_WERK_TEXTSATZ_DE`, gut 400 KB). Damit war Deutsch Inventar des Gerüsts und keine Zutat der Datei: ein deutsches Depot konnte seine Sprache nicht in ein fremdsprachiges Produkt mitnehmen. Fünfzehn Stellen im Kern lasen die Tabelle direkt, und rund dreißig Werkzeuge und ebenso viele Tests lasen sie unter ihrem Namen. Die Tabelle diente dort in drei Rollen: als Register der bekannten Kennungen, als Landkarte der Art-Slots je Kennung und als Originaltext, gegen den ein übersetzter Satz verglichen wird.

## Entscheidung

1. **Deutsch ist ein Sprachmodul wie Englisch.** `privat-de` und `pro-de` tragen `tools/textsatz-de-modul.json` als Sprachmodul (`sprachModulPfad`); die Rezepte führen es als `sprachmodul`. Das Gerüst trägt keinen Sprachsatz mehr, die Konstante entfällt.
2. **Ein Zugriffspunkt für die Sprachbasis.** `_sprachBasis()` liefert das `texte`-Objekt des Sprachmoduls, in dem das Produkt gebaut ist (`AB_WERK_SPRACHE_PRODUKT`); im nackten Gerüst ist es leer. Alle fünfzehn Lesestellen gehen darüber — bekannte Kennungen, Art-Slots, Originaltext zum Vergleich, die Forderung „muss übersetzt sein“. `_sprachBasisSprache()` benennt ihre Sprache; „in der Sprache, in der das Produkt gebaut ist, gibt es keine unübersetzten Stellen“ ersetzt den festen Vergleich mit Deutsch.
3. **Kein Rückfall.** Eine Kennung, die das Modul des Produkts nicht trägt, ist leer (U2-ADR-426, Folgen). Das Modul des englischen Produkts trägt heute alle 3851 Kennungen des deutschen; 106 davon (`OFFEN_JURISTISCH`: Vollmacht 50, Patientenverfügung 23, Dokumentmodule 33) tragen heute den deutschen amtlichen Wortlaut auch im englischen Modul — ein Zwischenstand, dessen Übersetzung noch fehlt (siehe unten), kein Endzustand.
4. **Die Sprache der Datei gilt neben dem Produktmodul.** Ist die Sprache in der Mitschrift der Datei eine andere als die des Produkts, wird sie wie bisher registriert; dieselbe Sprache wie die des Produkts nie, das eingebackene, vertrauenswürdige Modul gewinnt. Ein deutsches Depot trägt Deutsch jetzt in seiner Mitschrift mit (`sprache: AB_WERK_SPRACHE_PRODUKT`), wie ein englisches Englisch — die Anforderung aus U2-ADR-426. Kosten: das Depot wächst um die Größe des Moduls (rund 380 KB).
5. **Die Quelle dreht sich um.** Vorher: Kern → Moduldatei (`tools/textsatz-de-modul-erzeugen.js` las die Konstante). Jetzt: die Moduldatei ist die Quelle des deutschen Satzes. `tools/textsatz-de-modul-erzeugen.js` legt die beiden Pro-Tabellen darüber, prüft über den Gerüst-eigenen Prüfweg und schreibt zurück — Prüfer und Normalisierer, nicht Ableiter. Das ist die Umkehr der Richtung, nicht eine Auslagerung.
6. **Ein Leser, kein Alias.** Werkzeuge lesen den deutschen Satz über `tools/lib/textsatz-de-quelle.js`, Tests über `V.TEXTSATZ_DE_QUELLE` (wie `TEXTSATZ_EN_QUELLE` seit U2-ADR-426). Einen Alias auf die alte Konstante gibt es nicht. `tests/textsatz-de-quelle-ein-leser.test.js` macht jede Nennung der Konstante in Code, Zugriffsform oder Quelltext-Muster in `tools/` und `tests/` rot — der Wächter ersetzt die Zahl „dreißig“ durch eine Struktur.
7. **Der Weg über das Modul ist ohne Alias belegt.** `tests/sprach-basis-modulweg.test.js` fragt je Lesestelle an zwei selbstgebauten Produkt-Kernen mit gegensätzlichem Inhalt, am nackten Gerüst und am englischen Produkt; dieselbe Frage, gegenteilige Antwort. `tests/sprach-basis-ein-zugriffspunkt.test.js` hält den Kern davon ab, die Sprachbasis an `_sprachBasis()` vorbei zu lesen.

## Was S8 nicht auflöst — und der Weg, der es auflöst

- **Das Vor-Depot-Sprachangebot** — gelandet mit dem Schnitt „Vor-Depot-Sprachangebot“ (21.09.2026). Der englische Vor-Depot-Satz (26 Texte, 2,3 KB) steht nicht mehr im Gerüst, sondern als Moduldatei `tools/sprachangebot-en-vordepot-modul.json` (`modulTyp: "sprachangebot"`) im Rezept des deutschen Produkts; das Gerüst trägt die leere Region `AB_WERK_SPRACHANGEBOT_QUELLEN` und den Mechanismus, einen Knopf, der eine Sprache aus dem Produkt anbietet (`vorDepotSprachangebotVorhanden`). Ein Gerüst kann nicht hundert Sprachen vor dem Depot tragen, und die Gerüst-Definition erlaubt keine Beschriftungen in irgendeiner Sprache. Abnahme, wörtlich: die Konstante steht in keinem Kern, ein Produkt ohne zweite Sprache zeigt den Knopf nicht — belegt in `tests/vor-depot-sprachangebot.test.js`.
- **Der `noscript`-Satz** („Vivodepot benötigt JavaScript …“, rund 80 Byte) steht außerhalb jedes Skriptblocks und kann nicht aus einem Modul kommen, das ein Skript liest. Ihn aus dem Modul zu setzen verlangt eine Region im Markup, die der Konfektionierer beim Bau füllt; dessen Funktion führt das Gateway als Kopie mit gepinnter Prüfsumme (U2-ADR-406). Das ist ein eigener Schnitt am Konfektionierer-Sprachweg. Eigentümer: die Sitzung, die dort baut; Abnahme: der Satz steht in keinem Gerüst-Quelltext, und ein deutsches und ein englisches Produkt tragen ihn je in ihrer Sprache.
- **Die 106 Kennungen mit deutschem Wert im englischen Modul** (`OFFEN_JURISTISCH`: Vollmacht 50, BMJ-Patientenverfügung 23, Dokumentmodule 33; dazu zwei deutsche Beispielwerte) sind ein Zwischenstand: die englische Fassung fehlt noch. Entschieden ist der Weg, auf dem sie kommt. **Rangfolge (verbindlich):** (1) wo eine offizielle Übersetzung existiert — bei Gesetzen und Ausführungsbestimmungen —, wird sie genommen; sie wird zuerst gesucht, nicht übersetzt; (2) sonst schreibt sie Vivodepot oder eine Übersetzerin. Vor jeder einzelnen Übersetzung steht darum eine Recherche, ob eine offizielle Fassung vorliegt; „vermutlich gibt es eine“ ist keine Messung. **Drei Sorten, nicht zwei:** der amtliche deutsche Wortlaut gilt; eine vom Herausgeber selbst herausgegebene englische Fassung wird übernommen und als solche gekennzeichnet — ob sie verbindlich ist, sagt allein die Quelle, und wo sie es nicht sagt, behauptet Vivodepot es nicht (die BMJ sagt es für ihre englischen Fassungen nicht); eine von uns übersetzte Fassung ist erklärend und gilt nicht. Die Kennzeichnung ist deshalb **sichtbar**: sie unterscheidet nicht Deutsch von Englisch, sondern amtlich-deutsch, vom Herausgeber herausgegeben und von uns übersetzt — eine Nutzerin muss wissen, was der Satz ist, den sie liest. Die Kennungsform braucht darum ein Feld für die HERKUNFT der Übersetzung (amtlich-deutsch / vom Herausgeber herausgegeben / von uns übersetzt, mit Quelle), nicht nur ein Flag „offen/fertig"; „offen“ ist einer von drei Zuständen eines einzelnen Eintrags, nicht ein Merkmal der Datei. Der heutige Name `OFFEN_JURISTISCH` beschreibt den Bestand, nicht diese Form und wird mit ihr in einem Zug neu benannt. Wer die nicht-amtlichen Übersetzungen schreibt (Vivodepot oder Übersetzer), bleibt Sache der Recherche und einer eigenen Entscheidung. Umfang gemessen: 106 Kennungen, 836 Wörter — 58 Bezeichnungen bis vier Wörter, 44 Sätze bis 25 Wörter, 4 Absätze.
  **Auflage an jede Übersetzung, amtlich oder nicht:** die 58 Bezeichnungen und 44 Sätze sind zum größten Teil Satzanfänge und Überschriften, die im Dokument mit einer Auswahl oder einem Eintrag zu einem Formulartext zusammengesetzt werden („Ich möchte“ ist kein Satz, den man übersetzt, sondern ein Anfang, der weitergeht). Eine Wort-für-Wort-Übersetzung ergibt dort erst im fertigen Dokument Unsinn, nicht in der Liste; sie werden darum im Zusammenhang ihres Dokumentabschnitts übersetzt. Die vier Absätze stehen für sich (alle im Abschnitt 5 der Patientenverfügung: Befolgung des Willens, anderweitige Behandlung, mutmaßlicher Wille, Willensänderung) und werden einzeln übersetzt; ihre Doppelformen („Mein(e) Vertreter(in)“, „Bevollmächtigte(r)/Betreuer(in)“, „Ärztinnen und Ärzte“) werden aufgelöst, nicht nachgebildet: sie sind eine Eigenschaft des deutschen Originals, nicht seines Inhalts, und im Englischen gibt es das grammatische Geschlecht nicht (`representative` ist geschlechtslos); eine 1:1-Übertragung („my representative(s)“) meint etwas anderes, nämlich Zahl statt Geschlecht. Alle vier Absätze stammen aus einem einzigen amtlichen Muster (BMJ-Patientenverfügung, Abschnitt 5): die Recherche nach einer offiziellen englischen Fassung ist EINE Recherche, keine vier.
- **Die 47 Kennungen `dok:zugang…`** tragen mit dem Textsatz ihren Träger im Kern nicht mehr; das ist der Zwischenstand, den das Template `zugang-zum-recht` auflöst.

## Was diese Entscheidung nicht leistet

Sie baut den Sprachumschalter nicht (Auswahl unter den Sprachen der Datei beim Öffnen). Sie entscheidet nichts über weitere satzförmige Zeichenketten außerhalb der Konstante; die misst der Gerüst-Wächter als eigenen Posten.

```yaml
konformitaet:
  - aussage: >-
      Der Kern trägt keinen deutschen Satz als Konstante; er liest die Kennungen, Art-Slots und den Originaltext über einen einzigen Zugriffspunkt
      aus dem Sprachmodul des Produkts.
    zustand: erfuellt
    herkunft: U2-ADR-428 (21.09.2026)
    pruefung:
      - tests/sprach-basis-ein-zugriffspunkt.test.js
        "[S8·Zugriffspunkt] kein Code des Kerns nennt die alte Konstante — weder als Definition noch als Saat noch als Lesestelle"
      - tests/sprach-basis-modulweg.test.js
        "[Modulweg·Basis] _sprachBasis() ist das Modul des Produkts: A trägt genau seine Kennungen, B genau seine, das nackte Gerüst keine"

  - aussage: >-
      Keine Datei in tools/ und tests/ liest die alte Konstante; der deutsche Satz kommt aus der Moduldatei über den einen Leser.
    zustand: erfuellt
    herkunft: U2-ADR-428 (21.09.2026)
    pruefung:
      - tests/textsatz-de-quelle-ein-leser.test.js
        "[S8·Ein Leser] keine Datei in tools/ und tests/ nennt die alte Konstante in Code oder Zugriffsform"
      - tests/textsatz-de-quelle-ein-leser.test.js
        "[S8·Ein Leser·Rot-Beweis] ein Vorkommen im Code, in einer Zugriffsform und als Quelltext-Anker wird gefunden; Erklärtext und Kommentar nicht"
```
