'use strict';
/* ═════════════════════════════════════════════════════════════════
   Befund SHL-FREIGABEWEG-OHNE-WAHL (31.10.2026)
   ─────────────────────────────────────────────────────────────────
   Der Kern kennt zwei Freigabewege (SHL_FREIGABEWEGE: 'direkt' mit dem
   U-Flag, 'manifest' ohne Flag, U2-ADR-047 Korrektur Punkt 1), und der
   Kommentar dort nennt es eine Wahl der Bürgerin. Der Dialog „Gesundheitsdaten
   teilen“ bot aber nur den direkten Weg an: flowShlVorbereiten rief
   shlProviderPayload ohne `weg`, und der Link trug immer das U-Flag. Eine
   Stelle, die nur den Manifest-Weg kann, bekam aus der Oberfläche nie einen
   passenden Link.

   Jetzt zeigt der Dialog beide Wege als Segment (Muster 20 der Musterseite,
   „Eins aus 2 bis 4“), der direkte ist vorgewählt. Das Segment steht zugeklappt
   hinter „Weitere Angaben ›“ (Muster 12) direkt über dem Bauen-Knopf. Unter dem
   Segment steht EINE gedämpfte Zeile mit dem Halbsatz der gewählten Antwort
   (Leitfaden 5.27 „Dezente Erklärung“, 14.11.2026); das ⓘ-Blatt entfällt. Die Wahl
   wirkt erst beim Bauen des Links: die verschlüsselte Datei ist für beide
   Wege dieselbe, nur das Flag im Link folgt der Wahl. Wer die Datei schon
   gesichert hat, muss sie darum nicht neu sichern.

   Wächter gegen die Klasse: der Bauen-Knopf des geteilten Dialogs reicht die
   Wahl an shlUriBauen weiter, und die Lesestelle der Wahl fällt ohne Auswahl
   auf die Voreinstellung zurück.

   Rot-Beweis: auf dem Stand vor dem Fix fehlen die Wahl im Dialog und
   _shlWegGewaehlt.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const FIXTURE = path.join(__dirname, 'fixtures', 'eigenprobe-eu-lab.json');

async function frischMitLabDoc(zusatz) {
  const k = ladeKern(zusatz ? { zusatzBindungen: zusatz } : undefined);
  await k.V.depotAnlegen('pw');
  const id = k.V.importAutoritativDokument(fs.readFileSync(FIXTURE, 'utf8'));
  assert.ok(id, 'Vorbedingung: die Fixture wird als autoritativer Eintrag abgelegt');
  return { ...k, id };
}

function nutzlast(uri) {
  const b64 = uri.slice(uri.indexOf('shlink:/') + 'shlink:/'.length);
  return JSON.parse(Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

test('[Freigabeweg] der Dialog „Gesundheitsdaten teilen“ zeigt beide Wege, der direkte ist vorgewählt', async () => {
  const { V, document, id } = await frischMitLabDoc();
  await V.flowShlVorbereiten(id);
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /<div class="einst-zeile"><div class="einst-knopfreihe gleich-breit" id="shl-weg-wahl" role="group" aria-labelledby="shl-weg-label">/,
    'Muster 20 der Musterseite: das Segment der Einstellungen mit gleich breiten Teilen, benannt, in der Zeile mit Abstand zum Hauptknopf');
  assert.match(html, /<button type="button" class="einst-opt aktiv" id="shl-weg-direkt" aria-pressed="true">/, 'direkt, vorgewählt');
  assert.match(html, /<button type="button" class="einst-opt" id="shl-weg-manifest" aria-pressed="false">/, 'Manifest, wählbar');
  const auf = html.indexOf('data-weitere-angaben="shl-weg"');
  assert.ok(auf > -1, 'Muster 12: die Wahl steht hinter „Weitere Angaben ›“');
  assert.match(html, /id="shl-weg-kopf" aria-expanded="false"[^>]*>Weitere Angaben</, 'zugeklappt, dann gilt Direkt');
  assert.match(html, /<div class="weitere-angaben-inhalt" id="shl-weg-inhalt" hidden>/);
  assert.ok(auf < html.indexOf('id="shl-weg-wahl"'), 'das Segment liegt im Aufklapper');
  assert.doesNotMatch(html, /shl-weg-info/, 'kein ⓘ-Blatt mehr (Leitfaden 5.27)');
  assert.match(html, /<\/div><\/div><p class="einst-hint" id="shl-weg-folge">Über den Link kann die Datei heruntergeladen werden\.<\/p>/,
    'Leitfaden 5.27: EINE gedämpfte Zeile direkt unter dem Segment, mit dem Halbsatz der vorgewählten Antwort');
  assert.doesNotMatch(html, /type="radio" name="shl-weg"/, 'keine Systemoptik');
  assert.ok(html.indexOf('id="shl-weg-direkt"') < html.indexOf('id="shl-bauen"'), 'die Wahl steht vor „Freigabe-Link erzeugen“');
});

test('[Freigabeweg] die Wahl wird gelesen; ohne Auswahl gilt die Voreinstellung', async () => {
  const { V } = await frischMitLabDoc(['_shlWegGewaehlt']);
  const f = V.__zusatz._shlWegGewaehlt;
  assert.equal(typeof f, 'function', 'ROT ERWARTET vor dem Fix: _shlWegGewaehlt fehlt');
  const box = (manifest) => ({ querySelector: (sel) => (sel === '#shl-weg-manifest' ? { getAttribute: (n) => (n === 'aria-pressed' ? String(manifest) : null) } : null) });
  assert.equal(f(box(true)), 'manifest');
  assert.equal(f(box(false)), 'direkt');
  assert.equal(f({ querySelector: () => null }), 'direkt', 'ein Dialog ohne Wahl bleibt beim direkten Weg');
  assert.equal(f(null), 'direkt');
});

test('[Freigabeweg] Manifest: der Link trägt kein U-Flag; direkt: U', async () => {
  const { V, id } = await frischMitLabDoc();
  const teile = await V.shlProviderPayload(id, { label: 'Befund' });
  const url = 'https://share.vivodepot.de/s/abc';
  const m = nutzlast(V.shlUriBauen(Object.assign({}, teile, { weg: 'manifest' }), url));
  assert.equal('flag' in m, false, 'Manifest-Weg: kein Flag');
  const d = nutzlast(V.shlUriBauen(Object.assign({}, teile, { weg: 'direkt' }), url));
  assert.equal(d.flag, 'U');
  assert.equal(m.key, d.key, 'dieselbe Datei, derselbe Schlüssel: nur das Flag folgt der Wahl');
});

test('[Freigabeweg·Klasse] der Bauen-Knopf reicht die Wahl an shlUriBauen weiter', () => {
  const a = KERN.indexOf('function _shlDialogZeigen(');
  assert.ok(a > -1);
  const rumpf = KERN.slice(a, KERN.indexOf('\n}\n', a));
  assert.match(rumpf, /shlUriBauen\(Object\.assign\(\{\}, teile, \{ weg: _shlWegGewaehlt\(box\) \}\), url\)/);
  assert.equal((rumpf.match(/shlUriBauen\(/g) || []).length, 1, 'kein zweiter Bau-Aufruf im Dialog, der die Wahl übergeht');
  const flow = KERN.slice(KERN.indexOf('async function flowShlVorbereiten('), KERN.indexOf('function _shlDialogZeigen('));
  assert.match(flow, /wegWahl: true/, 'der Gesundheits-Dialog bietet die Wahl an');
  assert.match(rumpf, /if \(o\.wegWahl\) weitereAngabenVerdrahten\(box\);/, 'der Aufklapper ist verdrahtet, wo die Wahl steht, und nur dort');
});

test('[Freigabeweg] ein Klick setzt den Teil und aria-pressed', async () => {
  const { V } = await frischMitLabDoc(['_shlWegSetzen', '_shlWegGewaehlt']);
  const el = () => { const a = {}; return { a, textContent: '', classList: { an: false, toggle(k, v) { this.an = v; } }, setAttribute(n, v) { a[n] = v; }, getAttribute(n) { return a[n]; } }; };
  const d = el(), m = el(), folge = el();
  const box = { querySelector: (s) => ({ '#shl-weg-direkt': d, '#shl-weg-manifest': m, '#shl-weg-folge': folge })[s] || null };
  V.__zusatz._shlWegSetzen(box, 'manifest');
  assert.equal(folge.textContent, V.STRINGS.shlWegFolgeManifest, 'die gedämpfte Zeile wechselt mit der Wahl');
  assert.equal(m.a['aria-pressed'], 'true'); assert.equal(d.a['aria-pressed'], 'false');
  assert.equal(m.classList.an, true); assert.equal(d.classList.an, false);
  assert.equal(V.__zusatz._shlWegGewaehlt(box), 'manifest');
  V.__zusatz._shlWegSetzen(box, 'direkt');
  assert.equal(V.__zusatz._shlWegGewaehlt(box), 'direkt');
  assert.equal(folge.textContent, V.STRINGS.shlWegFolgeDirekt);
});

/* Link senden (Zug nach v1007): Der Dialog ist derselbe wie bei „Sicher weitergeben“, aber ohne Wahl. Ein Aufruf eines
   Bausteins, den es im Kern nicht gibt, warf dort einen ReferenceError, bevor der Dialog verdrahtet war. */
