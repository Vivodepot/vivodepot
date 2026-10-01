'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kein Personenname in einem erzeugten Dateinamen (28.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund DATEINAME-PERSON (HOCH): die Übergabe-Datei eines Sub-Depots hieß
   „<Marke>-Sub_<Bezeichnung>_<Datum>.json“ — der Name der vertretenen Person
   außerhalb jeder Verschlüsselung (Download-Ordner, Cloud, Mail-Anhang). Dazu
   hingen Export-Dateien den Vornamen an (exportDateiname) und die Datei eines
   Empfängerkreises den Namen des Kreises (empfaengerDateiname), der oft ein
   Mensch ist. Jetzt: Datum und vier Zeichen einer Kennung; die Sub-Depot-Liste
   nennt dieselben vier Zeichen, die Meldung nach dem Speichern sagt, für wen.
   Gehalten:
     · dynamisch: Haupt-, Sub-/Blackbox-, jede Export- und die Empfängerkreis-
       Datei tragen weder Vor- noch Nachnamen noch Kreis- noch Sub-Namen;
     · statisch (Klasse): keine Aufrufstelle von dateiAusgeben baut den Namen
       aus Personen-Feldern. Zwei benannte Ausnahmen, beide Namen, die die
       Bürgerin selbst gewählt hat: der Speichername (zielname) und die
       Beschriftung ihres eigenen Dokuments (Mappe, Original herunterladen).
   ROT-BEWEIS: die Namensbildung vor diesem Commit (Sub, Export, Kreis).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const NAMEN = /Maria|Musterfrau|Lea|Beispiel|Erika/;

test('[Dateiname·Person] Haupt-, Sub-, Export- und Kreis-Dateien tragen keinen Personennamen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Dateiname-2026!');
  V.akteurSelbstErklaeren('Maria Musterfrau');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Musterfrau');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea Beispiel', inhaberin: 'Lea Beispiel', verwaltungsTyp: 'verwaltet' }, 'Sub-Datei-2026!');
  // Zuerst die Wege, die es schon vor diesem Commit gab — gegen den alten Kern fallen sie am Namen, nicht an einer fehlenden Funktion.
  const namen = [
    V.depotDateiname(new Date('2026-09-28T10:00:00Z')),
    V.empfaengerDateiname({ id: 'a1b2c3d4-0000', name: 'Tante Erika' }),
    ...V.EXPORT_FORMATE.map((def) => V.exportDateiname(def)),
  ];
  assert.ok(namen.length > 5, 'Vorbedingung: mehrere Dateinamen erzeugt');
  for (const n of namen) assert.doesNotMatch(n, NAMEN, 'Personenname im Dateinamen: ' + n);
  assert.doesNotMatch(V.blackboxDateiname(e.depotUUID, new Date('2026-09-28T10:00:00Z')), NAMEN);
  const kurz = e.depotUUID.replace(/[^0-9a-f]/gi, '').slice(0, 4).toUpperCase();
  assert.equal(V.blackboxDateiname(e.depotUUID, new Date('2026-09-28T10:00:00Z')), 'Vivodepot-Sub_2026-09-28_' + kurz + '.json');
});

/* Dynamisch über die echten Ausgabewege (Erfassung tests/ausgabe-fang.js): was über dateiAusgeben das Gerät verließe, wird
   abgefangen; kein Dateiname trägt einen Namen aus dem Depot. Die Wege sind dieselben, die die Ausgabewege-Proben fahren. */
const { ladeMitAusgabe, warteAufDateien } = require('./ausgabe-fang.js');
test('[Dateiname·Person·Wege] PDF-, FHIR-, XML-, Zusammenstellungs- und Kalender-Dateien tragen keinen Namen aus dem Depot', async () => {
  const k = await ladeMitAusgabe();
  const V = k.V;
  await V.depotAnlegen('Dateiname-Wege-2026!');
  V.akteurSelbstErklaeren('Maria Musterfrau');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Musterfrau');
  const wege = [
    () => V.flowGesundheitFhirExport({}), () => V.flowNotfallkartePdf(), () => V.flowBereichPdf('identity', {}),
    () => V.flowVollDepotPdf({}), () => V.flowSituationPdf('arzt'), () => V.flowErbscheinXmlSichern(),
    () => V.flowAnlassExport('geburt', {}),
    // Jedes Registry-Exportformat (XÖV, EDCI, vCard, …) über denselben Download-Weg; dort hing bis heute der Vorname am Namen.
    ...V.EXPORT_FORMATE.map((def) => () => V._formatExportDownload(def, {})),
  ];
  let n = 0;
  for (const w of wege) { try { w(); n += 1; await warteAufDateien(k, k.gefangen.length + 1, 4000); } catch (_) { /* ein Weg ohne Daten gibt nichts aus */ } }
  assert.ok(k.gefangen.length >= 4, 'Vorbedingung: mehrere Dateien abgefangen (' + k.gefangen.length + ')');
  for (const g of k.gefangen) assert.doesNotMatch(g.name, NAMEN, 'Personenname im Dateinamen: ' + g.name);
});

