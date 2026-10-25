'use strict';
/* Hauptweg der Anfrage im Studio (Entscheidung vom 18.10.2026, „Hauptweg ja“): Im Assistenten ist das Schlüsselpaar der Weg ohne
   getrenntes Passwort, das Einmalpasswort bleibt der zweite Weg. Wort der Krypto-Gegenlesung mit drei Bedingungen; jede hat hier
   ihre Probe und ihren Rot-Beweis:
     1. Das Zertifikat wird gegen den Anker geprüft, mit derselben Funktion wie im Kern (verifiziereProviderCredential, wortgleich,
        gehalten von tools/krypto-block-propagation-pruefen.js). Ein ungültiges gilt nicht.
     2. Der Schlüssel im Zertifikat ist der eigene Tresor-Schlüssel. Ein fremdes, gültiges Zertifikat wird abgewiesen.
     3. Ob das Schlüsselpaar gilt, entscheidet sich beim Erstellen. Abgelaufen heißt dann Einmalpasswort.
   Dazu die Klammer gegen den Irrtum, eine Signatur allein schütze: eine nur mit dem Tresor signierte Anfrage ohne Zertifikat ist im
   Kern ungeprüft. Und das Öffnen mit der Schlüsseldatei: `aud` wird gegen die Kennung aus dem signierten Zertifikat gehalten, der
   Vorgang gegen die Anfrage, die die Datei trägt.
   Alle Schlüssel entstehen hier zur Laufzeit; der Anker kommt über `opts.ankerJwk`, kein Schlüssel liegt im Repo. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { webcrypto } = nodeCrypto;
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');
const { ladeKern } = require('./load-kern.js');

const STELLE = 'heim/sonnenhof';
const VORGANG = 'AUF-2026-1018';
const PW = 'probe-passwort-hauptweg';   // länger als jede Mindestlänge der Hülle
const JETZT = '2026-10-18T10:00:00Z';
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const STUDIO = fs.readFileSync(GEN_PATH, 'utf8');

async function edPaar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
async function zertifikat(G, anker, stelle, zeit) {
  const cert = Object.assign({
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: STELLE, anbieterName: 'Pflegeheim Sonnenhof', anbieterTyp: 'institution/pflege', publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: stelle.pub.x } },
  }, zeit || {});
  return G._signJWS(cert, await G._jwsImportSignKey(anker.priv), {});
}
const ankerOpt = (anker, jetzt) => ({ ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: anker.pub.x }, jetzt: jetzt || JETZT });
/* Den Schlüssel der Stelle in den Tresor, über den echten Weg (verschlüsselte Datei, Passwort). */
async function tresorLaden(G, stelle) {
  const datei = await G.schuetzeSchluesselJwk(stelle.priv, PW);
  await G.SCHLUESSEL_TRESOR.ausDatei(datei, PW);
}
async function aufbau(optionen) {
  const o = optionen || {};
  const { V: G } = ladeGenerator(o.html ? { html: o.html } : undefined);
  const anker = await edPaar();
  const stelle = await edPaar();
  await tresorLaden(G, stelle);
  const zert = await zertifikat(G, anker, o.fremd ? await edPaar() : stelle, o.zeit);
  return { G, anker, stelle, zert };
}

test('[Hauptweg·1·2] ein gültiges Zertifikat zum eigenen Schlüssel gilt; die Stelle kommt aus dem signierten Zertifikat', async () => {
  const { G, anker, zert } = await aufbau();
  const r = await G.stelleZertifikatPruefen(zert, ankerOpt(anker));
  assert.equal(r.gueltig, true, JSON.stringify(r));
  assert.equal(r.anbieterId, STELLE);
});

test('[Hauptweg·1] ein Zertifikat unter einem fremden Anker gilt nicht', async () => {
  const { G, zert } = await aufbau();
  const r = await G.stelleZertifikatPruefen(zert, ankerOpt(await edPaar()));
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'ungueltig');
});

