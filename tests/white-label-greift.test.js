'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   White Label greift — dauerhafter Wächter (Entscheidung 16.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Fährt tools/white-label-greift-messen.js gegen den echten Kern mit dem Stadtbank-Bündel
   aus tools/vorfuehrung/ (signiert mit dem öffentlichen Test-Sentinel über den Schnellweg des
   Issuers, eingelassen als Vor-Depot-Bündel). Rot, sobald „Vivodepot" außerhalb des
   Herkunftsorts in einer Ansicht, im PDF oder in einem Dateinamen erscheint — deutsch und
   englisch. Die bewusst bleibenden Stellen (Freigabe 3c) stehen im Werkzeug auf der
   benannten Liste BLEIBT_BEWUSST, jede mit Grund.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/white-label-greift-messen.js');

function roteBefunde(befund) {
  return befund.punkte.filter((p) => !p.ok).map((p) => p.id + ': ' + p.detail);
}

test('[White Label greift·de] Stadtbank-Bündel: Marke überall, Vivodepot nur am Herkunftsort', async () => {
  const befund = await W.messen(W.VORGABE, { sprache: 'de' });
  const rot = roteBefunde(befund);
  assert.deepEqual(rot, [], rot.join('\n'));
  assert.ok(befund.punkte.length >= 15, 'Vorbedingung: alle Messpunkte liefen (' + befund.punkte.length + ')');
});

test('[White Label greift·en] Stadtbank-Bündel: Marke überall, Vivodepot nur am Herkunftsort', async () => {
  const befund = await W.messen(W.VORGABE, { sprache: 'en' });
  const rot = roteBefunde(befund);
  assert.deepEqual(rot, [], rot.join('\n'));
  assert.ok(befund.punkte.length >= 16, 'Vorbedingung: alle Messpunkte liefen (' + befund.punkte.length + ')');
});

test('[White Label greift] die benannte Liste trägt je einen Grund, und jede Stelle trägt die Wortmarke noch', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  for (const [kennung, grund] of Object.entries(W.BLEIBT_BEWUSST)) {
    assert.ok(typeof grund === 'string' && grund.length > 20, 'ohne Grund: ' + kennung);
    const text = V.TEXTSATZ_DE_QUELLE.texte[kennung];
    assert.ok(typeof text === 'string' && /vivodepot/i.test(text),
      'veraltet: ' + kennung + ' trägt die Wortmarke nicht mehr — von der Liste nehmen');
  }
});

test('[Negativprobe] die Wortmarken-Diskriminante ordnet eine unbenannte Stelle als „außerhalb" ein', () => {
  const erfunden = 'strings:erfundeneStelleMitMarke.text';
  const e = W.wortmarkeEinordnen(['strings:herkunftPoweredBy.text', 'strings:shlUrlHinweis.text', erfunden]);
  assert.deepEqual(e.ausserhalb, [erfunden]);
  assert.deepEqual(W.wortmarkeEinordnen(['strings:herkunftPoweredBy.text']).ausserhalb, []);
});

test('[Rot-Beweis] ein Bündel ohne Markennamen reißt an — Name, PDF, Titel und Dateinamen werden rot', async () => {
  const ohneName = JSON.parse(fs.readFileSync(W.VORGABE, 'utf8'));
  delete ohneName.name; delete ohneName.kontakt;
  const pfad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wl-probe-')), 'ohne-name.json');
  fs.writeFileSync(pfad, JSON.stringify(ohneName));
  const befund = await W.messen(pfad, { sprache: 'de' });
  const rot = befund.punkte.filter((p) => !p.ok).map((p) => p.id);
  for (const id of ['name-willkommen', 'pdf', 'ansicht-titel', 'dateinamen']) {
    assert.ok(rot.includes(id), 'Wächter blind für ' + id + ' — rot war nur: ' + rot.join(', '));
  }
});

/* Proben-Deklaration (U2-ADR-099 B-2). */
module.exports = {
  PROBEN: [
    { fuer: '[White Label greift·de] Stadtbank-Bündel: Marke überall, Vivodepot nur am Herkunftsort', diskriminante: roteBefunde },
    { fuer: '[White Label greift·en] Stadtbank-Bündel: Marke überall, Vivodepot nur am Herkunftsort', diskriminante: roteBefunde },
  ],
};
