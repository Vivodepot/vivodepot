#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rezept-signatur-pruefen.js — trägt die Signatur eines Produkt-Rezepts? (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   WOZU. Ein Produkt (Kern, Sprache, Module) wird als signiertes Rezept
   ausgeliefert: `<slug>.json` (das Rezept) und `<slug>.jws` (die Signatur).
   Dieses Werkzeug beantwortet für Dritte die eine Frage „ist diese Signatur
   gültig und deckt sie genau diese Bytes?" — ohne Schlüssel, ohne Zugang zu
   einer Ablage, nur mit dem öffentlichen Anker.

   DIE KETTE, die geprüft wird (zweistufig, nie tiefer, fällt geschlossen aus):
     1. Anker → Ausgabestelle: `ausstellerZertifikatJws` in der Nutzlast der
        Signatur ist direkt vom Anker signiert, gültig, `anbieterTyp` ist die
        Ausgabestelle, `rolle` ist `rezept` (Übergang: ein Zertifikat ohne
        `rolle` gilt bis OHNE_ROLLE_BIS, und nur für die Schlüssel in
        UEBERGANG_AUSGABESTELLEN).
     2. Ausgabestelle → Rezept: die Signatur ist mit dem Schlüssel aus dem
        Zertifikat gebildet, gültig, `typ` ist `vivodepot/rezept`, `slug` ist
        der erwartete, `rezeptPruefsumme` ist SHA-256 der vorliegenden Bytes.

   WAS ES NICHT TUT. Es signiert nichts, stellt nichts aus und schreibt nichts.
   Es sagt nicht, ob ein Rezept zum Stand EINES Baums passt (das fragt der
   Betrieb mit seinem eigenen Werkzeug); es sagt nur, ob die Signatur trägt.

   AUFRUF
     node tools/lib/rezept-signatur-pruefen.js --ordner <pfad> [--slug <slug> …]
       liest <slug>.json + <slug>.jws aus dem Ordner (ohne --slug: alle Paare
       im Ordner) und prüft gegen den Produkt-Anker. Exit 0 nur, wenn jedes
       geprüfte Rezept gültig ist.
     node tools/lib/rezept-signatur-pruefen.js
       ohne Argument: Selbsttest gegen tests/fixtures/rezept-signatur/ unter
       deren eigenem Prüfstoff-Anker (nicht der Produkt-Anker; so ausgegeben):
       gueltig/ muss tragen, ungueltig/ muss scheitern. Einen anderen Anker
       als den Produkt-Anker nimmt die Kommandozeile nicht an.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REZEPT_TYP = 'vivodepot/rezept';
// Die Rolle, die ein Ausgabestellen-Zertifikat tragen muss, damit es Rezepte freigeben darf.
const REZEPT_ROLLE = 'rezept';
// Übergang (befristet): ein Ausgabestellen-Zertifikat OHNE Feld `rolle` gilt bis zu diesem Datum,
// danach nur noch `rolle: 'rezept'`.
const OHNE_ROLLE_BIS = '2027-08-23T00:00:00Z';
// Und nur für diese Schlüssel: RFC-7638-Thumbprint des Zertifikats der Ausgabestelle
// (Anker, 2026-08-23 bis 2027-08-23).
const UEBERGANG_AUSGABESTELLEN = Object.freeze(['2Q91vXXeMOVkMUxt7ELScUslvZ-xVU8ImTxzGnyryK4']);
const SLUG_MUSTER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIXTURE_ORDNER = path.join(__dirname, '..', '..', 'tests', 'fixtures', 'rezept-signatur');

function _sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function _b64uJson(teil) {
  return JSON.parse(Buffer.from(teil, 'base64url').toString('utf8'));
}
function _jwkThumbprint(jwk) {
  if (!jwk || jwk.kty !== 'OKP') {
    if (!jwk || jwk.kty !== 'EC') return '';
    return crypto.createHash('sha256').update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })).digest('base64url');
  }
  return crypto.createHash('sha256').update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x })).digest('base64url');
}

/* Prüft EIN Rezept + seine Signatur. Wirft nie; das Ergebnis trägt den Befund:
   { gueltig: true, nutzlast } oder { gueltig: false, grund }. */
