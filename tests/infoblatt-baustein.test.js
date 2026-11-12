'use strict';
/* Bedienmuster 26 „Hilfe“ (Musterseite der Gestaltungsleitung, 31.10.2026): ⓘ hinter der Beschriftung öffnet ein kurzes Blatt mit Titel und Text.
   Der Baustein ist infoBeschriftungHTML (Aufbau) und infoblattVerdrahten bzw. infoblaetterVerdrahten (Verhalten). Es gilt:
   · der Knopf trägt aria-expanded, aria-controls und seinen Namen über aria-label („Erklärung zu …“); er ist ein <button> (Enter, Leertaste);
   · das Blatt ist zu verborgen, trägt den Titel, den Text (Kennung `<id>-text` für aria-describedby) und „Verstanden“;
   · ⓘ öffnet und schließt, „Verstanden“ schließt und gibt den Fokus an das ⓘ zurück, Escape im Blatt ebenso (ohne den Dialog zu schließen);
   · ein Knopf wird nur einmal verdrahtet;
   · die erste Nutzung ist die Erklärung der elterlichen Sorge in der Liste Kinder und Schutzbefohlene: sie steht hinter dem ⓘ, nicht mehr als
     Absatz unter dem Feld; die Eingabe nennt den Text weiter über aria-describedby.
   Rot-Beweis: ein Kern ohne Escape-Behandlung und ein Kern ohne Rückgabe des Fokus fallen durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const ZUSATZ = { zusatzBindungen: ['infoBeschriftungHTML', 'infoblattVerdrahten', 'infoblaetterVerdrahten', 'INFO_HINWEIS_UNTERFELDER'] };

function knoten(attrs) {
  const a = Object.assign({}, attrs), h = {};
  return {
    hidden: false, id: a.id, attrs: a, fokus: 0, stopp: 0,
    getAttribute: (k) => (k in a ? a[k] : null), setAttribute(k, v) { a[k] = String(v); },
    addEventListener: (ev, fn) => { (h[ev] = h[ev] || []).push(fn); },
    focus() { this.fokus++; }, anzahl: (ev) => (h[ev] || []).length,
    ausloesen(ev, e) { (h[ev] || []).forEach((fn) => fn(e || {})); },
  };
}
/* Rein: Funde zum Verhalten; läuft gegen die Verdrahtung des geladenen Kerns. */
function verhaltensFunde(V, document) {
  const aus = [];
  const knopf = knoten({ id: 'i-knopf', 'aria-expanded': 'false', 'aria-controls': 'i-blatt' });
  const blatt = knoten({ id: 'i-blatt' }); blatt.hidden = true;
  const ok = knoten({ id: 'i-verstanden' });
  const reg = { 'i-knopf': knopf, 'i-blatt': blatt, 'i-verstanden': ok };
  const vorher = document.getElementById;
  document.getElementById = (id) => reg[id] || null;
  try {
    V.__zusatz.infoblaetterVerdrahten({ querySelectorAll: () => [knopf] });
    V.__zusatz.infoblattVerdrahten('i-knopf', 'i-blatt', 'i-verstanden');   // zweimal: kein zweiter Hörer
    if (knopf.anzahl('click') !== 1) aus.push('der Knopf trägt ' + knopf.anzahl('click') + ' Klick-Hörer');
    knopf.ausloesen('click');
    if (blatt.hidden !== false || knopf.attrs['aria-expanded'] !== 'true') aus.push('ⓘ öffnet das Blatt nicht');
    if (ok.fokus !== 1) aus.push('beim Öffnen geht der Fokus nicht in das Blatt');
    ok.ausloesen('click');
    if (blatt.hidden !== true || knopf.attrs['aria-expanded'] !== 'false') aus.push('„Verstanden“ schließt nicht');
    if (knopf.fokus !== 1) aus.push('„Verstanden“ gibt den Fokus nicht an das ⓘ zurück');
    knopf.ausloesen('click'); knopf.ausloesen('click');
    if (blatt.hidden !== true) aus.push('ein zweiter Klick auf ⓘ schließt nicht');
    knopf.ausloesen('click');
    let gestoppt = 0;
    blatt.ausloesen('keydown', { key: 'Escape', stopPropagation() { gestoppt++; } });
    if (blatt.hidden !== true || knopf.attrs['aria-expanded'] !== 'false') aus.push('Escape schließt nicht');
    if (gestoppt !== 1) aus.push('Escape wird nicht festgehalten (der Dialog darunter würde mitschließen)');
    if (knopf.fokus < 2) aus.push('Escape gibt den Fokus nicht an das ⓘ zurück');
    knopf.ausloesen('click');
    blatt.ausloesen('keydown', { key: 'a', stopPropagation() { gestoppt++; } });
    if (blatt.hidden !== false) aus.push('eine andere Taste schließt das Blatt');
  } finally { document.getElementById = vorher; }
  return aus;
}

test('[Infoblatt] der Baustein baut ⓘ-Knopf mit aria-expanded, aria-controls und Namen, dazu ein verborgenes Blatt mit Titel, Text und „Verstanden“', () => {
  const { V } = ladeKern(ZUSATZ);
  const h = V.__zusatz.infoBeschriftungHTML('i1', '<label>Code</label>', 'Wiederherstellungscode <b>', 'Damit kommen Sie "ins" Depot.');
  assert.match(h, /^<div class="feld-mit-info"><label>Code<\/label><button type="button" class="info-knopf" id="i1-knopf" aria-expanded="false" aria-controls="i1-blatt" aria-label="Erklärung zu „Wiederherstellungscode &lt;b&gt;“"><\/button><\/div>/);
  assert.match(h, /<div class="infoblatt" id="i1-blatt" hidden><p class="infoblatt-titel">Wiederherstellungscode &lt;b&gt;<\/p><p id="i1-text">Damit kommen Sie &quot;ins&quot; Depot\.<\/p><button type="button" class="btn btn-sek" id="i1-verstanden">Verstanden<\/button><\/div>$/);
});

