'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════
   Der Generator prüft und gibt ein Sprachmodul aus — er erzeugt keins (22.09.2026, Variante B)
   ───────────────────────────────────────────────────────────────────────────────────────────
   Achte Ausgabeart des Generators. Was diese Datei hält:
   (1) die Prüfung: jeder Grund, aus dem der Einlass ein Sprachmodul SICHER ablehnt, wird hier gemeldet; was vom Kennungssatz abhängt, wird als
       „möglich" gemeldet, nicht als Fehler;
   (2) PARITÄT MIT DEM KERN an dem, was der Generator spiegelt (die Gründe und die Konstanten: Größe, Tiefe, Zeichenmuster, Modulschlüssel);
   (3) die BENANNTE GRENZE: „ob eine Kennung dem Produkt bekannt ist, prüft erst der Einlass" steht im Absatz VOR dem Laden, in jedem Bericht und in
       der Ausgabe, und der Generator sagt ausdrücklich, dass er das Sprachmodul nicht schreibt;
   (4) die Ausgabe: verbatim, mit oder ohne Signatur.
   VORAUSSETZUNG für (2), Fall „leer": der Einlass-Zug (`textsatzModulPruefen` liefert `grund:'leer'`, Commit „der Textsatz-Einlass meldet einen Verlust") —
   ohne ihn nimmt der Kern ein Modul aus lauter leeren Texten an, und die Probe dazu ist rot, wie sie es sein soll.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
const KERN_QUELLE = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const BEKANNT = 'strings:depotPilleEigen.text';   // eine Kennung, die der Kern kennt
const modul = (texte, extra) => Object.assign({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, texte }, extra || {});
const gen = () => ladeGenerator().V;
// Der Generator läuft in einem eigenen VM-Kontext (ladeGenerator öffnet ihn sandboxed) — seine Arrays/Objekte
// tragen darum ein ANDERES Array.prototype als das dieser Testdatei. Array.isArray() sieht das nicht, aber
// assert.deepEqual (unter node:assert/strict ein Alias auf deepStrictEqual) verlangt Referenzgleichheit der
// Prototypen und wird sonst rot, obwohl der Inhalt identisch ist — j() normalisiert, wie in den Geschwister-
// Testdateien (s. tests/generator-feld-eigenschaften.test.js).
const j = (x) => JSON.parse(JSON.stringify(x));

/* ── (1) die Prüfung ──────────────────────────────────────────────────────────────────────── */

test('[Sprachmodul·Prüfung] ein gültiges Modul: gültig, mit der Zahl der Texte, ohne Verworfene', () => {
  const g = gen().sprachmodulPruefen(modul({ [BEKANNT]: 'Mon coffre', 'strings:zwei.text': 'Deux' }));
  assert.equal(g.gueltig, true);
  assert.equal(g.grund, null);
  assert.equal(g.texteAnzahl, 2);
  assert.deepEqual(j(g.verworfene), []);
  assert.deepEqual(j(g.moeglicheVerworfene), []);
});

test('[Sprachmodul·Prüfung·Rot-Beweis] jeder sichere Ablehnungsgrund wird gemeldet — je einer, mit dem Namen, den der Kern benutzt', () => {
  const V = gen();
  const tief = (n) => { let o = { blatt: 'x' }; for (let i = 0; i < n; i++) o = { unter: o }; return o; };
  const faelle = [
    ['kein-objekt', null], ['kein-objekt', 'text'], ['kein-objekt', [1]],
    ['zu-tief', modul({ [BEKANNT]: 'x' }, { rest: tief(45) })],
    ['zu-gross', modul({ [BEKANNT]: 'x'.repeat(520 * 1024) })],
    ['unbekannter-typ', { sprache: 'fr', moduleVersion: 1, texte: { [BEKANNT]: 'x' } }],
    ['unbekannter-typ', modul({ [BEKANNT]: 'x' }, { modulTyp: 'bereich' })],
    ['sprache', modul({ [BEKANNT]: 'x' }, { sprache: '' })],
    ['sprache', modul({ [BEKANNT]: 'x' }, { sprache: undefined })],
    ['reserviert', modul({ [BEKANNT]: 'x' }, { sprache: 'de' })],
    ['moduleVersion', modul({ [BEKANNT]: 'x' }, { moduleVersion: 0 })],
    ['moduleVersion', modul({ [BEKANNT]: 'x' }, { moduleVersion: '1' })],
    ['texte', { modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1 }],
    ['texte', modul([BEKANNT])],
    ['keine-texte', modul({})],
    ['leer', modul({ [BEKANNT]: '   ', 'strings:zwei.text': '' })],
  ];
  for (const [erwartet, eingabe] of faelle) {
    const g = V.sprachmodulPruefen(eingabe);
    assert.equal(g.gueltig, false, 'sollte abgelehnt werden: ' + erwartet);
    assert.equal(g.grund, erwartet, JSON.stringify(eingabe && typeof eingabe === 'object' && !Array.isArray(eingabe) ? Object.keys(eingabe) : eingabe));
  }
});

