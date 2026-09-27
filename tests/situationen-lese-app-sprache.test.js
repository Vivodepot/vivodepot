'use strict';
/* Situationsblätter in der Lese-App folgen der Sprache der Datei (Bauteil 3 der Messung „Modul-Text → Lese-App").
   Vorher stand der deutsche Text der zehn Situationen fest im Katalog: ein Sprachmodul erreichte ihn nicht, die
   Empfängerin einer englischen Datei las deutsche Blatt-Titel, Einführungen, Block-Hinweise und Zeilennamen.
   Jetzt laufen Titel, Einführung, Blocktitel, Block-Hinweis, Zeilenname und Optionsname über `textLesen`; die bekannten
   Kennungen (situation:<id>.titel|.einfuehrung, situation:<id>#<block>.titel|.hint, situation:<id>.<feld>.label,
   situation:<id>.<feld>/<option>.label) werden aus den Situationen der Datei abgeleitet, nicht als Liste geführt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const textsatz = (texte) => ({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'en', texte });
const depot = (module, sprache) => Object.assign({ schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {} },
  module ? { textsatzModule: [module], textsprache: sprache || 'en' } : {});
function oeffnen(d) {
  const { V } = ladeLesen();   // Standard: die Saat des Standard-Produkts liegt in der Mitschrift
  V.setData(d);
  V._foldVollmachtenLesen(d);
  return V;
}
const roh = () => { const { V } = ladeLesen(); V.setData(depot(null)); return V; };

/* Die Kennungen, die die Struktur der Situationen hergibt — hier unabhängig vom Code berechnet. */
function erwartet(V) {
  const aus = [];
  const art = (n, k, arten) => { for (const a of arten) if (typeof n[a] === 'string') aus.push(k + '.' + a); };
  const feld = (f, k) => {
    art(f, k, ['label']);
    for (const uf of (f.unterFelder || [])) feld(uf, k + '/' + uf.id);
    for (const o of (f.optionen || [])) if (o && typeof o.wert === 'string') art(o, k + '/' + o.wert, ['label']);
  };
  for (const s of V.situationenAlleLesen()) {
    art(s, 'situation:' + s.id, ['titel', 'einfuehrung']);
    for (const b of (s.bloecke || [])) {
      if (b.id) art(b, 'situation:' + s.id + '#' + b.id, ['titel', 'hint']);
      for (const e of (b.eintraege || [])) if (e.feld && typeof e.feld === 'object' && e.feld.id) feld(e.feld, 'situation:' + s.id + '.' + e.feld.id);
    }
  }
  return aus;
}

test('[Ableitung] die bekannten Kennungen kommen aus den Situationen der Datei — Zahl und Inhalt stimmen mit der Struktur', () => {
  const V = roh();
  const soll = new Set(erwartet(V));
  const ist = V._situationKennungenLesen();
  assert.ok(soll.size > 150, 'die Struktur trägt viele Kennungen: ' + soll.size);
  assert.deepEqual(Array.from(ist).sort(), Array.from(soll).sort());
  assert.equal(V._istSituationKennungLesen('situation:krankenhaus.titel'), true);
  assert.equal(V._istSituationKennungLesen('situation:krankenhaus.erfunden.label'), false);
  assert.equal(V._istSituationKennungLesen('situation:gibt-es-nicht.titel'), false);
});

test('[Ausbeute] ohne Sprachmodul bleibt der Text des Templates', () => {
  const V = oeffnen(depot(null));
  assert.match(V.sidebarHTML(), /Vor einem Krankenhaus-Aufenthalt/);
  assert.match(V.situationContentHTML('krankenhaus'), /Vor einem Krankenhaus-Aufenthalt/);
});

