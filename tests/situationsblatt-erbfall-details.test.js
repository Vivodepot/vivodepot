'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D.2 (Rest-Sichten) — Situationsblatt `erbfall`: Blöcke hinter <details>
   ────────────────────────────────────────────────────────────────────────
   Der Plan (2026-08-26-breakfast-modernisierung-implementierungsplan.md,
   Task D.2) nennt im Titel „vier Blöcke", zählt in Schritt 3 aber FÜNF Namen
   auf: „Wo die Originale liegen", „Versicherungen", „Konten & Vermögen",
   „Verträge & laufende Zahlungen", „Kontakte fürs Erbe" — ein Widerspruch im
   Plandokument selbst (gegengelesen, keine Übertragungsfehler). Die fünf
   Namen decken sich 1:1 mit fünf der sieben tatsächlichen Block-IDs im
   `erbfall`-Eintrag (grep `id: 'erbfall'`, vivodepot.html ~12575); die Zahl
   „vier" ist freier Fließtext ohne Beleg (vgl. globale Regel „Zahl im
   Fließtext hat keinen Wächter"). Aufgelöst zugunsten der NAMENSLISTE: alle
   fünf genannten Blöcke werden klappbar, „Aus Ihren Bereichen" (Überblick)
   und „Die ersten Schritte" (fristbehaftete Sofort-Angaben, § 28 PStG) bleiben
   offen — deckt sich mit der Plan-Absicht „Übersicht + erste Schritte bleiben
   offen, der Rest ist Verwaltungs-/Finanz-Nachlauf".

   Die Blocktitel sind TEXTSATZ-Werte (situation:erbfall#<id>.titel, ab Zeile
   ~7122) — geprüft wortwörtlich inkl. Groß-/Kleinschreibung: „Wo die
   Originale liegen" (großes W), nicht „wo die Originale liegen" wie in der
   Plan-Vorlage für Schritt 1 paraphrasiert.

   ROT-BEWEIS (gemessen VOR dem Fix, gegen den unveränderten Stand aus HEAD):
   alle Tests außer dem letzten („todesfall-uebernahme … kein details") schlugen
   fehl — `renderSituation()` rendert am Vorher-Stand JEDEN Block als flache
   `<div class="sektion">`, kein einziges `<details class="situation-block">`
   existierte. Der Zähl-Test („genau fünf details-Blöcke") schlug mit `0 !== 5`
   fehl, kein zufälliges Rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

describe('[renderSituation] erbfall: fünf von sieben Blöcken hinter <details>, Übersicht + erste Schritte bleiben offen', () => {
  test('Block "wo-die-originale-liegen" liegt INNERHALB eines details-Elements', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.waehleAnlass('erbfall');
    const html = k.document.getElementById('content').innerHTML;
    assert.match(html, /<details class="situation-block"[^>]*>[\s\S]*?Wo die Originale liegen[\s\S]*?<\/details>/);
  });

  for (const titel of ['Versicherungen', 'Konten &amp; Vermögen', 'Verträge &amp; laufende Zahlungen', 'Kontakte fürs Erbe']) {
    test('Block "' + titel + '" liegt ebenfalls INNERHALB eines details-Elements', async () => {
      const k = ladeKern();
      await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
      k.V.waehleAnlass('erbfall');
      const html = k.document.getElementById('content').innerHTML;
      // Titel gehen durch escapeHTML() — "&" wird zu "&amp;" (Kandidaten-Liste trägt das schon).
      assert.match(html, new RegExp('<details class="situation-block"[^>]*>[\\s\\S]*?' + titel + '[\\s\\S]*?</details>'));
    });
  }

  test('Block "die-ersten-schritte" bleibt AUSSERHALB jedes details-Elements', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.waehleAnlass('erbfall');
    const html = k.document.getElementById('content').innerHTML;
    const vorErstemDetails = html.split('<details class="situation-block"')[0];
    assert.match(vorErstemDetails, /die ersten Schritte/i);
  });

  test('Block "aus-ihren-bereichen" (Überblick) bleibt AUSSERHALB jedes details-Elements', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.waehleAnlass('erbfall');
    const html = k.document.getElementById('content').innerHTML;
    const vorErstemDetails = html.split('<details class="situation-block"')[0];
    assert.match(vorErstemDetails, /Aus Ihren Bereichen/i);
  });

  test('genau fünf details-Blöcke stehen im erbfall-Blatt', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.waehleAnlass('erbfall');
    const html = k.document.getElementById('content').innerHTML;
    const treffer = html.match(/<details class="situation-block"/g) || [];
    assert.equal(treffer.length, 5);
  });

  test('ein klappbarer Block trägt einen Klartext-Status in seiner summary (analog feldgruppenStatusText)', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.waehleAnlass('erbfall');
    const html = k.document.getElementById('content').innerHTML;
    // Frisches Depot: „wo-die-originale-liegen" ist leer → derselbe Leer-Status-Text wie bei
    // den Statuskarten aus Gruppe B (feldgruppenStatusText liefert bei eingetragen===0
    // STRINGS.statuskarteLeer, unabhängig vom konkreten Wortlaut geprüft über die Klasse).
    assert.match(html, /<details class="situation-block"[^>]*>[\s\S]*?Wo die Originale liegen[\s\S]*?feldgruppen-karte-status[\s\S]*?<\/details>/);
  });

  test('todesfall-uebernahme bleibt vollständig unverändert (Lese-Leitfaden, kein details)', async () => {
    const k = ladeKern();
    await k.V.depotAnlegen('pw'); k.V.akteurSelbstErklaeren('Tester');
    k.V.waehleAnlass('todesfall-uebernahme');
    const html = k.document.getElementById('content').innerHTML;
    assert.doesNotMatch(html, /situation-block/, 'todesfall-uebernahme darf keine details-Blöcke bekommen');
  });
});
