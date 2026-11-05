'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Anlegen in zwei Schritten: Passwort, dann Wiederherstellungs-Code (S2, 31.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Entscheid der Gestaltungsleitung 31.10.2026: Schritt 1 die sechs Wörter mit einem Satz statt Warnkasten, Schritt 2 der Code
   im selben Ablauf. Kein vorgeschaltetes Angebot, kein Ablehnen-Dialog, kein Dialog „Passwort-Blatt“ danach; „Später
   einrichten“ ist ein Textknopf mit der Tragweite daneben (U2-ADR-430 Ziffer 2, Nachtrag 31.10.2026). Wo das Passwort entsteht,
   bleibt sichtbar, dass niemand es für Sie zurückholt (U2-ADR-035 Ziffer 4, Nachtrag 31.10.2026), in allen vier Textsätzen.
   Kein Gold im Stil des Dialogs: Gold steht nur im Logo.
   Rot-Beweis: eine Kernkopie mit der alten Fortsetzung (Angebot, dann Notfall-Blatt) öffnet nach dem Passwort keinen Schritt 2.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const FORTSETZEN = 'const fortsetzen = () => { if (fortgesetzt) return; fortgesetzt = true; const p = pw; pw = null; anlegenCodeSchritt(p); };';

function schritt2(V, document) {
  let danach = 0;
  V.anlegenCodeSchritt('zwei-schritte-pw', () => { danach++; });
  return { html: document.getElementById('modal-inhalt').innerHTML, danach: () => danach };
}

test('[S2·Schritt 1] Schrittzeile über dem Titel, der Satz statt des Warnkastens, „Warum?“ und der eigene Weg', () => {
  const { V, document } = ladeKern();
  V.flowDepotAnlegen();
  const html = document.getElementById('modal-inhalt').innerHTML;
  const titel = /<h3 id="modal-titel">([\s\S]*?)<\/h3>/.exec(html)[1];
  assert.ok(titel.startsWith('<span class="modal-schritt" data-schritt="1">' + V.escapeHTML(V.STRINGS.anlegenSchritt1) + '</span>'), 'Schritt 1 von 2 steht vor dem Titel');
  assert.match(html, /id="id-pw-satz"[^>]*>|data-zwei-schritte id="id-pw-satz"/);
  assert.ok(html.includes(V.escapeHTML(V.STRINGS.anlegenPwSatzVorschlag)), 'Satz 1 und 2 als ein Absatz');
  assert.ok(html.indexOf('id="id-pw-warum"') > html.indexOf('id="id-pw-satz-text"'), '„Warum?“ hängt am Satz');
  assert.ok(html.includes('id="id-pw-eigen-weg"'), '„Lieber ein eigenes Passwort wählen“ steht darunter');
  assert.ok(!html.includes('modal-warnung'), 'kein Warnkasten');
  assert.ok(html.includes(V.escapeHTML(V.STRINGS.anlegenPwProbeLabel)), 'die Probe nennt die Aufgabe');
});

// Der Kern-Stub kennt nur IDs, die fest im HTML stehen; die Bausteine des Vorschlags tragen zusammengesetzte IDs. Die Probe
// hängt für sie Elemente mit Ereignissen ein, damit die Verdrahtung des Dialogs wirklich läuft.
function element(hidden) {
  const hoerer = {};
  return {
    value: '', hidden: !!hidden, innerHTML: '', textContent: '',
    appendChild(k) { return k; },
    addEventListener(typ, f) { (hoerer[typ] = hoerer[typ] || []).push(f); },
    dispatchEvent(e) { for (const f of hoerer[e.type] || []) f(e); },
  };
}
function schritt1MitElementen() {
  const { V, document } = ladeKern();
  const els = {};
  for (const s of ['', '2', '2-label', '-staerke', '-vorschlag-knopf', '-vorschlag-anzeige', '-vorschlag-woerter', '-vorschlag-anderer', '-vorschlag-vorlesen', '-eigen']) {
    els['id-pw' + s] = element(s === '-vorschlag-anzeige');
  }
  // Die Wortanzeige baut ihre Wörter per DOM auf (textContent leert, je Wort ein <span> mit Text, dazwischen „-“ und <wbr>);
  // die Probe hält je Wort-Span die Klassen, bis die Zeile neu entsteht.
  const woerter = els['id-pw-vorschlag-woerter'];
  let spans = [];
  Object.defineProperty(woerter, 'textContent', {
    get: () => spans.map((s) => s.text).join('-'),
    set: () => { spans = []; },
  });
  woerter.appendChild = (knoten) => {
    const text = knoten && knoten.textContent;
    if (text && text !== '-') {
      const k = new Set();
      spans.push({ text, klassen: k, classList: { toggle: (n, an) => (an ? k.add(n) : k.delete(n)) } });
    }
    return knoten;
  };
  woerter.querySelectorAll = () => spans;
  const stub = document.getElementById;
  document.getElementById = (id) => els[id] || stub(id);
  V.flowDepotAnlegen();
  return { V, document, els };
}

