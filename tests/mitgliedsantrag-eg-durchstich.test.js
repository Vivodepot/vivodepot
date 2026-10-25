'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Durchstich „Mitgliedsantrag eG“ — eine Vorlage ohne Wortlaut auf dem Rückweg (22.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Eine Energiegenossenschaft baut ihren Mitgliedsantrag im Studio als Vorlage, OHNE Wortlaut (reine Formularfelder),
   Vivodepot stellt das Zertifikat aus, die Person liest die Vorlage ein und füllt sie aus. Danach fragt dieselbe Stelle
   mit einer signierten Anfrage nach den Feldern ihrer Vorlage, und die Person antwortet.

   Zwei Lücken, beide entschieden (Rückweg: U2-ADR-366 Nachtrag 08.10.2026; Lücke = bauen):
     L1  Der Kern legte den Eintrag in `importierteVorlagen` nur mit Wortlaut an. Ohne Eintrag fand die Anfrageprüfung
         keinen Beleg, und jedes Vorlagenfeld blieb `unbekannt`. Jetzt entsteht der Eintrag auch ohne Wortlaut
         (`wortlaut: null`); die Dokumenterzeugung bleibt an den Wortlaut gebunden.
     L6  Das Studio bot in der Anfragesuche nur den Feldkatalog an; die eigenen Vorlagenfelder fehlten, und eine von Hand
         eingetragene Kennung `bereich.<anbieterId>:tpl_…` bekam die Warnung „steht nicht im Feldkatalog“.
   Gehalten wird:
     D1  geprüft importiert ohne Wortlaut → ein Eintrag mit Beleg, `wortlaut: null`; ein zweiter Import legt keinen zweiten an
     D2  ohne Wortlaut kein Dokument: kein Knopf im Bereich, kein Ausgabeweg
     D3  das Studio findet die eigenen Vorlagenfelder, mit derselben Kennung, die der Kern zerlegt; keine Warnung
     D4  die signierte Anfrage aus dem Studio wird mit den Daten der Vorlage beantwortet (`antwortAuf` der Stelle)
     D5  die Lese-App zeigt die ausgefüllten Vorlagenfelder
   ROT-BEWEIS: vor dem Bau scheitern D1 (kein Eintrag), D3 (Suche nur im Katalog) und D4 (alles `unbekannt`).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

// Test-Anker der Suite (Sentinel), derselbe wie in tests/vorlagen-rueckweg.test.js — nie der Laufzeit-Anker.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const PRUEF = { ankerJwk: SENTINEL_PUBLIC_JWK };

const FELDER = [
  { feldname: 'Geschäftsanteile', feldtyp: 'zahl', pflicht: true, bereich: 'finance', gruppe: 'Mitgliedschaft' },
  { feldname: 'Art der Einspeisung', feldtyp: 'auswahl', pflicht: true, bereich: 'housing', gruppe: 'Mitgliedschaft',
    codeWerte: [{ code: 'voll', anzeige: 'Volleinspeisung' }, { code: 'ueberschuss', anzeige: 'Überschusseinspeisung' }] },
  { feldname: 'Leistung der Anlage (kWp)', feldtyp: 'zahl', pflicht: false, bereich: 'housing', gruppe: 'Mitgliedschaft' },
];

