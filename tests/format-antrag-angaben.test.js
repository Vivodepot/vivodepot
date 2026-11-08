'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-465 Nachtrag (04.11.2026) — Angaben für einen Antrag: `abgeleitet` und `antrag` im Format-Modul
   ────────────────────────────────────────────────────────────────────────
   Ein Leistungsschema verlangt Angaben, die eine Person nicht dauerhaft führt: Steuerfragen („Einnahmen vorhanden?“),
   Erklärungen, Angaben nur für diesen Antrag. Zusicherungen:
     · `abgeleitet` rechnet ja/nein aus einem Feld, nach einer Regel aus der festen Liste des Kerns; ein Modul bringt keinen
       Code mit. Aus einem zurückgehaltenen (sensiblen) Feld wird kein „nein“: die Angabe fehlt und ist benannt.
     · `antrag` nimmt die Antwort aus den Optionen des Erzeugens, in der Form ihres Typs. Fehlt eine Pflichtantwort oder passt
       sie nicht, entsteht keine Datei, und der Grund ist benannt.
     · Die Antworten gehen nicht ins Depot.
     · Beide Formen stehen allein, nur mit `ziel`, nur in der Ausgabe; die Regel- und Typnamen sind eine feste Liste.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const MODUL = Object.freeze({
  modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'probe-antrag-angaben', richtung: 'export', schreiber: 'xml@1',
  sektor: 'identity', label: 'Probe Antrag', quelle: 'antrag',
  zuordnung: [
    { feld: 'familyName', ziel: 'G1.F1' },
    { abgeleitet: { regel: 'nichtLeer', feld: 'email' }, ziel: 'G1.F2' },
    { abgeleitet: { regel: 'gleich', feld: 'maritalStatus', wert: 'married' }, ziel: 'G1.F3' },
    { abgeleitet: { regel: 'ausListe', feld: 'nationality', liste: ['DE', 'AT', 'FR'] }, ziel: 'G1.F4' },
    { abgeleitet: { regel: 'nichtLeer', bereich: 'health', feld: 'bloodType' }, ziel: 'G1.F5' },
    { antrag: { id: 'umzug', frage: 'Ist ein Umzug geplant?', typ: 'janein', pflicht: true }, ziel: 'G2.F6' },
    { antrag: { id: 'seit', frage: 'Seit wann wohnen Sie dort?', typ: 'datum' }, ziel: 'G2.F7' },
    { antrag: { id: 'art', frage: 'Art des Antrags', typ: 'auswahl', werte: { '01': 'Erstantrag', '02': 'Weiterleistung' }, pflicht: true }, ziel: 'G2.F8' },
    { antrag: { id: 'einnahmen', frage: 'Haben Sie Einnahmen?', typ: 'janein', vorschlag: { regel: 'nichtLeer', feld: 'email' } }, ziel: 'G2.F9' },
  ],
});
const ANTWORTEN = Object.freeze({ umzug: false, seit: '2020-02-29', art: '01', einnahmen: true });
const element = (xml, name) => { const m = new RegExp('<' + name + '>([^<]*)</' + name + '>').exec(xml); return m ? m[1] : null; };

async function depot({ email = 'a@example.org' } = {}) {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Probe');
  V.betreteApp();
  V.sektorFeldSetzen('identity', 'familyName', 'Muster');
  if (email) V.sektorFeldSetzen('identity', 'email', email);
  V.sektorFeldSetzen('identity', 'maritalStatus', 'married');
  V.sektorFeldSetzen('identity', 'nationality', 'AT');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  return V;
}
function bauen(kanal, antrag, extra) {
  const o = Object.assign({ antrag, _antragGruende: [], _unabgebildet: [] }, extra || {});
  return { xml: kanal.baue(o), gruende: o._antragGruende, unabgebildet: o._unabgebildet };
}

