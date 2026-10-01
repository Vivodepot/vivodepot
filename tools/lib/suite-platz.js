'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Suite-Platz — globale Plätze für schwere Läufe über ALLE Arbeitsbäume (27.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Die Regel „vor dem Start die laufenden Suiten zählen, bei zwei nicht starten“
   ist ein Wettlauf: zwei Sitzungen zählen im selben Augenblick je eins und starten beide.
   Am 27.09.2026 liefen so drei Suiten gleichzeitig, eine brach ab, obwohl ihre Sitzung
   korrekt gezählt hatte. Zählen ist keine Sperre.

   WAS ES TUT. Ein schwerer Lauf (Commit mit Suite, Push, `npm test`, die Vorbereitung einer
   Landung) holt ATOMAR einen von N Plätzen (Vorgabe 2, `VD_SUITE_PLAETZE`). Ein Platz ist eine
   Datei `platz-<k>.lock` im gemeinsamen Verzeichnis (Vorgabe `~/.cache/vivodepot-suite-platz/`,
   `VD_SUITE_PLATZ_DIR`), angelegt mit dem `wx`-Flag: zwei Prozesse können denselben Platz nicht
   beide bekommen, das Betriebssystem entscheidet.

   VERERBUNG. Wer einen Platz hält, setzt `VD_SUITE_PLATZ_GEHALTEN` in seiner Umgebung. Jeder
   Kindprozess sieht die Variable und holt KEINEN zweiten Platz. Ohne das sperrte sich ein Lauf
   selbst aus.

   VERWAISTE PLÄTZE (Halter tot: abgebrochene Sitzung, kill -9) werden beim nächsten Versuch
   geräumt, einmal je Platz, und gemeldet.

   WARTESCHLANGE (28.09.2026, Befund SUITE-PLATZ-OHNE-WARTESCHLANGE). Ohne Reihenfolge gewann
   jeder freie Platz, wer im Augenblick des Freiwerdens zufällig zugriff. Eine Sitzung, die
   nahtlos von landung-vorbereiten in den pre-commit ging, holte ihren Platz sofort neu; eine
   andere wartete zweimal 600 s und brach ab. Jetzt zieht, wer warten muss, ein TICKET (Datei in
   `tickets/`, Name = Zeitstempel + PID, mit `wx`). Ein freier Platz geht an die ältesten lebenden
   Tickets: wer auf Rang r steht (0 = ältestes), darf nur zugreifen, wenn mehr als r Plätze frei
   sind. Wer ohne Ticket kommt, steht HINTER allen Tickets — auch der Folgeschritt derselben
   Sitzung. Tickets toter Prozesse zählen nicht und werden geräumt. Kinder mit geerbtem Platz
   ziehen kein Ticket, sie gehören zum laufenden Lauf.

   VORRANG (28.09.2026, Befund PUSH-WARTET-HINTER-VORBEREITUNG). Reine Ankunftsreihenfolge ließ die
   Vorbereitungen späterer Fassungen die Plätze halten, während der Push der früheren wartete — und
   jede dieser Vorbereitungen verfällt mit der früheren Landung ohnehin. Darum zwei Stufen: ein
   Push (Name `pre-push`) steht vor allem anderen, innerhalb einer Stufe gilt die Ankunft. Ein
   laufender Lauf wird nicht verdrängt; der Vorrang wirkt beim nächsten frei werdenden Platz.

   PUSH EXKLUSIV (28.09.2026, Befund ZWEI-PUSHES-PARALLEL). Zweimal an einem Abend liefen zwei pre-push gleichzeitig,
   beide mit Wort; einer kommt am Ende non-fast-forward zurück, nach dem teuersten Teil. Ein Push nimmt darum keinen
   Platz, solange ein anderer Push einen hält — auch wenn einer frei ist; er wartet mit seinem Ticket. Solange er so
   wartet, hält sein Ticket anderen Läufen den freien Platz nicht zu (er könnte ihn ohnehin nicht nehmen). Wer danach
   drankommt, prüft im Hook einmal live, ob der Kanon noch sein Vorfahr ist.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const UMGEBUNG_GEHALTEN = 'VD_SUITE_PLATZ_GEHALTEN';

