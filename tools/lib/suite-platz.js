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
   selbst aus. Seit 24.10.2026 trägt auch die ppid-Kette (VERERBUNG ÜBER DIE PPID-KETTE, bei geerbterPlatz).

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

   VORRANG-MARKE (01.10.2026). Festgelegt wird, welcher Arbeitsbaum mit seiner Landung dran ist; ohne Mechanismus
   nahmen andere Läufe ihm die Plätze, und ein fertiger Push wartete. Die Marke ist die Datei `reihe` im Platz-Verzeichnis:
   `{ "baum": <absoluter Pfad>, "gesetztAm": <ISO> }`, geschrieben vom Kommandozeilenwerkzeug der Plätze (`--reihe <baum>`). Solange sie
   gilt, nimmt der markierte Baum einen freien Platz vor allen Tickets. Jeder andere Lauf bekommt nur dann einen Platz,
   wenn er `pre-commit` heißt, kein anderer nicht markierter Lauf schon einen hält und — solange der markierte Baum noch
   keinen hält — danach einer für ihn frei bleibt. Laufende Läufe werden nicht verdrängt.
   Die Marke VERFÄLLT nach 90 Minuten und wenn der markierte Baum nicht mehr existiert: eine liegengebliebene Marke legte
   sonst alle anderen lahm. Ohne gültige Marke gilt das Verhalten davor, unverändert.

   ZUSATZPLATZ NACH ANKUNFT UND ART (01.10.2026, Befund SUITE-PLATZ-TICKET-REIHENFOLGE). Bei gültiger Marke las die
   Vergabe die Tickets nicht: den einen Platz neben dem markierten Baum nahm der pre-commit, der zuerst nachsah, und ein
   Lauf mit anderem Namen bekam ihn nie — ein älteres Ticket wartete über Stunden, weil die Marke mehrfach neu gesetzt
   wurde. Jetzt geht der Zusatzplatz an das ÄLTESTE Ticket außerhalb des markierten Baums, gleich welcher Name; wer ohne
   Ticket kommt, steht dahinter. Getrennt wird nach ART: ein Browserlauf (`artVon` = 'e2e') bekommt ihn nicht, solange
   der andere Platz selbst einen Browserlauf hält — parallele Browserläufe ließen Journey-Proben fallen. Er wartet dann
   auf das Ende jenes Laufs, nicht auf die Marke; eine Höchstdauer braucht es darum nicht. Er hält den Zusatzplatz dabei
   niemandem zu. Der Push bleibt exklusiv (oben).

   PLATZART AIR (04.10.2026). Ein Lauf auf einem entfernten Prüfrechner (ein Commit, der dort statt hier geprüft wird)
   belegt hier keinen Suite-Platz, aber einen AIR-PLATZ: Unterverzeichnis `air/` desselben
   Verzeichnisses, `VD_AIR_PLAETZE` (Vorgabe 1) — der Prüfrechner fährt einen Lauf zur Zeit. Wer warten muss, zieht ein Ticket in
   `air/tickets/` wie oben. `--anzeigen` nennt beide Arten getrennt.

   AIR-PLATZ ALS DRITTER PLATZ (16.10.2026). Bis hierher galt „ein Platz je Sitzung über beide Arten“: hielt eine Sitzung
   (dieselbe cwd auf diesem Rechner) einen Suite-Platz, bekam sie keinen Air-Platz, und umgekehrt. Das ließ den Prüfrechner
   leer stehen, während hier ein Push oder eine Landung lief, deren Node-Suite und Chromium-Hauptlauf er hätte tragen können.
   Jetzt zählt der Air-Platz unabhängig: eine Sitzung darf einen Suite-Platz UND den Air-Platz halten (z. B. pre-push: Rest
   hier, Hauptlauf dort, parallel). Unverändert: VD_SUITE_PLAETZE und VD_AIR_PLAETZE, die Lastgrenze vor jedem Suite-Platz
   (der Air-Platz hing nie an der Last hier — dort rechnet der Prüfrechner), Warteschlange, Vorrang, Push exklusiv und
   Vorrang-Marke. Mehr als einen Suite-Platz bekommt ein Lauf weiterhin nicht: Kinder erben ihn (VERERBUNG oben).
   LEERLAUF-WARNUNG (16.10.2026): `--anzeigen` warnt, wenn der Air-Platz frei ist, während hier Läufe mit auslagerbarem Anteil
   einen Suite-Platz halten oder warten (AUSLAGERBAR unten) — wer die Plätze nachts liest, sieht den Leerlauf.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const UMGEBUNG_GEHALTEN = 'VD_SUITE_PLATZ_GEHALTEN';

/* KEIN TESTLÄUFER IM ECHTEN PLATZ (02.10.2026, Befund PLATZ-LECK-HOOK-TESTS, HOCH). Tests fahren Hook-Ausschnitte als
   Shell-Skript mit geerbter Umgebung. Einzeln gestartet (ohne VD_SUITE_PLATZ_GEHALTEN) holte so ein Ausschnitt seinen Platz in
   der ECHTEN Schlange und stand dort als Wartender vor echten Pushes (Belege: pre-push-stdin-erschoepfung 02.10. 00:38,
   pre-push-bestand-waechter-erneut 02.10.). Darum: läuft der Prozess unter einem Testläufer — erkennbar an einem Merkmal, das
   der Läufer seinen Kindern vererbt —, gibt es den echten Pfad NICHT, auch nicht mit geerbtem Platz. Ein Test nennt sein
   eigenes VD_SUITE_PLATZ_DIR (tests/helfer/platz-isoliert.js). Wer einen geerbten Platz hat, braucht kein Verzeichnis:
   platzHolen kehrt dann vorher zurück. Die Merkmale: NODE_TEST_CONTEXT (node --test), TEST_WORKER_INDEX und
   TEST_PARALLEL_INDEX (Playwright-Arbeiter, playwright/lib/worker/workerProcessEntry.js), JEST_WORKER_ID, VITEST, und
   VD_HOOK_SPERRE_JE_PID (tests/hook-sperre-testumgebung.js, in jedem Testprozess von npm test). Ein echter Hook setzt keines. */
const TESTLAEUFER_MERKMALE = Object.freeze(['NODE_TEST_CONTEXT', 'TEST_WORKER_INDEX', 'TEST_PARALLEL_INDEX', 'JEST_WORKER_ID',
  'VITEST', 'VD_HOOK_SPERRE_JE_PID']);
function testlaeuferMerkmale(env = process.env) {
  return TESTLAEUFER_MERKMALE.filter((k) => env[k] !== undefined && env[k] !== '');
}

function verzeichnis(env = process.env) {
  if (env.VD_SUITE_PLATZ_DIR) return env.VD_SUITE_PLATZ_DIR;
  const merkmale = testlaeuferMerkmale(env);
  if (merkmale.length) {
    throw new Error('[suite-platz] ABBRUCH: ein Testläufer (' + merkmale.join(', ') + ') ohne eigenes VD_SUITE_PLATZ_DIR '
      + 'würde die ECHTE Platz-Schlange belegen und echte Pushes blockieren. Der Test setzt sein Verzeichnis selbst '
      + '(tests/helfer/platz-isoliert.js).');
  }
  return path.join(os.homedir(), '.cache', 'vivodepot-suite-platz');
}

/* ZENTRALE PLATZZAHL (20.10.2026): bis hierher kannte die Platzzahl nur die Umgebungsvariable
   VD_SUITE_PLAETZE, und die setzte jede Sitzung selbst — eine Regel „ab jetzt ein Platz“ galt nur per Nachricht. Jetzt liegt sie
   als Datei im Platz-Verzeichnis (`plaetze.json`, { plaetze, grund, gesetztAm }), das alle Läufe teilen; sie geht der Variable vor.
   Setzen über das Kommandozeilenwerkzeug der Plätze mit `--plaetze <n> --grund "…"`. Fehlt sie oder ist sie unlesbar, gilt wie
   bisher die Variable, sonst 2. Probe: [Platzzahl zentral]. */
