#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   x509-limbo-voll-messen.js — ALLE FAILURE-Fälle von x509-limbo gegen den X.509-Leser des Kerns (15.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Suite fährt aus bettertls nur jeden 50. Fall mit nameConstraints (tests/x509-limbo.test.js; die volle Datei hat 42 MB
   und gehört nicht ins Repo). Dieses Werkzeug fährt die ganze gepinnte limbo.json: jeden FAILURE-Fall jeder Gruppe, über
   denselben Lauf wie die Probe (tests/lib/x509-limbo-lauf.js), und zählt, was der Leser annimmt.

   Aufruf: node tools/x509-limbo-voll-messen.js --limbo <limbo.json> [--aus <ergebnis.json>]
             --limbo  die Datei am gepinnten Commit (Abrufweg: tests/konformitaet/vectors/x509-limbo/README.md); ihre sha256
                      wird VOR dem Lauf gegen LIMBO_SHA256 geprüft, eine andere Datei wird nicht gefahren
             --aus    schreibt das Ergebnis als JSON (Zahlen je Gruppe, jeder angenommene Fall, Gründe, Laufzeit)
           ohne --limbo: die gepinnte Auswahl im Repo (umfang.json + ausserhalb.json, darin die bettertls-Stichprobe) —
           so deckt die Suite das Werkzeug selbst (Probe: tests/x509-limbo-voll-messen.test.js).
   Ein angenommener FAILURE-Fall ist hier eine Zeile zum Bewerten; ob er ein Befund ist, entscheidet die Einteilung
   (im Umfang, bewusst anders, Produktregel) in tests/x509-limbo.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const L = require('../tests/lib/x509-limbo-lauf.js');
const { LIMBO_SHA256, ZEIT_ERSATZ } = require('./x509-limbo-umfang-erzeugen.js');

function argumente(argv) {
  const a = { limbo: null, aus: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limbo') a.limbo = argv[++i];
    else if (argv[i] === '--aus') a.aus = path.resolve(argv[++i]);
    else throw new Error('unbekanntes Argument: ' + argv[i]);
  }
  return a;
}

/* Die volle limbo.json in die Form der Auswahl: Zertifikate je einmal, Fälle mit Verweisen. Nur FAILURE. */
function ausLimbo(datei) {
  const roh = fs.readFileSync(datei);
  const s = crypto.createHash('sha256').update(roh).digest('hex');
  if (s !== LIMBO_SHA256) throw new Error('limbo.json hat sha256 ' + s + ', gepinnt ist ' + LIMBO_SHA256 + ' — nicht gefahren');
  const zertifikate = {};
  const merke = (pem) => {
    const der = Buffer.from(String(pem).replace(/-----[A-Z0-9 ]+-----/g, '').replace(/\s+/g, ''), 'base64');
    const id = crypto.createHash('sha256').update(der).digest('hex').slice(0, 20);
    zertifikate[id] = der.toString('base64');
    return id;
  };
  const faelle = JSON.parse(roh.toString('utf8')).testcases.filter((t) => t.expected_result === 'FAILURE').map((t) => ({
    id: t.id, gruppe: t.id.split('::')[0], erwartet: 'FAILURE', zeit: t.validation_time || ZEIT_ERSATZ,
    name: t.expected_peer_name ? t.expected_peer_name.value : null, namensArt: t.expected_peer_name ? t.expected_peer_name.kind : null,
    anker: t.trusted_certs.map(merke), zwischen: t.untrusted_intermediates.map(merke), blatt: merke(t.peer_certificate),
  }));
  return { quelle: 'limbo.json ' + s, teile: [{ zertifikate, faelle }] };
}
function ausAuswahl() {
  const teile = ['umfang.json', 'ausserhalb.json'].map((d) => {
    const x = L.auswahlLesen(d).daten;
    return { zertifikate: x.zertifikate, faelle: x.faelle.filter((f) => f.erwartet === 'FAILURE') };
  });
  return { quelle: 'Auswahl im Repo (tests/konformitaet/vectors/x509-limbo/)', teile };
}

async function main(argv = [], { K } = {}) {
  const a = argumente(argv);
  const daten = a.limbo ? ausLimbo(a.limbo) : ausAuswahl();
  if (!K) {
    const { ladeKern } = require('../tests/load-kern.js');
    K = ladeKern({ zusatzBindungen: ['_x509Lesen', '_x509KettePruefen', '_x509ClientIdBinden'] }).V.__zusatz;
  }
  const t0 = process.hrtime.bigint();
  const jeGruppe = {}, gruende = {}, angenommen = [];
  let faelle = 0;
  for (const teil of daten.teile) {
    for (const fall of teil.faelle) {
      const g = fall.gruppe || fall.id.split('::')[0];
      const r = await L.fallFahren(K, teil.zertifikate, fall);
      const z = jeGruppe[g] = jeGruppe[g] || { failure: 0, angenommen: 0 };
      z.failure++; faelle++;
      if (r.angenommen) { z.angenommen++; angenommen.push({ id: fall.id, gruppe: g, versuche: r.versuche }); }
      else gruende[r.grund || '(ohne Grund)'] = (gruende[r.grund || '(ohne Grund)'] || 0) + 1;
    }
  }
  const sekunden = Number(process.hrtime.bigint() - t0) / 1e9;
  const ergebnis = { quelle: daten.quelle, faelle, angenommen: angenommen.length, jeGruppe, gruende, angenommeneFaelle: angenommen, sekunden };
  if (a.aus) fs.writeFileSync(a.aus, JSON.stringify(ergebnis, null, 1) + '\n');
  return ergebnis;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((e) => {
    process.stdout.write('[x509-limbo-voll] ' + e.quelle + ': ' + e.faelle + ' FAILURE-Fälle, angenommen ' + e.angenommen + ', '
      + e.sekunden.toFixed(1) + ' s\n');
    for (const [g, z] of Object.entries(e.jeGruppe)) process.stdout.write('  ' + g + ': ' + z.failure + ' gefahren, ' + z.angenommen + ' angenommen\n');
  }).catch((err) => { process.stderr.write(String(err && err.stack || err) + '\n'); process.exit(1); });
}
module.exports = { main, ausLimbo, ausAuswahl };
