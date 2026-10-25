'use strict';
/* ips-kurzziffer-zufall-messen.js — wie oft trifft eine kurze Ziffernfolge zufällig in einem IPS-Auszug? (21.10.2026)

   Anlass: die Probe „[IPS·Unterfeld-Rücknahme]“ prüfte mit `!text.includes('1987')`, dass ein zurückgenommenes Jahr nicht im
   IPS-Auszug steht. Der Auszug trägt zufällige Kennungen (UUID v4, je Ressource); eine vierstellige Ziffernfolge steht darin
   gelegentlich, und die Probe wurde ohne Befund rot. Das Werkzeug misst es: es baut je Lauf dasselbe kleine Depot, nimmt das Jahr
   zurück und zählt, in wie vielen Läufen die Folge trotzdem im Text steht — und an welchem Pfad.

   Aufruf: node tools/ips-kurzziffer-zufall-messen.js [--laeufe N] [--folge 1987] [--dokument <kern.html>]
   Ausgabe: Läufe, Treffer, je Treffer der JSON-Pfad. Ein Treffer außerhalb einer Kennung wäre ein echter Befund. */
const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');

function arg(name, vorgabe) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : vorgabe; }

function pfadeMit(wert, folge, pfad = '$', aus = []) {
  if (typeof wert === 'string') { if (wert.includes(folge)) aus.push(pfad); return aus; }
  if (Array.isArray(wert)) { wert.forEach((x, i) => pfadeMit(x, folge, pfad + '[' + i + ']', aus)); return aus; }
  if (wert && typeof wert === 'object') for (const [k, x] of Object.entries(wert)) pfadeMit(x, folge, pfad + '.' + k, aus);
  return aus;
}

async function messen({ laeufe = 200, folge = '1987', htmlPfad } = {}) {
  const treffer = [];
  for (let n = 0; n < laeufe; n++) {
    const { V } = ladeKern(htmlPfad ? { htmlPfad, backen: true } : undefined);
    await V.depotAnlegen('Kurzziffer-Messung-2026!');
    V.akteurSelbstErklaeren('Gertrud Beispiel');
    V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Blinddarm-Entfernung', year: folge });
    V.sensibelFeldSetzen('health', 'operationsProcedures', false);
    V.sensibelFeldSetzen('health', V.LISTEN_UNTERFELD_PRAEFIX + 'operationsProcedures:*:year', true);
    const b = V.fhirIpsBundle(new Date('2026-10-19T00:00:00Z'), { sensibel: false });
    const p = pfadeMit(b, folge);
    if (p.length) treffer.push({ lauf: n, pfade: p });
  }
  return { laeufe, folge, treffer };
}

if (require.main === module) {
  const htmlPfad = arg('--dokument') ? path.resolve(arg('--dokument')) : undefined;
  messen({ laeufe: Number(arg('--laeufe', 200)), folge: String(arg('--folge', '1987')), htmlPfad }).then((r) => {
    console.log('[ips-kurzziffer] ' + r.laeufe + ' Läufe, Folge ' + r.folge + ': ' + r.treffer.length + ' mit Treffer');
    for (const t of r.treffer) console.log('  Lauf ' + t.lauf + ': ' + t.pfade.join(', '));
  }).catch((e) => { console.error(e && e.stack); process.exitCode = 1; });
}

module.exports = { messen, pfadeMit };
