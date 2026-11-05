'use strict';
/* U2-ADR-507, Nachtrag 29.10.2026 — der Produktbau setzt eine Bauplan-Ergänzung (modulTyp rechtsraumBauplan) in das Rechtsraum-Modul
   ihres Codes ein (`_rechtsraumBauplanEinsetzen`, tools/lib/produkt-text-erzeugen.js). Er wirft bei einem Typ, den das Rechtsraum-Modul
   nicht kennt, bei einem dort schon gesetzten Bauplan (zwei Quellen), bei fehlendem Rechtsraum-Modul und bei leerem Bauplan. Fehlt die
   Ergänzung und auch ihr erfundenes Gegenstück, baut er und meldet jeden Typ mit `bauplan: null` als offen, statt still ohne Schritte
   zu bauen. Die Module der ersten beiden Proben sind erfunden; die letzte baut das deutsche Bürgerprodukt ohne Bauplan-Ergänzung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { _rechtsraumBauplanEinsetzen } = require('../tools/lib/produkt-text-erzeugen.js');
const os = require('node:os');
const { RECHTSRAUM_DE_PFAD, RECHTSRAUM_BAUPLAN_PFADE, PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { ladeIssuer } = require('./load-issuer.js');

const SCHRITTE = [{ feld: { id: 'probeFrage', typ: 'auswahl' }, dokEinleitung: 'Testtext 1' }, { feld: { id: 'probeFreitext', typ: 'freitext' } }];

const rechtsraum = (typen) => ({ roh: { modulTyp: 'rechtsraum', rechtsraum: 'XX', moduleVersion: 1, typen }, basisname: 'rr-xx.json' });
const ergaenzung = (typen, rr = 'XX') => ({ roh: { modulTyp: 'rechtsraumBauplan', moduleVersion: 1, rechtsraum: rr, typen }, basisname: 'bauplan-xx.json' });
const typ = (bauplan) => ({ katalogVersion: 1, wortlaut: null, bauplan });

test('[U2-ADR-507·Bauplan einsetzen] die Ergänzung landet bytegleich im Rechtsraum-Modul, die Eingabe bleibt unverändert', () => {
  const rr = rechtsraum({ 'living-will': typ(null), will: typ(null) });
  const r = _rechtsraumBauplanEinsetzen([rr, ergaenzung({ 'living-will': { bauplan: SCHRITTE } })]);
  assert.equal(r.module.length, 1, 'die Ergänzung selbst wird nicht eingebacken');
  assert.equal(JSON.stringify(r.module[0].roh.typen['living-will'].bauplan), JSON.stringify(SCHRITTE));
  assert.equal(rr.roh.typen['living-will'].bauplan, null, 'das gelesene Rechtsraum-Modul bleibt unverändert');
  assert.deepEqual(r.ergaenzungen, ['bauplan-xx.json']);
  assert.deepEqual(r.bauplanOffen, ['XX/will'], 'der Typ ohne Ergänzung wird gemeldet');
});

test('[U2-ADR-507·Bauplan einsetzen·Rot-Beweis] unbekannter Typ, schon gesetzter Bauplan, fehlendes Rechtsraum-Modul und leerer Bauplan werfen', () => {
  assert.throws(() => _rechtsraumBauplanEinsetzen([rechtsraum({ 'living-will': typ(null) }), ergaenzung({ 'tpl_unbekannt': { bauplan: SCHRITTE } })]),
    /Typ „tpl_unbekannt" ist im Rechtsraum-Modul „XX" unbekannt/);
  assert.throws(() => _rechtsraumBauplanEinsetzen([rechtsraum({ 'living-will': typ(SCHRITTE) }), ergaenzung({ 'living-will': { bauplan: SCHRITTE } })]),
    /trägt schon einen Bauplan — zwei Quellen/);
  assert.throws(() => _rechtsraumBauplanEinsetzen([rechtsraum({ 'living-will': typ(null) }),
    ergaenzung({ 'living-will': { bauplan: SCHRITTE } }), ergaenzung({ 'living-will': { bauplan: SCHRITTE } })]),
  /trägt schon einen Bauplan — zwei Quellen/, 'zwei Ergänzungen für denselben Typ');
  assert.throws(() => _rechtsraumBauplanEinsetzen([rechtsraum({ 'living-will': typ(null) }), ergaenzung({ 'living-will': { bauplan: SCHRITTE } }, 'YY')]),
    /kein Rechtsraum-Modul „YY" im Rezept/);
  assert.throws(() => _rechtsraumBauplanEinsetzen([rechtsraum({ 'living-will': typ(null) }), ergaenzung({ 'living-will': { bauplan: [] } })]),
    /ohne Schritte/);
});

test('[U2-ADR-507·Bauplan offen] ohne Bauplan-Ergänzung baut der Produktbau mit dem Rechtsraum-Modul und meldet beide Baupläne als offen', () => {
  const modul = JSON.parse(fs.readFileSync(RECHTSRAUM_DE_PFAD, 'utf8'));
  assert.equal(modul.typen['living-will'].bauplan, null, 'das veröffentlichte Rechtsraum-Modul trägt keinen Bauplan');
  assert.equal(modul.typen['enduring-power-of-attorney'].bauplan, null);
  const ohne = modulDateienFuer(PRODUKTE.find((p) => p.slug === 'privat-de')).filter((f) => !RECHTSRAUM_BAUPLAN_PFADE.includes(f));
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-bauplan-offen-'));
  try {
    const r = konfektionieren({ ziel: ordner, slug: 'privat-de', modulauswahl: [], vorDepotKonfigurationInhaltFn: ladeIssuer().V.vorDepotKonfigurationDateiInhalt,
      unsignierteModulDateien: ohne });
    assert.deepEqual(r.bauplanOffen, ['DE/enduring-power-of-attorney', 'DE/living-will']);
    assert.ok(fs.readFileSync(path.join(r.ordner, 'vivodepot.html'), 'utf8').includes('"bauplan":null'), 'das Rechtsraum-Modul ist eingebacken, mit offenem Bauplan');
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});
