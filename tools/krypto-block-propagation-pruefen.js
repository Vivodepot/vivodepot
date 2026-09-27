'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-krypto-propagation — die VOLLSTÄNDIGKEIT der Block-Propagation
   ────────────────────────────────────────────────────────────────────────
   WARUM ES DIESEN PRÜFER GIBT, und warum die bestehenden Klasse-A-Wächter
   ihn nicht ersetzen:

   Die bestehenden Wächter prüfen je EINE bekannte Datei gegen den Pin
   (`load-kern`, `load-lesen`, `load-issuer`, `load-generator`, T-CROSS-07,
   `krypto-gate`). Sie sind scharf — aber sie kennen ihre Liste auswendig.
   Eine SECHSTE Datei, die den Block trägt und die niemand in eine Liste
   eingetragen hat, macht keinen einzigen von ihnen rot; eine Pin-Stelle, die
   beim Wechsel vergessen wurde, ebenso wenig, solange kein Test sie liest.

   Genau dieser Zustand — halb propagiert, und keine Probe sieht es — ist der,
   gegen den der Block-Vertrag steht. Dieser Prüfer sucht darum den Gegenstand,
   nicht seinen Namen: er GEHT DAS REPO AB und findet Träger und Pin-Stellen
   selbst, statt sie aufzuzählen.

   Drei Prüfungen:
     1 · TRÄGER      — jede Datei, die den VdCrypto-Block trägt, trägt ihn
                       byte-identisch zu `vivodepot-krypto-kern-PORT-VERBATIM.js`.
     2 · VOLL-PINS   — jedes 64-stellige Hex-Literal, das an einen Block-Pin-
                       Namen gebunden ist (`BLOCK_HASH_*`, `*_PIN`) ODER in
                       Prosa auf einer Block-Zeile steht, ist der aktuelle Hash.
     3 · KURZ-PINS   — jede Kurzform (`612357e7…`) auf einer Zeile, die den
                       Block/Pin/Hash nennt, ist ein Präfix des aktuellen Hashes.

   AUSGENOMMEN sind Dokumente, die VERGANGENHEIT festhalten (ADRs, ARBEITSLISTE),
   und Zeilen, die sich selbst als Historie ausweisen („davor", „alter Pin", oder
   eine Kette mit mehreren Hashes auf einer Zeile). Ein ADR vom 18.06.2026, das
   „Block-Pin `8d31c678…` unverändert" sagt, war damals richtig und bleibt es;
   es nachzuziehen hiesse, die Historie zu fälschen. Die laufende Pin-Kette steht
   in den Nachträgen von U2-ADR-066.

   Prüfung 2/3 sind die, die am 19.08.2026 achtzehn Kurz- und Prosa-Hashes fanden,
   die ZWEI Pin-Wechsel überlebt hatten — in vier ausgelieferten Anwendungen, vier
   Testdateien, vier Dokumenten und einem CI-Workflow —, weil kein Test sie liest.

   Aufruf:
     node tools/krypto-block-propagation-pruefen.js            (prüft dieses Repo)
     node tools/krypto-block-propagation-pruefen.js --karte    (druckt die Karte)
     node tools/krypto-block-propagation-pruefen.js --repo <pfad>
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const PORT_VERBATIM = 'vivodepot-krypto-kern-PORT-VERBATIM.js';
// Die Signatur(en), an der/denen ein Träger erkannt wird — der Gegenstand, nicht der
// Dateiname. ZWEI Formen (18.09.2026, Krypto-Kapselung Weg A): die alte
// (`const VdCrypto = Object.freeze`, direktes Objekt) UND die neue (`const VdCrypto =
// (function`, IIFE-Kapselung des Sitzungsschlüssels). Ein einzelner String hätte diesen
// Prüfer für GENAU DIE ÄNDERUNG blind gemacht, die er sehen soll — gemessen: nach der
// Kapselung von vivodepot.html allein fiel der Kern lautlos aus der Trägerliste, und der
// Lauf meldete trotzdem „✓ vollständig", weil die übrigen (noch alten) Träger weiter
// untereinander übereinstimmten. Beide Formen bleiben dauerhaft erkannt — nicht nur für
// die Übergangszeit —, damit ein künftiger Wechsel der Bauform denselben Fehler nicht
// wiederholt, ohne dass jemand diese Datei dafür erneut anfassen muss.
const TRAEGER_SIGNATUREN = ['const VdCrypto = Object.freeze', 'const VdCrypto = (function'];
// MINDESTZAHL (dieselbe Lehre, strukturell): eine SINKENDE Trägerzahl ist selbst ein Befund,
// nicht nur eine Abweichung zwischen den gefundenen Trägern. Gemessen, 18.09.2026: sechs
// echte Träger (vivodepot.html, vivodepot-krypto-kern-PORT-VERBATIM.js, vivodepot-lesen.html,
// vivodepot-schluessel-teilen.html, vivodepot-template-generator.html, vivodepot-vc-issuer.html)
// — kein geschätzter Wert, per `--karte` nachgezählt. Sinkt die Zahl (Signatur-Wechsel ohne
// Nachzug, eine vergessene Datei, ein stiller Rauswurf), wird der Lauf ROT statt weiter
// „vollständig" zu melden. Ein STEIGEN ist erlaubt (eine neue Nebenanwendung, die den Block
// legitim mitbringt) — dann diese Zahl bewusst nachziehen, mit Begründung im Commit.
const TRAEGER_MINDESTZAHL = 6;
const RELEVANT = /\.(html|js|mjs|cjs|json|md|yml|yaml)$/;

