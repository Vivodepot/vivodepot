'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   IMPORT A6 · ein Wurf der Migration liest den halb gehobenen Stand nicht mehr still ein (07.11.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Befund IMPORT-VERWIRFT-OHNE-ANZEIGE, Teil A6. An drei Stellen endete ein Wurf aus depotNormalisieren in console.error:
   beim Öffnen einer Datei (depotLaden), beim Betreten eines Subs (subKontextBetreten) und beim Einlesen „Ganzes Depot“
   (_vollDepotParsen). Frühere Stufen hatten da schon geschrieben; die Anwendung lief mit dem halb gehobenen Stand weiter,
   und das nächste Speichern schrieb ihn in die Datei.
   Gehalten wird:
     - Datei und Sub: der Stand vor der Migration gilt wieder (nichts Halbgehobenes), das Depot ist nur lesend — derselbe
       Riegel wie für eine neuere Fassung, mit eigener Kennung und eigenem Satz —, und das Ergebnis trägt den Grund.
     - Ganzes Depot: die Datei wird abgewiesen, mit eigenem Satz und Grund; nichts wird übernommen.
     - Gegenprobe: ohne Wurf bleibt alles beschreibbar, und es gibt kein Ergebnis eines Wurfs.
     - Rot-Beweis: derselbe Aufbau gegen den Kern ohne das Zurückholen in _migrationVersuchen zeigt das alte Verhalten.
   Den Wurf erzeugt tests/import-a6-helfer.js (eine zusätzliche erste Zeile in depotNormalisieren).
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const A6 = require('./import-a6-helfer.js');

const NUR_LESEN = (e) => e && e.code === 'migration-fehler-nur-lesen';

test('[A6·Datei] wirft die Migration beim Öffnen, gilt der Stand davor, nur lesend, mit Grund', async () => {
  const { V, personId } = await A6.ankerOeffnen();
  const d = V.getData();
  assert.equal(d.zzProbeHalbGehoben, undefined, 'der halb gehobene Stand ist nicht geblieben');
  assert.equal(d.zzProbeMigrationWurf, true, 'es gilt der Stand vor der Migration');
  assert.deepEqual(V.migrationFehlerErgebnis(), { ok: false, grund: 'migration-fehler', verworfene: [], fehler: 'zz-probe-migrationswurf' });
  assert.equal(V.neuereFassungNurLesen(), true, 'der Kern weiß, dass er nur liest (daran hängt der Hinweis)');

  const vorher = JSON.stringify(V.getData());
  assert.throws(() => V.personAktualisieren(personId, { birthDate: '1960-01-01' }), NUR_LESEN);
  assert.throws(() => V.sektorFeldSetzen('identity', 'givenName', 'Ada'), NUR_LESEN);
  assert.equal(JSON.stringify(V.getData()), vorher, 'der Bearbeitungsversuch hat nichts verändert');
  assert.equal(V.istUngespeichert(), false, 'nichts ist als zu speichern markiert');
  await assert.rejects(() => V.depotSerialisieren(), NUR_LESEN, 'der Stand wird nie neu geschrieben');
  assert.equal(await V.depotInternSichern(), 'nur-lesen');

  for (const k of ['migrationFehlerNurLesenTitel', 'migrationFehlerNurLesenText', 'migrationFehlerNurLesenSchreiben', 'importMigrationFehler']) {
    assert.ok(V.STRINGS[k] && V.STRINGS[k].length > 20, 'der Hinweis hat einen Text: ' + k);
    assert.equal(/\{marke\}/.test(V.STRINGS[k]), false, k + ': {marke} ist aufgelöst');
    assert.notEqual(V.STRINGS[k], V.STRINGS.neuereFassungNurLesenText, k + ': ein eigener Satz, nicht der für eine neuere Fassung');
  }
});

test('[A6·Datei·Gegenprobe] ohne Wurf bleibt die Datei beschreibbar, und es gibt kein Ergebnis eines Wurfs', async () => {
  const { V, personId } = await A6.ankerOeffnen({ mitWurf: false });
  assert.equal(V.migrationFehlerErgebnis(), null);
  assert.equal(V.neuereFassungNurLesen(), false);
  V.personAktualisieren(personId, { birthDate: '1960-01-01' });
  assert.equal(V.getData().menschen.find((m) => m.id === personId).birthDate, '1960-01-01');
});

