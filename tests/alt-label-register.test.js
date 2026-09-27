'use strict';
/* ════════════════════════════════════════════════════════════════════════
   ALT-LABEL-REGISTER — jeder Eintrag ist vollständig, jeder Code auflösbar.
   ────────────────────────────────────────────────────────────────────────
   Wird ein Feld entfernt, bleiben seine Werte im Depot (Verwaisungsregel).
   Was verschwindet, ist die FRAGE — und ohne sie sagt der Wert nichts.

   Der Grund, warum das Register die OPTIONSLABELS mitführt und nicht nur
   das Feld-Label: Der gespeicherte Code `familie` kommt in vier der fünf
   `ki_verhalten_*`-Felder vor und bedeutet jedes Mal etwas anderes. Wer nur
   Feld-Labels sammelt, hat das Problem nicht gelöst, sondern verschoben.

   Dieser Test ist die Ernte-Sicherung: Er prüft, dass das Geerntete
   VOLLSTÄNDIG ist — solange die Quellen noch stehen. Fällt später eine
   Lese-App-Deklaration weg, bleibt das Register die einzige Quelle, und
   dann ist eine Lücke nicht mehr zu schliessen.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

/* Gegenrichtung der Konformitaetsklausel (U2-ADR-096 §6): Das ADR nennt diese Pruefungen,
   diese Pruefungen nennen das ADR. Der Test unten macht die Bindung AUSFUEHRBAR statt
   dekorativ — eine Konstante, die nur dasteht, ist genau die Sorte Beteuerung, von der heute
   mehrfach belegt ist, dass sie nicht traegt. */
const ADR = 'U2-ADR-096';
const PRUEFUNGEN = [
  'alt-label-register-eintraege-vollstaendig',
  'alt-label-register-optionslabels-vorhanden',
  'alt-label-register-deckt-lese-app-reste',
];

test('[Klausel] das ADR nennt genau diese Pruefungen (Bindung, beide Richtungen)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const verz = path.join(__dirname, '..', 'docs', 'adr');
  const datei = fs.readdirSync(verz).find(f => f.indexOf(ADR) === 0 || f.indexOf('vivodepot-' + ADR) === 0);
  assert.ok(datei, 'Das ADR, auf das sich diese Pruefungen berufen, existiert nicht: ' + ADR);
  const text = fs.readFileSync(path.join(verz, datei), 'utf8');
  assert.ok(/## Konformität/.test(text), ADR + ' traegt keine Konformitaetsklausel');
  const fehlend = PRUEFUNGEN.filter(p => text.indexOf(p) < 0);
  assert.equal(fehlend.join(', '), '',
    'Diese Pruefungen berufen sich auf ' + ADR + ', werden dort aber nicht genannt. Klausel und '
    + 'Pruefung sind auseinandergelaufen — genau das, was die Bindung verhindern soll: ' + fehlend.join(', '));
});


const REG = () => ladeKern().V.ALT_LABEL_REGISTER;
const alleFelder = (f, raus = []) => {
  raus.push(f);
  for (const u of f.unterFelder || []) alleFelder(u, raus);
  return raus;
};

test('[AltLabel] jeder Eintrag traegt Sektor, Datum, ADR und ein vollstaendiges Feld', () => {
  const fehlend = [];
  for (const e of REG()) {
    const wo = (e.feld && e.feld.id) || '(ohne id)';
    if (!e.sektor) fehlend.push(wo + ': sektor');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.entferntAm))) fehlend.push(wo + ': entferntAm');
    if (!/^U2-ADR-\d{3}$/.test(String(e.adr))) fehlend.push(wo + ': adr');
    for (const f of alleFelder(e.feld || {})) {
      if (!f.id) fehlend.push(wo + ': id fehlt an einem Unterfeld');
      if (!f.label || !String(f.label).trim()) fehlend.push(wo + '.' + f.id + ': label');
      if (!f.typ) fehlend.push(wo + '.' + f.id + ': typ');
    }
  }
  assert.equal(fehlend.sort().join('\n'), '',
    'Unvollstaendige Registereintraege. Ein Eintrag ohne Label ist wertlos — genau das Label ist '
    + 'das, was beim Entfernen verlorengeht:\n' + fehlend.sort().join('\n'));
});

test('[AltLabel·Gegenprobe] jedes auswahl-Feld traegt seine Optionslabels (ein Feld ohne Optionen faellt auf)', () => {
  const ohne = [];
  for (const e of REG()) {
    for (const f of alleFelder(e.feld || {})) {
      if (f.typ !== 'auswahl' && f.typ !== 'mehrfachauswahl') continue;
      if (!Array.isArray(f.optionen) || !f.optionen.length) { ohne.push(e.feld.id + '.' + f.id); continue; }
      for (const o of f.optionen) {
        if (!o.wert || !o.label) ohne.push(e.feld.id + '.' + f.id + ': Option unvollstaendig');
      }
    }
  }
  assert.equal(ohne.sort().join('\n'), '',
    'Ein Auswahl-Feld ohne Optionslabels speichert einen Code, den niemand aufloesen kann. Der '
    + 'gespeicherte Wert waere dann genauso unlesbar wie vorher:\n' + ohne.sort().join('\n'));
});

