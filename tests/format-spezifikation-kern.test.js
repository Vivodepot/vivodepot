'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Spezifikation ↔ Kern ↔ Prüfprogramm (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   tools/format-pruefen.js ist eine EIGENE Umsetzung des .vivodepot-Formats; es lädt
   den Kern nicht. Diese Probe hält beide zusammen, damit sie nicht still
   auseinanderlaufen:
   1 · PARAMETER. Die Krypto-Parameter liest das Programm aus dem gepinnten Block
       (vivodepot-krypto-kern-PORT-VERBATIM.js); hier steht, dass der Kern dieselben
       Werte trägt. Die übrigen Formatwerte (docs/format/format-parameter.json) sind
       Wert für Wert an die genannte Kern-Konstante gebunden, Werte ohne Konstante
       am Verhalten einer frisch geschriebenen Datei.
   2 · KORPUS. Jeder Fall in docs/format/korpus/ bekommt vom Programm das erwartete
       Urteil, und der KERN verhält sich beim Öffnen so, wie das Manifest sagt.
       Urteilt das Programm strenger als der Kern, steht der Grund im Manifest.
   3 · VOLLSTÄNDIGKEIT. Jeder Code des Programms hat einen Korpusfall, jeder Code im
       Korpus ist ein Code des Programms, und jeder steht in der Spezifikation.
   4 · TESTPASSWÖRTER. Die offenen Korpus-Passwörter („korpus-test-…“) kommen nur
       in den Dateien dieses Strangs vor, nie in Demo-Depots, Vorführungen oder
       Produkt-Fixtures.
   ROT-BEWEISE je Teil unten.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');
const F = require('../tools/format-pruefen.js');
const { kernVerhalten } = require('../tools/format-korpus-erzeugen.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const KORPUS = path.join(REPO, 'docs', 'format', 'korpus');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(KORPUS, 'korpus.json'), 'utf8'));
const SPEZ = path.join(REPO, 'docs', 'format', 'SPEZIFIKATION.md');
const KERN_TEXT = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

function kernKonstante(name) {
  const m = new RegExp('^const ' + name + '\\s*=\\s*([^;]+);', 'm').exec(KERN_TEXT);
  assert.ok(m, 'Konstante ' + name + ' steht im Kern');
  return F.literalLesen(m[1].replace(/\s*\/\/.*$/, '').trim(), name);
}

// Formatwert gegen Kern: dieselbe Regel für den echten Lauf und den Rot-Beweis.
function parameterAbweichungen(parameterJson, kern) {
  const raus = [];
  for (const [k, v] of Object.entries(parameterJson.werte)) {
    if (v.kern === null) continue;
    let soll;
    if (v.kern === 'ZERFALL_FACH_KENNUNG') soll = kern.V.ZERFALL_FACH_KENNUNG(1).slice(0, -1);
    else if (v.kern === 'UMSCHLAG_FELDER_BASIS') soll = Array.from(kern.V.UMSCHLAG_FELDER_BASIS);
    else if (v.kern === 'DATEI_MAGIC_VERSION') soll = [kern.konst('DATEI_MAGIC_VERSION')];
    else soll = kern.konst(v.kern);
    if (JSON.stringify(soll) !== JSON.stringify(v.wert)) raus.push(k + ': Datei ' + JSON.stringify(v.wert) + ', Kern ' + JSON.stringify(soll));
  }
  return raus;
}

test('[Format·Parameter] die Krypto-Parameter des Programms sind die des Kerns (gepinnter Block)', () => {
  const P = F.parameterLaden();
  for (const name of F.BLOCK_KONSTANTEN) {
    assert.deepEqual(P[name], kernKonstante(name), name + ' im Block = im Kern');
  }
  assert.equal(P.PBKDF2_ITERATIONS, 600000, 'Positivkontrolle: der Wert ist gelesen, nicht leer');
  // Der Programmtext nennt keinen der Werte selbst: er liest sie.
  const prog = fs.readFileSync(path.join(REPO, 'tools', 'format-pruefen.js'), 'utf8');
  assert.ok(!/600000|600_000/.test(prog), 'keine Rundenzahl als Literal im Programm');
  assert.ok(!prog.includes("'vivodepot/v3/depot/'") && !prog.includes("'vivodepot/v4/adressen/'"), 'keine HKDF-Kennung als Literal im Programm');
});

test('[Format·Parameter] format-parameter.json ist Wert für Wert an den Kern gebunden', async () => {
  const pj = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'format', 'format-parameter.json'), 'utf8'));
  const { V } = ladeKern();
  assert.deepEqual(parameterAbweichungen(pj, { V, konst: kernKonstante }), []);
  // Werte ohne eigene Konstante: am Verhalten einer Datei, die der Kern gerade schreibt.
  await V.depotAnlegen('korpus-test-parameter');
  V.akteurSelbstErklaeren('Erika');
  await V.whcHuelleWickeln('korpus-test-parameter', V.whcCodeErzeugen().slice(0, V.WHC_STELLEN));
  const u = await V.depotSerialisieren();
  const w = (k) => pj.werte[k].wert;
  assert.equal(Buffer.from(u.pbkdf2.salt, 'base64').length, w('pbkdf2SalzBytes'));
  assert.equal(Buffer.from(Object.values(u.einheiten)[0].iv, 'base64').length, w('ivBytes'));
  assert.equal(Buffer.from(u.wiederherstellung.salz, 'base64').length, w('whcSalzBytes'));
  assert.equal(Buffer.from(u.wiederherstellung.huelle, 'base64').length, w('whcHuelleBytes'));
  assert.equal(V.blackboxDateiAusUmschlag(u).dateiTyp, w('blackboxDateiTyp'));
});

