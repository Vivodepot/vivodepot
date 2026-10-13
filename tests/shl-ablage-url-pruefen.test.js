'use strict';
/* Befund SHL-ABLAGE-URL-UNGEPRUEFT (MITTEL, 07.10.2026). Die Ablage-Adresse im shlink:/ wurde beim Erzeugen nur auf „nicht leer,
   höchstens 128 Zeichen“ geprüft, beim Lesen (Abholseite) nur auf das Präfix https://. Durch gingen http:, javascript:, data:,
   Zugangsdaten (user:pw@), Leer- und Steuerzeichen; die Halterin sah den Host nicht, bevor der Link entstand.
   Jetzt entscheidet EIN Block (SHL-ABLAGE-URL-BLOCK), zeichengleich im Kern und in share/empfangen.js, über new URL() und gegen
   die Originaleingabe. Gehalten wird:
     · Spiegel: der Block steht in beiden Dateien zeichengleich, und beide Fassungen entscheiden über dieselbe Liste gleich;
     · jede böse Form fällt, jede gute geht durch — beim Erzeugen (shlUriBauen) und beim Lesen (Block der Abholseite);
     · die Abholseite benutzt den Block für die url im Link und für die location im Manifest (keine Präfix-Regex mehr);
     · der Host steht sichtbar da, bevor der Link entsteht; ein fremder Host bekommt einen Hinweis.
   Rot-Beweis: je Form gegen die alte Prüfung (nur Länge bzw. nur Präfix), die sie durchließ. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');

const WURZEL = path.join(__dirname, '..');
const ANFANG = '/* ══ SHL-ABLAGE-URL-BLOCK';
const ENDE = '/* ══ ENDE SHL-ABLAGE-URL-BLOCK ══ */';
function block(datei) {
  const t = fs.readFileSync(path.join(WURZEL, datei), 'utf8');
  const a = t.indexOf(ANFANG); const b = t.indexOf(ENDE);
  assert.ok(a >= 0 && b > a, 'Block in ' + datei);
  return t.slice(a, b + ENDE.length);
}
function pruefer(datei) {
  const kontext = { URL };
  vm.runInNewContext(block(datei) + '\nthis.f = shlAblageUrlPruefen;', kontext);
  return kontext.f;
}

const GUT = [
  'https://share.vivodepot.de/f/abc123',
  'https://share.vivodepot.de',
  'https://pod.example.org/vivodepot/datei.jwe?x=1',
  'HTTPS://Share.Vivodepot.de/f/abc',
];
const BOESE = {
  'kein-https': ['http://share.vivodepot.de/f/abc', 'javascript:alert(1)', 'data:text/plain,abc', 'ftp://x.example/a'],
  zugangsdaten: ['https://user:pw@x.example/a', 'https://user@x.example/a'],
  zeichen: ['https://x.example/a b', 'https://x.example/a\tb', 'https://x.example/a\u0000', 'https://x.example/a%0ab',
    'https://x.example/a b', 'https://x.example/a b', 'https://x.example\\@evil.example/a', 'https://x.example/a%20b'],
  laenge: ['https://x.example/' + 'y'.repeat(200)],
  leer: [''],
};
const ALLE = [...GUT, ...Object.values(BOESE).flat()];

test('[SHL-Adresse·Spiegel] der Block steht im Kern und in der Abholseite zeichengleich, und beide entscheiden gleich', () => {
  assert.equal(block('share/empfangen.js'), block('vivodepot.html'));
  const kern = pruefer('vivodepot.html'); const seite = pruefer('share/empfangen.js');
  for (const u of ALLE) assert.deepEqual({ ...seite(u) }, { ...kern(u) }, JSON.stringify(u));
});

test('[SHL-Adresse] gute Adressen gehen durch, mit Host; jede böse Form fällt mit ihrem Grund', () => {
  const f = pruefer('vivodepot.html');
  for (const u of GUT) assert.equal(f(u).ok, true, u);
  assert.equal(f('HTTPS://Share.Vivodepot.de/f/abc').host, 'share.vivodepot.de');
  for (const [grund, liste] of Object.entries(BOESE)) {
    for (const u of liste) {
      const r = f(u);
      assert.equal(r.ok, false, JSON.stringify(u));
      if (grund !== 'zeichen') assert.equal(r.grund, grund, JSON.stringify(u));
    }
  }
  assert.equal(f('https://x.example/' + 'y'.repeat(200), { ohneLaenge: true }).ok, true, 'location im Manifest: ohne Längengrenze');
});

