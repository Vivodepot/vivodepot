'use strict';
/* Befund SUB-SICHERN-FENSTER (02.11.2026, HOCH): Wer im Sub-Depot speichert, darf die Sicht nicht auf das Haupt-Depot umhängen.
   depotInternSichern und depotInDateiSichern schrieben im Sub-Kontext `data = _ankerData`, warteten auf das Speichern
   und hängten erst im finally zurück. Alles, was in diesem Fenster über `data` schrieb — ein eingelassenes Modul, ein Feld —,
   landete still im Haupt-Depot und fehlte im Sub-Depot. Gefunden über den Air-Lauf, in dem
   tests/e2e/pdf-export-alle-ausloeser-sub-depot.spec.js unter Last ein Modul im Fenster einließ (PDF ohne Modul).
   Diese Probe schreibt in JEDEM Takt, solange das Sichern läuft, und verlangt danach: alles im Sub-Depot, nichts im Haupt-Depot,
   und die Sicht hat während des Sicherns nie auf das Haupt-Depot gezeigt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const PW = 'anker-passwort-fenster-2026';
const SUB_PW = 'sub-passwort-fenster-2026';

function modul(id) {
  return JSON.stringify({
    modulTyp: 'logikModul', id, titel: 'Probe', sektor: 'advanceCare', moduleVersion: 1, herkunft: 'probe-sub-sichern-fenster',
    datenSchema: {}, abschnitte: [{ titel: 'A', bloecke: [{ typ: 'immer', texte: ['Zeile.'] }] }],
    dokAusgabe: { h1: 'Probe', klasse: 'probe-dok', herkunftText: '', fussText: '', knopfAttr: 'probe', dateiBasis: 'Probe' },
  });
}

async function imSubDepot() {
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: HOSTED });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Verwalterin');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Lena', inhaberin: 'Lena', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  assert.equal(V.imSubKontext(), true, 'Vorbedingung: Sub-Kontext aktiv');
  return V;
}

const takt = () => new Promise((r) => setImmediate(r));

// Schreibt, solange `laeuft` offen ist, in jedem Takt ein Modul und ein Feld; zählt die Takte, in denen die Sicht auf das
// Haupt-Depot zeigte.
async function schreibeWaehrend(V, laeuft, kennung) {
  const sub = V.getData();
  let fertig = false;
  laeuft.then(() => { fertig = true; }, () => { fertig = true; });
  const ids = []; let werte = 0; let sichtAufAnker = 0;
  for (let i = 0; !fertig && i < 2000; i++) {
    if (V.getData() !== sub) sichtAufAnker++;
    const id = 'probe-fenster-' + kennung + '-' + i;
    const r = V.modulEinlassen(modul(id));
    assert.equal(r.angenommen, true, 'Einlass muss angenommen werden: ' + r.grund);
    ids.push(id);
    V.sektorFeldSetzen('identity', 'familyName', 'Fenster-' + kennung + '-' + i); werte = i;
    await takt();
  }
  await laeuft;
  return { sub, ids, letzterWert: 'Fenster-' + kennung + '-' + werte, sichtAufAnker };
}

function pruefe(V, { sub, ids, letzterWert, sichtAufAnker }) {
  assert.ok(ids.length >= 2, 'Vorbedingung: das Sichern lief über mehrere Takte (sonst misst die Probe nichts): ' + ids.length);
  assert.equal(V.imSubKontext(), true, 'nach dem Sichern weiter im Sub-Kontext');
  assert.equal(V.getData(), sub, 'die Sicht steht wieder auf dem Sub-Depot');
  const anker = V.ankerDaten();
  const imAnker = (anker.logikModule || []).filter((m) => m && ids.includes(m.id)).map((m) => m.id);
  assert.deepEqual(imAnker, [], 'kein im Sub-Depot eingelassenes Modul im Haupt-Depot');
  const imSub = new Set((sub.logikModule || []).map((m) => m && m.id));
  assert.deepEqual(ids.filter((id) => !imSub.has(id)), [], 'jedes eingelassene Modul steht im Sub-Depot');
  const ankerName = anker.sektoren && anker.sektoren.identity && anker.sektoren.identity.familyName;
  assert.ok(!String(JSON.stringify(ankerName || '')).includes('Fenster-'), 'kein Feldwert aus dem Sub-Depot im Haupt-Depot');
  assert.ok(JSON.stringify(sub.sektoren.identity.familyName).includes(letzterWert), 'der letzte Feldwert steht im Sub-Depot');
  assert.equal(sichtAufAnker, 0, 'während des Sicherns zeigte die Sicht nie auf das Haupt-Depot');
}

test('[SUB-SICHERN-FENSTER] internes Sichern im Sub-Depot: Modul und Feld im Fenster bleiben im Sub-Depot', async () => {
  const V = await imSubDepot();
  pruefe(V, await schreibeWaehrend(V, V.depotInternSichern(), 'intern'));
});

test('[SUB-SICHERN-FENSTER] Sichern als Datei im Sub-Depot: Modul und Feld im Fenster bleiben im Sub-Depot', async () => {
  const V = await imSubDepot();
  pruefe(V, await schreibeWaehrend(V, V.depotInDateiSichern(), 'datei'));
});

/* ── Wächter gegen die Klasse ─────────────────────────────────────────────────────────────────────────────────────────────────
   Die Fehlerklasse ist das zeitweise Umhängen der Sicht: `data` zeigt für die Dauer eines Wartens auf ein anderes Depot als das,
   in dem die Bürgerin gerade steht. Jeder Schreibvorgang in diesem Fenster trifft das falsche Depot. Der Kern hängt `data` darum
   nur noch an einer Stelle auf den Anker: beim Verlassen des Sub-Depots (subKontextVerlassen), und dort endgültig. Kein finally
   setzt `data`; die beiden Sichern-Wege (_depotInternSichernLauf hinter depotInternSichern, depotInDateiSichern) weisen `data` gar nicht zu. */
