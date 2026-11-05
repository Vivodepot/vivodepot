# U2-ADR-516: KI-Andockpunkt — eine eigene Modulart für den Verweis auf ein lokales Modell

**Status:** Angenommen (entschieden 04.09.2026 und 29.10.2026, gebaut 29.10.2026)
**Datum:** 29.10.2026
**Kategorie:** MODULE, ARCHITEKTUR
**Linie:** U2
**Bezug:** U2-ADR-097 (kein Server, keine Übertragung an Dritte) · U2-ADR-145 (ein Register unterscheidet sich in Prüfung und
Slot, nicht im Weg hinein) · U2-ADR-513 (Einlassgrenzen je Register)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Ein kleines Sprachmodell, das die Person auf ihrem eigenen Gerät betreibt, soll später an Vivodepot andocken können, ohne dass
das Gerüst dafür noch einmal geöffnet werden muss. In den Kern passt ein Modell nicht. Schon ein kleines quantisiertes Modell ist
um Größenordnungen größer als die Einlassgrenze von 512 KB. Module tragen keinen Code, und der Kern macht keinen Netzaufruf
(`connect-src 'none'`).

Am 04.09.2026 wurde entschieden, dass der Andockpunkt ins Gerüst kommt. Die Form blieb offen: entweder eine eigene Modulart
oder ein Typ innerhalb von `logikModul`. Am 29.10.2026 fiel die Wahl auf die eigene Modulart.

## Entscheidung

1. **Ein eigenes Einlass-Register `lokalesModell` mit dem Slot `lokaleModelle`.** Es wird an das Ende von `EINLASS_REGISTER`
   angehängt und nimmt denselben Weg hinein wie jedes andere Register: Größe und Tiefe, Signaturkette, `pruefstufe`, Prüfung
   des Registers.
2. **Das Register trägt einen Verweis, sonst nichts.** Vom Autor kommen genau diese Felder: `modulTyp`, `moduleVersion`,
   `id`, `label`, `sprache`, `modellHash`, `herkunft`. Dazu kommen die Felder, die der Einlass selbst setzt
   (`_EINLASS_META_FELDER` und `appVersion`). Die Liste ist geschlossen. Ein unbekanntes Feld wird nicht nur benannt, es weist
   den Verweis ab. Das gilt ausdrücklich für jede Adresse, jeden Pfad und jedes Feld für Modell-Bytes.
   - `modellHash` ist die Prüfsumme der lokalen Modelldatei, mit Algorithmus-Kennung nach U2-ADR-486 Punkt 7: `sha256:` und
     64 Hex-Zeichen in Kleinbuchstaben. Reines Hex, die SRI-Form `sha256-…` und jede andere Kennung werden benannt verworfen.
     Ein Wechsel auf SHA-384 kommt mit dem Plan aus U2-ADR-486 und einem eigenen Wort.
   - `modellHash` ist nie ein Einlass-Feld. Er steht in den signierten Bytes und geht in den Fingerabdruck ein.
   - `label` und `herkunft` sind reiner Text. `herkunft` wird nie als Vertrauens- oder Signatur-Etikett angezeigt.
   - `id` folgt einem engen Zeichensatz.
3. **Beim Einlass wird nie eine Datei gelesen.** Die Prüfsumme wird erst beim späteren Andocken gegen eine Datei geprüft, die
   die Person selbst gewählt hat. Durch dieses Register kommt kein `fetch`, kein `XMLHttpRequest`, kein `WebSocket` und kein
   dynamisches `import()` in den Kern.
4. **Sichtbar, nicht ausführbar.** Die Einstellungen zeigen je eingelassenem Verweis eine Zeile mit Anzeigename, Prüfstufe und
   Herkunft. Dazu steht dort der Satz, dass Vivodepot die Modelldatei nicht mitliefert. Es gibt keinen Knopf, der etwas startet.
   So erfüllt das Register die Auflage vom 06.09.2026: Ein neues Register kommt nur zusammen mit der Kern-Fähigkeit, die es
   benennt.
5. **Nur signiert** (`nurGeprueft`, wie `branding`; festgelegt in der Krypto-Prüfung vom 29.10.2026). Der Hash entscheidet später, welche Datei als
   die gemeinte gilt. Über einen unsignierten Verweis könnte eine fremde oder veränderte Depot-Datei ein beliebiges Modell als
   die gemeinte Datei ausweisen. `pruefstufe` und `anbieterId` stammen allein aus der Signaturprüfung; ein Wert des Autors
   wird überschrieben. Der Verweis bekommt keine eigene Signierrolle, er wird über dieselbe Kette geprüft wie jedes andere
   signierte Modul. Ein Selbst-Einlass ohne Signatur für das eigene Modell der Person ist nicht Teil dieser Entscheidung und
   braucht ein eigenes Wort.

## Folgen

- `EINLASS_REGISTER` hat danach 16 Typen. Die Register-Zahl und die Slotlisten in Kern, Lese-App und Bestandsproben ziehen mit.
- Die Lese-App zählt den Slot mit, zeigt aber keinen Inhalt.
- Die Offline-Garantie-Proben scannen den ganzen Kern und erfassen die neuen Funktionen von selbst. Sie werden nicht geändert.

## Offen, ausdrücklich nicht Teil dieser Entscheidung

- Das Format des Modells, die Laufzeit und der Ablageort der Datei.
- Wie und wodurch ein Modell aufgerufen wird.
- Ob mehrere Modelle zugleich andocken dürfen, und wie ein Modell aktualisiert wird.
- Ob es einen Begleiter ohne Netz geben wird. Diese Frage ist nicht entschieden.

## Abgelehnt

- **Das Modell in den Kern einbetten.** Es passt nicht durch die Einlassgrenze, und eine höhere Grenze würde jedes Register
  schwächen.
- **Den Verweis in `logikModul` unterbringen.** Ein Modell ohne Fachvorlage hätte dort keinen Platz. Die Feldliste des Verweises
  müsste mit `datenSchema` und Regeln zusammenleben, und für die Signatur bräuchte es eine Sonderregel. Am 29.10.2026 wurde dagegen
  entschieden.
- **Eine Download-Adresse im Verweis.** Ein ungenutzter Text wird in keinem Code-Scan sichtbar, bis ihn jemand abruft.

```konformitaet
aussage:  Ein Verweis vom Typ lokalesModell wird über den gemeinsamen Einlassweg eingelassen und landet im Slot lokaleModelle; ein unsignierter wird abgewiesen.
zustand:  geprüft
herkunft: U2-ADR-516 (29.10.2026)
pruefung: tests/ki-andockpunkt-einlass.test.js#[KI-Andock·Einlass] ein signierter Verweis kommt über den gemeinsamen Einlassweg in lokaleModelle, ein unsignierter nicht
```

```konformitaet
aussage:  Die Feldliste des Verweises ist geschlossen; ein Feld für eine Adresse, einen Pfad oder Modell-Bytes wird verworfen.
zustand:  geprüft
herkunft: U2-ADR-516 (29.10.2026)
pruefung: tests/ki-andockpunkt-einlass.test.js#[KI-Andock·Ratsche] die Feldliste ist genau die gepinnte, und kein Feld taugt als Adresse, Pfad oder Modelldaten
```

```konformitaet
aussage:  Prüfung und Einbettung des Verweises lesen keine Datei und rufen kein Netz.
zustand:  geprüft
herkunft: U2-ADR-516 (29.10.2026)
pruefung: tests/ki-andockpunkt-einlass.test.js#[KI-Andock] Prüfung und Einbettung lesen keine Datei und rufen kein Netz
```
