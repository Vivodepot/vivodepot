'use strict';
/* Probe — Einlesen legt nur ins geöffnete Depot (13.11.2026). Depots sind autark: eine eingelesene Datei schreibt nie in ein
   anderes Depot, und das Einlesen wählt nicht über mehrere Depots. Nennt ein Dokument eine andere Person, sagt die Anwendung das
   und bietet den Wechsel in deren Depot an; dort liest die Person neu ein.
   Belegt:
     • [Autark·Klasse] gemessen über den Kern: jede Funktion des Einlese-Wegs (Name beginnt mit import, flowImport, parse oder
       _xps/xps), die ins Depot schreibt, wechselt nicht den Depot-Kontext, und umgekehrt. Die Menge der Wechsel-Funktionen wird
       gemessen, nicht geschrieben; sie ist nicht leer (der Weg „im Depot der Person einlesen“), damit die Probe nicht leer läuft.
     • [Autark·Lauf] nach dem Übernehmen als Unterlage sind die verwalteten Depots unverändert.
     • [Rot-Beweis] eine Einlese-Funktion, die schreibt und den Kontext wechselt, macht die Klassenprobe rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const URKUNDE = fs.readFileSync(path.join(__dirname, 'fixtures', 'xpersonenstand', 'geburt-018011-erfunden.xml'), 'utf8');

const SCHREIBT = /\b(importAnwenden|sektorFeldSetzen|listenEintragHinzufuegen|mappeEintragHinzufuegen|personHinzufuegen|feldRohwertSetzen)\s*\(/;
const WECHSELT = /\b(flowSubKontextBetreten|subKontextBetreten|flowSubKontextVerlassen|subKontextVerlassen)\s*\(|\baktiverSubKontext\s*=[^=]|verwalteteDepots\s*(\.push|=[^=])/;

// Top-Level-Funktionen des Kerns mit Körper (bis zur nächsten Top-Level-Funktion oder Konstante).
function einleseFunktionen(quelle) {
  const kopf = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  const starts = [];
  let m;
  while ((m = kopf.exec(quelle))) starts.push({ name: m[1], at: m.index });
  const out = [];
  for (let i = 0; i < starts.length; i++) {
    const { name, at } = starts[i];
    if (!/^(_?import|flowImport|_?parse|_?xps)/i.test(name)) continue;
    const ende = i + 1 < starts.length ? starts[i + 1].at : quelle.length;
    out.push({ name, koerper: quelle.slice(at, ende) });
  }
  return out;
}
function messen(quelle) {
  const fn = einleseFunktionen(quelle);
  return {
    anzahl: fn.length,
    beides: fn.filter((f) => SCHREIBT.test(f.koerper) && WECHSELT.test(f.koerper)).map((f) => f.name),
    wechsel: fn.filter((f) => WECHSELT.test(f.koerper)).map((f) => f.name),
  };
}

test('[Autark·Klasse] keine Einlese-Funktion schreibt und wechselt das Depot zugleich', () => {
  const r = messen(KERN);
  assert.ok(r.anzahl >= 30, 'die Messung sieht den Einlese-Weg (' + r.anzahl + ' Funktionen)');
  assert.deepEqual(r.beides, [], 'schreibt und wechselt den Depot-Kontext: ' + r.beides.join(', '));
  assert.ok(r.wechsel.length >= 1, 'der Weg „im Depot der Person einlesen“ ist gemessen, die Probe läuft nicht leer');
});

test('[Autark·Lauf] als Unterlage übernommen: die verwalteten Depots bleiben unverändert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Anna');
  V.sektorFeldSetzen('identity', 'familyName', 'Musterfrau');
  V.ankerDaten().verwalteteDepots = [{ depotUUID: 'd-lina', inhaberin: 'Lina Marie Musterkind', umschlag: 'versiegelt' }];
  const vorher = JSON.stringify(V.ankerDaten().verwalteteDepots);
  V.xpsGeburtAlsUnterlage(URKUNDE);
  assert.equal(JSON.stringify(V.ankerDaten().verwalteteDepots), vorher);
  assert.equal(V.imSubKontext(), false, 'kein Wechsel beim Übernehmen');
});

test('[Rot-Beweis] eine Einlese-Funktion, die schreibt und wechselt, macht die Klassenprobe rot', () => {
  const kaputt = KERN + '\nfunction importInsAndereDepot(plan, uuid) {\n  subKontextBetreten(uuid);\n  importAnwenden(plan);\n}\n';
  assert.deepEqual(messen(kaputt).beides, ['importInsAndereDepot']);
});
