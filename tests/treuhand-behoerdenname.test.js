'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wer die Standardvorlagen signiert hat (Befund TREUHAND-BEHOERDENNAME, 05.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Vivodepot signiert die vier Standardvorlagen mit einem eigenen Schlüssel, dem Vorlagenschlüssel (U2-ADR-040). Die beiden
   Zertifikate dazu stellt die Trust-Authority von Vivodepot aus; sie nennen die Behörde selbst als Anbieterin
   (`anbieterName` „Bundesministerium der Justiz (BMJ)“, `anbieterTyp` „behoerde“), ohne Auftrag einer Behörde. Das liest sich,
   als habe die Behörde signiert. Entschieden am 05.11.2026: Im Zertifikat signiert „Vivodepot“ ohne Zusatz, die Behörde steht
   nur als Textquelle mit Stand darin, und kein sichtbarer Text spricht von einer Treuhand.

   Gehalten wird:
     · die Anzeige jeder signierten Standardvorlage sagt, dass Vivodepot sie mit einem eigenen Schlüssel signiert und die
       Stelle nicht beteiligt ist;
     · kein sichtbarer Text (Textsätze DE/EN, öffentliche Dokumente) spricht von Treuhand oder trustee — „Treuhandkonto“ als
       Kontoart ist eine andere Sache und bleibt;
     · kein eingebettetes Zertifikat nennt eine öffentliche Stelle als Anbieterin, es sei denn mit Mandat
       (`credentialSubject.mandat`) — todo bis zur Neuausstellung, die nur mit dem Schlüssel der Trust-Authority geht;
     · nennt die Anzeige die BZgA, nennt sie auch den heutigen Namen: Bundesinstitut für Öffentliche Gesundheit (BIÖG),
       umbenannt per Ministererlass (Pressemitteilung des Bundesministeriums für Gesundheit vom 13.02.2025) — todo bis zur
       Neusignatur der Organspende-Vorlage, deren Quellangabe zum signierten Inhalt gehört.
   ════════════════════════════════════════════════════════════════════════════ */
const { testMitPrivat, istOeffentlich } = require('./helfer/nur-privat.js');
const test = testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

// Namen öffentlicher Stellen, wie sie in einem Zertifikat stehen könnten. Weit gefasst: ein Treffer zu viel ist hier
// besser als einer zu wenig.
const STELLE = /\b(Bundes\w*|Ministerium|Bundeszentrale|Bundesinstitut|Behörde|BMJ|BMG|BZgA|BIÖG)\b/;
// Das Wort, das nach der Entscheidung in keinem sichtbaren Text steht. „Treuhandkonto“ (Kontoart) ist ausgenommen.
const TREUHAND = /treuh(?!andkont)|trustee/i;

function nutzlast(jws) {
  return JSON.parse(Buffer.from(String(jws).split('.')[1], 'base64url').toString('utf8'));
}

function namensanmassungen(certs) {
  const fehler = [];
  for (const [k, jws] of Object.entries(certs)) {
    const p = nutzlast(jws);
    const cs = p.credentialSubject || (p.vc && p.vc.credentialSubject) || {};
    const typBehoerde = typeof cs.anbieterTyp === 'string' && cs.anbieterTyp.startsWith('behoerde');
    const nameStelle = typeof cs.anbieterName === 'string' && STELLE.test(cs.anbieterName);
    if ((typBehoerde || nameStelle) && !(cs.mandat && typeof cs.mandat === 'object')) {
      fehler.push(k + ': ' + (cs.anbieterName || '?') + ' (' + (cs.anbieterTyp || '?') + ') ohne Mandat');
    }
  }
  return fehler;
}

