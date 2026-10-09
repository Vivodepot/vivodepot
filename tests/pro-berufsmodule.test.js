'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Berufsmodule Steuerberatung und Kanzlei (P2, 02.10.2026, U2-ADR-243 §8) — je ein eigener Bereich und ein Auszug, zusammen eine Vorlage
   ────────────────────────────────────────────────────────────────────────────
   Die Vorlage wird SIGNIERT geliefert und über den Datei-Einlass als Liste zweier Bündel hinzugenommen
   (modulBuendelListeEinlassenGeprueft). Kein Produkt-Rezept trägt sie; das Test-Rezept ist pro-de/pro-en ohne Vorlage, die
   Vorlage kommt wie bei der Nutzerin über den Einlass. Signiert wird hier mit Wegwerf-Anker und Wegwerf-Schlüssel wie in
   tests/modul-einlassen-geprueft.test.js — die Produktivsignatur ist ein eigener Schritt außerhalb der Suite.
   Geprüft:
   (1) Moduldateien: jedes Feld nennt seine Quelle (Norm oder Kammer-Vorgabe); kein Feld fragt nach PIN, Passwort oder
       Kennwort; kein Notfall-, Ausfall- oder emergency-Wort; DE und EN haben dieselbe Struktur.
   (2) Im gebauten Produkt pro-de und pro-en: die Liste wird angenommen, der Bereich erscheint mit Beschriftungen in der
       Sprache des Produkts, der Auszug ist da.
   (3) Rundlauf: Wert eintragen, speichern, wieder öffnen — Wert und Vorlage sind da.
   Rot-Beweis (gemessen 02.10.2026): ein eingepflanztes „Notfall" in einer Beschriftung des Kanzlei-Bereichs macht die
   Moduldatei-Probe rot.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');
const { webcrypto } = require('./load-kern.js');

const VERZ = path.join(__dirname, '..', 'tools', 'berufsmodule');
const lies = (n) => JSON.parse(fs.readFileSync(path.join(VERZ, n), 'utf8'));
const BERUFE = [
  { name: 'steuerberatung', bereich: 'pro-steuerberatung', logik: 'pro-steuerberatung-vertretung', feld: 'tpl_general_representative', text: 'tpl_trusted_person_at_chamber' },
  { name: 'kanzlei', bereich: 'pro-kanzlei', logik: 'pro-kanzlei-vertretung', feld: 'tpl_attorney_representative', text: 'tpl_practice_winding_up_wish' },
];
const modul = (beruf, sprache) => ({ bereich: lies('vivodepot-pro-' + beruf.name + '-bereich-' + sprache + '.json'), logik: lies('vivodepot-pro-' + beruf.name + '-logikmodul-' + sprache + '.json') });
const LOAD_KERN = require.resolve('./load-kern.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-steuerberatung-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x }), jetzt: '2026-08-23T12:00:00Z' });

const felderVon = (m, id) => m.bereiche[id].sektionen.flatMap((s) => s.felder);
const ZUGANG = /\bpin\b|passwort|kennwort|password|passcode/i;
const ANLASS = /notfall|ausf[aä]ll|emergenc|unavailab/i;

for (const beruf of BERUFE) test(`[Moduldateien·${beruf.name}] Quelle je Feld, kein Zugangsgeheimnis, kein Notfall-Wort, DE und EN gleich gebaut`, () => {
  const BEREICH = beruf.bereich;
  const MODULE = { de: modul(beruf, 'de'), en: modul(beruf, 'en') };
  for (const sprache of ['de', 'en']) {
    const { bereich, logik } = MODULE[sprache];
    for (const f of felderVon(bereich, BEREICH)) {
      assert.ok(typeof f.quelle === 'string' && f.quelle.trim(), f.id + ': Quelle');
      assert.ok(!ZUGANG.test(JSON.stringify(f)), f.id + ': fragt nach einem Zugangsgeheimnis');
    }
    const sichtbar = JSON.stringify([bereich, logik]).replace(/"(id|klasse|knopfAttr|feld|sektor|feldId)":"[^"]*"/g, '');
    assert.ok(!ANLASS.test(sichtbar), sprache + ': Notfall- oder Ausfall-Wort');
  }
  const struktur = (m) => JSON.stringify(m.bereiche[BEREICH].sektionen.map((s) => [s.id, s.felder.map((f) => [f.id, f.typ, f.quelle, (f.unterFelder || []).map((u) => u.id)])]));
  assert.equal(struktur(MODULE.en.bereich), struktur(MODULE.de.bereich));
  assert.deepEqual(MODULE.en.logik.datenSchema, MODULE.de.logik.datenSchema);
});

function kern(slug) {
  const ziel = path.join(TMP, slug);
  if (!fs.existsSync(path.join(ziel))) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    konfektionieren({ ziel, slug, modulauswahl: [], vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: VP.modulDateienFuer(p) });
  }
  const html = fs.readdirSync(ziel, { recursive: true }).find((f) => String(f).endsWith('vivodepot.html'));
  process.env.KERN_HTML_PATH = path.join(ziel, String(html));
  delete require.cache[LOAD_KERN];
  // `blank`: das Produkt ist oben schon konfektioniert, ladeKern backt nichts dazu (tests/kern-html-path-absicht.test.js).
  try { return require(LOAD_KERN).ladeKern({ blank: true }); } finally { delete process.env.KERN_HTML_PATH; delete require.cache[LOAD_KERN]; }
}
async function vorlage(V, beruf, sprache) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const cert = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'vivodepot/test-berufsmodule', anbieterTyp: 'institution/test', anbieterName: 'Test', publicKeyJwk: pub } };
  const providerCredentialJws = await V._signJWS(cert, await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK), {});
  const sig = async (m) => V._signJWS(m, await V._jwsImportSignKey(priv), {});
  const m = modul(beruf, sprache);
  return [{ providerCredentialJws, modulSignaturJws: await sig(m.bereich) }, { providerCredentialJws, modulSignaturJws: await sig(m.logik) }];
}

