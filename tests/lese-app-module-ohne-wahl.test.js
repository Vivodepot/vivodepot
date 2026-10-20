'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Befund LESE-APP-MODULE-OHNE-WAHL (HOCH, 17.10.2026): in der Lese-App wirkt ein Modul, das eine Datei mitbringt, nur, wenn es
   unter die Ausnahmen des Kerns fällt (ab Werk nach Inhalt, Sprachmodul gleich einer nachgeprüften Nutzlast, nachgeprüfter
   Beleg). Alle anderen wirken nicht; die Lese-App bietet keine Wahl an. Eine Zeile unter der Herkunftsangabe nennt die nicht
   angewandten Module mit Name und Wirkung.

   Die Klassenprobe geht über ALLE Fächer aus MODUL_SLOTS. Rot-Beweise: dieselbe Lese-App ohne den Markierungsaufruf im Einstieg
   (`_depotUebernehmenGeprueft`), und ohne die Übertragung der Markierung auf umgeschriebene Logik-Module (`_foldVollmachtenLesen`)
   — dann wirkt das Modul. Der Studio-Gegenpart (das Studio öffnet kein Depot) steht in tests/studio-oeffnet-kein-depot.test.js.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen, LESEN_PATH, webcrypto } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

const LESE_HTML = fs.readFileSync(LESEN_PATH, 'utf8');
const KERN_HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const kopie = (x) => JSON.parse(JSON.stringify(x));

/* Die Lese-App mit ersetzten Stellen, für die Rot-Beweise. Jede Stelle steht genau einmal im Quelltext. */
function leseOhne(...paare) {
  let html = LESE_HTML;
  for (const [alt, neu] of paare) {
    assert.equal(html.split(alt).length, 2, 'Vorbedingung: die Stelle steht genau einmal in der Lese-App: ' + alt.trim());
    html = html.replace(alt, () => neu);
  }
  return html;
}
const MARKIERUNG = '  _depotModuleNichtAngewandtMarkierenLesen(obj);\n';
const UEBERTRAGUNG = "  if (obj && Array.isArray(obj.logikModule)) obj.logikModule.forEach((m, i) => { if (_logikNichtAngewandt[i] && m && typeof m === 'object') _DEPOT_NICHT_ANGEWANDT_LESEN.add(m); });\n";

