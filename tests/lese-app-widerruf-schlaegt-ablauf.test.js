'use strict';
/* Widerruf schlägt Ablauf, auch in der Lese-App (03.10.2026).
   Befund: Ein Anbieter-Zertifikat, das widerrufen UND abgelaufen ist, kam in der Lese-App als „abgelaufen“ an
   („Signatur trägt, Zertifikat abgelaufen“), im Kern als widerrufen. `verifiziereTemplateKette` der Lese-App prüfte
   den Ablauf-Zweig ohne `!certRes.widerrufen` und gab im Fehlerzweig `widerrufen` nicht zurück.
   Alle Schlüssel erzeugt diese Probe selbst; der Anker kommt über `opts.ankerJwk`, die Widerrufsliste über
   `opts.widerrufsListe` (beides app-kontrolliert, Test-Injektion). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const REPO = path.join(__dirname, '..');
const JETZT = '2026-10-03T12:00:00Z';
const KERN_V = ladeKern().V;
const TPL = { felder: [{ feldname: 'Probe', feldtyp: 'text', pflicht: false, bereich: 'Probe' }] };

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function cert(anbieterPub, ablauf) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:probe.example', issuanceDate: '2025-01-01T00:00:00Z', expirationDate: ablauf,
    credentialSubject: { anbieterId: 'probe/anbieter', anbieterTyp: 'anbieter', anbieterName: 'Probe-Anbieter', publicKeyJwk: anbieterPub },
  };
}
/* Eine Kette mit eigenem Anker: abgelaufen (Ablauf vor JETZT) und – wenn verlangt – widerrufen. */
async function kette(V, { widerrufen }) {
  const anker = await paar(), anbieter = await paar();
  const certJws = await V._signJWS(cert(anbieter.pub, '2026-01-01T00:00:00Z'), await V._jwsImportSignKey(anker.priv), {});
  const templateJws = await V._signJWS(TPL, await V._jwsImportSignKey(anbieter.priv), {});
  /* Abdruck mit der Kern-Funktion: die Lese-App rechnet ihn wortgleich (eigene Spiegel-Probe), gibt sie aus ihrem
     Lader aber nicht aus. */
  const liste = widerrufen ? [await KERN_V._jwkThumbprint(anbieter.pub)] : [];
  return { certJws, templateJws, opts: { jetzt: JETZT, ankerJwk: anker.pub, widerrufsListe: liste } };
}

for (const [name, laden] of [['Kern', () => ladeKern().V], ['Lese-App', () => ladeLesen().V]]) {
  test('[Widerruf·' + name + '] widerrufen UND abgelaufen: die Kette meldet widerrufen, nicht abgelaufen', async () => {
    const V = laden();
    const { certJws, templateJws, opts } = await kette(V, { widerrufen: true });
    const r = await V.verifiziereTemplateKette(certJws, templateJws, opts);
    assert.equal(r.gueltig, false);
    assert.equal(r.widerrufen, true, name + ': widerrufen fehlt im Ergebnis (ROT vor dem Fix in der Lese-App)');
    assert.notEqual(r.templateOk, true, name + ': ein widerrufenes Zertifikat darf nicht in den Ablauf-Zweig');
  });
  test('[Widerruf·' + name + '·Gegenprobe] nur abgelaufen, nicht widerrufen: bleibt „abgelaufen“ mit tragender Signatur', async () => {
    const V = laden();
    const { certJws, templateJws, opts } = await kette(V, { widerrufen: false });
    const r = await V.verifiziereTemplateKette(certJws, templateJws, opts);
    assert.equal(r.abgelaufen, true);
    assert.equal(r.templateOk, true);
    assert.ok(!r.widerrufen);
  });
}

