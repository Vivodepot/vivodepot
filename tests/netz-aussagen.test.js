'use strict';
/* Netz-Aussagen im Textsatz — Bedeutungs-Probe über tools/netz-aussagen-muster.json (02.10.2026).
   Dieselbe Liste liest die Website (bauen.py); die Fälle `rot`/`gruen` der Datei sind die gemeinsamen Gegenproben,
   damit App und Website gleich urteilen. Geprüft wird je Satz des DE- und EN-Textsatzes (darin die Hilfe, `hilfe:`):
   ein Auslöser trifft, kein Erlaubt-Muster, keine Ausnahme → Fund. Befund NETZ-ZUSAGE-APP (Befund-Ratsche). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TOOLS = path.join(__dirname, '..', 'tools');
const MUSTER = JSON.parse(fs.readFileSync(path.join(TOOLS, 'netz-aussagen-muster.json'), 'utf8'));
const ausloeser = MUSTER.ausloeser.map((m) => new RegExp(m, 'i'));
const erlaubt = MUSTER.erlaubt.map((m) => new RegExp(m, 'i'));

const saetze = (text) => text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
// Eine Ausnahme gilt nur für Schlüssel UND exakten Satz; ein geänderter Satz ist wieder ein Fund (Gegenlesung 02.10.2026).
const ausgenommen = (schluessel, satz) => MUSTER.ausnahmen.some((a) => a.schluessel === schluessel && a.satz === satz);
const istFund = (satz, schluessel) => ausloeser.some((r) => r.test(satz)) && !erlaubt.some((r) => r.test(satz))
  && !ausgenommen(schluessel, satz);
function funde(texte) {
  const raus = [];
  for (const [k, v] of Object.entries(texte)) {
    if (typeof v !== 'string') continue;
    for (const s of saetze(v)) if (istFund(s, k)) raus.push(k + ': ' + s);
  }
  return raus;
}
const textsatz = (datei) => JSON.parse(fs.readFileSync(path.join(TOOLS, datei), 'utf8')).texte;

test('Muster: jede Zeile ist eine gültige RegExp ohne Lookbehind (auch für Python re lesbar)', () => {
  for (const m of MUSTER.ausloeser.concat(MUSTER.erlaubt)) {
    assert.doesNotThrow(() => new RegExp(m, 'i'), m);
    assert.ok(!/\(\?<[=!]/.test(m), 'Lookbehind: ' + m);
  }
  assert.ok(Array.isArray(MUSTER.ausnahmen), 'ausnahmen ist eine Liste aus {schluessel, satz, grund}');
  for (const a of MUSTER.ausnahmen) {
    assert.ok(a.schluessel && a.satz, 'Ausnahme ohne Schlüssel oder Satz: ' + JSON.stringify(a));
    assert.ok(String(a.grund || '').trim().length >= 10, 'Ausnahme ohne Grund: ' + a.schluessel);
  }
});

test('Rot-Beweis: jeder rot-Fall der Liste schlägt an, darunter die alten Sätze der Hilfe', () => {
  for (const s of MUSTER.rot) assert.ok(istFund(s), 'nicht erkannt: ' + s);
  assert.deepEqual(funde({ 'hilfe:alt': MUSTER.rot.find((s) => s.includes('Sammelstelle')) }).length, 1);
});

test('Ausnahme an Schlüssel und Wortlaut gebunden: geänderter Satz oder anderer Schlüssel ist wieder ein Fund', () => {
  const a = MUSTER.ausnahmen.find((x) => x.schluessel === 'dok:erbschein-vorbereitung.herkunftText');
  assert.ok(a, 'Ausnahme erbschein-vorbereitung fehlt');
  assert.deepEqual(funde({ [a.schluessel]: a.satz }), []);
  assert.equal(funde({ [a.schluessel]: 'Die Anwendung hat keine Verbindung ins Netz.' }).length, 1);
  assert.equal(funde({ [a.schluessel]: a.satz.replace('service.justiz.de', 'einem Server') }).length, 1);
  assert.equal(funde({ 'anderer:schluessel': a.satz }).length, 1);
});

test('Gegenprobe: die Ersatzsätze und die gruen-Fälle bleiben grün', () => {
  for (const s of MUSTER.gruen) assert.ok(!istFund(s), 'fälschlich erkannt: ' + s);
});

test('Textsatz DE: keine pauschale Netz-Aussage', () => {
  assert.deepEqual(funde(textsatz('textsatz-de-modul.json')), []);
});

test('Textsatz EN: keine pauschale Netz-Aussage', () => {
  assert.deepEqual(funde(textsatz('textsatz-en-modul.json')), []);
});
