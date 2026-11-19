'use strict';
/* ════════════════════════════════════════════════════════════════════════
   qr-abholseite-quelle.test.js — die Abholseite für Anfragen und Vorlagen hat eine Quelle im Repo
   (Befund QR-ABHOLSEITE-ANFRAGE-FEHLT, HOCH, 16.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Das Studio verweist Stellen auf MARKEN_ADRESSEN.anfrageAblage (share.vivodepot.de/anfrage.html). Die Seite lieferte live 404
   und hatte im Repo keine Quelle. Gehalten wird:
   1. Jedes Ziel des Studios unter share.vivodepot.de hat eine Datei unter share/ (Rot-Beweis: Stand ohne share/anfrage.html).
   2. Die Seite ist so eng wie die Abhol-Seite, enger beim Netz: eigene CSP, connect-src 'none', ein eigenes Skript.
   3. `#anfrage=` (beide Formen) führt auf die App der Sprache mit demselben Inhalt; ungültiger Inhalt führt nirgends hin.
   4. `#vorlage=` wird im Browser entpackt, lesbar gezeigt und als Datei gespeichert; kaputter Inhalt gibt eine Meldung.
   5. Ohne Inhalt: eine Erklärung. DE und EN. Keine Fachwörter im sichtbaren Text. Fremde Werte nur als Text.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const WURZEL = path.join(__dirname, '..');
const lesen = (p) => fs.readFileSync(path.join(WURZEL, p), 'utf8');
const A = require('../share/anfrage.js');

function studioZiele(text) {
  const aus = new Set();
  for (const m of text.matchAll(/https:\/\/share\.vivodepot\.de(\/[^\s"'`<>)\\?#]*)?/g)) aus.add(m[1] || '/');
  return [...aus];
}

test('[Abholseite·Quelle] jedes Ziel des Studios unter share.vivodepot.de hat eine Datei unter share/', () => {
  const ziele = studioZiele(lesen('vivodepot-studio.html'));
  assert.ok(ziele.includes('/anfrage.html'), 'Vorbedingung: das Studio nennt die Abholseite für Anfragen');
  for (const z of ziele) {
    if (z === '/') continue; // die Ablage-Seite: Positivliste in tools/link-ziele-quelle-grundlinie.json
    assert.ok(fs.existsSync(path.join(WURZEL, 'share', z.slice(1))), 'Quelle fehlt: share' + z);
  }
});

test('[Abholseite·CSP] eigene CSP, kein Netz, genau ein eigenes Skript, nichts Inline', () => {
  const html = lesen('share/anfrage.html');
  const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(csp, 'keine CSP');
  const d = {};
  for (const teil of csp[1].split(';')) { const [n, ...w] = teil.trim().split(/\s+/); if (n) d[n] = w; }
  assert.deepEqual(d['default-src'], ["'none'"]);
  assert.deepEqual(d['script-src'], ["'self'"]);
  assert.deepEqual(d['connect-src'], ["'none'"], 'diese Seite macht keinen Netzaufruf');
  assert.deepEqual(d['form-action'], ["'none'"]);
  assert.ok(!/unsafe-/.test(csp[1]));
  const skripte = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.deepEqual(skripte.map(([, a]) => (a.match(/\ssrc="([^"]+)"/) || [])[1]), ['anfrage.js']);
  assert.ok(skripte.every(([, , r]) => r.trim() === ''), 'kein Inline-Skript');
  assert.ok(!/<(?:script|link)[^>]+(?:src|href)="https?:/.test(html), 'nichts Fremdes geladen');
  const js = lesen('share/anfrage.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval)\b/.test(js), 'kein Netz, keine HTML-Senke im Skript');
  assert.ok(!/\bhttps?:\/\/(?!privat-(?:de|en)\.vivodepot\.org\/)/.test(js), 'im Skript steht keine andere Adresse als die der App');
});

test('[Abholseite·Anfrage] beide Formen führen mit demselben Inhalt auf die App der Sprache', () => {
  const umschlag = Buffer.from(JSON.stringify({ anfrage: { vorgang: 'x' } })).toString('base64url');
  const kompakt = 'z1.' + zlib.deflateRawSync(Buffer.from('a.b.c~d')).toString('base64url');
  for (const w of [umschlag, kompakt]) {
    assert.equal(A.anfrageWertGueltig(w), true);
    assert.equal(A.anfrageZiel(w, 'de'), 'https://privat-de.vivodepot.org/#anfrage=' + w);
    assert.equal(A.anfrageZiel(w, 'en'), 'https://privat-en.vivodepot.org/#anfrage=' + w);
  }
  assert.deepEqual(A.fragmentLesen('#anfrage=' + kompakt), { art: 'anfrage', wert: kompakt });
  for (const schlecht of ['', 'a b', 'x"y', '<script>', 'z1.', 'a/b', 'a'.repeat(200001)]) assert.equal(A.anfrageWertGueltig(schlecht), false, JSON.stringify(schlecht.slice(0, 20)));
});

test('[Abholseite·Sprache] ?lang=en gewinnt, sonst folgt die Seite navigator.language', () => {
  assert.equal(A.sprache('?lang=en', 'de-DE'), 'en');
  assert.equal(A.sprache('', 'en-GB'), 'en');
  assert.equal(A.sprache('', 'de-DE'), 'de');
  assert.equal(A.sprache('?lang=de', 'en-US'), 'de');
  assert.equal(A.sprache('', 'fr'), 'de');
});

const VORLAGE = {
  nutzlastTyp: 'vivodepot-vorlage', formatFassung: 1, vorlageId: 'anmeldung-kita', version: 3,
  wortlautQuelle: { titel: 'Anmeldung <b>Kita</b>' },
  felder: [{ feldname: 'Vorname', feldtyp: 'text', pflicht: true }, { feldname: { de: 'Geburtsdatum', en: 'Date of birth' }, feldtyp: 'datum' }],
};
const packen = (o) => zlib.deflateRawSync(Buffer.from(JSON.stringify(o))).toString('base64url');

test('[Abholseite·Vorlage] gepackte Vorlage wird entpackt, Name und Felder lesbar, Dateiname aus dem Titel', async () => {
  const r = await A.vorlageLesen(packen(VORLAGE), 'de');
  assert.equal(r.art, 'vorlage');
  assert.equal(r.name, 'Anmeldung <b>Kita</b>');
  assert.equal(r.version, 3);
  assert.deepEqual(r.felder, [{ name: 'Vorname', pflicht: true }, { name: 'Geburtsdatum', pflicht: false }]);
  assert.deepEqual(JSON.parse(r.text), VORLAGE);
  assert.equal((await A.vorlageLesen(packen(VORLAGE), 'en')).felder[1].name, 'Date of birth');
  assert.equal(A.dateiname('Anmeldung Kita Müller'), 'vivodepot-vorlage-anmeldung-kita-mueller.json');
  assert.equal(A.dateiname('///'), 'vivodepot-vorlage-vorlage.json');
});

test('[Abholseite·Vorlage] nur die Kennung (ungepackt) und kaputter Inhalt', async () => {
  const k = await A.vorlageLesen(Buffer.from(JSON.stringify({ vorlageId: 'v1', version: 2 })).toString('base64url'), 'de');
  assert.deepEqual(k, { art: 'kennung', name: 'v1', version: 2 });
  for (const kaputt of ['', '!!!', 'AAAA', Buffer.from('kein json').toString('base64url'), packen([1, 2]), packen({ felder: 'nein' }), 'a'.repeat(300000)]) {
    const r = await A.vorlageLesen(kaputt, 'de');
    assert.equal(r.fehler, 'inhalt', JSON.stringify(kaputt.slice(0, 20)));
  }
});

/* ── die Seite selbst, in einer kleinen Nachbildung des Dokuments ── */
function nachbau() {
  const html = lesen('share/anfrage.html');
  const elemente = {};
  const mk = (id) => {
    const e = {
      id, hidden: false, textContent: '', children: [], attrs: {}, ereignisse: {},
      get firstChild() { return this.children[0] || null; }, removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
      appendChild(c) { this.children.push(c); return c; },
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
      addEventListener(n, f) { this.ereignisse[n] = f; }, click() { if (this.onclick) this.onclick(); },
    };
    return e;
  };
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) elemente[m[1]] = mk(m[1]);
  const dataT = [];
  for (const m of html.matchAll(/<[a-z0-9]+\b[^>]*\bdata-t="([^"]+)"[^>]*>/g)) {
    const id = (m[0].match(/\sid="([^"]+)"/) || [])[1];
    const el = id ? elemente[id] : mk(null);
    el.attrs['data-t'] = m[1];
    dataT.push(el);
  }
  const angehaengt = [];
  const doc = {
    documentElement: { lang: 'de' },
    getElementById: (id) => elemente[id],
    querySelectorAll: () => dataT,
    createElement: () => mk(null),
    body: { appendChild: (c) => { angehaengt.push(c); }, removeChild() {} },
    defaultView: { Blob: class { constructor(teile, opt) { this.teile = teile; this.type = opt.type; } } },
  };
  return { doc, elemente, angehaengt, dataT };
}
const sichtbar = (el) => Object.entries(el).filter(([, v]) => v && v.hidden === false).map(([k]) => k);

