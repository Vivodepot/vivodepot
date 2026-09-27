'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A320 / N1 — die Gültigkeits-Eingabe steht nur, wo sie schreibt (echter DOM)
   ────────────────────────────────────────────────────────────────────────────
   WARUM E2E: die Aussage ist eine über die VERDRAHTUNG, und im node-Stub liefert
   `querySelectorAll` unbedingt `[]` — `verdrahteSektorEingaben` verdrahtet dort
   nichts, und jede Aussage darüber wäre ein Phantom. Die Quelltext-Seite der
   Regel (die Behauptung am Aufruf) prüft
   `tests/m1-gueltigkeit-schreibweg-angabe.test.js`; hier wird gemessen, ob die
   Behauptung im Browser stimmt.

   Der Fehler, aus dem die Regel kommt (A317, N1): am Situationsblatt stand eine
   Eingabe, die nichts speicherte — gerendert, aber nie verdrahtet.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers.js');

test('[A320] im Bereich steht die Eingabe UND sie schreibt', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'mobility');

  /* M1 Zug 5/Zug 1 (18.08.2026) — DER UMZUG, und damit ändert sich, WELCHE Eingabe hier
     steht. Am markierten Feld gibt es kein zweites `bis` mehr: das Feld selbst ist sein
     Träger. Die `von`-Eingabe bleibt und ist weiterhin die Aussage dieser Probe — „sie steht
     nur, wo sie schreibt". Der Weg des `bis` wird darunter gemessen, am echten Feld.
     Schnitt Glied 3 (22.08.2026, U2-ADR-161): der bisherige Beleg-Feld `identitaet.
     ausweis_gueltig` ist ins Listen-Unterfeld `ausweis/gueltig` gewandert und trägt darum keine
     `feldGueltigkeit`-Verdrahtung mehr — derselbe Mechanismus steht weiterhin unverändert am
     Zwilling `mobility.passportValidUntil`. */
  const selVon = '[data-gueltig-von="mobility.passportValidUntil"]';
  await expect(page.locator(selVon), 'am markierten Feld steht die Eingabe offen').toHaveCount(1);
  await expect(page.locator('[data-gueltig-bis="mobility.passportValidUntil"]'),
    'und KEIN zweites bis-Feld daneben — sonst stünde derselbe Wert zweimal').toHaveCount(0);
  expect(await page.evaluate((s) => !!document.querySelector(s).onchange, selVon),
    'sie ist verdrahtet').toBe(true);

  await page.locator(selVon).fill('2021-05-04');
  await page.locator(selVon).dispatchEvent('change');
  const nachVon = await page.evaluate(() => JSON.parse(JSON.stringify(window.__vdOeffentlich.ankerDaten().feldGueltigkeit || {})));
  expect(nachVon.mobility && nachVon.mobility.passportValidUntil, 'der Wert ist angekommen')
    .toEqual({ von: '2021-05-04' });
});

test('[M1·Zug5·Rot] das Feld selbst schreibt sein „gültig bis" an den ZIELORT — im echten Browser', async ({ page }) => {
  /* Die Aussage ist eine über die VERDRAHTUNG des Fold-Wegs (`_faltContainer` über den
     blur/change-Autosave-Listener). Im node-Stub liefert `querySelectorAll` unbedingt `[]`;
     eine Aussage darüber wäre dort ein Phantom — darum hier.
     Schnitt Glied 3: `identitaet.ausweis_gueltig` s. Kommentar oben — Zwilling `reisepass_gueltig`
     verwendet. */
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'mobility');

  const feld = '[data-edit="passportValidUntil"]';
  await expect(page.locator(feld), 'das Feld steht unverändert an seiner Stelle').toHaveCount(1);
  await page.locator(feld).fill('2031-05-04');
  await page.locator(feld).dispatchEvent('change');
  await page.waitForTimeout(120);

  const stand = await page.evaluate(() => ({
    ziel: JSON.parse(JSON.stringify(window.__vdOeffentlich.ankerDaten().feldGueltigkeit || {})),
    bereich: JSON.parse(JSON.stringify(window.__vdOeffentlich.ankerDaten().sektoren.mobility || {})),
  }));
  expect(stand.ziel.mobility && stand.ziel.mobility.passportValidUntil, 'der Wert liegt am Zielort')
    .toEqual({ bis: '2031-05-04' });
  expect('passportValidUntil' in stand.bereich, 'und NICHT zusätzlich im Bereich').toBe(false);

  // Und er steht nach dem Neu-Zeichnen wieder im Feld — sonst sähe die Bürgerin ein leeres Feld.
  await oeffneSektor(page, 'mobility');
  expect(await page.locator(feld).inputValue(), 'die Auflösung findet ihn beim Rendern wieder')
    .toBe('2031-05-04');
});

