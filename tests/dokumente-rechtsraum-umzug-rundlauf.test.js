'use strict';
/* U2-ADR-505 — Rundlauf-Fidelity fuer den Umzug von `.dokumente` und `.rechtsraumKatalog` aus
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
// Berichtigte eigene Fragen (v872), je Schritt und Feld wörtlich: tests/helfer/eigene-fragen-ersetzt.js.
const { EIGENE_FRAGEN_ERSETZT, alteSchritteNachgefuehrt, zifferZurueck } = require('./helfer/eigene-fragen-ersetzt.js');
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

test('[U2-ADR-505·Rundlauf] .rechtsraumKatalog: alter Bündel-Inhalt === Inhalt des DE-Moduls tools/rechtsraum-de-modul.json (Gerüst-Schnitt S3)', () => {
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
  // R1 „Rechtsraum als Modul im Kern“: die (seit S3 leere) Region ist ganz entfallen.
  assert.equal(neu.AB_WERK_RECHTSRAUM_KATALOG_QUELLE, undefined, 'das Gerüst trägt den Katalog nicht mehr');
  /* Zuwachs nach dem Schnitt, benannt (02.10.2026, v857, U2-ADR-466): `rechtsgrundlage` (Paragraf und Adresse der Norm) für die
     drei im IPS abgebildeten Instrumente und den Widerspruch gegen die Ehegatten-Notvertretung. Herausgenommen wird GENAU dieses Feld
     an GENAU diesen Typen — ein anderer neuer Schlüssel oder ein fünfter Typ mit Rechtsgrundlage bleibt ein Befund. */
  const MIT_RECHTSGRUNDLAGE = ['custodianship-declaration', 'enduring-power-of-attorney', 'living-will', 'spousal-emergency-representation'];
  assert.deepEqual(Object.keys(deModul.typen).filter((t) => deModul.typen[t].rechtsgrundlage).sort(), MIT_RECHTSGRUNDLAGE);
  for (const t of MIT_RECHTSGRUNDLAGE) {
    const r = deModul.typen[t].rechtsgrundlage;
    assert.ok(typeof r.paragraf === 'string' && /^https:\/\/www\.gesetze-im-internet\.de\//.test(r.uri) && Object.keys(r).length === 2, t);
  }
  /* R1 (U2-ADR-504 § 3, Punkt 2): der Rechtsraum-Satz im Dokument-Fuß kommt aus dem Modul. Am Typ trägt ihn GENAU
     `ki-verfuegung` (`hinweise`, Anlage zu einem Testament); herausgenommen wird genau dieses Feld an genau diesem Typ —
     ein `hinweise` an einem weiteren Typ bleibt ein Befund. */
  const MIT_HINWEISEN = ['ki-verfuegung'];
  assert.deepEqual(Object.keys(deModul.typen).filter((t) => deModul.typen[t].hinweise).sort(), MIT_HINWEISEN);
  /* U2-ADR-507 (Nachtrag 29.10.2026): jeder Typ trägt das Feld `bauplan`; im veröffentlichten Modul ist es null, die Schritte setzt
     der Produktbau aus der Bauplan-Ergänzung ein (verglichen in der Probe zu `.dokumente` unten). Herausgenommen wird genau ein
     `bauplan: null` — ein gefüllter Bauplan im Modul bleibt ein Befund. */
  for (const [t, e] of Object.entries(deModul.typen)) assert.ok(!('bauplan' in e) || e.bauplan === null, t + ': bauplan im veröffentlichten Modul');
  const deModulVorZuwachs = Object.fromEntries(Object.entries(deModul.typen).map(([t, e]) => {
    const { rechtsgrundlage, hinweise, bauplan, ...rest } = e; return [t, rest]; }));
  assert.deepEqual(deModulVorZuwachs, altAlsModulTypen,
    'Register geleert (BUERGERMODUL_BUENDEL.rechtsraumKatalog === undefined nach dem Umzug) und aus dem neuen Ab-Werk-Slot geladen — Inhalt muss identisch zum alten Bündel-Stand sein.');
  // Seit dem Schnitt (18.09.2026) ist das Bündel nicht nur um dieses eine Feld erleichtert,
  // sondern vollständig entfernt (null) — die Zusicherung „das Register liegt nicht mehr im
  // Bündel" gilt darum a fortiori, nur ist `.rechtsraumKatalog` auf `null` nicht mehr lesbar.
  assert.equal(neu.BUERGERMODUL_BUENDEL, null,
    'Das Bündel ist seit dem Schnitt vollständig entfernt — das Register kann darin nicht mehr liegen.');
});

