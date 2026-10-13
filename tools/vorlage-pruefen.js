#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vorlage-pruefen.js — Vorab-Prüfung für Herausgeber (U2-ADR-496, 10.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Prüft eine Datei, bevor sie eingereicht wird: ein Modul, eine Vorlage, eine Anfrage oder ein Einreichungs-Paket.
   Das Urteil fällen die Prüfer der Bürger-App aus vivodepot.html, dieselben, die beim Einlassen laufen; die Regeln dazu
   stehen in docs/pruefregeln/pruefregeln.json, lesbar in docs/pruefregeln/pruefregeln.md.

   Aufruf:
     node tools/vorlage-pruefen.js --dokument <datei.json> [--art <art>] [--sprache de|en] [--json] [--aus <bericht.json>]
     node tools/vorlage-pruefen.js                      ohne Argument: alle Fälle in tests/fixtures/pruefregeln/
     node tools/vorlage-pruefen.js --regeln-pruefen     hält die Regeldatei gegen den Kern (jeder Ablehnungsgrund hat eine Regel)

   Ende-Code: 0 bestanden oder gemeldet · 1 abgewiesen · 2 nicht geprüft · 3 Aufruf- oder Lesefehler.
   Ohne Argument: 0, wenn jeder Fall das erwartete Urteil und die erwartete Regel trifft, sonst 1.

   Was das Urteil sagt: die Bürger-App dieser Fassung nimmt die Datei an oder nicht, und nach welcher Regel.
   Was es nicht sagt: ob der Inhalt richtig ist, und von wem die Datei kommt. Eine Signatur wird hier nicht geprüft und
   nicht erzeugt; das Werkzeug kennt keinen Schlüssel und öffnet keine Verbindung.

   Die Prüfung selbst ist die reine Funktion in tools/lib/vorab-pruefung.js. Hier steht nur, was Dateien braucht.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pruefeEinreichung } = require('./lib/vorab-pruefung.js');
const { regelnGegenKern } = require('./lib/pruefregeln-gegen-kern.js');
const M = require('./modul-schemas-messen.js');
const { kanonischJSON } = require('./lib/originale-summe.js');
/* Der Schema-Prüfer ist Prüfwerkzeug (devDependency, nach `npm ci` da). Er wird offen geladen: fehlt er, bricht das Werkzeug
   mit der Meldung von Node ab, statt eine Prüfung still auszulassen. */
const Ajv2020 = require('ajv/dist/2020').default;

const WURZEL = path.join(__dirname, '..');
const REGELN_PFAD = path.join(WURZEL, 'docs', 'pruefregeln', 'pruefregeln.json');
const FIXTURES = path.join(WURZEL, 'tests', 'fixtures', 'pruefregeln');
const KERN_PFAD = process.env.KERN_HTML_PATH ? path.resolve(process.env.KERN_HTML_PATH) : path.join(WURZEL, 'vivodepot.html');
const SCHEMA_SONST = Object.freeze({
  anfrage: 'docs/template-generator/anfrage-schema.json',
  einreichung: 'docs/template-generator/submission-schema.json',
});

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function regelnLaden(pfad) {
  const roh = fs.readFileSync(pfad || REGELN_PFAD);
  return { regeln: JSON.parse(roh.toString('utf8')), fingerabdruck: sha256(roh) };
}

/* Die Prüfer der Bürger-App, geladen wie in der Suite: tests/load-kern.js liest vivodepot.html und ändert sie nicht. */
function kernLaden() {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  const register = V.EINLASS_REGISTER;
  return {
    fassung: [V.BUILD_VERSION, V.BUILD_DATUM].filter(Boolean).join(' · ') || null,
    fingerabdruck: sha256(fs.readFileSync(KERN_PFAD)),
    registerTypen: register.map((r) => r.typ),
    nurGeprueft: register.filter((r) => r.nurGeprueft).map((r) => r.typ),
    /* Der Einlassweg selbst, in ein leeres Depot, das danach verworfen wird. */
    einlassen: (modul) => {
      const depot = V.leeresDepot();
      V.setData(depot);
      return V.modulEinlassen(JSON.stringify(modul), depot);
    },
    registerPruefen: (typ, modul) => register.find((r) => r.typ === typ).pruefen(JSON.parse(JSON.stringify(modul))),
    designPruefen: typeof V.designModulPruefen === 'function' ? (m) => V.designModulPruefen(JSON.parse(JSON.stringify(m))) : undefined,
    vorlagePruefen: (tpl) => V.validateTemplate(JSON.parse(JSON.stringify(tpl))),
    anfragePruefen: (a) => V.anfragePruefen(JSON.parse(JSON.stringify(a))),
  };
}

/* Das Schema der Art als zweite Stimme. Für eine Art ohne Schema antwortet sie null: „nicht geprüft“. */
function schemaPrueferBauen() {
  const fertig = new Map();
  return (art, dokument) => {
    const rel = SCHEMA_SONST[art] || (art === 'vorlage' ? null : M.schemaPfad(art));
    if (!rel || !fs.existsSync(path.join(WURZEL, rel))) return null;
    if (!fertig.has(rel)) {
      const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
      fertig.set(rel, ajv.compile(JSON.parse(fs.readFileSync(path.join(WURZEL, rel), 'utf8'))));
    }
    const validieren = fertig.get(rel);
    if (validieren(JSON.parse(JSON.stringify(dokument)))) return [];
    return (validieren.errors || []).map((e) => ({ fundstelle: e.instancePath || '/', text: e.message + ' (' + rel + ')' }));
  };
}

