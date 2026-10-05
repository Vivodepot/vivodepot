'use strict';
/* ═══════════════════════════════════════════════════════════
   v842 (D5, interne Sicherheitsprüfung 30.09.2026): Text aus einem fremden Modul, einer fremden Vorlage oder
   einer fremden Einreichung wird nie als HTML eingesetzt.

   Die zwei Fundstellen:
     · Kern — dokAusgabe.klasse und dokAusgabe.fussText eines eingelassenen Logikmoduls gingen roh in
       dokumentHTML (klasse ins class-Attribut, fussText in den <footer>), von dort per innerHTML in die Seite.
       Ein unsigniert eingelassenes Modul genügte. Derselbe Footer trug bei einer importierten Vorlage den
       anbieterName aus dem Depot.
     · VC-Issuer — die anbieterId einer Einreichung (Schema: nur minLength 1) ging roh in die Audit-Zeile.

   Die Klasse, nicht nur die zwei Stellen:
     · Jedes Textfeld eines Logikmoduls trägt eine Nutzlast; ALLE HTML-Bauer des Kerns (jede exportierte Funktion
       auf …HTML) laufen mit dem eingelassenen Modul; keine Ausgabe darf die Nutzlast roh enthalten.
     · Jede Zeichenkette in der Audit-Zeile des VC-Issuers kommt als Text, nicht als HTML.
   Grenze: der Durchlauf deckt, was die HTML-Bauer zurückgeben. Senken, die direkt in innerHTML schreiben, hält
   die statische Analyse mit ihrer begründeten Grundlinie (D5, nach dem Release).
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeIssuer, webcrypto } = require('./load-issuer.js');

const NUTZLAST = '<img src=q onerror=alert(9)>';
const AUSBRUCH = 'x"><img src=k onerror=alert(8)>';
const roh = (s) => /<img src=[qk] /.test(String(s || ''));

const MODUL = path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json');
// Schlüssel, die eine Form haben müssen (Kennungen, Typen, Verweise) — sie prüft der Kern selbst; Text sind die übrigen.
const KEINE_TEXTE = new Set(['id', 'feldId', 'typ', 'modulTyp', 'sektor', 'knopfAttr', 'dateiBasis', 'herkunft', 'sprache',
  'eingelassenAm', 'bezugsquelle', 'format', 'quelle', 'wenn', 'feld', 'schluessel', 'key', 'ref', 'art', 'datentyp', 'type']);

function jedesTextfeld(o, anhang) {
  if (Array.isArray(o)) return o.map((x) => jedesTextfeld(x, anhang));
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) r[k] = (typeof v === 'string' && !KEINE_TEXTE.has(k)) ? v + anhang : jedesTextfeld(v, anhang);
    return r;
  }
  return o;
}

async function kernMitFremdmodul(bundle) {
  const { V } = await ladeKern();
  await V.depotAnlegen('fremdtext-senken-pw-1');
  V.getData().logikModule = [];
  const e = V.modulEinlassen(JSON.stringify(bundle), V.getData(), null, null);
  assert.equal(e.angenommen, true, 'Vorbedingung: das Modul wird (unsigniert) eingelassen — ' + (e.grund || ''));
  return V;
}

function fremdesModul() {
  const b = JSON.parse(fs.readFileSync(MODUL, 'utf8'));
  b.id = 'fremd-probe';
  b.dokAusgabe.knopfAttr = 'fremd-probe-dokument';
  return b;
}

test('[Fremdtext·Kern·Rot-Beweis] dokAusgabe.klasse bricht nicht aus dem class-Attribut aus, fussText kommt als Text', async () => {
  const b = fremdesModul();
  b.dokAusgabe.klasse = AUSBRUCH;
  b.dokAusgabe.fussText = NUTZLAST;
  const V = await kernMitFremdmodul(b);
  const h = V.dokumentHTML('fremd-probe');
  assert.match(h, /<article class="pv-dok/, 'Vorbedingung: das Dokument wird gebaut');
  assert.ok(!roh(h), 'keine Nutzlast roh im Dokument-HTML: ' + (h.match(/.{0,40}<img src=[qk].{0,20}/) || [''])[0]);
  assert.ok(h.includes('&lt;img src=q'), 'der Fußtext steht maskiert da, er verschwindet nicht');
});

test('[Fremdtext·Kern] eine gültige Klassenliste bleibt erhalten', async () => {
  const b = fremdesModul();
  b.dokAusgabe.klasse = 'erbschein-dok schmal';
  const V = await kernMitFremdmodul(b);
  assert.match(V.dokumentHTML('fremd-probe'), /<article class="pv-dok erbschein-dok schmal">/);
});

test('[Fremdtext·Kern·Klasse] jedes Textfeld eines fremden Moduls, durch jeden HTML-Bauer: nirgends roh', async () => {
  const V = await kernMitFremdmodul(Object.assign(jedesTextfeld(fremdesModul(), NUTZLAST), { id: 'fremd-probe' }));
  const bauer = Object.keys(V).filter((k) => /HTML$/.test(k) && typeof V[k] === 'function' && k !== 'escapeHTML');
  assert.ok(bauer.length >= 50, 'Positivkontrolle: die HTML-Bauer sind erreichbar (' + bauer.length + ')');
  const funde = [];
  let gebaut = 0;
  for (const k of bauer) {
    for (const args of [[], ['fremd-probe'], ['advanceCare'], ['fremd-probe', null]]) {
      let r;
      try { r = V[k](...args); } catch (_) { continue; }
      if (typeof r !== 'string') continue;
      if (r.includes('&lt;img src=q')) gebaut++;
      if (roh(r)) funde.push(`${k}(${args.join(',')})`);
    }
  }
  assert.ok(gebaut > 0, 'Positivkontrolle: mindestens ein Bauer gibt den Modultext (maskiert) aus');
  assert.deepEqual(funde, [], 'Modultext roh im HTML');
});

test('[Fremdtext·Kern·Rot-Beweis] der Anbietername einer importierten Vorlage steht maskiert im Fuß', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('fremdtext-senken-pw-2');
  const anker = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const ankerPub = await webcrypto.subtle.exportKey('jwk', anker.publicKey);
  const ankerSign = await V._jwsImportSignKey(await webcrypto.subtle.exportKey('jwk', anker.privateKey));
  const anbieter = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const anbieterPub = await webcrypto.subtle.exportKey('jwk', anbieter.publicKey);
  const anbieterSign = await V._jwsImportSignKey(await webcrypto.subtle.exportKey('jwk', anbieter.privateKey));
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'institution/probe', anbieterName: 'Probe AG', anbieterTyp: 'institution/versicherung', publicKeyJwk: anbieterPub },
  };
  const templateJws = await V._signJWS({
    felder: [{ feldname: 'Ablageort', feldtyp: 'text', bereich: 'advanceCare' }],
    wortlaut: 'Ich lege hiermit meine Erklärung fest.',
    wortlautQuelle: { behoerde: 'Probe AG', titel: 'Muster', lizenz: 'mit Zustimmung' },
  }, anbieterSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', await V._signJWS(cert, ankerSign, {}),
    { jetzt: '2026-06-19T00:00:00Z', ankerJwk: ankerPub, templateJws });
  V.importAnwenden(plan);
  const vorlage = V.getData().importierteVorlagen[0];
  assert.ok(vorlage, 'Vorbedingung: die Vorlage ist importiert');
  vorlage.anbieterName = NUTZLAST;   // so kann ein Depot sie mitbringen; beim Laden wird sie nicht erneut geprüft
  const h = V.dokumentHTML(vorlage.id, null);
  assert.ok(!roh(h), 'Anbietername roh im Fuß');
  assert.ok(h.includes('&lt;img src=q'), 'der Anbietername steht maskiert da');
});

function issuerMitZeilen() {
  const { V, document } = ladeIssuer();
  const zeilen = [];
  const erzeugen = document.createElement;
  document.createElement = (...a) => { const el = erzeugen(...a); zeilen.push(el); return el; };
  return { V, zeilen };
}

test('[Fremdtext·VC-Issuer·Rot-Beweis] die anbieterId einer Einreichung steht als Text in der Audit-Zeile', () => {
  const { V, zeilen } = issuerMitZeilen();
  V.auditEintrag({ anbieterId: NUTZLAST, anbieterName: 'n', anbieterTyp: 't', submissionId: null, issuer: 'i', alg: 'Ed25519',
    issuanceDate: 'a', expirationDate: 'b', istTestSentinel: true });
  V.renderAudit();
  assert.ok(zeilen.length > 0, 'Vorbedingung: renderAudit baut Zeilen');
  assert.deepEqual(zeilen.filter((z) => roh(z.innerHTML)).length, 0, 'anbieterId roh als HTML');
  assert.ok(zeilen.some((z) => String(z.textContent).includes(NUTZLAST)), 'die anbieterId steht als Text da');
  assert.ok(zeilen.some((z) => z.textContent === '[TEST-SENTINEL]'), 'die Test-Markierung bleibt');
});

test('[Fremdtext·VC-Issuer·Klasse] jedes Feld eines Audit-Eintrags: nirgends als HTML', () => {
  const { V, zeilen } = issuerMitZeilen();
  V.auditEintrag({ anbieterId: NUTZLAST, anbieterName: NUTZLAST, anbieterTyp: NUTZLAST, submissionId: NUTZLAST, issuer: NUTZLAST,
    alg: NUTZLAST, issuanceDate: NUTZLAST, expirationDate: NUTZLAST, istTestSentinel: false });
  V.renderAudit();
  assert.deepEqual(zeilen.filter((z) => roh(z.innerHTML)).length, 0);
});

/* Die dritte Fundstelle (Prüfstelle der D5-Analyse, als HOCH eingeordnet): der Markenname {marke}. Ein fremdes Depot
   bringt seine brandingModule-Liste ungeprüft mit; der Name ging roh in die Werkzeugleisten-Hinweise, die HTML sein
   dürfen (_TEXTSATZ_HTML_ERLAUBT), und von dort per innerHTML in die Dokumentansicht. Keine Signatur nötig. */
