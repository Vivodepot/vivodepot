#!/usr/bin/env node
'use strict';
/* ══════════════════════════════════════════════════════════════
   anker-und-zertifikate-pruefen.js — die Kette Anker → Zertifikate → Vorlagen-Signaturen bleibt in EINEM Commit zusammen (21.09.2026)
   ──────────────────────────────────────────────────────────────
   Spezifikation v1, Absatz 21.11: „Ein Anker und die mit ihm gebildeten Signaturen MÜSSEN im selben ausgelieferten Stand erscheinen. Ein Stand, der nur eines von beiden trägt,
   DARF NICHT entstehen." Der Absatz war gelebt, nie geprüft. Er ist eine EINBAHNSTRASSE: ein gepushter Zwischenstand mit nur einer Hälfte macht jedes ausgelieferte Artefakt
   prüfunfähig, und nach dem Push ist er nicht mehr einzufangen. Am fertigen Baum ist das nicht zu sehen — beide Hälften stehen da, in derselben Fassung, und ein Zwischenstand sieht aus
   wie ein vollständiger Zug. NUR DER VERGLEICH MIT DEM VORGÄNGER WEISS ES. Darum prüft dieses Werkzeug einen VORGANG (jeden Commit gegen seinen Vorgänger), keinen Zustand.

   DIE KETTE HAT ZWEI GLIEDER, beide EINSEITIG (die Umkehrung wäre falsch und würde eine vorgesehene Handlung blockieren):
     1. Der ANKER ändert sich          ⇒  STANDARD_VORLAGEN_CERTS ändern sich im selben Commit UND alle drei Träger des Ankers tragen danach denselben Anker.
        Träger: TRUST_AUTHORITY_PUBLIC_JWK in vivodepot.html und vivodepot-lesen.html, VIVODEPOT_KERN_TRUST_AUTHORITY_PUBLIC_JWK (anderer Name!) in vivodepot-vc-issuer.html.
        Die Certs allein zu ändern ist erlaubt: tools/treuhand-rotation-einsetzen.js setzt neue Certs unter UNVERÄNDERTEM Anker ein.
     2. Der TREUHAND-PUBLIC in den Certs ändert sich  ⇒  ALLE VIER `templateJws` ändern sich im selben Commit.
        Der Treuhandschlüssel signiert die vier Standardvorlagen (tools/dokument-module/vivodepot-standardvorlage-*.json, Feld `standardVorlagen.<name>.templateJws`); sein Public steht in den Behörden-Certs, und das
        Template wird gegen den Public aus dem Cert geprüft. Neuer Treuhandschlüssel → neue Certs → die alten `templateJws` prüfen nicht mehr → „ein Anbieter-Template ohne gültige
        `templateJws` wird nicht mehr gerendert" (U2-ADR-039): Patientenverfügung, Vorsorgevollmacht, Betreuungsverfügung, Organspende — weg.
        Die `templateJws` allein zu ändern ist erlaubt (ein Template-Inhalt, der neu signiert wird).
        Der Golden Master (tests/fixtures/golden-master-ausgabewege-baseline.json) trägt die vier `templateJws` abgeleitet mit: nach einem Neusignieren wird er NEU ERZEUGT
        (tools/landung-vorbereiten.js), nicht gemerged.

   WARUM WERTE UND NICHT DATEINAMEN: der Anker und die Certs stehen in DERSELBEN Datei (vivodepot.html). Ein `git diff --name-only` gegen zwei Muster liefert für beide dieselbe Zeile und
   könnte nicht einmal im Prinzip unterscheiden. Verglichen werden die Statement-WERTE: der Anker als Identität (kty, crv, x, kid — Formatierung, Kommentare und `alg` zählen nicht), die Certs als
   Wert, der Treuhand-Public aus dem Cert-Payload (kompaktes JWS, base64url-JSON, `credentialSubject.publicKeyJwk` — keine Krypto, kein Netz), die `templateJws` als Zeichenketten. Die Statementgrenze
   ist die aus tools/geruest-waechter-pruefen.js: dieselbe Erkennung an zwei Stellen, nicht zwei Erkennungen.

   DREI AUSGÄNGE (Spezifikation §36.1b): gemessen und eingehalten (Exit 0) · gemessen und verletzt (Exit 1) · NICHT MESSBAR (Exit 1) — ein Träger, ein Statement oder ein Cert ist in einer berührten
   Datei nicht zu finden oder nicht zu lesen. Konnte es nicht messen, darf es nicht bestehen.
   REICHWEITE, mit Ansage: dieses Werkzeug bewacht KÜNFTIGE Züge, keine vergangenen. Gegen die Historie ist es nicht anwendbar: die sieben Commits des Kanons vor dem
   21.09.2026, die den Anker, die Certs oder die templateJws berührten, sind für diese Prüfung NICHT MESSBAR — die Träger hießen früher anders oder existierten nicht (gemessen mit
   `--bereich <commit>^..<commit>` je Commit). Wer „grün" liest, liest eine Aussage über den geprüften Bereich, keine über den Bestand. Der Rot-Beweis der Proben ist darum Mutation
   der heutigen Dateien, nicht Historie. Die Struktur hat sich schon einmal bewährt: eine erste Fassung suchte die templateJws auf oberster Ebene, der echte Bestand hat sie als
   „nicht messbar" zurückgewiesen — ein zweiwertiges Werkzeug hätte hier „grün" gesagt.
   GRENZE, mit Ansage: gemessen wird nur, was hier steht (drei Anker-Träger, ein Cert-Statement, vier Vorlagen-Dateien); ein weiterer Träger unter anderem Namen wäre nicht erfaßt. Merge-Commits
   werden übersprungen (sie tragen keine eigene Änderung). Ein Commit, der KEINE der Träger-Dateien berührt, ist nicht messbar-relevant und wird nicht gelesen.

   AUFRUF
     node tools/anker-und-zertifikate-pruefen.js --refs < stdin            pre-push (jeder Commit des Push-Bereichs gegen seinen Vorgänger)
     node tools/anker-und-zertifikate-pruefen.js --bereich A..B            beliebiger Bereich
     node tools/anker-und-zertifikate-pruefen.js --arbeitsstand [--wurzel <pfad>] [--kanon <ref>]
        die Commits seit dem Kanon PLUS der Arbeitsbaum gegen HEAD — Frühwarnung aus tools/landung-vorbereiten.js, dort sieht man den ungecommitteten Stand
   ══════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { statementEnde } = require('./geruest-waechter-pruefen.js');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const KANON = 'origin/u2-kanon';

const ANKER_TRAEGER = Object.freeze([
  { datei: 'vivodepot.html', name: 'TRUST_AUTHORITY_PUBLIC_JWK' },
  { datei: 'vivodepot-lesen.html', name: 'TRUST_AUTHORITY_PUBLIC_JWK' },
  { datei: 'vivodepot-vc-issuer.html', name: 'VIVODEPOT_KERN_TRUST_AUTHORITY_PUBLIC_JWK' },
]);
const CERTS = Object.freeze({ datei: 'vivodepot.html', name: 'STANDARD_VORLAGEN_CERTS' });
const VORLAGEN_NAMEN = Object.freeze(['patientenverfuegung', 'vorsorgevollmacht', 'betreuungsverfuegung', 'organspende']);
const VORLAGEN = Object.freeze(VORLAGEN_NAMEN.map((n) => 'tools/dokument-module/vivodepot-standardvorlage-' + n + '.json'));   // je Datei: standardVorlagen.<name>.templateJws
const RELEVANTE_DATEIEN = Object.freeze([...new Set([...ANKER_TRAEGER.map((t) => t.datei), CERTS.datei, ...VORLAGEN])]);

class NichtMessbar extends Error {}

/* ── Lesen der Werte aus einem Dateitext ────────────────────────────────────────────────────────────────────────────────────────────── */