// Befund der Produktverantwortung 31.10.2026: „wenn ich oben auf pw vorschlagen gehe, dann muss ich unten alles eintippen. das ist selbst für mich unklar“.
test('[S2·Probe der Wörter] die Probe steht unter den Wörtern, nennt die Aufgabe, und neue Wörter setzen den Fokus hinein', () => {
  const { V, document, els } = schritt1MitElementen();
  const html = document.getElementById('modal-inhalt').innerHTML;
  const iWoerter = html.indexOf('id="id-pw-vorschlag-woerter"');
  const iStaerke = html.indexOf('id="id-pw-staerke"');
  const iProbe = html.indexOf('id="id-pw2"');
  assert.ok(iWoerter > -1 && iWoerter < iProbe, 'die Probe folgt auf die Wörter');
  assert.ok(iStaerke > iWoerter && iStaerke < iProbe, 'Vorbedingung: der Stärke-Balken stünde dazwischen');
  assert.equal(els['id-pw'].value.split('-').length, 6, 'Vorbedingung: der Vorschlag steht im Feld');
  assert.equal(els['id-pw-staerke'].hidden, true, 'beim Vorschlag ist der Stärke-Balken weg: nichts steht zwischen Wörtern und Probe');
  assert.equal(els['id-pw-vorschlag-anzeige'].hidden, false, 'die Wörter stehen da');
  assert.equal(els['id-pw2-label'].textContent, V.STRINGS.anlegenPwProbeLabel);
  assert.match(V.STRINGS.anlegenPwProbeLabel, /Wörter/);
  const probe = els['id-pw2'];
  probe.value = 'schon-getippt';
  let fokus = null;
  probe.focus = () => { fokus = 'id-pw2'; };
  els['id-pw-vorschlag-anderer'].dispatchEvent({ type: 'click' });
  assert.equal(fokus, 'id-pw2', 'nach „Andere Wörter“ steht der Fokus in der Probe');
  assert.equal(probe.value, '', 'die Probe ist für die neuen Wörter leer');
  assert.equal(els['id-pw-vorschlag-anzeige'].hidden, false, 'die Wörter bleiben beim Tippen sichtbar');
  const feld = els['id-pw'];
  feld.value = 'mein-eigenes-passwort-1';
  feld.dispatchEvent({ type: 'input' });
  assert.equal(els['id-pw2-label'].textContent, V.STRINGS.anlegenPwProbeLabelEigen, 'beim eigenen Passwort die eigene Beschriftung');
});

