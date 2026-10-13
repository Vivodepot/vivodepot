'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   lese-app-pruefer-geltung.test.js — die Lese-App gibt einem Sprachmodul nie eine höhere Stufe als der Kern
   ────────────────────────────────────────────────────────────────────────────
   Befund LESE-APP-PRUEFER-GELTUNG-UNGEPRUEFT (HOCH, 11.10.2026). Der Kern hält den Geltungsbereich der Prüfstelle und
   die Bindung an die Originalsätze (`_pruefstufeFuerModul`: `_prueferGeltung`, `_geltungPasst`, `originaleSumme`). Die
   Lese-App trägt beim Öffnen die Stufe allein aus dem Zertifikat ein (`_textsatzModuleBelegPruefen`,
   `_modulPruefstufeAusZertifikat`). Ein Sprachmodul unter einer Prüfstelle, deren Geltung das Modul nicht trägt, bekommt
   dort `extern-geprueft:pruefer` und darf Zusicherungssätze übersetzen — die Sätze, die eine empfangende Stelle liest.
   Im Kern ist dasselbe Modul `extern-ungeprueft`.

   Die Probe am Befund ist erwartete Röte (todo), bis die Lese-App dieselbe Regel hält. Daneben steht fest, WAS heute rot
   ist: die Lese-App antwortet für passende und nicht passende Geltung gleich.

   Wegwerf-Schlüssel, der Anker kommt über `opts.ankerJwk`; nichts Echtes wird signiert. Dasselbe Bündel geht an beide Apps.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen, webcrypto } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

const JETZT = '2026-10-11T12:00:00Z';

async function edPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { pub: { kty: pub.kty, crv: pub.crv, x: pub.x, alg: 'Ed25519' }, priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
const cert = (id, typ, pub, extra) => ({
  '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
  issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
  credentialSubject: Object.assign({ anbieterId: id, anbieterName: 'Probe ' + id, anbieterTyp: typ, publicKeyJwk: pub }, extra || {}),
});

/* Anker → Prüfstelle (Zwischenstufe mit `rolle: 'pruefer'` und `geltung`) → Anbieter → Sprachmodul mit einem übersetzten
   Zusicherungssatz. `geltung === undefined`: das Zwischenzertifikat nennt keinen Geltungsbereich. */
async function buendel(geltung) {
  const { V } = ladeLesen();
  const sign = async (nutzlast, priv) => V._signJWS(nutzlast, await V._jwsImportSignKey(priv), {});
  const anker = await edPaar(), stelle = await edPaar(), kunde = await edPaar();
  const extra = { rolle: 'pruefer' };
  if (geltung !== undefined) extra.geltung = geltung;
  const kennung = 'strings:' + V.ZUSICHERUNGS_SCHLUESSEL_LESEN[0] + '.text';
  assert.equal(V._istZusicherungsKennung(kennung), true, 'Vorbedingung: ' + kennung + ' ist ein Zusicherungssatz');
  const modul = { modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: { [kennung]: 'A próba fordítása' } };
  const beleg = {
    ausstellerZertifikatJws: await sign(cert('pruefstelle/probe', 'vivodepot/pruefstelle', stelle.pub, extra), anker.priv),
    providerCredentialJws: await sign(cert('institution/probe-kunde', 'institution/probe', kunde.pub), stelle.priv),
    modulSignaturJws: await sign(modul, kunde.priv),
  };
  return { modul, beleg, opts: { jetzt: JETZT, ankerJwk: anker.pub } };
}
/* Was die Lese-App diesem Modul beim Öffnen zugesteht: die Stufe, mit der es Zusicherungssätze übersetzen darf, sonst null. */
async function stufeLesen(b) {
  const { V } = ladeLesen();
  const d = { textsatzModule: [Object.assign({}, b.modul, { beleg: b.beleg })] };
  await V._textsatzModuleBelegPruefen(d, b.opts);
  const info = V._textsatzModulBelegtInfo(d.textsatzModule[0]);
  return info ? info.pruefstufe : null;
}
/* Was der Kern für dieselbe Kette und dasselbe Modul entscheidet. */
async function stufeKern(b) {
  const { V } = ladeKern();
  const o = Object.assign({}, b.opts, { ausstellerZertifikatJws: b.beleg.ausstellerZertifikatJws });
  const certRes = await V.verifiziereProviderCredential(b.beleg.providerCredentialJws, o);
  assert.equal(certRes.gueltig, true, 'Vorbedingung: die Kette trägt im Kern (' + (certRes.grund || '') + ')');
  return V._pruefstufeFuerModul(certRes, b.modul, { app: 'kern', sprache: V._sprachBasisSprache(), wert: await V._originaleSummeKern() });
}

const PASSEND = Object.freeze({ modulTypen: ['textsatz'], sprachen: ['hu'] });
const NICHT_PASSEND = [
  ['ohne Geltungsbereich', undefined],
  ['andere Sprache', { modulTypen: ['textsatz'], sprachen: ['fr'] }],
  ['anderer Modultyp', { modulTypen: ['bereich'], sprachen: ['hu'] }],
  ['leere Liste', { modulTypen: [], sprachen: ['hu'] }],
  ['kein Objekt', 'alles'],
];

test('[Lese-App·Geltung·Vorbedingung] der Kern stuft jedes dieser Bündel als extern-ungeprueft ein und nennt die Geltung als Grund', async () => {
  for (const [was, geltung] of NICHT_PASSEND) {
    const k = await stufeKern(await buendel(geltung));
    assert.equal(k.stufe, 'extern-ungeprueft', was);
    assert.match(String(k.grund), /^geltung-/, was);
  }
});

test('[Lese-App·Geltung·Befund] eine Prüfstelle, deren Geltung das Sprachmodul nicht trägt, gibt ihm in der Lese-App keine Prüfer-Stufe',
  { todo: 'Befund LESE-APP-PRUEFER-GELTUNG-UNGEPRUEFT (HOCH): die Lese-App kennt den Geltungsbereich der Prüfstelle nicht' },
  async () => {
    for (const [was, geltung] of NICHT_PASSEND) {
      assert.equal(await stufeLesen(await buendel(geltung)), null, was + ': das Modul darf in der Lese-App Zusicherungssätze übersetzen');
    }
  });

test('[Lese-App·Geltung·Rot-Beweis] solange der Befund offen ist, antwortet die Lese-App für passende und nicht passende Geltung gleich', async () => {
  // Mit dem Fix kehrt sich diese Probe um: passend bleibt die Prüfer-Stufe (soweit die Originalsumme es trägt), jede nicht
  // passende Geltung ergibt null. Sie hält bis dahin fest, dass die Röte oben an der Geltung hängt und an nichts anderem.
  const passend = await stufeLesen(await buendel(PASSEND));
  assert.equal(passend, 'extern-geprueft:pruefer', 'Vorbedingung: die Kette selbst trägt, das Bündel ist nicht aus anderem Grund ohne Stufe');
  for (const [was, geltung] of NICHT_PASSEND) assert.equal(await stufeLesen(await buendel(geltung)), passend, was);
});
