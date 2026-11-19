'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════
   Studio · Wagen S-G (10.11.2026): Eingaben nicht ohne Warnung verlieren (S1), Schrittwechsel in den Blick (S3)
   ─────────────────────────────────────────────────────────────────────────────────────────────
   (S1) Der Stand der Wege (Anfrage, Aufnahmebogen, Vorlage) bleibt im Fenster gehalten, wenn man ihn über die Marke im Kopf verlässt, und
        kommt mit der Kachel zurück. „Zurück zur Auswahl“ eines BEGONNENEN Wegs fragt einmal; ein leerer Weg fragt nicht. Verwerfen
        leert. Der gehaltene Stand trägt keine Passwörter. Das Schließen des Reiters warnt auch bei einem begonnenen Weg.
   (S3) Nach „Weiter“ liegt die Schrittleiste im Fenster (sofort, nicht gleitend), die Überschrift trägt den Fokus.
   Die Proben fahren die echten Klick-Handler (gen1Binden) gegen den DOM-Stub, nicht Hilfsfunktionen.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Kopie von 569c0b1cc:vivodepot-studio.html> → die S1- und S3-Proben sind rot.
   ═════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');

/* Ein Studio im DOM-Stub, dessen Klick-Handler aufrufbar sind. */
function studio() {
  const g = ladeGenerator();
  const handler = {}, spiele = { scroll: [], beforeunload: null };
  const doc = g.document, win = g.windowStub;
  const holeOrig = doc.getElementById;
  const gesehen = new Set();
  doc.getElementById = (id) => {
    const e = holeOrig(id);
    if (e && !gesehen.has(id)) { gesehen.add(id); e.addEventListener = (ev, fn) => { handler[id + ':' + ev] = fn; }; }
    return e;
  };
  win.scrollTo = (a, b) => { spiele.scroll.push(typeof a === 'object' ? a : { top: b, left: a }); };
  win.addEventListener = (ev, fn) => { if (ev === 'beforeunload') spiele.beforeunload = fn; };
  win.pageYOffset = 500;
  const run = (code) => vm.runInContext(code, g.sandbox);
  run('boot()');
  const el = (id) => doc.getElementById(id);
  return {
    run, el, handler, spiele, doc, win,
    klick: (id) => { assert.ok(handler[id + ':click'], 'kein Klick-Handler an #' + id); handler[id + ':click'](); },
    tippe: (id, wert) => { const e = el(id); e.value = wert; if (handler[id + ':input']) handler[id + ':input'](); if (handler[id + ':change']) handler[id + ':change'](); },
    dialog: (id) => {
      const d = el(id); assert.ok(d, 'Dialog #' + id + ' fehlt im Dokument');
      d.offen = 0; d.zu = 0; d.open = false;
      d.showModal = () => { d.open = true; d.offen++; };
      d.close = () => { d.open = false; d.zu++; };
      return d;
    },
  };
}
const schritt = (S) => S.run('aktiverSchritt');

/* ── S1 · Anfrage ───────────────────────────────────────────────────────────────────────── */
test('[S1 · Anfrage] der Stand bleibt nach dem Verlassen über die Marke im Kopf und der Kachel erhalten', () => {
  const S = studio();
  S.klick('ein-anfrage');
  S.tippe('aa-von', 'Bürgerservice Musterstadt');
  S.tippe('aa-zweck', 'Termin im Bürgerservice vereinbaren');
  S.run("anfrageAssistentHinzu('vorname', 'Damit wir Sie ansprechen können')");
  S.run('ANF_AS.schritt = 2');
  S.klick('marke-start');
  assert.equal(schritt(S), 'willkommen');
  S.klick('ein-anfrage');
  assert.equal(S.run('ANF_AS.zweck'), 'Termin im Bürgerservice vereinbaren', 'Zweck geht nicht verloren');
  assert.equal(S.run('ANF_AS.von'), 'Bürgerservice Musterstadt');
  assert.equal(S.run('ANF_AS.felder.length'), 1);
  assert.equal(S.run('ANF_AS.felder[0].zweck'), 'Damit wir Sie ansprechen können');
  assert.equal(S.run('ANF_AS.schritt'), 2, 'derselbe Schritt');
});

