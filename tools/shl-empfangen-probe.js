#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Werkzeug — Probe für die ABHOL-Seite (empfangen.html) des Ablage-Hosts.

   Geschwister-Probe zu tools/shl-manifest-probe.js: jene prüft den Host
   (was er ausliefert), diese prüft die Seite (was eine Bürgerin davon hat).

   WARUM MIT ECHTEM BROWSER: die Seite entschlüsselt mit WebCrypto. Ob der
   AAD-Umgang stimmt (kodierter Kopf als ASCII) und ob Chiffre und Prüfsumme
   richtig aneinandergehängt werden, lässt sich nur im Browser feststellen —
   in Node liefe anderer Code. Eine Probe, die den Gegenstand nicht anfasst,
   ist keine.

   WAS SIE PRÜFT:
     1  Der Link wird rein lokal gelesen — Bezeichnung, Weg, Ablauf sichtbar,
        und dabei wird NICHTS abgerufen (die Freigabe bleibt unberührt).
     2  Erst der ausdrückliche Klick holt ab und entschlüsselt.
     3  Der Klartext ist byte-genau das, was hochgeladen wurde.
     4  Danach ist die Freigabe verbraucht (zweiter Versuch: Fehlertext).
     5  Ein abgelaufener Link wird abgewiesen, OHNE abzurufen.
     6  Ein Link auf http:// wird abgewiesen, OHNE abzurufen.

   ACHTUNG: erzeugt EINE echte Wegwerf-Freigabe auf dem Ablage-Host und
   verbraucht sie. Ein Rate-Limit-Platz je Lauf. Kein fremder Link wird
   angefasst.

   Aufruf:
     node tools/shl-empfangen-probe.js --seite <ordner-mit-empfangen.html>
     node tools/shl-empfangen-probe.js            (die versionierte Seite unter share/)
   ════════════════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const http = require('node:http');
const { chromium } = require('playwright');

/* Die Seite liegt seit SHL B (26.09.2026) versioniert in diesem Repo, unter share/. Die Vorgabe zeigt
   dorthin und nicht mehr auf einen Heimatpfad in einem anderen Repo: sonst prüfte das Werkzeug im
   Zweifel eine Kopie, die nicht die gelandete ist. */
const STANDARD_SEITE = path.join(__dirname, '..', 'share');
const HOST = 'https://share.vivodepot.de';
/* style.css gehört zur Ablage-Seite und liegt nur auf dem Host (158 KB, die Abhol-Seite braucht davon
   vier Regeln, darum gibt es empfangen.css). Lokal antwortet der Probe-Server darauf mit 404; das ändert
   nur das Aussehen, nicht, was die Probe misst. */
const DATEIEN = ['empfangen.html', 'empfangen.js', 'empfangen.css'];

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
};
const b64u = (b) => Buffer.from(b).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function ungemessen(grund) {
  console.log('⚠ UNGEMESSEN — ' + grund);
  console.log('  Kein Verstoß festgestellt, aber auch nichts geprüft. Nicht als grün lesen.');
  process.exit(0);
}

const proben = [];
function pruefe(name, ok, hinweis) {
  proben.push({ name, ok: !!ok });
  console.log(`  ${ok ? '✔' : '✖'} ${name}${ok ? '' : '  — ' + (hinweis === undefined ? '' : String(hinweis))}`);
}

