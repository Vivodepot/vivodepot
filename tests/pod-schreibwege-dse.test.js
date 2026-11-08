'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Pod-Brücke: jeder Schreibweg steht in Ziffer 7b der Datenschutzerklärung (tools/pod-schreibwege-dse-pruefen.js)
   Befund POD-DSE-VERZEICHNISKOPIE (03.11.2026): eine Kopie des Ablage-Verzeichnisses im Pod kam in den Code, ohne dass
   Ziffer 7b sie nannte. Die Probe hält die Klasse: ein neuer schreibender Aufruf, ein neuer Ordner im Pod oder eine neue
   Art im Kern ist rot, bis Register und Datenschutzerklärung ihn tragen. Die beiden DSE-Fassungen sind erfunden und
   entstehen in Wegwerf-Ordnern, die die Probe am Ende selbst löscht.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/pod-schreibwege-dse-pruefen.js');

const WURZEL = path.join(__dirname, '..');
const WEGWERF = [];
after(() => { for (const d of WEGWERF) fs.rmSync(d, { recursive: true, force: true }); });
function wegwerfOrdner() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pod-schreibwege-')); WEGWERF.push(d); return d; }

const DSE_MIT = [
  "<!doctype html><html lang=\"de\"><body>",
  "<h2>7. Die Anwendung</h2><p>Erfundener Text für die Probe.</p>",
  "<h2>7b. Ablage im eigenen Pod (pod.example)</h2>",
  "<p>Die Brücke meldet Sie bei dem Anbieter an, dessen Adresse Sie eingeben, und registriert sich dort als „Vivodepot Pod-Brücke“. Sie legt die verschlüsselte Datei dort ab.</p>",
  "<p>Bietet Ihr Pod einen Dienst für Freigaben an, stellt die Brücke dort eine Freigabe aus und schickt sie an den Posteingang der Stelle.</p>",
  "<p>Sie können Ablagen zurücknehmen. Das Verzeichnis Ihrer Ablagen liegt verschlüsselt in Ihrem Pod. Daneben liegt dort eine Liste mit Adresse und Ablauf.</p>",
  "<h2>8. Aufruf</h2><p>Erfunden.</p>",
  "<h2>7. The application</h2><p>Invented text for the probe.</p>",
  "<h2>7b. Storage in your own pod (pod.example)</h2>",
  "<p>The bridge signs you in with the provider whose address you enter and registers there as “Vivodepot Pod-Brücke”. It stores the encrypted file there.</p>",
  "<p>If your pod offers a grant service, the bridge issues a grant there and sends it to the organisation’s inbox.</p>",
  "<p>You can withdraw stored files. The directory of your stored files is kept encrypted in your pod. Next to it is a list with the address and expiry.</p>",
  "<h2>8. Opening</h2><p>Invented.</p>",
  "</body></html>",
].join('\n') + '\n';
const DSE_OHNE = DSE_MIT.replace(' Das Verzeichnis Ihrer Ablagen liegt verschlüsselt in Ihrem Pod.', '')
  .replace(' The directory of your stored files is kept encrypted in your pod.', '');
function dseDatei(inhalt) { const d = path.join(wegwerfOrdner(), 'datenschutz.html'); fs.writeFileSync(d, inhalt); return d; }

function podKopie(aendern) {
  const ziel = wegwerfOrdner();
  const pod = path.join(ziel, 'pod');
  fs.mkdirSync(pod);
  for (const d of fs.readdirSync(path.join(WURZEL, 'pod'))) fs.copyFileSync(path.join(WURZEL, 'pod', d), path.join(pod, d));
  fs.copyFileSync(path.join(WURZEL, 'vivodepot.html'), path.join(ziel, 'vivodepot.html'));
  aendern(pod, ziel);
  return { pod, kern: path.join(ziel, 'vivodepot.html') };
}
function anhaengen(datei, text) { fs.appendFileSync(datei, '\n' + text + '\n'); }

test('Stand des Repos: jeder Schreibweg, Ordner und jede Art des Kerns steht im Register', () => {
  const r = W.pruefen({});
  assert.deepEqual(r.fehler, []);
  assert.ok(r.kennungen.includes('POD-VERZEICHNIS-KOPIE'), 'die Verzeichnis-Kopie ist ein Schreibweg');
  assert.ok(r.kennungen.length >= 6, 'die Probe sieht die Schreibwege überhaupt: ' + r.kennungen.join(', '));
});

test('DSE mit allen Sätzen: grün', () => {
  assert.deepEqual(W.pruefen({ dse: dseDatei(DSE_MIT) }).fehler, []);
});

test('Rot-Beweis: DSE ohne die Ablaufliste ist rot, DE und EN', () => {
  const ohne = DSE_MIT.replace(' Daneben liegt dort eine Liste mit Adresse und Ablauf.', '')
    .replace(' Next to it is a list with the address and expiry.', '');
  assert.notEqual(ohne, DSE_MIT);
  const f = W.pruefen({ dse: dseDatei(ohne) }).fehler;
  assert.equal(f.length, 2, f.join('\n'));
  assert.ok(f.every((z) => z.startsWith('POD-ABLAUFLISTE')), f.join('\n'));
});

test('Klasse: der alte Satz „Freigabe in Ihrem Pod“ ist rot, auch neben dem neuen, DE und EN', () => {
  const alt = DSE_MIT.replace('stellt die Brücke dort eine Freigabe aus', 'stellt die Brücke dort eine Freigabe aus; zudem legt die Brücke in Ihrem Pod eine Freigabe ab')
    .replace('the bridge issues a grant there', 'the bridge issues a grant there; also, the bridge places a grant in your pod');
  assert.notEqual(alt, DSE_MIT);
  const f = W.pruefen({ dse: dseDatei(alt) }).fehler;
  assert.equal(f.length, 2, f.join('\n'));
  assert.ok(f.every((z) => z.startsWith('POD-FREIGABE-IM-POD')), f.join('\n'));
});

