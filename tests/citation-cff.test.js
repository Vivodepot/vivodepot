'use strict';
/* CITATION.cff (21.10.2026): die Software trug als `doi` den Sammel-DOI eines Arbeitspapiers. Ein Zitat der Software zeigte
   so auf einen Aufsatz. Diese Probe hält fest: der DOI auf oberster Ebene, falls es einen gibt, ist ein belegter Software-DOI
   und keiner, der unter `references` als Publikation steht. Gelesen wird zeilenweise, ohne YAML-Bibliothek. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function lesen(text) {
  const oben = /^doi:\s*(\S+)\s*$/m.exec(text);
  const referenzen = text.split(/^references:\s*$/m)[1] || '';
  const eintraege = referenzen.split(/^\s{2}- /m).slice(1).map((e) => ({
    typ: (/^type:\s*(\S+)/m.exec(e.replace(/^\s+/gm, '')) || [])[1],
    doi: (/^doi:\s*(\S+)/m.exec(e.replace(/^\s+/gm, '')) || [])[1],
  }));
  return { doi: oben ? oben[1] : null, eintraege };
}

/* Eigene Software-DOIs (Zenodo-Software-Record). Heute keiner; ein neuer kommt nur mit Beleg hierher. */
const SOFTWARE_DOIS = Object.freeze([]);

function befunde(text) {
  const { doi, eintraege } = lesen(text);
  const b = [];
  if (doi && !SOFTWARE_DOIS.includes(doi)) b.push('DOI auf oberster Ebene ist kein belegter Software-DOI: ' + doi);
  if (doi && eintraege.some((e) => e.doi === doi)) b.push('der DOI der Software ist der einer Referenz: ' + doi);
  for (const e of eintraege) if (e.doi && !e.typ) b.push('Referenz ohne type: ' + e.doi);
  return b;
}

test('[CITATION.cff] die Software trägt keinen DOI einer Publikation', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'CITATION.cff'), 'utf8');
  assert.deepEqual(befunde(text), []);
  assert.doesNotMatch(text, /^doi:\s*10\.5281\/zenodo\.22708070/m);
});

test('[CITATION.cff·Rot-Beweis] der Papier-DOI auf oberster Ebene fällt, mit und ohne Referenz', () => {
  // Die Fassung bis 21.10.2026 (öffentlich ab v1.0.933): doi auf oberster Ebene, keine references.
  const alt = 'type: software\ndoi: 10.5281/zenodo.22708070\nlicense: EUPL-1.2\n';
  assert.deepEqual(befunde(alt), ['DOI auf oberster Ebene ist kein belegter Software-DOI: 10.5281/zenodo.22708070']);
  const doppelt = 'type: software\ndoi: 10.5281/zenodo.1\nreferences:\n  - type: article\n    doi: 10.5281/zenodo.1\n';
  assert.equal(befunde(doppelt).length, 2);
});
