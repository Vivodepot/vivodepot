# U2-ADR-038 — CRL/Widerruf: ablaufbasiertes Vertrauen (Option C)

**Datum:** 24.06.2026
**Status:** Akzeptiert · 24.06.2026 (Produktentscheidung) · Umgesetzt (nbf/validFrom-Härtung), 26.06.2026 — s. Umsetzungs-Vermerk am Ende. Löst Entscheidung 0.1, schaltet Trust-Schicht 1D frei.
**Nummer:** U2-ADR-038 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-037).
**Typ:** Grundsatz-Entscheidung (Trust-Strategie).
**Bezug:** Trust-Strecke 1A (produktiver Vertrauensanker), 1B (zweistufige Signatur-Kette); `_verifyJWS` (JWS-Block, byte-identisch über alle vier Komponenten); Befund Export-Pfad & Zertifikats-/Template-Provenienz (24.06.); U2-ADR-037 (Daten-Verbleib der Template-Felder); `connect-src 'none'` / Offline-Reinheit.
**Status heute:** gilt — Beleg `tests/sonderfall-verbote.test.js#u2-038-kein-aktives-widerrufsverfahren`.

---

## Kontext

Trust-Schicht 1D fragt: Wie verliert ein kompromittierter oder unseriös gewordener Anbieter das Vertrauen wieder? Der klassische Weg — eine aktive Sperrliste (CRL) — verlangt entweder einen Online-Check oder eine eingebettete Liste. Beides steht in Spannung zur Kern-Eigenschaft der App: vollständig offline (`connect-src 'none'`), ein einzelnes HTML-Dokument ohne Server-Rückkanal. Entscheidung 0.1 stand zwischen aktivem Widerruf und einem zeitbasierten Modell. Vor der finalen Wahl wurde der Export-Pfad geprüft (Befund 24.06.): Er ist nicht zertifikats-gebunden — reine Werte, keine Ablaufprüfung, kein Signieren —, ein abgelaufener Zertifikats-Kontext kann also nicht „über den Export" als gültig erscheinen.

## Entscheidung

**Kein aktives Widerrufs-Verfahren (CRL). Das Vertrauen läuft zeitbasiert ab.** Provider-Zertifikate gelten **18 Monate** (Code-Default `ABLAUF_MONATE_DEFAULT = 18`, `vivodepot-vc-issuer.html`); ein kompromittierter oder unseriös gewordener Anbieter verliert das Vertrauen automatisch beim Ablauf seines Zertifikats. Die Prüfung erfolgt beim **Import**: `_verifyJWS` prüft das Ablaufende (`expirationDate`/`validUntil`/`exp`) und weist abgelaufene Credentials ab.

**Zusätzlich:** den Gültigkeits**beginn** (`nbf`/`validFrom`) hart prüfen — ein Zertifikat vor seinem Beginn wird abgelehnt. Wenn das Vertrauen ein Zeitfenster hat, gelten beide Ränder, nicht nur der hintere. Mirror zum exp-Zweig, Null-Toleranz (kein Clock-Skew — `exp` nutzt heute auch keinen), eng auf `validFrom`/`nbf` (nicht `issuanceDate`, das nur der Ausstell-Zeitpunkt ist).

## Begründung

- **Offline-Reinheit gewahrt.** Eine aktive CRL bräuchte entweder einen Online-Check (bricht `connect-src 'none'` frontal — widerspricht der Produktphilosophie) oder eine eingebettete Liste, die nur so frisch ist wie das letzte App-Update (schwacher, träger Widerruf + Listen-Pflege). Der ablaufbasierte Weg bleibt vollständig offline.
- **Schon halb gebaut.** `_verifyJWS` prüfte das Ablaufende bereits; 1D ergänzt nur den symmetrischen Beginn-Rand.
- **Export nicht zertifikats-gebunden** (Befund 24.06.): keine Export-Ergänzung für C nötig. Die Format-Exporte schließen verifiziert-stämmige Werte sogar aktiv aus (Wahrheits-Filter, U2-ADR-030).
- **Template-Felder reine Struktur** ohne Gültigkeits-Bindung (U2-ADR-037): nach Ablauf veraltet maschinell nichts an ihnen.
- Verworfen: **CRL online** (bricht Offline-Reinheit) und **CRL eingebettet** (schwacher Widerruf, Pflegeaufwand ohne echten Nutzen).

