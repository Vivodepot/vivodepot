# B16-ADR-057: Privacy-Erzwingung (Entwurf zur Durchsicht)

- **Status:** Abgelehnt (25.09.2026) — als eigene Entscheidung nicht nötig, die Sache entscheidet B16-ADR-066
- **Status heute:** abgelehnt — es gilt `vivodepot-B16-ADR-066-privacy-erzwingung-2026-05-04.md`
- **Angelegt:** 19.09.2026
- **Herkunft:** Die ursprüngliche Skizze mit dieser Nummer ist nicht überliefert. Dieser Entwurf stützt sich ausschließlich auf Belege im heutigen Bestand.
- **Kategorie:** SICHERHEIT | ARCHITEKTUR

## Was belegt ist

Die interne ADR-Gültigkeitsprüfung vom 19.07.2026 führt „Privacy-Erzwingung" unter den fortgeltenden Entscheidungen, Zeile: „umgesetzt, teils mit abweichenden Werkzeugen". Die Einzelprüfung vom 13.07.2026 nennt als Nachfolger die ausgeschriebene Entscheidung zum selben Thema. Ein Originaltext der Skizze wurde in keiner Ablage gefunden; die einzige Datei, die den Nummernbereich im Namen trägt, ist leer.

## Was heute im Code gilt

Alle Stellen beziehen sich auf den Stand vom 19.09.2026 (Zeilenangaben können sich verschieben).

- Die Kern-Datei verbietet jeden Netzpfad für Inhalte: `vivodepot.html:30-31`, Content-Security-Policy mit `default-src 'none'` und `connect-src 'none'`. Der Kommentar `vivodepot.html:17-28` nennt als Grund „KEIN Netz-Pfad für Inhalte/Depots/Schlüssel/Metadaten" und verweist auf die ausgeschriebene Entscheidung B16-ADR-066.
- Ausgaben in HTML werden maskiert: `escapeHTML` in `vivodepot.html:61451` ersetzt `&`, `<`, `>`, `"` und `'`; `escapeAttr` direkt darunter für Attributwerte.
- Unmaskierte Verkettung in Attributen findet `tools/attribut-verkettung-pruefen.js`.
- Die Proben liegen in `tests/d43-etappe6-csp.test.js` (Richtlinie) und `tests/g11-offline-garantie-proben-unabhaengig.test.js` (Offline-Garantie).
- Der Rahmen-Schutz ohne Response-Header steht als Skript-Block in `vivodepot.html` (Kommentar unmittelbar unter dem Meta-Tag der Richtlinie); die im Kommentar genannte Probe `tests/rahmen-schutz-ohne-header.test.js` existiert in diesem Stand nicht.

## Verwandte Entscheidungen

- `vivodepot-B16-ADR-066-privacy-erzwingung-2026-05-04.md` — vollständig ausgeschrieben: offline als Voreinstellung, Netzaufrufe nur nach ausdrücklicher Beauftragung, Content-Security-Policy, vollständige Maskierung. Ob die verlorene Skizze 057 die Vorstufe davon war, ist plausibel, aber nicht belegt.
- `vivodepot-U2-ADR-015-interner-verschluesselter-arbeitsstand-2026-06-12.md` — die Content-Security-Policy im Kern verweist darauf.

## Entscheidung

Abgelehnt (25.09.2026). B16-ADR-066 entscheidet dieselbe Sachfrage und ist akzeptiert; eine zweite Entscheidung daneben hätte nur zwei Stellen erzeugt, die auseinanderlaufen können. Dieser Entwurf bleibt als Beleg stehen, wo die Umsetzung am 19.09.2026 stand.

## Begründung

Die Gründe für die Skizze selbst sind nirgends überliefert; die Gründe der geltenden Fassung stehen in B16-ADR-066 und werden hier nicht als Gründe der Skizze ausgegeben.

## Offen

- Die im Kern-Kommentar genannte Rahmen-Schutz-Probe (`tests/rahmen-schutz-ohne-header.test.js`) fehlt im Bestand. Sie ist als eigener offener Posten geführt (Befund-Ratsche RAHMEN-SCHUTZ-PROBE), nicht als Teil dieser abgelehnten Entscheidung.
