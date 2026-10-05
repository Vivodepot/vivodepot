# U2-ADR-156-Nachtrag — Die Tür eines Fachs: was ihre Trennung vom Anker-Schlüssel trägt

**Status:** Angenommen (04.10.2026, Wort der Gegenlesung). Die Herleitung liest eine zweite Sitzung gegen den Code.
**Datum:** 2026-10-04
**Bezug:** U2-ADR-156 (Empfängerkreise, Fächer), U2-ADR-016 Nr. 2 (ein HKDF-Info-String für Anker und Sub-Depots),
U2-ADR-230 (Stärkeparameter ändern sich nur über einen Versionssprung), U2-ADR-095 (der zweite Zugang überlebt den
Passwortwechsel), U2-ADR-090 §3
**Linie:** U2

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten. Die Frage „trägt die Trennung?“ geht in den Umfang des
externen Krypto-Reviews.

---

## Anlass

Die Tür eines Fachs (`_fachTuerSchluessel`) leitet so ab:

    Tür = HKDF( IKM  = PBKDF2-600k-SHA-256(NFC(Passwort der Empfängerin), kdfSalt),
                salt = tuerSalt,
                info = 'vivodepot/v3/depot/' + depotUUID )

Der **Info-String ist derselbe** wie beim Anker-Schlüssel. U2-ADR-016 Nr. 2 regelt den gemeinsamen String nur für Anker und
Sub-Depots. Für die Tür war nirgends begründet, warum er hier genügt. Hinzu kommt: `tuerSalt` wird beim Passwortwechsel der
Inhaberin nicht rotiert.

Weg zum Nachsehen: `grep -n "_fachTuerSchluessel\|HKDF_INFO_DEPOT_V2_PREFIX =\|const tuerSalt" vivodepot.html`.

## Was die Trennung trägt

1. **Eigenes Eingangsmaterial.** Das IKM der Tür stammt aus dem Passwort der Empfängerin und einem **eigenen, zufälligen
   16-Byte-Salz je Fach** (`kdfSalt`, beim Einrichten gewürfelt). Das IKM des Ankers stammt aus dem Passwort der Inhaberin und
   `pbkdf2.salt`. Auch wenn beide dasselbe Passwort wählen, sind die IKM verschieden, weil die Salze unabhängig gezogen werden.
   Gleich wären sie nur, wenn zwei 128-Bit-Zufallswerte kollidieren.
**Die Trennung trägt allein das je Fach frisch gewürfelte `kdfSalt`. AAD und `tuerSalt` trennen nicht.** Beide sehen aus wie
Träger, sind es aber nicht; der Rot-Beweis am Code vom 04.10.2026 hat das gezeigt:

- **`tuerSalt`** ist der Depot-Salt zum Zeitpunkt des Einrichtens. Bis zum ersten Passwortwechsel ist er also *gleich* dem
  HKDF-Salz des Ankers und trennt nichts.
- **Die AAD an `fachSchluessel`** (`aadEinheit(depotUUID, Fach-Kennung)`) bindet das Chiffrat an seinen Platz in der Tabelle.
  Man kann es nicht als Anker-Chiffrat unterschieben und kein Anker-Chiffrat als Fach ausgeben. Schlüssel trennt sie nicht:
  AAD ist öffentlich, und wer einen *gleichen* Schlüssel hätte, gäbe die Anker-AAD einfach mit. Gemessen: Ersetzt man im Code das
  Fach-Salz durch das Anker-Salz, öffnet die Tür bei gleichem Passwort das Anker-Geheimnis (Probe „gleiches Passwort“ wird rot).

Die Trennung hängt damit an einer Bedingung: **`empfaengerkreisFachEinrichten` erzeugt `kdfSalt` an genau einer Stelle mit
`crypto.getRandomValues(new Uint8Array(16))`, frisch je Fach; kein Fach trägt das `pbkdf2.salt` des Ankers, und keine zwei Fächer
tragen dasselbe Salz.** Das schreiben die Proben unten fest. Der Info-String trägt die Trennung nicht, eine Lücke liegt bei dieser
Bedingung aber nicht vor. Der gemeinsame Info-String bleibt ein Hygienemangel, der gerade deshalb benannt ist: Das Salz ist die
einzige Schranke, und genau darum muss sie bewacht sein.


