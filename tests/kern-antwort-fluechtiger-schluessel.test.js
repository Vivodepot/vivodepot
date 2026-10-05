'use strict';
/* Der flüchtige ECDH-Schlüssel der Antwort (Schlüsselpaar-Verfahren, `antwortVerschluesselnSchluessel` im Kern) wird nie
   herausgeholt: nur sein öffentlicher Teil reist als `epk`, und der ist in WebCrypto immer exportierbar. Darum entsteht er
   mit extractable:false — ein `exportKey` auf den privaten Teil wirft.

   Gemessen wird am echten Aufruf: die Probe hört `generateKey` mit und hält den Schlüssel fest, den der Kern bekommt.
   Die Gegenprobe: die Antwort öffnet in der Lese-App weiter. Der Rot-Beweis: eine Fassung mit extractable:true wird gemeldet.
   Alle Schlüssel erzeugt die Probe selbst. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

async function empfangsPaar() {
  const p = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  return { pub: await webcrypto.subtle.exportKey('jwk', p.publicKey), priv: await webcrypto.subtle.exportKey('jwk', p.privateKey) };
}

/* Verschlüsselt eine Antwort und liefert die ECDH-Paare, die der Kern dabei erzeugt hat. */
async function mitgehoert(V, pub) {
  const gesehen = [];
  const orig = webcrypto.subtle.generateKey;
  webcrypto.subtle.generateKey = async function (alg, ...rest) {
    const k = await orig.call(this, alg, ...rest);
    if (alg && alg.name === 'ECDH') gesehen.push(k);
    return k;
  };
  try {
    const umschlag = await V.antwortVerschluesselnSchluessel({ felder: [] }, pub, { vorgang: 'probe-vorgang' });
    return { umschlag, gesehen };
  } finally {
    webcrypto.subtle.generateKey = orig;
  }
}
async function verletzungen(V, pub) {
  const { gesehen } = await mitgehoert(V, pub);
  const v = [];
  if (gesehen.length !== 1) v.push('nicht-genau-ein-fluechtiges-paar:' + gesehen.length);
  for (const k of gesehen) {
    if (k.privateKey.extractable !== false) v.push('fluechtiger-privater-teil-herausholbar');
    try { await webcrypto.subtle.exportKey('jwk', k.privateKey); v.push('export-des-privaten-teils-gelang'); } catch (e) { /* so soll es sein */ }
  }
  return v;
}

test('[Kern · Antwort] der flüchtige Schlüssel ist nicht herausholbar; ein exportKey auf ihn wirft', async () => {
  const { pub } = await empfangsPaar();
  assert.deepEqual(await verletzungen(ladeKern().V, pub), []);
});

test('[Kern · Antwort] Gegenprobe: die Antwort öffnet in der Lese-App mit dem privaten Empfangsschlüssel', async () => {
  const { pub, priv } = await empfangsPaar();
  const { umschlag } = await mitgehoert(ladeKern().V, pub);
  assert.ok(umschlag.epk && !('d' in umschlag.epk), 'nur der öffentliche Teil reist');
  const ds = await ladeLesen().V.antwortEntschluesselnSchluessel(umschlag, priv);
  assert.deepEqual(JSON.parse(JSON.stringify(ds.felder)), []);
});

test('[Kern · Antwort · Rot-Beweis] eine Fassung mit extractable:true wird gemeldet', async () => {
  const html = fs.readFileSync(KERN, 'utf8');
  const a = "  const fluechtig = await crypto.subtle.generateKey(\n    { name: 'ECDH', namedCurve: ANTWORT_ECDH_KURVE }, false, ['deriveBits']);";
  assert.equal(html.split(a).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-fluechtig-'));
  try {
    const pfad = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(pfad, html.replace(a, a.replace(', false,', ', true,')));
    const { pub } = await empfangsPaar();
    const v = await verletzungen(ladeKern({ htmlPfad: pfad, backen: true }).V, pub);
    assert.ok(v.includes('fluechtiger-privater-teil-herausholbar') && v.includes('export-des-privaten-teils-gelang'), v.join());
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
