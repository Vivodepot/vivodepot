#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Werkzeug — Probe für den SHL-MANIFEST-Weg am Ablage-Host.

   WARUM ES DAS GIBT: der Ablage-Host (U2-ADR-183) liegt in einem anderen
   Repository und hat dort NULL Testabdeckung — kein Test nennt `holen.php`
   oder `hochladen.php`, und `.git/hooks` enthält dort nur `*.sample`
   (gemessen 21.09.2026). Der Manifest-Weg wird einem EU-Projektpartner als
   Fähigkeit zugesagt. Eine zugesagte Fähigkeit, die niemand nachfahren kann,
   ist genau die Form, die dieses Haus herausnimmt.

   WAS SIE PRÜFT — gegen eine WEGWERF-KOPIE der Host-Dateien mit frischer
   SQLite in einem Temp-Ordner. Die Live-Ablage wird NIE berührt, es geht
   kein einziger Netzaufruf hinaus.

     1  OPTIONS-Preflight → 204 mit Allow-Methods/Allow-Headers
        (ein POST mit content-type: application/json ist preflight-pflichtig;
         ohne diese Antwort scheitert JEDER Browser-Reader)
     2  Manifest-Kennung trägt 256 Bit (64 Hex) — Spec-Anforderung an die
        Manifest-URL, und die Adresse bleibt unter 128 Zeichen
     3  POST ohne `recipient` → 400 (Client-Fehler, NICHT 404)
     4  POST mit `recipient` → 200, `status: finalized`, files[0].embedded
        ist byte-genau die hochgeladene JWE
     5  Zweiter POST → 404: die Freigabe ist verbraucht (One-Time hält)
     6  `embeddedLengthMax` unter der Nutzlastgröße → `location` statt
        `embedded`, und der POST verbraucht dann NICHT — erst der GET auf
        holen.php tut es. Genau EIN Verbrauchspunkt je Freigabe.
     7  Der U-Flag-Weg (holen.php) bleibt unverändert: GET 200, zweiter 404

   Aufruf:
     node tools/shl-manifest-probe.js --host <pfad-zu-ablage-vorbereitung>
     node tools/shl-manifest-probe.js        (ohne --host: UNGEMESSEN, Exit 0)

   OHNE erreichbaren Host oder ohne PHP meldet sie UNGEMESSEN und endet mit
   Exit 0 — dieselbe Fehlerklasse-Behandlung wie
   `tests/konformitaet/externe-validatoren.mjs` bei fehlendem Validator: ein
   Werkzeugmangel darf kein Gate blockieren, aber er darf auch nicht als
   „grün" durchgehen. Ein echter Verstoß dagegen ist ROT (Exit 1).
   ════════════════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');

/* Die Host-Dateien (PHP) liegen NICHT in diesem Repo, sondern bei der Website. Eine Vorgabe auf einen
   Heimatpfad in einem anderen Repo gibt es darum nicht mehr (sie zeigte seit der Umbenennung
   Documents/GitHub → VD-GitHub ohnehin ins Leere): ohne --host meldet die Probe UNGEMESSEN. */
const STANDARD_HOST = null;
const DATEIEN = ['gemeinsam.php', 'hochladen.php', 'holen.php', 'manifest.php'];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

function phpBinaer() {
  for (const k of ['/opt/homebrew/opt/php/bin/php', '/opt/homebrew/bin/php', '/usr/bin/php', 'php']) {
    const r = spawnSync(k, ['-v'], { encoding: 'utf8' });
    if (r.status === 0) return k;
  }
  return null;
}

function ungemessen(grund) {
  console.log('⚠ UNGEMESSEN — ' + grund);
  console.log('  Kein Verstoß festgestellt, aber auch nichts geprüft. Nicht als grün lesen.');
  process.exit(0);
}

const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Baut eine echte JWE compact (dir/A256GCM) — dieselbe Form, die der Kern erzeugt. */
function jweBauen(klartext) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const kopf = b64u(JSON.stringify({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }));
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(kopf, 'ascii'));
  const ct = Buffer.concat([c.update(Buffer.from(klartext, 'utf8')), c.final()]);
  return `${kopf}..${b64u(iv)}.${b64u(ct)}.${b64u(c.getAuthTag())}`;
}