/** Die rechte Seite des Statements `const NAME = …;` (ohne Semikolon). */
function statementWert(text, name, datei) {
  const re = new RegExp('^[ \\t]*(?:const|let|var)[ \\t]+' + name + '[ \\t]*=', 'gm');
  const treffer = [...text.matchAll(re)];
  if (treffer.length !== 1) throw new NichtMessbar(datei + ': ' + name + ' steht ' + treffer.length + '× da (erwartet genau 1)');
  const start = treffer[0].index + treffer[0][0].length;
  const ende = statementEnde(text, start);
  if (ende < 0) throw new NichtMessbar(datei + ': Ende des Statements ' + name + ' nicht gefunden');
  return text.slice(start, ende - 1);
}
function auswerten(rhs, was) {
  try { return vm.runInNewContext('(' + rhs + ')', Object.create(null), { timeout: 2000 }); }
  catch (e) { throw new NichtMessbar(was + ': der Wert ist kein lesbares Literal (' + e.message.split('\n')[0] + ')'); }
}
function schluesselIdentitaet(jwk, was, mitKid) {
  if (!jwk || typeof jwk !== 'object') throw new NichtMessbar(was + ': kein Schlüsselobjekt');
  const felder = mitKid ? ['kty', 'crv', 'x', 'kid'] : ['kty', 'crv', 'x'];
  for (const f of felder) if (typeof jwk[f] !== 'string' || !jwk[f]) throw new NichtMessbar(was + ': Feld ' + f + ' fehlt');
  return JSON.stringify(Object.fromEntries(felder.map((f) => [f, jwk[f]])));
}
function ankerIdentitaet(text, traeger) {
  return schluesselIdentitaet(auswerten(statementWert(text, traeger.name, traeger.datei), traeger.datei + ' ' + traeger.name), traeger.datei + ' ' + traeger.name, true);
}
/** Certs als Wert und der Treuhand-Public aus jedem Cert-Payload (kompaktes JWS: header.payload.signatur, base64url). */
function certsLesen(text) {
  const obj = auswerten(statementWert(text, CERTS.name, CERTS.datei), CERTS.datei + ' ' + CERTS.name);
  const namen = Object.keys(obj || {}).sort();
  if (!namen.length) throw new NichtMessbar(CERTS.name + ': enthält keine Certs');
  const treuhand = {};
  for (const n of namen) {
    const teile = typeof obj[n] === 'string' ? obj[n].split('.') : [];
    if (teile.length !== 3) throw new NichtMessbar(CERTS.name + '.' + n + ': kein kompaktes JWS');
    let payload;
    try { payload = JSON.parse(Buffer.from(teile[1], 'base64url').toString('utf8')); }
    catch (_) { throw new NichtMessbar(CERTS.name + '.' + n + ': Payload nicht lesbar'); }
    treuhand[n] = schluesselIdentitaet(payload && payload.credentialSubject && payload.credentialSubject.publicKeyJwk, CERTS.name + '.' + n + ' publicKeyJwk', false);
  }
  return { certs: JSON.stringify(Object.fromEntries(namen.map((n) => [n, obj[n]]))), treuhand: JSON.stringify(treuhand) };
}
function templateJwsLesen(text, datei) {
  const name = VORLAGEN_NAMEN[VORLAGEN.indexOf(datei)];
  let j;
  try { j = JSON.parse(text); } catch (_) { throw new NichtMessbar(datei + ': kein JSON'); }
  const jws = j && j.standardVorlagen && j.standardVorlagen[name] && j.standardVorlagen[name].templateJws;
  if (typeof jws !== 'string' || !jws) throw new NichtMessbar(datei + ': standardVorlagen.' + name + '.templateJws fehlt');
  return jws;
}

