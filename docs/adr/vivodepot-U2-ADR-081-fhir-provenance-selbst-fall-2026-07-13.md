# U2-ADR-081 · FHIR-Provenance im IPS-Bundle — auch im Selbst-Fall (letzter Clean-Slate-Verlust)

**Status:** Akzeptiert · 13.07.2026 (Bau umgesetzt, Suite/Gates grün)
**Nummer:** U2-ADR-081 (bestätigt gegen `docs/adr/` — höchste belegte war U2-ADR-080).
**Typ:** Funktions-Wiedereinbau (im Clean-Slate fallengelassene Fähigkeit) — der **dritte und letzte** der drei Clean-Slate-Verluste des Zusagen-Audits.
**Nimmt wieder auf:** ADR-063 (FHIR-Provenance im IPS-Bundle) — interne Reihe.
**Baut auf:** U2-ADR-079 (delegierter IPS-Export mit RelatedPerson + delegierter Provenance).
**Verwandt:** Zusagen-Audit 12.07. Kategorie 0.3; U2-ADR-005 (Provenienz pro Datensatz, App-intern).
**Status heute:** gilt — Beleg `tests/fhir-ips-delegiert.test.js`; erweitert am 09.10.2026 (Nachtrag: Herkunft je Ressource, `tests/herkunft-je-ressource.test.js`).

---

## Kontext

Der Zusagen-Audit fand drei Fähigkeiten, die der Clean-Slate-Neubau fallengelassen hat, ohne dass ein Rücknahme-ADR sie trägt (Kategorie 0). Zwei sind erledigt:

- **0.2 HL7-V3-RoleCode / RelatedPerson** — gebaut in U2-ADR-079.
- **0.1 EUDIW-Trust-Schicht** — als Nicht-Entscheidung geschlossen in U2-ADR-080 (der Fluss existiert nicht).

Der dritte:

- **0.3 FHIR-Provenance im IPS-Bundle (ADR-063).** b16 baute Provenance-Ressourcen in den IPS-Export; der Clean-Slate: `fhirIpsBundle` **ohne jede Provenance**. U2-ADR-079 hat die Provenance für den **delegierten** Fall wieder eingebaut (agent.who = RelatedPerson, onBehalfOf = Patient). Der **Selbst**-Fall — die Bürgerin exportiert ihre eigene Patientenkurzakte — trug weiter **keine** Provenance.

Damit war die Herkunft eines IPS-Bundles nur im Vertretungsfall dokumentiert, im Regelfall nicht. Ein Dokument ohne Zusammenstellungs-Spur sagt nicht, wer es zusammengestellt hat — dabei ist genau das die Aussage, die Vivodepot über seine Exporte machen können soll (Provenienz-Doktrin, App-intern seit ADR-005).

---

## Entscheidung

**Jedes IPS-Bundle trägt genau eine Zusammenstellungs-Provenance.**

- **Selbst-Fall** (kein `opt.anker`): `agent.who` = **Patient** — die Bürgerin hat selbst zusammengestellt. **Kein** `onBehalfOf` (sie handelt für sich selbst). Narrativ „Zusammengestellt von der Patientin selbst."
- **Delegierter Fall** (`opt.anker`): unverändert aus U2-ADR-079 — `agent.who` = RelatedPerson, `onBehalfOf` = Patient.

In beiden Fällen: `target` → Composition, `recorded` = Export-Zeitstempel, `agent[0].who` = die handelnde Person. Die Provenance ist der **letzte** Bundle-Eintrag (nach Composition + Sektions-Ressourcen; im delegierten Fall nach der RelatedPerson).

### Zuschnitt — bewusst klein

Nur die **Bundle-Assembly-Provenance** (eine Ressource pro Bundle, die die Zusammenstellung des Dokuments bezeugt). **Nicht** die volle ADR-063-Option-A:

- **keine** Provenance pro Einzel-Ressource (Allergie/Medikament/Diagnose),
- **kein** inline-CodeSystem,
- **keine** URN-Policy-Codes.