test('[Format·Parameter·Rot-Beweis] ein gesenkter Wert fällt auf, und ein Prüfer mit gesenktem Wert öffnet nichts', async () => {
  const pj = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'format', 'format-parameter.json'), 'utf8'));
  pj.werte.einheitStufeBytes.wert = 512;
  const { V } = ladeKern();
  assert.deepEqual(parameterAbweichungen(pj, { V, konst: kernKonstante }), ['einheitStufeBytes: Datei 512, Kern 1024']);
  // Ein Block mit gesenkter Rundenzahl: das Programm übernimmt ihn (es liest), und mit ihm öffnet sich keine echte Datei.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'format-parameter-'));
  try {
    const block = fs.readFileSync(path.join(REPO, 'vivodepot-krypto-kern-PORT-VERBATIM.js'), 'utf8')
      .replace(/^const PBKDF2_ITERATIONS = \d+;/m, 'const PBKDF2_ITERATIONS = 1000;');
    fs.writeFileSync(path.join(tmp, 'block.js'), block);
    const P = F.parameterLaden({ blockPfad: path.join(tmp, 'block.js') });
    assert.equal(P.PBKDF2_ITERATIONS, 1000);
    assert.notDeepEqual(P.PBKDF2_ITERATIONS, kernKonstante('PBKDF2_ITERATIONS'), 'die erste Probe oben wäre rot');
    const fall = MANIFEST.faelle.find((f) => f.datei === 'g01-v4-mit-kopf.vivodepot');
    const r = await F.dateiPruefen(fs.readFileSync(path.join(KORPUS, fall.datei), 'utf8'), { parameter: P, passwort: fall.passwort });
    assert.notEqual(r.urteil, 'gueltig', 'mit falscher Rundenzahl ist nichts gültig');
    // Und eine Datei, die selbst eine kleinere Rundenzahl nennt, ist ungültig (Korpusfall u10).
    const u10 = MANIFEST.faelle.find((f) => f.datei === 'u10-kdf-iterationen.vivodepot');
    assert.equal(u10.erwartet.urteil, 'ungueltig');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Format·Korpus] jeder Fall bekommt vom Programm das erwartete Urteil', async () => {
  const e = await F.korpusLaufen();
  assert.ok(e.length >= 30, 'Positivkontrolle: der Korpus ist da (' + e.length + ')');
  assert.deepEqual(e.filter((x) => !x.ok).map((x) => x.datei + ' ist ' + JSON.stringify(x.ist) + ', soll ' + JSON.stringify(x.soll)), []);
});

