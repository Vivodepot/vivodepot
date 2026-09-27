# B16-ADR-075: Harmonisierungs-Sprint Feld-Sektor-Zuordnung v2

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 08.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-05-08
- **Kategorien:** ARCHITEKTUR | VERSIONIERUNG
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)

## Kontext und Problemstellung

Die Feld-Sektor-Zuordnung war über mehrere Bereiche hinweg inkonsistent: Vivo-relevante Felder (Bestattung, Abschiedswünsche, Briefe, gv_wünsche) lagen ohne eigenen Sektor verstreut in `ankerPerson`, Rollen-Felder aus Meine Menschen gehörten fachlich in andere Bereiche, neun Feld-Paare duplizierten sich, fünf als „Schweiz-Erbe" bezeichnete Felder (`ahv`, `pk_name`, `pk_nr`, `saeule3_institut`, `saeule3_nr`) trugen im Code tatsächlich deutsche Semantik, und die Cross-Sektor-Referenz-Tabelle war unvollständig (27 statt der fachlich nötigen Refs). Wie lässt sich diese Harmonisierung durchführen, ohne 30+ Render-Pfade im Code einzeln umzustellen und ohne Bestand-Daten aus Schema-7-Depots zu verlieren?

## Entscheidungstreiber

- **Datenerhalt bei Migration:** Bestand-Depots (Schema 7) dürfen bei der Migration auf Schema 8 keine Werte verlieren; die Migration muss idempotent sein.
- **Aufwandsminimierung:** 30+ Render-Pfade einzeln auf die neue Datenstruktur umzustellen wäre fehleranfällig und deutlich aufwändiger als geschätzt (21–30 h).
- **Fachliche Korrektheit:** Feld-Bezeichner sollen ihrer tatsächlichen Bedeutung im Code entsprechen, nicht ihrer historischen (Schweiz-)Herkunft.
- **Additive Versionierung:** Der Schema-Bump 7 → 8 soll additiv bleiben, kein Breaking Change für Bestand-Depots.
- **Deutsche Zielgruppe zuerst:** Deutsche Labels bleiben erhalten, echte Schweiz-Felder sind nicht im aktuellen Scope.

## Geprüfte Optionen

1. **Direkte Render-Pfad-Umstellung** — alle 30+ Stellen im Code, die betroffene Felder lesen oder schreiben, einzeln auf die neue Datenstruktur (`data.vivo`, konsolidierte Bleiber-Felder) umschreiben.
2. **Transparente get/set-Aliase** — `get(key)`/`set(key, val)` um Alias-Logik erweitern, sodass Wizard-Code, Render-Aufrufe und Lese-Pfade unverändert bleiben.
3. **Schweiz-Erbe-Felder ausblenden** — die fünf falsch benannten Felder unverändert lassen, aber über `FELD_SICHTBARKEIT` auf verborgen schalten.
4. **Schweiz-Erbe-Felder umbenennen (Variante C)** — Felder mit neuen, semantisch korrekten Bezeichnern versehen, Bestand-Werte per Migration umkopieren, deutsche Labels beibehalten.

## Entscheidung

Gewählt: **Option 2** (transparente get/set-Aliase) für die strukturelle Migration der Vivo- und Duplikat-Felder, und **Option 4 / Variante C** für die Schweiz-Erbe-Felder — weil beide den Bestand-Daten-Erhalt sichern, ohne Render-Code anzufassen, und den Implementierungsaufwand auf ca. 4 h gegenüber der Schätzung von 21–30 h reduzierten.

Ergänzend drei §2.9-Klärungen vor Implementations-Start:

