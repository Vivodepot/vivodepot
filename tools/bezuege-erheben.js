#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   bezuege-erheben.js — die Feldkennungen gegen internationale Datensätze (Harmonisierung, 27.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   AUFTRAG. Die Inhaberin, 26.09.2026: die Felder mit internationalen Datensätzen harmonisieren — HL7 FHIR IPS, eu-eps (EHDS),
   openEHR; ePA/MIO nur zusätzlich — „international und mit automatischen Updates, wenn sich was ändert — also Wächter".
   Leitplanke U2-ADR-409: ABBILDEN, NICHT UMBENENNEN. Keine Kennung ändert sich; eine Abbildung steht in einer eigenen Tabelle.

   WAS DIESES WERKZEUG KANN — und was nicht:
     · es ZÄHLT je Datensatz × Bereich: ja (exakt) · teilweise (näherungsweise, enger, weiter) · nein (keine Zeile)
     · es PRÜFT jede Zeile: Kennung im Register? Grad bekannt? Datensatz gepinnt? ZIEL IN DER GEPINNTEN FASSUNG VORHANDEN?
       Quelle unverändert (SHA-256 gegen die Lock-Datei)?
     · es VERGLEICHT zwei Fassungen einer Quelle für die ABGEBILDETEN Ziele (`fassungenVergleichen`): eine geänderte Definition,
       Kardinalität, ein geänderter Datentyp ist eine BEDEUTUNGSÄNDERUNG (Ratschen-Zeile), ein geänderter Kurztext mechanisch;
       das trägt den Wächter auf neue Fassungen.
     · es SCHLÄGT VOR (`--vorschlaege`): Kandidaten aus einem Namensvergleich — nur Vorschläge. Die Zuordnung selbst ist ein
       Urteil mit Gegenlesung und steht danach in der Tabelle; das Werkzeug trägt nichts selbst ein.

   GRADE (SKOS): exakt = exactMatch · naeherung = closeMatch · eng = narrowMatch · weit = broadMatch. Keine Zeile heißt „nein".

   QUELLFORMATE: FHIR (StructureDefinition-JSON, snapshot.element; Ziel `<name>#<element-id>`) und openEHR (Web-Template-JSON;
   Ziel `<templateId>#<pfad der ids>`).

   Aufruf:
     node tools/bezuege-erheben.js                    gegen die Fixtures in tests/fixtures/bezuege/ (erfundene Auszüge)
     node tools/bezuege-erheben.js --quelle <ordner>  echtes Register, bereiche/bezuege.json und bereiche/bezuege-quellen.json;
                                                      die Quellpakete liegen unter <ordner>/<pfad aus der Lock-Datei>
     [--ausgabe <datei>]  Ergebnis als JSON    [--vorschlaege]  Kandidaten aus dem Namensvergleich mit ausgeben
   Exit 0 ohne Befund, 1 bei Befund (unbekannte Kennung, unbekannter Grad, totes Ziel, ungepinnter Datensatz, veränderte Quelle).
   Probe: tests/bezuege-erheben.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'bezuege');
const GRADE = Object.freeze({ exakt: 'ja', naeherung: 'teilweise', eng: 'teilweise', weit: 'teilweise' });
const SKOS = Object.freeze({ exakt: 'skos:exactMatch', naeherung: 'skos:closeMatch', eng: 'skos:narrowMatch', weit: 'skos:broadMatch' });

const lesenJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

