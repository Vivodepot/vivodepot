'use strict';
/* ════════════════════════════════════════════════════════════════════════
   feldregister-sssom.js — die Zuordnungen des Feldregisters als SSSOM-Tabelle, als PDF und als QR (22.11.2026)
   ────────────────────────────────────────────────────────────────────────
   STANDARD: SSSOM 1.0.0, https://github.com/mapping-commons/sssom/releases/tag/v1.0.0 (2024-08-09), Format SSSOM/TSV:
   YAML-Kopf in #-Zeilen, dann eine Tabelle mit Tabulatoren, UTF-8 ohne BOM. Quelle der Zeilen ist bereiche/bezuege.json;
   die Tabelle ist eine Ausgabe daraus, keine zweite Wahrheit.

   ABBILDUNG je Zeile (Angabe in bezuege.json → Feld in SSSOM 1.0.0):
     kennung        → subject_id `vdfeld:<kennung>` (vdfeld = die Adressbasis des Registers; Unterfelder tragen ihren Schrägstrich)
     grad           → predicate_id skos:exactMatch · closeMatch · narrowMatch · broadMatch (dieselbe Abbildung wie im JSON-LD)
     ziel           → object_id als CURIE (Präfixe in PRAEFIXE; ein Ziel ohne bekanntes Präfix bricht den Bau ab)
     stufe          → other `stufe=<wert>` (SSSOM 1.0.0 hat kein Feld für einen Bearbeitungsstand); „abgelehnt" zusätzlich
                      predicate_modifier `Not`
     bestaetigtVon  → reviewer_id (ORCID/ROR) bzw. reviewer_label; gesetzt heißt mapping_justification semapv:MappingReview,
                      sonst semapv:ManualMappingCuration
     bestaetigtAm   → other `bestaetigt_am=<datum>` (review_date gibt es in 1.0.0 nicht)
     vorgeschlagenVon → author_id (ORCID/ROR) bzw. author_label (die Redaktion hat keine Kennung in Adressform)
     datum          → mapping_date · begruendung (sonst kommentar) → comment · fassung → object_source_version
     vokabular      → object_source: das Repository der gepinnten Datei (Adresse aus der Lock-Datei, nicht erfunden)
   In die Tabelle gehen nur Zeilen eines veröffentlichten Datensatzes mit Stufe aufgenommen, strittig, abgelehnt oder
   zu-pruefen; vorgeschlagene und mechanisch geprüfte bleiben im Eingang. Codelisten Dritter: nur die IRI der Gegenseite.

   PDF und QR: beide Bibliotheken liegen schon im Kern (jsPDF, qrcode-generator; tools/lib/fremdbibliotheken.js hält sie
   über ihre Prüfsumme). Dieses Modul lädt sie aus vivodepot.html in einen eigenen vm-Kontext, ohne Netz und ohne neue
   Abhängigkeit. Das PDF trägt kein Datum außer dem Fassungsdatum des Registers und als Datei-Kennung den Anfang der
   Prüfsumme der Tabelle, damit derselbe Stand dasselbe PDF ergibt. Der QR führt auf die Abholseite der Tabelle, mit der
   Prüfsumme im Fragment; die Adresse steht lesbar daneben.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const adressen = require('./feldregister-adressen.js');

const REPO = path.join(__dirname, '..', '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');

const SSSOM_DATEI = 'feldregister.sssom.tsv';
const SSSOM_PRUEFSUMME = SSSOM_DATEI + '.sha256';
const PDF_DATEI = 'feldregister-zuordnungen.pdf';
const REGISTER_BASIS = 'https://register.vivodepot.de/';
const MAPPING_SET_ID = REGISTER_BASIS + SSSOM_DATEI;
const STANDARD = Object.freeze({ name: 'SSSOM', fassung: '1.0.0', datum: '2024-08-09', quelle: 'https://github.com/mapping-commons/sssom/releases/tag/v1.0.0' });

const AUSGABE_STUFEN = Object.freeze(['aufgenommen', 'strittig', 'abgelehnt', 'zu-pruefen']);
const DATENSATZ_NAMEN = Object.freeze({ 'semic-core-vocabularies': 'SEMIC Core Vocabularies', 'fim-baukasten': 'FIM-Baukasten' });
/* Die SEMIC-Zeilen zielen auf Core Vocabularies und auf das Anwendungsprofil CPSV-AP; beide werden beim Namen genannt, nicht
   unter „Core Vocabularies“ zusammengefasst. Die Namen folgen dem Feld vokabular der ausgegebenen Zeilen. */