const PLAETZE_DATEI = 'plaetze.json';
function plaetzeZentral(dir) {
  if (!dir) return null;
  try {
    const n = JSON.parse(fs.readFileSync(path.join(dir, PLAETZE_DATEI), 'utf8')).plaetze;
    return Number.isInteger(n) && n >= 1 ? n : null;
  } catch (_) { return null; }
}
function anzahl(env = process.env, dir = null) {
  let d = dir;
  if (!d) { try { d = verzeichnis(env); } catch (_) { d = null; } }
  const zentral = plaetzeZentral(d);
  if (zentral) return zentral;
  const n = Number(env.VD_SUITE_PLAETZE);
  return Number.isInteger(n) && n >= 1 ? n : 2;
}
function plaetzeSetzen({ dir = verzeichnis(), plaetze, grund, jetzt = new Date() } = {}) {
  if (!Number.isInteger(plaetze) || plaetze < 1) throw new Error('Platzzahl muss eine ganze Zahl ab 1 sein');
  const g = typeof grund === 'string' ? grund.trim() : '';
  if (g.length < 10) throw new Error('die Platzzahl braucht einen Grund');
  fs.mkdirSync(dir, { recursive: true });
  // Eine gesetzte Zahl der Klein-Plätze (KLEINE LÄUFE GEZÄHLT) bleibt stehen.
  let alt = {};
  try { alt = JSON.parse(fs.readFileSync(path.join(dir, PLAETZE_DATEI), 'utf8')) || {}; } catch (_) { /* keine */ }
  const klein = Number.isInteger(alt.kleinPlaetze) ? { kleinPlaetze: alt.kleinPlaetze } : {};
  fs.writeFileSync(path.join(dir, PLAETZE_DATEI), JSON.stringify({ plaetze, ...klein, grund: g, gesetztAm: jetzt.toISOString() }) + '\n');
}

/* LASTGRENZE (06.10.2026). Am 06.10.2026 lag die Last bei 86–173 (12:36–12:40, `uptime`), die Verbindung fiel aus, der
   Rechner musste aus. Die Plätze zählten nur Läufe, nicht die Last: Erzeuger, Bildaufnahmen und Proben ohne Platz und rund
   dreißig Fenster liefen daneben. Darum wartet jeder Lauf, der über diese Plätze geht (--holen), und jeder kleine Lauf
   (--klein: Erzeuger, Bildaufnahmen, gezielte Proben, ohne Platz), bis die 1-Minuten-Last unter VD_LAST_GRENZE liegt
   (Vorgabe 12). Geprüft wird nur an der ECHTEN Schlange (kein VD_SUITE_PLATZ_DIR): Proben arbeiten in eigenen
   Verzeichnissen und würden sonst an der Last der Suite hängen, die sie selbst fährt. Ein geerbter Platz wartet nicht noch
   einmal. Unter einem Testläufer ohne eigenes Verzeichnis wartet nichts: dort verweigert verzeichnis() die echte Schlange
   laut, und das darf keine Lastpause verdecken (sonst hängt diese Probe an der Last der Maschine). */
function lastGrenze(env = process.env) {
  const n = Number(env.VD_LAST_GRENZE);
  return Number.isFinite(n) && n > 0 ? n : 12;
}
/* EIGENE GRENZE FÜR VOLLE PLÄTZE (24.10.2026). Um 17:51 war Platz 1 frei, und vier pre-commits warteten bei Last
   16–17 an der Grenze 12 — mit einem laufenden vollen Lauf fällt die Last kaum unter 12, ein zweiter voller Lauf startete
   praktisch nie. Volle Plätze prüfen darum gegen VD_LAST_GRENZE_VOLL (Vorgabe 24, s. Nachtrag): zwei volle Läufe liegen bei 22–28
   (LASTREGEL 24.10.2026 03:34), unter der Meldeschwelle 30. Klein-Läufe bleiben bei VD_LAST_GRENZE (12) mit dem
   Voranschlag aus kleinStartFrei(). Wer nur VD_LAST_GRENZE ausdrücklich setzt (Proben, eine Sitzung von Hand), setzt damit
   beide Grenzen. NACHTRAG 24.10.2026: Vorgabe 24 statt 20. Gemessen macht ein voller Lauf allein 10–15 Last; unter 20 wartete
   der zweite volle Platz neben einem laufenden vollen Lauf noch zu oft. Probe: [Last·Voll]. */
function lastGrenzeVoll(env = process.env) {
  const n = Number(env.VD_LAST_GRENZE_VOLL);
  if (Number.isFinite(n) && n > 0) return n;
  return env.VD_LAST_GRENZE ? lastGrenze(env) : 24;
}
function lastAbwarten({ env = process.env, grenze = lastGrenze(env), last = () => os.loadavg()[0], wartenS = 0, pauseS = 15,
  melden = () => {}, pruefen = !env.VD_SUITE_PLATZ_DIR && !env[UMGEBUNG_GEHALTEN] && !testlaeuferMerkmale(env).length } = {}) {
  if (!pruefen) return { frei: true, geprueft: false, grenze };
  let l = last();
  if (l < grenze) return { frei: true, geprueft: true, last: l, grenze };
  melden({ last: l, grenze });
  const ende = Date.now() + wartenS * 1000;
  while (Date.now() < ende) {
    if (pauseS > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pauseS * 1000);
    l = last();
    if (l < grenze) return { frei: true, geprueft: true, last: l, grenze };
  }
  return { frei: false, geprueft: true, last: l, grenze };
}

