# U2-ADR-074 — Phase 5: Konten-Liste + Bankvollmacht-Verweis (Record-id) + Import-Umschrift

**Datum:** 11.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut + in der laufenden Shell end-to-end verifiziert. Suite **1298/0**, PV byte-identisch (Golden), Block-Pins `8d31c678…`/`d0541ea7…` byte-identisch. **Kein Push.**
**Nummer:** U2-ADR-074 (höchste belegte war U2-ADR-073).
**Typ:** Anwendung des `liste`-Musters (Skalar→Liste) + EINE neue `ref`-Entität (`bankvollmacht`) nach dem `mappe`-Muster. Schema-Bump **36→37**, verlustfreie Migration.
**Bezug:** Konten-Spec Phase 5 + interner Auftrag Phase 5 Bau (nicht Teil dieses Repos) · Ist-Bild Konten (read-only) · PRINCIPLES (single source of truth) · U2-ADR-064/071 (vollmachten-Liste + stabile Record-id) · U2-ADR-013 (`mappe`-ref-Muster).
**Status heute:** gilt — die Konten-Liste (`konten`) und der Bankvollmacht-Verweis (`bankvollmacht`, `typ:'refMehrfach'`)
sind im heutigen Kern nachweisbar (`vivodepot.html`), Beleg `tests/konten-liste.test.js`.

---

## Kontext

„Konten" waren zwei Skalarfelder (`konto_haupt_bank` + `konto_haupt_iban`) — genau EIN Konto. Zweck von
Vivodepot ist ein **Verzeichnis** der Konten (welche Konten existieren, für Erbfall + Übersicht) — **kein**
Bankzugang, **kein** Saldo, **keine** Auszüge. Diese Zweck-Grenze macht die im Ist-Bild gefundene
SD-JWT-VC-1:1-Kopplung (ein Credential = eine IBAN) **gegenstandslos**: die Liste wird ohne VC gebaut.

**Prüfpunkte vorab (read-only):** V1 — der rückwärts-Verweis Konto → einzelne `art:'bank'`-Vollmacht trägt
**über die stabile Record-id** (`mappe`-Entität als Präzedenz: ein `ref`, der eine id gegen eine Sammlung
auflöst). V2 — **gegenstandslos**: der Finanz-„VC" ist heute unsigniertes Klartext-JSON (kein `~`-Format, kein
`typ`-Header, kein Disclosure) — ein **Aspirations-Name**, kein echtes SD-JWT-VC; es gibt keinen Media-Type
(`dc+sd-jwt`) nachzuziehen.

---

## Entscheidung

### Teil 1 — Konten-Liste (Schema 36→37)
`finanzen/konto_haupt_bank` + `konto_haupt_iban` → `liste` `konten`, je Konto ein Eintrag mit **{bank · art ·
iban · bankvollmacht · notiz}**:
- **Art** = Text mit **Vorschlagsliste + frei** (neuer generischer `vorschlaege`-Support: native `<datalist>`,
  `data-edit`/`data-typ="text"` unverändert → Speicherpfad greift). Startvorschläge Giro/Spar/Tagesgeld/
  Festgeld/Depot/Darlehen/Treuhand/Bauspar — **offen**, keine feste Auswahl.
- **Kein Ort-Feld pro Konto** (Ablageort lebt in `dokumente[]`); Sonderfälle fängt die Notiz.
- **Migration** verlustfrei: die zwei Skalarwerte → EIN Eintrag {bank, iban} mit stabiler id; leer → keine
  Liste; Slots entfernt; idempotent.
- **B16-Nachzug:** `konto_bank`/`konto_iban`-Aliase raus, in `_b16Felder` zu einem `konten`-Eintrag aggregiert.

