'use strict';
/* Fixture für tests/oeffentlicher-rotliste-vollstaendig.test.js: eine rote Suite mit zwei roten Subtests.
   Bewusst rot, nie von der Suite gefahren (kein .test.js). */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
describe('[Rotliste·Fixture·Suite] Suite mit zwei roten Subtests', () => {
  test('[Rotliste·Fixture·S1] erster roter Subtest', () => { assert.equal(1, 2); });
  test('[Rotliste·Fixture·S2] zweiter roter Subtest', () => { assert.equal(3, 4); });
});
