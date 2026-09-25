'use strict';
/* ════════════════════════════════════════════════════════════════════════
   feldregister-bauen — das Veröffentlichungs-Artefakt entsteht, und es ist
   nachprüfbar (U2-ADR-409, Punkt 9)
   ────────────────────────────────────────────────────────────────────────
   Geprüft wird: (1) der Lauf erzeugt alle drei Dateien, (2) die Liste führt
   JEDE Kennung des Katalogs — keine fällt aus, (3) die Prüfsumme stimmt
   gegen die erzeugte Datei, unabhängig nachgerechnet aus den Bytes auf der
   Platte, (4) der Kopf trägt eine Fassungsangabe mit Datum und der aus
   `vivodepot.html` GELESENEN Standzahl, (5) Gegenprobe — ein einziges
   verändertes Byte läßt die Prüfsummen-Probe fehlschlagen.

   Eine Probe ohne Gegenprobe belegt nur, daß etwas lief. Punkt 5 ist der
   Grund, aus dem die Prüfsumme im ADR steht: sie soll Abweichung ZEIGEN.

   NICHTS WIRD IN DEN ARBEITSBAUM GESCHRIEBEN. Jeder Lauf bekommt sein
   eigenes Wegwerf-Verzeichnis in `os.tmpdir()`; `register-ausgabe/` im Repo
   entsteht nur, wenn jemand das Werkzeug von Hand ohne `--ziel` aufruft.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const W = require('../tools/feldregister-bauen.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'feldregister-bauen.js');
const KATALOG = path.join(REPO, 'bereiche', 'feldkatalog.json');
const KERN = path.join(REPO, 'vivodepot.html');

/* Gemessen am 13.09.2026: 457 Einträge, nachdem `tools/build-feldkatalog.js`
   die Unterfelder aufnahm (270 → 457). Als UNTERGRENZE geprüft, nicht als
   feste Zahl: das Register wächst, und U2-ADR-409 Punkt 6 schließt aus, daß
   eine einmal veröffentlichte Kennung wieder verschwindet — eine Kennung wird
   inaktiviert, nie gelöscht. Ein Unterschreiten ist damit ein Befund, kein
   veralteter Testwert. */
const GEMESSEN_13_09_2026 = 457;

function wegwerfOrdner() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vd-feldregister-test-'));
}

function lauf(ziel, mehr) {
  return execFileSync('node', [WERKZEUG, '--ziel', ziel].concat(mehr || []), { encoding: 'utf8' });
}

test('[Feldregister] der Lauf erzeugt Liste, Prüfsumme und Seite', () => {
  const ziel = wegwerfOrdner();
  const ausgabe = lauf(ziel);

  for (const name of [W.JSON_DATEI, W.PRUEFSUMMEN_DATEI, W.SEITEN_DATEI]) {
    assert.ok(fs.existsSync(path.join(ziel, name)), name + ' muß entstehen');
  }
  assert.match(ausgabe, /Kennungen in \d+ Bereichen/, 'der Lauf meldet, was er gebaut hat');
});

test('[Feldregister] die Liste führt JEDE Kennung des Katalogs — keine fällt aus', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);
  const register = JSON.parse(fs.readFileSync(path.join(ziel, W.JSON_DATEI), 'utf8'));
  const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));

  const imKatalog = katalog.felder.map((f) => f.kennung);
  const imRegister = new Set(register.felder.map((f) => f.kennung));

  assert.equal(register.anzahl, register.felder.length, 'die gemeldete Zahl ist die geführte Zahl');
  assert.equal(register.felder.length, imKatalog.length,
    'Register und Katalog führen gleich viele Einträge');
  assert.ok(imKatalog.length >= GEMESSEN_13_09_2026,
    'am 13.09.2026 waren es ' + GEMESSEN_13_09_2026 + ' — weniger wäre ein Befund, denn eine '
    + 'veröffentlichte Kennung wird inaktiviert, nicht gelöscht (U2-ADR-409, Punkt 6)');

  const fehlend = imKatalog.filter((k) => !imRegister.has(k));
  assert.deepEqual(fehlend, [], 'keine Kennung des Katalogs darf im Register fehlen');

  for (const f of register.felder) {
    assert.ok(f.kennung && f.bereich && f.label,
      'jeder Eintrag trägt kennung, bereich und label: ' + JSON.stringify(f));
  }
});

