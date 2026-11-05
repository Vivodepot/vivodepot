'use strict';
/* ═════════════════════════════════════════════════════════════════
   Befund LISTE-ALLE-ANGABEN-DOPPELT (31.10.2026)
   ─────────────────────────────────────────────────────────────────
   Bei einer leeren Liste mit mehr als sechs Teilen steht im Bereich nur der
   benennende Teil und „Alle Angaben“. Der Knopf öffnet den Dialog; der Fokus
   verließ dabei den ersten Eintrag, und der Eintrag entstand schon beim Öffnen.
   Das Speichern im Dialog legte dann einen zweiten an — bei einem
   Vorsorge-Instrument scheiterte es als Doppel („Dieses Instrument gibt es bei
   Ihnen bereits“), und was im Dialog eingegeben war, ging verloren.

   Jetzt zählt das Verlassen nicht, solange der Dialog aus diesem Eintrag offen
   ist; nach „Abbrechen“ zählt es wieder. Der ganze Ablauf im Browser:
   tests/e2e/liste-hinzufuegen-inline.spec.js („Alle Angaben“ legt genau einen
   Eintrag an).

   Wächter gegen die Klasse: jeder Weg, der aus dem ersten Eintrag einen Dialog
   öffnet (`data-eintrag-alle-angaben`), markiert den Eintrag, und die eine
   Stelle, an der das Verlassen den Eintrag anlegt, fragt die Markierung ab.

   Rot-Beweis: auf dem Stand vor dem Fix fehlt `_listeInlineImDialog`.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function helfer() {
  const k = ladeKern({ zusatzBindungen: ['_listeInlineImDialog'] });
  const f = k.V.__zusatz._listeInlineImDialog;
  assert.equal(typeof f, 'function', 'ROT ERWARTET vor dem Fix: _listeInlineImDialog fehlt');
  return f;
}
const rueckMit = (...drin) => ({ contains: (el) => drin.includes(el) });

test('[Alle-Angaben] offener Dialog aus dem ersten Eintrag: das Verlassen legt keinen Eintrag an', () => {
  const imDialog = helfer();
  const feldImDialog = {};
  const box = { _imDialog: true };
  assert.equal(imDialog(box, feldImDialog, rueckMit(feldImDialog)), true);
  assert.equal(box._imDialog, true, 'die Markierung bleibt, solange der Dialog offen ist');
});

test('[Alle-Angaben] Dialog zu (Abbrechen): das Verlassen zählt wieder, die Markierung geht', () => {
  const imDialog = helfer();
  const box = { _imDialog: true };
  assert.equal(imDialog(box, {}, rueckMit()), false);
  assert.equal(box._imDialog, false);
});

test('[Alle-Angaben] ohne Markierung bleibt alles wie vorher (ein anderer Dialog hält den ersten Eintrag nicht auf)', () => {
  const imDialog = helfer();
  const el = {};
  assert.equal(imDialog({}, el, rueckMit(el)), false);
  assert.equal(imDialog(null, el, rueckMit(el)), false);
});

test('[Alle-Angaben] Wächter: der Knopf markiert den Eintrag, das Verlassen fragt die Markierung', () => {
  const knopf = KERN.indexOf("querySelectorAll('[data-eintrag-alle-angaben]')");
  assert.ok(knopf > -1, 'der Knopf „Alle Angaben“ ist verdrahtet');
  const rumpf = KERN.slice(knopf, KERN.indexOf('});', knopf));
  assert.match(rumpf, /box\._imDialog = true[\s\S]*flowListenEintragHinzufuegen/, 'markiert, bevor der Dialog öffnet');
  const verlassen = KERN.indexOf("box.addEventListener('focusout'");
  assert.ok(verlassen > -1);
  const anlegen = KERN.indexOf('_listeInlineUebernehmen(sektorId, feld, box)', verlassen);
  assert.ok(anlegen > verlassen);
  assert.match(KERN.slice(verlassen, anlegen), /_listeInlineImDialog\(box, document\.activeElement, document\.getElementById\('modal-rueck'\)\)/,
    'vor dem Anlegen fragt das Verlassen, ob der Dialog aus diesem Eintrag offen ist');
  assert.equal((KERN.match(/data-eintrag-alle-angaben="/g) || []).length, 1, 'genau ein Weg aus dem ersten Eintrag in den Dialog');
});

/* Klassenprobe (31.10.2026): kein Dialog legt beim Öffnen einen Listeneintrag an, nur beim Speichern. Jede Funktion,
   die einen Dialog öffnet und einen Listeneintrag schreibt, schreibt erst in „onPrimaer“; der einzige Schreibweg aus dem ersten
   Eintrag (_listeInlineUebernehmen) hat genau einen Aufrufer, und der fragt vorher, ob ein Dialog aus dem Eintrag offen ist.
   Im Browser für jede lange Liste jedes Bereichs: tests/e2e/liste-hinzufuegen-inline.spec.js. */
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
