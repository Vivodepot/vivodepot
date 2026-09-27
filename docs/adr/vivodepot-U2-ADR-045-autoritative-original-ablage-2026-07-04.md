# U2-ADR-045 — Autoritative Original-Ablage: extern ausgestellte FHIR-Dokumente verbatim (Datenklasse)

**Datum:** 04.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · 04.07.2026 (Bau umgesetzt, Suite/Gates grün; Annahme = Produktentscheidung). Schema-Bump 23 → 24.
**Nummer:** U2-ADR-045 (verifiziert: höchste belegte in `docs/adr/` ist U2-ADR-044).
**Typ:** Datenmodell-/Grundsatz-Entscheidung (neue Datenklasse „autoritatives Original").
**Bezug:** U2-ADR-042 (FHIR-Lab-Modul, self-erzeugtes Bundle-eu-lab) · U2-ADR-044 (SHL/xShare post-RC) · U2-ADR-013 (Dokumenten-Mappe, `ref:mappe`, inline-verschlüsselte Data-URL) · U2-ADR-005 (selbst-erklärter Akteur, Provenienz). [externer Vertragspartner]/xShare-Service-Agreement (Gazelle-Fenster **16.07. Laboratory Reports**, Upload Consumer + One-Time-Share). Gazelle-/Validator-Befund 03.07. (`Observation.performer = Patient` → harter Error).

**Status heute:** gilt — Beleg `tests/autoritativ-import.test.js` (22 Tests inkl. Löschbarkeits-Nachtrag).

---

## Kontext

Der xShare-Vertrag mit dem [externen Vertragspartner] verlangt für das **16.07.-Fenster** einen Gazelle-DONE_PASSED **Laborbericht** (HL7 Europe Laboratory Report). Der Validator-Lauf am 03.07. (echter `validator_cli.jar`, IG `hl7.fhir.eu.laboratory#2.0.0-alpha`) zeigte: das **selbst-erzeugte** `fhirLabBundle()` (U2-ADR-042) fällt an einem **strukturellen** Punkt durch — `Observation.performer` verweist auf den **Patienten**, das Profil verlangt Practitioner/Organization/PractitionerRole. Ein selbst-ausgestellter Laborbericht **kann** diese Prüfung nicht bestehen: der Wert eines Laborbefunds ist die **Attestierung durch das ausstellende Labor**.

Der vertragskonforme UND konformitäts-fähige Weg ist die **Upload-Consumer-Richtung**: ein **echtes, labor-ausgestelltes** Bündel wird **eingelesen** (das trägt das Labor als `performer` → konform). Der bestehende Import-Pfad ist dafür aber ungeeignet: `_fhirIpsFelder` (der einzige FHIR-Import) **flacht** ein Bündel auf Bürger-Textfelder und **verwirft** dabei FHIR-Struktur und Provenienz. Nach dem Import gäbe es kein Original mehr, das man konform weiterreichen könnte. Inventur 04.07.: Importe landen ausschließlich in `felder`/`listen`/`register` (`importAnwenden`); das Rohbündel wird nie abgelegt. Zugleich existiert mit der **Dokumenten-Mappe** (U2-ADR-013) bereits eine inline-verschlüsselte Blob-Ablage (`data.mappe[].inhalt` = base64-Data-URL, fährt mit `encryptDepot`/`decryptDepot`).

## Entscheidung

Eine **neue Datenklinie am Mappe-Eintrag: das autoritative Original** (Schema 24).

- Ein als **eu-lab `type=document`** erkanntes Bündel (Profil `Bundle-eu-lab`) wird **VERBATIM** als Mappe-Eintrag abgelegt — `inhalt` = das Roh-Bündel als base64-Data-URL, `mime: application/fhir+json` — **nicht** durch `_fhirIpsFelder` geflacht.
- Neue Eintrags-Felder: `autoritativ: true`, `aussteller` (best-effort aus Organization/Practitioner/Composition.author), `importDatum`, `gepruefteIG` (deklarierte Ziel-IG, z. B. `hl7.fhir.eu.laboratory#2.0.0`).
- **Autoritative Einträge sind read-only** — `mappeEntfernen` verweigert sie; es gibt keinen Edit-Pfad. Der Bürger *besitzt* das Original, verändert es aber nicht (Integrität der Attestierung).
- **Erkennung** über ein eigenes Import-Format `fhir-lab` (`autoritativDoc`), das VOR `fhir-ips` in der Registry steht (die Auto-Erkennung nimmt den ersten Treffer; `fhir-ips.erkennen` matcht jedes Bundle). Die Import-UI verzweigt bei `autoritativDoc` in den Ablage-Zweig (`flowImportAutoritativ`) statt in die Feld-Vorschau.
- **Migration 23 → 24:** bestehende Mappe-Einträge erhalten `autoritativ: false` (Selbst-Ablage). Additiv, idempotent, kein Datenverlust. `schemaVersion` ist informativ (kein Lade-Gate).

**Nicht in diesem Auftrag:** kein neuer Reiter/keine eigene Sicht (autoritative Einträge erscheinen in der bestehenden Mappe-Liste mit dem Marker „Original — nur lesbar"); **keine SHL-Payload**. Offen (separater Auftrag): der SHL-/One-Time-Share-Pfad liest den autoritativen Eintrag und reicht `inhalt` **verbatim** aus — das erhält den echten `performer` und damit die Konformität.

## Begründung

- **Provenienz ist die Konformität.** Genau das Element, das das selbst-erzeugte Bundle unkonform macht (`performer`), bringt ein echtes Bündel mit. Verbatim-Ablage bewahrt es; Flachlegen zerstört es. Import-nicht-Export ist dieselbe Logik wie beim mDL (der Wert liegt in der Behörden-/Labor-Signatur).
- **Andocken statt neu bauen.** Die Mappe hält bereits inline-verschlüsselte Blobs mit `mime`/`groesse`/`bereich`/Sensibel-Flag. Das autoritative Original ist eine additive Feld-Ebene darauf, kein zweiter Speicher.
- **Read-only schützt die Aussage.** Ein veränderbares „Original" wäre kein Original. Die Sperre in `mappeEntfernen` ist die minimale, harte Invariante (Edit gibt es ohnehin nicht).
- **Ehrliche Trennung der Datenklassen.** Selbst-erfasste Laborwerte (self-asserted, nie eu-lab-konform) und das eingelesene, labor-attestierte Original sind **verschiedene Dinge** und werden es im Modell auch. Das self-erzeugte `fhirLabBundle()` bleibt vorerst unangetastet (eigene Betrachtung).

## Konsequenzen

- **Positiv:** Der 16.07.-Weg wird über eine **echte, integrierte** Vivodepot-Funktion beschritten (echte Labordaten im verschlüsselten Tresor), nicht über ein Demo-Requisit. Das Original bleibt für einen konformen Share verfügbar.
- **Kosten/Risiko:** Ein autoritativer Eintrag speichert das volle Bündel (base64, ~+33 %) — vertretbar (Laborbündel sind klein). `gepruefteIG` ist die **deklarierte** Ziel-IG, keine Laufzeit-Validierung (der Browser validiert nicht; Gazelle/CI tun es hart). Die Bürgerin sieht kein „geprüft"-Siegel, das eine Prüfung vortäuscht.
- **Abgrenzung:** IPS-Import (`fhir-ips`, Flachlegen) bleibt unverändert für Patient-Summary-Übernahme; nur eu-lab-Dokumente zweigen ab.

## Verifikation

- Neu: `tests/autoritativ-import.test.js` (8 Tests) — Erkennung, Erkennungs-Vorrang vor `fhir-ips`, verbatim-Ablage (inhalt decodiert byte-genau zurück), KEIN Feld-Schreiben, Aussteller-Extraktion, read-only-Sperre, Schema-24-Default, verlustfreie 23→24-Migration.
- Node-Suite **1105/0/1** (Schema-Pins 23→24 nachgezogen: provenienz-snapshot, dokumente, export-durchgang, blackbox-export, einhaengen ×2, feldmodell-schema ×3). WCAG **33/0**. Block-Pin `8d31c678…` **unverändert** (Edits außerhalb des Krypto-Blocks). `vivodepot.html.sha256` nachgezogen. SW-Cache v4 → v5 (root + `pages/`).
- Kein Push (eine Produktentscheidung).

## Nachtrag (2026-07-12) — Löschbarkeit: „read-only" ≠ „nicht löschbar" (zweiter unentschiedener Default)

**Befund (read-only-Prüfung 12.07.):** Der ursprüngliche Guard `if (autoritativ) return false` in
`mappeEntfernen` war die **stille Ausweitung** einer Begründung, die nur eine Sache trug. „Read-only"
hieß hier „nicht **bearbeitbar**" (Integrität der Attestierung — ein veränderbares Original wäre keins).
Weil es **ohnehin keinen Edit-Pfad** gibt, war der **einzige praktische Effekt** des Guards das
**Löschverbot** — für das dieser ADR **nie argumentiert hat**. Dieselbe Klasse wie U2-ADR-077 (der
Klartext-QR): eine Begründung trägt eine Sache und wird stillschweigend auf eine zweite ausgeweitet.
**Zweiter unentschiedener Default an einem Tag.**

Verschärfend: die Mappe hatte **gar keinen Löschweg** — `mappeEntfernen` war **ohne UI-Aufrufer**, für
**keinen** Eintrag (auch nicht für gescannte Bilder/PDFs). Der Guard suggerierte Absicht, wo eine ganze
Funktion fehlte. „Nichts, was in die Mappe kommt, kommt wieder heraus" — im Konflikt mit der Kernzusage
**„es ist ihre Datei"**.

**Entscheidung (12.07.):** Die zwei Invarianten werden getrennt.
- **Nicht bearbeitbar bleibt** (byte-treuer Inhalt, solange gehalten — die Attestierungs-Integrität; es
  gibt weiterhin keinen Edit-Pfad, nichts zu bauen).
- **Löschbar wird JEDER Mappe-Eintrag** — autoritativ wie eigen. Der Guard fällt; ein Löschweg entsteht
  (Knopf im Vorschau-Modal → `flowMappeEntfernen`).
- **Zweistufige Bestätigung.** Eigene Uploads: schlichte Rückfrage. **Autoritative Originale: ehrliche
  WARNUNG, die nicht beschönigt** — „ein Original von einer Institution, nicht wiederherstellbar, evtl.
  nicht erneut anforderbar" (die Klinik gibt den Entlassbrief nicht auf Zuruf noch einmal heraus; was
  gelöscht wird, ist ggf. endgültig weg). „Löschen heißt löschen" — keine Halb-Löschung/Archivierung.
- **Kein stiller Verlust (geprüft + getestet):** übernommene Werte sind reine **Skalare** mit
  **akteur**-stämmigem Stempel (`eingabeArt:'import'`, `quelle:<Label>` — **keine** Mappe-id, nie
  `verifiziert`). `mappeEntfernen` dereferenziert nur `{ref:id}`-**Felder** (einziges: `profilfoto`),
  **nie** übernommene Werte. → Löscht die Bürgerin ein Original, aus dem sie Werte übernahm, **bleiben
  die Werte byte-gleich**; nur der Beleg (das Dokument) ist weg. Der `quelle`-Text überlebt als
  ehrlicher, aber nicht mehr öffenbarer Herkunfts-Hinweis — kein Datenverlust.

**Änderungen:** `mappeEntfernen`-Guard entfernt; STRINGS `mappeEntfernenKnopf/-Titel/-Frage/
-AutoritativWarnung/-Bestätigen`, `mappeEntferntToast`; `flowMappeEntfernen` + Knopf im Vorschau-Modal;
`markiereUngespeichert(1)` nach dem Löschen (die Löschung zählt als ungespeicherte Änderung — sonst ginge
sie beim Reload ohne Datei-Save verloren).

**Tests:** die zwei Pins umgeschrieben (autoritativ ist **entfernbar**); neu: Skalar-Überleben nach dem
Löschen (kein stiller Verlust) + `ref:mappe`-Dereferenzierung (`profilfoto`) trifft nur Verweise, nicht
Skalare. Suite **1346/0**, Block-Pin `8d31c678…` byte-identisch, PV-Golden 42/42, SW-Cache-Bump. **Kein Push.**