/* PLATZART AIR (s. Kopf). */
function airVerzeichnis(dir) { return path.join(dir, 'air'); }
function anzahlAir(env = process.env) {
  const n = Number(env.VD_AIR_PLAETZE);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
function gleicheSitzung(e, cwd, host = os.hostname()) {
  return !!e && (e.host === undefined || e.host === host) && echterPfad(e.cwd || '') === echterPfad(cwd);
}

/* AUSLAGERBAR (16.10.2026, LEERLAUF-WARNUNG im Kopf). Läufe, deren schwerer Teil — Node-Suite und Chromium-Hauptlauf, die
   Menge, die der Prüfrechner gleichwertig trägt (sein Gleichwertigkeitsbeleg) — auch dort laufen könnte. Benannt nach
   den Namen, mit denen die Läufe ihren Platz holen (die beiden Git-Hooks, die Landungsvorbereitung, die
   Wache von npm test); dazu jeder Lauf, dessen Name e2e oder chromium trägt. Nicht darunter: Erzeuger und reine
   Firefox-/Cross-Läufe — die trägt der Prüfrechner nicht. Die Liste steuert nur die Warnung, keine Vergabe. */
const AUSLAGERBAR_NAMEN = Object.freeze(['pre-push', 'landung-vorbereiten', 'pre-commit', 'npm test']);
const AUSLAGERBAR_MUSTER = /e2e|chromium/i;
function auslagerbar(name) { return AUSLAGERBAR_NAMEN.includes(name) || AUSLAGERBAR_MUSTER.test(String(name || '')); }
/* WAS WIRKLICH AUSLAGERT (20.10.2026, Mitfix zu SUITE-DAUER-WAECHST): die Warnung zählte nach dem Namen und damit jeden
   landung-vorbereiten, pre-commit und npm test — auch dort, wo nichts aufs Air gehen kann. Ausgelagert wird heute: der pre-push
   (Suite und Hauptlauf), der Chromium-Hauptlauf in landung-vorbereiten nur in einem Baum, der selbst pusht (Zweig zug-… oder
   `git config --worktree vd.push u2-kanon`, a7), und Läufe mit e2e oder chromium im Namen. Die Schnellstufe des pre-commit und
   npm test lagern nichts aus. Die Liste steuert nur die Warnung, keine Vergabe. Probe:
   [Platzart Air·Leerlauf genau]. */
function pushtSelbst(cwd) {
  if (!cwd) return false;
  // Ohne GIT_*-Umgebung eines Hooks (U2-ADR-232): sonst gewänne GIT_DIR gegen die cwd des Baums.
  const env = require('./ohne-git-umgebung.js').ohneGitUmgebung(process.env);
  const git = (args) => { try { return require('node:child_process').execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000, env }).trim(); } catch (_) { return ''; } };
  return git(['symbolic-ref', '--short', '-q', 'HEAD']).startsWith('zug-') || git(['config', '--worktree', '--get', 'vd.push']) === 'u2-kanon';
}
function wirklichAuslagerbar(e, pushtSelbstFn = pushtSelbst) {
  const name = String((e && e.name) || '');
  if (name === 'pre-push' || AUSLAGERBAR_MUSTER.test(name)) return true;
  if (name === 'landung-vorbereiten') return pushtSelbstFn(e.cwd);
  return false;
}
/** Die Warnzeile, wenn der Air-Platz frei ist, während hier Läufe mit wirklich auslagerbarem Anteil einen Platz halten oder warten; sonst null. */
function airLeerlaufWarnung({ dir = verzeichnis(), env = process.env, pushtSelbstFn = pushtSelbst } = {}) {
  const ad = airVerzeichnis(dir);
  if (halter({ dir: ad, n: anzahlAir(env) }).length >= anzahlAir(env)) return null;
  const laufen = halter({ dir, n: anzahl(env) }).filter((h) => wirklichAuslagerbar(h, pushtSelbstFn)).length;
  const warten = wartende({ dir }).filter((t) => wirklichAuslagerbar(t, pushtSelbstFn)).length;
  if (laufen + warten === 0) return null;
  return 'WARNUNG: Air frei, während ' + (laufen + warten) + ' Läufe mit auslagerbarem Anteil auf dem Mac laufen/warten ('
    + laufen + ' laufen, ' + warten + ' warten).';
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
/* Die Art eines Laufs: 'e2e' für alles, was Browser fährt — der Push (E2E-Strecke), landung-vorbereiten und jeder Lauf,
   dessen Name das sagt (e2e, playwright, browser, vorschau, journey). Ein Browserlauf über die Kommandozeile trägt
   eines dieser Wörter im Namen. Alles andere: 'node'. */
const ART_E2E_NAMEN = Object.freeze(['pre-push', 'landung-vorbereiten']);
const ART_E2E_MUSTER = /e2e|playwright|browser|vorschau|journey/i;
function artVon(name) { return ART_E2E_NAMEN.includes(name) || ART_E2E_MUSTER.test(String(name || '')) ? 'e2e' : 'node'; }

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

// Ticket und Platz entstehen atomar (tools/lib/atomar-anlegen.js, Befund HOLER-PROBE-LASTWACKLER).
const { atomarAnlegen } = require('./atomar-anlegen.js');
let ticketZaehler = 0;
/** Zieht ein Ticket: der Name ordnet nach Zeit (feste Breite), dann PID und Zähler. */
function ticketZiehen({ name, pid = process.pid, dir = verzeichnis(), cwd = process.cwd(), extra = {} } = {}) {
  const tv = ticketVerzeichnis(dir);
  fs.mkdirSync(tv, { recursive: true });
  for (;;) {
    const pfad = path.join(tv, String(Date.now()).padStart(15, '0') + '-' + String(pid).padStart(10, '0')
      + '-' + String(ticketZaehler++).padStart(4, '0') + '.ticket');
    // host (02.10.2026): ohne ihn erkannte eigeneLaeufe kein Ticket als eigenes — --beenden --cwd sah Wartende nie.
    if (atomarAnlegen(pfad, JSON.stringify({ ...extra, pid, name, cwd, host: os.hostname(), gezogenAm: new Date().toISOString() }))) return pfad;
  }
}

/* PUSH IN DER PAUSE (16.10.2026, Befund PUSH-FREIGABE-ZWEITER-PREPUSH): gibt ein pre-push seinen Platz frei, während der
   eigene Prüfrechner für ihn rechnet (nach dem grünen lokalen Rest), sah die Exklusiv-Regel ihn nicht mehr — sie las nur
   gehaltene Plätze —, und ein zweiter pre-push konnte den freien Platz nehmen: zwei Pushes zugleich. Jetzt hinterlässt die
   Freigabe ein Pause-Ticket (name pre-push, pause: true). Es zählt für die Exklusiv-Regel wie ein gehaltener Push, aber NICHT
   in der Schlange: andere Läufe nutzen den freien Platz. Es endet, wenn der Push neu holt, seinen Platz freigibt (Hook-Ende)
   oder sein Prozess nicht mehr lebt (wartende() räumt Tickets toter Prozesse). */
function pushPauseSetzen({ pid = process.pid, dir = verzeichnis(), cwd = process.cwd() } = {}) {
  return ticketZiehen({ name: EXKLUSIV, pid, dir, cwd, extra: { pause: true } });
}
function pushPauseEnden({ pid = process.pid, dir = verzeichnis() } = {}) {
  let weg = 0;
  for (const t of wartende({ dir })) if (t.pause && t.pid === pid) { ticketAbgeben(t.pfad); weg += 1; }
  return weg;
}
/** Hält ein ANDERER Push einen Platz oder steht er in der Pause? */
function fremderPush({ dir, n, pid }) {
  return halter({ dir, n }).some((h) => h.name === EXKLUSIV && h.pid !== pid)
    || wartende({ dir }).some((t) => t.pause && t.name === EXKLUSIV && t.pid !== pid);
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

const REIHE_DATEI = 'reihe';
const REIHE_GUELTIG_MS = 90 * 60 * 1000;
/* VERWAISTE MARKE (16.10.2026, Befund VORRANG-MARKE-VERWAIST): eine Marke, deren Lauf nicht mehr lebt (Sitzung beendet,
   Kontowechsel, Lauf abgebrochen), hielt die Schlange bis zum Ablauf der 90 Minuten auf — heute zweimal. Jetzt gilt sie nach
   einer Schonfrist nur, solange im markierten Baum ein lebender Eintrag steht: ein Halter oder ein Ticket, auf den Suite-Plätzen
   oder dem Air-Platz (dieselben Einträge wie in eigeneLaeufe, verglichen mit imBaum). Die Schonfrist deckt die übliche Folge
   „Marke setzen, dann den Lauf starten“. Zwischen zwei Läufen desselben Baums (Ende des pre-commit, Start des Pushs) gilt sie
   nach der Schonfrist kurz nicht; ein fremder Lauf kann dann einen Platz nehmen. Verloren ist sie nicht: sobald der Push ein
   Ticket zieht, gilt sie wieder. Probe: tests/suite-platz-reihe.test.js, [Reihe·verwaist]. */
const REIHE_SCHONFRIST_MS = 10 * 60 * 1000;
function markeHatLauf(baum, { dir = verzeichnis(), host = os.hostname() } = {}) {
  const lebt = (e) => e && (!e.host || e.host === host) && prozessLebt(e.pid) && imBaum(baum, e.cwd);
  const ad = airVerzeichnis(dir);
  const air = fs.existsSync(ad) ? [...halter({ dir: ad, n: anzahlAir() }), ...wartende({ dir: ad })] : [];
  return [...halter({ dir }), ...wartende({ dir }), ...air].some(lebt);
}
/* WARTEZEIT AUF DEN PLATZ (16.10.2026). Vorgabe für jeden Lauf, der einen Platz holt und dabei wartet (Hooks, Landung, die Wache von
   npm test, das CLI): 7200 s. Bis hierher 600 s — sind beide Plätze mit langen Läufen belegt, brach ein Push oder Commit nach zehn
   Minuten ab und verlor seinen Platz in der Reihe, auch mit Vorrang-Marke (zweimal in einer Nacht gemessen). Überschreibbar mit
   VD_SUITE_PLATZ_WARTEN_S. Probe: tests/suite-platz-wartezeit.test.js, auch dass kein Aufrufer eine eigene Zahl setzt. */
const WARTEN_S_VORGABE = 7200;
function wartenS(env = process.env) { const n = Number(env.VD_SUITE_PLATZ_WARTEN_S); return Number.isFinite(n) && n > 0 ? n : WARTEN_S_VORGABE; }

/** Die Vorrang-Marke: null (keine) oder { baum, gesetztAm, gueltig, grund }. */
function reiheLesen({ dir = verzeichnis(), jetzt = Date.now() } = {}) {
  let roh;
  try { roh = fs.readFileSync(path.join(dir, REIHE_DATEI), 'utf8'); } catch (_) { return null; }
  let m;
  try { m = JSON.parse(roh); } catch (_) { return { baum: null, gueltig: false, grund: 'Marke unlesbar, altes Verhalten' }; }
  const t = Date.parse(m && m.gesetztAm);
  if (!m || typeof m.baum !== 'string' || !Number.isFinite(t)) return { baum: null, gueltig: false, grund: 'Marke unvollständig, altes Verhalten' };
  if (jetzt - t > REIHE_GUELTIG_MS) return { ...m, gueltig: false, grund: 'Marke abgelaufen, altes Verhalten' };
  if (!fs.existsSync(m.baum)) return { ...m, gueltig: false, grund: 'Marke abgelaufen (Baum fehlt), altes Verhalten' };
  if (jetzt - t > REIHE_SCHONFRIST_MS && !markeHatLauf(echterPfad(m.baum), { dir })) {
    return { ...m, gueltig: false, verwaist: true, grund: 'Marke verwaist (nach der Schonfrist kein lebender Lauf im Baum ' + m.baum + '), altes Verhalten' };
  }
  return { ...m, gueltig: true };
}
/* EIGENTÜMER DER VORRANG-MARKE (16.10.2026, Befund VORRANG-MARKE-FREMD-GELOESCHT): Die Marke ist eine einzige Datei.
   Vorher löschte reiheLoeschen sie ohne zu prüfen, wem sie gehört, und reiheSetzen überschrieb eine gültige fremde still —
   jede Sitzung räumt nach ihrem Push die Marke, und so verschwand zweimal eine Marke, die für einen anderen Baum gesetzt war.
   Jetzt sagt reiheSetzen, wessen gültige Marke es überschreibt (`ueberschrieben`), und reiheLoeschen löscht nur eine Marke,
   deren Baum die cwd des Aufrufers enthält (derselbe Vergleich wie bei der Vergabe, imBaum mit realpath), eine ungültige
   (sie wirkt ohnehin nicht) oder mit `fremd: true` bewusst eine fremde. */
function reiheSetzen({ dir = verzeichnis(), baum, jetzt = Date.now() } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const alt = reiheLesen({ dir, jetzt });
  const eintrag = { baum: echterPfad(baum), gesetztAm: new Date(jetzt).toISOString() };
  fs.writeFileSync(path.join(dir, REIHE_DATEI), JSON.stringify(eintrag) + '\n');
  if (alt && alt.gueltig && alt.baum !== eintrag.baum) return { ...eintrag, ueberschrieben: { baum: alt.baum, gesetztAm: alt.gesetztAm } };
  return eintrag;
}
/**
 * Entfernt die Vorrang-Marke, wenn sie dem Aufrufer gehört. Ergebnis { geloescht, ergebnis, marke }:
 *   ergebnis 'keine'    — keine Marke gesetzt
 *   ergebnis 'eigen'    — die Marke nennt den Baum der cwd: gelöscht
 *   ergebnis 'ungueltig'— abgelaufen, unlesbar oder Baum fehlt: gelöscht (wirkt ohnehin nicht)
 *   ergebnis 'fremd'    — gültige Marke eines anderen Baums: NICHT gelöscht
 *   ergebnis 'fremd-geloescht' — gültige fremde Marke, mit `fremd: true` bewusst gelöscht
 */
function reiheLoeschen({ dir = verzeichnis(), cwd = process.cwd(), fremd = false, jetzt = Date.now() } = {}) {
  const marke = reiheLesen({ dir, jetzt });
  if (!marke) return { geloescht: false, ergebnis: 'keine', marke: null };
  const ergebnis = !marke.gueltig ? 'ungueltig' : imBaum(marke.baum, cwd) ? 'eigen' : fremd ? 'fremd-geloescht' : 'fremd';
  if (ergebnis === 'fremd') return { geloescht: false, ergebnis, marke };
  try { fs.unlinkSync(path.join(dir, REIHE_DATEI)); } catch (_) { return { geloescht: false, ergebnis: 'keine', marke: null }; }
  return { geloescht: true, ergebnis, marke };
}
/** Liegt ein Arbeitsverzeichnis im markierten Baum? */
function imBaum(baum, cwd) {
  if (!baum || !cwd) return false;
  const c = echterPfad(cwd);
  return c === baum || c.startsWith(baum + path.sep);
}

/**
 * Versucht einmal, einen Platz zu holen. Ergebnis:
 *   { geholt: true, geerbt: true }                   — ein Elternprozess hält schon einen Platz
 *   { geholt: true, platz, pfad, geraeumt? }         — Platz geholt
 *   { geholt: false, halter, wartende }              — alle Plätze lebend belegt, oder die freien
 *                                                      stehen älteren Tickets zu
 * `ticket`: der Pfad des eigenen Tickets (aus ticketZiehen), sonst steht der Aufrufer hinter allen.
 */
function platzHolen(opts = {}) {
  // Der geerbte Platz zuerst, BEVOR ein Verzeichnis aufgelöst wird: ein Kind mit geerbtem Platz braucht keines (s. verzeichnis).
  const env = opts.env || process.env;
  if (env[UMGEBUNG_GEHALTEN]) return geerbterPlatz({ env, art: 'voll' });
  const { name, pid = process.pid, dir = verzeichnis(), n = anzahl(), cwd = process.cwd(), ticket = null } = opts;
  const erbe = geerbterPlatz({ env, pid, dir, n, art: 'voll' });
  if (erbe) return erbe;
  fs.mkdirSync(dir, { recursive: true });
  // Ein Air-Platz derselben Sitzung sperrt hier nichts mehr (AIR-PLATZ ALS DRITTER PLATZ, 16.10.2026).
  const reihe = reiheLesen({ dir });
  if (reihe && reihe.gueltig) {
    const jetztHalter = halter({ dir, n });
    if (imBaum(reihe.baum, cwd)) {
      if (name === EXKLUSIV && fremderPush({ dir, n, pid })) return { geholt: false, halter: jetztHalter, wartende: wartende({ dir }), exklusiv: true, reihe };
      return platzNehmen({ name, pid, dir, n, cwd, schlange: [], reihe });   // vor allen Tickets
    }
    const andere = jetztHalter.filter((h) => !imBaum(reihe.baum, h.cwd));
    const markierterHaelt = jetztHalter.length > andere.length;
    const frei = n - jetztHalter.length;
    /* NUR AIR (20.10.2026, Befund VORRANG-MARKE-OHNE-LAUF-HAELT-REIHE): lebt der markierte Baum nur auf dem Air-Platz (air-schicken),
       bleibt die Marke gültig, hält aber nach der Schonfrist keinen Suite-Platz frei — niemand aus dem Baum braucht ihn gerade.
       Sie hält ihn wieder, sobald im Baum ein Suite-Lauf wartet (sein Ticket) oder in der Schonfrist. Gemessen: 14 Minuten ein
       leerer Platz bei acht Wartenden. Probe: tests/suite-platz-reihe.test.js, [Reihe·nur Air]. */
    const suiteWartet = wartende({ dir }).some((t) => imBaum(reihe.baum, t.cwd));
    const inSchonfrist = Date.now() - Date.parse(reihe.gesetztAm || 0) <= REIHE_SCHONFRIST_MS;
    const freihalten = !markierterHaelt && (suiteWartet || inSchonfrist);
    const platzDa = markierterHaelt ? andere.length === 0 && frei >= 1 : freihalten ? andere.length === 0 && frei >= 2 : frei >= 1;
    // Ein Browserlauf nicht neben einem Browserlauf; wer so blockiert ist, hält den Zusatzplatz niemandem zu.
    const e2eHaelt = jetztHalter.some((h) => artVon(h.name) === 'e2e' && h.pid !== pid);
    const kannNehmen = (laufName) => !(artVon(laufName) === 'e2e' && e2eHaelt);
    const schlange = wartende({ dir }).filter((t) => !t.pause && !imBaum(reihe.baum, t.cwd) && t.name !== EXKLUSIV && kannNehmen(t.name));
    const eigenerRang = ticket ? schlange.findIndex((t) => t.pfad === ticket) : -1;
    const vorn = eigenerRang === 0 || (eigenerRang < 0 && schlange.length === 0);
    const darf = name !== EXKLUSIV && platzDa && kannNehmen(name) && vorn;
    if (!darf) return { geholt: false, halter: jetztHalter, wartende: wartende({ dir }), reihe };
    return platzNehmen({ name, pid, dir, n, cwd, schlange: [], reihe });
  }
  const reiheHinweis = reihe && !reihe.gueltig ? reihe.grund : null;
  const pushHaelt = fremderPush({ dir, n, pid });
  if (name === EXKLUSIV && pushHaelt) return { geholt: false, halter: halter({ dir, n }), wartende: wartende({ dir }), exklusiv: true };
  // Ein Push, der hinter einem laufenden Push wartet, kann einen freien Platz nicht nehmen — er hält ihn niemandem zu.
  // Ein Pause-Ticket hält niemandem einen Platz zu (PUSH-FREIGABE-ZWEITER-PREPUSH).
  // „Hinter einem laufenden Push" heißt: hinter einem ANDEREN als dem eigenen — das eigene Pause-Ticket eines Push, der nach
  // grünem Air neu greift, sperrt sein echtes Ticket nicht aus der Schlange (PUSH-NEUGRIFF-OHNE-TICKET-BEI-LAST, 22.10.2026).
  const schlange = wartende({ dir }).filter((t) => !t.pause && (t.name !== EXKLUSIV || t.pfad === ticket || !fremderPush({ dir, n, pid: t.pid })));
  const eigenerRang = ticket ? schlange.findIndex((t) => t.pfad === ticket) : -1;
  // Ohne Ticket: hinter allen derselben oder einer höheren Stufe — ein Push also vor wartenden Vorbereitungen.
  const rang = eigenerRang >= 0 ? eigenerRang : schlange.filter((t) => t.stufe <= vorrang(name)).length;
  if (rang > 0 && n - halter({ dir, n }).length <= rang) {
    return { geholt: false, halter: halter({ dir, n }), wartende: schlange, ...(reiheHinweis ? { reiheHinweis } : {}) };
  }
  return platzNehmen({ name, pid, dir, n, cwd, schlange, reiheHinweis });
}

/** Der atomare Teil: den ersten freien Platz atomar anlegen (atomarAnlegen), tote Halter einmal räumen. */
function platzNehmen({ name, pid, dir, n, cwd, schlange, reihe = null, reiheHinweis = null }) {
  const zusatz = { ...(reihe ? { reihe } : {}), ...(reiheHinweis ? { reiheHinweis } : {}) };
  const geraeumt = [];
  for (let k = 1; k <= n; k++) {
    const pfad = platzPfad(dir, k);
    for (let versuch = 0; versuch < 2; versuch++) {
      const eintrag = { pid, name, cwd, host: os.hostname(), gestartetAm: new Date().toISOString() };
      if (!atomarAnlegen(pfad, JSON.stringify(eintrag))) {
        const inhalt = lesen(pfad);
        if (inhalt && prozessLebt(inhalt.pid)) break;          // lebend belegt: nächster Platz
        try { fs.unlinkSync(pfad); } catch (_) { /* schon weg */ }
        geraeumt.push({ platz: k, ...(inhalt || { pid: null, name: 'unlesbar' }) });
        continue;                                               // einmal neu versuchen
      }
      return { geholt: true, platz: k, pfad, eintrag, ...(geraeumt.length ? { geraeumt } : {}), ...zusatz };
    }
  }
  return { geholt: false, halter: halter({ dir, n }), wartende: schlange, ...(geraeumt.length ? { geraeumt } : {}), ...zusatz };
}

/** Wartet höchstens `wartenS` Sekunden auf einen Platz (Pause `pauseS`), ohne Ereignisschleife.
 *  `warten(ms)` ist die Pause; Proben ersetzen sie, um den Zeitpunkt des Neuversuchs festzulegen.
 *  `lastFrei()` ist die Lastgrenze; solange sie false liefert, wird nicht gegriffen. Ohne Angabe gilt lastAbwarten()
 *  ohne Warten — für jeden Holer, nicht nur für das CLI (es reicht seine eigene Messung herein, um sie zu melden).
 *  Ergebnis bei Abbruch an der Last: { geholt: false, last: true, … }. */
/* TICKET VOR DER LAST (22.10.2026, Befund PUSH-NEUGRIFF-OHNE-TICKET-BEI-LAST): --holen wartete auf die Last, BEVOR es ein
   Ticket zog. Der Neugriff eines pre-push nach grünem Air (der Hook, Exit 0 der Air-Vorprüfung) stand bei Last ≥ 12
   darum in keiner Schlange — sein Pause-Ticket hält ausdrücklich niemandem einen Platz zu —, und jeder andere Holer zog am
   freien Platz vorbei (Krypto-Reservierung 512, 22:44–00:0x, dreimal überholt bei Last um 30). Jetzt steht das Ticket vor
   dem Lastwarten; das Pause-Ticket bleibt für die Exklusiv-Regel stehen, bis der Platz geholt ist (der Aufrufer beendet es).
   NACHTRAG 23.10.2026: die Abnahme gilt für ALLE Holer. Ein pre-commit, der vorn auf die Last wartete, wurde zweimal
   überholt (01:48, 01:52) — von Holern, die über die Bibliothek griffen und die Last gar nicht prüften (landung-vorbereiten,
   npm test, die Faktenbasis, die Ratsche). Darum ist lastAbwarten() jetzt die Vorgabe von `lastFrei`: jeder Holer wartet
   an der Last in der Schlange, keiner greift an ihr vorbei. In Testläufen und unter einem geerbten Platz prüft
   lastAbwarten() nicht (s. dort) und meldet frei.
   Probe: [Suite-Platz·Last·Ticket], [Suite-Platz·Last·Ticket·Alle Holer]. */
const schlafen = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function platzHolenMitWarten(opts = {}, { wartenS = 0, pauseS = 10, melden = () => {}, warten = schlafen,
  lastFrei = () => lastAbwarten({ wartenS: 0, grenze: lastGrenzeVoll() }).frei } = {}) {
  const erbe = geerbterPlatz({ env: opts.env, pid: opts.pid, dir: opts.dir, n: opts.n, art: 'voll' });   // vor der Last: ein Erbe wartet nicht
  if (erbe) return erbe;
  const ende = Date.now() + wartenS * 1000;
  const anDerLast = () => ({ geholt: false, last: true, halter: halter({ dir: opts.dir, n: opts.n }), wartende: wartende({ dir: opts.dir }) });
  let r = lastFrei() ? platzHolen(opts) : anDerLast();
  if (r.geholt || wartenS <= 0) return r;
  // Wer warten muss — auf einen Platz oder auf die Last —, zieht ein Ticket und reiht sich ein; abgegeben wird es in jedem Fall.
  const ticket = ticketZiehen({ name: opts.name, pid: opts.pid, dir: opts.dir, cwd: opts.cwd });
  const abgeben = () => ticketAbgeben(ticket);
  process.once('exit', abgeben);
  try {
    melden(r);
    while (Date.now() < ende) {
      warten(pauseS * 1000);
      if (!lastFrei()) { r = anDerLast(); continue; }
      r = platzHolen({ ...opts, ticket });
      if (r.geholt) return r;
    }
    return r;
  } finally { abgeben(); process.removeListener('exit', abgeben); }
}

/**
 * Holt den Air-Platz (PLATZART AIR). Ergebnis wie platzHolen. Ein Suite-Platz derselben Sitzung sperrt ihn nicht
 * (AIR-PLATZ ALS DRITTER PLATZ, 16.10.2026); keine Lastgrenze — der Lauf rechnet auf dem Prüfrechner.
 * Ohne Ticket steht der Aufrufer hinter allen wartenden Air-Läufen.
 */
function airPlatzHolen({ name = 'air', pid = process.pid, dir = verzeichnis(), n, cwd = process.cwd(), ticket = null, env = process.env } = {}) {
  const ad = airVerzeichnis(dir);
  const na = n || anzahlAir(env);
  fs.mkdirSync(ad, { recursive: true });
  const schlange = wartende({ dir: ad });
  const eigenerRang = ticket ? schlange.findIndex((t) => t.pfad === ticket) : schlange.length;
  if (eigenerRang > 0 && na - halter({ dir: ad, n: na }).length <= eigenerRang) return { geholt: false, halter: halter({ dir: ad, n: na }), wartende: schlange };
  return platzNehmen({ name, pid, dir: ad, n: na, cwd, schlange });
}
/** Wartet höchstens `wartenS` Sekunden auf den Air-Platz, mit Ticket. */
function airPlatzHolenMitWarten(opts = {}, { wartenS = 0, pauseS = 10, melden = () => {} } = {}) {
  const dir = opts.dir || verzeichnis();
  let r = airPlatzHolen({ ...opts, dir });
  if (r.geholt || wartenS <= 0) return r;
  const ende = Date.now() + wartenS * 1000;
  const ticket = ticketZiehen({ name: opts.name || 'air', pid: opts.pid, dir: airVerzeichnis(dir), cwd: opts.cwd });
  const abgeben = () => ticketAbgeben(ticket);
  process.once('exit', abgeben);
  try {
    melden(r);
    while (Date.now() < ende) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pauseS * 1000);
      r = airPlatzHolen({ ...opts, dir, ticket });
      if (r.geholt) return r;
    }
    return r;
  } finally { abgeben(); process.removeListener('exit', abgeben); }
}
function airPlatzFreigeben({ pid = process.pid, dir = verzeichnis(), env = process.env } = {}) {
  return platzFreigeben({ pid, dir: airVerzeichnis(dir), n: anzahlAir(env) });
}

