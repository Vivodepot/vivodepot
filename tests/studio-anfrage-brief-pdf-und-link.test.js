'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio wie die freigegebenen Dummies: Beispiel „Bibliotheksausweis“, Brief als PDF, „Link öffnen“
   ─────────────────────────────────────────────────────────────────
   (1) Das Beispiel „Bibliotheksausweis“ trägt die Felder des Dummy-Beispiels „Bibliotheksausweis“ (Dummy 14.11.2026,
       Z. 248): Vorname, Nachname, Geburtsdatum, Anschrift (Straße, Hausnummer, Postleitzahl, Ort) und „Nachweise für eine
       Ermäßigung“ freiwillig. Die Liste mit Unterfeldern bleibt; das Beispiel wird nicht kleiner. Die Prüfung meldet kein Feld.
   (2) Im Ergebnis der Anfrage speichert „Brief mit dem Link speichern (PDF)“ den Brief als PDF (Dummy 13.11.2026, Z. 124);
       der Brief als Text bleibt.
   (3) Die Karte „Link“ trägt „Link öffnen“ (Dummy 13.11.2026, Z. 126): ein Verweis auf den Link, in einem neuen Fenster.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Fassung vor diesem Wagen> node --test tests/studio-anfrage-brief-pdf-und-link.test.js → alle rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeGenerator } = require('./load-generator.js');

/* Der DOM-Stub hat keine Kinder und keine Ereignisse; hier wird jedes gebaute Element mitgeschrieben, Klicks werden gehalten. */
function mitschreibend(g) {
  const gebaut = [];
  g.sandbox.el = (tag, attrs, kinder) => {
    const e = { tag, attrs: attrs || {}, kinder: kinder || [], klick: (attrs && attrs.onclick) || null };
    e.addEventListener = (art, f) => { if (art === 'click') e.klick = f; };
    e.appendChild = (k) => { e.kinder.push(k); return k; };
    gebaut.push(e);
    return e;
  };
  return gebaut;
}
const text = (e) => String(e.attrs.text != null ? e.attrs.text : e.kinder.filter((k) => typeof k === 'string').join(''));

test('[Studio·Beispiel·Bibliothek] Felder des Dummy-Beispiels, Ermäßigung freiwillig, Liste bleibt, keine Feldmeldung', () => {
  const { V } = ladeGenerator();
  const b = V.BEISPIEL_TEMPLATES.bibliothek;
  const namen = b.felder.map((f) => f.feldname);
  for (const n of ['Vorname', 'Nachname', 'Geburtsdatum', 'Straße', 'Hausnummer', 'Postleitzahl', 'Ort', 'Nachweise für eine Ermäßigung']) {
    assert.ok(namen.includes(n), 'das Feld „' + n + '“ fehlt im Beispiel: ' + namen.join(', '));
  }
  const erm = b.felder.find((f) => f.feldname === 'Nachweise für eine Ermäßigung');
  assert.equal(erm.pflicht, false, 'der Nachweis für eine Ermäßigung ist freiwillig');
  assert.equal(erm.bereich, 'socialInsurance');
  assert.ok(namen.includes('Weitere Personen im Familienausweis'), 'die Liste mit Unterfeldern ist weg');
  const geladen = V.felderAngleichungen(b.felder.map((f) => Object.assign({}, f, { bereich: V.normBereich(f.bereich) }))).felder;
  const r = V.pruefeKonformitaet({ felder: geladen, anbieter: null, publicKeyJwk: null });
  assert.deepEqual(Array.from(r.blocker).filter((x) => /^Feld \d/.test(x)), [], 'die Prüfung meldet ein Feld');
});

test('[Studio·Anfrage·Brief-PDF] „Brief mit dem Link speichern (PDF)“ gibt den Brief als PDF aus', async () => {
  const g = ladeGenerator();
  const hinaus = [];
  g.sandbox.blobDownload = (name, inhalt, typ) => hinaus.push({ name, inhalt, typ });
  mitschreibend(g);
  const knopf = g.sandbox.briefPdfKnopf('Sehr geehrte Damen und Herren, https://share.example/anfrage.html#anfrage=abc',
    (bytes) => g.sandbox.blobDownload('Anfrage-AUF-1-brief.pdf', bytes, 'application/pdf'));
  assert.equal(text(knopf), 'Brief mit dem Link speichern (PDF)');
  assert.equal(knopf.attrs.id, 'aa-brief-pdf');
  assert.equal(typeof knopf.klick, 'function', 'der Knopf tut nichts');
  await knopf.klick();
  assert.equal(hinaus.length, 1, 'keine oder mehrere Dateien: ' + hinaus.map((h) => h.name).join(', '));
  assert.equal(hinaus[0].name, 'Anfrage-AUF-1-brief.pdf');
  assert.equal(hinaus[0].typ, 'application/pdf');
  assert.equal(Buffer.from(hinaus[0].inhalt.slice(0, 5)).toString('latin1'), '%PDF-', 'kein PDF');
  // Beide Wege der Anfrage geben den Brief als PDF mit dem Namen der Anfrage aus.
  const html = require('node:fs').readFileSync(require('./load-generator.js').GEN_PATH, 'utf8');
  assert.equal((html.match(/briefPdfKnopf\(brief, \(bytes\) => blobDownload\(dateiname\.replace\(\/\\\.json\$\/, '-brief\.pdf'\), bytes, 'application\/pdf'\)\)/g) || []).length, 2,
    'nicht beide Wege der Anfrage tragen „Brief mit dem Link speichern (PDF)“');
});

test('[Studio·Anfrage·Link öffnen] die Karte „Link“ trägt „Link öffnen“ auf den Link, in einem neuen Fenster', () => {
  const g = ladeGenerator();
  const gebaut = mitschreibend(g);
  const link = 'https://share.example/anfrage.html#anfrage=abc';
  g.sandbox.ergebnisLinkKarte(link);
  const a = gebaut.find((e) => e.tag === 'a' && e.attrs.id === 'aa-link-oeffnen');
  assert.ok(a, '„Link öffnen“ fehlt');
  assert.equal(text(a), 'Link öffnen');
  assert.equal(a.attrs.href, link);
  assert.equal(a.attrs.target, '_blank');
  assert.match(a.attrs.rel, /noopener/);
});