/* ── Quellformate → Elemente { ziel → { kurz, definition, min, max, typ } } ── */
function fhirElemente(sd) {
  const raus = {};
  for (const e of ((sd.snapshot && sd.snapshot.element) || [])) {
    raus[sd.name + '#' + (e.id || e.path)] = {
      kurz: e.short || '', definition: e.definition || '', min: e.min, max: e.max,
      typ: (e.type || []).map((t) => t.code).join('|'),
    };
  }
  return raus;
}
function openehrElemente(wt) {
  const raus = {};
  const gehen = (knoten, pfad) => {
    const p = pfad ? pfad + '/' + knoten.id : knoten.id;
    raus[wt.templateId + '#' + p] = { kurz: knoten.name || '', definition: knoten.description || '', min: knoten.min, max: knoten.max, typ: knoten.rmType || '' };
    for (const k of (knoten.children || [])) gehen(k, p);
  };
  if (wt.tree) gehen(wt.tree, '');
  return raus;
}
function quelleLesen(datei) {
  const o = lesenJson(datei);
  if (o.resourceType === 'StructureDefinition') return { format: 'fhir', fassung: o.version, elemente: fhirElemente(o) };
  if (o.templateId && o.tree) return { format: 'openehr', fassung: o.version, elemente: openehrElemente(o) };
  throw new Error('unbekanntes Quellformat: ' + datei);
}
/* Eine Quelle der Lock-Datei: `pfade` sind Dateien relativ zum Quellordner; alle zusammen ergeben die Elemente des Datensatzes. */
function datensatzLesen(eintrag, quellOrdner) {
  const elemente = {};
  const abweichend = [];
  for (const d of eintrag.dateien) {
    const voll = path.join(quellOrdner, d.pfad);
    if (!fs.existsSync(voll)) { abweichend.push(d.pfad + ': fehlt'); continue; }
    if (d.sha256 && sha256(voll) !== d.sha256) abweichend.push(d.pfad + ': SHA-256 weicht von der Lock-Datei ab');
    Object.assign(elemente, quelleLesen(voll).elemente);
  }
  return { elemente, abweichend };
}

/* ── Die Erhebung ── */
function erheben({ register, tabelle, lock, quellOrdner }) {
  const kennungen = new Map(register.felder.map((f) => [f.kennung, f.bereich]));
  const datensaetze = {};
  const befunde = [];
  for (const q of (lock.quellen || [])) {
    const { elemente, abweichend } = datensatzLesen(q, quellOrdner);
    datensaetze[q.datensatz] = { elemente, fassung: q.fassung };
    for (const a of abweichend) befunde.push({ art: 'quelle-veraendert', datensatz: q.datensatz, text: a });
  }
  const abgebildet = {};   // datensatz → kennung → bester Grad
  for (const z of (tabelle.zeilen || [])) {
    const ort = z.kennung + ' → ' + z.datensatz + ' ' + z.ziel;
    if (!kennungen.has(z.kennung)) { befunde.push({ art: 'unbekannte-kennung', text: ort }); continue; }
    if (!Object.prototype.hasOwnProperty.call(GRADE, z.grad)) { befunde.push({ art: 'unbekannter-grad', text: ort + ' (' + z.grad + ')' }); continue; }
    const ds = datensaetze[z.datensatz];
    if (!ds) { befunde.push({ art: 'datensatz-nicht-gepinnt', text: ort }); continue; }
    if (!Object.prototype.hasOwnProperty.call(ds.elemente, z.ziel)) { befunde.push({ art: 'totes-ziel', text: ort + ' fehlt in Fassung ' + ds.fassung }); continue; }
    const m = (abgebildet[z.datensatz] = abgebildet[z.datensatz] || {});
    if (m[z.kennung] !== 'ja') m[z.kennung] = GRADE[z.grad];
  }
  // Zählung je Datensatz × Bereich; „nein" ist jede Kennung ohne Zeile — auch die, für die ein Datensatz gar nicht gedacht ist.
  const abdeckung = {};
  for (const ds of Object.keys(datensaetze).sort()) {
    const je = {};
    for (const [kennung, bereich] of kennungen) {
      const b = (je[bereich] = je[bereich] || { ja: 0, teilweise: 0, nein: 0 });
      b[(abgebildet[ds] && abgebildet[ds][kennung]) || 'nein']++;
    }
    const summe = { ja: 0, teilweise: 0, nein: 0 };
    for (const b of Object.values(je)) for (const k of Object.keys(summe)) summe[k] += b[k];
    abdeckung[ds] = { fassung: datensaetze[ds].fassung, summe, bereiche: je };
  }
  return { anzahlKennungen: kennungen.size, abdeckung, befunde, datensaetze };
}

