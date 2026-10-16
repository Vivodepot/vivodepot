'use strict';
/* Rahmen-Schutz ohne Header (B16-ADR-066; Kern-Kommentar vor `<script id="rahmen-schutz">`). `frame-ancestors`
   wirkt nur als HTTP-Header, und kein Ausliefer-Weg setzt einen (file://, gehostete Fassung ohne eigene
   Response-Header, der Webspace von register.vivodepot.de). Darum verbirgt eine CSS-Regel den Inhalt, bis ein
   Skript ihn freigibt — nur wenn die Seite das oberste Fenster ist. In einem fremden Rahmen leitet sie das
   umgebende Fenster auf sich um; scheitert das, bleibt der Inhalt verborgen.
   Die Kern-Kommentare nannten diese Probe seit dem 18.09.2026, die Datei fehlte (Befund RAHMEN-SCHUTZ-PROBE).
   Gemessen wird der ausgelieferte Block selbst: Stil und Skript werden aus der Datei gelesen und in drei Lagen
   ausgeführt — oberstes Fenster, fremder Rahmen, fremder Rahmen mit gesperrter Umleitung.

   KLASSE (GENERATOR-RAHMEN, 26.09.2026): der Template-Generator lief live auf register.vivodepot.de/generator.html
   ohne diesen Block — er hält Signier- und Empfangsschlüssel im Speicher (U2-ADR-436). Nicht nur Kern und Lese-App,
   JEDE ausgelieferte HTML-Seite trägt den Block: jede HTML-Datei in der Wurzel des Repos, ausser den benannten
   Ausnahmen unten. Eine neue HTML-Datei in der Wurzel ohne Block oder ohne benannte Ausnahme fällt an der
   Vollständigkeitsprobe durch.
   Die erzeugte Register-Seite (tools/feldregister-bauen.js, register.vivodepot.de/) ist eine benannte Ausnahme: sie ist
   absichtlich ohne jedes Skript gebaut (tests/feldregister-bauen.test.js, U2-ADR-409) — eine statische Liste mit Links,
   ohne Eingabe, ohne Daten, ohne Schlüssel. Die Probe hält genau diesen Grund fest: trägt die Seite je ein Skript, ein
   Formular oder ein Eingabefeld, gilt die Ausnahme nicht mehr und die Probe ist rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const DATEIEN = [
  'vivodepot.html',
  'vivodepot-lesen.html',
  'vivodepot-studio.html',
  'vivodepot-vc-issuer.html',
  'vivodepot-schluessel-teilen.html',
];
// Benannte Ausnahmen — HTML in der Wurzel, die keinen Block tragen muss, mit Grund.
const AUSNAHMEN = {
  'vivodepot-style-guide.html': 'Gestaltungs-Dokumentation: trägt weder Daten noch Schlüssel noch eine Bedienung, die in einem fremden Rahmen etwas auslösen könnte',
};

function block(html) {
  const stil = html.match(/<style id="rahmen-verbergen">([\s\S]*?)<\/style>/);
  const skript = html.match(/<script id="rahmen-schutz">([\s\S]*?)<\/script>/);
  return { stil: stil && stil[1], skript: skript && skript[1], stilIndex: stil ? stil.index : -1, bodyIndex: html.search(/<body[\s>]/) };
}

// Führt das Skript in einer Lage aus und meldet: ist die Seite verborgen (Stil noch da ODER Wurzelelement selbst verborgen),
// wohin wurde umgeleitet, trägt das Dokument danach die Lauf-Marke, warf das Skript? Für die vom Browser gesicherte Kopie
// (`stilFehlt`, `markeDa`: der Stand NACH dem Skriptlauf) dazu: wurden die folgenden Skripte gesperrt, und was steht im
// body, nachdem das Dokument gelesen ist (das nachgebaute Dokument trägt vorher einen Rest der Anwendung).
function knoten(name) {
  const k = { name, kinder: [], attribute: {}, style: { cssText: '', setProperty() {}, removeProperty() {} }, textContent: '',
    setAttribute(n, w) { k.attribute[n] = w; }, appendChild(c) { k.kinder.push(c); return c; },
    removeChild(c) { k.kinder.splice(k.kinder.indexOf(c), 1); return c; }, remove() {},
    removeAttribute(n) { delete k.attribute[n]; }, querySelector(n) { return k.kinder.find((c) => c.name === n) || null; } };
  Object.defineProperty(k, 'firstChild', { get: () => k.kinder[0] || null });
  Object.defineProperty(k, 'firstElementChild', { get: () => k.kinder[0] || null });
  return k;
}
/* Der Hinweis einer gesicherten Kopie steht als verborgenes, statisches Element im Dokument (kein Text im Skript). Liest ihn
   aus dem HTML einer Datei in einen nachgebauten Knoten; null, wenn die Datei keinen trägt. */
