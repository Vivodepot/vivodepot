# U2-ADR-072 — Phase 3: Personen-Cluster (skalare Kontakt-Felder → Personen-Liste) + Notfall-QR-Nachzug

**Datum:** 11.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · Phase 3 abgeschlossen (11.07.). Teil 1 (Notfallkontakte) gebaut + am Gerät verifiziert (Notfall-QR real zurück-gescannt), Teil 2 (Fachärzte) gebaut + Shell-verifiziert, Teil 3 (Passwort-Ort) **entschieden ohne Code-Änderung** (Produktentscheidung). Suite **1274/0**, PV byte-identisch, Block-Pins byte-identisch. **Kein Push.**
**Nummer:** U2-ADR-072 (höchste belegte in `docs/adr/` war U2-ADR-071).
**Typ:** Anwendung des bestehenden Personen-Widgets (refMehrfach / liste) auf skalare Kontakt-Felder — **kein neuer Mechanismus**. Schema-Bumps (32→33 Teil 1, 33→34 Teil 2), verlustfreie Migration. Teil 3 ist eine reine Entscheidung (kein Code).
**Bezug:** Auftrag „Phase 3 — Personen-Cluster" (11.07., interner Auftrag, nicht Teil dieses Repos) · Projektplan v1-Release Phase 3 · U2-ADR-065 (refMehrfach generisch, Vollmacht + erben) · U2-ADR-064 (`vollmachten` liste-Record) · U2-ADR-059 (Notfall-QR / `NOTFALL_KERN_FELDER`) · `PRINCIPLES.md` Wurzel 1 (single source of truth — Person einmal im Register, überall als Ref).
**Status heute:** gilt — Beleg `tests/u2-072-notfallkarte.test.js`.

---

## Kontext

Phase 3 stellt skalare Personen-/Kontakt-Felder auf das bestehende Personen-Widget um. Drei Posten:
Notfallkontakte, Fachärzte, Vertrauens-Passwort-Hinweis. Der Plan stuft Phase 3 als „risikofrei" ein —
das gilt **nicht ungeprüft** für die Notfallkontakte: die Überführung von `hauptpflegeperson` in eine
Personen-Liste berührt die **Notfall-QR-Auflösung** (dieselbe Kopplungsklasse wie `organspende` /
`NOTFALL_KERN_FELDER`). Darum ein read-only Teil-0-Check **vor** dem Bau.

### Teil-0-Befund (Notfall-QR-Kopplung)

- **0a — Speist `hauptpflegeperson` den QR?** Ja. `hauptpflegeperson` steht in `NOTFALL_KERN_FELDER`
  (`{sektor:'gesundheit', feld:'hauptpflegeperson'}`). `notfallKernModell()` liest `data.sektoren.gesundheit.hauptpflegeperson`
  und löst **typ-generisch** über `feldWertText(feld, roh)` auf.
- **0b — Bricht der Umstieg?** **Nein.** `feldWertText` behandelt `refMehrfach` bereits (Array `{ref,override}` →
  Namen, mit `, ` gefügt). Es gibt **keine** Werte-/Format-Differenz wie bei `organspende`
  (`zustimmung/ablehnung` vs. `ja/teil/nein`) — Notfallkontakte sind reine Namen. Der QR-Konsument braucht
  **keine** „erster Eintrag"-Sonderbehandlung; er löst die ganze Liste zu „Name1, Name2" auf.
- **0c — Weitere Konsumenten?** Drei, alle typ-generisch und damit tragend:
  Situationsblatt-Rollup (`{quelle:'gesundheit', feld:'hauptpflegeperson'}` → `feldWertText`),
  `crossSektorAnmelden`, sowie der **B16-Import-Alias** (`hauptpflegeperson` in `B16_FELD_MAPPING`).
  Nur der Import brauchte einen Nachzug: `_wertAusText` musste `refMehrfach` kennen (ein importierter
  Klartext-Name → EIN Listen-Eintrag `{override}` im Array), sonst landete ein importierter Name als
  Skalar-String im Array-Feld.

