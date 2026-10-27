'use strict';
/* ═══════════════════════════════════════════════════════════
   Im Pod ablegen aus dem Kern (25.10.2026, Nachtrag zu U2-ADR-512, Stufe 2)
   ───────────────────────────────────────────────────────────
   Gehalten wird an podAblegen():
   1. Die Brücke öffnet sich unter der festen Adresse; vor „bereit“ geht nichts hinaus; die Bytes gehen einmal, mit
      targetOrigin = POD_BRUECKE_HERKUNFT (nie '*'), byte-gleich mit dem übergebenen Text.
   2. Angenommen wird nur aus genau dem geöffneten Fenster mit genau dieser Herkunft; „abgelegt“ nur mit der eigenen id, nur mit
      den vier Feldern und nur mit einer Adresse, die podAdressePruefen besteht (https, keine Zugangsdaten, keine Steuer- und
      Leerzeichen, Link höchstens 128 Zeichen).
   3. Nach der Frist verfällt der Auftrag; der Zuhörer ist weg. Der Auftrag trägt `bis`, kurz vor der eigenen Frist, damit auch
      die Brücke danach nicht mehr ablegt.
   4. Die drei Aufrufer geben dieselben Bytes wie ihr Datei-Weg.
   5. In der Vorschau (auch der Vorführung) öffnet sich keine Brücke, wie beim Datei-Weg nichts hinausgeht.
   Rot-Beweise: eine Kopie des Kerns ohne Herkunftsprüfung nimmt eine fremde Antwort an; eine ohne das Tor der Vorschau öffnet
   die Brücke.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const HERKUNFT = 'https://pod.vivodepot.de';
function aufbau(V, opt) {
  const gesendet = [];
  const w = { postMessage: (nachricht, ziel, transfer) => gesendet.push({ nachricht, ziel, transfer }) };
  const fremd = { postMessage: () => { throw new Error('an das fremde Fenster darf nichts gehen'); } };
  const hoerer = new Set();
  const ziel = { addEventListener: (t, f) => { if (t === 'message') hoerer.add(f); }, removeEventListener: (t, f) => hoerer.delete(f) };
  const uhren = [];
  const geoeffnet = [];
  const o = Object.assign({
    oeffnen: (name) => { geoeffnet.push(name); return w; }, ziel,
    uhr: (f, ms) => { uhren.push({ f, ms }); return uhren.length; }, uhrAus: () => {}, jetzt: () => 1000000,
  }, opt || {});
  const senden = (source, origin, data) => { for (const f of [...hoerer]) f({ source, origin, data }); };
  return { w, fremd, gesendet, hoerer, uhren, geoeffnet, o, senden };
}
const offen = async (p) => { let fertig = false; p.then(() => { fertig = true; }, () => { fertig = true; }); await new Promise((r) => setImmediate(r)); return !fertig; };
const text = (u8) => new TextDecoder().decode(new Uint8Array(u8));

test('[Pod·Kern] fester Ort, nichts vor „bereit“, die Bytes einmal an die feste Herkunft, dann die geprüfte Adresse', async () => {
  const { V } = ladeKern();
  assert.equal(V.POD_BRUECKE_URL, 'https://pod.vivodepot.de/bruecke.html');
  assert.equal(V.POD_BRUECKE_HERKUNFT, HERKUNFT);
  const a = aufbau(V);
  const p = V.podAblegen('link', 'eyJ.kopf.chiffrat', a.o);
  assert.deepEqual(a.geoeffnet, ['vd-pod-bruecke']);
  assert.equal(a.gesendet.length, 0, 'vor „bereit“ geht nichts hinaus');
  a.senden(a.w, 'https://boese.example', { typ: 'vd-pod-bereit', fassung: 1 });
  a.senden(a.fremd, HERKUNFT, { typ: 'vd-pod-bereit', fassung: 1 });
  assert.equal(a.gesendet.length, 0, 'fremde Herkunft und fremdes Fenster lösen nichts aus');
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-bereit', fassung: 1 });
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-bereit', fassung: 1 });
  assert.equal(a.gesendet.length, 1, 'die Bytes gehen genau einmal');
  const g = a.gesendet[0];
  assert.equal(g.ziel, HERKUNFT, 'targetOrigin ist die feste Herkunft, nie *');
  assert.deepEqual(Object.keys(g.nachricht).sort(), ['art', 'bis', 'daten', 'fassung', 'id', 'typ']);
  assert.equal(g.nachricht.bis, 1000000 + 10 * 60 * 1000 - 5000, 'bis liegt kurz vor der eigenen Frist');
  assert.equal(g.nachricht.typ, 'vd-pod-ablegen');
  assert.equal(g.nachricht.art, 'link');
  assert.match(g.nachricht.id, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(text(g.nachricht.daten), 'eyJ.kopf.chiffrat', 'byte-gleich mit dem übergebenen Text');
  assert.equal(g.transfer[0], g.nachricht.daten, 'der Puffer wird übertragen, nicht kopiert');
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-abgelegt', fassung: 1, id: g.nachricht.id, adresse: 'https://pod.example/vivodepot/links/abc' });
  assert.deepEqual(await p, { adresse: 'https://pod.example/vivodepot/links/abc', host: 'pod.example' });
  assert.equal(a.hoerer.size, 0, 'nach dem Ende hört niemand mehr zu');
});

test('[Pod·Kern] „abgelegt“ zählt nur mit eigener id, vier Feldern, fester Herkunft und geprüfter Adresse', async () => {
  const { V } = ladeKern();
  const a = aufbau(V);
  const p = V.podAblegen('link', 'eyJ.x.y', a.o);
  const vorBereit = { typ: 'vd-pod-abgelegt', fassung: 1, id: 'x'.repeat(22), adresse: 'https://pod.example/a' };
  a.senden(a.w, HERKUNFT, vorBereit);
  a.senden(a.w, HERKUNFT, { typ: 'vd-pod-bereit', fassung: 1 });
  const id = a.gesendet[0].nachricht.id;
  const gut = { typ: 'vd-pod-abgelegt', fassung: 1, id, adresse: 'https://pod.example/vivodepot/links/abc' };
  const schlecht = [
    [a.w, HERKUNFT, { ...gut, id: 'y'.repeat(22) }, 'fremde id'],
    [a.w, HERKUNFT, { ...gut, extra: 1 }, 'Zusatzfeld'],
    [a.w, 'https://boese.example', gut, 'fremde Herkunft'],
    [a.fremd, HERKUNFT, gut, 'fremdes Fenster'],
    [a.w, HERKUNFT, { ...gut, adresse: 'http://pod.example/a' }, 'http'],
    [a.w, HERKUNFT, { ...gut, adresse: 'https://nutzer:pw@pod.example/a' }, 'Zugangsdaten'],
    [a.w, HERKUNFT, { ...gut, adresse: 'https://pod.example/a\u0000b' }, 'Steuerzeichen'],
    [a.w, HERKUNFT, { ...gut, adresse: 'https://pod.example/a b' }, 'Leerzeichen'],
    [a.w, HERKUNFT, { ...gut, adresse: 'https://pod.example/' + 'a'.repeat(120) }, 'Link über 128 Zeichen'],
    [a.w, HERKUNFT, { ...gut, adresse: 'javascript:alert(1)' }, 'kein https'],
    [a.w, HERKUNFT, { ...gut, fassung: 2 }, 'andere Fassung'],
  ];
  for (const [quelle, herkunft, daten, was] of schlecht) {
    a.senden(quelle, herkunft, daten);
    assert.ok(await offen(p), was + ' wird verworfen');
  }
  a.senden(a.w, HERKUNFT, gut);
  assert.equal((await p).adresse, gut.adresse);
});

test('[Pod·Kern] nach der Frist verfällt der Auftrag; unbekannte Art und leerer Text gehen nicht hinaus', async () => {
  const { V } = ladeKern();
  const a = aufbau(V);
  const p = V.podAblegen('eigen', 'VIVODEPOT…', a.o);
  assert.equal(a.uhren.length, 1);
  assert.equal(a.uhren[0].ms, 10 * 60 * 1000);
  a.uhren[0].f();
  await assert.rejects(p, /pod-frist/);
  assert.equal(a.hoerer.size, 0);
  const b = aufbau(V);
  await assert.rejects(V.podAblegen('klartext', 'x', b.o), /pod-art/);
  await assert.rejects(V.podAblegen('link', '', b.o), /pod-leer/);
  assert.deepEqual(b.geoeffnet, [], 'ohne gültigen Auftrag öffnet sich kein Fenster');
  await assert.rejects(V.podAblegen('link', 'x', { ...b.o, oeffnen: () => null }), /pod-fenster/);
});

test('[Pod·Kern] die drei Aufrufer geben dieselben Bytes wie ihr Datei-Weg', () => {
  const { V } = ladeKern();
  const quelle = (f) => String(V[f]);
  const herausgeben = quelle('empfaengerDateiHerausgeben');
  assert.match(herausgeben, /podAblegenMitHinweis\('stelle', dateiMitMagic\(JSON\.stringify\(umschlag\)\)\)/);
  assert.match(herausgeben, /new Blob\(\[dateiMitMagic\(JSON\.stringify\(umschlag\)\)\]/, 'derselbe Ausdruck wie die Datei');
  assert.ok(herausgeben.indexOf('vereinbarungFreigabeHolen') < herausgeben.indexOf('podAblegenMitHinweis'), 'die Vereinbarung gilt auch für den Pod');
  const dialog = quelle('_shlDialogZeigen');
  assert.match(dialog, /podAblegenMitHinweis\('link', teile\.jwe\)/);
  assert.match(dialog, /new Blob\(\[teile\.jwe\]/);
  const sicherung = quelle('podSicherungAblegen');
  assert.match(sicherung, /depotSerialisieren\(\)/);
  assert.match(sicherung, /podAblegenMitHinweis\('eigen', dateiMitMagic\(JSON\.stringify\(dateiInhalt, null, 2\)\)\)/);
  assert.match(quelle('depotHerunterladen'), /dateiMitMagic\(JSON\.stringify\(dateiInhalt, null, 2\)\)/, 'derselbe Ausdruck wie die Sicherungskopie');
  assert.match(sicherung, /imSubKontext\(\)/, 'im Sub-Kontext nicht');
});

test('[Pod·Kern·Rot-Beweis] ohne Herkunftsprüfung nähme der Kern eine Antwort einer fremden Seite an', async () => {
  const roh = fs.readFileSync(HTML_PATH, 'utf8');
  const stelle = 'if (!e || e.source !== w || e.origin !== POD_BRUECKE_HERKUNFT) return;';
  assert.equal(roh.split(stelle).length, 2, 'die Prüfung steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pod-kern-rot-'));
  try {
    const kopie = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(kopie, roh.replace(stelle, 'if (!e) return;'));
    const { V } = ladeKern({ htmlPfad: kopie });
    const a = aufbau(V);
    const p = V.podAblegen('link', 'eyJ.x.y', a.o);
    a.senden(a.fremd, 'https://boese.example', { typ: 'vd-pod-bereit', fassung: 1 });
    assert.equal(a.gesendet.length, 1, 'ROT ohne Prüfung: eine fremde Seite löst das Senden aus');
    a.senden(a.fremd, 'https://boese.example', { typ: 'vd-pod-abgelegt', fassung: 1, id: a.gesendet[0].nachricht.id, adresse: 'https://boese.example/x' });
    assert.equal((await p).host, 'boese.example', 'ROT ohne Prüfung: die fremde Adresse wird übernommen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Pod·Kern·Vorschau] in der Vorschau und der Vorführung öffnet sich keine Brücke; mit Rot-Beweis', async () => {
  const { V } = ladeKern();
  V.setData({ _vorschau: true, _vorfuehrung: true });
  const a = aufbau(V);
  await assert.rejects(V.podAblegen('eigen', 'VIVODEPOT…', a.o), /pod-vorschau/);
  assert.deepEqual(a.geoeffnet, [], 'kein Fenster');
  V.setData({ _vorschau: true });
  await assert.rejects(V.podAblegen('link', 'eyJ.x.y', a.o), /pod-vorschau/);
  assert.deepEqual(a.geoeffnet, []);
  const roh = fs.readFileSync(HTML_PATH, 'utf8');
  const stelle = "  if (imVorschau()) return Promise.reject(new Error('pod-vorschau'));\n";
  assert.equal(roh.split(stelle).length, 2, 'das Tor steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pod-kern-vorschau-'));
  try {
    const kopie = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(kopie, roh.replace(stelle, ''));
    const { V: W } = ladeKern({ htmlPfad: kopie });
    W.setData({ _vorschau: true, _vorfuehrung: true });
    const b = aufbau(W);
    W.podAblegen('eigen', 'VIVODEPOT…', b.o).catch(() => {});
    assert.deepEqual(b.geoeffnet, ['vd-pod-bruecke'], 'ROT ohne Tor: aus der Vorführung öffnete sich die Brücke');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
