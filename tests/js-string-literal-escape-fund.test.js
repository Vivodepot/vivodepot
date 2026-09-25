'use strict';
/* ════════════════════════════════════════════════════════════════════════
   tools/lib/js-string-literal.js — die Reparatur belegt, nicht nur behauptet
   (frühere Erhebung, 06.09.2026, „kleiner Zug vor A4")
   ────────────────────────────────────────────────────────────────────────
   Der Fund: `buendelMitSituationenSchreiben` (U2-ADR-341) las das Bündel-Literal
   bislang mit einem `indexOf("');")`-Anker und ohne Entschärfung vor
   `JSON.parse` — trägt nur, solange kein Bündel-Wert ein escapetes `"`
   enthält. A4 (Dokumentmodul-Umzug) traf real: ein Wortlaut mit `„Kind\"`-
   artigem Anführungszeichen ließ `JSON.parse` bei ~7 % der echten Länge
   abbrechen. Diese Datei baut den Fall NACH — mit synthetischem HTML, nicht
   dem echten Kern, damit die Probe unabhängig vom aktuellen Situationen-
   Bestand bleibt (der heute zufällig kein `"` trägt und den alten Fehler
   darum nie zeigt — „Glück der Daten, kein Beleg für richtigen Code").
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { jsStringSicher, jsStringEntsichern, stringLiteralEndeFinden } = require('../tools/lib/js-string-literal.js');
const { buendelMitSituationenSchreiben } = require('../tools/situationen-ins-buendel-schreiben.js');

test('[js-string-literal·Ausbeute] jsStringSicher/jsStringEntsichern sind zueinander invers, für Text mit Backslash UND Apostroph', () => {
  const proben = ["it's", 'C:\\pfad', "it\\'s tricky", 'gewöhnlicher Text', ''];
  for (const p of proben) {
    assert.equal(jsStringEntsichern(jsStringSicher(p)), p, 'Rundreise für ' + JSON.stringify(p));
  }
});

/* KORREKTUR (06.09.2026, gleicher Tag): meine erste Fassung dieser Datei behauptete, der ALTE
   `indexOf("');")`-Anker fände das Bündel-Ende zu früh. Nachgeprüft: das stimmt nicht — weil
   `jsStringSicher` JEDEN Apostroph escaped, kann nach dem Schreiben kein blosses `'` mehr im
   Text stehen außer am echten Ende, und `indexOf("');")` findet darum IMMER dieselbe Stelle wie
   `stringLiteralEndeFinden` (gemessen: identischer Index in beiden Fällen, siehe A4-Messung).
   Der einzige echte Fehler ist die FEHLENDE Entschärfung vor `JSON.parse` — s. Probe unten. Der
   escape-bewusste Scanner bleibt in der Bibliothek stehen (er ist nicht falsch, nur nicht der
   Fund), weil er dieselbe Grenze robuster gegen künftige Änderungen an `jsStringSicher` zieht. */
test('[js-string-literal·Rot-Beweis] der ALTE Anker und der neue Scanner finden dieselbe Stelle — der echte Fehler ist die fehlende Entschärfung, nicht der Anker', () => {
  const wert = 'Ordner „Kind"'; // literales " — genau der A4-Fund
  const roh = { modulTyp: 'bereich', irgendeinWert: wert, danach: 'weiterer Inhalt, der zaehlt' };
  const html = "const BUERGERMODUL_BUENDEL = JSON.parse('" + jsStringSicher(JSON.stringify(roh)) + "');\n\n// Rest der Datei";

  const startMarker = "const BUERGERMODUL_BUENDEL = JSON.parse('";
  const start = html.indexOf(startMarker) + startMarker.length;

  const jAlt = html.indexOf("');", start);
  const jNeu = stringLiteralEndeFinden(html, start);
  assert.equal(jAlt, jNeu, 'beide Wege finden dieselbe Stelle — der Anker war nie das Problem');

  assert.throws(() => JSON.parse(html.slice(start, jNeu)), 'ohne Entschärfung ist das Slice KEIN gültiges JSON');
  assert.doesNotThrow(() => JSON.parse(jsStringEntsichern(html.slice(start, jNeu))), 'mit Entschärfung ist es gültiges JSON');
  const geschrieben = JSON.parse(jsStringEntsichern(html.slice(start, jNeu)));
  assert.equal(geschrieben.irgendeinWert, wert, 'der Wert mit eingebettetem " kommt unverändert an');
});

test('[js-string-literal·Positivkontrolle] buendelMitSituationenSchreiben schreibt gültiges JSON, auch wenn ein bestehender Bündel-Wert ein " trägt', () => {
  const bestehenderWert = { modulTyp: 'bereich', herkunft: 'vivodepot', hinweis: 'Ordner „Alt"', bereiche: {} };
  const html = "VOR\nconst BUERGERMODUL_BUENDEL = JSON.parse('" + jsStringSicher(JSON.stringify(bestehenderWert)) + "');\nNACH";
  const neuesHtml = buendelMitSituationenSchreiben(html, { geburt: { icon: 'x', modus: 'eigen', bloecke: [] } });
  assert.ok(neuesHtml.startsWith('VOR\n'), 'Text vor dem Anker bleibt unverändert');
  assert.ok(neuesHtml.endsWith('\nNACH'), 'Text nach dem Anker bleibt unverändert');

  const m = neuesHtml.match(/JSON\.parse\('(.*)'\);/);
  assert.ok(m, 'das neue Literal ist auffindbar');
  const geschrieben = JSON.parse(jsStringEntsichern(m[1]));
  assert.equal(geschrieben.hinweis, 'Ordner „Alt"', 'der bestehende Wert mit " übersteht den Schreibvorgang unverändert');
  assert.deepEqual(geschrieben.situationen, { geburt: { icon: 'x', modus: 'eigen', bloecke: [] } });
});