async function fremdesDepotMitMarke(marke) {
  const A = ladeKern().V;
  await A.depotAnlegen('fremd-marke-pw');
  A.akteurSelbstErklaeren('B');
  A.getData().brandingModule = [Object.assign({ modulTyp: 'branding', moduleVersion: 1, herkunft: 'x' }, marke)];
  const umschlag = await A.depotSerialisieren();
  const { V } = ladeKern();
  /* Selbst-Einlass-Sperre (04.10.2026): eine Marke aus einer fremden Datei wäre gesperrt.
     Diese Datei prüft die Senke — wie ein Markenname maskiert wird, WENN er wirkt —, darum hier ohne Sperre. */
  V.SELBST_EINLASS_GESPERRT = false;
  await V.depotLaden(umschlag, 'fremd-marke-pw');
  return V;
}

test('[Fremdtext·Marke·Rot-Beweis] ein Markenname aus einem fremden Depot erreicht keinen HTML-Satz roh', async () => {
  const V = await fremdesDepotMitMarke({ name: NUTZLAST });
  const hinweise = ['pvToolbarHinweis', 'vollmachtToolbarHinweis', 'betreuungToolbarHinweis', 'kiToolbarHinweis', 'k9VorlageToolbarHinweis', 'identitaetLueckenHinweis'];
  for (const k of hinweise) assert.ok(!roh(V.textLesen('strings:' + k + '.text')), k + ' trägt den Markennamen roh');
  assert.ok(!roh(V._markeName()), 'ein Name, der kein reiner Text ist, gilt als nicht gesetzt');
});