test('[Antrag·abgeleitet] nichtLeer, gleich, ausListe rechnen ja/nein aus dem Depot, in der Folge der Zuordnung', async () => {
  const V = await depot();
  const kanal = V.formatModulZuExportKanal(MODUL);
  assert.ok(kanal, 'das Modul ergibt einen Kanal');
  const { xml, gruende } = bauen(kanal, ANTWORTEN, { sensibel: true });
  assert.deepEqual(gruende, []);
  assert.equal(element(xml, 'F2'), 'true');
  assert.equal(element(xml, 'F3'), 'true');
  assert.equal(element(xml, 'F4'), 'true');
  assert.equal(element(xml, 'F5'), 'true', 'mit Zustimmung trägt das sensible Feld');
  const leer = await depot({ email: '' });
  assert.equal(element(bauen(leer.formatModulZuExportKanal(MODUL), ANTWORTEN).xml, 'F2'), 'false', 'nichtLeer an einem leeren Feld ist nein');
});

test('[Antrag·abgeleitet·Rot-Beweis] aus einem zurückgehaltenen sensiblen Feld wird kein „nein“: die Angabe fehlt und ist benannt', async () => {
  const V = await depot();
  assert.ok(V.feldIstSensibel(V.feldDefFuer('health', 'bloodType'), 'health'), 'Vorbedingung: die Blutgruppe ist sensibel');
  const { xml, unabgebildet } = bauen(V.formatModulZuExportKanal(MODUL), ANTWORTEN);
  assert.doesNotMatch(xml, /<F5>/, 'weder true noch false');
  // Auch die Staatsangehörigkeit gibt der Filter nur mit Zustimmung heraus: dann fehlt auch „EU/EWR“, statt „nein“ zu sagen.
  assert.ok(V.feldIstSensibel(V.feldDefFuer('identity', 'nationality'), 'identity'), 'Vorbedingung: die Staatsangehörigkeit ist sensibel');
  assert.doesNotMatch(xml, /<F4>/);
  assert.deepEqual(unabgebildet.map((u) => u.feld), ['nationality', 'bloodType']);
});

test('[Antrag·antrag] die Antworten stehen in der Datei in der Form ihres Typs; bei der Auswahl der Code', async () => {
  const V = await depot();
  const { xml } = bauen(V.formatModulZuExportKanal(MODUL), ANTWORTEN);
  assert.equal(element(xml, 'F6'), 'false');
  assert.equal(element(xml, 'F7'), '2020-02-29');
  assert.equal(element(xml, 'F8'), '01');
  assert.equal(element(xml, 'F9'), 'true');
  assert.ok(xml.indexOf('<F1>') < xml.indexOf('<F6>') && xml.indexOf('<F6>') < xml.indexOf('<F9>'), 'Folge der Zuordnung');
  const ohneFrei = bauen(V.formatModulZuExportKanal(MODUL), { umzug: true, art: '02' });
  assert.doesNotMatch(ohneFrei.xml, /<F7>|<F9>/, 'eine freiwillige Frage ohne Antwort fehlt einfach');
});

test('[Antrag·antrag·Rot-Beweis] ohne Pflichtantwort oder mit unpassender Antwort keine Datei, der Grund ist benannt', async () => {
  const V = await depot();
  const kanal = V.formatModulZuExportKanal(MODUL);
  const ohne = bauen(kanal, { art: '01' });
  assert.equal(ohne.xml, null);
  assert.deepEqual(ohne.gruende, [{ antrag: 'umzug', grund: 'antrag-fehlt' }]);
  const falsch = bauen(kanal, { umzug: 'nein', seit: '2021-02-29', art: 'Erstantrag' });
  assert.equal(falsch.xml, null);
  assert.deepEqual(falsch.gruende.map((g) => g.antrag + ':' + g.grund), ['umzug:antrag-ungueltig', 'seit:antrag-ungueltig', 'art:antrag-ungueltig']);
  assert.equal(kanal.baue({}), null, 'auch ohne `antrag` in den Optionen');
});