for (const beruf of BERUFE) for (const slug of ['pro-de', 'pro-en']) {
  test(`[Produkt·${beruf.name}·${slug}] die signierte Vorlage wird als eine Liste angenommen; Bereich und Auszug sind da; Rundlauf ohne Verlust`, async () => {
    const BEREICH = beruf.bereich;
    const sprache = slug.endsWith('-en') ? 'en' : 'de';
    const { V } = kern(slug);
    await V.depotAnlegen('Berufsmodul-Steuerberatung-2026');
    V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
    const r = await V.modulBuendelListeEinlassenGeprueft(await vorlage(V, beruf, sprache), V.getData(), OPTS);
    assert.equal(r.angenommen, true, r.grund + ' ' + JSON.stringify((r.ergebnisse || []).map((e) => e.grund)));
    assert.deepEqual(r.ergebnisse.map((e) => e.typ), ['bereich', 'logikModul']);
    assert.deepEqual(r.ergebnisse.flatMap((e) => e.verworfene || []), [], 'nichts aus den Modulen verworfen');
    V._alleModulRegisterAusDepotAnmelden(V.getData());
    const b = V.bereicheAlle().find((x) => x.id === BEREICH);
    assert.ok(b, 'der Bereich erscheint');
    const feld = b.sektionen.flatMap((s) => s.felder).find((f) => f.id === beruf.feld);
    assert.equal(feld.label, felderVon(modul(beruf, sprache).bereich, BEREICH).find((f) => f.id === beruf.feld).label);
    assert.ok((V.getData().logikModule || []).some((m) => m && m.id === beruf.logik), 'der Auszug ist da');

    V.sektorFeldSetzen(BEREICH, beruf.text, 'Kanzlei Beispiel, Frau Muster');
    const umschlag = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
    // Selbst-Einlass-Sperre (seit v885): die Vorlage ist gegen den Test-Anker signiert und beim Öffnen gesperrt.
    // Gesperrt heißt nicht verloren: das Modul bleibt in der Datei, der Wert bleibt, und die Sperre benennt es.
    const k2 = kern(slug);
    await k2.V.depotLaden(umschlag, 'Berufsmodul-Steuerberatung-2026');
    assert.equal(k2.V.getData().sektoren[BEREICH][beruf.text], 'Kanzlei Beispiel, Frau Muster');
    assert.ok((k2.V.getData().bereichsModule || []).some((m) => m && m.bereiche && m.bereiche[BEREICH]), 'die gesperrte Vorlage bleibt in der Datei');
    assert.ok(k2.V.gesperrteDepotModule().some((g) => g.typ === 'bereich'), 'die Sperre benennt die Vorlage');
    // Ohne Sperre (wie nach ihrem Fall) reist die Vorlage mit der Datei.
    const k3 = kern(slug);
    k3.V.SELBST_EINLASS_GESPERRT = false;
    await k3.V.depotLaden(umschlag, 'Berufsmodul-Steuerberatung-2026');
    assert.ok(k3.V.bereicheAlle().some((x) => x.id === BEREICH), 'die Vorlage reist mit der Datei');
  });
}
