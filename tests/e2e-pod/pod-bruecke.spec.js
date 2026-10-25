'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Pod-Brücke, Stufe 1, gegen einen lokalen Community Solid Server (U2-ADR-512)
   ────────────────────────────────────────────────────────────────────────
   Läuft nur, wenn VD_POD_CSS auf ein Verzeichnis mit installiertem @solid/community-server zeigt; sonst übersprungen. Der
   Server liegt auf einem Unix-Socket in einem Wegwerf-Verzeichnis; davor leitet ein kleiner Weiterleiter nur auf 127.0.0.1
   weiter, weil der CSS seinen Port an alle Schnittstellen bindet. Die Brücke wird von einer zweiten Herkunft auf 127.0.0.1
   ausgeliefert. Der Pod spricht https mit einem Wegwerf-Testzertifikat für localhost; die CSP der Seiten bleibt unverändert.
   Zwei Wegwerf-Konten, je Lauf neu erzeugt (KONTEN unten).

   WAS DIESE STRECKE HÄLT
     1. Anmeldung mit eigenem Client; danach steht weder in localStorage noch in sessionStorage etwas, kein Token in der
        IndexedDB; der DPoP-Schlüssel ist nicht exportierbar.
     2. Ziel bestätigen: nach der Anmeldung geht keine Schreibanfrage an den Pod, bevor die Person den Speicher bestätigt.
     3. Kein Erneuerungs-Token: nach Ablauf des Zugangs-Tokens verlangt die Brücke die neue Anmeldung, ohne Anfrage an den
        Aussteller.
     4. Eigene Sicherung: ablegen, abholen, byte-gleich; ohne Anmeldung nicht lesbar.
     5. Freigabe-Link (SHL): ohne Anmeldung lesbar, ihr Container nicht (Rot-Beweis: mit geerbter öffentlicher Regel steht der
        Pfad in der Auflistung); mit dem Schlüssel aus dem Link entschlüsselt, und share/empfangen.html holt sie über https ab.
     6. Für eine Stelle: nur deren WebID liest, ohne Anmeldung nicht; der Access Grant (LWS) liegt daneben.
     7. Rücknahme und Ablauf: danach ist die Ressource weg; der Ablauf greift nach neuer Anmeldung und Bestätigung.
     8. Die Tür: Klartext wird abgewiesen, und es geht keine Schreibanfrage an den Pod.
     9. Abmelden löscht alles lokal; alle Anfragen gehen nur an die beiden lokalen Herkünfte.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const CSS = process.env.VD_POD_CSS;
const W = path.join(__dirname, '..', '..');   // Repo-Wurzel (share/, pod/)
// Zwei Wegwerf-Konten je Lauf, Passwörter frisch gezogen: nichts davon steht im Repo, der Server lebt nur in diesem Lauf.
const KONTEN = ['person', 'stelle'].map((name) => ({ email: name + '@pod-spike.test', password: crypto.randomBytes(18).toString('base64url'), pods: [{ name }] }));
test.skip(!CSS, 'VD_POD_CSS nicht gesetzt: Strecke gegen lokalen Pod übersprungen');
test.describe.configure({ mode: 'serial', timeout: 90000 });

let tmp, css, proxy, statik, POD, BR;
const b64u = (b) => Buffer.from(b).toString('base64url');

function warten(url, ms) {
  const bis = Date.now() + ms; let zuletzt = 'keine Antwort';
  return new Promise((ja, nein) => {
    (function versuch() {
      const nochmal = () => (Date.now() > bis ? nein(new Error('CSS kam nicht hoch, zuletzt: ' + zuletzt)) : setTimeout(versuch, 300));
      // Erst eine 200 zählt: der Weiterleiter antwortet mit 502, solange der Socket des CSS noch nicht lauscht.
      https.get(url, { rejectUnauthorized: false }, (r) => { r.resume(); zuletzt = String(r.statusCode); if (r.statusCode === 200) ja(); else nochmal(); })
        .on('error', (e) => { zuletzt = e.message; nochmal(); });
    })();
  });
}

