'use strict';
/* Kern-Testfläche: die zwei Hebel, die sie einem Skript in der Seite in die Hand gäbe (U2-ADR-494).
   HEBEL 1, fremder Anker: verifiziereProviderCredential (und über sie modulEinlassenGeprueft, importPlanGeprueft, depotLaden)
   reicht opts.ankerJwk ungefiltert bis zur Signaturprüfung durch. Wer die Funktion rufen kann, bringt seinen eigenen Anker mit,
   und ein mit dem eigenen Schlüssel signiertes Anbieter-Zertifikat gilt.
   HEBEL 2, frei gesetzte Kennung: modulEinlassen hält ein Register mit `nurGeprueft` (Erscheinung) allein daran fest, dass der
   dritte Parameter ein nichtleerer String ist. Wer die Funktion rufen kann, erfindet die Kennung.
   Beide Hebel hängen nur daran, dass die Funktionen von der Seite aus erreichbar sind. Dass das ausgelieferte Produkt sie nicht
   herausgibt, misst tests/mit-modul/kern-testflaeche-hebel-produkt.test.js. Die Testfassung trägt die Fläche und ist sonst
   byte-gleich mit dem Produkt (tests/kern-testflaeche.test.js); sie ist darum der Stand vor dem Schnitt, an dem diese zwei
   Proben zeigen, was der Schnitt verschließt. Diese Datei baut nur die Testfassung.
   Die Selbst-Einlass-Sperre des Kerns ändert an Hebel 2 nichts: sie nimmt den Knopf weg und hält mitgereiste Module einer
   geöffneten Depot-Datei zurück, modulEinlassen selbst liest sie nicht.
   Der Bau trägt die wörtliche Angabe der Testfassung im Aufruf. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

const zielOrdner = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kern-testflaeche-hebel-'));
const dateiVon = (gebacken) => ({ datei: path.join(gebacken.ordner, 'vivodepot.html'), ordner: gebacken.ordner });
const aufraeumen = (ordner) => fs.rmSync(ordner, { recursive: true, force: true });

function testfassungBauen(slug) {
  return dateiVon(konfektionieren({
    mitTestflaeche: true,   // der Stand vor dem Schnitt: dasselbe Produkt mit der Fläche (U2-ADR-494)
    ziel: zielOrdner(),
    slug,
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === slug)),
  }));
}

/* Öffnet die Datei, wartet auf den Eingangsschirm und misst im Seitenkontext. Ohne den Eingangsschirm wäre die Messung eine
   über eine leere Seite; darum wirft der Vorlauf, statt weiterzumessen. */
async function inDerSeite(datei, messen, argument) {
  const browser = await chromium.launch(require('../../tools/lib/netz-sperre.js').mitSperre());
  try {
    const seite = await browser.newPage();
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(String(e.message)));
    await seite.goto('file://' + datei);
    await seite.waitForSelector('#w-anfangen', { timeout: 15000 });
    const gestartet = await seite.evaluate(() => !!document.querySelector('#w-anfangen'));
    const wert = await seite.evaluate(messen, argument);
    return { gestartet, wert, fehler };
  } finally { await browser.close(); }
}