test('[Hauptweg·2] ein gültiges Zertifikat zu einem fremden Schlüssel wird abgewiesen (Rot-Beweis: ohne Abdruckvergleich nähme es)', async () => {
  const { G, anker, zert } = await aufbau({ fremd: true });
  const r = await G.stelleZertifikatPruefen(zert, ankerOpt(anker));
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'fremder-schluessel');
  const zeile = "  if (await _jwkThumbprint({ kty: 'OKP', crv: 'Ed25519', x: pk.x }) !== eigener) return { gueltig: false, grund: 'fremder-schluessel' };\n";
  assert.equal(STUDIO.split(zeile).length, 2, 'Vorbedingung: die Zeile steht genau einmal');
  const ohne = await aufbau({ fremd: true, html: STUDIO.replace(zeile, '') });
  const rot = await ohne.G.stelleZertifikatPruefen(ohne.zert, ankerOpt(ohne.anker));
  assert.equal(rot.gueltig, true, 'Rot-Beweis: ohne den Vergleich gälte das fremde Zertifikat');
});

test('[Hauptweg·3] ohne Zertifikat und mit abgelaufenem Zertifikat kein Schlüsselpaar; entschieden beim Erstellen (Rot-Beweis)', async () => {
  const { G, anker, zert } = await aufbau({ zeit: { expirationDate: '2026-10-17T12:00:00Z' } });
  assert.equal(await G.anfrageAssistentHauptweg(ankerOpt(anker)), null, 'ohne geladenes Zertifikat: Einmalpasswort');
  // Gestern geladen, als es noch galt; heute ist es abgelaufen.
  const gestern = await G.stelleZertifikatPruefen(zert, ankerOpt(anker, '2026-10-16T10:00:00Z'));
  assert.equal(gestern.gueltig, true, 'Vorbedingung: am Ladetag gültig');
  Object.assign(G.ANF_STELLE, { zertifikatJws: zert, anbieterId: gestern.anbieterId, publicKeyJwk: gestern.publicKeyJwk });
  assert.equal(await G.anfrageAssistentHauptweg(ankerOpt(anker)), null, 'beim Erstellen abgelaufen: Einmalpasswort');
  assert.ok(await G.anfrageAssistentHauptweg(ankerOpt(anker, '2026-10-16T11:00:00Z')), 'Gegenprobe: am Ladetag gilt der Hauptweg');
  // Rot-Beweis: hängt die Vorauswahl nur daran, dass ein Zertifikat da ist, gilt das abgelaufene doch.
  const alt = "  const r = await stelleZertifikatPruefen(ANF_STELLE.zertifikatJws, opts);\n  return r.gueltig ? r : null;\n";
  assert.equal(STUDIO.split(alt).length, 2, 'Vorbedingung: die Prüfung beim Erstellen steht genau einmal');
  const rot = await aufbau({ zeit: { expirationDate: '2026-10-17T12:00:00Z' }, html: STUDIO.replace(alt, '  return ANF_STELLE;\n') });
  Object.assign(rot.G.ANF_STELLE, { zertifikatJws: rot.zert });
  assert.ok(await rot.G.anfrageAssistentHauptweg(ankerOpt(rot.anker)), 'Rot-Beweis: ohne Prüfung beim Erstellen gälte das abgelaufene');
});

test('[Hauptweg·Kern] eine nur mit dem Tresor signierte Anfrage ohne Zertifikat ist im Kern ungeprüft', async () => {
  const { G, stelle } = await aufbau();
  const state = {
    anbieter: { anbieterId: STELLE, anbieterName: '' }, publicKeyJwk: stelle.pub,
    anfrage: { von: 'Pflegeheim Sonnenhof', zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: VORGANG, gestelltAm: '2026-10-18', gueltigBis: '2099-12-31',
      antwortArt: 'einmalpasswort', felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }] },
  };
  const u = await G.baueAnfrageSigniert(state, stelle.priv);
  assert.ok(u.anfrageJws && !u.zertifikat, 'Vorbedingung: signiert, ohne Zertifikat');
  const { V } = ladeKern();
  const p = await V.anfrageSignaturPruefen(JSON.parse(G.anfrageAlsText(u)), {});
  assert.equal(p.geprueft, false);
  assert.equal(p.grund, 'ohne-zertifikat');
});

test('[Hauptweg·Brief] der Brief des Hauptwegs nennt kein Passwort; der des Einmalpassworts bleibt, wie er ist', () => {
  const { V: G } = ladeGenerator();
  const a = { von: 'Pflegeheim Sonnenhof', zweck: 'Aufnahme', felder: [{ kennung: 'identity.givenName' }], antwort: { an: 'aufnahme@probe.example' }, gueltigBis: '2099-12-31', vorgang: VORGANG };
  const ohne = G.anfrageBriefTextOhnePasswort(a, 'https://example.invalid/a');
  assert.ok(!/Das Passwort bekommen Sie/.test(ohne), ohne);
  assert.match(ohne, /Ein Passwort brauchen Sie dafür nicht/);
  assert.match(G.anfrageBriefText(a, 'https://example.invalid/a'), /Das Passwort bekommen Sie von uns auf einem anderen Weg/);
});

