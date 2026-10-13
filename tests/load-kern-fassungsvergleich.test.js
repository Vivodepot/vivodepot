'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Node-Harnisch sagt, wenn Adapter und Kern nicht aus demselben Stand stammen (11.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   `tests/load-kern.js` nennt in seiner Ausgabeliste Namen des Kerns, neben dem es liegt. Lädt es eine ANDERE Datei
   (`opts.htmlPfad` oder die Umlenkung über die Umgebung), kann die eine andere Fassung tragen. Gemessen am 11.10.2026:
   die Proben eines Quellstands luden einen Kern einer anderen Fassung und fielen mit `<name> is not defined` — an einem
   Namen, nicht an der Ursache.

   WAS HIER BEWACHT WIRD: scheitert das Auswerten einer fremden Datei, deren Fassungsstempel abweicht, steht in EINEM
   Satz vor der ursprünglichen Meldung, welche Fassung der Adapter und welche die Datei trägt. Der Fehler bleibt derselbe
   (Typ, Ursache). Verglichen wird nur der Stempel: eine abgewandelte Kopie DERSELBEN Fassung lädt und scheitert wie
   bisher, und eine andere Fassung, die fehlerfrei lädt, lädt ohne Meldung und ohne Abbruch.

   ROT-BEWEIS: dieselbe Kopie mit demselben fehlenden Namen, einmal mit fremdem und einmal mit eigenem Stempel — nur die
   erste trägt den Satz. Ohne den Vergleich wären beide Meldungen gleich.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, fassungsAbweichung, fassungsStempelAus } = require('./load-kern.js');

const EIGENER_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const EIGENER_TEXT = fs.readFileSync(EIGENER_PFAD, 'utf8');
const EIGENE_FASSUNG = fassungsStempelAus(EIGENER_TEXT);
const STEMPEL_ZEILE = /const SCHALEN_STAND = '(v\d+)';/;
// Eine Fassung, die es nie gab und die nie die eigene sein kann.
const FREMDE_FASSUNG = 'v1';
const FEHLENDER_NAME = 'nameDenDieserKernNichtKennt_fassungsprobe';

/* Eine Kopie des eigenen Kerns im Wegwerf-Verzeichnis: mit dem angegebenen Stempel, und auf Wunsch mit einem Namen, den es
   nicht gibt, gleich hinter dem Stempel (dieselbe Zeile, die Zeilenzahl bleibt). */
function mitKopie({ stempel, kaputt }, lauf) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'load-kern-fassung-'));
  try {
    const neu = "const SCHALEN_STAND = '" + stempel + "';" + (kaputt ? ' ' + FEHLENDER_NAME + ';' : '');
    const text = EIGENER_TEXT.replace(STEMPEL_ZEILE, neu);
    assert.ok(text.includes(neu), 'Vorbedingung: die Stempelzeile wurde ersetzt');
    const pfad = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(pfad, text);
    return lauf(pfad);
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}
const fehlerVon = (pfad) => { try { ladeKern({ htmlPfad: pfad }); return null; } catch (e) { return e; } };

test('[Fassungsvergleich] Vorbedingung: der eigene Kern trägt genau eine Stempelzeile, und sie ist nicht die erfundene fremde Fassung', () => {
  assert.match(String(EIGENE_FASSUNG), /^v\d+$/);
  assert.notEqual(EIGENE_FASSUNG, FREMDE_FASSUNG);
  assert.equal(EIGENER_TEXT.split("const SCHALEN_STAND = '").length - 1, 1);
});

test('[Fassungsvergleich] fremde Datei anderer Fassung, an der das Auswerten scheitert → EIN Satz nennt beide Fassungen, davor steht nichts, dahinter die Ursache', () => {
  mitKopie({ stempel: FREMDE_FASSUNG, kaputt: true }, (pfad) => {
    const e = fehlerVon(pfad);
    assert.ok(e, 'das Auswerten scheitert am fehlenden Namen');
    assert.ok(e instanceof ReferenceError, 'der Fehler bleibt derselbe: ' + (e && e.name));
    assert.ok(e.message.startsWith('Der Testadapter gehört zur Fassung ' + EIGENE_FASSUNG + ', die geladene Datei ' + pfad + ' trägt die Fassung ' + FREMDE_FASSUNG + ' — '), e.message);
    assert.match(e.message, new RegExp(' Ursache: .*' + FEHLENDER_NAME + ' is not defined'));
    assert.equal(e.message.split('Der Testadapter gehört zur Fassung').length - 1, 1, 'genau ein Satz, nicht je Schicht einer');
  });
});

test('[Fassungsvergleich·Rot-Beweis] dieselbe kaputte Kopie mit dem EIGENEN Stempel scheitert wie bisher, ohne den Satz — es zählt der Stempel, nicht der fremde Pfad und nicht die Bytes', () => {
  mitKopie({ stempel: EIGENE_FASSUNG, kaputt: true }, (pfad) => {
    const e = fehlerVon(pfad);
    assert.ok(e instanceof ReferenceError);
    assert.doesNotMatch(e.message, /Der Testadapter gehört zur Fassung/);
    assert.match(e.message, new RegExp('^' + FEHLENDER_NAME + ' is not defined'));
  });
});

test('[Fassungsvergleich] kein Abbruch bei bloßer Ungleichheit: eine andere Fassung, die fehlerfrei lädt, lädt; eine abgewandelte Kopie derselben Fassung ebenso', () => {
  mitKopie({ stempel: FREMDE_FASSUNG, kaputt: false }, (pfad) => {
    const k = ladeKern({ htmlPfad: pfad });
    assert.equal(k.V.SCHALEN_STAND, FREMDE_FASSUNG, 'geladen ist die fremde Datei');
  });
  mitKopie({ stempel: EIGENE_FASSUNG, kaputt: false }, (pfad) => {
    fs.appendFileSync(pfad, '\n<!-- abgewandelte Kopie derselben Fassung -->\n');
    const k = ladeKern({ htmlPfad: pfad });
    assert.equal(k.V.SCHALEN_STAND, EIGENE_FASSUNG);
  });
});

test('[Fassungsvergleich] der Satz allein: null für die eigene Datei und für dieselbe Fassung; eine Datei ohne Stempel wird so benannt', () => {
  assert.equal(fassungsAbweichung(EIGENER_PFAD, 'gleichgültig'), null, 'die eigene Datei ist nie fremd');
  assert.equal(fassungsAbweichung('/anderswo/vivodepot.html', "const SCHALEN_STAND = 'v7';", "const SCHALEN_STAND = 'v7';"), null);
  assert.equal(fassungsAbweichung('/anderswo/vivodepot.html', "const SCHALEN_STAND = 'v8';", "const SCHALEN_STAND = 'v7';"),
    'Der Testadapter gehört zur Fassung v7, die geladene Datei /anderswo/vivodepot.html trägt die Fassung v8 — Adapter und Kern stammen nicht aus demselben Stand.');
  assert.match(fassungsAbweichung('/anderswo/alt.html', '<html></html>', "const SCHALEN_STAND = 'v7';"), /trägt keinen Fassungsstempel/);
  // Trägt der eigene Kern keinen Stempel, gibt es nichts zu vergleichen: kein Satz, der Fehler geht unverändert weiter.
  assert.equal(fassungsAbweichung('/anderswo/vivodepot.html', "const SCHALEN_STAND = 'v8';", '<html></html>'), null);
});
