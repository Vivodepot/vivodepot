#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   bausteinregister-bauen.js — die abschließende Liste der Bausteine (08.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Herausgeberbedingungen (§ 3 Abs. 6) sagen: Herausgeberinnen gestalten mit den Bausteinen, die Vivodepot allen
   gleich bereitstellt, und welche das sind, steht abschließend an einer Fundstelle. Diese Fundstelle erzeugt dieses
   Werkzeug, neben dem Feldregister unter register.vivodepot.de:

     bausteine.json          die Liste, maschinenlesbar
     bausteine.json.sha256   die Prüfsumme (Form wie feldregister.json.sha256)
     bausteine.html          die Seite, Deutsch und Englisch
     index.json              der Katalog-Index, hier nur der eigene Eintrag (Achse „baustein“)

   ABSCHLIESSEND HEISST: AUS DEM KERN. Bausteine sind die Modularten, die der Kern einlässt (`EINLASS_REGISTER` in
   vivodepot.html), dazu die Kennungen des Feldregisters, aus denen Vorlagen bestehen. Die Modularten liest das Werkzeug
   aus dem Kern, nicht aus einer Liste. Beschriftung und Status stehen in tools/bausteinregister/beschriftungen.json; eine
   Modulart ohne Eintrag dort bricht ab, ebenso ein Eintrag ohne Modulart im Kern, der nicht eingestellt ist.

   EINSTELLEN NUR MIT VORLAUF. Ein Baustein, der eingestellt wird, steht weiter in der Liste, mit dem Tag der Ankündigung
   und dem Tag, ab dem er nicht mehr bereitsteht; dazwischen liegen mindestens drei Monate (§ 3 Abs. 6). Aus der Liste
   verschwindet er nie; --check hält die Liste gegen die zuletzt eingecheckte Fassung (tools/bausteinregister/bausteine.json).

   KEINE FASSUNG AUS DER UHR. Die Fassung ist der Kern-Stand. Ein Datum des Laufs steht nicht in der Liste, sonst wäre sie
   an jedem Tag eine andere und --check jeden Morgen rot.

   Aufruf:
     node tools/bausteinregister-bauen.js                       → schreibt nach register-ausgabe/
     node tools/bausteinregister-bauen.js --ziel <ordner>        → anderer Zielordner
     node tools/bausteinregister-bauen.js --kern <datei>         → andere Kern-Datei
     node tools/bausteinregister-bauen.js --schreiben            → die eingecheckte Fassung neu schreiben
     node tools/bausteinregister-bauen.js --check                → Abbruch, wenn die eingecheckte Fassung nicht der heutigen
                                                                    entspricht oder ein Baustein verschwunden ist
     (--datum wird von der Register-Auslieferung mitgegeben und nicht verwendet.)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { INDEX_DATEI, indexEintragBauen, indexJsonBauen, vorhandenenIndexLesen } = require('./lib/register-index.js');
const { LIZENZ, HERAUSGEBER } = require('./lib/feldregister-adressen.js');
const { naviconLinksAusKern } = require('./lib/navicon.js');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const BESCHRIFTUNGEN_PFAD = path.join(REPO, 'tools', 'bausteinregister', 'beschriftungen.json');
const EINGECHECKT_PFAD = path.join(REPO, 'tools', 'bausteinregister', 'bausteine.json');
const SCHEMA_FASSUNGEN_PFAD = path.join(REPO, 'docs', 'schema-fassungen.json');
const ZIEL_VORGABE = path.join(REPO, 'register-ausgabe');

const JSON_DATEI = 'bausteine.json';
const PRUEFSUMMEN_DATEI = JSON_DATEI + '.sha256';
const SEITEN_DATEI = 'bausteine.html';
const INDEX_ACHSE = 'baustein';
const STATUS = Object.freeze(['bereitgestellt', 'angekuendigt', 'eingestellt']);
const VORLAUF_MONATE = 3;

