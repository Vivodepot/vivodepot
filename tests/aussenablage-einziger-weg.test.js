'use strict';
/* ═══════════════════════════════════════════════════════════
   Außenablage: ein Schreibweg (U2-ADR-520)
   ───────────────────────────────────────────────────────────
   Was bei einem Dritten liegt, ist im Client verschlüsselt. Damit das an einer Stelle entschieden wird, schreibt in pod/ und
   share/ nur pod/aussenablage.js mit Körper nach außen (PUT, POST, PATCH, PROPPATCH, MKCOL, COPY, MOVE, sendBeacon,
   XMLHttpRequest, WebSocket). Jede andere Schreibstelle ist rot, außer den Einträgen in POSITIV, je mit Grund.

   Gehalten wird:
   1. Jede Datei in pod/ und share/ wird gelesen (das Verzeichnis, keine Liste); eine neue Datei ist sofort erfasst.
   2. Außerhalb von aussenablage.js steht keine Schreibstelle außer POSITIV; jeder Eintrag in POSITIV hat noch seine Fundstelle.
   3. Die Brücke lädt aussenablage.js vor bruecke.js.
   4. bruecke.js schreibt nur über aussenablage.js. Heute noch nicht: Befund POD-VERZEICHNIS-KLARTEXT (die Brücke legt eine
      Kopie des Verzeichnisses im Klartext im Pod ab). Der Fix kommt mit der Anpassung der Brücke.
   Rot-Beweise: ein gepflanztes PUT mit JSON, ein POST in einer erlaubten Datei außerhalb der erlaubten Funktion, eine Methode
   aus einer Variablen und sendBeacon werden gefunden.
   ═══════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const ORDNER = ['pod', 'share'];
const DER_WEG = 'pod/aussenablage.js';

/* Schreibstellen, die nicht ablegen. Je Eintrag Datei, umgebende Funktion und Grund. */
const POSITIV = Object.freeze([
  { datei: 'pod/solid-oidc.js', funktion: 'registrieren', grund: 'Anmeldung: Registrierung der Brücke beim Anbieter (RFC 7591); der Körper ist die feste Beschreibung der Brücke, keine Angabe der Person.' },
  { datei: 'pod/solid-oidc.js', funktion: 'tokenAnfrage', grund: 'Anmeldung: Token-Anfrage (OAuth 2.0, PKCE); der Körper sind Code, Verifier und Client-Kennung.' },
  { datei: 'pod/solid-oidc.js', funktion: 'podFetch', grund: 'Transport: setzt Token und DPoP-Beweis; Methode und Körper kommen von aussenablage.schreiben über `senden`.' },
  { datei: 'share/empfangen.js', funktion: 'jweHolen', grund: 'Abruf nach SMART Health Links: der POST holt eine Freigabe ab und legt nichts ab; der Körper sind recipient und passcode, die das Protokoll verlangt.' },
]);

