'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-097 §11 — Kein Testmode im Produktivpfad (Bleibt-draußen-Wächter).
   ────────────────────────────────────────────────────────────────────────
   Zwei Zusicherungen (aus drei Register-Verboten; B16-083 ist ein Spezialfall
   von B16-082):
   • b16-082 (+083) — kein Schlüssel-/Header-Präfix führt vor crypto.subtle.verify
     zu einem Frühausstieg, der eine Signatur ungeprüft als gültig behandelt
     (einschließlich eines TEST_KEY_-Sentinels).
   • b16-055 — kein Schalter im Produktivpfad umgeht Krypto/Speicherung; die einzige
     Entwickler-/Demo-Affordance (die ?dev=1-Leiste) schaltet nur die Sicht
     (Modus._setzeIntern), nie den Sicherheits-/Speicherpfad.

   Geltungsbereich (ehrlich): statische Struktur-Prüfung über die zwei HTMLs —
   Abwesenheit eines Test-Sentinels/Präfix-Skips + der Demo-Schalter als reiner
   View-Switch. Sie beweist nicht semantisch „kein Bypass denkbar", sondern pinnt
   den heutigen sicheren Zustand und fängt die realistische Regression.

   Bindung ans Fundament (U2-ADR-098 + Nachtrag): folgt in B3.3 zusammen mit der
   §11-Klausel in U2-ADR-097 (pruefung:-Zeilen). Bis dahin trägt diese Datei
   keine const ADR/PRUEFUNGEN — sonst schlüge die Fundament-Universalität an,
   bevor die Klausel existiert.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { vendorZeilen } = require('../tools/zusicherungen-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const HTML  = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');

// Bindung an U2-ADR-097 §11 über das Fundament (U2-ADR-098 + Nachtrag).
const ADR = 'U2-ADR-097';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'b16-082-kein-praefix-skip-der-verifikation',
  'b16-055-kein-testmode-schalter-umgeht-krypto-speicher',
];

// Eigen-Code: vendorte Bibliotheksblöcke (SBOM-belegt, U2-ADR-097 §1-Ausnahme, z. B. jsPDFs
// eigener UA-Shim) und Kommentare raus — die Zusicherungen gelten für Vivodepots eigenen Code.
function eigenerCode(src) {
  const vendor = vendorZeilen(src);
  return src.split('\n').filter((z, i) => !vendor.has(i + 1)).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^:])\/\/.*$/gm, '$1');
}

// Klammer-balancierter Funktionskörper ab einem Ankertext (bis zur schließenden }).
function koerperAb(src, anker) {
  const start = src.indexOf(anker);
  assert.ok(start >= 0, 'Anker nicht gefunden: ' + anker);
  const offen = src.indexOf('{', start);
  let tiefe = 0;
  for (let i = offen; i < src.length; i++) {
    if (src[i] === '{') tiefe++;
    else if (src[i] === '}') { tiefe--; if (tiefe === 0) return src.slice(start, i + 1); }
  }
  throw new Error('Kein balancierter Körper für ' + anker);
}

/* ── Die Diskriminanten (je EINE Stelle, von Wächter UND Negativprobe genutzt) ────────────
   Feuerbarkeit bewiesen (25.07., Sweep-Nachtrag): Die Probe ruft denselben Code wie der
   Wächter — sonst prüfte sie eine Kopie statt des Wächters („Test speist toten Weg"). Und sie
   misst PAARWEISE (Mutation rein → rot, raus → grün): ein einzelnes Rot bewiese nur, dass
   IRGENDETWAS anschlug, nicht dass DIESE Klausel auf DIESE Mutation reagiert. */

