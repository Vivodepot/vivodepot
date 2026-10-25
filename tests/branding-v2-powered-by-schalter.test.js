'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Schalter „powered by aus“ im signierten Branding v2 (U2-ADR-473 W2, Abstimmung der Gegenlesung 18.10.2026).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Bedingungen, je mit ihrer Probe:
   (i)  Der Schalter wirkt nur bei gültiger Signatur, nie aus einem unsignierten Modul: ein Modul mit dem Feld, das nicht durch
        die Signaturprüfung kam (rohes Bündel, Depot-Datei mit behaupteten Marken, unsignierter Einlass, Fassung 1), lässt den
        Hinweis in der App-Fußzeile stehen.
   (ii) Ein gültig signiertes Modul mit Schalter blendet NUR die App-Zeile `<span class="ff-powered" data-herkunft-hinweis="app">`
        aus. Jede PDF-Fußquelle trägt „Erstellt mit der Software Vivodepot“ (`ausgabeErstelltMit`) weiter. Rot-Beweis: ein
        Schalter, der auch den PDF-Satz entfernte, macht die Probe rot — am Quelltext und an einem so veränderten Kern.
   Signiert wird mit dem Test-Anker, den die übrigen Vor-Depot-Proben nutzen (tests/vor-depot-konfiguration-branding-css.test.js);
   kein neues Schlüsselmaterial. Auf Zeichenebene, weil die Test-DOM eine Attrappe ist (innerHTML parst nicht).
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-08-28T09:00:00Z' });
const HINWEIS = '<span class="ff-powered" data-herkunft-hinweis="app">';
const ERSTELLT = 'Erstellt mit der Software Vivodepot';
const MODUL = Object.freeze({ modulTyp: 'branding', moduleVersion: 2, herkunft: 'schalter-probe', name: 'Musterverein Beispielstadt', poweredByAus: true });

function rootAttrappe() { return { style: { _w: {}, setProperty(k, v) { this._w[k] = v; }, removeProperty(k) { delete this._w[k]; } } }; }
// Der Anbieter zeichnet mit demselben Test-Schlüssel, den der Anker trägt — dieselbe Kette wie in den Vor-Depot-Proben.
async function signiertesBuendel(V, modul) {
  const key = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'institution/schalter-probe', anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk: SENTINEL_PUBLIC_JWK },
  };
  return { providerCredentialJws: await V._signJWS(cert, key, {}), modulSignaturJws: await V._signJWS(modul, key, {}) };
}
async function appFuss(ladeOpts, vorDepot, nachAnlegen) {
  const { V, document } = ladeKern(ladeOpts);
  await V.vorDepotKonfigurationAnwenden(await vorDepot(V), rootAttrappe(), OPTS);
  await V.depotAnlegen('schalter-probe-pw-2026!');
  V.akteurSelbstErklaeren('Elisabeth Beispiel');
  if (nachAnlegen) nachAnlegen(V);
  V.betreteApp();
  V.renderFooter();
  return { V, fuss: document.getElementById('app-fuss').innerHTML };
}

/* ── (i) unsigniert: der Hinweis bleibt ── */
test('[Schalter·i] ein unsigniertes Modul mit Schalter lässt den Hinweis stehen — rohes Bündel, Depot-Datei, Einlass, Fassung 1', async () => {
  // Rohes Modul statt Bündel: modulEinlassenGeprueft weist es ab, nichts kommt in die Vor-Depot-Liste.
  const roh = await appFuss(undefined, () => [MODUL]);
  assert.ok(roh.fuss.includes(HINWEIS), 'rohes Bündel: Hinweis fehlt — ' + roh.fuss.slice(-200));
  // Depot-Datei: ein Modul, das die Marken des geprüften Zweigs selbst behauptet, liest der Schalter nie.
  const datei = await appFuss(undefined, () => [], (V) => {
    const d = V.getData();
    d.brandingModule = [Object.assign({}, MODUL, { ungeprueft: false, anbieterIdGeprueft: true, anbieterId: 'institution/schalter-probe' })];
    V.setData(d);
  });
  assert.equal(datei.V._markeName(), MODUL.name, 'Positivkontrolle: die Marke der Datei gilt in der Anzeige');
  assert.ok(datei.fuss.includes(HINWEIS), 'Depot-Datei: Hinweis fehlt');
  // Unsignierter Einlass: das Register ist nurGeprueft.
  const { V } = ladeKern();
  assert.equal(V.modulEinlassen(JSON.stringify(MODUL), V.leeresDepot()).grund, 'nur-signiert-erlaubt');
  // Signiert, aber Fassung 1: der Schalter gilt erst ab Fassung 2 und wird benannt verworfen.
  const v1 = await appFuss(undefined, (W) => signiertesBuendel(W, Object.assign({}, MODUL, { moduleVersion: 1 })).then((b) => [b]));
  assert.equal(v1.V._markeName(), MODUL.name, 'Positivkontrolle: das signierte Fassung-1-Modul kam durch');
  assert.ok(v1.fuss.includes(HINWEIS), 'Fassung 1: Hinweis fehlt');
});

