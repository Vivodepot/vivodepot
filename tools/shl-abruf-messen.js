#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Werkzeug — YBOC Schritt 50: WIE gibt der Ablage-Host die Datei heraus?

   Der Gazelle-Teststep 50 (REQUEST_DOCUMENT : HTTP) verlangt, dass der
   Empfänger das Dokument über HTTP holt. Ob `share.vivodepot.de` das bei
   einem reinen GET tut — oder erst eine HTML-Seite mit Knopf ausliefert —
   ist die offene Tatsache, an der hängt, ob EIN Schritt fehlt (nur 40) oder
   ZWEI (40 und 50).

   Dieses Werkzeug MISST nur. Es ändert nichts, es baut nichts, und es läuft
   NIE im Kontext von vivodepot.html (dort bleibt connect-src 'none').

   Aufruf:
     node tools/shl-abruf-messen.js --abruf <url>      eine echte Abruf-URL messen
     node tools/shl-abruf-messen.js --abruf <url> --zweitabruf   zusätzlich One-Time prüfen
     node tools/shl-abruf-messen.js                    Selbsttest gegen Fixtures (kein Netz)

   ACHTUNG: ein Abruf VERBRAUCHT die Freigabe (One-Time). Nur an einer eigens
   erzeugten Wegwerf-Datei messen, nie an einer echten Bürger-Freigabe.
   ════════════════════════════════════════════════════════════════════════ */

/* ── Der Kern: eine reine Funktion, damit sie ohne Netz prüfbar ist ────────
   Ordnet eine HTTP-Antwort in genau eine der Lagen ein, die für Teststep 50
   den Unterschied machen. */
function abrufEinordnen({ status, contentType, koerper }) {
  const ct = String(contentType || '').toLowerCase();
  const txt = String(koerper == null ? '' : koerper);

  if (status === 404) return { lage: 'weg', schritt50: false, grund: '404 — Freigabe verbraucht oder unbekannt' };
  if (status >= 400) return { lage: 'fehler', schritt50: false, grund: 'HTTP ' + status };

  // Eine JWE compact ist ASCII, fünf base64url-Teile durch Punkte getrennt.
  const sieht_wie_jwe_aus = /^[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\s*$/.test(txt);

  if (ct.includes('text/html')) {
    return {
      lage: 'html-zwischenseite',
      schritt50: false,
      grund: 'HTML statt Datei — der Empfänger bekommt eine Seite, kein Dokument. Teststep 50 (REQUEST_DOCUMENT : HTTP) ist so nicht erfüllbar.',
    };
  }
  if (sieht_wie_jwe_aus) {
    return {
      lage: 'datei-direkt',
      schritt50: true,
      grund: 'Reiner GET liefert die JWE compact aus (' + (ct || 'ohne content-type') + '). Teststep 50 ist erfüllbar.',
    };
  }
  if (ct.includes('json')) {
    return { lage: 'json', schritt50: false, grund: 'JSON statt JWE — vermutlich eine Hülle/ein Manifest, nicht das Dokument selbst.' };
  }
  return { lage: 'unklar', schritt50: false, grund: 'Weder HTML noch JWE compact (content-type: ' + (ct || 'keiner') + ')' };
}

/* ── Fixtures: die vier Lagen, ohne Netz ─────────────────────────────────── */
const FIXTURES = [
  {
    name: 'Direkt-GET liefert die JWE',
    antwort: { status: 200, contentType: 'application/jose', koerper: 'eyJhbGciOiJkaXIifQ..aXYtaGllcg.Y2hpZmZyZQ.dGFn' },
    erwartet: { lage: 'datei-direkt', schritt50: true },
  },
  {
    name: 'HTML-Zwischenseite mit Knopf',
    antwort: { status: 200, contentType: 'text/html; charset=utf-8', koerper: '<!doctype html><h1>Datei abholen</h1><button>Herunterladen</button>' },
    erwartet: { lage: 'html-zwischenseite', schritt50: false },
  },
  {
    name: 'zweiter Abruf — One-Time greift',
    antwort: { status: 404, contentType: 'text/html', koerper: 'Not Found' },
    erwartet: { lage: 'weg', schritt50: false },
  },
  {
    name: 'JSON-Hülle statt Dokument',
    antwort: { status: 200, contentType: 'application/json', koerper: '{"files":[]}' },
    erwartet: { lage: 'json', schritt50: false },
  },
];

function selbsttest() {
  let fehler = 0;
  for (const f of FIXTURES) {
    const ist = abrufEinordnen(f.antwort);
    const ok = ist.lage === f.erwartet.lage && ist.schritt50 === f.erwartet.schritt50;
    if (!ok) fehler++;
    console.log((ok ? 'OK  ' : 'ROT ') + f.name + '  →  lage=' + ist.lage + ' schritt50=' + ist.schritt50);
  }
  console.log(fehler === 0 ? '\nAlle ' + FIXTURES.length + ' Fixtures grün.' : '\n' + fehler + ' Fixture(s) ROT.');
  return fehler === 0 ? 0 : 1;
}

/* ── Echte Messung ───────────────────────────────────────────────────────── */
async function messen(url, opt) {
  const runde = async (nr) => {
    const t0 = Date.now();
    const antwort = await fetch(url, { redirect: 'manual' });
    const kopf = {};
    antwort.headers.forEach((w, n) => { kopf[n] = w; });
    const koerper = await antwort.text();
    const befund = abrufEinordnen({ status: antwort.status, contentType: kopf['content-type'], koerper });
    console.log('\n── Abruf ' + nr + ' ─────────────────────────────────────');
    console.log('HTTP ' + antwort.status + '   (' + (Date.now() - t0) + ' ms)');
    for (const n of ['content-type', 'content-length', 'content-disposition', 'location', 'cache-control']) {
      if (kopf[n]) console.log('  ' + n + ': ' + kopf[n]);
    }
    console.log('  Körper (erste 200 Zeichen): ' + JSON.stringify(koerper.slice(0, 200)));
    console.log('  EINORDNUNG: ' + befund.lage + '  ·  Teststep 50 erfüllbar: ' + (befund.schritt50 ? 'JA' : 'NEIN'));
    console.log('  ' + befund.grund);
    return befund;
  };

  const erste = await runde(1);
  if (opt.zweitabruf) {
    const zweite = await runde(2);
    console.log('\n── One-Time ─────────────────────────────────────');
    console.log(zweite.lage === 'weg'
      ? 'Zweiter Abruf ist weg (404). One-Time greift.'
      : 'ACHTUNG: zweiter Abruf liefert noch etwas (lage=' + zweite.lage + '). One-Time greift NICHT wie zugesagt.');
  }
  return erste.schritt50 ? 0 : 1;
}

async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--abruf');
  if (i === -1) return selbsttest();
  const url = argv[i + 1];
  if (!url || !/^https:\/\//.test(url)) {
    console.error('--abruf braucht eine https-URL.');
    return 2;
  }
  return messen(url, { zweitabruf: argv.includes('--zweitabruf') });
}

// Nur als Programm laufen. Wird die Datei `require`d (Test, anderes Werkzeug), darf sie
// nichts tun — sonst startet ein Import den ganzen Lauf.
if (require.main === module) {
  main().then((c) => { process.exitCode = c; }, (e) => { console.error(String((e && e.message) || e)); process.exitCode = 2; });
}

module.exports = { abrufEinordnen };