test.beforeAll(async () => {
  test.setTimeout(180000);
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pod-e2e-'));
  const sock = path.join(tmp, 'css.sock');
  fs.writeFileSync(path.join(tmp, 'seed.json'), JSON.stringify(KONTEN));
  // Wegwerf-Testzertifikat nur für localhost, im Wegwerf-Verzeichnis; afterAll löscht es mit. Kein echter Schlüssel.
  // RSA statt EC: das LibreSSL von macOS schreibt EC-Schlüssel mit expliziten Kurvenparametern, Chromium bricht dann ab
  // (ERR_SSL_PROTOCOL_ERROR, gemessen 15.10.2026).
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-keyout', path.join(tmp, 'tls.key'), '-out', path.join(tmp, 'tls.crt')], { stdio: 'ignore' });
  proxy = https.createServer({ key: fs.readFileSync(path.join(tmp, 'tls.key')), cert: fs.readFileSync(path.join(tmp, 'tls.crt')) }, (q, a) => {
    // Der CSS sieht hinter dem Weiterleiter nur den Socket; die Kopfzeilen sagen ihm, dass außen https war.
    const kopf = Object.assign({}, q.headers, { 'x-forwarded-proto': 'https', 'x-forwarded-host': q.headers.host,
      forwarded: 'proto=https;host=' + q.headers.host });
    const v = http.request({ socketPath: sock, path: q.url, method: q.method, headers: kopf }, (r) => { a.writeHead(r.statusCode, r.headers); r.pipe(a); });
    v.on('error', () => { a.writeHead(502); a.end(); });
    q.pipe(v);
  });
  await new Promise((ja) => proxy.listen(0, '127.0.0.1', ja));
  // localhost, nicht 127.0.0.1: der CSS nimmt eine WebID über http nur unter localhost an. Gelauscht wird nur auf 127.0.0.1.
  POD = 'https://localhost:' + proxy.address().port + '/';
  css = spawn(process.execPath, [path.join(CSS, 'node_modules/@solid/community-server/bin/server.js'),
    '-c', '@css:config/file.json', '-f', path.join(tmp, 'daten'), '--socket', sock, '-b', POD,
    '--seedConfig', path.join(tmp, 'seed.json'), '-l', 'warn'], { cwd: CSS, stdio: ['ignore', 'inherit', 'inherit'],
    // Der CSS liest WebIDs über https bei sich selbst; er vertraut dafür dem Wegwerf-Zertifikat, sonst nichts geändert.
    env: Object.assign({}, process.env, { NODE_EXTRA_CA_CERTS: path.join(tmp, 'tls.crt') }) });
  css.on('exit', (code) => { if (code) console.log('[pod-e2e] CSS beendet mit', code); });
  await warten(POD + '.well-known/openid-configuration', 60000);

  const ausliefern = (q, a) => {
    const u = new URL(q.url, 'http://x');
    const basis = W;
    const datei = path.normalize(path.join(basis, decodeURIComponent(u.pathname)));
    if (!/^\/(pod|share)\//.test(u.pathname) || !datei.startsWith(basis) || !fs.existsSync(datei)) { a.writeHead(404); a.end(); return; }
    let inhalt = fs.readFileSync(datei);
    const typ = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(datei)] || 'application/octet-stream';
    a.writeHead(200, { 'Content-Type': typ, 'Cache-Control': 'no-store' }); a.end(inhalt);
  };
  statik = http.createServer(ausliefern);
  await new Promise((ja) => statik.listen(0, '127.0.0.1', ja));
  BR = 'http://127.0.0.1:' + statik.address().port + '/pod/bruecke.html';
});

