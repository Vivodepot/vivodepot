'use strict';
/* Schutz-Wagen S4 in der Lese-App — derselbe Fehler, zweiter Träger.

   GEMESSEN (05.10.2026, Basis e50bdafd2): ein Textsatz-Modul in der Datei mit `regeln.waehrung: 'USD'` machte
   `textsatzRegeln().waehrung` der Lese-App zu USD. Die Regel hat heute weder hier noch im Kern einen Leser (A479-Kopf in
   vivodepot-lesen.html), aber der Wert lag offen da — der erste Leser hätte die Währung der Datei übernommen.
   DIE REGEL wie im Kern: die Währung nur von einem Modul, das nach Inhalt ab Werk ist oder über die eigene Treuhand
   nachgeprüft wurde (`_waehrungNurAusSaatLesen` → `_textsatzSchutzVertraut`). Texte und übrige Regeln bleiben. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const lesen = () => { const r = ladeLesen(); return r.V || r; };
const usd = (extra) => Object.assign({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
  texte: {}, regeln: { waehrung: 'USD', sprachkennung: 'fr-FR' } }, extra || {});

test('[Lese·Währung·Rot-Beweis] ein Datei-Modul mit waehrung USD setzt keine Währung, seine übrigen Regeln gelten', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [usd()] });
  const regeln = L.textsatzRegeln();
  assert.equal(regeln.sprachkennung, 'fr-FR', 'Vorbedingung: das Modul wirkt mit seinen Regeln');
  assert.equal(regeln.waehrung, L.TEXTSATZ_REGELN_EINGEBAUT.waehrung, 'der eingebaute Wert, wie ohne Modul');
  assert.notEqual(regeln.waehrung, 'USD');
});

test('[Lese·Währung·Selbstauskunft] „ab Werk“, „geprüft“, „intern“ aus dem Modul selbst setzen keine Währung', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [usd({ abWerk: true, ungeprueft: false, pruefstufe: 'intern', anbieterId: 'vivodepot' })] });
  assert.equal(L.textsatzRegeln().sprachkennung, 'fr-FR', 'Vorbedingung: das Modul wirkt');
  assert.equal(L.textsatzRegeln().waehrung, L.TEXTSATZ_REGELN_EINGEBAUT.waehrung, 'der eingebaute Wert, wie ohne Modul');
  assert.notEqual(L.textsatzRegeln().waehrung, 'USD');
});

test('[Lese·Währung·Mitschrift] ein Modul, das sich als Ab-Werk-Mitschrift ausgibt, setzt keine Währung', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, abWerkMitschrift: { sprache: usd() } });
  assert.equal(L.textsatzRegeln().sprachkennung, 'fr-FR', 'Vorbedingung: die Mitschrift wirkt');
  assert.equal(L.textsatzRegeln().waehrung, L.TEXTSATZ_REGELN_EINGEBAUT.waehrung, 'der eingebaute Wert, wie ohne Modul');
  assert.notEqual(L.textsatzRegeln().waehrung, 'USD');
});

test('[Lese·Währung·Spur] der Verwurf steht benannt in der Spur, als bewusste Nichtannahme und nicht als Verlust', () => {
  const L = lesen();
  L._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [usd()] });
  const eintrag = L._verwuerfeLesen().find((x) => x.grund === 'waehrung-nur-ab-werk');
  assert.ok(eintrag, 'der Verwurf ist benannt');
  assert.equal(eintrag.verlust, false, 'keine Lücke im Inhalt: die Regel hat keinen Leser, die Texte wirken');
});
