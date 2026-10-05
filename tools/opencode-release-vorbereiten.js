#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   opencode-release-vorbereiten.js — die Anhänge für ein GitLab-Release auf openCoDE, und die Befehle dazu
   ────────────────────────────────────────────────────────────────────────────
   WOZU (01.10.2026, openCoDE-Badges). Die Prüfung PACKAGES zählt Container-Tags, Pakete und Releases mit Anhang. Ein
   Release zu einem Fassungs-Tag mit den eigenständigen Anwendungsdateien als Paket und als Release-Link erfüllt sie und
   gibt Lesenden die Dateien der Fassung an einem Ort.

   WAS ES TUT: Aus einem Ordner mit dem Stand des Fassungs-Tags (Checkout des öffentlichen Repos) legt es in `--ziel`
     · die Anwendungsdateien (ANHAENGE), unverändert kopiert,
     · `SHA256SUMS` über sie,
     · `release.json` (Name, Tag, Beschreibung aus dem CHANGELOG-Abschnitt der Fassung, Links auf die Paketdateien),
   und gibt die Befehle aus: Hochladen in die Generic Package Registry, dann das Release anlegen.

   VORAB gibt es die vier Befehle für den signierten Stand aus (git commit -S, git tag -s, git verify-commit, git tag -v),
   die im öffentlichen Klon vor dem Push auf GitHub laufen (Entscheidung 01.10.2026; Prüfung des Tags:
   tools/oeffentlich-tag-signieren.js). Es liest dafür keinen Schlüssel und keinen Pfad.

   WAS ES NICHT TUT: Es lädt nichts hoch und kennt kein Token. Die Befehle lesen das Token aus der Umgebungsvariable
   `OPENCODE_TOKEN` der Person, die sie ausführt — es steht in keiner Datei und in keiner Ausgabe.

   Aufruf:
     node tools/opencode-release-vorbereiten.js --quelle <ordner> --fassung v1.0.843 --ziel <ordner>
     ohne Argumente: Trockenlauf gegen tests/fixtures/opencode-release-quelle (schreibt nichts, gibt die Befehle aus)
   Exit 1, wenn eine Anlage fehlt, die Fassung keinen CHANGELOG-Abschnitt hat oder das Format nicht stimmt.
   ════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const HOST = 'https://gitlab.opencode.de';