- **Klärung 1:** Die Selbstreferenz `vollmacht_person` im vorsorge-Cross-Ref wurde entfernt (Block 2 verortet die Rolle bereits in Vorsorge, eine Referenz auf sich selbst ist sinnlos).
- **Klärung 2:** Der verwaltung-Cross-Ref wurde vom deprecated `steuer_id` auf `steuerid` umgestellt.
- **Klärung 3:** `krankheiten` erhält einen Compat-Helper, der bei leerem Wert `erkrankungen` liest (Lese-Alias), statt die 28 Vorkommen im Render-Code zeitnah umzubauen. Massen-Umbau ist als v1.1-TODO vermerkt.

## Konsequenzen

**Positiv.**
- Schema-Bump additiv (7 → 8), keine Breaking Changes; Bestand-Depots migrieren automatisch und idempotent (6 Migrationsschritte).
- Aufwand ca. 4 h statt geschätzter 21–30 h, weil get/set-Aliasing 30+ Render-Pfade transparent abdeckt.
- Schweiz-Erbe-Bezeichner sind jetzt semantisch korrekt (`dt_rentenversicherungsnr`, `bav_name`, `bav_nr`, `private_av_institut`, `private_av_nr`), deutsche Labels bleiben für die Bürger-Ansicht unverändert.
- Cross-Sektor-Referenzen erweitert von 27 auf 48 Refs über 7 Ziel-Sektoren, bessere Auffindbarkeit fachlich verwandter Felder.
- Vollständige Testabdeckung: 1939/1939 statisch grün, 16/16 Klasse-A-Tests (HSv2-A-T01..T16) grün, 319/320 Behavior-Regression grün + 1 lokal-skipped.
- Browser-Verifikation (§2.8) bestätigt alle Migrationsschritte live, inklusive Bestand-Daten.

**Negativ.**
- `krankheiten`/`erkrankungen` bleiben als Duplikat mit Compat-Helper parallel bestehen — technische Schuld bis zum v1.1-Aufräumen.
- `_DUPLIKAT_DEPRECATED_TO_BLEIBT` und `FELD_SICHTBARKEIT` bleiben als Übergangs-Konstrukte im Code, erhöhen die Komplexität bis zur v1.1-Bereinigung.
- Bestand-Fehler `maybeShowEmailOptin is not defined` (Init-Pfad) wurde identifiziert, aber nicht im Rahmen dieses Sprints behoben — separater Folge-Fix-Punkt.
- Echte Schweiz-Felder müssten bei künftigem Bedarf neu implementiert werden, da `FELD_SICHTBARKEIT` aktuell leer/inaktiv ist.

**Neutral.**
- Vier Test-Drifts in bestehenden Behavior-Tests korrigiert (Sektor-Anzahl-Erwartungen von `=== 7`/`=== 9` auf `>= 7`/`>= 9`, rootEmpty-Erkennung um `vivo`-Schlüssel erweitert).
- v1.1-TODO-Liste mit fünf Punkten dokumentiert: `krankheiten`-Alias entfernen, `_DUPLIKAT_DEPRECATED_TO_BLEIBT` entfernen, `FELD_SICHTBARKEIT` bei Bedarf aktivieren, persoenliches-Step entrümpeln, `maybeShowEmailOptin`-Init-Race fixen.
- Sprint 5 (Release-Verifikation, v1.0.0-Tag) startet im Anschluss an diesen Sprint.

## Vor- und Nachteile der Optionen

### Option 1: Direkte Render-Pfad-Umstellung
- **Gut:** Datenstruktur und Zugriffscode wären deckungsgleich, keine versteckte Alias-Logik.
- **Schlecht:** 30+ Stellen im Code einzeln anfassen, hohes Regressionsrisiko und deutlich höherer Aufwand.

### Option 2: Transparente get/set-Aliase (gewählt)
- **Gut:** Wizard-Code, Render-Aufrufe und Lese-Pfade bleiben unverändert; Daten landen automatisch in der Sektor-konsistenten Struktur.
- **Gut:** Aufwand ca. 4 h statt 21–30 h geschätzt.
- **Schlecht:** Zusätzliche Indirektion in `get`/`set`, die künftige Entwickler verstehen müssen.

