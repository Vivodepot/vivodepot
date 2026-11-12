'use strict';
/* GL C02 (Mängelliste v998, Nachtrag 03.11.2026): drei Änderungen am Dialog „Depot anlegen“.
   1. Schritt 1: der Satz „Schreiben Sie Ihr Passwort jetzt auf Papier …“ steht unter dem Probefeld, nicht über dem Passwort-Feld,
      und sagt „Ihr Passwort“ statt „es“. „Warum?“ bleibt am Satz.
   2. Schritt 2: die beiden Druckknöpfe stehen als eigene Zeile direkt unter dem Code-Kasten; vor dem Abtippen steht die
      Überschrift „Code abtippen“.
   3. Die Meldung „Ihre Datei ist nicht aktuell“ liegt nie über einem offenen Dialog: beim Anlegen kommt sie nach „Fertig“
      (oder „Später einrichten“), sonst nach dem Schließen des Dialogs.
   Rot-Beweis: ein Kern ohne den Aufschub zeigt die Meldung, während Schritt 2 offen ist. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const ZUSATZ = { indexedDB: {}, zusatzBindungen: ['exportErinnerungAufschieben', 'exportErinnerungFreigeben'] };

/* Zielbild 01 (30.10.2026, Umbau 05.11.2026): beim Vorschlag steht der Satz über den Wörtern, die Probe direkt darunter. Beim eigenen
   Passwort wandert der Satz unter die Probe (GL C02: nicht über dem noch leeren Feld); das geschieht am echten DOM und steht hier als
   Quelltext-Probe. */
const reihenfolgeZielbild = (html) => {
  const i = (s) => html.indexOf(s);
  return [i('id="id-vorname"'), i('id="id-pw-woerter-titel"'), i('id="id-pw-satz"'), i('id="id-pw-vorschlag-woerter"'), i('id="id-pw2"')]
    .every((x, k, a) => x > -1 && (k === 0 || a[k - 1] < x));
};
test('[C02·1] Schritt 1: Name → Titel → Satz → Wörter → Probe; der Satz sagt „Ihr Passwort“ und trägt „Warum?“', () => {
  const { V, document } = ladeKern();
  V.flowDepotAnlegen();
  const html = document.getElementById('modal-inhalt').innerHTML;
  const i = (s) => html.indexOf(s);
  assert.ok(reihenfolgeZielbild(html), 'Zielbild 01: Satz über den Wörtern, Probe darunter');
  assert.ok(i('id="id-pw-satz"') < i('id="id-pw-warum"'), '„Warum?“ hängt am Satz');
  const f = KERN.slice(KERN.indexOf('function _depotIdentitaetUndPasswortAbfragen('), KERN.indexOf('function _ankerAusIdentitaetFinalisieren('));
  assert.match(f, /const anker = vorschlag \? woerterTitel : document\.getElementById\('id-pw2-fehler'\);/, 'beim eigenen Passwort wandert der Satz unter die Probe');
  assert.equal(V.STRINGS.anlegenPwSatzEigen, 'Schreiben Sie Ihr Passwort jetzt auf Papier, denn wir können es nicht für Sie zurückholen.');
});

test('[C02·1·Rot-Beweis] die frühere Reihenfolge (Satz unter der Probe, Wörter als Kette über dem Feld) fällt durch', () => {
  const frueher = '<input id="id-vorname"><p id="id-pw-vorschlag-woerter"></p><input id="id-pw"><input id="id-pw2"><p id="id-pw-satz"></p>';
  assert.equal(reihenfolgeZielbild(frueher), false);
});

test('[C02·1] der Satz zum eigenen Passwort sagt im deutschen und im englischen Textsatz „Ihr Passwort“ / „your password“', () => {
  const dateien = {
    'tools/textsatz-de-modul.json': 'Schreiben Sie Ihr Passwort jetzt auf Papier',
    'tools/textsatz-en-modul.json': 'Write your password down on paper now',
  };
  for (const [datei, anfang] of Object.entries(dateien)) {
    const text = fs.readFileSync(path.join(REPO, datei), 'utf8');
    const zeile = text.split('\n').find((z) => z.includes('"strings:anlegenPwSatzEigen.text"'));
    assert.ok(zeile && zeile.includes(anfang), datei + ': ' + (zeile || '(fehlt)').trim().slice(0, 90));
  }
});

test('[C02·2] Schritt 2: Druckknöpfe als Zeile direkt unter dem Code, dann „Code abtippen“, dann das Feld', () => {
  const { V, document } = ladeKern();
  V.anlegenCodeSchritt('c02-pw', () => {});
  const html = document.getElementById('modal-inhalt').innerHTML;
  const codeEnde = html.indexOf('</p>', html.indexOf('id="whc-code"')) + 4;
  assert.ok(codeEnde > 4, 'der Code steht im Dialog');
  assert.ok(html.slice(codeEnde).startsWith('<div class="whc-druck-zeile">'), 'gleich nach dem Code-Kasten die Zeile der Druckknöpfe');
  const zeile = html.slice(codeEnde, html.indexOf('</div>', codeEnde));
  assert.match(zeile, /<button type="button" class="btn btn-sek btn-klein" id="whc-blatt">/);
  assert.match(zeile, /<button type="button" class="btn btn-sek btn-klein" id="whc-pw-blatt">/);
  assert.ok(!zeile.includes('pw-trenner'), 'Knöpfe, keine Textverweise mit Trenner');
  const iTitel = html.indexOf('id="whc-abtippen-titel"');
  assert.ok(iTitel > codeEnde && iTitel < html.indexOf('for="whc-kontrolle"'), 'die Überschrift steht zwischen Knöpfen und Feld');
  assert.equal(V.STRINGS.whcAbtippenTitel, 'Code abtippen');
  assert.ok(html.includes('>Code abtippen</h3>'));
});