const VOKABULAR_NAMEN = Object.freeze({ CPOV: 'Core Public Organisation' });
const ANWENDUNGSPROFILE = Object.freeze(['CPSV-AP']);
const QUELLE_ADRESSE = 'https://github.com/vivodepot/vivodepot/blob/main/bereiche/bezuege.json';

/** Lesbare Namen der Ziele, de oder en: „SEMIC Core Vocabularies (Core Person, …) und zum Anwendungsprofil CPSV-AP“. */
function zielNamen(zeilen, veroeffentlicht, sprache) {
  const en = sprache === 'en';
  const teile = [];
  for (const d of veroeffentlicht) {
    const eigene = zeilen.filter((z) => z.datensatz === d && AUSGABE_STUFEN.includes(z.stufe));
    const vok = [...new Set(eigene.map((z) => z.vokabular).filter(Boolean))].sort();
    const kern = vok.filter((v) => !ANWENDUNGSPROFILE.includes(v)).map((v) => VOKABULAR_NAMEN[v] || v);
    const profile = vok.filter((v) => ANWENDUNGSPROFILE.includes(v));
    let t = (DATENSATZ_NAMEN[d] || d) + (kern.length ? ' (' + kern.join(', ') + ')' : '');
    if (profile.length) t += en ? ' and the ' + profile.join(', ') + ' application profile' + (profile.length > 1 ? 's' : '')
      : ' und zum Anwendungsprofil ' + profile.join(', ');
    teile.push(t);
  }
  return teile.join(', ');
}

/* Präfixe der CURIEs. skos und semapv sind in SSSOM eingebaut und stehen trotzdem im Kopf, mit derselben Adresse. Die Namen der
   fremden Präfixe folgen den gepinnten Turtle-Dateien (cv für data.europa.eu/m8g) oder der üblichen Schreibweise. */
const PRAEFIXE = Object.freeze({
  vdfeld: adressen.ADRESS_BASIS,
  vdregister: REGISTER_BASIS,
  skos: 'http://www.w3.org/2004/02/skos/core#',
  semapv: 'https://w3id.org/semapv/vocab/',
  cv: 'http://data.europa.eu/m8g/',
  dct: 'http://purl.org/dc/terms/',
  locn: 'http://www.w3.org/ns/locn#',
  adms: 'http://www.w3.org/ns/adms#',
  person: 'http://www.w3.org/ns/person#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  epo: 'http://data.europa.eu/a4g/ontology#',
  legal: 'http://www.w3.org/ns/legal#',
  semicrepo: 'https://github.com/SEMICeu/',
  orcid: 'https://orcid.org/',
  ror: 'https://ror.org/',
});
const SPALTEN = Object.freeze(['subject_id', 'predicate_id', 'predicate_modifier', 'object_id', 'mapping_justification',
  'author_id', 'author_label', 'reviewer_id', 'reviewer_label', 'mapping_date', 'subject_source', 'subject_source_version',
  'object_source', 'object_source_version', 'comment', 'other']);
/* Spalten vom Typ EntityReference: ihre Werte sind CURIEs, ihre Präfixe stehen in curie_map. */
const CURIE_SPALTEN = Object.freeze(['subject_id', 'predicate_id', 'object_id', 'mapping_justification', 'author_id', 'reviewer_id', 'subject_source', 'object_source']);

