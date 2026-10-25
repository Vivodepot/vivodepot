'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Pod-Brücke: Rand der Seite und Trennung vom Kern (U2-ADR-512)
   ────────────────────────────────────────────────────────────────────────
   WAS DIESE PROBE HÄLT
     1. pod/bruecke.html trägt genau die CSP des Entwurfs (connect-src https:, sonst so eng wie share/empfangen.html),
        kein Inline-Skript, nur Skripte aus pod/.
     2. Kern und Lese-App bleiben bei connect-src 'none'; kein Verweis von dort auf pod/.
     3. Der DPoP-Schlüssel entsteht nur mit extractable false; nichts in pod/ benutzt localStorage oder Cookies;
        sessionStorage nur für den Anmeldevorgang (genau drei Aufrufe unter einem Schlüssel, gelesen und sofort gelöscht).
     5. Kein Erneuerungs-Token: weder offline_access noch refresh_token im Code; ein ungefragt geschicktes wird nicht gespeichert.
     4. Kein Pfad zwischen pod/ und den Schlüsseln des Depots: pod/ nennt keine Krypto-Funktion des Kerns, kein PBKDF2, kein
        deriveKey, kein Passwort-Feld.
   Jede Prüfung hat ihren Rot-Beweis an einer veränderten Kopie im Speicher.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const W = path.join(__dirname, '..');
const WURZEL = path.join(__dirname, '..');
const lesen = (d) => fs.readFileSync(path.join(W, d), 'utf8');
const POD = ['pod/bruecke.html', 'pod/bruecke.js', 'pod/solid-oidc.js', 'pod/chiffrat-pruefen.js', 'pod/lws.js'];
const CSP_SOLL = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src https:; img-src 'self'; base-uri 'none'; form-action 'none'";

