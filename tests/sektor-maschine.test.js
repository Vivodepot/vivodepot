'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sektor-Maschine (generisch, ohne Sektor-Bezug)
   ────────────────────────────────────────────────────────────────────────
   Die Maschine kennt nur Feldtypen, Ebenen (kern/modul), Hints, Sektion-Struktur
   und die Stimme. Konkrete Sektoren sind reine Datendefinitionen.

   Verifikation (UX-Spec V/VII, U2-ADR-006/009):
     1) Jeder Feldtyp prüft (Datum lehnt Freitext ab, Zahl lehnt Buchstaben ab,
        Auswahl nur aus Optionen, Pflicht greift, maxLength/min/max greifen).
     2) Modul-Feld im aufklappbaren mehr-Block, Kern-Feld direkt; Badge bei Eintrag.
     3) Feld-Hint und Abschnitts-Hint rendern.
     4) Inhaltsverzeichnis ab drei Sektionen.
     5) Leer-Phrase „nicht hinterlegt" (kursiv); Pausen-Zeile pro Bereich; keine Emoji;
        Sie-Form; technisches Andock-Format (FHIR_IPS, W3C_VC, XOEV, …) NICHT als
        sichtbares Text-UI (nur als Tooltip/ARIA-Label).

   Sektor-frei: ein neutraler Test-Sektor (id: 'test_machine_sektor') wird zur Laufzeit
   definiert und an renderSektor übergeben. Die Maschine darf keinen Sektor-Namen kennen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-sektor-maschine';
const EMOJI = /\p{Extended_Pictographic}/u;

function testSektor() {
  return {
    id: 'test_machine_sektor',
    label: 'Test-Bereich',
    format: 'TEST_FORMAT',
    icon: 'star',
    sektionen: [
      {
        id: 'sek_kern',
        label: 'Kern-Abschnitt',
        hint: 'Abschnitts-Hinweis-Kern',
        felder: [
          { id: 'f_text',     label: 'Text',          typ: 'text',    ebene: 'kern' },
          { id: 'f_textarea', label: 'Textarea',      typ: 'textarea',ebene: 'kern', maxLength: 200 },
          { id: 'f_datum',    label: 'Datum',         typ: 'datum',   ebene: 'kern' },
          { id: 'f_zahl',     label: 'Zahl',          typ: 'zahl',    ebene: 'kern', min: 0, max: 100 },
          { id: 'f_auswahl',  label: 'Auswahl',       typ: 'auswahl', ebene: 'kern',
            optionen: [{ wert: 'a', label: 'A' }, { wert: 'b', label: 'B' }] },
          { id: 'f_pflicht',  label: 'Pflichtfeld',   typ: 'text',    ebene: 'kern', pflicht: true },
          { id: 'f_hint',     label: 'Feld mit Hint', typ: 'text',    ebene: 'kern', hint: 'Feld-Hinweis-X' },
        ],
      },
      {
        id: 'sek_modul',
        label: 'Modul-Abschnitt',
        felder: [
          { id: 'f_modul_a', label: 'Modul A', typ: 'text', ebene: 'modul' },
          { id: 'f_modul_b', label: 'Modul B', typ: 'text', ebene: 'modul' },
        ],
      },
      {
        id: 'sek_drei',
        label: 'Dritter Abschnitt',
        felder: [{ id: 'f_drei', label: 'Drei', typ: 'text', ebene: 'kern' }],
      },
    ],
  };
}

/* ── 1) Feldtypen-Validierung ────────────────────────────────────────── */

test('1) feldValidieren: text — Pflicht greift, maxLength greift', () => {
  const { V } = ladeKern();
  assert.equal(V.feldValidieren({ typ: 'text' }, '').ok, true, 'leer + non-pflicht → ok');
  assert.equal(V.feldValidieren({ typ: 'text', pflicht: true }, '').ok, false, 'leer + pflicht → fail');
  assert.equal(V.feldValidieren({ typ: 'text', pflicht: true }, '   ').ok, false, 'whitespace + pflicht → fail');
  assert.equal(V.feldValidieren({ typ: 'text', maxLength: 3 }, 'abcd').ok, false, 'über maxLength → fail');
  assert.equal(V.feldValidieren({ typ: 'text', maxLength: 3 }, 'abc').ok, true, 'genau maxLength → ok');
});

