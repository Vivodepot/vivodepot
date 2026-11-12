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
const FORTSETZEN = 'const fortsetzen = () => { if (fortgesetzt) return; fortgesetzt = true; const p = pw; pw = null; anlegenCodeSchritt(p, exportErinnerungFreigeben); };';

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
  assert.ok(html.includes('id="id-pw-eigen-weg"'), '„Lieber ein eigenes Passwort“ steht darunter');
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
  // Zielbild 02 (Umbau 05.11.2026): jede Gruppe eine Kachel; dazwischen ein Leerzeichen, umbrochen wird nur zwischen den Kacheln.
  assert.match(code, /^(<span>[A-Z0-9]{4}<\/span> ){6}<span>[A-Z0-9]{4}<\/span>$/, 'sieben Vierergruppen als Kacheln');
  assert.match(code.replace(/<[^>]+>/g, ''), /^([A-Z0-9]{4} ){6}[A-Z0-9]{4}$/, 'als Text: sieben Vierergruppen mit Leerzeichen');
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

/* M27 (Mängelliste Vorschau v998, Nachtrag 31.10.2026 zu U2-ADR-430): wer aus der Umschau zum echten Depot kommt, sieht nach dem
   Passwort Schritt 2, nicht drei Dialoge (Angebot, „Ohne Wiederherstellungs-Code?“, „Passwort-Blatt zum Ausfüllen“). Seit dem
   Rückbau des Vorschau-Passwortwegs (07.11.2026) gibt es dafür keinen eigenen Dialog mehr: jedes Tor der Umschau öffnet
   flowDepotAnlegen (tests/umschau-tore-depot-anlegen.test.js), dessen Fortsetzung [S2·Ablauf] und [S2·Rot-Beweis] halten.
   Diese Probe geht den ganzen Weg einmal durch: Umschau, Sichern, Name und Passwort, Schritt 2. */
