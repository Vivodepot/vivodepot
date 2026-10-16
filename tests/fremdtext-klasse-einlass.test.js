'use strict';
/* ═══════════════════════════════════════════════════════════
   Klassenprobe „Fremdtext → innerHTML“ über ALLE Einlass-Register (13.10.2026, Befund FREMDTEXT-KLASSE-NUR-EIN-REGISTER).

   Anlass: tests/fremdtext-senken.test.js prüfte „jedes Textfeld, durch jeden HTML-Bauer“ nur für das Register logikModul.
   VD-SEC-016 (Titel einer Situation) und VD-SEC-018 (Platzhalter im Sprachmodul) kamen aus zwei Registern ohne solche Probe.

   Die Probe, je Register des Kerns (EINLASS_REGISTER, zur Laufzeit gelesen):
     1. Ein gültiges Modul dieses Registers (Fall unten), jedes Textfeld mit einer Nutzlast versehen.
     2. Einlass auf dem stärksten Weg, den ein Angreifer hat: mit geprüfter Anbieterkennung (wie ein signiertes Modul),
        danach die Anmeldung aller Register wie beim Laden eines Depots.
     3. Jeder exportierte …HTML-Bauer und jede render…-Ansicht läuft; kein erzeugtes HTML enthält die Nutzlast roh.
   Weist der Einlass das Modul mit Nutzlast ab, hält die Quellsperre; dann muss dasselbe Modul OHNE Nutzlast angenommen
   werden (sonst prüft der Fall nichts).
   Rot-Beweis je Register: derselbe Durchlauf gegen eine Kern-Kopie, in der escapeHTML, escapeAttr und escapeTextknoten
   nicht maskieren. Ein Fall, dessen Nutzlast auch dann nirgends roh erscheint, erreicht keine Senke und ist blind.
   Vollständigkeit: ein Register ohne Fall macht die Probe rot — ein neues Register ist erfasst, ohne dass jemand daran denkt.

   Grenze: gemessen wird, was HTML-Bauer zurückgeben und was Ansichten in Elemente schreiben, die über document
   (getElementById, createElement, querySelector) entstehen; Elemente, die erst ein Element selbst sucht, sieht die Probe nicht.
   ═══════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const NUTZLAST = '<img src=q onerror=alert(9)>';
const roh = (s) => /<img src=q /.test(String(s || ''));
const maskiert = (s) => String(s || '').includes('&lt;img src=q');
const ANBIETER = 'institution/fremdtext-probe';

// Schlüssel, die eine Form haben (Kennungen, Typen, Verweise, Farben, Zahlen als Text) — die prüft der Kern selbst.
const KEINE_TEXTE = new Set(['id', 'feldId', 'typ', 'modulTyp', 'sektor', 'knopfAttr', 'dateiBasis', 'herkunft', 'sprache',
  'eingelassenAm', 'bezugsquelle', 'format', 'quelle', 'wenn', 'feld', 'schluessel', 'key', 'ref', 'art', 'datentyp', 'type',
  'rechtsraum', 'anbieterId', 'icon', 'farbePrimaer', 'farbeSekundaer', 'farbeAkzent', 'logo', 'domain', 'papier',
  'schreibrichtung', 'datumsformat', 'dezimaltrenner', 'tausendertrenner', 'waehrung', 'sprachkennung', 'mime', 'endung']);

function jedesTextfeld(o, anhang) {
  if (Array.isArray(o)) return o.map((x) => jedesTextfeld(x, anhang));
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) r[k] = (typeof v === 'string' && !KEINE_TEXTE.has(k)) ? v + anhang : jedesTextfeld(v, anhang);
    return r;
  }
  return o;
}
function textfelder(o) {
  if (Array.isArray(o)) return o.reduce((n, x) => n + textfelder(x), 0);
  if (o && typeof o === 'object') return Object.entries(o).reduce((n, [k, v]) => n + ((typeof v === 'string' && !KEINE_TEXTE.has(k)) ? 1 : textfelder(v)), 0);
  return 0;
}

const FREMDSPRACHE = 'fr';
function fremdesSprachmodul(V, texte) {
  return { modulTyp: 'textsatz', moduleVersion: 1, sprache: FREMDSPRACHE, texte: texte || Object.assign({}, (V.AB_WERK_SPRACHE_PRODUKT || {}).texte) };
}

// Alle Sätze des Produkts mit Nutzlast überschreiten die Größengrenze des Einlasses; darum in Teilen, jeder Satz einmal.
const TEILE_TEXTSATZ = 12;
function sprachmodulInTeilen(V) {
  const alle = Object.entries((V.AB_WERK_SPRACHE_PRODUKT || {}).texte || {});
  const teile = [];
  for (let i = 0; i < TEILE_TEXTSATZ; i++) teile.push(fremdesSprachmodul(V, Object.fromEntries(alle.filter((_, j) => j % TEILE_TEXTSATZ === i))));
  return teile;
}
// Ein Einlass, der an Größe oder Tiefe scheitert, sagt nichts über den Text: der Fall muss dann kleiner werden.
const FORM_GRUENDE = new Set(['zu-gross', 'zu-tief', 'kein-json', 'kein-objekt', 'unbekannter-typ']);

const inhalt = (document) => { const c = document.getElementById('content'); return c ? String(c.innerHTML) : ''; };

const PRUEFREGELN = path.join(__dirname, 'fixtures', 'pruefregeln');
// Der gültige Prüfregel-Fall mit den meisten Textfeldern.
function reichsterFall(datei) {
  const f = JSON.parse(fs.readFileSync(path.join(PRUEFREGELN, datei), 'utf8'));
  const gut = f.faelle.filter((c) => c.urteil === 'bestanden' && c.dokument);
  assert.ok(gut.length, datei + ': kein gültiger Fall');
  return JSON.parse(JSON.stringify(gut.sort((a, b) => textfelder(b.dokument) - textfelder(a.dokument))[0].dokument));
}

/* Die Fall-Tabelle. Je Register: woher das gültige Modul kommt. `bau(V)` darf es am geladenen Kern ausrichten
   (etwa die aktive Sprache), damit es wirkt und nicht nur angenommen wird. */