function hinweisAus(html) {
  const m = /<div id="vd-gesicherte-kopie" hidden>([\s\S]*?)<\/div>/.exec(html);
  if (!m) return null;
  const k = knoten('div'); k.attribute.id = 'vd-gesicherte-kopie'; k.attribute.hidden = '';
  for (const t of m[1].matchAll(/<(strong|p)(?: lang="([a-z]+)")?>([^<]*)<\/\1>/g)) {
    const c = knoten(t[1]); if (t[2]) c.attribute.lang = t[2];
    c.textContent = t[3].replace(/&amp;/g, '&'); k.appendChild(c);
  }
  return k;
}
function lage(skript, { imRahmen, umleitungGesperrt, stilFehlt = false, markeDa = false, hinweis = null }) {
  let stilDa = !stilFehlt;
  let wurzelVerborgen = false;
  let marke = markeDa;
  let umgeleitetAuf = null;
  let fehler = null;
  const selbst = { location: { href: 'file:///depot/vivodepot.html' } };
  const oben = imRahmen ? {} : selbst;
  if (imRahmen) {
    Object.defineProperty(oben, 'location', {
      get() { throw new Error('fremder Ursprung: lesen verboten'); },
      set(v) { if (umleitungGesperrt) throw new Error('sandbox: Navigation verboten'); umgeleitetAuf = v; },
    });
  }
  const fenster = { self: selbst, top: oben };
  const kopf = knoten('head');
  const koerper = knoten('body');
  const rest = knoten('div'); rest.textContent = 'REST-DER-ANWENDUNG'; koerper.appendChild(rest);
  if (hinweis) koerper.appendChild(hinweis);
  const horcher = [];
  const dokument = {
    head: kopf, body: koerper, title: 'alt',
    getElementById: (id) => (id === 'rahmen-verbergen' ? (stilDa ? { remove() { stilDa = false; } } : null)
      : koerper.kinder.find((k) => k.attribute.id === id) || null),
    createElement: (n) => knoten(n),
    addEventListener: (ereignis, fn) => { if (ereignis === 'DOMContentLoaded') horcher.push(fn); },
    documentElement: {
      hasAttribute: (n) => n === 'data-vd-lauf' && marke,
      setAttribute: (n) => { if (n === 'data-vd-lauf') marke = true; },
      style: { setProperty(name, wert) { if (name === 'display' && wert === 'none') wurzelVerborgen = true; }, removeProperty(name) { if (name === 'display') wurzelVerborgen = false; } },
    },
  };
  let verborgenBisGelesen = null;
  try {
    vm.runInNewContext(skript, { window: fenster, document: dokument });
    verborgenBisGelesen = stilDa || wurzelVerborgen;
    for (const fn of horcher) fn();   // das Dokument ist gelesen
  } catch (e) { fehler = e.message; }
  const text = (k) => [k.textContent].concat(k.kinder.map(text)).join(' ');
  const sperre = kopf.kinder.find((k) => k.name === 'meta' && k.attribute['http-equiv'] === 'Content-Security-Policy');
  const hinweisKnoten = koerper.kinder.find((k) => k.attribute.id === 'vd-gesicherte-kopie');
  return { verborgen: stilDa || wurzelVerborgen, umgeleitetAuf, marke, fehler, verborgenBisGelesen,
    skripteGesperrt: !!(sperre && /script-src 'none'/.test(sperre.attribute.content || '')),
    ersetzt: !!hinweisKnoten && koerper.kinder.length === 1 && !('hidden' in hinweisKnoten.attribute), restDa: text(koerper).includes('REST-DER-ANWENDUNG'),
    titel: dokument.title, koerperLeer: koerper.kinder.length === 0,
    hinweis: hinweisKnoten ? hinweisKnoten.kinder.map((k) => ({ art: k.name, lang: k.attribute.lang || null, text: k.textContent })) : null };
}
const kurz = (r) => ({ verborgen: r.verborgen, umgeleitetAuf: r.umgeleitetAuf, ersetzt: r.ersetzt, fehler: r.fehler });

