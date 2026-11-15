'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Studio · der Weg eines Menschen ohne Fachwissen (Erstnutzer), Telefon und Schreibtisch
   ────────────────────────────────────────────────────────────────────────
   Anlass: Wer das Studio zum ersten Mal öffnet, soll ohne Vorwissen eine Vorlage aus Bausteinen zusammenstellen können.
   Die Probe geht diesen Weg nach, wie eine Person ihn geht: Studio öffnen, den einfachen Weg wählen („Vorlage erstellen“),
   aus der Palette „Felder“ drei Bausteine in die Vorlage bringen, das Ergebnis ansehen. Zwei Breiten, je ein Test:
   390 × 844 mit Berührung (kein HTML5-Ziehen mit dem Finger: dort muss ein Antipp-Weg tragen) und 1280 × 800 mit Maus
   (echtes Ziehen, `locator.dragTo`).

   Zugesichert wird, je Breite (jede als `expect.soft`, damit ein Lauf ALLE Lücken zeigt):
     a) ohne Scrollen ist ein eindeutiger erster Schritt sichtbar;
     b) drei Bausteine kommen aus der Palette in die Vorlage (1280: Ziehen; 390: Antippen);
     c) danach zeigt die Vorlage genau diese drei Bausteine in der Reihenfolge des Ablegens; einer lässt sich
        umsortieren und wieder entfernen;
     d) im sichtbaren Text jeder Ansicht des Wegs steht kein Fachwort (Liste FACHWOERTER unten; Treffer mit Wort und
        Textausschnitt);
     e) bei 390: jedes antippbare Element der Palette und der Vorlage misst mindestens 44 × 44 px, und nichts ragt
        waagerecht über den Bildschirm (scrollWidth ≤ clientWidth; dieselbe Überlaufprüfung läuft auch bei 1280);
     f) am Ende ist ein Ergebnis erreichbar (Vorschau oder Sichern der Vorlage) über einen sichtbaren Knopf mit
        verständlicher Beschriftung.
   Wo das Studio etwas nicht hat, bleibt die Zusicherung stehen und wird rot; sie wird nicht angepasst.

   STAND 12.11.2026 (Studio per Ziehen und Ablegen): b) ist auf den EINFACHEN Weg umgestellt (schärfer): die Palette steht im
   Assistenten (#as-palette), dort werden die drei Bausteine abgelegt (1280: Ziehen auf #as-felder; 390: Antippen von „+“), dort
   wird umsortiert und entfernt (Menü immer sichtbar, ohne vorher zu wählen). Danach führt „Expertensicht ↗“ in die Arbeitsfläche:
   dieselben drei Bausteine in derselben Folge, Menü der Karten ohne Wählen, Ergebnis über einen Knopf (f). Zusicherung d) gilt
   im einfachen Weg ohne Ausnahme; in der Expertensicht steht „Technische Namen (Kennungen) zeigen“ (Klasse .pal-kennungen) zu
   Recht und wird dort ausgenommen. Rot-Beweis: STUDIO_DATEI=<Quelltext vor der Änderung> npx playwright test <diese Datei>.
   Rot-Beweis gemessen 12.11.2026 gegen den Stand dce400a33 (git show HEAD:vivodepot-studio.html): 2 failed (390 und 1280; b) „keine Palette im
   einfachen Weg“), gegen den Stand mit dem Bau: 2 passed.

   GEGENPROBE: Vor dem Ablegen prüft die Probe, dass die Vorlage leer ist (kein Baustein, Zähler „0“). Ohne diese Vorprobe
   könnte „drei Bausteine“ auch ein Rest aus einem früheren Schritt sein. Die Palette wird vorab gezählt (es gibt Einträge
   zum Ablegen). Die Ablege-Reihenfolge weicht absichtlich von der Reihenfolge der Palette ab (3., 1., 2. Eintrag): eine
   Vorlage, die stillschweigend nach der Palette sortiert, fällt in c) auf.
   Positivkontrolle bei 390: der Kontext meldet `pointer: coarse`, und die Messung in e) hat Elemente gefunden.
   Sprache fest Deutsch (sonst folgt das Studio der Browser-Sprache); Netzanfragen außer file:/data:/blob: werden abgebrochen.
   Je Breite am Ende ein Bild (auch bei Fehlschlag) im Ausgabeordner der Probe: studio-erstnutzer-<breite>.png.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');

