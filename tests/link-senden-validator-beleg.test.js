'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die reinen Teile von tools/link-senden-validator-beleg.js (19.10.2026) — ohne Netz und ohne Java
   ────────────────────────────────────────────────────────────────────────
   Das Werkzeug selbst braucht Netz (Beschaffung) und Java (HL7-Validator) und läuft darum nicht in der Suite. Hier
   gehalten: die Entscheidung gruen/rot/ungemessen aus den Validator-Ausgaben, die Integritätsprüfung des gepinnten
   SHL-Validators (falscher Commit oder Baum → rot), die Beschaffungsschritte, das Format des Belegs gegen schalterBefund
   aus tests/link-senden-auszug.test.js, und dass die Fälle wirklich aus auszugLinkTeile des Kerns kommen. Jeweils mit
   Rot-Beweis.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const VB = require('../tools/lib/hl7-validator-beleg.js');
const W = require('../tools/link-senden-validator-beleg.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

// schalterBefund aus der Probe, die den Beleg verlangt — wörtlich gelesen, nicht nachgebaut.
function schalterBefundLaden() {
  const text = fs.readFileSync(path.join(__dirname, 'link-senden-auszug.test.js'), 'utf8');
  const m = /function schalterBefund\([\s\S]*?\n}\n/.exec(text);
  assert.ok(m, 'schalterBefund in tests/link-senden-auszug.test.js gefunden');
  return new Function(m[0] + '\nreturn schalterBefund;')();
}
const AN = 'const LINK_SENDEN_FUER_AUSZUEGE = true;';

const fall = (name, erwartet, ist) => ({ name, erwartet, ist, fehler: [], warnungen: [] });
const GEMESSEN = { status: 'gemessen' };

/* ── Entscheidung ──────────────────────────────────────────────────────── */
test('[Link-Validator·Entscheidung] grün nur mit gültigen Fällen UND einem verworfenen Rot-Beweis', () => {
  assert.deepEqual(W.validatorErgebnis({ beschaffung: GEMESSEN, faelle: [fall('a', 'gueltig', 'gueltig'), fall('r', 'ungueltig', 'ungueltig')] }), { ergebnis: 'gruen' });
});

test('[Link-Validator·Entscheidung·Rot-Beweis] Abweichung, fehlender Rot-Beweis und Integritätsfehler sind rot', () => {
  const r1 = W.validatorErgebnis({ beschaffung: GEMESSEN, faelle: [fall('a', 'gueltig', 'ungueltig'), fall('r', 'ungueltig', 'ungueltig')] });
  assert.equal(r1.ergebnis, 'rot');
  assert.match(r1.grund, /a \(erwartet gueltig, ist ungueltig\)/);
  // Ein Rot-Beweis, der durchgeht, heißt: der Validator prüft nicht — rot, nicht grün.
  assert.equal(W.validatorErgebnis({ beschaffung: GEMESSEN, faelle: [fall('a', 'gueltig', 'gueltig'), fall('r', 'ungueltig', 'gueltig')] }).ergebnis, 'rot');
  assert.match(W.validatorErgebnis({ beschaffung: GEMESSEN, faelle: [fall('a', 'gueltig', 'gueltig')] }).grund, /kein Rot-Beweis/);
  assert.equal(W.validatorErgebnis({ beschaffung: GEMESSEN, faelle: [fall('r', 'ungueltig', 'ungueltig')] }).ergebnis, 'rot');
  assert.equal(W.validatorErgebnis({ beschaffung: { status: 'integritaetsfehler', grund: 'x' }, faelle: [] }).ergebnis, 'rot');
});

test('[Link-Validator·Entscheidung] gescheiterte Beschaffung oder fehlendes Urteil ist ungemessen, nie grün', () => {
  assert.equal(W.validatorErgebnis({ beschaffung: { status: 'ungemessen', grund: 'Netz' }, faelle: [] }).ergebnis, 'ungemessen');
  assert.equal(W.validatorErgebnis({ beschaffung: GEMESSEN, faelle: [] }).ergebnis, 'ungemessen');
  const r = W.validatorErgebnis({ beschaffung: GEMESSEN, faelle: [fall('a', 'gueltig', 'gueltig'), fall('r', 'ungueltig', 'ungelesen')] });
  assert.equal(r.ergebnis, 'ungemessen');
  assert.equal(W.gesamtErgebnis({ validatoren: [{ ergebnis: 'gruen' }, { ergebnis: 'ungemessen' }] }), 'ungemessen');
  assert.equal(W.gesamtErgebnis({ validatoren: [{ ergebnis: 'gruen' }, { ergebnis: 'rot' }] }), 'rot');
  assert.equal(W.gesamtErgebnis({ validatoren: [{ ergebnis: 'gruen' }, { ergebnis: 'gruen' }] }), 'gruen');
  assert.equal(W.gesamtErgebnis({ validatoren: [] }), 'ungemessen');
});

test('[Link-Validator·SHL-Urteil] Fehler und Warnungen des Werkzeugs sind Befund; Info nicht; fehlende Antwort ist ungelesen', () => {
  const faelle = [{ name: 'a', erwartet: 'gueltig' }, { name: 'b', erwartet: 'gueltig' }, { name: 'c', erwartet: 'gueltig' }, { name: 'd', erwartet: 'gueltig' }, { name: 'e', erwartet: 'gueltig' }];
  const auftraege = [
    { id: 'a:shlpayload', fall: 'a', art: 'shlpayload' },
    { id: 'b:shlpayload', fall: 'b', art: 'shlpayload' },
    { id: 'c:shlpayload', fall: 'c', art: 'shlpayload' },
    { id: 'd:jwe', fall: 'd', art: 'jwe', klartext: 'soll' },
    { id: 'e:shlink', fall: 'e', art: 'shlink' },
  ];
  const ergebnisse = [
    { id: 'a:shlpayload', eintraege: [{ message: 'nur Info', code: 0, level: 1 }] },
    { id: 'b:shlpayload', eintraege: [{ message: 'key invalid', code: 1, level: 3 }] },
    { id: 'c:shlpayload', eintraege: [{ message: 'not minified', code: 2, level: 2 }] },
    { id: 'd:jwe', eintraege: [], ergebnis: 'anders' },
  ];
  const u = Object.fromEntries(W.shlFaelleUrteil(faelle, auftraege, ergebnisse).map((f) => [f.name, f]));
  assert.equal(u.a.ist, 'gueltig');
  assert.equal(u.b.ist, 'ungueltig');
  assert.match(u.b.fehler[0], /key invalid/);
  assert.equal(u.c.ist, 'ungueltig');
  assert.equal(u.c.warnungen.length, 1);
  assert.equal(u.d.ist, 'ungueltig', 'ein anderer entschlüsselter Inhalt ist ein Befund');
  assert.equal(u.e.ist, 'ungelesen');
  assert.ok(W.shlFaelleUrteil(faelle, auftraege, null).every((f) => f.ist === 'ungelesen'), 'ohne Ergebnis des Werkzeugs: kein Urteil');
});

/* ── Integrität ────────────────────────────────────────────────────────── */
test('[Link-Validator·Integrität] gemessener Commit und Baum gegen den Pin; ein anderer ist rot (echtes git, Wegwerf-Repo)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'link-validator-integ-'));
  try {
    const env = ohneGitUmgebung();
    const git = (...a) => execFileSync('git', a, { cwd: tmp, env, encoding: 'utf8' }).trim();
    git('init', '-q');
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'a\n');
    git('add', 'a.txt');
    git('-c', 'user.name=Probe', '-c', 'user.email=probe@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'a');
    const gemessen = W.integritaetMessen(tmp, (befehl, args) => {
      try { return { status: 0, stdout: execFileSync(befehl, args, { env, encoding: 'utf8' }), stderr: '' }; } catch (e) { return { status: 1, stdout: '', stderr: String(e.message) }; }
    });
    assert.deepEqual(gemessen, { kopf: git('rev-parse', 'HEAD'), baum: git('rev-parse', 'HEAD^{tree}') });
    const pin = { commit: gemessen.kopf, baum: gemessen.baum };
    assert.deepEqual(W.integritaetPruefen(gemessen, pin), { art: 'erfolg' });
    assert.equal(W.integritaetPruefen(gemessen, { ...pin, commit: W.SHL_PIN.commit }).art, 'integritaetsfehler');
    assert.equal(W.integritaetPruefen(gemessen, { ...pin, baum: W.SHL_PIN.baum }).art, 'integritaetsfehler');
    assert.equal(W.integritaetPruefen(null, pin).art, 'ungemessen');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Link-Validator·Pin] der Pin ist der gemessene Commit der Primärquelle, voll ausgeschrieben', () => {
  assert.equal(W.SHL_PIN.repo, 'https://github.com/smart-on-fhir/health-cards-dev-tools.git');
  assert.equal(W.SHL_PIN.commit, 'b9b961d9056b6bbc9371d17eeed1b5a42b9b423c');
  assert.match(W.SHL_PIN.baum, /^[0-9a-f]{40}$/);
  // Der Cache liegt außerhalb des Repos.
  assert.ok(!path.resolve(W.shlCacheVerzeichnis()).startsWith(REPO + path.sep));
  assert.ok(!path.resolve(W.hl7CacheVerzeichnis()).startsWith(REPO + path.sep));
});

