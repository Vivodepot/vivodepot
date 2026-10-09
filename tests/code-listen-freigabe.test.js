'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Freigabe je Codesystem (27.09.2026) — Register tools/code-listen-freigaben.json
   ────────────────────────────────────────────────────────────────────────
   Befund: die Lizenzzeilen der sechs Codelisten stammten vom Anlegen am 06.06. und waren nie
   gegen den Lizenztext geprüft; drei waren falsch oder unvollständig (SNOMED „Affiliate“,
   ICD-10-GM ohne den ICD-10-AM-Teil, LOINC mit einer alten Jahreszahl), zwei Stubs hießen „frei“.
   Jetzt gilt je System: eine geprüfte Lizenzquelle; ein Pflichthinweis, der wörtlich in NOTICE.md
   und THIRD_PARTY_LICENSES steht; eine Liste mit Daten ist geprüft oder hat eine benannte, offene
   Rückfrage; ein Stub trägt keine Daten. Und die Regel der Produktverantwortung: dem Standard
   folgen, wo es einen nutzbaren gibt — ein eigenes Codesystem nur mit Begründung.
   ROT-BEWEIS: NOTICE/THIRD_PARTY in ihren Vorständen (vor dieser Berichtigung, vor v809) und
   erfundene Verstöße gegen jede Regel.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const REGISTER = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'code-listen-freigaben.json'), 'utf8')).systeme;
const LISTEN = fs.readdirSync(path.join(REPO, 'code-listen')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', f), 'utf8')));
const lesen = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const normal = (s) => String(s).replace(/\s+/g, ' ').trim();
const STATUS = new Set(['geprueft', 'rueckfrage-offen', 'stub', 'stub-bis-genehmigung']);
const EIGENER_NAMENSRAUM = /^urn:(?:xoev-de:)?vivodepot:/i;

function maengel(register, listen, traeger) {
  const m = [];
  const ids = new Set(listen.map((l) => l.systemId));
  for (const l of listen) if (!register[l.systemId]) m.push(l.systemId + ': kein Freigabe-Eintrag');
  for (const id of Object.keys(register)) if (!ids.has(id)) m.push(id + ': Eintrag ohne Codeliste');
  for (const l of listen) {
    const e = register[l.systemId];
    if (!e) continue;
    const daten = Array.isArray(l.daten) ? l.daten : [];
    if (!STATUS.has(e.status)) m.push(l.systemId + ': unbekannter Status ' + e.status);
    const q = e.lizenzQuelle || {};
    if (!q.url || !q.fassung || !q.abgerufen) m.push(l.systemId + ': Lizenzquelle unvollständig (url, fassung, abgerufen)');
    if (/^stub/.test(e.status) && daten.length) m.push(l.systemId + ': Stub trägt Daten');
    if (daten.length && !['geprueft', 'rueckfrage-offen'].includes(e.status)) m.push(l.systemId + ': Daten ohne Freigabe');
    if (['rueckfrage-offen', 'stub-bis-genehmigung'].includes(e.status) && !(e.rueckfrage && e.rueckfrage.an && e.rueckfrage.datum)) m.push(l.systemId + ': offene Rückfrage ohne Adressat und Datum');
    const s = e.standard || {};
    if (EIGENER_NAMENSRAUM.test(l.uri || '')) {
      if (s.art !== 'eigen' || !s.begruendung || !(s.gepruefteStandards || []).length) m.push(l.systemId + ': eigenes Codesystem ohne Begründung und geprüfte Standards');
    } else if (s.art !== 'standard') m.push(l.systemId + ': standard.art muss „standard“ sein (kein eigener Namensraum)');
    if (daten.length) {
      if (!e.pflichthinweis) m.push(l.systemId + ': Pflichthinweis fehlt im Register');
      // Ein Pflichthinweis aus mehreren Teilen (ICD-10-GM: Band 1 und Band 2 des Anhangs) steht als Liste; jeder Teil wörtlich.
      else for (const [name, text] of Object.entries(traeger)) {
        for (const teil of [].concat(e.pflichthinweis)) if (!normal(text).includes(normal(teil))) m.push(l.systemId + ': Pflichthinweis steht nicht wörtlich in ' + name);
      }
    }
    // anzeigeNameEigen: der offizielle Begriff für alle Codes oder für keinen (dann fehlt display bewusst, für alle gleich).
    // Nur ein Teil wäre die stille Lücke. Wo die Lizenz zu jedem Code einen Namen verlangt (namePflicht, LOINC), heißt es: alle.
    if (l.anzeigeNameEigen) {
      const mit = daten.filter((d) => d.quellBegriff).length;
      if ((e.namePflicht || mit > 0) && mit < daten.length) for (const d of daten) if (!d.quellBegriff) m.push(l.systemId + ' ' + d.code + ': quellBegriff fehlt (anzeigeNameEigen' + (e.namePflicht ? ', namePflicht' : '') + ')');
    }
    if (e.codesFreigabe && !fs.existsSync(path.join(REPO, e.codesFreigabe))) m.push(l.systemId + ': codesFreigabe fehlt: ' + e.codesFreigabe);
  }
  return m;
}
const TRAEGER = () => ({ 'NOTICE.md': lesen('NOTICE.md'), THIRD_PARTY_LICENSES: lesen('THIRD_PARTY_LICENSES') });
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 });

