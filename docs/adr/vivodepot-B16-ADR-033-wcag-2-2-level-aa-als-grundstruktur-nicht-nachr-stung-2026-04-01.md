# B16-ADR-033: WCAG 2.2 Level AA als Grundstruktur, nicht Nachrüstung

> **Überführt in den Bestand am 18.09.2026** — nur Monat/Jahr im Original angegeben ("2026-04"), Tag im Dateinamen auf 01 gesetzt — die Original-Datumszeile im Dokument selbst bleibt unverändert stehen. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** Umgesetzt
- **Datum:** April 2026
- **Kategorien:** BARRIEREFREIHEIT
- **Format:** Altformat des Vorgängerprojekts (B16-ADR-001 bis 046 bleiben in dieser Form und werden nicht nach MADR 4.0 überführt)
- **Quelle:** Entscheidungssammlung des Vorgängerprojekts, Stand 24.04.2026

## Inhalt (Roh-Form)

KONTEXT: B16-ADR-018 entschied die Übernahme von WCAG 2.2 als Mindeststandard, mit zwei konkret umgesetzten Erfolgskriterien (2.4.11 Focus Not Obscured, 2.4.13 Focus Appearance). Mit der Verabschiedung des BFSG (in Kraft seit 28. Juni 2025) und der bevorstehenden Aktualisierung der EN 301 549 auf WCAG 2.2 wurde die Frage neu gestellt, ob die vollständige Norm als Grundstruktur angenommen werden soll. ENTSCHEIDUNG: Vivodepot implementiert WCAG 2.2 Level AA vollständig als Grundstruktur, nicht als nachträgliche Anpassung einzelner Kriterien. Die vier Prinzipien (Wahrnehmbarkeit, Bedienbarkeit, Verständlichkeit, Robustheit) sind in jedem UI-Element gestaltet: echte &lt;button&gt; statt gestylter &lt;div&gt;, semantische Heading-Hierarchie, ARIA wo nötig, Tastatur-Vollbedienbarkeit, 4,5:1-Kontrast für Text, 200%-Zoom ohne Funktionsverlust, keine Drag-and-Drop-only-Interaktionen. Eine Barrierefreiheitserklärung wird aktiv geführt, obwohl Vivodepot ein Produkt ist. ABGELEHNTE ALTERNATIVEN: Nachträgliche Anpassung einzelner Kriterien (war beta.15-Ansatz — führt zu Flickwerk) · Accessibility-Overlays wie UserWay oder AccessiBe (rechtlich umstritten, schlechte Realqualität — siehe A35) · Nur WCAG 2.1 AA als Mindeststandard (nicht ausreichend für Zielgruppe Senioren 60+, B16-ADR-018) NACHWEIS: Entscheidung vom 24. April 2026. BFSG seit 28. Juni 2025 in Kraft. EN 301 549 Aktualisierung in Planung. WCAG 2.2 hat sechs zusätzliche Erfolgskriterien gegenüber 2.1, alle mit Bordmitteln umsetzbar. KONSEQUENZEN: Vivodepot ist BFSG-konform als Bürger-Produkt. Die Grundstruktur erlaubt allen Folge-Templates und institutionellen Erweiterungen, die WCAG-Konformität zu erben, statt sie neu herzustellen. BITV-Test-Prüfkriterien dienen als QA-Checkliste vor jedem Release. Dies stärkt auch das ZenDiS-Souveränitätsmapping (B16-ADR-035).

---

*Roh-Extraktion am 29.05.2026 aus der Entscheidungssammlung des Vorgängerprojekts.
ALL-CAPS-Marker (KONTEXT:, ENTSCHEIDUNG:, ABGELEHNT:, KONSEQUENZEN:) im
obigen Text sind die Original-Struktur-Marker des Quelldokuments. Eine
strukturierte Trennung in MADR-Abschnitte wurde nicht durchgefuehrt, weil
B16-ADR-001 bis 046 im Altformat bleiben.*

## Nachtrag 22.10.2026: Der belegte Stand statt „BFSG-konform als Bürger-Produkt“

**Status heute:** gilt. Die Belege stehen im `konformitaet`-Block unten.

### Anlass

Diese ADR hält fest: „Vivodepot ist BFSG-konform als Bürger-Produkt“ und „Eine Barrierefreiheitserklärung wird aktiv geführt, obwohl Vivodepot ein Produkt ist.“ Beide Sätze stammen aus dem Vorgängerprojekt (Altformat, Roh-Extraktion). Gegen den heutigen Stand gelesen trägt der erste nicht, und der zweite ist noch nicht erfüllt.

Weg zum Nachsehen: `git show origin/u2-kanon:docs/adr/vivodepot-B16-ADR-033-wcag-2-2-level-aa-als-grundstruktur-nicht-nachr-stung-2026-04-01.md` (der ganze Inhalt steht in Zeile 16).

### Was gilt