/* ── Je Fach ein gültiges, unsigniertes Modul ─────────────────────────────── */
const MESSPUNKT = 'strings:sichtVoll.text';
const blatt = (titel) => ({ titel, icon: 'users', bloecke: [{ id: 'b1', titel: 'Block', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] });
const ERBSCHEIN = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8'));
const MODULE = Object.freeze({
  textsatzModule: { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'fr', herkunft: 'probe', texte: { [MESSPUNKT]: 'MITGEREIST-TEXT' } },
  rechtsraumModule: { modulTyp: 'rechtsraum', moduleVersion: 1, rechtsraum: 'XQ', name: 'Probe-Rechtsraum', herkunft: 'probe' },
  institutionsArten: { modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de', herkunft: 'probe', name: 'Probe-Arten', arten: { a: 'A' } },
  formatModule: { modulTyp: 'format', moduleVersion: 1, herkunft: 'probe', name: 'Probe-Format', sektor: 'identity' },
  bereichsModule: { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'urn:partner-probe:v1', sprache: 'de',
    bereiche: { 'partner-werkstatt': { id: 'partner-werkstatt', icon: 'wrench', label: 'Werkstatt & Lager',
      sektionen: [{ id: 'lager', label: 'Lager', felder: [{ id: 'regal', typ: 'text', label: 'Regal' }] }] } } },
  situationsModule: { modulTyp: 'situation', moduleVersion: 1, herkunft: 'probe', sprache: 'de', situationen: { 'probe-blatt': blatt('Probe-Lebenslage') } },
  wizardsModule: { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'probe', name: 'Probe-Weg' },
  ereignisAchseModule: { modulTyp: 'ereignisAchse', moduleVersion: 1, herkunft: 'probe', name: 'Probe-Ereignisse', eintraege: [] },
  brandingModule: { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', name: 'Fremdmarke', domain: 'fremd.example', farbePrimaer: '#123456' },
  logikModule: Object.assign(kopie(ERBSCHEIN), { id: 'probe-erbschein' }),
  stellensatzModule: { modulTyp: 'stellensatz', moduleVersion: 1, herkunft: 'probe', name: 'Probe-Stellen' },
  erscheinungsModule: { modulTyp: 'erscheinung', moduleVersion: 1, herkunft: 'probe', name: 'Probe-Erscheinung' },
  blattformatModule: { modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'probe', name: 'Probe-Blatt' },
  bedingungskatalogModule: { modulTyp: 'bedingungskatalog', moduleVersion: 1, herkunft: 'probe', name: 'Probe-Bedingungen' },
  angehoerigenVorlagenModule: { modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'probe', sprache: 'de', rechtsraum: 'DE',
    rechtsraumName: 'Deutschland', situationen: { 'krankenhaus-de': blatt('Probe-Angehörigenblatt') } },
});
function depotMitAllen() {
  const d = { schemaVersion: 89, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, textsprache: 'fr',
    sektoren: { identity: { givenName: 'Hedwig', familyName: 'Muster' }, advanceCare: { provisionInstruments: [{ id: 'i1', instrument: 'will', form: 'beurkundet' }] },
      'partner-werkstatt': { regal: 'Regal 7' } } };
  for (const slot of Object.keys(MODULE)) d[slot] = [kopie(MODULE[slot])];
  return d;
}
async function oeffnen(html, d) {
  const { V } = ladeLesen(Object.assign({ ohneSaat: true }, html ? { html } : {}));
  V.setData(await V._depotUebernehmenGeprueft(d || depotMitAllen()));
  return V;
}
/* Was in jedem Register der Lese-App von den Probe-Modulen angekommen ist. */
function angekommen(V) {
  return {
    textsatz: V.textLesen(MESSPUNKT) === 'MITGEREIST-TEXT',
    rechtsraum: !!V.rechtsraumModulFuer('XQ'),
    bereich: !!V.SEKTOR_BY_ID['partner-werkstatt'],
    situation: !!V.situationByIdLesen('probe-blatt'),
    angehoerigen: Array.from(V.angehoerigenSituationenAlleLesen()).some((s) => s.titel === 'Probe-Angehörigenblatt'),
    logik: V._logikModuleAlleLesen(V.getData()).some((m) => m && m.id === 'probe-erbschein'),
    markeName: V._markeName() === 'Fremdmarke',
    markeDomain: V._markeDomain() === 'fremd.example',
  };
}

test('[Ohne-Wahl·Register] MODUL_SLOT_TYP_LESEN trägt genau die Fächer aus MODUL_SLOTS, je mit dem Typ aus EINLASS_REGISTER des Kerns', () => {
  const { V } = ladeLesen({ ohneSaat: true });
  assert.deepEqual(Object.keys(V.MODUL_SLOT_TYP_LESEN).sort(), Array.from(V.MODUL_SLOTS).sort());
  const block = KERN_HTML.slice(KERN_HTML.indexOf('const EINLASS_REGISTER = Object.freeze(['));
  const paare = [...block.slice(0, block.indexOf('\n]);')).matchAll(/typ: '([A-Za-z]+)', slot: '([A-Za-z]+)'/g)].map((m) => [m[2], m[1]]);
  assert.equal(paare.length, 15, 'Positivkontrolle: 15 Register im Kern gefunden');
  assert.deepEqual(Object.fromEntries(paare), Object.assign({}, V.MODUL_SLOT_TYP_LESEN));
  assert.deepEqual(Object.keys(MODULE).sort(), Array.from(V.MODUL_SLOTS).sort(), 'die Probe deckt jedes Fach');
});

test('[Ohne-Wahl·Klasse] ein unsigniertes Modul in jedem Fach wirkt nicht; die Marke ist die eingebaute; die Zeile nennt jedes', async () => {
  const V = await oeffnen();
  const d = V.getData();
  for (const slot of V.MODUL_SLOTS) {
    assert.equal(V._depotModuleWirksamLesen(d[slot]).length, 0, 'nicht angewandt: ' + slot);
  }
  assert.deepEqual(angekommen(V), { textsatz: false, rechtsraum: false, bereich: false, situation: false, angehoerigen: false,
    logik: false, markeName: false, markeDomain: false });
  assert.equal(V._markeName(), 'Vivodepot');
  assert.equal(V._markeDomain(), 'vivodepot.de');
  const liste = V.moduleNichtAngewandtLesen(d);
  assert.equal(liste.length, 15);
  const zeile = V.moduleNichtAngewandtZeileHTML(d);
  assert.ok(zeile.includes(V.escapeHTML(V.STRINGS.moduleNichtAngewandtZeile)));
  for (const g of liste) {
    assert.ok(typeof g.name === 'string' && g.name.trim(), 'Name je Modul: ' + g.typ);
    assert.ok(typeof g.wirkung === 'string' && g.wirkung.trim(), 'Wirkung je Modul: ' + g.typ);
    assert.ok(zeile.includes(V.escapeHTML(g.name + ' · ' + g.wirkung)), 'die Zeile nennt ' + g.typ);
  }
  // Nie Typ oder Fach in der Benutzersicht.
  for (const roh of ['brandingModule', 'logikModul', 'textsatzModule', 'angehoerigenVorlage', 'ereignisAchse']) assert.ok(!zeile.includes(roh), 'roh: ' + roh);
  assert.ok(zeile.includes('Fremdmarke') && zeile.includes('Werkstatt &amp; Lager'), 'der eigene Name des Moduls steht dabei');
  // In der Depot-Ansicht steht die Zeile unter der Herkunftsangabe.
  const { V: W, document } = ladeLesen({ ohneSaat: true });
  W.setData(await W._depotUebernehmenGeprueft(depotMitAllen()));
  W.renderVollExport();
  const html = String(document.getElementById('app').innerHTML);
  assert.ok(html.indexOf('id="herkunft-marke"') >= 0 && html.indexOf('id="modul-nicht-angewandt"') > html.indexOf('id="herkunft-marke"'));
});

test('[Ohne-Wahl·Klasse·Rot-Beweis] ohne den Markierungsaufruf im Einstieg wirkt jedes Probe-Modul — die Probe misst also etwas', async () => {
  const V = await oeffnen(leseOhne([MARKIERUNG, '']));
  assert.deepEqual(angekommen(V), { textsatz: true, rechtsraum: true, bereich: true, situation: true, angehoerigen: true,
    logik: true, markeName: true, markeDomain: true });
  assert.equal(V.moduleNichtAngewandtZeileHTML(V.getData()), '');
});

test('[Ohne-Wahl·Zeile] ohne Module der Datei keine Zeile; Name und Wirkung gehen durch escapeHTML', async () => {
  const leer = await oeffnen(null, { schemaVersion: 89, sektoren: { identity: { givenName: 'Hedwig' } } });
  assert.equal(leer.moduleNichtAngewandtZeileHTML(leer.getData()), '');
  const d = { schemaVersion: 89, sektoren: {}, brandingModule: [{ modulTyp: 'branding', moduleVersion: 1, name: '<img src=x onerror=alert(1)>' }] };
  const V = await oeffnen(null, d);
  const zeile = V.moduleNichtAngewandtZeileHTML(V.getData());
  assert.ok(zeile.includes('&lt;img src=x onerror=alert(1)&gt;') && !zeile.includes('<img'), zeile);
});

test('[Ohne-Wahl·Umschreibung·Rot-Beweis] ein Logik-Modul mit alter Kennung, das der Fold durch eine Kopie ersetzt, bleibt nicht angewandt', async () => {
  const alt = Object.assign(kopie(ERBSCHEIN), { id: 'probe-alt', sektor: 'vorsorge' });
  const d = () => ({ schemaVersion: 75, sektoren: {}, logikModule: [kopie(alt)] });
  const V = await oeffnen(null, d());
  assert.equal(V.getData().logikModule[0].sektor, 'advanceCare', 'Vorbedingung: der Fold hat das Modul umgeschrieben');
  assert.ok(!V._logikModuleAlleLesen(V.getData()).some((m) => m && m.id === 'probe-alt'), 'die Kopie wirkt nicht');
  assert.equal(V.moduleNichtAngewandtLesen(V.getData()).length, 1, 'und steht in der Zeile');
  const R = await oeffnen(leseOhne([UEBERTRAGUNG, '']), d());
  assert.ok(R._logikModuleAlleLesen(R.getData()).some((m) => m && m.id === 'probe-alt'), 'ohne Übertragung wirkt die Kopie');
});

/* ── Gegenproben: was im Kern ohne Wahl wirkt, wirkt auch hier ─────────────── */
let _ms = null;
function echteMitschrift() {
  if (!_ms) {
    _ms = (async () => {
      const { V: K } = ladeKern();
      await K.depotAnlegen('pw-ohne-wahl-mitschrift-1');
      K.akteurSelbstErklaeren('M');
      return JSON.stringify(K.ankerDaten().abWerkMitschrift);
    })();
  }
  return _ms.then((s) => JSON.parse(s));
}
test('[Ohne-Wahl·Gegenprobe·ab Werk] Module, die nach Inhalt ab Werk sind, wirken weiter und stehen nicht in der Zeile', async () => {
  const ms = await echteMitschrift();
  const logik = ms.logikModul[0];
  const rr = ms.rechtsraumModule[0];
  assert.ok(logik && logik.id && rr && rr.rechtsraum, 'Vorbedingung: die Mitschrift trägt ein Logik- und ein Rechtsraum-Modul');
  const d = () => ({ schemaVersion: 89, sektoren: {}, logikModule: [kopie(logik)], rechtsraumModule: [kopie(rr)] });
  const V = await oeffnen(null, d());
  assert.ok(V._abWerkHerkunftLesen(V.getData().logikModule[0]) && V._abWerkHerkunftLesen(V.getData().rechtsraumModule[0]),
    'Vorbedingung: nach Inhalt ab Werk festgestellt');
  assert.ok(V._logikModuleAlleLesen(V.getData()).some((m) => m && m.id === logik.id), 'das Ab-Werk-Logikmodul wirkt');
  assert.ok(V.rechtsraumModulFuer(rr.rechtsraum), 'das Ab-Werk-Rechtsraum-Modul ist angemeldet');
  assert.equal(V.moduleNichtAngewandtLesen(V.getData()).length, 0);
  assert.equal(V.moduleNichtAngewandtZeileHTML(V.getData()), '');
  // Dasselbe Logikmodul, ein Zeichen im Titel verändert: nicht mehr ab Werk, nicht angewandt.
  const veraendert = d();
  veraendert.logikModule[0].titel = String(veraendert.logikModule[0].titel) + ' ';
  const W = await oeffnen(null, veraendert);
  assert.ok(!W._logikModuleAlleLesen(W.getData()).some((m) => m && m.id === logik.id && m.titel === veraendert.logikModule[0].titel));
  assert.equal(W.moduleNichtAngewandtLesen(W.getData()).length, 1);
});

const ANKER_PRIV = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ANKER_PRIV.x }), jetzt: '2026-09-16T12:00:00Z' });
async function beleg(modul) {
  const { V } = ladeKern({ blank: true });
  const sign = async (n, jwk) => V._signJWS(n, await V._jwsImportSignKey(jwk), {});
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const cert = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'institution/ohne-wahl-probe', anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk: pub } };
  return { providerCredentialJws: await sign(cert, ANKER_PRIV), modulSignaturJws: await sign(modul, priv) };
}
test('[Ohne-Wahl·Gegenprobe·Beleg] ein Modul mit nachgeprüftem Beleg wirkt; ein Beleg über anderen Inhalt oder ein anderes Fach nicht', async () => {
  const marke = kopie(MODULE.brandingModule);
  const mitBeleg = Object.assign(kopie(marke), { beleg: await beleg(marke) });
  const V = ladeLesen({ ohneSaat: true }).V;
  V.setData(await V._depotUebernehmenGeprueft({ schemaVersion: 89, sektoren: {}, brandingModule: [mitBeleg] }, OPTS));
  assert.ok(V.modulBelegGeprueftLesen(V.getData().brandingModule[0]), 'Vorbedingung: der Beleg ist nachgeprüft');
  assert.equal(V._markeName(), 'Fremdmarke');
  assert.equal(V.moduleNichtAngewandtLesen(V.getData()).length, 0);
  // Inhalt nach dem Signieren geändert: der Beleg trägt nicht.
  const geaendert = Object.assign(kopie(mitBeleg), { name: 'Andere Marke' });
  const W = ladeLesen({ ohneSaat: true }).V;
  W.setData(await W._depotUebernehmenGeprueft({ schemaVersion: 89, sektoren: {}, brandingModule: [geaendert] }, OPTS));
  assert.equal(W._markeName(), 'Vivodepot');
  // Dieselbe signierte Nutzlast im falschen Fach: kein Beleg für dieses Fach.
  const X = ladeLesen({ ohneSaat: true }).V;
  X.setData(await X._depotUebernehmenGeprueft({ schemaVersion: 89, sektoren: {}, formatModule: [kopie(mitBeleg)] }, OPTS));
  assert.equal(X.modulBelegGeprueftLesen(X.getData().formatModule[0]), null);
  assert.equal(X.moduleNichtAngewandtLesen(X.getData()).length, 1);
  // Ohne Anker der Probe (eingebauter Anker): die Kette trägt nicht.
  const Y = ladeLesen({ ohneSaat: true }).V;
  Y.setData(await Y._depotUebernehmenGeprueft({ schemaVersion: 89, sektoren: {}, brandingModule: [kopie(mitBeleg)] }));
  assert.equal(Y._markeName(), 'Vivodepot');
});

