'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/shl-abruf-messen.js: die Einordnung einer Host-Antwort

   Zwei Aufgaben, und die zweite ist die wichtigere:

   1. Deckung für `abrufEinordnen` — die reine Funktion, an der hängt, ob
      Gazelle-Teststep 50 (REQUEST_DOCUMENT : HTTP) erfüllbar ist. Vier Lagen:
      Datei direkt, HTML-Zwischenseite, JSON-Hülle, weg (404).

   2. WÄCHTER GEGEN „Werkzeug handelt beim Import". Am 09.09.2026 startete ein
      blosses `require()` auf tools/shl-belegstrecke.js den ganzen Lauf — Chromium
      hoch, Ordner im geteilten Hauptbaum. Nichts im Repo läuft über alle
      tools/*.js, also hatte der Fehler keinen Wächter. Ein Test, der das Modul
      LÄDT, ist der Wächter: fährt das Werkzeug beim Import los, feuert es hier
      mitten in der Suite und fällt sofort auf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const WERKZEUGE = ['shl-abruf-messen.js', 'shl-belegstrecke.js', 'shl-empfangen-probe.js', 'shl-manifest-probe.js'];   // die zwei Proben seit 26.09.2026: die empfangen-probe legt beim Lauf eine echte Freigabe an
const { abrufEinordnen } = require(path.join(__dirname, '..', 'tools', 'shl-abruf-messen.js'));

test('[Import-Wächter] die Werkzeuge tun beim blossen require() nichts', async () => {
  // Drei Fassungen davor waren untauglich, jede an einer Gegenprobe gemessen, nicht vermutet:
  //   1. „require kehrt zurück" — GRÜN gegen ein losfahrendes Werkzeug. `main()` ist asynchron.
  //   2. `process.stdout.write` mithören — ROT für ALLE. Der Testrunner schickt sein eigenes
  //      Protokoll über denselben Kanal.
  //   3. `process.exitCode` vergleichen — GRÜN gegen ein losfahrendes Werkzeug. Unter
  //      `node --test` steht der Exit-Code schon vorher auf 0, also fällt die Änderung auf 0
  //      nicht auf.
  // Was trägt: `console.log`/`console.error` mithören. Der Runner benutzt sie nicht, jedes
  // dieser Werkzeuge schon — es meldet, was es misst. Dazu Zeit und Ausgabeordner, denn die
  // Belegstrecke startet einen Browser.
  const AUSGABE_STANDARD = path.join(__dirname, '..', 'belegstrecke-ausgabe');

  for (const name of WERKZEUGE) {
    const p = path.join(__dirname, '..', 'tools', name);
    const echtLog = console.log;
    const echtErr = console.error;
    let mitgehoert = '';
    console.log = (...a) => { mitgehoert += a.join(' ') + '\n'; };
    console.error = (...a) => { mitgehoert += a.join(' ') + '\n'; };

    // OHNE das hier ist der ganze Wächter wertlos: Zeile 1 dieser Datei hat
    // shl-abruf-messen.js bereits geladen. Ein zweites require() bedient nur den Cache
    // und führt NICHTS aus — der Test wäre grün, egal wie das Werkzeug gebaut ist.
    delete require.cache[require.resolve(p)];

    let gedauert;
    try {
      const t0 = Date.now();
      require(p);
      await new Promise((f) => setTimeout(f, 250));    // Ereignisschlange leeren lassen
      gedauert = Date.now() - t0;
    } finally {
      console.log = echtLog;
      console.error = echtErr;
    }

    assert.equal(mitgehoert, '',
      name + ' hat beim blossen Import gemeldet — es ist gefahren:\n' + mitgehoert.slice(0, 200));
    assert.ok(gedauert < 3000,
      name + ' braucht beim Import ' + gedauert + ' ms — das ist ein Lauf, kein Import');
  }

  assert.equal(fs.existsSync(AUSGABE_STANDARD), false,
    'Der Import hat ' + AUSGABE_STANDARD + ' angelegt — ein Werkzeug ist beim Laden losgefahren');
});

test('[Teststep 50] Direkt-GET mit JWE compact → erfüllbar', () => {
  const b = abrufEinordnen({ status: 200, contentType: 'application/jose', koerper: 'eyJhbGciOiJkaXIifQ..aXYtaGllcg.Y2hpZmZyZQ.dGFn' });
  assert.equal(b.lage, 'datei-direkt');
  assert.equal(b.schritt50, true);
});

test('[Teststep 50] HTML-Zwischenseite → NICHT erfüllbar', () => {
  const b = abrufEinordnen({ status: 200, contentType: 'text/html; charset=utf-8', koerper: '<!doctype html><button>Herunterladen</button>' });
  assert.equal(b.lage, 'html-zwischenseite');
  assert.equal(b.schritt50, false);
});

test('[One-Time] zweiter Abruf 404 → weg', () => {
  const b = abrufEinordnen({ status: 404, contentType: 'text/html', koerper: '' });
  assert.equal(b.lage, 'weg');
  assert.equal(b.schritt50, false);
});

test('[Abgrenzung] JSON-Hülle ist nicht das Dokument', () => {
  const b = abrufEinordnen({ status: 200, contentType: 'application/json', koerper: '{"files":[]}' });
  assert.equal(b.lage, 'json');
  assert.equal(b.schritt50, false);
});

test('[Gegenprobe] eine JWE mit vier statt fünf Teilen gilt NICHT als Datei', () => {
  const b = abrufEinordnen({ status: 200, contentType: 'application/jose', koerper: 'eyJhbGciOiJkaXIifQ..aXYtaGllcg.Y2hpZmZyZQ' });
  assert.notEqual(b.lage, 'datei-direkt');
  assert.equal(b.schritt50, false);
});
