'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   W-15 („Eine Quelle statt Kopien", Zug 3, 12.08.2026) — der Wächter
   gegen das Vergessen, strukturell statt über eine gepflegte Namensliste.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { pruefeSektorenHandKopien, pruefeAssistentenDuplikate } = require('../tools/w15-eine-quelle-statt-kopien-pruefen.js');
const REPO = path.join(__dirname, '..');

test('[W-15 Teil A] Positivkontrolle: tools/*.js führt heute keine Sektorenlisten-Handkopie mehr', () => {
  const funde = pruefeSektorenHandKopien();
  assert.deepEqual(funde, [], `Unerwarteter Fund — Meldungen: ${JSON.stringify(funde)}`);
});

test('[W-15 Teil A · Rotmachbarkeit] eine gepflanzte Handkopie in einem eigenen Verzeichnis wird gefunden', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w15-tools-'));
  fs.writeFileSync(path.join(tmp, 'fake-tool.js'),
    "const SEKTOREN = ['identity', 'health', 'finance', 'housing', 'mobility'];\n");
  const alteArgv = process.argv;
  process.argv = [...alteArgv.slice(0, 2), '--tools', tmp];
  delete require.cache[require.resolve('../tools/w15-eine-quelle-statt-kopien-pruefen.js')];
  const mit = require('../tools/w15-eine-quelle-statt-kopien-pruefen.js');
  const funde = mit.pruefeSektorenHandKopien();
  process.argv = alteArgv;
  fs.rmSync(tmp, { recursive: true, force: true });

  assert.equal(funde.length, 1, `Die gepflanzte Handkopie wurde nicht gefunden — Meldungen: ${JSON.stringify(funde)}`);
  assert.match(funde[0].datei, /fake-tool\.js/);
});

test('[W-15 Teil A · Gegenprobe] eine Mapping-Tabelle mit Sektor-IDs als Objekteigenschaft (kein flaches Array) löst NICHT aus', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w15-tools-'));
  fs.writeFileSync(path.join(tmp, 'fake-mapping.js'),
    "const M = [\n" +
    "  { format: 'a', sektorId: 'identitaet' }, { format: 'b', sektorId: 'gesundheit' },\n" +
    "  { format: 'c', sektorId: 'finanzen' }, { format: 'd', sektorId: 'wohnen' },\n" +
    "  { format: 'e', sektorId: 'mobilitaet' },\n" +
    "];\n");
  const alteArgv = process.argv;
  process.argv = [...alteArgv.slice(0, 2), '--tools', tmp];
  delete require.cache[require.resolve('../tools/w15-eine-quelle-statt-kopien-pruefen.js')];
  const mit = require('../tools/w15-eine-quelle-statt-kopien-pruefen.js');
  const funde = mit.pruefeSektorenHandKopien();
  process.argv = alteArgv;
  fs.rmSync(tmp, { recursive: true, force: true });

  assert.deepEqual(funde, [], 'eine Mapping-Tabelle (sektorId als EINE Objekteigenschaft unter mehreren je Eintrag) ist keine '
    + 'Sektorenlisten-Handkopie — echte Beispiele: tools/w10-export-mapping-luecken-pruefen.js, tools/w4-freitext-katalog-pruefen.js, '
    + 'beide beim ersten Lauf fälschlich gefunden, deshalb diese Gegenprobe.');
});

test('[W-15 Teil B] Positivkontrolle: kein Wizard-Schritt dupliziert heute einen Bereichs-/Situations-Katalog', () => {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const { funde, geprueft } = pruefeAssistentenDuplikate(html);
  assert.deepEqual(funde, [], `Unerwarteter Fund — Meldungen: ${JSON.stringify(funde)}`);
  assert.equal(geprueft.length, 0, 'alle Assistenten-Kataloge sollten inzwischen über _katalogOptionen()/'
    + '_situationFeldOptionen() bezogen sein — kein literales optionen-Array mehr im WIZARDS-Quelltext');
});