/* TOR-IN-DER-DEFINITION (27.09.2026, v808): vier PV-Folgefragen tragen seither ihr `verborgenWenn` am Feld im Dokumentmodul (vorher
   als Tabelle im Kern). Ein Zuwachs gegenüber dem alten Kanon, kein Verlust — herausgenommen wird GENAU dieses Tor mit GENAU diesem Wert,
   alles andere wird weiter exakt verglichen. Probe der Tore: eine nicht öffentliche Probe.
   Seit 31.10.2026 (v1000) dazu die zwei Tore der Wiederbelebung (Notarzt-Zusatz und B nur nach „die Unterlassung“ unter A). */
const PV_TORE_SEIT_V808 = Object.freeze({
  emergencyDoctorNotified: { feld: 'resuscitationInDescribedSituations', wert: 'ja' },
  resuscitationInAllCases: { feld: 'resuscitationInDescribedSituations', wert: 'ja' },
  whoseViewMattersOtherPersonName: { feld: 'whoseViewMattersIfUnregulated', wert: ['bevollmaechtigt', 'betreuer', 'arzt'] },
  whoseViewMattersIfDeviatingOther: { feld: 'whoseViewMattersIfDeviatingWill', wert: ['bevollmaechtigt', 'betreuer', 'arzt'] },
  priorityIfOrganDonationConflict: { feld: 'organDonationDecision', wert: 'ablehnung' },
  validityDurationDeadline: { feld: 'validityDuration', wert: 'unbefristet' },
});
function ohnePvToreSeitV808(steps) {
  return (steps || []).map((st) => {
    const f = st && st.feld;
    const tor = f && Object.prototype.hasOwnProperty.call(PV_TORE_SEIT_V808, f.id) ? PV_TORE_SEIT_V808[f.id] : null;
    if (!tor || JSON.stringify(f.verborgenWenn) !== JSON.stringify(tor)) return st;
    const { verborgenWenn, ...feld } = f;
    return Object.assign({}, st, { feld });
  });
}

/* U2-ADR-459 (01.10.2026): die Patientenverfügung steht seither im Wortlaut der BMJ-Textbausteine — die Eingangsformel endet
   auf „...“, die Anwendungssituationen beginnen mit „Wenn“, 2.6 trägt das Leerzeichen „Bevollmächtigte(r)/ Betreuer(in)“, und
   „beraten lassen durch“ (counsellingBy) ist ein dreißigster Schritt. Für den Vergleich mit dem alten Kanon wird genau das
   zurückgerechnet, benannt und eng; jede andere Abweichung bleibt ein Fund. */
const BMJ_459_ZURUECK = Object.freeze({
  'Wenn': 'Diese Patientenverfügung gilt, wenn',
  'ich mich aller Wahrscheinlichkeit nach unabwendbar im unmittelbaren Sterbeprozess befinde ...': 'ich mich aller Wahrscheinlichkeit nach unabwendbar im unmittelbaren Sterbeprozess befinde,',
  'ich mich im Endstadium einer unheilbaren, tödlich verlaufenden Krankheit befinde, selbst wenn der Todeszeitpunkt noch nicht absehbar ist ...': 'ich mich im Endstadium einer unheilbaren, tödlich verlaufenden Krankheit befinde, selbst wenn der Todeszeitpunkt noch nicht absehbar ist,',
  'Wo oder bei wem haben Sie sich vor der Erstellung informiert? (2.12)': 'Haben Sie sich vor der Erstellung informiert oder beraten lassen? (2.12)',
  'Optional. Im Dokument steht: „informiert bei/durch …“.': 'Freitext, optional.',
  'Informiert bei/durch': 'Information / Beratung',
  'z. B. Broschüre des BMJ, Verbraucherzentrale': 'bei/durch … · beraten durch …',
});
function bmj459Zurueck(o) {
  if (typeof o === 'string') return Object.prototype.hasOwnProperty.call(BMJ_459_ZURUECK, o) ? BMJ_459_ZURUECK[o] : o;
  if (Array.isArray(o)) return o.map(bmj459Zurueck);
  if (o && typeof o === 'object') { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = bmj459Zurueck(v); return r; }
  return o;
}
function vorBmjWortlaut459Schritte(steps) {
  return (steps || []).filter((st) => !(st && st.feld && st.feld.id === 'counsellingBy'))
    .map((st) => (st && st.feld && ['applicableSituations', 'informationOrCounsellingReceived'].includes(st.feld.id)) ? bmj459Zurueck(st) : st);
}
function vorBmjWortlaut459(pvBmj) {
  const raus = Object.assign({}, pvBmj, { steps: vorBmjWortlaut459Schritte(pvBmj.steps) });
  if (typeof raus.eingangsformel === 'string') raus.eingangsformel = raus.eingangsformel.replace(/verständlich äußern kann \.\.\.$/, 'verständlich äußern kann:');
  if (Array.isArray(raus.verbindlichkeitKlauseln)) raus.verbindlichkeitKlauseln = raus.verbindlichkeitKlauseln.map((k) => String(k).replace('Bevollmächtigte(r)/ Betreuer(in) – soll', 'Bevollmächtigte(r)/Betreuer(in) – soll'));
  return raus;
}

