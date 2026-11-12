'use strict';
/* ═══════════════════════════════════════════════════════════
   SHL-Empfang im Kern (02.11.2026, Nachtrag zu U2-ADR-183)
   ───────────────────────────────────────────────────────────
   Ein fremder Freigabe-Link wird im Kern eingelesen. Der Kern hält den Schlüssel; die Abhol-Seite holt nur das Chiffrat.
   Gehalten wird:
   1. shlLinkLesen: lokal, ohne Netz; url geprüft wie beim Erzeugen; Schlüssel genau 32 Bytes; kein Passcode-Flag; Ablauf.
   2. shlJweOeffnen streng: fünf Abschnitte, alg dir / enc A256GCM, kein zip, IV 12, Tag 16, Schlüssel 32; der Kopf ist die
      AAD; falscher Schlüssel und veränderter Kopf fallen.
   3. shlHolen: fester Ort; vor „bereit“ geht nichts hinaus; der Auftrag trägt url und flag, nie den Schlüssel, und geht nur an
      SHL_ABHOL_HERKUNFT; angenommen wird nur aus genau dem geöffneten Fenster mit genau dieser Herkunft, mit der eigenen id,
      nur mit den vier Feldern und bis zur Größengrenze; nach der Frist verfällt der Auftrag.
   4. In der Vorschau öffnet sich kein Fenster.
   5. Der Schlüssel lebt nur im Vorgang: nach dem Ablegen steht weder er noch die url im Depot; der Vermerk trägt Host und Tag.
   6. Der Block macht keinen Netzaufruf und schickt nie an '*'.
   Rot-Beweise: eine Kopie des Kerns ohne Herkunftsprüfung nimmt eine fremde Antwort an; eine ohne das Tor der Vorschau öffnet
   das Fenster; eine ohne zip-Prüfung öffnet eine JWE mit zip.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const HERKUNFT = 'https://share.vivodepot.de';
const ABLAGE = 'https://share.vivodepot.de/holen.php?t=' + 'a'.repeat(48);
const FIXTURE = path.join(__dirname, 'fixtures', 'eigenprobe-eu-lab.json');
const b64u = (u8) => Buffer.from(u8).toString('base64url');
const neuerSchluessel = (n) => webcrypto.getRandomValues(new Uint8Array(n || 32));

function link(V, felder) {
  return V.SHL_URI_PRAEFIX + Buffer.from(JSON.stringify(felder)).toString('base64url');
}
function aufbau(opt) {
  const gesendet = [];
  const w = { postMessage: (nachricht, ziel) => gesendet.push({ nachricht, ziel }) };
  const fremd = { postMessage: () => { throw new Error('an das fremde Fenster darf nichts gehen'); } };
  const hoerer = new Set();
  const ziel = { addEventListener: (t, f) => { if (t === 'message') hoerer.add(f); }, removeEventListener: (t, f) => hoerer.delete(f) };
  const uhren = [];
  const geoeffnet = [];
  const o = Object.assign({
    oeffnen: (name) => { geoeffnet.push(name); return w; }, ziel,
    uhr: (f, ms) => { uhren.push({ f, ms }); return uhren.length; }, uhrAus: () => {}, jetzt: () => 1000000,
  }, opt || {});
  const senden = (source, origin, data) => { for (const f of [...hoerer]) f({ source, origin, data }); };
  return { w, fremd, gesendet, hoerer, uhren, geoeffnet, o, senden };
}
const offen = async (p) => { let fertig = false; p.then(() => { fertig = true; }, () => { fertig = true; }); await new Promise((r) => setImmediate(r)); return !fertig; };
function jweTeile(jwe) { return jwe.split('.'); }
function kopfSetzen(jwe, kopf) { const t = jweTeile(jwe); t[0] = Buffer.from(JSON.stringify(kopf)).toString('base64url'); return t.join('.'); }
function block() {
  const t = fs.readFileSync(HTML_PATH, 'utf8');
  const a = t.indexOf('/* ══ SHL-EMPFANG'); const b = t.indexOf('/* ══ ENDE SHL-EMPFANG ══ */');
  assert.ok(a > 0 && b > a, 'Block SHL-EMPFANG im Kern');
  return t.slice(a, b);
}
async function kernKopie(ersetzen) {
  const roh = fs.readFileSync(HTML_PATH, 'utf8');
  const [alt, neu] = ersetzen;
  assert.equal(roh.split(alt).length, 2, 'Vorbedingung: die Stelle steht genau einmal im Kern: ' + alt);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shl-empfang-'));
  const kopie = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(kopie, roh.replace(alt, neu));
  return { dir, kopie };
}