function dateiMock() {
  const handle = { name: 'm27-test.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
  return { showSaveFilePicker: async () => handle };
}
function nurKlassen(document, ids) {
  const orig = document.getElementById.bind(document);
  const el = {};
  for (const id of ids) {
    const set = new Set();
    el[id] = { innerHTML: '', textContent: '', style: {}, classList: { add: (...c) => c.forEach((x) => set.add(x)), remove: (...c) => c.forEach((x) => set.delete(x)),
      toggle: (x) => (set.has(x) ? (set.delete(x), false) : (set.add(x), true)), contains: (x) => set.has(x) },
      setAttribute: () => {}, removeAttribute: () => {}, getAttribute: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener: () => {}, appendChild: (x) => x, insertAdjacentHTML: () => {} };
  }
  document.getElementById = (id) => (id in el ? el[id] : orig(id));
}
async function umschauNachAnlegen() {
  const { V, document } = ladeKern(dateiMock());
  nurKlassen(document, ['overlay', 'app']);
  V.flowVorschauBetreten();
  await V.depotInDateiSichern();
  const titel = document.getElementById('modal-inhalt').innerHTML;
  document.getElementById('id-vorname').value = 'Mara';
  document.getElementById('id-nachname').value = 'Probe';
  document.getElementById('id-pw').value = 'm27-umschau-pw-lang';
  document.getElementById('id-pw2').value = 'm27-umschau-pw-lang';
  await document.getElementById('m-ok').onclick();
  for (let i = 0; i < 40 && !document.getElementById('modal-inhalt').innerHTML.includes('data-schritt="2"'); i++) await new Promise((r) => setTimeout(r, 50));
  return { V, titel, html: document.getElementById('modal-inhalt').innerHTML };
}

test('[S2·Vorschau-Weg] aus der Umschau führt Sichern über „Depot anlegen“ zu Schritt 2; kein Angebot, kein Ablehnen-Dialog, kein Blatt-Dialog', async () => {
  const { V, titel, html } = await umschauNachAnlegen();
  assert.ok(titel.includes('data-schritt="1"') && titel.includes('id="id-vorname"'), 'Sichern öffnet „Depot anlegen“, Schritt 1 von 2, mit Namen');
  assert.equal(V.imVorschau(), false, 'Vorbedingung: das Depot ist angelegt');
  assert.ok(html.includes('data-schritt="2"'), 'Schritt 2 steht');
  assert.ok(html.includes('id="whc-pw-blatt"'), 'das Passwort-Blatt steht im Schritt, nicht in einem eigenen Dialog');
  assert.ok(!html.includes('id="nfb-angebot"') && !html.includes('id="whc-tragweite"'), 'kein Blatt-Dialog, kein Ablehnen-Dialog');
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
  fs.writeFileSync(kopie, KERN.replace(FORTSETZEN, () => FORTSETZEN.replace('anlegenCodeSchritt(p, exportErinnerungFreigeben);', 'wiederherstellungAnbieten(p, notfallblattAnbieten);')));
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

/* Zielbild 01, Durchsicht der Gestaltungsleitung 05.11.2026: unter „Wörter zur Probe abtippen“ stand „Die beiden Passwörter
   stimmen nicht überein.“ — beim Wörter-Vorschlag spricht die Meldung von den Wörtern. Sie erscheint beim Verlassen des Felds
   (blur) und bei „Weiter“, nicht beim Tippen; beim Verlassen rollt das Fenster nicht, sonst träfe der Klick (z. B. auf „Warum?“) daneben. */
test('[S2·Probe-Meldung] beim Wörter-Vorschlag spricht die Meldung von den Wörtern, beim eigenen Passwort vom Passwort', () => {
  const PRODUKT = require('./produkt-html-erzeugen.js');
  const { V } = PRODUKT.kernAus(PRODUKT.produktHtml('privat-de'));
  const woerter = V.passwortVorschlag();
  assert.ok(V._pwIstVorschlagForm(woerter), 'Testvoraussetzung: sechs Listenwörter');
  const w = woerter.split('-');
  assert.equal(V.pwProbeMeldung(woerter, w.slice(0, 3).join('-') + '-' + w[3].slice(0, 2)), V.STRINGS.pwProbeWoerterUngleich);
  assert.equal(V.pwProbeMeldung(woerter, [w[0], 'xxxqq'].concat(w.slice(2)).join('-')), V.STRINGS.pwProbeWortWeichtAb.replace('{n}', '2'));
  assert.equal(V.pwProbeMeldung(woerter, w.join(' ')), V.STRINGS.pwProbeNurSchreibung);
  assert.equal(V.pwProbeMeldung('Sommer-Garten-2026', 'Sommer-Garten'), V.STRINGS.pwSetzenUngleich);
  assert.doesNotMatch(V.STRINGS.pwProbeWoerterUngleich, /Passw/);
});

test('[S2·Probe-Meldung·Quelle] modalPwMismatch nimmt die Meldung aus pwProbeMeldung; im Fenster mit Schritten erst bei „Weiter“, sonst beim Verlassen ohne zu rollen; Tippen löscht nur', () => {
  assert.match(KERN, /feldFehlerSetzen\(f2, pwProbeMeldung\(f1\.value, f2\.value\), \{ meldung: inl \}\);/);
  assert.match(KERN, /if \(!\(o && o\.ohneBlur\)\) f2\.addEventListener\('blur', \(\) => modalPwMismatch\(pw1Id, pw2Id, fehlerId, false, \{ leerStill: true \}\)\);/);   // leerStill: ANLEGEN-OHNE-PASSWORTBESTAETIGUNG (Kanon)
  assert.match(KERN, /modalPwFelderVerdrahten\('id-pw', 'id-pw2', 'id-pw2-fehler', \{ ohneBlur: zs \}\);/);
  assert.match(KERN, /f2\.addEventListener\('input', loesen\);/);
});

test('[S2·Probe-Meldung·Rot-Beweis] die alte Fassung (fester Passwort-Satz, Rollen beim Verlassen) fiele durch', () => {
  const alt = KERN.replace('feldFehlerSetzen(f2, pwProbeMeldung(f1.value, f2.value), { meldung: inl });', 'feldFehlerSetzen(f2, STRINGS.pwSetzenUngleich, { meldung: inl });')
    .replace("modalPwMismatch(pw1Id, pw2Id, fehlerId, false, { leerStill: true }));", "modalPwMismatch(pw1Id, pw2Id, fehlerId, true, { leerStill: true }));")
    .replace("modalPwFelderVerdrahten('id-pw', 'id-pw2', 'id-pw2-fehler', { ohneBlur: zs });", "modalPwFelderVerdrahten('id-pw', 'id-pw2', 'id-pw2-fehler');");
  assert.notEqual(alt, KERN);
  assert.doesNotMatch(alt, /feldFehlerSetzen\(f2, pwProbeMeldung\(f1\.value, f2\.value\), \{ meldung: inl \}\);/);
  assert.doesNotMatch(alt, /f2\.addEventListener\('blur', \(\) => modalPwMismatch\(pw1Id, pw2Id, fehlerId, false, \{ leerStill: true \}\)\);/);
  assert.doesNotMatch(alt, /modalPwFelderVerdrahten\('id-pw', 'id-pw2', 'id-pw2-fehler', \{ ohneBlur: zs \}\);/);
});

// U2-ADR-244, Nachtrag 05.11.2026: der Speicherort-Hinweis steht im Fenster mit Schritten hinter „Warum?“ (zugeklappt), nicht als
// Dauertext; nur der Datei-Fallback bleibt offen sichtbar, weil dort ein Dateiziel folgt.
function warumBefund(kern) {
  let pfad;
  if (kern) { pfad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-warum-')), 'vivodepot.html'); fs.writeFileSync(pfad, kern); }
  const { V, document } = ladeKern(pfad ? { htmlPfad: pfad } : undefined);
  // Der Stub hat keinen internen Speicher (dort käme der Datei-Fallback); der Dialog bekommt darum den Hinweis des Regelfalls.
  V._depotIdentitaetUndPasswortAbfragen({ sub: false, zweiSchritte: true, warnung: true, titelHTML: 'Depot anlegen', primaerLabel: 'Weiter',
    unterHinweis: 'Probe-Hinweis zum Speicherort' });
  const html = document.getElementById('modal-inhalt').innerHTML;
  const hinweis = V.escapeHTML('Probe-Hinweis zum Speicherort');
  const mehr = /<div class="anlegen-warum-mehr" id="id-pw-warum-mehr" hidden>([\s\S]*?)<\/div>/.exec(html);
  return { V, html, hinweis, mehr };
}
test('[S2·Warum] der Speicherort-Hinweis steht zugeklappt hinter „Warum?“, nicht als Dauertext', () => {
  const { html, hinweis, mehr } = warumBefund();
  assert.ok(mehr, 'der Aufklapper steht zugeklappt im Fenster');
  assert.ok(mehr[1].includes(hinweis), 'der Hinweis steht im Aufklapper');
  assert.equal(html.split(hinweis).length - 1, 1, 'der Hinweis steht genau einmal da, nicht zusätzlich als Dauertext');
  assert.match(html, /id="id-pw-warum" aria-expanded="false" aria-controls="id-pw-warum-mehr"/);
});
test('[S2·Warum·Rot-Beweis] mit dem Hinweis als Dauertext fiele die Probe durch', () => {
  const alt = KERN.replace("(opts.unterHinweis && !(zs && opts.unterHinweis !== STRINGS.anlegenDateizielHinweis) ?", '(opts.unterHinweis ?');
  assert.notEqual(alt, KERN);
  const { html, hinweis } = warumBefund(alt);
  assert.equal(html.split(hinweis).length - 1, 2, 'die alte Fassung zeigt den Hinweis doppelt: im Aufklapper und als Dauertext');
});
