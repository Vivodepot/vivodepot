'use strict';
/* ════════════════════════════════════════════════════════════════════════
   vollimport-schluessel-abdeckung.test.js — „Vollimport ist kein Vollimport"
   (11.09.2026), nach dem Befund einer anderen Sitzung: der echte Umzug-Test (Depot füllen,
   exportieren, in eine frische Datei einlesen, vergleichen) fand 45 von 48 Depot-Schlüsseln
   verloren — nur `sektoren`, `feldDefinitionen`, `menschen` überlebten.
   ────────────────────────────────────────────────────────────────────────
   Das Gegenstück zu `vollexport-schluessel-abdeckung.test.js`, und der Wächter, der als
   „das Wichtigste" benannt wurde: er hält JEDEN Top-Level-Schlüssel aus `leeresDepot()` gegen BEIDE
   Wege — Export UND Import — und wird rot, sobald ein Schlüssel existiert, der in keiner der
   beiden VOLLIMPORT_*-Listen ausdrücklich geführt ist. Eine neue Kategorie zwingt so zu einer
   bewussten Entscheidung (mitnehmen oder begründet auslassen), statt sie lautlos ungefiltert —
   oder lautlos GAR NICHT — mitgehen zu lassen. Genau das Muster, das seit dem 20.08.2026 offen
   stand: derselbe Befund wurde für `feldDefinitionen` allein behoben, die Klasse dahinter nie
   angesehen — vier jüngere Schlüssel (zusammenstellungen/anfragen/empfaengerkreise/blattFelder)
   trugen die Lücke seitdem unbemerkt weiter.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('Wächter: jeder Schlüssel aus leeresDepot() ist klassifiziert (mitnehmen oder draußen)', () => {
  const { V } = ladeKern();
  const bekannt = new Set([...V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL, ...V.VOLLIMPORT_DRAUSSEN_SCHLUESSEL]);
  const unklassifiziert = Object.keys(V.leeresDepot()).filter(k => !bekannt.has(k));
  assert.deepEqual(unklassifiziert, [],
    'neue(r) Schlüssel im Grundgerüst ohne Vollimport-Klassifikation: ' + unklassifiziert.join(', ') +
    ' — in VOLLIMPORT_MITNEHMEN_SCHLUESSEL oder VOLLIMPORT_DRAUSSEN_SCHLUESSEL eintragen, mit' +
    ' Begründung am Gegenstand (s. Kommentar an der Registry)');
});

test('[Rot-Beweis] der Wächter schlägt an, wenn ein neuer, unklassifizierter Schlüssel ins Grundgerüst kommt', () => {
  const { V } = ladeKern();
  const bekannt = new Set([...V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL, ...V.VOLLIMPORT_DRAUSSEN_SCHLUESSEL]);
  const fingiertesDepot = Object.assign({}, V.leeresDepot(), { neuesFeldFingiert: [] });
  const unklassifiziert = Object.keys(fingiertesDepot).filter(k => !bekannt.has(k));
  assert.deepEqual(unklassifiziert, ['neuesFeldFingiert'], 'der Wächter ist blind für einen neuen unklassifizierten Schlüssel');
});

test('kein Schlüssel steht in beiden Klassen zugleich (Klassifikation ist eindeutig)', () => {
  const { V } = ladeKern();
  const alle = [...V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL, ...V.VOLLIMPORT_DRAUSSEN_SCHLUESSEL];
  const dubletten = alle.filter((k, i) => alle.indexOf(k) !== i);
  assert.deepEqual(dubletten, [], 'Schlüssel in beiden Klassen: ' + dubletten.join(', '));
});

test('[Gegenprobe] die Klassifikation deckt genau die 48 Schlüssel von leeresDepot(), nicht mehr und nicht weniger', () => {
  const { V } = ladeKern();
  const depotSchluessel = new Set(Object.keys(V.leeresDepot()));
  const registerSchluessel = [...V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL, ...V.VOLLIMPORT_DRAUSSEN_SCHLUESSEL];
  const erfunden = registerSchluessel.filter(k => !depotSchluessel.has(k));
  assert.deepEqual(erfunden, [], 'Register nennt Schlüssel, die leeresDepot() gar nicht kennt: ' + erfunden.join(', '));
});

test('Priorität: mappe und institutionen stehen in MITNEHMEN (Dokumente selbst, ref:institution-Ziel)', () => {
  const { V } = ladeKern();
  assert.ok(V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL.includes('mappe'));
  assert.ok(V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL.includes('institutionen'));
});

test('Datei-/Sitzungszustand bleibt draußen: schemaVersion, kryptoVersion, abWerkMitschrift', () => {
  const { V } = ladeKern();
  for (const k of ['schemaVersion', 'kryptoVersion', 'abWerkMitschrift', '_letzterAnlass', '_wiedereinstiegHinweisGezeigt']) {
    assert.ok(V.VOLLIMPORT_DRAUSSEN_SCHLUESSEL.includes(k), k + ' sollte draußen bleiben (Datei-/Sitzungszustand, kein Bürgerdatum)');
    assert.equal(V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL.includes(k), false, k + ' steht fälschlich zusätzlich in MITNEHMEN');
  }
});
