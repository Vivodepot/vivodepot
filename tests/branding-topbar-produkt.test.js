'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-297: Fall 2, ein Produkt mit Vor-Depot-Konfiguration füllt
   die Kopfzeile mit der Institutionsfarbe. Entscheidung,
   vermittelt über, 05.09.2026: „die sparkasse zb färbt rot".

   Grenze zu Fall 1 (U2-ADR-296, In-Depot angedockte Fremdmarke, bleibt beim
   Rand): der AUFRUFORT trägt die Trennung, kein Herkunfts-Feld. Nur
   `vorDepotKonfigurationAnwenden` ruft `_brandingProduktTopbarAnwenden` —
   der spätere In-Depot-Andock-Pfad (`_moduleEinlassWirken`) ruft nur das
   bestehende, gemeinsame `brandingAnwenden`. Der Rot-Beweis unten prüft
   diese Grenze STRUKTURELL (genau ein Aufrufort im Kern), nicht nur an
   einem einzelnen Verhaltensfall — ein zweiter, später hinzugefügter
   Aufrufort im In-Depot-Pfad würde sonst niemand auffallen.

   Kontrast: `subDepotTextFarbe` (im Auftrag als Vorbild genannt) ist keine
   Kontrastrechnung, sondern eine Tabellen-Rückgabe auf eine geschlossene
   Acht-Farben-Palette — für beliebigen Institutions-Hex ungeeignet. Diese
   Datei prüft darum die neu geschriebene WCAG-Relativleuchtdichte-Rechnung
   selbst, nicht nur ihre Verdrahtung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');

function kern() { return ladeKern().V; }

function fakeRoot() {
  return { style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } } };
}

const KERN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[U2-ADR-297·Rot-Beweis] _brandingProduktTopbarAnwenden hat GENAU EINEN Aufrufort im Kern (die Vor-Depot-Konfiguration) — der In-Depot-Andockpfad ruft sie nie', () => {
  const treffer = KERN_QUELLE.split('\n')
    .map((zeile, i) => ({ zeile, i: i + 1 }))
    .filter(({ zeile }) => /(?<!function )_brandingProduktTopbarAnwenden\(/.test(zeile) && !/^function /.test(zeile.trim()));
  assert.equal(treffer.length, 1, 'genau ein Aufruf erwartet — jeder weitere würde bedeuten, dass ein zweiter Pfad (z. B. In-Depot-Andocken) versehentlich die Kopfzeile mitfärbt');
});

test('[U2-ADR-297] _brandingTopbarKontrastText wählt Weiß für ein dunkles Institutions-Rot (Fixture, kein echtes Institutions-Logo)', () => {
  const V = kern();
  assert.equal(V._brandingTopbarKontrastText('#8b1a2b'), '#ffffff');
});

test('[U2-ADR-297] _brandingTopbarKontrastText wählt Dunkel für ein helles Institutions-Grau', () => {
  const V = kern();
  assert.equal(V._brandingTopbarKontrastText('#999999'), '#1c2a1e');
});

test('[U2-ADR-297·Gegenprobe] _brandingTopbarKontrastText weist ein Mittelgrau zurück, das gegen BEIDE Kandidaten unter 4.5:1 bleibt', () => {
  const V = kern();
  assert.equal(V._brandingTopbarKontrastText('#808080'), null, 'gemessen: #808080 liegt bei 3.95:1 (Weiß) und 3.80:1 (Dunkel) — beide unter dem WCAG-AA-Maß, keiner darf gewinnen');
});

test('[U2-ADR-297] Vivodepots eigene Marke (#4F6539) besteht die Kontrastprüfung mit Weiß', () => {
  const V = kern();
  assert.equal(V._brandingTopbarKontrastText('#4F6539'), '#ffffff');
});

