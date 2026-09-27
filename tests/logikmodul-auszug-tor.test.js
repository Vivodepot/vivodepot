'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Das generische Auszugs-Tor — U2-ADR-326
   ────────────────────────────────────────────────────────────────────────────
   Vorher stand im Torwächter die Modul-KENNUNG 'erbschein-vorbereitung' als
   Zeichenkette. Der Kern konnte damit genau EINEN Auszug zeigen; ein zweiter
   hätte eine zweite hartkodierte Zeile gebraucht. Die Lese-App ging den
   generischen Weg (`logikModulAbschnitteHTML`) längst.

   DIE ZAHL IST UNBESTIMMT, nicht „drei". Die Produktentscheidung, 06.09.2026: „die Stelle,
   die Templates anzeigt, muss eine nicht definierte Anzahl anzeigen!" Eine Probe
   mit drei beweist nicht, dass es keine Grenze gibt — nur, dass sie über drei
   liegt. Darum zwanzig: eine Zahl, die beim Bauen niemand im Kopf hatte.

   VIER PROBEN, die je eine andere Art Fehler fangen:
     1. Byte-Gleichheit — das generische Tor gibt für den Erbschein-Auszug
        ZEICHENGLEICH aus, was der frühere, fest verdrahtete Renderer ausgab.
     2. Unbestimmte Anzahl UND bestimmte Reihenfolge — zwanzig Auszüge kommen
        alle zwanzig an, und dieselbe Menge in umgekehrter Einlass-Reihenfolge
        ergibt dieselbe Seite. Sonst sähe dieselbe Bürgerin nach einem erneuten
        Einlass etwas anderes, ohne dass sich etwas geändert hat.
     3. Der ABGEWIESENE Fall — ein Modul mit passendem `sektor`, das die Prüfung
        nicht besteht, rendert NICHTS. Bis U2-ADR-326 schützte die hartkodierte
        Kennung hier nebenbei mit; jetzt trägt allein `logikModulPruefen`.
     4. Der LEERE Fall — ohne Auszug rendert das Tor nichts: keine Hülle, keine
        Überschrift ohne Inhalt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Ein gültiger Auszug mit frei wählbarer Kennung — dieselbe Form, die
// `logikModulPruefen` beim echten Einlass verlangt.
function auszug(id, sektor) {
  return {
    modulTyp: 'logikModul', id: id, titel: 'Auszug ' + id, sektor: sektor || 'assets',
    moduleVersion: 1, herkunft: 'vivodepot',
    datenSchema: { wohnsituation: { typ: 'feld', sektor: 'assets', feld: 'livingSituation' } },
    abschnitte: [{ titel: 'T', bloecke: [{ typ: 'immer', texte: ['t'] }] }],
    dokAusgabe: {
      h1: 'H ' + id, unterschrift: false, unterschriftErsatzHinweis: 'Kein Antrag.',
      knopfAttr: id + '-dokument',
      karte: { klasse: 'probe-karte', hinweisKennung: 'erbscheinAuszugHint', knopfKennung: 'erbscheinAuszugKnopf' },
    },
  };
}

test('[U2-ADR-326] das generische Tor gibt für den Erbschein-Auszug zeichengleich aus, was der feste Renderer ausgab', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Auszugs-Tor-Bytegleich-2026!');
  const e = V.escapeHTML, S = V.STRINGS;
  const erwartet = '<div class="erbschein-auszug-karte">'
    + '<p class="sektion-hint">' + e(S.erbscheinAuszugHint) + '</p>'
    + '<button type="button" class="btn" data-erbschein-dokument>' + e(S.erbscheinAuszugKnopf) + '</button>'
    + ' <button type="button" class="btn btn-sek" data-erbschein-xml>' + e(S.erbscheinAuszugXmlKnopf) + '</button>'
    + '</div>';
  const ist = V.logikModulAuszugKartenHTML('advanceCare');
  assert.equal(ist, erwartet,
    'der Umbau auf das generische Tor darf am ausgelieferten Erbschein-Kärtchen kein Zeichen ändern');
});