async function rezeptSignaturPruefen(slug, { rezeptBytes, jwsText, ankerJwk, jetzt = new Date(), uebergangAusgabestellen = UEBERGANG_AUSGABESTELLEN }) {
  if (!rezeptBytes) return { gueltig: false, grund: 'kein Rezept (' + slug + '.json).' };
  if (!jwsText) return { gueltig: false, grund: 'keine Signatur (' + slug + '.jws).' };
  if (!ankerJwk) return { gueltig: false, grund: 'kein Anker angegeben.' };

  const { ladeIssuer } = require('../../tests/load-issuer.js');
  const V = ladeIssuer().V;

  let nutzlast;
  try { nutzlast = _b64uJson(String(jwsText).split('.')[1]); } catch { return { gueltig: false, grund: 'die Signatur ist kein lesbares JWS.' }; }
  if (!nutzlast || typeof nutzlast.ausstellerZertifikatJws !== 'string') return { gueltig: false, grund: 'die Signatur trägt kein Ausgabestellen-Zertifikat.' };

  let zert;
  try { zert = await V._verifyJWS(nutzlast.ausstellerZertifikatJws, await V._jwsImportVerifyKey(ankerJwk), { jetzt }); }
  catch (e) { return { gueltig: false, grund: 'Ausgabestellen-Zertifikat nicht prüfbar: ' + e.message }; }
  if (!zert.gueltig) return { gueltig: false, grund: 'Ausgabestellen-Zertifikat trägt nicht: ' + zert.grund };
  const cs = zert.nutzlast.credentialSubject || {};
  if (cs.anbieterTyp !== V.AUSGABESTELLE_ANBIETERTYP) return { gueltig: false, grund: 'Zertifikat ist keine Ausgabestelle.' };
  const imUebergang = cs.rolle === undefined && jetzt.getTime() < Date.parse(OHNE_ROLLE_BIS)
    && uebergangAusgabestellen.includes(_jwkThumbprint(cs.publicKeyJwk));
  if (cs.rolle !== REZEPT_ROLLE && !imUebergang) return { gueltig: false, grund: 'Zertifikat trägt rolle „' + cs.rolle + '", nicht „' + REZEPT_ROLLE + '".' };

  let selbst;
  try { selbst = await V._verifyJWS(String(jwsText), await V._jwsImportVerifyKey(cs.publicKeyJwk), { jetzt }); }
  catch (e) { return { gueltig: false, grund: 'Signatur nicht prüfbar: ' + e.message }; }
  if (!selbst.gueltig) return { gueltig: false, grund: 'Signatur trägt nicht: ' + selbst.grund };
  if (nutzlast.typ !== REZEPT_TYP || nutzlast.slug !== slug) return { gueltig: false, grund: 'Signatur nennt einen anderen Typ oder Slug.' };
  if (nutzlast.rezeptPruefsumme !== _sha256Hex(rezeptBytes)) {
    return { gueltig: false, grund: 'die Signatur deckt andere Bytes als das vorliegende Rezept — nicht dasselbe Dokument.' };
  }
  return { gueltig: true, nutzlast };
}

/* Alle Paare <slug>.json/<slug>.jws eines Ordners, jedes unabhängig. */
async function ordnerPruefen(ordner, { slugs, ankerJwk, jetzt = new Date(), uebergangAusgabestellen } = {}) {
  const liste = slugs && slugs.length ? slugs
    : [...new Set(fs.readdirSync(ordner).filter((d) => /\.(json|jws)$/.test(d)).map((d) => d.replace(/\.(json|jws)$/, '')))].sort();
  const ergebnisse = [];
  for (const slug of liste) {
    if (!SLUG_MUSTER.test(slug)) { ergebnisse.push({ slug, gueltig: false, grund: 'kein gültiger Slug.' }); continue; }
    const jsonPfad = path.join(ordner, slug + '.json');
    const jwsPfad = path.join(ordner, slug + '.jws');
    const rezeptBytes = fs.existsSync(jsonPfad) ? fs.readFileSync(jsonPfad) : null;
    const jwsText = fs.existsSync(jwsPfad) ? fs.readFileSync(jwsPfad, 'utf8').trim() : null;
    ergebnisse.push({ slug, ...(await rezeptSignaturPruefen(slug, { rezeptBytes, jwsText, ankerJwk, jetzt, uebergangAusgabestellen })) });
  }
  return ergebnisse;
}