test.afterAll(async () => {
  if (css) css.kill('SIGTERM');
  if (proxy) proxy.close();
  if (statik) statik.close();
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

const fremde = [];
function anfragenZaehlen(page) {
  // Diagnose im Protokoll: gescheiterte Anfragen und Konsolenfehler (CSP, CORS) mit Adresse und Grund.
  page.on('requestfailed', (r) => console.log('[pod-e2e] gescheitert', r.method(), r.url(), r.failure() && r.failure().errorText));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[pod-e2e] konsole', m.text().slice(0, 300)); });
  page.on('request', (r) => { const o = new URL(r.url()).origin; if (o !== new URL(POD).origin && o !== new URL(BR).origin) fremde.push(r.url()); });
}

const schreibend = (r) => r.method() !== 'GET' && r.method() !== 'HEAD' && r.url().startsWith(POD) && !/\/\.(oidc|account)\//.test(r.url());
async function anmelden(page, konto, o = {}) {
  if (!o.wieder) anfragenZaehlen(page);
  // Nur für den Haken der Ablauf-Probe (_probe); der Pod läuft über https, der http-Teil des Schalters wird nicht gebraucht.
  if (!o.wieder) await page.addInitScript(() => { self.VD_POD_SPIKE = true; });
  await page.goto(BR);
  await page.fill('#aussteller', POD);
  await page.click('#anmelden');
  await page.waitForURL((u) => u.origin === new URL(POD).origin, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  // Beim Wieder-Anmelden hält der Pod das Konto noch per Cookie: er zeigt gleich die Zustimmung, kein Passwortformular.
  if (!(o.wieder && await page.locator('#authorize').count())) {
    if (!(await page.locator('#password').count())) await page.locator('a[href$="/.account/login/password/"]').first().click();
    await page.locator('#password').waitFor({ timeout: 15000 });
    await page.fill('#email', konto.email);
    await page.fill('#password', konto.password);
    await page.locator('button[name="submit"]').click();
  }
  await page.locator('#authorize:not([disabled])').click({ timeout: 20000 });
  await page.waitForURL((u) => u.href.startsWith(BR), { timeout: 20000 });
  await expect(page.locator('#wer')).toContainText('Angemeldet als ', { timeout: 20000 });
  await expect(page.locator('#ziel')).toBeVisible({ timeout: 20000 });
  if (o.bestaetigen !== false) { await page.click('#ziel-ja'); await expect(page.locator('#ablage-bereich')).toBeVisible(); }
  return (await page.locator('#wer').textContent()).replace('Angemeldet als ', '').trim();
}

function idb(page, schluessel) {
  return page.evaluate((k) => self.vdPodAnmeldung._ablage.lesen(k), schluessel);
}

async function dateiAblegen(page, inhalt, art, extra) {
  await page.selectOption('#art', art);
  if (extra && extra.stelle) await page.fill('#stelle', extra.stelle);
  if (art === 'stelle') { await page.fill('#zweck', (extra && extra.zweck) || ''); await page.fill('#inbox', (extra && extra.inbox) || ''); }
  await page.fill('#tage', extra && extra.tage ? String(extra.tage) : '');
  await page.setInputFiles('#datei', { name: 'x.vivodepot', mimeType: 'application/octet-stream', buffer: Buffer.from(inhalt) });
  await page.click('#ablegen');
  await expect(page.locator('#ergebnis')).toHaveText(/^http/, { timeout: 15000 });
  return page.locator('#ergebnis').textContent();
}

const DEPOT = 'VIVODEPOT\u0001' + JSON.stringify({ kryptoVersion: 3, depotUUID: 'spike', pbkdf2: { salt: 'c2FsdA' }, depotSalt: 'ZA', iv: 'aXY', ct: crypto.randomBytes(64).toString('base64') }, null, 2);
function shlJwe(klartext) {
  const key = crypto.randomBytes(32); const iv = crypto.randomBytes(12);
  const kopf = b64u(JSON.stringify({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }));
  const c = crypto.createCipheriv('aes-256-gcm', key, iv); c.setAAD(Buffer.from(kopf));
  const ct = Buffer.concat([c.update(klartext), c.final()]);
  return { jwe: [kopf, '', b64u(iv), b64u(ct), b64u(c.getAuthTag())].join('.'), key: b64u(key) };
}

/* Eine Stelle bekommt nur eine Antwort-JWE oder eine Depot-Datei, nie einen Freigabe-Link (Tür der Brücke, je Art genau die
   erwartete Form). Hier die Form der Antwort des Kerns: ECDH-ES direkt, verschlüsselter Schlüssel leer, epk aus einem frischen
   P-256-Paar. Die Brücke entschlüsselt nicht; die Probe prüft Ablage, Zugriff und Abholung byte-gleich. */
function antwortJwe(klartext) {
  const { publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const { kty, crv, x, y } = publicKey.export({ format: 'jwk' });
  const kopf = b64u(JSON.stringify({ alg: 'ECDH-ES', enc: 'A256GCM', cty: 'application/json', epk: { kty, crv, x, y } }));
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', crypto.randomBytes(32), iv); c.setAAD(Buffer.from(kopf));
  const ct = Buffer.concat([c.update(klartext), c.final()]);
  return { jwe: [kopf, '', b64u(iv), b64u(ct), b64u(c.getAuthTag())].join('.') };
}

let person, ernaWebid;

test('[Pod·Anmeldung] eigener Client: angemeldet, nichts in Web Storage, kein Token in der IndexedDB, DPoP-Schlüssel nicht exportierbar', async ({ browser }) => {
  const ctx = await browser.newContext(); person = await ctx.newPage();
  let tokenAntwort = null;
  person.on('response', async (r) => { if (r.request().method() === 'POST' && /\/\.oidc\/token/.test(r.url())) tokenAntwort = await r.json().catch(() => null); });
  const schreib = []; person.on('request', (r) => { if (schreibend(r)) schreib.push(r.method() + ' ' + r.url()); });
  ernaWebid = await anmelden(person, KONTEN[0], { bestaetigen: false });
  expect(ernaWebid).toMatch(/^https:\/\/localhost:\d+\/person\/profile\/card#me$/);
  // Ziel bestätigen: vor dem Klick keine Schreibanfrage, der Ablagebereich zu, der Speicher aus dem Profil gezeigt
  await person.waitForTimeout(1500);
  expect(schreib, 'vor der Bestätigung').toEqual([]);
  await expect(person.locator('#ablage-bereich')).toBeHidden();
  await expect(person.locator('#ziel-adresse')).toHaveText(/\/vivodepot\/$/);
  await person.click('#ziel-ja');
  await expect(person.locator('#ablage-bereich')).toBeVisible();
  expect(await person.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  const extr = await person.evaluate(async () => {
    const p = await self.vdPodAnmeldung._ablage.lesen('dpop');
    let exportiert = true; try { await crypto.subtle.exportKey('jwk', p.privateKey); } catch (_) { exportiert = false; }
    return { extractable: p.privateKey.extractable, exportiert };
  });
  expect(extr).toEqual({ extractable: false, exportiert: false });
  // Kein Token in der IndexedDB, auch nicht eines, das der Aussteller ungefragt mitschickt (gemessen wird, ob er das tut).
  console.log('[pod-e2e] Token-Antwort enthält refresh_token:', !!(tokenAntwort && tokenAntwort.refresh_token));
  const abgelegt = await person.evaluate(async () => {
    const A = self.vdPodAnmeldung._ablage; const aus = {};
    for (const k of ['client', 'sitzung', 'pkce', 'verzeichnis']) aus[k] = await A.lesen(k);
    return JSON.stringify(aus);
  });
  expect(tokenAntwort && tokenAntwort.access_token).toBeTruthy();
  expect(abgelegt).not.toContain(tokenAntwort.access_token);
  if (tokenAntwort.refresh_token) expect(abgelegt).not.toContain(tokenAntwort.refresh_token);
  expect(JSON.parse(abgelegt).sitzung).toBeUndefined();
});

test('[Pod·Sicherung] eigene Sicherung: abgelegt, byte-gleich abgeholt, ohne Anmeldung nicht lesbar', async ({ request }) => {
  const adresse = await dateiAblegen(person, DEPOT, 'eigen');
  expect(adresse).toMatch(/\/vivodepot\/sicherungen\/[A-Za-z0-9_-]{22}$/);
  const zurueck = await person.evaluate((a) => self.vdPodBruecke.abholen(a), adresse);
  expect(zurueck).toBe(DEPOT);
  expect((await request.get(adresse)).status()).toBeGreaterThanOrEqual(401);
  expect((await request.get(adresse)).status()).toBeLessThanOrEqual(403);
});

test('[Pod·Link] Freigabe-Link: Ressource öffentlich, Container nicht; entschlüsselt mit dem Schlüssel aus dem Link und über die Abholseite', async ({ request, browser }) => {
  const klar = JSON.stringify({ resourceType: 'Bundle', id: 'spike', type: 'document' });
  const { jwe, key } = shlJwe(klar);
  const adresse = await dateiAblegen(person, jwe, 'link', { tage: 7 });
  expect(adresse).toMatch(/\/vivodepot\/links\/[A-Za-z0-9_-]{22}$/);
  const offen = await request.get(adresse + '?recipient=Spike');
  expect(offen.status()).toBe(200);
  expect(await offen.text()).toBe(jwe);
  const ordner = adresse.replace(/[^/]+$/, '');
  const liste = await request.get(ordner);
  expect([401, 403], 'der Container ist ohne Anmeldung nicht lesbar').toContain(liste.status());

  const teile = (await offen.text()).split('.');
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'base64url'), Buffer.from(teile[2], 'base64url'));
  d.setAAD(Buffer.from(teile[0])); d.setAuthTag(Buffer.from(teile[4], 'base64url'));
  expect(Buffer.concat([d.update(Buffer.from(teile[3], 'base64url')), d.final()]).toString('utf8')).toBe(klar);
  // Die Abholseite share/empfangen.html (unverändert, nur https) holt die Freigabe aus dem Pod und entschlüsselt sie.
  const shlink = 'shlink:/' + b64u(JSON.stringify({ url: adresse, key, flag: 'U', label: 'Spike', exp: Math.floor(Date.now() / 1000) + 3600 }));
  const ctx = await browser.newContext(); const p = await ctx.newPage(); anfragenZaehlen(p);
  await p.goto(BR.replace('/pod/bruecke.html', '/share/empfangen.html'));
  await p.fill('#link-eingabe', shlink); await p.click('#pruefen-knopf'); await p.click('#abrufen-knopf');
  await expect(p.locator('#abgeholt')).toBeVisible({ timeout: 15000 });
  await ctx.close();
});

test('[Pod·Link·Rot-Beweis] erbt der Container eine öffentliche Regel, steht der unrätbare Pfad in der Auflistung', async ({ request }) => {
  const { jwe } = shlJwe('{}');
  const adresse = await dateiAblegen(person, jwe, 'link');
  const ordner = adresse.replace(/[^/]+$/, '');
  const r = await person.evaluate(async ({ ordner, webid }) => {
    const acl = '@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n' +
      '<#e> a acl:Authorization; acl:agent <' + webid + '>; acl:accessTo <' + ordner + '>; acl:default <' + ordner + '>; acl:mode acl:Read, acl:Write, acl:Control.\n' +
      '<#o> a acl:Authorization; acl:agentClass foaf:Agent; acl:accessTo <' + ordner + '>; acl:default <' + ordner + '>; acl:mode acl:Read.\n';
    return (await self.vdPodAnmeldung.podFetch(ordner + '.acl', { method: 'PUT', headers: { 'Content-Type': 'text/turtle' }, body: acl })).status;
  }, { ordner, webid: ernaWebid });
  expect(r).toBeLessThan(300);
  const liste = await request.get(ordner, { headers: { Accept: 'text/turtle' } });
  expect(liste.status()).toBe(200);
  expect(await liste.text()).toContain(adresse.split('/').pop());
  // zurück auf den Zustand der Brücke: beim nächsten Ablegen setzt sie den Container wieder auf die Person allein
  await dateiAblegen(person, shlJwe('{}').jwe, 'link');
  expect([401, 403]).toContain((await request.get(ordner)).status());
});

test('[Pod·Stelle] Freigabe an eine Stelle: nur deren WebID liest, ohne Anmeldung niemand', async ({ browser, request }) => {
  const ctx = await browser.newContext(); const stelle = await ctx.newPage();
  const stelleWebid = await anmelden(stelle, KONTEN[1]);
  const { jwe } = antwortJwe('{"x":1}');
  const adresse = await dateiAblegen(person, jwe, 'stelle', { stelle: stelleWebid, tage: 30 });
  expect([401, 403]).toContain((await request.get(adresse)).status());
  expect(await stelle.evaluate((a) => self.vdPodBruecke.abholen(a), adresse)).toBe(jwe);
  await ctx.close();
});

test('[Pod·Grant] Freigabe an eine Stelle legt einen Access Grant ab, benachrichtigt ihren Posteingang ohne Schlüssel; Rücknahme löscht ihn', async ({ browser, request }) => {
  const ctx = await browser.newContext(); const stelle = await ctx.newPage();
  const stelleWebid = await anmelden(stelle, KONTEN[1]);
  // Posteingang der Stelle in ihrem eigenen Pod: jeder darf anhängen, nur sie lesen (wie ein LDN-Posteingang).
  const inbox = await stelle.evaluate(async (webid) => {
    const A = self.vdPodAnmeldung; const s = await A.sitzung(); const ziel = s.speicher + '/stelle/eingang/';
    await A.podFetch(ziel, { method: 'PUT', headers: { 'Content-Type': 'text/turtle' } });
    const acl = '@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n' +
      '<#s> a acl:Authorization; acl:agent <' + webid + '>; acl:accessTo <' + ziel + '>; acl:default <' + ziel + '>; acl:mode acl:Read, acl:Write, acl:Control.\n' +
      '<#a> a acl:Authorization; acl:agentClass foaf:Agent; acl:accessTo <' + ziel + '>; acl:mode acl:Append.\n';
    await A.podFetch(ziel + '.acl', { method: 'PUT', headers: { 'Content-Type': 'text/turtle' }, body: acl });
    return ziel;
  }, stelleWebid);
  const { jwe } = antwortJwe('{"g":1}');
  const zweck = 'https://w3id.org/dpv#ServiceProvision';
  const adresse = await dateiAblegen(person, jwe, 'stelle', { stelle: stelleWebid, tage: 30, zweck, inbox });
  const eintrag = (await idb(person, 'verzeichnis')).filter((e) => e.adresse === adresse)[0];
  expect(eintrag.ueberDienst, 'CSS 7.2.0 hat keinen AccessGrantService').toBe(false);
  expect(eintrag.grant).toMatch(/\/vivodepot\/grants\/[A-Za-z0-9_-]{22}\.json$/);
  expect(eintrag.benachrichtigt).toBe(true);
  expect([401, 403]).toContain((await request.get(eintrag.grant)).status());
  const grant = JSON.parse(await person.evaluate((a) => self.vdPodAnmeldung.podFetch(a).then((r) => r.text()), eintrag.grant));
  expect(await person.evaluate((g) => self.vdPodLws.pruefen(g, 'AccessGrant'), grant)).toEqual([]);
  expect(grant.access[0]).toMatchObject({ assignee: stelleWebid, action: ['read'], target: { type: 'DataResource', value: adresse } });
  expect(grant.access[0].constraint[0]).toEqual({ leftOperand: 'purpose', operator: 'eq', rightOperand: zweck });
  // Im Posteingang der Stelle: genau dieser Grant, und kein Schlüssel.
  const post = await stelle.evaluate(async (inbox) => {
    const A = self.vdPodAnmeldung; const liste = await (await A.podFetch(inbox, { headers: { Accept: 'text/turtle' } })).text();
    const m = [...liste.matchAll(/<([^>]+)>/g)].map((x) => new URL(x[1], inbox).href).filter((u) => u.startsWith(inbox) && u !== inbox);
    return Promise.all([...new Set(m)].map((u) => A.podFetch(u).then((r) => r.text())));
  }, inbox);
  expect(post.length).toBe(1);
  expect(JSON.parse(post[0]).access[0].target.value).toBe(adresse);
  expect(post[0]).not.toMatch(/"(key|k|passwor[dt]|passcode|secret)"/i);
  expect(post[0]).not.toContain(jwe.split('.')[3]);
  await person.evaluate((a) => self.vdPodBruecke.zuruecknehmen(a), adresse);
  for (const z of [adresse, eintrag.grant]) expect(await person.evaluate((a) => self.vdPodAnmeldung.podFetch(a).then((r) => r.status), z)).toBe(404);
  await ctx.close();
});

test('[Pod·Rücknahme] Zurücknehmen und Ablauf löschen die Ressource im Pod', async () => {
  const a1 = await dateiAblegen(person, shlJwe('{}').jwe, 'link');
  await person.evaluate((a) => self.vdPodBruecke.zuruecknehmen(a), a1);
  expect(await person.evaluate((a) => self.vdPodAnmeldung.podFetch(a).then((r) => r.status), a1)).toBe(404);
  const a2 = await dateiAblegen(person, shlJwe('{}').jwe, 'link', { tage: 1 });
  await person.evaluate(async (a) => {
    const v = await self.vdPodAnmeldung._ablage.lesen('verzeichnis');
    v.forEach((e) => { if (e.adresse === a) e.bis = Date.now() - 1000; });
    await self.vdPodAnmeldung._ablage.schreiben('verzeichnis', v);
  }, a2);
  // Die Sitzung endet mit der Seite (kein Erneuerungs-Token). Nach dem Neuladen: neu anmelden, Ziel bestätigen, dann greift
  // der Ablauf.
  await person.reload();
  await expect(person.locator('#wer')).toHaveText('Nicht angemeldet');
  await anmelden(person, KONTEN[0], { wieder: true });
  await expect.poll(() => person.evaluate((a) => self.vdPodAnmeldung.podFetch(a).then((r) => r.status), a2)).toBe(404);
});

test('[Pod·Tür·Rot-Beweis] Klartext wird abgewiesen, und keine Schreibanfrage geht an den Pod', async () => {
  const schreib = [];
  person.on('request', (r) => { if (r.method() === 'PUT' && r.url().startsWith(POD)) schreib.push(r.url()); });
  await person.selectOption('#art', 'eigen');
  await person.setInputFiles('#datei', { name: 'klar.txt', mimeType: 'text/plain', buffer: Buffer.from('Name: Erna Beispiel') });
  await person.click('#ablegen');
  await expect(person.locator('#fehler')).toContainText('nicht-chiffrat');
  expect(schreib).toEqual([]);
});

test('[Pod·Herkunft·Rot-Beweis] das Token geht nicht an eine fremde Herkunft, und es geht keine Anfrage hinaus', async () => {
  const hinaus = [];
  person.on('request', (r) => { if (r.url().startsWith('http://127.0.0.2')) hinaus.push(r.url()); });
  const fehler = await person.evaluate(() => self.vdPodAnmeldung.podFetch('http://127.0.0.2:9/x').then(() => 'durch', (e) => e.message));
  expect(fehler).toBe('fremde-herkunft');
  const https = await person.evaluate(() => self.vdPodAnmeldung.podFetch('https://pod.example/x').then(() => 'durch', (e) => e.message));
  expect(https).toBe('fremde-herkunft');
  expect(hinaus).toEqual([]);
});

test('[Pod·K2] ohne Erneuerungs-Token: nach Ablauf verlangt die Brücke die neue Anmeldung, ohne den Aussteller zu fragen', async ({ browser }) => {
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await anmelden(p, KONTEN[0]);
  let posts = 0; p.on('request', (r) => { if (r.method() === 'POST' && /\/\.oidc\/token/.test(r.url())) posts++; });
  const f = await p.evaluate(async () => {
    const A = self.vdPodAnmeldung; const s = await A.sitzung();
    A._probe.zugangAblaufen();
    return A.podFetch(s.speicher + '/person/', { method: 'HEAD' }).then((r) => 'durch:' + r.status, (e) => e.message);
  });
  expect(f).toBe('neu-anmelden');
  expect(posts, 'keine Anfrage an den Token-Endpunkt').toBe(0);
  await ctx.close();
});

test('[Pod·Abmelden] Abmelden löscht Schlüssel, Registrierung und Sitzung; Web Storage bleibt leer', async () => {
  await person.click('#abmelden');
  await expect(person.locator('#wer')).toHaveText('Nicht angemeldet');
  expect(await person.evaluate(() => document.body.dataset.abmeldung)).toBe('lokal-geloescht');
  const rest = await person.evaluate(async () => {
    const A = self.vdPodAnmeldung;
    return { dpop: !!(await A._ablage.lesen('dpop')), sitzung: !!(await A.sitzung()), client: !!(await A._ablage.lesen('client')), ws: localStorage.length + sessionStorage.length };
  });
  expect(rest).toEqual({ dpop: false, sitzung: false, client: false, ws: 0 });
});

test('[Pod·Netz] alle Anfragen gingen nur an den lokalen Pod und die Brücke', async () => {
  expect(fremde).toEqual([]);
});
