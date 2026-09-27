'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A359 · Bauweg 1 — der Vollsicherungs-Rundlauf trägt die angedockten Felder
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „nach der Entscheidungsrunde" (20.08.2026), Posten 2, Reihenfolge
   „schwerster zuerst". Entschieden als REGEL, nicht als Auswahl: *alles was
   gespeichert wurde muss auch wieder aufrufbar sein.*

   DER BEFUND (A350, Fund 3, seit 19.08. offen): Die Vollsicherung SCHREIBT Wert
   und Definition eines angedockten Feldes — `vollExportJSON` kopiert das ganze
   Depot. `_vollDepotFelder` warf beim Wiederherstellen **beide** ab. Still: kein
   Meldefeld, kein Zähler. Wer sein Depot aus der eigenen Sicherung zurückholte,
   verlor jedes Feld aus einer angedockten Vorlage und erfuhr es nicht.

   Das ist der EINZIGE der fünf A350-Funde, bei dem Daten wirklich verschwinden.

   DAZU DER MELDER: `katalogFremdSatz` war gebaut und unverdrahtet. Er bekommt
   hier seinen Aufrufer — und zwar nur für die Felder, die WIRKLICH nicht
   erscheinen: die mit einem Typ, den die Bereich-Ansicht nicht rendert. Nach
   A389 kommen die übrigen an, und der Satz „erscheint hier nicht" wäre für sie
   falsch geworden.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, _standardProduktBaken } = require('./load-kern.js');

const SEKTOR = 'education';
const MODUL_FELD = 'tpl_kammernummer';
const MODUL_WERT = 'K-4711';
const KERN_FELD = 'school';
const KERN_WERT = 'Realschule Nord';

function depotMitModulFeld(V) {
  const d = V.leeresDepot();
  d.feldDefinitionen = [{ sektorId: SEKTOR, feldId: MODUL_FELD, typ: 'text',
    label: 'Kammernummer', abschnitt: 'Aus der Kammer-Vorlage' }];
  d.sektoren[SEKTOR] = { [MODUL_FELD]: MODUL_WERT, [KERN_FELD]: KERN_WERT };
  V.setData(d);
  return d;
}

/* ══ Der Rundlauf ════════════════════════════════════════════════════════ */

test('[A359·1] die Vollsicherung trägt Wert UND Definition — das war nie das Problem', () => {
  const { V } = ladeKern();
  depotMitModulFeld(V);
  const roh = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  assert.ok(roh.includes(MODUL_WERT), 'der Wert ist in der Sicherung');
  assert.ok(roh.includes(MODUL_FELD), 'die Definition ist in der Sicherung');
});

test('[A359·1·tragend] beim Wiederherstellen kommen Wert UND Definition an', () => {
  const { V } = ladeKern();
  depotMitModulFeld(V);
  const roh = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  const geparst = V._vollDepotParsen(roh);
  const plan = V._vollDepotFelder(geparst);

  const modul = plan.felder.find((f) => f.feldId === MODUL_FELD);
  assert.ok(modul, 'das angedockte Feld steht im Wiederherstellungs-Plan: ' + JSON.stringify(plan.felder));
  assert.equal(modul.wert, MODUL_WERT);
  assert.equal(modul.sektorId, SEKTOR);

  const kern = plan.felder.find((f) => f.feldId === KERN_FELD);
  assert.ok(kern, 'die Gegenprobe: das Kern-Feld war immer da');

  assert.ok(Array.isArray(plan.feldDefinitionen), 'der Plan trägt die Definitionen');
  assert.ok(plan.feldDefinitionen.some((d) => d.feldId === MODUL_FELD),
    'Wert und Definition reisen gemeinsam (A293) — ein Wert ohne Definition landet in einem Slot, den niemand benennen kann');
});

