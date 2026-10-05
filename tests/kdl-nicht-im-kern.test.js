'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Von der KDL im Kern genau zwei Codes und die URL, kein KDL-Text im Repo, keiner in der Historie, die das Gerät verlässt
   (Befund 01.10.2026; Entscheidung „KDL selbst laden“ 01.10.2026, 21:05, mit Auflagen; U2-ADR-468, Nachtrag 02.10.2026)
   ───────────────────────────────────────────────────────────────────────────
   Die KDL (DVMD e.V.) steht unter GPL-3.0-or-later. Vivodepot backt sie nie ein — die Person lädt sie selbst
   (tests/kdl-selbst-laden.test.js). Dafür kennt der Kern genau die zwei Codes, die er braucht, und die System-URL.
   DIE KLASSE, fünf Prüfungen:
     1. Kern (immer, ohne Paket): kein @vd-terminologie-Block „kdl“, KDL_GEBRAUCHT trägt genau zwei Codes, die URL steht
        genau in KDL_SYSTEM.
     2. Kern (mit Paket): die KDL-Codes im Kern sind genau diese zwei — ein dritter ist rot —, und kein mehrwortiger
        KDL-Anzeigetext steht darin, der nicht zugleich ein IHE-D-Text ist.
     3. Jede versionierte Datei (mit Paket): kein KDL-Code mit seinem Anzeigetext in der Nähe, und kein mehrwortiger
        KDL-Text überhaupt — Kommentare, Fixtures, Doku.
     4. Die erfundenen Texte der Proben gleichen keinem amtlichen Text (Rot-Beweis: ein amtlicher Text wird erkannt).
     5. Die Historie: tools/kdl-historie-pruefen.js prüft jeden Commit des Push-Bereichs (pre-push). Rot-Beweis an einem
        Wegwerf-Repo: kdl.json in Commit n−1, in n gelöscht → rot.
   Die amtlichen Texte stehen nirgends im Repo; sie kommen zur Laufzeit aus dem lokalen Paket-Cache (dvmd.kdl.r4). Fehlt das
   Paket, laufen 2–4 nicht und sagen das. Rot-Beweise werden zur Laufzeit aus Paket bzw. Datei gebildet.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { bereichPruefen, textPruefen } = require('../tools/kdl-historie-pruefen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const CACHE = process.env.FHIR_PACKAGES || path.join(os.homedir(), '.fhir', 'packages');
const NAEHE = 160;

function begriffe(paket, datei) {
  const p = path.join(CACHE, paket, 'package', datei);
  if (!fs.existsSync(p)) return null;
  const aus = [];
  (function w(c) { for (const k of c || []) { if (k.display) aus.push({ code: k.code, display: k.display }); w(k.concept); } })(JSON.parse(fs.readFileSync(p, 'utf8')).concept);
  return aus;
}
const KDL = begriffe('dvmd.kdl.r4#2025.0.1', 'codesystem-kdl.xml.json');
function iheDTexte() {
  const dir = path.join(CACHE, 'de.ihe-d.terminology#3.0.1', 'package');
  const s = new Set();
  if (!fs.existsSync(dir)) return s;
  for (const f of fs.readdirSync(dir).filter((x) => /^CodeSystem-.*\.json$/.test(x))) {
    (function w(c) { for (const k of c || []) { if (k.display) s.add(k.display); w(k.concept); } })(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).concept);
  }
  return s;
}
const OHNE_PAKET = KDL ? false : 'ungemessen: KDL-Paket fehlt (dvmd.kdl.r4#2025.0.1 nicht im Cache ' + CACHE + ') — Einlesen, Tor, tar/gzip und Abweisung laufen trotzdem gegen ein erfundenes Paket (tests/kdl-selbst-laden.test.js)';