test('[Feldregister] die Prüfsumme stimmt gegen die erzeugte Datei — unabhängig nachgerechnet', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);

  const bytes = fs.readFileSync(path.join(ziel, W.JSON_DATEI));            // rohe Bytes, kein Encoding
  const selbstGerechnet = crypto.createHash('sha256').update(bytes).digest('hex');
  const zeile = fs.readFileSync(path.join(ziel, W.PRUEFSUMMEN_DATEI), 'utf8');

  assert.equal(zeile, selbstGerechnet + '  ' + W.JSON_DATEI + '\n',
    'Format und Wert wie `shasum -a 256 ' + W.JSON_DATEI + '`');

  const seite = fs.readFileSync(path.join(ziel, W.SEITEN_DATEI), 'utf8');
  assert.ok(seite.includes(selbstGerechnet), 'die Seite zeigt die Prüfsumme sichtbar an');
});

test('[Feldregister] der Kopf trägt eine Fassungsangabe — Datum und die GELESENE Standzahl', () => {
  const ziel = wegwerfOrdner();
  const vorher = crypto.createHash('sha256').update(fs.readFileSync(KERN)).digest('hex');
  lauf(ziel);
  const nachher = crypto.createHash('sha256').update(fs.readFileSync(KERN)).digest('hex');
  assert.equal(nachher, vorher, 'der Lauf faßt vivodepot.html nicht an — die Standzahl wird GELESEN');

  const register = JSON.parse(fs.readFileSync(path.join(ziel, W.JSON_DATEI), 'utf8'));
  assert.match(register.fassung.datum, /^\d{4}-\d{2}-\d{2}$/, 'Fassungsdatum in JJJJ-MM-TT');
  assert.equal(register.fassung.kern, W.standzahlLesen(KERN),
    'die Fassung nennt die Standzahl, die heute in vivodepot.html steht');
  assert.match(register.hinweis, /Nicht von Hand bearbeiten/,
    'erzeugt, nicht gepflegt — dieselbe Kopfzeile wie beim Feldkatalog');
  assert.ok(register.herkunft && register.herkunft.quelle,
    'der Kopf sagt, woher die Liste kommt');

  const seite = fs.readFileSync(path.join(ziel, W.SEITEN_DATEI), 'utf8');
  assert.ok(seite.includes(W.datumDeutsch(register.fassung.datum)) && seite.includes(register.fassung.kern),
    'die Seite zeigt die Fassungsangabe sichtbar an');
});

test('[Feldregister] Gegenprobe — ein verändertes Byte läßt die Prüfsummen-Probe fehlschlagen', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);

  const p = path.join(ziel, W.JSON_DATEI);
  const erwartet = /^([0-9a-f]{64})\s/.exec(fs.readFileSync(path.join(ziel, W.PRUEFSUMMEN_DATEI), 'utf8'))[1];

  const gruen = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  assert.equal(gruen, erwartet, 'Positivkontrolle: unverändert stimmt die Prüfsumme');

  const bytes = Buffer.from(fs.readFileSync(p));
  bytes[bytes.length - 2] = bytes[bytes.length - 2] ^ 0xff;                // ein einziges Byte kippen
  fs.writeFileSync(p, bytes);

  const rot = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  assert.notEqual(rot, erwartet,
    'ein einziges verändertes Byte muß die Prüfsumme reißen lassen — sonst belegt sie nichts');
});