const HISTORISCH = [/^docs\/adr\//, /^docs\/ARBEITSLISTE-v1\.md$/];
/* SELBSTBEZUG — zwei Dateien, namentlich, kein Muster. Der Prüfer und seine
   Proben MÜSSEN Block-Signatur und Beispiel-Hashes im Klartext enthalten; das
   ist ihr Gegenstand, nicht ihr Fehler. Ein Muster (`tools/*`) statt zweier
   Namen würde hier still eine ganze Ebene ausblenden. */
const SELBSTBEZUG = new Set([
  'tools/krypto-block-propagation-pruefen.js',
  'tests/krypto-block-propagation.test.js',
  /* Die Fixtur der Probe zu W-krypto-harness: eine KOPIE des Harness mit
     absichtlich verbogenem Pin. Sie ist flüchtig, wird nie ausgeliefert und
     trägt den falschen Hash als Gegenstand. Namentlich, nicht als Muster —
     ein Muster `.waechterprobe-tmp-*` hätte auch die Fixtur DIESES Prüfers
     ausgeblendet und seine eigene Probe still grün gemacht. */
  'tools/.waechterprobe-tmp-harness.js',
]);
/* Zeilen, die sich SELBST als Historie ausweisen. Der Pfeil allein GENÜGT NICHT
   als Marker: er steht auch in gewöhnlicher Prosa („Block-Übergang → Block-Hash
   … bleibt"). Eine Kette erkennt der Prüfer daran, dass MEHRERE Hashes auf
   derselben Zeile stehen. */
const HISTORIE_WORT = /davor|vorher|abgelöst|abgeloest|[Aa]lter Pin|war\s+`/;
/* Nur Zeilen, die überhaupt vom Block reden, tragen einen Pin. */
/* „SHA-256" allein ist kein Blockbezug (23.09.2026): die Prüfsumme einer beliebigen Datei in Prosa — etwa die des Inter-ZIPs
   in NOTICE.md — machte den Prüfer rot. Ein Block-Pin wird jetzt zusätzlich AM WERT erkannt (s. blockHashGeschichte). */
const PIN_KONTEXT = /Block|VdCrypto|Pin|Hash-Gate/;
const VOLLPIN_BINDUNG = /(BLOCK_HASH[A-Z_]*|[A-Z_]*_PIN)\s*=\s*'([0-9a-f]{64})'/g;
const VOLLPIN_PROSA = /\b([0-9a-f]{64})\b/g;
const KURZ_MIT_PUNKTEN = /\b([0-9a-f]{6,8})(?:…|\.\.\.)/g;
/* Ein Kurz-Hash OHNE Auslassung, aber unmittelbar an „Block-Hash"/„Block-Pin"
   gebunden — die Schreibweise, mit der `6eb590b9` in vivodepot.html zwei
   Pin-Wechsel überlebt hat, weil kein Muster mit Auslassung ihn traf. */
const KURZ_OHNE_PUNKTE = /Block-(?:Hash|Pin)\s+`?([0-9a-f]{6,8})\b(?!…)/g;

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

function ersterScriptBlock(html) {
  const OPEN = '<script>', CLOSE = '</script>';
  const o = html.indexOf(OPEN);
  if (o < 0) return null;
  const oe = o + OPEN.length;
  const c = html.indexOf(CLOSE, oe);
  if (c < 0) return null;
  const b = html.slice(oe, c);
  return b.startsWith('\n') ? b.slice(1) : b;
}

/* Im echten Repo `git ls-files` — nur so bleiben ignorierte Laufzeit-Artefakte
   draussen (eine `.axe-region-probe-*.html` ist eine Kopie des Kerns und wäre
   sonst ein Phantom-Träger). Fixtures sind keine Git-Bäume: dort wird gelaufen.

   `--others --exclude-standard` nimmt UNGETRACKTE, nicht ignorierte Dateien mit,
   und das ist kein Detail: ohne sie sähe der Prüfer eine frisch angelegte, noch
   nicht hinzugefügte Datei nicht — und die Probe, die ihn selbst prüft, wäre
   still grün, weil ihre Fixtur ungetrackt ist. */
function dateienListen(repo) {
  try {
    execFileSync('git', ['-C', repo, 'rev-parse', '--is-inside-work-tree'], { env: ohneGitUmgebung(), stdio: 'ignore' });
    const aus = execFileSync('git', ['-C', repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 });
    return [...new Set(aus.toString('utf8').split('\0').filter(Boolean))];
  } catch {
    const raus = [];
    const skip = new Set(['node_modules', '.git', 'test-results', 'playwright-report']);
    (function walk(d, praefix) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (skip.has(e.name)) continue;
        const rel = praefix ? praefix + '/' + e.name : e.name;
        if (e.isDirectory()) walk(path.join(d, e.name), rel);
        else raus.push(rel);
      }
    })(repo, '');
    return raus;
  }
}

