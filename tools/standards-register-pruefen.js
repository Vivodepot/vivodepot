#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   standards-register-pruefen.js — das Standards-Register und das Beschaffungs-Manifest
   gegen ihren Vertrag (docs/standards-schnittstelle.md)
   ────────────────────────────────────────────────────────────────────────────
   Das Register (tools/standards-register/<familie>.json, eine Datei je Familie) sagt, welche
   Standards Vivodepot spricht, in welcher Richtung und wie weit. Das Manifest
   (tools/standards-artefakte.json) pinnt alles, was zum Prüfen beschafft wird. Dieses Modul
   prüft nur die FORM und die Querbezüge — „grün" misst die Konformitäts-Suite, nicht das
   Register. Darum: `echt` folgt nie aus der Struktur allein; die Struktur ist nur die
   Voraussetzung dafür.

   Aufruf:
     node tools/standards-register-pruefen.js     Register + Manifest des Repos; Exit 1 bei Mängeln
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const REGISTER_DIR = path.join(REPO, 'tools', 'standards-register');
const MANIFEST = path.join(REPO, 'tools', 'standards-artefakte.json');
const ADAPTER_DIR = path.join(REPO, 'tests', 'konformitaet', 'adapter');
const INLINE_VALIDATOREN = path.join(REPO, 'tests', 'konformitaet', 'externe-validatoren.mjs');

const FAMILIEN = Object.freeze(['fhir-ig', 'xml-xsd', 'rdf-shacl', 'json-schema', 'signatur', 'codeliste', 'pdf', 'text-rfc', 'barrierefreiheit']);
const STATUS = Object.freeze(['echt', 'teilweise', 'orientiert', 'fehlt', 'strukturell-nicht-erzeugbar', 'kein-standard-vorhanden']);
const STATUS_MIT_GRUND = Object.freeze(['strukturell-nicht-erzeugbar', 'kein-standard-vorhanden']);
const LIZENZ = Object.freeze(['geprueft', 'rueckfrage-offen', 'genehmigung-noetig']);
const RICHTUNG = Object.freeze(['lesen', 'schreiben', 'verwahren', 'empfangen', 'pruefen', 'vorzeigen', 'selbstauskunft-ausgeben']);
const BEREICH = Object.freeze(['gesundheit', 'verwaltung', 'identitaet', 'finanzen', 'bildung', 'dokumente', 'querschnitt']);
// Holder-Regel: fremde Nachweise werden empfangen, geprüft, verwahrt, vorgezeigt — nie ausgestellt.
const HOLDER_ERLAUBT = Object.freeze(['empfangen', 'pruefen', 'verwahren', 'vorzeigen', 'selbstauskunft-ausgeben', 'lesen']);
const ART = Object.freeze(['werkzeug', 'daten']);
const HEX64 = /^[0-9a-f]{64}$/;

const liste = (x) => (Array.isArray(x) ? x : []);

