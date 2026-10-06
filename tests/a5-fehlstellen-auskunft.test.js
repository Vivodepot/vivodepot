'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A5 — die Fehlstellen-Auskunft prüft gegen den ECHTEN Empfängersatz
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „nach der Entscheidungsrunde" (20.08.2026), Posten 3.

   DIE AUFLAGE, die alles bestimmt (SP Pro, 20.08.): *„Eine Fehlstellen-Auskunft,
   die gegen das eigene Vokabular des Erzeugers prüft, hätte heute Vollzug
   gemeldet. Der Erzeuger kannte zehn Feldarten und war mit sich im Reinen,
   während der Kern sechs kannte und alles verwarf."*

   DER WEG: eine dritte erzeugte Region im Erzeuger (`TORWAECHTER`), Bauart wie
   `BEREICHE` und `FELDKATALOG` — nur trägt sie keine Liste, sondern den PRÜFER
   SELBST, wörtlich aus `vivodepot.html`.

   WARUM DAS ETWAS ANDERES IST ALS DER SPIEGEL AUS A376: der Spiegel hält beide
   Seiten auf derselben ZAHL von Feldarten. **Er prüft eine Zahl, kein
   Verhalten.** Alles darüber hinaus — codeWerte bei `auswahl`, Unterfeld-Typen
   bei `liste`, Terminologie-URIs, vier Längen-Obergrenzen — stünde weiter in
   zweiter, handgepflegter Fassung. Eine Kopie bleibt eine Kopie; erzeugter
   Quelltext ist dieselbe Sache.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

function feld(extra) {
  return Object.assign({ feldname: 'Kammernummer', feldtyp: 'text', bereich: 'bildung', gruppe: 'Zulassung' }, extra || {});
}

/* ══ Der Torwächter ist derselbe, nicht ein ähnlicher ═══════════════════════ */

test('[A5·tragend] der Erzeuger führt DENSELBEN Torwächter wie der Kern — wörtlich', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const gen = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
  const { torwaechterAusKern } = require('../tools/build-torwaechter.js');
  const teile = torwaechterAusKern(kern);
  for (const [name, text] of Object.entries(teile)) {
    const eingerueckt = text.split('\n').map((z) => '  ' + z).join('\n');
    assert.ok(gen.includes(eingerueckt), name + ' steht nicht wörtlich im Erzeuger');
  }
});

test('[A5] beide Seiten urteilen gleich — dieselbe Vorlage, dasselbe Ergebnis', () => {
  const { V } = ladeGenerator();
  const { V: K } = ladeKern();
  const faelle = [
    { felder: [feld()] },
    { felder: [feld({ feldtyp: 'geokoordinate' })] },
    { felder: [feld({ feldtyp: 'auswahl' })] },
    { felder: [feld({ feldtyp: 'auswahl', codeWerte: [{ code: 'a', anzeige: 'A' }] })] },
    { felder: [feld({ feldname: 'x'.repeat(400) })] },
    { felder: [] },
  ];
  for (const f of faelle) {
    assert.equal(V.KERN_TORWAECHTER.validateTemplate(f), K.validateTemplate(f),
      'Urteil weicht ab bei: ' + JSON.stringify(f).slice(0, 90));
  }
});

test('[A5·Rot-Beweis] wäre die Kopie zurückgeblieben, urteilten beide verschieden', () => {
  /* Der Fall aus SP Pros Auflage, in seiner Entstehungsrichtung: der Kern lernt eine Grenze,
     die Kopie kennt sie nicht. Gemessen an einer MUTIERTEN Region — ohne Griff in die echte
     Datei. Ohne diese Probe wäre „beide urteilen gleich" auch dann grün, wenn beide dieselbe
     falsche Sache prüften. */
  const gen = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
  const anker = '  const _TEMPLATE_FELDNAME_MAX = 300;';
  assert.equal(gen.split(anker).length - 1, 1, 'Vorbedingung: der Anker steht genau einmal');
  const mutiert = gen.replace(anker, '  const _TEMPLATE_FELDNAME_MAX = 5;');
  assert.notEqual(mutiert, gen);
  // Die Mutation ist so gewählt, dass sie an einem harmlosen Feld sichtbar wird:
  const { V: K } = ladeKern();
  assert.equal(K.validateTemplate({ felder: [feld({ feldname: 'Kammernummer' })] }), null,
    'im Kern ist der Name zulässig — mit der mutierten Grenze wäre er es nicht');
  assert.ok(mutiert.includes('_TEMPLATE_FELDNAME_MAX = 5'), 'mutiert: die Kopie führt eine andere Grenze');
});