const FAELLE = {
  // Deutsch ist reserviert (das Produkt bringt es mit); ein fremdes Sprachmodul kommt in einer anderen Sprache und wirkt,
  // sobald die Person sie wählt. Die Texte sind alle Sätze des Produkts.
  textsatz: { teile: (V) => sprachmodulInTeilen(V), aktivieren: (V) => V.textsatzSpracheWaehlen(FREMDSPRACHE) },
  // Der Fachinhalt eines Stellensatzes (stellen{}) hat keine HTML-Senke (_stelleFuerFeld ohne Aufrufer); Senke ist der Modulname.
  stellensatz: { bau: () => Object.assign(reichsterFall('stellensatz.json'), { name: 'Stellen AT' }), aktivieren: (V) => { V.getData().rechtsraum = 'AT'; }, zeigen: (V) => V.einstellungenHTML() },
  // Wortlaut und Paragraf eines Rechtsraums werden nur als URI, Zahl oder unter DE gelesen; Senke ist der Modulname.
  rechtsraum: { bau: () => Object.assign(reichsterFall('rechtsraum.json'), { name: 'Österreich' }), zeigen: (V) => V.einstellungenHTML() },
  institutionsArt: { datei: 'institutions-art.json', zeigen: (V) => V.listenEintragInputsHTML(V._institutionFelder(null), { name: 'Probe-Stelle', art: 'notaire' }) },
  // Ein Blattformat trägt keinen Textschlüssel; ein unbekannter Schlüssel (name) bleibt gespeichert und erscheint in der Modulliste.
  blattformat: { bau: () => Object.assign(reichsterFall('blattformat.json'), { name: 'Kanzleiformat' }), zeigen: (V) => V.einstellungenHTML() },
  bedingungskatalog: { datei: 'bedingungskatalog.json' },
  format: { datei: 'format.json' },
  bereich: { datei: 'bereich.json' },
  situation: { datei: 'situation.json', zeigen: (V, document) => { V.renderSituation('zz-probe'); return inhalt(document); } },
  // Der Kern liest hilfetext und abschluss.toast (nicht hilfe, abschluss.text); der Wizard zeigt sich erst im Lauf.
  wizard: {
    bau: () => { const m = reichsterFall('wizard.json'); const w = m.wizards['zz-probe']; w.schritte[1].hilfetext = 'Hilfe'; w.abschluss = { toast: 'Fertig.' }; return m; },
    aktivieren: (V) => { V.akteurSelbstErklaeren('Probe'); V.wizardLauf('zz-probe'); },
    zeigen: (V, document) => { const schritt1 = inhalt(document); V.wizardWeiter(); return schritt1 + inhalt(document); },
  },
  ereignisAchse: { datei: 'ereignis-achse.json' },
  angehoerigenVorlage: { datei: 'angehoerigen-vorlage.json' },
  branding: { datei: 'branding.json' },
  logikModul: { bau: () => Object.assign(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8')), { id: 'fremd-probe' }) },
  erscheinung: { datei: 'erscheinung.json' },
};

function verfolgeElemente(document) {
  const gesehen = new Set();
  for (const k of ['getElementById', 'createElement', 'querySelector']) {
    const alt = document[k];
    document[k] = (...a) => { const el = alt(...a); if (el) gesehen.add(el); return el; };
  }
  return gesehen;
}

// Ein Durchlauf: Modul einlassen, Register anmelden, alle Bauer und Ansichten fahren, rohe und maskierte Stellen zählen.
async function durchlauf(typ, opts, teil) {
  const { V, document } = await ladeKern(opts.htmlPfad ? { htmlPfad: opts.htmlPfad, backen: true } : undefined);
  const elemente = verfolgeElemente(document);
  await V.depotAnlegen('fremdtext-klasse-pw');
  const fall = FAELLE[typ];
  const grund = fall.teile ? fall.teile(V)[teil || 0] : fall.bau ? fall.bau(V) : reichsterFall(fall.datei);
  const modul = opts.mitNutzlast ? jedesTextfeld(grund, NUTZLAST) : grund;
  if (typ === 'logikModul') V.getData().logikModule = [];
  const e = V.modulEinlassen(JSON.stringify(modul), V.getData(), ANBIETER, 'geprueft');
  const ergebnis = { angenommen: !!e.angenommen, grund: e.grund || null, roh: [], maskiert: 0 };
  if (!e.angenommen) return ergebnis;
  try { V._alleModulRegisterAusDepotAnmelden(V.getData()); } catch (_) { /* die Anmeldung meldet selbst */ }
  if (fall.aktivieren) fall.aktivieren(V, modul);
  const pruefe = (wo, s) => { if (roh(s)) ergebnis.roh.push(wo); if (maskiert(s)) ergebnis.maskiert++; };
  const kennung = (() => { try { return V.EINLASS_REGISTER.find((r) => r.typ === typ).kennung(modul); } catch (_) { return null; } })();
  const argListen = [[], [kennung], ['advanceCare'], [kennung, null]];
  for (const k of Object.keys(V).filter((x) => /HTML$/.test(x) && typeof V[x] === 'function' && x !== 'escapeHTML')) {
    for (const args of argListen) {
      let r;
      try { r = V[k](...args); } catch (_) { continue; }
      if (typeof r === 'string') pruefe(k + '(' + args.join(',') + ')', r);
    }
  }
  if (fall.zeigen) { let r = null; try { r = fall.zeigen(V, document); } catch (_) { r = null; } pruefe('zeigen', r); for (const el of elemente) pruefe('zeigen→DOM', el.innerHTML); }
  for (const k of Object.keys(V).filter((x) => /^render[A-Z]/.test(x) && typeof V[x] === 'function')) {
    for (const args of argListen) {
      try { V[k](...args); } catch (_) { /* eine Ansicht ohne passende Argumente */ }
      for (const el of elemente) pruefe(k + '(' + args.join(',') + ')→DOM', el.innerHTML);
    }
  }
  return ergebnis;
}

let _ohneMaskierung = null;
function kernOhneMaskierung() {
  if (_ohneMaskierung) return _ohneMaskierung;
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  let n = 0;
  const neu = src.replace(/^function (escapeHTML|escapeAttr|escapeTextknoten)\(s\) \{/gm, (z, name) => { n++; return z + ' return String(s == null ? \'\' : s);'; });
  assert.equal(n, 3, 'Vorbedingung Rot-Beweis: die drei Maskierfunktionen gefunden');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-fremdtext-klasse-'));
  process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  _ohneMaskierung = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(_ohneMaskierung, neu);
  return _ohneMaskierung;
}

test('[Fremdtext·Klasse·Vollständigkeit] jedes Einlass-Register des Kerns hat einen Fall', async () => {
  const { V } = await ladeKern();
  const register = V.EINLASS_REGISTER.map((r) => r.typ);
  assert.ok(register.length >= 15, 'Positivkontrolle: die Register sind lesbar (' + register.length + ')');
  assert.deepEqual(register.filter((t) => !FAELLE[t]), [], 'Register ohne Fall in der Fremdtext-Klassenprobe');
  assert.deepEqual(Object.keys(FAELLE).filter((t) => !register.includes(t)), [], 'Fall ohne Register');
});

test('[Fremdtext·Klasse·Vollständigkeit·Rot-Beweis] ein Register ohne Fall fällt auf', () => {
  const register = ['textsatz', 'neuesRegister'];
  assert.deepEqual(register.filter((t) => !FAELLE[t]), ['neuesRegister']);
});

const teileVon = (typ) => (FAELLE[typ].teile ? TEILE_TEXTSATZ : 1);
for (const typ of Object.keys(FAELLE)) {
  test('[Fremdtext·Klasse·' + typ + '] jedes Textfeld, durch jeden HTML-Bauer und jede Ansicht: nirgends roh', async () => {
    for (let teil = 0; teil < teileVon(typ); teil++) {
      const mit = await durchlauf(typ, { mitNutzlast: true }, teil);
      assert.ok(!FORM_GRUENDE.has(mit.grund), typ + ': der Einlass scheitert an der Form (' + mit.grund + '), nicht am Text — der Fall prüft nichts');
      if (!mit.angenommen) {
        const ohne = await durchlauf(typ, { mitNutzlast: false }, teil);
        assert.equal(ohne.angenommen, true, typ + ': der Fall ist auch ohne Nutzlast ungültig (' + ohne.grund + ') — er prüft nichts');
        continue;   // die Quellsperre hält: das Modul mit Nutzlast kommt nicht hinein
      }
      assert.deepEqual(mit.roh.slice(0, 10), [], typ + ': Modultext roh im HTML');
    }
  });

  test('[Fremdtext·Klasse·' + typ + '·Rot-Beweis] ohne Maskierung erscheint die Nutzlast roh — der Fall erreicht eine Senke', async () => {
    let erreicht = 0, gesperrt = 0;
    for (let teil = 0; teil < teileVon(typ); teil++) {
      const mit = await durchlauf(typ, { mitNutzlast: true, htmlPfad: kernOhneMaskierung() }, teil);
      if (!mit.angenommen) { gesperrt++; continue; }   // die Quellsperre hält auch dort
      if (mit.roh.length > 0) erreicht++;
    }
    assert.ok(erreicht > 0 || gesperrt === teileVon(typ), typ + ': die Nutzlast erreicht keine Senke, auch ohne Maskierung nicht — der Fall ist blind');
  });
}

/* Die Zusammensetzung beim Lesen (VD-SEC-018): zwei Texte, die einzeln reiner Text sind, ergeben erst beim Einsetzen des
   Platzhalters ein Tag. Geprüft am Sprachmodul, durch das jeder Platzhalter läuft: jeder Text wird zu »<{beschriftung:ZIEL}«,
   der Zieltext zu »img src=q onerror=…>«. Rot-Beweis: der Kern vor der Korrektur (0593f6476, v927) setzt so ein Tag. */
const HAELFTE = 'img src=q onerror=alert(9)>';
async function zusammensetzung(htmlPfad) {
  const { V, document } = await ladeKern(htmlPfad ? { htmlPfad, backen: true } : undefined);
  const elemente = verfolgeElemente(document);
  await V.depotAnlegen('fremdtext-klasse-pw-z');
  const texte = Object.assign({}, (V.AB_WERK_SPRACHE_PRODUKT || {}).texte);
  const ziel = Object.keys(texte).map((k) => /^strings:([A-Za-z0-9_]+)\.text$/.exec(k)).find(Boolean);
  assert.ok(ziel, 'Vorbedingung: ein Zieltext für den Platzhalter');
  for (const k of Object.keys(texte)) texte[k] = (k === ziel[0]) ? HAELFTE : '<{beschriftung:' + ziel[1] + '}';
  const e = V.modulEinlassen(JSON.stringify(fremdesSprachmodul(V, texte)), V.getData(), ANBIETER, 'geprueft');
  const raus = { angenommen: !!e.angenommen, grund: e.grund || null, roh: [] };
  if (!e.angenommen) return raus;
  try { V._alleModulRegisterAusDepotAnmelden(V.getData()); } catch (_) { /* meldet selbst */ }
  V.textsatzSpracheWaehlen(FREMDSPRACHE);
  for (const k of Object.keys(texte).slice(0, 400)) { const s = V.textLesen(k); if (roh(s)) raus.roh.push('textLesen ' + k); }
  for (const k of Object.keys(V).filter((x) => /HTML$/.test(x) && typeof V[x] === 'function' && x !== 'escapeHTML')) {
    let r; try { r = V[k](); } catch (_) { continue; }
    if (roh(r)) raus.roh.push(k);
  }
  for (const k of Object.keys(V).filter((x) => /^render[A-Z]/.test(x) && typeof V[x] === 'function')) {
    try { V[k](); } catch (_) { /* ohne Argumente */ }
    for (const el of elemente) if (roh(el.innerHTML)) { raus.roh.push(k + '→DOM'); break; }
  }
  return raus;
}

test('[Fremdtext·Klasse·Zusammensetzung] ein Platzhalter setzt aus zwei reinen Texten kein Tag zusammen', async () => {
  const r = await zusammensetzung(null);
  assert.equal(r.angenommen, true, 'Vorbedingung: das Sprachmodul wird eingelassen (' + r.grund + ')');
  assert.deepEqual(r.roh.slice(0, 10), []);
});

test('[Fremdtext·Klasse·Zusammensetzung·Rot-Beweis] ohne die Prüfung nach dem Einsetzen entsteht das Tag', async () => {
  // Kern-Kopie, in der _textsatzAufgeloest das Ergebnis ungeprüft zurückgibt (der Stand vor VD-SEC-018).
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  const zeile = "  if (html || text === roh || _istReinerText(text)) return text;";
  assert.equal(src.split(zeile).length, 2, 'Vorbedingung: die Prüfung nach dem Einsetzen steht genau einmal da');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-fremdtext-klasse-z-'));
  try {
    const p = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(p, src.replace(zeile, '  return text;'));
    const r = await zusammensetzung(p);
    assert.equal(r.angenommen, true, 'Vorbedingung an der Kopie (' + r.grund + ')');
    assert.ok(r.roh.length > 0, 'ohne die Prüfung erscheint das zusammengesetzte Tag');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
