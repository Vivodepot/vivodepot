'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Frühere Namen" (11.08.2026), Zug 1: die Liste.
   Heirat ist nur EINER von mehreren Anlässen einer Namensänderung —
   Scheidung, behördliche Namensänderung, Adoption, Einbürgerung,
   Personenstandsänderung tragen ebenso frühere Namen. `geburtsname` bleibt
   eigenes Feld (Urkunden-Datum); die neue Liste fasst alles, was danach kam.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Frühere Namen·Zug1] neue Sektion in identitaet, zwischen person und pets', () => {
  const { V } = ladeKern();
  const s = V.SEKTOR_BY_ID.identity;
  const sek = s.sektionen.find((x) => x.id === 'fruehere-namen');
  assert.ok(sek, 'Sektion fruehere-namen existiert');
  assert.equal(sek.label, 'Frühere Namen');
  const idx = s.sektionen.map((x) => x.id).indexOf('fruehere-namen');
  assert.equal(s.sektionen[idx - 1].id, 'person', 'liegt nach person');
  assert.equal(s.sektionen[idx + 1].id, 'pets', 'liegt vor pets');
});

test('[Frühere Namen·Zug1] die Liste trägt genau vier Unterfelder mit den erwarteten Typen', () => {
  const { V } = ladeKern();
  const sek = V.SEKTOR_BY_ID.identity.sektionen.find((x) => x.id === 'fruehere-namen');
  assert.equal(sek.felder.length, 1);
  const liste = sek.felder[0];
  assert.equal(liste.id, 'formerNames');
  assert.equal(liste.typ, 'liste');
  const typVon = Object.fromEntries((liste.unterFelder || []).map((u) => [u.id, u.typ]));
  assert.equal(typVon.name, 'text');
  assert.equal(typVon.usedUntil, 'datum');
  assert.equal(typVon.reason, 'auswahl');
  assert.equal(typVon.proofStorageLocation, 'text');
  const anlass = liste.unterFelder.find((u) => u.id === 'reason');
  assert.deepEqual(anlass.optionen.map((o) => o.wert),
    ['heirat', 'scheidung', 'namensaenderung', 'adoption', 'einbuergerung', 'personenstand', 'transkription', 'sonstiges']);   // transkription: A462 (22.08.2026)
});

test('[Frühere Namen·Zug1] K3-Muster: die Liste ist VOLLSTÄNDIG sensibel — jedes werttragende Unterfeld trägt sensibel:true', () => {
  const { V } = ladeKern();
  const liste = V.SEKTOR_BY_ID.identity.sektionen
    .find((x) => x.id === 'fruehere-namen').felder[0];
  const werttragend = liste.unterFelder.filter((u) => u.typ !== 'hinweis');
  assert.equal(werttragend.length, 4, 'vier werttragende Unterfelder (name/usedUntil/reason/proofStorageLocation)');
  for (const u of werttragend) assert.equal(u.sensibel, true, u.id + ' muss sensibel:true tragen');
});

test('[Frühere Namen·Zug1] geburtsname bleibt unverändert außer im Hinweis — kein Migrationsbedarf, kein Werteverlust', () => {
  const { V } = ladeKern();
  const geburtsname = V.SEKTOR_BY_ID.identity.sektionen[0].felder.find((f) => f.id === 'birthName');
  assert.equal(geburtsname.typ, 'text');
  assert.equal(geburtsname.sensibel, true);
  assert.equal(geburtsname.beispiel, 'Müller');
  assert.ok(geburtsname.hint.includes('Frühere Namen'), 'Hinweis verweist auf die neue Liste');
});

test('[Frühere Namen·Zug1] echter Kern: ein Eintrag lässt sich setzen, speichern und wiederfinden', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('sicherung-2026');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('identity', 'formerNames', {
    name: 'Maria Müller', usedUntil: '1985-06-14', reason: 'heirat',
    proofStorageLocation: 'Ordner „Familie"',
  });
  const liste = V.getData().sektoren.identity.formerNames;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].name, 'Maria Müller');
  assert.equal(liste[0].reason, 'heirat');
});

test('[Frühere Namen·Zug1] der Personenstandsänderung-Hinweis zeigt sich nur bei genau dieser Auswahl', () => {
  const { V } = ladeKern();
  const liste = V.SEKTOR_BY_ID.identity.sektionen
    .find((x) => x.id === 'fruehere-namen').felder[0];
  const hinweis = liste.unterFelder.find((u) => u.id === 'note');
  assert.ok(hinweis, 'Hinweis-Unterfeld existiert');
  assert.equal(hinweis.typ, 'hinweis');
  assert.deepEqual(hinweis.sichtbarWenn, { feld: 'reason', wert: 'personenstand' });
  assert.match(hinweis.hint, /§ 13 SBGG/, 'zitiert die Vorschrift mit Paragraph');
  assert.match(hinweis.hint, /müssen diese Angabe nicht eintragen/, 'sagt, dass die Angabe nicht verpflichtend ist');
});