const fs = require('node:fs');
const path = require('node:path');
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function funktionsKoerper(text, kopf) {
  const a = text.indexOf(kopf);
  if (a < 0) return null;
  return text.slice(a, text.indexOf('\n}\n', a));
}

function klasse(text) {
  const aufAnker = [...text.matchAll(/(?<![\w.])data\s*=\s*_ankerData\b/g)].map((m) => m.index);
  const verlassen = funktionsKoerper(text, 'async function subKontextVerlassen() {');
  const vA = verlassen ? text.indexOf(verlassen) : -1;
  const ausserhalbVerlassen = aufAnker.filter((i) => !(vA >= 0 && i >= vA && i < vA + verlassen.length)).length;
  const imFinally = (text.match(/finally\s*\{[^}]*(?<![\w.])data\s*=(?!=)/g) || []).length;
  const inSichern = ['async function _depotInternSichernLauf(', 'async function depotInDateiSichern('].map((k) => {
    const f = funktionsKoerper(text, k);
    return f === null ? -1 : (f.match(/(?<![\w.])data\s*=(?!=)/g) || []).length;
  });
  return { aufAnker: aufAnker.length, ausserhalbVerlassen, imFinally, inSichern };
}

test('[SUB-SICHERN-FENSTER·Klasse] data hängt nur beim Verlassen auf den Anker, nie für die Dauer eines Wartens', () => {
  const k = klasse(KERN);
  assert.equal(k.aufAnker, 1, 'genau eine Stelle hängt data auf den Anker (Positivkontrolle: subKontextVerlassen)');
  assert.equal(k.ausserhalbVerlassen, 0, 'keine Stelle außerhalb von subKontextVerlassen hängt data auf den Anker');
  assert.equal(k.imFinally, 0, 'kein finally setzt data zurück — ein Rücktausch heißt, vorher wurde umgehängt');
  assert.deepEqual(k.inSichern, [0, 0], 'die beiden Sichern-Wege weisen data nicht zu (-1 hieße: Funktion nicht gefunden)');
});

test('[SUB-SICHERN-FENSTER·Klasse·Rot-Beweis] das frühere Umhängen im Sichern-Weg fällt auf', () => {
  const stelle = '    let _idbMarke;\n    try { _idbMarke = await depotInIdbSichern(anker); }';
  assert.ok(KERN.includes(stelle), 'Anker der Pflanzung gefunden');
  const alt = KERN.replace(stelle, '    const _subUUID = aktiverSubKontext; const _subData = data; data = _ankerData;\n'
    + '    try { await depotInIdbSichern(); } finally { if (aktiverSubKontext === _subUUID) data = _subData; }\n' + stelle);
  const k = klasse(alt);
  assert.equal(k.ausserhalbVerlassen, 1);
  assert.equal(k.imFinally, 1);
  assert.notDeepEqual(k.inSichern, [0, 0]);
});