const proben = [];
function pruefe(name, bedingung, hinweis) {
  proben.push({ name, ok: !!bedingung, hinweis: hinweis || '' });
  console.log(`  ${bedingung ? '✔' : '✖'} ${name}${bedingung ? '' : '  — ' + (hinweis || '')}`);
}

async function main() {
  const hostPfad = arg('--host', STANDARD_HOST);
  if (!hostPfad) ungemessen('kein --host angegeben (die Host-Dateien liegen nicht in diesem Repo)');
  const fehlend = DATEIEN.filter(d => !fs.existsSync(path.join(hostPfad, d)));
  if (fehlend.length) ungemessen('Host-Dateien nicht gefunden in ' + hostPfad + ' (' + fehlend.join(', ') + ')');

  const php = phpBinaer();
  if (!php) ungemessen('kein PHP auf dieser Maschine (brew install php)');

  // Wegwerf-Kopie: eigener Ordner, eigene SQLite. Die Live-Ablage bleibt unberührt.
  const baum = fs.mkdtempSync(path.join(os.tmpdir(), 'shl-manifest-probe-'));
  for (const d of DATEIEN) fs.copyFileSync(path.join(hostPfad, d), path.join(baum, d));
  fs.mkdirSync(path.join(baum, 'daten'), { recursive: true });

  const port = 8000 + Math.floor(Math.random() * 1000);
  const server = spawn(php, ['-S', `127.0.0.1:${port}`, '-t', baum], { cwd: baum, stdio: 'ignore' });
  const basis = `http://127.0.0.1:${port}`;
  // Server beenden UND die Wegwerf-Kopie löschen — auch bei process.exit (UNGEMESSEN, ROT), darum am 'exit'.
  const aufraeumen = () => {
    try { server.kill(); } catch (e) { /* egal */ }
    try { fs.rmSync(baum, { recursive: true, force: true }); } catch (e) { /* egal */ }
  };
  process.on('exit', aufraeumen);

  // Auf den Server warten, statt blind zu schlafen.
  let bereit = false;
  for (let i = 0; i < 50 && !bereit; i++) {
    try { await fetch(basis + '/holen.php?t=x'); bereit = true; }
    catch (e) { await new Promise(r => setTimeout(r, 100)); }
  }
  if (!bereit) { aufraeumen(); ungemessen('eingebauter PHP-Server kam nicht hoch'); }

  console.log('Probe gegen ' + hostPfad);
  console.log('  Wegwerf-Kopie: ' + baum + '  (Live-Ablage unberührt, kein Netzaufruf)\n');

  const klartext = JSON.stringify({ resourceType: 'Bundle', id: 'probe-manifest', type: 'document', entry: [] });
  const jwe = jweBauen(klartext);

  /* ── Hochladen: liefert beide Adressen ───────────────────────────────── */
  const form = new FormData();
  form.append('datei', new Blob([jwe], { type: 'application/jose' }), 'probe.jwe');
  const hoch = await (await fetch(basis + '/hochladen.php', { method: 'POST', body: form })).json();
  const mtoken = String(hoch.manifest_url || '').split('m=')[1] || '';
  const dtoken = String(hoch.url || '').split('t=')[1] || '';

  pruefe('Hochladen liefert eine Manifest-Adresse', !!mtoken, JSON.stringify(hoch));
  pruefe('Manifest-Kennung trägt 256 Bit (64 Hex)', /^[a-f0-9]{64}$/.test(mtoken), 'ist: ' + mtoken.length + ' Zeichen');
  pruefe('Manifest-Adresse bleibt unter 128 Zeichen',
    String(hoch.manifest_url || '').length <= 128, String(hoch.manifest_url || '').length + ' Zeichen');

  /* ── 1 · Preflight ───────────────────────────────────────────────────── */
  const vor = await fetch(`${basis}/manifest.php?m=${mtoken}`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://viewer.example.org', 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type' },
  });
  pruefe('OPTIONS-Preflight antwortet 204', vor.status === 204, 'Status ' + vor.status);
  pruefe('Preflight erlaubt POST', /POST/i.test(vor.headers.get('access-control-allow-methods') || ''),
    'Allow-Methods: ' + vor.headers.get('access-control-allow-methods'));
  pruefe('Preflight erlaubt Content-Type', /content-type/i.test(vor.headers.get('access-control-allow-headers') || ''),
    'Allow-Headers: ' + vor.headers.get('access-control-allow-headers'));

  /* ── 3 · recipient ist Pflicht ───────────────────────────────────────── */
  const ohne = await fetch(`${basis}/manifest.php?m=${mtoken}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}),
  });
  pruefe('POST ohne recipient → 400 (nicht 404)', ohne.status === 400, 'Status ' + ohne.status);

  /* ── 4 · Der eigentliche Weg ─────────────────────────────────────────── */
  const antwort = await fetch(`${basis}/manifest.php?m=${mtoken}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recipient: 'Probe-Empfänger' }),
  });
  const manifest = await antwort.json().catch(() => ({}));
  pruefe('POST mit recipient → 200', antwort.status === 200, 'Status ' + antwort.status);
  pruefe('CORS-Kopf auch auf der Antwort', antwort.headers.get('access-control-allow-origin') === '*');
  pruefe('status ist "finalized"', manifest.status === 'finalized', JSON.stringify(manifest.status));
  pruefe('genau eine Datei im Manifest', Array.isArray(manifest.files) && manifest.files.length === 1);
  pruefe('embedded ist byte-genau die hochgeladene JWE',
    manifest.files && manifest.files[0] && manifest.files[0].embedded === jwe);
  pruefe('contentType nennt FHIR R4',
    !!(manifest.files && manifest.files[0] && /application\/fhir\+json/.test(manifest.files[0].contentType || '')),
    manifest.files && manifest.files[0] ? manifest.files[0].contentType : '—');

  /* ── 5 · One-Time hält ───────────────────────────────────────────────── */
  const zweit = await fetch(`${basis}/manifest.php?m=${mtoken}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recipient: 'Probe-Empfänger' }),
  });
  pruefe('Zweiter POST → 404 (Freigabe verbraucht)', zweit.status === 404, 'Status ' + zweit.status);
  const nachher = await fetch(`${basis}/holen.php?t=${dtoken}`);
  pruefe('Auch der Direkt-GET ist danach tot (EIN Verbrauchspunkt)', nachher.status === 404, 'Status ' + nachher.status);

  /* ── 6 · embeddedLengthMax erzwingt location, und der POST verbraucht NICHT ── */
  const form2 = new FormData();
  form2.append('datei', new Blob([jwe], { type: 'application/jose' }), 'probe2.jwe');
  const hoch2 = await (await fetch(basis + '/hochladen.php', { method: 'POST', body: form2 })).json();
  const m2 = String(hoch2.manifest_url || '').split('m=')[1];
  const t2 = String(hoch2.url || '').split('t=')[1];
  const klein = await fetch(`${basis}/manifest.php?m=${m2}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recipient: 'Probe-Empfänger', embeddedLengthMax: 10 }),
  });
  const manifest2 = await klein.json().catch(() => ({}));
  const eintrag2 = (manifest2.files || [])[0] || {};
  pruefe('embeddedLengthMax → location statt embedded', !!eintrag2.location && !eintrag2.embedded,
    JSON.stringify(eintrag2).slice(0, 120));
  const holen2 = await fetch(`${basis}/holen.php?t=${t2}`);
  pruefe('location-Weg: der GET liefert noch (POST hat NICHT verbraucht)', holen2.status === 200, 'Status ' + holen2.status);
  pruefe('location-Weg: der zweite GET ist tot', (await fetch(`${basis}/holen.php?t=${t2}`)).status === 404);

  /* ── 7 · Der U-Flag-Weg bleibt, wie er war ───────────────────────────── */
  const form3 = new FormData();
  form3.append('datei', new Blob([jwe], { type: 'application/jose' }), 'probe3.jwe');
  const hoch3 = await (await fetch(basis + '/hochladen.php', { method: 'POST', body: form3 })).json();
  const t3 = String(hoch3.url || '').split('t=')[1];
  const u1 = await fetch(`${basis}/holen.php?t=${t3}`);
  pruefe('U-Flag-Weg unverändert: erster GET 200', u1.status === 200, 'Status ' + u1.status);
  pruefe('U-Flag-Weg unverändert: Körper ist die JWE', (await u1.text()).trim() === jwe);
  pruefe('U-Flag-Weg unverändert: zweiter GET 404', (await fetch(`${basis}/holen.php?t=${t3}`)).status === 404);

  /* ── Mitschrift für den Suite-Wächter (tools/shl-host-pruefen.js) ──────────────────────
     Aufgezeichnet aus einem EIGENEN, vierten Durchlauf, damit die oben verbrauchten
     Freigaben die Zahlen nicht verfälschen. `_zweck` sagt ausdrücklich, woher sie stammt:
     eine Wegwerf-Kopie, nicht der Live-Host — nach dem Deployment wird sie ersetzt. */
  const mitschriftZiel = arg('--mitschrift', null);
  if (mitschriftZiel) {
    const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
    const f4 = new FormData();
    f4.append('datei', new Blob([jwe], { type: 'application/jose' }), 'mitschrift.jwe');
    const h4 = await (await fetch(basis + '/hochladen.php', { method: 'POST', body: f4 })).json();
    const m4 = String(h4.manifest_url || '').split('m=')[1];
    const ohne4 = await fetch(`${basis}/manifest.php?m=${m4}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const mit4 = await fetch(`${basis}/manifest.php?m=${m4}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient: 'Mitschrift' }) });
    const mAntwort = await mit4.json().catch(() => ({}));
    const pre4 = await fetch(`${basis}/manifest.php?m=${m4}`, { method: 'OPTIONS' });

    const mitschrift = {
      _zweck: 'Manifest-Weg mit embedded, aufgezeichnet am ' + new Date().toISOString().slice(0, 10)
        + ' aus einer WEGWERF-KOPIE der Host-Dateien (eigener PHP-Server, frische SQLite), NICHT vom '
        + 'Live-Host — der Endpunkt war zu diesem Zeitpunkt noch nicht deployt. Nach dem Deployment '
        + 'durch eine echte Aufzeichnung ersetzen. ABWEICHUNG zu den hand geschriebenen Fixtures: '
        + 'der Upload liefert ZWEI Adressen (url = Direkt-GET, manifest_url = Manifest), und die '
        + 'Manifest-Adresse trägt den Parameter `m`, nicht `t` — der Datei-Token und die '
        + 'Manifest-Kennung sind verschiedene Kennungen mit verschiedener Entropie (192 bzw. 256 Bit).',
      hochgeladenSha256: sha(jwe),
      upload: { status: 200, antwort: { url: h4.url, manifest_url: h4.manifest_url, ablauf: h4.ablauf } },
      manifest: {
        ohneRecipient: { status: ohne4.status },
        mitRecipient: { status: mit4.status, antwort: mAntwort },
      },
      preflight: {
        status: pre4.status,
        allowMethods: pre4.headers.get('access-control-allow-methods'),
        allowHeaders: pre4.headers.get('access-control-allow-headers'),
      },
      abruf2: await (async () => {
        const r = await fetch(`${basis}/holen.php?t=${String(h4.url).split('t=')[1]}`);
        return { status: r.status, koerperLaenge: (await r.text()).length };
      })(),
    };
    fs.writeFileSync(mitschriftZiel, JSON.stringify(mitschrift, null, 2) + '\n');
    console.log('\nMitschrift geschrieben: ' + mitschriftZiel);
  }

  aufraeumen();
  const rot = proben.filter(p => !p.ok);
  console.log(`\n${proben.length - rot.length}/${proben.length} bestanden.`);
  if (rot.length) { console.error('✖ ROT: ' + rot.map(p => p.name).join(' · ')); process.exit(1); }
  console.log('✔ Der Manifest-Weg trägt.');
}

/* Nur als Programm laufen, und --help/-h fährt NICHTS: am 26.09.2026 startete ein `--help`, das das
   Werkzeug nicht kannte, einen echten Lauf. Beim blossen require() (Test, anderes Werkzeug) tut es nichts. */
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    const kopf = fs.readFileSync(__filename, 'utf8').match(/Aufruf:[\s\S]*?(?=\n\s*═|\n\s*\*\/)/);
    console.log(kopf ? kopf[0] : 'siehe Kopfkommentar');
  } else {
    main().catch(e => { console.error('✖ unerwarteter Fehler: ' + e.stack); process.exit(1); });
  }
}

