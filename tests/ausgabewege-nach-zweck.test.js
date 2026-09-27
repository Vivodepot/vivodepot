'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   DER ZWECK AM AUSGABEWEG — Zug 0 weist den Bau ab, Zug 2 nimmt auf
   ────────────────────────────────────────────────────────────────────────────
   Produktentscheidung, 21.08.2026: nicht das Format entscheidet, sondern
   was mit dem Ergebnis geschieht — gelesen · verarbeitet · verändert ·
   mitgenommen.

   ZUG 0, DIE FRAGE VOR ALLEN ANDEREN: gibt es heute eine Stelle, die anders
   handeln würde, wenn sie den Zweck kennte?

   **DIE ANTWORT IST NEIN — und der Auftrag nennt das ausdrücklich ein gutes
   Ergebnis.** Gemessen mit `tools/ausgabewege-nach-zweck-messen.js`: der Kern
   liest acht registry-eigene Eigenschaften als Entscheidung —

     ohneAuswahl · kategorie · eudiw · toastLeer · toastLeerFn ·
     zurueckgehaltenFn · mime · endung

   — und **keine davon würde durch den Zweck anders ausfallen.** Sie beantworten:
   *wirkt die Auswahl?* · *ein Bereich oder das ganze Depot?* · *ist das ein
   Wallet-Kanal?* · *welche Meldung nach dem Download?* · *wie heisst die Datei?*
   `mime` steht dabei allein für den Blob-Typ, nicht für eine Entscheidung — es
   ist also nicht „schon ausreichend", sondern gar kein Entscheidungs-Eingang.

   **Der Zweck gehört damit in den veröffentlichten Kontrakt, nicht in den Kern.**
   Eine Eigenschaft, die niemand liest, ist Gewicht ohne Wirkung.

   ZWEI MESSMODELLE MUSSTEN GESCHÄRFT WERDEN, und ohne sie hätte die Antwort
   anders gelautet:
     (1) Der erste Zähler nahm `id`, `label`, `sektor` und `toast` mit — Namen,
         die im Kern an hundert anderen Objekten stehen. Er meldete 258
         Verzweigungen auf `id`.
     (2) Er übersah `eudiw`, weil `EXPORT_FORMATE.find(f => f.eudiw && …)` kein
         `if` davor trägt. **Ein Sucher, der eine echte Verzweigung übersieht,
         macht sein „nichts gefunden" wertlos** — genau darum ist die
         Positivkontrolle hier der Gegenstand.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/ausgabewege-nach-zweck-messen.js');

function mess() {
  const { V } = ladeKern();
  return M.messen(V);
}

/* ══ Zug 0 ═══════════════════════════════════════════════════════════════ */

test('[Zweck·Positivkontrolle] der Sucher findet die bekannten Verzweigungen', () => {
  /* Ohne sie sagt „keine Stelle braucht den Zweck" nichts — es hiesse womöglich nur, dass der
     Sucher gar nichts findet. */
  const m = mess();
  for (const eig of ['ohneAuswahl', 'kategorie', 'eudiw']) {
    assert.ok(m.verzweigungen[eig] > 0,
      '`' + eig + '` wird nicht als Verzweigung gefunden — der Sucher greift zu kurz, und sein '
      + 'Nein trägt nicht');
  }
});

test('[Zweck·DIE ANTWORT] keine der gelesenen Eigenschaften ist ein Zweck', () => {
  /* Die acht sind Mechanik-Fragen, keine Zweck-Fragen. Kommt eine NEUE dazu, ist das der
     Anlass, Zug 0 neu zu stellen — darum steht die Menge hier. */
  const m = mess();
  assert.deepEqual(Object.keys(m.verzweigungen).sort(),
    ['endung', 'eudiw', 'kategorie', 'mime', 'ohneAuswahl', 'toastLeer', 'toastLeerFn', 'zurueckgehaltenFn'],
    'die Menge der entscheidungstragenden Eigenschaften hat sich verändert — dann gehört Zug 0 '
    + 'neu gestellt, statt diese Zeile nachzuziehen');
});

test('[Zweck] `mime` ist kein Entscheidungs-Eingang, sondern der Blob-Typ', () => {
  /* Der Auftrag nennt `mime` als möglichen Anhalt, „möglicherweise schon ausreichend — das ist zu
     prüfen, nicht zu übergehen". Geprüft: es steht am Download (`new Blob([…], { type: def.mime })`)
     und entscheidet nirgends. */
  const m = mess();
  assert.equal(m.mimeAlsEntscheidung, false,
    '`mime` wird jetzt als Entscheidung gelesen — dann ist Zug 0 neu zu stellen');
});

/* ══ Zug 2 ═══════════════════════════════════════════════════════════════ */

test('[Zweck·Zug 2] jeder Weg trägt einen Zweck oder wird als offen BENANNT', () => {
  const m = mess();
  assert.ok(m.wege.length >= 12, 'die Aufnahme ist geschrumpft: ' + m.wege.length);
  for (const w of m.wege) {
    assert.ok(w.kennung && w.grund, 'ein Weg ohne Kennung oder Grund: ' + JSON.stringify(w));
    if (w.eindeutig) assert.equal(w.zweck.length, 1, w.kennung + ': eindeutig, aber nicht genau ein Zweck');
    else assert.ok(w.grund.length > 40, w.kennung + ': nicht eindeutig, aber ohne ausgeführten Grund');
  }
});

