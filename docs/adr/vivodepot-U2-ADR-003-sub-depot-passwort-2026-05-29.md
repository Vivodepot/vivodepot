# U2-ADR-003: Sub-Depot-Passwort-Architektur und Vertrauens-Modus

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** SICHERHEIT, ARCHITEKTUR, DSGVO
**Cross-Referenz (Produktiv-Kanon):** `ADR-068 v2` Klärung 11 (eigenes Passwort pro Sub-Depot, DSGVO Art. 9), Klärung 4–7 (Blackbox, Einhängen, Drei-Ebenen, keine Kaskade).
**U2-Vorgänger:** U2-ADR-002 (vereinheitlichter HKDF-pro-Depot-Pfad).
**Status heute:** gilt — Beleg `tests/zusicherungen-scanner.test.js#Z2-Storage-Grenze ausgefuehrt und gruen (Verweisziel Stufe 3a)`.

---

## Kontext

Das Übergaben-Modul braucht eine kryptografisch saubere Isolation zwischen Depots. ADR-068 v2 Klärung 11 hat in der Produktiv-Linie einen inneren Widerspruch aufgelöst: Solange Sub-Schlüssel aus dem Master der verwaltenden Person abgeleitet werden, hat wer das Anker-Passwort kennt automatisch Zugang zu allen Sub-Depots — ein DSGVO-Problem für Gesundheitsdaten nach Art. 9. Die Lösung ist ein eigenes Passwort pro Sub-Depot.

## Entscheidung

Jedes Sub-Depot erhält ein eigenes Passwort, das seine Inhaberin beim Anlegen setzt, unabhängig vom Passwort der verwaltenden Person. Der Sub-Schlüssel wird über denselben vereinheitlichten Pfad aus U2-ADR-002 abgeleitet — `PBKDF2(eigenesPasswort) → deriveDepotKeyV2(masterHkdfKey, depotSalt, depotUUID) → AES-256-GCM mit _AAD_DEPOT_V2`, gleicher Sechs-Felder-Umschlag —, nur aus dem eigenen Passwort statt dem der verwaltenden Person. Es entsteht kein zweiter Krypto-Pfad.

Zwei Modi für die verwaltende Person: Im Vertrauens-Modus gibt sie das ihr hinterlegte Sub-Passwort für die Sitzung ein; der abgeleitete Schlüssel wird ausschließlich im Arbeitsspeicher gehalten und niemals persistiert. Im Versiegelungs-Modus sieht sie nur Metadaten, nicht den Inhalt.

## Begründung

Die Isolation ist damit echt und nicht Anzeige-Kosmetik: Wer das Sub-Passwort nicht hat, kann den Inhalt kryptografisch nicht lesen — auch die verwaltende Person nicht. Die Wiederverwendung des vereinheitlichten Pfads hält die Linie schlank; ein Sub-Depot ist strukturell ein Depot wie der Anker, nur aus einem anderen Passwort abgeleitet.

## Konsequenzen

- Die verwaltende Person kann ein Sub-Depot nur als Blackbox exportieren, nicht re-verschlüsseln, weil sie das Passwort nicht kennt (außer im Vertrauens-Modus).
- Das Sub-Passwort und der abgeleitete Schlüssel sind nie persistent — die DSGVO-kritische Invariante.
- Verwaltungs-Metadaten (`verwaltungsTyp`, `delegationsGeschichte`, `verselbststaendigungMoeglich`) werden hier strukturell angelegt; `delegationsGeschichte` wird erst ab dem Blackbox-Export befüllt, `notfallInstruktion` kommt später.

## Implementations-Verweis

Die Übergabe-Linie wird in Schritten umgesetzt; alle Commits lokal, kein Push.

**Schritt 1 — Sub-Depot-Passwort + Vertrauens-Modus:**
- **Commit:** *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)*, nur `vivodepot.html` (+277/−2).
- **Integrität:** `798e2c17…`.
- **VdCrypto-Block byte-identisch:** `6eb590b9…` (== `PORT-VERBATIM.js`) — kein zweiter Krypto-Pfad.
- **Verifiziert:** Krypto-Runde; Isolation (Anker-Passwort öffnet Sub-Depot nicht); Nicht-Persistenz (Sub-Passwort/Sub-Key nirgends serialisiert, nicht-extrahierbar, keine localStorage-Nutzung); Versiegelungs-/Öffnungs-Anzeige. Sub-Ableitung seitenwirkungsfrei (`deriveMasterBits`+`importMasterHkdfKey`).

