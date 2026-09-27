#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   modul-app-signieren-und-packen.js — EIN Befehl statt drei, für JEDES Modul (31.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   WOZU: Bis hierher brauchte jede Aktualisierung einer Modul-App auf der
   Tester-Seite drei von Hand verkettete Schritte — Modul(e) bauen, signieren
   (tools/modul-erzeugen.js), packen (tools/modul-app-packen.js) — mit
   Zwischendateien, deren Pfade man sich merken musste. Am 31.08.2026 lief
   genau das schief: das gepackte Bündel auf der Tester-Seite trug noch den
   Stand vom Vortag, weil zwischen Signieren und Packen ein Sitzungswechsel
   lag. Dieses Werkzeug bündelt alle Schritte — NICHTS Neues an Logik, reine
   Verkettung der bestehenden, einzeln schon geprüften Werkzeuge (keine
   zweite Signatur-/Packen-Implementierung).

   VORGÄNGER (nur für den Slug „englisch", 31.08.2026 vormittags): 
   „wir brauchen das für alle Module" — ein Modul-App-Slug kann MEHRERE
   signierte Module tragen (Betriebssatz z. B. ein Bereichs-Modul DE + ein
   Textsatz-Overlay EN, s. tools/betriebssatz-aufbereiten.js), darum
   `--modul` wiederholbar statt fest verdrahtet auf genau eins.

   Was WEITERHIN nicht automatisiert wird und nicht automatisiert werden
   soll: die Passphrasen. Sie gehen unverändert über `tools/modul-erzeugen.js`
   interaktiv per stdin ein (stdio: 'inherit' — dieses Werkzeug sieht sie nie,
   reicht sie nur technisch durch). Bei mehreren `--modul` wird für JEDES
   einzeln nach beiden Passphrasen gefragt (ein modul-erzeugen.js-Lauf pro
   Modul) — kein Zwischenspeichern von Klartext-Schlüsselmaterial zwischen
   den Läufen.

   Aufruf:
     node tools/modul-app-signieren-und-packen.js \
       --slug <slug> \
       --herausgeber-id <id> --herausgeber-name <name> --herausgeber-typ <typ> \
       --ausgabe-vdkey <pfad> --ausstellerzertifikat <pfad> \
       [--herausgeber-vdkey <pfad>] [--herausgeber-zertifikat <pfad>] \
       (--modul <pfad-zu-modul-inhalt.json> [--modul <weiterer-pfad> …] | --sprachmodul-en) \
       [--push]

   `--modul` ist wiederholbar — jedes wird einzeln signiert, alle zusammen als
   EIN Bündel-Array gepackt (genau das Format, das tools/modul-app-packen.js
   als `--bundle` schon akzeptiert). `--sprachmodul-en` ist eine Abkürzung für
   den bisherigen Alltagsfall: baut das englische Sprachmodul frisch aus
   tools/textsatz-en-modul-erzeugen.js und hängt es als weiteres `--modul` an
   — kombinierbar mit echten `--modul`-Pfaden, wenn ein Slug beides braucht.

   Ohne `--herausgeber-vdkey` stellt `modul-erzeugen.js` wie bisher pro Lauf
   ein neues Kundenzertifikat aus — wer das vermeiden will, übergibt beim
   ERSTEN Lauf einen Zielpfad für `--herausgeber-vdkey`, dann wird er künftig
   wiederverwendet (s. modul-erzeugen.js selbst).
   Ohne `--push` bleiben beide Commits (Zielrepo) lokal liegen — wie bei den
   Geschwister-Werkzeugen.

   ── GEDÄCHTNIS FÜR DIE ZWEI STEHENDEN PFADE (01.09.2026, Auftrag) ──
   `--ausgabe-vdkey` und `--ausstellerzertifikat` sind Vivodepots EIGENE,
   stehende Betriebs-Infrastruktur (s. modul-erzeugen.js: „Vivodepots eigene,
   bestehende Betriebs-Infrastruktur … nimmt beide als FERTIGE Pfade entgegen")
   — nicht pro Modul oder Kunde verschieden, praktisch bei JEDEM Lauf dieselben
   zwei langen Pfade. Genau die musste die Produktentscheidung bisher jedes Mal von Hand
   zusammensuchen, an der einen Stelle, an der ihr niemand helfen kann (die
   Passphrase gibt nur sie ein). Ab jetzt: EXPLIZITES Argument schlägt IMMER den
   gemerkten Wert; fehlt eins von beiden, fragt dieses Werkzeug interaktiv
   danach (kein Usage-Fehler mehr — ein Werkzeug, das nur eine Person bedienen
   darf, darf sie nicht wegschicken) und merkt sich die Antwort erst NACH einem
   erfolgreichen Lauf, in `MERKDATEI` (gitignored, s. `.gitignore`).

   VIER HARTE GRENZEN, absichtlich eng gehalten:
     1. Gemerkt wird NUR der PFAD, nie der Inhalt — kein Schlüsselmaterial,
        kein Auszug, kein Fingerabdruck in `MERKDATEI`.
     2. Passphrasen werden NIE gespeichert, NIE geloggt, NIE gemerkt — sie
        bleiben unverändert interaktiv über den bestehenden Weg
        (`mehrerePassphrasenVonStdinLesen` in modul-erzeugen.js; dieses
        Werkzeug sieht sie nie, s. Kopf oben).
     3. `MERKDATEI` bleibt gitignored — geprüft in
        tests/modul-app-signieren-und-packen.test.js.
     4. Dieses Werkzeug SUCHT nicht nach Schlüsseln. Kein Durchsuchen von
        Verzeichnissen, kein Erraten — es merkt sich ausschließlich, was ihm
        einmal ausdrücklich gesagt wurde.

   Verschwindet ein gemerkter Pfad (Datei umbenannt/verschoben/gelöscht), sagt
   das Werkzeug das und fragt neu — es scheitert nicht stumm und rät nicht.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const MERKDATEI = path.join(REPO, 'tools', '.modul-app-signieren-merkdatei.json');

function argWert(argv, name) {
  const i = argv.indexOf(name);
  return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null;
}

function argAlleWerte(argv, name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name && argv[i + 1]) out.push(argv[i + 1]);
  }
  return out;
}