## Konsequenzen

- 1D wird ablaufbasiert gebaut, nicht als CRL-Mechanik. Nach der nbf-Härtung ist die 1D-**Code**-Schicht vollständig: kein Sperrlisten-Code, kein Online-Check.
- Die 18-Monate-Voreinstellung ist die fachliche Stellschraube des Vertrauens-Zeitfensters; sie lebt als Default im Issuer und ist pro Ausstellung übersteuerbar.

## Der ehrliche Preis (muss nach außen stehen)

Kein sofortiger Widerruf. Ein gestohlener Anbieter-Schlüssel bleibt bis zu 18 Monate gültig (bzw. bis zum Ablauf). Das ist im Trust-Framework und auf der Website ehrlich zu formulieren: **„Vertrauen läuft zeitbasiert ab"**, nicht „sofortiger Widerruf". Die Anbieter-Meldepflicht bei Kompromittierung bleibt im Vertrag; die technische Durchsetzung ist zeitbasiert.

## Spätere Erweiterung (nicht jetzt)

Option D (eine zusätzlich eingebettete Notfall-Liste neben dem Ablauf) bleibt als spätere Ergänzung möglich, falls ein realer akuter Fall sie verlangt. Jetzt nicht gebaut — Komplexität ohne aktuellen Bedarf.

## Offen (nach Umsetzung)

- Nicht-Code: Außen-Wortlaut „Vertrauen läuft zeitbasiert ab" im Trust-Framework + auf der Website verankern.
- Clock-Skew bleibt bewusst bei null (beide Ränder hart). Eine Toleranz (z. B. ±60 s) wäre eine eigene, spätere Entscheidung, die auch `exp` beträfe.

## Umsetzungs-Vermerk (nbf/validFrom-Härtung, 26.06.2026)

- `_verifyJWS` um einen zum exp-Zweig **symmetrischen Vorgültigkeits-Zweig** ergänzt: `beginn = validFrom (VC 2.0) || nbf (JWT-Sekunden)`; vor dem Beginn → `{ gueltig:false, vorGueltigkeit:true, grund:'JWS: noch nicht gültig (…)' }`. Null-Toleranz, `issuanceDate` bleibt ungeprüft.
- Da `_verifyJWS` **im byte-identischen JWS-Block** sitzt: identisch in **allen vier** Komponenten editiert (Bürger-App, Lese-App, VC-Issuer, Template-Generator); Block-Hash über alle vier gleich (verifiziert). **T-A-06** (Issuer) + **T-A-08** (Generator) Byte-Identität grün.
- Doc-Kommentar korrigiert: `validFrom`/`nbf` werden jetzt geprüft; `issuanceDate` (Ausstell-Zeitpunkt, kein Gültigkeits-Rand) nicht.
- Tests: **T-A-03b „Vorgültigkeit"** in `jws-fundament` + `vc-issuer` (Zukunfts-`validFrom` und Zukunfts-`nbf` → abgelehnt; `validFrom` in der Vergangenheit → gültig).
- Gates: Suite 1056/1057 grün (1 pre-existing skip); **VdCrypto-Block-Pin `8d31c678…` unberührt**; `vivodepot.html.sha256` nachgezogen. Lokaler Commit, kein Push.

## Nachtrag (1F — Basis-/extern-Trennung, 2026-06-29)

Die obige 18-Monats-Regel galt **undifferenziert für alle** Provider-Zertifikate. Beim Bau der eingebetteten Basistemplate-Certs (U2-ADR-040) zeigte sich der Konflikt: ein eingebettetes Cert läuft nach demselben Mechanismus ab wie ein externes — nur trifft es die fest in die App eingebackenen amtlichen Vorlagen, die ein Offline-Bürger mit alter App-Version dann verlöre. Das hatte dieses ADR nicht bedacht (es behandelte Fremd-Anbieter-Widerruf). Entscheidung (2026-06-29), gebaut als „Option 2 — Trennung vor dem Einbacken":