/* Öffnen mit der Schlüsseldatei: Datei aus dem echten Hauptweg (Tresor signiert, Zertifikat im Umschlag, Empfangspaar je Anfrage). */
async function hauptwegSchluesseldatei() {
  const { G, anker, stelle, zert } = await aufbau();
  await G.EMPFANGS_TRESOR.erzeugen({ passwort: PW, bauen: async (publicJwk) => {
    const state = {
      anbieter: { anbieterId: STELLE, anbieterName: '' }, publicKeyJwk: stelle.pub, zertifikatJws: zert,
      anfrage: { von: 'Pflegeheim Sonnenhof', zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: VORGANG, gestelltAm: '2026-10-18', gueltigBis: '2099-12-31',
        antwortArt: 'schluesselpaar', empfangPublicJwk: publicJwk, felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }] },
    };
    const u = await G.baueAnfrageSigniert(state, stelle.priv);
    return { umschlag: u, text: G.anfrageAlsText(u), vorgang: u.anfrage.vorgang, gestelltAm: u.anfrage.gestelltAm };
  } });
  let text = ''; G.EMPFANGS_TRESOR.privatHerunterladen((t) => { text = t; });
  G.EMPFANGS_TRESOR.verwerfen('bestaetigt');
  return { G, anker, text };
}
function antwortJws(aud) {
  const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('ed25519');
  const j = publicKey.export({ format: 'jwk' });
  const kopf = { alg: 'Ed25519', typ: 'vivodepot-antwort+jwt', jwk: { kty: j.kty, crv: j.crv, x: j.x } };
  const nutzlast = { erstelltAm: '2026-10-18T09:00:00.000Z', iat: 1760778000, aud,
    anfrage: { von: 'Pflegeheim Sonnenhof', anbieterId: STELLE, zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: VORGANG, gueltigBis: '2099-12-31' },
    felder: [{ kennung: 'identity.givenName', label: 'Vorname', wert: 'Hedwig', zweck: 'Anrede' }], fehlend: [], unbekannt: [], vollstaendig: true };
  const eingabe = b64u(JSON.stringify(kopf)) + '.' + b64u(JSON.stringify(nutzlast));
  return eingabe + '.' + b64u(nodeCrypto.sign(null, Buffer.from(eingabe), privateKey));
}
const audVon = (id) => 'signiert:anbieter:' + String(Buffer.byteLength(id)).padStart(4, '0') + ':' + id;