test('[Infoblatt] ⓘ öffnet und schließt, „Verstanden“ und Escape schließen und geben den Fokus zurück, ein Knopf wird nur einmal verdrahtet', () => {
  const { V, document } = ladeKern(ZUSATZ);
  assert.deepEqual(verhaltensFunde(V, document), []);
});

test('[Infoblatt·Nutzung] die Erklärung der elterlichen Sorge steht hinter dem ⓘ, nicht als Absatz; die Eingabe nennt den Text weiter über aria-describedby', () => {
  const { V } = ladeKern(ZUSATZ);
  assert.deepEqual([...V.__zusatz.INFO_HINWEIS_UNTERFELDER], ['legalRepresentationParental'], 'genau eine Stelle');
  const feld = V.SEKTOR_BY_ID['people'].sektionen.flatMap((s) => s.felder || []).find((f) => f.id === 'childrenAndDependants');
  const hinweis = V.STRINGS['people.childrenAndDependants/legalRepresentationParental.hint'] || feld.unterFelder.find((u) => u.id === 'legalRepresentationParental').hint;
  assert.ok(hinweis && /Vollmacht/.test(hinweis), 'Vorbedingung: der Hinweis ist gefunden');
  const html = V.listenEintragInputsHTML(feld, {});
  assert.equal((html.match(/class="info-knopf"/g) || []).length, 1, 'ein ⓘ in der ganzen Liste');
  assert.equal(html.split(hinweis.replace(/&/g, '&amp;')).length - 1, 1, 'der Text steht einmal da, im Blatt');
  assert.ok(!/<div class="feld-hint"[^>]*>Die elterliche Sorge/.test(html), 'nicht mehr als Absatz unter dem Feld');
  const id = /id="(info-\d+)-knopf"/.exec(html)[1];
  assert.match(html, new RegExp('<select[^>]*aria-describedby="' + id + '-text"[^>]*data-edit="legalRepresentationParental"|<select[^>]*data-edit="legalRepresentationParental"[^>]*aria-describedby="' + id + '-text"'));
  assert.ok(html.includes('id="' + id + '-text"'), 'und der Text mit dieser Kennung ist da');
  // Die übrigen Hinweise der Liste bleiben Absätze unter dem Feld.
  // Seit „Vormundschaft und Notvertretung“ beginnt der Hinweis zur Grundlage der Vertretung mit „Für Kinder: …“.
  assert.ok(/<div class="feld-hint"[^>]*>Für Kinder: die elterliche Sorge oder ein Vormund/.test(html));
});

test('[Infoblatt·Nutzung] jeder Dialog und jede Sicht verdrahtet die ⓘ ihres Inhalts', () => {
  const a = KERN.indexOf('const schliessen = () => {', KERN.indexOf('modal({ titel, titelHTML, koerperHTML'));
  const modal = KERN.slice(KERN.indexOf('modal({ titel, titelHTML, koerperHTML'), a);
  assert.match(modal, /infoblaetterVerdrahten\(box\)/, 'ui.modal verdrahtet die ⓘ im Dialog');
  assert.match(KERN, /_kartenKoepfeVerdrahten\(c\);[\s\S]{0,400}infoblaetterVerdrahten\(c\);/, 'die Bereichssicht verdrahtet die ⓘ ihres Inhalts');
});

test('[Infoblatt·Stil] das ⓘ ist gezeichnet, 44 px Trefferfläche, mit Nachtzeile; das Blatt trägt keinen :focus-Selektor', () => {
  const css = fs.readFileSync(path.join(REPO, 'tools/erscheinung/stil/grundlage.css'), 'utf8');
  const knopf = /\.info-knopf \{([^}]*)\}/.exec(css)[1];
  assert.match(knopf, /width: 44px; height: 44px/);
  assert.match(css, /\.info-knopf::before \{[^}]*border-radius: 50%;/);
  assert.match(css, /html\.dark-mode \.info-knopf \{ color: var\(--salbei-nacht\); \}/);
  assert.ok(!/\.info(blatt|-knopf)[^{]*:focus/.test(css));
});

for (const [name, anker, ersatz, erwartet] of [
  ['Escape schließt nicht', "blatt.addEventListener('keydown', (e) => { if (e.key === 'Escape') {", "blatt.addEventListener('keydown', (e) => { if (false) {", /Escape schließt nicht/],
  ['„Verstanden“ gibt den Fokus nicht zurück', "if (ok) ok.addEventListener('click', () => { setze(false); knopf.focus(); });", "if (ok) ok.addEventListener('click', () => { setze(false); });", /gibt den Fokus nicht an das ⓘ zurück/],
]) {
  test('[Infoblatt·Rot-Beweis] ein Kern, in dem ' + name + ', fällt durch', () => {
    assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker');
    const tmp = path.join(os.tmpdir(), 'infoblatt-rot-' + process.pid + '-' + name.length + '.html');
    fs.writeFileSync(tmp, KERN.replace(anker, ersatz));
    try {
      const { V, document } = ladeKern(Object.assign({ htmlPfad: tmp, backen: true }, ZUSATZ));
      const funde = verhaltensFunde(V, document);
      assert.ok(funde.some((f) => erwartet.test(f)), funde.join(' | '));
    } finally { fs.unlinkSync(tmp); }
  });
}
