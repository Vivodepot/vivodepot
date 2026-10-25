'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Erzeuger-Probe: die DESTATIS-Staatsangehörigkeitsliste im DE-Rechtsraum-Template (Teil B, 04.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   tools/staatsangehoerigkeit-codeliste-erzeugen.js liest die gepinnte Genericode-Fassung 2026-08-05 (Fixture, unverändert)
   und schreibt Liste und Bindung in tools/rechtsraum-de-modul.json. Die Probe hält: den Pin, die Drift (Modul == Erzeugnis),
   Stichproben aus der Liste wörtlich, die PID-Sonderwerte nur an 997/998, und dass die Liste NICHT unter code-listen/ liegt
   (von dort bettet tools/build-code-listen.js jede Liste ins Gerüst ein).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../tools/staatsangehoerigkeit-codeliste-erzeugen.js');

const REPO = path.join(__dirname, '..');
const MODUL = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8'));
const LISTE = MODUL.codeListen.find((l) => l.systemId === E.SYSTEM_ID);
const eintrag = (code) => LISTE.daten.find((e) => e.code === code);

test('[Staatsangehörigkeit·Erzeuger] die Fixture ist die gepinnte Genericode-Fassung', () => {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(E.FIXTURE)).digest('hex');
  assert.equal(sha, E.PIN.genericodeSha256);
  assert.equal(E.FASSUNG, '2026-08-05');
});

