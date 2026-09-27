'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   nativ-bestand-aenderungen-erheben.js — was hat sich am BESTAND zwischen zwei
   vivodepot.html-Ständen geändert (U2-ADR-321)
   ────────────────────────────────────────────────────────────────────────────
   DER GRUND, WARUM ES DIESES WERKZEUG GIBT
   Das Produktabnahmekriterium lautet „als wäre nichts gewesen" — A==B,
   zwischen dem ausgelieferten Nativ und dem Kanon nach dem Schnitt. Zwischen
   beiden Ständen liegen aber ABSICHTLICHE Änderungen: neue Felder, neue Texte.
   Ohne sie zu kennen, unterscheiden sich A und B aus ZWEI Gründen — Absicht und
   Fehler — und keiner der beiden ist vom anderen zu trennen. Erst wenn die
   Absicht benannt ist, wird aus „unterschiedlich" die Aussage „identisch bis auf
   diese N benannten Änderungen".

   Eine Commit-Liste (`git log A..B -- vivodepot.html`) ist dafür NICHT genug:
   sie sagt, WER etwas geändert hat, nicht WAS sich am Bestand geändert hat. Ein
   Commit kann drei Felder anfassen und keines davon inhaltlich verändern; ein
   anderer benennt in einer Zeile ein Label um. Dieses Werkzeug fragt darum den
   BESTAND selbst — über den echten Kern-Ladeweg (tests/load-kern.js,
   KERN_HTML_PATH), nicht über eine Textnachbildung.

   WAS ES ERHEBT — alle sechs Register, die ein Bürgermodul führt (dieselbe
   Aufteilung wie tools/buergermodul-erzeugen.js, REGISTER_QUELLEN):
     bereiche (SEKTOREN, Feld für Feld inkl. Unterfelder) · situationen ·
     wizards · ereignisAchse · institutionsArt · textsatz
   Je Register: hinzugekommen, entfernt, geändert (mit den Eigenschaften, die
   sich unterscheiden), sowie ein Umbenennungs-VERDACHT (gleiche Stelle, gleiche
   Definition bis auf die Kennung — Verdacht, kein Urteil: nur ein Mensch weiß,
   ob dieselbe Sache umbenannt oder eine andere ersetzt wurde).

   NIE ÜBER INDIZES VERGLEICHEN (U2-ADR-298): jeder Vergleich hier geht über
   eine benannte, zusammengesetzte Stelle (sektorId·sektionId·unterVon·feldId),
   nie über eine Array-Position.

   FUNKTIONSWERTE werden als «fn:<Quelltext, normalisiert>» verglichen, nicht
   verschwiegen: `verborgenWenn` ist Bestand, und eine geänderte Bedingung ist
   eine geänderte Sache. JSON.stringify allein ließe sie lautlos verschwinden.

   Aufruf:
     node tools/nativ-bestand-aenderungen-erheben.js --a <pfad> --b <pfad> [--json <pfad>]
     node tools/nativ-bestand-aenderungen-erheben.js --a-commit <sha> [--b <pfad>]
   Ohne Argumente: der ausgelieferte Stand aus der Historie (A_COMMIT_VORGABE)
   gegen die vivodepot.html im Arbeitsbaum — der Fall, für den es gebaut wurde.
   Die Suite prüft das Werkzeug über tools/nativ-bestand-aenderungen-erheben.test.js
   (Vergleichs-Kern gegen Klarfälle, plus ein echter Lauf gegen eine Kopie mit
   genau einer eingebauten Änderung — die Positivkontrolle, ohne die ein
   Vergleicher, der immer „keine Änderung" sagt, unbemerkt grün färbte).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
// Der ausgelieferte Stand, gegen den ohne Argumente verglichen wird (U2-ADR-321):
// 37038011, 02.09.2026, SCHALEN_STAND v501 — der Commit, den Testerinnen geöffnet haben.
const A_COMMIT_VORGABE = '37038011';

/* ── Bestand aus EINEM Stand lesen (läuft im Kindprozess, s. bestandLesen) ────
   load-kern.js liest KERN_HTML_PATH beim `require` einmalig in ein Modul-Level-
   Konstante; zwei Stände in EINEM Prozess sind darum nicht zu haben. Ein
   Kindprozess je Stand ist der ehrliche Weg, kein `delete require.cache`-Trick. */
function bestandAusKernLesen() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();

  const bereiche = {};
  for (const sektor of (V.bereicheAlle())) {
    for (const sektion of (sektor.sektionen || [])) {
      for (const feld of (sektion.felder || [])) {
        bereiche[stelle([sektor.id, sektion.id, '', feld.id])] = jsonSicher(feld);
        for (const unter of (feld.unterFelder || [])) {
          bereiche[stelle([sektor.id, sektion.id, feld.id, unter.id])] = jsonSicher(unter);
        }
      }
    }
  }

  const situationen = {};
  for (const s of (V.SITUATIONEN || [])) {
    for (const block of (s.bloecke || [])) {
      for (const eintrag of (block.eintraege || [])) {
        if (!eintrag) continue;
        // Querverweis ({quelle, feld:'kennung'}) UND eigenes Feld ({feld:{…}}) sind beide
        // Bestand — der Querverweis ist die Stelle, an der eine Situation ein Feld ZEIGT,
        // und ein weggefallener Verweis ist für die Bürgerin ein weggefallenes Feld.
        const kennung = (typeof eintrag.feld === 'string') ? eintrag.feld
          : (eintrag.feld && eintrag.feld.id) || '«ohne-id»';
        situationen[stelle([s.id, block.id, '', kennung])] = jsonSicher(eintrag);
      }
    }
  }

  const wizards = {};
  for (const w of (V.WIZARDS || [])) {
    for (const schritt of (w.schritte || [])) {
      const kennung = (schritt && schritt.feld && schritt.feld.id) || (schritt && schritt.feld) || '«ohne-id»';
      wizards[stelle([w.id, String(kennung)])] = jsonSicher(schritt);
    }
  }

  const ereignisAchse = {};
  for (const e of (V.EREIGNIS_ACHSE_FELDER || [])) {
    ereignisAchse[stelle([(e && e.id) || '«ohne-id»'])] = jsonSicher(e);
  }

  const institutionsArt = jsonSicher(V.INSTITUTION_ART || {});
  /* Der deutsche Satz gehört ZUM STAND, nicht zum Arbeitsbaum. Seit S8 (U2-ADR-428) steht er nicht mehr im Kern, sondern im Sprachmodul, das `kernGebackenLesen`
     in den gebackenen Stand einbäckt — gelesen wird er darum über `_sprachBasis()` des geladenen Stands. Ein Lesen der Moduldatei des Arbeitsbaums (so stand
     es zwischen dem dritten und dem letzten S8-Commit) vergliche Stand A und Stand B beide mit dem Arbeitsbaum: jede Textänderung zwischen ihnen bliebe
     unsichtbar, der Vergleicher sagte immer „keine Änderung". Ein Stand ohne Zugriffspunkt (vor S8) trägt keinen Satz im Kern → leeres Register. */
  const textsatz = jsonSicher(typeof V._sprachBasis === 'function' ? Object.assign({}, V._sprachBasis()) : {});

  return {
    stand: { SCHALEN_STAND: V.SCHALEN_STAND, BUILD_DATUM: V.BUILD_DATUM },
    register: { bereiche, situationen, wizards, ereignisAchse, institutionsArt, textsatz },
  };
}

