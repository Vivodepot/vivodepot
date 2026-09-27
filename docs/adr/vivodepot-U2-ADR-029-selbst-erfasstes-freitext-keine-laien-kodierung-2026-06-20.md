# U2-ADR-029: Selbst Erfasstes bleibt Freitext — keine Laien-Kodierung (Bürger-Schicht)

**Status:** Akzeptiert (Prinzip entschieden 20.06.2026; Kern-Datenmodell bereits konform; UI-Code-Auswahl-Audit als Folge offen)
**Datum:** 20.06.2026
**Kategorie:** ARCHITEKTUR-PRINZIP, PRODUKT, RECHT/HAFTUNG
**Grundlage (intern):** Klärungs-Doc „Terminologie/Trust-Schichten" (VD Review 7, 20.06.2026), Punkt 1 — entschieden. Flankiert von Punkt 2 (institutionell = kodiert), Punkt 5 (strikte Anbieter-Kodier-Linie), Punkt 8 (strukturelle statt inhaltliche Zertifizierung).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `sektorFeldSetzen` (Wert bleibt schlichter String), `codeSlotSicherstellen` (leerer Andockpunkt = `null`), `liesCode` („null, solange kein Template ihn setzt"). Provenienz über `eingabeArt` (`'import'` = institutionell) (U2-ADR-005).
- **Sprint-Commit:** dieser ADR (Prinzip-Festschreibung, kein Code-Eingriff).
- **ADR-Bezug:** dieser ADR (U2-ADR-029).
**Status heute:** gilt — Beleg `vivodepot.html` (`sektorFeldSetzen`/`codeSlotSicherstellen`/`liesCode`), Prinzip seither in U2-ADR-036 als bewusster Grenzfall bestätigt statt aufgeweicht.

---

## Kontext

Medizinische (und andere) Codes täuschen eine Eindeutigkeit vor, die eine Laiin nicht leisten kann: „Nussallergie" ist umgangssprachlich klar, terminologisch mehrdeutig (Erdnuss = Hülsenfrucht; Baumnuss-Code ≠ Erdnuss-Code; Disposition ≠ Reaktion ≠ Substanz). Eine **falsch selbst gesetzte** Code-Angabe ist gefährlicher als gar keine, weil sie maschinell gelesen Sicherheit vortäuscht — und sie liefe unter Vivodepots Trust-Siegel.

## Entscheidung

1. **Selbst Erfasstes bleibt Klartext** in den eigenen Worten der Bürgerin. Ein Code ist allenfalls **optionale, sichtbar unsichere Anreicherung daneben**, niemals als zweifelsfreier Code ausgegeben.
2. **Institutionell Erfasstes bleibt kodiert** (Anbieter-Template/xShare): eine fachkundige Stelle hat den Code gesetzt und verantwortet ihn (Punkt 2).
3. **Keine Code-Auswahl für die Bürgerin in Phase 1** (Punkt 5): Anbieter-Templates dürfen Codes *setzen*, nicht zur Bürger-*Auswahl* anbieten — sonst kehrt das Laien-Falschkodier-Risiko durch die Hintertür zurück, mit Vivodepots Signatur darunter.
4. Der **FHIR-Export trägt beides nebeneinander:** kodierte Felder, wo Institutionen kodiert haben; Freitext, wo die Bürgerin selbst erfasst hat.

## Befund — der Kern ist bereits konform (gemessen)

- `sektorFeldSetzen` legt den Feldwert als **schlichten String** ab; der Code-Slot wird zwar angelegt, bleibt aber **`null`**, „solange kein Template ihn setzt" (`liesCode`). Selbst-Erfassung setzt also **keinen** Code.
- Codes tragen institutionelle Provenienz (`eingabeArt:'import'`, U2-ADR-005); das Daten­modell trennt „selbst gehalten" von „institutionell belegt" bereits strukturell.
- Display-seitige Code-Listen-Beschriftung (z. B. Blutgruppe-Label „A +") ist eine **Anzeige** auf dem Freitext-Wert, kein gespeicherter zweifelsfreier Code.

→ Das Prinzip ist im Kern-Datenmodell **schon realisiert**; dieser ADR schreibt es als bewusste Linie fest.

## Offen (Folge-Audit, nicht dieser ADR)

UI-Ebene gegen Punkt 5 prüfen: Bietet **irgendein** Feld der Bürgerin heute eine echte **Code-Auswahl** an (vs. Freitext bzw. optionale Auswahl bei geschlossenen Enums wie Blutgruppe)? Falls ja: gegen die strikte Anbieter-Kodier-Linie abgleichen. Reine UI-Inventur, kein Daten­modell-Umbau.

## Konsequenzen

- **Entblockt die SNOMED-Verteilungsfrage fürs Bürger-Produkt** (Klärungs-Doc Punkt 7): ohne Bürger-Code-Liste entfällt die harte Lizenz-Verteilungsfrage; offen bleibt nur die **Verarbeitung** institutioneller Codes (xShare) — eigener, niedrigerer Tatbestand.
- **Laien-Falschkodier-Risiko entfällt** vollständig.
- **Bewusster Verzicht:** keine automatische maschinelle Auswertung (z. B. Wechselwirkungs-Prüfung) des selbst Erfassten — passt zum Werkzeug-Charakter (Auswertung beim lesenden Menschen, nicht in der App). Falls die App je selbst ableiten/warnen soll, schließt Freitext diese Tür — bisher keine Anforderung.
- **Krypto/Code unberührt:** reine Prinzip-Festschreibung; VdCrypto-Block-Pin `8d31c678…` unverändert.

## Verwandte, noch nicht gezogene ADR-Kandidaten (Klärungs-Doc)
Herkunft pro Feld + Übergang selbst-gehalten→beglaubigt (Punkt 3/4) · strikte Anbieter-Kodier-Linie Phase 1 (Punkt 5) · Terminologie als eigener Modul-Typ, falls überhaupt (Punkt 6 — erst Template-Mechanismus v0.3 lesen) · strukturelle statt inhaltliche Zertifizierung (Punkt 8, in Block C/U2-ADR-028 bereits angelegt).

## Cross-Referenz
U2-ADR-005 (Urheberschaft/Provenienz) · U2-ADR-006 (Code-Slot-Andock) · U2-ADR-028 (Ebene 3a, strukturelle Verifikation) · Klärungs-Doc VD Review 7 (intern, nicht im Repo).
