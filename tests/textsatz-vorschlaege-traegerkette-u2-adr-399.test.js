'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   U2-ADR-399 · Trägerkette für `feld.<feldId>.vorschlaege` — seit der Kennungs-Umbenennung
   ohne Fall (umgestellt 15.09.2026, Entscheidung)
   ───────────────────────────────────────────────────────────────────────────
   DER FALL VON DAMALS (06.09.2026): `art` war eine katalogweit doppelt vergebene UnterFeld-ID
   mit ZWEI echten, verschiedenen Vorschlagslisten — `meine-menschen/unterhalt/art`
   (Unterhaltsarten) und `finanzen/konten/art` (Kontoarten). Die flache Kennung
   `feld.art.vorschlaege` konnte sie nicht unterscheiden; U2-ADR-399 führte darum
   `feld.<traeger>/<feldId>.vorschlaege` ein, nur dort, wo eine ID mehrfach vorkommt.

   WAS SICH GEÄNDERT HAT: die Kennungs-Kampagne (Umbauplan „Englisch vor v1") hat die beiden
   Unterfelder verschieden benannt — `people.maintenanceObligationsAnd/type` und
   `finance.accounts/accountType` (docs/umbau-englisch-vor-v1/kennung-mapping.json). Die
   Kollision gibt es nicht mehr, und mit ihr keinen Trägerketten-Schlüssel: der eingebaute Satz
   trägt die beiden Listen flach als `feld.type.vorschlaege` und `feld.accountType.vorschlaege`.

   DIESE PROBEN BELEGEN DEN NEUEN ZUSTAND, statt den alten festzuhalten: die Listen bleiben
   getrennt (Probe 1, Rot-Beweise 2/3), es gibt null Trägerketten-Schlüssel und keine
   UnterFeld-ID mit Vorschlägen mehr doppelt (Proben 4/5). Der Mechanismus selbst
   (`_vorschlaegeTextsatz(feldId, rueckfall, traeger)`) bleibt im Kern; entsteht wieder eine
   Kollision, wird Probe 5 rot und sagt, welche ID. Nachtrag: U2-ADR-399, 15.09.2026.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Trägerkette·aufgelöst] unterhalt/type und konten/accountType tragen verschiedene, echte Listen', () => {
  const { V } = ladeKern();
  const unterhalt = V._vorschlaegeTextsatz('type', ['RUECKFALL'], 'maintenanceObligationsAnd');
  const konten = V._vorschlaegeTextsatz('accountType', ['RUECKFALL'], 'accounts');
  assert.ok(unterhalt.includes('Kindesunterhalt'), 'unterhalt/type zeigt nicht die Unterhaltsarten-Liste');
  assert.ok(konten.includes('Girokonto'), 'konten/accountType zeigt nicht die Kontoarten-Liste');
  assert.ok(!unterhalt.includes('Girokonto'), 'unterhalt/type trägt Kontoarten — die alte Kreuzkontamination');
  assert.ok(!konten.includes('Kindesunterhalt'), 'konten/accountType trägt Unterhaltsarten — die alte Kreuzkontamination');
});

test('[Trägerkette·aufgelöst·Rot-Beweis] ein Modul für feld.type.vorschlaege wird angenommen', () => {
  const { V } = ladeKern();
  const modul = {
    modulTyp: 'textsatz', sprache: 'de-privat-messung-a319', moduleVersion: 1, anbieterId: 'test-a319',
    texte: { 'feld.type.vorschlaege': 'Erfundene Unterhaltsart Eins · Erfundene Unterhaltsart Zwei' },
  };
  const r = V.textsatzModulPruefen(modul);
  assert.equal(r.gueltig, true, r.grund || '');
  assert.deepEqual(r.verworfene, [], 'die flache Kennung muss angenommen werden — sonst prüft die Probe nichts');
});

