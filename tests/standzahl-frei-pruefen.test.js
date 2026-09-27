'use strict';
/* U2-ADR-316 — die Proben zum Standzahl-Werkzeug.

   Sie prüfen die REINE Auswertung, nicht die Git-Seite: `auswerten(kanon, zweige, wunsch)`
   kennt kein Repo und kein Netz. Damit läuft die Suite auch dort, wo `origin` nicht
   erreichbar ist — genau die Bedingung der stehenden Regel, dass ein Prüfwerkzeug ohne
   Argument gegen Fixtures im Repo läuft.

   Die drei Fälle der Fixture sind die drei, die in der Nacht auf den 06.09.2026 wirklich
   auftraten: eine belegte Zahl auf einem ungelandeten Zweig, ein Altzweig mit harmloser
   Altzahl, und ein Zweig, dessen vier Träger auseinanderliegen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { auswerten, zahlAus, TRAEGER } = require('../tools/standzahl-frei-pruefen.js');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tools', 'standzahl-frei-fixture.json');
const fixture = () => JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

test('[Standzahl] die belegte Zahl eines ungelandeten Zweigs zählt als belegt', () => {
  const f = fixture();
  const r = auswerten(f.kanon, f.zweige, null);
  assert.ok(r.belegt.has(581), 'v581 liegt auf `beispiel-belegt` und muss belegt sein');
  assert.equal(r.frei, 582, 'die nächste freie Zahl überspringt die belegte');
});

test('[Standzahl] ein Altzweig unter dem Kanon zählt NICHT als belegt', () => {
  const f = fixture();
  const r = auswerten(f.kanon, f.zweige, null);
  assert.ok(!r.belegt.has(412),
    'ein Zweig mit einer Zahl unter dem Kanon blockiert nichts — sonst meldete das Werkzeug '
    + 'dutzende Altzweige und würde unbrauchbar');
});

test('[Standzahl] uneinige Träger werden benannt — dafür gibt es sonst keinen Wächter', () => {
  const f = fixture();
  const r = auswerten(f.kanon, f.zweige, null);
  const namen = r.uneinig.map((u) => u.zweig);
  assert.deepEqual(namen, ['origin/beispiel-traeger-uneinig'],
    'der Zweig, dessen STANDARDS.md und faktenbasis.md zurückhängen, muss auffallen. Der '
    + '`schalen-lockstep` prüft diese beiden Dateien NICHT');
});

test('[Standzahl] bei uneinigen Trägern gilt die HÖCHSTE Zahl als beansprucht', () => {
  const f = fixture();
  const r = auswerten(f.kanon, f.zweige, null);
  assert.ok(r.belegt.has(583),
    'der uneinige Zweig trägt 583/583/582/582 — beansprucht ist 583. Wer nach unten rundete, '
    + 'hielte eine belegte Zahl für frei und liefe in genau die Kollision');
  assert.ok(!r.belegt.has(582), 'die zurückhängende Zahl ist nicht die beanspruchte');
});

test('[Standzahl·Urteil] --zahl unterscheidet frei, belegt und im-kanon', () => {
  const f = fixture();
  assert.equal(auswerten(f.kanon, f.zweige, 582).urteil, 'frei');
  assert.equal(auswerten(f.kanon, f.zweige, 581).urteil, 'belegt');
  assert.equal(auswerten(f.kanon, f.zweige, 580).urteil, 'im-kanon', 'die Kanon-Zahl selbst ist belegt');
  assert.equal(auswerten(f.kanon, f.zweige, 300).urteil, 'im-kanon', 'alles unter dem Kanon ebenso');
});

test('[Standzahl·Rot-Beweis] das Werkzeug meldet eine Kollision, die es NICHT geben dürfte', () => {
  /* Der Fall, den es zu verhindern gilt: zwei ungelandete Zweige auf derselben Zahl.
     Ohne diese Probe wäre nicht gezeigt, dass die Auswertung ihn überhaupt sieht. */
  const r = auswerten(580, [
    { zweig: 'origin/a', staende: { 'sw.js': 581, 'vivodepot.html': 581 } },
    { zweig: 'origin/b', staende: { 'sw.js': 581, 'vivodepot.html': 581 } },
  ], 581);
  assert.equal(r.urteil, 'belegt');
  assert.deepEqual(r.belegt.get(581), ['origin/a', 'origin/b'],
    'beide Zweige müssen genannt werden — wer nur einen sieht, sucht den falschen');
  assert.equal(r.frei, 582);
});

