'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fehlt dem Sprachmodul ein Text, gilt der Text DERSELBEN Sprache — nie eine andere, nie still
   (16.09.2026, U2-ADR-416 Entscheidung 4, U2-ADR-363 §1)
   ────────────────────────────────────────────────────────────────────────
   Eine Datei trägt ihr Sprachmodul vom Sichern-Zeitpunkt. Ein neuerer Kern mit neuen Texten zeigte
   dort die Kennung, auch wenn das öffnende Produkt den Text in derselben Sprache trug.

   Die Proben:
     - Quelle Vor-Depot-Modul (Modul-App, neu gepackt): die Datei mit altem Modul zeigt den Text
     - Quelle Mitschrift der Datei: dasselbe
     - keine Quelle derselben Sprache: die Kennung bleibt, auch wenn Deutsch den Text trüge
     - `textLesen` bleibt `null`, der Treffer steht in TEXTSATZ_RUECKFAELLE
     - in den vier Produkten, frisch angelegt: TEXTSATZ_RUECKFAELLE bleibt leer

   ROT-BEWEIS, GEMESSEN (16.09.2026): gegen den Kern ohne Rückfall sind die beiden Quellen-Proben rot
   (die Kennung statt des Texts). Die Grenzprobe fällt dort nur an ihren letzten Zeilen, weil es
   `_textsatzRueckfall` und TEXTSATZ_RUECKFAELLE noch nicht gibt; ihre Hauptaussage (Kennung, nicht
   Deutsch) gilt dort wie hier. Ohne JEDES Modul der aktiven Sprache greift kein Rückfall — das hält
   tests/textsatz-geruest-sprachagnostisch.test.js unverändert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');

const EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
const KENNUNG = 'identity.givenName.label';
const ALT = (() => { const m = JSON.parse(JSON.stringify(EN)); delete m.texte[KENNUNG]; return m; })();

const ANKER = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true });
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ANKER.x }), jetzt: '2026-09-16T12:00:00Z' });
async function signiert(V, modul) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const sig = async (p, k) => V._signJWS(p, await V._jwsImportSignKey(k), {});
  const zert = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'vivodepot', anbieterTyp: 'vivodepot/kern', anbieterName: 'Vivodepot', publicKeyJwk: pub } };
  return { providerCredentialJws: await sig(zert, ANKER), modulSignaturJws: await sig(modul, priv) };
}
const feldLabel = (V) => V.bereicheAlle().find((b) => b.id === 'identity').sektionen.flatMap((s) => s.felder).find((f) => f.id === 'givenName').label;

// Eine Datei mit ALTEM englischem Modul, wie eine Modul-App sie geschrieben hat.
async function dateiMitAltemModul(mitschrift) {
  const { V } = ladeKern();
  await V.depotAnlegen('rueckfall-probe-2026');
  const d = V.getData();
  d.textsatzModule = [JSON.parse(JSON.stringify(ALT))];
  d.textsprache = 'en';
  if (mitschrift) d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift || {}, { sprache: JSON.parse(JSON.stringify(EN)) });
  return V.depotSerialisieren();
}

test('[Rückfall·Vor-Depot] eine Datei mit altem Modul zeigt den Text aus dem Bündel der neu gepackten Modul-App', async () => {
  const umschlag = await dateiMitAltemModul(false);
  const { V } = ladeKern();
  await V.vorDepotKonfigurationAnwenden([await signiert(V, EN)], null, OPTS);
  await V.depotLaden(umschlag, 'rueckfall-probe-2026');
  V.textsatzNeuAnwenden();
  assert.equal(V.textLesen(KENNUNG), null, 'textLesen bleibt null — ihr Vertrag gilt weiter');
  assert.equal(feldLabel(V), EN.texte[KENNUNG]);
  assert.ok(V.TEXTSATZ_RUECKFAELLE.includes(KENNUNG), 'der Rückfall ist festgehalten');
});

test('[Rückfall·Mitschrift] eine Datei mit altem Modul und Mitschrift derselben Sprache zeigt den Text', async () => {
  const umschlag = await dateiMitAltemModul(true);
  const { V } = ladeKern();
  await V.depotLaden(umschlag, 'rueckfall-probe-2026');
  V.textsatzNeuAnwenden();
  assert.equal(V.textLesen(KENNUNG), null);
  assert.equal(feldLabel(V), EN.texte[KENNUNG]);
});

test('[Rückfall·Reihenfolge] ohne Quelle derselben Sprache: Deutsch (Englisch nur, wo ein englisches Modul liegt) — eine unbekannte Kennung bleibt die Kennung', async () => {
  /* Französisch: keine Quelle derselben Sprache. Rückfall-Reihenfolge: Modulsprache → Englisch → Deutsch.
     Seit S1 (20.09.2026) trägt der Kern keine englische Saat mehr — im Gerüst findet der Schritt „Englisch"
     nichts, es gilt Deutsch (U2-ADR-426); früher (16.–19.09.) stand hier Englisch, davor die Kennung. */
  const { V: Q } = ladeKern();
  await Q.depotAnlegen('rueckfall-probe-2026');
  const dq = Q.getData();
  dq.textsatzModule = [Object.assign(JSON.parse(JSON.stringify(ALT)), { sprache: 'fr' })];
  dq.textsprache = 'fr';
  const umschlag = await Q.depotSerialisieren();
  const { V } = ladeKern();
  await V.depotLaden(umschlag, 'rueckfall-probe-2026');
  V.textsatzNeuAnwenden();
  assert.equal(typeof V.TEXTSATZ_DE_QUELLE.texte[KENNUNG], 'string', 'Vorbedingung: Deutsch trüge den Text');
  assert.equal(feldLabel(V), V.TEXTSATZ_DE_QUELLE.texte[KENNUNG], 'Deutsch, nicht die Kennung');
  assert.ok(V.TEXTSATZ_RUECKFAELLE.includes(KENNUNG), 'der Rückfall ist verbucht');
  assert.equal(V.TEXTSATZ_RUECKFALL_SPRACHE[KENNUNG], 'de', 'und nennt die Sprache, in der er tatsächlich stand');
  assert.equal(V._textsatzRueckfall('strings:gibtEsNicht.text'), 'strings:gibtEsNicht.text');
});

test('[Rückfall·vier Produkte] frisch angelegt gibt es in keinem Produkt einen Rückfall', async () => {
  const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
  const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
  for (const p of PRODUKTE) {
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'rueckfall-' + p.slug + '-'));
    try {
      const r = konfektionieren({ ziel, slug: p.slug, modulauswahl: [],
        vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
        unsignierteModulDateien: modulDateienFuer(p) });
      const vorher = process.env.KERN_HTML_PATH;
      process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
      const lader = require.resolve('./load-kern.js');
      delete require.cache[lader];
      let V;
      try { V = require(lader).ladeKern().V; } finally {
        if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
        delete require.cache[lader];
      }
      await V.depotAnlegen('rueckfall-produkt-2026');
      V.textsatzNeuAnwenden();
      for (const b of V.bereicheAlle()) V.renderSektor(b.id);
      assert.deepEqual([...V.TEXTSATZ_RUECKFAELLE], [], p.slug + ': Rückfälle zeigen eine Lücke im eigenen Sprachmodul');
    } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
  }
});
