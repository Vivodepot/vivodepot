'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio · Benutzbarkeit M7–M11, N1–N4 (Benutzbarkeitsprüfung 22.11.2026)
   ─────────────────────────────────────────────────────────────────
   M7  „Antworten öffnen“: Dateien und Passwort; die Schlüsseldatei steht eingeklappt unter „Wenn Ihre Anfrage mit Zertifikat
       signiert war“; keine Dateiendungen in den Beschriftungen.
   M8  Englisch: ein Beispiel trägt die englischen Namen der Katalogfelder; das Depot findet sie weiter.
   M9  Auswahllisten zeigen ohne „Technische Begriffe anzeigen“ je Antwort nur ihren Text, mit dem Schalter Code und Synonym.
   M10 Die Kachel „Anfrage an Personen“ sagt, dass über sie die Antworten kommen.
   M11 Reiter wechseln mit Pfeiltasten.
   N1  „Daten bereitstellen · in Arbeit“ ist abgeschaltet.  N2  Der Wortlaut-Reiter sagt, wann die Sterne gelten.
   N3  Die Seite „Vorlage gesichert“ ist keine Statusregion; der Fokus geht auf ihre Überschrift.
   N4  Der Editor-Knopf heißt „Übernehmen“; „+“ in der Bausteinliste misst 32 px.
   ROT-BEWEIS: der letzte Fall setzt jede Stelle zurück und erwartet rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));

function befunde(html) {
  const f = [];
  const h = html || HTML;
  // M7
  const an = h.slice(h.indexOf('<main id="raum-antworten"'), h.indexOf('</main>', h.indexOf('<main id="raum-antworten"')));
  const klappe = an.slice(an.indexOf('<details id="an-zertifikat">'), an.indexOf('</details>'));
  if (!/id="an-schluessel"/.test(klappe) || !/Wenn Ihre Anfrage mit Zertifikat signiert war/.test(klappe)) f.push('M7: Schlüsseldatei nicht eingeklappt');
  if (/\(\.jwe\)|\(\.vdkey\)/.test(an)) f.push('M7: Dateiendungen in den Beschriftungen');
  // M8
  try {
    const g = ladeGenerator(html ? { html } : undefined);
    g.sandbox.zeigeSchritt = () => {};
    vm.runInContext("LANG = 'en';", g.sandbox);
    g.V.STATE.felder = [];
    g.sandbox.ladeBeispiel('bibliothek');
    const namen = nativ(g.V.STATE.felder).map((x) => x.feldname);
    if (namen.indexOf('First name') < 0 && namen.indexOf('Given name') < 0) f.push('M8: Beispiel englisch ohne englische Namen: ' + namen.slice(0, 3).join(', '));
    if (g.V.STATE.felder.some((x, i) => i < 3 && g.sandbox.feldKatalogIndex(x) < 0)) f.push('M8: englischer Name findet das Katalogfeld nicht');
  } catch (e) { f.push('M8: ' + e.message); }
  // M9
  try {
    const g = ladeGenerator(html ? { html } : undefined);
    const gebaut = [];
    const el = g.sandbox.el;
    g.sandbox.el = (tag, attrs, kinder) => { const e = el(tag, attrs, kinder); gebaut.push({ tag, attrs: attrs || {}, kinder: kinder || [] }); return e; };
    vm.runInContext("editorCodeWerte = [{ code: 'a', anzeige: 'A' }]; paletteKennungenZeigen = false;", g.sandbox);
    g.sandbox.rendereCodeWerteEditor();
    if (!gebaut.some((b) => b.attrs.class === 'cw-zeile')) f.push('M9: keine Zeile');
    if (gebaut.some((b) => b.attrs.placeholder === 'Code')) f.push('M9: Code ohne Schalter sichtbar');
    gebaut.length = 0;
    vm.runInContext('paletteKennungenZeigen = true;', g.sandbox);
    g.sandbox.rendereCodeWerteEditor();
    if (!gebaut.some((b) => b.attrs.placeholder === 'Code')) f.push('M9: Code mit Schalter nicht sichtbar');
  } catch (e) { f.push('M9: ' + e.message); }
  // M10
  if (!/id="ein-anfrage">[^]*?<span class="ek-text"[^>]*>So empfangen Sie Antworten\./.test(h)) f.push('M10: Kachel nennt die Antworten nicht');
  // M11
  if (!/document\.addEventListener\('keydown', reiterPfeile\);/.test(h) || !/function reiterPfeile\(e\)/.test(h)) f.push('M11: keine Pfeiltasten für Reiter');
  // N1–N4
  if (!/id="ein-bereitstellen" aria-disabled="true" disabled>/.test(h)) f.push('N1: Kachel „in Arbeit“ nicht abgeschaltet');
  if (!/id="wortlaut-sterne"/.test(h)) f.push('N2: Sterne im Wortlaut-Reiter nicht erklärt');
  if (/id="sichern-ergebnis"[^>]*role="status"/.test(h) || !/if \(kopfG && kopfG\.focus\) kopfG\.focus\(\);/.test(h)) f.push('N3: Ergebnisseite als Statusregion oder ohne Fokus');
  if (!/id="ed-speichern" data-en="Apply">Übernehmen</.test(h)) f.push('N4: Editor-Knopf heißt nicht „Übernehmen“');
  if (!/\.pal-eintrag \.pal-plus \{ flex: none; width: 32px; height: 32px;/.test(h)) f.push('N4: „+“ kleiner als 32 px');
  return f;
}

test('[Studio · Benutzbarkeit] M7–M11, N1–N4', () => {
  assert.deepEqual(befunde(), []);
});

test('[Studio · Benutzbarkeit · Rot-Beweis] jede Stelle zurückgesetzt wird rot', () => {
  const mut = (a, b) => { assert.ok(HTML.includes(a), 'Vorbedingung: ' + a.slice(0, 60)); return HTML.replace(a, b); };
  const fall = (html, muster) => { const b = befunde(html); assert.ok(b.some((x) => x.startsWith(muster)), muster + ': ' + b.join(' | ')); };
  fall(mut('<details id="an-zertifikat">', '<div id="an-zertifikat-weg">'), 'M7');
  fall(mut("    const i = feldKatalogIndex(f), en = i >= 0 ? FELDKATALOG[i].labelEn : '';", "    const i = -1, en = '';"), 'M8');
  fall(mut('  const technisch = !!paletteKennungenZeigen;', '  const technisch = true;'), 'M9');
  fall(mut('>So empfangen Sie Antworten. Sie sagen,', '>Sie sagen,'), 'M10');
  fall(mut("document.addEventListener('keydown', reiterPfeile);", 'void 0;'), 'M11');
  fall(mut('aria-disabled="true" disabled>', 'aria-disabled="true">'), 'N1');
  fall(mut('id="wortlaut-sterne"', 'id="wortlaut-x"'), 'N2');
  fall(mut('<div id="sichern-ergebnis" class="meldung ok" hidden>', '<div id="sichern-ergebnis" class="meldung ok" role="status" hidden>'), 'N3');
  fall(mut('data-en="Apply">Übernehmen<', 'data-en="Done">Fertig<'), 'N4');
});