test('[Dateiname·Person·Klasse] keine dateiAusgeben-Stelle baut den Namen aus Personen-Feldern', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const PERSON = /bezeichnung|inhaberin|givenName|familyName|vorname|nachname|kreis\.name|\bbez\b/;
  const AUSNAHMEN = [/dateiAusgeben\(blob, zielname,/, /dateiAusgeben\(new Blob\(\[bytes\], \{ type: mime \}\), basis \+ '\.json', mime\)/];
  const zeilen = kern.split('\n').filter((z) => z.includes('dateiAusgeben(') && !/function dateiAusgeben/.test(z) && !/^\s*(\/\/|\*)/.test(z));
  assert.ok(zeilen.length > 10, 'Vorbedingung: Aufrufstellen gefunden');
  const funde = zeilen.filter((z) => PERSON.test(z) && !AUSNAHMEN.some((a) => a.test(z)));
  assert.deepEqual(funde, []);
});

test('[Dateiname·Person·Rot-Beweis] die Namensbildung vor diesem Commit fällt', () => {
  const sub = 'Vivodepot-Sub_' + 'Lea_Beispiel' + '_2026-09-28.json';
  const exp = 'Vivodepot_' + 'Export' + '_Maria.json';
  const kreis = 'vivodepot-fuer-' + 'Tante-Erika' + '-2026-09-28.vivodepot';
  for (const n of [sub, exp, kreis]) assert.match(n, NAMEN);
  const altZeile = "  return dateiAusgeben(blob, _dateiNamePraefix() + '-Sub_' + kennung + '_' + datum + '.json', 'application/json');";
  assert.ok(/kennung/.test(altZeile), 'die alte Zeile nahm die Bezeichnung über „kennung“ — die Klasse fängt sie über den dynamischen Teil');
});

/* ── Alle Dateinamen-Erzeuger (29.09.2026, Wiedereröffnung DATEINAME-PERSON) ────────────────────────────────────────
   Der Export an die EUDI-Wallet hängte über _eudiwDateiname weiter den Vornamen an. Die Klasse oben sah es nicht: sie
   prüft nur die Aufrufzeile von dateiAusgeben, und dort stand der Helfer, nicht das Feld. Jetzt:
     (a) jede Funktion mit „dateiname“ im Namen liest in ihrem Rumpf kein Personenfeld;
     (b) jede Stelle, die einen Dateinamen setzt — zweites Argument von dateiAusgeben, `.download =`, `suggestedName:` —
         ruft für den Namen nur solche Helfer auf oder benannte, namensfreie Bausteine.
   ROT-BEWEIS: der Rumpf von _eudiwDateiname vor diesem Commit fällt unter (a). */