test('1) feldValidieren: datum — lehnt Freitext ab', () => {
  const { V } = ladeKern();
  assert.equal(V.feldValidieren({ typ: 'datum' }, 'morgen').ok, false, 'Freitext → fail');
  assert.equal(V.feldValidieren({ typ: 'datum' }, '01.05.2026').ok, false, 'falsches Format → fail');
  assert.equal(V.feldValidieren({ typ: 'datum' }, '2026-13-01').ok, false, 'ungültiger Monat → fail');
  assert.equal(V.feldValidieren({ typ: 'datum' }, '2026-05-30').ok, true, 'ISO-Datum → ok');
  assert.equal(V.feldValidieren({ typ: 'datum' }, '').ok, true, 'leer + non-pflicht → ok');
});

test('1) feldValidieren: zahl — lehnt Buchstaben ab; min/max greifen', () => {
  const { V } = ladeKern();
  assert.equal(V.feldValidieren({ typ: 'zahl' }, 'abc').ok, false, 'Buchstaben → fail');
  assert.equal(V.feldValidieren({ typ: 'zahl' }, '12abc').ok, false, 'gemischt → fail');
  assert.equal(V.feldValidieren({ typ: 'zahl' }, '42').ok, true, 'Zahl als String → ok');
  assert.equal(V.feldValidieren({ typ: 'zahl' }, 42).ok, true, 'Zahl als Number → ok');
  assert.equal(V.feldValidieren({ typ: 'zahl' }, '-3.5').ok, true, 'negative Dezimalzahl → ok');
  assert.equal(V.feldValidieren({ typ: 'zahl', min: 0, max: 100 }, '-1').ok, false, 'unter min → fail');
  assert.equal(V.feldValidieren({ typ: 'zahl', min: 0, max: 100 }, '101').ok, false, 'über max → fail');
  assert.equal(V.feldValidieren({ typ: 'zahl', min: 0, max: 100 }, '50').ok, true, 'in Bereich → ok');
});

test('1) feldValidieren: auswahl — nur aus Optionen', () => {
  const { V } = ladeKern();
  const feld = { typ: 'auswahl', optionen: [{ wert: 'a', label: 'A' }, { wert: 'b', label: 'B' }] };
  assert.equal(V.feldValidieren(feld, 'a').ok, true);
  assert.equal(V.feldValidieren(feld, 'b').ok, true);
  assert.equal(V.feldValidieren(feld, 'c').ok, false, 'nicht in Optionen → fail');
  assert.equal(V.feldValidieren(feld, 'A').ok, false, 'Großschreibung ≠ Wert → fail');
});

test('1) feldValidieren: ref — {ref, override} oder String', () => {
  const { V } = ladeKern();
  assert.equal(V.feldValidieren({ typ: 'ref' }, { ref: 'id-1', override: '' }).ok, true);
  assert.equal(V.feldValidieren({ typ: 'ref' }, { ref: '', override: 'Manuell' }).ok, true);
  assert.equal(V.feldValidieren({ typ: 'ref' }, 'override-string').ok, true);
  assert.equal(V.feldValidieren({ typ: 'ref' }, 42).ok, false, 'Zahl ist kein gültiger Ref-Wert');
});

test('1) feldValidieren: liste — Array oder leer', () => {
  const { V } = ladeKern();
  assert.equal(V.feldValidieren({ typ: 'liste' }, []).ok, true, 'leeres Array + non-pflicht → ok');
  assert.equal(V.feldValidieren({ typ: 'liste', pflicht: true }, []).ok, false, 'leeres Array + pflicht → fail');
  assert.equal(V.feldValidieren({ typ: 'liste' }, [{ name: 'X' }]).ok, true);
  assert.equal(V.feldValidieren({ typ: 'liste' }, 'string').ok, false, 'String ist keine Liste');
});