test('[Sprachmodul·Prüfung] leere Texte sind sicher verworfen; Markup und Anführungszeichen nur MÖGLICH verworfen; unpaarige Klammern nur eine Warnung', () => {
  const g = gen().sprachmodulPruefen(modul({
    [BEKANNT]: 'Gut', 'strings:leer.text': ' ', 'strings:markup.text': 'Ein <b>Wort</b>', 'strings:zitat.text': 'Sie sagte "ja"', 'strings:ref.text': 'A &amp; B',
    'strings:klammer.text': 'Hallo {name', 'strings:ok.text': 'Hallo {name}, {n} Treffer', 'strings:leerklammer.text': 'Hallo {}',
  }));
  assert.equal(g.gueltig, true);
  assert.deepEqual(j(g.verworfene.map((v) => v.kennung)), ['strings:leer.text']);
  assert.deepEqual(j(g.moeglicheVerworfene.map((v) => v.kennung).sort()), ['strings:markup.text', 'strings:ref.text', 'strings:zitat.text']);
  assert.deepEqual(j(g.platzhalterFunde.map((v) => v.kennung).sort()), ['strings:klammer.text', 'strings:leerklammer.text']);
  assert.equal(g.texteAnzahl, 7, 'sieben nicht-leere Texte, der leere zählt nicht');
});

test('[Sprachmodul·Prüfung] unbekannte Schlüssel auf oberster Ebene werden benannt, das Modul bleibt gültig (wie im Kern)', () => {
  const g = gen().sprachmodulPruefen(modul({ [BEKANNT]: 'x' }, { herkunft: 'irgendwer', regeln: { datumsformat: 'TT.MM.JJJJ' } }));
  assert.equal(g.gueltig, true);
  assert.deepEqual(j(g.unbekannteSchluessel), ['herkunft']);
});

test('[Sprachmodul·Prüfung] das echte englische Sprachmodul des Kerns ist gültig — Positivkontrolle an einer echten Datei', () => {
  const echt = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8'));
  const g = gen().sprachmodulPruefen(echt);
  assert.equal(g.gueltig, true, g.grund || '');
  assert.ok(g.texteAnzahl > 3000, 'Vorbedingung: das Modul trägt tausende Texte (' + g.texteAnzahl + ')');
  assert.equal(g.texteAnzahl, Object.values(echt.texte).filter((t) => typeof t === 'string' && t.trim()).length);
});

/* ── (2) Parität mit dem Kern ─────────────────────────────────────────────────────────────── */

async function kernGrund(m) {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  const r = V.modulEinlassen(typeof m === 'string' ? m : JSON.stringify(m));
  return { angenommen: r.angenommen, grund: r.grund };
}

test('[Sprachmodul·Parität] dieselben Fälle, derselbe Grund im Kern: was der Generator als sicher abgelehnt meldet, lehnt der Einlass mit demselben Namen ab', async () => {
  const V = gen();
  const faelle = [
    modul({ [BEKANNT]: 'x' }, { sprache: '' }),
    modul({ [BEKANNT]: 'x' }, { sprache: 'de' }),
    modul({ [BEKANNT]: 'x' }, { moduleVersion: 0 }),
    { modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1 },
    modul({ [BEKANNT]: 'x' }, { modulTyp: 'unbekannt' }),
    modul({ [BEKANNT]: 'x'.repeat(520 * 1024) }),
    modul({ [BEKANNT]: '  ', 'strings:zwei.text': '' }),   // „leer": setzt den Einlass-Zug voraus
  ];
  for (const f of faelle) {
    const g = V.sprachmodulPruefen(f);
    const k = await kernGrund(f);
    assert.equal(g.gueltig, false, JSON.stringify(Object.keys(f)));
    assert.equal(k.angenommen, false, 'der Kern lehnt es ebenfalls ab (' + g.grund + ')');
    assert.equal(k.grund, g.grund, 'derselbe Grund im Kern und im Generator');
  }
});

