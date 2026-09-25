# U2-ADR-033: Basis-Vorlagen — Umfang, Haltung, Grenzen

**Status:** Akzeptiert
**Datum:** 22.06.2026
**Kategorie:** PRODUKT, RECHT/HAFTUNG, VORLAGEN
**Grundlage:** Begriffs-ADR U2-ADR-032 + `befund-wizard-fuehrungs-mechanik-2026-06-22` (intern). Entwurf des Sparringspartners (21.06.), **gegen den Code verifiziert am 22.06.** — alle Aussagen code-gedeckt; der benannte `bwwiz`-Mangel ist bestätigt.
**Drei-Anker:**
- **Code-Stelle (read-only verifiziert; der Bau folgt separat):** Wizards `vvwiz`/`bwwiz`/`pvwiz`/`erbwiz` in `WIZARDS` (`vivodepot.html` :4659 ff.); Abschluss-Registrierung `WIZARD_DOKUMENT_MAP` :12107–12111 (heute nur `vvwiz`/`pvwiz`/`erbwiz` — `bwwiz` fehlt); `testament`-Kopf :3793.
- **Sprint-Commit:** noch nicht committet (Halt vor Commit; gebündelt mit U2-ADR-032). Die **Umsetzung** (`bwwiz`-Registrierungs-Fix) ist ein **separater Bau nach Freigabe** — nicht Teil dieser ADR-Ablage.
- **ADR-Bezug:** dieser ADR (U2-ADR-033); Schwester U2-ADR-032 (Begriffe).
**Status heute:** teilweise überholt durch U2-ADR-100 — die Wizard-gestützten Basis-Dokumente (`vvwiz`/`bwwiz`/`erbwiz`) sind entfallen, nur `pvwiz`/`kiwiz` bleiben (`WIZARD_DOKUMENT_MAP`, `vivodepot.html:24633`); die Testament-Verzicht-Linie (Sondergrenze Testament) gilt unverändert fort (U2-ADR-100 §4, „Fortführung von ADR-033").

---

## Kontext

Tester empfanden die Führung durch Vorsorge-Dokumente als den eigentlichen Mehrwert. Der Wizard-Befund zeigt: die geführte Ausfüllhilfe existiert bereits (zehn Wizards, gebaut, verdrahtet). Diese ADR legt fest, welche Basis-Vorlagen Vivodepot führt, mit welcher Haltung und mit welchen Grenzen — und schließt zwei Abweichungen zwischen Beschluss und Code.

## Entscheidung — vier Basis-Dokumente

1. **Vorsorgevollmacht** — BMJ-geführt per Wizard (`vvwiz`), registriert `standardDokument`.
2. **Betreuungsverfügung** — BMJ-geführt per Wizard (`bwwiz`), registriert `standardDokument` **(neu — siehe Umsetzung)**.
3. **Patientenverfügung** — BMJ-geführt per Wizard (`pvwiz`), registriert `standardDokument`.
4. **Testament** — **nur Katalog-Kopf / Jahres-Prüf-Reminder, kein Ausfüll-Wizard, kein vorgegebener Verfügungstext.**

**Ausweise: raus.** **Energie und Schwerbehinderung: situative Themenfelder, kein Kern.**

## Haltung (verbindlich für jede geführte Vorlage)

- Inhalte aus den amtlichen **BMJ-Mustern**. Vivodepot **führt durch das Ausfüllen, berät nicht.**
- **Haftungsausschluss** an jeder geführten Vorlage (Linie U2-ADR-025).
- **Erklären statt Raten als Auflage, nicht nur als Kleingedrucktes:** Der Haftungsausschluss schützt nicht, wenn die Führung selbst in eine Richtung drängt. Empfiehlt ein Erklärtext subtil eine Option, ist das Beratung — unabhängig vom Disclaimer. Die Trennlinie zwischen Erklären und Raten muss **im Inhalt jedes Erklärtexts** sitzen. Sorgfaltsanforderung an jeden `hilfetext`.

## Sondergrenze Testament

Eigenhändige Testamente sind formstreng; ein vorgegebener Verfügungstext würde Vivodepot zum Verfasser machen und Haftung auslösen. Deshalb: **kein Testament-Ausfüll-Wizard, kein Verfügungstext** — nur der Reminder-/Katalog-Eintrag. Der Code entspricht dem bereits (`erbwiz` registriert `testament` als Kopf, ohne Verfügungstext-Wizard); diese ADR hält die Grenze ausdrücklich fest, damit sie nicht später „nachgebaut" wird.

## Offener Rechtspunkt (nicht in dieser ADR entschieden)

Ob eine geführte Ausfüllhilfe für Patientenverfügung und Vorsorgevollmacht in Deutschland als **Rechtsdienstleistung** (RDG) gilt, ist eine Rechtsfrage. Kommerzielle Anbieter tun Vergleichbares, also offenbar machbar — aber die Grenze zwischen erlaubter Ausfüllhilfe und erlaubnispflichtiger Rechtsdienstleistung klärt **eine hinzugezogene Anwältin**. Hier nur als offener Punkt markiert; diese ADR trifft dazu keine Entscheidung.

## Umsetzung (separater Bau nach Freigabe — nicht Teil dieser Ablage)

- **`bwwiz` registriert am Abschluss ein `betreuungsverfuegung`-`standardDokument`** analog `vvwiz`/`pvwiz` (`WIZARD_DOKUMENT_MAP` ergänzen, Standard-Doku-Definition ergänzen). **Heute fehlt das** (verifiziert: `bwwiz` nicht in der Map) — die beschlossene Vorlage erzeugt keinen Dokument-Eintrag. **Bug, kein Designentscheid.**
- Davon getrennt vorgemerkt (eigener kleiner Fix): der Dangling-Anlass „Pflegeheim" → `pflegewiz` (existiert nicht; real `pflwiz`) klickt ins Leere.

## Konsequenzen

- Basis-Liste ist eindeutig vier Dokumente, drei davon BMJ-geführt, Testament reminder-only.
- Nach dem `bwwiz`-Fix stimmen Beschluss und Code überein (declared = verified).
- Diese ADR-Ablage ändert **keinen** Code; Block-Pin `8d31c678…` unverändert. Der `bwwiz`-Bau folgt als eigener Strang (Stufe-1 zuerst, Halt vor Commit).

## Cross-Referenz

U2-ADR-032 (Begriffe — Dokument vs. Wizard), U2-ADR-014 (Dokument-Ebene + Wizard-Abschluss-Registrierung), U2-ADR-025 (Haftungshinweis — keine Beratung). Befund `befund-wizard-fuehrungs-mechanik-2026-06-22` (intern). Produktiv: —