test('[Format·Korpus·Rot-Beweis] ein falsch erwartetes Urteil wird gefunden', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'format-korpus-'));
  try {
    const m = JSON.parse(JSON.stringify(MANIFEST));
    m.faelle = m.faelle.filter((f) => f.datei === 'u17-chiffrat-gekippt.vivodepot');
    m.faelle[0].erwartet = { urteil: 'gueltig', codes: [] };
    fs.copyFileSync(path.join(KORPUS, m.faelle[0].datei), path.join(tmp, m.faelle[0].datei));
    fs.writeFileSync(path.join(tmp, 'korpus.json'), JSON.stringify(m));
    const e = await F.korpusLaufen({ korpusPfad: path.join(tmp, 'korpus.json') });
    assert.equal(e[0].ok, false);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Format·Kern] der Kern verhält sich bei jedem Fall wie im Manifest, und wo das Programm strenger ist, steht der Grund', async () => {
  const abweichend = [];
  for (const f of MANIFEST.faelle) {
    const text = fs.readFileSync(path.join(KORPUS, f.datei), 'utf8');
    const ist = await kernVerhalten(text, f.passwort);
    if (ist.ergebnis !== f.kern.ergebnis) abweichend.push(f.datei + ': Kern ' + ist.ergebnis + ', Manifest ' + f.kern.ergebnis);
  }
  assert.deepEqual(abweichend, []);
  for (const f of MANIFEST.faelle) {
    const u = f.erwartet.urteil;
    const k = f.kern.ergebnis;
    if (u === 'ungueltig' && k !== 'lehnt-ab') assert.ok(f.strenger && f.strenger.length > 30, f.datei + ': Programm ungültig, Kern ' + k + ' — Grund fehlt');
    if (u === 'gueltig' || u === 'gueltig-mit-hinweisen') {
      assert.ok(k === 'oeffnet' || k === 'oeffnet-mit-warnung', f.datei + ': Programm gültig, Kern ' + k);
      const bindung = f.erwartet.codes.some((c) => c.startsWith('VDF-BINDUNG-'));
      assert.equal(k === 'oeffnet-mit-warnung', bindung, f.datei + ': Warnung der Anwendung genau bei einem Bindungsbefund');
    }
    if (u === 'nicht-geprueft') assert.ok(k === 'lehnt-ab' || k === 'nicht-versucht', f.datei + ': nicht geprüft, Kern ' + k);
    if (f.strenger) assert.ok(u === 'ungueltig' && k !== 'lehnt-ab', f.datei + ': ein Grund für Strenge ohne strengeres Urteil');
  }
});

test('[Format·Vollständigkeit] jeder Code hat einen Korpusfall, jeder Korpuscode ist bekannt, jeder steht in der Spezifikation', () => {
  const imKorpus = new Set(MANIFEST.faelle.flatMap((f) => f.erwartet.codes));
  const bekannt = Object.keys(F.CODES);
  assert.deepEqual(bekannt.filter((c) => !imKorpus.has(c)), [], 'Code ohne Korpusfall');
  assert.deepEqual([...imKorpus].filter((c) => !bekannt.includes(c)), [], 'Korpuscode, den das Programm nicht kennt');
  const spez = fs.readFileSync(SPEZ, 'utf8');
  assert.deepEqual(bekannt.filter((c) => !spez.includes('`' + c + '`')), [], 'Code, den die Spezifikation nicht nennt');
  const inSpez = new Set(spez.match(/`VDF-[A-Z-]+`/g).map((s) => s.slice(1, -1)));
  assert.deepEqual([...inSpez].filter((c) => !bekannt.includes(c)), [], 'Code in der Spezifikation, den das Programm nicht kennt');
});

test('[Format·Vollständigkeit·Rot-Beweis] ein unbekannter Code wird nicht still angenommen', () => {
  assert.throws(() => new F.Befunde().add('VDF-ERFUNDEN', 1, 'x'), /unbekannter Code/);
  assert.doesNotThrow(() => new F.Befunde().add('VDF-PAARE', 1, 'x'), 'Gegenprobe: ein bekannter Code geht');
});

// Die Testpasswörter dürfen nur hier stehen: im Korpus, in seinem Erzeuger, in dieser Probe und in der Spezifikation.
const PASSWORT_ERLAUBT = [/^docs\/format\//, /^tools\/format-korpus-erzeugen\.js$/, /^tests\/format-spezifikation-kern\.test\.js$/];
function passwortFunde(dateien, lesen) {
  return dateien.filter((d) => !PASSWORT_ERLAUBT.some((r) => r.test(d))).filter((d) => {
    const t = lesen(d);
    return typeof t === 'string' && t.includes('korpus-test-');
  });
}

test('[Format·Testpasswörter] kein Korpus-Passwort außerhalb des Format-Strangs', () => {
  const dateien = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 })
    .split('\n').filter(Boolean);
  assert.ok(dateien.length > 1000, 'Positivkontrolle: die Dateiliste ist da');
  const lesen = (d) => { try { const s = fs.statSync(path.join(REPO, d)); return s.size < 20 * 1024 * 1024 ? fs.readFileSync(path.join(REPO, d), 'utf8') : null; } catch { return null; } };
  assert.deepEqual(passwortFunde(dateien, lesen), []);
  assert.ok(MANIFEST.faelle.every((f) => f.passwort === null || f.passwort.startsWith('korpus-test-')), 'jedes Korpus-Passwort ist erkennbar benannt');
  assert.match(MANIFEST.hinweis, /absichtlich offen/);
  assert.match(MANIFEST.hinweis, /als Vorlage für ein echtes Depot/);
});