test('[Abholseite·Seite] #anfrage leitet weiter und lässt den Link stehen; ein kaputter Inhalt leitet nicht', async () => {
  const wert = Buffer.from('{"a":1}').toString('base64url');
  const n = nachbau();
  const ziele = [];
  await A.seiteStarten(n.doc, { search: '', hash: '#anfrage=' + wert, replace: (z) => ziele.push(z) }, { language: 'en-US' }, null);
  assert.deepEqual(ziele, ['https://privat-en.vivodepot.org/#anfrage=' + wert]);
  assert.equal(n.elemente['anfrage-weiter'].attrs.href, 'https://privat-en.vivodepot.org/#anfrage=' + wert);
  assert.equal(n.elemente.anfrage.hidden, false);
  assert.equal(n.elemente.leer.hidden, true);
  const m = nachbau();
  const z2 = [];
  await A.seiteStarten(m.doc, { search: '', hash: '#anfrage=<x>', replace: (z) => z2.push(z) }, { language: 'de' }, null);
  assert.deepEqual(z2, []);
  assert.equal(m.elemente.fehler.hidden, false);
  assert.match(m.elemente['fehler-text'].textContent, /nicht lesbar/);
});

test('[Abholseite·Seite] #vorlage zeigt Name und Felder als Text und speichert die Datei; ohne Fragment steht die Erklärung', async () => {
  const n = nachbau();
  let href = null; const widerrufen = [];
  const urlApi = { createObjectURL: (b) => { href = b; return 'blob:x'; }, revokeObjectURL: (u) => widerrufen.push(u) };
  await A.seiteStarten(n.doc, { search: '', hash: '#vorlage=' + packen(VORLAGE), replace() { throw new Error('keine Weiterleitung'); } }, { language: 'de' }, urlApi);
  assert.equal(n.elemente.vorlage.hidden, false);
  assert.equal(n.elemente['vorlage-name'].textContent, 'Anmeldung <b>Kita</b>');
  assert.deepEqual(n.elemente['vorlage-felder'].children.map((c) => c.textContent), ['Vorname (Pflichtangabe)', 'Geburtsdatum']);
  n.elemente['vorlage-speichern'].ereignisse.click();
  assert.equal(href.type, 'application/json');
  assert.deepEqual(JSON.parse(href.teile[0]), VORLAGE);
  assert.equal(n.angehaengt[0].attrs.download, 'vivodepot-vorlage-anmeldung-b-kita-b.json');
  // Sprachwechsel malt neu
  n.elemente['sprache-en'].ereignisse.click();
  assert.equal(n.elemente.titel.textContent, 'Open a template');
  const l = nachbau();
  await A.seiteStarten(l.doc, { search: '', hash: '', replace() {} }, { language: 'de' }, null);
  assert.equal(l.elemente.leer.hidden, false);
  assert.equal(l.elemente.vorlage.hidden, true);
});

