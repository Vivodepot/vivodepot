'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rechtsraum-Katalog, U2-ADR-121 Gesamtfassung Zug 6 — Punkt 8
   (Rechtsraum-Modul-Payload-Vertrag)
   ────────────────────────────────────────────────────────────────────────────
   Geprüft:
     1) validateRechtsraumModul — Strukturprüfung (leerer String = gültig).
     2) _rechtsraumModulUebersetzen — Namensraum-Schutz (Kellerwand 2, pro Typ
        tolerant), inkl. Positivfall „Modul liefert Inhalt zu einem BEKANNTEN
        Typ" (kein Namensraum-Verstoß).
     3) _rechtsraumModulEinbetten — Aktualisieren-statt-Einfrieren (Entscheidung 8).
     4) _rechtsraumModuleAusDepotAnmelden + _rechtsraumKatalogLesen-Fallback —
        „vom Kontrollfluss lesbar" (Entscheidung 8, Abweichung 2), der eingebaute
        Katalog hat aber immer Vorrang.
     5) Der signierte Vertrag ist ECHT wiederverwendet, nicht dupliziert:
        verifiziereTemplateKette (bereits bewiesene zweistufige JWS-Kette) prüft
        ein Rechtsraum-Modul-JWS unverändert — positiv, und negativ bei
        Fremdsignatur/Manipulation.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

/* ── 1 · Strukturprüfung ─────────────────────────────────────────────────────── */

function gueltigesModul() {
  return {
    schemaVersion: 47,
    rechtsraum: 'FR',
    moduleVersion: 1, sprache: 'de',
    typen: {
      'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: null, formvorschriften: null,
        fristenVorrang: { auswahlform: 'alle' }, zweck: ['vermoegenssorge', 'gesundheitssorge'] },
    },
  };
}

test('[Rechtsraum-Modul] ein vollständiges Modul validiert (leerer String = gültig)', () => {
  const { V } = ladeKern();
  assert.equal(V.validateRechtsraumModul(gueltigesModul()), '');
});

test('[Rechtsraum-Modul] rechtsraum "DE" ist reserviert, solange das Gerüst-Fach belegt ist', () => {
  const V = require('./load-kern-de-belegt.js').ladeKernDeBelegt();
  const m = Object.assign({}, gueltigesModul(), { rechtsraum: 'DE' });
  assert.match(V.validateRechtsraumModul(m), /reserviert/);
});

test('[Rechtsraum-Modul] fehlende/ungültige moduleVersion wird abgelehnt', () => {
  const { V } = ladeKern();
  assert.match(V.validateRechtsraumModul(Object.assign({}, gueltigesModul(), { moduleVersion: 0 })), /moduleVersion/);
  assert.match(V.validateRechtsraumModul(Object.assign({}, gueltigesModul(), { moduleVersion: undefined })), /moduleVersion/);
});

test('[Rechtsraum-Modul] leeres typen-Objekt wird abgelehnt', () => {
  const { V } = ladeKern();
  assert.match(V.validateRechtsraumModul(Object.assign({}, gueltigesModul(), { typen: {} })), /typen/);
});

test('[Rechtsraum-Modul] kein Objekt wird abgelehnt', () => {
  const { V } = ladeKern();
  assert.equal(typeof V.validateRechtsraumModul(null), 'string');
  assert.notEqual(V.validateRechtsraumModul(null), '');
});

/* ── 2 · Übersetzung + Namensraum-Schutz ──────────────────────────────────────── */

test('[Rechtsraum-Modul] Inhalt zu einem BEKANNTEN Typ (kein neuer Typ) wird übernommen — kein Namensraum-Verstoß', () => {
  const { V } = ladeKern();
  assert.ok(V._rechtsraumTypBekannt('enduring-power-of-attorney'), 'Positivkontrolle: der Typ ist wirklich bekannt');
  const { typen, verworfeneTypen } = V._rechtsraumModulUebersetzen(gueltigesModul());
  assert.deepEqual(verworfeneTypen, []);
  assert.equal(typen['enduring-power-of-attorney'].katalogVersion, 1);
  assert.deepEqual(typen['enduring-power-of-attorney'].zweck, ['vermoegenssorge', 'gesundheitssorge']);
});