/* KLEINE LÄUFE GEZÄHLT (23.10.2026, Befund KLEIN-LAEUFE-UNGEZAEHLT, HOCH). `--klein` war nur ein Tor: es wartete einmal auf die
   Last und kehrte zurück, danach wusste niemand vom Lauf. Nach einer Landung starteten so vier Vorprüfungen zugleich, die Last
   stieg auf 54, vier Stunden landete nichts. Jetzt hält ein kleiner Lauf einen KLEIN-PLATZ: Unterverzeichnis `klein/` wie beim
   Air-Platz, Vorgabe 2 (`kleinPlaetze` in plaetze.json, sonst VD_KLEIN_PLAETZE). Der dritte zieht ein Ticket in `klein/tickets/`
   und wartet in der Reihe. Der Eintrag nennt den Prozess, der den Lauf trägt (das CLI startet den Befehl als sein Kind und hält
   den Platz, bis er endet), nicht eine langlebige Shell. Tote Einträge räumt jeder neue Antrag und --anzeigen. Die Suite-Plätze
   bleiben davon getrennt; die Lastgrenze gilt zusätzlich. Probe: [Klein·Zählung], [Klein·Tot], [Klein·Anzeigen]. */
const UMGEBUNG_KLEIN = 'VD_KLEIN_GEHALTEN';
function kleinVerzeichnis(dir) { return path.join(dir, 'klein'); }
function anzahlKlein(env = process.env, dir = null) {
  try {
    const n = JSON.parse(fs.readFileSync(path.join(dir || verzeichnis(env), PLAETZE_DATEI), 'utf8')).kleinPlaetze;
    if (Number.isInteger(n) && n >= 1) return n;
  } catch (_) { /* keine zentrale Zahl */ }
  const v = Number(env.VD_KLEIN_PLAETZE);
  return Number.isInteger(v) && v >= 1 ? v : 2;
}
/** Räumt Klein-Plätze toter Halter; Ergebnis: die geräumten Einträge. Tickets toter Prozesse räumt wartende(). */
function kleinTotRaeumen({ dir = verzeichnis(), n } = {}) {
  const kd = kleinVerzeichnis(dir);
  const geraeumt = [];
  for (let k = 1; k <= (n || anzahlKlein(process.env, dir)); k++) {
    const pfad = platzPfad(kd, k);
    if (!fs.existsSync(pfad)) continue;
    const e = lesen(pfad);
    if (e && prozessLebt(e.pid)) continue;
    try { fs.unlinkSync(pfad); geraeumt.push({ platz: k, ...(e || { pid: null, name: 'unlesbar' }) }); } catch (_) { /* schon weg */ }
  }
  wartende({ dir: kd });
  return geraeumt;
}
/** Versucht einmal, einen Klein-Platz zu holen (Ergebnis wie platzHolen). Ohne Ticket steht der Aufrufer hinter allen Wartenden. */
function kleinPlatzHolen({ name = 'klein', pid = process.pid, dir = verzeichnis(), n, cwd = process.cwd(), ticket = null, env = process.env } = {}) {
  if (env[UMGEBUNG_KLEIN] || env[UMGEBUNG_GEHALTEN]) return geerbterPlatz({ env, art: 'klein' });
  const erbe = geerbterPlatz({ env, pid, dir, art: 'klein' });
  if (erbe) return erbe;
  const kd = kleinVerzeichnis(dir);
  const nk = n || anzahlKlein(env, dir);
  fs.mkdirSync(kd, { recursive: true });
  kleinTotRaeumen({ dir, n: nk });
  const schlange = wartende({ dir: kd });
  const eigenerRang = ticket ? schlange.findIndex((t) => t.pfad === ticket) : schlange.length;
  if (eigenerRang > 0 && nk - halter({ dir: kd, n: nk }).length <= eigenerRang) return { geholt: false, halter: halter({ dir: kd, n: nk }), wartende: schlange };
  return platzNehmen({ name, pid, dir: kd, n: nk, cwd, schlange });
}
/* KLEIN WARTET AUF VOLLE PLÄTZE (24.10.2026). Am 24.10.2026 um 17:33 lag die Last bei 34,8: zwei volle Plätze
   und zwei Klein-Läufe liefen zugleich, die Klein-Läufe waren 12 s vor einem vollen Lauf gestartet. Der Klein-Weg prüfte nur
   die 1-Minuten-Last, und die hinkt etwa eine Minute nach — ein eben gestarteter Lauf steht noch nicht darin. Darum gilt für
   den START eines Klein-Laufs jetzt:
   (a) Sind alle vollen Plätze belegt, wartet er (mit Ticket, wie an der Last).
   (b) Last + ZUSCHLAG_VOLL je vollem Halter + ZUSCHLAG_KLEIN je Klein-Halter, der jünger als ZUSCHLAG_FRIST_MS ist, muss unter
       der Grenze liegen. Der Zuschlag zählt nur Läufe, die die gemessene Last noch nicht enthält.
   Für volle Plätze gilt (b) nicht: dort liegt die Last bei zwei Läufen bei 22–28 (LASTREGEL 24.10.2026 03:34), und eine
   Grenze 12 sperrte jeden zweiten vollen Lauf. Geprüft wird wie in lastAbwarten() nur an der echten Schlange.
   Probe: [Klein·Volle belegt] und [Klein·Voranschlag].
   KLEIN-GRENZE 20 (24.10.2026, Nachtrag): Ein voller Lauf allein macht 10–15 Last; um 17:13 warteten darum sechs Klein-Läufe
   an der Grenze 12 neben einem einzigen vollen Lauf. Der Klein-Start prüft jetzt gegen VD_LAST_GRENZE_KLEIN (Vorgabe 20),
   solange höchstens ein voller Platz belegt ist — (a) bleibt: sind beide belegt, wartet er. Wer nur VD_LAST_GRENZE
   ausdrücklich setzt, setzt auch diese Grenze (wie bei lastGrenzeVoll). Probe: [Klein·Grenze 20]. */
