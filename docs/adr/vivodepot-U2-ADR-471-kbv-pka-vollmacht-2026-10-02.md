# U2-ADR-471: KBV-Patientenkurzakte — die Vorsorgevollmacht als DPE-Bundle für die Arztpraxis

**Status:** Angenommen — entschieden und gegengelesen am 01.10. und 02.10.2026
**Datum:** 02.10.2026
**Kategorie:** INTEROPERABILITÄT, STANDARDS, GESUNDHEIT
**Linie:** U2
**Bezug:** U2-ADR-466 (Vollmacht und Patientenverfügung im IPS/EPS-Export) · U2-ADR-468 (ISiK Stufe 6) ·
U2-ADR-467 (Namen und Anschrift getrennt)
**Status heute:** gilt — Belege im `konformitaet`-Block unten. **Wiedervorlage:** neue Fassung der PKA (unten).

---

## Kontext

Das Medizinische Informationsobjekt (MIO) Patientenkurzakte (PKA) der KBV führt die persönlichen Erklärungen (DPE): die
Vorsorgevollmacht, die Patientenverfügung, die Organ- und Gewebespendeerklärung. Veröffentlicht ist allein PKA 1.0.0
(`kbv.mio.patientenkurzakte#1.0.0`). Die KBV empfiehlt, sie „mit der Intention einer bundesweiten Nutzung nicht zu
implementieren“, weil eine Überarbeitung beauftragt ist (Weg zum Nachsehen: https://mio.kbv.de/display/PKA1X0X0, Stand
22.01.2025). Gebaut wird trotzdem auf 1.0.0 — es ist die einzige Fassung, die sich prüfen lässt —, mit einem Fassungswächter.

**Lizenz.** Die maschinenlesbaren Definitionen der PKA 1.0.0 (Profile, Extensions, CodeSystems, ValueSets) gibt die KBV unter
Apache-2.0 heraus: MIOParser, Commit `0f39da3c86212d63885bf221dfb772f691a794e3`, `src/Definitions/KBV/PKA/1.0.0`, je Datei mit
dem Kopf „The KBV licenses this file to you under the Apache License, Version 2.0“. Das FHIR-Paket selbst trägt kein
`license`-Feld; es dient nur der Prüfung. Namensnennung in NOTICE und THIRD_PARTY_LICENSES. Die drei SNOMED-Konzepte der
Ausgabe (408403008, 371538006, 186065003) sind im GPS-Release 20260101 aktiv und tragen den Begriff, den das Profil fixiert
(FSN; `tools/snomed-freigabe.json`, `begriffArt: "fsn"`).

## Die Entscheidung — das Profil gewinnt

Gemessen am offiziellen HL7-Validator, offline, gegen das Paket (02.10.2026). Was die Messung ergab, entschied die Form:

1. **Ein DPE-Bundle** (`KBV_PR_MIO_NFDxDPE_Bundle`, `type` document, `identifier.type` `DPE_Vorsorgevollmacht`) mit
   Composition (`KBV_PR_MIO_DPE_Composition_DPE`), Patient und **genau zwei** Consents — `section.entry` ist 2..2:
   - die **Erklärung** (`KBV_PR_MIO_DPE_Consent_Personal_Consent`): Art SNOMED 186065003 mit der deutschen Anzeige
     `DPE_Vorsorgevollmacht`, **ohne `provision`**, `dateTime` der Stand der Vollmacht, `sourceReference.display` der Ablageort
     in den Worten der Person;
   - die **Vertretung** (`KBV_PR_MIO_NFDxDPE_Consent_Active_Advance_Directive`): `provision.actor` 1..1 mit Rolle AGNT und dem
     Namen der bevollmächtigten Person, dazu der Ablageort als Pflicht-Extension.
2. **Ein Bundle je bevollmächtigter Person**, weil `actor` höchstens einmal steht. Ausgegeben wird eine Datei je Bundle.
3. **Der Ablageort ist eine Postanschrift**: `KBV_PR_MIO_NFDxDPE_Address` verbietet `text` und verlangt Straße und Hausnummer
   getrennt (Pflicht-Extensions), Postleitzahl und Ort. Unser Ablageort ist Freitext. Darum **vier neue Unterfelder** am
   Instrument (`storageStreet`, `storageHouseNumber`, `storagePostalCode`, `storageCity`, Schema 92). Sie werden **nie aus dem
   Freitext geraten**. `country` bleibt weg: das Profil bindet es an das ValueSet der Bundle-Typen, offensichtlich ein Versehen.
4. **Patient**: genau eine Kennung. Erfüllbar ist nur die 10-stellige Krankenversichertennummer (`kvid-10`). Der Slice für die
   PKV-Nummer verlangt in de.basisprofil einen `assigner`, den das DPE-Profil verbietet (gemessen: mit assigner „maximal 0“,
   ohne „mindestens 1“). Das Tor hängt darum an der Nummer, nicht an der Kassenart — viele privat Versicherte haben inzwischen
   ebenfalls eine KVNR. Geschlecht: m/w/d/k → male/female/other/unknown, bei d zusätzlich `gender-amtlich-de` D.
5. **Gründe statt Pflichtfelder.** KVNR, Geschlecht, Familienname und die Anschrift sind Torgründe dieser Ausgabe, keine
   Pflichtfelder im Depot. Jeder Grund wird gesagt: `sensibel-nicht-freigegeben`, `kvnr-fehlt`, `name-fehlt`,
   `geschlecht-fehlt`, `vollmacht-fehlt`, `vollmacht-datum-fehlt`, `ablageort-anschrift-fehlt`, `bevollmaechtigte-fehlen`,
   `bevollmaechtigte-privat` (eine als privat markierte Person geht nicht hinaus, das Profil verlangt ihren Namen).
