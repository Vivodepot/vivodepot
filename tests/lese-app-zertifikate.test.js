'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A318 Zug 2 — die Lese-App prüft die Zertifikate importierter Vorlagen
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND, der diesen Zug ausgelöst hat (17.08.2026): die Lese-App prüfte
   keine Zertifikate. Kein Produktiv-Anker, nur der Test-Sentinel; die
   Prüffunktion wurde von nirgends aufgerufen, der Kommentar nannte die
   Schicht „SCHLAFEND". Ein Empfänger konnte nicht feststellen, ob eine
   Vorlage von einem zertifizierten Anbieter stammt.

   WARUM ER ERST JETZT FAHRBAR WAR: bis Schema 66 (A337/A345) legte der Kern
   nur das ERGEBNIS seiner Prüfung ab. Der Empfänger hatte nichts
   nachzuprüfen. Seit Schema 66 reist der Beleg mit — und erst damit ist eine
   Anzeige „geprüft und gültig" eine Aussage statt einer Behauptung.

   VIER ZUSTÄNDE, nicht drei: der Auftrag verlangt, dass „nicht prüfbar"
   weder wie „gültig" noch wie „ungültig" aussieht. Damit ist „ungültig" ein
   eigener Zustand — ein manipulierter Beleg ist eine Aussage, ein fehlender
   ist die Abwesenheit einer Aussage.

   Der Anker wird wie überall über `opts.ankerJwk` injiziert (Test-Sentinel);
   der produktive Anker steht eingebettet in der Datei und wird hier gegen den
   Kern gehalten, nicht nachgebaut.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen, webcrypto } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

// ⚠ TEST-ONLY: Private-Key zum eingebetteten Sentinel — signiert das TA-Zertifikat im Test.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-20T12:00:00Z';

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey),
    privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

function baueCert(publicKeyJwk, opt) {
  const cs = { anbieterId: 'institution/rak-koeln', anbieterName: 'Rechtsanwaltskammer Köln',
    anbieterTyp: 'institution/kammer-de' };
  if (publicKeyJwk) cs.publicKeyJwk = publicKeyJwk;
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://vivodepot.de/credentials/v1'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de',
    issuanceDate: '2026-05-31T12:00:00Z',
    expirationDate: (opt && opt.bis) || '2027-11-30T12:00:00Z',
    credentialSubject: cs,
  };
}

const TEMPLATE = { felder: [{ feldname: 'Kammer', feldtyp: 'text', bereich: 'identitaet', gruppe: 'Zulassung' }] };

async function belegBauen(opt) {
  const { V } = ladeLesen();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk, opt), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(TEMPLATE, anbieterSign, {});
  return { V, beleg: { providerCredentialJws: certJws, templateJws } };
}

function depotMit(beleg) {
  return {
    schemaVersion: 69, sektoren: { identitaet: { tpl_kammer: 'RAK Köln' } },
    feldDefinitionen: [{ sektorId: 'identitaet', feldId: 'tpl_kammer', typ: 'text', label: 'Kammer', abschnitt: 'Zulassung' }],
    importierteVorlagen: [{ id: 'v1', vorlageId: 'rak/zulassung', sektorId: 'identitaet',
      feldIds: ['tpl_kammer'], anbieterName: 'Rechtsanwaltskammer Köln', beleg: beleg }],
  };
}

/* ══ 2a · Der Anker ══════════════════════════════════════════════════════ */