test('[Standzahl·Positivkontrolle] ohne beanspruchte Zahl ist die nächste schlicht Kanon+1', () => {
  /* Ohne diese Probe wären die Proben oben auch dann grün, wenn `auswerten` IMMER
     „belegt" meldete — dann prüften sie nichts als ihre eigene Strenge. */
  const r = auswerten(580, [], 581);
  assert.equal(r.urteil, 'frei');
  assert.equal(r.frei, 581);
  assert.equal(r.belegt.size, 0);
  assert.deepEqual(r.uneinig, []);
});

test('[Standzahl·Muster] die vier Träger-Muster treffen den echten Bestand', () => {
  /* Die Muster sind aus den echten Dateien gemessen. Ändert jemand die Schreibweise
     einer Zahl, meldet das Werkzeug sonst still „keine Zahl" statt eines Fundes —
     dieselbe Klasse wie ein Wächter, der nichts findet, weil er falsch hinsieht. */
  const dateien = {
    'sw.js': fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8'),
    'vivodepot.html': fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'),
    'STANDARDS.md': fs.readFileSync(path.join(REPO, 'STANDARDS.md'), 'utf8'),
    'docs/faktenbasis.md': fs.readFileSync(path.join(REPO, 'docs', 'faktenbasis.md'), 'utf8'),
  };
  const gefunden = {};
  for (const t of TRAEGER) {
    const z = zahlAus(dateien[t.datei], t.muster);
    assert.ok(Number.isInteger(z) && z > 0,
      'das Muster für `' + t.datei + '` findet im echten Bestand keine Zahl — es zeigt an die '
      + 'falsche Stelle, und das Werkzeug meldete stillschweigend nichts');
    gefunden[t.datei] = z;
  }
  const werte = [...new Set(Object.values(gefunden))];
  assert.equal(werte.length, 1,
    'die vier Träger dieses Arbeitsbaums tragen verschiedene Zahlen: ' + JSON.stringify(gefunden));
});

test('[Standzahl·Fixture] die Fixture nennt sich als solche und trägt keinen echten Stand', () => {
  const roh = fs.readFileSync(FIXTURE, 'utf8');
  assert.ok(/_kein_echter_stand/.test(roh),
    'die Fixture sagt nicht, dass ihre Zweignamen erfunden sind — jemand könnte sie für eine '
    + 'Lagebeschreibung halten');
  for (const z of fixture().zweige) {
    assert.ok(/beispiel/.test(z.zweig), 'ein Fixture-Zweigname sieht echt aus: ' + z.zweig);
  }
});

test('[Standzahl·Ausfuehrbar] --fixture läuft ohne origin und liefert Exit 0', () => {
  /* Die stehende Regel: ohne Argument läuft das Werkzeug gegen Fixtures im Repo, damit die
     Suite es prüft — auch ohne Netz. Hier wird das WIRKLICH ausgeführt, nicht behauptet. */
  const aus = execFileSync('node', [path.join(REPO, 'tools', 'standzahl-frei-pruefen.js'), '--fixture'],
    { cwd: REPO, encoding: 'utf8' });
  assert.match(aus, /Kanon trägt: v580/);
  assert.match(aus, /Nächste freie Zahl: v582/);
  assert.match(aus, /TRÄGER UNEINIG/, 'die Anzeige verschweigt den uneinigen Zweig');
});

test('[Standzahl·Ausfuehrbar·Rot] --zahl auf eine belegte Zahl liefert Exit 1', () => {
  let code = 0;
  try {
    execFileSync('node', [path.join(REPO, 'tools', 'standzahl-frei-pruefen.js'), '--fixture', '--zahl', '581'],
      { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { code = e.status; }
  assert.equal(code, 1,
    'eine belegte Zahl muss einen Fehl-Exit geben — sonst taugt das Werkzeug nicht als '
    + 'Vorab-Prüfung vor dem Gate-Lauf');
});
