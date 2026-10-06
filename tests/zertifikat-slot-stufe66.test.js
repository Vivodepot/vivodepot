'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Schema-Stufe 66 — der Zertifikat-Slot (A337/A345, 19.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Entschieden am 19.08.2026: der signierte Beleg reist im Depot mit, damit
   ein Empfänger ihn nachprüfen kann. Bis dahin legte `importierteVorlagen[]`
   nur das ERGEBNIS einer Prüfung ab — die Lese-App hatte nichts zu prüfen,
   und eine Anzeige „geprüft und gültig" ohne Prüfgegenstand wäre eine
   Behauptung gewesen.

   DIE VIER ZUSICHERUNGEN, jede mit einem Fall, an dem sie brechen könnte:
     1 · Ein Bestandseintrag bekommt den Slot AUSDRÜCKLICH als `null` —
         „kein Beleg vorhanden" ist eine Aussage, ein fehlendes Feld ist keine.
     2 · Die Stufe ERFINDET keinen Beleg und ÜBERSCHREIBT keinen echten.
     3 · Sie ist idempotent.
     4 · Ein frischer Import legt BEIDE Stücke ab — Zug 2a hat gemessen, dass
         `templateJws` allein nicht prüfbar ist, weil der Anbieter-Schlüssel
         ausschliesslich im Zertifikat steht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-19T00:00:00Z';

function altDepot(vorlagen) {
  return { schemaVersion: 65, sektoren: {}, menschen: [], urheberschaft: {}, mappe: [],
    importierteVorlagen: vorlagen };
}

test('[Klasse-A][Stufe 66] ein Bestandseintrag bekommt `beleg` AUSDRÜCKLICH als null', () => {
  const { V } = ladeKern();
  const d = V.depotNormalisieren(altDepot([{ id: 'alt-1', wortlaut: 'Muster' }]));
  assert.ok(d.schemaVersion >= 66, 'Stufe hebt mindestens auf 66 (seit Kette Auftrag 2 läuft 67 in derselben Kette mit)');
  const e = d.importierteVorlagen[0];
  assert.ok(Object.prototype.hasOwnProperty.call(e, 'beleg'),
    'der Slot ist DA — „kein Beleg" ist eine Aussage, ein fehlendes Feld ist keine');
  assert.equal(e.beleg, null, 'und er ist null, nicht erfunden');
  assert.equal(e.wortlaut, 'Muster', 'alles Übrige bleibt unberührt');
});

test('[Klasse-A][Stufe 66] ein ECHTER Beleg wird nicht mit null überschrieben', () => {
  const { V } = ladeKern();
  const echt = { templateJws: 'aaa.bbb.ccc', providerCredentialJws: 'ddd.eee.fff' };
  const d = V.depotNormalisieren(altDepot([{ id: 'a', beleg: echt }, { id: 'b', wortlaut: 'x' }]));
  assert.deepEqual(d.importierteVorlagen[0].beleg, echt, 'der echte Beleg überlebt');
  assert.equal(d.importierteVorlagen[1].beleg, null, 'der Eintrag ohne bekommt null');
});

test('[Klasse-A][Stufe 66] idempotent — ein zweiter Lauf ändert nichts', () => {
  const { V } = ladeKern();
  const echt = { templateJws: 'aaa.bbb.ccc', providerCredentialJws: 'ddd.eee.fff' };
  const eins = V.depotNormalisieren(altDepot([{ id: 'a', beleg: echt }, { id: 'b' }]));
  const zwei = V.depotNormalisieren(JSON.parse(JSON.stringify(eins)));
  assert.deepEqual(zwei.importierteVorlagen[0].beleg, echt);
  assert.equal(zwei.importierteVorlagen[1].beleg, null);
  assert.equal(zwei.schemaVersion, eins.schemaVersion);
});

test('[Rot-Beleg][Stufe 66] ohne die Stufe fehlt der Slot — die Probe misst etwas', () => {
  // Die Gegenrichtung: ein Eintrag, der die Stufe NICHT durchlaufen hat, trägt ihn nicht.
  const roh = altDepot([{ id: 'alt-1', wortlaut: 'Muster' }]);
  assert.ok(!Object.prototype.hasOwnProperty.call(roh.importierteVorlagen[0], 'beleg'),
    'Ausgangszustand ohne Slot — sonst prüfte der Test oben nichts');
});