test('[Kern-Testfläche·Hebel·Rot-Beweis] am Stand vor dem Schnitt gilt ein Zertifikat mit fremdem Anker', async () => {
  const { datei, ordner } = testfassungBauen('privat-de');
  try {
    /* Der Schlüssel entsteht in der Seite (WebCrypto, Ed25519 wie der Anker des Kerns), das Zertifikat wird dort signiert:
       genau das, was ein Skript in der Seite könnte. Kein Schlüssel aus den Proben, kein Signierer des Kerns. */
    const b = await inDerSeite(datei, async () => {
      const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const text = (objekt) => b64u(new TextEncoder().encode(JSON.stringify(objekt)));
      const paar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      const oeffentlich = await crypto.subtle.exportKey('jwk', paar.publicKey);
      const eigenerAnker = { kty: 'OKP', crv: 'Ed25519', x: oeffentlich.x };
      const anbieter = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      const anbieterJwk = await crypto.subtle.exportKey('jwk', anbieter.publicKey);
      const nutzlast = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'VivodepotProviderCredential'],
        issuer: 'did:example:eigener-anker',
        issuanceDate: new Date().toISOString(),
        credentialSubject: { anbieterId: 'erfundene-stelle', anbieterTyp: 'behoerde', name: 'Erfundene Stelle',
          publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: anbieterJwk.x } },
      };
      const kopfUndLast = text({ alg: 'EdDSA', typ: 'JWT' }) + '.' + text(nutzlast);
      const signatur = await crypto.subtle.sign({ name: 'Ed25519' }, paar.privateKey, new TextEncoder().encode(kopfUndLast));
      const jws = kopfUndLast + '.' + b64u(signatur);
      const mit = await window.__vdOeffentlich.verifiziereProviderCredential(jws, { ankerJwk: eigenerAnker });
      const ohne = await window.__vdOeffentlich.verifiziereProviderCredential(jws, {});
      const kurz = (r) => ({ gueltig: r.gueltig, grund: r.grund, istTestAnker: r.istTestAnker,
        anbieterId: (r.nutzlast && r.nutzlast.credentialSubject && r.nutzlast.credentialSubject.anbieterId) || null });
      return { mit: kurz(mit), ohne: kurz(ohne) };
    });
    assert.equal(b.gestartet, true, 'Vorbedingung: die Anwendung ist gestartet');
    assert.equal(b.wert.mit.gueltig, true, 'mit dem eigenen Anker gilt das selbst signierte Zertifikat: ' + b.wert.mit.grund);
    assert.equal(b.wert.mit.anbieterId, 'erfundene-stelle', 'die Prüfung reicht die erfundene Kennung als geprüfte Nutzlast zurück');
    assert.equal(b.wert.mit.istTestAnker, false, 'der eigene Anker ist nicht der Test-Anker des Kerns und wird nicht als solcher markiert');
    assert.equal(b.wert.ohne.gueltig, false, 'Gegenprobe: ohne ankerJwk gilt dasselbe Zertifikat nicht (' + b.wert.ohne.grund + ')');
  } finally { aufraeumen(ordner); }
});

test('[Kern-Testfläche·Hebel·Rot-Beweis] am Stand vor dem Schnitt nimmt modulEinlassen ein Modul mit frei gesetzter Anbieterkennung an', async () => {
  const { datei, ordner } = testfassungBauen('privat-de');
  try {
    /* Ziel ist ein eigenes, leeres Objekt (zweiter Parameter), kein angelegtes Depot: die Probe misst die Prüfstelle selbst.
       `branding` ist das Register mit `nurGeprueft`. */
    const b = await inDerSeite(datei, () => {
      const modul = JSON.stringify({ modulTyp: 'branding', moduleVersion: 1, herkunft: 'erfundene-stelle', name: 'Erfundene Stelle' });
      const zielLeer = {};
      const leer = window.__vdOeffentlich.modulEinlassen(modul, zielLeer, '');
      const zielOhne = {};
      const ohne = window.__vdOeffentlich.modulEinlassen(modul, zielOhne);
      const ziel = {};
      const erfunden = window.__vdOeffentlich.modulEinlassen(modul, ziel, 'erfundene-geprüfte-stelle');
      const drin = (Array.isArray(ziel.brandingModule) && ziel.brandingModule[0]) || {};
      const kurz = (r) => ({ angenommen: r.angenommen, grund: r.grund, typ: r.typ, anbieterId: r.anbieterId || null });
      return {
        leer: kurz(leer), leerImZiel: (zielLeer.brandingModule || []).length,
        ohne: kurz(ohne), ohneImZiel: (zielOhne.brandingModule || []).length,
        erfunden: kurz(erfunden), imZiel: (ziel.brandingModule || []).length,
        marke: { anbieterId: drin.anbieterId, anbieterIdGeprueft: drin.anbieterIdGeprueft, ungeprueft: drin.ungeprueft },
      };
    });
    assert.equal(b.gestartet, true, 'Vorbedingung: die Anwendung ist gestartet');
    assert.equal(b.wert.erfunden.typ, 'branding', 'Vorbedingung: das Modul trifft das Register mit nurGeprueft');
    assert.equal(b.wert.erfunden.angenommen, true, 'mit erfundener Kennung wird das Modul angenommen: ' + b.wert.erfunden.grund);
    assert.equal(b.wert.imZiel, 1, 'es liegt im Ziel');
    assert.deepEqual(b.wert.marke, { anbieterId: 'erfundene-geprüfte-stelle', anbieterIdGeprueft: true, ungeprueft: false },
      'und trägt die Marken eines geprüften Moduls, obwohl nichts geprüft wurde');
    assert.equal(b.wert.leer.angenommen, false, 'Gegenprobe: mit leerer Kennung wird dasselbe Modul abgewiesen');
    assert.equal(b.wert.leer.grund, 'nur-signiert-erlaubt');
    assert.equal(b.wert.leerImZiel, 0, 'nichts landet im Ziel');
    assert.equal(b.wert.ohne.grund, 'nur-signiert-erlaubt', 'Gegenprobe: ohne Kennung ebenso');
    assert.equal(b.wert.ohneImZiel, 0);
  } finally { aufraeumen(ordner); }
});
