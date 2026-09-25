'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   standzahl-frei-pruefen.js — ist eine SCHALEN_STAND-Zahl noch frei, und
   stimmen die vier Träger eines Zweigs untereinander? (U2-ADR-316)
   ────────────────────────────────────────────────────────────────────────────
   ⚠ WAS ES NICHT KANN, und das steht hier oben, nicht unten:

     Es schließt das Fenster NICHT. Zwischen seinem Lauf und dem Push liegt
     weiter das Gate — rund fünf Minuten, in denen jemand anders dieselbe Zahl
     nehmen kann. Es macht die Kollision seltener, nicht unmöglich.

   Ein Werkzeug, das mehr verspricht, als es hält, ist selbst eine
   Deckungs-Suggestion. Der einzige echte Serialisierungspunkt ist die LANDUNG:
   wer beim Vorspulen zweiter ist, sieht die Zahl im Kanon und zieht neu.

   WARUM ES ÜBERHAUPT ENTSTEHT: in der Nacht auf den 06.09.2026 kollidierten
   drei Zweige auf derselben Zahl — jedes Mal NACH korrektem Nachschlagen im
   Kanon. Der Kanon allein reicht nicht: die gefährliche Zahl liegt auf einem
   Zweig, der schon gepusht, aber noch nicht gelandet ist. Und Git fängt das
   nicht — ein non-fast-forward gibt es nur auf DEMSELBEN Zweig, und wir pushen
   auf verschiedene.

   DIE VIER TRÄGER, zweite Prüfung dieses Werkzeugs:

     sw.js  ·  vivodepot.html  ·  STANDARDS.md  ·  docs/faktenbasis.md

   Zweimal in derselben Nacht hingen `STANDARDS.md` und `docs/faktenbasis.md`
   eine Zahl zurück, weil die Erzeuger vor dem Bump liefen. Der
   `schalen-lockstep` fängt das NICHT — er kennt die vier Dateien des
   ausgelieferten Dateisatzes, und `STANDARDS.md` gehört nicht dazu. Für diesen
   Fehler gibt es sonst keinen Wächter. Als ANZEIGE, nicht als Gate: damit ihn
   jemand sieht, BEVOR er den Gate-Lauf startet.

   Aufruf:
     node tools/standzahl-frei-pruefen.js              Anzeige, Exit immer 0
     node tools/standzahl-frei-pruefen.js --zahl 581   Exit 0 = frei, 1 = belegt
     node tools/standzahl-frei-pruefen.js --fixture    gegen die Repo-Fixture,
                                                       ohne Netz und ohne origin
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tools', 'standzahl-frei-fixture.json');

/* Die vier Stellen, an denen die Zahl steht — je Datei das Muster, das sie
   herausschneidet. Gemessen, nicht angenommen (06.09.2026). */
const TRAEGER = Object.freeze([
  { datei: 'sw.js', muster: /vivodepot-shell-v(\d+)/ },
  { datei: 'vivodepot.html', muster: /SCHALEN_STAND = 'v(\d+)'/ },
  { datei: 'STANDARDS.md', muster: /`SCHALEN_STAND` v(\d+)/ },
  { datei: 'docs/faktenbasis.md', muster: /SCHALEN_STAND: v(\d+)/ },
]);

function git(args, stumm) {
  /* `stumm` schluckt stderr: ein `git show ref:datei` auf einem Zweig, der die Datei
     nicht hat, schreibt eine fatal-Zeile — der Aufrufer faengt den Wurf, aber die
     Zeile stuende trotzdem im Protokoll und saehe aus wie ein Fehler des Werkzeugs. */
  return execFileSync('git', args, {
    cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    stdio: stumm ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'pipe'],
  });
}

function zahlAus(inhalt, muster) {
  const m = muster.exec(inhalt || '');
  return m ? Number(m[1]) : null;
}

/* ── Die reine Auswertung. Kennt kein Git, kein Dateisystem — damit die Probe
   sie prüfen kann, ohne ein Repo mit Zweigen zu bauen. ──────────────────── */
function auswerten(kanon, zweige, wunsch) {
  const belegt = new Map();          // Zahl -> [Zweignamen]
  const uneinig = [];
  for (const z of zweige) {
    const werte = TRAEGER.map((t) => (z.staende || {})[t.datei]).filter((v) => v != null);
    const eindeutig = [...new Set(werte)];
    if (eindeutig.length > 1) {
      uneinig.push({ zweig: z.zweig, staende: z.staende });
    }
    /* Die Zahl des Zweigs ist die HÖCHSTE seiner Träger: hinkt einer zurück,
       ist die beanspruchte Zahl trotzdem die neue. Wer nach unten rundete,
       hielte eine belegte Zahl für frei. */
    const zahl = werte.length ? Math.max(...werte) : null;
    if (zahl == null || zahl <= kanon) continue;   // Altzweige tragen Altzahlen — harmlos
    if (!belegt.has(zahl)) belegt.set(zahl, []);
    belegt.get(zahl).push(z.zweig);
  }
  let frei = kanon + 1;
  while (belegt.has(frei)) frei++;
  const urteil = (wunsch == null)
    ? null
    : (wunsch <= kanon ? 'im-kanon' : (belegt.has(wunsch) ? 'belegt' : 'frei'));
  return { kanon, belegt, uneinig, frei, wunsch, urteil };
}