/* Ein nachgestelltes Ausführen für shlBeschaffen: antwortet je Befehl, schreibt mit, was gerufen wurde. */
function attrappe({ holen = 0, kopf = W.SHL_PIN.commit, baum = W.SHL_PIN.baum, ci = 0, tsc = 0 } = {}) {
  const rufe = [];
  const ausfuehren = (befehl, args) => {
    rufe.push([befehl, ...args].join(' '));
    const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
    if (befehl === 'git') {
      const a = args.slice(2);
      if (a[0] === 'fetch') return holen === 0 ? ok() : { status: 128, stdout: '', stderr: 'fatal: unable to access' };
      if (a[0] === 'rev-parse' && a[1] === 'HEAD') return ok(kopf + '\n');
      if (a[0] === 'rev-parse' && a[1] === 'HEAD^{tree}') return ok(baum + '\n');
      return ok();
    }
    if (befehl === 'npm') return { status: ci, stdout: '', stderr: ci ? 'npm ERR! network' : '' };
    return { status: tsc, stdout: tsc ? 'error TS2307' : '', stderr: '' };
  };
  return { rufe, ausfuehren };
}
function mitBeschaffung(opt, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'link-validator-besch-'));
  const verzeichnis = path.join(tmp, 'pin');
  try {
    const { rufe, ausfuehren } = attrappe(opt);
    // Kein Bestand im Cache (.git fehlt); Lockfile und Bau-Ergebnis „da“, wie nach checkout und tsc.
    const dateiDa = (p) => p.endsWith('package-lock.json') || p.endsWith('api.js');
    return fn(W.shlBeschaffen({ verzeichnis, ausfuehren, dateiDa }), rufe, verzeichnis);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

test('[Link-Validator·Beschaffung] gepinnter Commit per fetch (nicht flach), Lockfile ohne Skripte, tsc; Prüfsumme git:<sha> tree:<baum>', () => {
  mitBeschaffung({}, (b, rufe, verzeichnis) => {
    assert.equal(b.status, 'gemessen');
    assert.equal(b.pruefsumme, 'git:' + W.SHL_PIN.commit + ' tree:' + W.SHL_PIN.baum);
    assert.ok(rufe.includes('git -C ' + verzeichnis + ' fetch -q ' + W.SHL_PIN.repo + ' ' + W.SHL_PIN.commit), rufe.join('\n'));
    assert.ok(rufe.includes('git -C ' + verzeichnis + ' checkout -q FETCH_HEAD'));
    assert.ok(rufe.some((r) => r.startsWith('npm ci --ignore-scripts')), 'keine Lifecycle-Skripte des Werkzeugs');
    assert.ok(rufe.some((r) => /typescript\/bin\/tsc -p tsconfig\.json$/.test(r)));
  });
});

test('[Link-Validator·Beschaffung·Rot-Beweis] ein anderer Commit nach dem checkout ist ROT; Netz, npm ci oder Bau gescheitert ist UNGEMESSEN', () => {
  mitBeschaffung({ kopf: '0'.repeat(40) }, (b, rufe) => {
    assert.equal(b.status, 'integritaetsfehler');
    assert.equal(W.validatorErgebnis({ beschaffung: b, faelle: [] }).ergebnis, 'rot');
    assert.ok(!rufe.some((r) => r.startsWith('npm')), 'nach einem Integritätsfehler wird nichts installiert');
  });
  mitBeschaffung({ baum: '1'.repeat(40) }, (b) => assert.equal(b.status, 'integritaetsfehler'));
  for (const opt of [{ holen: 1 }, { ci: 1 }, { tsc: 2 }]) {
    mitBeschaffung(opt, (b) => {
      assert.equal(b.status, 'ungemessen', JSON.stringify(opt));
      assert.equal(W.validatorErgebnis({ beschaffung: b, faelle: [] }).ergebnis, 'ungemessen');
    });
  }
});

/* ── Format des Belegs ─────────────────────────────────────────────────── */
function validatorEintraege(shlErgebnis) {
  return {
    shl: { art: 'shl', name: W.SHL_PIN.name, fassung: '1.3.0-2 (Commit ' + W.SHL_PIN.commit + ')', pruefsumme: shlErgebnis === 'ungemessen' ? null : 'git:' + W.SHL_PIN.commit + ' tree:' + W.SHL_PIN.baum, ergebnis: shlErgebnis, faelle: [fall('a', 'gueltig', 'gueltig')] },
    fhir: { art: 'fhir-binary', name: VB.NAME, fassung: '6.9.12', pruefsumme: 'sha256:' + 'a'.repeat(64), ergebnis: 'gruen', faelle: [] },
  };
}

test('[Link-Validator·Beleg] ein grüner Beleg erfüllt schalterBefund; er trägt Datum, Fälle und Kern-Weg, keinen Pfad', () => {
  const schalterBefund = schalterBefundLaden();
  const kern = W.kernAngaben(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
  assert.match(kern.sha256, /^[0-9a-f]{64}$/);
  assert.match(kern.wegSha256, /^[0-9a-f]{64}$/);
  const beleg = W.belegBauen({ kern, faelle: [{ name: 'a', inhaltstyp: 'application/pdf', weg: 'direkt' }], ...validatorEintraege('gruen'), jetzt: '2026-10-19T00:00:00Z' });
  assert.equal(beleg.ergebnis, 'gruen');
  assert.equal(beleg.datum, '2026-10-19T00:00:00.000Z');
  assert.deepEqual(schalterBefund(AN, JSON.stringify(beleg)), []);
  assert.deepEqual(VB.pfadFunde(beleg), []);
});

test('[Link-Validator·Beleg·Rot-Beweis] ungemessen oder rot hält den Schalter zu; ein anderer Validator-Stand weicht beim Vergleich ab', () => {
  const schalterBefund = schalterBefundLaden();
  const kern = { datei: 'vivodepot.html', sha256: 'a'.repeat(64), wegSha256: 'b'.repeat(64) };
  const ungemessen = W.belegBauen({ kern, faelle: [], ...validatorEintraege('ungemessen') });
  assert.equal(ungemessen.ergebnis, 'ungemessen');
  assert.deepEqual(schalterBefund(AN, JSON.stringify(ungemessen)), ['Validator-Beleg shl ohne pruefsumme', 'Validator-Beleg shl nicht grün: ungemessen']);
  assert.deepEqual(schalterBefund(AN, JSON.stringify(W.belegBauen({ kern, faelle: [], ...validatorEintraege('rot') }))), ['Validator-Beleg shl nicht grün: rot']);

  const a = W.belegBauen({ kern, faelle: [], ...validatorEintraege('gruen'), jetzt: '2026-10-19T00:00:00Z' });
  const b = W.belegBauen({ kern, faelle: [], ...validatorEintraege('gruen'), jetzt: '2026-11-01T00:00:00Z' });
  assert.equal(W.vergleichsKern(a), W.vergleichsKern(b), 'das Datum allein ist keine Abweichung');
  const c = JSON.parse(JSON.stringify(a));
  c.validatoren[0].fassung = '1.0.2-0';
  assert.notEqual(W.vergleichsKern(a), W.vergleichsKern(c));
  const d = JSON.parse(JSON.stringify(a));
  d.kern.wegSha256 = 'c'.repeat(64);
  assert.notEqual(W.vergleichsKern(a), W.vergleichsKern(d), 'ein geänderter Link-Weg im Kern macht den Beleg veraltet');
});

test('[Link-Validator·Kern-Weg·Rot-Beweis] eine fehlende Kern-Stelle ist ein Fehler, kein leerer Hash', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  for (const n of W.KERN_WEG) assert.match(W.quellAusschnitt(kern, n), new RegExp('function ' + n + '\\('));
  assert.throws(() => W.quellAusschnitt(kern.replace('async function auszugLinkTeile(', 'async function umbenannt('), 'auszugLinkTeile'), /Kern-Stelle fehlt/);
});

/* ── Die Fälle kommen aus dem Kern ─────────────────────────────────────── */
async function faelleMitSpion() {
  const { V } = ladeKern();
  const erzeugt = new Set();
  const spion = { ...V, auszugLinkTeile: async (...a) => { const t = await V.auszugLinkTeile(...a); erzeugt.add(t); return t; } };
  return { V, erzeugt, faelle: await W.faelleBauen(spion) };
}

test('[Link-Validator·Fälle] jeder Fall ist ein Ergebnis von auszugLinkTeile und hat die Form des Kerns', async () => {
  const { erzeugt, faelle } = await faelleMitSpion();
  assert.equal(faelle.length, 3);
  for (const f of faelle) {
    assert.ok(erzeugt.has(f.teile), f.vorlage.name + ' stammt aus auszugLinkTeile');
    assert.deepEqual(W.fallFormPruefen(f), [], f.vorlage.name);
  }
  assert.deepEqual(faelle.map((f) => f.vorlage.binary), [false, true, true], 'ein FHIR-Auszug direkt, zwei als Binary');
  assert.deepEqual(faelle.map((f) => f.vorlage.weg), ['direkt', 'direkt', 'manifest']);

  const { auftraege, faelle: liste } = W.shlAuftraege(faelle);
  assert.deepEqual(liste.map((f) => [f.name, f.erwartet]), [
    ['fhir-auszug-direkt', 'gueltig'], ['pdf-auszug-direkt', 'gueltig'], ['json-auszug-manifest', 'gueltig'],
    ['rot-fremder-schluessel', 'ungueltig'], ['rot-schluessel-zu-kurz', 'ungueltig']]);
  for (const a of auftraege.filter((x) => x.art === 'shlink' || x.art === 'shlpayload')) assert.equal(a.optionen.cascade, false, 'kein Abruf der Ablage-URL');
  const kurz = auftraege.find((a) => a.id === 'rot-schluessel-zu-kurz:shlpayload');
  assert.equal(JSON.parse(kurz.text).key.length, 42);

  const bin = W.binaerFaelle(faelle);
  assert.deepEqual(bin.map((b) => [b.name, b.erwartet, b.ressource.resourceType, b.ressource.contentType]), [
    ['pdf-auszug-direkt', 'gueltig', 'Binary', 'application/pdf'], ['json-auszug-manifest', 'gueltig', 'Binary', 'application/json'],
    ['rot-binary-ohne-contenttype', 'ungueltig', 'Binary', undefined]]);
});

test('[Link-Validator·Fälle·Rot-Beweis] nachgebaute oder vertauschte Teile fallen auf', async () => {
  const { faelle } = await faelleMitSpion();
  // Vertauscht: die Teile des FHIR-Falls unter der PDF-Vorlage.
  const vertauscht = { ...faelle[1], teile: faelle[0].teile };
  assert.ok(W.fallFormPruefen(vertauscht).length > 0);
  // Nachgebaut: eine JWE mit anderem Inhaltstyp im Kopf, außerhalb des Kerns erzeugt.
  const key = crypto.randomBytes(32);
  const prot = Buffer.from(JSON.stringify({ alg: 'dir', enc: 'A256GCM', cty: 'text/plain' })).toString('base64url');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(prot, 'ascii'));
  const ct = Buffer.concat([c.update(Buffer.from(faelle[0].vorlage.inhalt)), c.final()]);
  const jwe = [prot, '', iv.toString('base64url'), ct.toString('base64url'), c.getAuthTag().toString('base64url')].join('.');
  const nachgebaut = { ...faelle[0], teile: { ...faelle[0].teile, jwe, key: key.toString('base64url') } };
  assert.ok(W.fallFormPruefen(nachgebaut).some((x) => /JWE-Kopf/.test(x)));
  // Ein Link mit fremdem Schlüssel in der Nutzlast.
  const fremd = { ...faelle[0], shlink: faelle[1].shlink };
  assert.ok(W.fallFormPruefen(fremd).some((x) => /key der Nutzlast/.test(x)));
});

test('[Link-Validator·Läufer] das Programm für die Programm-Schnittstelle ist gültiges JavaScript und liest stdin', () => {
  assert.doesNotThrow(() => new vm.Script(W.LAEUFER));
  assert.match(W.LAEUFER, /api\.validate\.jwe/);
  assert.match(W.LAEUFER, /process\.stdin/);
  assert.doesNotMatch(W.LAEUFER, /writeFile/, 'die Wegwerf-Schlüssel gehen in keine Datei');
});
