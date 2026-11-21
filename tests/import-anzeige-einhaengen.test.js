'use strict';
/* Einhängen und Betreten eines Sub-Depots über das Anzeige-Modell (18.11.2026, Befund IMPORT-VERWIRFT-OHNE-ANZEIGE, letzte Arten)
   Wer eine übergebene Depot-Datei einhängt und abgewiesen wird, las bisher den rohen Fehlertext des Kerns, etwa
   „Einhängen: kein gültiger Umschlag.“ oder „Kein Sitzungs-Akteur — … (U2-ADR-005)“. Jetzt bildet jede der drei Stellen
   (Datei nicht lesbar, Vorprüfung, Aufnahme) das Anzeige-Modell und zeigt dessen Satz.
   Erwartet:
   (a) Jede Kennung aus _einhaengenFehler hat einen Satz ohne technische Begriffe; eine unbekannte Kennung und ein Wurf ohne
       Kennung zeigen den allgemeinen Satz, nie den Fehlertext.
   (b) Im Ablauf: eine Datei, die schon in Verwaltung ist, zeigt den Satz „schon in Ihrer Verwaltung“.
   (c) Keine der drei Stellen zeigt err.message.
   (d) Betreten eines Sub-Depots, dessen Migration warf: der Nur-lesend-Hinweis nimmt seinen Satz aus dem Modell der Art
       sub-depot-selbst, und der Satz ist derselbe wie vorher.
   Rot-Beweis: am Kanon 7c2563f32b fehlt einhaengenAbweisungText, (a) bis (d) sind dort rot; die Probe der angeschlossenen
   Arten (tests/import-anzeige-alle-arten-angeschlossen.test.js) nannte dort genau diese zwei Arten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const TECHNISCH = /Einhängen:|Umschlag|kryptoVersion|depotUUID|Akteur|U2-ADR|undefined/;

test('[Einhängen·a] jede Kennung hat ihren Satz, ohne technische Begriffe', () => {
  const { V } = ladeKern();
  const S = V.STRINGS;
  const erwartet = {
    'keine-datei': S.einhaengenUngueltig,
    'kein-umschlag': S.einhaengenUngueltig,
    'keine-depot-datei': S.einhaengenUngueltig,
    'umschlag-form': S.einhaengenUngueltig,
    'datei-defekt': S.einhaengenUngueltig,
    'krypto-fassung': V.vorDepotText('dateiFassungUnbekannt'),
    'nur-anker': S.subAnlegenNurAnker,
    'bereits-verwaltet': S.einhaengenBereitsVerwaltet,
    'kein-akteur': S.importUngueltig,
    'kein-depot': S.importUngueltig,
    'erfunden': S.importUngueltig,
  };
  for (const [code, satz] of Object.entries(erwartet)) {
    assert.ok(typeof satz === 'string' && satz.length > 10, code + ': Vorbedingung, der Satz steht im Textsatz');
    const text = V.einhaengenAbweisungText({ code, message: 'Einhängen: roher Text ' + code });
    assert.equal(text, satz, code);
    assert.ok(!TECHNISCH.test(text), code + ': kein technischer Begriff');
  }
  assert.equal(V.einhaengenAbweisungText(new TypeError('x is undefined')), S.importUngueltig, 'ein Wurf ohne Kennung zeigt den allgemeinen Satz');
});

test('[Einhängen·b] im Ablauf: jede Abweisung der Aufnahme ergibt ihren Satz, eine schon verwaltete Datei „schon in Ihrer Verwaltung“', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('einhaengen-anzeige-pw');
  V.akteurSelbstErklaeren('Erika Beispiel');
  const gut = V.depotDateiAusUmschlag(await V.subDepotVersiegeln({ sektoren: {} }, 'einhaengen-anzeige-kind-pw'));
  const wurfVon = (fn) => { try { fn(); return null; } catch (e) { return e; } };
  const fremd = wurfVon(() => V.subDepotEinhaengen(Object.assign({}, gut, { kryptoVersion: 99 }), { bezeichnung: 'X', inhaberin: 'X' }));
  assert.equal(V.einhaengenAbweisungText(fremd), V.vorDepotText('dateiFassungUnbekannt'), 'fremde Krypto-Fassung');
  const keine = wurfVon(() => V.subDepotEinhaengen({ zz: 'probe' }, { bezeichnung: 'X', inhaberin: 'X' }));
  assert.equal(V.einhaengenAbweisungText(keine), V.STRINGS.einhaengenUngueltig, 'keine Depot-Datei');
  V.subDepotEinhaengen(gut, { bezeichnung: 'X', inhaberin: 'X' });
  const doppelt = wurfVon(() => V.subDepotEinhaengen(gut, { bezeichnung: 'Y', inhaberin: 'Y' }));
  assert.equal(doppelt && doppelt.code, 'bereits-verwaltet', 'Vorbedingung: das zweite Einhängen wird abgewiesen');
  assert.equal(V.einhaengenAbweisungText(doppelt), V.STRINGS.einhaengenBereitsVerwaltet);
  for (const w of [fremd, keine, doppelt]) assert.ok(!TECHNISCH.test(V.einhaengenAbweisungText(w)), 'kein technischer Begriff: ' + w.code);
});

test('[Einhängen·c] keine Stelle des Einhängens zeigt err.message', () => {
  const a = KERN.indexOf('function bestaetigeEinhaengen(');
  const e = KERN.indexOf('function einhaengenAbweisungText(');
  assert.ok(a > 0 && e > a, 'Vorbedingung: Dialog und Satz-Funktion stehen im Kern');
  const dialog = KERN.slice(a, e);
  assert.ok(!/err\.message/.test(dialog), 'der Dialog zeigt keinen rohen Fehlertext');
  const w = KERN.indexOf('function flowSubDepotEinhaengen(');
  assert.ok(w > 0 && w < a, 'Vorbedingung: die Dateiwahl steht vor dem Dialog');
  const wahl = KERN.slice(w, a);
  assert.ok(wahl.includes('pruefeBlackboxUmschlag(umschlagAusDatei(obj))'), 'Vorbedingung: die Vorprüfung steht in der Dateiwahl');
  assert.ok(!/ui\.toast\(String\(err\.message/.test(wahl), 'die Dateiwahl zeigt keinen rohen Fehlertext');
  assert.ok((KERN.slice(w, e).match(/einhaengenAbweisungText\(/g) || []).length >= 3, 'alle drei Stellen nehmen den Satz des Modells');
});

test('[Einhängen·Rot-Beweis] ein Kern, der wieder err.message zeigt, fällt bei (c) auf', () => {
  const a = KERN.indexOf('function bestaetigeEinhaengen(');
  const e = KERN.indexOf('function einhaengenAbweisungText(');
  const alt = KERN.slice(a, e).replace('ui.toast(einhaengenAbweisungText(err)', 'ui.toast(String(err.message || err)');
  assert.ok(/err\.message/.test(alt), 'die alte Form wird erkannt');
});

test('[Sub betreten·d] der Nur-lesend-Hinweis nach einem Migrationswurf nimmt den Satz aus dem Modell, derselbe Wortlaut', () => {
  const { V } = ladeKern();
  const satz = V.importAnzeigeText(V.importAnzeigeModell('sub-depot-selbst', { ok: false, grund: 'migration-fehler', verworfene: [] }));
  assert.equal(satz, V.STRINGS.migrationFehlerNurLesenText, 'derselbe Satz wie vorher');
  assert.equal(V.importAnzeigeText(V.importAnzeigeModell('sub-depot-selbst', { ok: false, grund: 'erfunden' })), V.STRINGS.importUngueltig);
  const a = KERN.indexOf('function _migrationNurLesenSatz(');
  const h = KERN.indexOf('function neuereFassungHinweisZeigen(');
  assert.ok(a > 0 && h > a, 'Vorbedingung: der Satz-Leser steht vor dem Hinweis');
  assert.ok(KERN.slice(a, h).includes("importAnzeigeModell('sub-depot-selbst'"), 'der Leser bildet das Modell');
  const hinweis = KERN.slice(h, KERN.indexOf('\nfunction ', h + 10));
  assert.ok(hinweis.includes('_migrationNurLesenSatz()'), 'der Hinweis nimmt den Satz des Lesers');
  assert.ok(!hinweis.includes('mig ? STRINGS.migrationFehlerNurLesenText'), 'Rot-Beweis: die alte Form stünde ohne Modell');
});
