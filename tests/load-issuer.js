'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Lade-Hilfe für vivodepot-vc-issuer.html (Komponente 3)
   ────────────────────────────────────────────────────────────────────────
   Analog zu load-kern.js: extrahiert die beiden <script>-Blöcke des VC-Issuers
   (Script 1 = VdCrypto-Block byte-identisch zum Kern; Script 2 = gemeinsamer
   JWS-Block + Test-Sentinel + Issuer-Logik) und lädt sie in einen Node-Kontext
   mit echtem WebCrypto und einem DOM-Stub. Die HTML wird NUR GELESEN; der
   Export-Hook wird an die im Speicher zusammengefügte Quelle gehängt, nie an
   die Datei. boot() läuft nicht (Stub-document.addEventListener ist no-op).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { webcrypto } = crypto;

const REPO = path.join(__dirname, '..');
const ISSUER_PATH = process.env.ISSUER_HTML_PATH
  ? path.resolve(process.env.ISSUER_HTML_PATH)
  : path.join(REPO, 'vivodepot-vc-issuer.html');

// Erwarteter VdCrypto-Block-Hash (== Kern == PORT-VERBATIM.js). Umbau „Englisch vor v1"
// (14.09.2026): zwei Kennung-Beispiele im Kopf-Kommentar mitgezogen, s. load-kern.js.
const BLOCK_HASH_ERWARTET = '732ff4b0dc74e7ae9cce9febc8eb5cb3d8e52150775f88c80ff1f8967a8a6282';

function extrahiereScripts(html) {
  const OPEN = '<script>', CLOSE = '</script>';
  const o1 = html.indexOf(OPEN), o1e = o1 + OPEN.length;
  const c1 = html.indexOf(CLOSE, o1e);
  const o2 = html.indexOf(OPEN, c1), o2e = o2 + OPEN.length;
  const c2 = html.indexOf(CLOSE, o2e);
  if (o1 < 0 || c1 < 0 || o2 < 0 || c2 < 0) throw new Error('Konnte die beiden <script>-Blöcke nicht finden.');
  return { script1: html.slice(o1e, c1), script2: html.slice(o2e, c2) };
}
function kryptoBlock(script1) { return script1.startsWith('\n') ? script1.slice(1) : script1; }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

/* ── DOM-Stub (universelles Element via Proxy) — wie load-kern.js ─────────── */
function makeEl() {
  const store = { innerHTML: '', textContent: '', value: '', checked: false, className: '', files: [] };
  let styleObj = null, classListObj = null;
  const noop = () => undefined;
  return new Proxy(store, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'style') { if (!styleObj) styleObj = makeEl(); return styleObj; }
      if (prop === 'classList') {
        if (!classListObj) classListObj = { add: noop, remove: noop, toggle: noop, contains: () => false };
        return classListObj;
      }
      if (prop === 'querySelector') return () => makeEl();
      if (prop === 'querySelectorAll') return () => [];
      if (prop === 'appendChild' || prop === 'removeChild') return (x) => x;
      if (prop === 'addEventListener' || prop === 'removeEventListener') return noop;
      if (prop === 'setProperty' || prop === 'removeProperty') return noop;
      if (prop === 'getAttribute') return () => null;
      return noop;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}
/* ── `getElementById` liefert `null`, wenn es die ID nicht gibt (A248, 16.08.2026) ──
   Dieselbe Schaerfung wie in `tests/load-kern.js`; die Begruendung steht dort
   ausfuehrlich. Kurz: ein Stub, der fuer JEDE ID ein Phantom liefert, macht jede
   Probe blind gegen die haeufigste DOM-Fehlerklasse, ohne dass eine davon rot wird.
   Die zwei Sentinel `__html`/`__body` bleiben ausgenommen — `documentElement` und
   `body` sind im Browser nie `null`, sie tragen nur kein id-Attribut. Genau dieser
   Punkt hat zwei fruehere Messungen (378 und 261 „blinde Proben") verdorben.
   Positivkontrolle 16.08.: Menge geleert → 1 Fehlschlag, die Messung greift; mit der vollen Menge fallen NULL. */
const _VORHANDENE_IDS = new Set(
  (fs.readFileSync(ISSUER_PATH, 'utf8').match(/\sid="[A-Za-z0-9_-]+"/g) || [])
    .map((treffer) => treffer.slice(5, -1))
    .concat(['__html', '__body']));

function makeDocument() {
  const cache = new Map();
  const doc = {
    getElementById: (id) => {
      if (!cache.has(id)) {
        if (!_VORHANDENE_IDS.has(id)) return null;
        cache.set(id, makeEl());
      }
      return cache.get(id);
    },
    createElement: () => makeEl(),
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    get documentElement() { return doc.getElementById('__html'); },
    get body() { return doc.getElementById('__body'); },
  };
  return doc;
}