test('[SHL-Empfang·Link] ein guter Link wird lokal gelesen; jede böse Form fällt mit ihrem Grund', () => {
  const { V } = ladeKern();
  const key = b64u(neuerSchluessel());
  const r = V.shlLinkLesen('Bitte öffnen: ' + link(V, { url: ABLAGE, key, flag: 'U', label: 'Befund', exp: Math.floor(Date.now() / 1000) + 3600 }));
  assert.equal(r.fehler, undefined);
  assert.equal(r.teile.host, 'share.vivodepot.de');
  assert.equal(r.teile.key, key);
  assert.equal(r.teile.label, 'Befund');
  const faelle = {
    leer: '',
    praefix: 'https://share.vivodepot.de/',
    unlesbar: V.SHL_URI_PRAEFIX + '%%%',
    unvollstaendig: link(V, { url: ABLAGE }),
    adresse: link(V, { url: 'http://share.vivodepot.de/x', key }),
    schluessel: link(V, { url: ABLAGE, key: b64u(neuerSchluessel(31)) }),
    flag: link(V, { url: ABLAGE, key, flag: 'X' }),
    passcode: link(V, { url: ABLAGE, key, flag: 'P' }),
    abgelaufen: link(V, { url: ABLAGE, key, exp: 1 }),
  };
  for (const [grund, roh] of Object.entries(faelle)) assert.equal(V.shlLinkLesen(roh).fehler, grund, grund);
  assert.equal(V.shlLinkLesen(link(V, { url: ABLAGE, key: 'a+b/' + 'c'.repeat(39) })).fehler, 'schluessel', 'nur base64url');
});

test('[SHL-Empfang·JWE] streng geöffnet: die eigene JWE geht auf, jede fremde Form fällt', async () => {
  const { V } = ladeKern();
  const k = neuerSchluessel();
  const key = b64u(k);
  const jwe = await V._jweCompactDir('{"resourceType":"Bundle"}', k);
  assert.equal(new TextDecoder().decode(await V.shlJweOeffnen(jwe, key)), '{"resourceType":"Bundle"}');
  const kopf = JSON.parse(Buffer.from(jweTeile(jwe)[0], 'base64url').toString());
  const t = jweTeile(jwe);
  const rot = [
    ['shl-kopf', kopfSetzen(jwe, Object.assign({}, kopf, { alg: 'A256KW' }))],
    ['shl-kopf', kopfSetzen(jwe, Object.assign({}, kopf, { enc: 'A128GCM' }))],
    ['shl-zip', kopfSetzen(jwe, Object.assign({}, kopf, { zip: 'DEF' }))],
    ['shl-kopf', kopfSetzen(jwe, Object.assign({}, kopf, { crit: ['b64'], b64: false }))],
    ['shl-form', [t[0], '', b64u(neuerSchluessel(11)), t[3], t[4]].join('.')],
    ['shl-form', [t[0], '', t[2], t[3], t[4].slice(0, -2)].join('.')],
    ['shl-form', t.slice(0, 4).join('.')],
    ['shl-form', [t[0], 'x', t[2], t[3], t[4]].join('.')],
    ['shl-entschluesseln', kopfSetzen(jwe, Object.assign({}, kopf, { cty: 'text/plain' }))],
    ['shl-groesse', 'a'.repeat(V.SHL_EMPFANG_HOECHSTENS + 1)],
  ];
  for (const [code, j] of rot) await assert.rejects(V.shlJweOeffnen(j, key), new RegExp('^Error: ' + code + '$'), code);
  await assert.rejects(V.shlJweOeffnen(jwe, b64u(neuerSchluessel())), /shl-entschluesseln/, 'falscher Schlüssel');
  await assert.rejects(V.shlJweOeffnen(jwe, b64u(neuerSchluessel(31))), /shl-schluessel/, 'Schlüssel ≠ 32 Bytes');
  const q = block();
  assert.match(q, /importKey\('raw', roh, \{ name: 'AES-GCM' \}, false, \['decrypt'\]\)/, 'nicht extrahierbar, nur decrypt');
  assert.match(q, /additionalData: new TextEncoder\(\)\.encode\(t\[0\]\)/, 'der kodierte Kopf ist die AAD');
});

