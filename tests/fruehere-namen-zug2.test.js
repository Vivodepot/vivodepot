'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Frühere Namen" (11.08.2026), Zug 2: der Anlass
   „Personenstandsänderung" ist rechtlich geschützt.

   Recherche (s. Bericht): § 13 Abs. 1 SBGG schützt „die bis zur Änderung
   eingetragene Geschlechtsangabe und die bis zur Änderung eingetragenen
   Vornamen" einer Person, deren Geschlechtseintrag nach § 2 SBGG geändert
   wurde. Der Wortlaut nennt VORNAMEN, keinen Nachnamen — eine gesetzliche
   Aussage zum früheren NACHNAMEN lässt sich aus § 13 SBGG nicht belegen.
   Die drei Auflagen (sensibel vollständig, kein automatischer Export,
   eigener Hinweis) gelten unabhängig davon — sie folgen aus der Sache,
   nicht nur aus dem Gesetz.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Frühere Namen·Zug2] W-10: keine der sieben EXPORT_FORMATE-Mapping-Tabellen erwähnt fruehere_namen', () => {
  const { V } = ladeKern();
  const tabellen = {
    VC_IDENTITAET_MAPPING: V.VC_IDENTITAET_MAPPING,
    XOEV_VERWALTUNG_MAPPING: V.XOEV_VERWALTUNG_MAPPING,
    EDCI_BILDUNG_MAPPING: V.EDCI_BILDUNG_MAPPING,
    VC_FINANZEN_MAPPING: V.VC_FINANZEN_MAPPING,
    VC_SOZIALVERSICHERUNG_MAPPING: V.VC_SOZIALVERSICHERUNG_MAPPING,
    XMELD_IDENTITAET_MAPPING: V.XMELD_IDENTITAET_MAPPING,
    B16_FELD_MAPPING: V.B16_FELD_MAPPING,
  };
  const treffer = [];
  for (const [name, arr] of Object.entries(tabellen)) {
    assert.ok(Array.isArray(arr) && arr.length > 0, name + ' fehlt oder ist leer — der Suchraum trägt die Aussage nicht');
    for (const e of arr) {
      if (e.feld === 'formerNames' || e.feldId === 'formerNames') treffer.push(name);
    }
  }
  assert.deepEqual(treffer, [], 'fruehere_namen darf in keiner Mapping-Tabelle stehen — kein Export ohne ausdrückliche Wahl');
});

test('[Frühere Namen·Zug2·Rotmachbarkeit] Positivkontrolle: eine gepflanzte Mapping-Zeile wird gefunden', () => {
  const gepflanzt = { VC_IDENTITAET_MAPPING: [{ feld: 'formerNames', ziel: 'former_names' }] };
  const treffer = [];
  for (const [name, arr] of Object.entries(gepflanzt)) {
    for (const e of arr) if (e.feld === 'formerNames' || e.feldId === 'formerNames') treffer.push(name);
  }
  assert.deepEqual(treffer, ['VC_IDENTITAET_MAPPING'], 'die Probe selbst erkennt einen echten Leck-Fall');
});

test('[Frühere Namen·Zug2] die drei Auflagen gelten am echten Kern: sensibel vollständig, kein Export-Weg, eigener Hinweis', () => {
  const { V } = ladeKern();
  const liste = V.SEKTOR_BY_ID.identity.sektionen
    .find((x) => x.id === 'fruehere-namen').felder[0];
  // Auflage 1: vollständig sensibel (nicht feldweise) — jedes werttragende Unterfeld.
  const werttragend = liste.unterFelder.filter((u) => u.typ !== 'hinweis');
  assert.ok(werttragend.every((u) => u.sensibel === true), 'jedes werttragende Unterfeld trägt sensibel:true');
  // Auflage 2: kein automatischer Export — geprüft in der ersten Probe dieser Datei.
  // Auflage 3: eigener Hinweis am Anlass „Personenstandsänderung".
  const hinweis = liste.unterFelder.find((u) => u.id === 'note');
  assert.ok(hinweis, 'Hinweis-Unterfeld existiert');
  assert.deepEqual(hinweis.sichtbarWenn, { feld: 'reason', wert: 'personenstand' });
});

test('[Frühere Namen·Zug2] der Hinweistext zitiert § 13 SBGG korrekt (Vornamen + Geschlechtsangabe, NICHT Nachname)', () => {
  const { V } = ladeKern();
  const liste = V.SEKTOR_BY_ID.identity.sektionen
    .find((x) => x.id === 'fruehere-namen').felder[0];
  const hinweis = liste.unterFelder.find((u) => u.id === 'note');
  assert.match(hinweis.hint, /§ 13 SBGG/);
  assert.match(hinweis.hint, /Offenbarungsverbot/);
  assert.match(hinweis.hint, /frühere[rn]? Vornamen?/, 'nennt den Vornamen — die tatsächliche Reichweite des § 13 SBGG');
  assert.equal(/Nachnamen?/.test(hinweis.hint), false,
    'behauptet KEINE gesetzliche Aussage zum Nachnamen — die belegt § 13 SBGG nicht');
});