// b16-082 — Präfix-/Sentinel-Skip der Verifikation im _verifyJWS-Körper.
function praefixSkipVerstoesse(verifyKoerper) {
  const v = [];
  if (!/crypto\.subtle\.verify/.test(verifyKoerper)) v.push('keine echte Signaturprüfung (crypto.subtle.verify fehlt)');
  if (/TEST_KEY|startsWith\(['"]TEST/.test(verifyKoerper)) v.push('Test-Präfix-/Sentinel-Skip im Verify-Körper');
  const i = verifyKoerper.indexOf('crypto.subtle.verify');
  const vorVerify = i >= 0 ? verifyKoerper.slice(0, i) : verifyKoerper;
  if (/gueltig\s*[:=]\s*true/.test(vorVerify)) v.push('gueltig=true VOR crypto.subtle.verify');
  return v;
}
// b16-082 — Test-Schlüssel-Sentinel irgendwo im Eigen-Code.
function sentinelVerstoesse(code) {
  return /TEST_KEY/.test(code) ? ['TEST_KEY-Sentinel im Eigen-Code'] : [];
}
// b16-055 — der Demo-Schalter (bzw. sein Ziel) darf Krypto/Speicher nicht berühren.
const SCHALTER_VERBOTEN = ['crypto.subtle', 'encrypt', 'decrypt', 'indexedDB',
                           'showSaveFilePicker', 'dateiAusgeben', 'depotHerunterladen'];
function schalterVerstoesse(koerper) {
  return SCHALTER_VERBOTEN.filter(t => koerper.includes(t)).map(t => 'Schalter-Ziel berührt „' + t + '"');
}

test('b16-082-kein-praefix-skip-der-verifikation', () => {
  for (const [name, src] of [['vivodepot.html', HTML], ['vivodepot-lesen.html', LESEN]]) {
    assert.deepEqual(sentinelVerstoesse(eigenerCode(src)), [], name + ': Test-Sentinel gefunden');
  }
  const verstoesse = praefixSkipVerstoesse(koerperAb(HTML, 'async function _verifyJWS'));
  assert.deepEqual(verstoesse, [], '_verifyJWS: ' + verstoesse.join(' · '));
});

test('b16-055-kein-testmode-schalter-umgeht-krypto-speicher', () => {
  // Die einzige Entwickler-/Demo-Affordance ist die ?dev=1-Leiste — im Normalbetrieb aus.
  assert.ok(/\[\?&\]dev=1/.test(HTML), 'die ?dev=1-Gate fehlt (Demo-Leiste nicht mehr versteckt?)');
  // Ihr onchange schaltet nur die Sicht (Modus._setzeIntern).
  const idx = HTML.indexOf("tb-modus-select').onchange");
  assert.ok(idx >= 0, 'tb-modus-select-Handler nicht gefunden');
  assert.ok(/Modus\._setzeIntern/.test(HTML.slice(idx, idx + 220)), 'Demo-Schalter ruft nicht Modus._setzeIntern');
  // _setzeIntern selbst berührt keine Krypto/Persistenz — ein reiner Render-/Stil-Wechsel.
  const verstoesse = schalterVerstoesse(koerperAb(HTML, '_setzeIntern: (modus) =>'));
  assert.deepEqual(verstoesse, [], '_setzeIntern (Ziel des Demo-Schalters): ' + verstoesse.join(' · '));
});

test('[Negativprobe] b16-082 feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  // Sauberer Verify-Körper: echte Prüfung, gueltig erst NACH crypto.subtle.verify.
  const sauber = [
    'async function _verifyJWS(jws, key) {',
    '  const r = { gueltig: false };',
    '  const ok = await crypto.subtle.verify(params, key, sig, daten);',
    '  if (!ok) { r.grund = "ungültig"; return r; }',
    '  r.gueltig = true;',
    '  return r;',
    '}',
  ].join('\n');
  assert.deepEqual(praefixSkipVerstoesse(sauber), [], 'sauberer Körper meldet Verstöße — Diskriminante zu grob');

  // (a) gueltig=true VOR der Prüfung einspeisen → rot, und zwar wegen dieser Mutation.
  const mutA = sauber.replace('  const ok = await', '  r.gueltig = true;\n  const ok = await');
  const rotA = praefixSkipVerstoesse(mutA);
  assert.ok(rotA.some(x => /VOR crypto\.subtle\.verify/.test(x)),
    'Wächter blind: gueltig=true vor der Prüfung wurde NICHT erkannt (' + rotA.join(' · ') + ')');

  // (b) Sentinel-Skip einspeisen → rot.
  const mutB = sauber.replace('  const r =', '  if (key.kid.startsWith("TEST")) return { gueltig: true };\n  const r =');
  assert.ok(praefixSkipVerstoesse(mutB).some(x => /Sentinel-Skip/.test(x)),
    'Wächter blind: startsWith("TEST")-Skip wurde NICHT erkannt');

  // (c) echte Prüfung entfernen → rot.
  assert.ok(praefixSkipVerstoesse(sauber.replace(/crypto\.subtle\.verify/, 'immerWahr')).some(x => /keine echte Signaturprüfung/.test(x)),
    'Wächter blind: fehlendes crypto.subtle.verify wurde NICHT erkannt');

  // (2) Mutationen RAUS → wieder grün (isoliert die Diskriminante).
  assert.deepEqual(praefixSkipVerstoesse(sauber), [], 'nach Rücknahme der Mutation nicht wieder grün');
  assert.deepEqual(sentinelVerstoesse('const k = "echter_schluessel";'), [], 'Sentinel-Zweig meldet ohne Mutation');
  assert.deepEqual(sentinelVerstoesse('const TEST_KEY_X = 1;'), ['TEST_KEY-Sentinel im Eigen-Code'],
    'Wächter blind: TEST_KEY im Eigen-Code wurde NICHT erkannt');
});

test('[Negativprobe] b16-055 feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const sauber = '{ _aktiv = modus; renderTopbar(); renderContent(); renderFooter(); }';
  assert.deepEqual(schalterVerstoesse(sauber), [], 'sauberer Schalter-Körper meldet Verstöße — Diskriminante zu grob');

  // (1) Krypto/Speicher-Berührung einspeisen → rot, je Token einzeln geprüft.
  for (const token of ['crypto.subtle', 'indexedDB', 'dateiAusgeben']) {
    const rot = schalterVerstoesse('{ _aktiv = modus; ' + token + '.tuWas(); renderTopbar(); }');
    assert.ok(rot.some(x => x.includes(token)),
      'Wächter blind: Schalter-Ziel mit „' + token + '" wurde NICHT erkannt');
  }
  // (2) RAUS → wieder grün.
  assert.deepEqual(schalterVerstoesse(sauber), [], 'nach Rücknahme der Mutation nicht wieder grün');
});

test('[Klausel] Bindung §11 an ' + ADR + ' über das Fundament', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099 B-2, Konvention aus B-1) ─────────────────
   Diese Waechter TRUGEN bereits eine Negativprobe — nur nicht maschinenlesbar. Der
   Pruefstand konnte deshalb nur sehen, dass irgendwo in der Datei eine [Negativprobe]
   steht, nicht ob sie DIESEM Waechter gilt: ein schwacher Beleg. Mit der Deklaration
   entscheidet der Aufruf-Nachweis es mechanisch — Diskriminante instrumentieren,
   Waechter im Kindprozess fahren, rot erwarten. REFERENZ, nicht Zeichenkette. */
module.exports = {
  PROBEN: [
    { fuer: 'b16-082-kein-praefix-skip-der-verifikation',            diskriminante: praefixSkipVerstoesse },
    { fuer: 'b16-055-kein-testmode-schalter-umgeht-krypto-speicher', diskriminante: schalterVerstoesse },
  ],
};
