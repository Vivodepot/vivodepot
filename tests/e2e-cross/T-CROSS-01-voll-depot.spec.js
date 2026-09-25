'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-01 — Reise 1: Datenkette Bürger-App → Lese-App (Voll-Depot)
   ────────────────────────────────────────────────────────────────────────
   Szenario: Marlies legt ein Voll-Depot an (Identität, Gesundheit mit SNOMED-
   codierter Allergie, Vorsorge, Mappe), stempelt es mit Anker-Name „Marlies“,
   speichert es als .vivodepot-Datei und schickt es ihrer Tochter Anja, die es
   in der Lese-App öffnet. Verifikation: die nicht-sensiblen Werte erscheinen
   feldweise korrekt; die sensible SNOMED-codierte Allergie reist verschlüsselt
   mit, erscheint aber NICHT im Rendering (Befund 2, 12./13.08.2026 — vorher
   prüfte diese Stelle, dass der SNOMED-Anzeigename stimmt; das gilt jetzt für
   jedes codeListe-Feld nie mehr, weil jedes davon `sensibel: true` trägt).
   Eigen-Provenienz „von Marlies“ bleibt unterdrückt, Mappe da.

   CROSS-COMPONENT: zwei Browser-Kontexte (Bürger-App schreibt, Lese-App liest);
   Transfer über tmp-Verzeichnis. Beweist: Was Komponente 1 verschlüsselt schreibt,
   entschlüsselt und rendert Komponente 2 korrekt — derselbe VdCrypto-Block.

   Läuft am Mac / in CI (Browser-Binaries nötig). HTMLs unverändert.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const H = require('./support/helpers');

const FIX = require('./fixtures/reise-1-voll-depot.json');

test.describe('T-CROSS-01 Voll-Depot-Datenkette', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('r1'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('Bürger-App schreibt Voll-Depot, Lese-App liest es feldweise korrekt', async ({ browser }) => {
    /* ── Kontext A: Bürger-App schreibt + speichert ───────────────────────── */
    const ctxA = await browser.newContext({ acceptDownloads: true });
    const a = await ctxA.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: FIX.ankerName, pw: FIX.passwort });

    // Identität feldweise.
    await H.kern.oeffneSektor(a, 'identity');
    await H.kern.setzeFeld(a, 'givenName', FIX.identity.givenName);
    await H.kern.setzeFeld(a, 'familyName', FIX.identity.familyName);
    // Always-inline-UI: der Wert steht im [data-edit]-Input (das [data-feld] ist nur der Wrapper).
    // Der eigentliche Cross-Beweis bleibt die Lese-App-Prüfung unten (Z. 63/64).
    await expect(a.locator('[data-edit="givenName"]')).toHaveValue(FIX.identity.givenName);

    // Gesundheit: SNOMED-codierte Allergie (Code-Listen-Andock). Der eingetragene
    // Code trägt im Render seinen Anzeigenamen — genau das prüft die Lese-App später.
    await H.kern.oeffneSektor(a, 'health');
    await H.kern.setzeFeld(a, FIX.gesundheitAllergie.feld, FIX.gesundheitAllergie.anzeige);

    // Vorsorge-Eintrag.
    await H.kern.oeffneSektor(a, 'advanceCare');
    await H.kern.setzeFeld(a, FIX.advanceCare.feld, FIX.advanceCare.wert);

    // Speichern → tmp (verschlüsselter .vivodepot-Umschlag).
    const dateiPfad = await H.kern.speichernNachTmp(a, tmp);
    expect(dateiPfad.endsWith('.vivodepot')).toBeTruthy();
    await ctxA.close();

    /* ── Kontext B: Lese-App liest ────────────────────────────────────────── */
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await H.lesen.oeffnen(b);
    await H.lesen.dateiOeffnen(b, dateiPfad, FIX.passwort);

    // Feldweise-Verifikation in der Lese-Sicht.
    await b.click('[data-sektor="identity"]');
    await expect(b.locator('#content')).toContainText(FIX.identity.givenName);
    await expect(b.locator('#content')).toContainText(FIX.identity.familyName);

    await b.click('[data-sektor="health"]');
    // Befund 2 („Die Lese-App wird nirgends mitgemessen", 12./13.08.2026): `allergien`
    // trägt `sensibel: true` — jedes codeListe-Feld im Schema tut das (Gesundheitsdaten). Vor
    // Befund 2 prüfte diese Zeile die SNOMED-Anzeigenamen-Auflösung (Code-Listen-Andock) am
    // Cross-Component-Pfad; jetzt hält die Lese-App das Feld zurecht zurück — der Wert reiste zwar
    // verschlüsselt mit (Kontext A schrieb ihn, s. o.), erscheint aber nicht mehr im Rendering. Die
    // Auflösung selbst bleibt unit-getestet (tests/chip-mechanik.test.js, tests/import-formate.test.js).
    await expect(b.locator('#content')).not.toContainText(FIX.gesundheitAllergie.anzeige);

    await b.click('[data-sektor="advanceCare"]');
    // Befund 2, wie oben: `pflegewuensche_koerper` traegt `sensibel: true` — tatsaechlich ist im
    // ganzen vorsorge-Sektor kein einziges text/textarea-Feld UNsensibel (gemessen, nicht
    // angenommen). Auch hier: reist verschluesselt mit, erscheint aber zurecht nicht im Rendering.
    await expect(b.locator('#content')).not.toContainText(FIX.advanceCare.wert);

    // U2-ADR-017 — WÄCHTER: Eigen-Provenienz wird in der Lese-App bewusst NICHT angezeigt.
    // Marlies ist die Eigentümerin (Anker); ihre eigenen Einträge tragen KEIN „von Marlies" und
    // keine `.feld-urheber`-Zeile (urheberschaftZeileHTML unterdrückt Selbst-Stempel, deren Name
    // == aktuellerAnkerName()). Fremd-/Vollmacht-Provenienz „von …" prüft T-CROSS-06. Wird die
    // Eigen-Unterdrückung später versehentlich ausgebaut, schlägt dieser Test fehl.
    await expect(b.locator('#content')).not.toContainText(FIX.erwartet.provenienz);
    await expect(b.locator('#content .feld-urheber')).toHaveCount(0);

    await ctxB.close();
  });
});