/** Baut eine echte JWE compact (dir/A256GCM) — dieselbe Form, die der Kern erzeugt. */
function jweBauen(klartext) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const kopf = b64u(JSON.stringify({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' }));
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(kopf, 'ascii'));
  const ct = Buffer.concat([c.update(Buffer.from(klartext, 'utf8')), c.final()]);
  return { jwe: `${kopf}..${b64u(iv)}.${b64u(ct)}.${b64u(c.getAuthTag())}`, key: b64u(key) };
}

function shlink(url, key, flag, label, exp) {
  const p = { url, key, label };
  if (flag) p.flag = flag;
  if (exp) p.exp = exp;
  return 'shlink:/' + b64u(JSON.stringify(p));
}

/** Die Seite lokal ausliefern — die echten Dateien, nicht eine Nachbildung. */
function seiteAusliefern(ordner) {
  const typen = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  const server = http.createServer((req, res) => {
    const name = path.basename((req.url || '').split('?')[0]) || 'empfangen.html';
    const datei = path.join(ordner, name);
    if (!fs.existsSync(datei)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': typen[path.extname(name)] || 'application/octet-stream' });
    res.end(fs.readFileSync(datei));
  });
  return new Promise((fertig) => server.listen(0, '127.0.0.1', () => fertig({ server, port: server.address().port })));
}

async function main() {
  // Schreibt gegen den Live-Host (eine Wegwerf-Freigabe je Lauf): nicht aus einer Agentensitzung, nicht aus einem Test.
  require('./lib/live-sperre.js').liveSperreDurchsetzen('shl-empfangen-probe');
  const ordner = arg('--seite', STANDARD_SEITE);
  const fehlend = DATEIEN.filter((d) => !fs.existsSync(path.join(ordner, d)));
  if (fehlend.length) ungemessen('Seite nicht gefunden in ' + ordner + ' (' + fehlend.join(', ') + ')');

  const { server, port } = await seiteAusliefern(ordner);
  const basis = `http://127.0.0.1:${port}/empfangen.html`;
  const browser = await chromium.launch();
  /* acceptDownloads ausdrücklich: die Probe prüft, dass die Bürgerin das Dokument wirklich
     SPEICHERN kann. Ohne diesen Schalter verwirft der Kontext das Herunterladen stumm, und
     die Probe misst etwas anderes als sie behauptet. */
  const kontext = await browser.newContext({ acceptDownloads: true });
  const seite = await kontext.newPage();
  /* Die Konsole der Seite MITSCHREIBEN. Eine Probe, die nur „hat nicht geklappt" meldet,
     zwingt den nächsten dazu, den Fehler noch einmal zu suchen — hier hat genau das
     Zeit gekostet. Die Seite schreibt die echte Ursache in die Konsole; also gehört sie
     in die Ausgabe der Probe. */
  const konsole = [];
  seite.on('console', (m) => { if (m.type() === 'error') konsole.push(m.text()); });
  seite.on('pageerror', (e) => konsole.push('pageerror: ' + e.message));
  const aufraeumen = async () => { await browser.close().catch(() => {}); server.close(); };

  try {
    console.log('Probe gegen ' + ordner);
    console.log('  Seite lokal ausgeliefert, Abruf gegen ' + HOST + ' (eine Wegwerf-Freigabe)\n');

    /* ── Wegwerf-Freigabe anlegen ───────────────────────────────────────── */
    const inhalt = JSON.stringify({ resourceType: 'Bundle', id: 'empfangen-probe', type: 'document', entry: [] });
    const { jwe, key } = jweBauen(inhalt);
    const form = new FormData();
    form.append('datei', new Blob([jwe], { type: 'application/jose' }), 'probe.jwe');
    const hoch = await (await fetch(HOST + '/hochladen.php', { method: 'POST', body: form })).json();
    if (hoch && hoch.fehler === 'rate-ip') {
      /* Der Ablage-Host lässt 10 Uploads je Stunde und IP zu. Diese Probe legt eine echte
         Wegwerf-Freigabe an, verbraucht also einen Platz je Lauf. Das ist kein Fehlschlag
         der Seite — und darf nicht als einer aussehen. */
      await aufraeumen();
      ungemessen('Rate-Limit des Ablage-Hosts erreicht (10 Uploads je Stunde und IP). '
        + 'Die Seite wurde NICHT geprüft. In einer Stunde erneut fahren.');
    }
    if (!hoch || !hoch.manifest_url) { await aufraeumen(); ungemessen('Ablage-Host lieferte keine Manifest-Adresse: ' + JSON.stringify(hoch)); }
    const link = shlink(hoch.manifest_url, key, '', 'Probe', hoch.ablauf);

    /* ── 1 · Prüfen ist rein lokal ──────────────────────────────────────── */
    let netzAufrufe = 0;
    seite.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1')) netzAufrufe++; });
    await seite.goto(basis);
    await seite.fill('#link-eingabe', link);
    await seite.click('#pruefen-knopf');
    await seite.waitForSelector('#befund:not([hidden])');
    const befundText = await seite.textContent('#befund-liste');
    pruefe('Prüfen zeigt den Befund an', /share\.vivodepot\.de/.test(befundText || ''), befundText);
    pruefe('Prüfen nennt den Manifest-Weg', /Manifest/.test(befundText || ''), befundText);
    pruefe('Prüfen ruft NICHTS ab (Freigabe unberührt)', netzAufrufe === 0, netzAufrufe + ' Aufrufe');

    /* ── 2+3 · Abrufen und entschlüsseln ───────────────────────────────── */
    await seite.click('#abrufen-knopf');
    /* Auf EINES von beidem warten — Ergebnis oder Fehlertext. Vorher wartete die Probe nur
       auf das Ergebnis und lief in einen Timeout, wenn die Seite korrekt einen Fehler
       anzeigte. Ein Timeout sagt nicht, WAS passiert ist; der Fehlertext der Seite sagt es. */
    await seite.waitForFunction(() => {
      const e = document.getElementById('abgeholt');
      const f = document.getElementById('fehler-text');
      return (e && !e.hidden) || (f && f.textContent.trim().length > 0);
    }, { timeout: 25000 });
    if (await seite.getAttribute('#abgeholt', 'hidden') !== null) {
      pruefe('Abruf liefert ein Ergebnis', false, (await seite.textContent('#fehler-text') || '').trim());
      throw new Error('Abruf gescheitert — s. Fehlertext oben');
    }
    const fehlerNachAbruf = (await seite.textContent('#fehler-text') || '').trim();
    pruefe('Abruf ohne Fehlermeldung', fehlerNachAbruf === '', fehlerNachAbruf);

    /* Der Beleg für Gazelle-Schritt 40: „Provide a screenshot of the SHL Manifest (+ json
       file if possible)". Er entsteht nur, wenn die Seite das Manifest ZEIGT und HERAUSGIBT.
       Ohne diese Proben wäre das eine Eigenschaft, die niemand bemerkt, wenn sie verschwindet. */
    pruefe('Manifest ist sichtbar (Beleg für Schritt 40)', await seite.isVisible('#manifest-kasten'));
    pruefe('Manifest-Text zeigt die Antwort der Gegenstelle',
      /"status":\s*"finalized"/.test(await seite.textContent('#manifest-text') || ''));
    const [manifestDatei] = await Promise.all([
      seite.waitForEvent('download'),
      seite.click('#manifest-knopf'),
    ]);
    const mZiel = path.join(os.tmpdir(), 'manifest-probe-' + process.pid + '-' + Date.now() + '.json');
    await manifestDatei.saveAs(mZiel);
    let mOk = false;
    try { mOk = Array.isArray(JSON.parse(fs.readFileSync(mZiel, 'utf8')).files); } catch (e) { /* bleibt false */ }
    pruefe('Manifest lässt sich als gültiges JSON speichern', mOk);
    fs.unlinkSync(mZiel);

    const [download] = await Promise.all([
      seite.waitForEvent('download'),
      seite.click('#speichern-knopf'),
    ]);
    const ziel = path.join(os.tmpdir(), 'empfangen-probe-' + process.pid + '-' + Date.now() + '.json');
    await download.saveAs(ziel);
    const gespeichert = fs.readFileSync(ziel, 'utf8');
    pruefe('Gespeichertes Dokument ist byte-genau der Klartext', gespeichert === inhalt,
      gespeichert.slice(0, 80));
    fs.unlinkSync(ziel);

    /* ── 4 · One-Time hält ─────────────────────────────────────────────── */
    await seite.click('#abrufen-knopf');
    await seite.waitForFunction(() => document.getElementById('fehler-text').textContent.trim().length > 0, { timeout: 20000 });
    const zweiterFehler = (await seite.textContent('#fehler-text') || '').trim();
    pruefe('Zweiter Abruf meldet: nicht mehr abrufbar', /nicht mehr abrufbar|no longer available/.test(zweiterFehler), zweiterFehler);

    /* ── 4b · Passcode (P-Flag) ─────────────────────────────────────────
       Unser eigener Ablage-Host kennt keine Passcodes — der Weg lässt sich also nicht gegen
       ihn fahren. Geprüft wird deshalb genau das, was in UNSERER Hand liegt: erscheint das
       Feld, und steht der Passcode wirklich im abgeschickten Körper? Die Antwort der
       Gegenstelle wird dafür abgefangen, es geht kein Abruf hinaus.
       Anlass: TI-751 (Monarch → Vivodepot, 23.09.2026) trägt einen Passcode. Ohne ihn
       antwortet die Gegenstelle mit 401, und die Spec verlangt, dass sie Fehlversuche zählt
       und die Freigabe danach sperrt — ein blinder Versuch kostet also etwas. */
    await seite.goto(basis);
    let gesendet = null;
    await seite.route('https://beispiel.invalid/**', async (route) => {
      gesendet = route.request().postData();
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ status: 'finalized', files: [{ contentType: 'application/fhir+json', embedded: jwe }] }) });
    });
    await seite.fill('#link-eingabe', shlink('https://beispiel.invalid/m', key, 'P', 'Mit Passcode', 0));
    await seite.click('#pruefen-knopf');
    await seite.waitForSelector('#befund:not([hidden])');
    pruefe('P-Flag: das Passcode-Feld erscheint', await seite.isVisible('#passcode-eingabe'));
    await seite.fill('#passcode-eingabe', 'F9K4S3');
    await seite.click('#abrufen-knopf');
    await seite.waitForFunction(() => {
      const e = document.getElementById('abgeholt'); const f = document.getElementById('fehler-text');
      return (e && !e.hidden) || (f && f.textContent.trim().length > 0);
    }, { timeout: 20000 });
    pruefe('P-Flag: der Passcode steht im abgeschickten Körper',
      !!gesendet && JSON.parse(gesendet).passcode === 'F9K4S3', gesendet);
    pruefe('P-Flag: recipient geht weiterhin mit',
      !!gesendet && typeof JSON.parse(gesendet).recipient === 'string');
    await seite.unroute('https://beispiel.invalid/**');

    /* Und die Gegenprobe: ohne P-Flag darf das Feld NICHT erscheinen — sonst fragt die Seite
       nach etwas, das es nicht gibt. */
    await seite.goto(basis);
    await seite.fill('#link-eingabe', shlink('https://beispiel.invalid/m', key, '', 'Ohne Passcode', 0));
    await seite.click('#pruefen-knopf');
    await seite.waitForSelector('#befund:not([hidden])');
    pruefe('ohne P-Flag: kein Passcode-Feld', !(await seite.isVisible('#passcode-eingabe')));

    /* ── 5 · Abgelaufener Link wird abgewiesen, OHNE Abruf ─────────────── */
    netzAufrufe = 0;
    await seite.goto(basis);
    await seite.fill('#link-eingabe', shlink(HOST + '/manifest.php?m=' + 'a'.repeat(64), key, '', 'alt', 1000000000));
    await seite.click('#pruefen-knopf');
    const abgelaufen = (await seite.textContent('#fehler-text') || '').trim();
    pruefe('Abgelaufener Link wird abgewiesen', /abgelaufen|expired/.test(abgelaufen), abgelaufen);
    pruefe('… und zwar ohne Abruf', netzAufrufe === 0, netzAufrufe + ' Aufrufe');

    /* ── 6 · http:// wird abgewiesen ───────────────────────────────────── */
    netzAufrufe = 0;
    await seite.fill('#link-eingabe', shlink('http://beispiel.invalid/x', key, 'U', 'unsicher', 0));
    await seite.click('#pruefen-knopf');
    const unsicher = (await seite.textContent('#fehler-text') || '').trim();
    pruefe('Link ohne https wird abgewiesen', /https/.test(unsicher), unsicher);
    pruefe('… und zwar ohne Abruf', netzAufrufe === 0, netzAufrufe + ' Aufrufe');

    await aufraeumen();
    const rot = proben.filter((p) => !p.ok);
    console.log(`\n${proben.length - rot.length}/${proben.length} bestanden.`);
    if (rot.length) { console.error('✖ ROT: ' + rot.map((p) => p.name).join(' · ')); process.exit(1); }
    console.log('✔ Die Abhol-Seite trägt.');
  } catch (e) {
    if (konsole.length) {
      console.error('\n  Konsole der Seite:');
      konsole.forEach((z) => console.error('    ' + z.split('\n')[0]));
    }
    await aufraeumen();
    throw e;
  }
}

/* Nur als Programm laufen, und --help/-h fährt NICHTS: am 26.09.2026 startete ein `--help`, das das
   Werkzeug nicht kannte, einen echten Lauf. Beim blossen require() (Test, anderes Werkzeug) tut es nichts. */
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    const kopf = fs.readFileSync(__filename, 'utf8').match(/Aufruf:[\s\S]*?(?=\n\s*═|\n\s*\*\/)/);
    console.log(kopf ? kopf[0] : 'siehe Kopfkommentar');
  } else {
    main().catch((e) => { console.error('✖ unerwarteter Fehler: ' + e.stack); process.exit(1); });
  }
}

