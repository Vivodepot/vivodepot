# U2-ADR-008: Propagation — einmal eintragen, überall auswählen

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, UX
**U2-Bezug:** U2-ADR-005 (Urheberschaft nutzt `data.menschen[]` schon), U2-ADR-006 (Andock-Architektur), U2-ADR-007 (Gesundheits-Sektor).
**Status heute:** gilt — Propagations-Mechanik im Kern nachweisbar: `CROSS_SEKTOR_FELDER` + `crossSektorAnmelden()` (`vivodepot.html:7149` ff.), Felder vom Typ `ref`/`refMehrfach`, `listenEintragHinzufuegen`/`listenEintragAktualisieren` vorhanden.

---

## Funktionales Ziel

**Was die Bürgerin einmal eingetragen hat, soll sie nicht erneut tippen müssen.** Egal welche Art von Eintrag — Personen, Institutionen, Adressen, jede Entität, die in mehreren Feldern auftaucht. Beim nächsten Feld, das denselben Typ erwartet, erscheint der bestehende Eintrag zur Auswahl.

Ändert sich später eine Telefonnummer oder eine Adresse, wirkt sich die Änderung überall aus, ohne jede Stelle einzeln nachzupflegen.

## Geltungsbereich — alle wiederverwendbaren Entitäten

Mindestens diese Typen treten in U2 mehrfach in verschiedenen Feldern auf und gehören damit in den zentralen Speicher:

- **Personen:** Hausarzt, Zahnarzt, Fachärzte, Notar, Anwalt, Bevollmächtigte, Hauptpflegeperson, Vertrauensperson, Seelsorger, Steuerberater, Finanzberater, Vermieter, Familienangehörige.
- **Institutionen:** Krankenkasse, Pflegekasse, Pflegedienst, Krankenhaus, Bestattungsunternehmen, Bank, Versicherung, Standesamt, Meldebehörde, Arbeitgeber.
- **Adressen:** Meldeadresse, frühere Adressen, Praxis- oder Kanzlei-Adressen (taugen als eigener Typ oder als Teil von Personen/Institutionen — Detail-Entscheidung beim Bau).

Jeder dieser Typen bekommt einen eigenen zentralen Speicher mit eigenem Schema. Personen passen nicht in dieselbe Struktur wie Institutionen (kein Geburtsdatum, andere Kontaktlogik), und Adressen sind klein genug, um eigenständig zu leben.

## Bezug zu den drei Produktiv-ADRs

**ADR-095** liefert die Mechanik, hier verallgemeinert:

- Pro Entitätstyp ein zentraler Speicher (`data.menschen[]` für Personen, eigene Listen für Institutionen, Adressen).
- Felder, die solche Entitäten bezeichnen, speichern Referenzen statt Text: `{ref, override}`. Lookup beim Render liefert den aktuellen Eintrag; Override als String erlaubt Freitext, wenn die Bürgerin etwas Manuelles ergänzen will.
- Inline-Anlage-Modal: Aus jedem Feld heraus kann eine neue Entität angelegt werden, ohne den Kontext zu wechseln.
- Vorschlags-Logik: Beim Render wird der passende Speicher nach Typ und Rolle gefiltert, passende Einträge erscheinen zur Auswahl.

**ADR-075** liefert den Mechanismus für Cross-Sektor-Sichtbarkeit (deklarative `CROSS_SEKTOR_FELDER`-Tabelle, Daten am Original-Ort, Mehrfach-Anzeige als Render-Sicht). Tabelle wächst mit den U2-Sektoren mit.

**ADR-074** als konzeptueller Hintergrund schon in U2-ADR-006 verankert.

## Abgrenzung

- **Eigentum:** Jedes Feld hat genau einen Quell-Sektor. Cross-Sichtbarkeit ist Render, keine zweite Speicherung.
- **Cross-Refs sind unidirektional und explizit** — nur deklarierte Sichten propagieren.

## Implementations-Reihenfolge

1. **Mechanik einziehen, ein Entitätstyp nach dem anderen, mit demselben Muster.** Personen zuerst (Speicher existiert, ADR-095 hat die Vorlage). Institutionen als zweiter Typ. Adressen als dritter — oder als Teil der ersten beiden, je nachdem was beim Bau natürlicher fällt. `personName()`/`institutionName()`-Render-Helper, Inline-Anlage-Modal pro Typ, Vorschlags-Dropdown nach Typ und Rolle. `CROSS_SEKTOR_FELDER`-Tabelle aufsetzen, zunächst leer.
2. **Sweep durch bestehende Sektoren:** Felder in Gesundheit, Sozialversicherung, Vorsorge und Identität, die heute Text sind, auf `{ref, override}` umstellen. Personen-Felder und Institutionen-Felder. Cross-Refs zwischen den vier bestehenden Sektoren eintragen.
3. **Künftige Sektoren werden mit Propagation gebaut**, nicht mehr nachgerüstet.

## Implementations-Verweis

**Schritt 1 — Mechanik:**
- Doku-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)*, Kern-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)*, Suite-Commit *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 29.05.2026)*. Suite 82/82 grün, Block-Hash unverändert `6eb590b9…`, SHA-256 Kern `d72e5e06…`.
- Verifiziert: Person mit zwei Refs zeigt denselben Namen; Telefon-Änderung propagiert; Override (String) gewinnt vor Lookup; Vorschlag nach Rolle/Art gefiltert; Institution analog; Urheberschaft intakt; Cross-Sektor-Render-Pfad existiert (Tabelle leer).
- Entscheidung beim Bau: Adresse als String-Feld auf Person/Institution, kein eigener `data.adressen[]`-Speicher (eine Adresse pro Entität ist die Norm).

**Schritt 2 — Sweep: erledigt.** Nachtrag 04.08.2026 (aus einer eigenen Erhebung, gegen
`vivodepot.html` selbst nachgemessen): 36 Felder `typ: 'ref'`, 14 Felder `typ: 'refMehrfach'`, `CROSS_SEKTOR_FELDER`
über 12 `crossSektorAnmelden(…)`-Aufrufe befüllt (`:5824` ff.), `listenEintragHinzufuegen` (`:15119`)
und `listenEintragAktualisieren` (`:15153`) vorhanden. Dieser Nachtrag korrigiert nur den Status —
keine inhaltliche Überarbeitung dieser ADR.
