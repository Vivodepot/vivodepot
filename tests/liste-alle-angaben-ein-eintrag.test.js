'use strict';
/* ═════════════════════════════════════════════════════════════════
   Befund LISTE-ALLE-ANGABEN-DOPPELT (31.10.2026), umgestellt auf Bedienmuster 12 (Weitere Angaben)
   ─────────────────────────────────────────────────────────────────
   Bei einer leeren Liste mit mehr als sechs Teilen steht im Bereich nur der benennende Teil und „Alle Angaben“. Der Knopf öffnete einen
   Dialog; der Fokus verließ dabei den ersten Eintrag, und der Eintrag entstand schon beim Öffnen. Das Speichern im Dialog legte dann einen
   zweiten an — bei einem Vorsorge-Instrument scheiterte es als Doppel („Dieses Instrument gibt es bei Ihnen bereits“), und was im Dialog
   eingegeben war, ging verloren.

   Jetzt klappt „Alle Angaben“ im Eintrag selbst auf: ein Eintrag, ein Behälter, jedes Feld genau einmal (Kopf des Eintrags plus Aufklapper),
   kein Dialog und damit kein zweiter Weg, der einen Eintrag anlegen könnte. Gelesen wird beim Verlassen jedes Unterfeld des einen Behälters.
   Die Probe zu Aufbau, Verdrahtung und „jedes Feld genau einmal“ ist tests/weitere-angaben-aufklapper.test.js; der Ablauf im Browser steht in
   tests/e2e/liste-hinzufuegen-inline.spec.js („Alle Angaben“ legt genau einen Eintrag an).

   Wächter gegen die Klasse: die eine Stelle, an der das Verlassen den Eintrag anlegt (_listeInlineUebernehmen), liest ALLE Unterfelder des
   Behälters, und kein Dialog legt beim Öffnen einen Listeneintrag an.

   Rot-Beweis: der Prüfer unten meldet den früheren Stand (Dialog-Knopf mit Markierung `_imDialog`, Lesen nur des Kopfes).
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Rein: Funde zum Weg „Alle Angaben“ im Kern-Quelltext. */
function weg(kern) {
  const aus = [];
  if (/data-eintrag-alle-angaben="/.test(kern)) aus.push('ein Knopf öffnet aus dem ersten Eintrag einen Dialog (data-eintrag-alle-angaben)');
  if (/box\._imDialog = true/.test(kern)) aus.push('der Eintrag wird als „im Dialog“ markiert');
  const a = kern.indexOf('function _listeInlineUebernehmen(');
  const rumpf = kern.slice(a, kern.indexOf('\n}\n', a));
  if (!/liesEintragAusDOM\(behaelter, feld, 'eintrag-'\)/.test(rumpf)) aus.push('das Verlassen liest nicht jedes Unterfeld des Behälters');
  const verlassen = kern.indexOf("box.addEventListener('focusout'");
  const anlegen = kern.indexOf('_listeInlineUebernehmen(sektorId, feld, box)', verlassen);
  if (verlassen < 0 || anlegen < verlassen) aus.push('die Stelle, an der das Verlassen den Eintrag anlegt, fehlt');
  return aus;
}

test('[Alle-Angaben] der Weg ist ein Aufklapper im Eintrag: kein Dialog-Knopf, keine Markierung, das Verlassen liest jedes Unterfeld', () => {
  assert.deepEqual(weg(KERN), []);
});

test('[Alle-Angaben] genau ein Weg aus dem ersten Eintrag: der Aufklapper, ohne zweiten Eintragsweg', () => {
  assert.equal((KERN.match(/data-weitere-angaben-kopf="/g) || []).length, 1, 'ein Baustein erzeugt den Kopf (weitereAngabenHTML)');
  assert.equal((KERN.match(/weitereAngabenHTML\(aufId,/g) || []).length, 1, 'und er wird an genau einer Stelle für den ersten Eintrag aufgerufen');
});

test('[Alle-Angaben] Rot-Beweis: der frühere Stand (Dialog-Knopf mit Markierung, Lesen nur des Kopfes) fällt durch', () => {
  const alt = KERN
    .replace("liesEintragAusDOM(behaelter, feld, 'eintrag-')", "liesEintragAusDOM(behaelter, _listeInlineFeld(feld), 'eintrag-')")
    .replace("class=\"weitere-angaben-kopf\"", "class=\"liste-alle-angaben\" data-eintrag-alle-angaben=\"x\"")
    .replace('function weitereAngabenVerdrahten(', 'function _x() { var box = {}; box._imDialog = true; }\nfunction weitereAngabenVerdrahten(');
  const funde = weg(alt);
  assert.ok(funde.some((f) => /Dialog/.test(f)), funde.join(' | '));
  assert.ok(funde.some((f) => /markiert/.test(f)));
  assert.ok(funde.some((f) => /nicht jedes Unterfeld/.test(f)));
});

/* Klassenprobe (31.10.2026): kein Dialog legt beim Öffnen einen Listeneintrag an, nur beim Speichern. Jede Funktion,
   die einen Dialog öffnet und einen Listeneintrag schreibt, schreibt erst in „onPrimaer“; der einzige Schreibweg aus dem ersten
   Eintrag (_listeInlineUebernehmen) hat genau einen Aufrufer: das Verlassen des Eintrags. Im Browser für jede lange Liste jedes Bereichs:
   tests/e2e/liste-hinzufuegen-inline.spec.js. */
test('[Alle-Angaben·Klasse] kein Dialog schreibt einen Listeneintrag vor dem Speichern', () => {
  const kopf = /^(?:async )?function ([A-Za-z_$][\w$]*)\(/gm;
  const starts = [];
  for (let m; (m = kopf.exec(KERN));) starts.push({ i: m.index, name: m[1] });
  starts.push({ i: KERN.length, name: '' });
  const schreiben = /\b(listenEintragHinzufuegen|listenEintragAktualisieren|_listeInlineUebernehmen)\(/g;
  let dialoge = 0;
  for (let k = 0; k < starts.length - 1; k++) {
    const { i, name } = starts[k];
    if (/^listenEintrag/.test(name) || name === '_listeInlineUebernehmen') continue;
    const rumpf = KERN.slice(i, starts[k + 1].i);
    const modal = rumpf.indexOf('ui.modal(');
    if (modal < 0) continue;
    const primaer = rumpf.indexOf('onPrimaer', modal);
    for (let m; (m = schreiben.exec(rumpf));) {
      dialoge++;
      assert.ok(m.index > modal && primaer > -1 && m.index > primaer, name + ': schreibt ' + m[1] + ' außerhalb von onPrimaer');
    }
    schreiben.lastIndex = 0;
  }
  assert.ok(dialoge >= 2, 'Vorbedingung: die Dialoge zum Hinzufügen und Bearbeiten sind gefunden (' + dialoge + ')');
  const aufrufer = KERN.match(/[^\w]_listeInlineUebernehmen\(/g) || [];
  assert.equal(aufrufer.length, 2, 'Deklaration und genau ein Aufrufer (das Verlassen des ersten Eintrags)');
});

test('[Alle-Angaben] Kopf und Aufklapper stehen in einem Behälter, nicht in zweien', () => {
  const { V } = ladeKern({ zusatzBindungen: ['_listeInlineHTML'] });
  const feld = V.SEKTOR_BY_ID['people'].sektionen.flatMap((s) => s.felder || []).find((f) => f.id === 'childrenAndDependants');
  const html = V.__zusatz._listeInlineHTML(feld);
  assert.equal((html.match(/<div class="liste-inline"/g) || []).length, 1, 'ein Behälter');
  assert.ok(html.indexOf('data-weitere-angaben="') > html.indexOf('data-liste-inline='), 'der Aufklapper steht im Behälter');
});