**Getrennt sind die Schlüssel, nicht der Zugang.** Wählt die Empfängerin dasselbe Passwort wie die Inhaberin, öffnet ihr
Passwort die Datei als Inhaberin, weil der Anker auf Platz 0 zuerst versucht wird. Das ist keine Frage der Schlüsselableitung.
Ob die Oberfläche beim Einrichten davor warnt, ist eine Produktfrage und liegt außerhalb dieses Nachtrags.

**Eingangsweg Import.** Ein Vollimport (Format `json`) übernimmt die Empfängerkreise einer Quelldatei samt Fach-Material.
Gemessen am 05.10.2026: Ein so übernommenes Fach öffnet am Ziel nicht, weil Tür und AAD an die neue `depotUUID` gebunden sind.
Für die Trennung der Tür vom Anker ändert das nichts. Dass der Import das Material überhaupt übernimmt, ist ein eigener Befund
und wird in einem eigenen Schnitt geschlossen; der Abschnitt wird dann nachgezogen.

## Was der Zugang einer Vertrauensperson freigibt

Nach dem Öffnen eines Fachs hat die Empfängerin **genau einen Schlüssel: K**, den zufälligen Fach-Schlüssel. Die Tür entwickelt
ihn aus `fachSchluessel`. Mit K wickelt sie nur die Umschläge ihres eigenen Eintrags aus. Für nicht freigegebene Einheiten
stehen dort Attrappen gleicher Länge, die zu keinem Schlüssel gehören. Jede Einheit hat einen eigenen Inhaltsschlüssel. Er wird
bei jedem Speichern neu gezogen (`VdCrypto.einheitSchluessel()` in `_zerfallSchreiben`). Den Anker-Schlüssel oder einen
Schlüssel, der mehr als die Freigabe öffnet, bekommt die Empfängerin nie. Nimmt die Inhaberin eine Freigabe zurück, öffnet K in
der nächsten gespeicherten Fassung die zurückgenommene Einheit nicht mehr. Eine ältere Dateikopie aus der Zeit, als die Freigabe
weiter reichte, öffnet mit demselben Passwort weiter den damaligen Umfang. Rückwirkend lässt sich eine Freigabe nicht entziehen.

Ein Sub-Depot hat eigenes Passwort, eigene UUID und eigene Salze. Sein Passwort öffnet weder den Anker noch ein anderes
Sub-Depot.

## Entscheidung

1. **Der Info-String der Tür bleibt** `vivodepot/v3/depot/` + depotUUID.
2. **Verworfen: ein eigener Info-String für die Tür.** Er lässt sich nicht migrieren. Eine bestehende Tür lässt sich nur mit dem
   Passwort der Empfängerin neu wickeln, und das steht nie im Depot. Alte Türen behielten den alten String also für immer, und
   der Lesepfad müsste beide dauerhaft probieren: zwei Ableitungen, wo eine reicht. `deriveDepotKeyV2` liegt im gepinnten Block.
   Eine zweite Ableitung daneben wäre eine zweite Stelle, wie U2-ADR-230 sie vermeiden will. Ein eigener String kommt erst mit
   dem nächsten Sprung der `kryptoVersion`, dann für neue Fächer.
3. **`tuerSalt` rotiert nicht, und das ist gewollt** (Kommentar an `_fachTuerSchluessel`, Reparatur vom 21.08.2026). Ein
   Passwortwechsel der Inhaberin kann die Tür nicht nachziehen. Eine Rotation hätte jedes Fach still unbrauchbar gemacht. Wer
   einer Empfängerin den Zugang entziehen will, entfernt das Fach. Ein Passwortwechsel ist dafür nicht der Weg.
4. **Die Bedingung und die Platzbindung werden mit Proben festgeschrieben**, je mit Rot-Beweis an einer veränderten Kopie des
   Kerns, dauerhaft in der Suite (s. unten): Anker-Salz
   als `kdfSalt` eingesetzt → „kdfSalt je Fach ist eigen“ und „gleiches Passwort“ werden rot; Anker-Kennung als AAD von
   `fachSchluessel` eingesetzt → die AAD-Proben werden rot. Festes Salz (`new Uint8Array(16).fill(7)`) oder ein über Fächer
   wiederverwendetes Salz → „zwei Fächer haben verschiedene Salze“ und „16 Byte CSPRNG“ werden rot. Fällt eine Bedingung, wird eine Probe rot, bevor die Begründung dieses
   Nachtrags stillschweigend falsch wird.