// Muster statt Satz (Gestaltungsleitung 31.10.2026): je richtig abgetipptem Wort eine Markierung am Wort, wortgenau, nur beim Vorschlag.
test('[S2·Markierung je Wort] richtig abgetippte Wörter sind oben markiert, falsch geschriebene und ein eigenes Passwort nicht', () => {
  const { els } = schritt1MitElementen();
  const haken = () => els['id-pw-vorschlag-woerter'].querySelectorAll().map((s) => s.klassen.has('pw-wort-ok'));
  const soll = els['id-pw'].value.split('-');
  assert.equal(soll.length, 6, 'Vorbedingung: sechs Wörter im Feld');
  assert.equal(haken().length, 6, 'Vorbedingung: sechs Wörter in der Anzeige');
  const probe = els['id-pw2'];
  probe.value = soll[0] + '-' + soll[1].toUpperCase() + '-' + soll[2] + '-' + soll[3].slice(0, 2);
  probe.dispatchEvent({ type: 'input' });
  assert.deepEqual(haken(), [true, false, true, false, false, false], 'Markierung am ersten und dritten Wort; Großschreibung und halbes Wort ohne');
  probe.value = soll.join('-');
  probe.dispatchEvent({ type: 'input' });
  assert.deepEqual(haken(), [true, true, true, true, true, true]);
  els['id-pw-vorschlag-anderer'].dispatchEvent({ type: 'click' });
  assert.deepEqual(haken(), [false, false, false, false, false, false], 'neue Wörter, leere Probe: keine Markierung');
  els['id-pw'].value = 'mein-eigenes-passwort-1';
  els['id-pw'].dispatchEvent({ type: 'input' });
  probe.value = 'mein-eigenes-passwort-1';
  probe.dispatchEvent({ type: 'input' });
  assert.ok(haken().every((h) => !h), 'beim eigenen Passwort keine Stelle (K10)');
});