const PROJEKT_ID = 10391;   // vivodepot/vivodepot — nachsehen: GET <HOST>/api/v4/projects/vivodepot%2Fvivodepot
const PAKET = 'vivodepot';
const ANHAENGE = Object.freeze([
  'vivodepot.html', 'vivodepot.html.sha256', 'vivodepot-lesen.html', 'vivodepot-schluessel-teilen.html',
  'vivodepot-vc-issuer.html', 'vivodepot.sbom.cdx.json',
]);
const FIXTURE = path.join(__dirname, '..', 'tests', 'fixtures', 'opencode-release-quelle');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/* Der Abschnitt „## [v1.0.843] – …“ bis zur nächsten Fassungs-Überschrift, ohne die Überschrift selbst. */
function changelogAbschnitt(text, fassung) {
  const zeilen = String(text).split('\n');
  const kopf = zeilen.findIndex((z) => z.startsWith('## [' + fassung + ']'));
  if (kopf < 0) return null;
  let ende = zeilen.findIndex((z, i) => i > kopf && /^## \[/.test(z));
  if (ende < 0) ende = zeilen.length;
  const inhalt = zeilen.slice(kopf + 1, ende).join('\n').trim();
  return inhalt || null;
}

/* Die vier Befehle für den signierten Stand (Entscheidung 01.10.2026): im öffentlichen Klon, vor dem Push auf GitHub, mit
   der eigenen git-Konfiguration der Schlüsselhalterin. Kein Schlüssel, kein Pfad — git signiert und prüft selbst. */
function signierBefehle(fassung) {
  const kern = 'v' + String(fassung).replace(/^v1\.0\./, '');
  return [
    `git commit -S -m "Vivodepot v1.0 (Kern ${kern})"`,
    `git tag -s ${fassung} -m "Vivodepot ${fassung}"`,
    'git verify-commit HEAD',
    `git tag -v ${fassung}`,
  ];
}

/* PFLICHTHINWEISE (04.10.2026, Befund LOINC-PFLICHTHINWEIS-DOWNLOADSTELLEN): ein Release bietet vivodepot.html zum
   Herunterladen an — die LOINC-Lizenz verlangt ihren Hinweis „on the same Internet page from which the product is available
   for download“, SNOMED (GPS, CC BY-ND 4.0) die Namensnennung. Wörtlich aus code-listen/wortlaut/ DIESES Repos (nicht aus dem
   Tag-Checkout: so trägt auch der Nachtrag für eine ältere Fassung den heutigen, gegen die Quelle geprüften Wortlaut). */
const PFLICHTHINWEISE = Object.freeze([
  ['LOINC', 'code-listen/wortlaut/LOINC_short_license.txt'],
  ['SNOMED CT', 'code-listen/wortlaut/snomed-gps-hinweis.txt'],
]);
function mitPflichthinweisen(beschreibung, repo = path.join(__dirname, '..')) {
  return beschreibung + PFLICHTHINWEISE.map(([titel, datei]) => '\n\n### ' + titel + '\n\n' + fs.readFileSync(path.join(repo, datei), 'utf8')).join('');
}

function paketUrl(version, datei) {
  return `${HOST}/api/v4/projects/${PROJEKT_ID}/packages/generic/${PAKET}/${version}/${datei}`;
}

/* Prüft und plant; schreibt nur, wenn `ziel` gesetzt ist. Liefert { fehler:[], dateien:[], release, befehle:[] }. */
function releaseVorbereiten({ quelle, fassung, ziel }) {
  const fehler = [];
  if (!/^v1\.0\.\d+$/.test(String(fassung || ''))) fehler.push('Fassung im Format v1.0.<n> erwartet, nicht: ' + fassung);
  const fehlend = ANHAENGE.filter((d) => !fs.existsSync(path.join(quelle, d)));
  for (const d of fehlend) fehler.push('Anlage fehlt in der Quelle: ' + d);
  const changelogPfad = path.join(quelle, 'CHANGELOG.md');
  const beschreibung = fs.existsSync(changelogPfad) ? changelogAbschnitt(fs.readFileSync(changelogPfad, 'utf8'), fassung) : null;
  if (!beschreibung) fehler.push('kein CHANGELOG-Abschnitt für ' + fassung);
  if (fehler.length) return { fehler, dateien: [], release: null, befehle: [] };

  const version = fassung.slice(1);
  const dateien = ANHAENGE.map((name) => {
    const inhalt = fs.readFileSync(path.join(quelle, name));
    return { name, sha256: sha256(inhalt), groesse: inhalt.length, inhalt };
  });
  const summen = dateien.map((d) => d.sha256 + '  ' + d.name).join('\n') + '\n';
  const alle = dateien.concat([{ name: 'SHA256SUMS', sha256: sha256(Buffer.from(summen)), groesse: summen.length, inhalt: Buffer.from(summen) }]);
  const release = {
    name: 'Vivodepot ' + fassung,
    tag_name: fassung,
    description: mitPflichthinweisen(beschreibung + '\n\nPrüfsummen (SHA-256) der Anhänge in `SHA256SUMS`.'),
    assets: { links: alle.map((d) => ({ name: d.name, url: paketUrl(version, d.name), link_type: d.name.endsWith('.html') ? 'package' : 'other' })) },
  };
  const befehle = ['cd ' + JSON.stringify(ziel || '<ziel>')]
    .concat(alle.map((d) => `curl --fail --location --header "PRIVATE-TOKEN: $OPENCODE_TOKEN" --upload-file ${d.name} "${paketUrl(version, d.name)}"`))
    .concat([`curl --fail --request POST --header "PRIVATE-TOKEN: $OPENCODE_TOKEN" --header "Content-Type: application/json" --data @release.json "${HOST}/api/v4/projects/${PROJEKT_ID}/releases"`]);

  if (ziel) {
    fs.mkdirSync(ziel, { recursive: true });
    for (const d of alle) fs.writeFileSync(path.join(ziel, d.name), d.inhalt);
    fs.writeFileSync(path.join(ziel, 'release.json'), JSON.stringify(release, null, 2) + '\n');
  }
  return { fehler, dateien: alle.map(({ inhalt, ...rest }) => rest), release, befehle };
}

function main(argv) {
  const wert = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const quelle = wert('--quelle') || FIXTURE;
  const fassung = wert('--fassung') || (quelle === FIXTURE ? 'v1.0.1' : undefined);
  const ziel = wert('--ziel');
  const r = releaseVorbereiten({ quelle, fassung, ziel });
  if (r.fehler.length) {
    for (const f of r.fehler) console.error('[opencode-release] ' + f);
    return 1;
  }
  console.log('[opencode-release] ' + (ziel ? 'geschrieben nach ' + ziel : 'Trockenlauf, nichts geschrieben') + ' — ' + r.dateien.length + ' Dateien');
  for (const d of r.dateien) console.log('  ' + d.sha256 + '  ' + d.name + '  (' + d.groesse + ' Byte)');
  console.log('\n1. Im öffentlichen Klon, vor dem Push auf GitHub — signiert, mit der eigenen git-Konfiguration:\n');
  for (const b of signierBefehle(fassung)) console.log(b);
  console.log('\n2. Nach dem Spiegeln, für das Release auf openCoDE (Token aus der eigenen Umgebung: export OPENCODE_TOKEN=…, es steht nirgends sonst):\n');
  for (const b of r.befehle) console.log(b);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { ANHAENGE, PROJEKT_ID, PFLICHTHINWEISE, mitPflichthinweisen, changelogAbschnitt, paketUrl, releaseVorbereiten, signierBefehle, main, FIXTURE };
