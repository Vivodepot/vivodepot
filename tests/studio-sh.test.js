'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════
   Studio · Wagen S-H (10.11.2026): fertige Anfrage als drei Karten (S2), Grundlage mit Chips und unbelegtes Land (S4)
   ─────────────────────────────────────────────────────────────────────────────────────────────
   (S2) Brief, Passwort und Link stehen als gleich gebaute Karten da, je mit „Kopieren“ (Zwischenablage, Bestätigung am Knopf) und
        „Speichern“ (blobDownload); der Link nur mit Kopieren, gekürzt angezeigt, der volle Link bleibt im Kopieren, im title und im
        Aufklapper. „Neue Anfrage“ ersetzt „Anfrage erstellen“ und setzt den Weg auf Schritt 1. Das Passwort steht nie im gehaltenen Stand.
   (S4) Schritt 3 bietet die üblichen Grundlagen als Chips; das Land bleibt LEER bis zum Klick (U2-ADR-495), der Chip kommt aus der
        Browsersprache.
   Die Proben fahren die echten Funktionen und Klick-Handler gegen den DOM-Stub; die Karten werden mit einem kleinen Baum-Ersatz für el() erfasst.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Kopie von 57cdb52c4:vivodepot-studio.html> → alle Proben außer der letzten sind rot.
   ═════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');

const BAUM = `
globalThis.__reg = {}; globalThis.__clip = null; globalThis.__timer = []; globalThis.__dl = [];
(function () {
  const alt$ = $;
  const knoten = (tag) => {
    const n = { tag, attrs: {}, kinder: [], hidden: false, textContent: '', value: '', className: '', _l: {} };
    n.setAttribute = (k, v) => { n.attrs[k] = String(v); if (k === 'id') { n.id = String(v); __reg[n.id] = n; } };
    n.getAttribute = (k) => (k in n.attrs ? n.attrs[k] : null);
    n.removeAttribute = (k) => { delete n.attrs[k]; };
    n.addEventListener = (ev, fn) => { n._l[ev] = fn; };
    n.appendChild = (c) => { n.kinder.push(c); return c; };
    n.removeChild = (c) => { n.kinder.splice(n.kinder.indexOf(c), 1); return c; };
    Object.defineProperty(n, 'firstChild', { get: () => n.kinder[0] || null });
    n.focus = () => {}; n.select = () => {};
    return n;
  };
  document.createElement = (t) => knoten(t);
  document.createTextNode = (t) => ({ tag: '#text', nodeValue: t, textContent: t, kinder: [] });
  $ = (id) => __reg[id] || alt$(id);
  globalThis.__box = (id) => { const n = knoten('div'); n.setAttribute('id', id); return n; };
  navigator = { languages: ['de-DE'], language: 'de-DE', clipboard: { writeText: async (t) => { __clip = t; } } };
  setTimeout = (f) => { __timer.push(f); return __timer.length; }; clearTimeout = () => {};
  blobDownload = (name, text, typ) => { __dl.push({ name, text, typ }); };
})();`;

function studio() {
  const g = ladeGenerator();
  const handler = {}, doc = g.document;
  const holeOrig = doc.getElementById, gesehen = new Set();
  doc.getElementById = (id) => {
    const e = holeOrig(id);
    if (e && !gesehen.has(id)) { gesehen.add(id); e.addEventListener = (ev, fn) => { handler[id + ':' + ev] = fn; }; }
    return e;
  };
  g.windowStub.scrollTo = () => {}; g.windowStub.addEventListener = () => {};
  const run = (code) => vm.runInContext(code, g.sandbox);
  run('boot()');
  run(BAUM);
  return { run, handler, klick: (id) => { assert.ok(handler[id + ':click'], 'kein Klick-Handler an #' + id); return handler[id + ':click'](); } };
}
function anfrageFuellen(S) {
  S.run(`ANF_AS.von = 'Bürgerservice Musterstadt'; ANF_AS.vorgang = 'V-1'; ANF_AS.zweck = 'Termin vereinbaren'; ANF_AS.grundlage = 'Ihre Einwilligung';
    ANF_AS.antwortAn = 'termine@musterstadt.example'; ANF_AS.gueltigBis = _aaInTagen(30); anfrageAssistentHinzu('vorname', 'Damit wir Sie ansprechen können'); ANF_AS.schritt = 6;`);
}
async function erzeugt() {
  const S = studio();
  anfrageFuellen(S);
  S.run(`__box('aa-ergebnis')`);
  await S.run('anfrageAssistentErzeugen({})');
  return S;
}
const alle = (n, f, aus = []) => { if (!n) return aus; if (f(n)) aus.push(n); (n.kinder || []).forEach((k) => alle(k, f, aus)); return aus; };
const id = (S, i) => S.run(`__reg['${i}'] || null`);
const text = (n) => (n.kinder || []).map((k) => (k.nodeValue != null ? k.nodeValue : '')).join('') + (n.textContent || '');
const knopf = (n) => alle(n, (x) => x.tag === 'button');

