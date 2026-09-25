'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Erst vereinbaren, dann der Auszug (MyTerms v1-Schnitt, Teil D, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Offline: Angebot als Text (Datei/QR), signierte Antwort der Stelle, Prüfung über dieselbe Kette wie eine
   Anfrage (Zertifikat gegen Anker, Signatur gegen Anbieter-Schlüssel, lesbar gegen signiert).
   Rot-Beweise (Produktentscheidung, 16.09.): ohne Annahme und ohne Ja der Person kein Auszug · fremde Prüfsumme wird
   abgewiesen · eine Ablehnung steht im Protokoll · eine ungeprüfte Annahme gibt nicht von selbst frei.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-09-16T09:00:00Z' });
const QUELLE = 'https://myterms.info/agreements/';

async function signieren(V, payload, privJwk) {
  return V._signJWS(payload, await V._jwsImportSignKey(privJwk), {});
}
async function stelle(V) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const zertifikat = await signieren(V, {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'praxis/am-markt', anbieterTyp: 'institution/test', anbieterName: 'Praxis am Markt', publicKeyJwk: pubJwk },
  }, SENTINEL_PRIVATE_JWK);
  return { privJwk, zertifikat };
}
async function antwort(V, st, antwortObj) {
  const signedOn = Math.floor(Date.parse('2026-09-16T10:00:00Z') / 1000);
  return { antwort: antwortObj, zertifikat: st && st.zertifikat,
    signature: st ? { version: 1, id: 'praxis/am-markt', signedOn, type: 'JWS/JCS', jws: await signieren(V, antwortObj, st.privJwk) } : undefined };
}
async function depotMitAngebot(V) {
  await V.depotAnlegen('vereinbarung-probe-lang-genug-2026');
  const bed = async (k) => ({ kennung: k, quelle: QUELLE, pruefsumme: await V.uebergabeBedingungPruefsumme(k, QUELLE) });
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Praxis am Markt', zweck: 'Behandlung', umfang: 'Medikation',
    vereinbarung: { angebot: { bevorzugt: await bed('SD-BASE'), ausweich: await bed('PDC-AI') }, status: 'angeboten' } });
  return e;
}
const ant = (e, entscheidung, angenommen) => ({
  art: 'vivodepot-vereinbarung-antwort', version: 1, agreementId: e.kennung, entscheidung,
  angenommen: angenommen || null, pruefsumme: angenommen ? e.vereinbarung.angebot[angenommen].pruefsumme : null,
});

test('[Angebot] Text-Hin-und-Rückweg: eigenes Präfix, nur Kennungen, Quellen, Prüfsummen — kein Depot-Inhalt', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  const angebot = V.vereinbarungAngebotErzeugen(e);
  const text = V.vereinbarungAlsText(angebot);
  assert.ok(text.startsWith(V.VEREINBARUNG_PRAEFIX));
  assert.ok(!/^MT[RD]S:/.test(text), 'kein fremdes MCNP-Präfix');
  assert.deepEqual(V.vereinbarungAusText(text), angebot);
  assert.deepEqual(Object.keys(angebot).sort(), ['agreementId', 'art', 'ausweich', 'bevorzugt', 'created', 'version']);
  assert.equal(JSON.stringify(angebot).includes('Medikation'), false);
  assert.equal(V.vereinbarungAusText('VDVB1:%%%'), null);
});

test('[Sperre·Rot-Beweis] ohne Annahme und ohne Ja der Person kein Auszug', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  assert.equal(V.vereinbarungAusgabeErlaubt(e), false);
  assert.throws(() => V.vereinbarungAusgabeVermerken(e.kennung), /Keine Freigabe/);
  assert.equal(V.vereinbarungPersonGibtFrei(e.kennung), true);
  assert.equal(V.vereinbarungAusgabeErlaubt(e), true);
  assert.equal(e.vereinbarung.status, 'ohne-vereinbarung');
  V.vereinbarungAusgabeVermerken(e.kennung);
  assert.equal(V.vereinbarungAusgabeErlaubt(e), false, 'eine Freigabe gilt für EINE Ausgabe');
});

test('[Antwort] geprüfte Annahme der Ausweichbedingung gibt frei', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  const r = await V.vereinbarungAntwortAnwenden(await antwort(V, await stelle(V), ant(e, 'angenommen', 'ausweich')), OPTS);
  assert.deepEqual(r, { ergebnis: 'angenommen', grund: null, frei: true, kennung: e.kennung });
  assert.equal(e.vereinbarung.angenommen, 'ausweich');
  assert.equal(e.vereinbarung.annahme.anbieterId, 'praxis/am-markt');
  assert.equal(e.vereinbarung.annahme.stelle, 'Praxis am Markt');
  assert.equal(V.vereinbarungAusgabeErlaubt(e), true);
});

test('[Antwort·Rot-Beweis] eine Annahme mit fremder Prüfsumme wird abgewiesen, der Eintrag bleibt offen', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  const falsch = Object.assign(ant(e, 'angenommen', 'bevorzugt'), { pruefsumme: e.vereinbarung.angebot.ausweich.pruefsumme });
  const r = await V.vereinbarungAntwortAnwenden(await antwort(V, await stelle(V), falsch), OPTS);
  assert.equal(r.ergebnis, 'abgewiesen'); assert.equal(r.grund, 'fremde-pruefsumme');
  assert.equal(e.vereinbarung.status, 'angeboten');
  assert.equal(V.vereinbarungAusgabeErlaubt(e), false);
});

