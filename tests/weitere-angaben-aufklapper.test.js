'use strict';
/* Bedienmuster 12 „Weitere Angaben ›“ (Musterseite der Gestaltungsleitung, 31.10.2026): ein Aufklapper im Fluss, kein Dialog.
   Der Baustein ist weitereAngabenHTML (Aufbau) und weitereAngabenVerdrahten (Klick); die erste Nutzung ist „Alle Angaben“ im ersten Eintrag
   einer leeren Liste mit mehr als sechs Unterfeldern (Kinder und Schutzbefohlene, Vorsorge-Instrumente u. a.).
   Es gilt am gebauten Markup und an der Verdrahtung:
   · der Kopf ist ein <button type="button"> mit aria-expanded und aria-controls, tastaturbedienbar (Enter, Leertaste sind der Klick des Knopfes);
   · die Felder stehen im Fluss darunter, im selben Behälter und im selben Eintrag; es gibt keinen Dialog und keinen zweiten Weg;
   · jedes Unterfeld steht genau einmal da: die vorderen im Kopf des Eintrags, alle übrigen im Aufklapper, kein Feld in beiden;
   · ohne gewählte Art zeigt der offene Aufklapper ALLE Unterfelder (Nachtrag U2-ADR-109).
   · liegt ein Pflicht-Unterfeld im GESCHLOSSENEN Aufklapper und schlägt die Prüfung beim Speichern an, geht der Aufklapper auf und das Feld
     bekommt den Fokus (weitereAngabenFeldZeigen, gerufen von _listeInlineUebernehmen mit dem Feld aus _listenEintragPruefen).
   Rot-Beweis: derselbe Prüfer meldet die frühere Fassung (Dialog, Feld in Kopf und Aufklapper doppelt), und ein Kern, in dem der Aufklapper
   wieder alle Felder zeigt, fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const ZUSATZ = { zusatzBindungen: ['_listeInlineHTML', 'WEITERE_ANGABEN_OFFEN', 'weitereAngabenHTML', 'weitereAngabenVerdrahten', 'weitereAngabenFeldZeigen'] };

const kinderFeld = (V) => V.SEKTOR_BY_ID['people'].sektionen.flatMap((s) => s.felder || []).find((f) => f.id === 'childrenAndDependants');
function langeListen(V) {
  const aus = [];
  for (const s of Object.values(V.SEKTOR_BY_ID)) for (const sek of s.sektionen || []) for (const f of sek.felder || []) {
    if (f.typ === 'liste' && Array.isArray(f.unterFelder) && f.unterFelder.length > 6) aus.push({ sektor: s.id, feld: f });
  }
  return aus;
}
/* Rein: Funde an dem HTML, das ein Listenfeld mit Aufklapper liefert. `feld` ist die Felddefinition. */
function aufklapperFunde(html, feld) {
  const aus = [];
  const ids = feld.unterFelder.map((u) => u.id);
  const zeilen = [...html.matchAll(/data-sub-zeile="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    const n = zeilen.filter((z) => z === id).length;
    if (n !== 1) aus.push(id + ' steht ' + n + '-mal da, nicht genau einmal');
  }
  const kopf = /<button type="button" class="weitere-angaben-kopf"[^>]*>/.exec(html);
  if (!kopf) { aus.push('kein Aufklapper-Kopf als Knopf'); return aus; }
  if (!/aria-expanded="(true|false)"/.test(kopf[0]) || !/aria-controls="[^"]+"/.test(kopf[0])) aus.push('der Kopf trägt aria-expanded oder aria-controls nicht');
  if (/aria-haspopup/.test(html) || /data-eintrag-alle-angaben/.test(html)) aus.push('der Kopf öffnet noch einen Dialog');
  const ziel = /aria-controls="([^"]+)"/.exec(kopf[0]);
  if (ziel && html.split('id="' + ziel[1] + '"').length !== 2) aus.push('aria-controls zeigt auf kein einmaliges Ziel');
  // Kein Feld im Kopf des Eintrags UND im Aufklapper.
  const i = html.indexOf('<div class="weitere-angaben"');
  const imKopf = new Set([...html.slice(0, i).matchAll(/data-sub-zeile="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.slice(i).matchAll(/data-sub-zeile="([^"]+)"/g)) if (imKopf.has(m[1])) aus.push(m[1] + ' steht im Kopf und im Aufklapper');
  return aus;
}

/* Kleine Knoten für die Verdrahtung: das Gerüst des Knoten-Stubs schaltet keine Klicks um. */
function knoten(attrs) {
  const a = Object.assign({}, attrs), h = {};
  return {
    hidden: false, id: a.id, attrs: a,
    getAttribute: (k) => (k in a ? a[k] : null), setAttribute(k, v) { a[k] = String(v); },
    addEventListener: (ev, fn) => { (h[ev] = h[ev] || []).push(fn); },
    klick() { (h.click || []).forEach((fn) => fn({})); }, anzahl: (ev) => (h[ev] || []).length,
  };
}
function verdrahtungsFunde(V, document) {
  const aus = [];
  const kopf = knoten({ id: 'k-kopf', 'aria-expanded': 'false', 'aria-controls': 'k-inhalt', 'data-weitere-angaben-kopf': 'k' });
  const inhalt = knoten({ id: 'k-inhalt' }); inhalt.hidden = true;
  const wurzel = { querySelectorAll: () => [kopf] };
  const vorher = document.getElementById;
  document.getElementById = (id) => (id === 'k-inhalt' ? inhalt : null);
  const wechsel = [];
  try {
    V.__zusatz.weitereAngabenVerdrahten(wurzel, (offen) => wechsel.push(offen));
    V.__zusatz.weitereAngabenVerdrahten(wurzel);   // ein zweiter Aufruf darf keinen zweiten Hörer anhängen
    if (kopf.anzahl('click') !== 1) aus.push('der Kopf trägt ' + kopf.anzahl('click') + ' Klick-Hörer');
    kopf.klick();
    if (kopf.attrs['aria-expanded'] !== 'true' || inhalt.hidden !== false) aus.push('der Klick öffnet nicht (aria-expanded/hidden)');
    kopf.klick();
    if (kopf.attrs['aria-expanded'] !== 'false' || inhalt.hidden !== true) aus.push('der zweite Klick schließt nicht');
    if (wechsel.join() !== 'true,false') aus.push('beiWechsel meldet ' + wechsel.join());
  } finally { document.getElementById = vorher; }
  return aus;
}

test('[Weitere Angaben] der Baustein baut einen Kopf-Knopf mit aria-expanded und aria-controls und einen Inhalt im Fluss, zu und offen', () => {
  const { V } = ladeKern(ZUSATZ);
  const zu = V.__zusatz.weitereAngabenHTML('w1', 'Weitere <Angaben> "x"', '<p>innen</p>', false);
  assert.match(zu, /^<div class="weitere-angaben" data-weitere-angaben="w1"><button type="button" class="weitere-angaben-kopf" id="w1-kopf" aria-expanded="false" aria-controls="w1-inhalt" data-weitere-angaben-kopf="w1">Weitere &lt;Angaben&gt; &quot;x&quot;<\/button><div class="weitere-angaben-inhalt" id="w1-inhalt" hidden><p>innen<\/p><\/div><\/div>$/);
  const auf = V.__zusatz.weitereAngabenHTML('w1', 'Weitere Angaben', '<p>innen</p>', true);
  assert.match(auf, /aria-expanded="true"/);
  assert.ok(!/id="w1-inhalt" hidden/.test(auf), 'offen: der Inhalt ist nicht verborgen');
  assert.ok(!/<button[^>]*tabindex="-1"/.test(auf), 'der Knopf bleibt in der Tab-Reihenfolge (Enter und Leertaste lösen den Klick aus)');
});

test('[Weitere Angaben] die Verdrahtung klappt auf und zu, setzt aria-expanded und hidden und meldet den Wechsel; ein Kopf wird nur einmal verdrahtet', () => {
  const { V, document } = ladeKern(ZUSATZ);
  assert.deepEqual(verdrahtungsFunde(V, document), []);
});

test('[Weitere Angaben] kein Dialog: weder der Kopf noch seine Verdrahtung öffnen einen, und der alte Weg ist aus dem Kern', () => {
  assert.ok(!/data-eintrag-alle-angaben/.test(KERN), 'das Attribut des Dialog-Knopfes kommt nirgends mehr vor');
  assert.ok(!/_listeInlineImDialog|box\._imDialog/.test(KERN), 'die Dialog-Markierung des Eintrags ist entfernt');
  const a = KERN.indexOf('function weitereAngabenVerdrahten(');
  const rumpf = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.ok(!/ui\.modal|flowListenEintrag/.test(rumpf), 'die Verdrahtung öffnet keinen Dialog');
  const b = KERN.indexOf('function _listeInlineHTML(');
  assert.ok(!/aria-haspopup/.test(KERN.slice(b, KERN.indexOf('\n}\n', b))), 'der Kopf kündigt keinen Dialog an');
});

test('[Weitere Angaben] „Alle Angaben“ der Liste Kinder und Schutzbefohlene: Kopf-Knopf, jedes Unterfeld genau einmal, keins in Kopf und Aufklapper', () => {
  const { V } = ladeKern();
  const feld = kinderFeld(V);
  const html = V.feldZeileHTML(feld, [], 'people', true);
  assert.deepEqual(aufklapperFunde(html, feld), []);
  assert.match(html, /Alle Angaben<\/button>/);
});

test('[Weitere Angaben·Klasse] in jeder Liste mit mehr als sechs Unterfeldern steht jedes Unterfeld genau einmal da', () => {
  const { V } = ladeKern(ZUSATZ);
  const listen = langeListen(V);
  assert.ok(listen.length >= 5, 'Vorbedingung: die langen Listen sind gefunden (' + listen.length + ')');
  for (const { sektor, feld } of listen) {
    assert.deepEqual(aufklapperFunde(V.__zusatz._listeInlineHTML(feld), feld), [], sektor + '.' + feld.id);
  }
});

test('[Weitere Angaben] ohne gewählte Art zeigt der offene Aufklapper ALLE Unterfelder, zu zeigt er nur die Wahl', () => {
  const { V } = ladeKern(ZUSATZ);
  const feld = kinderFeld(V);
  const sichtbar = (h) => [...h.matchAll(/data-sub-zeile="([^"]+)"( hidden)?/g)].filter((m) => !m[2]).map((m) => m[1]);
  assert.deepEqual(sichtbar(V.__zusatz._listeInlineHTML(feld)), ['type'], 'zu: nur die Wahl');
  V.__zusatz.WEITERE_ANGABEN_OFFEN.add('weitere-childrenAndDependants');
  const offen = V.__zusatz._listeInlineHTML(feld);
  assert.match(offen, /aria-expanded="true"/);
  assert.ok(!/id="weitere-childrenAndDependants-inhalt" hidden/.test(offen));
  assert.deepEqual(sichtbar(offen).sort(), feld.unterFelder.map((u) => u.id).sort(), 'offen, ohne Art: jedes Unterfeld');
  V.__zusatz.WEITERE_ANGABEN_OFFEN.delete('weitere-childrenAndDependants');
});

test('[Weitere Angaben·Rot-Beweis] die frühere Fassung (Dialog-Knopf, Feld in Kopf und Aufklapper) fällt durch', () => {
  const { V } = ladeKern();
  const feld = kinderFeld(V);
  // Früher: ein Knopf, der einen Dialog ankündigt, und kein Aufklapper-Inhalt.
  const dialog = V.feldZeileHTML(feld, [], 'people', true).replace(/<div class="weitere-angaben"[\s\S]*?<\/div><\/div><\/div>(?=<\/div>)/,
    '<button type="button" class="liste-alle-angaben" aria-expanded="false" aria-haspopup="dialog" data-eintrag-alle-angaben="childrenAndDependants">Alle Angaben</button>');
  const f1 = aufklapperFunde(dialog, feld);
  assert.ok(f1.some((f) => /kein Aufklapper-Kopf|steht 0-mal da/.test(f)), f1.join(' | '));
  // Doppelt: der Aufklapper zeigt wieder alle Felder, auch die im Kopf.
  const { V: V2 } = ladeKern();
  const doppelt = V2.feldZeileHTML(feld, [], 'people', true);
  const kopfZeile = /<div class="feld-zeile feld-zeile-sub" data-sub-zeile="type">[\s\S]*?<\/div><\/div><\/div>/.exec(doppelt)[0];
  const mitDoppel = doppelt.replace('<div class="weitere-angaben-inhalt" id="weitere-childrenAndDependants-inhalt" hidden>', (m) => m + kopfZeile);
  assert.notEqual(mitDoppel, doppelt);
  const f2 = aufklapperFunde(mitDoppel, feld);
  assert.ok(f2.some((f) => /steht 2-mal da|steht im Kopf und im Aufklapper/.test(f)), f2.join(' | '));
});

test('[Weitere Angaben·Rot-Beweis] ein Kern, dessen Aufklapper wieder alle Felder zeigt, fällt durch', () => {
  const anker = ', ab: teil.unterFelder.length })';
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'weitere-angaben-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, ' })'));
  try {
    const { V } = ladeKern({ htmlPfad: tmp, backen: true });
    const feld = kinderFeld(V);
    const funde = aufklapperFunde(V.feldZeileHTML(feld, [], 'people', true), feld);
    assert.ok(funde.some((f) => /steht 2-mal da/.test(f)) && funde.some((f) => /steht im Kopf und im Aufklapper/.test(f)), funde.join(' | '));
  } finally { fs.unlinkSync(tmp); }
});

