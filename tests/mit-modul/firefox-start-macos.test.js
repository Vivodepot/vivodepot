'use strict';
/* Firefox startet über mitSperre auch unter macOS 27 (21.10.2026): tools/lib/netz-sperre.js.
   Seit macOS 27 hängt Playwrights Firefox beim Start, weil er profiles.ini im geschützten ~/Library/Application Support/Firefox
   liest (Playwright-Fehler #42768). mitSperre patcht auf darwin firefox.launch/launchPersistentContext: nur der Firefox-Start
   bekommt CFFIXED_USER_HOME auf ein leeres Verzeichnis in seiner env.
   1. Regel: die env des Firefox-Starts trägt das leere Home, eine eigene env bleibt, ein gesetztes Home bleibt; Chromium und
      andere Plattformen bleiben unberührt; ein zweiter Patch greift nicht.
   2. Eng: nach mitSperre und einem Firefox-Start ist process.env unverändert, und ein Kindprozess sieht keine Variable.
   3. Firefox über mitSperre startet in höchstens 10 s und lädt eine Seite.
   4. Rot-Beweis: derselbe Start ohne den Patch hängt unter macOS 27 über 10 s. Startet er doch, ist der Fehler behoben
      (Playwright >= 1.65): dann den Umweg in netz-sperre entfernen, MERKPOSTEN dort. Auf anderen Plattformen und vor macOS 27
      gibt es den Fehler nicht: dort muss derselbe Start gelingen, sonst hängt Firefox aus anderem Grund.
   Braucht Firefox (npx playwright install firefox); fehlt er, ist die Probe rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const S = require('../../tools/lib/netz-sperre.js');

const GRENZE_MS = 10000;
const MACOS_27 = process.platform === 'darwin' && Number(os.release().split('.')[0]) >= 27;   // Darwin 27 = macOS 27

async function starten() {
  const { firefox } = require('playwright');
  const anfang = Date.now();
  let browser;
  try {
    browser = await firefox.launch(S.mitSperre({ headless: true, timeout: GRENZE_MS }));
    const page = await browser.newPage();
    await page.setContent('<p>da</p>');
    return { gestartet: (await page.textContent('p')) === 'da', ms: Date.now() - anfang };
  } catch (e) {
    if (!/Timeout/.test(e.message)) throw e;
    return { gestartet: false, ms: Date.now() - anfang };
  } finally { if (browser) await browser.close(); }
}

/* Eine Attrappe von BrowserType: merkt sich die Argumente. */
function attrappe() {
  const aufrufe = [];
  const proto = {
    launch(...a) { aufrufe.push([this.name(), a]); return 'b'; },
    launchPersistentContext(...a) { aufrufe.push([this.name(), a]); return 'k'; },
  };
  const typ = (n) => Object.assign(Object.create(proto), { name: () => n });
  return { proto, aufrufe, firefox: typ('firefox'), chromium: typ('chromium') };
}

test('[Firefox·macOS·Regel] nur der Firefox-Start bekommt das leere Home; eigene env und gesetztes Home bleiben', () => {
  const l = S.argumenteMitHome('launch', [], '/leer', { PATH: '/bin' });
  assert.deepEqual(l[0].env, { PATH: '/bin', CFFIXED_USER_HOME: '/leer' });
  const p = S.argumenteMitHome('launchPersistentContext', ['/profil', { headless: true, env: { A: '1' } }], '/leer');
  assert.equal(p[0], '/profil');
  assert.deepEqual(p[1], { headless: true, env: { A: '1', CFFIXED_USER_HOME: '/leer' } });
  assert.equal(S.argumenteMitHome('launch', [{ env: { CFFIXED_USER_HOME: '/anders' } }], '/leer')[0].env.CFFIXED_USER_HOME, '/anders');

  const a = attrappe();
  assert.equal(S.firefoxPatchen(a.proto, { plattform: 'darwin', verzeichnis: () => '/leer' }), true);
  a.firefox.launch(S.mitSperre({ headless: true }));
  a.chromium.launch(S.mitSperre({ headless: true }));
  a.firefox.launchPersistentContext('/profil', S.mitSperre({}));
  assert.equal(a.aufrufe[0][1][0].env.CFFIXED_USER_HOME, '/leer');
  assert.equal(a.aufrufe[1][1][0].env, undefined, 'Chromium bleibt unberührt');
  assert.equal(a.aufrufe[2][1][1].env.CFFIXED_USER_HOME, '/leer');
  S.ohneLeeresHome(() => a.firefox.launch(S.mitSperre({})));
  assert.equal(a.aufrufe[3][1][0].env, undefined, 'ohneLeeresHome startet ohne Patch');
  assert.equal(S.firefoxPatchen(a.proto, { plattform: 'darwin' }), false, 'ein zweiter Patch greift nicht');
  const linux = attrappe();
  assert.equal(S.firefoxPatchen(linux.proto, { plattform: 'linux' }), false, 'auf anderen Plattformen kein Patch');
});

test('[Firefox·macOS·eng] nach mitSperre und einem Firefox-Start: process.env unverändert, ein Kind sieht keine Variable', async () => {
  const vorher = process.env.CFFIXED_USER_HOME;
  await starten();
  assert.equal(process.env.CFFIXED_USER_HOME, vorher, 'process.env bleibt unberührt');
  const kind = spawnSync('/bin/sh', ['-c', 'printf %s "$CFFIXED_USER_HOME"'], { encoding: 'utf8' });
  assert.equal(kind.stdout, vorher || '', 'ein Kindprozess sieht nur, was schon vorher in der Umgebung stand');
});

test('[Firefox·macOS] Firefox über mitSperre startet in höchstens 10 s', async () => {
  const r = await starten();
  assert.ok(r.gestartet, `Firefox über mitSperre startete nicht in ${GRENZE_MS} ms`);
  assert.ok(r.ms <= GRENZE_MS, `Start dauerte ${r.ms} ms`);
});

test('[Firefox·macOS·Rot-Beweis] ohne den Patch hängt der Start genau unter macOS 27 — der Umweg wirkt, die Messung ist echt', async () => {
  const vorher = process.env.CFFIXED_USER_HOME;
  if (vorher !== undefined) delete process.env.CFFIXED_USER_HOME;   // ein Sofortweg aus der Umgebung des Laufs wirkte sonst doch
  let r;
  try { r = await S.ohneLeeresHome(() => starten()); } finally { if (vorher !== undefined) process.env.CFFIXED_USER_HOME = vorher; }
  if (MACOS_27) {
    assert.equal(r.gestartet, false,
      'Firefox startet unter macOS 27 auch ohne leeres Home: Fehler behoben (Playwright >= 1.65?) — den Umweg in netz-sperre entfernen (MERKPOSTEN)');
  } else {
    assert.equal(r.gestartet, true, 'ohne macOS 27 (Darwin ' + os.release() + ', ' + process.platform + ') muss Firefox auch ohne leeres Home starten');
  }
});