test('[AltLabel·Rot-Beweis] DER KERNFALL: derselbe Code loest je Feld VERSCHIEDEN auf', () => {
  const reg = REG();
  const feldVon = (id) => (reg.find(e => e.feld.id === id) || {}).feld;
  const loese = (id, code) => {
    const f = feldVon(id);
    assert.ok(f, 'Registereintrag fehlt: ' + id);
    const o = (f.optionen || []).find(x => x.wert === code);
    assert.ok(o, id + ' kennt den Code „' + code + '" nicht');
    return o.label;
  };
  // Genau der Befund, der den Zuschnitt des Registers bestimmt hat.
  const a = loese('ki_verhalten_grundsatz', 'familie');
  const b = loese('ki_verhalten_fuer_wen', 'familie');
  const c = loese('ki_verhalten_dauer', 'familie');
  assert.notEqual(a, b, 'derselbe Code muss je Feld verschieden auffloesen — sonst waere der Befund falsch');
  assert.notEqual(b, c);
  assert.ok(a.includes('entscheidet') && b.includes('Familie') && c.includes('Familie'),
    'die Auflösungen sind die echten Labels, keine Platzhalter');
});

test('[AltLabel] das Register deckt JEDES Feld ab, das nur noch die Lese-App kennt', () => {
  /* Die Ernte-Vollstaendigkeit, gegen die Wirklichkeit geprueft statt gegen eine Zahl: Jedes
     Feld, das der Kern nicht mehr fuehrt und die Lese-App noch, ist ein Kandidat fuer die
     Ansicht „Fruehere Angaben" — und muss im Register stehen, SOLANGE die Lese-App-Deklaration
     als Quelle existiert. Faellt sie spaeter weg, ist die Luecke nicht mehr zu schliessen.

     Ausgenommen sind die Felder, deren Werte eine Kern-Migration in eine neue Form ueberfuehrt
     (konten, fachaerzte, …) — dort geht nichts verloren, der Wert bekommt ein neues Zuhause.
     Und `menschen`, das kein entferntes Feld ist, sondern gleicher Name bei anderer Mechanik. */
  const K = ladeKern().V;
  const Lr = ladeLesen(); const L = Lr.V || Lr;
  const ids = (V) => new Set(Object.values(V.SEKTOR_BY_ID || {})
    .flatMap(s => (s.sektionen || []).flatMap(x => (x.felder || []).map(f => s.id + '.' + f.id))));
  const kern = ids(K), lese = ids(L);
  const imRegister = new Set(REG().map(e => e.sektor + '.' + e.feld.id));

  // Von einer Kern-Migration ueberfuehrt → kein Registerfall.
  const UEBERFUEHRT = /^(finance\.(konto_haupt_|kreditkarte)|health\.facharzt_|identity\.tier_|mobility\.auto|personal\.brief_|housing\.zw_)/;
  const ANDERE_MECHANIK = new Set(['people.menschen']);
  // UMBAU_LAEUFT (die 23 advanceCare-Vorsorge-Flachfelder) ersatzlos gestrichen (19.09.2026,
  // dod-stand#B8): der Kern migriert sie jetzt vollständig (Schema 39/52), die Lese-App führt
  // keine der Deklarationen mehr — die Ausnahme schützte nichts mehr, das noch existierte.

  const offen = [...lese].filter(k => !kern.has(k) && !imRegister.has(k)
    && !UEBERFUEHRT.test(k) && !ANDERE_MECHANIK.has(k)).sort();
  assert.equal(offen.join('\n'), '',
    'Diese Felder kennt nur noch die Lese-App und stehen NICHT im Register. Ihre Werte liegen im '
    + 'Depot, ihre Frage haengt an einer Deklaration, die irgendwann faellt — dann ist das Label '
    + 'weg. Jetzt ernten, nicht spaeter:\n' + offen.join('\n'));
});

test('[AltLabel] die zehn geernteten Eintraege sind gezaehlt', () => {
  // Wie bei den Paritaets-Freistellungen: Eine Zahl, die mitwaechst, faellt niemandem auf.
  // Wer einen Eintrag ergaenzt (also ein Feld entfernt), fasst diesen Test mit an.
  // 10 → 11 am 29.07.2026: `sozialversicherung.pflegedienst_kontakt` (U2-ADR-116 §7). Der erste
  // Eintrag, der NICHT aus der Ernte vom 23.07. stammt, sondern beim Entfernen mitgeschrieben
  // wurde — genau der Fall, für den das Register angelegt wurde.
  // 11 → 12 am 14.08.2026: `finanzen.dt_rentenversicherungsnr` (U2-ADR-139).
  // 12 → 31 am 22.08.2026 (Schnitt Glied 3, A448): 19 Flachfelder gingen in neun Korb-1-Listen
  // auf (ausweis/aufenthaltstitel/elefand/krankenkassenkarte/rentenversicherung/pflegekasse_nummer/
  // schwerbehindertenausweis/bundid) — die Lese-App führt ihre alten Deklarationen unverändert
  // weiter, darum ist das Ernten hier PFLICHT (s. Test „das Register deckt JEDES Feld ab").
  assert.equal(REG().length, 31, 'zehn geerntet am 23.07.2026, zwei beim Entfernen (29.07./14.08.), 19 am 22.08.2026 (Glied 3)');
  const adrs = [...new Set(REG().map(e => e.adr))].sort().join(',');
  assert.equal(adrs, 'U2-ADR-022,U2-ADR-050,U2-ADR-067,U2-ADR-069,U2-ADR-116,U2-ADR-139,U2-ADR-161',
    'jedes entfernte Feld traegt die Entscheidung, die es entfernt hat — keines ist ohne ADR verschwunden');
});
