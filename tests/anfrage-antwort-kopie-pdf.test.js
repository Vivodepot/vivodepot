'use strict';
/* L8 (11.11.2026): nach einer Antwort auf eine Anfrage bekommt die Person auf Wunsch ihre Kopie als PDF. Die Stelle bekommt weiter
   nur die verschlüsselte Antwort; das PDF ist der eigene Beleg der Person, unverschlüsselt, der Knopf zeigt das offene Schloss.
   Gehalten:
     · das PDF ist ein PDF, nennt Stelle, Zweck, Aktenzeichen und je Angabe den Wert;
     · ohne Klartext ist der Anhang der Datensatz der Antwort ([L8·Anhang] prüft diesen Rückfall); mit Klartext genau er ([C·Klartext]);
     · der Dateiname trägt weder Aktenzeichen noch Zweck (U2-ADR-520 Nr. 3);
     · der Knopf steht am Abschlussbildschirm mit dem offenen Schloss.
   C (21.11.2026): reicht der Abschluss den Klartext aus klartextGesehen durch, trägt die Kopie genau ihn, wie das PDF an die Stelle;
   ohne ihn bleibt der Datensatz der Anhang.
   ROT-BEWEIS: ohne den Weg gibt es keine Datei (erste Probe); vor C trug die Kopie immer den Datensatz ([C·Klartext]). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeMitAusgabe, warteAufDateien } = require('./ausgabe-fang.js');
const { datenfassungAusPdfLesen } = require('../tools/pdf-anhang-datenfassung-lesen.js');

function pdfText(bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l8-kopie-'));
  const p = path.join(dir, 'a.pdf');
  fs.writeFileSync(p, bytes);
  try { return execFileSync('pdftotext', ['-layout', p, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { if (e.code === 'ENOENT') assert.fail('poppler fehlt (`pdftotext`) — `brew install poppler`'); throw e; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

async function antwortLage() {
  const k = ladeMitAusgabe();
  const { V } = k;
  await V.depotAnlegen('l8-antwort-kopie-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  V.sektorFeldSetzen('identity', 'familyName', 'Wredenhagen');
  const anfrage = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Meldebehörde Beispielstadt', zweck: 'Anmeldung einer Wohnung',
    grundlage: '§ 17 BMG', vorgang: 'WA-PROBE-8', gestelltAm: '2026-11-11', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'identity.givenName', zweck: 'Name', pflicht: true }, { kennung: 'identity.familyName', zweck: 'Name', pflicht: true }],
    antwort: { art: 'einmalpasswort', an: 'probe@beispiel.invalid' } };
  const ds = V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
  return Object.assign(k, { eintrag: { von: anfrage.von, anfrage }, ds });
}
async function dateiN(k, n) {
  await warteAufDateien(k, n + 1, 5000);
  assert.ok(k.gefangen.length > n, 'der Weg hat keine Datei herausgegeben (Datei ' + (n + 1) + ')');
  return k.bytes(n);
}

test('[L8·Kopie] das PDF nennt Stelle, Zweck, Aktenzeichen und die Werte der Antwort', async () => {
  const k = await antwortLage();
  assert.equal(typeof k.V.antwortKopiePdfAusgeben, 'function', 'der Weg „Meine Kopie als PDF“ fehlt');
  k.V.antwortKopiePdfAusgeben(k.eintrag, k.ds);
  const pdf = await dateiN(k, 0);
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  const text = pdfText(pdf);
  for (const w of ['Meldebehörde Beispielstadt', 'Anmeldung einer Wohnung', 'WA-PROBE-8', 'Elisabeth', 'Wredenhagen']) assert.ok(text.includes(w), '„' + w + '“ fehlt im PDF');
});

test('[L8·Anhang] der Anhang ist der Datensatz der Antwort, byte-gleich', async () => {
  const k = await antwortLage();
  k.V.antwortKopiePdfAusgeben(k.eintrag, k.ds);
  const pdf = await dateiN(k, 0);
  assert.equal(datenfassungAusPdfLesen(pdf), JSON.stringify(k.ds, (s, v) => (s.slice(0, 2) === '__' ? undefined : v), 2));
});

test('[L8·Name] der Dateiname trägt weder Aktenzeichen noch Zweck', async () => {
  const k = await antwortLage();
  k.V.antwortKopiePdfAusgeben(k.eintrag, k.ds);
  await dateiN(k, 0);
  assert.match(k.gefangen[0].name, /^Vivodepot_Antwort_\d{4}-\d{2}-\d{2}_Kopie\.pdf$/);
  assert.doesNotMatch(k.gefangen[0].name, /WA-PROBE|Wohnung|Melde/);
});

test('[L8·Knopf] der Abschlussbildschirm trägt „Meine Kopie als PDF“ mit dem offenen Schloss, der Wächter kennt den Weg', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(kern, /id="anfrage-ende-kopie">' \+ svgIcon\(ICONS\.lockOpen\) \+ ' ' \+ escapeHTML\(STRINGS\.anfrageKopieKnopf\)/);
  assert.match(kern, /kopie\.onclick = \(\) => antwortKopiePdfAusgeben\(eintrag, ds, klartext\)/);
  const { AUSGABEWEGE_EINORDNUNG: t } = require('../tools/lib/ausgabewege-einordnung.js');
  assert.deepEqual(t._anfrageAntwortSchreiben.pdf, { in: ['antwortKopiePdfAusgeben', 'antwortPdfAusgeben'] });   // TODESFALL B: dazu das PDF an die Stelle
  const gl = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'ausgabe-grundsatz-grundlinie.json'), 'utf8'));
  assert.deepEqual(gl.luecken['weg:_anfrageAntwortSchreiben'].fehlt, ['standard'], 'L8 ist beim PDF geschlossen, der Standard bleibt Lücke');
});

test('[C·Klartext] mit dem Klartext der Antwort trägt die Kopie genau ihn, wie das PDF an die Stelle', async () => {
  const k = await antwortLage();
  const klartext = 'eyJhbGciOiJFUzI1NiJ9.eyJwcm9iZSI6IkMifQ.c2lnbmF0dXItcHJvYmU';   // Form einer kompakten Signatur, kein echter Schlüssel
  k.V.antwortKopiePdfAusgeben(k.eintrag, k.ds, klartext);
  const pdf = await dateiN(k, 0);
  assert.equal(datenfassungAusPdfLesen(pdf), klartext, 'die Kopie trägt nicht den Text, der verschlüsselt hinausging');
  assert.match(pdf.toString('latin1'), /_Kopie\.jws/, 'der Anhang heißt nach seiner Form (.jws)');
});

test('[C·Durchreichung] der Abschluss reicht den Klartext an den Endbildschirm, der ihn an die Kopie gibt', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(kern, /function anfrageEndeZeigen\(eintrag, dateiname, ds, danach, klartext\)/);
  assert.match(kern, /_nachWeitergabeNachfragen\('anfrage-antwort', weg, vb, vorbelegung\), klartext\);/);
});