function umgebung(opts) {
  const r = regelnLaden(opts && opts.regelnPfad);
  return {
    regeln: r.regeln, regelnFingerabdruck: r.fingerabdruck, kern: kernLaden(), schemaPruefen: schemaPrueferBauen(),
    fingerabdruck: (d) => 'sha256:' + sha256(kanonischJSON(d)),
  };
}

function pruefeDatei(pfad, u, extra) {
  const dokument = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  return pruefeEinreichung(dokument, Object.assign({}, u, extra || {}));
}

/* Alle Fälle unter tests/fixtures/pruefregeln/: je Datei { art, faelle: [{ name, urteil, regel?, erzwingeArt?, dokument }] }. */
function fixturesLaden(verzeichnis) {
  const aus = [];
  for (const datei of fs.readdirSync(verzeichnis || FIXTURES).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()) {
    const inhalt = JSON.parse(fs.readFileSync(path.join(verzeichnis || FIXTURES, datei), 'utf8'));
    for (const fall of inhalt.faelle || []) aus.push(Object.assign({ datei, art: inhalt.art }, fall));
  }
  return aus;
}

function fixturesPruefen(u, verzeichnis) {
  const abweichungen = [];
  const faelle = fixturesLaden(verzeichnis);
  for (const f of faelle) {
    /* `erzwingeArt` prüft den Fall als diese Art, wie --art: so erreicht auch ein Dokument ohne erkennbare Art ihren Prüfer. */
    const e = pruefeEinreichung(f.dokument, f.erzwingeArt ? Object.assign({}, u, { art: f.erzwingeArt }) : u);
    const regeln = e.zeilen.map((z) => z.regel);
    /* Eine Abweisung ohne Regelkennung ist ein Grund der App, den die Regeldatei nicht kennt. */
    if (e.zeilen.some((z) => z.schwere === 'abweisung' && !z.regel)) abweichungen.push(`${f.datei} · ${f.name}: Abweisung ohne Regel (${e.zeilen.filter((z) => !z.regel).map((z) => z.kernGrund).join(', ')})`);
    if (e.urteil !== f.urteil) abweichungen.push(`${f.datei} · ${f.name}: Urteil ${e.urteil}, erwartet ${f.urteil} (${e.zeilen.map((z) => z.regel || z.kernGrund).join(', ')})`);
    else if (f.regel && regeln.indexOf(f.regel) < 0) abweichungen.push(`${f.datei} · ${f.name}: Regel ${f.regel} nicht getroffen (getroffen: ${regeln.join(', ') || 'keine'})`);
  }
  return { faelle, abweichungen };
}

function berichtText(pfad, e) {
  const z = [];
  z.push(`${pfad}: ${e.urteil}` + (e.art ? ` (${e.art})` : ''));
  for (const x of e.zeilen) {
    z.push(`  [${x.schwere}] ${x.regel || 'ohne Regel'}` + (x.fundstelle ? ` · ${x.fundstelle}` : '') + `\n      ${x.grund || ''}` + (x.kernGrund && x.kernGrund !== x.grund ? ` (${x.kernGrund})` : ''));
  }
  z.push(`  Regeln: Fassung ${e.regelFassung} · ${e.pruefregelnFingerabdruck}`);
  z.push(`  Bürger-App: ${e.kernFassung} · ${e.kernFingerabdruck}`);
  z.push(`  Inhalt: ${e.inhaltsFingerabdruck}`);
  return z.join('\n');
}

module.exports = { regelnLaden, kernLaden, schemaPrueferBauen, umgebung, pruefeDatei, fixturesLaden, fixturesPruefen, regelnGegenKern,
  REGELN_PFAD, FIXTURES };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const hat = (n) => argv.indexOf(n) >= 0;
  try {
    if (hat('--regeln-pruefen')) {
      const r = regelnGegenKern(regelnLaden().regeln, fs.readFileSync(KERN_PFAD, 'utf8'));
      for (const f of r.fehlend) console.log('ohne Regel: ' + f);
      for (const v of r.verwaist) console.log('Regel ohne Grund im Kern: ' + v);
      console.log(`Regeln gegen Kern: ${r.fehlend.length} Gründe ohne Regel, ${r.verwaist.length} Regeln ohne Grund im Kern`);
      process.exit(r.fehlend.length || r.verwaist.length ? 1 : 0);
    }
    const u = umgebung();
    const dokument = arg('--dokument');
    if (!dokument) {
      const r = fixturesPruefen(u);
      for (const a of r.abweichungen) console.log('ABWEICHUNG ' + a);
      console.log(`Fälle: ${r.faelle.length} · Abweichungen: ${r.abweichungen.length}`);
      process.exit(r.abweichungen.length ? 1 : 0);
    }
    const e = pruefeDatei(dokument, u, { art: arg('--art') || undefined, sprache: arg('--sprache') || 'de' });
    const ziel = arg('--aus');
    if (ziel) fs.writeFileSync(ziel, JSON.stringify(Object.assign({ dokument: path.basename(dokument), geprueftAm: new Date().toISOString() }, e), null, 2) + '\n');
    console.log(hat('--json') ? JSON.stringify(e, null, 2) : berichtText(dokument, e));
    process.exit(e.urteil === 'abgewiesen' ? 1 : e.urteil === 'nichtGeprueft' ? 2 : 0);
  } catch (e) {
    console.error('vorlage-pruefen: ' + (e && e.message || e));
    process.exit(3);
  }
}
