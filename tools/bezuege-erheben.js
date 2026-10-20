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

   QUELLFORMATE: FHIR (StructureDefinition-JSON, snapshot.element; Ziel `<name>#<element-id>`), openEHR (Web-Template-JSON;
   Ziel `<templateId>#<pfad der ids>`) und FIM-Baukasten (XDatenfelder-3-XML je Datenfeld bzw. Datenfeldgruppe; Ziel ist die
   Kennung, z. B. `F60000227`, U2-ADR-456). Aus einer XDF-Datei liest das Werkzeug NUR Kennung, Fassung und Art — keine Namen,
   Beschreibungen oder Wertelisten (bis zur Zustimmung der FITKO steht davon nichts im Repo). Dazu RDF/Turtle (17.10.2026, SEMIC Core
   Vocabularies): Ziel ist die volle IRI; gelesen werden NUR die IRIs, die eine Datei nennt (Vokabular-TTL und SHACL-Formen — erst die
   SHACL-Formen nennen die wiederverwendeten Terme wie foaf:givenName), keine Labels oder Definitionen (CC-BY 4.0). Die Lock-Datei
   trägt je Datei `vokabular` und `fassung`; eine Zeile mit `vokabular` muss ihr Ziel in genau diesem Vokabular dieser Fassung finden.
   FIM-ZEILEN tragen zusätzlich `fassung` und `status`: die Fassung muss der gepinnten Datei entsprechen, der Status dem Freigabe-
   status, den die Lock-Datei je Datei festhält (der Portal-Stand beim Abruf — die XDF-Dateien tragen ihn nicht einheitlich). Eine
   Fassung, die nicht fest ist („in Bearbeitung"), darf höchstens `naeherung` sein und steht sichtbar als nicht fest da.

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
/* XDatenfelder 3: das ERSTE Datenfeld bzw. die erste Datenfeldgruppe nach dem Kopf ist der Baustein der Datei; alles darunter
   (enthaltene Felder einer Gruppe, Codelisten-Verweise) wird bewusst nicht gelesen. Präfix-unabhängig (ns0:, xdf3:, …). */
const XDF_BAUSTEIN = /<(?:[\w-]+:)?(datenfeld|datenfeldgruppe)>\s*<(?:[\w-]+:)?identifikation>\s*<(?:[\w-]+:)?id>([^<]+)<\/(?:[\w-]+:)?id>\s*<(?:[\w-]+:)?version>([^<]+)</;
function xdfElemente(xml) {
  const m = XDF_BAUSTEIN.exec(xml);
  if (!m) throw new Error('kein XDatenfelder-Baustein erkannt');
  return { fassung: m[3].trim(), elemente: { [m[2].trim()]: { kurz: '', definition: '', min: undefined, max: undefined, typ: m[1], fassung: m[3].trim() } } };
}
/* Die IRIs einer Turtle-Datei: volle IRIs in <…> und Präfix-Namen mit einem erklärten @prefix bzw. PREFIX. Nur Namen, keine
   Literale; ein Name ohne erklärtes Präfix zählt nicht. */
function turtleIris(text) {
  const pre = {};
  for (const m of text.matchAll(/@prefix\s+([A-Za-z0-9_-]*):\s*<([^>]+)>/g)) pre[m[1]] = m[2];
  for (const m of text.matchAll(/PREFIX\s+([A-Za-z0-9_-]*):\s*<([^>]+)>/gi)) pre[m[1]] = m[2];
  const ohneLiterale = text.replace(/"""[\s\S]*?"""|"(?:[^"\\\n]|\\.)*"/g, '""');
  const s = new Set();
  for (const m of ohneLiterale.matchAll(/<(https?:[^>\s]+)>/g)) s.add(m[1]);
  for (const m of ohneLiterale.matchAll(/(?<![\w"<#\/])([A-Za-z][A-Za-z0-9_-]*):([A-Za-z_](?:[A-Za-z0-9_.-]*[A-Za-z0-9_])?)/g)) {
    if (pre[m[1]] !== undefined) s.add(pre[m[1]] + m[2]);
  }
  return s;
}

function quelleLesen(datei) {
  if (/\.ttl$/i.test(datei)) {
    const elemente = {};
    for (const iri of turtleIris(fs.readFileSync(datei, 'utf8'))) elemente[iri] = {};
    return { format: 'turtle', fassung: undefined, elemente };
  }
  if (/\.xml$/i.test(datei)) {
    const x = xdfElemente(fs.readFileSync(datei, 'utf8'));
    return { format: 'xdf', fassung: x.fassung, elemente: x.elemente };
  }
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
    const gelesen = quelleLesen(voll).elemente;
    // Freigabestatus je Datei aus der Lock-Datei (FIM): an das Element gehängt, damit die Zeilenprüfung ihn sieht.
    if (d.freigabestatus !== undefined) for (const e of Object.values(gelesen)) e.freigabestatus = d.freigabestatus;
    // Vokabular und Fassung je Datei (Turtle): ein Term kann in mehreren Vokabularen stehen, darum gesammelt statt überschrieben.
    if (d.vokabular !== undefined) {
      for (const [iri, e] of Object.entries(gelesen)) {
        const alt = elemente[iri];
        e.vokabulare = [...new Set([...((alt && alt.vokabulare) || []), d.vokabular + ' ' + d.fassung])].sort();
      }
    }
    Object.assign(elemente, gelesen);
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
    const el = ds.elemente[z.ziel];
    if (z.vokabular !== undefined && !(el.vokabulare || []).includes(z.vokabular + ' ' + z.fassung)) {
      befunde.push({ art: 'vokabular-weicht-ab', text: ort + ' steht nicht in ' + z.vokabular + ' ' + z.fassung + ' (gepinnt: ' + ((el.vokabulare || []).join(', ') || 'keines') + ')' }); continue;
    }
    if (z.fassung !== undefined && el.fassung !== undefined && String(z.fassung) !== String(el.fassung)) {
      befunde.push({ art: 'fassung-weicht-ab', text: ort + ' Fassung ' + z.fassung + ', gepinnt ' + el.fassung }); continue;
    }
    if (z.status !== undefined && String(z.status) !== String(el.freigabestatus)) {
      befunde.push({ art: 'status-weicht-ab', text: ort + ' Status „' + z.status + '", gepinnt „' + el.freigabestatus + '"' }); continue;
    }
    if (z.status !== undefined && freigabestatusCode(z.status) === null) {
      befunde.push({ art: 'status-ohne-code', text: ort + ' Status „' + z.status + '" steht nicht in der FIM-Codeliste' }); continue;
    }
    if (nichtFest(z.status !== undefined ? z.status : el.freigabestatus) && z.grad === 'exakt') {
      befunde.push({ art: 'nicht-fest-exakt', text: ort + ' ist nicht fest und darf höchstens naeherung sein' }); continue;
    }
    if (z.name !== undefined && z.name !== null && z.name !== '' && !(tabelle.fimNamenFreigabe && tabelle.fimNamenFreigabe.beleg)) {
      befunde.push({ art: 'name-ohne-freigabe', text: ort + ' trägt einen Namen, fimNamenFreigabe ist nicht belegt' }); continue;
    }
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

// „nicht fest": der Portal-Status sagt es wörtlich (in Bearbeitung, Entwurf) — jede andere Angabe gilt als fest.
function nichtFest(status) { return /in Bearbeitung|nicht fest|Entwurf/i.test(String(status || '')); }
/* Der Portal-Status als Code der amtlichen FIM-Codeliste urn:xoev-de:fim:codeliste:xdatenfelder.freigabestatus (so tragen ihn
   die XDatenfelder-3-Dateien selbst, z. B. 5). Kern und Export führen den CODE, nicht den Text: der Kern trägt keine Sätze.
   Ein Status, der hier nicht steht, hat keinen Code und ist ein Befund. */
const FREIGABESTATUS_LISTE = 'urn:xoev-de:fim:codeliste:xdatenfelder.freigabestatus';
const FREIGABESTATUS_CODE = Object.freeze([
  [/^in Planung/i, '1'], [/^in Bearbeitung/i, '2'], [/^Entwurf/i, '3'], [/^methodisch freigegeben/i, '4'],
  [/^fachlich freigegeben \(silber\)/i, '5'], [/^fachlich freigegeben \(gold\)/i, '6'], [/^inaktiv/i, '7'],
]);
function freigabestatusCode(status) {
  const t = FREIGABESTATUS_CODE.find(([m]) => m.test(String(status || '').trim()));
  return t ? t[1] : null;
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

module.exports = { GRADE, SKOS, turtleIris, fhirElemente, openehrElemente, xdfElemente, nichtFest, freigabestatusCode, FREIGABESTATUS_LISTE, quelleLesen, datensatzLesen, erheben, fassungenVergleichen, vorschlaege, eingaben, sha256, FIXTURE };

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
