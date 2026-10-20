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
   JSON-WEG (U2-ADR-465 Nachtrag, 16.10.2026): aus dem JSON-Schema einer Leistung (draft 2020-12, Form des FIM-Portals:
   Schlüssel aus Kennung und Fassung, Gruppen über `$defs`, `required`) ein Modul mit dem Schreiber json@1. Die Ziele sind
   LISTEN von Pfadstufen (ein FIM-Schlüssel trägt selbst einen Punkt), `schemaUri` ist die `$id` des Schemas. In der Zuordnung
   steht je Pfad die Stufenfolge mit „/“ verbunden (`G….V1.0/F….V1.0`). Dieselben Regeln wie oben für `feld`, `fest`, `werte`
   und Lücken; `teil` nur an einem Zahlfeld. Anhänge und `vertreter` trägt nur der XSD-Weg (Fehler, nicht still übergangen).
   Aufruf:
     node tools/fim-modul-erzeugen.mjs --xsd <pfad> --zuordnung <pfad> --ziel <modul.json>
     node tools/fim-modul-erzeugen.mjs --json-schema <pfad> --zuordnung <pfad> --ziel <modul.json>
     node tools/fim-modul-erzeugen.mjs            (erfundene Leistung S99000001, Ausgabe nach stdout)
   Exit 0 = Modul geschrieben (Lücken stehen in der Ausgabe), 1 = Fehler, 2 = Aufruf falsch.
   Probe: eine nicht öffentliche Probe
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
export const FIXTURE_JSON = Object.freeze({
  schema: path.join(FX, 'S99000001_V1.0.schema.json'),
  zuordnung: path.join(FX, 'S99000001-zuordnung-json.json'),
});

/* Die Rollen und Personenfelder des Kerns (FORMAT_ANHANG_ROLLEN, FORMAT_VERTRETER_FELDER) — Gleichlauf hält
   eine nicht öffentliche Probe. */
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

