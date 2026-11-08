'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   SECURITY.md nennt jede Anwendung, die den Anker der Trust-Authority trägt (Befund SECURITY-ANKER-SAEULEN, 05.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   SECURITY.md Abschnitt 1, Zeile „Verwendungs-Pfad“, sagt, wo der öffentliche Schlüssel der Trust-Authority eingebettet ist.
   Der Satz sagte „ausschließlich … Bürger-App und Lese-App“; im Code trugen ihn auch Studio und VC-Issuer. Eine öffentliche
   Sicherheitsaussage, die dem Code widerspricht, ist ein Befund ab HOCH.

   Gehalten wird, in beide Richtungen, für jede der vier Anwendungsdateien, die im Baum liegt:
     · trägt die Datei den Anker (sein `x`), nennt der erste Satz der Zeile „Verwendungs-Pfad“ die Anwendung;
     · nennt der Satz die Anwendung, trägt die Datei den Anker.
   Eine Datei, die im Baum fehlt, wird nicht gemessen.
   Rot-Beweis an einem erfundenen Satz und an einer erfundenen Datei.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const ANWENDUNGEN = [
  ['vivodepot.html', 'Bürger-App'],
  ['vivodepot-lesen.html', 'Lese-App'],
  ['vivodepot-studio.html', 'Studio'],
  ['vivodepot-vc-issuer.html', 'VC-Issuer'],
];

function ankerX(security) {
  const kern = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
  const m = /const TRUST_AUTHORITY_PUBLIC_JWK = Object\.freeze\(\{[\s\S]*?\bx: '([A-Za-z0-9_-]{43})'/.exec(kern);
  assert.ok(m, 'Vorbedingung: der Anker steht im Kern');
  assert.ok(security.length > 0);
  return m[1];
}

function verwendungsSatz(security) {
  const zeile = security.split('\n').find((z) => z.startsWith('**Verwendungs-Pfad:**'));
  assert.ok(zeile, 'Vorbedingung: SECURITY.md trägt die Zeile „Verwendungs-Pfad“');
  const rest = zeile.slice('**Verwendungs-Pfad:**'.length);
  const ende = rest.search(/\.(\s|$)/);
  return ende < 0 ? rest : rest.slice(0, ende);
}

function abweichungen(satz, texte, x) {
  const fehler = [];
  for (const [datei, name] of ANWENDUNGEN) {
    if (!(datei in texte)) continue;
    const traegt = texte[datei].includes(x);
    const genannt = satz.includes(name);
    if (traegt && !genannt) fehler.push(name + ' trägt den Anker, SECURITY.md nennt sie nicht');
    if (!traegt && genannt) fehler.push('SECURITY.md nennt ' + name + ', die Datei trägt den Anker nicht');
  }
  return fehler;
}

function texteImBaum() {
  const t = {};
  for (const [datei] of ANWENDUNGEN) {
    const p = path.join(WURZEL, datei);
    if (fs.existsSync(p)) t[datei] = fs.readFileSync(p, 'utf8');
  }
  return t;
}

test('[Security·Anker] SECURITY.md nennt genau die Anwendungen, die den Anker der Trust-Authority tragen', () => {
  const security = fs.readFileSync(path.join(WURZEL, 'SECURITY.md'), 'utf8');
  const x = ankerX(security);
  const texte = texteImBaum();
  assert.ok(texte['vivodepot.html'].includes(x) && texte['vivodepot-lesen.html'].includes(x), 'Positivkontrolle: Kern und Lese-App tragen den Anker');
  assert.deepEqual(abweichungen(verwendungsSatz(security), texte, x), []);
});

test('[Security·Anker·Rot-Beweis] ein Satz ohne eine tragende Anwendung und ein Satz mit einer nicht tragenden fallen auf', () => {
  const x = 'A'.repeat(43);
  const texte = { 'vivodepot.html': x, 'vivodepot-lesen.html': x, 'vivodepot-studio.html': x, 'vivodepot-vc-issuer.html': 'ohne' };
  assert.deepEqual(abweichungen(' in Bürger-App und Lese-App eingebettet', texte, x), ['Studio trägt den Anker, SECURITY.md nennt sie nicht']);
  assert.deepEqual(abweichungen(' in Bürger-App, Lese-App, Studio und VC-Issuer eingebettet', texte, x),
    ['SECURITY.md nennt VC-Issuer, die Datei trägt den Anker nicht']);
  assert.deepEqual(abweichungen(' in Bürger-App, Lese-App und Studio eingebettet', texte, x), []);
  assert.equal(verwendungsSatz('**Verwendungs-Pfad:** in A und B. Danach etwas über VC-Issuer.'), ' in A und B');
});