test('[SHL-Adresse·Rot] jede böse Form ging durch die alte Prüfung — Erzeugen: nur Länge, Lesen: nur Präfix', () => {
  const altErzeugen = (u) => typeof u === 'string' && !!u && u.length <= 128;
  const altLesen = (u) => /^https:\/\//i.test(u);
  for (const u of [...BOESE['kein-https'], ...BOESE.zugangsdaten, ...BOESE.zeichen]) assert.equal(altErzeugen(u), true, 'alt Erzeugen ließ durch: ' + JSON.stringify(u));
  for (const u of [...BOESE.zugangsdaten, ...BOESE.zeichen]) assert.equal(altLesen(u), true, 'alt Lesen ließ durch: ' + JSON.stringify(u));
});

test('[SHL-Adresse·Erzeugen] shlUriBauen wirft bei jeder bösen Form und baut den Link bei einer guten', () => {
  const { V } = ladeKern();
  const teile = { key: 'k'.repeat(43), label: 'Probe' };   // ohne weg: Flag U wie vor der Wahl der Wege
  for (const u of Object.values(BOESE).flat()) assert.throws(() => V.shlUriBauen(teile, u), /SHL: url/, JSON.stringify(u));
  assert.ok(V.shlUriBauen(teile, 'https://share.vivodepot.de/f/abc').startsWith(V.SHL_URI_PRAEFIX));
});

test('[SHL-Adresse·Lesen] die Abholseite prüft url und location über den Block, keine Präfix-Regex mehr', () => {
  const t = fs.readFileSync(path.join(WURZEL, 'share', 'empfangen.js'), 'utf8');
  const ohneBlock = t.replace(block('share/empfangen.js'), '');
  assert.match(ohneBlock, /shlAblageUrlPruefen\(nutzlast\.url\)/);
  assert.match(ohneBlock, /shlAblageUrlPruefen\(datei\.location, \{ ohneLaenge: true \}\)/);
  assert.doesNotMatch(ohneBlock, /\/\^https:\\\/\\\/\/i\.test/, 'die alte Präfix-Prüfung ist fort');
});

test('[SHL-Adresse·Oberfläche] der Host steht sichtbar da, bevor der Link entsteht; ein fremder Host bekommt einen Hinweis', () => {
  const { V } = ladeKern();
  const ziel = () => ({ textContent: 'alt', kinder: [], appendChild(x) { this.kinder.push(x); return x; } });
  let weiter = 0;
  const eigen = ziel();
  V._shlHostBestaetigungZeigen(eigen, 'share.vivodepot.de', () => { weiter++; });
  assert.equal(eigen.textContent, '', 'vorheriger Inhalt geleert');
  assert.ok(eigen.kinder[0].textContent.includes('share.vivodepot.de'), 'Host sichtbar');
  const knopf = eigen.kinder[eigen.kinder.length - 1];
  assert.equal(eigen.kinder.length, 2, 'eigene Ablage: Satz und Knopf, kein Hinweis');
  assert.equal(weiter, 0, 'kein Link ohne Bestätigung');
  knopf.onclick();
  assert.equal(weiter, 1, 'erst die Bestätigung baut den Link');
  const fremd = ziel();
  V._shlHostBestaetigungZeigen(fremd, 'evil.example', () => {});
  assert.equal(fremd.kinder.length, 3, 'fremder Host: Satz, Hinweis, Knopf');
  // Der Dialog ruft die Bestätigung vor shlUriBauen.
  const kern = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
  const i = kern.indexOf('const vorab = shlAblageUrlPruefen(url);');
  assert.ok(i > 0 && i < kern.indexOf('try { uri = shlUriBauen(teile, url); }', i), 'Bestätigung vor dem Bauen');
});