function cspAus(html) { const m = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/); return m && m[1].replace(/\s+/g, ' ').trim(); }
function randFehler(html) {
  const f = [];
  if (cspAus(html) !== CSP_SOLL) f.push('csp');
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) f.push('inline-skript');
  for (const m of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)) if (!/^[a-z-]+\.js$/.test(m[1])) f.push('skript-fremd:' + m[1]);
  if (/\son[a-z]+=/.test(html)) f.push('inline-handler');
  return f;
}
const SPEICHER = /\b(localStorage|sessionStorage|document\.cookie)\b/;
// Aufrufe und Namen, nicht Feldnamen: die Tür kennt die Hüllenfelder pbkdf2 und depotSalt, um sie zu erkennen, liest sie aber nicht.
const DEPOT_KRYPTO = /\b(deriveKey|deriveBits|unwrapKey|kekAbleiten|depotEntschluesseln|passwort|password)\b|name:\s*'PBKDF2'|\.pbkdf2\.(?!salt\b)/i;
function dpopFehler(js) {
  const f = [];
  const gen = js.match(/crypto\.subtle\.generateKey\(([^;]+)\)/g) || [];
  if (gen.length !== 1) f.push('generateKey-anzahl:' + gen.length);
  for (const g of gen) if (!/\},\s*false,\s*\[/.test(g)) f.push('extractable-nicht-false');
  if (/exportKey\('(?:jwk|pkcs8)',\s*paar\.privateKey/.test(js)) f.push('privat-exportiert');
  return f;
}

test('[Pod-Brücke·Rand] die Seite trägt genau die CSP des Entwurfs, kein Inline-Skript, nur eigene Skripte', () => {
  assert.deepEqual(randFehler(lesen('pod/bruecke.html')), []);
});
test('[Pod-Brücke·Rand·Rot-Beweis] eine weitere Quelle, ein Inline-Skript oder ein fremdes Skript fallen auf', () => {
  const h = lesen('pod/bruecke.html');
  assert.ok(randFehler(h.replace("connect-src https:;", "connect-src *;")).includes('csp'));
  assert.ok(randFehler(h.replace('</body>', '<script>1</script></body>')).includes('inline-skript'));
  assert.ok(randFehler(h.replace('src="bruecke.js"', 'src="https://cdn.example/x.js"')).some((x) => x.startsWith('skript-fremd')));
});

test('[Pod-Brücke·Kern] Kern und Lese-App bleiben bei connect-src none und verweisen nicht auf pod/', () => {
  for (const d of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const text = fs.readFileSync(path.join(WURZEL, d), 'utf8');
    assert.match(cspAus(text) || '', /connect-src 'none'/, d);
    assert.ok(!/pod\/bruecke|spikes\//.test(text), d + ' verweist nicht auf die Brücke');
  }
});

/* sessionStorage ist nur für den Anmeldevorgang zugelassen (state, nonce, code_verifier über den Rücksprung): genau diese drei
   Aufrufe, alle mit dem Schlüssel PKCE, und das Lesen steht in derselben Zeile wie das Löschen. Alles andere fällt. */
const SITZUNGSSPEICHER_ERLAUBT = [
  /^sessionStorage\.setItem\(PKCE, JSON\.stringify\(\{ verifier: verifier, state: state, nonce: nonce, aussteller: konf\.issuer \}\)\)$/,
  /^sessionStorage\.getItem\(PKCE\); sessionStorage\.removeItem\(PKCE\)$/,
  /^sessionStorage\.removeItem\(PKCE\)$/
];
function speicherFehler(d, text) {
  const f = []; const ohne = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  if (/\b(localStorage|document\.cookie)\b/.test(ohne)) f.push(d + ':local-oder-cookie');
  const stellen = ohne.match(/sessionStorage\.[^;]*(?:; sessionStorage\.[^;]*)?/g) || [];
  if (stellen.length && d !== 'pod/solid-oidc.js') f.push(d + ':sessionStorage');
  for (const st of stellen) if (!SITZUNGSSPEICHER_ERLAUBT.some((m) => m.test(st.trim()))) f.push(d + ':sessionStorage-fremd:' + st.trim().slice(0, 60));
  if (d === 'pod/solid-oidc.js' && stellen.length !== 3) f.push(d + ':sessionStorage-anzahl:' + stellen.length);
  return f;
}
test('[Pod-Brücke·Speicher] kein localStorage, keine Cookies; sessionStorage nur für den Anmeldevorgang', () => {
  for (const d of POD) assert.deepEqual(speicherFehler(d, lesen(d)), [], d);
  assert.ok(SPEICHER.test('sessionStorage'));   // das alte Muster bleibt als Bezug für die Rot-Beweise
});
test('[Pod-Brücke·Speicher·Rot-Beweis] localStorage, ein Token im sessionStorage oder Lesen ohne Löschen fallen auf', () => {
  const js = lesen('pod/solid-oidc.js');
  assert.ok(speicherFehler('pod/solid-oidc.js', js + '\nlocalStorage.setItem("t", x);').length);
  assert.ok(speicherFehler('pod/solid-oidc.js', js + "\nsessionStorage.setItem('t', zugang.token);").length);
  assert.ok(speicherFehler('pod/solid-oidc.js', js.replace('sessionStorage.getItem(PKCE); sessionStorage.removeItem(PKCE);', 'sessionStorage.getItem(PKCE);')).length);
  assert.ok(speicherFehler('pod/bruecke.js', lesen('pod/bruecke.js') + '\nsessionStorage.removeItem(PKCE);').length);
});

function erneuerungFehler(js) {
  const f = []; const ohne = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  if (/offline_access/.test(ohne)) f.push('offline_access');
  if (/refresh_token/.test(ohne)) f.push('refresh_token');
  if (/schreiben\('sitzung'/.test(ohne)) f.push('sitzung-gespeichert');
  return f;
}
test('[Pod-Brücke·K2] kein Erneuerungs-Token: nicht erfragt, nicht registriert, nicht gespeichert', () => {
  for (const d of POD.filter((x) => x.endsWith('.js'))) assert.deepEqual(erneuerungFehler(lesen(d)), [], d);
});
test('[Pod-Brücke·K2·Rot-Beweis] der Stand des Spikes fällt', () => {
  const js = lesen('pod/solid-oidc.js');
  assert.ok(erneuerungFehler(js.replace("scope: 'openid webid'", "scope: 'openid webid offline_access'")).includes('offline_access'));
  assert.ok(erneuerungFehler(js.replace("grant_types: ['authorization_code']", "grant_types: ['authorization_code', 'refresh_token']")).includes('refresh_token'));
  assert.ok(erneuerungFehler(js + "\nschreiben('sitzung', { erneuerung: t.refresh_token });").length === 2);
});

test('[Pod-Brücke·DPoP] der Schlüssel entsteht genau einmal, nicht exportierbar, und der private Teil wird nie exportiert', () => {
  assert.deepEqual(dpopFehler(lesen('pod/solid-oidc.js')), []);
});
test('[Pod-Brücke·DPoP·Rot-Beweis] extractable true oder ein Export des privaten Schlüssels fallen auf', () => {
  const js = lesen('pod/solid-oidc.js');
  assert.ok(dpopFehler(js.replace("namedCurve: 'P-256' }, false,", "namedCurve: 'P-256' }, true,")).includes('extractable-nicht-false'));
  assert.ok(dpopFehler(js + "\ncrypto.subtle.exportKey('jwk', paar.privateKey);").includes('privat-exportiert'));
});

test('[Pod-Brücke·Trennung] pod/ kennt keinen Schlüssel und kein Passwort des Depots', () => {
  for (const d of POD.filter((x) => x.endsWith('.js'))) {   // die Seite selbst sagt der Person, dass sie das Passwort nicht kennt
    const ohneKommentar = lesen(d).replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
    const treffer = ohneKommentar.match(DEPOT_KRYPTO);
    assert.equal(treffer, null, d + ': ' + (treffer && treffer[0]));
  }
});
test('[Pod-Brücke·Trennung·Rot-Beweis] ein Aufruf einer Ableitung fällt auf', () => {
  assert.ok(DEPOT_KRYPTO.test("crypto.subtle.deriveKey({ name: 'PBKDF2' }, k, a, false, ['decrypt'])"));
});

/* Fund aus dem Spike (15.10.2026): Ein Beweis zum alten Token ging mit einem neuen Token hinaus (der Pod: „ath doesn't
   match“). Ohne Erneuerung gibt es nur ein Token je Anmeldung; Beweis und Kopfzeile lesen trotzdem dieselbe Variable. */
function athFehler(js) {
  const f = [];
  if (!/var token = zugang\.token;[\s\S]{0,200}dpopBeweis\(methode, adresse, token\)/.test(js)) f.push('token-nicht-festgehalten');
  if (/kopf\.set\('Authorization', 'DPoP ' \+ zugang\.token\)/.test(js)) f.push('kopfzeile-liest-zugang');
  return f;
}
test('[Pod-Brücke·ath] Beweis und Kopfzeile nehmen dasselbe Token', () => {
  assert.deepEqual(athFehler(lesen('pod/solid-oidc.js')), []);
});
test('[Pod-Brücke·ath·Rot-Beweis] eine Kopfzeile, die zugang neu liest, fällt', () => {
  const js = lesen('pod/solid-oidc.js');
  assert.ok(athFehler(js.replace("kopf.set('Authorization', 'DPoP ' + b.token)", "kopf.set('Authorization', 'DPoP ' + zugang.token)")).includes('kopfzeile-liest-zugang'));
});
