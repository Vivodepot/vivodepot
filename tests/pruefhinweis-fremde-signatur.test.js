'use strict';
/* Prüfhinweis beim Weitergeben eines Originals mit fremder Signatur (14.10.2026, Option O2 des Berichts zur Übergabe an
   Fachverfahren): Vivodepot prüft nicht; der Dialog des Mappe-Eintrags sagt, wer prüft und womit.
   - EDC und Open Badge nennen die offizielle Prüfstelle im Hinweis (Adresse als Text, kein Link).
   - FHIR-Dokumente und PDF bekommen einen Satz nur bei ERKANNTER Signatur; ohne sie steht nichts da.
   - Zu jedem Prüfhinweis gehört ein Text zum Markieren und Kopieren; die Zwischenablage wird nicht angefasst.
     Einzige Ausnahme im Kern: „Link kopieren“ beim Link senden, nur auf Klick (ZWISCHENABLAGE_ERLAUBT unten). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const FX = path.join(__dirname, 'fixtures');
const LAB = fs.readFileSync(path.join(FX, 'eigenprobe-eu-lab.json'), 'utf8');
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;
const ABLEGEN = (V, datei) => V.importAutoritativDokument(fs.readFileSync(path.join(FX, datei), 'utf8'), new Uint8Array(fs.readFileSync(path.join(FX, datei))));

async function frisch() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
function pdfDatenUrl(inhalt) { return 'data:application/pdf;base64,' + Buffer.from(inhalt, 'latin1').toString('base64'); }

test('[Prüfhinweis] ein EDC nennt den Europass-Viewer als Text und trägt den Text zum Kopieren', async () => {
  const { V, document } = await frisch();
  const id = ABLEGEN(V, 'edci-europass-certofpart-signed.jsonld');
  assert.ok(id);
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.match(html, /europa\.eu\/europass\/digital-credentials\/viewer/, 'Prüfstelle im Hinweis');
  assert.match(html, /data-pruef-kopie-text[^>]*>[^<]*europa\.eu\/europass\/digital-credentials\/viewer/, 'Prüfstelle im Text zum Kopieren');
  assert.doesNotMatch(html, /href="https?:\/\/europa\.eu/, 'Adresse ist Text, kein Link');
});

test('[Prüfhinweis] ein Open Badge nennt den 1EdTech-Verifier als Text', async () => {
  const { V, document } = await frisch();
  const id = ABLEGEN(V, 'ob3-simple.json');
  assert.ok(id);
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.match(html, /vc\.1ed\.tech/);
  assert.doesNotMatch(html, /href="https?:\/\/vc\.1ed\.tech/, 'Adresse ist Text, kein Link');
});

test('[Prüfhinweis·Rot-Beweis] ein Gesundheitsoriginal OHNE erkannte Signatur bekommt gar keinen Prüfhinweis', async () => {
  const { V, document } = await frisch();
  const id = V.importAutoritativDokument(LAB);
  assert.ok(id);
  assert.equal(V.mappePruefArt(V.mappeEintrag(id)), null);
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.doesNotMatch(html, /data-pruef-kopie/, 'kein Text zum Kopieren');
  assert.doesNotMatch(html, /trägt eine Signatur/, 'kein Satz zur Signatur');
});

test('[Prüfhinweis] ein FHIR-Dokument MIT Signatur im Bündel bekommt den Satz ohne Adresse', async () => {
  const { V, document } = await frisch();
  const bundle = JSON.parse(LAB);
  bundle.signature = { type: [{ system: 'urn:iso-astm:E1762-95:2013', code: '1.2.840.10065.1.12.1.1' }], when: '2026-10-01T10:00:00Z', who: { display: 'Muster-Labor' }, sigFormat: 'application/jose', data: 'ZXlK' };
  const id = V.importAutoritativDokument(JSON.stringify(bundle));
  assert.ok(id, 'das signierte Bündel wird als Original abgelegt');
  assert.equal(V.mappePruefArt(V.mappeEintrag(id)), 'signatur');
  V.flowMappeVorschau(id);
  const html = modal(document);
  assert.match(html, /trägt eine Signatur/);
  assert.doesNotMatch(html, /europa\.eu|vc\.1ed\.tech|digital-building-blocks/, 'keine Adresse bei FHIR');
  assert.match(html, /das übliche Prüfwerkzeug Ihrer Stelle/, 'der Text zum Kopieren sagt „das übliche Prüfwerkzeug“');
});

test('[Prüfhinweis] ein PDF mit Signaturfeld bekommt den Satz, ein PDF ohne nicht', async () => {
  const { V, document } = await frisch();
  const mit = V.mappeEintragHinzufuegen({ beschriftung: 'Bescheid', mime: 'application/pdf', inhalt: pdfDatenUrl('%PDF-1.7\n1 0 obj\n<< /Type /Sig /ByteRange [0 100 200 300] /Contents <00> >>\nendobj\n') });
  const ohne = V.mappeEintragHinzufuegen({ beschriftung: 'Scan', mime: 'application/pdf', inhalt: pdfDatenUrl('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n') });
  assert.equal(V.mappePruefArt(V.mappeEintrag(mit)), 'signatur');
  assert.equal(V.mappePruefArt(V.mappeEintrag(ohne)), null);
  V.flowMappeVorschau(mit);
  assert.match(modal(document), /trägt eine Signatur/);
  assert.doesNotMatch(modal(document), /europa\.eu|digital-building-blocks/, 'keine Prüfadresse beim PDF');
  V.flowMappeVorschau(ohne);
  assert.doesNotMatch(modal(document), /trägt eine Signatur|data-pruef-kopie/);
});

/* Die Zwischenablage bleibt im Kern verboten, mit genau einer Ausnahme (Positivliste, einzeln freigegeben 20.10.2026):
   „Link kopieren“ beim Link senden (L1b) schreibt den Link auf Klick in die Zwischenablage. Wer ihn markiert, kopiert ihn
   ohnehin selbst; der Knopf ist nur bequemer. Die Ausnahme gilt für den Rumpf genau dieser Funktion und dort nur im
   Klick-Handler; die Prüfhinweis-Funktionen und jede andere Kernstelle bleiben unter dem Wächter. */