test('[A359·1·Rot-Beweis] ohne den Griff verschwindet das angedockte Feld wieder — still', async () => {
  /* Mutation an einer KOPIE des echten Kerns (Regel 18): der Durchgang über die
     angedockten Definitionen wird abgeschaltet. Die Probe MUSS dann rot werden — sonst
     misst sie nicht den Griff, sondern irgendetwas. */
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const kernPfad = path.join(__dirname, '..', 'vivodepot.html');
  const original = fs.readFileSync(kernPfad, 'utf8');
  const anker = '  const angedockteDefs = Array.isArray(depot.feldDefinitionen) ? depot.feldDefinitionen : [];';
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const tmp = path.join(os.tmpdir(), 'a359-rot-' + process.pid + '.html');
  // Schnitt-Nachtrag (17.09.2026): ladeKern() bäckt bei eigenem KERN_HTML_PATH bewusst nicht —
  // ohne diesen expliziten Bake existiert der native Sektor im nackten Gerüst nicht mehr.
  fs.writeFileSync(tmp, _standardProduktBaken(original.replace(anker, '  const angedockteDefs = [];   // Rot-Probe')));
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    const { V } = require('./load-kern.js').ladeKern();
    depotMitModulFeld(V);
    const geparst = V._vollDepotParsen(JSON.stringify(V.vollExportJSON({ sensibel: true })));
    const plan = V._vollDepotFelder(geparst);
    assert.equal(plan.felder.some((f) => f.feldId === MODUL_FELD), false,
      'mutiert: das angedockte Feld fällt wieder aus dem Plan — der Zustand vor diesem Bauweg');
    assert.ok(plan.felder.some((f) => f.feldId === KERN_FELD), 'und das Kern-Feld bleibt, wie es war');
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.unlinkSync(tmp);
    assert.equal(fs.readFileSync(kernPfad, 'utf8'), original, 'das Original ist unberührt');
  }
});

test('[A359·1] eine LISTE aus einer angedockten Vorlage reist als Liste, nicht als Feld', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionen = [{ sektorId: SEKTOR, feldId: 'tpl_nachweise', typ: 'liste', label: 'Nachweise',
    unterFelder: [{ id: 'titel', typ: 'text', label: 'Titel' }] }];
  d.sektoren[SEKTOR] = { tpl_nachweise: [{ titel: 'Zeugnis' }, { titel: 'Urkunde' }] };
  V.setData(d);
  const plan = V._vollDepotFelder(V._vollDepotParsen(JSON.stringify(V.vollExportJSON({ sensibel: true }))));
  const liste = plan.listen.find((l) => l.feldId === 'tpl_nachweise');
  assert.ok(liste, 'die Liste steht im Listen-Kanal: ' + JSON.stringify(plan));
  assert.equal(liste.eintraege.length, 2);
});

test('[A359·1·Gegenprobe] ein Feld OHNE Wert erzeugt keinen Plan-Eintrag', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionen = [{ sektorId: SEKTOR, feldId: MODUL_FELD, typ: 'text', label: 'Kammernummer' }];
  d.sektoren[SEKTOR] = {};
  V.setData(d);
  const plan = V._vollDepotFelder(V._vollDepotParsen(JSON.stringify(V.vollExportJSON({ sensibel: true }))));
  assert.equal(plan.felder.some((f) => f.feldId === MODUL_FELD), false,
    'ohne Wert geht nichts verloren — ein leerer Eintrag wäre Lärm');
});

/* ══ Der Melder bekommt seinen Aufrufer ══════════════════════════════════ */

test('[A359·1] gemeldet wird, was WIRKLICH nicht erscheint — die nicht renderbaren Typen', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionen = [
    { sektorId: SEKTOR, feldId: 'tpl_exot', typ: 'geokoordinate', label: 'Standort' },
    { sektorId: SEKTOR, feldId: 'tpl_ok', typ: 'text', label: 'Nummer' },
  ];
  d.sektoren[SEKTOR] = { tpl_exot: '52.5,13.4', tpl_ok: 'K-7' };
  V.setData(d);
  const treffer = V.katalogFremdeFelder(SEKTOR);
  const nichtRenderbar = treffer.filter((e) => e.renderbar === false);
  assert.deepEqual(nichtRenderbar.map((e) => e.feldId), ['tpl_exot']);
  const satz = V.katalogFremdSatz(nichtRenderbar, V.STRINGS.katalogFremdWoBereich);
  assert.match(satz, /Standort/, 'der Satz nennt den NAMEN, nicht nur eine Zahl');
  assert.match(satz, /erscheint hier nicht/);
});

test('[A359·1·Gegenprobe] ein renderbares angedocktes Feld wird NICHT gemeldet — A389 zeigt es', () => {
  const { V } = ladeKern();
  depotMitModulFeld(V);
  const nichtRenderbar = V.katalogFremdeFelder(SEKTOR).filter((e) => e.renderbar === false);
  assert.deepEqual(nichtRenderbar, [],
    'nach A389 kommt es auf das Blatt und in die Ansicht — „erscheint hier nicht" wäre falsch');
  assert.equal(V.katalogFremdSatz(nichtRenderbar, 'x'), '', 'und der Satz bleibt leer');
});

test('[A359·1] der Melder hat einen Produkt-Aufrufer — er ist nicht mehr nur vom Test erreicht', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const q = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const aufrufe = (q.match(/katalogFremdSatz\s*\(/g) || []).length;
  assert.ok(aufrufe >= 2, 'Deklaration UND mindestens ein Aufrufer (gefunden: ' + aufrufe + ')');
});
