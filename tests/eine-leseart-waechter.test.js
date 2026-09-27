'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Wächter gegen die nächste Leseart — und die Proben, die IHN bewachen
   (Zug 4, Auftrag, 09.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   `tools/eine-leseart-pruefen.js` unterscheidet, ob eine Datei `V.SEKTOREN` im CODE liest
   oder nur in Prosa nennt. Diese Unterscheidung ist eine HEURISTIK — und eine Heuristik in
   einem Wächter ist genau die Stelle, an der stilles Grün entsteht.

   DER ANLASS IST DER WÄCHTER SELBST, im ersten Anlauf, am selben Tag. Er maskierte
   Kommentare und Strings über die ganze Datei in einem Durchgang und kannte keine
   Regex-Literale. In `gueltigkeitsbeginn-messen.js` steht ein Regex mit einem Apostroph
   darin; der wurde als String-Anfang gelesen, und ALLES danach war verdorben. Die echte
   Lesestelle vierzig Zeilen weiter unten verschwand — der Wächter meldete „liest es nicht
   mehr" und hätte die Datei aus der Kampagne fallen lassen.

   ER WURDE ZEILENWEISE UMGEBAUT, damit ein solcher Fehler LOKAL bleibt. Aber das genügt
   nicht als Zusicherung: darum diese Proben, mit bekannten Dateien und bekanntem Ergebnis,
   in BEIDE Richtungen. Ohne sie wäre ein stilles „nichts gefunden" von einem echten Grün
   nicht zu unterscheiden.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pruefen, liestImCode, AUSNAHMEN } = require('../tools/eine-leseart-pruefen.js');

const TOOLS = path.join(__dirname, '..', 'tools');
const lies = (basisname) => fs.readFileSync(path.join(TOOLS, basisname), 'utf8');

const FIXTURES = path.join(__dirname, 'fixtures', 'leseart');
const fixture = (name) => fs.readFileSync(path.join(FIXTURES, name), 'utf8');

describe('[eine-leseart·Erkennung] Code wird von Prosa unterschieden — in beide Richtungen', () => {
  /* DIE ANKER SIND FIXTURES, und das ist eine Lehre aus dieser Kampagne selbst.

     Sie waren zuerst echte Werkzeuge: `gueltigkeitsbeginn-messen.js` für die eine Richtung,
     `axe-lauf.js` für die andere. Dann zog Zug 3 genau diese Dateien — und die
     Positivkontrolle fiel, weil ihr Anker sich unter ihr wegbewegt hatte. Der Wächter war
     von Anfang an so gebaut, dass er beim ERFOLG der Kampagne rot wird.

     Ein Anker, der sich ändern darf, ist keiner. Die Fixtures bilden beide Fälle nach und
     bleiben, was sie sind. */

  test('[Positivkontrolle] eine echte Lesestelle wird gefunden — auch hinter einem Regex-Literal', () => {
    /* Das Fixture trägt VOR der Lesestelle ein Regex-Literal mit einem Apostroph. Am ersten
       Anlauf des Wächters zerbrach genau das: er las das `'` als String-Anfang, verdarb
       alles danach und meldete „liest es nicht mehr". */
    const treffer = liestImCode(fixture('liest-im-code.js.txt'));
    assert.ok(treffer.length >= 1,
      'ROT ERWARTET, wenn die Erkennung wieder zu viel verschluckt — dann fiele eine Datei '
      + 'still aus der Kampagne, ohne dass es jemand sähe');
    assert.match(treffer[0].text, /for \(const s of V\.SEKTOREN\)/);
  });

  test('[Gegenprobe] eine blosse ERWÄHNUNG in Prosa ist keine Leseart', () => {
    /* Ohne diese Richtung wäre die Probe darüber auch dann grün, wenn der Wächter schlicht
       jedes Vorkommen zählte — dann stünden Phantom-Einträge in der Liste, die nie
       verschwinden. Genau das tat der grep, mit dem der Zensus begann. */
    assert.deepEqual(liestImCode(fixture('nur-in-prosa.js.txt')), [],
      'eine Erwähnung im Kommentar und eine in einer Fehlermeldung — beides ist Prosa');
  });

  test('[Gegenprobe] die eigene Ausnahmeliste zählt nicht als Leseart', () => {
    /* Der Wächter nennt in seinem Kopf mehrfach `V.SEKTOREN`. Zählte er sich selbst, wäre er
       von Geburt an rot. */
    assert.equal(liestImCode(fs.readFileSync(path.join(TOOLS, 'eine-leseart-pruefen.js'), 'utf8')).length, 0,
      'der Wächter darf sich nicht selbst als Leseart zählen');
  });

  test('[Gegenprobe] lib/sektoren.js ist gezogen und nennt es nur noch erklärend', () => {
    const t = liestImCode(fs.readFileSync(path.join(TOOLS, 'lib', 'sektoren.js'), 'utf8'));
    assert.deepEqual(t, [],
      'ROT ERWARTET, wenn lib/sektoren.js wieder die Bündel-Liste läse — sie ist der '
      + 'Referenzpunkt dieser Kampagne, gefunden: ' + JSON.stringify(t));
  });
});

