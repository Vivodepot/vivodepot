#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   fim-modul-erzeugen.mjs — aus dem XSD einer FIM-Leistung und einer Zuordnung ein Format-Modul erzeugen (U2-ADR-465)
   ────────────────────────────────────────────────────────────────────────────
   Das XSD stammt vom Umwandler des FIM-Portals (tools/fim-schema-beschaffen.mjs). Die Zuordnung sagt je Schema-Pfad
   (`G….F…`, wie ihn das XSD verschachtelt), woher der Wert kommt: aus einem Depot-Feld (`bereich`, `feld`, wahlweise
   `werte` oder `teil`) oder als fester Wert (`fest`). Beides — Struktur und Zuordnung — ist Inhalt der Leistung und
   liegt außerhalb des Repos, solange die FITKO der Nutzung nicht zugestimmt hat (U2-ADR-456). Im Repo liegt nur die
   erfundene Leistung S99000001.

   Was das Werkzeug zusichert:
     · die Zuordnung des Moduls folgt der Elementfolge des XSD; ein Pfad, den das XSD nicht kennt, ist ein Fehler.
     · `fest` und die Zielwerte in `werte` müssen in der Aufzählung des Elements stehen, wenn es eine hat.
     · ein Pflichtelement ohne Zuordnung wird als Lücke BENANNT (Pfad), nicht gefüllt.
     · Elemente vom Typ xs:anyType sind Anhänge. Sie werden nur über eine ROLLE zugeordnet (`anhang`: bescheid,
       vollmacht-nachweis, lichtbild — die Liste des Kerns, FORMAT_ANHANG_ROLLEN), nie über ein Feld; `pflicht` übernimmt
       das Werkzeug aus dem XSD (U2-ADR-465 Nachtrag). Bleibt ein Pflicht-Anhang ohne Zuordnung, verlangt das Werkzeug
       einen `hinweis` in der Zuordnung — sonst erzeugt es nichts. Der Wortlaut kommt aus der Zuordnung, nicht aus dem
       Werkzeug.
     · `vertreter` (ein Feld der bevollmächtigten Person) nur zusammen mit der Rolle vollmacht-nachweis.
   Aufruf:
     node tools/fim-modul-erzeugen.mjs --xsd <pfad> --zuordnung <pfad> --ziel <modul.json>
     node tools/fim-modul-erzeugen.mjs            (erfundene Leistung S99000001, Ausgabe nach stdout)
   Exit 0 = Modul geschrieben (Lücken stehen in der Ausgabe), 1 = Fehler, 2 = Aufruf falsch.
   Probe: tests/fim-modul-erzeugen.test.js
   ════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const FX = path.join(HIER, '..', 'tests', 'fixtures', 'fim-schema');
export const FIXTURE = Object.freeze({
  xsd: path.join(FX, 'S99000001-antrag.xsd'),
  zuordnung: path.join(FX, 'S99000001-zuordnung.json'),
});

/* Die Rollen und Personenfelder des Kerns (FORMAT_ANHANG_ROLLEN, FORMAT_VERTRETER_FELDER) — Gleichlauf hält
   tests/fim-modul-erzeugen.test.js. */
export const ANHANG_ROLLEN = Object.freeze(['bescheid', 'vollmacht-nachweis', 'lichtbild']);
export const VERTRETER_FELDER = Object.freeze(['familyName', 'givenName', 'street', 'houseNumber', 'postalCode', 'city']);

const attr = (tag, name) => (new RegExp('\\s' + name + '="([^"]*)"').exec(tag) || [])[1];

/** Liest die Element-Struktur eines XSD (anonyme Typen, xs:sequence) zu einem Baum. */
export function schemaLesen(xsdText) {
  const ns = attr(/<xs:schema\b[^>]*>/.exec(xsdText)?.[0] || '', 'targetNamespace') || null;
  const wurzelKnoten = { kinder: [] };
  const stapel = [wurzelKnoten];
  for (const m of xsdText.matchAll(/<(\/?)xs:(element|enumeration)\b([^>]*?)(\/?)>/g)) {
    const [, zu, art, rest, selbst] = m;
    const oben = stapel[stapel.length - 1];
    if (art === 'enumeration') { if (!zu && oben.enum) oben.enum.push(attr(' ' + rest, 'value')); continue; }
    if (zu) { stapel.pop(); continue; }
    const k = { name: attr(' ' + rest, 'name'), min: Number(attr(' ' + rest, 'minOccurs') ?? 1),
      max: attr(' ' + rest, 'maxOccurs') ?? '1', anhang: attr(' ' + rest, 'type') === 'xs:anyType', enum: [], kinder: [] };
    if (!k.name) throw new Error('xs:element ohne name (ref wird nicht gelesen): ' + m[0]);
    oben.kinder.push(k);
    if (!selbst) stapel.push(k);
  }
  if (wurzelKnoten.kinder.length !== 1) throw new Error('das XSD hat nicht genau ein Wurzelelement');
  return { ns, wurzel: wurzelKnoten.kinder[0] };
}

/** Alle Blätter (Felder und Anhänge) in Dokumentfolge, mit Pfad unterhalb der Wurzel und ob sie Pflicht sind. */
export function blaetter(wurzel) {
  const raus = [];
  (function lauf(k, pfad, pflicht) {
    for (const c of k.kinder) {
      const p = pfad ? pfad + '.' + c.name : c.name;
      const pf = pflicht && c.min > 0;
      if (c.kinder.length) lauf(c, p, pf);
      else raus.push({ pfad: p, pflicht: pf, anhang: c.anhang, enum: c.enum });
    }
  })(wurzel, '', true);
  return raus;
}