/* STUDIO_DATEI: ein anderer Quelltext statt der Datei im Baum, für den Rot-Beweis (der Stand vor der Änderung, aus git show). */
const STUDIO_URL = 'file://' + (process.env.STUDIO_DATEI || path.join(__dirname, '..', '..', 'vivodepot-studio.html'));
const FINGER_PX = 44;

const BREITEN = [
  { name: '390', breite: 390, hoehe: 844, beruehrung: true },
  { name: '1280', breite: 1280, hoehe: 800, beruehrung: false },
];

/* Fachwörter, die im sichtbaren Text des Weges nicht stehen sollen. Kürzel groß geschrieben und nur so gefunden (kein „id“
   in „Idee“); Wörter ohne Unterscheidung der Schreibung. [Name, Muster] */
const FACHWOERTER = [
  ['JSON', /\bJSON\b/],
  ['Schema', /\bSchema\b/i],
  ['FHIR', /\bFHIR\b/],
  ['SD-JWT', /\bSD-JWT\b/i],
  ['DID', /\bDID\b/],
  ['JWS', /\bJWS\b/],
  ['Token', /\bTokens?\b/i],
  ['Payload', /\bPayload\b/i],
  ['ID', /\bID\b/],
  ['Key', /\bKeys?\b/],
  ['Modul-ID', /\bModul-ID\b/i],
  ['Feld-ID', /\bFeld-ID\b/i],
  ['Regex', /\bRegex\b/i],
  ['Slug', /\bSlug\b/i],
  ['Hash', /\bHash\w*/i],
  ['Signatur-Kette', /\bSignatur-Kette\b/i],
  ['Kennung', /\bKennung(en)?\b/i],
  ['Technische Namen', /\bTechnische Namen\b/i],
];

/* Die Beschriftung eines Knopfes für das Ergebnis (f): „Vorschau“ oder Sichern/Herunterladen der Vorlage. */
const ERGEBNIS_KNOEPFE = ['#ansicht-probieren', '#entwurf-sichern', '#vorlage-sichern', '#fertig-oeffnen'];
const ERGEBNIS_BESCHRIFTUNG = /Vorschau|herunterladen|speichern|sichern|fertig/i;

async function oeffnen(browser, b) {
  const ctx = await browser.newContext({
    viewport: { width: b.breite, height: b.hoehe },
    hasTouch: b.beruehrung,
    isMobile: b.beruehrung,
    deviceScaleFactor: b.beruehrung ? 2 : 1,
    locale: 'de-DE',
    acceptDownloads: true,
  });
  await ctx.route('**', (r) => {
    const u = r.request().url();
    if (/^(file|data|blob):/.test(u)) return r.continue();
    return r.abort();
  });
  const page = await ctx.newPage();
  await page.goto(STUDIO_URL);
  await page.waitForSelector('#raum-eingang', { state: 'visible' });
  return { ctx, page };
}

/* Ein Schritt, der an der Oberfläche scheitern kann (verdeckt, nicht da): das Scheitern wird eine weiche Zusicherung mit
   deutscher Meldung, der Lauf geht weiter und zeigt die nächsten Lücken. */
async function versuche(meldung, aktion) {
  try { await aktion(); return true; } catch (e) {
    expect.soft(false, `${meldung} (${String(e && e.message).split('\n')[0]})`).toBe(true);
    return false;
  }
}

