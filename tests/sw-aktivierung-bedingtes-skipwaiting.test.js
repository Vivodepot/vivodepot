'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Bedingtes skipWaiting (U2-ADR-190, 01.09.2026)
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-015 Etappe 8 sagt „skipWaiting bleibt aus" — als PAUSCHALE Regel.
   Dieser Bau wendet denselben Schutzgrund PRÄZISE an: aus, AUSSER wenn
   `_ungespeicherteAenderungen === 0` (derselbe Zähler, der Politik A/
   U2-ADR-103 trägt). Die Seite kennt den Zähler, der Worker nicht — die
   Seite entscheidet (`_swAktivierenWennMoeglich`, vivodepot.html), der
   Worker gehorcht nur (`message`-Handler, sw.js).

   ZWEI Proben, und die zweite ist die wichtigere — sie schützt die
   Sicherheitsentscheidung, die dieser Bau gerade anfasst: sie MUSS rot
   werden, wenn jemand später `_swAktivierenWennMoeglich` unbedingt macht
   (die Zähler-Prüfung entfernt oder umgeht).

   Seitenhälfte über `load-kern.js` (Node-Kontext, kein Browser nötig).
   Worker-Hälfte über eine minimale vm-Sandbox (Muster aus
   `sw-update-lieferweg.test.js`) — belegt die andere Seite desselben
   Handshakes: eine gesendete SKIP_WAITING-Nachricht ruft tatsächlich
   self.skipWaiting() im Worker auf, nichts anderes tut es.

   POSITIVKONTROLLE (von Hand gefahren, vor dieser Fassung, Beleg hier
   festgehalten): die Zähler-Prüfung in `_swAktivierenWennMoeglich`
   (`if (_ungespeicherteAenderungen === 0) { … }`) wurde testweise durch
   `if (true) { … }` ersetzt — die Probe „bei Zähler > 0 wird NICHT
   umgeschaltet" wurde ROT (`1 !== 0`), exakt an der erwarteten Stelle,
   danach die Datei zurückgesetzt, alle Proben wieder grün. Dieselbe
   Mutation liegt jetzt AUTOMATISIERT unten (Gegenprobe „[Negativprobe]
   entfernte Zähler-Prüfung") — Rotmachbarkeit ist damit Gate, nicht nur
   Erinnerung an einen Handgriff.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');

function macheWartendenWorker() {
  const nachrichten = [];
  return { waiting: { postMessage: (m) => nachrichten.push(m) }, _nachrichten: nachrichten };
}

/* ── Seite: _swAktivierenWennMoeglich ─────────────────────────────────── */

test('U2-ADR-190: bei Zähler 0 wird die Aktivierung angestossen (SKIP_WAITING gesendet)', () => {
  const { V } = ladeKern();
  assert.equal(typeof V._swAktivierenWennMoeglich, 'function', 'Vorbedingung: die Funktion existiert');
  assert.equal(V._ungespeicherteAnzahl(), 0, 'Vorbedingung: frischer Kern startet bei 0');
  const reg = macheWartendenWorker();
  V._swAktivierenWennMoeglich(reg);
  assert.equal(reg._nachrichten.length, 1, 'genau eine Nachricht wird an den wartenden Worker gesendet');
  assert.equal(reg._nachrichten[0].type, 'SKIP_WAITING', 'die richtige, benannte Anweisung');
});

test('U2-ADR-190: bei Zähler > 0 wird NICHT umgeschaltet (die Probe, die den Schutz trägt)', () => {
  const { V } = ladeKern();
  V.markiereUngespeichert();
  assert.ok(V._ungespeicherteAnzahl() > 0, 'Vorbedingung: es liegt etwas Ungesichertes vor');
  const reg = macheWartendenWorker();
  V._swAktivierenWennMoeglich(reg);
  assert.equal(reg._nachrichten.length, 0,
    'KEINE Nachricht — sonst würde mitten in offener, ungesicherter Arbeit umgeschaltet. ' +
    'Wird diese Probe rot, wurde die Zähler-Prüfung entfernt oder umgangen.');
});

/* ── Automatisierte Positivkontrolle: dieselbe Mutation, die von Hand lief ──
   Baut eine Wegwerf-Kopie von vivodepot.html mit GENAU der einen entfernten
   Zähler-Prüfung (`if (_ungespeicherteAenderungen === 0)` → `if (true)`),
   lädt sie über KERN_HTML_PATH (Muster aus `docx-streichung-gegenprobe.test.js`,
   `ladeMit`) und zeigt: OHNE die Prüfung sendet dieselbe Funktion die
   Aktivierungs-Nachricht auch bei offener, ungesicherter Arbeit — der Fall,
   den die Probe oben verhindern soll. */
function ladeMutiertenKern(mutiere) {
  const echtesHtml = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const mutiert = mutiere(echtesHtml);
  assert.notEqual(mutiert, echtesHtml, 'Vorbedingung: die Mutation muss wirklich etwas ändern');
  const tmp = path.join(os.tmpdir(), 'vivodepot-sw-mutiert-' + process.pid + '.html');
  fs.writeFileSync(tmp, mutiert, 'utf8');
  const zuvor = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = tmp;
  delete require.cache[require.resolve('./load-kern.js')];
  try {
    return { V: require('./load-kern.js').ladeKern().V, aufraeumen: () => fs.unlinkSync(tmp) };
  } finally {
    if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
    delete require.cache[require.resolve('./load-kern.js')];   // nächster require() sieht wieder das echte HTML
  }
}

test('[Negativprobe] U2-ADR-190: entfernte Zähler-Prüfung macht dieselbe Probe ROT', () => {
  const ZEILE_ECHT = 'if (_ungespeicherteAenderungen === 0) reg.waiting.postMessage';
  const ZEILE_MUTIERT = 'if (true) reg.waiting.postMessage';
  const { V, aufraeumen } = ladeMutiertenKern((html) => {
    assert.ok(html.includes(ZEILE_ECHT), 'Vorbedingung: die Zeile, die mutiert werden soll, muss so im echten HTML stehen');
    return html.replace(ZEILE_ECHT, ZEILE_MUTIERT);
  });
  try {
    V.markiereUngespeichert();
    assert.ok(V._ungespeicherteAnzahl() > 0, 'Vorbedingung: es liegt etwas Ungesichertes vor');
    const reg = macheWartendenWorker();
    V._swAktivierenWennMoeglich(reg);
    assert.equal(reg._nachrichten.length, 1,
      'BELEG: ohne die Zähler-Prüfung wird trotz offener, ungesicherter Arbeit umgeschaltet — ' +
      'genau der Fall, gegen den die Probe oben schützt. Zeigt sie hier 0 statt 1, hat die ' +
      'Mutation nicht gegriffen und der Rot-Beweis ist wertlos.');
  } finally {
    aufraeumen();
  }
});

test('U2-ADR-190: nach dem Sichern (Zähler zurück auf 0) wird derselbe Check erneut angestossen', () => {
  // Nicht nur "wird nicht blockiert" — der Bürgertext verspricht "sichern Sie, DANN wird sie
  // übernommen": das muss beim Sichern selbst passieren, nicht erst beim nächsten Fokus-Wechsel.
  // Hier ohne echten navigator.serviceWorker (Node-Kontext) — die Probe belegt nur, dass
  // markiereGespeichert() den Zähler zurücksetzt und dabei nicht wirft, wenn kein SW da ist.
  const { V } = ladeKern();
  V.markiereUngespeichert();
  assert.ok(V._ungespeicherteAnzahl() > 0);
  assert.doesNotThrow(() => V.markiereGespeichert());
  assert.equal(V._ungespeicherteAnzahl(), 0, 'Zähler ist zurück auf 0 — der nächste Check darf jetzt aktivieren');
});

test('U2-ADR-190: ohne wartenden Worker passiert nichts (kein Fehler, keine Nachricht)', () => {
  const { V } = ladeKern();
  assert.doesNotThrow(() => V._swAktivierenWennMoeglich(null));
  assert.doesNotThrow(() => V._swAktivierenWennMoeglich({ waiting: null }));
});

/* ── Worker: sw.js gehorcht NUR der benannten Anweisung ───────────────── */

const SW_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

function ladeSWFuerNachricht() {
  const handlers = {};
  const skipWaitingCalls = [];
  const sandbox = {
    caches: { open: async () => ({ add: async () => {}, put: async () => {}, match: async () => undefined }),
              keys: async () => [], delete: async () => true, match: async () => undefined },
    fetch: async () => ({ ok: true }),
    URL, Promise, console, Map,
    self: {
      addEventListener: (typ, fn) => { handlers[typ] = fn; },
      location: { origin: 'https://vivodepot.example' },
      clients: { claim: async () => {} },
      skipWaiting: () => { skipWaitingCalls.push(1); },
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SW_QUELLE, sandbox, { filename: 'sw.js' });
  return { handlers, skipWaitingCalls };
}

test('U2-ADR-190: message SKIP_WAITING ruft self.skipWaiting() auf', () => {
  const { handlers, skipWaitingCalls } = ladeSWFuerNachricht();
  assert.equal(typeof handlers.message, 'function', 'message-Handler ist registriert');
  handlers.message({ data: { type: 'SKIP_WAITING' } });
  assert.equal(skipWaitingCalls.length, 1, 'skipWaiting wird genau einmal gerufen');
});

test('U2-ADR-190: eine andere/fehlende Nachricht ruft KEIN skipWaiting() auf', () => {
  const { handlers, skipWaitingCalls } = ladeSWFuerNachricht();
  handlers.message({ data: { type: 'ETWAS_ANDERES' } });
  handlers.message({ data: null });
  handlers.message({});
  assert.equal(skipWaitingCalls.length, 0, 'nur die benannte Anweisung löst skipWaiting aus, nichts sonst');
});