Das ist der bestätigte Scope („eine Provenance, spiegelbildlich zur delegierten aus U2-ADR-079, `agent.who` = Patient — nicht die volle Option A"). Rein intern, kein öffentliches Versprechen hängt daran. Die schwereren ADR-063-Teile bleiben, falls je gebraucht, Folge-Arbeit — sie sind hier ausdrücklich **nicht** zugesagt.

### FHIR-Konformität

In einem Dokument-Bundle ist eine Provenance, deren `target` die Composition (oder eine Dokument-Ressource) ist, **ausdrücklich erlaubt**, auch wenn sie nicht von der Composition referenziert wird — sie bezeugt die Zusammenstellung des Dokuments selbst. Das gilt im Selbst- wie im delegierten Fall. Der Patient bleibt `Composition.subject` und im Selbst-Fall `Composition.author`.

---

## Verworfene Alternativen

**Provenance nur im delegierten Fall lassen** (Status vor diesem Bau). Verworfen: dann trägt der Regelfall keine Herkunfts-Spur, obwohl gerade er der häufigste ist. Die Provenienz-Aussage soll für jeden Export gelten, nicht nur die Vertretung.

**Volle ADR-063-Option-A** (Provenance pro Einzel-Ressource + inline-CodeSystem + URN-Policy-Codes). Verworfen für diesen Bau: kein öffentliches Versprechen verlangt sie, sie vervielfacht die Bundle-Größe, und die Bundle-Assembly-Provenance trägt die Kern-Aussage (wer hat zusammengestellt) bereits. Bewusst zurückgestellt, nicht zugesagt.

---

## Konsequenzen

**Positiv.** Der dritte und letzte Clean-Slate-Verlust ist geschlossen — mit einem ADR, der ihn benennt. Jedes IPS-Bundle sagt nun, wer es zusammengestellt hat. Der delegierte und der Selbst-Fall sind symmetrisch (dieselbe Provenance-Form, nur die handelnde Person unterscheidet sich).

**Begrenzt / negativ.** Es ist die minimale Provenance, nicht die volle ADR-063-Option-A — bewusst. Die Konformität ist strukturell + gegen die Dokument-Bundle-Regel geprüft, **nicht** gegen Gazelle; der Gazelle-Lauf ist die Geräte-/Upload-Strecke (wie bei U2-ADR-079).

---

## Verifikation

- **Builder:** `fhirIpsBundle(jetzt)` (Selbst-Fall) baut genau **eine** Provenance — `agent.who` = Patient, **kein** `onBehalfOf`, `target` → Composition, `recorded` = Stempel, Provenance = letzter Eintrag; `Composition.author` = Patient, keine RelatedPerson. Delegierter Fall (U2-ADR-079) unverändert (agent.who = RelatedPerson, onBehalfOf = Patient).
- **Tests:** `tests/fhir-ips-delegiert.test.js` — T079-1 aktualisiert (Selbst-Fall: 0 RelatedPerson, **1** Provenance), neu T081-1 (agent.who=Patient / kein onBehalfOf / target / recorded) + T081-2 (Provenance letzter Eintrag, Composition erster). Node-Suite **1356/0**.
- **Gates:** Block-Pin `8d31c678…` byte-identisch (Krypto-Block unberührt), PV-Golden **42/42**, `vivodepot.html.sha256` nachgezogen, SW-Cache-Bump, OSV CLEAN.
- Kein Push (eine Produktentscheidung).

## Konformität

```konformitaet
aussage:   U2-081: im Selbst-Fall baut fhirIpsBundle genau EINE Provenance mit agent.who = Patient,
           ohne onBehalfOf, target auf die Composition, als letzten Bundle-Eintrag — keine
           RelatedPerson, Composition.author bleibt Patient.
zustand:   prüfbar
pruefung:  tests/fhir-ips-delegiert.test.js#[T081-1] Selbst-Fall: Provenance agent.who = Patient, KEIN onBehalfOf, target = Composition, recorded
pruefung:  tests/fhir-ips-delegiert.test.js#[T081-2] Selbst-Fall: Provenance ist der letzte Eintrag, Composition bleibt erster
quelle:    entscheidung
```

## Nachtrag 09.10.2026 — Herkunft je Ressource: „von der Person bereitgestellt“

**Anlass.** VO (EU) 2025/327 (EHDS) Art. 5 Abs. 1 verlangt, dass Daten, die die Person selbst oder ihre Vertretung eingetragen
hat, „clearly distinguishable“ sind (dazu Erwägungsgrund 12, Anhang I Nr. 1.15). Die technische Form ist nicht normiert; der
Durchführungsrechtsakt nach Art. 15 steht aus. Die Provenance oben bezeugte nur die Zusammenstellung der Composition — welche
Einträge von der Person stammen, sagte sie nicht. Die KBV-PKA und die ISiK-DocumentReferences trugen gar keine Autorschaft der
Person als Verweis.

**Entscheidung.** Jeder FHIR-Bundle, den der Kern **selbst erzeugt**, sagt mit Standardelementen, dass die Person ihn angelegt hat:

1. **Eine Provenance, deren `target` jede erzeugte Ressource ist** (die Composition bleibt das erste Ziel), mit `agent.type` =
   `author` (provenance-participant-type), `agent.who` = Patient, bei Vertretung RelatedPerson mit `onBehalfOf` = Patient, und
   `activity` = `CREATE` (v3-DataOperation). Weiter genau eine Provenance je Bundle — nicht die B16-ADR-063-Option-A.
2. **IPS: je Ressource das Feld, das das Profil kennt** — `recorder`/`asserter` (AllergyIntolerance, Condition, Procedure),
   `informationSource` (MedicationStatement), `source` (DeviceUseStatement), `performer` (Observation). uv-ips 2.0.0 und
   eu-eps 1.0.0-ballot lassen dort Patient und RelatedPerson zu (Weg: `snapshot` der Profile im Paket-Cache `~/.fhir/packages`).
3. **KBV-PKA:** `Composition.author` bleibt „unknown“ — das DPE-Profil verbietet dort jeden Verweis (`reference` max=0,
   `KBVPRMIODPECompositionDPE`). Die Autorschaft steht in der Provenance aus 1; `Bundle.entry` ist im NFDxDPE-Bundle offen.
4. **ISiK:** `DocumentReference.author` ist ein logischer Verweis auf die Person über die KVNR (dieselbe Kennung wie `subject`),
   der Name bleibt `display`. Der Collection-Bundle trägt die Provenance aus 1 mit demselben logischen Verweis. Der KDL-Code
   „patienteneigen“ bleibt.

**Nicht gebaut.** Kein eigener Code „patient-provided“ und kein `meta.security`/`meta.source` — beides ist nirgends normiert, ein
Wert nur aus einem Ballot (Euridice) wäre eine Annahme. Aufnehmen, sobald der Durchführungsrechtsakt oder ein EU-IG ihn festlegt.
Durchgereichte Originale (Verwahrungsnachweis, U2-ADR-444) sind nicht von der Person erzeugt; dort bleibt die Person Verwahrerin.

**Klassenwächter.** `tests/herkunft-je-ressource.test.js` sucht jede Funktion im Kern, die einen FHIR-Bundle baut. Jede steht
dort als Erzeuger mit Probe oder als ausgenommen mit Grund; ein neuer Erzeuger ohne Eintrag ist rot.

```konformitaet
aussage:   Jeder vom Kern selbst erzeugte FHIR-Bundle (IPS selbst und delegiert, KBV-PKA, ISiK) trägt eine Provenance mit
           agent.type = author, activity = CREATE und der Person als agent.who, deren target jede erzeugte Ressource ist;
           ein neuer Bundle-Erzeuger ohne Eintrag fällt.
zustand:   prüfbar
pruefung:  tests/herkunft-je-ressource.test.js#[Herkunft·IPS selbst] jede erzeugte Ressource ist Ziel einer Provenance mit der Person als Autorin
pruefung:  tests/herkunft-je-ressource.test.js#[Herkunft·Klassenwächter] jede Funktion im Kern, die ein FHIR-Bundle baut, ist Erzeuger mit Probe oder benannt ausgenommen
quelle:    entscheidung
```
