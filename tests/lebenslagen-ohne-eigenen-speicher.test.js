'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Verfallsbedingung der Grundlinie, als Probe: eine Lebenslage trägt keinen eigenen Speicher (02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Mitschrift-Grundlinie führt LEBENSLAGEN_KATALOG als „fuehrt-nicht", obwohl der Katalog seit dem
   Kachel-Schnitt je Produkt verschieden ist (Privat trägt ihn, Pro nicht). Das trägt nur, solange eine Lage eine Sicht auf
   Bereichsfelder ist („ein Heim pro Datum", U2-ADR-117): ihre Werte liegen in Bereichen, und die ruhenden Bereiche halten sie
   in jedem Produkt lesbar. Bekommt eine Lage eigenen Speicher, muss die Zeile ein Fach werden — diese Probe wird dann rot.
   Geprüft wird beides, was eigenen Speicher ausmachen würde:
   (1) jeder Eintrag in `felder` jeder Lage ist ein Verweis „<bereich>.<feld>", kein eigenes Feld-Objekt;
   (2) ein leeres Depot hat keinen Topf für Lagen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'lebenslagen-katalog-modul.json'), 'utf8')).bausteine;
const VERWEIS = /^[A-Za-z][A-Za-z0-9]*\.[^.\s]/;
const TOPF = /lebenslage|baustein|^lagen?($|[A-Z])/i;   // nicht „…vorLAGEnModule“

function eigenerSpeicher(bausteine, depot) {
  const funde = [];
  for (const lage of bausteine) {
    for (const f of (lage.felder || [])) if (typeof f !== 'string' || !VERWEIS.test(f)) funde.push(lage.id + ': ' + JSON.stringify(f));
  }
  for (const k of Object.keys(depot)) if (TOPF.test(k)) funde.push('Depot-Topf: ' + k);
  return funde;
}

test('[Probe] keine Lebenslage trägt eigenen Speicher', () => {
  const { V } = ladeKern();
  assert.deepEqual(eigenerSpeicher(KATALOG, V.leeresDepot()), []);
  assert.ok(KATALOG.length > 0 && KATALOG.some((l) => (l.felder || []).length), 'der Katalog ist nicht leer');
});

test('[Rot-Beweis] ein eigenes Feld-Objekt in einer Lage oder ein Lagen-Topf im Depot wird gefunden', () => {
  const lage = { id: 'probe', felder: ['identity.givenName', { id: 'eigenes', typ: 'text' }, 'ohnePunkt'] };
  assert.deepEqual(eigenerSpeicher([lage], { sektoren: {}, lebenslagen: {} }),
    ['probe: {"id":"eigenes","typ":"text"}', 'probe: "ohnePunkt"', 'Depot-Topf: lebenslagen']);
});
