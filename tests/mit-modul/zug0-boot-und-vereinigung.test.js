'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Zug 0 — die Unterscheidbarkeit herstellen (Auftrag, 09.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   VORBEDINGUNG FÜR „EINE LESEART STATT DREIUNDVIERZIG". Zweiundvierzig Werkzeuge in
   `tools/` lesen `V.SEKTOREN` statt `bereicheAlle()`. Solange beide dasselbe liefern, ist
   jede Umstellung folgenlos und damit UNBEWEISBAR — man könnte sie schreiben, ohne dass
   irgendetwas den Unterschied zeigte.

   GEMESSEN (09.09.2026), drei Stände:

       Kanon, nichts gesät                    V.SEKTOREN 13   bereicheAlle() 13   gleich
       + gesäter Bereich, KEIN Boot-Aufruf    V.SEKTOREN 13   bereicheAlle() 13   gleich
       + gesäter Bereich UND Boot-Aufruf      V.SEKTOREN 13   bereicheAlle() 14   VERSCHIEDEN

   Die zweite Zeile ist die überraschende: ein gesäter Bereich allein genügt NICHT. Ohne den
   Boot-Aufrufer läuft die Ab-Werk-Saat erst zur Depot-Zeit; beim Booten ist die Registry
   leer und `bereicheAlle()` gibt schlicht `SEKTOREN` zurück.

   Der Boot-Aufrufer ist damit die Schnittkante — nicht ein migrierter Bereich. Und er ist
   gefahrlos vorzuziehen: im nativen Gerüst sind beide Ab-Werk-Quellen leer, der Aufruf ist
   folgenlos. Er stellt nur her, dass der Unterschied überhaupt sichtbar WERDEN kann.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('../load-kern.js');

const REPO = path.join(__dirname, '..', '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');

/* Ein Fixture-Bereich, gesät über AB_WERK_BEREICH_QUELLEN. Er lebt NUR in einer mutierten
   Quelle über KERN_HTML_PATH — nichts davon geht ins Produkt. */
const FIXTURE = '[{"modulTyp":"bereich","moduleVersion":1,"herkunft":"probe-anbieter",'
  + '"sprache":"de","kennung":"probe-anbieter/zug0","fassung":1,"bereiche":'
  + '{"zug0-probebereich":{"label":"Zug-0-Probebereich","icon":"folder","sektionen":'
  + '[{"id":"zs","label":"S","felder":[{"id":"zug0_a","label":"A","typ":"text"}]}]}}}]';

const LEERE_REGION = 'const AB_WERK_BEREICH_QUELLEN = Object.freeze([]);';

function mitFixture(quelltext) {
  assert.ok(quelltext.includes(LEERE_REGION),
    'ANKER VERFEHLT: die leere AB_WERK_BEREICH_QUELLEN-Zeile steht nicht mehr so da. Ohne '
    + 'sie sät die Probe nichts und wäre still grün.');
  return quelltext.replace(LEERE_REGION,
    "const AB_WERK_BEREICH_QUELLEN = Object.freeze(JSON.parse('" + FIXTURE + "'));");
}

function ladeKernAusText(quelltext) {
  const datei = path.join(os.tmpdir(),
    'zug0-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(datei, quelltext, 'utf8');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = datei;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  try {
    return require(path.join(REPO, 'tests', 'load-kern.js')).ladeKern();
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
    fs.rmSync(datei, { force: true });
  }
}

const quelle = () => fs.readFileSync(KERN_PFAD, 'utf8');
const BOOT_AUFRUF = '_bereichsModuleAusDepotAnmelden(null);';

/* ── 1 · Der Boot-Aufrufer ─────────────────────────────────────────────────── */