test('[Ohne-Wahl·Selbstauskunft] Felder, die Herkunft oder Prüfung behaupten, machen kein Modul wirksam', async () => {
  const selbst = { ungeprueft: false, pruefstufe: 'intern', abWerk: true, signiert: true, anbieterIdGeprueft: true,
    beleg: { providerCredentialJws: 'x', modulSignaturJws: 'y' } };
  const V = await oeffnen(null, { schemaVersion: 89, sektoren: {}, brandingModule: [Object.assign(kopie(MODULE.brandingModule), selbst)] });
  assert.equal(V._markeName(), 'Vivodepot');
  assert.equal(V.moduleNichtAngewandtLesen(V.getData()).length, 1);
});

/* ── Kein Inhaltsverlust ──────────────────────────────────────────────────── */
test('[Ohne-Wahl·Inhalt] die Werte der Datei bleiben unberührt und in den eingebauten Bereichen sichtbar', async () => {
  const V = await oeffnen();
  const d = V.getData();
  assert.ok(String(V.sektorHTML('identity')).includes('Hedwig'), 'ein Wert eines eingebauten Bereichs steht in der Sicht');
  assert.equal(d.sektoren['partner-werkstatt'].regal, 'Regal 7', 'der Wert im Bereich eines nicht angewandten Moduls bleibt in der Datei');
  for (const slot of V.MODUL_SLOTS) assert.equal(d[slot].length, 1, 'das Modul selbst bleibt in der Datei: ' + slot);
});
/* Nachbau C, „lesen ja, gelten nein“ (entschieden 17.10.2026): ein Bereich mit Werten, den nur ein nicht angewandtes Bereichsmodul
   beschreibt, steht neutral in einer Ansicht — Kennung und Wert, gekennzeichnet, ohne Label, Typ oder Reihenfolge der Erweiterung. */
