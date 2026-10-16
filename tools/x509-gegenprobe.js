#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   x509-gegenprobe.js — Gegenprobe zum X.509-Leser außerhalb des Kerns: dieselben x509-limbo-Ketten mit `openssl verify`
   ────────────────────────────────────────────────────────────────────────────
   Auflage (c) zur Entscheidung 15.10.2026 „eigener Leser": die Pfadprüfung wird zusätzlich gegen eine unabhängige
   Umsetzung gehalten, ein Werkzeug im Repo, nicht im Kern. Es fährt jeden Fall der gepinnten Auswahl
   (tests/konformitaet/vectors/x509-limbo/) mit openssl verify und schreibt eine Vergleichsdatei: limbo erwartet, openssl
   sagt, und — mit --mit-leser — was der Leser des Kerns sagt (über tests/lib/x509-limbo-lauf.js, dieselbe Lesart wie
   tests/x509-limbo.test.js).

   openssl-Aufruf je Fall:
     openssl verify -x509_strict -partial_chain -attime <sekunden> [-verify_hostname <name>]
                    -CAfile <anker.pem> [-untrusted <vorrat.pem>] <blatt.pem>
   -partial_chain: die Ankerliste ist die Vertrauensbasis, wie im Kern — ein Anker muss nicht selbst signiert sein.
   Kein -purpose: der Leser prüft die EKU nach eigener Regel (_X509_EKU_ERLAUBT), nicht nach dem TLS-Zweck.
   openssl baut Pfade selbst (der Leser nimmt x5c geordnet); Unterschiede daraus stehen in der Vergleichsdatei, sie sind
   nicht von selbst ein Fehler des einen oder anderen.

   Aufruf: node tools/x509-gegenprobe.js [--datei umfang.json|ausserhalb.json] [--openssl <pfad>] [--mit-leser]
                                         [--ausgabe <vergleich.json>]
           Vorgabe: umfang.json, openssl aus $OPENSSL oder PATH; ohne --ausgabe nur die Zusammenfassung auf stdout.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const L = require('../tests/lib/x509-limbo-lauf.js');

function argumente(argv) {
  const a = { datei: 'umfang.json', openssl: process.env.OPENSSL || 'openssl', mitLeser: false, ausgabe: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--datei') a.datei = argv[++i];
    else if (argv[i] === '--openssl') a.openssl = argv[++i];
    else if (argv[i] === '--mit-leser') a.mitLeser = true;
    else if (argv[i] === '--ausgabe') a.ausgabe = path.resolve(argv[++i]);
    else throw new Error('unbekanntes Argument: ' + argv[i]);
  }
  return a;
}

const pem = (b64) => '-----BEGIN CERTIFICATE-----\n' + b64.replace(/(.{64})/g, '$1\n').replace(/\n?$/, '\n') + '-----END CERTIFICATE-----\n';

function opensslFall(openssl, tmp, tabelle, fall) {
  const anker = path.join(tmp, 'anker.pem'), vorrat = path.join(tmp, 'vorrat.pem'), blatt = path.join(tmp, 'blatt.pem');
  fs.writeFileSync(anker, fall.anker.map((id) => pem(tabelle[id])).join(''));
  fs.writeFileSync(blatt, pem(tabelle[fall.blatt]));
  const args = ['verify', '-x509_strict', '-partial_chain', '-attime', String(Math.floor(Date.parse(fall.zeit) / 1000))];
  if (fall.namensArt === 'DNS' && fall.name) args.push('-verify_hostname', fall.name);
  args.push('-CAfile', anker);
  if (fall.zwischen.length) { fs.writeFileSync(vorrat, fall.zwischen.map((id) => pem(tabelle[id])).join('')); args.push('-untrusted', vorrat); }
  args.push(blatt);
  const r = spawnSync(openssl, args, { encoding: 'utf8' });
  if (r.error) throw r.error;
  const meldung = (r.stderr || '').split('\n').find((z) => /^error \d+/.test(z)) || (r.stderr || r.stdout || '').trim().split('\n')[0] || '';
  return { angenommen: r.status === 0, meldung: r.status === 0 ? 'OK' : meldung.replace(tmp, '<tmp>') };
}

async function main() {
  const a = argumente(process.argv.slice(2));
  const { daten } = L.auswahlLesen(a.datei);
  const version = spawnSync(a.openssl, ['version'], { encoding: 'utf8' }).stdout.trim();
  let K = null;
  if (a.mitLeser) {
    const { ladeKern } = require('../tests/load-kern.js');
    K = ladeKern({ zusatzBindungen: ['_x509Lesen', '_x509KettePruefen', '_x509ClientIdBinden'] }).V.__zusatz;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'x509-gegenprobe-'));
  const zeilen = [];
  try {
    for (const fall of daten.faelle) {
      const o = opensslFall(a.openssl, tmp, daten.zertifikate, fall);
      const z = { id: fall.id, art: fall.art, erwartet: fall.erwartet, openssl: o.angenommen ? 'SUCCESS' : 'FAILURE', opensslMeldung: o.meldung };
      if (K) { const l = await L.fallFahren(K, daten.zertifikate, fall); z.leser = l.angenommen ? 'SUCCESS' : 'FAILURE'; z.leserGrund = l.grund; }
      zeilen.push(z);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const zaehl = (f) => zeilen.filter(f).length;
  const zusammen = {
    datei: a.datei, commit: daten.commit, openssl: version, faelle: zeilen.length,
    opensslWieLimbo: zaehl((z) => z.openssl === z.erwartet),
    opensslNimmtFailureAn: zeilen.filter((z) => z.erwartet === 'FAILURE' && z.openssl === 'SUCCESS').map((z) => z.id),
    opensslWeistSuccessAb: zeilen.filter((z) => z.erwartet === 'SUCCESS' && z.openssl === 'FAILURE').map((z) => z.id + ' — ' + z.opensslMeldung),
  };
  if (K) {
    zusammen.leserWieLimbo = zaehl((z) => z.leser === z.erwartet);
    zusammen.leserWieOpenssl = zaehl((z) => z.leser === z.openssl);
    zusammen.leserUngleichOpenssl = zeilen.filter((z) => z.leser !== z.openssl).map((z) => z.id + ' — limbo ' + z.erwartet + ', openssl ' + z.openssl + ', Leser ' + z.leser + (z.leserGrund ? ' (' + z.leserGrund + ')' : ''));
  }
  if (a.ausgabe) fs.writeFileSync(a.ausgabe, JSON.stringify({ zusammen, zeilen }, null, 1) + '\n');
  process.stdout.write(JSON.stringify(zusammen, null, 1) + '\n');
}

if (require.main === module) main().catch((e) => { process.stderr.write(String(e && e.stack || e) + '\n'); process.exit(1); });
module.exports = { opensslFall };