/* Abgestimmt mit der Rechtsprüfung am 08.10.2026; ändert sich nur mit ihr. */
const EINLEITUNG = Object.freeze({
  de: 'Diese Liste nennt abschließend die Bausteine, mit denen Herausgeberinnen Vorlagen und Module für Vivodepot '
    + 'gestalten: die Modularten unten und die Kennungen des Feldregisters. Jede Fassung dieser Liste bleibt unter ihrer '
    + 'Adresse abrufbar. Wird ein Baustein eingestellt, steht hier, wann das angekündigt wurde und ab wann es gilt; '
    + 'Herausgeberinnen, die ihn in einer signierten Vorlage oder einem signierten Modul verwenden, erhalten die '
    + 'Ankündigung zusätzlich in Textform.',
  en: 'This list sets out, exhaustively, the building blocks publishers use to design templates and modules for '
    + 'Vivodepot: the module types below and the identifiers of the field register. Every edition of this list remains '
    + 'available at its address. If a building block is discontinued, this page shows when that was announced and when '
    + 'it takes effect; publishers who use it in a signed template or a signed module also receive the announcement in '
    + 'text form.',
});
const KOPFZEILE = 'ERZEUGT von tools/bausteinregister-bauen.js aus vivodepot.html (EINLASS_REGISTER) und '
  + 'tools/bausteinregister/beschriftungen.json. Nicht von Hand bearbeiten.';

/* ── Quellen ──────────────────────────────────────────────────────────── */

function kernLesen(kernPfad) { return fs.readFileSync(kernPfad || KERN_PFAD, 'utf8'); }

function standzahl(kern) {
  const m = /const SCHALEN_STAND = '(v\d+)'/.exec(kern);
  if (!m) throw new Error('bausteinregister-bauen: SCHALEN_STAND nicht gefunden — nicht raten, nachsehen.');
  return m[1];
}

/** Die Modularten aus dem Block `const EINLASS_REGISTER = Object.freeze([ … ]);` des Kerns, in Kern-Reihenfolge. */
function modulartenAusKern(kern) {
  const anfang = kern.indexOf('const EINLASS_REGISTER = Object.freeze([');
  if (anfang < 0) throw new Error('bausteinregister-bauen: const EINLASS_REGISTER nicht gefunden.');
  const ende = kern.indexOf('\n]);', anfang);
  if (ende < 0) throw new Error('bausteinregister-bauen: Ende von EINLASS_REGISTER nicht gefunden.');
  const block = kern.slice(anfang, ende);
  const typen = [];
  const re = /^\s*typ: '([A-Za-z]+)', slot: '[A-Za-z]+',/gm;
  let m;
  while ((m = re.exec(block))) typen.push(m[1]);
  if (!typen.length) throw new Error('bausteinregister-bauen: EINLASS_REGISTER ohne Eintrag — eine leere Liste ist keine.');
  if (new Set(typen).size !== typen.length) throw new Error('bausteinregister-bauen: eine Modulart steht doppelt im Kern.');
  return typen;
}