const NEUTRAL_WERTE = Object.freeze({
  zusatz: 'Nicht im Modul beschrieben',
  regal: 'Regal 7',
  faecher: [{ fach: 'A1', menge: 3 }, { fach: 'B2', notiz: 'oben links' }],
  ort: { raum: 'Keller', tuer: { farbe: 'grün' } },
  anzahl: 42,
  geprueft: true,
  roh: '<script>alert(1)</script>',
});
function blaetter(w, raus) {
  if (Array.isArray(w)) { for (const x of w) blaetter(x, raus); return raus; }
  if (w && typeof w === 'object') { for (const k of Object.keys(w)) blaetter(w[k], raus); return raus; }
  raus.push(String(w)); return raus;
}
function neutralesDepot() {
  const d = depotMitAllen();
  d.sektoren['partner-werkstatt'] = kopie(NEUTRAL_WERTE);
  return d;
}
function alleAnsichten(V) {
  const ids = Object.keys(V.SEKTOR_BY_ID).concat(['partner-werkstatt']);
  return ids.map((id) => String(V.sektorHTML(id))).join('\n');
}
const NEUTRAL_WEICHE = '  if (!sek) return _bereichNichtAngewandtHTML(sektorId);   // Nachbau C: lesen ja, gelten nein\n';