// Die Mängel einer Seite, leer wenn der Schutz trägt.
function schutzMaengel(html) {
  const b = block(html);
  if (!b.stil || !b.skript) return ['kein Rahmen-Schutz-Block (style#rahmen-verbergen + script#rahmen-schutz)'];
  const m = [];
  if (!/body\s*\{\s*display\s*:\s*none\s*!important\s*\}/.test(b.stil)) m.push('der Verberge-Stil verbirgt den body nicht mit !important');
  if (!(b.bodyIndex > 0 && b.stilIndex < b.bodyIndex)) m.push('der Verberge-Stil steht nicht vor dem body');
  const soll = [
    [{ imRahmen: false }, { verborgen: false, umgeleitetAuf: null, ersetzt: false, fehler: null }, 'oberstes Fenster wird nicht freigegeben'],
    [{ imRahmen: true, umleitungGesperrt: false }, { verborgen: true, umgeleitetAuf: 'file:///depot/vivodepot.html', ersetzt: false, fehler: null }, 'im fremden Rahmen nicht umgeleitet oder freigegeben'],
    [{ imRahmen: true, umleitungGesperrt: true }, { verborgen: true, umgeleitetAuf: null, ersetzt: false, fehler: null }, 'bei gesperrter Umleitung freigegeben'],
  ];
  for (const [l, erwartet, text] of soll) {
    const ist = lage(b.skript, l);
    if (ist.fehler) m.push('das Skript wirft: ' + ist.fehler);
    else if (JSON.stringify(kurz(ist)) !== JSON.stringify(erwartet)) m.push(text);
  }
  return m;
}

function registerSeite() {
  return require('../tools/feldregister-bauen.js').bauen({ datum: '2026-09-26' }).html;
}

test('[Rahmen-Schutz · Klasse] jede HTML-Datei in der Wurzel trägt den Block oder steht als benannte Ausnahme', () => {
  const wurzel = execFileSync('git', ['ls-files', '*.html'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() }).split('\n').filter((f) => f && !f.includes('/'));
  assert.ok(wurzel.includes('vivodepot.html'), 'Vorbedingung: die Liste der Wurzel-Dateien ist gelesen');
  assert.deepEqual(wurzel.filter((f) => !DATEIEN.includes(f) && !AUSNAHMEN[f]), [], 'neue HTML-Datei ohne Rahmen-Schutz und ohne benannte Ausnahme');
  assert.deepEqual(DATEIEN.filter((f) => !wurzel.includes(f)), [], 'die Liste nennt eine Datei, die es nicht mehr gibt');
});

for (const datei of DATEIEN) {
  test('[Rahmen-Schutz · ' + datei + '] oberstes Fenster: frei · fremder Rahmen: umgeleitet, verborgen · Umleitung gesperrt: verborgen', () => {
    assert.deepEqual(schutzMaengel(fs.readFileSync(path.join(REPO, datei), 'utf8')), []);
  });
}

/* KOPF UMGEBAUT (13.10.2026, Auftrag aus einer Prüfung im Browser): baut eine Umgebung den Kopf um, fehlt beim normalen Start
   das Stil-Element. Der Block vor dem Umbau rief dann `getElementById('rahmen-verbergen').remove()` auf null und warf. Gefordert:
   kein Fehler; das oberste Fenster ist frei, im fremden Rahmen bleibt die Seite verborgen — der Schutz hängt nicht am Stil. */