describe('[Zug 0·Boot] die Ab-Werk-Saat läuft beim Booten, nicht erst zur Depot-Zeit', () => {
  test('nativ ändert der Boot-Aufruf nichts — beide Quellen sind leer', () => {
    /* Die Probe, die den Zug gefahrlos macht: solange nichts gesät ist, ist der Aufruf
       folgenlos. Wäre er es nicht, verschöbe Zug 0 stillschweigend Produktverhalten. */
    const { V } = ladeKern();
    assert.equal(V.bereicheAlle().length, 13);
    assert.deepEqual(V.bereicheAlle().map((b) => b.id), [...V.BEREICH_IDS_EINGEBAUT]);
  });

  test('ein gesäter Bereich ist VOR dem ersten Depot da', () => {
    const { V } = ladeKernAusText(mitFixture(quelle()));
    const ids = V.bereicheAlle().map((b) => b.id);
    assert.ok(ids.includes('zug0-probebereich'),
      'ROT ERWARTET ohne Boot-Aufrufer: die Saat läuft erst zur Depot-Zeit, also fehlt der '
      + 'gesäte Bereich, bevor die Bürgerin ein Depot geöffnet hat. Gefunden: ' + ids.join(' '));
    /* KEINE FESTEN ZAHLEN MEHR (Stufe 2, 09.09.2026). Diese Proben standen auf „13 und 14" —
       dreizehn im Bündel, vierzehn mit dem Fixture-Bereich. Seit `wohnen` aus dem Bündel in
       `BEREICH_QUELLEN_EINGEBAUT` gezogen ist, sind es zwölf und vierzehn, und beim nächsten
       migrierten Bereich elf und vierzehn.

       Die Aussage der Probe hing nie an den Zahlen, sondern an der BEZIEHUNG: die Bündel-Liste
       führt WENIGER als `bereicheAlle()`, und die Differenz ist genau das, was gesät wurde.
       So gemessen überlebt sie jede weitere Migration — eine feste Zahl hätte bei jedem
       Bereich neu angepasst werden müssen, und wer sie anpasst, prüft nicht, ob sie noch
       dasselbe bedeutet. */
    /* NACH DEM SCHNITT (19.09.2026): ein Bereich, den das Produkt selbst einbäckt
       (AB_WERK_BEREICH_QUELLEN), ist Teil ihres Gerüsts — er steht auch in V.SEKTOREN. Die
       Beziehung „Registry führt MEHR als SEKTOREN" gilt nur noch für das, was NICHT eingebacken
       ist (Mitschrift, Vor-Depot-Modul; s. Unterscheidbarkeit unten). Hier zählt: er ist da. */
    assert.ok(ids.length >= V.SEKTOREN.length,
      'bereicheAlle() darf nie weniger führen als SEKTOREN: ' + ids.length + ' gegen ' + V.SEKTOREN.length);
  });

  test('[Rot-Beweis] ohne den Boot-Aufrufer fehlt er — die Probe hängt wirklich an ihm', () => {
    const text = quelle();
    assert.ok(text.includes(BOOT_AUFRUF),
      'ANKER VERFEHLT: der Boot-Aufrufer heißt nicht mehr so — die Probe hätte nichts '
      + 'entfernt und wäre still grün.');
    const ohne = mitFixture(text).replace(BOOT_AUFRUF, '/* für den Rot-Beweis entfernt */');
    const { V } = ladeKernAusText(ohne);
    const ids = V.bereicheAlle().map((b) => b.id);
    assert.ok(!ids.includes('zug0-probebereich'),
      'ROT ERWARTET: ohne den Aufruf darf der gesäte Bereich vor dem ersten Depot NICHT da '
      + 'sein — sonst misst die Probe darüber nicht die Boot-Reihenfolge');
    assert.equal(ids.length, V.SEKTOREN.length,
      'ohne Boot-Aufrufer bleibt nur die Bündel-Liste übrig: '
      + ids.length + ' gegen ' + V.SEKTOREN.length);
  });
});

/* ── 2 · Die Unterscheidbarkeit — Vorbedingung für Zug 1 bis 3 ─────────────── */