test('[Format·Testpasswörter·Rot-Beweis] ein Korpus-Passwort in einem Demo-Depot wird gefunden', () => {
  const lesen = (d) => ({ 'tools/vorfuehrung-demo.js': "const PW = 'korpus-test-inhaberin';", 'docs/format/korpus/korpus.json': 'korpus-test-x' })[d];
  assert.deepEqual(passwortFunde(['tools/vorfuehrung-demo.js', 'docs/format/korpus/korpus.json'], lesen), ['tools/vorfuehrung-demo.js']);
});

// Die Parametertabelle in Abschnitt 1 der Spezifikation: jede Zeile `| \`name\` | wert | … |`.
function spezParameter(text) {
  const ab = text.indexOf('## 1 · Parameter');
  const bis = text.indexOf('## 2 ·', ab);
  const raus = {};
  for (const z of text.slice(ab, bis).split('\n')) {
    const m = /^\| `([A-Za-z_0-9]+)` \| ([^|]+) \|/.exec(z);
    if (m) raus[m[1]] = m[2].trim();
  }
  return raus;
}
const alsText = (w) => (Array.isArray(w) ? JSON.stringify(w) : String(w).replace(/ $/, '␠'));

test('[Format·Spezifikation] die Parametertabelle nennt jeden Parameter mit dem Wert, den Programm und Kern benutzen', () => {
  const P = F.parameterLaden();
  const tab = spezParameter(fs.readFileSync(SPEZ, 'utf8'));
  assert.ok(Object.keys(tab).length >= 15, 'Positivkontrolle: die Tabelle ist gelesen (' + Object.keys(tab).length + ')');
  const abweichend = Object.entries(tab).filter(([k, v]) => !(k in P) || alsText(P[k]) !== v).map(([k, v]) => k + ': Spezifikation ' + v + ', Programm ' + alsText(P[k]));
  assert.deepEqual(abweichend, []);
  for (const k of F.BLOCK_KONSTANTEN.filter((n) => !/^CRYPTO_VERSION_/.test(n))) assert.ok(k in tab, 'die Tabelle nennt ' + k);
});

test('[Format·Spezifikation·Rot-Beweis] ein abweichender Wert in der Tabelle wird gefunden', () => {
  const text = fs.readFileSync(SPEZ, 'utf8').replace('| `PBKDF2_ITERATIONS` | 600000 |', '| `PBKDF2_ITERATIONS` | 100000 |');
  const P = F.parameterLaden();
  const tab = spezParameter(text);
  assert.notEqual(alsText(P.PBKDF2_ITERATIONS), tab.PBKDF2_ITERATIONS);
});

test('[Format·Spezifikation] die AAD-Beispiele sind byte-gleich mit dem, was das Programm bildet', () => {
  const P = F.parameterLaden();
  const spez = fs.readFileSync(SPEZ, 'utf8');
  const v3 = JSON.stringify({ kryptoVersion: 3, iterationen: P.PBKDF2_ITERATIONS, kdfTyp: 'hkdf-sha256' });
  const v4 = JSON.stringify({ kryptoVersion: P.CRYPTO_VERSION_ZERFALL, iterationen: P.PBKDF2_ITERATIONS, kdfTyp: 'hkdf-sha256', depotUUID: '<depotUUID>', adresse: '<adresse>' });
  assert.ok(spez.includes('`' + v3 + '`'), 'AAD der Form 3 steht wörtlich');
  assert.ok(spez.includes('`' + v4 + '`'), 'AAD einer Einheit steht wörtlich');
  // und das Programm bildet genau diese Bytes (am Kern gegengeprüft: der Kern öffnet g01, das Programm auch — Korpusprobe)
  const { V } = ladeKern();
  assert.equal(JSON.stringify(V._aadEinheitV4('<depotUUID>', '<adresse>')), v4, 'der Kern bildet dieselbe Zeichenkette');
});
