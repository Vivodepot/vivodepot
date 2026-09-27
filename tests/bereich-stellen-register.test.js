'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Glied 2 (Kette „Drei Bereichs-Eigenschaften") · das fünfte Merkmal
   ────────────────────────────────────────────────────────────────────────────
   Ein Bereich kann künftig ein Register von STELLEN führen — Organisationen mit
   Ansprechpartner, Vertrags- oder Kundennummer und Kündigungsfrist —, so wie
   `personenRegister` heute Menschen führt.

   GEBAUT IST DIE FÄHIGKEIT, NICHT IHR ERSTER INHALT. Kein eingebauter Bereich
   trägt das Merkmal; es gibt keinen Bereich „Meine Stellen" im Bürgerdepot.
   Diese Proben prüfen darum, was ein VON AUSSEN EINGEBRACHTER Bereich vorfindet.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

/* Stufe 2 (09.09.2026) — `bereicheAlle()` statt der Buendel-Liste: seit `wohnen` ab Werk
   gesaet wird, fuehrt `V.SEKTOREN` zwoelf. Diese Probe trifft eine Aussage ueber ALLE
   Bereiche; mit der Buendel-Liste haette sie einen davon still nicht mehr geprueft und
   waere gruen geblieben. (Erhebung vom 09.09.2026, Klasse „Aussage ueber alle Bereiche".) */

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}

/* ══ Die Fähigkeit ist da — und kein eingebauter Bereich nutzt sie ══════════ */

test('[Glied 2] das fünfte Merkmal und seine zwei Rollen sind erlaubt', () => {
  const { V } = ladeKern();
  assert.ok(V.BEREICH_MERKMALE_ERLAUBT.includes('stellenRegister'));
  assert.ok(V.BEREICH_ROLLEN_ERLAUBT.includes('stellenListe'));
  assert.ok(V.BEREICH_ROLLEN_ERLAUBT.includes('stellenSektion'));
});

test('[Glied 2] KEIN eingebauter Bereich trägt es — die Fähigkeit, nicht ihr erster Inhalt', () => {
  const { V } = ladeKern();
  // Das ist die Zusage des Auftrags, und sie wird hier festgehalten: entsteht später ein
  // Bereich „Meine Stellen", wird diese Zeile rot und die Entscheidung sichtbar getroffen.
  const traeger = V.bereicheAlle().filter(s => (s.merkmale || []).includes('stellenRegister')).map(s => s.id);
  assert.equal(traeger.join(','), '', 'kein Bereich im Bürgerdepot führt heute ein Stellen-Register');
  for (const s of V.bereicheAlle()) {
    assert.equal(V.bereichRolle(s.id, 'stellenListe'), null, s.id + ' hat keine stellenListe');
    assert.equal(V.bereichRolle(s.id, 'stellenSektion'), null, s.id + ' hat keine stellenSektion');
  }
});

/* ══ Der von aussen eingebrachte Bereich wird ANGENOMMEN ═══════════════════ */

test('[Glied 2] ein von aussen eingebrachter Bereich mit `stellenRegister` wird angenommen', () => {
  const { V } = ladeKern();
  const fremd = { id: 'ein-fremder-bereich', label: 'Fremd',
    merkmale: ['stellenRegister'],
    rollen: { stellenListe: 'institutionen', stellenSektion: 'stellen-sek' } };
  const m = V.bereichMerkmalePruefen(fremd.merkmale);
  assert.equal(m.merkmale.join(','), 'stellenRegister');
  assert.equal(m.verworfen.join(','), '');
  const r = V.bereichRollenPruefen(fremd.rollen);
  assert.equal(r.rollen.stellenListe, 'institutionen');
  assert.equal(r.rollen.stellenSektion, 'stellen-sek');
  assert.equal(r.verworfen.join(','), '');
});

/* ══ …und er RENDERT ══════════════════════════════════════════════════════ */

test('[Glied 2] das Register rendert die Stellen — mit Bezeichnung und aufgelöster Art', () => {
  const V = frisch();
  const d = V.getData();
  d.institutionen = [
    { id: 'i1', name: 'Stadtwerke Musterstadt', art: 'behoerde' },
    { id: 'i2', name: 'Ohne Art' },
  ];
  V.setData(d);

  // Ohne Rolle: nichts wird gelesen. Das ist die VORBEDINGUNG — sonst bewiese die
  // Gegenprobe unten nicht, dass die Rolle den Ausschlag gibt.
  const ohne = V.stellenRegisterHTML('housing', true);
  assert.ok(ohne.includes('stellen-register'), 'die Hülle steht');
  assert.ok(!ohne.includes('Stadtwerke'), 'ohne Rolle wird nichts gelesen — kein geratener Speicher');

  /* MIT Rolle. Die SEKTOREN-Liste ist eingefroren, ihre KNOTEN sind es nicht (dieselbe Form,
     auf der der Textsatz seit A277 arbeitet). Der Bereich, den es noch nicht gibt, wird darum
     an einem echten Knoten nachgestellt — und danach zurückgenommen, damit keine andere Probe
     einen Bereich vorfindet, den das Produkt nicht hat. */
  const knoten = V.SEKTOR_BY_ID['housing'];
  const vorher = knoten.rollen;
  try {
    knoten.rollen = { stellenListe: 'institutionen', stellenSektion: 'stellen-sek' };
    assert.equal(V.bereichRolle('housing', 'stellenListe'), 'institutionen', 'Vorbedingung: die Rolle greift');
    const mit = V.stellenRegisterHTML('housing', true);
    assert.ok(mit.includes('Stadtwerke Musterstadt'), 'die Stelle erscheint');
    assert.ok(mit.includes('Ohne Art'), 'auch eine ohne Art erscheint');
    assert.ok(mit.includes(V.institutionsArtLabel('behoerde')), 'die Art erscheint als BEZEICHNUNG, nicht als Kennung');
    assert.ok(!mit.includes('>behoerde<'), 'und nie als roher Schlüssel');
    assert.ok(mit.includes('data-institution-oeffnen="i1"'), 'der vorhandene Öffnen-Weg ist verdrahtet');
    assert.ok(mit.includes('data-stelle-hinzufuegen'), 'und der Anlege-Knopf steht');
  } finally {
    if (vorher === undefined) delete knoten.rollen; else knoten.rollen = vorher;
  }
  assert.equal(V.bereichRolle('housing', 'stellenListe'), null, 'zurückgenommen — kein Rest im Produkt');
});

