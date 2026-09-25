'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   M5 (Code-Review, Nachmessung 16.09.2026; Entscheidung für v1) — der Name weckt keinen
   ersetzten Bereich
   ────────────────────────────────────────────────────────────────────────────
   `depotAnlegen` schreibt Vor- und Nachname nach `sektoren.identity`: dort lesen sie über zehn
   Stellen des Kerns, und dort liegt die Namensrolle `ankerNameFelder`. In pro-de ist `identity`
   aber ersetzt und ruht; die Weckung ist datengetrieben (U2-ADR-348) und weckte ihn beim
   Wiederöffnen der eigenen Datei — 8 statt 7 Bereiche. Die Regel: Werte, die in einem ersetzten
   Bereich NUR in den Feldern seiner Namensrolle stehen, wecken ihn nicht. Sie hängt an der
   Rolle, nicht an der Kennung `identity`. Jeder weitere echte Wert weckt ihn wie bisher.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const PW = 'Pro-Name-weckt-nicht-2026';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-name-weckt-nicht-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const gebaut = new Map();
function kern(slug) {
  if (!gebaut.has(slug)) {
    const p = VP.PRODUKTE.find((x) => x.slug === slug);
    const r = konfektionieren({
      ziel: path.join(TMP, slug), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: VP.modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut.get(slug);
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern().V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}

/* Anlegen mit Namen — dieselben zwei Schreibaufrufe wie `_depotAusPasswortFinalisieren` nach
   `depotAnlegen` (der Weg davor wartet auf den Datei-Dialog) —, optional ein weiterer Wert in
   identity, sichern, in einem frischen Kern desselben Produkts wieder öffnen. */
async function anlegenSichernOeffnen(slug, weitererWert) {
  const V = kern(slug);
  await V.depotAnlegen(PW);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Muster');
  if (weitererWert) {
    const d = V.getData();
    d.sektoren.identity = Object.assign({}, d.sektoren.identity, { birthDate: '1970-01-01' });
    V.setData(d);
  }
  const umschlag = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
  const W = kern(slug);
  await W.depotLaden(umschlag, PW);
  return W;
}

function bereicheNachOeffnen(W) {
  return { anzahl: W.bereicheAlle().length, identity: W.bereicheAlle().some((b) => b.id === 'identity'),
    name: ((W.getData().sektoren || {}).identity || {}).givenName || null };
}

function nameWecktVerstoesse(ergebnis, erwartet) {
  const v = [];
  if (ergebnis.anzahl !== erwartet.anzahl) v.push(ergebnis.anzahl + ' Bereiche statt ' + erwartet.anzahl);
  if (ergebnis.identity !== erwartet.identity) v.push('identity ' + (ergebnis.identity ? 'sichtbar' : 'unsichtbar'));
  if (ergebnis.name !== 'Erika') v.push('Name nicht mehr in der Datei: ' + ergebnis.name);
  return v;
}

test('[M5·pro-de] anlegen mit Namen, sichern, wieder öffnen: genau 7 Bereiche, der Name bleibt in der Datei', async () => {
  /* Seit 17.09.2026 (Variante a) ersetzt Pro identity nicht mehr: sechs Pro-Bereiche und identity.
     Die Regel am Kern bleibt für jedes Produkt, das den Bereich mit der Namensrolle ersetzt. */
  const verstoesse = nameWecktVerstoesse(bereicheNachOeffnen(await anlegenSichernOeffnen('pro-de', false)), { anzahl: 7, identity: true });
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[M5·Gegenprobe] ein weiterer echter Wert in identity weckt den Bereich in pro-de weiterhin', async () => {
  const verstoesse = nameWecktVerstoesse(bereicheNachOeffnen(await anlegenSichernOeffnen('pro-de', true)), { anzahl: 7, identity: true });
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

test('[M5·Gegenprobe] privat-de bleibt unverändert: 13 Bereiche, identity sichtbar', async () => {
  const verstoesse = nameWecktVerstoesse(bereicheNachOeffnen(await anlegenSichernOeffnen('privat-de', false)), { anzahl: 13, identity: true });
  assert.deepEqual(verstoesse, [], verstoesse.join(' · '));
});

module.exports = {
  PROBEN: [
    { fuer: '[M5·pro-de] anlegen mit Namen, sichern, wieder öffnen: genau 7 Bereiche, der Name bleibt in der Datei', diskriminante: nameWecktVerstoesse },
  ],
};
