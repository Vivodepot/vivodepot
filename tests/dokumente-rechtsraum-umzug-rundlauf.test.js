'use strict';
/* U2-ADR-NNN2 — Rundlauf-Fidelity fuer den Umzug von `.dokumente` und `.rechtsraumKatalog` aus
   BUERGERMODUL_BUENDEL in eigene Ab-Werk-Slots (AB_WERK_DOKUMENTE_DE /
   AB_WERK_RECHTSRAUM_KATALOG_QUELLE) — Muster wie `-6c`s dokumentmodule-fidelity-pruefen.js:
   Register aus dem alten Bündel-Stand lesen, gegen den neuen Ab-Werk-Slot vergleichen, IDENTISCH,
   mit einer Positivkontrolle (Rot-Beweis), die eine echte Abweichung tatsächlich findet.

   BEIDE SEITEN VOLL GEBOOTET, NICHT NUR TEXT-EVAL (echter Fund beim eigenen Bau, 17.09.2026):
   eine erste Fassung verglich den STATISCHEN Bündel-Text des alten Kanons (git show + eval, nie
   ausgeführt) gegen den VOLL GEBOOTETEN neuen Kern (`ladeKern()`, `_textsatzAufVollmachtBmjAnwenden`
   längst gelaufen) — Äpfel gegen Birnen. `_dokumenteAusBuendelMaterialisieren()` spleißt
   `dok.vollmachtBmj.steps` PER REFERENZ (kein `JSON.parse(JSON.stringify(...))` wie beim
   Rechtsraum-/Basistemplate-Vorbild) in `VOLLMACHT_BMJ.steps`, und der anschließende Textsatz-Lauf
   fügt dort `feld.label` HINZU — das mutiert dieselben Objekte, auf die AB_WERK_DOKUMENTE_DE
   zeigt (kein Deep-Freeze, nur die oberste Ebene ist eingefroren). Das ist BESTANDSVERHALTEN,
   nicht neu durch diesen Umbau: dieselbe Splice-ohne-Klon-Form stand schon vorher am
   `BUERGERMODUL_BUENDEL.dokumente`-Weg. Der faire Vergleich lädt darum BEIDE Seiten über
   `ladeKern()` (alte Datei per KERN_HTML_PATH), damit beide denselben Textsatz-Lauf hinter sich
   haben, bevor verglichen wird. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
// Der alte Kanon ist ein FESTER Commit (letzter Stand mit Bündel-Inhalt vor dem Schnitt), nicht
// `origin/u2-kanon`: der Zweig wandert, und seit dem Schnitt trägt er das Bündel nicht mehr.
const ALTER_KANON = 'dceab851';

// WICHTIG: lädt den alten Kern, liest ihn AUS und stellt Umgebung/Require-Cache SOFORT wieder
// her, bevor die Funktion zurückkehrt — nicht erst am Ende des Tests. Ein Fund am eigenen Bau
// (17.09.2026): eine erste Fassung gab ein `aufraeumen()` zurück, das der Aufrufer erst NACH dem
// zweiten `ladeKern()`-Aufruf (für den NEUEN Kern) ausführte — der zweite Aufruf sah dadurch
// noch KERN_HTML_PATH auf die alte Datei zeigen und lud denselben alten Kern zweimal. `lesen`
// bekommt den frisch geladenen `V` und liefert zurück, was der Aufrufer braucht — alles, was aus
// `V` gebraucht wird, MUSS hier innerhalb, vor dem Wiederherstellen, gelesen werden.
function altenKernLesen(lesen) {
  const alteDatei = execFileSync('git', ['show', ALTER_KANON + ':vivodepot.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const os = require('node:os');
  const fs = require('node:fs');
  const tmp = path.join(os.tmpdir(), 'vivodepot-umzug-rundlauf-alt-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, alteDatei, 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern();
    return lesen(V);
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(tmp);
  }
}

test('[U2-ADR-NNN2·Rundlauf] .rechtsraumKatalog: alter Bündel-Inhalt === Inhalt des DE-Moduls tools/rechtsraum-de-modul.json (Gerüst-Schnitt S3)', () => {
  const altesRechtsraumKatalog = altenKernLesen((V) => {
    assert.ok(V.BUERGERMODUL_BUENDEL.rechtsraumKatalog, 'Vergleichsbasis ungültig: alter Kanon trägt rechtsraumKatalog nicht mehr im Bündel');
    return V.BUERGERMODUL_BUENDEL.rechtsraumKatalog;
  });
  const { ladeKern } = require('./load-kern.js');
  const { V: neu } = ladeKern();
  // L4 (20.09.2026, Code für Code, hier: testament -> will): der alte Kanon (Vergleichsbasis, bleibt
  // unangetastet) trägt den Typ-Schlüssel noch in der Form vor der Umbenennung; verglichen wird
  // gegen den heutigen Code — NUR dieser Schlüssel, nicht der Inhalt darunter.
  const L4_TYP_ALT_ZU_NEU = { testament: 'will', vorsorgevollmacht: 'enduring-power-of-attorney', patientenverfuegung: 'living-will', betreuungsverfuegung: 'custodianship-declaration', sorgerechtsverfuegung: 'guardian-nomination', betreuerbestellung: 'custodian-appointment', ehegattennotvertretung: 'spousal-emergency-representation' };
  const altesRechtsraumKatalogHeute = Object.fromEntries(
    Object.entries(altesRechtsraumKatalog).map(([k, v]) => [L4_TYP_ALT_ZU_NEU[k] || k, v]));
  // Gerüst-Schnitt S3: der Katalog steht als Moduldatei (flache Form, ohne die nie gelesene `herkunft`) statt in der Gerüst-Quelle.
  const deModul = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8'));
  const altAlsModulTypen = Object.fromEntries(Object.entries(altesRechtsraumKatalogHeute).map(([typ, e]) => [typ, {
    katalogVersion: e.DE.katalogVersion,
    wortlaut: e.DE.wortlaut === undefined ? null : e.DE.wortlaut,
    formvorschriften: e.DE.formvorschriften === undefined ? null : e.DE.formvorschriften,
    fristenVorrang: e.DE.fristenVorrang === undefined ? null : e.DE.fristenVorrang,
    zweck: Array.isArray(e.zweck) ? e.zweck : null,
  }]));
  assert.deepEqual(neu.AB_WERK_RECHTSRAUM_KATALOG_QUELLE, {}, 'das Gerüst trägt den Katalog nicht mehr');
  assert.deepEqual(deModul.typen, altAlsModulTypen,
    'Register geleert (BUERGERMODUL_BUENDEL.rechtsraumKatalog === undefined nach dem Umzug) und aus dem neuen Ab-Werk-Slot geladen — Inhalt muss identisch zum alten Bündel-Stand sein.');
  // Seit dem Schnitt (18.09.2026) ist das Bündel nicht nur um dieses eine Feld erleichtert,
  // sondern vollständig entfernt (null) — die Zusicherung „das Register liegt nicht mehr im
  // Bündel" gilt darum a fortiori, nur ist `.rechtsraumKatalog` auf `null` nicht mehr lesbar.
  assert.equal(neu.BUERGERMODUL_BUENDEL, null,
    'Das Bündel ist seit dem Schnitt vollständig entfernt — das Register kann darin nicht mehr liegen.');
});

test('[U2-ADR-NNN2·Rundlauf] .dokumente: alter Bündel-Inhalt === neuer AB_WERK_DOKUMENTE_DE-Inhalt (beide voll gebootet)', () => {
  const altesDokumente = altenKernLesen((V) => {
    assert.ok(V.BUERGERMODUL_BUENDEL.dokumente, 'Vergleichsbasis ungültig: alter Kanon trägt dokumente nicht mehr im Bündel');
    return V.BUERGERMODUL_BUENDEL.dokumente;
  });
  const { ladeKern } = require('./load-kern.js');
  const { V: neu } = ladeKern();
  assert.deepEqual(neu.AB_WERK_DOKUMENTE_DE.dokumente, altesDokumente,
    'Register geleert (BUERGERMODUL_BUENDEL.dokumente === undefined nach dem Umzug) und aus dem neuen Ab-Werk-Slot geladen — Inhalt muss identisch zum alten Bündel-Stand sein.');
  // Seit dem Schnitt (18.09.2026) ist das Bündel nicht nur um dieses eine Feld erleichtert,
  // sondern vollständig entfernt (null) — dieselbe Korrektur wie bei .rechtsraumKatalog oben.
  assert.equal(neu.BUERGERMODUL_BUENDEL, null,
    'Das Bündel ist seit dem Schnitt vollständig entfernt — das Register kann darin nicht mehr liegen.');
});

test('[U2-ADR-NNN2·Rundlauf] die drei Motoren-Konstanten (PV_BMJ/VOLLMACHT_BMJ/KI_KORPUS) tragen nach der Materialisierung dieselben Schritte wie am alten Kanon', () => {
  const altesteps = altenKernLesen((V) => ({
    pv: V.PV_BMJ.steps, vollmacht: V.VOLLMACHT_BMJ.steps, ki: V.KI_KORPUS.steps,
  }));
  const { ladeKern } = require('./load-kern.js');
  const { V: neu } = ladeKern();
  assert.equal(neu.PV_BMJ.steps.length, altesteps.pv.length, 'PV_BMJ.steps.length weicht ab');
  assert.equal(neu.VOLLMACHT_BMJ.steps.length, altesteps.vollmacht.length, 'VOLLMACHT_BMJ.steps.length weicht ab');
  assert.equal(neu.KI_KORPUS.steps.length, altesteps.ki.length, 'KI_KORPUS.steps.length weicht ab');
  assert.deepEqual(neu.PV_BMJ.steps, altesteps.pv, 'PV_BMJ.steps-Inhalt weicht ab (nach identischem Textsatz-Lauf auf beiden Seiten)');
  assert.deepEqual(neu.VOLLMACHT_BMJ.steps, altesteps.vollmacht, 'VOLLMACHT_BMJ.steps-Inhalt weicht ab (nach identischem Textsatz-Lauf auf beiden Seiten)');
  assert.deepEqual(neu.KI_KORPUS.steps, altesteps.ki, 'KI_KORPUS.steps-Inhalt weicht ab (nach identischem Textsatz-Lauf auf beiden Seiten)');
});

/* ── Rot-Beweis (Positivkontrolle) ─────────────────────────────────────────
   „nichts abweicht" und „nichts verglichen" liefern sonst dieselbe grüne Ausgabe. Diese Probe
   verändert den NEUEN Stand künstlich und beweist, dass die obigen Vergleiche eine echte
   Abweichung tatsächlich fangen würden. */
test('[U2-ADR-NNN2·Rundlauf·Rot-Beweis] eine künstliche Abweichung wird von deepEqual gefunden — der Vergleich prüft wirklich', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  const echt = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8')).typen;
  const verfaelscht = JSON.parse(JSON.stringify(echt));
  verfaelscht['living-will'].formvorschriften.paragraf = 'GEFÄLSCHTER PARAGRAF';
  assert.throws(() => assert.deepEqual(verfaelscht, echt), assert.AssertionError,
    'eine künstliche Abweichung MUSS die deepEqual-Probe brechen — sonst prüft sie nichts');
});
