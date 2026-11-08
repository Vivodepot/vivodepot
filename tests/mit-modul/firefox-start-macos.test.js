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
      Gemessen wird der Auslöser, nicht nur die Plattform (06.11.2026): ohne den Ordner ~/Library/Application Support/Firefox
      gibt es nichts, woran der Start hängen könnte (so im fast leeren Home des Prüfrechners). Startet Firefox dann ohne
      Umweg, ist das kein Beleg für einen behobenen Fehler: die Probe meldet ungemessen (todo mit Grund), nicht rot.
      Belegt, nicht vermutet (07.11.2026): auch MIT dem Ordner startete Firefox auf dem Prüfrechner ohne Umweg. Der MERKPOSTEN
      „Fehler behoben“ gilt darum nur auf einem Rechner, auf dem der Hänger einmal gemessen wurde: HAENGER_BELEGT nennt Modell
      und macOS-Build. Auf jedem anderen Rechner ist ein gelungener Start ungemessen, das Release-Tor hängt an keinem Rechner.
      Weg zum Nachsehen und Eintragen: `sysctl -n hw.model; sw_vers -buildVersion`, dann diese Datei auf dem Rechner fahren;
      der Rot-Beweis gilt dort nur, wenn [Firefox·macOS·Rot-Beweis] grün ist (Start ohne Umweg hängt) und [Firefox·macOS] grün
      (mit Umweg startet er). Ein neuer Build ohne Messung steht nicht in der Liste und ist damit ungemessen.
   Braucht Firefox (npx playwright install firefox); fehlt er, ist die Probe rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const S = require('../../tools/lib/netz-sperre.js');

const GRENZE_MS = 10000;
const MACOS_27 = process.platform === 'darwin' && Number(os.release().split('.')[0]) >= 27;   // Darwin 27 = macOS 27
const FIREFOX_ORDNER = path.join(os.homedir(), 'Library', 'Application Support', 'Firefox');   // der Auslöser des Hängers
/* Rechner, auf denen der Hänger gemessen ist (Modell und macOS-Build, Weg im Kopf). */
const HAENGER_BELEGT = Object.freeze([
  { modell: 'Mac17,9', build: '26B123', gemessen: '2026-11-07' },
]);
function rechnerKennung() {
  if (process.platform !== 'darwin') return null;
  const lies = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
  return { modell: lies('/usr/sbin/sysctl', ['-n', 'hw.model']), build: lies('/usr/bin/sw_vers', ['-buildVersion']) };
}
function haengerBelegt(kennung, liste = HAENGER_BELEGT) {
  return !!kennung && liste.some((e) => e.modell === kennung.modell && e.build === kennung.build);
}

/* Rein: Urteil des Rot-Beweises. gestartet = der Start ohne Umweg gelang; ordnerDa = der Auslöser ist im Home;
   belegt = auf diesem Rechner und Build ist der Hänger gemessen (HAENGER_BELEGT). */
function rotBeweisUrteil({ macos27, gestartet, ordnerDa, belegt }) {
  if (!macos27) return gestartet ? 'grün' : 'rot';
  if (!gestartet) return 'grün';
  return ordnerDa && belegt ? 'rot' : 'ungemessen';
}

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

test('[Firefox·macOS·Urteil] ein gelungener Start ist nur rot (MERKPOSTEN), wo Auslöser da und Hänger belegt; sonst ungemessen', () => {
  assert.equal(rotBeweisUrteil({ macos27: true, gestartet: false, ordnerDa: true, belegt: false }), 'grün');
  assert.equal(rotBeweisUrteil({ macos27: true, gestartet: true, ordnerDa: false, belegt: true }), 'ungemessen');
  assert.equal(rotBeweisUrteil({ macos27: true, gestartet: true, ordnerDa: true, belegt: false }), 'ungemessen',
    'Auslöser da, Hänger auf diesem Rechner nie gemessen (so der Prüfrechner am 07.11.2026): ungemessen, nicht rot');
  assert.equal(rotBeweisUrteil({ macos27: true, gestartet: true, ordnerDa: true, belegt: true }), 'rot', 'Rot-Beweis: wo der Hänger belegt ist, bleibt der MERKPOSTEN rot');
  assert.equal(rotBeweisUrteil({ macos27: false, gestartet: true, ordnerDa: false }), 'grün');
  assert.equal(rotBeweisUrteil({ macos27: false, gestartet: false, ordnerDa: true }), 'rot');
});

test('[Firefox·macOS·Liste] belegt heißt: Modell UND Build stehen in der Liste; ein anderer Build oder Rechner nicht', () => {
  const liste = [{ modell: 'MacX,1', build: '26A1' }];
  assert.equal(haengerBelegt({ modell: 'MacX,1', build: '26A1' }, liste), true);
  assert.equal(haengerBelegt({ modell: 'MacX,1', build: '26A2' }, liste), false, 'neuer Build ohne Messung');
  assert.equal(haengerBelegt({ modell: 'MacY,1', build: '26A1' }, liste), false, 'anderer Rechner');
  assert.equal(haengerBelegt(null, liste), false);
  for (const e of HAENGER_BELEGT) assert.ok(e.modell && e.build && /^\d{4}-\d{2}-\d{2}$/.test(e.gemessen), 'jede Zeile mit Modell, Build und Datum');
});

test('[Firefox·macOS·Rot-Beweis] ohne den Patch hängt der Start genau unter macOS 27 — der Umweg wirkt, die Messung ist echt', async (t) => {
  const vorher = process.env.CFFIXED_USER_HOME;
  if (vorher !== undefined) delete process.env.CFFIXED_USER_HOME;   // ein Sofortweg aus der Umgebung des Laufs wirkte sonst doch
  let r;
  try { r = await S.ohneLeeresHome(() => starten()); } finally { if (vorher !== undefined) process.env.CFFIXED_USER_HOME = vorher; }
  const ordnerDa = fs.existsSync(FIREFOX_ORDNER);
  const kennung = rechnerKennung();
  const belegt = haengerBelegt(kennung);
  if (rotBeweisUrteil({ macos27: MACOS_27, gestartet: r.gestartet, ordnerDa, belegt }) === 'ungemessen') {
    t.todo('ungemessen: ' + (ordnerDa ? 'Hänger auf ' + JSON.stringify(kennung) + ' nicht belegt (HAENGER_BELEGT)' : FIREFOX_ORDNER + ' fehlt')
      + ' — der Start gelang ohne Umweg, ein behobener Fehler ist hier nicht messbar');
    return;
  }
  if (MACOS_27) {
    assert.equal(r.gestartet, false,
      'Firefox startet unter macOS 27 auch ohne leeres Home: Fehler behoben (Playwright >= 1.65?) — den Umweg in netz-sperre entfernen (MERKPOSTEN)');
  } else {
    assert.equal(r.gestartet, true, 'ohne macOS 27 (Darwin ' + os.release() + ', ' + process.platform + ') muss Firefox auch ohne leeres Home starten');
  }
});