// Zusammengesetzte, benannte Stelle — nie eine Array-Position (U2-ADR-298).
function stelle(teile) { return teile.map((t) => String(t == null ? '' : t)).join('·'); }

/* Funktionswerte sind Bestand (`verborgenWenn`) und dürfen nicht lautlos aus dem
   Vergleich fallen. Whitespace normalisiert, damit eine reine Umformatierung nicht
   als inhaltliche Änderung erscheint — eine geänderte Bedingung dagegen schon. */
function jsonSicher(wert) {
  if (typeof wert === 'function') return '«fn:' + String(wert).replace(/\s+/g, ' ').trim() + '»';
  if (Array.isArray(wert)) return wert.map(jsonSicher);
  if (wert && typeof wert === 'object') {
    const out = {};
    for (const k of Object.keys(wert).sort()) out[k] = jsonSicher(wert[k]);
    return out;
  }
  return wert;
}

// Einen Stand über einen Kindprozess lesen (eigener KERN_HTML_PATH je Stand).
// Schnitt-Nachtrag (18.09.2026, Fund -6c): `KERN_HTML_PATH` lässt `ladeKern()` das
// Backen überspringen (tests/load-kern.js, `!opts.blank && !process.env.KERN_HTML_PATH`)
// — der Kindprozess sah darum, gegen einen post-Schnitt-Stand, ein leeres `bereicheAlle()`
// statt der dreizehn nativen Bereiche. Ein Lauf ohne Argumente (A=37038011, pre-Schnitt,
// noch inline richtig; B=Arbeitsbaum, post-Schnitt, leer) meldete 4355 „Änderungen",
// hunderte davon `entfernt` für ganz normale, weiterhin existierende Felder — reines
// Backen-Artefakt. `kernGebackenLesen` bäckt HIER, vor dem Kindprozess, nicht im
// Kindprozess selbst — sie erkennt an den AB_WERK-Markern, ob ein Stand das überhaupt
// braucht (ein pre-Schnitt-Stand kommt unveraendert zurück, s. tools/lib/kern-lesen.js).
// ISO1 (19.09.2026): `opts` durchgereicht bis zu `modulDateienFuer()` (tools/lib/
// vier-produkte.js) — braucht NUR die eigene Positivkontrolle dieser Datei
// (tools/nativ-bestand-aenderungen-erheben.test.js), die eine Wegwerf-Kopie der Bereichs-
// Templates gegen `opts.bereichTemplateVerzeichnis` prüfen will, statt die echte, geteilte
// `tools/bereich-templates/vivodepot-identity.json` im Arbeitsbaum zu mutieren (Isolationsleck:
// ein zeitgleich laufender `node --test`-Prozess, der DIESELBE Datei über einen anderen
// Ladeweg bäckt, konnte mit Pech die mutierte Zwischenversion lesen). `aenderungenErheben()`
// selbst reicht kein `opts` durch — sie vergleicht zwei bereits genannte Pfade, keine
// Live-Vorlage.
function bestandLesen(htmlPfad, opts) {
  const { kernGebackenLesen } = require('./lib/kern-lesen.js');
  const gebacken = kernGebackenLesen(htmlPfad, opts);
  const tmp = path.join(os.tmpdir(), 'vd-nativ-bestand-gebacken-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(tmp, gebacken, 'utf8');
  try {
    const roh = execFileSync(process.execPath, [__filename, '--bestand-ausgeben'], {
      env: Object.assign({}, process.env, { KERN_HTML_PATH: tmp }),
      maxBuffer: 256 * 1024 * 1024, encoding: 'utf8',
    });
    return JSON.parse(roh);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/* ── Der Vergleich ───────────────────────────────────────────────────────── */
function registerVergleichen(a, b) {
  const hinzugefuegt = [];
  const entfernt = [];
  const geaendert = [];
  for (const k of Object.keys(b)) {
    if (!Object.prototype.hasOwnProperty.call(a, k)) { hinzugefuegt.push({ stelle: k, neu: b[k] }); continue; }
    const va = JSON.stringify(a[k]);
    const vb = JSON.stringify(b[k]);
    if (va !== vb) geaendert.push({ stelle: k, eigenschaften: eigenschaftenDiff(a[k], b[k]) });
  }
  for (const k of Object.keys(a)) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) entfernt.push({ stelle: k, alt: a[k] });
  }
  return { hinzugefuegt, entfernt, geaendert, umbenennungsVerdacht: umbenennungenVermuten(entfernt, hinzugefuegt) };
}

// Welche Eigenschaften genau unterscheiden sich — nicht nur DASS sich etwas unterscheidet.
function eigenschaftenDiff(alt, neu) {
  if (!alt || !neu || typeof alt !== 'object' || typeof neu !== 'object' || Array.isArray(alt) || Array.isArray(neu)) {
    return [{ eigenschaft: '«wert»', alt, neu }];
  }
  const namen = new Set([...Object.keys(alt), ...Object.keys(neu)]);
  const out = [];
  for (const n of [...namen].sort()) {
    const va = JSON.stringify(alt[n]);
    const vb = JSON.stringify(neu[n]);
    if (va !== vb) out.push({ eigenschaft: n, alt: alt[n], neu: neu[n] });
  }
  return out;
}

/* Umbenennungs-VERDACHT, ausdrücklich kein Urteil: gleiche Stelle bis auf die letzte
   Kennung, und die Definitionen sind bis auf `id` gleich. Ob dieselbe Sache umbenannt
   oder eine andere ersetzt wurde, entscheidet ein Mensch — das Werkzeug legt den Fund
   nur nebeneinander, statt zwei zusammengehörige Zeilen getrennt zu melden. */
function umbenennungenVermuten(entfernt, hinzugefuegt) {
  const verdacht = [];
  for (const weg of entfernt) {
    const praefixWeg = weg.stelle.split('·').slice(0, -1).join('·');
    for (const neu of hinzugefuegt) {
      if (neu.stelle.split('·').slice(0, -1).join('·') !== praefixWeg) continue;
      if (JSON.stringify(ohneId(weg.alt)) !== JSON.stringify(ohneId(neu.neu))) continue;
      verdacht.push({ alt: weg.stelle, neu: neu.stelle });
    }
  }
  return verdacht;
}
function ohneId(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return d;
  const out = Object.assign({}, d); delete out.id; return out;
}

function aenderungenErheben(aPfad, bPfad) {
  const a = bestandLesen(aPfad);
  const b = bestandLesen(bPfad);
  const register = {};
  for (const name of Object.keys(a.register)) {
    register[name] = registerVergleichen(a.register[name], b.register[name]);
  }
  const summe = Object.values(register).reduce((n, r) =>
    n + r.hinzugefuegt.length + r.entfernt.length + r.geaendert.length, 0);
  return { a: a.stand, b: b.stand, register, summe };
}

/* ── Bericht ─────────────────────────────────────────────────────────────── */
function berichtSchreiben(erg) {
  const zeilen = [];
  zeilen.push('BESTANDS-ÄNDERUNGEN A → B');
  zeilen.push('  A: ' + erg.a.SCHALEN_STAND + ' (' + erg.a.BUILD_DATUM + ')');
  zeilen.push('  B: ' + erg.b.SCHALEN_STAND + ' (' + erg.b.BUILD_DATUM + ')');
  zeilen.push('  Summe benannter Änderungen: ' + erg.summe);
  zeilen.push('');
  for (const [name, r] of Object.entries(erg.register)) {
    const n = r.hinzugefuegt.length + r.entfernt.length + r.geaendert.length;
    zeilen.push('── ' + name + ' — ' + n + ' Änderung(en)');
    for (const h of r.hinzugefuegt) zeilen.push('   + neu       ' + h.stelle);
    for (const e of r.entfernt) zeilen.push('   - entfernt   ' + e.stelle);
    for (const g of r.geaendert) {
      zeilen.push('   ~ geändert   ' + g.stelle + '  [' + g.eigenschaften.map((x) => x.eigenschaft).join(', ') + ']');
    }
    for (const v of r.umbenennungsVerdacht) zeilen.push('   ? umbenannt? ' + v.alt + '  ->  ' + v.neu);
    if (n === 0) zeilen.push('   (keine)');
    zeilen.push('');
  }
  return zeilen.join('\n');
}

/* ── Aufruf ──────────────────────────────────────────────────────────────── */
function argument(name) {
  const i = process.argv.indexOf(name);
  return (i >= 0 && process.argv[i + 1]) ? process.argv[i + 1] : null;
}

function aStandAusCommit(sha) {
  const ziel = path.join(os.tmpdir(), 'vd-a-stand-' + sha + '-' + process.pid + '.html');
  const inhalt = execFileSync('git', ['show', sha + ':vivodepot.html'], {
    cwd: REPO, maxBuffer: 256 * 1024 * 1024, encoding: 'utf8',
  });
  fs.writeFileSync(ziel, inhalt, 'utf8');
  return ziel;
}

function main() {
  if (process.argv.includes('--bestand-ausgeben')) {
    process.stdout.write(JSON.stringify(bestandAusKernLesen()));
    return;
  }
  const aCommit = argument('--a-commit') || (argument('--a') ? null : A_COMMIT_VORGABE);
  let aPfad = argument('--a');
  let temporaer = null;
  if (!aPfad) { aPfad = temporaer = aStandAusCommit(aCommit); }
  const bPfad = argument('--b') || path.join(REPO, 'vivodepot.html');
  try {
    const erg = aenderungenErheben(aPfad, bPfad);
    const jsonPfad = argument('--json');
    if (jsonPfad) fs.writeFileSync(jsonPfad, JSON.stringify(erg, null, 2), 'utf8');
    process.stdout.write(berichtSchreiben(erg) + '\n');
  } finally {
    if (temporaer) fs.rmSync(temporaer, { force: true });
  }
}

if (require.main === module) main();

module.exports = { aenderungenErheben, bestandLesen, registerVergleichen, berichtSchreiben, aStandAusCommit };
