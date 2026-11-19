'use strict';
/* ═════════════════════════════════════════════════════════════════
   tools/lib/schriftgroessen-leiter.js — die reinen Teile der Größenleiter-Prüfung (11.11.2026)
   ─────────────────────────────────────────────────────────────────
   Leiter laden (tools/groessenleiter.json), Deklarationen `font-size` aus Quelltext lesen und gegen die Leiter prüfen,
   eine Browser-Erfassung von Elementlagen bewerten. Ohne Browser und ohne Abhängigkeit außer node:fs/node:path; der
   Browserlauf über alle Flächen ist ein eigenes Werkzeug, das diese Bibliothek lädt.
   `erfassenImBrowser` läuft als Funktion in page.evaluate und liefert nur Lagen, die Bewertung macht erfassungAuswerten.
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..', '..');
const LEITER_DATEI = path.join(__dirname, '..', 'groessenleiter.json');
const FIXTURE_ORDNER = path.join(__dirname, '..', 'schriftgroessen-leiter-fixtures');
const ANWENDUNG = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html'];
// Die Stilquellen des Kerns: das Modul füllt den Abschnitt `stil` aus ihnen (tools/erscheinung/stil-reihenfolge*.json).
const KERN_STILQUELLEN = ['tools/erscheinung/stil/grundlage.css', 'tools/erscheinung/stil/salbei-glas.css', 'tools/erscheinung/stil/ohne-icons.css',
  'tools/erscheinung/heute.css', 'tools/erscheinung/salbei-glas.css'];

function leiterLaden(datei = LEITER_DATEI) { return JSON.parse(fs.readFileSync(datei, 'utf8')); }
function leiterTokens(leiter) { return new Set(leiter.stufen.map((s) => s.token)); }
/* Die Stufen in px für eine Fensterbreite: unter `umbruch_px` gilt die Telefon-Spalte. */
function leiterPx(leiter, breite) {
  const spalte = breite < leiter.umbruch_px ? 'px_390' : 'px_1024';
  return [...new Set(leiter.stufen.map((s) => s[spalte]))].sort((a, b) => a - b);
}
function stufeZuPx(leiter, px, breite) {
  const spalte = breite < leiter.umbruch_px ? 'px_390' : 'px_1024';
  const tol = leiter.toleranz_px == null ? 0.5 : leiter.toleranz_px;
  return leiter.stufen.filter((s) => Math.abs(s[spalte] - px) <= tol).map((s) => s.stufe);
}