/* ── (ii) signiert: nur die App-Zeile fehlt, jede Ausgabe trägt den Satz ── */
function stellvertreter(einheit) {
  const texte = [];
  let seiten = 1;
  const breite = einheit === 'mm' ? 105 : 595, hoehe = einheit === 'mm' ? 148 : 842;
  const doc = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k !== 'string' || k === 'then') return undefined;
      if (k === 'internal') return { pageSize: { getWidth: () => breite, getHeight: () => hoehe, width: breite, height: hoehe }, scaleFactor: 1, getFontSize: () => 10, getNumberOfPages: () => seiten, getCurrentPageInfo: () => ({ pageNumber: 1 }) };
      if (k === 'splitTextToSize') return (s) => (Array.isArray(s) ? s : String(s == null ? '' : s).split('\n'));
      if (k === 'text') return (s) => { (Array.isArray(s) ? s : [s]).forEach((x) => texte.push(String(x))); return doc; };
      if (k === 'addPage') return () => { seiten += 1; return doc; };
      if (k === 'getNumberOfPages') return () => seiten;
      if (k === 'getTextWidth' || k === 'getStringUnitWidth' || k === 'getFontSize' || k === 'getLineHeightFactor') return () => 10;
      return () => doc;
    },
  });
  return { doc, texte };
}
// Jede PDF-Fußquelle (dieselben fünf wie tests/erstellt-mit-und-powered-by.test.js), je mit dem Text, den ihr Zeichenweg schrieb.
function fussQuellenTexte(V) {
  const aus = {};
  aus.pdfFussText = [V.pdfFussText({ anlass: 'Probe', generierer: '', datum: '18.10.2026' })];
  let s = stellvertreter('mm');
  V.zeichneNotfallkarte(s.doc, V.notfallKernModell(), V.notfallKartenMeta(), null); aus.zeichneNotfallkarte = s.texte;
  s = stellvertreter('pt');
  V.zeichneDokumentPdf(s.doc, 'vorsorgevollmacht'); aus.zeichneDokumentPdf = s.texte;
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  s = stellvertreter('mm');
  V.zeichneWiderrufPdf(s.doc, e, V.uebergabeWiderrufNutzlast(e), null); aus.zeichneWiderrufPdf = s.texte;
  s = stellvertreter('pt');
  V.zeichneVollDepotPdf(s.doc, V.vollDepotModell({}), V.vollDepotPdfMeta()); aus.zeichneVollDepotPdf = s.texte.filter((t) => t.includes(V.BUILD_VERSION));
  return aus;
}
function ausgabeVerstoesse(aus) {
  return Object.entries(aus).filter(([, texte]) => !texte.join('\n').includes(ERSTELLT)).map(([n]) => n + ' trägt den Satz nicht');
}
// Am Quelltext: wer den Schalter liest. Erlaubt ist allein renderFooter; der Ausgabeweg (_ausgabeErstelltMit und der Herkunftsort-
// Weg, aus dem er liest) und jede Fußquelle lesen ihn nie.
function rumpf(text, name) { const a = text.indexOf('\nfunction ' + name + '('); return a < 0 ? '' : text.slice(a, text.indexOf('\n}\n', a) + 2); }
function leserVerstoesse(text) {
  const v = [];
  const funde = [...text.matchAll(/(?<!function )\b_herkunftHinweisAppAus\(/g)].map((m) => {
    const vorher = text.slice(0, m.index);
    const f = [...vorher.matchAll(/\nfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].pop();
    return f ? f[1] : '(oben)';
  });
  for (const f of funde) if (f !== 'renderFooter') v.push(f + ' liest den Schalter');
  for (const n of ['_ausgabeErstelltMit', '_herkunftsortAusgabe', 'pdfFussText', 'zeichneNotfallkarte', 'zeichneDokumentPdf', 'zeichneWiderrufPdf', 'zeichneVollDepotPdf']) {
    if (/poweredByAus|_herkunftHinweisAppAus/.test(rumpf(text, n))) v.push(n + ' kennt den Schalter');
  }
  return [...new Set(v)].sort();
}

test('[Schalter·ii] gültig signiert: die App-Zeile fehlt, jede PDF-Fußquelle trägt „Erstellt mit der Software Vivodepot“ weiter', async () => {
  const { V, fuss } = await appFuss(undefined, (W) => signiertesBuendel(W, MODUL).then((b) => [b]));
  assert.equal(V._markeName(), MODUL.name, 'Positivkontrolle: das signierte Modul gilt');
  assert.ok(!fuss.includes('ff-powered') && !fuss.includes('data-herkunft-hinweis'), 'die App-Zeile ist weg: ' + fuss.slice(-200));
  assert.ok(!/ff-trenner">·<\/span> $/.test(fuss), 'kein Trenner bleibt am Ende stehen');
  assert.ok(fuss.includes('ff-haftung') && fuss.includes('ff-quellcode'), 'Positivkontrolle: die übrige Fußzeile steht');
  const aus = fussQuellenTexte(V);
  for (const [n, texte] of Object.entries(aus)) assert.ok(texte.length > 0, n + ': Positivkontrolle — der Zeichenweg schrieb Text');
  assert.deepEqual(ausgabeVerstoesse(aus), []);
  assert.deepEqual(leserVerstoesse(KERN), []);
});

test('[Schalter·ii·Rot-Beweis] ein Schalter, der auch den PDF-Satz entfernte, macht die Probe rot', async () => {
  const zeile = "  return _herkunftsortAusgabe('ausgabeErstelltMit', STRINGS.ausgabeErstelltMit);";
  assert.equal(KERN.split(zeile).length, 2, 'Vorbedingung: die Zeile steht genau einmal in _ausgabeErstelltMit');
  const falsch = KERN.replace(zeile, "  if (_herkunftHinweisAppAus()) return '';\n" + zeile);
  // Am Quelltext.
  assert.deepEqual(leserVerstoesse(falsch), ['_ausgabeErstelltMit kennt den Schalter', '_ausgabeErstelltMit liest den Schalter']);
  // Und an einem so veränderten, gebackenen Kern: jede Fußquelle verliert den Satz.
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'schalter-rot-'));
  try {
    const datei = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(datei, falsch);
    const { V } = await appFuss({ htmlPfad: datei, backen: true }, (W) => signiertesBuendel(W, MODUL).then((b) => [b]));
    assert.equal(V._markeName(), MODUL.name, 'Positivkontrolle: das signierte Modul gilt auch im veränderten Kern');
    assert.deepEqual(ausgabeVerstoesse(fussQuellenTexte(V)).sort(), ['pdfFussText trägt den Satz nicht', 'zeichneDokumentPdf trägt den Satz nicht',
      'zeichneNotfallkarte trägt den Satz nicht', 'zeichneVollDepotPdf trägt den Satz nicht', 'zeichneWiderrufPdf trägt den Satz nicht']);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

test('[Schalter·Rot-Beweis] ein Schalter, der auch ohne Signatur wirkte, ließe den Hinweis aus einer Depot-Datei fallen', async () => {
  // Der Prüfer des Schalters ohne die Bindung an die Vor-Depot-Liste: er läse die Liste, die gerade gilt — auch die der Datei.
  const zeile = '    const liste = (_vorDepotZielGecached && Array.isArray(_vorDepotZielGecached.brandingModule)) ? _vorDepotZielGecached.brandingModule : [];';
  assert.equal(KERN.split(zeile).length, 2, 'Vorbedingung: die Zeile steht genau einmal');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'schalter-rot-'));
  try {
    const datei = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(datei, KERN.replace(zeile, '    const liste = _brandingModulListeAktiv();'));
    const r = await appFuss({ htmlPfad: datei, backen: true }, () => [], (V) => {
      const d = V.getData();
      d.brandingModule = [Object.assign({}, MODUL, { ungeprueft: false, anbieterIdGeprueft: true })];
      V.setData(d);
    });
    assert.ok(!r.fuss.includes(HINWEIS), 'der gelockerte Schalter wirkt aus der Datei — genau das hält (i) fest');
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Der Wächter ruft daneben `leserVerstoesse` (am Quelltext). (i) und die Rot-Beweise sind Abläufe mit festen Modulen. */
module.exports = {
  PROBEN: [
    { fuer: '[Schalter·ii] gültig signiert: die App-Zeile fehlt, jede PDF-Fußquelle trägt „Erstellt mit der Software Vivodepot“ weiter', diskriminante: ausgabeVerstoesse },
  ],
};
