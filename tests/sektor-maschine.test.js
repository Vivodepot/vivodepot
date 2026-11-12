'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sektor-Maschine (generisch, ohne Sektor-Bezug)
   ────────────────────────────────────────────────────────────────────────
   Die Maschine kennt nur Feldtypen, Ebenen (kern/modul), Hints, Sektion-Struktur
   und die Stimme. Konkrete Sektoren sind reine Datendefinitionen.

   Verifikation (UX-Spec V/VII, U2-ADR-006/009):
     1) Jeder Feldtyp prüft (Datum lehnt Freitext ab, Zahl lehnt Buchstaben ab,
        Auswahl nur aus Optionen, Pflicht greift, maxLength/min/max greifen).
     2) Kern- und Modul-Feld stehen genau einmal in einer Gruppenkarte (löst den „mehr"-Block ab, v998, M07); Zähler bei Eintrag.
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

/* ── 2) Kern- und Modul-Felder in der Gruppenkarte ──────────────────── */

// Abnahme v998, M07: der „mehr"-Block ist abgelöst. Jedes Feld einer Sektion — Kern wie Modul — steht genau einmal in
// einer Gruppenkarte (`_sektionKartenListe`); die Karte öffnet sich, sobald etwas eingetragen ist, und zählt „N von M".
// Die Sektion ohne Kern-Felder ist in sektoren-spec.test.js geprüft.
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

test('2) Kern- und Modul-Felder stehen genau einmal in der Gruppenkarte, ohne mehr-Block', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');

  V.renderSektor(mixedSektor());
  const html = document.getElementById('content').innerHTML;

  assert.ok(!html.includes('mehr-block'), 'kein mehr-Block');
  assert.ok(html.includes('feldgruppen-karte'), 'die Felder stehen in einer Gruppenkarte');
  for (const id of ['f_text', 'f_modul_a', 'f_modul_b']) {
    assert.equal(html.split('data-feld="' + id + '"').length - 1, 1, 'Feld ' + id + ' steht genau einmal da');
  }
  // Ohne Eintrag: die Karte ist geschlossen (kein " open").
  assert.equal(/<details class="feldgruppen-karte" open/.test(html), false, 'Karte geschlossen, solange nichts eingetragen ist');
});

test('2) Karte öffnet bei Eintrag und zählt „1 von 3"', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  // Modul-Feld füllen.
  V.sektorFeldSetzen('test_mehr_sektor', 'f_modul_a', 'wert');

  V.renderSektor(mixedSektor());
  const html = document.getElementById('content').innerHTML;

  // Ruhezustand (Zielbild 05, tests/feldgruppen-ruhezustand.test.js): die erste Karte eines Bereichs steht ab Werk offen.
  assert.match(html, /<details class="feldgruppen-karte"[^>]* open/, 'Karte offen: die erste Karte des Bereichs');
  assert.match(html, /feldgruppen-karte-zahl">1 von 3</, 'Zähler „1 von 3"');
});

/* ── 3) Hints ────────────────────────────────────────────────────────── */

test('3) Feld-Hint und Abschnitts-Hint rendern', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);

  V.renderSektor(testSektor());
  const html = document.getElementById('content').innerHTML;

  assert.match(html, /<p class="sektion-hint">Abschnitts-Hinweis-Kern<\/p>/, 'Abschnitts-Hint gerendert');
  // FELD-HINWEIS-NICHT-VERKNUEPFT (23.10.2026): der Hinweis trägt eine id, auf die das Eingabefeld verweist.
  assert.match(html, /<div class="feld-hint" id="fh-\d+">Feld-Hinweis-X<\/div>/, 'Feld-Hint gerendert');
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

test('5) keine Schlusszeile unter einem Bereich (Zielbild 05: keine Fußzeile, das Etikett oben sagt „gespeichert“)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor(testSektor());
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('class="pause-erlaubnis"'), 'keine Pausen-Zeile am Bereichsende');
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
  assert.ok(/\bIhre?\b/.test(V.speicherSatz('bereichsende')), 'Sie-Form (Ihr/Ihre) in der Zusage');
  // Keine Du-Form in Maschine-erzeugten Texten.
  assert.equal(/\bdu\b|\bdein(e|er|en|em)?\b|\bdir\b|\bdich\b/i.test(html), false,
    'keine Du-Form in der Maschine');
});

/* Seit 07.10.2026 steht das Andock-Format nirgends in der Benutzersicht, auch nicht als Tooltip oder Vorlesetext: Entscheidung der
   Produktverantwortung „keine technischen Markierungen in der Benutzersicht“, „aber auch nicht für Nutzer erkennbar“ (Nachtrag in der
   Entscheidung „Gestaltung: Fläche und Abstand statt Linien“ vom 07.10.2026). Das Format bleibt in den Daten; muss die Person ein Format
   wählen, geschieht das in Worten, nie als Kürzel. Früher hielt diese Probe Tooltip und ARIA fest. */
test('5) Andock-Format (FHIR_IPS, W3C_VC, …) steht nirgends in der Benutzersicht — weder als Text noch als Tooltip noch als ARIA', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  const sektor = testSektor();
  V.renderSektor(sektor);
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.length > 200, 'Voraussetzung: der Bereich wurde gezeichnet');
  assert.equal(sektor.format, 'TEST_FORMAT', 'das Format bleibt in den Daten');
  assert.ok(!html.includes('TEST_FORMAT'), 'kein Format-Kürzel im Markup: nicht im Text, nicht in title, nicht in aria-label');
});

test('5) Pflicht-Marker mit ARIA-Label „Pflichtangabe"', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSektor(testSektor());
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /<span class="feld-pflicht-marker" aria-label="Pflichtangabe">\*<\/span>/,
    'Pflicht-Marker mit ARIA-Label');
});
