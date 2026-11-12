'use strict';
/* Das Messwerkzeug für Muster eines XSD (tools/xsd-muster-messen.mjs), an der erfundenen Fixture
   tests/fixtures/xsd-muster/beispiel-muster.xsd. In XML Schema ist jedes Muster ganz verankert und `$` ein gewöhnliches
   Zeichen: ein E-Mail-Muster, das auf `$` endet, lehnt eine übliche Adresse ab und nimmt sie nur mit angehängtem `$`.
   Hier steht, was ohne Werkzeug prüfbar ist; den Lauf mit dem KoSIT-Validator samt Rot-Beweis (Gegenprobe ohne `$`)
   hält tests/kosit-validator-lauf.test.js, dort mit derselben Weiche für einen fehlenden Validator. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'xsd-muster-messen.mjs');
const laden = () => import(WERKZEUG);
const MIT_DOLLAR = '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{1,63}$';

test('[XSD-Muster·Auszug] jedes Muster der Fixture mit seinem Element, ohne Werkzeug', async () => {
  const { musterAusXsd, FIXTURE } = await laden();
  const m = musterAusXsd(fs.readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(m.map((x) => [x.muster, x.elemente]), [[MIT_DOLLAR, ['X99000001']], [MIT_DOLLAR.slice(0, -1), ['X99000002']]]);
});

test('[XSD-Muster·Schema] das kleine Schema trägt das Muster unverändert, der Wert wird maskiert', async () => {
  const { kleinesSchema, instanz } = await laden();
  assert.ok(kleinesSchema(MIT_DOLLAR).includes('<xs:pattern value="' + MIT_DOLLAR + '" />'));
  assert.ok(instanz('a<b&c').includes('>a&lt;b&amp;c</wert>'));
});