test('[Widerruf·Lese-App·Anzeige] der Prüfstand nennt den Widerruf, nicht den milderen Ablauf-Text', async () => {
  const V = ladeLesen().V;
  const { certJws, templateJws, opts } = await kette(V, { widerrufen: true });
  const depot = { importierteVorlagen: [{ id: 'probe', feldIds: ['f1'], anbieterName: 'Probe-Anbieter', beleg: { providerCredentialJws: certJws, templateJws } }] };
  const karte = await V.vorlagenPruefstandBerechnen(depot, opts);
  assert.equal(karte.f1 && karte.f1.zustand, 'widerrufen', 'ROT vor dem Fix: der Prüfstand sagte „abgelaufen“');
});

test('[Widerruf·Spiegel] verifiziereTemplateKette ist in Kern und Lese-App gleich', () => {
  const koerper = (datei) => {
    const s = fs.readFileSync(path.join(REPO, datei), 'utf8');
    const m = /async function verifiziereTemplateKette\([^)]*\)\s*\{/.exec(s);
    assert.ok(m, datei + ': verifiziereTemplateKette fehlt');
    let i = m.index + m[0].length, t = 1;
    while (t > 0 && i < s.length) { if (s[i] === '{') t++; else if (s[i] === '}') t--; i++; }
    return s.slice(m.index, i).split('\n').filter((z) => !/^\s*(\/\/|\/\*|\*)/.test(z)).join(' ').replace(/\s+/g, ' ');
  };
  assert.equal(koerper('vivodepot-lesen.html'), koerper('vivodepot.html'), 'die beiden Ketten sind auseinandergelaufen');
});

test('[Widerruf·Lese-App·Anzeige] auch der Auszug-Prüfstand (logikModule) nennt den Widerruf', async () => {
  const V = ladeLesen().V;
  const { certJws, templateJws, opts } = await kette(V, { widerrufen: true });
  const depot = { logikModule: [{ id: 'probe-auszug', anbieterName: 'Probe-Anbieter', beleg: { providerCredentialJws: certJws, modulSignaturJws: templateJws } }] };
  const karte = await V.logikModulPruefstandBerechnen(depot, opts);
  assert.equal(karte['probe-auszug'] && karte['probe-auszug'].zustand, 'widerrufen');
});

/* Die Anzeige selbst: die beiden Marken-Funktionen werden aus dem Quelltext der Lese-App genommen und mit einem
   gesetzten Prüfstand ausgeführt (sie lesen einen modul-lokalen Stand, den der Lader nicht ausgibt). Geprüft wird
   der Text, den die Person sieht — „widerrufen“, nicht der mildere Ablauf-Satz. */
function markeAusQuelle(name, standVar) {
  const s = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  const m = new RegExp('function ' + name + '\\([^)]*\\)\\s*\\{').exec(s);
  let i = m.index + m[0].length, t = 1;
  while (t > 0) { if (s[i] === '{') t++; else if (s[i] === '}') t--; i++; }
  return new Function(standVar, 'STRINGS', 'escapeHTML', s.slice(m.index, i) + '\nreturn ' + name + ';');
}
test('[Widerruf·Lese-App·Anzeige] die Marke zeigt den Widerruf-Text, nicht den Ablauf-Text (Felder und Auszug, mit und ohne Namen)', () => {
  const { V } = ladeLesen();
  const esc = (x) => String(x);
  const stand = { zustand: 'widerrufen', anbieter: 'Probe-Anbieter' };
  const vorlage = markeAusQuelle('vorlagenMarkeHTML', '_vorlagenStand')({ f1: stand }, V.STRINGS, esc)([{ feldId: 'f1' }]);
  assert.match(vorlage, /vorlage-marke--widerrufen/);
  assert.ok(vorlage.includes(V.STRINGS.vorlageWiderrufen.replace('{anbieter}', 'Probe-Anbieter')));
  assert.ok(!vorlage.includes(V.STRINGS.vorlageAbgelaufen.replace('{anbieter}', 'Probe-Anbieter')));
  const ohne = markeAusQuelle('vorlagenMarkeHTML', '_vorlagenStand')({ f1: { zustand: 'widerrufen' } }, V.STRINGS, esc)([{ feldId: 'f1' }]);
  assert.ok(ohne.includes(V.STRINGS.vorlageWiderrufenOhneNamen));
  const auszug = markeAusQuelle('logikModulMarkeHTML', '_logikModulStand')({ a1: stand }, V.STRINGS, esc)({ id: 'a1' });
  assert.match(auszug, /logikmodul-marke--widerrufen/);
  assert.ok(auszug.includes(V.STRINGS.logikmodulWiderrufen.replace('{anbieter}', 'Probe-Anbieter')));
});