test('[U2-ADR-297] _brandingProduktTopbarAnwenden setzt primaer+text, wenn farbePrimaer gültigen Kontrast trägt', () => {
  const V = kern();
  const root = fakeRoot();
  V._brandingProduktTopbarAnwenden({ farbePrimaer: '#8b1a2b', farbeSekundaer: '#1a3a8b' }, root);
  assert.equal(root.style._werte['--vd-branding-topbar-primaer'], '#8b1a2b');
  assert.equal(root.style._werte['--vd-branding-topbar-text'], '#ffffff');
  assert.equal(root.style._werte['--vd-branding-topbar-sekundaer'], '#1a3a8b');
});

test('[U2-ADR-297] _brandingProduktTopbarAnwenden ohne farbeSekundaer setzt kein sekundaer-Feld', () => {
  const V = kern();
  const root = fakeRoot();
  V._brandingProduktTopbarAnwenden({ farbePrimaer: '#8b1a2b' }, root);
  assert.equal(root.style._werte['--vd-branding-topbar-sekundaer'], undefined);
});

test('[U2-ADR-297·Gegenprobe] eine Institutionsfarbe, die das Kontrast-Gate reißt, wird abgewiesen — die Kopfzeile bleibt beim Fallback, nicht bei einer unlesbaren Farbe', () => {
  const V = kern();
  const root = fakeRoot();
  V._brandingProduktTopbarAnwenden({ farbePrimaer: '#808080' }, root);
  assert.deepEqual(root.style._werte, {}, 'kein CSS-Wert darf stehen, wenn kein Text-Kandidat 4.5:1 erreicht');
});

test('[U2-ADR-297] ohne farbePrimaer bleibt die Kopfzeile beim Fallback (Salbei/--auf-akzent) — ein Depot ohne Branding-Modul sieht aus wie heute', () => {
  const V = kern();
  const root = fakeRoot();
  V._brandingProduktTopbarAnwenden({ schriftart: 'Georgia', name: 'Nur Schrift und Name' }, root);
  assert.deepEqual(root.style._werte, {});
});

test('[U2-ADR-297] _brandingProduktTopbarAnwenden(null, root) räumt zuvor gesetzte Werte weg — derselbe Reset-Vertrag wie brandingAnwenden', () => {
  const V = kern();
  const root = fakeRoot();
  V._brandingProduktTopbarAnwenden({ farbePrimaer: '#8b1a2b' }, root);
  assert.equal(root.style._werte['--vd-branding-topbar-primaer'], '#8b1a2b', 'Vorbedingung: Werte stehen');
  V._brandingProduktTopbarAnwenden(null, root);
  assert.deepEqual(root.style._werte, {});
});

test('[U2-ADR-297·Gegenkontrolle] das bestehende, geteilte brandingAnwenden (Fall 1, In-Depot-Pfad) setzt NIE die Topbar-Variablen — zwei getrennte Bedeutungsträger', () => {
  const V = kern();
  const root = fakeRoot();
  V.brandingAnwenden({ farbePrimaer: '#8b1a2b', farbeSekundaer: '#1a3a8b', schriftart: 'Georgia' }, root);
  assert.equal(root.style._werte['--vd-branding-primaer'], '#8b1a2b');
  assert.equal(root.style._werte['--vd-branding-topbar-primaer'], undefined, 'brandingAnwenden allein (der Fall-1-Weg) darf die Kopfzeile nie färben');
  assert.equal(root.style._werte['--vd-branding-topbar-text'], undefined);
});

