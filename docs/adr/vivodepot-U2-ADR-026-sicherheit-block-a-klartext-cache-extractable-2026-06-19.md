# U2-ADR-026: Sicherheit Block A — Stufe-1-Klartext-Cache (offener Zielkonflikt) + Schlüssel-Extrahierbarkeit bestätigt

**Status:** Akzeptiert (Negativ-Tests fixiert; A1-Zielkonflikt offen — Produktentscheidung)
**Datum:** 19.06.2026
**Kategorie:** SICHERHEIT
**Grundlage:** Krypto-Gutachten-Mängelliste 19.06. (Befund 4.1 Stufe-1-Plain-Cache, Befund 2.4 extractable).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `NOTFALL_KERN_FELDER` (Allowlist), `notfallCacheBauen`/`notfallCacheAusUmschlag` (Z.6106/6111), `depotSerialisieren` (Z.5175 `notfallCache`); `importMasterAesKey` (Z.2216), `deriveSubKey` (Z.2286), `deriveDepotKeyV2` (Z.2312) — alle `extractable:false`.
- **Sprint-Commit:** dieser Bau (Sicherheits-Kette Block A).
- **ADR-Bezug:** dieser ADR (U2-ADR-026).

**Status heute:** gilt — Beleg `tests/krypto-verbote.test.js` (u2-062-Aussagen, rot⇄grün gebunden);
A1-Zielkonflikt bleibt offen, unverändert.

---

## A1 — Stufe-1-Plain-Cache (Befund 4.1): bewusste Allowlist-Ausnahme, KEIN Leck