/* ── JSON-Weg ─────────────────────────────────────────────────────────────── */
const _JSON_TIEFE_HOECHSTENS = 32;
/** Ein lokaler Verweis (`#/$defs/<name>`) aufgelöst; jeder andere ist ein Fehler — der Erzeuger lädt nichts nach. */
function _defAufloesen(schema, knoten, kette) {
  let k = knoten;
  while (k && typeof k === 'object' && typeof k.$ref === 'string') {
    const m = /^#\/\$defs\/([^/]+)$/.exec(k.$ref);
    if (!m || !schema.$defs || !Object.prototype.hasOwnProperty.call(schema.$defs, m[1])) throw new Error('Verweis nicht im Schema: ' + k.$ref);
    if (kette.includes(m[1])) throw new Error('Verweis im Kreis: ' + kette.concat(m[1]).join(' → '));
    kette = kette.concat(m[1]);
    k = schema.$defs[m[1]];
  }
  return { knoten: k, kette };
}
/** Alle Blätter eines JSON-Schemas in Schemafolge: Stufen, ob Pflicht, Aufzählung, Typ. */
export function jsonBlaetter(schema) {
  const raus = [];
  (function lauf(knoten, stufen, pflicht, kette) {
    if (stufen.length > _JSON_TIEFE_HOECHSTENS) throw new Error('Schema tiefer als ' + _JSON_TIEFE_HOECHSTENS + ' Stufen');
    const { knoten: k, kette: weiter } = _defAufloesen(schema, knoten, kette);
    if (!k || typeof k !== 'object') throw new Error('kein Schema-Knoten unter ' + stufen.join('/'));
    if (k.type === 'object' && k.properties && typeof k.properties === 'object') {
      const req = Array.isArray(k.required) ? k.required : [];
      for (const name of Object.keys(k.properties)) {
        if (name.includes('/')) throw new Error('Schlüssel mit „/“ ist in der Zuordnung nicht adressierbar: ' + name);
        lauf(k.properties[name], stufen.concat(name), pflicht && req.includes(name), weiter);
      }
      return;
    }
    raus.push({ stufen, pfad: stufen.join('/'), pflicht, enum: Array.isArray(k.enum) ? k.enum.map(String) : [], typ: k.type || null });
  })(schema, [], true, []);
  return raus;
}
export function modulErzeugenJson(schema, zuordnung) {
  const fehler = [];
  let liste;
  try { liste = jsonBlaetter(schema); } catch (e) { return { fehler: [e.message], luecken: [] }; }
  if (typeof schema.$id !== 'string' || !/^https:\/\//.test(schema.$id)) fehler.push('das Schema hat keine https-`$id` (sie wird die schemaUri des Moduls)');
  const jePfad = new Map(liste.map((b) => [b.pfad, b]));
  const z = zuordnung.felder || {};
  for (const p of Object.keys(z)) if (!jePfad.has(p)) fehler.push('Pfad nicht im Schema: ' + p);
  const eintraege = [];
  const luecken = [];
  for (const b of liste) {
    const e = z[b.pfad];
    if (b.typ === 'array') { if (e) fehler.push(b.pfad + ': Listen (type array) trägt der JSON-Weg nicht'); else if (b.pflicht) luecken.push({ pfad: b.pfad, art: 'liste' }); continue; }
    if (!e) { if (b.pflicht) luecken.push({ pfad: b.pfad, art: 'ohne-zuordnung' }); continue; }
    if (e.anhang || e.vertreter) { fehler.push(b.pfad + ': `anhang` und `vertreter` trägt nur der XSD-Weg'); continue; }
    const hatFest = Object.prototype.hasOwnProperty.call(e, 'fest');
    if (hatFest === !!e.feld) { fehler.push(b.pfad + ': genau eines von `feld` und `fest`'); continue; }
    if (b.enum.length) {
      if (hatFest && !b.enum.includes(String(e.fest))) fehler.push(b.pfad + ': fester Wert nicht in der Aufzählung');
      if (e.werte) for (const w of Object.values(e.werte)) if (!b.enum.includes(String(w))) fehler.push(b.pfad + ': Zielwert ' + w + ' nicht in der Aufzählung');
    }
    if (e.teil && b.typ !== 'integer' && b.typ !== 'number') fehler.push(b.pfad + ': `teil` liefert eine Zahl, das Feld ist ' + (b.typ || 'ohne Typ'));
    const ziel = b.stufen.slice();
    const eintrag = hatFest ? { fest: e.fest, ziel } : { feld: e.feld, ziel };
    if (!hatFest && e.bereich && e.bereich !== zuordnung.sektor) eintrag.bereich = e.bereich;
    if (!hatFest && e.werte) eintrag.werte = e.werte;
    if (!hatFest && e.teil) eintrag.teil = e.teil;
    eintraege.push(eintrag);
  }
  if (fehler.length) return { fehler, luecken };
  const modul = {
    modulTyp: 'format', moduleVersion: zuordnung.moduleVersion || 1, sprache: zuordnung.sprache || 'de',
    format: zuordnung.format, richtung: 'export', schreiber: 'json@1', sektor: zuordnung.sektor, label: zuordnung.label,
    schemaUri: schema.$id, zuordnung: eintraege,
  };
  return { modul, luecken, fehler: [] };
}

function argumente(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!['--xsd', '--json-schema', '--zuordnung', '--ziel'].includes(k) || argv[i + 1] === undefined) return null;
    a[k.slice(2)] = argv[++i];
  }
  return a;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = argumente(process.argv.slice(2));
  if (!a || (Object.keys(a).length && !((a.xsd || a['json-schema']) && a.zuordnung)) || (a.xsd && a['json-schema'])) {
    console.error('Aufruf: node tools/fim-modul-erzeugen.mjs [--xsd <pfad> | --json-schema <pfad>] --zuordnung <pfad> [--ziel <modul.json>]');
    process.exit(2);
  }
  const zu = a.zuordnung || FIXTURE.zuordnung;
  const r = a['json-schema']
    ? modulErzeugenJson(JSON.parse(fs.readFileSync(a['json-schema'], 'utf8')), JSON.parse(fs.readFileSync(zu, 'utf8')))
    : modulErzeugen(fs.readFileSync(a.xsd || FIXTURE.xsd, 'utf8'), JSON.parse(fs.readFileSync(zu, 'utf8')));
  for (const f of r.fehler) console.error('[fim-modul] FEHLER ' + f);
  for (const l of r.luecken) console.error('[fim-modul] Lücke ' + l.art + ': ' + l.pfad);
  if (r.fehler.length) process.exit(1);
  const text = JSON.stringify(r.modul, null, 2) + '\n';
  if (a.ziel) { fs.writeFileSync(a.ziel, text); console.error('[fim-modul] geschrieben: ' + a.ziel + ' (' + r.modul.zuordnung.length + ' Zuordnungen, ' + r.luecken.length + ' Lücken)'); }
  else process.stdout.write(text);
}
