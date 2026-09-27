# B16-ADR-097 · Notfallkarte als Druck-Export (V3.2)

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 23.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


**Status:** akzeptiert
**Datum:** 23.05.2026
**Klärungs-Sitzung:** 22.05.2026 (Begriffs-Konsolidierung, Abgrenzung Druck-Export vs. Cache)
**Drift-Klassifikation:** Klasse-E (Refactor-Drift) — `generateNotfallkarte()` aus beta-16 ohne ADR-Entscheidung entfernt
**Anschluss-ADRs:** B16-ADR-061v3 (Angehörigen-Cache Stufe 2, Abgrenzung), künftige ADR DRK-/ADAC-Anschluss

---

## Kontext und Problem

In beta-16 existierte die Funktion `generateNotfallkarte()` (Z.21430–21539 im beta-16-Stand) als Druck-Export für eine personalisierte Notfallkarte im Scheckkartenformat. Im rc-1-Refactoring-Sprint (Block 6, Finish-Sprint 09.05.2026) wurde diese Funktion ohne expliziten ADR-Entscheid entfernt. Das ist eine Klasse-E-Drift (Refactor-Drift).

Das Template-Datenmodell für die Notfallkarte ist dagegen im aktuellen Code vollständig vorhanden: `VIVODEPOT_STANDARD_TEMPLATES` enthält als letztes Element (Positions-Nr. 7) die „Persönliche Notfallkarte" mit der Template-ID `vivodepot-std-notfallausweis` (Code-Zeile Z.48559, damaliger Stand).