test('[Antwort·Rot-Beweis] ausgetauschter Klartext neben alter Signatur wird abgewiesen', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  const u = await antwort(V, await stelle(V), ant(e, 'abgelehnt'));
  u.antwort = ant(e, 'angenommen', 'bevorzugt');
  const r = await V.vereinbarungAntwortAnwenden(u, OPTS);
  assert.equal(r.ergebnis, 'abgewiesen'); assert.equal(r.grund, 'antwort-abweichung');
});

test('[Antwort·Rot-Beweis] eine Ablehnung steht im Protokoll — auch nach dem Ja der Person', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  const r = await V.vereinbarungAntwortAnwenden(await antwort(V, await stelle(V), ant(e, 'abgelehnt')), OPTS);
  assert.equal(r.ergebnis, 'abgelehnt'); assert.equal(r.frei, false);
  assert.equal(e.vereinbarung.status, 'abgelehnt');
  assert.equal(V.vereinbarungAusgabeErlaubt(e), false);
  V.vereinbarungPersonGibtFrei(e.kennung);
  assert.equal(e.vereinbarung.status, 'ohne-vereinbarung');
  assert.deepEqual(e.vereinbarung.ablehnung, { stelle: 'Praxis am Markt', zeitpunkt: '2026-09-16T10:00:00.000Z', geprueft: true });
});

test('[Antwort·Rot-Beweis] eine ungeprüfte Annahme (ohne Zertifikat) gibt nicht von selbst frei — nur mit Ja', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  const a = Object.assign(ant(e, 'angenommen', 'bevorzugt'), { stelle: 'Praxis ohne Zertifikat' });
  const r = await V.vereinbarungAntwortAnwenden({ antwort: a }, OPTS);
  assert.deepEqual(r, { ergebnis: 'angenommen', grund: 'ungeprueft', frei: false, kennung: e.kennung });
  assert.equal(V.vereinbarungAusgabeErlaubt(e), false);
  assert.equal(V.vereinbarungPersonGibtFrei(e.kennung), true);
  assert.equal(e.vereinbarung.freigabe, 'person');
  assert.equal(e.vereinbarung.annahme.geprueft, false);
});

test('[Antwort] eine Antwort ohne offenes Angebot wird abgewiesen', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  const a = Object.assign(ant(e, 'abgelehnt'), { agreementId: 'gibt-es-nicht' });
  assert.equal((await V.vereinbarungAntwortAnwenden(await antwort(V, await stelle(V), a), OPTS)).grund, 'kein-angebot');
});

test('[Festlegung] aus dem Katalog gesetzt, bereinigt, aufhebbar; gleiche Bedingungen werden abgewiesen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('festlegung-probe-lang-genug-2026');
  V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [] });
  const f = await V.bedingungFestlegen('SD-BASE', 'PDC-AI');
  assert.equal(f.bevorzugt.kennung, 'SD-BASE'); assert.equal(f.ausweich.kennung, 'PDC-AI'); assert.equal(f.bevorzugt.katalog, 'vivodepot');
  await assert.rejects(() => V.bedingungFestlegen('SD-BASE', 'SD-BASE'), /verschieden/);
  await assert.rejects(() => V.bedingungFestlegen('GIBT-ES-NICHT'), /nicht im Katalog/);
  assert.equal(await V.bedingungFestlegen(null), null);
});

test('[Sperre·Rot-Beweis] ohne Festlegung läuft jede Weitergabe wie heute — mit Festlegung und ohne Dialog geht nichts hinaus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('sperre-probe-lang-genug-2026');
  V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [] });
  let gerufen = 0;
  assert.equal(V.mitVereinbarung('probe', () => { gerufen++; return 'ergebnis'; }), 'ergebnis', 'ohne Festlegung synchron durch');
  assert.equal(await V.vereinbarungFreigabeHolen('probe'), null);
  await V.bedingungFestlegen('SD-BASE');
  assert.equal(V.mitVereinbarung('probe', () => { gerufen++; }), undefined);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(gerufen, 1, 'mit Festlegung kein Durchlauf ohne Freigabe');
  // Mit Festlegung: entweder sofort `false` (kein Dialog verfügbar) oder offen, bis die Person im Dialog handelt —
  // nie `null` (das hieße „frei wie heute").
  const r = await Promise.race([V.vereinbarungFreigabeHolen('probe'), new Promise((res) => setTimeout(() => res('wartet'), 50))]);
  assert.ok(r === false || r === 'wartet', 'mit Festlegung nie frei ohne Freigabe, war: ' + JSON.stringify(r));
});

test('[Antwort·Rot-Beweis C-1] eine überlange Stelle wird abgewiesen und benannt, nicht gekappt — der Eintrag bleibt offen', async () => {
  const { V } = ladeKern();
  const e = await depotMitAngebot(V);
  const lang = 'X'.repeat(V.VEREINBARUNG_GRENZEN.stelle + 1);
  const r = await V.vereinbarungAntwortAnwenden({ antwort: Object.assign(ant(e, 'angenommen', 'bevorzugt'), { stelle: lang }) }, OPTS);
  assert.equal(r.ergebnis, 'abgewiesen'); assert.equal(r.grund, 'stelle-zu-lang');
  assert.equal(e.vereinbarung.status, 'angeboten');
  const genau = 'Y'.repeat(V.VEREINBARUNG_GRENZEN.stelle);
  assert.equal((await V.vereinbarungAntwortAnwenden({ antwort: Object.assign(ant(e, 'abgelehnt'), { stelle: genau }) }, OPTS)).ergebnis, 'abgelehnt', 'an der Grenze angenommen');
  // Auch ein Bestand mit überlanger Stelle besteht die Form nicht (Stufe 82 räumt ihn weg).
  assert.equal(V.uebergabeAnnahmeNormalisieren({ stelle: lang, zeitpunkt: '2026-09-16T10:00:00Z', pruefsumme: 'a'.repeat(64) }), null);
});
