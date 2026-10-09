'use strict';
/* Institutionssignierte Module wirken nach dem Wiederöffnen (Schutz-Wagen S6, 05.10.2026; Entscheidung der Produktverantwortung E2:
   „institutionssigniert wirkt ohne Rückfrage“). Ein Modul, dessen Kette die Ladeprüfung beim Öffnen nachgeprüft hat
   (`_depotModuleBelegPruefen` → `modulBelegGeprueft`), steht nicht unter der Selbst-Einlass-Sperre — gleich welcher Typ und welche
   Prüfstufe, solange die Kette gültig und die Nutzlast inhaltsgleich ist. Die Schutzliste bleibt: Schutz-Kennungen übernimmt weiter nur
   ein Ab-Werk-Modul oder ein intern signiertes (`textsatzModulPruefen`), und Zusicherungen setzen nur die Prüfstufen in
   TEXTSATZ_ZUSICHERUNG_PRUEFSTUFEN.
   Fälle der Abnahme: ein Format-Modul einer Institution (FIM-Vorführung) und ein ungarisches Sprachbündel einer Institution
   („ungarische Hebammen“), beide in der Standard-App nach Wiederöffnen wirksam. Wegwerf-Anker und -Schlüssel, kein Schlüsselmaterial
   (Muster tests/ladepruefung-alle-modultypen.test.js). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const ANKER_PRIV = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ANKER_PRIV.x }), jetzt: '2026-08-23T12:00:00Z' });
const HAFTUNG = 'strings:dokFussHaftung.text';
const QUELLCODE = 'strings:fussQuellcode.text';

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function zert(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Hebammenverband (Probe)', publicKeyJwk },
  };
}
const signieren = async (V, nutzlast, jwk) => V._signJWS(nutzlast, await V._jwsImportSignKey(jwk), {});

const formatModul = () => ({ modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'probe-fim-institution', richtung: 'import',
  sektor: 'health', label: 'FIM-Probe einer Institution', leser: 'json', zuordnung: [{ feld: 'medicationOngoing', ziel: 'meds' }] });
const hebammen = (texte) => ({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: texte || { [QUELLCODE]: 'Forráskód' } });
const logikModul = () => ({
  modulTyp: 'logikModul', id: 'probe-institution-s6', titel: 'Probe', sektor: 'advanceCare', herkunft: 'test-anbieter',
  datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } },
  abschnitte: [{ titel: 'Abschnitt', bloecke: [{ typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '—' }] }],
  dokAusgabe: { h1: 'Probe', unterschrift: false, unterschriftErsatzHinweis: 'Ersatz.' },
});

async function eingelassen(V, nutzlast) {
  const anbieter = await paar();
  const providerCredentialJws = await signieren(V, zert('institution/hebammen-probe', anbieter.pub), ANKER_PRIV);
  const modulSignaturJws = await signieren(V, nutzlast, anbieter.priv);
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws, modulSignaturJws }), d, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: das signierte Modul wird eingelassen — ' + r.grund);
  return d;
}
/* Wie depotLaden: neue Objekte aus der Datei, Vertrauen geleert, Ladeprüfung, dann die Sperre. */
async function wiederOeffnen(V, d, aendern) {
  const g = JSON.parse(JSON.stringify(d));
  if (aendern) aendern(g);
  V.setData(g);
  V._TEXTSATZ_BELEGT.clear(); V._TEXTSATZ_INTERN_VOLL.clear(); V._TEXTSATZ_SIGNIERT_VOLL.clear();
  await V._depotModuleBelegPruefen(g, true, OPTS);
  await V._textsatzModuleBelegPruefen(g, OPTS);
  V._depotModuleSperreMarkieren(g, true);
  return g;
}

test('[S6·Vorbedingung] die Sperre steht (bis S5); S6 öffnet nur den nachgeprüft signierten Weg', () => {
  const { V } = ladeKern();
  assert.equal(V.SELBST_EINLASS_GESPERRT, true);
});

for (const [fach, bau] of [['formatModule', formatModul], ['textsatzModule', () => hebammen()], ['logikModule', logikModul]]) {
  test('[S6·' + fach + '] institutionssigniert, unverändert: nach dem Wiederöffnen nicht gesperrt', async () => {
    const { V } = ladeKern();
    const g = await wiederOeffnen(V, await eingelassen(V, bau()));
    assert.ok(V.modulBelegGeprueft(g[fach][0]), 'Vorbedingung: Ladeprüfung erkennt die Kette');
    assert.deepEqual(V.gesperrteDepotModuleNamen(g), []);
  });
  test('[S6·' + fach + '·Rot-Beweis] gleiche Kette, Inhalt geändert: gesperrt', async () => {
    const { V } = ladeKern();
    const g = await wiederOeffnen(V, await eingelassen(V, bau()), (x) => {
      const m = x[fach][0];
      if (fach === 'formatModule') m.label = 'GEÄNDERT'; else if (fach === 'logikModule') m.titel = 'GEÄNDERT'; else m.texte[QUELLCODE] = 'GEÄNDERT';
    });
    assert.equal(V.gesperrteDepotModule(g).length, 1);
  });
}

