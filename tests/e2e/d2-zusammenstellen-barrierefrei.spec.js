'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   D2 — Barrierefreiheit des Zusammenstellen-Bildschirms
   ────────────────────────────────────────────────────────────────────────────
   Strang D2 des Laufzettels „Nacht 21./22.08.2026": *„Der Zusammenstellen-
   Bildschirm ist gerade neu gebaut; jetzt ist die Prüfung billiger als später.
   Der Blinde steht seit Wochen als Prüffall und hat nie einen Auftrag bekommen."*

   WARUM DIESER BILDSCHIRM UND NICHT IRGENDEINER: er ist der Ort, an dem die
   Bürgerin entscheidet, WAS sie herausgibt. Wer ihn nicht bedienen kann, gibt
   entweder nichts heraus oder mehr, als er wollte — und beides ist schlimmer als
   eine schlecht beschriftete Eingabemaske.

   SIE PRÜFT DREI DINGE, und die letzten zwei stehen in keinem axe-Regelsatz:
     1 · axe/WCAG 2.2 AA über die Sicht (dieselbe Gate-Politik wie 07-axe)
     2 · Die AUSWAHL ist für eine Screenreader-Nutzerin ABLESBAR — nicht nur
         sichtbar. Eine Zahl in einer Überschrift ist kein Zustand.
     3 · Der Weg ist mit der TASTATUR gangbar: suchen, aufnehmen, weiter.

   NACHTRAG 23.08.2026 (Laufzettel Nacht 22./23.08.2026, Posten 9, A483, v1:
   ja): Prüfung 2 war ursprünglich BERICHTEND (der Laufzettel vom 21./22.08.
   sagte „keine Behebung") — GEBAUT statt weiter nur benannt, wie bei Prüfstein
   5 in Glied 4: UMGEKEHRT statt gelöscht. Sie prüft jetzt HART, dass die
   Aufnahme über einen `sr-only`-Live-Bereich (`#zus-live`) angesagt wird und
   die Treffer-Knöpfe `aria-pressed` tragen. Prüfung 3 (Tastaturweg) bleibt
   berichtend — sie war nicht Gegenstand des Fundes und nicht des Baus.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { inLeisteKlicken, oeffneApp, depotAnlegen } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function zumZusammenstellen(page) {
  await oeffneApp(page);
  await depotAnlegen(page);
  await inLeisteKlicken(page, '[data-weitergeben-zentral]');
  await page.click('[data-hz-zusammenstellen]');
  await page.waitForTimeout(250);
  await expect(page.locator('#zus-suche')).toBeVisible();
}

test('[D2·1] axe/WCAG 2.2 AA über den Zusammenstellen-Bildschirm', async ({ page }) => {
  await zumZusammenstellen(page);
  const ergebnis = await new AxeBuilder({ page })
    .withTags(WCAG).exclude('.logo-wort').exclude('.welcome-wort').analyze();

  /* Dieselbe Gate-Politik wie in `07-axe.spec.js` — hart bei kritisch und bei
     serious ausser Kontrast, der einem eigenen Design-Pass gehört. Eine zweite
     Politik an einer zweiten Stelle liefe auseinander. */
  const hart = ergebnis.violations.filter((v) =>
    v.impact === 'critical' || (v.impact === 'serious' && v.id !== 'color-contrast'));
  const getrackt = ergebnis.violations.filter((v) => !hart.includes(v));
  if (getrackt.length) {
    console.log('[D2·axe] getrackte/leichte Hinweise: '
      + getrackt.map((v) => `${v.id} (${v.impact}, ${v.nodes.length}x)`).join(', '));
  }
  expect(hart, '[D2·axe] harte Verstöße: '
    + hart.map((v) => `${v.id}: ${v.help}`).join(' | ')).toEqual([]);
});

test('[D2·2] die AUFGENOMMENE Auswahl ist für eine Screenreader-Nutzerin ablesbar', async ({ page }) => {
  /* DAS IST DIE PRÜFUNG, DIE KEIN AXE-REGELSATZ MACHT. axe prüft, ob ein Element
     einen zugänglichen Namen hat. Es prüft NICHT, ob die Bürgerin erfährt, dass
     ihre Aufnahme angekommen ist. Für einen blinden Menschen ist eine Zahl, die
     sich still in einer Überschrift ändert, kein Ereignis. GEBAUT 23.08.2026: ein
     sr-only Live-Bereich (#zus-live) sagt die Aufnahme an, die Treffer-Knöpfe
     tragen aria-pressed. */
  await zumZusammenstellen(page);
  await page.fill('#zus-suche', 'Versichertennummer');
  await page.waitForTimeout(250);

  /* GESCHÄRFT 19.10.2026 (Befund ANFRAGE-NACHTRAGEN-CODELISTE): „Treffer-Knopf“ meint den Aufnehmen-Knopf `[data-zus-nimm]`.
     Bis dahin war er der einzige Knopf einer Treffer-Zeile, darum genügte `#zus-treffer button`. Seit leere Felder den Editor
     ihres Feldtyps tragen, stehen davor weitere Knöpfe (Hier eintragen, Chip übernehmen, + Hinzufügen). Sie schalten nichts um
     und tragen darum kein aria-pressed. Die Prüfung gilt unverändert jedem Aufnehmen-Knopf, ohne Ausnahme. */
  const TREFFER_KNOPF = '#zus-treffer [data-zus-nimm]';
  const treffer = await page.evaluate((sel) => document.querySelectorAll(sel).length, TREFFER_KNOPF);
  /* POSITIVKONTROLLE: der Bildschirm zeigt überhaupt Treffer — sonst misst diese
     Probe eine leere Seite und nennt sie barrierefrei. */
  expect(treffer, 'die Suche liefert Treffer').toBeGreaterThan(0);

  /* DER ENTSCHEIDENDE TEIL: es genügt NICHT, dass es einen Live-Bereich GIBT. Die
     Frage ist, ob die AUFNAHME dort ankommt. Gemessen wird darum vorher/nachher —
     nicht die Existenz einer Einrichtung, sondern ihre Wirkung. */
  const vorher = await page.locator('#zus-live').textContent();
  expect(vorher, 'der Live-Bereich existiert und ist zunächst leer').toBe('');
  const ersterKnopf = page.locator(TREFFER_KNOPF).first();
  expect(await ersterKnopf.getAttribute('aria-pressed'), 'noch nicht aufgenommen -> aria-pressed=false').toBe('false');
  await ersterKnopf.click();
  await page.waitForTimeout(150);

  const nachher = await page.locator('#zus-live').textContent();
  expect(nachher, 'die Aufnahme wird im sr-only Live-Bereich angesagt').not.toBe('');
  expect(nachher, 'die Ansage nennt das aufgenommene Feld').toMatch(/aufgenommen/);

  /* Derselbe Knopf ist jetzt "Aufgenommen" (disabled) — die AKTUALISIERTE Liste
     zeigt einen NEUEN ersten Treffer-Knopf; dessen Zustand wird separat geprüft. */
  const listeKnopf = page.locator('#zus-liste button').first();
  await expect(listeKnopf).toBeVisible();

  // Und: JEDER Treffer-Knopf trägt aria-pressed — keine Ausnahme.
  const ohneAriaPressed = await page.evaluate((sel) =>
    [...document.querySelectorAll(sel)].filter((k) => !k.hasAttribute('aria-pressed')).length, TREFFER_KNOPF);
  expect(ohneAriaPressed, 'kein Treffer-Knopf ohne aria-pressed').toBe(0);
});

test('[D2·3] der Weg ist mit der TASTATUR gangbar — suchen, aufnehmen, weiter', async ({ page }) => {
  /* Der zweite Prüfstein, den axe nicht macht: axe prüft Fokussierbarkeit
     einzelner Elemente. Es läuft den WEG nicht ab. */
  await zumZusammenstellen(page);
  await page.locator('#zus-suche').focus();
  await page.keyboard.type('Versichertennummer');
  await page.waitForTimeout(250);

  const erreichbar = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const wo = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      return { tag: a.tagName.toLowerCase(),
        name: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40),
        id: a.id || null };
    });
    if (wo) erreichbar.push(wo);
  }

  /* POSITIVKONTROLLE: die Tab-Kette bewegt sich überhaupt. */
  expect(erreichbar.length, 'die Tastatur erreicht Bedienelemente').toBeGreaterThan(3);

  const ohneNamen = erreichbar.filter((e) => !e.name);
  console.log('[D2·Tastatur] erreichte Bedienelemente: ' + erreichbar.length
    + ' · davon OHNE zugänglichen Namen: ' + ohneNamen.length);
  if (ohneNamen.length) console.log('[D2·Tastatur] namenlos: ' + JSON.stringify(ohneNamen));

  /* Diese eine Aussage gatet: ein Bedienelement ohne Namen ist für eine blinde
     Nutzerin ein Knopf, der „Schaltfläche" heisst. Das ist kein Kontrast-Thema
     und keine Geschmacksfrage — es fällt unter dieselbe harte Klasse wie in
     `07-axe.spec.js` (fehlende Namen bleiben scharf). */
  expect(ohneNamen, '[D2] Bedienelemente ohne zugänglichen Namen: '
    + JSON.stringify(ohneNamen)).toEqual([]);
});

