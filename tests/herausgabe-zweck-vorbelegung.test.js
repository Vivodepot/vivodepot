'use strict';
/* ════════════════════════════════════════════════════════════════════════
   B23-Z2 (31.10.2026): der Zweck des Herausgegeben-Vermerks ist je Ausgabeweg vorbelegt.
   ────────────────────────────────────────────────────────────────────────
   Befund B23-Z2. War: Empfänger, Umfang und Zweck wurden erst NACH der Ausgabe in einem Dialog
   erfragt, der Zweck ohne Vorbelegung. Jetzt gilt: der Empfänger kann VOR der Ausgabe freiwillig
   angegeben werden, der Zweck ist je Weg vorbelegt und änderbar, der Vermerk trägt immer einen Zweck.
     · `herausgabeZweckVorschlag(wegId)` liefert für jeden Weg der Einordnung (tools/lib/ausgabewege-einordnung.js,
       Feld `zweck`) einen nicht leeren Text; ein unbekannter Weg bekommt den allgemeinen Vorschlag.
     · `herausgabeVermerkEintragen(weg, { empfaenger, zweck, umfang })` trägt ohne Dialog ein; fehlt der Zweck,
       gilt die Vorbelegung des Wegs; fehlt der Empfänger, entsteht kein Eintrag (null).
     · Der Dialog nach der Ausgabe belegt das Zweck-Feld vor.
   Rot-Beweis: gegen den Stand vor B23-Z2 (vivodepot.html und Textsatz aus HEAD) schlägt jede dieser Proben fehl.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { AUSGABEWEGE_EINORDNUNG } = require('../tools/lib/ausgabewege-einordnung.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ZUSATZ = ['herausgabeZweckVorschlag', 'herausgabeVermerkEintragen', 'HERAUSGABE_ZWECK_WEGE', 'HERAUSGABE_ZWECK_VORSATZ', 'STRINGS'];
const PW = 'anker-pw-zweck-123';
const weitergabe = Object.entries(AUSGABEWEGE_EINORDNUNG).filter(([, z]) => z.klasse === 'weitergabe');

test('[B23·Z2] jeder Weitergabe-Weg der Einordnung trägt einen Zweck-Schlüssel mit nicht leerem Text', () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  const S = V.__zusatz.STRINGS;
  assert.ok(weitergabe.length > 0);
  for (const [name, z] of weitergabe) {
    assert.ok(typeof z.zweck === 'string' && z.zweck, name + ': ohne `zweck` in der Einordnung');
    const text = S[z.zweck];
    assert.ok(typeof text === 'string' && text.trim(), name + ': herausgabeZweckVorschlag' + z.zweck + ' fehlt oder ist leer');
  }
});

test('[B23·Z2] jede Weg-Kennung, die der Kern der Nachfrage übergibt, bekommt eine Vorbelegung aus der Einordnung', () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  const reste = new Set(weitergabe.map(([, z]) => z.zweck));
  const tab = V.__zusatz.HERAUSGABE_ZWECK_WEGE;
  const vorsatz = V.__zusatz.HERAUSGABE_ZWECK_VORSATZ;
  const alle = [...Object.values(tab), ...Object.values(vorsatz)];
  for (const r of alle) assert.ok(reste.has(r), 'Schlüssel ' + r + ' steht in keiner Zeile der Einordnung');
  const allgemein = V.__zusatz.herausgabeZweckVorschlag('gibt-es-nicht');
  const kennungen = new Set();
  for (const m of KERN.matchAll(/_nachWeitergabeNachfragen\('([^']+)'/g)) kennungen.add(m[1]);
  assert.ok(kennungen.size >= 10, 'die Aufrufe sind gezählt, nicht vermutet');
  for (const k of kennungen) {
    const text = V.__zusatz.herausgabeZweckVorschlag(k.endsWith(':') ? k + 'x' : k);
    assert.ok(text && text.trim(), k + ': leere Vorbelegung');
    assert.notEqual(text, allgemein, k + ': fällt auf den allgemeinen Vorschlag zurück');
  }
  // anlass:/bereich-pdf: tragen ihre Kennung hinter dem Doppelpunkt
  assert.ok(V.__zusatz.herausgabeZweckVorschlag('anlass:pro-vertretung'));
});

test('[B23·Z2] herausgabeZweckVorschlag: unbekannter oder leerer Weg bekommt den allgemeinen Vorschlag, nie leer', () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  const f = V.__zusatz.herausgabeZweckVorschlag;
  for (const w of ['gibt-es-nicht', '', null, undefined]) {
    assert.ok(String(f(w)).trim(), 'leer für ' + String(w));
    assert.equal(f(w), V.__zusatz.STRINGS.herausgabeZweckVorschlagAllgemein);
  }
});

test('[B23·Z2] herausgabeVermerkEintragen: ohne Zweck gilt die Vorbelegung des Wegs, mit Zweck der eigene', async () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  await V.depotAnlegen(PW);
  const f = V.__zusatz.herausgabeVermerkEintragen;
  for (const [, z] of weitergabe) {
    const wege = Object.entries(V.__zusatz.HERAUSGABE_ZWECK_WEGE).filter(([, r]) => r === z.zweck).map(([k]) => k);
    for (const weg of wege) {
      const e = f(weg, { empfaenger: 'Frau Berger', umfang: 'Auszug' });
      assert.ok(e && e.zweck && e.zweck.trim(), weg + ': Eintrag ohne Zweck');
      assert.equal(e.zweck, V.__zusatz.herausgabeZweckVorschlag(weg));
      assert.equal(e.empfaenger, 'Frau Berger');
      assert.equal(e.umfang, 'Auszug');
      assert.match(e.herkunft, /^export:/);
    }
  }
  const eigen = f('isik', { empfaenger: 'Klinik', zweck: 'Operation', umfang: 'Auszug' });
  assert.equal(eigen.zweck, 'Operation');
  const leer = f('isik', { empfaenger: 'Klinik', zweck: '   ', umfang: 'Auszug' });
  assert.equal(leer.zweck, V.__zusatz.herausgabeZweckVorschlag('isik'));
});

test('[B23·Z2] herausgabeVermerkEintragen: mit Empfänger ein Eintrag im Protokoll, ohne Empfänger keiner (null)', async () => {
  const { V, document } = ladeKern({ zusatzBindungen: ZUSATZ });
  await V.depotAnlegen(PW);
  const f = V.__zusatz.herausgabeVermerkEintragen;
  assert.equal(V.getData().uebergabeProtokoll.length, 0);
  assert.ok(f('kbv-pka', { empfaenger: 'Praxis Dr. Lind', umfang: 'Vollmacht' }));
  assert.equal(V.getData().uebergabeProtokoll.length, 1, 'mit Empfänger entsteht ein Eintrag');
  assert.equal(V.getData().uebergabeProtokoll[0].empfaenger, 'Praxis Dr. Lind', 'der vorher gegebene Empfänger kommt im Vermerk an');
  assert.ok(!/id="up-empfaenger"/.test(String(document.getElementById('modal-inhalt').innerHTML || '')), 'der Vermerk fragt nicht ein zweites Mal (kein Nachfrage-Dialog)');
  for (const leer of [undefined, null, '', '   ']) {
    assert.equal(f('kbv-pka', { empfaenger: leer, zweck: 'x', umfang: 'Vollmacht' }), null, 'ohne Empfänger null');
  }
  assert.equal(f('kbv-pka'), null);
  assert.equal(V.getData().uebergabeProtokoll.length, 1, 'ohne Empfänger entsteht kein Eintrag');
});

test('[B23·Z2] der Dialog nach der Ausgabe belegt das Zweck-Feld vor — mit der Vorbelegung des Wegs oder dem mitgegebenen Zweck', async () => {
  const feld = (document) => String(document.getElementById('modal-inhalt').innerHTML).match(/id="up-zweck"[^>]*>/)[0];
  for (const [weg, zweck] of [['isik', undefined], ['anlass:x', undefined], ['gibt-es-nicht', undefined], ['isik', 'Mein "Zweck"']]) {
    const { V, document } = ladeKern({ zusatzBindungen: ZUSATZ });
    await V.depotAnlegen(PW);
    V._nachWeitergabeNachfragen(weg, 'download', null, zweck ? { zweck } : { umfang: 'Auszug' });
    const erwartet = zweck ? 'Mein &quot;Zweck&quot;' : V.__zusatz.herausgabeZweckVorschlag(weg);
    assert.ok(feld(document).includes('value="' + erwartet + '"'), weg + ': Zweck-Feld leer oder falsch: ' + feld(document));
    document.getElementById('up-empfaenger').value = 'Jemand';
    document.getElementById('up-umfang').value = 'Auszug';
    document.getElementById('up-zweck').value = feld(document).match(/value="([^"]*)"/)[1].replace(/&quot;/g, '"');   // der Test-DOM übernimmt `value` nicht selbst; ein Browser tut es
    await document.getElementById('m-ok').onclick();   // ohne Zutun am Zweck-Feld speichern
    const e = V.getData().uebergabeProtokoll;
    assert.equal(e.length, 1);
    assert.ok(e[0].zweck && e[0].zweck.trim());
  }
});

test('[B23·Z2] der Datei-Weg eines Wallet-Profils bekommt dieselbe Vorbelegung wie die Wallet-Übergabe', () => {
  const { V } = ladeKern({ zusatzBindungen: ZUSATZ });
  const f = V.__zusatz.herausgabeZweckVorschlag;
  const wallet = f('eudiw');
  assert.ok(wallet && wallet.trim());
  assert.equal(wallet, V.__zusatz.STRINGS.herausgabeZweckVorschlagWallet);
  for (const id of ['sd-jwt-vc-identitaet', 'sd-jwt-vc-finanzen', 'sd-jwt-vc-sozialversicherung']) {
    assert.equal(f(id), wallet, id + ': Datei-Weg ohne dieselbe Vorbelegung wie eudiw');
    assert.notEqual(f(id), V.__zusatz.STRINGS.herausgabeZweckVorschlagFormat, id + ': fällt auf den Format-Vorschlag zurück');
  }
});
