#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════════════════
   xsd-muster-messen.mjs — misst, welche Werte die Muster (xs:pattern) eines XSD annehmen, mit dem KoSIT-Validator
   ───────────────────────────────────────────────────────────────────────────────────────
   Ein Muster in XML Schema ist immer ganz verankert; `^` und `$` sind dort gewöhnliche Zeichen. Ein Muster, das aus
   einer anderen Regex-Sprache übernommen wurde und auf `$` endet, verlangt also ein wörtliches Dollarzeichen am Ende.
   Das Werkzeug zieht jedes Muster aus dem XSD, baut je Muster ein kleines Schema mit genau dieser Einschränkung und
   lässt den KoSIT-Validator (tests/konformitaet/adapter/kosit-validator.mjs) jeden Wert dagegen urteilen.

   Aufruf:  node tools/xsd-muster-messen.mjs [--xsd <pfad>] [--element <name>] [--wert <w> …] [--aus <datei.json>]
   Ohne --xsd: die erfundene Fixture tests/fixtures/xsd-muster/beispiel-muster.xsd.
   Ohne --wert: eine übliche Adresse, dieselbe mit angehängtem `$`, eine Adresse mit Subdomain.
   Ausgabe: je Muster und Wert „gültig“ oder „abgelehnt“ (mit der Meldung des Validators); --aus schreibt JSON.
   Exit 0 bei vollständiger Messung, 2 ohne Werkzeug (node tools/kosit-beschaffen.mjs), 1 bei falschem Aufruf.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HIER, '..');
export const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'xsd-muster', 'beispiel-muster.xsd');
export const WERTE_VORGABE = Object.freeze(['anna@example.de', 'anna@example.de$', 'a.b-c@post.example.org']);
const NS = 'urn:vivodepot:xsd-muster-messen';

/** Jedes xs:pattern mit dem Namen des nächsten umschließenden xs:element; gleiche Muster zusammengefasst. */
export function musterAusXsd(xsdText) {
  const treffer = new Map();
  const re = /<xs:pattern\s+value="([^"]*)"/g;
  let m;
  while ((m = re.exec(xsdText))) {
    const davor = xsdText.slice(0, m.index);
    const namen = [...davor.matchAll(/<xs:element\b[^>]*\bname="([^"]+)"/g)];
    const element = namen.length ? namen[namen.length - 1][1] : null;
    const roh = m[1];
    if (!treffer.has(roh)) treffer.set(roh, { muster: roh, elemente: [] });
    if (element) treffer.get(roh).elemente.push(element);
  }
  return [...treffer.values()];
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Ein Schema mit genau einer Einschränkung; `musterRoh` bleibt so, wie es im Attribut stand. */
export function kleinesSchema(musterRoh) {
  return '<?xml version="1.0" encoding="utf-8"?>\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" targetNamespace="'
    + NS + '"><xs:element name="wert"><xs:simpleType><xs:restriction base="xs:string"><xs:pattern value="' + musterRoh
    + '" /></xs:restriction></xs:simpleType></xs:element></xs:schema>\n';
}
export const instanz = (wert) => '<?xml version="1.0" encoding="utf-8"?>\n<wert xmlns="' + NS + '">' + esc(wert) + '</wert>\n';

/** Misst alle Muster (oder die eines Elements) gegen die Werte. Liefert { ok, grund?, ergebnisse }. */
export async function messen({ xsd = FIXTURE, element = null, werte = WERTE_VORGABE } = {}) {
  const adapter = await import(path.join(REPO, 'tests', 'konformitaet', 'adapter', 'kosit-validator.mjs'));
  const umg = adapter.default.vorhanden();
  const alle = musterAusXsd(fs.readFileSync(xsd, 'utf8')).filter((x) => !element || x.elemente.includes(element));
  if (!umg.ok) return { ok: false, grund: umg.grund, ergebnisse: [] };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-xsd-muster-'));
  try {
    const ergebnisse = [];
    alle.forEach((m, i) => {
      const schema = path.join(dir, 'muster-' + i + '.xsd');
      fs.writeFileSync(schema, kleinesSchema(m.muster));
      const pfade = werte.map((w, j) => { const p = path.join(dir, 'muster-' + i + '-wert-' + j + '.xml'); fs.writeFileSync(p, instanz(w)); return p; });
      const urteile = adapter.pruefeGegenSchema(umg, schema, pfade);
      ergebnisse.push({ muster: m.muster, elemente: m.elemente, werte: werte.map((w, j) => {
        const u = urteile.get(pfade[j]);
        return { wert: w, gelesen: u.gelesen, gueltig: u.gueltig, fehler: u.fehler };
      }) });
    });
    return { ok: ergebnisse.every((e) => e.werte.every((w) => w.gelesen)), ergebnisse };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    adapter.default.aufraeumen();
  }
}

function argumente(argv) {
  const a = { werte: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--xsd') { a.xsd = v; i++; } else if (k === '--element') { a.element = v; i++; }
    else if (k === '--wert') { a.werte.push(v); i++; } else if (k === '--aus') { a.aus = v; i++; }
    else throw new Error('unbekanntes Argument: ' + k);
  }
  if (!a.werte.length) delete a.werte;
  return a;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let a;
  try { a = argumente(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
  const r = await messen(a);
  if (!r.ok && !r.ergebnisse.length) { console.error('xsd-muster-messen: ungemessen — ' + r.grund); process.exit(2); }
  for (const e of r.ergebnisse) {
    console.log('Muster ' + e.muster + '  (' + e.elemente.length + ' Element(e), erstes ' + (e.elemente[0] || '–') + ')');
    for (const w of e.werte) console.log('  ' + (w.gueltig ? 'gültig    ' : w.gelesen ? 'abgelehnt ' : 'ungelesen ') + JSON.stringify(w.wert)
      + (w.gueltig ? '' : '  — ' + (w.fehler[0] || '')));
  }
  if (a.aus) fs.writeFileSync(a.aus, JSON.stringify({ xsd: path.basename(a.xsd || FIXTURE), ...r }, null, 2) + '\n');
  process.exit(r.ok ? 0 : 2);
}