/** IRI → CURIE über den längsten passenden Präfix mit nicht leerem lokalem Teil. Wirft ohne passenden Präfix. */
function curie(iri, praefixe = PRAEFIXE) {
  let best = null;
  for (const [p, basis] of Object.entries(praefixe)) {
    if (!iri.startsWith(basis) || iri.length === basis.length) continue;
    if (!best || basis.length > praefixe[best].length) best = p;
  }
  const lokal = best ? iri.slice(praefixe[best].length) : '';
  if (!best || !/^[A-Za-z0-9_.\-/]+$/.test(lokal)) throw new Error('feldregister-sssom: kein Präfix für ' + iri + ' — in PRAEFIXE eintragen, nicht raten.');
  return best + ':' + lokal;
}
function ausCurie(c, map) {
  const i = c.indexOf(':');
  const p = c.slice(0, i);
  if (!Object.prototype.hasOwnProperty.call(map, p)) throw new Error('feldregister-sssom: Präfix ' + p + ' nicht in curie_map');
  return map[p] + c.slice(i + 1);
}

/* ORCID, ROR oder die Redaktion → (id, label). Die Formen prüft tools/zuordnungen-pruefen.js. */
function stelle(wert) {
  if (!wert) return { id: '', label: '' };
  const m = /^(?:https:\/\/orcid\.org\/)?(\d{4}-\d{4}-\d{4}-\d{3}[\dX])$/.exec(wert);
  if (m) return { id: 'orcid:' + m[1], label: '' };
  const r = /^https:\/\/ror\.org\/(\w+)$/.exec(wert);
  if (r) return { id: 'ror:' + r[1], label: '' };
  return { id: '', label: wert };
}

/* Das Repository einer gepinnten Datei, aus ihrer Abruf-Adresse in der Lock-Datei (raw.githubusercontent.com/<org>/<repo>/…). */
function objectSource(z, lock) {
  const q = ((lock && lock.quellen) || []).find((x) => x.datensatz === z.datensatz);
  const d = q && (q.dateien || []).find((x) => (z.vokabular !== undefined ? x.vokabular === z.vokabular && String(x.fassung) === String(z.fassung) : x.kennung === z.ziel));
  const m = d && d.url && /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//.exec(d.url);
  if (!m) return '';
  try { return curie('https://github.com/' + m[1] + '/' + m[2]); } catch (_) { return ''; }
}

/** Die Zeilen, die hinausgehen: veröffentlichter Datensatz, Ausgabe-Stufe. */
function ausgabeZeilen(zeilen, veroeffentlicht) {
  return zeilen.filter((z) => veroeffentlicht.includes(z.datensatz) && AUSGABE_STUFEN.includes(z.stufe));
}

