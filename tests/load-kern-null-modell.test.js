'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Node-Harnisch liefert `null`, wenn es die ID nicht gibt
   „Die blinden Proben, neu geschnitten" (16.08.2026), Zug 2 Stufe D.
   Registerzeile A248.
   ────────────────────────────────────────────────────────────────────────────
   WAS HIER BEWACHT WIRD, und warum es eine eigene Datei ist: `tests/load-kern.js`
   ist der Harnisch, durch den fast die ganze Suite auf den Kern sieht. Fällt er
   auf „Phantom für jede ID" zurück, wird **keine einzige Probe rot** — sie
   werden nur alle blind gegen die häufigste DOM-Fehlerklasse: ein Element
   holen, das es nicht gibt, und ungeprüft weiterverwenden.

   Ein stiller Rückfall wäre also nicht als Fehlschlag zu sehen, sondern nur als
   plötzlich wieder grüne Menge von Proben, die vorher etwas gemessen haben. Das
   ist die Sorte Ausfall, gegen die dieses Projekt seine Positivkontrollen hat.

   DIE ZAHL, DIE DAZUGEHÖRT (16.08.2026): mit dem ehrlichen Modell fallen NULL
   Proben. Zwei frühere Anläufe nannten 378 und 261 — beide Zahlen waren
   Artefakte des Messmodells, das auch `document.documentElement` und
   `document.body` zu `null` machte. Beide sind im Browser nie `null`.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[A248] eine ID, die es im HTML nicht gibt, liefert `null` — nicht ein Phantom', () => {
  const { document: doc } = ladeKern();
  assert.ok(doc, 'Vorbedingung: der Harnisch reicht sein `document` heraus');
  assert.equal(doc.getElementById('gibt-es-garantiert-nicht-a248'), null,
    'Der Stub gibt wieder ein Phantom für jede ID zurück. Damit ist JEDE Probe blind gegen '
    + 'unbewachte DOM-Zugriffe — und keine einzige davon wird deshalb rot.');
});

test('[A248] eine ID, die es im HTML gibt, liefert weiterhin ein Element', () => {
  const { document: doc } = ladeKern();
  const el = doc.getElementById('app');
  assert.ok(el, '`app` ist eine echte ID der Anwendung und muss ein Element liefern');
  assert.ok(el.classList, 'und es muss brauchbar sein, nicht bloss wahrheitswertig');
});

test('[A248] `documentElement` und `body` sind nie null — sie tragen nur kein id-Attribut', () => {
  /* Genau diese zwei Fälle haben die zwei früheren Messungen verdorben. Ein
     Modell, das sie zu `null` macht, misst den eigenen Stub statt des Produkts. */
  const { document: doc } = ladeKern();
  assert.ok(doc.documentElement, 'documentElement darf nie null sein');
  assert.ok(doc.body, 'body darf nie null sein');
  assert.ok(doc.documentElement.style, 'und muss ein `style` tragen — daran hing der Irrtum');
});

test('[A248·Positivkontrolle] das Modell misst wirklich — eine fehlende echte ID bricht den Kern', () => {
  /* Ohne diese Probe wäre „null Fehlschläge" von „nichts gemessen" nicht zu
     unterscheiden. Gefahren wurde die Kontrolle am 16.08. über die ganze Suite:
     die echte ID `app` aus der Menge genommen → 198 Fehlschläge. Hier steht die
     kleine, schnelle Fassung derselben Aussage: der Kern greift ungeschützt auf
     mindestens ein per ID geholtes Element zu, und das ist auch richtig so —
     ein Element, das es geben MUSS, gehört nicht defensiv weggeschluckt. */
  const { document: doc } = ladeKern();
  const echt = doc.getElementById('app');
  assert.ok(echt, 'Vorbedingung: `app` ist vorhanden');
  assert.throws(() => { const fehlt = doc.getElementById('nicht-da-a248'); return fehlt.classList.add('x'); },
    /Cannot read properties of null|of null/,
    'Ein Zugriff auf ein fehlendes Element muss werfen — täte er das nicht, wäre die '
    + 'ganze Fehlerklasse weiterhin unsichtbar.');
});