test('[SHL-Empfang·JWE·Rot-Beweis] ohne zip-Prüfung öffnete der Kern eine JWE mit zip', async () => {
  const { dir, kopie } = await kernKopie(["  if (Object.prototype.hasOwnProperty.call(kopf, 'zip')) throw new Error('shl-zip');\n", '']);
  try {
    const { V } = ladeKern({ htmlPfad: kopie, backen: true });
    const k = neuerSchluessel();
    // Mit zip im Kopf, aber passend verschlüsselt: der Kopf ist die AAD, also neu verschlüsseln.
    const kopf = { alg: 'dir', enc: 'A256GCM', zip: 'DEF' };
    const h = Buffer.from(JSON.stringify(kopf)).toString('base64url');
    const iv = neuerSchluessel(12);
    const ck = await webcrypto.subtle.importKey('raw', k, { name: 'AES-GCM' }, false, ['encrypt']);
    const roh = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(h), tagLength: 128 }, ck, new TextEncoder().encode('x')));
    const jwe = [h, '', b64u(iv), b64u(roh.slice(0, -16)), b64u(roh.slice(-16))].join('.');
    assert.equal(new TextDecoder().decode(await V.shlJweOeffnen(jwe, b64u(k))), 'x', 'die Kopie ohne Prüfung öffnet sie');
    const { V: echt } = ladeKern();
    await assert.rejects(echt.shlJweOeffnen(jwe, b64u(k)), /shl-zip/, 'der echte Kern weist sie ab');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Die Diskriminante des Auftrags (U2-ADR-099, §7.5): spielt den Weg einmal durch und liefert jede Abweichung als Zeile. */
async function auftragVerstoesse(laden) {
  const { V } = (laden || ladeKern)();
  const raus = [];
  const pruef = (ok, satz) => { if (!ok) raus.push(satz); };
  pruef(V.SHL_ABHOL_URL === 'https://share.vivodepot.de/empfangen.html', 'Ort der Abhol-Seite');
  pruef(V.SHL_ABHOL_HERKUNFT === HERKUNFT, 'Herkunft der Abhol-Seite');
  const a = aufbau();
  const p = V.shlHolen({ url: ABLAGE, key: 'GEHEIM', flag: 'U' }, a.o);
  pruef(a.geoeffnet.join() === 'vd-shl-abholen', 'Fenstername');
  pruef(a.gesendet.length === 0, 'vor „bereit“ ging etwas hinaus');
  a.senden(a.w, 'https://boese.example', { typ: 'vd-shl-bereit', fassung: 1 });
  try { a.senden(a.fremd, HERKUNFT, { typ: 'vd-shl-bereit', fassung: 1 }); } catch (e) { raus.push('an das fremde Fenster ging etwas'); }
  pruef(a.gesendet.length === 0, 'fremde Herkunft oder fremdes Fenster löste den Auftrag aus');
  a.senden(a.w, HERKUNFT, { typ: 'vd-shl-bereit', fassung: 1 });
  a.senden(a.w, HERKUNFT, { typ: 'vd-shl-bereit', fassung: 1 });
  pruef(a.gesendet.length === 1, 'der Auftrag ging nicht genau einmal');
  const g = a.gesendet[0] || { nachricht: {} };
  pruef(g.ziel === HERKUNFT, 'targetOrigin ist nicht die feste Herkunft');
  pruef(Object.keys(g.nachricht).sort().join() === 'bis,fassung,flag,id,typ,url', 'Felder des Auftrags');
  pruef(!JSON.stringify(g.nachricht).includes('GEHEIM'), 'der Schlüssel ging mit');
  pruef(g.nachricht.bis === 1000000 + 10 * 60 * 1000 - 5000, 'bis liegt nicht kurz vor der eigenen Frist');
  pruef(/^[A-Za-z0-9_-]{22}$/.test(String(g.nachricht.id)), 'Kennung des Auftrags');
  a.senden(a.fremd, 'https://boese.example', { typ: 'vd-shl-geholt', fassung: 1, id: g.nachricht.id, jwe: 'f..r.e.m' });
  a.senden(a.w, HERKUNFT, { typ: 'vd-shl-geholt', fassung: 1, id: g.nachricht.id, jwe: 'a..b.c.d' });
  let wert = null;
  try { wert = await p; } catch (e) { raus.push('Auftrag scheiterte: ' + e.message); }
  pruef(wert === 'a..b.c.d', 'angenommen wurde nicht die Antwort der Abhol-Seite');
  pruef(a.hoerer.size === 0, 'nach dem Ende hört noch jemand zu');
  return raus;
}
test('[SHL-Empfang·Holen] fester Ort, nichts vor „bereit“, der Auftrag ohne Schlüssel an die feste Herkunft', async () => {
  assert.deepEqual(await auftragVerstoesse(), []);
});