test('[S6·FIM] das Format-Modul einer Institution steht nach dem Wiederöffnen als Import-Kanal bereit', async () => {
  const { V } = ladeKern();
  const g = await wiederOeffnen(V, await eingelassen(V, formatModul()));
  assert.ok(V.importFormatFuerId('probe-fim-institution', g), 'Kanal angemeldet');
});

test('[S6·FIM·Rot-Beweis] dasselbe Format-Modul ohne Beleg, mit selbst gesetzten Vertrauensfeldern: kein Kanal', async () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.formatModule = [Object.assign(formatModul(), { ungeprueft: false, pruefstufe: 'extern-geprueft:pruefer', anbieterIdGeprueft: 'institution/hebammen-probe' })];
  const g = await wiederOeffnen(V, d);
  assert.equal(V.importFormatFuerId('probe-fim-institution', g), undefined);
});

test('[S6·Hebammen] das ungarische Bündel einer Institution wirkt nach dem Wiederöffnen', async () => {
  const { V } = ladeKern();
  const g = await wiederOeffnen(V, await eingelassen(V, hebammen()));
  g.textsprache = 'hu';
  V._textsatzModuleAusDepotAnmelden(g);
  V.textsatzNeuAnwenden();
  assert.equal(V.textLesen(QUELLCODE), 'Forráskód');
});

test('[S6·Hebammen·Schutz] die Schutzliste bleibt: ein Haftungssatz aus dem institutionssignierten Bündel wird nicht übernommen', async () => {
  const { V } = ladeKern();
  const g = await wiederOeffnen(V, await eingelassen(V, hebammen({ [QUELLCODE]: 'Forráskód', [HAFTUNG]: 'FREMD' })));
  g.textsprache = 'hu';
  assert.deepEqual(V.gesperrteDepotModuleNamen(g), [], 'Vorbedingung: das Bündel ist nicht gesperrt');
  V._textsatzModuleAusDepotAnmelden(g);
  V.textsatzNeuAnwenden();
  assert.equal(V.textLesen(QUELLCODE), 'Forráskód');
  assert.notEqual(V.textLesen(HAFTUNG), 'FREMD');
});

/* Das Ergebnis der Ladeprüfung hängt am Modul-Objekt (WeakMap). Ohne Bindung an den Inhalt behielte ein nach der Prüfung an Ort und
   Stelle geändertes Modul sein Vertrauen — mit S6 hieße das „nicht gesperrt“ für Inhalt, den niemand signiert hat. */
test('[S6·Inhaltsbindung·Rot-Beweis] nach der Prüfung an Ort und Stelle geändert: kein Vertrauen, gesperrt', async () => {
  const { V } = ladeKern();
  const g = await wiederOeffnen(V, await eingelassen(V, formatModul()));
  const m = g.formatModule[0];
  assert.ok(V.modulBelegGeprueft(m), 'Vorbedingung: geprüft');
  m.label = 'NACHTRÄGLICH';
  assert.equal(V.modulBelegGeprueft(m), null);
  V._depotModuleSperreMarkieren(g, true);
  assert.equal(V.gesperrteDepotModule(g).length, 1);
});

/* Klasse: das Ergebnis der Ladeprüfung wird nur über _modulBelegMerken gesetzt (mit Fingerabdruck) — kein zweiter Schreiber im Kern,
   und Proben setzen über _modulBelegAlsGeprueftSetzen, nie direkt in die WeakMap. */
function direkteSchreiber(text) { return (text.match(/_MODUL_BELEG_GEPRUEFT\.set\(/g) || []).length; }
test('[S6·Inhaltsbindung·Klasse] nur _modulBelegMerken schreibt das Prüfergebnis; keine Probe schreibt direkt', () => {
  const fs = require('node:fs'), path = require('node:path');
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const i = kern.indexOf('function _modulBelegMerken(');
  assert.ok(i >= 0);
  const zeile = kern.slice(i, kern.indexOf('\n', i));
  assert.equal(direkteSchreiber(kern), direkteSchreiber(zeile), 'ein Schreiber außerhalb von _modulBelegMerken');
  const funde = fs.readdirSync(__dirname).filter((f) => /\.js$/.test(f))
    .filter((f) => direkteSchreiber(fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')) > 0);
  assert.deepEqual(funde, []);
});
test('[S6·Inhaltsbindung·Klasse·Rot-Beweis] ein zweiter Schreiber wird gezählt', () => {
  const w = '_MODUL_BELEG_GEPRUEFT' + '.set(';   // zusammengesetzt, sonst zählte die Klassenprobe diese Datei selbst
  assert.equal(direkteSchreiber(w + 'm, r); V.' + w + 'x, y);'), 2);
});
