# U2-ADR-040 — Basistemplate-Treuhand-Signatur (Option A, geteilter Pfad, tolerant-dann-scharf)

**Datum:** 27.06.2026 (Entscheidung) · **produktiv 29.06.2026**
**Status:** Akzeptiert · Umgesetzt · **Produktiv (29.06.2026)** — die vier amtlichen Standard-Vorlagen sind echt treuhänderisch signiert, eingebettet und scharf geprüft.
**Nummer:** U2-ADR-040 (höchste zuvor belegte in `docs/adr/`: U2-ADR-039).
**Typ:** Grundsatz-Entscheidung (Trust-Architektur) + Umsetzung.
**Bezug:** Trust-Strecke 1E (amtliche Standard-Vorlagen); 1B Schritt 3 (U2-ADR-039 — scharfer Import-Pfad, dessen Kette geteilt wird); 1A (produktiver TA-Anker `cau4srN…`); U2-ADR-037 (Template-Feldmodell); U2-ADR-038 + Nachtrag (Cert-Ablauf/Widerruf, „1F"); `_verifyJWS`/`_jwsImportVerifyKey` (JWS-Block, byte-identisch über alle vier Träger, **unberührt**).

**Status heute:** gilt — Beleg `tests/trust-basistemplate-signatur.test.js`, `tests/fix-a110-codeherkunft.test.js`.

---

## Kontext

Die vier amtlichen Standard-Vorlagen — Patientenverfügung, Betreuungsverfügung, Vorsorgevollmacht (Bundesministerium der Justiz, BMJ) und Organspende (Bundeszentrale für gesundheitliche Aufklärung, BZgA) — waren eingebettet, aber **unsigniert**. Das Architektur-Prinzip ist Modularität: **jedes** Template ist eine Komponente, die ihren Vertrauensnachweis selbst trägt. Basistemplates sind Templates wie alle anderen und brauchen dieselbe Signatur + Prüfung — nicht mehr, nicht weniger. Der „Anbieter" der Basistemplates sind die **öffentlichen Stellen** (BMJ/BZgA). Die Frage: Wie werden amtliche Vorlagen signiert, ohne dass die Behörden selbst Schlüssel führen?

## Entscheidung

1. **(A) treuhänderisch.** Vivodepot signiert **für** die öffentlichen Stellen. Kein eigener Behörden-Schlüssel, kein Behörden-Onboarding (das wäre (B) — verworfen/fern, s. u.).

2. **Option 1 — geteilter Pfad.** Basistemplates laufen durch **dieselbe** zweistufige Verify-Kette wie externe Anbieter-Templates (`verifiziereProviderCredential` → `_verifiziereTemplateSignatur`), ein Mechanismus, kein Duplikat — geteilt mit dem Import-Pfad aus U2-ADR-039 (`da011d5`). Laufzeit-Verifikation: `basisVorlagenVerifizieren` → `verifiziereTemplateKette` beim Boot, Ergebnis gecacht (`_gepruefteBasisVorlagen`).

3. **Zwei Schlüssel, getrennte Rollen — nie derselbe.**
   - Der **TA-Key** (Trust Authority; sein Public ist der eingebettete Anker `cau4srN…`, `kid vivodepot-trust-authority-v1-11052026`) signiert die **Behörden-Provider-Certs** (`anbieterTyp: behoerde`, „BMJ"/„BZgA"). Vertrauens-Granularität **pro Behörde**: die drei BMJ-Vorlagen teilen ein Cert, Organspende hat das BZgA-Cert.
   - Ein **separater Treuhand-Anbieter-Key** signiert die vier `templateJws`. Sein Public steht in beiden Behörden-Certs (`credentialSubject.publicKeyJwk`).
   - Beide Schlüssel sind Vivodepot-verwahrt. In der Zeremonie sind es zwei getrennte Felder (Issuer F-2 = TA-Key, F-3 = Treuhand-Public) — **nie derselbe Schlüssel** (Generalprobe-Lektion).

4. **Was das `templateJws` attestiert.** „Dies ist der **unveränderte** amtliche Text der genannten Stelle (§ 5 UrhG)" — eine **strukturelle** Integritäts-Zusage. **NICHT** inhaltliche Billigung, **NICHT** „die Behörde hat signiert". Die Behörde ist der im Cert genannte Anbieter; Vivodepot bürgt **treuhänderisch** für die unveränderte Übernahme.

5. **Inhalts-Bindung (Schritt 1b).** Das `templateJws` deckt **genau** den eingebetteten Vorlage-Inhalt `{felder, wortlaut, wortlautQuelle, wortlautQuelleBroschuere}` (keine Metadaten). Vergleich **kanonisch** (`_kanonischJSON`, rekursiv schlüssel-sortiert — kein Reihenfolge-Risiko der AAD-Klasse; die `felder`-Array-Reihenfolge bleibt signifikant). Ohne diese Bindung bewiese die Signatur nur „es existiert eine Treuhand-Signatur", nicht „dies ist der unveränderte Text". Quelle der signierten Inhalte: `docs/template-generator/basistemplate-inhalte.json`, abgesichert durch einen **Wächter-Test** (kanonisch JSON === `STANDARD_VORLAGEN`, pro `id`).

6. **tolerant-dann-scharf.** `_BASIS_VERIFY_SCHARF` startet `false` (zeigt alle Vorlagen, solange die Platzhalter leer sind). Nach dem Embed der echten Werte ein **expliziter Flip** auf `true`: der Render-Guard (`_basisVorlageSichtbar`) zeigt dann nur noch verifizierte Basis-Vorlagen; ein Prüf-Fehlschlag lässt die Vorlage weg.

## Cert-Lebenszyklus (1F — verweist auf U2-ADR-038-Nachtrag)

Weil die Basis-Certs **eingebettet** sind und ihr Ablauf in der offline-pure-Architektur (U2-ADR-038, Option C) der **einzige** Widerrufs-Hebel ist, sind Basis- von externen Certs **strukturell getrennt**:

- **(a) Laufzeit:** Behörden-Certs tragen **120 Monate** (Issuer-Automatik bei `anbieterTyp` startsWith `behoerde`, `ABLAUF_MONATE_BASIS`); externe Anbieter behalten den 18-Monats-Default (`ABLAUF_MONATE_DEFAULT`). „Ablauf = Widerruf" gilt für **externe** Anbieter; ein eingebettetes Basis-Cert soll nicht still ablaufen.
- **(b1) Vorwarnung:** Banner, wenn das früheste gültige Basis-Cert < 90 Tage vor Ablauf steht (`_basisAblaufFrueh`).
- **(b2) Schonfrist — nur Basis:** ein abgelaufenes, sonst voll gültiges (Signatur ok, inhaltsgebunden, **nicht** widerrufen) Basis-Cert verschwindet **nicht still**, sondern wird mit „veraltet — App aktualisieren"-Marker weiter gezeigt (`_veralteteBasisVorlagen`). Externe (`importPlanGeprueft`) bleiben hart abgelaufen — die Widerrufs-Schärfe für Fremd-Anbieter ist unberührt.
- **(b3) Widerruf:** eingebettete `WIDERRUFS_LISTE` (RFC-7638-Thumbprints, `_jwkThumbprint`), geprüft im **gemeinsamen Trichter** `verifiziereProviderCredential` → deckt Basis **und** extern in einer Stelle. Leer ausgeliefert (Mechanismus steht, Befüllung mit dem ersten realen Widerruf = Teilaktivierung der in ADR-038 genannten „Option D"). **Widerruf schlägt die b2-Schonfrist** (auch ein abgelaufenes Basis-Cert wird bei Widerruf hart versteckt).

Alles **App-Schicht** (≥ `verifiziereProviderCredential`); **kein** JWS-/VdCrypto-Block-Touch, kein Lockstep-über-vier-Träger.

## Produktiv-Stand (29.06.2026)

Geräte-Generalprobe bestanden; Produktiv-Zeremonie durchgeführt (frischer Treuhand-Key + Cold-Storage-TA-Key). **Vier `templateJws` + zwei Behörden-Certs eingebettet**, verifiziert gegen den **eingebetteten** Anker `cau4srN…` — Stufe 1 (Cert ↔ Anker) und Stufe 2 (templateJws ↔ Cert-Key + Inhalts-Bindung) grün; Cert-Laufzeit 2036 (120 Monate). **Scharf-Flip aktiv** (`_BASIS_VERIFY_SCHARF = true`). Suite 1088/1089 grün, Block-Pins (`8d31c678…` / JWS byte-identisch) unberührt, `vivodepot.html.sha256` neu gepinnt.

## Umsetzung (Commits)

- **Schritt 1** (geteilte Verify-Kette, tolerant): `c501af7`.
- **Schritt 1b** (Inhalts-Bindung + Treuhand-Signier-Modus im Generator, α): `554f2b2`.
- **1F** (Basis-vs-extern Cert-Trennung — Laufzeit/Schonfrist/Widerruf + U2-ADR-038-Nachtrag): `b727fad`.
- **Produktiv-Signatur** (Embed der echten Certs + templateJws + Scharf-Flip): *dieser Commit*.

## Verworfen / Fern

**(B) echtes Behörden-Onboarding** — eine Behörde führt ihren eigenen, TA-zertifizierten Schlüssel und signiert selbst. Fern, sobald eine Stelle das tatsächlich tragen will; heute Overkill und nicht von den Behörden getragen. Die treuhänderische Form (A) hält die Eintrittsschwelle niedrig, ohne die Vertrauenskette zu schwächen.

## Nachtrag — Punkt 4 gilt auch für eingereichte Institutions-Vorlagen (06.08.2026)

**Anlass:** G3-Abgleich Webseite/Anwendung, Abweichung Z14; interner Zug-0-Bericht vom
06.08.2026. Gemessen: es gibt
keinen Code-Pfad, der eine Institutions-Vorlage gegen ein FHIR-, FIM- oder VC-Schema
validiert. `institutionen.html` sagt trotzdem „Vivodepot prüft Standards-Konformität … und
signiert".

**Der Befund hinter dem Befund:** Eine Institutions-Vorlage ist kein FHIR-Bundle. Sie ist eine
Formular-Definition in Vivodepots eigenem Vokabular (`feldname`, `feldtyp`, `bereich`,
`gruppe`, `codeWerte`) — eine Zwischensprache. Erst wenn eine Bürgerin sie ausfüllt, entstehen
Depot-Felder; erst daraus kann später eine FHIR- oder VC-Ausgabe werden. Eine leere
Formular-Definition gegen ein Schema für ausgefüllte Dokumente zu halten, prüft nicht strenger,
sondern am falschen Gegenstand.

### 4a — Punkt 4 gilt unverändert für eingereichte Vorlagen

Was für die treuhänderisch signierten Basistemplates gilt, gilt gleichlautend für Vorlagen, die
Institutionen selbst signiert einreichen (U2-ADR-039): Die Signatur attestiert **strukturelle
Integrität**, nicht inhaltliche Billigung und nicht Konformität mit einem externen Standard.
Punkt 4 war nie auf die vier amtlichen Vorlagen beschränkt gemeint; dieser Nachtrag spricht es
aus, weil eine Außenaussage das Gegenteil behauptet hat.

### 4b — Was maschinell geprüft wird

**Stufe 1, vorhanden.** `validateTemplate` (Multi-Typ-Validator) und die Code-Listen-Formprüfung
nach U2-ADR-051: `felder` nicht leer, `feldtyp` aus dem Enum, Auswahlfelder mit `codeWerte`,
Gesamtgröße unter dem Cap, Code-Listen mit `systemId`, `uri` und wohlgeformten `eintraege`.
Strukturelle Selbstkonsistenz gegen das eigene Modell.

**Stufe 2, gebaut (06.08.2026, A110/Z14).** Zusätzlich wird geprüft, ob referenzierte
`codeSystem`- und `uri`-Werte auf Terminologien zeigen, die bei uns geführt sind — ATC,
SNOMED CT, ICD-10-GM, LOINC, ESCO, XÖV-Rollencode (`CODE_LISTEN`-Registry, dieselbe, die die
App zur Laufzeit selbst führt). Geprüft wird die **Herkunft** des Codes, nicht seine fachliche
Passung. Ein unbekanntes System führt zur Ablehnung mit benannter Ursache, nicht zu einem
stillen Durchlauf. Das schließt eine reale Lücke: vorher konnte eine Vorlage auf ein frei
erfundenes Code-System zeigen und die Formprüfung passieren.

### 4c — Was ausdrücklich nicht geprüft wird

Diese Aufzählung ist der operative Teil dieses Nachtrags. Sie bestimmt, was nach außen gesagt
werden darf.

- **Fachliche Richtigkeit** — ob ein Feld den behaupteten medizinischen oder rechtlichen
  Sachverhalt trifft.
- **Vollständigkeit** — ob die Vorlage alles enthält, was ihr Zweck verlangt.
- **Angemessenheit der Formulierung** für Bürgerinnen.
- **Konformität mit einem externen Schema** für ausgefüllte Dokumente (FHIR, FIM, VC).

Der menschliche Schritt bleibt: die inhaltliche Prüfung erfolgt durch das
Trust-Authority-Team (`vivodepot-template-generator.html:369-370`). Keine maschinelle Stufe
ersetzt ihn, sie lagert ihm nur Arbeit vor.

### 4d — Eine Übersetzungsschicht Vorlage nach FHIR wird vor v1 nicht gebaut

Der dritte Zuschnitt aus dem Zug-0-Bericht — Vorlage in ein probeweises FHIR-Profil-Fragment
oder FIM-Leistungsschema übersetzen und dieses validieren — ist vor v1 nicht Gegenstand. Er
verlangt eine Zuordnungstabelle Generator-Feldtyp nach FHIR-Elementtyp, die es nicht gibt, und
sein einziger heutiger Zweck wäre die wörtliche Einlösung eines Webseiten-Satzes, den man auch
berichtigen kann.

**Wiedervorlage-Anlass, benannt statt offen:** wenn eine Institution eine Vorlage einreicht,
deren Felder unmittelbar auf ein FHIR-Profil abgebildet werden sollen, oder wenn ein
Pilotpartner eine maschinelle Konformitätszusage vertraglich verlangt.

### 4e — Die Nicht-Prüfliste bindet vertraglich, nicht nur redaktionell

Der Template-Mechanismus ist entgeltlich: Institutionen erstellen über den Generator eigene
Vorlagen, Vivodepot zertifiziert sie und stellt das in Rechnung. Damit ist 4c keine
Formulierungsfrage mehr. Eine zahlende Institution wird annehmen, dass sie mehr erwirbt als die
Feststellung, dass ihr Formular wohlgeformt ist — und der Abstand zwischen dem Bezahlten und dem
Attestierten ist die Stelle, an der Haftung entsteht.

**Die Aufzählung aus 4c gehört deshalb in den Anbieter-Vertrag**, nicht nur auf die Webseite.
Solange sie nur in einer Produktseite steht, liest sie niemand, der unterschreibt.

**Übergangsregel, solange es keinen Anbieter-Vertrag gibt** (Stand 06.08.2026; der
Template-Mechanismus ist noch nicht Gegenstand der Pilotphase): Die Aufzählung aus 4c wird im
Onboarding-Schritt schriftlich bestätigt — bei der Erstprüfung der ersten Vorlage durch das
Trust-Authority-Team. Sie wandert in den Vertrag, sobald einer entsteht.

**Was tatsächlich verkauft wird**, folgt aus U2-ADR-039: die Institution signiert ihr Template
selbst; Vivodepot zertifiziert über das Provider-Credential ihre **Identität und ihren
Schlüssel** und nimmt sie in die Vertrauenskette auf, mit einer menschlichen Erstprüfung der
ersten Vorlage durch das Trust-Authority-Team. Das ist die verkaufte Leistung. Eine
Konformitätsprüfung ist es nicht.

### 4f — Die Außenaussage folgt dieser Entscheidung

`institutionen.html` wird auf das Geprüfte zurückgeschnitten: formale Vollständigkeit und
Herkunft der Code-Werte maschinell, inhaltliche Prüfung durch das Trust-Authority-Team. Der
Satz „Vivodepot prüft Standards-Konformität" entfällt in dieser Form. Die Zeile gehört als
`art: zusicherung` ins Register aus G3 und bekommt ihren Wächter.

*Nachtrag beschlossen 06.08.2026. Status: angenommen.*

## Konformität

```konformitaet
aussage:   Die Inhalts-Bindung (Schritt 1b) ist ein Wächter: die eingebetteten
           STANDARD_VORLAGEN sind pro id kanonisch identisch mit
           docs/template-generator/basistemplate-inhalte.json — kein Auseinanderlaufen von
           signiertem und eingebettetem Inhalt.
zustand:   prüfbar
pruefung:  tests/trust-basistemplate-signatur.test.js#1b Wächter: basistemplate-inhalte.json === STANDARD_VORLAGEN (kanonisch, pro id)
quelle:    invariante
```

*Bindung nachgetragen 05.08.2026 (ADR-Konformitäts-Wächter, Tranche 1).*

```konformitaet
aussage:   Eine von einer Institution eingereichte Vorlage mit einer codeListe, deren `uri`
           auf keine bei uns geführte Terminologie zeigt (ATC/SNOMED CT/ICD-10-GM/LOINC/ESCO/
           XÖV-Rollencode, CODE_LISTEN-Registry), wird von validateTemplate abgelehnt, mit
           benannter Ursache. Geprüft wird die Herkunft, nicht die fachliche Passung (4c).
zustand:   prüfbar
pruefung:  tests/fix-a110-codeherkunft.test.js#A110-S2) codeListe mit erfundener uri fällt durch, Ursache benannt
quelle:    invariante
```

*Stufe-2-Bindung nachgetragen 06.08.2026 (A110/Z14, Nachtrag 4b).*
