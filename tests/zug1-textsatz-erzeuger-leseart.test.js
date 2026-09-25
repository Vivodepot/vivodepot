'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Zug 1 — der Kennungsraum der Lese-App sieht auch gesäte Bereiche
   (Kampagne „eine Leseart statt dreiundvierzig", Auftrag, 09.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   `tools/build-textsatz-eingebaut-lesen.js` erzeugt die Tabelle, über die die Lese-App
   Sektor-, Sektions- und Feld-Beschriftungen als „übersetzbar" kennt. Sie las `V.SEKTOREN`
   — die BÜNDEL-Liste.

   WAS DAS BEDEUTET, sobald ein Bereich ab Werk gesät wird: er steht nicht im Bündel, also
   fehlen seine Kennungen in dieser Tabelle, also kann die Lese-App seine Rubriken nicht
   übersetzen. Ein englisches Sprachmodul zeigte für diesen einen Bereich weiter Deutsch —
   still, ohne Fehler, ohne rote Probe.

   DIESE DATEI IST DIE ERSTE VON EINEM ZUG, DER EINE DATEI HAT. Zug 1 war ursprünglich für
   ZWEI hook-verdrahtete Werkzeuge geschnitten; die zweite
   (`build-dok-textsatz-eingebaut-lesen.js`) nennt `V.SEKTOREN` nur in einem Kommentar. Die
   Zahl im Zuschnitt-Bericht stammte aus einem grep, und ein grep unterscheidet Code nicht
   von Prosa — derselbe Fehler, gegen den der Wächter aus Zug 4 gebaut ist, eine Ebene höher.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const ERZEUGER = path.join(REPO, 'tools', 'build-textsatz-eingebaut-lesen.js');

/* Derselbe Fixture-Bereich wie in Zug 0 — gesät über die Ab-Werk-Region, nur in einer
   mutierten Quelle. Nichts davon geht ins Produkt. */
const FIXTURE = '[{"modulTyp":"bereich","moduleVersion":1,"herkunft":"probe-anbieter",'
  + '"sprache":"de","kennung":"probe-anbieter/zug1","fassung":1,"bereiche":'
  + '{"zug1-probebereich":{"label":"Zug-1-Probebereich","icon":"folder","sektionen":'
  + '[{"id":"zs","label":"Probe-Sektion","felder":'
  + '[{"id":"zug1_a","label":"Probe-Feld","typ":"text"}]}]}}}]';
const LEERE_REGION = 'const AB_WERK_BEREICH_QUELLEN = Object.freeze([]);';

/* Fährt `kennungenAusKern()` gegen einen Kern mit gesätem Bereich. Der Erzeuger lädt
   `load-kern.js` selbst per require — beide Module müssen aus dem Cache, sonst misst der
   Lauf den vorigen Kern und die Probe wäre still grün. */
function kennungenMitGesaetemBereich() {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  assert.ok(quelle.includes(LEERE_REGION),
    'ANKER VERFEHLT: die leere AB_WERK_BEREICH_QUELLEN-Zeile steht nicht mehr so da — die '
    + 'Probe sät dann nichts und wäre grün, ohne etwas gemessen zu haben.');
  const datei = path.join(os.tmpdir(), 'zug1-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(datei, quelle.replace(LEERE_REGION,
    "const AB_WERK_BEREICH_QUELLEN = Object.freeze(JSON.parse('" + FIXTURE + "'));"), 'utf8');

  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = datei;
  const module = [path.join(REPO, 'tests', 'load-kern.js'), ERZEUGER];
  for (const m of module) delete require.cache[require.resolve(m)];
  try {
    return require(ERZEUGER).kennungenAusKern();
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    for (const m of module) delete require.cache[require.resolve(m)];
    fs.rmSync(datei, { force: true });
  }
}