const PERSON_FELD = /givenName|familyName|\bvorname\b|\bnachname\b|\.bezeichnung\b|\.inhaberin\b|kreis\.name|identity\b/;
const NAMENSFREI = new Set(['_dateiNamePraefix', 'heuteLokal', 'String', '_dateiKurzkennung', 'Date']);
function ohneKommentare(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
}
function kernFunktionen(src) {
  const text = ohneKommentare(src);
  const re = /^(async )?function ([A-Za-z_$][\w$]*)\s*\(/gm;
  const liste = []; let m;
  while ((m = re.exec(text))) liste.push({ name: m[2], start: m.index });
  return liste.map((f, i) => ({ name: f.name, rumpf: text.slice(f.start, i + 1 < liste.length ? liste[i + 1].start : text.length) }));
}
function dateinamenHelferMitPerson(src) {
  return kernFunktionen(src).filter((f) => /dateiname/i.test(f.name))
    .filter((f) => PERSON_FELD.test(f.rumpf.split('\n').slice(0, 40).join('\n'))).map((f) => f.name);
}
// Ein Ausdruck ab `i` bis zum nächsten Komma/`;`/`}`/`)` auf Tiefe 0 — Zeichenketten übersprungen.
function ausdruckAb(text, i) {
  let tiefe = 0, q = null;
  for (let k = i; k < text.length; k++) {
    const c = text[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if ('([{'.includes(c)) tiefe++;
    else if (')]}'.includes(c)) { if (tiefe === 0) return text.slice(i, k); tiefe--; }
    else if ((c === ',' || c === ';') && tiefe === 0) return text.slice(i, k);
  }
  return text.slice(i);
}
// Eine bloße Variable (keine Eigenschaft eines Objekts) in der Namensstelle wird bis zu ihrer Zuweisung (const/let, höchstens 60 Zeilen davor) verfolgt;
// geprüft wird dann auch deren rechte Seite. Ein Funktionsparameter endet dort (er kommt aus einem Helfer, den (a) prüft).
function zuweisungVor(text, pos, name) {
  const davor = text.slice(0, pos).split('\n').slice(-60).join('\n');
  const treffer = [...davor.matchAll(new RegExp('(?:const|let)\\s+' + name.replace(/[$]/g, '\\$') + '\\s*=\\s*', 'g'))];
  if (!treffer.length) return null;
  const m = treffer[treffer.length - 1];
  return ausdruckAb(davor, m.index + m[0].length).trim();
}
function namensAusdruecke(src) {
  const text = ohneKommentare(src);
  const aus = [];
  const mitVerfolgung = (ausdruck, pos) => {
    aus.push(ausdruck);
    for (const v of new Set((ausdruck.match(/(?<![\w.$'"])[A-Za-z_$][\w$]*(?![\w$]*\s*[(.])/g) || []))) {
      const rhs = zuweisungVor(text, pos, v);
      if (rhs) aus.push(rhs);
    }
  };
  for (const m of text.matchAll(/(?<![\w.])dateiAusgeben\(/g)) {
    if (/function\s+$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;
    const start = m.index + m[0].length;
    const erstes = ausdruckAb(text, start);
    mitVerfolgung(ausdruckAb(text, start + erstes.length + 1).trim(), m.index);
  }
  for (const m of text.matchAll(/\.download\s*=\s*/g)) mitVerfolgung(ausdruckAb(text, m.index + m[0].length).trim(), m.index);
  for (const m of text.matchAll(/suggestedName:\s*/g)) mitVerfolgung(ausdruckAb(text, m.index + m[0].length).trim(), m.index);
  return aus;
}
function fremdeAufrufe(ausdruck) {
  return [...ausdruck.matchAll(/(?<![\w.$])([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1])
    .filter((n) => !/dateiname/i.test(n) && !NAMENSFREI.has(n));
}

test('[Dateiname·Person·Erzeuger] kein Dateinamen-Helfer liest ein Personenfeld, und jede Namensstelle ruft nur solche Helfer', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const bis = kern.indexOf('/*! pako') > 0 ? kern.indexOf('<!-- @vd-lib name="jspdf"') : kern.length;   // eingebettete Bibliotheken zählen nicht
  const eigener = kern.slice(0, bis);
  const helfer = kernFunktionen(eigener).filter((f) => /dateiname/i.test(f.name)).map((f) => f.name);
  assert.ok(helfer.length >= 6, 'Vorbedingung: die Dateinamen-Helfer werden gefunden (' + helfer.join(', ') + ')');
  assert.deepEqual(dateinamenHelferMitPerson(eigener), [], 'ein Dateinamen-Helfer liest ein Personenfeld');
  const ausdruecke = namensAusdruecke(eigener);
  assert.ok(ausdruecke.length >= 15, 'Vorbedingung: die Namensstellen werden gefunden (' + ausdruecke.length + ')');
  const funde = ausdruecke.map((a) => ({ a, f: fremdeAufrufe(a).concat(PERSON_FELD.test(a) ? ['Personenfeld'] : []) }))
    .filter((x) => x.f.length).map((x) => x.a.slice(0, 120) + '  → ' + x.f.join(', '));
  assert.deepEqual(funde, []);
});

test('[Dateiname·Person·Erzeuger·Rot-Beweis] der Helfer des EUDI-Wallet-Exports vor diesem Commit fällt', () => {
  const alt = "function _eudiwDateiname(basis, endung) {\n  const roh = (data && data.sektoren && data.sektoren.identity && typeof data.sektoren.identity.givenName === 'string')\n    ? data.sektoren.identity.givenName.trim() : '';\n  const vorname = roh.replace(/[^\\p{L}\\p{N}_-]+/gu, '-');\n  return (vorname ? basis + '_' + vorname : basis) + '.' + endung;\n}\n";
  assert.deepEqual(dateinamenHelferMitPerson(alt), ['_eudiwDateiname']);
  assert.deepEqual(fremdeAufrufe("personName(e) + '.json'"), ['personName'], 'ein fremder Aufruf in einer Namensstelle wird gefunden');
  const verfolgt = namensAusdruecke("function f() {\n  const n = data.sektoren.identity.givenName;\n  return dateiAusgeben(blob, n + '.json', 'x');\n}\n");
  assert.ok(verfolgt.some((a) => PERSON_FELD.test(a)), 'eine Variable mit einem Personenfeld wird bis zur Zuweisung verfolgt');
});

test('[Dateiname·Person·EUDIW] der Dateiname des Exports an die EUDI-Wallet trägt keinen Vornamen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Dateiname-Eudiw-2026!');
  V.akteurSelbstErklaeren('Maria Musterfrau');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const n = V._eudiwDateiname('Vivodepot_Gesundheit_EUDIW', 'sd-jwt');
  assert.doesNotMatch(n, NAMEN);
  assert.equal(n, 'Vivodepot_Gesundheit_EUDIW.sd-jwt');
});
