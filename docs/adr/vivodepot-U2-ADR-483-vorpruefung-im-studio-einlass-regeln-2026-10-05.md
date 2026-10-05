# U2-ADR-483: Vorprüfung im Studio — dieselben Einlass-Regeln wie der Kern, ein Urteil in Klartext, Angaben erst zur Signatur

**Status:** Angenommen (05.10.2026) — gebaut
**Datum:** 05.10.2026
**Kategorie:** EINREICHWEG, STUDIO, MODULPRÜFUNG
**Linie:** U2
**Bezug:** U2-ADR-409 (Kennungsvorschläge in der Einreichung) · die Gegenrichtung, Anfrage und Antwort (eigene ADR folgt; nicht hier) ·
der Torwächter im Studio (erzeugter Bereich aus `validateTemplate`, A5) · die Sammelform der Auffälligkeiten (`{grund, fundstelle, schwere, quelle}`)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Eine Einrichtung, die eine Vorlage oder ein Modul für Vivodepot baut, erfuhr erst spät, ob die Bürger-App es annimmt. Das Studio
prüfte eine Vorlage in Schritt 3, nach zwölf Angaben zur Einrichtung und einem Schlüsselpaar. Zu den übrigen Modularten
(Rechtsraum, Institutionsart, Erscheinungsbild, Bereich, Format …) sagte es gar nichts über den Einlass der Bürger-App.
Wer nur wissen wollte, ob sein Entwurf trägt, musste erst Rechtsform und Anschrift angeben.

## Entscheidung

1. **Vorab prüfen, ohne Angaben.** Im Fertigstellen-Dialog steht vor den drei Schritten „Vorab prüfen (ohne Angaben)“. Er fährt
   dieselbe Inhaltsprüfung wie Schritt 3 (`pruefeKonformitaet` mit `nurInhalt`, dazu die Fehlstellen-Auskunft gegen den Torwächter),
   ohne Stammdaten und ohne Schlüssel. Die Angaben zur Einrichtung bleiben Pflicht, aber erst beim Absenden zur Prüfung und
   Signatur durch Vivodepot.
2. **Ein Urteil in Klartext.** `bestanden`, `gemeldet` (ein Teil wird verworfen, der Rest kommt an) oder `abgewiesen`, je Zeile mit
   Grund und Fundstelle in der Sammelform der Auffälligkeiten. Die Gründe stehen als Sätze da, nicht als Kennwort.
3. **Wörtlich die Regeln des Kerns, für drei Register.** Für `rechtsraum`, `institutionsArt` und `branding` urteilt ein erzeugter
   Bereich im Studio: die `pruefen`-Funktionen aus `EINLASS_REGISTER` samt den Deklarationen, die sie brauchen, Zeichen für Zeichen
   aus dem Kern, eingeschlossen in eine Funktion. Eine Datei, die die Bürger-App abweisen würde, lädt das Studio nicht herunter.
4. **Für jede andere Art kein Urteil.** Das Studio schreibt: „Die Einlass-Prüfung übernimmt Vivodepot bei der Prüfung der
   Einreichung“, nie „bestanden“. Grund, gemessen am 05.10.2026: die Prüfung von Format, Bereich, Textsatz und Logik-Modul zöge
   0,1 bis 1,0 MB Kern-Code ins Studio, mehr als das Studio selbst. Rechtsraum, Institutionsart und Erscheinungsbild brauchen
   zusammen 13 KB.
5. **Fehlrichtung.** Wirft die Prüfung, fehlt sie oder liefert sie etwas Unerwartetes, heißt das Urteil „bei Vivodepot“, nie
   „bestanden“.

## Abgrenzung

- Die Signatur und das verbindliche Urteil bleiben bei Vivodepot. Die Vorprüfung sagt voraus, was die Bürger-App tut; sie
  ersetzt die Prüfung der Einreichung nicht und sagt nichts über den Inhalt einer Vorlage.
- Die erzeugte Prüfung gilt für die Kern-Fassung, aus der sie erzeugt ist. Eine ältere Bürger-App kann anders urteilen; das
  Studio kennt sie nicht (wie beim Torwächter).
- Die automatische Signatur nach einem Urteil ohne Auffälligkeit und der Weg „selbst verteilen, unsigniert“ sind nicht Teil
  dieser Entscheidung.

## Folgen

- Ändert sich eine der drei Prüfungen im Kern, wird die Gleichlauf-Probe rot, bis der Bereich neu erzeugt ist
  (das Erzeuger-Werkzeug mit `--schreiben`). Kommt eine Deklaration hinzu (etwa eine Listenprüfung im Rechtsraum),
  gehört sie in die Liste des Werkzeugs; fehlt sie, wirft der Bereich in der Probe.
- Das Studio, das Erzeuger-Werkzeug und die Probe bleiben im privaten Repo, wie das Studio selbst.

```yaml
konformitaet:
  - aussage: >-
      Der erzeugte Bereich läuft für sich allein und urteilt für rechtsraum, institutionsArt und branding über Fixtures und
      Abwandlungen genau wie der Kern; eine fehlende Deklaration wirft, eine abweichende Regel fällt im Vergleich auf.
    zustand: erfuellt
    herkunft: U2-ADR-483 (05.10.2026)
    pruefung:
      - tests/einlass-regeln-studio-bereich.test.js "[Einlass-Regeln·Studio] der Bereich läuft für sich allein und urteilt in jedem Fall wie der Kern"
      - tests/einlass-regeln-studio-bereich.test.js "[Einlass-Regeln·Studio·Rot-Beweis] fehlt eine Deklaration, wirft der Bereich; weicht eine Regel ab, sieht es der Vergleich"
  - aussage: >-
      Das Studio trägt genau den heute aus dem Kern erzeugten Bereich.
    zustand: erfuellt
    herkunft: U2-ADR-483 (05.10.2026)
    pruefung:
      - tests/einlass-regeln-studio-bereich.test.js "[Einlass-Regeln·Studio] der Bereich im Studio ist genau der heute aus dem Kern erzeugte"
      - tests/einlass-regeln-studio-bereich.test.js "[Einlass-Regeln·Studio·Rot-Beweis] ein abweichendes Zeichen im Bereich fällt auf"
  - aussage: >-
      Das Studio urteilt bestanden, gemeldet oder abgewiesen wie die Bürger-App; für jede andere Art und bei einer werfenden
      Prüfung heißt das Urteil „bei Vivodepot“, nie „bestanden“.
    zustand: erfuellt
    herkunft: U2-ADR-483 (05.10.2026)
    pruefung:
      - tests/einlass-regeln-studio-bereich.test.js "[Vorprüfung·Studio] institutionsArt: bestanden, gemeldet, abgewiesen — wie die Bürger-App"
      - tests/einlass-regeln-studio-bereich.test.js "[Vorprüfung·Studio] jede andere Art: „bei Vivodepot“, nie „bestanden“ — auch wenn die Prüfung wirft"
  - aussage: >-
      Eine Vorlage wird ohne Angaben zur Einrichtung und ohne Schlüssel vorab geprüft; die volle Prüfung beim Absenden verlangt beides.
    zustand: erfuellt
    herkunft: U2-ADR-483 (05.10.2026)
    pruefung:
      - tests/einlass-regeln-studio-bereich.test.js "[Vorprüfung·Studio] die Vorlage wird ohne Angaben zur Einrichtung und ohne Schlüssel geprüft"
```

---

*Vivodepot GmbH · Berlin · 05.10.2026*