describe('[Zug 0·Unterscheidbarkeit] V.SEKTOREN und bereicheAlle() fallen auseinander', () => {
  test('mit gesätem Bereich liefern sie VERSCHIEDENES — sonst ist die Umstellung unbeweisbar', () => {
    /* DIE PROBE, DIE DEN GANZEN FOLGEZUG TRÄGT. Zweiundvierzig Werkzeuge lesen `V.SEKTOREN`;
       neun davon sind durch eine Probe gedeckt, dreiunddreißig NICHT — sie gingen still auf
       zwölf. Ohne diese Unterscheidbarkeit könnte man alle zweiundvierzig umstellen und
       nichts hätte den Unterschied gezeigt, in keine Richtung. */
    const { V } = ladeKernAusText(mitFixture(quelle()));
    /* KEINE FESTEN ZAHLEN MEHR (Stufe 2, 09.09.2026). Diese Proben standen auf „13 und 14" —
       dreizehn im Bündel, vierzehn mit dem Fixture-Bereich. Seit `wohnen` aus dem Bündel in
       `BEREICH_QUELLEN_EINGEBAUT` gezogen ist, sind es zwölf und vierzehn, und beim nächsten
       migrierten Bereich elf und vierzehn.

       Die Aussage der Probe hing nie an den Zahlen, sondern an der BEZIEHUNG: die Bündel-Liste
       führt WENIGER als `bereicheAlle()`, und die Differenz ist genau das, was gesät wurde.
       So gemessen überlebt sie jede weitere Migration — eine feste Zahl hätte bei jedem
       Bereich neu angepasst werden müssen, und wer sie anpasst, prüft nicht, ob sie noch
       dasselbe bedeutet. */
    /* NACH DEM SCHNITT (19.09.2026): ein eingebackener Bereich steht in BEIDEN Lesearten
       (gemessen: SEKTOREN = bereicheAlle = [zug0-probebereich]) — das war das Ziel der Umstellung.
       Unterscheidbar bleibt, was das Produkt NICHT einbäckt: der Bereich einer fremden Datei, aus
       der Mitschrift gesät. Er steht in der Registry, nie in SEKTOREN — daran hängt die Probe. */
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [{
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fremd-produkt', sprache: 'de',
      kennung: 'fremd-produkt/mitgebracht', fassung: 1,
      bereiche: { 'fremd-mitgebracht': { label: 'Aus der Datei', icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'f_a', label: 'A', typ: 'text' }] }] } },
    }] };
    const saat = V._bereichModulAbWerkSeed(d).map((b) => b.id);
    assert.ok(saat.includes('fremd-mitgebracht'), 'die Mitschrift wird gesät');
    assert.ok(!V.SEKTOREN.some((b) => b.id === 'fremd-mitgebracht'),
      'ROT ERWARTET, wenn SEKTOREN die Mitschrift schluckt: dann sind die beiden Lesearten wieder '
      + 'nicht unterscheidbar und jede Umstellung von V.SEKTOREN auf bereicheAlle() folgenlos.');
  });

  test('lib/sektoren.js liest bereits die vollständige Menge', () => {
    /* Die eine Bibliothek, die schon gezogen ist. Sie ist NICHT der Sammelpunkt für die
       übrigen einundvierzig: neunundzwanzig von ihnen brauchen die vollen Sektor-Objekte
       (sektionen/felder), die sie gar nicht herausgibt. */
    const vorher = process.env.KERN_HTML_PATH;
    const datei = path.join(os.tmpdir(), 'zug0-lib-' + process.pid + '.html');
    fs.writeFileSync(datei, mitFixture(quelle()), 'utf8');
    process.env.KERN_HTML_PATH = datei;
    for (const m of ['../load-kern.js', '../../tools/lib/sektoren.js']) {
      delete require.cache[require.resolve(m)];
    }
    try {
      const { echteSektorenListe } = require('../../tools/lib/sektoren.js');
      assert.ok(echteSektorenListe().includes('zug0-probebereich'),
        'ROT ERWARTET, wenn lib/sektoren.js wieder V.SEKTOREN läse: die siebzehn Aufrufer '
        + 'dieser Bibliothek bekämen still einen Bereich weniger');
    } finally {
      if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
      for (const m of ['../load-kern.js', '../../tools/lib/sektoren.js']) {
        delete require.cache[require.resolve(m)];
      }
      fs.rmSync(datei, { force: true });
    }
  });
});

/* ── 3 · Vereinigung statt Rückfall ────────────────────────────────────────── */