test('[Hauptweg·Öffnen] mit der Schlüsseldatei: Bindung an die Anfrage, aud gegen die Stelle des Zertifikats (Rot-Beweis: ohne Kennung)', async () => {
  const { G, anker, text } = await hauptwegSchluesseldatei();
  let d = null;
  await G.EMPFANGS_TRESOR.mitDatei(JSON.parse(text), PW, async (schluessel) => {
  d = schluessel.privateJwk.d;
  assert.equal(typeof schluessel.anfrageText, 'string', 'die Datei trägt ihre Anfrage');
  const bindung = await G.schluesselAnfrageBindung(schluessel, ankerOpt(anker));
  assert.equal(bindung.anbieterId, STELLE, 'die Kennung kommt aus dem signierten Zertifikat');
  assert.equal(bindung.vorgang, VORGANG);
  // Eine echte Antwort an diese Anfrage, verschlüsselt vom Kern gegen den Empfangsschlüssel, öffnet mit der Schlüsseldatei.
  const { V } = ladeKern();
  const anfrage = JSON.parse(schluessel.anfrageText).anfrage;
  const eigen = await V.antwortJweSchluessel(antwortJws(audVon(STELLE)), anfrage.antwort.publicKeyJwk, { vorgang: VORGANG, anbieterId: STELLE, cty: 'JWT' });
  const offen = await G.antwortJweOeffnen(eigen, schluessel);
  const erg = await G.antwortSignaturPruefen(offen.klartext, { anbieterId: bindung.anbieterId, vorgang: bindung.vorgang });
  assert.equal(erg.datensatz.felder[0].wert, 'Hedwig');
  // Für eine fremde Stelle signiert: abgewiesen.
  const fremd = await V.antwortJweSchluessel(antwortJws(audVon('andere/stelle')), anfrage.antwort.publicKeyJwk, { vorgang: VORGANG, anbieterId: STELLE, cty: 'JWT' });
  const offenFremd = await G.antwortJweOeffnen(fremd, schluessel);
  await assert.rejects(() => G.antwortSignaturPruefen(offenFremd.klartext, { anbieterId: bindung.anbieterId, vorgang: bindung.vorgang }),
    (e) => e.antwortTextSchluessel === 'antwortSignaturFremdeStelle');
  // Rot-Beweis: mit anbieterId '' (der Aufruf vor dem 18.10.) fällt die fremde Antwort nicht auf.
  const rot = await G.antwortSignaturPruefen(offenFremd.klartext, { anbieterId: '', vorgang: VORGANG });
  assert.equal(rot.datensatz.felder[0].wert, 'Hedwig', 'Rot-Beweis: ohne gebundene Kennung angenommen');
  });
  /* Auflage der Krypto-Gegenlesung (19.10.2026): das Öffnen hält das JWK nicht über die Arbeit hinaus, auch nicht in einem Cache
     oder Abschluss, der von den Namen des Studios aus erreichbar ist. */
  assert.ok(typeof d === 'string' && d.length > 20, 'Vorbedingung: innerhalb lag der private Teil vor');
  assert.deepEqual(traegtText(G, d), [], 'nach dem Öffnen ist der private Teil von keinem Namen des Studios aus erreichbar');
  const kopie = Object.assign({}, G, { __probeCache: { jwk: { d } } });
  assert.ok(traegtText(kopie, d).length > 0, 'Rot-Beweis: ein Cache mit dem privaten Teil würde gefunden');
});
/* Wege im Objektgraphen, an deren Ende ein Text steht, der `wert` enthält. */
function traegtText(wurzel, wert) {
  const funde = []; const gesehen = new Set();
  (function geh(x, weg) {
    if (typeof x === 'string') { if (x.includes(wert)) funde.push(weg); return; }
    if (x === null || typeof x !== 'object' || gesehen.has(x)) return;
    gesehen.add(x);
    for (const k of Object.getOwnPropertyNames(x)) { let v; try { v = x[k]; } catch (e) { continue; } geh(v, weg + '.' + k); }
  })(wurzel, 'G');
  return funde;
}

test('[Hauptweg·Öffnen] eine Schlüsseldatei mit falschem Passwort öffnet nichts', async () => {
  const { G, text } = await hauptwegSchluesseldatei();
  let gerufen = false;
  await assert.rejects(() => G.EMPFANGS_TRESOR.mitDatei(JSON.parse(text), 'falsches-passwort-lang', async () => { gerufen = true; }));
  assert.equal(gerufen, false, 'ohne passendes Passwort keine Arbeit mit dem Schlüssel');
});

