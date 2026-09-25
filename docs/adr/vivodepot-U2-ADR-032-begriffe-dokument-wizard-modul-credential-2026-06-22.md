# U2-ADR-032: Begriffe — Dokument, Wizard, Modul, Credential trennen

**Status:** Akzeptiert
**Datum:** 22.06.2026
**Kategorie:** ARCHITEKTUR-PRINZIP, TERMINOLOGIE, DOKU
**Grundlage:** Lese-Inventuren (intern, 21./22.06.2026): `befund-modul-andock-bereich11-energie-2026-06-21`, `befund-template-mechanik-2026-06-21`, `befund-adr-stand-standard-vorlagen-2026-06-21`, `befund-wizard-fuehrungs-mechanik-2026-06-22`. Entwurf des Sparringspartners (21.06.), **gegen den Code verifiziert am 22.06.** — alle Aussagen code-gedeckt, keine Abweichung.
**Drei-Anker:**
- **Code-Stelle (read-only verifiziert, KEIN Code-Eingriff in dieser ADR):** `standardDokumente`-Köpfe `vivodepot.html` Z.3554/3719/3783/3786/3793/4011 + `dokumentAusStandard`-Definitionen ~Z.12163–12180; Wizard-Maschine `WIZARDS` :4659 / `wizardLauf` :12047 / `WIZARD_DOKUMENT_MAP` :12107–12111; Modul-Ebene `ebene:'modul'`-Felder (61, hartkodiert) + Andock-Vorkehrungen (Kommentare, keine Registry); Credential-Strang `VC_*_MAPPING` / `sdJwtVc*`.
- **Sprint-Commit:** noch nicht committet (Halt vor Commit; gebündelt mit U2-ADR-033).
- **ADR-Bezug:** dieser ADR (U2-ADR-032); Schwester U2-ADR-033 (Basis-Vorlagen).
**Status heute:** teilweise überholt durch U2-ADR-136 — die Wizard-Klausel in §2 („keine bedingten oder überspringenden Schritte") ist dort ausdrücklich „endgültig abgelöst"; die übrigen drei Begriffe (Dokument, Modul, Credential) sind im Kern weiterhin auffindbar (`dokumentAusStandard`, `WIZARDS`/`wizardLauf`, `VC_*_MAPPING`) und unverändert gültig.

---

## Kontext

Interne Dokumente und die Website haben vier verschiedene Mechanismen vermischt — daraus entstand u. a. die falsche „acht signierte Basis-Templates"-Aussage. Der Code trennt sie sauber; die Begriffe taten es nicht. Diese ADR fixiert die Trennung, damit Doku, Website und Strategie konsistent werden.

**Verifikation (gemessen, 22.06.2026):** Im Code existiert **keine** Signatur-/Acht-Template-Konstruktion (0 Treffer). Real sind es **sechs** unsignierte `standardDokumente`-Köpfe. Eine dynamische Modul-Andock-Mechanik existiert **nicht** (nur deklarierte Vorkehrungen). Die geführte Ausfüllhilfe ist voll gebaut (zehn Wizards, eigener Mechanismus). Damit sind die vier Begriffe unten code-gedeckt.

## Entscheidung — vier getrennte Begriffe

**1 · Dokument (`standardDokument`)**
Katalog-Kopf eines real existierenden Schriftstücks. Trägt `typ`, `name`, `empfRhythmusMonate` (Prüf-Rhythmus), `hinweis` (Prüf-Reminder) und optional `felder` (Vorverknüpfung auf bestehende Sektor-Felder). Verfasst nichts, hält keinen Inhalt vor — es katalogisiert und erinnert. Registriert über `dokumentAusStandard` (`istStandard`, `quelle:'standard'`, dedup-by-typ, idempotent). *Anker: Registrierung U2-ADR-014; Definitionen `vivodepot.html` ~Z.12163–12180.* Real existieren **sechs** unsignierte Dokument-Einträge (`bankvollmacht`, `schwerbehindertenausweis`, `vorsorgevollmacht`, `patientenverfuegung`, `testament`, `vivodepot`) — kein ADR legt eine Zahl fest; die „acht signierten Templates" sind eine veraltete Behauptung ohne Code-Deckung.

**2 · Wizard**
Eigene, deklarativ getriebene Mehrschritt-Ausfüllhilfe: Frage, Hilfetext, Auto-Save pro Schritt, Weiter/Zurück, Fortschritt. Schreibt über denselben gestempelten Pfad wie manuelle Eingabe in Sektor-Felder (`sektorFeldSetzen`/`situationFeldSetzen`). Navigation strikt linear; Verzweigung nur als Ziel-Override (`ziel:` pro Schritt), **keine** bedingten/überspringenden Schritte. Drei Wizards (`vvwiz`/`pvwiz`/`erbwiz`) registrieren am Abschluss ein `standardDokument`. *Anker: `WIZARDS`/`wizardLauf`/`renderWizard`; Abschluss-Kopplung U2-ADR-014.* **Kein** Bezug zur Template-Render-Maschine (U2-ADR-009).

**3 · Modul (`ebene:'modul'` / Andock)**
Heute: hartkodierte `ebene:'modul'`-Felder. Eine **dynamische** Andock-Mechanik existiert **nicht** — der Andock-Vertrag ist deklariert, aber leer (Vorkehrungen/Kommentare, keine Registry, keine Register-Funktion). *Anker: Modul-Befund.* „Modul" bezeichnet damit aktuell keine ladbare Erweiterung, sondern eine Feld-Ebene. Jede künftige Aussage „Module andocken" muss diesen Ist-Zustand abbilden.

**4 · Credential**
Standardisiertes, übertragbares Attestat/Selbstauskunft (SD-JWT-VC, FHIR-IPS). Trägt Provenienz (Quelle/Schicht, Vollmacht), unterliegt dem Wahrheits-Filter (verifiziert-Marker). Eigener Export-/Import-Strang, getrennt von Dokument und Wizard. *Anker: Sozialversicherungs-Export-Arbeit, U2-ADR-028/030.*

## Abgrenzung in einem Satz

Ein **Wizard** führt durch das Ausfüllen, ein **Dokument** katalogisiert und erinnert, ein **Modul** ist heute eine Feld-Ebene (keine ladbare Erweiterung), ein **Credential** ist die übertragbare, provenienz-tragende Aussage nach außen.

## Konsequenzen

- Website und interne Doku müssen die „acht signierten Templates"-Aussage entfernen (offener Punkt, fällig vor dem nächsten externen Blick).
- Künftige Spezifikationen benennen, welcher der vier Mechanismen gemeint ist — kein Sammelbegriff „Template" mehr ohne Zuordnung.
- Diese ADR ändert **keinen** Code (reine Begriffsfixierung); Block-Pin `8d31c678…` unverändert.

## Cross-Referenz

U2-ADR-009 (Template-Render-Maschine — vom Wizard NICHT berührt), U2-ADR-012 (Situationsblatt — Registry-Analogie des Wizards), U2-ADR-014 (Dokument-Ebene + Wizard-Abschluss-Registrierung), U2-ADR-028/030 (Credential-Strang). Schwester: U2-ADR-033. Befunde (intern, s. Grundlage). Produktiv: —
