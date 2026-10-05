'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Krypto-Verbote a–c: kein privater oder geheimer Schlüssel ist herausholbar, außer an einer begründeten Stelle
   ────────────────────────────────────────────────────────────────────────
   Befund JWK-IN-STATE (19.09.2026; geschlossen 04.10.2026): der private Empfangsschlüssel lag als Klartext-JWK im Zustand
   des Studios. Der Einzelfix (ein Tresor) hielt nur die eine Stelle; dieser Wächter hält die Klasse.

   (a) GEPRÜFT WIRD JEDE Wurzel-`*.html` — nicht eine Liste. Eine neue Seite zählt von selbst mit; die Auslieferungsliste
       (scripts/ausgeliefertes-dateiset.js) muss darin enthalten sein.
   (b) Jedes `subtle.generateKey(…)` und `subtle.importKey(…)` mit einer privaten oder geheimen Verwendung (sign, decrypt,
       encrypt, deriveBits, deriveKey, unwrapKey, wrapKey) trägt `extractable` = `false`.
   (c) Jedes `subtle.exportKey(…)`, das nicht nachweislich einen öffentlichen Schlüssel (`….publicKey`) exportiert, steht
       mit Datei, Funktion und Grund in tools/krypto-export-positivliste.json.
       Ebenso jedes im Code gebaute private JWK (ein Objekt-Literal mit `kty` und `d`, etwa aus einem Shamir-Geheimnis) —
       ein privater Schlüssel kann die Seite auch verlassen, ohne je durch exportKey zu gehen (Regel `jwkMitD`).
       Ebenso jede Serialisierung eines privaten JWK (`JSON.stringify` über `jwk`/`….jwk`/`priv…`) — der Klartext-Ausgang
       (Regel `klartextAusgang`).
   Eine Ausnahme zu (b) steht in derselben Liste (Regel `generateKey`/`importKey`), gebunden an die Exportstelle, für die
   sie nötig ist. Ein Eintrag ohne Gegenstand ist selbst ein Befund — die Liste veraltet nicht still. Zeilennummern stehen
   nirgends: sie veralten; Datei und Funktion nicht.

   Gelesen wird der Code ohne Kommentare (Zeichenketten bleiben: 'jwk', ['sign'] sind der Gegenstand).

   Aufruf:  node tools/krypto-schluessel-export-pruefen.js [--repo <pfad>] [--karte]
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const GEHEIME_USAGES = ['sign', 'decrypt', 'encrypt', 'deriveBits', 'deriveKey', 'unwrapKey', 'wrapKey'];
const POSITIVLISTE = path.join('tools', 'krypto-export-positivliste.json');

/* Kommentare weg, Zeichenketten und Regex-Literale bleiben stehen (ihre Länge bleibt, Positionen bleiben vergleichbar). */
function ohneKommentare(s) {
  let o = '', i = 0, vorher = '';
  const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') { o += ' '; i++; } continue; }
    if (c === '/' && d === '*') {
      const e = s.indexOf('*/', i + 2); const ende = e < 0 ? n : e + 2;
      o += s.slice(i, ende).replace(/[^\n]/g, ' '); i = ende; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < n && s[j] !== q) { if (s[j] === '\\') j++; j++; }
      o += s.slice(i, j + 1); vorher = q; i = j + 1; continue;
    }
    if (c === '/' && (/[(,=:[!&|?{};]/.test(vorher) || /\b(?:return|typeof|case|in|of|delete|void|throw|new|yield|await)\s*$/.test(o.slice(-16)))) {
      let j = i + 1, klasse = false;
      while (j < n && (s[j] !== '/' || klasse) && s[j] !== '\n') { if (s[j] === '\\') j++; else if (s[j] === '[') klasse = true; else if (s[j] === ']') klasse = false; j++; }
      j++; while (/[a-z]/.test(s[j] || '')) j++;
      o += s.slice(i, j); vorher = '/'; i = j; continue;
    }
    o += c; if (!/\s/.test(c)) vorher = c; i++;
  }
  return o;
}