Gemessen am Code: Der Klartext-Cache wird beim Speichern aus **ausschließlich** der Allowlist `NOTFALL_KERN_FELDER` erzeugt (`notfallCacheBauen` → `notfallKernModell`) und neben dem Ciphertext in den Umschlag gelegt (`depotSerialisieren`, Z.5175). Gelesen wird er **ohne Passwort** über `flowNotfallAusDatei` (Welcome → „Notfall aus Datei").

- **(a) Felder im Klartext:** identitaet `vorname`/`nachname`/`geburtsdatum`; gesundheit `blutgruppe`/`allergien`/`medikamente`/`krankheiten`/`hauptpflegeperson`; vorsorge `organspende`/`patientenverf_ort` (10 Felder).
- **(b) Erzeugung/Lage:** beim Speichern, als Klartext-Feld `notfallCache` **im Umschlag** neben dem Ciphertext.
- **(c) Lesepfad ohne Passwort:** ja — `flowNotfallAusDatei` (Sanitäter-Stufe).
- **(d) Bewertung:** **bewusster, dokumentierter Notfall-Schnellzugriff** (Kommentar Z.6100–6105: „Bewusste, dokumentierte Ausnahme — kein Bruch der Krypto"). **Kein Leck über das Notfall-Subset hinaus** (gemessen + Negativ-Test: ein Finanz-Wert liegt nicht im Klartext, nur im Ciphertext).

**A1-STOPP (Zielkonflikt, Produktentscheidung):** Da es ein bewusster Schnellzugriff ist (kein Bug), wurde **nichts geändert**. Offen ist, ob die zehn Notfall-Felder weiter unverschlüsselt für den Ernstfall verfügbar bleiben (lebensrettend, aber Art-9-Daten ohne Passwort lesbar bei verlorenem Stick) oder enger gefasst/abgelöst werden (z. B. zugunsten der Notfallkarte). Reiner Befund, keine Vorab-Entscheidung.

## A2 — Schlüssel-Extrahierbarkeit (Befund 2.4): bereits sicher, kein Fix

Alle Geheim-Schlüssel sind `extractable:false` (gemessen): PBKDF2-Basis (Z.2203), HKDF-Basis (`importMasterHkdfKey` Z.2223), Master-AES (`importMasterAesKey` Z.2216), Sub-AES v1 (`deriveSubKey` Z.2286), Depot-AES v3 (`deriveDepotKeyV2` Z.2312). Der einzige `extractable:true` ist der **öffentliche** JWS-Verify-Key (Z.2462) — unbedenklich (öffentlicher Schlüssel). **Kein Code-Fix nötig.**

## Konsequenzen

- **Kein Code-Eingriff in Block A** — Befund + drei Negativ-Tests als stehender Regression-Schutz: (1) Nicht-Notfall-Feld nicht im Klartext, (2) Depot-Schlüssel nicht exportierbar (`exportKey` wirft), (3) kein Fremd-Wert im Notfall-Cache.
- **Krypto unberührt:** Block-Pin `8d31c678…` unverändert (nur Tests). Block-Integrität 2/0.
- **Offen:** A1-Zielkonflikt (Stufe-1-Cache) — Produktentscheidung.

## Implementations-Verweis
Tests: neu `sicherheit-block-a.test.js` (3 Negativ-Tests, je mit Gutachten-Befund-Kommentar). Kein `vivodepot.html`-Eingriff.

## Konformität

```konformitaet
aussage:   U2-062 (Cache-Inhalt-Hälfte): der Angehörigen-Cache trägt nie Master-Schlüssel, Passwort oder
           das volle Depot — angehoerigenCacheModell() baut einen geprunten Subset (Fünf-Blatt-Allowlist
           + Identitäts-Name), kein `subset = data`, kein Schlüssel-/Passwort-Feld.
zustand:   prüfbar
pruefung:  tests/krypto-verbote.test.js#u2-062-angehoerigen-cache-ohne-schluessel-und-volldepot
quelle:    invariante
```

```konformitaet
aussage:   U2-062 (Schlüssel-Hälfte) / §A2: geheime und private Schlüssel sind nie extrahierbar — jeder
           importKey-Aufruf mit deriveBits/deriveKey/encrypt/decrypt/sign trägt extractable=false; nur
           reine verify-Schlüssel (öffentlich) dürfen true tragen.
zustand:   prüfbar
pruefung:  tests/konformitaet/extractable-inventur.js#[Konformität] Runtime: alle geheimen/privaten CryptoKeys sind extractable:false
pruefung:  tests/krypto-verbote.test.js#u2-062-geheime-schluessel-nie-extrahierbar
quelle:    invariante
```

*Bindungen nachgetragen 25.07.2026 (Stufe 6 der 26-Verbote-Strecke), über `tests/bindung-pruefen.js`.
U2-062 ist **zweigeteilt** gebunden: die Cache-Inhalt-Hälfte an einen neuen Always-on-Test, die
Schlüssel-Hälfte in **Bindungsart B** — Verweis auf den ausgeführten Runtime-Teil der
extractable-Inventur (pre-push + CI-konformitaet) **plus** ein additiver Always-on-Statik-Test, weil die
Inventur nicht über `npm test` läuft.*

***Befund beim Anker-Messen (25.07.) — und seine Folge:*** *`extractable` ist in der Web-Crypto-API
**positional** (4. Argument von `importKey`/`generateKey`/`deriveKey`) — im Kern existiert **kein
einziges** `extractable:`-Literal. Der frühere **Statik**-Teil der Inventur suchte `extractable:\s*true`
und konnte deshalb **nie** anschlagen (vakuum-grün: immer grün, ohne etwas zu messen). Er wurde am
25.07.2026 **entfernt** (Vermerk im Kopf von `tests/konformitaet/extractable-inventur.js`, damit er nicht
„reparierend" wiederkehrt). **Die Abdeckung ist dadurch nicht kleiner, sondern echt geworden:** die
Laufzeit-Seite trägt der **Runtime**-Teil der Inventur, die statische Seite der Always-on-Test
`u2-062-geheime-schluessel-nie-extrahierbar`, der die **echte Form** prüft (Argument-Position +
`usages`) statt eines Musters, das die API gar nicht erzeugt. Beide sind oben als `pruefung:` gebunden.*
