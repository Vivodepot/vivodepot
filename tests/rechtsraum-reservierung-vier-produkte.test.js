'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   R1 „Rechtsraum als Modul im Kern“ — Einlass-Reservierung in allen vier Produkten (Bedingungen der Freigabe vom 17.10.2026, U2-ADR-504 §3)
   ────────────────────────────────────────────────────────────────────────────
   Mit R1 ist nicht mehr fest „DE“ reserviert, sondern der Code jedes Rechtsraum-Moduls, das ab Werk im Produkt steckt
   (`_rechtsraumCodeAbWerk`). Diese Probe hält die drei Bedingungen, unter denen die Verallgemeinerung erlaubt ist:
     (a) in JEDEM der vier Produkte ist jeder Ab-Werk-Rechtsraum-Code am Selbst-Einlass reserviert — heute also überall „DE“;
     (b) Rot-Beweis: ein Kern ohne die Reservierung am Einlass lässt das DE-Modul im DE-Produkt durch;
     (c) im nackten Gerüst (kein Code reserviert) kann ein selbst eingelassenes Modul sich weder als ab Werk noch als geprüft
         ausgeben: die Marken `abWerk`, `ungeprueft`, `anbieterIdGeprueft`, `beleg` werden erzwungen, und der Code wird weder
         Rechtsraum der Zusammenstellung noch reserviert. Mit Rot-Beweis gegen einen Kern, der eine selbst mitgebrachte
         `abWerk`-Marke stehen lässt.
   Die Fälle GB-Produkt und „zwei Module“ hält die Kern-Probe des Wagens R1 (Rechtsraum der Zusammenstellung, Selbst-Einlass).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // BESTAND: öffentlich nur zwei Privat-Produkte
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { PRODUKTE } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const DE_TEXT = fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8');
/* Ein erfundenes Fremdmodul mit dem Code „GB“: nur Struktur, keine Rechtsaussage (alle Inhalte null). Inline statt aus der
   Achsen-Fixture, weil diese Probe hinausgeht und die Fixture drinnen bleibt. */
const GB_TEXT = JSON.stringify({
  modulTyp: 'rechtsraum', rechtsraum: 'GB', sprache: 'en', moduleVersion: 1, anbieterId: 'achsentest',
  typen: {
    'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: null, formvorschriften: null, fristenVorrang: null, zweck: ['vermoegenssorge', 'gesundheitssorge'] },
    'living-will': { katalogVersion: 1, wortlaut: null, formvorschriften: null, fristenVorrang: null, zweck: ['gesundheitssorge'] },
  },
});

const einlass = (V, text) => { V.setData(V.leeresDepot()); return V.modulEinlassen(text, V.getData()); };
/* Ein Modul mit dem Code `code`, sonst der Inhalt des DE-Moduls — damit jeder Ab-Werk-Code geprüft wird, nicht nur der heutige. */
const modulMitCode = (code) => JSON.stringify(Object.assign(JSON.parse(DE_TEXT), { rechtsraum: code }));

/* Ein Kern-Fehlstand in einer Temp-Datei; `ersetzen` muss genau einmal treffen, sonst ist die Probe selbst veraltet. */
function fehlfassung(name, alt, neu) {
  assert.equal(KERN.split(alt).length, 2, 'Vorbedingung: die Stelle steht genau einmal im Kern: ' + alt);
  const pfad = path.join(os.tmpdir(), name + '-' + process.pid + '.html');
  fs.writeFileSync(pfad, KERN.replace(alt, neu));
  return pfad;
}

/* ── (a) jeder Ab-Werk-Code, in jedem Produkt ── */
test('[R1·Reservierung·a] in allen vier Produkten ist jeder Ab-Werk-Rechtsraum-Code am Selbst-Einlass reserviert', () => {
  assert.equal(PRODUKTE.length, 4, 'Vorbedingung: vier Produkte');
  for (const p of PRODUKTE) {
    const V = ladeKern({ produkt: p.slug }).V;
    const codes = Object.keys(V._rechtsraumAbWerkRegistrySeed());
    assert.ok(codes.length >= 1, p.slug + ': mindestens ein Rechtsraum-Modul ab Werk');
    assert.ok(codes.includes('DE'), p.slug + ': das DE-Modul steckt ab Werk (Entscheidung 20.09.2026, Posten 6)');
    for (const code of codes) {
      assert.equal(einlass(V, modulMitCode(code)).grund, 'reserviert', p.slug + ': ' + code);
      assert.equal(einlass(V, modulMitCode(code.toLowerCase())).grund, 'reserviert', p.slug + ': ' + code + ' in anderer Schreibung');
    }
  }
});