test('[A6·Datei·Rot-Beweis] ohne das Zurückholen bleibt der halb gehobene Stand, und der Kern schreibt weiter', async () => {
  const { V, personId } = await A6.ankerOeffnen({ aendern: A6.ohneZurueckholen });
  assert.equal(V.getData().zzProbeHalbGehoben, true, 'der halb gehobene Stand ist geblieben');
  assert.equal(V.neuereFassungNurLesen(), false, 'und nichts ist nur lesend');
  V.personAktualisieren(personId, { birthDate: '1960-01-01' });
  const umschlag = await V.depotSerialisieren();
  const { V: W } = A6.kernMitWurf();
  await W.depotLaden(umschlag, A6.PW);
  assert.equal(W.getData().zzProbeHalbGehoben, true, 'das Speichern hat den halb gehobenen Stand in die Datei geschrieben');
});

test('[A6·Sub] wirft die Migration beim Betreten, ist das Sub nur lesend und sein Umschlag bleibt, wie er kam', async () => {
  const { V, depotUUID, umschlagVorher } = await A6.subBetreten();
  assert.equal(V.getData().zzProbeHalbGehoben, undefined, 'der halb gehobene Stand ist nicht geblieben');
  assert.equal(V.migrationFehlerErgebnis().grund, 'migration-fehler');
  assert.equal(V.neuereFassungNurLesen(), true, 'im Sub liest der Kern nur');
  const vorher = JSON.stringify(V.getData());
  assert.throws(() => V.personAktualisieren('p-sub', { birthDate: '1960-01-01' }), NUR_LESEN);
  assert.equal(JSON.stringify(V.getData()), vorher, 'der Bearbeitungsversuch hat den Sub-Inhalt nicht verändert');
  await V.subKontextVerlassen();
  assert.equal(V.neuereFassungNurLesen(), false, 'der Anker bleibt beschreibbar');
  assert.equal(V.migrationFehlerErgebnis(), null);
  assert.equal(JSON.stringify(V.getData().verwalteteDepots.find((x) => x.depotUUID === depotUUID).umschlag), umschlagVorher,
    'der Umschlag des Subs ist beim Verlassen nicht neu versiegelt worden');
});

test('[A6·Sub·Rot-Beweis] ohne das Zurückholen betritt der Kern das Sub mit dem halb gehobenen Stand, beschreibbar', async () => {
  const { V } = await A6.subBetreten({ aendern: A6.ohneZurueckholen });
  assert.equal(V.getData().zzProbeHalbGehoben, true);
  assert.equal(V.neuereFassungNurLesen(), false);
});

test('[A6·Ganzes Depot] wirft die Migration beim Einlesen, wird die Datei mit eigenem Satz abgewiesen, nichts übernommen', async () => {
  const { V } = await A6.ankerOeffnen({ mitWurf: false });
  const plan = V.importPlan('json', A6.vollExportText(V));
  assert.equal(plan.ungueltig, true);
  assert.equal(plan.grund, 'migration-fehler');
  assert.equal(V.importUngueltigNachricht(plan), V.STRINGS.importMigrationFehler);
  assert.deepEqual([plan.zeilen.length, plan.listen.length, plan.register.length], [0, 0, 0]);
  const ohne = V.importPlan('json', A6.vollExportText(V, { mitWurf: false }));
  assert.equal(ohne.ungueltig, false, 'Gegenprobe: ohne Wurf liest „Ganzes Depot“ die Datei');
});

test('[A6·Ganzes Depot·Rot-Beweis] ohne das Zurückholen liest „Ganzes Depot“ den halb gehobenen Stand ein', async () => {
  const { V } = A6.kernMitWurf(A6.ohneZurueckholen);
  await V.depotAnlegen(A6.PW);
  const plan = V.importPlan('json', A6.vollExportText(V));
  assert.equal(plan.ungueltig, false, 'die Datei gilt als lesbar, obwohl ihre Migration warf');
});