// 1 — ohne Paket
function gebraucht(quelle) {
  const z = (quelle.match(/const KDL_GEBRAUCHT = Object\.freeze\(\{([^}]*)\}\)/) || [])[1];
  return z == null ? null : [...z.matchAll(/'([A-Z]{2}\d{6})'/g)].map((m) => m[1]);
}
function kernOhnePaket(quelle) {
  const funde = [];
  if (/@vd-terminologie kdl\b/.test(quelle)) funde.push('@vd-terminologie kdl');
  const g = gebraucht(quelle);
  if (!g || g.length !== 2) funde.push('KDL_GEBRAUCHT trägt nicht genau zwei Codes (' + (g ? g.length : 'fehlt') + ')');
  const url = (quelle.match(/const KDL_SYSTEM = '([^']+)'/) || [])[1];
  if (!url) funde.push('KDL_SYSTEM fehlt');
  else if (quelle.split(url.replace(/^https?:\/\//, '')).length !== 2) funde.push('die KDL-URL steht nicht genau einmal (in KDL_SYSTEM)');
  return funde;
}
// 2 — Kern mit Paket
const KDL_CODE = /\b[A-Z]{2}\d{4}(?:\d{2})?\b/g;
function kernMitPaket(quelle, kdl, iheD) {
  const codes = new Set(kdl.map((k) => k.code));
  const erlaubt = new Set(gebraucht(quelle) || []);
  const funde = [];
  let m;
  KDL_CODE.lastIndex = 0;
  while ((m = KDL_CODE.exec(quelle))) if (codes.has(m[0]) && !erlaubt.has(m[0])) funde.push('dritter Code ' + m[0]);
  for (const k of kdl) if (/\s/.test(k.display) && !iheD.has(k.display) && quelle.includes(k.display)) funde.push('Text zu ' + k.code);
  return [...new Set(funde)];
}
// 3 — Code und Text nebeneinander, in jeder Datei
function paare(quelle, kdl) {
  const nach = new Map(kdl.map((k) => [k.code, k.display]));
  const funde = [];
  let m;
  KDL_CODE.lastIndex = 0;
  while ((m = KDL_CODE.exec(quelle))) {
    const d = nach.get(m[0]);
    if (d && quelle.slice(Math.max(0, m.index - NAEHE), m.index + m[0].length + NAEHE).includes(d)) funde.push(m[0]);
  }
  return funde;
}
function versionierteDateien() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(Boolean).filter((f) => fs.existsSync(path.join(REPO, f)) && fs.statSync(path.join(REPO, f)).isFile());
}

test('[KDL·Kern] kein KDL-Block, genau zwei Codes in KDL_GEBRAUCHT, die URL genau einmal', () => {
  assert.deepEqual(kernOhnePaket(KERN), []);
  assert.deepEqual(gebraucht(KERN), ['AM160103', 'AM160199'], 'die zwei Codes aus U2-ADR-468');
});

test('[KDL·Kern·Rot-Beweis] ein gebackener Block, ein dritter Code in KDL_GEBRAUCHT und eine zweite URL werden gefunden', () => {
  assert.deepEqual(kernOhnePaket(KERN + '\n<!-- @vd-terminologie kdl -->'), ['@vd-terminologie kdl']);
  const drei = KERN.replace(/(const KDL_GEBRAUCHT = Object\.freeze\(\{[^}]*)\}\)/, "$1, dritte: 'ZZ999999' })");
  assert.equal(kernOhnePaket(drei).length, 1);
  assert.match(kernOhnePaket(drei)[0], /nicht genau zwei/);
  assert.deepEqual(kernOhnePaket(KERN + '\n// http://dvmd.de/fhir/CodeSystem/kdl'), ['die KDL-URL steht nicht genau einmal (in KDL_SYSTEM)']);
});




test('[KDL·Paket] mit dem Paket: im Kern genau die zwei Codes und kein KDL-Text; im Repo kein Code mit Text und kein mehrwortiger Text; erfundene Texte gleichen keinem amtlichen; die Historie erkennt Code und Text', { skip: OHNE_PAKET }, () => {
  /* EIN Test für alles, was das KDL-Paket im lokalen Cache braucht (eine benannte Aussetzung ohne Paket, Unit-Skip-Ratsche). */
  // ── [KDL·Kern·Paket]
  {
    assert.ok(KDL.length > 500, 'Ausbeute: das Paket liefert die Begriffe (' + KDL.length + ')');
    const iheD = iheDTexte();
    assert.ok(iheD.size > 50, 'Ausbeute: die IHE-D-Texte werden gelesen (' + iheD.size + ')');
    assert.deepEqual(kernMitPaket(KERN, KDL, iheD), []);
    // Rot-Beweis: ein dritter Code und ein Text — aus dem Paket gebildet, damit kein Text in dieser Datei steht.
    const rest = KDL.find((k) => /99$/.test(k.code) && /\s/.test(k.display) && !iheD.has(k.display) && !gebraucht(KERN).includes(k.code));
    const gepflanzt = KERN + '\n/* DR 2 (KDL ' + rest.code + ', ' + rest.display + ') */';
    assert.deepEqual(kernMitPaket(gepflanzt, KDL, iheD).sort(), ['dritter Code ' + rest.code, 'Text zu ' + rest.code].sort());
  }
  // ── [KDL·Repo·Paket]
  {
    const dateien = versionierteDateien();
    assert.ok(dateien.length > 1000, 'Ausbeute: die versionierten Dateien werden gelesen (' + dateien.length + ')');
    assert.ok(dateien.includes('vivodepot.html') && dateien.some((f) => f.startsWith('tests/fixtures/')) && dateien.some((f) => f.startsWith('docs/adr/')));
    const iheD = iheDTexte();
    const mehrwortig = KDL.filter((k) => /\s/.test(k.display) && !iheD.has(k.display));
    const funde = [];
    for (const f of dateien) {
      const roh = fs.readFileSync(path.join(REPO, f));
      if (roh.includes(0)) continue; // binär
      const text = roh.toString('utf8');
      const p = paare(text, KDL);
      const t = mehrwortig.filter((k) => text.includes(k.display)).map((k) => 'Text zu ' + k.code);
      if (p.length || t.length) funde.push(f + ': ' + p.concat(t).join(', '));
    }
    assert.deepEqual(funde, []);
    // Rot-Beweis: Code und Text in einer Zeile, und mit dem Text vor dem Code.
    const v = KDL.find((k) => k.code === gebraucht(KERN)[0]);
    assert.deepEqual(paare('- DR 1: KDL `' + v.code + '` ' + v.display, KDL), [v.code]);
    assert.deepEqual(paare('„' + v.display + '“ (' + v.code + ')', KDL), [v.code]);
    assert.deepEqual(paare('- DR 1: KDL `' + v.code + '`, Text im Paket', KDL), []);
  }
  // ── [KDL·Fixture·Paket]
  {
    const probe = fs.readFileSync(path.join(__dirname, 'kdl-selbst-laden.test.js'), 'utf8');
    const erfunden = [...probe.matchAll(/'(Erfundene [^']+)'/g)].map((m) => m[1]);
    assert.ok(erfunden.length >= 4, 'Ausbeute: die erfundenen Texte (' + erfunden.length + ')');
    const amtlich = new Set(KDL.map((k) => k.display.trim().toLowerCase()));
    assert.deepEqual(erfunden.filter((t) => amtlich.has(t.trim().toLowerCase())), []);
    // Rot-Beweis: ein amtlicher Text in derselben Form würde erkannt.
    assert.ok(amtlich.has(KDL[0].display.trim().toLowerCase()));
  }
  // ── [KDL·Historie·Paket]
  {
    const iheD = iheDTexte();
    const v = KDL.find((k) => k.code === gebraucht(KERN)[0]);
    assert.deepEqual(textPruefen('KDL ' + v.code + ' (' + v.display + ')', KDL, iheD), ['KDL-Code ' + v.code + ' mit seinem Text']);
    assert.deepEqual(textPruefen('DocumentReference mit KDL ' + v.code, KDL, iheD), []);
  }
});

function wegwerfRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-kdl-historie-'));
  const g = (args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { cwd: d, encoding: 'utf8', env: ohneGitUmgebung(), stdio: ['ignore', 'pipe', 'pipe'] });
  g(['init', '-q', '-b', 'main']);
  fs.writeFileSync(path.join(d, 'README.md'), 'Probe\n');
  g(['add', '.']); g(['commit', '-q', '-m', 'basis']);
  return { d, g, basis: g(['rev-parse', 'HEAD']).trim() };
}