async function fachwoerterPruefen(page, ansicht, ausnahmen) {
  const text = await page.evaluate((aus) => {
    const weg = aus ? Array.from(document.querySelectorAll(aus)) : [];
    const alt = weg.map((n) => n.style.display);
    weg.forEach((n) => { n.style.display = 'none'; });
    const t = document.body.innerText;
    weg.forEach((n, i) => { n.style.display = alt[i]; });
    return t;
  }, ausnahmen || '');
  const treffer = [];
  for (const [name, muster] of FACHWOERTER) {
    const g = new RegExp(muster.source, muster.flags.replace('g', '') + 'g');
    let m;
    while ((m = g.exec(text)) && treffer.length < 80) {
      const ausschnitt = text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ');
      treffer.push(`${name}: „…${ausschnitt}…“`);
    }
  }
  expect.soft(treffer.length, `d) Ansicht „${ansicht}“: ${treffer.length} Fachwort-Treffer im sichtbaren Text:\n  ${treffer.join('\n  ')}`).toBe(0);
}

async function ueberlaufPruefen(page, ansicht) {
  const m = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
    bodyScroll: document.body.scrollWidth,
  }));
  expect.soft(m.scroll <= m.client && m.bodyScroll <= m.client + 0,
    `e) Ansicht „${ansicht}“: Inhalt ragt waagerecht über den Bildschirm (scrollWidth ${m.scroll}, body ${m.bodyScroll}, clientWidth ${m.client})`).toBe(true);
}

async function kartenNamen(page) {
  return page.$$eval('#tpl-felder .vk .vk-name', (els) => els.map((e) => (e.firstChild ? e.firstChild.textContent : '').trim()));
}
async function frageNamen(page) {
  return page.$$eval('#as-felder .as-frage .as-frage-name', (els) => els.map((e) => e.textContent.replace(/\s*\*\s*$/, '').trim()));
}