const ZWISCHENABLAGE_ERLAUBT = Object.freeze([
  { funktion: '_shlLinkKopierenUndQr', grund: 'Knopf Link kopieren, nur auf Klick' },
]);
function funktionsRumpf(text, name) {
  const start = text.indexOf('\nfunction ' + name + '(');
  if (start < 0) return null;
  const auf = text.indexOf('{', start);
  let tiefe = 0;
  for (let i = auf; i < text.length; i++) {
    if (text[i] === '{') tiefe++;
    else if (text[i] === '}' && --tiefe === 0) return { von: start, bis: i + 1, rumpf: text.slice(start, i + 1) };
  }
  return null;
}
/* Rein: die Kernstellen, die in die Zwischenablage schreiben (navigator.clipboard oder execCommand('copy')), außerhalb der
   Positivliste, und je Eintrag, ob jeder solche Aufruf im Rumpf des Klick-Handlers steht.
   → { ausserhalb: [Zeilennummern], ohneKlick: [Funktionen], fehlt: [Funktionen] } */
const ZWISCHENABLAGE = /navigator\.clipboard|execCommand\s*\(\s*['"`]copy/;
function zwischenablageStellen(kern, erlaubt = ZWISCHENABLAGE_ERLAUBT) {
  let rest = kern;
  const ohneKlick = [];
  const fehlt = [];
  for (const e of erlaubt) {
    const f = funktionsRumpf(rest, e.funktion);
    if (!f) { fehlt.push(e.funktion); continue; }
    // Der Rumpf des Klick-Handlers, mit Klammerzählung wie funktionsRumpf; nur dort darf geschrieben werden.
    const start = f.rumpf.indexOf('.onclick = () => {');
    let handler = '';
    if (start >= 0) {
      const auf = f.rumpf.indexOf('{', start);
      let tiefe = 0;
      for (let i = auf; i < f.rumpf.length; i++) {
        if (f.rumpf[i] === '{') tiefe++;
        else if (f.rumpf[i] === '}' && --tiefe === 0) { handler = f.rumpf.slice(start, i + 1); break; }
      }
    }
    const ausserhalbHandler = handler ? f.rumpf.replace(handler, '') : f.rumpf;
    // Der Rückfall über die Auswahl (perAuswahl) wird nur aus dem Handler gerufen; sein Rumpf steht als Pfeilfunktion davor.
    const ohneRueckfall = ausserhalbHandler.replace(/const perAuswahl = \(\) => \{[\s\S]*?\n  \};\n/, '');
    if (!ZWISCHENABLAGE.test(f.rumpf)) fehlt.push(e.funktion);
    else if (!handler || ZWISCHENABLAGE.test(ohneRueckfall) || /perAuswahl\(/.test(ohneRueckfall)) ohneKlick.push(e.funktion);
    rest = rest.slice(0, f.von) + f.rumpf.replace(/[^\n]/g, ' ') + rest.slice(f.bis);   // Zeilen bleiben gezählt
  }
  const ausserhalb = [];
  rest.split('\n').forEach((z, i) => { if (ZWISCHENABLAGE.test(z)) ausserhalb.push(i + 1); });
  return { ausserhalb, ohneKlick, fehlt };
}

test('[Prüfhinweis·Wächter] keine Zwischenablage, keine Links auf die Prüfstellen im Kern', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.deepEqual(zwischenablageStellen(kern), { ausserhalb: [], ohneKlick: [], fehlt: [] },
    'der Text wird markiert, nicht in die Zwischenablage geschrieben (Ausnahme nur „Link kopieren“, nur auf Klick)');
  assert.equal(/href\s*=\s*["'`]https?:\/\/(europa\.eu\/europass|vc\.1ed\.tech|ec\.europa\.eu\/digital-building-blocks)/.test(kern), false);
});

test('[Prüfhinweis·Wächter·Rot-Beweis] eine Zwischenablage-Nutzung außerhalb der Ausnahme oder ohne Klick würde erkannt', () => {
  assert.equal(/navigator\.clipboard/.test('await navigator.clipboard.writeText(t);'), true);
  const ausnahme = "\nfunction _shlLinkKopierenUndQr(out, uri) {\n  knopf.onclick = () => {\n    navigator.clipboard.writeText(uri);\n  };\n}\n";
  assert.deepEqual(zwischenablageStellen(ausnahme), { ausserhalb: [], ohneKlick: [], fehlt: [] }, 'Positivkontrolle');
  const daneben = ausnahme + "\nfunction pruefhinweisKopieren(t) {\n  navigator.clipboard.writeText(t);\n}\n";
  assert.deepEqual(zwischenablageStellen(daneben).ausserhalb, [9], 'eine andere Kernstelle bleibt rot');
  const kopieDaneben = ausnahme + "\nfunction irgendwoKopieren() {\n  document.execCommand('copy');\n}\n";
  assert.deepEqual(zwischenablageStellen(kopieDaneben).ausserhalb, [9], 'execCommand(copy) an einer anderen Kernstelle bleibt rot');
  const nachDemHandler = "\nfunction _shlLinkKopierenUndQr(out, uri) {\n  knopf.onclick = () => {\n    navigator.clipboard.writeText(uri);\n  };\n  navigator.clipboard.writeText(uri);\n}\n";
  assert.deepEqual(zwischenablageStellen(nachDemHandler).ohneKlick, ['_shlLinkKopierenUndQr'], 'ein Aufruf nach dem Handler bleibt rot');
  const sofort = "\nfunction _shlLinkKopierenUndQr(out, uri) {\n  navigator.clipboard.writeText(uri);\n  knopf.onclick = () => {};\n}\n";
  assert.deepEqual(zwischenablageStellen(sofort).ohneKlick, ['_shlLinkKopierenUndQr'], 'automatisch statt auf Klick bleibt rot');
});
