'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   White Label ab Werk — ein Partnerprodukt trägt Logo, Kopfzeilenfarbe und Palette seiner Marke
   (Befund WHITE-LABEL-AB-WERK-OHNE-LOGO-FARBE, U2-ADR-297-Nachtrag 05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Ein Branding-Modul, das der Bau in die Region AB_WERK_BRANDING_PRODUKT legt (U2-ADR-384), ist der
   dritte Transportweg von Fall 2 (U2-ADR-400): das ganze Produkt gehört dem Partner. Bis heute setzte
   es Name und Domain, aber weder das Logo noch die Kopfzeilenfarbe noch die Palette — diese drei hingen
   in `vorDepotKonfigurationAnwenden` allein am signierten Vor-Depot-Bündel.

   Eine Quelle für Fall 2: das signierte Vor-Depot-Bündel geht vor, sonst das Partner-Branding der
   Bau-Region (`_abWerkPartnerBranding`: NUR die Region, `herkunft` nur an deren Wert geprüft). Die
   eigene Vivodepot-Marke bleibt ungefärbt (U2-ADR-297).

   Zwei Modelle (Feld `modell`, nur aus der Bau-Region oder einem signierten Bündel wirksam):
   A 'branding' (Vorgabe): Partnerfarbe und Partner-Logo, die Vivodepot-Bildmarke bleibt daneben.
   B 'white-label': Partnerfarbe und Partner-Logo, keine Vivodepot-Bildmarke; Vivodepot steht nur am
   Herkunftsort (Lizenzhinweis, Impressumslink, Datenschutz-Link).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { PRODUKTE } = require('../tools/lib/vier-produkte.js');
const { kernAus } = require('./produkt-html-erzeugen.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const KERN_QUELLE = fs.readFileSync(KERN_PFAD, 'utf8');
const SLUGS = PRODUKTE.map((p) => p.slug);

// Minimaler, gültiger PNG-Daten-URL (1×1) — besteht _BRANDING_LOGO_MUSTER. Erfundene Probe-Marke, kein echtes Institut.
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const FARBE = '#1b3a5c';
const PARTNER = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'partner-probe',
  name: 'Probebank Musterort', domain: 'probebank.example', farbePrimaer: FARBE, logo: LOGO,
});
const PARTNER_WL = Object.freeze({ ...PARTNER, modell: 'white-label' });
const JETZT = '2026-08-28T09:00:00Z';
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

function fakeRoot() {
  const logoMark = { _html: '<svg class="logo-svg" aria-hidden="true" focusable="false"><use href="#vd-logo"/></svg>',
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; } };
  return {
    style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } },
    querySelector: (sel) => (sel === '.logo-mark' ? logoMark : null),
    _logoMark: logoMark,
  };
}

/* Die Bildmarke, die Willkommen und Dialoge zeichnen (ein Kern ohne den Helfer zeichnet sie immer). */
function bildmarkeAmWillkommen(V) {
  return typeof V._vdBildmarkeHTML === 'function' ? String(V._vdBildmarkeHTML('welcome-logo-mark')).includes('#vd-logo') : true;
}

/* Was ein Partnerprodukt nach dem Vor-Depot-Lauf zeigen muss — je Modell. Leer heißt: alles sichtbar wie verlangt. */
function partnerVerstoesse(V, root, modell) {
  const v = [];
  const w = root.style._werte;
  if (w['--vd-branding-topbar-primaer'] !== FARBE) v.push('Kopfzeilenfarbe: ' + w['--vd-branding-topbar-primaer'] + ' statt ' + FARBE);
  if (!w['--salbei-dunkel'] || !w['--auf-akzent']) v.push('Palette nicht gesetzt');
  const icon = root._logoMark.innerHTML;
  if (!icon.includes('<img src="' + LOGO + '"')) v.push('Partner-Logo fehlt in .logo-mark');
  const vdInKopf = icon.includes('#vd-logo');
  const vdAmWillkommen = bildmarkeAmWillkommen(V);
  if (modell === 'white-label') {
    if (vdInKopf) v.push('B: Vivodepot-Bildmarke steht in der Kopfzeile');
    if (vdAmWillkommen) v.push('B: Vivodepot-Bildmarke steht am Willkommen/Dialog');
    const h = V.einstellungenHTML();
    if (!/data-herkunftsort="1"/.test(h)) v.push('B: Herkunftsort fehlt');
    if (!/herkunft-lizenz/.test(h) || !/herkunft-datenschutz-link/.test(h)) v.push('B: Lizenzhinweis oder Datenschutz-Link fehlt am Herkunftsort');
  } else {
    if (!vdInKopf) v.push('A: Vivodepot-Bildmarke fehlt neben dem Partner-Logo');
    if (!vdAmWillkommen) v.push('A: Vivodepot-Bildmarke fehlt am Willkommen/Dialog');
  }
  return v;
}

