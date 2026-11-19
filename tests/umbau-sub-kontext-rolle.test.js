'use strict';
/* ═════════════════════════════════════════════════════════════════
   Umbau U-1, Kontextzeile im Sub-Depot nach dem Desktop-Dummy (16.11.2026).

   Der Dummy (freigegeben 13.11.2026) zeigt unter der Kopfzeile: „Sie sind im Depot von <Name> · Sie verwalten es als
   <Rolle>“ mit dem Namen fett, rechts „Zurück zu Ihrem Depot“. Der Kern sagte „Sie sehen jetzt das Depot von <Name>.“
   und „Zurück zu meinem Depot“, die Rolle fehlte.

   Die Rolle kommt aus der gespeicherten Beziehung (HL7 V3 RoleCode, beziehungZu: wer das Sub-Depot führt, ist zur Person
   …). Der Code kennt kein Geschlecht; aus PRN wird „Elternteil“, nicht „Mutter“. Ohne gültige Beziehung (keine oder OTH)
   steht keine Rolle und kein „ · “ da.

   Proben:
   [U-1·Wortlaut]   Name fett, Wortlaut nach Dummy, Rückweg „Zurück zu Ihrem Depot“.
   [U-1·Rolle]      mit Beziehung PRN: „ · Sie verwalten es als Elternteil“.
   [U-1·ohne Rolle] ohne Beziehung: keine Rolle, kein Trenner.
   [U-1·Rolle · Rot-Beweis] ein Kern, der die Rolle nicht liest, fällt an [U-1·Rolle].
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ANKER = 'anker-pw-u1', SUB = 'sub-pw-u1';

/* Der Name steht fett: das Markup trägt ihn in <b id="sub-kontext-name">. */
test('[U-1·Wortlaut · Markup] der Name steht in einem <b> der Kontextzeile', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(html.includes('<span id="sub-kontext-vor"></span><b id="sub-kontext-name"></b><span class="sub-kontext-rolle" id="sub-kontext-rolle"></span>'));
});

async function imSubDepot(k, beziehungZu) {
  const { V, document } = k;
  await V.depotAnlegen(ANKER);
  V.akteurSelbstErklaeren('Erika');
  const angaben = { bezeichnung: 'Depot Mia', inhaberin: 'Mia Mustermann', verwaltungsTyp: 'verwaltet' };
  if (beziehungZu) angaben.beziehungZu = beziehungZu;
  const e = await V.subDepotAnlegen(angaben, SUB);
  V.subDepotVertrauenSchliessen(e.depotUUID);
  V.betreteApp();
  let dialog = null;
  const echt = V.ui.modal;
  V.ui.modal = (opt) => { dialog = opt; return () => {}; };
  try { V.flowSubDepotEntsiegeln(e.depotUUID); } finally { V.ui.modal = echt; }
  assert.ok(dialog && typeof dialog.onPrimaer === 'function', 'Vorbedingung: der Dialog „Mit Passwort öffnen“ erscheint');
  document.getElementById('sub-auf').value = SUB;
  await dialog.onPrimaer(() => {});
  const zeile = document.getElementById('sub-kontextzeile');
  assert.equal(zeile.hidden, false, 'Vorbedingung: die Kontextzeile ist sichtbar');
  // Die Zeile besteht aus drei festen Teilen im Markup: Einleitung, Name (<b>), Rolle.
  const teil = (id) => document.getElementById(id).textContent;
  return { text: teil('sub-kontext-vor') + teil('sub-kontext-name') + teil('sub-kontext-rolle'), fett: teil('sub-kontext-name'),
    knopf: document.getElementById('vm-zurueck').textContent };
}

test('[U-1·Wortlaut] Name fett, Wortlaut nach Dummy, Rückweg „Zurück zu Ihrem Depot“', async () => {
  const z = await imSubDepot(ladeKern({ backen: true }), null);
  assert.equal(z.fett, 'Mia Mustermann');
  assert.ok(z.text.startsWith('Sie sind im Depot von Mia Mustermann'), z.text);
  assert.equal(z.knopf, 'Zurück zu Ihrem Depot');
});

test('[U-1·Rolle] mit Beziehung PRN steht „ · Sie verwalten es als Elternteil“', async () => {
  const z = await imSubDepot(ladeKern({ backen: true }), 'PRN');
  assert.equal(z.text, 'Sie sind im Depot von Mia Mustermann · Sie verwalten es als Elternteil');
});

test('[U-1·ohne Rolle] ohne Beziehung keine Rolle und kein Trenner', async () => {
  const z = await imSubDepot(ladeKern({ backen: true }), null);
  assert.equal(z.text, 'Sie sind im Depot von Mia Mustermann');
  const oth = await imSubDepot(ladeKern({ backen: true }), 'OTH');
  assert.equal(oth.text, 'Sie sind im Depot von Mia Mustermann', 'OTH ist keine Beziehung');
});

/* Rot-Beweis: ein Kern, dessen Kontextzeile die Rolle nicht liest (der Stand vor U-1-Rest), fällt an [U-1·Rolle]. */
function kernOhneRolle() {
  const original = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const anker = '    const rolle = subKontextRolle();';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker steht genau einmal');
  const tmp = path.join(os.tmpdir(), 'umbau-sub-kontext-rolle-' + process.pid + '.html');
  fs.writeFileSync(tmp, original.replace(anker, "    const rolle = '';"));
  try { return ladeKern({ htmlPfad: tmp, backen: true }); } finally { fs.rmSync(tmp, { force: true }); }
}
test('[U-1·Rolle · Rot-Beweis] ein Kern ohne Rolle in der Kontextzeile fällt auf', async () => {
  const z = await imSubDepot(kernOhneRolle(), 'PRN');
  assert.notEqual(z.text, 'Sie sind im Depot von Mia Mustermann · Sie verwalten es als Elternteil');
});