export function modulErzeugen(xsdText, zuordnung) {
  const { ns, wurzel } = schemaLesen(xsdText);
  const liste = blaetter(wurzel);
  const jePfad = new Map(liste.map((b) => [b.pfad, b]));
  const z = zuordnung.felder || {};
  const fehler = [];
  for (const p of Object.keys(z)) if (!jePfad.has(p)) fehler.push('Pfad nicht im Schema: ' + p);
  const offen = liste.filter((b) => b.anhang && b.pflicht && !(z[b.pfad] && z[b.pfad].anhang)).map((b) => b.pfad);
  if (offen.length && !(typeof zuordnung.hinweis === 'string' && zuordnung.hinweis.trim()))
    fehler.push('das Schema hat Pflicht-Anhänge ohne Zuordnung (' + offen.length + '): ohne `hinweis` in der Zuordnung kein Modul');
  const rollen = Object.values(z).filter((e) => e && e.anhang).map((e) => e.anhang);
  if (new Set(rollen).size !== rollen.length) fehler.push('eine Anhang-Rolle ist mehrfach zugeordnet');
  if (Object.values(z).some((e) => e && e.vertreter) && !rollen.includes('vollmacht-nachweis'))
    fehler.push('`vertreter` nur mit der Anhang-Rolle vollmacht-nachweis');
  const eintraege = [];
  const luecken = [];
  for (const b of liste) {
    const e = z[b.pfad];
    if (b.anhang) {
      if (!e) { if (b.pflicht) luecken.push({ pfad: b.pfad, art: 'anhang' }); continue; }
      if (!e.anhang || Object.keys(e).some((k) => k !== 'anhang')) { fehler.push('Anhang nur über eine Rolle (`anhang`) zuordenbar: ' + b.pfad); continue; }
      if (!ANHANG_ROLLEN.includes(e.anhang)) { fehler.push(b.pfad + ': unbekannte Anhang-Rolle ' + e.anhang); continue; }
      eintraege.push(b.pflicht ? { anhang: e.anhang, ziel: b.pfad, pflicht: true } : { anhang: e.anhang, ziel: b.pfad });
      continue;
    }
    if (!e) { if (b.pflicht) luecken.push({ pfad: b.pfad, art: 'ohne-zuordnung' }); continue; }
    if (e.anhang) { fehler.push(b.pfad + ': `anhang` nur an einem Element vom Typ xs:anyType'); continue; }
    if (e.vertreter) {
      if (Object.keys(e).some((k) => k !== 'vertreter') || !VERTRETER_FELDER.includes(e.vertreter)) fehler.push(b.pfad + ': `vertreter` allein, mit einem Feld aus ' + VERTRETER_FELDER.join(', '));
      else eintraege.push({ vertreter: e.vertreter, ziel: b.pfad });
      continue;
    }
    const hatFest = Object.prototype.hasOwnProperty.call(e, 'fest');
    if (hatFest === !!e.feld) { fehler.push(b.pfad + ': genau eines von `feld` und `fest`'); continue; }
    if (b.enum.length) {
      if (hatFest && !b.enum.includes(String(e.fest))) fehler.push(b.pfad + ': fester Wert nicht in der Aufzählung');
      if (e.werte) for (const w of Object.values(e.werte)) if (!b.enum.includes(String(w))) fehler.push(b.pfad + ': Zielwert ' + w + ' nicht in der Aufzählung');
    }
    const eintrag = hatFest ? { fest: e.fest, ziel: b.pfad } : { feld: e.feld, ziel: b.pfad };
    if (!hatFest && e.bereich && e.bereich !== zuordnung.sektor) eintrag.bereich = e.bereich;
    if (!hatFest && e.werte) eintrag.werte = e.werte;
    if (!hatFest && e.teil) eintrag.teil = e.teil;
    eintraege.push(eintrag);
  }
  if (fehler.length) return { fehler, luecken };
  const modul = {
    modulTyp: 'format', moduleVersion: zuordnung.moduleVersion || 1, sprache: zuordnung.sprache || 'de',
    format: zuordnung.format, richtung: 'export', schreiber: 'xml@1', sektor: zuordnung.sektor, label: zuordnung.label,
    wurzel: wurzel.name, namensraum: ns,
  };
  if (typeof zuordnung.hinweis === 'string' && zuordnung.hinweis.trim()) modul.hinweis = zuordnung.hinweis;
  modul.zuordnung = eintraege;
  return { modul, luecken, fehler: [] };
}

function argumente(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!['--xsd', '--zuordnung', '--ziel'].includes(k) || argv[i + 1] === undefined) return null;
    a[k.slice(2)] = argv[++i];
  }
  return a;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = argumente(process.argv.slice(2));
  if (!a || (Object.keys(a).length && !(a.xsd && a.zuordnung))) {
    console.error('Aufruf: node tools/fim-modul-erzeugen.mjs [--xsd <pfad> --zuordnung <pfad> [--ziel <modul.json>]]');
    process.exit(2);
  }
  const xsd = a.xsd || FIXTURE.xsd, zu = a.zuordnung || FIXTURE.zuordnung;
  const r = modulErzeugen(fs.readFileSync(xsd, 'utf8'), JSON.parse(fs.readFileSync(zu, 'utf8')));
  for (const f of r.fehler) console.error('[fim-modul] FEHLER ' + f);
  for (const l of r.luecken) console.error('[fim-modul] Lücke ' + l.art + ': ' + l.pfad);
  if (r.fehler.length) process.exit(1);
  const text = JSON.stringify(r.modul, null, 2) + '\n';
  if (a.ziel) { fs.writeFileSync(a.ziel, text); console.error('[fim-modul] geschrieben: ' + a.ziel + ' (' + r.modul.zuordnung.length + ' Zuordnungen, ' + r.luecken.length + ' Lücken)'); }
  else process.stdout.write(text);
}