function sssomZeile(z, fassung, lock) {
  if (!/^https?:\/\//.test(z.ziel)) throw new Error('feldregister-sssom: Ziel ist keine IRI: ' + z.kennung + ' → ' + z.ziel);
  const autor = stelle(z.vorgeschlagenVon);
  const pruefer = stelle(z.bestaetigtVon);
  /* other ist in SSSOM 1.0.0 durch „|“ getrennt. */
  const other = ['stufe=' + z.stufe].concat(z.bestaetigtAm ? ['bestaetigt_am=' + z.bestaetigtAm] : []).join('|');
  const zeile = {
    subject_id: curie(adressen.adresse(z.kennung)),
    predicate_id: adressen.SKOS_BEZUG[z.grad],
    predicate_modifier: z.stufe === 'abgelehnt' ? 'Not' : '',
    object_id: curie(z.ziel),
    mapping_justification: z.bestaetigtVon ? 'semapv:MappingReview' : 'semapv:ManualMappingCuration',
    author_id: autor.id, author_label: autor.label,
    reviewer_id: pruefer.id, reviewer_label: pruefer.label,
    mapping_date: z.datum || '',
    subject_source: 'vdregister:' + adressen.ORDNER + '/',
    subject_source_version: fassung.kern,
    object_source: objectSource(z, lock),
    object_source_version: String(z.fassung),
    comment: z.begruendung || z.kommentar || '',   // kommentar: Sachsatz, worin Definition und Grad auseinandergehen (Stufe zu-pruefen)
    other,
  };
  if (!zeile.predicate_id) throw new Error('feldregister-sssom: unbekannter Grad ' + z.grad + ' bei ' + z.kennung);
  for (const [k, v] of Object.entries(zeile)) if (/[\t\r\n]/.test(v)) throw new Error('feldregister-sssom: ' + k + ' von ' + z.kennung + ' enthält Tabulator oder Zeilenumbruch');
  return zeile;
}

const yamlWert = (s) => (/^[A-Za-z0-9_.:/#-]+$/.test(s) && !/^[-:#]/.test(s) ? s : JSON.stringify(s));

function beschreibung(veroeffentlicht, zeilen) {
  const namen = zielNamen(zeilen || [], veroeffentlicht, 'de');
  return 'Zuordnungen der Feldkennungen des Vivodepot-Feldregisters zu den ' + namen + ', erzeugt aus ' + QUELLE_ADRESSE + '. Format ' + STANDARD.name + ' ' + STANDARD.fassung + ', ' + STANDARD.quelle + ' (' + STANDARD.datum + '). '
    + 'Die Stufe jeder Zuordnung steht in other als stufe=<wert>, ein Bestätigungsdatum als bestaetigt_am=<datum>. '
    + 'Die Zuordnungen zum FIM-Baukasten stehen nicht in dieser Datei, weil ihr Ziel keine IRI ist; nachzusehen in '
    + QUELLE_ADRESSE + ', datensatz fim-baukasten.';
}

/** Die SSSOM/TSV-Datei. Ergebnis: { text, zeilen } (zeilen = die Tabellenzeilen als Objekte, sortiert). */
function sssomTsv(alleZeilen, { fassung, lock, veroeffentlicht }) {
  const zeilen = ausgabeZeilen(alleZeilen, veroeffentlicht).map((z) => sssomZeile(z, fassung, lock));
  zeilen.sort((a, b) => (a.subject_id + '\t' + a.object_id + '\t' + a.predicate_id + '\t' + a.predicate_modifier < b.subject_id + '\t' + b.object_id + '\t' + b.predicate_id + '\t' + b.predicate_modifier ? -1 : 1));
  const benutzt = new Set();
  for (const z of zeilen) for (const s of CURIE_SPALTEN) if (z[s]) benutzt.add(z[s].slice(0, z[s].indexOf(':')));
  const kopf = ['curie_map:'];
  for (const p of [...benutzt].sort()) {
    if (!PRAEFIXE[p]) throw new Error('feldregister-sssom: Präfix ' + p + ' ohne Adresse');
    kopf.push('  ' + p + ': ' + yamlWert(PRAEFIXE[p]));
  }
  kopf.push('mapping_set_id: ' + yamlWert(MAPPING_SET_ID));
  kopf.push('mapping_set_version: ' + yamlWert(fassung.kern));
  kopf.push('mapping_set_description: ' + JSON.stringify(beschreibung(veroeffentlicht, alleZeilen)));
  kopf.push('license: ' + yamlWert(adressen.LIZENZ.url));
  kopf.push('creator_label:');
  kopf.push('  - ' + yamlWert(adressen.HERAUSGEBER));
  const text = kopf.map((l) => '#' + l).join('\n') + '\n'
    + SPALTEN.join('\t') + '\n'
    + zeilen.map((z) => SPALTEN.map((s) => z[s]).join('\t')).join('\n') + (zeilen.length ? '\n' : '');
  return { text, zeilen };
}

/** Liest eine SSSOM/TSV-Datei, wie sie hier entsteht (Kopf: einfache YAML-Zuordnung mit einer Ebene Verschachtelung). */
function sssomLesen(text) {
  const zeilen = text.split('\n');
  const kopf = {};
  let i = 0;
  let offen = null;
  for (; i < zeilen.length && zeilen[i].startsWith('#'); i++) {
    const l = zeilen[i].slice(1);
    let m;
    if ((m = /^ {2}- (.*)$/.exec(l)) && offen) { if (!Array.isArray(kopf[offen])) kopf[offen] = []; kopf[offen].push(entYaml(m[1])); }
    else if ((m = /^ {2}([A-Za-z0-9_]+): (.*)$/.exec(l)) && offen) { if (!kopf[offen] || Array.isArray(kopf[offen])) kopf[offen] = {}; kopf[offen][m[1]] = entYaml(m[2]); }
    else if ((m = /^([a-z_]+):$/.exec(l))) { offen = m[1]; kopf[offen] = null; }
    else if ((m = /^([a-z_]+): (.*)$/.exec(l))) { offen = null; kopf[m[1]] = entYaml(m[2]); }
    else throw new Error('feldregister-sssom: Kopfzeile nicht lesbar: ' + l);
  }
  const spalten = zeilen[i].split('\t');
  const daten = zeilen.slice(i + 1).filter((l) => l !== '').map((l) => {
    const w = l.split('\t');
    if (w.length !== spalten.length) throw new Error('feldregister-sssom: Zeile mit ' + w.length + ' statt ' + spalten.length + ' Spalten');
    return Object.fromEntries(spalten.map((s, k) => [s, w[k]]));
  });
  return { kopf, spalten, zeilen: daten };
}
function entYaml(s) { return s.startsWith('"') ? JSON.parse(s) : s; }

/* ── Bibliotheken aus dem Kern ─────────────────────────────────────────── */
let bibliothekenCache = null;
function kernBibliotheken(kernPfad = KERN_PFAD) {
  if (bibliothekenCache && bibliothekenCache.pfad === kernPfad) return bibliothekenCache;
  const { fremdbibliothek } = require('./fremdbibliotheken.js');
  const html = fs.readFileSync(kernPfad, 'utf8');
  const bloecke = {};
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const f = fremdbibliothek(m[1], m[2]);
    if (f && (f.name === 'jsPDF' || f.name === 'qrcode')) bloecke[f.name] = m[2];
  }
  for (const n of ['jsPDF', 'qrcode']) {
    if (!bloecke[n]) throw new Error('feldregister-sssom: ' + n + ' nicht im Kern gefunden (oder Prüfsumme weicht von tools/lib/fremdbibliotheken.js ab) — keine andere Quelle.');
  }
  const qrFenster = {}; qrFenster.window = qrFenster; qrFenster.self = qrFenster;
  vm.runInNewContext(bloecke.qrcode, qrFenster, { filename: 'qrcode(aus dem Kern)' });
  const pdfFenster = { console: { log() {}, warn() {}, error() {} }, navigator: { userAgent: '' }, atob, btoa, TextEncoder, TextDecoder };
  pdfFenster.window = pdfFenster; pdfFenster.self = pdfFenster;
  vm.createContext(pdfFenster);
  vm.runInContext(bloecke.jsPDF, pdfFenster, { filename: 'jsPDF(aus dem Kern)' });
  if (typeof qrFenster.qrcode !== 'function' || !pdfFenster.jspdf || !pdfFenster.jspdf.jsPDF) throw new Error('feldregister-sssom: Bibliotheken aus dem Kern haben sich nicht angemeldet.');
  bibliothekenCache = { pfad: kernPfad, qrcode: qrFenster.qrcode, jsPDF: pdfFenster.jspdf.jsPDF };
  return bibliothekenCache;
}

/* ── QR ─────────────────────────────────────────────────────────────────── */
function qrAdresse(hash) { return MAPPING_SET_ID + '#sha256=' + hash; }

/** Die Module des QR-Codes (Fehlerkorrektur M, Byte-Modus) als Matrix aus booleschen Werten. */
function qrMatrix(text, bib = kernBibliotheken()) {
  const q = bib.qrcode(0, 'M');
  q.addData(text, 'Byte');
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => q.isDark(r, c)));
}
/* Waagrechte Läufe dunkler Module — ein Rechteck je Lauf statt je Modul. */
function laeufe(matrix) {
  const raus = [];
  matrix.forEach((zeile, r) => {
    for (let c = 0; c < zeile.length; c++) {
      if (!zeile[c]) continue;
      let e = c;
      while (e + 1 < zeile.length && zeile[e + 1]) e++;
      raus.push({ r, c, n: e - c + 1 });
      c = e;
    }
  });
  return raus;
}
function qrSvg(text, { titel }) {
  const m = qrMatrix(text);
  const rand = 4;
  const s = m.length + 2 * rand;
  const d = laeufe(m).map((l) => 'M' + (l.c + rand) + ' ' + (l.r + rand) + 'h' + l.n + 'v1h-' + l.n + 'z').join('');
  return '<svg viewBox="0 0 ' + s + ' ' + s + '" width="160" height="160" role="img" aria-label="' + titel + '" shape-rendering="crispEdges">'
    + '<rect width="' + s + '" height="' + s + '" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>';
}

