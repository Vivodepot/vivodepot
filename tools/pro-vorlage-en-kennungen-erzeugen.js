#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pro-vorlage-en-kennungen-erzeugen.js — die eingefrorene Zuordnung der Kennungen
   aus der englischen Pro-Vorlage zu den Kennungen der Pro-Bereiche
   ────────────────────────────────────────────────────────────────────────────
   WOZU. Bis v720 backte Pro eine Vorlage zusätzlich zu seinem Bereichsersatz. Der
   Kern leitet die Kennung eines Vorlagen-Feldes aus seinem Namen ab; die englische
   Vorlage schrieb darum ihre Werte unter englische Kennungen
   (`tpl_shareholder_list` statt `tpl_gesellschafterliste`). Eine solche Datei
   übernimmt beim Öffnen ihre Werte in die Felder des Bereichs.

   WARUM EINE TABELLE UND NICHT DIE POSITION. Eine Paarung über die Position
   vertauscht still zwei gleichartige Felder, sobald sich ihre Reihenfolge ändert
   (Code-Review 17.09.2026: Registernummer und Registergericht). Die Paarung
   geschieht darum EINMAL, hier, an den ausgelieferten Vorlagen selbst — dort
   stammen die deutsche und die englische Fassung aus derselben Liste und stehen
   Feld für Feld in derselben Reihenfolge. Der Kern liest nur noch die Tabelle.
   Eine Kennung, die sie nicht kennt, wird nicht geraten.

   QUELLEN. Jede ausgelieferte Fassung der zwei Vorlagen, gelesen aus git und über
   ihre SHA-256 festgehalten. Stimmt eine Prüfsumme nicht, bricht das Werkzeug ab.
   Die Felder des früheren Bereichs `pro-identitaet` fehlen in der Tabelle: sie
   übernimmt `_proIdentitaetUebernehmen` im Kern.

   AUSGABE. `tools/pro-vorlage-en-kennungen.json`; `vivodepot-bereiche-bekannt-
   erzeugen.js` backt die Zuordnung in jedes Produkt.

   Aufruf:
     node tools/pro-vorlage-en-kennungen-erzeugen.js [--pruefen]
     --pruefen: schreibt nichts, Exit 1 bei Abweichung
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const AUSGABE = path.join(__dirname, 'pro-vorlage-en-kennungen.json');
// Pfade IN DEN EINGEFRORENEN COMMITS unten (`git show <commit>:<pfad>`), nicht im heutigen Baum: die Dateien
// lagen damals unter tests/fixtures/ und liegen heute unter tools/templates/. Ein Pfad im heutigen Baum
// findet sie in den alten Commits nicht (Fund 19.09.2026, B1·Tabelle rot); die Zuordnung hält denselben Pfad fest.
const VORLAGE_DE = 'tests/fixtures/pro-geschaeftsfuehrerin-notfallmappe-vorlage-de.json';
const VORLAGE_EN = 'tests/fixtures/pro-geschaeftsfuehrerin-notfallmappe-vorlage-en.json';
const BEREICHSERSATZ = path.join(REPO, 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereichsersatz.json');

// Eingefroren. Eine weitere ausgelieferte Fassung kommt als weitere Zeile dazu, nie als Ersatz.
const QUELLEN = Object.freeze([
  { commit: '0f1de42c9de55500e576cd94b063afaf144fecb6',
    de: 'f8dfccd6da65d25370f568fddd8fd40037e6fd312d448f77660ed11b3d92c0b8',
    en: 'da9c331453a9221e293df9da5c7c5d7f2ac1c90d5738f3f54faedcd71bac5c89' },
  { commit: '07bdc245ce9f15b8e11b91096ca53afd4fe1aaac',
    de: 'a63b3e345530bcbca9b504bd3408d002da456a47baede61ada41dd5b63cca528',
    en: '6312e0a8a3bc84ebcc659c61a98579563df122007f5460e49f02a3f5cb0d4634' },
]);

function _ausGit(commit, pfad, sha256) {
  const text = execFileSync('git', ['show', commit + ':' + pfad], { cwd: REPO, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const ist = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  if (ist !== sha256) throw new Error(pfad + ' bei ' + commit + ': Prüfsumme ' + ist + ' statt ' + sha256 + ' — nicht geschrieben.');
  return JSON.parse(text);
}

/* Der Kern, gegen den die Vorlagen-Felder übersetzt werden: das gebackene Pro-Produkt. Die Pro-Bereiche
   kommen seit dem Schnitt als Templates in das Produkt; BUERGERMODUL_BUENDEL ist null, ein nachträglich
   gesetztes bereichsErsatz gibt es nicht mehr (Fund 19.09.2026, B1·Tabelle war rot). */
function _kern() {
  const os = require('node:os');
  const VP = require('./lib/vier-produkte.js');
  const { konfektionieren } = require('./produkt-konfektionieren.js');
  const ladeKernPfad = require.resolve('../tests/load-kern.js');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-vorlage-kennungen-'));
  const vorher = process.env.KERN_HTML_PATH;
  try {
    const p = VP.PRODUKTE.find((x) => x.slug === 'pro-de');
    const r = konfektionieren({
      ziel, slug: 'pro-de', modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: VP.modulDateienFuer(p),
    });
    process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
    delete require.cache[ladeKernPfad];
    const { V } = require(ladeKernPfad).ladeKern();
    V.setData(V.leeresDepot());
    return V;
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[ladeKernPfad];
    fs.rmSync(ziel, { recursive: true, force: true });
  }
}

// Genau die Übersetzung, die der Kern beim Einlass einer Vorlage macht — Feld für Feld.
function _def(V, feld) {
  const r = V._templateFelderUebersetzen({ felder: [feld] });
  return (r.feldDefinitionen && r.feldDefinitionen[0]) || null;
}

function zuordnungErzeugen() {
  const V = _kern();
  const zuordnung = {};
  const quellen = [];
  for (const q of QUELLEN) {
    const de = _ausGit(q.commit, VORLAGE_DE, q.de).felder;
    const en = _ausGit(q.commit, VORLAGE_EN, q.en).felder;
    if (de.length !== en.length) throw new Error(q.commit + ': ' + de.length + ' deutsche, ' + en.length + ' englische Felder.');
    quellen.push({ commit: q.commit, de: { pfad: VORLAGE_DE, sha256: q.de }, en: { pfad: VORLAGE_EN, sha256: q.en } });
    de.forEach((fDe, i) => {
      const fEn = en[i];
      if (fDe.bereich !== fEn.bereich || fDe.feldtyp !== fEn.feldtyp) {
        throw new Error(q.commit + ' Feld ' + i + ': Bereich oder Typ weichen ab (' + fDe.feldname + ' / ' + fEn.feldname + ').');
      }
      if (fDe.bereich === 'pro-identitaet') return;
      const dDe = _def(V, fDe);
      const dEn = _def(V, fEn);
      if (!dDe || !dEn) throw new Error(q.commit + ' Feld ' + i + ': vom Kern nicht übersetzt (' + fDe.feldname + ').');
      if (dDe.feldId === dEn.feldId) return;
      const eintrag = { nach: dDe.feldId, typ: dDe.typ };
      if (dDe.typ === 'liste') {
        const ufDe = dDe.unterFelder || [];
        const ufEn = dEn.unterFelder || [];
        if (ufDe.length !== ufEn.length) throw new Error(q.commit + ' ' + dDe.feldId + ': Unterfelder ' + ufDe.length + ' / ' + ufEn.length + '.');
        eintrag.unterFelder = {};
        ufEn.forEach((u, k) => { eintrag.unterFelder[u.id] = { nach: ufDe[k].id, typVorlage: u.typ, typBereich: null }; });
      }
      const bereich = (zuordnung[dDe.sektorId] = zuordnung[dDe.sektorId] || {});
      const bisher = bereich[dEn.feldId];
      if (bisher && JSON.stringify(bisher) !== JSON.stringify(eintrag)) {
        throw new Error(dEn.feldId + ' ist in zwei Fassungen verschieden zugeordnet — nicht geschrieben.');
      }
      bereich[dEn.feldId] = eintrag;
    });
  }
  // Der Typ des Unterfelds im Bereich steht daneben, damit der Kern eine Abweichung benennen kann,
  // ohne selbst zu vergleichen, woher welches Unterfeld stammt.
  const ersatz = JSON.parse(fs.readFileSync(BEREICHSERSATZ, 'utf8'));
  for (const [sektorId, felder] of Object.entries(zuordnung)) {
    const bereichFelder = ((ersatz.neu[sektorId] || {}).sektionen || []).flatMap((s) => s.felder || []);
    for (const eintrag of Object.values(felder)) {
      if (!eintrag.unterFelder) continue;
      const ziel = bereichFelder.find((f) => f.id === eintrag.nach);
      for (const uf of Object.values(eintrag.unterFelder)) {
        const zielUF = ziel && (ziel.unterFelder || []).find((u) => u.id === uf.nach);
        uf.typBereich = zielUF ? zielUF.typ : null;
      }
    }
  }
  const sortiert = {};
  for (const s of Object.keys(zuordnung).sort()) {
    sortiert[s] = {};
    for (const k of Object.keys(zuordnung[s]).sort()) sortiert[s][k] = zuordnung[s][k];
  }
  return { quellen, zuordnung: sortiert };
}

function main() {
  const pruefen = process.argv.includes('--pruefen');
  const neu = JSON.stringify(zuordnungErzeugen(), null, 2) + '\n';
  if (pruefen) {
    const ist = fs.existsSync(AUSGABE) ? fs.readFileSync(AUSGABE, 'utf8') : null;
    if (ist !== neu) {
      console.error('pro-vorlage-en-kennungen-erzeugen --pruefen: DRIFT. Abhilfe: node tools/pro-vorlage-en-kennungen-erzeugen.js');
      process.exit(1);
    }
    console.log('pro-vorlage-en-kennungen-erzeugen --pruefen: kein Drift.');
    return;
  }
  fs.writeFileSync(AUSGABE, neu);
  const n = Object.values(JSON.parse(neu).zuordnung).reduce((a, b) => a + Object.keys(b).length, 0);
  console.log('pro-vorlage-en-kennungen-erzeugen: ' + n + ' Kennungen zugeordnet, geschrieben.');
}

if (require.main === module) main();
module.exports = { zuordnungErzeugen, QUELLEN, AUSGABE };
