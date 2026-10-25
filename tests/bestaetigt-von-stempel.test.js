'use strict';
/* ═══════════════════════════════════════════════════════════
   Wer bestätigt hat, steht neben der eingelesenen Angabe (21.10.2026, Nachtrag zu U2-ADR-005)
   ───────────────────────────────────────────────────────────
   Eine Angabe aus einem geprüften Anbieter-Zertifikat zeigte „eingelesen (Geprüftes Anbieter-Zertifikat)“, also das
   Format, nicht die Stelle. Gehalten wird hier:
   1. Der Stempel trägt `bestaetigtVon` mit Name und Kennung der Stelle aus dem GEPRÜFTEN Zertifikat; die Zeile neben der
      Angabe nennt sie. Rot-Beweis: ohne den Stempel-Schritt steht wieder das Format-Etikett da.
   2. Ein Name in den Angaben selbst ändert nichts; nur das Zertifikat zählt.
   3. Ein ungültiges Zertifikat lässt nichts herein, also auch keinen Namen.
   4. Den Namen übernimmt nur ein Plan, den die Prüfung selbst gebaut hat; ein Plan mit eigenem `bestaetigtVon` (auch mit
      `signiert: true`) trägt ihn nicht in den Stempel.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-06-19T00:00:00Z';
const SEKTOR = 'finance', FELD = 'policyContractNumber', WERT = 'BV-2026-0815';

function baueCert(publicKeyJwk, subjekt) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: Object.assign({ anbieterId: 'beratung-nord', anbieterName: 'Beratung Nord', publicKeyJwk,
      felder: [{ sektor: SEKTOR, feld: FELD, wert: WERT }] }, subjekt || {}),
  };
}
async function zertifikat(V, subjekt, signKey) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return V._signJWS(baueCert(pub, subjekt), signKey || await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK), {});
}
async function depot(V) {
  await V.depotAnlegen('bestaetigt-von-probe-2026');
  V.akteurSelbstErklaeren('Hedwig Brandt');
  return V;
}
async function einlesen(V, jws) {
  const plan = await V.importPlanGeprueft('provider-credential', jws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  return { plan, erg: V.importAnwenden(plan, {}) };
}
const letzterStempel = (V) => { const l = V.getData().urheberschaft[SEKTOR][FELD]; return l[l.length - 1]; };

/* ── 1. Stempel und Zeile ────────────────────────────────── */
test('[Bestätigt] die Zeile neben der Angabe nennt die Stelle aus dem geprüften Zertifikat', async () => {
  const V = await depot(ladeKern().V);
  const { plan, erg } = await einlesen(V, await zertifikat(V));
  assert.equal(plan.ungueltig, false);
  assert.equal(erg.gesetzt, 1);
  const st = letzterStempel(V);
  assert.equal(st.verifiziert, true);
  assert.deepEqual({ ...st.bestaetigtVon }, { anbieterId: 'beratung-nord', anbieterName: 'Beratung Nord' });
  const zeile = V.urheberschaftZeileHTML(SEKTOR, FELD);
  assert.ok(zeile.includes(V.STRINGS.urheberBestaetigtVon + ' Beratung Nord'), zeile);
  assert.ok(!zeile.includes(V.STRINGS.importProviderQuelle), 'das Format-Etikett weicht dem Namen der Stelle');
});

test('[Bestätigt·Rot-Beweis] ohne den Stempel-Schritt steht wieder nur das Format-Etikett da', async () => {
  const kern = fs.readFileSync(HTML_PATH, 'utf8');
  const alt = 'if (plan && _bestaetigtePlaene.has(plan) && plan.bestaetigtVon) extra.bestaetigtVon = plan.bestaetigtVon;';
  assert.equal(kern.split(alt).length, 2, 'Vorbedingung: der Schritt steht genau einmal da');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-bestaetigt-'));
  try {
    const p = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(p, kern.replace(alt, ''));
    const V = await depot(ladeKern({ htmlPfad: p, backen: true }).V);
    await einlesen(V, await zertifikat(V));
    assert.equal(letzterStempel(V).bestaetigtVon, undefined);
    assert.ok(!V.urheberschaftZeileHTML(SEKTOR, FELD).includes('Beratung Nord'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ── 2. Nur das Zertifikat zählt ─────────────────────────── */
test('[Bestätigt] ein Name in den Angaben selbst ändert den Stempel nicht', async () => {
  const V = await depot(ladeKern().V);
  const jws = await zertifikat(V, { felder: [{ sektor: SEKTOR, feld: FELD, wert: WERT, anbieterName: 'Fremde Stelle' }] });
  await einlesen(V, jws);
  assert.equal(letzterStempel(V).bestaetigtVon.anbieterName, 'Beratung Nord');
});

test('[Bestätigt] ein Zertifikat ohne Namen der Stelle gibt keinen Namen, die Zeile bleibt beim Format-Etikett', async () => {
  const V = await depot(ladeKern().V);
  await einlesen(V, await zertifikat(V, { anbieterName: '   ' }));
  assert.equal(letzterStempel(V).bestaetigtVon, undefined);
  assert.ok(V.urheberschaftZeileHTML(SEKTOR, FELD).includes(V.STRINGS.importProviderQuelle));
});

/* ── 3. Ungültiges Zertifikat ────────────────────────────── */
test('[Bestätigt] ein nicht vom Anker signiertes Zertifikat lässt weder Angabe noch Namen herein', async () => {
  const V = await depot(ladeKern().V);
  const fremd = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const fremdSign = await V._jwsImportSignKey(await webcrypto.subtle.exportKey('jwk', fremd.privateKey));
  const { plan, erg } = await einlesen(V, await zertifikat(V, null, fremdSign));
  assert.equal(plan.ungueltig, true);
  assert.equal(plan.bestaetigtVon, undefined);
  assert.equal(erg.gesetzt, 0);
});

/* ── 4. Unsignierter Weg ─────────────────────────────────── */
test('[Bestätigt] ein Plan, der bestaetigtVon selbst mitbringt (auch mit signiert: true), trägt es nie in den Stempel', async () => {
  const V = await depot(ladeKern().V);
  const plan = { formatId: 'x', quelleLabel: 'Datei', signiert: true, bestaetigtVon: { anbieterId: 'a', anbieterName: 'Untergeschoben' },
    zeilen: [{ sektorId: SEKTOR, feldId: FELD, wert: WERT, status: 'neu' }], listen: [], register: [] };
  V.importAnwenden(plan, {});
  const st = letzterStempel(V);
  assert.equal(st.bestaetigtVon, undefined);
  assert.ok(!V.urheberschaftZeileHTML(SEKTOR, FELD).includes('Untergeschoben'));
});