Anmerkung zur Code-Kommentierung: Im Array `VIVODEPOT_STANDARD_TEMPLATES` sind sowohl die Pflegegrad-Dokumentation (Z.48535) als auch die Persönliche Notfallkarte (Z.48559) mit `// 7 —` kommentiert. Diese Dopplung ist ein Kommentar-Drift ohne funktionale Wirkung — die Notfallkarte ist das siebte und letzte Element des Arrays (bestätigt durch Kommentar Z.48591: „8 → 7 nach Finish-Sprint 09.05.2026").

Die Klärungs-Sitzung vom 22.05.2026 hat festgestellt: Die Notfallkarte gehört nicht in den Angehörigen-Cache (B16-ADR-061v3), sondern ist eine eigene Architektur-Schicht — Druck-Export-Pfad mit ausgewählten Klar-Informationen, die die Inhaberin für den Ersthelfer-Kontext freigegeben hat.

---

## Entscheidung

### Festlegung 1 — Notfallkarte ist Druck-Export, nicht Cache

Die Notfallkarte ist kein Cache und enthält keine verschlüsselten Daten. Sie enthält ausgewählte Klar-Informationen, die die Inhaberin explizit für den Notfall-Ersthelfer-Kontext freigegeben hat. Sie ist eine druckbare Visitenkarte für den Stick.

**Abgrenzung zu B16-ADR-061-Familie:**

- Notfall-Cache Stufe 1 (B16-ADR-061v2/v3): unverschlüsselte Akut-Daten im `localStorage`, sichtbar ohne Passwort in der App-UI.
- Notfall-Cache Stufe 2 (B16-ADR-061v3): verschlüsselter Angehörigen-Cache mit zweitem Passwort — fünf Situationsblätter.
- Notfallkarte (diese ADR): Druck-Export-Pfad — physisches Kärtchen, keine App-Session nötig.

Stick und Karte schließen sich nicht aus. Der Stick liegt zu Hause oder in der Handtasche, die Karte ist beim Träger ständig dabei. Im Erste-Hilfe-Szenario ohne verfügbaren Rechner ist die Karte die einzige Quelle.

### Festlegung 2 — Format: Scheckkartenformat 85×54 mm

Druck-Format: 85×54 mm (ISO/IEC 7810 ID-1, Scheckkartenformat). Ziel: ausschneiden, laminieren, in die Brieftasche stecken. Kein Faltblatt, kein A4-Ausdruck.

Die Karte enthält auf der Vorderseite:
- Name der Inhaberin
- Geburtsdatum
- Blutgruppe (falls gepflegt)
- Allergien (komprimiert, max. 2 Zeilen)
- Medikamente (komprimiert, max. 2 Zeilen)
- Notfall-Kontakt (Name + Telefon)
- Aufbewahrungshinweis auf den Stick (optional: QR-Code mit Aufbewahrungsort-Info)

Keine Krankenkassen-Nummer, keine Adressen, keine umfassenden Diagnosen — die Karte ist Ersthelfer-Kurzinformation, nicht medizinische Akte.

### Festlegung 3 — Datenquelle: VIVODEPOT_STANDARD_TEMPLATES Nr. 7

Datenquelle ist das Template `vivodepot-std-notfallausweis` in `VIVODEPOT_STANDARD_TEMPLATES` (Z.48559–48586, damaliger Stand). Die Template-Felder:

| Feld-ID | Label | Pflicht |
|---|---|---|
| `name` | Name | ja |
| `geburtsdatum` | Geburtsdatum | ja |
| `blutgruppe` | Blutgruppe | nein |
| `allergien` | Allergien | nein |
| `medikamente_kurz` | Medikamente (kurz) | nein |
| `kontakt_notfall` | Notfall-Kontakt | ja |
| `krankenkasse_kurz` | Krankenkasse | nein |

Die Template-Felder passen vollständig zum Karten-Format. Kein neues Datenmodell notwendig.

### Festlegung 4 — DRK-/ADAC-Anschluss als offener Punkt

DRK und ADAC haben eigene Notfall-Ausweis-Formate. Ein Anschluss-Pfad wäre möglich (z. B. DRK-Notfallausweis als alternatives Druck-Layout oder als Basis-Vorlage). Diese Frage wird in einer späteren eigenen ADR behandelt. Für v1.0 wird kein DRK- oder ADAC-Branding verwendet — die Karte ist Vivodepot-eigene Vorlage ohne externe Marken-Abhängigkeit.

---

## Implementations-Folgen

### Code-Anpassungen (Implementations-Sprint N2.3)

1. **`generateNotfallkarte()`** — Funktion aus beta-16 auf aktuellen Code-Stand portieren. Druck-Format 85×54 mm in jsPDF. Datenquelle: Template-Felder aus `vivodepot-std-notfallausweis` plus lebende Daten aus `data`.

2. **Druck-Dialog im UI** — Button „Notfallkarte drucken" im Template-Bereich (vivoTyp `notfallausweis`). Nach Klick: Vorschau + Toast-Hinweis „Ausschneiden und laminieren — passt in jede Brieftasche."

3. **QR-Code-Option** — optional: kleiner QR-Code auf der Karte mit dem `notfallkarte_ort`-Feld-Inhalt (Aufbewahrungshinweis auf den Stick). Nur wenn das Feld gepflegt ist.

4. **Klasse-A-Test** — Druck-Vorschau: Karte enthält Pflichtfelder, kein Krypto-Material, kein Master-Schlüssel, kein Depot-Inhalt außer den freigegebenen Feldern.

### Nicht in diesem Sprint

- DRK-/ADAC-Anschluss-Layout (eigene ADR)
- NFC-Chip-Export (post-v1.0)
- Mehrsprachige Karte (post-v1.0)

---

## Negative Konsequenzen

- Kein Recovery-Schutz: physische Notfallkarte kann verloren gehen oder unbemerkt vervielfältigt werden. Die auf der Karte enthaltenen Daten sind Klar-Daten. Inhaberin muss das bewusst entscheiden — UI-Hinweis bei Erstellung.
- Aktualitäts-Pflicht: wenn sich Medikamente oder Kontaktdaten ändern, muss die Karte neu gedruckt werden. Kein Automatismus.

---

## Verwandte ADRs

- B16-ADR-061v3 (Notfall-Cache Stufe 2 — Abgrenzung: Karte ist kein Cache)
- B16-ADR-061v2 (Notfall-Cache zweistufig — Stufe 1 als inhaltliche Verwandtschaft)
- Künftige ADR „Notfallkarte DRK-/ADAC-Anschluss"

---

## Verifikations-Anker (Klasse-I-Disziplin)

- `VIVODEPOT_STANDARD_TEMPLATES` — 7. Element (Persönliche Notfallkarte, id `vivodepot-std-notfallausweis`): Code-Zeile Z.48582–48610, HEAD nach V4.3-Korrektur (Commit folgt auf damaliger Stand).
- Kommentar-Hinweis Z.48413: „Verbleiben sieben Templates" (nach Organspendeausweis-Entfernung).
- Kommentar Z.48615: `_ladeStandardTemplates()` — „8 → 7 nach Finish-Sprint 09.05.2026 Block 6" bestätigt 7 aktive Templates.
- `generateNotfallkarte()` — im aktuellen Code nicht vorhanden (grep-Verifikation gegen den damaligen Stand). Nur `notfallkarte_ort` als Daten-Feld erhalten (Z.59688, Z.59699, Z.61753 u. a.).
- Kommentar-Nummerierung: nach V4.3-Korrektur (23.05.2026) ist `// 7 —`-Duplikat aufgelöst. Nummerierung 1,2,3,4,5,6,7 — lückenlos. Medikationsplan war fälschlich `// 6 —` (jetzt `// 5 —`), Pflegegrad war fälschlich `// 7 —` (jetzt `// 6 —`).

---

*Akzeptiert 23. Mai 2026. Implementations-Sprint N2.3 ab 15.06.2026.*
