# VC-Issuer — Bedienanleitung für die Trust-Authority-Operations

**Werkzeug:** `vivodepot-vc-issuer.html` (Komponente 3 der Vier-Komponenten-Architektur)
**Adressat:** Vivodepot-Trust-Authority-Operations-Personal — **nicht** Bürger, **nicht** Anbieter.
**Stand:** 31.05.2026

Dieses Werkzeug erzeugt aus einem Anbieter-Public-Key plus Anbieter-Metadaten ein
signiertes W3C Verifiable Credential — das **Provider-Zertifikat**
(`VivodepotProviderCredential`). Die Bürger-App verifiziert solche Zertifikate beim
Import von Anbieter-Templates und beim Empfang signierter Daten.

Es läuft vollständig **offline**: keine Netzwerk-Zugriffe zur Laufzeit, keine externen
Skripte, kein `localStorage`/`sessionStorage`/`IndexedDB`/Cookie. Die Krypto-Schicht ist
**byte-identisch** zur Bürger-App (VdCrypto-Block, Hash `732ff4b0…`) und teilt mit ihr den
gemeinsamen JWS-Block (`_signJWS`/`_verifyJWS`, RFC 7515 Compact).

---

## 1. Datei öffnen (auf dem dedizierten Operations-Gerät)

1. Nutzen Sie ein **sauberes, dafür dediziertes Gerät** (Cold-Storage-Prinzip), das den
   produktiven Trust-Authority-Private-Key trägt — kein Alltagsrechner.
2. Öffnen Sie `vivodepot-vc-issuer.html` **lokal** im Browser (Doppelklick / `file://`).
   Es wird **kein** Server benötigt; nichts wird nachgeladen.
3. Erkennen Sie sofort am **goldenen Banner „Trust-Authority-Modus"**, dass Sie im
   richtigen Werkzeug sind (die Bürger-App ist grün/Forest — nie verwechseln).

## 2. Issuer-Identifier prüfen (F-1)

Oben steht die Aussteller-Kennung, Default `did:web:vivodepot.de`. Dieser Wert geht in
jedes ausgestellte VC ein. Ändern Sie ihn nur, wenn die Operations-Entscheidung das
vorsieht. **Die finale Festlegung ist eine eigene Strecke vor produktivem Einsatz.**

## 3. Trust-Authority-Private-Key importieren (F-2)

1. Holen Sie den Private-Key **frisch aus dem Cold-Storage** (z. B. verschlüsselter
   USB-Datenträger / HSM-Export). Verbinden Sie ihn erst jetzt.
2. Wählen Sie unter **F-2** die Schlüssel-Datei (JWK bevorzugt, Ed25519 primär / ES256
   Fallback; PEM/PKCS#8 wird als Fallback akzeptiert).
3. Bestätigung erscheint: *„Trust-Authority-Schlüssel geladen. Algorithmus: …"*.
   Der Schlüssel wird als **nicht-extrahierbarer `CryptoKey`** gehalten — nie im Klartext
   im DOM, nie im Speicher zwischen Sitzungen.
4. **Sentinel-Schutz:** Erscheint eine **rote Markierung** *„Test-Sentinel-Key erkannt"*,
   ist dies ein **Test-Schlüssel**. Ausstellung ist erlaubt, aber jedes erzeugte VC ist
   nur für Tests verwendbar. Im Produktivbetrieb darf diese Markierung **nie** auftreten.

## 4. Anbieter-Daten erfassen

**Variante A — Submission-Paket (F-4, Standard für Pilot-Anbieter):**
Klicken Sie unter **F-4** auf die Paket-Auswahl und laden Sie die JSON-Datei aus dem
Template-Generator. Sie wird gegen das gemeinsame `submission-schema.json` validiert;
`anbieterId`, `anbieterName`, `anbieterTyp` und der Anbieter-Public-Key werden automatisch
übernommen. Bestätigen oder korrigieren Sie nur noch das **Ablaufdatum**.

**Variante B — manuell (F-5):**
Tragen Sie `anbieterId`, `anbieterName`, `anbieterTyp` ein und fügen Sie den
**Anbieter-Public-Key** als JWK ein (Textfeld oder Datei). Das **Ablaufdatum** ist mit
*Ausstellung + 18 Monate* vorbelegt und überschreibbar.

## 5. Zertifikat ausstellen (F-6) und visuell prüfen (F-7)

1. Klicken Sie **„Provider-Zertifikat ausstellen"**.
2. Das Werkzeug baut das VC (W3C VC Data Model 2.0), signiert es per JWS und zeigt unter
   **F-7** die wichtigsten Felder **lesbar**: Anbieter-Name, `anbieterId`, `anbieterTyp`,
   Ausstellungs-/Ablaufdatum, Signatur-Algorithmus, Test-Hinweis (rot).
3. **Prüfen Sie diese Felder vor dem Versand.** Stimmt etwas nicht, korrigieren Sie die
   Eingaben und stellen erneut aus.

## 6. Ergebnis-VC weitergeben

1. Klicken Sie **„VC herunterladen (JSON)"**. Dateiname-Konvention:
   `vivodepot-provider-cert-<anbieterId>-<issuanceDate>.json`.
2. Übergeben Sie die Datei dem Anbieter über einen **sicheren Übertragungsweg** (z. B.
   verschlüsselte Übergabe, signierte E-Mail, gesicherter Datenraum). Das VC ist öffentlich
   verifizierbar — es enthält **keinen** Private-Key —, aber Integrität des Transports
   bleibt Operations-Pflicht.

## 7. Private-Key wieder wegschließen

- Nach jeder Ausstellung gibt das Werkzeug den Schlüssel **automatisch frei** (die
  Key-Variable wird auf `null` gesetzt, der `CryptoKey` dereferenziert). Die Statuszeile
  bestätigt: *„Schlüssel wurde aus dem Speicher entfernt."*
- Mit **„Schlüssel freigeben"** können Sie das jederzeit auch manuell auslösen.
- **Trennen Sie den Cold-Storage-Datenträger** und schließen Sie ihn wieder weg.
- **Schließen Sie den Browser-Tab/das Fenster** — es bleibt nichts persistiert.

## 8. Sitzungs-Audit-Log archivieren

- Das Werkzeug führt ein **Sitzungs-Log im Speicher** (nicht persistent): pro Ausstellung
  Zeit, `anbieterId`, Submission-ID, Algorithmus und Test-Markierung.
- Klicken Sie am Sitzungs-Ende **„Audit-Log herunterladen (JSON)"** und legen Sie die Datei
  in der **Trust-Authority-Operations-Dokumentation** ab (revisionssicher).
- Das Log verschwindet beim Schließen des Tabs — laden Sie es **vorher** herunter.

---

## Sicherheits-Kurzregeln

- Nur auf dem dedizierten, sauberen Operations-Gerät öffnen.
- Private-Key **frisch** importieren, nach der Operation **freigeben**, Datenträger trennen.
- Rote Sentinel-Markierung im Produktivbetrieb ist ein **Stopp-Signal**.
- Felder unter F-7 **vor** dem Versand prüfen.
- Audit-Log **vor** dem Schließen herunterladen und archivieren.

## Offene Strecken (vor Produktiv)

- **Issuer-Identifier final festlegen** (F-1) — eigene Operations-Entscheidung.
- **Test-Sentinel → produktiver Trust-Authority-Key** — eigene Strecke; betrifft auch den
  eingebetteten Public-Key in der Bürger-App (nicht im Scope dieses Werkzeugs).