test('[S2] Brief, Passwort und Link sind Karten; jede hat „Kopieren“, Brief und Passwort auch „Speichern“, der Link nur Kopieren', async () => {
  const S = await erzeugt();
  const karten = S.run(`__reg['aa-ergebnis'].kinder`).flatMap((k) => alle(k, (x) => /(^| )aa-karte( |$)/.test(x.className || '')));
  assert.deepEqual(Array.from(karten, (k) => k.id), ['aa-karte-brief', 'aa-karte-passwort', 'aa-karte-link']);
  for (const k of karten) assert.equal(knopf(k).filter((b) => /^aa-kopieren-/.test(b.id || '')).length, 1, k.id + ' hat genau einen Kopieren-Knopf');
  const speichern = (k) => knopf(k).filter((b) => text(b) === 'Speichern');
  assert.equal(speichern(karten[0]).length, 1);
  assert.equal(speichern(karten[1]).length, 1);
  assert.equal(speichern(karten[2]).length, 0, 'der Link hat nur Kopieren');
  for (const k of karten) assert.equal(alle(k, (x) => x.tag === 'h3').length, 1, 'jede Karte trägt eine Überschrift');
});

test('[S2] der Link steht gekürzt da; der volle Link bleibt im Kopieren, im title und im Aufklapper', async () => {
  const S = await erzeugt();
  const kurz = id(S, 'aa-link'), voll = id(S, 'aa-link-voll');
  assert.ok(kurz && voll, 'kurzer und voller Link vorhanden');
  const link = voll.textContent;
  assert.match(link, /^https:\/\//);
  assert.ok(link.length > 100, 'der volle Link ist lang');
  assert.ok(kurz.textContent.length <= 44, 'gekürzt auf etwa 40 Zeichen: ' + kurz.textContent.length);
  assert.ok(kurz.textContent.includes('…'));
  assert.equal(kurz.attrs.title, link, 'voller Link im title');
  assert.equal(alle(id(S, 'aa-karte-link'), (x) => x.tag === 'summary')[0].textContent, 'Ganzen Link zeigen');
  await id(S, 'aa-kopieren-link')._l.click();
  assert.equal(S.run('__clip'), link, 'Kopieren liefert den vollen Link');
});

test('[S2] „Kopieren“ am Passwort liest den Wert im Moment des Klicks; der Knopf sagt „Kopiert“ und kehrt zurück', async () => {
  const S = await erzeugt();
  const pw = id(S, 'aa-passwort'), b = id(S, 'aa-kopieren-passwort');
  assert.match(pw.textContent, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
  assert.equal(b.attrs['aria-live'], 'polite');
  pw.textContent = 'NEU-IM-FELD';
  await b._l.click();
  assert.equal(S.run('__clip'), 'NEU-IM-FELD');
  assert.equal(b.textContent, 'Kopiert');
  S.run('__timer.forEach((f) => f())');
  assert.equal(b.textContent, 'Kopieren');
});

test('[S2] ohne Zwischenablage greift der Rückfall; scheitert auch er, sagt der Knopf es', async () => {
  const S = await erzeugt();
  S.run(`navigator = {}; document.execCommand = () => true; document.body.appendChild = (x) => x; document.body.removeChild = (x) => x;`);
  const b = id(S, 'aa-kopieren-brief');
  await b._l.click();
  assert.equal(b.textContent, 'Kopiert', 'Rückfall über execCommand');
  S.run(`document.execCommand = () => false;`);
  await b._l.click();
  assert.equal(b.textContent, 'Nicht möglich');
});

test('[S2] „Speichern“ nutzt blobDownload: Brief und Passwort-Zettel', async () => {
  const S = await erzeugt();
  id(S, 'aa-brief-laden')._l.click();
  id(S, 'aa-zettel-laden')._l.click();
  const dl = S.run('__dl');
  assert.equal(dl.length, 2);
  assert.match(dl[0].name, /-brief\.txt$/);
  assert.match(dl[1].name, /-passwort\.txt$/);
  assert.ok(dl[1].text.includes(id(S, 'aa-passwort').textContent), 'der Zettel trägt das Passwort');
});

test('[S2] „Neue Anfrage“ ersetzt „Anfrage erstellen“ und führt auf einen leeren Schritt 1', async () => {
  const S = await erzeugt();
  const stub = (i) => S.run(`document.getElementById('${i}')`);
  assert.equal(stub('aa-erzeugen').hidden, true, 'Anfrage erstellen ist weg');
  assert.equal(stub('aa-neu').hidden, false, 'Neue Anfrage ist da');
  S.klick('aa-neu');
  assert.equal(S.run('ANF_AS.schritt'), 1);
  assert.equal(S.run('ANF_AS.zweck'), '');
  assert.equal(S.run('ANF_AS.felder.length'), 0);
  assert.equal(S.run('ANF_AS.grundlage'), '');
  assert.equal(S.run('ANF_GEHALTEN'), null);
  assert.equal(S.run(`__reg['aa-ergebnis'].hidden`), true);
  assert.equal(S.run(`__reg['aa-ergebnis'].kinder.length`), 0, 'das Ergebnis ist geleert');
  assert.equal(stub('aa-erzeugen').hidden, false);
  assert.equal(stub('aa-neu').hidden, true);
});

test('[S2] das Passwort steht weder im gehaltenen Stand noch im Storage', async () => {
  const S = await erzeugt();
  const pw = id(S, 'aa-passwort').textContent;
  S.run('anfrageAssistentHalten()');
  const gehalten = JSON.stringify(S.run('ANF_GEHALTEN'));
  assert.ok(gehalten && gehalten !== 'null', 'der begonnene Weg wird gehalten');
  assert.ok(!gehalten.includes(pw), 'kein Passwort im gehaltenen Stand');
  assert.ok(!/(localStorage|sessionStorage)\.setItem\([^)]*passwort/i.test(HTML), 'kein Passwort in den Storage');
});

test('[S4] Schritt 3 bietet übliche Grundlagen als Chips; der Klick trägt den Text ins Feld ein', () => {
  const S = studio();
  S.run(`__box('aa-grundlagen')`);
  S.run('anfrageAssistentGrundlagenZeigen()');
  const chips = knopf(id(S, 'aa-grundlagen'));
  assert.ok(chips.length >= 3 && chips.length <= 4, 'drei bis vier Chips: ' + chips.length);
  const texte = chips.map((c) => text(c));
  assert.ok(texte.includes('Ihre Einwilligung') && texte.includes('Ein Vertrag mit Ihnen') && texte.includes('Eine gesetzliche Pflicht'), texte.join(' | '));
  chips[1]._l.click();
  assert.equal(S.run('ANF_AS.grundlage'), 'Ein Vertrag mit Ihnen');
  assert.equal(S.run(`document.getElementById('aa-grundlage').value`), 'Ein Vertrag mit Ihnen');
  const neu = knopf(id(S, 'aa-grundlagen'));
  assert.equal(neu[1].attrs['aria-pressed'], 'true');
  assert.equal(neu[0].attrs['aria-pressed'], 'false');
});

test('[S4] das Land bleibt leer bis zum Klick; der Chip kommt aus der Browsersprache', () => {
  const S = studio();
  S.run('anfrageAssistentZeigen()');
  assert.equal(S.run('ANF_AS.rechtsraum'), '', 'nicht vorbelegt');
  assert.equal(S.run(`document.getElementById('aa-rechtsraum').value`), '', 'das Feld ist leer');
  const box = S.run(`document.getElementById('aa-land-vorschlag')`), chip = S.run(`document.getElementById('aa-land-chip')`);
  assert.equal(box.hidden, false, 'der Chip ist da');
  assert.equal(chip.textContent, 'Deutschland?');
  S.klick('aa-land-chip');
  assert.equal(S.run('ANF_AS.rechtsraum'), 'DE');
  assert.equal(S.run(`document.getElementById('aa-rechtsraum').value`), 'DE');
  assert.equal(box.hidden, true, 'nach dem Klick kein Vorschlag mehr');
  S.run('anfrageAssistentNeu(); navigator.languages = ["de"]; navigator.language = "de"; anfrageAssistentZeigen()');
  assert.equal(S.run(`document.getElementById('aa-land-vorschlag').hidden`), true, 'eine Sprache ohne Region schlägt nichts vor');
});

test('[Markup] Knöpfe zweisprachig; Karten ohne Überlauf durch position:absolute; Hinweis zieht nicht mehr nach oben', () => {
  assert.match(HTML, /id="aa-neu" hidden data-en="New request">Neue Anfrage</);
  assert.match(HTML, /id="aa-grundlagen"/);
  assert.match(HTML, /id="aa-land-chip"/);
  const css = HTML.slice(HTML.indexOf('.aa-karten {'), HTML.indexOf('.aa-land-vorschlag[hidden]'));
  assert.ok(css.length > 100, 'Karten-CSS vorhanden');
  assert.ok(!/position:\s*absolute/.test(css), 'kein position:absolute in den Karten');
  assert.match(css, /\.aa-karte \.as-hilfe \{ margin: 0 0 12px; \}/, '.as-hilfe ohne negativen Außenabstand in der Karte');
  assert.match(HTML, /L\('Kopiert', 'Copied'\)/);
  assert.match(HTML, /L\('Ganzen Link zeigen', 'Show the whole link'\)/);
});
