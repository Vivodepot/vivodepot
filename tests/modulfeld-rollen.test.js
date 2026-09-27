'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Proben zu U2-ADR-290 — ein Modul darf sein eigenes Feld nicht nur benennen,
   sondern auch erklären.

   DIE SICHERHEITSGRENZE IST NICHT DIE ERLAUBNIS, SONDERN IHR RAND: eine fremde
   oder eine Kern-Kennung bleibt abgelehnt. Und die Umkehrung, die den Fehler
   unmöglich macht, den dieser Bau beinahe gemacht hätte: KEINE Rolle wird
   angenommen, die niemand abholt — sie wäre angenommen und wirkungslos.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function nimmt(V, kennung) {
  const r = V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1,
    texte: { [kennung]: 'Text' } });
  return !!(r.gueltig && Object.prototype.hasOwnProperty.call(r.texte, kennung));
}

test('[Modulfeld-Rollen] ein Modul darf sein eigenes Feld erklaeren, nicht nur benennen', () => {
  const { V } = ladeKern();
  for (const rolle of ['label', 'hint', 'beispiel', 'platzhalter']) {
    assert.ok(nimmt(V, 'identity.tpl_meinfeld.' + rolle),
      'die Feld-Rolle `' + rolle + '` wird abgelehnt — ein Autor kann sein Feld nicht erklaeren');
  }
});

test('[Modulfeld-Rollen·ROT-BEWEIS] fremde und Kern-Kennungen bleiben abgelehnt', () => {
  const { V } = ladeKern();
  // Ohne `tpl_`: das waere eine Kern-Kennung, die es noch nicht gibt — die Sicherheitsgrenze.
  assert.equal(nimmt(V, 'identity.neuesfeld.beispiel'), false,
    'eine Kennung ohne tpl_ wird angenommen — ein Modul koennte sich Kernverhalten aneignen');
  assert.equal(nimmt(V, 'identity.neuesfeld.label'), false, 'dito fuer label');
  // Der STRINGS-Namensraum bleibt zu.
  assert.equal(nimmt(V, 'strings:speichern.text'), false, 'der STRINGS-Namensraum ist offen');
  // Erfundene Rolle: nicht abgeholt, also nicht erlaubt.
  assert.equal(nimmt(V, 'identity.tpl_meinfeld.erfundeneRolle'), false,
    'eine erfundene Rolle wird angenommen');
});

test('[Modulfeld-Rollen·UMKEHRUNG] keine Rolle wird angenommen, die niemand abholt', () => {
  const { V } = ladeKern();
  const abgeholt = V.TEXTSATZ_ARTEN_FELD;
  assert.ok(Array.isArray(abgeholt) && abgeholt.length, 'die Feld-Rollenliste fehlt');

  // Rollen, die im eingebauten Satz vorkommen, aber NICHT vom Knoten-Fueller geholt werden:
  // sie werden von eigenen Wegen gelesen und gehoeren darum NICHT in die Modul-Erlaubnis.
  for (const rolle of ['hinweis', 'vorschlaege', 'name']) {
    assert.equal(abgeholt.includes(rolle), false,
      'Vorbedingung dieser Probe hat sich verschoben: `' + rolle + '` wird jetzt abgeholt');
    assert.equal(nimmt(V, 'identity.tpl_meinfeld.' + rolle), false,
      'die Rolle `' + rolle + '` wird angenommen, obwohl sie am Feld niemand abholt — '
      + 'angenommen und wirkungslos ist schlimmer als abgelehnt');
  }
});

test('[Modulfeld-Rollen·RATSCHE] die Erlaubnis IST die Abhol-Liste — keine zweite Liste', () => {
  const { V } = ladeKern();
  const abgeholt = V.TEXTSATZ_ARTEN_FELD;
  for (const rolle of abgeholt) {
    assert.ok(nimmt(V, 'identity.tpl_meinfeld.' + rolle),
      'die Rolle `' + rolle + '` wird am Feld abgeholt, aber einem Modul verweigert — '
      + 'die beiden Listen sind auseinandergelaufen');
  }
  // Und die Gegenrichtung: Assistenten-Rollen gehoeren NICHT dazu.
  for (const rolle of (V.TEXTSATZ_ARTEN_ASSISTENT || [])) {
    assert.equal(nimmt(V, 'identity.tpl_meinfeld.' + rolle), false,
      'die Assistenten-Rolle `' + rolle + '` wird an einem FELD angenommen');
  }
});

test('[Modulfeld-Rollen·Positivkontrolle] die Probe selbst erkennt eine Annahme', () => {
  const { V } = ladeKern();
  assert.equal(nimmt(V, 'identity.tpl_meinfeld.label'), true,
    'die Hilfsfunktion meldet nie true — dann sagen alle Ablehnungen oben nichts');
});