test('[Weitere Angaben·Rot-Beweis] eine Verdrahtung, die nicht umschaltet, fällt durch', () => {
  const anker = "kopf.setAttribute('aria-expanded', offen ? 'true' : 'false');\n      inhalt.hidden = !offen;";
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'weitere-angaben-rot2-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, ''));
  try {
    const { V, document } = ladeKern(Object.assign({ htmlPfad: tmp, backen: true }, ZUSATZ));
    const funde = verdrahtungsFunde(V, document);
    assert.ok(funde.some((f) => /öffnet nicht/.test(f)), funde.join(' | '));
  } finally { fs.unlinkSync(tmp); }
});

test('[Weitere Angaben·Stil] der Pfeil › ist ein gedrehter Winkel aus zwei Rändern und dreht beim Öffnen nach unten; die Nachtzeile steht', () => {
  const css = fs.readFileSync(path.join(REPO, 'tools/erscheinung/stil/grundlage.css'), 'utf8');
  assert.match(css, /\.weitere-angaben-kopf::before \{[^}]*border-top: 2px solid currentColor;[^}]*border-right: 2px solid currentColor; transform: rotate\(45deg\);/);
  assert.match(css, /\.weitere-angaben-kopf\[aria-expanded="true"\]::before \{ transform: rotate\(135deg\); \}/);
  assert.match(css, /html\.dark-mode \.weitere-angaben-kopf \{ color: var\(--salbei-nacht\); \}/);
  assert.ok(!/\.weitere-angaben[^{]*:focus/.test(css), 'kein :focus-Selektor im Stil');
  assert.ok(!/\.weitere-angaben[^{]*\{[^}]*text-decoration:\s*underline/.test(css), 'nie unterstrichen');
});

/* Pflichtfeld im geschlossenen Aufklapper: Knoten-Stubs für Kopf, Inhalt, Zeile und Eingabe. */
function pflichtFunde(V, document) {
  const aus = [];
  const kopf = knoten({ id: 'p-kopf', 'aria-expanded': 'false', 'aria-controls': 'p-inhalt', 'data-weitere-angaben-kopf': 'weitere-p' });
  const inhalt = knoten({ id: 'p-inhalt' }); inhalt.hidden = true;
  let fokus = 0;
  const eingabe = { focus() { fokus++; } };
  const aufklapper = { querySelector: () => kopf };
  const zeile = knoten({ 'data-sub-zeile': 'pflichtfeld' });
  zeile.closest = (sel) => (sel === '.weitere-angaben' ? aufklapper : null);
  zeile.querySelector = () => eingabe;
  const wurzel = { querySelectorAll: () => [zeile] };
  const vorher = document.getElementById;
  document.getElementById = (id) => (id === 'p-inhalt' ? inhalt : null);
  try {
    const ziel = V.__zusatz.weitereAngabenFeldZeigen(wurzel, 'pflichtfeld');
    if (kopf.attrs['aria-expanded'] !== 'true' || inhalt.hidden !== false) aus.push('der Aufklapper geht nicht auf');
    if (fokus !== 1 || ziel !== eingabe) aus.push('das Feld bekommt den Fokus nicht');
    if (!V.__zusatz.WEITERE_ANGABEN_OFFEN.has('weitere-p')) aus.push('der offene Zustand wird nicht gemerkt');
    V.__zusatz.WEITERE_ANGABEN_OFFEN.delete('weitere-p');
    if (V.__zusatz.weitereAngabenFeldZeigen(wurzel, 'anderes') !== null) aus.push('ein unbekanntes Feld liefert nicht null');
  } finally { document.getElementById = vorher; }
  return aus;
}

test('[Weitere Angaben·Pflicht] ein Pflicht-Unterfeld im geschlossenen Aufklapper: der Aufklapper geht auf, das Feld bekommt den Fokus', () => {
  const { V, document } = ladeKern(ZUSATZ);
  assert.deepEqual(pflichtFunde(V, document), []);
});

test('[Weitere Angaben·Pflicht] die Prüfung nennt das Feld, und der Speicherweg der Inline-Liste ruft den Aufklapper-Öffner damit', () => {
  const a = KERN.indexOf('function _listenEintragPruefen(');
  assert.match(KERN.slice(a, KERN.indexOf('\n}\n', a)), /return \{ ok: false, grund: r\.grund, feldId: uf\.id \};/, 'die Prüfung liefert die Kennung des Unterfelds');
  const b = KERN.indexOf('function _listeInlineUebernehmen(');
  assert.match(KERN.slice(b, KERN.indexOf('\n}\n', b)), /_listenEintragFehlerToast\(pruef\.grund\); weitereAngabenFeldZeigen\(behaelter, pruef\.feldId\); return false;/);
});

test('[Weitere Angaben·Pflicht·Rot-Beweis] ein Kern, der den Aufklapper nicht öffnet, fällt durch', () => {
  const anker = "      kopf.setAttribute('aria-expanded', 'true');\n      inhalt.hidden = false;\n      WEITERE_ANGABEN_OFFEN.add(kopf.getAttribute('data-weitere-angaben-kopf'));\n";
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'weitere-angaben-rot3-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, ''));
  try {
    const { V, document } = ladeKern(Object.assign({ htmlPfad: tmp, backen: true }, ZUSATZ));
    const funde = pflichtFunde(V, document);
    assert.ok(funde.some((f) => /Aufklapper geht nicht auf/.test(f)), funde.join(' | '));
  } finally { fs.unlinkSync(tmp); }
});
