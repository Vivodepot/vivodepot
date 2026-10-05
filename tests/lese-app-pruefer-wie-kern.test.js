'use strict';
/* Die Lese-App prüft Zertifikate und Modulsignaturen mit denselben Funktionen wie der Kern — dieselbe Eingabe, dieselbe
   Antwort. Zwei Stellen gaben bis 04.10.2026 zwei Antworten:

   1. `_modulPruefstufeAusZertifikat`: Für einen Prüfer unter der eigenen Treuhand (U2-ADR-441) sagte der Kern
      „extern-geprueft:pruefer“, die Lese-App „extern-geprueft:herausgeber“ — ihr fehlte der Zweig
      `_istPrueferUnterTreuhand`. Folge: die Lese-App verweigerte einem vom Prüfer bestätigten Textsatz die übersetzten
      Zusicherungssätze, die der Kern zeigt.
   2. `_verifiziereTemplateSignatur`: Der Kern liefert {gueltig, nutzlast, anbieter} und fängt einen Wurf ab; die
      Lese-App reichte das Ergebnis von `_verifyJWS` samt `anbieterName` durch und fing nichts ab.

   Dazu die Regel für den angezeigten Anbieter: Er kommt aus dem geprüften Zertifikat, nie aus einem Feld, das das
   Depot über sich selbst trägt (`importierteVorlagen[].anbieterName` ist Selbstauskunft).

   Den Wortgleich-Zustand hält danach der Klassenwächter (tools/krypto-block-propagation-pruefen.js, Soll Kern+Lese);
   diese Probe hält das Verhalten. Alle Schlüssel erzeugt die Probe selbst; der Anker kommt über `opts.ankerJwk`. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen, webcrypto } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');
const fs = require('node:fs');
const { LESEN_PATH } = require('./load-lesen.js');

const JETZT = '2026-08-20T12:00:00Z';
const TEMPLATE = { felder: [{ feldname: 'Kammer', feldtyp: 'text', bereich: 'identitaet', gruppe: 'Zulassung' }] };

async function edPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { pub: { kty: pub.kty, crv: pub.crv, x: pub.x, alg: 'Ed25519' }, priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function cert(publicKeyJwk, cs) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://vivodepot.de/credentials/v1'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: Object.assign({ anbieterId: 'institution/probe-kammer', anbieterTyp: 'institution/kammer-de', publicKeyJwk }, cs),
  };
}
/* Ein Beleg: Anker → Zertifikat des Anbieters → Template. `cs` setzt Felder im Zertifikat (etwa den Namen). */
async function beleg(cs, opt) {
  const { V } = ladeLesen();
  const anker = await edPaar(), anbieter = await edPaar();
  const certJws = await V._signJWS(cert(anbieter.pub, cs), await V._jwsImportSignKey(anker.priv), {});
  const signer = opt && opt.fremderSigner ? (await edPaar()).priv : anbieter.priv;
  const templateJws = await V._signJWS(TEMPLATE, await V._jwsImportSignKey(signer), {});
  return { certJws, templateJws, opts: { jetzt: JETZT, ankerJwk: anker.pub } };
}
const plain = (x) => JSON.parse(JSON.stringify(x));

test('[Lese = Kern] Prüfstufe aus dem Zertifikat: derselbe certRes, dieselbe Stufe — auch für den Prüfer unter der Treuhand', () => {
  const K = ladeKern().V, L = ladeLesen().V;
  const faelle = [
    { ausstellerAnbieterTyp: 'vivodepot/ausgabestelle', ausstellerAnbieterId: 'vivodepot-ausgabestelle',
      nutzlast: { credentialSubject: { rolle: 'pruefer', anbieterTyp: 'pruefstelle/probe', anbieterId: 'pruefstelle-probe' } } },
    { ausstellerAnbieterTyp: 'vivodepot/ausgabestelle', ausstellerAnbieterId: 'vivodepot-ausgabestelle',
      nutzlast: { credentialSubject: { anbieterTyp: 'vivodepot/vorlagen', anbieterId: 'vivodepot-vorlagen' } } },
    { ausstellerAnbieterTyp: 'vivodepot/pruefstelle', ausstellerAnbieterId: 'pruefstelle-x', ausstellerRolle: 'pruefer',
      nutzlast: { credentialSubject: { anbieterTyp: 'institution/x' } } },
    { nutzlast: { credentialSubject: { anbieterTyp: 'institution/x' } } },
    { ausstellerAnbieterTyp: 'vivodepot/ausgabestelle', ausstellerAnbieterId: 'fremde-stelle',
      nutzlast: { credentialSubject: { rolle: 'pruefer', anbieterTyp: 'pruefstelle/probe' } } },
  ];
  for (const f of faelle) assert.equal(L._modulPruefstufeAusZertifikat(f), K._modulPruefstufeAusZertifikat(f), JSON.stringify(f));
  assert.equal(L._modulPruefstufeAusZertifikat(faelle[0]), 'extern-geprueft:pruefer');
});