test('[Zweck·Zug 2] die drei nicht eindeutigen Fälle stehen namentlich', () => {
  /* Sie sind das eigentliche Ergebnis von Zug 2 — die Stellen, an denen die Entscheidung
     nachzuschärfen ist. Wer sie glättet, nimmt die Frage weg. */
  const m = mess();
  const offen = m.wege.filter((w) => !w.eindeutig).map((w) => w.kennung).sort();
  assert.deepEqual(offen, ['flowAnlassExport', 'flowNotfallkartePdf', 'flowSubDepotBlackboxExport'],
    'die Menge der unklaren Fälle hat sich verändert: ' + offen.join(', '));
});

test('[Zweck·DER FUND, eingelöst] kein Ausgabeweg führt mehr DOCX', () => {
  /* DER FUND, der diesen Zug ausgelöst hat: DOCX gab es im Kern an genau drei Stellen —
     `docxBereichModell`, `flowDocxExport` und der Knopf im Bereichs-Herausgabe-Chooser — und
     ALLE DREI gehörten zum Bereichs-Export. **Bei den Dokument-Generatoren gab es nie eins.**
     Die erste Fassung der Entscheidung wollte DOCX „bei den Generatoren behalten"; gemessen war
     dort nichts zu behalten.

     Die Produktentscheidung hat daraufhin die Entscheidung ERSETZT: DOCX entfällt ganz, der vierte Zweck
     wandert in den Generator. Dieser Zug hat den Weg gestrichen — die Probe hält jetzt fest,
     dass er fort BLEIBT. `docxBereichModell` steht weiter, und der Grund dafür steht in der
     A253-Grundlinie. */
  const m = mess();
  assert.equal(m.docx.beiGeneratoren, false, 'bei den Generatoren gibt es DOCX — das gab es nie');
  assert.ok(!m.docx.stellen.some((s) => s.includes('flowDocxExport')),
    'der Bereichs-Export ist zurück — der gestrichene Weg lebt wieder');
  assert.ok(!m.docx.stellen.some((s) => s.includes('Chooser')),
    'der Word-Knopf steht wieder im Chooser');
  assert.ok(m.docx.stellen.some((s) => s.includes('docxBereichModell')),
    'das Datenmodell ist fort — es sollte BLEIBEN, bis über seinen Namen entschieden ist');
});

test('[Zweck·angehalten] kein Zweck-Schlüssel ist gebaut worden', () => {
  /* Zug 1 lief nicht, weil Zug 0 ihn abgewiesen hat. Diese Probe hält fest, dass die
     Schlüsselmenge unberührt ist. */
  /* Am QUELLTEXT gemessen: `FORMAT_MODUL_SCHLUESSEL` ist nicht exportiert, und für eine
     read-only-Erhebung den Export-Haken zu erweitern hiesse, den Gegenstand für die Messung zu
     ändern. Die Liste steht als Literal im Kern und ist von dort ablesbar. */
  const fs = require('node:fs');
  const path = require('node:path');
  const text = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const treffer = text.match(/const FORMAT_MODUL_SCHLUESSEL = Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert.ok(treffer, 'die Schlüsselliste ist am erwarteten Ort nicht mehr zu finden');
  const schluessel = (treffer[1].match(/'([^']+)'/g) || []).map((x) => x.replace(/'/g, ''));
  assert.ok(!schluessel.includes('zweck'),
    '`zweck` steht in FORMAT_MODUL_SCHLUESSEL — dann ist gebaut worden, was Zug 0 abgewiesen hat');
  /* NACHGEZOGEN 22.08.2026 (1.0a): 15 → 16. Der neue Schlüssel ist `sprache` — in
     welcher Sprache das `label` dieses Kanals steht. Er ist NICHT `zweck`, und die
     Zeile darüber hält das weiter fest: der abgewiesene Zug bleibt abgewiesen.
     Die Zahl wird hier bewusst nachgezogen und nicht gelockert — eine Grundlinie,
     die man auf „mindestens" stellt, meldet den nächsten Zuwachs nicht mehr. */
  /* NACHGEZOGEN 04.09.2026 (U2-ADR-255): 16 → 17. Der neue Schlüssel ist
     `rechtsraum` — ob ein Format-Modul sich selbst an einen Rechtsraum bindet (Ausgabeformat/
     Rechtsraum-Kopplung). Auch er ist NICHT `zweck`; der abgewiesene Zug bleibt abgewiesen. */
  /* NACHGEZOGEN 04.09.2026 (U2-ADR-257): 17 → 18. Der neue Schlüssel ist
     `schreiber` — welche der eingebauten Schreibformen ein Ausgabe-Modul nennt (`FORMAT_SCHREIBER`,
     die Spiegelseite zu `leser`). Auch er ist NICHT `zweck`; der abgewiesene Zug bleibt abgewiesen. */
  assert.equal(schluessel.length, 18,
    'die Schlüsselmenge hat sich verändert: ' + schluessel.join(', '));
  assert.ok(schluessel.includes('sprache'),
    'der sechzehnte Schlüssel ist `sprache` (1.0a) — steht er nicht mehr da, ist die '
    + 'Herkunftssprache eines Format-Moduls wieder unbenannt');
  assert.ok(schluessel.includes('rechtsraum'),
    'der siebzehnte Schlüssel ist `rechtsraum` (U2-ADR-255) — steht er nicht mehr da, ist die '
    + 'Rechtsraum-Kopplung eines Format-Moduls wieder unbenannt');
  assert.ok(schluessel.includes('schreiber'),
    'der achtzehnte Schlüssel ist `schreiber` (U2-ADR-257) — steht er nicht mehr da, kann ein '
    + 'Ausgabe-Modul wieder nur JSON schreiben');
});