test('1) feldValidieren: pflicht greift für ALLE Typen', () => {
  const { V } = ladeKern();
  for (const typ of ['text', 'textarea', 'datum', 'zahl', 'auswahl', 'ref', 'liste']) {
    const r = V.feldValidieren({ typ, pflicht: true, optionen: [{ wert: 'x', label: 'X' }] }, null);
    assert.equal(r.ok, false, 'pflicht greift für typ=' + typ);
    assert.equal(r.grund, 'pflicht', 'grund=pflicht für typ=' + typ);
  }
});

/* ── 2) Modul-Felder im aufklappbaren mehr-Block ─────────────────────── */

// Der mehr-Block gilt für GEMISCHTE Sektionen (Kern + Modul). Eine Sektion ganz aus
// Modul-Feldern rendert ihre Felder direkt (kein „mehr"-Toggle, 30.05.) — separat geprüft
// in sektoren-spec.test.js. Diese zwei Tests nutzen daher eine gemischte Sektion.
function mixedSektor() {
  return {
    id: 'test_mehr_sektor', label: 'Mehr-Test', format: 'GENERISCH', icon: 'star',
    sektionen: [{ id: 'mix', label: 'Gemischt', felder: [
      { id: 'f_text',    label: 'Text',    typ: 'text', ebene: 'kern' },
      { id: 'f_modul_a', label: 'Modul A', typ: 'text', ebene: 'modul' },
      { id: 'f_modul_b', label: 'Modul B', typ: 'text', ebene: 'modul' },
    ] }],
  };
}

test('2) Modul-Feld erscheint im aufklappbaren mehr-Block, Kern-Feld direkt', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');

  V.renderSektor(mixedSektor());
  const html = document.getElementById('content').innerHTML;

  // Kern-Feld-Label direkt sichtbar.
  assert.ok(html.includes('Text'), 'Kern-Feld gerendert');
  // Modul-Felder leben im <details class="mehr-block">.
  const detailsRegex = /<details class="mehr-block"[^>]*>[\s\S]*?Modul A[\s\S]*?Modul B[\s\S]*?<\/details>/;
  assert.match(html, detailsRegex, 'Modul-Felder im mehr-Block');
  assert.ok(html.includes(V.STRINGS.mehrLabel), 'mehr-Label im Summary');
  // Ohne eingetragene Modul-Werte: NICHT offen (kein " open").
  assert.equal(/<details class="mehr-block" open/.test(html), false, 'mehr-Block geschlossen, solange leer');
});

test('2) mehr-Block öffnet bei Eintrag und zeigt Badge „X eingetragen"', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  // Modul-Feld füllen.
  V.sektorFeldSetzen('test_mehr_sektor', 'f_modul_a', 'wert');

  V.renderSektor(mixedSektor());
  const html = document.getElementById('content').innerHTML;

  assert.match(html, /<details class="mehr-block" open/, 'mehr-Block offen, weil mindestens ein Modul-Feld eingetragen');
  assert.ok(html.includes(V.STRINGS.mehrEingetragen), 'Badge „eingetragen" sichtbar');
  assert.ok(/1 eingetragen/.test(html), 'Anzahl 1 im Badge');
});

/* ── 3) Hints ────────────────────────────────────────────────────────── */

test('3) Feld-Hint und Abschnitts-Hint rendern', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);

  V.renderSektor(testSektor());
  const html = document.getElementById('content').innerHTML;

  assert.match(html, /<p class="sektion-hint">Abschnitts-Hinweis-Kern<\/p>/, 'Abschnitts-Hint gerendert');
  assert.match(html, /<div class="feld-hint">Feld-Hinweis-X<\/div>/, 'Feld-Hint gerendert');
});

/* ── 4) Inhaltsverzeichnis ab drei Sektionen ─────────────────────────── */