5. **Offener Punkt im Umfang des externen Reviews**, wörtlich: „Trägt ein
   Salz allein, oder eigener Info-String beim nächsten Versionssprung?“ Dieser Nachtrag beantwortet die Frage nicht abschließend.

```yaml
konformitaet:
  - aussage: >-
      Die Trennung der Tür vom Anker-Schlüssel trägt allein das kdfSalt: an genau einer Stelle frisch aus 16 Byte CSPRNG je Fach,
      nie das pbkdf2.salt des Ankers, nie zwei Fächer mit demselben Salz.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Fach-Tür (04.10.2026)
    pruefung:
      - tests/fach-tuer-trennung.test.js "[Fach-Tür] kdfSalt je Fach ist eigen und nicht das Anker-Salz"
      - tests/fach-tuer-trennung.test.js "[Fach-Tür·Rot] ein Fach mit dem Anker-Salz fällt auf"
      - tests/fach-tuer-trennung.test.js "[Fach-Tür] zwei Fächer derselben Datei haben verschiedene Salze"
      - tests/fach-tuer-trennung.test.js "[Fach-Tür] das kdfSalt entsteht aus 16 Byte CSPRNG, an genau einer Stelle"
      - tests/fach-tuer-trennung.test.js "[Fach-Tür·Rot am Code] Anker-Salz als kdfSalt: die Salz-Prüfung schlägt an, und die Tür öffnet das Anker-Geheimnis"
      - tests/fach-tuer-trennung.test.js "[Fach-Tür·Rot am Code] festes Salz: zwei Fächer tragen dasselbe, beide Prüfungen schlagen an"
      - tests/fach-tuer-trennung.test.js "[Fach-Tür·Rot am Code] wiederverwendetes Zufallssalz: zwei Fächer tragen dasselbe, beide Prüfungen schlagen an"
  - aussage: >-
      Eine Tür aus demselben Passwort wie der Anker öffnet das Anker-Geheimnis nicht.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Fach-Tür (04.10.2026)
    pruefung:
      - tests/fach-tuer-trennung.test.js "[Fach-Tür] gleiches Passwort, Tür öffnet den Anker nicht"
  - aussage: >-
      Das Chiffrat fachSchluessel ist an seinen Platz (die Fach-Kennung) gebunden; das ist Platzbindung, keine Schlüsseltrennung.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Fach-Tür (04.10.2026)
    pruefung:
      - tests/fach-tuer-trennung.test.js "[Fach-Tür] fachSchluessel öffnet nur mit der AAD der Fach-Kennung"
      - tests/fach-tuer-trennung.test.js "[Fach-Tür·Rot] mit der Anker-Kennung als AAD scheitert fachSchluessel"
      - tests/fach-tuer-trennung.test.js "[Fach-Tür·Rot am Code] Anker-Kennung als AAD von fachSchluessel: die Platzbindung fällt, die AAD-Probe sieht es"
  - aussage: >-
      Der Fach-Schlüssel K öffnet genau die freigegebenen Einheiten seines Eintrags und keinen Anker-Umschlag; das Passwort
      eines Sub-Depots öffnet weder ein anderes Sub-Depot noch den Anker.
    zustand: erfuellt
    herkunft: U2-ADR-156-Nachtrag Fach-Tür (04.10.2026)
    pruefung:
      - tests/fach-tuer-trennung.test.js "[Fach-Zugang] K öffnet genau die freigegebenen Einheiten und keinen Anker-Umschlag"
      - tests/fach-tuer-trennung.test.js "[Fach-Zugang·Rot] mit dem Anker-Schlüssel wickeln die Anker-Umschläge aus — die Probe misst Trennung, keinen kaputten Weg"
      - tests/fach-tuer-trennung.test.js "[Sub-Depot-Zugang] das Passwort eines Sub-Depots öffnet weder ein anderes Sub-Depot noch den Anker"
      - tests/fach-tuer-trennung.test.js "[Fach-Zugang] nach dem Zurücknehmen einer Freigabe öffnet derselbe K in der neuen Fassung weniger"
```