### Teil 2 — Bankvollmacht-Verweis über Record-id (neue `ref`-Entität `bankvollmacht`)
Beim Konto verweist der Bürger auf eine bestehende **art:'bank'**-Vollmacht in Vorsorge — **pro Konto**
(Bankvollmacht gilt nur für bestimmte Konten). Umsetzung nach dem `mappe`-Muster (drei Verdrahtungspunkte):
`entitaetAnzeige`-Zweig + `bankvollmachtAnzeige`/`bankvollmachtVorschlag`-Helfer + Select-only-Picker im
`case 'ref'` (Kandidaten per Record-id, **kein** Freitext-Override, **keine** Neu-Anlage). Die bevollmächtigte
Person ist **single source of truth** aus dem Vorsorge-Record (kein Doppel). Dangling-tolerant (liefert '').
**Befund/Abweichung:** der Vollmacht-Record trägt **kein Bank-Feld** — das Label unterscheidet daher über
**Person(en) · Ablageort** (nicht „Bank + Person" wie die Spec vorschlug; ein Bank-Feld an der Vollmacht wäre
eine separate Vorsorge-Änderung). Vorsorgevollmacht wird **nicht** pro Konto verknüpft (globaler Verweis, Bild C).

### Teil 3 — Import auf Liste + VC-Bereinigung
- **CAMT.053** (`_camt053Listen`): bank/iban → EIN `konten`-Eintrag; Währung/Saldo/Buchungen werden weiter
  geparst, aber **verworfen** (kein Journal — bewusst, ruht). Import ADDIERT einen Eintrag (kein Skalar-Konflikt mehr).
- **3 Situationsblätter** (`notar`/`pflegeheim`/`erbfall`) zogen `konto_haupt_bank`; auf `konten` umgebogen —
  rendert typ-generisch (wie die vollmachten-Liste im selben Blatt).
- **VC-Bereinigung:** `konto_haupt_bank`/-iban entfielen aus `VC_FINANZEN_MAPPING` (sie zeigten sonst auf tote
  Felder). bank_name/iban werden **bewusst nicht mehr gemappt**, bis die VC-Schicht für die Liste neu entworfen
  wird — **kein stiller Verzicht**, hier datiert vermerkt. Die übrigen Skalar-Claims (tax_id, pension_provider …)
  bleiben.

---

## Was ruht (Platz, nicht jetzt)
- **VC-Export/-Import eines Kontos (EUDIW):** ruht. SD-JWT-VC erst ~Dez 2026 final (RFC Q4 2026); für den
  Verzeichnis-Zweck nicht nötig. Reaktivierungs-Trigger: RFC / EU-v1.0.
- **CAMT.053-Buchungs-Import:** nicht ausbauen (kein Journal).
- **`SD_JWT_VC`-Aspirations-Name** (V2): das Artefakt ist ES256-signiertes bzw. unsigniertes JSON, **kein**
  standardkonformes SD-JWT-VC — Kosmetik an ruhender Schicht, **nicht** jetzt umbenennen.

---

## Konsequenzen
- **Kein Notfall-/QR-Pfad berührt** (Konten stehen nicht im Notfall-Kern) → kein Gerät-QR-Zwang.
- **Tests:** `tests/konten-liste.test.js` (Feld-Def + Art-datalist, Migration, B16/CAMT-Import, Bankvollmacht-
  Vorschlag/Resolver/Dangling/Picker/Speicher-Logik, Situations-Repoint, VC-Bereinigung) + zehn Alt-Test-Dateien
  nachgezogen (VC-Claims auf tax_id/pension_provider, CAMT/B16 auf die Liste, Situations-Pull auf konten). Schema-Pins 36→37.
- **In der laufenden Shell end-to-end verifiziert:** Konten-Liste rendert, Art-Vorschläge + freie Eingabe, der
  Bankvollmacht-Picker listet die art:'bank'-Vollmachten (Person·Ort), `liesEintragAusDOM` speichert die
  Auswahl als `{ref}`, die Zusammenfassung löst sie auf. SW-Cache **v44→v45**.

---

## Nachtrag 1 (11.07.) — Kardinalität: Bankvollmacht = refMehrfach (n:m)

**Entscheidung:** Option B — jedes Konto trägt **mehrere** Bankvollmacht-Verweise (`refMehrfach`).
Grund: „ein Konto, mehrere Bevollmächtigte" (Geschwister mit Vollmacht fürs Elternkonto) ist der **Regelfall**,
nicht der Randfall. Die Gegenrichtung „eine Vollmacht, mehrere Konten" fällt **gratis** ab (mehrere Konten
zeigen auf dieselbe Record-id) → volles **n:m** über die bestehende `refMehrfach`-Speicherform (Array `{ref}`),
**keine Zwischentabelle**.