- **(a) Laufzeit-Trennung.** Eingebettete Basis-/Behörden-Certs (`anbieterTyp` beginnt mit `behoerde`) sind vom 18-Monats-Default ausgenommen und tragen eine **lange** Laufzeit (`ABLAUF_MONATE_BASIS = 120` = 10 Jahre, Issuer-Automatik in `baueProviderVC`). **Externe Anbieter behalten 18 Monate** — das „Ablauf = Widerruf"-Prinzip dieses ADR bleibt für Fremd-Anbieter unverändert scharf. Manuelle Übersteuerung (`opts.expirationDate`) bleibt möglich.
- **(b1) Ablauf-Vorwarnung.** Die Bürger-App warnt vor Ablauf der eingebetteten Basis-Certs (fixierter Banner, `< 90` Tage); offline, liest nur das eingebettete `expirationDate`.
- **(b2) Schonfrist mit Marker (nur Basis).** Läuft ein eingebettetes Basis-Cert dennoch ab, verschwinden die vier amtlichen Vorlagen **nicht still** (so wäre das heutige Verhalten): sie bleiben sichtbar, markiert „veraltet — App aktualisieren". Wirkt **ausschließlich** auf Basis-Certs (lebt in `basisVorlagenVerifizieren`); externe (`importPlanGeprueft`) bleiben hart abgelaufen. Nutzt das vorhandene `r.abgelaufen`-Feld aus `_verifyJWS` (kein Block-Touch).
- **(b3) Notfall-Sperrliste — „Option D" aktiviert (leer).** Der oben unter „Spätere Erweiterung" genannte Mechanismus ist jetzt gebaut: eine eingebettete `WIDERRUFS_LISTE` (RFC-7638-JWK-Thumbprints) im gemeinsamen Trichter `verifiziereProviderCredential`; deckt Basis **und** extern an einer Stelle. Liste vorerst **leer** — Befüllung + Pflege-Workflow kommen mit dem ersten externen Anbieter. **Widerruf schlägt Schonfrist**: ein widerrufenes Cert bekommt nie die b2-Schonfrist (Widerruf-Check läuft auch auf abgelaufenen, signatur-gültigen Certs).

Block-Grenzen: alles in der App-/Trust-Schicht über dem JWS-Block; `_verifyJWS`/VdCrypto-/JWS-Block **unberührt** (`8d31c678…` in 5+ Tests grün, T-A-06-Byte-Identität grün). Tests: 1F-Block in `trust-basistemplate-signatur.test.js` + `vc-issuer.test.js`. Suite 1087/1088 grün (1 pre-existing skip); `vivodepot.html.sha256` nachgezogen.

**Offen (Backlog):** Die 120 Monate sind heute pragmatisch **ohne Policy-Grundlage** — sie gehören an eine TA-Key-Rotations-Policy gebunden (die `kid …v1-11052026` impliziert Versionierung, eine geschriebene Policy fehlt).

## Nachtrag (Reichweite präzisiert durch U2-ADR-186, 2026-09-01)

Alle Regeln oben (18-Monate-Ablauf, b3-Widerrufsliste, „Widerruf schlägt Schonfrist") beschreiben
den **Import-Pfad** — `verifiziereProviderCredential` / `_verifyJWS`, an der Tür. Sie sagen nichts
darüber, was mit einem Modul geschieht, das diese Prüfung bereits bestanden hat und im Depot
liegt: der Ladeweg (`depotLaden` und die fünf Andockwege) fragt beim Öffnen eines Bestandsdepots
kein Zertifikat, keine Sperrliste, keinen Ablauf — s. U2-ADR-186. Ein widerrufenes oder abgelaufenes
Zertifikat verhindert also einen **neuen** Einlass, entfernt aber kein bereits eingelassenes Modul.
Dieses ADR bleibt für den Import-Pfad unverändert gültig — **kein Ablösen, nur eine benannte Grenze.**

## Konformität

```konformitaet
aussage:   U2-038: kein aktives Widerrufs-Verfahren — das Vertrauen ist ablaufbasiert; die Sperrliste
           ist EINGEBETTET (`WIDERRUFS_LISTE`, Object.freeze) und wird nie abgerufen (kein CRL-/OCSP-
           Endpunkt, kein Nachladen einer Sperrliste).
zustand:   prüfbar
pruefung:  tests/sonderfall-verbote.test.js#u2-038-kein-aktives-widerrufsverfahren
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (Stufe 7). Ausdrücklich NICHT unter einer Netz-Zusicherung gebunden:
das Verbot ist eine Widerrufs-Modell-Entscheidung; dass ein CRL-Abruf zusätzlich der Offline-Garantie
widerspräche, ist Folge, nicht der Verbotssatz (Listen-Klärung 25.07.).*