/* Die Kette einmal: Studio signiert → Ausstellung bündelt → Kern liest ein, die Person füllt aus. */
async function kette() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);

  const { V: G } = ladeGenerator();
  const anbieter = G.baueAnbieter({
    anbieterName: 'Bürgerenergie Beispielstadt', rechtsform: 'eG', ustId: 'DE123456789',
    strasse: 'Sonnenweg 1', plz: '12345', ort: 'Beispielstadt', land: 'Deutschland',
    kontaktName: 'E. Muster', kontaktFunktion: 'Mitgliederverwaltung', kontaktEmail: 'mitglieder@buergerenergie.example',
    kontaktTelefon: '+49 30 1234567', bereich: 'housing',
    useCase: 'Mitgliedsantrag der Genossenschaft als Vorlage, Rückfrage per signierter Anfrage.',
  });
  const studio = { anbieter, publicKeyJwk: pubJwk, felder: FELDER, ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false };
  const submission = await G.baueSubmissionSigniert(studio, privJwk);
  assert.ok(submission.templatesJws && submission.templatesJws[0], 'Studio: Vorlage signiert');
  assert.equal(submission.templates[0].wortlaut, undefined, 'Vorbedingung: die Vorlage trägt keinen Wortlaut');

  const { V: I } = ladeIssuer();
  const d = I.submissionZuAnbieterDaten(submission);
  const vc = I.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, templates: d.templates,
    issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2099-11-30T12:00:00Z',
  });
  const certJws = await I.stelleProviderCredentialAus(vc, await I._jwsImportSignKey(SENTINEL_PRIVATE_JWK));
  const bundle = I.baueAuslieferungsBundle(certJws, d.templatesJws[0]);

  const { V, document: dok } = ladeKern();
  await V.depotAnlegen('Mitgliedsantrag-Durchstich-2026!');
  V.akteurSelbstErklaeren('Emil Mustermann');
  const einlesen = async () => {
    const teil = V._importEingabeAufteilen(JSON.stringify(bundle));
    const plan = await V.importPlanGeprueft('provider-credential', teil.text, Object.assign({}, teil.opts, PRUEF));
    assert.equal(plan.ungueltig, false, 'Kern: Vorlage geprüft importierbar: ' + (plan.grund || ''));
    V.importAnwenden(plan, {});
  };
  await einlesen();
  V.sektorFeldSetzen('identity', 'givenName', 'Emil', { eingabeArt: 'eingabe' });
  V.sektorFeldSetzen('finance', 'tpl_geschaeftsanteile', '3', { eingabeArt: 'eingabe' });
  V.sektorFeldSetzen('housing', 'tpl_art_der_einspeisung', 'ueberschuss', { eingabeArt: 'eingabe' });

  Object.assign(studio, { zertifikatJws: certJws });
  return { G, V, dok, studio, privJwk, anbieterId: d.anbieterId, einlesen };
}
// Objekte aus einer vm-Umgebung haben fremde Prototypen; verglichen wird der Inhalt.
const plain = (x) => JSON.parse(JSON.stringify(x));
const kennungVon = (anbieterId, bereich, feldId) => bereich + '.' + anbieterId + ':' + feldId;

test('[Mitgliedsantrag·D1] eine Vorlage ohne Wortlaut legt einen belegten Eintrag an, einmal', async () => {
  const { V, anbieterId, einlesen } = await kette();
  const eintraege = (V.getData().importierteVorlagen || []).filter((v) => v && v.anbieterId === anbieterId);
  assert.equal(eintraege.length, 1, 'genau ein Eintrag der Stelle');
  const e = eintraege[0];
  assert.equal(e.wortlaut, null, 'ohne Wortlaut ausdrücklich null');
  assert.ok(e.beleg && e.beleg.templateJws && e.beleg.providerCredentialJws, 'der Beleg reist mit');
  assert.deepEqual(plain(e.feldIds).sort(), ['tpl_art_der_einspeisung', 'tpl_geschaeftsanteile', 'tpl_leistung_der_anlage_kwp']);
  await einlesen();
  assert.equal(V.getData().importierteVorlagen.filter((v) => v && v.anbieterId === anbieterId).length, 1,
    'ein zweiter Import derselben Vorlage legt keinen zweiten Eintrag an');
  const ueb = V.importierteVorlagenUebersicht().find((v) => v.id === e.id);
  assert.ok(ueb && ueb.feldAnzahl === 3, 'die Übersicht zeigt den Eintrag mit seinen Feldern');
});

test('[Mitgliedsantrag·D2] ohne Wortlaut bietet der Kern kein Dokument an', async () => {
  const { V, dok, anbieterId } = await kette();
  const e = (V.getData().importierteVorlagen || []).find((v) => v && v.anbieterId === anbieterId);
  assert.ok(e, 'Vorbedingung: Eintrag vorhanden (D1)');
  V.oeffneSektor(e.sektorId);
  assert.doesNotMatch(dok.getElementById('content').innerHTML, /data-k9-vorlage-dokument=/, 'kein Knopf „Dokument erzeugen“');
  assert.equal(V._modulOderVorlage(e.id), null, 'kein Ausgabeweg über die Eintrags-id');
});

