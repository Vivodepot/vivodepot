'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorsorge-Anweisung am Sub-Depot (B16-ADR-052, Sub-Festlegung 4; 31.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Entschieden und nicht gebaut: beim Anlegen oder Bearbeiten eines Sub-Depots kann die
   Anker-Person eine optionale Vorsorge-Anweisung als Freitext hinterlegen („Im Erbfall an …“).
   Bei der Ausgabe steht sie oben, mit der Aufforderung, nach ihr zu verfahren. Ein Prüftermin
   ist optional und wird von der Bürgerin gesetzt — kein berechneter Termin.
   Gebaut am Register-Eintrag im Anker, nach dem Muster des Widerspruchs: ein Feld, eine Spur
   ohne den Text, eine Quelle im Prüfblatt. Die Mitnahme in die ausgegebene Datei ist NICHT Teil
   dieses Wagens (Widerspruch B16-ADR-052 „sichtbar“ gegen U2-ADR-432 „ein Format“, offen).
   ROT-BEWEIS: der Kern vor diesem Commit kennt die Funktionen nicht; ein Ausgabe-Dialog ohne
   Engstelle fällt in der Klassenprobe.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const TEXT = 'Im Erbfall an meinen Bruder Werner, Erbschein-Vorlage beim Notar.';

async function mitSub(extra) {
  const { V } = ladeKern();
  await V.depotAnlegen('Vorsorge-2026!');
  V.akteurSelbstErklaeren('Mutter');
  const e = await V.subDepotAnlegen(Object.assign({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet' }, extra || {}), 'Sub-V-2026!');
  return { V, e };
}
function dialoge(V) { const gesehen = []; V.ui.modal = (opt) => { gesehen.push(opt); return () => {}; }; return gesehen; }
const eintrag = (V) => V.getData().verwalteteDepots[0];

test('[Vorsorge-Anweisung] setzen und entfernen; die Spur nennt Person und Zeit, nicht den Text', async () => {
  const { V, e } = await mitSub();
  assert.equal(typeof V.subDepotVorsorgeAnweisungSetzen, 'function', 'die Kern-Funktion fehlt');
  const a = V.subDepotVorsorgeAnweisungSetzen(e.depotUUID, { text: '  ' + TEXT + '  ', pruefenAm: '2027-03-01' });
  assert.equal(a.text, TEXT);
  assert.equal(a.pruefenAm, '2027-03-01');
  assert.ok(a.geaendertVon && a.geaendertAm, 'wer und wann');
  assert.deepEqual(eintrag(V).vorsorgeAnweisung, a);
  const g = eintrag(V).delegationsGeschichte.filter((x) => x.art === 'vorsorge-anweisung-gesetzt');
  assert.equal(g.length, 1);
  assert.ok(!JSON.stringify(g).includes('Werner'), 'die Spur trägt den Text nicht');
  assert.equal(V.subDepotVorsorgeAnweisungSetzen(e.depotUUID, { text: '' }), null);
  assert.equal(eintrag(V).vorsorgeAnweisung, null);
  assert.ok(eintrag(V).delegationsGeschichte.some((x) => x.art === 'vorsorge-anweisung-entfernt'));
});

test('[Vorsorge-Anweisung] ein ungültiger Prüftermin wird null; ein unbekanntes Sub-Depot wirft', async () => {
  const { V, e } = await mitSub();
  assert.equal(V.subDepotVorsorgeAnweisungSetzen(e.depotUUID, { text: TEXT, pruefenAm: '1.3.2027' }).pruefenAm, null);
  assert.throws(() => V.subDepotVorsorgeAnweisungSetzen('gibt-es-nicht', { text: TEXT }), /vorsorge-anweisung-sub-depot-unbekannt/);
});

test('[Vorsorge-Anweisung] beim Anlegen mitgegeben', async () => {
  const { V } = await mitSub({ vorsorgeAnweisung: { text: TEXT, pruefenAm: '' } });
  assert.equal(eintrag(V).vorsorgeAnweisung.text, TEXT);
  assert.equal(eintrag(V).vorsorgeAnweisung.pruefenAm, null);
});

test('[Vorsorge-Anweisung] Blackbox- und Aushäng-Dialog zeigen sie oben, mit der Aufforderung', async () => {
  const { V, e } = await mitSub();
  V.subDepotVorsorgeAnweisungSetzen(e.depotUUID, { text: TEXT });
  const gesehen = dialoge(V);
  V.flowSubDepotBlackboxExport(e.depotUUID);
  V.flowSubDepotAushaengen(e.depotUUID);
  gesehen[1].zweitAktion.handler(() => {});   // „Ich gebe es ab." → Bestätigung
  assert.equal(gesehen.length, 3, 'Vorbedingung: Export, Absicht, Bestätigung');
  for (const g of gesehen) {
    assert.match(g.koerperHTML, /data-vorsorge-anweisung/, 'Anweisung fehlt in: ' + g.titel);
    assert.ok(g.koerperHTML.includes('Werner'), 'Text fehlt in: ' + g.titel);
    assert.ok(g.koerperHTML.includes(V.STRINGS.vorsorgeAnweisungAufforderung), 'Aufforderung fehlt in: ' + g.titel);
  }
  // ohne Anweisung steht nichts da
  V.subDepotVorsorgeAnweisungSetzen(e.depotUUID, { text: '' });
  const leer = dialoge(V);
  V.flowSubDepotBlackboxExport(e.depotUUID);
  assert.doesNotMatch(leer[0].koerperHTML, /data-vorsorge-anweisung/);
});

test('[Vorsorge-Anweisung] der Bearbeiten-Dialog schreibt Text und Termin', async () => {
  const { V, e } = await mitSub();
  const gesehen = dialoge(V);
  V.flowSubDepotVorsorgeAnweisung(e.depotUUID);
  assert.equal(gesehen.length, 1);
  assert.match(gesehen[0].koerperHTML, /id="sub-vorsorge"/);
  assert.match(gesehen[0].koerperHTML, /id="sub-vorsorge-pruefen"[^>]*type="date"|type="date"[^>]*id="sub-vorsorge-pruefen"/);
});

test('[Vorsorge-Anweisung] der Anlegen-Dialog eines Sub-Depots trägt die zwei Felder, der des Ankers nicht', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const i = kern.indexOf('\nfunction _depotIdentitaetUndPasswortAbfragen(');
  assert.ok(i > 0);
  const rumpf = kern.slice(i, kern.indexOf('\n}\n', i));
  // Die Felder kommen aus derselben Stelle wie im Bearbeiten-Dialog (_vorsorgeAnweisungFelderHTML).
  assert.match(rumpf, /\(sub \? [^\n]*(?:id="sub-vorsorge"|_vorsorgeAnweisungFelderHTML\()/, 'das Feld steht nur im Sub-Zweig');
  assert.match(kern, /function _vorsorgeAnweisungFelderHTML\([^]*?id="sub-vorsorge"/, 'die gemeinsame Stelle trägt das Feld');
  assert.match(rumpf, /vorsorgeAnweisung/, 'der Dialog reicht die Anweisung an onFertig');
});

test('[Vorsorge-Anweisung] ein Prüftermin steht im Prüfblatt, ohne Termin keine Zeile', async () => {
  const { V, e } = await mitSub();
  V.subDepotVorsorgeAnweisungSetzen(e.depotUUID, { text: TEXT });
  assert.equal(V.prueftermineVorsorgeAnweisungen('2026-10-31').length, 0, 'kein berechneter Termin');
  V.subDepotVorsorgeAnweisungSetzen(e.depotUUID, { text: TEXT, pruefenAm: '2026-12-01' });
  const t = V.prueftermineVorsorgeAnweisungen('2026-10-31');
  assert.equal(t.length, 1);
  assert.equal(t[0].faelligAm, '2026-12-01');
  assert.ok(V.prueftermineAlle('2026-10-31').some((x) => x.id === t[0].id));
});

test('[Vorsorge-Anweisung·Klasse] jede flow-Funktion, die für ein Sub-Depot exportiert oder aushängt, zeigt die Anweisung', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const funde = (text) => {
    const re = /\n(?:async )?function ([A-Za-z0-9_$]+)\(/g;
    const starts = [];
    let m;
    while ((m = re.exec(text))) starts.push([m.index, m[1]]);
    const f = [];
    starts.forEach(([i, name], k) => {
      if (!/^flow/.test(name)) return;
      const body = text.slice(i, k + 1 < starts.length ? starts[k + 1][0] : i + 20000);
      if (/subDepotBlackboxExportieren\(|subDepotAushaengen\(/.test(body) && !/_vorsorgeAnweisungHTML\(/.test(body)) f.push(name);
    });
    return f;
  };
  assert.deepEqual(funde(kern), []);
  // Rot-Beweis: ein Dialog ohne Engstelle fällt.
  assert.deepEqual(funde('\nfunction flowProbe(u) {\n  ui.modal({ onPrimaer: () => subDepotBlackboxExportieren(u) });\n}\n'), ['flowProbe']);
});