test('[Antrag·antrag] die Antworten gehen nicht ins Depot', async () => {
  const V = await depot();
  const vorher = JSON.stringify(V.getData());
  const geheim = 'Antwort-nur-fuer-diesen-Antrag';
  const modul = Object.assign({}, MODUL, { zuordnung: MODUL.zuordnung.concat([{ antrag: { id: 'frei', frage: 'Freitext', typ: 'text' }, ziel: 'G2.F10' }]) });
  const { xml } = bauen(V.formatModulZuExportKanal(modul), Object.assign({ frei: geheim }, ANTWORTEN));
  assert.equal(element(xml, 'F10'), geheim);
  assert.equal(JSON.stringify(V.getData()), vorher, 'das Depot ist unverändert');
  assert.ok(JSON.stringify(V.getData()).indexOf(geheim) < 0);
});

test('[Antrag·Vorschlag] ja/nein-Fragen mit `vorschlag` werden aus dem Depot vorbelegt; die Fragen liegen am Kanal', async () => {
  const V = await depot();
  const kanal = V.formatModulZuExportKanal(MODUL);
  assert.deepEqual(kanal.antragsfragen.map((f) => f.id), ['umzug', 'seit', 'art', 'einnahmen']);
  assert.deepEqual(kanal.antragsfragen[2].werte, { '01': 'Erstantrag', '02': 'Weiterleistung' });
  assert.deepEqual(kanal.antragVorschlaege({}), { einnahmen: true });
});

test('[Antrag·Prüfung·Rot-Beweis] unbekannte Regel, Code im Modul, fremde Schlüssel, Einlesen, doppelte id werden abgewiesen', async () => {
  const V = await depot();
  const mit = (z, extra) => Object.assign({}, MODUL, { zuordnung: [{ feld: 'familyName', ziel: 'G1.F1' }, z] }, extra || {});
  const grund = (m) => { const r = V.formatModulPruefen(m); return r.gueltig ? (r.verworfene[0] || {}).grund : r.grund; };
  assert.equal(grund(mit({ abgeleitet: { regel: 'beliebig', feld: 'email' }, ziel: 'G1.F2' })), 'zuordnung-abgeleitet');
  assert.equal(grund(mit({ abgeleitet: { regel: 'nichtLeer', feld: 'email', code: 'x => 1' }, ziel: 'G1.F2' })), 'zuordnung-abgeleitet');
  assert.equal(grund(mit({ abgeleitet: { regel: 'gleich', feld: 'email' }, ziel: 'G1.F2' })), 'zuordnung-abgeleitet', 'gleich ohne wert');
  assert.equal(grund(mit({ abgeleitet: { regel: 'nichtLeer', feld: 'gibtEsNicht' }, ziel: 'G1.F2' })), 'zuordnung-abgeleitet');
  assert.equal(grund(mit({ abgeleitet: { regel: 'nichtLeer', feld: 'email' }, feld: 'email', ziel: 'G1.F2' })), 'zuordnung-abgeleitet');
  assert.equal(grund(mit({ antrag: { id: 'x', frage: 'F?', typ: 'zahl' }, ziel: 'G1.F2' })), 'zuordnung-antrag');
  assert.equal(grund(mit({ antrag: { id: 'x', frage: 'F?', typ: 'auswahl' }, ziel: 'G1.F2' })), 'zuordnung-antrag', 'Auswahl ohne werte');
  assert.equal(grund(mit({ antrag: { id: 'x', frage: 'F?', typ: 'text', vorschlag: { regel: 'nichtLeer', feld: 'email' } }, ziel: 'G1.F2' })), 'zuordnung-antrag');
  assert.equal(grund(mit({ antrag: { id: 'x y', frage: 'F?', typ: 'janein' }, ziel: 'G1.F2' })), 'zuordnung-antrag');
  assert.equal(grund(mit({ antrag: { id: 'x', frage: 'F?', typ: 'janein' }, ziel: 'G1.F2' }, { richtung: 'import', leser: 'xml@1' })), 'nur-ausgabe');
  const doppelt = Object.assign({}, MODUL, { zuordnung: [{ feld: 'familyName', ziel: 'G1.F1' },
    { antrag: { id: 'x', frage: 'A?', typ: 'janein' }, ziel: 'G1.F2' }, { antrag: { id: 'x', frage: 'B?', typ: 'janein' }, ziel: 'G1.F3' }] });
  assert.equal(V.formatModulPruefen(doppelt).grund, 'antrag-id-doppelt');
});