function produktAnker() {
  const { ladeIssuer } = require('../../tests/load-issuer.js');
  return ladeIssuer().V.VIVODEPOT_KERN_TRUST_AUTHORITY_PUBLIC_JWK;
}

/* Selbsttest: alles unter gueltig/ MUSS tragen, alles unter ungueltig/ MUSS scheitern — die
   Positivkontrolle und der Rot-Beweis in einem Lauf. Fester Zeitpunkt, damit der Lauf nicht von der
   Uhr abhängt. */
const SELBSTTEST_JETZT = new Date('2026-10-05T12:00:00Z');
async function selbsttest(ordner = FIXTURE_ORDNER) {
  const ankerJwk = JSON.parse(fs.readFileSync(path.join(ordner, 'anker', 'pruefstoff-anker.public.jwk.json'), 'utf8'));
  const gueltig = await ordnerPruefen(path.join(ordner, 'gueltig'), { ankerJwk, jetzt: SELBSTTEST_JETZT });
  const ungueltig = await ordnerPruefen(path.join(ordner, 'ungueltig'), { ankerJwk, jetzt: SELBSTTEST_JETZT });
  const fehler = [
    ...gueltig.filter((e) => !e.gueltig).map((e) => 'gueltig/' + e.slug + ' scheitert: ' + e.grund),
    ...ungueltig.filter((e) => e.gueltig).map((e) => 'ungueltig/' + e.slug + ' trägt, müsste scheitern'),
  ];
  if (!gueltig.length || !ungueltig.length) fehler.push('Prüfstoff unvollständig (gueltig/ oder ungueltig/ leer).');
  return { gueltig, ungueltig, fehler };
}

async function hauptprogramm(argv) {
  const wert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const alle = (name) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]] : []));
  if (argv.length === 0) {
    const r = await selbsttest();
    console.log('[rezept-signatur-pruefen] Selbsttest gegen den Prüfstoff-Anker (NICHT der Produkt-Anker): '
      + r.gueltig.length + ' gültig erwartet, ' + r.ungueltig.length + ' ungültig erwartet.');
    for (const e of r.ungueltig) console.log('[rezept-signatur-pruefen]   ungueltig/' + e.slug + ': ' + (e.gueltig ? 'TRÄGT' : e.grund));
    for (const f of r.fehler) console.error('[rezept-signatur-pruefen] FEHLER: ' + f);
    return r.fehler.length ? 1 : 0;
  }
  const ordner = wert('--ordner');
  if (!ordner) {
    console.error('[rezept-signatur-pruefen] Aufruf: --ordner <pfad> [--slug <slug> …], oder ohne Argument für den Selbsttest.');
    return 2;
  }
  const ergebnisse = await ordnerPruefen(ordner, { slugs: alle('--slug'), ankerJwk: produktAnker() });
  console.log('[rezept-signatur-pruefen] geprüft gegen den Produkt-Anker.');
  for (const e of ergebnisse) {
    console.log('[rezept-signatur-pruefen] ' + e.slug + ': ' + (e.gueltig ? 'GÜLTIG (gültig bis ' + e.nutzlast.validUntil + ')' : 'UNGÜLTIG — ' + e.grund));
  }
  if (!ergebnisse.length) console.log('[rezept-signatur-pruefen] keine Rezepte gefunden.');
  return ergebnisse.length && ergebnisse.every((e) => e.gueltig) ? 0 : 1;
}

if (require.main === module) {
  hauptprogramm(process.argv.slice(2)).then((code) => { process.exitCode = code; },
    (e) => { console.error('[rezept-signatur-pruefen] ' + e.message); process.exitCode = 1; });
}

module.exports = {
  rezeptSignaturPruefen, ordnerPruefen, selbsttest, hauptprogramm,
  REZEPT_TYP, REZEPT_ROLLE, OHNE_ROLLE_BIS, UEBERGANG_AUSGABESTELLEN, _jwkThumbprint, _sha256Hex,
  FIXTURE_ORDNER,
};
