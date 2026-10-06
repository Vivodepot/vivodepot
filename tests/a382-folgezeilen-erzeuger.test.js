'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A382 — die Folge-Zeilen im Erzeuger: ZURÜCKGENOMMEN am 20.08.2026
   ────────────────────────────────────────────────────────────────────────
   Diese Datei hat bis heute geprüft, dass der Erzeuger sagt, was ohne eines
   der drei Tauglich-Häkchen gilt — drei Folge-Zeilen im Markup und eine
   Warnung vor dem Signieren, wenn zwei der drei fehlen.

   **Die Produktentscheidung vom 20.08.2026 streicht die Häkchen
   selbst.** Damit fällt der Gegenstand dieser Proben weg, und sie werden
   UMGEDREHT statt gelöscht: sie halten fest, dass der Mechanismus fort ist,
   und dass mit ihm die gemeldete Falschmarkierung der Anamnese-Form entfällt
   — sie wird nicht korrigiert, sie hat keinen Träger mehr.

   WARUM UMDREHEN UND NICHT LÖSCHEN: eine gelöschte Probe hinterlässt keine
   Spur. Wer in vier Wochen liest, warum der Erzeuger die Folge nicht mehr
   zeigt, findet hier die Antwort statt einer Lücke.

   DER GRUND JE FLAG, und er ist nicht bei allen dreien derselbe: Anker und
   Sub verlangten von der Institution eine Erklärung über etwas, das sie nicht
   weiss — ob ein Depot ein Anker- oder Sub-Depot ist, entscheidet sich beim
   Ausfüllen. Sorgerecht wusste sie sehr wohl; nur richtete das Häkchen nichts
   aus, weil das Zieldepot beim Import gewählt wird und nicht im Erzeuger.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const GEN = path.join(__dirname, '..', 'vivodepot-studio.html');
const HTML = fs.readFileSync(GEN, 'utf8');

function sauberesTemplate(extra) {
  return Object.assign({
    felder: [{ feldname: 'Name', feldtyp: 'text', pflicht: true, bereich: 'identitaet' }],
    anbieter: {
      anbieterName: 'Kanzlei Muster', rechtsform: 'GmbH',
      adresse: { strasse: 'Musterweg 1', plz: '10115', ort: 'Berlin', land: 'DE' },
      kontakt: { name: 'Hedwig Muster', funktion: 'Kanzleileitung',
        email: 'kontakt@example.org', telefon: '030 1234567' },
      bereich: 'identitaet',
      useCase: 'Die Kanzlei nimmt Mandantendaten fuer eine Vorsorgevollmacht auf und braucht dafuer eine eigene Vorlage.',
    },
  }, extra || {});
}

test('[A382 · zurückgenommen] die drei Häkchen stehen nicht mehr im Markup', () => {
  for (const id of ['tpl-anker', 'tpl-sub', 'tpl-sorgerecht']) {
    assert.equal(HTML.includes('id="' + id + '"'), false, id + ' ist entfallen');
  }
  for (const id of ['folge-anker', 'folge-sub', 'folge-sorgerecht']) {
    assert.equal(HTML.includes('id="' + id + '"'), false, id + ' ist mit dem Häkchen entfallen');
  }
});

test('[A382 · zurückgenommen] die Schaltung und ihr Auslöser sind fort', () => {
  assert.equal(/function\s+folgeZeilenSchalten/.test(HTML), false, 'die Schaltfunktion ist entfallen');
  assert.equal(/function\s+sorgeGeaendert/.test(HTML), false, 'ihr Auslöser ebenso');
});

test('[A382 · zurückgenommen] die Warnung vor dem Signieren fällt nicht mehr an', () => {
  const { V } = ladeGenerator();
  const erg = V.pruefeKonformitaet(sauberesTemplate());
  /* LÄNGE STATT deepEqual: `warnungen` ist ein Array AUS DEM GENERATOR-KONTEXT (eigener vm),
     sein Prototyp ist ein anderer — `assert.deepEqual` schlägt darauf an, ohne dass ein Wert
     abweicht. Dieselbe Falle wie beim Anker-Vergleich zwischen Kern und Lese-App. */
  const treffer = (erg.warnungen || []).filter((w) => /volljährige|Sub-Depots|gesetzliche/i.test(w));
  assert.equal(treffer.length, 0, 'ohne Häkchen gibt es nichts mehr zu warnen: ' + treffer.join(' | '));
  /* Der Blocker „kein Schlüsselpaar" steht hier zu Recht und gehört nicht zu diesem Gegenstand —
     geprüft wird, dass unter den BLOCKERN keiner aus der Sorge-Familie steht. Ihn mitzuprüfen
     hiesse, diese Probe an einen fremden Zustand zu binden. */
  const blockerTreffer = (erg.blocker || []).filter((b) => /volljährige|Sub-Depots|gesetzliche|tauglich/i.test(b));
  assert.equal(blockerTreffer.length, 0, 'und geblockt wurde ohnehin nie — es war eine Warnung');
});