test('[Feldregister] die Seite löst den Platzhalter ab: kein externes Skript, keine externe Schrift, kein Tracker', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);
  const seite = fs.readFileSync(path.join(ziel, W.SEITEN_DATEI), 'utf8');

  assert.ok(!/<script/i.test(seite), 'kein Skript auf der Seite');
  assert.ok(!/<link\b[^>]*rel=["']?stylesheet/i.test(seite), 'kein externes Stylesheet');
  assert.ok(!/@import|fonts\.googleapis|fonts\.gstatic/i.test(seite), 'keine externe Schrift');
  const fremd = (seite.match(/https?:\/\/[^"'\s)]+/g) || []).filter((u) => !u.startsWith('https://vivodepot.de'));
  assert.deepEqual(fremd, [], 'die einzige externe Adresse ist vivodepot.de (Fuß, wie im Platzhalter)');

  assert.ok(seite.includes('Vivodepot GmbH'), 'im Fuß steht die Vivodepot GmbH, wie im Platzhalter');
  assert.ok(!seite.includes('noindex'),
    'KEIN noindex — Produktentscheidung 13.09.2026 (U2-ADR-409 Punkt 10): der Platzhalter trug ihn '
    + 'zu Recht, diese Seite trägt den Bestand. Ein Register, das Suchmaschinen nicht führen '
    + 'dürfen, findet auch der nicht, der danach sucht.');
  assert.ok(!/noch nicht veröffentlicht/.test(seite),
    'der Abschnitt „Stand" trägt jetzt die Liste, nicht mehr den Platzhalter-Satz');

  /* Deutsch UND englisch, wie der Platzhalter es hält. */
  assert.ok(seite.includes('<h2>Stand</h2>'), 'der deutsche Abschnitt „Stand"');
  assert.ok(seite.includes('lang="en"'), 'der englische Abschnitt');

  /* Die Liste steht wirklich auf der Seite, nach Bereichen gruppiert. */
  const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));
  for (const f of [katalog.felder[0], katalog.felder[katalog.felder.length - 1]]) {
    assert.ok(seite.includes('<code>' + f.kennung + '</code>'), f.kennung + ' muß auf der Seite stehen');
  }
  const bereiche = new Set(katalog.felder.map((f) => f.bereich));
  for (const b of bereiche) {
    assert.ok(seite.includes('id="bereich-' + b + '"'), 'Bereich ' + b + ' bekommt einen Abschnitt');
  }
});

test('[Feldregister] Sonderzeichen in Beschriftungen werden maskiert, nicht durchgereicht', () => {
  const ziel = wegwerfOrdner();
  const fixture = path.join(ziel, 'katalog-probe.json');
  fs.writeFileSync(fixture, JSON.stringify({
    hinweis: 'Probe', schluesselraum: 'kennung', anzahl: 1,
    felder: [{ kennung: 'identitaet.probe', bereich: 'identitaet', label: { de: 'Straße & <b>Hausnummer</b>', en: 'Street & <b>number</b>' } }],
  }, null, 2) + '\n');

  lauf(ziel, ['--katalog', fixture, '--datum', '2026-09-13']);
  const seite = fs.readFileSync(path.join(ziel, W.SEITEN_DATEI), 'utf8');
  assert.ok(seite.includes('Straße &amp; &lt;b&gt;Hausnummer&lt;/b&gt;'), 'maskiert');
  assert.ok(!seite.includes('<b>Hausnummer</b>'), 'nicht als Markup durchgereicht');
});

test('[Feldregister] ein verfehlter Anker wirft, statt eine leere Fassungsangabe zu liefern', () => {
  const ziel = wegwerfOrdner();
  const kernOhne = path.join(ziel, 'kern-ohne-standzahl.html');
  fs.writeFileSync(kernOhne, '<html><script>const ETWAS_ANDERES = 1;</script></html>');
  assert.throws(() => W.standzahlLesen(kernOhne), /SCHALEN_STAND nicht gefunden/);

  const katalogLeer = path.join(ziel, 'katalog-leer.json');
  fs.writeFileSync(katalogLeer, JSON.stringify({ felder: [] }) + '\n');
  assert.throws(() => W.katalogLesen(katalogLeer), /keine Felder/);

  const katalogFalsch = path.join(ziel, 'katalog-falsche-zahl.json');
  fs.writeFileSync(katalogFalsch, JSON.stringify({
    anzahl: 9, felder: [{ kennung: 'a.b', bereich: 'a', label: { de: 'B', en: 'B' } }],
  }) + '\n');
  assert.throws(() => W.katalogLesen(katalogFalsch), /meldet anzahl 9/);
});

/* U2-ADR-409 Punkt 12 — sprachfrei: die Kennung ist undurchsichtig, die Bedeutung steht in den
   Beschriftungen. Gemessen am 13.09.2026: alle 457 tragen de UND en, alle sind ASCII. */
test('[Feldregister·sprachfrei] jede Kennung trägt eine deutsche UND eine englische Beschriftung', () => {
  const W = require('../tools/feldregister-bauen.js');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'feldregister-sprachen-'));
  try {
    W.schreiben(ziel, W.bauen({}));
    const liste = JSON.parse(fs.readFileSync(path.join(ziel, 'feldregister.json'), 'utf8'));
    for (const f of liste.felder) {
      assert.ok(f.label && f.label.de && f.label.en, 'ohne beide Beschriftungen: ' + f.kennung);
      assert.match(f.kennung, /^[\x21-\x7e]+$/, 'Kennung nicht ASCII: ' + f.kennung);
    }
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Feldregister·sprachfrei·Gegenprobe] eine Kennung mit Umlaut wird abgewiesen', () => {
  const W = require('../tools/feldregister-bauen.js');
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'feldregister-umlaut-'));
  try {
    const kat = path.join(ziel, 'katalog.json');
    fs.writeFileSync(kat, JSON.stringify({ anzahl: 1,
      felder: [{ kennung: 'identitaet.straße', bereich: 'identitaet', label: { de: 'Straße', en: 'Street' } }] }));
    assert.throws(() => W.bauen({ katalogPfad: kat }), /nicht reines ASCII/,
      'eine Kennung mit Umlaut trägt schon eine Sprache und darf nicht ins Register');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

/* ════════════════════════════════════════════════════════════════════════
   Status je Eintrag — U2-ADR-409 Punkt 10, IANA-Konvention (HTTP Field Name
   Registry, RFC 9110 §16.3.1; RFC 8126 §9.6): permanent · deprecated ·
   obsoleted. `provisional` fehlt bewusst — ein offener Vorschlag wird nicht
   veröffentlicht. Die Quelle für Inaktivierung ist `INAKTIVIERT` im
   Werkzeug — heute leer, darum sind alle Einträge `permanent`.
   ════════════════════════════════════════════════════════════════════════ */

test('[Feldregister·Status] heute sind alle Einträge permanent', () => {
  const artefakt = W.bauen({});
  const alle = artefakt.gruppen.flatMap((g) => g.felder);
  assert.ok(alle.length > 0, 'das Register führt Einträge');
  for (const f of alle) {
    assert.equal(f.status, 'permanent', f.kennung + ' sollte heute permanent sein');
    assert.ok(!('nachfolger' in f), f.kennung + ' (permanent) darf keinen nachfolger tragen');
  }
});

test('[Feldregister·Status] ein unbekanntes Statuswort wirft', () => {
  const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));
  const kennung = katalog.felder[0].kennung;
  assert.throws(
    () => W.statusAnhaengen(W.katalogLesen(KATALOG), { [kennung]: { status: 'historic' } }),
    /unbekanntes Statuswort/,
  );
});