// Reine Argv-Bauer — kein Seiteneffekt, darum ohne Git/Kryptografie testbar (wie im
// Geschwister-Werkzeug tests/modul-app-packen.test.js: „nur die reinen Funktionen … die
// Vorbedingungen selbst sind Seiteneffekte auf einem fremden Klon und gehören nicht in die Suite").
function _erzeugenArgs({ modulPfad, herausgeberId, herausgeberName, herausgeberTyp, ausgabeVdkey, ausstellerZertifikat, ausgabedateiPfad, herausgeberVdkey, herausgeberZertifikat }) {
  const args = [
    path.join(REPO, 'tools', 'modul-erzeugen.js'),
    '--herausgeber-id', herausgeberId,
    '--herausgeber-name', herausgeberName,
    '--herausgeber-typ', herausgeberTyp,
    '--modul', modulPfad,
    '--ausgabe-vdkey', ausgabeVdkey,
    '--ausstellerzertifikat', ausstellerZertifikat,
    '--ausgabedatei', ausgabedateiPfad,
  ];
  if (herausgeberVdkey) args.push('--herausgeber-vdkey', herausgeberVdkey);
  if (herausgeberZertifikat) args.push('--herausgeber-zertifikat', herausgeberZertifikat);
  return args;
}

function _packenArgs({ slug, buendelPfad, push }) {
  const args = [path.join(REPO, 'tools', 'modul-app-packen.js'), '--slug', slug, '--bundle', buendelPfad];
  if (push) args.push('--push');
  return args;
}

// ── Gedächtnis: NUR Pfade, nie Inhalt (Grenze 1) ──────────────────────────────
// Pfad als Argument (Hausregel „Prüfwerkzeuge nehmen den Gegenstand als Argument") —
// testbar gegen eine Wegwerf-Datei, nie gegen die echte MERKDATEI.
function merkeLesen(merkdateiPfad) {
  try {
    const geparst = JSON.parse(fs.readFileSync(merkdateiPfad, 'utf8'));
    return (geparst && typeof geparst === 'object') ? geparst : {};
  } catch (e) { return {}; }
}

// FESTE Allowlist statt `...werte` durchzureichen (Grenze 1, verteidigt gegen einen künftigen
// Aufrufer-Fehler, nicht nur gegen den heutigen Aufruf): selbst wenn `werte` irgendwann versehentlich
// eine Passphrase trüge, landet sie NICHT in der Datei — nur die zwei benannten Schlüssel werden
// je geschrieben, alles andere wird verworfen, nicht durchgereicht.
function merkeSchreiben(merkdateiPfad, werte) {
  const geschrieben = { ausgabeVdkey: werte.ausgabeVdkey || null, ausstellerZertifikat: werte.ausstellerZertifikat || null };
  // { mode: 0o600 } — nur der Besitzer liest/schreibt. Kein Geheimnis hier (Grenze 1: nur
  // Pfade), aber eine überflüssig offene Datei mit internen Ablagepfaden ist trotzdem kein
  // Grund, großzügiger zu sein als nötig.
  fs.writeFileSync(merkdateiPfad, JSON.stringify(geschrieben, null, 1) + '\n', { mode: 0o600 });
}