/* ── Die Git-Seite. Liest zuerst NUR sw.js je Zweig (die kleinste der vier) und
   holt die übrigen drei erst für Zweige, die überhaupt in Frage kommen — sonst
   wären es vier `git show` je Zweig, und davon gibt es Dutzende. ────────── */
function zweigeAusGitLesen(kanonZahl) {
  const refs = git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'])
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((r) => r !== 'origin/HEAD');
  const zweige = [];
  for (const ref of refs) {
    try {
      git(['merge-base', '--is-ancestor', ref, 'origin/u2-kanon'], true);
      continue;                                       // schon gelandet
    } catch (_) { /* nicht gelandet — weiter */ }
    let sw = null;
    try { sw = zahlAus(git(['show', ref + ':sw.js'], true), TRAEGER[0].muster); } catch (_) { sw = null; }
    if (sw == null || sw <= kanonZahl) continue;      // Altzweig oder ohne Zahl
    const staende = { 'sw.js': sw };
    for (const t of TRAEGER.slice(1)) {
      try { staende[t.datei] = zahlAus(git(['show', ref + ':' + t.datei], true), t.muster); } catch (_) { /* Datei fehlt */ }
    }
    zweige.push({ zweig: ref, staende });
  }
  return zweige;
}

function kanonZahlLesen() {
  return zahlAus(git(['show', 'origin/u2-kanon:sw.js']), TRAEGER[0].muster);
}

function fixtureLesen() {
  const d = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  return { kanon: d.kanon, zweige: d.zweige };
}

function main() {
  const argv = process.argv.slice(2);
  const wunsch = argv.includes('--zahl') ? Number(argv[argv.indexOf('--zahl') + 1]) : null;
  const nurFixture = argv.includes('--fixture');

  let kanon, zweige, quelle;
  if (nurFixture) {
    ({ kanon, zweige } = fixtureLesen());
    quelle = 'Fixture (' + path.relative(REPO, FIXTURE) + ')';
  } else {
    try {
      git(['fetch', '-q', 'origin']);
      kanon = kanonZahlLesen();
      zweige = zweigeAusGitLesen(kanon);
      quelle = 'origin/u2-kanon';
    } catch (e) {
      /* Kein Netz, kein origin, kein Repo — die Fixture ist der Rückfall, damit
         die Suite dieses Werkzeug auch ohne Netz prüfen kann. */
      ({ kanon, zweige } = fixtureLesen());
      quelle = 'Fixture (kein origin erreichbar: ' + String(e.message).split('\n')[0] + ')';
    }
  }

  const r = auswerten(kanon, zweige, Number.isFinite(wunsch) ? wunsch : null);

  console.log('Quelle: ' + quelle);
  console.log('Kanon trägt: v' + r.kanon);
  console.log('');
  if (!r.belegt.size) {
    console.log('Kein ungelandeter Zweig beansprucht eine Zahl über v' + r.kanon + '.');
  } else {
    console.log('Beansprucht, aber NICHT gelandet:');
    for (const [zahl, namen] of [...r.belegt.entries()].sort((a, b) => a[0] - b[0])) {
      console.log('  v' + zahl + '  ' + namen.join(', '));
    }
  }
  console.log('');
  console.log('Nächste freie Zahl: v' + r.frei);

  if (r.uneinig.length) {
    console.log('');
    console.log('⚠ TRÄGER UNEINIG — hier hängt eine Datei zurück (kein Wächter fängt das):');
    for (const u of r.uneinig) {
      console.log('  ' + u.zweig);
      for (const t of TRAEGER) {
        const v = u.staende[t.datei];
        console.log('     ' + t.datei.padEnd(20) + (v == null ? '(fehlt)' : 'v' + v));
      }
    }
    console.log('  Erzeuger nach dem Bump erneut laufen lassen, dann `git add`.');
  }

  if (r.urteil) {
    console.log('');
    if (r.urteil === 'frei') { console.log('v' + r.wunsch + ' ist frei.'); process.exit(0); }
    if (r.urteil === 'im-kanon') { console.log('v' + r.wunsch + ' liegt im Kanon oder darunter — belegt.'); process.exit(1); }
    console.log('v' + r.wunsch + ' ist BELEGT: ' + r.belegt.get(r.wunsch).join(', '));
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { auswerten, zahlAus, TRAEGER };
