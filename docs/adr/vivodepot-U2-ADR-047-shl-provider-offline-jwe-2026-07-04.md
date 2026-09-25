# U2-ADR-047 — SHL-Provider (Offline-Teil): JWE-Erzeugung + shlink:/-Payload aus dem autoritativen Original

**Datum:** 04.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · 04.07.2026 (Offline-Teil gebaut, Suite/Gates grün; Annahme + Krypto-Review = Produktentscheidung). Der Ablage-/Upload-Schritt bleibt bewusst offen.
**Nummer:** U2-ADR-047 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-046).
**Typ:** Interoperabilität/Krypto — SMART Health Links Provider (Erzeugung), Offline-Grenze.
**Bezug:** U2-ADR-045 (autoritative Original-Ablage — die Quelle des Klartexts) · U2-ADR-044 (SHL/xShare Scope, post-RC) · U2-ADR-042 (Lab-Modul) · JWS-Block (`d0541ea7…`, base64url-Helfer, read-only genutzt) · VdCrypto-Block (`8d31c678…`, NICHT berührt). Spec: SMART Health Links (VCI / hl7.org SMART Health Cards & Links, `links-specification.html`) · xShare-basiertes One-Time-Share (externer Vertragspartner). Spec-Recherche 04.07.
**Status heute:** gilt — Beleg `tests/shl-provider.test.js#[U2-ADR-047] JWE round-trip: dir/A256GCM entschlüsselt VERBATIM zum importierten Original`.

---

## Kontext

Der xShare-Vertrag verlangt „One-Time Share Smart Health Link Provider". Die Spec-Recherche 04.07. ergab: SHL setzt **immer** einen per HTTPS erreichbaren Ablageort voraus — entweder einen Manifest-Endpunkt (`POST`) oder, mit dem **`U`-Flag**, eine einzelne statische Datei (`GET`). Es gibt **keinen voll-serverlosen Modus**; der Payload wird nie inline im Link getragen. Der Schlüssel dagegen reist **im Link** (`key`-Feld), der Ablage-Host sieht nur Chiffre — er ist „not trusted to know the information".

Damit teilt sich der Provider-Weg sauber in **zwei Zonen**: (1) **Erzeugung** — JWE bauen, `shlink:/`-Payload + Schlüssel — ist **rein lokal** möglich (kein Netz, `connect-src 'none'` unberührt); (2) **Ablage** — die verschlüsselte Datei an eine HTTPS-URL bringen — braucht einen Host außerhalb des Offline-Kerns. Die Vertragszeile „the link is generated locally and never traverses a Vivodepot-operated server" deckt sich mit dem `U`-Flag-Modell: ein **dummer, nullwissender Statik-Host**, kein Vivodepot-Server.

Die Quelle des zu teilenden Dokuments ist der **autoritative Mappe-Eintrag** (U2-ADR-045) — das verbatim eingelesene, labor-attestierte Bündel (echter `performer`). Genau das erhält im Share die Konformität.

## Entscheidung

**Nur die Offline-Zone (1) wird gebaut. Die Ablage (2) ist eine bewusst OFFENE Schnittstelle.**

- **JWE compact** (RFC 7516): `alg: dir`, `enc: A256GCM`, `cty: application/fhir+json` über den **verbatim** aus dem autoritativen Eintrag decodierten Klartext (`_autoritativKlartext` entpackt die base64-Data-URL zurück in die Original-Bytes — **kein Neubau**). 96-bit-IV, 128-bit-Tag. Gebaut mit **WebCrypto** (`crypto.subtle.encrypt`, `crypto.getRandomValues`) — **nicht** über den VdCrypto-Pin-Block; base64url über die read-only genutzten JWS-Block-Helfer.
- **Schlüssel:** 32 Zufalls-Bytes je Aufruf, base64url = 43 Zeichen; reist im `shlink:/`-Payload (`key`).
- **`shlink:/`-URI:** `shlink:/` + base64url(JSON `{ url, key, flag:'U', label, exp }`). **`U`-Flag** (Direkt-GET, kein Manifest-Server); `exp` Default 7 Tage; `url` ≤128 Zeichen.
- **Upload/Ablage:** `shlDateiHochladen(jwe)` — **Signatur + Platzhalter, wirft** „TODO: Host offen, xShare-Klärung". `shlProviderErzeugen` orchestriert den vollen Weg und blockiert bewusst an diesem Stub. **Keine UI-Verdrahtung** (ohne Host kein durchlaufender Share).

## Begründung