6. **Der Ausgabeweg**: Exportformat `kbv-pka` im Bereich Vorsorge & Recht. Zuerst die Freigabe der sensiblen Felder, dann die
   Gründe, dann MyTerms Teil D (`mitVereinbarung`), dann die Dateien. Codes und Festwerte stehen als Terminologie-Daten in
   `code-listen/terminologie/kbv-pka.json` (`IPS_BEGRIFFE.kbvPka`).
7. **Prüfung**: `tools/kbv-pka-validieren.js` (je Person ein Bundle, divers, drei Rot-Beweise) und zwei Fälle im HL7-Sammelaufruf
   des pre-push-Gates (`tests/konformitaet/externe-validatoren.mjs`, `-ig kbv.mio.patientenkurzakte#1.0.0`).

## Schema 91 → 92

Die Stufe schreibt nichts: die vier Unterfelder bleiben leer, bis die Person sie einträgt, der Freitext `storageLocation`
bleibt byte-gleich. Kein Vorschlag aus dem Freitext — anders als bei der Anschriftzeile der Stufe 91 ist ein Ablageort wie
„beim Notar Dr. X, Hauptstr. 5“ keine verlässliche Anschrift.

## Wiedervorlage

- **Neue PKA-Fassung.** `tools/kbv-pka-fassung-pruefen.js --netz` liest das Paketregister und den MIOParser und meldet jede
  Fassung außer 1.0.0 und ihren Vorstufen. Daraus wird ein Auftrag: Profil-Unterschiede messen, diese ADR neu vorlegen.
- **Zwei Befunde an die KBV** (gesammelt, nicht verschickt): das amtliche Beispiel DPE_Bundle_3 im Paket kbv.mio.patientenkurzakte#1.0.0 trägt `scope`
  patient-privacy, das Profil fixiert `adr` (mit der Anzeige „Privacy Consent“); der PKV-Slice ist unerfüllbar.

## Was nicht entschieden ist

- **Die Patientenverfügung im DPE** (`DPE_Patientenverfuegung`, dasselbe Muster) — Folgeposten.
- **Der Notfalldatensatz (NFD)** der PKA.
- Die LOINC-Anzeige zu 57016-8: Das Profil verlangt „Patient Consent“ (`Consent.policyRule.coding.display`, patternString,
  im Profil KBV_PR_MIO_NFDxDPE_Consent_Active_Advance_Directive des Pakets, LOINC-Fassung 2.71). Der Long Common Name in LOINC 2.82 lautet
  „Privacy policy acknowledgment Document“ (Weg: `CodeSystem/$lookup` auf tx.fhir.org mit system http://loinc.org und
  code 57016-8, gemessen am 04.10.2026; loinc.org selbst antwortet Programmen mit 403). Für 2.71 kennt tx.fhir.org keine
  Fassung, deren Long Common Name ist also ungemessen. Die Ausgabe folgt dem Profil, sonst lehnt der Validator das Bundle ab;
  die Abweichung gehört zu den Rückmeldungen an die KBV.

## Belege

Validator (validator_cli 6.9.12, offline, `-ig kbv.mio.patientenkurzakte#1.0.0`, 02.10.2026): die Bundles aus dem echten
Generator gültig, die Rot-Beweise ungültig. Weg zum Nachsehen: `node tools/kbv-pka-validieren.js --jar <validator_cli.jar>`
(mit Suite-Platz).

```konformitaet
aussage:  Je bevollmächtigter Person entsteht ein DPE-Bundle mit genau zwei Erklärungen; die Erklärung ohne provision, die Vertretung mit genau einem actor.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kbv-pka-vollmacht.test.js#[PKA·Bundle] je bevollmächtigter Person ein DPE-Bundle mit genau zwei Erklärungen; die Bankvollmacht und die private Person fehlen
```

```konformitaet
aussage:  Der Ablageort kommt nur aus den vier Unterfeldern; ein Freitext, der wie eine Anschrift aussieht, ergibt keine Datei.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kbv-pka-vollmacht.test.js#[PKA·Anschrift·Rot] ein Freitext, der wie eine Anschrift aussieht, ergibt keine Datei — geraten wird nie
```

```konformitaet
aussage:  Ohne 10-stellige KVNR entsteht keine Datei.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kbv-pka-vollmacht.test.js#[PKA·KVNR·Rot] eine Nummer, die keine 10-stellige KVNR ist (etwa eine PKV-Nummer), schließt das Tor
```

```konformitaet
aussage:  Die Stufe 92 schreibt nichts: der Freitext bleibt byte-gleich, keine Anschriftteile entstehen.
zustand:  geprüft
herkunft: invariante
pruefung: tests/schema-92-ablageort-anschrift.test.js#[Stufe 92·a] die Stufe schreibt nichts: Freitext byte-gleich, keine Anschriftteile
```

```konformitaet
aussage:  Eine neue Fassung der PKA wird gemeldet.
zustand:  geprüft
herkunft: invariante
pruefung: tests/kbv-pka-fassung-pruefen.test.js#[PKA-Fassung·Rot] eine neue Fassung wird in beiden Quellen gemeldet
```
