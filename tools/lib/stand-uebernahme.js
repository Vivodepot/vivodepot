'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   stand-uebernahme.js — der Stand-Commit eines Release übernimmt Volllauf-Beleg und öffentlichen Probelauf seines Vorgängers
   (26.11.2026; lockert ein Push-Tor, darum gemessen statt behauptet und nur mit `scharf: true` im Block `standCommit` der
   Übernahme-Liste).
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Nach Teil 1 eines Release landet ein Commit, der nur die ausgelieferte Fassung F nachträgt: Register, Fingerabdrücke in
   SECURITY.md, Stand-Dokus, Beleg der Bereichsdefinitionen, Release-Notes, Änderungsprotokoll. Bis hierher kostete er einen
   Volllauf und einen neuen öffentlichen Probelauf. Er übernimmt den Beleg des Vorgängers P, wenn ALLE Bedingungen gemessen gelten:
     a · jede Datei im Diff P..S steht in `standCommit.pfade` oder `neuErlaubt` (nicht die allgemeine Übernahme-Liste);
     F · die Fassung kommt aus dem Register (`standCommit.register`): dort kommen nur Zeilen am Ende dazu, alle mit derselben
         Fassung F. Kein neuer Registereintrag, zwei Fassungen → kein Stand-Commit;
     b · jede Datei trägt F an ihrer festen Stelle (`standCommit.regeln`), und nur F:
           ende-text            nur Zeilen hinter der letzten alten Zeile
           ende-text-fassung    dazu beginnt jede neue Zeile mit „| F |“
           ende-json            jede Liste behält ihren alten Anfang, neue Einträge nur am Ende; jede darin genannte Fassung ist F
           einsortiert-json     für Listen, die nach Text sortiert sind (v1070 vor v787): die alte Liste bleibt in Reihenfolge
                                erhalten, jeder eingefügte Eintrag nennt F und keine andere Fassung
           register             wie ende-json, und die neuen Zeilen bestimmen F
           security-tabelle     ein Block direkt unter der Trennzeile der Tabelle „| Fassung | … | SHA-256 |“, je Zeile „| F | …“
           fassungen-erstes     genau ein neues erstes Element der Liste „fassungen“, mit der Fassung F
           changelog            genau ein Abschnitt „## [v1.0.<n>] – …“ für F, direkt vor der bisher obersten Fassungsüberschrift
           neu (neuErlaubt)     eine neue Datei, deren Name die Nummer von F trägt
     c · berührt der Diff eine Datei, die Erzeuger lesen (`erzeugerLesen`), dann sind die ausgelieferten Produktdateien
         (DATEISATZ) an P und S dieselben Blobs, und jeder Befehl in `erzeugerPruefen` endet an S mit 0;
     d · (öffentlicher Probelauf) der Push des Stand-Commits hat einen Übernahme-Beleg der Art stand-commit vom selben P
         geschrieben (also liefen dort die Prüfbefehle und Leser-Proben), a–b gelten, und der Zuschnitt-Baum von S weicht von dem
         von P nur in Pfaden aus a ab.
   Verletzt eine davon, bleibt es beim Volllauf bzw. beim eigenen Probelauf wie bisher. Ein übernommener Beleg trägt seine Herkunft.
   Probe und Rot-Beweise je Bedingung liegen bei den internen Proben des Push-Tors.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const zeilenVon = (t) => String(t).split('\n').map((z) => z.trim()).filter(Boolean);
const FASSUNG = /^v[0-9]{3,}$/;

/* Passt der Pfad auf einen Eintrag des Blocks (exakter Pfad oder `<verzeichnis>/*.md`, nicht rekursiv)? */
function passt(pfad, muster) {
  if (!muster.includes('*')) return pfad === muster;
  const m = /^(.+)\/\*\.md$/.exec(muster);
  return !!m && path.posix.dirname(pfad) === m[1] && pfad.endsWith('.md');
}
const inListe = (pfad, liste) => (liste || []).some((m) => passt(pfad, m));
/* a: nur die Stand-Pfade und neuErlaubt. */
const erlaubtFuer = (block) => (d) => inListe(d, block.pfade) || inListe(d, block.neuErlaubt);

