'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Befund SHL-EINMALIG-OHNE-TRAEGER (HOCH, 02.11.2026): „einmalig“ nur, wo die Ablage es trägt
   ───────────────────────────────────────────────────────────────────────────
   Ein Freigabe-Link ist nur dann einmal abrufbar, wenn die Ablage die Datei nach dem ersten Abruf verbraucht. Das tut die
   voreingestellte Ablage (MARKEN_ADRESSEN.shlAblage, Adressen holen.php?t=… und manifest.php?m=…). Im Pod gibt es keinen
   einmaligen Abruf (U2-ADR-512 Nr. 9), und bei einer anderen Adresse weiß die Anwendung es nicht. Der Kern kann Einmaligkeit
   nicht erzwingen: Wer Datei und Link hat, entschlüsselt beliebig oft. Er darf sie darum nur zusagen, wo die Ablage sie trägt.
   Vorher zeigte der Dialog das One-Time-Share-Zeichen vor jeder Adresswahl, und die Hilfe sagte ohne Bedingung
   „einmal abrufbar“.
   Gehalten wird:
     · Erkennung: shlEinmaligZusage sagt „ja“ nur für genau diese zwei Adressformen der voreingestellten Ablage;
     · Oberfläche: das Ergebnis trägt sichtbar „Einmal abrufbar“ oder „Nicht einmalig“, mit dem Datum;
     · Zeichen: das One-Time-Share-Zeichen ist nur bei „ja“ sichtbar;
     · Vermerk: die Nachfrage für „Herausgegeben“ nennt Host und Zusage;
     · Klasse: jede Einmaligkeits-Formel in Kern und Textsätzen steht mit ihrer Bedingung in ZUSAGEN_EINMALIG.
   Rot-Beweis: gegen den Stand vor dem Fix (Basis 9c5f27bdd) fehlen Erkennung und Ergebnis, das Zeichen steht offen im Dialog,
   und die Hilfe sagt „einmal abrufbar“ ohne Bedingung. Ein gepflanzter Text ohne Eintrag macht den Wächter rot.
   ═══════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // GIT: der Rot-Beweis liest den Stand vor dem Fix aus der privaten Geschichte
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const WURZEL = path.join(__dirname, '..');
const KERN_DATEI = 'vivodepot.html';
// Die Textsätze je Sprache; die Pro-Fassung liegt daneben und wird nur gelesen, wo sie im Baum steht (der öffentliche Zuschnitt
// trägt sie nicht). Kürzel statt Pfad: de, de-pro, en, en-pro.
const SPRACHEN = { de: 'tools/textsatz-de-modul.json', en: 'tools/textsatz-en-modul.json' };
const MODULE = Object.entries(SPRACHEN).flatMap(([k, p]) => [[k, p], [k + '-pro', p.replace('-modul.json', '-pro-modul.json')]])
  .filter(([, p]) => fs.existsSync(path.join(WURZEL, p)));
// Stand vor dem Fix: der Elter des Commits, der die Erkennung einführt (vor dem Commit: HEAD). Kein fester Hash —
// der Wagen wird vor der Landung umgesetzt, ein Hash von heute gibt es danach nicht mehr.
function vorDemFix() {
  const log = execFileSync('git', ['log', '--format=%H', '--reverse', '-S', 'function shlEinmaligZusage(', 'HEAD', '--', 'vivodepot.html'],
    { cwd: WURZEL, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: ohneGitUmgebung() }).trim().split('\n').filter(Boolean);
  return log.length ? log[0] + '^' : 'HEAD';
}
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