test('[Klasse-A][Stufe 66] ein frischer Import legt BEIDE Stücke ab', async () => {
  const { V: G } = ladeGenerator();
  const { V: I } = ladeIssuer();
  const { V: B } = ladeKern();
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const anbieter = G.baueAnbieter({
    anbieterName: 'Rechtsanwaltskammer Musterstadt', rechtsform: 'KdöR', ustId: 'DE987654321',
    strasse: 'Kammerweg 1', plz: '54321', ort: 'Musterstadt', land: 'Deutschland',
    kontaktName: 'K. Ammer', kontaktFunktion: 'Geschaeftsstelle', kontaktEmail: 'stelle@rak.example',
    kontaktTelefon: '+49 30 7654321', bereich: 'bildung', useCase: 'Probe zu Stufe 66 — Zertifikat-Slot.',
  });
  const sub = await G.baueSubmissionSigniert({
    anbieter, publicKeyJwk: pubJwk,
    felder: [{ feldname: 'Kammernummer', feldtyp: 'text', bereich: 'bildung', gruppe: 'Qualifikation' }],
    ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false,
    wortlaut: 'Muster-Wortlaut einer Fortbildungsbescheinigung.',
    wortlautQuelle: { behoerde: 'RAK Musterstadt', titel: 'Muster', lizenz: '§ 5 UrhG' },
  }, privJwk);
  const d = I.submissionZuAnbieterDaten(sub);
  const vc = I.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, templates: d.templates,
    issuanceDate: '2026-08-01T12:00:00Z', expirationDate: '2027-08-01T12:00:00Z',
  });
  const certJws = await I.stelleProviderCredentialAus(vc, await I._jwsImportSignKey(SENTINEL_PRIVATE_JWK));
  const bundle = I.baueAuslieferungsBundle(certJws, d.templatesJws[0]);

  const teil = B._importEingabeAufteilen(JSON.stringify(bundle));
  const plan = await B.importPlanGeprueft('provider-credential', teil.text,
    Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
  assert.equal(plan.ungueltig, false, 'Anker-Fall: die Kette prüft (' + (plan.grund || '') + ')');
  assert.ok(plan.beleg, 'der Plan trägt den Beleg');

  await B.depotAnlegen('Stufe66-Probe-Passwort-2026!');
  B.akteurSelbstErklaeren('Probe');
  B.importAnwenden(plan, {});
  const eintrag = (B.getData().importierteVorlagen || [])[0];
  assert.ok(eintrag, 'ein Eintrag ist entstanden');
  assert.ok(eintrag.beleg, 'und er trägt den Beleg');
  assert.equal(eintrag.beleg.templateJws, d.templatesJws[0], 'das anbieter-signierte Template');
  assert.equal(eintrag.beleg.providerCredentialJws, certJws, 'UND das TA-signierte Zertifikat');
  /* Der Grund, warum BEIDE nötig sind, und er ist gemessen (Zug 2a): der
     Anbieter-Public-Key steckt ausschliesslich im Zertifikat. */
  const certNutzlast = JSON.parse(Buffer.from(certJws.split('.')[1], 'base64url').toString('utf8'));
  const tplNutzlast = JSON.parse(Buffer.from(d.templatesJws[0].split('.')[1], 'base64url').toString('utf8'));
  assert.ok(JSON.stringify(certNutzlast).includes(pubJwk.x), 'der Anbieter-Schlüssel steht im Zertifikat');
  assert.ok(!JSON.stringify(tplNutzlast).includes(pubJwk.x),
    'und NICHT im templateJws — darum reicht das Template allein nicht');
});

test('[Rot-Beleg][Stufe 66] ohne geprüfte Template-Signatur entsteht KEIN Beleg', async () => {
  /* Ein Beleg, der die Prüfung nicht bestanden hat, ist keiner. Ohne `templateJws`
     im Bündel läuft der Import weiter (die cert-attestierten Werte bleiben), aber
     der Slot bleibt leer. */
  const { V: G } = ladeGenerator();
  const { V: I } = ladeIssuer();
  const { V: B } = ladeKern();
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const anbieter = G.baueAnbieter({
    anbieterName: 'RAK', rechtsform: 'KdöR', ustId: 'DE1', strasse: 'S 1', plz: '12345', ort: 'O',
    land: 'Deutschland', kontaktName: 'N', kontaktFunktion: 'F', kontaktEmail: 'a@b.example',
    kontaktTelefon: '+49 1', bereich: 'bildung', useCase: 'Rot-Beleg zu Stufe 66.',
  });
  const sub = await G.baueSubmissionSigniert({
    anbieter, publicKeyJwk: pubJwk,
    felder: [{ feldname: 'Kammernummer', feldtyp: 'text', bereich: 'bildung', gruppe: 'Q' }],
    ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false,
  }, privJwk);
  const d = I.submissionZuAnbieterDaten(sub);
  const vc = I.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, templates: d.templates,
    issuanceDate: '2026-08-01T12:00:00Z', expirationDate: '2027-08-01T12:00:00Z',
  });
  const certJws = await I.stelleProviderCredentialAus(vc, await I._jwsImportSignKey(SENTINEL_PRIVATE_JWK));
  const teil = B._importEingabeAufteilen(JSON.stringify({ providerCredentialJws: certJws }));
  const plan = await B.importPlanGeprueft('provider-credential', teil.text,
    Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
  assert.equal(plan.beleg, undefined, 'ohne geprüftes templateJws entsteht kein Beleg');
});
