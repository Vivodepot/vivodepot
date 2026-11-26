'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-42 — Studio, Einfach-Weg: von der Kachel „Vorlage erstellen“ bis zur eingereichten Vorlage (Studio-Umbau, Wagen 1.5)
   ─────────────────────────────────────────────────
   Eine Person ohne Fachwissen geht den ganzen Weg im Browser; die Seite zählt selbst mit:
     Klicks   = jeder echte Klick (isTrusted) auf der Seite, vom Klick auf die Kachel bis zum Öffnen des Mailprogramms (seit Teil 2 ohne eigenen Klick);
     Eingaben = jedes Feld, in das die Person tippt (einmal je Feld).
   Handgriffe = Klicks + Eingaben. Höchstens KLICKS_HOECHSTENS Klicks und höchstens HANDGRIFFE_DECKEL Handgriffe (gemessener Ist-Wert,
   nur sinkend). Die Zahlen stehen als Anmerkung am Test (Reporter „list“: `--reporter=json`).
   Dazu, was eine Person ohne Fachwissen sonst raten müsste:
     d · Der Dialog „Einreichen“ steht über der einen Arbeitsfläche und zeigt die einfache Darstellung (seit 14.11.2026; vorher
         stand er über dem Assistenten, mit Kopf-Schalter „Einfach“).
     e · Vor dem ersten Fehler steht kein roter Kasten zu den Angaben der Einrichtung.
     f · Der Dialog und die Hilfe nennen keine Fachwörter; das Angehörigen-Blatt behält die Fachwörter in Dialog
         und Hilfe.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<kopie von dbf1c70b4:vivodepot-studio.html> → alle drei Tests rot (9 Klicks; Dialog über
   der Arbeitsfläche; roter Kasten „Anbieter-Stammdaten unvollständig“; Fachwörter sichtbar).
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const H = require('./support/helpers');

const URL = process.env.GENERATOR_HTML_PATH ? 'file://' + path.resolve(process.env.GENERATOR_HTML_PATH) : H.URLS.generator;
const KLICKS_HOECHSTENS = 7;
/* HANDGRIFFE_DECKEL = gemessener Ist-Wert nach S-C (10.11.2026: 7 Klicks + 7 Eingaben; die Ansprechperson ist freiwillig), nur sinkend.
   Davor 15 (7 Klicks + 8 Eingaben, nach Teil 2). Davor 18 (8 Klicks + 10 Eingaben;
   Wagen 1.5 am 09.11.2026, davor 21, siehe Rot-Beweis). Teil 2 nahm: „Weiter: Bogen gestalten“ (Schritt 1 und 2 auf einer Seite),
   „E-Mail vorbereiten“ (das Mailprogramm öffnet im selben Zug, solange der Klick als Nutzeraktivierung gilt), die Antragsnummer (das
   Studio bildet sie). Das Land ist ein Klick auf den Vorschlag statt einer Eingabe, netto 0. Ziel sind 8 Handgriffe; offen bleiben
   Sicherung und Antragsdatei in einem Klick, Passwort-Wiederholung, die Anschrift. */
const HANDGRIFFE_DECKEL = 14;
const FACHWORT = /Anbieter-Stammdaten|Template|Pflichtfeld|Rechtsraum|USt-ID|\.vdkey|\.jwk|Trust-Authority|FHIR|Code-System|öffentliche[nrms]? Schlüssel|private[nrms]? Schlüssel/;
const ZAHL_BEREICHE = /vierzehn|\b14 (Kategorien|Bereiche|Sektoren)/i;

const SD = { name: 'Sportverein Beispielstadt', strasse: 'Am Sportplatz 3', plz: '12345', ort: 'Beispielstadt', land: 'Deutschland',
  kname: 'Erika Beispiel', email: 'verein@beispiel.example' };

/* Die Seite zählt selbst: echte Klicks und die Felder, in die getippt wird. Ein Klick auf „E-Mail vorbereiten“ öffnet
   im Test kein Mailprogramm (mailto wird nach dem Zählen angehalten). */
