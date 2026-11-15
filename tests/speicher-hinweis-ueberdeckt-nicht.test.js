'use strict';
/* C16 der Gestaltungsleitung (Mängelliste v998, 31.10.2026): Der Satz „Dieses Gerät kann den internen Speicher jederzeit freiräumen …“ stand als
   dunkle Meldung über dem Inhalt (Fußzeile, Formular). Nach Bedienmuster 27 (Speicherstatus) gehört der Status in den Kopf, nach Muster 33
   (Kurze Bestätigung) ist eine Meldung kurz: etwa drei Sekunden, ein Satz, ohne Knopf. Jetzt gilt:
   · seit 12.11.2026 gibt es keine Meldung mehr (vorher der kurze Statussatz „Ihre Datei ist nicht aktuell“, direkt nach dem Anlegen); der Zustand
     steht im Kopf (tests/meldungen-zustand-naechster-schritt.test.js);
   · der lange Satz (exportErinnerungHinweisText) liegt hinter einem ⓘ neben dem Speicherstatus im Kopf (#tb-save-info) und öffnet ein kurzes Blatt
     am Auslöser mit „Verstanden“ (speicherHinweisOeffnen, kein Dialog — GL v999 Runde 1); das ⓘ steht nur, solange die Erinnerung fällig ist und der Status ruhig auf „aktuell“ steht;
   · ui.toast räumt jede Meldung ohne Knopf nach wenigen Sekunden ab.
   Rot-Beweis: ein Kern, der wieder den langen Satz als Meldung zeigt, fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ZUSATZ = { indexedDB: {}, zusatzBindungen: ['exportErinnerungHinweisText', 'speicherHinweisOeffnen', 'renderSaveStatus', 'exportErinnerungText'] };
const LANGE = ['exportErinnerung', 'exportErinnerungRisiko', 'exportErinnerungZustand', 'exportErinnerungWebkit'];

async function frisch(opt) {
  const k = ladeKern(Object.assign({}, ZUSATZ, opt || {}));
  await k.V.depotAnlegen('speicher-hinweis-pw');
  k.V.akteurSelbstErklaeren('Maria');
  return k;
}
/* Rein: Funde an dem, was die Erinnerung nach außen gibt. `toasts` sind die erfassten Meldungen { text, art, aktion }. */
function meldungsFunde(V, toasts) {
  const aus = [];
  if (toasts.length !== 1) aus.push('erwartet genau eine Meldung, gefunden ' + toasts.length);
  for (const t of toasts) {
    if (LANGE.some((k) => String(V.STRINGS[k]).split('{')[0].length > 10 && t.text.startsWith(String(V.STRINGS[k]).split('{')[0].slice(0, 30)))) aus.push('die Meldung trägt den langen Satz: ' + t.text.slice(0, 40));
    if (t.text.length > 40) aus.push('die Meldung ist länger als eine Zeile (' + t.text.length + ' Zeichen)');
    if (t.aktion !== undefined) aus.push('die Meldung trägt einen Knopf oder bleibt stehen');
  }
  return aus;
}

test('[Speicher-Hinweis] die fällige Erinnerung erzeugt keine Meldung, einmal je Sitzung (12.11.2026: Zustand im Kopf statt Meldung)', async () => {
  const { V } = await frisch();
  const toasts = [];
  V.ui.toast = (text, art, aktion) => toasts.push({ text, art, aktion });
  assert.equal(V.exportErinnerungVielleichtZeigen(), true);
  assert.equal(V.exportErinnerungVielleichtZeigen(), false, 'einmal je Sitzung');
  assert.deepEqual(toasts, [], 'keine Meldung über dem Inhalt');
});

test('[Speicher-Hinweis] der lange Satz liegt hinter dem ⓘ im Kopf: sichtbar nur, solange die Erinnerung fällig ist und der Status ruhig steht', async () => {
  const { V, document } = await frisch();
  const info = document.getElementById('tb-save-info');
  assert.ok(info, 'das ⓘ steht im Markup des Kopfes (#tb-save-info)');
  assert.ok(/<div class="tb-save-status"[^>]*>[\s\S]*?id="tb-save-info"[\s\S]*?<\/div>/.test(KERN), 'und zwar in der Statuspille');
  const attrs = {};
  info.setAttribute = (k, v) => { attrs[k] = v; };   // der Knoten-Stub merkt sich Attribute nicht
  V.__zusatz.renderSaveStatus();
  assert.equal(info.hidden, false, 'fällig: das ⓘ steht da');
  assert.ok(/^Erklärung zu „.+“$/.test(attrs['aria-label']), 'es trägt seinen Namen: ' + attrs['aria-label']);
  const satz = V.__zusatz.exportErinnerungHinweisText();
  assert.ok(LANGE.some((k) => satz === V.STRINGS[k] || satz.length > 40), 'der Satz ist der lange');
  V.markiereAlsDateiGesichert();
  V.__zusatz.renderSaveStatus();
  assert.equal(V.__zusatz.exportErinnerungHinweisText(), null, 'frisch gesichert: nichts fällig');
  assert.equal(info.hidden, true, 'und kein ⓘ');
});