const MUSTER = [
  { art: 'methode', re: /\bmethod\s*:\s*(['"`])(PUT|POST|PATCH|PROPPATCH|MKCOL|COPY|MOVE)\1/gi },
  { art: 'methode-variabel', re: /\bmethod\s*:\s*(?!['"`])[A-Za-z_$]/g },
  { art: 'sendBeacon', re: /\bsendBeacon\s*\(/g },
  { art: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/g },
  { art: 'WebSocket', re: /\bWebSocket\s*\(/g },
];

function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\w\\])\/\/[^\n]*/g, '$1');
}
function umgebendeFunktion(text, index) {
  const re = /(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>))/g;
  let name = null, m;
  while ((m = re.exec(text)) && m.index < index) name = m[1] || m[2];
  return name;
}
function schreibstellen(text) {
  const t = ohneKommentare(text);
  const raus = [];
  for (const { art, re } of MUSTER) {
    for (const m of t.matchAll(re)) raus.push({ art, zeile: t.slice(0, m.index).split('\n').length, funktion: umgebendeFunktion(t, m.index) });
  }
  return raus;
}
/* dateien: { 'pod/x.js': text } → Befunde (leer = gut) und die gefundenen Positiv-Einträge. */
function urteil(dateien) {
  const befunde = [];
  const gefunden = new Set();
  for (const [datei, text] of Object.entries(dateien)) {
    if (datei === DER_WEG) continue;
    for (const s of schreibstellen(text)) {
      const p = POSITIV.find((e) => e.datei === datei && e.funktion === s.funktion);
      if (p) gefunden.add(p);
      else befunde.push(datei + ':' + s.zeile + ' ' + s.art + ' in ' + s.funktion);
    }
  }
  return { befunde, gefunden };
}
function lesen() {
  const aus = {};
  for (const o of ORDNER) {
    for (const n of fs.readdirSync(path.join(WURZEL, o))) if (n.endsWith('.js')) aus[o + '/' + n] = fs.readFileSync(path.join(WURZEL, o, n), 'utf8');
  }
  return aus;
}
const ohne = (dateien, name) => Object.fromEntries(Object.entries(dateien).filter(([k]) => k !== name));

test('[Außenablage·ein Weg] außerhalb von aussenablage.js und der Brücke schreibt nichts mit Körper nach außen; POSITIV ist aktuell', () => {
  const alle = lesen();
  assert.ok(alle[DER_WEG], 'der Schreibweg fehlt');
  assert.ok(alle['pod/bruecke.js'] && alle['share/empfangen.js'], 'Positivkontrolle: das Verzeichnis wird gelesen');
  const { befunde, gefunden } = urteil(ohne(alle, 'pod/bruecke.js'));
  assert.deepEqual(befunde, []);
  assert.deepEqual(POSITIV.filter((e) => !gefunden.has(e)).map((e) => e.datei + '#' + e.funktion), [], 'Eintrag ohne Fundstelle: streichen');
  for (const e of POSITIV) assert.ok(e.grund.length > 40, 'Grund fehlt: ' + e.funktion);
});

test('[Außenablage·ein Weg] die Brücke lädt aussenablage.js vor bruecke.js', () => {
  const h = fs.readFileSync(path.join(WURZEL, 'pod', 'bruecke.html'), 'utf8');
  const a = h.indexOf('<script src="aussenablage.js"></script>');
  assert.ok(a > 0, 'aussenablage.js fehlt in bruecke.html');
  assert.ok(a > h.indexOf('<script src="chiffrat-pruefen.js"></script>'), 'aussenablage.js braucht chiffrat-pruefen.js vorher');
  assert.ok(a < h.indexOf('<script src="bruecke.js"></script>'));
});

test('[Außenablage·ein Weg] bruecke.js schreibt nur über aussenablage.js', { todo: 'POD-VERZEICHNIS-KLARTEXT' }, () => {
  assert.deepEqual(urteil({ 'pod/bruecke.js': lesen()['pod/bruecke.js'] }).befunde, []);
});

test('[Außenablage·ein Weg·Rot-Beweis] PUT mit JSON vorbei an aussenablage.js, POST außerhalb der erlaubten Funktion, Methode aus Variable, sendBeacon', () => {
  const lws = lesen()['pod/lws.js'];
  const gepflanzt = lws + "\nfunction kopieAblegen(a, liste) { return fetch(a, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(liste) }); }\n";
  const f1 = urteil({ 'pod/lws.js': gepflanzt }).befunde;
  assert.ok(f1.some((z) => /pod\/lws\.js:\d+ methode in kopieAblegen/.test(z)), f1.join(' | '));
  const oidc = lesen()['pod/solid-oidc.js'] + "\nfunction nebenbei(a) { return fetch(a, { method: \"post\", body: 'x' }); }\n";
  const f2 = urteil({ 'pod/solid-oidc.js': oidc }).befunde;
  assert.deepEqual(f2.map((z) => z.replace(/:\d+/, '')), ['pod/solid-oidc.js methode in nebenbei']);
  const f3 = urteil({ 'share/x.js': "const weg = (a, m) => fetch(a, { method: m, body: 'x' });\nfunction b(a) { navigator.sendBeacon(a, 'x'); }" }).befunde;
  assert.deepEqual(f3.map((z) => z.replace(/:\d+/, '')), ['share/x.js methode-variabel in weg', 'share/x.js sendBeacon in b']);
  assert.deepEqual(urteil({ 'pod/x.js': "// fetch(a, { method: 'PUT' })\n/* method: 'POST' */" }).befunde, [], 'Kommentare zählen nicht');
});

test('[Außenablage·ohne Schlüssel] die Brücke leitet keinen Schlüssel ab und entschlüsselt nichts; den Schlüssel des Verzeichnisses kennt nur der Kern', () => {
  const pod = Object.entries(lesen()).filter(([k]) => k.startsWith('pod/'));
  assert.ok(pod.length >= 5, 'Positivkontrolle: pod/ wird gelesen');
  const verboten = /\b(decrypt|deriveBits|deriveKey|unwrapKey)\s*\(|'HKDF'|_antwortSeedHolen|aussenablage-verzeichnis\/v1/;
  assert.deepEqual(pod.filter(([, t]) => verboten.test(ohneKommentare(t))).map(([k]) => k), []);
  assert.ok(verboten.test("crypto.subtle.deriveBits({ name: 'HKDF' }, k, 256)"), 'Rot-Beweis: eine Ableitung würde gefunden');
});