function zaehlerEinbauen(ctx) {
  return ctx.addInitScript(() => {
    window.__handgriffe = { klicks: [], eingaben: [], mailAuto: false };
    document.addEventListener('click', (e) => {
      if (!e.isTrusted) {       // ein Klick der Seite selbst auf einen mailto-Link: das Mailprogramm öffnet ohne Handgriff (Teil 2, K8)
        const m = e.target && e.target.closest ? e.target.closest('a[href^="mailto:"]') : null;
        if (m) { window.__handgriffe.mailAuto = true; e.preventDefault(); }
        return;
      }
      const t = e.target && e.target.closest ? e.target.closest('button, a, summary, label, input, select') : null;
      window.__handgriffe.klicks.push(t ? (t.id || t.getAttribute('data-art') || t.textContent.trim().slice(0, 30)) : '?');
      const a = e.target && e.target.closest ? e.target.closest('a[href^="mailto:"]') : null;
      if (a) e.preventDefault();
    }, true);
    document.addEventListener('input', (e) => {
      const id = e.target && e.target.id;
      if (id && !window.__handgriffe.eingaben.includes(id)) window.__handgriffe.eingaben.push(id);
    }, true);
  });
}
const zaehlerLesen = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__handgriffe)));
const zaehlerNull = (p) => p.evaluate(() => { window.__handgriffe = { klicks: [], eingaben: [], mailAuto: false }; });

async function seiteOeffnen(browser) {
  const ctx = await browser.newContext({ acceptDownloads: true, locale: 'de-DE' });   // aus der Region der Browser-Sprache schlägt das Studio das Land vor
  await zaehlerEinbauen(ctx);
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.click('#sp-de');            // die Sprache des Browsers soll nicht mitspielen; zählt nicht zum Weg
  await zaehlerNull(p);
  return { ctx, p };
}
const sichtbar = async (p, sel) => (await p.locator(sel).count()) > 0 && p.locator(sel).first().isVisible();

/* Das Land: der Vorschlag aus der Browser-Sprache ist ein Klick auf den Chip (das Feld bleibt bis dahin leer); wo das Studio keinen
   zeigt (Stand vor Teil 2), wird getippt. Die Zählung nimmt beides als einen Handgriff. */
async function landEintragen(p) {
  if (await sichtbar(p, '#as-land-chip')) {
    await expect(p.locator('#as-land')).toHaveValue('');
    await p.click('#as-land-chip');
    await expect(p.locator('#as-land')).toHaveValue(SD.land);
    await expect(p.locator('#as-land-chip')).toBeHidden();                 // mit eingetragenem Land geht der Chip
  } else await p.fill('#as-land', SD.land);
}

/* Der Weg, wie ihn eine Person geht: was die Seite zeigt, wird ausgefüllt, der Hauptknopf gedrückt. Er läuft auf jedem Stand
   (auch auf dem vor Wagen 1.5), damit die Zählung vergleichbar bleibt. */
async function bisZumDialog(p, angabenAmStart) {
  await p.fill('#as-name', SD.name);
  if (angabenAmStart) {                              // M5 (22.11.2026): die Angaben öffnen sich nicht mehr beim Tippen, ein Klick öffnet sie
    if (!(await p.locator('#start-angaben[open]').count())) await p.click('#start-angaben > summary');
    await expect(p.locator('#as-strasse')).toBeVisible();
    await p.fill('#as-strasse', SD.strasse); await p.fill('#as-plz', SD.plz); await p.fill('#as-ort', SD.ort);
    await landEintragen(p);
    await p.fill('#as-k-email', SD.email);          // die Ansprechperson (Name) ist freiwillig und bleibt leer (S-C)
  }
  await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
  await p.click('#as-beispiele [data-beispiel="verein"]');                  // das Beispiel nennt die Art, seine Felder liegen in der Arbeitsfläche
  await expect(p.locator('#tpl-felder .vk').first()).toBeVisible();
  if (angabenAmStart) await expect(p.locator('#as-rechtsform')).toHaveValue('e.V.');   // aus Land und Art vorgeschlagen, kein Handgriff
  await p.evaluate(() => fertigOeffnen());
  await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
}