test('[Rechtsraum-Modul] ein NEUER Typ OHNE tpl_-Namensraum wird verworfen (pro Typ, nicht das ganze Modul)', () => {
  const { V } = ladeKern();
  const modul = {
    schemaVersion: 47, rechtsraum: 'FR', moduleVersion: 1, sprache: 'de',
    typen: {
      'enduring-power-of-attorney': { katalogVersion: 1 },
      'mandat_de_protection_future': { katalogVersion: 1 },   // neuer Typ, KEIN tpl_-Präfix
    },
  };
  assert.ok(!V._rechtsraumTypBekannt('mandat_de_protection_future'), 'Positivkontrolle: wirklich kein bekannter Typ');
  const { typen, verworfeneTypen } = V._rechtsraumModulUebersetzen(modul);
  assert.ok(typen['enduring-power-of-attorney'], 'der bekannte Typ bleibt übernommen');
  assert.ok(!typen.mandat_de_protection_future, 'der unbenannt-neue Typ wird NICHT übernommen');
  assert.deepEqual(verworfeneTypen, [{ typ: 'mandat_de_protection_future', grund: 'namensraum' }]);
});

test('[Rechtsraum-Modul] ein NEUER Typ MIT tpl_-Namensraum wird übernommen', () => {
  const { V } = ladeKern();
  const modul = {
    schemaVersion: 47, rechtsraum: 'FR', moduleVersion: 1, sprache: 'de',
    typen: { 'tpl_mandat_de_protection_future': { katalogVersion: 1, zweck: ['vermoegenssorge'] } },
  };
  const { typen, verworfeneTypen } = V._rechtsraumModulUebersetzen(modul);
  assert.deepEqual(verworfeneTypen, []);
  assert.ok(typen.tpl_mandat_de_protection_future);
});

test('[Rechtsraum-Modul] ein Typ-Eintrag ohne katalogVersion wird verworfen (pro Typ)', () => {
  const { V } = ladeKern();
  const modul = {
    schemaVersion: 47, rechtsraum: 'FR', moduleVersion: 1, sprache: 'de',
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1 }, will: { wortlaut: 'x' } },
  };
  const { typen, verworfeneTypen } = V._rechtsraumModulUebersetzen(modul);
  assert.ok(typen['enduring-power-of-attorney']);
  assert.ok(!typen.will);
  assert.deepEqual(verworfeneTypen, [{ typ: 'will', grund: 'katalogVersion' }]);
});

/* ── 3 · Aktualisieren-statt-Einfrieren ────────────────────────────────────────── */

test('[Rechtsraum-Modul] ein neuer rechtsraum-Code wird angehängt', () => {
  const { V } = ladeKern();
  const bestehende = [{ rechtsraum: 'FR', moduleVersion: 1, sprache: 'de', typen: {} }];
  const liste = V._rechtsraumModulEinbetten(bestehende, { rechtsraum: 'AT', moduleVersion: 1, sprache: 'de', typen: {} });
  assert.equal(liste.length, 2);
});

test('[Rechtsraum-Modul] eine HÖHERE moduleVersion ERSETZT den Bestand desselben rechtsraum-Codes', () => {
  const { V } = ladeKern();
  const bestehende = [{ rechtsraum: 'FR', moduleVersion: 1, sprache: 'de', typen: { a: 1 } }];
  const liste = V._rechtsraumModulEinbetten(bestehende, { rechtsraum: 'FR', moduleVersion: 2, sprache: 'de', typen: { a: 2 } });
  assert.equal(liste.length, 1);
  assert.equal(liste[0].moduleVersion, 2);
  assert.equal(liste[0].typen.a, 2);
});

test('[Rechtsraum-Modul] eine GLEICHE oder NIEDRIGERE moduleVersion ändert nichts (kein Rückschritt)', () => {
  const { V } = ladeKern();
  const bestehende = [{ rechtsraum: 'FR', moduleVersion: 3, sprache: 'de', typen: { a: 'aktuell' } }];
  assert.deepEqual(V._rechtsraumModulEinbetten(bestehende, { rechtsraum: 'FR', moduleVersion: 3, sprache: 'de', typen: { a: 'gleich' } }), bestehende);
  assert.deepEqual(V._rechtsraumModulEinbetten(bestehende, { rechtsraum: 'FR', moduleVersion: 2, sprache: 'de', typen: { a: 'aelter' } }), bestehende);
});

/* ── 4 · Boot-Registrierung + Kontrollfluss-Lesbarkeit ────────────────────────── */

test('[Rechtsraum-Modul] _rechtsraumKatalogLesen liest ein geladenes Modul, wenn der eingebaute Katalog {typ, rechtsraum} nicht kennt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Test-Passwort-12345!');
  const { typen } = V._rechtsraumModulUebersetzen(gueltigesModul());
  V.getData().rechtsraumModule = [{ rechtsraum: 'FR', moduleVersion: 1, typen }];
  V._rechtsraumModuleAusDepotAnmelden(V.getData());
  assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'FR', 'fristenVorrang', 'auswahlform'), 'alle');
  assert.deepEqual(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'FR', 'zweck'), ['vermoegenssorge', 'gesundheitssorge']);
});