test('[SHL-Empfang·Holen] „geholt“ zählt nur mit eigener id, vier Feldern, fester Herkunft und begrenzter Größe; Frist', async () => {
  const { V } = ladeKern();
  const a = aufbau();
  const p = V.shlHolen({ url: ABLAGE, key: 'k', flag: '' }, a.o);
  a.senden(a.w, HERKUNFT, { typ: 'vd-shl-geholt', fassung: 1, id: 'x'.repeat(22), jwe: 'a..b.c.d' });
  a.senden(a.w, HERKUNFT, { typ: 'vd-shl-bereit', fassung: 1 });
  const id = a.gesendet[0].nachricht.id;
  const gut = { typ: 'vd-shl-geholt', fassung: 1, id, jwe: 'a..b.c.d' };
  a.senden(a.w, HERKUNFT, Object.assign({}, gut, { id: 'y'.repeat(22) }));
  a.senden(a.fremd, HERKUNFT, gut);
  a.senden(a.w, 'https://boese.example', gut);
  a.senden(a.w, HERKUNFT, Object.assign({}, gut, { key: 'k' }));
  a.senden(a.w, HERKUNFT, Object.assign({}, gut, { url: ABLAGE }));
  a.senden(a.w, HERKUNFT, Object.assign({}, gut, { jwe: 'a.b.c' }));
  a.senden(a.w, HERKUNFT, Object.assign({}, gut, { jwe: 'a..b.c.' + 'd'.repeat(V.SHL_EMPFANG_HOECHSTENS) }));
  a.senden(a.w, HERKUNFT, Object.assign({}, gut, { fassung: 2 }));
  assert.equal(await offen(p), true, 'nichts davon löst auf');
  a.senden(a.w, HERKUNFT, gut);
  assert.equal(await p, 'a..b.c.d');

  const b = aufbau();
  const q = V.shlHolen({ url: ABLAGE, key: 'k' }, b.o);
  assert.equal(b.uhren[0].ms, 10 * 60 * 1000);
  b.uhren[0].f();
  await assert.rejects(q, /shl-frist/);
  assert.equal(b.hoerer.size, 0, 'nach der Frist hört niemand mehr zu');
  await assert.rejects(V.shlHolen({ url: 'http://x.example/a', key: 'k' }, aufbau().o), /shl-adresse/);
  await assert.rejects(V.shlHolen({ url: ABLAGE, key: 'k' }, aufbau({ oeffnen: () => null }).o), /shl-fenster/);
});

