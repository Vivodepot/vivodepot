'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Abgeben eines Sub-Depots: der Text verspricht nicht mehr, als der Kern hält
   (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund: Bestätigung und Abschluss sagten „Nach dem Abgeben bleibt bei Ihnen
   keine Kopie“ und „Abgegeben. Bei Ihnen bleibt keine Kopie“ (EN „no copy
   remains with you“). subDepotAushaengen(…, { absicht: 'abgeben' }) entfernt
   den Umschlag aber nur aus der GEÖFFNETEN Datei; ältere Sicherungskopien der
   Datei von vor dem Abgeben enthalten ihn weiter. U2-ADR-123 („Reichweite“)
   verlangt, diese Grenze in Bürgertexten nicht zu überversprechen.
   Gehalten: DE und EN nennen die Datei, nicht „keine Kopie“; die Bestätigung
   nennt die älteren Sicherungskopien; der Kern entfernt den Umschlag
   tatsächlich (die Aussage „nicht mehr in Ihrer Datei“ bleibt wahr).
   ROT-BEWEIS: der bis v814 ausgelieferte Wortlaut, DE und EN.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const KENNUNGEN = ['strings:aushaengenBestaetigenText.text', 'strings:aushaengenFertigAbgegeben.text'];
const texte = (datei) => { const m = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', datei), 'utf8')); return m.texte || m; };
const UEBERVERSPRECHEN = /keine Kopie|no copy remains/i;

function befund(de, en) {
  const f = [];
  for (const k of KENNUNGEN) {
    for (const [wo, t] of [['DE', de[k]], ['EN', en[k]]]) {
      if (!t || !String(t).trim()) f.push(wo + ' ' + k + ': fehlt');
      else if (UEBERVERSPRECHEN.test(t)) f.push(wo + ' ' + k + ': verspricht „keine Kopie“');
    }
  }
  const best = String(de[KENNUNGEN[0]] || '');
  if (!/Ältere Sicherungskopien/.test(best)) f.push('DE Bestätigung: nennt die älteren Sicherungskopien nicht');
  if (!/Older backup copies/.test(String(en[KENNUNGEN[0]] || ''))) f.push('EN Bestätigung: nennt die älteren Sicherungskopien nicht');
  return f;
}

test('[Abgeben·Grenze] DE und EN nennen die Datei und die älteren Sicherungskopien, nicht „keine Kopie“', () => {
  assert.deepEqual(befund(texte('textsatz-de-modul.json'), texte('textsatz-en-modul.json')), []);
});

test('[Abgeben·Grenze·Rot-Beweis] der bis v814 ausgelieferte Wortlaut fällt, DE und EN', () => {
  const de = { [KENNUNGEN[0]]: 'Sie haben die Datei für {name} gespeichert. Haben Sie sie übergeben?\nNach dem Abgeben bleibt bei Ihnen keine Kopie.',
    [KENNUNGEN[1]]: 'Abgegeben. Bei Ihnen bleibt keine Kopie.' };
  const en = { [KENNUNGEN[0]]: "You've saved the file for {name}. Have you handed it over?\nOnce handed over, no copy remains with you.",
    [KENNUNGEN[1]]: 'Handed over. No copy remains with you.' };
  assert.equal(befund(de, en).length, 6);
});

test('[Abgeben·Grenze] was der Text noch sagt, hält der Kern: nach dem Abgeben ist der Umschlag nicht mehr in der Datei', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Abgeben-Grenze-2026!');
  V.akteurSelbstErklaeren('Probe');
  await V.subDepotAnlegen({ bezeichnung: 'Kind', inhaberin: 'Kind', verwaltungsTyp: 'verwaltet', subPasswort: 'Sub-Grenze-2026!' });
  const e = V.getData().verwalteteDepots[0];
  assert.ok(e.umschlag, 'Vorbedingung: der Umschlag liegt in der Datei');
  V.subDepotAushaengen(e.depotUUID, { absicht: 'abgeben', empfaenger: 'Kind' });
  const nach = V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID);
  assert.equal(nach.umschlag, undefined, 'nach dem Abgeben ist das Depot nicht mehr in der Datei');
  assert.equal(nach.status, 'abgegeben');
});
