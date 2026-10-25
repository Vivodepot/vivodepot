#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   csp-bauen.js — CSP ohne 'unsafe-inline' und mit Trusted Types in jeder HTML-Anwendung (U2-ADR-470)
   ────────────────────────────────────────────────────────────────────────────
   Für jede Anwendung (vivodepot.html, vivodepot-lesen.html, vivodepot-studio.html, vivodepot-vc-issuer.html,
   vivodepot-schluessel-teilen.html — aus dem Bestand abgeleitet, s. anwendungen()):
     1. den Vertrauensregel-Block (tools/lib/vertrauensregel-block.js) als erstes Skript nach der CSP-Zeile
        einsetzen oder auf den aktuellen Text bringen;
     2. in der CSP `require-trusted-types-for 'script'` und `trusted-types default` setzen;
     3. script-src: 'unsafe-inline' raus, je eigenem Inline-Block ein sha256 (tools/lib/csp-hashes.js) — ZULETZT,
        weil Schritt 1 einen Block einsetzt.
   Die Hashes schreibt der Bau, nie die Hand. Wer einen Inline-Block ändert, fährt dieses Werkzeug; landung-vorbereiten
   tut es nach allen Erzeugern, die in eine Anwendung schreiben, und vor dem ersten, der den Kern festschreibt.
   Ein Werkzeug für alle Anwendungen, das Studio eingeschlossen (Befund STUDIO-UNSAFE-INLINE): der frühere Entwurf eines
   eigenen Studio-Werkzeugs ist hierin aufgegangen.

   Ein reiner Textumformer: kein Browser, keine Suite, kein Netz.

   AUFRUF
     node tools/csp-bauen.js                    schreiben (gleichbedeutend: --schreiben)
     node tools/csp-bauen.js --check            prüfen (Exit 1 bei Abweichung)
     node tools/csp-bauen.js --wurzel <ordner>  gegen einen anderen Stand (Proben, Zuschnitt)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { cspHashesNachziehen, cspPruefen, inlineSkripte } = require('./lib/csp-hashes.js');
const { BLOCK_ID, blockHtml } = require('./lib/vertrauensregel-block.js');

const REPO = path.join(__dirname, '..');
const META = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>/;

/* Die Anwendungen: jede HTML-Datei im Wurzelverzeichnis mit einer CSP-Zeile und eigenen Inline-Skripten. Aus dem
   Bestand abgeleitet, nicht aufgezählt — ein Stand ohne eine der Dateien (der öffentliche Zuschnitt) braucht keine
   eigene Liste, und eine neue Anwendung ist von selbst dabei. Der Style-Guide trägt weder CSP noch Skript. */
function anwendungen(wurzel = REPO) {
  return fs.readdirSync(wurzel).filter((f) => f.endsWith('.html')).sort().filter((f) => {
    const html = fs.readFileSync(path.join(wurzel, f), 'utf8');
    return META.test(html) && inlineSkripte(html).length > 0;
  });
}

function blockEinsetzen(html) {
  const vorhanden = new RegExp(`<script id="${BLOCK_ID}">[\\s\\S]*?</script>`);
  if (vorhanden.test(html)) return html.replace(vorhanden, () => blockHtml());
  const m = META.exec(html);
  if (!m) throw new Error('keine CSP-Meta-Zeile');
  const ende = m.index + m[0].length;
  return html.slice(0, ende) + '\n' + blockHtml() + html.slice(ende);
}

function trustedTypesInPolicy(html) {
  return html.replace(META, (ganz, policy) => {
    let teile = policy.split(';').map((t) => t.trim()).filter(Boolean)
      .filter((t) => !/^require-trusted-types-for(\s|$)/.test(t) && !/^trusted-types(\s|$)/.test(t));
    teile = [...teile, "require-trusted-types-for 'script'", 'trusted-types default'];
    return ganz.replace(policy, () => teile.join('; '));
  });
}

const bauen = (html) => cspHashesNachziehen(trustedTypesInPolicy(blockEinsetzen(html)));

function argWert(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}

function main(argv) {
  const check = argv.includes('--check');
  const wurzel = argWert(argv, '--wurzel') ? path.resolve(argWert(argv, '--wurzel')) : REPO;
  const liste = anwendungen(wurzel);
  if (!liste.length) { console.error('[csp-bauen] keine Anwendung mit CSP-Zeile und Inline-Skript in ' + wurzel); return 1; }
  let rot = 0;
  for (const f of liste) {
    const p = path.join(wurzel, f);
    const alt = fs.readFileSync(p, 'utf8');
    const neu = bauen(alt);
    if (check) {
      const pr = cspPruefen(alt);
      if (alt !== neu || !pr.ok) {
        rot++;
        console.error(`[csp-bauen] ${f}: entspricht nicht dem Bau (fehlend ${pr.fehlend.length}, überzählig ${pr.ueberzaehlig.length}, unsafe-inline ${pr.unsafeInline}) — node tools/csp-bauen.js`);
      }
    } else if (alt !== neu) {
      fs.writeFileSync(p, neu);
      console.log(`[csp-bauen] ${f}: geschrieben (${inlineSkripte(neu).length} Inline-Blöcke)`);
    } else {
      console.log(`[csp-bauen] ${f}: unverändert`);
    }
  }
  if (check && !rot) console.log(`[csp-bauen] grün — ${liste.length} Anwendungen: Hashes statt unsafe-inline, Trusted Types, Vertrauensregel gesetzt`);
  return rot ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { bauen, blockEinsetzen, trustedTypesInPolicy, anwendungen, main, META };
