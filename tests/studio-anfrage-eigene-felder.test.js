'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio · eigene Felder einer Vorlage in der signierten Anfrage (Weg A, 22.11.2026; U2-ADR-366-Nachtrag)
   ─────────────────────────────────────────────────────────────────
   „Antworten empfangen“ übernimmt neben den Katalogfeldern auch die eigenen Felder der Vorlage, in der internen Form
   `bereich.tpl_<slug>`. Die signierte Anfrage setzt die Anbieterkennung aus dem Zertifikat ein (`bereich.<anbieterId>:tpl_<slug>`);
   der Weg ohne Zertifikat lässt sie weg und nennt sie. Die Antwortliste beschriftet sie mit dem Feldnamen.
     E1  Slug-Gleichheit: `_anfrageTplSlug` im Studio rechnet wie `_tplSlug` im Kern
     E2  Übernahme: Katalogfeld mit Katalog-Kennung, eigenes Feld intern, ein Feld ohne Bereich des Katalogs wird genannt
     E3  signiert: Anbieterkennung eingesetzt; ohne Zertifikat: eigene Felder weg, aber genannt
     E4  Beschriftung beider Formen mit dem Feldnamen
     E5  Kette: die Kennung aus dem Studio löst im Kern bei importierter, geprüfter Vorlage auf
   ROT-BEWEIS: ein Studio-Slug ohne „ß → ss“ weicht vom Kern ab und wird rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');
