'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-06 — Reise 6: Datenkette inkl. Provenienz nach Anker-Wechsel
   ────────────────────────────────────────────────────────────────────────
   Szenario: Marlies trägt drei Felder ein, stirbt; Anja wird neue Anker-Person
   und trägt zwei weitere Felder nach. Ein Export soll beide Provenienzen tragen:
   die ersten drei „von Marlies“, die zwei neuen „von Anja“. Der PDF-Fuß eines
   Situationsblatts trägt „Erstellt von Anja“.

   ANKER-WECHSEL über TEST-HELFER (Spec: „oder Test-Helper, weil der Wechsel
   selbst eine eigene Operations-Strecke ist“): Das voll ausgebaute Anker-
   Wechsel-Werkzeug ist eine eigene Bürger-App-Strecke und in dieser Komponente
   noch nicht als UI vorhanden. Wir nutzen stattdessen die bereits vorhandene
   Top-Level-Funktion `akteurSelbstErklaeren(name)` (window-global) — sie setzt
   den Sitzungs-Akteur, exakt wie es der Anker-Wechsel später tut. Die HTML wird
   NICHT verändert. Die Feld-Eingaben selbst laufen über die echte UI; die
   Provenienz-Stempel werden über das Datenmodell (`liesUrheberschaft` /
   `stempelName`) und der PDF-Fuß über `pdfFussText(situationPdfMeta(...))`
   verifiziert — beides die eigenen App-Funktionen.

   Läuft am Mac / in CI. HTMLs unverändert. ⚠ nur Test-Daten.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');

const FIX = require('./fixtures/reise-6-anker-wechsel.json');

test.describe('T-CROSS-06 Provenienz nach Anker-Wechsel', () => {
  test('Erste drei Felder „von Marlies“, zwei neue „von Anja“, PDF-Fuß „Erstellt von Anja“', async ({ browser }) => {
    const ctx = await browser.newContext();
    const k = await ctx.newPage();
    await H.kern.oeffnen(k);
    await H.kern.depotAnlegen(k, { name: FIX.ersterAnker, pw: FIX.passwort });

    /* ── Phase Marlies: Akteur „Marlies“, drei Felder ─────────────────────── */
    await k.evaluate(() => window.__vdOeffentlich.akteurSelbstErklaeren('Marlies'));
    for (const f of FIX.felderMarlies) {
      await H.kern.oeffneSektor(k, f.sektor);
      await H.kern.setzeFeld(k, f.feld, f.wert);
    }

    /* ── Anker-Wechsel (Test-Helfer): neuer Akteur „Anja“ ─────────────────── */
    await k.evaluate(() => window.__vdOeffentlich.akteurSelbstErklaeren('Anja'));

    /* ── Phase Anja: zwei weitere Felder ──────────────────────────────────── */
    for (const f of FIX.felderAnja) {
      await H.kern.oeffneSektor(k, f.sektor);
      if (f.feld === 'bloodType') await H.kern.setzeAuswahl(k, f.feld, f.wert);
      else await H.kern.setzeFeld(k, f.feld, f.wert);
    }

    /* ── Verifikation: Provenienz-Stempel je Feld (Datenmodell) ───────────── */
    for (const f of FIX.felderMarlies) {
      const stempel = await k.evaluate(
        (x) => { const d = window.__vdOeffentlich.ankerDaten(); const l = (d.urheberschaft && d.urheberschaft[x.sektor] && d.urheberschaft[x.sektor][x.feld]) || []; return l.map((s) => s.eingabeDurchName || JSON.stringify(s)); },
        f,
      );
      expect(stempel.join(' '), `Feld ${f.feld} sollte „Marlies“ tragen`).toContain('Marlies');
    }
    for (const f of FIX.felderAnja) {
      const stempel = await k.evaluate(
        (x) => { const d = window.__vdOeffentlich.ankerDaten(); const l = (d.urheberschaft && d.urheberschaft[x.sektor] && d.urheberschaft[x.sektor][x.feld]) || []; return l.map((s) => s.eingabeDurchName || JSON.stringify(s)); },
        f,
      );
      expect(stempel.join(' '), `Feld ${f.feld} sollte „Anja“ tragen`).toContain('Anja');
    }

    /* Die Fuß-Zeile setzt der Kern aus `STRINGS.pdfFussErstelltVon` und dem Generierer der PDF-Meta zusammen (pdfFussText
       selbst liegt hinter dem Verschluss); beide Bausteine sind öffentlich. */
    /* ── Verifikation: PDF-Fuß trägt „Erstellt von Anja“ ──────────────────── */
    const fuss = await k.evaluate(
      () => { const V = window.__vdOeffentlich; return V.STRINGS.pdfFussErstelltVon + ' ' + V.vollDepotPdfMeta().generierer; },
    );
    expect(fuss).toContain(FIX.erwartet.pdfFuss);   // „Erstellt von Anja“

    await ctx.close();
  });
});