test('[Rechtsraum-Modul] der eingebaute Katalog hat IMMER Vorrang vor einem geladenen Modul', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Test-Passwort-12345!');
  // Ein (fingiertes) Modul, das versucht, unter 'DE' etwas zu behaupten — kann laut
  // validateRechtsraumModul gar nicht entstehen, aber die Registry selbst wird hier direkt
  // manipuliert, um zu beweisen, dass _rechtsraumKatalogLesen selbst auch bei Missbrauch der
  // Registry den eingebauten Katalog nie zugunsten eines Moduls verlässt.
  V.getData().rechtsraumModule = [{ rechtsraum: 'DE', moduleVersion: 1, sprache: 'de', typen: { will: { katalogVersion: 999, fristenVorrang: { auswahlform: 'erfunden' } } } }];
  V._rechtsraumModuleAusDepotAnmelden(V.getData());
  assert.equal(V._rechtsraumKatalogLesen('will', 'DE', 'fristenVorrang', 'auswahlform'), 'neueste',
    'der eingebaute Katalog gewinnt immer — ein Modul kann DE nicht überschreiben');
});

test('[Rechtsraum-Modul] unbekannter rechtsraum ohne geladenes Modul bleibt Unbekannt-Skip (Kellerwand 3, Zug 1 unverändert)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Test-Passwort-12345!');
  assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'FR', 'fristenVorrang', 'auswahlform'), undefined);
});

test('[Rechtsraum-Modul] _rechtsraumModuleAusDepotAnmelden überspringt defekte Einträge, ohne zu werfen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Test-Passwort-12345!');
  V.getData().rechtsraumModule = [null, { rechtsraum: 'FR' /* kein typen */ }, 'text', { rechtsraum: 'AT', typen: { x: 1 } }];
  let n;
  assert.doesNotThrow(() => { n = V._rechtsraumModuleAusDepotAnmelden(V.getData()); });
  assert.equal(n, 1, 'nur der eine strukturell brauchbare Eintrag zählt');
});

/* ── 4b · U2-ADR-401 (11.09.2026) — zwei Module DESSELBEN Codes, Verlust ohne Widerspruch ──
   Fund aus der Achsen-Erhebung („Achsen-Verriegelung"): `registry[m.rechtsraum]
   = m.typen;` ersetzte bis hierher das GANZE Fach bei jedem Modul — zwei Anbieter desselben
   Codes löschten sich gegenseitig aus, auch wenn sie unterschiedliche Gegenstände trugen. */

test('[Rechtsraum-Modul·Rot-Beweis U2-ADR-401] zwei Module desselben Codes, verschiedene Gegenstände: BEIDE bleiben erhalten', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Test-Passwort-12345!');
  V.getData().rechtsraumModule = [
    { rechtsraum: 'UK', moduleVersion: 1, anbieterId: 'anbieter-a', typen: {
      'enduring-power-of-attorney': { katalogVersion: 1, fristenVorrang: { auswahlform: 'alle' } } } },
    { rechtsraum: 'UK', moduleVersion: 1, anbieterId: 'anbieter-b', typen: {
      'living-will': { katalogVersion: 1, fristenVorrang: { auswahlform: 'alle' } } } },
  ];
  V._rechtsraumModuleAusDepotAnmelden(V.getData());
  assert.ok(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'UK', 'fristenVorrang', 'auswahlform'),
    'ROT ERWARTET, wenn falsch: anbieter-as Gegenstand ist verschwunden, obwohl anbieter-b ihn nie berührt hat');
  assert.ok(V._rechtsraumKatalogLesen('living-will', 'UK', 'fristenVorrang', 'auswahlform'),
    'anbieter-bs Gegenstand muss ebenfalls stehen — beide sind der Beleg, nicht nur einer');
  assert.deepEqual(V.getRechtsraumKonflikte(), [], 'unterschiedliche Gegenstände sind kein Widerspruch');
});

test('[Rechtsraum-Modul·Rot-Beweis U2-ADR-401] zwei Module desselben Codes, DERSELBE Gegenstand: Widerspruch gemeldet, nicht still überschrieben', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Test-Passwort-12345!');
  V.getData().rechtsraumModule = [
    { rechtsraum: 'UK', moduleVersion: 1, anbieterId: 'anbieter-a', typen: {
      'enduring-power-of-attorney': { katalogVersion: 1, fristenVorrang: { auswahlform: 'zuerst-a' } } } },
    { rechtsraum: 'UK', moduleVersion: 1, anbieterId: 'anbieter-b', typen: {
      'enduring-power-of-attorney': { katalogVersion: 1, fristenVorrang: { auswahlform: 'zuerst-b' } } } },
  ];
  V._rechtsraumModuleAusDepotAnmelden(V.getData());
  assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'UK', 'fristenVorrang', 'auswahlform'), 'zuerst-a',
    'das zuerst verarbeitete Modul behält den Gegenstand — kein stilles Umspringen auf das zweite');
  const konflikte = V.getRechtsraumKonflikte();
  assert.equal(konflikte.length, 1, 'ROT ERWARTET, wenn falsch: der Widerspruch bleibt unbemerkt, wie vor dem Fix');
  assert.deepEqual(konflikte[0], { rechtsraum: 'UK', typ: 'enduring-power-of-attorney', behalten: 'anbieter-a', verworfen: 'anbieter-b' });
});