function lastGrenzeKlein(env = process.env) {
  const n = Number(env.VD_LAST_GRENZE_KLEIN);
  if (Number.isFinite(n) && n > 0) return n;
  return env.VD_LAST_GRENZE ? lastGrenze(env) : 20;
}
const ZUSCHLAG_VOLL = 10;    // LASTREGEL 24.10.2026 03:34: zwei volle Läufe ergaben 22–28, also etwa 11–14 je Lauf
const ZUSCHLAG_KLEIN = 4;    // GESCHÄTZT, nicht gemessen (vier Proben im Pool von vor-pre-commit); Nachmessung nach folge33
const ZUSCHLAG_FRIST_MS = 90 * 1000;
function kleinStartFrei({ env = process.env, dir = null, n = null, nk = null, grenze = lastGrenzeKlein(env), last = () => os.loadavg()[0],
  jetzt = Date.now(), pruefen = !env.VD_SUITE_PLATZ_DIR && !env[UMGEBUNG_GEHALTEN] && !testlaeuferMerkmale(env).length } = {}) {
  if (!pruefen) return { frei: true, geprueft: false, grenze };
  const d = dir || verzeichnis();
  const nv = n || anzahl(env, d);
  const voll = halter({ dir: d, n: nv });
  if (voll.length >= nv) return { frei: false, geprueft: true, voll: true, halter: voll, grenze };
  const jung = (h) => jetzt - Date.parse(h.gestartetAm || 0) < ZUSCHLAG_FRIST_MS;
  const klein = halter({ dir: kleinVerzeichnis(d), n: nk || anzahlKlein(env, d) });
  const zuschlag = voll.filter(jung).length * ZUSCHLAG_VOLL + klein.filter(jung).length * ZUSCHLAG_KLEIN;
  const l = last();
  return { frei: l + zuschlag < grenze, geprueft: true, voll: false, last: l, zuschlag, voranschlag: l + zuschlag, grenze };
}
/** Wartet höchstens `wartenS` Sekunden auf einen Klein-Platz und die Last, mit Ticket. Bei Abbruch an der Last: { last: true }. */
function kleinPlatzHolenMitWarten(opts = {}, { wartenS = 0, pauseS = 10, melden = () => {}, warten = schlafen,
  lastFrei = () => kleinStartFrei({ env: opts.env || process.env, dir: opts.dir }).frei } = {}) {
  const env = opts.env || process.env;
  if (env[UMGEBUNG_KLEIN] || env[UMGEBUNG_GEHALTEN]) return geerbterPlatz({ env, art: 'klein' });
  const dir = opts.dir || verzeichnis();
  const erbe = geerbterPlatz({ env, pid: opts.pid, dir, art: 'klein' });   // vor der Last: ein Erbe wartet nicht
  if (erbe) return erbe;
  const anDerLast = () => ({ geholt: false, last: true, halter: halter({ dir: kleinVerzeichnis(dir), n: opts.n || anzahlKlein(opts.env, dir) }) });
  let r = lastFrei() ? kleinPlatzHolen({ ...opts, dir }) : anDerLast();
  if (r.geholt || wartenS <= 0) return r;
  const ende = Date.now() + wartenS * 1000;
  const ticket = ticketZiehen({ name: opts.name || 'klein', pid: opts.pid, dir: kleinVerzeichnis(dir), cwd: opts.cwd });
  const abgeben = () => ticketAbgeben(ticket);
  process.once('exit', abgeben);
  try {
    melden(r);
    while (Date.now() < ende) {
      warten(pauseS * 1000);
      if (!lastFrei()) { r = anDerLast(); continue; }
      r = kleinPlatzHolen({ ...opts, dir, ticket });
      if (r.geholt) return r;
    }
    return r;
  } finally { abgeben(); process.removeListener('exit', abgeben); }
}
function kleinPlatzFreigeben({ pid = process.pid, dir = verzeichnis(), env = process.env } = {}) {
  return platzFreigeben({ pid, dir: kleinVerzeichnis(dir), n: anzahlKlein(env, dir) });
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
  /* Air-Platz (16.10.2026, Air a4): der vom pre-commit abgelöste Frühlauf hält ihn als eigener Prozess mit der cwd des
     Baums. Ohne diese Zeilen sähe --beenden ihn nie, und er liefe nach dem Ende der Sitzung verwaist weiter. */
  const ad = airVerzeichnis(dir);
  for (let k = 1; k <= anzahlAir(); k++) {
    const e = lesen(platzPfad(ad, k));
    if (passt(e)) plaetze.push({ platz: 'Air ' + k, air: true, ...e });
    else if (eigen(e)) tot.push({ platz: 'Air ' + k, pfad: platzPfad(ad, k), ...e });
  }
  const airWartende = fs.existsSync(ad) ? wartende({ dir: ad }).filter(passt).map((t) => ({ ...t, air: true })) : [];
  // Klein-Plätze (23.10.2026, KLEIN-LAEUFE-UNGEZAEHLT): ein kleiner Lauf der Sitzung endet mit --beenden wie die übrigen.
  const kd = kleinVerzeichnis(dir);
  for (let k = 1; k <= anzahlKlein(process.env, dir); k++) {
    const e = lesen(platzPfad(kd, k));
    if (passt(e)) plaetze.push({ platz: 'Klein ' + k, klein: true, ...e });
    else if (eigen(e)) tot.push({ platz: 'Klein ' + k, pfad: platzPfad(kd, k), ...e });
  }
  const kleinWartende = fs.existsSync(kd) ? wartende({ dir: kd }).filter(passt).map((t) => ({ ...t, klein: true })) : [];
  return { plaetze, wartende: [...wartende({ dir }).filter(passt), ...airWartende, ...kleinWartende], tot };
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

/* VERERBUNG ÜBER DIE PPID-KETTE (24.10.2026, Befund VERSCHACHTELTER-LAUF-HOLT-ZWEITEN-PLATZ, MITTEL). Die Variable allein trug
   nicht: `--holen` aus einer Shell kann sie dem Hook nicht setzen, `--klein` setzte nur VD_KLEIN_GEHALTEN, und eine Probe, die
   ihre Umgebung bereinigt, verliert beide. So holte ein `npm test` in einem Skript mit Platz einen zweiten vollen, und unter
   `--klein` die Probe der Befund-Ratsche einen vollen neben dem kleinen; ihr Kind wartete dabei an der Last. Jetzt gilt: hält ein
   Vorfahr (Eltern, Großeltern …) einen vollen oder kleinen Platz, läuft der Prozess unter dessen Ticket — ohne Platz, ohne Ticket,
   vor der Last. Der Halter selbst und ein Geschwisterprozess erben nicht. Die Variablen tragen nur, wo sie schon trugen: für einen
   vollen Platz VD_SUITE_PLATZ_GEHALTEN (seit 27.09.2026), für einen kleinen dazu VD_KLEIN_GEHALTEN (seit 23.10.2026). Eine
   Variable allein öffnet keinen neuen Weg: `VD_KLEIN_GEHALTEN=1 npm test` holt weiter einen vollen Platz.
   Ein Air-Platz zählt nicht: er rechnet auf dem Prüfrechner, der Rest hier holt seinen Platz wie bisher.
   Probe: die Platz-Probe zur Vererbung über Vorfahren (sie fährt das Kommandozeilenwerkzeug der Plätze und bleibt mit ihm drinnen). */
function vorfahrHaelt({ pid = process.pid, halterListe, psText }) {
  if (!halterListe.length) return null;
  const vor = vorfahren(Number(pid), psText);
  return halterListe.find((h) => vor.has(Number(h.pid))) || null;
}
function psZeilen() {
  try { return require('node:child_process').execFileSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }); } catch (_) { return ''; }
}
/** Der geerbte Platz oder null: aus der Umgebung, sonst über die ppid-Kette zu einem lebenden Halter (voll oder klein). */
function geerbterPlatz({ env = process.env, pid = process.pid, dir, n, art = 'voll' } = {}) {
  if (env[UMGEBUNG_GEHALTEN]) return { geholt: true, geerbt: true, von: env[UMGEBUNG_GEHALTEN] };
  if (art === 'klein' && env[UMGEBUNG_KLEIN]) return { geholt: true, geerbt: true, von: 'klein:' + env[UMGEBUNG_KLEIN] };
  const d = dir || verzeichnis(env);
  const liste = [...halter({ dir: d, n: n || anzahl(env, d) }).map((h) => ({ ...h, art: 'voll' })),
    ...halter({ dir: kleinVerzeichnis(d), n: anzahlKlein(env, d) }).map((h) => ({ ...h, art: 'klein' }))];
  const h = vorfahrHaelt({ pid, halterListe: liste, psText: liste.length ? psZeilen() : '' });
  return h ? { geholt: true, geerbt: true, von: h.art + ':' + h.name + ':' + h.pid } : null;
}