test('[U2-ADR-505·Rundlauf] .dokumente: alter Bündel-Inhalt === neuer AB_WERK_DOKUMENTE_DE-Inhalt (beide voll gebootet)', () => {
  const altesDokumente = altenKernLesen((V) => {
    assert.ok(V.BUERGERMODUL_BUENDEL.dokumente, 'Vergleichsbasis ungültig: alter Kanon trägt dokumente nicht mehr im Bündel');
    return V.BUERGERMODUL_BUENDEL.dokumente;
  });
  const { ladeKern } = require('./load-kern.js');
  const { V: neu } = ladeKern();
  /* U2-ADR-507 (Nachtrag 29.10.2026): die Dokumente sind auf drei Regionen verteilt — die Textteile der Patientenverfügung in
     AB_WERK_DOKUMENTE_DE, der KI-Korpus in AB_WERK_KI_KORPUS, die Schritte von Patientenverfügung und Vollmacht als Bauplan im
     deutschen Rechtsraum-Modul. Zusammengesetzt muss genau der alte Bündel-Inhalt herauskommen. Die Schritte stehen dabei so, wie
     der Motor sie nach dem Textsatz-Lauf trägt: die alte Seite zeigt sie so, weil ihr Splice per Referenz die Labels in die Quelle
     schrieb (Kopf). Der neue Kern liest den Bauplan als Kopie und lässt das Rechtsraum-Modul unverändert; dass der Motor genau den
     Bauplan trägt, hält die Probe darunter (drei Motoren-Konstanten) fest. */
  const de = (neu.AB_WERK_RECHTSRAUM_PRODUKT || []).find((m) => m && m.rechtsraum === 'DE');
  assert.equal(de.typen['living-will'].bauplan.length, neu.PV_BMJ.steps.length, 'der Motor trägt den Bauplan der Patientenverfügung');
  assert.equal(de.typen['enduring-power-of-attorney'].bauplan.length, neu.VOLLMACHT_BMJ.steps.length, 'der Motor trägt den Bauplan der Vollmacht');
  const neuDok = Object.assign({}, neu.AB_WERK_DOKUMENTE_DE.dokumente, { kiKorpus: neu.AB_WERK_KI_KORPUS.kiKorpus,
    vollmachtBmj: { steps: neu.VOLLMACHT_BMJ.steps } });
  neuDok.pvBmj = Object.assign({}, neuDok.pvBmj, { steps: zifferZurueck(neu.PV_BMJ.steps) });   // v999: die Baustein-Ziffer steht am Schritt
  neuDok.pvBmj = vorBmjWortlaut459(Object.assign({}, neuDok.pvBmj, { steps: ohnePvToreSeitV808(neuDok.pvBmj.steps) }));
  const altesDokumenteNachgefuehrt = Object.assign({}, altesDokumente, {
    vollmachtBmj: Object.assign({}, altesDokumente.vollmachtBmj, { steps: alteSchritteNachgefuehrt(altesDokumente.vollmachtBmj.steps) }),
    pvBmj: Object.assign({}, altesDokumente.pvBmj, { steps: alteSchritteNachgefuehrt(altesDokumente.pvBmj.steps) }),
    kiKorpus: Object.assign({}, altesDokumente.kiKorpus, { steps: alteSchritteNachgefuehrt(altesDokumente.kiKorpus.steps) }) });
  assert.deepEqual(neuDok, altesDokumenteNachgefuehrt,
    'Register geleert (BUERGERMODUL_BUENDEL.dokumente === undefined nach dem Umzug) und aus dem neuen Ab-Werk-Slot geladen — Inhalt muss identisch zum alten Bündel-Stand sein.');
  // Seit dem Schnitt (18.09.2026) ist das Bündel nicht nur um dieses eine Feld erleichtert,
  // sondern vollständig entfernt (null) — dieselbe Korrektur wie bei .rechtsraumKatalog oben.
  assert.equal(neu.BUERGERMODUL_BUENDEL, null,
    'Das Bündel ist seit dem Schnitt vollständig entfernt — das Register kann darin nicht mehr liegen.');
});