test('[Schnitt Glied1·Rot] ein giltAb-Feld schreibt seinen Wert ebenfalls an den Zielort — im echten Browser', async ({ page }) => {
  /* Derselbe Fund wie beim `laeuftAb`-Test oben, am Zwilling: der Fold-Weg (`_faltContainer`/
     `_umzieht`) prüfte bisher nur `laeuftAb`, nie `giltAb` — ein `giltAb`-Feld schrieb also
     weiter in den Bereich statt nach `feldGueltigkeit[…].von`. Fix am 22.08.2026 (Schnitt
     Glied 1). Node-Stub kann das nicht prüfen (s. Dateikopf), darum hier.
     Schnitt Glied 3: `identitaet.ausweis_ausgestellt` s. Kommentar oben — Zwilling
     `reisepass_ausgestellt` verwendet. */
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'mobility');

  const feld = '[data-edit="passportIssuedOn"]';
  await expect(page.locator(feld), 'das Feld steht an seiner Stelle').toHaveCount(1);
  await page.locator(feld).fill('2020-03-15');
  await page.locator(feld).dispatchEvent('change');
  await page.waitForTimeout(120);

  const stand = await page.evaluate(() => ({
    ziel: JSON.parse(JSON.stringify(window.__vdOeffentlich.ankerDaten().feldGueltigkeit || {})),
    bereich: JSON.parse(JSON.stringify(window.__vdOeffentlich.ankerDaten().sektoren.mobility || {})),
  }));
  expect(stand.ziel.mobility && stand.ziel.mobility.passportIssuedOn, 'der Wert liegt am Zielort — als VON, nicht BIS')
    .toEqual({ von: '2020-03-15' });
  expect('passportIssuedOn' in stand.bereich, 'und NICHT zusätzlich im Bereich').toBe(false);

  await oeffneSektor(page, 'mobility');
  expect(await page.locator(feld).inputValue(), 'die Auflösung findet ihn beim Rendern wieder')
    .toBe('2020-03-15');
});

test('[A320·Rot] am Situationsblatt steht KEINE Eingabe mehr — der Fehler aus N1', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => window.__vdOeffentlich.oeffneSituation('geburt'));
  await page.waitForTimeout(200);

  // Vorbedingung: die Situation trägt überhaupt ein Datumsfeld — sonst prüft die Probe nichts.
  const hatDatum = await page.evaluate(() => {
    const si = window.__vdOeffentlich.SITUATION_BY_ID['geburt'];
    return (si.bloecke || []).some(b => (b.eintraege || [])
      .some(e => e && e.feld && !e.quelle && e.feld.typ === 'datum'));
  });
  expect(hatDatum, 'Vorbedingung: geburt trägt ein eigenes Datumsfeld').toBe(true);

  const bezuege = await page.evaluate(() => Array.from(document.querySelectorAll('[data-gueltig-bis]'))
    .map(e => e.getAttribute('data-gueltig-bis')));
  expect(bezuege, 'kein Bedienelement, das nichts speichert').toEqual([]);
});

test('[A320] im Lage-Blatt steht sie und schreibt — die Lage verdrahtet ihre Heimat-Blöcke', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  // CW-8 (24.08.2026): pflegegrad_befristet_bis ist jetzt an gesetzten Pflegegrad
  // gebunden (sichtbarWenn) — ohne ihn wäre das Feld unsichtbar, auch in dieser Lage. Ein
  // gesetzter Pflegegrad ist ohnehin die realistische Voraussetzung für „Pflegebedürftigkeit".
  await page.evaluate(() => { window.__vdOeffentlich.ankerDaten().sektoren.socialInsurance = { careLevel: '2' }; });
  await page.evaluate(() => window.__vdOeffentlich.oeffneLebenslage('pflegebeduerftigkeit'));
  await page.waitForTimeout(200);

  // Neugestaltung 24.08.2026 (Entscheidung „Gültigkeit hinterlegen"): `pflegegrad_bescheid_vom`
  // in dieser Lage trägt `frist`, nicht `laeuftAb`/`giltAb` — Fall 3 zeigt dort seit der
  // Neugestaltung ABSICHTLICH keine Gültigkeits-Eingabe mehr (frist ist keine Gültigkeit).
  // `pflegegrad_befristet_bis` (`laeuftAb`) bleibt der tragende Fall dieser Probe — er zeigt
  // nur noch `data-gueltig-von` (nurVon, das Feld selbst trägt das `bis`), darum beide
  // Attribute zusammen abfragen statt nur `data-gueltig-bis`.
  const stand = await page.evaluate(() => Array.from(document.querySelectorAll('[data-gueltig-von],[data-gueltig-bis]'))
    .map(e => ({ bezug: e.getAttribute('data-gueltig-von') || e.getAttribute('data-gueltig-bis'), verdrahtet: !!e.onchange })));
  expect(stand.length, 'die Lage zeigt Gültigkeits-Eingaben ihrer Heimat-Bereiche').toBeGreaterThan(0);
  expect(stand.every(s => s.verdrahtet), 'und jede einzelne ist verdrahtet').toBe(true);
});