/* Jeder frühere Block-Hash: SHA-256 jeder Fassung von PORT_VERBATIM in der Git-Geschichte. Ohne Git (Auszug, Fixture) leer. */
function blockHashGeschichte(repo) {
  try {
    const commits = execFileSync('git', ['-C', repo, 'log', '--format=%H', '--', PORT_VERBATIM], { env: ohneGitUmgebung(), encoding: 'utf8' }).split('\n').filter(Boolean);
    const raus = new Set();
    for (const c of commits) {
      try { raus.add(sha256(execFileSync('git', ['-C', repo, 'show', c + ':' + PORT_VERBATIM], { env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))); } catch { /* in diesem Commit gelöscht */ }
    }
    return raus;
  } catch { return new Set(); }
}

function pruefe(repo, { geschichte } = {}) {
  const KANON = fs.readFileSync(path.join(repo, PORT_VERBATIM), 'utf8');
  const AKTUELL = sha256(KANON);
  const FRUEHER = new Set([...(geschichte || blockHashGeschichte(repo))].filter((h) => h !== AKTUELL));
  const traeger = [], vollPins = [], kurzPins = [], fehler = [];

  for (const rel of dateienListen(repo)) {
    if (!RELEVANT.test(rel)) continue;
    if (SELBSTBEZUG.has(rel)) continue;

    let s;
    try { s = fs.readFileSync(path.join(repo, rel), 'utf8'); } catch { continue; }

    /* ── 1 · TRÄGER ──────────────────────────────────────────────────── */
    if (TRAEGER_SIGNATUREN.some((sig) => s.includes(sig))) {
      let block, quelle;
      if (rel === PORT_VERBATIM) { block = s; quelle = 'kanonische Quelle'; }
      else if (rel.endsWith('.html')) { block = ersterScriptBlock(s); quelle = 'erster <script>-Block'; }
      else { block = null; quelle = 'unbekannte Trägerform'; }
      traeger.push({ datei: rel, quelle, hash: block === null ? null : sha256(block) });
      if (block === null) {
        fehler.push(`TRÄGER ${rel}: trägt die Block-Signatur, aber der Block ist nicht ausschneidbar (${quelle}).`);
      } else if (block !== KANON) {
        fehler.push(`TRÄGER ${rel}: Block NICHT byte-identisch zu ${PORT_VERBATIM} (${sha256(block).slice(0, 8)}… statt ${AKTUELL.slice(0, 8)}…).`);
      }
    }

    /* ── 2 · VOLL-PINS (an einen Namen gebunden) ─────────────────────── */
    VOLLPIN_BINDUNG.lastIndex = 0;
    let m;
    while ((m = VOLLPIN_BINDUNG.exec(s)) !== null) {
      const zeile = s.slice(0, m.index).split('\n').length;
      vollPins.push({ datei: rel, zeile, name: m[1], wert: m[2] });
      if (m[2] !== AKTUELL) {
        fehler.push(`VOLL-PIN ${rel}:${zeile} (${m[1]}): ${m[2].slice(0, 8)}… != aktueller Block-Hash ${AKTUELL.slice(0, 8)}….`);
      }
    }

    /* ── 3 · PROSA-PINS und KURZ-PINS ────────────────────────────────── */
    if (HISTORISCH.some((re) => re.test(rel))) continue;
    s.split('\n').forEach((z, i) => {
      // Am WERT, ohne Kontextwort: ein früherer Block-Hash außerhalb historischer Dokumente ist ein veralteter Pin.
      VOLLPIN_PROSA.lastIndex = 0;
      const frueher = [...z.matchAll(VOLLPIN_PROSA)].map((k) => k[1]).filter((h) => FRUEHER.has(h));
      if (frueher.length) {
        for (const h of frueher) fehler.push(`VOLL-PIN (Wert) ${rel}:${i + 1}: ${h.slice(0, 8)}… ist ein früherer Block-Hash, der aktuelle ist ${AKTUELL.slice(0, 8)}… — Zeile: ${z.trim().slice(0, 110)}`);
        return;
      }
      // Der aktuelle Wert macht die Zeile zur Pin-Zeile: sie durchläuft genau dieselben Regeln wie eine mit Kontextwort.
      if (!PIN_KONTEXT.test(z) && !z.includes(AKTUELL)) return;

      VOLLPIN_PROSA.lastIndex = 0;
      const voll = [...z.matchAll(VOLLPIN_PROSA)].map((k) => k[1]);
      if (voll.length === 1 && !HISTORIE_WORT.test(z) && !VOLLPIN_BINDUNG.test(z)) {
        VOLLPIN_BINDUNG.lastIndex = 0;
        vollPins.push({ datei: rel, zeile: i + 1, name: 'Prosa', wert: voll[0] });
        if (voll[0] !== AKTUELL) {
          fehler.push(`VOLL-PIN (Prosa) ${rel}:${i + 1}: ${voll[0].slice(0, 8)}… != aktueller Block-Hash ${AKTUELL.slice(0, 8)}… — Zeile: ${z.trim().slice(0, 110)}`);
        }
      }
      VOLLPIN_BINDUNG.lastIndex = 0;

      const roh = [];
      KURZ_MIT_PUNKTEN.lastIndex = 0;
      for (const k of z.matchAll(KURZ_MIT_PUNKTEN)) roh.push(k[1]);
      KURZ_OHNE_PUNKTE.lastIndex = 0;
      for (const k of z.matchAll(KURZ_OHNE_PUNKTE)) if (!roh.includes(k[1])) roh.push(k[1]);
      if (!roh.length) return;
      if (HISTORIE_WORT.test(z) || roh.length > 1) return;   // Historie oder Pin-Kette
      const kurz = roh[0];
      kurzPins.push({ datei: rel, zeile: i + 1, wert: kurz });
      if (!AKTUELL.startsWith(kurz)) {
        fehler.push(`KURZ-PIN ${rel}:${i + 1}: \`${kurz}…\` ist kein Präfix des aktuellen Block-Hashes ${AKTUELL.slice(0, 8)}… — Zeile: ${z.trim().slice(0, 110)}`);
      }
    });
  }
  return { aktuell: AKTUELL, traeger, vollPins, kurzPins, fehler };
}

/* Eine SINKENDE Trägerzahl ist selbst ein Befund (18.09.2026) — nicht nur eine
   Abweichung zwischen den gefundenen Trägern. Ohne diese Prüfung wäre ein Lauf „✓
   vollständig" gewesen, selbst als ein Signatur-Wechsel den Kern lautlos aus der Liste
   fallen ließ (genau der Fund, der zu TRAEGER_SIGNATUREN/TRAEGER_MINDESTZAHL führte).

   BEWUSST NICHT in `pruefe()` selbst: die Funktion ist der wiederverwendbare, an
   ERFUNDENEN Fixtures geprüfte Kern (s. tests/krypto-block-propagation.test.js) — ein
   Fixture mit zwei synthetischen Trägern ist kein Befund, nur ein kleiner Testfall.
   Die Mindestzahl gilt für EINEN bestimmten Gegenstand (dieses Repo), nicht für jeden
   Baum, den `pruefe()` je prüft — sie gehört darum an den CLI-Rand (`main()` unten,
   nur wenn kein `--repo` einen anderen Baum vorschreibt), nicht in die geprüfte
   Funktion selbst. */
function traegerzahlPruefen(traegerAnzahl) {
  if (traegerAnzahl >= TRAEGER_MINDESTZAHL) return null;
  return `TRÄGERZAHL: ${traegerAnzahl} gefunden, mindestens ${TRAEGER_MINDESTZAHL} erwartet — `
    + 'eine Datei ist aus der Erkennung gefallen (Signatur-Wechsel ohne Nachzug? vergessene Datei?), '
    + 'nicht nur ein Wert, der von den anderen abweicht.';
}

/* ════════════════════════════════════════════════════════════════════════
   ANHANG — Die `.vdkey`-Hüllenschicht (U2-ADR-218)
   ────────────────────────────────────────────────────────────────────────
   Derselbe Fund wie beim Kernblock oben, an einer zweiten Stelle: eine
   Erhebung (02.09.2026, Auftrag über alle Nebenanwendungen) fand
   `schuetzeSchluesselJwk`/`entschluesseleSchluesselJwk`/
   `_aadFuerSchluesselhuelle`/`PROTECTED_KEY_MARKER_VERSION` zwischen
   Zertifikator und Teiler dupliziert (von Hand wortgleich übernommen, s.
   Kommentar in vivodepot-schluessel-teilen.html, „Der Teiler sichert
   geschützt", 23.08.2026) — heute byte-identisch, aber nur BEHAVIORAL
   abgesichert (`tests/teiler-geschuetzt-sichern.test.js` prüft, dass ein
   Rundlauf funktioniert, nicht, dass die Quelltexte übereinstimmen). Ein
   „beide funktionieren noch, sind aber im Detail auseinandergelaufen"-Fall
   würde diesen Rundlauf nicht brechen.

   KEINE gefundene Entscheidung erklärt, warum diese vier Stücke außerhalb
   des gehash­ten VdCrypto-Blocks stehen (geprüft: `docs/adr/` und die
   Teiler-Isolations-Entscheidung vom 23.08.2026 nennen nur den Block
   selbst). Darum hier der kleinere Eingriff — ein EIGENER Abschnitt in
   diesem Werkzeug, NICHT eine Verschmelzung mit dem gepinnten Block: die
   Hüllenschicht ist kein einziges Objekt wie `VdCrypto`, sondern vier
   benannte Stücke, von denen nicht jedes bei jedem Träger vorkommt (der
   Teiler kann nur schützen, nicht öffnen — `entschluesseleSchluesselJwk`
   fehlt ihm bewusst).

   Prüfung: unter den Trägern, die ein Stück FÜHREN, ist es byte-/wertgleich.
   Ein Stück mit nur einem gefundenen Träger ist per Definition identisch
   mit sich selbst — kein Fehlalarm, kein „muss überall vorkommen"-Zwang
   (anders als beim Kernblock gibt es keine kanonische Pflicht-Quelle).

   NACHTRAG 03.09.2026 (Auftrag, Zug 1 der Signierungs-Automatisierung,
   Nebenfund aus der Zug-0-Messung): `_signJWS` — die eigentliche Signatur-
   Operation der ganzen Zertifikatskette — lag in VIER byte-identischen, aber
   UNBEWACHTEN Kopien (`vivodepot-vc-issuer.html`, `vivodepot-template-
   generator.html`, `vivodepot.html`, `vivodepot-lesen.html`). Anders als die
   vier Hüllenschicht-Stücke oben ist sie kein Nebenwerkzeug, sondern der Punkt,
   an dem eine künftige HSM-Anbindung ansetzen würde — Drift hier wäre die
   teuerste Sorte. Derselbe Mechanismus (Funktionskörper extrahieren, unter den
   gefundenen Trägern byte-gleich verlangen), keine zweite Implementierung.

   NACHTRAG 04.09.2026 (U2-ADR-249, Zuschnitt Sperrposten 1 — `.vdkey`-Allowlist):
   `istGeschuetzteSchluesseldatei` — genau die Funktion, deren Versionsprüfung von strikter
   Gleichheit auf eine Allowlist umgestellt wurde — stand als einziges Hüllen-Stück NICHT unter
   diesem Wächter. Vorarbeit vor der Aufnahme: die zwei Kopien nannten den Parameter bisher
   unterschiedlich (`parsed` im Zertifikator, `geparst` im Teiler) — auf `geparst` vereinheitlicht
   (Mehrheitsform in beiden Dateien), sonst wäre der Wächter mit der Aufnahme sofort rot gegangen,
   ohne dass sich am Verhalten etwas geändert hätte. Die neue Konstante
   `PROTECTED_KEY_VERSION_ALLOWLIST` tritt neben `PROTECTED_KEY_MARKER_VERSION` — beide bleiben
   geführt, die eine ist die Schreib-, die andere die Lese-/Prüf-Fassung. */
const HUELLE_FUNKTIONEN = ['schuetzeSchluesselJwk', 'entschluesseleSchluesselJwk', '_aadFuerSchluesselhuelle', '_signJWS', 'istGeschuetzteSchluesseldatei'];
const HUELLE_KONSTANTEN = ['PROTECTED_KEY_MARKER_VERSION', 'PROTECTED_KEY_VERSION_ALLOWLIST'];

function funktionsKoerper(text, name) {
  const re = new RegExp('(?:async )?function ' + name + '\\([^)]*\\)\\s*\\{');
  const m = re.exec(text);
  if (!m) return null;
  let i = m.index + m[0].length, tiefe = 1, start = i;
  while (tiefe > 0 && i < text.length) {
    if (text[i] === '{') tiefe++;
    else if (text[i] === '}') tiefe--;
    i++;
  }
  if (tiefe !== 0) return null;
  return m[0] + text.slice(start, i);
}

function konstantenWert(text, name) {
  const m = new RegExp('const\\s+' + name + '\\s*=\\s*([^;]+);').exec(text);
  return m ? m[1].trim() : null;
}

function pruefeHuelle(repo) {
  const funde = {};
  for (const name of [...HUELLE_FUNKTIONEN, ...HUELLE_KONSTANTEN]) funde[name] = [];

  for (const rel of dateienListen(repo)) {
    if (!RELEVANT.test(rel)) continue;
    if (SELBSTBEZUG.has(rel)) continue;
    let s;
    try { s = fs.readFileSync(path.join(repo, rel), 'utf8'); } catch { continue; }

    for (const name of HUELLE_FUNKTIONEN) {
      const koerper = funktionsKoerper(s, name);
      if (koerper !== null) funde[name].push({ datei: rel, wert: koerper });
    }
    for (const name of HUELLE_KONSTANTEN) {
      const wert = konstantenWert(s, name);
      if (wert !== null) funde[name].push({ datei: rel, wert });
    }
  }

  const fehler = [];
  for (const [name, traeger] of Object.entries(funde)) {
    if (traeger.length < 2) continue;
    const kanon = traeger[0];
    for (const t of traeger.slice(1)) {
      if (t.wert !== kanon.wert) {
        fehler.push(`HÜLLE ${name}: ${t.datei} weicht von ${kanon.datei} ab (nicht byte-/wertgleich).`);
      }
    }
  }
  return { funde, fehler };
}

module.exports = {
  pruefe, blockHashGeschichte, sha256, ersterScriptBlock, PORT_VERBATIM, TRAEGER_SIGNATUREN, TRAEGER_MINDESTZAHL,
  traegerzahlPruefen,
  pruefeHuelle, funktionsKoerper, konstantenWert, HUELLE_FUNKTIONEN, HUELLE_KONSTANTEN,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--repo');
  const REPO_DEFAULT = path.join(__dirname, '..');
  const repo = i >= 0 ? path.resolve(argv[i + 1]) : REPO_DEFAULT;
  const r = pruefe(repo);
  // Mindestzahl NUR gegen den eigenen, echten Baum — ein `--repo` auf einen anderen
  // (z. B. einen fremden Klon) prüft gegen dessen eigenen Bestand, nicht gegen unseren.
  if (repo === REPO_DEFAULT) {
    const traegerzahlBefund = traegerzahlPruefen(r.traeger.length);
    if (traegerzahlBefund) r.fehler.push(traegerzahlBefund);
  }
  console.log(`Aktueller VdCrypto-Block-Hash: ${r.aktuell}`);
  console.log(`Träger: ${r.traeger.length} · Voll-Pins: ${r.vollPins.length} · Kurz-Pins: ${r.kurzPins.length}`);
  if (argv.includes('--karte')) {
    console.log('\n── TRÄGER ──');
    for (const t of r.traeger) console.log(`  ${t.datei}  (${t.quelle})  ${t.hash ? t.hash.slice(0, 8) + '…' : 'nicht ausschneidbar'}`);
    console.log('\n── VOLL-PINS ──');
    for (const p of r.vollPins) console.log(`  ${p.datei}:${p.zeile}  ${p.name} = ${p.wert.slice(0, 8)}…`);
    console.log('\n── KURZ-PINS (ohne historische Dokumente) ──');
    for (const p of r.kurzPins) console.log(`  ${p.datei}:${p.zeile}  ${p.wert}…`);
  }

  const h = pruefeHuelle(repo);
  console.log(`\nHüllenschicht (.vdkey): ${Object.entries(h.funde).map(([n, t]) => n + '=' + t.length).join(' · ')}`);
  if (argv.includes('--karte')) {
    console.log('\n── HÜLLENSCHICHT-TRÄGER ──');
    for (const [name, traeger] of Object.entries(h.funde)) {
      for (const t of traeger) console.log(`  ${name}  ${t.datei}`);
    }
  }

  const alleFehler = [...r.fehler, ...h.fehler];
  if (alleFehler.length) {
    console.error(`\n✗ ${alleFehler.length} Befund(e):`);
    for (const f of alleFehler) console.error('  · ' + f);
    process.exit(1);
  }
  console.log('\n✓ Block-Propagation vollständig: jeder Träger byte-identisch, jede Pin-Stelle auf dem aktuellen Hash.');
  console.log('✓ Hüllenschicht vollständig: jedes gefundene Stück ist unter seinen Trägern byte-/wertgleich.');
}