/* Ende-zu-Ende, wörtlicher Spiegel von tests/vor-depot-konfiguration-branding-css.test.js:
   ein signiertes Vor-Depot-Branding-Bündel muss nach vorDepotKonfigurationAnwenden BEIDE
   Variablensätze tragen — Fall 1 (--vd-branding-primaer, seit U2-ADR-296) und Fall 2
   (--vd-branding-topbar-primaer, neu hier). */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-28T09:00:00Z';
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function anbieterCertRohling(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) {
  const key = await V._jwsImportSignKey(privJwk);
  return V._signJWS(payload, key, {});
}
async function signiertesBuendel(V, modul) {
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/branding-topbar-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

test('[U2-ADR-297·VDK-Integration] ein eingelassenes Vor-Depot-Branding-Bündel füllt nach vorDepotKonfigurationAnwenden auch die Kopfzeile', async () => {
  const V = kern();
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', sprache: 'de', farbePrimaer: '#8b1a2b' };
  const buendel = await signiertesBuendel(V, modul);
  const root = fakeRoot();
  await V.vorDepotKonfigurationAnwenden([buendel], root, OPTS);
  assert.equal(root.style._werte['--vd-branding-primaer'], '#8b1a2b', 'Fall 1 (Rand-Variable) muss weiterhin mitlaufen');
  assert.equal(root.style._werte['--vd-branding-topbar-primaer'], '#8b1a2b', 'Fall 2 (Kopfzeile) neu');
  assert.equal(root.style._werte['--vd-branding-topbar-text'], '#ffffff');
});

test('[U2-ADR-297·VDK-Integration·Rot-Beweis] ein UNSIGNIERTES Branding-Bündel füllt auch die Kopfzeile NICHT (branding ist nurGeprueft)', async () => {
  const V = kern();
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', sprache: 'de', farbePrimaer: '#8b1a2b' };
  const root = fakeRoot();
  await V.vorDepotKonfigurationAnwenden([modul], root, OPTS);
  assert.equal(root.style._werte['--vd-branding-topbar-primaer'], undefined);
});

test('[U2-ADR-297·VDK-Integration] ein Vor-Depot-Bündel mit kontrastschwacher Farbe lässt die Kopfzeile beim Fallback, obwohl Schrift/Name trotzdem wirken', async () => {
  const V = kern();
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', sprache: 'de', farbePrimaer: '#808080', schriftart: 'Georgia' };
  const buendel = await signiertesBuendel(V, modul);
  const root = fakeRoot();
  await V.vorDepotKonfigurationAnwenden([buendel], root, OPTS);
  assert.equal(root.style._werte['--vd-branding-topbar-primaer'], undefined, 'Kontrast-Gate greift auch am echten Einlassweg');
  assert.equal(root.style._werte['--vd-branding-schriftart'], 'Georgia', 'ein einzelnes Farbfeld darf die restlichen, gültigen Branding-Felder nicht mit verwerfen');
});

/* ── Marke-Achse-Plan §8a (14.09.2026) — Topbar-Icon, dieselbe Fall-2-Gate wie die Farbe ── */

// Minimaler, echt gültiger PNG-Daten-URL (1×1, transparent) — besteht _BRANDING_LOGO_MUSTER.
const LOGO_PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function fakeRootMitLogoMark() {
  const root = fakeRoot();
  const logoMark = { _html: '<svg class="logo-svg" aria-hidden="true" focusable="false"><use href="#vd-logo"/></svg>',
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; } };
  root.querySelector = (sel) => (sel === '.logo-mark' ? logoMark : null);
  root._logoMark = logoMark;
  return root;
}