function gleich(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
/* Jede Fassungsnummer (ganzer Wert „vNNN…“) irgendwo im Wert. */
function fassungen(x, aus = []) {
  if (typeof x === 'string') { if (FASSUNG.test(x)) aus.push(x); } else if (Array.isArray(x)) x.forEach((y) => fassungen(y, aus));
  else if (x && typeof x === 'object') Object.values(x).forEach((y) => fassungen(y, aus));
  return aus;
}
const nurF = (x, F) => fassungen(x).every((f) => f === F);

/* JSON nur am Ende ergänzt: Objekte mit denselben Schlüsseln, Listen mit unverändertem Anfang; jede neue Nennung einer Fassung ist F. */
function nurAngehaengtWert(alt, neu, F) {
  if (Array.isArray(alt)) {
    if (!Array.isArray(neu) || neu.length < alt.length) return false;
    for (let i = 0; i < alt.length; i++) if (!nurAngehaengtWert(alt[i], neu[i], F)) return false;
    return neu.slice(alt.length).every((x) => nurF(x, F));
  }
  if (alt && typeof alt === 'object') {
    if (!neu || typeof neu !== 'object' || Array.isArray(neu)) return false;
    const ka = Object.keys(alt).sort(); const kn = Object.keys(neu).sort();
    if (!gleich(ka, kn)) return false;
    return ka.every((k) => nurAngehaengtWert(alt[k], neu[k], F));
  }
  return alt === neu;
}

/* JSON einsortiert: wie oben, aber eingefügte Einträge dürfen zwischen den alten stehen; jeder trägt F und nur F. */
function einsortiertWert(alt, neu, F) {
  const nurNeuF = (x) => { const f = fassungen(x); return f.length > 0 && f.every((y) => y === F); };   // trägt F und nur F
  if (Array.isArray(alt)) {
    if (!Array.isArray(neu) || neu.length < alt.length) return false;
    const passtAlt = (x, y) => gleich(x, y) || (!!x && typeof x === 'object' && einsortiertWert(x, y, F));
    let j = 0;
    for (const x of alt) {
      while (j < neu.length && !passtAlt(x, neu[j])) { if (!nurNeuF(neu[j])) return false; j++; }
      if (j === neu.length) return false;
      j++;
    }
    return neu.slice(j).every(nurNeuF);
  }
  if (alt && typeof alt === 'object') {
    if (!neu || typeof neu !== 'object' || Array.isArray(neu)) return false;
    const ka = Object.keys(alt).sort(); const kn = Object.keys(neu).sort();
    if (!gleich(ka, kn)) return false;
    return ka.every((k) => einsortiertWert(alt[k], neu[k], F));
  }
  return alt === neu;
}

/* Text: wo wurde ein Block eingefügt? → { stelle, block } oder null (kein reines Einfügen an einer Stelle). */
function einfuegung(alt, neu) {
  const k = neu.length - alt.length;
  if (k <= 0) return null;
  let p = 0;
  while (p < alt.length && alt[p] === neu[p]) p++;
  for (let i = p; i < alt.length; i++) if (alt[i] !== neu[i + k]) return null;
  return { stelle: p, block: neu.slice(p, p + k) };
}
const zeilen = (t) => String(t).replace(/\n$/, '').split('\n');
const nummer = (F) => F.slice(1);

/* Die Regeln je Datei: (alt, neu, F) → Grund oder null. alt/neu sind Texte. */
const REGELN = {
  'ende-text': (a, n) => { const e = einfuegung(zeilen(a), zeilen(n)); return e && e.stelle === zeilen(a).length ? null : 'nicht nur am Ende angehängt'; },
  'ende-text-fassung': (a, n, F) => {
    const e = einfuegung(zeilen(a), zeilen(n));
    if (!e || e.stelle !== zeilen(a).length) return 'nicht nur am Ende angehängt';
    return e.block.every((z) => z.startsWith('| ' + F + ' |')) ? null : 'eine neue Zeile nennt nicht ' + F;
  },
  'ende-json': (a, n, F) => (nurAngehaengtWert(JSON.parse(a), JSON.parse(n), F) ? null : 'nicht nur am Ende ergänzt, oder eine andere Fassung als ' + F),
  'einsortiert-json': (a, n, F) => (einsortiertWert(JSON.parse(a), JSON.parse(n), F) ? null : 'ein alter Eintrag fehlt oder ist geändert, oder ein eingefügter nennt nicht nur ' + F),
  'security-tabelle': (a, n, F) => {
    const A = zeilen(a); const e = einfuegung(A, zeilen(n));
    if (!e || e.stelle < 2 || !/^\|-+\|-+\|-+\|-+\|$/.test(A[e.stelle - 1]) || !/^\| Fassung \|.*\| SHA-256 \|$/.test(A[e.stelle - 2])) return 'nicht direkt unter dem Kopf der Fingerabdruck-Tabelle eingefügt';
    const zeile = new RegExp('^\\| ' + F + ' \\| [0-9]{4}-[0-9]{2}-[0-9]{2} \\| [a-z0-9-]+ \\| `[0-9a-f]{64}` \\|$');
    return e.block.every((z) => zeile.test(z)) ? null : 'eine eingefügte Zeile ist keine Fingerabdruck-Zeile für ' + F;
  },
  'fassungen-erstes': (a, n, F) => {
    const A = JSON.parse(a); const N = JSON.parse(n);
    if (!gleich(Object.keys(A).sort(), Object.keys(N).sort())) return 'Schlüssel geändert';
    for (const k of Object.keys(A)) if (k !== 'fassungen' && !gleich(A[k], N[k])) return k + ' geändert';
    if (!Array.isArray(N.fassungen) || N.fassungen.length !== A.fassungen.length + 1 || !gleich(N.fassungen.slice(1), A.fassungen)) return 'nicht genau ein neues erstes Element von „fassungen“';
    return N.fassungen[0] && N.fassungen[0].fassung === F && nurF(N.fassungen[0], F) ? null : 'das neue erste Element ist nicht ' + F;
  },
  changelog: (a, n, F) => {
    const A = zeilen(a); const e = einfuegung(A, zeilen(n));
    const kopf = /^## \[v1\.0\.([0-9]+)\] – [0-9]{4}-[0-9]{2}-[0-9]{2}$/;
    if (!e || !/^## \[v1\.0\./.test(A[e.stelle] || '') || A.slice(0, e.stelle).some((z) => /^## \[v/.test(z))) return 'nicht direkt vor der bisher obersten Fassungsüberschrift eingefügt';
    const m = kopf.exec(e.block[0]);
    if (!m || 'v' + m[1] !== F) return 'der neue Abschnitt ist nicht ' + F;
    if (e.block.slice(1).some((z) => /^## /.test(z))) return 'mehr als ein neuer Abschnitt';
    return e.block[e.block.length - 1] === '' ? null : 'der Abschnitt endet nicht mit einer Leerzeile';
  },
};

/* F aus dem Register: nur Zeilen am Ende dazu, alle mit derselben Fassung. → { F } oder { grund }. */
function fassungAusRegister(a, n) {
  const A = JSON.parse(a); const N = JSON.parse(n);
  const neu = Array.isArray(N.zeilen) && Array.isArray(A.zeilen) ? N.zeilen.slice(A.zeilen.length) : [];
  const Fs = [...new Set(neu.map((z) => z && z.fassung))];
  if (!neu.length) return { grund: 'kein neuer Registereintrag' };
  if (Fs.length !== 1 || !FASSUNG.test(Fs[0] || '')) return { grund: 'neue Registerzeilen nennen ' + Fs.length + ' Fassungen (' + Fs.join(', ') + ')' };
  return nurAngehaengtWert(A, N, Fs[0]) ? { F: Fs[0] } : { grund: 'das Register ist nicht nur am Ende ergänzt' };
}

/* c: dieselben Blobs für jede ausgelieferte Produktdatei an P und S. */
function dateisatzGleich(g, von, kopf, dateisatz) {
  for (const d of dateisatz) {
    let a = ''; let b = '';
    try { a = g(['rev-parse', von + ':' + d]); } catch (_) { a = ''; }   // fehlt sie, ist sie nicht gleich: unten rot
    try { b = g(['rev-parse', kopf + ':' + d]); } catch (_) { b = ''; }
    if (!a || a !== b) return { ok: false, grund: 'ausgelieferte Datei ' + d + ' an ' + von.slice(0, 9) + ' und ' + kopf.slice(0, 9) + ' verschieden' };
  }
  return { ok: true };
}

/* a, F, b und c für den Diff P..S. `ausfuehren(argv)` → Exit-Code im Arbeitsbaum von S (sauber, HEAD = S); ohne `ausfuehren`
   (Probelauf-Tor) laufen die Prüfbefehle nicht, dort verlangt d den Beleg des Pushs. Ohne `block.scharf` immer { ok: false }. */
function standPlan({ g, von, kopf, dateien, block, ausfuehren, dateisatz }) {
  if (!block || block.scharf !== true) return { ok: false, grund: 'Stand-Commit-Weg nicht scharf' };
  const fremd = dateien.filter((d) => !erlaubtFuer(block)(d));
  if (fremd.length) return { ok: false, grund: 'a: nicht unter den Stand-Pfaden: ' + fremd.slice(0, 5).join(', ') };
  const text = (rev, d) => { try { return g(['show', rev + ':' + d]); } catch (_) { return null; } };   // null = gibt es dort nicht
  if (!dateien.includes(block.register)) return { ok: false, grund: 'F: kein neuer Registereintrag' };
  let F;
  try { const r = fassungAusRegister(text(von, block.register), text(kopf, block.register)); if (!r.F) return { ok: false, grund: 'F: ' + r.grund }; F = r.F; } catch (e) { return { ok: false, grund: 'F: Register nicht lesbar' }; }
  for (const d of dateien) {
    const a = text(von, d); const n = text(kopf, d);
    if (n === null) return { ok: false, grund: 'b: ' + d + ' gelöscht' };
    if (a === null) {
      if (!inListe(d, block.neuErlaubt)) return { ok: false, grund: 'b: ' + d + ' neu angelegt (nur unter neuErlaubt)' };
      if (!path.posix.basename(d).includes('.' + nummer(F) + '.')) return { ok: false, grund: 'b: ' + d + ' trägt nicht die Nummer von ' + F };
      continue;
    }
    if (d === block.register) continue;
    const regel = REGELN[(block.regeln || {})[d]];
    if (!regel) return { ok: false, grund: 'b: ' + d + ' ohne feste Einfügestelle' };
    let grund;
    try { grund = regel(a, n, F); } catch (e) { grund = 'nicht lesbar'; }
    if (grund) return { ok: false, grund: 'b: ' + d + ': ' + grund };
  }
  if (dateien.some((d) => inListe(d, block.erzeugerLesen))) {
    const s = dateisatzGleich(g, von, kopf, dateisatz);
    if (!s.ok) return { ok: false, grund: 'c: ' + s.grund };
    for (const argv of ausfuehren ? block.erzeugerPruefen || [] : []) {
      const rc = ausfuehren(argv);
      if (rc !== 0) return { ok: false, grund: 'c: ' + argv.join(' ') + ' endet mit ' + rc };
    }
  }
  return { ok: true, fassung: F, pfade: dateien, proben: [...(block.leserProben || [])] };
}

/* d: weicht der Zuschnitt-Baum von S von dem von P nur in erlaubten Pfaden ab? */
function zuschnittNurErlaubt(g, baumVon, baumKopf, erlaubt) {
  const namen = zeilenVon(g(['diff-tree', '--diff-merges=first-parent', '-r', '--name-only', '--no-renames', baumVon, baumKopf]));
  const fremd = namen.filter((n) => !erlaubt(n));
  return fremd.length ? { ok: false, grund: 'd: der Zuschnitt weicht außerhalb der Stand-Pfade ab: ' + fremd.slice(0, 5).join(', ') } : { ok: true, namen };
}

/* d im Ganzen, für das Probelauf-Tor: der nächste Vorfahr P (erster Elternteil, höchstens `abstand`) mit einem Probelauf-Beleg,
   der für P selbst gilt (`belegFuer(P)`, `gilt(beleg, baumP)`); der Push-Beleg von S (`pushBeleg(sha)`) ist eine Übernahme der Art
   stand-commit von P; a, F und b für P..S; der Zuschnitt weicht nur in Stand-Pfaden ab. → { beleg (übernommen), von } | { grund }. */
function probelaufVomVorgaenger({ g, stand, block, dateisatz, belegFuer, gilt, zuschnittBaum, pushBeleg, abstand = 5 }) {
  if (!block || block.scharf !== true) return { grund: 'Stand-Commit-Weg nicht scharf' };
  let c = stand;
  for (let i = 1; i <= abstand; i++) {
    let p = '';
    try { p = g(['rev-parse', '--verify', '-q', c + '^1']); } catch (_) { p = ''; }   // Wurzel: kein Elternteil
    if (!p) break;
    const beleg = belegFuer(p);
    if (beleg) {
      const pb = pushBeleg(stand);
      if (!pb || pb.hook !== 'uebernahme' || pb.art !== 'stand-commit' || pb.vonCommit !== p) return { grund: 'd: kein Push-Beleg des Stand-Commits (Übernahme, Art stand-commit, von ' + p.slice(0, 9) + ')' };
      const baumP = zuschnittBaum(p);
      if (!baumP || !gilt(beleg, baumP)) return { grund: 'der Beleg des Vorfahren ' + p.slice(0, 9) + ' gilt nicht für dessen Zuschnitt' };
      const dateien = zeilenVon(g(['diff', '--name-only', '--no-renames', p, stand]));
      const plan = standPlan({ g, von: p, kopf: stand, dateien, block, ausfuehren: null, dateisatz });
      if (!plan.ok) return { grund: plan.grund };
      const baumS = zuschnittBaum(stand);
      if (!baumS) return { grund: 'der Zuschnitt aus ' + stand.slice(0, 9) + ' ließ sich nicht berechnen' };
      const d = zuschnittNurErlaubt(g, baumP, baumS, erlaubtFuer(block));
      if (!d.ok) return { grund: d.grund };
      return { beleg: belegUebernehmen(beleg, { baumKopf: baumS, vonStand: p, vonBaum: baumP }), von: p };
    }
    c = p;
  }
  return { grund: 'kein Vorfahr mit Probelauf-Beleg in ' + abstand + ' Commits' };
}

/* Der übernommene Probelauf-Beleg: derselbe Lauf, gültig für den Zuschnitt-Baum von S, mit Herkunft. */
function belegUebernehmen(beleg, { baumKopf, vonStand, vonBaum }) {
  return { ...beleg, baum: baumKopf, uebernommenVon: { stand: vonStand, baum: vonBaum } };
}

module.exports = { passt, inListe, erlaubtFuer, fassungen, nurAngehaengtWert, einfuegung, einsortiertWert, REGELN, fassungAusRegister, dateisatzGleich, standPlan, zuschnittNurErlaubt, probelaufVomVorgaenger, belegUebernehmen };