/* ── Wächter gegen die Klasse, zweite Seite: wer schreibt, ohne den Anker zu nennen ───────────────────────────────────────────
   Ohne Angabe serialisieren depotSerialisieren / depotInIdbSichern / depotHerunterladen das sichtbare Depot (`data`). Im
   Sub-Kontext ist das der Sub-Inhalt, und er käme unter dem Anker-Schlüssel in die Anker-Datei. Gemessen am 02.11.2026: jeder
   Aufrufer ohne Angabe läuft nur im Anker-Kontext oder liest nur. Diese Liste hält das fest; ein neuer Aufrufer ohne Angabe
   fällt auf und braucht eine Entscheidung: den Anker übergeben (wie die Sichern-Wege im Sub-Zweig) oder hier mit Grund eintragen. */
const OHNE_ANGABE_ERLAUBT = Object.freeze({
  _passwortProbeRoundtrip: 'liest nur: Entschlüsselungs-Rundweg zur Passwortprüfung, schreibt nichts',
  passwortWechselDurchfuehren: 'verweigert im Sub-Kontext (wirft „nur im Anker-Kontext“)',
  _depotInternSichernLauf: 'nur der Anker-Zweig; der Sub-Zweig übergibt den Anker',
  depotInDateiSichern: 'nur der Anker-Zweig; der Sub-Zweig übergibt den Anker',
  konfliktWaehleDatei: 'Stand-Konflikt beim Öffnen des Ankers, vor jedem Sub-Kontext',
  flowStandKonfliktDialog: 'Stand-Konflikt beim Öffnen des Ankers, vor jedem Sub-Kontext',
  migrationsHinweisZeigen: 'Dialog beim ersten Eintritt in den Anker (betreteApp, nicht warSchonDrin)',
  _depotAusPasswortFinalisieren: 'Anlegen eines neuen Depots, kein Sub-Kontext',
  podSicherungAblegen: 'verweigert im Sub-Kontext',
});
const SCHREIBWEG = /(?<![\w.])(depotSerialisieren|depotInIdbSichern|depotHerunterladen)\(\s*(\)|\{\s*istAnlegen)/;

function aufruferOhneAngabe(text) {
  // Blockkommentare zeilentreu ausblenden: ein Satz über depotSerialisieren() ist kein Aufruf.
  const ohneBlock = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const zeilen = ohneBlock.split('\n'); let fn = null; const treffer = [];
  zeilen.forEach((z, i) => {
    const kopf = z.match(/^(?:async )?function (\w+)/);
    if (kopf) { fn = kopf[1]; return; }
    if (/^\s*(\/\/|\*)/.test(z)) return;
    const ohneKommentar = z.replace(/\/\/.*$/, '');
    if (SCHREIBWEG.test(ohneKommentar) && !/`[^`]*(depotSerialisieren|depotInIdbSichern|depotHerunterladen)\(/.test(ohneKommentar)) treffer.push({ zeile: i + 1, fn });
  });
  return treffer;
}

test('[SUB-SICHERN-FENSTER·Aufrufer] jeder Schreibweg ohne ausdrücklichen Anker läuft nur im Anker-Kontext oder liest nur', () => {
  const t = aufruferOhneAngabe(KERN);
  assert.ok(t.length >= 5, 'Positivkontrolle: die bekannten Aufrufer sind gefunden: ' + t.length);
  const unbekannt = t.filter((x) => !Object.prototype.hasOwnProperty.call(OHNE_ANGABE_ERLAUBT, x.fn));
  assert.deepEqual(unbekannt, [], 'neuer Aufrufer ohne Anker-Angabe — Anker übergeben oder mit Grund in OHNE_ANGABE_ERLAUBT eintragen');
  const verwaist = Object.keys(OHNE_ANGABE_ERLAUBT).filter((f) => !t.some((x) => x.fn === f));
  assert.deepEqual(verwaist, [], 'ein Listeneintrag ohne Aufrufer gehört gestrichen (die Liste kann nur schrumpfen)');
  for (const f of ['passwortWechselDurchfuehren', 'podSicherungAblegen']) {
    assert.match(funktionsKoerper(KERN, 'async function ' + f + '('), /if \(imSubKontext\(\)/, f + ' verweigert im Sub-Kontext');
  }
});

test('[SUB-SICHERN-FENSTER·Aufrufer·Rot-Beweis] ein neuer Weg, der im Sub-Kontext ohne Anker sichert, fällt auf', () => {
  const neu = KERN.replace('async function podSicherungAblegen(', 'async function neuerSichernWeg() {\n  await depotHerunterladen();\n}\nasync function podSicherungAblegen(');
  assert.notEqual(neu, KERN);
  const unbekannt = aufruferOhneAngabe(neu).filter((x) => !Object.prototype.hasOwnProperty.call(OHNE_ANGABE_ERLAUBT, x.fn));
  assert.deepEqual(unbekannt.map((x) => x.fn), ['neuerSichernWeg']);
});