test('[Staatsangehörigkeit·Erzeuger] das DE-Template trägt genau das Erzeugnis der gepinnten Fassung (keine Drift)', () => {
  const neu = E.modulMitListe(MODUL, E.listeBauen(fs.readFileSync(E.FIXTURE, 'utf8')));
  assert.equal(JSON.stringify(neu, null, 2) + '\n', fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8'));
  assert.equal(LISTE.daten.length, 211);
  assert.deepEqual(MODUL.felder['identity.nationality'], { codeListe: E.SYSTEM_ID, mehrfach: true });
});

test('[Staatsangehörigkeit·Erzeuger·Rot-Beweis] eine veränderte Genericode-Datei wird am Pin abgewiesen, nichts geschrieben', () => {
  const tmp = path.join(require('node:os').tmpdir(), 'staatsangehoerigkeit-falsch-' + process.pid + '.xml');
  fs.writeFileSync(tmp, fs.readFileSync(E.FIXTURE, 'utf8').replace('>deutsch<', '>Deutsch<'));
  const vorher = fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8');
  const fehler = console.error; console.error = () => {};
  try { assert.equal(E.main(['--genericode', tmp, '--check']), 1); } finally { console.error = fehler; fs.rmSync(tmp, { force: true }); }
  assert.equal(fs.readFileSync(path.join(REPO, 'tools', 'rechtsraum-de-modul.json'), 'utf8'), vorher);
});

test('[Staatsangehörigkeit·Erzeuger] Stichproben wörtlich aus der Liste', () => {
  assert.deepEqual(eintrag('000'), { code: '000', anzeigeName: 'deutsch', iso3166Alpha2: 'DE', hinweis: 'Staat' });
  assert.deepEqual(eintrag('150'), { code: '150', anzeigeName: 'kosovarisch', iso3166Alpha2: 'XK', hinweis: 'Staat', lesehilfeSchluessel: 'staatsangehoerigkeitLesehilfe150' });
  assert.deepEqual(eintrag('997'), { code: '997', anzeigeName: 'staatenlos', iso3166Alpha2: 'XA', pidSonderwert: 'QS', lesehilfeSchluessel: 'staatsangehoerigkeitLesehilfe997' });
  assert.deepEqual(eintrag('998'), { code: '998', anzeigeName: 'ungeklärt', pidSonderwert: 'QU', lesehilfeSchluessel: 'staatsangehoerigkeitLesehilfe998' });
  assert.deepEqual(eintrag('999'), { code: '999', anzeigeName: 'ohne Angabe', lesehilfeSchluessel: 'staatsangehoerigkeitLesehilfe999' });
  assert.deepEqual(eintrag('120'), { code: '120', anzeigeName: 'jugoslawisch', iso3166Alpha2: 'YU', hinweis: 'ehemaliger Staat', gueltigBis: '1992-04-26', lesehilfeSchluessel: 'staatsangehoerigkeitLesehilfe120' });
});

test('[Staatsangehörigkeit·Erzeuger] PID-Sonderwerte stehen nur an 997 und 998', () => {
  assert.deepEqual(LISTE.daten.filter((e) => e.pidSonderwert).map((e) => e.code + '=' + e.pidSonderwert), ['997=QS', '998=QU']);
});

test('[Staatsangehörigkeit·Erzeuger] Quellennachweis und Lizenz im DESTATIS-Wortlaut reisen mit der Liste', () => {
  assert.match(LISTE.lizenz, /© Statistisches Bundesamt \(Destatis\), 2026\. Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis gestattet/);
  assert.equal(LISTE.uri, E.URN);
  assert.equal(LISTE.version, '2026-08-05');
});

test('[Staatsangehörigkeit·Erzeuger] die Liste liegt im Template, nicht unter code-listen/ (Gerüst)', () => {
  for (const f of fs.readdirSync(path.join(REPO, 'code-listen')).filter((n) => n.endsWith('.json'))) {
    const roh = fs.readFileSync(path.join(REPO, 'code-listen', f), 'utf8');
    assert.ok(!roh.includes(E.URN) && !roh.includes('"' + E.SYSTEM_ID + '"'), 'code-listen/' + f);
  }
});

test('[Staatsangehörigkeit·Erzeuger] der Lesehilfe-Schlüssel steht genau an den Einträgen ohne geltenden ISO-Code (mit Buchstaben)', () => {
  const ud = /^(AA|Q[M-Z]|X[A-Z]|ZZ)$/;
  const braucht = LISTE.daten.filter((e) => /\p{L}/u.test(e.anzeigeName) && !(!e.gueltigBis && e.iso3166Alpha2 && !ud.test(e.iso3166Alpha2) && !e.pidSonderwert)).map((e) => e.code);
  assert.deepEqual(LISTE.daten.filter((e) => e.lesehilfeSchluessel).map((e) => e.code), braucht);
});

test('[Staatsangehörigkeit·Erzeuger] jeder Lesehilfe-Schlüssel des Templates hat seinen Text im DE-Modul und im EN-Modul', () => {
  const de = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
  // Das ausgelieferte EN-Modul (aus der EN-Vollabdeckung erzeugt; den Gleichlauf hält eine eigene Probe).
  const en = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  const funde = (listen) => {
    const aus = [];
    for (const l of listen) for (const e of l.daten) {
      if (!e.lesehilfeSchluessel) continue;
      const k = 'strings:' + e.lesehilfeSchluessel + '.text';
      if (typeof de[k] !== 'string') aus.push(k + ' fehlt im DE-Modul');
      if (typeof en[k] !== 'string' || !en[k].trim()) aus.push(k + ' fehlt im EN-Modul');
    }
    return aus;
  };
  assert.deepEqual(funde(MODUL.codeListen), []);
  // Rot-Beweis: ein Schlüssel ohne Text in beiden Quellen
  assert.deepEqual(funde([{ daten: [{ lesehilfeSchluessel: 'gibtEsNichtLesehilfe' }] }]),
    ['strings:gibtEsNichtLesehilfe.text fehlt im DE-Modul', 'strings:gibtEsNichtLesehilfe.text fehlt im EN-Modul']);
});

/* Code 459 (Entscheidung vom 20.10.2026): die Spalte „Staatsangehoerigkeit“ führt dort wörtlich „ohne Bezeichnung“;
   angezeigt wird die amtliche Spalte „Staatsname-kurz“ derselben Zeile. Kein Eintrag zeigt „ohne Bezeichnung“. */
test('[Staatsangehörigkeit·Erzeuger·459] kein Eintrag zeigt „ohne Bezeichnung“; 459 trägt den amtlichen Kurznamen', () => {
  assert.deepEqual(LISTE.daten.filter((e) => e.anzeigeName === 'ohne Bezeichnung').map((e) => e.code), []);
  assert.equal(eintrag('459').anzeigeName, 'Palästinensische Gebiete');
  const zeile = E.zeilenLesen(fs.readFileSync(E.FIXTURE, 'utf8')).find((z) => z['DESTATIS-Schluessel-Staatsangehoerigkeit'] === '459');
  assert.equal(zeile.Staatsangehoerigkeit, 'ohne Bezeichnung', 'Vorbedingung: die Liste führt dort wörtlich „ohne Bezeichnung“');
  assert.equal(zeile['Staatsname-kurz'], eintrag('459').anzeigeName, 'der angezeigte Name ist der amtliche Kurzname derselben Zeile');
});
test('[Staatsangehörigkeit·Erzeuger·459·Rot-Beweis] ohne das Ausweichen stünde „ohne Bezeichnung“ in der Auswahl', () => {
  const xml = fs.readFileSync(E.FIXTURE, 'utf8').replace(/ColumnRef="Staatsname-kurz">\s*<SimpleValue>Palästinensische Gebiete<\/SimpleValue>/, 'ColumnRef="Staatsname-kurz-weg"><SimpleValue>x</SimpleValue>');
  assert.equal(E.listeBauen(xml).daten.find((e) => e.code === '459').anzeigeName, 'ohne Bezeichnung');
});