test('[A382 · zurückgenommen] die drei Beispiel-Vorlagen tragen keine Sorge-Angabe mehr', () => {
  assert.equal(/sorge:\s*\{/.test(HTML), false,
    'die mitgelieferten Beispiele haben die Felder verloren — damit erledigt sich die gemeldete '
    + 'Falschmarkierung der Anamnese-Form, sie wird nicht korrigiert');
});

test('[A382 · Rot-Beweis] das Kriterium selbst schlägt an, wenn ein Häkchen zurückkehrt', () => {
  /* Eine Rücknahme-Probe ohne Rot-Beweis ist eine Zusage, keine Messung: sie wäre auch dann
     grün, wenn sie am falschen Text suchte. Geprüft wird darum am MUTIERTEN Markup — ein
     wiedereingesetztes Häkchen muss das Kriterium brechen. Ohne Griff in die echte Datei. */
  // Der Anker ist die Wortlaut-Tafel (GEN1-Umbau: die frühere Überschrift „Wortlaut (optional)" liegt jetzt in ihr).
  const mutiert = HTML.replace('<div id="tafel-wortlaut"',
    '<input type="checkbox" id="tpl-anker"><p class="hint folge-zeile" id="folge-anker" hidden>x</p><div id="tafel-wortlaut"');
  assert.notEqual(mutiert, HTML, 'Vorbedingung: die Mutation greift');
  assert.ok(mutiert.includes('id="tpl-anker"'), 'mutiert: das Häkchen ist wieder da — das Kriterium wäre rot');
  assert.ok(mutiert.includes('id="folge-anker"'), 'und die Folge-Zeile ebenso');
  assert.equal(HTML.includes('id="tpl-anker"'), false, 'die echte Datei bleibt, wie sie ist');
});

test('[A382 · Auflage] das Einreich-Schema DULDET die drei Felder weiter', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'docs', 'template-generator', 'submission-schema.json'), 'utf8'));
  const tpl = schema.properties.templates.items;
  assert.deepEqual(tpl.required, ['felder'], 'verlangt werden sie nicht mehr');
  for (const k of ['ankerTauglich', 'subTauglich', 'sorgerechtTauglich']) {
    assert.ok(tpl.properties[k], k + ' bleibt unter properties — sonst wäre ein bereits signiertes '
      + 'Bündel gegen `additionalProperties: false` ungültig, und die Streichung wäre ein Bruch der Signatur-Kette');
  }
  assert.equal(tpl.additionalProperties, false, 'und die Grenze bleibt scharf');
});

/* ══ DIE AUFLAGE DES POSTENS, am ganzen Weg belegt ══════════════════════════
   „Ein signiertes Alt-Bündel MIT den drei Feldern wird eingelesen und läuft durch.
   Eine Probe, die das nicht vorher rot zeigen kann, zählt nicht."

   Gefahren wird der ECHTE Einlassweg des Kerns (`importPlanGeprueft` gegen einen
   injizierten Test-Anker), nicht der Schema-Validator allein — die Auflage spricht
   von „einlesen", und das ist der Weg, den ein ausgeliefertes Bündel wirklich nimmt. */
const { ladeKern } = require('./load-kern.js');
const { webcrypto } = require('node:crypto');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-20T12:00:00Z';

async function altBuendel(V, mitFlags) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const template = { felder: [{ feldname: 'Kammernummer', feldtyp: 'text', bereich: 'education', gruppe: 'Zulassung' }] };
  if (mitFlags) Object.assign(template, { ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false });
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://vivodepot.de/credentials/v1'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'institution/kammer', anbieterName: 'Kammer',
      anbieterTyp: 'institution/kammer-de', publicKeyJwk: pubJwk },
  };
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  return {
    certJws: await V._signJWS(cert, sentinelSign, {}),
    templateJws: await V._signJWS(template, anbieterSign, {}),
  };
}

test('[Posten 1 · Auflage] ein signiertes ALT-Bündel MIT den drei Feldern läuft durch', async () => {
  const { V } = ladeKern();
  const b = await altBuendel(V, true);
  const plan = await V.importPlanGeprueft('provider-credential', b.certJws,
    { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws: b.templateJws });
  assert.equal(plan.ungueltig, false, 'ein ausgeliefertes Bündel darf an der Streichung nicht scheitern: ' + (plan.grund || ''));
  assert.ok(Array.isArray(plan.feldDefinitionen) && plan.feldDefinitionen.length === 1,
    'und seine Felder kommen an — die drei Flags werden GEDULDET und IGNORIERT');
  assert.equal(plan.templateVerworfen, undefined, 'kein Verwerfen wegen unbekannter Felder');
});

test('[Posten 1 · Gegenprobe] ein NEUES Bündel ohne die drei Felder läuft genauso durch', async () => {
  const { V } = ladeKern();
  const b = await altBuendel(V, false);
  const plan = await V.importPlanGeprueft('provider-credential', b.certJws,
    { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws: b.templateJws });
  assert.equal(plan.ungueltig, false, 'Grund: ' + (plan.grund || ''));
  assert.equal(plan.feldDefinitionen.length, 1);
});