/* Fährt `kennungenAusKern()` gegen das echte, KONFEKTIONIERTE Produkt (privat-de) — kein
   gesäter Bereich, kein `KERN_HTML_PATH`-Umweg. Seit dem Schnitt (18.09.2026) trägt das
   nackte Gerüst keine der dreizehn eingebauten Bereiche mehr inline; `ladeKern()` OHNE
   `{blank:true}` UND ohne `KERN_HTML_PATH` bäckt sie aus `tools/bereich-templates` ein
   (`tests/load-kern.js`, `_standardProduktBaken`). `kennungenMitGesaetemBereich()` oben setzt
   `KERN_HTML_PATH` auf eine mutierte Rohdatei — genau das schaltet das Backen ab (dieselbe
   Bedingung wie dort: `!opts.blank && !process.env.KERN_HTML_PATH`) und ist darum für DIESE
   Positivkontrolle (die nichts Gesätes prüft, nur „bleiben die eingebauten Bereiche drin")
   der falsche Weg — sie fragte nach dem Backen, während das Backen absichtlich übersprungen
   wurde. ISO/Leseart-Nachtrag (19.09.2026): auf das konfektionierte Produkt
   umgestellt, keine Zahl nachgezogen. */
function kennungenAusEchtemProdukt() {
  delete process.env.KERN_HTML_PATH;
  for (const m of [path.join(REPO, 'tests', 'load-kern.js'), ERZEUGER]) delete require.cache[require.resolve(m)];
  return require(ERZEUGER).kennungenAusKern();
}

describe('[Zug 1] der Kennungsraum der Lese-App kennt auch ab Werk gesäte Bereiche', () => {
  test('ein gesäter Bereich bringt Sektor-, Sektions- und Feld-Kennung mit', () => {
    const k = kennungenMitGesaetemBereich();
    assert.equal(k['zug1-probebereich.label'], 'Zug-1-Probebereich',
      'ROT ERWARTET, solange der Erzeuger V.SEKTOREN liest: der gesäte Bereich steht nicht im '
      + 'Bündel, also fehlt seine Rubrik im Kennungsraum — die Lese-App kann sie nicht '
      + 'übersetzen und zeigt für diesen einen Bereich weiter Deutsch.');
    assert.equal(k['zug1-probebereich#zs.label'], 'Probe-Sektion',
      'auch die Sektions-Beschriftung gehört dazu');
    const feldKennung = Object.keys(k).find((x) => x.includes('zug1_a'));
    assert.ok(feldKennung, 'und die Feld-Kennung: ' + Object.keys(k).filter((x) => x.startsWith('zug1')).join(' '));
    assert.equal(k[feldKennung], 'Probe-Feld');
  });

  test('[Positivkontrolle] die eingebauten Bereiche bleiben vollständig drin', () => {
    /* Ohne sie wäre die Probe darüber auch dann grün, wenn der Erzeuger NUR noch die
       Registry läse und das Bündel verlöre — ein neuer, schlimmerer Fehler. Gegen das echte
       konfektionierte Produkt (kein gesäter Bereich hier — das prüft die Probe oben bereits). */
    const k = kennungenAusEchtemProdukt();
    for (const id of ['identity', 'housing', 'personal']) {
      assert.equal(typeof k[id + '.label'], 'string',
        id + ' fehlt im Kennungsraum — der Erzeuger darf das Bündel nicht verlieren');
    }
    assert.ok(Object.keys(k).length > 300,
      'der Kennungsraum ist unplausibel klein (' + Object.keys(k).length + ') — die Messung '
      + 'misst dann nicht den echten Bestand');
  });

  test('der Erzeuger liest nicht mehr an lib/sektoren.js vorbei die Bündel-Liste', () => {
    const { liestImCode } = require('../tools/eine-leseart-pruefen.js');
    assert.deepEqual(liestImCode(fs.readFileSync(ERZEUGER, 'utf8')), [],
      'ROT ERWARTET, solange die Leseart nicht gezogen ist. V.SEKTOREN ist die Bündel-Liste; '
      + '`bereicheAlle()` führt Bündel und Registry zusammen.');
  });

  test('und er steht nicht mehr in der Ausnahmeliste des Wächters', () => {
    /* Die Liste ist zum Schrumpfen da. Ein gezogenes Werkzeug, das drin bleibt, ist ein
       Phantom-Eintrag — der Wächter meldete es als „veraltet", und die Liste zeigte den
       Stand der Kampagne nicht mehr. */
    const { AUSNAHMEN } = require('../tools/eine-leseart-pruefen.js');
    assert.equal(AUSNAHMEN['build-textsatz-eingebaut-lesen.js'], undefined,
      'ROT ERWARTET nach dem Ziehen: der Eintrag gehört aus der Liste');
  });
});