function kopfUmgebautMaengel(skript) {
  const m = [];
  const oben = lage(skript, { imRahmen: false, stilFehlt: true });
  if (oben.fehler) m.push('oberstes Fenster: das Skript wirft: ' + oben.fehler);
  else if (oben.verborgen) m.push('oberstes Fenster: verborgen');
  for (const umleitungGesperrt of [false, true]) {
    const r = lage(skript, { imRahmen: true, umleitungGesperrt, stilFehlt: true });
    if (r.fehler) m.push('fremder Rahmen: das Skript wirft: ' + r.fehler);
    else if (!r.verborgen) m.push('fremder Rahmen' + (umleitungGesperrt ? ', Umleitung gesperrt' : '') + ': nicht verborgen');
  }
  return m;
}
for (const datei of DATEIEN) {
  test('[Rahmen-Schutz · Kopf umgebaut · ' + datei + '] ohne Stil-Element: kein Fehler, oberstes Fenster frei, im fremden Rahmen verborgen', () => {
    assert.deepEqual(kopfUmgebautMaengel(block(fs.readFileSync(path.join(REPO, datei), 'utf8')).skript), []);
  });
}
test('[Rahmen-Schutz · Kopf umgebaut · Rot-Beweis] der Block vor dem Umbau wirft als oberstes Fenster ohne Stil-Element', () => {
  const alt = "\n  if (window.self === window.top) {\n    document.getElementById('rahmen-verbergen').remove();\n  } else {\n    try { window.top.location = window.self.location.href; } catch (e) { /* CSS-Verbergen bleibt bestehen */ }\n  }\n";
  const m = kopfUmgebautMaengel(alt);
  assert.ok(m.some((x) => x.startsWith('oberstes Fenster: das Skript wirft')), JSON.stringify(m));
  assert.ok(m.some((x) => x.startsWith('fremder Rahmen, Umleitung gesperrt: nicht verborgen')), JSON.stringify(m));
});

// Warum die Register-Seite keinen Block braucht — leer, solange der Grund der Ausnahme trägt.
function ausnahmeGrundVerletzt(html) {
  const m = [];
  if (/<script\b/i.test(html)) m.push('ein Skript');
  if (/<form\b/i.test(html)) m.push('ein Formular');
  if (/<(input|textarea|select|button)\b/i.test(html)) m.push('ein Eingabe- oder Bedienelement');
  return m;
}

test('[Rahmen-Schutz · Register-Seite] die erzeugte Seite von register.vivodepot.de bleibt ohne Skript und ohne Eingabe — sonst braucht sie den Block', () => {
  const seite = registerSeite();
  assert.ok(seite.includes('<body'), 'Vorbedingung: die Seite ist erzeugt');
  assert.deepEqual(ausnahmeGrundVerletzt(seite), [], 'die Register-Seite ist keine reine Liste mehr — dann trägt sie den Rahmen-Schutz-Block wie Kern und Generator');
  assert.deepEqual(ausnahmeGrundVerletzt(seite.replace('<body', '<form></form><body')), ['ein Formular'], 'Rot-Beweis: ein gepflanztes Formular hebt die Ausnahme auf');
});

test('[Rahmen-Schutz · Rot-Beweis] ein Skript, das auch im fremden Rahmen freigibt, und eines ohne Schutz werden erkannt', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const { skript } = block(kern);
  // Die Pflanzung: im fremden Rahmen den Stil entfernen, statt das Wurzelelement zu verbergen.
  const gibtImmerFrei = kern.replace(skript, skript.replace(/(auf sich umleiten\.\s*)wurzel\.style\.setProperty\('display', 'none', 'important'\);/, '$1if (stil) stil.remove();'));
  assert.notEqual(gibtImmerFrei, kern, 'Vorbedingung: die Pflanzung hat den Block verändert');
  assert.ok(schutzMaengel(gibtImmerFrei).includes('bei gesperrter Umleitung freigegeben'), JSON.stringify(schutzMaengel(gibtImmerFrei)));
  assert.deepEqual(schutzMaengel('<html><head></head><body></body></html>'), ['kein Rahmen-Schutz-Block (style#rahmen-verbergen + script#rahmen-schutz)']);
  const stilNachBody = kern.replace(/<style id="rahmen-verbergen">[\s\S]*?<\/style>/, '').replace(/<body([\s>])/, '<body$1<style id="rahmen-verbergen">body{display:none !important}</style>');
  assert.ok(schutzMaengel(stilNachBody).includes('der Verberge-Stil steht nicht vor dem body'));
});

/* ── Konvention (operating-manual §7.5): Deklaration per REFERENZ — die Register-Probe konsumiert den Rückgabewert von
   ausnahmeGrundVerletzt() (assert.deepEqual(..., [])); der Aufruf-Nachweis bindet sie daran. */