function jsonLesen(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

/* ── Prüfen und Zusammensetzen ────────────────────────────────────────── */

function istDatum(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')); }

function plusMonate(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** Wirft beim ersten Verstoß; liefert die geordneten Einträge (Kern-Reihenfolge, Eingestellte am Ende). */
function bausteineZusammensetzen({ typenImKern, beschriftungen, schemaFassungen }) {
  const eintraege = (beschriftungen && beschriftungen.bausteine) || [];
  const nachTyp = new Map();
  for (const e of eintraege) {
    if (!e || typeof e.typ !== 'string') throw new Error('bausteinregister-bauen: Eintrag ohne typ in den Beschriftungen.');
    if (nachTyp.has(e.typ)) throw new Error('bausteinregister-bauen: ' + e.typ + ' steht doppelt in den Beschriftungen.');
    nachTyp.set(e.typ, e);
  }
  const imKern = new Set(typenImKern);
  for (const t of typenImKern) {
    if (!nachTyp.has(t)) throw new Error('bausteinregister-bauen: die Modulart ' + t + ' steht im Kern, aber nicht in den Beschriftungen — eintragen.');
  }
  const schemas = (schemaFassungen && schemaFassungen.schemas) || {};
  const aus = [];
  for (const e of eintraege) {
    if (!STATUS.includes(e.status)) throw new Error('bausteinregister-bauen: ' + e.typ + ' trägt unbekannten Status „' + e.status + '“.');
    if (!imKern.has(e.typ) && e.status !== 'eingestellt') {
      throw new Error('bausteinregister-bauen: ' + e.typ + ' fehlt im Kern und ist nicht eingestellt — ein Baustein geht nur mit Ankündigung.');
    }
    for (const s of ['de', 'en']) {
      if (!e.label || !e.label[s] || !e.zweck || !e.zweck[s]) throw new Error('bausteinregister-bauen: ' + e.typ + ' fehlt Beschriftung oder Zweck in ' + s + '.');
    }
    const eintrag = { typ: e.typ, status: e.status };
    if (e.status === 'bereitgestellt') {
      if (e.angekuendigtAm || e.eingestelltAb) throw new Error('bausteinregister-bauen: ' + e.typ + ' ist bereitgestellt und trägt trotzdem Daten.');
    } else {
      if (!istDatum(e.angekuendigtAm) || !istDatum(e.eingestelltAb)) {
        throw new Error('bausteinregister-bauen: ' + e.typ + ' ist ' + e.status + ' und braucht angekuendigtAm und eingestelltAb (JJJJ-MM-TT).');
      }
      if (e.eingestelltAb < plusMonate(e.angekuendigtAm, VORLAUF_MONATE)) {
        throw new Error('bausteinregister-bauen: ' + e.typ + ': zwischen Ankündigung ' + e.angekuendigtAm + ' und ' + e.eingestelltAb
          + ' liegen weniger als ' + VORLAUF_MONATE + ' Monate (Herausgeberbedingungen § 3 Abs. 6).');
      }
      eintrag.angekuendigtAm = e.angekuendigtAm;
      eintrag.eingestelltAb = e.eingestelltAb;
    }
    eintrag.label = { de: e.label.de, en: e.label.en };
    eintrag.zweck = { de: e.zweck.de, en: e.zweck.en };
    const sch = schemas[e.schema];
    if (!sch || !Array.isArray(sch.fassungen) || !sch.fassungen.length) {
      throw new Error('bausteinregister-bauen: ' + e.typ + ' nennt das Schema „' + e.schema + '“, das in docs/schema-fassungen.json fehlt.');
    }
    const letzte = sch.fassungen[sch.fassungen.length - 1];
    eintrag.schema = { adresse: sch.adresse, fassung: letzte.n, fassungAdresse: letzte.adresse };
    aus.push(eintrag);
  }
  const rang = (t) => (imKern.has(t) ? typenImKern.indexOf(t) : typenImKern.length);
  return aus.sort((a, b) => rang(a.typ) - rang(b.typ) || a.typ.localeCompare(b.typ));
}

function listeJson(bausteine, kernStand) {
  return JSON.stringify({
    hinweis: KOPFZEILE,
    fassung: { kern: kernStand },
    lizenz: { ...LIZENZ, gilt_fuer: 'diese Liste', nicht_fuer: 'die Module und Vorlagen der Herausgeberinnen' },
    herausgeber: HERAUSGEBER,
    einleitung: { ...EINLEITUNG },
    feldkennungen: { datei: 'feldregister.json', seite: './', hinweis: 'Die Kennungen des Feldregisters derselben Fassung sind Bausteine.' },
    fassungen: 'v<kern>/' + JSON_DATEI,
    anzahl: bausteine.length,
    bausteine,
  }, null, 2) + '\n';
}

/** Kein Baustein verschwindet: jede Modulart der vorigen Fassung steht auch in der neuen. */
function verschwundene(vorige, neue) {
  const jetzt = new Set((neue.bausteine || []).map((b) => b.typ));
  return (vorige.bausteine || []).map((b) => b.typ).filter((t) => !jetzt.has(t));
}

/* ── Seite ────────────────────────────────────────────────────────────── */

function h(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const STATUS_TEXT = Object.freeze({
  bereitgestellt: { de: 'bereitgestellt', en: 'available' },
  angekuendigt: { de: 'Einstellung angekündigt', en: 'discontinuation announced' },
  eingestellt: { de: 'eingestellt', en: 'discontinued' },
});

function seiteHtml(bausteine, kernStand, hash, iconLinks) {
  const z = [];
  z.push('<!doctype html>', '<html lang="de">', '<head>', '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Bausteine — Vivodepot</title>', ...(iconLinks ? [iconLinks] : []), '<!-- ' + KOPFZEILE + ' Fassung ' + h(kernStand) + '. -->',
    '<link rel="alternate" type="application/json" href="' + JSON_DATEI + '">',
    '<link rel="license" href="' + LIZENZ.url + '">', '<style>',
    '  :root { --salbei: #4F6539; --cream: #FAF8F3; --ink: #21261F; --ink2: #5A6154; --line: #DDD9CE; }',
    '  body { margin: 0; background: var(--cream); color: var(--ink); line-height: 1.6;',
    '         font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }',
    '  main { max-width: 40rem; margin: 0 auto; padding: 4rem 1.5rem; }',
    '  h1 { font-size: 1.5rem; font-weight: 600; color: var(--salbei); margin: 0 0 1.5rem; }',
    '  h2 { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em; color: var(--ink2); margin: 2.5rem 0 0.75rem; }',
    '  .lang-en { color: var(--ink2); }',
    '  ul.bausteine { list-style: none; margin: 0; padding: 0; }',
    '  ul.bausteine li { padding: 0.6rem 0; border-bottom: 1px solid var(--line); }',
    '  .name { font-weight: 600; } .status { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ink2); margin-left: 0.5rem; }',
    '  .status-angekuendigt, .status-eingestellt { color: #9a5b1f; }',
    '  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.8rem; }',
    '  .klein { font-size: 0.85rem; color: var(--ink2); }',
    '  footer { border-top: 1px solid var(--line); margin-top: 3rem; padding-top: 1rem; font-size: 0.85rem; color: var(--ink2); }',
    '  a { color: var(--salbei); }', '</style>', '</head>', '<body>', '<main>');
  z.push('  <h1>Bausteine</h1>', '  <p>' + h(EINLEITUNG.de).replace('Kennungen des Feldregisters', 'Kennungen des <a href="./">Feldregisters</a>') + '</p>',
    '  <p class="lang-en" lang="en"><strong>Building blocks.</strong> '
      + h(EINLEITUNG.en).replace('identifiers of the field register', 'identifiers of the <a href="./">field register</a>') + '</p>');
  z.push('  <h2>Stand</h2>',
    '  <p>Fassung ' + h(kernStand) + ' · ' + bausteine.length + ' Modularten · <a href="' + JSON_DATEI + '">' + JSON_DATEI + '</a> · '
      + 'Prüfsumme <a href="' + PRUEFSUMMEN_DATEI + '">' + PRUEFSUMMEN_DATEI + '</a></p>',
    '  <p class="klein"><code>' + hash + '  ' + JSON_DATEI + '</code></p>',
    '  <p class="klein">Frühere Fassungen: <code>v&lt;fassung&gt;/' + JSON_DATEI + '</code> · '
      + '<span lang="en">Earlier editions: <code>v&lt;edition&gt;/' + JSON_DATEI + '</code></span></p>');
  z.push('  <h2>Modularten · Module types</h2>', '  <ul class="bausteine">');
  for (const b of bausteine) {
    const st = STATUS_TEXT[b.status];
    const daten = b.status === 'bereitgestellt' ? ''
      : '<br><span class="klein">angekündigt am ' + h(b.angekuendigtAm) + ', ab ' + h(b.eingestelltAb) + ' nicht mehr bereitgestellt · '
        + '<span lang="en">announced ' + h(b.angekuendigtAm) + ', discontinued from ' + h(b.eingestelltAb) + '</span></span>';
    z.push('    <li id="' + h(b.typ) + '"><span class="name">' + h(b.label.de) + '</span> · <span lang="en">' + h(b.label.en) + '</span>'
      // Der Status steht nur, wenn er vom Regelfall abweicht (25.10.2026: „bereitgestellt“ an jeder Zeile unterschied nichts).
      + (b.status === 'bereitgestellt' ? '' : '<span class="status status-' + h(b.status) + '">' + h(st.de) + ' · <span lang="en">' + h(st.en) + '</span></span>')
      + '<br>' + h(b.zweck.de) + '<br><span class="lang-en" lang="en">' + h(b.zweck.en) + '</span>'
      + '<br><span class="klein"><code>' + h(b.typ) + '</code> · Schema <a href="' + h(b.schema.adresse) + '">' + h(b.schema.adresse) + '</a>'
      + ' (Fassung ' + h(b.schema.fassung) + ')</span>' + daten + '</li>');
  }
  z.push('  </ul>');
  // Der Abschnitt „Feldkennungen“ ist entfallen (25.10.2026): die Einleitung nennt die Kennungen und verweist auf das Feldregister.
  z.push('  <footer>', '    <p>Diese Liste ist unter <a href="' + LIZENZ.url + '">CC0 1.0</a> freigegeben. · ' + h(HERAUSGEBER)
    + ' · <a href="https://vivodepot.de">vivodepot.de</a></p>', '  </footer>', '</main>', '</body>', '</html>');
  return z.join('\n') + '\n';
}

/* ── Bauen, Schreiben, Prüfen ─────────────────────────────────────────── */

function bauen(opt) {
  const o = opt || {};
  const kern = kernLesen(o.kernPfad);
  const kernStand = standzahl(kern);
  const bausteine = bausteineZusammensetzen({
    typenImKern: o.typenImKern || modulartenAusKern(kern),
    beschriftungen: o.beschriftungen || jsonLesen(o.beschriftungenPfad || BESCHRIFTUNGEN_PFAD),
    schemaFassungen: o.schemaFassungen || jsonLesen(o.schemaFassungenPfad || SCHEMA_FASSUNGEN_PFAD),
  });
  const json = listeJson(bausteine, kernStand);
  const hash = crypto.createHash('sha256').update(Buffer.from(json, 'utf8')).digest('hex');
  return {
    kernStand, bausteine, json, hash,
    pruefsumme: hash + '  ' + JSON_DATEI + '\n',
    html: seiteHtml(bausteine, kernStand, hash, naviconLinksAusKern(kern).join('\n')),
    indexEintrag: indexEintragBauen({ achse: INDEX_ACHSE, datei: JSON_DATEI, pruefsummeDatei: PRUEFSUMMEN_DATEI, hash, anzahl: bausteine.length, fassung: { kern: kernStand } }),
  };
}

function schreiben(zielOrdner, a) {
  fs.mkdirSync(zielOrdner, { recursive: true });
  const index = indexJsonBauen(vorhandenenIndexLesen(zielOrdner), a.indexEintrag);
  for (const [name, inhalt] of [[JSON_DATEI, a.json], [PRUEFSUMMEN_DATEI, a.pruefsumme], [SEITEN_DATEI, a.html], [INDEX_DATEI, index]]) {
    fs.writeFileSync(path.join(zielOrdner, name), inhalt);
  }
}

/** --check: die eingecheckte Fassung ist die heutige, und kein Baustein ist verschwunden. Liefert die Befunde. */
function pruefen(a, eingechecktPfad) {
  const p = eingechecktPfad || EINGECHECKT_PFAD;
  if (!fs.existsSync(p)) return [p + ' fehlt — mit --schreiben anlegen.'];
  const alt = fs.readFileSync(p, 'utf8');
  const befunde = [];
  const weg = verschwundene(JSON.parse(alt), JSON.parse(a.json));
  if (weg.length) befunde.push('verschwunden gegenüber der eingecheckten Fassung: ' + weg.join(', ') + ' — eingestellt wird mit Status, nie durch Löschen.');
  if (alt !== a.json) befunde.push(p + ' entspricht nicht der heutigen Liste — node tools/bausteinregister-bauen.js --schreiben.');
  return befunde;
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (f) => { const i = argv.indexOf(f); return (i >= 0 && argv[i + 1]) ? path.resolve(argv[i + 1]) : null; };
  const a = bauen({ kernPfad: wert('--kern') });
  if (argv.includes('--check')) {
    const befunde = pruefen(a);
    if (befunde.length) { for (const b of befunde) console.error('bausteinregister-bauen: ' + b); process.exit(1); }
    console.log('bausteinregister-bauen: OK — ' + a.bausteine.length + ' Modularten, Fassung ' + a.kernStand + '.');
    return;
  }
  if (argv.includes('--schreiben')) {
    const befunde = pruefen(a).filter((b) => b.startsWith('verschwunden'));
    if (befunde.length) { console.error('bausteinregister-bauen: ' + befunde[0]); process.exit(1); }
    fs.writeFileSync(EINGECHECKT_PFAD, a.json);
    console.log('bausteinregister-bauen: ' + path.relative(REPO, EINGECHECKT_PFAD) + ' geschrieben, ' + a.bausteine.length + ' Modularten.');
    return;
  }
  const ziel = wert('--ziel') || ZIEL_VORGABE;
  schreiben(ziel, a);
  console.log('bausteinregister-bauen: ' + a.bausteine.length + ' Modularten · Fassung ' + a.kernStand + ' → ' + ziel);
}

if (require.main === module) main();
module.exports = {
  modulartenAusKern, bausteineZusammensetzen, listeJson, verschwundene, seiteHtml, bauen, schreiben, pruefen, plusMonate,
  JSON_DATEI, PRUEFSUMMEN_DATEI, SEITEN_DATEI, INDEX_ACHSE, STATUS, VORLAUF_MONATE, EINLEITUNG, BESCHRIFTUNGEN_PFAD, EINGECHECKT_PFAD,
};