/** Der Stand EINES Commits (oder des Arbeitsbaums): `lese(datei)` liefert den Text oder null. Gelesen wird nur, was dieser Vergleich braucht. */
function standLesen(lese, dateien) {
  const hol = (datei) => { const t = lese(datei); if (t == null) throw new NichtMessbar(datei + ': in diesem Stand nicht vorhanden'); return t; };
  const s = { anker: {}, certs: null, treuhand: null, templates: {} };
  for (const t of ANKER_TRAEGER) if (dateien.has(t.datei)) s.anker[t.datei] = ankerIdentitaet(hol(t.datei), t);
  if (dateien.has(CERTS.datei)) Object.assign(s, certsLesen(hol(CERTS.datei)));
  for (const v of VORLAGEN) if (dateien.has(v)) s.templates[v] = templateJwsLesen(hol(v), v);
  return s;
}

/* ── Das Urteil, rein ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** `vor`/`nach`: Stände wie von `standLesen` (vollständig). Liefert die Verstöße als Text. */
function urteil(vor, nach) {
  const verstoesse = [];
  const geaendert = ANKER_TRAEGER.filter((t) => vor.anker[t.datei] !== nach.anker[t.datei]);
  if (geaendert.length) {
    const wo = geaendert.map((t) => t.datei + ' (' + t.name + ')').join(', ');
    if (vor.certs === nach.certs) verstoesse.push('der Anker ändert sich in ' + wo + ', STANDARD_VORLAGEN_CERTS bleiben unverändert — ein Zwischenstand, in dem die ausgelieferten Certs den neuen Anker nicht bestehen (Spezifikation 21.11).');
    const verschieden = new Set(ANKER_TRAEGER.map((t) => nach.anker[t.datei]));
    if (verschieden.size > 1) {
      verstoesse.push('nach diesem Commit tragen die drei Anker-Träger NICHT denselben Anker (' + ANKER_TRAEGER.map((t) => t.datei + ': ' + (JSON.parse(nach.anker[t.datei]).kid)).join('; ') + ') — zwei ausgelieferte Artefakte mit verschiedenen Ankern.');
    }
  }
  if (vor.treuhand !== nach.treuhand) {
    const gleich = VORLAGEN.filter((v) => vor.templates[v] === nach.templates[v]);
    if (gleich.length) verstoesse.push('der Treuhand-Public in den Certs ändert sich, ' + gleich.length + ' von ' + VORLAGEN.length + ' templateJws nicht (' + gleich.map((v) => VORLAGEN_NAMEN[VORLAGEN.indexOf(v)]).join(', ')
      + ') — die Vorlagen werden nicht mehr gerendert (U2-ADR-039). Neu signieren: tools/basistemplate-neu-signieren.js.');
  }
  return verstoesse;
}