/* „Fix vor erstem Widerruf“ als Mechanismus: trägt ein Träger eine nicht leere WIDERRUFS_LISTE, muss die
   Widerruf-Probe der Lese-App im Baum stehen und grün sein. */
const DIESE_PROBE = path.join('tests', 'lese-app-widerruf-schlaegt-ablauf.test.js');
function widerrufAuslieferungUrteil({ listen, probeVorhanden, probeGruen }) {
  const nichtLeer = Object.entries(listen).filter(([, l]) => Array.isArray(l) && l.length > 0).map(([d]) => d);
  if (!nichtLeer.length) return { ok: true };
  if (!probeVorhanden) return { ok: false, grund: 'WIDERRUFS_LISTE nicht leer in ' + nichtLeer.join(', ') + ', aber ' + DIESE_PROBE + ' fehlt' };
  if (!probeGruen) return { ok: false, grund: 'WIDERRUFS_LISTE nicht leer in ' + nichtLeer.join(', ') + ', aber die Widerruf-Probe ist nicht grün' };
  return { ok: true };
}
function listeAus(datei) {
  const s = fs.readFileSync(path.join(REPO, datei), 'utf8');
  const m = /const WIDERRUFS_LISTE = Object\.freeze\((\[[^\]]*\])\);/.exec(s);
  assert.ok(m, datei + ': WIDERRUFS_LISTE nicht gefunden');
  return JSON.parse(m[1].replace(/'/g, '"'));
}
test('[Widerruf·Auslieferung] eine nicht leere Widerrufsliste geht nur mit grüner Widerruf-Probe', async () => {
  const listen = { 'vivodepot.html': listeAus('vivodepot.html'), 'vivodepot-lesen.html': listeAus('vivodepot-lesen.html') };
  const probeVorhanden = fs.existsSync(path.join(REPO, DIESE_PROBE));
  let probeGruen = true;
  if (Object.values(listen).some((l) => l.length)) {
    /* Nur dann wird die Probe als eigener Lauf gefahren, ohne diesen Auslieferungstest (sonst Selbstaufruf). */
    const { spawnSync } = require('node:child_process');
    const r = spawnSync(process.execPath, ['--test', '--test-name-pattern', '^\\[Widerruf·(Kern|Lese-App|Spiegel)', DIESE_PROBE], { cwd: REPO, encoding: 'utf8' });
    probeGruen = r.status === 0;
  }
  const u = widerrufAuslieferungUrteil({ listen, probeVorhanden, probeGruen });
  assert.ok(u.ok, u.grund);
});
test('[Widerruf·Auslieferung·Rot-Beweis] nicht leere Liste ohne Probe bzw. mit roter Probe wird abgewiesen, leere Liste nicht', () => {
  const voll = { 'vivodepot.html': ['erfundener-abdruck'], 'vivodepot-lesen.html': [] };
  assert.equal(widerrufAuslieferungUrteil({ listen: voll, probeVorhanden: false, probeGruen: true }).ok, false);
  assert.equal(widerrufAuslieferungUrteil({ listen: voll, probeVorhanden: true, probeGruen: false }).ok, false);
  assert.equal(widerrufAuslieferungUrteil({ listen: voll, probeVorhanden: true, probeGruen: true }).ok, true);
  assert.equal(widerrufAuslieferungUrteil({ listen: { a: [], b: [] }, probeVorhanden: false, probeGruen: false }).ok, true);
});