test('[Speicher-Hinweis] das ⓘ öffnet ein Blatt am Auslöser mit dem Status als Titel, dem ganzen Satz und „Verstanden“ — kein Dialog', async () => {
  const { V, document } = await frisch();
  V.__zusatz.renderSaveStatus();
  const info = document.getElementById('tb-save-info');
  assert.equal(typeof info.onclick, 'function');
  info.onclick();
  const b = info._infoBlatt;
  assert.ok(b, 'das Blatt hängt am ⓘ');
  assert.equal(b.hidden, false, 'offen');
  assert.equal(b.className, 'infoblatt tb-save-blatt');
  assert.equal(b._titel.textContent, 'Auf diesem Gerät aktuell', 'Titel = Status daneben, kein Widerspruch');
  assert.equal(b._text.textContent, V.__zusatz.exportErinnerungHinweisText(), 'der ganze Satz');
  assert.equal(b._ok.textContent, 'Verstanden');
  assert.ok(!String(document.getElementById('modal-inhalt').innerHTML).includes(b._text.textContent), 'kein Dialog');
  info.onclick();
  assert.equal(b.hidden, true, 'ein zweiter Klick schließt');
  const a = KERN.indexOf('function speicherHinweisOeffnen()');
  assert.ok(!/ui\.modal\(/.test(KERN.slice(a, KERN.indexOf('\n}\n', a))), 'speicherHinweisOeffnen ruft keinen Dialog');
});

test('[Speicher-Hinweis·Rot-Beweis] ein Kopf-ⓘ, das wieder den Dialog mit „Ihre Datei ist nicht aktuell“ öffnet, fällt durch', async () => {
  const anker = "  var txt = exportErinnerungHinweisText();\n  var knopf = document.getElementById('tb-save-info');";
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'speicher-hinweis-modal-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, "  var txt = exportErinnerungHinweisText();\n  ui.modal({ titel: STRINGS.saveStatusKeineDatei, koerperHTML: '<p>' + escapeHTML(txt) + '</p>', primaerLabel: STRINGS.btnVerstanden, ohneAbbrechen: true });\n  return;\n  var knopf = document.getElementById('tb-save-info');"));
  try {
    const { V, document } = await frisch({ htmlPfad: tmp, backen: true });
    V.__zusatz.renderSaveStatus();
    const info = document.getElementById('tb-save-info');
    info.onclick();
    assert.ok(!(info._infoBlatt && info._infoBlatt._titel), 'kein Blatt am Auslöser');
    assert.ok(String(document.getElementById('modal-inhalt').innerHTML).includes('Ihre Datei ist nicht aktuell'), 'stattdessen der Dialog — die Probe oben wäre rot');
  } finally { fs.unlinkSync(tmp); }
});

test('[Speicher-Hinweis] der Satz geht an keiner Stelle des Kerns als Meldung hinaus, und ui.toast räumt jede Meldung ohne Knopf nach 3,2 Sekunden ab', () => {
  assert.ok(!/ui\.toast\([^)]*exportErinnerung/.test(KERN), 'kein ui.toast mit einem exportErinnerung-Text');
  const a = KERN.indexOf('function exportErinnerungVielleichtZeigen()');
  const rumpf = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.ok(!/ui\.toast\(/.test(rumpf), 'die Erinnerung ruft keine Meldung (12.11.2026)');
  // Seit der Import-Anzeige (Kanon 844ce83a9) trägt ui.toast eine wählbare Dauer; ohne sie bleibt es bei 8 s mit Knopf, sonst 3,2 s.
  assert.match(KERN, /const dauer = \(optionen && optionen\.dauer\) \|\| \(aktion \? 8000 : 3200\);/);
  assert.match(KERN, /let timer = \(aktion && aktion\.bleibt\) \? null : _ohneProzessHalt\(setTimeout\(\(\) => el\.remove\(\), dauer\)\)/);
});

test('[Speicher-Hinweis·Rot-Beweis] ein Kern, der den langen Satz wieder als Meldung zeigt, fällt durch', async () => {
  const anker = "    try { renderSaveStatus(); } catch (_) { /* Hinweis ist optional, nie blockierend */ }";
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: Anker');
  const tmp = path.join(os.tmpdir(), 'speicher-hinweis-rot-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, "    ui.toast(exportErinnerungText(m), 'info');\n" + anker));
  try {
    const { V } = await frisch({ htmlPfad: tmp, backen: true });
    const toasts = [];
    V.ui.toast = (text, art, aktion) => toasts.push({ text, art, aktion });
    V.exportErinnerungVielleichtZeigen();
    const funde = meldungsFunde(V, toasts);
    assert.ok(funde.some((f) => /langen Satz|länger als eine Zeile/.test(f)), funde.join(' | '));
  } finally { fs.unlinkSync(tmp); }
});