const EXPORT_HOOK = `
;globalThis.__ISSUER__ = {
  // Glied 10 (18.08.2026): der Textsatz erreicht auch dieses Werkzeug
  TEXTSATZ_SPRACHE_EINGEBAUT, TEXTSATZ_TEXTE_EINGEBAUT, TEXTSATZ_MARKUP_ORTE,
  textsatzModulPruefen, textsatzModulAnwenden, textsatzSpracheAktiv, textLesen,
  textsatzAufMarkupAnwenden,
  // Gemeinsamer JWS-Block
  JWS_TYP, JWS_ALG_PRIMAER, JWS_ALG_FALLBACK,
  _signJWS, _verifyJWS, _jwsImportSignKey, _jwsImportVerifyKey,
  _jwsAlgFuerKey, _jwsWebCryptoParams,
  _jwsB64uFromBytes, _jwsB64uToBytes, _jwsB64uFromString, _jwsB64uToString,
  // Test-Sentinel
  TEST_SENTINEL_PUBLIC_JWK, TEST_SENTINEL_ISSUER,
  verifiziereProviderCredentialGegenSentinel, istTestSentinelKey,
  // Issuer-Logik (DOM-frei)
  ISSUER_DEFAULT, ISSUER_WERKZEUG, ISSUER_VERSION, VC_CONTEXT, VC_TYPEN, ABLAUF_MONATE_DEFAULT,
  SUBMISSION_SCHEMA, _validateSchema,
  isoJetzt, isoSekunden, plusMonate, defaultAblauf,
  // 1F/(a): klassen-abhängige Cert-Laufzeit (Basis/Behörde lang, extern 18 Monate)
  ABLAUF_MONATE_BASIS, istBehoerde, basisOderDefaultAblauf, expirationFeldZuISO,
  AUSGABESTELLE_ANBIETERTYP, ABLAUF_MONATE_AUSGABESTELLE, istAusgabestelle,
  validiereAnbieterPublicKey, validiereAnbieterDaten,
  // Issuer-Passphrase (Auftragskette 14.08.2026, Glied 1)
  // PROTECTED_KEY_VERSION_ALLOWLIST neu (U2-ADR-249, 04.09.2026, Zuschnitt Sperrposten 1)
  istGeschuetzteSchluesseldatei, schuetzeSchluesselJwk, entschluesseleSchluesselJwk,
  jwkThumbprintRfc7638, passphraseStaerke, erzeugeUndSchuetzeSchluesselpaar,
  PROTECTED_KEY_VERSION_ALLOWLIST,
  // Zertifikatsbetrieb ohne Terminal (23.08.2026): Zweck-im-Dateinamen-Waechter + UI-Handler
  _zweckSlug, _zweckAusFeldOderAbbruch, onSchluesselErzeugen, onBestandsschluesselSchuetzen,
  _importGeprueftenPrivateJwk, _uebernehmeGeladenenSchluessel, gibSchluesselFrei,
  liesAusstellerZertifikatJws, onAusstellen, _letztesKundenBundleLesen,
  onKeyDatei, onKeyEntsperren,
  baueProviderVC, stelleProviderCredentialAus,
  submissionZuAnbieterDaten, validiereSubmission, vcDateiname,
  baueAuslieferungsBundle, _letztesBundleLesen,
  // U2-ADR-182 (28.08.2026, xShare/IHE): Vor-Depot-Konfiguration, direkter Anker-Weg
  baueVorDepotBuendel, vorDepotKonfigurationDateiInhalt, liesVordepotZertifikatJws,
  onVordepotModulDatei, onVordepotErzeugen, _letztesVordepotBuendelLesen,
  // Schnellweg "vivodepot/kern" (28.08.2026): Anbieter-Daten fest verdrahtet, ein Klick
  VIVODEPOT_KERN_ANBIETERTYP, VIVODEPOT_KERN_TRUST_AUTHORITY_PUBLIC_JWK,
  vivodepotKernSchnellwegBuendel, onSchnellwegModulDatei, onSchnellwegErzeugen,
  _letztesSchnellwegBuendelLesen,
  // "Der Rückweg zum Kern" (27.08.2026): Modul-Umschlag-Import
  _leseModulUmschlag, _pruefeModulSignatur, onModulUmschlagDatei,
  stapelPruefen, stapelAusstellen, stapelBuendel,
  SITZUNG_AUDIT, auditEintrag, auditLogJSON,
  // „Prüfung vor Verteilung einhängen" (25.08.2026)
  _pruefeGroessenDisziplin, _pruefeReservierteKennungen, _pruefeNamensraumKollision,
  _pruefeTemplateSignaturen, _tplSlugVc, _namensraumIndex,
  SUBMISSION_MAX_BYTES, SUBMISSION_MAX_UNTERFELDER, SUBMISSION_MAX_TEMPLATES, SUBMISSION_MAX_FELDER_PRO_TEMPLATE,
};
`;

function ladeIssuer() {
  const html = fs.readFileSync(ISSUER_PATH, 'utf8');
  const { script1, script2 } = extrahiereScripts(html);

  const documentStub = makeDocument();
  const windowStub = { crypto: webcrypto, addEventListener: () => {}, location: { href: '' } };
  const sandbox = {
    crypto: webcrypto,
    TextEncoder, TextDecoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (b) => Buffer.from(b, 'base64').toString('binary'),
    console, setTimeout, clearTimeout,
    window: windowStub, document: documentStub,
    // Reine URL()-Konstruktor-Faehigkeit noetig seit dem `verweis`-Feldtyp (12.09.2026) —
    // dieselbe Korrektur wie in load-kern.js/load-lesen.js: vorher ein Capability-Objekt
    // ohne die echte Klasse, jetzt echtes Node-`URL`, erweitert um die Blob-Methoden.
    URL: Object.assign(class extends URL {}, { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} }),
    Blob: function () {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const source = script1 + '\n' + script2 + '\n' + EXPORT_HOOK;
  vm.runInContext(source, sandbox, { filename: path.basename(ISSUER_PATH) + '(concat)' });

  return { V: sandbox.__ISSUER__, document: documentStub, html, script1, script2 };
}

module.exports = {
  ladeIssuer, extrahiereScripts, kryptoBlock, sha256,
  ISSUER_PATH, BLOCK_HASH_ERWARTET, webcrypto,
};