test('[Freigabeweg·Link senden] der Dialog öffnet ohne Fehler, ohne Wahl und ohne Aufklapper', async () => {
  const { V, document } = ladeKern({ Blob });
  const teile = await V.auszugLinkTeile(new Blob(['{"a":1}'], { type: 'application/json' }), { label: 'Krankenhaus' });
  assert.doesNotThrow(() => V._shlDialogZeigen(teile, { titel: 'Link senden', gueltigBis: V.STRINGS.linkSendenGueltigBis }));
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.match(html, /id="shl-bauen"/);
  assert.doesNotMatch(html, /id="shl-weg-wahl"/, 'Link senden bietet keine Wahl des Freigabewegs');
  assert.doesNotMatch(html, /data-weitere-angaben="shl-weg"/);
});

test('[Freigabeweg·Klasse] jede Funktion, die der Dialog und die Wahl beim Namen rufen, steht im Kern', () => {
  const rumpfVon = (name) => { const a = KERN.indexOf('function ' + name + '('); assert.ok(a > -1, name); return KERN.slice(a, KERN.indexOf('\n}\n', a)); };
  const fehlend = new Set();
  for (const name of ['_shlDialogZeigen', '_shlWegWahlHTML', '_shlWegSetzen', '_shlWegGewaehlt']) {
    const rumpf = rumpfVon(name).replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/\/\/[^\n]*/g, '');
    for (const m of rumpf.matchAll(/(?<![\w.$])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const f = m[1];
      if (/^(if|for|while|switch|catch|function|return|typeof|new|await|async)$/.test(f)) continue;
      if (/^(String|Array|Object|Number|Boolean|Blob|JSON|Math|Date|Promise|Uint8Array|parseInt|setTimeout|clearTimeout|encodeURIComponent)$/.test(f)) continue;
      if (new RegExp('(function|const|let)\\s+' + f.replace(/\$/g, '\\$') + '\\b').test(KERN) || new RegExp('\\b' + f + '\\s*=\\s*(\\(|async|function)').test(KERN) || new RegExp('[(,]\\s*' + f + '\\s*\\)\\s*=>|\\(\\s*' + f + '\\s*[,)]').test(rumpfVon(name))) continue;
      fehlend.add(name + ' → ' + f);
    }
  }
  assert.deepEqual([...fehlend], [], 'ein Aufruf ohne Definition im Kern wirft beim Öffnen des Dialogs');
});
