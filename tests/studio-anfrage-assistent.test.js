'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════
   Studio · W1 (09.10.2026): der Assistent Anfrage, der Hauptweg des Studios (Entscheidung 5 vom 08.10.2026)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────
   (1) WÖRTER DER APP: jedes Wort der Vorschau mit data-ts ist der Textsatz-Wert der App, deutsch und englisch; Rot-Beweis.
   (2) EIN VERTRAG: jedes Beispiel ergibt über anfrageAssistentState → pruefeAnfrage keinen Blocker, und die App nimmt die
       gebaute Anfrage an (anfragePruefen, derselbe Leser wie beim Link).
   (3) JEDE ANGABE IHR ZWECK: eine Angabe ohne Zweck hält Schritt 2 an und wird beim Namen genannt; kein Sammelzweck.
   (4) DER HAUPTWEG: die Kachel „Anfrage an Personen“ steht zuerst und führt in den Assistenten, nicht in die Fachebene.
   (5) Sektorstreuung: kein Beispiel ist Gesundheit.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeKern } = require('./load-kern.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const TS_DE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8'));
const TS_EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
const nativ = (x) => JSON.parse(JSON.stringify(x));
const raumVon = (html) => { const a = html.indexOf('<main id="raum-anfrage"'); return html.slice(a, html.indexOf('</main>', a)); };
const entities = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/* ── (1) Wörter der App ─────────────────────────────────────────────────── */
function woerterBefunde(html) {
  const f = [];
  const re = /<(\w+)[^>]*\sdata-ts="([^"]+)"[^>]*\sdata-en="([^"]*)"[^>]*>([^<]*)</g;
  let m, n = 0;
  while ((m = re.exec(raumVon(html)))) {
    n++;
    const de = TS_DE.texte['strings:' + m[2] + '.text'], en = TS_EN.texte['strings:' + m[2] + '.text'];
    if (de === undefined || en === undefined) { f.push(m[2] + ': kein Textsatz-Schlüssel'); continue; }
    if (entities(m[4]) !== de) f.push(m[2] + ' DE: „' + m[4] + '“ statt „' + de + '“');
    if (entities(m[3]) !== en) f.push(m[2] + ' EN: „' + m[3] + '“ statt „' + en + '“');
  }
  if (n < 12) f.push('nur ' + n + ' Wörter mit data-ts gefunden');
  return f;
}
test('[Anfrage-Assistent · Wörter] jedes Wort der Vorschau ist der Textsatz-Wert der App, deutsch und englisch', () => {
  assert.deepEqual(woerterBefunde(HTML), []);
});
test('[Anfrage-Assistent · Wörter · Rot-Beweis] ein eigenes Wort neben dem Textsatz fällt auf', () => {
  const kopie = HTML.replace('<strong data-ts="anfrageZweckLabel" data-en="Purpose:">Wozu:</strong>', '<strong data-ts="anfrageZweckLabel" data-en="Purpose:">Zweck:</strong>');
  assert.notEqual(kopie, HTML);
  assert.equal(woerterBefunde(kopie).length, 1);
});
test('[Anfrage-Assistent · Wörter] ohne Schlüssel steht in der Vorschau „Nicht geprüft“, nie „Geprüft“', () => {
  const r = raumVon(HTML);
  assert.match(r, /<span class="as-siegel aa-ungeprueft" data-ts="anfrageUngeprueftBadge"/);
  assert.doesNotMatch(r, /data-ts="anfrageGeprueftBadge"/);
});

/* ── (2) Ein Vertrag ────────────────────────────────────────────────────── */
function stelleMit(V, beispiel) {
  V.anfrageAssistentNeu();
  Object.assign(V.ANF_AS, { von: 'Bürgerservice Musterstadt', grundlage: 'Ihre Einwilligung', antwortAn: 'termine@beispiel.example' });
  V.anfrageAssistentBeispiel(beispiel);
  return nativ(V.anfrageAssistentState());
}
for (const id of ['termin', 'mitglied', 'schule', 'kontakt']) {
  test('[Anfrage-Assistent · Vertrag ' + id + '] das Beispiel besteht pruefeAnfrage, und die App nimmt die Anfrage an', () => {
    const { V } = ladeGenerator();
    const state = stelleMit(V, id);
    const p = V.pruefeAnfrage(state);
    assert.deepEqual(nativ(p.blocker), []);
    assert.deepEqual(nativ(p.warnungen), [], 'jede Kennung steht im Feldkatalog');
    for (const s of [1, 2, 3, 4]) assert.deepEqual(nativ(V.anfrageAssistentLuecken(s)), [], 'Schritt ' + s);
    const kern = ladeKern().V;
    const g = kern.anfragePruefen(nativ(p.anfrage));
    assert.equal(g.gueltig, true, String(g.grund));
    assert.equal(g.anfrage.antwort.art, 'einmalpasswort');
    assert.equal(g.anfrage.antwort.an, 'termine@beispiel.example');
  });
}

/* ── (3) Jede Angabe ihr Zweck ──────────────────────────────────────────── */
test('[Anfrage-Assistent · Zweck] eine Angabe ohne Zweck hält Schritt 2 an und wird beim Namen genannt', () => {
  const { V } = ladeGenerator();
  stelleMit(V, 'termin');
  V.anfrageAssistentHinzu('telefon');
  const l = nativ(V.anfrageAssistentLuecken(2));
  assert.equal(l.length, 1);
  assert.equal(l[0][0], 'aa-fz-' + (V.ANF_AS.felder.length - 1));
  assert.match(l[0][1], /Telefon/);
  assert.ok(V.pruefeAnfrage(nativ(V.anfrageAssistentState())).blocker.length >= 1, 'auch der Vertrag hält sie an');
});
test('[Anfrage-Assistent · Zweck] kein Beispiel nimmt den Gesamtzweck als Zweck einer Angabe', () => {
  const { V } = ladeGenerator();
  for (const id of Object.keys(V.ANF_AS_BEISPIELE)) {
    const state = stelleMit(V, id);
    for (const f of state.anfrage.felder) assert.notEqual(f.zweck, state.anfrage.zweck, id + ': ' + f.kennung);
  }
});

/* ── (4) Der Hauptweg ───────────────────────────────────────────────────── */
test('[Anfrage-Assistent · Hauptweg] „Anfrage an Personen“ ist die erste, dunkle Kachel und führt in den Assistenten', () => {
  const ein = HTML.slice(HTML.indexOf('<main id="raum-eingang"'), HTML.indexOf('</main>', HTML.indexOf('<main id="raum-eingang"')));
  const ids = [...ein.matchAll(/class="kachel eingang-kachel[^"]*" id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids[0], 'ein-anfrage');
  assert.match(ein, /class="kachel eingang-kachel erste" id="ein-anfrage"/);
  assert.ok(HTML.includes("an('ein-anfrage', 'click', () => { anfrageAssistentNeu(); zeigeSchritt('anfrage'); });"));
});

/* ── (5) Sektorstreuung ─────────────────────────────────────────────────── */
test('[Anfrage-Assistent · Sektor] kein Beispiel ist Gesundheit', () => {
  const { V } = ladeGenerator();
  const text = JSON.stringify(nativ(V.ANF_AS_BEISPIELE));
  assert.doesNotMatch(text, /Praxis|Patient|Kranken|Arzt|Pflege|Klinik|Gesundheit|health|patient|clinic|doctor/i);
});

/* ── (6) W2: Einmalpasswort und Brief (09.10.2026) ─────────────────────────── */
test('[Anfrage-Assistent · Passwort] 16 Zeichen aus 32, in Vierergruppen, gleichverteilt über byte & 31', () => {
  const { V } = ladeGenerator();
  assert.equal(V.EINMALPASSWORT_ZEICHEN.length, 32);
  assert.equal(new Set(V.EINMALPASSWORT_ZEICHEN).size, 32);
  assert.doesNotMatch(V.EINMALPASSWORT_ZEICHEN, /[IO01]/, 'keine verwechselbaren Zeichen');
  const gesehen = new Set();
  for (let i = 0; i < 200; i++) {
    const pw = V.einmalpasswortErzeugen();
    assert.match(pw, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    for (const c of pw.replace(/-/g, '')) assert.ok(V.EINMALPASSWORT_ZEICHEN.includes(c), c);
    gesehen.add(pw);
  }
  assert.equal(gesehen.size, 200, 'keine Wiederholung in 200 Zügen');
});
/* Die Herkunft des Passworts an der Quelle: Zufall nur aus crypto.getRandomValues, nie Math.random, und die Zeichenauswahl über
   die unteren 5 Bit (32 Zeichen, gleichverteilt), nie per Modulo (ein Modulo mit einer Zahl, die 256 nicht teilt, verzerrt).
   Das Modulo der Gruppierung (`i % 4`, ein Bindestrich alle vier Zeichen) wählt kein Zeichen und ist darum erlaubt. */
const passwortRumpf = (html) => { const a = html.indexOf('function einmalpasswortErzeugen()'); return a < 0 ? '' : html.slice(a, html.indexOf('\n}', a)); };
function passwortHerkunftBefunde(rumpf) {
  const f = [];
  if (!/crypto\.getRandomValues\(b\)/.test(rumpf)) f.push('ohne crypto.getRandomValues');
  if (/Math\.random/.test(rumpf)) f.push('Math.random');
  if (/EINMALPASSWORT_ZEICHEN\[[^\]]*%/.test(rumpf)) f.push('Modulo in der Zeichenauswahl');
  if (!/EINMALPASSWORT_ZEICHEN\[x & 31\]/.test(rumpf)) f.push('Auswahl nicht über die unteren 5 Bit');
  return f;
}
test('[Anfrage-Assistent · Passwort] die Herkunft ist crypto.getRandomValues, nie Math.random', () => {
  const rumpf = passwortRumpf(HTML);
  assert.ok(rumpf.length > 50, 'Vorbedingung: einmalpasswortErzeugen ist gefunden');
  assert.deepEqual(passwortHerkunftBefunde(rumpf), []);
});
test('[Anfrage-Assistent · Passwort · Rot-Beweis] Math.random und eine Modulo-Auswahl fielen auf', () => {
  const rumpf = passwortRumpf(HTML);
  const zufall = rumpf.replace('crypto.getRandomValues(b);', 'b.forEach((_, i) => { b[i] = Math.random() * 256; });');
  assert.notEqual(zufall, rumpf, 'Vorbedingung: die Mutation greift im Rumpf');
  assert.deepEqual(passwortHerkunftBefunde(zufall), ['ohne crypto.getRandomValues', 'Math.random']);
  const modulo = rumpf.replace('[x & 31]', '[x % 31]');
  assert.notEqual(modulo, rumpf);
  assert.deepEqual(passwortHerkunftBefunde(modulo), ['Modulo in der Zeichenauswahl', 'Auswahl nicht über die unteren 5 Bit']);
  const laenge = rumpf.replace('[x & 31]', '[x % EINMALPASSWORT_ZEICHEN.length]');
  assert.ok(passwortHerkunftBefunde(laenge).includes('Modulo in der Zeichenauswahl'), 'auch ein Modulo ohne Ziffer fällt auf');
  assert.match(rumpf, /i % 4/, 'Kontrolle: die Gruppierung mit Modulo steht im Rumpf und bleibt ohne Fund');
});
test('[Anfrage-Assistent · Passwort] das Passwort steht nie im Link, in der Datei oder im Brief; nur auf dem eigenen Zettel', async () => {
  const { V } = ladeGenerator();
  const state = stelleMit(V, 'termin');
  const umschlag = V.anfrageUmschlag(state);   // derselbe Weg wie anfrageAssistentErzeugen: unsigniert, ohne Signierer
  const link = V.anfrageAlsLink(umschlag);
  const pw = V.einmalpasswortErzeugen();
  const brief = V.anfrageBriefText(umschlag.anfrage, link);
  assert.ok(brief.includes(link), 'der Brief trägt den Link');
  for (const [name, t] of [['Link', link], ['Datei', V.anfrageAlsText(umschlag)], ['Brief', brief]]) assert.ok(!t.includes(pw), name);
  assert.match(brief, /auf einem anderen Weg/);
  assert.ok(V.anfragePasswortZettel(umschlag.anfrage, pw).includes(pw));
  assert.ok(!V.anfragePasswortZettel(umschlag.anfrage, pw).includes(link), 'der Zettel trägt den Link nicht');
});
test('[Anfrage-Assistent · Passwort] Studio sagt, dass es das Passwort nicht speichert und die Stelle es zum Öffnen braucht', () => {
  assert.match(HTML, /sonst können Sie die Antworten nicht öffnen\. Vivodepot speichert es nicht und zeigt es nur jetzt\./);
  assert.match(HTML, /otherwise you cannot open the replies\. Vivodepot does not store it and shows it only now\./);
});