test('[Ohne-Wahl·Inhalt·neutral] jeder Wert eines Bereichs, den nur ein nicht angewandtes Modul beschreibt, steht in einer Ansicht', async () => {
  const V = await oeffnen(null, neutralesDepot());
  assert.equal(V.SEKTOR_BY_ID['partner-werkstatt'], undefined, 'das Modul wirkt weiter nicht');
  const html = String(V.sektorHTML('partner-werkstatt'));
  const ansichten = alleAnsichten(V);
  for (const w of blaetter(NEUTRAL_WERTE, [])) assert.ok(ansichten.includes(V.escapeHTML(w)), 'steht in einer Ansicht: ' + w);
  for (const k of Object.keys(NEUTRAL_WERTE)) assert.ok(html.includes('<div class="feld-label">' + k), 'Kennung als Beschriftung: ' + k);
  assert.ok(html.includes(V.escapeHTML(V.STRINGS.bereichNichtAngewandtText)) && html.includes(V.escapeHTML(V.STRINGS.feldNichtAngewandtMarke)), 'gekennzeichnet');
  assert.ok(html.includes('<h1>partner-werkstatt</h1>'), 'Titel ist die Kennung des Bereichs');
  assert.ok(!html.includes('Werkstatt') && !html.includes('>Regal<') && !html.includes('Lager'), 'kein Label der Erweiterung');
  assert.ok(html.indexOf('>zusatz<') < html.indexOf('>regal<'), 'Reihenfolge der Datei, nicht des Moduls');
  assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>'), 'nur maskiert');
  assert.match(V.sidebarHTML(), /data-sektor="partner-werkstatt">partner-werkstatt</);
  assert.ok(!V._darstellungsLuecken(V.getData()).bereichIds.includes('partner-werkstatt'), 'gezeigt, also nicht „nicht darstellbar“');
});