test('[Marke-Achse·§8a] _brandingProduktTopbarAnwenden tauscht das Topbar-Icon, wenn branding.logo gültig ist', () => {
  const V = kern();
  const root = fakeRootMitLogoMark();
  V._brandingProduktTopbarAnwenden({ farbePrimaer: '#8b1a2b', logo: LOGO_PNG_1X1 }, root);
  assert.match(root._logoMark.innerHTML, /^<img src="data:image\/png;base64,/, 'das Icon muss durch ein <img> mit der Logo-Daten-URL ersetzt werden');
  assert.doesNotMatch(root._logoMark.innerHTML, /#vd-logo/, 'das native SVG-Icon darf nicht mehr stehen, wenn ein gültiges Partner-Logo vorliegt');
});

test('[Marke-Achse·§8a] ohne branding.logo bleibt das native SVG-Icon stehen — der Regelfall, alle vier heutigen Produkte', () => {
  const V = kern();
  const root = fakeRootMitLogoMark();
  V._brandingProduktTopbarAnwenden({ farbePrimaer: '#8b1a2b' }, root);
  assert.match(root._logoMark.innerHTML, /#vd-logo/, 'ohne logo-Feld muss das native Icon unverändert bleiben');
});

test('[Marke-Achse·§8a·Rot-Beweis] ein ungültiges logo-Feld (falsches Format) fällt auf das native Icon zurück, statt ungeprüft in den DOM zu gelangen', () => {
  const V = kern();
  const root = fakeRootMitLogoMark();
  V._brandingProduktTopbarAnwenden({ farbePrimaer: '#8b1a2b', logo: 'javascript:alert(1)' }, root);
  assert.match(root._logoMark.innerHTML, /#vd-logo/, 'ein Wert, der nicht dem data:image/png|jpeg-Muster entspricht, darf nie in ein src-Attribut gelangen');
});

test('[Marke-Achse·§8a] _brandingProduktTopbarAnwenden(null, root) setzt auch das Icon auf den nativen Zustand zurück', () => {
  const V = kern();
  const root = fakeRootMitLogoMark();
  V._brandingProduktTopbarAnwenden({ farbePrimaer: '#8b1a2b', logo: LOGO_PNG_1X1 }, root);
  assert.match(root._logoMark.innerHTML, /^<img/, 'Vorbedingung: Icon steht auf dem Partner-Logo');
  V._brandingProduktTopbarAnwenden(null, root);
  assert.match(root._logoMark.innerHTML, /#vd-logo/, 'nach Reset muss das native Icon wieder stehen');
});

test('[Marke-Achse·§8a·Gegenkontrolle] Fall 1 (In-Depot-Pfad, brandingAnwenden) tauscht das Icon NIE — dieselbe Trennung wie bei der Farbe', () => {
  const V = kern();
  const root = fakeRootMitLogoMark();
  V.brandingAnwenden({ farbePrimaer: '#8b1a2b', logo: LOGO_PNG_1X1 }, root);
  assert.match(root._logoMark.innerHTML, /#vd-logo/, 'brandingAnwenden allein (Fall 1) darf das Topbar-Icon nie anfassen — nur der Fall-2-Aufrufort tut das');
});

/* ── White Label vor dem ersten Depot (16.09.2026) ──
   Die Kopfzeile trug die Farbe des Vor-Depot-Bündels schon, der Markenname nicht: `_markeName`
   fragte nur das offene Depot und dann ab Werk. Gemessen am Markenbündel „Stadtbank
   Beispielstadt" (tools/white-label-greift-messen.js): der Willkommensschirm hieß „Vivodepot". */
function vorDepotMarkeVerstoesse(V, name, farbe) {
  const v = [];
  if (V._markeName() !== name) v.push('Markenname vor dem ersten Depot: ' + V._markeName() + ' statt ' + name);
  if (V._markeFarbePrimaerHex() !== farbe) v.push('Primärfarbe vor dem ersten Depot: ' + V._markeFarbePrimaerHex() + ' statt ' + farbe);
  return v;
}

test('[White Label·vor dem Depot] der Markenname des Vor-Depot-Bündels gilt schon vor dem ersten Depot', async () => {
  const V = kern();
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', name: 'Probebank Musterort', farbePrimaer: '#1b3a5c' };
  const buendel = await signiertesBuendel(V, modul);
  await V.vorDepotKonfigurationAnwenden([buendel], fakeRoot(), OPTS);
  const verstoesse = vorDepotMarkeVerstoesse(V, 'Probebank Musterort', '#1b3a5c');
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[White Label·vor dem Depot·Gegenprobe] ohne Vor-Depot-Bündel bleibt es bei der Ab-Werk-Marke', () => {
  const V = kern();
  assert.equal(V._markeName(), 'Vivodepot');
});

/* Proben-Deklaration (U2-ADR-099 B-2). */
module.exports = {
  PROBEN: [
    { fuer: '[White Label·vor dem Depot] der Markenname des Vor-Depot-Bündels gilt schon vor dem ersten Depot', diskriminante: vorDepotMarkeVerstoesse },
  ],
};