/* ── (b) Rot-Beweis ── */
test('[R1·Reservierung·b·Rot-Beweis] ohne die Reservierung am Einlass kommt das DE-Modul im DE-Produkt durch', () => {
  const zeile = "      if (_rechtsraumCodeAbWerk(m.rechtsraum)) return { gueltig: false, grund: 'reserviert', verworfene: _rrVerworfen };";
  const pfad = fehlfassung('rechtsraum-ohne-reservierung', zeile, '      /* Reservierung entfernt (Rot-Beweis) */');
  try {
    const V = ladeKern({ htmlPfad: pfad, produkt: 'privat-de', backen: true }).V;
    assert.notEqual(einlass(V, DE_TEXT).grund, 'reserviert', 'die Fehlfassung reserviert nicht — Probe (a) wäre rot');
  } finally { fs.rmSync(pfad, { force: true }); }
});

/* ── (c) nacktes Gerüst: kein Ab-Werk, keine Prüfung durch Selbstauskunft ── */
const GB_SELBSTAUSKUNFT = JSON.stringify(Object.assign(JSON.parse(GB_TEXT), {
  abWerk: true, ungeprueft: false, anbieterId: 'vivodepot', anbieterIdGeprueft: true, beleg: { art: 'selbst', wert: 'x' },
}));
function eingelassenesGb(V) {
  const r = einlass(V, GB_SELBSTAUSKUNFT);
  assert.equal(r.angenommen, true, 'Vorbedingung: im nackten Gerüst ist GB nicht reserviert: ' + r.grund);
  const slot = V.getData().rechtsraumModule;   // Slot des Einlass-Registers, eine Liste (_einbettenMitFassung)
  assert.ok(Array.isArray(slot), 'Vorbedingung: rechtsraumModule ist eine Liste');
  const m = slot.find((x) => x && x.rechtsraum === 'GB');
  assert.ok(m, 'Vorbedingung: das Modul liegt im Depot');
  return { r, m };
}
test('[R1·Reservierung·c] im nackten Gerüst gibt sich ein selbst eingelassenes Modul weder als ab Werk noch als geprüft aus', () => {
  const V = ladeKern({ blank: true }).V;
  assert.deepEqual(Object.keys(V._rechtsraumAbWerkRegistrySeed()), [], 'Vorbedingung: nacktes Gerüst ohne Ab-Werk-Rechtsraum');
  const { r, m } = eingelassenesGb(V);
  assert.equal(r.ungeprueft, true);
  assert.equal(m.abWerk, undefined, 'abWerk aus der Selbstauskunft entfernt');
  assert.equal(m.ungeprueft, true);
  assert.equal(m.anbieterIdGeprueft, false);
  assert.equal(m.beleg, null);
  assert.equal(V._rechtsraumCodeAbWerk('GB'), false, 'ein eingelassener Code wird nicht reserviert');
  assert.equal(V._rechtsraumDerZusammenstellung(), '', 'und nicht Rechtsraum der Zusammenstellung');
});
test('[R1·Reservierung·c·Rot-Beweis] ein Kern, der die mitgebrachte abWerk-Marke stehen lässt, fällt auf', () => {
  const pfad = fehlfassung('rechtsraum-abwerk-selbstauskunft', '    delete markiert.abWerk;\n', '\n');
  try {
    const { m } = eingelassenesGb(ladeKern({ htmlPfad: pfad, blank: true }).V);
    assert.equal(m.abWerk, true, 'die Fehlfassung übernimmt die Selbstauskunft — Probe (c) wäre rot');
  } finally { fs.rmSync(pfad, { force: true }); }
});
