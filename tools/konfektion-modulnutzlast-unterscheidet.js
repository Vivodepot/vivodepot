#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   konfektion-modulnutzlast-unterscheidet.js — der UMGEDREHTE Wächter
   (07.09.2026, nach dem Befund „alle vier Produkte
   sehen exakt gleich aus")
   ────────────────────────────────────────────────────────────────────────────
   DER FUND: `gerüstByteGleich` (produkt-konfektionieren.js) prüft, ob das
   Gerüst über alle vier Produkte byte-gleich ist. Solange kein Produkt seine
   Module AB WERK in genau diese Datei(en) einbäckt, sind die vier Kopien
   IMMER byte-gleich — auch wenn die Konfektionierung komplett wirkungslos
   ist. Der Wächter war darum trivial erfüllt, nie ein echter Beweis. Von
   Produktentscheidung selbst gefunden, beim Öffnen aller vier Produkte im Browser
   („alle anderen Depots sehen exakt gleich aus — auch im privaten Fenster").

   DIE UMKEHRUNG: nicht „das Gerüst ist gleich", sondern „die Nutzlast ist
   verschieden" — jedes Produkt MUSS sich von jedem anderen mit einer
   anderen Modulauswahl in genau den `PRODUKT_DATEISATZ`-Dateien
   unterscheiden (sobald AB WERK gebacken statt als inerte Begleitdatei
   danebengelegt wird). Zwei Produkte mit IDENTISCHER Modulauswahl (hier:
   keine — jedes der vier PRODUKTE hat eine andere Kombination) dürfen
   weiterhin byte-gleich sein; das prüft dieses Werkzeug nicht extra, weil
   unter PRODUKTE (tools/lib/vier-produkte.js) kein Paar dieselbe Auswahl
   trägt.

   HISTORISCH (VOR dem Einbacken-Fix vom 07.09.2026, absichtlich hier
   dokumentiert, nicht verschwiegen): dieses Werkzeug war ROT — alle vier
   vivodepot.html-Kopien byte-identisch, weil die Module nur als inerte
   Begleitdatei bzw. ein leeres vorabkonfiguration.js danebenlagen, nichts
   davon lud automatisch. Das war der Beweis, den vor dem Fix sehen
   wollte — nicht nur behauptet, gemessen. `PRODUKT_DATEISATZ` (10.09.2026,
   „Produkt ist eine Datei") ersetzt seither das damals
   benutzte, dreiteilige `DATEISATZ` (modul-app-packen.js — das galt hier
   nie zu Recht, das ausgelieferte Produkt ist eine Datei, nicht drei).

   Aufruf:
     node tools/konfektion-modulnutzlast-unterscheidet.js [--ziel <ordner>]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { konfektionieren, PRODUKT_DATEISATZ } = require('./produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('./lib/vier-produkte.js');
// „Produkt ist eine Datei" (10.09.2026): `DATEISATZ` (modul-app-packen.js, drei
// Dateien für GEHOSTETE Modul-Apps) galt hier nie zu Recht — das ausgelieferte Produkt trägt
// seit heute nur noch `PRODUKT_DATEISATZ` (eine Datei). Vorher unbemerkt, weil beide Listen
// `vivodepot.html` enthielten und dieses Werkzeug nur DAS je tatsächlich verglich (die
// Kollisions-Frage hängt ohnehin nur an dieser einen Datei, s. u.).

const REPO = path.join(__dirname, '..');

function sha256Datei(pfad) {
  return crypto.createHash('sha256').update(fs.readFileSync(pfad)).digest('hex');
}

/* Baut alle PRODUKTE real und liefert je Slug den sha256 JEDER DATEISATZ-Datei
   — nicht nur von vivodepot.html, damit ein künftiges sw.js/manifest-Backen
   ebenfalls erfasst wäre. */
function produkteHashen(ziel, ladeIssuer) {
  const ISSUER = ladeIssuer().V;
  const ergebnis = {};
  for (const p of PRODUKTE) {
    const r = konfektionieren({
      ziel, slug: p.slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
      unsignierteModulDateien: modulDateienFuer(p),
    });
    const hashes = {};
    for (const datei of PRODUKT_DATEISATZ) hashes[datei] = sha256Datei(path.join(r.ordner, datei));
    ergebnis[p.slug] = hashes;
  }
  return ergebnis;
}

/* Jedes Paar unterschiedlicher Slugs MUSS sich in mindestens einer
   DATEISATZ-Datei unterscheiden — sonst ist die Modulauswahl wirkungslos
   geblieben. Meldet jedes Kollisionspaar einzeln, wirft nichts (Aufrufer
   entscheidet: Skript druckt und setzt den Exit-Code, Test wirft). */
function kollisionen(hashesJeProdukt) {
  const slugs = Object.keys(hashesJeProdukt);
  const funde = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = slugs[i]; const b = slugs[j];
      const gleich = PRODUKT_DATEISATZ.filter((d) => hashesJeProdukt[a][d] === hashesJeProdukt[b][d]);
      if (gleich.length === PRODUKT_DATEISATZ.length) funde.push({ a, b, dateien: gleich });
    }
  }
  return funde;
}

function main() {
  const argv = process.argv.slice(2);
  const argWert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const ziel = path.resolve(argWert('--ziel') || path.join(REPO, 'produkte'));

  const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
  const hashes = produkteHashen(ziel, ladeIssuer);

  for (const [slug, h] of Object.entries(hashes)) {
    process.stdout.write(slug + ': vivodepot.html sha256 ' + h['vivodepot.html'].slice(0, 16) + '…\n');
  }

  const funde = kollisionen(hashes);
  if (funde.length) {
    process.stdout.write('\nROT — ' + funde.length + ' Paar(e) mit unterschiedlicher Modulauswahl sind trotzdem byte-identisch:\n');
    for (const f of funde) process.stdout.write('  ' + f.a + ' === ' + f.b + ' (' + f.dateien.join(', ') + ')\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('\nGRÜN — jedes Produkt unterscheidet sich von jedem anderen in mindestens einer Gerüst-Datei.\n');
  }
}

if (require.main === module) main();
module.exports = { produkteHashen, kollisionen };
