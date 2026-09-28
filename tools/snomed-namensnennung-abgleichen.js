'use strict';
/* ════════════════════════════════════════════════════════════════════════
   snomed-namensnennung-abgleichen.js — die SNOMED-Namensnennung gegen
   snomed.org/gps, am Tag der Auslieferung (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   SNOMED International hat den Wortlaut der Namensnennung „acceptable in
   substance“ genannt und verlangt, ihn bei jeder Auslieferung gegen die dann
   gültige Seite https://www.snomed.org/gps abzugleichen. Verglichen werden die
   zwei Angaben, die sich ändern können: die Lizenz und das Copyright-Jahr.

   Aufruf:
     node tools/snomed-namensnennung-abgleichen.js                 (liest die Seite einmal, nur lesend)
     node tools/snomed-namensnennung-abgleichen.js --seite <datei> (eine gespeicherte Seite, ohne Netz)
     --repo <pfad>: NOTICE.md und THIRD_PARTY_LICENSES aus diesem Verzeichnis (etwa einem Zuschnitt)
   Exit 0 = stimmt, 1 = weicht ab oder nicht lesbar.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const SEITE = 'https://www.snomed.org/gps';
const TRAEGER = ['NOTICE.md', 'THIRD_PARTY_LICENSES'];

function seiteLesen(html) {
  const text = String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&copy;/g, '©').replace(/\s+/g, ' ');
  const lizenz = /Creative Commons (Attribution[\w-]*(?:-NoDerivatives)? \d\.\d) International/.exec(text);
  const jahr = /Copyright © (\d{4}) SNOMED International/.exec(text);
  return { lizenz: lizenz ? lizenz[1] : null, jahr: jahr ? jahr[1] : null };
}

function abgleichen(seite, traegerTexte) {
  const befund = [];
  if (!seite.lizenz) befund.push('Seite: keine Lizenzangabe gefunden');
  if (!seite.jahr) befund.push('Seite: kein Copyright-Jahr gefunden');
  const kurz = { 'Attribution-NoDerivatives 4.0': 'CC BY-ND 4.0' }[seite.lizenz] || seite.lizenz;
  for (const [name, text] of Object.entries(traegerTexte)) {
    if (seite.lizenz && !text.includes(kurz)) befund.push(name + ': Lizenz „' + kurz + '“ fehlt');
    if (seite.jahr && !text.includes('© ' + seite.jahr + ' SNOMED International')) befund.push(name + ': „© ' + seite.jahr + ' SNOMED International“ fehlt');
  }
  return befund;
}

function traegerLesen(repo) {
  return Object.fromEntries(TRAEGER.map((d) => [d, fs.readFileSync(path.join(repo, d), 'utf8')]));
}

module.exports = { seiteLesen, abgleichen, traegerLesen, SEITE };

if (require.main === module) {
  (async () => {
    const i = process.argv.indexOf('--seite');
    let html;
    try {
      html = i >= 0 ? fs.readFileSync(path.resolve(process.argv[i + 1]), 'utf8') : await (await fetch(SEITE)).text();
    } catch (e) {
      console.error('NICHT ABGEGLICHEN: ' + SEITE + ' nicht lesbar (' + e.message + ')');
      process.exit(1);
    }
    const seite = seiteLesen(html);
    const r = process.argv.indexOf('--repo');
    const befund = abgleichen(seite, traegerLesen(r >= 0 ? path.resolve(process.argv[r + 1]) : REPO));
    console.log('Seite: Lizenz ' + seite.lizenz + ', Copyright ' + seite.jahr);
    if (befund.length) { console.error('WEICHT AB:\n  ' + befund.join('\n  ')); process.exit(1); }
    console.log('Namensnennung stimmt mit ' + SEITE + ' überein.');
  })();
}
