#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════════════════
   fim-schema-beschaffen.mjs — ein FIM-Stammdatenschema samt Codelisten und amtlichem XSD holen (01.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────
   Für den Export fim-xml (Fassung v859, Report-before-Build vom 01.10.2026): Das Schema einer Leistung kommt aus dem
   FIM-Portal (offene API, https://fimportal.de/openapi.json), die Codelisten, die es referenziert, aus dem XRepository
   (genericode), und das XSD erzeugt der Umwandler des Portals selbst (POST /tools/xdf2-xsd-converter bzw.
   xdf3-xsd-converter) — kein eigenes Ableiten.

   ALLES LANDET AUSSERHALB DES REPOS (--ziel, üblich _quellen-bezuege/fim). Ohne Zustimmung der FITKO stehen Namen,
   Wertelisten, Struktur und Schemata weder im Repo noch im öffentlichen Produkt (U2-ADR-456; Entscheid vom 01.10.2026:
   auch die Verschachtelung ist Inhalt). Aus dem Schema liest dieses Werkzeug nur Kennung, Fassung und die Codelisten-
   Kennungen, die es referenziert.

   Gepinnt wird die abgelegte Datei: der Portal-Export trägt einen Erstellungszeitpunkt im Kopf, seine Prüfsumme ändert
   sich also bei jedem Abruf. Das Werkzeug schreibt je Datei SHA-256, Quelle, Abrufdatum und den Freigabestatus laut Portal
   in <ziel>/MANIFEST-schemata.json; dieselben Zeilen gehören nach bereiche/bezuege-quellen.json.

   Aufruf:
     node tools/fim-schema-beschaffen.mjs --schema S00000138 --fassung 1.0 --ziel <ordner>
     node tools/fim-schema-beschaffen.mjs        gegen die erfundene Fixture tests/fixtures/fim-schema/ (kein Netz)
   Exit 0 = beschafft, 1 = Befund (Schema unbekannt, Umwandler lehnt ab), 2 = Aufruf falsch.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'fim-schema');
export const PORTAL = 'https://fimportal.de';
export const XREPOSITORY = 'https://www.xrepository.de/api/version_codeliste/';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** Kennung, Fassung und XDatenfelder-Generation des Schemas — nichts sonst. */
export function schemaKopf(xdf) {
  const generation = /urn:xoev-de:fim:standard:xdatenfelder_2/.test(xdf) ? 2 : /urn:xoev-de:fim:standard:xdatenfelder_3/.test(xdf) ? 3 : null;
  const m = /<(?:\w+:)?stammdatenschema>\s*<(?:\w+:)?identifikation>\s*<(?:\w+:)?id>(S\d+)<\/(?:\w+:)?id>\s*<(?:\w+:)?version>([^<]+)</.exec(xdf)
    || /<(?:\w+:)?datenschema>\s*<(?:\w+:)?identifikation>\s*<(?:\w+:)?id>(S\d+)<\/(?:\w+:)?id>\s*<(?:\w+:)?version>([^<]+)</.exec(xdf);
  if (!m || !generation) throw new Error('kein FIM-Stammdatenschema (XDatenfelder 2 oder 3) erkannt');
  return { kennung: m[1], fassung: m[2].trim(), generation };
}

/** Die versionierten Kennungen der referenzierten Codelisten (canonicalVersionUri), sortiert, ohne Doppelte. */
export function codelistenAusXdf(xdf) {
  return [...new Set([...xdf.matchAll(/<(?:\w+:)?canonicalVersionUri>([^<]+)</g)].map((m) => m[1].trim()))].sort();
}

const dateiname = (urn) => urn.replace(/[^A-Za-z0-9._-]+/g, '_') + '.gc.xml';

/**
 * Holt Schema, Codelisten und XSD und legt sie unter `ziel` ab. `holen(url, optionen)` ist fetch-kompatibel (für die Probe
 * ersetzbar). Liefert die Manifest-Zeilen.
 */
export async function beschaffen({ schema, fassung, ziel, holen = fetch, heute = new Date().toISOString().slice(0, 10) }) {
  if (!/^S\d+$/.test(String(schema)) || !fassung || !ziel) throw new Error('--schema S…, --fassung und --ziel sind Pflicht');
  fs.mkdirSync(ziel, { recursive: true });
  const text = async (url, opt) => {
    const r = await holen(url, opt);
    if (!r.ok) throw new Error(url + ' → ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return Buffer.from(await r.arrayBuffer());
  };
  const zeilen = [];
  const ablegen = (name, inhalt, quelle, extra = {}) => {
    fs.writeFileSync(path.join(ziel, name), inhalt);
    zeilen.push({ datei: name, sha256: sha256(inhalt), quelle, abgerufen: heute, ...extra });
  };

  // Freigabestatus laut Portal (die XDF-Dateien tragen ihn nicht einheitlich, U2-ADR-456 Punkt 3).
  const fassungen = JSON.parse((await text(PORTAL + '/api/v1/schemas/' + schema)).toString('utf8'));
  const eintrag = (Array.isArray(fassungen) ? fassungen : []).find((x) => String(x.fim_version) === String(fassung));
  if (!eintrag) throw new Error(schema + ' ' + fassung + ' steht nicht im FIM-Portal');

  const xdfUrl = PORTAL + '/api/v1/schemas/' + schema + '/' + fassung + '/xdf';
  const xdf = await text(xdfUrl);
  const kopf = schemaKopf(xdf.toString('utf8'));
  if (kopf.kennung !== schema || kopf.fassung !== String(fassung)) throw new Error('das Portal lieferte ' + kopf.kennung + ' ' + kopf.fassung);
  const basis = schema + '_V' + fassung;
  ablegen(basis + '.xdf.xml', xdf, xdfUrl, { kennung: schema, fassung: String(fassung), freigabestatus: eintrag.freigabe_status, xdf: kopf.generation });

  const codelisten = [];
  for (const urn of codelistenAusXdf(xdf.toString('utf8'))) {
    const url = XREPOSITORY + urn + '/genericode';
    const gc = await text(url);
    ablegen(dateiname(urn), gc, url, { codeliste: urn });
    codelisten.push({ name: dateiname(urn), inhalt: gc });
  }

  // Das XSD erzeugt der Umwandler des Portals.
  const form = new FormData();
  form.append('schema', new Blob([xdf], { type: 'application/xml' }), basis + '.xdf.xml');
  for (const c of codelisten) form.append('code_lists', new Blob([c.inhalt], { type: 'application/xml' }), c.name);
  const umwandler = PORTAL + '/tools/xdf' + kopf.generation + '-xsd-converter';
  const xsd = await text(umwandler, { method: 'POST', body: form });
  if (!/<xs:schema\b/.test(xsd.toString('utf8'))) throw new Error('der Umwandler lieferte kein XSD');
  ablegen(basis + '.xsd', xsd, umwandler + ' (aus ' + basis + '.xdf.xml und den Codelisten)', { kennung: schema, fassung: String(fassung) });

  const manifestPfad = path.join(ziel, 'MANIFEST-schemata.json');
  const alt = fs.existsSync(manifestPfad) ? JSON.parse(fs.readFileSync(manifestPfad, 'utf8')) : [];
  const neu = alt.filter((z) => !zeilen.some((n) => n.datei === z.datei)).concat(zeilen).sort((a, b) => (a.datei < b.datei ? -1 : 1));
  fs.writeFileSync(manifestPfad, JSON.stringify(neu, null, 2) + '\n');
  return zeilen;
}

/** Ein fetch-Ersatz, der die erfundene Fixture ausliefert (für die Probe und den Lauf ohne Argument). */
export function fixtureHolen(dir = FIXTURE) {
  const antwort = (status, buf) => ({ ok: status === 200, status, text: async () => buf.toString('utf8'), arrayBuffer: async () => buf });
  return async (url, opt) => {
    if (url === PORTAL + '/api/v1/schemas/S99000001') return antwort(200, Buffer.from(JSON.stringify([{ fim_id: 'S99000001', fim_version: '1.0', freigabe_status: 6 }])));
    if (url === PORTAL + '/api/v1/schemas/S99000001/1.0/xdf') return antwort(200, fs.readFileSync(path.join(dir, 'S99000001_V1.0.xdf.xml')));
    if (url.startsWith(XREPOSITORY)) {
      const p = path.join(dir, dateiname(url.slice(XREPOSITORY.length).replace(/\/genericode$/, '')));
      return fs.existsSync(p) ? antwort(200, fs.readFileSync(p)) : antwort(404, Buffer.from('unbekannt'));
    }
    if (url === PORTAL + '/tools/xdf2-xsd-converter' && opt && opt.method === 'POST') return antwort(200, fs.readFileSync(path.join(dir, 'S99000001_V1.0.xsd')));
    return antwort(404, Buffer.from('unbekannt: ' + url));
  };
}

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const schema = arg('--schema');
  let lauf, tmp = null;
  if (schema) {
    lauf = beschaffen({ schema, fassung: arg('--fassung'), ziel: arg('--ziel') }).then((z) => ({ z, aufraeumen: () => {} }));
  } else {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fim-schema-'));
    lauf = beschaffen({ schema: 'S99000001', fassung: '1.0', ziel: tmp, holen: fixtureHolen() })
      .then((z) => ({ z, aufraeumen: () => fs.rmSync(tmp, { recursive: true, force: true }) }));
  }
  lauf.then(({ z, aufraeumen }) => { for (const x of z) console.log(x.sha256.slice(0, 12) + '  ' + x.datei); aufraeumen(); process.exit(0); })
    .catch((e) => {
      if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
      console.error('[fim-schema-beschaffen] ' + e.message); process.exit(/Pflicht/.test(e.message) ? 2 : 1);
    });
}
