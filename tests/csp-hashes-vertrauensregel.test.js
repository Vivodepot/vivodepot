'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS): diese Probe startet csp-bauen als Prozess; in derselben Zeile, damit keine Zeilennummer wandert
/* U2-ADR-470 (17.10.2026): CSP ohne 'unsafe-inline' und die Trusted-Types-Default-Policy (tools/csp-bauen.js,
   tools/lib/csp-hashes.js, tools/lib/vertrauensregel-block.js, tools/lib/csp-nach-bau.js). Ohne Browser: der Bau-Abgleich
   je Anwendung über das Werkzeug selbst (--check), die Hash-Rechnung, die Bauwege, die Blöcke einsetzen, und die
   Entscheidungen der Policy gegen bekannte Umgehungen. Ob der Browser sie durchsetzt, prüft
   tests/konformitaet/csp-exploit-messen.mjs in Chromium, Firefox und WebKit (je Engine eine Datei). Die Bauwege, die nicht hinausgehen (Auslieferung des
   Kerns, Demo, Abnahme- und Messläufe, Landungs-Vorbereitung), prüft eine interne Probe mit derselben Regel. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const H = require('../tools/lib/csp-hashes.js');
const { BLOCK_TEXT, BLOCK_ID } = require('../tools/lib/vertrauensregel-block.js');
const { cspNachBau, cspNeutral } = require('../tools/lib/csp-nach-bau.js');
const B = require('../tools/csp-bauen.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'csp-bauen.js');
// Fehler aus dem Sandkasten haben einen eigenen TypeError-Prototyp — darum am Namen erkannt.
const TYPFEHLER = (e) => e && e.name === 'TypeError';
const META = (policy) => `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
const ANWENDUNGEN_SOLL = ['vivodepot-lesen.html', 'vivodepot-schluessel-teilen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html', 'vivodepot.html'];
const lies = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');

test('[CSP·Werkzeug] csp-bauen --check ist grün über alle Anwendungen', () => {
  const r = spawnSync(process.execPath, [WERKZEUG, '--check'], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || '') + ' — node tools/csp-bauen.js');
  assert.match(r.stdout, /grün — 5 Anwendungen/);
});

test('[CSP·Werkzeug·Rot-Beweis] ein geänderter Block in einer Kopie macht --check rot; der Bau macht ihn wieder grün', () => {
  const wurzel = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-bauen-probe-'));
  try {
    const html = lies('vivodepot-studio.html');
    const geaendert = html.replace(/(<script id="rahmen-schutz">)/, '$1\n// geändert\n');
    assert.notEqual(geaendert, html, 'Vorbedingung: der Rahmen-Schutz-Block steht im Studio');
    fs.writeFileSync(path.join(wurzel, 'vivodepot-studio.html'), geaendert);
    const rot = spawnSync(process.execPath, [WERKZEUG, '--check', '--wurzel', wurzel], { encoding: 'utf8' });
    assert.equal(rot.status, 1, rot.stdout + rot.stderr);
    assert.match(rot.stderr, /vivodepot-studio\.html: entspricht nicht dem Bau \(fehlend 1, überzählig 1/);
    const bau = spawnSync(process.execPath, [WERKZEUG, '--wurzel', wurzel], { encoding: 'utf8' });
    assert.equal(bau.status, 0, bau.stdout + bau.stderr);
    const gruen = spawnSync(process.execPath, [WERKZEUG, '--check', '--wurzel', wurzel], { encoding: 'utf8' });
    assert.equal(gruen.status, 0, gruen.stdout + gruen.stderr);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[CSP] jede Anwendung entspricht dem Bau: Hashes statt unsafe-inline, Trusted Types, Vertrauensregel als erstes Skript', () => {
  assert.deepEqual(B.anwendungen(), ANWENDUNGEN_SOLL, 'Positivkontrolle: die fünf Anwendungen (der Style-Guide trägt weder CSP noch Skript)');
  for (const f of ANWENDUNGEN_SOLL) {
    const html = lies(f);
    assert.equal(B.bauen(html), html, f + ': nicht gebaut — node tools/csp-bauen.js');
    const pr = H.cspPruefen(html);
    assert.ok(pr.ok, f + ': ' + JSON.stringify(pr));
    assert.match(html, /require-trusted-types-for 'script'; trusted-types default"/, f);
    const ab = html.search(/<meta\s+http-equiv="Content-Security-Policy"/);
    const erstes = /<script([^>]*)>/.exec(html.slice(ab));
    assert.match(erstes[1], new RegExp('id="' + BLOCK_ID + '"'), f + ': die Vertrauensregel ist nicht das erste Skript nach der CSP');
    assert.ok(html.slice(0, ab).search(/<script[\s>]/) < 0, f + ': ein Skript steht vor der CSP-Zeile');
    assert.equal(html.split('<script id="' + BLOCK_ID + '">' + BLOCK_TEXT + '</script>').length, 2, f + ': der Block steht genau einmal und byte-gleich');
  }
});

test('[CSP·Rot-Beweis] ein geänderter Block, ein neuer Block und unsafe-inline werden gesehen; der Bau ist idempotent', () => {
  const html = META("default-src 'none'; script-src 'self' 'unsafe-inline'") + '<script>a()</script><script type="application/json">{}</script><script src="x.js"></script>';
  const gebaut = H.cspHashesNachziehen(html);
  assert.equal(H.cspHashesNachziehen(gebaut), gebaut, 'idempotent');
  assert.ok(H.cspPruefen(gebaut).ok);
  assert.equal((gebaut.match(/'sha256-/g) || []).length, 1, 'nur der ausführbare Inline-Block');
  assert.ok(!H.cspPruefen(html).ok, 'unsafe-inline ist rot');
  assert.equal(H.cspPruefen(gebaut.replace('a()', 'b()')).fehlend.length, 1, 'geänderter Block');
  assert.equal(H.cspPruefen(gebaut + '<script>c()</script>').fehlend.length, 1, 'neuer Block');
  assert.throws(() => H.cspHashesNachziehen(html + META("script-src 'self'")), /genau EINE/);
  const kern = lies('vivodepot.html');
  assert.equal(B.bauen(B.bauen(kern)), B.bauen(kern), 'der ganze Bau ist idempotent');
});

test('[CSP·Nach-Bau] zieht nur nach, wenn die CSP schon ohne unsafe-inline steht — ein älterer Kern bleibt unverändert', () => {
  const alt = META("script-src 'self' 'unsafe-inline'") + '<script>a()</script>';
  assert.equal(cspNachBau(alt), alt, 'ein Kern mit unsafe-inline bleibt, wie er ist (dieselbe Regel wie das Gateway)');
  assert.equal(cspNachBau('<p>ohne CSP</p><script>a()</script>'), '<p>ohne CSP</p><script>a()</script>');
  const neu = H.cspHashesNachziehen(alt);
  const geaendert = neu.replace('a()', 'b()');
  assert.equal(H.cspPruefen(geaendert).ok, false);
  assert.equal(H.cspPruefen(cspNachBau(geaendert)).ok, true);
  assert.equal(cspNeutral(geaendert), cspNeutral(cspNachBau(geaendert)), 'neutral: dieselbe Zeile, gleich welche Hashes');
  assert.notEqual(geaendert, cspNachBau(geaendert), 'Vorbedingung: der Nach-Bau hat die Hashes wirklich geändert');
  assert.notEqual(cspNeutral(neu), cspNeutral(neu.replace("'self'", "'self' https://fremd.invalid")), 'neutral verwischt nur die Hashes');
});

/* Die Bauwege, die nach dem Bau Blöcke einsetzen oder schneiden: jedes Erzeugnis passt genau zu seinen Blöcken. */
test('[CSP·Bauwege] konfektionieren, Pages (beide Wege), Stick und Vorführung: die CSP passt genau zu den Blöcken', () => {
  const VP = require('../tools/lib/vier-produkte.js');
  const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
  const VOR_DEPOT_FN = require('./load-issuer.js').ladeIssuer().V.vorDepotKonfigurationDateiInhalt;
  const kern = lies('vivodepot.html');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-bauwege-'));
  try {
    const erzeugnisse = {};
    for (const p of VP.PRODUKTE) {
      const g = konfektionieren({ ziel, slug: p.slug, modulauswahl: [], vorDepotKonfigurationInhaltFn: VOR_DEPOT_FN, unsignierteModulDateien: VP.modulDateienFuer(p) });
      erzeugnisse['konfektionieren ' + p.slug] = fs.readFileSync(path.join(g.ordner, 'vivodepot.html'), 'utf8');
    }
    const PE = require('../tools/lib/pages-erzeugnis.js');
    erzeugnisse['pages weg-roh'] = PE.produktFuerPages('privat-de');
    erzeugnisse['pages weg-b'] = PE.geruestMitErscheinungsbild();
    const produkt = erzeugnisse['konfektionieren privat-de'];
    erzeugnisse.stick = require('../tools/stick-ausgabe-backen.js').ausgabeBacken(produkt, 'stick');
    erzeugnisse.vorfuehrung = require('../tools/vorfuehrung-showcase-erzeugen.js').showcaseInKernBacken(produkt, { format: 'showcase/1', probe: true });
    for (const [weg, text] of Object.entries(erzeugnisse)) {
      assert.notEqual(text, kern, weg + ': Vorbedingung — der Weg hat etwas eingesetzt');
      const pr = H.cspPruefen(text);
      assert.ok(pr.ok, weg + ': ' + JSON.stringify(pr));
    }
    // Rot-Beweis am echten Produkt: ein Zeichen im großen Kern-Skript geändert, ohne nachzuziehen — die CSP passt nicht mehr.
    assert.equal(H.cspPruefen(produkt.replace('SCHALEN_STAND = ', 'SCHALEN_STAND  = ')).ok, false, 'Rot-Beweis');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[CSP·Bauwege] jeder Weg, der Blöcke einsetzt, ruft das Nachziehen auf — gelesen aus der Quelle', () => {
  const STELLEN = {
    'tools/produkt-konfektionieren.js': /cspNachBau\(text\)/,
    'tools/lib/pages-erzeugnis.js': /cspNachBau\(P\.testflaecheVerweigern\(text/,
    'tools/vorfuehrung-showcase-erzeugen.js': /text = require\('\.\/lib\/csp-nach-bau\.js'\)\.cspNachBau\(text\)/,
    'tools/stick-ausgabe-backen.js': /cspNachBau\(_regionNutzlastSetzen/,
    'tests/produkt-test-backen.js': /return cspNachBau\(produktTextErzeugen/,
  };
  for (const [datei, muster] of Object.entries(STELLEN)) assert.match(lies(datei), muster, datei);
  const k = lies('tools/produkt-konfektionieren.js');
  assert.equal((k.match(/cspNachBau\(/g) || []).length, 2, 'konfektionieren: das Produkt und die Sub-Depot-Palette');
  assert.match(k, /cspNeutral\(ergebnis\)/, 'der Gerüst-Vergleich verwischt die Hashes');
});

/** Die Policy aus dem Block, in einem Sandkasten mit einem nachgebauten trustedTypes. */
function policy() {
  let p = null;
  const sandbox = { window: { trustedTypes: { createPolicy: (name, regeln) => { assert.equal(name, 'default'); p = regeln; } } } };
  vm.runInNewContext(BLOCK_TEXT, sandbox);
  assert.ok(p, 'die Policy wurde angelegt');
  return p;
}

test('[Vertrauensregel] lehnt ausführbares HTML ab — auch die bekannten Umgehungen', () => {
  const p = policy();
  const boese = [
    '<img src=x onerror=alert(1)>',
    '<IMG SRC=x ONERROR=alert(1)>',
    '<img/onerror=alert(1) src=x>',
    '<img title=">" onerror=alert(1)>',
    '<p title="a"onclick=x>',
    '<svg><script>alert(1)</script></svg>',
    '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>',
    '<iframe src="https://fremd.invalid/"></iframe>',
    '<iframe class="mappe-vorschau-pdf" src="blob:file:///1234-abcd"></iframe>',
    '<iframe></iframe>',
    '<div srcdoc=x>',
    '<a href="javascript:alert(1)">x</a>',
    '<a href=" JaVaScRiPt:alert(1)">x</a>',
    '<a href="&#106;avascript:alert(1)">x</a>',
    '<a href="&#x6A;avascript:alert(1)">x</a>',
    '<a href="java&Tab;script:alert(1)">x</a>',
    '<a href="javascript&colon;alert(1)">x</a>',
    '<a href="&unbekannt;x">x</a>',
    '<form action="javascript:alert(1)"><button>x</button></form>',
    '<svg><animate attributeName="href" values="a;javascript:alert(1)"/></svg>',
    '<object data="x.swf"></object>',
    '<embed src="x">',
    '<base href="https://fremd.invalid/">',
    '<meta http-equiv="refresh" content="0;url=https://fremd.invalid/">',
    '<link rel="stylesheet" href="https://fremd.invalid/x.css">',
    // mXSS über Rohtext und Kommentare: was der Browser als Markup liest, liest die Regel auch so
    '<style><p title="</style><img src=x onerror=alert(1)>">',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    '<!--<p title="-->"><img src=x onerror=alert(1)>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  ];
  for (const s of boese) assert.throws(() => p.createHTML(s), TYPFEHLER, s);
});

test('[Vertrauensregel] lässt harmloses HTML unverändert durch — Text außerhalb von Tags und Attributwerte zählen nicht', () => {
  const p = policy();
  const gut = [
    '<p class="x">Hallo <b>Welt</b></p>',
    '<a href="https://beispiel.invalid/?a=1&amp;b=2" target="_blank" rel="noopener">Link</a>',
    '<a href="https://beispiel.invalid/?q=&quot;a&#39;b&quot;">maskiert wie escapeHTML</a>',
    '<img src="data:image/png;base64,iVBORw0KGgo=" alt="">',
    '<img src="data:image/svg+xml;utf8,&lt;svg xmlns=&#39;http://www.w3.org/2000/svg&#39;&gt;&lt;/svg&gt;" alt="">',
    '<p>Sie sind online = ja; onclick=nichts im Text</p>',
    '<span title="Telefon onkel=1">ein Attributwert, kein Attribut</span>',
    '<button type="button" data-ziel="x" aria-label="a &gt; b">x</button>',
    '<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>',
    '<svg><style><![CDATA[.a{fill:red}]]></style></svg>',
    '<style>.a{color:red}</style><p>x</p>',
    '<textarea>a &lt;b&gt;</textarea>',
    '<!-- Kommentar --><p>t</p>',
  ];
  for (const s of gut) assert.equal(p.createHTML(s), s, s);
});

test('[Vertrauensregel] Skript-Adressen nur aus der festen Liste, Skript aus Text nie', () => {
  const p = policy();
  assert.equal(p.createScriptURL('sw.js'), 'sw.js');
  assert.equal(p.createScriptURL('./vorabkonfiguration.js'), './vorabkonfiguration.js');
  assert.throws(() => p.createScriptURL('https://fremd.invalid/x.js'), TYPFEHLER);
  assert.throws(() => p.createScriptURL('data:text/javascript,alert(1)'), TYPFEHLER);
  assert.throws(() => p.createScriptURL('blob:file:///x'), TYPFEHLER);
  assert.throws(() => p.createScript('alert(1)'), TYPFEHLER);
});

test('[Vertrauensregel] die Skript-Adressen der Liste sind die, die der Kern wirklich lädt — und keine andere Anwendung lädt Skript', () => {
  const kern = lies('vivodepot.html');
  assert.match(kern, /navigator\.serviceWorker\.register\('sw\.js'\)/);
  assert.match(kern, /const VOR_DEPOT_KONFIGURATION_PFAD = '\.\/vorabkonfiguration\.js';/);
  for (const f of ANWENDUNGEN_SOLL.filter((x) => x !== 'vivodepot.html')) {
    const html = lies(f);
    assert.doesNotMatch(html, /serviceWorker\.register\(|createElement\(\s*['"]script['"]\s*\)|new Worker\(|importScripts\(/, f);
  }
});

test('[Vertrauensregel] der Blocktext bricht das Skript-Element nicht und hängt an keiner Laufzeit-Bibliothek', () => {
  assert.doesNotMatch(BLOCK_TEXT, /<\/script|<!--|<script/i);
  assert.match(BLOCK_TEXT, /createPolicy\('default'/);
  assert.doesNotMatch(BLOCK_TEXT, /\b(require|import)\b/);
});

test('[CSP·Testumgebung] eine geschriebene HTML-Kopie bekommt die passenden Hashes — nur, wenn ihre CSP schon Hashes trägt', () => {
  const { anpassen } = require('../tools/lib/csp-beim-schreiben.js');
  const gehasht = H.cspHashesNachziehen(META("script-src 'self' 'unsafe-inline'") + '<script>a()</script>');
  const abgeaendert = gehasht.replace('a()', 'b()');
  assert.equal(H.cspPruefen(abgeaendert).ok, false, 'Vorbedingung: die Kopie passt nicht mehr');
  assert.equal(H.cspPruefen(anpassen('/tmp/x.html', abgeaendert)).ok, true);
  const alsBuffer = anpassen('/tmp/x.html', Buffer.from(abgeaendert));
  assert.ok(Buffer.isBuffer(alsBuffer), 'ein Buffer bleibt ein Buffer');
  assert.equal(H.cspPruefen(alsBuffer.toString('utf8')).ok, true, 'auch als Buffer');
  const alt = META("script-src 'self' 'unsafe-inline'") + '<script>a()</script>';
  assert.equal(anpassen('/tmp/x.html', alt), alt, 'eine Fassung mit unsafe-inline bleibt unverändert');
  assert.equal(anpassen('/tmp/x.json', abgeaendert), abgeaendert, 'nur .html');
  for (const k of fs.readdirSync(REPO).filter((f) => /^playwright\.config(\.[a-z-]+)?\.js$/.test(f))) {
    assert.match(lies(k), /require\('\.\/tools\/lib\/csp-beim-schreiben\.js'\)\.einhaengen\(\)/, k);
  }
});