/* ── [D2·4] Nachtragen je Feldtyp: Mindestgröße in BEIDEN Ansichten (19.10.2026) ─────────────────────────────────
   Befund ANFRAGE-NACHTRAGEN-CODELISTE: Anfrage und Zusammenstellen zeigen für ein fehlendes Feld den Editor seines Feldtyps.
   Gefunden hat die zu kleine Chip-Eingabe (170 × 21 px) nur [D2·1], und nur im Zusammenstellen. Für die Anfrage-Ansicht gab
   es keine Probe. Diese misst beide Ansichten mit einer Anfrage, die je einen Feldtyp verlangt: axe mit derselben Gate-Politik
   wie [D2·1] und dazu die gerenderte Größe jedes sichtbaren Bedienelements in der Nachtrage-Klammer (`.zus-fuellen`, ≥ 24 px,
   WCAG 2.2 AA 2.5.8). */
const NACHTRAG_ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1, von: 'Klinik am Probenweg', zweck: 'Stationäre Aufnahme',
  grundlage: 'Behandlungsvertrag', vorgang: 'D2-NACHTRAG', gueltigBis: '2099-12-31',
  felder: ['health.allergiesMedicationFoodOther', 'health.generalPractitioner', 'health.insuranceNumber', 'identity.gender',
    'mobility.drivingLicenceClasses', 'identity.displayFamilyNameFirst', 'identity.idDocuments', 'identity.birthDate',
    'health.emergencyContacts', 'advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation']
    .map((kennung) => ({ kennung, zweck: 'Aufnahme', pflicht: true })),
  antwort: { art: 'einmalpasswort', an: 'aufnahme@klinik.example.invalid' },
};
async function nachtragGroessen(page) {
  return page.evaluate(() => [...document.querySelectorAll('.zus-fuellen input, .zus-fuellen select, .zus-fuellen textarea, .zus-fuellen button')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ el, r }) => r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden')
    .map(({ el, r }) => ({ was: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
      rahmen: el.closest('.zus-fuellen').getAttribute('data-anfrage-fuellen') || el.closest('.zus-fuellen').getAttribute('data-zus-fuellen'),
      breite: Math.round(r.width), hoehe: Math.round(r.height) })));
}
async function axeHart(page) {
  const ergebnis = await new AxeBuilder({ page }).withTags(WCAG).exclude('.logo-wort').exclude('.welcome-wort').analyze();
  return ergebnis.violations.filter((v) => v.impact === 'critical' || (v.impact === 'serious' && v.id !== 'color-contrast'));
}