/* Die eigene Marke: keine Färbung, Bildmarke steht. */
function eigeneMarkeVerstoesse(V, root) {
  const v = [];
  const w = root.style._werte;
  if (w['--vd-branding-topbar-primaer'] !== undefined) v.push('Kopfzeile gefärbt: ' + w['--vd-branding-topbar-primaer']);
  if (w['--salbei-dunkel'] !== undefined) v.push('Palette gesetzt');
  if (!root._logoMark.innerHTML.includes('#vd-logo')) v.push('Vivodepot-Bildmarke fehlt in der Kopfzeile');
  if (root._logoMark.innerHTML.includes('<img')) v.push('fremdes Bild in der Kopfzeile');
  if (!bildmarkeAmWillkommen(V)) v.push('Vivodepot-Bildmarke fehlt am Willkommen');
  return v;
}

async function partnerLauf(slug, modul, kernOpts) {
  const { V } = ladeKern({ produkt: slug, brandingProdukt: modul, ...(kernOpts || {}) });
  const root = fakeRoot();
  await V.vorDepotKonfigurationAnwenden([], root, OPTS);
  return { V, root };
}

async function inAllenVier(fn) {
  const funde = [];
  for (const slug of SLUGS) for (const x of await fn(slug)) funde.push(slug + ': ' + x);
  return funde;
}

test('[White Label ab Werk·A] in allen vier Produkten: Partner-Branding der Bau-Region färbt Kopfzeile, Logo und Palette, Vivodepot-Bildmarke daneben', async () => {
  assert.equal(SLUGS.length, 4);
  assert.deepEqual(await inAllenVier(async (slug) => { const { V, root } = await partnerLauf(slug, PARTNER); return partnerVerstoesse(V, root, 'branding'); }), []);
});

test('[White Label ab Werk·B] in allen vier Produkten: modell white-label in der Bau-Region färbt Kopfzeile, Logo und Palette, keine Vivodepot-Bildmarke, Herkunftsort steht', async () => {
  assert.deepEqual(await inAllenVier(async (slug) => { const { V, root } = await partnerLauf(slug, PARTNER_WL); return partnerVerstoesse(V, root, 'white-label'); }), []);
});

test('[White Label ab Werk·Gegenprobe] in allen vier Produkten bleibt das Vivodepot-eigene Produkt ungefärbt, mit Bildmarke', async () => {
  assert.deepEqual(await inAllenVier(async (slug) => {
    const { V } = ladeKern({ produkt: slug });
    const root = fakeRoot();
    await V.vorDepotKonfigurationAnwenden([], root, OPTS);
    return eigeneMarkeVerstoesse(V, root);
  }), []);
});

test('[White Label ab Werk·Gegenprobe] eine Bau-Region mit der Vivodepot-Marke (herkunft vivodepot) färbt nicht — auch nicht mit modell white-label', async () => {
  const { V, root } = await partnerLauf('privat-de', { modulTyp: 'branding', moduleVersion: 1, herkunft: 'vivodepot', name: 'Vivodepot', farbePrimaer: FARBE, logo: LOGO, modell: 'white-label' });
  assert.equal(V._abWerkPartnerBranding(), null);
  assert.deepEqual(eigeneMarkeVerstoesse(V, root), []);
});