test('[Feldregister·Status] obsoleted ohne nachfolger wirft', () => {
  const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));
  const kennung = katalog.felder[0].kennung;
  assert.throws(
    () => W.statusAnhaengen(W.katalogLesen(KATALOG), { [kennung]: { status: 'obsoleted' } }),
    /ist obsoleted ohne nachfolger/,
  );
});

test('[Feldregister·Status] nachfolger auf eine nicht existierende Kennung wirft', () => {
  const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));
  const kennung = katalog.felder[0].kennung;
  assert.throws(
    () => W.statusAnhaengen(W.katalogLesen(KATALOG),
      { [kennung]: { status: 'obsoleted', nachfolger: 'nirgendwo.existiert' } }),
    /nicht existiert/,
  );
});

test('[Feldregister·Status] permanent mit nachfolger wirft', () => {
  const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));
  const kennung = katalog.felder[0].kennung;
  const andere = katalog.felder[1].kennung;
  assert.throws(
    () => W.statusAnhaengen(W.katalogLesen(KATALOG),
      { [kennung]: { status: 'permanent', nachfolger: andere } }),
    /trotzdem.*nachfolger|darf kein Nachfolger/,
  );
});

test('[Feldregister·Status] ein inaktiver Eintrag bleibt in JSON und Seite gelistet', () => {
  const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));
  const alt = katalog.felder[0].kennung;
  const neu = katalog.felder[1].kennung;
  const artefakt = W.bauen({ inaktiviert: { [alt]: { status: 'obsoleted', nachfolger: neu } } });

  const alle = artefakt.gruppen.flatMap((g) => g.felder);
  const eintrag = alle.find((f) => f.kennung === alt);
  assert.ok(eintrag, 'die inaktivierte Kennung bleibt im Bestand, statt zu verschwinden');
  assert.equal(eintrag.status, 'obsoleted');
  assert.equal(eintrag.nachfolger, neu);
  assert.equal(alle.length, katalog.felder.length,
    'Inaktivierung ändert nicht die Zahl der geführten Kennungen');

  assert.ok(artefakt.json.includes('"kennung": "' + alt + '"'), 'bleibt in der JSON-Liste');
  assert.ok(artefakt.json.includes('"status": "obsoleted"'), 'der Status steht in der JSON-Liste');
  assert.ok(artefakt.html.includes('<code>' + alt + '</code>'), 'bleibt auf der Seite gelistet');
  assert.ok(artefakt.html.includes('status-obsoleted'), 'der Status ist auf der Seite sichtbar');
  assert.ok(artefakt.html.includes('<code>' + neu + '</code>'),
    'der Nachfolger steht neben dem inaktivierten Eintrag');
});

