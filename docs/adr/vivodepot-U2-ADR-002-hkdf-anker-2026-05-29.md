# U2-ADR-002: Vereinheitlichter HKDF-pro-Depot-Pfad für den Anker

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** SICHERHEIT, ARCHITEKTUR
**Cross-Referenz (Produktiv-Kanon):** `ADR-068 v2` (HKDF-Anker, cryptoVersion 2, Klärung 2 + 9), `ADR-052` (Sub-Depot-Hierarchie). Bewusst nicht übernommen: `ADR-050` / `ADR-085` (200k-Legacy-Migration).
**U2-Bezug:** verortet unter U2-ADR-001 (eigener Namensraum).
**Status heute:** gilt — Beleg `tests/krypto-verbote.test.js#u2-002-016-v3-only-keine-legacy-lesepfade`, rot⇄grün gebunden.

---

## Kontext

Beim Bau des U2-Kern-Gerüsts verschlüsselte die Implementation das Anker-Depot mit dem direkten PBKDF2-Master-Schlüssel, während Sub-Depots den HKDF-Pfad nutzen würden. Das hätte zu zwei Schlüssel-Logiken nebeneinander geführt — genau die gewachsene Verzweigung, die die U2-Linie vermeiden soll. Ursache war eine zu schlanke Spezifikation (Abschnitt 4.3 beschrieb nur den PBKDF2-Anker), nicht ein Fehlgriff der Implementation.

Der Produktiv-Kanon hat den korrekten Pfad längst entschieden: `ADR-068 v2` Klärung 2 legt die HKDF-Ableitung „beim Anlegen eines Depots (Anker oder Sub)" einheitlich fest.

## Entscheidung

Der Anker übernimmt in der U2-Linie denselben Schlüssel-Pfad wie Sub-Depots: HKDF-pro-Depot. Ein Mechanismus für alle Depots, kein Anker-Sonderfall.

- `masterBits = PBKDF2(passwort, pbkdf2Salt[16 B], 600000, SHA-256)` — leitet nur ab, verschlüsselt nichts direkt.
- `subKey = HKDF-SHA256(masterBits, depotSalt[32 B], info: 'vivodepot-depot-v2:' + depotUUID, 256 bit)`.
- `ciphertext = AES-256-GCM(subKey, plaintext, aad = _AAD_DEPOT_V2)`.
- Umschlag pro Depot: `{ kryptoVersion: 2, depotUUID, pbkdf2.salt[16 B], depotSalt[32 B], iv[12 B], ct }`.
- Der Anker ist das Depot mit der Anker-`depotUUID` und eigenem `depotSalt` — mechanisch identisch zu jedem Sub-Depot.

Bewusst nicht übernommen: `kryptoVersion: 1` (shared password), die Versions-Allowlist `[1, 2]`, der 200k-Legacy-Fallback (`deriveKeyLegacy`), die Migrations-Funktion v1→v2, die Schema-Migrationskette. Die U2-Linie startet bei eigenem Format-Version 1, das von Anfang an die HKDF-Form ist.

## Begründung

Der HKDF-Anker selbst gehört zum sauberen Kern der Produktiv-Architektur (`ADR-068 v2`), nicht zu ihrem Ballast. Ballast ist allein die Versions- und Migrations-Schicht, die existiert, um Altdaten zu tragen. Die U2-Linie hat keine Altdaten zu lesen — die Übernahme bestehender Nutzer läuft über den Klartext-Export, nicht über das Re-Keying alter verschlüsselter Blöcke. Damit entfällt die Existenzberechtigung der gesamten Migrations- und Versions-Logik, und der Pfad wird einheitlich.

## Konsequenzen

Positiv:
- Ein Schlüssel-Pfad für Anker und Sub-Depots. Das Übergaben-Modul nutzt den Sub-Depot-Pfad, ohne den Anker als Sonderfall zu behandeln.
- Reduzierte Angriffsfläche: kein Downgrade-Ziel, keine Parameter-Verwechslung über Versionszweige.
- Schlankerer Lade-Pfad ohne Allowlist-Prüfung und Migrationskette.