test('[Fremdtext·Marke·Klasse] jeder Satz mit {marke}: roh nur als reiner Text, in HTML-Sätzen maskiert', async () => {
  const V = await fremdesDepotMitMarke({ name: 'Bank & Co' });   // reiner Text — gültig, aber mit einem HTML-Sonderzeichen
  assert.equal(V._markeName(), 'Bank & Co', 'Vorbedingung: ein reiner Name gilt');
  const h = V.textLesen('strings:pvToolbarHinweis.text');
  assert.ok(h.includes('Bank &amp; Co'), 'der Ab-Werk-Hinweis trägt {marke} und setzt ihn maskiert ein: ' + h.slice(0, 200));
  assert.ok(!h.includes('Bank & Co'), 'nicht roh');
});

test('[Fremdtext·Marke·Rot-Beweis] eine Markendomain aus einem fremden Depot gilt nur, wenn sie eine Domain ist', async () => {
  const V = await fremdesDepotMitMarke({ name: 'Probe', domain: 'x.de"><img src=q onerror=alert(9)>' });
  assert.ok(!roh(V._markeDomain()));
});

/* Die kleineren Fundstellen derselben Prüfung, im selben Zug behoben. */
const { ladeLesen } = require('./load-lesen.js');


test('[Fremdtext·Kern·Rot-Beweis] eine Zusammenstellung aus dem Depot bringt über kennungen keinen Text ins HTML', async () => {
  const { V, document } = await ladeKern();
  await V.depotAnlegen('fremdtext-senken-pw-3');
  V.getData().zusammenstellungen = [{ id: 'z1', name: 'Heim', kennungen: { length: NUTZLAST } }];
  V.renderZusammenstellen();
  const html = String(document.getElementById('content').innerHTML || '');
  assert.match(html, /Heim/, 'Vorbedingung: die Zusammenstellung wird gezeigt');
  assert.ok(!roh(html));
});

test('[Fremdtext·Lese-App·Rot-Beweis] die Lückensätze (aus einem Sprachmodul überschreibbar) gehen maskiert in den Block', () => {
  /* STRINGS der Lese-App ist zur Laufzeit unveränderlich; ein Sprachmodul setzt die Sätze nur signiert. Darum hier an der
     Quelle: in _lueckenBlockHTML steht jeder Lückensatz in escapeHTML, bevor die (ebenfalls maskierten) Werte hineinkommen. */
  const src = fs.readFileSync(process.env.LESEN_HTML_PATH || path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  const a = src.indexOf('function _lueckenBlockHTML(');
  const koerper = src.slice(a, src.indexOf('\n}\n', a));
  const saetze = koerper.match(/(?:escapeHTML\()?STRINGS\.lueckenSatz\w+/g) || [];
  assert.equal(saetze.length, 4, 'Vorbedingung: die vier Lückensätze');
  assert.deepEqual(saetze.filter((x) => !x.startsWith('escapeHTML(')), []);
  const { V: L } = ladeLesen();
  const h = L._lueckenBlockHTML({ bereichIds: ['a<b'], modulAnzahl: 2, felder: [] });
  assert.ok(h.includes('a&lt;b') && !h.includes('a<b'), 'die Werte bleiben maskiert');
});