module.exports = {
  PROBEN: [
    { fuer: '[Rahmen-Schutz · Register-Seite] die erzeugte Seite von register.vivodepot.de bleibt ohne Skript und ohne Eingabe — sonst braucht sie den Block', diskriminante: ausnahmeGrundVerletzt },
  ],
};

/* GESICHERTE KOPIE (Befunde RAHMENSCHUTZ-FAELLT-IN-GESICHERTER-KOPIE und GESICHERTE-KOPIE-TRAEGT-KLARTEXT, 11.10.2026).
   Wer die Seite im Browser mit „Seite speichern“ sichert, bekommt den Stand NACH dem Skriptlauf: der Verberge-Stil ist dann
   schon entfernt, bei geöffnetem Depot stehen die gezeigten Angaben im HTML, und die Datei zeigte beim Öffnen ein offenes
   Depot. Gemessen am Block vor der Änderung: als oberstes Fenster warf er einen Fehler (kein Element zum Entfernen), im
   fremden Rahmen mit gesperrter Umleitung verbarg nichts mehr.
   Jetzt setzt der Block beim Start die Marke `data-vd-lauf` ans Wurzelelement. Steht sie beim Start schon da, ist die
   Datei eine gesicherte Kopie: der Block sperrt alle folgenden Skripte (eine zweite Richtlinie `script-src 'none'`),
   hält die Seite verborgen, bis sie gelesen ist, entfernt dann den Inhalt und setzt einen Hinweis an seine Stelle. */
test('[Rahmen-Schutz · gesicherte Kopie] jede Datei: Skripte gesperrt, bis zum Ende des Lesens verborgen, danach nur der Hinweis — als oberstes Fenster wie im fremden Rahmen', () => {
  const maengel = [];
  for (const datei of DATEIEN) {
    const html = fs.readFileSync(path.join(REPO, datei), 'utf8');
    const b = block(html);
    for (const l of [{ imRahmen: false }, { imRahmen: true, umleitungGesperrt: true }, { imRahmen: true, umleitungGesperrt: false }]) {
      const r = lage(b.skript, { ...l, stilFehlt: true, markeDa: true, hinweis: hinweisAus(html) });
      const wo = datei + ' (' + (l.imRahmen ? 'fremder Rahmen' : 'oberstes Fenster') + ')';
      if (r.fehler) maengel.push(wo + ': der Block wirft: ' + r.fehler);
      if (!r.skripteGesperrt) maengel.push(wo + ': die folgenden Skripte sind nicht gesperrt');
      if (!r.verborgenBisGelesen) maengel.push(wo + ': bis das Dokument gelesen ist, steht der Rest sichtbar da');
      if (!r.ersetzt || r.restDa) maengel.push(wo + ': im body steht nach dem Lesen mehr als der Hinweis');
      if (r.umgeleitetAuf) maengel.push(wo + ': die Kopie leitet das umgebende Fenster um');
    }
  }
  assert.deepEqual(maengel, []);
});

test('[Rahmen-Schutz · gesicherte Kopie] der Hinweis steht in beiden Sprachen und nennt die Handlung; der Kern nennt dazu den Weg zur Anwendung als Datei', () => {
  const von = (datei) => { const html = fs.readFileSync(path.join(REPO, datei), 'utf8'); return lage(block(html).skript, { imRahmen: false, stilFehlt: true, markeDa: true, hinweis: hinweisAus(html) }).hinweis; };
  const h = von('vivodepot.html');
  assert.deepEqual(h.map((z) => [z.art, z.lang]), [['strong', null], ['p', 'de'], ['p', 'en']]);
  assert.match(h[1].text, /Bitte löschen Sie diese Datei\./);
  assert.match(h[2].text, /Please delete this file\./);
  // Der Kern nennt dazu den Weg zur Anwendung als Datei (den Eintrag gibt es nur dort); die übrigen vier enden beim Löschen.
  assert.match(h[1].text, /in den Einstellungen der Eintrag „… als Datei erhalten“\.$/);
  assert.match(h[2].text, /“Get … as a file” in Settings\.$/);
  const ohneWeg = von('vivodepot-lesen.html');
  assert.match(ohneWeg[1].text, /Bitte löschen Sie diese Datei\.$/);
  assert.match(ohneWeg[2].text, /Please delete this file\.$/);
  assert.ok(h[1].text.startsWith(ohneWeg[1].text) && h[2].text.startsWith(ohneWeg[2].text), 'bis dahin derselbe Wortlaut');
  for (const datei of DATEIEN.filter((d) => d !== 'vivodepot.html')) assert.deepEqual(von(datei), ohneWeg, datei + ' trägt denselben Hinweis wie die Lese-App');
});