// Reine Entscheidung, kein Dateisystem-Zugriff außer über die injizierte `pfadExistiert`
// (Default fs.existsSync) — testbar ohne echte Datei. explizit schlägt IMMER gemerkt (Grenze
// „ohne Ausnahme"); ein gemerkter Pfad, der nicht mehr existiert, wird NICHT stillschweigend
// benutzt (Grenze „sagen und neu fragen, nicht stumm scheitern, nicht raten").
function pfadEntscheidung(explizit, gemerkt, pfadExistiert = fs.existsSync) {
  if (explizit) return { wert: explizit, quelle: 'explizit' };
  if (gemerkt && pfadExistiert(gemerkt)) return { wert: gemerkt, quelle: 'gemerkt' };
  if (gemerkt) return { wert: null, quelle: 'gemerkt-verschwunden' };
  return { wert: null, quelle: 'keins' };
}

// EINE readline-Instanz für ALLE offenen Fragen — dasselbe Muster wie
// `mehrerePassphrasenVonStdinLesen` in modul-erzeugen.js, aus demselben Grund (30.08.2026,
// dortiger Fund): zwei sequenzielle `question()`-Aufrufe auf frischen Instanzen funktionieren
// nur bei einem live tippenden Menschen, nicht bei gepipetem/gescripteten stdin.
function mehrerePfadeVonStdinLesen(prompts) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    const antworten = [];
    const naechste = () => {
      if (antworten.length === prompts.length) { rl.close(); resolve(antworten); return; }
      rl.question(prompts[antworten.length], (antwort) => { antworten.push(antwort.trim()); naechste(); });
    };
    naechste();
  });
}

// Löst BEIDE stehenden Pfade auf (explizit > gemerkt > interaktiv fragen) und meldet
// verschwundene gemerkte Pfade, bevor gefragt wird. Reine Orchestrierung um die drei
// Bausteine oben — der Seiteneffekt (stdin) ist injizierbar (Default: echtes stdin).
async function loeseStehendePfadeAuf({ ausgabeVdkeyArg, ausstellerZertifikatArg, merkdateiPfad, fragen = mehrerePfadeVonStdinLesen }) {
  const merke = merkeLesen(merkdateiPfad);
  const ausgabeEnt = pfadEntscheidung(ausgabeVdkeyArg, merke.ausgabeVdkey);
  const ausstellerEnt = pfadEntscheidung(ausstellerZertifikatArg, merke.ausstellerZertifikat);

  if (ausgabeEnt.quelle === 'gemerkt-verschwunden') {
    process.stdout.write('[modul-app-signieren-und-packen] Gemerkter Pfad für --ausgabe-vdkey existiert nicht mehr ('
      + merke.ausgabeVdkey + ') — frage neu.\n');
  }
  if (ausstellerEnt.quelle === 'gemerkt-verschwunden') {
    process.stdout.write('[modul-app-signieren-und-packen] Gemerkter Pfad für --ausstellerzertifikat existiert nicht mehr ('
      + merke.ausstellerZertifikat + ') — frage neu.\n');
  }

  const offen = [];
  if (!ausgabeEnt.wert) offen.push({ feld: 'ausgabeVdkey', text: 'Pfad zum Vivodepot-Ausgabe-Schlüssel (--ausgabe-vdkey): ' });
  if (!ausstellerEnt.wert) offen.push({ feld: 'ausstellerZertifikat', text: 'Pfad zum Ausstellerzertifikat (--ausstellerzertifikat): ' });

  const antworten = offen.length ? await fragen(offen.map((f) => f.text)) : [];
  const werte = { ausgabeVdkey: ausgabeEnt.wert, ausstellerZertifikat: ausstellerEnt.wert };
  offen.forEach((f, i) => { werte[f.feld] = antworten[i] || null; });
  return werte;
}