const HEX48 = 'a'.repeat(16) + '0123456789abcdef' + 'f'.repeat(16);
const HEX64 = '0123456789abcdef'.repeat(4);
const JA = [
  'https://share.vivodepot.de/holen.php?t=' + HEX48,
  'https://share.vivodepot.de/manifest.php?m=' + HEX64,
  'HTTPS://Share.Vivodepot.de/holen.php?t=' + HEX48,
];
const NEIN = [
  'https://pod.example.org/vivodepot/freigabe.jwe',
  'https://andere-ablage.example/holen.php?t=' + HEX48,
  'https://share.vivodepot.de.example.org/holen.php?t=' + HEX48,
  'https://share.vivodepot.de./holen.php?t=' + HEX48,
  'https://share.vivodepot.de:8443/holen.php?t=' + HEX48,
  'https://share.vivodepöt.de/holen.php?t=' + HEX48,
  'https://share.vivodepot.de/holen.php?t=' + HEX48.slice(1),
  'https://share.vivodepot.de/holen.php?t=' + HEX48 + 'a',
  'https://share.vivodepot.de/holen.php?t=' + HEX48.toUpperCase(),
  'https://share.vivodepot.de/holen.php?t=' + HEX48 + '&x=1',
  'https://share.vivodepot.de/holen.php?t=' + HEX48 + '#a',
  'https://share.vivodepot.de/holen.php?m=' + HEX64,
  'https://share.vivodepot.de/manifest.php?m=' + HEX48,
  'https://share.vivodepot.de/x/holen.php?t=' + HEX48,
  'https://share.vivodepot.de/holen.php/?t=' + HEX48,
  'https://share.vivodepot.de/',
  'http://share.vivodepot.de/holen.php?t=' + HEX48,
  'https://u' + '@' + 'share.vivodepot.de/holen.php?t=' + HEX48,   // Userinfo in der Adresse; zusammengesetzt, damit kein Mailmuster im Text steht
  '',
  null,
];