**Umsetzung:** das Konto-Unterfeld `bankvollmacht` wird `typ:'ref'` → `typ:'refMehrfach'`, `entitaet:'bankvollmacht'`.
Da `refMehrfach` sonst das Personen-Combobox rendert, ein `entitaet`-Zweig: `_refmBankvollmachtHTML` rendert eine
**Ankreuz-Liste** (eine Checkbox je art:'bank'-Vollmacht, Label Person·Ort; angehakt = id ∈ Array). Kein Freitext,
keine Neu-Anlage; Leer-Zustand-Hinweis, wenn keine Bankvollmacht in Vorsorge existiert. Save: `liesEintragAusDOM`
verzweigt bei `entitaet==='bankvollmacht'` auf `_refmCheckSammeln` (angehakte → `[{ref}]`). Anzeige unverändert
generisch (`entitaetAnzeige` je Element, mit `, ` gefügt). Speicherform tolerant (Einzel-`{ref}` → `[{ref}]`).
Keine Migration nötig (bankvollmacht ist neu in Phase 5, ungepusht — kein Skalar-Bestand).

**In der laufenden Shell end-to-end verifiziert:** zwei Bankvollmachten angekreuzt → `liesEintragAusDOM` liefert
`[{ref:'vb1'},{ref:'vb2'}]`, Zusammenfassung „… · Anna Beispiel · Sparkasse, Bea Muster · DKB". Suite **1299/0**,
Gates grün. SW-Cache **v45→v46**.

---

## Nachtrag 2 (11.07., Phase 6 Kosmetik / K2) — Vorsorgevollmacht-Hinweis am leeren/ungewählten Picker

Teil 2 hielt fest: „**Vorsorgevollmacht wird nicht pro Konto verknüpft** (globaler Verweis, Bild C)." Folge: wer
sich auf eine **Vorsorgevollmacht** verlässt, aber keine eigene **Bankvollmacht** hat, sieht am Konto einen
**leeren** Bankvollmacht-Picker — und der Leer-Hinweis („legen Sie sie dort an") legt fälschlich nahe, eine
Bankvollmacht sei zwingend. **K2: bedingter Bürger-Hinweis.** Wenn eine Vorsorgevollmacht existiert
(Gate `vollmacht_vorhanden==='ja'` **oder** ein `vollmachten`-Record `art:'vorsorge'`) **und** für dieses Konto
keine Bankvollmacht gewählt ist (`refMehrfach`-Array leer), blendet `_refmBankvollmachtHTML` den finalen Text
ein: **„Manche Banken verlangen zusätzlich zu Ihrer Vorsorgevollmacht eine eigene Bankvollmacht für den
Kontozugriff. Fragen Sie bei Ihrer Bank nach."**

- Helfer `_vorsorgevollmachtVorhanden()` (liest `data.sektoren.vorsorge`); der Hinweis (`.feld-hint`) steht
  **außerhalb** des `.feld-refm-check`-Containers → `_refmCheckSammeln` unberührt. **Reine Anzeige**, kein
  Schema-/Notfall-/Speicher-Pfad, keine Migration.
- **Tests:** fünf Fälle in `tests/konten-liste.test.js` (Vorsorgevollmacht + leer → Hinweis; Gate `ja` → Hinweis;
  Bankvollmacht gewählt → kein Hinweis; keine Vorsorgevollmacht → kein Hinweis).
- **In der laufenden Shell verifiziert** (Browser-JS + Screenshot): Hinweis erscheint genau in der Ziel-Konstellation.
  Suite **1304/0** (+5), PV byte-identisch, Block-Pins byte-identisch. SW-Cache **v46→v47**. **Kein Push.**
- **Beobachtung (offen für Feinschliff):** im „keine `art:'bank'` vorhanden"-Fall stehen Leer-Hinweis **und**
  Vorsorge-Hinweis untereinander (Mechanik-Text + Bank-Rat) — bewusst beide, deiner Vorgabe „plus der Text"
  folgend; Unterdrücken des Leer-Hinweises in diesem Fall wäre ein Einzeiler, falls gewünscht.

---
*Vivodepot · Vivodepot GmbH · Berlin · U2-ADR-074 · 11.07.2026 · Code ungepusht.*