Negativ / bewusst in Kauf genommen:
- Keine Binär-Kompatibilität mit der Produktiv-App. Eine spätere Verschmelzung beider Codebasen bräuchte auf Datei-Ebene eine Übersetzung. Fortsetzung der bereits getroffenen Entscheidung für ein eigenes, sauberes Dateiformat und den begleiteten Umstieg der wenigen Bestandsnutzer.
- Die Krypto-Primitive (PBKDF2, HKDF, AES-GCM) sind dieselben wie im Produktiv-Kanon; die Sicherheits-Eigenschaften ändern sich durch diese Entscheidung nicht — nur die Verzweigung fällt weg.

## Offene Folge

- Vor jeder produktiven Nutzung der U2-Linie steht eine externe kryptographische Prüfung der HKDF-Implementation aus — diese Empfehlung stammt bereits aus `ADR-068 v2` und gilt unverändert.

## Implementations-Verweis

- **Commit:** `f116cc1491bf908d63cc35c75c7cc97703c68066` (Root-Commit, Branch `main`, lokal, kein Push) — Clean-Slate-Ordner war zuvor kein Git-Repo und wurde dabei lokal initialisiert, getrennt von der vorherigen internen Historie.
- **Inhalt:** genau eine Datei, `vivodepot.html`.
- **Integrität:** `vivodepot.html.sha256` = `8fbc814e36e3341ffd1efe16143f8c981f6e90ec28d916dd087531102be65ec0` (untracked, beschreibt den Commit-Zustand).
- **VdCrypto-Block byte-identisch:** Der reproduzierbare Block-Hash ist `6eb590b9…f56d05` (identisch mit `vivodepot-krypto-kern-PORT-VERBATIM.js`); er ist seit dem Fundament unverändert — nur der Aufruf aus dem Kern und der Umschlag wurden geändert, keine Krypto-Primitive. (Hinweis: Ein früher hier genannter Wert `fc5ac223…` stammte aus einer marker-basierten Rechnung und reproduziert sich über Zeilenbereichs-/Verbatim-Hashing nicht; maßgeblich und vom Integritäts-Gate der Suite gepinnt ist `6eb590b9…`.)
- **Verifiziert am Stopp-Punkt:** Krypto-Runde grün (anlegen/speichern/laden/entschlüsseln, Falschpasswort, manipulierte Datei); zusätzlich nachgewiesen, dass gekippter `depotSalt` und gekippte `depotUUID` die Entschlüsselung scheitern lassen — Salt und UUID gehen also tatsächlich in die Ableitung ein, der Umbau ist keine Fassade.

## Konformität

```konformitaet
aussage:   U2-002: keine kryptoVersion-1-Altpfade — die Versions-Allowlist enthält weder 1 noch 2 (seit
           19.08.2026, Zerfall in Feld-Einheiten: [3, 4] statt [3] — v4 als neue Generation, v3 als
           Rückweg, kein Legacy-Pfad), das Lade-Gate prüft sie hart, und die Legacy-Ableitung
           (deriveKeyLegacy / PBKDF2_ITERATIONS_LEGACY) sowie v1/v2-Lesepfade und
           Krypto-Migrationsfunktionen sind ersatzlos entfernt.
zustand:   prüfbar
pruefung:  tests/krypto-verbote.test.js#u2-002-016-v3-only-keine-legacy-lesepfade
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (Stufe 6 der 26-Verbote-Strecke), über `tests/bindung-pruefen.js`.
**Eine Prüfung, zwei ADR:** U2-002 („keine kryptoVersion-1-Altpfade") und U2-016 („v3-only, keine
Legacy-Lesepfade") tragen denselben Verbotssatz in zwei Fassungen (Stufe-0-Befund) — beide binden
deshalb auf dieselbe ausgeführte Prüfung, statt zwei Prüfungen für eine Grenze zu führen. Der historische
`kryptoVersion: 2`-Umschlag oben ist der Stand von 05/2026; U2-ADR-016 hat ihn auf 3 gehoben.*