test('[C02·2] die Überschrift „Code abtippen“ steht im deutschen und im englischen Textsatz', () => {
  for (const datei of ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json']) {
    const text = fs.readFileSync(path.join(REPO, datei), 'utf8');
    assert.ok(text.includes('"strings:whcAbtippenTitel.text": "'), datei);
  }
});

function classListMitZustand() {
  const s = new Set();
  return { add: (k) => s.add(k), remove: (k) => s.delete(k), toggle: (k) => (s.has(k) ? s.delete(k) : s.add(k)), contains: (k) => s.has(k) };
}

async function frisch(opt) {
  const k = ladeKern(Object.assign({}, ZUSATZ, opt || {}));
  await k.V.depotAnlegen('c02-pw');
  k.V.akteurSelbstErklaeren('Maria');
  const toasts = [];
  k.V.ui.toast = (text, art) => toasts.push({ text, art });
  return Object.assign(k, { toasts });
}

test('[C02·3] während der Anlege-Kette keine Meldung; nach „Später einrichten“ genau eine', async () => {
  const { V, document, toasts } = await frisch();
  V.__zusatz.exportErinnerungAufschieben();
  let weiter = 0;
  V.anlegenCodeSchritt('c02-pw', () => { weiter++; V.__zusatz.exportErinnerungFreigeben(); });
  V.exportErinnerungVielleichtZeigen();
  assert.equal(toasts.length, 0, 'keine Meldung über Schritt 2');
  document.getElementById('m-zweit').onclick();
  assert.equal(weiter, 1);
  assert.equal(toasts.length, 1, 'nach dem Schließen genau eine Meldung');
  assert.ok([V.STRINGS.saveStatusKeineDatei, V.STRINGS.exportErinnerung, V.STRINGS.exportErinnerungRisiko].includes(toasts[0].text), 'die Speicher-Erinnerung: ' + toasts[0].text);
});

test('[C02·3] ohne Anlege-Kette wartet die Meldung, bis der offene Dialog zu ist', async () => {
  const { V, document, toasts } = await frisch();
  document.getElementById('modal-rueck').classList = classListMitZustand();   // der Stub merkt sich „an“ sonst nicht
  V.anlegenCodeSchritt('c02-pw', () => {});
  assert.equal(V.exportErinnerungVielleichtZeigen(), true);
  assert.equal(toasts.length, 0, 'kein Toast über dem offenen Dialog');
  document.getElementById('m-zweit').onclick();
  await new Promise((r) => setTimeout(r, 5));   // die Reihe arbeitet nach dem Schließen mit setTimeout(…, 0) ab
  assert.equal(toasts.length, 1, 'beim Schließen nachgeholt');
});

test('[C02·3] das Anlegen schiebt die Meldung auf und gibt sie in jedem Fortgang frei', () => {
  const a = KERN.indexOf('function flowDepotAnlegen(');
  const rumpf = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.match(rumpf, /onFertig: async \([^)]*\) => \{\n\s*exportErinnerungAufschieben\(\);/);
  assert.ok(rumpf.includes('anlegenCodeSchritt(p, exportErinnerungFreigeben)'), 'Schritt 2 gibt beim Weitergehen frei');
  assert.match(rumpf, /const ohneAngebot = \(\) => \{[^\n]*exportErinnerungFreigeben\(\); \};/);
  assert.equal(rumpf.split('exportErinnerungFreigeben(); throw').length - 1, 2, 'ein Abbruch gibt ebenfalls frei');
});

test('[C02·3·Rot-Beweis] ein Kern ohne den Aufschub zeigt die Meldung über Schritt 2', async () => {
  const anker = '  if (_exportErinnerungAufschub) { _exportErinnerungAusstehend = true; return false; }\n';
  const anker2 = "  if (typeof _wennDialogFrei === 'function') _wennDialogFrei('export-erinnerung-hinweis', zeigen); else zeigen();";
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker 1');
  assert.equal(KERN.split(anker2).length - 1, 1, 'Vorbedingung: Anker 2');
  const tmp = path.join(os.tmpdir(), 'anlegen-c02-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, '').replace(anker2, '  zeigen();'));
  try {
    const { V, document, toasts } = await frisch({ htmlPfad: tmp, backen: true });
    document.getElementById('modal-rueck').classList = classListMitZustand();
    V.__zusatz.exportErinnerungAufschieben();
    V.anlegenCodeSchritt('c02-pw', () => {});
    V.exportErinnerungVielleichtZeigen();
    assert.equal(toasts.length, 1, 'die Meldung kommt über dem offenen Dialog — die Probe oben wäre rot');
  } finally { fs.unlinkSync(tmp); }
});