test('[Abholseite·Seite] ohne DecompressionStream: klare Meldung, kein Absturz', async () => {
  const gemerkt = globalThis.DecompressionStream;
  globalThis.DecompressionStream = undefined;
  try {
    const n = nachbau();
    await A.seiteStarten(n.doc, { search: '', hash: '#vorlage=' + packen(VORLAGE), replace() {} }, { language: 'de' }, null);
    assert.equal(n.elemente.fehler.hidden, false);
    assert.match(n.elemente['fehler-text'].textContent, /aktuellen Browser/);
  } finally { globalThis.DecompressionStream = gemerkt; }
});

test('[Abholseite·Texte] DE und EN vollständig, keine Fachwörter im sichtbaren Text', () => {
  assert.deepEqual(Object.keys(A.TEXTE.de).sort(), Object.keys(A.TEXTE.en).sort());
  const html = lesen('share/anfrage.html');
  for (const m of html.matchAll(/data-t="([^"]+)"/g)) assert.ok(A.TEXTE.de[m[1]] != null, 'Schlüssel ohne Text: ' + m[1]);
  const sichtbarerText = JSON.stringify(A.TEXTE) + html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
  for (const wort of [/\bJWS\b/, /\bPod\b/i, /\bManifest\b/i, /\bJSON\b/, /\bDeflate\b/i, /\bbase64/i]) assert.ok(!wort.test(sichtbarerText), 'Fachwort: ' + wort);
});