test('[2a] die Lese-App trägt denselben produktiven Anker wie der Kern — statisch, ohne Verbindung', () => {
  const { V } = ladeLesen();
  const { V: K } = ladeKern();
  /* Feldweise, NICHT deepEqual: beide Anwendungen laufen in eigenen vm-Kontexten, ihre
     Objekte haben verschiedene Prototypen — `deepEqual` schlüge an, ohne dass ein Wert
     abweicht. Der Gegenstand ist der Schlüssel, nicht die Objektidentität. */
  for (const k of ['kty', 'crv', 'alg', 'x', 'kid']) {
    assert.equal(V.TRUST_AUTHORITY_PUBLIC_JWK[k], K.TRUST_AUTHORITY_PUBLIC_JWK[k],
      'Anker weicht in ' + k + ' ab — ein zweiter Wert wäre eine zweite Vertrauensentscheidung');
  }
  assert.notEqual(V.TRUST_AUTHORITY_PUBLIC_JWK.x, V.TEST_SENTINEL_PUBLIC_JWK.x,
    'der Sentinel ist NICHT der Laufzeit-Anker');
});

test('[2a] der Laufzeit-Anker gilt ohne opts — der Sentinel nur injiziert', async () => {
  const { V, beleg } = await belegBauen();
  // Gegen den PRODUKTIVEN Anker (kein opts.ankerJwk): ein Sentinel-signiertes Cert trägt nicht.
  const ohne = await V.verifiziereProviderCredential(beleg.providerCredentialJws, { jetzt: JETZT });
  assert.equal(ohne.gueltig, false, 'ohne Injektion wird gegen den produktiven Anker geprüft');
  assert.equal(ohne.istTestAnker, false);
  const mit = await V.verifiziereProviderCredential(beleg.providerCredentialJws,
    { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(mit.gueltig, true, 'mit Injektion trägt dasselbe Cert: ' + (mit.grund || ''));
  assert.equal(mit.istTestAnker, true);
});

/* ══ 2b/2c · Die vier Zustände ═══════════════════════════════════════════ */

test('[2c·1] gültiges Zertifikat, gültige Template-Signatur → geprüft und gültig', async () => {
  const { V, beleg } = await belegBauen();
  const karte = await V.vorlagenPruefstandBerechnen(depotMit(beleg), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['tpl_kammer'].zustand, 'gueltig', JSON.stringify(karte['tpl_kammer']));
  assert.equal(karte['tpl_kammer'].anbieter, 'Rechtsanwaltskammer Köln');
  assert.equal(karte['vorlage:v1'].zustand, 'gueltig', 'auch über die Vorlagen-Kennung erreichbar');
});

test('[2c·2] abgelaufenes Zertifikat, Signatur trägt → abgelaufen, NICHT ungültig', async () => {
  const { V, beleg } = await belegBauen({ bis: '2026-01-01T00:00:00Z' });
  const karte = await V.vorlagenPruefstandBerechnen(depotMit(beleg), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['tpl_kammer'].zustand, 'abgelaufen', JSON.stringify(karte['tpl_kammer']));
});

test('[2c·3 · Rot-Beleg] manipulierte Template-Signatur → ungültig, und zwar benannt', async () => {
  const { V, beleg } = await belegBauen();
  const t = beleg.templateJws.split('.');
  t[2] = t[2].slice(0, -2) + (t[2].slice(-2) === 'AA' ? 'BB' : 'AA');
  const kaputt = { providerCredentialJws: beleg.providerCredentialJws, templateJws: t.join('.') };
  const karte = await V.vorlagenPruefstandBerechnen(depotMit(kaputt), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['tpl_kammer'].zustand, 'ungueltig', JSON.stringify(karte['tpl_kammer']));
});

test('[2c·3b · Rot-Beleg] manipuliertes ZERTIFIKAT → ungültig (die erste Stufe trägt schon nicht)', async () => {
  const { V, beleg } = await belegBauen();
  const c = beleg.providerCredentialJws.split('.');
  c[2] = c[2].slice(0, -2) + (c[2].slice(-2) === 'AA' ? 'BB' : 'AA');
  const kaputt = { providerCredentialJws: c.join('.'), templateJws: beleg.templateJws };
  const karte = await V.vorlagenPruefstandBerechnen(depotMit(kaputt), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['tpl_kammer'].zustand, 'ungueltig');
});

test('[2c·4] Bestandseintrag ohne Beleg → nicht prüfbar, und das ist kein Verdacht', async () => {
  const { V } = ladeLesen();
  const karte = await V.vorlagenPruefstandBerechnen(depotMit(null), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['tpl_kammer'].zustand, 'nicht-pruefbar');
  assert.equal(karte['tpl_kammer'].grund, 'kein-beleg');
});

test('[2c·4b · Gegenprobe] ein halber Beleg ist keiner — nicht prüfbar statt ungültig', async () => {
  const { V, beleg } = await belegBauen();
  const karte = await V.vorlagenPruefstandBerechnen(
    depotMit({ providerCredentialJws: beleg.providerCredentialJws }),
    { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['tpl_kammer'].zustand, 'nicht-pruefbar',
    'ohne Template gibt es nichts zu prüfen — das ist keine gescheiterte Prüfung');
});

/* ══ Die Anzeige: vier Zustände, vier Sätze ══════════════════════════════ */

test('[2c] die vier Sätze sind verschieden und benennen ihren Zustand im Text', () => {
  const { V } = ladeLesen();
  const s = V.STRINGS;
  const saetze = [s.vorlageGeprueft, s.vorlageAbgelaufen, s.vorlageUngueltig, s.vorlageNichtPruefbar];
  assert.equal(new Set(saetze).size, 4, 'kein Satz doppelt — sonst unterscheidet nur die Farbe (WCAG 1.4.1)');
  assert.match(s.vorlageNichtPruefbar, /kein Fehler/,
    'ein fehlender Beleg ist kein Verdacht, und der Satz sagt es');
  assert.match(s.vorlageGeprueft, /\{anbieter\}/, 'der Anbieter wird genannt, nicht behauptet');
  for (const t of saetze) assert.ok(t.length > 20, 'ein Zustandssatz, kein Etikett');
});

test('[2c] die Marke steht am Abschnitt und trägt die Klasse ihres Zustands', () => {
  const { V } = ladeLesen();
  assert.equal(V.vorlagenMarkeHTML([{ feldId: 'tpl_kammer' }]), '',
    'ohne gerechneten Stand steht dort NICHTS — nicht eine falsche Marke');
  V._vorlagenStandSetzen({ tpl_kammer: { zustand: 'gueltig', anbieter: 'Kammer X' } });
  const h = V.vorlagenMarkeHTML([{ feldId: 'tpl_kammer' }]);
  assert.match(h, /vorlage-marke--gueltig/);
  assert.match(h, /Kammer X/);
  V._vorlagenStandSetzen({ tpl_kammer: { zustand: 'ungueltig' } });
  assert.match(V.vorlagenMarkeHTML([{ feldId: 'tpl_kammer' }]), /vorlage-marke--ungueltig/);
  V._vorlagenStandSetzen({ tpl_kammer: { zustand: 'nicht-pruefbar' } });
  assert.match(V.vorlagenMarkeHTML([{ feldId: 'tpl_kammer' }]), /vorlage-marke--nicht-pruefbar/);
  V._vorlagenStandSetzen(null);
  assert.equal(V.vorlagenMarkeHTML([{ feldId: 'unbekannt' }]), '',
    'ein Feld ohne Vorlagen-Bezug bekommt keine Marke — es ist keine unbelegte Vorlage, sondern gar keine');
});

test('[Wortlaut] die Schicht heißt nicht mehr SCHLAFEND', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  /* Die Aussage, nicht das Wort: der Kommentar DARF die alte Lage erzählen (er tut es,
     als Begründung, warum sie erst jetzt endet) — er darf sie nur nicht behaupten. */
  assert.ok(html.indexOf('ist in der\n// Lese-App SCHLAFEND') < 0 && html.indexOf('Lese-App SCHLAFEND') < 0,
    'die Behauptung „diese Schicht ist schlafend" steht nicht mehr da');
  assert.ok(html.indexOf('vorlagenPruefstandBerechnen(') > 0, 'die Prüfung wird aufgerufen');
});