/* ── Manifest ─────────────────────────────────────────────────────────────── */
function pruefeManifest(manifest) {
  const m = [];
  if (!Array.isArray(manifest)) return ['Manifest ist keine Liste'];
  const ids = new Set();
  for (const a of manifest) {
    const wer = 'Artefakt ' + (a && a.id ? a.id : '(ohne id)');
    if (!a || typeof a.id !== 'string' || !a.id) { m.push(wer + ': id fehlt'); continue; }
    if (ids.has(a.id)) m.push(wer + ': doppelt');
    ids.add(a.id);
    if (!ART.includes(a.art)) m.push(wer + ': art muss ' + ART.join(' oder ') + ' sein');
    if (!a.version) m.push(wer + ': version fehlt');
    if (!a.lizenz) m.push(wer + ': lizenz fehlt');
    // Genau eine Beschaffungsform: Datei (url + sha256), Container (docker per Digest), Quelle (Repo per Tag-Objekt) oder
    // lokal (ein Lizenzpaket, das nicht weitergegeben werden darf: Name und sha256, beschafft von Hand; nie ein Pfad).
    const formen = [a.lokal !== undefined ? 'lokal' : (a.url !== undefined || a.sha256 !== undefined ? 'datei' : null), a.docker !== undefined ? 'docker' : null, a.quelle !== undefined ? 'quelle' : null].filter(Boolean);
    if (formen.length !== 1) { m.push(wer + ': genau eine Form — url+sha256, docker, quelle oder lokal (hat: ' + (formen.join(', ') || 'keine') + ')'); continue; }
    if (formen[0] === 'lokal') {
      const l = a.lokal || {};
      if (!l.name || /[\\/]/.test(l.name)) m.push(wer + ': lokal.name ist der Dateiname, ohne Pfad');
      if (!HEX64.test(String(a.sha256 || ''))) m.push(wer + ': sha256 fehlt oder ist keine 64-stellige Hexzahl');
      if (!l.bezug) m.push(wer + ': lokal.bezug (woher, unter welcher Lizenz) fehlt');
      if (a.url !== undefined) m.push(wer + ': lokal hat keine url');
    } else if (formen[0] === 'datei') {
      if (typeof a.url !== 'string' || !/^https:\/\//.test(a.url)) m.push(wer + ': url fehlt oder ist nicht https');
      if (!HEX64.test(String(a.sha256 || ''))) m.push(wer + ': sha256 fehlt oder ist keine 64-stellige Hexzahl');
    } else if (formen[0] === 'docker') {
      if (a.art !== 'werkzeug') m.push(wer + ': docker nur für art werkzeug');
      if (!/^[^@\s]+@sha256:[0-9a-f]{64}$/.test(String(a.docker))) m.push(wer + ': docker nur nach Digest gepinnt (<image>@sha256:<64 hex>), nie nach Tag');
    } else {
      if (a.art !== 'werkzeug') m.push(wer + ': quelle nur für art werkzeug');
      if (!/^https:\/\/\S+@[0-9a-f]{40}$/.test(String(a.quelle))) m.push(wer + ': quelle als <repo-url>@<Tag-Objekt-SHA, 40 hex>');
    }
    if (a.entpacken != null && !['zip', 'tgz'].includes(a.entpacken)) m.push(wer + ': entpacken nur null, zip oder tgz');
  }
  return m;
}

/* ── Register ─────────────────────────────────────────────────────────────── */
/**
 * @param dateien  [{ datei, inhalt }] — je Familie eine Registerdatei
 * @param kontext  { manifest, adapterIds:Set, exportIds:Set, importIds:Set, bezuegeIds:Set, adapterStandards: Map<adapterId, string[]> }
 */
function pruefeRegister(dateien, kontext) {
  const m = [];
  const manifestIds = new Map(liste(kontext.manifest).map((a) => [a.id, a]));
  const alleIds = new Map();
  for (const { datei, inhalt: r } of dateien) {
    const wo = datei;
    if (!r || typeof r !== 'object') { m.push(wo + ': kein Objekt'); continue; }
    if (!FAMILIEN.includes(r.familie)) m.push(wo + ': unbekannte familie ' + JSON.stringify(r.familie) + ' (erlaubt: ' + FAMILIEN.join(', ') + ')');
    else if (path.basename(datei, '.json') !== r.familie) m.push(wo + ': Dateiname muss die Familie sein (' + r.familie + '.json)');
    if (r.adapter !== null && !kontext.adapterIds.has(r.adapter)) m.push(wo + ': adapter ' + JSON.stringify(r.adapter) + ' ist weder eine Datei in tests/konformitaet/adapter/ noch ein Eintrag in VALIDATOREN');
    for (const s of liste(r.standards)) {
      const wer = wo + ' › ' + (s && s.id ? s.id : '(ohne id)');
      if (!s || !s.id) { m.push(wer + ': id fehlt'); continue; }
      if (alleIds.has(s.id)) m.push(wer + ': id schon in ' + alleIds.get(s.id));
      alleIds.set(s.id, wo);
      for (const f of ['name', 'version', 'herausgeber']) if (!s[f]) m.push(wer + ': ' + f + ' fehlt');
      if (!s.quelle || !/^https:\/\//.test(String(s.quelle.url || '')) || !s.quelle.abgerufen) m.push(wer + ': quelle.url (https) und quelle.abgerufen gehören dazu');
      if (!STATUS.includes(s.status)) m.push(wer + ': unbekannter status ' + JSON.stringify(s.status));
      if (STATUS_MIT_GRUND.includes(s.status) && !s.grund) m.push(wer + ': status ' + s.status + ' verlangt grund');
      const l = s.lizenz || {};
      if (!LIZENZ.includes(l.status)) m.push(wer + ': lizenz.status muss ' + LIZENZ.join(', ') + ' sein');
      if (l.status === 'rueckfrage-offen' && !(l.rueckfrage && l.rueckfrage.an && l.rueckfrage.datum)) m.push(wer + ': lizenz rueckfrage-offen verlangt rueckfrage.an und rueckfrage.datum');
      if (!l.text) m.push(wer + ': lizenz.text (woher die Angabe stammt) fehlt');
      const richtung = liste(s.richtung);
      if (!richtung.length) m.push(wer + ': richtung fehlt');
      for (const x of richtung) if (!RICHTUNG.includes(x)) m.push(wer + ': unbekannte richtung ' + JSON.stringify(x));
      if (!BEREICH.includes(s.bereich)) m.push(wer + ': bereich muss ' + BEREICH.join(', ') + ' sein');
      // Holder-Regel (Signatur-Familie und Bildung): nie ausstellen.
      if ((r.familie === 'signatur' || s.bereich === 'bildung') && richtung.some((x) => !HOLDER_ERLAUBT.includes(x))) {
        m.push(wer + ': Holder-Regel — Familie signatur und Bereich bildung tragen nur ' + HOLDER_ERLAUBT.join('/') + ', nie ' + richtung.filter((x) => !HOLDER_ERLAUBT.includes(x)).join('/'));
      }
      for (const a of liste(s.artefakte)) if (typeof a !== 'string') m.push(wer + ': artefakte enthält keine Kennung');
      for (const w of liste(s.exportwege)) if (!kontext.exportIds.has(w)) m.push(wer + ': exportweg ' + w + ' gibt es in EXPORT_FORMATE nicht');
      for (const w of liste(s.importwege)) if (!kontext.importIds.has(w)) m.push(wer + ': importweg ' + w + ' gibt es in IMPORT_FORMATE nicht');
      if (s.bezuege !== null && s.bezuege !== undefined) {
        if (!Array.isArray(s.bezuege)) m.push(wer + ': bezuege ist null oder eine Liste von Datensatz-Kennungen');
        else for (const b of s.bezuege) if (!kontext.bezuegeIds.has(b)) m.push(wer + ': bezuege ' + b + ' steht nicht in bereiche/bezuege-quellen.json');
      }
      if (s.status === 'echt') {
        if (r.adapter === null) m.push(wer + ': echt ohne adapter');
        if (l.status !== 'geprueft') m.push(wer + ': echt verlangt lizenz.status geprueft (sonst höchstens teilweise)');
        if (!liste(s.artefakte).length) m.push(wer + ': echt ohne gepinnte artefakte');
        for (const a of liste(s.artefakte)) {
          const e = manifestIds.get(a);
          if (!e) m.push(wer + ': echt, aber Artefakt ' + a + ' fehlt im Manifest');
        }
        const urteilt = kontext.adapterStandards && kontext.adapterStandards.get(r.adapter);
        if (urteilt && !urteilt.includes(s.id)) m.push(wer + ': echt, aber der Adapter ' + r.adapter + ' urteilt über diesen Standard nicht (standards)');
      }
    }
  }
  return m;
}

/* ── Adapter-Signatur ─────────────────────────────────────────────────────── */
const ADAPTER_FELDER = Object.freeze(['id', 'familie', 'autoritaet', 'prueft', 'werkzeugVersion', 'vorhanden', 'urteile', 'artefakte', 'kaputt']);
function pruefeAdapter(a, wo) {
  const m = [];
  for (const f of ADAPTER_FELDER) if (!a || !a[f]) m.push(wo + ': ' + f + ' fehlt');
  if (a && a.familie && !FAMILIEN.includes(a.familie)) m.push(wo + ': unbekannte familie ' + a.familie);
  for (const f of ['vorhanden', 'urteile', 'artefakte', 'kaputt']) if (a && a[f] && typeof a[f] !== 'function') m.push(wo + ': ' + f + ' ist keine Funktion');
  if (a && a.standards !== undefined && (!Array.isArray(a.standards) || !a.standards.length)) m.push(wo + ': standards ist eine nicht leere Liste von Register-Kennungen');
  return m;
}
/** kaputt() liefert ein Objekt (Altform) oder eine Liste; der Lauf nimmt beides. */
function kaputtListe(x) { return Array.isArray(x) ? x : (x ? [x] : []); }

/* ── Das Repo lesen ───────────────────────────────────────────────────────── */
function registerLesen(dir = REGISTER_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((d) => d.endsWith('.json')).sort()
    .map((d) => ({ datei: 'tools/standards-register/' + d, inhalt: JSON.parse(fs.readFileSync(path.join(dir, d), 'utf8')) }));
}
function manifestLesen(pfad = MANIFEST) { return fs.existsSync(pfad) ? JSON.parse(fs.readFileSync(pfad, 'utf8')) : []; }
/** Die Adapter-Kennungen: je Datei (ohne _-Präfix) ihre `id: '…'`, dazu die inline-Einträge von VALIDATOREN. Aus dem Text gelesen. */
function adapterIdsLesen() {
  const ids = new Set();
  const idAus = (text) => (text.match(/^\s*id:\s*'([^']+)'/m) || [])[1];
  if (fs.existsSync(ADAPTER_DIR)) {
    for (const d of fs.readdirSync(ADAPTER_DIR).filter((x) => x.endsWith('.mjs') && !x.startsWith('_'))) {
      const id = idAus(fs.readFileSync(path.join(ADAPTER_DIR, d), 'utf8'));
      if (id) ids.add(id);
    }
  }
  const inline = fs.existsSync(INLINE_VALIDATOREN) ? fs.readFileSync(INLINE_VALIDATOREN, 'utf8') : '';
  const block = inline.slice(inline.indexOf('export const VALIDATOREN'));
  for (const x of block.matchAll(/^\s{4}id:\s*'([^']+)'/gm)) ids.add(x[1]);
  return ids;
}
/** Die Kennungen der Export- und Importformate des Kerns, aus dem Text der beiden Registries. */
function formatIdsLesen(kernText) {
  const block = (name) => {
    const i = kernText.indexOf('const ' + name + ' = Object.freeze([');
    if (i < 0) return new Set();
    const ende = kernText.indexOf('\n]);', i);
    return new Set([...kernText.slice(i, ende).matchAll(/\{ id: '([^']+)'/g)].map((x) => x[1]));
  };
  return { exportIds: block('EXPORT_FORMATE'), importIds: block('IMPORT_FORMATE') };
}
function bezuegeIdsLesen() {
  try { return new Set(liste(JSON.parse(fs.readFileSync(path.join(REPO, 'bereiche', 'bezuege-quellen.json'), 'utf8')).quellen).map((q) => q.datensatz)); } catch (_) { return new Set(); }
}
function kontextLesen() {
  const { exportIds, importIds } = formatIdsLesen(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
  return { manifest: manifestLesen(), adapterIds: adapterIdsLesen(), exportIds, importIds, bezuegeIds: bezuegeIdsLesen() };
}

function main() {
  const kontext = kontextLesen();
  const maengel = [...pruefeManifest(kontext.manifest), ...pruefeRegister(registerLesen(), kontext)];
  if (!maengel.length) { console.log('[standards-register] Register und Manifest stimmig.'); return 0; }
  for (const x of maengel) console.error('[standards-register] ' + x);
  return 1;
}

if (require.main === module) process.exitCode = main();
module.exports = {
  FAMILIEN, STATUS, LIZENZ, RICHTUNG, BEREICH, HOLDER_ERLAUBT, ADAPTER_FELDER,
  pruefeManifest, pruefeRegister, pruefeAdapter, kaputtListe,
  registerLesen, manifestLesen, adapterIdsLesen, formatIdsLesen, bezuegeIdsLesen, kontextLesen,
};
