'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   DER WÄCHTER ZWISCHEN SCHEMA UND WIRKUNG (Kette, Auftrag 5, Zug 4 — 20.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Jedes Feld des EINREICH-SCHEMAS wird gegen seine WIRKUNG IM KERN gehalten. Was
   im Schema steht und im Kern nirgends vorkommt, macht rot.

   DIE FEHLERKLASSE, gegen die er gebaut ist: „bekannt und wirkungslos" (Testkonzept
   B0, Punkt 5). Eine Institution beschreibt ein Feld, das Schema nimmt die
   Beschreibung an, der Kern tut nichts damit — und NICHTS meldet einen Fehler. Der
   bekannte Fall ist `provenienzPflichtig`; **der Wächter ist nicht für ihn da,
   sondern für die unbekannten.**

   WARUM ER ALS EIGENES WERKZEUG IM REPO STEHT und nicht als Kommentar: Ein
   einzelner Test deckt genau den Fall ab, den sein Autor kannte. Diese Klasse
   entsteht aber genau dort, wo niemand hinsieht — beim NÄCHSTEN Schema-Feld. Ein
   Wächter, der die Menge vergleicht, findet auch das.

   DIE MESSMETHODE, offen gesagt: Ein Schlüsselname des Schemas gilt als WIRKSAM,
   wenn er im Kern (`vivodepot.html`) als Bezeichner vorkommt — als Eigenschaft,
   Variable oder String. Das ist eine GROBE Messung: sie findet ein Feld, das
   nirgends erwähnt wird (die gefährliche Richtung), aber nicht eines, das erwähnt
   und trotzdem folgenlos ist. Das steht hier, damit niemand mehr aus ihr liest,
   als sie hergibt. Die feinere Frage — wirkt es RICHTIG — beantworten die Proben
   am Gegenstand, nicht dieser Zähler.

   AUSNAHMEN sind benannt und begründet, nicht stillschweigend gefiltert.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const SCHEMA = path.join(REPO, 'docs', 'template-generator', 'submission-schema.json');
const KERN = path.join(REPO, 'vivodepot.html');
const GENERATOR = path.join(REPO, 'vivodepot-template-generator.html');
const ISSUER = path.join(REPO, 'vivodepot-vc-issuer.html');
const GRUNDLINIE = path.join(REPO, 'tools', 'schema-wirkung-grundlinie.json');

/* Die Ausnahmen — je eine Zeile mit GRUND. Wer hier etwas einträgt, sagt damit:
   „dieses Feld wirkt bewusst nicht im Kern". */
const AUSNAHMEN = Object.freeze({
  submissionId:        'Kennung des EINREICHENS selbst — sie adressiert das Paket, nicht ein Depot-Feld.',
  submissionTimestamp: 'Zeitpunkt des Einreichens; der Kern stempelt beim Andocken selbst.',
  generatorVersion:    'Herkunft des Erzeugnisses, für die Prüfstelle — nicht für das Depot.',
  rechtsform:          'Anbieter-Stammdatum für das Zertifikat (VC-Issuer), nicht für das Depot.',
  ustId:               'Steuerliche Kennung der Institution im Antrag — kein Depot-Feld.',
  strasse:             'Anschrift der Institution im Zertifikatsantrag — kein Depot-Feld.',
  plz:                 'Anschrift der Institution im Zertifikatsantrag — kein Depot-Feld.',
  ort:                 'Anschrift der Institution im Zertifikatsantrag — kein Depot-Feld.',
  land:                'Anschrift der Institution im Zertifikatsantrag — kein Depot-Feld.',
  funktion:            'Ansprechpartner-Angabe im Zertifikatsantrag.',
  telefon:             'Ansprechpartner-Angabe im Zertifikatsantrag — kein Depot-Feld.',
  useCase:             'Freitext-Begründung im Antrag; die Prüfstelle liest sie, nicht der Kern.',
  templates:           'Sammel-Struktur des Einreichens selbst (Schnitt 24.08.2026, A523/Sammelvorlagen) — der Kern verarbeitet je Vorlage weiterhin einzeln (modulEinlassenGeprueft), das Array existiert nur auf der Einreichungs-/Ausstellungs-Seite.',
  templatesJws:        'Dieselbe Sammel-Struktur, für die Signaturen. Ersetzt das vormals einzelne templateJws (dieses wirkte im Kern über STANDARD_VORLAGEN — ein anderer Pfad, andere Herkunft, keine Wirkungs-Verwandtschaft mit diesem Feld).',
  // U2-ADR-409 Punkt 3/5 (13.09.2026): ein Kennungs-Vorschlag. Beide Felder wirken ABSICHTLICH
  // nicht im Kern/Depot — sie sind an die Freigabe im Postfach gerichtet, nie an ein Depot-Feld.
  // Erst NACH Freigabe entsteht (über `tools/build-feldkatalog.js`/`tools/feldregister-bauen.js`)
  // eine Kennung, die dann wie jede andere im Kern wirkt; bis dahin ist sie ein Vorschlag, kein
  // Feld. Dieselbe Klasse wie `useCase` — Freitext für die Prüfstelle, nicht für den Kern.
  kennungVorschlaege:  'Ein Kennungs-Vorschlag ist an die Freigabe im Postfach gerichtet (U2-ADR-409), nicht an ein Depot-Feld — erst eine freigegebene Kennung wirkt, dann über den Feldkatalog wie jede andere.',
  begruendung:         'Freitext-Begründung EINES Kennungs-Vorschlags; die freigebende Stelle liest sie, nicht der Kern — dieselbe Klasse wie useCase.',
});