test('[S1 · Anfrage] „Zurück zur Auswahl“ fragt bei begonnenem Weg einmal; „Weiter bearbeiten“ behält alles', () => {
  const S = studio();
  const dlg = S.dialog('dlg-verlassen');
  S.klick('ein-anfrage');
  S.tippe('aa-zweck', 'Termin vereinbaren');
  S.klick('aa-zurueck-1');
  assert.equal(dlg.offen, 1, 'der Dialog erscheint genau einmal');
  assert.equal(schritt(S), 'anfrage', 'der Weg bleibt stehen, bis jemand antwortet');
  S.klick('vl-weiter');
  assert.equal(dlg.zu, 1);
  assert.equal(schritt(S), 'anfrage');
  assert.equal(S.run('ANF_AS.zweck'), 'Termin vereinbaren');
});

test('[S1 · Anfrage] „Verwerfen und zur Auswahl“ leert den Weg; ohne begonnenen Weg keine Frage', () => {
  const S = studio();
  const dlg = S.dialog('dlg-verlassen');
  S.klick('ein-anfrage');
  S.tippe('aa-zweck', 'Termin vereinbaren');
  S.klick('aa-zurueck-1');
  S.klick('vl-verwerfen');
  assert.equal(schritt(S), 'willkommen');
  S.klick('ein-anfrage');
  assert.equal(S.run('ANF_AS.zweck'), '', 'verworfen ist leer');
  S.klick('aa-zurueck-1');
  assert.equal(dlg.offen, 1, 'ein leerer Weg fragt nicht (nur die eine Frage von vorhin)');
  assert.equal(schritt(S), 'willkommen');
});

test('[S1 · Anfrage] der gehaltene Stand trägt kein Passwort und kein Schlüsselmaterial; die Passwortfelder sind leer', () => {
  const S = studio();
  S.klick('ein-anfrage');
  S.tippe('aa-zweck', 'Termin vereinbaren');
  ['aa-pw1', 'aa-pw2', 'aa-stelle-pw'].forEach((id) => { S.el(id).value = 'Geheimes-Passwort-4711'; });
  S.klick('marke-start');
  const gehalten = S.run('typeof ANF_GEHALTEN === "undefined" ? null : ANF_GEHALTEN');
  assert.ok(gehalten, 'es gibt einen gehaltenen Stand');
  const text = JSON.stringify(gehalten);
  assert.ok(!/Geheimes-Passwort|passwort|privat|jwk|schluessel/i.test(text.replace(/Termin vereinbaren/g, '')), 'weder Passwort noch Schlüsselfeld im gehaltenen Stand: ' + text);
  ['aa-pw1', 'aa-pw2', 'aa-stelle-pw'].forEach((id) => assert.equal(S.el(id).value, '', id + ' ist geleert'));
});

/* ── S1 · Start der Vorlage ─────────────────────────────────────────────────────────────── */
test('[S1 · Vorlage] Name und Angaben des Starts bleiben nach dem Verlassen über die Marke stehen; das Schließen des Reiters warnt', () => {
  const S = studio();
  const warnt = () => { let verhindert = false; S.spiele.beforeunload({ preventDefault: () => { verhindert = true; } }); return verhindert; };
  S.klick('marke-start');   // seit S-1 ist der Anfang der Start selbst, ohne Kachel davor
  assert.equal(schritt(S), 'willkommen');
  S.tippe('as-name', 'Sportverein Beispielstadt');
  S.tippe('as-strasse', 'Hauptstraße 1');
  S.klick('marke-start');
  assert.equal(schritt(S), 'willkommen');
  assert.equal(warnt(), true, 'ein begonnener Start warnt beim Schließen');
  assert.equal(S.run('ASSISTENT.name'), 'Sportverein Beispielstadt');
  assert.equal(S.el('as-name').value, 'Sportverein Beispielstadt');
  assert.equal(S.el('as-strasse').value, 'Hauptstraße 1');
});