test('[Lese = Kern] Template-Signatur: dieselbe Antwort für eine gültige und eine fremd signierte Vorlage', async () => {
  const K = ladeKern().V, L = ladeLesen().V;
  for (const opt of [{}, { fremderSigner: true }]) {
    const b = await beleg({ anbieterName: 'Kammer Probe' }, opt);
    const cr = await L.verifiziereProviderCredential(b.certJws, b.opts);
    assert.equal(cr.gueltig, true, 'Vorbedingung: das Zertifikat trägt (' + (cr.grund || '') + ')');
    const k = plain(await K._verifiziereTemplateSignatur(cr.nutzlast, b.templateJws, b.opts));
    const l = plain(await L._verifiziereTemplateSignatur(cr.nutzlast, b.templateJws, b.opts));
    assert.deepEqual(l, k, JSON.stringify(opt));
  }
});

test('[Lese = Kern] Template-Signatur: ein Wurf beim Prüfen wird zu „ungültig“, nicht zu einer Ausnahme', async () => {
  const K = ladeKern().V, L = ladeLesen().V;
  const b = await beleg({ anbieterName: 'Kammer Probe' });
  const cr = await L.verifiziereProviderCredential(b.certJws, b.opts);
  const kaputt = Object.assign({}, cr.nutzlast, { credentialSubject: Object.assign({}, cr.nutzlast.credentialSubject, { publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: '!!' } }) });
  const k = plain(await K._verifiziereTemplateSignatur(kaputt, b.templateJws, b.opts));
  const l = plain(await L._verifiziereTemplateSignatur(kaputt, b.templateJws, b.opts));
  assert.equal(k.gueltig, false);
  assert.deepEqual(l, k);
});

function depotMit(b, anbieterNameImDepot) {
  return {
    schemaVersion: 69, sektoren: { identitaet: { tpl_kammer: 'RAK' } },
    feldDefinitionen: [{ sektorId: 'identitaet', feldId: 'tpl_kammer', typ: 'text', label: 'Kammer', abschnitt: 'Zulassung' }],
    importierteVorlagen: [{ id: 'v1', vorlageId: 'probe/zulassung', sektorId: 'identitaet', feldIds: ['tpl_kammer'],
      anbieterName: anbieterNameImDepot, beleg: { providerCredentialJws: b.certJws, templateJws: b.templateJws } }],
  };
}

test('[Lese-App · Anbieter] der angezeigte Name kommt aus dem Zertifikat, nicht aus der Selbstauskunft des Depots', async () => {
  const L = ladeLesen().V;
  const mitName = await beleg({ anbieterName: 'Kammer aus dem Zertifikat' });
  const k1 = await L.vorlagenPruefstandBerechnen(depotMit(mitName, 'Selbstauskunft GmbH'), mitName.opts);
  assert.equal(k1.tpl_kammer.zustand, 'gueltig');
  assert.equal(k1.tpl_kammer.anbieter, 'Kammer aus dem Zertifikat');
  const ohneName = await beleg({});
  const k2 = await L.vorlagenPruefstandBerechnen(depotMit(ohneName, 'Selbstauskunft GmbH'), ohneName.opts);
  assert.equal(k2.tpl_kammer.zustand, 'gueltig');
  assert.notEqual(k2.tpl_kammer.anbieter, 'Selbstauskunft GmbH', 'ein Name, den das Depot über sich selbst trägt, wird nicht als geprüft angezeigt');
  assert.equal(k2.tpl_kammer.anbieter, null);
});

test('[Lese = Kern · Rot-Beweis] eine Lese-App ohne den Zweig „Prüfer unter der Treuhand“ gibt eine andere Stufe als der Kern — die Probe sieht es', () => {
  const html = fs.readFileSync(LESEN_PATH, 'utf8');
  const a = "    if (_istPrueferUnterTreuhand(certRes)) return 'extern-geprueft:pruefer';\n";
  assert.equal(html.split(a).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const L = ladeLesen({ html: html.replace(a, '') }).V, K = ladeKern().V;
  const pruefer = { ausstellerAnbieterTyp: 'vivodepot/ausgabestelle', ausstellerAnbieterId: 'vivodepot-ausgabestelle',
    nutzlast: { credentialSubject: { rolle: 'pruefer', anbieterTyp: 'pruefstelle/probe', anbieterId: 'pruefstelle-probe' } } };
  assert.notEqual(L._modulPruefstufeAusZertifikat(pruefer), K._modulPruefstufeAusZertifikat(pruefer));
});