/* ── Erkennung ─────────────────────────────────────────────────────────────── */
function erkennungVerstoesse(V) {
  const raus = [];
  for (const u of JA) if (V.shlEinmaligZusage(u) !== 'ja') raus.push('ja erwartet: ' + u);
  for (const u of NEIN) if (V.shlEinmaligZusage(u) !== 'nein') raus.push('nein erwartet: ' + u);
  return raus;
}
test('[Einmalig·Erkennung] „ja“ nur für holen.php?t=<48 hex> und manifest.php?m=<64 hex> der voreingestellten Ablage, jede andere Form „nein“', () => {
  const { V } = ladeKern();
  assert.equal(typeof V.shlEinmaligZusage, 'function', 'die Erkennung fehlt');
  assert.deepEqual(erkennungVerstoesse(V), []);
});
test('[Einmalig·Erkennung] der Vergleichswert ist MARKEN_ADRESSEN.shlAblage, kein Literal in der Erkennung', () => {
  const t = fs.readFileSync(path.join(WURZEL, KERN_DATEI), 'utf8');
  const a = t.indexOf('function shlEinmaligZusage(');
  assert.ok(a > 0, 'shlEinmaligZusage steht im Kern');
  const rumpf = t.slice(a, t.indexOf('\n}\n', a));
  assert.match(rumpf, /MARKEN_ADRESSEN\.shlAblage/);
  assert.doesNotMatch(rumpf, /share\.vivodepot\.de/, 'kein Host-Literal');
  assert.match(rumpf, /shlAblageUrlPruefen\(/, 'erst die Prüfung der Adresse, dann die Erkennung');
});

/* ── Dialog treiben ────────────────────────────────────────────────────────── */
// Baut den Dialog mit Attrappen für Modal und Ergebnis, trägt `url` ein, bestätigt den Host und liefert, was entstand.
async function dialogFahren({ url, ueber }) {
  const { V, document } = ladeKern();
  await V.depotAnlegen('einmalig-pw-2026');
  const modale = [];
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  const erzeugt = [];
  const echtCreate = document.createElement.bind(document);
  document.createElement = (tag) => { const e = echtCreate(tag); erzeugt.push(e); return e; };
  const els = { datei: { onclick: null }, bauen: { onclick: null }, url: { value: '' }, ergebnis: echtCreate('div'), zeichen: { hidden: true }, pod: { onclick: null } };
  const echt = document.getElementById.bind(document);
  document.getElementById = (id) => {
    if (/^up-/.test(id)) return new Proxy({ value: 'Probe', textContent: '', classList: { add() {}, remove() {}, contains: () => false }, style: {} }, { get: (t, p) => (p in t ? t[p] : () => null), set: (t, p, v) => { t[p] = v; return true; } });
    if (id !== 'modal-inhalt' || !modale.length) return echt(id);
    return {
      querySelector: (s) => ({ '#shl-datei': els.datei, '#shl-bauen': els.bauen, '#shl-url': els.url, '#shl-ergebnis': els.ergebnis, '#shl-yb-zeichen': els.zeichen, '#shl-pod': els.pod })[s] || null,
      querySelectorAll: () => [],
    };
  };
  const exp = Math.floor(Date.UTC(2026, 10, 9, 10, 0, 0) / 1000);
  const teile = { jwe: 'a.b.c.d.e', key: 'k'.repeat(43), label: 'Probe', exp, weg: 'direkt' };
  if (ueber === 'link') {
    await V.flowLinkSenden(async () => teile, 'Probe', { nachfrage: { weg: 'fhir-ips', vorbelegung: { umfang: 'Patient Summary' } } });
  } else {
    V._shlDialogZeigen(teile, { titel: 'T', gueltigBis: V.STRINGS.linkSendenGueltigBis, vorHTML: '' });
  }
  const dialog = modale[modale.length - 1];
  els.url.value = url;
  els.bauen.onclick();
  const ok = erzeugt.find((e) => e.id === 'shl-host-ok');
  if (ok) ok.onclick();
  const chip = erzeugt.filter((e) => e.id === 'shl-einmalig').pop();
  const uri = erzeugt.find((e) => e.id === 'shl-uri');
  return { V, modale, dialog, chip, uri, zeichen: els.zeichen, bis: V.heuteLokal(new Date(exp * 1000)) };
}

async function oberflaecheVerstoesse() {
  const raus = [];
  for (const [url, z] of [[JA[0], 'ja'], [JA[1], 'ja'], [NEIN[0], 'nein'], [NEIN[1], 'nein']]) {
    const r = await dialogFahren({ url });
    if (!r.uri) { raus.push('kein Link: ' + url); continue; }
    if (!r.chip) { raus.push('kein Ergebnis zur Einmaligkeit: ' + url); continue; }
    if (!String(r.chip.className).split(/\s+/).includes('shl-einmalig-' + z)) raus.push('Klasse ' + r.chip.className + ' statt shl-einmalig-' + z + ': ' + url);
    const soll = String(z === 'ja' ? r.V.STRINGS.shlZusageEinmalig : r.V.STRINGS.shlZusageNichtEinmalig).replace('{datum}', r.V._datumDeutsch(r.bis));
    if (!soll || /undefined/.test(soll) || r.chip.textContent !== soll) raus.push('Text „' + r.chip.textContent + '“ statt „' + soll + '“: ' + url);
  }
  return raus;
}
test('[Einmalig·Oberfläche] das Ergebnis sagt sichtbar „Einmal abrufbar“ oder „Nicht einmalig“, mit dem Datum; Pod und fremde Ablage „nicht einmalig“', async () => {
  assert.deepEqual(await oberflaecheVerstoesse(), []);
});

test('[Einmalig·Zeichen] das One-Time-Share-Zeichen ist nur bei erkannter Ablage sichtbar, vorher und bei „nein“ verborgen', async () => {
  const t = fs.readFileSync(path.join(WURZEL, KERN_DATEI), 'utf8');
  const a = t.indexOf('async function flowShlVorbereiten(');
  const rumpf = t.slice(a, t.indexOf('\n}\n', a));
  assert.match(rumpf, /<p id="shl-yb-zeichen" hidden>' \+ ybZeichenFuerQuelle\('share', e\)/, 'das Zeichen steht verborgen im Dialog');
  assert.doesNotMatch(rumpf, /'<p>' \+ ybZeichenFuerQuelle\('share'/, 'kein offenes Zeichen vor der Adresswahl');
  const ja = await dialogFahren({ url: JA[0] });
  assert.equal(ja.zeichen.hidden, false, 'bei „ja“ sichtbar');
  const nein = await dialogFahren({ url: NEIN[0] });
  assert.equal(nein.zeichen.hidden, true, 'bei „nein“ verborgen');
});

test('[Einmalig·Vermerk] die Nachfrage für „Herausgegeben“ nennt Host, Zusage und Datum im Umfang', async () => {
  for (const [url, z, host] of [[JA[0], 'ja', 'share.vivodepot.de'], [NEIN[0], 'nein', 'pod.example.org']]) {
    const r = await dialogFahren({ url, ueber: 'link' });
    assert.ok(r.uri, 'ein Link entstand');
    r.dialog.onPrimaer(() => {});                                   // „Schließen“
    await tick(10);
    const vermerk = r.modale[r.modale.length - 1];
    assert.equal(vermerk.titel, r.V.STRINGS.uebergabeProtokollTitel, 'die Nachfrage öffnet sich');
    const m = /id="up-umfang"[^>]*value="([^"]*)"/.exec(vermerk.koerperHTML);
    assert.ok(m, 'der Umfang ist vorbelegt');
    const zusage = String(z === 'ja' ? r.V.STRINGS.shlZusageEinmalig : r.V.STRINGS.shlZusageNichtEinmalig).replace('{datum}', r.V._datumDeutsch(r.bis));
    const soll = 'Patient Summary · ' + String(r.V.STRINGS.shlVermerkLink).replace('{host}', host) + ' · ' + zusage;
    assert.equal(m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'), soll);
  }
});

/* ── Klasse: keine Einmaligkeits-Formel ohne Bedingung ─────────────────────── */
const FORMELN = /einmal abrufbar|einmalig abrufbar|genau einmal abrufbar|nur einmal abrufbar|retrieved (?:exactly )?once|retrievable once|one-time share|single-use|single use/i;
// Jede Fundstelle mit ihrer Bedingung. Die Liste darf nur kürzer werden (Register der Gegenlesung).
const ZUSAGEN_EINMALIG = {
  'de#strings:shlZusageEinmalig.text': 'nur im Ergebnis bei erkannter Ablage (shlEinmaligZusage = ja)',
  'de-pro#strings:shlZusageEinmalig.text': 'nur im Ergebnis bei erkannter Ablage (shlEinmaligZusage = ja)',
  'en#strings:shlZusageEinmalig.text': 'nur im Ergebnis bei erkannter Ablage (shlEinmaligZusage = ja)',
  'en-pro#strings:shlZusageEinmalig.text': 'nur im Ergebnis bei erkannter Ablage (shlEinmaligZusage = ja)',
  'de#hilfe:weitergeben-empfaengerin.abschnitt0': 'spricht nur von der voreingestellten Ablage und nennt „Nicht einmalig“ für jede andere',
  'de-pro#hilfe:weitergeben-empfaengerin.abschnitt0': 'spricht nur von der voreingestellten Ablage und nennt „Nicht einmalig“ für jede andere',
  'en#hilfe:weitergeben-empfaengerin.abschnitt0': 'spricht nur von der voreingestellten Ablage und nennt „Not one-time“ für jede andere',
  'en-pro#hilfe:weitergeben-empfaengerin.abschnitt0': 'spricht nur von der voreingestellten Ablage und nennt „Not one-time“ für jede andere',
};
// Code ohne Kommentare: Blockkommentare weg, Zeilenkommentare nur nach Leerraum oder am Zeilenanfang (https:// bleibt).
function ohneKommentare(text) {
  return String(text).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|\s)\/\/[^\n]*/g, '$1');
}
function fundstellen(lies) {
  const raus = new Set();
  for (const [kurz, datei] of MODULE) {
    const m = JSON.parse(lies(datei));
    for (const [k, v] of Object.entries(m.texte || {})) if (typeof v === 'string' && FORMELN.test(v)) raus.add(kurz + '#' + k);
  }
  ohneKommentare(lies(KERN_DATEI)).split('\n').forEach((z, i) => { if (FORMELN.test(z)) raus.add(KERN_DATEI + ':' + (i + 1)); });
  return raus;
}
function zusagenVerstoesse(leser) {
  const lies = leser || ((d) => fs.readFileSync(path.join(WURZEL, d), 'utf8'));
  const ist = fundstellen(lies);
  const raus = [];
  for (const f of ist) if (!Object.prototype.hasOwnProperty.call(ZUSAGEN_EINMALIG, f)) raus.push('ohne Bedingung: ' + f);
  const da = new Set(MODULE.map(([k]) => k).concat([KERN_DATEI]));
  for (const f of Object.keys(ZUSAGEN_EINMALIG)) if (da.has(f.split(/[#:]/)[0]) && !ist.has(f)) raus.push('Eintrag ohne Fundstelle (Liste kürzen): ' + f);
  return raus;
}
test('[Einmalig·Klasse·Wächter] jede Einmaligkeits-Formel in Kern und Textsätzen steht mit ihrer Bedingung in ZUSAGEN_EINMALIG, jeder Eintrag hat eine Fundstelle', () => {
  assert.deepEqual(zusagenVerstoesse(), []);
});
test('[Einmalig·Hilfe] die Hilfe bindet „einmal abrufbar“ an die voreingestellte Ablage und nennt die Anzeige für jede andere', () => {
  const de = JSON.parse(fs.readFileSync(path.join(WURZEL, SPRACHEN.de), 'utf8')).texte['hilfe:weitergeben-empfaengerin.abschnitt0'];
  const en = JSON.parse(fs.readFileSync(path.join(WURZEL, SPRACHEN.en), 'utf8')).texte['hilfe:weitergeben-empfaengerin.abschnitt0'];
  assert.match(de, /voreingestellte Ablage/);
  assert.match(de, /Nicht einmalig/);
  assert.match(en, /default storage/);
  assert.match(en, /Not one-time/);
  // Die sieben Tage nennt der Link; tragen tut sie nur die voreingestellte Ablage (löscht beim Abruf, sonst nach Ablauf).
  assert.match(de, /Der Link nennt einen Ablauf nach sieben Tagen/);
  assert.match(de, /Die Ablage löscht die Datei beim Abruf, sonst nach Ablauf/);
  assert.doesNotMatch(de, /sieben Tage gültig/, 'keine Frist-Zusage ohne Bindung an die Ablage');
  assert.match(en, /The link states an expiry after seven days/);
  assert.match(en, /deletes the file when it is retrieved, otherwise after the expiry/);
  assert.doesNotMatch(en, /valid for seven days/);
  for (const [kurz, m] of MODULE) {
    const t = JSON.parse(fs.readFileSync(path.join(WURZEL, m), 'utf8')).texte;
    assert.ok(String(t['strings:shlZusageNichtEinmalig.text']).includes('{datum}'), kurz + ': „nicht einmalig“ mit Datum');
    // Die Frist trägt bei einer anderen Ablage nur der Link (exp ist in der SHL-Spec ein Hinweis): kein „gültig bis“ dort.
    assert.doesNotMatch(String(t['strings:shlZusageNichtEinmalig.text']), /gültig bis|valid until/, kurz + ': keine Frist-Zusage ohne Träger');
    assert.match(String(t['strings:shlZusageNichtEinmalig.text']), /Ablauf im Link|link states expiry/, kurz + ': Frist als Angabe im Link');
    assert.equal(t['hilfe:weitergeben-empfaengerin.abschnitt0'], (kurz.startsWith('de') ? de : en), kurz + ': Pro wie Privat');
  }
});

/* ── Rot-Beweis ────────────────────────────────────────────────────────────── */
test('[Einmalig·Rot-Beweis] vor dem Fix fehlen Erkennung und Ergebnis, das Zeichen steht offen, die Hilfe sagt „einmal abrufbar“ ohne Bedingung; ein gepflanzter Text macht den Wächter rot', () => {
  const VOR = vorDemFix();
  const alt = (d) => execFileSync('git', ['show', VOR + ':' + d], { cwd: WURZEL, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: ohneGitUmgebung() });
  const kern = alt(KERN_DATEI);
  assert.ok(!kern.includes('function shlEinmaligZusage('), 'vorher: keine Erkennung');
  assert.ok(!kern.includes("'shl-einmalig'"), 'vorher: kein Ergebnis zur Einmaligkeit');
  assert.match(kern, /'<p>' \+ ybZeichenFuerQuelle\('share', e\) \+ '<\/p>'/, 'vorher: das Zeichen steht offen vor der Adresswahl');
  const hilfe = JSON.parse(alt(SPRACHEN.de)).texte['hilfe:weitergeben-empfaengerin.abschnitt0'];
  assert.match(hilfe, /einmal abrufbar und sieben Tage gültig/, 'vorher: ohne Bedingung');
  assert.doesNotMatch(hilfe, /voreingestellte Ablage/);
  // Der Wächter selbst: ein gepflanzter Satz ohne Eintrag fällt auf.
  const echt = (d) => fs.readFileSync(path.join(WURZEL, d), 'utf8');
  const gepflanzt = (d) => {
    if (d !== SPRACHEN.de) return echt(d);
    const m = JSON.parse(echt(d)); m.texte['strings:gepflanzt.text'] = 'Der Link ist einmal abrufbar.'; return JSON.stringify(m);
  };
  assert.deepEqual(zusagenVerstoesse(gepflanzt), ['ohne Bedingung: de#strings:gepflanzt.text']);
});

/* Proben-Deklaration (U2-ADR-099, §7.5): die drei Wächter oben sind Kollektoren; der Prüfstand ersetzt je die Diskriminante
   durch eine, die immer meldet, und verlangt, dass der Test dann fällt. */
module.exports = {
  PROBEN: [
    { fuer: '[Einmalig·Erkennung] „ja“ nur für holen.php?t=<48 hex> und manifest.php?m=<64 hex> der voreingestellten Ablage, jede andere Form „nein“', diskriminante: erkennungVerstoesse },
    { fuer: '[Einmalig·Oberfläche] das Ergebnis sagt sichtbar „Einmal abrufbar“ oder „Nicht einmalig“, mit dem Datum; Pod und fremde Ablage „nicht einmalig“', diskriminante: oberflaecheVerstoesse },
    { fuer: '[Einmalig·Klasse·Wächter] jede Einmaligkeits-Formel in Kern und Textsätzen steht mit ihrer Bedingung in ZUSAGEN_EINMALIG, jeder Eintrag hat eine Fundstelle', diskriminante: zusagenVerstoesse },
  ],
};

test('[Einmalig·Datum] der Hinweis zeigt den Tag als TT.MM.JJJJ wie jede Datumsanzeige im Kern, nicht als JJJJ-MM-TT', () => {
  const { V } = ladeKern();
  assert.equal(V._datumDeutsch('2026-11-09'), '09.11.2026');
  const kern = fs.readFileSync(path.join(WURZEL, KERN_DATEI), 'utf8');
  const rumpf = kern.slice(kern.indexOf('function _shlZusageZeigen('), kern.indexOf('function _shlVermerkUmfang('));
  assert.match(rumpf, /replace\('\{datum\}', _datumDeutsch\(bis\)\)/, 'der Hinweis formatiert das Datum über _datumDeutsch');
  const vermerk = kern.slice(kern.indexOf('function _shlVermerkUmfang('), kern.indexOf('function _shlVermerkUmfang(') + 800);
  assert.match(vermerk, /_datumDeutsch\(info\.bis/, 'der Vermerk ebenso, nicht roh JJJJ-MM-TT');
});