const { ladeKern, webcrypto } = require('./load-kern.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const path = require('node:path');
/* Der Kern gibt _tplSlug nicht nach außen; die Probe nimmt die Funktion aus dem Quelltext der Hauptanwendung. */
function kernSlug() {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const m = kern.match(/function _tplSlug\(text\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'Vorbedingung: _tplSlug im Kern');
  return new Function(m[0] + '\nreturn _tplSlug;')();
}
const NAMEN = ['Mitgliedsnummer', 'Straße und Hausnummer', 'Größe (cm)', 'Übernahme-Datum', 'Ärztin/Arzt', '2. Wohnsitz', '  Leer zeichen  ', 'Fuß-ball & Co.'];

function slugBefunde(studioSlug, kernSlug) {
  return NAMEN.filter((n) => studioSlug(n) !== kernSlug(n)).map((n) => n + ': Studio „' + studioSlug(n) + '“ ≠ Kern „' + kernSlug(n) + '“');
}

test('[Eigene Felder·E1] der Slug des Studios rechnet wie der des Kerns', () => {
  const g = ladeGenerator();
  assert.deepEqual(slugBefunde(g.sandbox._anfrageTplSlug, kernSlug()), []);
});

function mitVorlage() {
  const g = ladeGenerator();
  g.V.STATE.felder = [
    { feldname: 'Vorname', feldtyp: 'text', pflicht: true, bereich: 'identity', gruppe: 'Person' },
    { feldname: 'Hausarzt-Praxis', feldtyp: 'text', pflicht: true, bereich: 'health', gruppe: 'Aufnahme' },
    { feldname: 'Eigenes ohne Bereich', feldtyp: 'text', pflicht: false, bereich: 'Gesundheit', gruppe: 'Aufnahme' },
  ];
  g.V.STATE.vorlageName = 'Aufnahme'; g.V.STATE.vorlageZweck = 'Aufnahme in der Praxis';
  return g;
}

test('[Eigene Felder·E2–E4] Übernahme, Anbieterkennung im signierten Weg, Auslassen ohne Zertifikat, Beschriftung', () => {
  const g = mitVorlage();
  const ohne = g.sandbox.anfrageAusVorlageUebernehmen();
  const ANF_AS = vm.runInContext('ANF_AS', g.sandbox);
  const kennungen = ANF_AS.felder.map((f) => f.kennung);
  assert.ok(kennungen.includes('identity.givenName'), 'Katalogfeld mit Katalog-Kennung: ' + kennungen.join(', '));
  assert.ok(kennungen.includes('health.tpl_hausarzt_praxis'), 'eigenes Feld in der internen Form: ' + kennungen.join(', '));
  assert.deepEqual(Array.from(ohne), ['Eigenes ohne Bereich']);
  const hinweis = String(g.document.getElementById('aa-aus-vorlage').textContent);
  assert.match(hinweis, /Zertifikat Ihrer Stelle/); assert.match(hinweis, /Hausarzt-Praxis/); assert.match(hinweis, /Eigenes ohne Bereich/);
  // E3 signiert
  const signiert = g.sandbox.anfrageVorlagenKennungenSetzen(ANF_AS.felder, 'praxis/muster').map((f) => f.kennung);
  assert.ok(signiert.includes('health.praxis/muster:tpl_hausarzt_praxis'), signiert.join(', '));
  assert.ok(signiert.includes('identity.givenName'));
  // E3 ohne Zertifikat
  const r = g.sandbox.anfrageOhneVorlagenKennungen(ANF_AS.felder);
  assert.deepEqual(Array.from(r.felder, (f) => f.kennung), ['identity.givenName']);
  assert.deepEqual(Array.from(r.weg, (f) => f.kennung), ['health.tpl_hausarzt_praxis']);
  // E4 Beschriftung
  assert.equal(g.sandbox._aaLabel('health.tpl_hausarzt_praxis'), 'Hausarzt-Praxis');
  assert.equal(g.sandbox._aaLabel('health.praxis/muster:tpl_hausarzt_praxis'), 'Hausarzt-Praxis');
  // Die Prüfung der Anfrage kennt das eigene Feld der geöffneten Vorlage (keine Warnung „nicht im Feldkatalog“).
  assert.equal(g.sandbox.anfrageFeldkatalogKennt('health.praxis/muster:tpl_hausarzt_praxis', { anfrage: {} }), true);
  assert.equal(g.sandbox.anfrageFeldkatalogKennt('health.praxis/muster:tpl_gibt_es_nicht', { anfrage: {} }), false);
  // Die Bindung des signierten Wegs steht im Quelltext.
  assert.match(HTML, /state\.anfrage\.felder = anfrageVorlagenKennungenSetzen\(state\.anfrage\.felder, haupt\.anbieterId\);/);
  assert.match(HTML, /const ohneEigene = anfrageOhneVorlagenKennungen\(state\.anfrage\.felder\);/);
});

/* E5 — die Kette bis in den Kern, mit dem Test-Anker der Suite wie in tests/vorlagen-rueckweg.test.js. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const PRUEF = { ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x } };
const ANBIETER = 'praxis/muster';

test('[Eigene Felder·E5] die Kennung aus dem Studio löst im Kern bei importierter, geprüfter Vorlage auf', async () => {
  const g = mitVorlage();
  g.sandbox.anfrageAusVorlageUebernehmen();
  const ANF_AS = vm.runInContext('ANF_AS', g.sandbox);
  const kennungen = g.sandbox.anfrageVorlagenKennungenSetzen(ANF_AS.felder, ANBIETER).map((f) => f.kennung);
  const eigene = kennungen.find((k) => k.indexOf(':tpl_') > 0);
  assert.ok(eigene, 'Vorbedingung: eine eigene Kennung');

  const { V } = ladeKern();
  await V.depotAnlegen('Eigene-Felder-Probe-2026!');
  V.akteurSelbstErklaeren('Anna Probe');
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const sign = await V._jwsImportSignKey(await webcrypto.subtle.exportKey('jwk', kp.privateKey));
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2099-11-30T12:00:00Z',
    credentialSubject: { anbieterId: ANBIETER, anbieterName: 'Praxis Muster', anbieterTyp: 'institution/praxis', publicKeyJwk: pub },
  };
  const certJws = await V._signJWS(cert, await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK), {});
  const tpl = { felder: g.V.STATE.felder.filter((f) => f.bereich === 'health').map((f) => ({ feldname: f.feldname, feldtyp: 'text', bereich: 'health' })),
    wortlaut: 'Aufnahme.', wortlautQuelle: { behoerde: ANBIETER, titel: 'Aufnahme', lizenz: 'Probe' } };
  const plan = await V.importPlanGeprueft('provider-credential', certJws, Object.assign({ templateJws: await V._signJWS(tpl, sign, {}) }, PRUEF));
  assert.equal(plan.ungueltig, false, 'Vorbedingung: Vorlage geprüft importierbar');
  V.importAnwenden(plan, {});
  const d = V.getData();
  d.sektoren.health = d.sektoren.health || {};
  d.sektoren.health.tpl_hausarzt_praxis = 'Praxis Dr. Muster';

  const anfrage = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Praxis Muster', zweck: 'Aufnahme', grundlage: 'Behandlungsvertrag', vorgang: 'AUF-2026-1122',
    gestelltAm: '2026-11-22', gueltigBis: '2099-12-31', felder: [{ kennung: eigene, zweck: 'Aufnahme', pflicht: true }],
    antwort: { art: 'einmalpasswort', an: 'aufnahme@praxis.example' } };
  const umschlag = { format: 'vivodepot-anfrage@1', anfrage, zertifikat: certJws, anfrageJws: await V._signJWS(anfrage, sign, {}) };
  const ds = await V.anfrageAntwortDatensatzGeprueft(umschlag, { sensibel: false, pruefOpts: PRUEF });
  assert.deepEqual(ds.unbekannt || [], [], 'die Studio-Kennung bleibt nicht unbekannt');
  assert.equal(Object.fromEntries(ds.felder.map((e) => [e.kennung, e.wert]))[eigene], 'Praxis Dr. Muster');
});

test('[Eigene Felder·Rot-Beweis] ein Studio-Slug ohne „ß → ss“ weicht vom Kern ab', () => {
  const a = "'\\u00df': 'ss' }[m]))";
  assert.ok(HTML.includes(a), 'Vorbedingung: die Stelle im Studio-Slug');
  const g = ladeGenerator({ html: HTML.replace(a, "'\\u00df': 's' }[m]))") });
  assert.ok(slugBefunde(g.sandbox._anfrageTplSlug, kernSlug()).some((x) => x.startsWith('Straße')));
});