test('[Sprachmodul·Parität] ein Modul, das der Generator gültig nennt, wird vom Kern angenommen — mit einer bekannten Kennung', async () => {
  const m = modul({ [BEKANNT]: 'Mon coffre' });
  assert.equal(gen().sprachmodulPruefen(m).gueltig, true);
  const k = await kernGrund(m);
  assert.equal(k.angenommen, true, k.grund || '');
});

test('[Sprachmodul·Parität·Konstanten] die gespiegelten Konstanten sind die des Kerns, gelesen aus dem Quelltext (Drift wird rot)', () => {
  const V = gen();
  const bytes = /const _MODUL_EINLASS_MAX_BYTES = (\d+) \* 1024;/.exec(KERN_QUELLE);
  const tiefe = /const _MODUL_EINLASS_MAX_TIEFE = (\d+);/.exec(KERN_QUELLE);
  const muster = /const _TAG_ODER_REFERENZ = (\/.*\/);/.exec(KERN_QUELLE);
  const schluessel = /const TEXTSATZ_MODUL_SCHLUESSEL = Object\.freeze\(\[([^\]]*)\]\);/.exec(KERN_QUELLE);
  assert.ok(bytes && tiefe && muster && schluessel, 'Vorbedingung: der Kern trägt alle vier Konstanten');
  assert.equal(V._SPRACHMODUL_MAX_BYTES, Number(bytes[1]) * 1024);
  assert.equal(V._SPRACHMODUL_MAX_TIEFE, Number(tiefe[1]));
  assert.equal(String(V._SPRACHMODUL_TAG_ODER_REFERENZ), muster[1]);
  assert.deepEqual([...V._SPRACHMODUL_SCHLUESSEL], [...schluessel[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
});

test('[Sprachmodul·Parität·Rot-Beweis] eine gedriftete Konstante würde erkannt: der Vergleich sieht eine andere Grenze', () => {
  const bytes = /const _MODUL_EINLASS_MAX_BYTES = (\d+) \* 1024;/.exec(KERN_QUELLE.replace('512 * 1024', '256 * 1024'));
  assert.notEqual(Number(bytes[1]) * 1024, gen()._SPRACHMODUL_MAX_BYTES, 'ein anderer Kern-Wert unterscheidet sich vom gespiegelten');
});

/* ── (3) die benannte Grenze ──────────────────────────────────────────────────────────────── */

function textVon(html, id) {
  const m = new RegExp('<p[^>]*id="' + id + '"[^>]*data-en="([^"]*)"[^>]*>([^<]*)</p>').exec(html);
  return m ? { en: m[1], de: m[2] } : null;
}

test('[Sprachmodul·Grenze] der Absatz „Was dieses Werkzeug NICHT prüft" steht VOR dem Laden im Markup und trägt den Wortlaut der Konstanten (deutsch und englisch)', () => {
  const V = gen();
  const p = textVon(HTML, 'ts-grenze');
  assert.ok(p, 'der Absatz #ts-grenze steht im Baustein');
  assert.equal(p.de, V.SPRACHMODUL_GRENZE_DE);
  assert.equal(p.en, V.SPRACHMODUL_GRENZE_EN);
  assert.match(p.de, /NICHT prüft: ob die Kennungen Ihrer Texte dem Produkt bekannt sind/);
  assert.match(p.de, /erst der Einlass des Produkts/);
});

test('[Sprachmodul·Grenze] der Baustein sagt, dass er das Sprachmodul nicht SCHREIBT und dass eine Partnerin damit allein nicht übersetzen kann', () => {
  const i = HTML.indexOf('id="ts-block"');
  assert.ok(i > 0);
  const block = HTML.slice(i, HTML.indexOf('</details>', i));
  assert.match(block, /Dieses Werkzeug schreibt es nicht/);
  assert.match(block, /Eine Partnerin kann Vivodepot mit diesem Werkzeug allein also nicht übersetzen/);
  assert.match(block, /This tool does not write it/);
});

test('[Sprachmodul·Grenze] JEDER Bericht eines gültigen Moduls trägt die Grenze — der Generator meldet nie „fehlerfrei", ohne zu sagen, was er nicht prüft', () => {
  const V = gen();
  for (const m of [modul({ [BEKANNT]: 'x' }), modul({ [BEKANNT]: 'x', 'strings:leer.text': ' ' }), modul({ [BEKANNT]: 'Ein <b>Tag</b>' })]) {
    const p = V.pruefeSprachmodul({ sprachmodul: { modul: m } });
    assert.deepEqual(j(p.blocker), []);
    assert.ok(p.warnungen.includes(V.L(V.SPRACHMODUL_GRENZE_DE, V.SPRACHMODUL_GRENZE_EN)), 'die Grenze steht im Bericht');
  }
});

test('[Sprachmodul·Grenze·Rot-Beweis] ein abgelehntes Modul bekommt Blocker statt Warnungen; ohne geladene Datei steht „noch keine Datei geladen"', () => {
  const V = gen();
  const ohne = V.pruefeSprachmodul({ sprachmodul: { modul: null } });
  assert.equal(ohne.blocker.length, 1);
  assert.match(ohne.blocker[0], /noch keine Sprachmodul-Datei geladen/);
  const kaputt = V.pruefeSprachmodul({ sprachmodul: { modul: modul({}, { sprache: '' }) } });
  assert.equal(kaputt.blocker.length, 1);
  assert.deepEqual(j(kaputt.warnungen), []);
});

/* ── (4) die Ausgabe ──────────────────────────────────────────────────────────────────────── */

test('[Sprachmodul·Ausgabe] ohne Schlüssel: verbatim, unsigniert; der Dateiname trägt Sprache und Anbieter', async () => {
  const V = gen();
  const m = modul({ [BEKANNT]: 'Mon coffre' }, { regeln: { datumsformat: 'TT.MM.JJJJ' } });
  const u = await V.baueSprachmodulSigniert({ sprachmodul: { modul: m } }, null);
  assert.equal(u.format, 'vivodepot-textsatz@1');
  assert.deepEqual(u.modul, m, 'genau der Inhalt der Datei — die Signatur deckt nichts anderes');
  assert.equal(u.modulSignaturJws, undefined);
  assert.equal(V.sprachmodulDateiname('Kammer A/B', 'fr-CA'), 'vivodepot-sprachmodul-fr-CA-Kammer_A_B.json');
  assert.equal(V.sprachmodulDateiname('', ''), 'vivodepot-sprachmodul-sprache-anbieter.json');
});

test('[Sprachmodul·Ausgabe] mit Schlüssel: signiert, und die Nutzlast der Signatur ist genau das Modul', async () => {
  const V = gen();
  const { webcrypto } = require('node:crypto');
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const m = modul({ [BEKANNT]: 'Mon coffre' });
  const u = await V.baueSprachmodulSigniert({ sprachmodul: { modul: m }, publicKeyJwk: pub }, priv);
  assert.match(u.modulSignaturJws, /^[\w-]+\.[\w-]+\.[\w-]+$/);
  const nutzlast = JSON.parse(Buffer.from(u.modulSignaturJws.split('.')[1], 'base64url').toString('utf8'));
  assert.deepEqual(nutzlast, m);
});

test('[Sprachmodul·Ausgabe] der Knopf ist einer der erlaubten Signier-Knöpfe, und der Handler ist im Markup und in der Verdrahtung', () => {
  assert.match(HTML, /SCHLUESSEL_ERLAUBTE_KNOEPFE = Object\.freeze\(\[[^\]]*'ts-erzeugen'/);
  assert.match(HTML, /\$\('ts-erzeugen'\) && \$\('ts-erzeugen'\)\.addEventListener\('click', sprachmodulErzeugen\)/);
  assert.match(HTML, /\$\('ts-datei'\) && \$\('ts-datei'\)\.addEventListener\('change', sprachmodulDateiGewaehlt\)/);
  assert.match(HTML, /<button type="button" id="ts-erzeugen"/);
});
