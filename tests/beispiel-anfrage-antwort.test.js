'use strict';
/* Beispiel-Integration examples/anfrage-antwort/ — die Zusage „läuft ohne Vivodepot und passt zu Vivodepot“ als Probe.
   Das Beispiel baut eine UNSIGNIERTE Anfrage (U2-ADR-152 Punkt 6: die App zeigt dafür ihren eigenen Schritt) und öffnet die
   Antwort-JWE (U2-ADR-449) mit WebCrypto von Hand. Hier wird beides gegen den KERN gehalten:
     · die Anfrage aus dem Beispiel nimmt der Kern an, als Datei und als Link, und kennt jede ihrer Kennungen;
     · eine Antwort, die der Kern mit antwortVerschluesseln schreibt, öffnet das Beispiel zum selben Datensatz (beide Verfahren);
     · das Beispiel lädt nichts außer node:-Modulen — kein Paket, keine Datei von Vivodepot außer dem öffentlichen Feldregister.
   Rot-Beweise: umetikettierter Vorgang, fremder p2c, unbekannte Kennung, Wert in der Anfrage, mutiertes Beispiel. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const WURZEL = path.join(__dirname, '..');
const BEISPIEL = path.join(WURZEL, 'examples', 'anfrage-antwort');
const bauen = require(path.join(BEISPIEL, 'anfrage-bauen.js'));
const oeffnen = require(path.join(BEISPIEL, 'antwort-oeffnen.js'));
const REGISTER = path.join(WURZEL, 'bereiche', 'feldkatalog.json');
const PW_DEPOT = 'Beispiel-Integration-Probe-2026!';

async function beispielAnfrage(art) {
  const angaben = JSON.parse(fs.readFileSync(path.join(BEISPIEL, 'beispiel-angaben.json'), 'utf8'));
  const p = bauen.felderPruefen(angaben.felder, bauen.registerLesen(REGISTER));
  assert.deepEqual(p.fehler, [], 'die Beispiel-Angaben passen zum Feldregister');
  const weg = await bauen.rueckweg(art);
  return { anfrage: bauen.anfrageBauen(angaben, weg.antwort, '2026-10-06'), weg };
}
async function depotMitAntwort(anfrage, opt) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW_DEPOT);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.sektorFeldSetzen('identity', 'familyName', 'Brandt');
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: false });
  return { V, ds, jwe: await V.antwortVerschluesseln(ds, anfrage, opt || {}) };
}
function mitKopf(jwe, aendern) {
  const t = jwe.split('.');
  const k = JSON.parse(Buffer.from(t[0], 'base64url').toString('utf8'));
  aendern(k);
  t[0] = Buffer.from(JSON.stringify(k)).toString('base64url');
  return t.join('.');
}

test('[Beispiel] die Anfrage aus dem Beispiel nimmt der Kern an — als Datei und als Link, jede Kennung bekannt', async () => {
  const { V } = ladeKern();
  for (const art of ['schluesselpaar', 'einmalpasswort']) {
    const { anfrage } = await beispielAnfrage(art);
    const ausDatei = V.anfrageAusText(JSON.stringify(anfrage));
    assert.ok(ausDatei, art + ': Datei-Form angenommen');
    assert.equal(ausDatei.zertifikat, null, 'unsigniert, kein erfundener Anker');
    const link = 'https://app.example/#anfrage=' + Buffer.from(JSON.stringify(anfrage), 'utf8').toString('base64url');
    assert.deepEqual(V.anfrageAusText(link).anfrage, ausDatei.anfrage, art + ': Link-Form ergibt dieselbe Anfrage');
    const s = V.anfrageEinstiegSchritte(anfrage);
    assert.equal(s.ok, true);
    assert.deepEqual(s.unbekannt, [], art + ': der Kern kennt jede Kennung');
    assert.equal(s.schritte.length, anfrage.felder.length);
  }
});

test('[Beispiel] Schlüsselpaar: der Kern verschlüsselt, das Beispiel öffnet zum selben Datensatz', async () => {
  const { anfrage, weg } = await beispielAnfrage('schluesselpaar');
  const { ds, jwe } = await depotMitAntwort(anfrage);
  const r = await oeffnen.antwortOeffnen(jwe, { privateJwk: weg.privat });
  assert.equal(r.kopf.alg, 'ECDH-ES');
  assert.equal(r.kopf.vorgang, anfrage.vorgang);
  assert.deepEqual(r.datensatz, JSON.parse(JSON.stringify(ds)));
  // Rot: ein umetikettierter Vorgang (apv/AAD) darf nicht öffnen.
  const falsch = mitKopf(jwe, (k) => { k.vorgang = 'ANDERER-VORGANG'; });
  await assert.rejects(oeffnen.antwortOeffnen(falsch, { privateJwk: weg.privat }));
  // Rot: ein fremder Schlüssel öffnet nicht.
  const fremd = await bauen.rueckweg('schluesselpaar');
  await assert.rejects(oeffnen.antwortOeffnen(jwe, { privateJwk: fremd.privat }));
});

test('[Beispiel] Einmalpasswort: der Kern verschlüsselt, das Beispiel öffnet; fremder p2c wird abgelehnt', async () => {
  const { anfrage, weg } = await beispielAnfrage('einmalpasswort');
  assert.equal(JSON.stringify(anfrage).includes(weg.passwort), false, 'das Passwort steht nicht in der Anfrage');
  const { ds, jwe } = await depotMitAntwort(anfrage, { passwort: weg.passwort });
  const r = await oeffnen.antwortOeffnen(jwe, { passwort: weg.passwort });
  assert.equal(r.kopf.alg, oeffnen.PBES2);
  assert.deepEqual(r.datensatz, JSON.parse(JSON.stringify(ds)));
  await assert.rejects(oeffnen.antwortOeffnen(mitKopf(jwe, (k) => { k.p2c = 10000000; }), { passwort: weg.passwort }), /p2c/);
  await assert.rejects(oeffnen.antwortOeffnen(jwe, { passwort: 'falsch-falsch-falsch' }));
});

test('[Beispiel] Rot: unbekannte Kennung, Wert in der Anfrage und fehlender Zweck werden abgelehnt', () => {
  const reg = bauen.registerLesen(REGISTER);
  assert.match(bauen.felderPruefen([{ kennung: 'identity.gibtEsNicht', zweck: 'x y z' }], reg).fehler.join(), /not in the field register/);
  assert.match(bauen.felderPruefen([{ kennung: 'identity.givenName' }], reg).fehler.join(), /zweck/);
  const angaben = JSON.parse(fs.readFileSync(path.join(BEISPIEL, 'beispiel-angaben.json'), 'utf8'));
  assert.throws(() => bauen.anfrageBauen({ ...angaben, wert: 'Hedwig' }, { art: 'einmalpasswort' }, '2026-10-06'), /no values/);
});

test('[Beispiel] der Ablauf über die Kommandozeile schreibt Anfrage, Link und Schlüsseldatei (Modus 600)', async () => {
  const aus = fs.mkdtempSync(path.join(os.tmpdir(), 'beispiel-anfrage-'));
  try {
    const log = console.log; console.log = () => {};
    let code;
    try { code = await bauen.hauptprogramm(['--register', REGISTER, '--aus', aus, '--app', 'https://app.example/']); }
    finally { console.log = log; }
    assert.equal(code, 0);
    const { V } = ladeKern();
    assert.ok(V.anfrageAusText(fs.readFileSync(path.join(aus, 'anfrage-link.txt'), 'utf8')), 'der geschriebene Link ist gültig');
    const st = fs.statSync(path.join(aus, 'antwort-schluessel.privat.jwk'));
    if (process.platform !== 'win32') assert.equal(st.mode & 0o777, 0o600);
  } finally { fs.rmSync(aus, { recursive: true, force: true }); }
});

/* Was das Beispiel lädt: nur node:-Module. Ein require auf Kern, Werkzeuge oder ein Paket bräche die Zusage „ohne Vivodepot“. */
function fremdeLadungen(quelle) {
  return [...quelle.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)|from\s+['"]([^'"]+)['"]/g)]
    .map((m) => m[1] || m[2]).filter((n) => !n.startsWith('node:'));
}
test('[Beispiel] lädt nur node:-Module — mit Rot-Beweis', () => {
  const dateien = fs.readdirSync(BEISPIEL).filter((d) => d.endsWith('.js'));
  assert.ok(dateien.length >= 2);
  for (const d of dateien) assert.deepEqual(fremdeLadungen(fs.readFileSync(path.join(BEISPIEL, d), 'utf8')), [], d);
  assert.deepEqual(fremdeLadungen("const k = require('../../tests/load-kern.js');"), ['../../tests/load-kern.js']);
  // Der Paketname wird zusammengesetzt, damit der Fremdmodul-Wächter diesen Rot-Beweis nicht als Abhängigkeit liest.
  const paket = 'jo' + 'se';
  assert.deepEqual(fremdeLadungen('import { x } from \'' + paket + '\';'), [paket]);
});

test('[Beispiel] das README nennt jede Datei des Beispiels und keinen Pfad, den es nicht gibt', () => {
  const readme = fs.readFileSync(path.join(BEISPIEL, 'README.md'), 'utf8');
  for (const d of fs.readdirSync(BEISPIEL).filter((x) => x !== 'README.md')) assert.ok(readme.includes(d), 'README nennt ' + d);
  for (const m of readme.matchAll(/`((?:docs|bereiche|tools|examples)\/[^`\s]+)`/g)) {
    assert.ok(fs.existsSync(path.join(WURZEL, m[1])), 'README-Pfad existiert: ' + m[1]);
  }
});
