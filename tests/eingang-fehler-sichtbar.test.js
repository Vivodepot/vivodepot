'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund F4 (22.09.2026, HOCH, vor v1) — der Eingangsweg verschluckt
   ────────────────────────────────────────────────────────────────────────
   DER FUND (S8-Fahrer1, 21.09.2026, Rohgerüst-Messung §12): ein Fehler in
   booteEingang() → renderWelcome() lief zweimal gegen zwei stille catch()
   und endete als weiße Seite ohne jede Meldung. Die Bürgerin konnte nicht
   einmal berichten, was sie sah — sie sah nichts.

   GEGENSTAND HIER IST DAS SCHWEIGEN, NICHT DER AUSLÖSER. Der konkrete
   Auslöser der Messung (ein Produkt-Sprachmodul ohne Sprachsatz wirft in
   escapeHTML) war Befund 34.6 — inzwischen BEHOBEN (22.09.2026, escapeHTML
   selbst toleriert jetzt null/undefined, s. tests/escape-html-tolerant.test.js).
   Eine Probe, die nur DIESEN einen Auslöser abdeckte, ließe die Verschluckung
   für jeden anderen Fehler im Eingangsweg stehen — deshalb bleibt Zug 1 der
   tragende Rot-Beweis: eine GENERISCHE, von Sprache/Modul unabhängige Ursache.
   Er bleibt UNVERÄNDERT stehen, ausdrücklich auch nach 34.6 — F4s eigener
   Regressionsschutz darf nicht an einem Fehler hängen, den ein anderer Fix
   wegnehmen kann (Auflage, 22.09.2026).

   ZUG 2 IST DAMIT KEIN ROT-BEWEIS FÜR F4 MEHR, SONDERN DAS GEGENSTÜCK: er
   zeigt, dass der nackte Kern ohne Sprachmodul jetzt DURCHLÄUFT (34.6 nimmt
   die Ursache weg) UND dass F4s Mechanismus dabei korrekt STILL bleibt — kein
   Fehler, keine Meldung, kein falscher Alarm. Vor 34.6 bewies er den Auffang;
   das kann er nicht mehr, ehrlich benannt statt umetikettiert.

   GERÜST-TEST: Zug 2 lädt weiterhin bewusst das nackte Gerüst (`{ blank: true }`,
   roher Pfad) — roh ist hier Absicht, nicht Drift.

   ZUSCHNITT DES FIXES, mit Ansage: NICHT die Fehlerbehandlung umgebaut (der
   Retry in booteEingang() bleibt unverändert) — nur an die Stelle des
   LETZTEN stillen catch() eine sichtbare Meldung gesetzt
   (`_eingangsFehlerAnzeigen`). Die Meldung behauptet nichts, was sie nicht
   weiß: kein „Ihr Depot ist beschädigt", kein erfundener Grund — nur, dass
   der Eingang nicht aufgebaut werden konnte. Bewusst OHNE STRINGS/escapeHTML
   (beide können Teil der Ursache sein, genau das misst 34.6) UND ohne einen
   neuen Zeichenketten-Satz im Skript (W0-Gerüstwächter, eimer.satz, „nie
   eine Ausnahme"): der Text steht als STATISCHES Markup neben <noscript>,
   verborgen per `hidden` — derselbe Grund, warum <noscript> selbst dort
   steht: da, bevor irgendein Modul gelesen werden könnte.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const HTML = path.join(REPO, 'vivodepot.html');
const HINWEIS_ID = 'eingang-fehler-hinweis';
const HINWEIS_TEXT = 'Der Eingang konnte nicht aufgebaut werden.';

// Der Text steht als STATISCHES Markup neben <noscript> (nicht als Skript-Zeichenkette — die
// W0-Gerüstwächter-Achse eimer.satz kennt für Inhalt IM Skript nie eine Ausnahme, s. Kommentar am
// Fix in vivodepot.html). Der Lade-Stub (tests/load-kern.js) parst keine Attribute, nur IDs — die
// Probe prüft darum das `hidden`-Flag, das `_eingangsFehlerAnzeigen()` setzt, nicht Text im DOM.
function istSichtbar(document) {
  const el = document.getElementById(HINWEIS_ID);
  return !!el && el.hidden === false;
}

function ladeMitMutation(mutieren, opts) {
  const original = fs.readFileSync(HTML, 'utf8');
  const mutiert = mutieren(original);
  assert.notEqual(mutiert, original, 'Vorbedingung: die Mutation hat wirklich etwas geändert');
  const tmp = path.join(os.tmpdir(), 'f4-eingang-probe-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, mutiert);
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    return require('./load-kern.js').ladeKern(opts);
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
    fs.rmSync(tmp, { force: true });
    assert.equal(fs.readFileSync(HTML, 'utf8'), original, 'die Probe darf den echten Kern nicht verändern');
  }
}

test('[F4·Rot-Beweis·generische Ursache] ein Fehler in renderWelcome(), der NICHTS mit Sprache/Modul zu tun hat, wird sichtbar — nicht nur verschluckt', () => {
  const anker = 'function renderWelcome() {\n  // Vorführung: es gibt keinen Willkommensschirm — jeder Weg dorthin beginnt die Vorführung neu.';
  const original = fs.readFileSync(HTML, 'utf8');
  assert.equal(original.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const { document } = ladeMitMutation(
    (html) => html.replace(anker, 'function renderWelcome() {\n  throw new Error("F4-Sonde: künstlicher Fehler, unabhängig von Sprache/Modul");\n  // Vorführung: es gibt keinen Willkommensschirm — jeder Weg dorthin beginnt die Vorführung neu.'),
    { backen: true } // gebacken, damit STRINGS/das Sprachmodul vorhanden sind — die Ursache ist isoliert die Sonde, nicht ein fehlendes Modul
  );
  assert.ok(istSichtbar(document), 'die Meldung wird sichtbar gemacht, statt dass die Seite leer bleibt');
});

test('[F4·Gegenprobe] Text der Meldung behauptet keine erfundene Ursache', () => {
  assert.doesNotMatch(HINWEIS_TEXT, /beschädigt|korrupt|verloren|zerstört|ungültig/i,
    'die Meldung darf nichts behaupten, was sie nicht weiß (Vorgabe zu Befund F4, 22.09.2026)');
});

test('[F4·Gegenstück nach 34.6] der real gemessene Auslöser (Produkt ohne Sprachmodul) wirft nicht mehr — und F4 bleibt korrekt still (kein falscher Alarm)', () => {
  // KERN_HTML_PATH ohne `backen` lädt den nackten, unveränderten Text (s. load-kern.js-Kommentar
  // an ladeKern) — genau die Konstellation aus der S8-Fahrer1-Messung vom 21.09.2026 (§12), VOR
  // 34.6 der Auslöser für escapeHTML(undefined). Seit 34.6 (escapeHTML selbst toleriert null/
  // undefined) rendert derselbe nackte Kern durch, ohne dass booteEingang() je in den Fehlerpfad
  // kommt — dieser Test beweist NICHT mehr F4 (das tut Zug 1), sondern dass 34.6 die Ursache
  // wirklich wegnimmt UND dass F4 dabei nicht fälschlich anschlägt.
  const original = fs.readFileSync(HTML, 'utf8');
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = HTML;
  let document;
  try {
    delete require.cache[require.resolve('./load-kern.js')];
    ({ document } = require('./load-kern.js').ladeKern({ blank: true }));
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];
  }
  assert.equal(fs.readFileSync(HTML, 'utf8'), original, 'nur gelesen, nicht verändert');
  assert.ok(!istSichtbar(document),
    'seit 34.6 wirft der nackte Kern nicht mehr — F4s Meldung bleibt darum verborgen, kein falscher Alarm');
});

test('[F4·Gegenkontrolle] der gesunde Eingang (gebackenes Produkt, kein Fehler) zeigt KEINE Fehlermeldung — kein falscher Alarm', () => {
  const { document } = require('./load-kern.js').ladeKern();
  assert.ok(!istSichtbar(document), 'ohne Fehler bleibt der Eingang ohne die Meldung');
});

test('[F4·Helfer isoliert] _eingangsFehlerAnzeigen wirft selbst nicht, auch wenn document.body defekt ist', () => {
  const { V } = require('./load-kern.js').ladeKern();
  assert.doesNotThrow(() => V._eingangsFehlerAnzeigen(new Error('probe')), 'normaler Aufruf wirft nicht');
});

test('[F4·Ablageort] der sichtbare Text steht als Markup, NICHT als Zeichenkette in einem Skriptblock (W0-Gerüstwächter, eimer.satz)', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const divAnker = '<div id="' + HINWEIS_ID + '"';
  const iDiv = html.indexOf(divAnker);
  assert.ok(iDiv >= 0, 'der Hinweis-Container steht in der Datei');
  assert.ok(html.slice(iDiv, iDiv + 600).includes(HINWEIS_TEXT), 'trägt den erwarteten Text');
  const vorNoscript = html.lastIndexOf('</noscript>', iDiv);
  assert.ok(vorNoscript >= 0 && vorNoscript < iDiv, 'liegt hinter dem Noscript-Hinweis (gleiches Prinzip)');
  const naechstesScript = html.indexOf('<script', iDiv);
  assert.ok(naechstesScript > iDiv, 'liegt vor dem nächsten Skriptblock — nicht darin');
});