test('[Rechtsraum-Modul·Gegenprobe U2-ADR-401] derselbe Anbieter, zwei Module desselben Codes: kein Widerspruch', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Test-Passwort-12345!');
  // Strukturell heute nicht erreichbar über den echten Docking-Weg (_rechtsraumModulEinbetten
  // dedupliziert bereits bei gleichem Anbieter+Code) — hier direkt an der Registry-Funktion
  // geprüft, damit sie für sich allein beweist, dass GLEICHER Anbieter nie als Widerspruch zählt.
  V.getData().rechtsraumModule = [
    { rechtsraum: 'UK', moduleVersion: 1, anbieterId: 'anbieter-a', typen: {
      'enduring-power-of-attorney': { katalogVersion: 1, fristenVorrang: { auswahlform: 'alt' } } } },
    { rechtsraum: 'UK', moduleVersion: 1, anbieterId: 'anbieter-a', typen: {
      'enduring-power-of-attorney': { katalogVersion: 1, fristenVorrang: { auswahlform: 'neu' } } } },
  ];
  V._rechtsraumModuleAusDepotAnmelden(V.getData());
  assert.equal(V._rechtsraumKatalogLesen('enduring-power-of-attorney', 'UK', 'fristenVorrang', 'auswahlform'), 'neu');
  assert.deepEqual(V.getRechtsraumKonflikte(), []);
});

/* ── 5 · Der signierte Vertrag ist wiederverwendet, nicht dupliziert ─────────── */

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-02T00:00:00Z';
const OPTS = { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK };

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function baueAnbieterCert(anbieterPubJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'modul/beispiel-fr', anbieterTyp: 'modul', anbieterName: 'Beispiel-Anbieter FR', publicKeyJwk: anbieterPubJwk },
  };
}

test('[Rechtsraum-Modul·Signatur] verifiziereTemplateKette (unverändert wiederverwendet) akzeptiert ein korrekt signiertes Modul', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueAnbieterCert(pubJwk), taSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modul = gueltigesModul();
  const modulJws = await V._signJWS(modul, anbieterSign, {});

  const r = await V.verifiziereTemplateKette(certJws, modulJws, OPTS);
  assert.equal(r.gueltig, true, 'Kette gültig: ' + (r.grund || ''));
  assert.equal(V.validateRechtsraumModul(r.nutzlast), '', 'die verifizierte Nutzlast besteht auch die Strukturprüfung');
  assert.equal(r.nutzlast.rechtsraum, 'FR');
});

test('[Rechtsraum-Modul·Signatur] ein Modul, signiert von einem FREMDEN Key, wird abgelehnt', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await anbieterKeypair();                // dieser Key steht im Cert
  const { privJwk: fremdPriv } = await anbieterKeypair();     // ein ANDERER Key signiert das Modul
  const certJws = await V._signJWS(baueAnbieterCert(pubJwk), taSign, {});
  const fremdSign = await V._jwsImportSignKey(fremdPriv);
  const modulJws = await V._signJWS(gueltigesModul(), fremdSign, {});

  const r = await V.verifiziereTemplateKette(certJws, modulJws, OPTS);
  assert.equal(r.gueltig, false);
  assert.match(r.grund, /Signatur ungültig/);
});

test('[Rechtsraum-Modul·Signatur] ein manipuliertes Modul (Rechtsraum nachträglich geändert) wird abgelehnt', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueAnbieterCert(pubJwk), taSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulJws = await V._signJWS(gueltigesModul(), anbieterSign, {});

  const teile = modulJws.split('.');
  const payload = JSON.parse(V._jwsB64uToString(teile[1]));
  payload.rechtsraum = 'AT';   // nachträglich manipuliert, Signatur bleibt die alte
  teile[1] = V._jwsB64uFromString(JSON.stringify(payload));
  const manipuliert = teile.join('.');

  const r = await V.verifiziereTemplateKette(certJws, manipuliert, OPTS);
  assert.equal(r.gueltig, false);
  assert.match(r.grund, /Signatur ungültig/);
});
