'use strict';
/* Abgeschaffte Begriffe — kein Text verweist auf eine Funktion oder einen Begriff, den es nicht mehr gibt (18.10.2026).
   Anlass: Der Leertext der Prüftermine verwies noch auf den „Bearbeiten-Modus“, den der Umbau vom 06.06.2026 abgeschafft
   hatte (UX-Durchsicht 03.10.2026). Zweiter Eintrag: die alten englischen Vorsorgebegriffe („advance directive“,
   „lasting power of attorney“, „care court“), abgelöst durch die amtlichen Begriffe der Bundesnotarkammer und der
   BGB-Übersetzung; dritter Eintrag: deutsche Vorsorgebegriffe in Klammern im englischen Text (legen das Gerüst auf ein Land
   fest). Das Register tools/abgeschaffte-begriffe.json führt je Eintrag seine Muster; geprüft werden der DE- und
   EN-Textsatz, der englische IPS-Begleittext und die Render-Aufnahmen. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const REGISTER = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'abgeschaffte-begriffe.json'), 'utf8'));
const saetze = (t) => String(t).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
// Ein Treffer je Begriff: ein Satz trifft ein Muster, der ganze Text trifft nicht `ausserWenn`, der Schlüssel nicht
// `ausserWennKennung`, und der Satz steht nicht gebunden an Schlüssel UND Wortlaut in `ausnahmen`.
function treffer(text, schluessel, englisch = true) {
  const raus = [];
  for (const b of REGISTER.begriffe) {
    if (b.ausserWenn && new RegExp(b.ausserWenn, 'i').test(text)) continue;
    if (b.ausserWennKennung && schluessel && new RegExp(b.ausserWennKennung).test(schluessel)) continue;   // zitierter amtlicher Wortlaut
    if (b.nurEnglisch && !englisch) continue;
    const ms = b.muster.map((m) => new RegExp(m, 'i'));
    for (const satz of saetze(text)) {
      if (!ms.some((r) => r.test(satz))) continue;
      if ((b.ausnahmen || []).some((a) => a.schluessel === schluessel && a.satz === satz)) continue;
      raus.push(b.begriff); break;
    }
  }
  return raus;
}
// Die Quellen des Registers: Vivodepots eigener Wortlaut (Eintrag „geltung“ in tools/abgeschaffte-begriffe.json). Kein Modul eines anderen
// Rechtsraums: dort sind Eigennamen wie „Lasting Power of Attorney“ (England und Wales) richtig.
const TEXTSATZ_QUELLEN = ['textsatz-de-modul.json', 'textsatz-en-modul.json'];
const IPS_QUELLE = 'ips-begleittext-modul.json';
// Ein Modul gehört einem anderen Rechtsraum, wenn es selbst einen Rechtsraum außer DE nennt (oberste Ebene oder Kopf).
function fremderRechtsraum(modul) {
  const r = modul && (modul.rechtsraum || (modul.kopf && modul.kopf.rechtsraum));
  return typeof r === 'string' && !/^DE\b/.test(r);
}
const textsatz = (datei) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', datei), 'utf8')).texte;
const sichtbar = (html) => html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');

// Diskriminante des Register-Wächters: die Einträge und Ausnahmen, denen Datum, Grund, Muster oder Rot-Fälle fehlen.
function registerMaengel(register) {
  const v = [];
  for (const b of register.begriffe) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.seit)) v.push(b.begriff + ': Datum');
    if (!(String(b.grund || '').length >= 20)) v.push('Grund fehlt: ' + b.begriff);
    if (!(b.muster.length && b.rot.length)) v.push(b.begriff + ': Muster oder Rot-Fälle');
    for (const a of b.ausnahmen || []) if (!(String(a.grund || '').length >= 20)) v.push(b.begriff + ': Ausnahme ohne Grund ' + a.schluessel);
  }
  return v;
}
test('[Abgeschafft·Register] jeder Eintrag hat Datum, Grund, Muster und Rot-Fälle; jede Ausnahme einen Grund', () => {
  assert.ok(REGISTER.begriffe.length >= 2);
  assert.deepEqual(registerMaengel(REGISTER), []);
});

test('[Abgeschafft·Ausnahmen] eine Ausnahme gilt nur für Schlüssel und Wortlaut', () => {
  const b = REGISTER.begriffe.find((x) => x.nurEnglisch);
  const a = b.ausnahmen[0];
  assert.deepEqual(treffer(a.satz, a.schluessel), []);
  assert.ok(treffer(a.satz, 'anderer:schluessel').includes(b.begriff), 'anderer Schlüssel: Treffer');
  assert.ok(treffer(a.satz + ' (copy)', a.schluessel).includes(b.begriff), 'geänderter Satz: Treffer');
  assert.deepEqual(treffer('A lasting power of attorney.', 'x', false), [], 'nur englisch: der deutsche Satz wird nicht gelesen');
});

test('[Abgeschafft·Rot-Beweis] jeder Rot-Fall des Registers wird erkannt, darunter der alte Prüftermine-Satz in beiden Sprachen', () => {
  for (const b of REGISTER.begriffe) for (const s of b.rot) assert.ok(treffer(s).includes(b.begriff), 'nicht erkannt: ' + s);
  // die Fassungen vor dem 18.10.2026, wörtlich
  const alt = {
    'strings:prueftermineEinfuehrung.text': 'Legen Sie in einem Bereich ein Dokument an (z. B. im Bearbeiten-Modus unter „Dokumente“), dann erscheint es hier mit seinem Stand.',
    'dokument.living-will.name': 'Advance directive',
    'strings:kbvPkaExportiert.text': 'Lasting power of attorney saved as a patient summary file.',
    'people.childrenAndDependants/careCourt.label': 'Care court',
    'dokument.living-will.name#zwischenstand': 'Living will (Patientenverfügung)',
  };
  for (const [k, v] of Object.entries(alt)) assert.ok(treffer(v, k).length, 'alte Fassung nicht erkannt: ' + k);
});

test('[Abgeschafft·Textsatz] kein Text im DE- und EN-Textsatz verweist auf einen abgeschafften Begriff', () => {
  const funde = [];
  for (const datei of TEXTSATZ_QUELLEN) {
    for (const [k, v] of Object.entries(textsatz(datei))) if (typeof v === 'string' && treffer(v, k, datei.includes('-en-')).length) funde.push(datei + ' ' + k);
  }
  assert.deepEqual(funde, []);
});

test('[Abgeschafft·IPS] der englische IPS-Begleittext trägt keinen alten Vorsorgebegriff (Sektionstitel „Advance Directives“ ist der IPS-Name)', () => {
  const m = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', IPS_QUELLE), 'utf8'));
  const funde = Object.entries(m.sprachen.en.texte).filter(([k, v]) => k !== 'sektionVorsorge' && typeof v === 'string' && treffer(v, 'ips:' + k).length);
  assert.deepEqual(funde.map(([k]) => k), []);
});

test('[Abgeschafft·Render] keine Render-Aufnahme zeigt einen Verweis auf einen abgeschafften Begriff', () => {
  const ordner = path.join(REPO, 'tests', 'fixtures', 'render-aufnahme');
  const funde = [];
  for (const n of fs.readdirSync(ordner).filter((x) => x.endsWith('.html'))) {
    if (treffer(sichtbar(fs.readFileSync(path.join(ordner, n), 'utf8'))).length) funde.push(n);
  }
  assert.deepEqual(funde, []);
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Textsatz, IPS und Render teilen die eine Diskriminante `treffer`. Ausnahmen und Rot-Beweis sind Konstruktions-Form. */
module.exports = {
  PROBEN: [
    { fuer: '[Abgeschafft·Register] jeder Eintrag hat Datum, Grund, Muster und Rot-Fälle; jede Ausnahme einen Grund', diskriminante: registerMaengel },
    { fuer: '[Abgeschafft·Textsatz] kein Text im DE- und EN-Textsatz verweist auf einen abgeschafften Begriff', diskriminante: treffer },
    { fuer: '[Abgeschafft·IPS] der englische IPS-Begleittext trägt keinen alten Vorsorgebegriff (Sektionstitel „Advance Directives“ ist der IPS-Name)', diskriminante: treffer },
    { fuer: '[Abgeschafft·Render] keine Render-Aufnahme zeigt einen Verweis auf einen abgeschafften Begriff', diskriminante: treffer },
  ],
};

test('[Abgeschafft·Geltung] das Register liest nur Vivodepots eigenen Wortlaut, kein Modul eines anderen Rechtsraums', () => {
  assert.match(REGISTER.geltung || '', /anderen Rechtsraums/, 'der Eintrag „geltung“ sagt es ausdrücklich');
  for (const datei of [...TEXTSATZ_QUELLEN, IPS_QUELLE]) {
    const m = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', datei), 'utf8'));
    assert.equal(fremderRechtsraum(m), false, datei + ' gehört keinem anderen Rechtsraum');
  }
  // Rot-Beweis: ein Modul des Rechtsraums England und Wales in den Quellen fiele auf.
  assert.equal(fremderRechtsraum({ modulTyp: 'rechtsraum', rechtsraum: 'GB-ENG-WLS' }), true);
  assert.equal(fremderRechtsraum({ kopf: { rechtsraum: 'GB-ENG-WLS' } }), true);
  assert.equal(fremderRechtsraum({ modulTyp: 'rechtsraum', rechtsraum: 'DE' }), false, 'Gegenprobe: das deutsche Modul ist eigener Wortlaut');
});
