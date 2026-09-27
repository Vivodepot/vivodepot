# Vier-Komponenten-E2E (Cross-Component-Verifikation)

**Stand:** 31.05.2026 · **Bezug:** Vier-Komponenten-Architektur (ADR-098), Anforderung
„Vier-Komponenten-E2E-Tests", T7 der Bürger-App-E2E.

Diese Test-Schicht verifiziert die Architektur **über die vier Komponenten hinweg** —
nicht jede Komponente für sich (das tragen ihre eigenen Klasse-A-Tests), sondern den
Beweis, dass das, was eine Komponente schreibt, von der anderen korrekt **gelesen,
signiert oder verifiziert** werden kann. Das ist die Schicht, die eine Compliance-Prüfung
am Ende sehen will: Die Architektur funktioniert als zusammenhängendes Ganzes.

Die vier Komponenten:

1. **Bürger-App** — `vivodepot.html`
2. **Lese-App** — `vivodepot-lesen.html`
3. **VC-Issuer** — `vivodepot-vc-issuer.html`
4. **Template-Generator** — `vivodepot-template-generator.html`

## Das Krypto-Block-Hash-Gate (der wichtigste Test)

Alle vier Komponenten tragen denselben **VdCrypto-Block** (Script 1) — byte-identisch,
SHA-256 `732ff4b0…`, gleich `vivodepot-krypto-kern-PORT-VERBATIM.js`. Genau deshalb kann die
Lese-App entschlüsseln, was die Bürger-App schreibt, und genau deshalb verifizieren alle
gegen denselben JWS-Block und denselben Test-Sentinel.

Solange das nicht maschinell geprüft wird, ist „vier Komponenten teilen denselben Krypto-
Stack" eine **Behauptung**. Das Hash-Gate macht sie zum **Beweis**: Es extrahiert den
VdCrypto-Block aus allen vier HTMLs und vergleicht ihn Byte für Byte — untereinander, gegen
die kanonische Quelle und gegen den erwarteten Hash. Weicht eine einzige Komponente ab,
schlägt der gesamte Lauf fehl mit der Meldung **„Krypto-Block-Drift erkannt — Architektur-
Vertrag verletzt"**.

Das Gate läuft an zwei Stellen:

- als **`node --test`-Test** (`T-CROSS-07-krypto-block-gate.test.js`) in der schnellen,
  offline laufenden Schicht-1-Suite — **bereits grün**, kein Browser nötig;
- als **`globalSetup`** der Playwright-Cross-Config (`support/krypto-gate.js`) — bevor ein
  einziger Browser-Kontext öffnet, sodass ein Drift den Browser-Lauf gar nicht erst startet.

## Die sechs Reisen

| Test | Reise | Kette | Verifikation |
|------|-------|-------|--------------|
| **T-CROSS-01** | Voll-Depot | Bürger-App → Lese-App | Werte feldweise, SNOMED-Anzeigename, Provenienz „von Marlies", Mappe |
| **T-CROSS-02** | Sub-Depot-Blackbox | Bürger-App → Lese-App | Sub-Format erkannt, Sub-Modus + Schieferblau (`#3d5878`), Inhalte feldweise |
| **T-CROSS-03** | Notfall-QR | Bürger-App → Lese-App | QR-Nutzlast programmatisch extrahiert, über „QR-Text einfügen" in die Notfall-Lese-Sicht |
| **T-CROSS-04** | Vertrauenskette | Generator → VC-Issuer → Bürger-App | Submission → VC mit Test-Sentinel signiert → Bürger-App verifiziert gegen eingebetteten Sentinel-Public-Key, Template akzeptiert |
| **T-CROSS-05** | Manipulation (Negativ) | wie 4, Payload manipuliert | Bürger-App **lehnt ab** (Signatur-Fehler) — der Negativ-Test, der beweist, dass die Prüfung greift |
| **T-CROSS-06** | Provenienz nach Anker-Wechsel | Bürger-App (Marlies → Anja) | Erste drei Felder „von Marlies", zwei neue „von Anja", PDF-Fuß „Erstellt von Anja" |

Dazu die beiden statischen Gates:

- **T-CROSS-07** Krypto-Block-Hash-Gate (siehe oben).
- **T-CROSS-08** Submission-Schema-Konsistenz: Das eingebettete Submission-Schema ist in
  Generator und VC-Issuer byte-identisch und stimmt mit `docs/template-generator/
  submission-schema.json` überein; das Beispiel-Paket validiert gegen beide Komponenten-
  Validatoren; ein manipuliertes Paket wird abgelehnt. Ergänzt T-A-05/T-A-06 der Säulen.

## Wie der Datei-Transfer simuliert wird

Playwright lädt zwei (oder bei Reise 4 drei) Single-File-HTMLs gleichzeitig in getrennten
Browser-Kontexten. Der Transfer zwischen ihnen — „per E-Mail / USB-Stick übergeben" — wird
über ein **tmp-Verzeichnis** nachgebildet: Kontext A fängt den Download auf und legt
die Datei in `os.tmpdir()` ab, Kontext B lädt sie von dort (`setInputFiles`). Kein
tatsächlicher Versand, kein Netz (`offline`-Kontext). Die tmp-Verzeichnisse werden nach
jeder Reise gelöscht.

Wo eine Reise einen Wert **programmatisch** braucht (Notfall-QR-Nutzlast, Signatur-
Verifikation, Anker-Wechsel), ruft sie über `page.evaluate` die bereits vorhandenen
**Top-Level-Funktionen der jeweiligen App** auf (im Browser globale `window`-Funktionen).
Das ist ein Test-Helfer **in die unveränderte App hinein** — die vier HTMLs werden nicht
angefasst. So extrahiert Reise 3 die QR-Nutzlast über `notfallKernText()`, verifizieren
Reise 4/5 über `verifiziereProviderCredentialGegenSentinel(jws)` und setzt Reise 6 den
neuen Anker über `akteurSelbstErklaeren(name)`.

## Ausführen

```bash
# Browser-freie Gates (sofort, offline) — Teil der Schicht-1-Suite:
npm test                      # alle Schicht-1-Tests inkl. T-CROSS-07 / T-CROSS-08
npm run test:cross:gates      # nur die beiden Cross-Gates (node --test, *.test.js)

# Die sechs Browser-Reisen (Browser-Binaries nötig — am Mac / in CI):
npm run test:e2e:install      # einmalig: npx playwright install chromium
npm run test:e2e:cross        # T-CROSS-01..06 über playwright.config.cross.js
```

## Sicherheit

- Ausschließlich **Test-Sentinel-Schlüssel**, nie Produktiv-Material (der Produktiv-Trust-
  Authority-Key liegt in Cold-Storage und kommt nie in CI-Pipelines).
- Kein Netz (`offline`-Kontext; `file://` genügt).
- Keine echten Personendaten/Codes in den Fixtures (außer der Test-Sentinel-Strecke).
- Zwischen-Artefakte (tmp) werden nach dem Lauf gelöscht.

## Umgebungs-Hinweis (wie T7)

`@playwright/test` und die Browser-Binaries waren in der Bau-Sandbox nicht beschaffbar
(npm/GitHub 403). Die Specs, die Config, die Fixtures und die GitHub-Action sind vollständig
und lauffähig gebaut; der erste echte Browser-Lauf passiert am Mac (mit Netz) oder in CI
(`.github/workflows/e2e-cross.yml`). Die **browser-freien** Gates T-CROSS-07 und T-CROSS-08
laufen bereits in der Schicht-1-Suite grün.
