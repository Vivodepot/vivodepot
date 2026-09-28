'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Prüferlauf für eingehende Bildungsnachweise (U2-ADR-443) — in der Suite, als todo
   ────────────────────────────────────────────────────────────────────────
   Befund-Ratsche EDC-SHACL-UNGEMESSEN (MITTEL, Eigentümer im Eintrag): der ITB-SHACL-Validator
   ist nicht beschafft. Solange das so ist, steht jeder Fall hier als `todo` — mitgezählt und
   sichtbar, ohne die Suite zu blockieren. Ist das Werkzeug da (vorhanden().ok), fällt das
   todo weg und dieselben Fälle MÜSSEN grün laufen: dann ist ein rotes Urteil ein roter Test.
   Eine rote Probe außerhalb der Suite überlebt die Sitzung nicht, die sie geschrieben hat —
   darum steht sie hier, mitgezählt.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const laden = async () => (await import(path.join(__dirname, 'konformitaet', 'adapter', 'itb-shacl.mjs'))).default;
after(async () => (await import(path.join(__dirname, 'konformitaet', 'adapter', 'itb-shacl.mjs'))).aufraeumen());
const TODO = 'EDC-SHACL-UNGEMESSEN (Befund-Ratsche): ';

async function umgebungOderTodo(t) {
  const a = await laden();
  const v = a.vorhanden();
  if (!v.ok) t.todo(TODO + v.grund);
  return { a, v };
}

test('[EDC·SHACL·Lauf] der ITB-SHACL-Validator ist beschafft', async (t) => {
  const { v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
});

test('[EDC·SHACL·Lauf] jeder Fall — was der Kern herausgibt und das EU-Beispiel — besteht das Profil edc-generic-full', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  for (const f of await a.artefakte()) {
    const u = a.urteile(v, f.pfad, f.standard);
    assert.equal(u.gelesen, true, f.name + ': kein Bericht');
    assert.equal(u.gueltig, f.erwartet === 'gueltig', f.name + ': ' + u.fehler.join(' | '));
  }
});

test('[EDC·SHACL·Lauf·Negativkontrolle] ein Credential ohne Aussteller wird abgelehnt', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  for (const k of await a.kaputt()) {
    const u = a.urteile(v, k.pfad, k.standard);
    assert.equal(u.gelesen, true, 'kein Bericht');
    assert.equal(u.gueltig, false, 'der Prüfer lässt durch: ' + k.warum);
  }
});