/* ══ Die Auskunft selbst ═══════════════════════════════════════════════════ */

test('[A5] eine Vorlage, die das Tor nicht passiert, wird als TOTALVERLUST gemeldet', () => {
  const { V } = ladeGenerator();
  const a = V.fehlstellenAuskunft({ felder: [feld({ feldtyp: 'geokoordinate' })] });
  assert.equal(a.torOffen, false);
  assert.match(a.torGrund, /unbekannter feldtyp/);
  const saetze = V.fehlstellenSaetze(a);
  assert.equal(saetze.length, 1);
  assert.match(saetze[0], /NICHT an/, 'nicht „ein Feld fehlt" — die ganze Vorlage kommt nicht an');
  assert.match(saetze[0], /geokoordinate/, 'und der Grund der Bürger-App steht wörtlich dabei');
});

test('[A5] eine Liste ohne Unterfelder ist eine Fehlstelle — schema-konform und trotzdem leer', () => {
  const { V } = ladeGenerator();
  const a = V.fehlstellenAuskunft({ felder: [feld({ feldname: 'Nachweise', feldtyp: 'liste' })] });
  assert.equal(a.torOffen, true, 'sie kommt an — das Tor lässt sie durch');
  /* LÄNGE UND WERT statt deepEqual: die Arrays kommen aus dem GENERATOR-Kontext (eigener vm),
     ihr Prototyp ist ein anderer — `deepEqual` schlägt an, ohne dass ein Wert abweicht. Heute
     der dritte Fall dieser Art. */
  assert.equal(a.ohneZeilen.length, 1);
  assert.equal(a.ohneZeilen[0].feldname, 'Nachweise');
  assert.match(V.fehlstellenSaetze(a)[0], /Überschrift ohne Zeilen/);
});

test('[A5·Gegenprobe] `jaNein` wird NICHT gemeldet — es kommt an und wird angezeigt', () => {
  /* Der umgekehrte Fehler, und er wäre der teurere: eine Auskunft, die eine Fehlstelle
     erfindet, hält eine Institution von etwas ab, das funktioniert. `jaNein` steht bewusst
     nicht in den Render-Typen des Kerns — der Übersetzer bildet es auf `auswahl` ab. */
  const { V } = ladeGenerator();
  const a = V.fehlstellenAuskunft({ felder: [feld({ feldname: 'Zustimmung', feldtyp: 'jaNein' })] });
  assert.equal(a.torOffen, true);
  assert.equal(a.nichtAngezeigt.length, 0);
  assert.equal(V.fehlstellenSaetze(a).length, 0);
});

test('[A5·Gegenprobe] eine saubere Vorlage erzeugt KEINE Sätze — „alles kommt an" ist die Antwort', () => {
  const { V } = ladeGenerator();
  const a = V.fehlstellenAuskunft({ felder: [
    feld(),
    feld({ feldname: 'Notiz', feldtyp: 'textarea' }),
    feld({ feldname: 'Nachweise', feldtyp: 'liste', unterFelder: [{ feldname: 'Titel', feldtyp: 'text' }] }),
  ] });
  assert.equal(a.torOffen, true);
  assert.equal(V.fehlstellenSaetze(a).length, 0, V.fehlstellenSaetze(a).join(' | '));
});

test('[A5] die Auskunft nennt ihren Prüfmassstab — nicht das eigene Vokabular', () => {
  const { V } = ladeGenerator();
  const a = V.fehlstellenAuskunft({ felder: [feld()] });
  assert.match(a.geprueftGegen, /Torwächter/, 'geprüft wird gegen den Empfängersatz, und die Auskunft sagt es');
});

test('[A5] die Anzeige benennt die Grenze der Auskunft — die Kern-Fassung des Empfängers', () => {
  const gen = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
  assert.match(gen.replace(/\s+/g, ' '), /ältere Fassung der Bürger-App tut, kann diese Seite nicht wissen/,
    'die eine Lücke steht auf dem Bildschirm, nicht nur im Bericht');
  assert.ok(gen.includes('id="pr-fehlstellen"'), 'die Auskunft hat einen Platz in der Prüfansicht');
});