test.describe('T-CROSS-42 Studio · Einfach-Weg', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('studio-einfach-weg'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('Kachel bis eingereichte Vorlage: höchstens 7 Klicks, Dialog in der einfachen Darstellung über der Arbeitsfläche', async ({ browser }) => {
    test.setTimeout(240000);
    const { ctx, p } = await seiteOeffnen(browser);
    await bisZumDialog(p, true);

    // d · der Dialog steht über der einen Arbeitsfläche und zeigt die einfache Darstellung; es gibt keinen Kopf-Schalter
    await expect(p.locator('#raum-bau')).toBeVisible();
    await expect(p.locator('#dlg-fertig')).toHaveClass(/\beinfach\b/);
    await expect(p.locator('#kopf-einfach, #kopf-fachebene')).toHaveCount(0);

    if (await sichtbar(p, '#sd-weiter')) {      // „Wer reicht ein?“ offen: ausfüllen, was fehlt (die Antragsdatei braucht die Rechtsform)
      if (!(await p.inputValue('#sd-rechtsform'))) { await H.weitereAngabenOeffnen(p); await p.fill('#sd-rechtsform', 'e.V.'); }
      for (const [id, wert] of [['#sd-strasse', SD.strasse], ['#sd-plz', SD.plz], ['#sd-ort', SD.ort], ['#sd-land', SD.land], ['#sd-k-email', SD.email]]) {
        if (!(await p.inputValue(id))) await p.fill(id, wert);
      }
      await p.click('#sd-weiter');
    }
    await p.fill('#sk-pw1', H.SCHLUESSEL_PASSWORT_E2E); await p.fill('#sk-pw2', H.SCHLUESSEL_PASSWORT_E2E);
    await Promise.all([p.waitForEvent('download'), p.click('#sk-priv')]);
    if (await sichtbar(p, '#sk-antragsnummer')) await p.fill('#sk-antragsnummer', '0123456789abcdef0123456789abcdef');   // bis Teil 2 gefragt; seither bildet das Studio die Nummer
    await Promise.all([p.waitForEvent('download'), p.click('#sk-antrag')]);
    await expect(p.locator('#pr-submit')).toBeEnabled();
    await H.downloadNachTmp(p, tmp, () => p.click('#pr-submit'));
    const mail = p.locator('#fs-fertig-mail:visible, #absenden-mail:visible').first();
    await expect(mail).toHaveAttribute('href', /^mailto:/);
    await expect(p.locator('#sk-antrag-meldung')).toHaveText('');
    const mailAuto = await p.evaluate(() => window.__handgriffe.mailAuto);   // Teil 2: das Mailprogramm öffnet im selben Zug wie der Download
    if (!mailAuto) await mail.click();

    const z = await zaehlerLesen(p);
    const handgriffe = z.klicks.length + z.eingaben.length;
    test.info().annotations.push({ type: 'handgriffe', description: JSON.stringify({ klicks: z.klicks.length, eingaben: z.eingaben.length, handgriffe, mailAuto, wege: z }) });
    console.log('HANDGRIFFE ' + JSON.stringify({ klicks: z.klicks.length, eingaben: z.eingaben.length, handgriffe, mailAuto }) + ' ' + JSON.stringify(z));
    expect(mailAuto, 'das Mailprogramm öffnet im selben Zug wie der Download (Teil 2, K8)').toBe(true);
    expect(z.klicks.length, 'Klicks: ' + z.klicks.join(' → ')).toBeLessThanOrEqual(KLICKS_HOECHSTENS);
    expect(handgriffe, 'Handgriffe (Klicks + Eingaben)').toBeLessThanOrEqual(HANDGRIFFE_DECKEL);
    await ctx.close();
  });

  test('e · vor dem ersten Fehler kein roter Kasten zu den Angaben; danach die Felder markiert', async ({ browser }) => {
    test.setTimeout(60000);
    const { ctx, p } = await seiteOeffnen(browser);
    await bisZumDialog(p, false);                 // nur der Name: der Dialog öffnet bei „Wer reicht ein?“
    await expect(p.locator('#sd-name')).toBeVisible();
    await expect(p.locator('#sd-name')).toHaveValue(SD.name);
    await expect(p.locator('#pr-blocker')).not.toContainText(/Anbieter|Angaben zur Einrichtung|Provider/);
    await expect(p.locator('#sd-fehler')).toBeHidden();
    await p.click('#sd-weiter');                  // der erste Fehler
    await expect(p.locator('#sd-fehler')).toBeVisible();
    await expect(p.locator('#sd-strasse')).toHaveAttribute('aria-invalid', 'true');
    await ctx.close();
  });

  test('f · Dialog und Hilfe nennen keine Fachwörter; das Angehörigen-Blatt behält die technischen Begriffe in Dialog und Hilfe', async ({ browser }) => {
    test.setTimeout(60000);
    const { ctx, p } = await seiteOeffnen(browser);
    // Die Hilfe zeigt zuerst keine Fachwörter und keine Zahl von Bereichen
    await p.click('#kopf-hilfe');
    const hilfeEinfach = await p.locator('#dlg-hilfe').innerText();
    expect(hilfeEinfach, 'die Hilfe ist nicht leer').toContain('Bereich');
    expect(hilfeEinfach.match(FACHWORT), 'Fachwort in der Hilfe').toBeNull();
    expect(hilfeEinfach.match(ZAHL_BEREICHE), 'Zahl von Bereichen in der Hilfe').toBeNull();
    await p.click('#dlg-hilfe .dlg-zu');
    await p.fill('#as-name', SD.name);
    await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
    await p.click('#as-beispiele [data-beispiel="andere"]');
    for (let i = 0, n = await p.locator('#tpl-felder .vk').count(); i < n; i++) {   // ohne Pflicht: die Empfehlung erscheint
      await p.locator('#tpl-felder .vk').nth(i).locator('.vk-bearbeiten').click();
      await p.waitForSelector('#feld-editor:not([hidden])');
      await p.uncheck('#ed-pflicht');
      await p.click('#ed-speichern');
    }
    await p.evaluate(() => fertigOeffnen());
    await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
    await p.evaluate(() => document.querySelectorAll('#dlg-fertig details').forEach((d) => { d.open = true; }));
    const text = await p.locator('#dlg-fertig').innerText();
    await expect(p.locator('#pr-warnungen li').first()).toBeVisible();        // Gegenprobe: die Empfehlung steht da
    expect(text.match(FACHWORT), 'Fachwort im Dialog').toBeNull();
    await p.click('#dlg-fertig .dlg-zu');
    await expect(p.locator('#raum-bau')).toBeVisible();                       // geschlossen: zurück in der Arbeitsfläche
    // Das Angehörigen-Blatt (für Fachleute) behält die Fachwörter im Dialog.
    await p.click('#marke-start');
    await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
    await p.click('#start-blatt');
    await p.click('#kopf-hilfe');                                             // das Blatt behält die Fachwörter in der Hilfe
    const hilfeFach = await p.locator('#dlg-hilfe').innerText();
    expect(hilfeFach).toContain('Trust-Authority'); expect(hilfeFach).toContain('FHIR'); expect(hilfeFach).toContain('Code-System');
    expect(hilfeFach.match(ZAHL_BEREICHE), 'Zahl von Bereichen in der Hilfe').toBeNull();
    await p.click('#dlg-hilfe .dlg-zu');
    await p.click('#blatt-fertig');
    await p.evaluate(() => document.querySelectorAll('#dlg-fertig details').forEach((d) => { d.open = true; }));
    await expect(p.locator('label[for="sd-rechtsraum"]')).toContainText('Rechtsraum');
    await expect(p.locator('label[for="pr-privkey"]')).toContainText('.vdkey');
    await ctx.close();
  });
});