test('[Negativprobe] SHL-Empfang: ohne Herkunftsprüfung nähme der Kern die Antwort einer fremden Seite an', async () => {
  const { dir, kopie } = await kernKopie(['if (!e || e.source !== w || e.origin !== SHL_ABHOL_HERKUNFT) return;', 'if (!e) return;']);
  try {
    const raus = await auftragVerstoesse(() => ladeKern({ htmlPfad: kopie, backen: true }));
    assert.ok(raus.includes('fremde Herkunft oder fremdes Fenster löste den Auftrag aus'), raus.join(' | '));
    assert.ok(raus.includes('angenommen wurde nicht die Antwort der Abhol-Seite'), 'die Kopie nimmt die fremde Antwort: ' + raus.join(' | '));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[SHL-Empfang·Vorschau] in der Vorschau und der Vorführung öffnet sich kein Fenster; mit Rot-Beweis', async () => {
  const { V } = ladeKern();
  for (const d of [{ _vorschau: true }, { _vorschau: true, _vorfuehrung: true }]) {
    V.setData(d);
    const a = aufbau();
    await assert.rejects(V.shlHolen({ url: ABLAGE, key: 'k' }, a.o), /shl-vorschau/);
    assert.equal(a.geoeffnet.length, 0);
  }
  const { dir, kopie } = await kernKopie(["  if (imVorschau()) return Promise.reject(new Error('shl-vorschau'));\n", '']);
  try {
    const { V: W } = ladeKern({ htmlPfad: kopie, backen: true });
    W.setData({ _vorschau: true });
    const a = aufbau();
    W.shlHolen({ url: ABLAGE, key: 'k' }, a.o).catch(() => {});
    assert.equal(a.geoeffnet.length, 1, 'die Kopie ohne Tor öffnet das Fenster');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[SHL-Empfang·Depot] der Schlüssel lebt nur im Vorgang; im Depot stehen weder er noch die url, nur Host und Tag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  const k = neuerSchluessel();
  const key = b64u(k);
  const jwe = await V._jweCompactDir(fs.readFileSync(FIXTURE, 'utf8'), k);
  const teile = V.shlLinkLesen(link(V, { url: ABLAGE, key, flag: 'U', label: 'Labor' })).teile;
  const vorschlag = await V.shlEmpfangen(teile, { jwe });
  assert.equal(teile.key, '', 'der Schlüssel ist nach dem Vorgang verworfen');
  assert.equal(vorschlag.mime, 'application/fhir+json');
  const id = V.shlVorschlagAblegen(vorschlag, teile.host);
  assert.ok(id, 'das FHIR-Dokument liegt als Original in der Mappe');
  const e = V.getData().mappe.find((m) => m.id === id);
  assert.deepEqual(Object.keys(e.empfangenUeber).sort(), ['am', 'host']);
  assert.equal(e.empfangenUeber.host, 'share.vivodepot.de');
  assert.match(e.empfangenUeber.am, /^\d{4}-\d{2}-\d{2}$/);
  const depot = JSON.stringify(V.getData());
  assert.ok(!depot.includes(key), 'kein Schlüssel im Depot');
  assert.ok(!depot.includes(Buffer.from(k).toString('base64')), 'auch nicht als base64');
  assert.ok(!depot.includes(ABLAGE) && !depot.includes('holen.php'), 'keine url im Depot');
});

test('[SHL-Empfang·Vorschlag] eine Binary-Hülle wird nach der geschlossenen Liste ausgepackt, sonst bleibt die Datei', () => {
  const { V } = ladeKern();
  const pdf = Buffer.from('%PDF-1.7 probe');
  const huelle = Buffer.from(JSON.stringify({ resourceType: 'Binary', contentType: 'application/pdf', data: pdf.toString('base64') }));
  const v = V.shlKlartextAlsVorschlag(new Uint8Array(huelle), { label: 'Brief' });
  assert.equal(v.mime, 'application/pdf');
  assert.equal(v.dateiname, 'Brief.pdf');
  assert.equal(v.fhirText, null);
  assert.ok(v.inhalt.endsWith(pdf.toString('base64')), 'die PDF-Bytes unverändert');
  const fremd = Buffer.from(JSON.stringify({ resourceType: 'Binary', contentType: 'text/html', data: 'PGI+' }));
  assert.equal(V.shlKlartextAlsVorschlag(new Uint8Array(fremd), {}).mime, 'application/fhir+json', 'unbekannter Typ: die Hülle bleibt');
  assert.equal(V.shlKlartextAlsVorschlag(new Uint8Array([0, 1, 2]), { label: 'a/b' }).dateiname, 'a_b.bin');
});

test('[SHL-Empfang·Netz] der Block macht keinen Netzaufruf, schickt nie an * und hängt an der Einlese-Tür', () => {
  const q = block();
  assert.doesNotMatch(q, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/, 'kein Netzaufruf im Kern');
  assert.doesNotMatch(q, /postMessage\([^)]*'\*'/, 'nie an *');
  const posts = q.match(/postMessage\(/g) || [];
  assert.equal(posts.length, 1, 'genau ein postMessage');
  assert.match(q, /w\.postMessage\(\{ typ: 'vd-shl-holen'[^}]*\}, SHL_ABHOL_HERKUNFT\)/);
  assert.doesNotMatch(q, /localStorage|indexedDB|sessionStorage/, 'der Schlüssel geht in keinen Speicher');
  const kern = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(kern, /data-iz-shl-empfangen="1"/, 'Knopf an der Einlese-Tür');
  assert.match(kern, /se\.onclick = \(\) => flowShlEmpfangen\(''\);/);
  assert.match(kern, /function flowShlEmpfangen\(vorbelegt\) \{/, 'der Dialog nimmt einen Wert, er ist keine eigene Sicht');
});

/* Der Dialog nach einem Fehlschlag (Krypto-Durchsicht, MITTEL): der Schlüssel ist verworfen; teile fällt mit, der Befund
   schließt, der Hauptknopf heißt wieder „Link prüfen“. Nach erneutem Prüfen öffnet der Datei-Rückfall. */
// Die Meldung legt der gemeinsame Helfer (feldFehlerSetzen, opt.in) als <p class="feld-fehler"> im Dialog an; gezählt wird die jüngste sichtbare.
function fehlerZeile(erzeugt) {
  const m = erzeugt.filter((el) => el.className === 'feld-fehler').pop();
  return m && !m.hidden ? String(m.textContent) : '';
}
async function rueckfallNachFehlschlag(V, document, opt) {
  await V.depotAnlegen('pw');
  const k = neuerSchluessel();
  const key = b64u(k);
  const jwe = await V._jweCompactDir(fs.readFileSync(FIXTURE, 'utf8'), k);
  // Der Test-DOM führt nur die IDs aus dem Kern-HTML; den erst nach dem Prüfen erzeugten Datei-Rückfall greift die Probe
  // darum beim Erzeugen ab.
  const erzeugt = [];
  const erzeugen = document.createElement;
  document.createElement = (tag) => { const el = erzeugen(tag); erzeugt.push(el); return el; };
  V.flowShlEmpfangen('');
  const feld = document.getElementById('shl-empfang-link');
  const haupt = () => document.getElementById('m-ok');
  feld.value = link(V, { url: ABLAGE, key, flag: 'U', label: 'Labor' });
  await haupt().onclick();
  const nachPruefen = { text: haupt().textContent, befund: !document.getElementById('shl-empfang-befund').hidden };
  await haupt().onclick();   // Abholen: hier öffnet sich kein Fenster, der Vorgang scheitert
  const nachFehlschlag = { text: haupt().textContent, befund: !document.getElementById('shl-empfang-befund').hidden,
    fehler: fehlerZeile(erzeugt) !== '' };
  await haupt().onclick();   // erneut prüfen
  const datei = erzeugt.filter((el) => el.id === 'shl-empfang-datei').pop();
  const gross = opt && opt.zuGross;
  let gelesen = false;
  Object.defineProperty(datei, 'files', { value: [{ size: gross ? V.SHL_EMPFANG_HOECHSTENS + 1 : jwe.length, text: async () => { gelesen = true; return jwe; } }], configurable: true });
  let ergebnis = 'abgelegt';
  try { await datei.onchange(); } catch (e) { ergebnis = e.message; }
  const abgelegt = (V.getData().mappe || []).some((m) => m.empfangenUeber && m.empfangenUeber.host === 'share.vivodepot.de');
  return { nachPruefen, nachFehlschlag, abgelegt, ergebnis, gelesen, meldung: fehlerZeile(erzeugt) };
}
test('[SHL-Empfang·Dialog] nach einem gescheiterten Abholen öffnet der Datei-Rückfall nach erneutem Prüfen; ein Hauptknopf je Zustand', async () => {
  const { V, document } = ladeKern();
  const r = await rueckfallNachFehlschlag(V, document);
  assert.equal(r.nachPruefen.text, V.STRINGS.shlEmpfangHolen, 'nach dem Prüfen: „Abholen und einlesen“');
  assert.equal(r.nachPruefen.befund, true);
  assert.equal(r.nachFehlschlag.text, V.STRINGS.shlEmpfangPruefen, 'nach dem Fehlschlag: wieder „Link prüfen“');
  assert.equal(r.nachFehlschlag.befund, false, 'der Befund schließt');
  assert.equal(r.nachFehlschlag.fehler, true, 'die Meldung steht im Fehlerstil unter dem Feld');
  assert.equal(r.abgelegt, true, 'der Rückfall legt das Original ab: ' + r.meldung);
});
test('[SHL-Empfang·Dialog] eine zu große .jwe-Datei wird vor dem Lesen abgewiesen', async () => {
  const { V, document } = ladeKern();
  const r = await rueckfallNachFehlschlag(V, document, { zuGross: true });
  assert.equal(r.gelesen, false, 'die Datei wird nicht gelesen');
  assert.equal(r.abgelegt, false);
  assert.equal(r.meldung, V.STRINGS.shlEmpfangFehler_groesse);
});
test('[SHL-Empfang·Dialog·Rot-Beweis] ohne Zurücksetzen nach dem Fehlschlag scheitert der Rückfall am verworfenen Schlüssel', async () => {
  const { dir, kopie } = await kernKopie(['    try { fertig(await shlEmpfangen(teile)); }\n    catch (e) { zuruecksetzen(); fehlerZeigen(fehlerCode(e)); }',
    '    try { fertig(await shlEmpfangen(teile)); }\n    catch (e) { if (haupt) haupt.disabled = false; fehlerZeigen(fehlerCode(e)); }']);
  try {
    const { V, document } = ladeKern({ htmlPfad: kopie, backen: true });
    const r = await rueckfallNachFehlschlag(V, document);
    assert.equal(r.abgelegt, false, 'die Kopie legt nichts ab');
    assert.equal(r.meldung, V.STRINGS.shlEmpfangFehler_schluessel, 'sie meldet den verworfenen Schlüssel');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Proben-Deklaration (U2-ADR-099, §7.5): der Prüfstand ersetzt die Diskriminante durch eine, die immer meldet, und verlangt,
   dass der Test dann fällt. */
module.exports = {
  PROBEN: [
    { fuer: '[SHL-Empfang·Holen] fester Ort, nichts vor „bereit“, der Auftrag ohne Schlüssel an die feste Herkunft', diskriminante: auftragVerstoesse },
  ],
};

/* Das Fenster der Abhol-Seite öffnet sich über SHL_ABHOL_URL (Grund in tools/verweisziel-senken-grundlinie.json). Der Grund
   trägt nur, solange die Konstante ein Verweis auf den eingefrorenen Eintrag MARKEN_ADRESSEN.shlAbholen ist (gehalten von
   tools/marken-adressen-pruefen.js) und die Adresse nicht als zweites Literal im Kern steht. */
function abholZielVerstoesse(kern) {
  const raus = [];
  if (!/\nconst SHL_ABHOL_URL = MARKEN_ADRESSEN\.shlAbholen;\n/.test(kern)) raus.push('SHL_ABHOL_URL ist kein Verweis auf MARKEN_ADRESSEN.shlAbholen');
  const literale = kern.split("'https://share.vivodepot.de/empfangen.html'").length - 1;
  if (literale !== 1) raus.push('die Adresse der Abhol-Seite steht ' + literale + '× als Literal im Kern, erwartet 1 (MARKEN_ADRESSEN)');
  return raus;
}

test('[Abhol-Ziel] SHL_ABHOL_URL verweist auf MARKEN_ADRESSEN.shlAbholen, die Adresse steht nur dort als Literal', () => {
  assert.deepEqual(abholZielVerstoesse(fs.readFileSync(HTML_PATH, 'utf8')), []);
});

test('[Abhol-Ziel·Rot-Beweis] ein zweites Literal statt des Verweises ist rot', () => {
  const kern = fs.readFileSync(HTML_PATH, 'utf8').replace('\nconst SHL_ABHOL_URL = MARKEN_ADRESSEN.shlAbholen;\n',
    "\nconst SHL_ABHOL_URL = 'https://share.vivodepot.de/empfangen.html';\n");
  assert.equal(abholZielVerstoesse(kern).length, 2);
});

/* Die Lockerung der Krypto-Grundlinie (decrypt 1 → 2, importKeyRaw 12 → 13) greift nur an einer Stelle: shlJweOeffnen.
   Ohne diese Funktion misst der Kern genau den Bestand davor; jede andere neue Stelle macht die Grundlinie rot. */
const KRYPTO = require('../tools/krypto-aufrufer-pruefen.js');
const KRYPTO_GRUNDLINIE = JSON.parse(fs.readFileSync(KRYPTO.GRUNDLINIE, 'utf8'));
function ohneJweOeffnen(kern) {
  const a = kern.indexOf('async function shlJweOeffnen(');
  const e = kern.indexOf('\n}\n', a);
  assert.ok(a > 0 && e > a, 'Vorbedingung: shlJweOeffnen steht im Kern');
  return kern.slice(0, a) + kern.slice(e + 3);
}
test('[SHL-Empfang·Krypto-Stelle] der Zuwachs an decrypt und importKey(raw) liegt ganz in shlJweOeffnen, sonst nirgends', () => {
  const kern = fs.readFileSync(HTML_PATH, 'utf8');
  const mit = KRYPTO.messen(kern);
  const ohne = KRYPTO.messen(ohneJweOeffnen(kern));
  const diff = Object.fromEntries(Object.keys(mit).map((k) => [k, mit[k] - (ohne[k] || 0)]).filter(([, d]) => d !== 0));
  assert.deepEqual(diff, { decrypt: 1, importKeyRaw: 1 }, 'shlJweOeffnen trägt genau ein decrypt und ein importKey(raw)');
  assert.deepEqual(KRYPTO.pruefen(mit, KRYPTO_GRUNDLINIE), [], 'mit shlJweOeffnen steht der Kern genau auf der Grundlinie');
});
test('[SHL-Empfang·Krypto-Stelle·Rot-Beweis] ein zweites decrypt oder importKey(raw) außerhalb von shlJweOeffnen fällt', () => {
  const kern = fs.readFileSync(HTML_PATH, 'utf8');
  const decrypt = kern + '\nasync function fremd(k, d) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: d }, k, d); }\n';
  const raw = kern + '\nasync function fremd(r) { return crypto.subtle.importKey("raw", r, { name: "AES-GCM" }, false, ["decrypt"]); }\n';
  assert.ok(KRYPTO.pruefen(KRYPTO.messen(decrypt), KRYPTO_GRUNDLINIE).some((x) => x.startsWith('decrypt:')), 'zweites decrypt nicht gefunden');
  assert.ok(KRYPTO.pruefen(KRYPTO.messen(raw), KRYPTO_GRUNDLINIE).some((x) => x.startsWith('importKeyRaw:')), 'zweites importKey(raw) nicht gefunden');
});