test('Rot-Beweis: DSE ohne den Freigabe-Dienst ist rot, DE und EN', () => {
  const ohne = DSE_MIT.replace('stellt die Brücke dort eine Freigabe aus', 'tut die Brücke nichts')
    .replace('the bridge issues a grant there', 'the bridge does nothing');
  const f = W.pruefen({ dse: dseDatei(ohne) }).fehler;
  assert.equal(f.length, 2, f.join('\n'));
  assert.ok(f.every((z) => z.startsWith('POD-FREIGABE:')), f.join('\n'));
});

test('Rot-Beweis: DSE ohne die Verzeichnis-Kopie ist rot, DE und EN', () => {
  assert.notEqual(DSE_OHNE, DSE_MIT, 'die Fassung ohne Kopie unterscheidet sich');
  const f = W.pruefen({ dse: dseDatei(DSE_OHNE) }).fehler;
  assert.equal(f.length, 2, f.join('\n'));
  assert.ok(f.every((x) => x.startsWith('POD-VERZEICHNIS-KOPIE')));
});

test('Klasse: ein neuer schreibender Aufruf ohne Registereintrag ist rot', () => {
  const k = podKopie((pod) => anhaengen(path.join(pod, 'bruecke.js'), "function neuerWeg(a) { return fetch(a, { method: 'PUT', body: '' }); }"));
  const f = W.pruefen({ pod: k.pod, kern: k.kern }).fehler;
  assert.ok(f.some((x) => x.startsWith('bruecke.js:neuerWeg')), f.join('\n'));
});

test('Klasse: eine nicht wörtliche Methode außerhalb des Durchreichers ist rot', () => {
  const k = podKopie((pod) => anhaengen(path.join(pod, 'lws.js'), 'function schicken(a, m) { return fetch(a, { method: m }); }'));
  const f = W.pruefen({ pod: k.pod, kern: k.kern }).fehler;
  assert.ok(f.some((x) => x.startsWith('lws.js:schicken') && /nicht wörtlich/.test(x)), f.join('\n'));
});

test('Klasse: ein neuer Weg über die Außenablage ohne Registereintrag ist rot', () => {
  const k = podKopie((pod) => anhaengen(path.join(pod, 'bruecke.js'),
    "function neuerAblageWeg(a) { return vdAussenablage.schreiben(senden, 'PUT', a, 'x', '', {}); }"));
  const f = W.pruefen({ pod: k.pod, kern: k.kern }).fehler;
  assert.ok(f.some((x) => x.startsWith('bruecke.js:neuerAblageWeg')), f.join('\n'));
});

test('Klasse: die Außenablage mit nicht wörtlicher Methode außerhalb des Durchreichers ist rot', () => {
  const k = podKopie((pod) => anhaengen(path.join(pod, 'lws.js'), 'function weiter(a, m) { return A.schreiben(senden, m, a); }'));
  const f = W.pruefen({ pod: k.pod, kern: k.kern }).fehler;
  assert.ok(f.some((x) => x.startsWith('lws.js:weiter') && /nicht wörtlich/.test(x)), f.join('\n'));
});

test('Durchreicher: die Kopfzeile function schreiben(senden, methode, …) ist kein Aufruf', () => {
  const k = podKopie((pod) => fs.writeFileSync(path.join(pod, 'aussenablage.js'),
    "function schreiben(senden, methode, adresse) {\n  var o = { method: methode, headers: {} };\n  return senden(adresse, o);\n}\n"));
  const f = W.pruefen({ pod: k.pod, kern: k.kern }).fehler;
  assert.ok(!f.some((x) => x.startsWith('aussenablage.js')), f.join('\n'));
});

test('Klasse: ein neuer Ordner im Pod ist rot', () => {
  const k = podKopie((pod) => {
    const p = path.join(pod, 'bruecke.js');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/var ORDNER = \{/, "var ORDNER = { protokoll: 'vivodepot/protokoll/',"));
  });
  const f = W.pruefen({ pod: k.pod, kern: k.kern }).fehler;
  assert.ok(f.some((x) => x.startsWith('ORDNER.protokoll')), f.join('\n'));
});

test('Klasse: eine neue Art im Kern ist rot', () => {
  const k = podKopie((pod, ziel) => {
    const p = path.join(ziel, 'vivodepot.html');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace("const POD_ARTEN = Object.freeze(['link', 'stelle', 'eigen'])", "const POD_ARTEN = Object.freeze(['link', 'stelle', 'eigen', 'archiv'])"));
  });
  const f = W.pruefen({ pod: k.pod, kern: k.kern }).fehler;
  assert.ok(f.some((x) => x.startsWith('POD_ARTEN archiv')), f.join('\n'));
});

test('Karteileiche: ein Registereintrag ohne Schreibweg ist am Repo-Stand rot', () => {
  const k = podKopie((pod) => {
    const p = path.join(pod, 'bruecke.js');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/function kopieSchreiben\(/, 'function kopieSchreibenAlt('));
  });
  const r = W.codePruefen(k.pod, k.kern, true);
  assert.ok(r.fehler.some((x) => x.startsWith('bruecke.js:kopieSchreiben:') && /Karteileiche/.test(x)), r.fehler.join('\n'));
});
