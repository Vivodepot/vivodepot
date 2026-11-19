'use strict';
/* Fixture für tests/oeffentlicher-rotliste-vollstaendig.test.js. Bewusst rot, nie von der Suite gefahren (kein .test.js). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
test('[Rotliste·Fixture·B] roter Fixture-Test in der zweiten Datei', () => { assert.equal('x', 'y'); });
