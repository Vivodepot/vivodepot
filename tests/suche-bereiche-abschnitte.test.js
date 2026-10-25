'use strict';
/* Suche findet Bereiche und Abschnitte (UX-Durchsicht 03.10.2026, umgesetzt 18.10.2026): „Haustier“ fand den Abschnitt
   „Haustiere“ unter „Identität & Person“ nicht, „Tier“ und „Hund“ auch nicht. Klasse: jeder sichtbare Bereichs- und
   Abschnittsname ist über die Suche auffindbar, und jeder Bereich trägt mindestens ein Alltagswort im Suchkatalog. Die
   Alltagswörter stehen im Textsatz (suche:alltag.<id>, DE und EN), welche Einträge Wörter tragen, entscheidet das Sprachmodul. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
/* Gesamtsicht der Alltagswörter für diese Probe (19.10.2026): der Kern liest je Kennung über _sucheAlltag; die Liste der Kennungen
   kommt aus dem Sprachmodul des Produkts (_sprachBasis). Keine Lesehilfe im Kern, die nur Proben erreichen (A253). */
const alltagGesamt = (V) => {
  const raus = {};
  for (const k of Object.keys(V._sprachBasis())) {
    if (!k.startsWith('suche:alltag.')) continue;
    const w = V._sucheAlltag(k.slice('suche:alltag.'.length));
    if (w) raus[k.slice('suche:alltag.'.length)] = w;
  }
  return raus;
};

const { V } = ladeKern();
const findet = (wort, label) => V._sucheTreffer(wort).some((e) => e.label === label);
const DE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;

/* Diskriminanten der drei Klassenwächter: je eine Verletzungsliste. */
function namenOhneTreffer() {
  const fehlt = [];
  for (const s of V.bereicheAlle()) {
    const namen = [s.label].concat((s.sektionen || []).map((x) => x.label).filter(Boolean));
    for (const n of namen) if (!findet(n, n)) fehlt.push(s.id + ': ' + n);
  }
  return fehlt;
}
function bereicheOhneAlltagswort() {
  const fehlt = [];
  for (const s of V.bereicheAlle()) {
    const w = alltagGesamt(V)[s.id];
    if (!Array.isArray(w) || !w.length) { fehlt.push(s.id + ': kein Alltagswort'); continue; }
    if (!w.some((x) => findet(x, s.label))) fehlt.push(s.id + ': Alltagswort führt nicht zum Bereich');
  }
  return fehlt;
}
function alltagOhneWoerter(ids) {
  const fehlt = [];
  for (const id of ids) for (const [sprache, T] of [['DE', DE], ['EN', EN]]) {
    const t = T['suche:alltag.' + id];
    if (typeof t !== 'string' || !t.split(',').map((x) => x.trim()).filter(Boolean).length) fehlt.push(sprache + ' ' + id);
  }
  return fehlt;
}

test('[Suche·Haustier] Haustier, Tier, Hund und Katze finden den Bereich „Tiere“, „Haustiere“ den gleichnamigen Abschnitt', () => {
  for (const w of ['Haustier', 'haustier', 'Tier', 'Hund', 'Katze']) assert.ok(findet(w, 'Tiere'), w);
  assert.equal(V._sucheTreffer('Hund').find((e) => e.label === 'Tiere').quelle, 'bereich');
  const t = V._sucheTreffer('Haustiere').find((e) => e.label === 'Haustiere');
  assert.equal(t.quelle, 'abschnitt');
  assert.equal(V._sucheTreffer('Haustiere')[0].label, 'Haustiere', 'der gleichnamige Treffer steht vorn');
});

test('[Suche·Klasse] jeder Bereichs- und Abschnittsname findet sich selbst, auch in Singular-/Pluralform', () => {
  assert.ok(V.bereicheAlle().length >= 13, 'Vorbedingung: die Bereiche sind geladen (sonst wäre die Probe leer grün)');
  assert.deepEqual(namenOhneTreffer(), []);
});

test('[Suche·Klasse] jeder Bereich trägt mindestens ein Alltagswort, und es führt zu ihm', () => {
  assert.ok(V.bereicheAlle().length >= 13, 'Vorbedingung: die Bereiche sind geladen');
  assert.deepEqual(bereicheOhneAlltagswort(), []);
});

test('[Suche·Textsatz] jede suche:alltag-Kennung hat Wörter in DE und EN; der Kern trägt keine Wortliste mehr', () => {
  const ids = Object.keys(DE).filter((k) => k.startsWith('suche:alltag.')).map((k) => k.slice('suche:alltag.'.length));
  assert.deepEqual(Object.keys(alltagGesamt(V)).sort(), ids.slice().sort(), 'jede Kennung im Textsatz trägt Wörter');
  assert.deepEqual(alltagOhneWoerter(ids), []);
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.equal(kern.includes('const SUCHE_ALLTAGSBEGRIFFE'), false);
  for (const q of ['sucheQuelleBereich', 'sucheQuelleAbschnitt']) {
    assert.ok(DE['strings:' + q + '.text'] && EN['strings:' + q + '.text'], q);
    assert.equal(typeof V.SUCHE_QUELLE_LABEL[q.replace('sucheQuelle', '').toLowerCase()], 'function', q);
  }
});

test('[Suche·Stamm] einfache Endungen: Haustiere → haustier, Hunde → hund, kurze Wörter bleiben', () => {
  assert.equal(V._sucheStamm('Haustiere'), 'haustier');
  assert.equal(V._sucheStamm('Hunde'), 'hund');
  assert.equal(V._sucheStamm('Amt'), 'amt');
});

test('[Suche·Rot-Beweis] ohne Bereiche und Abschnitte im Katalog findet „Haustier“ nichts, „Hund“ auch nicht', () => {
  // Der Stand vor dem 18.10.2026: der Katalog kannte nur Anlass, Baustein, Situationsblatt, Angehörigen-Blatt.
  const alt = V._sucheKatalogAufbauen().filter((e) => e.quelle !== 'bereich' && e.quelle !== 'abschnitt');
  const altFindet = (wort) => alt.some((e) => String(e.label).toLowerCase().includes(wort.toLowerCase())
    || (e.alltag || []).some((w) => String(w).toLowerCase().includes(wort.toLowerCase())));
  assert.equal(altFindet('Haustier'), false, 'der alte Katalog fand den Abschnitt nicht');
  assert.equal(altFindet('Hund'), false);
  assert.ok(findet('Haustier', 'Tiere') && findet('Hund', 'Tiere'), 'der neue findet den Bereich');
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Haustier, Stamm und Rot-Beweis sind Konstruktions-Form (feste Wörter gegen erwartete Treffer). */
module.exports = {
  PROBEN: [
    { fuer: '[Suche·Klasse] jeder Bereichs- und Abschnittsname findet sich selbst, auch in Singular-/Pluralform', diskriminante: namenOhneTreffer },
    { fuer: '[Suche·Klasse] jeder Bereich trägt mindestens ein Alltagswort, und es führt zu ihm', diskriminante: bereicheOhneAlltagswort },
    { fuer: '[Suche·Textsatz] jede suche:alltag-Kennung hat Wörter in DE und EN; der Kern trägt keine Wortliste mehr', diskriminante: alltagOhneWoerter },
  ],
};