test('[Feldregister·Status] Schlüsselreihenfolge im Eintrag: kennung, bereich, status, (nachfolger), label', () => {
  const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));
  const alt = katalog.felder[0].kennung;
  const neu = katalog.felder[1].kennung;
  const artefakt = W.bauen({ inaktiviert: { [alt]: { status: 'obsoleted', nachfolger: neu } } });
  const register = JSON.parse(artefakt.json);

  const permanenterEintrag = register.felder.find((f) => f.status === 'permanent');
  assert.deepEqual(Object.keys(permanenterEintrag), ['kennung', 'bereich', 'status', 'label']);

  const obsoleterEintrag = register.felder.find((f) => f.kennung === alt);
  assert.deepEqual(Object.keys(obsoleterEintrag), ['kennung', 'bereich', 'status', 'nachfolger', 'label']);
});

test('[Feldregister·Status] die Seite erklärt die drei Wörter — deutsch und englisch', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);
  const seite = fs.readFileSync(path.join(ziel, W.SEITEN_DATEI), 'utf8');
  assert.ok(seite.includes('statuserklaerung'), 'die Seite trägt eine Statuserklärung');
  assert.match(seite, /permanent[\s\S]{0,40}deprecated[\s\S]{0,80}obsoleted/,
    'die deutsche Erklärung nennt alle drei Wörter');
  assert.match(seite, /lang="en"[\s\S]{0,400}permanent[\s\S]{0,400}deprecated[\s\S]{0,400}obsoleted/,
    'auch die englische Fassung nennt alle drei Wörter');
});

/* U2-ADR-409 Punkt 3/5/7/9 (13.09.2026): der Einreichweg für eine fehlende Kennung. */
test('[Feldregister·Vorschlag] die Seite nennt den Einreichweg — E-Mail, Frist, Freigabe "Vivodepot GmbH", keine Namen', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);
  const seite = fs.readFileSync(path.join(ziel, W.SEITEN_DATEI), 'utf8');
  assert.ok(seite.includes('Neue Kennung vorschlagen'), 'die Seite trägt den Abschnitt');
  assert.ok(seite.includes('mailto:register@vivodepot.de'), 'die Seite nennt den Einreichweg per E-Mail');
  assert.ok(seite.includes('fünf Arbeitstagen'), 'die Seite nennt die Fünf-Tage-Frist');
  assert.ok(seite.includes('Vivodepot GmbH'), 'die Freigabe trägt die GmbH, keine Person');
  assert.doesNotMatch(seite, /Petra|Musterstadt|Beispiel/,
    'die Registerseite trägt keinen Personennamen (anders als Test-Fixtures anderswo)');
});

test('[Feldregister·Vorschlag] ohne --generator-url bleibt der Generator-Link weg', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);
  const seite = fs.readFileSync(path.join(ziel, W.SEITEN_DATEI), 'utf8');
  assert.ok(!seite.includes('Template-Generator</a>'),
    'ohne Adresse gibt es keinen Link — der Auslieferungsweg des Generators ist laut ADR offen');
});

test('[Feldregister·Vorschlag] mit --generator-url erscheint der Link, auf genau diese Adresse', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel, ['--generator-url', 'https://register.vivodepot.de/generator.html']);
  const seite = fs.readFileSync(path.join(ziel, W.SEITEN_DATEI), 'utf8');
  assert.ok(seite.includes('href="https://register.vivodepot.de/generator.html">Template-Generator</a>'),
    'die Seite verlinkt genau die übergebene Generator-Adresse');
});

/* ── Register-Katalog-Plan §6 Schritt 3 (14.09.2026) — Katalog-Index ─────────
   „Kein neues Verhalten" heißt hier zweierlei: die drei bestehenden Artefakte
   bleiben unverändert (geprüft: dieselben Dateinamen, Inhalte bereits oben
   getestet), UND der neue Index ist reine Zusatzinformation über sie. */