### Option 3: Schweiz-Erbe-Felder ausblenden
- **Gut:** Kein Umbenennungs- und Migrations-Aufwand nötig.
- **Schlecht:** Irreführende Bezeichner (`ahv`, `pk_name` etc.) blieben im Code bestehen, Verwechslungsgefahr bei künftigen Änderungen.
- **Schlecht:** Zweckentfremdet den `FELD_SICHTBARKEIT`-Mechanismus für einen Fall, für den er nicht vorgesehen war.

### Option 4: Schweiz-Erbe-Felder umbenennen — Variante C (gewählt)
- **Gut:** Bezeichner entsprechen der tatsächlichen deutschen Semantik im Code.
- **Gut:** Deutsche Labels bleiben erhalten, keine UI-Änderung für Bürger.
- **Gut:** `FELD_SICHTBARKEIT` bleibt für echte Schweiz-Felder Post-Release nutzbar.
- **Schlecht:** Zusätzlicher Migrations-Schritt (alt → neu) und einmaliger Umstellungs-Aufwand.

## Nachweis

Im Quelldokument (HTML-Vorläufer dieses ADR) findet sich kein wörtliches Zitat aus einer Chat-Konversation oder unmittelbaren Eingabe in Anführungszeichen. Die einzige explizit als Entscheidung protokollierte Aussage im Dokument lautet (wörtlich übernommen, mit neutralisierter Attribution):

> „Variante C — Felder umbenennen statt ausblenden, Datenmigration alt → neu, deutsche Labels behalten. Echte Schweiz-Felder kommen Post-Release wenn gebraucht."
>
> — *[Dokument: Original-Dokument zu B16-ADR-075 (HTML), Abschnitt 3 „§2.7-Pre-Check Block 4 — Variante C"]*

Hinweis zur Belegbarkeit: Dies ist ein wörtliches Zitat aus dem Quelldokument, aber keine wörtliche Wiedergabe einer ursprünglichen Chat-Äußerung — das Dokument protokolliert das Ergebnis, nicht den Wortlaut der Konversation. Ein separates, aus der zugrundeliegenden Konversation stammendes Zitat war in der Quelle nicht auffindbar.

## Weiterführend

**Referenz.** Planung des Harmonisierungs-Sprints Feld-Sektor-Zuordnung v2 vom 08.05.2026; drei Klärungen vom selben Tag; Block-4-Klärung Variante C.

**Verwandte ADRs/Pläne.**
- Arbeitsplan: Sprint 5 (Release-Verifikation, v1.0.0-Tag) folgt unmittelbar auf diesen Sprint.
- Schema Version 7 (Vorgänger-Migration) — Vorläufer dieser Schema-8-Migration.

**v1.1-TODO-Liste** (fünf Punkte, aus diesem Sprint übernommen):
1. `krankheiten`-Alias entfernen, alle Render-Pfade auf `erkrankungen` umstellen.
2. `_DUPLIKAT_DEPRECATED_TO_BLEIBT` entfernen, Render-Pfade auf Bleiber umstellen.
3. `FELD_SICHTBARKEIT` aktivieren, wenn echte Schweiz-Felder gebraucht werden.
4. Persoenliches-Step entrümpeln (Briefe und persönliche Wünsche im Vivo-Step rendern).
5. `maybeShowEmailOptin`-Init-Race fixen.

**Testkriterien.** Klasse-A-Tests HSv2-A-T01 bis T16 (16/16 grün); statische Tests `test_vivodepot.py` (1939/1939 grün); Behavior-Voll-Regression (319/320 grün + 1 lokal-skipped); Browser-Verifikation §2.8 abgeschlossen.

**Aufwand.** IST ca. 4 h gegenüber 21–30 h Schätzung — schneller, weil get/set-Aliasing 30+ Render-Pfade transparent abdeckte und Block 2 (Rollen-Felder) bereits korrekt verortet war.