test('[Mitgliedsantrag·D3] das Studio findet die eigenen Vorlagenfelder mit der Kennung, die der Kern zerlegt', async () => {
  const { G, V, studio, anbieterId } = await kette();
  const erwartet = kennungVon(anbieterId, 'finance', 'tpl_geschaeftsanteile');
  const treffer = G.anfrageFelderSuchen('Geschäftsanteile', studio);
  const t = treffer.find((x) => x.kennung === erwartet);
  assert.ok(t, 'Treffer mit ' + erwartet + ', gefunden: ' + JSON.stringify(treffer.map((x) => x.kennung)));
  assert.equal(t.label, 'Geschäftsanteile');
  assert.equal(G.anfrageFeldkatalogKennt(erwartet, studio), true);
  for (const f of FELDER) {
    const k = G.anfrageFelderSuchen(f.feldname, studio).find((x) => x.label === f.feldname);
    assert.ok(k, 'Treffer für ' + f.feldname);
    const z = V.kennungZerlegen(k.kennung);
    assert.equal(z.anbieter, anbieterId, 'Kern zerlegt zur Stelle: ' + k.kennung);
    assert.equal(z.feld, V._tplFeldId(f.feldname, null), 'gleicher Slug wie der Kern: ' + f.feldname);
  }
  assert.equal(G.anfrageFelderSuchen('Geschäftsanteile', { felder: FELDER }).some((x) => /:tpl_/.test(x.kennung)), false,
    'ohne anbieterId gibt es keine Vorlagen-Kennung');
});

test('[Mitgliedsantrag·D4] die signierte Anfrage aus dem Studio wird mit den Daten der Vorlage beantwortet', async () => {
  const { G, V, studio, privJwk, anbieterId } = await kette();
  const anteile = kennungVon(anbieterId, 'finance', 'tpl_geschaeftsanteile');
  const einspeisung = kennungVon(anbieterId, 'housing', 'tpl_art_der_einspeisung');
  const leistung = kennungVon(anbieterId, 'housing', 'tpl_leistung_der_anlage_kwp');
  studio.anfrage = {
    zweck: 'Mitgliedsantrag', grundlage: 'Beitritt zur Genossenschaft', vorgang: 'MA-2026-1022', gueltigBis: '2099-12-31',
    antwortArt: 'einmalpasswort', antwortAn: 'mitglieder@buergerenergie.example',
    felder: [{ kennung: 'identity.givenName', zweck: 'Mitgliederliste', pflicht: true },
      { kennung: anteile, zweck: 'Beitritt', pflicht: true },
      { kennung: einspeisung, zweck: 'Einspeisung', pflicht: true },
      { kennung: leistung, zweck: 'Anlage', pflicht: false }],
  };
  const pr = G.pruefeAnfrage(studio);
  assert.deepEqual(plain(pr.blocker), []);
  assert.deepEqual(plain(pr.warnungen), [], 'keine Warnung für die eigenen Vorlagenfelder');
  const umschlag = await G.baueAnfrageSigniert(studio, privJwk);
  assert.ok(umschlag.anfrageJws && umschlag.zertifikat, 'signiert, mit Zertifikat');

  const ds = await V.anfrageAntwortDatensatzGeprueft(JSON.parse(G.anfrageAlsText(umschlag)), { sensibel: false, pruefOpts: PRUEF });
  const werte = Object.fromEntries(ds.felder.map((e) => [e.kennung, e.wert]));
  assert.deepEqual(plain(ds.unbekannt), [], 'nichts unbekannt');
  assert.equal(werte['identity.givenName'], 'Emil');
  assert.equal(werte[anteile], '3');
  assert.equal(werte[einspeisung], 'Überschusseinspeisung', 'die Auswahl geht mit ihrer Bezeichnung hinaus');
  assert.ok(ds.fehlend.some((e) => e.kennung === leistung), 'das leere Vorlagenfeld steht unter fehlend');
  assert.equal(ds.antwortAuf.length, 1);
  assert.equal(ds.antwortAuf[0].herkunft, anbieterId);
  assert.deepEqual(plain(ds.antwortAuf[0].antworten[anteile]), { zustand: 'wert', wert: '3' });
});

test('[Mitgliedsantrag·D5] die Lese-App zeigt die ausgefüllten Vorlagenfelder', async () => {
  const { V } = await kette();
  const { V: L } = ladeLesen();
  L.setData(JSON.parse(JSON.stringify(V.getData())));
  const html = L.sektorHTML('finance');
  assert.ok(html.includes('Geschäftsanteile') && html.includes('3'), 'Feldname und Angabe der Vorlage');
});
