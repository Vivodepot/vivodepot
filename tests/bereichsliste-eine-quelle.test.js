'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-16 · Es gibt genau EINE Bereichsliste — und die Anwendungen führen sie gleich
   ────────────────────────────────────────────────────────────────────────
   Zug 1/2 des Auftrags „Die Bereichsliste wird ein andockbares Register"
   (17.08.2026). Geprüft werden vier Dinge, und jedes hat seinen Rot-Beleg:

   1 · VORBEDINGUNG — der Wächter findet überhaupt Listen. Ein Lauf über eine
       leere Menge ist rot, nicht still (A279).
   2 · Es entsteht keine ZWEITE Bereichsliste. Rot-Beleg: eine gepflanzte Liste
       in einer Dateikopie schlägt an.
   3 · Kern und Lese-App führen dieselbe Menge UND dieselbe Reihenfolge — das
       ist der Fehler aus Zug 2b, den die Paritäts-Probe nicht sehen konnte.
   4 · Der Schlüsselraum ist die ID: `krisenvorsorge` ist im Generator und in
       allen drei Schema-Kopien angekommen (Zug 2a — vorher konnte keine
       Institution eine Vorlage für den zwölften Bereich einreichen).

   Die Rot-Belege laufen über DATEIKOPIEN, nie über `git checkout --` am
   Arbeitsbaum (die Regel zu destruktiven Git-Operationen, Vorfall 27.07.).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const W = require('../tools/bereichslisten-pruefen.js');
const { bereichsIdsAusBlock } = require('../tools/bereichs-ids-erheben.js');
const { echteSektorenListe } = require('../tools/lib/sektoren.js');