test('[Ohne-Wahl·Inhalt·neutral·Rot-Beweis] ohne die neutrale Ansicht steht der Wert in keiner Ansicht', async () => {
  const V = await oeffnen(leseOhne([NEUTRAL_WEICHE, "  if (!sek) return '';\n"]), neutralesDepot());
  assert.ok(!alleAnsichten(V).includes('Regal 7'));
});

test('[Ohne-Wahl·Inhalt·neutral] ein Feld, das das Modul oder die Person als sensibel führt, wird zurückgehalten; das Modul zeigt nichts zusätzlich', async () => {
  const d = neutralesDepot();
  d.bereichsModule[0].bereiche['partner-werkstatt'].sektionen[0].felder.push({ id: 'geheim', typ: 'text', label: 'Geheim', sensibel: true });
  d.sektoren['partner-werkstatt'].geheim = 'GEHEIMWERT';
  d.sektoren['partner-werkstatt'].privat = 'PRIVATWERT';
  d.sensibelFelder = { 'partner-werkstatt': { privat: true } };
  const V = await oeffnen(null, d);
  const html = String(V.sektorHTML('partner-werkstatt'));
  assert.ok(!html.includes('GEHEIMWERT') && !html.includes('PRIVATWERT'));
  assert.ok(html.includes('>geheim<') && html.includes('>privat<') && html.includes(V.escapeHTML(V.STRINGS.zurueckgehaltenVorhanden)));
});