test('[Codelisten·Freigabe] jedes Codesystem hat Freigabe, Lizenzquelle und seinen Pflichthinweis wörtlich', () => {
  assert.ok(LISTEN.length >= 6, 'Suchraum besetzt: ' + LISTEN.length + ' Codelisten');
  assert.deepEqual(maengel(REGISTER, LISTEN, TRAEGER()), []);
});

test('[Codelisten·Freigabe] ATC und LOINC stehen mit offener Rückfrage, nicht als geprüft', () => {
  assert.equal(REGISTER.atc.status, 'rueckfrage-offen');
  assert.equal(REGISTER.loinc.status, 'rueckfrage-offen');
});

test('[Codelisten·Freigabe·Rot-Beweis] die Vorstände von NOTICE/THIRD_PARTY fallen', () => {
  const vor = (rev) => ({ 'NOTICE.md': git(['show', rev + ':NOTICE.md']), THIRD_PARTY_LICENSES: git(['show', rev + ':THIRD_PARTY_LICENSES']) });
  // vor dieser Berichtigung: ICD-10-GM ohne ICD-10-AM-Teil, LOINC mit „(c) 1995-2026“
  const vorher = maengel(REGISTER, LISTEN, vor('18b3d6456')).join('\n');
  assert.match(vorher, /icd10: Pflichthinweis steht nicht wörtlich in NOTICE\.md/);
  assert.match(vorher, /loinc: Pflichthinweis steht nicht wörtlich in THIRD_PARTY_LICENSES/);
  // vor v809: SNOMED mit Affiliate-Lizenz, ohne GPS-Namensnennung
  assert.match(maengel(REGISTER, LISTEN, vor('1469d395b')).join('\n'), /snomedAllergen: Pflichthinweis steht nicht wörtlich/);
});

test('[Codelisten·Freigabe·Rot-Beweis] jede Regel schlägt an einem erfundenen Verstoß an', () => {
  const kopie = JSON.parse(JSON.stringify(REGISTER));
  const listen = JSON.parse(JSON.stringify(LISTEN));
  const xoev = listen.find((l) => l.systemId === 'xoev-rollencode');
  const esco = listen.find((l) => l.systemId === 'esco');
  delete kopie['xoev-rollencode'].standard.begruendung;               // eigenes Codesystem ohne Begründung
  esco.daten = [{ code: 'x', anzeigeName: 'y' }];                       // Stub mit Daten
  delete kopie.atc.rueckfrage;                                          // offene Rückfrage ohne Adressat
  kopie.icd10.lizenzQuelle = { url: 'u' };                              // Lizenzquelle unvollständig
  listen.find((l) => l.systemId === 'loinc').daten[0] = { code: '1-1', anzeigeName: 'z' }; // anzeigeNameEigen ohne quellBegriff
  const m = maengel(kopie, [...listen, { systemId: 'neu', uri: 'http://x', daten: [] }], TRAEGER()).join('\n');
  for (const erwartet of [/xoev-rollencode: eigenes Codesystem ohne Begründung/, /esco: Stub trägt Daten/, /atc: offene Rückfrage ohne Adressat/,
    /icd10: Lizenzquelle unvollständig/, /loinc 1-1: quellBegriff fehlt/, /neu: kein Freigabe-Eintrag/]) assert.match(m, erwartet);
  assert.ok(xoev, 'Vorbedingung');
});

test('[Codelisten·Freigabe·Rot-Beweis] quellBegriff: alle oder keiner; bei namePflicht (LOINC) alle', () => {
  const listen = JSON.parse(JSON.stringify(LISTEN));
  const loinc = listen.find((l) => l.systemId === 'loinc');
  const atc = listen.find((l) => l.systemId === 'atc');
  assert.ok(REGISTER.loinc.namePflicht && loinc.anzeigeNameEigen && atc.anzeigeNameEigen, 'Vorbedingung: LOINC mit namePflicht, ATC mit anzeigeNameEigen');
  const ohne = (l) => { for (const d of l.daten) delete d.quellBegriff; };
  ohne(loinc);                                                         // LOINC ganz ohne Namen: Lizenzverstoß
  atc.daten[0].quellBegriff = 'x';                                     // ATC teilweise: die stille Lücke
  const m = maengel(REGISTER, listen, TRAEGER()).join('\n');
  assert.match(m, /loinc 48765-2: quellBegriff fehlt \(anzeigeNameEigen, namePflicht\)/);
  assert.match(m, /atc J01CA04: quellBegriff fehlt/);
  delete atc.daten[0].quellBegriff;                                    // ATC ganz ohne: erlaubt, display fehlt für alle
  assert.doesNotMatch(maengel(REGISTER, listen, TRAEGER()).join('\n'), /atc .*quellBegriff/);
});