async function main() {
  const argv = process.argv.slice(2);
  const slug = argWert(argv, '--slug');
  const herausgeberId = argWert(argv, '--herausgeber-id');
  const herausgeberName = argWert(argv, '--herausgeber-name');
  const herausgeberTyp = argWert(argv, '--herausgeber-typ');
  const herausgeberVdkey = argWert(argv, '--herausgeber-vdkey');
  const herausgeberZertifikat = argWert(argv, '--herausgeber-zertifikat');
  const modulPfade = argAlleWerte(argv, '--modul');
  const sprachmodulEn = argv.includes('--sprachmodul-en');
  const push = argv.includes('--push');

  // Die kurzen Pflichtfelder bleiben hart — unverändert, kein Gedächtnis, kein Interaktiv-Weg.
  // Nicht das, was heute Abend das Problem war (die Produktentscheidung verliert lange Pfade, keine IDs).
  if (!slug || !herausgeberId || !herausgeberName || !herausgeberTyp || (!modulPfade.length && !sprachmodulEn)) {
    process.stderr.write('[modul-app-signieren-und-packen] Aufruf: node tools/modul-app-signieren-und-packen.js '
      + '--slug <slug> --herausgeber-id <id> --herausgeber-name <name> --herausgeber-typ <typ> '
      + '[--ausgabe-vdkey <pfad>] [--ausstellerzertifikat <pfad>] (gemerkt/interaktiv, wenn ausgelassen) '
      + '[--herausgeber-vdkey <pfad>] [--herausgeber-zertifikat <pfad>] '
      + '(--modul <pfad> [--modul <pfad> …] | --sprachmodul-en) [--push]\n');
    process.exit(1);
  }

  // Die zwei stehenden, langen Pfade: explizit > gemerkt > interaktiv fragen (Kopfkommentar).
  const { ausgabeVdkey, ausstellerZertifikat } = await loeseStehendePfadeAuf({
    ausgabeVdkeyArg: argWert(argv, '--ausgabe-vdkey'),
    ausstellerZertifikatArg: argWert(argv, '--ausstellerzertifikat'),
    merkdateiPfad: MERKDATEI,
  });
  if (!ausgabeVdkey || !ausstellerZertifikat) {
    process.stderr.write('[modul-app-signieren-und-packen] Ohne --ausgabe-vdkey und --ausstellerzertifikat kann nicht signiert werden.\n');
    process.exit(1);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'modul-app-signieren-'));
  const alleModulPfade = modulPfade.slice();
  if (sprachmodulEn) {
    const { baueModul } = require('./textsatz-en-modul-erzeugen.js');
    const modulPfad = path.join(tmp, 'sprachmodul-en.json');
    const modul = baueModul();
    fs.writeFileSync(modulPfad, JSON.stringify(modul), 'utf8');
    process.stdout.write('[modul-app-signieren-und-packen] Sprachmodul EN gebaut ('
      + Object.keys(modul.texte).length + ' Texte): ' + modulPfad + '\n');
    alleModulPfade.push(modulPfad);
  }

  process.stdout.write('[modul-app-signieren-und-packen] Signiere ' + alleModulPfade.length
    + ' Modul(e) einzeln (tools/modul-erzeugen.js) …\n');
  const buendel = [];
  for (let i = 0; i < alleModulPfade.length; i++) {
    const modulPfad = alleModulPfade[i];
    const buendelPfad = path.join(tmp, 'buendel-' + i + '.json');
    process.stdout.write('[modul-app-signieren-und-packen]   (' + (i + 1) + '/' + alleModulPfade.length + ') '
      + modulPfad + ' …\n');
    const lauf = spawnSync('node', _erzeugenArgs({
      modulPfad, herausgeberId, herausgeberName, herausgeberTyp,
      ausgabeVdkey, ausstellerZertifikat, ausgabedateiPfad: buendelPfad, herausgeberVdkey, herausgeberZertifikat,
    }), { stdio: 'inherit' });
    if (lauf.status !== 0) {
      process.stderr.write('[modul-app-signieren-und-packen] Signieren von ' + modulPfad
        + ' fehlgeschlagen — abgebrochen, nichts gepackt.\n');
      process.exit(1);
    }
    buendel.push(JSON.parse(fs.readFileSync(buendelPfad, 'utf8')));
  }

  const buendelListePfad = path.join(tmp, 'buendel-liste.json');
  fs.writeFileSync(buendelListePfad, JSON.stringify(buendel), 'utf8');

  process.stdout.write('[modul-app-signieren-und-packen] Packe (tools/modul-app-packen.js) …\n');
  const packenLauf = spawnSync('node', _packenArgs({ slug, buendelPfad: buendelListePfad, push }), { stdio: 'inherit' });
  if (packenLauf.status !== 0) {
    process.stderr.write('[modul-app-signieren-und-packen] Packen fehlgeschlagen. Signierte Bündel liegen noch unter: '
      + buendelListePfad + ' — kann von Hand nachgepackt werden.\n');
    process.exit(1);
  }

  // NUR bei Erfolg merken (Kopfkommentar: „Nach einem erfolgreichen Lauf") — ein Lauf, der
  // mit falschen/kaputten Pfaden scheitert, soll sie nicht für den nächsten Versuch einbrennen.
  merkeSchreiben(MERKDATEI, { ausgabeVdkey, ausstellerZertifikat });
  process.stdout.write('[modul-app-signieren-und-packen] Fertig.\n');
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = {
  argAlleWerte, _erzeugenArgs, _packenArgs,
  merkeLesen, merkeSchreiben, pfadEntscheidung, loeseStehendePfadeAuf, MERKDATEI,
};