test('[Hauptweg·Oberfläche] der Assistent ruft den Hauptweg beim Erstellen, und „Antworten öffnen“ reicht die gebundene Kennung weiter', () => {
  assert.match(STUDIO, /const haupt = await anfrageAssistentHauptweg\(\);\n  if \(haupt\) return anfrageAssistentErzeugenMitPaar\(ev, box, haupt\);/);
  assert.match(STUDIO, /antwortJweOeffnen\(text, schluessel \|\| \{ passwort \}\)/);
  assert.match(STUDIO, /bindung \? \{ anbieterId: bindung\.anbieterId, vorgang: bindung\.vorgang \}/);
  assert.ok(!/antwortSignaturPruefen\(geoeffnet\.klartext, \{ anbieterId: '', vorgang/.test(STUDIO), 'kein fester leerer Abgleich mehr');
});

/* Auflage (3) der Krypto-Gegenlesung: das private JWK lebt nur innerhalb von `mitDatei`. Danach ist es fort, auch bei einem Fehler, und
   es steht weder in STATE noch in einer Konsolenausgabe. Rot-Beweis: ein Tresor ohne das Löschen behielte es. */
test('[Hauptweg·JWK] nach mitDatei ist das private JWK fort, auch bei Fehler; nichts davon in STATE oder Konsole (Rot-Beweis)', async () => {
  const { G, text } = await hauptwegSchluesseldatei();
  const ausgaben = [];
  const fang = (...x) => { ausgaben.push(x.map(String).join(' ')); };
  const vorher = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  console.log = console.warn = console.error = console.info = fang;
  let gesehen = null, d = null;
  try {
    await G.EMPFANGS_TRESOR.mitDatei(JSON.parse(text), PW, async (schluessel) => { gesehen = schluessel; d = schluessel.privateJwk.d; });
    assert.ok(typeof d === 'string' && d.length > 20, 'Vorbedingung: innerhalb lag der private Teil vor');
    assert.equal(gesehen.privateJwk, null, 'nach der Arbeit ist das JWK fort');
    let imFehler = null;
    await assert.rejects(() => G.EMPFANGS_TRESOR.mitDatei(JSON.parse(text), PW, async (schluessel) => { imFehler = schluessel; throw new Error('arbeit-scheitert'); }), /arbeit-scheitert/);
    assert.equal(imFehler.privateJwk, null, 'auch nach einem Fehler ist das JWK fort');
  } finally { Object.assign(console, vorher); }
  assert.ok(!JSON.stringify(G.STATE || {}).includes(d), 'der private Teil steht nicht in STATE');
  assert.ok(!ausgaben.some((z) => z.includes(d)), 'der private Teil steht in keiner Konsolenausgabe');
  const loeschen = "        if (jwk && typeof jwk === 'object') { delete jwk.d; }\n        jwk = null; schluessel.privateJwk = null;\n";
  assert.equal(STUDIO.split(loeschen).length, 2, 'Vorbedingung: das Löschen steht genau einmal');
  const ohne = ladeGenerator({ html: STUDIO.replace(loeschen, '') }).V;
  const datei = await (async () => { const h = await hauptwegSchluesseldatei(); return h.text; })();
  let behalten = null;
  await ohne.EMPFANGS_TRESOR.mitDatei(JSON.parse(datei), PW, async (schluessel) => { behalten = schluessel; });
  assert.ok(behalten.privateJwk && behalten.privateJwk.d, 'Rot-Beweis: ohne das Löschen bliebe das JWK');
});

/* Auflage (3): `aa-erzeugen` darf signieren, aber nur auf einen frischen echten Klick; ein synthetisches Ereignis zeichnet nicht. */
test('[Hauptweg·Knopf] aa-erzeugen signiert nur auf einen frischen echten Klick; ein synthetisches Ereignis nicht (Rot-Beweis)', async () => {
  const { G } = await aufbau();
  const klick = (echt, id) => ({ isTrusted: echt, currentTarget: { id }, timeStamp: performance.now() });
  let gezeichnet = 0;
  await assert.rejects(() => G.SCHLUESSEL_TRESOR.signiereEinmal(klick(false, 'aa-erzeugen'), async () => { gezeichnet++; }));
  assert.equal(gezeichnet, 0, 'ein synthetisches Ereignis zeichnet nicht');
  await assert.rejects(() => G.SCHLUESSEL_TRESOR.signiereEinmal(klick(true, 'aa-anderer-knopf'), async () => { gezeichnet++; }));
  assert.equal(gezeichnet, 0, 'ein anderer Knopf zeichnet nicht');
  await G.SCHLUESSEL_TRESOR.signiereEinmal(klick(true, 'aa-erzeugen'), async () => { gezeichnet++; });
  assert.equal(gezeichnet, 1, 'der echte Klick an aa-erzeugen zeichnet');
  assert.match(STUDIO, /const SCHLUESSEL_ERLAUBTE_KNOEPFE = Object\.freeze\(\['pr-submit', 'anf-erzeugen', 'aa-erzeugen', /);
});

/* Auflage (2): der Test-Sentinel greift im Studio nie ohne Injektion. Er steht nicht im Anker-Satz; ein Zertifikat, dessen Kopf den
   Sentinel nennt, wird ohne `opts.ankerJwk` nicht bestätigt; und der Sentinel ist in Kern, Lese-App, Studio und Issuer derselbe. */
test('[Hauptweg·Sentinel] der Test-Sentinel ist im Studio wie im Kern abgeschaltet und greift ohne Injektion nie', async () => {
  const { G } = await aufbau();
  const SENT = 'vivodepot-test-sentinel-do-not-use-in-production';
  const studioSatz = /^const ANKER_SATZ = Object\.freeze\(\[\n([\s\S]*?)\n\]\);$/m.exec(STUDIO);
  assert.ok(studioSatz && !studioSatz[1].includes(SENT) && !studioSatz[1].includes('kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60'), 'der Sentinel steht nicht im Anker-Satz');
  const falsch = await edPaar();
  const kopf = { alg: 'EdDSA', typ: 'JWT', kid: SENT };
  const nutzlast = { type: ['VerifiableCredential', 'VivodepotProviderCredential'], issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: STELLE, anbieterTyp: 'institution/pflege', publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: falsch.pub.x } } };
  const eingabe = b64u(JSON.stringify(kopf)) + '.' + b64u(JSON.stringify(nutzlast));
  const priv = nodeCrypto.createPrivateKey({ key: Object.assign({}, falsch.priv), format: 'jwk' });
  const jws = eingabe + '.' + b64u(nodeCrypto.sign(null, Buffer.from(eingabe), priv));
  const r = await G.verifiziereProviderCredential(jws, { jetzt: JETZT });
  assert.equal(r.gueltig, false, 'ohne Injektion kein Sentinel-Anker');
  const x = (datei) => /const TEST_SENTINEL_PUBLIC_JWK = Object\.freeze\(\{[\s\S]*?x: '([^']+)'[\s\S]*?kid: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '..', datei), 'utf8'));
  const werte = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html'].map((d) => { const m = x(d); assert.ok(m, d); return m[1] + '|' + m[2]; });
  assert.equal(new Set(werte).size, 1, 'derselbe Sentinel in allen vier Seiten: ' + werte.join(', '));
});

/* Befund ANKER-KOPIEN-OHNE-WAECHTER (18.10.2026, Krypto-Gegenlesung): Anker, Sperrliste und Anbietertypen standen in Kern und Lese-App
   ohne Wächter. Jetzt Soll in tools/krypto-huelle-soll.json, byte-gleich in Kern, Lese-App und Studio. Rot-Beweis je Seite. */
test('[Hauptweg·Anker-Kopien] ein geändertes Byte im Anker, in der Sperrliste oder den Anbietertypen einer Kopie wird rot', () => {
  const P = require('../tools/krypto-block-propagation-pruefen.js');
  const os = require('node:os');
  const SEITEN = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html', 'vivodepot-schluessel-teilen.html'];
  const lauf = (datei, alt, neu) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anker-kopien-'));
    try {
      fs.copyFileSync(path.join(__dirname, '..', P.PORT_VERBATIM), path.join(dir, P.PORT_VERBATIM));
      for (const s of SEITEN) {
        let t = fs.readFileSync(path.join(__dirname, '..', s), 'utf8');
        if (s === datei) { assert.equal(t.split(alt).length, 2, 'Vorbedingung: genau eine Stelle in ' + s); t = t.replace(alt, neu); }
        fs.writeFileSync(path.join(dir, s), t);
      }
      return P.pruefeHuelle(dir).fehler;
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  };
  for (const n of ['TRUST_AUTHORITY_PUBLIC_JWK', 'WIDERRUFS_LISTE', 'ZWISCHENSTUFEN_ANBIETERTYPEN', 'VIVODEPOT_INSTITUTION_ANBIETERTYP', 'TEST_SENTINEL_ISSUER']) {
    assert.ok(P.HUELLE_SOLL[n] && ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html'].every((d) => P.HUELLE_SOLL[n].includes(d)), n + ' steht als Soll in Kern, Lese-App und Studio');
  }
  const f1 = lauf('vivodepot-studio.html', "  x: 'YTLr-GfRPpyM8d_Ldal1_ankpgFyOwT9ly_G-QyJCZc',\n  kid: 'vivodepot-trust-authority-v2-22082026',", "  x: 'YTLr-GfRPpyM8d_Ldal1_ankpgFyOwT9ly_G-QyJCZd',\n  kid: 'vivodepot-trust-authority-v2-22082026',");
  assert.ok(f1.some((z) => z.startsWith('HÜLLE TRUST_AUTHORITY_PUBLIC_JWK:')), f1.join('\n'));
  const f2 = lauf('vivodepot-lesen.html', 'const WIDERRUFS_LISTE = Object.freeze([]);', "const WIDERRUFS_LISTE = Object.freeze(['x']);");
  assert.ok(f2.some((z) => z.startsWith('HÜLLE WIDERRUFS_LISTE:')), f2.join('\n'));
  const f3 = lauf('vivodepot.html', "const VIVODEPOT_INSTITUTION_ANBIETERTYP = 'vivodepot/institution';", "const VIVODEPOT_INSTITUTION_ANBIETERTYP = 'vivodepot/institutionX';");
  assert.ok(f3.some((z) => z.startsWith('HÜLLE VIVODEPOT_INSTITUTION_ANBIETERTYP:')), f3.join('\n'));
});