/* Rot-Beweis: die neue Zeile in vorDepotKonfigurationAnwenden zurückgenommen (wieder nur `echtesBuendel`) — die Probe fällt. */
const FAERBEND_ZEILE = '    const faerbend = echtesBuendel || _abWerkPartnerBranding();';
function mitMutiertemKern(ersetzen, fn) {
  assert.equal(KERN_QUELLE.split(ersetzen[0]).length, 2, 'Vorbedingung: die Stelle steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'white-label-ab-werk-'));
  const pfad = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(pfad, KERN_QUELLE.replace(ersetzen[0], ersetzen[1]));
  return Promise.resolve().then(() => fn(pfad)).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
}

test('[White Label ab Werk·Rot-Beweis] ohne die faerbend-Zeile (nur das signierte Bündel) bleibt das Partnerprodukt ohne Farbe, Logo und Palette', async () => {
  await mitMutiertemKern([FAERBEND_ZEILE, '    const faerbend = echtesBuendel;'], async (htmlPfad) => {
    const { V, root } = await partnerLauf('privat-de', PARTNER, { htmlPfad, backen: true });
    const funde = partnerVerstoesse(V, root, 'branding');
    assert.ok(funde.some((x) => x.startsWith('Kopfzeilenfarbe')), funde.join(' · '));
    assert.ok(funde.includes('Partner-Logo fehlt in .logo-mark'), funde.join(' · '));
    assert.ok(funde.includes('Palette nicht gesetzt'), funde.join(' · '));
  });
});

test('[White Label ab Werk·Rot-Beweis] liest _abWerkPartnerBranding die Herkunft nicht, färbt die eigene Marke — die Gegenprobe fällt', async () => {
  await mitMutiertemKern(["  return (AB_WERK_BRANDING_PRODUKT.herkunft !== 'vivodepot') ? _AB_WERK_BRANDING : null;", '  return _AB_WERK_BRANDING;'], async (htmlPfad) => {
    const { V, root } = await partnerLauf('privat-de', { modulTyp: 'branding', moduleVersion: 1, herkunft: 'vivodepot', name: 'Vivodepot', farbePrimaer: FARBE }, { htmlPfad, backen: true });
    assert.ok(eigeneMarkeVerstoesse(V, root).length > 0);
  });
});

/* ── Gegenlesung: nie aus Depot-Datei oder unsigniertem Einlass ─────────────────────────── */

test('[White Label ab Werk·Rot-Beweis Depot-Datei] ein Branding-Modul herkunft partner-x OHNE Signatur in der Depot-Datei färbt in keinem Produkt und nimmt die Bildmarke nicht', async () => {
  assert.deepEqual(await inAllenVier(async (slug) => {
    const { V } = ladeKern({ produkt: slug });
    V.setData({ ...V.getData(), brandingModule: [{ modulTyp: 'branding', moduleVersion: 1, herkunft: 'partner-x', farbePrimaer: FARBE, logo: LOGO, modell: 'white-label' }] });
    const root = fakeRoot();
    await V.vorDepotKonfigurationAnwenden([], root, OPTS);
    const v = eigeneMarkeVerstoesse(V, root);
    if (V._abWerkPartnerBranding() !== null) v.push('die Depot-Datei gilt als Bau-Region');
    return v;
  }), []);
});

test('[White Label ab Werk·Rot-Beweis Einlass] ein UNSIGNIERTES Vor-Depot-Bündel mit modell white-label färbt nicht und nimmt die Bildmarke nicht', async () => {
  assert.deepEqual(await inAllenVier(async (slug) => {
    const { V } = ladeKern({ produkt: slug });
    const root = fakeRoot();
    await V.vorDepotKonfigurationAnwenden([{ modulTyp: 'branding', moduleVersion: 1, herkunft: 'partner-x', sprache: 'de', farbePrimaer: FARBE, logo: LOGO, modell: 'white-label' }], root, OPTS);
    return eigeneMarkeVerstoesse(V, root);
  }), []);
});

/* Der In-Depot-Weg (_moduleEinlassWirken): Kopfzeile ungefärbt, Bildmarke steht, keine Bau-Region erfunden. */
function inDepotVerstoesse(V, document) {
  const v = [];
  const stil = document.documentElement && document.documentElement.style;
  const kopf = stil && typeof stil.getPropertyValue === 'function' ? stil.getPropertyValue('--vd-branding-topbar-primaer') : (stil && stil['--vd-branding-topbar-primaer']);
  if (kopf) v.push('Kopfzeile gefärbt: ' + kopf);
  if (!/#vd-logo/.test(V._vdBildmarkeHTML('welcome-logo-mark'))) v.push('Vivodepot-Bildmarke fehlt am Willkommen');
  if (V._abWerkPartnerBranding() !== null) v.push('Partner-Branding aus dem Depot statt aus der Bau-Region');
  return v;
}

test('[White Label ab Werk·Rot-Beweis In-Depot-Weg] ein im Depot angedocktes unsigniertes Branding (modell white-label) wirkt nicht als ab Werk: Kopfzeile und Bildmarke bleiben', async () => {
  // Die Wahl der Erweiterungen (S5) steht am Kopf nicht (kein depotModuleWaehlen/_erweiterungWahlMoeglich); geprüft wird darum der In-Depot-Weg.
  assert.deepEqual(await inAllenVier(async (slug) => {
    const { V, document } = ladeKern({ produkt: slug });
    await V.depotAnlegen('white-label-probe-depot-1!');
    V.getData().brandingModule = [{ modulTyp: 'branding', moduleVersion: 1, herkunft: 'partner-x', farbePrimaer: FARBE, logo: LOGO, modell: 'white-label' }];
    V._moduleEinlassWirken({ angenommen: true, typ: 'branding', kennung: 'partner-x' });
    return inDepotVerstoesse(V, document);
  }), []);
});

/* Über den echten Einlassweg: ein UNSIGNIERTES Branding, das sich selbst `abWerk: true` gibt, ist kein ab Werk. `modulEinlassen`
   weist es ab (Branding nur signiert, A523), und keine der vier Stellen färbt: Bau-Region, Kopfzeilenfarbe, Logo in der
   Kopfzeile, Bildmarke am Willkommen. */
const SELBST_AB_WERK = Object.freeze({ modulTyp: 'branding', moduleVersion: 1, appVersion: 1, herkunft: 'partner-x', farbePrimaer: FARBE, logo: LOGO, modell: 'white-label', abWerk: true });
async function selbstAbWerkVerstoesse(V, document) {
  await V.depotAnlegen('white-label-probe-depot-2!');
  const r = V.modulEinlassen(JSON.stringify(SELBST_AB_WERK), V.getData());
  const v = [];
  if (r.angenommen) v.push('das unsignierte Branding mit abWerk:true wurde angenommen');
  else V._moduleEinlassWirken(r);
  const root = fakeRoot();
  await V.vorDepotKonfigurationAnwenden([], root, OPTS);
  v.push(...eigeneMarkeVerstoesse(V, root), ...inDepotVerstoesse(V, document));
  return v;
}

test('[White Label ab Werk·Rot-Beweis Einlass abWerk] ein unsigniertes Branding mit abWerk:true über modulEinlassen färbt an keiner der vier Stellen als ab Werk', async () => {
  assert.deepEqual(await inAllenVier(async (slug) => {
    const { V, document } = ladeKern({ produkt: slug });
    return selbstAbWerkVerstoesse(V, document);
  }), []);
});

test('[White Label ab Werk·Rot-Beweis abWerk beide Wege] abWerk:true in der Depot-Datei und über _moduleEinlassWirken (selbst als angenommen gemeldet) färbt an keiner der vier Stellen', async () => {
  assert.deepEqual(await inAllenVier(async (slug) => {
    const v = [];
    const a = ladeKern({ produkt: slug });
    await a.V.depotAnlegen('white-label-probe-depot-4!');
    a.V.setData({ ...a.V.getData(), brandingModule: [SELBST_AB_WERK] });
    const ra = fakeRoot();
    await a.V.vorDepotKonfigurationAnwenden([], ra, OPTS);
    v.push(...[...eigeneMarkeVerstoesse(a.V, ra), ...inDepotVerstoesse(a.V, a.document)].map((x) => 'Depot-Datei: ' + x));
    const b = ladeKern({ produkt: slug });
    await b.V.depotAnlegen('white-label-probe-depot-5!');
    b.V.getData().brandingModule = [SELBST_AB_WERK];
    b.V._moduleEinlassWirken({ angenommen: true, typ: 'branding', kennung: 'partner-x' });
    const rb = fakeRoot();
    await b.V.vorDepotKonfigurationAnwenden([], rb, OPTS);
    v.push(...[...eigeneMarkeVerstoesse(b.V, rb), ...inDepotVerstoesse(b.V, b.document)].map((x) => 'In-Depot-Weg: ' + x));
    return v;
  }), []);
});

test('[White Label ab Werk·Rot-Beweis Einlass abWerk·Mutation] nimmt der Einlass abWerk:true als Ersatz für die Signatur, fällt die Probe', async () => {
  const stelle = "    if (reg.nurGeprueft && !(typeof anbieterIdGeprueft === 'string' && anbieterIdGeprueft.trim())) {";
  await mitMutiertemKern([stelle, "    if (reg.nurGeprueft && modul.abWerk !== true && !(typeof anbieterIdGeprueft === 'string' && anbieterIdGeprueft.trim())) {"], async (htmlPfad) => {
    const { V, document } = kernAus(htmlPfad, { produkt: 'privat-de' });
    const funde = await selbstAbWerkVerstoesse(V, document);
    assert.ok(funde.includes('das unsignierte Branding mit abWerk:true wurde angenommen'), funde.join(' · '));
  });
});

test('[White Label ab Werk·Rot-Beweis Feld abWerk·Mutation] liest _abWerkPartnerBranding das Feld abWerk eines Branding-Moduls der Datei, fällt die Probe an allen vier Stellen', async () => {
  const kopf = 'function _abWerkPartnerBranding() {\n';
  const gelesen = kopf + "  { const l = (data && Array.isArray(data.brandingModule)) ? data.brandingModule.filter((m) => m && m.abWerk === true) : []; if (l.length) { _fall2Marke = { modell: 'white-label', logo: l[0].logo }; return l[0]; } }\n";
  await mitMutiertemKern([kopf, gelesen], async (htmlPfad) => {
    const { V, document } = kernAus(htmlPfad, { produkt: 'privat-de' });
    await V.depotAnlegen('white-label-probe-depot-3!');
    V.setData({ ...V.getData(), brandingModule: [SELBST_AB_WERK] });
    const root = fakeRoot();
    await V.vorDepotKonfigurationAnwenden([], root, OPTS);
    const funde = [...eigeneMarkeVerstoesse(V, root), ...inDepotVerstoesse(V, document)];
    assert.ok(funde.includes('Partner-Branding aus dem Depot statt aus der Bau-Region'), funde.join(' · '));
    assert.ok(funde.some((x) => x.startsWith('Kopfzeile gefärbt')), funde.join(' · '));
  });
});

/* ── Signiertes Bündel trägt das Modell ebenso ─────────────────────────────────────────── */
async function signiertesBuendel(V, modul) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'institution/white-label-probe', anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk: pubJwk },
  };
  const providerCredentialJws = await V._signJWS(cert, await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK), {});
  const modulSignaturJws = await V._signJWS(modul, await V._jwsImportSignKey(privJwk), {});
  return { providerCredentialJws, modulSignaturJws };
}