/* TESTLÄUFE OHNE ANMELDUNG (24.10.2026, Befund TESTLAUF-OHNE-ANMELDUNG, MITTEL). An einem Tag liefen dreimal Testläufe am
   Platzsystem vorbei: direkt gestartet, ohne vollen, kleinen oder Air-Platz. Die Anzeige sah nur die Halter, also nichts davon.
   Jetzt nennt sie jeden laufenden `node --test` mit seinem Baum (cwd) und markiert, ob er angemeldet ist: angemeldet heißt, er
   selbst oder ein Vorfahr (ppid-Kette, wie bei der Vererbung oben) hält einen Platz oder ein Ticket. Gezählt wird je Lauf nur
   der oberste `--test`-Prozess; Kinder eines Testläufers und die Wache, die ihn startet, sind derselbe Lauf. Die Erkennung prüft
   das Wort `--test` als eigenes Argument eines node-Aufrufs (nicht `--test-reporter` u. ä.). Eine Abwehr ist das nicht: ein
   Lauf wird gesehen, nicht verhindert. Probe: die Platz-Probe zu Testläufen ohne Anmeldung (sie fährt das Kommandozeilenwerkzeug
   der Plätze und bleibt mit ihm drinnen). */
function istTestlauf(befehl) {
  const w = String(befehl || '').trim().split(/\s+/);
  return /(^|\/)node$/.test(w[0] || '') && w.slice(1).includes('--test');
}
function psMitBefehl() {
  try { return require('node:child_process').execFileSync('ps', ['-A', '-o', 'pid=,ppid=,command='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }); } catch (_) { return ''; }
}
/** Arbeitsverzeichnis je PID über lsof (macOS und Linux); was sich nicht lesen lässt, fehlt in der Karte. */
function cwdKarte(pids) {
  const karte = new Map();
  if (!pids.length) return karte;
  try {
    const aus = require('node:child_process').execFileSync('lsof', ['-a', '-d', 'cwd', '-Fn', '-p', pids.join(',')], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
    let pid = null;
    for (const z of aus.split('\n')) {
      if (z[0] === 'p') pid = Number(z.slice(1));
      else if (z[0] === 'n' && pid) karte.set(pid, z.slice(1));
    }
  } catch (e) { /* lsof meldet Exit 1, sobald eine PID schon weg ist; was es gelesen hat, steht dann in e.stdout */
    let pid = null;
    for (const z of String((e && e.stdout) || '').split('\n')) {
      if (z[0] === 'p') pid = Number(z.slice(1));
      else if (z[0] === 'n' && pid) karte.set(pid, z.slice(1));
    }
  }
  return karte;
}
/** Die obersten Testläufe aus einer ps-Ausgabe (`pid ppid befehl`), je mit angemeldet und dem Eintrag, der sie trägt. */
function testlaeufeBewerten({ psText, eintraege, cwdVon = () => null }) {
  const procs = [];
  for (const z of String(psText).split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(z);
    if (m) procs.push({ pid: Number(m[1]), ppid: Number(m[2]), befehl: m[3] });
  }
  const test = new Set(procs.filter((p) => istTestlauf(p.befehl)).map((p) => p.pid));
  const traeger = new Map(eintraege.map((e) => [Number(e.pid), e]));
  const aus = [];
  for (const p of procs) {
    if (!test.has(p.pid)) continue;
    const vor = vorfahren(p.pid, psText);
    if ([...vor].some((v) => test.has(v))) continue;
    const t = traeger.get(p.pid) || [...vor].map((v) => traeger.get(v)).find(Boolean) || null;
    aus.push({ pid: p.pid, cwd: cwdVon(p.pid), befehl: p.befehl, angemeldet: !!t, von: t ? t.art + ':' + t.name : null });
  }
  return aus;
}
/** Die laufenden Testläufe dieses Rechners, bewertet gegen alle Halter und Tickets (voll, klein, Air). */
function testlaeufe({ dir = verzeichnis(), env = process.env } = {}) {
  const eintraege = [
    ...halter({ dir, n: anzahl(env, dir) }).map((h) => ({ ...h, art: 'Platz' })),
    ...wartende({ dir }).map((t) => ({ ...t, art: 'wartend' })),
    ...halter({ dir: kleinVerzeichnis(dir), n: anzahlKlein(env, dir) }).map((h) => ({ ...h, art: 'Klein' })),
    ...wartende({ dir: kleinVerzeichnis(dir) }).map((t) => ({ ...t, art: 'Klein wartend' })),
    ...halter({ dir: airVerzeichnis(dir), n: anzahlAir(env) }).map((h) => ({ ...h, art: 'Air' })),
  ];
  const psText = psMitBefehl();
  const roh = testlaeufeBewerten({ psText, eintraege });
  const karte = cwdKarte(roh.map((t) => t.pid));
  return roh.map((t) => ({ ...t, cwd: karte.get(t.pid) || null }));
}

function meldungBelegt(r) {
  if (r && r.exklusiv) {
    const p = (r.halter || []).find((h) => h.name === EXKLUSIV);
    return 'ein anderer Push läuft' + (p ? ' (PID ' + p.pid + ', ' + p.cwd + ', seit ' + p.gestartetAm + ')' : '')
      + ' — ein Push wartet exklusiv, auch bei freiem Platz; danach prüft er, ob der Kanon noch sein Vorfahr ist.';
  }
  if (r && r.reihe && r.reihe.gueltig) {
    return 'dran ist ' + r.reihe.baum + ' (Vorrang-Marke seit ' + r.reihe.gesetztAm + ') — daneben läuft höchstens ein weiterer Lauf, '
      + 'das älteste Ticket zuerst, kein Push und kein Browserlauf neben einem Browserlauf. Belegt: ' + ((r.halter || []).map((h) => `Platz ${h.platz}: ${h.name} (${h.cwd || '?'})`).join(' · ') || 'nichts') + '.';
  }
  const wer = (r.halter || []).map((h) => `Platz ${h.platz}: ${h.name} (PID ${h.pid}, ${h.cwd || '?'}, seit ${h.gestartetAm})`);
  const vor = (r.wartende || []).length ? ` · vor dir warten ${r.wartende.length}: ` + r.wartende.map((t) => `${t.name} (${t.cwd || '?'})`).join(', ') : '';
  if (r && r.last) return `Last ≥ ${lastGrenzeVoll()} — es wird in der Schlange gewartet, kein Platz geholt` + vor + '. Weniger Fenster oder Läufe.';
  return (r && r.reiheHinweis ? r.reiheHinweis + '. ' : '') + 'alle Suite-Plätze belegt — ' + (wer.join(' · ') || 'Halter unlesbar') + vor
    + '. Warten, bis einer frei wird; nicht mit --no-verify umgehen (die Plätze schützen die Maschine, nicht den Code).';
}

module.exports = {
  UMGEBUNG_GEHALTEN, TESTLAEUFER_MERKMALE, testlaeuferMerkmale, verzeichnis, anzahl, prozessLebt, halter, lastGrenze, lastAbwarten,
  platzHolen, platzHolenMitWarten, platzFreigeben, meldungBelegt,
  wartende, ticketZiehen, ticketAbgeben, vorrang, EXKLUSIV, artVon,
  eigeneLaeufe, toteSperreRaeumen, prozessBaum, vorfahren, vorfahrHaelt, geerbterPlatz, pushPauseSetzen, pushPauseEnden, fremderPush,
  reiheLesen, reiheSetzen, reiheLoeschen, imBaum, markeHatLauf, REIHE_GUELTIG_MS, REIHE_SCHONFRIST_MS, WARTEN_S_VORGABE, wartenS,
  airVerzeichnis, anzahlAir, airPlatzHolen, airPlatzHolenMitWarten, airPlatzFreigeben, gleicheSitzung,
  UMGEBUNG_KLEIN, kleinVerzeichnis, anzahlKlein, kleinTotRaeumen, kleinPlatzHolen, kleinPlatzHolenMitWarten, kleinPlatzFreigeben,
  kleinStartFrei, lastGrenzeVoll, lastGrenzeKlein, ZUSCHLAG_VOLL, ZUSCHLAG_KLEIN, ZUSCHLAG_FRIST_MS,
  istTestlauf, testlaeufeBewerten, testlaeufe,
  AUSLAGERBAR_NAMEN, PLAETZE_DATEI, plaetzeZentral, plaetzeSetzen, auslagerbar, wirklichAuslagerbar, pushtSelbst, airLeerlaufWarnung,
};