test('[Glied 2·Rot] MIT der Rolle erscheinen die Stellen, OHNE sie erscheint keine', () => {
  const { V, src } = ladeKern();
  // Der Beleg am Quelltext: die Render-Funktion nennt KEINEN Speichernamen literal —
  // sie fragt die Rolle. Ein Literal hier wäre genau die Häufung, die A294 aufgelöst hat.
  const rumpf = src.slice(src.indexOf('function stellenRegisterHTML'),
    src.indexOf('function flowStelleRegisterNeu'));
  assert.ok(rumpf.includes("bereichRolle(sektorId, 'stellenListe')"), 'sie fragt die Rolle');
  assert.ok(!/data\.institutionen/.test(rumpf), 'und nennt den Speicher NICHT literal');
  assert.ok(!/'institutionen'/.test(rumpf), 'auch nicht als Zeichenkette');
});

test('[Glied 2] die Art wird über die EINE Leseregel aufgelöst — auch eine angedockte', () => {
  const V = frisch();
  const d = V.getData();
  // Eine Institutions-Art, die es eingebaut nicht gibt, über ein Modul anmelden (U2-ADR-142).
  d.institutionsArten = [{ modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'fremd', moduleVersion: 1,
    arten: { 'energieversorger': 'Energieversorger' } }];
  V.setData(d);
  V._institutionsArtenAusDepotAnmelden(V.getData());
  assert.equal(V.institutionsArtLabel('energieversorger'), 'Energieversorger',
    'Vorbedingung: die angedockte Art ist angemeldet');
});

/* ══ Der Rot-Beleg des Auftrags ═══════════════════════════════════════════ */

test('[Glied 2·Rot] eine unbekannte Eigenschaft wird NAMENTLICH verworfen und verwirft nicht den Bereich', () => {
  const { V } = ladeKern();
  const m = V.bereichMerkmalePruefen(['stellenRegister', 'stellenRegisterPlus', 'darfAllesLesen']);
  assert.equal(m.merkmale.join(','), 'stellenRegister', 'das bekannte bleibt, der Bereich lebt');
  assert.equal(Array.from(m.verworfen).sort().join(','), 'darfAllesLesen,stellenRegisterPlus',
    'beide unbekannten werden BENANNT — ein Tippfehler sähe sonst aus wie ein Verzicht');
  const r = V.bereichRollenPruefen({ stellenListe: 'institutionen', stellenSpeicher: 'geheim' });
  assert.equal(Object.keys(r.rollen).join(','), 'stellenListe');
  assert.equal(r.verworfen.join(','), 'stellenSpeicher');
});

test('[Glied 2] die Wertelisten bleiben GESCHLOSSEN — kein Merkmal ohne Eintrag wirkt', () => {
  const { V } = ladeKern();
  assert.equal(V.bereichKann('housing', 'stellenRegister'), false);
  assert.equal(V.bereichKann('gibt-es-nicht', 'stellenRegister'), false);
  // Und die Zahl der erlaubten Merkmale ist kein Kriterium, sondern ein Ergebnis:
  // jedes einzelne muss auflösbar sein, sonst wäre es im Produkt wirkungslos.
  for (const merkmal of V.BEREICH_MERKMALE_ERLAUBT) {
    assert.equal(V.bereichMerkmalePruefen([merkmal]).verworfen.length, 0, merkmal + ' ist erlaubt');
  }
});

/* ══ Kein neues Wort ══════════════════════════════════════════════════════ */

test('[Glied 2] das Register erfindet KEIN Wort — jeder sichtbare Text kommt aus dem Bestand', () => {
  const V = frisch();
  const h = V.stellenRegisterHTML('housing', true);
  assert.ok(h.includes(V.STRINGS.refNeueInstitutionOption), 'der Anlege-Knopf nutzt einen bestehenden Wortlaut');
  assert.ok(h.includes(V.STRINGS.leerZustand), 'der Leerzustand ebenso');
  // Kein Bedienelement ohne Recht: ohne Bearbeitungsrecht kein Anlege-Knopf.
  const ro = V.stellenRegisterHTML('housing', false);
  assert.ok(!ro.includes('data-stelle-hinzufuegen'), 'read-only zeigt keinen Anlege-Knopf');
});

test('[Glied 2] der Anlegeweg ist DERSELBE wie beim Institutions-Picker — kein zweiter daneben', () => {
  const { V, src } = ladeKern();
  const rumpf = src.slice(src.indexOf('function flowStelleRegisterNeu'),
    src.indexOf('function flowPersonRegisterNeu'));
  assert.ok(rumpf.includes('_institutionFelder('), 'dieselbe Maske');
  assert.ok(rumpf.includes('institutionHinzufuegen('), 'derselbe Schreibweg');
  assert.equal(typeof V.flowStelleRegisterNeu, 'function');
});