/* ── Der Wächter: zwei Fassungen, nur die abgebildeten Ziele ── */
const BEDEUTUNG = ['definition', 'min', 'max', 'typ'];
function fassungenVergleichen(alt, neu, ziele) {
  const bedeutung = [], mechanisch = [], weg = [];
  for (const z of ziele) {
    const a = alt[z], n = neu[z];
    if (!a) continue;
    if (!n) { weg.push(z); continue; }
    const geaendert = BEDEUTUNG.filter((k) => String(a[k]) !== String(n[k]));
    if (geaendert.length) bedeutung.push({ ziel: z, felder: geaendert });
    else if (a.kurz !== n.kurz) mechanisch.push({ ziel: z, felder: ['kurz'] });
  }
  return { bedeutung, mechanisch, weg };
}

/* ── Vorschläge aus dem Namensvergleich (nur Kandidaten, nie eine Zuordnung) ── */
const woerter = (s) => String(s).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9äöüß]+/).filter((w) => w.length > 2);
function vorschlaege(register, datensaetze, { max = 3 } = {}) {
  const raus = [];
  for (const f of register.felder) {
    const eigen = new Set([...woerter(f.kennung.split('.').pop()), ...woerter(f.label || '')]);
    const kand = [];
    for (const [ds, { elemente }] of Object.entries(datensaetze)) {
      for (const [ziel, e] of Object.entries(elemente)) {
        const fremd = new Set([...woerter(ziel.split('#').pop()), ...woerter(e.kurz)]);
        const treffer = [...eigen].filter((w) => fremd.has(w)).length;
        if (treffer) kand.push({ datensatz: ds, ziel, treffer });
      }
    }
    kand.sort((a, b) => b.treffer - a.treffer || a.ziel.localeCompare(b.ziel));
    if (kand.length) raus.push({ kennung: f.kennung, kandidaten: kand.slice(0, max) });
  }
  return raus;
}

function eingaben(argv) {
  const i = argv.indexOf('--quelle');
  if (i >= 0) {
    if (!argv[i + 1]) throw new Error('--quelle braucht einen Ordner');
    return { register: lesenJson(path.join(REPO, 'bereiche', 'feldkatalog.json')), tabelle: lesenJson(path.join(REPO, 'bereiche', 'bezuege.json')),
      lock: lesenJson(path.join(REPO, 'bereiche', 'bezuege-quellen.json')), quellOrdner: path.resolve(argv[i + 1]) };
  }
  return { register: lesenJson(path.join(FIXTURE, 'feldkatalog.json')), tabelle: lesenJson(path.join(FIXTURE, 'bezuege.json')),
    lock: lesenJson(path.join(FIXTURE, 'bezuege-quellen.json')), quellOrdner: path.join(FIXTURE, 'quellen') };
}

module.exports = { GRADE, SKOS, fhirElemente, openehrElemente, quelleLesen, datensatzLesen, erheben, fassungenVergleichen, vorschlaege, eingaben, sha256, FIXTURE };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const ein = eingaben(argv);
  const r = erheben(ein);
  const ausgabe = { anzahlKennungen: r.anzahlKennungen, abdeckung: r.abdeckung, befunde: r.befunde };
  if (argv.includes('--vorschlaege')) ausgabe.vorschlaege = vorschlaege(ein.register, r.datensaetze);
  const j = argv.indexOf('--ausgabe');
  if (j >= 0 && argv[j + 1]) fs.writeFileSync(argv[j + 1], JSON.stringify(ausgabe, null, 2) + '\n');
  for (const [ds, a] of Object.entries(r.abdeckung)) {
    console.log(ds + ' (Fassung ' + a.fassung + '): ja ' + a.summe.ja + ' · teilweise ' + a.summe.teilweise + ' · nein ' + a.summe.nein + ' von ' + r.anzahlKennungen);
  }
  for (const b of r.befunde) console.log('BEFUND ' + b.art + ': ' + (b.datensatz ? b.datensatz + ' ' : '') + b.text);
  process.exitCode = r.befunde.length ? 1 : 0;
}