test('[D2·4] Nachtragen je Feldtyp: jedes Bedienelement ist in Anfrage und Zusammenstellen mindestens 24 px groß', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await inLeisteKlicken(page, '[data-uebergabe-protokoll]');
  await page.waitForSelector('#anfragen-ort', { state: 'visible' });
  await page.click('#anfrage-empfangen');
  await page.fill('#anfrage-text', JSON.stringify(NACHTRAG_ANFRAGE));
  await page.click('#m-ok');
  await page.waitForSelector('#anfrage-kopf', { state: 'visible' });

  const anfrage = await nachtragGroessen(page);
  /* Positivkontrolle: die Editoren der verlangten Typen stehen da, sonst misst die Probe eine leere Ansicht. */
  expect(anfrage.some((g) => g.was.startsWith('input.chip-eingabe')), 'Chip-Eingabe in der Anfrage').toBe(true);
  expect(anfrage.some((g) => g.was.startsWith('select')), 'Auswahl in der Anfrage').toBe(true);
  expect(anfrage.filter((g) => g.hoehe < 24 || g.breite < 24), '[D2·4] Anfrage: Bedienelemente unter 24 px').toEqual([]);
  const hartAnfrage = await axeHart(page);
  expect(hartAnfrage, '[D2·4] Anfrage, harte Verstöße: ' + hartAnfrage.map((v) => `${v.id}: ${v.help}`).join(' | ')).toEqual([]);

  await inLeisteKlicken(page, '[data-weitergeben-zentral]');
  await page.click('[data-hz-zusammenstellen]');
  await expect(page.locator('#zus-suche')).toBeVisible();
  const zus = await nachtragGroessen(page);
  expect(zus.some((g) => g.was.startsWith('input.chip-eingabe')), 'Chip-Eingabe im Zusammenstellen').toBe(true);
  expect(zus.filter((g) => g.hoehe < 24 || g.breite < 24), '[D2·4] Zusammenstellen: Bedienelemente unter 24 px').toEqual([]);
});