// Schlüsselnamen des Schemas, rekursiv, ohne Duplikate.
function schemaSchluessel(schema) {
  const raus = new Set();
  const gehe = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.properties && typeof o.properties === 'object') {
      for (const k of Object.keys(o.properties)) { raus.add(k); gehe(o.properties[k]); }
    }
    if (o.items) gehe(o.items);
    if (o.additionalProperties && typeof o.additionalProperties === 'object') gehe(o.additionalProperties);
    for (const zweig of ['oneOf', 'anyOf', 'allOf']) if (Array.isArray(o[zweig])) o[zweig].forEach(gehe);
  };
  gehe(schema);
  return [...raus];
}

/* Kommt der Name im Kern als BEZEICHNER vor? Wortgrenzen, damit `code` nicht in
   `codeListe` und `name` nicht in `anbieterName` trifft — sonst meldete der Wächter
   Wirkung, wo nur eine Zeichenfolge steht. */
function imKern(name, quelle) {
  return new RegExp('(^|[^A-Za-z0-9_])' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z0-9_])').test(quelle);
}

function ermittleFunde(opt) {
  const o = opt || {};
  const schema = JSON.parse(fs.readFileSync(o.schema || SCHEMA, 'utf8'));
  const kern = fs.readFileSync(o.kern || KERN, 'utf8');
  const schluessel = schemaSchluessel(schema).sort();
  const funde = [];
  for (const k of schluessel) {
    if (Object.prototype.hasOwnProperty.call(AUSNAHMEN, k)) continue;
    if (imKern(k, kern)) continue;
    funde.push(k);
  }
  return { schluessel, funde, geprueft: schluessel.length - Object.keys(AUSNAHMEN).length };
}

/* Das GATE: rot wird der Wächter für JEDEN NEUEN Fall. Die fünf gemessenen stehen in der
   Grundlinie — KEINE Erlaubnisliste, sondern eine Liste offener Posten mit Abgangsbedingung
   (dieselbe Bauart wie `nur-vom-test-erreicht-grundlinie.json`). Verschwindet einer aus dem
   Schema oder bekommt er Wirkung, meldet der Wächter das ebenfalls: eine Grundlinie, die mehr
   deckt als nötig, verbirgt den nächsten echten Fall. */
function gateBewerten(funde, grundlinie) {
  const bekannt = new Set((grundlinie && grundlinie.funde) || []);
  const neu = funde.filter(f => !bekannt.has(f));
  const erledigt = [...bekannt].filter(f => funde.indexOf(f) < 0);
  return { neu, erledigt, ok: neu.length === 0 && erledigt.length === 0 };
}
function bericht(opt) {
  const { schluessel, funde, geprueft } = ermittleFunde(opt);
  const zeilen = [];
  zeilen.push('Schema-Wirkung: ' + schluessel.length + ' Schlüssel im Einreich-Schema, ' +
    Object.keys(AUSNAHMEN).length + ' begründete Ausnahmen, ' + geprueft + ' geprüft.');
  zeilen.push('Suchraum: ' + [SCHEMA, KERN].map(p => path.relative(REPO, p)).join(', ') +
    ' (der Erzeuger ' + path.relative(REPO, GENERATOR) + ' und der Aussteller ' +
    path.relative(REPO, ISSUER) + ' sind NICHT der Wirkungsort — ein Feld, das nur dort vorkommt, wirkt im Depot nicht).');
  const grundlinie = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  const g = gateBewerten(funde, grundlinie);
  for (const f of funde) zeilen.push('  · ' + f + (grundlinie.begruendungen && grundlinie.begruendungen[f] ? '  — ' + grundlinie.begruendungen[f].slice(0, 90) + '…' : ''));
  if (g.ok) zeilen.push('OK — kein NEUER Fall gegen die Grundlinie. Die ' + funde.length + ' bekannten sind offene Posten, keine Erlaubnis.');
  else {
    if (g.neu.length) zeilen.push('ROT — NEU angenommen und wirkungslos: ' + g.neu.join(', ') +
      ' — entweder im Kern wirksam machen, als begründete Ausnahme eintragen oder in die Grundlinie mit Abgangsbedingung.');
    if (g.erledigt.length) zeilen.push('ROT — nicht mehr in der Messung, aber noch in der Grundlinie: ' + g.erledigt.join(', ') +
      ' — aus der Grundlinie nehmen.');
  }
  return { text: zeilen.join('\n'), funde, gate: g };
}

if (require.main === module) {
  // `--schema <pfad>` misst gegen eine KOPIE — der Weg, auf dem die Wächter-Selbstprobe eine
  // Verletzung pflanzt, ohne das ausgelieferte Schema anzufassen.
  const i = process.argv.indexOf('--schema');
  const r = bericht(i > 0 ? { schema: process.argv[i + 1] } : undefined);
  process.stdout.write(r.text + '\n');
  process.exit(r.gate.ok ? 0 : 1);
}
module.exports = { ermittleFunde, schemaSchluessel, imKern, bericht, gateBewerten, AUSNAHMEN, SCHEMA, KERN, GRUNDLINIE };