test('[Sprache] ein englisches Modul ersetzt Titel, Einführung, Blocktitel, Block-Hinweis, Zeilenname und Optionsname', () => {
  const V0 = roh();
  const krankenhaus = V0.situationByIdLesen('krankenhaus');
  const block = krankenhaus.bloecke.find((b) => b.id && b.titel);
  const todesfall = V0.situationByIdLesen('todesfall-uebernahme');
  const hinweisBlock = todesfall.bloecke.find((b) => b.id && b.hint);
  const inlineFeld = krankenhaus.bloecke.flatMap((b) => b.eintraege || []).map((e) => e.feld).find((f) => f && typeof f === 'object' && f.id && f.label && !f.sensibel);
  const volljaehrig = V0.situationByIdLesen('volljaehrig');
  const auswahl = volljaehrig.bloecke.flatMap((b) => b.eintraege || []).map((e) => e.feld).find((f) => f && typeof f === 'object' && Array.isArray(f.optionen) && f.optionen.length);
  const opt = auswahl.optionen[0];
  const texte = {
    'situation:krankenhaus.titel': 'Before a hospital stay',
    'situation:krankenhaus.einfuehrung': 'A hospital stay is coming up.',
    ['situation:krankenhaus#' + block.id + '.titel']: 'Block title EN',
    ['situation:todesfall-uebernahme#' + hinweisBlock.id + '.hint']: 'Block hint EN',
    ['situation:krankenhaus.' + inlineFeld.id + '.label']: 'Field label EN',
    ['situation:volljaehrig.' + auswahl.id + '/' + opt.wert + '.label']: 'Option label EN',
  };
  const V = oeffnen(depot(textsatz(texte)));
  const nav = V.sidebarHTML();
  assert.match(nav, /Before a hospital stay/);
  assert.doesNotMatch(nav, /Vor einem Krankenhaus-Aufenthalt/, 'der deutsche Titel steht nicht mehr da');
  const k = V.situationContentHTML('krankenhaus');
  assert.ok(k.includes('A hospital stay is coming up.') && k.includes('Block title EN'), 'Einführung und Blocktitel');
  assert.ok(k.includes('Field label EN'), 'Zeilenname des eigenen Felds');
  assert.doesNotMatch(k, />Vor einem Krankenhaus-Aufenthalt</, 'der Titel im Blatt');
  assert.ok(V.situationContentHTML('todesfall-uebernahme').includes('Block hint EN'), 'Block-Hinweis');
  const opts = V.situationModell('volljaehrig');
  assert.ok(JSON.stringify(opts).length > 0);
  assert.equal(V.situationAufgeloestLesen('volljaehrig').bloecke.flatMap((b) => b.eintraege || []).map((e) => e.feld).find((f) => f && f.id === auswahl.id).optionen[0].label, 'Option label EN');
});

test('[Gegenprobe] eine Kennung, die keine Situation hergibt, wird nicht angenommen — der deutsche Text bleibt', () => {
  const V = oeffnen(depot(textsatz({ 'situation:krankenhaus.erfunden.label': 'X', 'situation:krankenhaus.titel': 'Before a hospital stay' })));
  assert.match(V.sidebarHTML(), /Before a hospital stay/, 'die bekannte Kennung gilt');
  assert.doesNotMatch(V.situationContentHTML('krankenhaus'), />X</);
});

test('[Abgrenzung] ein Angehörigen-Blatt trägt seinen Text selbst — der Textsatz fasst es nicht an', () => {
  const d = depot(textsatz({ 'situation:krankenhaus.titel': 'Before a hospital stay' }));
  d.angehoerigenVorlagenModule = [{ modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'test', sprache: 'de',
    situationen: { 'krankenhaus-blatt': { titel: 'Krankenhaus-Blatt', bloecke: [{ id: 'x', titel: 'Block', eintraege: [{ quelle: 'identity', feld: 'givenName' }] }] } } }];
  const V = oeffnen(d);
  assert.match(V.angehoerigenBlattHTML('krankenhaus-blatt'), /Krankenhaus-Blatt/);
});