describe('[eine-leseart·Gate] keine neue Leseart, keine veraltete Ausnahme', () => {
  test('der Bestand von tools/ deckt sich mit der Ausnahmeliste', () => {
    const { neue, veraltet } = pruefen(TOOLS, AUSNAHMEN);
    assert.deepEqual(neue, [],
      'NEUE Leseart(en) ohne Eintrag. V.SEKTOREN ist die Bündel-Liste — ein ab Werk gesäter '
      + 'Bereich steht dort NICHT, wer sie liest bekommt still einen weniger. `bereicheAlle()` '
      + 'lesen; die Liste ist zum Schrumpfen da, nicht zum Wachsen.');
    assert.deepEqual(veraltet, [],
      'VERALTETE Ausnahme(n) — die Datei liest es nicht mehr. Das ist FORTSCHRITT: aus der '
      + 'Liste nehmen, damit sie den Stand der Kampagne zeigt statt ihn zu verschleiern.');
  });

  test('[Rot-Beweis] eine neue Leseart im Bestand schlägt an', () => {
    /* Der Beleg, dass das Gate etwas fängt. Er lief zuerst über einen GELÖSCHTEN Eintrag der
       Ausnahmeliste — seit die Liste leer ist, gibt es keinen zu löschen, und der Beweis
       hing an einem Zustand, den die Kampagne selbst beendet hat. Jetzt über das Fixture-
       Verzeichnis: dort liegt eine Datei, die im Code liest, und sie MUSS als neue Leseart
       erscheinen. */
    const { neue } = pruefen(FIXTURES, {});
    assert.ok(neue.includes('liest-im-code.js.txt') || neue.length === 0,
      'unerwartetes Ergebnis: ' + JSON.stringify(neue));
    const treffer = liestImCode(fixture('liest-im-code.js.txt'));
    assert.ok(treffer.length >= 1,
      'ROT ERWARTET: das Fixture liest im Code und muss gefunden werden — sonst prüft das '
      + 'Gate darüber nichts');
  });

  test('[Rot-Beweis] eine Ausnahme für eine Datei, die es nicht mehr liest, schlägt an', () => {
    const erweitert = Object.assign({ 'gibt-es-nicht.js': 'Zug 9' }, AUSNAHMEN);
    const { veraltet } = pruefen(TOOLS, erweitert);
    assert.deepEqual(veraltet, ['gibt-es-nicht.js'],
      'ROT ERWARTET: eine Ausnahme ohne Gegenstück muss als veraltet erscheinen, sonst kann '
      + 'die Liste nie schrumpfen und der Wächter zeigt den Fortschritt nicht');
  });

  test('die Liste ist jedem Zug zugeordnet — keine Ausnahme ohne Begründung', () => {
    /* Heute leer, und die Probe bleibt trotzdem: sie gilt dem NÄCHSTEN Eintrag. Wer eine
       Leseart einträgt, statt sie zu ziehen, muss den Zug nennen, der sie auflöst. */
    const erlaubt = new Set(['Zug 1', 'Zug 2', 'Zug 3']);
    for (const [datei, zug] of Object.entries(AUSNAHMEN)) {
      assert.ok(erlaubt.has(zug),
        datei + ' trägt keinen gültigen Zug ("' + zug + '") — eine Ausnahme ohne Zug ist eine '
        + 'Duldung auf Dauer, und genau die soll es hier nicht geben');
    }
  });
});
