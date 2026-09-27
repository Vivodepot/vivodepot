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