test('[Trägerkette·aufgelöst·Rot-Beweis·live] über den echten Docking-Weg ändert sich NUR unterhalt/type, konten/accountType bleibt nativ', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('a319-traegerkette-pw');
  V.akteurSelbstErklaeren('Testerin A319');
  const modul = {
    modulTyp: 'textsatz', sprache: 'a319-testsprache', moduleVersion: 1, anbieterId: 'test-a319',
    texte: { 'feld.type.vorschlaege': 'Erfundene Unterhaltsart Eins · Erfundene Unterhaltsart Zwei' },
  };
  const r = V.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, r.grund || '');
  // Der echte Aufrufer übergibt als `rueckfall` das native Array der Feld-Definition (U2-ADR-363:
  // bei aktivem Fremdmodul kein automatischer Rückfall auf Deutsch).
  const nativKonten = V.TEXTSATZ_DE_QUELLE.texte['feld.accountType.vorschlaege'].split('·').map((s) => s.trim());
  V.getData().textsprache = 'a319-testsprache';
  V._textsatzModuleAusDepotAnmelden(V.getData());
  try {
    const unterhalt = V._vorschlaegeTextsatz('type', ['RUECKFALL'], 'maintenanceObligationsAnd');
    const konten = V._vorschlaegeTextsatz('accountType', nativKonten, 'accounts');
    assert.deepEqual(unterhalt, ['Erfundene Unterhaltsart Eins', 'Erfundene Unterhaltsart Zwei'],
      'die angedockte Übersetzung für unterhalt/type kommt nicht an');
    assert.deepEqual(konten, nativKonten,
      'konten/accountType wurde von einem Modul verändert, das nur type übersetzt — die Trennung ist durchlässig');
  } finally {
    V.getData().textsprache = 'de';
  }
});

test('[Trägerkette·aufgelöst] der eingebaute Satz trägt null Trägerketten-Schlüssel und keine flache feld.art.vorschlaege', () => {
  const { V } = ladeKern();
  const T = V.TEXTSATZ_DE_QUELLE.texte;
  assert.deepEqual(Object.keys(T).filter((k) => /^feld\.[^.]+\/[^.]+\.vorschlaege$/.test(k)), [],
    'ein Trägerketten-Schlüssel steht wieder im Satz — dann gibt es wieder eine Kollision, s. Probe unten');
  assert.ok(Object.prototype.hasOwnProperty.call(T, 'feld.type.vorschlaege'));
  assert.ok(Object.prototype.hasOwnProperty.call(T, 'feld.accountType.vorschlaege'));
  assert.ok(!Object.prototype.hasOwnProperty.call(T, 'feld.art.vorschlaege'), 'die alte, mehrdeutige Kennung ist zurück');
  assert.ok(Object.prototype.hasOwnProperty.call(T, 'feld.countries.vorschlaege'),
    'die flache Kennung eines nicht mehrdeutigen UnterFelds (früher laender) muss bleiben — sonst verlieren Sprachmodule');
});

test('[Trägerkette·aufgelöst·Wächter] katalogweit trägt keine UnterFeld-ID mit Vorschlägen mehr als ein Feld', () => {
  const { V } = ladeKern();
  const traeger = {};
  for (const s of V.bereicheAlle()) {
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        for (const uf of (f.unterFelder || [])) {
          if (Array.isArray(uf.vorschlaege) && uf.vorschlaege.length) (traeger[uf.id] = traeger[uf.id] || []).push(s.id + '.' + f.id);
        }
      }
    }
  }
  assert.ok(Object.keys(traeger).length > 0, 'Positivkontrolle: es gibt überhaupt UnterFelder mit Vorschlägen');
  const doppelt = Object.entries(traeger).filter(([, liste]) => liste.length > 1);
  assert.deepEqual(doppelt, [],
    'eine UnterFeld-ID mit Vorschlägen steht wieder an mehreren Feldern — U2-ADR-399 hat wieder einen Fall, die Trägerkette muss greifen');
});