test('[U2-ADR-326] zwanzig Auszüge kommen alle zwanzig an — und in bestimmter, einlass-unabhängiger Reihenfolge', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Auszugs-Tor-Zwanzig-2026!');
  const d = V.getData();
  // Zwanzig: eine Zahl, fuer die niemand entworfen haette. Zweistellige Kennungen, damit die
  // Sortierung nicht zufaellig mit der Einlass-Reihenfolge zusammenfaellt.
  const ids = [];
  for (let i = 1; i <= 20; i++) ids.push('probe-' + String(i).padStart(2, '0'));
  d.logikModule = (d.logikModule || []).concat(ids.map((id) => auszug(id)));
  const html = V.logikModulAuszugKartenHTML('assets');
  for (const id of ids) {
    assert.ok(html.indexOf('data-' + id + '-dokument') >= 0, 'Auszug ' + id + ' fehlt — das Tor hat eine Obergrenze');
  }
  assert.equal(html.split('probe-karte').length - 1, 20, 'genau zwanzig Kärtchen, keines doppelt, keines verschluckt');

  const { V: V2 } = ladeKern();
  await V2.depotAnlegen('Auszugs-Tor-Zwanzig-Umgekehrt-2026!');
  const d2 = V2.getData();
  d2.logikModule = (d2.logikModule || []).concat(ids.slice().reverse().map((id) => auszug(id)));
  assert.equal(V2.logikModulAuszugKartenHTML('assets'), html,
    'die Reihenfolge muss aus den Auszügen selbst folgen, nicht aus der Reihenfolge des Einlasses');
});

test('[U2-ADR-326] zwei Auszüge am SELBEN Anker: beide Kärtchen, keines gewinnt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Auszugs-Tor-Selber-Anker-2026!');
  const d = V.getData();
  d.logikModule = (d.logikModule || []).concat([auszug('anker-a'), auszug('anker-b')]);
  const html = V.logikModulAuszugKartenHTML('assets');
  assert.ok(html.indexOf('data-anker-a-dokument') >= 0 && html.indexOf('data-anker-b-dokument') >= 0,
    'zwei Templates an derselben Sektion sind der Normalfall, keine Kollision');
  assert.ok(html.indexOf('data-anker-a-dokument') < html.indexOf('data-anker-b-dokument'),
    'sortiert wird nach der Kennung');
});

test('[U2-ADR-326·Rot-Beweis] ein ABGEWIESENES Modul mit passendem Sektor rendert NICHTS', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Auszugs-Tor-Abgewiesen-2026!');
  const d = V.getData();
  const kaputt = auszug('abgewiesen-aber-sichtbar');
  delete kaputt.titel;                       // strukturell ungueltig — logikModulPruefen: grund 'titel'
  assert.equal(V.logikModulPruefen(kaputt).gueltig, false, 'Vorbedingung: die Verfälschung muss die Prüfung wirklich brechen');
  // NUR das kaputte Modul: das Produkt traegt den Beratungshilfe-Auszug als Template in seiner Ab-Werk-Saat
  // (U2-ADR-326/427), und der wuerde sonst mitrendern und die Aussage dieser Probe verdecken.
  V._abWerkLogikModule = [];
  d.logikModule = [kaputt];
  const html = V.logikModulAuszugKartenHTML('assets');
  assert.equal(html, '',
    'ein Modul, dessen Prüfung fehlschlug, darf keine Sektion rendern — auch nicht teilweise, auch nicht leer');
});

test('[U2-ADR-326·Rot-Beweis] der leere Fall rendert nichts — keine Hülle, keine Überschrift ohne Inhalt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Auszugs-Tor-Leer-2026!');
  const d = V.getData();
  V._abWerkLogikModule = [];   // ohne die Saat des Produkts (Beratungshilfe-Template)
  d.logikModule = [];
  assert.equal(V.logikModulAuszugKartenHTML('assets'), '');
  assert.equal(V.logikModulAuszugKartenHTML('advanceCare'), '');
});