**Schritt 2 — Blackbox-Export:**
- **Kern-Commit:** *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)* (+100). **Suite-Commit:** *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)* (`tests/blackbox-export.test.js`, vier Klasse-A).
- **Verifiziert:** Roundtrip mit eigenem Sub-Passwort; Isolation (Anker-Passwort entschlüsselt die Datei nicht); kein Re-Encrypt (`ct` byte-identisch zum Quell-Umschlag); kein Schlüssel/Passwort in der Datei; Audit-Eintrag `'blackbox-export'` am Anker, nicht in der Datei.

**Schritt 2b — Aushäng-Akt (getrennt, bestätigt, archiviert):**
- **Kern-Commit:** *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)* (+173). **Suite-Commit:** *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)* (`tests/aushaeng-akt.test.js`, zwei Klasse-A).
- **Integrität:** `1e0ba81c…`.
- **Verifiziert:** Export hängt nicht aus; Aushängen ist getrennt und bestätigt; Audit anhängend mit konkreter Person (Export-Eintrag bleibt, Aushäng-Eintrag kommt hinzu); kein Re-Export aus dem Archiv ohne Reaktivierung; Umschlag im Archiv erhalten; Aushängen ohne Sitzungs-Akteur und Doppel-Aushängen werfen.

**Schritt 3 — Einhängen (Empfänger-Seite):**
- **Kern-Commit:** *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)* (+174/−4). **Suite-Commit:** *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)* (`tests/einhaengen.test.js`, zwei Klasse-A).
- **Integrität:** `0b0b1e25…`.
- **Verifiziert:** voller Rundlauf über den echten Export-Pfad (anlegen → exportieren → einhängen → mit eigenem Sub-Passwort öffnen, Klartext-Marker restauriert); kein Re-Encrypt (`ct` byte-identisch von Quelle über Datei bis eingehängten Eintrag); Isolation (Anker-Passwort der Empfängerin öffnet nicht); Untrusted-Input-Prüfung (sechs fehlerhafte Varianten plus null abgelehnt, base64-Zeichensatz vor Dekodieren); Audit `'eingehaengt'` mit konkreter Person, anhängend; Einhängen ohne Sitzungs-Akteur wirft; `depotUUID`-Kollision abgefangen.

Block-Hash über alle Schritte unverändert `6eb590b9…f56d05`. **Das Übergaben-Modul ist vollständig: Anlegen → Export → Aushängen → Einhängen.**

## Offene Folge

Schritt 2 (Blackbox-Export) und Schritt 3 (Einhängen) bauen auf dieser Mechanik auf. Das externe Krypto-Audit aus `ADR-068 v2` gilt unverändert.

## Konformität

```konformitaet
aussage:   U2-003: Sub-Passwort und der davon abgeleitete Schlüssel sind nie persistent — durchgesetzt
           über die Z2-Storage-Grenze (keine Bürgerdaten-Persistenz außerhalb der Allowlist; das
           allowlistete IDB-Depot ist verschlüsselt). Jede nicht-allowlistete Persistenz → Z2 rot.
zustand:   prüfbar
pruefung:  tests/zusicherungen-scanner.test.js#Z2-Storage-Grenze ausgefuehrt und gruen (Verweisziel Stufe 3a)
quelle:    invariante
```

*Verweis-Bindung nachgetragen 25.07.2026 (Stufe 3a der 26-Verbote-Strecke), über `tests/bindung-pruefen.js`.
Z2 läuft seit Stufe 1b-2 in jedem `npm test`; sein Gate-Nachweis existiert (Z2-Negativprobe: fingierter
`localStorage`-Zugriff → rot). Geltungsbereich: Z2 erzwingt die Storage-Ausgangs-Grenze; dass der
Sub-Passwort-Wert nicht ins verschlüsselte Depot geschrieben wird, folgt aus der Laufzeit-Ableitung
(Code-Fakt), nicht aus Z2.*
