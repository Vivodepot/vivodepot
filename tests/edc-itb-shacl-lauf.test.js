'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Prüferlauf für eingehende Bildungsnachweise (U2-ADR-443) — in der Suite, als todo
   ────────────────────────────────────────────────────────────────────────
   Gemessen am 28.09.2026 am offiziellen Werkzeug (Docker-Image per Digest, Befund-Ratsche
   EDC-SHACL-UNGEMESSEN damit geschlossen). Fehlt das Werkzeug auf einer Maschine (kein Docker,
   nicht beschafft: node tools/itb-shacl-beschaffen.mjs), steht jeder Fall hier als `todo` —
   mitgezählt und sichtbar, nie grün. Ist es da (vorhanden().ok), fällt das todo weg und jedes
   Urteil muss dem gemessenen entsprechen: dann ist ein abweichendes Urteil ein roter Test.
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

test('[EDC·SHACL·Lauf] jeder Fall urteilt wie gemessen — was der Kern herausgibt, gleich wie das EU-Beispiel: die gesiegelten bestehen edc-generic-full', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const faelle = await a.artefakte();
  assert.ok(faelle.some((f) => f.herkunft === 'kern-rundweg' && f.erwartet === 'gueltig'), 'ohne gültigen kern-rundweg-Fall trüge der Lauf kein „echt"');
  for (const f of faelle) {
    const u = a.urteile(v, f.pfad, f.standard);
    assert.equal(u.gelesen, true, f.name + ': kein Bericht — ' + u.fehler.join(' | '));
    assert.equal(u.gueltig, f.erwartet === 'gueltig', f.name + ': ' + u.fehler.join(' | '));
  }
});

/* Gemessen 28.09.2026: der ungesiegelte Entwurf fällt an genau zwei Stellen, die erst die Siegelung
   füllt. Fällt er an einer anderen, hat sich etwas geändert — am Beispiel, an den Shapes oder am Kern. */
test('[EDC·SHACL·Lauf] der ungesiegelte Entwurf fällt aus dem gemessenen Grund: ohne issued, Aussteller ohne eIDAS-Kennung', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const f = (await a.artefakte()).find((x) => x.name === 'edci-europass-certofpart-unsigned·kern-rundweg');
  const u = a.urteile(v, f.pfad, f.standard);
  assert.equal(u.gelesen, true);
  assert.equal(u.fehler.length, 2, u.fehler.join(' | '));
  assert.ok(u.fehler.some((x) => x.includes('credentials#issued')), u.fehler.join(' | '));
  assert.ok(u.fehler.some((x) => x.includes('IssuerNodeShape')), u.fehler.join(' | '));
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