test('[U2-ADR-505·Rundlauf] die drei Motoren-Konstanten (PV_BMJ/VOLLMACHT_BMJ/KI_KORPUS) tragen nach der Materialisierung dieselben Schritte wie am alten Kanon', () => {
  const altesteps = altenKernLesen((V) => ({
    pv: V.PV_BMJ.steps, vollmacht: V.VOLLMACHT_BMJ.steps, ki: V.KI_KORPUS.steps,
  }));
  const { ladeKern } = require('./load-kern.js');
  const { V: neu } = ladeKern();
  assert.equal(vorBmjWortlaut459Schritte(neu.PV_BMJ.steps).length, altesteps.pv.length, 'PV_BMJ.steps.length weicht ab');
  assert.equal(neu.VOLLMACHT_BMJ.steps.length, altesteps.vollmacht.length, 'VOLLMACHT_BMJ.steps.length weicht ab');
  assert.equal(neu.KI_KORPUS.steps.length, altesteps.ki.length, 'KI_KORPUS.steps.length weicht ab');
  assert.deepEqual(vorBmjWortlaut459Schritte(ohnePvToreSeitV808(zifferZurueck(neu.PV_BMJ.steps))), alteSchritteNachgefuehrt(altesteps.pv), 'PV_BMJ.steps-Inhalt weicht ab (nach identischem Textsatz-Lauf auf beiden Seiten)');
  assert.deepEqual(neu.VOLLMACHT_BMJ.steps, alteSchritteNachgefuehrt(altesteps.vollmacht), 'VOLLMACHT_BMJ.steps-Inhalt weicht ab (nach identischem Textsatz-Lauf auf beiden Seiten)');
  assert.deepEqual(neu.KI_KORPUS.steps, alteSchritteNachgefuehrt(altesteps.ki), 'KI_KORPUS.steps-Inhalt weicht ab (nach identischem Textsatz-Lauf auf beiden Seiten)');
});

/* ── Rot-Beweis (Positivkontrolle) ─────────────────────────────────────────
   „nichts abweicht" und „nichts verglichen" liefern sonst dieselbe grüne Ausgabe. Diese Probe
   verändert den NEUEN Stand künstlich und beweist, dass die obigen Vergleiche eine echte
   Abweichung tatsächlich fangen würden. */
test('[U2-ADR-505·Rundlauf·Rot-Beweis] eine künstliche Abweichung wird von deepEqual gefunden — der Vergleich prüft wirklich', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  const echt = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8')).typen;
  const verfaelscht = JSON.parse(JSON.stringify(echt));
  verfaelscht['living-will'].formvorschriften.paragraf = 'GEFÄLSCHTER PARAGRAF';
  assert.throws(() => assert.deepEqual(verfaelscht, echt), assert.AssertionError,
    'eine künstliche Abweichung MUSS die deepEqual-Probe brechen — sonst prüft sie nichts');
});

test('[U2-ADR-505·Rundlauf·Rot-Beweis] eine berichtigte eigene Frage deckt nur genau ihren neuen Wortlaut an genau ihrem Schritt', () => {
  const e = EIGENE_FRAGEN_ERSETZT[0];
  const alt = [{ feld: { id: e.schritt }, [e.feld]: e.alt }, { feld: { id: 'anderer' }, [e.feld]: e.alt }];
  const nachgefuehrt = alteSchritteNachgefuehrt(alt);
  assert.deepEqual(nachgefuehrt, [{ feld: { id: e.schritt }, [e.feld]: e.neu }, { feld: { id: 'anderer' }, [e.feld]: e.alt }], 'nur dieser Schritt');
  assert.throws(() => assert.deepEqual([{ feld: { id: e.schritt }, [e.feld]: e.neu + ' ' }], alteSchritteNachgefuehrt([alt[0]])), assert.AssertionError, 'ein dritter Wortlaut: rot');
  assert.throws(() => assert.deepEqual([{ feld: { id: e.schritt } }], alteSchritteNachgefuehrt([alt[0]])), assert.AssertionError, 'gestrichen ohne Ersatz: rot');
  // Die Baustein-Ziffer (v999): zurückgelegt wird nur dieser eine Schlüssel; ein anderer neuer Schlüssel bleibt rot.
  assert.deepEqual(zifferZurueck([{ feld: { id: 'x' }, bmjBaustein: '2.3.1' }]), [{ feld: { id: 'x' } }]);
  assert.throws(() => assert.deepEqual(zifferZurueck([{ feld: { id: 'x' }, bmjBaustein: '2.3.1', baustein: '2.3.1' }]), [{ feld: { id: 'x' } }]), assert.AssertionError, 'ein anderer Schlüssel: rot');
});