function tempKopie(relPfad, wandel) {
  const quelle = fs.readFileSync(path.join(REPO, relPfad), 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-bereiche-'));
  const ziel = path.join(dir, path.basename(relPfad));
  fs.writeFileSync(ziel, wandel(quelle));
  return ziel;
}

/* ── 1 · Vorbedingung ────────────────────────────────────────────────────── */
test('[W-16·Vorbedingung] der Lauf findet überhaupt Bereichslisten — sonst prüft er nichts', () => {
  const r = W.pruefe(W.GEGENSTAND);
  assert.ok(r.alle.length >= 6, 'mindestens die generierten Regionen und enums werden gesehen, gefunden: ' + r.alle.length);
  assert.ok(r.ids.length >= 2, 'die Bereichsliste selbst ist nicht leer');
});

test('[W-16] im echten Bestand entsteht keine zweite Bereichsliste', () => {
  const r = W.pruefe(W.GEGENSTAND);
  assert.deepEqual(r.funde.map(f => f.datei + ':' + f.zeile + ' ' + f.name), [],
    'jede gefundene Liste ist erzeugt oder mit Grund im Register geführt');
});

/* ── 2 · Rot-Beleg: eine gepflanzte zweite Liste schlägt an ─────────────── */
test('[W-16·Rot] eine gepflanzte zweite Bereichsliste wird gefunden', () => {
  const ids = echteSektorenListe();
  const gepflanzt = '\nconst MEINE_EIGENE_BEREICHSLISTE = Object.freeze([\n'
    + ids.map(i => "  '" + i + "',").join('\n') + '\n]);\n';
  // U2-ADR-323: die Deklaration heisst seit dem Anmelden der Bereichs-Module `let`.
  const ANKER = 'let SEKTOR_BY_ID';
  const kopie = tempKopie('vivodepot-lesen.html', (q) => {
    // Ein verfehlter Anker darf nicht leer durchlaufen — sonst pflanzt die Probe nichts
    // und meldet trotzdem gruen, was sie gerade NICHT belegt haette.
    if (!q.includes(ANKER)) throw new Error('Anker fuer die gepflanzte Liste nicht gefunden: ' + ANKER);
    return q.replace(ANKER, gepflanzt + ANKER);
  });
  const rel = path.relative(REPO, kopie);
  // pruefe() liest relativ zu REPO — für die Kopie den absoluten Pfad durchreichen
  const quelle = fs.readFileSync(kopie, 'utf8');
  const treffer = W.aufzaehlungenMitBereichen(quelle, ids, false);
  const neu = treffer.filter(t => t.name === 'MEINE_EIGENE_BEREICHSLISTE');
  assert.equal(neu.length, 1, 'die gepflanzte Liste wird als Aufzählung erkannt (rel: ' + rel + ')');
  assert.ok(neu[0].dichte >= 0.5, 'sie erfüllt das Dichte-Kriterium, Dichte war ' + neu[0].dichte);
});

test('[W-16·Gegenprobe] eine Registry mit sektorId-Zeilen ist KEIN Fund', () => {
  const ids = echteSektorenListe();
  // Dieselbe Bauart wie SITUATIONEN/B16_FELD_MAPPING: Bereiche kommen vor, aber
  // zwischen vielem anderen. Sie sind die 565 Daten-Stellen, die bleiben sollen.
  const registry = '\nconst EINE_REGISTRY = Object.freeze([\n'
    + ids.map((i, n) => "  { sektorId: '" + i + "', feldId: 'feld_" + n + "', label: 'Beschriftung " + n
      + "', hinweis: 'ein Hinweistext', gruppe: 'gruppe_" + n + "', quelle: 'irgendwoher' },").join('\n')
    + '\n]);\n';
  const treffer = W.aufzaehlungenMitBereichen(registry, ids, false);
  assert.deepEqual(treffer.filter(t => t.name === 'EINE_REGISTRY'), [],
    'eine Registry mit Bereichs-Zeilen wird NICHT als Bereichsliste gemeldet');
});

/* ── 3 · Reihenfolge Kern ↔ Lese-App ────────────────────────────────────── */
test('[W-16] Kern und Lese-App führen dieselben Bereiche in derselben Reihenfolge', () => {
  const r = W.reihenfolgePruefen();
  assert.ok(r.ok, r.grund + '\n  Kern:     ' + (r.kern || []).join(', ') + '\n  Lese-App: ' + (r.lese || []).join(', '));
  assert.deepEqual(r.kern, r.lese);
});

test('[W-16·Rot] eine vertauschte Reihenfolge in der Lese-App schlägt an', () => {
  // Der Fehler aus Zug 2b, nachgestellt: housing und personal getauscht.
  const kern = bereichsIdsAusBlock(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
  const vertauscht = kern.slice();
  const a = vertauscht.indexOf('housing'), b = vertauscht.indexOf('personal');
  assert.ok(a >= 0 && b >= 0, 'Vorbedingung: beide Bereiche existieren');
  [vertauscht[a], vertauscht[b]] = [vertauscht[b], vertauscht[a]];
  assert.notEqual(kern.join(','), vertauscht.join(','),
    'die Vertauschung ist als Unterschied sichtbar — genau das, was die Paritäts-Probe nicht sah');
});

/* ── 4 · Der zwölfte Bereich ist überall angekommen (Zug 2a) ────────────── */
test('[Zug 2a] emergencyPreparedness steht im Generator und in allen drei Schema-Kopien', () => {
  const ids = echteSektorenListe();
  assert.ok(ids.includes('emergencyPreparedness'), 'Vorbedingung: der Kern führt den zwölften Bereich');
  for (const rel of ['vivodepot-studio.html', 'vivodepot-vc-issuer.html',
    'docs/template-generator/submission-schema.json']) {
    const q = fs.readFileSync(path.join(REPO, rel), 'utf8');
    assert.ok(q.includes('"emergencyPreparedness"') || q.includes("'emergencyPreparedness'"),
      rel + ' kennt emergencyPreparedness — vor Zug 1 kannte es keine der drei Dateien');
  }
});

test('[Zug 2a] der Schlüsselraum ist die ID — keine Anwendung prüft mehr gegen eine Beschriftung', () => {
  const gen = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
  // Die alte Prüfung verglich `BEREICHE.includes(...)` gegen deutsche Wörter. Nach Zug 1
  // enthält BEREICHE ausschliesslich IDs — belegt über die generierte Region selbst.
  const region = gen.slice(gen.indexOf('BEREICHE:BEGIN'), gen.indexOf('BEREICHE:END'));
  const listeAnfang = region.indexOf('const BEREICHE = Object.freeze([');
  const liste = region.slice(listeAnfang, region.indexOf(']);', listeAnfang));
  for (const wort of W.ALT_LABEL_WOERTER) {
    assert.ok(!liste.includes("'" + wort + "'"),
      'BEREICHE trägt die Beschriftung „' + wort + '" nicht mehr als Schlüssel');
  }
  for (const id of echteSektorenListe()) {
    assert.ok(liste.includes("'" + id + "'"), 'BEREICHE trägt die ID ' + id);
  }
});

/* ── 5 · Der Rückweg für alte Einreichungen bleibt offen ─────────────────── */
test('[Zug 1] eine ALTE Einreichung mit deutscher Beschriftung wird weiter verstanden', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  // Genau die Gestalt, die in den vier SIGNIERTEN Basis-Vorlagen im JWS-Payload steht.
  const alt = V._templateFeldZuModell({ feldname: 'Dokument vorhanden?', feldtyp: 'jaNein', bereich: 'Vorsorge' }, 63);
  assert.ok(alt.def, 'die alte Beschriftung wird zurückgeführt, nicht verworfen');
  assert.equal(alt.def.sektorId, 'advanceCare');
  // Und der neue Weg über die ID.
  const neu = V._templateFeldZuModell({ feldname: 'Dokument vorhanden?', feldtyp: 'jaNein', bereich: 'advanceCare' }, 63);
  assert.equal(neu.def.sektorId, 'advanceCare', 'die ID trägt genauso');
  // Ein unbekannter Wert wird weiterhin NAMENTLICH verworfen, nicht still zugeordnet.
  const weg = V._templateFeldZuModell({ feldname: 'Irgendwas', feldtyp: 'text', bereich: 'Galaxie' }, 63);
  assert.ok(weg.verworfen && weg.grund === 'bereich', 'unbekannter Bereich wird namentlich verworfen');
});

test('[Zug 1·Rot] ein NEUER Bereich braucht keinen Eintrag in der Beschriftungs-Tabelle mehr', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  // emergencyPreparedness steht NICHT in der Alt-Tabelle unter seiner ID — es trägt trotzdem,
  // weil der erste Weg gegen SEKTOR_BY_ID prüft. Vor Zug 1 hing genau das an einer
  // von Hand gepflegten Zeile, und dieselbe Sorte Zeile fehlte sieben Tage lang.
  const r = V._templateFeldZuModell({ feldname: 'Vorrat geprüft am', feldtyp: 'datum', bereich: 'emergencyPreparedness' }, 63);
  assert.ok(r.def, 'der zwölfte Bereich trägt über die ID');
  assert.equal(r.def.sektorId, 'emergencyPreparedness');
});