/* ── Über Commits ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

function git(args, cwd = REPO) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
const istVorfahr = (a, b, cwd) => { try { git(['merge-base', '--is-ancestor', a, b], cwd); return true; } catch (_) { return false; } };
/** Wie im Zuschnitt-Wächter: der Remote-Stand, wenn er Vorfahr ist (normaler Push), sonst der gemeinsame Vorfahr mit dem Kanon (neuer Zweig, nach einem Rebase). */
function basisFuer(lokalSha, remoteSha, cwd = REPO) {
  if (!/^0+$/.test(remoteSha) && istVorfahr(remoteSha, lokalSha, cwd)) return remoteSha;
  return git(['merge-base', lokalSha, KANON], cwd).trim();
}
const leserAus = (rev, cwd) => (datei) => { try { return git(['show', rev + ':' + datei], cwd); } catch (_) { return null; } };
const leserArbeitsbaum = (cwd) => (datei) => { const p = path.join(cwd, datei); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
function geaenderteDateien(von, bis, cwd) {
  const args = bis ? ['diff', '--name-only', von, bis] : ['diff', '--name-only', von];
  const menge = new Set(git([...args, '--', ...RELEVANTE_DATEIEN], cwd).split('\n').filter(Boolean));
  return menge;
}

/** Ein Schritt: `vor` → `nach` (Commit-Hash oder null = Arbeitsbaum). Liefert { uebersprungen } | { verstoesse } | { nichtMessbar }. */
function schrittPruefen(vor, nach, cwd) {
  const beruehrt = geaenderteDateien(vor, nach, cwd);
  if (!beruehrt.size) return { uebersprungen: true };
  // Ein Vergleich braucht BEIDE Seiten vollständig für die Träger, die dieser Schritt berührt — und für alle Träger, sobald ein Anker sich ändern könnte.
  const braucht = new Set(beruehrt);
  if (ANKER_TRAEGER.some((t) => beruehrt.has(t.datei))) for (const t of ANKER_TRAEGER) braucht.add(t.datei);
  if (beruehrt.has(CERTS.datei)) for (const v of VORLAGEN) braucht.add(v);
  if (VORLAGEN.some((v) => beruehrt.has(v))) braucht.add(CERTS.datei);
  try {
    const a = standLesen(leserAus(vor, cwd), braucht);
    const b = standLesen(nach ? leserAus(nach, cwd) : leserArbeitsbaum(cwd), braucht);
    // Träger, die nicht berührt wurden, stehen in beiden Ständen gleich da: für den Vergleich gleich behandeln.
    for (const t of ANKER_TRAEGER) if (!(t.datei in a.anker)) { a.anker[t.datei] = b.anker[t.datei] = null; }
    if (a.certs == null) { a.certs = b.certs = ''; a.treuhand = b.treuhand = ''; }
    for (const v of VORLAGEN) if (!(v in a.templates)) { a.templates[v] = b.templates[v] = ''; }
    return { verstoesse: urteil(a, b) };
  } catch (e) {
    if (e instanceof NichtMessbar) return { nichtMessbar: e.message };
    throw e;
  }
}

/** Jeder Commit von `basis` bis `spitze` (ohne Merges) gegen seinen ersten Vorgänger. */
function bereichPruefen(basis, spitze, cwd = REPO) {
  const commits = git(['rev-list', '--reverse', '--no-merges', basis + '..' + spitze], cwd).split('\n').filter(Boolean);
  const funde = [];
  let gelesen = 0;
  for (const c of commits) {
    const r = schrittPruefen(c + '^', c, cwd);
    if (r.uebersprungen) continue;
    gelesen += 1;
    if (r.nichtMessbar) funde.push({ commit: c, art: 'nicht-messbar', text: r.nichtMessbar });
    else for (const v of r.verstoesse) funde.push({ commit: c, art: 'verletzt', text: v });
  }
  return { commits: commits.length, gelesen, funde };
}
function arbeitsstandPruefen(cwd = REPO, kanon = KANON) {
  const basis = git(['merge-base', 'HEAD', kanon], cwd).trim();
  const b = bereichPruefen(basis, 'HEAD', cwd);
  const r = schrittPruefen('HEAD', null, cwd);
  if (!r.uebersprungen) {
    b.gelesen += 1;
    if (r.nichtMessbar) b.funde.push({ commit: 'Arbeitsstand', art: 'nicht-messbar', text: r.nichtMessbar });
    else for (const v of r.verstoesse) b.funde.push({ commit: 'Arbeitsstand', art: 'verletzt', text: v });
  }
  return b;
}

function melden(erg, etikett) {
  const kurz = (c) => (/^[0-9a-f]{40}$/.test(c) ? c.slice(0, 8) : c);
  if (!erg.funde.length) { console.log('[anker-und-zertifikate] grün — ' + etikett + ': ' + erg.commits + ' Commit(s), ' + erg.gelesen + ' mit Anker, Certs oder Vorlagen-Signaturen gemessen.'); return 0; }
  const nm = erg.funde.some((f) => f.art === 'nicht-messbar');
  console.error('[anker-und-zertifikate] ROT — ' + etikett + ': ' + erg.funde.length + ' Fund(e)' + (nm ? ' (davon NICHT MESSBAR)' : '') + ':');
  for (const f of erg.funde) console.error('  ' + kurz(f.commit) + '  ' + (f.art === 'nicht-messbar' ? 'NICHT MESSBAR: ' : '') + f.text);
  console.error('  Anker, Certs und die vier templateJws gehören in EINEN Commit zusammen (Spezifikation 21.11); ein gepushter Zwischenstand ist nicht mehr einzufangen.');
  return 1;
}

function main(argv) {
  const arg = (n) => { const k = argv.indexOf(n); return k >= 0 ? argv[k + 1] : null; };
  if (argv.includes('--refs')) {
    const roh = fs.readFileSync(0, 'utf8').trim();
    if (!roh) { console.log('[anker-und-zertifikate] nichts zu pushen'); return 0; }
    let rot = 0;
    for (const zeile of roh.split('\n').filter(Boolean)) {
      const [lokalRef, lokalSha, , remoteSha] = zeile.split(/\s+/);
      if (/^0+$/.test(lokalSha)) continue;
      try { rot |= melden(bereichPruefen(basisFuer(lokalSha, remoteSha), lokalSha), lokalRef); }
      catch (e) { console.error('[anker-und-zertifikate] ROT — NICHT MESSBAR für ' + lokalRef + ': ' + e.message.split('\n')[0]); rot = 1; }
    }
    return rot;
  }
  if (argv.includes('--arbeitsstand')) {
    const wurzel = arg('--wurzel') ? path.resolve(arg('--wurzel')) : REPO;
    try { return melden(arbeitsstandPruefen(wurzel, arg('--kanon') || KANON), 'Arbeitsstand'); }
    catch (e) { console.error('[anker-und-zertifikate] ROT — NICHT MESSBAR: ' + e.message.split('\n')[0]); return 1; }
  }
  if (argv.includes('--bereich')) {
    const [a, b] = arg('--bereich').split('..');
    const wurzel = arg('--wurzel') ? path.resolve(arg('--wurzel')) : REPO;
    try { return melden(bereichPruefen(git(['merge-base', a, b || 'HEAD'], wurzel).trim(), b || 'HEAD', wurzel), arg('--bereich')); }
    catch (e) { console.error('[anker-und-zertifikate] ROT — NICHT MESSBAR: ' + e.message.split('\n')[0]); return 1; }
  }
  console.error('Aufruf: node tools/anker-und-zertifikate-pruefen.js --refs < stdin | --bereich A..B | --arbeitsstand [--wurzel <pfad>] [--kanon <ref>]');
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, urteil, standLesen, ankerIdentitaet, certsLesen, templateJwsLesen, statementWert, bereichPruefen, arbeitsstandPruefen, schrittPruefen, basisFuer, NichtMessbar, ANKER_TRAEGER, CERTS, VORLAGEN, RELEVANTE_DATEIEN };