/* ── PDF ────────────────────────────────────────────────────────────────── */
const WINANSI = /^[\x20-\x7e -ÿ–—‘’‚“”„•…]*$/;
function pdfText(s) {
  const t = String(s);
  if (!WINANSI.test(t)) throw new Error('feldregister-sssom: Zeichen außerhalb von WinAnsi im PDF-Text: ' + t);
  return t;
}
function datumDe(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : (iso ? iso : 'nicht belegt'); }
const GRAD_TEXT = Object.freeze({ 'skos:exactMatch': 'exakt', 'skos:closeMatch': 'Näherung', 'skos:narrowMatch': 'eng', 'skos:broadMatch': 'weit' });

/** Die Präfixe, die in den Spalten Kennung und Ziel des PDFs vorkommen, mit ihrer Adresse (aus curie_map). */
function praefixSchluessel(zeilen) {
  const benutzt = new Set();
  for (const z of zeilen) for (const s of ['subject_id', 'object_id']) if (z[s] && z[s].includes(':')) benutzt.add(z[s].slice(0, z[s].indexOf(':')));
  return [...benutzt].sort().map((p) => p + ': ' + PRAEFIXE[p]).join(' · ');
}

/** Übersicht als PDF: je Vokabular eine Tabelle; auf jeder Seite der QR mit Abholadresse und Prüfsumme der Tabelle. */
function zuordnungenPdf({ zeilen, bezuegeZeilen, fassung, hash, veroeffentlicht }) {
  const { jsPDF } = kernBibliotheken();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setCreationDate('D:' + fassung.datum.replace(/-/g, '') + "000000+00'00'");
  doc.setFileId(hash.slice(0, 32).toUpperCase());
  doc.setProperties({ title: pdfText('Feldregister – Zuordnungen'), subject: pdfText('Zuordnungen der Feldkennungen, ' + STANDARD.name + ' ' + STANDARD.fassung),
    author: adressen.HERAUSGEBER, creator: 'Vivodepot-Feldregister' });
  doc.setLanguage('de-DE');
  const B = 297, H = 210, R = 12, QR_GROESSE = 28, QR_BREITE = 34, OBEN = R + 40;
  const adresse = qrAdresse(hash);
  const matrix = qrMatrix(adresse);
  /* Vokabular je Tabellenzeile: aus der Quellzeile (bezuege.json), über Kennung, Ziel und Fassung. */
  const vok = new Map(bezuegeZeilen.map((z) => [curie(adressen.adresse(z.kennung)) + '\t' + (/^https?:/.test(z.ziel) ? curie(z.ziel) : z.ziel) + '\t' + z.fassung, z.vokabular || DATENSATZ_NAMEN[z.datensatz] || z.datensatz]));
  const gruppen = new Map();
  for (const z of zeilen) {
    const name = (vok.get(z.subject_id + '\t' + z.object_id + '\t' + z.object_source_version) || '') + ' ' + z.object_source_version;
    if (!gruppen.has(name)) gruppen.set(name, []);
    gruppen.get(name).push(z);
  }
  const spalten = [['Kennung', 78], ['Ziel', 58], ['Grad', 38], ['Stufe', 22], ['Fassung', 15], ['Datum', 18], ['vorgeschlagen von', 29], ['bestätigt von', 15]];
  const kopf = (erste) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(pdfText('Feldregister – Zuordnungen'), R, R + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(pdfText('Registerfassung: Kern ' + fassung.kern + ' · Stand ' + datumDe(fassung.datum) + ' · ' + STANDARD.name + ' ' + STANDARD.fassung
      + ' · ' + zeilen.length + ' Zuordnungen · CC0 1.0 · ' + adressen.HERAUSGEBER), R, R + 10);
    doc.text(pdfText('Prüfsumme der Tabelle ' + SSSOM_DATEI + ' (SHA-256): ' + hash), R, R + 14.5);
    if (erste) {
      doc.setFontSize(7.5);
      const text = 'Mapping register of Vivodepot field identifiers. Maschinenlesbar: ' + MAPPING_SET_ID + ' (' + STANDARD.name + ' ' + STANDARD.fassung + ', '
        + STANDARD.quelle + '). Von der Gegenseite steht nur die Adresse da, in Kurzform mit den Präfixen unten; keine Texte Dritter. '
        + 'Die Zuordnungen zum FIM-Baukasten stehen nicht in dieser Übersicht (Ziel ohne Adresse); nachzusehen in ' + QUELLE_ADRESSE + '. '
        + 'Präfixe: ' + praefixSchluessel(zeilen) + '.';
      doc.text(doc.splitTextToSize(pdfText(text), B - 2 * R - QR_BREITE - 8), R, R + 19.5);
    }
  };
  const qrZeichnen = () => {
    const g = QR_GROESSE, x0 = B - R - QR_BREITE, y0 = R - 4;
    const m = g / (matrix.length + 8);
    doc.setFillColor(0, 0, 0);
    for (const l of laeufe(matrix)) doc.rect(x0 + (l.c + 4) * m, y0 + (l.r + 4) * m, l.n * m, m, 'F');
    doc.setFontSize(5.2);
    doc.text(pdfText('Abholseite / download:'), x0, y0 + g + 2);
    doc.text(pdfText(MAPPING_SET_ID), x0, y0 + g + 4.3);
    doc.text(pdfText('#sha256=' + hash.slice(0, 32)), x0, y0 + g + 6.6);
    doc.text(pdfText(hash.slice(32)), x0, y0 + g + 8.9);
  };
  let y;
  const neueSeite = (erste) => { if (!erste) doc.addPage('a4', 'landscape'); kopf(erste); y = OBEN; };
  const tabellenkopf = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    let x = R;
    for (const [t, w] of spalten) { doc.text(pdfText(t), x, y); x += w; }
    doc.setDrawColor(150); doc.line(R, y + 1, B - R, y + 1);
    doc.setFont('helvetica', 'normal');
    y += 4;
  };
  neueSeite(true);
  for (const [name, liste] of gruppen) {
    if (y > H - R - 20) neueSeite(false);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text(pdfText(name.trim()), R, y); y += 5;
    tabellenkopf();
    for (const z of liste) {
      const werte = [z.subject_id.slice('vdfeld:'.length), z.object_id, (GRAD_TEXT[z.predicate_id] || '') + ' (' + z.predicate_id + ')' + (z.predicate_modifier ? ' – verneint' : ''),
        (/stufe=([^;]+)/.exec(z.other) || [])[1] || '', z.object_source_version, datumDe(z.mapping_date),
        z.author_id || z.author_label, z.reviewer_id || z.reviewer_label || '–'];
      doc.setFontSize(7);
      const teile = werte.map((w, k) => doc.splitTextToSize(pdfText(w), spalten[k][1] - 1.5));
      const hoehe = Math.max(...teile.map((t) => t.length)) * 3.1 + 0.6;
      if (y + hoehe > H - R - 6) { neueSeite(false); tabellenkopf(); }
      let x = R;
      teile.forEach((t, k) => { doc.text(t, x, y); x += spalten[k][1]; });
      y += hoehe;
    }
    y += 3;
  }
  const n = doc.getNumberOfPages();
  for (let s = 1; s <= n; s++) {
    doc.setPage(s);
    qrZeichnen();
    doc.setFontSize(6.5);
    doc.text(pdfText('Seite ' + s + ' von ' + n + ' · ' + MAPPING_SET_ID + ' · erzeugt aus ' + QUELLE_ADRESSE), R, H - 6);
  }
  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = {
  SSSOM_DATEI, SSSOM_PRUEFSUMME, PDF_DATEI, MAPPING_SET_ID, STANDARD, AUSGABE_STUFEN, PRAEFIXE, SPALTEN, CURIE_SPALTEN, DATENSATZ_NAMEN, QUELLE_ADRESSE, zielNamen, praefixSchluessel,
  curie, ausCurie, stelle, objectSource, ausgabeZeilen, sssomZeile, sssomTsv, sssomLesen, beschreibung,
  kernBibliotheken, qrAdresse, qrMatrix, qrSvg, zuordnungenPdf,
};