1. **Der Satz „Vivodepot ist BFSG-konform als Bürger-Produkt“ gilt nicht mehr.** Er sagt ein Rechtsergebnis, das nicht belegt ist (Punkt 5). Ebenso gelten „Status: Umgesetzt“ und „implementiert WCAG 2.2 Level AA vollständig“ nicht als Zustand: vollständig ist nichts belegt (Punkt 5); Tastaturbedienung und 200 % Zoom sind ohne eigenen Gesamtdurchgang. Der Originaltext bleibt stehen. Außentexte und Dokumente sagen nicht „BFSG-konform“.
2. **Der Maßstab bleibt WCAG 2.2 Stufe AA** (B16-ADR-018 und diese ADR). Das ist eine Entscheidung über den Prüfmaßstab, keine Aussage, dass alles erfüllt ist.
3. **Automatisch geprüft wird so:** `tests/konformitaet/wcag-axe.mjs` (Kern) und `tests/konformitaet/wcag-axe-lesen.mjs` (Lese-App) laufen mit axe-core und den Tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` und `EN-301-549` im `pre-push` (`npm run test:konformitaet`) und verlangen 0 Verstöße jeder Schwere über alle gescannten Sichten (gemessen am 22.10.2026: 31 Sichten der Anwendung und 16 der Lese-App; U2-ADR-221 nannte am 02.09.2026 noch 39, seit dem Verschluss des Kerns am 18.09.2026 sind es weniger). Grenzen, so benannt:
   - Sieben Sichten der Anwendung werden derzeit nicht gescannt: Notfall, Bestandsauswahl, Prüftermine, Depot-Liste, Eintragen-Übersicht, verwaltete Depots und der Dialog zum Entsiegeln eines Sub-Depots. Ob sie Verstöße haben, ist nicht gemessen.
   - Die Logo-Elemente (`.logo-wort`, `.vd-logo`) nimmt `.exclude()` aus **allen** Regeln, nicht nur aus 1.4.3.
   - Sichten, die sich nicht öffnen lassen, werden übersprungen, ohne als Fehler zu gelten; ein Teil wird dabei gemeldet, ein Teil fällt ohne Meldung weg (Notfall und Bestandsauswahl).
   - Die Bearbeiten-Strecke war schon in der Gesamtprüfung vom 06.09.2026 nicht live geprüft.
   - Die experimentelle axe-Regel `label-content-name-mismatch` (2.5.3, Label im Namen) läuft nicht.
   - axe findet erfahrungsgemäß nur einen Teil der Fehler; oft wird rund ein Drittel der Erfolgskriterien genannt (keine eigene Messung).
4. **Einzelkriterien mit eigener Entscheidung und Probe:**
   - U2-ADR-260 und U2-ADR-278: die Sprachdeklaration (`lang`, SC 3.1.1), geprüft über `tests/produkt-html-lang.test.js` und `tests/u2-adr-260-sprachkennung-folgt-modul.test.js`.
   - U2-ADR-340: Kein Design darf einen der vier Zustandsblöcke der Lese-App (die Warnungen) ausblenden, verdecken oder unlesbar machen; geprüft wird das Ergebnis (Fläche, `elementFromPoint`, Kontrast von mindestens 4,5:1 gegen den gerenderten Grund), die Probe nennt U2-ADR-340. Ein WCAG-Bezug besteht nur über den Kontrast (1.4.3).
5. **Nicht belegt, darum offen:**
   - die manuell zu prüfenden Kriterien (kein BITV-Test mit seinen 98 Prüfschritten, die diese ADR als QA-Liste vor jedem Release nennt);
   - Tests mit Hilfstechnik (VoiceOver, NVDA, TalkBack): ein durchgeführter Durchgang ist nicht belegt;
   - die Befunde der internen Prüfung vom 06.09.2026, die noch offen sind oder nicht neu gemessen wurden (Sprunglink, `aria-invalid` und `aria-describedby`, Textabstand 1.4.12, Eingabezweck 1.3.5, 2.5.3 am Knopf „Depot verlassen“); die Liste führt die Erklärung (nächster Punkt);
   - `forced-colors` und `prefers-contrast` (U2-ADR-221, „ausdrücklich nicht behandelt“);
   - die PDF-Ausgabe (offen).
6. **„Eine Barrierefreiheitserklärung wird aktiv geführt“ ist noch nicht erfüllt.** Es gibt keine Erklärung auf der Website und keine im Produkt. Ein Entwurf liegt vor; er trennt eine freiwillige Erklärung zur Anwendung von den Informationen nach BFSG Anlage 3 Nr. 1 für den Shop und wird erst nach unabhängiger Quellenprüfung veröffentlicht. Bis dahin gilt der Satz als Absicht, nicht als Zustand.
7. **Ob die Anwendung unter das BFSG fällt, ist offen und wird rechtlich geklärt.** Als Software steht die Bürger-App nicht in der Produktliste von § 1 Abs. 2 BFSG; ob ein kostenloser Download ein Verbrauchervertrag im Sinn des Gesetzes ist, steht nicht im Gesetzestext. Ob der Bestellweg im Shop eine Dienstleistung im elektronischen Geschäftsverkehr ist (§ 2 Nr. 26 BFSG), hängt davon ab, ob dort Verbraucherverträge geschlossen werden; am 22.10.2026 führt der Shop nur kostenlose Fassungen. Ob die Kleinstunternehmen-Ausnahme (§ 3 Abs. 3 BFSG) greift, ist nicht festgestellt.
8. **EN 301 549:** Das Register führt V3.2.1 (Kap. 9 Web = WCAG 2.1 AA). Die Fassung V4.1.1 liegt bei ETSI seit 02.09.2026 vor; ihr Normtext und eine Fundstelle im Amtsblatt sind nicht gelesen. Die Aussage dieser ADR, die EN 301 549 werde auf WCAG 2.2 aktualisiert, ist damit weder bestätigt noch widerlegt.

### Folgen

Die Aussage „BFSG-konform“ steht weder in Außentexten noch in Dokumenten, solange (5) bis (7) offen sind. Die Außenaussage ist: WCAG 2.2 AA als Maßstab, automatisch geprüft nur in dem Umfang, den Punkt 3 mit Datum und Grenzen nennt (31 Sichten der Anwendung und 16 der Lese-App gescannt, sieben Sichten der Anwendung nicht), so wie die Erklärung sie nennt. Die offenen Punkte stehen als Aussagen mit Zustand `offen` im Block, mit Frist und Bedingung; ein Punkt wird erst geschlossen, wenn eine Probe oder eine Entscheidung dafür steht.

```yaml
konformitaet:
  - aussage: >-
      Der Prüfmaßstab ist WCAG 2.2 AA; axe-core prüft die gescannten Sichten des Kerns und der Lese-App mit den Tags wcag2a, wcag2aa,
      wcag21aa, wcag22aa und EN-301-549 im pre-push und verlangt 0 Verstöße. Gescannt werden am 22.10.2026 31 Sichten der Anwendung und
      16 der Lese-App; sieben Sichten der Anwendung fehlen (Notfall, Bestandsauswahl, Prüftermine, Depot-Liste, Eintragen-Übersicht,
      verwaltete Depots, Dialog zum Entsiegeln eines Sub-Depots).
    zustand: geprüft
    herkunft: B16-ADR-033-Nachtrag (22.10.2026), U2-ADR-221
    pruefung:
      - tests/konformitaet/wcag-axe.mjs "[Konformität] axe-core WCAG 2.2 AA über alle V1-Sichten"
      - tests/konformitaet/wcag-axe-lesen.mjs "[Konformität] axe-core WCAG 2.2 AA über alle Lese-App-Sichten"
  - aussage: >-
      Die Sprachdeklaration (lang, SC 3.1.1) folgt dem Sprachmodul und ist für die ausgelieferten Produkte gesetzt.
    zustand: geprüft
    herkunft: B16-ADR-033-Nachtrag (22.10.2026), U2-ADR-260, U2-ADR-278
    pruefung:
      - tests/u2-adr-260-sprachkennung-folgt-modul.test.js "[U2-ADR-260·lang] das angedockte Sprachmodul bestimmt die Kennung"
  - aussage: >-
      Grenzen des axe-Laufs, aus dem Quelltext von tests/konformitaet/wcag-axe.mjs gelesen: Logo-Elemente sind aus allen
      Regeln ausgenommen; Sichten, deren Öffner im Produkt nicht erreichbar ist, werden übersprungen (ein Teil davon ohne
      Meldung); die Regel für 2.5.3 läuft nicht; die Bearbeiten-Strecke wird nicht gescannt.
    zustand: nicht-prüfbar
    grund: Die Aussage beschreibt, was die Probe nicht prüft; sie ist am Quelltext der Probe nachzulesen, nicht durch einen Test zu sichern.
    herkunft: B16-ADR-033-Nachtrag (22.10.2026)
  - aussage: >-
      Die manuell zu prüfenden Kriterien (BITV-Test, 98 Prüfschritte) und ein Test mit Hilfstechnik (VoiceOver, NVDA, TalkBack) sind
      als durchgeführt belegt.
    zustand: offen
    frist: 2026-12-11
    bedingung: ein Durchgang mit Hilfstechnik und die manuelle Prüfung liegen vor
    herkunft: B16-ADR-033-Nachtrag (22.10.2026)
  - aussage: >-
      Eine Barrierefreiheitserklärung steht auf der Website oder im Produkt; die Absicht „wird aktiv geführt“ aus dieser ADR ist erfüllt.
    zustand: offen
    frist: 2026-12-11
    bedingung: unabhängige Quellenprüfung des Erklärungsentwurfs, dann Veröffentlichung
    herkunft: B16-ADR-033-Nachtrag (22.10.2026)
  - aussage: >-
      Ob die Anwendung (Bürger-App) und der Shop unter das BFSG fallen und ob die Kleinstunternehmen-Ausnahme gilt, ist rechtlich geklärt.
    zustand: nicht-prüfbar
    grund: Rechtsfrage, durch Rechtsrat zu klären, nicht durch einen Test.
    herkunft: B16-ADR-033-Nachtrag (22.10.2026)
```
