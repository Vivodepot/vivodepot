'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Die Engstelle des Versionstors (23.09.2026, Klassenschutz zu VERSIONSSCHRAEGE).

   Das Tor hält, solange jede Anker-Datei, die den Kern verlässt, durch `depotSerialisieren` geht — dort wirft es
   für eine Datei aus einer neueren Fassung. Dieser Wächter liest den Kern statisch und verlangt:
   - `depotSerialisierenV4` wird nur von `depotSerialisieren` gerufen, `depotSerialisierenV3` von niemandem;
   - jede weitere Stelle, die einen Umschlag verschlüsselt oder Bytes auf die Platte schreibt, steht mit Grund in
     der Liste unten. Ein neuer Aufrufer ist rot, bis jemand begründet, warum er das Tor nicht umgeht.
   - `depotSerialisieren` trägt die Tor-Prüfung selbst.

   Rot-Beweis: ein gepflanzter zweiter Aufrufer von `depotSerialisierenV4` wird gefunden (unten).
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function ohneKommentare(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
}
// Je Funktion auf oberster Ebene der Rumpf bis zur nächsten Funktion.
function funktionen(src) {
  const text = ohneKommentare(src);
  const re = /^(async )?function ([A-Za-z_$][\w$]*)\s*\(/gm;
  const liste = []; let m;
  while ((m = re.exec(text))) liste.push({ name: m[2], start: m.index });
  return liste.map((f, i) => ({ name: f.name, rumpf: text.slice(f.start, i + 1 < liste.length ? liste[i + 1].start : text.length) }));
}
function aufrufer(src, muster, ohneSelbst) {
  return funktionen(src).filter((f) => muster.test(f.rumpf) && f.name !== ohneSelbst).map((f) => f.name).sort();
}

// Jede Stelle, die außer der Engstelle einen Umschlag verschlüsselt oder Bytes schreibt, mit Grund.
const ERLAUBT = {
  zerfallSchreiben: {
    _depotV4Schreiben: 'der eine Speicherweg für jedes Depot (U2-ADR-002: ein Mechanismus für alle Depots); wer ihn ruft, steht unter depotV4Schreiben',
    empfaengerDateiErzeugen: 'eine eigene Empfänger-Datei, nicht die Depot-Datei',
    subDepotEigenerPasswortWechsel: 'GESPERRT für neuere Subs: Passwortwechsel',
  },
  // Seit 23.09.2026 (U2-ADR-002) schreiben Anker und Sub über EINEN Weg; die Aufrufer standen vorher unter zerfallSchreiben.
  depotV4Schreiben: {
    depotSerialisierenV4: 'die Engstelle selbst (über depotSerialisieren)',
    subDepotEntsiegeln: 'GESPERRT für neuere Subs: NFC-Neuversiegeln nach NFD-Rückfall',
    subDepotNeuVersiegeln: 'trägt das Tor für neuere Subs selbst (gibt den alten Umschlag zurück)',
    subDepotVersiegeln: 'versiegelt einen übergebenen Inhalt (Anlegen eines Subs), nicht die geöffnete Datei',
  },
  encryptDepot: {
    depotSerialisierenV3: 'Altformat, im Kern ohne Aufrufer (s. eigene Probe)',
    _zerfallSchreiben: 'die Verschlüsselung unter der Engstelle',
    subDepotEigenerPasswortWechsel: 'GESPERRT für neuere Subs, s. o.',
    empfaengerkreisFachEinrichten: 'Schlüssel eines Empfänger-Fachs; erreicht die Platte nur über depotSerialisieren',
  },
  createWritable: {
    _depotBlobSpeichern: 'schreibt die Bytes, die ihm depotSerialisieren geliefert hat',
  },
};

test('[Versionstor·Engstelle] depotSerialisierenV4 hat genau einen Aufrufer: depotSerialisieren; V3 keinen', () => {
  assert.deepEqual(aufrufer(KERN, /\bdepotSerialisierenV4\(/, 'depotSerialisierenV4'), ['depotSerialisieren']);
  assert.deepEqual(aufrufer(KERN, /\bdepotSerialisierenV3\(/, 'depotSerialisierenV3'), []);
});

test('[Versionstor·Engstelle] depotSerialisieren trägt die Tor-Prüfung', () => {
  const f = funktionen(KERN).find((x) => x.name === 'depotSerialisieren');
  assert.ok(f && /_ankerNeuereFassung\s*!=\s*null\)\s*_schreibenErlaubtPruefen\(\)/.test(f.rumpf), 'depotSerialisieren prüft das Tor nicht');
});

test('[Versionstor·Engstelle] jede weitere Umschlag- oder Byte-Stelle steht mit Grund in der Liste', () => {
  const ist = {
    zerfallSchreiben: aufrufer(KERN, /\b_zerfallSchreiben\(/, '_zerfallSchreiben'),
    depotV4Schreiben: aufrufer(KERN, /\b_depotV4Schreiben\(/, '_depotV4Schreiben'),
    encryptDepot: aufrufer(KERN, /VdCrypto\.encryptDepot\(/),
    createWritable: aufrufer(KERN, /\.createWritable\(/),
  };
  for (const [art, liste] of Object.entries(ist)) {
    const unbenannt = liste.filter((n) => !Object.prototype.hasOwnProperty.call(ERLAUBT[art], n));
    assert.deepEqual(unbenannt, [], art + ': neue Stelle ohne Grund — umgeht sie das Versionstor? ' + unbenannt.join(', '));
    const tot = Object.keys(ERLAUBT[art]).filter((n) => !liste.includes(n));
    assert.deepEqual(tot, [], art + ': Listeneintrag ohne Stelle im Kern — streichen: ' + tot.join(', '));
  }
});

test('[Versionstor·Engstelle] die zwei Plattenwege (Datei, interner Speicher) holen ihre Bytes aus depotSerialisieren', () => {
  assert.deepEqual(aufrufer(KERN, /\b_depotBlobSpeichern\(/, '_depotBlobSpeichern'), ['depotHerunterladen'],
    'nur depotHerunterladen darf Bytes in eine Datei schreiben lassen');
  for (const name of ['depotHerunterladen', 'depotInIdbSichern']) {
    const f = funktionen(KERN).find((x) => x.name === name);
    assert.ok(f && /\bdepotSerialisieren\(/.test(f.rumpf), name + ' holt seine Bytes nicht aus depotSerialisieren');
  }
});

/* Ein älterer Kern verschlüsselte ein neueres Sub in SEINEM Umschlagformat neu und verlöre, was die neuere Fassung im
   Umschlag trägt. Darum schreiben die gesperrten Sub-Wege für ein neueres Sub keine neuen Bytes: sie prüfen die Fassung,
   bevor sie verschlüsseln. */
const GESPERRT_VOR_DEM_VERSCHLUESSELN = ['subDepotEntsiegeln', 'subDepotEigenerPasswortWechsel'];
test('[Versionstor·Engstelle] die gesperrten Sub-Wege prüfen die Fassung, bevor sie neu verschlüsseln', () => {
  for (const name of GESPERRT_VOR_DEM_VERSCHLUESSELN) {
    const f = funktionen(KERN).find((x) => x.name === name);
    const pruefung = f.rumpf.search(/_istNeuereFassung\(/);
    const verschluesseln = f.rumpf.search(/\b_zerfallSchreiben\(|\b_depotV4Schreiben\(|VdCrypto\.encryptDepot\(/);
    assert.ok(pruefung >= 0 && pruefung < verschluesseln, name + ' verschlüsselt, ohne vorher die Fassung zu prüfen');
  }
  const neu = funktionen(KERN).find((x) => x.name === 'subDepotNeuVersiegeln');
  assert.ok(/_subNeuereFassung\.has\(/.test(neu.rumpf), 'subDepotNeuVersiegeln prüft das Tor nicht');
});

test('[Versionstor·Engstelle·Rot-Beweis] ein zweiter Aufrufer von depotSerialisierenV4 wird gefunden', () => {
  const gepflanzt = KERN + '\nasync function heimlichSichern() { return depotSerialisierenV4(); }\n';
  assert.deepEqual(aufrufer(gepflanzt, /\bdepotSerialisierenV4\(/, 'depotSerialisierenV4'), ['depotSerialisieren', 'heimlichSichern']);
});
