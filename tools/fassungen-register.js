#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   fassungen-register.js — der Fingerabdruck (SHA-256) je Fassung und Produkt,
   ERZEUGT, nicht getippt (23.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND: FAQ.md und docs/cra/supportzeitraum-und-eol.md versprachen einen
   veröffentlichten SHA-256 je Fassung. Es gab keinen Ort dafür. BUILD_SHA256 im
   Kern war leer und kann es nur bleiben (eine Datei kann ihren eigenen Hash nicht
   tragen), `vivodepot.html.sha256` deckt den KERN, die Bürgerin bekommt aber ein
   PRODUKT. Die echte Produkt-Prüfsumme stand nur im Rezept auf der Ablage — und das
   wird bei der nächsten Auslieferung überschrieben.

   EIN AUSLIEFERUNGSWEG: Jedes Produkt kommt aus dem Shop (Gateway), die Website trägt
   keine Produktdateien (Entscheidung 03.09.2026, „Öffentlich liegt allein das Gerüst.
   Jedes Produkt … kommt aus dem Shop"). Das Register führt darum genau diesen einen Weg.

   EINE QUELLE: `docs/fassungen-register.json`. Je Zeile Fassung, Produkt, Datum,
   Kanon-Commit, SHA-256 ÜBER DAS AUSGELIEFERTE und die Herkunft der Zeile. ANGEHÄNGT,
   NIE ÜBERSCHRIEBEN: eine Zeile für dasselbe (Fassung, Produkt) mit anderer Prüfsumme
   wirft — sie wird nicht ersetzt.

   ERZEUGT DARAUS: den markierten Block in SECURITY.md und `docs/fassungen.json` (der
   Inhalt der Versionsseite: Fassung, Datum, Prüfsumme je Produkt, Sicherheitshinweise).
   Bauform wie `build-dateipruefsumme.js`: `--build` schreibt, `--check` meldet (pre-commit).

   SICHERHEITSHINWEISE kommen aus CHANGELOG.md, Abschnitt `### Sicherheit` unter der
   Überschrift der Fassung (`## [v1.0-rc.786] – 2026-09-23`; die Zahl nach dem letzten
   Punkt ist die Fassung). WÄCHTER (23.09.2026): steht im Schwachstellen-Register
   (docs/cra/schwachstellen-register.md) eine Zeile mit Status „korrigiert", muss ihre
   Spalte „Korrektur" die Fassung nennen, und CHANGELOG.md muss unter dieser Fassung einen
   Sicherheitshinweis mit ihrer Nummer tragen — sonst ist `--check` rot. Die Sitzung, die
   eine Sicherheitskorrektur landet, schreibt den Hinweis im selben Commit.

   Aufruf:
     node tools/fassungen-register.js --build                 schreibt SECURITY.md-Block und docs/fassungen.json
     node tools/fassungen-register.js --check                 Block/JSON veraltet oder ein Sicherheitshinweis fehlt → Exit 1
     node tools/fassungen-register.js --nachtragen --aus-probe-liste <bericht> --datum JJJJ-MM-TT [--kanon <commit>]
     node tools/fassungen-register.js --nachtragen --aus-sicherung <~/Vivodepot-Rezeptsicherung/<zeit>>
     node tools/fassungen-register.js --live <url> --produkt <slug>   lädt eine öffentliche Datei (Netz, von Hand —
                                                                    nicht in der Suite) und hält sie gegen das Register
     --repo <pfad> lenkt Register, SECURITY.md und docs/ gemeinsam um (Fixturen, Tests).
     --check --security <datei> prüft eine andere SECURITY.md gegen das echte Register (Wächter-Probe).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const REGISTER_DATEI = path.join('docs', 'fassungen-register.json');
const SECURITY_DATEI = 'SECURITY.md';
const CHANGELOG_DATEI = 'CHANGELOG.md';
const SCHWACHSTELLEN_DATEI = path.join('docs', 'cra', 'schwachstellen-register.md');
const FASSUNGEN_JSON = path.join('docs', 'fassungen.json');
const ANFANG = '<!-- fassungen-register:anfang — erzeugt von tools/fassungen-register.js --build, nicht von Hand ändern -->';
const ENDE = '<!-- fassungen-register:ende -->';
const HINWEIS = 'Maschinell angehängt von tools/kern-ausliefern.js bzw. tools/fassungen-register.js --nachtragen, nie überschrieben. '
  + 'SHA-256 über die ausgelieferte Datei (Shop/Gateway, der einzige Auslieferungsweg). Nicht von Hand ändern.';

const registerPfad = (repo) => path.join(repo, REGISTER_DATEI);
function dateiOderLeer(repo, rel) { const p = path.join(repo, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }

function registerLesen(repo) {
  const p = registerPfad(repo);
  if (!fs.existsSync(p)) return { hinweis: HINWEIS, zeilen: [] };
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { hinweis: r.hinweis || HINWEIS, zeilen: r.zeilen || [] };
}

function registerSchreiben(repo, register) {
  fs.mkdirSync(path.dirname(registerPfad(repo)), { recursive: true });
  fs.writeFileSync(registerPfad(repo), JSON.stringify(register, null, 2) + '\n');
}

function zeilePruefen(z) {
  const fehler = [];
  if (!/^v\d+$/.test(z.fassung || '')) fehler.push('fassung „' + z.fassung + '" ist nicht v<zahl>');
  if (!/^[a-z0-9-]+$/.test(z.produkt || '')) fehler.push('produkt fehlt oder ist kein Slug');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(z.datum || '')) fehler.push('datum „' + z.datum + '" ist nicht JJJJ-MM-TT');
  if (!/^[0-9a-f]{64}$/.test(z.sha256 || '')) fehler.push('sha256 ist kein 64-stelliger Hex-Wert');
  if (!z.herkunft) fehler.push('herkunft fehlt');
  if (fehler.length) throw new Error('fassungen-register: Zeile ungültig — ' + fehler.join('; '));
}

const gleicherSchluessel = (a, b) => a.fassung === b.fassung && a.produkt === b.produkt;

/* Hängt Zeilen an. Dasselbe (Fassung, Produkt) mit derselben Prüfsumme: bleibt, wie es ist (ein wiederholter
   Lauf ist kein Fehler). Mit ANDERER Prüfsumme: wirft, bevor irgendetwas geschrieben ist — nie ersetzt.
   Liefert { neu, vorhanden }. */
function zeilenAnhaengen(repo, zeilen) {
  const register = registerLesen(repo);
  const neu = [];
  const vorhanden = [];
  for (const z of zeilen) {
    zeilePruefen(z);
    const alt = register.zeilen.find((a) => gleicherSchluessel(a, z));
    if (alt && alt.sha256 !== z.sha256) {
      throw new Error('fassungen-register: ' + z.fassung + ' ' + z.produkt + ' steht schon mit '
        + alt.sha256.slice(0, 12) + '… — neu wäre ' + z.sha256.slice(0, 12) + '…. Nichts geschrieben: eine ausgelieferte Fassung ändert ihre Prüfsumme nicht.');
    }
    if (alt || neu.some((n) => gleicherSchluessel(n, z))) { vorhanden.push(z); continue; }
    neu.push({ fassung: z.fassung, produkt: z.produkt, datum: z.datum, kanonCommit: z.kanonCommit || null, sha256: z.sha256, herkunft: z.herkunft });
  }
  if (neu.length) {
    register.zeilen.push(...neu);
    registerSchreiben(repo, register);
  }
  return { neu, vorhanden };
}

const standZahl = (fassung) => Number(String(fassung).replace(/^v/, ''));
// Reihenfolge der Produkte: die aus tools/lib/vier-produkte.js — die Zusammensetzung steht an ihren Orten
// (U2-ADR-386), nicht als weitere Liste hier.
let _reihenfolge = null;
const produktReihenfolge = () => (_reihenfolge || (_reihenfolge = require('./lib/vier-produkte.js').PRODUKTE.map((p) => p.slug)));
const produktRang = (p) => { const r = produktReihenfolge(); const i = r.indexOf(p); return i < 0 ? r.length : i; };

/* Neueste Fassung zuerst, Produkte in fester Folge. */
function sortiert(zeilen) {
  return [...zeilen].sort((a, b) => standZahl(b.fassung) - standZahl(a.fassung)
    || produktRang(a.produkt) - produktRang(b.produkt) || a.produkt.localeCompare(b.produkt));
}

function blockText(register) {
  const kopf = [
    ANFANG,
    '',
    'Der Fingerabdruck ist der SHA-256 der Datei, wie sie ausgeliefert wurde. Prüfen: `shasum -a 256 <datei>`',
    '(macOS/Linux) oder `certutil -hashfile <datei> SHA256` (Windows) und mit der Zeile vergleichen.',
    'Fassung = die Zahl nach dem letzten Punkt der Versionsanzeige in Einstellungen → Über (z. B. v1.0-rc.**786**).',
    '',
  ];
  if (!register.zeilen.length) return [...kopf, '*Noch keine Fassung eingetragen.*', '', ENDE].join('\n');
  const zeilen = ['| Fassung | Datum | Produkt | SHA-256 |', '|---|---|---|---|'];
  for (const z of sortiert(register.zeilen)) zeilen.push('| ' + z.fassung + ' | ' + z.datum + ' | ' + z.produkt + ' | `' + z.sha256 + '` |');
  return [...kopf, ...zeilen, '', ENDE].join('\n');
}

/* Ersetzt den Block zwischen den Markern. Fehlen die Marker, wirft es — der Ort des Blocks ist eine
   Entscheidung über das Dokument, nicht eine des Werkzeugs. */
function blockEinsetzen(dokument, block) {
  const a = dokument.indexOf(ANFANG);
  const e = dokument.indexOf(ENDE);
  if (a < 0 || e < a) throw new Error('fassungen-register: die Marker fehlen in ' + SECURITY_DATEI + ' — Block kann nicht eingesetzt werden.');
  return dokument.slice(0, a) + block + dokument.slice(e + ENDE.length);
}

/* ── Sicherheitshinweise (CHANGELOG.md) und ihr Wächter (Schwachstellen-Register) ────────────────── */

// Die Fassung aus einer Versions-Überschrift: „v1.0-rc.786" → v786, „v786" → v786, „Unreleased" → null.
// Die öffentliche Versionsbezeichnung „v1.0" nennt keine Fassung → null. Bis 25.09.2026 las das Muster
// jede Zahl nach einem Punkt und machte aus „v1.0" die Fassung v0.
function fassungAusVersion(label) {
  const m = /^v(\d+)$|-rc\.(\d+)$/.exec(String(label).trim());
  return m ? 'v' + (m[1] || m[2]) : null;
}

// Map Fassung → [Hinweis, …] aus den `### Sicherheit`-Abschnitten. Ein Hinweis ist ein Listenpunkt; Folgezeilen
// (eingerückt) gehören dazu.
function changelogSicherheit(text) {
  const ergebnis = new Map();
  const abschnitte = String(text).split(/^## /m).slice(1);
  for (const a of abschnitte) {
    const kopf = /^\[([^\]]+)\]/.exec(a);
    const fassung = kopf && fassungAusVersion(kopf[1]);
    if (!fassung) continue;
    const s = /^### Sicherheit[^\n]*\n([\s\S]*?)(?=^### |(?![\s\S]))/m.exec(a);
    if (!s) continue;
    const hinweise = [];
    for (const zeile of s[1].split('\n')) {
      if (/^[-*] /.test(zeile)) hinweise.push(zeile.replace(/^[-*] /, '').trim());
      else if (/^\s+\S/.test(zeile) && hinweise.length) hinweise[hinweise.length - 1] += ' ' + zeile.trim();
    }
    if (hinweise.length) ergebnis.set(fassung, (ergebnis.get(fassung) || []).concat(hinweise));
  }
  return ergebnis;
}

// Zeilen des Schwachstellen-Registers mit Status „korrigiert": { nr, korrektur }.
function schwachstellenKorrigiert(text) {
  const zeilen = String(text).split('\n').filter((z) => /^\|/.test(z));
  if (zeilen.length < 2) return [];
  const spalten = zeilen[0].split('|').slice(1, -1).map((s) => s.trim());
  const iNr = spalten.indexOf('Nr.');
  const iStatus = spalten.indexOf('Status');
  const iKorr = spalten.indexOf('Korrektur');
  if (iNr < 0 || iStatus < 0 || iKorr < 0) throw new Error('fassungen-register: Schwachstellen-Register ohne Spalten Nr./Status/Korrektur');
  return zeilen.slice(2).map((z) => z.split('|').slice(1, -1).map((s) => s.trim()))
    .filter((f) => f[iStatus] === 'korrigiert' && f[iNr] && f[iNr] !== '—')
    .map((f) => ({ nr: f[iNr], korrektur: f[iKorr] }));
}

function sicherheitPruefen(changelogText, schwachstellenText) {
  const hinweise = changelogSicherheit(changelogText);
  const befunde = [];
  for (const { nr, korrektur } of schwachstellenKorrigiert(schwachstellenText)) {
    const fassung = (/v\d+(?:\.\d+)*(?:-[a-z]+)?\.(\d+)\b/.exec(korrektur) || /\bv(\d+)\b/.exec(korrektur) || [])[1];
    if (!fassung) { befunde.push('Schwachstelle ' + nr + ' ist korrigiert, aber „Korrektur" nennt keine Fassung (v1.0-rc.<n> oder v<n>)'); continue; }
    const liste = hinweise.get('v' + fassung) || [];
    if (!liste.some((h) => h.includes(nr))) befunde.push('Schwachstelle ' + nr + ' ist in v' + fassung + ' korrigiert, aber CHANGELOG.md trägt dort keinen „### Sicherheit"-Hinweis mit „' + nr + '"');
  }
  return befunde;
}

// Inhalt der Versionsseite. Nur Fassungen, die im Register stehen — was nie ausgeliefert wurde, steht nicht da.
function fassungenJson(register, hinweise) {
  const nachFassung = new Map();
  for (const z of sortiert(register.zeilen)) {
    if (!nachFassung.has(z.fassung)) nachFassung.set(z.fassung, { fassung: z.fassung, datum: z.datum, produkte: [], sicherheitshinweise: hinweise.get(z.fassung) || [] });
    const f = nachFassung.get(z.fassung);
    if (z.datum < f.datum) f.datum = z.datum;
    f.produkte.push({ produkt: z.produkt, sha256: z.sha256 });
  }
  return {
    hinweis: 'Erzeugt von tools/fassungen-register.js --build aus docs/fassungen-register.json und CHANGELOG.md (### Sicherheit). Nicht von Hand ändern. '
      + 'Fassung = die Zahl nach dem letzten Punkt der Versionsanzeige in Einstellungen → Über.',
    fassungen: [...nachFassung.values()],
  };
}

const fassungenJsonText = (repo) => JSON.stringify(fassungenJson(registerLesen(repo), changelogSicherheit(dateiOderLeer(repo, CHANGELOG_DATEI))), null, 2) + '\n';

function pruefen(repo, { securityPfad = null } = {}) {
  const register = registerLesen(repo);
  const dok = fs.readFileSync(securityPfad || path.join(repo, SECURITY_DATEI), 'utf8');
  const befunde = [];
  let soll;
  try { soll = blockEinsetzen(dok, blockText(register)); } catch (e) { befunde.push(e.message); }
  if (soll !== undefined && soll !== dok) befunde.push(SECURITY_DATEI + ': der Fingerabdruck-Block entspricht nicht dem Register — node tools/fassungen-register.js --build');
  if (dateiOderLeer(repo, FASSUNGEN_JSON) !== fassungenJsonText(repo)) befunde.push(FASSUNGEN_JSON + ' entspricht nicht Register + CHANGELOG — node tools/fassungen-register.js --build');
  befunde.push(...sicherheitPruefen(dateiOderLeer(repo, CHANGELOG_DATEI), dateiOderLeer(repo, SCHWACHSTELLEN_DATEI)));
  return befunde;
}

/* Live-Probe: stimmt eine öffentlich abrufbare Datei mit einer eingetragenen Fassung überein? Liefert die
   Fassung(en), deren Zeile für dieses Produkt dieselbe Prüfsumme trägt — oder keine. fetchFn injizierbar. */
async function livePruefen(repo, { url, produkt, fetchFn = globalThis.fetch }) {
  const antwort = await fetchFn(url);
  if (!antwort.ok) throw new Error('fassungen-register --live: ' + url + ' antwortet ' + antwort.status);
  const sha256 = require('node:crypto').createHash('sha256').update(Buffer.from(await antwort.arrayBuffer())).digest('hex');
  const treffer = registerLesen(repo).zeilen.filter((z) => z.produkt === produkt && z.sha256 === sha256);
  return { sha256, fassungen: [...new Set(treffer.map((z) => z.fassung))] };
}

/* ── Nachtrag für bereits Ausgeliefertes, aus den zwei Quellen, die es dafür gibt ─────────────────── */

// Ausgabe von `auslieferung-je-version-lauf.js --probe --liste` (Tabelle „Produkt | … | produkte/v<n>/<slug>.html | sha").
function ausProbeListe(text, { datum, kanonCommit }) {
  const zeilen = [];
  const re = /^\|\s*Produkt\s*\|[^|]*\|\s*`produkte\/(v\d+)\/([a-z0-9-]+)\.html`\s*\|\s*`([0-9a-f]{64})`\s*\|/gm;
  let m;
  while ((m = re.exec(text))) {
    zeilen.push({ fassung: m[1], produkt: m[2], datum, kanonCommit: kanonCommit || null, sha256: m[3],
      herkunft: 'auslieferung-je-version-lauf --probe --liste (vor dem Hochladen gebaut, Nachtrag)' });
  }
  if (!zeilen.length) throw new Error('fassungen-register: die Probe-Liste nennt keine Produkt-Zeile');
  return zeilen;
}

// ~/Vivodepot-Rezeptsicherung/<zeit>/ (tools/lib/rezept-rueckweg.js): die gesicherten Rezepte tragen
// produktPfad und die ZURÜCKGELESENE produktPruefsumme. Datum: die Sicherungszeit ist NICHT das
// Auslieferungsdatum — es kommt aus docs/auslieferung-stand.md (Zeile derselben Fassung), sonst wirft es.
function ausSicherung(ordner, verlaufText) {
  const sicherung = JSON.parse(fs.readFileSync(path.join(ordner, 'sicherung.json'), 'utf8'));
  const zeilen = [];
  for (const e of sicherung.rezepte) {
    if (!e.json) continue;
    const rezept = JSON.parse(fs.readFileSync(path.join(ordner, e.slug + '.json'), 'utf8'));
    if (!rezept.produktPfad || !rezept.produktPruefsumme) continue;   // vor „Bau je Version": kein vorgebautes Produkt
    const m = /^produkte\/(v\d+)\/([a-z0-9-]+)\.html$/.exec(rezept.produktPfad);
    if (!m) throw new Error('fassungen-register: produktPfad „' + rezept.produktPfad + '" hat nicht die Form produkte/v<n>/<slug>.html');
    const v = new RegExp('^\\|\\s*' + m[1] + '\\s*\\|\\s*(\\d{4}-\\d{2}-\\d{2})T[^|]*\\|[^|]*\\|\\s*([0-9a-f]{7,40})', 'm').exec(verlaufText || '');
    if (!v) throw new Error('fassungen-register: ' + m[1] + ' steht nicht in docs/auslieferung-stand.md — ohne Auslieferungsdatum kein Nachtrag');
    zeilen.push({ fassung: m[1], produkt: m[2], datum: v[1], kanonCommit: v[2], sha256: rezept.produktPruefsumme,
      herkunft: 'Rezeptsicherung ' + path.basename(ordner) + ' (Nachtrag)' });
  }
  return zeilen;
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
  const repo = wert('--repo') ? path.resolve(wert('--repo')) : REPO;

  if (argv.includes('--check')) {
    const befunde = pruefen(repo, { securityPfad: wert('--security') ? path.resolve(wert('--security')) : null });
    if (befunde.length) {
      for (const b of befunde) console.error('fassungen-register: ' + b);
      process.exit(1);
    }
    console.log('fassungen-register: SECURITY.md-Block und docs/fassungen.json aktuell, kein fehlender Sicherheitshinweis.');
    return;
  }

  if (wert('--live')) {
    if (!wert('--produkt')) throw new Error('--live braucht --produkt <slug>');
    return livePruefen(repo, { url: wert('--live'), produkt: wert('--produkt') }).then((r) => {
      if (!r.fassungen.length) {
        console.error('fassungen-register --live: ' + wert('--live') + ' hat SHA-256 ' + r.sha256 + ' — in KEINER eingetragenen Fassung von ' + wert('--produkt') + '.');
        process.exitCode = 1;
        return;
      }
      console.log('fassungen-register --live: ' + wert('--produkt') + ' = ' + r.fassungen.join(', ') + ', ' + r.sha256.slice(0, 12) + '…');
    });
  }

  if (argv.includes('--nachtragen')) {
    let zeilen;
    if (wert('--aus-probe-liste')) {
      if (!wert('--datum')) throw new Error('--aus-probe-liste braucht --datum JJJJ-MM-TT (der Tag der Auslieferung)');
      zeilen = ausProbeListe(fs.readFileSync(wert('--aus-probe-liste'), 'utf8'), { datum: wert('--datum'), kanonCommit: wert('--kanon') });
    } else if (wert('--aus-sicherung')) {
      zeilen = ausSicherung(path.resolve(wert('--aus-sicherung')), fs.readFileSync(path.join(repo, 'docs', 'auslieferung-stand.md'), 'utf8'));
    } else throw new Error('--nachtragen braucht --aus-probe-liste oder --aus-sicherung');
    const { neu, vorhanden } = zeilenAnhaengen(repo, zeilen);
    console.log('fassungen-register: ' + neu.length + ' Zeile(n) angehängt, ' + vorhanden.length + ' schon vorhanden.');
    for (const z of neu) console.log('  + ' + z.fassung + ' ' + z.produkt + ' ' + z.sha256.slice(0, 12) + '…');
    return;
  }

  // --build (Vorgabe)
  const register = registerLesen(repo);
  const p = path.join(repo, SECURITY_DATEI);
  const alt = fs.readFileSync(p, 'utf8');
  const neu = blockEinsetzen(alt, blockText(register));
  fs.writeFileSync(p, neu);
  const jsonAlt = dateiOderLeer(repo, FASSUNGEN_JSON);
  const jsonNeu = fassungenJsonText(repo);
  fs.writeFileSync(path.join(repo, FASSUNGEN_JSON), jsonNeu);
  console.log('fassungen-register: ' + SECURITY_DATEI + '-Block ' + (neu === alt ? 'bereits aktuell' : 'neu geschrieben')
    + ', ' + FASSUNGEN_JSON + ' ' + (jsonNeu === jsonAlt ? 'bereits aktuell' : 'neu geschrieben')
    + ' (' + register.zeilen.length + ' Zeile(n)).');
}

if (require.main === module) {
  try {
    const r = main();
    if (r && typeof r.catch === 'function') r.catch((e) => { console.error(e.message); process.exitCode = 1; });
  } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = {
  registerLesen, zeilenAnhaengen, zeilePruefen, sortiert, blockText, blockEinsetzen, pruefen,
  ausProbeListe, ausSicherung, livePruefen, fassungAusVersion, changelogSicherheit, schwachstellenKorrigiert,
  sicherheitPruefen, fassungenJson, fassungenJsonText, FASSUNGEN_JSON, ANFANG, ENDE, REGISTER_DATEI,
};
