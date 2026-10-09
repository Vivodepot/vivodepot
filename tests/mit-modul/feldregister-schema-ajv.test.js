'use strict';
/* U2-ADR-NNN: feldregister.json besteht ihr Schema mit Ajv 2020 im Strict-Modus — dem Prüfer, den Integratoren nehmen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Ajv2020 = require('ajv/dist/2020');
const { bauen } = require('../../tools/feldregister-bauen.js');
const SCHEMA = require('../../docs/feldregister/feldregister-schema.json');

test('[Feldregister·Schema·Ajv strict] die erzeugte Liste besteht ihr Schema', () => {
  const pruefe = new Ajv2020({ strict: true, allErrors: true }).compile(SCHEMA);
  const ok = pruefe(JSON.parse(bauen({ datum: '2026-10-06' }).json));
  assert.ok(ok, JSON.stringify(pruefe.errors && pruefe.errors.slice(0, 3)));
});

test('[Feldregister·Schema·Rot-Beweis] ohne Lizenz, mit fremder Lizenz oder mit einbuchstabigem Segment fällt sie durch', () => {
  const pruefe = new Ajv2020({ strict: true }).compile(SCHEMA);
  const r = JSON.parse(bauen({ datum: '2026-10-06' }).json);
  const ohne = { ...r }; delete ohne.lizenz;
  assert.equal(pruefe(ohne), false);
  assert.equal(pruefe({ ...r, lizenz: { ...r.lizenz, spdx: 'CC-BY-4.0' } }), false);
  assert.equal(pruefe({ ...r, felder: [{ ...r.felder[0], kennung: 'finance.konten/x' }] }), false);
});