/* Die Argumentliste ab der öffnenden Klammer, auf oberster Ebene an Kommas zerlegt. */
function argumente(code, auf) {
  let tiefe = 0, j = auf, start = auf + 1;
  const teile = [];
  for (; j < code.length; j++) {
    const c = code[j];
    if (c === '"' || c === "'" || c === '`') { const q = c; j++; while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; } continue; }
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') { tiefe--; if (tiefe === 0) { teile.push(code.slice(start, j).trim()); break; } }
    else if (c === ',' && tiefe === 1) { teile.push(code.slice(start, j).trim()); start = j + 1; }
  }
  return { teile, ende: j };
}
/* Die Deklarationen einer Seite, einmal gesucht (Position, Name) — `funktionAn` sucht darin die letzte vor einer Stelle. */
function deklarationen(code) {
  const re = /(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)\s*\(|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:function\b|\([^)\n]{0,200}\)\s*=>|[A-Za-z0-9_$]+\s*=>)|(?<![A-Za-z0-9_$.])([A-Za-z0-9_$]+)\s*\([^)\n]{0,200}\)\s*\{/g;
  const liste = [];
  let m;
  while ((m = re.exec(code)) !== null) {
    const name = m[1] || m[2] || m[3];
    if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return'].includes(name)) continue;
    liste.push({ pos: m.index, name });
  }
  return liste;
}
function funktionAn(liste, index) {
  let lo = 0, hi = liste.length - 1, treffer = '(ohne Funktion)';
  while (lo <= hi) {
    const mitte = (lo + hi) >> 1;
    if (liste[mitte].pos < index) { treffer = liste[mitte].name; lo = mitte + 1; } else hi = mitte - 1;
  }
  return treffer;
}
function funktionVor(code, index) { return funktionAn(deklarationen(code), index); }
function usagesAus(text) {
  const m = /^\[([^\]]*)\]$/.exec(text || '');
  return m ? m[1].split(',').map((u) => u.trim().replace(/['"]/g, '')).filter(Boolean) : null;
}

/* Alle Aufrufe einer Seite: { art, funktion, extractable, usages, schluessel, roh }. */
function aufrufe(text) {
  const code = ohneKommentare(text);
  const dekl = deklarationen(code);
  const funde = [];
  const re = /\bsubtle\s*\.\s*(generateKey|importKey|exportKey)\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const { teile } = argumente(code, m.index + m[0].length - 1);
    const art = m[1];
    const eintrag = { art, funktion: funktionAn(dekl, m.index), roh: teile.join(', ').replace(/\s+/g, ' ').slice(0, 120) };
    if (art === 'generateKey') { eintrag.extractable = teile[1]; eintrag.usages = usagesAus(teile[2]); }
    if (art === 'importKey') { eintrag.extractable = teile[3]; eintrag.usages = usagesAus(teile[4]); }
    if (art === 'exportKey') { eintrag.schluessel = teile[1]; }
    funde.push(eintrag);
  }
  // (c, zweiter Weg) Ein privates JWK, das NICHT aus exportKey kommt, sondern im Code zusammengebaut wird — etwa aus einem
  // Shamir-Geheimnis: ein Objekt-Literal mit `kty` und `d`. Es ist dieselbe Herausgabe eines privaten Schlüssels.
  const reD = /[{,]\s*d\s*:/g;
  while ((m = reD.exec(code)) !== null) {
    let i = m.index;
    if (code[i] !== '{') {
      for (let tiefe = 0; i >= 0; i--) {
        const c = code[i];
        if (c === '}' || c === ']' || c === ')') tiefe++;
        else if (c === '{' || c === '[' || c === '(') { if (tiefe === 0) break; tiefe--; }
      }
    }
    if (i < 0 || code[i] !== '{') continue;
    let j = i, tiefe = 0;
    for (; j < code.length; j++) { if (code[j] === '{') tiefe++; else if (code[j] === '}') { tiefe--; if (tiefe === 0) break; } }
    const literal = code.slice(i, j + 1);
    if (!/[{,]\s*kty\s*:/.test(literal)) continue;
    funde.push({ art: 'jwkMitD', funktion: funktionAn(dekl, m.index), roh: literal.replace(/\s+/g, ' ').slice(0, 120) });
  }
  // (c, dritter Weg) Ein privates JWK wird als Text herausgegeben: `JSON.stringify(…)` über einen Ausdruck, der ein JWK
  // oder einen privaten Schlüssel benennt (`jwk`, `….jwk`, `priv…`, `geheim…`) — nicht einen öffentlichen (`pub…`,
  // `public…`, `oeffentlich…`). Das ist der Klartext-Ausgang, gleich ob die Zeichenkette danach in eine Datei geht.
  const reS = /JSON\.stringify\(\s*([\w$.]+)\s*[,)]/g;
  while ((m = reS.exec(code)) !== null) {
    const ausdruck = m[1];
    if (!/(?:^|\.)jwk$|priv|geheim|secret/i.test(ausdruck)) continue;
    if (/pub|oeffentlich/i.test(ausdruck)) continue;
    funde.push({ art: 'klartextAusgang', funktion: funktionAn(dekl, m.index), roh: 'JSON.stringify(' + ausdruck + ')' });
  }
  return funde;
}

function seitenListen(repo) {
  return fs.readdirSync(repo).filter((n) => n.endsWith('.html')).sort();
}

function pruefen(repo, optionen) {
  // Die Liste ist geteilt (tools/lib/mit-interner-ergaenzung.js): der öffentliche Teil und, drinnen, die Ergänzung für
  // Seiten, die nicht in den öffentlichen Zuschnitt gehen. Fehlt die Ergänzung, gilt der öffentliche Teil allein.
  const liste = (optionen && optionen.positivliste)
    || require('./lib/mit-interner-ergaenzung.js').lesenMitErgaenzung(path.join(repo, POSITIVLISTE)).eintraege;
  const seiten = seitenListen(repo);
  const fehler = [];
  const benutzt = new Set();
  const erlaubt = (datei, funktion, regel) => {
    const i = liste.findIndex((e) => e.datei === datei && e.funktion === funktion && e.regel === regel);
    if (i >= 0) benutzt.add(i);
    return i >= 0;
  };
  // (a) die Auslieferungsliste ist Teil dessen, was geprüft wird
  const dateisatz = (optionen && optionen.dateisatz)
    || require(path.resolve(repo, 'scripts', 'ausgeliefertes-dateiset.js')).DATEISATZ;
  for (const d of dateisatz.filter((x) => x.endsWith('.html'))) {
    if (!seiten.includes(d)) fehler.push(`(a) ${d}: steht in der Auslieferungsliste, liegt aber nicht als Wurzel-Seite vor.`);
  }
  const karte = [];
  for (const datei of seiten) {
    const text = fs.readFileSync(path.join(repo, datei), 'utf8');
    for (const a of aufrufe(text)) {
      karte.push(Object.assign({ datei }, a));
      if (a.art === 'generateKey' || a.art === 'importKey') {
        if (!a.usages) { fehler.push(`(b) ${datei} · ${a.funktion}: ${a.art} mit nicht lesbaren Usages — ${a.roh}`); continue; }
        if (!a.usages.some((u) => GEHEIME_USAGES.includes(u))) continue;
        if (a.extractable === 'false') continue;
        if (erlaubt(datei, a.funktion, a.art)) continue;
        fehler.push(`(b) ${datei} · ${a.funktion}: ${a.art} mit [${a.usages.join(', ')}] und extractable=${a.extractable} — ${a.roh}`);
      } else if (a.art === 'jwkMitD') {
        if (erlaubt(datei, a.funktion, 'jwkMitD')) continue;
        fehler.push(`(c) ${datei} · ${a.funktion}: baut ein privates JWK (kty und d) ohne Eintrag in der Positivliste — ${a.roh}`);
      } else if (a.art === 'klartextAusgang') {
        if (erlaubt(datei, a.funktion, 'klartextAusgang')) continue;
        fehler.push(`(c) ${datei} · ${a.funktion}: gibt ein privates JWK als Text heraus ohne Eintrag in der Positivliste — ${a.roh}`);
      } else if (a.art === 'exportKey') {
        if (/\.publicKey$/.test(a.schluessel || '')) continue;
        if (erlaubt(datei, a.funktion, 'exportKey')) continue;
        fehler.push(`(c) ${datei} · ${a.funktion}: exportKey(${a.schluessel}) ohne Eintrag in der Positivliste — ${a.roh}`);
      }
    }
  }
  liste.forEach((e, i) => {
    if (!e.grund || String(e.grund).trim().length < 20) fehler.push(`(c) Positivliste ${e.datei} · ${e.funktion} · ${e.regel}: ohne Grund.`);
    if (!benutzt.has(i)) fehler.push(`(c) Positivliste ${e.datei} · ${e.funktion} · ${e.regel}: Eintrag ohne Gegenstand — streichen.`);
  });
  return { seiten, karte, fehler };
}

module.exports = { pruefen, aufrufe, ohneKommentare, funktionVor, GEHEIME_USAGES, POSITIVLISTE };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--repo');
  const repo = i >= 0 ? path.resolve(argv[i + 1]) : path.join(__dirname, '..');
  const r = pruefen(repo);
  console.log(`Seiten: ${r.seiten.length} · Aufrufe: ${r.karte.length}`);
  if (argv.includes('--karte')) {
    for (const k of r.karte) console.log(`  ${k.datei} · ${k.funktion} · ${k.art}` + (k.art === 'exportKey' ? ` (${k.schluessel})` : ` extractable=${k.extractable} [${(k.usages || ['?']).join(',')}]`));
  }
  if (r.fehler.length) {
    console.error(`✗ ${r.fehler.length} Befund(e):`);
    for (const f of r.fehler) console.error('  · ' + f);
    process.exit(1);
  }
  console.log('✓ Kein privater oder geheimer Schlüssel ist herausholbar, außer an einer begründeten Stelle der Positivliste.');
}