function verzeichnis(env = process.env) {
  return env.VD_SUITE_PLATZ_DIR || path.join(os.homedir(), '.cache', 'vivodepot-suite-platz');
}

function anzahl(env = process.env) {
  const n = Number(env.VD_SUITE_PLAETZE);
  return Number.isInteger(n) && n >= 1 ? n : 2;
}

function prozessLebt(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function lesen(pfad) {
  try { return JSON.parse(fs.readFileSync(pfad, 'utf8')); } catch (_) { return null; }
}

function platzPfad(dir, k) { return path.join(dir, 'platz-' + k + '.lock'); }
function ticketVerzeichnis(dir) { return path.join(dir, 'tickets'); }
const VORRANG = Object.freeze({ 'pre-push': 0 });
const EXKLUSIV = 'pre-push';
function vorrang(name) { return Object.prototype.hasOwnProperty.call(VORRANG, name) ? VORRANG[name] : 1; }

/** Die lebenden Tickets, älteste zuerst; Tickets toter Prozesse werden geräumt. */
function wartende({ dir = verzeichnis() } = {}) {
  const tv = ticketVerzeichnis(dir);
  let namen = [];
  try { namen = fs.readdirSync(tv).filter((d) => d.endsWith('.ticket')).sort(); } catch (_) { return []; }
  const liste = [];
  for (const d of namen) {
    const pfad = path.join(tv, d);
    const e = lesen(pfad);
    if (e && prozessLebt(e.pid)) liste.push({ ...e, pfad, stufe: vorrang(e.name) });
    else { try { fs.unlinkSync(pfad); } catch (_) { /* schon weg */ } }
  }
  // Stufe zuerst (Push vor allem anderen), innerhalb der Stufe die Ankunft (Dateiname, sortiert).
  return liste.sort((a, b) => a.stufe - b.stufe);
}

let ticketZaehler = 0;
/** Zieht ein Ticket: der Name ordnet nach Zeit (feste Breite), dann PID und Zähler. */
function ticketZiehen({ name, pid = process.pid, dir = verzeichnis(), cwd = process.cwd() } = {}) {
  const tv = ticketVerzeichnis(dir);
  fs.mkdirSync(tv, { recursive: true });
  for (;;) {
    const pfad = path.join(tv, String(Date.now()).padStart(15, '0') + '-' + String(pid).padStart(10, '0')
      + '-' + String(ticketZaehler++).padStart(4, '0') + '.ticket');
    try {
      const fd = fs.openSync(pfad, 'wx');
      fs.writeFileSync(fd, JSON.stringify({ pid, name, cwd, gezogenAm: new Date().toISOString() }));
      fs.closeSync(fd);
      return pfad;
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
}

function ticketAbgeben(pfad) { if (pfad) { try { fs.unlinkSync(pfad); } catch (_) { /* schon weg */ } } }

/** Die lebenden Halter aller Plätze (für Meldungen und --anzeigen). */
function halter({ dir = verzeichnis(), n = anzahl() } = {}) {
  const liste = [];
  for (let k = 1; k <= n; k++) {
    const e = lesen(platzPfad(dir, k));
    if (e && prozessLebt(e.pid)) liste.push({ platz: k, ...e });
  }
  return liste;
}

/**
 * Versucht einmal, einen Platz zu holen. Ergebnis:
 *   { geholt: true, geerbt: true }                   — ein Elternprozess hält schon einen Platz
 *   { geholt: true, platz, pfad, geraeumt? }         — Platz geholt
 *   { geholt: false, halter, wartende }              — alle Plätze lebend belegt, oder die freien
 *                                                      stehen älteren Tickets zu
 * `ticket`: der Pfad des eigenen Tickets (aus ticketZiehen), sonst steht der Aufrufer hinter allen.
 */
function platzHolen({ name, pid = process.pid, dir = verzeichnis(), n = anzahl(), env = process.env, cwd = process.cwd(), ticket = null } = {}) {
  if (env[UMGEBUNG_GEHALTEN]) return { geholt: true, geerbt: true, von: env[UMGEBUNG_GEHALTEN] };
  fs.mkdirSync(dir, { recursive: true });
  const pushHaelt = halter({ dir, n }).some((h) => h.name === EXKLUSIV && h.pid !== pid);
  if (name === EXKLUSIV && pushHaelt) return { geholt: false, halter: halter({ dir, n }), wartende: wartende({ dir }), exklusiv: true };
  // Ein Push, der hinter einem laufenden Push wartet, kann einen freien Platz nicht nehmen — er hält ihn niemandem zu.
  const schlange = wartende({ dir }).filter((t) => !(pushHaelt && t.name === EXKLUSIV) || t.pfad === ticket);
  const eigenerRang = ticket ? schlange.findIndex((t) => t.pfad === ticket) : -1;
  // Ohne Ticket: hinter allen derselben oder einer höheren Stufe — ein Push also vor wartenden Vorbereitungen.
  const rang = eigenerRang >= 0 ? eigenerRang : schlange.filter((t) => t.stufe <= vorrang(name)).length;
  if (rang > 0 && n - halter({ dir, n }).length <= rang) {
    return { geholt: false, halter: halter({ dir, n }), wartende: schlange };
  }
  const geraeumt = [];
  for (let k = 1; k <= n; k++) {
    const pfad = platzPfad(dir, k);
    for (let versuch = 0; versuch < 2; versuch++) {
      let fd;
      try {
        fd = fs.openSync(pfad, 'wx');
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        const inhalt = lesen(pfad);
        if (inhalt && prozessLebt(inhalt.pid)) break;          // lebend belegt: nächster Platz
        try { fs.unlinkSync(pfad); } catch (_) { /* schon weg */ }
        geraeumt.push({ platz: k, ...(inhalt || { pid: null, name: 'unlesbar' }) });
        continue;                                               // einmal neu versuchen
      }
      const eintrag = { pid, name, cwd, host: os.hostname(), gestartetAm: new Date().toISOString() };
      fs.writeFileSync(fd, JSON.stringify(eintrag));
      fs.closeSync(fd);
      return { geholt: true, platz: k, pfad, eintrag, ...(geraeumt.length ? { geraeumt } : {}) };
    }
  }
  return { geholt: false, halter: halter({ dir, n }), wartende: schlange, ...(geraeumt.length ? { geraeumt } : {}) };
}

/** Wartet höchstens `wartenS` Sekunden auf einen Platz (Pause `pauseS`), ohne Ereignisschleife. */
function platzHolenMitWarten(opts = {}, { wartenS = 0, pauseS = 10, melden = () => {} } = {}) {
  const ende = Date.now() + wartenS * 1000;
  let r = platzHolen(opts);
  if (r.geholt || wartenS <= 0) return r;
  // Wer warten muss, zieht ein Ticket und reiht sich ein; abgegeben wird es in jedem Fall.
  const ticket = ticketZiehen({ name: opts.name, pid: opts.pid, dir: opts.dir, cwd: opts.cwd });
  const abgeben = () => ticketAbgeben(ticket);
  process.once('exit', abgeben);
  try {
    melden(r);
    while (Date.now() < ende) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pauseS * 1000);
      r = platzHolen({ ...opts, ticket });
      if (r.geholt) return r;
    }
    return r;
  } finally { abgeben(); process.removeListener('exit', abgeben); }
}

/** Gibt nur die EIGENEN Plätze frei (PID-Abgleich) — nie den eines anderen. */
function platzFreigeben({ pid = process.pid, dir = verzeichnis(), n = anzahl() } = {}) {
  let frei = 0;
  for (let k = 1; k <= n; k++) {
    const pfad = platzPfad(dir, k);
    const e = lesen(pfad);
    if (e && e.pid === pid) { try { fs.unlinkSync(pfad); frei += 1; } catch (_) { /* schon weg */ } }
  }
  return frei;
}

/* EIGENEN LAUF BEENDEN (28.09.2026). Anlass: ein Lauf wurde per SIGTERM beendet, weil eine andere Sitzung nach einem
   Namensmuster killte, ohne die cwd zu prüfen. Getroffen werden hier nur Halter und Wartende, deren Eintrag DIESE cwd auf
   DIESEM Rechner nennt — und von ihnen nur der Prozess selbst mit seinen Nachkommen. Nie ein Name, nie eine Gruppe (eine
   Prozessgruppe kann bei einer Shell ohne Jobsteuerung den aufrufenden Elternprozess einschließen), nie ein Vorfahr des
   Aufrufers (wer --beenden aus einem Hook heraus ruft, beendet sich nicht selbst). */
function eigeneLaeufe({ cwd = process.cwd(), dir = verzeichnis(), n = anzahl(), host = os.hostname() } = {}) {
  const ziel = echterPfad(cwd);
  const eigen = (e) => e && e.host === host && echterPfad(e.cwd || '') === ziel;
  const passt = (e) => eigen(e) && prozessLebt(e.pid);
  const plaetze = [];
  const tot = [];   // eigene Sperren, deren Halter nicht mehr lebt (29.09.2026) — Tickets räumt wartende() schon selbst
  for (let k = 1; k <= n; k++) {
    const e = lesen(platzPfad(dir, k));
    if (passt(e)) plaetze.push({ platz: k, ...e });
    else if (eigen(e)) tot.push({ platz: k, pfad: platzPfad(dir, k), ...e });
  }
  return { plaetze, wartende: wartende({ dir }).filter(passt), tot };
}

/** Räumt eine tote eigene Sperre — nur, wenn dort noch derselbe, weiterhin tote Halter steht. */
function toteSperreRaeumen({ pfad, pid }) {
  const e = lesen(pfad);
  if (!e || e.pid !== pid || prozessLebt(pid)) return false;
  try { fs.unlinkSync(pfad); return true; } catch (_) { return false; }
}
function echterPfad(p) { try { return fs.realpathSync(p); } catch (_) { return path.resolve(p || '/'); } }

/** Nachkommen einer PID aus Zeilen „pid ppid“ (ps -A -o pid=,ppid=), tiefste zuerst; die PID selbst zuletzt. */
function prozessBaum(pid, psText) {
  const kinder = new Map();
  for (const z of String(psText).split('\n')) {
    const [p, pp] = z.trim().split(/\s+/).map(Number);
    if (Number.isInteger(p) && Number.isInteger(pp)) { if (!kinder.has(pp)) kinder.set(pp, []); kinder.get(pp).push(p); }
  }
  const aus = [];
  const gehe = (x, tiefe) => { if (tiefe > 64) return; for (const c of kinder.get(x) || []) gehe(c, tiefe + 1); aus.push(x); };
  gehe(pid, 0);
  return aus;
}
/** Vorfahren einer PID (Eltern, Großeltern …) aus denselben Zeilen. */
function vorfahren(pid, psText) {
  const eltern = new Map();
  for (const z of String(psText).split('\n')) {
    const [p, pp] = z.trim().split(/\s+/).map(Number);
    if (Number.isInteger(p) && Number.isInteger(pp)) eltern.set(p, pp);
  }
  const aus = new Set();
  for (let x = eltern.get(pid); x && x > 1 && !aus.has(x); x = eltern.get(x)) aus.add(x);
  return aus;
}

function meldungBelegt(r) {
  if (r && r.exklusiv) {
    const p = (r.halter || []).find((h) => h.name === EXKLUSIV);
    return 'ein anderer Push läuft' + (p ? ' (PID ' + p.pid + ', ' + p.cwd + ', seit ' + p.gestartetAm + ')' : '')
      + ' — ein Push wartet exklusiv, auch bei freiem Platz; danach prüft er, ob der Kanon noch sein Vorfahr ist.';
  }
  const wer = (r.halter || []).map((h) => `Platz ${h.platz}: ${h.name} (PID ${h.pid}, ${h.cwd || '?'}, seit ${h.gestartetAm})`);
  const vor = (r.wartende || []).length ? ` · vor dir warten ${r.wartende.length}: ` + r.wartende.map((t) => `${t.name} (${t.cwd || '?'})`).join(', ') : '';
  return 'alle Suite-Plätze belegt — ' + (wer.join(' · ') || 'Halter unlesbar') + vor
    + '. Warten, bis einer frei wird; nicht mit --no-verify umgehen (die Plätze schützen die Maschine, nicht den Code).';
}

module.exports = {
  UMGEBUNG_GEHALTEN, verzeichnis, anzahl, prozessLebt, halter,
  platzHolen, platzHolenMitWarten, platzFreigeben, meldungBelegt,
  wartende, ticketZiehen, ticketAbgeben, vorrang, EXKLUSIV,
  eigeneLaeufe, toteSperreRaeumen, prozessBaum, vorfahren,
};