test('4) Inhaltsverzeichnis erscheint ab drei Sektionen', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);

  // a) Drei Sektionen → ToC sichtbar.
  V.renderSektor(testSektor());
  let html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.tocTitel), 'ToC-Titel bei drei Sektionen');
  assert.match(html, /<nav class="toc"/, 'ToC-Nav-Element');
  assert.ok(html.includes('Kern-Abschnitt'), 'Erster Sektionseintrag im ToC');
  assert.ok(html.includes('Dritter Abschnitt'), 'Dritter Sektionseintrag im ToC');

  // b) Zwei Sektionen → keine ToC.
  const zwei = testSektor();
  zwei.sektionen.pop();   // jetzt zwei Sektionen
  V.renderSektor(zwei);
  html = document.getElementById('content').innerHTML;
  assert.equal(html.includes(V.STRINGS.tocTitel), false, 'keine ToC bei zwei Sektionen');
  assert.equal(/<nav class="toc"/.test(html), false, 'kein ToC-Nav bei zwei Sektionen');
});

/* ── 5) Stimme (UX-Spec V/VII) ────────────────────────────────────────── */

test('5) Leer-Phrase ist „nicht hinterlegt" (kleinschreibung)', () => {
  const { V } = ladeKern();
  assert.equal(V.STRINGS.leerZustand, 'nicht hinterlegt', 'die EINZIGE Leer-Phrase, klein');
  // feldWertHTML für leere skalare Felder zeigt die Phrase im .leer-Span (kursiv per CSS).
  const html = V.feldWertHTML({ typ: 'text' }, '');
  assert.match(html, /<span class="leer">nicht hinterlegt<\/span>/, 'Leer-Phrase im .leer-Span');
});

test('5) Pausen-Zeile als Abschluss pro Bereich', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor(testSektor());
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('<p class="pause-erlaubnis">' + V.STRINGS.pausenErlaubnis + '</p>'),
    'Pausen-Erlaubnis-Phrase mit Sie-Form');
});

test('5) Keine Emoji im Markup; Sie-Form (Pflicht-Marker per ARIA, nicht „Du")', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor(testSektor());
  const html = document.getElementById('content').innerHTML;
  assert.equal(EMOJI.test(html), false, 'kein Emoji im Markup');
  // Sie-Form: das einzige Maschine-Wort ist die Pausen-/Speicher-Zusage (Finding 1 04.07. umformuliert —
  // Bezug auf die String-Konstante, nicht auf den konkreten Wortlaut, damit die Sie-Form-Prüfung
  // Umformulierungen übersteht).
  assert.ok(html.includes(V.STRINGS.pausenErlaubnis), 'Pausen-/Speicher-Zusage gerendert');
  assert.ok(/\bIhre?\b/.test(V.STRINGS.pausenErlaubnis), 'Sie-Form (Ihr/Ihre) in der Zusage');
  // Keine Du-Form in Maschine-erzeugten Texten.
  assert.equal(/\bdu\b|\bdein(e|er|en|em)?\b|\bdir\b|\bdich\b/i.test(html), false,
    'keine Du-Form in der Maschine');
});

test('5) Andock-Format (FHIR_IPS, W3C_VC, …) NICHT sichtbar — nur als Tooltip/ARIA', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor(testSektor());
  const html = document.getElementById('content').innerHTML;

  // Das Format ist im Markup, aber nur in title-Attribut und aria-label — visuell verborgen.
  assert.match(html, /title="Andock-Format: TEST_FORMAT"/, 'Format im title-Attribut (Tooltip)');
  assert.match(html, /aria-label="Andock-Format: TEST_FORMAT"/, 'Format im aria-label');
  // Der bereich-format-Span existiert (für Screen-Reader), wird per CSS visuell verborgen.
  assert.match(html, /<span class="bereich-format" aria-label="Andock-Format: TEST_FORMAT">TEST_FORMAT<\/span>/,
    'bereich-format Span vorhanden (CSS verbirgt visuell)');
});

test('5) Pflicht-Marker mit ARIA-Label „Pflichtangabe"', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor(testSektor());
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /<span class="feld-pflicht-marker" aria-label="Pflichtangabe">\*<\/span>/,
    'Pflicht-Marker mit ARIA-Label');
});