test('[White Label ab Werk·signiertes Bündel] ein signiertes Vor-Depot-Bündel mit modell white-label nimmt die Vivodepot-Bildmarke, ohne Feld bleibt sie (A)', async () => {
  for (const [modell, erwartet] of [['white-label', 'white-label'], [undefined, 'branding']]) {
    const { V } = ladeKern();
    const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', sprache: 'de', farbePrimaer: FARBE, logo: LOGO };
    if (modell) modul.modell = modell;
    const root = fakeRoot();
    await V.vorDepotKonfigurationAnwenden([await signiertesBuendel(V, modul)], root, OPTS);
    assert.deepEqual(partnerVerstoesse(V, root, erwartet).filter((x) => !x.includes('Herkunftsort') && !x.includes('Lizenzhinweis')), [], String(modell));
  }
});

test('[White Label ab Werk·Schema] modell nimmt nur branding oder white-label; ein anderer Wert wird verworfen und gilt als A', () => {
  const { V } = ladeKern();
  const ok = V.brandingModulPruefen({ moduleVersion: 1, farbePrimaer: FARBE, modell: 'white-label' });
  assert.equal(ok.gueltig, true);
  assert.deepEqual(ok.verworfene, []);
  const falsch = V.brandingModulPruefen({ moduleVersion: 1, farbePrimaer: FARBE, modell: 'ohne-alles' });
  assert.ok(falsch.verworfene.some((x) => x.schluessel === 'modell'));
  assert.equal(V._brandingModellAus({ modell: 'ohne-alles' }), 'branding');
  assert.equal(V._brandingModellAus(null), 'branding');
  assert.equal(V._brandingModellAus({ modell: 'white-label' }), 'white-label');
});

/* Proben-Deklaration (U2-ADR-099 B-2): je Klausel-Bindung in U2-ADR-297 (Nachtrag 05.10.2026) die Diskriminante. */
module.exports = {
  PROBEN: [
    { fuer: '[White Label ab Werk·A] in allen vier Produkten', diskriminante: partnerVerstoesse },
    { fuer: '[White Label ab Werk·B] in allen vier Produkten', diskriminante: partnerVerstoesse },
    { fuer: '[White Label ab Werk·Gegenprobe] in allen vier Produkten', diskriminante: eigeneMarkeVerstoesse },
    { fuer: '[White Label ab Werk·Rot-Beweis Depot-Datei]', diskriminante: eigeneMarkeVerstoesse },
    { fuer: '[White Label ab Werk·Rot-Beweis Einlass]', diskriminante: eigeneMarkeVerstoesse },
    { fuer: '[White Label ab Werk·Rot-Beweis In-Depot-Weg]', diskriminante: inDepotVerstoesse },
  ],
};