describe('[Zug 0·Vereinigung] die Datei bringt alles mit, auch wenn das Produkt selbst etwas trägt', () => {
  const MITSCHRIFT_FREMD = {
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fremd-produkt', sprache: 'de',
    kennung: 'fremd-produkt/mitgebracht', fassung: 1,
    bereiche: { 'fremd-mitgebracht': { label: 'Aus der Datei', icon: 'folder',
      sektionen: [{ id: 's', label: 'S', felder: [{ id: 'f_a', label: 'A', typ: 'text' }] }] } },
  };

  test('gefüllte Produkt-Quelle macht die Mitschrift NICHT unerreichbar', () => {
    /* DER BUG, DEN DIESER ZUG BEHEBT, und er ist heute schon da — nicht erst mit einem
       migrierten Bereich. `_bereichModulAbWerkSeed` las die Mitschrift NUR, wenn
       AB_WERK_BEREICH_QUELLEN leer war. Das sah wie eine Rangfolge aus und war keine: es
       funktionierte ausschliesslich, solange die Konstante leer WAR. Ein Pro-Produkt, das
       seine Bereiche ab Werk mitbringt, kann die Mitschrift einer FREMDEN Datei damit gar
       nicht lesen — genau die Zusicherung aus U2-ADR-398, und sie greift ausgerechnet für
       die Produkte nicht, für die sie gedacht war. */
    const { V } = ladeKernAusText(mitFixture(quelle()));
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [MITSCHRIFT_FREMD] };
    const ids = V._bereichModulAbWerkSeed(d).map((b) => b.id);
    assert.ok(ids.includes('zug0-probebereich'), 'die Produkt-Quelle muss weiter gesät werden');
    assert.ok(ids.includes('fremd-mitgebracht'),
      'ROT ERWARTET beim Rückfall: sobald das Produkt selbst etwas trägt, wäre die Mitschrift '
      + 'unerreichbar und die fremde Datei verlöre ihre mitgebrachte Struktur. Gefunden: '
      + ids.join(' '));
  });

  test('die Rangfolge bleibt: das lebendige Produkt gewinnt bei gleicher ID', () => {
    const { V } = ladeKernAusText(mitFixture(quelle()));
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [Object.assign({}, MITSCHRIFT_FREMD, {
      bereiche: { 'zug0-probebereich': { label: 'FALSCH, AUS DER MITSCHRIFT', icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'f_a', label: 'A', typ: 'text' }] }] } },
    })] };
    const treffer = V._bereichModulAbWerkSeed(d).find((b) => b.id === 'zug0-probebereich');
    assert.equal(treffer.label, 'Zug-0-Probebereich',
      'die lebendige Produkt-Quelle muss gewinnen — sonst überschriebe eine Depot-Datei die '
      + 'Korrektur des Programms');
  });

  test('[Sicherheitsgrenze] die Mitschrift läuft weiter mit `abWerk: false`', () => {
    const { V } = ladeKernAusText(mitFixture(quelle()));
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [{
      modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fremd-produkt', sprache: 'de',
      kennung: 'fremd-produkt/ohne-label', fassung: 1,
      /* KEIN label — das darf nur die eingebackene Konstante weglassen (Textsatz-Weg). */
      bereiche: { 'fremd-ohne-label': { icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'f_b', label: 'B', typ: 'text' }] }] } },
    }] };
    const ids = V._bereichModulAbWerkSeed(d).map((b) => b.id);
    assert.ok(!ids.includes('fremd-ohne-label'),
      'ROT ERWARTET: ein Mitschrift-Eintrag ohne Label darf nicht durchkommen — täte er es, '
      + 'liefe die Mitschrift mit `abWerk: true` und die Grenze aus Stufe 1 wäre offen');
  });

  test('ein abgewiesener Doppel-Eintrag wird BENANNT, nicht still übersprungen', () => {
    /* Gleichgezogen mit dem Registry-Weg, der denselben Fall ausdrücklich als
       `doppelt-ab-werk` meldet („wird aber wie jeder andere Doppel-Fall BENANNT, nicht still
       übersprungen"). Ein Kaperungsversuch über die Mitschrift soll eine Spur hinterlassen.
       Seit dem Schnitt (19.09.2026) ist ein eingebackener Bereich zugleich ein EINGEBAUTER
       (steht in SEKTOREN): der Grund lautet dann `reserviert` statt `doppelt-ab-werk` —
       beide sind eine Spur, keiner ein stilles Überspringen. */
    const { V } = ladeKernAusText(mitFixture(quelle()));
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [Object.assign({}, MITSCHRIFT_FREMD, {
      bereiche: { 'zug0-probebereich': { label: 'Kaperung', icon: 'folder',
        sektionen: [{ id: 's', label: 'S', felder: [{ id: 'f_a', label: 'A', typ: 'text' }] }] } },
    })] };
    V._bereichModulAbWerkSeed(d);
    assert.ok(V.BEREICHS_MODUL_VERWORFEN.some(
      (v) => v.id === 'zug0-probebereich' && (v.grund === 'doppelt-ab-werk' || v.grund === 'reserviert')),
      'ROT ERWARTET: der abgewiesene Mitschrift-Eintrag hinterlässt keine Spur. Gefunden: '
      + JSON.stringify(V.BEREICHS_MODUL_VERWORFEN));
  });
});