test('[Rahmen-Schutz · gesicherte Kopie] der Hinweis ist statisches, verborgenes Markup; der Kopf-Block trägt keinen Satz und zeigt in der Kopie nur dieses Element', () => {
  for (const datei of DATEIEN) {
    const html = fs.readFileSync(path.join(REPO, datei), 'utf8');
    const b = block(html);
    assert.ok(hinweisAus(html), datei + ': das Element #vd-gesicherte-kopie steht verborgen im Dokument');
    assert.ok(html.indexOf('id="vd-gesicherte-kopie" hidden') > b.bodyIndex, datei + ': es steht im body');
    assert.equal(/Bitte löschen|Please delete|Saved copy/.test(b.skript), false, datei + ': der Kopf-Block trägt keinen Hinweistext');
    assert.equal(/cssText|createElement\('(?!meta')/.test(b.skript), false, datei + ': der Kopf-Block baut kein Element außer der Sperre und setzt keinen Stilwert');
    const r = lage(b.skript, { imRahmen: false, stilFehlt: true, markeDa: true, hinweis: hinweisAus(html) });
    assert.equal(r.titel, 'Gespeicherte Kopie · Saved copy', datei + ': der Titel kommt aus der Kopfzeile des Hinweises');
    assert.equal(/<h[1-6][\s>]/.test(/<div id="vd-gesicherte-kopie" hidden>[\s\S]*?<\/div>/.exec(html)[0]), false, datei + ': der verborgene Hinweis trägt keine Überschrift, sonst ist er die erste Überschrift der Seite');
    // Fehlt das Element (ein Stand, der es nicht trägt), bleibt die Kopie leer: gesperrt, ohne Inhalt, ohne Fehler.
    const ohne = lage(b.skript, { imRahmen: false, stilFehlt: true, markeDa: true });
    assert.deepEqual([ohne.koerperLeer, ohne.skripteGesperrt, ohne.fehler], [true, true, null], datei + ': ohne das Element bleibt der body leer');
  }
});

test('[Rahmen-Schutz · gesicherte Kopie · Rot-Beweis] ein normaler Start wird nie als Kopie erkannt und setzt die Marke', () => {
  for (const datei of DATEIEN) {
    const b = block(fs.readFileSync(path.join(REPO, datei), 'utf8'));
    for (const l of [{ imRahmen: false }, { imRahmen: true, umleitungGesperrt: true }]) {
      const r = lage(b.skript, l);
      assert.equal(r.ersetzt, false, datei + ': ohne Marke kein Hinweis');
      assert.equal(r.skripteGesperrt, false, datei + ': ohne Marke keine Sperre der Skripte');
      assert.equal(r.restDa, true, datei + ': der Inhalt bleibt stehen');
      assert.equal(r.marke, true, datei + ': der Start setzt die Marke');
      assert.equal(r.fehler, null);
    }
  }
});

test('[Rahmen-Schutz · gesicherte Kopie · Rot-Beweis] der Wortlaut vor der Änderung fällt in beiden Lagen durch', () => {
  const haengtAmStil = "if (window.self === window.top) { document.getElementById('rahmen-verbergen').remove(); }"
    + " else { try { window.top.location = window.self.location.href; } catch (e) { } }";
  const oben = lage(haengtAmStil, { imRahmen: false, stilFehlt: true, markeDa: true });
  assert.ok(oben.fehler, 'als oberstes Fenster wirft er');
  assert.equal(oben.ersetzt, false, 'und ersetzt die Kopie nicht');
  const rahmen = lage(haengtAmStil, { imRahmen: true, umleitungGesperrt: true, stilFehlt: true, markeDa: true });
  assert.equal(rahmen.verborgen, false, 'im Rahmen mit gesperrter Umleitung verbirgt er nichts');
  assert.deepEqual(schutzMaengel('<style id="rahmen-verbergen">body{display:none !important}</style><script id="rahmen-schutz">' + haengtAmStil + '</script><body>').length, 0,
    'die drei alten Lagen bestand er; die Lücke lag allein in der gesicherten Kopie');
});
