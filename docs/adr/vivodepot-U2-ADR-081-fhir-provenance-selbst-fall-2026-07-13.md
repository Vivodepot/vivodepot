# U2-ADR-081 · FHIR-Provenance im IPS-Bundle — auch im Selbst-Fall (letzter Clean-Slate-Verlust)

**Status:** Akzeptiert · 13.07.2026 (Bau umgesetzt, Suite/Gates grün)
**Nummer:** U2-ADR-081 (bestätigt gegen `docs/adr/` — höchste belegte war U2-ADR-080).
**Typ:** Funktions-Wiedereinbau (im Clean-Slate fallengelassene Fähigkeit) — der **dritte und letzte** der drei Clean-Slate-Verluste des Zusagen-Audits.
**Nimmt wieder auf:** ADR-063 (FHIR-Provenance im IPS-Bundle) — interne Reihe.
**Baut auf:** U2-ADR-079 (delegierter IPS-Export mit RelatedPerson + delegierter Provenance).
**Verwandt:** Zusagen-Audit 12.07. Kategorie 0.3; U2-ADR-005 (Provenienz pro Datensatz, App-intern).
**Status heute:** gilt — Beleg `tests/fhir-ips-delegiert.test.js`.

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