- **Offline bleibt offline — an der richtigen Grenze.** Erzeugung + Verschlüsselung + Schlüssel entstehen lokal; der Kern lädt wegen `connect-src 'none'` selbst nichts hoch. Der einzige Netz-Punkt (Ablage) liegt außerhalb und ist erst gebaut, wenn der Host geklärt ist.
- **Konformität durch Provenienz.** Der JWE-Klartext ist das echte, labor-attestierte Bündel (U2-ADR-045) — der Share trägt den echten `performer`, nicht Selbst-Auskunft.
- **Zero-Knowledge-Host.** `U`-Flag + Schlüssel-im-Link ⇒ der Ablage-Host ist untrusted; er sieht nie Klartext. Das erlaubt später einen dummen Statik-Host statt eines Vivodepot-Servers.
- **Gleiche Primitive.** A256GCM ist AES-256-GCM — dieselbe Grundlage, die Vivodepot schon nutzt. Die JWE-Compact-Serialisierung ist von Hand gerollt (keine jose-Lib inline) — deshalb der Round-Trip-Test **und** die Empfehlung einer eigenen Krypto-Review.

## Konsequenzen

- **Offen (blockiert den Share):** WER hostet die verschlüsselte Datei? — technischer xShare-Kontakt. Bis dahin kein durchlaufender Share; der Offline-Teil ist fertig.
- **Nicht im Scope:** Consumer/Empfangs-Seite (SHL auflösen), UI-Verdrahtung, QR-Rendering des `shlink:/` (QR-Infra existiert bereits).
- **Krypto-Review empfohlen** (separat): hand-gerollte JWE-Serialisierung, IV-Einmaligkeit, Tag-Behandlung, AAD-Bindung.

## Verifikation

- `tests/shl-provider.test.js` (6 Tests): JWE-Round-Trip entschlüsselt **byte-verbatim** zum importierten Original (Kern-Beweis, ursprünglich gegen das IG-Beispiel Bundle-SimpleChemistryResultReport.json geprüft — als Fixture ins Repo kopiert, am 12.09.2026 durch ein selbst erzeugtes Profil-Bündel ersetzt, da byte-verbatim/profil-agnostisch keinen echten Inhalt braucht; s. `tests/fixtures/README.md`); `alg:dir`/`enc:A256GCM`/`cty` im Header, `encrypted_key` leer; `key` 43 Zeichen base64url; **frischer Schlüssel je Aufruf**; `shlink:/`-URI decodiert zu `{url,key,flag:U,label,exp}` + url-Grenze 128; Upload-Stub wirft TODO (voller Weg blockiert dort); nicht-autoritative Einträge werfen.
- Node-Suite **1111/0/1**. WCAG **33/0**. **Block-Pin `8d31c678…` unverändert**, JWS-Block read-only genutzt. `vivodepot.html.sha256` nachgezogen. Kein Push.

## Nachtrag (2026-07-12) — SHL-„Sicher weitergeben"-Affordance (Commit `7336cc5`, gepusht)

Der in diesem ADR offen gelassene Bürger-Weg ist als **Affordance** gebaut: am **autoritativen
Mappe-Eintrag** (importiertes Original, Klasse-4) erscheint **„Sicher weitergeben"** → `flowShlVorbereiten`
erzeugt **EINMAL** die JWE **lokal** und baut nach **manueller HTTPS-URL-Eingabe** den `shlink:/`.

- **Experimentell + manueller Host.** Das Hochladen der JWE ist **extern** (SFTP auf **IONOS**,
  von Hand); die URL wird danach von Hand eingegeben. Der Host ist ein **Testaufbau, keine Architektur** —
  der Ablage-Weg ist als eigene ADR-Schuld benannt (dated ADR + Ablauf-Trigger, Master-Briefing v1.37).
- **Offline-Invariante gewahrt.** Die App lädt **nicht selbst** hoch: `connect-src 'none'`;
  `shlDateiHochladen` bleibt **bewusst Stub**. Der `shlink:/` entsteht rein lokal aus der lokal erzeugten
  JWE — **kein Netzaufruf der App**.
- **Auflagen:** URL **≤128 Zeichen** (`shlUriBauen` wirft sonst), unrätbar, zeitbegrenzt (`exp` 7 Tage;
  statisches Hosting = kein Auto-Löschen → Datei nach Test von Hand entfernen). „One-Time" ist damit
  best-effort.
- **Ende-zu-Ende belegt (12.07.):** am Gerät „Sicher weitergeben" erzeugt; JWE auf IONOS (GET 200,
  intakter JWE `dir`/`A256GCM`); **Receiver-Simulation** (Standard-RFC-7516, unabhängig): shlink decodiert
  → JWE geholt → AES-256-GCM entschlüsselt (GCM-Auth grün) → Klartext = eu-lab-Bündel „Laboratory Report
  of Villa Marta", 135 mg/dl. Browser-verifiziert (lokale Preview): Modal, `shlink:/{url,key(43),flag:U,
  label,exp}`, >128 → Fehler.
- **SHL-Krypto** wartet weiter auf **externen Review** (hand-gerollte JWE, s. oben). SW-Cache v50 zur Bauzeit.

## Konformität

```konformitaet
aussage:   Der JWE-Round-Trip (dir/A256GCM) entschlüsselt byte-verbatim zum importierten
           autoritativen Original — kein Neubau des Klartexts, echte Provenienz.
zustand:   prüfbar
pruefung:  tests/shl-provider.test.js#[U2-ADR-047] JWE round-trip: dir/A256GCM entschlüsselt VERBATIM zum importierten Original
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*