test('[W-15 Teil B · Rotmachbarkeit] ein achter, künstlich eingesetzter Katalog-Duplikat wird gefunden', () => {
  // -40s Technik (Schnitt-Reparatur Teil 1, 18.09.2026), hier übernommen: erst backen, dann die
  // Marker-Region ALS JSON PARSEN und den künstlichen Duplikat dort einsetzen — kein
  // Text-Splicing an einem geratenen Offset (der alte Anker `WIZARDS = Object.freeze([` existiert
  // seit dem Textsatz-Umzug nicht mehr, s. Kopf-Kommentar an pruefeAssistentenDuplikate). Der
  // gebackene Bereich trägt heute die JSON-Form (`"feld":{"id":"…","optionen":[`), nicht mehr die
  // alte JS-Literal-Form — der künstliche Fund muss also in DIESER Form vorliegen, sonst prüft
  // die Probe die falsche Syntax.
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const { _standardProduktBaken } = require('../tests/load-kern.js');
  const gebacken = _standardProduktBaken(html);

  const BEGIN = '/* AB_WERK_WIZARD_QUELLEN:BEGIN */';
  const ENDE = '/* AB_WERK_WIZARD_QUELLEN:END */';
  const start = gebacken.indexOf(BEGIN);
  const ende = gebacken.indexOf(ENDE);
  assert.ok(start >= 0 && ende > start, 'Marker-Region AB_WERK_WIZARD_QUELLEN nach dem Backen nicht gefunden');
  const innen = gebacken.slice(start + BEGIN.length, ende).trim();
  const zuweisungMatch = /^const AB_WERK_WIZARD_QUELLEN = (\[[\s\S]*\]);$/.exec(innen);
  assert.ok(zuweisungMatch, `Region trägt nicht die erwartete "const … = […];"-Form: ${innen.slice(0, 120)}`);
  const module = JSON.parse(zuweisungMatch[1]);

  // Ein Duplikat für 'gender' (SEKTOREN.identitaet.person, vier optionen) in einen
  // synthetischen Wizard-Schritt eingesetzt — künstlich, weil kein echter Wizard heute
  // 'gender' erneut abfragt. Genau die Probe, die der Auftrag verlangt: „einen achten,
  // künstlichen Katalog-Duplikat einsetzen, belegen, dass der Wächter anschlägt, danach
  // zurücknehmen" — das Zurücknehmen ist hier implizit: die Kopie im Speicher wird nie
  // geschrieben, nur geprüft.
  module.push({
    modulTyp: 'wizard',
    herkunft: 'w15-rotmachbarkeit-probe',
    wizards: {
      'w15-test-kuenstlich': {
        schritte: [
          { frage: 'Test', feld: { id: 'gender', typ: 'auswahl', optionen: [
            { wert: 'm', label: 'männlich' }, { wert: 'w', label: 'weiblich' },
          ] } },
        ],
      },
    },
  });
  const neuerInnenText = 'const AB_WERK_WIZARD_QUELLEN = ' + JSON.stringify(module) + ';';
  const verletzt = gebacken.slice(0, start + BEGIN.length) + neuerInnenText + gebacken.slice(ende);

  const { funde } = pruefeAssistentenDuplikate(verletzt);
  assert.ok(funde.some((f) => f.feldId === 'gender'),
    `Der künstliche Duplikat wurde nicht gefunden — Meldungen: ${JSON.stringify(funde)}`);
});

test('[W-15 Teil B · Rotmachbarkeit] ein leeres Scan-Fenster wird gemeldet, nicht als „keine Duplikate" verschluckt', () => {
  // Teil 2 (18.09.2026): dieselbe Bauform wie in tools/sichten-erheben.js — ein Fenster, das
  // Marker zwar FINDET, aber dessen Inhalt leer ist, muss laut werden. Hier künstlich erzwungen:
  // die gebackene Marker-Region auf ein leeres Array zurückgesetzt.
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const { _standardProduktBaken } = require('../tests/load-kern.js');
  const gebacken = _standardProduktBaken(html);

  const BEGIN = '/* AB_WERK_WIZARD_QUELLEN:BEGIN */';
  const ENDE = '/* AB_WERK_WIZARD_QUELLEN:END */';
  const start = gebacken.indexOf(BEGIN);
  const ende = gebacken.indexOf(ENDE);
  const geleert = gebacken.slice(0, start + BEGIN.length)
    + 'const AB_WERK_WIZARD_QUELLEN = [];'
    + gebacken.slice(ende);

  assert.throws(() => pruefeAssistentenDuplikate(geleert), /leer|leere Fenster|keine einzige Feld/,
    'ein Wächter, der sein Scan-Fenster leer vorfindet, muss das melden, nicht schweigend "keine Duplikate" zurückgeben');
});