/* ── Weg 1: Quelltext ─────────────────────────────────────────── */
/* Blockkommentare werden durch Leerzeichen mit denselben Zeilenumbrüchen ersetzt: die Zeilennummern bleiben. */
function ohneKommentare(text) { return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')); }
function deklarationenLesen(text) {
  const t = ohneKommentare(text);
  const aus = [];
  const css = /font-size\s*:\s*([^;}"'<>\n]*)/g;
  let m;
  while ((m = css.exec(t))) aus.push({ index: m.index, wert: m[1].replace(/!important/i, '').trim(), weg: 'css' });
  const js = /\.fontSize\s*=\s*(['"`])([^'"`]*)\1/g;
  while ((m = js.exec(t))) aus.push({ index: m.index, wert: m[2].trim(), weg: 'js' });
  const setp = /setProperty\(\s*['"]font-size['"]\s*,\s*(['"`])([^'"`]*)\1/g;
  while ((m = setp.exec(t))) aus.push({ index: m.index, wert: m[2].trim(), weg: 'js' });
  aus.sort((a, b) => a.index - b.index);
  // Zeilen in einem Durchgang
  let zeile = 1; let pos = 0;
  for (const d of aus) { for (; pos < d.index; pos++) if (t.charCodeAt(pos) === 10) zeile++; d.zeile = zeile; delete d.index; }
  return aus;
}
/* null = auf der Leiter; sonst der Grund. Ein leerer Wert (aus Skript zusammengesetzt) ist ein Verstoß: die Größe ist nicht
   am Quelltext abzulesen. */
function deklarationPruefen(wert, leiter) {
  const v = String(wert).trim();
  if (!v) return 'zusammengesetzt (Skript)';
  const tokens = leiterTokens(leiter);
  const f = leiter.erlaubte_formen || {};
  if ((f.werte || []).includes(v)) return null;
  const nurVar = /^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/.exec(v);
  if (nurVar) return tokens.has(nurVar[1]) ? null : 'Token außerhalb der Leiter: ' + nurVar[1];
  if (f.muster_max16) { const mm = new RegExp(f.muster_max16).exec(v); if (mm && tokens.has(mm[1])) return null; }
  const mitRueckfall = /^var\(\s*(--[A-Za-z0-9_-]+)\s*,/.exec(v);
  if (mitRueckfall) return tokens.has(mitRueckfall[1]) ? 'Leiter-Token mit Rückfallwert' : 'Token außerhalb der Leiter: ' + mitRueckfall[1];
  return 'fester Wert';
}
function dateiPruefen(text, leiter) {
  // Gemessen wird der eigene Code: gelistete Fremdbibliotheken (tools/lib/fremdbibliotheken.js) sind ausgeschnitten (17.11.2026).
  const deklarationen = deklarationenLesen(require('./html-senken.js').ohneFremdbloecke(text));
  const verstoesse = [];
  for (const d of deklarationen) { const grund = deklarationPruefen(d.wert, leiter); if (grund) verstoesse.push({ ...d, grund }); }
  return { deklarationen: deklarationen.length, verstoesse };
}
function zaehlenNachWert(verstoesse) {
  const z = new Map();
  for (const v of verstoesse) z.set(v.wert || '(zusammengesetzt)', (z.get(v.wert || '(zusammengesetzt)') || 0) + 1);
  return [...z.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}
/* Die Dateien der Anwendung samt Stilquellen des Kerns, je Datei { datei, deklarationen, verstoesse }. */
function anwendungPruefen(leiter, wurzel = WURZEL, dateien = null) {
  const liste = dateien || [...ANWENDUNG, ...KERN_STILQUELLEN];
  return liste.filter((d) => fs.existsSync(path.resolve(wurzel, d)))
    .map((d) => ({ datei: d, ...dateiPruefen(fs.readFileSync(path.resolve(wurzel, d), 'utf8'), leiter) }));
}

/* ── Weg 2: Flächen ───────────────────────────────────────────── */
/* Läuft im Browser (als Funktion an page.evaluate übergeben). Nur Element-Lagen, keine Bewertung. */
function erfassenImBrowser() {
  const KNOPF = 'button, [role="button"], input[type="button"], input[type="submit"], .btn, .chip, .pill, [class*="knopf"], [class*="chip"], [class*="pill"]';
  const sichtbar = (el) => {
    if (el.closest('[hidden], [aria-hidden="true"], .dev-leiste, svg')) return false;
    const st = getComputedStyle(el); const r = el.getBoundingClientRect();
    return st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0 && r.width > 0 && r.height > 0;
  };
  const eigenerText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const textRects = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return [...rg.getClientRects()].filter((r) => r.width > 0 && r.height > 0); };
  const elemente = [];
  const knoepfe = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.matches('script, style, noscript, template, option')) continue;
    // Knopf ist das innerste Element der Knopf-Muster: eine Reihe `.chip-reihe` mit Chips darin ist keiner.
    const istKnopf = el.matches(KNOPF) && !el.querySelector(KNOPF);
    const text = istKnopf ? (el.innerText || el.value || '').replace(/\s+/g, ' ').trim() : eigenerText(el);
    if (!text || !sichtbar(el)) continue;
    const st = getComputedStyle(el); const r = el.getBoundingClientRect();
    const e = {
      tag: el.tagName.toLowerCase(), klasse: [...el.classList].slice(0, 3).join('.'), id: el.id || '', role: el.getAttribute('role') || '',
      fs: parseFloat(st.fontSize), fw: Number(st.fontWeight) || st.fontWeight, text: text.slice(0, 60), knopf: istKnopf,
    };
    if (istKnopf) {
      const rects = textRects(el);
      const tops = new Set(rects.map((x) => Math.round(x.top)));
      // Zeilen = Oberkanten der Textstücke, die mehr als 0,6 Schrifthöhen auseinanderliegen (ein Symbol neben dem Text
      // sitzt etwas höher oder tiefer, liegt aber auf derselben Zeile).
      e.zeilen = [...tops].sort((x, y) => x - y).filter((t, i, arr) => i === 0 || t - arr[i - 1] > e.fs * 0.6).length;
      const raus = rects.some((x) => x.left < r.left - 1 || x.right > r.right + 1);
      e.ueberlauf = el.scrollWidth > el.clientWidth + 1 || raus;
      e.box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      knoepfe.push({ el, e });
    }
    elemente.push(e);
  }
  // Nachbarn: Knöpfe unter demselben Elternteil, deren Boxen sich überdecken (mehr als 1 px in beide Richtungen).
  for (let i = 0; i < knoepfe.length; i++) for (let j = i + 1; j < knoepfe.length; j++) {
    const a = knoepfe[i]; const b = knoepfe[j];
    if (a.el.parentElement !== b.el.parentElement || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const x = Math.min(a.e.box.r, b.e.box.r) - Math.max(a.e.box.l, b.e.box.l);
    const y = Math.min(a.e.box.b, b.e.box.b) - Math.max(a.e.box.t, b.e.box.t);
    if (x > 1 && y > 1) { a.e.schneidet = (a.e.schneidet || []).concat(b.e.text.slice(0, 30)); }
  }
  const d = document.documentElement;
  return { elemente, seitenUeberlauf: d.scrollWidth > d.clientWidth + 1, scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
}
function rolleVon(e) { return e.tag + (e.klasse ? '.' + e.klasse : '') + (e.id ? '#' + e.id : '') + (e.role ? '[' + e.role + ']' : ''); }
/* Bewertet eine Erfassung (Ausgabe von erfassenImBrowser) gegen die Leiter: eine Liste von Funden. Rein, ohne Browser. */
function erfassungAuswerten(erfassung, leiter, breite) {
  const funde = [];
  const tol = leiter.toleranz_px == null ? 0.5 : leiter.toleranz_px;
  const px = leiterPx(leiter, breite);
  for (const e of erfassung.elemente || []) {
    if (!px.some((p) => Math.abs(p - e.fs) <= tol)) funde.push({ art: 'groesse', wert: String(Math.round(e.fs * 100) / 100) + 'px/' + e.fw, rolle: rolleVon(e), text: e.text });
    if (e.knopf && e.zeilen > 1) funde.push({ art: 'umbruch', wert: e.zeilen + ' Zeilen', rolle: rolleVon(e), text: e.text });
    if (e.knopf && e.ueberlauf) funde.push({ art: 'ueberlauf', wert: 'Text breiter als Box', rolle: rolleVon(e), text: e.text });
    if (e.knopf && e.schneidet && e.schneidet.length) funde.push({ art: 'schneidet', wert: e.schneidet.join(' | '), rolle: rolleVon(e), text: e.text });
  }
  if (erfassung.seitenUeberlauf) funde.push({ art: 'seite', wert: erfassung.scrollWidth + ' > ' + erfassung.clientWidth, rolle: 'html', text: '' });
  return funde;
}


/* Selbstprobe ohne Browser: die Fixtures müssen genau ihre Funde liefern. */
function selbstprobe() {
  const assert = require('node:assert/strict');
  const leiter = leiterLaden();
  const lies = (n) => fs.readFileSync(path.join(FIXTURE_ORDNER, n), 'utf8');
  const gut = dateiPruefen(lies('leiter-gut.html'), leiter);
  assert.equal(gut.verstoesse.length, 0, 'leiter-gut.html: ' + JSON.stringify(gut.verstoesse));
  const rot = dateiPruefen(lies('leiter-13px.html'), leiter);
  assert.ok(rot.verstoesse.some((v) => v.wert === '13px'), 'leiter-13px.html: 13px nicht gefunden');
  const messung = JSON.parse(lies('knopf-ueberlauf-erfassung.json'));
  const funde = erfassungAuswerten(messung.erfassung, leiter, messung.breite);
  for (const art of ['ueberlauf', 'umbruch', 'seite', 'groesse']) assert.ok(funde.some((f) => f.art === art), 'knopf-ueberlauf: kein Fund ' + art);
  return { verstoesse: rot.verstoesse.length, funde: funde.length };
}

module.exports = { leiterLaden, leiterTokens, leiterPx, stufeZuPx, deklarationenLesen, deklarationPruefen, dateiPruefen, zaehlenNachWert,
  anwendungPruefen, erfassenImBrowser, erfassungAuswerten, rolleVon, ANWENDUNG, KERN_STILQUELLEN, FIXTURE_ORDNER, LEITER_DATEI, WURZEL, selbstprobe };