for (const b of BREITEN) {
  test(`Studio-Erstnutzer-Weg, ${b.name} px${b.beruehrung ? ' mit Berührung' : ''}`, async ({ browser }, testInfo) => {
    test.setTimeout(120000);
    const { ctx, page } = await oeffnen(browser, b);
    const antippen = (loc, opt) => (b.beruehrung ? loc.tap({ timeout: 5000, ...opt }) : loc.click({ timeout: 5000, ...opt }));
    try {
      /* ── a) Öffnen: erster Schritt ohne Scrollen ── */
      const erster = await page.evaluate(() => {
        const k = document.getElementById('ein-vorlage'); if (!k) return null;
        const r = k.getBoundingClientRect();
        return { oben: r.top, unten: r.bottom, links: r.left, rechts: r.right, vh: window.innerHeight, vw: window.innerWidth, scrollY: window.scrollY };
      });
      expect.soft(erster && erster.scrollY === 0 && erster.oben >= 0 && erster.unten <= erster.vh && erster.links >= 0 && erster.rechts <= erster.vw,
        `a) Ohne Scrollen ist der erste Schritt („Vorlage erstellen“, #ein-vorlage) nicht vollständig sichtbar: ${JSON.stringify(erster)}`).toBe(true);
      await fachwoerterPruefen(page, 'Eingang');
      await ueberlaufPruefen(page, 'Eingang');

      /* ── den einfachen Weg wählen ── */
      await antippen(page.locator('#ein-vorlage'));
      await expect(page.locator('#raum-assistent')).toBeVisible();
      await fachwoerterPruefen(page, 'Einfacher Weg (Assistent)');
      await ueberlaufPruefen(page, 'Einfacher Weg (Assistent)');
      const paletteImEinfachen = await page.locator('#as-palette .pal-eintrag:visible').count();
      expect.soft(paletteImEinfachen > 0,
        'b) Im einfachen Weg (Assistent) gibt es keine Palette mit Bausteinen zum Ziehen oder Antippen (#as-palette)').toBe(true);

      /* ── Gegenprobe: der Bogen ist leer, die Palette hat Einträge ── */
      expect.soft(await page.locator('#as-felder .as-frage').count(), 'Vorprobe: der Bogen ist vor dem Ablegen nicht leer').toBe(0);
      const eintraege = page.locator('#as-pal-liste details[open] .pal-eintrag[data-kat]');
      expect(await eintraege.count(), 'Vorprobe: die Palette hat weniger als drei Bausteine in der offenen Gruppe').toBeGreaterThanOrEqual(3);
      const kats = await eintraege.evaluateAll((els) => els.slice(0, 3).map((e) => ({ kat: e.getAttribute('data-kat'), name: (e.querySelector('span') ? e.querySelector('span').textContent : '').trim() })));
      /* Ablege-Reihenfolge: 3., 1., 2. Eintrag der Palette */
      const ablage = [kats[2], kats[0], kats[1]];
      await ueberlaufPruefen(page, 'Einfacher Weg mit Palette, leer');

      /* ── b) drei Bausteine ablegen (im einfachen Weg) ── */
      for (const k of ablage) {
        const zeile = page.locator(`#as-pal-liste .pal-eintrag[data-kat="${k.kat}"]`);
        if (b.beruehrung) {
          await versuche(`b) „${k.name}“ lässt sich bei Berührung nicht aus der Palette hinzufügen (Antippen von „+“, .pal-plus)`,
            () => zeile.locator('.pal-plus').tap({ timeout: 5000 }));
        } else {
          await versuche(`b) „${k.name}“ lässt sich nicht aus der Palette in den Bogen ziehen (dragTo auf #as-felder)`,
            async () => {
              /* auf den unteren Rand der Liste ablegen: hinter die letzte Frage (bei leerer Liste auf die Ablagefläche) */
              await page.locator('#as-felder').scrollIntoViewIfNeeded();
              const lb = await page.locator('#as-felder').boundingBox();
              await zeile.dragTo(page.locator('#as-felder'), { timeout: 5000, steps: 10, targetPosition: { x: lb.width / 2, y: Math.max(2, lb.height - 3) } });
            });
        }
      }

      /* ── c) genau diese drei, in Ablege-Reihenfolge ── */
      const erwartet = ablage.map((k) => k.name);
      const da = await frageNamen(page);
      expect.soft(da.length, `c) Der Bogen zeigt ${da.length} statt 3 Bausteine: ${JSON.stringify(da)}`).toBe(3);
      expect.soft(da, `c) Reihenfolge des Bogens weicht von der Reihenfolge des Ablegens ab (erwartet ${JSON.stringify(erwartet)})`).toEqual(erwartet);
      await fachwoerterPruefen(page, 'Einfacher Weg mit drei Bausteinen');
      await ueberlaufPruefen(page, 'Einfacher Weg mit drei Bausteinen');

      /* ── e) Trefferflächen (bei Berührung) und Überstand ── */
      if (b.beruehrung) {
        const grob = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
        expect.soft(grob, 'Positivkontrolle: der Kontext meldet kein pointer: coarse, die Messung in e) wäre eine Desktop-Messung').toBe(true);
      }
      const messen = (wurzeln) => page.evaluate((ws) => {
        const aus = [];
        document.querySelectorAll(ws).forEach((wurzel) => {
          wurzel.querySelectorAll('button, summary, a[href], input:not([type="hidden"]), select, textarea').forEach((n) => {
            const r = n.getBoundingClientRect(); const s = getComputedStyle(n);
            if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || s.display === 'none') return;
            aus.push({ wo: wurzel.id, was: (n.getAttribute('aria-label') || n.textContent || n.id || n.tagName).trim().slice(0, 40),
              b: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, rechts: Math.round(r.right), tag: n.tagName.toLowerCase(),
              typ: n.getAttribute('type') || '' });
          });
        });
        return { alle: aus, vw: document.documentElement.clientWidth };
      }, wurzeln);
      const flaechenPruefen = (messung, wo) => {
        if (!b.beruehrung) return;
        expect.soft(messung.alle.length > 0, `Positivkontrolle: in ${wo} wurden keine antippbaren Elemente gemessen`).toBe(true);
        const zuKlein = messung.alle.filter((m) => !(m.tag === 'input' && (m.typ === 'checkbox' || m.typ === 'radio')) && (m.b < FINGER_PX || m.h < FINGER_PX));
        expect.soft(zuKlein.length, `e) ${wo}: ${zuKlein.length} von ${messung.alle.length} antippbaren Elementen messen weniger als ${FINGER_PX} × ${FINGER_PX} px:\n  `
          + zuKlein.map((m) => `${m.wo} · ${m.tag} „${m.was}“ ${m.b} × ${m.h}`).join('\n  ')).toBe(0);
        const rausragend = messung.alle.filter((m) => m.rechts > messung.vw);
        expect.soft(rausragend.length, `e) ${wo}: ${rausragend.length} Elemente ragen rechts über den Bildschirm (${messung.vw} px): ${rausragend.map((m) => `${m.was} (${m.rechts})`).join(', ')}`).toBe(0);
      };
      flaechenPruefen(await messen('#as-palette, #as-felder'), 'Palette und Bogen im einfachen Weg');

      /* ── c) umsortieren und entfernen im einfachen Weg: das Menü steht an jeder Frage, ohne vorher zu wählen ── */
      const vorher = await frageNamen(page);
      if (vorher.length >= 2) {
        await versuche('c) Eine Frage lässt sich nicht umsortieren („Nach unten“ an der ersten Frage)', async () => {
          await antippen(page.locator('#as-felder .as-frage').nth(0).getByRole('button', { name: 'Nach unten' }));
          expect.soft(await frageNamen(page), 'c) Nach „Nach unten“ steht die Reihenfolge nicht wie erwartet').toEqual([vorher[1], vorher[0], ...vorher.slice(2)]);
        });
      }
      const mitte = await frageNamen(page);
      if (mitte.length >= 1) {
        const letzter = mitte.length - 1;
        await versuche('c) Eine Frage lässt sich nicht wieder entfernen („Entfernen“ an der letzten Frage)', async () => {
          await antippen(page.locator('#as-felder .as-frage').nth(letzter).getByRole('button', { name: 'Entfernen' }));
          expect.soft(await frageNamen(page), 'c) Nach „Entfernen“ ist die Frage nicht entfernt').toEqual(mitte.slice(0, letzter));
        });
      }
      /* wieder drei: die entfernte kommt per „+“ zurück, damit die Expertensicht drei Bausteine zeigt */
      await versuche('c) Die entfernte Frage lässt sich nicht wieder hinzufügen',
        () => antippen(page.locator(`#as-pal-liste .pal-eintrag[data-kat="${ablage[ablage.length - 1].kat}"] .pal-plus`)));
      const vorExperte = await frageNamen(page);

      /* ── Expertensicht: dieselben Bausteine in derselben Folge, Menü der Karten ohne Wählen ── */
      await antippen(page.locator('#as-fachebene'));
      await expect(page.locator('#raum-bau')).toBeVisible();
      await fachwoerterPruefen(page, 'Expertensicht (Arbeitsfläche)', '.pal-kennungen');
      await ueberlaufPruefen(page, 'Expertensicht (Arbeitsfläche)');
      const imExperten = await kartenNamen(page);
      expect.soft(imExperten, 'c) Die Expertensicht zeigt nicht dieselben Bausteine in derselben Folge wie der einfache Weg').toEqual(vorExperte);
      flaechenPruefen(await messen('#palette, #tpl-felder'), 'Palette und Vorlage der Expertensicht');
      if (imExperten.length >= 2) {
        await versuche('c) Ein Baustein der Expertensicht lässt sich nicht umsortieren („Feld nach unten“ ohne vorher zu wählen)', async () => {
          await antippen(page.locator('#tpl-felder .vk[data-i="0"] button[aria-label="Feld nach unten"]'));
          expect.soft(await kartenNamen(page), 'c) Nach „Feld nach unten“ steht die Reihenfolge nicht wie erwartet').toEqual([imExperten[1], imExperten[0], ...imExperten.slice(2)]);
        });
      }
      const mitteE = await kartenNamen(page);
      if (mitteE.length >= 1) {
        const letzterE = mitteE.length - 1;
        await versuche('c) Ein Baustein der Expertensicht lässt sich nicht entfernen („Feld löschen“ ohne vorher zu wählen)', async () => {
          await antippen(page.locator(`#tpl-felder .vk[data-i="${letzterE}"] button[aria-label="Feld löschen"]`));
          expect.soft(await kartenNamen(page), 'c) Nach „Feld löschen“ ist der Baustein nicht entfernt').toEqual(mitteE.slice(0, letzterE));
        });
      }
      expect.soft(await page.locator('#eigenschaften.editor-offen').count(), 'c) Das Bearbeitungsblatt ist beim Ablegen, Umsortieren oder Entfernen aufgegangen').toBe(0);

      /* ── f) Ergebnis erreichbar ── */
      const knoepfe = [];
      for (const sel of ERGEBNIS_KNOEPFE) {
        const k = page.locator(sel);
        if (await k.isVisible().catch(() => false)) knoepfe.push({ sel, text: (await k.innerText()).replace(/\s+/g, ' ').trim() });
      }
      expect.soft(knoepfe.some((k) => ERGEBNIS_BESCHRIFTUNG.test(k.text)),
        `f) Kein sichtbarer Knopf mit verständlicher Beschriftung für das Ergebnis (Vorschau oder Vorlage sichern); gefunden: ${JSON.stringify(knoepfe)}`).toBe(true);
      /* Studio-Schritt 5 (12.11.2026): „Vorlage sichern“ gibt drei Dateien aus — die Vorlage, die Vorlage als FHIR-Questionnaire
         und die lesbare Fassung als PDF. */
      await versuche('f) „Vorlage sichern“ gibt nicht die drei Dateien aus (Vorlage, Questionnaire, PDF)', async () => {
        const namen = [];
        const hoeren = (d) => namen.push(d.suggestedFilename());
        page.on('download', hoeren);
        try {
          await antippen(page.locator('#vorlage-sichern'));
          await expect.poll(() => namen.length, { timeout: 20000, message: 'f) Nach „Vorlage sichern“ kamen nicht drei Dateien' }).toBe(3);
        } finally { page.off('download', hoeren); }
        expect.soft(namen.filter((n) => /\.pdf$/.test(n)).length, 'f) kein PDF: ' + namen.join(', ')).toBe(1);
        expect.soft(namen.filter((n) => /questionnaire\.json$/.test(n)).length, 'f) kein Questionnaire: ' + namen.join(', ')).toBe(1);
        expect.soft(namen.filter((n) => /\.json$/.test(n) && !/questionnaire\.json$/.test(n)).length, 'f) keine Vorlage: ' + namen.join(', ')).toBe(1);
      });
      await versuche('f) Die Vorschau der Vorlage lässt sich nicht öffnen (#ansicht-probieren, „Vorschau“)', async () => {
        await antippen(page.locator('#ansicht-probieren'));
        await expect(page.locator('#raum-bau')).toHaveClass(/probieren/, { timeout: 3000 });
        expect.soft(await page.locator('#tpl-felder .vk:visible').count(), 'f) In der Vorschau ist kein Baustein der Vorlage zu sehen').toBeGreaterThan(0);
      });
      await fachwoerterPruefen(page, 'Vorschau (Expertensicht)', '.pal-kennungen');
      await ueberlaufPruefen(page, 'Vorschau');
    } finally {
      await page.screenshot({ path: testInfo.outputPath(`studio-erstnutzer-${b.name}.png`), fullPage: true }).catch(() => {});
      await ctx.close();
    }
  });
}