/* ── S1 · Schließen des Reiters ─────────────────────────────────────────────────────────── */
test('[S1 · Reiter] beforeunload warnt auch bei begonnener Anfrage und bei gehaltenem Stand', () => {
  const S = studio();
  assert.ok(S.spiele.beforeunload, 'der Handler ist angemeldet');
  const warnt = () => { let verhindert = false; S.spiele.beforeunload({ preventDefault: () => { verhindert = true; } }); return verhindert; };
  assert.equal(warnt(), false, 'leeres Studio: keine Warnung');
  S.klick('ein-anfrage');
  S.tippe('aa-zweck', 'Termin vereinbaren');
  assert.equal(warnt(), true, 'begonnene Anfrage');
  S.klick('marke-start');
  assert.equal(warnt(), true, 'gehaltene Anfrage');
});

/* ── S3 · Schrittwechsel ────────────────────────────────────────────────────────────────── */
test('[S3 · Anfrage] nach „Weiter“ liegt die Schrittleiste im Fenster (sofort), die Überschrift trägt den Fokus', () => {
  const S = studio();
  const h1 = { fokus: 0, attr: {}, setAttribute(k, v) { this.attr[k] = v; }, focus() { this.fokus++; } };
  S.el('aa-schritt-2').querySelector = () => h1;
  S.el('aa-schritte').getBoundingClientRect = () => ({ top: -300, height: 40 });
  S.klick('ein-anfrage');
  S.tippe('aa-von', 'Bürgerservice Musterstadt');
  S.klick('aa-weiter-1');
  assert.equal(S.run('ANF_AS.schritt'), 2);
  assert.ok(S.spiele.scroll.length >= 1, 'die Seite rollt beim Schrittwechsel');
  const z = S.spiele.scroll[S.spiele.scroll.length - 1];
  assert.equal(z.behavior, 'instant', 'ohne Gleiten');
  assert.ok(z.top > 0 && z.top < 500, 'Ziel liegt an der Schrittleiste, nicht am Seitenende: ' + z.top);
  assert.equal(h1.attr.tabindex, '-1');
  assert.equal(h1.fokus, 1, 'Fokus auf der Überschrift');
});

test('[S3 · Anfrage] auch „Zurück“ rollt und setzt den Fokus', () => {
  const S = studio();
  const h1 = { fokus: 0, attr: {}, setAttribute(k, v) { this.attr[k] = v; }, focus() { this.fokus++; } };
  S.el('aa-schritt-1').querySelector = () => h1;
  S.el('aa-schritte').getBoundingClientRect = () => ({ top: -300, height: 40 });
  S.klick('ein-anfrage');
  S.run('ANF_AS.schritt = 2');
  S.klick('aa-zurueck-2');
  assert.equal(S.run('ANF_AS.schritt'), 1);
  assert.equal(h1.fokus, 1);
  assert.ok(S.spiele.scroll.length >= 1);
});

/* ── Markup ─────────────────────────────────────────────────────────────────────────────── */
test('[S1 · Dialog] zwei Knöpfe, deutsch und englisch', () => {
  const a = HTML.indexOf('<dialog id="dlg-verlassen"');
  assert.ok(a > 0, 'Dialog fehlt');
  const d = HTML.slice(a, HTML.indexOf('</dialog>', a));
  assert.match(d, /id="vl-weiter" data-en="Keep editing">Weiter bearbeiten</);
  assert.match(d, /id="vl-verwerfen" data-en="Discard and back to the choice">Verwerfen und zur Auswahl</);
  assert.match(d, /data-en="Discard your entries\?">Eingaben verwerfen\?</);
});
