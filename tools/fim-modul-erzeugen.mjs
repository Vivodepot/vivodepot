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
     · Elemente vom Typ xs:anyType sind Anhänge. Die erste Stufe schreibt keinen Anhang; hat das Schema einen, verlangt
       das Werkzeug einen `hinweis` in der Zuordnung — sonst erzeugt es nichts. Der Wortlaut kommt aus der Zuordnung,
       nicht aus dem Werkzeug.
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
  const anhaenge = liste.filter((b) => b.anhang).map((b) => b.pfad);
  if (anhaenge.length && !(typeof zuordnung.hinweis === 'string' && zuordnung.hinweis.trim()))
    fehler.push('das Schema hat Anhänge (' + anhaenge.length + '), die erste Stufe schreibt keine: ohne `hinweis` in der Zuordnung kein Modul');
  const eintraege = [];
  const luecken = [];
  for (const b of liste) {
    const e = z[b.pfad];
    if (b.anhang) { if (e) fehler.push('Anhang ist in der ersten Stufe nicht zuordenbar: ' + b.pfad); if (b.pflicht) luecken.push({ pfad: b.pfad, art: 'anhang' }); continue; }
    if (!e) { if (b.pflicht) luecken.push({ pfad: b.pfad, art: 'ohne-zuordnung' }); continue; }
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