Fazit: der Umstieg trägt; einziger Nachzug = die eine `_wertAusText`-`refMehrfach`-Zeile. Kein QR-Bruch.

---

## Entscheidung

### Teil 1 — Notfallkontakte → Personen-Liste (refMehrfach)

1. **Feld.** `gesundheit/hauptpflegeperson`: `typ:'ref'` → `typ:'refMehrfach'`, Label „Notfallkontakte"
   (statt „Hauptpflegeperson"), `entitaet:'person'`. Mehrere Kontakte, umsortierbar — dasselbe Widget wie
   Vollmacht-Bevollmächtigte und erben.
2. **Migration 32→33** (Verwaisungs-Regel wie erben 30→31, verlustfrei):
   Einzel-Ref `{ref,override}` → `[{ref,override}]`; Alt-String (Klartext) → `[{ref:'', override:String}]`;
   leerer Einzelwert → Feld entfällt (kein Leer-Eintrag); bereits Array → unberührt (idempotent).
3. **Notfall-QR.** Unverändert — löst die Liste über `feldWertText` typ-generisch zu „Name1, Name2" auf.
   Kein Konsumenten-Umbau nötig (Teil-0-Befund).
4. **B16-Import-Nachzug.** `_wertAusText(feld, eingabe)`: neuer `refMehrfach`-Zweig
   `return [{ override: String(eingabe).trim() }]` — ein importierter Klartext-Name → EIN Listen-Eintrag
   (kein erfundenes `ref`, derselbe Override-Mechanismus wie beim `ref`-Feld). Realer Migrationspfad
   (nicht Backlog wie der hypothetische Vollmacht-Import-Fall), bestätigt.

**Gerät-Kontrollpunkt (der wichtigste Test dieses Blocks).** Ein echtes Depot mit **zwei** Notfallkontakten
(einer Register-Person, einer Freitext-Override) in der laufenden Shell aufgebaut, den realen Notfall-QR
gerendert und per `BarcodeDetector` **zurück-gescannt** (Pixel-Ebene). Dekodiert:
`… Notfallkontakte: Anna Schulz, Ben Klein` — beide Namen aufgelöst. Der physische Kamera-Scan am iPhone
bleibt der Geräte-Schritt; der scanbare QR ist erzeugt.

### Teil 2 — Fachärzte → Liste {Arzt, Fach}

1. **Feld.** Die drei Skalar-Slots `gesundheit/facharzt_1` (Kern), `facharzt_2`/`facharzt_3` (Modul) werden
   EINE `liste` `fachaerzte` (Kern) mit Einträgen `{arzt (ref:person, rolle facharzt) · fach (text, Fachgebiet)}`.
   Beliebig viele Fachärzt*innen, je mit Fach — Standard-Muster (Skalar→Liste), verwandt mit der Vollmacht-
   Liste; das `ref`-Unterfeld ist bewährt (auch `unterhalt` nutzt eins). `hausarzt` bleibt ein eigenes Feld.
2. **Migration 33→34** verlustfrei: jeder nicht-leere Slot → ein Eintrag `{id, arzt, fach:''}` mit stabiler id
   (wie vollmachten); leere Slots fallen weg; danach werden die drei Skalar-Felder entfernt; idempotent.
   Das Fachgebiet startet leer (die Alt-Slots trugen es nicht) — bewusst kein erfundener Wert.
3. **B16-Import-Nachzug.** Die drei `facharzt_*`-Skalar-Aliase sind aus `B16_FELD_MAPPING` entfernt; `_b16Felder`
   aggregiert die drei beta16-Slots zu EINER `fachaerzte`-Liste in Gesundheit (`{arzt:{override:Name}, fach:''}`),
   leere Slots übersprungen. Ohne diesen Nachzug importierte ein Name ins Leere (Feld existiert nicht mehr).
   Realer Migrationspfad (bestätigt).
4. **Keine Rollup-/Export-Konsumenten** von `facharzt_*` (im Gegensatz zu `hauptpflegeperson`) — die Umstellung
   berührt nur Feld-Def, Migration und Import. In der laufenden Shell verifiziert: die Liste rendert (Arzt- +
   Fach-Zeile im Eintrags-Modal), Zusammenfassung „Dr. Herz · Kardiologie", Wert-Anzeige ohne rohes Array.

### Teil 3 — Vertrauens-Passwort: Ort-Hinweis — Entscheidung ohne Code-Änderung

**Entscheidung:** Der Ort-Hinweis (`data.angehoerigen_passwort_ort`, ein Freitext wie „Versiegelter
Umschlag im Tresor" — **nie** das Passwort) kommt **NICHT** auf die gedruckte Notfallkarte. **Keine
Kartendruck-Zeile, kein Opt-in-Schalter, keine Änderung an der Notfallkarten-Struktur.** Er bleibt hinter dem
Passwort (Bildschirm/Einstellungen, **wie heute** — schon angezeigt in den Einstellungen, wenn eine
Vertrauensperson aktiv ist).

**Grund:** Die Notfallkarte ist bewusst die **passwortfreie offene Schicht** (nur die wenigen wesentlichen
Notfalldaten für die Sanitäter-Stufe; ihr QR-Hinweis verspricht ausdrücklich „keine sensiblen Details"). Der Ort
des Vertrauens-Passworts gehört **nicht** in diese offene Schicht — auf einer in der Brieftasche getragenen
Karte wäre er für jeden Finder sichtbar und würde das Sealed-Envelope-Schema schwächen. Er bleibt hinter dem
Depot-Passwort.

**Vorlauf:** An dieser echten Verzweigung wurde angehalten und die Datenschutz-Abwägung gemeldet (der einzige
Weg, der den Zweck „Angehöriger findet den Ort" erfüllt, wäre die gedruckte Karte — genau der mit der
Exposition; die Bildschirm-Sicht erreicht die Zielgruppe wegen Henne-Ei nicht). Entschieden wurde bewusst **gegen**
die Karten-Exposition. **Kein Code, kein Schema-Bump, kein Test** — reine Architektur-Entscheidung.

---

## Konsequenzen

- **Verlustfrei & typ-generisch.** Keine Sonder-Auflösung im QR; die Umstellung nutzt die schon vorhandene
  refMehrfach-Behandlung. Ein Datum (Person) bleibt einmal im Register (PRINCIPLES Wurzel 1).
- **Der Notfall-QR — eine der kritischsten Bürger-Funktionen — trägt** die Mehrfach-Kontakte, verifiziert
  auf Unit- **und** Pixel-Ebene.
- **Tests:** `tests/notfallkontakte-liste.test.js` (Teil 1: Feld-Def, Migration Einzel→Array / Alt-String / leer /
  idempotent, QR löst Liste auf inkl. Override, B16-Name→Array) + `tests/fachaerzte-liste.test.js` (Teil 2:
  Feld-Def, Migration drei Slots→Liste / leer / idempotent / Alt-String, B16-Aggregation, Anzeige sauber).
  Schema-Pins 32→33→34 nachgezogen.
- **Arbeitsregel angewandt:** der B16-Import-Alias wurde bei beiden Umbauten mitgezogen (Platz für spätere
  Phase-5-Import-Daten vorgesehen) — reale Migrationspfade bestehender Beta-Nutzer, kein Backlog.
- **Phase 3 abgeschlossen.** Teil 1 + Teil 2 gebaut & verifiziert, Teil 3 als Entscheidung dokumentiert (kein
  Code). Keine offenen Bau-Punkte in diesem ADR.

---
*Vivodepot · Vivodepot GmbH · Berlin · U2-ADR-072 · 11.07.2026 · Code ungepusht.*

## Konformität

```konformitaet
aussage:   Die Notfallkarte-Allowlist (NOTFALL_KERN_FELDER) trägt kein Passwort-/Passwort-Ort-Feld;
           die Karte zeigt keine Passwort-Ort-Zeile.
zustand:   prüfbar
pruefung:  tests/u2-072-notfallkarte.test.js#u2-072-notfallkarte-kein-passwort-ort
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (A2-als-Code), über `tests/bindung-pruefen.js` (U2-ADR-098 + Nachtrag).*