test('[KDL·Historie] jeder Commit des Bereichs zählt: kdl.json in n−1, in n gelöscht → rot; ein sauberer Bereich → grün', () => {
  const { d, g, basis } = wegwerfRepo();
  try {
    fs.writeFileSync(path.join(d, 'notiz.md'), 'nichts aus der KDL\n');
    g(['add', '.']); g(['commit', '-q', '-m', 'sauber']);
    assert.deepEqual(bereichPruefen(basis, 'HEAD', d, path.join(d, 'kein-cache')).funde, []);
    const sauber = g(['rev-parse', 'HEAD']).trim();
    fs.mkdirSync(path.join(d, 'code-listen', 'nach-lizenzentscheid'), { recursive: true });
    fs.writeFileSync(path.join(d, 'code-listen', 'nach-lizenzentscheid', 'kdl.json'), '{}\n');
    g(['add', '.']); g(['commit', '-q', '-m', 'n-1: mit kdl.json']);
    g(['rm', '-q', 'code-listen/nach-lizenzentscheid/kdl.json']); g(['commit', '-q', '-m', 'n: wieder gelöscht']);
    assert.equal(fs.existsSync(path.join(d, 'code-listen', 'nach-lizenzentscheid', 'kdl.json')), false, 'an der Spitze ist nichts zu sehen');
    const r = bereichPruefen(sauber, 'HEAD', d, path.join(d, 'kein-cache'));
    assert.ok(r.funde.length > 0, 'Nicht-leer-Wache: der Zwischenstand wird gefunden');
    assert.equal(r.commits, 2);
    assert.deepEqual(r.funde.map((f) => f.text), ['A code-listen/nach-lizenzentscheid/kdl.json']);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

