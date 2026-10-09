'use strict';
/* Ein Berufsmodul ab Werk reist unter der Selbst-Einlass-Sperre und gilt (Pro-Konzept C2, 06.10.2026).
   Die Kundin wählt ihr Berufsmodul beim Kauf; das Produkt bringt es im Rezept mit, wie Erbschein und Zugang zum Recht.
   Die Sperre (SELBST_EINLASS_GESPERRT) sperrt beim Öffnen jedes Datei-Modul, das nicht ab Werk kam. Diese Probe hält,
   dass sie das gekaufte Modul NICHT trifft: Pro darf die eigenen Module nicht sperren.
   Kein Test-Anker: das Modul kommt unsigniert über das Rezept des gebauten Produkts, wie die übrigen Ab-Werk-Module.
   Gegenstück: tests/pro-berufsmodule.test.js (Datei-Einlass, dort ist die Vorlage nach dem Wiederöffnen gesperrt).
   Zweiter Fall: eine Datei trägt schon eine Kopie des Moduls (früher über den Einlass hinzugenommen, gegen den Test-Anker
   signiert, wie in tests/pro-berufsmodule.test.js) und wird in einem Pro geöffnet, das dasselbe Modul ab Werk trägt. Die
   Sperre erkennt die Kopie am Fingerabdruck als ab Werk und sperrt sie nicht.
   Rot-Beweis (gemessen 06.10.2026): ohne die Ab-Werk-Ausnahme in _depotModuleSperreMarkieren wird der zweite Fall rot;
   und dasselbe Produkt ohne das Modul im Rezept zeigt den Bereich nach dem Öffnen nicht (letzte Probe). */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const { webcrypto } = require('./load-kern.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const VERZ = path.join(__dirname, '..', 'tools', 'berufsmodule');
// Ein erfundenes, als Probe erkennbares Passwort für Wegwerf-Depots, zur Laufzeit gebaut (Geheimnis-Scan: kein Literal mit hoher Entropie).
const PASSWORT = 'NURPROBE-' + 'beruf'.repeat(4);
const BERUF = { name: 'steuerberatung', bereich: 'pro-steuerberatung', logik: 'pro-steuerberatung-vertretung', text: 'tpl_trusted_person_at_chamber' };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-pro-beruf-abwerk-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const gebaut = new Map();
function produktKern(slug, mitBeruf) {
  const schluessel = slug + (mitBeruf ? '+beruf' : '');
  if (!gebaut.has(schluessel)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    const sprache = slug.endsWith('-en') ? 'en' : 'de';
    const beruf = mitBeruf ? ['bereich', 'logikmodul'].map((t) => path.join(VERZ, 'vivodepot-pro-' + BERUF.name + '-' + t + '-' + sprache + '.json')) : [];
    const r = konfektionieren({
      ziel: path.join(TMP, schluessel), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: [...modulDateienFuer(p), ...beruf],
    });
    gebaut.set(schluessel, path.join(r.ordner, 'vivodepot.html'));
  }
  return require(LOAD_KERN).ladeKern({ htmlPfad: gebaut.get(schluessel) });
}
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x }), jetzt: '2026-08-23T12:00:00Z' });
async function signierteVorlage(V, sprache) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const cert = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'vivodepot/test-berufsmodule', anbieterTyp: 'institution/test', anbieterName: 'Test', publicKeyJwk: pub } };
  const providerCredentialJws = await V._signJWS(cert, await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK), {});
  const lies = (t) => JSON.parse(fs.readFileSync(path.join(VERZ, 'vivodepot-pro-' + BERUF.name + '-' + t + '-' + sprache + '.json'), 'utf8'));
  const sig = async (m) => V._signJWS(m, await V._jwsImportSignKey(priv), {});
  return [{ providerCredentialJws, modulSignaturJws: await sig(lies('bereich')) }, { providerCredentialJws, modulSignaturJws: await sig(lies('logikmodul')) }];
}
const hatBereich = (V) => V.bereicheAlle().some((b) => b.id === BERUF.bereich);
const hatAuszug = (V) => V._logikModuleAlle(V.getData()).some((m) => m && m.id === BERUF.logik);

for (const slug of ['pro-de', 'pro-en']) {
  test('[Pro·Berufsmodul·ab Werk·' + slug + '] reist unter aktiver Sperre und gilt', async () => {
    const { V } = produktKern(slug, true);
    await V.depotAnlegen(PASSWORT);
    V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
    assert.ok(hatBereich(V) && hatAuszug(V), 'ein frisches Depot sieht Bereich und Auszug');
    V.sektorFeldSetzen(BERUF.bereich, BERUF.text, 'Kammer Beispiel, Herr Muster');
    const umschlag = JSON.parse(JSON.stringify(await V.depotSerialisieren()));

    const { V: W } = produktKern(slug, true);
    assert.equal(W.SELBST_EINLASS_GESPERRT, true, 'Vorbedingung: die Sperre ist an');
    await W.depotLaden(umschlag, PASSWORT);
    assert.equal(W.getData().sektoren[BERUF.bereich][BERUF.text], 'Kammer Beispiel, Herr Muster', 'der Wert bleibt');
    assert.ok(hatBereich(W), 'der Bereich gilt nach dem Öffnen');
    assert.ok(hatAuszug(W), 'der Auszug gilt nach dem Öffnen');
    assert.deepEqual(W.gesperrteDepotModule().map((g) => g.kennung), [], 'die Sperre trifft das gekaufte Modul nicht');
  });
}

test('[Pro·Berufsmodul·ab Werk·pro-de] eine Datei mit eingelassener Kopie öffnet ab Werk ohne Sperre', async () => {
  const { V } = produktKern('pro-de', false);
  await V.depotAnlegen(PASSWORT);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  const r = await V.modulBuendelListeEinlassenGeprueft(await signierteVorlage(V, 'de'), V.getData(), OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: die Kopie kommt über den Einlass in die Datei');
  V.sektorFeldSetzen(BERUF.bereich, BERUF.text, 'Kammer Beispiel, Herr Muster');
  const umschlag = JSON.parse(JSON.stringify(await V.depotSerialisieren()));

  const { V: W } = produktKern('pro-de', true);
  assert.equal(W.SELBST_EINLASS_GESPERRT, true, 'Vorbedingung: die Sperre ist an');
  await W.depotLaden(umschlag, PASSWORT);
  assert.ok((W.getData().bereichsModule || []).length > 0, 'Vorbedingung: die Datei trägt die Kopie');
  assert.deepEqual(W.gesperrteDepotModule().map((g) => g.typ + ':' + g.kennung), [], 'die Kopie des gekauften Moduls ist nicht gesperrt');
  assert.ok(hatBereich(W) && hatAuszug(W), 'Bereich und Auszug gelten');
  assert.equal(W.getData().sektoren[BERUF.bereich][BERUF.text], 'Kammer Beispiel, Herr Muster', 'der Wert bleibt');
});

test('[Pro·Berufsmodul·ab Werk·Rot-Beweis] ohne das Modul im Rezept fehlt der Bereich nach dem Öffnen', async () => {
  const { V } = produktKern('pro-de', true);
  await V.depotAnlegen(PASSWORT);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  V.sektorFeldSetzen(BERUF.bereich, BERUF.text, 'Kammer Beispiel, Herr Muster');
  const umschlag = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
  const { V: W } = produktKern('pro-de', false);
  await W.depotLaden(umschlag, PASSWORT);
  assert.equal(hatBereich(W) && hatAuszug(W), false, 'die Probe oben hängt am Rezept, nicht an der Datei');
});