test('[Feldregister·Index] der Lauf erzeugt zusätzlich index.json, mit genau einem Eintrag (feld)', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);
  assert.ok(fs.existsSync(path.join(ziel, W.INDEX_DATEI)), 'index.json muss entstehen');
  const index = JSON.parse(fs.readFileSync(path.join(ziel, W.INDEX_DATEI), 'utf8'));
  assert.equal(index.register.length, 1, 'heute genau ein Achsen-Register: feld');
  assert.equal(index.register[0].achse, W.INDEX_ACHSE);
  assert.equal(index.register[0].datei, W.JSON_DATEI);
  assert.equal(index.register[0].pruefsummeDatei, W.PRUEFSUMMEN_DATEI);
});

test('[Feldregister·Index] der Index-Eintrag zeigt auf eine gültige, prüfsummengleiche feldregister.json', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);
  const index = JSON.parse(fs.readFileSync(path.join(ziel, W.INDEX_DATEI), 'utf8'));
  const echterHash = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ziel, W.JSON_DATEI))).digest('hex');
  assert.equal(index.register[0].sha256, echterHash,
    'die Prüfsumme im Index muss der tatsächlich geschriebenen feldregister.json entsprechen');
  const pruefsummenDatei = fs.readFileSync(path.join(ziel, W.PRUEFSUMMEN_DATEI), 'utf8');
  assert.ok(pruefsummenDatei.startsWith(index.register[0].sha256),
    'dieselbe Prüfsumme wie in der eigenen .sha256-Datei — keine zweite Wahrheit');
  // Nachgezogen (18.09.2026, feldkatalog/457-Befund): hier stand `GEMESSEN_13_09_2026` — der
  // falsche Vergleichsgegenstand, nicht nur eine veraltete Zahl. Diese Probe prüft
  // Selbstkonsistenz (Index-Zahl == tatsächlich geschriebene Datei), keinen historischen Stand;
  // der Katalog wächst legitim (270→457→613, U2-ADR-409 Punkt 6 schließt Löschen aus), und ein
  // Wert, der IMMER GLEICH sein soll, gehört gegen die Quelle desselben Laufs geprüft — nicht
  // gegen ein Datum. `tools/build-feldkatalog.js --check` bestätigt: kein Drift, eine Quelle.
  const feldregister = JSON.parse(fs.readFileSync(path.join(ziel, W.JSON_DATEI), 'utf8'));
  assert.equal(index.register[0].anzahl, feldregister.anzahl,
    'die Index-Zahl muss der tatsächlich geschriebenen feldregister.json entsprechen — keine zweite Wahrheit');
});

test('[Feldregister·Index] ein zweiter Lauf aktualisiert NUR den eigenen (feld-)Eintrag — ein fremder Achsen-Eintrag bleibt additiv stehen', () => {
  const ziel = wegwerfOrdner();
  lauf(ziel);
  const indexPfad = path.join(ziel, W.INDEX_DATEI);
  const vorher = JSON.parse(fs.readFileSync(indexPfad, 'utf8'));
  vorher.register.push({ achse: 'rechtsraum', datei: 'rechtsraumregister.json', fremdErzeugt: true });
  fs.writeFileSync(indexPfad, JSON.stringify(vorher, null, 2) + '\n');

  lauf(ziel, ['--datum', '2026-09-20']);   // erzwingt eine andere Fassung -> anderer Hash
  const nachher = JSON.parse(fs.readFileSync(indexPfad, 'utf8'));
  assert.equal(nachher.register.length, 2, 'der fremde Achsen-Eintrag darf nicht verschwinden');
  const fremd = nachher.register.find((e) => e.achse === 'rechtsraum');
  assert.deepEqual(fremd, { achse: 'rechtsraum', datei: 'rechtsraumregister.json', fremdErzeugt: true },
    'ein fremder Achsen-Eintrag bleibt byte-für-byte unangetastet');
  const feld = nachher.register.find((e) => e.achse === 'feld');
  assert.equal(feld.fassung.datum, '2026-09-20', 'der eigene Eintrag wird aktualisiert, nicht dupliziert');
});

test('[Feldregister·Index·Rot-Beweis] eine kaputte bestehende index.json bricht den Lauf nicht — der neue Index trägt dann nur den eigenen Eintrag', () => {
  const ziel = wegwerfOrdner();
  fs.mkdirSync(ziel, { recursive: true });
  fs.writeFileSync(path.join(ziel, W.INDEX_DATEI), '{kaputtes json');
  assert.doesNotThrow(() => lauf(ziel));
  const index = JSON.parse(fs.readFileSync(path.join(ziel, W.INDEX_DATEI), 'utf8'));
  assert.equal(index.register.length, 1);
  assert.equal(index.register[0].achse, W.INDEX_ACHSE);
});
