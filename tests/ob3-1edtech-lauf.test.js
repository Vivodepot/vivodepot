'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Prüferlauf für eingehende Open Badges 3.0 (U2-ADR-445) — gegen den offiziellen Prüfer von 1EdTech
   ────────────────────────────────────────────────────────────────────────
   Gemessen am 28.09.2026 am Werkzeug, gebaut aus der offiziellen Quelle (tools/1edtech-validator/Dockerfile,
   Tag v1.11.3), ohne Netz. Fehlt das Werkzeug auf einer Maschine (kein Docker, nicht gebaut:
   node tools/1edtech-validator-beschaffen.mjs), steht jeder Fall als `todo` — sichtbar, nie grün. Ist es da,
   muß jedes Urteil dem gemessenen entsprechen. Scharf („echt" und ungemessen ist rot) wird es im pre-push, bei
   Anlass (scripts/pruefe-standards-echt-gate.js).
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ADAPTER = path.join(__dirname, 'konformitaet', 'adapter', '1edtech-validator.mjs');
const laden = async () => (await import(ADAPTER)).default;
after(async () => (await import(ADAPTER)).aufraeumen());

async function umgebungOderTodo(t) {
  const a = await laden();
  const v = a.vorhanden();
  if (!v.ok) t.todo('1EdTech-Prüfer ungemessen: ' + v.grund);
  return { a, v };
}

test('[OB3·Lauf] der 1EdTech-Prüfer ist beschafft', async (t) => {
  const { v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
});

test('[OB3·Lauf] jeder Fall urteilt wie gemessen — was der Kern herausgibt, gleich wie die Testdatei: jede der vier Formen hat einen gültigen Fall', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const faelle = await a.artefakte();
  for (const endung of ['.json', '.jwt', '.png', '.svg']) {
    assert.ok(faelle.some((f) => f.herkunft === 'kern-rundweg' && f.erwartet === 'gueltig' && f.pfad.endsWith(endung)), 'ohne gültigen kern-rundweg-Fall ' + endung);
  }
  for (const f of faelle) {
    const u = a.urteile(v, f.pfad, f.standard);
    assert.equal(u.gelesen, true, f.name + ': kein Bericht — ' + u.fehler.join(' | '));
    assert.equal(u.gueltig, f.erwartet === 'gueltig', f.name + ': ' + u.fehler.join(' | '));
  }
});

/* Gemessen 28.09.2026: die beiden ungültigen Testdateien fallen aus inhaltlichen Gründen, nicht am fehlenden Netz. */
test('[OB3·Lauf] die ungültigen Testdateien fallen aus dem gemessenen Grund: Entwurfsstand bzw. abgelaufen', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  const faelle = await a.artefakte();
  const jwt = a.urteile(v, faelle.find((f) => f.name === 'ob3-simple·kern-rundweg' && f.pfad.endsWith('.jwt')).pfad, 'open-badges-3');
  assert.ok(jwt.fehler.some((x) => /required property 'achievement' not found/.test(x)), jwt.fehler.join(' | '));
  const komplett = a.urteile(v, faelle.find((f) => f.name === 'ob3-complete·kern-rundweg').pfad, 'open-badges-3');
  assert.ok(komplett.fehler.some((x) => /has expired/.test(x)), komplett.fehler.join(' | '));
});

test('[OB3·Lauf·Negativkontrolle] ein Badge ohne Aussteller-Knoten wird abgelehnt', async (t) => {
  const { a, v } = await umgebungOderTodo(t);
  assert.equal(v.ok, true, 'ungemessen: ' + v.grund);
  for (const k of await a.kaputt()) {
    const u = a.urteile(v, k.pfad, k.standard);
    assert.equal(u.gelesen, true, 'kein Bericht');
    assert.equal(u.gueltig, false, 'der Prüfer lässt durch: ' + k.warum);
  }
});