test('[S2·Markierung je Wort·Rot-Beweis] ohne die Verdrahtung der Probe bleibt jede Markierung aus', () => {
  const kopieText = KERN.replace("schlicht: true, probeId: 'id-pw2',", 'schlicht: true,');
  assert.notEqual(kopieText, KERN, 'Vorbedingung: die Verdrahtung steht im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'zwei-schritte-haken-rot-'));
  const kopie = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(kopie, kopieText);
  try {
    const { V, document } = ladeKern({ htmlPfad: kopie, backen: true });
    const els = {};
    for (const s of ['', '2', '2-label', '-staerke', '-vorschlag-knopf', '-vorschlag-anzeige', '-vorschlag-woerter', '-vorschlag-anderer', '-vorschlag-vorlesen', '-eigen']) els['id-pw' + s] = element(false);
    const spans = [0, 1, 2, 3, 4, 5].map(() => { const k = new Set(); return { klassen: k, classList: { toggle: (n, an) => (an ? k.add(n) : k.delete(n)) } }; });
    els['id-pw-vorschlag-woerter'].querySelectorAll = () => spans;
    const stub = document.getElementById;
    document.getElementById = (id) => els[id] || stub(id);
    V.flowDepotAnlegen();
    els['id-pw2'].value = els['id-pw'].value;
    els['id-pw2'].dispatchEvent({ type: 'input' });
    assert.ok(spans.every((s) => !s.klassen.has('pw-wort-ok')), 'ohne probeId keine Markierung');
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});

test('[S2·Schritt 2] der Code in sieben Gruppen, beide Blätter, „Fertig“ und „Später einrichten“ mit der Tragweite in einer Zeile', () => {
  const { V, document } = ladeKern();
  const { html } = schritt2(V, document);
  assert.ok(html.includes('data-schritt="2">' + V.escapeHTML(V.STRINGS.anlegenSchritt2) + '</span>'), 'Schritt 2 von 2 vor dem Titel');
  assert.ok(html.includes(V.escapeHTML(V.STRINGS.whcSchrittText)));
  const code = /id="whc-code"[^>]*>([\s\S]*?)<\/p>/.exec(html)[1];
  assert.match(code, /^([A-Z0-9]{4} ){6}[A-Z0-9]{4}$/, 'sieben Vierergruppen mit Leerzeichen: Umbruch nur zwischen Gruppen');
  assert.ok(html.includes('id="whc-blatt"') && html.includes(V.escapeHTML(V.STRINGS.whcBlattLeerKnopf)), 'Leeres Code-Blatt drucken');
  assert.ok(html.includes('id="whc-pw-blatt"') && html.includes(V.escapeHTML(V.STRINGS.nfbDruckenKnopf)), 'das Passwort-Blatt steht hier, nicht in einem Dialog danach');
  assert.match(html, /<button class="btn" id="m-ok">Fertig<\/button>/);
  assert.match(html, /<span class="modal-zweit-text"><button type="button" class="btn-text" id="m-zweit">Später einrichten<\/button><span class="einst-hint" id="m-zweit-hinweis">Bis dahin öffnet nur Ihr Passwort das Depot\.<\/span><\/span>/);
  assert.ok(!html.includes('id="m-abbr"'), 'kein Abbrechen neben „Später einrichten“');
});

test('[S2·Schritt 2] „Später einrichten“ geht ohne weiteren Dialog weiter, richtet nichts ein und lässt keinen Code stehen', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('zwei-schritte-pw');
  const s = schritt2(V, document);
  document.getElementById('m-zweit').onclick();
  assert.equal(s.danach(), 1, 'die Fortsetzung läuft genau einmal');
  assert.equal(document.getElementById('modal-inhalt').innerHTML, '', 'kein dritter Dialog, kein Code mehr im Dialog');
  assert.equal(V.getData()[V.WHC_FELD], undefined, 'kein Code eingerichtet');
});

test('[S2·Ablauf] flowDepotAnlegen setzt nach dem Passwort mit Schritt 2 fort; kein Angebot, kein Notfall-Blatt-Dialog', () => {
  const f = KERN.slice(KERN.indexOf('function flowDepotAnlegen('), KERN.indexOf('\n}\n', KERN.indexOf('function flowDepotAnlegen(')));
  assert.equal(f.split(FORTSETZEN).length - 1, 1, 'die Fortsetzung ruft Schritt 2');
  assert.doesNotMatch(f, /wiederherstellungAnbieten\(|notfallblattAnbieten\b/, 'weder Angebot noch Blatt-Dialog im Anlege-Weg');
  assert.match(f, /zweiSchritte: true/);
});

test('[S2·kein Zurücksetzen] wo das Passwort entsteht, sagt der Satz in allen vier Textsätzen, dass niemand es für Sie zurückholt', () => {
  for (const name of ['de', 'de-pro', 'en', 'en-pro']) {
    const t = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-' + name + '-modul.json'), 'utf8')).texte;
    for (const k of ['anlegenPwSatzVorschlag', 'anlegenPwSatzEigen']) {
      const satz = t['strings:' + k + '.text'];
      assert.match(satz, /nicht für Sie zurückholen|cannot recover (them|it) for you/, name + ' · ' + k);
    }
  }
});

test('[S2·kein Gold] die Regeln des Dialogs tragen kein Gold', () => {
  const css = fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  const regeln = css.split('\n').filter((z) => /\.(pw-|modal-schritt|modal-zweit-text|btn-text|btn-pille|whc-)/.test(z));
  assert.ok(regeln.length >= 10, 'Vorbedingung: die Regeln des Dialogs sind gefunden');
  assert.deepEqual(regeln.filter((z) => /gold/i.test(z)), []);
});

test('[S2·Rot-Beweis] mit der alten Fortsetzung öffnet nach dem Passwort kein Schritt 2', async () => {
  assert.equal(KERN.split(FORTSETZEN).length - 1, 1, 'Vorbedingung: die Fortsetzung steht genau einmal im Kern');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'zwei-schritte-rot-'));
  const kopie = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(kopie, KERN.replace(FORTSETZEN, () => FORTSETZEN.replace('anlegenCodeSchritt(p);', 'wiederherstellungAnbieten(p, notfallblattAnbieten);')));
  try {
    const { V, document } = ladeKern({ htmlPfad: kopie, backen: true });
    const f = fs.readFileSync(kopie, 'utf8');
    assert.equal(f.split(FORTSETZEN).length - 1, 0, 'die Probe oben fände die Fortsetzung nicht');
    V.wiederherstellungAnbieten('rot-pw', () => {});
    assert.ok(!document.getElementById('modal-inhalt').innerHTML.includes('data-schritt="2"'), 'der alte Weg zeigt keinen Schritt 2');
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