function sichtbarerText(html) {
  return String(html).replace(/<div class="wortlaut-block"[^]*?<\/div>/, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

function signaturFehler(text, stelle) {
  const fehler = [];
  if (!/Vivodepot[^;]{0,200}signiert[^;]{0,60}eigenen Schlüssel/.test(text)) fehler.push('kein Satz „Vivodepot … signiert … mit einem eigenen Schlüssel“');
  if (stelle && text.indexOf(stelle + ' ist daran nicht beteiligt') < 0) fehler.push('kein Satz „' + stelle + ' ist daran nicht beteiligt“');
  if (TREUHAND.test(text)) fehler.push('Treuhand-Wort in der Anzeige');
  return fehler;
}

function namensFehler(text) {
  return (/BZgA|Bundeszentrale für gesundheitliche Aufklärung/.test(text) && !/BIÖG|Bundesinstitut für Öffentliche Gesundheit/.test(text))
    ? ['BZgA ohne heutigen Namen BIÖG'] : [];
}

// Platzhalter des öffentlichen Zuschnitts: Dort tragen die Vorlagen erfundene Prosa, genau in der Form 'Testtext ' + laufende Nummer
// (der Erzeuger der neutralen Gegenstücke, 10.09.2026). Für einen erfundenen Namen gibt es keinen heutigen; ausgenommen wird nur
// genau diese Form (Probelauf 9be434288, 07.11.2026).
const PLATZHALTER = /^Testtext \d+$/;
// Privat geprüfte Stellen vor dieser Ausnahme: BMJ und BZgA. Die Zahl steht fest, damit kein echter Name herausfällt.
const STELLEN_PRIVAT = 2;
function zuPruefendeStellen(namen) {
  return [...new Set(namen)].filter((b) => !PLATZHALTER.test(String(b)));
}
function ohneHeutigenNamen(V, namen) {
  return zuPruefendeStellen(namen).filter((b) => V.signaturStelleName(b) === b);
}

function anzeigen() {
  const { V } = ladeKern();
  const signiert = V.STANDARD_VORLAGEN.filter((v) => v && v.templateJws);
  assert.ok(signiert.length >= 1, 'Vorbedingung: signierte Standardvorlagen');
  return signiert.map((v) => ({ v, text: sichtbarerText(V.wortlautVorlageHTML(v, false)) }));
}

// Sichtbare Texte: alle Werte der Textsätze DE und EN und die öffentlichen Dokumente außerhalb der ADRs (ADRs sind Geschichte; die
// erzeugte Faktenbasis zitiert nur ADR-Titel).
// Nur Dateien, die mit dem öffentlichen Repo hinausgehen; die Pro-Textsätze entstehen aus diesen beiden und bleiben drinnen.
const TEXTSAETZE = ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json'];
const DOKUMENTE = ['SECURITY.md', 'README.md', 'README_en.md', 'docs/pruefstelle-zulassung.md'];

function treuhandStellen(quellen) {
  const fehler = [];
  for (const [name, text] of quellen) {
    // Ein Pfad auf eine ADR-Datei bleibt, wie die ADR selbst: ihr Dateiname ist Geschichte, kein angezeigter Satz.
    String(text).split('\n').forEach((z, i) => { if (TREUHAND.test(z.replace(/docs\/adr\/[^\s`)]+/g, ''))) fehler.push(name + ':' + (i + 1)); });
  }
  return fehler;
}

test('[Treuhand·Anzeige] jede Standardvorlage sagt: Vivodepot signiert mit eigenem Schlüssel, die Stelle ist nicht beteiligt', () => {
  const { V } = ladeKern();
  const fehler = [];
  for (const { v, text } of anzeigen()) {
    for (const f of signaturFehler(text, V.signaturStelleName(v.wortlautQuelle && v.wortlautQuelle.behoerde))) fehler.push(v.id + ': ' + f);
  }
  assert.deepEqual(fehler, []);
});

test('[Treuhand·Heute] der Signatursatz nennt die Stelle mit ihrem heutigen Namen (BMJ heute BMJV, BZgA heute BIÖG)', () => {
  const { V } = ladeKern();
  assert.equal(V.signaturStelleName('Bundesministerium der Justiz (BMJ)'), 'BMJ (heute BMJV)');
  assert.equal(V.signaturStelleName('Bundeszentrale für gesundheitliche Aufklärung (BZgA)'), 'BZgA (heute BIÖG)');
  assert.equal(V.signaturStelleName('Beispielamt'), 'Beispielamt', 'ohne Umbenennung bleibt der Name aus der Vorlage');
  const namen = anzeigen().map(({ v }) => v.wortlautQuelle && v.wortlautQuelle.behoerde);
  if (!istOeffentlich()) assert.equal(zuPruefendeStellen(namen).length, STELLEN_PRIVAT, 'privat dieselben Stellen wie vor der Platzhalter-Ausnahme');
  assert.deepEqual(ohneHeutigenNamen(V, namen), [], 'jede Stelle der signierten Vorlagen steht in der Liste');
});

test('[Negativprobe] [Treuhand·Heute·Rot-Beweis] ein echter Name ohne heutigen Namen bleibt rot, nur der Platzhalter fällt heraus', () => {
  const { V } = ladeKern();
  assert.deepEqual(ohneHeutigenNamen(V, ['Testtext 6', 'Bundesamt für Beispiele (BfB)', 'Bundesministerium der Justiz (BMJ)']),
    ['Bundesamt für Beispiele (BfB)']);
  assert.deepEqual(ohneHeutigenNamen(V, ['Testtext', 'Testtext 6a', 'Mein Testtext 6']), ['Testtext', 'Testtext 6a', 'Mein Testtext 6'],
    'nur genau die Form des Zuschnitts ist ausgenommen');
});

test('[Treuhand·Wort] kein sichtbarer Text spricht von Treuhand', () => {
  const quellen = [];
  for (const f of TEXTSAETZE) {
    const m = JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'));
    for (const [k, w] of Object.entries(m.texte || {})) if (typeof w === 'string') quellen.push([f + '#' + k, w]);
  }
  for (const f of DOKUMENTE) {
    const p = path.join(REPO, f);
    if (fs.existsSync(p)) quellen.push([f, fs.readFileSync(p, 'utf8')]);
  }
  assert.ok(quellen.length > 100, 'Vorbedingung: Textsätze gelesen');
  assert.deepEqual(treuhandStellen(quellen), []);
});

test('[Treuhand·Zertifikat] kein eingebettetes Zertifikat nennt eine Behörde als Anbieterin ohne Mandat', { todo: 'Befund TREUHAND-BEHOERDENNAME: neue Zertifikate in der Zeremonie mit dem Schlüssel der Trust-Authority' }, () => {
  const { V } = ladeKern();
  assert.ok(Object.keys(V.STANDARD_VORLAGEN_CERTS).length >= 1, 'Vorbedingung: Zertifikate eingebettet');
  assert.deepEqual(namensanmassungen(V.STANDARD_VORLAGEN_CERTS), []);
});

test('[Treuhand·BIÖG] nennt die Anzeige die BZgA, nennt sie auch das BIÖG', { todo: 'Befund TREUHAND-BEHOERDENNAME: Organspende-Vorlage mit BIÖG neu signieren, in derselben Zeremonie' }, () => {
  const fehler = [];
  for (const { v, text } of anzeigen()) for (const f of namensFehler(text)) fehler.push(v.id + ': ' + f);
  assert.deepEqual(fehler, []);
});

test('[Treuhand·Rot-Beweis] Behördenname ohne Mandat, fehlender Signatursatz, Treuhand-Wort und alter BZgA-Name fallen auf', () => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const cert = (cs) => 'x.' + b64({ credentialSubject: cs }) + '.y';
  assert.deepEqual(namensanmassungen({ a: cert({ anbieterName: 'Bundesministerium der Justiz (BMJ)', anbieterTyp: 'behoerde' }) }),
    ['a: Bundesministerium der Justiz (BMJ) (behoerde) ohne Mandat']);
  assert.equal(namensanmassungen({ a: cert({ anbieterName: 'Beispielstelle', anbieterTyp: 'behoerde-land' }) }).length, 1);
  assert.deepEqual(namensanmassungen({ a: cert({ anbieterName: 'Vivodepot', anbieterTyp: 'vorlagen' }) }), []);
  assert.deepEqual(namensanmassungen({ a: cert({ anbieterName: 'Bundesministerium der Justiz (BMJ)', anbieterTyp: 'behoerde', mandat: { nachweis: 'x' } }) }), []);
  const st = 'Beispielamt';
  assert.deepEqual(signaturFehler('Beispielamt · Formular', st), ['kein Satz „Vivodepot … signiert … mit einem eigenen Schlüssel“', 'kein Satz „Beispielamt ist daran nicht beteiligt“']);
  assert.deepEqual(signaturFehler('Vivodepot gibt den Text wieder und signiert ihn treuhänderisch mit einem eigenen Schlüssel; Beispielamt ist daran nicht beteiligt.', st), ['Treuhand-Wort in der Anzeige']);
  assert.deepEqual(signaturFehler('Vivodepot gibt diesen Text von Beispielamt unverändert wieder und signiert ihn mit einem eigenen Schlüssel; Beispielamt ist daran nicht beteiligt.', st), []);
  assert.deepEqual(namensFehler('Text: Bundeszentrale für gesundheitliche Aufklärung'), ['BZgA ohne heutigen Namen BIÖG']);
  assert.deepEqual(namensFehler('Text: BZgA (heute BIÖG)'), []);
  assert.deepEqual(treuhandStellen([['a', 'x\nder Treuhandschlüssel'], ['b', 'Treuhandkonto'], ['c', 'trustee key'],
    ['d', '`docs/adr/x-treuhand-y.md` — Beschreibung']]), ['a:2', 'c:1']);
});
